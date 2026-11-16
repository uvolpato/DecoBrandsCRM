// Comando di servizio (15/11/2026, P1): retro-migrazione dei dati già caricati prima delle correzioni.
// Si esegue una volta su decobrands_db (da Claude Code), idempotente, una sola transazione (V13, D-36),
// mai sovrascrivere scelte a mano, un evento nel registro coi conteggi.
//   npm run servizio:sistema-dati -- --db decobrands_db [--prova]
//   npm run servizio:sistema-dati -- --db decobrands_test_servizio [--prova]   (prova: tutto e poi rollback)
//
// Punti (dettagli nei resoconti confronto-righe, riconosciuto-coerente, numero-ordine-fornitore):
// 1. Righe delle pratiche: per i documenti abbinati con arrivo e tipo con fase ma senza righe, copia le
//    righe lette come fa `registra` (fase dal tipo).
// 2. Fornitore riconosciuto: per i documenti da lavorare con fornitore_id null, risolvi come all'apertura
//    (D-175) e salva solo se certo.
// 3. Numero d'ordine del fornitore (D-169): per le pratiche senza, prendilo dal documento d'ordine abbinato
//    (il suo `numero`), con controllo dell'unicità fornitore + numero (in conflitto non scrive, rapporta).
// 4. Zeri iniziali nei codici articolo: aperto di confronto-righe, i dati reali sono puliti → non serve
//    (documentato nel resoconto).
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';
import { faseDi } from '../src/documenti';
import { type TipoDocumento } from '../src/motore/dati';
import { r2 } from '../src/motore/motore';
import { lettoDaCampi, risolviFornitore } from '../src/proposta';
import { logEvent } from '../src/registro';

type Tx = Prisma.TransactionClient;

/** Stesso indirizzo e utente di DATABASE_URL con un altro nome di database (come import-vecchio-crm). */
function urlDatabase(nome: string) {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL non definita in .env');
  const u = new URL(process.env.DATABASE_URL);
  u.pathname = '/' + nome;
  return u.toString();
}

// ---------- Report ----------
export interface ResocontoSistemaDati {
  righe_documenti: number;
  righe_righe: number;
  righe_toccati: string[];
  fornitori_riconosciuti: number;
  fornitori_toccati: string[];
  numeri_ordine: number;
  numeri_ordine_conflitti: number;
  numeri_ordine_toccati: string[];
}
const report: ResocontoSistemaDati = {
  righe_documenti: 0, righe_righe: 0, righe_toccati: [],
  fornitori_riconosciuti: 0, fornitori_toccati: [],
  numeri_ordine: 0, numeri_ordine_conflitti: 0, numeri_ordine_toccati: [],
};

