import { ConflictException, Injectable, Logger, OnModuleDestroy, OnModuleInit, PayloadTooLargeException, UnsupportedMediaTypeException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { riceviDocumento, MAX_BYTE } from './documenti';
import { pulisci } from './integra';
import { casellaConfig } from './impostazioni';
import { PrismaService } from './prisma.service';
import { apriAnomalia, chiudiAnomalia } from './registro';

// Casella email dei documenti (F6-A1, §6.5 punti 1–2, §7.14, D-66): legge la cartella IMAP ogni
// N minuti (Impostazioni → Casella), salva gli allegati PDF/foto nella coda comune e sposta le email
// lette nella cartella delle lette. Un solo ingresso dei file: riceviDocumento (documenti.ts), che
// controlla i formati dai primi byte e scarta i doppioni. Tutto dal database (V12), niente pagine.

const log = new Logger('Casella');

/** Configurazione della casella, decifrata da casellaConfig (impostazioni.ts). */
export interface ConfigCasella {
  server: string;
  porta: number;
  utente: string;
  password: string;
  cartella: string;
  cartella_lette: string;
  minuti: number;
}
export interface AllegatoEmail { nome: string; dati: Buffer }
export interface MessaggioEmail {
  uid: number; // UID IMAP: identifica l'email nello spostamento
  da: string;
  oggetto: string;
  allegati: AllegatoEmail[]; // solo allegati veri, non immagini incorporate
  troppoGrande?: number; // dimensione oltre DOCUMENTI_MAX_MB: non scaricata, solo l'anomalia
}
export interface CasellaAperta {
  messaggi: AsyncIterable<MessaggioEmail>;
  sposta(uid: number): Promise<void>; // nella cartella delle lette
  chiudi(): Promise<void>;
}
/** Seam per provare il giro senza un server IMAP (ponytail: il solo punto sostituibile). */
export type ApriCasella = (config: ConfigCasella) => Promise<CasellaAperta>;
export interface EsitoGiro {
  email: number;
  presi: number;
  ignorati: number;
  esito: 'ok' | 'attenzione' | 'errore';
}

// Testi fissi (§7.14.3): mai un messaggio tecnico grezzo (va nel dettaglio e nelle misure).
const TESTO = {
  connessione: 'La casella dei documenti non risponde da 3 giri di fila: verificare server, utente e password in Impostazioni → Casella.',
  cartella: (nome: string) => `La cartella ${nome} non esiste nella casella: crearla o correggere il nome in Impostazioni → Casella.`,
  allegato: (nome: string) => `L'allegato ${nome} non è un PDF né una foto (JPEG, PNG): si scarta; aprire l'email e caricare il documento a mano da Documenti.`,
  troppoGrande: 'Un\'email della casella supera il limite dei documenti: non si scarica; aprire l\'email e caricare il documento a mano da Documenti.',
  vuota: 'Un\'email della casella dei fornitori è arrivata senza allegati: verificare se il documento era nel corpo dell\'email.',
};

/** Cartella IMAP mancante: un errore di tipo cartella, non di connessione (§6.5 punto 1). */
class ErroreCartella extends Error {
  constructor(readonly cartella: string) {
    super(`Cartella IMAP mancante: ${cartella}`);
    this.name = 'ErroreCartella';
  }
}

/** I messaggi della cartella, letti uno alla volta e già trasformati in MessaggioEmail. Prima si
 *  legge solo uid e dimensione (niente corpo), poi si scarica (fetchOne) solo l'email sotto il
 *  limite: un allegato enorme da un mittente qualsiasi non finisce in memoria. */
async function* leggiMessaggi(client: ImapFlow): AsyncIterable<MessaggioEmail> {
  const elenco: { uid: number; size?: number }[] = [];
  for await (const m of client.fetch('1:*', { uid: true, size: true })) {
    elenco.push({ uid: m.uid, size: m.size });
  }
  for (const m of elenco) {
    if ((m.size ?? 0) > MAX_BYTE) {
      yield { uid: m.uid, da: '', oggetto: '', allegati: [], troppoGrande: m.size ?? 0 };
      continue;
    }
    const msg = await client.fetchOne(String(m.uid), { source: true }, { uid: true });
    if (!msg || !msg.source) continue;
    const parsed = await simpleParser(msg.source);
    const allegati: AllegatoEmail[] = [];
    for (const a of parsed.attachments ?? []) {
      if (!a.filename || a.cid || a.related) continue; // le immagini incorporate nei loghi non sono documenti
      if (!a.content || !Buffer.isBuffer(a.content)) continue;
      allegati.push({ nome: a.filename, dati: a.content });
    }
    yield {
      uid: m.uid,
      da: parsed.from?.value?.[0]?.address ?? '',
      oggetto: parsed.subject ?? '',
      allegati,
    };
  }
}

/** Unico punto che conosce imapflow: apre la cartella e la restituisce da scorrere (§6.5 punto 1).
 *  shortcut: si leggono prima solo uid e dimensione e si scarica (fetchOne) solo l'email sotto il
 *  limite; l'email sotto soglia sta comunque tutta in memoria (`source`), per il download del
 *  singolo allegato si passerà a `bodyStructure`. */
export async function apriImap(config: ConfigCasella): Promise<CasellaAperta> {
  const client = new ImapFlow({
    host: config.server, port: config.porta, secure: config.porta === 993,
    auth: { user: config.utente, pass: config.password }, logger: false,
  });
  let lock: { release(): void } | null = null;
  let chiuso = false;
  const chiudi = async () => {
    if (chiuso) return;
    chiuso = true;
    if (lock) lock.release();
    await client.logout().catch(() => undefined);
    client.close();
  };
  try {
    await client.connect(); // errore = connessione
    const elenco = await client.list(); // errore = connessione
    const nomi = new Set(elenco.map((x) => x.path));
    if (!nomi.has(config.cartella)) throw new ErroreCartella(config.cartella);
    if (!nomi.has(config.cartella_lette)) throw new ErroreCartella(config.cartella_lette);
    lock = await client.getMailboxLock(config.cartella);
    return {
      messaggi: leggiMessaggi(client),
      sposta: async (uid) => { await client.messageMove(uid, config.cartella_lette, { uid: true }); },
      chiudi,
    };
  } catch (e) {
    await chiudi();
    throw e;
  }
}

/** `casella.connessione` solo al terzo giro fallito di fila, si chiude al primo riuscito (§7.14.3). */
async function controllaConnessione(db: PrismaService, ora: Date) {
  const ultime = await db.servizi_esecuzioni.findMany({
    where: { servizio: 'casella', tipo: 'lavoro', esito: { not: null }, misure: { path: ['connessione'], equals: false } },
    orderBy: [{ inizio: 'desc' }, { id: 'desc' }],
    take: 3,
    select: { esito: true },
  });
  if (ultime.length === 3) {
    await apriAnomalia(db, {
      servizio: 'casella', codice: 'casella.connessione', messaggio: TESTO.connessione, dettaglio: { errore: 'casella non raggiungibile' },
    }, ora);
  }
}

/** Un giro: apre la casella, scorre i messaggi uno alla volta e sposta ogni email lavorata (§6.5 punti 1–2).
 *  I doppioni (ConflictException) contano fra gli ignorati, senza errore; Excel/.msg e file oltre il
 *  limite aprono `casella.allegato`; un'email senza allegati apre `casella.vuota`. Ritorna l'esito, non lancia. */
export async function giroCasella(db: PrismaService, config: ConfigCasella, apri: ApriCasella = apriImap, ora = new Date()): Promise<EsitoGiro> {
  const esecuzione = await db.servizi_esecuzioni.create({
    data: { servizio: 'casella', tipo: 'lavoro', inizio: ora, avviato_da: null },
  });
  let esito: EsitoGiro['esito'] = 'ok';
  let nota = '';
  let email = 0, presi = 0, ignorati = 0;
  let connessioneKo = false;
  let cartellaKo: string | null = null;
  try {
    let casella: CasellaAperta;
    try {
      casella = await apri(config);
    } catch (e) {
      const cartella = (e as { cartella?: unknown }).cartella; // classe o proprietà `cartella` = cartella mancante (§6.5)
      if (typeof cartella === 'string' && cartella) cartellaKo = cartella;
      else connessioneKo = true;
      throw e;
    }
    try {
      for await (const msg of casella.messaggi) {
        email++;
        // email oltre il limite: non scaricata, resta solo l'anomalia casella.allegato e si sposta
        if (msg.troppoGrande) {
          esito = 'attenzione';
          await apriAnomalia(db, {
            servizio: 'casella', codice: 'casella.allegato', chiave: String(msg.uid), livello: 'attenzione',
            messaggio: TESTO.troppoGrande, dettaglio: { nome: String(msg.uid), errore: `dimensione ${msg.troppoGrande} byte` },
          }, ora);
          await casella.sposta(msg.uid).catch((e) => log.warn(`email ${msg.uid} non spostata: ${pulisci(e)}`));
          continue;
        }
        let vuota = msg.allegati.length === 0;
        for (const a of msg.allegati) {
          try {
            await riceviDocumento(db, { nome: a.nome, dati: a.dati, origine: 'email', email_da: msg.da, email_oggetto: msg.oggetto }, {});
            presi++;
          } catch (e) {
            if (e instanceof ConflictException) {
              ignorati++; // doppione: stesso file già arrivato, nessuna anomalia
            } else if (e instanceof UnsupportedMediaTypeException || e instanceof PayloadTooLargeException) {
              ignorati++;
              esito = 'attenzione';
              await apriAnomalia(db, {
                servizio: 'casella', codice: 'casella.allegato', chiave: a.nome, livello: 'attenzione',
                messaggio: TESTO.allegato(a.nome), dettaglio: { nome: a.nome, errore: pulisci(e) },
              }, ora);
            } else {
              throw e; // errore nostro: non è né un doppione né un allegato scartabile
            }
          }
        }
        // un'email con allegati tutti ignorati non è vuota: resta solo casella.allegato
        if (vuota) {
          esito = 'attenzione';
          await apriAnomalia(db, {
            servizio: 'casella', codice: 'casella.vuota', chiave: msg.oggetto, livello: 'attenzione',
            messaggio: TESTO.vuota, dettaglio: { oggetto: msg.oggetto },
          }, ora);
        }
        try {
          await casella.sposta(msg.uid); // anche con allegati ignorati: non si rilegge al giro dopo (D-60)
        } catch (e) {
          log.warn(`email ${msg.uid} non spostata: ${pulisci(e)}`); // il giro dopo la ritrova, i doppioni si scartano
        }
      }
    } finally {
      await casella.chiudi().catch(() => undefined);
    }
  } catch (e) {
    esito = 'errore';
    nota = pulisci(e);
    log.error(`giro non concluso: ${nota}`);
  }
  if (cartellaKo) {
    await apriAnomalia(db, {
      servizio: 'casella', codice: 'casella.cartella', chiave: cartellaKo,
      messaggio: TESTO.cartella(cartellaKo), dettaglio: { cartella: cartellaKo },
    }, ora);
  } else if (!connessioneKo && esito !== 'errore') {
    await chiudiAnomalia(db, 'casella', 'casella.cartella', config.cartella, ora);
    await chiudiAnomalia(db, 'casella', 'casella.cartella', config.cartella_lette, ora);
  }
  if (!connessioneKo && esito !== 'errore') await chiudiAnomalia(db, 'casella', 'casella.connessione', '', ora);
  // il messaggio tecnico sta in `misure`, mai in `testo` (§7.14.3)
  const misure = { email, allegati: presi, ignorati, connessione: !connessioneKo, ...(nota ? { errore: nota } : {}) };
  const testo = `Email: ${email}, allegati presi: ${presi}, ignorati: ${ignorati}` + (esito === 'errore' ? '; giro non concluso, vedere le misure' : '');
  await db.servizi_esecuzioni.update({
    where: { id: esecuzione.id },
    data: { fine: new Date(), esito, testo: testo.slice(0, 300), misure: misure as unknown as Prisma.InputJsonValue },
  });
  // dopo l'aggiornamento: il conteggio dei 3 giri falliti comprende quello appena chiuso
  if (connessioneKo) await controllaConnessione(db, ora);
  return { email, presi, ignorati, esito };
}

/** Servizio pianificato (ogni 60 s, ma il giro rispetta `minuti`): niente timer nelle prove (§7.14). */
@Injectable()
export class CasellaService implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;
  private inCorso = false;
  private ultimoGiro = 0; // in memoria: al riavvio un giro subito

  constructor(private readonly db: PrismaService) {}

  /** Al riavvio i documenti lasciati `in_lettura` da un processo caduto tornano in coda. */
  async onModuleInit(): Promise<void> {
    await this.db.documenti_in_arrivo.updateMany({ where: { stato: 'in_lettura' }, data: { stato: 'in_coda' } })
      .catch((e: unknown) => log.warn(`documenti in lettura non riportati in coda: ${pulisci(e)}`));
    if (process.env.NODE_ENV === 'test' || this.timer) return;
    this.timer = setInterval(() => void this.forse(), 60_000);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Un giro solo se configurato, non ce n'è già uno in corso e sono passati `minuti` (§6.5 punto 1). */
  async forse(): Promise<void> {
    if (this.inCorso) return;
    try {
      const config = await casellaConfig(this.db);
      if (!config) return;
      if (Date.now() - this.ultimoGiro < config.minuti * 60_000) return;
      this.ultimoGiro = Date.now(); // dall'ultimo inizio (in memoria: al riavvio un giro subito)
      await this.esegui();
    } catch (e) {
      log.warn(`giro della casella non avviato: ${pulisci(e)}`); // il timer non deve mai rifiutare senza gestore
    }
  }

  /** Un giro subito, ignorando l'attesa: è il metodo che usa F5-A5 per *Controlla adesso* (§7.14). */
  async esegui(): Promise<EsitoGiro | null> {
    if (this.inCorso) return null;
    this.inCorso = true;
    try {
      const config = await casellaConfig(this.db);
      if (!config) return null;
      this.ultimoGiro = Date.now();
      return await giroCasella(this.db, config);
    } catch (e) {
      log.warn(`giro non riuscito: ${pulisci(e)}`);
      return null;
    } finally {
      this.inCorso = false;
    }
  }
}
