// Import su richiesta da Integra (F1-A11, D-111, §4.7.1): cerca e importa, con idempotenza e permessi.
// Il ponte finto decobrands_ponte_prova viene riempito e svuotato da questa prova.
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { Pool } from 'pg';
import { AppModule } from '../src/app.module';
import { configura } from '../src/main';
import { cifra } from '../src/password';
import { PrismaService } from '../src/prisma.service';
import { cerca, importa } from '../src/anagrafica-integra';
import { svuota } from './svuota';

let app: NestExpressApplication;
let db: PrismaService;
let ponte: Pool;
let PONTE_URL: string;
const PW = 'password-di-prova';
const DOMINIO = '@prova-anagrafica-integra.it';
const SCHEMA = 'public';
const sqlPonte = readFileSync(join(__dirname, '..', 'prisma', 'ponte-prova.sql'), 'utf8');

const data = (s: string) => new Date(s);

async function tabelle() {
  await ponte.query(sqlPonte);
}

async function pulisciPonte() {
  await ponte.query('TRUNCATE public.integra_v_clienti, public.integra_v_fornitori');
}

async function mettiCliente(r: Record<string, unknown>) {
  const base = {
    id_integra: 1, codice: 'C00001', ragione_sociale: 'Cliente Uno', piva: '12345678901',
    codice_fiscale: null, indirizzo: null, cap: null, citta: null, provincia: null, paese: 'Italia',
    email: null, pec: null, codice_agente: null, attivo: true, modificato_il: data('2026-09-04T09:00:00Z'),
  };
  const v = { ...base, ...r };
  await ponte.query(
    `INSERT INTO public.integra_v_clienti (id_integra, codice, ragione_sociale, piva, codice_fiscale, indirizzo, cap, citta, provincia, paese, email, pec, codice_agente, attivo, modificato_il)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [v.id_integra, v.codice, v.ragione_sociale, v.piva, v.codice_fiscale, v.indirizzo, v.cap, v.citta, v.provincia, v.paese, v.email, v.pec, v.codice_agente, v.attivo, v.modificato_il],
  );
}

async function mettiFornitore(r: Record<string, unknown>) {
  const base = {
    id_integra: 1, codice: 'F00001', ragione_sociale: 'Fornitore Uno', piva: '12345678901',
    codice_fiscale: null, indirizzo: null, cap: null, citta: null, provincia: null, paese: 'Italia',
    email: null, pec: null, attivo: true, modificato_il: data('2026-09-04T09:00:00Z'),
  };
  const v = { ...base, ...r };
  await ponte.query(
    `INSERT INTO public.integra_v_fornitori (id_integra, codice, ragione_sociale, piva, codice_fiscale, indirizzo, cap, citta, provincia, paese, email, pec, attivo, modificato_il)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [v.id_integra, v.codice, v.ragione_sociale, v.piva, v.codice_fiscale, v.indirizzo, v.cap, v.citta, v.provincia, v.paese, v.email, v.pec, v.attivo, v.modificato_il],
  );
}

beforeAll(async () => {
  PONTE_URL = process.env.DATABASE_URL!.replace(/\/decobrands_db\b/, '/decobrands_ponte_prova');
  process.env.PONTE_URL = PONTE_URL;
  ponte = new Pool({ connectionString: PONTE_URL, max: 2 });
  await tabelle();

  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
  db = app.get(PrismaService);
});

afterAll(async () => {
  await pulisciPonte();
  await db.utenti.deleteMany({ where: { email: { endsWith: DOMINIO } } });
  await svuota(db);
  await app.close();
  await ponte.end();
});

beforeEach(async () => {
  await svuota(db);
  await pulisciPonte();
});

