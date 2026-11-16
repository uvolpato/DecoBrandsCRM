// Prova del comando di servizio per i dati già caricati (15/11/2026, P1): righe delle pratiche,
// fornitore riconosciuto, numero d'ordine del fornitore. Idempotente: il secondo giro non tocca nulla.
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { PrismaService } from '../src/prisma.service';
import { sistemaDati, type ResocontoSistemaDati } from '../prisma/sistema-dati';
import { svuota } from './svuota';

let db: PrismaService;
let n = 0;

const giorno = (s: string) => new Date(s + 'T00:00:00Z');

const nuovoReport = (): ResocontoSistemaDati => ({
  righe_documenti: 0, righe_righe: 0, righe_toccati: [],
  fornitori_riconosciuti: 0, fornitori_toccati: [],
  numeri_ordine: 0, numeri_ordine_conflitti: 0, numeri_ordine_toccati: [],
});

async function creaFornitore(nome: string) {
  const f = await db.fornitori.create({ data: {} });
  const v = await db.fornitori_versioni.create({ data: { fornitore_id: f.id, fonte: 'integra', ragione_sociale: nome } });
  await db.fornitori.update({ where: { id: f.id }, data: { versione_corrente_id: v.id } });
  return { id: f.id, versione_id: v.id };
}
async function creaCliente(nome: string) {
  const c = await db.clienti.create({ data: {} });
  const v = await db.clienti_versioni.create({ data: { cliente_id: c.id, fonte: 'integra', ragione_sociale: nome } });
  await db.clienti.update({ where: { id: c.id }, data: { versione_corrente_id: v.id } });
  return { id: c.id, versione_id: v.id };
}

/** Pratica con numero d'ordine del fornitore nullable (come le pratiche create prima di D-169). */
async function creaPratica(f: { id: bigint; versione_id: bigint }, c: { id: bigint; versione_id: bigint }, numeroOrdine: string | null, numero = 'OF/2026/001') {
  return db.ordini_fornitore_testata.create({
    data: { fornitore_id: f.id, fornitore_versione_id: f.versione_id, cliente_id: c.id, cliente_versione_id: c.versione_id, numero_ordine: numero, numero_ordine_fornitore: numeroOrdine, data_ordine: giorno('2026-04-08') },
  });
}

/** Documento in arrivo con campi letti (righe come le leggerebbe il lettore: `righe[i].<campo>`). */
async function arrivo(opts: { stato?: string; campi?: [string, string | null][]; righe?: [string, string, string, string, string][] } = {}) {
  const r = await db.documenti_in_arrivo.create({
    data: {
      origine: 'email', file_nome: `d${++n}.pdf`, stato: opts.stato ?? 'da_controllare',
      ricevuto_il: new Date('2026-09-04T10:00:00Z'),
      file_hash: createHash('sha256').update(String(n)).digest('hex'), file_percorso: `in_arrivo/d${n}.pdf`,
      tipo: 'ordine', fornitore_id: null, fornitore_versione_id: null,
    },
  });
  const campi: [string, string | null][] = [...(opts.campi ?? [])];
  (opts.righe ?? []).forEach(([codice, descrizione, quantita, prezzo, importo], i) => {
    campi.push([`righe[${i}].codice`, codice], [`righe[${i}].descrizione`, descrizione], [`righe[${i}].quantita`, quantita], [`righe[${i}].prezzo`, prezzo], [`righe[${i}].importo`, importo]);
  });
  if (campi.length) await db.documenti_campi.createMany({ data: campi.map(([campo, valore]) => ({ documento_id: r.id, campo, valore_letto: valore })) });
  return r;
}

/** Ordine della pratica già abbinato a un file in arrivo ma senza righe nella fotografia (caso reale OF/2026/001). */
async function creaOrdine(testata_id: bigint, arrivo_id: bigint, numero: string) {
  return db.ordini_fornitore_documenti.create({ data: { testata_id, tipo: 'ordine', numero, data: giorno('2026-04-08'), importo: 100, arrivo_id } });
}

async function esegui() {
  const r = nuovoReport();
  await db.$transaction(async (tx) => { await sistemaDati(tx, r); });
  return r;
}

beforeAll(async () => { db = new PrismaService(); });
afterAll(async () => { await db.$disconnect(); });
beforeEach(async () => { await svuota(db); });

