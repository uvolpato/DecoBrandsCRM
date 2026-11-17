import { Prisma, PrismaClient } from '@prisma/client';
import { letturaConfig } from './impostazioni';
import { fiscale, iso } from './motore/dati';
import { normalizzaPiva as pivaNormalizzata } from './soggetti';

// F6-A3 (§6.5 punti 5–6, D-71): livello del documento, controlli fissi e proposta di abbinamento.
// Funzioni senza rotte: le userà F6-A4 per la schermata Documenti e `lettura.ts` per il salvataggio.
// Tutto sul server, dal database (V12): la proposta si mostra, decide la persona (F6-A4).

type Db = Prisma.TransactionClient | PrismaClient;
const Dec = Prisma.Decimal;
const ZERO = new Dec(0);

/* ---------- Numeri e date difensive: valore non valido → null, mai eccezione ---------- */
const round2 = (n: number) => Math.round(n * 100) / 100;
const euro = (n: number) => n.toFixed(2).replace('.', ',') + ' €';
const num = (v: string | null): number | null => {
  if (v == null) return null;
  const t = String(v).trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};
const dataValida = (v: string | null): string | null => {
  if (v == null) return null;
  const t = String(v).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
};
const intero = (v: string | null): number | null => {
  const n = num(v);
  return n != null && Number.isInteger(n) ? n : null;
};
const bool = (v: string | null): boolean | null => {
  if (v == null) return null;
  const t = String(v).trim().toLowerCase();
  return t === 'true' || t === '1' ? true : t === 'false' || t === '0' ? false : null;
};

/* ---------- Forma del documento letto ---------- */
export interface RigaLetta {
  codice: string | null;
  descrizione: string | null;
  quantita: number | null;
  prezzo: number | null;
  importo: number | null;
  sconto: number | null; // sconto di riga in percentuale (es. 10 = 10%); null se assente
  numero_fattura: string | null;
  data_fattura: string | null;
  provvigione: number | null;
  quota_pagata: number | null; // % pagata della fattura nel bollettino (es. «% bezahlt»); null se non c'è la colonna
  /** True se la riga è una spesa (trasporto, imballo, «Fracht») e non un articolo: si copia come riga ma non è merce. */
  spesa?: boolean | null;
}

export interface Letto {
  tipo: string | null;
  fornitore_id: bigint | null;
  fornitore: string | null; // nome del fornitore letto (D-152: per i candidati dal CRM quando non è riconosciuto)
  numero: string | null;
  /** D-169: numero d'ordine del fornitore: per l'ordine è il suo numero, per proforma/conferma/fattura/nota il riferimento all'ordine. */
  numero_ordine_fornitore: string | null;
  data: string | null;
  codice_cliente: string | null;
  cliente: string | null;
  /** Cliente scelto a mano nella correzione (campo `cliente_id`): certo, vince su codice/P.IVA/nome. */
  cliente_id: string | null;
  piva_cliente: string | null;
  piva_fornitore?: string | null; // D-154: campo letto nuovo, può mancare sui documenti letti prima
  importo: number | null; // importo_totale letto (imponibile stampato)
  mese: number | null;
  anno: number | null;
  riferimento_fattura: string | null;
  righe: RigaLetta[];
}

export interface Abbinamento {
  cliente_id: bigint;
  cliente: string | null;
  codice: string | null;
}

export interface Candidato {
  pratica: { id: string; numero: string; cliente: string | null; stato: string; data_ordine: string };
  punteggio: number;
  motivi: string[];
  delta: number;
  /** D-174: suggerimento per conferma/proforma su una pratica che ne ha già una (null = prima conferma, nessuna scelta). */
  ruolo: 'parziale' | 'sostituisce' | null;
}

/** D-204: documento già registrato nella pratica con lo stesso numero e fornitore (ordine, conferma o
 *  proforma): la versione aggiornata può sostituirlo. Porta i dati della versione registrata per il
 *  confronto prima → dopo della finestra «Sostituisci». */
export interface DocumentoDoppio {
  tipo: string;
  pratica_id: string;
  pratica_numero: string;
  documento_id: string;
  numero: string;
  data: string;
  importo: number;
  righe: number;
  cliente: string | null;
}

/** D-169: la pratica trovata per numero d'ordine del fornitore (chiave fornitore + numero, mai il numero da solo). */
export interface PraticaOrdine {
  id: string;
  numero: string; // numero della pratica (OF/2026/001)
  numero_ordine_fornitore: string; // es. AU276839
  cliente: string | null;
  cliente_id: bigint;
  fornitore: string | null;
  fornitore_id: bigint;
  stato: string;
  data_ordine: string;
}

export type Esito = 'doppio' | 'bollettino' | 'nuova' | 'certo' | 'probabile' | 'ambiguo' | 'nessuno' | 'manca_agenzia' | 'manca_rappresentanza' | 'fornitore_da_integra' | 'cliente_da_integra' | 'fornitore_da_scegliere' | 'cliente_da_scegliere';

/** Filtro per stato delle pratiche suggerite nella scheda «Pratica proposta» (D-178 §19): il browser
 *  manda solo la scelta (lista chiusa), il server filtra le candidate prima di ordinarle (V12). */
export const STATI_PRATICHE = ['aperte', 'tutte', 'solo_ordine', 'confermata', 'fatturata'] as const;
export type FiltroPratiche = (typeof STATI_PRATICHE)[number];
// lo stato del candidato è il valore della colonna (inviato|confermato|fatturato, §4.2.7): «aperte» = non fatturate
const STATO_FILTRO: Record<FiltroPratiche, string[]> = {
  aperte: ['inviato', 'confermato'],
  tutte: [],
  solo_ordine: ['inviato'],
  confermata: ['confermato'],
  fatturata: ['fatturato'],
};
export const filtraPratiche = (c: Candidato[], filtro: FiltroPratiche) => {
  const stati = STATO_FILTRO[filtro];
  return stati.length ? c.filter((x) => stati.includes(x.pratica.stato)) : c;
};

/** Filtro per stato predefinito per tipo di documento (15/11/2026): una nota di credito storna una
 *  fattura e un pagamento ne salda una, quindi cercano le pratiche già fatturate; gli altri tipi
 *  cercano le aperte. Il server lo sceglie dal tipo quando il browser non manda `filtro` (V12). */
export const filtroDalTipo = (tipo: string | null): FiltroPratiche =>
  tipo === 'nota_credito' || tipo === 'pagamento' ? 'fatturata' : 'aperte';

/** Un soggetto candidato da scegliere per il documento (D-152): dal CRM o dalle viste di Integra. */
export interface CandidatoSoggetto {
  fonte: 'crm' | 'integra';
  id: string; // CRM: id del ruolo; Integra: id_integra
  ragione_sociale: string | null;
  piva: string | null;
  citta: string | null;
  motivo: 'P.IVA uguale' | 'nome simile';
  /** D-164: somiglianza del nome (0–1) per i candidati proposti per nome simile. */
  punteggio?: number | null;
}

/** D-106: cliente e fornitore riconosciuti ma senza agenzia valida alla data del documento. */
export interface AgenziaMancante {
  cliente_id: bigint;
  fornitore_id: bigint;
  cliente: string | null;
  fornitore: string | null;
  codice_cliente: string | null;
  data: string | null;
}

/** Una riga delle viste di Integra come la cerca `GET /api/integra/cerca` (D-111). */
export interface RigaIntegra {
  id_integra: number;
  ragione_sociale: string | null;
  piva: string | null;
}

/** Una riga dello storico dei legami del vecchio CRM, ridotta ai campi della proposta (D-112). */
export interface RigaStorico {
  cliente_codice_fornitore: string | null;
  cliente_ragione_sociale: string | null;
  cliente_piva: string | null;
  subagente_nome: string | null;
  sconto: number;
  rappresentato: boolean; // D-112: falso = fornitore senza rappresentanza per il cliente
}

/** Contesto che `documenti.ts` prepara (Integra e storico) e passa a `propostaDocumento` (D-111/D-112).
 *  `propostaDocumento` resta pura: qui non si tocca né il ponte né lo storico. */
export interface Contesto {
  fornitore_su_integra?: RigaIntegra[];
  cliente_su_integra?: RigaIntegra[];
  storico?: RigaStorico[];
  /** D-152: il ponte di Integra non ha risposto → candidati solo dal CRM e una nota, niente errore. */
  integra_non_raggiungibile?: boolean;
}

