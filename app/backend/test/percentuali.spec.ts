import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configura } from '../src/main';
import { caricaDati, ultimaChiusura } from '../src/motore/dati';
import * as m from '../src/motore/motore';
import { cifra } from '../src/password';
import { PrismaService } from '../src/prisma.service';
import { SCHEMI } from '../src/registro';
import { svuota } from './svuota';
import { seed } from '../prisma/seed';

// F1-A5: percentuali con data di validità ed eccezioni personali (§4.2.2, §4.2.3, §5.11, D-25, D-26, D-51).
// Seed: ultima chiusura di Gries = 31/08/2026 (bollettino di agosto verificato), liquidazioni fino al 2° trimestre 2026.

let app: NestExpressApplication;
let db: PrismaService;
const DOMINIO = '@prova-percentuali.it';
const PW = 'password-di-prova';
let gries: string; // fornitore con l'eccezione di Bastasin sullo sconto 1 % (seed)
let bastasin: string;
let eccSeed: string; // l'eccezione del seed: dal 2025-01-01, già usata nel periodo chiuso

async function creaUtente(username: string, ruolo: string, livello: string) {
  await db.utenti.create({
    data: {
      username, email: username + DOMINIO, nome: 'Prova ' + username, ruolo,
      aree: { create: [{ area: 'dati', livello }] },
      password_hash: await cifra(PW), deve_cambiare_password: false,
    },
  });
}

async function entra(utente: string) {
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
let resp: Awaited<ReturnType<typeof entra>>;
let oper: Awaited<ReturnType<typeof entra>>;
let lett: Awaited<ReturnType<typeof entra>>;

const GRIES_NUOVE = [
  { sconto_min: 0, pct_agente: 20, pct_subagente: 11 },
  { sconto_min: 1, pct_agente: 20, pct_subagente: 1 },
  { sconto_min: 3, pct_agente: 16, pct_subagente: 8 }, // soglia nuova
  { sconto_min: 5, pct_agente: 14, pct_subagente: 7 },
  { sconto_min: 10, pct_agente: 6, pct_subagente: 2 },
  { sconto_min: 100, pct_agente: 0, pct_subagente: 0 },
];
const idFornitore = async (nome: string) => (await db.fornitori_versioni.findFirstOrThrow({ where: { ragione_sociale: { startsWith: nome } } })).fornitore_id;
const date = (r: { body: { versioni: { valido_dal: string }[] } }) => r.body.versioni.map((v) => v.valido_dal);
const scaglioneDi = (r: { body: { versioni: { valido_dal: string; scaglioni: { sconto_min: number }[] }[] } }, d: string, sconto: number) =>
  r.body.versioni.find((v) => v.valido_dal === d)!.scaglioni.find((s) => s.sconto_min === sconto) as unknown as Record<string, unknown> & { eccezioni: unknown[] };

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
  db = app.get(PrismaService);
  await svuota(db);
  await seed(db);
  await creaUtente('resp-perc', 'utente', 'responsabile');
  await creaUtente('oper-perc', 'utente', 'operatore');
  await creaUtente('lett-perc', 'utente', 'lettura');
  [resp, oper, lett] = await Promise.all([entra('resp-perc'), entra('oper-perc'), entra('lett-perc')]);
  const ecc = await db.provvigioni_eccezioni.findFirstOrThrow();
  gries = String(ecc.fornitore_id);
  bastasin = String(ecc.subagente_id);
  eccSeed = String(ecc.id);
}, 120_000);

afterAll(async () => {
  const utenti = (await db.utenti.findMany({ where: { email: { endsWith: DOMINIO } } })).map((u) => u.id);
  await db.$transaction([
    db.$executeRaw`SET LOCAL decobrands.pulizia_registro = 'si'`,
    db.registro.deleteMany({ where: { utente_id: { in: utenti } } }),
    db.sessioni.deleteMany({ where: { utente_id: { in: utenti } } }),
    db.utenti.deleteMany({ where: { id: { in: utenti } } }),
  ]);
  await svuota(db);
  await app.close();
});

