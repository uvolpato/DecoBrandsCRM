// Prova della sincronizzazione da Integra (F1-A4/F1-A7, §4.5, D-32, D-46). Il CRM sta su
// decobrands_test; il ponte finto decobrands_ponte_prova lo riempie e lo svuota questa prova.
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
import { sincronizzaGiro } from '../src/integra';
import { svuota } from './svuota';

let app: NestExpressApplication;
let db: PrismaService;
let ponte: Pool;
let PONTE_URL: string;
const PW = 'password-di-prova';
const DOMINIO = '@prova-integra.it';
const sqlPonte = readFileSync(join(__dirname, '..', 'prisma', 'ponte-prova.sql'), 'utf8');

const data = (s: string) => new Date(s);

async function tabelle() {
  await ponte.query('DROP SCHEMA IF EXISTS crm_viste CASCADE');
  await ponte.query(sqlPonte);
}

async function pulisciPonte() {
  await ponte.query('TRUNCATE crm_viste.v_clienti, crm_viste.v_fornitori');
}

async function mettiCliente(r: Record<string, unknown>) {
  const base = {
    id_integra: 1, codice: 'C00001', ragione_sociale: 'Cliente Uno', piva: '12345678901',
    codice_fiscale: null, indirizzo: null, cap: null, citta: null, provincia: null, paese: 'Italia',
    email: null, pec: null, codice_agente: null, attivo: true, modificato_il: data('2026-09-04T09:00:00Z'),
  };
  const v = { ...base, ...r };
  await ponte.query(
    `INSERT INTO crm_viste.v_clienti (id_integra, codice, ragione_sociale, piva, codice_fiscale, indirizzo, cap, citta, provincia, paese, email, pec, codice_agente, attivo, modificato_il)
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
    `INSERT INTO crm_viste.v_fornitori (id_integra, codice, ragione_sociale, piva, codice_fiscale, indirizzo, cap, citta, provincia, paese, email, pec, attivo, modificato_il)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [v.id_integra, v.codice, v.ragione_sociale, v.piva, v.codice_fiscale, v.indirizzo, v.cap, v.citta, v.provincia, v.paese, v.email, v.pec, v.attivo, v.modificato_il],
  );
}

const ora = new Date('2026-09-04T10:00:00Z');

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

