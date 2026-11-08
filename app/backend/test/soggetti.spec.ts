// Anagrafica unica a soggetti (F1-A8, D-100…D-102, specifica-anagrafica-soggetti.md §4–§6).
// Primo blocco: vincoli del database, in una transazione annullata. Secondo: API, permessi e non
// regressione dello strato 0, sul seed di §12.
import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { Client } from 'pg';
import { AppModule } from '../src/app.module';
import { configura } from '../src/main';
import { cifra } from '../src/password';
import { PrismaService } from '../src/prisma.service';
import { seed } from '../prisma/seed';
import { svuota } from './svuota';

// ---------- Vincoli del database ----------
describe('vincoli del database (specifica-anagrafica-soggetti §4)', () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  const q = (sql: string, p: unknown[] = []) => db.query(sql, p);
  let soggetto: string;
  let sede: string;

  async function errore(sql: string, p: unknown[] = []): Promise<string> {
    await q('SAVEPOINT s');
    try {
      await q(sql, p);
      await q('RELEASE SAVEPOINT s');
      return '';
    } catch (e) {
      await q('ROLLBACK TO SAVEPOINT s');
      return (e as Error).message;
    }
  }

  beforeAll(() => db.connect());
  afterAll(() => db.end());
  beforeEach(async () => {
    await q('BEGIN');
    soggetto = (await q(`INSERT INTO soggetti (natura, paese, piva, piva_norm) VALUES ('azienda', 'IT', 'IT11111111111', '11111111111') RETURNING id`)).rows[0].id;
    sede = (await q(`INSERT INTO sedi (soggetto_id, tipo) VALUES ($1, 'legale') RETURNING id`, [soggetto])).rows[0].id;
  });
  afterEach(() => q('ROLLBACK'));

  it('P.IVA doppia rifiutata dall’indice parziale', async () => {
    const ins = `INSERT INTO soggetti (natura, paese, piva, piva_norm) VALUES ('azienda', $1, $2, $3)`;
    expect(await errore(ins, ['IT', '11111111111', '11111111111'])).toMatch('soggetti_piva_norm_key');
    expect(await errore(ins, ['IT', 'IT11111111112', '11111111112'])).toBe('');
  });

  it('due soggetti senza P.IVA con lo stesso CF rifiutati', async () => {
    const ins = `INSERT INTO soggetti (natura, codice_fiscale, cf_norm) VALUES ('persona', $1, $1)`;
    expect(await errore(ins, ['AAAAAAAAAAAAAAAA'])).toBe('');
    expect(await errore(ins, ['AAAAAAAAAAAAAAAA'])).toMatch('soggetti_cf_norm_key');
  });

  it('P.IVA corta rifiutata dal CHECK (va in scarto, §7.4)', async () => {
    expect(await errore(`INSERT INTO soggetti (natura, piva_norm) VALUES ('azienda', '123456789')`)).toMatch('soggetti_piva_norm_check');
    expect(await errore(`INSERT INTO soggetti (natura, piva_norm) VALUES ('azienda', '12345678901')`)).toBe('');
  });

  it('sedi: una sola predefinita per tipo', async () => {
    const ins = `INSERT INTO sedi (soggetto_id, tipo, predefinita) VALUES ($1, 'punto_vendita', true)`;
    expect(await errore(ins, [soggetto])).toBe('');
    expect(await errore(ins, [soggetto])).toMatch('sedi_predefinita_key');
    expect(await errore(`INSERT INTO sedi (soggetto_id, tipo, predefinita) VALUES ($1, 'punto_vendita', false), ($1, 'legale', true)`, [soggetto])).toBe('');
  });

  it('recapiti: uno solo fra soggetto, sede e persona', async () => {
    const ins = `INSERT INTO recapiti (soggetto_id, sede_id, persona_id, tipo, valore) VALUES ($1, $2, $3, 'email', $4)`;
    expect(await errore(ins, [soggetto, sede, null, 'a@x.it'])).toMatch('recapiti_collegamento_check');
    expect(await errore(ins, [null, null, null, 'b@x.it'])).toMatch('recapiti_collegamento_check');
    expect(await errore(ins, [soggetto, null, null, 'a@x.it'])).toBe('');
    expect(await errore(ins, [soggetto, null, null, 'a@x.it'])).toMatch('recapiti_soggetto_tipo_valore_key');
  });

  it('fatturazione: SDI di 7, 0000000 solo con estero, attiva con un recapito fiscale', async () => {
    const ins = `INSERT INTO fatturazione (soggetto_id, codice_destinatario, id_codice_estero, attiva) VALUES ($1, $2, $3, $4)`;
    expect(await errore(ins, [soggetto, 'ABC123', null, false])).toMatch('fatturazione_codice_destinatario_check');
    expect(await errore(ins, [soggetto, '0000000', null, false])).toMatch('fatturazione_estero_check');
    expect(await errore(ins, [soggetto, null, null, true])).toMatch('fatturazione_attiva_check');
    expect(await errore(ins, [soggetto, 'ABC1234', null, true])).toBe('');
    expect(await errore(ins, [soggetto, 'ABC1234', null, true])).toMatch('fatturazione_pkey');
  });
});

