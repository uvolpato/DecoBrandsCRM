import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { createHash } from 'node:crypto';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { giornoRoma } from '../src/motore/dati';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configura } from '../src/main';
import { cifra } from '../src/password';
import { PrismaService } from '../src/prisma.service';
import * as registro from '../src/registro';
import { seed } from '../prisma/seed';
import { svuota } from './svuota';

// F2-A3: canale comune dei file (§6.5) e documenti fiscali della pratica (§4.2.7.1, §5.3, §8.1).

/* eslint-disable @typescript-eslint/no-explicit-any */
let app: NestExpressApplication;
let db: PrismaService;
const DOMINIO = '@prova-documenti.it';
const PW = 'password-di-prova';
const CARTELLA = process.env.DOCUMENTI_DIR!;
// D-55: cartelle per anno e giorno di caricamento (giorno di Roma)
const suDisco = (hash: string) => { const g = giornoRoma(new Date()).replace(/-/g, ''); return join(CARTELLA, g.slice(0, 4), g, hash + '.pdf'); };

async function creaUtente(username: string, livello: string) {
  await db.utenti.create({
    data: {
      username, email: username + DOMINIO, nome: 'Prova ' + username, ruolo: 'utente',
      aree: { create: [{ area: 'provvigioni', livello }] }, password_hash: await cifra(PW), deve_cambiare_password: false,
    },
  });
}
async function entra(utente: string) {
  const agente = request.agent(app.getHttpServer());
  const csrf = (await agente.post('/api/accesso/entra').send({ utente, password: PW }).expect(200)).body.csrf as string;
  return {
    get: (p: string) => agente.get('/api' + p),
    post: (p: string, b: object = {}) => agente.post('/api' + p).set('x-csrf-token', csrf).send(b),
    put: (p: string, b: object) => agente.put('/api' + p).set('x-csrf-token', csrf).send(b),
    del: (p: string) => agente.delete('/api' + p).set('x-csrf-token', csrf),
    carica: (dati: Buffer, nome = 'fattura.pdf') => agente.post('/api/documenti/carica').set('x-csrf-token', csrf).attach('file', dati, nome),
  };
}
let op: Awaited<ReturnType<typeof entra>>;
let lett: Awaited<ReturnType<typeof entra>>;

const pdf = (testo: string) => Buffer.from(`%PDF-1.4\n% ${testo}\n%%EOF\n`);
const eventi = (codice: string, entita_id: bigint) => db.registro.count({ where: { codice, entita_id } });
// pratica confermata senza documenti fiscali, e un'altra dello stesso fornitore
let pratica: { id: bigint; fornitore_id: bigint };
let altra: { id: bigint };
let terza: { id: bigint };

beforeAll(async () => {
  rmSync(CARTELLA, { recursive: true, force: true });
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
  db = app.get(PrismaService);
  await svuota(db);
  await seed(db);
  await creaUtente('op-doc', 'operatore');
  await creaUtente('lett-doc', 'lettura');
  [op, lett] = await Promise.all([entra('op-doc'), entra('lett-doc')]);
  const conf = await db.ordini_fornitore_testata.findMany({ where: { stato: 'confermato', documenti: { none: {} } }, orderBy: { id: 'asc' } });
  pratica = conf[0];
  [altra, terza] = await db.ordini_fornitore_testata.findMany({ where: { fornitore_id: pratica.fornitore_id, id: { not: pratica.id } }, orderBy: { id: 'asc' }, take: 2 });
  expect(terza).toBeDefined();
}, 120_000);

afterAll(async () => {
  jest.restoreAllMocks();
  const utenti = (await db.utenti.findMany({ where: { email: { endsWith: DOMINIO } } })).map((u) => u.id);
  await db.$transaction([
    db.$executeRaw`SET LOCAL decobrands.pulizia_registro = 'si'`,
    db.registro.deleteMany({ where: { utente_id: { in: utenti } } }),
    db.sessioni.deleteMany({ where: { utente_id: { in: utenti } } }),
    db.utenti.deleteMany({ where: { id: { in: utenti } } }),
  ]);
  await svuota(db);
  await app.close();
  rmSync(CARTELLA, { recursive: true, force: true });
});

