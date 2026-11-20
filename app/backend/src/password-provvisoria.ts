// Password provvisoria nuova per un utente, stampata a video: serve all'installazione (se l'email non
// parte) e all'assistenza (password dimenticata senza posta configurata).
//   npm run password:provvisoria -- <nome utente>
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { cifra, provvisoria } from './password';
import { logEvent } from './registro';

async function main(argv: string[]) {
  const username = (argv[0] ?? '').trim().toLowerCase();
  if (!username) throw new Error('uso: npm run password:provvisoria -- <nome utente>');
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, options: '-c TimeZone=UTC' }) });
  try {
    const u = await db.utenti.findUnique({ where: { username } });
    if (!u) throw new Error(`Utente ${username} non trovato`);
    const password = provvisoria();
    await db.$transaction(async (tx) => {
      await tx.utenti.update({ where: { id: u.id }, data: { password_hash: await cifra(password), deve_cambiare_password: true } });
      await logEvent(tx, {
        tipo: 'auth', azione: 'password_temp', entita: 'utente', entita_id: u.id, esito: 'successo',
        dettaglio: { etichetta: u.username, tipo: 'assistenza' },
      }, {});
    });
    console.log(`Password provvisoria per ${u.username}: ${password}`);
    console.log('Va cambiata al primo accesso.');
  } finally {
    await db.$disconnect();
  }
}

void main(process.argv.slice(2)).catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