describe('ultima chiusura (D-51)', () => {
  it('bollettino verificato più recente della liquidazione: fine del suo mese', async () => {
    expect(await ultimaChiusura(db, BigInt(gries))).toBe('2026-08-31'); // agosto verificato
    expect(await ultimaChiusura(db, await idFornitore('Gasper'))).toBe('2026-07-31'); // luglio verificato, agosto no
  });

  it('anche un bollettino contestato chiude il suo mese', async () => {
    const gasper = await idFornitore('Gasper');
    await expect(db.$transaction(async (tx) => {
      const chi = (await tx.bollettini_testata.findFirstOrThrow({ where: { chiuso_da: { not: null } } })).chiuso_da;
      await tx.bollettini_testata.updateMany({ where: { fornitore_id: gasper, anno: 2026, mese: 8 }, data: { stato: 'contestato', chiuso_il: new Date(), chiuso_da: chi } });
      expect(await ultimaChiusura(tx, gasper)).toBe('2026-08-31');
      throw new Error('annulla');
    })).rejects.toThrow('annulla');
  });

  it('senza bollettini verificati: fine dell\'ultimo trimestre liquidato', async () => {
    expect(await ultimaChiusura(db, await idFornitore('Ing'))).toBe('2026-06-30');
  });

  it('niente di chiuso: null', async () => {
    const ings = await idFornitore('Ing');
    // si tolgono le liquidazioni in una transazione annullata
    await expect(db.$transaction(async (tx) => {
      await tx.$executeRaw`UPDATE ordini_fornitore_documenti SET liquidazione_id = NULL`;
      await tx.$executeRaw`UPDATE bollettini_righe SET liquidazione_id = NULL`;
      await tx.$executeRaw`DELETE FROM liquidazioni`;
      expect(await ultimaChiusura(tx, ings)).toBeNull();
      throw new Error('annulla');
    })).rejects.toThrow('annulla');
    expect(await db.liquidazioni.count()).toBe(2);
  });
});

