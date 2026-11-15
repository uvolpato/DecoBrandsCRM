// Prova del riconoscimento «furbo» (15/11/2026, P1): ordine della coda, vocabolario imparato (D-164),
// somiglianza pg_trgm (D-164), codice cliente dopo il fornitore trovato per somiglianza anche con
// agenzia da confermare (D-159), P.IVA dal documento (D-165). Nessuna rete per le funzioni pure;
// supertest per le rotte (ordine della coda, salvataggio P.IVA).
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configura } from '../src/main';
import { cifra } from '../src/password';
import { PrismaService } from '../src/prisma.service';
import { normalizzaNome, propostaDocumento, ricordaAlias, riconosciCliente, risolviFornitore, type Letto } from '../src/proposta';
import { svuota } from './svuota';

let app: NestExpressApplication;
let db: PrismaService;
let n = 0;

const PW = 'password-di-prova';
// dominio senza «@prova-»: svuota (che ripulisce i testi di prova) non deve toccare questo utente,
// che entra una volta sola nel beforeAll e resta collegato per tutte le prove
const DOMINIO = '@furbo-prova.it';

const L = (over: Partial<Letto>): Letto => ({
  tipo: null, fornitore_id: null, fornitore: null, numero: null, data: null, codice_cliente: null, cliente: null, cliente_id: null, piva_cliente: null,
  importo: null, mese: null, anno: null, riferimento_fattura: null, righe: [],
  ...over,
});

async function creaFornitore(nome: string, piva: string | null = null) {
  const f = await db.fornitori.create({ data: {} });
  const v = await db.fornitori_versioni.create({ data: { fornitore_id: f.id, fonte: 'integra', ragione_sociale: nome, piva } });
  await db.fornitori.update({ where: { id: f.id }, data: { versione_corrente_id: v.id } });
  return { id: f.id, versione_id: v.id };
}
async function creaCliente(nome: string, piva: string | null = null) {
  const c = await db.clienti.create({ data: {} });
  const v = await db.clienti_versioni.create({ data: { cliente_id: c.id, fonte: 'integra', ragione_sociale: nome, piva } });
  await db.clienti.update({ where: { id: c.id }, data: { versione_corrente_id: v.id } });
  return { id: c.id, versione_id: v.id };
}

/** Un documento in arrivo con i suoi campi (per le rotte e per lettoDaCampi). */
async function arrivo(opts: { stato?: string; ricevuto_il?: Date; tipo?: string | null; fornitore_id?: bigint | null; campi?: [string, string | null][] } = {}) {
  const versione = opts.fornitore_id != null
    ? (await db.fornitori.findUniqueOrThrow({ where: { id: opts.fornitore_id } })).versione_corrente_id
    : null;
  const r = await db.documenti_in_arrivo.create({
    data: {
      origine: 'email', file_nome: `d${++n}.pdf`, stato: opts.stato ?? 'da_controllare',
      ricevuto_il: opts.ricevuto_il ?? new Date('2026-09-04T10:00:00Z'),
      file_hash: createHash('sha256').update(String(n)).digest('hex'), file_percorso: `in_arrivo/d${n}.pdf`,
      tipo: opts.tipo ?? null, fornitore_id: opts.fornitore_id ?? null, fornitore_versione_id: versione,
    },
  });
  if (opts.campi?.length) {
    await db.documenti_campi.createMany({ data: opts.campi.map(([campo, valore]) => ({ documento_id: r.id, campo, valore_letto: valore })) });
  }
  return r;
}

async function creaUtente(username: string, aree: { area: string; livello: string }[]) {
  await db.utenti.create({
    data: { username, email: username + DOMINIO, nome: 'Prova ' + username, ruolo: 'utente', aree: { create: aree }, password_hash: await cifra(PW), deve_cambiare_password: false },
  });
}
async function entra(utente: string) {
  const agente = request.agent(app.getHttpServer());
  const csrf = (await agente.post('/api/accesso/entra').send({ utente, password: PW }).expect(200)).body.csrf as string;
  return { get: (p: string) => agente.get('/api' + p), post: (p: string, b: object = {}) => agente.post('/api' + p).set('x-csrf-token', csrf).send(b) };
}
let op: Awaited<ReturnType<typeof entra>>;

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
  db = app.get(PrismaService);
  await svuota(db);
  await creaUtente('furbo-op', [{ area: 'provvigioni', livello: 'operatore' }, { area: 'dati', livello: 'operatore' }]);
  op = await entra('furbo-op');
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

