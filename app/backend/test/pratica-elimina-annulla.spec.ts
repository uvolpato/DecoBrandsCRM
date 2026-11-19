import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import type { Response } from 'supertest';
import { AppModule } from '../src/app.module';
import { configura } from '../src/main';
import { caricaDati } from '../src/motore/dati';
import { aggiornaPratica } from '../src/pratiche';
import { fattiAnalisi, righeLiquidazione } from '../src/motore/motore';
import { cifra } from '../src/password';
import { PrismaService } from '../src/prisma.service';
import { seed } from '../prisma/seed';
import { svuota } from './svuota';

// D-206/D-207 §19: eliminazione definitiva e annullamento reversibile di una pratica. Una sola
// transazione (V13); solo amministratore per l'eliminazione; l'annullamento è reversibile e mette
// la pratica davanti a ogni stato ricavato, fuori da attese, liquidazioni e Analisi.

/* eslint-disable @typescript-eslint/no-explicit-any */
let app: NestExpressApplication;
let db: PrismaService;
const DOMINIO = '@prova-eliminaannulla.it';
const PW = 'password-di-prova';

type Agente = {
  get: (p: string) => request.Test;
  post: (p: string, corpo?: object) => request.Test;
  put: (p: string, corpo?: object) => request.Test;
  delete: (p: string, corpo?: object) => request.Test;
};

async function creaUtente(username: string, ruolo: string, aree: { area: string; livello: string }[]) {
  await db.utenti.create({
    data: {
      username, email: username + DOMINIO, nome: 'Prova ' + username, ruolo,
      aree: { create: aree }, password_hash: await cifra(PW), deve_cambiare_password: false,
    },
  });
}

async function entra(utente: string): Promise<Agente> {
  const a = request.agent(app.getHttpServer());
  const csrf = (await a.post('/api/accesso/entra').send({ utente, password: PW }).expect(200)).body.csrf as string;
  return {
    get: (p) => a.get('/api' + p),
    post: (p, c) => a.post('/api' + p).set('x-csrf-token', csrf).send(c ?? {}),
    put: (p, c) => a.put('/api' + p).set('x-csrf-token', csrf).send(c ?? {}),
    delete: (p, c) => a.delete('/api' + p).set('x-csrf-token', csrf).send(c ?? {}),
  };
}

let admin: Agente;      // amministratore: elimina ammessa
let operatore: Agente;  // utente con provvigioni.modifica (annulla), senza ruolo amministratore
let responsabile: Agente; // utente con provvigioni.elimina ma non amministratore: 403 all'eliminazione

/** Base di una pratica: un fornitore e un cliente del seed già con agenzia e scaglioni. */
async function basePratica() {
  const t = await db.ordini_fornitore_testata.findFirstOrThrow({ where: { documenti: { some: { tipo: 'fattura' } } }, orderBy: { id: 'asc' } });
  return { fornitore_id: t.fornitore_id, fornitore_versione_id: t.fornitore_versione_id, cliente_id: t.cliente_id, cliente_versione_id: t.cliente_versione_id };
}

/** Crea una pratica nuova (ordine + fattura + righe) e torna l'id. `numeroOrdine` è il numero d'ordine fornitore. */
async function creaPratica(numero: string, numeroOrdine?: string) {
  const b = await basePratica();
  const t = await db.ordini_fornitore_testata.create({ data: {
    fornitore_id: b.fornitore_id, fornitore_versione_id: b.fornitore_versione_id,
    cliente_id: b.cliente_id, cliente_versione_id: b.cliente_versione_id,
    numero_ordine: numero, data_ordine: new Date('2026-09-01'), ...(numeroOrdine ? { numero_ordine_fornitore: numeroOrdine } : {}),
  } });
  const ordine = await db.ordini_fornitore_documenti.create({ data: { testata_id: t.id, tipo: 'ordine', numero: numero + '-o', data: new Date('2026-09-01'), importo: 100 } });
  await db.ordini_fornitore_documenti.create({ data: { testata_id: t.id, tipo: 'fattura', numero: numero + '-f', data: new Date('2026-09-03'), importo: 100 } });
  await db.ordini_fornitore_righe.createMany({ data: [
    { testata_id: t.id, documento_id: ordine.id, fase: 'ordine', numero_riga: 1, codice: 'X', descrizione: 'X', quantita: 10, prezzo_unitario: 10, importo: 100 },
  ] });
  await db.$transaction(async (tx) => { await aggiornaPratica(tx, t.id); });
  return t.id;
}

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
  db = app.get(PrismaService);
  await svuota(db);
  await seed(db);
  await creaUtente('admin-ea', 'amministratore', [{ area: 'provvigioni', livello: 'responsabile' }]);
  await creaUtente('oper-ea', 'utente', [{ area: 'provvigioni', livello: 'operatore' }]);
  await creaUtente('resp-ea', 'utente', [{ area: 'provvigioni', livello: 'responsabile' }]);
  [admin, operatore, responsabile] = await Promise.all([entra('admin-ea'), entra('oper-ea'), entra('resp-ea')]);
}, 120_000);

