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

// D-200 §19: impostazione «Scaglioni» sul fornitore (a fascia | solo sconti esatti). Il server valida,
// scrive l'evento (prima/dopo) e ricalcola gli aperti; i congelati restano (D-183). V12/V13.

let app: NestExpressApplication;
let db: PrismaService;
const DOMINIO = '@prova-scaglioni-esatti.it';
const PW = 'password-di-prova';

async function creaUtente(username: string, livello: string, dati: string | null) {
  await db.utenti.create({
    data: {
      username, email: username + DOMINIO, nome: 'Prova ' + username, ruolo: 'utente',
      aree: { create: [{ area: 'provvigioni', livello }, ...(dati ? [{ area: 'dati', livello: dati }] : [])] },
      password_hash: await cifra(PW), deve_cambiare_password: false,
    },
  });
}
async function apri(utente: string) {
  const agente = request.agent(app.getHttpServer());
  const csrf = (await agente.post('/api/accesso/entra').send({ utente, password: PW }).expect(200)).body.csrf as string;
  return {
    get: (p: string) => agente.get('/api' + p),
    put: (p: string, b: object) => agente.put('/api' + p).set('x-csrf-token', csrf).send(b),
  };
}
let lett: Awaited<ReturnType<typeof apri>>;

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
  db = app.get(PrismaService);
  await svuota(db);
  await seed(db);
  await creaUtente('ammi-esatti', 'responsabile', 'responsabile');
  await creaUtente('lett-esatti', 'lettura', null);
  lett = await apri('lett-esatti');
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

describe('scaglioni esatti sul fornitore (D-200)', () => {
  it('il valore non booleano è rifiutato, il responsabile lo cambia e scrive l\'evento', async () => {
    const ammi = await apri('ammi-esatti');
    const f = await db.fornitori.findFirstOrThrow();
    await ammi.put(`/fornitori/${f.id}`, { scaglioni_esatti: 'strano' }).expect(400);
    const r = await ammi.put(`/fornitori/${f.id}`, { scaglioni_esatti: true }).expect(200);
    expect(r.body.scaglioni_esatti).toBe(true);
    expect((await db.fornitori.findUniqueOrThrow({ where: { id: f.id } })).scaglioni_esatti).toBe(true);
    const ev = await db.registro.findFirst({ where: { codice: 'crud.update', entita: 'fornitore', entita_id: f.id }, orderBy: { id: 'desc' } });
    expect(ev!.dettaglio).toMatchObject({ prima: { scaglioni_esatti: false }, dopo: { scaglioni_esatti: true } });
    await ammi.put(`/fornitori/${f.id}`, { scaglioni_esatti: false }).expect(200); // ripristina
  });

  it('chi non ha dati.condizioni non lo cambia (403)', async () => {
    const f = await db.fornitori.findFirstOrThrow();
    await lett.put(`/fornitori/${f.id}`, { scaglioni_esatti: true }).expect(403);
  });

  it('cambio dell\'impostazione: l\'aperto si ricalcola (scaglioni_esatti nel calcolo), il congelato resta', async () => {
    const gries = (await db.provvigioni_eccezioni.findFirstOrThrow()).fornitore_id;
    const aperti = await db.ordini_fornitore_documenti.findMany({
      where: { testata: { fornitore_id: gries }, tipo: 'fattura', congelato_il: null },
      orderBy: { id: 'asc' },
    });
    expect(aperti.length).toBeGreaterThanOrEqual(2);
    await db.$transaction((tx) => ricalcolaDocumentiAperti(tx, gries));
    await db.ordini_fornitore_documenti.update({ where: { id: aperti[1].id }, data: { congelato_il: new Date() } });
    const congelatoPrima = (await db.ordini_fornitore_documenti.findUniqueOrThrow({ where: { id: aperti[1].id } })).calcolo;
    const ammi = await apri('ammi-esatti');
    await ammi.put(`/fornitori/${gries}`, { scaglioni_esatti: true }).expect(200);
    const apertoDopo = (await db.ordini_fornitore_documenti.findUniqueOrThrow({ where: { id: aperti[0].id } })).calcolo as { scaglioni_esatti?: boolean };
    const congelatoDopo = (await db.ordini_fornitore_documenti.findUniqueOrThrow({ where: { id: aperti[1].id } })).calcolo;
    expect(apertoDopo.scaglioni_esatti).toBe(true); // l'aperto riflette la nuova impostazione
    expect(congelatoDopo).toEqual(congelatoPrima); // il congelato resta come alla chiusura
    await ammi.put(`/fornitori/${gries}`, { scaglioni_esatti: false }).expect(200); // ripristina
  });
});
