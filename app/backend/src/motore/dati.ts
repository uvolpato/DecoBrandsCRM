import { Prisma } from '@prisma/client';

// Lettore del motore (§10, F0-A5): carica dal database quello che serve ai calcoli e lo mette nella
// forma dei dati del prototipo (M.S), così le funzioni di motore.ts restano quelle di motore.js.
// Importi sempre Prisma.Decimal, date come 'aaaa-mm-gg', id come stringhe.
// ponytail: carica tutto; filtrare per periodo o fornitore quando i dati cresceranno.

type Db = Prisma.TransactionClient;
const Dec = Prisma.Decimal;
const ZERO = new Dec(0);
const id = (x: bigint) => String(x);
const giorno = (d: Date) => d.toISOString().slice(0, 10); // colonne DATE: mezzanotte UTC
/** Giorno a Roma di un TIMESTAMPTZ. */
export const giornoRoma = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });

/** `oggi` come nel prototipo (M.oggi): le prove lo fissano al 04/09/2026. */
export async function caricaDati(db: Db, oggi = giornoRoma(new Date())) {
  const [fornitori, clienti, subagenti, scaglioni, eccezioni, interscambio, testate, bollettini, liquidazioni] = await Promise.all([
    db.fornitori.findMany({ include: { corrente: true } }),
    db.clienti.findMany({ include: { corrente: true } }),
    db.subagenti.findMany(),
    db.provvigioni_scaglioni.findMany({ orderBy: { id: 'asc' } }),
    db.provvigioni_eccezioni.findMany(),
    db.interscambio.findMany({ orderBy: { id: 'asc' } }),
    db.ordini_fornitore_testata.findMany({
      orderBy: { id: 'asc' },
      include: { righe: { orderBy: { numero_riga: 'asc' } }, documenti: { orderBy: { id: 'asc' }, include: { correzione: true } } },
    }),
    db.bollettini_testata.findMany({ orderBy: { id: 'asc' }, include: { righe: { orderBy: { id: 'asc' } } } }),
    db.liquidazioni.findMany({ orderBy: [{ anno: 'asc' }, { trimestre: 'asc' }] }),
  ]);

  const riga = (r: (typeof testate)[number]['righe'][number]) => {
    const qta = r.quantita ?? ZERO, prezzo = r.prezzo_unitario ?? ZERO;
    return { codice: r.codice, descrizione: r.descrizione, qta, prezzo, importo: r.importo ?? qta.times(prezzo).toDecimalPlaces(2, Dec.ROUND_HALF_CEIL) };
  };
  return {
    oggi,
    fornitori: new Map(fornitori.map((f) => [id(f.id), {
      id: id(f.id), nome: f.corrente?.ragione_sociale ?? '', maturazione: f.tipo_provvigione,
      giorni_conferma: f.giorni_attesa_conferma, giorno_bollettino: f.giorno_bollettino, giorni_incasso: f.giorni_incasso,
    }])),
    clienti: new Map(clienti.map((c) => [id(c.id), { id: id(c.id), piva: c.corrente?.piva ?? null, nome: c.corrente?.ragione_sociale ?? '' }])),
    subagenti: new Map(subagenti.map((s) => [id(s.id), { id: id(s.id), nome: `${s.nome} ${s.cognome}`, attivo: s.attivo }])),
    scaglioni: scaglioni.map((s) => ({
      id: id(s.id), fornitore_id: id(s.fornitore_id), sconto: s.sconto_min, pct_agente: s.pct_agente, pct_sub: s.pct_subagente, valido_dal: giorno(s.valido_dal),
    })),
    eccezioni: eccezioni.map((e) => ({ scaglione_id: id(e.scaglione_id), subagente_id: id(e.subagente_id), pct: e.pct_personale })),
    interscambio: interscambio.map((a) => ({
      id: id(a.id), subagente_id: id(a.subagente_id), cliente_id: id(a.cliente_id), fornitore_id: id(a.fornitore_id),
      codice: a.codice_cliente_fornitore, sconto: a.sconto, pct_subagente: a.pct_subagente, regola_mensile: a.regola_mensile,
      valido_dal: giorno(a.valido_dal), valido_al: a.valido_al ? giorno(a.valido_al) : null,
    })),
    pratiche: testate.map((t) => ({
      id: id(t.id), numero: t.numero_ordine, fornitore_id: id(t.fornitore_id), cliente_id: id(t.cliente_id), data: giorno(t.data_ordine),
      conferma: t.conferma_data ? { numero: t.conferma_numero, data: giorno(t.conferma_data) } : null,
      // tre fotografie delle righe (§4.2.8): le tranche di fattura stanno tutte nella fase 'fattura'
      righe: {
        ordine: t.righe.filter((r) => r.fase === 'ordine').map(riga),
        conferma: t.righe.filter((r) => r.fase === 'conferma').map(riga),
        fattura: t.righe.filter((r) => r.fase === 'fattura').map(riga),
      },
      // documenti fiscali: fatture e note di credito (§4.2.7.1), importo negativo per le note
      documenti: t.documenti.map((d) => ({
        id: id(d.id), tipo: d.tipo, numero: d.numero, data: giorno(d.data), importo: d.importo,
        fattura_id: d.fattura_id ? id(d.fattura_id) : null, // nota di credito → fattura stornata, per id (D-34)
        liquidazione_id: d.liquidazione_id ? id(d.liquidazione_id) : null,
        // segnalazione a mano del fornitore (§5.14): vince sui bollettini se non è più vecchia
        incasso: d.fonte_incasso === 'manuale' ? { stato: d.stato_incasso, dal: giorno((d.stato_incasso === 'insoluta' ? d.insoluta_dal : d.pagata_il) ?? d.data) } : null,
        solleciti: d.solleciti, sollecitata_il: d.sollecitata_il ? giorno(d.sollecitata_il) : null,
        correzione: d.correzione ? { tipo: d.correzione.tipo, valore: d.correzione.valore, motivo: d.correzione.motivo } : null,
      })),
    })),
    bollettini: bollettini.map((b) => ({
      id: id(b.id), fornitore_id: id(b.fornitore_id), anno: b.anno, mese: b.mese, stato: b.stato,
      ricevuto: giornoRoma(b.creato_il), chiuso_il: b.chiuso_il ? giornoRoma(b.chiuso_il) : null,
      righe: b.righe.map((r) => ({
        id: id(r.id), documento_id: r.documento_id ? id(r.documento_id) : null, liquidazione_id: r.liquidazione_id ? id(r.liquidazione_id) : null, // D-34, D-11
        numero: r.fattura_numero, data: r.fattura_data ? giorno(r.fattura_data) : null, imponibile: r.importo_merce, pct: r.pct_riconosciuta, importo: r.importo_riconosciuto,
        tipo: r.tipo_riga === 'provvigione' ? null : r.tipo_riga, // storno | riaccredito (§5.14)
        pct_calcolata: r.pct_calcolata, importo_calcolato: r.importo_calcolato, // congelati alla verifica (§5.11)
      })),
    })),
    liquidazioni_chiuse: liquidazioni.map((l) => ({ id: id(l.id), anno: l.anno, trimestre: l.trimestre, chiusa_il: giornoRoma(l.chiusa_il) })),
  };
}

export type Dati = Awaited<ReturnType<typeof caricaDati>>;
