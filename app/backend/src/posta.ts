import { Logger } from '@nestjs/common';
import { Prisma, type PrismaClient } from '@prisma/client';
import nodemailer, { type Transporter } from 'nodemailer';
import { postaConfig } from './impostazioni';
import { apriAnomalia, chiudiAnomalia } from './registro';

// Posta in uscita (§7.14, §7.15, D-65). Senza server configurato il messaggio va nel log del processo
// (sviluppo); con la configurazione delle Impostazioni si manda con nodemailer, sempre dopo il commit
// (il chiamante lo fa già, D-36). Un invio fallito non deve far fallire l'operazione: l'esito resta in
// utenti.ultimo_invio e il problema apre l'anomalia posta.respinta (destinatario rifiutato) o
// posta.connessione; al primo invio riuscito si chiudono le anomalie dell'indirizzo. Mai lancia.

const log = new Logger('Posta');

export interface Messaggio {
  a: string;
  oggetto: string;
  testo: string;
}

type Db = Prisma.TransactionClient | PrismaClient;
type Config = Awaited<ReturnType<typeof postaConfig>>;

/** Trasporto nodemailer: `secure` (implicit TLS) solo sulla porta 465; altrimenti STARTTLS. */
export function creaTrasporto(c: NonNullable<Config>): Transporter {
  return nodemailer.createTransport({
    host: c.server, port: c.porta, secure: c.porta === 465,
    requireTLS: c.porta !== 465, // le credenziali non viaggiano in chiaro se il server non offre STARTTLS
    auth: { user: c.utente, pass: c.password },
  });
}

const pulisci = (e: unknown) => String(e instanceof Error ? e.message : e).replace(/[\r\n]+/g, ' ').slice(0, 300);

/** Il destinatario è stato rifiutato (indirizzo inesistente), non un problema di connessione. */
const rifiutato = (e: unknown) => {
  const codice = (e as { responseCode?: number }).responseCode ?? (e as { code?: string }).code;
  const testo = String(e instanceof Error ? e.message : e).toLowerCase();
  return codice === 550 || codice === 551 || codice === 553 || /(recipient|rcpt|mailbox|user unknown|no such user)/.test(testo);
};

/** Manda un'email e scrive l'esito in utenti.ultimo_invio (§4.2.18). Non lancia mai. */
export async function invia(db: Db, utente_id: bigint, tipo: 'benvenuto' | 'password' | 'reset', m: Messaggio, trasportoFinto?: Transporter) {
  const esito = { quando: new Date().toISOString(), tipo, errore: null as string | null };
  try {
    const c = await postaConfig(db);
    if (c) {
      const trasporto = trasportoFinto ?? creaTrasporto(c);
      await trasporto.sendMail({ from: c.mittente || c.utente, to: m.a, subject: m.oggetto, text: m.testo });
      await chiudiAnomalia(db, 'posta', 'posta.respinta', m.a);
      await chiudiAnomalia(db, 'posta', 'posta.connessione', '');
    } else {
      // il testo (password provvisorie, link) va nel log solo in sviluppo: mai le credenziali altrove
      log.log(`a ${m.a} · ${m.oggetto}` + (process.env.NODE_ENV === 'development' ? `\n${m.testo}` : ''));
    }
    await db.utenti.update({ where: { id: utente_id }, data: { ultimo_invio: esito } }).catch((e: unknown) => log.error(`ultimo_invio non scritto: ${String(e)}`));
  } catch (e) {
    esito.errore = pulisci(e);
    const respinta = rifiutato(e);
    try {
      await apriAnomalia(db, {
        servizio: 'posta', codice: respinta ? 'posta.respinta' : 'posta.connessione', chiave: respinta ? m.a : '',
        messaggio: respinta
          ? `L'email a ${m.a} non è partita: indirizzo rifiutato dal server di posta.`
          : 'La posta in uscita non risponde: controllare server e password in Impostazioni → Posta.',
        dettaglio: { destinatario: m.a, errore: esito.errore },
      });
    } catch (e2) {
      log.error(`anomalia posta non scritta: ${String(e2)}`);
    }
    await db.utenti.update({ where: { id: utente_id }, data: { ultimo_invio: esito } }).catch(() => undefined);
    log.error(`invio a ${m.a} non riuscito: ${esito.errore}`);
  }
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
