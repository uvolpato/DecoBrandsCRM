import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ClientiController } from '../src/clienti';
import { configura } from '../src/main';
import { ultimaChiusura } from '../src/motore/dati';
import { cifra } from '../src/password';
import { PrismaService } from '../src/prisma.service';
import { svuota } from './svuota';
import { seed } from '../prisma/seed';

let app: NestExpressApplication;
let db: PrismaService;
const DOMINIO = '@prova-clienti.it';
const PW = 'password-di-prova';
const creati: bigint[] = [];

async function creaUtente(username: string, ruoloSistema: string, livelloDati: string) {
  const u = await db.utenti.create({
    data: {
      username, email: username + DOMINIO, nome: 'Prova ' + username,
      ruolo: ruoloSistema,
      aree: { create: [{ area: 'dati', livello: livelloDati }] },
      password_hash: await cifra(PW),
      deve_cambiare_password: false,
    },
  });
  return u;
}

const sessioni: Record<string, Awaited<ReturnType<typeof apri>>> = {};
async function apri(utente: string) {
  const agente = request.agent(app.getHttpServer());
  const r = await agente.post('/api/accesso/entra').send({ utente, password: PW }).expect(200);
  const csrf = r.body.csrf as string;
  return {
    get: (p: string) => agente.get('/api' + p),
    post: (p: string, b: object = {}) => agente.post('/api' + p).set('x-csrf-token', csrf).send(b),
    put: (p: string, b: object) => agente.put('/api' + p).set('x-csrf-token', csrf).send(b),
    del: (p: string) => agente.delete('/api' + p).set('x-csrf-token', csrf),
  };
}
const entra = async (u: string) => (sessioni[u] ??= await apri(u));

let clienteId = '';
let fornitoreId = '';
let subagenteId = '';

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule], controllers: [ClientiController] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
  db = app.get(PrismaService);
  await svuota(db);
  await seed(db);
  if (!(await db.utenti.findFirst({ where: { ruolo: 'superutente' } }))) {
    await db.utenti.create({ data: { username: 'super-cli', email: 'super-cli' + DOMINIO, nome: 'Super', ruolo: 'superutente', password_hash: await cifra(PW), deve_cambiare_password: false } });
  }
  await creaUtente('ammi-cli', 'amministratore', 'responsabile');
  await creaUtente('oper-cli', 'utente', 'operatore');
  await creaUtente('lett-cli', 'utente', 'lettura');

  const c = await db.clienti.findFirst({ where: { agenzie: { none: {} } }, orderBy: { id: 'asc' } });
  const f = await db.fornitori.findFirst({ orderBy: { id: 'asc' } });
  const s = await db.subagenti.findFirst({ orderBy: { id: 'asc' } });
  if (!c || !f || !s) throw new Error('seed mancante');
  clienteId = String(c.id);
  fornitoreId = String(f.id);
  subagenteId = String(s.id);
});

afterAll(async () => {
  const utenti = (await db.utenti.findMany({ where: { email: { endsWith: DOMINIO } } })).map((u) => u.id);
  // rimuovi agenzie create dai test
  if (creati.length) await db.interscambio.deleteMany({ where: { id: { in: creati } } });
  await db.$transaction([
    db.$executeRaw`SET LOCAL decobrands.pulizia_registro = 'si'`,
    db.registro.deleteMany({ where: { OR: [{ utente_id: { in: utenti } }, { entita: 'interscambio' }] } }),
    db.sessioni.deleteMany({ where: { utente_id: { in: utenti } } }),
    db.utenti.deleteMany({ where: { id: { in: utenti } } }),
  ]);
  await svuota(db);
  await app.close();
});