// ---------- Punti (una sola transazione) ----------
export async function sistemaDati(tx: Tx, r: ResocontoSistemaDati = report) {
  // 1. Righe delle pratiche (confronto-righe): documenti con arrivo, tipo con fase, righe vuote.
  const daRiempire = await tx.ordini_fornitore_documenti.findMany({
    where: { arrivo_id: { not: null }, tipo: { in: ['ordine', 'conferma', 'proforma', 'fattura'] }, righe: { none: {} } },
    select: { id: true, testata_id: true, tipo: true, arrivo_id: true, numero: true },
    orderBy: { id: 'asc' },
  });
  for (const d of daRiempire) {
    const fase = faseDi(d.tipo as TipoDocumento);
    if (!fase) continue;
    const letto = await lettoDaCampi(tx, d.arrivo_id!);
    if (!letto.righe.length) continue;
    await tx.ordini_fornitore_righe.createMany({
      data: letto.righe.map((riga, i) => ({
        testata_id: d.testata_id, documento_id: d.id, fase, numero_riga: i + 1,
        codice: riga.codice, descrizione: riga.descrizione, quantita: riga.quantita, prezzo_unitario: riga.prezzo,
        importo: riga.importo != null ? r2(riga.importo) : (riga.quantita != null && riga.prezzo != null ? r2(riga.quantita * riga.prezzo) : null),
      })),
    });
    r.righe_documenti++;
    r.righe_righe += letto.righe.length;
    r.righe_toccati.push(`documento ${d.id} (${d.tipo} ${d.numero}): ${letto.righe.length} righe`);
  }

  // 2. Fornitore riconosciuto (riconosciuto-coerente, D-175): documenti da lavorare senza fornitore.
  const daRisolvere = await tx.documenti_in_arrivo.findMany({
    where: { stato: { in: ['da_controllare', 'errore'] }, fornitore_id: null },
    select: { id: true },
    orderBy: { id: 'asc' },
  });
  for (const { id } of daRisolvere) {
    await tx.$queryRaw`SELECT id FROM documenti_in_arrivo WHERE id = ${id} FOR UPDATE`;
    const doc = await tx.documenti_in_arrivo.findUnique({ where: { id } });
    if (!doc || doc.fornitore_id != null) continue;
    const letto = await lettoDaCampi(tx, id);
    if (!letto.fornitore) continue;
    const f = await risolviFornitore(tx, letto.fornitore);
    if (!f) continue;
    await tx.documenti_in_arrivo.update({ where: { id }, data: { fornitore_id: f.fornitore_id, fornitore_versione_id: f.fornitore_versione_id } });
    r.fornitori_riconosciuti++;
    r.fornitori_toccati.push(`documento ${id} → fornitore ${f.fornitore_id}`);
  }

  // 3. Numero d'ordine del fornitore (D-169): dal documento d'ordine abbinato (il primo, come l'apertura).
  const pratiche = await tx.ordini_fornitore_testata.findMany({
    where: { numero_ordine_fornitore: null },
    select: {
      id: true, numero_ordine: true, fornitore_id: true,
      documenti: { where: { tipo: 'ordine' }, select: { numero: true }, orderBy: [{ data: 'asc' }, { id: 'asc' }], take: 1 },
    },
    orderBy: { id: 'asc' },
  });
  for (const p of pratiche) {
    const ordine = p.documenti[0];
    if (!ordine || !ordine.numero) continue;
    const gia = await tx.ordini_fornitore_testata.findFirst({
      where: { fornitore_id: p.fornitore_id, numero_ordine_fornitore: ordine.numero, id: { not: p.id } },
      select: { numero_ordine: true },
    });
    if (gia) {
      r.numeri_ordine_conflitti++;
      r.numeri_ordine_toccati.push(`pratica ${p.numero_ordine}: ordine ${ordine.numero} già su ${gia.numero_ordine} (non scritto)`);
      continue;
    }
    await tx.ordini_fornitore_testata.update({ where: { id: p.id }, data: { numero_ordine_fornitore: ordine.numero } });
    r.numeri_ordine++;
    r.numeri_ordine_toccati.push(`pratica ${p.numero_ordine} ← ordine ${ordine.numero}`);
  }

  // 4. Zeri iniziali nei codici: aperto non vero (dati reali puliti), nessuna modifica.

  await logEvent(tx, {
    tipo: 'crud', azione: 'create', entita: 'servizio', esito: 'successo',
    dettaglio: {
      etichetta: 'Comando di servizio: dati caricati prima delle correzioni',
      righe_documenti: r.righe_documenti, righe: r.righe_righe,
      fornitori_riconosciuti: r.fornitori_riconosciuti,
      numeri_ordine: r.numeri_ordine, numeri_ordine_conflitti: r.numeri_ordine_conflitti,
    },
  });
}

// ---------- Esecuzione ----------
class ProvaRollback extends Error {}

async function main() {
  // Configurazione dai comandi: --db decobrands_db | decobrands_test_…, --prova = tutto e poi rollback.
  const args = process.argv.slice(2);
  const PROVA = args.includes('--prova');
  const iDb = args.indexOf('--db');
  const nomeDb = iDb >= 0 ? args[iDb + 1] : null;
  if (nomeDb) {
    if (!/^decobrands_(db|test)/.test(nomeDb)) {
      console.error('Rifiuto: questo comando scrive solo su decobrands_db o un database di prova decobrands_test…');
      process.exitCode = 1;
      return;
    }
    process.env.DATABASE_URL = urlDatabase(nomeDb);
  } else {
    console.error('Indica il database con --db decobrands_db (o decobrands_test_…)');
    process.exitCode = 1;
    return;
  }
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    try {
      await db.$transaction(async (tx) => {
        await sistemaDati(tx);
        if (PROVA) throw new ProvaRollback();
      }, { timeout: 600_000, maxWait: 10_000 });
    } catch (e) {
      if (!(e instanceof ProvaRollback)) throw e;
    }
    console.log(`${PROVA ? 'PROVA (rollback)' : 'Completato'}: ${report.righe_documenti} documenti riempiti (${report.righe_righe} righe), ${report.fornitori_riconosciuti} fornitori riconosciuti, ${report.numeri_ordine} numeri d'ordine scritti (${report.numeri_ordine_conflitti} conflitti)`);
    if (report.righe_toccati.length) console.log('Righe:\n  ' + report.righe_toccati.join('\n  '));
    if (report.fornitori_toccati.length) console.log('Fornitori:\n  ' + report.fornitori_toccati.join('\n  '));
    if (report.numeri_ordine_toccati.length) console.log('Numeri d\'ordine:\n  ' + report.numeri_ordine_toccati.join('\n  '));
  } catch (e) {
    console.error('errore:', (e instanceof Error ? e.message : String(e)).replace(/postgres(?:ql)?:\/\/\S+/gi, '[indirizzo rimosso]').replace(/password\s*=\s*\S+/gi, 'password=[rimossa]'));
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) void main();
