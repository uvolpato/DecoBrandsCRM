// Prove dello storico dei legami del vecchio CRM (F1-A12, D-112, §4.7.2-4.7.4).
import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { Module } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { configura } from '../src/main';
import { cifra } from '../src/password';
import { PrismaService } from '../src/prisma.service';
import { svuota } from './svuota';
import { seed } from '../prisma/seed';
import { importaStorico } from '../prisma/import-storico';
import { cercaLegame, normalizzaPiva, segnaUsata } from '../src/storico';

@Module({ imports: [AppModule] })
class ProvaModule {}

let app: NestExpressApplication;
let db: PrismaService;
const DOMINIO = '@prova-storico.it';
const PW = 'password-di-prova';
const ESTRATTO = new Date('2026-11-08T00:00:00Z');

const sessioni: Record<string, Awaited<ReturnType<typeof apri>>> = {};
const entra = async (utente: string) => (sessioni[utente] ??= await apri(utente));
async function apri(utente: string) {
  const agente = request.agent(app.getHttpServer());
  const r = await agente.post('/api/accesso/entra').send({ utente, password: PW }).expect(200);
  const csrf = r.body.csrf as string;
  return {
    get: (p: string) => agente.get('/api' + p),
    post: (p: string, b: object = {}) => agente.post('/api' + p).set('x-csrf-token', csrf).send(b),
  };
}

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [ProvaModule] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
  db = app.get(PrismaService);
  await svuota(db);
  await seed(db);
  // utente con lettura dati (può consultare lo storico)
  await db.utenti.create({ data: { username: 'lett', email: 'lett' + DOMINIO, nome: 'Prova lett', ruolo: 'utente', password_hash: await cifra(PW), deve_cambiare_password: false, aree: { create: [{ area: 'dati', livello: 'lettura' }] } } });
  // utente senza area dati (non può consultare lo storico)
  await db.utenti.create({ data: { username: 'provv', email: 'provv' + DOMINIO, nome: 'Prova provv', ruolo: 'utente', password_hash: await cifra(PW), deve_cambiare_password: false, aree: { create: [{ area: 'provvigioni', livello: 'lettura' }] } } });
});

afterAll(async () => {
  await svuota(db);
  await app.close();
});

describe('import storico', () => {
  it('conteggi: 4022 legami, 3403 soggetti, 1625 senza subagente', async () => {
    const r = await importaStorico(db);
    expect(r.righe_lette).toBe(4022);
    expect(r.schede_lette).toBe(3403);
    expect(r.senza_subagente).toBe(1625);
    expect(await db.interscambio_storico.count()).toBe(4022);
    expect(await db.soggetti_storico.count()).toBe(3403);
    expect(await db.interscambio_storico.count({ where: { subagente_nome: null } })).toBe(1625);
  });

  it('idempotenza: il secondo giro non inserisce nulla', async () => {
    const r = await importaStorico(db);
    expect(r.inseriti_legami).toBe(0);
    expect(r.gia_legami).toBe(4022);
    expect(r.inseriti_soggetti).toBe(0);
    expect(r.gia_soggetti).toBe(3403);
    expect(await db.interscambio_storico.count()).toBe(4022);
    expect(await db.soggetti_storico.count()).toBe(3403);
  });

  it('--prova conta ma non scrive', async () => {
    const prima = await db.interscambio_storico.count();
    const r = await importaStorico(db, { prova: true });
    expect(r.senza_subagente).toBe(1625); // il conteggio del dato di origine c'è anche senza scrivere
    expect(await db.interscambio_storico.count()).toBe(prima);
    expect(await db.soggetti_storico.count()).toBe(3403);
  });

  it('nessuna FK: una riga si inserisce senza che esistano i ruoli', async () => {
    const creata = await db.interscambio_storico.create({ data: {
      fonte: 'vecchio_crm', estratto_il: ESTRATTO,
      cliente_legacy_id: 999999n, fornitore_legacy_id: 999999n,
      cliente_id: 999999n, fornitore_id: 999999n, subagente_id: 999999n, interscambio_id: 999999n,
    } });
    expect(creata.id).toBeTruthy();
  });

  it('--sostituisci svuota e reimporta dentro la transazione (in prova, rollback)', async () => {
    const prima = await db.interscambio_storico.count();
    const r = await importaStorico(db, { sostituisci: true, prova: true });
    expect(r.inseriti_legami).toBe(4022);
    expect(await db.interscambio_storico.count()).toBe(prima);
  });

  it('--sostituisci con una riga già usata: rifiutato, tabelle intatte (R1-10)', async () => {
    const riga = await db.interscambio_storico.findFirstOrThrow({ where: { stato: 'da_usare' } });
    await db.interscambio_storico.update({ where: { id: riga.id }, data: { stato: 'usata', usato_il: new Date() } });
    const prima = await db.interscambio_storico.count();
    await expect(importaStorico(db, { sostituisci: true })).rejects.toThrow(/già usate/);
    expect(await db.interscambio_storico.count()).toBe(prima);
    await db.interscambio_storico.update({ where: { id: riga.id }, data: { stato: 'da_usare', usato_il: null } });
  });

  it('P.IVA normalizzata come in soggetti.ts: il prefisso IT non conta (R1-09)', () => {
    expect(normalizzaPiva('IT 012 345 678 90')).toBe('01234567890');
    expect(normalizzaPiva('01234567890')).toBe('01234567890');
  });
});

