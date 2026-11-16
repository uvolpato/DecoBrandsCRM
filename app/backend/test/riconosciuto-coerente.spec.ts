// Prova del riconoscimento coerente fra elenco, dettaglio e Correggi (P1, 15/11/2026):
// il fornitore/cliente riconosciuti all'apertura si salvano sul documento (D-175), l'esito del
// codice cliente per l'intestazione (spunta/avviso) e cosa scrive davvero l'abbinamento di PR102813.
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configura } from '../src/main';
import { cifra } from '../src/password';
import { PrismaService } from '../src/prisma.service';
import { esitoCodiceCliente, propostaDocumento, type Letto } from '../src/proposta';
import { svuota } from './svuota';

let app: NestExpressApplication;
let db: PrismaService;
let n = 0;

const PW = 'password-di-prova';
const DOMINIO = '@coerente-prova.it';

const giorno = (s: string) => new Date(s + 'T00:00:00Z');

const L = (over: Partial<Letto>): Letto => ({
  tipo: null, fornitore_id: null, fornitore: null, numero: null, numero_ordine_fornitore: null, data: null, codice_cliente: null, cliente: null, cliente_id: null, piva_cliente: null,
  importo: null, mese: null, anno: null, riferimento_fattura: null, righe: [],
  ...over,
});

async function creaFornitore(nome: string) {
  const f = await db.fornitori.create({ data: {} });
  const v = await db.fornitori_versioni.create({ data: { fornitore_id: f.id, fonte: 'integra', ragione_sociale: nome } });
  await db.fornitori.update({ where: { id: f.id }, data: { versione_corrente_id: v.id } });
  return { id: f.id, versione_id: v.id };
}
async function creaCliente(nome: string) {
  const c = await db.clienti.create({ data: {} });
  const v = await db.clienti_versioni.create({ data: { cliente_id: c.id, fonte: 'integra', ragione_sociale: nome } });
  await db.clienti.update({ where: { id: c.id }, data: { versione_corrente_id: v.id } });
  return { id: c.id, versione_id: v.id };
}
async function creaAgenzia(f: { id: bigint; versione_id: bigint }, c: { id: bigint }, codice: string, daConfermare = false) {
  const agente = await db.agenti.findFirst({ where: { codice: 'DECO' } }) ?? await db.agenti.create({ data: { codice: 'DECO', nome: 'Decobrands', cognome: 'SRL' } });
  const sub = await db.subagenti.findFirst({ where: { codice: 'SUB1' } }) ?? await db.subagenti.create({ data: { agente_id: agente.id, codice: 'SUB1', nome: 'Mario', cognome: 'Rossi' } });
  await db.interscambio.create({ data: { subagente_id: sub.id, cliente_id: c.id, fornitore_id: f.id, codice_cliente_fornitore: codice, valido_dal: giorno('2025-01-01'), da_confermare: daConfermare } });
  return sub.id;
}

/** Pratica marchiata col numero d'ordine del fornitore. */
async function creaPratica(f: { id: bigint; versione_id: bigint }, c: { id: bigint; versione_id: bigint }, numeroOrdine: string, numero = 'OF/2026/001') {
  return db.ordini_fornitore_testata.create({
    data: {
      fornitore_id: f.id, fornitore_versione_id: f.versione_id, cliente_id: c.id, cliente_versione_id: c.versione_id,
      numero_ordine: numero, numero_ordine_fornitore: numeroOrdine, data_ordine: giorno('2026-04-08'),
    },
  });
}

async function arrivo(opts: { stato?: string; tipo?: string | null; fornitore_id?: bigint | null; campi?: [string, string | null][] } = {}) {
  const versione = opts.fornitore_id != null
    ? (await db.fornitori.findUniqueOrThrow({ where: { id: opts.fornitore_id } })).versione_corrente_id
    : null;
  const r = await db.documenti_in_arrivo.create({
    data: {
      origine: 'email', file_nome: `d${++n}.pdf`, stato: opts.stato ?? 'da_controllare',
      ricevuto_il: new Date('2026-09-04T10:00:00Z'),
      file_hash: createHash('sha256').update(String(n)).digest('hex'), file_percorso: `in_arrivo/d${n}.pdf`,
      tipo: opts.tipo ?? null, fornitore_id: opts.fornitore_id ?? null, fornitore_versione_id: versione,
    },
  });
  if (opts.campi?.length) {
    await db.documenti_campi.createMany({ data: opts.campi.map(([campo, valore]) => ({ documento_id: r.id, campo, valore_letto: valore })) });
  }
  return r;
}

