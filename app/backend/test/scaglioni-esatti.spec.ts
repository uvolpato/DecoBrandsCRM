// Prove del pacchetto `scaglioni-esatti` (D-200 §19): l'impostazione «Scaglioni» sul fornitore accetta
// solo sconti esatti (|sconto − soglia| ≤ 0,05) al posto della fascia (prima soglia ≥ sconto). Funzioni
// pure del motore su dati costruiti: niente database.
import { Prisma } from '@prisma/client';
import { anomaliaProvvigione, anomaliaScontoMedio, calcoloDocumento, fattiAnalisi, r2, righeLiquidazione, scaglione } from '../src/motore/motore';
import { dettaglioPratica } from '../src/pratiche';

/* eslint-disable @typescript-eslint/no-explicit-any */
const Dec = Prisma.Decimal;
const dec = (x: number) => new Dec(x);

/** Una riga del motore: importo = netto (già scontato), qta × prezzo = lordo. */
const riga = (codice: string, qta: number, prezzo: number, importo?: number) =>
  ({ codice, descrizione: codice, qta: dec(qta), prezzo: dec(prezzo), importo: importo != null ? dec(importo) : r2(qta * prezzo), spesa: false });

const documento = (tipo: string, numero: string, data: string, importo: number, righe: any[] = []): any =>
  ({ id: numero, tipo, numero, data, importo: dec(importo), fattura_id: null, liquidazione_id: null, incasso: null, solleciti: 0, sollecitata_il: null, correzione: null, calcolo: null, congelato_il: null, righe });

const pratica = (righeFattura: any[] = []): any => ({
  id: 'p1', numero: 'OF/2026/999', fornitore_id: 'f1', cliente_id: 'c1', data: '2026-01-01',
  raggruppamento: null, ordini: [], conferme: [], proforma: [], pagamenti: [],
  righe: { ordine: [], conferma: [], fattura: righeFattura },
  documenti: [],
});

const sc = (sconto: number, pct_agente: number, pct_sub: number) =>
  ({ id: `s-${sconto}`, fornitore_id: 'f1', sconto: dec(sconto), pct_agente: dec(pct_agente), pct_sub: dec(pct_sub), valido_dal: '2025-01-01' });

/** Soglie della regola: 0/1/5/10 → 15/7/15/15. */
const SCAGLIONI = [sc(0, 15, 8), sc(1, 7, 3), sc(5, 15, 8), sc(10, 15, 8)];

/** Dati minimi con il fornitore f1; `esatti` decide a fascia | solo sconti esatti. */
const S = (esatti: boolean): any => ({
  oggi: '2026-10-30',
  scaglioni: SCAGLIONI,
  fornitori: new Map([['f1', { id: 'f1', nome: 'F', maturazione: 'fatturato', giorni_conferma: 30, giorno_bollettino: 10, giorni_incasso: 60, spese_base_provvigione: false, raggruppamento: 'documento', scaglioni_esatti: esatti }]]),
  clienti: new Map([['c1', { id: 'c1', nome: 'C', piva: null }]]),
  subagenti: new Map([['s1', { id: 's1', nome: 'S', attivo: true }]]),
  eccezioni: [],
  interscambio: [{ id: 'i1', subagente_id: 's1', cliente_id: 'c1', fornitore_id: 'f1', codice: 'C', sconto: dec(0), pct_subagente: null, regola_mensile: null, valido_dal: '2025-01-01', valido_al: null }],
  bollettini: [], liquidazioni_chiuse: [], pratiche: [], fotografie: new Map(),
});

const n = (x: Prisma.Decimal | null | undefined) => (x == null ? null : x.toNumber());

