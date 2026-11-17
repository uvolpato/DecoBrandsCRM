// Prove del pacchetto `sconto-medio` (D-182 §19): lo scaglione della provvigione si sceglie dallo
// sconto medio letto sui documenti (1 − netto/lordo), non più dallo sconto dell'agenzia. Funzioni pure
// del motore su dati costruiti: niente database. V12/V13: il motore è puro, il blocco è in bloccoChiusura.
import { Prisma } from '@prisma/client';
import { anomaliaScontoMedio, percentuali, primaSoglia, r2, scaglione, scontoMedio } from '../src/motore/motore';
import { bloccoChiusura } from '../src/liquidazioni';

/* eslint-disable @typescript-eslint/no-explicit-any */
const Dec = Prisma.Decimal;
const dec = (x: number) => new Dec(x);
const n = (x: Prisma.Decimal | null | undefined) => (x == null ? null : x.toNumber());

/** Un riga del motore: importo = netto (già scontato), qta × prezzo = lordo. */
const riga = (codice: string, qta: number, prezzo: number, importo?: number) =>
  ({ codice, descrizione: codice, qta: dec(qta), prezzo: dec(prezzo), importo: importo != null ? dec(importo) : r2(qta * prezzo) });

/** Una pratica minima con le righe delle tre fasi e i documenti fiscali dati. */
const pratica = (o: { righe?: { ordine?: any[]; conferma?: any[]; fattura?: any[] }; documenti?: any[]; fornitore_id?: string; cliente_id?: string; data?: string; numero?: string } = {}) => ({
  id: 'p1', numero: o.numero ?? 'OF/2026/999', fornitore_id: o.fornitore_id ?? 'f1', cliente_id: o.cliente_id ?? 'c1', data: o.data ?? '2026-01-01',
  raggruppamento: null, ordini: [], conferme: [], proforma: [], pagamenti: [],
  righe: { ordine: o.righe?.ordine ?? [], conferma: o.righe?.conferma ?? [], fattura: o.righe?.fattura ?? [] },
  documenti: o.documenti ?? [],
});

const documento = (tipo: string, numero: string, data: string, importo: number): any =>
  ({ id: `${numero}`, tipo, numero, data, importo: dec(importo), fattura_id: null, liquidazione_id: null, incasso: null, solleciti: 0, sollecitata_il: null, correzione: null });

/** Scaglioni 0 e 5 del fornitore f1 (i casi della regola), più una versione datata. */
const sc = (fornitore_id: string, sconto: number, pct_agente: number, pct_sub: number, valido_dal = '2025-01-01') =>
  ({ id: `s-${fornitore_id}-${sconto}`, fornitore_id, sconto: dec(sconto), pct_agente: dec(pct_agente), pct_sub: dec(pct_sub), valido_dal });
const SOGLIE_05 = [sc('f1', 0, 20, 12), sc('f1', 5, 15, 8)];

