import { Prisma } from '@prisma/client';
import { costruisciIndici, scegliDocumento } from './dati';
import type { CalcoloDocumento, Dati, GruppoRiga } from './dati';

// Motore delle provvigioni (§10, F0-A5): funzioni pure sui dati di caricaDati(). Stessi nomi e
// stesse regole di prototipo-alternativo/assets/motore.js, che resta la fonte dei numeri.
// Solo sul server, dal database (V12, D-28): nessun valore calcolato arriva dal browser.

type Dec = Prisma.Decimal;
const Dec = Prisma.Decimal;
const ZERO = new Dec(0);
type Pratica = Dati['pratiche'][number];
type Documento = Pratica['documenti'][number];
type Riga = Pratica['righe']['ordine'][number];
type Bollettino = Dati['bollettini'][number];
type Abbinamento = Dati['interscambio'][number];
type RigaBollettino = Bollettino['righe'][number];

/** Indici validi (A7-21): se un chiamante sostituisce `pratiche` o `bollettini` (le prove lo fanno con lo
 *  spread), si rigenerano sul posto. Altrimenti si riusano quelli costruiti in `componi`. */
function indici(S: Dati): Dati {
  if (S.pratiche !== S._pratiche || S.bollettini !== S._bollettini) {
    Object.assign(S, costruisciIndici(S.pratiche, S.bollettini));
    S._pratiche = S.pratiche;
    S._bollettini = S.bollettini;
  }
  return S;
}

/* ---------- Numeri e date ---------- */
/** Centesimo con la regola contabile (D-49 §19): il mezzo si allontana dallo zero, quindi
 *  0,005 → 0,01 e −0,005 → −0,01. Il prototipo (M.r2) fa lo stesso. */
export const r2 = (n: Prisma.Decimal.Value) => new Dec(n).toDecimalPlaces(2, Dec.ROUND_HALF_UP);
const somma = (xs: Dec[]) => xs.reduce((s, x) => s.plus(x), ZERO);
/** importo × pct / 100, al centesimo: l'unico modo in cui si calcola una provvigione. */
const quota = (importo: Dec, pct: Dec) => r2(importo.times(pct).div(100));
export const giorni = (da: string, a: string) => Math.round((Date.parse(a) - Date.parse(da)) / 86400000);
export const piuGiorni = (iso: string, n: number) => new Date(Date.parse(iso) + n * 86400000).toISOString().slice(0, 10);
const aaaamm = (a: number, m: number) => `${a}-${String(m).padStart(2, '0')}`;
export const fineMese = (a: number, m: number) => new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);

/* ---------- Documenti e stato pratica (§5.1, §5.3, §5.8) ---------- */
/** Netto della pratica: fatture − note di credito (§5.3). */
export const netto = (p: Pratica) => r2(somma(p.documenti.map((d) => d.importo)));
/** Netto se ci sono documenti fiscali, altrimenti le conferme o gli ordini sommati (solo stima, D-60).
 *  Le conferme contano solo con un importo: una conferma registrata senza non azzera la stima. */
export const importoPratica = (p: Pratica) => {
  if (p.documenti.length) return netto(p);
  // D-174 §19: le conferme sostituite (superate) non contano nella stima
  const conImporto = p.conferme.filter((d) => !d.importo.isZero() && !d.superato);
  return r2(somma((conImporto.length ? conImporto : p.ordini).map((d) => d.importo)));
};

/* ---------- Spese e base della provvigione (§5.3, D-183 §19) ---------- */
/** Regola con cui si calcolano i valori salvati del documento: chi cambierà il calcolo in futuro
 *  prova a vuoto sui soli documenti aperti, i congelati restano con la regola con cui sono stati chiusi. */
export const REGOLA_CALCOLO = 'spese-base-v1';
/** Spese del documento: importo delle sue righe segnate `spesa` (trasporto, imballo, «Fracht»). */
export const speseDoc = (d: Documento) => r2(somma((d.righe ?? []).filter((r) => r.spesa).map((r) => r.importo)));
/** Spese escluse dalla base, secondo l'accordo col fornitore (D-183): zero se le spese entrano nella base. */
export const speseEscluse = (S: Dati, p: Pratica, d: Documento) =>
  S.fornitori.get(p.fornitore_id)?.spese_base_provvigione ? ZERO : speseDoc(d);
/** Base della provvigione di un documento: il valore salvato (calcolo.base), se manca il netto. */
export const baseDoc = (d: Documento): Dec => (d.calcolo?.base != null ? new Dec(d.calcolo.base) : d.importo);
/** Base della provvigione di una pratica = somma delle basi dei documenti (congelati o no, D-183). */
export const basePratica = (p: Pratica) => r2(somma(p.documenti.map(baseDoc)));

/** Parte dello stato che dipende solo dai documenti: si salva sulla pratica (D-52 §19). Conferma e proforma sono
 *  facoltative (D-60 §19): l'una o l'altra fa avanzare a "confermata", la fattura a "fatturata" anche senza. */
export const fasePratica = (p: Pratica) =>
  p.documenti.some((d) => d.tipo === 'fattura') ? ('fatturata' as const) : p.conferme.length || p.proforma.length ? ('confermata' as const) : ('attesa' as const);
/** Il cliente ha pagato (D-60): basta un documento di pagamento. Solo un segno, nessun effetto sui calcoli. */
export const pagato = (p: Pratica) => p.pagamenti.length > 0;

/** Lo stato si ricava dai documenti arrivati, non si scrive a mano (§5.1). */
export function statoPratica(S: Dati, p: Pratica) {
  const fase = fasePratica(p);
  if (fase !== 'attesa') return { chiave: fase };
  const gg = S.fornitori.get(p.fornitore_id)!.giorni_conferma;
  if (!gg) return { chiave: 'attesa' as const, scadenza: null, giorni: null }; // 0 = il fornitore non manda conferme: nessuna scadenza (D-60)
  const scadenza = piuGiorni(p.data, gg);
  const g = giorni(S.oggi, scadenza);
  return { chiave: g < 0 ? ('scaduta' as const) : ('attesa' as const), scadenza, giorni: g };
}

/** Righe di una fase con lo stesso codice sommate (D-60 §19: più ordini, più fatture): quantità e importo si
 *  sommano; il prezzo resta se è lo stesso, altrimenti è il medio (importo / quantità). */
// le righe senza codice (trasporto, imballo…) non si fondono fra loro: le tiene distinte la descrizione
export const chiaveRiga = (r: Riga) => r.codice ?? `~${r.descrizione}`;
export function perCodice(rr: Riga[]) {
  const m = new Map<string, Riga>();
  for (const r of rr) {
    const k = chiaveRiga(r), x = m.get(k);
    if (!x) { m.set(k, r); continue; }
    const qta = x.qta.plus(r.qta), importo = x.importo.plus(r.importo);
    const prezzo = x.prezzo.equals(r.prezzo) || qta.isZero() ? x.prezzo : importo.div(qta).toDecimalPlaces(4, Dec.ROUND_HALF_UP);
    m.set(k, { ...x, qta, prezzo, importo });
  }
  return [...m.values()];
}

/** Confronto delle righe fra le fasi, allineate per codice (§5.8). */
export function confronto(p: Pratica) {
  const fasi = (['ordine', 'conferma', 'fattura'] as const).filter((f) => p.righe[f].length).map((f) => perCodice(p.righe[f]));
  const chiavi = [...new Set(fasi.flat().map(chiaveRiga))];
  return chiavi.map((k) => {
    const per = fasi.map((rr) => rr.find((r) => chiaveRiga(r) === k) ?? null);
    const codice = per.find((r) => r)!.codice;
    let varia = false;
    for (let i = 1; i < per.length; i++) {
      const a = per[i - 1], b = per[i];
      if (!a !== !b || (a && b && (!a.qta.equals(b.qta) || !a.prezzo.equals(b.prezzo)))) varia = true;
    }
    const primo = per[0]?.importo ?? ZERO, ultimo = per[per.length - 1]?.importo ?? ZERO;
    return { codice, descrizione: per.find((r) => r)!.descrizione, per, varia, delta: r2(ultimo.minus(primo)) };
  });
}
export const haVariazioni = (p: Pratica) => (['ordine', 'conferma', 'fattura'] as const).filter((f) => p.righe[f].length).length > 1 && confronto(p).some((r) => r.varia);

