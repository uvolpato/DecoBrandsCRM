// Misura dei tempi di GET /api/pratiche e /api/pratiche/:id con ~10.000 pratiche (D-52 §19). Non è una
// prova jest. Solo su decobrands_test (test/ambiente.ts): copia le pratiche del seed con righe e documenti,
// misura le letture nuove e le vecchie in memoria (caricaDati + motore), poi ripulisce.
//   npx ts-node test/carico-pratiche.ts
import './ambiente';
import { Prisma } from '@prisma/client';
import { seed } from '../prisma/seed';
import { caricaDati } from '../src/motore/dati';
import { abbinamento, haVariazioni, importoPratica, statoPratica } from '../src/motore/motore';
import { PraticheController, dettaglioPratica } from '../src/pratiche';
import { PrismaService } from '../src/prisma.service';
import { svuota } from './svuota';

const COPIE = 185; // 54 pratiche del seed × 185 ≈ 10.000

/** La versione di prima (commit 3b67f89), ridotta al lavoro che pesa: tutto in memoria. */
async function vecchia(db: PrismaService, q: { fornitori?: string; ordina?: string; dir?: string }) {
  const S = await caricaDati(db);
  const nome = (id: string) => S.fornitori.get(id)?.nome ?? '';
  const base = S.pratiche.filter((p) => !q.fornitori || q.fornitori.split(',').includes(p.fornitore_id));
  const conti = base.map((p) => ({ p, s: statoPratica(S, p).chiave, v: haVariazioni(p), sub: abbinamento(S, p.cliente_id, p.fornitore_id, p.data), n: nome(p.fornitore_id) }));
  const valore = (x: (typeof conti)[number]) => (q.ordina === 'importo' ? Number(importoPratica(x.p)) : x.s);
  const ordinate = conti.sort((a, b) => { const x = valore(a), y = valore(b); return (typeof x === 'number' ? x - (y as number) : String(x).localeCompare(String(y), 'it')) || a.p.numero.localeCompare(b.p.numero, 'it'); });
  return ordinate.slice(0, 25).map((x) => ({ ...x, importo: importoPratica(x.p) }));
}

async function tempo(f: () => Promise<unknown>) {
  await f(); // riscaldamento
  const ms: number[] = [];
  for (let i = 0; i < 3; i++) { const t = performance.now(); await f(); ms.push(performance.now() - t); }
  return Math.round(Math.min(...ms));
}

async function main() {
  const db = new PrismaService();
  const seminato = await seed(db); // se il database di prova è vuoto, alla fine si svuota di nuovo
  const nuova = new PraticheController(db);
  // dettaglio: una pratica senza fattura e una con fattura (questa legge anche le pratiche dello stesso mese, D-27)
  const [senza, con] = await Promise.all([false, true].map(async (f) => Number((await db.ordini_fornitore_testata.findFirstOrThrow({
    where: { documenti: f ? { some: { tipo: 'fattura' } } : { none: { tipo: { in: ['fattura', 'nota_credito'] } } } }, orderBy: { id: 'asc' }, select: { id: true } })).id)));
  const dettagli = async () => {
    for (const [nome, id] of [['dettaglio senza fatt.', senza], ['dettaglio con fattura', con]] as const) {
      const prima = await tempo(async () => dettaglioPratica(await caricaDati(db), String(id)));
      const dopo = await tempo(() => nuova.dettaglio(id));
      console.log(`${nome.padEnd(20)} vecchia ${String(prima).padStart(6)} ms   nuova ${String(dopo).padStart(5)} ms`);
    }
  };
  try {
    console.log(`Pratiche: ${await db.ordini_fornitore_testata.count()}`);
    await dettagli();
    await db.$transaction(async (tx) => {
      await tx.$executeRaw`CREATE TEMP TABLE copie ON COMMIT DROP AS
        SELECT t.id AS vecchio, n, nextval(pg_get_serial_sequence('ordini_fornitore_testata', 'id')) AS nuovo
        FROM ordini_fornitore_testata t, generate_series(1, ${COPIE}) n`;
      await tx.$executeRaw`INSERT INTO ordini_fornitore_testata (id, fornitore_id, fornitore_versione_id, numero_ordine, data_ordine, cliente_id,
          cliente_versione_id, agente_id, importo_merce, stato, importo, variazioni, variazione)
        SELECT c.nuovo, t.fornitore_id, t.fornitore_versione_id, t.numero_ordine || '#' || c.n, t.data_ordine, t.cliente_id,
          t.cliente_versione_id, t.agente_id, t.importo_merce, t.stato, t.importo, t.variazioni, t.variazione
        FROM copie c JOIN ordini_fornitore_testata t ON t.id = c.vecchio`;
      await tx.$executeRaw`INSERT INTO ordini_fornitore_righe (testata_id, fase, numero_riga, codice, descrizione, um, quantita, prezzo_unitario, importo)
        SELECT c.nuovo, r.fase, r.numero_riga, r.codice, r.descrizione, r.um, r.quantita, r.prezzo_unitario, r.importo
        FROM copie c JOIN ordini_fornitore_righe r ON r.testata_id = c.vecchio`;
      await tx.$executeRaw`INSERT INTO ordini_fornitore_documenti (testata_id, tipo, numero, data, importo)
        SELECT c.nuovo, d.tipo, d.numero || '#' || c.n, d.data, d.importo
        FROM copie c JOIN ordini_fornitore_documenti d ON d.testata_id = c.vecchio`;
    }, { timeout: 120_000 });
    await db.$executeRaw`ANALYZE ordini_fornitore_testata`;
    const n = await db.ordini_fornitore_testata.count();
    const gries = String((await db.fornitori_versioni.findFirstOrThrow({ where: { ragione_sociale: { startsWith: 'Gries' } } })).fornitore_id);

    const casi: [string, Record<string, string>][] = [
      ['prima pagina', {}],
      ['filtro fornitore', { fornitori: gries }],
      ['ordina per importo', { ordina: 'importo', dir: 'desc' }],
    ];
    console.log(`Pratiche: ${n}`);
    for (const [nome, q] of casi) {
      const prima = await tempo(() => vecchia(db, q));
      const dopo = await tempo(() => nuova.elenco(q as Parameters<PraticheController['elenco']>[0]));
      console.log(`${nome.padEnd(20)} vecchia ${String(prima).padStart(6)} ms   nuova ${String(dopo).padStart(5)} ms`);
    }
    await dettagli();
  } finally {
    await db.ordini_fornitore_testata.deleteMany({ where: { numero_ordine: { contains: '#' } } }); // righe e documenti a cascata
    if (seminato) await svuota(db);
    await db.$disconnect();
  }
}

main().catch((e: Prisma.PrismaClientKnownRequestError | Error) => { console.error(e); process.exitCode = 1; });
