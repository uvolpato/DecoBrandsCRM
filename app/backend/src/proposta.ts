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

/* ---------- Forma del documento letto ---------- */
export interface RigaLetta {
  codice: string | null;
  descrizione: string | null;
  quantita: number | null;
  prezzo: number | null;
  importo: number | null;
  numero_fattura: string | null;
  data_fattura: string | null;
  provvigione: number | null;
}

export interface Letto {
  tipo: string | null;
  fornitore_id: bigint | null;
  numero: string | null;
  data: string | null;
  codice_cliente: string | null;
  cliente: string | null;
  piva_cliente: string | null;
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
}

export type Esito = 'doppio' | 'bollettino' | 'nuova' | 'certo' | 'probabile' | 'ambiguo' | 'nessuno' | 'manca_agenzia' | 'manca_rappresentanza' | 'fornitore_da_integra' | 'cliente_da_integra';

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
}

export interface Controllo {
  codice: string;
  campo: string;
  testo: string;
  grave: boolean;
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
    const r: RigaLetta = {
      codice: valore(p + 'codice'), descrizione: valore(p + 'descrizione'),
      quantita: num(valore(p + 'quantita')), prezzo: num(valore(p + 'prezzo')), importo: num(valore(p + 'importo')),
      numero_fattura: valore(p + 'numero_fattura'), data_fattura: dataValida(valore(p + 'data_fattura')), provvigione: num(valore(p + 'provvigione')),
    };
    if (Object.values(r).every((x) => x == null)) break;
    righe.push(r);
  }
  return {
    tipo, fornitore_id,
    numero: valore('numero'), data: dataValida(valore('data')), codice_cliente: valore('codice_cliente'), cliente: valore('cliente'), piva_cliente: valore('piva_cliente'),
    importo: num(valore('importo_totale')),
    mese: intero(valore('mese')), anno: intero(valore('anno')), riferimento_fattura: valore('riferimento_fattura'),
    righe,
  };
}

/** Importo della riga come nel prototipo (M.importoRiga): quello letto, altrimenti quantità × prezzo. */
const importoRigaLetta = (r: RigaLetta) => r.importo ?? (r.quantita != null && r.prezzo != null ? round2(r.quantita * r.prezzo) : 0);
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
    return null;
  }
  return scelti.length === 1 ? { fornitore_id: scelti[0].id, fornitore_versione_id: scelti[0].versione_corrente_id! } : null;
}

/** Sigle societarie che il modello può saltare o aggiungere (D-71): fuori dal confronto del ripiego. */
const SIGLE = new Set(['gmbh', 'co', 'kg', 'srl', 'spa', 'snc', 'sas', 'sarl', 'sa', 'ltd', 'inc', 'ag', 'ohg', 'ug', 'bv', 'nv', 'llc']);
const senzaSigle = (s: string) => normalizzaNome(s).split(' ').filter((p) => p && !SIGLE.has(p)).join(' ').trim();

/* ---------- Codice cliente → cliente (interscambio valido alla data, D-71) ---------- */
async function abbinamentoPerCodice(db: Db, l: Letto): Promise<Abbinamento | null> {
  if (l.fornitore_id == null || !l.codice_cliente) return null;
  const giorno = l.data ? new Date(l.data + 'T00:00:00Z') : new Date(); // oggi se manca (§6.5 punto 5)
  const a = await db.interscambio.findFirst({
    where: {
      fornitore_id: l.fornitore_id,
      codice_cliente_fornitore: { equals: l.codice_cliente, mode: 'insensitive' },
      valido_dal: { lte: giorno },
      OR: [{ valido_al: null }, { valido_al: { gt: giorno } }],
    },
    select: { cliente_id: true, codice_cliente_fornitore: true, cliente: { select: { corrente: { select: { ragione_sociale: true } } } } },
  });
  if (!a) return null;
  return { cliente_id: a.cliente_id, cliente: a.cliente.corrente?.ragione_sociale ?? null, codice: a.codice_cliente_fornitore };
}

/* ---------- Cliente per P.IVA o ragione sociale (D-92) ---------- */
/** P.IVA normalizzata: solo lettere e cifre, maiuscole; il prefisso del paese davanti alle cifre cade
 *  (`IT 012…`, `DE 012…`, D-124), con la stessa base dell'import da Integra (R1-09). */
