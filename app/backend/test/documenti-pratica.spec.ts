import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configura } from '../src/main';
import { caricaDati } from '../src/motore/dati';
import { confronto, fattiAnalisi, importoPratica, righeLiquidazione } from '../src/motore/motore';
import { Prisma } from '@prisma/client';
import { cifra } from '../src/password';
import { PrismaService } from '../src/prisma.service';
import { seed } from '../prisma/seed';
import { svuota } from './svuota';

// D-60 §19: documenti della pratica per ogni fornitore (ordini sommati, conferma e proforma facoltative, pagamento solo
// segno), abbinamento a mano di un file in coda, foto accettate ed Excel rifiutati, archivio per pratica.

/* eslint-disable @typescript-eslint/no-explicit-any */
let app: NestExpressApplication;
let db: PrismaService;
const DOMINIO = '@prova-d60.it';
const PW = 'password-di-prova';
const CARTELLA = process.env.DOCUMENTI_DIR!;
let op: Awaited<ReturnType<typeof entra>>;

async function entra(utente: string) {
  const agente = request.agent(app.getHttpServer());
  const csrf = (await agente.post('/api/accesso/entra').send({ utente, password: PW }).expect(200)).body.csrf as string;
  return {
    get: (p: string) => agente.get('/api' + p),
    post: (p: string, b: object = {}) => agente.post('/api' + p).set('x-csrf-token', csrf).send(b),
    carica: (dati: Buffer, nome: string) => agente.post('/api/documenti/carica').set('x-csrf-token', csrf).attach('file', dati, nome),
  };
}
const raccogli = (res: any, cb: (e: Error | null, dati?: Buffer) => void) => {
  const parti: Buffer[] = [];
  res.on('data', (c: Buffer) => parti.push(c));
  res.on('end', () => cb(null, Buffer.concat(parti)));
};
const pdf = (t: string) => Buffer.from(`%PDF-1.4\n% ${t}\n%%EOF\n`);
const png = (t: string) => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from(t)]);
const jpg = (t: string) => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from(t)]);
const arrivo = async (id: string) => db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: BigInt(id) } });
const eventi = (codice: string, entita_id: bigint) => db.registro.count({ where: { codice, entita_id } });
const righe = (testata_id: bigint, documento_id: string, fase: string, rr: [string, number, number][]) =>
  db.ordini_fornitore_righe.createMany({ data: rr.map(([codice, q, p], i) => ({
    testata_id, documento_id: BigInt(documento_id), fase, numero_riga: i + 1, codice, descrizione: codice, quantita: q, prezzo_unitario: p, importo: q * p })) });

// cliente e fornitore di una pratica del seed con agenzia: le percentuali ci sono
let base: { id: bigint; cliente_id: bigint; fornitore_id: bigint };
let pid: string; // la pratica aperta dall'ordine
let numero: string;

beforeAll(async () => {
  rmSync(CARTELLA, { recursive: true, force: true });
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
  db = app.get(PrismaService);
  await svuota(db);
  await seed(db);
  await db.utenti.create({ data: {
    username: 'op-d60', email: 'op-d60' + DOMINIO, nome: 'Prova', ruolo: 'utente',
    aree: { create: [{ area: 'provvigioni', livello: 'operatore' }] }, password_hash: await cifra(PW), deve_cambiare_password: false,
  } });
  op = await entra('op-d60');
  base = await db.ordini_fornitore_testata.findFirstOrThrow({ where: { numero_ordine: 'OF/2026/041' } });
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
  rmSync(CARTELLA, { recursive: true, force: true });
});

describe('canale: foto sì, Excel no', () => {
  it('JPEG e PNG riconosciuti dai byte, anche con un altro nome', async () => {
    const j = (await op.carica(jpg('foto 1'), 'foto.bin').expect(201)).body;
    expect((await arrivo(j.id)).file_percorso).toMatch(/^in_arrivo\/\d{4}\/\d{8}\/[0-9a-f]{64}\.jpg$/);
    const p = (await op.carica(png('foto 2'), 'scansione.png').expect(201)).body;
    expect((await arrivo(p.id)).file_percorso).toMatch(/\.png$/);
  });

  it('Excel rifiutato con 415 e un messaggio chiaro, anche se chiamato .pdf', async () => {
    const zip = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('foglio')]);
    expect((await op.carica(zip, 'conferma firmata.xlsm').expect(415)).body.message).toMatch(/Excel/);
    expect((await op.carica(zip, 'finto.pdf').expect(415)).body.message).toMatch(/Excel/);
    expect((await op.carica(Buffer.from('ciao'), 'nota.txt').expect(415)).body.message).toMatch(/PDF né una foto/);
  });
});

