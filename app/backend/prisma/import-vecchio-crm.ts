// Import del vecchio CRM nell'anagrafica a soggetti (F1-A9, D-102; specifica-anagrafica-soggetti.md §7).
// Un solo comando, una sola transazione (V13, D-36), idempotente. Si esegue con ts-node:
//   npm run import:vecchio-crm -- --db decobrands_import [--prova] [--sostituisci]   (import one-shot su un database vuoto)
//   npm run import:vecchio-crm -- --db decobrands_db --aggiungi [--prova]            (modalità additiva in esercizio)
//   npm run import:vecchio-crm -- --db decobrands_db --aggiungi --correggi-date      (additiva + riporta a 2000-01-01 le agenzie vecchie, D-158)
// Oppure passando DATABASE_URL per comando (puntata a decobrands_import, o a un database di prova
// decobrands_test_… con --aggiungi).
//
// --db decobrands_import (default): import one-shot, assume il database vuoto, --sostituisci fa TRUNCATE.
// --db decobrands_db --aggiungi: import additivo sull'esercizio. Mai TRUNCATE, mai cancellare o
//   modificare ciò che c'è già: stessa P.IVA/CF → stesso soggetto (aggiunge il ruolo se manca, D-102);
//   stesso codice esterno del vecchio CRM già presente → salta (idempotente). I soggetti/ruoli creati
//   portano il codice esterno con fonte `vecchio_crm` (codici_esterni). Persone e contatti non si
//   importano (restano quelli già presenti). A fine import scrive dati-crm-legacy/import/da-inserire-in-integra.csv
//   con i soggetti presi dal vecchio CRM che mancano nelle viste di Integra.
// Scrive SOLO anagrafica e legami + un evento nel registro. Mai decobrands_test (quello delle prove jest).
import 'dotenv/config';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';
import { logEvent } from '../src/registro';
import { ultimaChiusura } from '../src/motore/dati';

type Tx = Prisma.TransactionClient;

// ---------- Configurazione ----------
const LEGACY = join(__dirname, '..', '..', '..', 'dati-crm-legacy');
const OUT = join(LEGACY, 'import');
mkdirSync(OUT, { recursive: true }); // i report si scrivono prima dei conteggi: la cartella deve esserci
const ESTRAZIONE = '2026-11-08'; // data dell'estratto (riepilogo.json)
const DAL = new Date(`${ESTRAZIONE}T00:00:00Z`);
// D-158 §19: il vecchio CRM non ha la data d'inizio dell'agenzia: le agenzie valgono da sempre
const DAL_SEMPRE = new Date('2000-01-01T00:00:00Z');

const args = process.argv.slice(2);
const PROVA = args.includes('--prova');
const SOSTITUISCI = args.includes('--sostituisci');
const AGGIUNGI = args.includes('--aggiungi');
const CORREGGI_DATE = args.includes('--correggi-date');
const iDb = args.indexOf('--db');
const nomeDb = iDb >= 0 ? args[iDb + 1] : null;

/** Stesso indirizzo e utente di DATABASE_URL con un altro nome di database (come ponte-prova). */
function urlDatabase(nome: string) {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL non definita in .env');
  const u = new URL(process.env.DATABASE_URL);
  u.pathname = '/' + nome;
  return u.toString();
}

if (nomeDb) {
  if (nomeDb === 'decobrands_import') {
    if (AGGIUNGI) throw new Error('--aggiungi non si usa con decobrands_import');
    process.env.DATABASE_URL = urlDatabase(nomeDb);
  } else if (nomeDb === 'decobrands_db') {
    if (!AGGIUNGI) throw new Error('Su decobrands_db serve --aggiungi (l\'import one-shot va su decobrands_import)');
    process.env.DATABASE_URL = urlDatabase(nomeDb);
  } else {
    throw new Error('Questo import scrive solo su decobrands_import o, con --aggiungi, su decobrands_db');
  }
}
if (CORREGGI_DATE && !AGGIUNGI) throw new Error('--correggi-date si usa solo con --aggiungi (su decobrands_db)');
if (AGGIUNGI) {
  if (SOSTITUISCI) throw new Error('--aggiungi e --sostituisci non vanno insieme');
  if (/\/decobrands_import\b/.test(process.env.DATABASE_URL!)) throw new Error('--aggiungi non scrive su decobrands_import');
  if (!/\/decobrands_(db|test)/.test(process.env.DATABASE_URL!)) {
    throw new Error('Rifiuto: --aggiungi richiede decobrands_db (o un database di prova decobrands_test…)');
  }
} else {
  if (!/\/decobrands_import\b/.test(process.env.DATABASE_URL!)) {
    throw new Error('Rifiuto: DATABASE_URL non punta a decobrands_import');
  }
}

// ---------- Lettura dei file ----------
const leggi = (nome: string) => readFileSync(join(LEGACY, nome), 'utf8');
const json = (nome: string) => JSON.parse(leggi(nome));
const testo = (v: unknown) => String(v ?? '').trim().replace(/\s+/g, ' ');
const normalizza = (v: string) => v.replace(/[\s.]/g, '').toUpperCase();
/** P.IVA normalizzata: IT + 11 cifre → 11 cifre; altrimenti maiuscolo senza spazi/punti. */
function normPiva(v: string) {
  const s = normalizza(v);
  return /^IT\d{11}$/.test(s) ? s.slice(2) : s;
}
const pivaValida = (s: string) => /^\d{11}$/.test(s) || /^[A-Z]{2}[A-Z0-9]{2,}$/.test(s);
/** Codice fiscale usabile come chiave: 11 cifre (CF d'impresa = P.IVA) o 16 alfanumerici (persona). */
const cfValido = (s: string) => /^\d{11}$/.test(s) || /^[A-Z0-9]{16}$/.test(s);
const paeseDi = (pn: string) => (/^[A-Z]{2}/.test(pn) ? pn.slice(0, 2) : 'IT');
/** Provincia normalizzata: due lettere maiuscole; il resto (città, cantoni esteri, refusi) non entra (CHAR(2)). */
const provinciaNorm = (v: unknown): string | null => { const s = testo(v).toUpperCase(); return /^[A-Z]{2}$/.test(s) ? s : null; };
/** CAP dalla città/comune del vecchio CRM ("40016 - … (BO)" oppure "… (FC) 47030 …"): il primo numero di 5 cifre. */
const capDa = (amm: Record<string, unknown>): string | null => {
  const m = String(amm['Città'] ?? amm['comune'] ?? '').match(/\d{5}/);
  return m ? m[0] : null;
};

