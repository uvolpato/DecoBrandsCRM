// Ricalcola sconto medio e scaglione delle pratiche esistenti non in liquidazioni chiuse, e stampa
// prima/dopo (pratica, sconto medio, scaglione, provvigione Decobrands e subagente). In --prova non scrive.
//   npm run sconto:medio -- [--prova]
// Non lanciarlo su decobrands_db senza una copia di sicurezza: lo lancia Claude Code (pacchetto sconto-medio).
import 'dotenv/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';
import { caricaDati, type Dati } from './motore/dati';
import { abbinamento, anomaliaScontoMedio, importoPratica, r2, scaglione, scontoMedio } from './motore/motore';

const Dec = Prisma.Decimal;
const n = (x: Prisma.Decimal | null | undefined) => (x == null ? null : Number(x));
const pct = (x: Prisma.Decimal | null | undefined) => (x == null ? '—' : x.toFixed(2));

/** La vecchia regola (prima di D-182): lo scaglione con la soglia più alta ≤ sconto dell'agenzia. */
function scaglioneVecchio(S: Dati, fornitore_id: string, sconto: Prisma.Decimal, data: string) {
  const perSoglia = new Map<string, Dati['scaglioni'][number]>();
  for (const s of S.scaglioni) {
    if (s.fornitore_id !== fornitore_id || s.valido_dal > data) continue;
    const k = s.sconto.toString(), x = perSoglia.get(k);
    if (!x || x.valido_dal < s.valido_dal) perSoglia.set(k, s);
  }
  return [...perSoglia.values()].filter((s) => s.sconto.lte(sconto)).sort((a, b) => a.sconto.comparedTo(b.sconto)).pop() ?? null;
}

async function main(argv: string[]) {
  const PROVA = argv.includes('--prova');
  const db = new PrismaService();
  try {
    const S = await caricaDati(db);
    const righe: string[][] = [['pratica', 'sconto medio', 'scaglione', 'Decobrands', 'subagente']];
    const cambiate: string[] = [];
    for (const p of S.pratiche) {
      // pratiche con tutti i documenti fiscali già in una liquidazione chiusa: niente da ricalcolare
      const fiscali = p.documenti;
      if (fiscali.length && fiscali.every((d) => d.liquidazione_id)) continue;
      const ab = abbinamento(S, p.cliente_id, p.fornitore_id, p.data);
      if (!ab) continue;
      const data = fiscali[fiscali.length - 1]?.data ?? p.data;
      const sm = scontoMedio(p);
      const vecchio = scaglioneVecchio(S, p.fornitore_id, ab.sconto, data);
      const nuovoSc = sm != null ? scaglione(S, p.fornitore_id, sm, data) : null;
      const anom = anomaliaScontoMedio(S, p);
      const imp = importoPratica(p);
      const agente = (sc: Dati['scaglioni'][number] | null) => (sc ? r2(imp.times(sc.pct_agente).div(100)) : null);
      const subagente = (sc: Dati['scaglioni'][number] | null) => (sc ? r2(imp.times(sc.pct_sub).div(100)) : null);
      const sca = (sc: Dati['scaglioni'][number] | null) => (sc ? sc.sconto.toFixed(2) : anom ? 'da decidere' : '—');
      righe.push([p.numero, sm == null ? 'riserva' : sm.toFixed(2), `${sca(vecchio)} → ${sca(nuovoSc)}`,
        `${agente(vecchio)?.toFixed(2) ?? '—'} → ${agente(nuovoSc)?.toFixed(2) ?? (anom ? 'da decidere' : '—')}`,
        `${subagente(vecchio)?.toFixed(2) ?? '—'} → ${subagente(nuovoSc)?.toFixed(2) ?? (anom ? 'da decidere' : '—')}`]);
      if (anom) cambiate.push(`${p.numero}: anomalia, sconto medio ${anom.sconto_medio.toFixed(2)} % oltre l'ultimo scaglione ${anom.ultimo_scaglione.toFixed(2)} %`);
      else if (vecchio?.sconto.toString() !== nuovoSc?.sconto.toString()) cambiate.push(`${p.numero}: scaglione ${sca(vecchio)} → ${sca(nuovoSc)}`);
    }
    const lar = righe.reduce((acc, r) => r.map((c, i) => Math.max(acc[i] ?? 0, c.length)), new Array<number>(righe[0].length).fill(0));
    for (const r of righe) console.log(r.map((c, i) => c.padEnd(lar[i])).join('  '));
    console.log(`\nPratiche che cambiano: ${cambiate.length}${cambiate.length ? '\n' + cambiate.map((x) => '  ' + x).join('\n') : ''}`);
    console.log(`Modo: ${PROVA ? 'prova (nessuna scrittura)' : 'REALE'}`);
  } finally {
    await db.$disconnect();
  }
}

void main(process.argv.slice(2)).catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