/* ---------- Sconto medio sui documenti (§5.3, D-182 §19) ---------- */
/** Una riga con quantità e prezzo e non di spesa: senza, non contribuisce allo sconto medio (fuori dal calcolo). */
const utilePerSconto = (r: Riga) => !r.spesa && !r.qta.isZero() && !r.prezzo.isZero();

/** Lordo (Σ quantità × prezzo) e netto (Σ importo, già scontato, D-49) delle sole righe utili. */
const lordoNetto = (rr: Riga[]) => {
  let lordo = ZERO, netto = ZERO;
  for (const r of rr) if (utilePerSconto(r)) { lordo = lordo.plus(r.qta.times(r.prezzo)); netto = netto.plus(r.importo); }
  return { lordo, netto };
};

/** 1 − netto/lordo, in %, a 2 decimali. */
const scontoDa = (lordo: Dec, netto: Dec) => r2(new Dec(1).minus(netto.div(lordo)).times(100));

/** La fase con righe utili che comanda lo sconto medio: fattura → conferma/proforma → ordine. */
const fasePerSconto = (p: Pratica) => p.righe.fattura.some(utilePerSconto) ? p.righe.fattura
  : p.righe.conferma.some(utilePerSconto) ? p.righe.conferma
    : p.righe.ordine.some(utilePerSconto) ? p.righe.ordine : null;

/** Sconto medio della sola fase che comanda, senza le note di credito: è lo sconto «prima della nota». */
export function scontoMedioFase(p: Pratica): Dec | null {
  const fase = fasePerSconto(p);
  if (!fase) return null;
  const { lordo, netto } = lordoNetto(fase);
  return lordo.isZero() ? null : scontoDa(lordo, netto);
}

/** Sconto medio del documento che comanda la pratica (ordine → conferma/proforma → fattura, l'ultimo
 *  arrivato): 1 − netto/lordo, in %, a 2 decimali. lordo = Σ quantità × prezzo, netto = Σ importo della
 *  riga (già scontato, D-49). D-197 §19: le righe della nota di credito si **sottraggono** a quelle della
 *  fattura, così lo sconto medio è quello della differenza (fattura − nota): una nota che toglie le righe
 *  meno scontate alza la media e può cambiare lo scaglione. null se nessuna riga utile o lordo 0 (storno
 *  totale): si usa lo sconto dell'agenzia (riserva, D-182). */
export function scontoMedio(p: Pratica): Dec | null {
  const fase = fasePerSconto(p);
  if (!fase) return null;
  let { lordo, netto } = lordoNetto(fase);
  if (fase === p.righe.fattura) {
    for (const d of p.documenti) if (d.tipo === 'nota_credito') {
      const { lordo: ln, netto: nn } = lordoNetto(d.righe ?? []);
      lordo = lordo.minus(ln); netto = netto.minus(nn);
    }
  }
  return lordo.isZero() ? null : scontoDa(lordo, netto);
}

/* ---------- Percentuali (§5.1, §5.2, §5.11) ---------- */
/** Soglie del fornitore in vigore alla data: per ogni soglia la versione più recente con valido_dal ≤ data (D-25). */
function soglieInVigore(S: Pick<Dati, 'scaglioni'>, fornitore_id: string, data: string) {
  const perSoglia = new Map<string, Dati['scaglioni'][number]>();
  for (const s of S.scaglioni) {
    if (s.fornitore_id !== fornitore_id || s.valido_dal > data) continue;
    const k = s.sconto.toString(), x = perSoglia.get(k);
    if (!x || x.valido_dal < s.valido_dal) perSoglia.set(k, s);
  }
  return [...perSoglia.values()];
}

/** Scaglione in vigore alla data: il primo (più basso) ≥ sconto medio (D-182 §19); se il fornitore ha
 *  `scaglioni_esatti` (D-200 §19) vale solo la soglia con |sconto − soglia| ≤ 0,05 punti (tolleranza per
 *  gli arrotondamenti). Senza soglia (sconto oltre l'ultima, o nessun esatto) → null: la provvigione
 *  resta «da decidere», mai calcolata su uno scaglione inventato. */
const TOLLERANZA_SCAGLIONE_ESATTO = new Dec('0.05'); // D-200 §19
export function scaglione(S: Pick<Dati, 'scaglioni'> & { fornitori?: Dati['fornitori'] }, fornitore_id: string, sconto: Dec, data: string) {
  const soglie = soglieInVigore(S, fornitore_id, data).sort((a, b) => a.sconto.comparedTo(b.sconto));
  if (S.fornitori?.get(fornitore_id)?.scaglioni_esatti) {
    return soglie.find((s) => s.sconto.minus(sconto).abs().lte(TOLLERANZA_SCAGLIONE_ESATTO)) ?? null;
  }
  return soglie.filter((s) => s.sconto.gte(sconto))[0] ?? null;
}

/** L'ultimo (più alto) scaglione del fornitore in vigore alla data, o null se non ce n'è. */
export function ultimoScaglione(S: Pick<Dati, 'scaglioni'>, fornitore_id: string, data: string) {
  return soglieInVigore(S, fornitore_id, data).sort((a, b) => b.sconto.comparedTo(a.sconto))[0] ?? null;
}

/** Sconto medio senza scaglione: anomalia (D-182 §19, D-200 §19). null se non c'è o lo sconto medio è
 *  ignoto (si usa lo sconto dell'agenzia). A fascia è lo sconto oltre l'ultimo scaglione; con
 *  `scaglioni_esatti` ogni sconto senza soglia esatta (±0,05). Il numero è quello del documento che comanda. */
export function anomaliaScontoMedio(S: Pick<Dati, 'scaglioni'> & { fornitori?: Dati['fornitori'] }, p: Pratica) {
  const sm = scontoMedio(p);
  if (sm == null) return null;
  const data = p.documenti[p.documenti.length - 1]?.data ?? p.data;
  const ultimo = ultimoScaglione(S, p.fornitore_id, data);
  if (!ultimo) return null; // nessuno scaglione: non è un'anomalia di sconto medio (D-113)
  if (scaglione(S, p.fornitore_id, sm, data)) return null; // a fascia o esatto: c'è uno scaglione
  const comanda = p.documenti.length ? p.documenti[p.documenti.length - 1].numero
    : p.proforma.length ? p.proforma[0].numero : p.conferme.length ? p.conferme[0].numero : p.ordini[0]?.numero ?? p.numero;
  return { pratica_id: p.id, numero: p.numero, documento: comanda, sconto_medio: sm, ultimo_scaglione: ultimo.sconto };
}

/** Chi segue il cliente su quel fornitore alla data del documento (D-35). */
export const abbinamento = (S: Dati, cliente_id: string, fornitore_id: string, data: string) =>
  S.interscambio.find((a) => a.cliente_id === cliente_id && a.fornitore_id === fornitore_id && a.valido_dal <= data && (!a.valido_al || data < a.valido_al)) ?? null;

/** Percentuali di una pratica: agenzia (subagente e sconto) alla data dell'ordine, scaglione ed
 *  eccezione alla data del documento. Al subagente la sua percentuale (eccezione personale, §5.2). */