// CSV RFC 4180 minimo (campi quotati, virgolette raddoppiate, virgole nei nomi)
function parseCsv(texto: string): string[][] {
  const righe: string[][] = [];
  let riga: string[] = [];
  let campo = '';
  let inVirgolette = false;
  const t = texto.replace(/^\uFEFF/, '');
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inVirgolette) {
      if (c === '"') {
        if (t[i + 1] === '"') { campo += '"'; i++; } else inVirgolette = false;
      } else campo += c;
    } else if (c === '"') inVirgolette = true;
    else if (c === ',') { riga.push(campo); campo = ''; }
    else if (c === '\n') { riga.push(campo); righe.push(riga); riga = []; campo = ''; }
    else if (c !== '\r') campo += c;
  }
  if (campo !== '' || riga.length) { riga.push(campo); righe.push(riga); }
  return righe;
}
function csvColonne(nome: string): Record<string, string>[] {
  const [testa, ...righe] = parseCsv(leggi(nome));
  return righe.map((r) => Object.fromEntries(testa.map((h, i) => [h, (r[i] ?? '').trim()])));
}

// ---------- Sorgenti ----------
type SchedaCliente = {
  id: number; ragione_sociale: string; scheda_errore?: boolean;
  elenco: Record<string, unknown>; dati_amministrativi: Record<string, unknown>; punto_vendita: Record<string, unknown>;
};
const fornitoriSorgente: { elenco: Record<string, unknown>; scheda: Record<string, unknown> }[] = json('fornitori.json');
const subagentiSorgente: { elenco: Record<string, unknown>; scheda: Record<string, unknown> }[] = json('subagenti.json');
const agentiSorgente: { elenco: Record<string, unknown>; scheda: Record<string, unknown> }[] = json('agenti.json');
const gruppiSorgente: { elenco: Record<string, unknown> }[] = json('gruppi.json');
const settoriSorgente: { elenco: Record<string, unknown> }[] = json('settori.json');
const collegamenti = csvColonne('collegamenti.csv');
const schede: SchedaCliente[] = [];
for (const riga of leggi('clienti.jsonl').split('\n')) {
  if (!riga.trim()) continue;
  const o = JSON.parse(riga);
  if (o.scheda_errore) continue; // scartata in importa
  schede.push(o);
}

// ---------- Report ----------
interface RigheFusione { chiave: string; codici: string[]; n: number }
interface RigheScarto { tipo: string; id: string; motivo: string; dettaglio: string }
interface RigheConflitto { tipo: string; dettaglio: string }
const report = {
  letti_clienti: 0, fornitori: 0, subagenti: 0, agenti: 0, gruppi: 0, settori: 0,
  contatti_persona: 0, collegamenti: 0,
  soggetti: 0, gia_soggetti: 0,
  ruoli_cliente: 0, gia_clienti: 0,
  ruoli_fornitore: 0, gia_fornitori: 0,
  ruoli_subagente: 0, gia_subagenti: 0,
  ruoli_agente: 0, gia_agenti: 0,
  sedi: 0, recapiti: 0, persone: 0, persone_contatti: 0, fatturazione: 0,
  interscambio: 0, gia_interscambio: 0, sconti: 0, codici_esterni: 0,
  date_corrette: 0,
  da_inserire_in_integra: -1,
  piva_valide: 0, piva_invalide: 0, senza_piva_cf: 0, senza_piva_senza_cf: 0,
  fusioni: [] as RigheFusione[],
  scarti: [] as RigheScarto[],
  conflitti: [] as RigheConflitto[],
  tempi: { lettura: 0, import: 0, totale: 0 },
};
const scarta = (tipo: string, id: string, motivo: string, dettaglio = '') => report.scarti.push({ tipo, id, motivo, dettaglio });
const conflitto = (tipo: string, dettaglio: string) => report.conflitti.push({ tipo, dettaglio });

function scriviCsv(nome: string, testa: string[], righe: (string | number)[][]) {
  const csv = (v: string | number) => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
  writeFileSync(join(OUT, nome), [testa.join(','), ...righe.map((r) => r.map(csv).join(','))].join('\n') + '\n', 'utf8');
}

// ---------- Stato condiviso dell'import (riempito anche da ciò che c'è già, in --aggiungi) ----------
const soggettoPer = new Map<string, bigint>(); // chiave p:paese:piva_norm | c:paese:cf_norm → soggetti.id
const soggettiNuovi = new Set<bigint>(); // soggetti creati in questo giro
const soggettiConLegale = new Set<bigint>(); // già con sede legale predefinita (evita il doppione D-101)
const gruppoDb: Record<number, bigint> = {};
const settoreDb: Record<number, bigint> = {};
const clientePerSoggetto = new Map<bigint, bigint>(); // soggetti.id → clienti.id
const fornitorePerSoggetto = new Map<bigint, bigint>(); // soggetti.id → fornitori.id
const fornitorePerNome = new Map<string, bigint>(); // nome normalizzato → fornitori.id
const agentePerNome = new Map<string, bigint>();
const subagentePerNome = new Map<string, bigint>();
const codiciVisti = new Set<string>(); // `vecchio_crm:tipo:codice` già presenti
const codiceRuolo = new Map<string, bigint>(); // `tipo:codice` → entita_id (per saltare chi è già importato)
let agenteDeco: bigint | null = null;

/** Carica lo stato già presente nel database (solo --aggiungi): si riusa, mai si riscrive. */
async function caricaEsistente(tx: Tx) {
  for (const s of await tx.soggetti.findMany({ select: { id: true, paese: true, piva_norm: true, cf_norm: true } })) {
    if (s.piva_norm) soggettoPer.set(`p:${s.paese}:${s.piva_norm}`, s.id);
    if (s.cf_norm) soggettoPer.set(`c:${s.paese}:${s.cf_norm}`, s.id);
  }
  for (const g of await tx.gruppi.findMany({ select: { id: true, codice: true } })) {
    const m = /^G(\d+)$/.exec(g.codice); if (m) gruppoDb[Number(m[1])] = g.id;
  }
  for (const s of await tx.settori.findMany({ select: { id: true, codice: true } })) {
    const m = /^S(\d+)$/.exec(s.codice); if (m) settoreDb[Number(m[1])] = s.id;
  }
  for (const c of await tx.clienti.findMany({ select: { id: true, soggetto_id: true } })) {
    if (c.soggetto_id != null) clientePerSoggetto.set(c.soggetto_id, c.id);
  }
  for (const f of await tx.fornitori.findMany({ include: { corrente: { select: { ragione_sociale: true } } } })) {
    if (f.corrente?.ragione_sociale) fornitorePerNome.set(normalizza(f.corrente.ragione_sociale), f.id);
    if (f.soggetto_id != null) fornitorePerSoggetto.set(f.soggetto_id, f.id);
  }
  for (const a of await tx.agenti.findMany({ select: { id: true, nome: true, cognome: true } })) {
    const nome = normalizza(`${a.nome} ${a.cognome}`);
    agentePerNome.set(nome, a.id);
    if (nome === normalizza('DECOBRANDS SRL')) agenteDeco = a.id;
  }
  for (const s of await tx.subagenti.findMany({ select: { id: true, nome: true, cognome: true } })) {
    subagentePerNome.set(normalizza(`${s.nome} ${s.cognome}`), s.id);
  }
  for (const c of await tx.codici_esterni.findMany({ where: { sistema: 'vecchio_crm' }, select: { tipo: true, codice: true, entita_id: true } })) {
    codiciVisti.add(`vecchio_crm:${c.tipo}:${c.codice}`);
    codiceRuolo.set(`${c.tipo}:${c.codice}`, c.entita_id);
  }
  for (const s of await tx.sedi.findMany({ where: { tipo: 'legale' }, select: { soggetto_id: true } })) {
    soggettiConLegale.add(s.soggetto_id);
  }
}

