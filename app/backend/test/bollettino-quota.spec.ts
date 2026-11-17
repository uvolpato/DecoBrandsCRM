// Prove del pacchetto `bollettini-quota-somma` (D-201 §19): la riga del bollettino porta la quota pagata
// (Arte «% bezahlt») e più righe dello stesso bollettino per la stessa fattura si raggruppano. Il nostro
// atteso è la provvigione del documento × quota/100, un solo arrotondamento; tolleranza 0,01 € per quadrare.
// Funzioni pure del motore su dati costruiti: niente database.
import { Prisma } from '@prisma/client';
import { riconcilia } from '../src/motore/motore';

/* eslint-disable @typescript-eslint/no-explicit-any */
const Dec = Prisma.Decimal;
const dec = (x: number) => new Dec(x);
const n = (x: Prisma.Decimal | null | undefined) => (x == null ? null : x.toNumber());

const sc = (sconto: number, pct_agente: number, pct_sub: number) =>
  ({ id: `s-${sconto}`, fornitore_id: 'f1', sconto: dec(sconto), pct_agente: dec(pct_agente), pct_sub: dec(pct_sub), valido_dal: '2025-01-01' });
const SCAGLIONI = [sc(0, 15, 8)]; // sconto 0 → 15 % a Decobrands

/** Dati minimi con il fornitore Arte (fatturato), un cliente e un'agenzia con sconto 0. */
const S = (): any => ({
  scaglioni: SCAGLIONI,
  fornitori: new Map([['f1', { id: 'f1', nome: 'Arte', maturazione: 'fatturato', giorni_conferma: 30, giorno_bollettino: 10, giorni_incasso: 60, spese_base_provvigione: false, raggruppamento: 'documento' }]]),
  clienti: new Map([['c1', { id: 'c1', nome: 'C', piva: null }]]),
  subagenti: new Map([['s1', { id: 's1', nome: 'S', attivo: true }]]),
  eccezioni: [],
  interscambio: [{ id: 'i1', subagente_id: 's1', cliente_id: 'c1', fornitore_id: 'f1', codice: 'C', sconto: dec(0), pct_subagente: null, regola_mensile: null, valido_dal: '2025-01-01', valido_al: null }],
  bollettini: [], liquidazioni_chiuse: [], pratiche: [], fotografie: new Map(),
});

/** Fattura senza righe: sconto medio → riserva sullo sconto dell'agenzia (0) → scaglione 0 → 15 %. */
const documento = (numero: string, importo: number): any =>
  ({ id: numero, tipo: 'fattura', numero, data: '2026-10-15', importo: dec(importo), fattura_id: null, liquidazione_id: null, incasso: null, solleciti: 0, sollecitata_il: null, correzione: null, calcolo: null, congelato_il: null, righe: [] });

const pratica = (d: any): any => ({
  id: 'p1', numero: 'OF/2026/999', fornitore_id: 'f1', cliente_id: 'c1', data: '2026-01-01',
  raggruppamento: null, ordini: [], conferme: [], proforma: [], pagamenti: [],
  righe: { ordine: [], conferma: [], fattura: [] }, documenti: [d],
});

const riga = (o: { numero: string; imponibile: number | null; pct: number | null; importo: number; quota?: number | null }, i: number): any => ({
  id: String(i + 1), documento_id: null, liquidazione_id: null, numero: o.numero, data: '2026-10-15',
  imponibile: o.imponibile != null ? dec(o.imponibile) : null, pct: o.pct != null ? dec(o.pct) : null, importo: dec(o.importo),
  quota_pagata: o.quota != null ? dec(o.quota) : null, tipo: null, pct_calcolata: null, importo_calcolato: null, decisione: null,
});

const bollettino = (rr: any[]): any => ({ id: 'b1', fornitore_id: 'f1', anno: 2026, mese: 10, stato: 'da_verificare', ricevuto: '2026-11-01', chiuso_il: null, righe: rr, attese: [] });

const ric = (d: any, rr: any[]) => riconcilia({ ...S(), pratiche: [pratica(d)], bollettini: [bollettino(rr)] }, bollettino(rr));

describe('quota pagata e più righe per fattura (D-201)', () => {
  it('RE194149: 326,00 × 15 % × 96,43 % = 47,15 → quadra', () => {
    const r = ric(documento('RE194149', 326), [riga({ numero: 'RE194149', imponibile: 326, pct: 15, importo: 47.15, quota: 96.43 }, 0)]).righe[0];
    expect(n(r.noi!.importo)).toBeCloseTo(47.15, 2);
    expect(r.categoria).toBe('quadra');
    expect(n(r.quota)).toBeCloseTo(96.43, 2);
    expect(r.righe).toHaveLength(1);
  });

  it('RE193071: due righe (10 % e 15 %) si raggruppano, differenza −11,88, una sola voce', () => {
    const r = ric(documento('RE193071', 2117.30), [
      riga({ numero: 'RE193071', imponibile: 247.60, pct: 10, importo: 23.77, quota: 96 }, 0),
      riga({ numero: 'RE193071', imponibile: 1869.70, pct: 15, importo: 269.24, quota: 96 }, 1),
    ]);
    expect(r.righe).toHaveLength(1); // un solo gruppo, non due righe
    const x = r.righe[0];
    expect(n(x.loro!.importo)).toBeCloseTo(293.01, 2);
    expect(n(x.noi!.importo)).toBeCloseTo(304.89, 2); // 2.117,30 × 15 % × 96 %
    expect(n(x.differenza)).toBeCloseTo(-11.88, 2);
    expect(x.categoria).toBe('differenza');
    expect(x.righe).toHaveLength(2);
    expect(n(x.quota)).toBeCloseTo(96, 2);
    expect(x.quote_diverse).toBe(false);
  });

  it('riga senza quota: atteso come oggi (provvigione piena), differenza 0,01 → quadra', () => {
    const r = ric(documento('F1', 326), [riga({ numero: 'F1', imponibile: 326, pct: 15, importo: 48.91, quota: null }, 0)]).righe[0];
    expect(n(r.noi!.importo)).toBeCloseTo(48.90, 2); // 326 × 15 %
    expect(r.quota).toBeNull();
    expect(r.categoria).toBe('quadra'); // 48,91 − 48,90 = 0,01
  });

  it('differenza 0,02 → anomalia (non quadra)', () => {
    const r = ric(documento('F1', 326), [riga({ numero: 'F1', imponibile: 326, pct: 15, importo: 48.92, quota: null }, 0)]).righe[0];
    expect(r.categoria).toBe('differenza');
  });

  it('quote diverse nel gruppo (> 0,01 punti) → anomalia «quote diverse», quota = media pesata', () => {
    const r = ric(documento('F2', 200), [
      riga({ numero: 'F2', imponibile: 100, pct: 15, importo: 14.40, quota: 96 }, 0),
      riga({ numero: 'F2', imponibile: 100, pct: 15, importo: 14.70, quota: 98 }, 1),
    ]).righe[0];
    expect(r.righe).toHaveLength(2);
    expect(r.quote_diverse).toBe(true);
    expect(n(r.quota)).toBeCloseTo(97, 2); // (100 × 96 + 100 × 98) / 200
  });
});
