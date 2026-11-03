// Ricalcola con il motore stato, importo e variazioni salvati su tutte le pratiche (D-52 §19):
// dopo la migrazione 20261103090000 o se una regola del motore cambia.
//   npm run pratiche:ricalcola
import 'dotenv/config';
import { PrismaService } from './prisma.service';
import { aggiornaPratica } from './pratiche';

if (require.main === module) {
  const db = new PrismaService();
  (async () => {
    const pratiche = await db.ordini_fornitore_testata.findMany({ select: { id: true }, orderBy: { id: 'asc' } });
    // una transazione per pratica: aggiornaPratica la blocca solo il tempo del suo calcolo
    for (const { id } of pratiche) await db.$transaction((tx) => aggiornaPratica(tx, id));
    console.log(`Pratiche ricalcolate: ${pratiche.length}.`);
  })()
    .catch((e: Error) => { console.error(e.message); process.exitCode = 1; })
    .finally(() => db.$disconnect());
}