describe('ordine della coda (D-164 §19)', () => {
  it('in coda e in lettura vanno dal più vecchio al più recente; il resto resta dal più recente', async () => {
    const vecchio = await arrivo({ stato: 'in_coda', ricevuto_il: new Date('2026-09-01T08:00:00Z') });
    const mezzo = await arrivo({ stato: 'in_lettura', ricevuto_il: new Date('2026-09-02T08:00:00Z') });
    const nuovo = await arrivo({ stato: 'in_coda', ricevuto_il: new Date('2026-09-03T08:00:00Z') });
    const controllato = await arrivo({ stato: 'da_controllare', ricevuto_il: new Date('2026-09-05T08:00:00Z') });
    const r = await op.get('/documenti?stato=aperte').expect(200);
    const ids = (r.body.documenti as { id: string }[]).map((d) => d.id);
    // la coda (in_coda + in_lettura) è in testa, dal più vecchio; il da_controllare resta dopo
    expect(ids.slice(0, 3)).toEqual([String(vecchio.id), String(mezzo.id), String(nuovo.id)]);
    expect(ids[3]).toBe(String(controllato.id));
  });
});

describe('vocabolario imparato (D-164)', () => {
  it('dopo la scelta a mano il documento successivo con lo stesso nome letto si riconosce subito (fornitore)', async () => {
    const f = await creaFornitore('Arte Wohnaccessories GmbH & Co. KG');
    await ricordaAlias(db, 'fornitore', 'ARTE WOHNACCESSOIRES GMBH & CO.KG', f.id, null);
    // una lettera scambiata, ma lo stesso nome normalizzato: vale il vocabolario, non la somiglianza
    expect(await risolviFornitore(db, 'Arte Wohnaccessoires GmbH & Co.KG')).toEqual({ fornitore_id: f.id, fornitore_versione_id: f.versione_id });
  });

  it('cliente scelto a mano: il nome letto si riconosce al documento successivo', async () => {
    const c = await creaCliente('Il Giardino di Sofia srl');
    await ricordaAlias(db, 'cliente', 'GIARDINO SOFIA', c.id, null);
    expect(await riconosciCliente(db, L({ cliente: 'Giardino Sofia' }))).toEqual({ cliente_id: c.id, ragione: 'Il Giardino di Sofia srl' });
  });

  it('un alias che punta a un ruolo senza versione corrente non si usa', async () => {
    const f = await creaFornitore('Vecchio SRL');
    await ricordaAlias(db, 'fornitore', 'vecchio srl', f.id, null);
    await db.fornitori.update({ where: { id: f.id }, data: { versione_corrente_id: null } });
    expect(await risolviFornitore(db, 'Vecchio SRL')).toBeNull();
  });
});

describe('somiglianza pg_trgm (D-164)', () => {
  it('una lettera diversa nel nome: riconosciuto per somiglianza', async () => {
    const f = await creaFornitore('Arte Wohnaccessories GmbH & Co. KG');
    expect(await risolviFornitore(db, 'ARTE WOHNACCESSOIRES GMBH & CO.KG')).toEqual({ fornitore_id: f.id, fornitore_versione_id: f.versione_id });
  });

  it('nome lontano: non riconosciuto', async () => {
    await creaFornitore('Arte Wohnaccessories GmbH & Co. KG');
    expect(await risolviFornitore(db, 'Forniture Metalliche SRL')).toBeNull();
  });

  it('due fornitori simili: mai una scelta a caso, si propongono con il punteggio (da scegliere)', async () => {
    await creaFornitore('Arte Wohnaccessories GmbH & Co. KG');
    await creaFornitore('Arte Wohnaccessoires GmbH & Co. KG');
    const p = await propostaDocumento(db, L({ tipo: 'ordine', fornitore_id: null, fornitore: 'ARTE WOHNACCESSORIES GMBH & CO.KG', numero: 'OF-1' }));
    expect(p.esito).toBe('fornitore_da_scegliere');
    expect(p.candidati_fornitore.length).toBeGreaterThanOrEqual(2);
    expect(p.candidati_fornitore.every((c) => c.fonte === 'crm')).toBe(true);
    expect(p.candidati_fornitore.some((c) => c.punteggio != null)).toBe(true); // il simile porta il punteggio
  });
});

