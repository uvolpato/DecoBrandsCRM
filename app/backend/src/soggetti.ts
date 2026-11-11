import {
  BadRequestException, Body, ConflictException, Controller, Get, HttpCode, NotFoundException, Param, ParseIntPipe, Post, Put, Query, Req,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsISO8601, IsOptional, IsString, Matches, MaxLength, Min, ValidateIf } from 'class-validator';
import type { Request } from 'express';
import { Richiede, contesto } from './accesso';
import { giornoRoma } from './motore/dati';
import { PrismaService } from './prisma.service';
import { logEvent } from './registro';

// Anagrafica unica a soggetti (F1-A8, D-100…D-102, specifica-anagrafica-soggetti.md §4–§6).
// Il master `soggetti` sta sopra clienti/fornitori/agenti/subagenti, che restano quelli dello strato 0.
// Ogni calcolo e ogni vincolo si fanno qui, dal database (V12, D-28); una operazione, una transazione
// (V13, D-36). Niente cancellazioni: si disattiva o si chiude con `valido_al` (§1.4).

type Db = Prisma.TransactionClient | PrismaService;
type TipoRuolo = 'cliente' | 'fornitore' | 'subagente';
const TIPI_SEDE = ['legale', 'operativa', 'punto_vendita', 'magazzino', 'fatturazione'];
const TIPI_RECAPITO = ['email', 'pec', 'telefono', 'cellulare', 'fax', 'sito'];
const RUOLI_PERSONA = ['titolare', 'acquisti', 'amministrazione', 'magazzino', 'referente'];
const VISTE = ['tutti', 'cliente', 'fornitore', 'subagente', 'nonattivi'];

// ---------- Normalizzazione al confine (§1.6): si salva com'è scritto e normalizzato ----------
const testo = (v: unknown) => String(v ?? '').trim().replace(/\s+/g, ' ');
const normalizzaCF = (v: string) => v.replace(/\s/g, '').toUpperCase();
/** P.IVA normalizzata, riusata dall'import su richiesta da Integra (D-111). */
export function normalizzaPiva(v: string) {
  const s = v.replace(/[\s.]/g, '').toUpperCase();
  return /^IT\d{11}$/.test(s) ? s.slice(2) : s;
}
const pivaValida = (s: string) => /^\d{11}$/.test(s) || /^[A-Z]{2}[A-Z0-9]{2,}$/.test(s);
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const iso = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);
const oggi = () => giornoRoma(new Date());
const soloData = (s: string) => new Date(`${s}T00:00:00Z`);

// Campo facoltativo che può arrivare vuoto: @IsOptional lascerebbe passare '' e farebbe fallire i @Matches
const Facoltativo = () => ValidateIf((_o, v) => v !== undefined && v !== null && v !== '');

/** P.IVA e CF normalizzati con i controlli del master: senza dati fiscali non è un soggetto (§7.4).
 *  Riusata dall'import su richiesta da Integra (D-111). */
export function datiFiscali(piva: string | null, codice_fiscale: string | null, paese: string) {
  const pn = normalizzaPiva(piva ?? '');
  const cn = normalizzaCF(codice_fiscale ?? '');
  const p = paese.toUpperCase().slice(0, 2) || 'IT';
  if (!/^[A-Z]{2}$/.test(p)) throw new BadRequestException('Il paese ha due lettere (ISO 3166-1)');
  if (!pn && !cn) throw new BadRequestException('Serve almeno P.IVA o codice fiscale: senza, sono contatti, non soggetti');
  if (pn && !pivaValida(pn)) {
    throw new BadRequestException('La P.IVA non è valida: le corte (9–10 cifre) vanno in scarto, non si inventano (§7.4)');
  }
  return {
    piva: piva ? testo(piva) || null : null,
    piva_norm: pn,
    codice_fiscale: codice_fiscale ? testo(codice_fiscale) || null : null,
    cf_norm: cn,
    paese: p,
  };
}

// ---------- DTO (forbidNonWhitelisted: il server accetta solo i campi dichiarati) ----------
class FiltroSoggetti {
  @IsOptional() @IsString() @MaxLength(200) q?: string;
  @IsOptional() @IsIn(VISTE) vista?: string;
  @IsOptional() @IsIn(['codice', 'nome']) ordina?: 'codice' | 'nome';
  @IsOptional() @IsIn(['asc', 'desc']) dir?: 'asc' | 'desc';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pagina?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) righe?: number;
}

class DatiSoggetto {
  @IsIn(['azienda', 'persona'], { message: 'La natura è azienda o persona' }) natura!: string;
  @Facoltativo() @Matches(/^[A-Za-z]{2}$/, { message: 'Il paese ha due lettere (ISO 3166-1)' }) paese?: string | null;
  @IsOptional() @IsString() @MaxLength(30) piva?: string | null;
  @IsOptional() @IsString() @MaxLength(30) codice_fiscale?: string | null;
  @IsOptional() @IsString() @MaxLength(2000) note?: string | null;
}

class ModificaSoggetto {
  @IsOptional() @IsIn(['azienda', 'persona'], { message: 'La natura è azienda o persona' }) natura?: string;
  @Facoltativo() @Matches(/^[A-Za-z]{2}$/, { message: 'Il paese ha due lettere (ISO 3166-1)' }) paese?: string | null;
  @IsOptional() @IsString() @MaxLength(30) piva?: string | null;
  @IsOptional() @IsString() @MaxLength(30) codice_fiscale?: string | null;
  @IsOptional() @IsString() @MaxLength(2000) note?: string | null;
}

class Attivo {
  @IsBoolean() attivo!: boolean;
}

class DatiSede {
  @IsIn(TIPI_SEDE, { message: 'Tipo di sede non previsto' }) tipo!: string;
  @IsOptional() @IsString() @MaxLength(255) insegna?: string | null;
  @IsOptional() @IsString() @MaxLength(255) indirizzo?: string | null;
  @IsOptional() @IsString() @MaxLength(10) cap?: string | null;
  @IsOptional() @IsString() @MaxLength(100) citta?: string | null;
  @Facoltativo() @Matches(/^[A-Za-z]{2}$/, { message: 'La provincia ha due lettere' }) provincia?: string | null;
  @Facoltativo() @Matches(/^[A-Za-z]{2}$/, { message: 'Il paese ha due lettere (ISO 3166-1)' }) paese?: string | null;
  @IsOptional() @IsBoolean() predefinita?: boolean;
  @IsOptional() @IsISO8601({ strict: true }) valido_dal?: string | null;
  @IsOptional() @IsISO8601({ strict: true }) valido_al?: string | null;
}