export const normalizzaPiva = (s: string) => pivaNormalizzata((s || '').replace(/[^0-9A-Za-z]/g, '')).replace(/^[A-Z]{2}(?=\d)/, '');

export type ClienteConCorrente = { id: bigint; corrente: { piva: string | null; ragione_sociale: string } | null };

/** Risolve il cliente per P.IVA o ragione sociale (D-92): vince la P.IVA (univoca), poi la ragione
 *  sociale normalizzata accettata solo con un solo candidato. I clienti si passano già caricati, così
 *  l'elenco li legge una volta sola per pagina (D-106). null = cliente non riconosciuto. */
export function riconosciClienteDai(clienti: ClienteConCorrente[], piva_cliente: string | null, cliente: string | null): { cliente_id: bigint; ragione: string | null } | null {
  const piva = normalizzaPiva(piva_cliente ?? '');
  if (piva.length >= 11) {
    const c = clienti.find((x) => x.corrente?.piva != null && normalizzaPiva(x.corrente.piva) === piva);
    if (c) return { cliente_id: c.id, ragione: c.corrente!.ragione_sociale };
  }
  const nome = normalizzaNome(cliente ?? '');
  if (nome) {
    const cc = clienti.filter((x) => x.corrente && normalizzaNome(x.corrente.ragione_sociale) === nome);
    if (cc.length === 1) return { cliente_id: cc[0].id, ragione: cc[0].corrente!.ragione_sociale };
  }
  return null;
}

/** Riconosce il cliente del documento quando il codice del fornitore non è abbinato (D-92). */
export async function riconosciCliente(db: Db, l: Letto): Promise<{ cliente_id: bigint; ragione: string | null } | null> {
  // una sola lettura dei clienti con la versione corrente (P.IVA e ragione sociale stanno sulla versione, §4.6)
  const clienti = await db.clienti.findMany({ where: { versione_corrente_id: { not: null } }, include: { corrente: true } });
  return riconosciClienteDai(clienti as ClienteConCorrente[], l.piva_cliente, l.cliente);
}

/* ---------- Agenzia mancante (D-106) ---------- */

/** Tipi che entrano in una pratica: l'ordine la apre, gli altri si abbinano (§6.5). */
const ENTRA_IN_PRATICA = new Set(['ordine', 'conferma', 'fattura', 'nota_credito']);

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
const CON_PROP = {
  righe: { orderBy: { numero_riga: 'asc' as const } },
  documenti: { select: { tipo: true, numero: true } },
  cliente: { select: { ragione_sociale: true } },
} satisfies Prisma.ordini_fornitore_testataInclude;