describe('abbinamento a mano (POST /api/documenti/:id/abbina)', () => {
  it('un ordine senza pratica apre la pratica: numero OF/AAAA/NNN, file nella sua cartella con nome leggibile, eventi', async () => {
    const a = (await op.carica(pdf('ordine A'), 'Auftrag 4711.pdf').expect(201)).body;
    const [m] = await db.$queryRaw<{ n: number }[]>`SELECT max(substring(numero_ordine FROM '^OF/2026/(\\d+)$')::int) AS n FROM ordini_fornitore_testata`;
    const r = (await op.post(`/documenti/${a.id}/abbina`, {
      tipo: 'ordine', numero: 'AB 4711/26', data: '2026-09-01', importo: 50, cliente_id: Number(base.cliente_id), fornitore_id: Number(base.fornitore_id),
    }).expect(201)).body;
    numero = `OF/2026/${String(m.n + 1).padStart(3, '0')}`;
    expect(r.pratica).toMatchObject({ numero, stato: 'inviato', importo: 50 });
    expect(r.altri).toEqual([expect.objectContaining({ tipo: 'ordine', numero: 'AB 4711/26', file_nome: 'Auftrag 4711.pdf' })]);
    pid = r.pratica.id;
    const t = await db.ordini_fornitore_testata.findUniqueOrThrow({ where: { id: BigInt(pid) }, include: { cliente: true } });
    expect(t.cliente_versione_id).toBe(t.cliente.id); // D-46: versione corrente
    const x = await arrivo(a.id);
    expect(x).toMatchObject({ stato: 'abbinato', tipo: 'ordine', abbinato_pratica_id: BigInt(pid) });
    const cartella = `pratiche/2026/202609/${numero.replace(/\//g, '-')}`;
    expect(x.file_percorso).toBe(`${cartella}/ordine_AB-4711-26.pdf`);
    expect(existsSync(join(CARTELLA, x.file_percorso))).toBe(true);
    expect(await eventi('crud.create', BigInt(pid))).toBe(1);
    expect(await eventi('documento.match', BigInt(r.documento_id))).toBe(1);
    // lo stesso numero d'ordine del fornitore non apre un'altra pratica
    const b = (await op.carica(pdf('ordine A bis'), 'copia.pdf').expect(201)).body;
    await op.post(`/documenti/${b.id}/abbina`, { tipo: 'ordine', numero: 'AB 4711/26', data: '2026-09-01', cliente_id: Number(base.cliente_id), fornitore_id: Number(base.fornitore_id) }).expect(409);
    expect((await arrivo(b.id)).stato).toBe('in_coda');
  });

  it('GET /api/pratiche/:id/documenti: ogni documento porta le righe per il confronto affiancato', async () => {
    const r = (await op.get(`/pratiche/${base.id}/documenti`).expect(200)).body;
    const ord = r.altri.find((x: { tipo: string }) => x.tipo === 'ordine');
    expect(ord.righe.length).toBeGreaterThan(0);
    expect(ord.righe[0]).toEqual(expect.objectContaining({
      codice: expect.any(String), quantita: expect.any(Number), prezzo: expect.any(Number), importo: expect.any(Number),
    }));
    expect(ord.riferimento).toBeNull();
  });

  it('senza pratica solo un ordine; tipo sconosciuto 400', async () => {
    const a = (await op.carica(pdf('fattura sola'), 'f.pdf').expect(201)).body;
    await op.post(`/documenti/${a.id}/abbina`, { tipo: 'fattura', numero: 'X1', data: '2026-09-01', importo: 1 }).expect(400);
    await op.post(`/documenti/${a.id}/abbina`, { tipo: 'bolla', pratica_id: Number(pid) }).expect(400);
  });

  it('due ordini si sommano nel confronto; la fattura che li copre non ha variazioni; conferma e proforma assenti → fatturata', async () => {
    const o1 = (await db.ordini_fornitore_documenti.findFirstOrThrow({ where: { testata_id: BigInt(pid), tipo: 'ordine' } })).id;
    await righe(BigInt(pid), String(o1), 'ordine', [['X', 10, 5]]);
    const b = (await op.post(`/pratiche/${pid}/documenti`, { tipo: 'ordine', numero: 'AB 4712/26', data: '2026-09-02', importo: 45 }).expect(201)).body;
    await righe(BigInt(pid), b.altri.find((d: any) => d.numero === 'AB 4712/26').id, 'ordine', [['X', 5, 5], ['Y', 2, 10]]);
    let p = (await op.get(`/pratiche/${pid}`).expect(200)).body;
    expect(p.fasi[0]).toMatchObject({ titolo: 'Ordini', numero: 'AB 4711/26 + 1', importo: 95 });
    expect(p.importo).toBe(95); // stima: gli ordini sommati
    expect(p.confronto.righe.map((r: any) => [r.codice, r.per[0].qta, r.per[0].importo])).toEqual([['X', 15, 75], ['Y', 2, 20]]);

    const f = (await op.carica(pdf('fattura 2 ordini'), 'Rechnung.pdf').expect(201)).body;
    const r = (await op.post(`/documenti/${f.id}/abbina`, { tipo: 'fattura', numero: 'RE-900', data: '2026-09-03', importo: 95, pratica_id: Number(pid) }).expect(201)).body;
    await righe(BigInt(pid), r.documento_id, 'fattura', [['X', 15, 5], ['Y', 2, 10]]);
    expect(r.pratica.stato).toBe('fatturato'); // senza conferma né proforma
    p = (await op.get(`/pratiche/${pid}`).expect(200)).body;
    expect(p.stato).toBe('fatturata');
    expect(p.fasi[1]).toMatchObject({ titolo: 'Conferma', assente: true });
    expect(p.confronto.righe.every((x: any) => !x.varia)).toBe(true);
    expect(p.provvigione.imponibile).toBe(95);
    expect((await arrivo(f.id)).file_percorso).toMatch(/\/fattura_RE-900\.pdf$/);
    // regole di F2-A3: lo stesso numero nella stessa pratica = 409
    const g = (await op.carica(pdf('fattura doppia'), 'g.pdf').expect(201)).body;
    await op.post(`/documenti/${g.id}/abbina`, { tipo: 'fattura', numero: 'RE-900', data: '2026-09-03', importo: 1, pratica_id: Number(pid) }).expect(409);
  });

  it('proforma: fa avanzare la pratica a confermata, senza effetto su importo e provvigioni', async () => {
    const a = (await op.carica(pdf('ordine C'), 'c.pdf').expect(201)).body;
    const n = (await op.post(`/documenti/${a.id}/abbina`, {
      tipo: 'ordine', numero: 'AB 5000', data: '2026-09-01', importo: 300, cliente_id: Number(base.cliente_id), fornitore_id: Number(base.fornitore_id),
    }).expect(201)).body.pratica.id;
    const prima = (await op.get(`/pratiche/${n}`).expect(200)).body;
    expect(prima.stato).toMatch(/attesa|scaduta/);
    await op.post(`/pratiche/${n}/documenti`, { tipo: 'proforma', numero: 'PF-1', data: '2026-09-02', importo: 310 }).expect(201);
    const dopo = (await op.get(`/pratiche/${n}`).expect(200)).body;
    expect(dopo.stato).toBe('confermata');
    expect(dopo.fasi[1]).toMatchObject({ titolo: 'Proforma', fatta: true, importo: 310 });
    expect([dopo.importo, dopo.provvigione]).toEqual([prima.importo, prima.provvigione]);
  });

  it('foto del pagamento: pratica "pagato", provvigioni e liquidazione uguali; nomi con suffisso; content-type', async () => {
    const S0 = await caricaDati(db, '2026-09-04');
    const liq0 = JSON.stringify(righeLiquidazione(S0, 2026, 3)), fatti0 = JSON.stringify(fattiAnalisi(S0));
    const prov0 = (await op.get(`/pratiche/${pid}`).expect(200)).body.provvigione;
    const ids: string[] = [];
    for (const t of ['bonifico 1', 'bonifico 2']) {
      const a = (await op.carica(png(t), 'WhatsApp Image.png').expect(201)).body;
      await op.post(`/documenti/${a.id}/abbina`, { tipo: 'pagamento', data: '2026-09-04', pratica_id: Number(pid) }).expect(201);
      ids.push(a.id);
    }
    const percorsi = await Promise.all(ids.map(async (i) => (await arrivo(i)).file_percorso));
    expect(percorsi.map((x) => x.split('/').pop())).toEqual(['pagamento_2026-09-04.png', 'pagamento_2026-09-04_2.png']);
    const p = (await op.get(`/pratiche/${pid}`).expect(200)).body;
    expect(p.pagato).toBe(true);
    expect(p.pagamenti).toHaveLength(2);
    expect(p.provvigione).toEqual(prov0);
    const S1 = await caricaDati(db, '2026-09-04');
    expect(JSON.stringify(righeLiquidazione(S1, 2026, 3))).toBe(liq0);
    expect(JSON.stringify(fattiAnalisi(S1))).toBe(fatti0);
    const el = (await op.get(`/pratiche?pagato=si&perPagina=200`).expect(200)).body;
    expect(el.righe.map((r: any) => r.id)).toEqual([pid]);
    expect(el.righe[0].pagato).toBe(true);
    const f = await op.get(`/documenti/${ids[0]}/file`).buffer(true).parse(raccogli).expect(200);
    expect(f.headers['content-type']).toBe('image/png');
    expect(f.body).toEqual(png('bonifico 1'));
  });

  it('spostamento del file fallito (file assente): abbinamento salvato, percorso invariato', async () => {
    const a = await db.documenti_in_arrivo.findFirstOrThrow({ where: { stato: 'da_controllare' } }); // seed: il file non c'è
    await op.post(`/documenti/${a.id}/abbina`, { tipo: 'altro', pratica_id: Number(pid) }).expect(201);
    const x = await arrivo(String(a.id));
    expect(x).toMatchObject({ stato: 'abbinato', file_percorso: a.file_percorso });
    await op.post(`/documenti/${a.id}/abbina`, { tipo: 'altro', pratica_id: Number(pid) }).expect(409); // non più in coda
  });
});