class ModificaSede {
  @IsOptional() @IsIn(TIPI_SEDE, { message: 'Tipo di sede non previsto' }) tipo?: string;
  @IsOptional() @IsString() @MaxLength(255) insegna?: string | null;
  @IsOptional() @IsString() @MaxLength(255) indirizzo?: string | null;
  @IsOptional() @IsString() @MaxLength(10) cap?: string | null;
  @IsOptional() @IsString() @MaxLength(100) citta?: string | null;
  @Facoltativo() @Matches(/^[A-Za-z]{2}$/, { message: 'La provincia ha due lettere' }) provincia?: string | null;
  @Facoltativo() @Matches(/^[A-Za-z]{2}$/, { message: 'Il paese ha due lettere (ISO 3166-1)' }) paese?: string | null;
  @IsOptional() @IsBoolean() predefinita?: boolean;
  @IsOptional() @IsISO8601({ strict: true }) valido_dal?: string | null;
  @IsOptional() @IsISO8601({ strict: true }) valido_al?: string | null;
}

class DatiRecapito {
  @IsIn(TIPI_RECAPITO, { message: 'Tipo di recapito non previsto' }) tipo!: string;
  @IsString() @Matches(/\S/, { message: 'Scrivi il recapito' }) @MaxLength(255) valore!: string;
  @IsOptional() @IsInt() soggetto_id?: number;
  @IsOptional() @IsInt() sede_id?: number;
  @IsOptional() @IsInt() persona_id?: number;
  @IsOptional() @IsString() @MaxLength(30) etichetta?: string | null;
  @IsOptional() @IsBoolean() predefinito?: boolean;
  @IsOptional() @IsISO8601({ strict: true }) valido_dal?: string | null;
  @IsOptional() @IsISO8601({ strict: true }) valido_al?: string | null;
}

class ModificaRecapito {
  @IsOptional() @IsIn(TIPI_RECAPITO, { message: 'Tipo di recapito non previsto' }) tipo?: string;
  @IsOptional() @IsString() @Matches(/\S/, { message: 'Scrivi il recapito' }) @MaxLength(255) valore?: string;
  @IsOptional() @IsString() @MaxLength(30) etichetta?: string | null;
  @IsOptional() @IsBoolean() predefinito?: boolean;
  @IsOptional() @IsISO8601({ strict: true }) valido_dal?: string | null;
  @IsOptional() @IsISO8601({ strict: true }) valido_al?: string | null;
}

class DatiPersona {
  @IsString() @Matches(/\S/, { message: 'Scrivi il nome' }) @MaxLength(100) nome!: string;
  @IsString() @Matches(/\S/, { message: 'Scrivi il cognome' }) @MaxLength(100) cognome!: string;
  @IsOptional() @IsString() @MaxLength(100) titolo?: string | null;
  @IsOptional() @IsString() @MaxLength(2000) note?: string | null;
  @IsOptional() @IsBoolean() attivo?: boolean;
}

class ModificaPersona {
  @IsOptional() @IsString() @Matches(/\S/, { message: 'Scrivi il nome' }) @MaxLength(100) nome?: string;
  @IsOptional() @IsString() @Matches(/\S/, { message: 'Scrivi il cognome' }) @MaxLength(100) cognome?: string;
  @IsOptional() @IsString() @MaxLength(100) titolo?: string | null;
  @IsOptional() @IsString() @MaxLength(2000) note?: string | null;
  @IsOptional() @IsBoolean() attivo?: boolean;
}

class DatiContatto {
  @IsInt() persona_id!: number;
  @IsOptional() @IsInt() sede_id?: number;
  @IsOptional() @IsIn(RUOLI_PERSONA, { message: 'Ruolo della persona non previsto' }) ruolo?: string | null;
  @IsOptional() @IsBoolean() referente?: boolean;
  @IsOptional() @IsISO8601({ strict: true }) valido_dal?: string | null;
  @IsOptional() @IsISO8601({ strict: true }) valido_al?: string | null;
}

class ChiusuraContatto {
  @IsISO8601({ strict: true }) valido_al!: string;
}

class DatiFatturazione {
  @Facoltativo() @Matches(/^[A-Za-z0-9]{7}$/, { message: 'Il codice destinatario ha 7 lettere o cifre' }) codice_destinatario?: string | null;
  @Facoltativo() @Matches(EMAIL, { message: 'La PEC non è valida' }) @MaxLength(255) pec_destinatario?: string | null;
  @Facoltativo() @Matches(/^[A-Za-z0-9]{6}$/, { message: 'Il codice ufficio ha 6 lettere o cifre' }) codice_univoco_ufficio?: string | null;
  @Facoltativo() @Matches(/^[A-Za-z]{2}$/, { message: 'Il paese ha due lettere (ISO 3166-1)' }) id_paese_estero?: string | null;
  @IsOptional() @IsString() @MaxLength(28) id_codice_estero?: string | null;
  @Facoltativo() @Matches(/^RF\d{2}$/, { message: 'Il regime fiscale è RF01…RF19' }) regime_fiscale?: string | null;
  @IsOptional() @IsBoolean() split_payment?: boolean;
  @IsOptional() @IsBoolean() reverse_charge?: boolean;
  @IsOptional() @IsIn(['I', 'D', 'S'], { message: "L'esigibilità IVA è I, D o S" }) esigibilita_iva?: string | null;
  @IsOptional() @IsBoolean() attiva?: boolean;
  @IsOptional() @IsString() @MaxLength(2000) note?: string | null;
}

class NuovoRuolo {
  @IsIn(['cliente', 'fornitore'], { message: 'Il ruolo si crea cliente o fornitore: il subagente nasce dalla sua pagina' }) tipo!: 'cliente' | 'fornitore';
  @IsString() @Matches(/\S/, { message: 'Scrivi la ragione sociale' }) @MaxLength(255) ragione_sociale!: string;
  @IsOptional() @IsString() @MaxLength(50) codice_integra?: string | null;
  @IsOptional() @IsString() @MaxLength(100) citta?: string | null;
}

// ---------- Letture ----------
interface Ruolo {
  tipo: TipoRuolo;
  id: string;
  nome: string;
  codice: string;
  attivo: boolean;
}

