// D-204 §19: gli ordini/conferme/proforme sostituiti restano visibili e consultabili come versioni
// precedenti sotto il documento attuale (PDF, data, importo, righe, motivo). Solo da consultare, mai
// nei calcoli; il PDF vecchio si apre con gli stessi permessi dei documenti della pratica; con
// l'eliminazione della pratica anche le versioni precedenti passano negli scartati.
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configura } from '../src/main';
import { cifra } from '../src/password';
import { PrismaService } from '../src/prisma.service';
import { svuota } from './svuota';

process.env.TENTATIVI = '1000';

let app: NestExpressApplication;
let db: PrismaService;
let n = 0;
const CARTELLA = process.env.DOCUMENTI_DIR!;

const giorno = (s: string) => new Date(s + 'T00:00:00Z');
const pdf = (t: string) => Buffer.from(`%PDF-1.4\n% ${t}\n%%EOF\n`);

let gries: { id: bigint; versione_id: bigint };
let c1: { id: bigint; versione_id: bigint };

async function creaFornitore(nome: string) {
  const f = await db.fornitori.create({ data: {} });
  const v = await db.fornitori_versioni.create({ data: { fornitore_id: f.id, fonte: 'integra', ragione_sociale: nome } });
  await db.fornitori.update({ where: { id: f.id }, data: { versione_corrente_id: v.id } });
  return { id: f.id, versione_id: v.id };
}
async function creaCliente(nome: string, piva: string) {
  const c = await db.clienti.create({ data: {} });
  const v = await db.clienti_versioni.create({ data: { cliente_id: c.id, fonte: 'integra', ragione_sociale: nome, piva } });
  await db.clienti.update({ where: { id: c.id }, data: { versione_corrente_id: v.id } });
  return { id: c.id, versione_id: v.id };
}

/** Pratica del cliente c1 col fornitore gries e un ordine con righe e un file vecchio già abbinato. */
async function creaPraticaConDocumento(numero: string, data: string, righe: { codice: string; quantita: number; prezzo: number }[], importo: number) {
  const t = await db.ordini_fornitore_testata.create({
    data: {
      fornitore_id: gries.id, fornitore_versione_id: gries.versione_id,
      cliente_id: c1.id, cliente_versione_id: c1.versione_id,
      numero_ordine: `OF/2026/${String(++n).padStart(3, '0')}`, data_ordine: giorno(data),
    },
  });
  const vecchio = await db.documenti_in_arrivo.create({
    data: {
      origine: 'email', file_nome: `vecchio-${numero}.pdf`, stato: 'abbinato', abbinato_pratica_id: t.id,
      file_hash: createHash('sha256').update(`vecchio-${numero}-${t.id}`).digest('hex'),
      file_percorso: `pratiche/${numero}-vecchio.pdf`, tipo: 'ordine',
    },
  });
  const d = await db.ordini_fornitore_documenti.create({
    data: { testata_id: t.id, tipo: 'ordine', numero, data: giorno(data), importo, arrivo_id: vecchio.id },
  });
  if (righe.length) {
    await db.ordini_fornitore_righe.createMany({
      data: righe.map((r, i) => ({ testata_id: t.id, documento_id: d.id, fase: 'ordine', numero_riga: i + 1, codice: r.codice, quantita: r.quantita, prezzo_unitario: r.prezzo, importo: Math.round(r.quantita * r.prezzo * 100) / 100 })),
    });
  }
  // i campi letti di allora del file vecchio: per le righe della versione precedente
  await db.documenti_campi.createMany({
    data: [
      { documento_id: vecchio.id, campo: 'numero', valore_letto: numero },
      { documento_id: vecchio.id, campo: 'data', valore_letto: data },
      { documento_id: vecchio.id, campo: 'importo_totale', valore_letto: String(importo) },
      ...righe.flatMap((r, i) => [
        { documento_id: vecchio.id, campo: `righe[${i}].codice`, valore_letto: r.codice },
        { documento_id: vecchio.id, campo: `righe[${i}].quantita`, valore_letto: String(r.quantita) },
        { documento_id: vecchio.id, campo: `righe[${i}].prezzo`, valore_letto: String(r.prezzo) },
      ]),
    ],
  });
  return { pratica: t.id, documento: d.id, vecchio: vecchio.id };
}