export function percentuali(S: Dati, p: Pratica, data = p.data) {
  // D-146 §19: agenzia alla data dell'ordine (D-137), scaglioni alla data del documento
  const ab = abbinamento(S, p.cliente_id, p.fornitore_id, p.data);
  if (!ab) return null;
  // D-182 §19: lo scaglione si sceglie dallo sconto medio sui documenti; senza righe utili riserva sullo sconto dell'agenzia
  const sm = scontoMedio(p);
  const sc = scaglione(S, p.fornitore_id, sm ?? ab.sconto, data);
  if (!sc) return null;
  // eccezione del subagente sulla soglia dello scaglione, valida alla data del documento (D-51 §19)
  const ecc = S.eccezioni.find((e) => e.fornitore_id === p.fornitore_id && e.subagente_id === ab.subagente_id && e.sconto.equals(sc.sconto)
    && e.valido_dal <= data && (!e.valido_al || data < e.valido_al)); // valido_al escluso, come interscambio
  return {
    ab, sconto: sm ?? ab.sconto, sconto_medio: sm, scaglione: sc, subagente_id: ab.subagente_id,
    agente: sc.pct_agente, sub_standard: sc.pct_sub, sub: ecc ? ecc.pct : sc.pct_sub, eccezione: !!ecc,
    // D-166 §19: il fornitore paga a Decobrands la sola pct_agente; la parte del subagente è presa da quella
    dal_fornitore: sc.pct_agente,
  };
}

/** Documento fiscale per id (D-34): la via normale quando il database ha il collegamento. */
export function documentoPerId(S: Dati, id: string) {
  return indici(S).perDocumento.get(id) ?? null;
}

/** Documento fiscale per numero, nel fornitore se dato: solo dove l'id manca (riga di bollettino non
 *  ancora abbinata). Il numero da solo non identifica: un fornitore può riusarlo in un altro anno (D-34);
 *  con `data` (la data della riga) vince il documento dello stesso giorno, senza data il più recente con
 *  data entro `entro` (la fine del mese del bollettino). */
export function trovaDocumento(S: Dati, numero: string, fornitore_id?: string, data?: string | null, entro?: string) {
  const candidati = (indici(S).perNumero.get(numero) ?? []).filter((c) => !fornitore_id || c.pratica.fornitore_id === fornitore_id);
  return scegliDocumento(candidati, data, entro);
}

/** "Una fattura al mese" (D-27): la prima o la più alta del mese per cliente × fornitore. */
export function fatturaDelMese(S: Dati, ab: Abbinamento, mese: string) {
  const ff = [...(indici(S).fattureDi.get(`${ab.cliente_id}|${ab.fornitore_id}|${mese}`) ?? [])];
  // D-27 §19: se una fattura del mese è già liquidata, il mese è "consumato" (A2-02): resta la scelta,
  // la più vecchia per liquidazione, anche se una tardiva vincerebbe prima/piu_alta.
  const liquidate = ff.filter((d) => d.liquidazione_id);
  if (liquidate.length) {
    liquidate.sort((x, y) => S.liquidazioni_chiuse.findIndex((l) => l.id === x.liquidazione_id) - S.liquidazioni_chiuse.findIndex((l) => l.id === y.liquidazione_id));
    return liquidate[0];
  }
  ff.sort(ab.regola_mensile === 'piu_alta'
    ? (x, y) => y.importo.comparedTo(x.importo) || x.data.localeCompare(y.data)
    : (x, y) => x.data.localeCompare(y.data) || x.numero.localeCompare(y.numero));
  return ff[0] ?? null;
}

/** Precedenza delle regole piatte del subagente (D-27 §19): correzione → «una fattura al mese» → %
 *  dell'agenzia. Restituisce la regola piatta o null se non si applica (allora contano lo scaglione
 *  o, in modalità riga, i gruppi). Un punto solo, riusato da `quotaSub` e `provvigioneRiga`. */
function regolaPiatta(S: Dati, p: Pratica, d: Documento, ab: Abbinamento, imp: Dec): { pct: Dec; provvigione: Dec; regola: string; vale: string | null } | null {
  const cor = d.correzione;
  if (cor) {
    if (cor.tipo === 'importo') {
      // D-27 §19: l'importo fisso è sempre positivo (come lo salva il server); su una nota di credito
      // (importo negativo) va preso col segno invertito, per ridurre e non dare (A2-03).
      const v = imp.isNegative() ? cor.valore.neg() : cor.valore;
      return { pct: imp.isZero() ? ZERO : r2(v.div(imp).times(100)), provvigione: r2(v), regola: 'correzione', vale: null };
    }
    const pct = cor.tipo === 'nessuna' ? ZERO : cor.valore;
    return { pct, provvigione: quota(imp, pct), regola: 'correzione', vale: null };
  }
  if (ab.regola_mensile) {
    // le note di credito seguono la fattura a cui si riferiscono
    const rif = d.tipo === 'nota_credito' && d.fattura_id ? (documentoPerId(S, d.fattura_id)?.doc ?? d) : d;
    const scelta = fatturaDelMese(S, ab, rif.data.slice(0, 7));
    if (scelta && scelta.id !== rif.id) return { pct: ZERO, provvigione: ZERO, regola: 'mensile', vale: scelta.numero };
  }
  if (ab.pct_subagente != null) return { pct: ab.pct_subagente, provvigione: quota(imp, ab.pct_subagente), regola: 'agenzia', vale: null };
  return null;
}

/** Quota del subagente su un documento (D-27 §19), vince la prima regola presente: correzione sul
 *  documento → una fattura al mese → % dell'agenzia → eccezione personale → % dello scaglione. */
export function quotaSub(S: Dati, p: Pratica, d: Documento, base?: Dec) {
  // D-183 §19: un documento congelato non si ricalcola: vale la quota fissata nel `calcolo`.
  if (d.congelato_il && d.calcolo?.provvigione_subagente != null) {
    const c = d.calcolo;
    return { pct: new Dec(c.pct_subagente ?? '0'), provvigione: new Dec(c.provvigione_subagente ?? '0'), regola: 'congelato', vale: null, eccezione: false };
  }
  // D-199 §19: in modalità riga la quota del subagente è la somma dei gruppi; le regole piatte
  // (correzione, mensile, % agenzia) vincono lì, dentro `provvigioneRiga`. Con base esplicita si
  // ricalcola sulla base data (stessa percentuale effettiva).
  if (raggruppamentoDi(S, p).raggruppamento === 'riga' && d.righe?.length) {
    const r = provvigioneRiga(S, p, d);
    if (r) {
      if (r.sub == null) return null; // gruppo oltre l'ultimo scaglione: da decidere
      return { pct: r.pct_sub ?? ZERO, provvigione: base != null ? quota(base, r.pct_sub ?? ZERO) : r.sub, regola: 'riga', vale: null, eccezione: r.eccezione };
    }
    // r == null (riga merce senza prezzo) → si ricade nello sconto medio (sotto)
  }
  const perc = percentuali(S, p, d.data);
  if (!perc) return null;
  const imp = base ?? baseDoc(d); // D-183: la quota si calcola sulla base (netto − spese escluse)
  const piatta = regolaPiatta(S, p, d, perc.ab, imp);
  if (piatta) return { ...piatta, eccezione: false };
  return { pct: perc.sub, provvigione: quota(imp, perc.sub), regola: perc.eccezione ? 'eccezione' : 'standard', vale: null, eccezione: perc.eccezione };
}

/** Provvigioni di un documento: dal fornitore (prese), al subagente (pagate), margine di Decobrands.
 *  D-197 §19: per una nota su fattura congelata prese e pagate sono la differenza della coppia. */
export function provvigioneDoc(S: Dati, p: Pratica, d: Documento) {
  // senza agenzia non c'è subagente: nessuna provvigione, come quando mancano le percentuali
  const ab = abbinamento(S, p.cliente_id, p.fornitore_id, p.data);
  if (!ab) return null;
  // D-199 §19: i valori effettivi (per gruppi in modalità riga, fissati se congelato, D-197 in documento);
  // agente null = «da decidere», come quando mancano le percentuali.
  const v = provvigioneDocumento(S, p, d);
  if (!v || v.agente == null) return null;
  const sub = quotaSub(S, p, d)!;
  const perc = { subagente_id: ab.subagente_id, dal_fornitore: v.pct_agente ?? ZERO };
  return { perc, importo: v.base, prese: v.agente, sub, pagate: v.sub ?? sub.provvigione, margine: r2(v.agente.minus(v.sub ?? sub.provvigione)) };
}