describe('un giro', () => {
  it('primo giro: identità, versione e codice; conteggi in servizi_esecuzioni', async () => {
    await mettiCliente({});
    await mettiFornitore({});
    const c = await sincronizzaGiro(db, ponte, ora);
    expect(c.clienti.nuovi).toBe(1);
    expect(c.fornitori.nuovi).toBe(1);
    expect(await db.clienti.count()).toBe(1);
    expect(await db.fornitori.count()).toBe(1);
    expect(await db.clienti_versioni.count()).toBe(1);
    expect(await db.codici_esterni.count({ where: { tipo: 'cliente' } })).toBe(1);
    const esecuzione = await db.servizi_esecuzioni.findFirstOrThrow({ where: { servizio: 'integra' }, orderBy: { id: 'desc' } });
    expect(esecuzione.esito).toBe('ok');
    expect(esecuzione.testo).toMatch(/Clienti: 1 letti, 1 nuovi/);
  });

  it('secondo giro senza cambi: nessuna versione nuova', async () => {
    await mettiCliente({});
    await sincronizzaGiro(db, ponte, ora);
    const c = await sincronizzaGiro(db, ponte, new Date(ora.getTime() + 60_000));
    expect(c.clienti.versioni).toBe(0);
    expect(await db.clienti_versioni.count()).toBe(1);
  });

  it('cambia la ragione sociale: nuova versione, vecchia intatta, pratica ancora sulla vecchia', async () => {
    await mettiCliente({});
    await mettiFornitore({});
    await sincronizzaGiro(db, ponte, ora);
    const cliente = await db.clienti.findFirstOrThrow({ include: { corrente: true } });
    const fornitore = await db.fornitori.findFirstOrThrow({ include: { corrente: true } });
    const pratica = await db.ordini_fornitore_testata.create({
      data: {
        fornitore_id: fornitore.id, fornitore_versione_id: fornitore.corrente!.id,
        cliente_id: cliente.id, cliente_versione_id: cliente.corrente!.id,
        numero_ordine: 'OF/2026/900', data_ordine: new Date('2026-09-01'),
      },
    });
    const vecchia = cliente.corrente!.id;
    await ponte.query("UPDATE crm_viste.v_clienti SET ragione_sociale = 'Cliente Due', modificato_il = now()");

    const c = await sincronizzaGiro(db, ponte, new Date(ora.getTime() + 120_000));
    expect(c.clienti.versioni).toBe(1);
    const dopo = await db.clienti.findUniqueOrThrow({ where: { id: cliente.id } });
    expect(dopo.versione_corrente_id).not.toBe(vecchia);
    expect(await db.clienti_versioni.findUniqueOrThrow({ where: { id: vecchia } })).toBeTruthy();
    const praticaDopo = await db.ordini_fornitore_testata.findUniqueOrThrow({ where: { id: pratica.id } });
    expect(praticaDopo.cliente_versione_id).toBe(vecchia);
  });

  it('cambia solo modificato_il o solo spazi e maiuscole della P.IVA: nessuna versione nuova', async () => {
    await mettiCliente({ piva: '12345678901' });
    await sincronizzaGiro(db, ponte, ora);
    await ponte.query("UPDATE crm_viste.v_clienti SET piva = ' IT 123 456 789 01 ', modificato_il = now()");
    const c = await sincronizzaGiro(db, ponte, new Date(ora.getTime() + 60_000));
    expect(c.clienti.versioni).toBe(0);
    expect(await db.clienti_versioni.count()).toBe(1);
  });

  it('stesso soggetto cliente e fornitore: due identità e due codici esterni', async () => {
    await mettiCliente({ id_integra: 900, codice: 'C00900' });
    await mettiFornitore({ id_integra: 900, codice: 'F00900' });
    await sincronizzaGiro(db, ponte, ora);
    expect(await db.codici_esterni.count({ where: { entita_id: (await db.clienti.findFirstOrThrow()).id, tipo: 'cliente' } })).toBe(1);
    expect(await db.codici_esterni.count({ where: { entita_id: (await db.fornitori.findFirstOrThrow()).id, tipo: 'fornitore' } })).toBe(1);
  });

  it('disattivato in Integra: resta, attivo=false, pratiche ancora presenti', async () => {
    await mettiCliente({});
    await mettiFornitore({});
    await sincronizzaGiro(db, ponte, ora);
    const cliente = await db.clienti.findFirstOrThrow({ include: { corrente: true } });
    const fornitore = await db.fornitori.findFirstOrThrow({ include: { corrente: true } });
    await db.ordini_fornitore_testata.create({
      data: {
        fornitore_id: fornitore.id, fornitore_versione_id: fornitore.corrente!.id,
        cliente_id: cliente.id, cliente_versione_id: cliente.corrente!.id,
        numero_ordine: 'OF/2026/901', data_ordine: new Date('2026-09-01'),
      },
    });
    await ponte.query('UPDATE crm_viste.v_clienti SET attivo = false, modificato_il = now()');
    const c = await sincronizzaGiro(db, ponte, new Date(ora.getTime() + 60_000));
    expect(c.clienti.disattivati).toBe(1);
    expect((await db.clienti.findFirstOrThrow()).attivo).toBe(false);
    expect(await db.ordini_fornitore_testata.count()).toBe(1);
  });

  it('cliente senza P.IVA valida: non copiato, anomalia aperta; corretta → copiato e chiusa', async () => {
    await mettiCliente({ piva: 'X' });
    await sincronizzaGiro(db, ponte, ora);
    expect(await db.clienti.count()).toBe(0);
    const anomalia = await db.registro.findFirstOrThrow({ where: { codice: 'integra.piva_mancante', stato: 'aperta' } });
    expect(anomalia.messaggio).toContain('P.IVA valida');

    await ponte.query("UPDATE crm_viste.v_clienti SET piva = '12345678901', modificato_il = now()");
    await sincronizzaGiro(db, ponte, new Date(ora.getTime() + 60_000));
    expect(await db.clienti.count()).toBe(1);
    expect(await db.registro.count({ where: { codice: 'integra.piva_mancante', stato: 'aperta' } })).toBe(0);
  });

  it('P.IVA estera di un fornitore: accettata', async () => {
    await mettiFornitore({ piva: 'DE123456789' });
    await sincronizzaGiro(db, ponte, ora);
    expect(await db.fornitori.count()).toBe(1);
    expect((await db.fornitori_versioni.findFirstOrThrow()).piva).toBe('DE123456789');
  });

  it('P.IVA doppia: anomalia integra.piva_doppia', async () => {
    await mettiCliente({ id_integra: 1, codice: 'C00001', piva: '12345678901' });
    await mettiCliente({ id_integra: 2, codice: 'C00002', piva: '12345678901', ragione_sociale: 'Cliente Due' });
    await sincronizzaGiro(db, ponte, ora);
    expect(await db.registro.count({ where: { codice: 'integra.piva_doppia', stato: 'aperta' } })).toBe(1);
  });

  it('ponte irraggiungibile: esito errore; connessione solo al terzo giro; nessuna password nei testi', async () => {
    const rotto = new Pool({ connectionString: 'postgresql://x:segreta@127.0.0.1:1/nope', connectionTimeoutMillis: 300, max: 1 });
    for (let i = 0; i < 3; i++) {
      await expect(sincronizzaGiro(db, rotto, new Date(ora.getTime() + i * 60_000))).rejects.toThrow();
    }
    await rotto.end();
    expect(await db.servizi_esecuzioni.count({ where: { esito: 'errore' } })).toBe(3);
    expect(await db.registro.count({ where: { codice: 'integra.connessione', stato: 'aperta' } })).toBe(1);
    const testi = (await db.registro.findMany({ where: { codice: 'integra.connessione' } })).map((r) => r.messaggio ?? '').join(' ');
    expect(testi).not.toContain('segreta');
  });

  it('colonna mancante nella vista: anomalia integra.vista', async () => {
    await ponte.query('ALTER TABLE crm_viste.v_clienti RENAME COLUMN email TO email_x');
    await sincronizzaGiro(db, ponte, ora);
    expect(await db.registro.count({ where: { codice: 'integra.vista', stato: 'aperta' } })).toBe(1);
    await ponte.query('ALTER TABLE crm_viste.v_clienti RENAME COLUMN email_x TO email');
  });

  it('campi del CRM invariati dopo un giro', async () => {
    await mettiFornitore({});
    await sincronizzaGiro(db, ponte, ora);
    const f = await db.fornitori.findFirstOrThrow();
    await db.fornitori.update({ where: { id: f.id }, data: { giorni_incasso: 99, note: 'del CRM' } });
    await sincronizzaGiro(db, ponte, new Date(ora.getTime() + 60_000));
    const dopo = await db.fornitori.findUniqueOrThrow({ where: { id: f.id } });
    expect(dopo.giorni_incasso).toBe(99);
    expect(dopo.note).toBe('del CRM');
  });

  it('margine: una riga di poco prima dell\'ultimo giro viene letta', async () => {
    await db.servizi_esecuzioni.create({ data: { servizio: 'integra', tipo: 'lavoro', inizio: new Date(ora.getTime() - 60_000), fine: new Date(ora.getTime() - 50_000), esito: 'ok' } });
    await mettiCliente({ id_integra: 77, codice: 'C00077', modificato_il: new Date(ora.getTime() - 2 * 3600_000) });
    const c = await sincronizzaGiro(db, ponte, ora);
    expect(c.clienti.nuovi).toBe(1);
  });

  it('rotte: prova e sincronizza; 403 senza sistema.impostazioni; nessun PONTE_URL nella risposta', async () => {
    await db.utenti.create({ data: { username: 'ammi-int', email: 'ammi-int' + DOMINIO, nome: 'Amministratore', ruolo: 'amministratore', password_hash: await cifra(PW), deve_cambiare_password: false } });
    await db.utenti.create({ data: { username: 'oper-int', email: 'oper-int' + DOMINIO, nome: 'Operatore', ruolo: 'utente', password_hash: await cifra(PW), deve_cambiare_password: false, aree: { create: [{ area: 'dati', livello: 'operatore' }] } } });

    const agente = request.agent(app.getHttpServer());
    const r = await agente.post('/api/accesso/entra').send({ utente: 'ammi-int', password: PW }).expect(200);
    const csrf = r.body.csrf as string;
    const prova = await agente.post('/api/integra/prova').set('x-csrf-token', csrf).expect(200);
    expect(prova.body.ok).toBe(true);
    expect(prova.body.clienti).toBe(0);
    expect(JSON.stringify(prova.body)).not.toContain('postgres');

    const oper = request.agent(app.getHttpServer());
    const r2 = await oper.post('/api/accesso/entra').send({ utente: 'oper-int', password: PW }).expect(200);
    await oper.post('/api/integra/prova').set('x-csrf-token', r2.body.csrf).expect(403);
  });
});
