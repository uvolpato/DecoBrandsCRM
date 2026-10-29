// Prova di accesso con password, sessioni, CSRF e permessi (passi 1.6–1.7, §3.3, §8.3, D-38, D-39).
import 'dotenv/config';
import { Controller, Get, Module, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { Richiede } from '../src/accesso';
import { AppModule } from '../src/app.module';
import { configura } from '../src/main';
import { cifra } from '../src/password';
import { PrismaService } from '../src/prisma.service';

@Controller('prova')
class ProvaController {
  @Get('gestione') @Richiede('gestione') gestione() { return {}; }
  @Post('modifica') @Richiede('modifica') modifica() { return {}; }
  @Get('senza') senza() { return {}; }
}

@Module({ imports: [AppModule], controllers: [ProvaController] })
class ProvaModule {}

let app: NestExpressApplication;
let db: PrismaService;
const DOMINIO = '@prova-accesso.it';
const PW = 'password-di-prova';
const id: Record<string, bigint> = {};

async function crea(username: string, ruolo: string, altro: object = {}) {
  const u = await db.utenti.create({
    data: { username, email: username + DOMINIO, nome: username, ruolo, password_hash: await cifra(PW), deve_cambiare_password: false, ...altro },
  });
  id[username] = u.id;
  return u;
}

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [ProvaModule] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
  db = app.get(PrismaService);
  await crea('ammi', 'amministratore');
  await crea('oper', 'operatore');
});

afterAll(async () => {
  const utenti = (await db.utenti.findMany({ where: { email: { endsWith: DOMINIO } } })).map((u) => u.id);
  await db.$transaction([
    db.$executeRaw`SET LOCAL decobrands.pulizia_registro = 'si'`,
    db.registro.deleteMany({ where: { OR: [{ utente_id: { in: utenti } }, { codice: 'auth.login', utente_id: null }] } }),
    db.sessioni.deleteMany({ where: { utente_id: { in: utenti } } }),
    db.utenti.deleteMany({ where: { id: { in: utenti } } }),
  ]);
  await app.close();
});

/** Entra come l'utente e restituisce l'agente con cookie e token CSRF. */
async function entra(utente: string, resta = true) {
  const agente = request.agent(app.getHttpServer());
  const r = await agente.post('/api/accesso/entra').send({ utente, password: PW, resta }).expect(200);
  return Object.assign(agente, { csrf: r.body.csrf as string, cookie: r.headers['set-cookie']?.[0] ?? '' });
}

describe('entra', () => {
  it("con il nome utente o con l'email: utente, permessi dal server e token CSRF", async () => {
    const a = await entra('oper');
    const io = (await a.get('/api/accesso/io').expect(200)).body;
    expect(io).toMatchObject({ username: 'oper', ruolo: 'operatore', cambia_password: false });
    expect(io.permessi).toContain('modifica');
    expect(io.permessi).not.toContain('gestione');
    expect(io.csrf).toMatch(/^[0-9a-f]{64}$/);
    await entra('OPER' + DOMINIO.toUpperCase());
  });

  it('stesso messaggio per utente sconosciuto, password sbagliata e disattivato; mai la password nel registro', async () => {
    await crea('spento', 'operatore', { attivo: false });
    for (const p of [{ utente: 'nessuno', password: PW }, { utente: 'oper', password: 'sbagliata' }, { utente: 'spento', password: PW }]) {
      const r = await request(app.getHttpServer()).post('/api/accesso/entra').send(p).expect(401);
      expect(r.body.message).toBe('Credenziali non valide');
    }
    const ev = await db.registro.findFirstOrThrow({ where: { codice: 'auth.login', esito: 'errore', utente_id: id.spento } });
    expect(ev.dettaglio).toMatchObject({ motivo: 'disattivato' });
    expect(JSON.stringify(ev.dettaglio)).not.toContain(PW);
  });

  it("l'utente dei servizi non entra", async () => {
    await db.utenti.create({ data: { username: 'servizi', email: 'servizi' + DOMINIO, nome: 's', ruolo: 'operatore', sistema: true } });
    await request(app.getHttpServer()).post('/api/accesso/entra').send({ utente: 'servizi', password: PW }).expect(401);
  });

  it('la sessione sta nel database; senza "Resta collegato" il cookie finisce con il browser', async () => {
    expect((await entra('oper', false)).cookie).not.toMatch(/Expires=/i);
    expect((await entra('oper', true)).cookie).toMatch(/Expires=/i);
    expect(await db.sessioni.count({ where: { utente_id: id.oper } })).toBeGreaterThan(0);
  });

  it("all'accesso la sessione si rigenera (niente session fixation)", async () => {
    const a = await entra('oper');
    const prima = a.cookie.split(';')[0];
    const r = await a.post('/api/accesso/entra').set('x-csrf-token', a.csrf).send({ utente: 'ammi', password: PW }).expect(200);
    expect(r.headers['set-cookie']?.[0].split(';')[0]).not.toBe(prima);
    expect((await a.get('/api/accesso/io')).body.ruolo).toBe('amministratore');
  });
});