/** I ruoli dei soggetti richiesti, letti dallo strato 0 (D-101: un codice per ruolo). */
async function ruoliDi(db: Db, ids: bigint[]): Promise<Map<string, Ruolo[]>> {
  const mappa = new Map<string, Ruolo[]>();
  if (!ids.length) return mappa;
  const [clienti, fornitori, subagenti] = await Promise.all([
    db.clienti.findMany({ where: { soggetto_id: { in: ids } }, include: { corrente: { select: { ragione_sociale: true } } } }),
    db.fornitori.findMany({ where: { soggetto_id: { in: ids } }, include: { corrente: { select: { ragione_sociale: true } } } }),
    db.subagenti.findMany({ where: { soggetto_id: { in: ids } } }),
  ]);
  const [cc, cf, cs] = await Promise.all([
    codiciPerRuolo(db, 'cliente', clienti.map((c) => c.id)),
    codiciPerRuolo(db, 'fornitore', fornitori.map((f) => f.id)),
    codiciPerRuolo(db, 'subagente', subagenti.map((s) => s.id)),
  ]);
  const aggiungi = (soggetto_id: bigint | null, ruolo: Ruolo) => {
    if (soggetto_id === null) return;
    const k = String(soggetto_id);
    mappa.set(k, [...(mappa.get(k) ?? []), ruolo]);
  };
  for (const c of clienti) aggiungi(c.soggetto_id, { tipo: 'cliente', id: String(c.id), nome: c.corrente?.ragione_sociale ?? '', codice: cc.get(String(c.id)) ?? '', attivo: c.attivo });
  for (const f of fornitori) aggiungi(f.soggetto_id, { tipo: 'fornitore', id: String(f.id), nome: f.corrente?.ragione_sociale ?? '', codice: cf.get(String(f.id)) ?? '', attivo: f.attivo });
  for (const s of subagenti) aggiungi(s.soggetto_id, { tipo: 'subagente', id: String(s.id), nome: `${s.nome} ${s.cognome}`.trim(), codice: cs.get(String(s.id)) ?? '', attivo: s.attivo });
  return mappa;
}

async function codiciPerRuolo(db: Db, tipo: TipoRuolo, ids: bigint[]) {
  const righe = await db.codici_esterni.findMany({ where: { sistema: 'integra', tipo, entita_id: { in: ids } } });
  return new Map(righe.map((c) => [String(c.entita_id), c.codice]));
}

const nomeDi = (ruoli: Ruolo[]) => (ruoli.find((r) => r.attivo) ?? ruoli[0])?.nome ?? '';

function mappaIdentita(s: {
  id: bigint; codice: string; natura: string; paese: string; piva: string | null; piva_norm: string;
  codice_fiscale: string | null; cf_norm: string; sorgente: string; attivo: boolean; note: string | null;
  creato_il: Date; modificato_il: Date;
}) {
  return {
    id: String(s.id), codice: s.codice, natura: s.natura, paese: s.paese, piva: s.piva, piva_norm: s.piva_norm,
    codice_fiscale: s.codice_fiscale, cf_norm: s.cf_norm, sorgente: s.sorgente, attivo: s.attivo, note: s.note,
    creato_il: s.creato_il, modificato_il: s.modificato_il,
  };
}

function mappaSede(s: {
  id: bigint; soggetto_id: bigint; tipo: string; insegna: string | null; indirizzo: string | null; cap: string | null;
  citta: string | null; provincia: string | null; paese: string; settore_id: bigint | null; gruppo_id: bigint | null;
  predefinita: boolean; attivo: boolean; valido_dal: Date | null; valido_al: Date | null;
}) {
  return {
    id: String(s.id), soggetto_id: String(s.soggetto_id), tipo: s.tipo, insegna: s.insegna, indirizzo: s.indirizzo,
    cap: s.cap, citta: s.citta, provincia: s.provincia, paese: s.paese,
    settore_id: s.settore_id === null ? null : String(s.settore_id),
    gruppo_id: s.gruppo_id === null ? null : String(s.gruppo_id),
    predefinita: s.predefinita, attivo: s.attivo, valido_dal: iso(s.valido_dal), valido_al: iso(s.valido_al),
  };
}

function mappaRecapito(r: {
  id: bigint; soggetto_id: bigint | null; sede_id: bigint | null; persona_id: bigint | null; tipo: string;
  valore: string; etichetta: string | null; predefinito: boolean; valido_dal: Date | null; valido_al: Date | null;
}) {
  return {
    id: String(r.id),
    soggetto_id: r.soggetto_id === null ? null : String(r.soggetto_id),
    sede_id: r.sede_id === null ? null : String(r.sede_id),
    persona_id: r.persona_id === null ? null : String(r.persona_id),
    tipo: r.tipo, valore: r.valore, etichetta: r.etichetta, predefinito: r.predefinito,
    valido_dal: iso(r.valido_dal), valido_al: iso(r.valido_al),
  };
}

function mappaPersona(p: { id: bigint; nome: string; cognome: string; titolo: string | null; note: string | null; attivo: boolean }) {
  return { id: String(p.id), nome: p.nome, cognome: p.cognome, titolo: p.titolo, note: p.note, attivo: p.attivo };
}

function mappaFatturazione(f: {
  soggetto_id: bigint; codice_destinatario: string | null; pec_destinatario: string | null; codice_univoco_ufficio: string | null;
  id_paese_estero: string | null; id_codice_estero: string | null; regime_fiscale: string | null;
  split_payment: boolean; reverse_charge: boolean; esigibilita_iva: string | null; attiva: boolean; note: string | null;
}) {
  return {
    soggetto_id: String(f.soggetto_id), codice_destinatario: f.codice_destinatario, pec_destinatario: f.pec_destinatario,
    codice_univoco_ufficio: f.codice_univoco_ufficio, id_paese_estero: f.id_paese_estero, id_codice_estero: f.id_codice_estero,
    regime_fiscale: f.regime_fiscale, split_payment: f.split_payment, reverse_charge: f.reverse_charge,
    esigibilita_iva: f.esigibilita_iva, attiva: f.attiva, note: f.note,
  };
}

/** P.IVA/CF già presenti su un altro soggetto: 409 con codice e nome dell'esistente (§4.1, D-102). */
async function controlloDuplicati(db: Db, d: { paese: string; piva_norm: string; cf_norm: string }, escludi: bigint | null) {
  const altro = escludi ? { id: { not: escludi } } : {};
  if (d.piva_norm) {
    const t = await db.soggetti.findFirst({ where: { paese: d.paese, piva_norm: d.piva_norm, ...altro } });
    if (t) throw new ConflictException(`La P.IVA è già del soggetto ${t.codice}${await nomeDopo(db, t.id)}`);
    return;
  }
  if (d.cf_norm) {
    const t = await db.soggetti.findFirst({ where: { paese: d.paese, piva_norm: '', cf_norm: d.cf_norm, ...altro } });
    if (t) throw new ConflictException(`Il codice fiscale è già del soggetto ${t.codice}${await nomeDopo(db, t.id)}`);
  }
}
const nomeDopo = async (db: Db, id: bigint) => {
  const nome = await nomeSoggetto(db, id);
  return nome ? `: ${nome}` : '';
};

async function nomeSoggetto(db: Db, id: bigint) {
  return nomeDi((await ruoliDi(db, [id])).get(String(id)) ?? []);
}

const soggettoEsiste = async (db: Db, id: bigint) => {
  const s = await db.soggetti.findUnique({ where: { id } });
  if (!s) throw new NotFoundException('Soggetto non trovato');
  return s;
};

