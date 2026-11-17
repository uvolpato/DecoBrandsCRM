import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configura } from '../src/main';
import { cifra } from '../src/password';
import { PrismaService } from '../src/prisma.service';
import { svuota } from './svuota';
import { seed } from '../prisma/seed';

// D-201 §19 (prova d'integrazione): più righe dello stesso bollettino per la stessa fattura si raggruppano
// (una sola voce, differenza sul gruppo) e la decisione presa su una riga si applica a tutte; il doppione
// resta solo fra bollettini diversi. Scenario Arte costruito a mano: fornitore con scaglione 0 → 15 %.

let app: NestExpressApplication;
let db: PrismaService;
const DOMINIO = '@prova-quota.it';
const PW = 'password-di-prova';

async function creaUtente(username: string, livello: string) {
  await db.utenti.create({
    data: {
      username, email: username + DOMINIO, nome: 'Prova ' + username, ruolo: 'utente',
      aree: { create: [{ area: 'provvigioni', livello }] }, password_hash: await cifra(PW), deve_cambiare_password: false,
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
let op: Awaited<ReturnType<typeof apri>>;
let lett: Awaited<ReturnType<typeof apri>>;

/** Scenario Arte: fornitore (0 → 15 %), cliente, agenzia, una fattura e un bollettino con due righe sulla stessa fattura. */
let scenarioN = 0;
async function scenario() {
  scenarioN++;
  const s = String(scenarioN);
  const f = await db.fornitori.create({ data: {} });
  const fv = await db.fornitori_versioni.create({ data: { fornitore_id: f.id, fonte: 'integra', ragione_sociale: 'Arte Test' } });
  await db.fornitori.update({ where: { id: f.id }, data: { versione_corrente_id: fv.id } });
  const c = await db.clienti.create({ data: {} });
  const cv = await db.clienti_versioni.create({ data: { cliente_id: c.id, fonte: 'integra', ragione_sociale: 'Cliente Test' } });
  await db.clienti.update({ where: { id: c.id }, data: { versione_corrente_id: cv.id } });
  const ag = await db.agenti.create({ data: { codice: 'AGQ' + s, nome: 'Agente', cognome: 'Test' } });
  const sub = await db.subagenti.create({ data: { agente_id: ag.id, codice: 'SUBQ' + s, nome: 'Sub', cognome: 'Test' } });
  await db.interscambio.create({ data: { subagente_id: sub.id, cliente_id: c.id, fornitore_id: f.id, sconto: 0, valido_dal: new Date('2025-01-01') } });
  await db.provvigioni_scaglioni.create({ data: { fornitore_id: f.id, sconto_min: 0, pct_agente: 15, pct_subagente: 8, valido_dal: new Date('2025-01-01') } });
  const t = await db.ordini_fornitore_testata.create({ data: { fornitore_id: f.id, fornitore_versione_id: fv.id, cliente_id: c.id, cliente_versione_id: cv.id, numero_ordine: 'OF/2026/9' + s, data_ordine: new Date('2026-10-01') } });
  const d = await db.ordini_fornitore_documenti.create({ data: { testata_id: t.id, tipo: 'fattura', numero: 'RE193071', data: new Date('2026-10-15'), importo: 2117.30 } });
  const b = await db.bollettini_testata.create({ data: { fornitore_id: f.id, fornitore_versione_id: fv.id, mese: 10, anno: 2026 } });
  await db.bollettini_righe.createMany({ data: [
    { testata_id: b.id, fattura_numero: 'RE193071', fattura_data: new Date('2026-10-15'), importo_merce: 247.60, pct_riconosciuta: 10, importo_riconosciuto: 23.77, quota_pagata: 96 },
    { testata_id: b.id, fattura_numero: 'RE193071', fattura_data: new Date('2026-10-15'), importo_merce: 1869.70, pct_riconosciuta: 15, importo_riconosciuto: 269.24, quota_pagata: 96 },
  ] });
  return { f, fv, d, b };
}

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
  db = app.get(PrismaService);
  await svuota(db);
  await seed(db);
  await creaUtente('op-quota', 'operatore');
  await creaUtente('lett-quota', 'lettura');
  op = await apri('op-quota');
  lett = await apri('lett-quota');
}, 120_000);

afterAll(async () => {
  const utenti = (await db.utenti.findMany({ where: { email: { endsWith: DOMINIO } } })).map((u) => u.id);
  await svuota(db); // prima i bollettini: le righe decise puntano agli utenti di prova
  await db.$transaction([
    db.$executeRaw`SET LOCAL decobrands.pulizia_registro = 'si'`,
    db.registro.deleteMany({ where: { utente_id: { in: utenti } } }),
    db.sessioni.deleteMany({ where: { utente_id: { in: utenti } } }),
    db.utenti.deleteMany({ where: { id: { in: utenti } } }),
  ]);
  await app.close();
});

describe('più righe per la stessa fattura (D-201, integrazione)', () => {
  it('il bollettino mostra un solo gruppo con differenza −11,88 e il dettaglio delle due righe', async () => {
    const { b } = await scenario();
    const r = (await lett.get(`/bollettini/${b.id}`).expect(200)).body;
    expect(r.righe).toHaveLength(1);
    const x = r.righe[0];
    expect(x.numero).toBe('RE193071');
    expect(x.categoria).toBe('differenza');
    expect(x.loro.importo).toBeCloseTo(293.01, 2);
    expect(x.noi.importo).toBeCloseTo(304.89, 2);
    expect(x.differenza).toBeCloseTo(-11.88, 2);
    expect(x.quota).toBeCloseTo(96, 2);
    expect(x.quote_diverse).toBe(false);
    expect(x.righe).toHaveLength(2);
    expect(x.righe.map((q: any) => [q.importo, q.pct, q.quota])).toEqual([[23.77, 10, 96], [269.24, 15, 96]]);
  });

  it('una sola decisione per il gruppo: decisa una riga, la decisione vale su tutte', async () => {
    const { b } = await scenario();
    const righe = await db.bollettini_righe.findMany({ where: { testata_id: b.id }, orderBy: { id: 'asc' } });
    const r = (await op.put(`/bollettini/${b.id}/righe/${righe[0].id}/decisione`, { decisione: 'accettato', motivo: 'ok' }).expect(200)).body;
    expect(r.righe[0].gruppo).toBe('decise');
    const dopo = await db.bollettini_righe.findMany({ where: { testata_id: b.id }, orderBy: { id: 'asc' } });
    expect(dopo.map((x) => x.decisione)).toEqual(['accettato', 'accettato']);
  });

  it('stessa fattura in due bollettini diversi: l\'abbinamento resta rifiutato (409)', async () => {
    const { f, fv, d } = await scenario();
    // un secondo bollettino (novembre) con una riga sulla stessa fattura, non ancora abbinata
    const b2 = await db.bollettini_testata.create({ data: { fornitore_id: f.id, fornitore_versione_id: fv.id, mese: 11, anno: 2026 } });
    const r2 = await db.bollettini_righe.create({ data: { testata_id: b2.id, fattura_numero: 'RE193071', fattura_data: new Date('2026-10-15'), importo_merce: 2117.30, pct_riconosciuta: 15, importo_riconosciuto: 304.89 } });
    await op.put(`/bollettini/${b2.id}/righe/${r2.id}/documento`, { documento_id: Number(d.id) }).expect(409);
  });
});
