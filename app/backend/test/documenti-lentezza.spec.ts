import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configura } from '../src/main';
import { cifra } from '../src/password';
import { PrismaService } from '../src/prisma.service';
import { IntegraService } from '../src/integra';
import { cerca, TEMPO_AUTO_MS } from '../src/anagrafica-integra';

// Controllo di non regressione della pagina Documenti (17/11/2026): la coda e il dettaglio non devono
// fermarsi sul ponte di Integra. Misura su una copia del database (DATABASE_URL_TEST → decobrands_test_perf);
// niente svuota né seed. Soglia larga (2 s) per non rendere la prova fragile.

let app: NestExpressApplication;
let db: PrismaService;
const DOMINIO = '@prova-lentezza.it';
const PW = 'password-di-prova';

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
  db = app.get(PrismaService);
}, 60_000);

afterAll(async () => {
  const utenti = (await db.utenti.findMany({ where: { email: { endsWith: DOMINIO } } })).map((u) => u.id);
  await db.$transaction([
    db.sessioni.deleteMany({ where: { utente_id: { in: utenti } } }),
    db.utenti.deleteMany({ where: { id: { in: utenti } } }),
  ]);
  await app.close();
});

describe('documenti: tempi della coda e del dettaglio', () => {
  // misura solo sulla copia dei dati veri: su un database di prova vuoto non c'è nessun documento da aprire
  (/decobrands_test_perf/.test(process.env.DATABASE_URL ?? '') ? it : it.skip)('coda e dettaglio sotto la soglia, anche con il ponte di Integra lento', async () => {
    const nome = 'perf-' + Date.now();
    await db.utenti.create({
      data: {
        username: nome, email: nome + DOMINIO, nome: 'Prova ' + nome, ruolo: 'utente',
        aree: { create: [{ area: 'provvigioni', livello: 'operatore' }] },
        password_hash: await cifra(PW), deve_cambiare_password: false,
      },
    });
    const agente = request.agent(app.getHttpServer());
    await agente.post('/api/accesso/entra').send({ utente: nome, password: PW }).expect(200);
    const get = (p: string) => agente.get('/api' + p);

    // riscaldamento: il primo giro a freddo (jit, connessioni) non conta
    const caldo = await get('/documenti?stato=aperte&pagina=1&per_pagina=200');
    expect(caldo.status).toBe(200);

    let elenco: any;
    const tempiElenco: number[] = [];
    for (let i = 0; i < 3; i++) {
      const t0 = process.hrtime.bigint();
      const r = await get('/documenti?stato=aperte&pagina=1&per_pagina=200');
      tempiElenco.push(Number(process.hrtime.bigint() - t0) / 1e6);
      elenco = r.body;
      expect(r.status).toBe(200);
    }
    tempiElenco.sort((a, b) => a - b);

    const primo = elenco.documenti?.[0]?.id;
    expect(primo).toBeTruthy();
    const tempiDettaglio: number[] = [];
    for (let i = 0; i < 3; i++) {
      const t0 = process.hrtime.bigint();
      const r = await get('/documenti/' + primo);
      tempiDettaglio.push(Number(process.hrtime.bigint() - t0) / 1e6);
      expect(r.status).toBe(200);
    }
    tempiDettaglio.sort((a, b) => a - b);

    console.log('documenti coda (3 giri ms): %s → mediano %d', tempiElenco.map((t) => t.toFixed(0)).join(' '), tempiElenco[1]);
    console.log('documenti dettaglio (3 giri ms): %s → mediano %d', tempiDettaglio.map((t) => t.toFixed(0)).join(' '), tempiDettaglio[1]);

    // controllo di non regressione: soglia larga
    expect(tempiElenco[1]).toBeLessThan(2000);
    expect(tempiDettaglio[1]).toBeLessThan(2000);
  }, 120_000);

  it('la ricerca automatica su Integra resta entro TEMPO_AUTO_MS', async () => {
    const integra = app.get(IntegraService);
    const ponte = await integra.ponte();
    if (!ponte) return; // ponte non configurato nella copia: niente da misurare
    const t0 = process.hrtime.bigint();
    await cerca(db, ponte.pool, ponte.schema, 'fornitore', 'Gries', TEMPO_AUTO_MS);
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    console.log('documenti cerca automatica: %d ms (TEMPO_AUTO_MS=%d)', ms.toFixed(0), TEMPO_AUTO_MS);
    expect(ms).toBeLessThan(TEMPO_AUTO_MS + 500);
  }, 30_000);
});