describe('sconto medio sui documenti (D-182)', () => {
  it('media pesata sul lordo: riga al 10 % e riga allo 0 % → 3,33 %', () => {
    const p = pratica({ righe: { fattura: [riga('A', 1, 100, 90), riga('B', 1, 200, 200)] } });
    expect(n(scontoMedio(p))).toBe(3.33);
  });

  it('righe senza quantità o prezzo fuori dal calcolo; senza righe utili → null (riserva)', () => {
    expect(scontoMedio(pratica({ righe: { fattura: [riga('A', 0, 100, 0), riga('B', 1, 0, 0)] } }))).toBeNull();
    expect(scontoMedio(pratica())).toBeNull();
  });

  it('ordine 0 %, fattura 10 % → comanda la fattura (10 %)', () => {
    const p = pratica({ righe: { ordine: [riga('A', 1, 100)], fattura: [riga('A', 1, 100, 90)] } });
    expect(n(scontoMedio(p))).toBe(10);
  });

  it('scaglione: l\'ultima soglia ≤ sconto medio (da soglia in su, D-202)', () => {
    expect(n(scaglione({ scaglioni: SOGLIE_05 } as any, 'f1', dec(3.5), '2026-01-01')!.sconto)).toBe(0);
    expect(n(scaglione({ scaglioni: SOGLIE_05 } as any, 'f1', dec(5), '2026-01-01')!.sconto)).toBe(5);
    expect(n(scaglione({ scaglioni: SOGLIE_05 } as any, 'f1', dec(0), '2026-01-01')!.sconto)).toBe(0);
    expect(n(scaglione({ scaglioni: SOGLIE_05 } as any, 'f1', dec(6.2), '2026-01-01')!.sconto)).toBe(5); // sopra l'ultima vale l'ultima
    expect(n(primaSoglia({ scaglioni: SOGLIE_05 } as any, 'f1', '2026-01-01')!.sconto)).toBe(0);
  });

  it('a fascia (Gasper 0/30/40): 0 → 20 %, 25 → 20 %, 30 → 15 %, 39,99 → 15 %, 40 → 10 %, 55 → 10 %', () => {
    const soglie = [sc('f1', 0, 20, 10), sc('f1', 30, 15, 8), sc('f1', 40, 10, 6)];
    const pct = (sconto: number) => n(scaglione({ scaglioni: soglie } as any, 'f1', dec(sconto), '2026-01-01')!.pct_agente);
    expect(pct(0)).toBe(20);
    expect(pct(25)).toBe(20);
    expect(pct(30)).toBe(15);
    expect(pct(39.99)).toBe(15);
    expect(pct(40)).toBe(10);
    expect(pct(55)).toBe(10);
  });

  it('tabella senza 0 (prima soglia 5): sconto 2 sotto la prima soglia → anomalia, sconto 6 → soglia 5', () => {
    const soglie = [sc('f1', 5, 15, 8)];
    expect(scaglione({ scaglioni: soglie } as any, 'f1', dec(2), '2026-01-01')).toBeNull();
    expect(n(scaglione({ scaglioni: soglie } as any, 'f1', dec(6), '2026-01-01')!.sconto)).toBe(5);
  });

  it('sconto medio sotto la prima soglia → anomalia con pratica, documento, sconto medio e prima soglia', () => {
    const p = pratica({ righe: { fattura: [riga('A', 1, 100, 98)] }, documenti: [documento('fattura', 'F1', '2026-10-15', 98)] });
    const a = anomaliaScontoMedio({ scaglioni: [sc('f1', 5, 15, 8)] } as any, p)!;
    expect(n(a.sconto_medio)).toBe(2);
    expect(n(a.prima_soglia)).toBe(5);
    expect(a.documento).toBe('F1');
    // nessuna anomalia quando lo sconto medio sta dentro (≥ prima soglia)
    expect(anomaliaScontoMedio({ scaglioni: [sc('f1', 5, 15, 8)] } as any, pratica({ righe: { fattura: [riga('A', 1, 100, 94)] } }))).toBeNull();
  });

  it('documento senza righe → riserva sullo sconto dell\'agenzia (percentuali)', () => {
    const S = {
      scaglioni: SOGLIE_05,
      interscambio: [{ id: 'i1', subagente_id: 's1', cliente_id: 'c1', fornitore_id: 'f1', codice: 'C', sconto: dec(5), pct_subagente: null, regola_mensile: null, valido_dal: '2025-01-01', valido_al: null }],
      eccezioni: [],
    } as any;
    const p = pratica(); // nessuna riga
    const perc = percentuali(S, p, p.data)!;
    expect(perc).not.toBeNull();
    expect(n(perc.sconto)).toBe(5); // riserva: sconto dell'agenzia
    expect(perc.sconto_medio).toBeNull();
    expect(n(perc.scaglione.sconto)).toBe(5);
  });

  it('la fattura comanda: sconto medio 10 % → scaglione 10 anche se l\'ordine è allo 0 %', () => {
    const S = {
      scaglioni: [...SOGLIE_05, sc('f1', 10, 7, 3)],
      interscambio: [{ id: 'i1', subagente_id: 's1', cliente_id: 'c1', fornitore_id: 'f1', codice: 'C', sconto: dec(0), pct_subagente: null, regola_mensile: null, valido_dal: '2025-01-01', valido_al: null }],
      eccezioni: [],
    } as any;
    const p = pratica({ righe: { ordine: [riga('A', 1, 100)], fattura: [riga('A', 1, 100, 90)] } });
    const perc = percentuali(S, p, '2026-02-01')!;
    expect(n(perc.sconto_medio)).toBe(10);
    expect(n(perc.scaglione.sconto)).toBe(10);
  });

  it('nota di credito sulla stessa riga al 10 %: lo scaglione resta quello della fattura (invariato)', () => {
    const S = {
      scaglioni: [...SOGLIE_05, sc('f1', 10, 7, 3)],
      interscambio: [{ id: 'i1', subagente_id: 's1', cliente_id: 'c1', fornitore_id: 'f1', codice: 'C', sconto: dec(0), pct_subagente: null, regola_mensile: null, valido_dal: '2025-01-01', valido_al: null }],
      eccezioni: [],
    } as any;
    // la nota credito non ha righe nel motore: segue lo sconto medio della fattura (10 %) → scaglione 10 invariato
    const p = pratica({ righe: { fattura: [riga('A', 1, 100, 90)] }, documenti: [documento('fattura', 'F1', '2026-02-01', 90), documento('nota_credito', 'NC1', '2026-02-10', -45)] });
    expect(n(scontoMedio(p))).toBe(10);
    expect(n(percentuali(S, p, '2026-02-10')!.scaglione.sconto)).toBe(10);
  });

  it('chiusura rifiutata quando una pratica ha lo sconto medio sotto la prima soglia (bloccoChiusura)', () => {
    const soglie = [sc('f1', 5, 15, 8)]; // prima soglia 5, niente 0
    const S = {
      scaglioni: soglie, pratiche: [pratica({ righe: { fattura: [riga('A', 1, 100, 98)] }, documenti: [documento('fattura', 'F1', '2026-10-15', 98)] })],
      liquidazioni_chiuse: [], fornitori: new Map(), clienti: new Map(), subagenti: new Map(), eccezioni: [], interscambio: [], bollettini: [],
    } as any;
    expect(bloccoChiusura(S, { chiave: 'da_liquidare' }, [] as any, 2026, 4)).toMatch(/sconto medio sotto la prima soglia/);
    // senza anomalia la chiusura non blocca per questo motivo
    const ok = { ...S, pratiche: [pratica({ righe: { fattura: [riga('A', 1, 100, 94)] }, documenti: [documento('fattura', 'F1', '2026-10-15', 94)] })] };
    expect(bloccoChiusura(ok, { chiave: 'da_liquidare' }, [] as any, 2026, 4)).toBeNull();
  });
});
