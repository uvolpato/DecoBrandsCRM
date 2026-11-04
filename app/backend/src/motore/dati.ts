import { Prisma } from '@prisma/client';

// Lettore del motore (§10, F0-A5): carica dal database quello che serve ai calcoli e lo mette nella
// forma dei dati del prototipo (M.S), così le funzioni di motore.ts restano quelle di motore.js.
// Importi sempre Prisma.Decimal, date come 'aaaa-mm-gg', id come stringhe.
// ponytail: caricaDati carica tutto (bollettini, liquidazioni, analisi); il dettaglio della pratica usa
// caricaDatiPratica, quello del bollettino caricaDatiBollettino. Filtrare per periodo o fornitore anche gli altri quando i dati cresceranno.

type Db = Prisma.TransactionClient;
const Dec = Prisma.Decimal;
const ZERO = new Dec(0);
const id = (x: bigint) => String(x);
/** Giorno 'aaaa-mm-gg' di una colonna DATE (mezzanotte UTC). */
export const iso = (d: Date) => d.toISOString().slice(0, 10);
/** Giorno a Roma di un TIMESTAMPTZ. */
export const giornoRoma = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });

/** Testata con righe e documenti: quello che serve al motore per una pratica. */
export const CON_PRATICA = {
  righe: { orderBy: { numero_riga: 'asc' } },
  documenti: { orderBy: { id: 'asc' }, include: { correzione: true, arrivo: { select: { file_nome: true } } } },
} satisfies Prisma.ordini_fornitore_testataInclude;
export type Testata = Prisma.ordini_fornitore_testataGetPayload<{ include: typeof CON_PRATICA }>;

const riga = (r: Testata['righe'][number]) => {
  const qta = r.quantita ?? ZERO, prezzo = r.prezzo_unitario ?? ZERO;
  return { codice: r.codice, descrizione: r.descrizione, qta, prezzo, importo: r.importo ?? qta.times(prezzo).toDecimalPlaces(2, Dec.ROUND_HALF_CEIL) };
};

/** Tipi di documento della pratica (D-60 §19); solo i fiscali toccano le provvigioni. */
export const TIPI_DOCUMENTO = ['ordine', 'conferma', 'proforma', 'fattura', 'nota_credito', 'pagamento', 'altro'] as const;
export type TipoDocumento = (typeof TIPI_DOCUMENTO)[number];
export const fiscale = (tipo: string) => tipo === 'fattura' || tipo === 'nota_credito';

/** Una pratica nella forma del motore (M.S.pratiche). */
export const praticaDaDb = (t: Testata) => {
  // documenti solo tracciati (D-60): ordini, conferme, proforma, pagamenti, altri; nessun effetto sulle provvigioni
  const tracciati = (tipo: TipoDocumento) => t.documenti.filter((d) => d.tipo === tipo).map((d) => ({ id: id(d.id), numero: d.numero, data: iso(d.data), importo: d.importo }));
  return {
    id: id(t.id), numero: t.numero_ordine, fornitore_id: id(t.fornitore_id), cliente_id: id(t.cliente_id), data: iso(t.data_ordine),
    ordini: tracciati('ordine'), conferme: tracciati('conferma'), proforma: tracciati('proforma'), pagamenti: tracciati('pagamento'),
    // tre fotografie delle righe (§4.2.8): più ordini e più fatture della stessa fase si sommano (confronto)
    righe: {
      ordine: t.righe.filter((r) => r.fase === 'ordine').map(riga),
      conferma: t.righe.filter((r) => r.fase === 'conferma').map(riga),
      fattura: t.righe.filter((r) => r.fase === 'fattura').map(riga),
    },
    // documenti fiscali: fatture e note di credito (§4.2.7.1), importo negativo per le note
    documenti: t.documenti.filter((d) => fiscale(d.tipo)).map((d) => ({
      id: id(d.id), tipo: d.tipo, numero: d.numero, data: iso(d.data), importo: d.importo,
      fattura_id: d.fattura_id ? id(d.fattura_id) : null, // nota di credito → fattura stornata, per id (D-34)
      liquidazione_id: d.liquidazione_id ? id(d.liquidazione_id) : null,
      // segnalazione a mano del fornitore (§5.14): vince sui bollettini se non è più vecchia
      incasso: d.fonte_incasso === 'manuale' ? { stato: d.stato_incasso, dal: iso((d.stato_incasso === 'insoluta' ? d.insoluta_dal : d.pagata_il) ?? d.data), nota: d.nota_incasso } : null,
      solleciti: d.solleciti, sollecitata_il: d.sollecitata_il ? iso(d.sollecitata_il) : null,
      correzione: d.correzione ? { tipo: d.correzione.tipo, valore: d.correzione.valore, motivo: d.correzione.motivo } : null,
    })),
  };
};