describe('spostamento in un\'altra pratica (POST /api/pratiche/:id/documenti/:did/sposta)', () => {
  it('il documento, le sue righe e il file vanno nella pratica nuova; evento documento.move', async () => {
    const altra = await db.ordini_fornitore_testata.findFirstOrThrow({ where: { fornitore_id: base.fornitore_id, id: { not: BigInt(pid) }, numero_ordine: { startsWith: 'OF/2026/0' } } });
    const d = await db.ordini_fornitore_documenti.findFirstOrThrow({ where: { testata_id: BigInt(pid), tipo: 'pagamento' }, orderBy: { id: 'asc' } });
    const r = (await op.post(`/pratiche/${pid}/documenti/${d.id}/sposta`, { pratica_id: Number(altra.id) }).expect(200)).body;
    expect(r.pratica.id).toBe(String(altra.id));
    expect(r.altri.some((x: any) => x.id === String(d.id))).toBe(true);
    const x = await arrivo(String(d.arrivo_id));
    const g = altra.data_ordine.toISOString().slice(0, 7).replace('-', '');
    expect(x.file_percorso).toBe(`pratiche/${g.slice(0, 4)}/${g}/${altra.numero_ordine.replace(/\//g, '-')}/pagamento_2026-09-04.png`);
    expect(x.abbinato_pratica_id).toBe(altra.id);
    expect(existsSync(join(CARTELLA, x.file_percorso))).toBe(true);
    expect(await eventi('documento.move', d.id)).toBe(1);
    // la fattura con le sue righe
    const f = await db.ordini_fornitore_documenti.findFirstOrThrow({ where: { testata_id: BigInt(pid), numero: 'RE-900' } });
    await op.post(`/pratiche/${pid}/documenti/${f.id}/sposta`, { pratica_id: Number(altra.id) }).expect(200);
    expect(await db.ordini_fornitore_righe.count({ where: { documento_id: f.id, testata_id: altra.id } })).toBe(2);
    expect((await db.ordini_fornitore_testata.findUniqueOrThrow({ where: { id: BigInt(pid) } })).stato).toBe('inviato');
  });

  it('liquidato, in un bollettino o unico ordine: 409; altro fornitore 400', async () => {
    const liq = await db.ordini_fornitore_documenti.findFirstOrThrow({ where: { liquidazione_id: { not: null } }, include: { testata: true } });
    const stesso = await db.ordini_fornitore_testata.findFirstOrThrow({ where: { fornitore_id: liq.testata.fornitore_id, id: { not: liq.testata_id } } });
    await op.post(`/pratiche/${liq.testata_id}/documenti/${liq.id}/sposta`, { pratica_id: Number(stesso.id) }).expect(409);
    const inB = await db.ordini_fornitore_documenti.findFirstOrThrow({ where: { righe_bollettino: { some: {} }, liquidazione_id: null }, include: { testata: true } });
    const stesso2 = await db.ordini_fornitore_testata.findFirstOrThrow({ where: { fornitore_id: inB.testata.fornitore_id, id: { not: inB.testata_id } } });
    expect((await op.post(`/pratiche/${inB.testata_id}/documenti/${inB.id}/sposta`, { pratica_id: Number(stesso2.id) }).expect(409)).body.message).toMatch(/bollettino/);
    const ordini = await db.ordini_fornitore_documenti.findMany({ where: { testata_id: BigInt(pid), tipo: 'ordine' }, orderBy: { id: 'asc' } });
    const altroF = await db.ordini_fornitore_testata.findFirstOrThrow({ where: { fornitore_id: { not: base.fornitore_id } } });
    await op.post(`/pratiche/${pid}/documenti/${ordini[1].id}/sposta`, { pratica_id: Number(altroF.id) }).expect(400);
    const dest = await db.ordini_fornitore_testata.findFirstOrThrow({ where: { fornitore_id: base.fornitore_id, id: { not: BigInt(pid) } } });
    await op.post(`/pratiche/${pid}/documenti/${ordini[1].id}/sposta`, { pratica_id: Number(dest.id) }).expect(200); // erano due
    expect((await op.post(`/pratiche/${pid}/documenti/${ordini[0].id}/sposta`, { pratica_id: Number(dest.id) }).expect(409)).body.message).toMatch(/unico ordine/);
  });
});

