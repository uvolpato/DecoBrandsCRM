// Prova della sincronizzazione da Integra (F1-A4/F1-A7/F1-A11, §4.5, D-32, D-46, D-111). Il CRM sta su
// decobrands_test; il ponte finto decobrands_ponte_prova lo riempie e lo svuota questa prova.
// D-111: la sincronizzazione aggiorna e non crea più: i clienti/fornitori si pre-seedano con importa.
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
import { creaPonte, IntegraService, pulisci, sincronizzaGiro } from '../src/integra';
import { cerca, importa } from '../src/anagrafica-integra';
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

// D-111: l'identità nasce con l'import su richiesta, non con il giro (che aggiorna soltanto).
async function importaCliente(r: Record<string, unknown> = {}) {
  await mettiCliente(r);
  return importa(db, ponte, 'public', 'cliente', (r.id_integra as number) ?? 1, {});
}

async function importaFornitore(r: Record<string, unknown> = {}) {
  await mettiFornitore(r);
  return importa(db, ponte, 'public', 'fornitore', (r.id_integra as number) ?? 1, {});
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
  it('non crea: righe in vista ma nessun cliente o fornitore (D-111)', async () => {
    await mettiCliente({});
    await mettiFornitore({});
    const c = await sincronizzaGiro(db, ponte, ora);
    expect(c.clienti.nuovi).toBe(0);
    expect(c.fornitori.nuovi).toBe(0);
    expect(c.clienti.letti).toBe(1);
    expect(c.fornitori.letti).toBe(1);
    expect(await db.clienti.count()).toBe(0);
    expect(await db.fornitori.count()).toBe(0);
    const esecuzione = await db.servizi_esecuzioni.findFirstOrThrow({ where: { servizio: 'integra' }, orderBy: { id: 'desc' } });
    expect(esecuzione.esito).toBe('ok');
    expect(esecuzione.testo).toMatch(/Clienti: 1 letti, 0 versioni/);
    expect(esecuzione.testo).not.toContain('nuovi');
  });

  it('cliente sconosciuto senza P.IVA valida: ignorato, nessuna anomalia (D-111)', async () => {
    await mettiCliente({ piva: 'X' });
    await sincronizzaGiro(db, ponte, ora);
    expect(await db.clienti.count()).toBe(0);
    expect(await db.registro.count({ where: { codice: 'integra.piva_mancante' } })).toBe(0);
  });

  it('secondo giro senza cambi: nessuna versione nuova', async () => {
    await importaCliente({});
    await sincronizzaGiro(db, ponte, ora);
    const c = await sincronizzaGiro(db, ponte, new Date(ora.getTime() + 60_000));
    expect(c.clienti.versioni).toBe(0);
    expect(await db.clienti_versioni.count()).toBe(1);
  });

  it('cambia la ragione sociale: nuova versione, vecchia intatta, pratica ancora sulla vecchia', async () => {
    await importaCliente({});
    await importaFornitore({});
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
    await ponte.query("UPDATE public.integra_v_clienti SET ragione_sociale = 'Cliente Due', modificato_il = now()");

    const c = await sincronizzaGiro(db, ponte, new Date(ora.getTime() + 120_000));
    expect(c.clienti.versioni).toBe(1);
    const dopo = await db.clienti.findUniqueOrThrow({ where: { id: cliente.id } });
    expect(dopo.versione_corrente_id).not.toBe(vecchia);
    expect(await db.clienti_versioni.findUniqueOrThrow({ where: { id: vecchia } })).toBeTruthy();
    const praticaDopo = await db.ordini_fornitore_testata.findUniqueOrThrow({ where: { id: pratica.id } });
    expect(praticaDopo.cliente_versione_id).toBe(vecchia);
  });

  it('cambia solo modificato_il o solo spazi e maiuscole della P.IVA: nessuna versione nuova', async () => {
    await importaCliente({ piva: '12345678901' });
    await sincronizzaGiro(db, ponte, ora);
    await ponte.query("UPDATE public.integra_v_clienti SET piva = ' IT 123 456 789 01 ', modificato_il = now()");
    const c = await sincronizzaGiro(db, ponte, new Date(ora.getTime() + 60_000));
    expect(c.clienti.versioni).toBe(0);
    expect(await db.clienti_versioni.count()).toBe(1);
  });

  it('disattivato in Integra: resta, attivo=false, pratiche ancora presenti', async () => {
    await importaCliente({});
    await importaFornitore({});
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
    await ponte.query('UPDATE public.integra_v_clienti SET attivo = false, modificato_il = now()');
    const c = await sincronizzaGiro(db, ponte, new Date(ora.getTime() + 60_000));
    expect(c.clienti.disattivati).toBe(1);
    expect((await db.clienti.findFirstOrThrow()).attivo).toBe(false);
    expect(await db.ordini_fornitore_testata.count()).toBe(1);
  });

  it('cliente già in anagrafica con P.IVA che diventa non valida: anomalia aperta e poi chiusa', async () => {
    await importaCliente({});
    await sincronizzaGiro(db, ponte, ora);
    await ponte.query("UPDATE public.integra_v_clienti SET piva = 'X', modificato_il = now()");
    await sincronizzaGiro(db, ponte, new Date(ora.getTime() + 60_000));
    expect(await db.registro.count({ where: { codice: 'integra.piva_mancante', stato: 'aperta' } })).toBe(1);

    await ponte.query("UPDATE public.integra_v_clienti SET piva = '12345678901', modificato_il = now()");
    await sincronizzaGiro(db, ponte, new Date(ora.getTime() + 120_000));
    expect(await db.registro.count({ where: { codice: 'integra.piva_mancante', stato: 'aperta' } })).toBe(0);
  });

  it('P.IVA estera di un fornitore: accettata', async () => {
    await importaFornitore({ piva: 'DE123456789' });
    await sincronizzaGiro(db, ponte, ora);
    expect(await db.fornitori.count()).toBe(1);
    expect((await db.fornitori_versioni.findFirstOrThrow()).piva).toBe('DE123456789');
  });

  it('P.IVA doppia: anomalia integra.piva_doppia', async () => {
    const crea = async (codice: string, piva: string, nome: string) => {
      const c = await db.clienti.create({ data: {} });
      const v = await db.clienti_versioni.create({ data: { cliente_id: c.id, fonte: 'integra', piva, ragione_sociale: nome } });
      await db.clienti.update({ where: { id: c.id }, data: { versione_corrente_id: v.id } });
      await db.codici_esterni.create({ data: { sistema: 'integra', tipo: 'cliente', codice, entita_id: c.id } });
    };
    await crea('C00001', '12345678901', 'Cliente Uno');
    await crea('C00002', '12345678901', 'Cliente Due');
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
    await ponte.query('ALTER TABLE public.integra_v_clienti RENAME COLUMN email TO email_x');
    await sincronizzaGiro(db, ponte, ora);
    expect(await db.registro.count({ where: { codice: 'integra.vista', stato: 'aperta' } })).toBe(1);
    await ponte.query('ALTER TABLE public.integra_v_clienti RENAME COLUMN email_x TO email');
  });

  it('campi del CRM invariati dopo un giro', async () => {
    await importaFornitore({});
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
    await importaCliente({ id_integra: 77, codice: 'C00077', modificato_il: new Date(ora.getTime() - 2 * 3600_000) });
    const c = await sincronizzaGiro(db, ponte, ora);
    expect(c.clienti.letti).toBe(1);
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

  it('un giro alla volta: la seconda sincronizzazione dà 409', async () => {
    await mettiCliente({});
    const svc = app.get(IntegraService);
    const esiti = await Promise.allSettled([svc.sincronizza(), svc.sincronizza()]);
    expect(esiti.filter((e) => e.status === 'fulfilled')).toHaveLength(1);
    const ko = esiti.find((e) => e.status === 'rejected') as PromiseRejectedResult;
    expect(ko.reason.message).toBe('Sincronizzazione già in corso');
    expect(await db.clienti.count()).toBe(0); // D-111: il giro non crea
  });

  it('una riga in errore resta in anomalia e si rilegge al giro dopo', async () => {
    await mettiCliente({ id_integra: 5, codice: 'C00005', modificato_il: ora });
    // identità che punta a un cliente inesistente: la copia della riga fallisce
    await db.codici_esterni.create({ data: { sistema: 'integra', tipo: 'cliente', codice: 'C00005', entita_id: 999999n } });
    await sincronizzaGiro(db, ponte, ora);
    expect(await db.registro.count({ where: { codice: 'integra.riga', stato: 'aperta' } })).toBe(1);

    await db.codici_esterni.deleteMany({ where: { codice: 'C00005' } });
    await sincronizzaGiro(db, ponte, new Date(ora.getTime() + 2 * 86_400_000));
    expect(await db.clienti.count()).toBe(0); // D-111: il giro non crea, la riga ora si ignora
    expect(await db.registro.count({ where: { codice: 'integra.riga', stato: 'aperta' } })).toBe(0);
  });

  it('connessione: solo il ponte giù conta, non una vista mancante', async () => {
    await ponte.query('ALTER TABLE public.integra_v_clienti RENAME COLUMN email TO email_x');
    await sincronizzaGiro(db, ponte, ora);
    await sincronizzaGiro(db, ponte, new Date(ora.getTime() + 60_000));
    await ponte.query('ALTER TABLE public.integra_v_clienti RENAME COLUMN email_x TO email');
    expect(await db.registro.count({ where: { codice: 'integra.connessione' } })).toBe(0);

    const rotto = new Pool({ connectionString: 'postgresql://x:y@127.0.0.1:1/nope', connectionTimeoutMillis: 300, max: 1 });
    await expect(sincronizzaGiro(db, rotto, new Date(ora.getTime() + 120_000))).rejects.toThrow();
    expect(await db.registro.count({ where: { codice: 'integra.connessione' } })).toBe(0);
    await expect(sincronizzaGiro(db, rotto, new Date(ora.getTime() + 180_000))).rejects.toThrow();
    await expect(sincronizzaGiro(db, rotto, new Date(ora.getTime() + 240_000))).rejects.toThrow();
    await rotto.end();
    expect(await db.registro.count({ where: { codice: 'integra.connessione', stato: 'aperta' } })).toBe(1);
  });

  it('ponte in sola lettura anche per il CRM', async () => {
    const soloLettura = creaPonte(PONTE_URL);
    try {
      expect((await soloLettura.query('SHOW transaction_read_only')).rows[0].transaction_read_only).toBe('on');
      await expect(soloLettura.query("INSERT INTO public.integra_v_clienti (id_integra) VALUES (1)")).rejects.toMatchObject({ code: '25006' });
    } finally {
      await soloLettura.end();
    }
  });

  it('pulisci toglie indirizzi, host e password', () => {
    const esempi = [
      'connect ECONNREFUSED 192.168.1.5:5432',
      'getaddrinfo ENOTFOUND nome-host',
      'postgresql://utente:segreta@host:5432/db password=abc',
    ];
    for (const e of esempi) {
      const p = pulisci(new Error(e));
      expect(p).not.toMatch(/192\.168\.1\.5|nome-host|segreta|password=abc/);
    }
    expect(pulisci(new Error('getaddrinfo ENOTFOUND nome-host'))).toBe('getaddrinfo ENOTFOUND [indirizzo rimosso]');
  });
});

describe('ponte su richiesta', () => {
  it('creaPonte: tempi massimi sulla connessione, nessun limite alle query del giro (R1-02, C2)', async () => {
    const p = creaPonte('postgresql://utente:parola@127.0.0.1:1/nulla');
    try {
      expect(p.options).toMatchObject({ max: 2, connectionTimeoutMillis: 3000 });
      expect(p.options.options).toBe('-c default_transaction_read_only=on');
      expect(p.options.options).not.toContain('statement_timeout');
      expect(p.options.query_timeout).toBeUndefined();
    } finally {
      await p.end();
    }
  });

  it('il limite di 5 s vale solo per la ricerca: pg_sleep dà «ponte lento» (C2)', async () => {
    await mettiCliente({ id_integra: 300, codice: 'C00300', ragione_sociale: 'Negozio Lento' });
    await ponte.query('CREATE SCHEMA IF NOT EXISTS lento_prova');
    await ponte.query(`CREATE OR REPLACE VIEW lento_prova.integra_v_clienti AS
      SELECT c.* FROM public.integra_v_clienti c
      CROSS JOIN LATERAL (SELECT pg_sleep(4) WHERE c.id_integra IS NOT NULL) s`);
    try {
      const r = await cerca(db, ponte, 'lento_prova', 'cliente', 'C00300');
      expect(r.errore).toBe('ponte lento');
      expect(r.ms).toBeGreaterThanOrEqual(3000);
      expect(r.ms).toBeLessThan(5000);
    } finally {
      await ponte.query('DROP SCHEMA IF EXISTS lento_prova CASCADE');
    }
  }, 15000);
});