export interface Proposta {
  esito: Esito;
  candidati: Candidato[];
  importo: number;
  abbinamento: Abbinamento | null;
  /** Cliente riconosciuto per P.IVA o ragione sociale (D-92) quando il codice del fornitore non è abbinato. */
  cliente_riconosciuto: { cliente_id: bigint; ragione: string | null } | null;
  /** D-106: senza agenzia il documento non entra in pratica; porta i dati per configurarla dal documento. */
  agenzia_mancante: AgenziaMancante | null;
  /** D-111: fornitore letto non in anagrafica, una sola riga delle viste di Integra. */
  fornitore_da_integra: { id_integra: number; ragione_sociale: string | null; piva: string | null } | null;
  /** D-111/D-112: cliente non riconosciuto, candidato in Integra o nel vecchio CRM, con subagente e sconto dello storico. */
  cliente_da_integra: { id_integra: number | null; ragione_sociale: string | null; piva: string | null; subagente: string | null; sconto: number | null } | null;
  /** D-112: coppia cliente-fornitore nello storico senza subagente (non rappresentata). */
  manca_rappresentanza: { cliente: string | null; fornitore: string | null; codice_cliente: string | null } | null;
  /** D-152: fornitore non riconosciuto in modo univoco → candidati dal CRM e da Integra da scegliere. */
  candidati_fornitore: CandidatoSoggetto[];
  /** D-152: cliente non riconosciuto in modo univoco → candidati dal CRM e da Integra da scegliere. */
  candidati_cliente: CandidatoSoggetto[];
  /** D-152: il ponte di Integra non ha risposto (i candidati sono solo del CRM). */
  integra_non_raggiungibile: boolean;
  /** D-169: la pratica trovata per numero d'ordine del fornitore; `cliente_coincide` dice se il cliente
   *  del documento è quello della pratica (false/null → punto da controllare, mai un abbinamento al cliente da solo). */
  pratica_ordine: { pratica: PraticaOrdine; cliente_coincide: boolean | null } | null;
  /** D-204: documento già registrato (ordine/conferma/proforma) da poter sostituire; null per fattura e nota di credito. */
  doppio: DocumentoDoppio | null;
}

export interface Controllo {
  codice: string;
  campo: string;
  testo: string;
  grave: boolean;
  /** D-176: distingue i punti sui dati letti da quelli sull'abbinamento, per separarli nell'elenco e in Correggi. */
  gruppo: 'lettura' | 'confronto';
}

export interface Soglie {
  soglia_ok: number;
  soglia_bassa: number;
}

export interface Valutazione {
  campi: string[];
  controlli: Controllo[];
  n: number;
  livello: 'affidabile' | 'da_controllare' | 'bassa';
}

/* ---------- Costruzione del Letto dai campi ---------- */
/** Letto dai campi di `documenti_campi` (valori testo) + tipo e fornitore già salvati sulla riga. */
export async function lettoDaCampi(db: Db, documento_id: bigint): Promise<Letto> {
  const [d, campi] = await Promise.all([
    db.documenti_in_arrivo.findUnique({ where: { id: documento_id }, select: { tipo: true, fornitore_id: true } }),
    db.documenti_campi.findMany({ where: { documento_id }, orderBy: { id: 'asc' } }),
  ]);
  // §6.5 punto 7, D-72: la correzione conta; si legge il valore finale quando c'è
  const m = new Map(campi.map((c) => [c.campo, c.valore_finale ?? c.valore_letto]));
  return componiLetto(d?.tipo ?? null, d?.fornitore_id ?? null, m);
}

function componiLetto(tipo: string | null, fornitore_id: bigint | null, m: Map<string, string | null>): Letto {
  const valore = (c: string) => m.get(c) ?? null;
  const righe: RigaLetta[] = [];
  for (let i = 0; ; i++) {
    const p = `righe[${i}].`;
    const quantita = num(valore(p + 'quantita'));
    const prezzo = num(valore(p + 'prezzo'));
    let importo = num(valore(p + 'importo'));
    // D-179 §19: importo 0 su una riga che vale (quantità × prezzo > 0) è uno 0 del lettore (colonna
    // non letta riempita con 0), non un importo vero: resta vuoto e la riga risulta calcolata. Uno 0
    // vero (riga omaggio con prezzo 0) si tiene.
    if (importo === 0 && quantita != null && prezzo != null && quantita * prezzo > 0) importo = null;
    const r: RigaLetta = {
      codice: valore(p + 'codice'), descrizione: valore(p + 'descrizione'),
      quantita, prezzo, importo, sconto: num(valore(p + 'sconto')),
      numero_fattura: valore(p + 'numero_fattura'), data_fattura: dataValida(valore(p + 'data_fattura')), provvigione: num(valore(p + 'provvigione')),
      quota_pagata: num(valore(p + 'quota_pagata')),
      spesa: bool(valore(p + 'spesa')),
    };
    if (Object.values(r).every((x) => x == null)) break;
    righe.push(r);
  }
  return {
    tipo, fornitore_id, fornitore: valore('fornitore'),
    numero: valore('numero'), numero_ordine_fornitore: valore('numero_ordine_fornitore'), data: dataValida(valore('data')), codice_cliente: valore('codice_cliente'), cliente: valore('cliente'), cliente_id: valore('cliente_id'), piva_cliente: valore('piva_cliente'), piva_fornitore: valore('piva_fornitore'),
    importo: num(valore('importo_totale')),
    mese: intero(valore('mese')), anno: intero(valore('anno')), riferimento_fattura: valore('riferimento_fattura'),
    righe,
  };
}

/** Fattore di sconto di riga (es. sconto 10 → 0,9): senza sconto resta 1. */
export const fattoreSconto = (r: RigaLetta) => 1 - (r.sconto ?? 0) / 100;
/** Importo della riga come nel prototipo (M.importoRiga): quello letto, altrimenti quantità × prezzo × (1 − sconto/100). */
const importoRigaLetta = (r: RigaLetta) => r.importo ?? (r.quantita != null && r.prezzo != null ? round2(r.quantita * r.prezzo * fattoreSconto(r)) : 0);
/** Somma delle righe (M.importoDoc). Per il bollettino il **totale riconosciuto** è la somma delle
 *  provvigioni delle fatture del mese (§7.9), non degli imponibili (D-73). */
const importoDocumento = (l: Letto) =>
  l.tipo === 'bollettino'
    ? round2(l.righe.reduce((s, r) => s + (r.provvigione ?? 0), 0))
    : round2(l.righe.reduce((s, r) => s + importoRigaLetta(r), 0));

/* ---------- Fornitore per nome normalizzato ---------- */
/** Nome normalizzato (D-71): minuscole, senza accenti, punteggiatura e spazi ridotti. Le sigle societarie restano lettere. */
export function normalizzaNome(s: string): string {
  return s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}

/** Versione corrente del fornitore il cui nome normalizzato coincide; nessun match o più di uno → null.
 *  Se il nome letto è troncato (il modello a volte perde una parola, D-71) si riprova senza le sigle
 *  societarie, accettando un nome contenuto nell'altro solo quando il match è unico. Niente distanza
 *  di modifica: resta un confronto per parole intere. */
export async function risolviFornitore(db: Db, nome: string): Promise<{ fornitore_id: bigint; fornitore_versione_id: bigint } | null> {
  const t = normalizzaNome(nome ?? '');
  if (!t) return null;
  // D-164: vocabolario imparato (l'operatore ha già scelto questo nome a mano per un fornitore)
  const alias = await db.alias_letti.findUnique({ where: { tipo_nome_normalizzato: { tipo: 'fornitore', nome_normalizzato: t } } });
  if (alias) {
    const f = await db.fornitori.findUnique({ where: { id: alias.ruolo_id }, select: { versione_corrente_id: true } });
    if (f?.versione_corrente_id) return { fornitore_id: alias.ruolo_id, fornitore_versione_id: f.versione_corrente_id };
  }
  const fornitori = await db.fornitori.findMany({ where: { versione_corrente_id: { not: null } }, include: { corrente: true } });
  const esatti = fornitori.filter((f) => f.corrente && normalizzaNome(f.corrente.ragione_sociale) === t);
  const scelti = esatti.length ? esatti : [];
  if (!scelti.length) {
    const t2 = senzaSigle(nome);
    if (t2.length >= 3) {
      const larga = fornitori.filter((f) => {
        if (!f.corrente) return false;
        const n = senzaSigle(f.corrente.ragione_sociale);
        return n === t2 || n.startsWith(t2 + ' ') || t2.startsWith(n + ' ');
      });
      if (larga.length === 1) return { fornitore_id: larga[0].id, fornitore_versione_id: larga[0].versione_corrente_id! };
    }
    // D-164: somiglianza pg_trgm — un solo candidato sopra soglia, o il primo ben distaccato, si riconosce
    const scelto = unicoPerDistacco(await fornitoriSimili(db, nome));
    if (scelto) return { fornitore_id: scelto.fornitore_id, fornitore_versione_id: scelto.fornitore_versione_id };
    return null;
  }
  return scelti.length === 1 ? { fornitore_id: scelti[0].id, fornitore_versione_id: scelti[0].versione_corrente_id! } : null;
}

/** Sigle societarie che il modello può saltare o aggiungere (D-71): fuori dal confronto del ripiego. */
const SIGLE = new Set(['gmbh', 'co', 'kg', 'srl', 'spa', 'snc', 'sas', 'sarl', 'sa', 'ltd', 'inc', 'ag', 'ohg', 'ug', 'bv', 'nv', 'llc']);
const senzaSigle = (s: string) => normalizzaNome(s).split(' ').filter((p) => p && !SIGLE.has(p)).join(' ').trim();

/* ---------- Vocabolario imparato (D-164) ---------- */
/** Salva (o aggiorna) il legame nome letto normalizzato → ruolo scelto. Si chiama quando l'operatore
 *  sceglie a mano un fornitore o un cliente (Correggi, Apri la pratica, scegli D-152): i documenti
 *  successivi con lo stesso nome letto si riconoscono subito, senza passare dalla somiglianza. */
