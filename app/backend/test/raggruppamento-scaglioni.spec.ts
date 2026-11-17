// Prove del pacchetto `raggruppamento-scaglioni` (D-199 §19): lo scaglione si può scegliere dallo sconto
// medio del documento (oggi) o, per i fornitori che applicano la percentuale riga per riga, dal gruppo di
// righe con lo stesso sconto. Funzioni pure del motore su dati costruiti: niente database.
import { Prisma } from '@prisma/client';
import { anomaliaProvvigione, anomaliaScontoMedio, calcoloDocumento, fattiAnalisi, provvigioneDoc, quotaSub, raggruppamentoDi, r2, riconcilia, righeLiquidazione, scontoMedio } from '../src/motore/motore';

/* eslint-disable @typescript-eslint/no-explicit-any */
const Dec = Prisma.Decimal;
const dec = (x: number) => new Dec(x);
const n = (x: Prisma.Decimal | null | undefined) => (x == null ? null : x.toNumber());

/** Una riga del motore: importo = netto (già scontato), qta × prezzo = lordo. */
const riga = (codice: string, qta: number, prezzo: number, importo?: number, spesa = false) =>
  ({ codice, descrizione: codice, qta: dec(qta), prezzo: dec(prezzo), importo: importo != null ? dec(importo) : r2(qta * prezzo), spesa });

/** Un documento fiscale con le sue righe (per la nota: importo negativo, righe positive). */
const documento = (tipo: string, numero: string, data: string, importo: number, righe: any[] = [], fattura_id: string | null = null): any =>
  ({ id: numero, tipo, numero, data, importo: dec(importo), fattura_id, liquidazione_id: null, incasso: null, solleciti: 0, sollecitata_il: null, correzione: null, calcolo: null, congelato_il: null, righe });

const pratica = (o: { raggruppamento?: string | null; righe?: { fattura?: any[] }; documenti?: any[] } = {}): any => ({
  id: 'p1', numero: 'OF/2026/999', fornitore_id: 'f1', cliente_id: 'c1', data: '2026-01-01',
  raggruppamento: o.raggruppamento ?? null, ordini: [], conferme: [], proforma: [], pagamenti: [],
  righe: { ordine: [], conferma: [], fattura: o.righe?.fattura ?? [] },
  documenti: o.documenti ?? [],
});

const sc = (sconto: number, pct_agente: number, pct_sub: number) =>
  ({ id: `s-${sconto}`, fornitore_id: 'f1', sconto: dec(sconto), pct_agente: dec(pct_agente), pct_sub: dec(pct_sub), valido_dal: '2025-01-01' });

/** Scaglioni della regola (da soglia in su, D-202): 0 → 15/8, 10 → 10/5. */
const SCAGLIONI = [sc(0, 15, 8), sc(10, 10, 5)];

/** Dati minimi con il fornitore f1; `raggruppamento` decide documento | riga. */
const S = (raggruppamento: string): any => ({
  scaglioni: SCAGLIONI,
  fornitori: new Map([['f1', { id: 'f1', nome: 'F', maturazione: 'fatturato', giorni_conferma: 30, giorno_bollettino: 10, giorni_incasso: 60, spese_base_provvigione: false, raggruppamento }]]),
  clienti: new Map([['c1', { id: 'c1', nome: 'C', piva: null }]]),
  subagenti: new Map([['s1', { id: 's1', nome: 'S', attivo: true }]]),
  eccezioni: [],
  interscambio: [{ id: 'i1', subagente_id: 's1', cliente_id: 'c1', fornitore_id: 'f1', codice: 'C', sconto: dec(0), pct_subagente: null, regola_mensile: null, valido_dal: '2025-01-01', valido_al: null }],
  bollettini: [], liquidazioni_chiuse: [], pratiche: [], fotografie: new Map(),
});

/** Fattura con due righe: sconto 5 % (merce 600) e 20 % (merce 400). */
const fatturaMista = () => ({
  righe: { fattura: [riga('A', 1, 631.58, 600), riga('B', 1, 500, 400)] },
  documenti: [documento('fattura', 'F1', '2026-10-15', 1000, [riga('A', 1, 631.58, 600), riga('B', 1, 500, 400)])],
});

