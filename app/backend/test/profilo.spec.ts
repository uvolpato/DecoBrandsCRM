// Profilo (D-88) e timeout di inattività (D-89): pagina di ingresso per area, il server valida area e
// percorso (V12), scrive il registro (V13); la sessione scade dopo SESSION_TIMEOUT_MINUTI senza
// richieste, la SSE non rinnova.
import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { scaduta } from '../src/accesso';
import { configura } from '../src/main';
import { cifra } from '../src/password';
import { PrismaService } from '../src/prisma.service';
import type { Prisma } from '@prisma/client';

let app: NestExpressApplication;
let db: PrismaService;
const DOMINIO = '@prova-profilo.it';
const PW = 'password-di-prova';
const id: Record<string, bigint> = {};

// D-45: "operatore" e "lettura" sono utenti con quel livello in Dati e Provvigioni
const comeRuolo = (ruolo: string) => ['operatore', 'lettura'].includes(ruolo)
  ? { ruolo: 'utente', aree: { create: ['dati', 'provvigioni'].map((area) => ({ area, livello: ruolo })) } }
  : ruolo === 'amministratore'
    ? { ruolo, aree: { create: ['dati', 'provvigioni'].map((area) => ({ area, livello: 'responsabile' })) } }
    : { ruolo };

async function crea(username: string, ruolo: string, altro: object = {}) {
  const u = await db.utenti.create({
    data: { username, email: username + DOMINIO, nome: username, ...comeRuolo(ruolo), password_hash: await cifra(PW), deve_cambiare_password: false, ...altro },
  });
  id[username] = u.id;
  return u;
}

/** Entra come l'utente e restituisce l'agente con cookie e token CSRF. */
async function entra(utente: string) {
  const agente = request.agent(app.getHttpServer());
  const r = await agente.post('/api/accesso/entra').send({ utente, password: PW }).expect(200);
  return Object.assign(agente, { csrf: r.body.csrf as string, cookie: r.headers['set-cookie']?.[0] ?? '' });
}

/** La sessione nel database (sid e contenuto). */
async function sessione(a: { cookie: string }) {
  const sid = decodeURIComponent(a.cookie.split(';')[0].split('=')[1]).slice(2).split('.')[0];
  const riga = await db.sessioni.findUniqueOrThrow({ where: { sid } });
  return { sid, sess: riga.sess as Record<string, unknown> };
}

/** Sposta indietro `ultimo` nella sessione salvata (per provare il timeout). */
async function invecchia(a: { cookie: string }, ms: number) {
  const { sid, sess } = await sessione(a);
  await db.sessioni.update({ where: { sid }, data: { sess: { ...sess, ultimo: Date.now() - ms } } });
}

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
  db = app.get(PrismaService);
  const vecchi = (await db.utenti.findMany({ where: { email: { endsWith: DOMINIO } }, select: { id: true } })).map((u) => u.id);
  await db.sessioni.deleteMany({ where: { utente_id: { in: vecchi } } });
  await db.registro.deleteMany({ where: { utente_id: { in: vecchi } } });
  await db.utenti.deleteMany({ where: { id: { in: vecchi } } });
  await crea('ammi', 'amministratore');
  await crea('oper', 'operatore');
  await crea('lett', 'lettura');
}, 120_000);

afterAll(async () => {
  const utenti = (await db.utenti.findMany({ where: { email: { endsWith: DOMINIO } } })).map((u) => u.id);
  await db.$transaction([
    db.$executeRaw`SET LOCAL decobrands.pulizia_registro = 'si'`,
    db.registro.deleteMany({ where: { utente_id: { in: utenti } } }),
    db.sessioni.deleteMany({ where: { utente_id: { in: utenti } } }),
    db.utenti.deleteMany({ where: { id: { in: utenti } } }),
  ]);
  await app.close();
});

describe('scaduta (funzione pura)', () => {
  it('oltre i minuti scade; entro no; senza ultimo mai', () => {
    const ora = 1_000_000;
    expect(scaduta(ora - 60_001, ora, 1)).toBe(true);
    expect(scaduta(ora - 60_000, ora, 1)).toBe(false);
    expect(scaduta(undefined, ora, 1)).toBe(false);
  });
});

