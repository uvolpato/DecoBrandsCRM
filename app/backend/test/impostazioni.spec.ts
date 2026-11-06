// Prova delle Impostazioni (F5-A6, §7.15, D-65): sei sezioni, segreti cifrati mai riletti,
// validazione sul server, evento crud/update senza segreti, *Prova la connessione*, righe per pagina
// e lettura da parte dei servizi (posta, Integra, conservazione).
import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configura } from '../src/main';
import { cifra as cifraPassword } from '../src/password';
import { PrismaService } from '../src/prisma.service';
import { casellaConfig, integraConfig, letturaConfig, postaConfig } from '../src/impostazioni';
import { pulisciRegistro } from '../src/registro';
import { cifra, decifra } from '../src/segreto';
import { invia } from '../src/posta';
import { seed } from '../prisma/seed';
import { svuota } from './svuota';

let app: NestExpressApplication;
let db: PrismaService;
const DOMINIO = '@prova-impostazioni.it';
const PW = 'password-di-prova';

async function creaUtente(username: string, ruolo: string, aree: { area: string; livello: string }[]) {
  return db.utenti.create({
    data: { username, email: username + DOMINIO, nome: 'Prova ' + username, ruolo, aree: { create: aree }, password_hash: await cifraPassword(PW), deve_cambiare_password: false },
  });
}
async function entra(utente: string) {
  const agente = request.agent(app.getHttpServer());
  await agente.post('/api/accesso/entra').send({ utente, password: PW }).expect(200);
  return agente;
}

let ammi: Awaited<ReturnType<typeof entra>>;
let oper: Awaited<ReturnType<typeof entra>>;
let lett: Awaited<ReturnType<typeof entra>>;
let csrf: string;

beforeAll(async () => {
  process.env.SEGRETI_CHIAVE = 'chiave-di-prova-impostazioni';
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
  db = app.get(PrismaService);
  await svuota(db);
  await seed(db);
  await creaUtente('ammi-imp', 'amministratore', [{ area: 'provvigioni', livello: 'responsabile' }, { area: 'dati', livello: 'responsabile' }]);
  await creaUtente('oper-imp', 'utente', [{ area: 'provvigioni', livello: 'operatore' }]);
  await creaUtente('lett-imp', 'utente', [{ area: 'provvigioni', livello: 'lettura' }]);
  [ammi, oper, lett] = await Promise.all([entra('ammi-imp'), entra('oper-imp'), entra('lett-imp')]);
  csrf = (await ammi.get('/api/accesso/io').expect(200)).body.csrf as string;
}, 120_000);

afterAll(async () => {
  await svuota(db);
  await app.close();
});