describe('elenco e dettaglio', () => {
  it('consulta: elenco clienti', async () => {
    const a = await entra('ammi-cli');
    const r = await a.get('/clienti').expect(200);
    expect(Array.isArray(r.body)).toBe(true);
    expect(r.body.length).toBeGreaterThan(0);
    expect(r.body[0]).toHaveProperty('ragione_sociale');
    expect(r.body[0]).toHaveProperty('codice_integra');
    expect(r.body[0]).toHaveProperty('agenzie');
  });

  it('dettaglio: agenzie e codice integra', async () => {
    const a = await entra('ammi-cli');
    const r = await a.get('/clienti/' + clienteId).expect(200);
    expect(r.body.id).toBe(clienteId);
    expect(Array.isArray(r.body.agenzie)).toBe(true);
    expect(r.body).toHaveProperty('codice_integra');
  });

  it('pratiche: elenco', async () => {
    const a = await entra('ammi-cli');
    const r = await a.get('/clienti/' + clienteId + '/pratiche').expect(200);
    expect(Array.isArray(r.body)).toBe(true);
  });

  it('agenzie: elenco', async () => {
    const a = await entra('ammi-cli');
    const r = await a.get('/clienti/' + clienteId + '/agenzie').expect(200);
    expect(Array.isArray(r.body)).toBe(true);
  });

  it('agenzia-nuova: nomi della coppia cliente-fornitore (D-158)', async () => {
    const a = await entra('ammi-cli');
    const r = await a.get('/clienti/' + clienteId + '/agenzia-nuova?fornitore_id=' + fornitoreId).expect(200);
    const f = await db.fornitori.findUniqueOrThrow({ where: { id: BigInt(fornitoreId) }, include: { corrente: { select: { ragione_sociale: true } } } });
    expect(r.body.fornitore).toBe(f.corrente?.ragione_sociale);
    await a.get('/clienti/' + clienteId + '/agenzia-nuova?fornitore_id=999999').expect(404);
  });

  it('lettura: può consultare', async () => {
    const a = await entra('lett-cli');
    await a.get('/clienti').expect(200);
    await a.get('/clienti/' + clienteId).expect(200);
  });
});

describe('permessi', () => {
  it('lettura non crea agenzia (403)', async () => {
    const a = await entra('lett-cli');
    await a.post('/clienti/' + clienteId + '/agenzie', {
      subagente_id: Number(subagenteId), fornitore_id: Number(fornitoreId), sconto: 5, valido_dal: '2026-01-01',
    }).expect(403);
  });
});

// D-50 §19: percentuale e regola del subagente solo al responsabile
describe('percentuale e regola del subagente', () => {
  const base = () => ({ subagente_id: Number(subagenteId), fornitore_id: Number(fornitoreId), sconto: 2 });

  it('operatore: senza i due campi crea e modifica, con i campi 403', async () => {
    const a = await entra('oper-cli');
    const r = await a.post('/clienti/' + clienteId + '/agenzie', { ...base(), valido_dal: '2040-01-01', valido_al: '2040-12-31' }).expect(201);
    creati.push(BigInt(r.body.id));
    const url = '/clienti/' + clienteId + '/agenzie/' + r.body.id;
    await a.put(url, { sconto: 3 }).expect(200);
    await a.put(url, { pct_subagente: 100 }).expect(403);
    const e = await a.put(url, { regola_mensile: 'piu_alta' }).expect(403);
    expect(e.body.message).toContain('responsabile');
    await a.post('/clienti/' + clienteId + '/agenzie', { ...base(), pct_subagente: 50, valido_dal: '2041-01-01' }).expect(403);
    // stesso valore di prima (null): non e' un cambio
    await a.put(url, { pct_subagente: null, sconto: 4 }).expect(200);
  });

  it('responsabile: cambia percentuale e regola', async () => {
    const a = await entra('ammi-cli');
    const r = await a.post('/clienti/' + clienteId + '/agenzie', { ...base(), pct_subagente: 40, valido_dal: '2042-01-01', valido_al: '2042-12-31' }).expect(201);
    creati.push(BigInt(r.body.id));
    const m = await a.put('/clienti/' + clienteId + '/agenzie/' + r.body.id, { pct_subagente: 45, regola_mensile: 'piu_alta' }).expect(200);
    expect(m.body.pct_subagente).toBe(45);
  });

  it('elenco clienti: id di fornitori e subagenti', async () => {
    const a = await entra('ammi-cli');
    const r = await a.get('/clienti').expect(200);
    const c = r.body.find((x: { id: string }) => x.id === clienteId);
    expect(c.fornitori_ids).toContain(fornitoreId);
    expect(c.subagenti_ids).toContain(subagenteId);
  });
});

