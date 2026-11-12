// Import dello storico dei legami del vecchio CRM (F1-A12, D-112, §4.7.2-4.7.3).
// Un solo comando, una sola transazione (V13, D-36), idempotente. Si esegue con ts-node:
//   npm run import:storico [--prova] [--sostituisci]
// Scrive su DATABASE_URL (in esercizio decobrands_db): lo storico serve all'app in esercizio,
// non è una prova. Tutte le righe: anche quelle che non si useranno mai.
// `importaStorico` è esportata per le prove (test/storico.spec.ts).
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';
import { logEvent } from '../src/registro';
import { normalizzaNome } from '../src/proposta';
import { normalizzaCF, normalizzaPiva } from '../src/storico';

type Tx = Prisma.TransactionClient;

// ---------- Configurazione ----------
const LEGACY = join(__dirname, '..', '..', '..', 'dati-crm-legacy');
const FONTE = 'vecchio_crm';
const ESTRAZIONE = '2026-11-08'; // data dell'estratto (come import-vecchio-crm)
const ESTRAZIONE_DATA = new Date(`${ESTRAZIONE}T00:00:00Z`);

// ---------- Lettura dei file (una volta per processo: i file non cambiano) ----------
const leggi = (nome: string) => readFileSync(join(LEGACY, nome), 'utf8');
const testo = (v: unknown) => String(v ?? '').trim().replace(/\s+/g, ' ');
const mail = (v: unknown) => testo(v).toLowerCase();