export async function ricordaAlias(tx: Db, tipo: 'fornitore' | 'cliente', nomeLetto: string | null, ruoloId: bigint, creato_da: bigint | null | undefined) {
  const nome = normalizzaNome(nomeLetto ?? '').slice(0, 255);
  if (!nome || !ruoloId) return;
  const nome_letto = (nomeLetto ?? '').trim().slice(0, 255);
  await tx.alias_letti.upsert({
    where: { tipo_nome_normalizzato: { tipo, nome_normalizzato: nome } },
    create: { tipo, nome_normalizzato: nome, nome_letto, ruolo_id: ruoloId, creato_da: creato_da ?? null },
    update: { nome_letto, ruolo_id: ruoloId, creato_da: creato_da ?? null },
  });
}

/** Cliente dal vocabolario (D-164): il nome letto è già stato scelto a mano in passato per questo cliente. */
async function clienteDaVocabolario(db: Db, nome: string | null): Promise<{ cliente_id: bigint; ragione: string | null } | null> {
  const n = normalizzaNome(nome ?? '');
  if (!n) return null;
  const alias = await db.alias_letti.findUnique({ where: { tipo_nome_normalizzato: { tipo: 'cliente', nome_normalizzato: n } } });
  if (!alias) return null;
  const c = await db.clienti.findUnique({ where: { id: alias.ruolo_id }, include: { corrente: true } });
  return c?.corrente ? { cliente_id: c.id, ragione: c.corrente.ragione_sociale } : null;
}

/* ---------- Somiglianza del nome (pg_trgm, D-164) ---------- */
/** Soglia di `similarity` per riconoscere un soggetto dal nome letto (costante, D-164 §19). */
const SOGLIA_SIM = 0.6;
/** Distacco minimo del primo candidato dal secondo perché la scelta automatica sia sicura (D-111: mai a caso). */
const DISTACCO_SIM = 0.2;

/** Nome netto in SQL per la somiglianza (D-164): minuscole, punteggiatura via e **senza le sigle
 *  societarie** da entrambi i lati (stessa lista di `senzaSigle`). Parole intere, per non confondere
 *  «co» dentro «company». `col` è un nome di colonna costante (mai un valore dell'utente). */
const NOME_NETTO = (col: string) => Prisma.raw(
  `regexp_replace(regexp_replace(lower(${col}), '[^a-z0-9]+', ' ', 'g'), '(^| )(${[...SIGLE].join('|')})(?= |$)', '', 'g')`
);

/** Un solo candidato, o il primo ben distaccato dal secondo, si riconosce; più candidati vicini → null
 *  (si propongono con il punteggio, mai una scelta a caso, D-111/D-164). */
function unicoPerDistacco<T extends { sim: number }>(simili: T[]): T | null {
  if (simili.length === 1) return simili[0];
  if (simili.length >= 2 && simili[0].sim - simili[1].sim >= DISTACCO_SIM) return simili[0];
  return null;
}

/** Fornitori il cui nome corrente somiglia a quello letto (pg_trgm), dal più simile, senza le sigle
 *  societarie dai due lati (D-164). `nome` può essere il testo grezzo letto. */
async function fornitoriSimili(db: Db, nome: string, limite = 10): Promise<{ fornitore_id: bigint; fornitore_versione_id: bigint; ragione_sociale: string; piva: string | null; sim: number }[]> {
  const t = senzaSigle(nome);
  if (t.length < 3) return [];
  return db.$queryRaw<{ fornitore_id: bigint; fornitore_versione_id: bigint; ragione_sociale: string; piva: string | null; sim: number }[]>`
    SELECT f.id AS fornitore_id, f.versione_corrente_id AS fornitore_versione_id, fv.ragione_sociale, fv.piva,
           similarity(${t}, ${NOME_NETTO('fv.ragione_sociale')}) AS sim
    FROM fornitori f
    JOIN fornitori_versioni fv ON fv.id = f.versione_corrente_id
    WHERE similarity(${t}, ${NOME_NETTO('fv.ragione_sociale')}) > ${SOGLIA_SIM}
    ORDER BY sim DESC
    LIMIT ${limite}`;
}

/** Clienti il cui nome corrente somiglia a quello letto (D-164): stesse regole del fornitore. */
async function clientiSimili(db: Db, nome: string, limite = 10): Promise<{ cliente_id: bigint; ragione_sociale: string; piva: string | null; sim: number }[]> {
  const t = senzaSigle(nome);
  if (t.length < 3) return [];
  return db.$queryRaw<{ cliente_id: bigint; ragione_sociale: string; piva: string | null; sim: number }[]>`
    SELECT c.id AS cliente_id, cv.ragione_sociale, cv.piva,
           similarity(${t}, ${NOME_NETTO('cv.ragione_sociale')}) AS sim
    FROM clienti c
    JOIN clienti_versioni cv ON cv.id = c.versione_corrente_id
    WHERE similarity(${t}, ${NOME_NETTO('cv.ragione_sociale')}) > ${SOGLIA_SIM}
    ORDER BY sim DESC
    LIMIT ${limite}`;
}

/** Cliente riconosciuto per somiglianza del nome (D-164): un solo candidato, o il primo ben distaccato.
 *  Più candidati vicini → null (si propongono con il punteggio, mai a caso). */
async function clientePerSomiglianza(db: Db, nome: string | null): Promise<{ cliente_id: bigint; ragione: string | null } | null> {
  const s = unicoPerDistacco(await clientiSimili(db, nome ?? ''));
  return s ? { cliente_id: s.cliente_id, ragione: s.ragione_sociale } : null;
}

/* ---------- Codice cliente → agenzia (interscambio valido alla data, D-71/D-159) ---------- */
/** Agenzia per il codice del documento (fornitore + codice, valida alla data), con il cliente, il
 *  codice effettivo, `da_confermare` e il nome del fornitore. `abbinamentoPerCodice` e il controllo
 *  del codice in `controlliFissi` usano la stessa lettura (una query sola, D-71). */
async function agenziaPerCodice(db: Db, l: Letto): Promise<{
  cliente_id: bigint; cliente: string | null; codice: string; da_confermare: boolean; fornitore: string | null;
} | null> {
  if (l.fornitore_id == null || !l.codice_cliente) return null;
  const giorno = l.data ? new Date(l.data + 'T00:00:00Z') : new Date(); // oggi se manca (§6.5 punto 5)
  const a = await db.interscambio.findFirst({
    where: {
      fornitore_id: l.fornitore_id,
      codice_cliente_fornitore: { equals: l.codice_cliente, mode: 'insensitive' },
      valido_dal: { lte: giorno },
      OR: [{ valido_al: null }, { valido_al: { gt: giorno } }],
    },
    select: {
      cliente_id: true, codice_cliente_fornitore: true, da_confermare: true,
      cliente: { select: { corrente: { select: { ragione_sociale: true } } } },
      fornitore: { select: { corrente: { select: { ragione_sociale: true } } } },
    },
  });
  if (!a) return null;
  return {
    cliente_id: a.cliente_id,
    cliente: a.cliente.corrente?.ragione_sociale ?? null,
    codice: a.codice_cliente_fornitore ?? l.codice_cliente,
    da_confermare: a.da_confermare,
    fornitore: a.fornitore.corrente?.ragione_sociale ?? null,
  };
}

async function abbinamentoPerCodice(db: Db, l: Letto): Promise<Abbinamento | null> {
  const a = await agenziaPerCodice(db, l);
  return a ? { cliente_id: a.cliente_id, cliente: a.cliente, codice: a.codice } : null;
}

/* ---------- Corrispondenza codice cliente ↔ cliente associato (D-175) ---------- */
/** Stato della corrispondenza fra il codice cliente letto e il cliente associato al documento, per la
 *  spunta verde / avviso giallo dell'intestazione (V12). Riusa `agenziaPerCodice`, la stessa lettura di
 *  `controlliFissi`: un solo calcolo del codice. `associato` = cliente dell'abbinamento o riconosciuto. */
export type EsitoCodice =
  | { stato: 'assente' }
  | { stato: 'corrisponde'; cliente: string | null }
  | { stato: 'altro_cliente'; cliente: string | null; fornitore: string | null }
  | { stato: 'senza_agenzia' }
  | { stato: 'da_confermare'; cliente: string | null };

export async function esitoCodiceCliente(db: Db, l: Letto, associato: bigint | null): Promise<EsitoCodice> {
  if (!l.codice_cliente || l.fornitore_id == null) return { stato: 'assente' };
  const a = await agenziaPerCodice(db, l);
  if (!a) return { stato: 'senza_agenzia' };
  if (a.da_confermare) return { stato: 'da_confermare', cliente: a.cliente };
  if (associato != null && a.cliente_id === associato) return { stato: 'corrisponde', cliente: a.cliente };
  return { stato: 'altro_cliente', cliente: a.cliente, fornitore: a.fornitore };
}

/* ---------- Cliente per P.IVA o ragione sociale (D-92) ---------- */
/** P.IVA normalizzata: solo lettere e cifre, maiuscole; il prefisso del paese davanti alle cifre cade
 *  (`IT 012…`, `DE 012…`, D-124), con la stessa base dell'import da Integra (R1-09). */
export const normalizzaPiva = (s: string) => pivaNormalizzata((s || '').replace(/[^0-9A-Za-z]/g, '')).replace(/^[A-Z]{2}(?=\d)/, '');

export type ClienteConCorrente = { id: bigint; corrente: { piva: string | null; ragione_sociale: string; citta: string | null } | null };