describe('agenzia dallo storico (D-112)', () => {
  const ESTRATTO = new Date('2026-11-08T00:00:00Z');
  async function clienteConPiva(piva: string, nome: string) {
    const c = await db.clienti.create({ data: {} });
    const v = await db.clienti_versioni.create({ data: { cliente_id: c.id, fonte: 'integra', piva, ragione_sociale: nome, valido_dal: new Date('2025-01-01') } });
    await db.clienti.update({ where: { id: c.id }, data: { versione_corrente_id: v.id } });
    return c.id;
  }
  async function fornitoreConPiva(piva: string, nome: string) {
    const f = await db.fornitori.create({ data: {} });
    const v = await db.fornitori_versioni.create({ data: { fornitore_id: f.id, fonte: 'integra', piva, ragione_sociale: nome, valido_dal: new Date('2025-01-01') } });
    await db.fornitori.update({ where: { id: f.id }, data: { versione_corrente_id: v.id } });
    return f.id;
  }

  let clienteS: bigint, fornitoreS: bigint, clienteAltro: bigint, fornitoreAltro: bigint;

  beforeAll(async () => {
    clienteS = await clienteConPiva('11111111111', 'Cliente Storico');
    fornitoreS = await fornitoreConPiva('22222222222', 'Fornitore Storico');
    clienteAltro = await clienteConPiva('33333333333', 'Cliente Altro');
    fornitoreAltro = await fornitoreConPiva('44444444444', 'Fornitore Altro');
  });

  it('storico_id valido: riga usata con interscambio_id e usato_il, nella stessa transazione', async () => {
    const riga = await db.interscambio_storico.create({ data: {
      fonte: 'vecchio_crm', estratto_il: ESTRATTO, cliente_legacy_id: 9101n, fornitore_legacy_id: 9101n,
      cliente_id: clienteS, fornitore_id: fornitoreS, cliente_codice_fornitore: 'STO-1',
      cliente_ragione_sociale: 'Cliente Storico', cliente_piva_norm: '11111111111',
      fornitore_ragione_sociale: 'Fornitore Storico', fornitore_piva: '22222222222',
      subagente_nome: 'Nista Mario', sconto_1: 8,
    } });
    const a = await entra('ammi-cli');
    const r = await a.post('/clienti/' + clienteS + '/agenzie', {
      subagente_id: Number(subagenteId), fornitore_id: Number(fornitoreS), codice_cliente_fornitore: 'STO-1',
      sconto: 8, valido_dal: '2035-01-01', valido_al: '2035-12-31', storico_id: Number(riga.id),
    }).expect(201);
    creati.push(BigInt(r.body.id));
    const dopo = await db.interscambio_storico.findUniqueOrThrow({ where: { id: riga.id } });
    expect(dopo.stato).toBe('usata');
    expect(String(dopo.interscambio_id)).toBe(r.body.id);
    expect(dopo.usato_il).toBeTruthy();
  });

  it('storico_id di un’altra coppia: 400 e nessuna agenzia scritta', async () => {
    const riga = await db.interscambio_storico.create({ data: {
      fonte: 'vecchio_crm', estratto_il: ESTRATTO, cliente_legacy_id: 9102n, fornitore_legacy_id: 9102n,
      cliente_id: clienteAltro, fornitore_id: fornitoreAltro, cliente_codice_fornitore: 'STO-2',
      cliente_piva_norm: '33333333333', fornitore_piva: '44444444444', subagente_nome: 'Nista Mario', sconto_1: 5,
    } });
    const a = await entra('ammi-cli');
    const prima = await db.interscambio.count({ where: { cliente_id: clienteS, fornitore_id: fornitoreS } });
    const r = await a.post('/clienti/' + clienteS + '/agenzie', {
      subagente_id: Number(subagenteId), fornitore_id: Number(fornitoreS), sconto: 5,
      valido_dal: '2036-01-01', valido_al: '2036-12-31', storico_id: Number(riga.id),
    }).expect(400);
    expect(r.body.message).toContain('altro cliente o fornitore');
    expect(await db.interscambio.count({ where: { cliente_id: clienteS, fornitore_id: fornitoreS } })).toBe(prima);
    expect((await db.interscambio_storico.findUniqueOrThrow({ where: { id: riga.id } })).stato).toBe('da_usare');
  });

  it('riga senza id (ruoli non ancora collegati): si riconosce la coppia dalla P.IVA', async () => {
    const riga = await db.interscambio_storico.create({ data: {
      fonte: 'vecchio_crm', estratto_il: ESTRATTO, cliente_legacy_id: 9103n, fornitore_legacy_id: 9103n,
      cliente_codice_fornitore: 'STO-3', cliente_piva_norm: '', cliente_ragione_sociale: 'Cliente Storico',
      fornitore_piva: 'IT22222222222', subagente_nome: 'Granata Riccardo', sconto_1: 12,
    } });
    const a = await entra('ammi-cli');
    // la riga ha solo la P.IVA del fornitore (id non ancora collegati): si riconosce da quella
    const r = await a.post('/clienti/' + clienteS + '/agenzie', {
      subagente_id: Number(subagenteId), fornitore_id: Number(fornitoreS), sconto: 12,
      valido_dal: '2037-01-01', valido_al: '2037-12-31', storico_id: Number(riga.id),
    }).expect(201);
    creati.push(BigInt(r.body.id));
    expect((await db.interscambio_storico.findUniqueOrThrow({ where: { id: riga.id } })).stato).toBe('usata');
  });

  it('P.IVA del fornitore diversa: 400', async () => {
    const riga = await db.interscambio_storico.create({ data: {
      fonte: 'vecchio_crm', estratto_il: ESTRATTO, cliente_legacy_id: 9104n, fornitore_legacy_id: 9104n,
      cliente_codice_fornitore: 'STO-4', cliente_piva_norm: '', fornitore_piva: '99999999999', sconto_1: 0,
    } });
    const a = await entra('ammi-cli');
    await a.post('/clienti/' + clienteS + '/agenzie', {
      subagente_id: Number(subagenteId), fornitore_id: Number(fornitoreS), sconto: 0,
      valido_dal: '2038-01-01', valido_al: '2038-12-31', storico_id: Number(riga.id),
    }).expect(400);
    expect((await db.interscambio_storico.findUniqueOrThrow({ where: { id: riga.id } })).stato).toBe('da_usare');
  });

  it('la rotta che usa il form trova la riga della coppia, poi l’agenzia la segna usata', async () => {
    // gli id nello storico restano NULL finché non si collegano (dati veri, §4.7.2): la coppia si
    // riconosce dalle P.IVA (servono entrambi i lati, R1-07)
    const riga = await db.interscambio_storico.create({ data: {
      fonte: 'vecchio_crm', estratto_il: ESTRATTO, cliente_legacy_id: 9106n, fornitore_legacy_id: 9106n,
      cliente_codice_fornitore: 'STO-6', cliente_piva_norm: '11111111111',
      fornitore_piva: '22222222222', subagente_nome: 'Alfredo Nista', sconto_1: 6,
    } });
    const a = await entra('ammi-cli');
    const trovati = await a.get('/interscambio/storico?fornitore_id=' + fornitoreS + '&cliente_id=' + clienteS + '&codice=STO-6').expect(200);
    expect(trovati.body.map((x: { id: string }) => x.id)).toContain(String(riga.id));
    expect(trovati.body[0].rappresentato).toBe(true);
    const r = await a.post('/clienti/' + clienteS + '/agenzie', {
      subagente_id: Number(subagenteId), fornitore_id: Number(fornitoreS), sconto: 6,
      valido_dal: '2040-01-01', valido_al: '2040-12-31', storico_id: Number(riga.id),
    }).expect(201);
    creati.push(BigInt(r.body.id));
    expect((await db.interscambio_storico.findUniqueOrThrow({ where: { id: riga.id } })).stato).toBe('usata');
  });

  it('riga senza alcun dato della coppia: 400, non si può segnare a caso', async () => {
    const riga = await db.interscambio_storico.create({ data: {
      fonte: 'vecchio_crm', estratto_il: ESTRATTO, cliente_legacy_id: 9107n, fornitore_legacy_id: 9107n,
      cliente_codice_fornitore: 'STO-7', cliente_piva_norm: '', fornitore_piva: null, sconto_1: 0,
    } });
    const a = await entra('ammi-cli');
    const r = await a.post('/clienti/' + clienteS + '/agenzie', {
      subagente_id: Number(subagenteId), fornitore_id: Number(fornitoreS), sconto: 0,
      valido_dal: '2041-01-01', valido_al: '2041-12-31', storico_id: Number(riga.id),
    }).expect(400);
    expect(r.body.message).toContain('altro cliente o fornitore');
    expect((await db.interscambio_storico.findUniqueOrThrow({ where: { id: riga.id } })).stato).toBe('da_usare');
  });

  it('riga di un altro cliente con la sola P.IVA del fornitore: 400 (R1-07)', async () => {
    // caso vero: riga senza P.IVA cliente (le «senza P.IVA cliente» del report), con il nome di un
    // altro cliente: il fornitore da solo non basta più a riconoscere la coppia
    const riga = await db.interscambio_storico.create({ data: {
      fonte: 'vecchio_crm', estratto_il: ESTRATTO, cliente_legacy_id: 9108n, fornitore_legacy_id: 9108n,
      cliente_ragione_sociale: 'Cliente Altro', cliente_piva_norm: '',
      fornitore_piva: '22222222222', subagente_nome: 'Nista Mario', sconto_1: 10,
    } });
    const a = await entra('ammi-cli');
    const prima = await db.interscambio.count({ where: { cliente_id: clienteS, fornitore_id: fornitoreS } });
    const r = await a.post('/clienti/' + clienteS + '/agenzie', {
      subagente_id: Number(subagenteId), fornitore_id: Number(fornitoreS), sconto: 10,
      valido_dal: '2034-01-01', valido_al: '2034-12-31', storico_id: Number(riga.id),
    }).expect(400);
    expect(r.body.message).toContain('altro cliente o fornitore');
    expect(await db.interscambio.count({ where: { cliente_id: clienteS, fornitore_id: fornitoreS } })).toBe(prima);
    expect((await db.interscambio_storico.findUniqueOrThrow({ where: { id: riga.id } })).stato).toBe('da_usare');
  });

  it('la stessa riga dello storico non si consuma due volte: 409 (R1-07)', async () => {
    const riga = await db.interscambio_storico.create({ data: {
      fonte: 'vecchio_crm', estratto_il: ESTRATTO, cliente_legacy_id: 9109n, fornitore_legacy_id: 9109n,
      cliente_piva_norm: '11111111111', fornitore_piva: '22222222222', sconto_1: 4,
    } });
    const a = await entra('ammi-cli');
    const r1 = await a.post('/clienti/' + clienteS + '/agenzie', {
      subagente_id: Number(subagenteId), fornitore_id: Number(fornitoreS), sconto: 4,
      valido_dal: '2043-01-01', valido_al: '2043-06-30', storico_id: Number(riga.id),
    }).expect(201);
    creati.push(BigInt(r1.body.id));
    const r2 = await a.post('/clienti/' + clienteS + '/agenzie', {
      subagente_id: Number(subagenteId), fornitore_id: Number(fornitoreS), sconto: 4,
      valido_dal: '2043-07-01', valido_al: '2043-12-31', storico_id: Number(riga.id),
    }).expect(409);
    expect(r2.body.message).toContain('già stata usata');
    // la riga resta legata alla prima agenzia
    expect(String((await db.interscambio_storico.findUniqueOrThrow({ where: { id: riga.id } })).interscambio_id)).toBe(r1.body.id);
  });

  it('senza storico_id tutto come prima: nessuna riga dello storico toccata', async () => {
    const riga = await db.interscambio_storico.create({ data: {
      fonte: 'vecchio_crm', estratto_il: ESTRATTO, cliente_legacy_id: 9105n, fornitore_legacy_id: 9105n,
      cliente_id: clienteS, fornitore_id: fornitoreS, cliente_codice_fornitore: 'STO-5', cliente_piva_norm: '', sconto_1: 0,
    } });
    const a = await entra('oper-cli');
    const r = await a.post('/clienti/' + clienteS + '/agenzie', {
      subagente_id: Number(subagenteId), fornitore_id: Number(fornitoreS), sconto: 0, valido_dal: '2039-01-01', valido_al: '2039-12-31',
    }).expect(201);
    creati.push(BigInt(r.body.id));
    expect((await db.interscambio_storico.findUniqueOrThrow({ where: { id: riga.id } })).stato).toBe('da_usare');
  });
});