describe('importa', () => {
  it('crea cliente dalla vista: soggetto + ruolo + versione + codice + evento', async () => {
    await mettiCliente({ id_integra: 10, codice: 'C00010', ragione_sociale: 'Cliente Dieci', piva: '12345678901' });
    const r = await importa(db, ponte, SCHEMA, 'cliente', 10, {});
    expect(r).toMatchObject({ creato: true, codice: 'C00010' });
    expect(await db.soggetti.count()).toBe(1);
    expect(await db.clienti.count()).toBe(1);
    expect(await db.clienti_versioni.count()).toBe(1);
    const ce = await db.codici_esterni.findFirstOrThrow({ where: { sistema: 'integra', tipo: 'cliente', codice: 'C00010' } });
    expect(ce.etichetta).toBe('C00010');
    const s = await db.soggetti.findFirstOrThrow();
    expect(s.piva_norm).toBe('12345678901');
    expect(s.sorgente).toBe('integra');
    expect(s.codice).toMatch(/^C\d{6}$/);
    expect(await db.registro.count({ where: { entita: 'cliente', codice: 'crud.create' } })).toBe(1);
  });

  it('crea fornitore dalla vista', async () => {
    await mettiFornitore({ id_integra: 20, codice: 'F00020', piva: '22222222222' });
    const r = await importa(db, ponte, SCHEMA, 'fornitore', 20, {});
    expect(r).toMatchObject({ creato: true, codice: 'F00020' });
    expect(await db.fornitori.count()).toBe(1);
    expect(await db.fornitori_versioni.count()).toBe(1);
    expect(await db.registro.count({ where: { entita: 'fornitore', codice: 'crud.create' } })).toBe(1);
  });

  it('ruolo aggiunto: fornitore con la P.IVA di un cliente esistente → stesso soggetto', async () => {
    await mettiCliente({ id_integra: 30, codice: 'C00030', piva: '12345678901' });
    await importa(db, ponte, SCHEMA, 'cliente', 30, {});
    await mettiFornitore({ id_integra: 31, codice: 'F00031', piva: '12345678901' });
    const r = await importa(db, ponte, SCHEMA, 'fornitore', 31, {});
    expect(r).toMatchObject({ creato: true, codice: 'F00031' });
    expect(await db.soggetti.count()).toBe(1);
    const cliente = await db.clienti.findFirstOrThrow();
    const fornitore = await db.fornitori.findFirstOrThrow();
    expect(fornitore.soggetto_id).toBe(cliente.soggetto_id);
  });

  it('idempotente per codice: il secondo import risponde gia_presente e non scrive', async () => {
    await mettiCliente({ id_integra: 40, codice: 'C00040' });
    await importa(db, ponte, SCHEMA, 'cliente', 40, {});
    const r = await importa(db, ponte, SCHEMA, 'cliente', 40, {});
    expect(r).toMatchObject({ gia_presente: true });
    expect(await db.soggetti.count()).toBe(1);
    expect(await db.clienti.count()).toBe(1);
    expect(await db.codici_esterni.count({ where: { tipo: 'cliente' } })).toBe(1);
  });

  it('idempotente per P.IVA: fornitore con la P.IVA di un fornitore esistente → gia_presente', async () => {
    await mettiFornitore({ id_integra: 50, codice: 'F00050', piva: '12345678901' });
    await importa(db, ponte, SCHEMA, 'fornitore', 50, {});
    await mettiFornitore({ id_integra: 51, codice: 'F00051', piva: '12345678901' });
    const r = await importa(db, ponte, SCHEMA, 'fornitore', 51, {});
    expect(r).toMatchObject({ gia_presente: true });
    expect(await db.soggetti.count()).toBe(1);
    expect(await db.fornitori.count()).toBe(1);
  });

  it('riga assente in vista: 404', async () => {
    await expect(importa(db, ponte, SCHEMA, 'cliente', 999999, {})).rejects.toMatchObject({ status: 404 });
  });
});