/** D-197 §19: una nota di credito su una fattura **congelata** porta la **differenza** fra la provvigione
 *  della coppia (fattura − note, con lo scaglione della differenza) e i valori già fissati (fattura + note
 *  già congelate), per Decobrands e per il subagente. Null se non è una nota, se la fattura non è congelata
 *  o se mancano le percentuali. La base della coppia usa la base della nota (netto + spese, D-197) e le basi
 *  salvate degli altri documenti. Una nota già congelata vale il suo `calcolo` (D-183): la differenza è già
 *  stata fissata, ricalcolarla toglierebbe di nuovo la quota della fattura. */
export function differenzaNotaCongelata(S: Dati, p: Pratica, d: Documento) {
  if (d.congelato_il) return null;
  if (d.tipo !== 'nota_credito' || !d.fattura_id) return null;
  // la fattura stornata è sempre nella stessa pratica (D-54: fattura_id di una fattura della pratica)
  const fattura = p.documenti.find((x) => x.id === d.fattura_id) ?? null;
  if (!fattura?.congelato_il) return null;
  const perc = percentuali(S, p, d.data);
  if (!perc) return null;
  const baseNota = r2(d.importo.plus(speseEscluse(S, p, d))); // D-197: netto + spese (le spese tornano dentro)
  const baseCoppia = r2(somma(p.documenti.map((x) => (x.id === d.id ? baseNota : baseDoc(x)))));
  const agenteCoppia = quota(baseCoppia, perc.dal_fornitore);
  const subagenteCoppia = quotaSub(S, p, d, baseCoppia)?.provvigione ?? ZERO;
  // già fissati: la fattura congelata e le eventuali note già congelate (non la nota corrente)
  const fissati = p.documenti.filter((x) => x.id !== d.id && x.congelato_il);
  const agenteFissata = somma(fissati.map((x) => (x.calcolo?.provvigione_agente != null ? new Dec(x.calcolo.provvigione_agente) : ZERO)));
  const subagenteFissata = somma(fissati.map((x) => (x.calcolo?.provvigione_subagente != null ? new Dec(x.calcolo.provvigione_subagente) : ZERO)));
  return {
    agente: r2(agenteCoppia.minus(agenteFissata)),
    subagente: r2(subagenteCoppia.minus(subagenteFissata)),
    base_coppia: baseCoppia,
    agente_coppia: agenteCoppia,
    subagente_coppia: subagenteCoppia,
    agente_fissata: agenteFissata,
    subagente_fissata: subagenteFissata,
  };
}

/* ---------- Raggruppamento per lo scaglione (D-199 §19) ---------- */
/** Come si raggruppano le righe di un documento per lo scaglione: la deroga della pratica vince sul
 *  fornitore. `documento` = sconto medio (oggi invariato); `riga` = per sconto di riga e somma. */
export function raggruppamentoDi(S: Dati, p: Pratica): { raggruppamento: 'documento' | 'riga'; da: 'pratica' | 'fornitore' } {
  if (p.raggruppamento === 'riga' || p.raggruppamento === 'documento') return { raggruppamento: p.raggruppamento, da: 'pratica' };
  return { raggruppamento: S.fornitori.get(p.fornitore_id)?.raggruppamento === 'riga' ? 'riga' : 'documento', da: 'fornitore' };
}

/** Sconto di una riga: 1 − importo/(quantità × prezzo), in % a 2 decimali (stessa funzione dello sconto
 *  medio). Una riga di spesa ha sconto 0 (di norma); una merce senza quantità o prezzo → null (non utilizzabile). */
const scontoRiga = (r: Riga): Dec | null => (r.spesa ? ZERO : utilePerSconto(r) ? scontoDa(r.qta.times(r.prezzo), r.importo) : null);

/** Eccezione personale del subagente sulla soglia di un gruppo (D-51), come in `percentuali`. */
const eccezioneSu = (S: Dati, p: Pratica, subagente_id: string, sconto: Dec, data: string) =>
  S.eccezioni.find((e) => e.fornitore_id === p.fornitore_id && e.subagente_id === subagente_id && e.sconto.equals(sconto)
    && e.valido_dal <= data && (!e.valido_al || data < e.valido_al));

/** Anomalia in modalità riga (D-199 §19): un gruppo di righe con sconto oltre l'ultimo scaglione del
 *  fornitore (o senza soglia esatta, D-200 §19) → provvigione «da decidere». Controlla i documenti fiscali (le note sulle loro righe). */
export function anomaliaGruppo(S: Pick<Dati, 'scaglioni'> & { fornitori?: Dati['fornitori'] }, p: Pratica) {
  for (const d of p.documenti) {
    if (!d.righe?.length) continue;
    for (const r of d.righe) {
      if (r.spesa) continue; // le spese hanno sconto 0, mai oltre l'ultimo scaglione
      const s = scontoRiga(r);
      if (s == null) continue; // riga merce senza prezzo: il documento torna allo sconto medio
      if (!scaglione(S, p.fornitore_id, s, d.data)) {
        return { pratica_id: p.id, numero: p.numero, documento: d.numero, sconto_gruppo: s, ultimo_scaglione: ultimoScaglione(S, p.fornitore_id, d.data)?.sconto ?? null };
      }
    }
  }
  return null;
}

/** Anomalia della provvigione della pratica (D-182 §19, D-199 §19): in modalità documento lo sconto
 *  medio oltre l'ultimo scaglione; in modalità riga un gruppo oltre l'ultimo scaglione (lo sconto medio
 *  non comanda). null se la pratica è a posto. */
export function anomaliaProvvigione(S: Dati, p: Pratica) {
  return raggruppamentoDi(S, p).raggruppamento === 'riga' ? anomaliaGruppo(S, p) : anomaliaScontoMedio(S, p);
}

/** Descrizione dell'anomalia di provvigione di una pratica (D-199 §19, D-200 §19) per i messaggi di
 *  blocco alla chiusura: distingue sconto medio, gruppo oltre l'ultimo scaglione e senza scaglione esatto. */
export function descrizioneAnomalia(S: Dati, p: Pratica): string | null {
  const a = anomaliaProvvigione(S, p);
  if (!a) return null;
  const esatti = S.fornitori.get(p.fornitore_id)?.scaglioni_esatti ?? false;
  if ('sconto_gruppo' in a) {
    return esatti ? 'un gruppo senza scaglione esatto' : 'un gruppo oltre l\'ultimo scaglione';
  }
  return esatti ? 'lo sconto medio senza scaglione esatto' : 'lo sconto medio oltre l\'ultimo scaglione';
}

/** Provvigione di un documento in modalità riga (D-199 §19): le righe merce si raggruppano per sconto,
 *  ogni gruppo prende il suo scaglione (primo ≥, come oggi) e la provvigione è la somma dei gruppi.
 *  Stessa cosa per la quota del subagente (eccezione personale sulla soglia del gruppo, D-51); la
 *  correzione, la regola mensile e la % dell'agenzia restano piatte e vincono (precedenza invariata, D-27).
 *  null se una riga merce è senza quantità o prezzo: il documento torna allo sconto medio. */
