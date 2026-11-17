// D-204 §19: ordine/conferma/proforma aggiornati dal fornitore («agg …») che sostituiscono il
// documento già registrato, e il falso avviso sul codice cliente del doppione (rilievo 1).
// Rilievo 1 senza rete (controlliFissi/propostaDocumento); rilievo 2 con la rotta POST /documenti/:id/sostituisci.
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configura } from '../src/main';
import { cifra } from '../src/password';
import { PrismaService } from '../src/prisma.service';
import { controlliFissi, propostaDocumento, type Letto, type RigaLetta } from '../src/proposta';
import { svuota } from './svuota';

// ogni prova entra con lo stesso utente: alza il tetto dei tentativi per persona (D-41), come TENTATIVI_IP
process.env.TENTATIVI = '1000';

let app: NestExpressApplication;
let db: PrismaService;
let n = 0;

const L = (over: Partial<Letto>): Letto => ({
  tipo: null, fornitore_id: null, fornitore: null, numero: null, numero_ordine_fornitore: null, data: null,
  codice_cliente: null, cliente: null, cliente_id: null, piva_cliente: null, importo: null, mese: null, anno: null,
  riferimento_fattura: null, righe: [],
  ...over,
});
const R = (over: Partial<RigaLetta>): RigaLetta => ({
  codice: null, descrizione: null, quantita: null, prezzo: null, importo: null,
  sconto: null, numero_fattura: null, data_fattura: null, provvigione: null, quota_pagata: null, ...over,
});
const giorno = (s: string) => new Date(s + 'T00:00:00Z');

let gries: { id: bigint; versione_id: bigint };
let c1: { id: bigint; versione_id: bigint };
let c2: { id: bigint; versione_id: bigint };

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

/** Pratica del cliente c1 col fornitore gries e un documento (ordine/conferma/proforma) con righe e un file vecchio. */
async function creaPraticaConDocumento(tipo: string, numero: string, data: string, righe: { codice: string; quantita: number; prezzo: number }[], importo: number) {
  const t = await db.ordini_fornitore_testata.create({
    data: {
      fornitore_id: gries.id, fornitore_versione_id: gries.versione_id,
      cliente_id: c1.id, cliente_versione_id: c1.versione_id,
      numero_ordine: `OF/2026/${String(++n).padStart(3, '0')}`, data_ordine: giorno(data),
    },
  });
  // file vecchio del documento, già abbinato alla pratica
  const vecchio = await db.documenti_in_arrivo.create({
    data: {
      origine: 'email', file_nome: `vecchio-${numero}.pdf`, stato: 'abbinato', abbinato_pratica_id: t.id,
      file_hash: createHash('sha256').update(`vecchio-${numero}-${t.id}`).digest('hex'),
      file_percorso: `pratiche/${numero}-vecchio.pdf`, tipo,
    },
  });
  const d = await db.ordini_fornitore_documenti.create({
    data: { testata_id: t.id, tipo, numero, data: giorno(data), importo, arrivo_id: vecchio.id },
  });
  if (righe.length) {
    const fase = tipo === 'ordine' ? 'ordine' : 'conferma';
    await db.ordini_fornitore_righe.createMany({
      data: righe.map((r, i) => ({ testata_id: t.id, documento_id: d.id, fase, numero_riga: i + 1, codice: r.codice, quantita: r.quantita, prezzo_unitario: r.prezzo, importo: Math.round(r.quantita * r.prezzo * 100) / 100 })),
    });
  }
  return { pratica: t.id, documento: d.id, vecchio: vecchio.id };
}

