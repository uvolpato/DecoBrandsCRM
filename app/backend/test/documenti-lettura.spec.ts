// Prova delle rotte della pagina Documenti (F6-A4a, §7.9, §8.1, D-72): elenco con i conteggi dei
// segmenti, dettaglio dai valori finali, correzione guidata e scarto. Come le altre prove: Nest +
// supertest, utenti veri, documenti creati qui.
import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { createHash } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configura } from '../src/main';
import { cifra } from '../src/password';
import { PrismaService } from '../src/prisma.service';
import { apriAnomalia } from '../src/registro';
import { svuota } from './svuota';

let app: NestExpressApplication;
let db: PrismaService;
const DOMINIO = '@prova-documenti-lettura.it';
const PW = 'password-di-prova';

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
    put: (p: string, b: object) => agente.put('/api' + p).set('x-csrf-token', csrf).send(b),
    post: (p: string, b: object = {}) => agente.post('/api' + p).set('x-csrf-token', csrf).send(b),
  };
}

/* ---------- Dati di prova: fornitore, cliente e pratica freschi, come in proposta.spec ---------- */
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

let forn: Awaited<ReturnType<typeof creaFornitore>>;
let cli: Awaited<ReturnType<typeof creaCliente>>;
let pratica: bigint;
let oper: Awaited<ReturnType<typeof entra>>;
let lett: Awaited<ReturnType<typeof entra>>;
let utenteId: bigint;
let n = 0;

interface CampoProva {
  campo: string;
  letto: string | null;
  finale?: string | null;
  aff?: number | null;
  posizione?: unknown;
  verificato?: boolean;
}
async function creaDoc(o: {
  nome?: string; percorso?: string; stato?: string; tipo?: string | null; fornitore_id?: bigint | null;
  ricevuto?: string; livello?: string | null; campi?: CampoProva[]; controlli?: unknown;
}) {
  const versione = o.fornitore_id != null
    ? (await db.fornitori.findUniqueOrThrow({ where: { id: o.fornitore_id } })).versione_corrente_id
    : null;
  const k = ++n;
  const d = await db.documenti_in_arrivo.create({
    data: {
      origine: 'email', file_nome: o.nome ?? `doc-${k}.pdf`, stato: o.stato ?? 'da_controllare',
      file_hash: createHash('sha256').update('doc-' + k).digest('hex'),
      file_percorso: o.percorso ?? `in_arrivo/2026/20260901/doc-${k}.pdf`,
      tipo: o.tipo ?? null, fornitore_id: o.fornitore_id ?? null, fornitore_versione_id: versione,
      ricevuto_il: new Date(o.ricevuto ?? '2026-09-01T10:00:00Z'),
      livello: o.livello ?? null, controlli: o.controlli as never,
    },
  });
  for (const c of o.campi ?? []) {
    await db.documenti_campi.create({
      data: {
        documento_id: d.id, campo: c.campo, valore_letto: c.letto, valore_finale: c.finale ?? null,
        affidabilita: c.aff ?? null, posizione: c.posizione == null ? undefined : (c.posizione as object),
        precisione: c.posizione ? 'esatta' : 'assente', verificato: c.verificato ?? false,
      },
    });
  }
  return d.id;
}

