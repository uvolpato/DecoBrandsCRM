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
  testo: string; // sempre: i client che non leggono l'HTML mostrano questo
  html?: string;
}

type Db = Prisma.TransactionClient | PrismaClient;
type Config = Awaited<ReturnType<typeof postaConfig>>;

/** Testo per l'HTML: il nome utente e il nome arrivano dal database, non si fidano di niente. */
const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export interface ModelloMail {
  titolo: string;
  paragrafi: string[]; // testo semplice: si escapa qui
  dati?: [string, string][]; // etichette e valori in un riquadro grigio (nome utente, password)
  azione?: { testo: string; href: string };
  nota?: string; // in piccolo e grigio, in fondo
}

/** L'email in HTML con lo stile dell'app (§7.0, D-211): fondo grigio come l'app, scheda bianca con i
 *  bordi, logo in cima, pulsante del colore primario e piede con copyright. Stili in linea (i client
 *  di posta scartano i fogli di stile); il logo è quello del portale, servito da APP_URL. */
export function modelloMail({ titolo, paragrafi, dati, azione, nota }: ModelloMail) {
  const font = "font-family:'Public Sans',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
  const righe = (dati ?? []).map(([k, v]) =>
    `<tr><td style="padding:3px 16px 3px 0;color:#6c757d;${font};font-size:13.5px">${esc(k)}</td>` +
    `<td style="padding:3px 0;color:#212529;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:13.5px;font-weight:600">${esc(v)}</td></tr>`).join('');
  return `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titolo)}</title></head>
<body style="margin:0;padding:24px 12px;background:#f5f6f8;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f5f6f8;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;max-width:560px;background:#ffffff;border:1px solid #dee2e6;border-radius:8px;">
    <tr><td style="padding:20px 24px 0"><img src="${indirizzo()}/logo-decobrands.png" alt="Decobrands" width="168" style="display:block;border:0"></td></tr>
    <tr><td style="padding:18px 24px 24px;${font};font-size:14px;line-height:1.55;color:#212529">
      <h1 style="margin:0 0 12px;${font};font-size:18px;line-height:1.3;color:#212529">${esc(titolo)}</h1>
      ${paragrafi.map((p) => `<p style="margin:0 0 12px">${esc(p)}</p>`).join('\n      ')}
      ${righe ? `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:2px 0 16px"><tr><td style="padding:12px 16px;background:#f5f6f8;border:1px solid #dee2e6;border-radius:6px">
        <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${righe}</table></td></tr></table>` : ''}
      ${azione ? `<p style="margin:4px 0 16px"><a href="${esc(azione.href)}" style="display:inline-block;background:#0d6efd;color:#ffffff;text-decoration:none;padding:9px 18px;border-radius:6px;font-weight:600">${esc(azione.testo)}</a></p>` : ''}
      ${nota ? `<p style="margin:0;color:#6c757d;font-size:12.5px">${esc(nota)}</p>` : ''}
    </td></tr>
    <tr><td style="padding:14px 24px;border-top:1px solid #e9ecef;${font};font-size:12px;color:#6c757d">© Decobrands S.r.l. · Sistema Informativo Aziendale · messaggio automatico</td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

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

/** Spedisce e apre/chiude le anomalie della posta; non scrive ultimo_invio né lancia mai. Torna il testo
 *  dell'errore (o null se partita). */
async function spedisci(db: Db, m: Messaggio, trasportoFinto?: Transporter): Promise<string | null> {
  try {
    const c = await postaConfig(db);
    if (c) {
      const trasporto = trasportoFinto ?? creaTrasporto(c);
      await trasporto.sendMail({ from: c.mittente || c.utente, to: m.a, subject: m.oggetto, text: m.testo, ...(m.html ? { html: m.html } : {}) });
      await chiudiAnomalia(db, 'posta', 'posta.respinta', m.a);
      await chiudiAnomalia(db, 'posta', 'posta.connessione', '');
    } else {
      // il testo (password provvisorie, link) va nel log solo in sviluppo: mai le credenziali altrove
      log.log(`a ${m.a} · ${m.oggetto}` + (process.env.NODE_ENV === 'development' ? `\n${m.testo}` : ''));
    }
    return null;
  } catch (e) {
    const errore = pulisci(e);
    const respinta = rifiutato(e);
    try {
      await apriAnomalia(db, {
        servizio: 'posta', codice: respinta ? 'posta.respinta' : 'posta.connessione', chiave: respinta ? m.a : '',
        messaggio: respinta
          ? `L'email a ${m.a} non è partita: indirizzo rifiutato dal server di posta.`
          : 'La posta in uscita non risponde: controllare server e password in Impostazioni → Posta.',
        dettaglio: { destinatario: m.a, errore },
      });
    } catch (e2) {
      log.error(`anomalia posta non scritta: ${String(e2)}`);
    }
    log.error(`invio a ${m.a} non riuscito: ${errore}`);
    return errore;
  }
}