describe('raggruppamento per lo scaglione (D-199)', () => {
  it('precedenza: la deroga della pratica vince sul fornitore, null = eredita', () => {
    expect(raggruppamentoDi(S('documento'), pratica({ raggruppamento: 'riga' }))).toEqual({ raggruppamento: 'riga', da: 'pratica' });
    expect(raggruppamentoDi(S('documento'), pratica({ raggruppamento: null }))).toEqual({ raggruppamento: 'documento', da: 'fornitore' });
    expect(raggruppamentoDi(S('riga'), pratica({ raggruppamento: null }))).toEqual({ raggruppamento: 'riga', da: 'fornitore' });
    expect(raggruppamentoDi(S('riga'), pratica({ raggruppamento: 'documento' }))).toEqual({ raggruppamento: 'documento', da: 'pratica' });
  });

  it('fornitore riga: due gruppi per sconto, provvigione = somma (agente 130, subagente 68)', () => {
    const p = pratica(fatturaMista());
    const c = calcoloDocumento(S('riga'), p, p.documenti[0]);
    expect(c.regola).toBe('riga-v1');
    expect(c.raggruppamento).toBe('riga');
    expect(c.base).toBe('1000.00');
    expect(c.gruppi).toHaveLength(2);
    // gruppo 5 % → scaglione 0 (15/8): 600 × 15 % = 90 · 600 × 8 % = 48
    expect(c.gruppi![0]).toMatchObject({ sconto: '5.00', base: '600.00', scaglione: '0.00', pct_agente: '15.00', pct_sub: '8.00', provvigione_agente: '90.00', provvigione_sub: '48.00' });
    // gruppo 20 % → scaglione 10 (10/5): 400 × 10 % = 40 · 400 × 5 % = 20
    expect(c.gruppi![1]).toMatchObject({ sconto: '20.00', base: '400.00', scaglione: '10.00', pct_agente: '10.00', pct_sub: '5.00', provvigione_agente: '40.00', provvigione_sub: '20.00' });
    expect(c.provvigione_agente).toBe('130.00');
    expect(c.provvigione_subagente).toBe('68.00');
    // percentuali effettive: provvigione ÷ base, 2 decimali
    expect(c.pct_agente).toBe('13.00');
    expect(c.pct_subagente).toBe('6.80');
    expect(c.scaglione).toBeNull(); // in modalità riga non c'è un solo scaglione
  });

  it('lo stesso documento in modalità documento: sconto medio 11,63 % → un solo scaglione (10), numero diverso', () => {
    const p = pratica(fatturaMista());
    expect(n(scontoMedio(p))).toBe(11.63);
    const c = calcoloDocumento(S('documento'), p, p.documenti[0]);
    expect(c.regola).toBe('spese-base-v1');
    expect(c.raggruppamento).toBe('documento');
    expect(c.gruppi).toBeUndefined();
    expect(c.scaglione).toBe('10.00');
    expect(c.pct_agente).toBe('10.00');
    expect(c.provvigione_agente).toBe('100.00'); // 1000 × 10 %
    expect(c.provvigione_subagente).toBe('50.00');
  });

  it('deroga riga su una pratica di fornitore documento: la pratica usa i gruppi, le altre no', () => {
    const deroga = pratica({ raggruppamento: 'riga', ...fatturaMista() });
    const c = calcoloDocumento(S('documento'), deroga, deroga.documenti[0]);
    expect(c.raggruppamento).toBe('riga');
    expect(c.raggruppamento_da).toBe('pratica');
    expect(c.gruppi).toHaveLength(2);
    expect(c.provvigione_agente).toBe('130.00');
    // senza deroga lo stesso fornitore resta in modalità documento
    const normale = pratica(fatturaMista());
    expect(calcoloDocumento(S('documento'), normale, normale.documenti[0]).gruppi).toBeUndefined();
  });

  it('riga merce senza prezzo → tutto il documento torna allo sconto medio (regola scritta)', () => {
    const p = pratica({ righe: { fattura: [riga('A', 1, 0, 600)] }, documenti: [documento('fattura', 'F1', '2026-10-15', 600, [riga('A', 1, 0, 600)])] });
    const c = calcoloDocumento(S('riga'), p, p.documenti[0]);
    expect(c.regola).toBe('riga senza prezzo: sconto medio');
    expect(c.gruppi).toBeUndefined();
    expect(c.pct_agente).toBe('15.00'); // riserva sullo sconto dell'agenzia (0) → scaglione 0 (15/8)
  });

  it('gruppo sotto la prima soglia → provvigione «da decidere» (null)', () => {
    // tabella senza 0 (prima soglia 5): una riga al 2 % è sotto la prima soglia
    const senza0 = [sc(5, 15, 8), sc(10, 10, 5)];
    const p = pratica({ righe: { fattura: [riga('A', 1, 1000, 980)] }, documenti: [documento('fattura', 'F1', '2026-10-15', 980, [riga('A', 1, 1000, 980)])] });
    const c = calcoloDocumento({ ...S('riga'), scaglioni: senza0 }, p, p.documenti[0]);
    expect(c.gruppi![0].scaglione).toBeNull();
    expect(c.gruppi![0].provvigione_agente).toBeNull();
    expect(c.provvigione_agente).toBeNull();
    expect(c.provvigione_subagente).toBeNull();
  });

  it('nota di credito con righe in modalità riga → provvigione negativa per gruppi', () => {
    // nota che storna la riga al 20 % (merce 400): base −400, gruppo al 20 % → 400 × 10 % negato = −40
    const p = pratica({ righe: { fattura: [riga('B', 1, 500, 400)] }, documenti: [documento('nota_credito', 'NC1', '2026-10-20', -400, [riga('B', 1, 500, 400)], 'F1')] });
    const c = calcoloDocumento(S('riga'), p, p.documenti[0]);
    expect(c.regola).toBe('riga-v1');
    expect(c.base).toBe('-400.00');
    expect(c.gruppi![0].sconto).toBe('20.00');
    expect(c.gruppi![0].provvigione_agente).toBe('-40.00');
    expect(c.gruppi![0].provvigione_sub).toBe('-20.00');
    expect(c.provvigione_agente).toBe('-40.00');
    expect(c.provvigione_subagente).toBe('-20.00');
    // in modalità riga è lineare: niente differenza_nota (coppia di D-197)
    expect(c.differenza_nota).toBeUndefined();
  });

  it('nota senza righe in modalità riga → riserva di oggi (sconto medio, modalità documento)', () => {
    const p = pratica({ righe: { fattura: [riga('A', 1, 631.58, 600)] }, documenti: [documento('fattura', 'F1', '2026-10-15', 600, [riga('A', 1, 631.58, 600)]), documento('nota_credito', 'NC1', '2026-10-20', -300, [], 'F1')] });
    const c = calcoloDocumento(S('riga'), p, p.documenti[1]);
    expect(c.regola).toBe('spese-base-v1'); // riserva: resta il calcolo per sconto medio
    expect(c.gruppi).toBeUndefined();
  });
});