let docA: bigint;
let docB: bigint;
let docC: bigint;
let docD: bigint;
let docE: bigint;

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
  db = app.get(PrismaService);
  // niente seed: i documenti del seed sporcherebbero i conteggi dei segmenti; i dati che servono
  // (fornitore, cliente, pratica) si creano qui, come in proposta.spec
  await svuota(db);
  await creaUtente('op-doc-lettura', 'operatore');
  await creaUtente('lett-doc-lettura', 'lettura');
  [oper, lett] = await Promise.all([entra('op-doc-lettura'), entra('lett-doc-lettura')]);
  utenteId = (await db.utenti.findUniqueOrThrow({ where: { username: 'op-doc-lettura' } })).id;

  forn = await creaFornitore('Gries Prova GmbH');
  cli = await creaCliente('Verde Prova snc', 'IT00000000091');
  const agente = await db.agenti.create({ data: { codice: 'DECO-PROVA', nome: 'Decobrands', cognome: 'SRL' } });
  const sub = await db.subagenti.create({ data: { agente_id: agente.id, codice: 'SUB-PROVA', nome: 'Mario', cognome: 'Rossi' } });
  await db.interscambio.create({
    data: { subagente_id: sub.id, cliente_id: cli.id, fornitore_id: forn.id, codice_cliente_fornitore: 'K-100', valido_dal: new Date('2025-01-01') },
  });
  const t = await db.ordini_fornitore_testata.create({
    data: {
      fornitore_id: forn.id, fornitore_versione_id: forn.versione_id,
      cliente_id: cli.id, cliente_versione_id: cli.versione_id,
      numero_ordine: 'OF/2026/900', data_ordine: new Date('2026-08-01'), importo_merce: 100,
    },
  });
  pratica = t.id;
  await db.ordini_fornitore_righe.createMany({
    data: [
      { testata_id: t.id, fase: 'ordine', numero_riga: 1, codice: 'A1', quantita: 2, prezzo_unitario: 50, importo: 100 },
      { testata_id: t.id, fase: 'ordine', numero_riga: 2, codice: 'A3', quantita: 1, prezzo_unitario: 10, importo: 10 },
    ],
  });

  // A: da controllare, con un valore finale che vince sul letto e una riga
  docA = await creaDoc({
    nome: 'fattura-a.pdf', percorso: 'in_arrivo/2026/20260903/fattura-a.pdf', tipo: 'fattura', fornitore_id: forn.id,
    ricevuto: '2026-09-03T10:00:00Z', livello: 'bassa',
    controlli: { falliti: [{ codice: 'totale', campo: 'totale', testo: 'x', grave: true }, { codice: 'riga', campo: 'righe[0]', testo: 'y', grave: false }] },
    campi: [
      { campo: 'numero', letto: 'OLD-1', finale: 'FIN-1', aff: 0.8, posizione: { tipo: 'pdf', pagina: 1, x0: 0.1, y0: 0.1, x1: 0.2, y1: 0.2 } },
      { campo: 'data', letto: '2026-09-03', aff: 0.95 },
      { campo: 'codice_cliente', letto: 'K-100', aff: 0.95 },
      { campo: 'cliente', letto: 'Alfa', aff: 0.9 },
      { campo: 'importo_totale', letto: '100', aff: 0.95 },
      { campo: 'righe[0].codice', letto: 'A1', aff: 0.99 },
      { campo: 'righe[0].descrizione', letto: 'Vaso', aff: 0.9 },
      { campo: 'righe[0].quantita', letto: '2', aff: 0.95 },
      { campo: 'righe[0].prezzo', letto: '50', aff: 0.95 },
      { campo: 'righe[0].importo', letto: '100', aff: 0.95 },
    ],
  });
  docB = await creaDoc({ nome: 'conferma-b.jpg', percorso: 'in_arrivo/2026/20260902/conferma-b.jpg', tipo: 'conferma', ricevuto: '2026-09-02T10:00:00Z', campi: [{ campo: 'numero', letto: 'OLD-2', aff: 0.95 }] });
  docC = await creaDoc({ nome: 'foto-c.png', percorso: 'in_arrivo/2026/20260904/foto-c.png', stato: 'in_coda', ricevuto: '2026-09-04T10:00:00Z' });
  docD = await creaDoc({ stato: 'errore', ricevuto: '2026-09-01T10:00:00Z' });
  docE = await creaDoc({ stato: 'in_lettura', ricevuto: '2026-09-05T10:00:00Z' });
}, 120_000);

afterAll(async () => {
  await svuota(db);
  await app.close();
});

