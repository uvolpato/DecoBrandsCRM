import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// Posta in uscita (§7.14, servizio `posta`). In sviluppo il messaggio va nel log del processo,
// come deciso per i primi passi; l'invio SMTP arriva con Impostazioni → Posta (§7.15).
// ponytail: niente SMTP finché non c'è la casella; quando arriva, solo questa funzione cambia.

const log = new Logger('Posta');

export interface Messaggio {
  a: string;
  oggetto: string;
  testo: string;
}

type Db = Prisma.TransactionClient;

/** Manda un'email e scrive l'esito in utenti.ultimo_invio (§4.2.18). Non lancia mai: un invio
 *  fallito non deve far fallire l'operazione che lo chiede, resta visibile nella scheda dell'utente. */
export async function invia(db: Db, utente_id: bigint, tipo: 'benvenuto' | 'password' | 'reset', m: Messaggio) {
  // il testo (password provvisorie, link) va nel log solo in sviluppo: in produzione mai le credenziali
  log.log(`a ${m.a} · ${m.oggetto}` + (process.env.NODE_ENV === 'production' ? '' : `\n${m.testo}`));
  // con SMTP: errore = risposta del server se l'invio fallisce (anomalia posta.respinta, §7.14)
  await db.utenti
    .update({ where: { id: utente_id }, data: { ultimo_invio: { quando: new Date().toISOString(), tipo, errore: null } } })
    .catch((e: unknown) => log.error(`ultimo_invio non scritto: ${String(e)}`));
}

/** Indirizzo dell'app per i link nelle email (in produzione quello pubblico, dietro Caddy). */
export const indirizzo = () => (process.env.APP_URL ?? 'http://localhost:8001').replace(/\/$/, '');

/** Email con nome utente e password provvisoria: nuovo utente (benvenuto) o *Reimposta la password* (§7.13). */
export const mandaPassword = (db: Db, u: { id: bigint; email: string; nome: string; username: string }, password: string, tipo: 'benvenuto' | 'password') =>
  invia(db, u.id, tipo, {
    a: u.email,
    oggetto: tipo === 'benvenuto' ? 'Decobrands: il tuo accesso' : 'Decobrands: nuova password provvisoria',
    testo: `Ciao ${u.nome},\n\nentra in ${indirizzo()}/accesso con\n  nome utente: ${u.username}\n  password provvisoria: ${password}\n\n` +
      'Al primo accesso ti verrà chiesto di scegliere una nuova password.' +
      (tipo === 'password' ? ' La password di prima non vale più.' : ''),
  });
