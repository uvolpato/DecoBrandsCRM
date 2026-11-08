// Import one-shot del vecchio CRM nell'anagrafica a soggetti (F1-A9, D-102; specifica-anagrafica-soggetti.md §7).
// Un solo comando, una sola transazione (V13, D-36), idempotente. Si esegue con ts-node:
//   npm run import:vecchio-crm -- --db decobrands_import [--prova] [--sostituisci]
// Oppure passando DATABASE_URL per comando (puntata a decobrands_import).
// Scrive SOLO anagrafica e legami + un evento nel registro. Mai decobrands_db né decobrands_test.
import 'dotenv/config';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';
import { logEvent } from '../src/registro';

type Tx = Prisma.TransactionClient;

// ---------- Configurazione ----------
const LEGACY = join(__dirname, '..', '..', '..', 'dati-crm-legacy');
const OUT = join(LEGACY, 'import');
const ESTRAZIONE = '2026-11-08'; // data dell'estratto (riepilogo.json)
const DAL = new Date(`${ESTRAZIONE}T00:00:00Z`);

const args = process.argv.slice(2);
const PROVA = args.includes('--prova');
const SOSTITUISCI = args.includes('--sostituisci');
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
  if (nomeDb !== 'decobrands_import') throw new Error('Questo import scrive solo su decobrands_import');
  process.env.DATABASE_URL = urlDatabase(nomeDb);
}
if (!/\/decobrands_import\b/.test(process.env.DATABASE_URL!)) {
  throw new Error('Rifiuto: DATABASE_URL non punta a decobrands_import');
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

// ---------- Report ----------
interface RigheFusione { chiave: string; codici: string[]; n: number }
interface RigheScarto { tipo: string; id: string; motivo: string; dettaglio: string }
interface RigheConflitto { tipo: string; dettaglio: string }
const report = {
  letti_clienti: 0, fornitori: 0, subagenti: 0, agenti: 0, gruppi: 0, settori: 0,
  contatti_persona: 0, collegamenti: 0,
  soggetti: 0, ruoli_cliente: 0, ruoli_fornitore: 0, ruoli_subagente: 0, ruoli_agente: 0,
  sedi: 0, recapiti: 0, persone: 0, persone_contatti: 0, fatturazione: 0,
  interscambio: 0, sconti: 0, codici_esterni: 0,
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

// ---------- Svuota (solo --sostituisci) ----------
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
async function importa(tx: Tx) {
  // 1. Gruppi e settori (§7.1)
  const gruppoDb: Record<number, bigint> = {};
  for (const g of gruppiSorgente) {
    const id = Number(g.elenco.Id);
    gruppoDb[id] = (await tx.gruppi.create({ data: { codice: `G${id}`, descrizione: testo(g.elenco.Name), attivo: true } })).id;
  }
  const settoreDb: Record<number, bigint> = {};
  for (const s of settoriSorgente) {
    const id = Number(s.elenco.Id);
    settoreDb[id] = (await tx.settori.create({ data: { codice: `S${id}`, descrizione: testo(s.elenco.Name), attivo: true } })).id;
  }
  report.gruppi = gruppiSorgente.length;
  report.settori = settoriSorgente.length;

  // Identità → soggetto: un solo master condiviso per clienti, fornitori, agenti e subagenti
  // (D-101: la stessa P.IVA/CF non fa due soggetti). Chiave = p:paese:piva_norm | c:paese:cf_norm.
  const soggettoPer = new Map<string, bigint>();
  const schedePerSoggetto = new Map<bigint, SchedaCliente[]>();
  async function nuovoSoggetto(natura: string, piva: string | null, cf: string | null, pn: string, cn: string, paese: string): Promise<bigint> {
    const chiave = pn ? `p:${paese}:${pn}` : `c:${paese}:${cn}`;
    const gia = soggettoPer.get(chiave);
    if (gia) return gia;
    const s = await tx.soggetti.create({ data: {
      natura, paese, piva: piva || null, piva_norm: pn, codice_fiscale: cf || null, cf_norm: cn, sorgente: 'vecchio_crm',
    } });
    soggettoPer.set(chiave, s.id);
    report.soggetti++;
    return s.id;
  }

  // 2. Clienti: identità normalizzata, deduplica (un soggetto per P.IVA/CF)
  const schede: SchedaCliente[] = [];
  for (const riga of leggi('clienti.jsonl').split('\n')) {
    if (!riga.trim()) continue;
    const o = JSON.parse(riga);
    if (o.scheda_errore) { scarta('scheda_non_leggibile', String(o.id), 'errore 500 nel vecchio CRM, solo dati d\'elenco'); continue; }
    schede.push(o);
  }
  report.letti_clienti = schede.length;
  const schedaPerId = new Map(schede.map((c) => [c.id, c])); // ricerca O(1) nei legami e nei contatti

  const clientePerSoggetto = new Map<bigint, bigint>(); // soggetto → clienti.id
  const cardPrincipale = new Map<bigint, SchedaCliente>(); // soggetto → scheda principale (legale)
  const soggettiConLegale = new Set<bigint>(); // già con sede legale predefinita (evita il doppione D-101)

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

  // Ruoli cliente + sedi + recapiti + fatturazione
  for (const [soggettoId, schedeSoggetto] of schedePerSoggetto) {
    const prin = cardPrincipale.get(soggettoId)!;
    const amm = prin.dati_amministrativi ?? {};
    const pivaRawPrin = testo(amm['PARTITA IVA'] ?? prin.elenco.VatNumber);
    const pnPrin = normPiva(pivaRawPrin);
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

  // 3. Fornitori: ruolo + soggetto (quando c'è P.IVA) + sede legale. I 7 senza P.IVA restano come ruolo
  // senza master: sono fornitori veri, servono ai legami; niente P.IVA inventata (D-102, come i subagenti senza P.IVA).
  const fornitorePerNome = new Map<string, bigint>();
  for (const f of fornitoriSorgente) {
    const nome = testo(f.elenco.Name);
    const pivaRaw = testo(f.scheda['Company.VATNumber'] ?? f.elenco.PIva);
    const pn = normPiva(pivaRaw);
    const paese = paeseDi(pn);
    let soggettoId: bigint | null = null;
    if (pn && pivaValida(pn)) soggettoId = await nuovoSoggetto('azienda', pivaRaw, null, pn, '', paese);
    else if (pn) scarta('piva_non_valida', String(f.elenco.Id), `P.IVA fornitore "${pivaRaw}" non valida`, nome);
    else conflitto('fornitore_senza_piva', `"${nome}" importato come fornitore senza soggetto (nessuna P.IVA)`);
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
    fornitorePerNome.set(normalizza(nome), ruolo.id);
    report.ruoli_fornitore++;
  }
  report.fornitori = fornitoriSorgente.length;

  // 4. Agenti e subagenti: il subagente sta sull'agente Decobrands (come oggi)
  const nomeSplit = (n: string): [string, string] => { const i = n.indexOf(' '); return i < 0 ? [n, ''] : [n.slice(0, i), n.slice(i + 1)]; };
  let agenteDeco: bigint | null = null;
  for (const [i, a] of agentiSorgente.entries()) {
    const nome = testo(a.elenco.Name);
    const pivaRaw = testo(a.elenco.PIva ?? a.scheda['Company.VATNumber']);
    const pn = normPiva(pivaRaw);
    let soggettoId: bigint | null = null;
    if (pn && pivaValida(pn)) soggettoId = await nuovoSoggetto('persona', pivaRaw, null, pn, '', paeseDi(pn));
    const [nomeP, cognome] = nomeSplit(nome);
    const ruolo = await tx.agenti.create({ data: { codice: `AGE${String(i + 1).padStart(2, '0')}`, nome: nomeP, cognome, email: testo(a.elenco.Mail) || null, attivo: true, soggetto_id: soggettoId } });
    if (normalizza(nome) === normalizza('DECOBRANDS SRL')) agenteDeco = ruolo.id;
    report.ruoli_agente++;
  }
  report.agenti = agentiSorgente.length;
  if (agenteDeco === null) throw new Error('Agente DECOBRANDS SRL non trovato nell\'estratto');

  const subagentePerNome = new Map<string, bigint>();
  for (const [i, s] of subagentiSorgente.entries()) {
    const nome = testo(s.elenco.Name);
    const pivaRaw = testo(s.elenco.PIva ?? s.scheda['Company.VATNumber']);
    const pn = normPiva(pivaRaw);
    let soggettoId: bigint | null = null;
    if (pn && pivaValida(pn)) soggettoId = await nuovoSoggetto('persona', pivaRaw, null, pn, '', paeseDi(pn));
    const [nomeP, cognome] = nomeSplit(nome);
    const ruolo = await tx.subagenti.create({ data: { agente_id: agenteDeco, codice: `SUB${String(i + 1).padStart(2, '0')}`, nome: nomeP, cognome, email: testo(s.elenco.Mail) || null, attivo: true, soggetto_id: soggettoId } });
    subagentePerNome.set(normalizza(nome), ruolo.id);
    report.ruoli_subagente++;
  }
  report.subagenti = subagentiSorgente.length;

  // 5. Persone e contatti (91) → persone + persone_contatti + recapiti persona (§7.1)
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

  // 6. Legami (4022) → interscambio + sconti: solo con subagente riconosciuto e cliente diventato soggetto
  const collegamenti = csvColonne('collegamenti.csv');
  report.collegamenti = collegamenti.length;
  const scontiData: Prisma.scontiCreateManyInput[] = [];
  const coppiaVista = new Set<string>(); // cliente×fornitore: il vincolo EXCLUDE ammette un solo subagente al giorno (D-35)
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
    if (coppiaVista.has(chiaveCoppia)) { conflitto('legame_doppio', `cliente ${leg.cliente} (${leg.cliente_id}) · fornitore ${leg.fornitore} · subagente ${leg.subagente}`); continue; }
    coppiaVista.add(chiaveCoppia);
    const sconto1 = Number(leg.sconto1 || 0);
    const sconto2 = Number(leg.sconto2 || 0);
    const it = await tx.interscambio.create({ data: {
      subagente_id: sub, cliente_id: clienteRuolo, fornitore_id: fornitoreRuolo,
      codice_cliente_fornitore: leg.codice_cliente || null, sconto: sconto1, valido_dal: DAL,
    } });
    report.interscambio++;
    if (sconto1 > 0) scontiData.push({ interscambio_id: it.id, ordine: 1, tipo: 'commerciale', percentuale: sconto1, valido_dal: DAL });
    if (sconto2 > 0) scontiData.push({ interscambio_id: it.id, ordine: 2, tipo: 'commerciale', percentuale: sconto2, valido_dal: DAL });
  }
  if (scontiData.length) await tx.sconti.createMany({ data: scontiData });
  report.sconti = scontiData.length;

  // 7. Codici esterni (§5.4): una riga per scheda (tipo soggetto) e una per ruolo
  const codiciData: Prisma.codici_esterniCreateManyInput[] = [];
  const codiciVisti = new Set<string>();
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

  // 8. Fusione registrata in modifiche (§7.5)
  const fusioniData: Prisma.modificheCreateManyInput[] = [];
  for (const [soggettoId, schedeSoggetto] of schedePerSoggetto) {
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
      etichetta: 'Import vecchio CRM',
      soggetti: report.soggetti, clienti: report.ruoli_cliente, fornitori: report.ruoli_fornitore,
      subagenti: report.ruoli_subagente, agenti: report.ruoli_agente, interscambio: report.interscambio,
    },
  });
}

// ---------- Scrittura dei report ----------
function scriviReport(tempo: number) {
  mkdirSync(OUT, { recursive: true });
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
    const gia = await db.codici_esterni.findFirst({ where: { sistema: 'vecchio_crm' } });
    if (gia && !SOSTITUISCI) {
      console.log('Import già fatto (c\'è un codice esterno sistema=vecchio_crm): non faccio niente. Per rifarlo: --sostituisci');
      return;
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
    const totale = Date.now() - t0;
    scriviReport(totale);
    console.log(`${PROVA ? 'PROVA (rollback)' : 'Import completato'}: ${report.soggetti} soggetti, ${report.ruoli_cliente} clienti, ${report.ruoli_fornitore} fornitori, ${report.ruoli_subagente} subagenti, ${report.ruoli_agente} agenti, ${report.interscambio} interscambio in ${(totale / 1000).toFixed(1)} s`);
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
