// Prova delle API di agenti e subagenti (F1-A2, ��4.2.4, ��4.2.5, ��7.5).
import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { Module } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { AgentiController, SubagentiController } from '../src/subagenti';
import { configura } from '../src/main';
import { cifra } from '../src/password';
import { PrismaService } from '../src/prisma.service';
import { svuota } from './svuota';
import { seed } from '../prisma/seed';

@Module({ imports: [AppModule], controllers: [AgentiController, SubagentiController] })
class ProvaModule {}

let app: NestExpressApplication;
let db: PrismaService;
const DOMINIO = '@prova-sub.it';
const PW = 'password-di-prova';
const id: Record<string, string> = {};
let agenteId: string;
const CLIENTE_TEST = 999001;
const FORNITORE_TEST = 999001;

async function crea(username: string, ruolo: string, area = 'dati', livello = 'operatore') {
  const u = await db.utenti.create({
    data: {
      username, email: username + DOMINIO, nome: 'Prova ' + username,
      ruolo: ruolo === 'superutente' ? 'superutente' : 'utente',
      password_hash: await cifra(PW), deve_cambiare_password: false,
      aree: ruolo === 'superutente' ? undefined : { create: [{ area, livello }] },
    },
  });
  id[username] = String(u.id);
}

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

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [ProvaModule] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
  db = app.get(PrismaService);
  await svuota(db);
  await seed(db);

  if (!(await db.utenti.findFirst({ where: { ruolo: 'superutente' } }))) await crea('super', 'superutente');
  await crea('ammi', 'amministratore');
  // utente con lettura dati
  await db.utenti.create({
    data: { username: 'lett', email: 'lett' + DOMINIO, nome: 'Prova lett', ruolo: 'utente', password_hash: await cifra(PW), deve_cambiare_password: false,
      aree: { create: [{ area: 'dati', livello: 'lettura' }] } },
  }).then((u) => { id.lett = String(u.id); });
  // utente con operatore dati
  await db.utenti.create({
    data: { username: 'oper', email: 'oper' + DOMINIO, nome: 'Prova oper', ruolo: 'utente', password_hash: await cifra(PW), deve_cambiare_password: false,
      aree: { create: [{ area: 'dati', livello: 'operatore' }] } },
  }).then((u) => { id.oper = String(u.id); });

  // un agente di prova
  const a = await db.agenti.create({ data: { codice: 'AG-TEST', nome: 'Agente', cognome: 'Test' } });
  agenteId = String(a.id);

  // dati minimi per provare il blocco FK (interscambio)
  await db.$executeRaw`INSERT INTO fornitori (id) VALUES (${FORNITORE_TEST})`;
  await db.$executeRaw`INSERT INTO fornitori_versioni (id, fornitore_id, fonte, ragione_sociale) VALUES (${FORNITORE_TEST}, ${FORNITORE_TEST}, 'integra', 'Fornitore Test')`;
  await db.$executeRaw`UPDATE fornitori SET versione_corrente_id = ${FORNITORE_TEST} WHERE id = ${FORNITORE_TEST}`;
  await db.$executeRaw`INSERT INTO clienti (id) VALUES (${CLIENTE_TEST})`;
  await db.$executeRaw`INSERT INTO clienti_versioni (id, cliente_id, fonte, piva, ragione_sociale) VALUES (${CLIENTE_TEST}, ${CLIENTE_TEST}, 'integra', 'IT9', 'Cliente Test')`;
  await db.$executeRaw`UPDATE clienti SET versione_corrente_id = ${CLIENTE_TEST} WHERE id = ${CLIENTE_TEST}`;
});

afterAll(async () => {
  // ripulisci subagenti e agente creati
  const sub = await db.subagenti.findMany({ where: { codice: { startsWith: 'S-TEST' } } });
  const subIds = sub.map((s) => s.id);
  if (subIds.length) {
    await db.$transaction([
      db.$executeRaw`SET LOCAL decobrands.pulizia_registro = 'si'`,
      db.registro.deleteMany({ where: { entita: 'subagente', entita_id: { in: subIds } } }),
    ]).catch(() => {});
    await db.subagenti.deleteMany({ where: { id: { in: subIds } } });
  }
  // rimuovi interscambio di prova
  await db.interscambio.deleteMany({ where: { cliente_id: BigInt(CLIENTE_TEST) } }).catch(() => {});
  await db.$executeRaw`DELETE FROM clienti_versioni WHERE cliente_id = ${CLIENTE_TEST}`.catch(() => {});
  await db.$executeRaw`DELETE FROM clienti WHERE id = ${CLIENTE_TEST}`.catch(() => {});
  await db.$executeRaw`DELETE FROM fornitori_versioni WHERE fornitore_id = ${FORNITORE_TEST}`.catch(() => {});
  await db.$executeRaw`DELETE FROM fornitori WHERE id = ${FORNITORE_TEST}`.catch(() => {});

  await db.agenti.deleteMany({ where: { id: BigInt(agenteId) } }).catch(() => {});

  const utenti = (await db.utenti.findMany({ where: { email: { endsWith: DOMINIO } } })).map((u) => u.id);
  await db.$transaction([
    db.$executeRaw`SET LOCAL decobrands.pulizia_registro = 'si'`,
    db.registro.deleteMany({ where: { OR: [{ utente_id: { in: utenti } }, { entita: 'subagente', entita_id: { in: subIds } }] } }),
    db.sessioni.deleteMany({ where: { utente_id: { in: utenti } } }),
    db.utenti.deleteMany({ where: { id: { in: utenti } } }),
  ]).catch(() => {});
  await svuota(db);
  await app.close();
});

