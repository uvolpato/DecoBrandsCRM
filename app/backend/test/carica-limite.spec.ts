// Prova del tetto ai caricamenti dei documenti (OWASP): TENTATIVI_CARICAMENTI per utente.
import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configura } from '../src/main';
import { cifra } from '../src/password';
import { PrismaService } from '../src/prisma.service';
import { svuota } from './svuota';

let app: NestExpressApplication;
let db: PrismaService;
const DOMINIO = '@prova-carica.it';
const PW = 'password-di-prova';

beforeAll(async () => {
  process.env.TENTATIVI_CARICAMENTI = '2';
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
  db = app.get(PrismaService);
  await svuota(db);
  await db.utenti.create({
    data: {
      username: 'op-carica', email: 'op-carica' + DOMINIO, nome: 'Prova carica', ruolo: 'utente',
      aree: { create: [{ area: 'provvigioni', livello: 'operatore' }] },
      password_hash: await cifra(PW), deve_cambiare_password: false,
    },
  });
});

afterAll(async () => {
  await svuota(db);
  await app.close();
  delete process.env.TENTATIVI_CARICAMENTI;
});

it('oltre TENTATIVI_CARICAMENTI: il terzo caricamento è 429', async () => {
  const agente = request.agent(app.getHttpServer());
  const csrf = (await agente.post('/api/accesso/entra').send({ utente: 'op-carica', password: PW }).expect(200)).body.csrf as string;
  const carica = (i: number) => agente.post('/api/documenti/carica').set('x-csrf-token', csrf)
    .attach('file', Buffer.from(`%PDF-1.4\n% ${i}\n%%EOF\n`), `fattura-${i}.pdf`);
  expect((await carica(1)).status).toBe(201);
  expect((await carica(2)).status).toBe(201);
  expect((await carica(3)).status).toBe(429);
});