describe('GET /api/documenti — elenco', () => {
  it('solo lo stato chiesto, dal più recente, con i conteggi di tutti gli stati', async () => {
    const r = await oper.get('/documenti').expect(200);
    expect(r.body.documenti.map((d: { id: string }) => d.id)).toEqual([String(docA), String(docB)]);
    expect(r.body.conteggi).toEqual({ da_controllare: 2, in_coda: 1, in_lettura: 1, errore: 1 });
    expect(r.body).toMatchObject({ totale: 2, pagina: 1, per_pagina: 25 });
  });

  it('valori dal finale quando c\'è, altrimenti dal letto; tipo del file dall\'estensione', async () => {
    const a = (await oper.get('/documenti').expect(200)).body.documenti[0];
    expect(a).toMatchObject({
      file_nome: 'fattura-a.pdf', file_tipo: 'pdf', tipo: 'fattura', numero: 'FIN-1', data: '2026-09-03',
      fornitore_id: String(forn.id), fornitore: 'Gries Prova GmbH', codice_cliente: 'K-100', cliente: 'Alfa',
      importo: 100, livello: 'bassa', controlli_n: 2,
    });
    expect(a.letto_il).toBeNull();
    const b = (await oper.get('/documenti?q=OLD-2').expect(200)).body.documenti[0];
    expect(b).toMatchObject({ numero: 'OLD-2', file_tipo: 'jpg' });
    expect((await oper.get('/documenti?stato=in_coda').expect(200)).body.documenti[0].file_tipo).toBe('png');
  });

  it('ricerca: numero, file, fornitore, cliente; % e _ sono lettere', async () => {
    const cerca = async (q: string) => (await oper.get('/documenti?q=' + encodeURIComponent(q)).expect(200)).body.documenti.map((d: { id: string }) => d.id);
    expect(await cerca('FIN')).toEqual([String(docA)]);
    expect(await cerca('OLD-1')).toEqual([]); // il valore finale vince sul letto
    expect(await cerca('fattura-a')).toEqual([String(docA)]);
    expect(await cerca('Prova GmbH')).toEqual([String(docA)]);
    expect(await cerca('Alfa')).toEqual([String(docA)]);
    expect(await cerca('%')).toEqual([]);
    expect(await cerca('_')).toEqual([]);
  });

  it('filtri tipo e livello; i conteggi contano gli altri filtri', async () => {
    const r = await oper.get('/documenti?tipo=fattura').expect(200);
    expect(r.body.documenti.map((d: { id: string }) => d.id)).toEqual([String(docA)]);
    expect(r.body.conteggi).toEqual({ da_controllare: 1, in_coda: 0, in_lettura: 0, errore: 0 });
    expect(r.body.totale).toBe(1);
    expect((await oper.get('/documenti?livello=bassa').expect(200)).body.documenti.map((d: { id: string }) => d.id)).toEqual([String(docA)]);
    expect((await oper.get('/documenti?tipo=conferma').expect(200)).body.conteggi.da_controllare).toBe(1);
  });

  it('paginazione sul server', async () => {
    const r = await oper.get('/documenti?per_pagina=1&pagina=2').expect(200);
    expect(r.body).toMatchObject({ totale: 2, pagina: 2, per_pagina: 1 });
    expect(r.body.documenti.map((d: { id: string }) => d.id)).toEqual([String(docB)]);
  });

  it('stato e pagina non validi: 400', async () => {
    await oper.get('/documenti?stato=abbinato').expect(400);
    await oper.get('/documenti?pagina=0').expect(400);
    await oper.get('/documenti?tipo=boh').expect(400);
  });
});

