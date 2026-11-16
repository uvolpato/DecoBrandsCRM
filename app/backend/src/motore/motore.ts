import { Prisma } from '@prisma/client';
import { costruisciIndici, scegliDocumento } from './dati';
import type { CalcoloDocumento, Dati } from './dati';

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

/** Scaglione in vigore alla data: il primo (più basso) ≥ sconto medio (D-182 §19). Senza (sconto oltre
 *  l'ultima soglia) → null: la provvigione resta «da decidere», mai calcolata su uno scaglione inventato. */
export function scaglione(S: Pick<Dati, 'scaglioni'>, fornitore_id: string, sconto: Dec, data: string) {
  return soglieInVigore(S, fornitore_id, data).filter((s) => s.sconto.gte(sconto)).sort((a, b) => a.sconto.comparedTo(b.sconto))[0] ?? null;
}

/** L'ultimo (più alto) scaglione del fornitore in vigore alla data, o null se non ce n'è. */
export function ultimoScaglione(S: Pick<Dati, 'scaglioni'>, fornitore_id: string, data: string) {
  return soglieInVigore(S, fornitore_id, data).sort((a, b) => b.sconto.comparedTo(a.sconto))[0] ?? null;
}

/** Sconto medio oltre l'ultimo scaglione del fornitore: anomalia (D-182 §19). null se non c'è o lo sconto
 *  medio è ignoto (si usa lo sconto dell'agenzia). Il numero è quello del documento che comanda. */