async function creaUtente(username: string) {
  await db.utenti.create({
    data: { username, email: username + DOMINIO, nome: 'Prova ' + username, ruolo: 'utente', aree: { create: [{ area: 'provvigioni', livello: 'operatore' }] }, password_hash: await cifra(PW), deve_cambiare_password: false },
  });
}
async function entra(utente: string) {
  const agente = request.agent(app.getHttpServer());
  const csrf = (await agente.post('/api/accesso/entra').send({ utente, password: PW }).expect(200)).body.csrf as string;
  return {
    get: (p: string) => agente.get('/api' + p),
    post: (p: string, b: object = {}) => agente.post('/api' + p).set('x-csrf-token', csrf).send(b),
    put: (p: string, b: object = {}) => agente.put('/api' + p).set('x-csrf-token', csrf).send(b),
  };
}
let op: Awaited<ReturnType<typeof entra>>;

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
  db = app.get(PrismaService);
  await svuota(db);
  await creaUtente('coerente-op');
  op = await entra('coerente-op');
}, 120_000);

afterAll(async () => {
  const utenti = (await db.utenti.findMany({ where: { email: { endsWith: DOMINIO } } })).map((u) => u.id);
  await db.$transaction([
    db.sessioni.deleteMany({ where: { utente_id: { in: utenti } } }),
    db.utenti.deleteMany({ where: { id: { in: utenti } } }),
  ]);
  await svuota(db);
  await app.close();
});

beforeEach(async () => {
  await svuota(db);
});

describe('esitoCodiceCliente (D-175)', () => {
  let arte: { id: bigint; versione_id: bigint };
  let agri: { id: bigint; versione_id: bigint };

  beforeEach(async () => {
    arte = await creaFornitore('Arte Wohnaccessories GmbH & Co. KG');
    agri = await creaCliente('Agri Aggio SNC di Aggio Mauro & C.');
    await creaAgenzia(arte, agri, '45172');
  });

  it('senza codice cliente: assente', async () => {
    expect(await esitoCodiceCliente(db, L({ fornitore_id: arte.id }), null)).toEqual({ stato: 'assente' });
  });

  it('codice del cliente associato: corrisponde', async () => {
    const l = L({ tipo: 'proforma', fornitore_id: arte.id, codice_cliente: '45172' });
    expect(await esitoCodiceCliente(db, l, agri.id)).toEqual({ stato: 'corrisponde', cliente: 'Agri Aggio SNC di Aggio Mauro & C.' });
  });

  it('codice di un altro cliente: altro_cliente', async () => {
    const altro = await creaCliente('Altro Cliente snc');
    const l = L({ tipo: 'proforma', fornitore_id: arte.id, codice_cliente: '45172' });
    const e = await esitoCodiceCliente(db, l, altro.id);
    expect(e.stato).toBe('altro_cliente');
    expect((e as { cliente: string }).cliente).toBe('Agri Aggio SNC di Aggio Mauro & C.');
  });

  it('codice senza agenzia: senza_agenzia', async () => {
    const l = L({ tipo: 'proforma', fornitore_id: arte.id, codice_cliente: '99999' });
    expect(await esitoCodiceCliente(db, l, null)).toEqual({ stato: 'senza_agenzia' });
  });

  it('agenzia da confermare: da_confermare', async () => {
    const c = await creaCliente('Cliente Da Confermare srl');
    await creaAgenzia(arte, c, '45173', true);
    const l = L({ tipo: 'proforma', fornitore_id: arte.id, codice_cliente: '45173' });
    expect(await esitoCodiceCliente(db, l, null)).toEqual({ stato: 'da_confermare', cliente: 'Cliente Da Confermare srl' });
  });
});

