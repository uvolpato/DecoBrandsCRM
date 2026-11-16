// Prove del pacchetto `righe-nota-credito` (D-197 §19): le righe della nota di credito si salvano e
// lo sconto medio si ricalcola sulla differenza (fattura − nota). Funzioni pure del motore su dati
// costruiti: niente database. V12/V13: il motore è puro, il salvataggio sta in registra/salvaCalcolo.
import { Prisma } from '@prisma/client';
import { anomaliaScontoMedio, basePratica, calcoloDocumento, r2, righeLiquidazione, scaglione, scontoMedio, scontoMedioFase } from '../src/motore/motore';
import { faseDi } from '../src/documenti';

/* eslint-disable @typescript-eslint/no-explicit-any */
const Dec = Prisma.Decimal;
const dec = (x: number) => new Dec(x);
const n = (x: Prisma.Decimal | null | undefined) => (x == null ? null : x.toNumber());

/** Una riga del motore: importo = netto (già scontato), qta × prezzo = lordo. */
const riga = (codice: string, qta: number, prezzo: number, importo?: number, spesa = false) =>
  ({ codice, descrizione: codice, qta: dec(qta), prezzo: dec(prezzo), importo: importo != null ? dec(importo) : r2(qta * prezzo), spesa });

/** Un documento fiscale con le sue righe (per la nota: le righe lette, positive, si sottraggono). */
const documento = (tipo: string, numero: string, data: string, importo: number, righe: any[] = [], fattura_id: string | null = null): any =>
  ({ id: numero, tipo, numero, data, importo: dec(importo), fattura_id, liquidazione_id: null, incasso: null, solleciti: 0, sollecitata_il: null, correzione: null, calcolo: null, congelato_il: null, righe });

const pratica = (fattura: any[], documenti: any[] = []): any => ({
  id: 'p1', numero: 'OF/2026/999', fornitore_id: 'f1', cliente_id: 'c1', data: '2026-01-01',
  ordini: [], conferme: [], proforma: [], pagamenti: [],
  righe: { ordine: [], conferma: [], fattura },
  documenti,
});

const sc = (sconto: number, pct_agente: number, pct_sub: number) =>
  ({ id: `s-${sconto}`, fornitore_id: 'f1', sconto: dec(sconto), pct_agente: dec(pct_agente), pct_sub: dec(pct_sub), valido_dal: '2025-01-01' });

/** Dati minimi: fornitore f1 (spese escluse) con scaglioni 0, 5 e 10. */
const S = (scaglioni: any[] = [sc(0, 20, 12), sc(5, 15, 8), sc(10, 7, 3)]): any => ({
  scaglioni,
  fornitori: new Map([['f1', { id: 'f1', nome: 'F', maturazione: 'fatturato', giorni_conferma: 30, giorno_bollettino: 10, giorni_incasso: 60, spese_base_provvigione: false }]]),
  clienti: new Map([['c1', { id: 'c1', nome: 'C', piva: null }]]),
  subagenti: new Map([['s1', { id: 's1', nome: 'S', attivo: true }]]),
  eccezioni: [],
  interscambio: [{ id: 'i1', subagente_id: 's1', cliente_id: 'c1', fornitore_id: 'f1', codice: 'C', sconto: dec(0), pct_subagente: null, regola_mensile: null, valido_dal: '2025-01-01', valido_al: null }],
  bollettini: [], liquidazioni_chiuse: [],
});

