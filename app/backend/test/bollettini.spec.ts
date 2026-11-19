import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configura } from '../src/main';
import { giornoRoma } from '../src/motore/dati';
import { cifra } from '../src/password';
import { PrismaService } from '../src/prisma.service';
import { seed } from '../prisma/seed';
import { prototipo } from './prototipo';
import { svuota } from './svuota';

// F3-A1: matrice dei bollettini (§7.7) e caricamento (§15.2.5). Gli stati e gli importi si confrontano
// con il prototipo vero (test/prototipo.ts) allo stesso "oggi".

/* eslint-disable @typescript-eslint/no-explicit-any */
let app: NestExpressApplication;
let db: PrismaService;
let M: any;
const DOMINIO = '@prova-bollettini.it';
const PW = 'password-di-prova';

interface Cella { mese: string; stato: string; bollettino_id: string | null; importo: number | null; entro: string | null }
interface Riga { id: string; fornitore: string; maturazione: string; celle: Cella[] }
interface Matrice { da: string; al: string; primo: string; ultimo: string; colonne: string[]; fornitori: Riga[]; conteggi: { tutti: number; dafare: number } }

async function creaUtente(username: string, livello: string, area = 'provvigioni') {
  await db.utenti.create({
    data: {
      username, email: username + DOMINIO, nome: 'Prova ' + username, ruolo: 'utente',
      aree: { create: [{ area, livello }] }, password_hash: await cifra(PW), deve_cambiare_password: false,
    },
  });
}
async function entra(utente: string) {
  const agente = request.agent(app.getHttpServer());
  const csrf = (await agente.post('/api/accesso/entra').send({ utente, password: PW }).expect(200)).body.csrf as string;
  return {
    get: (p: string) => agente.get('/api' + p),
    post: (p: string, b: object = {}) => agente.post('/api' + p).set('x-csrf-token', csrf).send(b),
    carica: (dati: Buffer, nome = 'bollettino.pdf') => agente.post('/api/documenti/carica').set('x-csrf-token', csrf).attach('file', dati, nome),
  };
}
let op: Awaited<ReturnType<typeof entra>>;
let lett: Awaited<ReturnType<typeof entra>>;
let dati: Awaited<ReturnType<typeof entra>>;

const pdf = (testo: string) => Buffer.from(`%PDF-1.4\n% ${testo}\n%%EOF\n`);
const statoApi = (x: string) => x === 'da_verificare' || x === 'pronto' ? 'arrivato'
  : x === 'mancante' ? 'ritardo' : x === 'non_atteso' ? 'nessuno' : x;
const somma = (b: any) => M.r2(b.righe.reduce((s: number, r: any) => s + r.importo, 0));
const fornitoreId = async (inizio: string) =>
  (await db.fornitori_versioni.findFirstOrThrow({ where: { ragione_sociale: { startsWith: inizio } } })).fornitore_id;

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
  db = app.get(PrismaService);
  await svuota(db);
  await seed(db);
  await creaUtente('op-boll', 'operatore');
  await creaUtente('lett-boll', 'lettura');
  await creaUtente('dati-boll', 'responsabile', 'dati');
  [op, lett, dati] = await Promise.all([entra('op-boll'), entra('lett-boll'), entra('dati-boll')]);
  M = prototipo();
  M.S.oggi = giornoRoma(new Date()); // lo stesso "oggi" del server
}, 120_000);

afterAll(async () => {
  const utenti = (await db.utenti.findMany({ where: { email: { endsWith: DOMINIO } } })).map((u) => u.id);
  await db.$transaction([
    db.$executeRaw`SET LOCAL decobrands.pulizia_registro = 'si'`,
    db.registro.deleteMany({ where: { utente_id: { in: utenti } } }),
    db.sessioni.deleteMany({ where: { utente_id: { in: utenti } } }),
    db.utenti.deleteMany({ where: { id: { in: utenti } } }),
  ]);
  await svuota(db);
  await app.close();
});