function provvigioneRiga(S: Dati, p: Pratica, d: Documento): {
  base: Dec; gruppi: GruppoRiga[]; agente: Dec | null; sub: Dec | null; pct_agente: Dec | null; pct_sub: Dec | null; eccezione: boolean;
} | null {
  // D-199: qui si parte dall'abbinamento, non da percentuali (che tornerebbe null con lo sconto medio
  // oltre l'ultimo scaglione anche se i singoli gruppi hanno il loro scaglione).
  const ab = abbinamento(S, p.cliente_id, p.fornitore_id, p.data);
  if (!ab) return null;
  const escludeSpese = !S.fornitori.get(p.fornitore_id)?.spese_base_provvigione;
  const perSconto = new Map<string, Dec>();
  const segno = d.tipo === 'nota_credito' ? -1 : 1; // D-199: le righe della nota sono positive, il segno è sul documento
  for (const r of d.righe ?? []) {
    if (r.spesa && escludeSpese) continue; // D-183: le spese escluse restano fuori dai gruppi
    const s = scontoRiga(r);
    if (s == null) return null; // merce senza prezzo → sconto medio
    const k = s.toFixed(2);
    perSconto.set(k, (perSconto.get(k) ?? ZERO).plus(segno < 0 ? r.importo.neg() : r.importo));
  }
  const base = r2(somma([...perSconto.values()]));
  // quota del subagente: regole piatte (correzione, mensile, % agenzia) vincono, come in quotaSub (D-27)
  const piatta = regolaPiatta(S, p, d, ab, base);
  let usaEccezione = false;
  const gruppi: GruppoRiga[] = [...perSconto.entries()].sort((a, b) => Number(a[0]) - Number(b[0])).map(([sconto, b]) => {
    const s = new Dec(sconto);
    const sc = scaglione(S, p.fornitore_id, s, d.data);
    if (!sc) return { sconto, base: b.toFixed(2), scaglione: null, pct_agente: null, pct_sub: null, provvigione_agente: null, provvigione_sub: null };
    const ecc = piatta ? null : eccezioneSu(S, p, ab.subagente_id, sc.sconto, d.data);
    if (ecc) usaEccezione = true;
    const pctSub = piatta ? piatta.pct : (ecc?.pct ?? sc.pct_sub);
    return {
      sconto, base: b.toFixed(2), scaglione: sc.sconto.toFixed(2),
      pct_agente: sc.pct_agente.toFixed(2), pct_sub: pctSub.toFixed(2),
      provvigione_agente: quota(b, sc.pct_agente).toFixed(2), provvigione_sub: quota(b, pctSub).toFixed(2),
    };
  });
  const oltre = gruppi.some((g) => g.scaglione == null); // un gruppo oltre l'ultimo scaglione → da decidere
  const agente = oltre ? null : r2(somma(gruppi.map((g) => new Dec(g.provvigione_agente!))));
  const sub = oltre ? null : piatta ? piatta.provvigione : r2(somma(gruppi.map((g) => new Dec(g.provvigione_sub!))));
  const pct = (tot: Dec | null) => (tot == null || base.isZero() ? null : r2(tot.div(base).times(100)));
  return { base, gruppi, agente, sub, pct_agente: pct(agente), pct_sub: pct(sub), eccezione: usaEccezione };
}

/** Punto unico di calcolo dei valori salvati di un documento fiscale (D-183 §19): base = netto − spese
 *  escluse (secondo l'accordo col fornitore), sconto medio solo sulla merce, scaglione, percentuali e
 *  provvigioni. Riusa `percentuali` e `quotaSub`. Il server lo calcola sugli aperti e salva il JSON;
 *  i congelati non si toccano. D-199: in modalità riga si calcola per gruppi di sconto (lineare). */
export function calcoloDocumento(S: Dati, p: Pratica, d: Documento): CalcoloDocumento {
  const { raggruppamento, da } = raggruppamentoDi(S, p);
  const esatti = S.fornitori.get(p.fornitore_id)?.scaglioni_esatti ?? false; // D-200 §19
  const perc = percentuali(S, p, d.data);
  const spese = speseEscluse(S, p, d);
  // D-197 §19: le spese della nota riducono quelle della fattura, quindi la base della nota è netto + spese
  // (netto negativo + spese escluse che tornano dentro). Per la fattura resta netto − spese. La somma delle
  // basi dà la base della differenza (coppia fattura + note).
  const base = d.tipo === 'nota_credito' ? r2(d.importo.plus(spese)) : r2(d.importo.minus(spese));
  const sm = scontoMedio(p);
  // D-199 §19: in modalità riga il risultato per gruppi si calcola una sola volta: serve sia all'agente
  // (`provvigioneRiga`, qui sotto) sia al subagente (`quotaSub`, che altrimenti lo ricalcolerebbe).
  const r = raggruppamento === 'riga' && d.righe?.length ? provvigioneRiga(S, p, d) : null;
  const q = r
    ? (r.sub == null ? null : { pct: r.pct_sub ?? ZERO, provvigione: quota(base, r.pct_sub ?? ZERO), regola: 'riga', vale: null, eccezione: r.eccezione })
    : perc ? quotaSub(S, p, d, base) : null;
  // D-197 §19: nota su fattura congelata → la provvigione è la differenza (coppia − fissato), non base × pct
  const diff = differenzaNotaCongelata(S, p, d);
  // risultato in modalità documento (oggi invariato); in modalità riga è la riserva e il ripiego
  const inDocumento: CalcoloDocumento = {
    base: base.toFixed(2),
    spese: spese.toFixed(2),
    netto: d.importo.toFixed(2),
    sconto_medio: sm == null ? null : sm.toFixed(2),
    scaglione: perc ? perc.scaglione.sconto.toFixed(2) : null,
    pct_agente: perc ? perc.dal_fornitore.toFixed(2) : null,
    pct_subagente: q ? q.pct.toFixed(2) : null,
    provvigione_agente: perc ? (diff ? diff.agente : quota(base, perc.dal_fornitore)).toFixed(2) : null,
    provvigione_subagente: q ? (diff ? diff.subagente : q.provvigione).toFixed(2) : null,
    regola: REGOLA_CALCOLO,
    raggruppamento, raggruppamento_da: da, scaglioni_esatti: esatti,
    ...(diff ? {
      differenza_nota: {
        base_coppia: diff.base_coppia.toFixed(2),
        agente_coppia: diff.agente_coppia.toFixed(2),
        subagente_coppia: diff.subagente_coppia.toFixed(2),
        agente_fissata: diff.agente_fissata.toFixed(2),
        subagente_fissata: diff.subagente_fissata.toFixed(2),
      },
    } : {}),
  };
  // D-199 §19: in modalità riga il calcolo è per gruppi e lineare: la coppia fattura+nota di D-197 non serve.
  if (raggruppamento !== 'riga') return inDocumento;
  if (!(d.righe?.length)) return inDocumento; // nota/documento senza righe → riserva di oggi (sconto medio)
  if (!r) {
    // una riga merce senza quantità o prezzo → tutto il documento torna allo sconto medio (D-199)
    return { ...inDocumento, regola: 'riga senza prezzo: sconto medio' };
  }
  // D-199 §19: in modalità riga la base è la somma delle righe; se non torna col netto del documento
  // (sconto in calce o arrotondamenti oltre 0,05 €) si ricade sullo sconto medio.
  if (r.base.minus(base).abs().gt(new Dec('0.05'))) {
    return { ...inDocumento, regola: 'righe che non tornano col netto: sconto medio' };
  }
  return {
    base: r.base.toFixed(2),
    spese: spese.toFixed(2),
    netto: d.importo.toFixed(2),
    sconto_medio: sm == null ? null : sm.toFixed(2),
    raggruppamento, raggruppamento_da: da, scaglioni_esatti: esatti,
    scaglione: null, // in modalità riga non c'è un solo scaglione: i gruppi li portano
    pct_agente: r.pct_agente?.toFixed(2) ?? null,
    pct_subagente: r.pct_sub?.toFixed(2) ?? null,
    provvigione_agente: r.agente?.toFixed(2) ?? null,
    provvigione_subagente: r.sub?.toFixed(2) ?? null,
    regola: 'riga-v1',
    gruppi: r.gruppi,
  };
}

/** Valori effettivi della provvigione di un documento (D-199 §19, D-183, D-197): il punto unico letto
 *  da liquidazione, Analisi e bollettini. Congelato → il `calcolo` salvato; aperto → il calcolo corrente
 *  (per gruppi in modalità `riga`, con lo sconto medio in `documento`). `agente`/`sub` null quando la
 *  provvigione è «da decidere» (sconto oltre l'ultimo scaglione). */
export function provvigioneDocumento(S: Dati, p: Pratica, d: Documento) {
  const c = d.congelato_il && d.calcolo ? d.calcolo : calcoloDocumento(S, p, d);
  return {
    base: new Dec(c.base),
    agente: c.provvigione_agente != null ? new Dec(c.provvigione_agente) : null,
    sub: c.provvigione_subagente != null ? new Dec(c.provvigione_subagente) : null,
    pct_agente: c.pct_agente != null ? new Dec(c.pct_agente) : null,
    pct_sub: c.pct_subagente != null ? new Dec(c.pct_subagente) : null,
  };
}

