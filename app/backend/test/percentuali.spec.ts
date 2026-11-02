import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configura } from '../src/main';
import { caricaDati } from '../src/motore/dati';
import * as m from '../src/motore/motore';
import { cifra } from '../src/password';
import { PrismaService } from '../src/prisma.service';
import { SCHEMI } from '../src/registro';
import { svuota } from './svuota';
import { seed } from '../prisma/seed';

// F1-A5: percentuali con data di validità ed eccezioni personali (§4.2.2, §4.2.3, §5.11, D-25, D-26).

let app: NestExpressApplication;
let db: PrismaService;
const DOMINIO = '@prova-percentuali.it';
const PW = 'password-di-prova';
let gries: string; // fornitore con l'eccezione di Bastasin sullo sconto 1 % (seed)
let bastasin: string;

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
  const ecc = await db.provvigioni_eccezioni.findFirstOrThrow({ include: { scaglione: true } });
  gries = String(ecc.scaglione.fornitore_id);
  bastasin = String(ecc.subagente_id);
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

describe('percentuali datate', () => {
  it('lettura: una versione dal 2025-01-01 in vigore', async () => {
    const r = await lett.get(`/fornitori/${gries}/percentuali`).expect(200);
    expect(r.body.in_vigore).toBe('2025-01-01');
    expect(r.body.versioni).toHaveLength(1);
    const uno = r.body.versioni[0].scaglioni.find((s: { sconto_min: number }) => s.sconto_min === 1);
    expect(uno.eccezioni).toEqual([expect.objectContaining({ subagente_id: bastasin, pct_personale: 3 })]);
    expect(r.body.versioni[0].scaglioni[0]).toHaveProperty('dal_fornitore', 28);
  });

  it('operatore e lettura: 403 sulla scrittura', async () => {
    const b = { valido_dal: '2026-07-01', scaglioni: GRIES_NUOVE };
    await oper.post(`/fornitori/${gries}/percentuali`, b).expect(403);
    await lett.post(`/fornitori/${gries}/percentuali`, b).expect(403);
  });

  it('dati non validi: 400', async () => {
    const p = `/fornitori/${gries}/percentuali`;
    await resp.post(p, { valido_dal: '2026-02-30', scaglioni: GRIES_NUOVE }).expect(400);
    await resp.post(p, { valido_dal: '01/07/2026', scaglioni: GRIES_NUOVE }).expect(400);
    await resp.post(p, { valido_dal: '2026-07-01', scaglioni: [] }).expect(400);
    await resp.post(p, { valido_dal: '2026-07-01', scaglioni: [{ sconto_min: 0, pct_agente: 101, pct_subagente: 0 }] }).expect(400);
    await resp.post(p, { valido_dal: '2026-07-01', scaglioni: [{ sconto_min: 0, pct_agente: 10.123, pct_subagente: 0 }] }).expect(400);
    await resp.post(p, { valido_dal: '2026-07-01', scaglioni: [GRIES_NUOVE[0], GRIES_NUOVE[0]] }).expect(400);
    // manca una soglia della versione precedente
    const r = await resp.post(p, { valido_dal: '2026-07-01', scaglioni: GRIES_NUOVE.slice(1) }).expect(400);
    expect(r.body.message).toMatch(/Manca lo sconto 0/);
    await resp.post('/fornitori/999999/percentuali', { valido_dal: '2026-07-01', scaglioni: GRIES_NUOVE }).expect(404);
  });

  it('rollback: se il registro fallisce non resta niente', async () => {
    const prima = await db.provvigioni_scaglioni.count();
    const vecchio = SCHEMI['crud.create'];
    SCHEMI['crud.create'] = ['chiave_che_manca'];
    try {
      await resp.post(`/fornitori/${gries}/percentuali`, { valido_dal: '2026-07-01', scaglioni: GRIES_NUOVE }).expect(500);
    } finally {
      SCHEMI['crud.create'] = vecchio;
    }
    expect(await db.provvigioni_scaglioni.count()).toBe(prima);
    expect(await db.provvigioni_eccezioni.count()).toBe(1);
  });

  it('nuova versione dal 2026-07-01: eccezioni copiate, evento, vecchia versione intatta', async () => {
    const r = await resp.post(`/fornitori/${gries}/percentuali`, { valido_dal: '2026-07-01', scaglioni: GRIES_NUOVE }).expect(201);
    expect(r.body.in_vigore).toBe('2026-07-01');
    expect(r.body.versioni.map((v: { valido_dal: string }) => v.valido_dal)).toEqual(['2026-07-01', '2025-01-01']);
    const nuovaUno = r.body.versioni[0].scaglioni.find((s: { sconto_min: number }) => s.sconto_min === 1);
    expect(nuovaUno.eccezioni).toEqual([expect.objectContaining({ subagente_id: bastasin, pct_personale: 3 })]);
    expect(r.body.versioni[1].scaglioni.find((s: { sconto_min: number }) => s.sconto_min === 1).pct_agente).toBe(18);
    const ev = await db.registro.findFirstOrThrow({ where: { codice: 'crud.create', entita: 'scaglione' }, orderBy: { id: 'desc' } });
    expect(ev.dettaglio).toMatchObject({ fornitore_id: gries, valido_dal: '2026-07-01', eccezioni_copiate: 1 });
    expect((ev.dettaglio as { scaglioni: unknown[] }).scaglioni).toHaveLength(6);
  });

  it('data uguale o precedente all\'ultima versione: 400', async () => {
    const p = `/fornitori/${gries}/percentuali`;
    await resp.post(p, { valido_dal: '2026-07-01', scaglioni: GRIES_NUOVE }).expect(400);
    const r = await resp.post(p, { valido_dal: '2026-03-01', scaglioni: GRIES_NUOVE }).expect(400);
    expect(r.body.message).toMatch(/2026-07-01/);
  });

  it('motore: ogni documento con la versione in vigore alla sua data', async () => {
    const S = await caricaDati(db, '2026-09-04');
    const p = S.pratiche.find((x) => x.fornitore_id === gries && m.percentuali(S, x, '2026-06-30') && m.percentuali(S, x, '2026-07-01'))!;
    expect(p).toBeDefined();
    const prima = m.percentuali(S, p, '2026-06-30')!, dopo = m.percentuali(S, p, '2026-07-01')!;
    expect(prima.scaglione.valido_dal).toBe('2025-01-01');
    expect(dopo.scaglione.valido_dal).toBe('2026-07-01');
    expect(Number(dopo.agente)).toBe(GRIES_NUOVE.find((s) => s.sconto_min === Number(dopo.scaglione.sconto))!.pct_agente);
    // l'eccezione copiata vale sullo scaglione nuovo
    const uno = S.scaglioni.find((s) => s.fornitore_id === gries && s.valido_dal === '2026-07-01' && Number(s.sconto) === 1)!;
    expect(S.eccezioni.find((e) => e.scaglione_id === uno.id && e.subagente_id === bastasin)?.pct.toNumber()).toBe(3);
  });

  it('elenco fornitori: conta solo gli scaglioni in vigore oggi', async () => {
    await resp.post(`/fornitori/${gries}/percentuali`, {
      valido_dal: '2099-01-01', scaglioni: [...GRIES_NUOVE, { sconto_min: 50, pct_agente: 1, pct_subagente: 0 }],
    }).expect(201);
    const r = await lett.get('/fornitori').expect(200);
    expect(r.body.find((f: { id: string }) => f.id === gries).scaglioni).toBe(6);
    const v = await lett.get(`/fornitori/${gries}/percentuali`).expect(200);
    expect(v.body.in_vigore).toBe('2026-07-01');
    expect(v.body.versioni[0]).toMatchObject({ valido_dal: '2099-01-01', in_vigore: false });
  });
});