/** Documento in arrivo (aggiornato) con i campi letti. */
async function creaArrivo(tipo: string, fornitore_id: bigint, campi: [string, string | null][] = [], righe: { codice: string; quantita: number; prezzo: number }[] = []) {
  const r = await db.documenti_in_arrivo.create({
    data: {
      origine: 'email', file_nome: `agg-${++n}.pdf`, stato: 'da_controllare',
      file_hash: createHash('sha256').update(`agg-${n}`).digest('hex'), file_percorso: `in_arrivo/agg-${n}.pdf`,
      tipo, fornitore_id, fornitore_versione_id: (await db.fornitori.findUniqueOrThrow({ where: { id: fornitore_id } })).versione_corrente_id,
    },
  });
  await db.documenti_campi.createMany({
    data: [
      ...campi.map(([campo, valore]) => ({ documento_id: r.id, campo, valore_letto: valore })),
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
const DOMINIO = '@prova-ordineagg.it';
async function entra() {
  const agente = request.agent(app.getHttpServer());
  const csrf = (await agente.post('/api/accesso/entra').send({ utente: 'op-agg', password: PW }).expect(200)).body.csrf as string;
  return {
    get: (p: string) => agente.get('/api' + p),
    post: (p: string, b: object = {}) => agente.post('/api' + p).set('x-csrf-token', csrf).send(b),
    put: (p: string, b: object) => agente.put('/api' + p).set('x-csrf-token', csrf).send(b),
    del: (p: string) => agente.delete('/api' + p).set('x-csrf-token', csrf),
  };
}
let op: Awaited<ReturnType<typeof entra>>;

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
  c2 = await creaCliente('Il Giardino di Sofia srl', 'IT00000000002');
  const agente = await db.agenti.create({ data: { codice: 'DECO', nome: 'Decobrands', cognome: 'SRL' } });
  const sub = await db.subagenti.create({ data: { agente_id: agente.id, codice: 'SUB1', nome: 'Mario', cognome: 'Rossi' } });
  await db.interscambio.create({ data: { subagente_id: sub.id, cliente_id: c1.id, fornitore_id: gries.id, codice_cliente_fornitore: 'K-100', valido_dal: giorno('2025-01-01') } });
  await db.interscambio.create({ data: { subagente_id: sub.id, cliente_id: c2.id, fornitore_id: gries.id, codice_cliente_fornitore: 'K-200', valido_dal: giorno('2025-01-01') } });
  await db.utenti.create({
    data: {
      username: 'op-agg', email: 'op-agg' + DOMINIO, nome: 'Prova Aggiornato', ruolo: 'utente',
      aree: { create: [{ area: 'provvigioni', livello: 'operatore' }] },
      password_hash: await cifra(PW), deve_cambiare_password: false,
    },
  });
  op = await entra();
});

describe('rilievo 1 — falso avviso sul codice cliente (doppio)', () => {
  it('ordine doppio, codice esistente e nessun cliente scelto: nessun avviso grave e cliente proposto', async () => {
    await creaPraticaConDocumento('ordine', 'AU278504', '2026-05-01', [{ codice: 'A1', quantita: 2, prezzo: 10 }], 20);
    const l = L({ tipo: 'ordine', fornitore_id: gries.id, numero: 'AU278504', codice_cliente: 'K-100' });
    const p = await propostaDocumento(db, l);
    expect(p.esito).toBe('doppio');
    expect(p.abbinamento).toMatchObject({ cliente_id: c1.id, codice: 'K-100' }); // il codice indica il cliente
    const c = await controlliFissi(db, l, p);
    expect(c.filter((x) => x.codice === 'codice_cliente')).toEqual([]);
  });

  it('cliente scelto diverso dal codice: avviso «è di …» come oggi', async () => {
    const l = L({ tipo: 'proforma', fornitore_id: gries.id, codice_cliente: 'K-200', cliente_id: String(c1.id) });
    const p = await propostaDocumento(db, l);
    const c = await controlliFissi(db, l, p);
    expect(c).toContainEqual({ codice: 'codice_cliente', campo: 'codice_cliente', testo: 'Il codice K-200 presso Gries GmbH & Co. KG è di Il Giardino di Sofia srl', grave: true, gruppo: 'lettura' });
  });
});

describe('rilievo 2 — proposta del doppione sostituibile', () => {
  it('conferma/proforma con lo stesso numero: doppio con i dati della versione registrata', async () => {
    const { pratica, documento } = await creaPraticaConDocumento('proforma', 'PR-1', '2026-05-10', [{ codice: 'A1', quantita: 2, prezzo: 10 }], 20);
    const p = await propostaDocumento(db, L({ tipo: 'proforma', fornitore_id: gries.id, numero: 'PR-1', codice_cliente: 'K-100' }));
    expect(p.esito).toBe('doppio');
    expect(p.doppio).toMatchObject({ tipo: 'proforma', pratica_id: String(pratica), documento_id: String(documento), numero: 'PR-1', importo: 20, righe: 1 });
  });

  it('proforma con numero diverso: resta una conferma in più, niente doppio', async () => {
    await creaPraticaConDocumento('proforma', 'PR-1', '2026-05-10', [{ codice: 'A1', quantita: 2, prezzo: 10 }], 20);
    const p = await propostaDocumento(db, L({ tipo: 'proforma', fornitore_id: gries.id, numero: 'PR-2', codice_cliente: 'K-100', righe: [R({ codice: 'A1', quantita: 1, prezzo: 10, importo: 10 })] }));
    expect(p.esito).toBe('certo');
    expect(p.doppio).toBeNull();
  });

  it('fattura doppia: doppio null (nessun pulsante Sostituisci)', async () => {
    await creaPraticaConDocumento('fattura', 'F-1', '2026-06-01', [], 100);
    const p = await propostaDocumento(db, L({ tipo: 'fattura', fornitore_id: gries.id, numero: 'F-1', codice_cliente: 'K-100' }));
    expect(p.esito).toBe('doppio');
    expect(p.doppio).toBeNull();
  });

  it('numero riusato in un altro anno su una pratica chiusa: il doppio punta al documento aperto (D-34)', async () => {
    const { pratica: chiusa, documento: vecchio } = await creaPraticaConDocumento('ordine', 'AU123', '2024-05-01', [], 100);
    // la pratica del 2024 è chiusa: ha una fattura congelata
    await db.ordini_fornitore_documenti.create({ data: { testata_id: chiusa, tipo: 'fattura', numero: 'F-VECCHIA', data: giorno('2024-06-01'), importo: 100, congelato_il: new Date() } });
    const { documento: aperto } = await creaPraticaConDocumento('ordine', 'AU123', '2026-05-01', [], 200);
    const p = await propostaDocumento(db, L({ tipo: 'ordine', fornitore_id: gries.id, numero: 'AU123', data: '2026-05-05', codice_cliente: 'K-100' }));
    expect(p.esito).toBe('doppio');
    expect(p.doppio?.documento_id).toBe(String(aperto));
    expect(p.doppio?.documento_id).not.toBe(String(vecchio));
  });
});

describe('rilievo 2 — sostituzione (POST /documenti/:id/sostituisci)', () => {
  it('ordine doppio: dati, righe e file nuovi; file vecchio resta legato alla pratica; evento e ricalcolo', async () => {
    const { pratica, documento, vecchio } = await creaPraticaConDocumento('ordine', 'AU278504', '2026-05-01', [{ codice: 'A1', quantita: 2, prezzo: 10 }], 20);
    const arrivo = await creaArrivo('ordine', gries.id, [['numero', 'AU278504'], ['data', '2026-05-05'], ['importo_totale', '1056.24']], [{ codice: 'B1', quantita: 4, prezzo: 5 }]);
    const r = await op.post(`/documenti/${arrivo}/sostituisci`, { motivo: 'Ordine aggiornato dal fornitore' }).expect(200);
    expect(r.body.pratica.id).toBe(String(pratica));

    const d = await db.ordini_fornitore_documenti.findUniqueOrThrow({ where: { id: documento } });
    expect(d.arrivo_id).toBe(arrivo); // file nuovo
    expect(d.importo.toFixed(2)).toBe('1056.24');
    expect(d.data.toISOString().slice(0, 10)).toBe('2026-05-05');
    // righe sostituite: la vecchia A1 è sparita, c'è la B1
    const righe = await db.ordini_fornitore_righe.findMany({ where: { documento_id: documento }, orderBy: { numero_riga: 'asc' } });
    expect(righe.map((x) => x.codice)).toEqual(['B1']);

    // file vecchio non cancellato: resta abbinato alla pratica (storico)
    const v = await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: vecchio } });
    expect(v).toMatchObject({ stato: 'abbinato', abbinato_pratica_id: pratica });
    // il documento in arrivo si chiude come registrato
    expect(await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: arrivo } })).toMatchObject({ stato: 'abbinato', abbinato_pratica_id: pratica, tipo: 'ordine' });
    // evento nel registro con motivo e prima/dopo
    expect(await db.registro.count({ where: { entita_id: documento, codice: 'documento.update' } })).toBe(1);
    // ricalcolo: la pratica resta coerente (il motore non si rompe, stato inviato senza fatture)
    expect((await db.ordini_fornitore_testata.findUniqueOrThrow({ where: { id: pratica } })).stato).toBe('inviato');
  });

  it('motivo obbligatorio: 400 senza motivo', async () => {
    const { documento } = await creaPraticaConDocumento('ordine', 'AU-2', '2026-05-01', [], 0);
    const arrivo = await creaArrivo('ordine', gries.id, [['numero', 'AU-2'], ['data', '2026-05-05']]);
    await op.post(`/documenti/${arrivo}/sostituisci`, { motivo: '   ' }).expect(400);
    expect((await db.ordini_fornitore_documenti.findUniqueOrThrow({ where: { id: documento } })).arrivo_id).not.toBe(arrivo);
  });

  it('solo ordine, conferma e proforma: una fattura si rifiuta (400)', async () => {
    const arrivo = await creaArrivo('fattura', gries.id, [['numero', 'F-X'], ['data', '2026-06-01']]);
    await op.post(`/documenti/${arrivo}/sostituisci`, { motivo: 'prova' }).expect(400);
  });

  it('un documento in una pratica chiusa non è un candidato: 404 (D-204)', async () => {
    const { pratica, documento } = await creaPraticaConDocumento('ordine', 'AU-3', '2026-05-01', [], 0);
    await db.ordini_fornitore_documenti.create({ data: { testata_id: pratica, tipo: 'fattura', numero: 'F-CONG', data: giorno('2026-06-01'), importo: 10, congelato_il: new Date() } });
    const arrivo = await creaArrivo('ordine', gries.id, [['numero', 'AU-3'], ['data', '2026-05-05']]);
    await op.post(`/documenti/${arrivo}/sostituisci`, { motivo: 'prova' }).expect(404);
    expect((await db.ordini_fornitore_documenti.findUniqueOrThrow({ where: { id: documento } })).arrivo_id).not.toBe(arrivo);
  });

  it('proforma doppia: sostituzione come l\'ordine', async () => {
    const { pratica, documento } = await creaPraticaConDocumento('proforma', 'PR-10', '2026-05-10', [{ codice: 'A1', quantita: 2, prezzo: 10 }], 20);
    const arrivo = await creaArrivo('proforma', gries.id, [['numero', 'PR-10'], ['data', '2026-05-12'], ['importo_totale', '30']], [{ codice: 'C1', quantita: 1, prezzo: 30 }]);
    const r = await op.post(`/documenti/${arrivo}/sostituisci`, { motivo: 'Proforma aggiornata dal fornitore' }).expect(200);
    expect(r.body.pratica.id).toBe(String(pratica));
    const d = await db.ordini_fornitore_documenti.findUniqueOrThrow({ where: { id: documento } });
    expect(d.importo.toFixed(2)).toBe('30.00');
    expect((await db.ordini_fornitore_righe.findMany({ where: { documento_id: documento } })).map((x) => x.codice)).toEqual(['C1']);
  });

  it('due documenti aperti con lo stesso numero: 409 «abbina a mano»', async () => {
    await creaPraticaConDocumento('ordine', 'AU456', '2026-04-01', [], 100);
    await creaPraticaConDocumento('ordine', 'AU456', '2026-06-01', [], 200);
    const arrivo = await creaArrivo('ordine', gries.id, [['numero', 'AU456'], ['data', '2026-05-15']]);
    const r = await op.post(`/documenti/${arrivo}/sostituisci`, { motivo: 'prova' }).expect(409);
    expect(r.body.message).toMatch(/abbina a mano/);
  });
});
