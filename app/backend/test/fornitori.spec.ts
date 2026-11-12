import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { FornitoriController } from '../src/fornitori';
import { configura } from '../src/main';
import { cifra } from '../src/password';
import { PrismaService } from '../src/prisma.service';
import { svuota } from './svuota';
import { seed } from '../prisma/seed';

let app: NestExpressApplication;
let db: PrismaService;
const DOMINIO = '@prova-fornitori.it';
const PW = 'password-di-prova';

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

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule], controllers: [FornitoriController] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
  db = app.get(PrismaService);
  await svuota(db);
  await seed(db);
  if (!(await db.utenti.findFirst({ where: { ruolo: 'superutente' } }))) {
    await db.utenti.create({ data: { username: 'super-forn', email: 'super-forn' + DOMINIO, nome: 'Super', ruolo: 'superutente', password_hash: await cifra(PW), deve_cambiare_password: false } });
  }
  await creaUtente('ammi-forn', 'amministratore', 'responsabile');
  await creaUtente('oper-forn', 'utente', 'operatore');
  await creaUtente('lett-forn', 'utente', 'lettura');
});

afterAll(async () => {
  const utenti = (await db.utenti.findMany({ where: { email: { endsWith: DOMINIO } } })).map((u) => u.id);
  await db.$transaction([
    db.$executeRaw`SET LOCAL decobrands.pulizia_registro = 'si'`,
    db.registro.deleteMany({ where: { OR: [{ utente_id: { in: utenti } }, { entita: { in: ['fornitore', 'scaglione'] } }] } }),
    db.sessioni.deleteMany({ where: { utente_id: { in: utenti } } }),
    db.utenti.deleteMany({ where: { id: { in: utenti } } }),
  ]);
  await svuota(db);
  await app.close();
});

describe('elenco e dettaglio', () => {
  it('consulta: elenco con ragione sociale da Integra', async () => {
    const a = await entra('ammi-forn');
    const r = await a.get('/fornitori').expect(200);
    expect(Array.isArray(r.body)).toBe(true);
    expect(r.body.length).toBeGreaterThan(0);
    expect(r.body[0]).toHaveProperty('ragione_sociale');
    expect(r.body[0]).toHaveProperty('scaglioni');
  });

  it('dettaglio: scaglioni e clienti seguiti', async () => {
    const a = await entra('ammi-forn');
    const lista = (await a.get('/fornitori').expect(200)).body;
    const id = lista[0].id;
    const r = await a.get('/fornitori/' + id).expect(200);
    expect(r.body.id).toBe(id);
    expect(Array.isArray(r.body.scaglioni)).toBe(true);
    expect(Array.isArray(r.body.clienti_seguiti)).toBe(true);
  });

  it('lettura: può consultare', async () => {
    const a = await entra('lett-forn');
    await a.get('/fornitori').expect(200);
  });

  it('mancano_scaglioni: vero senza versioni, vero con sole versioni future, falso se c’è quella in vigore', async () => {
    const a = await entra('ammi-forn');
    // il seed ha MCL SRL senza percentuali (D-113: un fornitore importato nasce senza)
    const senza = await db.fornitori.findFirstOrThrow({ where: { scaglioni: { none: {} } }, orderBy: { id: 'asc' } });
    expect((await a.get('/fornitori/' + senza.id).expect(200)).body.mancano_scaglioni).toBe(true);
    // una versione che comincia domani non vale oggi: mancano lo stesso
    const futuro = await db.fornitori.create({ data: {} });
    await db.provvigioni_scaglioni.create({ data: { fornitore_id: futuro.id, sconto_min: 0, pct_agente: 10, pct_subagente: 2, valido_dal: new Date('2050-01-01') } });
    expect((await a.get('/fornitori/' + futuro.id).expect(200)).body.mancano_scaglioni).toBe(true);
    // chi ha una versione già in vigore non ha l’avviso
    const con = await db.fornitori.findFirstOrThrow({ where: { scaglioni: { some: {} } }, orderBy: { id: 'asc' } });
    expect((await a.get('/fornitori/' + con.id).expect(200)).body.mancano_scaglioni).toBe(false);
  });
});

describe('sconti in vigore', () => {
  it('per fornitore le soglie dell’ultima versione non futura (R2-06)', async () => {
    const f = await db.fornitori.create({ data: {} });
    // tre versioni: vale la 2021 (la 2099 è futura, la 2020 è superata)
    const versioni: [string, number[]][] = [['2020-01-01', [0, 10]], ['2021-01-01', [0, 10, 20]], ['2099-01-01', [0]]];
    for (const [dal, sconti] of versioni) {
      await db.provvigioni_scaglioni.createMany({ data: sconti.map((sconto_min) => ({ fornitore_id: f.id, valido_dal: new Date(dal), sconto_min, pct_agente: 10, pct_subagente: 2 })) });
    }
    const a = await entra('lett-forn');
    const r = await a.get('/fornitori/sconti-in-vigore').expect(200);
    const voce = r.body.find((x: { fornitore_id: string }) => x.fornitore_id === String(f.id));
    expect(voce.sconti).toEqual([0, 10, 20]);
  });
});

describe('modifica regole', () => {
  it('null su una regola obbligatoria: 400, non 500', async () => {
    const a = await entra('ammi-forn');
    const id = (await a.get('/fornitori').expect(200)).body[0].id;
    await a.put('/fornitori/' + id, { giorno_bollettino: null }).expect(400);
  });

  it('responsabile modifica e scrive nel registro', async () => {
    const a = await entra('ammi-forn');
    const lista = (await a.get('/fornitori').expect(200)).body;
    const id = lista[0].id;
    const prima = (await a.get('/fornitori/' + id).expect(200)).body;
    const r = await a.put('/fornitori/' + id, { giorni_attesa_conferma: 45, note: 'nota di prova' }).expect(200);
    expect(r.body.giorni_attesa_conferma).toBe(45);
    expect(r.body.note).toBe('nota di prova');
    const ev = await db.registro.findFirst({ where: { codice: 'crud.update', entita: 'fornitore', entita_id: BigInt(id) }, orderBy: { id: 'desc' } });
    expect(ev).not.toBeNull();
    // ripristina
    await a.put('/fornitori/' + id, { giorni_attesa_conferma: prima.giorni_attesa_conferma, note: prima.note });
  });

  it('operatore non modifica le condizioni (403)', async () => {
    const a = await entra('oper-forn');
    const lista = (await (await entra('ammi-forn')).get('/fornitori').expect(200)).body;
    const id = lista[0].id;
    await a.put('/fornitori/' + id, { giorni_attesa_conferma: 10 }).expect(403);
  });
});