// ---------- Svuota (solo --sostituisci, mai con --aggiungi) ----------
async function svuotaImport(db: PrismaClient) {
  await db.$executeRawUnsafe(`ALTER TABLE clienti_versioni DISABLE TRIGGER USER; ALTER TABLE fornitori_versioni DISABLE TRIGGER USER; ALTER TABLE registro DISABLE TRIGGER USER`);
  try {
    await db.$executeRawUnsafe(`
      TRUNCATE sconti, interscambio, subagenti, agenti, fornitori, fornitori_versioni, clienti, clienti_versioni,
        fatturazione, persone_contatti, persone, recapiti, sedi, soggetti, gruppi, settori, codici_esterni, modifiche, registro
        RESTART IDENTITY CASCADE`);
  } finally {
    await db.$executeRawUnsafe(`ALTER TABLE clienti_versioni ENABLE TRIGGER USER; ALTER TABLE fornitori_versioni ENABLE TRIGGER USER; ALTER TABLE registro ENABLE TRIGGER USER`);
  }
  await db.$executeRawUnsafe(`ALTER SEQUENCE soggetti_codice_seq RESTART WITH 1`);
}

// ---------- Import ----------
/** D-158: porta a "da sempre" il valido_dal delle agenzie del vecchio CRM già importate con la data
 *  dell'estratto. Salta chi ha righe successive per la stessa coppia, chi è stato toccato dopo l'import
 *  (l'import non scrive eventi per le singole agenzie) e chi sta in un periodo chiuso o liquidato. */
async function correggiDate(tx: Tx) {
  const daCorreggere = await tx.interscambio.findMany({
    where: { valido_dal: DAL },
    select: { id: true, cliente_id: true, fornitore_id: true },
  });
  if (!daCorreggere.length) return;

  const perCoppia = new Map<string, number>();
  for (const a of await tx.interscambio.findMany({ select: { cliente_id: true, fornitore_id: true } })) {
    const k = `${a.cliente_id}:${a.fornitore_id}`;
    perCoppia.set(k, (perCoppia.get(k) ?? 0) + 1);
  }
  const toccate = new Set((await tx.registro.findMany({
    where: { entita: 'interscambio', entita_id: { in: daCorreggere.map((a) => a.id) } },
    select: { entita_id: true },
  })).map((e) => String(e.entita_id)));

  const chiusa = new Map<string, string | null>();
  const ultima = async (fid: bigint) => {
    const k = String(fid);
    if (!chiusa.has(k)) chiusa.set(k, await ultimaChiusura(tx, fid));
    return chiusa.get(k)!;
  };

  let corrette = 0;
  for (const a of daCorreggere) {
    const k = `${a.cliente_id}:${a.fornitore_id}`;
    if ((perCoppia.get(k) ?? 0) > 1) continue; // righe successive per la stessa coppia
    if (toccate.has(String(a.id))) continue; // modificata dopo l'import
    if (await ultima(a.fornitore_id)) continue; // periodo chiuso o liquidazione
    await tx.interscambio.update({ where: { id: a.id }, data: { valido_dal: DAL_SEMPRE } });
    corrette++;
  }
  report.date_corrette = corrette;
}