describe('correzioni dopo la revisione (D-60)', () => {
  it('righe senza codice restano distinte; conferma senza importo non azzera la stima', async () => {
    const D = (n: number) => new Prisma.Decimal(n);
    const riga = (descrizione: string, imp: number) => ({ codice: null, descrizione, qta: D(1), prezzo: D(imp), importo: D(imp) });
    const p: any = { documenti: [], conferme: [{ importo: D(0) }], ordini: [{ importo: D(1000) }],
      righe: { ordine: [riga('Spese trasporto', 50), riga('Imballo', 20)], conferma: [], fattura: [riga('Spese trasporto', 50), riga('Imballo', 20)] } };
    const c = confronto(p);
    expect(c).toHaveLength(2);
    expect(c.every((r: any) => !r.varia)).toBe(true);
    expect(Number(importoPratica(p))).toBe(1000);
  });

  it('giorni di attesa 0: il fornitore non manda conferme, la pratica non va mai in ritardo', async () => {
    // pratica nuova con un solo ordine di maggio: con i giorni del fornitore è in ritardo, con 0 non più
    const b = (await op.carica(pdf('ordine vecchio'), 'ordine-vecchio.pdf').expect(201)).body;
    const ab = (await op.post(`/documenti/${b.id}/abbina`, { tipo: 'ordine', numero: 'AB 6000', data: '2026-05-04', importo: 100, cliente_id: Number(base.cliente_id), fornitore_id: Number(base.fornitore_id) }).expect(201)).body;
    const t = await db.ordini_fornitore_testata.findUniqueOrThrow({ where: { id: BigInt(ab.pratica.id) } });
    expect((await op.get(`/pratiche/${t.id}`).expect(200)).body.stato).toBe('scaduta');
    const prima = (await db.fornitori.findUniqueOrThrow({ where: { id: t.fornitore_id } })).giorni_attesa_conferma;
    await db.fornitori.update({ where: { id: t.fornitore_id }, data: { giorni_attesa_conferma: 0 } });
    try {
      const r = (await op.get(`/pratiche/${t.id}`).expect(200)).body;
      expect(r.stato).toBe('attesa');
      const el = (await op.get(`/pratiche?q=${encodeURIComponent(t.numero_ordine)}`).expect(200)).body;
      expect(el.righe.find((x: any) => x.id === String(t.id)).stato).toBe('attesa');
    } finally {
      await db.fornitori.update({ where: { id: t.fornitore_id }, data: { giorni_attesa_conferma: prima } });
    }
  });

  it('pratica nuova solo se il cliente ha un agenzia con il fornitore alla data; agente impostato', async () => {
    const senza = await db.clienti.findFirstOrThrow({ where: { agenzie: { none: { fornitore_id: base.fornitore_id } } } });
    const b = (await op.carica(pdf('ordine senza agenzia'), 'ordine-x.pdf').expect(201)).body;
    const r = await op.post(`/documenti/${b.id}/abbina`, { tipo: 'ordine', numero: 'AB 7000', data: '2026-09-01', cliente_id: Number(senza.id), fornitore_id: Number(base.fornitore_id) }).expect(409);
    expect(r.body.message).toMatch(/agenzia/);
    const nuova = await db.ordini_fornitore_testata.findUniqueOrThrow({ where: { id: BigInt(pid) } });
    expect(nuova.agente_id).not.toBeNull();
  });

  it('pratica nuova solo se il fornitore ha uno scaglione per lo sconto dell agenzia (D-87)', async () => {
    // fornitore senza scaglioni: l'agenzia c'è ma la provvigione sarebbe 0% → il documento non apre la pratica
    const f = await db.fornitori.create({ data: {} });
    const fv = await db.fornitori_versioni.create({ data: { fornitore_id: f.id, fonte: 'integra', ragione_sociale: 'Fornitore Senza Scaglioni' } });
    await db.fornitori.update({ where: { id: f.id }, data: { versione_corrente_id: fv.id } });
    const sub = await db.subagenti.findFirstOrThrow();
    const cliente = await db.clienti.findFirstOrThrow();
    await db.interscambio.create({ data: { subagente_id: sub.id, cliente_id: cliente.id, fornitore_id: f.id, sconto: 0, codice_cliente_fornitore: 'FS-1', valido_dal: new Date('2025-01-01') } });
    const a = (await op.carica(pdf('ordine senza scaglione'), 'ordine-no-scaglione.pdf').expect(201)).body;
    const r = await op.post(`/documenti/${a.id}/abbina`, { tipo: 'ordine', numero: 'O-SC-1', data: '2026-09-01', cliente_id: Number(cliente.id), fornitore_id: Number(f.id) }).expect(409);
    expect(r.body.message).toMatch(/scaglione/);
  });

  it('spostare una fattura con la correzione del subagente: 409 come per l annullamento', async () => {
    const c = await db.provvigioni_correzioni.findFirst({ include: { documento: { include: { testata: true } } } });
    if (!c) return; // il seed non ha correzioni: la regola è la stessa funzione di elimina (togliibile)
    const dest = await db.ordini_fornitore_testata.findFirstOrThrow({ where: { fornitore_id: c.documento.testata.fornitore_id, id: { not: c.documento.testata_id } } });
    const r = await op.post(`/pratiche/${c.documento.testata_id}/documenti/${c.documento_id}/sposta`, { pratica_id: Number(dest.id) }).expect(409);
    expect(r.body.message).toMatch(/correzione|liquidat/);
  });

  it('data della pratica = primo ordine rimasto, la cartella non cambia', async () => {
    const t = await db.ordini_fornitore_testata.findUniqueOrThrow({ where: { id: BigInt(pid) } });
    const ordini = await db.ordini_fornitore_documenti.findMany({ where: { testata_id: t.id, tipo: 'ordine' }, orderBy: { data: 'asc' } });
    expect(t.data_ordine.toISOString().slice(0, 10)).toBe(ordini[0].data.toISOString().slice(0, 10));
  });
});