export async function propostaDocumento(db: Db, l: Letto, contesto: Contesto = {}): Promise<Proposta> {
  const imp = importoDocumento(l);
  // base della risposta: i campi nuovi (D-111/D-112) sono null finché un esito non li riempie
  const base: Proposta = { esito: 'nessuno', candidati: [], importo: imp, abbinamento: null, cliente_riconosciuto: null, agenzia_mancante: null, fornitore_da_integra: null, cliente_da_integra: null, manca_rappresentanza: null };
  if (l.tipo === 'bollettino') {
    const gia = l.fornitore_id != null && l.mese != null && l.anno != null
      ? await db.bollettini_testata.findFirst({ where: { fornitore_id: l.fornitore_id, mese: l.mese, anno: l.anno }, select: { id: true } })
      : null;
    return { ...base, esito: gia ? 'doppio' : 'bollettino' };
  }

  // D-111: fornitore letto non in anagrafica ma una sola riga in Integra → importa; 0 o più righe: a mano,
  // mai una scelta a caso (D-111)
  if (l.fornitore_id == null) {
    const c = (contesto.fornitore_su_integra ?? []).filter((x) => x.id_integra != null);
    if (c.length === 1) {
      return { ...base, esito: 'fornitore_da_integra', fornitore_da_integra: { id_integra: c[0].id_integra, ragione_sociale: c[0].ragione_sociale, piva: c[0].piva } };
    }
  }

  const ab = await abbinamentoPerCodice(db, l);
  // D-92 + D-106: cliente riconosciuto (codice del fornitore, altrimenti P.IVA/ragione sociale)
  const cliente_riconosciuto = ab ? null : await riconosciCliente(db, l);
  const storico = contesto.storico ?? [];
  // D-112: la coppia cliente-fornitore nello storico, con o senza subagente
  const coppiaCon = storico.find((s) => s.rappresentato) ?? null;
  const coppiaSenza = storico.length > 0 && !storico.some((s) => s.rappresentato) ? storico[0] : null;

  // D-111/D-112: cliente non riconosciuto ma proposto dallo storico (subagente + sconto) o da una riga di Integra.
  // Vale per i tipi che entrano in pratica, prima dell'ordine (il doppione di un ordine vince comunque, vedi sotto).
  const clienteDaIntegra = (): Proposta | null => {
    if (l.fornitore_id == null || ab != null || cliente_riconosciuto != null) return null;
    if (coppiaCon) {
      return { ...base, esito: 'cliente_da_integra', cliente_da_integra: { id_integra: null, ragione_sociale: coppiaCon.cliente_ragione_sociale, piva: coppiaCon.cliente_piva, subagente: coppiaCon.subagente_nome, sconto: coppiaCon.sconto } };
    }
    const c = (contesto.cliente_su_integra ?? []).filter((x) => x.id_integra != null);
    if (c.length === 1) {
      return { ...base, esito: 'cliente_da_integra', cliente_da_integra: { id_integra: c[0].id_integra, ragione_sociale: c[0].ragione_sociale, piva: c[0].piva, subagente: null, sconto: null } };
    }
    return null;
  };

  if (l.tipo === 'ordine') {
    // il numero letto è quello del fornitore: il doppione si cerca fra i documenti della pratica,
    // non sul numero della pratica (che il CRM genera OF/AAAA/NNN, D-60)
    const gia = l.fornitore_id != null && l.numero
      ? await db.ordini_fornitore_documenti.findFirst({ where: { tipo: 'ordine', numero: l.numero, testata: { fornitore_id: l.fornitore_id } }, select: { id: true } })
      : null;
    if (gia) return { ...base, esito: 'doppio' };
    const cd = clienteDaIntegra();
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
  if (l.tipo !== 'conferma' && l.tipo !== 'fattura' && l.tipo !== 'nota_credito') {
    return { ...base, esito: 'nessuno', abbinamento: ab, cliente_riconosciuto: null }; // proforma, pagamento, altro o tipo non letto
  }
  // una fattura già registrata in una pratica è un doppione
  if (l.tipo === 'fattura' && l.fornitore_id != null && l.numero) {
    const gia = await db.ordini_fornitore_documenti.findFirst({ where: { tipo: 'fattura', numero: l.numero, testata: { fornitore_id: l.fornitore_id } }, select: { id: true } });
    if (gia) return { ...base, esito: 'doppio', abbinamento: ab, cliente_riconosciuto: null };
  }

  const cd = clienteDaIntegra();
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
      where: { fornitore_id: l.fornitore_id, ...(ab ? { cliente_id: ab.cliente_id } : {}) },
      include: CON_PROP,
    })
    : [];
  // conferma: esclude le pratiche che hanno già una conferma o documenti fiscali; fattura: quelle che hanno già quella fattura
  const pool = testate.filter((t) => {
    if (l.tipo === 'conferma') return !t.documenti.some((d) => d.tipo === 'conferma') && !t.documenti.some((d) => fiscale(d.tipo));
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
    return {
      pratica: { id: String(t.id), numero: t.numero_ordine, cliente: t.cliente?.ragione_sociale ?? null, stato: t.stato, data_ordine: iso(t.data_ordine) },
      punteggio: quota - (giaFatt ? 0.5 : 0),
      motivi,
      delta: round2(imp - importoRif),
    };
  }).sort((a, b) => b.punteggio - a.punteggio);

  // nota di credito con riferimento alla fattura stornata: la pratica di quella fattura è certa e va prima
  if (l.tipo === 'nota_credito' && l.riferimento_fattura) {
    const k = candidati.findIndex((c) => (fiscaliNumeri.get(c.pratica.id) ?? []).includes(l.riferimento_fattura!));
    if (k >= 0) {
      const c = candidati.splice(k, 1)[0];
      c.motivi.unshift(`storna la fattura ${l.riferimento_fattura} di questa pratica`);
      candidati.unshift(c);
      return { ...base, esito: 'certo', candidati, abbinamento: ab, cliente_riconosciuto };
    }
  }

  let esito: Esito = 'nessuno';
  if (candidati.length && !ab) esito = candidati[0].punteggio > 0 ? 'probabile' : 'nessuno';
  else if (candidati.length === 1) esito = 'certo';
  else if (candidati.length > 1) esito = candidati[0].punteggio - candidati[1].punteggio >= 0.5 ? 'probabile' : 'ambiguo';
  return { ...base, esito, candidati, abbinamento: ab, cliente_riconosciuto };
}