/* ---------- Bollettini (§6.2, riconciliazione "a cerniera") ---------- */
export const fiscaliDelMese = (S: Dati, fornitore_id: string, mese: string) =>
  S.pratiche.filter((p) => p.fornitore_id === fornitore_id).flatMap((pratica) => pratica.documenti.filter((d) => d.data.slice(0, 7) === mese).map((doc) => ({ pratica, doc })));
export const bollettinoDi = (S: Dati, fornitore_id: string, a: number, m: number) =>
  indici(S).bollettiniDi.get(fornitore_id)?.find((b) => b.anno === a && b.mese === m) ?? null;
/** La riga del bollettino è su quel documento? Il documento della riga è quello di `documentoDiRiga`
 *  (per id se abbinata, altrimenti per numero disambiguato per data e mese, D-34 §19, A2-05). */
const suDocumento = (S: Dati, b: Bollettino, r: RigaBollettino, d: Documento) => documentoDiRiga(S, b, r)?.doc.id === d.id;
/** Documento di una riga di bollettino: per id se abbinata, altrimenti per numero. */
const documentoDiRiga = (S: Dati, b: Bollettino, r: RigaBollettino) => (r.documento_id ? documentoPerId(S, r.documento_id) : trovaDocumento(S, r.numero, b.fornitore_id, r.data, fineMese(b.anno, b.mese)));
/** Il documento è riconosciuto in un bollettino verificato? (maturato, §5.14) */
export const riconosciutoIn = (S: Dati, d: Documento, fornitore_id: string) => {
  const xs = indici(S).righeSuDocumento.get(d.id);
  return xs ? (xs.find(({ b }) => b.fornitore_id === fornitore_id && b.stato === 'verificato')?.b ?? null) : null;
};
/** Righe dei bollettini su un documento, dal mese più vecchio. */
export const righeBollettinoDi = (S: Dati, d: Documento, fornitore_id: string) =>
  (indici(S).righeSuDocumento.get(d.id) ?? [])
    .filter(({ b }) => b.fornitore_id === fornitore_id)
    .sort((x, y) => x.b.anno * 100 + x.b.mese - (y.b.anno * 100 + y.b.mese));

type Lato = { imponibile: Dec | null; pct: Dec | null; importo: Dec };
type Decisione = NonNullable<RigaBollettino['decisione']>;
/** Riconciliazione riga per riga: fornitore (loro) contro calcolo del CRM (noi). */
export function riconcilia(S: Dati, b: Bollettino) {
  const f = S.fornitori.get(b.fornitore_id)!, maturato = f.maturazione === 'maturato', meseB = aaaamm(b.anno, b.mese);
  const nostri = fiscaliDelMese(S, b.fornitore_id, meseB);
  const righe = b.righe.map((r) => {
    const n = r.documento_id ? documentoPerId(S, r.documento_id) : (nostri.find((x) => x.doc.numero === r.numero) ?? trovaDocumento(S, r.numero, b.fornitore_id, r.data, fineMese(b.anno, b.mese)));
    const riga = {
      id: r.id as string | null, documento_id: n?.doc.id ?? null,
      numero: r.numero, data: r.data, pratica_id: n?.pratica.id ?? null, cliente_id: n?.pratica.cliente_id ?? null, tipo: n?.doc.tipo ?? null,
      loro: { imponibile: r.imponibile, pct: r.pct, importo: r.importo } as Lato | null, noi: null as Lato | null, differenza: null as Dec | null,
      categoria: 'sconosciuta', incasso: false, pagamento: false, pagata_in: null as string | null, giorni: null as number | null,
      decisione: r.decisione as Decisione | null,
    };
    if (!n) return riga;
    // D-199 §19: la provvigione attesa è quella effettiva del documento (gruppi in modalità riga,
    // differenza della coppia D-197 in documento, valori fissati se congelato).
    const v = provvigioneDocumento(S, n.pratica, n.doc);
    const pct = v.pct_agente ?? ZERO;
    if (r.tipo) {
      // §5.14: storno (il cliente non ha pagato) e riaccredito (ha pagato) sul fatturato: non sono differenze da decidere
      const imp = r.tipo === 'storno' ? baseDoc(n.doc).neg() : baseDoc(n.doc);
      riga.noi = { imponibile: imp, pct, importo: quota(imp, pct) };
      riga.differenza = r2(r.importo.minus(riga.noi.importo));
      riga.categoria = r.tipo; riga.incasso = true;
      return riga;
    }
    const imp = baseDoc(n.doc);
    // mese verificato: valgono i valori congelati (§5.11)
    riga.noi = r.importo_calcolato != null ? { imponibile: imp, pct: r.pct_calcolata, importo: r.importo_calcolato } : { imponibile: imp, pct, importo: v.agente ?? ZERO };
    riga.differenza = r2(r.importo.minus(riga.noi.importo));
    riga.categoria = riga.differenza.isZero() && r.imponibile?.equals(imp) ? 'quadra' : 'differenza';
    // maturato: fattura di un mese precedente riconosciuta nel mese in cui il cliente ha pagato
    riga.pagamento = riga.categoria === 'quadra' && n.doc.data.slice(0, 7) < meseB && maturato;
    return riga;
  });
  for (const x of nostri.filter((x) => !b.righe.some((r) => suDocumento(S, b, r, x.doc)))) {
    // D-199 §19: l'atteso della nota su fattura congelata (D-197) e i gruppi in modalità riga sono già dentro `provvigioneDocumento`
    const v = provvigioneDocumento(S, x.pratica, x.doc);
    const atteso = v.agente ?? ZERO;
    // la decisione su un documento assente sta in bollettini_attese (D-56 §19); vale solo qui, finché manca
    const attesa = b.attese.find((a) => a.documento_id === x.doc.id) ?? null;
    const riga = {
      id: null as string | null, documento_id: x.doc.id as string | null,
      numero: x.doc.numero, data: x.doc.data, pratica_id: x.pratica.id, cliente_id: x.pratica.cliente_id, tipo: x.doc.tipo,
      loro: null as Lato | null, noi: { imponibile: baseDoc(x.doc), pct: v.pct_agente ?? ZERO, importo: atteso } as Lato | null, differenza: atteso.neg() as Dec | null,
      categoria: 'mancante', incasso: false, pagamento: false, pagata_in: null as string | null, giorni: null as number | null,
      decisione: attesa?.decisione ?? null,
    };
    // maturato (§5.14): una fattura assente non è "mancante": il cliente non ha ancora pagato
    if (maturato && x.doc.tipo === 'fattura') {
      const pag = S.bollettini.find((o) => o !== b && o.fornitore_id === b.fornitore_id && o.righe.some((r) => suDocumento(S, o, r, x.doc)));
      riga.incasso = true; riga.categoria = pag ? 'pagata_dopo' : 'attesa_incasso'; riga.pagata_in = pag?.id ?? null;
      riga.giorni = giorni(x.doc.data, S.oggi);
    }
    righe.push(riga);
  }
  // aperta = non quadra, non è d'incasso e nessuno ha ancora deciso (D-49)
  const conAperta = righe.map((r) => ({ ...r, aperta: r.categoria !== 'quadra' && !r.incasso && !r.decisione }));
  // le fatture sul maturato non ancora pagate non entrano nei totali del bollettino
  const nei = conAperta.filter((r) => r.categoria !== 'attesa_incasso' && r.categoria !== 'pagata_dopo');
  const riconosciuto = r2(somma(nei.map((r) => r.loro?.importo ?? ZERO))), atteso = r2(somma(nei.map((r) => r.noi?.importo ?? ZERO)));
  return { righe: conAperta, riconosciuto, atteso, differenza: r2(riconosciuto.minus(atteso)), aperte: conAperta.filter((r) => r.aperta).length };
}