export function anomaliaScontoMedio(S: Pick<Dati, 'scaglioni'>, p: Pratica) {
  const sm = scontoMedio(p);
  if (sm == null) return null;
  const data = p.documenti[p.documenti.length - 1]?.data ?? p.data;
  const ultimo = ultimoScaglione(S, p.fornitore_id, data);
  if (!ultimo || sm.lte(ultimo.sconto)) return null;
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

/** Quota del subagente su un documento (D-27 §19), vince la prima regola presente: correzione sul
 *  documento → una fattura al mese → % dell'agenzia → eccezione personale → % dello scaglione. */
export function quotaSub(S: Dati, p: Pratica, d: Documento, base?: Dec) {
  const perc = percentuali(S, p, d.data);
  if (!perc) return null;
  const imp = base ?? baseDoc(d); // D-183: la quota si calcola sulla base (netto − spese escluse)
  const q = (pct: Dec, regola: string, vale: string | null = null) => ({ pct, provvigione: quota(imp, pct), regola, vale });
  const cor = d.correzione;
  if (cor) {
    if (cor.tipo === 'importo') {
      // D-27 §19: l'importo fisso è sempre positivo (come lo salva il server); su una nota di credito
      // (importo negativo) va preso col segno invertito, per ridurre e non dare (A2-03).
      const v = imp.isNegative() ? cor.valore.neg() : cor.valore;
      return { pct: imp.isZero() ? ZERO : r2(v.div(imp).times(100)), provvigione: r2(v), regola: 'correzione', vale: null };
    }
    return q(cor.tipo === 'nessuna' ? ZERO : cor.valore, 'correzione');
  }
  if (perc.ab.regola_mensile) {
    // le note di credito seguono la fattura a cui si riferiscono
    const rif = d.tipo === 'nota_credito' && d.fattura_id ? (documentoPerId(S, d.fattura_id)?.doc ?? d) : d;
    const scelta = fatturaDelMese(S, perc.ab, rif.data.slice(0, 7));
    if (scelta && scelta.id !== rif.id) return q(ZERO, 'mensile', scelta.numero);
  }
  if (perc.ab.pct_subagente != null) return q(perc.ab.pct_subagente, 'agenzia');
  return q(perc.sub, perc.eccezione ? 'eccezione' : 'standard');
}

/** Provvigioni di un documento: dal fornitore (prese), al subagente (pagate), margine di Decobrands.
 *  D-197 §19: per una nota su fattura congelata prese e pagate sono la differenza della coppia. */
export function provvigioneDoc(S: Dati, p: Pratica, d: Documento, base?: Dec) {
  const perc = percentuali(S, p, d.data);
  if (!perc) return null;
  const imp = base ?? baseDoc(d); // D-183: sulla base (netto − spese escluse)
  const diff = differenzaNotaCongelata(S, p, d);
  const prese = diff ? diff.agente : quota(imp, perc.dal_fornitore);
  const sub = quotaSub(S, p, d, imp)!;
  const pagate = diff ? diff.subagente : sub.provvigione;
  return { perc, importo: imp, prese, sub, pagate, margine: r2(prese.minus(pagate)) };
}

/** D-197 §19: una nota di credito su una fattura **congelata** porta la **differenza** fra la provvigione
 *  della coppia (fattura − note, con lo scaglione della differenza) e i valori già fissati (fattura + note
 *  già congelate), per Decobrands e per il subagente. Null se non è una nota, se la fattura non è congelata
 *  o se mancano le percentuali. La base della coppia usa la base della nota (netto + spese, D-197) e le basi
 *  salvate degli altri documenti. */
export function differenzaNotaCongelata(S: Dati, p: Pratica, d: Documento) {
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

/** Punto unico di calcolo dei valori salvati di un documento fiscale (D-183 §19): base = netto − spese
 *  escluse (secondo l'accordo col fornitore), sconto medio solo sulla merce, scaglione, percentuali e
 *  provvigioni. Riusa `percentuali` e `quotaSub`. Il server lo calcola sugli aperti e salva il JSON;
 *  i congelati non si toccano. */
export function calcoloDocumento(S: Dati, p: Pratica, d: Documento): CalcoloDocumento {
  const perc = percentuali(S, p, d.data);
  const spese = speseEscluse(S, p, d);
  // D-197 §19: le spese della nota riducono quelle della fattura, quindi la base della nota è netto + spese
  // (netto negativo + spese escluse che tornano dentro). Per la fattura resta netto − spese. La somma delle
  // basi dà la base della differenza (coppia fattura + note).
  const base = d.tipo === 'nota_credito' ? r2(d.importo.plus(spese)) : r2(d.importo.minus(spese));
  const sm = scontoMedio(p);
  const q = perc ? quotaSub(S, p, d, base) : null;
  // D-197 §19: nota su fattura congelata → la provvigione è la differenza (coppia − fissato), non base × pct
  const diff = differenzaNotaCongelata(S, p, d);
  return {
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
    const perc = percentuali(S, n.pratica, n.doc.data), pct = perc ? perc.dal_fornitore : ZERO;
    if (r.tipo) {
      // §5.14: storno (il cliente non ha pagato) e riaccredito (ha pagato) sul fatturato: non sono differenze da decidere
      const imp = r.tipo === 'storno' ? baseDoc(n.doc).neg() : baseDoc(n.doc);
      riga.noi = { imponibile: imp, pct, importo: perc ? quota(imp, pct) : ZERO };
      riga.differenza = r2(r.importo.minus(riga.noi.importo));
      riga.categoria = r.tipo; riga.incasso = true;
      return riga;
    }
    const imp = baseDoc(n.doc);
    // mese verificato: valgono i valori congelati (§5.11)
    // D-197 §19: nota su fattura congelata → il «noi» della nota è la differenza della coppia
    const diff = differenzaNotaCongelata(S, n.pratica, n.doc);
    riga.noi = r.importo_calcolato != null ? { imponibile: imp, pct: r.pct_calcolata, importo: r.importo_calcolato } : { imponibile: imp, pct, importo: perc ? (diff ? diff.agente : quota(imp, pct)) : ZERO };
    riga.differenza = r2(r.importo.minus(riga.noi.importo));
    riga.categoria = riga.differenza.isZero() && r.imponibile?.equals(imp) ? 'quadra' : 'differenza';
    // maturato: fattura di un mese precedente riconosciuta nel mese in cui il cliente ha pagato
    riga.pagamento = riga.categoria === 'quadra' && n.doc.data.slice(0, 7) < meseB && maturato;
    return riga;
  });
  for (const x of nostri.filter((x) => !b.righe.some((r) => suDocumento(S, b, r, x.doc)))) {
    const perc = percentuali(S, x.pratica, x.doc.data), pct = perc ? perc.dal_fornitore : ZERO;
    // D-197 §19: nota su fattura congelata → l'atteso della nota è la differenza della coppia
    const atteso = perc ? (differenzaNotaCongelata(S, x.pratica, x.doc)?.agente ?? quota(baseDoc(x.doc), pct)) : ZERO;
    // la decisione su un documento assente sta in bollettini_attese (D-56 §19); vale solo qui, finché manca
    const attesa = b.attese.find((a) => a.documento_id === x.doc.id) ?? null;
    const riga = {
      id: null as string | null, documento_id: x.doc.id as string | null,
      numero: x.doc.numero, data: x.doc.data, pratica_id: x.pratica.id, cliente_id: x.pratica.cliente_id, tipo: x.doc.tipo,
      loro: null as Lato | null, noi: { imponibile: baseDoc(x.doc), pct, importo: atteso } as Lato | null, differenza: atteso.neg() as Dec | null,
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
    const perc = percentuali(S, p, d.data)!, q = quotaSub(S, p, d)!;
    // D-197 §19: nota su fattura congelata → al subagente va la differenza, non base × pct
    const diff = differenzaNotaCongelata(S, p, d);
    const prov = diff ? diff.subagente : q.provvigione;
    return {
      pratica_id: p.id, documento_id: d.id, numero: d.numero, tipo: d.tipo, data: d.data, origine: null as string | null,
      fornitore_id: p.fornitore_id, subagente_id: perc.subagente_id, cliente_id: p.cliente_id, codice_cliente: perc.ab.codice,
      importo: segno < 0 ? baseDoc(d).neg() : baseDoc(d), pct: q.pct, provvigione: segno < 0 ? prov.neg() : prov,
      regola: q.regola, eccezione: q.regola === 'eccezione',
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
    if (!percentuali(S, p, d.data)) continue;
    const r = riga(p, d, 1);
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
      if (!n || !percentuali(S, n.pratica, n.doc.data)) continue;
      const base = riga(n.pratica, n.doc, rb.tipo === 'storno' ? -1 : 1);
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
    const perc = percentuali(S, p, r.origine ?? r.data);
    const prese = perc ? quota(r.importo, perc.dal_fornitore) : ZERO;
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
