// Comando di servizio: rilettura mirata dei documenti già letti (15/11/2026).
//   npm run rilettura:mirata -- [--prova] [--id N…]
// Elenca i documenti letti e dice quali rileggere; senza --prova li rilegge uno alla volta con la
// stessa funzione della rotta POST /documenti/:id/rileggi (rileggiDocumento, nessuna logica nuova).
// Non lanciarlo su decobrands_db senza --prova: lo lancia Claude Code.
//
// Da rileggere solo se: la somma delle righe lette è diversa dall'importo del documento (riga
// mancante), non è congelato e non ha correzioni a mano (le cancellerebbe).
// I documenti già abbinati a una pratica (o congelati, o con correzioni) la rotta vieta di rileggerli:
// finiscono nella lista «da decidere con Ugo», non si aggira.
import 'dotenv/config';
import { PrismaService } from './prisma.service';
import { rileggiDocumento } from './documenti';
import { fattoreSconto, lettoDaCampi, type Letto } from './proposta';

// Tipi articolati, con righe: la «riga mancante» vale solo per loro (un pagamento non ha righe, è giusto).
const TIPI_CON_RIGHE = new Set(['ordine', 'conferma', 'proforma', 'fattura', 'nota_credito']);

const round2 = (n: number) => Math.round(n * 100) / 100;
// importo della riga come il server (proposta.ts importoRigaLetta): letto, altrimenti quantità × prezzo × sconto.
const importoRiga = (r: Letto['righe'][number]) =>
  r.importo ?? (r.quantita != null && r.prezzo != null ? round2(r.quantita * r.prezzo * fattoreSconto(r)) : 0);
const sommaRighe = (l: Letto) => round2(l.righe.reduce((s, r) => s + importoRiga(r), 0));

/** Esito della decisione: rileggere, da decidere con Ugo, o niente da fare. */
export type Esito = 'rileggere' | 'decidere' | null;

/** Decisione pura (per le prove): somma righe ≠ importo, non congelato e senza correzioni a mano; la
 *  rotta ammette solo `errore` e `da_controllare`. Congelato o correzioni a mano → «da decidere». */
export function decide(s: { stato: string; sommaDiversa: boolean; congelato: boolean; correzioni: number }): Esito {
  if (!s.sommaDiversa) return null;
  if (s.congelato || s.correzioni > 0) return 'decidere';
  return s.stato === 'errore' || s.stato === 'da_controllare' ? 'rileggere' : 'decidere';
}

interface Riga {
  id: string; file_nome: string; stato: string; tipo: string | null; numero: string | null;
  importo: number | null; somma: number; spese: number; correzioni: number; congelato: boolean;
  esito: Esito; motivi: string[];
}

export async function analizza(db: PrismaService, ids: bigint[] | null): Promise<Riga[]> {
  const letti = await db.documenti_in_arrivo.findMany({
    where: { letto_il: { not: null }, ...(ids ? { id: { in: ids } } : {}) },
    orderBy: { id: 'asc' },
  });
  const out: Riga[] = [];
  for (const d of letti) {
    const [letto, campi, fiscale] = await Promise.all([
      lettoDaCampi(db, d.id),
      db.documenti_campi.findMany({ where: { documento_id: d.id } }),
      db.ordini_fornitore_documenti.findFirst({ where: { arrivo_id: d.id }, select: { id: true, congelato_il: true, liquidazione_id: true } }),
    ]);
    const correzioni = campi.filter((c) => c.valore_finale != null && c.valore_finale !== c.valore_letto).length;
    const somma = sommaRighe(letto);
    const sommaDiversa = letto.tipo != null && TIPI_CON_RIGHE.has(letto.tipo) && letto.importo != null && Math.abs(somma - letto.importo) > 0.01;
    const inBollettinoChiuso = fiscale
      ? (await db.bollettini_righe.findFirst({ where: { documento_id: fiscale.id, testata: { stato: { not: 'da_verificare' } } }, select: { id: true } })) != null
      : false;
    const congelato = d.abbinato_bollettino_id != null || (fiscale?.congelato_il != null) || (fiscale?.liquidazione_id != null) || inBollettinoChiuso;
    const esito = decide({ stato: d.stato, sommaDiversa, congelato, correzioni });
    const motivi: string[] = [];
    if (sommaDiversa) motivi.push(`somma righe ${somma.toFixed(2)} ≠ importo ${letto.importo!.toFixed(2)}`);
    if (esito === 'decidere' && !motivi.length) motivi.push(`stato ${d.stato} non rileggibile dalla rotta`);
    out.push({
      id: String(d.id), file_nome: d.file_nome, stato: d.stato, tipo: letto.tipo, numero: letto.numero,
      importo: letto.importo, somma, spese: letto.righe.filter((r) => r.spesa).length, correzioni, congelato, esito, motivi,
    });
  }
  return out;
}

const cella = (v: unknown) => String(v ?? '');
const pulisci = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/postgres(?:ql)?:\/\/\S+/gi, '[indirizzo rimosso]').replace(/password\s*=\s*\S+/gi, 'password=[rimossa]');

async function main(argv: string[]) {
  const PROVA = argv.includes('--prova');
  const iId = argv.indexOf('--id');
  const ids = iId >= 0 ? argv.slice(iId + 1).filter((a) => !a.startsWith('--')).map((a) => BigInt(a)) : null;
  const db = new PrismaService();
  try {
    const righe = await analizza(db, ids);
    const intestazione = ['id', 'file', 'stato', 'tipo', 'numero', 'importo', 'somma', 'spese', 'correz.', 'cong.'];
    const colonne = (r: Riga) => [r.id, r.file_nome, r.stato, r.tipo, r.numero, r.importo?.toFixed(2) ?? '', r.somma.toFixed(2), String(r.spese), String(r.correzioni), r.congelato ? 'sì' : 'no'];
    const lar = intestazione.map((_, i) => Math.max(...righe.map((r) => cella(colonne(r)[i]).length), intestazione[i].length));
    console.log(intestazione.map((c, i) => c.padEnd(lar[i])).join('  '));
    for (const r of righe) {
      console.log(colonne(r).map((c, i) => cella(c).padEnd(lar[i])).join('  ') + '  ' + (r.esito === 'rileggere' ? '→ RILEGGI' : r.esito === 'decidere' ? '→ DA DECIDERE' : ''));
      for (const m of r.motivi) console.log(`     ${m}`);
    }
    const daRileggere = righe.filter((r) => r.esito === 'rileggere');
    const daDecidere = righe.filter((r) => r.esito === 'decidere');
    console.log(`\nDocumenti letti: ${righe.length} · da rileggere: ${daRileggere.length} · da decidere con Ugo: ${daDecidere.length}`);
    if (PROVA) {
      console.log('Modo: prova (nessuna scrittura). Per rileggere: npm run rilettura:mirata --' + (ids ? ' --id ' + ids.join(' ') : ''));
      return;
    }
    for (const r of daRileggere) {
      try {
        await rileggiDocumento(db, BigInt(r.id));
        console.log(`riletto documento ${r.id} (${r.file_nome})`);
      } catch (e) {
        console.log(`documento ${r.id} NON riletto: ${pulisci(e)}`);
      }
    }
    console.log('Modo: REALE');
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) void main(process.argv.slice(2)).catch((e: unknown) => {
  console.error(pulisci(e));
  process.exit(1);
});