describe('scaglioni esatti (D-200)', () => {
  it('a fascia: comportamento invariato (prima soglia ≥ sconto)', () => {
    const s = S(false);
    expect(n(scaglione(s, 'f1', dec(3), '2026-10-01')!.pct_agente)).toBe(15); // 3 → soglia 5
    expect(n(scaglione(s, 'f1', dec(0.5), '2026-10-01')!.pct_agente)).toBe(7); // 0,5 → soglia 1
    expect(n(scaglione(s, 'f1', dec(0), '2026-10-01')!.pct_agente)).toBe(15);
    expect(n(scaglione(s, 'f1', dec(1), '2026-10-01')!.pct_agente)).toBe(7);
    expect(n(scaglione(s, 'f1', dec(9.98), '2026-10-01')!.pct_agente)).toBe(15); // → soglia 10
    expect(scaglione(s, 'f1', dec(10.06), '2026-10-01')).toBeNull(); // oltre l'ultima
  });

  it('solo sconti esatti: la soglia deve coincidere (±0,05), altrimenti null', () => {
    const s = S(true);
    expect(n(scaglione(s, 'f1', dec(0), '2026-10-01')!.pct_agente)).toBe(15);
    expect(n(scaglione(s, 'f1', dec(1), '2026-10-01')!.pct_agente)).toBe(7);
    expect(n(scaglione(s, 'f1', dec(9.98), '2026-10-01')!.pct_agente)).toBe(15); // |9,98 − 10| = 0,02
    expect(scaglione(s, 'f1', dec(3), '2026-10-01')).toBeNull();
    expect(scaglione(s, 'f1', dec(0.5), '2026-10-01')).toBeNull();
    expect(scaglione(s, 'f1', dec(10.06), '2026-10-01')).toBeNull(); // |10,06 − 10| = 0,06
  });

  it('sconto medio senza soglia esatta → anomalia; con soglia esatta → nessuna', () => {
    const tre = pratica([riga('A', 1, 1000, 970)]); // sconto 3 %
    tre.documenti = [documento('fattura', 'F1', '2026-10-15', 970, tre.righe.fattura)];
    const a = anomaliaScontoMedio(S(true), tre)!;
    expect(a).toMatchObject({ numero: 'OF/2026/999', documento: 'F1' });
    expect(n(a.sconto_medio)).toBe(3);

    const uno = pratica([riga('A', 1, 1000, 990)]); // sconto 1 % → soglia esatta
    uno.documenti = [documento('fattura', 'F1', '2026-10-15', 990, uno.righe.fattura)];
    expect(anomaliaScontoMedio(S(true), uno)).toBeNull();
  });

  it('calcolo: in modalità esatta un documento senza soglia esatta è «da decidere» e salva scaglioni_esatti', () => {
    const p = pratica([riga('A', 1, 1000, 970)]);
    p.documenti = [documento('fattura', 'F1', '2026-10-15', 970, p.righe.fattura)];
    const c = calcoloDocumento(S(true), p, p.documenti[0]);
    expect(c.scaglioni_esatti).toBe(true);
    expect(c.provvigione_agente).toBeNull();
    // a fascia lo stesso documento prende la soglia 5 (15 %)
    const cf = calcoloDocumento(S(false), p, p.documenti[0]);
    expect(cf.scaglioni_esatti).toBe(false);
    expect(cf.scaglione).toBe('5.00');
    expect(cf.provvigione_agente).toBe('145.50'); // 970 × 15 %
  });

  it('esatti + raggruppamento riga: righe a 0 % e 3 % → anomalia del documento; 0 % e 10 % → somma giusta', () => {
    const misto = pratica([riga('A', 1, 600, 600), riga('B', 1, 1000, 970)]);
    misto.documenti = [documento('fattura', 'F1', '2026-10-15', 1570, misto.righe.fattura)];
    const S0 = { ...S(true), fornitori: new Map([['f1', { ...S(true).fornitori.get('f1'), raggruppamento: 'riga' }]]) };
    const a = anomaliaProvvigione(S0, misto)!;
    expect('sconto_gruppo' in a).toBe(true); // il gruppo al 3 % non ha soglia esatta

    const ok = pratica([riga('A', 1, 600, 600), riga('B', 1, 1000, 900)]);
    ok.documenti = [documento('fattura', 'F1', '2026-10-15', 1500, ok.righe.fattura)];
    const c = calcoloDocumento(S0, ok, ok.documenti[0]);
    expect(c.gruppi).toHaveLength(2);
    expect(c.provvigione_agente).toBe('225.00'); // 600 × 15 % + 900 × 15 %
    expect(anomaliaProvvigione(S0, ok)).toBeNull();
  });

  it('esatti + riga: 0 % (600) + 10 % (900) → 225 € in documento, Riepilogo, liquidazione e Analisi, nessuna anomalia', () => {
    const p = pratica([riga('A', 1, 600, 600), riga('B', 1, 1000, 900)]);
    p.documenti = [documento('fattura', 'F1', '2026-10-15', 1500, p.righe.fattura)];
    const S0 = { ...S(true), pratiche: [p], fornitori: new Map([['f1', { ...S(true).fornitori.get('f1'), raggruppamento: 'riga' }]]) };
    expect(anomaliaProvvigione(S0, p)).toBeNull();
    // documento
    expect(calcoloDocumento(S0, p, p.documenti[0]).provvigione_agente).toBe('225.00');
    // Riepilogo (percentuali null per lo sconto medio 6,25 % senza soglia esatta, ma i gruppi valgono)
    const d = dettaglioPratica(S0, 'p1')!;
    expect(d.provvigione!.a_decobrands).toBe(225);
    expect(d.provvigione!.a_subagente).toBe(120); // 600 × 8 % + 900 × 8 %
    expect(d.provvigione!.margine).toBe(105);
    expect(d.sconto_medio).toBeNull(); // in riga non c'è un solo scaglione
    // liquidazione
    const r = righeLiquidazione(S0, 2026, 4).find((x) => x.numero === 'F1')!;
    expect(n(r.provvigione)).toBe(120);
    // Analisi
    const fatto = fattiAnalisi(S0).find((f) => f.numero === 'F1')!;
    expect(n(fatto.prese)).toBe(225);
    expect(n(fatto.pagate)).toBe(120);
  });
});