describe('percentuali datate', () => {
  const p = () => `/fornitori/${gries}/percentuali`;

  it('lettura: una versione dal 2025-01-01, con l\'eccezione di Bastasin e il suo periodo', async () => {
    const r = await lett.get(p()).expect(200);
    expect(r.body.in_vigore).toBe('2025-01-01');
    expect(date(r)).toEqual(['2025-01-01']);
    expect(scaglioneDi(r, '2025-01-01', 1).eccezioni)
      .toEqual([expect.objectContaining({ subagente_id: bastasin, pct_personale: 3, valido_dal: '2025-01-01', valido_al: null })]);
    expect(r.body.versioni[0].scaglioni[0]).toHaveProperty('dal_fornitore', 28);
  });

  it('operatore e lettura: 403 sulla scrittura', async () => {
    const b = { valido_dal: '2026-10-01', scaglioni: GRIES_NUOVE };
    await oper.post(p(), b).expect(403);
    await lett.post(p(), b).expect(403);
    await oper.put(p() + '/2025-01-01', { scaglioni: GRIES_NUOVE }).expect(403);
    await oper.del(p() + '/2025-01-01').expect(403);
  });

  it('dati non validi: 400', async () => {
    await resp.post(p(), { valido_dal: '2026-02-30', scaglioni: GRIES_NUOVE }).expect(400);
    await resp.post(p(), { valido_dal: '01/10/2026', scaglioni: GRIES_NUOVE }).expect(400);
    await resp.post(p(), { valido_dal: '2026-10-01', scaglioni: [] }).expect(400);
    await resp.post(p(), { valido_dal: '2026-10-01', scaglioni: [{ sconto_min: 0, pct_agente: 101, pct_subagente: 0 }] }).expect(400);
    await resp.post(p(), { valido_dal: '2026-10-01', scaglioni: [{ sconto_min: 0, pct_agente: 10.123, pct_subagente: 0 }] }).expect(400);
    await resp.post(p(), { valido_dal: '2026-10-01', scaglioni: [GRIES_NUOVE[0], GRIES_NUOVE[0]] }).expect(400);
    // manca una soglia della versione precedente
    const r = await resp.post(p(), { valido_dal: '2026-10-01', scaglioni: GRIES_NUOVE.slice(1) }).expect(400);
    expect(r.body.message).toMatch(/Manca lo sconto 0/);
    await resp.post('/fornitori/999999/percentuali', { valido_dal: '2026-10-01', scaglioni: GRIES_NUOVE }).expect(404);
  });

  it('data nel periodo chiuso: 409', async () => {
    const r = await resp.post(p(), { valido_dal: '2026-08-31', scaglioni: GRIES_NUOVE }).expect(409);
    expect(r.body.message).toMatch(/fino al 2026-08-31/);
    await resp.post(p(), { valido_dal: '2026-03-01', scaglioni: GRIES_NUOVE }).expect(409);
  });

  it('rollback: se il registro fallisce non resta niente', async () => {
    const prima = await db.provvigioni_scaglioni.count();
    const vecchio = SCHEMI['crud.create'];
    SCHEMI['crud.create'] = ['chiave_che_manca'];
    try {
      await resp.post(p(), { valido_dal: '2027-01-01', scaglioni: GRIES_NUOVE }).expect(500);
    } finally {
      SCHEMI['crud.create'] = vecchio;
    }
    expect(await db.provvigioni_scaglioni.count()).toBe(prima);
  });

  it('nuova versione dal 2027-01-01: evento, vecchia intatta, eccezione valida senza copie', async () => {
    const r = await resp.post(p(), { valido_dal: '2027-01-01', scaglioni: GRIES_NUOVE }).expect(201);
    expect(date(r)).toEqual(['2027-01-01', '2025-01-01']);
    expect(scaglioneDi(r, '2027-01-01', 1).eccezioni).toEqual([expect.objectContaining({ id: eccSeed, pct_personale: 3 })]);
    expect(scaglioneDi(r, '2025-01-01', 1).pct_agente).toBe(18);
    expect(await db.provvigioni_eccezioni.count()).toBe(1); // nessuna copia (D-51)
    const ev = await db.registro.findFirstOrThrow({ where: { codice: 'crud.create', entita: 'scaglione' }, orderBy: { id: 'desc' } });
    expect(ev.entita_id).toBe(BigInt(gries));
    expect(ev.dettaglio).toMatchObject({ fornitore_id: gries, valido_dal: '2027-01-01' });
    expect((ev.dettaglio as { scaglioni: unknown[] }).scaglioni).toHaveLength(6);
  });

  it('versione fra due esistenti; stessa data: 400 (usa la correzione)', async () => {
    const r = await resp.post(p(), { valido_dal: '2026-12-01', scaglioni: GRIES_NUOVE }).expect(201);
    expect(date(r)).toEqual(['2027-01-01', '2026-12-01', '2025-01-01']);
    const d = await resp.post(p(), { valido_dal: '2026-12-01', scaglioni: GRIES_NUOVE }).expect(400);
    expect(d.body.message).toMatch(/usa la correzione/);
  });

  it('versione fra due: la successiva deve avere tutte le sue soglie, 400', async () => {
    const r = await resp.post(p(), { valido_dal: '2026-12-15', scaglioni: [...GRIES_NUOVE, { sconto_min: 50, pct_agente: 1, pct_subagente: 0 }] }).expect(400);
    expect(r.body.message).toMatch(/La versione dal 2027-01-01 non ha lo sconto 50 %/);
    await resp.put(p() + '/2026-12-01', { scaglioni: [...GRIES_NUOVE, { sconto_min: 50, pct_agente: 1, pct_subagente: 0 }] }).expect(400);
  });

  it('correzione: ammessa dopo la chiusura, negata nel periodo chiuso', async () => {
    const nuove = GRIES_NUOVE.map((s) => (s.sconto_min === 0 ? { ...s, pct_agente: 21 } : s));
    const r = await resp.put(p() + '/2026-12-01', { scaglioni: nuove }).expect(200);
    expect(scaglioneDi(r, '2026-12-01', 0).pct_agente).toBe(21);
    expect(await db.provvigioni_scaglioni.count({ where: { fornitore_id: BigInt(gries), valido_dal: new Date('2026-12-01') } })).toBe(6);
    const ev = await db.registro.findFirstOrThrow({ where: { codice: 'crud.update', entita: 'scaglione', entita_id: BigInt(gries) }, orderBy: { id: 'desc' } });
    expect(ev.dettaglio).toMatchObject({ valido_dal: '2026-12-01', dopo: { scaglioni: expect.arrayContaining([{ sconto_min: 0, pct_agente: 21, pct_subagente: 11 }]) } });
    const c = await resp.put(p() + '/2025-01-01', { scaglioni: GRIES_NUOVE }).expect(409);
    expect(c.body.message).toBe('Le percentuali dal 2025-01-01 sono già usate in un periodo chiuso (fino al 2026-08-31): crea una versione nuova da una data successiva');
    await resp.put(p() + '/2026-12-01', { scaglioni: GRIES_NUOVE.slice(1) }).expect(400); // manca lo sconto 0
    await resp.put(p() + '/2026-12-01', { valido_dal: '2026-12-02', scaglioni: GRIES_NUOVE }).expect(400); // la data sta nella rotta
    await resp.put(p() + '/2026-11-15', { scaglioni: GRIES_NUOVE }).expect(404);
    await resp.put(p() + '/2026-02-30', { scaglioni: GRIES_NUOVE }).expect(400);
  });

  it('eccezioni orfane: correzione o eliminazione che toglie lo sconto di un\'eccezione valida, 409', async () => {
    const e = await resp.post('/eccezioni', { subagente_id: Number(bastasin), fornitore_id: Number(gries), sconto_min: 3, pct_personale: 9, valido_dal: '2026-12-01' }).expect(201);
    const senzaTre = GRIES_NUOVE.filter((x) => x.sconto_min !== 3);
    const r = await resp.put(p() + '/2026-12-01', { scaglioni: senzaTre }).expect(409);
    expect(r.body.message).toMatch(/Ci sono eccezioni personali sullo sconto 3 %/);
    await resp.del(p() + '/2026-12-01').expect(409); // resterebbe la versione dal 2025, senza lo sconto 3
    await resp.del('/eccezioni/' + e.body.id).expect(204);
  });

  it('eliminazione: ammessa dopo la chiusura, negata nel periodo chiuso', async () => {
    await resp.del(p() + '/2027-01-01').expect(204);
    await resp.del(p() + '/2027-01-01').expect(404);
    const ev = await db.registro.findFirstOrThrow({ where: { codice: 'crud.delete', entita: 'scaglione', entita_id: BigInt(gries) } });
    expect(ev.dettaglio).toMatchObject({ valido_dal: '2027-01-01' });
    const r = await resp.del(p() + '/2025-01-01').expect(409);
    expect(r.body.message).toMatch(/già usate in un periodo chiuso/);
    expect(date(await lett.get(p()).expect(200))).toEqual(['2026-12-01', '2025-01-01']);
  });

  it('l\'unica versione non si elimina', async () => {
    const f = await db.fornitori.create({ data: {} });
    await resp.post(`/fornitori/${f.id}/percentuali`, { valido_dal: '2026-12-01', scaglioni: [GRIES_NUOVE[0]] }).expect(201);
    const r = await resp.del(`/fornitori/${f.id}/percentuali/2026-12-01`).expect(409);
    expect(r.body.message).toMatch(/unica versione/);
  });

  it('motore: ogni documento con la versione alla sua data, eccezione valida anche sulla versione nuova', async () => {
    const S = await caricaDati(db, '2026-09-04');
    const p = S.pratiche.find((x) => x.fornitore_id === gries && m.percentuali(S, x, '2026-12-01')?.subagente_id === bastasin
      && m.percentuali(S, x, '2026-12-01')!.sconto.toNumber() === 1)!;
    expect(p).toBeDefined();
    const prima = m.percentuali(S, p, '2026-11-30')!, dopo = m.percentuali(S, p, '2026-12-01')!;
    expect(prima.scaglione.valido_dal).toBe('2025-01-01');
    expect(dopo.scaglione.valido_dal).toBe('2026-12-01');
    expect([Number(dopo.agente), Number(dopo.sub_standard), Number(dopo.sub), dopo.eccezione]).toEqual([20, 1, 3, true]);
  });

  it('elenco fornitori: conta solo gli scaglioni in vigore oggi', async () => {
    const prima = (await lett.get('/fornitori').expect(200)).body.find((f: { id: string }) => f.id === gries).scaglioni;
    await resp.post(p(), { valido_dal: '2099-01-01', scaglioni: [...GRIES_NUOVE, { sconto_min: 50, pct_agente: 1, pct_subagente: 0 }] }).expect(201);
    const r = await lett.get('/fornitori').expect(200);
    expect(r.body.find((f: { id: string }) => f.id === gries).scaglioni).toBe(prima);
    const v = await lett.get(p()).expect(200);
    expect(v.body.versioni[0]).toMatchObject({ valido_dal: '2099-01-01', in_vigore: false });
  });
});