describe('agenti', () => {
  it('elenco richiede dati.consulta', async () => {
    await (await entra('lett')).get('/agenti').expect(200);
    await (await entra('oper')).get('/agenti').expect(200);
  });
  it('dettaglio agente', async () => {
    const r = await (await entra('oper')).get('/agenti/' + agenteId).expect(200);
    expect(r.body.codice).toBe('AG-TEST');
  });
});

describe('subagenti', () => {
  let creatoId: string;
  it('lettura non crea', async () => {
    await (await entra('lett')).post('/subagenti', { codice: 'S-TEST-1', nome: 'Anna', cognome: 'Rossi', agente_id: Number(agenteId) }).expect(403);
  });
  it('crea subagente', async () => {
    const a = await entra('oper');
    const r = await a.post('/subagenti', { codice: 'S-TEST-1', nome: 'Anna', cognome: 'Rossi', email: 'anna@test.it', agente_id: Number(agenteId) }).expect(201);
    expect(r.body).toMatchObject({ codice: 'S-TEST-1', nome: 'Anna', cognome: 'Rossi', attivo: true });
    creatoId = r.body.id;
  });
  it('codice duplicato: 409', async () => {
    const a = await entra('oper');
    const r = await a.post('/subagenti', { codice: 'S-TEST-1', nome: 'Altro', cognome: 'X', agente_id: Number(agenteId) }).expect(409);
    expect(r.body.message).toContain('codice');
  });
  it('agente inesistente: 404', async () => {
    const a = await entra('oper');
    await a.post('/subagenti', { codice: 'S-TEST-2', nome: 'Luca', cognome: 'Bianchi', agente_id: 999999 }).expect(404);
  });
  it('modifica: null e attivo rifiutati (attivo si cambia con /attivo)', async () => {
    const a = await entra('oper');
    for (const b of [{ codice: null }, { agente_id: null }, { attivo: false }]) await a.put('/subagenti/' + creatoId, b).expect(400);
  });

  it('modifica', async () => {
    const a = await entra('oper');
    const r = await a.put('/subagenti/' + creatoId, { nome: 'Anna Maria' }).expect(200);
    expect(r.body.nome).toBe('Anna Maria');
  });
  it('disattiva e riattiva', async () => {
    const a = await entra('oper');
    const r = await a.post('/subagenti/' + creatoId + '/attivo', { attivo: false }).expect(200);
    expect(r.body.attivo).toBe(false);
    await a.post('/subagenti/' + creatoId + '/attivo', { attivo: true }).expect(200);
  });
  it('elimina se senza FK', async () => {
    const a = await entra('oper');
    await a.del('/subagenti/' + creatoId).expect(204);
  });
  it('eliminazione bloccata da FK: 409', async () => {
    const a = await entra('oper');
    // crea un subagente
    const r = await a.post('/subagenti', { codice: 'S-TEST-FK', nome: 'FK', cognome: 'Test', agente_id: Number(agenteId) }).expect(201);
    const fkId = r.body.id;
    // collega un interscambio
    await db.$executeRaw`INSERT INTO interscambio (subagente_id, cliente_id, fornitore_id, valido_dal) VALUES (${fkId}, ${CLIENTE_TEST}, ${FORNITORE_TEST}, '2026-01-01')`;
    const del = await a.del('/subagenti/' + fkId);
    expect(del.status).toBe(409);
    expect(del.body.message).toContain('disattivalo');
    // pulizia
    await db.interscambio.deleteMany({ where: { subagente_id: BigInt(fkId) } });
    await db.subagenti.delete({ where: { id: BigInt(fkId) } }).catch(() => {});
    await db.$transaction([
      db.$executeRaw`SET LOCAL decobrands.pulizia_registro = 'si'`,
      db.registro.deleteMany({ where: { entita: 'subagente', entita_id: BigInt(fkId) } }),
    ]).catch(() => {});
  });
  it('elenco e scheda', async () => {
    const a = await entra('oper');
    await a.get('/subagenti').expect(200);
  });
});