const CON_RIGHE = { righe: { orderBy: { id: 'asc' } }, attese: { orderBy: { id: 'asc' } } } satisfies Prisma.bollettini_testataInclude;
type Righe = {
  fornitori: Prisma.fornitoriGetPayload<{ include: { corrente: true } }>[];
  clienti: Prisma.clientiGetPayload<{ include: { corrente: true } }>[];
  subagenti: Prisma.subagentiGetPayload<object>[];
  scaglioni: Prisma.provvigioni_scaglioniGetPayload<object>[];
  eccezioni: Prisma.provvigioni_eccezioniGetPayload<object>[];
  interscambio: Prisma.interscambioGetPayload<object>[];
  testate: Testata[];
  bollettini: Prisma.bollettini_testataGetPayload<{ include: typeof CON_RIGHE }>[];
  liquidazioni: Prisma.liquidazioniGetPayload<object>[];
};

/** `oggi` come nel prototipo (M.oggi): le prove lo fissano al 04/09/2026. */
export async function caricaDati(db: Db, oggi = giornoRoma(new Date())) {
  const [fornitori, clienti, subagenti, scaglioni, eccezioni, interscambio, testate, bollettini, liquidazioni] = await Promise.all([
    db.fornitori.findMany({ include: { corrente: true } }),
    db.clienti.findMany({ include: { corrente: true } }),
    db.subagenti.findMany(),
    db.provvigioni_scaglioni.findMany({ orderBy: { id: 'asc' } }),
    db.provvigioni_eccezioni.findMany(),
    db.interscambio.findMany({ orderBy: { id: 'asc' } }),
    db.ordini_fornitore_testata.findMany({ orderBy: { id: 'asc' }, include: CON_PRATICA }),
    db.bollettini_testata.findMany({ orderBy: { id: 'asc' }, include: CON_RIGHE }),
    db.liquidazioni.findMany({ orderBy: [{ anno: 'asc' }, { trimestre: 'asc' }] }),
  ]);
  return componi(oggi, { fornitori, clienti, subagenti, scaglioni, eccezioni, interscambio, testate, bollettini, liquidazioni });
}

/** Solo i dati che il dettaglio di una pratica legge (D-52 §19, §7.3): la pratica, il suo cliente e
 *  fornitore, scaglioni ed eccezioni del fornitore, le agenzie cliente × fornitore con i loro subagenti,
 *  e per "una fattura al mese" (D-27) le pratiche dello stesso abbinamento con fatture negli stessi mesi
 *  (più quelle delle fatture stornate dalle sue note). I bollettini del fornitore servono allo stato
 *  d'incasso delle fatture (§5.14); le liquidazioni no. Stessa forma di caricaDati; null se la pratica non c'è. */
export async function caricaDatiPratica(db: Db, pratica: bigint, oggi = giornoRoma(new Date())) {
  const t = await db.ordini_fornitore_testata.findUnique({ where: { id: pratica }, include: CON_PRATICA });
  if (!t) return null;
  const { cliente_id, fornitore_id } = t;
  const rif = await db.ordini_fornitore_documenti.findMany({
    where: { id: { in: t.documenti.flatMap((d) => d.fattura_id ?? []) } }, select: { testata_id: true, data: true },
  });
  const mesi = [...new Set([...t.documenti.filter((d) => fiscale(d.tipo)), ...rif].map((d) => iso(d.data).slice(0, 7)))].map((m) => {
    const dal = new Date(`${m}-01`), al = new Date(dal);
    al.setUTCMonth(al.getUTCMonth() + 1);
    return { data: { gte: dal, lt: al } };
  });
  const [fornitori, clienti, subagenti, scaglioni, eccezioni, interscambio, testate, bollettini] = await Promise.all([
    db.fornitori.findMany({ where: { id: fornitore_id }, include: { corrente: true } }),
    db.clienti.findMany({ where: { id: cliente_id }, include: { corrente: true } }),
    db.subagenti.findMany({ where: { agenzie: { some: { cliente_id, fornitore_id } } } }),
    db.provvigioni_scaglioni.findMany({ where: { fornitore_id }, orderBy: { id: 'asc' } }),
    db.provvigioni_eccezioni.findMany({ where: { fornitore_id } }),
    db.interscambio.findMany({ where: { cliente_id, fornitore_id }, orderBy: { id: 'asc' } }),
    db.ordini_fornitore_testata.findMany({
      where: { OR: [
        { id: { in: [pratica, ...rif.map((r) => r.testata_id)] } },
        ...(mesi.length ? [{ cliente_id, fornitore_id, documenti: { some: { tipo: 'fattura', OR: mesi } } }] : []),
      ] },
      orderBy: { id: 'asc' }, include: CON_PRATICA,
    }),
    db.bollettini_testata.findMany({ where: { fornitore_id }, orderBy: { id: 'asc' }, include: CON_RIGHE }), // stato d'incasso (§5.14)
  ]);
  return componi(oggi, { fornitori, clienti, subagenti, scaglioni, eccezioni, interscambio, testate, bollettini, liquidazioni: [] });
}