describe('password provvisoria e cambio', () => {
  it('con la provvisoria si apre solo io, il cambio ed esci; dopo il cambio tutto', async () => {
    await crea('nuovo', 'operatore', { deve_cambiare_password: true });
    const a = await entra('nuovo');
    expect((await a.get('/api/accesso/io').expect(200)).body.cambia_password).toBe(true);
    await a.post('/api/prova/modifica').set('x-csrf-token', a.csrf).expect(403, /cambia_password/);
    const cambia = (attuale: string, nuova: string) => a.post('/api/accesso/password').set('x-csrf-token', a.csrf).send({ attuale, nuova });
    await cambia(PW, 'corta').expect(400);
    await cambia('sbagliata', 'nuova-password').expect(400);
    await cambia(PW, PW).expect(400);
    await cambia(PW, 'nuova-password').expect(204);
    await a.post('/api/prova/modifica').set('x-csrf-token', a.csrf).expect(201);
    await request(app.getHttpServer()).post('/api/accesso/entra').send({ utente: 'nuovo', password: 'nuova-password' }).expect(200);
  });

  it('cambiare la password chiude le altre sessioni, non quella corrente', async () => {
    const altro = await entra('ammi');
    const io = await entra('ammi');
    await io.post('/api/accesso/password').set('x-csrf-token', io.csrf).send({ attuale: PW, nuova: 'altra-password' }).expect(204);
    await altro.get('/api/accesso/io').expect(401);
    await io.get('/api/accesso/io').expect(200);
    await db.utenti.update({ where: { id: id.ammi }, data: { password_hash: await cifra(PW) } });
  });
});

describe('esci', () => {
  it('chiude la sessione e cancella la riga', async () => {
    const a = await entra('oper');
    const sid = decodeURIComponent(a.cookie.split(';')[0].split('=')[1]).slice(2).split('.')[0];
    expect(await db.sessioni.count({ where: { sid } })).toBe(1);
    await a.post('/api/accesso/esci').set('x-csrf-token', a.csrf).expect(204);
    await a.get('/api/accesso/io').expect(401);
    expect(await db.sessioni.count({ where: { sid } })).toBe(0);
  });
});

describe('permessi', () => {
  it('senza sessione: 401', () => request(app.getHttpServer()).get('/api/accesso/io').expect(401));

  it('rotta senza permesso dichiarato: negata a tutti', async () => {
    await (await entra('ammi')).get('/api/prova/senza').expect(403);
  });

  it('permesso mancante: 403 ed evento auth.access_denied con IP', async () => {
    await (await entra('oper')).get('/api/prova/gestione').expect(403);
    const ev = await db.registro.findFirstOrThrow({ where: { codice: 'auth.access_denied', utente_id: id.oper } });
    expect(ev.dettaglio).toMatchObject({ rotta: '/api/prova/gestione', metodo: 'GET' });
    expect(ev.ip).toBeTruthy();
  });

  it('il ruolo si rilegge a ogni richiesta: declassato vale subito', async () => {
    const a = await entra('ammi');
    await a.get('/api/prova/gestione').expect(200);
    await db.utenti.update({ where: { id: id.ammi }, data: { ruolo: 'lettura' } });
    await a.get('/api/prova/gestione').expect(403);
    await db.utenti.update({ where: { id: id.ammi }, data: { ruolo: 'amministratore' } });
  });

  it('disattivato: fuori subito e sessione cancellata', async () => {
    await crea('via', 'operatore');
    const a = await entra('via');
    await db.utenti.update({ where: { id: id.via }, data: { attivo: false } });
    await a.get('/api/accesso/io').expect(401);
    expect(await db.sessioni.count({ where: { utente_id: id.via } })).toBe(0);
  });
});

describe('CSRF', () => {
  it('senza sessione si entra solo in JSON: un form di un altro sito è rifiutato (login CSRF)', async () => {
    await request(app.getHttpServer()).post('/api/accesso/entra').type('form').send({ utente: 'oper', password: PW }).expect(415);
  });

  it('con sessione, una modifica senza token è rifiutata; con il token passa', async () => {
    const a = await entra('oper');
    await a.post('/api/prova/modifica').expect(403);
    await a.post('/api/prova/modifica').set('x-csrf-token', 'sbagliato').expect(403);
    await a.post('/api/prova/modifica').set('x-csrf-token', a.csrf).expect(201);
  });
});

describe('limite ai tentativi', () => {
  it('oltre 10 tentativi su un nome utente in 15 minuti: 429, gli altri utenti entrano', async () => {
    const codici: number[] = [];
    for (let i = 0; i < 12; i++) {
      codici.push((await request(app.getHttpServer()).post('/api/accesso/entra').send({ utente: 'bersaglio', password: 'x' })).status);
    }
    expect(codici.slice(0, 10).every((c) => c === 401)).toBe(true);
    expect(codici.slice(10)).toEqual([429, 429]);
    await entra('oper'); // stesso IP, altro nome utente: passa
  });
});