describe('GET /api/bollettini', () => {
  it('matrice di 6 mesi uguale al prototipo, per stato e importo', async () => {
    const r = await op.get('/bollettini?al=2026-09').expect(200);
    const b = r.body as Matrice;
    expect(b.colonne).toEqual(['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09']);
    expect(b.da).toBe('2026-04');
    expect(b.primo).toBe('2025-01'); // il documento più vecchio del seed, prima dei bollettini (2026-05)
    expect(b.ultimo).toBe(M.oggi().slice(0, 7));

    const api = new Map(b.fornitori.map((f) => [String(f.id), new Map(f.celle.map((c) => [c.mese, c]))]));
    for (const f of M.S.fornitori) {
      const riga = api.get(String(f.id));
      expect(riga).toBeDefined();
      for (const mese of b.colonne) {
        const [anno, meseN] = mese.split('-').map(Number);
        const x = M.casellaBollettino(f.id, anno, meseN);
        const c = riga!.get(mese)!;
        expect(c.stato).toBe(statoApi(x.tipo));
        if (x.b) {
          expect(c.bollettino_id).not.toBeNull();
          expect(c.importo).toBeCloseTo(somma(x.b), 2);
        } else {
          expect(c.bollettino_id).toBeNull();
          expect(c.importo).toBeNull();
        }
        // D-03: il bollettino è atteso entro il giorno del mese dopo; dopo quel giorno è in ritardo
        if (c.stato === 'ritardo') expect(c.entro).toBeNull();
        if (c.stato === 'atteso') expect(c.entro).toBe(M.bollettinoAtteso(f.id, anno, meseN));
      }
    }
  });

  it('in ritardo: mese finito, documenti presenti e giorno del fornitore passato, con la data fissa', async () => {
    const gasper = String(await fornitoreId('Gasper'));
    const b = (await op.get('/bollettini?al=2026-09').expect(200)).body as Matrice;
    const c = b.fornitori.find((f) => f.id === gasper)!.celle.find((x) => x.mese === '2026-06')!;
    expect(c.stato).toBe('ritardo');
    expect(c.bollettino_id).toBeNull();
    // Gasper ha giorno_bollettino 10: il bollettino di giugno è atteso entro il 10/07
    expect(M.bollettinoAtteso(Number(gasper), 2026, 6)).toBe('2026-07-10');
  });

  it('mese in corso: ultima colonna di oggi, "in corso" dove il bollettino non c’è', async () => {
    const b = (await op.get('/bollettini').expect(200)).body as Matrice;
    const oggi = M.oggi().slice(0, 7);
    expect(b.al).toBe(oggi);
    expect(b.colonne[b.colonne.length - 1]).toBe(oggi);
    const con = new Set((await db.bollettini_testata.findMany({
      where: { anno: Number(oggi.slice(0, 4)), mese: Number(oggi.slice(5, 7)) }, select: { fornitore_id: true },
    })).map((x) => String(x.fornitore_id)));
    expect(b.fornitori.every((f) => con.has(f.id) || f.celle[f.celle.length - 1].stato === 'in_corso')).toBe(true);
  });

  it('filtro multiplo e conteggi dei segmenti (D-22, D-23)', async () => {
    const gries = await fornitoreId('Gries');
    const gasper = await fornitoreId('Gasper');
    const tutti = (await op.get('/bollettini?al=2026-09').expect(200)).body as Matrice;
    const scelti = (await op.get(`/bollettini?al=2026-09&fornitori=${gries},${gasper}`).expect(200)).body as Matrice;
    expect(scelti.fornitori.map((f) => f.id).sort()).toEqual([String(gries), String(gasper)].sort());
    expect(scelti.conteggi.tutti).toBe(2);
    expect(scelti.conteggi.dafare).toBeLessThanOrEqual(2);
    expect(tutti.conteggi.tutti).toBe(12);

    // il segmento sceglie le righe ma non cambia i numeri
    const daFare = (await op.get(`/bollettini?al=2026-09&fornitori=${gries},${gasper}&vista=dafare`).expect(200)).body as Matrice;
    expect(daFare.conteggi).toEqual(scelti.conteggi);
    expect(daFare.fornitori).toHaveLength(scelti.conteggi.dafare);
    expect(daFare.fornitori.every((f) => f.celle.some((c) => ['arrivato', 'ritardo', 'contestato'].includes(c.stato)))).toBe(true);
  });

  it('403 senza il permesso di consultazione, 400 con un mese malformato', async () => {
    await dati.get('/bollettini').expect(403);
    await op.get('/bollettini?al=2026-13').expect(400);
    await op.get('/bollettini?al=giugno').expect(400);
  });

  it('primo risale al documento più vecchio, anche oltre i bollettini', async () => {
    const [{ bol }] = await db.$queryRaw<{ bol: string }[]>`
      SELECT to_char(min(make_date(anno, mese, 1)), 'YYYY-MM') AS bol FROM bollettini_testata`;
    const [{ doc }] = await db.$queryRaw<{ doc: string }[]>`
      SELECT to_char(min(data), 'YYYY-MM') AS doc FROM ordini_fornitore_documenti`;
    expect(doc < bol).toBe(true); // il seed ha documenti più vecchi dei bollettini: la prova è significativa
    const b = (await op.get('/bollettini?al=2026-09').expect(200)).body as Matrice;
    expect(b.primo).toBe(doc);
  });
});