// ---------- API ----------
let app: NestExpressApplication;
let db: PrismaService;
const DOMINIO = '@prova-sog.it';
const PW = 'password-di-prova';
let mcl: string;
let nuovo: string;
const sessioni: Record<string, Awaited<ReturnType<typeof apri>>> = {};

const entra = async (utente: string) => (sessioni[utente] ??= await apri(utente));
async function apri(utente: string) {
  const agente = request.agent(app.getHttpServer());
  const r = await agente.post('/api/accesso/entra').send({ utente, password: PW }).expect(200);
  const csrf = r.body.csrf as string;
  return {
    get: (p: string) => agente.get('/api' + p),
    post: (p: string, b: object = {}) => agente.post('/api' + p).set('x-csrf-token', csrf).send(b),
    put: (p: string, b: object) => agente.put('/api' + p).set('x-csrf-token', csrf).send(b),
  };
}

async function utente(username: string, livello: string | null) {
  await db.utenti.create({ data: {
    username, email: username + DOMINIO, nome: 'Prova ' + username, ruolo: 'utente',
    password_hash: await cifra(PW), deve_cambiare_password: false,
    aree: livello ? { create: [{ area: 'dati', livello }] } : undefined,
  } });
}

describe('api soggetti', () => {
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
    await app.init();
    db = app.get(PrismaService);
    await svuota(db);
    await seed(db);
    await utente('lett', 'lettura');
    await utente('oper', 'operatore');
    await utente('niente', null);
    mcl = String((await db.soggetti.findFirstOrThrow({ where: { piva_norm: '08943010155' } })).id);
  });

  afterAll(async () => {
    await svuota(db).catch(() => {});
    await app.close();
  });

  it('lettura richiede dati.consulta', async () => {
    await (await entra('lett')).get('/soggetti').expect(200);
    await (await entra('niente')).get('/soggetti').expect(403);
  });

  it('scrittura richiede dati.modifica', async () => {
    await (await entra('niente')).post('/soggetti', { natura: 'azienda', piva: '55555555555' }).expect(403);
    await (await entra('lett')).post('/soggetti', { natura: 'azienda', piva: '55555555555' }).expect(403);
  });

  it('elenco: totale e conteggi dei segmenti (D-23)', async () => {
    const r = await (await entra('oper')).get('/soggetti').expect(200);
    expect(r.body.totale).toBe(28);
    expect(r.body.conteggi).toEqual({ tutti: 28, cliente: 13, fornitore: 12, subagente: 4, nonattivi: 0 });
  });

  it('ricerca per nome e per P.IVA: MCL con due ruoli e due codici (D-101)', async () => {
    for (const q of ['MCL', '08943010155']) {
      const r = await (await entra('oper')).get(`/soggetti?q=${q}`).expect(200);
      expect(r.body.totale).toBe(1);
      expect(r.body.righe[0].nome).toBe('MCL SRL');
      const ruoli = r.body.righe[0].ruoli as { tipo: string; codice: string }[];
      expect(ruoli.map((x) => x.tipo).sort()).toEqual(['cliente', 'fornitore']);
      expect(ruoli.map((x) => x.codice).sort()).toEqual(['C02477', 'F90012']);
    }
  });

  it('paginazione e ordinamento in SQL', async () => {
    const a = await (await entra('oper')).get('/soggetti?righe=5&pagina=1&ordina=codice&dir=asc').expect(200);
    const b = await (await entra('oper')).get('/soggetti?righe=5&pagina=2&ordina=codice&dir=asc').expect(200);
    expect(a.body.righe).toHaveLength(5);
    expect(a.body.totale).toBe(28);
    expect(a.body.righe[0].codice).toBe('C000001');
    expect(b.body.righe[0].codice).toBe('C000006');
    await (await entra('oper')).get('/soggetti?ordina=nome&dir=desc').expect(200);
    await (await entra('oper')).get('/soggetti?vista=subagente').expect(200).expect((x) => {
      expect(x.body.totale).toBe(4);
      expect(x.body.righe.every((r: { ruoli: { tipo: string }[] }) => r.ruoli.some((y) => y.tipo === 'subagente'))).toBe(true);
    });
  });

  it('creazione: codice progressivo, normalizzazione, sorgente crm', async () => {
    const r = await (await entra('oper')).post('/soggetti', { natura: 'azienda', piva: 'IT01234567890', note: 'Prova' }).expect(201);
    expect(r.body.codice).toMatch(/^C\d{6}$/);
    expect(Number(r.body.codice.slice(1))).toBeGreaterThan(28);
    expect(r.body).toMatchObject({ piva: 'IT01234567890', piva_norm: '01234567890', sorgente: 'crm', attivo: true });
    nuovo = r.body.id;
  });

  it('P.IVA doppia: 409 con codice e nome dell’esistente', async () => {
    const r = await (await entra('oper')).post('/soggetti', { natura: 'azienda', piva: 'IT08943010155' }).expect(409);
    expect(r.body.message).toContain('MCL SRL');
  });

  it('P.IVA corta e nessun dato fiscale: 400', async () => {
    const corta = await (await entra('oper')).post('/soggetti', { natura: 'azienda', piva: '123456789' }).expect(400);
    expect(corta.body.message).toContain('scarto');
    await (await entra('oper')).post('/soggetti', { natura: 'azienda' }).expect(400);
  });

  it('codice fiscale doppio senza P.IVA: 409', async () => {
    await (await entra('oper')).post('/soggetti', { natura: 'persona', codice_fiscale: 'BSTSFN72M05H501X' }).expect(409);
  });

  it('modifica: righe in modifiche ed evento crud.update', async () => {
    const a = await entra('oper');
    const prima = await db.modifiche.count({ where: { entita: 'soggetto', entita_id: BigInt(nuovo) } });
    const r = await a.put('/soggetti/' + nuovo, { note: 'Nota cambiata', natura: 'persona' }).expect(200);
    expect(r.body).toMatchObject({ note: 'Nota cambiata', natura: 'persona' });
    expect(await db.modifiche.count({ where: { entita: 'soggetto', entita_id: BigInt(nuovo) } })).toBe(prima + 2);
    expect(await db.registro.count({ where: { codice: 'crud.update', entita: 'soggetto', entita_id: BigInt(nuovo) } })).toBe(1);
    await a.put('/soggetti/' + nuovo, { note: 'Nota cambiata', natura: 'persona' }).expect(200);
    expect(await db.modifiche.count({ where: { entita: 'soggetto', entita_id: BigInt(nuovo) } })).toBe(prima + 2);
  });

  it('disattivazione bloccata con ruoli attivi, permessa senza', async () => {
    const a = await entra('oper');
    const r = await a.post(`/soggetti/${mcl}/attivo`, { attivo: false }).expect(409);
    expect(r.body.message).toContain('cliente');
    const off = await a.post(`/soggetti/${nuovo}/attivo`, { attivo: false }).expect(200);
    expect(off.body.attivo).toBe(false);
    await a.post(`/soggetti/${nuovo}/attivo`, { attivo: true }).expect(200);
  });

  it('sedi: la predefinita si sposta nella stessa transazione', async () => {
    const a = await entra('oper');
    await a.post(`/soggetti/${nuovo}/sedi`, { tipo: 'legale', indirizzo: 'Via Uno 1', citta: 'Milano', predefinita: true }).expect(201);
    await a.post(`/soggetti/${nuovo}/sedi`, { tipo: 'legale', indirizzo: 'Via Due 2', citta: 'Torino', predefinita: true }).expect(201);
    const d = await a.get('/soggetti/' + nuovo).expect(200);
    const legali = (d.body.sedi as { tipo: string; predefinita: boolean }[]).filter((s) => s.tipo === 'legale');
    expect(legali).toHaveLength(2);
    expect(legali.filter((s) => s.predefinita)).toHaveLength(1);
    await a.post(`/soggetti/${nuovo}/sedi`, { tipo: 'boh' }).expect(400);
  });

  it('recapiti: minuscolo, duplicato 409, sede di un altro soggetto 400', async () => {
    const a = await entra('oper');
    const r = await a.post(`/soggetti/${nuovo}/recapiti`, { tipo: 'email', valore: 'Info@Example.IT', soggetto_id: Number(nuovo) }).expect(201);
    expect(r.body.valore).toBe('info@example.it');
    await a.post(`/soggetti/${nuovo}/recapiti`, { tipo: 'email', valore: 'info@example.it', soggetto_id: Number(nuovo) }).expect(409);
    const sedeMcl = await db.sedi.findFirstOrThrow({ where: { soggetto_id: BigInt(mcl) } });
    await a.post(`/soggetti/${nuovo}/recapiti`, { tipo: 'telefono', valore: '+39 02 111', sede_id: Number(sedeMcl.id) }).expect(400);
    await a.post(`/soggetti/${nuovo}/recapiti`, { tipo: 'telefono', valore: '+39 02 222' }).expect(400); // nessun collegamento
    const chiuso = await a.put(`/soggetti/${nuovo}/recapiti/${r.body.id}`, { valido_al: '2027-01-01' }).expect(200);
    expect(chiuso.body.valido_al).toBe('2027-01-01');
  });

  it('fatturazione: validazioni §4.5', async () => {
    const a = await entra('oper');
    const ok = await a.put(`/soggetti/${nuovo}/fatturazione`, { codice_destinatario: 'abc1234', attiva: true }).expect(200);
    expect(ok.body.codice_destinatario).toBe('ABC1234');
    await a.put(`/soggetti/${nuovo}/fatturazione`, { codice_destinatario: 'ABC123' }).expect(400);
    const senza = await entra('oper');
    await senza.put(`/soggetti/${mcl}/fatturazione`, { attiva: false, codice_destinatario: '' }).expect(200); // MCL resta configurabile
    const vuoto = await senza.put(`/soggetti/${mcl}/fatturazione`, { attiva: true, codice_destinatario: '' }).expect(400);
    expect(vuoto.body.message).toContain('almeno un modo');
    await senza.put(`/soggetti/${mcl}/fatturazione`, { codice_destinatario: '0000000' }).expect(400);
    const estero = await senza.put(`/soggetti/${mcl}/fatturazione`, { codice_destinatario: '0000000', id_codice_estero: 'DE123456789' }).expect(200);
    expect(estero.body.id_codice_estero).toBe('DE123456789');
  });

  it('ruoli: cliente e fornitore sullo stesso soggetto, versione crm e codice esterno', async () => {
    const a = await entra('oper');
    const c = await a.post(`/soggetti/${nuovo}/ruoli`, { tipo: 'cliente', ragione_sociale: 'Nuovo Cliente SRL', codice_integra: 'c99999' }).expect(201);
    expect(c.body).toMatchObject({ tipo: 'cliente', codice: 'C99999', attivo: true });
    const cliente = await db.clienti.findFirstOrThrow({ where: { soggetto_id: BigInt(nuovo) }, include: { corrente: true } });
    expect(cliente.corrente?.fonte).toBe('crm');
    expect(cliente.corrente!.valido_dal.toISOString().slice(0, 10) <= new Date().toISOString().slice(0, 10)).toBe(true);
    expect(await db.codici_esterni.count({ where: { tipo: 'cliente', codice: 'C99999', entita_id: cliente.id } })).toBe(1);
    await a.post(`/soggetti/${nuovo}/ruoli`, { tipo: 'cliente', ragione_sociale: 'Doppione' }).expect(409);
    await a.post(`/soggetti/${nuovo}/ruoli`, { tipo: 'fornitore', ragione_sociale: 'Nuovo Cliente SRL' }).expect(201);
    await a.post(`/soggetti/${mcl}/ruoli`, { tipo: 'cliente', ragione_sociale: 'MCL SRL' }).expect(409);
    const dettaglio = await a.get('/soggetti/' + nuovo).expect(200);
    expect((dettaglio.body.ruoli as { tipo: string }[]).map((r) => r.tipo).sort()).toEqual(['cliente', 'fornitore']);
  });

  it('non regressione: lo strato 0 si legge come prima e i ruoli hanno soggetto_id e codice', async () => {
    // una pratica, un bollettino e un documento restano leggibili dopo i collegamenti
    const pratica = await db.ordini_fornitore_testata.findFirstOrThrow({ where: { numero_ordine: 'OF/2026/045' }, include: { cliente: true, fornitore: true } });
    expect(pratica.cliente.ragione_sociale).toBeTruthy();
    expect(pratica.fornitore.ragione_sociale).toMatch(/^Gries/);
    expect(await db.ordini_fornitore_testata.count()).toBe(54);
    expect(await db.bollettini_testata.count()).toBe(7);
    expect(await db.documenti_in_arrivo.count()).toBe(17);

    const a = await entra('oper');
    const clienti = await a.get('/clienti').expect(200);
    expect(clienti.body.every((c: { soggetto_id: string; soggetto_codice: string }) => c.soggetto_id && /^C\d{6}$/.test(c.soggetto_codice))).toBe(true);
    const fornitori = await a.get('/fornitori').expect(200);
    expect(fornitori.body.every((f: { soggetto_codice: string }) => /^C\d{6}$/.test(f.soggetto_codice))).toBe(true);
    const subagenti = await a.get('/subagenti').expect(200);
    expect(subagenti.body.every((s: { soggetto_codice: string }) => /^C\d{6}$/.test(s.soggetto_codice))).toBe(true);
  });
});