describe('cerca', () => {
  it('massimo 10 righe e veloce (D-111)', async () => {
    for (let i = 1; i <= 12; i++) {
      await mettiCliente({ id_integra: i, codice: `C000${String(i).padStart(2, '0')}`, ragione_sociale: `Negozio ${i}` });
    }
    const r = await cerca(db, ponte, SCHEMA, 'cliente', 'Negozio');
    expect(r.righe!.length).toBe(10);
    expect(r.ms).toBeLessThan(3000);
  });

  it('codice esatto per primo', async () => {
    await mettiCliente({ id_integra: 60, codice: 'SUPER', ragione_sociale: 'Solo Codice' });
    await mettiCliente({ id_integra: 61, codice: 'C00061', ragione_sociale: 'Super Garden' });
    const r = await cerca(db, ponte, SCHEMA, 'cliente', 'SUPER');
    expect(r.righe).toHaveLength(2);
    expect(r.righe![0].codice).toBe('SUPER');
  });

  it('esclude chi è già in anagrafica', async () => {
    await mettiCliente({ id_integra: 70, codice: 'C00070', ragione_sociale: 'Già Importato' });
    await importa(db, ponte, SCHEMA, 'cliente', 70, {});
    await mettiCliente({ id_integra: 71, codice: 'C00071', ragione_sociale: 'Da Importare' });
    const r = await cerca(db, ponte, SCHEMA, 'cliente', 'Import');
    expect(r.righe!.map((x) => x.codice)).toEqual(['C00071']);
  });

  it('ponte lento: risposta, non un 500', async () => {
    jest.useFakeTimers();
    try {
      const lento = { query: () => new Promise(() => {}) } as unknown as Pool;
      const p = cerca(db, lento, SCHEMA, 'cliente', 'x');
      jest.advanceTimersByTime(3100);
      await expect(p).resolves.toEqual({ errore: 'ponte lento', ms: expect.any(Number) });
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('rotte', () => {
  it('cerca e importa: 200 con dati.importa, 403 senza (D-111)', async () => {
    await db.utenti.create({ data: { username: 'oper-ai', email: 'oper-ai' + DOMINIO, nome: 'Operatore', ruolo: 'utente', password_hash: await cifra(PW), deve_cambiare_password: false, aree: { create: [{ area: 'dati', livello: 'operatore' }] } } });
    await db.utenti.create({ data: { username: 'lett-ai', email: 'lett-ai' + DOMINIO, nome: 'Lettore', ruolo: 'utente', password_hash: await cifra(PW), deve_cambiare_password: false, aree: { create: [{ area: 'dati', livello: 'lettura' }] } } });
    await mettiCliente({ id_integra: 80, codice: 'C00080', ragione_sociale: 'Negozio Ottanta' });

    const oper = request.agent(app.getHttpServer());
    const r1 = await oper.post('/api/accesso/entra').send({ utente: 'oper-ai', password: PW }).expect(200);
    const csrf = r1.body.csrf as string;
    const c = await oper.get('/api/integra/cerca?tipo=cliente&q=Ottanta').set('x-csrf-token', csrf).expect(200);
    expect(c.body.righe).toHaveLength(1);
    const imp = await oper.post('/api/integra/importa').set('x-csrf-token', csrf).send({ tipo: 'cliente', id_integra: 80 }).expect(200);
    expect(imp.body.creato).toBe(true);

    const lett = request.agent(app.getHttpServer());
    const r2 = await lett.post('/api/accesso/entra').send({ utente: 'lett-ai', password: PW }).expect(200);
    await lett.get('/api/integra/cerca?tipo=cliente&q=Ottanta').set('x-csrf-token', r2.body.csrf).expect(403);
    await lett.post('/api/integra/importa').set('x-csrf-token', r2.body.csrf).send({ tipo: 'cliente', id_integra: 80 }).expect(403);
  });

  it('importa: tipo non valido → 400', async () => {
    await db.utenti.create({ data: { username: 'oper-ai2', email: 'oper-ai2' + DOMINIO, nome: 'Operatore', ruolo: 'utente', password_hash: await cifra(PW), deve_cambiare_password: false, aree: { create: [{ area: 'dati', livello: 'operatore' }] } } });
    const oper = request.agent(app.getHttpServer());
    const r1 = await oper.post('/api/accesso/entra').send({ utente: 'oper-ai2', password: PW }).expect(200);
    await oper.post('/api/integra/importa').set('x-csrf-token', r1.body.csrf).send({ tipo: 'agente', id_integra: 1 }).expect(400);
  });
});