describe('GET /api/documenti/:id — dettaglio', () => {
  it('404 se non c\'è', async () => {
    await oper.get('/documenti/999999999').expect(404);
  });

  it('campi, testata e righe dai valori finali, controlli e proposta', async () => {
    const r = await oper.get(`/documenti/${docA}`).expect(200);
    expect(r.body).toMatchObject({
      id: String(docA), file_nome: 'fattura-a.pdf', file_tipo: 'pdf', stato: 'da_controllare', tipo: 'fattura', livello: 'bassa',
      fornitore: { id: String(forn.id), nome: 'Gries Prova GmbH' },
    });
    expect(r.body.testata).toMatchObject({
      tipo: 'fattura', numero: 'FIN-1', data: '2026-09-03', fornitore_id: String(forn.id),
      codice_cliente: 'K-100', cliente: 'Alfa', importo: 100, mese: null, anno: null, riferimento_fattura: null,
    });
    expect(r.body.righe).toHaveLength(1);
    expect(r.body.righe[0]).toMatchObject({ i: 0, codice: 'A1', descrizione: 'Vaso', quantita: 2, prezzo: 50, importo: 100 });
    const numero = r.body.campi.find((c: { campo: string }) => c.campo === 'numero');
    expect(numero).toMatchObject({ valore_letto: 'OLD-1', valore_finale: 'FIN-1', affidabilita: 0.8, verificato: false });
    expect(numero.posizione).toMatchObject({ tipo: 'pdf', pagina: 1 });
    expect(r.body.controlli).toHaveLength(2);
    expect(r.body.proposta.abbinamento).toMatchObject({ cliente_id: String(cli.id), codice: 'K-100' });
    expect(r.body.proposta.candidati[0].pratica.id).toBe(String(pratica));
    expect(r.body.bollettino).toBeNull();
  });

  it('bollettino: proposta con esito e importo, e se è già registrato', async () => {
    let mese = 1;
    while (await db.bollettini_testata.findFirst({ where: { fornitore_id: forn.id, mese, anno: 2026 } })) mese++;
    const id = await creaDoc({
      tipo: 'bollettino', fornitore_id: forn.id, campi: [
        { campo: 'mese', letto: String(mese), aff: 0.95 }, { campo: 'anno', letto: '2026', aff: 0.95 },
        { campo: 'righe[0].numero_fattura', letto: 'F-1', aff: 0.95 }, { campo: 'righe[0].importo', letto: '10', aff: 0.95 },
        { campo: 'righe[0].provvigione', letto: '1', aff: 0.95 }, // §7.9: il totale riconosciuto è la provvigione (D-71)
      ],
    });
    let r = await oper.get(`/documenti/${id}`).expect(200);
    expect(r.body.bollettino).toEqual({ esiste: false });
    expect(r.body.proposta).toMatchObject({ esito: 'bollettino', importo: 1 }); // la provvigione, non l'imponibile
    await db.bollettini_testata.create({
      data: { fornitore_id: forn.id, fornitore_versione_id: forn.versione_id, mese, anno: 2026 },
    });
    r = await oper.get(`/documenti/${id}`).expect(200);
    expect(r.body.bollettino).toEqual({ esiste: true });
    expect(r.body.proposta.esito).toBe('doppio');
  });
});