// CSV RFC 4180 minimo (campi quotati, virgolette raddoppiate) — come import-vecchio-crm.ts
function parseCsv(texto: string): string[][] {
  const righe: string[][] = [];
  let riga: string[] = [];
  let campo = '';
  let inVirgolette = false;
  const t = texto.replace(/^\uFEFF/, '');
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inVirgolette) {
      if (c === '"') { if (t[i + 1] === '"') { campo += '"'; i++; } else inVirgolette = false; }
      else campo += c;
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

/** CAP dalla città/comune ("40016 - … (BO)"): il primo numero di 5 cifre. */
const capDa = (s: string): string | null => { const m = String(s).match(/\d{5}/); return m ? m[0] : null; };
/** Provincia normalizzata: due lettere maiuscole; il resto non entra (CHAR(2)). */
const provinciaNorm = (v: unknown): string | null => { const s = testo(v).toUpperCase(); return /^[A-Z]{2}$/.test(s) ? s : null; };
/** Paese dalla P.IVA normalizzata: due lettere iniziali estere, altrimenti IT. */
const paeseDi = (pn: string): string => (/^[A-Z]{2}/.test(pn) ? pn.slice(0, 2) : 'IT');

// ---------- Sorgenti ----------
const fornitoriSorgente: { elenco: Record<string, unknown> }[] = JSON.parse(leggi('fornitori.json'));
// nome normalizzato → fornitore (id, P.IVA, nome): il confronto tollera spazi e refusi (D-112)
const fornitorePer = new Map<string, { id: number; piva: string | null; nome: string }>();
for (const f of fornitoriSorgente) {
  const nome = testo(f.elenco.Name);
  fornitorePer.set(normalizzaNome(nome), { id: Number(f.elenco.Id), piva: testo(f.elenco.PIva) || null, nome });
}

const schede: { id: number; ragione_sociale: string; elenco: Record<string, unknown>; dati_amministrativi: Record<string, unknown> }[] = [];
const scartiSoggetti: { id: number; motivo: string }[] = [];
for (const riga of leggi('clienti.jsonl').split('\n')) {
  if (!riga.trim()) continue;
  const o = JSON.parse(riga);
  if (o.scheda_errore) { scartiSoggetti.push({ id: Number(o.id), motivo: 'errore 500 nel vecchio CRM, scheda non leggibile' }); continue; }
  schede.push(o);
}
const schedaPerId = new Map(schede.map((c) => [Number(c.id), c]));

const collegamenti = csvColonne('collegamenti.csv');

// ---------- Report ----------
export interface ReportStorico {
  righe_lette: number;
  schede_lette: number;
  inseriti_soggetti: number;
  gia_soggetti: number;
  inseriti_legami: number;
  gia_legami: number;
  senza_subagente: number;
  senza_piva_cliente: number;
  senza_piva_fornitore: number;
  senza_riscontro: number;
  scarti: { tipo: string; id: string; motivo: string; dettaglio: string }[];
}

// ---------- Import (una transazione, V13) ----------
class ProvaRollback extends Error {}

async function importa(tx: Tx, report: ReportStorico) {
  // 1. soggetti_storico: le schede di clienti.jsonl senza scheda_errore, solo i campi che servono
  const esistenti = new Set((await tx.soggetti_storico.findMany({ select: { legacy_id: true } })).map((r) => r.legacy_id));
  const soggettiRows: Prisma.soggetti_storicoCreateManyInput[] = [];
  for (const c of schede) {
    if (esistenti.has(BigInt(c.id))) { report.gia_soggetti++; continue; }
    esistenti.add(BigInt(c.id));
    const amm = c.dati_amministrativi ?? {};
    const piva = testo(amm['PARTITA IVA'] ?? c.elenco.VatNumber);
    const pn = normalizzaPiva(piva);
    const cf = testo(amm['Codice fiscale']);
    soggettiRows.push({
      legacy_id: BigInt(c.id),
      ragione_sociale: testo(c.ragione_sociale) || testo(c.elenco.Name) || null,
      piva: piva || null,
      piva_norm: pn,
      codice_fiscale: cf || null,
      cf_norm: normalizzaCF(cf),
      indirizzo: testo(amm.indirizzo) || null,
      cap: capDa(testo(amm['Città'] ?? amm.comune)),
      citta: testo(c.elenco.City) || null,
      provincia: provinciaNorm(c.elenco.Province),
      paese: pn ? paeseDi(pn) : 'IT',
      email: mail(amm.Mail) || null,
      telefono: testo(amm.Telefono) || null,
      sorgente: FONTE,
    });
    report.inseriti_soggetti++;
  }
  if (soggettiRows.length) await tx.soggetti_storico.createMany({ data: soggettiRows, skipDuplicates: true });

  // 2. interscambio_storico: tutti i legami, anche senza subagente
  const coppie = new Set((await tx.interscambio_storico.findMany({ select: { cliente_legacy_id: true, fornitore_legacy_id: true } }))
    .map((r) => `${r.cliente_legacy_id}:${r.fornitore_legacy_id}`));
  const legamiRows: Prisma.interscambio_storicoCreateManyInput[] = [];
  for (const leg of collegamenti) {
    const fornitore = fornitorePer.get(normalizzaNome(leg.fornitore));
    if (!fornitore) { report.scarti.push({ tipo: 'fornitore_non_trovato', id: leg.id_collegamento, motivo: `fornitore "${leg.fornitore}" assente in fornitori.json`, dettaglio: leg.cliente }); continue; }
    const scheda = schedaPerId.get(Number(leg.cliente_id));
    const amm = scheda?.dati_amministrativi ?? {};
    const piva = scheda ? testo(amm['PARTITA IVA'] ?? scheda.elenco.VatNumber) : '';
    // conteggi sul dato di origine, per ogni riga (non solo per quelle inserite)
    if (!scheda) report.senza_riscontro++;
    if (!piva) report.senza_piva_cliente++;
    if (!fornitore.piva) report.senza_piva_fornitore++;
    if (!leg.subagente) report.senza_subagente++;
    const chiave = `${BigInt(leg.cliente_id)}:${BigInt(fornitore.id)}`;
    if (coppie.has(chiave)) { report.gia_legami++; continue; }
    coppie.add(chiave);
    legamiRows.push({
      fonte: FONTE,
      estratto_il: ESTRAZIONE_DATA,
      cliente_legacy_id: BigInt(leg.cliente_id),
      fornitore_legacy_id: BigInt(fornitore.id),
      cliente_codice_fornitore: leg.codice_cliente || null,
      cliente_ragione_sociale: scheda ? (testo(scheda.ragione_sociale) || testo(scheda.elenco.Name) || null) : null,
      cliente_piva: piva || null,
      cliente_piva_norm: piva ? normalizzaPiva(piva) : '',
      cliente_cf: scheda ? (testo(amm['Codice fiscale']) || null) : null,
      fornitore_ragione_sociale: fornitore.nome,
      fornitore_piva: fornitore.piva,
      agente_nome: leg.agente || null,
      subagente_nome: leg.subagente || null,
      sconto_1: Number(leg.sconto1 || 0),
      sconto_2: Number(leg.sconto2 || 0),
    });
    report.inseriti_legami++;
  }
  if (legamiRows.length) await tx.interscambio_storico.createMany({ data: legamiRows, skipDuplicates: true });

  // 3. Evento nel registro (V13: stessa transazione); la data dell'estratto sta qui, non nei log
  await logEvent(tx, {
    tipo: 'crud', azione: 'create', entita: 'import', esito: 'successo',
    dettaglio: {
      etichetta: 'Import storico legami',
      estratto_il: ESTRAZIONE,
      righe: report.righe_lette,
      soggetti_storico: report.inseriti_soggetti,
      interscambio_storico: report.inseriti_legami,
    },
  });
}

/** Importa lo storico e restituisce il report. `prova` esegue in una transazione con rollback;
 *  `sostituisci` svuota le tabelle nella stessa transazione (V13), ma solo se nessuna riga è stata
 *  usata: lo stato delle agenzie già create non si perde. */
export async function importaStorico(db: PrismaClient, opts: { prova?: boolean; sostituisci?: boolean } = {}): Promise<ReportStorico> {
  const report: ReportStorico = {
    righe_lette: collegamenti.length,
    schede_lette: schede.length,
    inseriti_soggetti: 0, gia_soggetti: 0,
    inseriti_legami: 0, gia_legami: 0,
    senza_subagente: 0, senza_piva_cliente: 0, senza_piva_fornitore: 0, senza_riscontro: 0,
    scarti: scartiSoggetti.map((s) => ({ tipo: 'scheda_non_leggibile', id: String(s.id), motivo: s.motivo, dettaglio: '' })),
  };
  try {
    await db.$transaction(async (tx) => {
      if (opts.sostituisci) {
        // senza RESTART IDENTITY: gli id già usati non si riusano e il registro resta coerente.
        // Il lock esclude scritture concorrenti (un'agenzia che consuma una riga) fra il controllo e
        // lo svuotamento: o si vede la riga usata e si rifiuta, o il TRUNCATE è sicuro.
        await tx.$executeRawUnsafe('LOCK TABLE interscambio_storico IN EXCLUSIVE MODE');
        const usate = await tx.interscambio_storico.count({ where: { stato: { not: 'da_usare' } } });
        if (usate) {
          throw new Error(`Ci sono ${usate} righe dello storico già usate: --sostituisci non si può usare, lo stato delle agenzie create andrebbe perso`);
        }
        await tx.$executeRawUnsafe('TRUNCATE interscambio_storico, soggetti_storico');
      }
      await importa(tx, report);
      if (opts.prova) throw new ProvaRollback();
    }, { timeout: 600_000, maxWait: 10_000 });
  } catch (e) {
    if (!(e instanceof ProvaRollback)) throw e;
  }
  return report;
}

// ---------- Esecuzione (CLI) ----------
const args = process.argv.slice(2);
const PROVA = args.includes('--prova');
const SOSTITUISCI = args.includes('--sostituisci');

function chiediConferma(): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question('--sostituisci svuota le tabelle dello storico su DATABASE_URL (solo se nessuna riga è già stata usata). Scrivi SI per confermare: ', (r) => { rl.close(); resolve(r.trim().toUpperCase() === 'SI'); });
  });
}