/* ---------- Incassi dei clienti (§5.14, D-11) ---------- */
/** Stato d'incasso di una fattura: da_incassare · pagata · insoluta (fatturato) · da_verificare (maturato). */
export function statoIncasso(S: Dati, p: Pratica, d: Documento) {
  if (d.tipo !== 'fattura') return null;
  const f = S.fornitori.get(p.fornitore_id)!, gg = giorni(d.data, S.oggi), limite = f.giorni_incasso || 60;
  // contano solo i bollettini chiusi, come in liquidazione: §5.14 "nella verifica la fattura passa a insoluta";
  // maturato pagato = riconosciuto in un bollettino verificato (riconosciutoIn). Il prototipo guarda tutti i bollettini.
  const rb = righeBollettinoDi(S, d, p.fornitore_id);
  const ultimo = rb.filter((x) => x.r.tipo && x.b.stato !== 'da_verificare').pop();
  let st: { stato: string; dal: string | null; bollettino_id: string | null; manuale: boolean; nota: string | null };
  if (f.maturazione === 'maturato') {
    const ric = rb.find((x) => !x.r.tipo && x.b.stato === 'verificato');
    st = ric ? { stato: 'pagata', dal: aaaamm(ric.b.anno, ric.b.mese) + '-01', bollettino_id: ric.b.id, manuale: false, nota: null }
      : { stato: gg > limite ? 'da_verificare' : 'da_incassare', dal: null, bollettino_id: null, manuale: false, nota: null };
  } else if (ultimo) {
    st = { stato: ultimo.r.tipo === 'storno' ? 'insoluta' : 'pagata', dal: ultimo.b.ricevuto, bollettino_id: ultimo.b.id, manuale: false, nota: null };
  } else st = { stato: 'da_incassare', dal: null, bollettino_id: null, manuale: false, nota: null };
  if (d.incasso && (!st.dal || d.incasso.dal >= st.dal)) st = { stato: d.incasso.stato, dal: d.incasso.dal, bollettino_id: null, manuale: true, nota: d.incasso.nota ?? null };
  return { ...st, giorni: gg, limite, solleciti: d.solleciti, sollecitata_il: d.sollecitata_il };
}

/** Fatture da sollecitare al cliente (§5.14): non pagate (fatturato, stornate) e incassi da
 *  verificare (maturato oltre i giorni d'incasso), dalla più vecchia. Solo fatture. */
export function pagamentiDaSollecitare(S: Dati) {
  const out = [];
  for (const p of S.pratiche) for (const d of p.documenti) {
    const st = statoIncasso(S, p, d);
    if (st && (st.stato === 'insoluta' || st.stato === 'da_verificare')) {
      out.push({
        pratica_id: p.id, pratica: p.numero, documento_id: d.id, numero: d.numero, data: d.data,
        cliente_id: p.cliente_id, cliente: S.clienti.get(p.cliente_id)?.nome ?? '',
        fornitore_id: p.fornitore_id, fornitore: S.fornitori.get(p.fornitore_id)?.nome ?? '',
        importo: d.importo, stato: st,
      });
    }
  }
  return out.sort((x, y) => x.data.localeCompare(y.data));
}

/* ---------- Liquidazioni ai subagenti (trimestri fissi, §5.6) ---------- */
export const trimestre = (iso: string) => Math.floor((Number(iso.slice(5, 7)) - 1) / 3) + 1;
export const limiti = (a: number, t: number) => ({ da: aaaamm(a, (t - 1) * 3 + 1) + '-01', a: fineMese(a, t * 3) });

/** Prima liquidazione ancora aperta dal trimestre della data: dove va una voce in ritardo (storni, riaccrediti, D-11). */
export function trimestreLiquidazione(S: Dati, iso: string) {
  let a = Number(iso.slice(0, 4)), t = trimestre(iso);
  while (S.liquidazioni_chiuse.some((l) => l.anno === a && l.trimestre === t)) { t++; if (t > 4) { t = 1; a++; } }
  return { a, t };
}

/** Righe della liquidazione di un trimestre. motivo: attesa_incasso · bollettino_da_verificare ·
 *  non_riconosciuta (maturato non liquidabile) · storno · riaccredito (voci, D-11). */
export function righeLiquidazione(S: Dati, a: number, t: number) {
  const lim = limiti(a, t), nelTrimestre = (iso: string) => iso >= lim.da && iso <= lim.a;
  const out = [];
  const riga = (p: Pratica, d: Documento, segno: 1 | -1) => {
    // D-199 §19: il subagente viene dall'abbinamento, non da `percentuali` (che con lo sconto medio
    // senza scaglione tornerebbe null anche se i gruppi hanno la loro soglia).
    const ab = abbinamento(S, p.cliente_id, p.fornitore_id, p.data);
    if (!ab) return null;
    const q = quotaSub(S, p, d);
    // D-199 §19: gruppo oltre l'ultimo scaglione → provvigione da decidere, il documento non si liquida
    if (!q) return null;
    // D-197 §19: la differenza della coppia nota/fattura congelata vale solo in modalità documento
    // (in riga il calcolo è lineare, come `calcoloDocumento` e `riconcilia`)
    const diff = raggruppamentoDi(S, p).raggruppamento === 'riga' ? null : differenzaNotaCongelata(S, p, d);
    const prov = diff ? diff.subagente : q.provvigione;
    return {
      pratica_id: p.id, documento_id: d.id, numero: d.numero, tipo: d.tipo, data: d.data, origine: null as string | null,
      fornitore_id: p.fornitore_id, subagente_id: ab.subagente_id, cliente_id: p.cliente_id, codice_cliente: ab.codice,
      importo: segno < 0 ? baseDoc(d).neg() : baseDoc(d), pct: q.pct, provvigione: segno < 0 ? prov.neg() : prov,
      regola: q.regola, eccezione: q.eccezione,
      liquidabile: true, incasso: false, motivo: null as string | null, voce: null as string | null, bollettino_id: null as string | null, riga_bollettino_id: null as string | null,
    };
  };
  // Dove va una provvigione liquidabile (D-57): nella liquidazione che l'ha già pagata (liquidazione_id); altrimenti nel
  // trimestre della data o, se è già chiuso, nel primo aperto dopo (come gli storni, D-11): niente provvigioni perse.
  const qui = (liquidazione_id: string | null, iso: string) => {
    const l = liquidazione_id ? S.liquidazioni_chiuse.find((x) => x.id === liquidazione_id) : null;
    const q = l ? { a: l.anno, t: l.trimestre } : trimestreLiquidazione(S, iso);
    return q.a === a && q.t === t;
  };
  for (const p of S.pratiche) for (const d of p.documenti) {
    const r = riga(p, d, 1);
    if (!r) continue; // provvigione da decidere (gruppo oltre l'ultimo scaglione)
    if (S.fornitori.get(p.fornitore_id)!.maturazione === 'maturato') {
      // maturato→maturato (§5.14): entra nel trimestre del bollettino che la riconosce (il mese in cui il cliente paga)
      // D-118 §19: sul maturato la nota di credito segue la sua fattura (entra col suo riconoscimento)
      const rif = d.tipo === 'nota_credito' && d.fattura_id ? documentoPerId(S, d.fattura_id)?.doc ?? d : d;
      const b = riconosciutoIn(S, rif, p.fornitore_id);
      if (b) {
        const meseRif = aaaamm(b.anno, b.mese) + '-01';
        // D-118 + D-150 (D-11): la NC non torna in un trimestre chiuso (D-33). Se la fattura è stata
        // riconosciuta prima della NC, la provvigione tolta va nella prima liquidazione aperta: il riferimento
        // è il più tardo fra la NC e il riconoscimento della fattura.
        const iso = d.tipo === 'nota_credito' && d.data > meseRif ? d.data : meseRif;
        if (!qui(d.liquidazione_id, iso)) continue;
      }
      else {
        if (!nelTrimestre(d.data)) continue;
        r.liquidabile = false;
        const bm = bollettinoDi(S, p.fornitore_id, Number(d.data.slice(0, 4)), Number(d.data.slice(5, 7)));
        const ric = righeBollettinoDi(S, rif, p.fornitore_id)[0];
        // il motivo «in attesa di incasso» vale solo per le fatture (D-118 §19)
        if (bm && bm.stato === 'verificato' && !ric && d.tipo === 'fattura') { r.incasso = true; r.motivo = 'attesa_incasso'; r.bollettino_id = bm.id; }
        else { r.motivo = ric || bm ? 'bollettino_da_verificare' : 'non_riconosciuta'; r.bollettino_id = (ric?.b ?? bm)?.id ?? null; }
      }
    } else if (!qui(d.liquidazione_id, d.data)) continue;
    out.push(r);
  }
  // storni e riaccrediti (fatturato, §5.14, D-11): al subagente nella prima liquidazione ancora aperta
  // dopo la chiusura del bollettino, come voce negativa (storno) o positiva (riaccredito)
  for (const b of S.bollettini) {
    if (b.stato === 'da_verificare') continue;
    for (const rb of b.righe) {
      if (!rb.tipo) continue;
      // voce già liquidata (liquidazione_id, D-35): resta nel suo trimestre, non scivola nel successivo
      const quando = b.chiuso_il ?? b.ricevuto;
      if (!qui(rb.liquidazione_id, quando)) continue;
      const n = documentoDiRiga(S, b, rb);
      if (!n) continue;
      const base = riga(n.pratica, n.doc, rb.tipo === 'storno' ? -1 : 1);
      if (!base) continue; // provvigione da decidere
      // D-35 §19: se il documento è già liquidato, la voce riprende subagente e provvigione della fotografia
      // di quella liquidazione (non quotaSub ricalcolato sull'agenzia attuale, che può essere cambiata) — A2-01.
      const foto = n.doc.liquidazione_id ? S.fotografie.get(n.doc.id) : undefined;
      out.push({
        ...base,
        ...(foto ? { subagente_id: foto.subagente_id, importo: rb.tipo === 'storno' ? foto.importo.neg() : foto.importo, pct: foto.pct, provvigione: rb.tipo === 'storno' ? foto.provvigione.neg() : foto.provvigione } : {}),
        data: quando, origine: n.doc.data, voce: rb.tipo, motivo: rb.tipo, bollettino_id: b.id, riga_bollettino_id: rb.id,
      });
    }
  }
  return out.sort((x, y) => x.data.localeCompare(y.data));
}
type RigaLiquidazione = ReturnType<typeof righeLiquidazione>[number];