/** Documento in arrivo aggiornato con i campi letti (sostituisce). */
async function creaArrivo(numero: string, data: string, importo: string, righe: { codice: string; quantita: number; prezzo: number }[]) {
  const r = await db.documenti_in_arrivo.create({
    data: {
      origine: 'email', file_nome: `agg-${++n}.pdf`, stato: 'da_controllare',
      file_hash: createHash('sha256').update(`agg-${n}`).digest('hex'), file_percorso: `in_arrivo/agg-${n}.pdf`,
      tipo: 'ordine', fornitore_id: gries.id, fornitore_versione_id: gries.versione_id,
    },
  });
  await db.documenti_campi.createMany({
    data: [
      { documento_id: r.id, campo: 'numero', valore_letto: numero },
      { documento_id: r.id, campo: 'data', valore_letto: data },
      { documento_id: r.id, campo: 'importo_totale', valore_letto: importo },
      ...righe.flatMap((rig, i) => [
        { documento_id: r.id, campo: `righe[${i}].codice`, valore_letto: rig.codice },
        { documento_id: r.id, campo: `righe[${i}].quantita`, valore_letto: String(rig.quantita) },
        { documento_id: r.id, campo: `righe[${i}].prezzo`, valore_letto: String(rig.prezzo) },
      ]),
    ],
  });
  return r.id;
}

const PW = 'password-di-prova';
const DOMINIO = '@prova-sostituiti.it';
async function entra() {
  const agente = request.agent(app.getHttpServer());
  const csrf = (await agente.post('/api/accesso/entra').send({ utente: 'op-sost', password: PW }).expect(200)).body.csrf as string;
  return {
    get: (p: string) => agente.get('/api' + p),
    post: (p: string, b: object = {}) => agente.post('/api' + p).set('x-csrf-token', csrf).send(b),
    del: (p: string, b: object = {}) => agente.delete('/api' + p).set('x-csrf-token', csrf).send(b),
  };
}
let op: Awaited<ReturnType<typeof entra>>;
const raccogli = (res: unknown, cb: (e: Error | null, dati?: Buffer) => void) => {
  const parti: Buffer[] = [];
  (res as { on: (e: string, c: (d: Buffer) => void) => void }).on('data', (c) => parti.push(c));
  (res as { on: (e: string, c: () => void) => void }).on('end', () => cb(null, Buffer.concat(parti)));
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
  gries = await creaFornitore('Gries GmbH & Co. KG');
  c1 = await creaCliente('Verde Vita snc', 'IT00000000001');
  const agente = await db.agenti.create({ data: { codice: 'DECO', nome: 'Decobrands', cognome: 'SRL' } });
  const sub = await db.subagenti.create({ data: { agente_id: agente.id, codice: 'SUB1', nome: 'Mario', cognome: 'Rossi' } });
  await db.interscambio.create({ data: { subagente_id: sub.id, cliente_id: c1.id, fornitore_id: gries.id, codice_cliente_fornitore: 'K-100', valido_dal: giorno('2025-01-01') } });
  // amministratore con provvigioni responsabile: sostituisce (provvigioni.modifica) ed elimina (provvigioni.elimina + ruolo)
  await db.utenti.create({
    data: {
      username: 'op-sost', email: 'op-sost' + DOMINIO, nome: 'Prova Sostituiti', ruolo: 'amministratore',
      aree: { create: [{ area: 'provvigioni', livello: 'responsabile' }] },
      password_hash: await cifra(PW), deve_cambiare_password: false,
    },
  });
  op = await entra();
});