async function importa(tx: Tx) {
  if (AGGIUNGI) await caricaEsistente(tx);

  // 1. Gruppi e settori (§7.1): get-or-create (in --aggiungi riusa chi c'è già)
  for (const g of gruppiSorgente) {
    const id = Number(g.elenco.Id);
    if (!gruppoDb[id]) gruppoDb[id] = (await tx.gruppi.create({ data: { codice: `G${id}`, descrizione: testo(g.elenco.Name), attivo: true } })).id;
  }
  for (const s of settoriSorgente) {
    const id = Number(s.elenco.Id);
    if (!settoreDb[id]) settoreDb[id] = (await tx.settori.create({ data: { codice: `S${id}`, descrizione: testo(s.elenco.Name), attivo: true } })).id;
  }
  report.gruppi = gruppiSorgente.length;
  report.settori = settoriSorgente.length;

  // Identità → soggetto: un solo master condiviso per clienti, fornitori, agenti e subagenti
  // (D-101: la stessa P.IVA/CF non fa due soggetti). Chiave = p:paese:piva_norm | c:paese:cf_norm.
  const schedePerSoggetto = new Map<bigint, SchedaCliente[]>();
  async function nuovoSoggetto(natura: string, piva: string | null, cf: string | null, pn: string, cn: string, paese: string): Promise<bigint> {
    const chiave = pn ? `p:${paese}:${pn}` : `c:${paese}:${cn}`;
    const gia = soggettoPer.get(chiave);
    if (gia) { report.gia_soggetti++; return gia; }
    const s = await tx.soggetti.create({ data: {
      natura, paese, piva: piva || null, piva_norm: pn, codice_fiscale: cf || null, cf_norm: cn, sorgente: 'vecchio_crm',
    } });
    soggettoPer.set(chiave, s.id);
    soggettiNuovi.add(s.id);
    report.soggetti++;
    return s.id;
  }

  // 2. Clienti: identità normalizzata, deduplica (un soggetto per P.IVA/CF)
  const schedaPerId = new Map(schede.map((c) => [c.id, c])); // ricerca O(1) nei legami e nei contatti
  const cardPrincipale = new Map<bigint, SchedaCliente>(); // soggetto → scheda principale (legale)

  for (const c of schede) {
    const amm = c.dati_amministrativi ?? {};
    const pivaRaw = testo(amm['PARTITA IVA'] ?? c.elenco.VatNumber);
    const cfRaw = testo(amm['Codice fiscale']);
    const pn = normPiva(pivaRaw);
    const cn = normalizza(cfRaw);
    let soggettoId: bigint | null = null;
    if (pn) {
      if (pivaValida(pn)) {
        report.piva_valide++;
        soggettoId = await nuovoSoggetto('azienda', pivaRaw, cfRaw || null, pn, cn, paeseDi(pn));
      } else {
        report.piva_invalide++;
        scarta('piva_non_valida', String(c.id), `P.IVA "${pivaRaw}" non valida (9-10 cifre o formato errato)`, `cf=${cfRaw || ''}`);
        if (cfValido(cn)) soggettoId = await nuovoSoggetto('azienda', null, cfRaw, '', cn, 'IT');
        else scarta('identita_assente', String(c.id), 'P.IVA non valida e nessun codice fiscale valido', c.ragione_sociale);
      }
    } else if (cn) {
      if (cfValido(cn)) { report.senza_piva_cf++; soggettoId = await nuovoSoggetto('azienda', null, cfRaw, '', cn, 'IT'); }
      else { report.senza_piva_senza_cf++; scarta('identita_assente', String(c.id), 'CF non valido come chiave', cfRaw); }
    } else {
      report.senza_piva_senza_cf++;
      scarta('contatto', String(c.id), 'né P.IVA né codice fiscale: contatto, non soggetto (§7.4)', c.ragione_sociale);
    }
    if (soggettoId === null) continue;
    const elenco = schedePerSoggetto.get(soggettoId) ?? [];
    elenco.push(c);
    schedePerSoggetto.set(soggettoId, elenco);
    if (!cardPrincipale.has(soggettoId)) cardPrincipale.set(soggettoId, c);
  }
  report.letti_clienti = schede.length;

  // Ruoli cliente + sedi + recapiti + fatturazione
  for (const [soggettoId, schedeSoggetto] of schedePerSoggetto) {
    // --aggiungi: il cliente c'è già (stesso soggetto) → non si tocca
    if (AGGIUNGI && clientePerSoggetto.has(soggettoId)) { report.gia_clienti++; continue; }
    const prin = cardPrincipale.get(soggettoId)!;
    const amm = prin.dati_amministrativi ?? {};
    const pivaRawPrin = testo(amm['PARTITA IVA'] ?? prin.elenco.VatNumber);
    const pnPrin = normPiva(pivaRawPrin);
    const soggettoNuovo = soggettiNuovi.has(soggettoId);
    const ruolo = await tx.clienti.create({ data: { attivo: true, soggetto_id: soggettoId } });
    const v = await tx.clienti_versioni.create({ data: {
      cliente_id: ruolo.id, fonte: 'crm', valido_dal: DAL,
      piva: pivaRawPrin || null, ragione_sociale: testo(prin.ragione_sociale) || testo(prin.elenco.Name),
      indirizzo: testo(amm.indirizzo) || null, citta: testo(prin.elenco.City) || null,
      provincia: provinciaNorm(prin.elenco.Province), email: testo(amm.Mail).toLowerCase() || null,
    } });
    await tx.clienti.update({ where: { id: ruolo.id }, data: { versione_corrente_id: v.id } });
    clientePerSoggetto.set(soggettoId, ruolo.id);
    report.ruoli_cliente++;

    // --aggiungi: su un soggetto già presente si aggiunge solo il ruolo, niente sedi/recapiti/fatturazione
    if (!soggettoNuovo) continue;

    // Sedi: la scheda principale è legale (predefinita), le altre punto_vendita (catena, D-102)
    const sediData: Prisma.sediCreateManyInput[] = [];
    const recapData: { tipo: string; valore: string; etichetta: string | null; predefinito: boolean }[] = [];
    const visto = new Set<string>();
    const accoda = (tipo: string, valore: string, etichetta: string | null, predefinito: boolean) => {
      const vv = tipo === 'email' || tipo === 'pec' ? valore.toLowerCase() : valore;
      if (!vv) return;
      const k = `${tipo}:${vv}`;
      if (visto.has(k)) return;
      visto.add(k);
      recapData.push({ tipo, valore: vv, etichetta, predefinito });
    };
    for (const [i, scheda] of schedeSoggetto.entries()) {
      const sa = scheda.dati_amministrativi ?? {};
      sediData.push({
        soggetto_id: soggettoId, tipo: i === 0 ? 'legale' : 'punto_vendita', predefinita: i === 0,
        insegna: i === 0 ? null : (testo(scheda.elenco.SellingPoint) || testo(scheda.punto_vendita?.nome) || null),
        indirizzo: testo(sa.indirizzo) || null,
        citta: testo(scheda.elenco.City) || null,
        cap: capDa(sa),
        provincia: provinciaNorm(scheda.elenco.Province),
        paese: paeseDi(normPiva(testo(sa['PARTITA IVA'] ?? scheda.elenco.VatNumber))),
        settore_id: (scheda.elenco.SectorId != null && settoreDb[Number(scheda.elenco.SectorId)]) ? settoreDb[Number(scheda.elenco.SectorId)] : null,
        gruppo_id: (scheda.elenco.GroupId != null && gruppoDb[Number(scheda.elenco.GroupId)]) ? gruppoDb[Number(scheda.elenco.GroupId)] : null,
        valido_dal: DAL,
      });
      accoda('email', testo(sa.Mail), i === 0 ? 'ordini' : null, i === 0);
      accoda('telefono', testo(sa.Telefono), null, false);
      accoda('fax', testo(sa.Fax), null, false);
    }
    if (sediData.length) await tx.sedi.createMany({ data: sediData });
    report.sedi += sediData.length;
    soggettiConLegale.add(soggettoId);
    if (recapData.length) {
      await tx.recapiti.createMany({ data: recapData.map((r) => ({ ...r, soggetto_id: soggettoId, sede_id: null, persona_id: null, valido_dal: DAL })) });
    }
    report.recapiti += recapData.length;

    // Fatturazione: HUB di 7 caratteri o PEC; "0000000" solo con identificativo estero (CHECK §4.5)
    const hub = testo(amm['Codice HUB per fattura elettronica']);
    const pec = testo(amm['Indirizzo per fattura elettronica']);
    let codiceDest: string | null = null;
    let idEstero: string | null = null;
    if (hub) {
      if (/^[A-Z0-9]{7}$/.test(hub) && hub !== '0000000') codiceDest = hub;
      else if (hub === '0000000') {
        if (/^[A-Z]{2}[A-Z0-9]{2,}$/.test(pnPrin)) { codiceDest = '0000000'; idEstero = pnPrin; }
        else scarta('hub_0000000', String(prin.id), 'HUB 0000000 su soggetto italiano: ignorato (serve l\'identificativo estero)');
      } else scarta('hub_non_7', String(prin.id), `HUB "${hub}" non di 7 caratteri: ignorato`);
    }
    if (codiceDest || pec) {
      await tx.fatturazione.create({ data: {
        soggetto_id: soggettoId, attiva: true,
        codice_destinatario: codiceDest, pec_destinatario: pec || null,
        id_paese_estero: idEstero ? paeseDi(pnPrin) : null, id_codice_estero: idEstero,
      } });
      report.fatturazione++;
    }
  }

  // 3. Fornitori: ruolo + soggetto (quando c'è P.IVA) + sede legale. I senza P.IVA restano come ruolo
  // senza master: sono fornitori veri, servono ai legami; niente P.IVA inventata (D-102, come i subagenti senza P.IVA).
  for (const f of fornitoriSorgente) {
    const nome = testo(f.elenco.Name);
    const nomeNorm = normalizza(nome);
    const codiceLegacy = String(f.elenco.Id);
    // --aggiungi: codice esterno già presente → riusa il ruolo, non si ricrea
    if (AGGIUNGI) {
      const gia = codiceRuolo.get(`fornitore:${codiceLegacy}`);
      if (gia !== undefined) { fornitorePerNome.set(nomeNorm, gia); report.gia_fornitori++; continue; }
    }
    const pivaRaw = testo(f.scheda['Company.VATNumber'] ?? f.elenco.PIva);
    const pn = normPiva(pivaRaw);
    const paese = paeseDi(pn);
    let soggettoId: bigint | null = null;
    if (pn && pivaValida(pn)) {
      soggettoId = await nuovoSoggetto('azienda', pivaRaw, null, pn, '', paese);
      // --aggiungi: il fornitore c'è già per questo soggetto → riusa il ruolo
      if (AGGIUNGI && fornitorePerSoggetto.has(soggettoId)) {
        fornitorePerNome.set(nomeNorm, fornitorePerSoggetto.get(soggettoId)!);
        report.gia_fornitori++;
        continue;
      }
    } else if (pn) {
      scarta('piva_non_valida', String(f.elenco.Id), `P.IVA fornitore "${pivaRaw}" non valida`, nome);
    } else {
      // --aggiungi: fornitore senza P.IVA già presente per nome → riusa
      if (AGGIUNGI && fornitorePerNome.has(nomeNorm)) { report.gia_fornitori++; continue; }
      conflitto('fornitore_senza_piva', `"${nome}" importato come fornitore senza soggetto (nessuna P.IVA)`);
    }
    const ruolo = await tx.fornitori.create({ data: { soggetto_id: soggettoId, attivo: Number(f.elenco.State) === 0 } });
    const vers = await tx.fornitori_versioni.create({ data: {
      fornitore_id: ruolo.id, fonte: 'crm', valido_dal: DAL,
      piva: pivaRaw || null, ragione_sociale: testo(f.scheda['Company.BusinessName']) || nome,
      paese: testo(f.scheda['Company.Address.Nation']) || null,
    } });
    await tx.fornitori.update({ where: { id: ruolo.id }, data: { versione_corrente_id: vers.id } });
    // D-101: se il soggetto è già cliente (stessa P.IVA), la sede legale c'è già; senza P.IVA non c'è sede
    if (soggettoId !== null && !soggettiConLegale.has(soggettoId)) {
      await tx.sedi.create({ data: {
        soggetto_id: soggettoId, tipo: 'legale', predefinita: true,
        indirizzo: testo(f.scheda['Company.Address.Street']) || null,
        cap: testo(f.scheda['Company.Address.ZipCode']) || null,
        citta: testo(f.scheda['Company.Address.City']) || null,
        provincia: provinciaNorm(f.scheda['Company.Address.Province']),
        paese, valido_dal: DAL,
      } });
      soggettiConLegale.add(soggettoId);
      report.sedi++;
    }
    fornitorePerNome.set(nomeNorm, ruolo.id);
    if (soggettoId !== null) fornitorePerSoggetto.set(soggettoId, ruolo.id);
    report.ruoli_fornitore++;
  }
  report.fornitori = fornitoriSorgente.length;

  // 4. Agenti e subagenti: il subagente sta sull'agente Decobrands (come oggi)
  const nomeSplit = (n: string): [string, string] => { const i = n.indexOf(' '); return i < 0 ? [n, ''] : [n.slice(0, i), n.slice(i + 1)]; };
  for (const [i, a] of agentiSorgente.entries()) {
    const nome = testo(a.elenco.Name);
    const nomeNorm = normalizza(nome);
    if (AGGIUNGI && agentePerNome.has(nomeNorm)) {
      if (nomeNorm === normalizza('DECOBRANDS SRL')) agenteDeco = agentePerNome.get(nomeNorm)!;
      report.gia_agenti++;
      continue;
    }
    const pivaRaw = testo(a.elenco.PIva ?? a.scheda['Company.VATNumber']);
    const pn = normPiva(pivaRaw);
    let soggettoId: bigint | null = null;
    if (pn && pivaValida(pn)) soggettoId = await nuovoSoggetto('persona', pivaRaw, null, pn, '', paeseDi(pn));
    const [nomeP, cognome] = nomeSplit(nome);
    const ruolo = await tx.agenti.create({ data: { codice: `AGE${String(i + 1).padStart(2, '0')}`, nome: nomeP, cognome, email: testo(a.elenco.Mail) || null, attivo: true, soggetto_id: soggettoId } });
    agentePerNome.set(nomeNorm, ruolo.id);
    if (nomeNorm === normalizza('DECOBRANDS SRL')) agenteDeco = ruolo.id;
    report.ruoli_agente++;
  }
  report.agenti = agentiSorgente.length;
  if (agenteDeco === null) throw new Error('Agente DECOBRANDS SRL non trovato né nell\'estratto né nel database');

  for (const [i, s] of subagentiSorgente.entries()) {
    const nome = testo(s.elenco.Name);
    const nomeNorm = normalizza(nome);
    const codiceLegacy = String(s.elenco.Id);
    if (AGGIUNGI) {
      const giaCodice = codiceRuolo.get(`subagente:${codiceLegacy}`);
      if (giaCodice !== undefined) { subagentePerNome.set(nomeNorm, giaCodice); report.gia_subagenti++; continue; }
      // già presente per nome (senza codice del vecchio CRM): si riusa, non si duplica
      if (subagentePerNome.has(nomeNorm)) { report.gia_subagenti++; continue; }
    }
    const pivaRaw = testo(s.elenco.PIva ?? s.scheda['Company.VATNumber']);
    const pn = normPiva(pivaRaw);
    let soggettoId: bigint | null = null;
    if (pn && pivaValida(pn)) soggettoId = await nuovoSoggetto('persona', pivaRaw, null, pn, '', paeseDi(pn));
    const [nomeP, cognome] = nomeSplit(nome);
    const ruolo = await tx.subagenti.create({ data: { agente_id: agenteDeco!, codice: `SUB${String(i + 1).padStart(2, '0')}`, nome: nomeP, cognome, email: testo(s.elenco.Mail) || null, attivo: true, soggetto_id: soggettoId } });
    subagentePerNome.set(nomeNorm, ruolo.id);
    report.ruoli_subagente++;
  }
  report.subagenti = subagentiSorgente.length;

  // 5. Persone e contatti: solo nell'import one-shot. In --aggiungi restano quelli già presenti
  // (non sono necessari ai documenti e il secondo giro li duplicherebbe).
  if (!AGGIUNGI) {
    const contattiRighe = csvColonne('contatti_clienti.csv');
    const persIdPerRiga: bigint[] = [];
    for (const riga of contattiRighe) {
      const [nomeP, cognome] = nomeSplit(riga.nome || '');
      const persona = await tx.persone.create({ data: { nome: nomeP || '—', cognome: cognome || '', attivo: true } });
      persIdPerRiga.push(persona.id);
      report.persone++;
    }
    const soggettoDellaScheda = (scheda: SchedaCliente | undefined): bigint | null => {
      if (!scheda) return null;
      const amm = scheda.dati_amministrativi ?? {};
      const pn = normPiva(testo(amm['PARTITA IVA'] ?? scheda.elenco.VatNumber));
      const cn = normalizza(testo(amm['Codice fiscale']));
      if (pn && pivaValida(pn)) return soggettoPer.get(`p:${paeseDi(pn)}:${pn}`) ?? null;
      if (cn && cfValido(cn)) return soggettoPer.get(`c:IT:${cn}`) ?? null;
      return null;
    };
    const personeContatti: Prisma.persone_contattiCreateManyInput[] = [];
    const recapitiPersone: Prisma.recapitiCreateManyInput[] = [];
    for (const [i, riga] of contattiRighe.entries()) {
      const scheda = schedaPerId.get(Number(riga.cliente_id));
      const soggettoId = soggettoDellaScheda(scheda);
      if (!soggettoId) { scarta('contatto_senza_soggetto', riga.cliente_id, 'contatto di una scheda non diventata soggetto', riga.cliente); continue; }
      const mansione = (riga.mansione || '').toLowerCase();
      const ruolo = mansione.includes('acquist') ? 'acquisti'
        : mansione.includes('titol') ? 'titolare'
        : mansione.includes('amministraz') ? 'amministrazione'
        : mansione.includes('magazzin') ? 'magazzino' : null;
      personeContatti.push({ persona_id: persIdPerRiga[i], soggetto_id: soggettoId, sede_id: null, ruolo, referente: false, valido_dal: DAL });
      if (riga.email) recapitiPersone.push({ persona_id: persIdPerRiga[i], soggetto_id: null, sede_id: null, tipo: 'email', valore: riga.email.toLowerCase(), valido_dal: DAL });
      if (riga.telefono) recapitiPersone.push({ persona_id: persIdPerRiga[i], soggetto_id: null, sede_id: null, tipo: 'telefono', valore: riga.telefono, valido_dal: DAL });
      if (riga.cellulare) recapitiPersone.push({ persona_id: persIdPerRiga[i], soggetto_id: null, sede_id: null, tipo: 'cellulare', valore: riga.cellulare, valido_dal: DAL });
    }
    report.contatti_persona = contattiRighe.length;
    if (personeContatti.length) await tx.persone_contatti.createMany({ data: personeContatti });
    report.persone_contatti = personeContatti.length;
    if (recapitiPersone.length) await tx.recapiti.createMany({ data: recapitiPersone });
    report.recapiti += recapitiPersone.length;
  }

  // 6. Legami (4022) → interscambio + sconti: solo con subagente riconosciuto e cliente diventato soggetto
  const scontiData: Prisma.scontiCreateManyInput[] = [];
  const coppiaVista = new Set<string>(); // cliente×fornitore già viste in questo giro: il vincolo EXCLUDE ammette un solo subagente al giorno (D-35)
  // --aggiungi: un'agenzia (aperta o chiusa) già presente per la coppia non si tocca → conflitto
  const coppieDb = new Set<string>();
  if (AGGIUNGI) {
    for (const it of await tx.interscambio.findMany({ select: { cliente_id: true, fornitore_id: true } })) {
      coppieDb.add(`${it.cliente_id}:${it.fornitore_id}`);
    }
  }
  const soggettoDellaScheda = (scheda: SchedaCliente | undefined): bigint | null => {
    if (!scheda) return null;
    const amm = scheda.dati_amministrativi ?? {};
    const pn = normPiva(testo(amm['PARTITA IVA'] ?? scheda.elenco.VatNumber));
    const cn = normalizza(testo(amm['Codice fiscale']));
    if (pn && pivaValida(pn)) return soggettoPer.get(`p:${paeseDi(pn)}:${pn}`) ?? null;
    if (cn && cfValido(cn)) return soggettoPer.get(`c:IT:${cn}`) ?? null;
    return null;
  };
  report.collegamenti = collegamenti.length;
  for (const leg of collegamenti) {
    const scheda = schedaPerId.get(Number(leg.cliente_id));
    const soggettoId = soggettoDellaScheda(scheda);
    const clienteRuolo = soggettoId ? (clientePerSoggetto.get(soggettoId) ?? null) : null;
    const fornitoreRuolo = fornitorePerNome.get(normalizza(leg.fornitore)) ?? null;
    const sub = leg.subagente ? (subagentePerNome.get(normalizza(leg.subagente)) ?? null) : null;
    if (!leg.subagente) { conflitto('legame_senza_subagente', `cliente ${leg.cliente} (${leg.cliente_id}) · fornitore ${leg.fornitore}`); continue; }
    if (!sub) { conflitto('subagente_non_trovato', `"${leg.subagente}" non è fra i 23 subagenti importati`); continue; }
    if (!clienteRuolo) { conflitto('cliente_non_soggetto', `cliente ${leg.cliente} (${leg.cliente_id}) senza P.IVA/CF: legame non importato`); continue; }
    if (!fornitoreRuolo) { conflitto('fornitore_non_trovato', `fornitore "${leg.fornitore}" non trovato`); continue; }
    const chiaveCoppia = `${clienteRuolo}:${fornitoreRuolo}`;
    if (AGGIUNGI && coppieDb.has(chiaveCoppia)) {
      conflitto('agenzia_esistente', `cliente ${leg.cliente} (${leg.cliente_id}) · fornitore ${leg.fornitore}: agenzia già presente, non toccata`);
      report.gia_interscambio++;
      continue;
    }
    if (coppiaVista.has(chiaveCoppia)) {
      conflitto('legame_doppio', `cliente ${leg.cliente} (${leg.cliente_id}) · fornitore ${leg.fornitore} · subagente ${leg.subagente}`);
      continue;
    }
    coppiaVista.add(chiaveCoppia);
    const sconto1 = Number(leg.sconto1 || 0);
    const sconto2 = Number(leg.sconto2 || 0);
    const it = await tx.interscambio.create({ data: {
      subagente_id: sub, cliente_id: clienteRuolo, fornitore_id: fornitoreRuolo,
      codice_cliente_fornitore: leg.codice_cliente || null, sconto: sconto1, valido_dal: DAL_SEMPRE,
      da_confermare: true, // D-159: dal vecchio CRM, da confermare al primo uso
    } });
    report.interscambio++;
    if (sconto1 > 0) scontiData.push({ interscambio_id: it.id, ordine: 1, tipo: 'commerciale', percentuale: sconto1, valido_dal: DAL });
    if (sconto2 > 0) scontiData.push({ interscambio_id: it.id, ordine: 2, tipo: 'commerciale', percentuale: sconto2, valido_dal: DAL });
  }
  if (scontiData.length) await tx.sconti.createMany({ data: scontiData });
  report.sconti = scontiData.length;

  // D-158: --correggi-date porta a "da sempre" le agenzie del vecchio CRM già importate con la data
  // dell'estratto (2026-11-08), se nessuno le ha toccate né usate in un periodo chiuso.
  if (CORREGGI_DATE) await correggiDate(tx);

  // 7. Codici esterni (§5.4): una riga per scheda (tipo soggetto) e una per ruolo. I codici già
  // presenti (--aggiungi, giro successivo) non si riscrivono (codiciVisti è pre-caricato).
  const codiciData: Prisma.codici_esterniCreateManyInput[] = [];
  const accodaCodice = (tipo: string, codice: string, entita_id: bigint, etichetta: string | null = null) => {
    const k = `vecchio_crm:${tipo}:${codice}`;
    if (codiciVisti.has(k)) return;
    codiciVisti.add(k);
    codiciData.push({ sistema: 'vecchio_crm', tipo, codice, entita_id, etichetta: etichetta ? etichetta.slice(0, 50) : null });
  };
  for (const scheda of schede) {
    const soggettoId = soggettoDellaScheda(scheda);
    if (soggettoId === null) continue;
    accodaCodice('soggetto', String(scheda.id), soggettoId, testo(scheda.ragione_sociale));
    const ruolo = clientePerSoggetto.get(soggettoId);
    if (ruolo !== undefined) accodaCodice('cliente', String(cardPrincipale.get(soggettoId)!.id), ruolo, testo(cardPrincipale.get(soggettoId)!.ragione_sociale));
  }
  for (const f of fornitoriSorgente) {
    const ruoloId = fornitorePerNome.get(normalizza(testo(f.elenco.Name)));
    if (ruoloId === undefined) continue;
    accodaCodice('fornitore', String(f.elenco.Id), ruoloId, testo(f.elenco.Name));
    const pn = normPiva(testo(f.scheda['Company.VATNumber'] ?? f.elenco.PIva));
    if (pn && pivaValida(pn)) {
      const soggettoId = soggettoPer.get(`p:${paeseDi(pn)}:${pn}`);
      if (soggettoId !== undefined) accodaCodice('soggetto', String(f.elenco.Id), soggettoId, testo(f.elenco.Name));
    }
  }
  for (const [nome, id] of subagentePerNome) {
    const s = subagentiSorgente.find((x) => normalizza(testo(x.elenco.Name)) === nome);
    if (s) accodaCodice('subagente', String(s.elenco.Id), id, testo(s.elenco.Name));
  }
  if (codiciData.length) await tx.codici_esterni.createMany({ data: codiciData });
  report.codici_esterni = codiciData.length;

  // 8. Fusione registrata in modifiche (§7.5): solo per i soggetti nuovi di questo giro
  const fusioniData: Prisma.modificheCreateManyInput[] = [];
  for (const [soggettoId, schedeSoggetto] of schedePerSoggetto) {
    if (!soggettiNuovi.has(soggettoId)) continue;
    if (schedeSoggetto.length > 1) {
      report.fusioni.push({ chiave: `soggetto ${soggettoId}`, codici: schedeSoggetto.map((s) => String(s.id)), n: schedeSoggetto.length });
      fusioniData.push({ entita: 'soggetto', entita_id: soggettoId, campo: 'fusione', valore_dopo: schedeSoggetto.map((s) => String(s.id)).join(',') });
    }
  }
  if (fusioniData.length) await tx.modifiche.createMany({ data: fusioniData });

  // 9. Evento nel registro (V13: stessa transazione)
  await logEvent(tx, {
    tipo: 'crud', azione: 'create', entita: 'import', esito: 'successo',
    dettaglio: {
      etichetta: AGGIUNGI ? 'Import vecchio CRM (aggiungi)' : 'Import vecchio CRM',
      soggetti: report.soggetti, clienti: report.ruoli_cliente, fornitori: report.ruoli_fornitore,
      subagenti: report.ruoli_subagente, agenti: report.ruoli_agente, interscambio: report.interscambio,
      ...(CORREGGI_DATE ? { date_corrette: report.date_corrette } : {}),
    },
  });
}

