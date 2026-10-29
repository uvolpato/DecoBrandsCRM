// Prova di sessioni, CSRF e permessi (passo 1.6, §3.3, §8.3, D-38) con sessioni vere nel database.
import 'dotenv/config';
import { Controller, Get, Module, Param, Post, Req } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request } from 'express';
import request from 'supertest';
import { apriSessione, Pubblica, Richiede } from '../src/accesso';
import { AppModule } from '../src/app.module';
import { configura } from '../src/main';
import { PrismaService } from '../src/prisma.service';

// Rotte di prova: "entra" fa le veci dell'accesso con il link (passo 1.7)
@Controller('prova')
class ProvaController {
  @Post('entra/:id') @Pubblica()
  async entra(@Req() req: Request, @Param('id') id: string) {
    await apriSessione(req, BigInt(id));
    return {};
  }
  @Get('gestione') @Richiede('gestione') gestione() { return {}; }
  @Post('modifica') @Richiede('modifica') modifica() { return {}; }
  @Get('senza') senza() { return {}; }
}

@Module({ imports: [AppModule], controllers: [ProvaController] })
class ProvaModule {}

let app: NestExpressApplication;
let db: PrismaService;
const id: Record<string, string> = {};

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [ProvaModule] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
  db = app.get(PrismaService);
  for (const ruolo of ['amministratore', 'operatore']) {
    const u = await db.utenti.create({ data: { email: `${ruolo}@prova-accesso.it`, nome: ruolo, ruolo, accesso: 'email' } });
    id[ruolo] = String(u.id);
  }
});

afterAll(async () => {
  const utenti = (await db.utenti.findMany({ where: { email: { endsWith: '@prova-accesso.it' } } })).map((u) => u.id);
  await db.$transaction([
    db.$executeRaw`SET LOCAL decobrands.pulizia_registro = 'si'`,
    db.registro.deleteMany({ where: { utente_id: { in: utenti } } }),
    db.sessioni.deleteMany({ where: { utente_id: { in: utenti } } }),
    db.utenti.deleteMany({ where: { id: { in: utenti } } }),
  ]);
  await app.close();
});

async function entra(ruolo: string) {
  const agente = request.agent(app.getHttpServer());
  await agente.post(`/api/prova/entra/${id[ruolo]}`).expect(201);
  return agente;
}

describe('sessione e utente corrente', () => {
  it('senza sessione: 401', () => request(app.getHttpServer()).get('/api/accesso/io').expect(401));

  it('io: utente, ruolo, permessi dal server e token CSRF', async () => {
    const r = await (await entra('operatore')).get('/api/accesso/io').expect(200);
    expect(r.body).toMatchObject({ id: id.operatore, email: 'operatore@prova-accesso.it', ruolo: 'operatore' });
    expect(r.body.permessi).toContain('modifica');
    expect(r.body.permessi).not.toContain('gestione');
    expect(r.body.csrf).toMatch(/^[0-9a-f]{64}$/);
  });

  it('la sessione sta nel database con utente_id ricavato', async () => {
    await entra('operatore');
    expect(await db.sessioni.count({ where: { utente_id: BigInt(id.operatore) } })).toBeGreaterThan(0);
  });

  it("all'accesso la sessione si rigenera (niente session fixation)", async () => {
    const agente = request.agent(app.getHttpServer());
    const prima = (await agente.post(`/api/prova/entra/${id.operatore}`).expect(201)).headers['set-cookie'];
    const { csrf } = (await agente.get('/api/accesso/io')).body;
    const dopo = (await agente.post(`/api/prova/entra/${id.amministratore}`).set('x-csrf-token', csrf).expect(201)).headers['set-cookie'];
    expect(prima?.[0].split(';')[0]).not.toBe(dopo?.[0].split(';')[0]);
    expect((await agente.get('/api/accesso/io')).body.ruolo).toBe('amministratore');
  });
});

describe('permessi', () => {
  it('rotta senza permesso dichiarato: negata a tutti', async () => {
    await (await entra('amministratore')).get('/api/prova/senza').expect(403);
  });

  it('permesso mancante: 403 ed evento auth.access_denied con IP', async () => {
    await (await entra('operatore')).get('/api/prova/gestione').expect(403);
    const ev = await db.registro.findFirstOrThrow({ where: { codice: 'auth.access_denied', utente_id: BigInt(id.operatore) } });
    expect(ev.dettaglio).toMatchObject({ rotta: '/api/prova/gestione', metodo: 'GET' });
    expect(ev.ip).toBeTruthy();
  });

  it('il ruolo si rilegge a ogni richiesta: declassato vale subito', async () => {
    const agente = await entra('amministratore');
    await agente.get('/api/prova/gestione').expect(200);
    await db.utenti.update({ where: { id: BigInt(id.amministratore) }, data: { ruolo: 'lettura' } });
    await agente.get('/api/prova/gestione').expect(403);
    await db.utenti.update({ where: { id: BigInt(id.amministratore) }, data: { ruolo: 'amministratore' } });
  });

  it('disattivato: fuori subito e sessione cancellata', async () => {
    const u = await db.utenti.create({ data: { email: 'via@prova-accesso.it', nome: 'via', ruolo: 'operatore', accesso: 'email' } });
    id.via = String(u.id);
    const agente = await entra('via');
    await db.utenti.update({ where: { id: u.id }, data: { attivo: false } });
    await agente.get('/api/accesso/io').expect(401);
    expect(await db.sessioni.count({ where: { utente_id: u.id } })).toBe(0);
  });
});

describe('CSRF', () => {
  it('con sessione, una modifica senza token è rifiutata; con il token passa', async () => {
    const agente = await entra('operatore');
    await agente.post('/api/prova/modifica').expect(403);
    await agente.post('/api/prova/modifica').set('x-csrf-token', 'sbagliato').expect(403);
    const { csrf } = (await agente.get('/api/accesso/io')).body;
    await agente.post('/api/prova/modifica').set('x-csrf-token', csrf).expect(201);
  });
});
