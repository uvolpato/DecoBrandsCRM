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

// D-45: nelle prove "operatore" e "lettura" sono utenti con quel livello in Dati e Provvigioni
const comeRuolo = (ruolo: string) => ['operatore', 'lettura'].includes(ruolo)
  ? { ruolo: 'utente', aree: { create: ['dati', 'provvigioni'].map((area) => ({ area, livello: ruolo })) } }
  : ruolo === 'amministratore' // come nella migrazione: chi amministrava prima è responsabile nelle aree
    ? { ruolo, aree: { create: ['dati', 'provvigioni'].map((area) => ({ area, livello: 'responsabile' })) } }
    : { ruolo };
async function crea(username: string, ruolo: string, altro: object = {}) {
  const u = await db.utenti.create({
    data: { username, email: username + DOMINIO, nome: 'Prova ' + username, ...comeRuolo(ruolo), password_hash: await cifra(PW), deve_cambiare_password: false, ...altro },
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

// nel corpo delle richieste: ruolo di Sistema + livelli (operatore/lettura → utente con quel livello)
const nuovo = (u: string, ruolo = 'operatore') => ({ username: u, nome: 'Prova ' + u, email: u + DOMINIO,
  ...(['operatore', 'lettura'].includes(ruolo) ? { ruolo: 'utente', aree: { provvigioni: ruolo } as object } : { ruolo, aree: undefined }) });

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

  it('cosa può fare ogni ruolo: dalla tabella dei permessi del server', async () => {
    const r = await (await entra('ammi')).get('/utenti/ruoli').expect(200);
    expect(r.body).toMatchObject({ ruoli: ['superutente', 'amministratore', 'utente'], livelli: ['lettura', 'operatore', 'responsabile'] });
    expect(r.body.permessi).toContainEqual({ id: 'sistema.amministratori', area: 'sistema', testo: 'Amministratori: creare, modificare, disattivare', ruoli: ['superutente'] });
    expect(r.body.permessi).toContainEqual(expect.objectContaining({ id: 'provvigioni.chiudi', area: 'provvigioni', minimo: 'responsabile' }));
    await (await entra('lett')).get('/utenti/ruoli').expect(403);
  });
});

describe('nuovo utente', () => {
  it('password provvisoria per email, da cambiare al primo accesso', async () => {
    const a = await entra('ammi');
    const r = await a.post('/utenti', nuovo('Nuovo1')).expect(400); // maiuscole: no
    expect(JSON.stringify(r.body)).toContain('minuscole');
    await a.post('/utenti', { ...nuovo('vuoto'), nome: '   ' }).expect(400, /Scrivi il nome/);
    const u = (await a.post('/utenti', nuovo('nuovo1')).expect(201)).body;
    expect(u).toMatchObject({ username: 'nuovo1', ruolo: 'utente', aree: { provvigioni: 'operatore' }, deve_cambiare_password: true });
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
    const { aree: _a, ...datiLett } = nuovo('lett', 'lettura'); // senza aree: restano come sono
    const u = (await a.put('/utenti/' + id.lett, { ...datiLett, nome: 'Giulia Lettura' }).expect(200)).body;
    expect(u.nome).toBe('Giulia Lettura');
    const ev = await db.registro.findFirstOrThrow({ where: { codice: 'crud.update', entita_id: BigInt(id.lett) }, orderBy: { id: 'desc' } });
    expect(ev.dettaglio).toMatchObject({ prima: { nome: 'Prova lett' }, dopo: { nome: 'Giulia Lettura' } });
    expect(Object.keys((ev.dettaglio as { dopo: object }).dopo)).toEqual(['nome']);
  });

  it("cambiare l'email annulla i link di reimpostazione mandati al vecchio indirizzo", async () => {
    await crea('trasloco', 'operatore');
    await db.accessi_link.create({ data: { utente_id: BigInt(id.trasloco), tipo: 'reset', impronta: 'a'.repeat(64), scade_il: new Date(Date.now() + 3600_000) } });
    await (await entra('ammi')).put('/utenti/' + id.trasloco, { ...nuovo('trasloco'), email: 'nuova-casa' + DOMINIO }).expect(200);
    expect(await db.accessi_link.count({ where: { utente_id: BigInt(id.trasloco) } })).toBe(0);
  });

  it('i propri dati sì, il proprio ruolo no', async () => {
    const a = await entra('ammi');
    await a.put('/utenti/' + id.ammi, { ...nuovo('ammi', 'amministratore'), nome: 'Ammi Nuovo' }).expect(200);
    await a.put('/utenti/' + id.ammi, nuovo('ammi', 'operatore')).expect(403);
    const { ruolo: _r, aree: _a, ...senzaRuolo } = nuovo('ammi');
    expect((await a.put('/utenti/' + id.ammi, { ...senzaRuolo, nome: 'Ammi Senza Ruolo' }).expect(200)).body).toMatchObject({ ruolo: 'amministratore', nome: 'Ammi Senza Ruolo' });
  });

  it('il superutente modifica i propri dati senza mandare il ruolo', async () => {
    const s = await entra('super');
    const { ruolo: _r, aree: _a, ...dati } = nuovo('super');
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
    const ris = await (await entra('ammi')).post(`/utenti/${id.smemo}/password`).expect(200);
    expect(ris.body).toMatchObject({ deve_cambiare_password: true }); // con ultimo_invio: l'interfaccia dice se l'email è partita
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

describe('livelli per area (D-45)', () => {
  it('l’amministratore dà i livelli; aree o livelli sconosciuti rifiutati; i propri no, il superutente sì', async () => {
    const a = await entra('ammi');
    const u = (await a.post('/utenti', { ...nuovo('areato'), aree: { provvigioni: 'responsabile', dati: 'lettura' } }).expect(201)).body;
    expect(u.aree).toEqual({ provvigioni: 'responsabile', dati: 'lettura' });
    await a.post('/utenti', { ...nuovo('areato2'), aree: { cucina: 'lettura' } }).expect(400, /area cucina/);
    await a.put('/utenti/' + u.id, { ...nuovo('areato'), aree: { provvigioni: 'capo' } }).expect(400);
    // un'area non mandata resta, null la toglie
    expect((await a.put('/utenti/' + u.id, { ...nuovo('areato'), aree: { provvigioni: 'operatore' } }).expect(200)).body.aree).toEqual({ provvigioni: 'operatore', dati: 'lettura' });
    expect((await a.put('/utenti/' + u.id, { ...nuovo('areato'), aree: { dati: null } }).expect(200)).body.aree).toEqual({ provvigioni: 'operatore' });
    const ev = await db.registro.findFirstOrThrow({ where: { codice: 'crud.update', entita_id: BigInt(u.id) }, orderBy: { id: 'desc' } });
    expect(ev.dettaglio).toMatchObject({ prima: { aree: { dati: 'lettura', provvigioni: 'operatore' } }, dopo: { aree: { provvigioni: 'operatore' } } });
    const { ruolo: _r, ...mieiDati } = nuovo('ammi');
    await a.put('/utenti/' + id.ammi, { ...mieiDati, aree: { vendite: 'responsabile' } }).expect(403, /tuoi livelli/);
    const s = await entra('super');
    const { ruolo: _s, ...suoiDati } = nuovo('super');
    expect((await s.put('/utenti/' + id.super, { ...suoiDati, aree: { provvigioni: 'responsabile' } }).expect(200)).body.aree).toEqual({ provvigioni: 'responsabile' });
  });

  it('nessuno dà più di quello che ha: livello ≤ al proprio, niente aree che non ha, niente utenti più in alto (D-45)', async () => {
    await crea('capetto', 'amministratore');
    await db.utenti_aree.update({ where: { utente_id_area: { utente_id: BigInt(id.capetto), area: 'provvigioni' } }, data: { livello: 'operatore' } });
    await db.utenti_aree.delete({ where: { utente_id_area: { utente_id: BigInt(id.capetto), area: 'dati' } } });
    const c = await entra('capetto');
    await c.post('/utenti', { ...nuovo('copia'), aree: { provvigioni: 'operatore' } }).expect(201); // una copia di sé sì
    await c.post('/utenti', { ...nuovo('troppo'), aree: { provvigioni: 'responsabile' } }).expect(403, /più del tuo livello/);
    await c.post('/utenti', { ...nuovo('altrove'), aree: { dati: 'lettura' } }).expect(403, /dati/);
    // stessa area: capo ha solo Provvigioni, un gradino sopra capetto
    await crea('capo', 'operatore');
    await db.utenti_aree.delete({ where: { utente_id_area: { utente_id: BigInt(id.capo), area: 'dati' } } });
    await db.utenti_aree.update({ where: { utente_id_area: { utente_id: BigInt(id.capo), area: 'provvigioni' } }, data: { livello: 'responsabile' } });
    await c.post('/utenti/' + id.capo + '/attivo', { attivo: false }).expect(403, /livello più alto/);
    await c.post('/utenti/' + id.capo + '/password', {}).expect(403, /livello più alto/);
    // alzare con la modifica un utente sotto di me oltre il mio livello: no
    const copia = await db.utenti.findFirstOrThrow({ where: { username: 'copia' } });
    await c.put('/utenti/' + copia.id, { ...nuovo('copia'), aree: { provvigioni: 'responsabile' } }).expect(403, /più del tuo livello/);
    await (await entra('super')).post('/utenti', { ...nuovo('dalsuper'), aree: { provvigioni: 'responsabile', dati: 'responsabile' } }).expect(201); // il superutente sì
  });

  it('i permessi seguono il livello, riletti a ogni richiesta', async () => {
    const o = await entra('oper');
    const io = async () => (await o.get('/accesso/io').expect(200)).body.permessi as string[];
    expect(await io()).not.toContain('provvigioni.chiudi');
    await db.utenti_aree.update({ where: { utente_id_area: { utente_id: BigInt(id.oper), area: 'provvigioni' } }, data: { livello: 'responsabile' } });
    expect(await io()).toContain('provvigioni.chiudi');
    await db.utenti_aree.deleteMany({ where: { utente_id: BigInt(id.oper) } });
    expect(await io()).toEqual(['collegato']);
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