/** Riepilogo per subagente (pagina Liquidazioni e foglio Riepilogo §11): imponibile e provvigione dei
 *  documenti liquidabili, provvigione in attesa, storni. */
export function riepilogoLiquidazione(S: Dati, righe: RigaLiquidazione[]) {
  const ids = [...new Set(righe.map((r) => r.subagente_id))];
  return ids.map((id) => {
    const rr = righe.filter((r) => r.subagente_id === id), liq = rr.filter((r) => r.liquidabile), att = rr.filter((r) => !r.liquidabile);
    return {
      subagente_id: id, nome: S.subagenti.get(id)?.nome ?? '', documenti: rr.length, liquidabili: liq.length,
      imponibile: r2(somma(liq.map((r) => r.importo))), provvigione: r2(somma(liq.map((r) => r.provvigione))),
      in_attesa: r2(somma(att.map((r) => r.provvigione))), storni: rr.filter((r) => r.voce === 'storno').length,
    };
  }).sort((x, y) => x.nome.localeCompare(y.nome));
}

/** Fotografia del prospetto alla chiusura (liquidazioni.totali, §4.2.19, D-33): importi come testo, niente virgola mobile.
 *  Le righe dei documenti restano quelle pagate: il trimestre chiuso si rilegge uguale anche se i dati cambiano dopo. */
export function fotografiaLiquidazione(S: Dati, righe: RigaLiquidazione[]) {
  const sub = riepilogoLiquidazione(S, righe);
  const testo = (x: Dec) => x.toFixed(2);
  return {
    subagenti: sub.map((s) => ({ ...s, imponibile: testo(s.imponibile), provvigione: testo(s.provvigione), in_attesa: testo(s.in_attesa) })),
    totale: { documenti: sub.reduce((n, s) => n + s.liquidabili, 0), imponibile: testo(r2(somma(sub.map((s) => s.imponibile)))), provvigione: testo(r2(somma(sub.map((s) => s.provvigione)))) },
    documenti: righe.map((r) => ({ ...r, importo: testo(r.importo), provvigione: testo(r.provvigione), pct: Number(r.pct) })),
  };
}

/* ---------- Analisi (§7.8, §7.22, D-19) ---------- */
/** Sintesi del trimestre sugli stessi documenti della liquidazione: fatturato, prese dai fornitori,
 *  pagate ai subagenti, margine. Importi di competenza, non incassati. */
export function analisiTrimestre(S: Dati, a: number, t: number) {
  const righe = righeLiquidazione(S, a, t);
  const nuovo = (chiave = '', nome = '') => ({ chiave, nome, fatturato: ZERO, prese: ZERO, pagate: ZERO, clienti: new Set<string>(), documenti: 0 });
  const tot = nuovo(), fornitori = new Map<string, ReturnType<typeof nuovo>>(), subagenti = new Map<string, ReturnType<typeof nuovo>>();
  for (const r of righe) {
    const p = indici(S).praticaPerId.get(r.pratica_id)!;
    // D-199 §19: per i documenti la presa è la provvigione effettiva (gruppi in modalità riga); per
    // storni e riaccrediti la quota sulla voce, con la stessa percentuale effettiva.
    const v = r.documento_id ? provvigioneDocumento(S, p, documentoPerId(S, r.documento_id)!.doc) : null;
    const prese = !r.voce && v ? (v.agente ?? ZERO) : quota(r.importo, v?.pct_agente ?? percentuali(S, p, r.origine ?? r.data)?.dal_fornitore ?? ZERO);
    if (!fornitori.has(r.fornitore_id)) fornitori.set(r.fornitore_id, nuovo(r.fornitore_id, S.fornitori.get(r.fornitore_id)!.nome));
    if (!subagenti.has(r.subagente_id)) subagenti.set(r.subagente_id, nuovo(r.subagente_id, S.subagenti.get(r.subagente_id)?.nome));
    const gruppi = [fornitori.get(r.fornitore_id)!, subagenti.get(r.subagente_id)!];
    for (const x of [tot, ...gruppi]) { x.fatturato = x.fatturato.plus(r.importo); x.prese = x.prese.plus(prese); x.pagate = x.pagate.plus(r.provvigione); }
    for (const x of gruppi) { x.clienti.add(r.cliente_id); if (!r.voce) x.documenti++; }
  }
  const fin = (x: ReturnType<typeof nuovo>) => ({
    chiave: x.chiave, nome: x.nome, fatturato: r2(x.fatturato), prese: r2(x.prese), pagate: r2(x.pagate), margine: r2(x.prese.minus(x.pagate)),
    clienti: x.clienti.size, documenti: x.documenti,
  });
  const ordina = (m: Map<string, ReturnType<typeof nuovo>>) => [...m.values()].map(fin).sort((x, y) => y.fatturato.comparedTo(x.fatturato));
  const { fatturato, prese, pagate, margine } = fin(tot);
  return { a, t, documenti: righe.filter((r) => !r.voce).length, totale: { fatturato, prese, pagate, margine }, fornitori: ordina(fornitori), subagenti: ordina(subagenti) };
}

/** Un fatto per documento fiscale (pagina Analisi): competenza = data del documento; storni e
 *  riaccrediti non sono fatti (D-19 §19); note di credito negative. */
export function fattiAnalisi(S: Dati) {
  const out = [];
  for (const p of S.pratiche) for (const d of p.documenti) {
    const pr = provvigioneDoc(S, p, d);
    if (!pr) continue;
    out.push({
      documento_id: d.id, numero: d.numero, data: d.data, mese: d.data.slice(0, 7), tipo: d.tipo, pratica_id: p.id,
      fornitore_id: p.fornitore_id, cliente_id: p.cliente_id, subagente_id: pr.perc.subagente_id,
      importo: pr.importo, prese: pr.prese, pagate: pr.pagate, margine: pr.margine,
    });
  }
  return out.sort((x, y) => x.data.localeCompare(y.data) || x.numero.localeCompare(y.numero));
}