/** Risolve il cliente per P.IVA o ragione sociale (D-92, D-124): vince la P.IVA; se più clienti
 *  hanno quella P.IVA (sedi di una catena in Integra) decide la ragione sociale normalizzata, e solo
 *  quando il candidato è uno solo. Senza P.IVA vale la ragione sociale, con un solo candidato.
 *  I clienti si passano già caricati, così l'elenco li legge una volta sola per pagina (D-106).
 *  null = cliente non riconosciuto. */
export function riconosciClienteDai(clienti: ClienteConCorrente[], piva_cliente: string | null, cliente: string | null): { cliente_id: bigint; ragione: string | null } | null {
  const piva = normalizzaPiva(piva_cliente ?? '');
  const nome = normalizzaNome(cliente ?? '');
  if (piva.length >= 11) {
    const perPiva = clienti.filter((x) => x.corrente?.piva != null && normalizzaPiva(x.corrente.piva) === piva);
    if (perPiva.length === 1) return { cliente_id: perPiva[0].id, ragione: perPiva[0].corrente!.ragione_sociale };
    // P.IVA condivisa: fra i soli clienti con quella P.IVA, un solo nome uguale → quello, altrimenti niente (D-124)
    if (perPiva.length > 1) {
      const scelti = nome ? perPiva.filter((x) => normalizzaNome(x.corrente!.ragione_sociale) === nome) : [];
      return scelti.length === 1 ? { cliente_id: scelti[0].id, ragione: scelti[0].corrente!.ragione_sociale } : null;
    }
  }
  if (nome) {
    const cc = clienti.filter((x) => x.corrente && normalizzaNome(x.corrente.ragione_sociale) === nome);
    if (cc.length === 1) return { cliente_id: cc[0].id, ragione: cc[0].corrente!.ragione_sociale };
  }
  return null;
}

/** Riconosce il cliente del documento quando il codice del fornitore non è abbinato (D-92). */
export async function riconosciCliente(db: Db, l: Letto): Promise<{ cliente_id: bigint; ragione: string | null } | null> {
  // D-164: vocabolario imparato, poi P.IVA o ragione sociale, infine la somiglianza del nome
  const vocabolario = await clienteDaVocabolario(db, l.cliente);
  if (vocabolario) return vocabolario;
  // una sola lettura dei clienti con la versione corrente (P.IVA e ragione sociale stanno sulla versione, §4.6)
  const clienti = await db.clienti.findMany({ where: { versione_corrente_id: { not: null } }, include: { corrente: true } });
  const esatto = riconosciClienteDai(clienti as ClienteConCorrente[], l.piva_cliente, l.cliente);
  return esatto ?? await clientePerSomiglianza(db, l.cliente);
}

/* ---------- Candidati da scegliere (D-152) ---------- */

/** Fornitori del CRM il cui nome normalizzato somiglia a quello letto (D-71): i candidati che
 *  `risolviFornitore` non ha potuto decidere (nessuno o più di uno). Massimo 10. */
async function candidatiFornitoreCrm(db: Db, nome: string): Promise<CandidatoSoggetto[]> {
  const t = normalizzaNome(nome ?? '');
  if (!t) return [];
  const fornitori = await db.fornitori.findMany({ where: { versione_corrente_id: { not: null } }, include: { corrente: true } });
  const t2 = senzaSigle(nome);
  const visti = new Set<bigint>();
  const out: CandidatoSoggetto[] = [];
  for (const f of fornitori) {
    if (!f.corrente) continue;
    const n = normalizzaNome(f.corrente.ragione_sociale);
    const sn = senzaSigle(f.corrente.ragione_sociale);
    const simile = n === t || (t2.length >= 3 && sn.length >= 3 && (sn === t2 || sn.startsWith(t2 + ' ') || t2.startsWith(sn + ' ')));
    if (simile && !visti.has(f.id)) {
      visti.add(f.id);
      out.push({ fonte: 'crm', id: String(f.id), ragione_sociale: f.corrente.ragione_sociale, piva: f.corrente.piva ?? null, citta: null, motivo: 'nome simile' });
    }
  }
  // D-164: i nomi solo simili (una lettera diversa) si propongono con il punteggio, mai una scelta a caso
  for (const s of await fornitoriSimili(db, nome)) {
    if (visti.has(s.fornitore_id)) continue;
    visti.add(s.fornitore_id);
    out.push({ fonte: 'crm', id: String(s.fornitore_id), ragione_sociale: s.ragione_sociale, piva: s.piva, citta: null, motivo: 'nome simile', punteggio: Number(s.sim) });
  }
  return out.slice(0, 10);
}

/** Clienti del CRM candidati quando il riconoscimento (D-92, D-124) non è univoco: la P.IVA letta
 *  (con o senza prefisso del paese) o la ragione sociale normalizzata. Massimo 10. */
function candidatiClienteCrm(clienti: ClienteConCorrente[], piva_cliente: string | null, cliente: string | null): CandidatoSoggetto[] {
  const piva = normalizzaPiva(piva_cliente ?? '');
  const nome = normalizzaNome(cliente ?? '');
  const perPiva = piva.length >= 11 ? clienti.filter((x) => x.corrente?.piva != null && normalizzaPiva(x.corrente.piva) === piva) : [];
  if (perPiva.length) {
    return perPiva.slice(0, 10).map((x) => ({ fonte: 'crm', id: String(x.id), ragione_sociale: x.corrente!.ragione_sociale, piva: x.corrente!.piva, citta: x.corrente!.citta ?? null, motivo: 'P.IVA uguale' as const }));
  }
  if (nome) {
    const perNome = clienti.filter((x) => x.corrente && normalizzaNome(x.corrente.ragione_sociale) === nome);
    return perNome.slice(0, 10).map((x) => ({ fonte: 'crm', id: String(x.id), ragione_sociale: x.corrente!.ragione_sociale, piva: x.corrente!.piva, citta: x.corrente!.citta ?? null, motivo: 'nome simile' as const }));
  }
  return [];
}

/** Riga di Integra come candidato (D-152): solo i campi che ha la ricerca (niente città). */
const candidatoIntegra = (x: RigaIntegra): CandidatoSoggetto => ({ fonte: 'integra', id: String(x.id_integra), ragione_sociale: x.ragione_sociale, piva: x.piva, citta: null, motivo: 'nome simile' });

/* ---------- Agenzia mancante (D-106) ---------- */

/** Tipi che entrano in una pratica: l'ordine la apre, gli altri si abbinano (§6.5).
 *  La proforma è come la conferma (D-60: l'una o l'altra porta a «confermata»). */
const ENTRA_IN_PRATICA = new Set(['ordine', 'conferma', 'proforma', 'fattura', 'nota_credito']);

/** Interscambio (agenzia) valido alla data del documento: lo stesso controllo di `documenti.ts` (D-106). */
async function agenziaValida(db: Db, cliente_id: bigint, fornitore_id: bigint, data: string | null): Promise<boolean> {
  const giorno = data ? new Date(data + 'T00:00:00Z') : new Date();
  const a = await db.interscambio.findFirst({
    where: { cliente_id, fornitore_id, valido_dal: { lte: giorno }, OR: [{ valido_al: null }, { valido_al: { gt: giorno } }] },
    select: { id: true },
  });
  return !!a;
}

/** Se cliente e fornitore sono riconosciuti ma non c'è un'agenzia valida alla data, i dati per agire
 *  (D-106); altrimenti null. `cliente` viene dall'abbinamento per codice o dalla P.IVA/ragione sociale. */
async function agenziaMancante(db: Db, l: Letto, ab: Abbinamento | null, riconosciuto: { cliente_id: bigint; ragione: string | null } | null): Promise<AgenziaMancante | null> {
  if (!ENTRA_IN_PRATICA.has(l.tipo ?? '') || l.fornitore_id == null) return null;
  const cliente_id = ab?.cliente_id ?? riconosciuto?.cliente_id ?? null;
  if (cliente_id == null) return null;
  if (await agenziaValida(db, cliente_id, l.fornitore_id, l.data)) return null;
  const f = await db.fornitori.findUnique({ where: { id: l.fornitore_id }, include: { corrente: true } });
  return {
    cliente_id, fornitore_id: l.fornitore_id,
    cliente: ab?.cliente ?? riconosciuto?.ragione ?? null,
    fornitore: f?.corrente?.ragione_sociale ?? null,
    codice_cliente: l.codice_cliente, data: l.data,
  };
}

/** Una riga dell'elenco Documenti per il calcolo di `manca_agenzia` (D-106). */
export interface RigaAgenzia {
  id: bigint;
  tipo: string | null;
  fornitore_id: bigint | null;
  fornitore?: string | null;
  data: string | null;
  codice_cliente: string | null;
  cliente: string | null;
  piva_cliente: string | null;
}

/** Dice quali righe dell'elenco hanno `manca_agenzia`, con la stessa risoluzione della proposta.
 *  Clienti e interscambio si leggono una volta per pagina, niente query per riga (D-106, V12); i clienti
 *  arrivano da `elenco`, che li legge una volta sola per le tre funzioni (R1-11). */