describe('F5-A6 segreti', () => {
  it('cifra/decifra andata e ritorno; un\'altra chiave lancia', () => {
    const cifrato = cifra('testo-riservato');
    expect(cifrato).toMatch(/^v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
    expect(decifra(cifrato)).toBe('testo-riservato');
    const originale = process.env.SEGRETI_CHIAVE;
    process.env.SEGRETI_CHIAVE = 'un-altra-chiave';
    expect(() => decifra(cifrato)).toThrow();
    process.env.SEGRETI_CHIAVE = originale;
  });

  it('senza SEGRETI_CHIAVE cifra e decifra lanciano', () => {
    const originale = process.env.SEGRETI_CHIAVE;
    delete process.env.SEGRETI_CHIAVE;
    expect(() => cifra('x')).toThrow(/SEGRETI_CHIAVE/);
    expect(() => decifra('v1:aa:bb:cc')).toThrow(/SEGRETI_CHIAVE/);
    process.env.SEGRETI_CHIAVE = originale;
  });
});

describe('F5-A6 rotte delle impostazioni', () => {
  it('permesso: amministratore sì, operatore e sola lettura no', async () => {
    await ammi.get('/api/impostazioni').expect(200);
    for (const a of [oper, lett]) {
      await a.get('/api/impostazioni').expect(403);
      await a.put('/api/impostazioni/azienda').set('x-csrf-token', csrf).send({ valori: {} }).expect(403);
    }
  });

  it('GET: sei sezioni in ordine, metadati, password solo impostata, nessun valore cifrato', async () => {
    const r = await ammi.get('/api/impostazioni').expect(200);
    const sezioni = r.body.sezioni as { chiave: string; titolo: string; sotto: string; campi: { nome: string; tipo: string; etichetta: string; valore: unknown; impostata?: boolean }[] }[];
    expect(sezioni.map((s) => s.chiave)).toEqual(['azienda', 'casella', 'lettura', 'posta', 'integra', 'conservazione']);
    const casella = sezioni.find((s) => s.chiave === 'casella')!;
    const password = casella.campi.find((c) => c.nome === 'password')!;
    expect(password).toMatchObject({ tipo: 'password', valore: null, impostata: true });
    const minuti = casella.campi.find((c) => c.nome === 'minuti')!;
    expect(minuti).toMatchObject({ tipo: 'numero', min: 1, max: 60 });
    const lettura = sezioni.find((s) => s.chiave === 'lettura')!;
    expect(lettura.campi.find((c) => c.nome === 'connettore')).toMatchObject({ tipo: 'select', valore: 'llamacloud_eu' });
    expect(lettura.campi.find((c) => c.nome === 'llamacloud_chiave')).toMatchObject({ tipo: 'password', valore: null, impostata: false });
    expect(JSON.stringify(r.body)).not.toContain('v1:'); // mai il valore cifrato nella risposta
    // parametri del .env (D-70): in sola lettura, con lo stato; il segreto non esce
    const ambiente = r.body.ambiente as { nome: string; sezioni: string[]; impostato: boolean; valore: unknown }[];
    expect(ambiente.find((p) => p.nome === 'SEGRETI_CHIAVE')).toMatchObject({ impostato: true, valore: null });
    expect(ambiente.find((p) => p.nome === 'SEGRETI_CHIAVE')!.sezioni).toEqual(expect.arrayContaining(['casella', 'lettura', 'posta', 'integra']));
    expect(JSON.stringify(r.body)).not.toContain('chiave-di-prova-impostazioni');
  });

  it('ambiente: un parametro mancante si vede, senza dire il valore dei segreti', async () => {
    const originale = process.env.SEGRETI_CHIAVE;
    delete process.env.SEGRETI_CHIAVE;
    try {
      const r = await ammi.get('/api/impostazioni').expect(200);
      expect((r.body.ambiente as { nome: string; impostato: boolean }[]).find((p) => p.nome === 'SEGRETI_CHIAVE')).toMatchObject({ impostato: false });
    } finally {
      process.env.SEGRETI_CHIAVE = originale;
    }
  });

  it('PUT: salvataggio, rilettura, campo sconosciuto e chiave sconosciuta', async () => {
    const r = await ammi.put('/api/impostazioni/azienda').set('x-csrf-token', csrf)
      .send({ valori: { ragione_sociale: 'Nuova Ragione', piva: 'IT12345678901', email: 'a@b.it', indirizzo: 'Via X' } }).expect(200);
    expect(r.body.campi.find((c: { nome: string }) => c.nome === 'ragione_sociale').valore).toBe('Nuova Ragione');
    const letto = (await ammi.get('/api/impostazioni').expect(200)).body.sezioni.find((s: { chiave: string }) => s.chiave === 'azienda');
    expect(letto.campi.find((c: { nome: string }) => c.nome === 'ragione_sociale').valore).toBe('Nuova Ragione');

    await ammi.put('/api/impostazioni/azienda').set('x-csrf-token', csrf).send({ valori: { sconosciuto: 1 } }).expect(400);
    await ammi.put('/api/impostazioni/sconosciuta').set('x-csrf-token', csrf).send({ valori: {} }).expect(404);
    await ammi.post('/api/impostazioni/sconosciuta/prova').set('x-csrf-token', csrf).send({}).expect(404);
  });

  it('PUT: ogni limite violato è 400 (porta, minuti, secondi, soglie, righe, eventi_mesi)', async () => {
    const put = (chiave: string, valori: Record<string, unknown>) =>
      ammi.put('/api/impostazioni/' + chiave).set('x-csrf-token', csrf).send({ valori });
    await put('casella', { porta: 0 }).expect(400);
    await put('casella', { porta: 70000 }).expect(400);
    await put('casella', { minuti: 0 }).expect(400);
    await put('casella', { minuti: 61 }).expect(400);
    await put('integra', { secondi: 5 }).expect(400);
    await put('lettura', { soglia_ok: 1.5 }).expect(400);
    await put('lettura', { soglia_bassa: 0.9, soglia_ok: 0.7 }).expect(400); // bassa < affidabile
    await put('lettura', { soglia_ok: 0.855 }).expect(400); // al massimo due decimali
    await put('lettura', { soglia_ok: 0.85, soglia_bassa: 0.65 }).expect(200); // decimali validi
    await put('lettura', { connettore: 'altro' }).expect(400); // elenco chiuso
    await put('lettura', { llamacloud_modo: 'premium' }).expect(400);
    await put('conservazione', { righe_pagina: 500 }).expect(400);
    await put('conservazione', { eventi_mesi: 6 }).expect(400); // min 12 (§15.7)
    await put('azienda', { email: 'senza-chiocciola' }).expect(400);
  });

  it('password: vuota conserva la precedente, scritta la sostituisce', async () => {
    await db.impostazioni.upsert({
      where: { chiave: 'casella' },
      update: { valore: { server: 'imap.x', porta: 993, utente: 'u', password: cifra('vecchia'), cartella: 'A', cartella_lette: 'B', minuti: 2 } },
      create: { chiave: 'casella', valore: { server: 'imap.x', porta: 993, utente: 'u', password: cifra('vecchia'), cartella: 'A', cartella_lette: 'B', minuti: 2 } },
    });
    await ammi.put('/api/impostazioni/casella').set('x-csrf-token', csrf).send({ valori: { server: 'imap2.x', password: '' } }).expect(200);
    expect((await casellaConfig(db))).toMatchObject({ server: 'imap2.x', password: 'vecchia' });

    await ammi.put('/api/impostazioni/casella').set('x-csrf-token', csrf).send({ valori: { password: 'nuova' } }).expect(200);
    expect((await casellaConfig(db))!.password).toBe('nuova');
  });

  it('evento crud/update: entita impostazione, prima/dopo coi soli campi cambiati, mai il segreto', async () => {
    const prima = await db.registro.count({ where: { entita: 'impostazione' } });
    await ammi.put('/api/impostazioni/posta').set('x-csrf-token', csrf)
      .send({ valori: { server: 'smtp.x', password: 'SEGRETISSIMO' } }).expect(200);
    const eventi = await db.registro.findMany({ where: { entita: 'impostazione' }, orderBy: { id: 'asc' } });
    expect(eventi).toHaveLength(prima + 1);
    const ev = eventi[eventi.length - 1];
    expect(ev.codice).toBe('crud.update');
    expect(ev.entita_id).toBeNull();
    const d = ev.dettaglio as { chiave: string; prima: Record<string, unknown>; dopo: Record<string, unknown> };
    expect(d.chiave).toBe('posta');
    expect(d.dopo.server).toBe('smtp.x');
    expect(d.dopo.password).toBe('sostituita');
    expect(d.prima.password).toBe('impostata');
    expect(JSON.stringify(d)).not.toContain('SEGRETISSIMO');
    // solo i campi cambiati, non tutta la sezione
    expect(Object.keys(d.dopo)).toEqual(['server', 'password']);
  });

  it('prova: azienda e conservazione 400, connessione non configurata 200 {ok:false}', async () => {
    await ammi.post('/api/impostazioni/azienda/prova').set('x-csrf-token', csrf).send({}).expect(400);
    // integra senza campi di connessione: la prova non tenta nulla e risponde 200 {ok:false}
    await db.impostazioni.update({ where: { chiave: 'integra' }, data: { valore: { server: '', database: '', utente: '', password: null, schema: 'crm_viste', secondi: 60 } } });
    const r = await ammi.post('/api/impostazioni/integra/prova').set('x-csrf-token', csrf).send({}).expect(200);
    expect(r.body.ok).toBe(false);
    expect(r.body.testo).toContain('non configurata');
    // lettura senza chiave: non tenta nessuna connessione
    const l = await ammi.post('/api/impostazioni/lettura/prova').set('x-csrf-token', csrf).send({}).expect(200);
    expect(l.body.ok).toBe(false);
    expect(l.body.testo).toContain('non configurato');
  });

  it('lettura: la chiave si salva cifrata, si rilegge solo per il servizio e non esce dalle API', async () => {
    const r = await ammi.put('/api/impostazioni/lettura').set('x-csrf-token', csrf)
      .send({ valori: { llamacloud_chiave: 'llx-di-prova', llamacloud_progetto: 'p1', llamacloud_modo: 'agentic', connettore: 'llamacloud_eu' } }).expect(200);
    const chiave = (r.body.campi as { nome: string; valore: unknown; impostata?: boolean }[]).find((c) => c.nome === 'llamacloud_chiave')!;
    expect(chiave).toMatchObject({ valore: null, impostata: true });
    expect(JSON.stringify(r.body)).not.toContain('llx-di-prova');
    expect(await letturaConfig(db)).toMatchObject({ connettore: 'llamacloud_eu', chiave: 'llx-di-prova', progetto: 'p1', modo: 'agentic' });
    // il modello locale ha i suoi parametri, separati, e la prova dice che non è ancora disponibile
    await ammi.put('/api/impostazioni/lettura').set('x-csrf-token', csrf)
      .send({ valori: { connettore: 'glm_ocr_locale', locale_indirizzo: 'http://gpu:8080/v1', locale_modello: 'zai-org/GLM-OCR' } }).expect(200);
    expect(await letturaConfig(db)).toMatchObject({ connettore: 'glm_ocr_locale', indirizzo: 'http://gpu:8080/v1', modello: 'zai-org/GLM-OCR' });
    const prova = await ammi.post('/api/impostazioni/lettura/prova').set('x-csrf-token', csrf).send({}).expect(200);
    expect(prova.body.ok).toBe(false);
    expect(prova.body.testo).toContain('locale non è ancora disponibile');
    // tornando al cloud la chiave salvata c'è ancora
    await ammi.put('/api/impostazioni/lettura').set('x-csrf-token', csrf).send({ valori: { connettore: 'llamacloud_eu' } }).expect(200);
    expect((await letturaConfig(db)) as { chiave?: string }).toMatchObject({ connettore: 'llamacloud_eu', chiave: 'llx-di-prova' });
    await db.impostazioni.delete({ where: { chiave: 'lettura' } });
    expect(await letturaConfig(db)).toBeNull();
  });

  it('GET e prova non scrivono eventi (§15.1)', async () => {
    const prima = await db.registro.count();
    await ammi.get('/api/impostazioni').expect(200);
    await ammi.post('/api/impostazioni/integra/prova').set('x-csrf-token', csrf).send({}).expect(200);
    expect(await db.registro.count()).toBe(prima);
  });
});

describe('F5-A6 servizi e righe per pagina', () => {
  it('config null quando la password non è decifrabile o i campi mancano', async () => {
    // il seed scrive `password: true`, non un segreto cifrato: il servizio non si collega
    await db.impostazioni.update({ where: { chiave: 'integra' }, data: { valore: { server: 'srv', database: 'db', utente: 'u', password: true, schema: 'crm_viste', secondi: 60 } } });
    expect(await integraConfig(db)).toBeNull();
    await db.impostazioni.update({ where: { chiave: 'integra' }, data: { valore: { server: '', database: '', utente: '', password: null, schema: 'crm_viste', secondi: 60 } } });
    expect(await integraConfig(db)).toBeNull();
  });

  it('config con password cifrata: valori decifrati; schema non valido → crm_viste', async () => {
    await db.impostazioni.update({
      where: { chiave: 'integra' },
      data: { valore: { server: 'srv', database: 'db', utente: 'u', password: cifra('segreta'), schema: 'crm_viste; DROP', secondi: 60 } },
    });
    const c = await integraConfig(db);
    expect(c).toMatchObject({ server: 'srv', password: 'segreta', schema: 'crm_viste' });
  });

  it('righe_pagina in /api/accesso/io e per_pagina in pratiche e registro', async () => {
    const io = await ammi.get('/api/accesso/io').expect(200);
    expect(io.body.righe_pagina).toBe(25); // conservazione del seed
    expect((await ammi.get('/api/pratiche').expect(200)).body.per_pagina).toBe(25);
    expect((await ammi.get('/api/registro').expect(200)).body.per_pagina).toBe(25);
  });

  it('pulisciRegistro: un errore di 20 mesi resta con 36 e sparisce con 12', async () => {
    const ora = new Date('2026-09-04T12:00:00Z');
    const mesiFa = (n: number) => { const d = new Date(ora); d.setMonth(d.getMonth() - n); return d; };
    await db.registro.create({
      data: { genere: 'evento', livello: 'errore', codice: 'errore.error', tipo: 'errore', azione: 'error', esito: 'errore', messaggio: 'PROVA-IMP', ts: mesiFa(20), dettaglio: { etichetta: 'x' } },
    } as never);
    await pulisciRegistro(db, ora, 36);
    expect(await db.registro.count({ where: { messaggio: 'PROVA-IMP' } })).toBe(1);
    await pulisciRegistro(db, ora, 12);
    expect(await db.registro.count({ where: { messaggio: 'PROVA-IMP' } })).toBe(0);
  });

  it('invia con trasporto finto: riuscito aggiorna ultimo_invio, rifiutato apre posta.respinta senza lanciare', async () => {
    await db.impostazioni.update({
      where: { chiave: 'posta' },
      data: { valore: { server: 'smtp.x', porta: 587, utente: 'u', password: cifra('pw'), mittente: 'Decobrands' } },
    });
    const u = await creaUtente('mail-imp', 'utente', [{ area: 'provvigioni', livello: 'lettura' }]);

    await invia(db, u.id, 'reset', { a: 'dest@x.it', oggetto: 'O', testo: 'T' }, { sendMail: async () => ({ messageId: 'x' }) } as never);
    expect((await db.utenti.findUniqueOrThrow({ where: { id: u.id } })).ultimo_invio).toMatchObject({ errore: null });

    const rifiuto = { sendMail: async () => { const e = new Error('550 unknown user') as Error & { responseCode: number }; e.responseCode = 550; throw e; } } as never;
    await invia(db, u.id, 'reset', { a: 'rifiutato@x.it', oggetto: 'O', testo: 'T' }, rifiuto);
    expect((await db.utenti.findUniqueOrThrow({ where: { id: u.id } })).ultimo_invio).toMatchObject({ errore: expect.stringContaining('550') });
    expect(await db.registro.count({ where: { codice: 'posta.respinta', chiave: 'rifiutato@x.it', stato: 'aperta' } })).toBe(1);
    expect(await db.registro.count({ where: { codice: 'posta.connessione', stato: 'aperta' } })).toBe(0);

    await invia(db, u.id, 'reset', { a: 'altro@x.it', oggetto: 'O', testo: 'T' }, { sendMail: async () => { throw new Error('ECONNREFUSED'); } } as never);
    expect(await db.registro.count({ where: { codice: 'posta.connessione', stato: 'aperta' } })).toBe(1);
  });
});