afterAll(async () => {
  // svuota tronca prima le tabelle (via l'annullata_da) e poi toglie gli utenti di prova (D-207: annullata_da è RESTRICT)
  await svuota(db);
  await app.close();
});

describe('POST /api/pratiche/:id/annulla e ripristina (D-207)', () => {
  it('annulla una pratica aperta: stato annullata, provvigione aperti 0, fuori da liquidazione e Analisi', async () => {
    const id = await creaPratica('OF/2026/901');
    const prima = (await operatore.get(`/pratiche/${id}`).expect(200)).body as any;
    expect(prima.stato).toBe('fatturata');
    expect(prima.provvigione.a_decobrands).toBeGreaterThan(0); // con agenzia e scaglioni la provvigione c'è

    await operatore.post(`/pratiche/${id}/annulla`, { motivo: 'ordine sbagliato', data: '2026-09-10' }).expect(201);
    const dopo = (await operatore.get(`/pratiche/${id}`).expect(200)).body as any;
    expect(dopo.stato).toBe('annullata');
    expect(dopo.annullata).toMatchObject({ il: '2026-09-10', motivo: 'ordine sbagliato' });
    expect(dopo.provvigione.a_decobrands).toBe(0);
    expect(dopo.provvigione.a_subagente).toBe(0);
    // D-207 (miglioria 3): il calcolo salvato degli aperti è azzerato, non conserva i valori vecchi
    const fattura = await db.ordini_fornitore_documenti.findFirstOrThrow({ where: { testata_id: id, tipo: 'fattura' } });
    expect((fattura.calcolo as any).provvigione_agente).toBe('0.00');
    expect((fattura.calcolo as any).provvigione_subagente).toBe('0.00');

    // fuori da liquidazione e Analisi (i documenti non contano più)
    const S = await caricaDati(db);
    const liq = righeLiquidazione(S, 2026, 3);
    expect(liq.some((r) => r.pratica_id === String(id))).toBe(false);
    expect(fattiAnalisi(S).some((f) => f.pratica_id === String(id))).toBe(false);

    // ripristina: torna come prima
    await operatore.post(`/pratiche/${id}/ripristina`, { motivo: 'era giusto' }).expect(201);
    const rip = (await operatore.get(`/pratiche/${id}`).expect(200)).body as any;
    expect(rip.stato).toBe('fatturata');
    expect(rip.annullata).toBeNull();
    expect(rip.provvigione.a_decobrands).toBeGreaterThan(0);
  });

  it('motivo vuoto: 400; già annullata: 409; chi non ha provvigioni.modifica: 403', async () => {
    const id = await creaPratica('OF/2026/902');
    await operatore.post(`/pratiche/${id}/annulla`, { motivo: '' }).expect(400);
    await operatore.post(`/pratiche/${id}/annulla`, { motivo: 'annulla' }).expect(201);
    await operatore.post(`/pratiche/${id}/annulla`, { motivo: 'di nuovo' }).expect(409);
    await responsabile.delete(`/pratiche/${id}`, { motivo: 'x' }).expect(403); // non amministratore
  });

  it('annulla con fattura congelata: la fattura non cambia (D-183), il congelato resta', async () => {
    const id = await creaPratica('OF/2026/903');
    const fattura = await db.ordini_fornitore_documenti.findFirstOrThrow({ where: { testata_id: id, tipo: 'fattura' } });
    await db.ordini_fornitore_documenti.update({ where: { id: fattura.id }, data: { congelato_il: new Date(), calcolo: { base: '100.00', netto: '100.00', provvigione_agente: '10.00', provvigione_subagente: '3.00', regola: 'spese-base-v1' } } });
    await operatore.post(`/pratiche/${id}/annulla`, { motivo: 'annulla con fattura fissata' }).expect(201);
    const dopo = (await operatore.get(`/pratiche/${id}`).expect(200)).body as any;
    expect(dopo.stato).toBe('annullata');
    // la fattura congelata conserva la sua provvigione (10.00, non azzerata)
    expect(dopo.provvigione.a_decobrands).toBe(10);
    const f = await db.ordini_fornitore_documenti.findUniqueOrThrow({ where: { id: fattura.id } });
    expect((f.calcolo as any).provvigione_agente).toBe('10.00');
  });
});