describe('versioni precedenti dei documenti sostituiti (D-204)', () => {
  it('ordine sostituito due volte: il documento attuale porta 2 versioni (PDF, data, importo, righe, motivo) e i calcoli non cambiano', async () => {
    const { pratica, documento, vecchio } = await creaPraticaConDocumento('AU278504', '2026-05-01', [{ codice: 'A1', quantita: 2, prezzo: 10 }], 20);
    const prima = (await op.get(`/pratiche/${pratica}`).expect(200)).body as { importo: number; stato: string; provvigione: unknown };

    const arrivo1 = await creaArrivo('AU278504', '2026-05-05', '30', [{ codice: 'B1', quantita: 1, prezzo: 30 }]);
    await op.post(`/documenti/${arrivo1}/sostituisci`, { motivo: 'Primo aggiornamento' }).expect(200);
    const arrivo2 = await creaArrivo('AU278504', '2026-05-08', '40', [{ codice: 'C1', quantita: 2, prezzo: 20 }]);
    await op.post(`/documenti/${arrivo2}/sostituisci`, { motivo: 'Secondo aggiornamento' }).expect(200);

    const f = (await op.get(`/pratiche/${pratica}/documenti`).expect(200)).body as { altri: { id: string; versioni: Record<string, unknown>[] }[] };
    const doc = f.altri.find((x) => x.id === String(documento))!;
    expect(doc.versioni).toHaveLength(2);
    // la più recente è la prima sostituita: arrivo1
    expect(doc.versioni[0]).toMatchObject({ arrivo_id: String(arrivo1), tipo: 'ordine', numero: 'AU278504', data: '2026-05-05', importo: 30, righe: 1, motivo: 'Secondo aggiornamento' });
    expect((doc.versioni[0] as { file_nome: string }).file_nome).toBeTruthy();
    expect((doc.versioni[0] as { righe_lette: { codice: string }[] }).righe_lette.map((r) => r.codice)).toEqual(['B1']);
    // la più vecchia è il file originario
    expect(doc.versioni[1]).toMatchObject({ arrivo_id: String(vecchio), data: '2026-05-01', importo: 20, righe: 1, motivo: 'Primo aggiornamento' });
    expect((doc.versioni[1] as { righe_lette: { codice: string }[] }).righe_lette.map((r) => r.codice)).toEqual(['A1']);

    // i calcoli della pratica non dipendono dalle versioni precedenti: stato e provvigione non cambiano,
    // e la stima conta solo il documento attuale (40), non la somma di tutte le versioni
    const dopo = (await op.get(`/pratiche/${pratica}`).expect(200)).body as { importo: number; stato: string; provvigione: unknown };
    expect(dopo.stato).toBe(prima.stato);
    expect(dopo.provvigione).toEqual(prima.provvigione);
    expect(dopo.importo).toBe(40);
  });

  it('il PDF di una versione precedente si apre con gli stessi permessi dei documenti della pratica', async () => {
    const { pratica, vecchio } = await creaPraticaConDocumento('AU-5', '2026-05-01', [{ codice: 'A1', quantita: 1, prezzo: 10 }], 10);
    const a = await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: vecchio } });
    await mkdir(dirname(join(CARTELLA, a.file_percorso)), { recursive: true });
    await writeFile(join(CARTELLA, a.file_percorso), pdf('vecchio'));
    const arrivo = await creaArrivo('AU-5', '2026-05-05', '12', [{ codice: 'B1', quantita: 1, prezzo: 12 }]);
    await op.post(`/documenti/${arrivo}/sostituisci`, { motivo: 'Aggiornato' }).expect(200);
    // il file vecchio resta abbinato (non scartato): la sola consulta lo apre
    await op.get(`/documenti/${vecchio}/file`).buffer(true).parse(raccogli as never).expect(200);
    await op.get(`/pratiche/${pratica}`).expect(200);
  });

  it('eliminando la pratica anche le versioni precedenti passano negli scartati', async () => {
    const { pratica, vecchio } = await creaPraticaConDocumento('AU-6', '2026-05-01', [{ codice: 'A1', quantita: 1, prezzo: 10 }], 10);
    const arrivo = await creaArrivo('AU-6', '2026-05-05', '12', [{ codice: 'B1', quantita: 1, prezzo: 12 }]);
    await op.post(`/documenti/${arrivo}/sostituisci`, { motivo: 'Aggiornato' }).expect(200);
    await op.del(`/pratiche/${pratica}`, { motivo: 'doppione' }).expect(204);
    const v = await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: vecchio } });
    expect(v.stato).toBe('scartato');
    expect(v.motivo_scarto).toMatch(/eliminata/);
  });
});