export async function mancaAgenziaRighe(db: Db, righe: RigaAgenzia[], clienti: ClienteConCorrente[]): Promise<Set<bigint>> {
  const manca = new Set<bigint>();
  const rilevanti = righe.filter((r) => ENTRA_IN_PRATICA.has(r.tipo ?? '') && r.fornitore_id != null);
  if (!rilevanti.length) return manca;
  const fornitori = [...new Set(rilevanti.map((r) => r.fornitore_id!))];
  const interscambi = await db.interscambio.findMany({
    where: { fornitore_id: { in: fornitori } },
    select: { cliente_id: true, fornitore_id: true, codice_cliente_fornitore: true, valido_dal: true, valido_al: true },
  });
  const valida = (a: { valido_dal: Date; valido_al: Date | null }, giorno: Date) =>
    a.valido_dal <= giorno && (a.valido_al == null || a.valido_al > giorno);
  const giornoDi = (data: string | null) => (/^\d{4}-\d{2}-\d{2}$/.test(data ?? '') ? new Date(data + 'T00:00:00Z') : new Date());
  for (const r of rilevanti) {
    const f = r.fornitore_id!;
    const giorno = giornoDi(r.data);
    // via codice cliente (interscambio): se c'è, l'agenzia esiste → niente pillola
    const perCodice = r.codice_cliente
      ? interscambi.find((a) => a.fornitore_id === f && a.codice_cliente_fornitore != null
          && a.codice_cliente_fornitore.toLowerCase() === r.codice_cliente!.toLowerCase() && valida(a, giorno))
      : null;
    if (perCodice) continue;
    const cli = riconosciClienteDai(clienti as ClienteConCorrente[], r.piva_cliente, r.cliente);
    if (!cli) continue; // cliente non riconosciuto: la proposta non è manca_agenzia
    if (!interscambi.some((a) => a.cliente_id === cli.cliente_id && a.fornitore_id === f && valida(a, giorno))) manca.add(r.id);
  }
  return manca;
}

/** D-112: fra le righe già senza agenzia, quelle con la coppia (fornitore, codice cliente) nello storico
 *  **senza** subagente → pillola «Non rappresentato» al posto di «Manca l'agenzia». Si confronta il nome
 *  normalizzato del fornitore, non `fornitore_id`: nello storico quegli id sono NULL finché un soggetto non
 *  viene collegato, e la pillola deve funzionare prima. Una query di storico per pagina (V12). */
export async function mancaRappresentanzaRighe(db: Db, righe: RigaAgenzia[], senzaAgenzia: Set<bigint>): Promise<Set<bigint>> {
  const out = new Set<bigint>();
  const rilevanti = righe.filter((r) => senzaAgenzia.has(r.id) && r.fornitore);
  if (!rilevanti.length) return out;
  // R1-11: solo i codici della pagina, non tutto lo storico (l'indice su cliente_codice_fornitore c'è).
  // C1 (0b-02 correzioni 1): un documento senza codice si ritrova con la chiave `fornitore|`,
  // quindi contano anche le righe dello storico senza codice.
  const codici = [...new Set(rilevanti.map((r) => r.codice_cliente).filter((c): c is string => !!c))];
  const senzaCodice = rilevanti.some((r) => !r.codice_cliente);
  const filtri: Prisma.interscambio_storicoWhereInput[] = [];
  if (codici.length) filtri.push({ cliente_codice_fornitore: { in: codici, mode: 'insensitive' } });
  if (senzaCodice) filtri.push({ cliente_codice_fornitore: null }, { cliente_codice_fornitore: '' });
  const storici = filtri.length
    ? await db.interscambio_storico.findMany({
        where: { subagente_nome: null, OR: filtri },
        select: { fornitore_ragione_sociale: true, cliente_codice_fornitore: true },
      })
    : [];
  const chiave = (f: string | null, codice: string | null) => `${normalizzaNome(f ?? '')}|${(codice ?? '').toLowerCase()}`;
  const senza = new Set(storici.map((s) => chiave(s.fornitore_ragione_sociale, s.cliente_codice_fornitore)));
  for (const r of rilevanti) {
    if (senza.has(chiave(r.fornitore ?? null, r.codice_cliente))) out.add(r.id);
  }
  return out;
}

/* ---------- Proposta di abbinamento (M.proposta, §6.5) ---------- */

/** D-169: il documento cita un numero d'ordine del fornitore → cerca la pratica (o le pratiche) con
 *  quel numero. La chiave è fornitore + numero, mai il numero da solo; se il fornitore non è
 *  riconosciuto si cerca fra tutte le pratiche (da proporre, mai da agganciare da solo). */
async function praticaPerOrdine(db: Db, l: Letto): Promise<PraticaOrdine[]> {
  const numero = (l.numero_ordine_fornitore ?? '').trim();
  if (!numero) return [];
  const pratiche = await db.ordini_fornitore_testata.findMany({
    where: { numero_ordine_fornitore: numero, ...(l.fornitore_id != null ? { fornitore_id: l.fornitore_id } : {}) },
    select: {
      id: true, numero_ordine: true, numero_ordine_fornitore: true, fornitore_id: true, cliente_id: true, stato: true, data_ordine: true,
      fornitore: { select: { ragione_sociale: true } },
      cliente: { select: { ragione_sociale: true } },
    },
    orderBy: { id: 'asc' },
  });
  return pratiche.map((p) => ({
    id: String(p.id), numero: p.numero_ordine, numero_ordine_fornitore: p.numero_ordine_fornitore ?? numero,
    cliente: p.cliente?.ragione_sociale ?? null, cliente_id: p.cliente_id,
    fornitore: p.fornitore?.ragione_sociale ?? null, fornitore_id: p.fornitore_id,
    stato: p.stato, data_ordine: iso(p.data_ordine),
  }));
}

/** D-169 (4b): il cliente del documento coincide con quello della pratica trovata per numero d'ordine?
 *  Per codice cliente del fornitore, P.IVA o nome letto; false quando non coincide o il documento non
 *  permette di dirlo (in quel caso non si abbina il cliente da solo, resta un punto da controllare). */
async function clienteCoincideOrdine(db: Db, l: Letto, p: PraticaOrdine): Promise<boolean | null> {
  // 1. codice cliente del fornitore → agenzia → cliente, confrontato con il cliente della pratica
  if (l.fornitore_id != null && l.codice_cliente) {
    const a = await agenziaPerCodice(db, l);
    if (a) return a.cliente_id === p.cliente_id;
  }
  // 2. P.IVA del documento contro la P.IVA del cliente della pratica
  if (l.piva_cliente) {
    const c = await db.clienti.findUnique({ where: { id: p.cliente_id }, select: { versione_corrente_id: true, corrente: { select: { piva: true } } } });
    const piva = c?.corrente?.piva ?? null;
    if (piva) return normalizzaPiva(piva) === normalizzaPiva(l.piva_cliente);
  }
  // 3. nome letto contro la ragione sociale della pratica
  const nome = normalizzaNome(l.cliente ?? '');
  const pratica = normalizzaNome(p.cliente ?? '');
  if (nome && pratica) return nome === pratica;
  return null; // il documento non permette di dirlo
}

/** Candidato della proposta dal numero d'ordine del fornitore (D-169): il motivo dice l'ordine e il fornitore. */
const candidatoOrdine = (p: PraticaOrdine): Candidato => ({
  pratica: { id: p.id, numero: p.numero, cliente: p.cliente, stato: p.stato, data_ordine: p.data_ordine },
  punteggio: 1,
  motivi: [`ordine ${p.numero_ordine_fornitore}` + (p.fornitore ? ` di ${p.fornitore}` : '')],
  delta: 0,
  ruolo: null,
});

/* ---------- Ruolo di una conferma/proforma in più (D-174) ---------- */
/** Tolleranza dell'1 % per dire che due importi «coincidono» (parziale/sostituisce, D-174 §19). */
export const TOLLERANZA_CONFERME = 0.01;
const vicinoConferme = (a: number, b: number) => b > 0 && Math.abs(a - b) / b <= TOLLERANZA_CONFERME;

/** Documenti da marcare superati quando l'operatore sceglie «sostituisce» (D-174): se l'importo è ≈
 *  al totale dell'ordine sostituisce tutte le conferme/proforme valide, se ≈ a una sola sostituisce
 *  quella; altrimenti (non corrisponde a nulla di preciso) sostituisce comunque tutto. */
export function superatiConferma(imp: number, ordine: number, validi: { id: bigint; importo: number }[]): bigint[] {
  if (vicinoConferme(imp, ordine)) return validi.map((v) => v.id);
  const uno = validi.find((v) => vicinoConferme(imp, v.importo));
  if (uno) return [uno.id];
  return validi.map((v) => v.id);
}

/** Suggerisce il ruolo di una conferma/proforma che arriva su una pratica che ne ha già una (D-174):
 *  «parziale» se la somma resta entro l'importo dell'ordine, «sostituisce» se l'importo è ≈ al totale
 *  dell'ordine o ≈ a quello di una conferma già presente (o se la somma supererebbe l'ordine). */
export function ruoloConferma(imp: number, ordine: number, validi: { id: bigint; importo: number }[]): { ruolo: 'parziale' | 'sostituisce' | null; supera: bigint[] } {
  if (!validi.length) return { ruolo: null, supera: [] }; // prima conferma/proforma: nessuna scelta
  if (vicinoConferme(imp, ordine) || validi.some((v) => vicinoConferme(imp, v.importo))) {
    return { ruolo: 'sostituisce', supera: superatiConferma(imp, ordine, validi) };
  }
  const somma = validi.reduce((s, v) => s + v.importo, 0);
  if (somma + imp <= ordine * (1 + TOLLERANZA_CONFERME)) return { ruolo: 'parziale', supera: [] };
  return { ruolo: 'sostituisce', supera: superatiConferma(imp, ordine, validi) };
}