describe('riconosciuto all’apertura (D-175)', () => {
  it('aprendo il dettaglio il fornitore riconosciuto si salva sul documento (elenco coerente)', async () => {
    const arte = await creaFornitore('ARTE WOHNACCESSORIES GMBH & CO.KG');
    const agri = await creaCliente('Agri Aggio SNC di Aggio Mauro & C.');
    await creaAgenzia(arte, agri, '45172');
    await creaPratica(arte, agri, 'AU276839');
    const d = await arrivo({ tipo: 'proforma', campi: [['fornitore', 'ARTE WOHNACCESSOIRES GMBH & CO.KG'], ['numero', 'PR102813'], ['numero_ordine_fornitore', 'AU276839'], ['codice_cliente', '45172']] });
    const r = await op.get('/documenti/' + d.id).expect(200);
    // il dettaglio riconosce fornitore e cliente; il codice è del cliente associato (spunta verde)
    expect(r.body.proposta.esito).toBe('certo');
    expect(r.body.codice_cliente_esito.stato).toBe('corrisponde');
    // …e salva il fornitore: l'elenco ora vede il nome, non «non riconosciuto»
    const dopo = await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: d.id } });
    expect(dopo.fornitore_id).toBe(arte.id);
    expect(dopo.fornitore_versione_id).toBe(arte.versione_id);
    const elenco = await op.get('/documenti?stato=da_controllare').expect(200);
    const riga = (elenco.body.documenti as { id: string; fornitore: string | null }[]).find((x) => x.id === String(d.id));
    expect(riga?.fornitore).toBe('ARTE WOHNACCESSORIES GMBH & CO.KG');
    // il cliente NON si salva come campo a mano: l'abbinamento per numero d'ordine resta nella proposta
    expect(r.body.proposta.abbinamento).toMatchObject({ cliente_id: String(agri.id) });
    expect(await db.documenti_campi.findFirst({ where: { documento_id: d.id, campo: 'cliente_id' } })).toBeNull();
    // l'evento «riconosciuto all'apertura» è nel registro
    expect(await db.registro.count({ where: { entita: 'documento', entita_id: d.id, codice: 'documento.update' } })).toBe(1);
  });

  it('una scelta a mano non si sovrascrive', async () => {
    const arte = await creaFornitore('ARTE WOHNACCESSORIES GMBH & CO.KG');
    const f2 = await creaFornitore('Gasper GmbH');
    const d = await arrivo({ tipo: 'proforma', fornitore_id: f2.id, campi: [['fornitore', 'ARTE WOHNACCESSOIRES GMBH & CO.KG'], ['numero', 'PR102813']] });
    await op.get('/documenti/' + d.id).expect(200);
    expect((await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: d.id } })).fornitore_id).toBe(f2.id);
  });
});

describe('abbinare PR102813 così com’è (D-175)', () => {
  it('scrive la proforma sulla pratica, senza toccare cliente/fornitore/agenzia della pratica', async () => {
    const arte = await creaFornitore('ARTE WOHNACCESSORIES GMBH & CO.KG');
    const agri = await creaCliente('Agri Aggio SNC di Aggio Mauro & C.');
    await creaAgenzia(arte, agri, '45172');
    const pratica = await creaPratica(arte, agri, 'AU276839');
    // PR102813: proforma parziale, fornitore NON ancora riconosciuto (come sui dati veri)
    const d = await arrivo({ tipo: 'proforma', campi: [['numero', 'PR102813'], ['numero_ordine_fornitore', 'AU276839'], ['codice_cliente', '45172'], ['importo_totale', '2117.30']] });
    const r = await op.post('/documenti/' + d.id + '/abbina', { tipo: 'proforma', pratica_id: Number(pratica.id), numero: 'PR102813', data: '2026-03-02', importo: 2117.30 }).expect(201);
    // documento della pratica: proforma, ruolo null (prima proforma, nessuna scelta)
    const doc = await db.ordini_fornitore_documenti.findFirstOrThrow({ where: { arrivo_id: d.id } });
    expect(doc.tipo).toBe('proforma');
    expect(doc.numero).toBe('PR102813');
    expect(Number(doc.importo)).toBe(2117.30);
    expect(doc.testata_id).toBe(pratica.id);
    expect(doc.ruolo).toBeNull();
    // il file in arrivo è abbinato; il fornitore resta non salvato (l'abbinamento non lo scrive)
    const arr = await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: d.id } });
    expect(arr.stato).toBe('abbinato');
    expect(arr.abbinato_pratica_id).toBe(pratica.id);
    expect(arr.fornitore_id).toBeNull();
    // la pratica conserva cliente, fornitore e numero d'ordine: sono quelli giusti (dal primo ordine)
    const p = await db.ordini_fornitore_testata.findUniqueOrThrow({ where: { id: pratica.id } });
    expect(p.cliente_id).toBe(agri.id);
    expect(p.fornitore_id).toBe(arte.id);
    expect(p.numero_ordine_fornitore).toBe('AU276839');
    expect(r.body.pratica.numero).toBe('OF/2026/001');
  });
});
