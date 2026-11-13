// Prova della coda del lettore (F6-A1, §6.5 punto 2): prelevaDocumento con SKIP LOCKED e
// letturaFallita con i 3 tentativi; nessuna rete (le righe si creano direttamente, senza file).
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import { configura } from '../src/main';
import { letturaFallita, prelevaDocumento } from '../src/documenti';
import { leggiDallaCoda } from '../src/lettura';
import { LetturaFallita } from '../src/lettore';
import { PrismaService } from '../src/prisma.service';
import { svuota } from './svuota';

let app: NestExpressApplication;
let db: PrismaService;
let n = 0;

async function inCoda(ricevuto_il: Date, nome = 'documento.pdf') {
  return db.documenti_in_arrivo.create({
    data: {
      origine: 'email', file_nome: nome, stato: 'in_coda', ricevuto_il,
      file_hash: createHash('sha256').update(String(++n)).digest('hex'), file_percorso: `in_arrivo/${nome}`,
    },
  });
}

// per `leggiDallaCoda`: il file deve esistere davvero, altrimenti fallisce prima di chiamare il lettore
const radice = process.env.DOCUMENTI_DIR!;
async function inCodaConFile() {
  const nome = `doc-${++n}.pdf`;
  const percorso = `in_arrivo/2026/20260904/${nome}`;
  await mkdir(join(radice, dirname(percorso)), { recursive: true });
  await writeFile(join(radice, percorso), Buffer.from('%PDF-1.4\n%%EOF\n'));
  return db.documenti_in_arrivo.create({
    data: {
      origine: 'email', file_nome: nome, stato: 'in_coda', ricevuto_il: new Date(),
      file_hash: createHash('sha256').update(String(n)).digest('hex'), file_percorso: percorso,
    },
  });
}

const config = {
  connettore: 'llamacloud_eu' as const, indirizzo: 'https://api.cloud.eu.llamaindex.ai', chiave: 'llx-prova',
  modo: 'agentic' as const, progetto: '', attesa_s: 30, soglia_ok: 0.9, soglia_bassa: 0.7,
};

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
  db = app.get(PrismaService);
}, 120_000);

afterAll(async () => {
  await svuota(db);
  await app.close();
});

beforeEach(async () => {
  await svuota(db);
});

describe('prelevaDocumento', () => {
  it('coda vuota: null', async () => {
    expect(await prelevaDocumento(db)).toBeNull();
  });

  it('prende il più vecchio e lo porta in_lettura con tentativi=1; la seconda chiamata prende l\'altro', async () => {
    const a = await inCoda(new Date('2026-09-01'));
    const b = await inCoda(new Date('2026-09-02'));
    const primo = await prelevaDocumento(db);
    expect(primo).toMatchObject({ id: a.id, file_nome: a.file_nome, tentativi: 1 });
    expect((await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: a.id } })).stato).toBe('in_lettura');
    const secondo = await prelevaDocumento(db);
    expect(secondo).toMatchObject({ id: b.id, tentativi: 1 });
    expect(await prelevaDocumento(db)).toBeNull();
  });
});

describe('letturaFallita', () => {
  it('con 1 tentativo torna in_coda con l\'errore', async () => {
    const d = await inCoda(new Date());
    await prelevaDocumento(db); // tentativi = 1
    expect(await letturaFallita(db, d.id, 'modello non risponde')).toBe('in_coda');
    expect(await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: d.id } }))
      .toMatchObject({ stato: 'in_coda', errore: 'modello non risponde', tentativi: 1 });
  });

  it('con 3 tentativi porta errore, scrive l\'evento e apre lettura.fallita', async () => {
    const d = await inCoda(new Date());
    await prelevaDocumento(db); await letturaFallita(db, d.id, 'x'); // 1
    await prelevaDocumento(db); await letturaFallita(db, d.id, 'x'); // 2
    await prelevaDocumento(db); // 3
    expect(await letturaFallita(db, d.id, 'modello rotto')).toBe('errore');
    const riga = await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: d.id } });
    expect(riga).toMatchObject({ stato: 'errore', errore: 'modello rotto', tentativi: 3 });
    expect(await db.registro.count({ where: { codice: 'documento.upload', esito: 'errore', entita_id: d.id } })).toBe(1);
    const an = await db.registro.findFirstOrThrow({ where: { codice: 'lettura.fallita', stato: 'aperta' } });
    expect(an.chiave).toBe(String(d.id));
    expect(an.dettaglio).toMatchObject({ documento_id: String(d.id) });
  });

  it('una riga non in_lettura non si tocca', async () => {
    const d = await inCoda(new Date());
    await db.documenti_in_arrivo.update({ where: { id: d.id }, data: { stato: 'abbinato' } });
    expect(await letturaFallita(db, d.id, 'x')).toBe('abbinato');
    expect((await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: d.id } })).stato).toBe('abbinato');
  });
});

describe('leggiDallaCoda: errore di servizio (A4-01)', () => {
  it('un 402 rimette in coda senza consumare il tentativo e apre lettura.non_raggiungibile', async () => {
    const d = await inCodaConFile();
    const rotto = async () => { throw new LetturaFallita('LlamaCloud non ha accettato il file (402): crediti finiti', 402); };
    expect(await leggiDallaCoda(db, config, rotto)).toBe(true);
    const riga = await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: d.id } });
    expect(riga).toMatchObject({ stato: 'in_coda', tentativi: 0 });
    expect(riga.errore).toContain('402');
    expect(await db.registro.count({ where: { codice: 'lettura.non_raggiungibile', stato: 'aperta' } })).toBe(1);
    // il tentativo non si è consumato: un secondo giro riparte da 1, non da 2
    expect(await leggiDallaCoda(db, config, rotto)).toBe(true);
    expect((await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: d.id } })).tentativi).toBe(0);
  });
});