const CON_PROP = {
  righe: { orderBy: { numero_riga: 'asc' as const } },
  documenti: { select: { id: true, tipo: true, numero: true, importo: true, superato_da: true } },
  cliente: { select: { ragione_sociale: true } },
} satisfies Prisma.ordini_fornitore_testataInclude;

/** D-204/D-34: i documenti aperti (pratica senza documenti congelati o liquidati) con lo stesso numero
 *  e fornitore della stessa fase, dal più vicino per data al documento letto (il più recente se il
 *  documento non ha una data). Il numero da solo non identifica un documento (D-34): un numero riusato
 *  in un altro anno su una pratica già chiusa non è un candidato. Usata dalla proposta (esito `doppio`)
 *  e dalla rotta di sostituzione, così entrambe indicano lo stesso documento. */
export async function candidatiDoppio(db: Db, l: Letto, tipo: string): Promise<DocumentoDoppio[]> {
  if (l.fornitore_id == null || !l.numero) return [];
  const numero = l.numero;
  const g = await db.ordini_fornitore_documenti.findMany({
    where: {
      tipo, numero,
      testata: { fornitore_id: l.fornitore_id, documenti: { none: { OR: [{ congelato_il: { not: null } }, { liquidazione_id: { not: null } }] } } },
    },
    select: {
      id: true, data: true, importo: true, testata_id: true,
      testata: { select: { numero_ordine: true, cliente: { select: { ragione_sociale: true } } } },
      _count: { select: { righe: true } },
    },
  });
  const out = g.map((x) => ({
    tipo, pratica_id: String(x.testata_id), pratica_numero: x.testata.numero_ordine,
    documento_id: String(x.id), numero, data: iso(x.data), importo: Number(x.importo),
    righe: x._count.righe, cliente: x.testata.cliente?.ragione_sociale ?? null,
  }));
  // il più vicino per data al documento letto; senza data letta, il più recente
  if (l.data) {
    const g0 = new Date(l.data + 'T00:00:00Z').getTime();
    out.sort((a, b) => (Math.abs(new Date(a.data + 'T00:00:00Z').getTime() - g0) - Math.abs(new Date(b.data + 'T00:00:00Z').getTime() - g0)) || b.data.localeCompare(a.data));
  } else {
    out.sort((a, b) => b.data.localeCompare(a.data));
  }
  return out;
}

/** D-204: il documento aperto più vicino (per data) da proporre per la sostituzione; null = nessuno. */
async function doppioDocumento(db: Db, l: Letto, tipo: string): Promise<DocumentoDoppio | null> {
  return (await candidatiDoppio(db, l, tipo))[0] ?? null;
}