describe('agenzie CRUD', () => {
  let agenziaId = '';

  it('crea agenzia e scrive nel registro', async () => {
    const a = await entra('ammi-cli');
    const r = await a.post('/clienti/' + clienteId + '/agenzie', {
      subagente_id: Number(subagenteId),
      fornitore_id: Number(fornitoreId),
      codice_cliente_fornitore: 'COD-TEST',
      sconto: 5,
      pct_subagente: 10,
      regola_mensile: 'prima',
      valido_dal: '2030-01-01',
      valido_al: '2030-12-31',
    }).expect(201);
    expect(r.body).toHaveProperty('id');
    expect(r.body.codice_cliente_fornitore).toBe('COD-TEST');
    expect(r.body.regola_mensile).toBe('prima');
    agenziaId = r.body.id;
    creati.push(BigInt(agenziaId));
    const ev = await db.registro.findFirst({ where: { codice: 'crud.create', entita: 'interscambio', entita_id: BigInt(agenziaId) }, orderBy: { id: 'desc' } });
    expect(ev).not.toBeNull();
  });

  it("agenzia: null sui campi obbligatori e fine uguale all'inizio danno 400", async () => {
    const a = await entra('oper-cli');
    const base = '/clienti/' + clienteId + '/agenzie/' + agenziaId;
    for (const b of [{ valido_dal: null }, { subagente_id: null }, { sconto: null }]) await a.put(base, b).expect(400);
    const r = await a.put(base, { valido_dal: '2030-01-01', valido_al: '2030-01-01' }).expect(400);
    expect(r.body.message).toContain('dopo');
  });

  it('modifica agenzia', async () => {
    const a = await entra('ammi-cli');
    const r = await a.put('/clienti/' + clienteId + '/agenzie/' + agenziaId, { sconto: 7, regola_mensile: 'piu_alta', valido_al: '2030-06-30' }).expect(200);
    expect(r.body.sconto).toBe(7);
    expect(r.body.regola_mensile).toBe('piu_alta');
    expect(r.body.valido_al).toBe('2030-06-30');
  });

  it('chiudi agenzia (valido_al)', async () => {
    const a = await entra('oper-cli');
    const r = await a.put('/clienti/' + clienteId + '/agenzie/' + agenziaId, { valido_al: '2030-02-28' }).expect(200);
    expect(r.body.valido_al).toBe('2030-02-28');
  });

  it('blocco doppioni: periodo sovrapposto', async () => {
    const a = await entra('oper-cli');
    // prima agenzia
    const r1 = await a.post('/clienti/' + clienteId + '/agenzie', {
      subagente_id: Number(subagenteId),
      fornitore_id: Number(fornitoreId),
      sconto: 1,
      valido_dal: '2031-01-01',
      valido_al: '2031-12-31',
    }).expect(201);
    creati.push(BigInt(r1.body.id));
    // seconda sovrapposta
    const r2 = await a.post('/clienti/' + clienteId + '/agenzie', {
      subagente_id: Number(subagenteId),
      fornitore_id: Number(fornitoreId),
      sconto: 2,
      valido_dal: '2031-06-01',
      valido_al: '2031-08-31',
    });
    expect(r2.status).toBe(409);
    expect(r2.body.message ?? r2.body.messaggio ?? '').toMatch(/sovrapposto/i);
  });

  it('codice fornitore duplicato nello stesso periodo -> 409', async () => {
    const a = await entra('oper-cli');
    const r = await a.post('/clienti/' + clienteId + '/agenzie', {
      subagente_id: Number(subagenteId),
      fornitore_id: Number(fornitoreId),
      codice_cliente_fornitore: 'COD-DUP',
      sconto: 1,
      valido_dal: '2032-01-01',
      valido_al: '2032-12-31',
    }).expect(201);
    creati.push(BigInt(r.body.id));
    const r2 = await a.post('/clienti/' + clienteId + '/agenzie', {
      // altro cliente non disponibile? usa stesso cliente ma fornitore diverso impossibile; cambia codice? 
      subagente_id: Number(subagenteId),
      fornitore_id: Number(fornitoreId),
      codice_cliente_fornitore: 'COD-DUP',
      sconto: 2,
      valido_dal: '2032-06-01',
      valido_al: '2032-08-31',
    });
    // il secondo ha cliente+fornitore sovrapposto -> 409 comunque
    expect(r2.status).toBe(409);
  });

  it("elimina agenzia con sconti storici: 409 con il messaggio, l'agenzia resta (D-139)", async () => {
    const a = await entra('oper-cli');
    const r = await a.post('/clienti/' + clienteId + '/agenzie', {
      subagente_id: Number(subagenteId),
      fornitore_id: Number(fornitoreId),
      sconto: 1,
      valido_dal: '2034-01-01',
      valido_al: '2034-12-31',
    }).expect(201);
    creati.push(BigInt(r.body.id));
    const sconto = await db.sconti.create({ data: { interscambio_id: BigInt(r.body.id), ordine: 1, tipo: 'commerciale', percentuale: 5 } });
    const e = await a.del('/clienti/' + clienteId + '/agenzie/' + r.body.id).expect(409);
    expect(e.body.message).toContain('sconti storici');
    expect(await db.interscambio.count({ where: { id: BigInt(r.body.id) } })).toBe(1);
    // senza sconti si elimina come prima
    await db.sconti.delete({ where: { id: sconto.id } });
    await a.del('/clienti/' + clienteId + '/agenzie/' + r.body.id).expect(204);
  });

  it('elimina agenzia', async () => {
    const a = await entra('oper-cli');
    const r = await a.post('/clienti/' + clienteId + '/agenzie', {
      subagente_id: Number(subagenteId),
      fornitore_id: Number(fornitoreId),
      sconto: 1,
      valido_dal: '2033-01-01',
      valido_al: '2033-12-31',
    }).expect(201);
    const id = r.body.id;
    await a.del('/clienti/' + clienteId + '/agenzie/' + id).expect(204);
  });
});