// ---------- Cosa manca in Integra (solo --aggiungi) ----------
async function scriviDaInserireInIntegra(db: PrismaClient) {
  const fPiva = new Set<string>(), fNome = new Set<string>();
  const cPiva = new Set<string>(), cNome = new Set<string>();
  let visteAssenti = false;
  try {
    const rf = await db.$queryRaw<{ piva: string | null; ragione_sociale: string | null }[]>`SELECT piva, ragione_sociale FROM public.integra_v_fornitori`;
    const rc = await db.$queryRaw<{ piva: string | null; ragione_sociale: string | null }[]>`SELECT piva, ragione_sociale FROM public.integra_v_clienti`;
    for (const r of rf) { const p = r.piva ? normPiva(r.piva) : ''; if (p && pivaValida(p)) fPiva.add(p); if (r.ragione_sociale) fNome.add(normalizza(r.ragione_sociale)); }
    for (const r of rc) { const p = r.piva ? normPiva(r.piva) : ''; if (p && pivaValida(p)) cPiva.add(p); if (r.ragione_sociale) cNome.add(normalizza(r.ragione_sociale)); }
  } catch {
    visteAssenti = true;
  }
  if (visteAssenti) {
    scriviCsv('da-inserire-in-integra.csv', ['tipo', 'ragione_sociale', 'piva', 'citta', 'codice_vecchio_crm', 'n_collegamenti'], [['', 'viste di Integra assenti', '', '', '', '']]);
    report.da_inserire_in_integra = -1;
    return;
  }
  const nF = new Map<string, number>(), nC = new Map<number, number>();
  for (const leg of collegamenti) {
    nF.set(testo(leg.fornitore), (nF.get(testo(leg.fornitore)) ?? 0) + 1);
    nC.set(Number(leg.cliente_id), (nC.get(Number(leg.cliente_id)) ?? 0) + 1);
  }
  const righe: (string | number)[][] = [];
  for (const f of fornitoriSorgente) {
    const nome = testo(f.elenco.Name);
    const piva = normPiva(testo(f.scheda['Company.VATNumber'] ?? f.elenco.PIva));
    const inIntegra = (piva && pivaValida(piva)) ? fPiva.has(piva) : fNome.has(normalizza(nome));
    if (inIntegra) continue;
    righe.push(['fornitore', nome, piva, testo(f.scheda['Company.Address.City']), Number(f.elenco.Id), nF.get(testo(f.elenco.Name)) ?? 0]);
  }
  for (const c of schede) {
    const amm = c.dati_amministrativi ?? {};
    const nome = testo(c.ragione_sociale) || testo(c.elenco.Name);
    const piva = normPiva(testo(amm['PARTITA IVA'] ?? c.elenco.VatNumber));
    const inIntegra = (piva && pivaValida(piva)) ? cPiva.has(piva) : cNome.has(normalizza(nome));
    if (inIntegra) continue;
    righe.push(['cliente', nome, piva, testo(c.elenco.City), c.id, nC.get(c.id) ?? 0]);
  }
  scriviCsv('da-inserire-in-integra.csv', ['tipo', 'ragione_sociale', 'piva', 'citta', 'codice_vecchio_crm', 'n_collegamenti'], righe);
  report.da_inserire_in_integra = righe.length;
}