describe('raggruppamento per lo scaglione — correzioni (documento/liquidazione/Analisi coerenti)', () => {
  it('rilievo 1: in modalità riga documento, liquidazione, Analisi e bollettino danno gli stessi numeri (130 / 68)', () => {
    const p = pratica(fatturaMista());
    const S0 = { ...S('riga'), pratiche: [p] };
    // documento
    expect(calcoloDocumento(S0, p, p.documenti[0]).provvigione_agente).toBe('130.00');
    expect(calcoloDocumento(S0, p, p.documenti[0]).provvigione_subagente).toBe('68.00');
    // quota del subagente (usa i gruppi)
    expect(n(quotaSub(S0, p, p.documenti[0])!.provvigione)).toBe(68);
    // liquidazione del subagente (4° trimestre 2026)
    const righe = righeLiquidazione(S0, 2026, 4);
    expect(n(righe.find((r) => r.numero === 'F1')!.provvigione)).toBe(68);
    // Analisi: prese dal fornitore e pagate al subagente
    const fatto = fattiAnalisi(S0).find((f) => f.numero === 'F1')!;
    expect(n(fatto.prese)).toBe(130);
    expect(n(fatto.pagate)).toBe(68);
    // riconciliazione prima della verifica: il documento atteso vale 130
    const b = { id: 'b1', fornitore_id: 'f1', anno: 2026, mese: 10, stato: 'da_verificare', ricevuto: '2026-11-01', chiuso_il: null, righe: [], attese: [] };
    const ric = riconcilia({ ...S0, bollettini: [b] }, b as any);
    expect(n(ric.atteso)).toBe(130);
  });

  it('rilievo 1: lo stesso documento in modalità documento resta ai numeri di oggi (100 / 50)', () => {
    const p = pratica(fatturaMista());
    const S0 = { ...S('documento'), pratiche: [p] };
    expect(calcoloDocumento(S0, p, p.documenti[0]).provvigione_agente).toBe('100.00');
    expect(n(quotaSub(S0, p, p.documenti[0])!.provvigione)).toBe(50);
    const fatto = fattiAnalisi(S0).find((f) => f.numero === 'F1')!;
    expect(n(fatto.prese)).toBe(100);
    expect(n(fatto.pagate)).toBe(50);
  });

  it('rilievo 1: un documento congelato usa il valore fissato in liquidazione e Analisi', () => {
    const p = pratica(fatturaMista());
    const d = p.documenti[0];
    // congela con valori diversi da quelli ricalcolati (come un cambio di percentuali dopo la chiusura)
    d.congelato_il = '2026-11-01';
    d.calcolo = { ...calcoloDocumento(S('riga'), p, d), provvigione_agente: '999.00', provvigione_subagente: '111.00', pct_agente: '99.90', pct_subagente: '11.10' } as any;
    const S0 = { ...S('riga'), pratiche: [p] };
    expect(n(provvigioneDoc(S0, p, d)!.prese)).toBe(999);
    expect(n(provvigioneDoc(S0, p, d)!.pagate)).toBe(111);
    const righe = righeLiquidazione(S0, 2026, 4);
    expect(n(righe.find((r) => r.numero === 'F1')!.provvigione)).toBe(111);
    const fatto = fattiAnalisi(S0).find((f) => f.numero === 'F1')!;
    expect(n(fatto.prese)).toBe(999);
    expect(n(fatto.pagate)).toBe(111);
  });

  it('rilievo 2: gruppo sotto la prima soglia → anomalia del gruppo, non dello sconto medio', () => {
    const senza0 = [sc(5, 15, 8), sc(10, 10, 5)]; // tabella senza 0: prima soglia 5
    const p = pratica({ righe: { fattura: [riga('A', 1, 1000, 980)] }, documenti: [documento('fattura', 'F1', '2026-10-15', 980, [riga('A', 1, 1000, 980)])] }); // sconto 2 %
    const a = anomaliaProvvigione({ ...S('riga'), scaglioni: senza0 }, p)!;
    expect(a).toMatchObject({ documento: 'F1' });
    expect('sconto_gruppo' in a).toBe(true);
    expect('sconto_medio' in a).toBe(false);
    // in modalità documento comanda lo sconto medio (la stessa riga al 2 % è sotto la prima soglia)
    const adoc = anomaliaProvvigione({ ...S('documento'), scaglioni: senza0 }, p)!;
    expect('sconto_medio' in adoc).toBe(true);
    // la funzione pura dello sconto medio resta indipendente dal raggruppamento
    expect(anomaliaScontoMedio({ ...S('riga'), scaglioni: senza0 }, p)).not.toBeNull();
  });

  it('rilievo 4: righe che non tornano col netto → ripiego allo sconto medio con regola scritta', () => {
    // la somma delle righe (600 + 400) non torna col netto del documento (990: sconto in calce)
    const p = pratica({ righe: { fattura: [riga('A', 1, 631.58, 600), riga('B', 1, 500, 400)] }, documenti: [documento('fattura', 'F1', '2026-10-15', 990, [riga('A', 1, 631.58, 600), riga('B', 1, 500, 400)])] });
    const c = calcoloDocumento(S('riga'), p, p.documenti[0]);
    expect(c.regola).toBe('righe che non tornano col netto: sconto medio');
    expect(c.gruppi).toBeUndefined();
    expect(c.provvigione_agente).toBe('99.00'); // 990 × 10 % (scaglione 10 dallo sconto medio 11,63 %)
  });

  it('rilievo 2: nota su fattura congelata in modalità riga → lineare (niente differenza D-197)', () => {
    const p = pratica({
      righe: { fattura: [riga('A', 1, 631.58, 600)] },
      documenti: [
        documento('fattura', 'F1', '2026-10-15', 600, [riga('A', 1, 631.58, 600)]),
        documento('nota_credito', 'NC1', '2026-10-20', -300, [riga('A', 1, 315.79, 300)], 'F1'),
      ],
    });
    // fattura congelata con i suoi valori (come in D-197); la nota resta lineare per gruppi
    p.documenti[0].calcolo = { base: '600.00', spese: '0.00', netto: '600.00', sconto_medio: '5.00', scaglione: '10.00', pct_agente: '15.00', pct_subagente: '8.00', provvigione_agente: '90.00', provvigione_subagente: '48.00', regola: 'spese-base-v1' };
    p.documenti[0].congelato_il = '2026-11-01';
    const S0 = { ...S('riga'), pratiche: [p] };
    const nc = p.documenti[1];
    // calcolo, quota e liquidazione coincidono: 300 × 8 % negato = −24
    expect(calcoloDocumento(S0, p, nc).provvigione_subagente).toBe('-24.00');
    expect(calcoloDocumento(S0, p, nc).differenza_nota).toBeUndefined();
    expect(n(quotaSub(S0, p, nc)!.provvigione)).toBe(-24);
    const r = righeLiquidazione(S0, 2026, 4).find((x) => x.numero === 'NC1')!;
    expect(n(r.provvigione)).toBe(-24);
  });

  it('rilievo 7: un gruppo con eccezione personale → il segno eccezione in liquidazione è vero', () => {
    const p = pratica({ righe: { fattura: [riga('A', 1, 631.58, 600)] }, documenti: [documento('fattura', 'F1', '2026-10-15', 600, [riga('A', 1, 631.58, 600)])] });
    // il gruppo al 5 % prende la soglia 0 → l'eccezione è sulla soglia 0
    const S0 = { ...S('riga'), pratiche: [p], eccezioni: [{ fornitore_id: 'f1', subagente_id: 's1', sconto: dec(0), pct: dec(9), valido_dal: '2025-01-01', valido_al: null }] };
    const r = righeLiquidazione(S0, 2026, 4).find((x) => x.numero === 'F1')!;
    expect(r.eccezione).toBe(true);
    expect(n(r.provvigione)).toBe(54); // 600 × 9 % (eccezione personale sulla soglia 0)
  });
});