describe('eccezioni personali', () => {
  let id: string;
  const corpo = () => ({ subagente_id: Number(bastasin), fornitore_id: Number(gries), sconto_min: 5, pct_personale: 9.5 });

  it('operatore: 403', async () => {
    await oper.post('/eccezioni', corpo()).expect(403);
  });

  it('dati non validi', async () => {
    await resp.post('/eccezioni', { ...corpo(), pct_personale: 120 }).expect(400);
    await resp.post('/eccezioni', { ...corpo(), sconto_min: 7 }).expect(400); // sconto che il fornitore non ha
    await resp.post('/eccezioni', { ...corpo(), subagente_id: 999999 }).expect(404);
    await resp.post('/eccezioni', { ...corpo(), fornitore_id: 999999 }).expect(404);
  });

  it('inserisce sulla versione in vigore e scrive l\'evento', async () => {
    const r = await resp.post('/eccezioni', corpo()).expect(201);
    expect(r.body).toMatchObject({ subagente_id: bastasin, fornitore_id: gries, sconto_min: 5, valido_dal: '2026-07-01', pct_personale: 9.5, pct_standard: 7 });
    id = r.body.id;
    const ev = await db.registro.findFirstOrThrow({ where: { codice: 'crud.create', entita: 'eccezione', entita_id: BigInt(id) } });
    expect(ev.dettaglio).toMatchObject({ subagente_id: bastasin, scaglione_id: r.body.scaglione_id, pct_personale: 9.5 });
  });

  it('doppia sullo stesso scaglione: 409', async () => {
    const r = await resp.post('/eccezioni', corpo()).expect(409);
    expect(r.body.message).toMatch(/già un'eccezione/);
  });

  it('elenco del subagente', async () => {
    const r = await lett.get(`/eccezioni?subagente_id=${bastasin}`).expect(200);
    expect(r.body.map((e: { sconto_min: number; valido_dal: string }) => `${e.sconto_min}@${e.valido_dal}`).sort())
      .toEqual(['1@2025-01-01', '1@2026-07-01', '1@2099-01-01', '5@2026-07-01']);
  });

  it('modifica: operatore 403, responsabile aggiorna con evento', async () => {
    await oper.put('/eccezioni/' + id, { pct_personale: 4 }).expect(403);
    await resp.put('/eccezioni/' + id, { pct_personale: 4.25 }).expect(200).expect((r) => expect(r.body.pct_personale).toBe(4.25));
    const ev = await db.registro.findFirstOrThrow({ where: { codice: 'crud.update', entita: 'eccezione', entita_id: BigInt(id) } });
    expect(ev.dettaglio).toMatchObject({ prima: { pct_personale: 9.5 }, dopo: { pct_personale: 4.25 } });
  });

  it('elimina: operatore 403, responsabile elimina con evento', async () => {
    await oper.del('/eccezioni/' + id).expect(403);
    await resp.del('/eccezioni/' + id).expect(204);
    await resp.del('/eccezioni/' + id).expect(404);
    expect(await db.provvigioni_eccezioni.findUnique({ where: { id: BigInt(id) } })).toBeNull();
    const ev = await db.registro.findFirstOrThrow({ where: { codice: 'crud.delete', entita: 'eccezione', entita_id: BigInt(id) } });
    expect(ev.dettaglio).toMatchObject({ eccezione_id: id, pct_personale: 4.25 });
  });
});