// ---------- Scrittura dei report ----------
function scriviReport(tempo: number) {
  const { tempi, fusioni, scarti, conflitti, ...conti } = report;
  writeFileSync(join(OUT, 'import-riepilogo.json'), JSON.stringify({
    estratto_il: ESTRAZIONE, ...conti,
    tempi: { ...tempi, totale: tempo },
  }, null, 2), 'utf8');
  scriviCsv('import-fusioni.csv', ['piva', 'n_righe', 'codici_schede'], fusioni.map((f) => [f.chiave, f.n, f.codici.join(' ')]));
  scriviCsv('import-scarti.csv', ['tipo', 'id', 'motivo', 'dettaglio'], scarti.map((s) => [s.tipo, s.id, s.motivo, s.dettaglio]));
  scriviCsv('import-conflitti.csv', ['tipo', 'dettaglio'], conflitti.map((c) => [c.tipo, c.dettaglio]));
}

// ---------- Esecuzione ----------
class ProvaRollback extends Error {}

async function main() {
  const t0 = Date.now();
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    if (!AGGIUNGI) {
      const gia = await db.codici_esterni.findFirst({ where: { sistema: 'vecchio_crm' } });
      if (gia && !SOSTITUISCI) {
        console.log('Import già fatto (c\'è un codice esterno sistema=vecchio_crm): non faccio niente. Per rifarlo: --sostituisci');
        return;
      }
    }
    if (SOSTITUISCI) {
      if (!(await chiediConferma())) { console.log('Annullato.'); return; }
      await svuotaImport(db);
      console.log('Tabelle del vecchio CRM svuotate.');
    }
    const tImport = Date.now();
    report.tempi.lettura = tImport - t0;
    // la sequenza del codice non torna indietro col rollback: in --prova la riporto dov'era
    const seq = PROVA ? (await db.$queryRaw<{ last_value: bigint; is_called: boolean }[]>`SELECT last_value, is_called FROM soggetti_codice_seq`)[0] : null;
    try {
      await db.$transaction(async (tx) => {
        await importa(tx);
        if (PROVA) throw new ProvaRollback();
      }, { timeout: 600_000, maxWait: 10_000 });
    } catch (e) {
      if (!(e instanceof ProvaRollback)) throw e;
    }
    if (seq) await db.$queryRaw`SELECT setval('soggetti_codice_seq', ${seq.last_value}, ${seq.is_called})`;
    report.tempi.import = Date.now() - tImport;
    if (AGGIUNGI) await scriviDaInserireInIntegra(db);
    const totale = Date.now() - t0;
    scriviReport(totale);
    console.log(`${PROVA ? 'PROVA (rollback)' : AGGIUNGI ? 'Aggiunta completata' : 'Import completato'}: ${report.soggetti} soggetti nuovi (${report.gia_soggetti} già presenti), ${report.ruoli_cliente} clienti nuovi (${report.gia_clienti} già presenti), ${report.ruoli_fornitore} fornitori nuovi (${report.gia_fornitori} già presenti), ${report.ruoli_subagente} subagenti nuovi (${report.gia_subagenti} già presenti), ${report.interscambio} interscambio nuovi (${report.gia_interscambio} già presenti)${CORREGGI_DATE ? `, ${report.date_corrette} date agenzie corrette` : ''} in ${(totale / 1000).toFixed(1)} s`);
  } catch (e) {
    console.error('errore:', (e instanceof Error ? e.message : String(e)).replace(/postgres(?:ql)?:\/\/\S+/gi, '[indirizzo rimosso]').replace(/password\s*=\s*\S+/gi, 'password=[rimossa]'));
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

function chiediConferma(): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question('--sostituisci svuota le tabelle del vecchio CRM su decobrands_import. Scrivi SI per confermare: ', (r) => { rl.close(); resolve(r.trim().toUpperCase() === 'SI'); });
  });
}

void main();
