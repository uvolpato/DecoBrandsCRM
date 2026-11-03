// Misura dei tempi della pagina Analisi con ~10.000 pratiche (F4-A5). Non è una prova jest.
// Solo su decobrands_test (test/ambiente.ts): copia le pratiche del seed con righe e documenti, misura
// caricaDati + fattiAnalisi e la pagina completa dal database, poi ripulisce.
//   npx ts-node test/carico-analisi.ts
import './ambiente';
import { seed } from '../prisma/seed';
import { AnalisiController } from '../src/analisi';
import { caricaDati } from '../src/motore/dati';
import { fattiAnalisi } from '../src/motore/motore';
import { PrismaService } from '../src/prisma.service';
import { svuota } from './svuota';

const COPIE = 185; // 54 pratiche del seed × 185 ≈ 10.000

async function tempo(f: () => Promise<unknown>) {
  await f(); // riscaldamento
  const ms: number[] = [];
  for (let i = 0; i < 3; i++) { const t = performance.now(); await f(); ms.push(performance.now() - t); }
  return Math.round(Math.min(...ms));
}

async function main() {
  const db = new PrismaService();
  const seminato = await seed(db);
  try {
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
    const controller = new AnalisiController(db);
    const q = { dal: '2025-10', al: '2026-09', raggruppa: 'subagente' as const };
    console.log(`Pratiche: ${n}`);
    console.log(`caricaDati                     ${String(await tempo(() => caricaDati(db))).padStart(6)} ms`);
    console.log(`caricaDati + fattiAnalisi      ${String(await tempo(async () => fattiAnalisi(await caricaDati(db)))).padStart(6)} ms`);
    console.log(`GET /api/analisi (pagina)      ${String(await tempo(() => controller.pagina(q))).padStart(6)} ms`);
    console.log(`GET /api/analisi/esporta xlsx  ${String(await tempo(() => controller.esporta({ ...q, formato: 'xlsx' }, { set: () => undefined } as never))).padStart(6)} ms`);
  } finally {
    await db.ordini_fornitore_testata.deleteMany({ where: { numero_ordine: { contains: '#' } } }); // righe e documenti a cascata
    if (seminato) await svuota(db);
    await db.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