describe('cercaLegame', () => {
  let fornitoreId: bigint;
  let clienteId: bigint;

  beforeAll(async () => {
    const f = await db.fornitori.create({ data: {} });
    const fv = await db.fornitori_versioni.create({ data: { fornitore_id: f.id, fonte: 'integra', ragione_sociale: 'Fornitore Precedenza' } });
    await db.fornitori.update({ where: { id: f.id }, data: { versione_corrente_id: fv.id } });
    fornitoreId = f.id;

    const c = await db.clienti.create({ data: {} });
    const cv = await db.clienti_versioni.create({ data: { cliente_id: c.id, fonte: 'integra', piva: '12345678901', ragione_sociale: 'NEGOZIO FIORI' } });
    await db.clienti.update({ where: { id: c.id }, data: { versione_corrente_id: cv.id } });
    clienteId = c.id;

    // tre righe: una riconoscibile per codice, una per P.IVA, una per ragione sociale.
    // `fornitore_id` resta NULL come nei dati veri (l'import non lo conosce): il fornitore si
    // riconosce da P.IVA e ragione sociale (D-112).
    await db.interscambio_storico.createMany({ data: [
      { fonte: 'vecchio_crm', estratto_il: ESTRATTO, cliente_legacy_id: 9001n, fornitore_legacy_id: 9001n, fornitore_ragione_sociale: 'Fornitore Precedenza', cliente_codice_fornitore: 'C1', cliente_ragione_sociale: 'ALTRO', cliente_piva_norm: '', subagente_nome: 'SUB-CODICE' },
      { fonte: 'vecchio_crm', estratto_il: ESTRATTO, cliente_legacy_id: 9002n, fornitore_legacy_id: 9002n, fornitore_ragione_sociale: 'Fornitore Precedenza', cliente_codice_fornitore: 'C2', cliente_ragione_sociale: 'ALTRO 2', cliente_piva_norm: '12345678901', subagente_nome: 'SUB-PIVA' },
      { fonte: 'vecchio_crm', estratto_il: ESTRATTO, cliente_legacy_id: 9003n, fornitore_legacy_id: 9003n, fornitore_ragione_sociale: 'Fornitore Precedenza', cliente_codice_fornitore: 'C3', cliente_ragione_sociale: 'NEGOZIO FIORI', cliente_piva_norm: '', subagente_nome: 'SUB-NOME' },
    ] });
  });

  it('il codice del fornitore batte P.IVA e ragione sociale', async () => {
    const r = await cercaLegame(db, { fornitoreId, codice: 'C1', clienteId });
    expect(r.map((x) => x.subagente_nome)).toEqual(['SUB-CODICE']);
  });

  it('la P.IVA batte la ragione sociale', async () => {
    const r = await cercaLegame(db, { fornitoreId, clienteId });
    expect(r.map((x) => x.subagente_nome)).toEqual(['SUB-PIVA']);
  });

  it('la ragione sociale vale quando non c\'è né codice né P.IVA', async () => {
    const c2 = await db.clienti.create({ data: {} });
    const cv2 = await db.clienti_versioni.create({ data: { cliente_id: c2.id, fonte: 'integra', ragione_sociale: 'NEGOZIO FIORI' } });
    await db.clienti.update({ where: { id: c2.id }, data: { versione_corrente_id: cv2.id } });
    const r = await cercaLegame(db, { fornitoreId, clienteId: c2.id });
    expect(r.map((x) => x.subagente_nome)).toEqual(['SUB-NOME']);
  });

  it('funziona senza fornitore_id collegato, come nei dati veri', async () => {
    const r = await cercaLegame(db, { fornitoreId, codice: 'C2' });
    expect(r.map((x) => x.subagente_nome)).toEqual(['SUB-PIVA']);
  });

  it('segnaUsata dentro la transazione di chi crea l\'agenzia', async () => {
    const riga = await db.interscambio_storico.findFirstOrThrow({ where: { cliente_codice_fornitore: 'C1' } });
    await db.$transaction(async (tx) => { await segnaUsata(tx, riga.id, 999999n, 'usata dalla prova'); });
    const dopo = await db.interscambio_storico.findUniqueOrThrow({ where: { id: riga.id } });
    expect(dopo.stato).toBe('usata');
    expect(dopo.interscambio_id).toBe(999999n);
    expect(dopo.usato_il).toBeTruthy();
  });
});