describe('POST /api/documenti/carica (canale comune)', () => {
  let arrivo: string;

  it('un PDF va su disco con l\'impronta come nome e in coda "da leggere", con l\'evento', async () => {
    const dati = pdf('fattura 1');
    const r = await op.carica(dati, '..\\..\\Fattura FT-T1.pdf').expect(201);
    expect(r.body).toMatchObject({ file_nome: 'Fattura FT-T1.pdf', stato: 'in_coda' });
    arrivo = r.body.id;
    const hash = createHash('sha256').update(dati).digest('hex');
    expect(existsSync(suDisco(hash))).toBe(true);
    const riga = await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: BigInt(arrivo) } });
    expect(riga.file_hash).toBe(hash);
    expect(join(CARTELLA, riga.file_percorso)).toBe(suDisco(hash)); // D-55: AAAA/AAAAMMGG/<impronta>.pdf
    expect(await eventi('documento.upload', BigInt(arrivo))).toBe(1);
  });

  it('lo stesso file una seconda volta: 409 (doppione per impronta)', async () => {
    await op.carica(pdf('fattura 1'), 'altro-nome.pdf').expect(409);
  });

  it('tipo controllato dal contenuto: un testo chiamato .pdf è rifiutato (415)', async () => {
    await op.carica(Buffer.from('non sono un pdf'), 'finto.pdf').expect(415);
  });

  it('oltre il limite (DOCUMENTI_MAX_MB): 413', async () => {
    await op.carica(Buffer.concat([pdf('grande'), Buffer.alloc(1024 * 1024)]), 'grande.pdf').expect(413);
  });

  it('senza file: 400; in sola lettura: 403', async () => {
    await op.post('/documenti/carica').expect(400);
    await lett.carica(pdf('lettore')).expect(403);
  });

  it('se il registro fallisce non resta la riga; il file su disco resta orfano e si riusa', async () => {
    const vero = registro.logEvent;
    const spia = jest.spyOn(registro, 'logEvent').mockImplementation(async (d, e, c) => {
      if (e.tipo === 'documento') throw new Error('registro rotto');
      return vero(d, e, c);
    });
    const dati = pdf('orfano');
    const hash = createHash('sha256').update(dati).digest('hex');
    await op.carica(dati).expect(500);
    spia.mockRestore();
    expect(await db.documenti_in_arrivo.count({ where: { file_hash: hash } })).toBe(0);
    expect(existsSync(suDisco(hash))).toBe(true);
    await op.carica(dati).expect(201); // il nuovo invio passa
  });

  describe('documenti fiscali della pratica', () => {
    const url = () => `/pratiche/${pratica.id}/documenti`;
    let fattura: string;

    it('in sola lettura si consulta ma non si scrive (403)', async () => {
      const r = await lett.get(url()).expect(200);
      expect(r.body).toMatchObject({ documenti: [], totali: { fatture: 0, note_credito: 0, netto: 0 } });
      await lett.post(url(), { tipo: 'fattura', numero: 'X', data: '2026-09-01', importo: 1 }).expect(403);
    });

    it('fattura con il file del canale: netto dal server, pratica fatturata (D-52), eventi', async () => {
      const r = await op.post(url(), { tipo: 'fattura', numero: 'FT-T1', data: '2026-09-01', importo: 1234.56, arrivo_id: Number(arrivo) }).expect(201);
      expect(r.body.totali).toEqual({ fatture: 1234.56, note_credito: 0, netto: 1234.56 });
      expect(r.body.pratica).toMatchObject({ stato: 'fatturato', importo: 1234.56 });
      const d = r.body.documenti[0];
      expect(d).toMatchObject({ tipo: 'fattura', numero: 'FT-T1', importo: 1234.56, residuo: 1234.56, file_nome: 'Fattura FT-T1.pdf', arrivo_id: arrivo });
      fattura = d.id;
      const t = await db.ordini_fornitore_testata.findUniqueOrThrow({ where: { id: pratica.id } });
      expect([t.stato, t.importo.toFixed(2)]).toEqual(['fatturato', '1234.56']);
      expect((await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: BigInt(arrivo) } })).stato).toBe('abbinato');
      expect(await eventi('documento.create', BigInt(fattura))).toBe(1);
      expect(await eventi('stato.change_state', pratica.id)).toBe(1);
    });

    it('numero già usato: 409 nella stessa pratica e, con un\'altra data, in un\'altra pratica del fornitore', async () => {
      await op.post(url(), { tipo: 'fattura', numero: 'FT-T1', data: '2026-09-01', importo: 10 }).expect(409);
      await op.post(`/pratiche/${altra.id}/documenti`, { tipo: 'fattura', numero: 'FT-T1', data: '2026-09-02', importo: 10 }).expect(409);
    });

    it('nota di credito parziale: importo negativo, netto ridotto', async () => {
      const r = await op.post(url(), { tipo: 'nota_credito', numero: 'NC-T1', data: '2026-09-10', importo: 200, fattura_id: Number(fattura) }).expect(201);
      expect(r.body.totali).toEqual({ fatture: 1234.56, note_credito: -200, netto: 1034.56 });
      expect(r.body.documenti.find((x: any) => x.id === fattura)).toMatchObject({ stornato: 200, residuo: 1034.56 });
    });

    it('nota di credito oltre la fattura: 400, nessuna riga', async () => {
      const prima = await db.ordini_fornitore_documenti.count();
      await op.post(url(), { tipo: 'nota_credito', numero: 'NC-T2', data: '2026-09-10', importo: 1034.57, fattura_id: Number(fattura) }).expect(400);
      await op.post(url(), { tipo: 'nota_credito', numero: 'NC-T2', data: '2026-09-10', importo: 5 }).expect(400); // senza fattura
      expect(await db.ordini_fornitore_documenti.count()).toBe(prima);
    });

    it('fattura sotto le note che la stornano: 409; annullarla con una nota: 409', async () => {
      await op.put(`${url()}/${fattura}`, { importo: 100 }).expect(409);
      await op.del(`${url()}/${fattura}`).expect(409);
    });

    it('storno totale: il server storna quello che resta, netto zero', async () => {
      const r = await op.post(url(), { tipo: 'nota_credito', numero: 'NC-T3', data: '2026-09-11', storno_totale: true, fattura_id: Number(fattura) }).expect(201);
      expect(r.body.totali.netto).toBe(0);
      expect(r.body.documenti.find((x: any) => x.numero === 'NC-T3').importo).toBe(-1034.56);
    });

    it('rollback: registro che fallisce = nessun documento, stato invariato', async () => {
      const vero = registro.logEvent;
      const spia = jest.spyOn(registro, 'logEvent').mockImplementation(async (d, e, c) => {
        if (e.tipo === 'documento') throw new Error('registro rotto');
        return vero(d, e, c);
      });
      const prima = await db.ordini_fornitore_documenti.count();
      await op.post(`/pratiche/${altra.id}/documenti`, { tipo: 'fattura', numero: 'FT-T9', data: '2026-09-01', importo: 50 }).expect(500);
      spia.mockRestore();
      expect(await db.ordini_fornitore_documenti.count()).toBe(prima);
    });

    it('correzione e annullamento: eventi, e la pratica torna confermata senza fatture', async () => {
      const lista = (await op.get(url()).expect(200)).body;
      const nc3 = lista.documenti.find((x: any) => x.numero === 'NC-T3').id;
      const nc1 = lista.documenti.find((x: any) => x.numero === 'NC-T1').id;
      const r = await op.put(`${url()}/${nc1}`, { importo: 150, note: 'reso' }).expect(200);
      expect(r.body.totali.netto).toBe(50); // 1234,56 − 150 − 1034,56
      expect(await eventi('documento.update', BigInt(nc1))).toBe(1);
      await op.del(`${url()}/${nc3}`).expect(204);
      await op.del(`${url()}/${nc1}`).expect(204);
      await op.del(`${url()}/${fattura}`).expect(204);
      expect(await eventi('documento.delete', BigInt(fattura))).toBe(1);
      const t = await db.ordini_fornitore_testata.findUniqueOrThrow({ where: { id: pratica.id } });
      expect(t.stato).toBe('confermato');
      expect(await eventi('stato.change_state', pratica.id)).toBe(2);
      // il file della fattura annullata torna in coda
      expect(await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: BigInt(arrivo) } })).toMatchObject({ stato: 'in_coda', abbinato_pratica_id: null });
    });

    it('un file già abbinato non si riusa: lo stesso arrivo su due documenti 409', async () => {
      await op.post(url(), { tipo: 'fattura', numero: 'FT-A1', data: '2026-09-01', importo: 10, arrivo_id: Number(arrivo) }).expect(201);
      await op.post(url(), { tipo: 'fattura', numero: 'FT-A2', data: '2026-09-01', importo: 10, arrivo_id: Number(arrivo) }).expect(409);
      expect(await db.ordini_fornitore_documenti.count({ where: { numero: 'FT-A2' } })).toBe(0);
    });

    it('documento con legami: correzione del subagente o riga di bollettino = 409, niente cascate', async () => {
      const lista = (await op.get(url()).expect(200)).body;
      const fa1 = BigInt(lista.documenti.find((x: any) => x.numero === 'FT-A1').id);
      await db.provvigioni_correzioni.create({ data: { documento_id: fa1, tipo: 'nessuna', valore: 0, motivo: 'prova' } });
      const r = await op.del(`${url()}/${fa1}`).expect(409);
      expect(r.body.message).toMatch(/correzione/);
      await db.provvigioni_correzioni.deleteMany({ where: { documento_id: fa1 } });
      // un documento del seed già riconciliato in un bollettino e non liquidato
      const inB = await db.ordini_fornitore_documenti.findFirstOrThrow({
        where: { righe_bollettino: { some: {} }, liquidazione_id: null, note_credito: { none: {} }, correzione: null },
      });
      const base = `/pratiche/${inB.testata_id}/documenti/${inB.id}`;
      expect((await op.del(base).expect(409)).body.message).toMatch(/bollettino/);
      await op.put(base, { importo: 1 }).expect(409);
      await op.put(base, { data: '2020-01-01' }).expect(409);
      await op.put(base, { note: 'solo la nota' }).expect(200);
      await op.put(base, { note: null }).expect(200);
      expect((await db.ordini_fornitore_documenti.findUniqueOrThrow({ where: { id: inB.id } })).note).toBeNull();
    });

    it('fattura su più ordini: numero e data cambiano su tutte le copie insieme', async () => {
      const a = (await op.post(`/pratiche/${altra.id}/documenti`, { tipo: 'fattura', numero: 'FT-MO', data: '2026-09-01', importo: 300 }).expect(201)).body;
      await op.post(`/pratiche/${terza.id}/documenti`, { tipo: 'fattura', numero: 'FT-MO', data: '2026-09-01', importo: 200 }).expect(201);
      const id = a.documenti.find((x: any) => x.numero === 'FT-MO').id;
      await op.put(`/pratiche/${altra.id}/documenti/${id}`, { data: '2026-09-03', numero: 'FT-MO2' }).expect(200);
      const copie = await db.ordini_fornitore_documenti.findMany({ where: { testata_id: { in: [altra.id, terza.id] }, tipo: 'fattura', numero: { startsWith: 'FT-MO' } } });
      expect(copie.map((c) => [c.numero, c.data.toISOString().slice(0, 10)])).toEqual([['FT-MO2', '2026-09-03'], ['FT-MO2', '2026-09-03']]);
      expect(copie.map((c) => Number(c.importo)).sort()).toEqual([200, 300]); // la quota di ogni pratica resta sua
    });

    it('la nota con storno totale segue l\'importo della fattura; la nota corretta senza importo non si ricalcola', async () => {
      const f = (await op.post(url(), { tipo: 'fattura', numero: 'FT-ST', data: '2026-09-01', importo: 1000 }).expect(201)).body;
      const fid = Number(f.documenti.find((x: any) => x.numero === 'FT-ST').id);
      await op.post(url(), { tipo: 'nota_credito', numero: 'NC-ST1', data: '2026-09-05', importo: 100, fattura_id: fid }).expect(201);
      const r = (await op.post(url(), { tipo: 'nota_credito', numero: 'NC-ST2', data: '2026-09-06', storno_totale: true, fattura_id: fid }).expect(201)).body;
      const tot = r.documenti.find((x: any) => x.numero === 'NC-ST2');
      expect(tot.importo).toBe(-900);
      const dopo = (await op.put(`${url()}/${fid}`, { importo: 1200 }).expect(200)).body;
      expect(dopo.documenti.find((x: any) => x.numero === 'NC-ST2').importo).toBe(-1100);
      expect(dopo.documenti.find((x: any) => x.id === String(fid))).toMatchObject({ stornato: 1200, residuo: 0 });
      expect(await eventi('documento.update', BigInt(tot.id))).toBe(1);
      const nc1 = dopo.documenti.find((x: any) => x.numero === 'NC-ST1').id;
      const n = (await op.put(`${url()}/${nc1}`, { note: 'reso' }).expect(200)).body;
      expect(n.documenti.find((x: any) => x.id === nc1).importo).toBe(-100);
    });

    it('lo stesso file scartato si ricarica: torna in coda sulla stessa riga, con l\'evento', async () => {
      const dati = pdf('scartato');
      const id = BigInt((await op.carica(dati).expect(201)).body.id);
      await db.documenti_in_arrivo.update({ where: { id }, data: { stato: 'scartato', scartato_il: new Date(), motivo_scarto: 'Altro' } });
      const r = await op.carica(dati, 'di-nuovo.pdf').expect(201);
      expect(r.body).toMatchObject({ id: String(id), stato: 'in_coda', file_nome: 'di-nuovo.pdf' });
      expect(await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id } })).toMatchObject({ scartato_il: null, motivo_scarto: null });
      expect(await eventi('documento.upload', id)).toBe(2);
      await op.carica(dati).expect(409); // ora è in coda: doppione
    });

    it('pratica inesistente: 404', async () => {
      await op.get('/pratiche/999999999/documenti').expect(404);
    });
  });
});
