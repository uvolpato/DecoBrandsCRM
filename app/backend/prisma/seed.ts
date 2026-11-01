// Aggregatore del seed: `npm run db:seed`. Una sola transazione per tutto (V13, D-36).
// Si può rilanciare: se i dati di prova ci sono già (fornitore Gries in codici_esterni) si ferma, senza cancellare niente.
import 'dotenv/config';
import { PrismaService } from '../src/prisma.service';
import { base } from './seed/00-base';

export async function seed(db: PrismaService) {
  // utenti con password fissa: mai in esercizio
  if (process.env.NODE_ENV === 'production') throw new Error('Dati di prova: non si caricano in esercizio');
  const c = await db.codici_esterni.findUnique({ where: { sistema_tipo_codice: { sistema: 'integra', tipo: 'fornitore', codice: 'F00031' } } });
  if (c) return false;
  await db.$transaction(async (tx) => { await base(tx); }, { timeout: 120_000, maxWait: 10_000 });
  return true;
}

if (require.main === module) {
  const db = new PrismaService();
  seed(db)
    .then((fatto) => console.log(fatto ? 'Dati di prova caricati.' : 'Dati di prova già presenti (Gries): non faccio niente.'))
    .catch((e) => { console.error(e); process.exitCode = 1; })
    .finally(() => db.$disconnect());
}