// Aperto del pacchetto precedente: in modalità riga il Riepilogo della pratica usa la presa effettiva
// dei documenti (somma dei gruppi), non la percentuale unica dello sconto medio (D-199, V12).
describe('riepilogo pratica: presa effettiva in modalità riga (D-199)', () => {
  const scRiga = (sconto: number, pct_agente: number, pct_sub: number) =>
    ({ id: `s-${sconto}`, fornitore_id: 'f1', sconto: dec(sconto), pct_agente: dec(pct_agente), pct_sub: dec(pct_sub), valido_dal: '2025-01-01' });
  // scaglioni 0–10 → 15/8, 20 → 10/5
  const SCAGLIONI_RIGA = [scRiga(10, 15, 8), scRiga(20, 10, 5)];
  const Sriga = (): any => ({
    oggi: '2026-10-30', scaglioni: SCAGLIONI_RIGA,
    fornitori: new Map([['f1', { id: 'f1', nome: 'F', maturazione: 'fatturato', giorni_conferma: 30, giorno_bollettino: 10, giorni_incasso: 60, spese_base_provvigione: false, raggruppamento: 'riga', scaglioni_esatti: false }]]),
    clienti: new Map([['c1', { id: 'c1', nome: 'C', piva: null }]]),
    subagenti: new Map([['s1', { id: 's1', nome: 'S', attivo: true }]]),
    eccezioni: [], interscambio: [{ id: 'i1', subagente_id: 's1', cliente_id: 'c1', fornitore_id: 'f1', codice: 'C', sconto: dec(0), pct_subagente: null, regola_mensile: null, valido_dal: '2025-01-01', valido_al: null }],
    bollettini: [], liquidazioni_chiuse: [], pratiche: [], fotografie: new Map(),
  });

  it('fattura 600@5 % + 400@20 % → Riepilogo 130 € a Decobrands, margine 62 €', () => {
    const p = pratica([riga('A', 1, 631.58, 600), riga('B', 1, 500, 400)]);
    p.documenti = [documento('fattura', 'F1', '2026-10-15', 1000, p.righe.fattura)];
    const S0 = { ...Sriga(), pratiche: [p] };
    const d = dettaglioPratica(S0, 'p1')!;
    expect(d.provvigione!.a_decobrands).toBe(130);
    expect(d.provvigione!.a_subagente).toBe(68);
    expect(d.provvigione!.margine).toBe(62);
  });
});

