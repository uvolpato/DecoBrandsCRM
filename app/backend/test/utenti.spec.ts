// Prova delle API degli utenti (passo 1.12, §7.13, §8.3, D-39): le regole stanno sul server.
import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configura } from '../src/main';
import { cifra, verifica } from '../src/password';
import * as posta from '../src/posta';
import { PrismaService } from '../src/prisma.service';
import { restaUnAmministratore } from '../src/utenti';

let app: NestExpressApplication;
let db: PrismaService;
const DOMINIO = '@prova-utenti.it';
const PW = 'password-di-prova';
const id: Record<string, string> = {};
let spia: jest.SpyInstance;

async function crea(username: string, ruolo: string, altro: object = {}) {
  const u = await db.utenti.create({
    data: { username, email: username + DOMINIO, nome: 'Prova ' + username, ruolo, password_hash: await cifra(PW), deve_cambiare_password: false, ...altro },
  });
  id[username] = String(u.id);
}

// una sessione per utente, riusata: il limite ai tentativi conta anche gli accessi riusciti
const sessioni: Record<string, Awaited<ReturnType<typeof apri>>> = {};
const entra = async (utente: string) => (sessioni[utente] ??= await apri(utente));

async function apri(utente: string) {
  const agente = request.agent(app.getHttpServer());
  const r = await agente.post('/api/accesso/entra').send({ utente, password: PW }).expect(200);
  const csrf = r.body.csrf as string;
  return {
    get: (p: string) => agente.get('/api' + p),
    post: (p: string, b: object = {}) => agente.post('/api' + p).set('x-csrf-token', csrf).send(b),
    put: (p: string, b: object) => agente.put('/api' + p).set('x-csrf-token', csrf).send(b),
    del: (p: string) => agente.delete('/api' + p).set('x-csrf-token', csrf),
  };
}

const nuovo = (u: string, ruolo = 'operatore') => ({ username: u, nome: 'Prova ' + u, email: u + DOMINIO, ruolo });

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
  db = app.get(PrismaService);
  // il superutente è uno solo (D-39): se c'è quello vero non si tocca, altrimenti se ne crea uno di prova
  if (!(await db.utenti.findFirst({ where: { ruolo: 'superutente' } }))) await crea('super', 'superutente');
  await crea('ammi', 'amministratore');
  await crea('ammi2', 'amministratore');
  await crea('oper', 'operatore');
  await crea('lett', 'lettura');
  spia = jest.spyOn(posta, 'mandaPassword').mockResolvedValue();
});

afterAll(async () => {
  spia.mockRestore();
  const utenti = (await db.utenti.findMany({ where: { email: { endsWith: DOMINIO } } })).map((u) => u.id);
  await db.$transaction([
    db.$executeRaw`SET LOCAL decobrands.pulizia_registro = 'si'`,
    db.registro.deleteMany({ where: { OR: [{ utente_id: { in: utenti } }, { entita: 'utente', entita_id: { in: utenti } }, { dettaglio: { path: ['email'], string_ends_with: DOMINIO } }] } }),
    db.sessioni.deleteMany({ where: { utente_id: { in: utenti } } }),
    db.utenti.deleteMany({ where: { id: { in: utenti } } }),
  ]);
  await app.close();
});

describe('elenco e scheda', () => {
  it('solo con il permesso gestione; mai la password', async () => {
    const a = await entra('ammi');
    const r = await a.get('/utenti').expect(200);
    expect(r.body.some((u: { username: string }) => u.username === 'oper')).toBe(true);
    expect(JSON.stringify(r.body)).not.toContain('scrypt');
    await (await a.get('/utenti/' + id.oper).expect(200));
    await (await entra('oper')).get('/utenti').expect(403);
  });
});

describe('nuovo utente', () => {
  it('password provvisoria per email, da cambiare al primo accesso', async () => {
    const a = await entra('ammi');
    const r = await a.post('/utenti', nuovo('Nuovo1')).expect(400); // maiuscole: no
    expect(JSON.stringify(r.body)).toContain('minuscole');
    const u = (await a.post('/utenti', nuovo('nuovo1')).expect(201)).body;
    expect(u).toMatchObject({ username: 'nuovo1', ruolo: 'operatore', deve_cambiare_password: true });
    const [, , password, tipo] = spia.mock.calls.at(-1)!;
    expect(tipo).toBe('benvenuto');
    const salvato = await db.utenti.findUniqueOrThrow({ where: { id: BigInt(u.id) } });
    expect(await verifica(password, salvato.password_hash)).toBe(true);
    expect(await db.registro.count({ where: { entita: 'utente', entita_id: salvato.id, codice: { in: ['crud.create', 'auth.password_temp'] } } })).toBe(2);
  });

  it('nome utente o email già usati: 409 con il messaggio giusto', async () => {
    const a = await entra('ammi');
    expect((await a.post('/utenti', { ...nuovo('oper'), email: 'diversa' + DOMINIO }).expect(409)).body.message).toContain('nome utente');
    expect((await a.post('/utenti', { ...nuovo('altro'), email: 'oper' + DOMINIO }).expect(409)).body.message).toContain('email');
  });

  it('un amministratore non crea amministratori né superutenti', async () => {
    const a = await entra('ammi');
    await a.post('/utenti', nuovo('capo', 'amministratore')).expect(403);
    await a.post('/utenti', nuovo('capo', 'superutente')).expect(400);
    await (await entra('oper')).post('/utenti', nuovo('capo')).expect(403);
  });
});