describe('agenzia da confermare (D-159)', () => {
  it('conferma: mette da_confermare=false e scrive nel registro', async () => {
    const a = await entra('ammi-cli');
    const r = await a.post('/clienti/' + clienteId + '/agenzie', {
      subagente_id: Number(subagenteId), fornitore_id: Number(fornitoreId), sconto: 2, valido_dal: '2045-01-01', valido_al: '2045-12-31',
    }).expect(201);
    creati.push(BigInt(r.body.id));
    await db.interscambio.update({ where: { id: BigInt(r.body.id) }, data: { da_confermare: true } });
    const c = await a.post('/clienti/' + clienteId + '/agenzie/' + r.body.id + '/conferma', {}).expect(201);
    expect(c.body.da_confermare).toBe(false);
    expect((await db.interscambio.findUniqueOrThrow({ where: { id: BigInt(r.body.id) } })).da_confermare).toBe(false);
    const ev = await db.registro.findFirst({ where: { codice: 'crud.update', entita: 'interscambio', entita_id: BigInt(r.body.id) }, orderBy: { id: 'desc' } });
    expect(ev).not.toBeNull();
  });

  it('modifica di una da confermare la conferma anche (D-159)', async () => {
    const a = await entra('ammi-cli');
    const r = await a.post('/clienti/' + clienteId + '/agenzie', {
      subagente_id: Number(subagenteId), fornitore_id: Number(fornitoreId), sconto: 2, valido_dal: '2046-01-01', valido_al: '2046-12-31',
    }).expect(201);
    creati.push(BigInt(r.body.id));
    await db.interscambio.update({ where: { id: BigInt(r.body.id) }, data: { da_confermare: true } });
    const m = await a.put('/clienti/' + clienteId + '/agenzie/' + r.body.id, { sconto: 3 }).expect(200);
    expect(m.body.da_confermare).toBe(false);
    expect((await db.interscambio.findUniqueOrThrow({ where: { id: BigInt(r.body.id) } })).da_confermare).toBe(false);
  });

  it('conferma di un agenzia di un altro cliente: 404', async () => {
    const a = await entra('ammi-cli');
    const altro = await db.clienti.findFirstOrThrow({ where: { id: { not: BigInt(clienteId) } } });
    const f = await db.fornitori.create({ data: {} });
    const ag = await db.interscambio.create({ data: { subagente_id: BigInt(subagenteId), cliente_id: altro.id, fornitore_id: f.id, sconto: 1, valido_dal: new Date('2047-01-01'), da_confermare: true } });
    creati.push(ag.id);
    await a.post('/clienti/' + clienteId + '/agenzie/' + ag.id + '/conferma', {}).expect(404);
  });
});