describe('sistema-dati (comando di servizio)', () => {
  it('1: copia le righe lette del documento abbinato nella fotografia della pratica (fase dal tipo)', async () => {
    const f = await creaFornitore('ARTE WOHNACCESSORIES GMBH & CO.KG');
    const c = await creaCliente('Agri Aggio SNC');
    const t = await creaPratica(f, c, null);
    const a = await arrivo({ righe: [['20656', 'Vaso', '2', '10.5', '21'], ['75584', 'Ciotola', '1', '7', '7']] });
    await creaOrdine(t.id, a.id, 'AU276839');

    const r = await esegui();
    expect(r.righe_documenti).toBe(1);
    expect(r.righe_righe).toBe(2);
    const righe = await db.ordini_fornitore_righe.findMany({ where: { testata_id: t.id }, orderBy: { numero_riga: 'asc' } });
    expect(righe).toHaveLength(2);
    expect(righe[0]).toMatchObject({ fase: 'ordine', codice: '20656' });
    expect(Number(righe[0].quantita)).toBe(2);
    expect(Number(righe[0].importo)).toBe(21);
    expect(Number(righe[1].importo)).toBe(7); // importo letto, non quantità × prezzo
  });

  it('2: risolve e salva il fornitore dei documenti da lavorare senza fornitore', async () => {
    const f = await creaFornitore('ARTE WOHNACCESSORIES GMBH & CO.KG');
    const d = await arrivo({ stato: 'da_controllare', campi: [['fornitore', 'ARTE WOHNACCESSORIES GMBH & CO.KG']] });
    const r = await esegui();
    expect(r.fornitori_riconosciuti).toBe(1);
    const dopo = await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: d.id } });
    expect(dopo.fornitore_id).toBe(f.id);
    expect(dopo.fornitore_versione_id).toBe(f.versione_id);
  });

  it('2b: un nome non riconoscibile non si salva (mai a caso)', async () => {
    await creaFornitore('ARTE WOHNACCESSORIES GMBH & CO.KG');
    await arrivo({ stato: 'da_controllare', campi: [['fornitore', 'Nome Che Non Esiste']] });
    const r = await esegui();
    expect(r.fornitori_riconosciuti).toBe(0);
  });

  it('3: scrive il numero d\'ordine del fornitore sulla pratica dal documento d\'ordine', async () => {
    const f = await creaFornitore('ARTE WOHNACCESSORIES GMBH & CO.KG');
    const c = await creaCliente('Agri Aggio SNC');
    const t = await creaPratica(f, c, null);
    await creaOrdine(t.id, (await arrivo()).id, 'AU276839');

    const r = await esegui();
    expect(r.numeri_ordine).toBe(1);
    expect(r.numeri_ordine_conflitti).toBe(0);
    const p = await db.ordini_fornitore_testata.findUniqueOrThrow({ where: { id: t.id } });
    expect(p.numero_ordine_fornitore).toBe('AU276839');
  });

  it('3b: stessa coppia fornitore + numero su un\'altra pratica → conflitto, non scrive', async () => {
    const f = await creaFornitore('ARTE WOHNACCESSORIES GMBH & CO.KG');
    const c = await creaCliente('Agri Aggio SNC');
    const t1 = await creaPratica(f, c, null, 'OF/2026/001');
    const t2 = await creaPratica(f, c, null, 'OF/2026/002');
    await creaOrdine(t1.id, (await arrivo()).id, 'AU276839');
    await creaOrdine(t2.id, (await arrivo()).id, 'AU276839');

    const r = await esegui();
    expect(r.numeri_ordine).toBe(1);
    expect(r.numeri_ordine_conflitti).toBe(1);
    expect((await db.ordini_fornitore_testata.findUniqueOrThrow({ where: { id: t1.id } })).numero_ordine_fornitore).toBe('AU276839');
    expect((await db.ordini_fornitore_testata.findUniqueOrThrow({ where: { id: t2.id } })).numero_ordine_fornitore).toBeNull();
  });

  it('non sovrascrive una scelta a mano (idempotente, anche sul fornitore)', async () => {
    const f = await creaFornitore('ARTE WOHNACCESSORIES GMBH & CO.KG');
    const f2 = await creaFornitore('Gasper GmbH');
    const d = await arrivo({ stato: 'da_controllare', campi: [['fornitore', 'ARTE WOHNACCESSORIES GMBH & CO.KG']] });
    await db.documenti_in_arrivo.update({ where: { id: d.id }, data: { fornitore_id: f2.id, fornitore_versione_id: f2.versione_id } });
    const r = await esegui();
    expect(r.fornitori_riconosciuti).toBe(0);
    expect((await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: d.id } })).fornitore_id).toBe(f2.id);
  });

  it('secondo giro: nessuna modifica (idempotente) e un solo evento', async () => {
    const f = await creaFornitore('ARTE WOHNACCESSORIES GMBH & CO.KG');
    const c = await creaCliente('Agri Aggio SNC');
    const t = await creaPratica(f, c, null);
    const a = await arrivo({ righe: [['20656', 'Vaso', '2', '10.5', '21']] });
    await creaOrdine(t.id, a.id, 'AU276839');
    await arrivo({ stato: 'da_controllare', campi: [['fornitore', 'ARTE WOHNACCESSORIES GMBH & CO.KG']] });

    const prima = await esegui();
    expect(prima.righe_documenti + prima.fornitori_riconosciuti + prima.numeri_ordine).toBeGreaterThan(0);
    const eventiDopoPrima = await db.registro.count({ where: { entita: 'servizio' } });

    const seconda = await esegui();
    expect(seconda.righe_documenti).toBe(0);
    expect(seconda.fornitori_riconosciuti).toBe(0);
    expect(seconda.numeri_ordine).toBe(0);
    expect(seconda.numeri_ordine_conflitti).toBe(0);
    expect(await db.registro.count({ where: { entita: 'servizio' } })).toBe(eventiDopoPrima + 1);
    // l'evento porta i conteggi del giro
    const ev = await db.registro.findFirstOrThrow({ where: { entita: 'servizio' }, orderBy: { id: 'desc' } });
    expect(ev.dettaglio).toBeDefined();
  });
});
