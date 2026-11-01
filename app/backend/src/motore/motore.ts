import { Prisma } from '@prisma/client';
import type { Dati } from './dati';

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
export const importoRighe = (righe: Riga[]) => r2(somma(righe.map((r) => r.importo)));
/** Netto della pratica: fatture − note di credito (§5.3). */
export const netto = (p: Pratica) => r2(somma(p.documenti.map((d) => d.importo)));
/** Netto se ci sono documenti fiscali, altrimenti conferma o ordine (solo stima). */
export const importoPratica = (p: Pratica) => (p.documenti.length ? netto(p) : importoRighe(p.conferma ? p.righe.conferma : p.righe.ordine));

/** Lo stato si ricava dai documenti arrivati, non si scrive a mano (§5.1). */
export function statoPratica(S: Dati, p: Pratica) {
  if (p.documenti.some((d) => d.tipo === 'fattura')) return { chiave: 'fatturata' as const };
  if (p.conferma) return { chiave: 'confermata' as const };
  const scadenza = piuGiorni(p.data, S.fornitori.get(p.fornitore_id)!.giorni_conferma);
  const g = giorni(S.oggi, scadenza);
  return { chiave: g < 0 ? ('scaduta' as const) : ('attesa' as const), scadenza, giorni: g };
}

/** Confronto delle righe fra le fasi, allineate per codice (§5.8). */
export function confronto(p: Pratica) {
  const fasi = (['ordine', 'conferma', 'fattura'] as const).filter((f) => p.righe[f].length).map((f) => p.righe[f]);
  const codici = [...new Set(fasi.flat().map((r) => r.codice))];
  return codici.map((codice) => {
    // ponytail: un codice ripetuto in due tranche conta la prima riga, come il prototipo
    const per = fasi.map((rr) => rr.find((r) => r.codice === codice) ?? null);
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

/* ---------- Percentuali (§5.1, §5.2, §5.11) ---------- */
/** Scaglione in vigore alla data: per ogni soglia la versione più recente con valido_dal ≤ data (D-25),
 *  poi la soglia più alta ≤ sconto. */
export function scaglione(S: Dati, fornitore_id: string, sconto: Dec, data: string) {
  const perSoglia = new Map<string, Dati['scaglioni'][number]>();
  for (const s of S.scaglioni) {
    if (s.fornitore_id !== fornitore_id || s.valido_dal > data) continue;
    const k = s.sconto.toString(), x = perSoglia.get(k);
    if (!x || x.valido_dal < s.valido_dal) perSoglia.set(k, s);
  }
  return [...perSoglia.values()].filter((s) => s.sconto.lte(sconto)).sort((a, b) => a.sconto.comparedTo(b.sconto)).pop() ?? null;
}

/** Chi segue il cliente su quel fornitore alla data del documento (D-35). */
export const abbinamento = (S: Dati, cliente_id: string, fornitore_id: string, data: string) =>
  S.interscambio.find((a) => a.cliente_id === cliente_id && a.fornitore_id === fornitore_id && a.valido_dal <= data && (!a.valido_al || data < a.valido_al)) ?? null;

/** Percentuali di una pratica alla data del documento: dal fornitore agente + subagente standard
 *  dello scaglione; al subagente la sua percentuale (eccezione personale, §5.2). */
export function percentuali(S: Dati, p: Pratica, data = p.data) {
  const ab = abbinamento(S, p.cliente_id, p.fornitore_id, data);
  if (!ab) return null;
  const sc = scaglione(S, p.fornitore_id, ab.sconto, data);
  if (!sc) return null;
  const ecc = S.eccezioni.find((e) => e.scaglione_id === sc.id && e.subagente_id === ab.subagente_id);
  return {
    ab, sconto: ab.sconto, scaglione: sc, subagente_id: ab.subagente_id,
    agente: sc.pct_agente, sub_standard: sc.pct_sub, sub: ecc ? ecc.pct : sc.pct_sub, eccezione: !!ecc,
    dal_fornitore: sc.pct_agente.plus(sc.pct_sub),
  };
}

/** Documento fiscale per id (D-34): la via normale quando il database ha il collegamento. */
export function documentoPerId(S: Dati, id: string) {
  for (const pratica of S.pratiche) {
    const doc = pratica.documenti.find((d) => d.id === id);
    if (doc) return { pratica, doc };
  }
  return null;
}

/** Documento fiscale per numero, nel fornitore se dato: solo dove l'id manca (riga di bollettino non
 *  ancora abbinata). Il numero da solo non identifica: un fornitore può riusarlo in un altro anno (D-34). */
export function trovaDocumento(S: Dati, numero: string, fornitore_id?: string) {
  for (const pratica of S.pratiche) {
    if (fornitore_id && pratica.fornitore_id !== fornitore_id) continue;
    const doc = pratica.documenti.find((d) => d.numero === numero);
    if (doc) return { pratica, doc };
  }
  return null;
}

/** "Una fattura al mese" (D-27): la prima o la più alta del mese per cliente × fornitore. */
export function fatturaDelMese(S: Dati, ab: Abbinamento, mese: string) {
  const ff = S.pratiche.filter((p) => p.cliente_id === ab.cliente_id && p.fornitore_id === ab.fornitore_id)
    .flatMap((p) => p.documenti.filter((d) => d.tipo === 'fattura' && d.data.slice(0, 7) === mese));
  ff.sort(ab.regola_mensile === 'piu_alta'
    ? (x, y) => y.importo.comparedTo(x.importo) || x.data.localeCompare(y.data)
    : (x, y) => x.data.localeCompare(y.data) || x.numero.localeCompare(y.numero));
  return ff[0] ?? null;
}

/** Quota del subagente su un documento (D-27 §19), vince la prima regola presente: correzione sul
 *  documento → una fattura al mese → % dell'agenzia → eccezione personale → % dello scaglione. */
export function quotaSub(S: Dati, p: Pratica, d: Documento) {
  const perc = percentuali(S, p, d.data);
  if (!perc) return null;
  const imp = d.importo;
  const q = (pct: Dec, regola: string, vale: string | null = null) => ({ pct, provvigione: quota(imp, pct), regola, vale });
  const cor = d.correzione;
  if (cor) {
    if (cor.tipo === 'importo') return { pct: imp.isZero() ? ZERO : r2(cor.valore.div(imp).times(100)), provvigione: r2(cor.valore), regola: 'correzione', vale: null };
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

/** Provvigioni di un documento: dal fornitore (prese), al subagente (pagate), margine di Decobrands. */
export function provvigioneDoc(S: Dati, p: Pratica, d: Documento) {
  const perc = percentuali(S, p, d.data);
  if (!perc) return null;
  const prese = quota(d.importo, perc.dal_fornitore), sub = quotaSub(S, p, d)!;
  return { perc, importo: d.importo, prese, sub, pagate: sub.provvigione, margine: r2(prese.minus(sub.provvigione)) };
}

/* ---------- Bollettini (§6.2, riconciliazione "a cerniera") ---------- */
export const fiscaliDelMese = (S: Dati, fornitore_id: string, mese: string) =>
  S.pratiche.filter((p) => p.fornitore_id === fornitore_id).flatMap((pratica) => pratica.documenti.filter((d) => d.data.slice(0, 7) === mese).map((doc) => ({ pratica, doc })));
export const bollettinoDi = (S: Dati, fornitore_id: string, a: number, m: number) =>
  S.bollettini.find((b) => b.fornitore_id === fornitore_id && b.anno === a && b.mese === m) ?? null;
/** La riga del bollettino è su quel documento? Per id se abbinata, altrimenti per numero nel fornitore (D-34). */
const suDocumento = (r: RigaBollettino, d: Documento) => (r.documento_id ? r.documento_id === d.id : r.numero === d.numero);
/** Documento di una riga di bollettino: per id se abbinata, altrimenti per numero. */
const documentoDiRiga = (S: Dati, b: Bollettino, r: RigaBollettino) => (r.documento_id ? documentoPerId(S, r.documento_id) : trovaDocumento(S, r.numero, b.fornitore_id));
/** Il documento è riconosciuto in un bollettino verificato? (maturato, §5.14) */
export const riconosciutoIn = (S: Dati, d: Documento, fornitore_id: string) =>
  S.bollettini.find((b) => b.fornitore_id === fornitore_id && b.stato === 'verificato' && b.righe.some((r) => suDocumento(r, d))) ?? null;
/** Righe dei bollettini su un documento, dal mese più vecchio. */
export const righeBollettinoDi = (S: Dati, d: Documento, fornitore_id: string) =>
  S.bollettini.filter((b) => b.fornitore_id === fornitore_id).flatMap((b) => b.righe.filter((r) => suDocumento(r, d)).map((r) => ({ b, r })))
    .sort((x, y) => x.b.anno * 100 + x.b.mese - (y.b.anno * 100 + y.b.mese));

type Lato = { imponibile: Dec | null; pct: Dec | null; importo: Dec };
/** Riconciliazione riga per riga: fornitore (loro) contro calcolo del CRM (noi). */
export function riconcilia(S: Dati, b: Bollettino) {
  const f = S.fornitori.get(b.fornitore_id)!, maturato = f.maturazione === 'maturato', meseB = aaaamm(b.anno, b.mese);
  const nostri = fiscaliDelMese(S, b.fornitore_id, meseB);
  const righe = b.righe.map((r) => {
    const n = r.documento_id ? documentoPerId(S, r.documento_id) : (nostri.find((x) => x.doc.numero === r.numero) ?? trovaDocumento(S, r.numero, b.fornitore_id));
    const riga = {
      numero: r.numero, data: r.data, pratica_id: n?.pratica.id ?? null, cliente_id: n?.pratica.cliente_id ?? null, tipo: n?.doc.tipo ?? null,
      loro: { imponibile: r.imponibile, pct: r.pct, importo: r.importo } as Lato | null, noi: null as Lato | null, differenza: null as Dec | null,
      categoria: 'sconosciuta', incasso: false, pagamento: false, pagata_in: null as string | null, giorni: null as number | null,
      decisione: r.decisione as { esito: string; motivo: string | null } | null,
    };
    if (!n) return riga;
    const perc = percentuali(S, n.pratica, n.doc.data), pct = perc ? perc.dal_fornitore : ZERO;
    if (r.tipo) {
      // §5.14: storno (il cliente non ha pagato) e riaccredito (ha pagato) sul fatturato: non sono differenze da decidere
      const imp = r.tipo === 'storno' ? n.doc.importo.neg() : n.doc.importo;
      riga.noi = { imponibile: imp, pct, importo: perc ? quota(imp, pct) : ZERO };
      riga.differenza = r2(r.importo.minus(riga.noi.importo));
      riga.categoria = r.tipo; riga.incasso = true;
      return riga;
    }
    const imp = n.doc.importo;
    // mese verificato: valgono i valori congelati (§5.11)
    riga.noi = r.importo_calcolato != null ? { imponibile: imp, pct: r.pct_calcolata, importo: r.importo_calcolato } : { imponibile: imp, pct, importo: perc ? quota(imp, pct) : ZERO };
    riga.differenza = r2(r.importo.minus(riga.noi.importo));
    riga.categoria = riga.differenza.isZero() && r.imponibile?.equals(imp) ? 'quadra' : 'differenza';
    // maturato: fattura di un mese precedente riconosciuta nel mese in cui il cliente ha pagato
    riga.pagamento = riga.categoria === 'quadra' && n.doc.data.slice(0, 7) < meseB && maturato;
    return riga;
  });
  for (const x of nostri.filter((x) => !b.righe.some((r) => suDocumento(r, x.doc)))) {
    const perc = percentuali(S, x.pratica, x.doc.data), pct = perc ? perc.dal_fornitore : ZERO;
    const atteso = perc ? quota(x.doc.importo, pct) : ZERO;
    const riga = {
      numero: x.doc.numero, data: x.doc.data, pratica_id: x.pratica.id, cliente_id: x.pratica.cliente_id, tipo: x.doc.tipo,
      loro: null as Lato | null, noi: { imponibile: x.doc.importo, pct, importo: atteso } as Lato | null, differenza: atteso.neg() as Dec | null,
      categoria: 'mancante', incasso: false, pagamento: false, pagata_in: null as string | null, giorni: null as number | null,
      // ponytail: un documento che manca nel bollettino non ha una riga dove salvare "attendere": la crea F3 alla decisione
      decisione: null as { esito: string; motivo: string | null } | null,
    };
    // maturato (§5.14): una fattura assente non è "mancante": il cliente non ha ancora pagato
    if (maturato && x.doc.tipo === 'fattura') {
      const pag = S.bollettini.find((o) => o !== b && o.fornitore_id === b.fornitore_id && o.righe.some((r) => suDocumento(r, x.doc)));
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
  let st: { stato: string; dal: string | null; bollettino_id: string | null; manuale: boolean };
  if (f.maturazione === 'maturato') {
    const ric = rb.find((x) => !x.r.tipo && x.b.stato === 'verificato');
    st = ric ? { stato: 'pagata', dal: aaaamm(ric.b.anno, ric.b.mese) + '-01', bollettino_id: ric.b.id, manuale: false }
      : { stato: gg > limite ? 'da_verificare' : 'da_incassare', dal: null, bollettino_id: null, manuale: false };
  } else if (ultimo) {
    st = { stato: ultimo.r.tipo === 'storno' ? 'insoluta' : 'pagata', dal: ultimo.b.ricevuto, bollettino_id: ultimo.b.id, manuale: false };
  } else st = { stato: 'da_incassare', dal: null, bollettino_id: null, manuale: false };
  if (d.incasso && (!st.dal || d.incasso.dal >= st.dal)) st = { stato: d.incasso.stato, dal: d.incasso.dal, bollettino_id: null, manuale: true };
  return { ...st, giorni: gg, limite, solleciti: d.solleciti, sollecitata_il: d.sollecitata_il };
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
    return {
      pratica_id: p.id, documento_id: d.id, numero: d.numero, tipo: d.tipo, data: d.data, origine: null as string | null,
      fornitore_id: p.fornitore_id, subagente_id: perc.subagente_id, cliente_id: p.cliente_id, codice_cliente: perc.ab.codice,
      importo: segno < 0 ? d.importo.neg() : d.importo, pct: q.pct, provvigione: segno < 0 ? q.provvigione.neg() : q.provvigione,
      regola: q.regola, eccezione: q.regola === 'eccezione',
      liquidabile: true, incasso: false, motivo: null as string | null, voce: null as string | null, bollettino_id: null as string | null, riga_bollettino_id: null as string | null,
    };
  };
  for (const p of S.pratiche) for (const d of p.documenti) {
    if (!percentuali(S, p, d.data)) continue;
    const r = riga(p, d, 1);
    if (S.fornitori.get(p.fornitore_id)!.maturazione === 'maturato') {
      // maturato→maturato (§5.14): entra nel trimestre del bollettino che la riconosce (il mese in cui il cliente paga)
      const b = riconosciutoIn(S, d, p.fornitore_id);
      if (b) { if (!nelTrimestre(aaaamm(b.anno, b.mese) + '-01')) continue; }
      else {
        if (!nelTrimestre(d.data)) continue;
        r.liquidabile = false;
        const bm = bollettinoDi(S, p.fornitore_id, Number(d.data.slice(0, 4)), Number(d.data.slice(5, 7)));
        const ric = righeBollettinoDi(S, d, p.fornitore_id)[0];
        if (bm && bm.stato === 'verificato' && !ric) { r.incasso = true; r.motivo = 'attesa_incasso'; r.bollettino_id = bm.id; }
        else { r.motivo = ric || bm ? 'bollettino_da_verificare' : 'non_riconosciuta'; r.bollettino_id = (ric?.b ?? bm)?.id ?? null; }
      }
    } else if (!nelTrimestre(d.data)) continue;
    out.push(r);
  }
  // storni e riaccrediti (fatturato, §5.14, D-11): al subagente nella prima liquidazione ancora aperta
  // dopo la chiusura del bollettino, come voce negativa (storno) o positiva (riaccredito)
  for (const b of S.bollettini) {
    if (b.stato === 'da_verificare') continue;
    for (const rb of b.righe) {
      if (!rb.tipo) continue;
      const quando = b.chiuso_il ?? b.ricevuto, dest = trimestreLiquidazione(S, quando);
      if (dest.a !== a || dest.t !== t) continue;
      const n = documentoDiRiga(S, b, rb);
      if (!n || !percentuali(S, n.pratica, n.doc.data)) continue;
      out.push({ ...riga(n.pratica, n.doc, rb.tipo === 'storno' ? -1 : 1), data: quando, origine: n.doc.data, voce: rb.tipo, motivo: rb.tipo, bollettino_id: b.id, riga_bollettino_id: rb.id });
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

/** Fotografia del prospetto alla chiusura (liquidazioni.totali, §4.2.19, D-33): importi come testo, niente virgola mobile. */
export function fotografiaLiquidazione(S: Dati, righe: RigaLiquidazione[]) {
  const sub = riepilogoLiquidazione(S, righe);
  const testo = (x: Dec) => x.toFixed(2);
  return {
    subagenti: sub.map((s) => ({ ...s, imponibile: testo(s.imponibile), provvigione: testo(s.provvigione), in_attesa: testo(s.in_attesa) })),
    totale: { documenti: sub.reduce((n, s) => n + s.liquidabili, 0), imponibile: testo(r2(somma(sub.map((s) => s.imponibile)))), provvigione: testo(r2(somma(sub.map((s) => s.provvigione)))) },
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
    const p = S.pratiche.find((x) => x.id === r.pratica_id)!;
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