/** Solo i dati che la riconciliazione di un bollettino legge (§7.7, come caricaDatiPratica): il bollettino con
 *  righe e attese, il fornitore con scaglioni ed eccezioni, le pratiche del fornitore con documenti del mese o
 *  toccati dalle righe (per id o per numero), i loro clienti e agenzie; sul maturato anche gli altri bollettini
 *  con righe sui documenti del mese ("pagata dopo", §5.14). Stessa forma di caricaDati; null se non c'è. */
export async function caricaDatiBollettino(db: Db, bollettino: bigint, oggi = giornoRoma(new Date())) {
  const b = await db.bollettini_testata.findUnique({ where: { id: bollettino }, include: CON_RIGHE });
  if (!b) return null;
  const { fornitore_id } = b;
  const dal = new Date(Date.UTC(b.anno, b.mese - 1, 1)), al = new Date(Date.UTC(b.anno, b.mese, 1));
  const [fornitori, testate, scaglioni, eccezioni] = await Promise.all([
    db.fornitori.findMany({ where: { id: fornitore_id }, include: { corrente: true } }),
    db.ordini_fornitore_testata.findMany({
      where: { fornitore_id, documenti: { some: { tipo: { in: ['fattura', 'nota_credito'] }, OR: [
        { data: { gte: dal, lt: al } },
        { id: { in: b.righe.flatMap((r) => r.documento_id ?? []) } },
        { numero: { in: b.righe.filter((r) => !r.documento_id).map((r) => r.fattura_numero) } },
      ] } } },
      orderBy: { id: 'asc' }, include: CON_PRATICA,
    }),
    db.provvigioni_scaglioni.findMany({ where: { fornitore_id }, orderBy: { id: 'asc' } }),
    db.provvigioni_eccezioni.findMany({ where: { fornitore_id } }),
  ]);
  const clienti = [...new Set(testate.map((t) => t.cliente_id))];
  const delMese = testate.flatMap((t) => t.documenti).filter((d) => fiscale(d.tipo) && d.data >= dal && d.data < al);
  const [cl, interscambio, altri] = await Promise.all([
    db.clienti.findMany({ where: { id: { in: clienti } }, include: { corrente: true } }),
    db.interscambio.findMany({ where: { fornitore_id, cliente_id: { in: clienti } }, orderBy: { id: 'asc' } }),
    fornitori[0]?.tipo_provvigione === 'maturato' && delMese.length
      ? db.bollettini_testata.findMany({
        where: { fornitore_id, id: { not: b.id }, righe: { some: { OR: [
          { documento_id: { in: delMese.map((d) => d.id) } },
          { documento_id: null, fattura_numero: { in: delMese.map((d) => d.numero) } },
        ] } } },
        include: CON_RIGHE,
      })
      : [],
  ]);
  const bollettini = [b, ...altri].sort((x, y) => (x.id < y.id ? -1 : 1));
  return componi(oggi, { fornitori, clienti: cl, subagenti: [], scaglioni, eccezioni, interscambio, testate, bollettini, liquidazioni: [] });
}

/** Decisione di una riga o di un'attesa (D-49, D-56); il giorno come le altre date del motore (Roma). */
const decisione = (r: { decisione: string | null; decisione_motivo: string | null; deciso_da: bigint | null; deciso_il: Date | null }) =>
  r.decisione ? { esito: r.decisione, motivo: r.decisione_motivo, da: r.deciso_da ? id(r.deciso_da) : null, il: r.deciso_il ? giornoRoma(r.deciso_il) : null } : null;

