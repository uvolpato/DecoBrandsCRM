// Pacchetto `agenzia-senza-subagente`: un'agenzia senza subagente dà quota subagente 0, nessuna riga
// in liquidazione ai subagenti, e il documento compare in Analisi sotto «Senza subagente». Decobrands
// prende la sua pct_agente come oggi. Funzioni pure del motore su dati costruiti: niente database.
import { Prisma } from '@prisma/client';
import { calcoloDocumento, fattiAnalisi, percentuali, provvigioneDoc, quotaSub, riconcilia, righeLiquidazione } from '../src/motore/motore';

/* eslint-disable @typescript-eslint/no-explicit-any */
const Dec = Prisma.Decimal;
const dec = (x: number) => new Dec(x);
const n = (x: Prisma.Decimal | null | undefined) => (x == null ? null : x.toNumber());

const sc = (sconto: number, pct_agente: number, pct_sub: number) =>
  ({ id: `s-${sconto}`, fornitore_id: 'f1', sconto: dec(sconto), pct_agente: dec(pct_agente), pct_sub: dec(pct_sub), valido_dal: '2025-01-01' });
const SCAGLIONI = [sc(0, 18, 10)]; // sconto 0 → 18 % a Decobrands, 10 % al subagente

const agenzia = (subagente_id: string | null, valido_dal: string, valido_al: string | null) =>
  ({ id: `i-${valido_dal}`, subagente_id, cliente_id: 'c1', fornitore_id: 'f1', codice: 'C', sconto: dec(0), pct_subagente: null, regola_mensile: null, valido_dal, valido_al });

const S = (interscambio: any[]): any => ({
  oggi: '2026-09-04',
  scaglioni: SCAGLIONI,
  fornitori: new Map([['f1', { id: 'f1', nome: 'Arte', maturazione: 'fatturato', giorni_conferma: 30, giorno_bollettino: 10, giorni_incasso: 60, spese_base_provvigione: false, raggruppamento: 'documento' }]]),
  clienti: new Map([['c1', { id: 'c1', nome: 'C', piva: null }]]),
  subagenti: new Map([['s1', { id: 's1', nome: 'S', attivo: true }]]),
  eccezioni: [],
  interscambio,
  bollettini: [], liquidazioni_chiuse: [], pratiche: [], fotografie: new Map(),
});

const documento = (numero: string, importo: number, data: string): any =>
  ({ id: numero, tipo: 'fattura', numero, data, importo: dec(importo), fattura_id: null, liquidazione_id: null, incasso: null, solleciti: 0, sollecitata_il: null, correzione: null, calcolo: null, congelato_il: null, righe: [] });

const pratica = (d: any, data = '2026-01-01'): any => ({
  id: 'p1', numero: 'OF/2026/999', fornitore_id: 'f1', cliente_id: 'c1', data,
  raggruppamento: null, ordini: [], conferme: [], proforma: [], pagamenti: [],
  righe: { ordine: [], conferma: [], fattura: [] }, documenti: [d],
});