describe('PUT /api/documenti/:id — correzione dei dati letti', () => {
  it('salva il finale e verifica, conserva il letto; aggiunge e toglie righe rinumerando; evento e livello', async () => {
    const id = await creaDoc({
      tipo: 'fattura', fornitore_id: forn.id, campi: [
        { campo: 'numero', letto: 'F-1', aff: 0.5, posizione: { tipo: 'pdf', pagina: 1 } },
        { campo: 'data', letto: '2026-09-01', aff: 0.95 },
        { campo: 'importo_totale', letto: '50', aff: 0.95 },
        { campo: 'righe[0].codice', letto: 'A1', aff: 0.99, posizione: { tipo: 'pdf', pagina: 1 } },
        { campo: 'righe[0].quantita', letto: '2', aff: 0.95 },
        { campo: 'righe[0].prezzo', letto: '50', aff: 0.95 },
        { campo: 'righe[0].importo', letto: '100', aff: 0.95 },
        { campo: 'righe[1].codice', letto: 'A2', aff: 0.99 },
        { campo: 'righe[1].quantita', letto: '1', aff: 0.95 },
        { campo: 'righe[1].prezzo', letto: '10', aff: 0.95 },
        { campo: 'righe[1].importo', letto: '10', aff: 0.95 },
      ],
    });
    const r = await oper.put(`/documenti/${id}`, {
      testata: {
        tipo: 'fattura', numero: 'F-1-CORRETTO', data: '2026-09-01', fornitore_id: Number(forn.id),
        codice_cliente: '', cliente: '', importo: 110, mese: null, anno: null, riferimento_fattura: null,
      },
      righe: [
        { i: 0, codice: 'A1', descrizione: 'Vaso', quantita: 2, prezzo: 50, importo: 100 },
        { i: null, codice: 'A3', descrizione: 'Vaso nuovo', quantita: 1, prezzo: 10, importo: 10 },
      ],
    }).expect(200);

    expect(r.body.testata.numero).toBe('F-1-CORRETTO');
    expect(r.body.testata.importo).toBe(110);
    expect(r.body.righe.map((x: { codice: string | null }) => x.codice)).toEqual(['A1', 'A3']);

    const campi = await db.documenti_campi.findMany({ where: { documento_id: id }, orderBy: { id: 'asc' } });
    const numero = campi.find((c) => c.campo === 'numero')!;
    expect(numero).toMatchObject({ valore_letto: 'F-1', valore_finale: 'F-1-CORRETTO', verificato: true });
    expect(numero.corretto_da).toBe(utenteId);
    expect(numero.corretto_il).not.toBeNull();
    // riga 0: metadati conservati; riga 1: quella vecchia sostituita e rinumerata, nasce verificata
    const codice0 = campi.find((c) => c.campo === 'righe[0].codice')!;
    expect(codice0).toMatchObject({ valore_letto: 'A1', valore_finale: 'A1', verificato: true });
    expect(Number(codice0.affidabilita)).toBe(0.99);
    expect(codice0.posizione).toMatchObject({ tipo: 'pdf', pagina: 1 });
    const codice1 = campi.find((c) => c.campo === 'righe[1].codice')!;
    expect(codice1).toMatchObject({ valore_letto: null, valore_finale: 'A3', verificato: true });
    expect(codice1.precisione).toBe('assente');
    expect(campi.some((c) => c.campo.startsWith('righe[2].'))).toBe(false);
    expect(campi.some((c) => c.campo === 'righe[1].prezzo' && c.valore_letto === '10')).toBe(false);

    // evento: numero, importo e descrizione cambiati, più la riga nuova
    const ev = await db.registro.findFirstOrThrow({ where: { codice: 'documento.update', entita_id: id } });
    expect(ev.dettaglio).toMatchObject({ documento_id: String(id), campi_corretti: 4, livello_prima: null, livello_dopo: 'affidabile' });
  });

  it('un campo a 0,5 corretto porta il livello ad affidabile', async () => {
    const id = await creaDoc({ tipo: 'fattura', campi: [{ campo: 'numero', letto: 'F-2', aff: 0.5 }] });
    const r = await oper.put(`/documenti/${id}`, { testata: { tipo: 'fattura', numero: 'F-2' }, righe: [] }).expect(200);
    expect(r.body.livello).toBe('affidabile');
    expect((await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id } })).livello).toBe('affidabile');
  });

  it('un totale sbagliato porta a bassa; corretto il totale torna affidabile', async () => {
    const id = await creaDoc({
      tipo: 'fattura', campi: [
        { campo: 'importo_totale', letto: '100', aff: 0.95 },
        { campo: 'righe[0].codice', letto: 'A1', aff: 0.95 },
        { campo: 'righe[0].quantita', letto: '1', aff: 0.95 },
        { campo: 'righe[0].prezzo', letto: '50', aff: 0.95 },
        { campo: 'righe[0].importo', letto: '50', aff: 0.95 },
      ],
    });
    const righe = [{ i: 0, codice: 'A1', descrizione: null, quantita: 1, prezzo: 50, importo: 50 }];
    let r = await oper.put(`/documenti/${id}`, { testata: { tipo: 'fattura', importo: 100 }, righe }).expect(200);
    expect(r.body.livello).toBe('bassa');
    expect(r.body.controlli.some((c: { codice: string }) => c.codice === 'totale')).toBe(true);
    r = await oper.put(`/documenti/${id}`, { testata: { tipo: 'fattura', importo: 50 }, righe }).expect(200);
    expect(r.body.livello).toBe('affidabile');
    expect(r.body.controlli).toEqual([]);
  });

  it('409 se lo stato non è da_controllare; 400 per tipo, fornitore e data non validi', async () => {
    const coda = await creaDoc({ stato: 'in_coda' });
    await oper.put(`/documenti/${coda}`, { testata: { tipo: 'fattura' }, righe: [] }).expect(409);

    const id = await creaDoc({ tipo: 'fattura' });
    await oper.put(`/documenti/${id}`, { testata: { tipo: 'boh' }, righe: [] }).expect(400);
    const f = await oper.put(`/documenti/${id}`, { testata: { tipo: 'fattura', fornitore_id: 999999 }, righe: [] }).expect(400);
    expect(f.body.message).toMatch(/Fornitore/);
    const d = await oper.put(`/documenti/${id}`, { testata: { tipo: 'fattura', data: '2026-02-31' }, righe: [] }).expect(400);
    expect(d.body.message).toMatch(/Data/);
    // nessuna scrittura parziale rimasta dalle richieste fallite
    expect((await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id } })).tipo).toBe('fattura');
  });

  it('404 se il documento non c\'è', async () => {
    await oper.put('/documenti/999999999', { testata: { tipo: 'fattura' }, righe: [] }).expect(404);
  });
});

