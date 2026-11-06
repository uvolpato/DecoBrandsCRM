import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configura } from '../src/main';
import { caricaDati } from '../src/motore/dati';
import { quotaSub, r2, righeLiquidazione, trovaDocumento } from '../src/motore/motore';
import { cifra } from '../src/password';
import { PrismaService } from '../src/prisma.service';
import { seed } from '../prisma/seed';
import { svuota } from './svuota';

// F1-A6: correzione della quota del subagente su un documento (§4.2.7.2, D-27, §8.1).
// La provvigione del subagente cambia nel trimestre, "una fattura al mese" resta, i trimestri chiusi
// e i documenti non fiscali si rifiutano, il motivo è obbligatorio, l'evento è scritto.

/* eslint-disable @typescript-eslint/no-explicit-any */
let app: NestExpressApplication;
let db: PrismaService;
const DOMINIO = '@prova-correzione.it';
const PW = 'password-di-prova';

async function creaUtente(username: string, livello: string) {
  await db.utenti.create({
    data: {
      username, email: username + DOMINIO, nome: 'Prova ' + username, ruolo: 'utente',
      aree: { create: [{ area: 'provvigioni', livello }] }, password_hash: await cifra(PW), deve_cambiare_password: false,
    },
  });
}
async function entra(utente: string) {
  const agente = request.agent(app.getHttpServer());
  const csrf = (await agente.post('/api/accesso/entra').send({ utente, password: PW }).expect(200)).body.csrf as string;
  return {
    get: (p: string) => agente.get('/api' + p),
    put: (p: string, b: object) => agente.put('/api' + p).set('x-csrf-token', csrf).send(b),
    del: (p: string) => agente.delete('/api' + p).set('x-csrf-token', csrf),
  };
}
let op: Awaited<ReturnType<typeof entra>>, lett: Awaited<ReturnType<typeof entra>>;

const fornitore = async (nome: string) => (await db.fornitori_versioni.findFirstOrThrow({ where: { ragione_sociale: { startsWith: nome } } })).fornitore_id;
const rigaDi = (S: any, id: string) => righeLiquidazione(S, 2026, 3).find((r: any) => r.documento_id === id);
/** Una fattura liquidabile del 3° trimestre di un fornitore che paga sul fatturato (non maturato). */
const fatturaFatturato = async () => {
  const S = await caricaDati(db);
  return righeLiquidazione(S, 2026, 3).find((r) => r.tipo === 'fattura' && r.liquidabile && !r.voce && S.fornitori.get(r.fornitore_id)!.maturazione !== 'maturato')!;
};

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
  db = app.get(PrismaService);
  await svuota(db);
  await seed(db);
  await creaUtente('op-cor', 'operatore');
  await creaUtente('lett-cor', 'lettura');
  [op, lett] = await Promise.all([entra('op-cor'), entra('lett-cor')]);
}, 120_000);

afterAll(async () => {
  const utenti = (await db.utenti.findMany({ where: { email: { endsWith: DOMINIO } } })).map((u) => u.id);
  await svuota(db);
  await db.$transaction([
    db.$executeRaw`SET LOCAL decobrands.pulizia_registro = 'si'`,
    db.registro.deleteMany({ where: { utente_id: { in: utenti } } }),
    db.sessioni.deleteMany({ where: { utente_id: { in: utenti } } }),
    db.utenti.deleteMany({ where: { id: { in: utenti } } }),
  ]);
  await app.close();
});