/** Manda un'email e scrive l'esito in utenti.ultimo_invio (§4.2.18). Non lancia mai. */
export async function invia(db: Db, utente_id: bigint, tipo: 'benvenuto' | 'password' | 'reset', m: Messaggio, trasportoFinto?: Transporter) {
  const esito = { quando: new Date().toISOString(), tipo, errore: null as string | null };
  esito.errore = await spedisci(db, m, trasportoFinto);
  await db.utenti.update({ where: { id: utente_id }, data: { ultimo_invio: esito } }).catch((e: unknown) => log.error(`ultimo_invio non scritto: ${String(e)}`));
}

/** Indirizzo dell'app per i link nelle email (in produzione quello pubblico, dietro Caddy). */
export const indirizzo = () => (process.env.APP_URL ?? 'http://localhost:8001').replace(/\/$/, '');

/** Email con nome utente e password provvisoria: nuovo utente (benvenuto) o *Reimposta la password* (§7.13). */
export function messaggioPassword(u: { email: string; nome: string; username: string }, password: string, tipo: 'benvenuto' | 'password'): Messaggio {
  const dopo = 'Al primo accesso ti verrà chiesto di scegliere una nuova password.' + (tipo === 'password' ? ' La password di prima non vale più.' : '');
  return {
    a: u.email,
    oggetto: tipo === 'benvenuto' ? 'Decobrands: il tuo accesso' : 'Decobrands: nuova password provvisoria',
    testo: `Ciao ${u.nome},\n\nentra in ${indirizzo()}/accesso con\n  nome utente: ${u.username}\n  password provvisoria: ${password}\n\n${dopo}`,
    html: modelloMail({
      titolo: tipo === 'benvenuto' ? 'Il tuo accesso al portale' : 'Nuova password provvisoria',
      paragrafi: [`Ciao ${u.nome},`, tipo === 'benvenuto'
        ? 'il tuo utente è pronto: entra nel portale con i dati qui sotto.'
        : 'è stata preparata una nuova password provvisoria per il tuo utente.'],
      dati: [['Nome utente', u.username], ['Password provvisoria', password]],
      azione: { testo: 'Entra nel portale', href: `${indirizzo()}/accesso` },
      nota: dopo,
    }),
  };
}
export const mandaPassword = (db: Db, u: { id: bigint; email: string; nome: string; username: string }, password: string, tipo: 'benvenuto' | 'password') =>
  invia(db, u.id, tipo, messaggioPassword(u, password, tipo));

/** Link monouso di un'ora per scegliere una nuova password (*Password dimenticata*, §3.3, D-39). */
export function messaggioLinkReset(nome: string, codice: string, a: string): Messaggio {
  return {
    a,
    oggetto: 'Decobrands: reimposta la password',
    testo: `Ciao ${nome},\n\nper scegliere una nuova password apri questo link entro un'ora:\n${indirizzo()}/accesso/password/${codice}\n\n` +
      "Se non l'hai chiesto tu, ignora questa email: la password resta quella di prima.",
    html: modelloMail({
      titolo: 'Scegli una nuova password',
      paragrafi: [`Ciao ${nome},`, 'il link qui sotto vale un’ora e una volta sola.'],
      azione: { testo: 'Scegli la nuova password', href: `${indirizzo()}/accesso/password/${codice}` },
      nota: "Se non l'hai chiesto tu, ignora questa email: la password resta quella di prima.",
    }),
  };
}

/** Avviso al vecchio indirizzo quando l'email di un utente cambia (D-117): nome utente dell'account
 *  cambiato, chi l'ha fatto e quando (ora di Roma, C2), senza rivelare il nuovo indirizzo. Non scrive
 *  ultimo_invio (quello è per le password); un invio fallito apre la solita anomalia posta e non annulla
 *  la modifica. */
export function messaggioEmailCambiata(vecchio: string, utente: { username: string }, da: { nome: string }, quando: Date): Messaggio {
  const testo = `L'email del tuo utente ${utente.username} nel CRM Decobrands è stata cambiata il ${quando.toLocaleString('it-IT', { timeZone: 'Europe/Rome' })} da ${da.nome}.\n` +
    'Se non l\'hai chiesto tu, avvisa il superutente.';
  return {
    a: vecchio,
    oggetto: 'Decobrands: email del tuo utente cambiata',
    testo,
    html: modelloMail({
      titolo: 'Email del tuo utente cambiata',
      paragrafi: [`L'email del tuo utente ${utente.username} nel portale è stata cambiata il ${quando.toLocaleString('it-IT', { timeZone: 'Europe/Rome' })} da ${da.nome}.`],
      nota: "Se non l'hai chiesto tu, avvisa il superutente.",
    }),
  };
}
export const avvisoEmailCambiata = (db: Db, vecchio: string, utente: { username: string }, da: { nome: string }, quando: Date, trasportoFinto?: Transporter) =>
  spedisci(db, messaggioEmailCambiata(vecchio, utente, da, quando), trasportoFinto);