describe('codice cliente dopo il fornitore trovato (D-159)', () => {
  it('il codice cliente riconosce il cliente anche con agenzia da confermare', async () => {
    const f = await creaFornitore('Arte Wohnaccessories GmbH & Co. KG');
    const c = await creaCliente('Verde Vita snc');
    const agente = await db.agenti.create({ data: { codice: 'DECO', nome: 'Decobrands', cognome: 'SRL' } });
    const sub = await db.subagenti.create({ data: { agente_id: agente.id, codice: 'SUB1', nome: 'Mario', cognome: 'Rossi' } });
    await db.interscambio.create({ data: { subagente_id: sub.id, cliente_id: c.id, fornitore_id: f.id, codice_cliente_fornitore: 'K-100', valido_dal: new Date('2025-01-01'), da_confermare: true } });
    const p = await propostaDocumento(db, L({ tipo: 'ordine', fornitore_id: f.id, numero: 'OF-2', codice_cliente: 'K-100' }));
    expect(p.abbinamento).toMatchObject({ cliente_id: c.id, codice: 'K-100' });
  });
});

describe('P.IVA dal documento (D-165)', () => {
  it('fornitore senza P.IVA e documento con P.IVA valida: si salva una versione nuova', async () => {
    const f = await creaFornitore('Arte Wohnaccessories GmbH & Co. KG');
    const d = await arrivo({ tipo: 'ordine', fornitore_id: f.id, campi: [['piva_fornitore', 'IT 01234567890']] });
    const r = await op.post('/documenti/' + d.id + '/piva', { ruolo: 'fornitore' }).expect(200);
    expect(r.body.piva_da_salvare).toEqual([]); // salvata: il suggerimento sparisce
    const corrente = await db.fornitori.findUniqueOrThrow({ where: { id: f.id }, include: { corrente: true } });
    expect(corrente.corrente!.piva).toBe('01234567890');
    expect(await db.registro.count({ where: { codice: 'crud.update', entita: 'fornitore', entita_id: f.id } })).toBe(1);
  });

  it('se il fornitore ha già una P.IVA non si sovrascrive (409)', async () => {
    const f = await creaFornitore('Arte Wohnaccessories GmbH & Co. KG', '99999999999');
    const d = await arrivo({ tipo: 'ordine', fornitore_id: f.id, campi: [['piva_fornitore', '01234567890']] });
    await op.post('/documenti/' + d.id + '/piva', { ruolo: 'fornitore' }).expect(409);
    expect((await db.fornitori.findUniqueOrThrow({ where: { id: f.id }, include: { corrente: true } })).corrente!.piva).toBe('99999999999');
  });

  it('se un altro fornitore ha già quella P.IVA: rifiuto con il nome (409)', async () => {
    await creaFornitore('Altro Fornitore SRL', '01234567890');
    const f = await creaFornitore('Arte Wohnaccessories GmbH & Co. KG');
    const d = await arrivo({ tipo: 'ordine', fornitore_id: f.id, campi: [['piva_fornitore', 'IT 01234567890']] });
    const r = await op.post('/documenti/' + d.id + '/piva', { ruolo: 'fornitore' }).expect(409);
    expect(r.body.message).toContain('Altro Fornitore SRL');
  });

  it('cliente riconosciuto per codice senza P.IVA: si salva', async () => {
    const f = await creaFornitore('Arte Wohnaccessories GmbH & Co. KG');
    const c = await creaCliente('Verde Vita snc');
    const agente = await db.agenti.create({ data: { codice: 'DECO', nome: 'Decobrands', cognome: 'SRL' } });
    const sub = await db.subagenti.create({ data: { agente_id: agente.id, codice: 'SUB1', nome: 'Mario', cognome: 'Rossi' } });
    await db.interscambio.create({ data: { subagente_id: sub.id, cliente_id: c.id, fornitore_id: f.id, codice_cliente_fornitore: 'K-100', valido_dal: new Date('2025-01-01') } });
    const d = await arrivo({ tipo: 'ordine', fornitore_id: f.id, campi: [['codice_cliente', 'K-100'], ['piva_cliente', 'IT 00000000002']] });
    const r = await op.post('/documenti/' + d.id + '/piva', { ruolo: 'cliente' }).expect(200);
    expect(r.body.piva_da_salvare).toEqual([]);
    expect((await db.clienti.findUniqueOrThrow({ where: { id: c.id }, include: { corrente: true } })).corrente!.piva).toBe('00000000002');
  });
});

describe('normalizzaNome (regressione)', () => {
  it('rimuove accenti e punteggiatura', () => {
    expect(normalizzaNome('  Gries  GmbH & Co. KG ')).toBe('gries gmbh co kg');
  });
});