describe('DELETE /api/pratiche/:id (D-206)', () => {
  it('solo l\'amministratore elimina; il responsabile ha 403', async () => {
    const id = await creaPratica('OF/2026/904');
    await responsabile.delete(`/pratiche/${id}`, { motivo: 'non sono amministratore' }).expect(403);
    await db.ordini_fornitore_testata.findUniqueOrThrow({ where: { id } }); // resta
  });

  it('motivo vuoto: 400', async () => {
    const id = await creaPratica('OF/2026/905');
    await admin.delete(`/pratiche/${id}`, { motivo: '  ' }).expect(400);
  });

  it('elimina una pratica aperta: righe/documenti/pratica spariti, PDF negli scartati, evento con fotografia', async () => {
    const id = await creaPratica('OF/2026/906');
    // un file in arrivo abbinato alla pratica (il PDF da spostare negli scartati)
    const arrivo = await db.documenti_in_arrivo.create({ data: {
      origine: 'caricamento', file_nome: 'ordine-906.pdf', file_hash: 'a'.repeat(64), file_percorso: 'in_arrivo/2026/20260901/x.pdf', stato: 'abbinato', abbinato_pratica_id: id } });
    await admin.delete(`/pratiche/${id}`, { motivo: 'doppione' }).expect(204);
    expect(await db.ordini_fornitore_testata.findUnique({ where: { id } })).toBeNull();
    expect(await db.ordini_fornitore_documenti.count({ where: { testata_id: id } })).toBe(0);
    expect(await db.ordini_fornitore_righe.count({ where: { testata_id: id } })).toBe(0);
    const a = await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: arrivo.id } });
    expect(a.stato).toBe('scartato');
    expect(a.motivo_scarto).toBe('pratica OF/2026/906 eliminata');
    const ev = await db.registro.findFirst({ where: { entita: 'pratica', entita_id: id, codice: 'crud.delete' } });
    expect(ev).toBeTruthy();
    expect((ev!.dettaglio as any).fotografia.numero).toBe('OF/2026/906');
    expect((ev!.dettaglio as any).fotografia.documenti.length).toBeGreaterThan(0);
  });

  it('documento congelato: 409; in liquidazione chiusa: 409; in una riga di bollettino: 409', async () => {
    const id = await creaPratica('OF/2026/907');
    const fattura = await db.ordini_fornitore_documenti.findFirstOrThrow({ where: { testata_id: id, tipo: 'fattura' } });
    await db.ordini_fornitore_documenti.update({ where: { id: fattura.id }, data: { congelato_il: new Date() } });
    await admin.delete(`/pratiche/${id}`, { motivo: 'x' }).expect(409);

    await db.ordini_fornitore_documenti.update({ where: { id: fattura.id }, data: { congelato_il: null } });
    const liq = await db.liquidazioni.create({ data: { anno: 2026, trimestre: 3, totali: {} } });
    await db.ordini_fornitore_documenti.update({ where: { id: fattura.id }, data: { liquidazione_id: liq.id } });
    await admin.delete(`/pratiche/${id}`, { motivo: 'x' }).expect(409);

    await db.ordini_fornitore_documenti.update({ where: { id: fattura.id }, data: { liquidazione_id: null } });
    const b = await basePratica();
    const bol = await db.bollettini_testata.create({ data: { fornitore_id: b.fornitore_id, fornitore_versione_id: b.fornitore_versione_id, mese: 9, anno: 2026, stato: 'da_verificare' } });
    await db.bollettini_righe.create({ data: { testata_id: bol.id, fattura_numero: fattura.numero, importo_riconosciuto: 1, documento_id: fattura.id } });
    await admin.delete(`/pratiche/${id}`, { motivo: 'x' }).expect(409);
  });
});