describe('pagina di ingresso per area', () => {
  it('PUT valido e io con ingressi; evento crud.update nel registro', async () => {
    const a = await entra('oper');
    const r = await a.put('/api/accesso/profilo').set('x-csrf-token', a.csrf)
      .send({ ingressi: { provvigioni: '/documenti', dati: '/clienti' } }).expect(200);
    expect(r.body.ingressi).toEqual({ provvigioni: '/documenti', dati: '/clienti' });
    const io = (await a.get('/api/accesso/io').expect(200)).body;
    expect(io.ingressi).toEqual({ provvigioni: '/documenti', dati: '/clienti' });
    const ev = await db.registro.findFirstOrThrow({ where: { codice: 'crud.update', entita: 'utente', entita_id: id.oper }, orderBy: { id: 'desc' } });
    expect(ev.dettaglio).toMatchObject({ etichetta: 'oper', dopo: { ingressi: { provvigioni: '/documenti', dati: '/clienti' } } });
  });

  it('area sconosciuta 400', async () => {
    const a = await entra('oper');
    await a.put('/api/accesso/profilo').set('x-csrf-token', a.csrf).send({ ingressi: { sconosciuta: '/' } }).expect(400, /Area sconosciuta/);
  });

  it('area dal prototipo (constructor, hasOwnProperty) non dà mai 500 (A1-07)', async () => {
    const a = await entra('oper');
    // class-transformer (ValidationPipe transform) scarta già queste chiavi da ingressi; qui si
    // verifica solo che la richiesta non scoppi mai in un 500 (difesa in profondità di Object.hasOwn)
    const r = await a.put('/api/accesso/profilo').set('x-csrf-token', a.csrf)
      .send({ ingressi: { constructor: '/', hasOwnProperty: '/' } });
    expect(r.status).toBeLessThan(500);
  });

  it('percorso di un\'altra area 400', async () => {
    const a = await entra('oper');
    await a.put('/api/accesso/profilo').set('x-csrf-token', a.csrf).send({ ingressi: { provvigioni: '/fornitori' } }).expect(400, /Percorso non valido/);
  });

  it('percorso non permesso 400 (sola lettura su /scartati)', async () => {
    const a = await entra('lett');
    await a.put('/api/accesso/profilo').set('x-csrf-token', a.csrf).send({ ingressi: { provvigioni: '/scartati' } }).expect(400, /Percorso non permesso/);
  });

  it('null toglie la scelta', async () => {
    await crea('tolgo', 'operatore');
    const a = await entra('tolgo');
    await a.put('/api/accesso/profilo').set('x-csrf-token', a.csrf).send({ ingressi: { provvigioni: '/documenti' } }).expect(200);
    await a.put('/api/accesso/profilo').set('x-csrf-token', a.csrf).send({ ingressi: { provvigioni: null } }).expect(200);
    expect((await a.get('/api/accesso/io').expect(200)).body.ingressi).toEqual({});
  });

  it('un percorso non più permesso si ignora in io (sola lettura su /scartati)', async () => {
    await crea('incur', 'lettura', { ingressi: { provvigioni: '/scartati' } });
    const a = await entra('incur');
    expect((await a.get('/api/accesso/io').expect(200)).body.ingressi).toEqual({});
  });

  it('la password provvisoria non arriva al profilo (403)', async () => {
    await crea('nuovo', 'operatore', { deve_cambiare_password: true });
    const a = await entra('nuovo');
    await a.put('/api/accesso/profilo').set('x-csrf-token', a.csrf).send({ ingressi: { provvigioni: '/' } }).expect(403, /cambia_password/);
  });
});

describe('timeout di inattività', () => {
  it('una richiesta normale rinnova il tempo', async () => {
    const a = await entra('oper');
    const prima = (await sessione(a)).sess.ultimo;
    await new Promise((ok) => setTimeout(ok, 20));
    await a.get('/api/accesso/io').expect(200);
    expect((await sessione(a)).sess.ultimo).toBeGreaterThan(prima as number);
  });

  it('oltre il limite la sessione si chiude e risponde 401', async () => {
    process.env.SESSION_TIMEOUT_MINUTI = '1';
    try {
      const a = await entra('oper');
      await invecchia(a, 2 * 60_000);
      await a.get('/api/accesso/io').expect(401, /Sessione scaduta per inattività/);
    } finally {
      delete process.env.SESSION_TIMEOUT_MINUTI;
    }
  });

  it('la SSE non rinnova il tempo di inattività', async () => {
    const a = await entra('oper');
    const prima = (await sessione(a)).sess.ultimo;
    const req = a.get('/api/eventi/flusso');
    req.then(() => undefined, () => undefined); // la SSE resta aperta: si chiude a mano
    await new Promise((ok) => setTimeout(ok, 400)); // il guard per la SSE non tocca `ultimo`
    req.abort();
    await new Promise((ok) => setTimeout(ok, 100));
    expect((await sessione(a)).sess.ultimo).toBe(prima);
  });

  it('una richiesta automatica non rinnova; senza intestazione sì (A1-02)', async () => {
    const a = await entra('oper');
    await invecchia(a, 20_000); // dentro il timeout di default: non scade
    const prima = (await sessione(a)).sess.ultimo;
    await a.get('/api/oggi').set('x-automatico', '1').expect(200);
    expect((await sessione(a)).sess.ultimo).toBe(prima); // il polling non conta come attività
    await a.get('/api/oggi').expect(200); // richiesta della persona: rinnova
    expect((await sessione(a)).sess.ultimo).toBeGreaterThan(prima as number);
  });

  it('una richiesta automatica oltre il timeout risponde 401 (A1-02)', async () => {
    process.env.SESSION_TIMEOUT_MINUTI = '1';
    try {
      const a = await entra('oper');
      await invecchia(a, 2 * 60_000);
      await a.get('/api/oggi').set('x-automatico', '1').expect(401, /Sessione scaduta per inattività/);
    } finally {
      delete process.env.SESSION_TIMEOUT_MINUTI;
    }
  });

  it('una sessione più vecchia di 30 giorni si chiude anche da attiva (A1-03)', async () => {
    const a = await entra('oper');
    const { sid, sess } = await sessione(a);
    await db.sessioni.update({ where: { sid }, data: { sess: { ...sess, creata: Date.now() - 31 * 24 * 3600 * 1000 } } });
    await a.get('/api/accesso/io').expect(401, /Sessione scaduta: entra di nuovo/);
  });

  it('una sessione senza creata (nata prima della correzione) la riceve al primo passaggio (C1)', async () => {
    await crea('c1', 'operatore');
    const a = await entra('c1');
    const { sid, sess } = await sessione(a);
    const { creata: _ignorata, ...senza } = sess;
    await db.sessioni.update({ where: { sid }, data: { sess: senza as Prisma.InputJsonValue } });
    await a.get('/api/accesso/io').expect(200);
    const dopo = (await sessione(a)).sess;
    expect(typeof dopo.creata).toBe('number');
    expect(dopo.creata as number).toBeGreaterThan(Date.now() - 60_000); // i 30 giorni partono da adesso
  });
});
