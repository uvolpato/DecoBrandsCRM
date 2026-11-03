import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configura } from '../src/main';
import { caricaDati } from '../src/motore/dati';
import { pagamentiDaSollecitare } from '../src/motore/motore';
import { cifra } from '../src/password';
import { PrismaService } from '../src/prisma.service';
import { seed } from '../prisma/seed';
import { svuota } from './svuota';

// F3-A3: incassi dei clienti (stato d'incasso, "segna come non pagata/pagata", solleciti).

/* eslint-disable @typescript-eslint/no-explicit-any */
let app: NestExpressApplication;
let db: PrismaService;
const DOMINIO = '@prova-incassi.it';
const PW = 'password-di-prova';

async function creaUtente(username: string, livello: string) {
  await db.utenti.create({
    data: {
      username, email: username + DOMINIO, nome: 'Prova ' + username, ruolo: 'utente',
      aree: { create: [{ area: 'provvigioni', livello }] }, password_hash: await cifra(PW), deve_cambiare_password: false,
    },
  });
}
async function entra(utente: string) {
  const agente = request.agent(app.getHttpServer());
  const csrf = (await agente.post('/api/accesso/entra').send({ utente, password: PW }).expect(200)).body.csrf as string;
  return {
    get: (p: string) => agente.get('/api' + p),
    post: (p: string, b: object = {}) => agente.post('/api' + p).set('x-csrf-token', csrf).send(b),
    put: (p: string, b: object) => agente.put('/api' + p).set('x-csrf-token', csrf).send(b),
  };
}
let op: Awaited<ReturnType<typeof entra>>;
let lett: Awaited<ReturnType<typeof entra>>;

const documento = async (numero: string) => {
  const d = await db.ordini_fornitore_documenti.findFirstOrThrow({ where: { numero }, select: { id: true, testata_id: true, tipo: true } });
  const t = await db.ordini_fornitore_testata.findUniqueOrThrow({ where: { id: d.testata_id }, select: { cliente_id: true } });
  return { id: d.id, testata_id: d.testata_id, tipo: d.tipo, cliente_id: t.cliente_id };
};
const eventi = (codice: string, entita_id: bigint) => db.registro.count({ where: { codice, entita_id } });

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
  db = app.get(PrismaService);
  await svuota(db);
  await seed(db);
  await creaUtente('op-inc', 'operatore');
  await creaUtente('lett-inc', 'lettura');
  [op, lett] = await Promise.all([entra('op-inc'), entra('lett-inc')]);
}, 120_000);

afterAll(async () => {
  const utenti = (await db.utenti.findMany({ where: { email: { endsWith: DOMINIO } } })).map((u) => u.id);
  await svuota(db);
  await db.$transaction([
    db.$executeRaw`SET LOCAL decobrands.pulizia_registro = 'si'`,
    db.registro.deleteMany({ where: { utente_id: { in: utenti } } }),
    db.sessioni.deleteMany({ where: { utente_id: { in: utenti } } }),
    db.utenti.deleteMany({ where: { id: { in: utenti } } }),
  ]);
  await app.close();
});