describe('righe della nota di credito (D-197)', () => {
  it('faseDi: la nota di credito ha la sua fase (per salvare le righe)', () => {
    expect(faseDi('nota_credito')).toBe('nota_credito');
    expect(faseDi('fattura')).toBe('fattura');
    expect(faseDi('pagamento')).toBeNull();
  });

  it('fattura al 10 % + nota sulle stesse righe al 10 % → scaglione invariato, provvigione proporzionale', () => {
    // fattura: 2 × 100 lordo, netto 180 (10 %); nota toglie una riga (lordo 100, netto 90)
    const p = pratica(
      [riga('A', 2, 100, 180)],
      [documento('fattura', 'F1', '2026-02-01', 180, [riga('A', 2, 100, 180)]),
       documento('nota_credito', 'NC1', '2026-02-10', -90, [riga('A', 1, 100, 90)], 'F1')],
    );
    expect(n(scontoMedio(p))).toBe(10); // differenza: lordo 100, netto 90 → 10 %
    expect(n(scontoMedioFase(p))).toBe(10); // la fattura da sola è già al 10 %
    expect(n(scaglione(S(), 'f1', scontoMedio(p)!, '2026-02-10')!.sconto)).toBe(10);
    const c = calcoloDocumento(S(), p, p.documenti[1]);
    expect(c.scaglione).toBe('10.00');
    expect(c.base).toBe('-90.00'); // netto −90, nessuna spesa
  });

  it('fattura mista + nota che toglie le righe allo 0 % → sconto medio della differenza sale, scaglione cambia', () => {
    // fattura: riga al 10 % (lordo 100, netto 90) + riga allo 0 % (lordo 900, netto 900) → 1 %
    const p = pratica(
      [riga('A', 1, 100, 90), riga('B', 1, 900, 900)],
      [documento('fattura', 'F1', '2026-02-01', 990, [riga('A', 1, 100, 90), riga('B', 1, 900, 900)]),
       documento('nota_credito', 'NC1', '2026-02-10', -900, [riga('B', 1, 900, 900)], 'F1')],
    );
    expect(n(scontoMedioFase(p))).toBe(1); // prima della nota: 1 %
    expect(n(scontoMedio(p))).toBe(10); // differenza: solo la riga al 10 % resta
    const prima = scaglione(S(), 'f1', scontoMedioFase(p)!, '2026-02-01')!;
    const dopo = scaglione(S(), 'f1', scontoMedio(p)!, '2026-02-10')!;
    expect(n(prima.sconto)).toBe(5); // 1 % → scaglione 5
    expect(n(dopo.sconto)).toBe(10); // 10 % → scaglione 10
    expect(calcoloDocumento(S(), p, p.documenti[1]).scaglione).toBe('10.00');
  });

  it('differenza oltre l\'ultimo scaglione → anomalia', () => {
    // fattura allo 0 % (lordo 100, netto 100) e riga al 10 % (lordo 10, netto 9): sconto medio 0,9 %;
    // la nota toglie la riga allo 0 % → differenza 10 %, oltre l'ultimo scaglione 5
    const p = pratica(
      [riga('A', 1, 100, 100), riga('B', 1, 10, 9)],
      [documento('fattura', 'F1', '2026-02-01', 109, [riga('A', 1, 100, 100), riga('B', 1, 10, 9)]),
       documento('nota_credito', 'NC1', '2026-02-10', -100, [riga('A', 1, 100, 100)], 'F1')],
    );
    const a = anomaliaScontoMedio({ scaglioni: [sc(0, 20, 12), sc(5, 15, 8)] } as any, p)!;
    expect(n(a.sconto_medio)).toBe(10);
    expect(n(a.ultimo_scaglione)).toBe(5);
  });

  it('fattura congelata + nota → la fattura resta con lo scaglione fissato, la nota porta la differenza', () => {
    // fattura congelata allo scaglione 5; la nota (righe allo 0 %) porta lo sconto medio al 10 %
    const p = pratica(
      [riga('A', 1, 100, 90), riga('B', 1, 900, 900)],
      [documento('fattura', 'F1', '2026-02-01', 990, [riga('A', 1, 100, 90), riga('B', 1, 900, 900)]),
       documento('nota_credito', 'NC1', '2026-02-10', -900, [riga('B', 1, 900, 900)], 'F1')],
    );
    // la fattura è congelata con i suoi valori (scaglione 5, come prima della nota)
    p.documenti[0].calcolo = { base: '990.00', spese: '0.00', netto: '990.00', sconto_medio: '1.00', scaglione: '5.00', pct_agente: '15.00', pct_subagente: '8.00', provvigione_agente: '148.50', provvigione_subagente: '79.20', regola: 'spese-base-v1' };
    p.documenti[0].congelato_il = '2026-02-28';
    // la nota aperta si calcola sullo sconto medio della differenza (scaglione 10)
    const c = calcoloDocumento(S(), p, p.documenti[1]);
    expect(c.scaglione).toBe('10.00'); // la nota porta lo scaglione nuovo
    expect(p.documenti[0].calcolo.scaglione).toBe('5.00'); // la fattura resta invariata
  });

  it('fattura congelata al 10 % + nota che porta la differenza al 5 % → la nota porta la differenza esatta (D-197)', () => {
    // fattura: riga al 5 % (lordo 100, netto 95) + riga al 15 % (lordo 100, netto 85) → sconto medio 10 % (scaglione 10)
    // la nota toglie la riga al 15 % → differenza: sola riga al 5 % → scaglione 5
    const p = pratica(
      [riga('A', 1, 100, 95), riga('B', 1, 100, 85)],
      [documento('fattura', 'F1', '2026-02-01', 180, [riga('A', 1, 100, 95), riga('B', 1, 100, 85)]),
       documento('nota_credito', 'NC1', '2026-02-10', -85, [riga('B', 1, 100, 85)], 'F1')],
    );
    // fattura congelata allo scaglione 10 (pct 7/3): base 180 → agente 12,60 · subagente 5,40
    p.documenti[0].calcolo = { base: '180.00', spese: '0.00', netto: '180.00', sconto_medio: '10.00', scaglione: '10.00', pct_agente: '7.00', pct_subagente: '3.00', provvigione_agente: '12.60', provvigione_subagente: '5.40', regola: 'spese-base-v1' };
    p.documenti[0].congelato_il = '2026-02-28';
    // coppia: base 180 − 85 = 95, scaglione 5 (pct 15/8) → agente 14,25 · subagente 7,60
    const c = calcoloDocumento(S(), p, p.documenti[1]);
    expect(c.base).toBe('-85.00');
    expect(c.scaglione).toBe('5.00');
    // la nota porta la differenza: 14,25 − 12,60 = 1,65 (agente) · 7,60 − 5,40 = 2,20 (subagente)
    expect(c.provvigione_agente).toBe('1.65');
    expect(c.provvigione_subagente).toBe('2.20');
    expect(c.differenza_nota).toEqual({ base_coppia: '95.00', agente_coppia: '14.25', subagente_coppia: '7.60', agente_fissata: '12.60', subagente_fissata: '5.40' });
    // la fattura congelata resta invariata
    expect(p.documenti[0].calcolo.provvigione_agente).toBe('12.60');
    expect(p.documenti[0].calcolo.provvigione_subagente).toBe('5.40');
    // somma fattura + nota = provvigione della coppia ricalcolata
    expect(n(r2(new Dec(c.provvigione_agente!).plus(new Dec('12.60'))))).toBe(14.25);
    expect(n(r2(new Dec(c.provvigione_subagente!).plus(new Dec('5.40'))))).toBe(7.6);
  });

  it('liquidazione chiusa invariata: la nota con la differenza va nel trimestre aperto, la fattura resta nel chiuso (D-197, D-11)', () => {
    // fattura congelata (scaglione 10) liquidata in Q1; la nota arriva in Q2 e porta la differenza
    const p = pratica(
      [riga('A', 1, 100, 95), riga('B', 1, 100, 85)],
      [documento('fattura', 'F1', '2026-02-01', 180, [riga('A', 1, 100, 95), riga('B', 1, 100, 85)]),
       documento('nota_credito', 'NC1', '2026-04-10', -85, [riga('B', 1, 100, 85)], 'F1')],
    );
    p.documenti[0].calcolo = { base: '180.00', spese: '0.00', netto: '180.00', sconto_medio: '10.00', scaglione: '10.00', pct_agente: '7.00', pct_subagente: '3.00', provvigione_agente: '12.60', provvigione_subagente: '5.40', regola: 'spese-base-v1' };
    p.documenti[0].congelato_il = '2026-02-28';
    p.documenti[0].liquidazione_id = 'L1'; // la fattura è già liquidata in Q1 (chiuso)
    const S0 = S();
    S0.pratiche = [p];
    S0.liquidazioni_chiuse = [{ id: 'L1', anno: 2026, trimestre: 1, chiusa_il: '2026-03-31' }];
    S0.fotografie = new Map([['F1', { subagente_id: 's1', provvigione: dec(5.4), pct: dec(3), importo: dec(180) }]]);
    // Q2: la nota con la differenza, la fattura resta nel trimestre chiuso
    const righe = righeLiquidazione(S0, 2026, 2);
    const nc = righe.find((x: any) => x.tipo === 'nota_credito')!;
    expect(nc).toBeTruthy();
    expect(n(nc.provvigione)).toBe(2.2); // la differenza del subagente
    expect(righe.some((x: any) => x.tipo === 'fattura')).toBe(false); // la fattura non riappare nel chiuso
  });

  it('nota senza righe → riserva: resta lo sconto medio della fattura', () => {
    const p = pratica(
      [riga('A', 1, 100, 90)],
      [documento('fattura', 'F1', '2026-02-01', 90, [riga('A', 1, 100, 90)]),
       documento('nota_credito', 'NC1', '2026-02-10', -45, [], 'F1')],
    );
    expect(n(scontoMedio(p))).toBe(10); // nessuna riga della nota da sottrarre
    expect(n(scaglione(S(), 'f1', scontoMedio(p)!, '2026-02-10')!.sconto)).toBe(10);
  });

  it('storno totale → la base della differenza va a zero (provvigione 0)', () => {
    const p = pratica(
      [riga('A', 1, 100, 90)],
      [documento('fattura', 'F1', '2026-02-01', 90, [riga('A', 1, 100, 90)]),
       documento('nota_credito', 'NC1', '2026-02-10', -90, [riga('A', 1, 100, 90)], 'F1')],
    );
    expect(scontoMedio(p)).toBeNull(); // lordo differenza 0: niente anomalia
    const c0 = calcoloDocumento(S(), p, p.documenti[0]);
    const c1 = calcoloDocumento(S(), p, p.documenti[1]);
    p.documenti[0].calcolo = c0; p.documenti[1].calcolo = c1;
    expect(n(basePratica(p))).toBe(0); // 90 − 90 = 0
  });

  it('le spese della nota riducono quelle della fattura: base della nota = netto + spese', () => {
    // fattura: merce lordo 1000 netto 900 + spesa 50; nota: toglie la spesa (50) → base nota = −50 + 50 = 0
    const p = pratica(
      [riga('A', 1, 1000, 900), riga('Fracht', 1, 0, 50, true)],
      [documento('fattura', 'F1', '2026-02-01', 950, [riga('A', 1, 1000, 900), riga('Fracht', 1, 0, 50, true)]),
       documento('nota_credito', 'NC1', '2026-02-10', -50, [riga('Fracht', 1, 0, 50, true)], 'F1')],
    );
    const c = calcoloDocumento(S(), p, p.documenti[1]);
    expect(c.base).toBe('0.00'); // netto −50 + spese escluse 50
    expect(c.spese).toBe('50.00');
  });
});
