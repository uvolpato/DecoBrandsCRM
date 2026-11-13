// Prova di volume del motore (A7-21): con 5.000 pratiche maturate e altrettante righe di bollettino,
// righeLiquidazione deve restare sotto 1 s. Prima degli indici era O(documenti × righe): riconosciutoIn
// risolveva ogni riga scorrendo tutte le pratiche (≈ 6·10¹⁰ confronti su questi dati).
import { Prisma } from '@prisma/client';
import { costruisciIndici } from '../src/motore/dati';
import type { Dati } from '../src/motore/dati';
import { righeLiquidazione } from '../src/motore/motore';

/* eslint-disable @typescript-eslint/no-explicit-any */
const dec = (x: number) => new Prisma.Decimal(x);

describe('motore: volumi (A7-21)', () => {
  it('righeLiquidazione su 5.000 pratiche maturate resta sotto 1 s', () => {
    const N = 5000;
    const pratiche: any = Array.from({ length: N }, (_, i) => ({
      id: `p${i}`, numero: `P${i}`, fornitore_id: 'F1', cliente_id: 'C1', data: '2026-05-01',
      ordini: [], conferme: [], proforma: [], pagamenti: [],
      righe: { ordine: [], conferma: [], fattura: [] },
      documenti: [{
        id: `d${i}`, tipo: 'fattura', numero: `F${i}`, data: '2026-06-10', importo: dec(100),
        fattura_id: null, liquidazione_id: null, incasso: null, solleciti: 0, sollecitata_il: null, correzione: null,
      }],
    }));
    const bollettini: any = [{
      id: 'B1', fornitore_id: 'F1', anno: 2026, mese: 6, stato: 'verificato', ricevuto: '2026-07-01', chiuso_il: '2026-07-01',
      righe: Array.from({ length: N }, (_, i) => ({
        id: `r${i}`, documento_id: `d${i}`, liquidazione_id: null, numero: `F${i}`, data: '2026-06-10',
        imponibile: dec(100), pct: dec(10), importo: dec(10), tipo: null, pct_calcolata: null, importo_calcolato: null, decisione: null,
      })),
      attese: [],
    }];
    const S = {
      oggi: '2026-09-04',
      fornitori: new Map([['F1', { id: 'F1', nome: 'Fornitore', maturazione: 'maturato', giorni_conferma: 7, giorno_bollettino: 10, giorni_incasso: 60 }]]),
      clienti: new Map([['C1', { id: 'C1', piva: null, nome: 'Cliente' }]]),
      subagenti: new Map([['S1', { id: 'S1', nome: 'Subagente', attivo: true }]]),
      scaglioni: [{ id: 'sc1', fornitore_id: 'F1', sconto: dec(0), pct_agente: dec(10), pct_sub: dec(5), valido_dal: '2020-01-01' }],
      eccezioni: [],
      interscambio: [{ id: 'ab1', subagente_id: 'S1', cliente_id: 'C1', fornitore_id: 'F1', codice: 'X', sconto: dec(0), pct_subagente: null, regola_mensile: null, valido_dal: '2020-01-01', valido_al: null }],
      pratiche, bollettini, liquidazioni_chiuse: [], fotografie: new Map(),
      ...costruisciIndici(pratiche, bollettini),
      _pratiche: pratiche, _bollettini: bollettini,
    } as unknown as Dati;
    const t0 = performance.now();
    const righe = righeLiquidazione(S, 2026, 2);
    const ms = performance.now() - t0;
    expect(righe.length).toBe(N);
    expect(ms).toBeLessThan(1000);
  });
});
