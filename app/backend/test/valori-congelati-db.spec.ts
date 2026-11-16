import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configura } from '../src/main';
import { cifra } from '../src/password';
import { ricalcolaDocumentiAperti } from '../src/pratiche';
import { PrismaService } from '../src/prisma.service';
import { svuota } from './svuota';
import { seed } from '../prisma/seed';

// D-183 §19: un documento congelato (bollettino verificato o liquidazione chiusa) non si modifica
// dal server; il parametro delle spese nella base lo cambia solo chi ha dati.condizioni (403).
let app: NestExpressApplication;
let db: PrismaService;
const DOMINIO = '@prova-congelati.it';
const PW = 'password-di-prova';

async function apri(utente: string) {
  const agente = request.agent(app.getHttpServer());
  const r = await agente.post('/api/accesso/entra').send({ utente, password: PW }).expect(200);
  const csrf = r.body.csrf as string;
  return {
    get: (p: string) => agente.get('/api' + p),
    put: (p: string, b: object) => agente.put('/api' + p).set('x-csrf-token', csrf).send(b),
    post: (p: string, b: object = {}) => agente.post('/api' + p).set('x-csrf-token', csrf).send(b),
  };
}

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
  db = app.get(PrismaService);
  await svuota(db);
  await seed(db);
  await db.utenti.create({ data: {
    username: 'op-congelati', email: 'op-congelati' + DOMINIO, nome: 'Operatore', ruolo: 'utente',
    aree: { create: [{ area: 'provvigioni', livello: 'operatore' }, { area: 'dati', livello: 'operatore' }] },
    password_hash: await cifra(PW), deve_cambiare_password: false,
  } });
  await db.utenti.create({ data: {
    username: 'lett-congelati', email: 'lett-congelati' + DOMINIO, nome: 'Lettore', ruolo: 'utente',
    aree: { create: [{ area: 'dati', livello: 'lettura' }] },
    password_hash: await cifra(PW), deve_cambiare_password: false,
  } });
});

afterAll(async () => { await app.close(); });

describe('valori congelati sul server (D-183)', () => {
  it('un documento congelato non si modifica (409)', async () => {
    const op = await apri('op-congelati');
    // una pratica con un documento fiscale aperto (non liquidato)
    const t = await db.ordini_fornitore_testata.findFirstOrThrow({
      where: { documenti: { some: { tipo: 'fattura', liquidazione_id: null } } },
      include: { documenti: { where: { tipo: 'fattura', liquidazione_id: null }, take: 1 } },
    });
    const doc = t.documenti[0];
    // si congela direttamente (come farebbe la chiusura di un bollettino o di una liquidazione)
    await db.ordini_fornitore_documenti.update({ where: { id: doc.id }, data: { congelato_il: new Date() } });
    const r = await op.put(`/pratiche/${t.id}/documenti/${doc.id}`, { numero: doc.numero, data: doc.data.toISOString().slice(0, 10) });
    expect(r.status).toBe(409);
    expect((r.body as { message?: string }).message).toMatch(/periodo chiuso/i);
  });

  it('il parametro delle spese lo cambia solo chi ha dati.condizioni (403 altrimenti)', async () => {
    const lett = await apri('lett-congelati');
    const f = await db.fornitori.findFirstOrThrow();
    const r = await lett.put(`/fornitori/${f.id}`, { spese_base_provvigione: true });
    expect(r.status).toBe(403);
  });

  it('ricalcolo degli aperti: il cambio di percentuali aggiorna l\'aperto e non il congelato (D-183)', async () => {
    const gries = (await db.provvigioni_eccezioni.findFirstOrThrow()).fornitore_id;
    // un documento aperto con una percentuale risolta (agenzia e scaglione): ne riempie il calcolo
    const aperti = await db.ordini_fornitore_documenti.findMany({
      where: { testata: { fornitore_id: gries }, tipo: 'fattura', congelato_il: null },
      orderBy: { id: 'asc' },
    });
    expect(aperti.length).toBeGreaterThanOrEqual(2);
    await db.$transaction((tx) => ricalcolaDocumentiAperti(tx, gries));
    const conPct = [];
    for (const d of aperti) {
      const c = (await db.ordini_fornitore_documenti.findUniqueOrThrow({ where: { id: d.id } })).calcolo as { pct_agente: string | null; regola: string } | null;
      expect(c).not.toBeNull();
      expect(c!.regola).toBe('spese-base-v1');
      if (c!.pct_agente != null) conPct.push(d);
    }
    expect(conPct.length).toBeGreaterThanOrEqual(1); // c'è un aperto con percentuale risolta
    const [aperto, congelato] = conPct;
    // si congela il secondo: da qui non cambia più
    await db.ordini_fornitore_documenti.update({ where: { id: congelato.id }, data: { congelato_il: new Date() } });
    const congelatoPrima = (await db.ordini_fornitore_documenti.findUniqueOrThrow({ where: { id: congelato.id } })).calcolo;
    await db.$transaction(async (tx) => {
      await tx.provvigioni_scaglioni.updateMany({ where: { fornitore_id: gries }, data: { pct_agente: 25 } });
      await ricalcolaDocumentiAperti(tx, gries);
    });
    const apertoDopo = (await db.ordini_fornitore_documenti.findUniqueOrThrow({ where: { id: aperto.id } })).calcolo as { pct_agente: string | null };
    const congelatoDopo = (await db.ordini_fornitore_documenti.findUniqueOrThrow({ where: { id: congelato.id } })).calcolo;
    expect(apertoDopo.pct_agente).toBe('25.00'); // l'aperto riflette la nuova percentuale
    expect(congelatoDopo).toEqual(congelatoPrima); // il congelato resta come alla chiusura
  });
});