/* ---------- Controlli fissi (§6.5 punto 5) ---------- */
export async function controlliFissi(db: Db, l: Letto, proposta: Proposta): Promise<Controllo[]> {
  const out: Controllo[] = [];
  const f = l.fornitore_id != null;

  if (l.tipo === 'bollettino') {
    if (f && l.mese != null && l.anno != null
      && await db.bollettini_testata.findFirst({ where: { fornitore_id: l.fornitore_id!, mese: l.mese, anno: l.anno }, select: { id: true } })) {
      out.push({ codice: 'bollettino', campo: 'mese', testo: 'Bollettino già registrato per questo fornitore e mese', grave: true });
    }
    return out; // gli altri controlli non valgono per il bollettino
  }

  if (f && l.codice_cliente && proposta.abbinamento == null) {
    out.push({ codice: 'codice_cliente', campo: 'codice_cliente', testo: `Codice cliente ${l.codice_cliente} non presente fra i clienti del fornitore`, grave: true });
  }

  const somma = round2(l.righe.reduce((s, r) => s + importoRigaLetta(r), 0));
  if (l.importo != null && Math.abs(l.importo - somma) >= 0.01) {
    out.push({ codice: 'totale', campo: 'totale', testo: `Totale del documento ${euro(l.importo)} diverso dalla somma delle righe ${euro(somma)}`, grave: true });
  }

  l.righe.forEach((r, i) => {
    if (r.quantita != null && r.prezzo != null && r.importo != null) {
      const atteso = round2(r.quantita * r.prezzo);
      if (Math.abs(atteso - r.importo) >= 0.01) {
        out.push({ codice: 'riga', campo: `righe[${i}]`, testo: `Riga ${i + 1}: quantità × prezzo ${euro(atteso)} diverso dall'importo ${euro(r.importo)}`, grave: false });
      }
    }
  });

  // pratica proposta = la prima candidata: articoli assenti e data prima dell'ordine
  const prima = proposta.candidati[0];
  if (f && prima) {
    const t = await db.ordini_fornitore_testata.findUnique({ where: { id: BigInt(prima.pratica.id) }, include: { righe: true } });
    if (t) {
      const codiciPratica = new Set(t.righe.map((r) => r.codice).filter((c): c is string => !!c));
      l.righe.forEach((r, i) => {
        if (r.codice && !codiciPratica.has(r.codice)) {
          out.push({ codice: 'articolo', campo: `righe[${i}]`, testo: `Articolo ${r.codice} assente fra le righe della pratica proposta`, grave: false });
        }
      });
      if (l.data && t.data_ordine && l.data < iso(t.data_ordine)) {
        out.push({ codice: 'data', campo: 'data', testo: `Data del documento ${l.data} precedente alla data dell'ordine ${iso(t.data_ordine)}`, grave: false });
      }
    }
  }

  return out;
}

/* ---------- Livello del documento (§6.5 punto 6, M.statoLettura) ---------- */
/** Soglie dalla configurazione; se non c'è una configurazione valida, le iniziali 0,9/0,7. */
async function soglieLettura(db: Db): Promise<Soglie> {
  const c = await letturaConfig(db);
  return { soglia_ok: c?.soglia_ok ?? 0.9, soglia_bassa: c?.soglia_bassa ?? 0.7 };
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
  if (controlli.some((c) => c.grave)) bassa = true;
  const n = incerti.length + controlli.length;
  return { campi: incerti, controlli, n, livello: bassa ? 'bassa' : n ? 'da_controllare' : 'affidabile' };
}
