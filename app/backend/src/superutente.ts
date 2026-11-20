// Crea il superutente all'installazione (§3.3, §4.2.18, D-39): uno solo, con password provvisoria
// mandata per email, da cambiare al primo accesso.
//   npm run superutente -- <nome utente> <email> "<nome e cognome>"
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { cifra, provvisoria } from './password';
import { mandaPassword } from './posta';
import { logEvent } from './registro';

async function crea(argv: string[]) {
  const [username, email, nome] = argv.map((a) => a.trim());
  if (!username || !email || !nome) throw new Error('uso: npm run superutente -- <nome utente> <email> "<nome e cognome>"');
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, options: '-c TimeZone=UTC' }) });
  try {
    if (await db.utenti.findFirst({ where: { ruolo: 'superutente' } })) throw new Error('Il superutente esiste già: ce n\'è uno solo');
    const password = provvisoria();
    // CHECK e indici del database controllano nome utente, email e unicità (§4.2.18)
    const u = await db.$transaction(async (tx) => {
      const u = await tx.utenti.create({
        data: { username: username.toLowerCase(), email: email.toLowerCase(), nome, ruolo: 'superutente', password_hash: await cifra(password) },
      });
      await logEvent(tx, {
        tipo: 'auth', azione: 'password_temp', entita: 'utente', entita_id: u.id, esito: 'successo',
        dettaglio: { etichetta: u.username, tipo: 'benvenuto' },
      });
      return u;
    });
    await mandaPassword(db, u, password, 'benvenuto');
    return { u, password };
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) {
  crea(process.argv.slice(2))
    .then(({ u, password }) => {
      // 20/11/2026: la password provvisoria va anche a video. In un'installazione nuova la posta non e'
      // ancora configurata e l'email non parte: senza questo il primo accesso era impossibile.
      console.log(`Superutente ${u.username} creato.`);
      console.log(`Password provvisoria: ${password}`);
      console.log(`Va cambiata al primo accesso. L'email a ${u.email} parte solo se Posta e' configurata in Impostazioni.`);
    })
    .catch((e: Error) => {
      console.error(e.message);
      process.exit(1);
    });
}

export { crea };