describe('POST /api/bollettini', () => {
  it('carica un bollettino da verificare, con il fornitore bloccato e l’evento (§15.2.5)', async () => {
    const ing = await fornitoreId("Ing's");
    const r = await op.post('/bollettini', { fornitore_id: Number(ing), anno: 2026, mese: 9 }).expect(201);
    const id = BigInt(r.body.id as string);
    const t = await db.bollettini_testata.findUniqueOrThrow({ where: { id } });
    const f = await db.fornitori.findUniqueOrThrow({ where: { id: ing } });
    expect(t.stato).toBe('da_verificare');
    expect(t.fornitore_id).toBe(ing);
    expect(t.fornitore_versione_id).toBe(f.versione_corrente_id);

    const eventi = await db.registro.findMany({ where: { codice: 'crud.create', entita: 'bollettino', entita_id: id } });
    expect(eventi).toHaveLength(1);
    expect(eventi[0].dettaglio).toMatchObject({
      etichetta: "9/2026 · Ing's Christmas Decor GmbH", fornitore_id: String(ing), mese: 9, anno: 2026, file_nome: null,
    });
    expect(eventi[0].utente_id).not.toBeNull();
  });

  it('doppione: 409 con un testo chiaro, niente seconda riga né evento', async () => {
    const ing = await fornitoreId("Ing's");
    const prima = await db.bollettini_testata.count();
    const eventi = await db.registro.count({ where: { codice: 'crud.create', entita: 'bollettino' } });
    const r = await op.post('/bollettini', { fornitore_id: Number(ing), anno: 2026, mese: 9 }).expect(409);
    expect(r.body.message).toMatch(/c'è già/);
    expect(await db.bollettini_testata.count()).toBe(prima);
    expect(await db.registro.count({ where: { codice: 'crud.create', entita: 'bollettino' } })).toBe(eventi);
  });

  it('il PDF passa dal canale comune e resta legato al bollettino', async () => {
    const gasper = await fornitoreId('Gasper');
    const c = await op.carica(pdf('bollettino gasper 10/2026'), 'bollettino-ottobre.pdf').expect(201);
    const arrivo = BigInt(c.body.id as string);
    const r = await op.post('/bollettini', { fornitore_id: Number(gasper), anno: 2026, mese: 10, arrivo_id: Number(arrivo) }).expect(201);
    const t = await db.bollettini_testata.findUniqueOrThrow({ where: { id: BigInt(r.body.id as string) } });
    const d = await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: arrivo } });
    expect(d.abbinato_bollettino_id).toBe(t.id);
    expect(d.stato).toBe('abbinato'); // D-140
    expect(d.controllato_il).not.toBeNull();
    // D-140: il file legato al bollettino non entra nei documenti da controllare di Oggi (i 15 del seed)
    expect((await op.get('/oggi/conteggi').expect(200)).body.documenti).toBe(15);
    const evento = await db.registro.findFirstOrThrow({ where: { codice: 'crud.create', entita: 'bollettino', entita_id: t.id } });
    expect(evento.dettaglio).toMatchObject({ file_nome: 'bollettino-ottobre.pdf' });

    // lo stesso documento non si lega a un secondo bollettino: 409 e nessuna testata nuova
    const prima = await db.bollettini_testata.count();
    await op.post('/bollettini', { fornitore_id: Number(gasper), anno: 2026, mese: 11, arrivo_id: Number(arrivo) }).expect(409);
    expect(await db.bollettini_testata.count()).toBe(prima);

    // A3-02: il PDF di un bollettino non si scarta (la pulizia degli scartati lo cancellerebbe)...
    await op.post(`/documenti/${arrivo}/scarta`, { motivo: 'Altro' }).expect(409);
    expect((await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: arrivo } })).stato).toBe('abbinato');
    // ...e non diventa anche il documento di una pratica
    const p = await db.ordini_fornitore_testata.findFirstOrThrow({ where: { fornitore_id: gasper }, select: { id: true } });
    const a = await op.post(`/documenti/${arrivo}/abbina`, { tipo: 'conferma', data: '2026-09-01', pratica_id: Number(p.id) }).expect(409);
    // D-140: il file ora è `abbinato`, quindi il rifiuto arriva dal controllo di stato, non da quello del bollettino
    expect(a.body.message).toBe('Il file non è più in coda: è già abbinato, scartato o in lettura');
    expect((await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: arrivo } })).abbinato_pratica_id).toBeNull();
  });

  it('documento inesistente o scartato: errore e rollback, nessuna testata', async () => {
    const gries = await fornitoreId('Gries');
    const prima = await db.bollettini_testata.count();
    await op.post('/bollettini', { fornitore_id: Number(gries), anno: 2025, mese: 1, arrivo_id: 999999 }).expect(404);
    const scartato = await db.documenti_in_arrivo.findFirstOrThrow({ where: { stato: 'scartato' } });
    await op.post('/bollettini', { fornitore_id: Number(gries), anno: 2025, mese: 1, arrivo_id: Number(scartato.id) }).expect(409);
    expect(await db.bollettini_testata.count()).toBe(prima);
    expect(await db.bollettini_testata.count({ where: { fornitore_id: gries, anno: 2025, mese: 1 } })).toBe(0);
  });

  it('fornitore inesistente: 404', async () => {
    await op.post('/bollettini', { fornitore_id: 999999, anno: 2026, mese: 10 }).expect(404);
  });

  it('in sola lettura e senza l’area: 403', async () => {
    const gries = await fornitoreId('Gries');
    await lett.post('/bollettini', { fornitore_id: Number(gries), anno: 2025, mese: 2 }).expect(403);
    await dati.post('/bollettini', { fornitore_id: Number(gries), anno: 2025, mese: 2 }).expect(403);
  });

  it('campi non dichiarati o mese fuori intervallo: 400', async () => {
    const gries = await fornitoreId('Gries');
    await op.post('/bollettini', { fornitore_id: Number(gries), anno: 2025, mese: 2, importo: 10 }).expect(400);
    await op.post('/bollettini', { fornitore_id: Number(gries), anno: 2025, mese: 13 }).expect(400);
  });
});