describe('modifica', () => {
  it('cambia i dati e scrive nel registro solo i campi cambiati', async () => {
    const a = await entra('ammi');
    const u = (await a.put('/utenti/' + id.lett, { ...nuovo('lett', 'lettura'), nome: 'Giulia Lettura' }).expect(200)).body;
    expect(u.nome).toBe('Giulia Lettura');
    const ev = await db.registro.findFirstOrThrow({ where: { codice: 'crud.update', entita_id: BigInt(id.lett) }, orderBy: { id: 'desc' } });
    expect(ev.dettaglio).toMatchObject({ prima: { nome: 'Prova lett' }, dopo: { nome: 'Giulia Lettura' } });
    expect(Object.keys((ev.dettaglio as { dopo: object }).dopo)).toEqual(['nome']);
  });

  it('i propri dati sì, il proprio ruolo no', async () => {
    const a = await entra('ammi');
    await a.put('/utenti/' + id.ammi, { ...nuovo('ammi', 'amministratore'), nome: 'Ammi Nuovo' }).expect(200);
    await a.put('/utenti/' + id.ammi, nuovo('ammi', 'operatore')).expect(403);
    const { ruolo: _r, ...senzaRuolo } = nuovo('ammi');
    expect((await a.put('/utenti/' + id.ammi, { ...senzaRuolo, nome: 'Ammi Senza Ruolo' }).expect(200)).body).toMatchObject({ ruolo: 'amministratore', nome: 'Ammi Senza Ruolo' });
  });

  it('il superutente modifica i propri dati senza mandare il ruolo', async () => {
    const s = await entra('super');
    const { ruolo: _r, ...dati } = nuovo('super');
    expect((await s.put('/utenti/' + id.super, { ...dati, nome: 'Super Nuovo' }).expect(200)).body).toMatchObject({ ruolo: 'superutente', nome: 'Super Nuovo' });
  });

  it('un amministratore non tocca altri amministratori né il superutente', async () => {
    const a = await entra('ammi');
    await a.put('/utenti/' + id.ammi2, nuovo('ammi2', 'operatore')).expect(403);
    const su = await db.utenti.findFirstOrThrow({ where: { ruolo: 'superutente' } });
    await a.put('/utenti/' + su.id, nuovo(su.username, 'operatore')).expect(403);
    await a.post(`/utenti/${su.id}/password`).expect(403);
  });
});

describe('disattiva, riattiva, reimposta, elimina', () => {
  it('disattivato: fuori subito, sessioni cancellate; poi riattivato', async () => {
    await crea('via', 'operatore');
    const lui = await apri('via');
    const a = await entra('ammi');
    expect((await a.post(`/utenti/${id.via}/attivo`, { attivo: false }).expect(200)).body.attivo).toBe(false);
    await lui.get('/accesso/io').expect(401);
    expect(await db.sessioni.count({ where: { utente_id: BigInt(id.via) } })).toBe(0);
    await a.post(`/utenti/${id.via}/attivo`, { attivo: true }).expect(200);
    await apri('via');
  });

  it('non su sé stessi', async () => {
    const a = await entra('ammi');
    await a.post(`/utenti/${id.ammi}/attivo`, { attivo: false }).expect(403);
    await a.del('/utenti/' + id.ammi).expect(403);
    await a.post(`/utenti/${id.ammi}/password`).expect(403);
  });

  it('reimposta: nuova password provvisoria, la vecchia e le sessioni non valgono più', async () => {
    await crea('smemo', 'operatore');
    const lui = await apri('smemo');
    await (await entra('ammi')).post(`/utenti/${id.smemo}/password`).expect(204);
    const [, , password, tipo] = spia.mock.calls.at(-1)!;
    expect(tipo).toBe('password');
    await lui.get('/accesso/io').expect(401);
    await request(app.getHttpServer()).post('/api/accesso/entra').send({ utente: 'smemo', password: PW }).expect(401);
    const r = await request(app.getHttpServer()).post('/api/accesso/entra').send({ utente: 'smemo', password }).expect(200);
    expect(r.body.cambia_password).toBe(true);
  });

  it('elimina; chi ha chiuso un trimestre non si elimina, si disattiva', async () => {
    const a = await entra('ammi');
    await crea('effimero', 'operatore');
    await a.del('/utenti/' + id.effimero).expect(204);
    expect(await db.utenti.count({ where: { id: BigInt(id.effimero) } })).toBe(0);
    await crea('contabile', 'operatore');
    const liq = await db.liquidazioni.create({ data: { anno: 1999, trimestre: 1, chiusa_da: BigInt(id.contabile), totali: {} } });
    expect((await a.del('/utenti/' + id.contabile).expect(409)).body.message).toContain('disattivalo');
    await db.liquidazioni.delete({ where: { id: liq.id } });
  });
});

describe('almeno un amministratore attivo', () => {
  // la via passa solo dal superutente (l'amministratore non tocca gli altri amministratori), che nel
  // database vero è uno solo e non si usa nelle prove: si prova la regola direttamente, in una
  // transazione annullata
  it("l'ultimo amministratore attivo non si toglie; con un altro attivo sì", async () => {
    const annulla = new Error('annulla');
    await expect(db.$transaction(async (tx) => {
      const ammi2 = await tx.utenti.findUniqueOrThrow({ where: { id: BigInt(id.ammi2) } });
      await expect(restaUnAmministratore(tx, ammi2)).resolves.toBeUndefined(); // c'è ancora ammi
      await tx.utenti.updateMany({ where: { ruolo: 'amministratore', NOT: { id: ammi2.id } }, data: { attivo: false } });
      await expect(restaUnAmministratore(tx, ammi2)).rejects.toThrow('almeno un amministratore');
      throw annulla;
    })).rejects.toBe(annulla);
  });
});