/** Dalle righe del database alla forma del motore: una sola copia delle conversioni. */
function componi(oggi: string, { fornitori, clienti, subagenti, scaglioni, eccezioni, interscambio, testate, bollettini, liquidazioni }: Righe) {
  return {
    oggi,
    fornitori: new Map(fornitori.map((f) => [id(f.id), {
      id: id(f.id), nome: f.corrente?.ragione_sociale ?? '', maturazione: f.tipo_provvigione,
      giorni_conferma: f.giorni_attesa_conferma, giorno_bollettino: f.giorno_bollettino, giorni_incasso: f.giorni_incasso,
    }])),
    clienti: new Map(clienti.map((c) => [id(c.id), { id: id(c.id), piva: c.corrente?.piva ?? null, nome: c.corrente?.ragione_sociale ?? '' }])),
    subagenti: new Map(subagenti.map((s) => [id(s.id), { id: id(s.id), nome: `${s.nome} ${s.cognome}`, attivo: s.attivo }])),
    scaglioni: scaglioni.map((s) => ({
      id: id(s.id), fornitore_id: id(s.fornitore_id), sconto: s.sconto_min, pct_agente: s.pct_agente, pct_sub: s.pct_subagente, valido_dal: iso(s.valido_dal),
    })),
    eccezioni: eccezioni.map((e) => ({ // D-51 §19: per fornitore × sconto, con periodo (valido_al escluso)
      fornitore_id: id(e.fornitore_id), subagente_id: id(e.subagente_id), sconto: e.sconto_min, pct: e.pct_personale,
      valido_dal: iso(e.valido_dal), valido_al: e.valido_al ? iso(e.valido_al) : null,
    })),
    interscambio: interscambio.map((a) => ({
      id: id(a.id), subagente_id: id(a.subagente_id), cliente_id: id(a.cliente_id), fornitore_id: id(a.fornitore_id),
      codice: a.codice_cliente_fornitore, sconto: a.sconto, pct_subagente: a.pct_subagente, regola_mensile: a.regola_mensile,
      valido_dal: iso(a.valido_dal), valido_al: a.valido_al ? iso(a.valido_al) : null,
    })),
    pratiche: testate.map(praticaDaDb),
    bollettini: bollettini.map((b) => ({
      id: id(b.id), fornitore_id: id(b.fornitore_id), anno: b.anno, mese: b.mese, stato: b.stato,
      ricevuto: giornoRoma(b.creato_il), chiuso_il: b.chiuso_il ? giornoRoma(b.chiuso_il) : null,
      righe: b.righe.map((r) => ({
        id: id(r.id), documento_id: r.documento_id ? id(r.documento_id) : null, liquidazione_id: r.liquidazione_id ? id(r.liquidazione_id) : null, // D-34, D-11
        numero: r.fattura_numero, data: r.fattura_data ? iso(r.fattura_data) : null, imponibile: r.importo_merce, pct: r.pct_riconosciuta, importo: r.importo_riconosciuto,
        tipo: r.tipo_riga === 'provvigione' ? null : r.tipo_riga, // storno | riaccredito (§5.14)
        pct_calcolata: r.pct_calcolata, importo_calcolato: r.importo_calcolato, // congelati alla verifica (§5.11)
        decisione: decisione(r), // riga che non quadra (D-49)
      })),
      // decisioni sui documenti che mancano nel bollettino (D-56): nostre, non righe del fornitore
      attese: b.attese.map((a) => ({ documento_id: id(a.documento_id), decisione: decisione(a)! })),
    })),
    liquidazioni_chiuse: liquidazioni.map((l) => ({ id: id(l.id), anno: l.anno, trimestre: l.trimestre, chiusa_il: giornoRoma(l.chiusa_il) })),
  };
}

/** Ultima chiusura del fornitore (D-51 §19), 'aaaa-mm-gg' o null: la più recente fra la fine del mese
 *  dell'ultimo bollettino chiuso (verificato o contestato) del fornitore e la fine dell'ultimo trimestre liquidato (le
 *  liquidazioni valgono per tutti i fornitori). Fino a questa data i soldi sono chiusi e non cambiano. */
export async function ultimaChiusura(db: Db, fornitore_id: bigint): Promise<string | null> {
  const [r] = await db.$queryRaw<{ d: string | null }[]>`
    SELECT to_char(greatest(
      (SELECT max(make_date(anno, mese, 1)) FROM bollettini_testata WHERE fornitore_id = ${fornitore_id} AND chiuso_il IS NOT NULL),
      (SELECT max(make_date(anno, trimestre * 3, 1)) FROM liquidazioni)
    ) + interval '1 month' - interval '1 day', 'YYYY-MM-DD') AS d`;
  return r.d;
}

export type Dati = Awaited<ReturnType<typeof caricaDati>>;
