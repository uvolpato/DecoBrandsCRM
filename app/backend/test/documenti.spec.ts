import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { createHash } from 'node:crypto';
import { existsSync, rmSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { giornoRoma } from '../src/motore/dati';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configura } from '../src/main';
import { cifra } from '../src/password';
import { PrismaService } from '../src/prisma.service';
import { IntegraService } from '../src/integra';
import * as anagraficaIntegra from '../src/anagrafica-integra';
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
// D-60: in coda in_arrivo/AAAA/AAAAMMGG/<impronta>.<est> (giorno di Roma)
const suDisco = (hash: string, est = 'pdf') => { const g = giornoRoma(new Date()).replace(/-/g, ''); return join(CARTELLA, 'in_arrivo', g.slice(0, 4), g, `${hash}.${est}`); };

async function creaUtente(username: string, livello: string, area = 'provvigioni') {
  await db.utenti.create({
    data: {
      username, email: username + DOMINIO, nome: 'Prova ' + username, ruolo: 'utente',
      aree: { create: [{ area, livello }] }, password_hash: await cifra(PW), deve_cambiare_password: false,
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
let senzaArea: Awaited<ReturnType<typeof entra>>;

// supertest non ha un lettore per application/pdf: raccoglie i byte della risposta
const raccogli = (res: any, cb: (e: Error | null, dati?: Buffer) => void) => {
  const parti: Buffer[] = [];
  res.on('data', (c: Buffer) => parti.push(c));
  res.on('end', () => cb(null, Buffer.concat(parti)));
};

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
  await creaUtente('dati-doc', 'responsabile', 'dati');
  [op, lett, senzaArea] = await Promise.all([entra('op-doc'), entra('lett-doc'), entra('dati-doc')]);
  const conf = await db.ordini_fornitore_testata.findMany({ where: { stato: 'confermato', documenti: { none: { tipo: { in: ['fattura', 'nota_credito'] } } } }, orderBy: { id: 'asc' } });
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
    expect(join(CARTELLA, riga.file_percorso)).toBe(suDisco(hash)); // D-60: in_arrivo/AAAA/AAAAMMGG/<impronta>.pdf
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

describe('GET /api/documenti/cerca (abbinamento a mano, F3-A2b)', () => {
  let gasper: bigint;
  beforeAll(async () => {
    gasper = (await db.fornitori_versioni.findFirstOrThrow({ where: { ragione_sociale: { startsWith: 'Gasper' } } })).fornitore_id;
  });
  const cerca = (parametri: string) => lett.get('/documenti/cerca?' + parametri);

  it('solo i documenti del fornitore, con cliente, pratica e importo', async () => {
    const r = (await cerca(`fornitore_id=${gasper}&limite=50`).expect(200)).body;
    const numeri = r.map((x: any) => x.numero);
    expect(numeri).toEqual(expect.arrayContaining(['F-2026-0933', 'F-2026-0921', 'NC-2026-007']));
    expect(numeri).not.toContain('F-2026-0912'); // di Gries
    expect(r.every((x: any) => x.cliente && x.pratica && typeof x.importo === 'number')).toBe(true);
  });

  it('con il mese del bollettino: prima i suoi documenti, poi gli altri dal più recente', async () => {
    const r = (await cerca(`fornitore_id=${gasper}&mese=2026-07&limite=50`).expect(200)).body;
    expect(r[0].numero).toBe('F-2026-0907');
    const altri = r.slice(1).map((x: any) => x.data);
    expect(altri).toEqual([...altri].sort().reverse());
  });

  it('cerca per numero e per cliente; % e _ sono lettere, non jolly', async () => {
    expect((await cerca(`fornitore_id=${gasper}&q=0921`).expect(200)).body.map((x: any) => x.numero)).toEqual(['F-2026-0921']);
    expect((await cerca(`fornitore_id=${gasper}&q=Orti`).expect(200)).body.map((x: any) => x.numero).sort())
      .toEqual(['F-2026-0822', 'F-2026-0907']);
    expect((await cerca(`fornitore_id=${gasper}&q=%25`).expect(200)).body).toEqual([]);
    expect((await cerca(`fornitore_id=${gasper}&q=_`).expect(200)).body).toEqual([]);
  });

  it('su_riga: il documento già su una riga di un bollettino lo dice', async () => {
    const r = (await cerca(`fornitore_id=${gasper}&q=0907`).expect(200)).body[0];
    const b = await db.bollettini_testata.findFirstOrThrow({ where: { fornitore_id: gasper, mese: 7, anno: 2026 } });
    expect(r.su_riga).toEqual({ bollettino_id: String(b.id), mese: 7, anno: 2026 });
    expect((await cerca(`fornitore_id=${gasper}&q=0933`).expect(200)).body[0].su_riga).toBeNull();
  });

  it('su_riga vale anche per una riga non ancora abbinata con lo stesso numero', async () => {
    const gries = (await db.fornitori_versioni.findFirstOrThrow({ where: { ragione_sociale: { startsWith: 'Gries' } } })).fornitore_id;
    const r = (await cerca(`fornitore_id=${gries}&q=0891`).expect(200)).body[0];
    expect(r.numero).toBe('F-2026-0891');
    expect(r.su_riga).toMatchObject({ mese: 7, anno: 2026 });
  });

  it('chi non ha l\'area Provvigioni: 403', async () => {
    await senzaArea.get(`/documenti/cerca?fornitore_id=${gasper}`).expect(403);
  });
});

describe('GET /api/documenti/:id/file', () => {
  it('il PDF del documento arrivato: in linea, sandbox, percorso dal database (D-55)', async () => {
    const doc = await db.ordini_fornitore_documenti.findFirstOrThrow({ where: { arrivo_id: { not: null } }, include: { arrivo: true } });
    const arrivo = doc.arrivo!;
    const dati = pdf('documento ' + arrivo.id);
    await mkdir(dirname(join(CARTELLA, arrivo.file_percorso)), { recursive: true });
    await writeFile(join(CARTELLA, arrivo.file_percorso), dati);

    const r = await lett.get(`/documenti/${arrivo.id}/file`).buffer(true).parse(raccogli).expect(200);
    expect(r.headers['content-type']).toBe('application/pdf');
    expect(r.headers['content-disposition']).toMatch(/^inline; filename\*=UTF-8''[^"\r\n]+$/);
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['content-security-policy']).toBe('sandbox');
    expect(r.body).toEqual(dati);

    // solo il database decide il percorso: uno uscito dalla radice non si serve
    await db.documenti_in_arrivo.update({ where: { id: arrivo.id }, data: { file_percorso: '../fuori.pdf' } });
    await lett.get(`/documenti/${arrivo.id}/file`).expect(404);
    await db.documenti_in_arrivo.update({ where: { id: arrivo.id }, data: { file_percorso: arrivo.file_percorso } });

    rmSync(join(CARTELLA, arrivo.file_percorso));
    await lett.get(`/documenti/${arrivo.id}/file`).expect(404);
  });

  it('403 a chi non ha l\'area Provvigioni; 404 per un documento inesistente', async () => {
    const arrivo = await db.documenti_in_arrivo.findFirstOrThrow({ where: { file_percorso: { not: '' } } });
    await senzaArea.get(`/documenti/${arrivo.id}/file`).expect(403);
    await lett.get('/documenti/999999999/file').expect(404);
  });
});

describe('documenti scartati: serve provvigioni.scartati', () => {
  let scartato: bigint;
  beforeAll(async () => {
    const r = await op.carica(pdf('scartato-permesso')).expect(201);
    scartato = BigInt(r.body.id);
    await db.documenti_in_arrivo.update({ where: { id: scartato }, data: { stato: 'scartato', scartato_il: new Date(), motivo_scarto: 'Altro' } });
  });

  it('la sola lettura non legge né il file né il dettaglio di uno scartato (403)', async () => {
    await lett.get(`/documenti/${scartato}/file`).expect(403);
    await lett.get(`/documenti/${scartato}`).expect(403);
  });

  it("l'operatore (provvigioni.scartati) legge file e dettaglio (200)", async () => {
    await op.get(`/documenti/${scartato}/file`).buffer(true).parse(raccogli).expect(200);
    await op.get(`/documenti/${scartato}`).expect(200);
  });
});

describe('agenzia mancante: il documento non entra in pratica (D-106)', () => {
  let fornitore: { id: bigint; versione_id: bigint };
  let senza: { id: bigint; versione_id: bigint; ragione: string; piva: string | null };
  let praticaSenza: bigint;

  beforeAll(async () => {
    const fv = await db.fornitori_versioni.findFirstOrThrow({ where: { ragione_sociale: { startsWith: 'Gries' } } });
    const f = await db.fornitori.findUniqueOrThrow({ where: { id: fv.fornitore_id } });
    fornitore = { id: fv.fornitore_id, versione_id: f.versione_corrente_id! };
    const c = await db.clienti.findFirstOrThrow({ where: { agenzie: { none: { fornitore_id: fornitore.id } } }, include: { corrente: true } });
    senza = { id: c.id, versione_id: c.versione_corrente_id!, ragione: c.corrente!.ragione_sociale, piva: c.corrente!.piva };
    // pratica creata a mano senza agenzia, per provare registrazione e spostamento
    const agente = await db.agenti.findFirstOrThrow();
    const t = await db.ordini_fornitore_testata.create({ data: {
      fornitore_id: fornitore.id, fornitore_versione_id: fornitore.versione_id,
      cliente_id: c.id, cliente_versione_id: c.versione_corrente_id!,
      numero_ordine: 'OF/2026/998', data_ordine: new Date('2026-09-01'), agente_id: agente.id,
    } });
    praticaSenza = t.id;
  });

  it('creazione (registrazione a mano): 409 senza agenzia', async () => {
    const prima = await db.ordini_fornitore_documenti.count();
    const r = await op.post(`/pratiche/${praticaSenza}/documenti`, { tipo: 'fattura', numero: 'AG-1', data: '2026-09-10', importo: 100 }).expect(409);
    expect(r.body.message).toMatch(/agenzia/);
    expect(await db.ordini_fornitore_documenti.count()).toBe(prima);
  });

  it('abbinamento di un file in coda (pratica nuova): 409 senza agenzia', async () => {
    const b = (await op.carica(pdf('ordine senza agenzia'), 'ordine-no-ag.pdf').expect(201)).body;
    const r = await op.post(`/documenti/${b.id}/abbina`, { tipo: 'ordine', numero: 'AG-ORD-1', data: '2026-09-01', cliente_id: Number(senza.id), fornitore_id: Number(fornitore.id) }).expect(409);
    expect(r.body.message).toMatch(/agenzia/);
  });

  it('spostamento in una pratica senza agenzia: 409', async () => {
    const con = await db.ordini_fornitore_testata.findFirstOrThrow({ where: { fornitore_id: fornitore.id, id: { not: praticaSenza } } });
    const doc = await db.ordini_fornitore_documenti.create({ data: { testata_id: con.id, tipo: 'conferma', numero: 'AG-CONF-1', data: new Date('2026-09-01'), importo: 0 } });
    const r = await op.post(`/pratiche/${con.id}/documenti/${doc.id}/sposta`, { pratica_id: Number(praticaSenza) }).expect(409);
    expect(r.body.message).toMatch(/agenzia/);
  });

  it('GET /api/documenti: manca_agenzia vero, conteggi invariati', async () => {
    const d = await db.documenti_in_arrivo.create({ data: {
      origine: 'email', file_nome: 'ordine-senza-agenzia.pdf', stato: 'da_controllare',
      file_hash: createHash('sha256').update('ordine-senza-agenzia').digest('hex'), file_percorso: 'in_arrivo/ordine-senza-agenzia.pdf',
      tipo: 'ordine', fornitore_id: fornitore.id, fornitore_versione_id: fornitore.versione_id,
    } });
    await db.documenti_campi.createMany({ data: [
      { documento_id: d.id, campo: 'numero', valore_letto: 'AG-ORD-LIST' },
      { documento_id: d.id, campo: 'data', valore_letto: '2026-09-01' },
      { documento_id: d.id, campo: 'codice_cliente', valore_letto: 'ZZZ-999' },
      { documento_id: d.id, campo: 'cliente', valore_letto: senza.ragione },
      { documento_id: d.id, campo: 'piva_cliente', valore_letto: senza.piva },
    ] });
    const r = (await op.get('/documenti?stato=da_controllare&per_pagina=200').expect(200)).body;
    const riga = r.documenti.find((x: any) => x.id === String(d.id));
    expect(riga.manca_agenzia).toBe(true);
    // i conteggi non cambiano: il campo è in più, non un filtro
    expect(r.totale).toBe(r.documenti.length);
    expect(r.documenti.every((x: any) => typeof x.manca_agenzia === 'boolean')).toBe(true);
  });

  it("creata l'agenzia via API, la registrazione riesce e la pillola sparisce", async () => {
    const sub = await db.subagenti.findFirstOrThrow();
    await senzaArea.post(`/clienti/${senza.id}/agenzie`, { subagente_id: Number(sub.id), fornitore_id: Number(fornitore.id), sconto: 5, valido_dal: '2026-01-01' }).expect(201);
    const r = await op.post(`/pratiche/${praticaSenza}/documenti`, { tipo: 'fattura', numero: 'AG-2', data: '2026-09-10', importo:100 }).expect(201);
    expect(r.body.totali.netto).toBe(100);
    // il documento da controllare ora ha l'agenzia: manca_agenzia false
    const el = (await op.get('/documenti?stato=da_controllare&per_pagina=200').expect(200)).body;
    const riga = el.documenti.find((x: any) => x.file_nome === 'ordine-senza-agenzia.pdf');
    expect(riga.manca_agenzia).toBe(false);
  });
});

describe('proposta con import da Integra e storico (D-111/D-112)', () => {
  const ESTRATTO = new Date('2026-11-08T00:00:00Z');
  let fornitore: { id: bigint; versione_id: bigint; ragione: string; piva: string | null };
  let senza: { id: bigint; versione_id: bigint; ragione: string; piva: string | null };

  beforeAll(async () => {
    const fv = await db.fornitori_versioni.findFirstOrThrow({ where: { ragione_sociale: { startsWith: 'Gries' } } });
    const f = await db.fornitori.findUniqueOrThrow({ where: { id: fv.fornitore_id } });
    fornitore = { id: fv.fornitore_id, versione_id: f.versione_corrente_id!, ragione: fv.ragione_sociale, piva: fv.piva };
    const c = await db.clienti.findFirstOrThrow({ where: { agenzie: { none: { fornitore_id: fornitore.id } } }, include: { corrente: true } });
    senza = { id: c.id, versione_id: c.versione_corrente_id!, ragione: c.corrente!.ragione_sociale, piva: c.corrente!.piva };
  });

  async function creaArrivo(file_nome: string, over: { tipo?: string | null; fornitore_id?: bigint | null; campi?: [string, string | null][] } = {}) {
    const d = await db.documenti_in_arrivo.create({
      data: {
        origine: 'email', file_nome, stato: 'da_controllare',
        file_hash: createHash('sha256').update(file_nome).digest('hex'), file_percorso: `in_arrivo/${file_nome}`,
        tipo: over.tipo ?? null, fornitore_id: over.fornitore_id ?? null, fornitore_versione_id: over.fornitore_id != null ? fornitore.versione_id : null,
      },
    });
    if (over.campi?.length) {
      await db.documenti_campi.createMany({ data: over.campi.map(([campo, valore]) => ({ documento_id: d.id, campo, valore_letto: valore })) });
    }
    return d;
  }

  it('la lista porta i tre campi e «Non rappresentato» per la coppia senza subagente nello storico', async () => {
    await db.interscambio_storico.create({ data: {
      fonte: 'vecchio_crm', estratto_il: ESTRATTO, cliente_legacy_id: 7001n, fornitore_legacy_id: 7001n,
      fornitore_id: fornitore.id, fornitore_ragione_sociale: fornitore.ragione,
      cliente_codice_fornitore: 'NONRAPP-1', subagente_nome: null, sconto_1: 0, sconto_2: 0,
    } });
    const d = await creaArrivo('ordine-non-rappresentato.pdf', {
      tipo: 'ordine', fornitore_id: fornitore.id,
      campi: [['numero', 'NR-1'], ['data', '2026-09-01'], ['codice_cliente', 'NONRAPP-1'], ['cliente', senza.ragione], ['piva_cliente', senza.piva]],
    });
    const r = (await op.get('/documenti?stato=da_controllare&per_pagina=200').expect(200)).body;
    const riga = r.documenti.find((x: any) => x.id === String(d.id));
    expect(riga.manca_rappresentanza).toBe(true);
    expect(riga.manca_agenzia).toBe(false);
    expect(r.documenti.every((x: any) => typeof x.fornitore_da_integra === 'boolean' && typeof x.cliente_da_integra === 'boolean')).toBe(true);
  });

  it('la lista segna cliente_da_integra per la coppia nello storico con subagente', async () => {
    // R1-06: lo storico importato ha `fornitore_id` NULL: conta il nome normalizzato del fornitore
    await db.interscambio_storico.create({ data: {
      fonte: 'vecchio_crm', estratto_il: ESTRATTO, cliente_legacy_id: 7002n, fornitore_legacy_id: 7002n,
      fornitore_ragione_sociale: fornitore.ragione,
      cliente_codice_fornitore: 'CLI-NUOVO-1', subagente_nome: 'Mario Rossi', sconto_1: 5, sconto_2: 0,
    } });
    const d = await creaArrivo('ordine-cliente-nuovo.pdf', {
      tipo: 'ordine', fornitore_id: fornitore.id,
      campi: [['numero', 'CN-1'], ['data', '2026-09-01'], ['codice_cliente', 'CLI-NUOVO-1'], ['cliente', 'Sconosciuto SRL']],
    });
    const r = (await op.get('/documenti?stato=da_controllare&per_pagina=200').expect(200)).body;
    const riga = r.documenti.find((x: any) => x.id === String(d.id));
    expect(riga.cliente_da_integra).toBe(true);
  });

  it('il dettaglio porta i candidati di Integra e scaglioni_mancanti', async () => {
    const d = await creaArrivo('fornitore-sconosciuto.pdf', { tipo: 'ordine', campi: [['numero', 'FS-1'], ['fornitore', 'Nuovo Fornitore SRL']] });
    const spiaPonte = jest.spyOn(IntegraService.prototype, 'ponte').mockResolvedValue({ pool: {} as never, schema: 'public' });
    const spiaCerca = jest.spyOn(anagraficaIntegra, 'cerca').mockResolvedValue({ righe: [{ id_integra: 99, codice: 'NF', ragione_sociale: 'Nuovo Fornitore SRL', piva: '12345678901', attivo: true }], ms: 1 });
    try {
      const r = (await op.get(`/documenti/${d.id}`).expect(200)).body;
      expect(r.proposta.esito).toBe('fornitore_da_integra');
      expect(r.proposta.fornitore_da_integra).toMatchObject({ id_integra: 99, ragione_sociale: 'Nuovo Fornitore SRL', piva: '12345678901' });
      expect(r.proposta.manca_rappresentanza).toBeNull();
      expect(r.proposta.cliente_da_integra).toBeNull();
      expect(typeof r.scaglioni_mancanti).toBe('boolean');
    } finally {
      spiaPonte.mockRestore();
      spiaCerca.mockRestore();
    }
  });

  it('un fornitore sconosciuto non fa una query di Integra per riga', async () => {
    for (let i = 0; i < 10; i++) {
      await creaArrivo(`sconosciuto-${i}.pdf`, { tipo: 'fattura', campi: [['numero', `S-${i}`], ['fornitore', 'Fornitore Sconosciuto SRL']] });
    }
    const spiaPonte = jest.spyOn(IntegraService.prototype, 'ponte').mockResolvedValue({ pool: {} as never, schema: 'public' });
    const spiaCerca = jest.spyOn(anagraficaIntegra, 'cerca').mockResolvedValue({ righe: [], ms: 1 });
    try {
      await op.get('/documenti?stato=da_controllare&per_pagina=200').expect(200);
      // 10 documenti con lo stesso nome → una sola ricerca per quel nome, non una per riga
      const perNome = spiaCerca.mock.calls.filter((c) => c[3] === 'fornitore' && c[4] === 'Fornitore Sconosciuto SRL');
      expect(perNome).toHaveLength(1);
    } finally {
      spiaPonte.mockRestore();
      spiaCerca.mockRestore();
    }
  });

  it('ponte lento: una sola ricerca di Integra per pagina, non una per nome (R1-02)', async () => {
    await creaArrivo('lento-1.pdf', { tipo: 'fattura', campi: [['fornitore', 'Lento Uno SRL']] });
    await creaArrivo('lento-2.pdf', { tipo: 'fattura', campi: [['fornitore', 'Lento Due SRL']] });
    const spiaPonte = jest.spyOn(IntegraService.prototype, 'ponte').mockResolvedValue({ pool: {} as never, schema: 'public' });
    const spiaCerca = jest.spyOn(anagraficaIntegra, 'cerca').mockResolvedValue({ errore: 'ponte lento', ms: 3000 });
    try {
      await op.get('/documenti?stato=da_controllare&per_pagina=200').expect(200);
      expect(spiaCerca).toHaveBeenCalledTimes(1);
    } finally {
      spiaPonte.mockRestore();
      spiaCerca.mockRestore();
    }
  });

  it('la pagina legge i clienti una volta sola (R1-11)', async () => {
    const spia = jest.spyOn(db.clienti, 'findMany');
    try {
      await op.get('/documenti?stato=da_controllare&per_pagina=200').expect(200);
      expect(spia).toHaveBeenCalledTimes(1);
    } finally {
      spia.mockRestore();
    }
  });

  it('scaglioni_mancanti guarda la data del documento, non un valido_dal qualsiasi (R1-12)', async () => {
    const f = await db.fornitori.create({ data: {} });
    const v = await db.fornitori_versioni.create({ data: { fornitore_id: f.id, fonte: 'integra', ragione_sociale: 'Fornitore Dal 2027' } });
    await db.fornitori.update({ where: { id: f.id }, data: { versione_corrente_id: v.id } });
    await db.provvigioni_scaglioni.create({ data: { fornitore_id: f.id, sconto_min: 0, pct_agente: 5, pct_subagente: 2, valido_dal: new Date('2027-01-01') } });
    const d = await db.documenti_in_arrivo.create({ data: {
      origine: 'email', file_nome: 'scaglione-futuro.pdf', stato: 'da_controllare',
      file_hash: createHash('sha256').update('scaglione-futuro').digest('hex'), file_percorso: 'in_arrivo/scaglione-futuro.pdf',
      tipo: 'ordine', fornitore_id: f.id, fornitore_versione_id: v.id,
    } });
    await db.documenti_campi.createMany({ data: [{ documento_id: d.id, campo: 'data', valore_letto: '2026-11-05' }] });
    expect((await op.get(`/documenti/${d.id}`).expect(200)).body.scaglioni_mancanti).toBe(true);
    // uno scaglione valido prima della data del documento: la card tace
    await db.provvigioni_scaglioni.create({ data: { fornitore_id: f.id, sconto_min: 0, pct_agente: 5, pct_subagente: 2, valido_dal: new Date('2026-01-01') } });
    expect((await op.get(`/documenti/${d.id}`).expect(200)).body.scaglioni_mancanti).toBe(false);
  });

  it('PUT della sola testata (import del fornitore): le righe lette restano uguali (D-133)', async () => {
    const d = await creaArrivo('righe-salve.pdf', { tipo: 'fattura', campi: [['numero', 'RS-1'], ['data', '2026-09-01']] });
    await db.documenti_campi.createMany({ data: [
      { documento_id: d.id, campo: 'righe[0].codice', valore_letto: 'A-1', affidabilita: 0.95 },
      { documento_id: d.id, campo: 'righe[0].importo', valore_letto: '10' },
      { documento_id: d.id, campo: 'righe[1].codice', valore_letto: 'A-2', affidabilita: 0.42 },
    ] });
    const righe = { where: { documento_id: d.id, campo: { startsWith: 'righe[' } }, orderBy: { id: 'asc' as const } };
    const prima = await db.documenti_campi.findMany(righe);
    await op.put(`/documenti/${d.id}`, { testata: { tipo: 'fattura', fornitore_id: Number(fornitore.id) } }).expect(200);
    const dopo = await db.documenti_campi.findMany(righe);
    expect(dopo).toEqual(prima);
  });

  it('documento senza codice cliente: lo storico con codice NULL si ritrova come prima (C1)', async () => {
    await db.interscambio_storico.create({ data: {
      fonte: 'vecchio_crm', estratto_il: ESTRATTO, cliente_legacy_id: 7003n, fornitore_legacy_id: 7003n,
      fornitore_ragione_sociale: fornitore.ragione,
      cliente_codice_fornitore: null, cliente_ragione_sociale: 'Sconosciuto SRL',
      subagente_nome: 'Mario Rossi', sconto_1: 5, sconto_2: 0,
    } });
    const d = await creaArrivo('ordine-senza-codice.pdf', {
      tipo: 'ordine', fornitore_id: fornitore.id,
      campi: [['numero', 'SC-1'], ['data', '2026-09-01'], ['cliente', 'Sconosciuto SRL']],
    });
    const r = (await op.get('/documenti?stato=da_controllare&per_pagina=200').expect(200)).body;
    expect(r.documenti.find((x: any) => x.id === String(d.id)).cliente_da_integra).toBe(true);
  });

  it('documento con codice: la riga dello storico senza codice non lo riguarda (C1, R1-11 invariato)', async () => {
    const d = await creaArrivo('ordine-con-codice.pdf', {
      tipo: 'ordine', fornitore_id: fornitore.id,
      campi: [['numero', 'CC-1'], ['data', '2026-09-01'], ['codice_cliente', 'CODICE-ALTRO'], ['cliente', 'Sconosciuto SRL']],
    });
    const r = (await op.get('/documenti?stato=da_controllare&per_pagina=200').expect(200)).body;
    expect(r.documenti.find((x: any) => x.id === String(d.id)).cliente_da_integra).toBe(false);
  });

  it('documento senza codice: la coppia senza subagente nello storico dà «Non rappresentato» (C1)', async () => {
    await db.interscambio_storico.create({ data: {
      fonte: 'vecchio_crm', estratto_il: ESTRATTO, cliente_legacy_id: 7004n, fornitore_legacy_id: 7004n,
      fornitore_ragione_sociale: fornitore.ragione,
      cliente_codice_fornitore: null, cliente_ragione_sociale: senza.ragione,
      subagente_nome: null, sconto_1: 0, sconto_2: 0,
    } });
    const d = await creaArrivo('ordine-senza-codice-nonrapp.pdf', {
      tipo: 'ordine', fornitore_id: fornitore.id,
      campi: [['numero', 'SC-2'], ['data', '2026-09-01'], ['cliente', senza.ragione], ['piva_cliente', senza.piva]],
    });
    const r = (await op.get('/documenti?stato=da_controllare&per_pagina=200').expect(200)).body;
    const riga = r.documenti.find((x: any) => x.id === String(d.id));
    expect(riga.manca_rappresentanza).toBe(true);
    expect(riga.manca_agenzia).toBe(false);
  });

  it('elenco e dettaglio trovano lo storico per P.IVA anche con un nome diverso (C2)', async () => {
    await db.interscambio_storico.create({ data: {
      fonte: 'vecchio_crm', estratto_il: ESTRATTO, cliente_legacy_id: 7005n, fornitore_legacy_id: 7005n,
      fornitore_ragione_sociale: 'GRIES GmbH', fornitore_piva: fornitore.piva,
      cliente_codice_fornitore: 'CLI-PIVA-1', subagente_nome: 'Mario Rossi', sconto_1: 5, sconto_2: 0,
    } });
    const d = await creaArrivo('ordine-storico-piva.pdf', {
      tipo: 'ordine', fornitore_id: fornitore.id,
      campi: [['numero', 'PV-1'], ['data', '2026-09-01'], ['codice_cliente', 'CLI-PIVA-1'], ['cliente', 'Sconosciuto SRL']],
    });
    const r = (await op.get('/documenti?stato=da_controllare&per_pagina=200').expect(200)).body;
    expect(r.documenti.find((x: any) => x.id === String(d.id)).cliente_da_integra).toBe(true);
    const dettaglio = (await op.get(`/documenti/${d.id}`).expect(200)).body;
    expect(dettaglio.proposta.esito).toBe('cliente_da_integra');
  });
});