export async function propostaDocumento(db: Db, l: Letto, contesto: Contesto = {}, filtro: FiltroPratiche = 'tutte'): Promise<Proposta> {
  const imp = importoDocumento(l);
  // base della risposta: i campi nuovi (D-111/D-112) sono null finché un esito non li riempie
  const base: Proposta = { esito: 'nessuno', candidati: [], importo: imp, abbinamento: null, cliente_riconosciuto: null, agenzia_mancante: null, fornitore_da_integra: null, cliente_da_integra: null, manca_rappresentanza: null, candidati_fornitore: [], candidati_cliente: [], integra_non_raggiungibile: !!contesto.integra_non_raggiungibile, pratica_ordine: null, doppio: null };
  if (l.tipo === 'bollettino') {
    const gia = l.fornitore_id != null && l.mese != null && l.anno != null
      ? await db.bollettini_testata.findFirst({ where: { fornitore_id: l.fornitore_id, mese: l.mese, anno: l.anno }, select: { id: true } })
      : null;
    return { ...base, esito: gia ? 'doppio' : 'bollettino' };
  }

  // D-164: il fornitore si ri-risolve a ogni apertura (vocabolario + somiglianza): i documenti letti
  // prima del riconoscimento furbo, o con un nome storpiato, si riconoscono senza rileggere il file.
  if (l.fornitore_id == null && l.fornitore) {
    const f = await risolviFornitore(db, l.fornitore);
    if (f) l = { ...l, fornitore_id: f.fornitore_id };
  }

  // D-169: il numero d'ordine del fornitore è il primo aggancio, prima di tutto il resto. Per proforma,
  // conferma, fattura e nota di credito che citano l'ordine: una sola pratica → aggancio certo (cliente,
  // fornitore e agenzia si ereditano dalla pratica); più pratiche → da scegliere (D-111); fornitore non
  // riconosciuto → si propone, mai da solo. Per l'ordine il numero è suo e apre la pratica (più sotto).
  if (l.tipo !== 'ordine' && l.numero_ordine_fornitore) {
    const perOrdine = await praticaPerOrdine(db, l);
    if (perOrdine.length === 1) {
      const p = perOrdine[0];
      const coincide = await clienteCoincideOrdine(db, l, p);
      return {
        ...base, esito: 'certo', candidati: [candidatoOrdine(p)],
        pratica_ordine: { pratica: p, cliente_coincide: coincide },
        // D-169 (4b): solo se il cliente coincide l'abbinamento è fatto; altrimenti resta da verificare
        abbinamento: coincide === true ? { cliente_id: p.cliente_id, cliente: p.cliente, codice: null } : null,
        cliente_riconosciuto: coincide === true ? { cliente_id: p.cliente_id, ragione: p.cliente } : null,
      };
    }
    if (perOrdine.length > 1) {
      return { ...base, esito: 'ambiguo', candidati: perOrdine.map(candidatoOrdine) };
    }
    // nessuna pratica con quel numero: si prosegue col riconoscimento normale
  }

  // D-152: fornitore non in anagrafica → candidati dal CRM (nome) e da Integra; una sola riga di
  // Integra senza candidati CRM resta l'import certo di oggi (D-111); mai una scelta a caso (D-111).
  if (l.fornitore_id == null) {
    const c = (contesto.fornitore_su_integra ?? []).filter((x) => x.id_integra != null);
    const crm = await candidatiFornitoreCrm(db, l.fornitore ?? '');
    if (crm.length === 0 && c.length === 1) {
      return { ...base, esito: 'fornitore_da_integra', fornitore_da_integra: { id_integra: c[0].id_integra, ragione_sociale: c[0].ragione_sociale, piva: c[0].piva } };
    }
    const tutti = [...crm, ...c.map(candidatoIntegra)];
    if (tutti.length) return { ...base, esito: 'fornitore_da_scegliere', candidati_fornitore: tutti };
  }

  // Cliente scelto a mano nella correzione: certo, vince su codice/P.IVA/nome (come il fornitore scelto).
  const scelto = l.cliente_id != null && /^\d+$/.test(l.cliente_id)
    ? await db.clienti.findUnique({ where: { id: BigInt(l.cliente_id) }, select: { versione_corrente_id: true, corrente: { select: { ragione_sociale: true } } } })
    : null;
  const clienteScelto = scelto?.versione_corrente_id != null ? { cliente_id: BigInt(l.cliente_id!), ragione: scelto.corrente?.ragione_sociale ?? null } : null;
  const ab = clienteScelto ? null : await abbinamentoPerCodice(db, l);
  // D-164: cliente per vocabolario (nome letto già scelto a mano in passato)
  const clienteVocabolario = !clienteScelto && !ab ? await clienteDaVocabolario(db, l.cliente) : null;
  // D-92 + D-106: cliente riconosciuto (codice del fornitore, altrimenti P.IVA/ragione sociale).
  // D-152: i clienti con la versione corrente si leggono una volta sola, per riconoscimento e candidati.
  const clienti = (ab || clienteScelto || clienteVocabolario) ? [] : await db.clienti.findMany({ where: { versione_corrente_id: { not: null } }, include: { corrente: true } });
  let cliente_riconosciuto = clienteScelto ?? clienteVocabolario ?? (ab ? null : riconosciClienteDai(clienti as ClienteConCorrente[], l.piva_cliente, l.cliente));
  // D-164: somiglianza del nome anche per il cliente (stesse regole del fornitore): un solo candidato
  // (o il primo ben distaccato) si riconosce, più candidati vicini → da scegliere più sotto.
  if (cliente_riconosciuto == null && !clienteScelto && !clienteVocabolario && !ab) {
    cliente_riconosciuto = await clientePerSomiglianza(db, l.cliente);
  }
  // D-60/proforma: il cliente certo (agenzia per codice, scelto a mano o vocabolario) filtra le pratiche
  // della coppia; il riconosciuto per P.IVA/nome non filtra (resta il confronto per articoli di prima).
  const clientePratica = ab?.cliente_id ?? clienteScelto?.cliente_id ?? clienteVocabolario?.cliente_id ?? null;
  const storico = contesto.storico ?? [];
  // D-112: la coppia cliente-fornitore nello storico, con o senza subagente
  const coppiaCon = storico.find((s) => s.rappresentato) ?? null;
  const coppiaSenza = storico.length > 0 && !storico.some((s) => s.rappresentato) ? storico[0] : null;

  // D-111/D-112/D-152: cliente non riconosciuto ma proposto dallo storico (subagente + sconto), da una
  // sola riga di Integra (certo, come oggi) o da un elenco di candidati da scegliere.
  // Vale per i tipi che entrano in pratica, prima dell'ordine (il doppione di un ordine vince comunque, vedi sotto).
  const clienteDaIntegra = async (): Promise<Proposta | null> => {
    if (l.fornitore_id == null || ab != null || cliente_riconosciuto != null) return null;
    if (coppiaCon) {
      return { ...base, esito: 'cliente_da_integra', cliente_da_integra: { id_integra: null, ragione_sociale: coppiaCon.cliente_ragione_sociale, piva: coppiaCon.cliente_piva, subagente: coppiaCon.subagente_nome, sconto: coppiaCon.sconto } };
    }
    const c = (contesto.cliente_su_integra ?? []).filter((x) => x.id_integra != null);
    const crm = candidatiClienteCrm(clienti as ClienteConCorrente[], l.piva_cliente, l.cliente);
    // D-164: i clienti con nome simile si propongono con il punteggio (mai a caso), come il fornitore
    for (const s of await clientiSimili(db, l.cliente ?? '')) {
      if (!crm.some((x) => x.id === String(s.cliente_id))) {
        crm.push({ fonte: 'crm', id: String(s.cliente_id), ragione_sociale: s.ragione_sociale, piva: s.piva, citta: null, motivo: 'nome simile', punteggio: Number(s.sim) });
      }
    }
    if (crm.length === 0 && c.length === 1) {
      return { ...base, esito: 'cliente_da_integra', cliente_da_integra: { id_integra: c[0].id_integra, ragione_sociale: c[0].ragione_sociale, piva: c[0].piva, subagente: null, sconto: null } };
    }
    const tutti = [...crm, ...c.map(candidatoIntegra)];
    if (tutti.length) return { ...base, esito: 'cliente_da_scegliere', candidati_cliente: tutti };
    return null;
  };

  if (l.tipo === 'ordine') {
    // il numero letto è quello del fornitore: il doppione si cerca fra i documenti della pratica,
    // non sul numero della pratica (che il CRM genera OF/AAAA/NNN, D-60)
    const doppio = await doppioDocumento(db, l, 'ordine');
    if (doppio) return { ...base, esito: 'doppio', abbinamento: ab, cliente_riconosciuto, doppio };
    const cd = await clienteDaIntegra();
    if (cd) return cd;
    const manca = await agenziaMancante(db, l, ab, cliente_riconosciuto);
    if (manca) {
      if (coppiaSenza) {
        return { ...base, esito: 'manca_rappresentanza', abbinamento: ab, cliente_riconosciuto, agenzia_mancante: manca, manca_rappresentanza: { cliente: manca.cliente, fornitore: manca.fornitore, codice_cliente: manca.codice_cliente } };
      }
      return { ...base, esito: 'manca_agenzia', abbinamento: ab, cliente_riconosciuto, agenzia_mancante: manca };
    }
    return { ...base, esito: ab ? 'nuova' : 'nessuno', abbinamento: ab, cliente_riconosciuto };
  }
  if (l.tipo !== 'conferma' && l.tipo !== 'proforma' && l.tipo !== 'fattura' && l.tipo !== 'nota_credito') {
    // pagamento, altro o tipo non letto: non entrano in una pratica, ma il cliente scelto o
    // riconosciuto (codice del fornitore, P.IVA, nome) resta quello del documento (D-169, E di Ugo).
    return { ...base, esito: 'nessuno', abbinamento: ab, cliente_riconosciuto };
  }
  // una fattura già registrata in una pratica è un doppione
  if (l.tipo === 'fattura' && l.fornitore_id != null && l.numero) {
    const gia = await db.ordini_fornitore_documenti.findFirst({ where: { tipo: 'fattura', numero: l.numero, testata: { fornitore_id: l.fornitore_id } }, select: { id: true } });
    if (gia) return { ...base, esito: 'doppio', abbinamento: ab, cliente_riconosciuto: null };
  }

  // D-204: una conferma o proforma con lo stesso numero (e fornitore) di una già registrata è la versione
  // aggiornata: doppione da poter sostituire. Un numero diverso resta una conferma in più (D-174).
  if (l.tipo === 'conferma' || l.tipo === 'proforma') {
    const doppio = await doppioDocumento(db, l, l.tipo);
    if (doppio) return { ...base, esito: 'doppio', abbinamento: ab, cliente_riconosciuto, doppio };
  }

  const cd = await clienteDaIntegra();
  if (cd) return cd;

  // D-106: cliente e fornitore riconosciuti ma senza agenzia valida alla data → non si abbina
  const manca = await agenziaMancante(db, l, ab, cliente_riconosciuto);
  if (manca) {
    // D-112: la coppia è nello storico senza subagente → messaggio più preciso di "manca l'agenzia"
    if (coppiaSenza) {
      return { ...base, esito: 'manca_rappresentanza', abbinamento: ab, cliente_riconosciuto, agenzia_mancante: manca, manca_rappresentanza: { cliente: manca.cliente, fornitore: manca.fornitore, codice_cliente: manca.codice_cliente } };
    }
    return { ...base, esito: 'manca_agenzia', abbinamento: ab, cliente_riconosciuto, agenzia_mancante: manca };
  }

  const codiciDoc = l.righe.map((r) => r.codice).filter((c): c is string => !!c);
  const testate = l.fornitore_id != null
    ? await db.ordini_fornitore_testata.findMany({
      where: { fornitore_id: l.fornitore_id, ...(clientePratica != null ? { cliente_id: clientePratica } : {}) },
      include: CON_PROP,
    })
    : [];
  // D-174: conferma e proforma non escludono più le pratiche già confermate (più conferme/proforme
  // si agganciano alla stessa pratica); escludono solo quelle fiscali (già fatturate).
  // fattura: esclude le pratiche che hanno già quella fattura
  const pool = testate.filter((t) => {
    if (l.tipo === 'conferma' || l.tipo === 'proforma') return !t.documenti.some((d) => fiscale(d.tipo));
    if (l.tipo === 'fattura') return !t.documenti.some((d) => fiscale(d.tipo) && d.numero === l.numero);
    return true;
  });

  const fiscaliNumeri = new Map<string, string[]>();
  const candidati: Candidato[] = pool.map((t) => {
    fiscaliNumeri.set(String(t.id), t.documenti.filter((d) => fiscale(d.tipo)).map((d) => d.numero));
    const conferma = t.righe.filter((r) => r.fase === 'conferma');
    const ordine = t.righe.filter((r) => r.fase === 'ordine');
    const rif = conferma.length ? conferma : ordine;
    const codiciRif = rif.map((r) => r.codice).filter((c): c is string => !!c);
    const comuni = codiciRif.filter((c) => codiciDoc.includes(c)).length;
    const denom = Math.max(codiciDoc.length, codiciRif.length);
    const quota = denom ? comuni / denom : 0;
    const motivi: string[] = [];
    if (ab) motivi.push(`codice cliente ${ab.codice} = ${ab.cliente ?? ''}`);
    motivi.push(`${comuni} articoli su ${codiciDoc.length} in comune`);
    const giaFatt = t.documenti.some((d) => d.tipo === 'fattura');
    if (giaFatt) motivi.push('pratica già fatturata');
    const importoRif = round2(Number(rif.reduce((s, r) => s.plus(r.importo ?? ZERO), ZERO)));
    // D-174: per conferma/proforma il suggerimento parziale/sostituisce con i numeri (somma attuale, importo ordine)
    let ruolo: 'parziale' | 'sostituisce' | null = null;
    if (l.tipo === 'conferma' || l.tipo === 'proforma') {
      const impOrdine = round2(Number(t.documenti.filter((d) => d.tipo === 'ordine').reduce((s, d) => s.plus(d.importo ?? ZERO), ZERO)));
      const validi = t.documenti.filter((d) => (d.tipo === 'conferma' || d.tipo === 'proforma') && d.superato_da == null)
        .map((d) => ({ id: d.id, importo: Number(d.importo ?? ZERO) }));
      ruolo = ruoloConferma(imp, impOrdine, validi).ruolo;
      if (ruolo) {
        const somma = round2(validi.reduce((s, v) => s + v.importo, 0));
        motivi.push(`confermato ${euro(somma)} su ordine ${euro(impOrdine)}: ${ruolo === 'parziale' ? 'parziale (si somma)' : 'sostituisce'}`);
      }
    }
    return {
      pratica: { id: String(t.id), numero: t.numero_ordine, cliente: t.cliente?.ragione_sociale ?? null, stato: t.stato, data_ordine: iso(t.data_ordine) },
      punteggio: quota - (giaFatt ? 0.5 : 0),
      motivi,
      delta: round2(imp - importoRif),
      ruolo,
    };
  }).sort((a, b) => b.punteggio - a.punteggio);

  // nota di credito con riferimento alla fattura stornata: la pratica di quella fattura è certa e va prima,
  // anche se il filtro per stato la escluderebbe (è per forza già fatturata, D-178 §19)
  if (l.tipo === 'nota_credito' && l.riferimento_fattura) {
    const k = candidati.findIndex((c) => (fiscaliNumeri.get(c.pratica.id) ?? []).includes(l.riferimento_fattura!));
    if (k >= 0) {
      const c = candidati.splice(k, 1)[0];
      c.motivi.unshift(`storna la fattura ${l.riferimento_fattura} di questa pratica`);
      return { ...base, esito: 'certo', candidati: [c, ...filtraPratiche(candidati, filtro)], abbinamento: ab, cliente_riconosciuto };
    }
  }

  // D-178 §19: il filtro per stato si applica qui, prima dell'esito, così la prima candidata è la proposta fra quelle filtrate
  const proposti = filtraPratiche(candidati, filtro);
  let esito: Esito = 'nessuno';
  if (proposti.length && clientePratica == null) esito = proposti[0].punteggio > 0 ? 'probabile' : 'nessuno';
  else if (proposti.length === 1) esito = 'certo';
  else if (proposti.length > 1) esito = proposti[0].punteggio - proposti[1].punteggio >= 0.5 ? 'probabile' : 'ambiguo';
  return { ...base, esito, candidati: proposti, abbinamento: ab, cliente_riconosciuto };
}