/** Ruoli attivi: bloccano la disattivazione del soggetto finché non si chiudono (attivo = false). */
async function ruoliAttivi(db: Db, id: bigint) {
  const ruoli = (await ruoliDi(db, [id])).get(String(id)) ?? [];
  return ruoli.filter((r) => r.attivo);
}

// Errori del database come risposte: doppione 409, violazione di un CHECK 400 (V12)
async function unico<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    const errore = e as { code?: string; cause?: { originalCode?: string } };
    const code = errore.code ?? errore.cause?.originalCode;
    if (code === 'P2002' || code === '23505') throw new ConflictException('Esiste già un dato uguale (codice, P.IVA o codice fiscale)');
    if (code === '23514') throw new BadRequestException('Valore non ammesso');
    throw e;
  }
}

// La query dell'elenco: nome dal primo ruolo attivo, filtri e ordinamento in SQL (D-52)
const CTE_ELENCO = Prisma.sql`
  WITH base AS (
    SELECT s.id, s.codice, s.natura, s.paese, s.piva, s.piva_norm, s.codice_fiscale, s.cf_norm, s.attivo,
      (SELECT cv.ragione_sociale FROM clienti c JOIN clienti_versioni cv ON cv.cliente_id = c.id AND cv.id = c.versione_corrente_id
        WHERE c.soggetto_id = s.id AND c.attivo LIMIT 1) AS cliente_nome,
      (SELECT fv.ragione_sociale FROM fornitori f JOIN fornitori_versioni fv ON fv.fornitore_id = f.id AND fv.id = f.versione_corrente_id
        WHERE f.soggetto_id = s.id AND f.attivo LIMIT 1) AS fornitore_nome,
      (SELECT sa.nome || ' ' || sa.cognome FROM subagenti sa WHERE sa.soggetto_id = s.id AND sa.attivo LIMIT 1) AS subagente_nome,
      EXISTS (SELECT 1 FROM clienti c WHERE c.soggetto_id = s.id) AS cliente,
      EXISTS (SELECT 1 FROM fornitori f WHERE f.soggetto_id = s.id) AS fornitore,
      EXISTS (SELECT 1 FROM subagenti sa WHERE sa.soggetto_id = s.id) AS subagente
    FROM soggetti s
  ), righe AS (
    SELECT *, COALESCE(cliente_nome, fornitore_nome, subagente_nome, '') AS nome FROM base
  )`;

function filtroTesto(q: string) {
  return Prisma.sql`(${q} = '' OR lower(codice) LIKE ${q} OR lower(nome) LIKE ${q}
    OR lower(COALESCE(piva, '')) LIKE ${q} OR lower(piva_norm) LIKE ${q}
    OR lower(COALESCE(codice_fiscale, '')) LIKE ${q} OR lower(cf_norm) LIKE ${q})`;
}

function filtroVista(vista: string) {
  if (vista === 'cliente') return Prisma.sql`cliente`;
  if (vista === 'fornitore') return Prisma.sql`fornitore`;
  if (vista === 'subagente') return Prisma.sql`subagente`;
  if (vista === 'nonattivi') return Prisma.sql`NOT attivo`;
  return Prisma.sql`TRUE`;
}

// ---------- Soggetti ----------
@Controller('soggetti')
export class SoggettiController {
  constructor(private readonly db: PrismaService) {}

  @Get()
  @Richiede('dati.consulta')
  async elenco(@Query() f: FiltroSoggetti) {
    const vista = f.vista ?? 'tutti';
    const q = `%${testo(f.q).toLowerCase()}%`;
    const ordina = f.ordina === 'nome' ? Prisma.raw('nome') : Prisma.raw('codice');
    const dir = f.dir === 'desc' ? Prisma.raw('DESC') : Prisma.raw('ASC');
    const righe = Math.min(f.righe ?? 25, 200);
    const salto = ((f.pagina ?? 1) - 1) * righe;
    const [conteggi, pagina] = await Promise.all([
      // D-23: i segmenti contano con gli altri filtri attivi e senza il filtro del segmento
      this.db.$queryRaw<{ tutti: number; cliente: number; fornitore: number; subagente: number; nonattivi: number }[]>(Prisma.sql`
        ${CTE_ELENCO}
        SELECT count(*)::int AS tutti, count(*) FILTER (WHERE cliente)::int AS cliente,
          count(*) FILTER (WHERE fornitore)::int AS fornitore, count(*) FILTER (WHERE subagente)::int AS subagente,
          count(*) FILTER (WHERE NOT attivo)::int AS nonattivi
        FROM righe WHERE ${filtroTesto(q)}`),
      this.db.$queryRaw<{ id: unknown; codice: string; natura: string; paese: string; piva: string | null; piva_norm: string; codice_fiscale: string | null; cf_norm: string; attivo: boolean }[]>(Prisma.sql`
        ${CTE_ELENCO}
        SELECT id, codice, natura, paese, piva, piva_norm, codice_fiscale, cf_norm, attivo
        FROM righe WHERE ${filtroTesto(q)} AND ${filtroVista(vista)}
        ORDER BY ${ordina} ${dir}, codice ASC LIMIT ${righe} OFFSET ${salto}`),
    ]);
    const c = conteggi[0];
    const perSoggetto = await ruoliDi(this.db, pagina.map((r) => BigInt(String(r.id))));
    return {
      righe: pagina.map((r) => ({
        id: String(r.id), codice: r.codice, natura: r.natura, paese: r.paese, piva: r.piva, piva_norm: r.piva_norm,
        codice_fiscale: r.codice_fiscale, cf_norm: r.cf_norm, attivo: r.attivo,
        nome: nomeDi(perSoggetto.get(String(r.id)) ?? []),
        ruoli: perSoggetto.get(String(r.id)) ?? [],
      })),
      totale: vista === 'cliente' ? c.cliente : vista === 'fornitore' ? c.fornitore : vista === 'subagente' ? c.subagente : vista === 'nonattivi' ? c.nonattivi : c.tutti,
      conteggi: c,
    };
  }

  @Get(':id')
  @Richiede('dati.consulta')
  async dettaglio(@Param('id', ParseIntPipe) id: number) {
    const s = await soggettoEsiste(this.db, BigInt(id));
    const ruoli = (await ruoliDi(this.db, [s.id])).get(String(s.id)) ?? [];
    const sedi = await this.db.sedi.findMany({ where: { soggetto_id: s.id }, orderBy: [{ tipo: 'asc' }, { id: 'asc' }] });
    const contatti = await this.db.persone_contatti.findMany({
      where: { soggetto_id: s.id }, include: { persona: true }, orderBy: { id: 'asc' },
    });
    const recapiti = await this.db.recapiti.findMany({
      where: { OR: [{ soggetto_id: s.id }, { sede_id: { in: sedi.map((x) => x.id) } }, { persona_id: { in: contatti.map((c) => c.persona_id) } }] },
      orderBy: [{ tipo: 'asc' }, { id: 'asc' }],
    });
    const fatturazione = await this.db.fatturazione.findUnique({ where: { soggetto_id: s.id } });
    return {
      ...mappaIdentita(s),
      nome: nomeDi(ruoli),
      ruoli,
      sedi: sedi.map(mappaSede),
      recapiti: recapiti.map(mappaRecapito),
      contatti: contatti.map((c) => ({
        id: String(c.id), persona: mappaPersona(c.persona), sede_id: c.sede_id === null ? null : String(c.sede_id),
        ruolo: c.ruolo, referente: c.referente, valido_dal: iso(c.valido_dal), valido_al: iso(c.valido_al),
      })),
      fatturazione: fatturazione ? mappaFatturazione(fatturazione) : null,
    };
  }