describe('agenzia senza subagente (motore)', () => {
  const doc = documento('F1', 1000, '2026-07-15');
  const p = pratica(doc, '2026-01-10');
  const senza = () => ({ ...S([agenzia(null, '2025-01-01', null)]), pratiche: [p] });

  it('percentuali: quota subagente 0, agente = pct_agente del fornitore', () => {
    const perc = percentuali(senza(), p, '2026-07-15')!;
    expect(perc.subagente_id).toBeNull();
    expect(n(perc.sub)).toBe(0);
    expect(n(perc.sub_standard)).toBe(0);
    expect(n(perc.agente)).toBe(18);
    expect(n(perc.dal_fornitore)).toBe(18);
  });

  it('quotaSub: 0 (nessuna provvigione al subagente)', () => {
    const q = quotaSub(senza(), p, doc)!;
    expect(n(q.pct)).toBe(0);
    expect(n(q.provvigione)).toBe(0);
  });

  it('quotaSub: senza subagente il congelato non riporta una quota salvata (0 prima di tutto)', () => {
    const congelato = { ...doc, congelato_il: '2026-08-31', calcolo: { base: '1000.00', provvigione_subagente: '10.00', pct_subagente: '1.00' } };
    const p2 = { ...p, documenti: [congelato] };
    const q = quotaSub({ ...S([agenzia(null, '2025-01-01', null)]), pratiche: [p2] }, p2, congelato)!;
    expect(q.regola).toBe('senza_subagente');
    expect(n(q.pct)).toBe(0);
    expect(n(q.provvigione)).toBe(0);
  });

  it('calcoloDocumento in modalità riga: la correzione non dà quota al subagente senza subagente', () => {
    const rigaMerce = { codice: 'A1', descrizione: 'merci', qta: dec(10), prezzo: dec(100), importo: dec(1000), spesa: false };
    const docRiga = { ...documento('F-RIGA', 1000, '2026-07-15'), righe: [rigaMerce], correzione: { tipo: 'pct', valore: dec(5), motivo: 'x' } };
    const pRiga = { ...pratica(docRiga, '2026-01-10'), id: 'p-riga', numero: 'OF/2026/997', raggruppamento: 'riga' };
    const c = calcoloDocumento({ ...S([agenzia(null, '2025-01-01', null)]), pratiche: [pRiga] }, pRiga, docRiga);
    expect(c.pct_subagente).toBe('0.00');
    expect(c.provvigione_subagente).toBe('0.00');
    expect(Number(c.provvigione_agente)).toBeCloseTo(180, 2); // Decobrands prende la sua pct_agente
  });

  it('provvigioneDoc: prese = base × pct_agente, pagate 0, margine tutto a Decobrands', () => {
    const pr = provvigioneDoc(senza(), p, doc)!;
    expect(pr.perc.subagente_id).toBeNull();
    expect(n(pr.prese)).toBeCloseTo(180, 2); // 1000 × 18 %
    expect(n(pr.pagate)).toBe(0);
    expect(n(pr.margine)).toBeCloseTo(180, 2);
  });

  it('fattiAnalisi: il documento resta, con subagente_id null e pagate 0', () => {
    const fatti = fattiAnalisi(senza());
    expect(fatti).toHaveLength(1);
    expect(fatti[0].subagente_id).toBeNull();
    expect(n(fatti[0].prese)).toBeCloseTo(180, 2);
    expect(n(fatti[0].pagate)).toBe(0);
    expect(n(fatti[0].margine)).toBeCloseTo(180, 2);
  });

  it('righeLiquidazione: nessuna riga per il documento senza subagente', () => {
    expect(righeLiquidazione(senza(), 2026, 3)).toHaveLength(0);
  });

  it('bollettino: riconciliazione normale (noi = base × pct_agente)', () => {
    const b: any = {
      id: 'b1', fornitore_id: 'f1', anno: 2026, mese: 7, stato: 'da_verificare', ricevuto: '2026-08-01', chiuso_il: null,
      righe: [{ id: 'r1', documento_id: null, liquidazione_id: null, numero: 'F1', data: '2026-07-15', imponibile: dec(1000), pct: dec(18), importo: dec(180), quota_pagata: null, tipo: null, pct_calcolata: null, importo_calcolato: null, decisione: null }],
      attese: [],
    };
    const r = riconcilia({ ...S([agenzia(null, '2025-01-01', null)]), pratiche: [p], bollettini: [b] }, b);
    expect(r.righe).toHaveLength(1);
    expect(r.righe[0].categoria).toBe('quadra');
    expect(n(r.righe[0].noi!.importo)).toBeCloseTo(180, 2);
  });

  it('transizione: i documenti dopo la data del subagente vanno al subagente', () => {
    const interscambio = [agenzia(null, '2025-01-01', '2026-06-30'), agenzia('s1', '2026-07-01', null)];
    // l'agenzia vale alla data dell'ordine (D-146): prima dell'1/7 senza subagente, dopo col subagente
    const pPrima = { ...pratica(documento('F-PRIMA', 1000, '2026-05-15'), '2026-05-10'), id: 'p-prima', numero: 'OF/2026/998' };
    const pDopo = { ...pratica(documento('F-DOPO', 1000, '2026-07-15'), '2026-07-10'), id: 'p-dopo', numero: 'OF/2026/997' };
    const Sn = { ...S(interscambio), pratiche: [pPrima, pDopo] };
    expect(provvigioneDoc(Sn, pPrima, pPrima.documenti[0])!.perc.subagente_id).toBeNull();
    const dopo = provvigioneDoc(Sn, pDopo, pDopo.documenti[0])!;
    expect(dopo.perc.subagente_id).toBe('s1');
    expect(n(dopo.pagate)).toBeCloseTo(100, 2); // 1000 × 10 % (pct_sub dello scaglione)
  });
});