describe('D-207: anomalie', () => {
  it('documento nuovo su una pratica annullata: non si abbina da solo e apre l\'anomalia in coda', async () => {
    const id = await creaPratica('OF/2026/908', 'ORD-908');
    await operatore.post(`/pratiche/${id}/annulla`, { motivo: 'annulla' }).expect(201);
    const b = await basePratica();
    const arrivo = await db.documenti_in_arrivo.create({ data: {
      origine: 'caricamento', file_nome: 'conferma-908.pdf', file_hash: 'b'.repeat(64), file_percorso: 'in_arrivo/2026/20260901/y.pdf', stato: 'da_controllare',
      fornitore_id: b.fornitore_id, fornitore_versione_id: b.fornitore_versione_id, letto_il: new Date() } });
    await db.documenti_campi.createMany({ data: [
      { documento_id: arrivo.id, campo: 'numero_ordine_fornitore', valore_letto: 'ORD-908' },
      { documento_id: arrivo.id, campo: 'numero', valore_letto: 'CONF-908' },
      { documento_id: arrivo.id, campo: 'tipo', valore_letto: 'conferma' },
    ] });
    const r = (await operatore.get(`/documenti/${arrivo.id}`).expect(200)).body as any;
    expect(r.proposta.pratica_ordine).toBeNull(); // l'annullata non è un aggancio
    const anomalia = await db.registro.findFirst({ where: { codice: 'provvigioni.pratica_annullata', chiave: String(arrivo.id), stato: 'aperta' } });
    expect(anomalia).toBeTruthy();
  });

  it('riga di bollettino su una pratica annullata: anomalia «pratica annullata»', async () => {
    const id = await creaPratica('OF/2026/909');
    const fattura = await db.ordini_fornitore_documenti.findFirstOrThrow({ where: { testata_id: id, tipo: 'fattura' } });
    const b = await basePratica();
    const bol = await db.bollettini_testata.create({ data: { fornitore_id: b.fornitore_id, fornitore_versione_id: b.fornitore_versione_id, mese: 11, anno: 2027, stato: 'da_verificare' } });
    await db.bollettini_righe.create({ data: { testata_id: bol.id, fattura_numero: fattura.numero, importo_riconosciuto: 10, documento_id: fattura.id } });
    await operatore.post(`/pratiche/${id}/annulla`, { motivo: 'annulla' }).expect(201);
    await operatore.get(`/bollettini/${bol.id}`).expect(200);
    const anomalia = await db.registro.findFirst({ where: { codice: 'provvigioni.pratica_annullata', chiave: String(bol.id), stato: 'aperta' } });
    expect(anomalia).toBeTruthy();
  });
});

describe('revisione: rilievi 1 e 2', () => {
  it('elimina blocca il fornitore: serializza con una verifica di bollettino concorrente (rilievo 1)', async () => {
    const id = await creaPratica('OF/2026/910');
    const fid = (await db.ordini_fornitore_testata.findUniqueOrThrow({ where: { id } })).fornitore_id;
    let preso = false;
    const rilascia = new Promise<void>((ok) => {
      void db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM fornitori WHERE id = ${fid} FOR UPDATE`;
        preso = true;
        await new Promise((r) => setTimeout(r, 800)); // tiene il lock, come una verifica che congela i documenti
      }).finally(ok);
    });
    while (!preso) await new Promise((r) => setTimeout(r, 10)); // il lock è preso
    let finita = false;
    const elim = admin.delete(`/pratiche/${id}`, { motivo: 'prova lock' }).expect(204).then(() => { finita = true; });
    await new Promise((r) => setTimeout(r, 300));
    expect(finita).toBe(false); // elimina resta in attesa del lock del fornitore
    await rilascia;
    await elim;
    expect(finita).toBe(true);
    expect(await db.ordini_fornitore_testata.findUnique({ where: { id } })).toBeNull();
  });

  it('cerca marca «annullata» davanti agli altri stati (rilievo 2)', async () => {
    const id = await creaPratica('OF/2026/911', 'ORD-911');
    await operatore.post(`/pratiche/${id}/annulla`, { motivo: 'annulla' }).expect(201);
    const b = await basePratica();
    const r = (await operatore.get(`/pratiche/cerca?fornitore_id=${b.fornitore_id}`).expect(200)).body as { id: string; stato: string }[];
    expect(r.find((x) => x.id === String(id))?.stato).toBe('annullata');
  });

  it('sposta verso una pratica annullata: 409 chiaro (rilievo 2)', async () => {
    const a = await creaPratica('OF/2026/912');
    const b = await creaPratica('OF/2026/913');
    await operatore.post(`/pratiche/${b}/annulla`, { motivo: 'annulla destinazione' }).expect(201);
    const fatturaA = await db.ordini_fornitore_documenti.findFirstOrThrow({ where: { testata_id: a, tipo: 'fattura' } });
    const r = await operatore.post(`/pratiche/${a}/documenti/${fatturaA.id}/sposta`, { pratica_id: Number(b) });
    expect(r.status).toBe(409);
    expect((r.body as any).message).toContain('annullata');
  });
});