  @Post()
  @Richiede('dati.modifica')
  async crea(@Req() req: Request, @Body() b: DatiSoggetto) {
    return unico(() => this.db.$transaction(async (tx) => {
      const d = datiFiscali(b.piva ?? null, b.codice_fiscale ?? null, b.paese ?? 'IT');
      await controlloDuplicati(tx, { paese: d.paese, piva_norm: d.piva_norm, cf_norm: d.cf_norm }, null);
      const creato = await tx.soggetti.create({ data: { ...d, natura: b.natura, note: b.note ? testo(b.note) : null, sorgente: 'crm' } });
      await logEvent(tx, {
        tipo: 'crud', azione: 'create', entita: 'soggetto', entita_id: creato.id, esito: 'successo',
        dettaglio: { etichetta: creato.codice, natura: creato.natura },
      }, contesto(req));
      return mappaIdentita(creato);
    }));
  }

  @Put(':id')
  @Richiede('dati.modifica')
  async modifica(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() b: ModificaSoggetto) {
    return unico(() => this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM soggetti WHERE id = ${BigInt(id)} FOR UPDATE`; // V13
      const prima = await soggettoEsiste(tx, BigInt(id));
      const d = datiFiscali(
        b.piva !== undefined ? b.piva : prima.piva,
        b.codice_fiscale !== undefined ? b.codice_fiscale : prima.codice_fiscale,
        b.paese !== undefined ? (b.paese ?? 'IT') : prima.paese,
      );
      await controlloDuplicati(tx, d, prima.id);
      const dopo = {
        natura: b.natura ?? prima.natura,
        ...d,
        note: b.note !== undefined ? (b.note ? testo(b.note) : null) : prima.note,
      };
      const campi = ['natura', 'paese', 'piva', 'piva_norm', 'codice_fiscale', 'cf_norm', 'note'] as const;
      const cambi = campi
        .filter((c) => (prima as Record<string, unknown>)[c] !== (dopo as Record<string, unknown>)[c])
        .map((c) => ({ campo: c, valore_prima: prima[c] === null ? null : String(prima[c]), valore_dopo: dopo[c] === null ? null : String(dopo[c]) }));
      if (!cambi.length) return mappaIdentita(prima);
      const aggiornato = await tx.soggetti.update({ where: { id: prima.id }, data: dopo });
      await tx.modifiche.createMany({ data: cambi.map((c) => ({ ...c, entita: 'soggetto', entita_id: prima.id, utente_id: req.utente?.id ?? null })) });
      await logEvent(tx, {
        tipo: 'crud', azione: 'update', entita: 'soggetto', entita_id: prima.id, esito: 'successo',
        dettaglio: {
          etichetta: aggiornato.codice,
          prima: Object.fromEntries(cambi.map((c) => [c.campo, c.valore_prima])),
          dopo: Object.fromEntries(cambi.map((c) => [c.campo, c.valore_dopo])),
        },
      }, contesto(req));
      return mappaIdentita(aggiornato);
    }));
  }

  @Post(':id/attivo')
  @HttpCode(200)
  @Richiede('dati.modifica')
  async attivo(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() b: Attivo) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM soggetti WHERE id = ${BigInt(id)} FOR UPDATE`; // V13
      const s = await soggettoEsiste(tx, BigInt(id));
      if (s.attivo === b.attivo) return mappaIdentita(s);
      if (!b.attivo) {
        const attivi = await ruoliAttivi(tx, s.id);
        if (attivi.length) {
          throw new ConflictException(`Ha ruoli attivi (${attivi.map((r) => r.tipo).join(', ')}): chiudili prima di disattivare il soggetto`);
        }
      }
      const dopo = await tx.soggetti.update({ where: { id: s.id }, data: { attivo: b.attivo } });
      await logEvent(tx, {
        tipo: 'stato', azione: 'change_state', entita: 'soggetto', entita_id: s.id, esito: 'successo',
        dettaglio: { etichetta: s.codice, prima: { attivo: s.attivo }, dopo: { attivo: b.attivo } },
      }, contesto(req));
      return mappaIdentita(dopo);
    });
  }

  // ---------- Sedi (§4.2) ----------
  @Post(':id/sedi')
  @Richiede('dati.modifica')
  async creaSede(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() b: DatiSede) {
    return unico(() => this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM soggetti WHERE id = ${BigInt(id)} FOR UPDATE`; // una predefinita per tipo (V13)
      const s = await soggettoEsiste(tx, BigInt(id));
      if (b.predefinita) {
        await tx.sedi.updateMany({ where: { soggetto_id: s.id, tipo: b.tipo, predefinita: true }, data: { predefinita: false } });
      }
      const sede = await tx.sedi.create({ data: {
        soggetto_id: s.id,
        tipo: b.tipo,
        insegna: b.insegna ? testo(b.insegna) : null,
        indirizzo: b.indirizzo ? testo(b.indirizzo) : null,
        cap: b.cap ? testo(b.cap) : null,
        citta: b.citta ? testo(b.citta) : null,
        provincia: b.provincia ? b.provincia.toUpperCase() : null,
        paese: b.paese ? b.paese.toUpperCase() : 'IT',
        predefinita: b.predefinita ?? false,
        valido_dal: b.valido_dal ? soloData(b.valido_dal) : soloData(oggi()),
        valido_al: b.valido_al ? soloData(b.valido_al) : null,
      } });
      await logEvent(tx, {
        tipo: 'crud', azione: 'create', entita: 'sede', entita_id: sede.id, esito: 'successo',
        dettaglio: { etichetta: `${s.codice} · ${sede.tipo}`, soggetto_id: String(s.id) },
      }, contesto(req));
      return mappaSede(sede);
    }));
  }

  @Put(':id/sedi/:sid')
  @Richiede('dati.modifica')
  async modificaSede(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Param('sid', ParseIntPipe) sid: number, @Body() b: ModificaSede) {
    return unico(() => this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM soggetti WHERE id = ${BigInt(id)} FOR UPDATE`;
      const prima = await tx.sedi.findUnique({ where: { id: BigInt(sid) } });
      if (!prima || prima.soggetto_id !== BigInt(id)) throw new NotFoundException('Sede non trovata');
      const dopo = {
        tipo: b.tipo ?? prima.tipo,
        insegna: b.insegna !== undefined ? (b.insegna ? testo(b.insegna) : null) : prima.insegna,
        indirizzo: b.indirizzo !== undefined ? (b.indirizzo ? testo(b.indirizzo) : null) : prima.indirizzo,
        cap: b.cap !== undefined ? (b.cap ? testo(b.cap) : null) : prima.cap,
        citta: b.citta !== undefined ? (b.citta ? testo(b.citta) : null) : prima.citta,
        provincia: b.provincia !== undefined ? (b.provincia ? b.provincia.toUpperCase() : null) : prima.provincia,
        paese: b.paese !== undefined ? (b.paese ? b.paese.toUpperCase() : 'IT') : prima.paese,
        predefinita: b.predefinita ?? prima.predefinita,
        valido_dal: b.valido_dal !== undefined ? (b.valido_dal ? soloData(b.valido_dal) : null) : prima.valido_dal,
        valido_al: b.valido_al !== undefined ? (b.valido_al ? soloData(b.valido_al) : null) : prima.valido_al,
      };
      if (dopo.valido_al && dopo.valido_dal && dopo.valido_al <= dopo.valido_dal) {
        throw new BadRequestException('La data di fine deve essere dopo la data di inizio');
      }
      if (dopo.predefinita) {
        await tx.sedi.updateMany({ where: { soggetto_id: prima.soggetto_id, tipo: dopo.tipo, predefinita: true, id: { not: prima.id } }, data: { predefinita: false } });
      }
      const aggiornata = await tx.sedi.update({ where: { id: prima.id }, data: dopo });
      await logEvent(tx, {
        tipo: 'crud', azione: 'update', entita: 'sede', entita_id: prima.id, esito: 'successo',
        dettaglio: {
          etichetta: `${aggiornata.insegna ?? aggiornata.tipo}`,
          soggetto_id: String(id),
          prima: { tipo: prima.tipo, predefinita: prima.predefinita, valido_al: iso(prima.valido_al) },
          dopo: { tipo: aggiornata.tipo, predefinita: aggiornata.predefinita, valido_al: iso(aggiornata.valido_al) },
        },
      }, contesto(req));
      return mappaSede(aggiornata);
    }));
  }

  // ---------- Recapiti (§4.3) ----------
  @Post(':id/recapiti')
  @Richiede('dati.modifica')
  async creaRecapito(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() b: DatiRecapito) {
    return unico(() => this.db.$transaction(async (tx) => {
      const s = await soggettoEsiste(tx, BigInt(id));
      const link = await collegaRecapito(tx, s.id, b.soggetto_id, b.sede_id, b.persona_id);
      const valore = valoreRecapito(b.tipo, b.valore);
      await duplicatoRecapito(tx, link, b.tipo, valore, null);
      const r = await tx.recapiti.create({ data: {
        ...link, tipo: b.tipo, valore,
        etichetta: b.etichetta ? testo(b.etichetta) : null,
        predefinito: b.predefinito ?? false,
        valido_dal: b.valido_dal ? soloData(b.valido_dal) : soloData(oggi()),
        valido_al: b.valido_al ? soloData(b.valido_al) : null,
      } });
      await logEvent(tx, {
        tipo: 'crud', azione: 'create', entita: 'recapito', entita_id: r.id, esito: 'successo',
        dettaglio: { etichetta: `${s.codice} · ${r.tipo} ${r.valore}`, soggetto_id: String(s.id) },
      }, contesto(req));
      return mappaRecapito(r);
    }));
  }

  @Put(':id/recapiti/:rid')
  @Richiede('dati.modifica')
  async modificaRecapito(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Param('rid', ParseIntPipe) rid: number, @Body() b: ModificaRecapito) {
    return unico(() => this.db.$transaction(async (tx) => {
      const prima = await recapitoDelSoggetto(tx, BigInt(rid), BigInt(id));
      if (!prima) throw new NotFoundException('Recapito non trovato');
      const tipo = b.tipo ?? prima.tipo;
      const valore = b.valore !== undefined ? valoreRecapito(tipo, b.valore) : prima.valore;
      if (b.tipo !== undefined || b.valore !== undefined) {
        await duplicatoRecapito(tx, { soggetto_id: prima.soggetto_id, sede_id: prima.sede_id, persona_id: prima.persona_id }, tipo, valore, prima.id);
      }
      if (b.valido_al && prima.valido_dal && soloData(b.valido_al) <= prima.valido_dal) {
        throw new BadRequestException('La data di fine deve essere dopo la data di inizio');
      }
      const dopo = await tx.recapiti.update({ where: { id: prima.id }, data: {
        tipo, valore,
        etichetta: b.etichetta !== undefined ? (b.etichetta ? testo(b.etichetta) : null) : prima.etichetta,
        predefinito: b.predefinito ?? prima.predefinito,
        valido_dal: b.valido_dal !== undefined ? (b.valido_dal ? soloData(b.valido_dal) : null) : prima.valido_dal,
        valido_al: b.valido_al !== undefined ? (b.valido_al ? soloData(b.valido_al) : null) : prima.valido_al,
      } });
      await logEvent(tx, {
        tipo: 'crud', azione: 'update', entita: 'recapito', entita_id: prima.id, esito: 'successo',
        dettaglio: { etichetta: `${dopo.tipo} ${dopo.valore}`, prima: mappaRecapito(prima), dopo: mappaRecapito(dopo) },
      }, contesto(req));
      return mappaRecapito(dopo);
    }));
  }

  // ---------- Persone collegate (§4.4) ----------
  @Post(':id/persone')
  @Richiede('dati.modifica')
  async collegaPersona(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() b: DatiContatto) {
    return unico(() => this.db.$transaction(async (tx) => {
      const s = await soggettoEsiste(tx, BigInt(id));
      const persona = await tx.persone.findUnique({ where: { id: BigInt(b.persona_id) } });
      if (!persona) throw new NotFoundException('Persona non trovata');
      if (b.sede_id !== undefined) {
        const sede = await tx.sedi.findUnique({ where: { id: BigInt(b.sede_id) } });
        if (!sede || sede.soggetto_id !== s.id) throw new BadRequestException('La sede non è di questo soggetto');
      }
      const c = await tx.persone_contatti.create({ data: {
        persona_id: persona.id,
        soggetto_id: s.id,
        sede_id: b.sede_id === undefined ? null : BigInt(b.sede_id),
        ruolo: b.ruolo ?? null,
        referente: b.referente ?? false,
        valido_dal: b.valido_dal ? soloData(b.valido_dal) : soloData(oggi()),
        valido_al: b.valido_al ? soloData(b.valido_al) : null,
      } });
      await logEvent(tx, {
        tipo: 'crud', azione: 'create', entita: 'persona_contatto', entita_id: c.id, esito: 'successo',
        dettaglio: { etichetta: `${persona.nome} ${persona.cognome} · ${s.codice}`, soggetto_id: String(s.id), persona_id: String(persona.id) },
      }, contesto(req));
      return {
        id: String(c.id), persona: mappaPersona(persona), sede_id: c.sede_id === null ? null : String(c.sede_id),
        ruolo: c.ruolo, referente: c.referente, valido_dal: iso(c.valido_dal), valido_al: iso(c.valido_al),
      };
    }));
  }

  /** Chiude il contatto con `valido_al`: niente cancellazioni (§1.4). `pid` è l'id del contatto. */
  @Put(':id/persone/:pid')
  @Richiede('dati.modifica')
  async chiudiContatto(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Param('pid', ParseIntPipe) pid: number, @Body() b: ChiusuraContatto) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM persone_contatti WHERE id = ${BigInt(pid)} FOR UPDATE`; // V13
      const c = await tx.persone_contatti.findUnique({ where: { id: BigInt(pid) }, include: { persona: true } });
      if (!c || c.soggetto_id !== BigInt(id)) throw new NotFoundException('Contatto non trovato');
      const al = soloData(b.valido_al);
      if (c.valido_dal && al <= c.valido_dal) throw new BadRequestException('La data di fine deve essere dopo la data di inizio');
      const dopo = await tx.persone_contatti.update({ where: { id: c.id }, data: { valido_al: al } });
      await logEvent(tx, {
        tipo: 'crud', azione: 'update', entita: 'persona_contatto', entita_id: c.id, esito: 'successo',
        dettaglio: { etichetta: `${c.persona.nome} ${c.persona.cognome}`, prima: { valido_al: iso(c.valido_al) }, dopo: { valido_al: iso(dopo.valido_al) } },
      }, contesto(req));
      return { id: String(dopo.id), valido_al: iso(dopo.valido_al) };
    });
  }

  // ---------- Fatturazione elettronica (§4.5) ----------
  @Put(':id/fatturazione')
  @Richiede('dati.modifica')
  async fatturazione(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() b: DatiFatturazione) {
    return unico(() => this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM soggetti WHERE id = ${BigInt(id)} FOR UPDATE`;
      const s = await soggettoEsiste(tx, BigInt(id));
      const prima = await tx.fatturazione.findUnique({ where: { soggetto_id: s.id } });
      const dopo = {
        codice_destinatario: b.codice_destinatario !== undefined ? (b.codice_destinatario ? b.codice_destinatario.toUpperCase() : null) : prima?.codice_destinatario ?? null,
        pec_destinatario: b.pec_destinatario !== undefined ? (b.pec_destinatario ? b.pec_destinatario.trim().toLowerCase() : null) : prima?.pec_destinatario ?? null,
        codice_univoco_ufficio: b.codice_univoco_ufficio !== undefined ? (b.codice_univoco_ufficio ? b.codice_univoco_ufficio.toUpperCase() : null) : prima?.codice_univoco_ufficio ?? null,
        id_paese_estero: b.id_paese_estero !== undefined ? (b.id_paese_estero ? b.id_paese_estero.toUpperCase() : null) : prima?.id_paese_estero ?? null,
        id_codice_estero: b.id_codice_estero !== undefined ? (b.id_codice_estero ? testo(b.id_codice_estero) : null) : prima?.id_codice_estero ?? null,
        regime_fiscale: b.regime_fiscale !== undefined ? b.regime_fiscale || null : prima?.regime_fiscale ?? null,
        split_payment: b.split_payment ?? prima?.split_payment ?? false,
        reverse_charge: b.reverse_charge ?? prima?.reverse_charge ?? false,
        esigibilita_iva: b.esigibilita_iva !== undefined ? b.esigibilita_iva || null : prima?.esigibilita_iva ?? null,
        attiva: b.attiva ?? prima?.attiva ?? false,
        note: b.note !== undefined ? (b.note ? testo(b.note) : null) : prima?.note ?? null,
      };
      if (dopo.codice_destinatario === '0000000' && !dopo.id_codice_estero) {
        throw new BadRequestException("0000000 va bene solo per i destinatari esteri: scrivi l'identificativo estero");
      }
      if (dopo.attiva && !dopo.codice_destinatario && !dopo.pec_destinatario && !dopo.codice_univoco_ufficio && !dopo.id_codice_estero) {
        throw new BadRequestException('Configurata serve almeno un modo di ricevere la fattura: codice destinatario, PEC, codice ufficio o identificativo estero');
      }
      const salvata = await tx.fatturazione.upsert({
        where: { soggetto_id: s.id },
        create: { soggetto_id: s.id, ...dopo },
        update: dopo,
      });
      await logEvent(tx, {
        tipo: 'crud', azione: 'update', entita: 'fatturazione', entita_id: s.id, esito: 'successo',
        dettaglio: { etichetta: `${s.codice} · fatturazione`, prima: prima ? mappaFatturazione(prima) : {}, dopo: mappaFatturazione(salvata) },
      }, contesto(req));
      return mappaFatturazione(salvata);
    }));
  }

  // ---------- Ruoli (§5) ----------
  /** Il ruolo nuovo si crea dal soggetto: cliente e fornitore. Il subagente nasce dalla sua pagina. */
  @Post(':id/ruoli')
  @Richiede('dati.modifica')
  async creaRuolo(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() b: NuovoRuolo) {
    return unico(() => this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM soggetti WHERE id = ${BigInt(id)} FOR UPDATE`; // V13
      const s = await soggettoEsiste(tx, BigInt(id));
      const codice = b.codice_integra ? testo(b.codice_integra).toUpperCase() : null;
      const nome = testo(b.ragione_sociale);
      const citta = b.citta ? testo(b.citta) : null;
      const dal = soloData(oggi());
      const piva = s.piva_norm || null;

      if (b.tipo === 'cliente') {
        if (await tx.clienti.findFirst({ where: { soggetto_id: s.id } })) throw new ConflictException('Il soggetto ha già il ruolo cliente');
        if (piva && await tx.clienti.findFirst({ where: { corrente: { piva } } })) {
          throw new ConflictException(`La P.IVA ${piva} è già di un altro cliente: la fusione si decide con la deduplica`);
        }
        const ruolo = await tx.clienti.create({ data: { attivo: true, soggetto_id: s.id } });
        const versione = await tx.clienti_versioni.create({ data: { cliente_id: ruolo.id, fonte: 'crm', valido_dal: dal, piva, ragione_sociale: nome, citta } });
        await tx.clienti.update({ where: { id: ruolo.id }, data: { versione_corrente_id: versione.id } });
        if (codice) await tx.codici_esterni.create({ data: { sistema: 'integra', tipo: 'cliente', codice, entita_id: ruolo.id } });
        await logEvent(tx, {
          tipo: 'crud', azione: 'create', entita: 'cliente', entita_id: ruolo.id, esito: 'successo',
          dettaglio: { etichetta: nome, soggetto_id: String(s.id) },
        }, contesto(req));
        return { tipo: 'cliente', id: String(ruolo.id), nome, codice: codice ?? '', attivo: true } satisfies Ruolo;
      }

      if (await tx.fornitori.findFirst({ where: { soggetto_id: s.id } })) throw new ConflictException('Il soggetto ha già il ruolo fornitore');
      if (piva && await tx.fornitori.findFirst({ where: { corrente: { piva } } })) {
        throw new ConflictException(`La P.IVA ${piva} è già di un altro fornitore: la fusione si decide con la deduplica`);
      }
      const ruolo = await tx.fornitori.create({ data: { soggetto_id: s.id } });
      const versione = await tx.fornitori_versioni.create({ data: { fornitore_id: ruolo.id, fonte: 'crm', valido_dal: dal, piva, ragione_sociale: nome } });
      await tx.fornitori.update({ where: { id: ruolo.id }, data: { versione_corrente_id: versione.id } });
      if (codice) await tx.codici_esterni.create({ data: { sistema: 'integra', tipo: 'fornitore', codice, entita_id: ruolo.id } });
      await logEvent(tx, {
        tipo: 'crud', azione: 'create', entita: 'fornitore', entita_id: ruolo.id, esito: 'successo',
        dettaglio: { etichetta: nome, soggetto_id: String(s.id) },
      }, contesto(req));
      return { tipo: 'fornitore', id: String(ruolo.id), nome, codice: codice ?? '', attivo: true } satisfies Ruolo;
    }));
  }
}

/**
 * Un recapito sta su uno solo fra soggetto, sede e persona (§4.3); la sede e la persona devono essere
 * del soggetto indicato dal percorso.
 */
async function collegaRecapito(db: Db, soggetto_id: bigint, s?: number, sede?: number, persona?: number) {
  const scelti = [s, sede, persona].filter((x) => x !== undefined && x !== null);
  if (scelti.length !== 1) throw new BadRequestException('Un recapito sta su uno solo fra soggetto, sede e persona');
  if (s !== undefined && BigInt(s) !== soggetto_id) throw new BadRequestException('Il soggetto del recapito non è questo');
  if (sede !== undefined) {
    const riga = await db.sedi.findUnique({ where: { id: BigInt(sede) } });
    if (!riga || riga.soggetto_id !== soggetto_id) throw new BadRequestException('La sede non è di questo soggetto');
    return { soggetto_id: null, sede_id: BigInt(sede), persona_id: null };
  }
  if (persona !== undefined) {
    const contatto = await db.persone_contatti.findFirst({ where: { persona_id: BigInt(persona), soggetto_id } });
    if (!contatto) throw new BadRequestException('La persona non è un contatto di questo soggetto');
    return { soggetto_id: null, sede_id: null, persona_id: BigInt(persona) };
  }
  return { soggetto_id, sede_id: null, persona_id: null };
}

function valoreRecapito(tipo: string, valore: string) {
  const v = tipo === 'email' || tipo === 'pec' ? testo(valore).toLowerCase() : testo(valore);
  if (!v) throw new BadRequestException('Scrivi il recapito');
  if ((tipo === 'email' || tipo === 'pec') && !EMAIL.test(v)) throw new BadRequestException("L'email non è valida");
  return v;
}

/** Duplicato identico: 409. La chiusura con valido_al non libera il valore (indice UNIQUE, §4.3). */
async function duplicatoRecapito(
  db: Db,
  link: { soggetto_id: bigint | null; sede_id: bigint | null; persona_id: bigint | null },
  tipo: string,
  valore: string,
  escludi: bigint | null,
) {
  const doppio = await db.recapiti.findFirst({ where: { ...link, tipo, valore, ...(escludi ? { id: { not: escludi } } : {}) } });
  if (doppio) throw new ConflictException('Questo recapito esiste già, identico');
}

/** Il recapito appartiene al soggetto: direttamente, per una sua sede o per un suo contatto (§4.3). */
async function recapitoDelSoggetto(db: Db, rid: bigint, sid: bigint) {
  const r = await db.recapiti.findUnique({ where: { id: rid } });
  if (!r) return null;
  if (r.soggetto_id === sid) return r;
  if (r.sede_id !== null) {
    const sede = await db.sedi.findUnique({ where: { id: r.sede_id } });
    if (sede?.soggetto_id === sid) return r;
  }
  if (r.persona_id !== null && await db.persone_contatti.findFirst({ where: { persona_id: r.persona_id, soggetto_id: sid } })) return r;
  return null;
}

// ---------- Persone ----------
@Controller('persone')
export class PersoneController {
  constructor(private readonly db: PrismaService) {}

  @Post()
  @Richiede('dati.modifica')
  async crea(@Req() req: Request, @Body() b: DatiPersona) {
    return this.db.$transaction(async (tx) => {
      const p = await tx.persone.create({ data: {
        nome: testo(b.nome),
        cognome: testo(b.cognome),
        titolo: b.titolo ? testo(b.titolo) : null,
        note: b.note ? testo(b.note) : null,
        attivo: b.attivo ?? true,
      } });
      await logEvent(tx, {
        tipo: 'crud', azione: 'create', entita: 'persona', entita_id: p.id, esito: 'successo',
        dettaglio: { etichetta: `${p.nome} ${p.cognome}` },
      }, contesto(req));
      return mappaPersona(p);
    });
  }

  @Put(':id')
  @Richiede('dati.modifica')
  async modifica(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() b: ModificaPersona) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM persone WHERE id = ${BigInt(id)} FOR UPDATE`; // V13
      const prima = await tx.persone.findUnique({ where: { id: BigInt(id) } });
      if (!prima) throw new NotFoundException('Persona non trovata');
      const dopo = await tx.persone.update({ where: { id: prima.id }, data: {
        nome: b.nome !== undefined ? testo(b.nome) : prima.nome,
        cognome: b.cognome !== undefined ? testo(b.cognome) : prima.cognome,
        titolo: b.titolo !== undefined ? (b.titolo ? testo(b.titolo) : null) : prima.titolo,
        note: b.note !== undefined ? (b.note ? testo(b.note) : null) : prima.note,
        attivo: b.attivo ?? prima.attivo,
      } });
      await logEvent(tx, {
        tipo: 'crud', azione: 'update', entita: 'persona', entita_id: prima.id, esito: 'successo',
        dettaglio: { etichetta: `${dopo.nome} ${dopo.cognome}`, prima: mappaPersona(prima), dopo: mappaPersona(dopo) },
      }, contesto(req));
      return mappaPersona(dopo);
    });
  }
}
