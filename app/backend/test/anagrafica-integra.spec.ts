// Import su richiesta da Integra (F1-A11, D-111, §4.7.1): cerca e importa, con idempotenza e permessi.
// Il ponte finto decobrands_ponte_prova viene riempito e svuotato da questa prova.
import 'dotenv/config';
import { createHash } from 'node:crypto';
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

/** Un documento in arrivo da controllare, senza fornitore, con il nome del fornitore letto (D-133). */
async function mettiDocumento(nomeFornitore: string, stato = 'da_controllare') {
  const nome = `fattura-${createHash('sha256').update(nomeFornitore).digest('hex').slice(0, 8)}.pdf`;
  const d = await db.documenti_in_arrivo.create({ data: {
    origine: 'email', file_nome: nome, stato,
    file_hash: createHash('sha256').update(nome).digest('hex'), file_percorso: `in_arrivo/${nome}`,
    tipo: 'fattura',
  } });
  await db.documenti_campi.createMany({ data: [
    { documento_id: d.id, campo: 'fornitore', valore_letto: nomeFornitore },
    { documento_id: d.id, campo: 'righe[0].codice', valore_letto: 'ART-1' },
  ] });
  return d;
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

  it('stessa P.IVA su due codici Integra: 409, un solo codice (C5)', async () => {
    await mettiFornitore({ id_integra: 50, codice: 'F00050', piva: '12345678901' });
    await importa(db, ponte, SCHEMA, 'fornitore', 50, {});
    await mettiFornitore({ id_integra: 51, codice: 'F00051', piva: '12345678901' });
    await expect(importa(db, ponte, SCHEMA, 'fornitore', 51, {})).rejects.toMatchObject({ status: 409 });
    expect(await db.soggetti.count()).toBe(1);
    expect(await db.fornitori.count()).toBe(1);
    expect(await db.codici_esterni.count({ where: { sistema: 'integra' } })).toBe(1);
    expect(await db.registro.count({ where: { codice: 'crud.update' } })).toBe(0);
  });

  it('riga assente in vista: 404', async () => {
    await expect(importa(db, ponte, SCHEMA, 'cliente', 999999, {})).rejects.toMatchObject({ status: 404 });
  });

  it('P.IVA estera: paese dal prefisso, stesso soggetto (R1-03)', async () => {
    await db.soggetti.create({ data: {
      natura: 'azienda', piva: 'DE123456789', piva_norm: 'DE123456789', paese: 'DE', sorgente: 'crm',
    } });
    await mettiFornitore({
      id_integra: 120, codice: 'F00120', ragione_sociale: 'Keller Garten', piva: 'DE123456789', paese: 'Germania',
    });
    expect(await importa(db, ponte, SCHEMA, 'fornitore', 120, {})).toMatchObject({ creato: true });
    expect(await db.soggetti.count()).toBe(1);
    expect((await db.fornitori.findFirstOrThrow()).soggetto_id).toBe((await db.soggetti.findFirstOrThrow()).id);
    // variante: in Integra la P.IVA estera è senza prefisso → lo mette il paese, e il soggetto è quello
    await db.soggetti.create({ data: {
      natura: 'azienda', piva: 'DE777777777', piva_norm: 'DE777777777', paese: 'DE', sorgente: 'crm',
    } });
    await mettiFornitore({
      id_integra: 121, codice: 'F00121', ragione_sociale: 'Keller Garten DE', piva: '777777777', paese: 'DE',
    });
    expect(await importa(db, ponte, SCHEMA, 'fornitore', 121, {})).toMatchObject({ creato: true });
    expect(await db.soggetti.count()).toBe(2);
    expect(await db.fornitori.count()).toBe(2);
    const ce = await db.codici_esterni.findFirstOrThrow({ where: { codice: 'F00121' } });
    const keller = await db.fornitori.findUniqueOrThrow({ where: { id: ce.entita_id } });
    expect((await db.soggetti.findUniqueOrThrow({ where: { id: keller.soggetto_id! } })).piva_norm).toBe('DE777777777');
  });

  it('ruolo già presente senza codice Integra: registra il codice, la ricerca non lo ripropone (R1-04)', async () => {
    await mettiCliente({ id_integra: 130, codice: 'C00130', ragione_sociale: 'Rossi Giardini', piva: '33333333333' });
    const primo = await importa(db, ponte, SCHEMA, 'cliente', 130, {});
    await db.codici_esterni.deleteMany({}); // nato dal vecchio CRM: nessun codice di Integra
    await mettiCliente({ id_integra: 131, codice: 'C00131', ragione_sociale: 'Rossi Giardini', piva: '33333333333' });
    expect(await importa(db, ponte, SCHEMA, 'cliente', 131, {})).toMatchObject({
      gia_presente: true, codice_registrato: true, id: primo.id,
    });
    const ce = await db.codici_esterni.findFirstOrThrow({ where: { sistema: 'integra', tipo: 'cliente' } });
    expect(ce).toMatchObject({ codice: 'C00131', entita_id: BigInt(primo.id!) });
    expect(await db.registro.count({ where: { entita: 'cliente', codice: 'crud.update' } })).toBe(1);
    const c = await cerca(db, ponte, SCHEMA, 'cliente', 'Rossi Giardini');
    expect(c.righe!.map((x) => x.codice)).not.toContain('C00131');
  });

  it('due import insieme dello stesso soggetto: un creato, un gia_presente (R1-05)', async () => {
    await mettiCliente({ id_integra: 140, codice: 'C00140', ragione_sociale: 'Concorrente', piva: '44444444444' });
    const esiti = (await Promise.all([
      importa(db, ponte, SCHEMA, 'cliente', 140, {}),
      importa(db, ponte, SCHEMA, 'cliente', 140, {}),
    ])).map((x) => ('creato' in x ? 'creato' : 'gia_presente')).sort();
    expect(esiti).toEqual(['creato', 'gia_presente']);
    expect(await db.clienti.count()).toBe(1);
    expect(await db.soggetti.count()).toBe(1);
  });

  it('importa con ponte appeso: 502 «ponte lento», non una richiesta appesa (R1-02)', async () => {
    jest.useFakeTimers();
    try {
      const lento = { query: () => new Promise(() => {}) } as unknown as Pool;
      const p = importa(db, lento, SCHEMA, 'cliente', 10, {});
      jest.advanceTimersByTime(3100);
      await expect(p).rejects.toMatchObject({ status: 502 });
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('importa con documento_id (D-133)', () => {
  it('collega il documento con import e collegamento in una transazione, senza toccare campi e righe', async () => {
    await mettiFornitore({ id_integra: 150, codice: 'F00150', ragione_sociale: 'Fornitore Cento', piva: '55555555555' });
    const doc = await mettiDocumento('Fornitore Cento');
    const campiPrima = await db.documenti_campi.count({ where: { documento_id: doc.id } });
    const r = await importa(db, ponte, SCHEMA, 'fornitore', 150, {}, doc.id);
    expect(r).toMatchObject({ creato: true });
    const dopo = await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: doc.id } });
    expect(String(dopo.fornitore_id)).toBe(r.id);
    expect(dopo.fornitore_versione_id).not.toBeNull();
    expect(await db.documenti_campi.count({ where: { documento_id: doc.id } })).toBe(campiPrima);
    expect(await db.registro.count({ where: { entita: 'documento', codice: 'documento.update' } })).toBe(1);
  });

  it('fornitore diverso da quello letto: 409, niente creato, documento non collegato', async () => {
    await mettiFornitore({ id_integra: 160, codice: 'F00160', ragione_sociale: 'Fornitore Uno', piva: '11111111111' });
    await mettiFornitore({ id_integra: 161, codice: 'F00161', ragione_sociale: 'Fornitore Due', piva: '22222222222' });
    const doc = await mettiDocumento('Fornitore Uno');
    await expect(importa(db, ponte, SCHEMA, 'fornitore', 161, {}, doc.id)).rejects.toMatchObject({ status: 409 });
    expect(await db.fornitori.count()).toBe(0);
    expect((await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: doc.id } })).fornitore_id).toBeNull();
  });

  it('nome letto che non trova nulla: 409 e nessuna scrittura (C1)', async () => {
    await mettiFornitore({ id_integra: 180, codice: 'F00180', ragione_sociale: 'Fornitore Noto', piva: '66677788899' });
    const doc = await mettiDocumento('Gries Deco');
    await expect(importa(db, ponte, SCHEMA, 'fornitore', 180, {}, doc.id)).rejects.toMatchObject({ status: 409 });
    expect(await db.soggetti.count()).toBe(0);
    expect(await db.fornitori.count()).toBe(0);
    expect(await db.codici_esterni.count()).toBe(0);
    expect((await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: doc.id } })).fornitore_id).toBeNull();
  });

  it('fornitore già importato con il nome letto giusto: collegato (C1)', async () => {
    await mettiFornitore({ id_integra: 181, codice: 'F00181', ragione_sociale: 'Fornitore Già Importato', piva: '11122233344' });
    const primo = await importa(db, ponte, SCHEMA, 'fornitore', 181, {});
    const doc = await mettiDocumento('Fornitore Già Importato');
    const r = await importa(db, ponte, SCHEMA, 'fornitore', 181, {}, doc.id);
    expect(r).toMatchObject({ gia_presente: true, codice_registrato: false, documento_collegato: true, id: primo.id });
    expect(String((await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: doc.id } })).fornitore_id)).toBe(primo.id);
  });

  it('fornitore già importato con l\'id_integra di un altro: 409 (C1)', async () => {
    await mettiFornitore({ id_integra: 182, codice: 'F00182', ragione_sociale: 'Fornitore Alfa', piva: '55566677788' });
    await importa(db, ponte, SCHEMA, 'fornitore', 182, {});
    await mettiFornitore({ id_integra: 183, codice: 'F00183', ragione_sociale: 'Fornitore Beta', piva: '99988877766' });
    const doc = await mettiDocumento('Fornitore Alfa');
    await expect(importa(db, ponte, SCHEMA, 'fornitore', 183, {}, doc.id)).rejects.toMatchObject({ status: 409 });
    expect(await db.fornitori.count()).toBe(1);
    expect((await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: doc.id } })).fornitore_id).toBeNull();
  });

  it('ponte lento con un documento: 502 e documento libero (C3)', async () => {
    await mettiFornitore({ id_integra: 184, codice: 'F00184', ragione_sociale: 'Fornitore Lento', piva: '12398745600' });
    const doc = await mettiDocumento('Fornitore Lento');
    let chiamate = 0;
    const lento = {
      query: (config: Parameters<Pool['query']>[0]) => (++chiamate === 1 ? ponte.query(config) : new Promise(() => {})),
    } as unknown as Pool;
    await expect(importa(db, lento, SCHEMA, 'fornitore', 184, {}, doc.id)).rejects.toMatchObject({ status: 502 });
    expect(await db.fornitori.count()).toBe(0);
    expect((await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: doc.id } })).fornitore_id).toBeNull();
  }, 15000);
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

  it('ponte giù: cerca risponde 502 e non apre anomalie (C4)', async () => {
    await db.utenti.create({ data: { username: 'oper-c4', email: 'oper-c4' + DOMINIO, nome: 'Operatore', ruolo: 'utente', password_hash: await cifra(PW), deve_cambiare_password: false, aree: { create: [{ area: 'dati', livello: 'operatore' }] } } });
    const buono = process.env.PONTE_URL;
    process.env.PONTE_URL = 'postgresql://x:y@127.0.0.1:1/nope';
    try {
      const a = request.agent(app.getHttpServer());
      const r = await a.post('/api/accesso/entra').send({ utente: 'oper-c4', password: PW }).expect(200);
      await a.get('/api/integra/cerca?tipo=cliente&q=Chiunque').set('x-csrf-token', r.body.csrf).expect(502);
    } finally {
      process.env.PONTE_URL = buono;
    }
    expect(await db.registro.count({ where: { codice: 'integra.connessione' } })).toBe(0);
  }, 15000);

  it('importa: tipo non valido → 400', async () => {
    await db.utenti.create({ data: { username: 'oper-ai2', email: 'oper-ai2' + DOMINIO, nome: 'Operatore', ruolo: 'utente', password_hash: await cifra(PW), deve_cambiare_password: false, aree: { create: [{ area: 'dati', livello: 'operatore' }] } } });
    const oper = request.agent(app.getHttpServer());
    const r1 = await oper.post('/api/accesso/entra').send({ utente: 'oper-ai2', password: PW }).expect(200);
    await oper.post('/api/integra/importa').set('x-csrf-token', r1.body.csrf).send({ tipo: 'agente', id_integra: 1 }).expect(400);
    // campo non dichiarato o id non intero: 400, nessun import (R1-13)
    await oper.post('/api/integra/importa').set('x-csrf-token', r1.body.csrf).send({ tipo: 'cliente', id_integra: 'x', extra: 1 }).expect(400);
    expect(await db.soggetti.count()).toBe(0);
  });

  it('importa con documento_id: serve anche provvigioni.modifica (D-133, R1-13)', async () => {
    await db.utenti.create({ data: { username: 'imp-doc', email: 'imp-doc' + DOMINIO, nome: 'Importa', ruolo: 'utente', password_hash: await cifra(PW), deve_cambiare_password: false, aree: { create: [{ area: 'dati', livello: 'operatore' }, { area: 'provvigioni', livello: 'lettura' }] } } });
    await db.utenti.create({ data: { username: 'imp-doc2', email: 'imp-doc2' + DOMINIO, nome: 'Importa Due', ruolo: 'utente', password_hash: await cifra(PW), deve_cambiare_password: false, aree: { create: [{ area: 'dati', livello: 'operatore' }, { area: 'provvigioni', livello: 'operatore' }] } } });
    await mettiFornitore({ id_integra: 170, codice: 'F00170', ragione_sociale: 'Fornitore Rotte', piva: '12312312312' });
    const doc = await mettiDocumento('Fornitore Rotte');

    const a = request.agent(app.getHttpServer());
    const r1 = await a.post('/api/accesso/entra').send({ utente: 'imp-doc', password: PW }).expect(200);
    await a.post('/api/integra/importa').set('x-csrf-token', r1.body.csrf)
      .send({ tipo: 'fornitore', id_integra: 170, documento_id: Number(doc.id) }).expect(403);
    expect(await db.fornitori.count()).toBe(0);
    expect((await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: doc.id } })).fornitore_id).toBeNull();

    const b = request.agent(app.getHttpServer());
    const r2 = await b.post('/api/accesso/entra').send({ utente: 'imp-doc2', password: PW }).expect(200);
    const ok = await b.post('/api/integra/importa').set('x-csrf-token', r2.body.csrf)
      .send({ tipo: 'fornitore', id_integra: 170, documento_id: Number(doc.id) }).expect(200);
    expect(ok.body.creato).toBe(true);
    expect(String((await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: doc.id } })).fornitore_id)).toBe(ok.body.id);
  });
});