describe('eccezioni personali (D-51)', () => {
  let id: string;
  const corpo = () => ({ subagente_id: Number(bastasin), fornitore_id: Number(gries), sconto_min: 5, pct_personale: 9.5, valido_dal: '2026-10-01' });

  it('operatore: 403', async () => {
    await oper.post('/eccezioni', corpo()).expect(403);
  });

  it('dati non validi', async () => {
    await resp.post('/eccezioni', { ...corpo(), pct_personale: 120 }).expect(400);
    await resp.post('/eccezioni', { ...corpo(), valido_dal: undefined }).expect(400);
    await resp.post('/eccezioni', { ...corpo(), sconto_min: 7 }).expect(400); // sconto che il fornitore non ha
    await resp.post('/eccezioni', { ...corpo(), sconto_min: 3 }).expect(400); // soglia 3 solo dal 2026-12-01
    await resp.post('/eccezioni', { ...corpo(), subagente_id: 999999 }).expect(404);
    await resp.post('/eccezioni', { ...corpo(), fornitore_id: 999999 }).expect(404);
    await lett.get('/eccezioni').expect(400); // serve un filtro
  });

  it('inizio nel periodo chiuso: 409', async () => {
    const r = await resp.post('/eccezioni', { ...corpo(), valido_dal: '2026-08-15' }).expect(409);
    expect(r.body.message).toMatch(/fino al 2026-08-31/);
  });

  it('inserisce con periodo aperto e scrive l\'evento', async () => {
    const r = await resp.post('/eccezioni', corpo()).expect(201);
    expect(r.body).toMatchObject({
      subagente_id: bastasin, fornitore_id: gries, sconto_min: 5, pct_personale: 9.5, pct_standard: 7,
      valido_dal: '2026-10-01', valido_al: null, modificabile: true,
    });
    id = r.body.id;
    const ev = await db.registro.findFirstOrThrow({ where: { codice: 'crud.create', entita: 'eccezione', entita_id: BigInt(id) } });
    expect(ev.dettaglio).toMatchObject({ subagente_id: bastasin, fornitore_id: gries, sconto_min: 5, pct_personale: 9.5, valido_dal: '2026-10-01' });
  });

  it('periodo sovrapposto: 409', async () => {
    const r = await resp.post('/eccezioni', { ...corpo(), valido_dal: '2027-03-01' }).expect(409);
    expect(r.body.message).toMatch(/Periodo sovrapposto/);
  });

  it('elenco del subagente e del fornitore', async () => {
    const r = await lett.get(`/eccezioni?subagente_id=${bastasin}`).expect(200);
    expect(r.body.map((e: { sconto_min: number; valido_dal: string; modificabile: boolean }) => `${e.sconto_min}@${e.valido_dal}:${e.modificabile}`))
      .toEqual(['1@2025-01-01:false', '5@2026-10-01:true']);
    expect((await lett.get(`/eccezioni?fornitore_id=${gries}`).expect(200)).body).toHaveLength(2);
  });

  it('riga già usata nel periodo chiuso: PUT e DELETE 409', async () => {
    const r = await resp.put('/eccezioni/' + eccSeed, { pct_personale: 4 }).expect(409);
    expect(r.body.message).toMatch(/già usata in un periodo chiuso \(fino al 2026-08-31\)/);
    await resp.del('/eccezioni/' + eccSeed).expect(409);
  });

  it('modifica: operatore 403, responsabile aggiorna con evento; inizio nel chiuso 409', async () => {
    await oper.put('/eccezioni/' + id, { pct_personale: 4 }).expect(403);
    await resp.put('/eccezioni/' + id, { pct_personale: 4.25 }).expect(200).expect((r) => expect(r.body.pct_personale).toBe(4.25));
    const ev = await db.registro.findFirstOrThrow({ where: { codice: 'crud.update', entita: 'eccezione', entita_id: BigInt(id) } });
    expect(ev.dettaglio).toMatchObject({ prima: { pct_personale: 9.5 }, dopo: { pct_personale: 4.25 } });
    await resp.put('/eccezioni/' + id, { pct_personale: 4.25, valido_dal: '2026-08-01' }).expect(409);
  });

  it('cambio di %: dal nel chiuso 409, prima dell\'inizio 400, operatore 403', async () => {
    await resp.post(`/eccezioni/${eccSeed}/cambia`, { pct_personale: 4, dal: '2026-08-01' }).expect(409);
    await resp.post(`/eccezioni/${eccSeed}/cambia`, { pct_personale: 4, dal: '2024-12-01' }).expect(400);
    await resp.post(`/eccezioni/${eccSeed}/cambia`, { pct_personale: 3, dal: '2026-10-01' }).expect(400); // stessa %
    await oper.post(`/eccezioni/${eccSeed}/cambia`, { pct_personale: 4, dal: '2026-10-01' }).expect(403);
  });

  it('cambio di %: due righe, il motore usa la vecchia prima e la nuova dopo', async () => {
    const r = await resp.post(`/eccezioni/${eccSeed}/cambia`, { pct_personale: 4, dal: '2026-10-01' }).expect(201);
    expect(r.body.chiusa).toMatchObject({ id: eccSeed, pct_personale: 3, valido_dal: '2025-01-01', valido_al: '2026-10-01', modificabile: false }); // valido_al escluso
    expect(r.body.nuova).toMatchObject({ pct_personale: 4, valido_dal: '2026-10-01', valido_al: null, modificabile: true });
    const ev = await db.registro.findFirstOrThrow({ where: { codice: 'crud.update', entita: 'eccezione', entita_id: BigInt(eccSeed) } });
    expect(ev.dettaglio).toMatchObject({ prima: { valido_al: null }, dopo: { valido_al: '2026-10-01' } });
    const S = await caricaDati(db, '2026-09-04');
    const p = S.pratiche.find((x) => x.fornitore_id === gries && m.percentuali(S, x, '2026-09-30')?.subagente_id === bastasin
      && m.percentuali(S, x, '2026-09-30')!.sconto.toNumber() === 1)!;
    expect(Number(m.percentuali(S, p, '2026-09-30')!.sub)).toBe(3);
    expect(Number(m.percentuali(S, p, '2026-10-01')!.sub)).toBe(4);
    expect(Number(m.percentuali(S, p, '2026-12-15')!.sub)).toBe(4); // anche sulla versione dal 2026-12-01
  });

  it('termina (al escluso): fine nel chiuso 409, non dopo l\'inizio 400, allungare sopra la riga dopo 409', async () => {
    await resp.post(`/eccezioni/${eccSeed}/termina`, { al: '2026-08-15' }).expect(409);
    await resp.post(`/eccezioni/${eccSeed}/termina`, { al: '2026-08-31' }).expect(409); // l'ultimo giorno chiuso deve restare
    await resp.post(`/eccezioni/${eccSeed}/termina`, { al: '2026-10-15' }).expect(409); // si sovrappone al cambio
    await resp.post(`/eccezioni/${id}/termina`, { al: '2026-10-01' }).expect(400);
    await oper.post(`/eccezioni/${id}/termina`, { al: '2027-01-01' }).expect(403);
    const r = await resp.post(`/eccezioni/${id}/termina`, { al: '2027-01-01' }).expect(201);
    expect(r.body).toMatchObject({ valido_dal: '2026-10-01', valido_al: '2027-01-01' });
    // dal giorno escluso si può riaprire, senza sovrapposizione
    await resp.post('/eccezioni', { ...corpo(), valido_dal: '2027-01-01' }).expect(201);
  });

  it('rollback: se il registro fallisce non resta niente', async () => {
    const prima = await db.provvigioni_eccezioni.count();
    const vecchio = SCHEMI['crud.create'];
    SCHEMI['crud.create'] = ['chiave_che_manca'];
    try {
      await resp.post('/eccezioni', { ...corpo(), sconto_min: 10, valido_dal: '2026-10-01' }).expect(500);
      await resp.post(`/eccezioni/${id}/cambia`, { pct_personale: 2, dal: '2026-11-01' }).expect(500);
    } finally {
      SCHEMI['crud.create'] = vecchio;
    }
    expect(await db.provvigioni_eccezioni.count()).toBe(prima);
    expect((await db.provvigioni_eccezioni.findUniqueOrThrow({ where: { id: BigInt(id) } })).valido_al?.toISOString().slice(0, 10)).toBe('2027-01-01');
  });

  it('elimina: operatore 403, responsabile elimina con evento', async () => {
    await oper.del('/eccezioni/' + id).expect(403);
    await resp.del('/eccezioni/' + id).expect(204);
    await resp.del('/eccezioni/' + id).expect(404);
    expect(await db.provvigioni_eccezioni.findUnique({ where: { id: BigInt(id) } })).toBeNull();
    const ev = await db.registro.findFirstOrThrow({ where: { codice: 'crud.delete', entita: 'eccezione', entita_id: BigInt(id) } });
    expect(ev.dettaglio).toMatchObject({ eccezione_id: id, pct_personale: 4.25, valido_al: '2027-01-01' });
  });
});