/* ---------- Controlli fissi (§6.5 punto 5) ---------- */
/** Codice articolo per il confronto (D-176): spazi via; gli zeri iniziali restano, sono parte del codice. */
const normalizzaCodice = (c: string) => c.replace(/\s+/g, '');

export async function controlliFissi(db: Db, l: Letto, proposta: Proposta): Promise<Controllo[]> {
  const out: Controllo[] = [];
  const f = l.fornitore_id != null;

  if (l.tipo === 'bollettino') {
    if (f && l.mese != null && l.anno != null
      && await db.bollettini_testata.findFirst({ where: { fornitore_id: l.fornitore_id!, mese: l.mese, anno: l.anno }, select: { id: true } })) {
      out.push({ codice: 'bollettino', campo: 'mese', testo: 'Bollettino già registrato per questo fornitore e mese', grave: true, gruppo: 'lettura' });
    }
    return out; // gli altri controlli non valgono per il bollettino
  }

  // D-169 (4b): trovata la pratica per numero d'ordine, il cliente del documento va verificato. Coincide
  // → nessun punto; non coincide o il documento non lo dice → punto da controllare, mai un abbinamento al
  // cliente da solo (il cliente della pratica non si sovrascrive da un documento).
  if (proposta.pratica_ordine && proposta.pratica_ordine.cliente_coincide !== true) {
    const p = proposta.pratica_ordine.pratica;
    out.push({
      codice: 'cliente_ordine', campo: 'cliente',
      testo: `Il cliente del documento non coincide con quello della pratica ${p.numero_ordine_fornitore} (${p.cliente ?? ''}): cerca il cliente giusto`,
      grave: false, gruppo: 'confronto',
    });
  }

  if (f && l.codice_cliente && proposta.abbinamento == null) {
    // Quando il cliente è scelto a mano `abbinamento` resta null anche se l'agenzia per quel codice
    // esiste (D-159), e resta null anche per il doppione (D-204): il controllo non deve dire «non
    // presente». L'agenzia del codice si rilegge e si distingue fra: del cliente scelto (niente),
    // di un altro cliente, da confermare. Senza un cliente scelto a mano il codice indica il cliente:
    // nessun conflitto (D-204).
    const ag = await agenziaPerCodice(db, l);
    const scelto = l.cliente_id != null && /^\d+$/.test(l.cliente_id) ? BigInt(l.cliente_id) : null;
    if (!ag) {
      out.push({ codice: 'codice_cliente', campo: 'codice_cliente', testo: `Codice cliente ${l.codice_cliente} non presente fra i clienti del fornitore`, grave: true, gruppo: 'lettura' });
    } else if (ag.da_confermare) {
      out.push({ codice: 'codice_cliente', campo: 'codice_cliente', testo: `Codice cliente ${l.codice_cliente}: agenzia dal vecchio CRM, da confermare`, grave: false, gruppo: 'lettura' });
    } else if (scelto != null && ag.cliente_id !== scelto) {
      // il codice è di un altro cliente rispetto a quello scelto a mano: l'avviso grave
      out.push({ codice: 'codice_cliente', campo: 'codice_cliente', testo: `Il codice ${l.codice_cliente} presso ${ag.fornitore ?? ''} è di ${ag.cliente ?? ''}`, grave: true, gruppo: 'lettura' });
    }
  }

  const somma = round2(l.righe.reduce((s, r) => s + importoRigaLetta(r), 0));
  if (l.importo != null && Math.abs(l.importo - somma) >= 0.01) {
    out.push({ codice: 'totale', campo: 'totale', testo: `Totale del documento ${euro(l.importo)} diverso dalla somma delle righe ${euro(somma)}`, grave: true, gruppo: 'lettura' });
  }

  l.righe.forEach((r, i) => {
    if (r.quantita != null && r.prezzo != null && r.importo != null) {
      const atteso = round2(r.quantita * r.prezzo * fattoreSconto(r));
      if (Math.abs(atteso - r.importo) >= 0.01) {
        out.push({ codice: 'riga', campo: `righe[${i}]`, testo: `Riga ${i + 1}: quantità × prezzo ${euro(atteso)} diverso dall'importo ${euro(r.importo)}`, grave: false, gruppo: 'lettura' });
      }
    }
  });

  // pratica proposta = la prima candidata: articoli assenti e data prima dell'ordine.
  // D-176: l'articolo assente è un avviso (non grave) sul confronto con l'ordine, non sulla lettura;
  // quando ne mancano più della metà un solo punto riassuntivo, non un punto per riga.
  const prima = proposta.candidati[0];
  if (f && prima) {
    const t = await db.ordini_fornitore_testata.findUnique({
      where: { id: BigInt(prima.pratica.id) },
      include: {
        righe: true,
        documenti: { where: { tipo: 'ordine' }, select: { numero: true } },
      },
    });
    if (t) {
      const numOrdine = t.documenti[0]?.numero ?? prima.pratica.numero;
      const codiciOrdine = new Set(t.righe.filter((r) => r.fase === 'ordine').map((r) => r.codice).filter((c): c is string => !!c).map(normalizzaCodice));
      const assenti = l.righe.map((r, i) => ({ r, i })).filter(({ r }) => r.codice && !codiciOrdine.has(normalizzaCodice(r.codice)));
      if (assenti.length) {
        if (assenti.length > 1 && assenti.length * 2 > l.righe.filter((r) => r.codice).length) {
          out.push({ codice: 'articolo', campo: 'righe', testo: `Nessuna riga in comune con l'ordine ${numOrdine}: forse la pratica non è quella giusta`, grave: false, gruppo: 'confronto' });
        } else {
          for (const { r, i } of assenti) {
            out.push({ codice: 'articolo', campo: `righe[${i}]`, testo: `L'articolo ${r.codice} non c'è nell'ordine ${numOrdine}: controlla se è un'aggiunta del fornitore`, grave: false, gruppo: 'confronto' });
          }
        }
      }
      if (l.data && t.data_ordine && l.data < iso(t.data_ordine)) {
        out.push({ codice: 'data', campo: 'data', testo: `Data del documento ${l.data} precedente alla data dell'ordine ${iso(t.data_ordine)}`, grave: false, gruppo: 'confronto' });
      }
    }
  }

  return out;
}

/* ---------- Livello del documento (§6.5 punto 6, M.statoLettura) ---------- */
/** Soglie dalla configurazione; se non c'è una configurazione valida, le iniziali 0,8/0,7 (D-151). */
export async function soglieLettura(db: Db): Promise<Soglie> {
  const c = await letturaConfig(db);
  return { soglia_ok: c?.soglia_ok ?? 0.8, soglia_bassa: c?.soglia_bassa ?? 0.7 };
}

/** Livello dai campi e dai controlli. `tipo` è escluso (D-71): la sua confidenza è strutturalmente bassa,
 *  una classificazione — sui documenti veri 0,47–0,86 anche quando il tipo era giusto. Affidabilità nulla
 *  = incerto ma non `bassa`. */
export async function valutaLettura(db: Db, documento_id: bigint, soglie?: Soglie): Promise<Valutazione> {
  const s = soglie ?? await soglieLettura(db);
  const l = await lettoDaCampi(db, documento_id);
  const proposta = await propostaDocumento(db, l);
  const controlli = await controlliFissi(db, l, proposta);
  const campi = await db.documenti_campi.findMany({ where: { documento_id }, orderBy: { id: 'asc' } });

  const incerti: string[] = [];
  let bassa = false;
  for (const c of campi) {
    if (c.campo === 'tipo' || c.verificato) continue;
    if (c.valore_letto == null || c.valore_letto.trim() === '') continue;
    const aff = c.affidabilita == null ? null : Number(c.affidabilita);
    if (aff == null || aff < s.soglia_ok) {
      incerti.push(c.campo);
      if (aff != null && aff < s.soglia_bassa) bassa = true;
    }
  }
  // D-176: il livello riguarda la sola lettura; i punti sull'abbinamento (gruppo «confronto») non lo
  // abbassano: si mostrano separati nell'elenco e in Correggi.
  const lettura = controlli.filter((c) => c.gruppo !== 'confronto');
  if (lettura.some((c) => c.grave)) bassa = true;
  const n = incerti.length + lettura.length;
  return { campi: incerti, controlli, n, livello: bassa ? 'bassa' : n ? 'da_controllare' : 'affidabile' };
}