describe('PUT /api/documenti-fiscali/:id/correzione', () => {
  it('cambia la provvigione del subagente nel trimestre, la pagina la espone, DELETE la riporta', async () => {
    const riga = await fatturaFatturato();
    const id = riga.documento_id;
    const prima = Number(riga.provvigione);

    const r = await op.put(`/documenti-fiscali/${id}/correzione`, { tipo: 'pct', valore: 5, motivo: 'accordo particolare' }).expect(200);
    expect(r.body).toMatchObject({ documento_id: id, tipo: 'pct', valore: 5, motivo: 'accordo particolare' });
    expect(r.body.creato_il).toEqual(expect.any(String));

    // la provvigione nel trimestre cambia (V12: ricalcolata dal motore sul database)
    const S1 = await caricaDati(db);
    const dopo = rigaDi(S1, id)!;
    expect(Number(dopo.provvigione)).toBe(Number(r2(dopo.importo.times(5).div(100))));
    expect(dopo.regola).toBe('correzione');
    expect(Number(dopo.provvigione)).not.toBe(prima);

    // la pagina vede la correzione (per Correggi / Cambia la correzione)
    const pagina = (await op.get(`/liquidazioni?anno=2026&trimestre=3`).expect(200)).body;
    const rigaPagina = pagina.documenti.find((x: any) => x.documento_id === id);
    expect(rigaPagina.correzione).toEqual({ tipo: 'pct', valore: 5, motivo: 'accordo particolare' });

    // evento crud.create
    const evento = await db.registro.findFirst({ where: { codice: 'crud.create', entita: 'correzione' } });
    expect(evento).toBeTruthy();
    expect(evento!.dettaglio).toMatchObject({
      documento_id: id, prima: null, dopo: { tipo: 'pct', valore: 5, motivo: 'accordo particolare' },
    });

    // DELETE riporta la regola normale
    await op.del(`/documenti-fiscali/${id}/correzione`).expect(204);
    const S2 = await caricaDati(db);
    expect(Number(rigaDi(S2, id)!.provvigione)).toBe(prima);
    expect(await db.provvigioni_correzioni.count({ where: { documento_id: BigInt(id) } })).toBe(0);
  });

  it('upsert: una seconda correzione aggiorna la stessa riga (crud.update)', async () => {
    const id = (await fatturaFatturato()).documento_id;
    await op.put(`/documenti-fiscali/${id}/correzione`, { tipo: 'importo', valore: 10, motivo: 'primo' }).expect(200);
    await op.put(`/documenti-fiscali/${id}/correzione`, { tipo: 'nessuna', motivo: 'secondo' }).expect(200);
    expect(await db.provvigioni_correzioni.count({ where: { documento_id: BigInt(id) } })).toBe(1);
    const evento = await db.registro.findFirst({ where: { codice: 'crud.update', entita: 'correzione' } });
    expect(evento!.dettaglio).toMatchObject({
      documento_id: id, prima: { tipo: 'importo', valore: 10, motivo: 'primo' }, dopo: { tipo: 'nessuna', valore: 0, motivo: 'secondo' },
    });
    await op.del(`/documenti-fiscali/${id}/correzione`).expect(204);
  });

  it('«una fattura al mese» resta invariata; la correzione la supera (D-27)', async () => {
    const gries = await fornitore('Gries');
    const { pratica: p, doc } = trovaDocumento(await caricaDati(db), 'F-2026-0858')!;
    const ab = await db.interscambio.findFirstOrThrow({ where: { cliente_id: BigInt(p.cliente_id), fornitore_id: BigInt(p.fornitore_id) } });
    await db.interscambio.update({ where: { id: ab.id }, data: { regola_mensile: 'prima' } });
    try {
      const S = await caricaDati(db);
      const q = (numero: string) => { const x = trovaDocumento(S, numero)!; return quotaSub(S, x.pratica, x.doc)!; };
      expect(q('F-2026-0858').provvigione.gt(0)).toBe(true); // la prima del mese vale
      expect(q('F-2026-0862').regola).toBe('mensile'); // la seconda resta a zero
      expect(q('F-2026-0862').provvigione.isZero()).toBe(true);
    } finally {
      await db.interscambio.update({ where: { id: ab.id }, data: { regola_mensile: null } });
    }
  });

  it('trimestre chiuso 409, documento non fiscale 400, valori non validi 400, permesso 403', async () => {
    const liquidato = await db.ordini_fornitore_documenti.findFirstOrThrow({ where: { liquidazione_id: { not: null } } });
    const mess = (await op.put(`/documenti-fiscali/${liquidato.id}/correzione`, { tipo: 'pct', valore: 5, motivo: 'x' }).expect(409)).body.message;
    expect(mess).toMatch(/già liquidata/);

    const ordine = await db.ordini_fornitore_documenti.findFirstOrThrow({ where: { tipo: 'ordine' } });
    await op.put(`/documenti-fiscali/${ordine.id}/correzione`, { tipo: 'pct', valore: 5, motivo: 'x' }).expect(400);

    const id = (await fatturaFatturato()).documento_id;
    await op.put(`/documenti-fiscali/${id}/correzione`, { tipo: 'pct', valore: 5, motivo: '  ' }).expect(400); // motivo vuoto
    await op.put(`/documenti-fiscali/${id}/correzione`, { tipo: 'pct', valore: 101, motivo: 'x' }).expect(400); // pct fuori range
    await op.put(`/documenti-fiscali/${id}/correzione`, { tipo: 'importo', valore: -1, motivo: 'x' }).expect(400); // importo negativo
    await op.put(`/documenti-fiscali/99999999/correzione`, { tipo: 'pct', valore: 5, motivo: 'x' }).expect(404); // inesistente
    await lett.put(`/documenti-fiscali/${id}/correzione`, { tipo: 'pct', valore: 5, motivo: 'x' }).expect(403); // senza modifica
  });
});