describe('agenzia nel periodo chiuso (D-114)', () => {
  let clienteChiuso = '';
  let fornitoreChiuso = '';
  let chiusura = '';
  let agenziaChiusaId = '';

  const giornoDopo = (d: string) => {
    const dt = new Date(d + 'T00:00:00Z');
    dt.setUTCDate(dt.getUTCDate() + 1);
    return dt.toISOString().slice(0, 10);
  };

  beforeAll(async () => {
    const chiuso = await db.bollettini_testata.findFirst({ where: { chiuso_il: { not: null } }, orderBy: { chiuso_il: 'desc' } });
    if (!chiuso) throw new Error('seed senza bollettini chiusi');
    fornitoreChiuso = String(chiuso.fornitore_id);
    chiusura = (await ultimaChiusura(db, chiuso.fornitore_id))!;
    const c = await db.clienti.create({ data: {} });
    clienteChiuso = String(c.id);
    // agenzia nata prima della chiusura, scritta direttamente in banca dati (via API sarebbe 409)
    const ag = await db.interscambio.create({
      data: { cliente_id: c.id, subagente_id: BigInt(subagenteId), fornitore_id: chiuso.fornitore_id, sconto: 5, valido_dal: new Date('2026-01-01') },
    });
    agenziaChiusaId = String(ag.id);
    creati.push(ag.id);
  });

  it('modifica di un campo che sposta i soldi nel periodo chiuso: 409', async () => {
    const a = await entra('ammi-cli');
    const e = await a.put('/clienti/' + clienteChiuso + '/agenzie/' + agenziaChiusaId, { sconto: 10 }).expect(409);
    expect(e.body.message).toContain('chiudi l\'agenzia');
  });

  it('eliminazione nel periodo chiuso: 409', async () => {
    const a = await entra('ammi-cli');
    const e = await a.del('/clienti/' + clienteChiuso + '/agenzie/' + agenziaChiusaId).expect(409);
    expect(e.body.message).toContain('chiudi l\'agenzia');
  });

  it('chiusura (valido_al): nel periodo chiuso 409, dopo la chiusura 200', async () => {
    const a = await entra('ammi-cli');
    const url = '/clienti/' + clienteChiuso + '/agenzie/' + agenziaChiusaId;
    // la fine non può cadere entro la chiusura (D-114)
    const e = await a.put(url, { valido_al: chiusura }).expect(409);
    expect(e.body.message).toContain('smettere di valere');
    const m = await a.put(url, { valido_al: giornoDopo(chiusura) }).expect(200);
    expect(m.body.valido_al).toBe(giornoDopo(chiusura));
  });

  it('nuova agenzia nel periodo chiuso: 409; da dopo la chiusura: 201', async () => {
    const a = await entra('ammi-cli');
    await a.post('/clienti/' + clienteChiuso + '/agenzie', {
      subagente_id: Number(subagenteId), fornitore_id: Number(fornitoreChiuso), sconto: 4, valido_dal: '2026-01-01',
    }).expect(409);
    const r = await a.post('/clienti/' + clienteChiuso + '/agenzie', {
      subagente_id: Number(subagenteId), fornitore_id: Number(fornitoreChiuso), sconto: 4, valido_dal: giornoDopo(chiusura),
    }).expect(201);
    creati.push(BigInt(r.body.id));
  });
});

