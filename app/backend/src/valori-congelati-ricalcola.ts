// Ricalcola i valori calcolati e congelati dei documenti fiscali (D-183 §19): i documenti già in un
// bollettino chiuso o in una liquidazione chiusa si congelano con le regole vecchie (interscambio.sconto,
// spese comprese); quelli aperti si calcolano con le regole nuove (sconto medio, spese escluse salvo
// accordo col fornitore). Stampa prima/dopo per pratica e documento. In --prova non scrive.
//   npm run valori:congelati -- [--prova]
// Non lanciarlo su decobrands_db senza una copia di sicurezza: lo lancia Claude Code.
import 'dotenv/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';
import { caricaDati, type CalcoloDocumento, type Dati } from './motore/dati';
import { abbinamento, calcoloDocumento, REGOLA_CALCOLO, r2 } from './motore/motore';

const Dec = Prisma.Decimal;
const n = (x: Prisma.Decimal | null | undefined) => (x == null ? null : Number(x));

/** La vecchia regola (prima di D-183): lo scaglione con la soglia più alta ≤ sconto dell'agenzia. */
function scaglioneVecchio(S: Dati, fornitore_id: string, sconto: Prisma.Decimal, data: string) {
  const perSoglia = new Map<string, Dati['scaglioni'][number]>();
  for (const s of S.scaglioni) {
    if (s.fornitore_id !== fornitore_id || s.valido_dal > data) continue;
    const k = s.sconto.toString(), x = perSoglia.get(k);
    if (!x || x.valido_dal < s.valido_dal) perSoglia.set(k, s);
  }
  return [...perSoglia.values()].filter((s) => s.sconto.lte(sconto)).sort((a, b) => a.sconto.comparedTo(b.sconto)).pop() ?? null;
}

type P = Dati['pratiche'][number];
type D = P['documenti'][number];

/** Il documento è già chiuso? In una liquidazione o in un bollettino verificato/contestato. */
function congelato(S: Dati, d: D) {
  if (d.liquidazione_id) return true;
  return S.bollettini.some((b) => b.stato !== 'da_verificare' && b.righe.some((r) => r.documento_id === d.id));
}

/** Calcolo con le regole di prima di D-183 (spese comprese, scaglione dallo sconto dell'agenzia). */
function calcoloVecchio(S: Dati, p: P, d: D): CalcoloDocumento {
  const ab = abbinamento(S, p.cliente_id, p.fornitore_id, p.data);
  const sc = ab ? scaglioneVecchio(S, p.fornitore_id, ab.sconto, d.data) : null;
  const base = d.importo; // spese comprese
  return {
    base: base.toFixed(2), spese: '0.00', netto: base.toFixed(2),
    sconto_medio: null,
    scaglione: sc ? sc.sconto.toFixed(2) : null,
    pct_agente: sc ? sc.pct_agente.toFixed(2) : null,
    pct_subagente: sc ? sc.pct_sub.toFixed(2) : null,
    provvigione_agente: sc ? r2(base.times(sc.pct_agente).div(100)).toFixed(2) : null,
    provvigione_subagente: sc ? r2(base.times(sc.pct_sub).div(100)).toFixed(2) : null,
    regola: 'sconto-agenzia-v0',
  };
}

const stampa = (c: CalcoloDocumento | null) => (c == null ? '—'
  : `base ${c.base} · spese ${c.spese} · sconto medio ${c.sconto_medio ?? '—'} · scaglione ${c.scaglione ?? '—'} · agente ${c.provvigione_agente ?? '—'} · sub ${c.provvigione_subagente ?? '—'}`);

async function main(argv: string[]) {
  const PROVA = argv.includes('--prova');
  const db = new PrismaService();
  try {
    const S = await caricaDati(db);
    const righe: string[][] = [['pratica', 'documento', 'prima → dopo']];
    let congelati = 0, aperti = 0;
    for (const p of S.pratiche) {
      for (const d of p.documenti) {
        const chiuso = congelato(S, d);
        const dopo = chiuso ? calcoloVecchio(S, p, d) : calcoloDocumento(S, p, d);
        righe.push([p.numero, d.numero, `${stampa(d.calcolo)}  →  ${stampa(dopo)}`]);
        if (chiuso) congelati++; else aperti++;
        if (!PROVA) {
          const data: Prisma.InputJsonValue = { calcolo: dopo as unknown as Prisma.InputJsonValue, ...(chiuso && !d.congelato_il ? { congelato_il: new Date() } : {}) };
          await db.ordini_fornitore_documenti.update({ where: { id: BigInt(d.id) }, data });
        }
      }
    }
    const lar = righe.reduce((acc, r) => r.map((c, i) => Math.max(acc[i] ?? 0, c.length)), new Array<number>(righe[0].length).fill(0));
    for (const r of righe) console.log(r.map((c, i) => c.padEnd(lar[i])).join('  '));
    console.log(`\nCongelati (regole vecchie): ${congelati} · Aperti (regole nuove): ${aperti}`);
    console.log(`Regola nuova: ${REGOLA_CALCOLO}`);
    console.log(`Modo: ${PROVA ? 'prova (nessuna scrittura)' : 'REALE'}`);
  } finally {
    await db.$disconnect();
  }
}

void main(process.argv.slice(2)).catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