describe('rotta /api/interscambio/storico', () => {
  it('senza dati.consulta: 403', async () => {
    await (await entra('provv')).get('/interscambio/storico').expect(403);
  });

  it('rappresentato falso quando il subagente è vuoto', async () => {
    const f = await db.fornitori.create({ data: {} });
    const fv = await db.fornitori_versioni.create({ data: { fornitore_id: f.id, fonte: 'integra', ragione_sociale: 'Fornitore Rappresentanza' } });
    await db.fornitori.update({ where: { id: f.id }, data: { versione_corrente_id: fv.id } });
    await db.interscambio_storico.create({ data: {
      fonte: 'vecchio_crm', estratto_il: ESTRATTO, cliente_legacy_id: 8001n, fornitore_legacy_id: 8001n,
      fornitore_ragione_sociale: 'Fornitore Rappresentanza', cliente_codice_fornitore: 'RAP-1', cliente_ragione_sociale: 'Cliente senza rappresentanza',
      subagente_nome: null, sconto_1: 0, sconto_2: 0,
    } });
    const r = await (await entra('lett')).get(`/interscambio/storico?fornitore_id=${f.id}&codice=RAP-1`).expect(200);
    expect(r.body).toHaveLength(1);
    expect(r.body[0].rappresentato).toBe(false);
    expect(r.body[0].subagente_nome).toBeNull();
  });

  it('D-134: subagente_id dal nome se è uno solo; omonimi o assente → null', async () => {
    const f = await db.fornitori.create({ data: {} });
    const fv = await db.fornitori_versioni.create({ data: { fornitore_id: f.id, fonte: 'integra', ragione_sociale: 'Fornitore Nomi' } });
    await db.fornitori.update({ where: { id: f.id }, data: { versione_corrente_id: fv.id } });
    const base = await db.subagenti.findFirstOrThrow();
    const unico = await db.subagenti.create({ data: { agente_id: base.agente_id, codice: 'PROVA-UNICO', nome: 'Provaunico', cognome: 'Cognomeunico' } });
    await db.subagenti.create({ data: { agente_id: base.agente_id, codice: 'PROVA-OM-1', nome: 'Omonimo', cognome: 'Prova' } });
    await db.subagenti.create({ data: { agente_id: base.agente_id, codice: 'PROVA-OM-2', nome: 'Omonimo', cognome: 'Prova' } });
    await db.interscambio_storico.createMany({ data: [
      { fonte: 'vecchio_crm', estratto_il: ESTRATTO, cliente_legacy_id: 7001n, fornitore_legacy_id: 7001n, fornitore_ragione_sociale: 'Fornitore Nomi', cliente_codice_fornitore: 'NOM-1', subagente_nome: 'Provaunico Cognomeunico' },
      { fonte: 'vecchio_crm', estratto_il: ESTRATTO, cliente_legacy_id: 7002n, fornitore_legacy_id: 7002n, fornitore_ragione_sociale: 'Fornitore Nomi', cliente_codice_fornitore: 'NOM-2', subagente_nome: 'Omonimo Prova' },
      { fonte: 'vecchio_crm', estratto_il: ESTRATTO, cliente_legacy_id: 7003n, fornitore_legacy_id: 7003n, fornitore_ragione_sociale: 'Fornitore Nomi', cliente_codice_fornitore: 'NOM-3', subagente_nome: 'Nessuno In Anagrafica' },
    ] });
    const a = await entra('lett');
    const riga = async (codice: string) => (await a.get(`/interscambio/storico?fornitore_id=${f.id}&codice=${codice}`).expect(200)).body[0];
    expect((await riga('NOM-1')).subagente_id).toBe(String(unico.id));
    expect((await riga('NOM-2')).subagente_id).toBeNull();
    expect((await riga('NOM-3')).subagente_id).toBeNull();
  });
});