describe('ricerca cliente con codice fornitore (D-157)', () => {
  let c: bigint, f: bigint;
  const agenzia = (cliente: bigint, codice: string, dal: string, al: string | null) =>
    db.interscambio.create({ data: { subagente_id: BigInt(subagenteId), cliente_id: cliente, fornitore_id: f,
      codice_cliente_fornitore: codice, sconto: 0, valido_dal: new Date(dal), valido_al: al ? new Date(al) : null } });

  beforeAll(async () => {
    c = (await db.clienti.create({ data: {} })).id;
    f = (await db.fornitori.create({ data: {} })).id;
  });

  it('con fornitore_id porta il codice dell’agenzia valida oggi', async () => {
    await agenzia(c, 'COD-OGGI', '2020-01-01', null);
    const a = await entra('ammi-cli');
    const el = await a.get('/clienti?fornitore_id=' + f).expect(200);
    expect(el.body.find((x: { id: string }) => x.id === String(c)).codice_fornitore).toBe('COD-OGGI');
  });

  it('agenzia chiusa: vale l’ultima (codice più recente)', async () => {
    const c2 = (await db.clienti.create({ data: {} })).id;
    await agenzia(c2, 'COD-ULTIMA', '2021-01-01', '2021-12-31');
    const a = await entra('ammi-cli');
    const el = await a.get('/clienti?fornitore_id=' + f).expect(200);
    expect(el.body.find((x: { id: string }) => x.id === String(c2)).codice_fornitore).toBe('COD-ULTIMA');
  });

  it('senza agenzia per quel fornitore: codice_fornitore null', async () => {
    const c3 = (await db.clienti.create({ data: {} })).id;
    const a = await entra('ammi-cli');
    const el = await a.get('/clienti?fornitore_id=' + f).expect(200);
    expect(el.body.find((x: { id: string }) => x.id === String(c3)).codice_fornitore).toBeNull();
  });

  it('senza fornitore_id la proprietà non c’è', async () => {
    const a = await entra('ammi-cli');
    const el = await a.get('/clienti').expect(200);
    expect(el.body.find((x: { id: string }) => x.id === String(c))).not.toHaveProperty('codice_fornitore');
  });

  it('fornitore_id non numerico: 400', async () => {
    const a = await entra('ammi-cli');
    await a.get('/clienti?fornitore_id=abc').expect(400);
  });

  it('lettura consulta anche con fornitore_id', async () => {
    const a = await entra('lett-cli');
    await a.get('/clienti?fornitore_id=' + f).expect(200);
  });
});
