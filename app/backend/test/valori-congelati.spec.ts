// Prove del pacchetto `valori-congelati` (D-183 §19): base della provvigione = netto − spese escluse
// (accordo col fornitore), sconto medio solo sulla merce, valori calcolati e congelati sul documento.
// Funzioni pure del motore su dati costruiti: niente database.
import { Prisma } from '@prisma/client';
import { baseDoc, basePratica, calcoloDocumento, r2, scontoMedio, speseDoc, speseEscluse } from '../src/motore/motore';

/* eslint-disable @typescript-eslint/no-explicit-any */
const Dec = Prisma.Decimal;
const dec = (x: number) => new Dec(x);
const n = (x: Prisma.Decimal | null | undefined) => (x == null ? null : x.toNumber());

/** Una riga del motore; `spesa` segna la riga non merce (trasporto, imballo, «Fracht»). */
const riga = (codice: string, qta: number, prezzo: number, importo?: number, spesa = false) =>
  ({ codice, descrizione: codice, qta: dec(qta), prezzo: dec(prezzo), importo: importo != null ? dec(importo) : r2(qta * prezzo), spesa });

const documento = (tipo: string, numero: string, data: string, importo: number, righe: any[] = []): any =>
  ({ id: numero, tipo, numero, data, importo: dec(importo), fattura_id: null, liquidazione_id: null, incasso: null, solleciti: 0, sollecitata_il: null, correzione: null, calcolo: null, congelato_il: null, righe });

const pratica = (o: { righe?: { fattura?: any[] }; documenti?: any[]; fornitore_id?: string; cliente_id?: string; data?: string } = {}) => ({
  id: 'p1', numero: 'OF/2026/999', fornitore_id: o.fornitore_id ?? 'f1', cliente_id: o.cliente_id ?? 'c1', data: o.data ?? '2026-01-01',
  raggruppamento: null, annullata: false, ordini: [], conferme: [], proforma: [], pagamenti: [],
  righe: { ordine: [], conferma: [], fattura: o.righe?.fattura ?? [] },
  documenti: o.documenti ?? [],
});

const sc = (fornitore_id: string, sconto: number, pct_agente: number, pct_sub: number, valido_dal = '2025-01-01') =>
  ({ id: `s-${fornitore_id}-${sconto}`, fornitore_id, sconto: dec(sconto), pct_agente: dec(pct_agente), pct_sub: dec(pct_sub), valido_dal });

/** Dati minimi con il fornitore f1 e scaglioni 0 e 5; `speseBase` decide l'accordo sulle spese. */
const S = (speseBase: boolean) => ({
  scaglioni: [sc('f1', 0, 20, 12), sc('f1', 5, 15, 8)],
  fornitori: new Map([['f1', { id: 'f1', nome: 'F', maturazione: 'fatturato', giorni_conferma: 30, giorno_bollettino: 10, giorni_incasso: 60, spese_base_provvigione: speseBase }]]),
  clienti: new Map([['c1', { id: 'c1', nome: 'C', piva: null }]]),
  subagenti: new Map([['s1', { id: 's1', nome: 'S', attivo: true }]]),
  eccezioni: [],
  interscambio: [{ id: 'i1', subagente_id: 's1', cliente_id: 'c1', fornitore_id: 'f1', codice: 'C', sconto: dec(0), pct_subagente: null, regola_mensile: null, valido_dal: '2025-01-01', valido_al: null }],
  bollettini: [], liquidazioni_chiuse: [],
} as any);

describe('valori congelati (D-183)', () => {
  it('speseDoc somma le sole righe segnate spesa', () => {
    const d = documento('fattura', 'F1', '2026-10-15', 963.78, [riga('A', 1, 963.78, 963.78), riga('Fracht', 1, 0, 87.50, true)]);
    expect(n(speseDoc(d))).toBe(87.5);
  });

  it('fornitore «no»: base = netto − spese; fornitore «sì»: base = netto', () => {
    const d = documento('fattura', 'F1', '2026-10-15', 963.78, [riga('A', 1, 963.78, 963.78), riga('Fracht', 1, 0, 87.50, true)]);
    const p = pratica({ righe: { fattura: [riga('A', 1, 963.78, 963.78), riga('Fracht', 1, 0, 87.50, true)] }, documenti: [d] });
    expect(n(speseEscluse(S(false), p, d))).toBe(87.5);
    expect(n(speseEscluse(S(true), p, d))).toBe(0);
    expect(calcoloDocumento(S(false), p, d).base).toBe('876.28');
    expect(calcoloDocumento(S(true), p, d).base).toBe('963.78');
  });

  it('sconto medio sulle sole righe di merce (spesa fuori da lordo e netto)', () => {
    // merce: lordo 1000, netto 900 (10 %); spesa 87,50 non conta
    const p = pratica({ righe: { fattura: [riga('A', 10, 100, 900), riga('Fracht', 1, 0, 87.50, true)] } });
    expect(n(scontoMedio(p))).toBe(10);
  });

  it('calcoloDocumento: scaglione e provvigioni sulla base (netto − spese)', () => {
    const d = documento('fattura', 'F1', '2026-10-15', 963.78, [riga('A', 1, 963.78, 963.78), riga('Fracht', 1, 0, 87.50, true)]);
    const p = pratica({ righe: { fattura: [riga('A', 1, 963.78, 963.78), riga('Fracht', 1, 0, 87.50, true)] }, documenti: [d] });
    const c = calcoloDocumento(S(false), p, d);
    expect(c.base).toBe('876.28');
    expect(c.spese).toBe('87.50');
    expect(c.scaglione).toBe('0.00'); // sconto medio 0 % (merce) → scaglione 0
    expect(c.pct_agente).toBe('20.00');
    expect(c.provvigione_agente).toBe('175.26'); // 876,28 × 20 %
    expect(c.regola).toBe('spese-base-v1');
  });

  it('baseDoc legge il valore salvato, altrimenti il netto', () => {
    const d = documento('fattura', 'F1', '2026-10-15', 963.78);
    expect(n(baseDoc(d))).toBe(963.78);
    d.calcolo = { base: '876.28' } as any;
    expect(n(baseDoc(d))).toBe(876.28);
  });

  it('pratica = somma delle basi dei documenti (congelati o no)', () => {
    const d1 = documento('fattura', 'F1', '2026-10-15', 963.78, [riga('Fracht', 1, 0, 87.50, true)]);
    const d2 = documento('nota_credito', 'NC1', '2026-10-20', -100);
    const p = pratica({ righe: { fattura: [riga('A', 1, 963.78, 963.78), riga('Fracht', 1, 0, 87.50, true)] }, documenti: [d1, d2] });
    const S0 = S(false);
    // base = (963,78 − 87,50) + (−100) = 776,28
    d1.calcolo = calcoloDocumento(S0, p, d1) as any;
    d2.calcolo = calcoloDocumento(S0, p, d2) as any;
    expect(n(basePratica(p))).toBe(776.28);
  });
});