describe('POST /api/documenti/:id/scarta', () => {
  it('scrive stato e campi dello scarto e l\'evento; il file resta sul disco', async () => {
    const id = await creaDoc({ tipo: 'fattura', nome: 'da-scartare.pdf' });
    // un documento non letto ha l'anomalia aperta: scartandolo si chiude (§7.14.3)
    await apriAnomalia(db, { servizio: 'lettura', codice: 'lettura.fallita', chiave: String(id), messaggio: 'non si legge' });
    await oper.post(`/documenti/${id}/scarta`, { motivo: 'Doppione', nota: ' già registrato ' }).expect(204);
    const d = await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id } });
    expect(d).toMatchObject({ stato: 'scartato', motivo_scarto: 'Doppione', nota_scarto: 'già registrato', scartato_da: utenteId });
    expect(d.scartato_il).not.toBeNull();
    expect(await db.registro.count({ where: { codice: 'lettura.fallita', chiave: String(id), stato: 'aperta' } })).toBe(0);
    const ev = await db.registro.findFirstOrThrow({ where: { codice: 'documento.update', entita_id: id } });
    expect(ev.dettaglio).toMatchObject({ stato: 'scartato', motivo: 'Doppione', nota: 'già registrato' });
  });

  it('409 se già abbinato; 404 se non c\'è', async () => {
    const id = await creaDoc({ stato: 'abbinato' });
    await oper.post(`/documenti/${id}/scarta`, { motivo: 'Altro' }).expect(409);
    await oper.post('/documenti/999999999/scarta', { motivo: 'Altro' }).expect(404);
  });

  it('motivo non ammesso o nota troppo lunga: 400', async () => {
    const id = await creaDoc({});
    await oper.post(`/documenti/${id}/scarta`, { motivo: 'Boh' }).expect(400);
    await oper.post(`/documenti/${id}/scarta`, { motivo: 'Altro', nota: 'x'.repeat(2001) }).expect(400);
  });
});

describe('permessi', () => {
  it('la sola lettura consulta elenco e dettaglio ma non corregge né scarta', async () => {
    await lett.get('/documenti').expect(200);
    await lett.get(`/documenti/${docA}`).expect(200);
    await lett.put(`/documenti/${docA}`, { testata: { tipo: 'fattura' }, righe: [] }).expect(403);
    await lett.post(`/documenti/${docA}/scarta`, { motivo: 'Altro' }).expect(403);
  });
});