describe('F3-A3 incassi dei clienti', () => {
  it('pagamentiDaSollecitare: solo insoluta e da_verificare, mai una fattura pagata', async () => {
    const S = await caricaDati(db, '2026-09-04');
    const voci = pagamentiDaSollecitare(S);
    // F-2026-0891 (Gries, maturato): 64 giorni > 60 → da verificare. F-2026-0858 pagata, F-2026-0822 ancora da incassare.
    expect(voci.map((v) => v.numero)).toContain('F-2026-0891');
    expect(voci.find((v) => v.numero === 'F-2026-0891')!.stato.stato).toBe('da_verificare');
    expect(voci.map((v) => v.numero)).not.toContain('F-2026-0858');
    expect(voci.map((v) => v.numero)).not.toContain('F-2026-0822');
    for (const v of voci) expect(['insoluta', 'da_verificare']).toContain(v.stato.stato);
  });

  it('GET /api/pagamenti/solleciti: voci e un testo per cliente', async () => {
    const r = (await op.get('/pagamenti/solleciti').expect(200)).body;
    expect(r.voci.map((v: any) => v.numero)).toContain('F-2026-0891');
    const c = r.per_cliente.find((x: any) => x.fatture.includes('F-2026-0891'));
    expect(c).toBeTruthy();
    expect(c.testo).toContain('F-2026-0891');
    expect(c.testo).toContain('Decobrands SRL');
    expect(c.fatture).toContain('F-2026-0891');
  });

  it('PUT /api/documenti/:id/incasso: segna non pagata, compare fra i solleciti, evento', async () => {
    const d = await documento('F-2026-0822');
    expect(d.tipo).toBe('fattura');
    await op.put(`/documenti/${d.id}/incasso`, { stato: 'boh' }).expect(400);
    const r = (await op.put(`/documenti/${d.id}/incasso`, { stato: 'insoluta', nota: 'email di Gasper del 3/9' }).expect(200)).body;
    expect(r.stato_incasso).toBe('insoluta');
    expect(await eventi('stato.change_state', d.id)).toBe(1);
    // ora è fra i pagamenti da sollecitare, nello stato della pratica e nel dettaglio
    const solleciti = (await op.get('/pagamenti/solleciti').expect(200)).body;
    expect(solleciti.voci.map((v: any) => v.numero)).toContain('F-2026-0822');
    expect(solleciti.voci.find((v: any) => v.numero === 'F-2026-0822').stato.stato).toBe('insoluta');
    const pratica = (await op.get(`/pratiche/${d.testata_id}`).expect(200)).body;
    expect(pratica.incassi.find((x: any) => x.numero === 'F-2026-0822').stato).toMatchObject({ stato: 'insoluta', manuale: true });
  });

  it('PUT /api/documenti/:id/incasso su una nota di credito: 400', async () => {
    const nc = await db.ordini_fornitore_documenti.findFirstOrThrow({ where: { tipo: 'nota_credito' }, select: { id: true } });
    await op.put(`/documenti/${nc.id}/incasso`, { stato: 'insoluta' }).expect(400);
  });

  it('POST /api/pagamenti/solleciti: registra il sollecito e scrive l\'evento', async () => {
    const d = await documento('F-2026-0822');
    await op.put(`/documenti/${d.id}/incasso`, { stato: 'insoluta', nota: 'x' }).expect(200);
    const prima = (await db.ordini_fornitore_documenti.findUniqueOrThrow({ where: { id: d.id } })).solleciti;
    const r = (await op.post('/pagamenti/solleciti', { cliente_id: Number(d.cliente_id) }).expect(201)).body;
    expect(r.fatture).toBeGreaterThanOrEqual(1);
    expect(Number(r.solleciti)).toBe(prima + 1);
    expect((await db.ordini_fornitore_documenti.findUniqueOrThrow({ where: { id: d.id } })).solleciti).toBe(prima + 1);
    expect(await eventi('documento.export', d.id)).toBe(0); // l'evento è per cliente, non per documento
    expect(await db.registro.count({ where: { codice: 'documento.export' } })).toBeGreaterThanOrEqual(1);
  });

  it('POST solleciti per un cliente senza fatture da sollecitare: 404', async () => {
    await op.post('/pagamenti/solleciti', { cliente_id: 999999999 }).expect(404);
  });

  it('la lettura consulta ma non può segnare né registrare (permessi)', async () => {
    await lett.get('/pagamenti/solleciti').expect(200);
    const d = await documento('F-2026-0822');
    await lett.put(`/documenti/${d.id}/incasso`, { stato: 'pagata' }).expect(403);
    await lett.post('/pagamenti/solleciti', { cliente_id: Number(d.cliente_id) }).expect(403);
  });
});