describe('righe del bollettino dal PDF letto (F7-A7)', () => {
  it('alla creazione le righe di lettura_grezza entrano in bollettini_righe, con il documento abbinato', async () => {
    const gasper = await fornitoreId('Gasper');
    const c = await op.carica(pdf('bollettino gasper 11/2026'), 'bollettino-novembre.pdf').expect(201);
    const arrivo = BigInt(c.body.id as string);
    // il lettore ha già salvato la risposta completa (D-170): le righe stanno in extract_result.righe
    await db.documenti_in_arrivo.update({
      where: { id: arrivo },
      data: {
        lettura_grezza: { status: 'COMPLETED', extract_result: { tipo: 'bollettino', righe: [
          { numero_fattura: 'F-2026-0921', data_fattura: '2026-08-20', importo: 3980, provvigione: 557.2, quota_pagata: 96.43 },
          { numero_fattura: 'F-2026-0000', data_fattura: '2026-11-05', importo: 500, provvigione: 90 },
          { numero_fattura: 'F-2026-0001', importo: 0, provvigione: 0 },
        ] } },
      },
    });
    const r = await op.post('/bollettini', { fornitore_id: Number(gasper), anno: 2026, mese: 11, arrivo_id: Number(arrivo) }).expect(201);
    const id = BigInt(r.body.id as string);
    const righe = await db.bollettini_righe.findMany({ where: { testata_id: id }, orderBy: { id: 'asc' } });
    expect(righe).toHaveLength(3);
    const doc = await db.ordini_fornitore_documenti.findFirstOrThrow({ where: { numero: 'F-2026-0921' }, include: { testata: true } });
    const f = righe[0];
    expect([f.fattura_numero, f.fattura_data?.toISOString().slice(0, 10), Number(f.importo_merce), Number(f.importo_riconosciuto), Number(f.pct_riconosciuta), Number(f.quota_pagata), f.tipo_riga])
      .toEqual(['F-2026-0921', '2026-08-20', 3980, 557.2, 14, 96.43, 'provvigione']);
    expect([f.documento_id, f.cliente_id, f.cliente_versione_id]).toEqual([doc.id, doc.testata.cliente_id, doc.testata.cliente_versione_id]);
    // fattura che non conosciamo: resta la riga del fornitore, senza documento né cliente
    expect([righe[1].documento_id, righe[1].cliente_id, Number(righe[1].importo_riconosciuto)]).toEqual([null, null, 90]);
    // imponibile 0: nessuna percentuale, non un errore
    expect([righe[2].pct_riconosciuta, Number(righe[2].importo_riconosciuto)]).toEqual([null, 0]);

    // il confronto a cerniera ora ha la riga del fornitore; il secondo giro è rifiutato (409)
    const b = (await op.get(`/bollettini/${id}`)).body as { righe: { numero: string; quota: number | null; noi: { pct_nominale: number | null; pct: number | null } | null }[]; righe_fornitore: number };
    expect(b.righe_fornitore).toBe(3); // F7-A7: la pagina sa che le righe ci sono (niente pulsante «Importa»)
    // D-201 §19: a schermo va la percentuale del fornitore, con la quota a parte (non l'effettiva)
    const x = b.righe.find((y) => y.numero === 'F-2026-0921')!;
    expect([x.noi?.pct_nominale, x.quota]).toEqual([14, 96.43]);
    expect(b.righe.some((x) => x.numero === 'F-2026-0921')).toBe(true);
    await op.post(`/bollettini/${id}/righe/importa`, {}).expect(409);
    expect(await db.bollettini_righe.count({ where: { testata_id: id } })).toBe(3);
  });

  it('senza PDF: 409; PDF senza righe lette: nessuna riga e nessun errore; in sola lettura: 403', async () => {
    const gasper = await fornitoreId('Gasper');
    const senza = await op.post('/bollettini', { fornitore_id: Number(gasper), anno: 2026, mese: 12 }).expect(201);
    const id = BigInt(senza.body.id as string);
    const r = await op.post(`/bollettini/${id}/righe/importa`, {}).expect(409);
    expect(r.body.message).toBe('Questo bollettino non ha un PDF da cui leggere le righe');
    await lett.post(`/bollettini/${id}/righe/importa`, {}).expect(403);

    // un PDF caricato ma non ancora letto: la rotta non inventa righe
    const c = await op.carica(pdf('bollettino gasper 1/2027'), 'bollettino-gennaio.pdf').expect(201);
    const creato = await op.post('/bollettini', { fornitore_id: Number(gasper), anno: 2027, mese: 1, arrivo_id: Number(c.body.id) }).expect(201);
    const creatoId = BigInt(creato.body.id as string);
    await op.post(`/bollettini/${creatoId}/righe/importa`, {}).expect(200);
    expect(await db.bollettini_righe.count({ where: { testata_id: creatoId } })).toBe(0);
  });
});