async function main() {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    if (SOSTITUISCI) {
      if (!(await chiediConferma())) { console.log('Annullato.'); return; }
    }
    const t0 = Date.now();
    const r = await importaStorico(db, { prova: PROVA, sostituisci: SOSTITUISCI });
    const secondi = ((Date.now() - t0) / 1000).toFixed(1);
    const scarti = r.scarti.map((s) => `${s.tipo} ${s.id}: ${s.motivo}`);
    if (SOSTITUISCI) console.log('Tabelle dello storico svuotate e reimportate nella stessa transazione.');
    console.log(`${PROVA ? 'PROVA (rollback)' : 'Import completato'}: ${r.inseriti_soggetti} soggetti_storico, ${r.inseriti_legami} interscambio_storico in ${secondi} s`);
    console.log(`righe lette ${r.righe_lette} (${r.senza_subagente} senza subagente, ${r.senza_piva_cliente} senza P.IVA cliente, ${r.senza_piva_fornitore} senza P.IVA fornitore, ${r.senza_riscontro} senza riscontro in clienti.jsonl)`);
    console.log(`già presenti: ${r.gia_soggetti} soggetti, ${r.gia_legami} legami`);
    if (scarti.length) console.log(`scarti (${scarti.length}):\n  ${scarti.join('\n  ')}`);
    else console.log('scarti: nessuno');
  } catch (e) {
    console.error('errore:', (e instanceof Error ? e.message : String(e)).replace(/postgres(?:ql)?:\/\/\S+/gi, '[indirizzo rimosso]').replace(/password\s*=\s*\S+/gi, 'password=[rimossa]'));
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) void main();
