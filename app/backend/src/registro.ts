import { Logger } from '@nestjs/common';
import { Prisma, type PrismaClient } from '@prisma/client';

// Registro unico (§4.2.11, §15, D-31). Un solo helper per gli eventi: lo chiama il server,
// mai il client. Dentro un'operazione si passa `tx`, così l'evento sparisce con il rollback (V13).

type Db = Prisma.TransactionClient | PrismaClient;

/** Chi ha fatto l'operazione: dalla sessione e dalla richiesta, mai dal corpo (§15.3). */
export interface Contesto {
  utente_id?: bigint | null;
  sessione_id?: string;
  ip?: string;
}

export interface Evento {
  tipo: string;
  azione: string;
  entita: string;
  entita_id?: bigint | null;
  esito: 'successo' | 'errore' | 'negato';
  dettaglio: { etichetta: string } & Record<string, unknown>;
  operazione_id?: string;
}

// Chiavi obbligatorie del dettaglio per codice (§15.2, §15.4). Un codice nuovo si aggiunge qui
// insieme alla rotta che lo genera; un codice assente è un errore.
// ponytail: solo le chiavi presenti, non i tipi; zod quando servirà controllare i tipi.
export const SCHEMI: Record<string, string[]> = {
  'auth.login': ['modo'],
  'auth.logout': [],
  'auth.password_change': [],
  'auth.password_reset_requested': [],
  'auth.password_reset': [],
  'auth.password_temp': ['tipo'],
  'auth.access_denied': ['rotta', 'metodo'],
  // utenti (§15.2.8)
  'crud.create': [],
  'crud.update': ['prima', 'dopo'],
  'crud.delete': [],
  'stato.change_state': ['prima', 'dopo'],
  // bollettini (§15.2.5)
  'calcolo.verify': ['bollettino_id', 'periodo', 'importo_riconosciuto', 'importo_calcolato', 'differenza_totale'],
  'errore.error': ['rotta', 'metodo', 'http_status', 'errore'],
  // documenti (§15.2.4, F2-A3). L'esito `errore` (lettura fallita, §15.2.4) ha tentativi ed errore
  // al posto di dimensione e origine: restano solo le chiavi sempre presenti.
  'documento.upload': ['documento_id', 'file_nome'],
  'documento.create': ['pratica_id', 'documento_id', 'tipo', 'numero', 'data', 'importo', 'storno_totale', 'fattura_id'],
  'documento.update': ['documento_id', 'pratica_id', 'prima', 'dopo'],
  'documento.delete': ['documento_id', 'pratica_id', 'tipo', 'numero', 'importo'],
  'documento.match': ['documento_id', 'arrivo_id', 'pratica_id', 'tipo'], // abbinamento a mano di un file in coda (D-60)
  'documento.move': ['documento_id', 'tipo', 'prima', 'dopo'], // documento spostato in un'altra pratica (D-60)
  'documento.stato': ['documento_id', 'prima', 'dopo'], // cambio di stato della coda (in_coda → in_lettura → letto, D-164 §19)
  'documento.export': ['fatture', 'importo_totale', 'solleciti'], // sollecito di pagamento copiato al cliente (§5.14)
  'export.export': ['etichetta', 'periodo', 'scelta', 'formato', 'n_righe', 'importo_totale'], // esportazione di un prospetto (§15.2.6); `subagente` quando è di uno solo
  'export.sollecito': ['pratiche'], // sollecito di conferma copiato per un fornitore (§7.1): etichetta = fornitore, `pratiche` = numeri
  // sincronizzazione da Integra (§7.14.3): anomalie, non eventi
  'integra.connessione': ['errore'],
  'integra.vista': ['vista', 'errore'],
  'integra.piva_mancante': ['codice', 'piva'],
  'integra.piva_doppia': ['piva'],
  'integra.riga': ['vista', 'id_integra', 'errore'],
  'integra.lenta': ['secondi'],
  // casella dei documenti e lettura (§7.14.3): anomalie, non eventi
  'casella.connessione': ['errore'],
  'casella.cartella': ['cartella'],
  'casella.allegato': ['nome', 'errore'],
  'casella.vuota': ['oggetto'],
  'lettura.fallita': ['documento_id', 'errore'],
  // registro stesso (§15.4): un dettaglio che non rispetta lo schema del codice
  'app.dettaglio_non_valido': [],
};

/** Anomalia del registro (§4.2.11, D-31): una per chiave finché resta aperta; si ripete e si chiude. */
export interface Anomalia {
  servizio: string;
  codice: string;
  chiave?: string;
  messaggio: string;
  livello?: 'errore' | 'attenzione';
  dettaglio?: Record<string, unknown>;
}

const log = new Logger('Registro');

/** Controlla che il dettaglio rispetti lo schema del codice (§15.4, D-31) e restituisce l'errore
 *  (undefined se valido). Un esito `errore` porta `errore` al posto delle chiavi del successo (§15.2.7). */
function controlla(codice: string, esito: Evento['esito'], dettaglio: Record<string, unknown>): string | undefined {
  const chiavi = SCHEMI[codice];
  if (chiavi === undefined) return `registro: dettaglio non valido per ${codice} (codice sconosciuto)`;
  // il campo `errore` prende il posto delle chiavi del successo solo per un esito non riuscito
  // (errore o rifiuto): un successo con `errore` nel dettaglio resta soggetto allo schema (C2).
  const erroreAlPosto = esito !== 'successo' && dettaglio.errore !== undefined && !chiavi.includes('errore');
  const richieste = erroreAlPosto ? ['etichetta'] : ['etichetta', ...chiavi];
  const mancano = richieste.filter((k) => dettaglio[k] === undefined);
  if (!mancano.length) return;
  return `registro: dettaglio non valido per ${codice}: mancano ${mancano.join(', ')}`;
}

/** Scrive un evento. Dentro un'operazione: `logEvent(tx, …)`, stessa transazione (§15.3, V13). */
export async function logEvent(db: Db, e: Evento, ctx: Contesto = {}) {
  const codice = `${e.tipo}.${e.azione}`;
  const errore = controlla(codice, e.esito, e.dettaglio);
  if (errore && process.env.NODE_ENV === 'test') throw new Error(errore); // nelle prove si ferma subito (§15.4)
  const conIp = e.tipo === 'auth' || e.esito === 'negato'; // solo l'IP qui (§15.1); la sessione non si salva più
  const riga = await db.registro.create({
    data: {
      genere: 'evento',
      livello: e.esito === 'successo' ? 'info' : e.esito === 'negato' ? 'attenzione' : 'errore',
      codice,
      tipo: e.tipo,
      azione: e.azione,
      entita: e.entita,
      entita_id: e.entita_id ?? null,
      esito: e.esito,
      dettaglio: e.dettaglio as Prisma.InputJsonValue,
      utente_id: ctx.utente_id ?? null,
      operazione_id: e.operazione_id,
      sessione_id: null,
      ip: conIp ? ctx.ip : null,
    },
  });
  if (errore) {
    // in esercizio la riga si scrive lo stesso e si apre l'anomalia (§15.4, A8-03)
    await apriAnomalia(db, { servizio: 'app', codice: 'app.dettaglio_non_valido', chiave: codice, messaggio: errore });
  }
  return riga;
}

/** Per gli eventi senza transazione (accesso, negato, errori): il log non fa mai fallire l'operazione (§15.3). */
export async function logEventSicuro(db: Db, e: Evento, ctx: Contesto = {}) {
  try {
    await logEvent(db, e, ctx);
  } catch (err) {
    if (process.env.NODE_ENV === 'test') throw err; // nelle prove un evento sbagliato si vede
    log.error(`evento ${e.tipo}.${e.azione} non scritto`, err instanceof Error ? err.stack : String(err));
  }
}

/** Apre (o ripete) un'anomalia. Resta una sola riga aperta per servizio/codice/chiave. */
export async function apriAnomalia(db: Db, a: Anomalia, ora = new Date()) {
  const chiave = a.chiave ?? '';
  const livello = a.livello ?? 'errore';
  const dettaglio = JSON.stringify(a.dettaglio ?? {});
  // un solo INSERT … ON CONFLICT: due aperture insieme non si rompono a vicenda (A3-09, D-31)
  await db.$executeRaw`
    INSERT INTO registro (genere, livello, codice, servizio, chiave, messaggio, dettaglio, stato, ultimo)
    VALUES ('anomalia', ${livello}, ${a.codice}, ${a.servizio}, ${chiave}, ${a.messaggio}, ${dettaglio}::jsonb, 'aperta', ${ora})
    ON CONFLICT ((COALESCE(servizio, '')), codice, (COALESCE(chiave, ''))) WHERE genere = 'anomalia' AND stato = 'aperta'
    DO UPDATE SET volte = registro.volte + 1, ultimo = EXCLUDED.ultimo, messaggio = EXCLUDED.messaggio, dettaglio = EXCLUDED.dettaglio
  `;
}

/** Chiude l'anomalia aperta (se c'è) quando il problema sparisce. */
export async function chiudiAnomalia(db: Db, servizio: string, codice: string, chiave = '', ora = new Date()) {
  await db.registro.updateMany({
    where: { genere: 'anomalia', servizio, codice, chiave, stato: 'aperta' },
    data: { stato: 'chiusa', chiusa_il: ora, ultimo: ora },
  });
}

// §15.7: le informazioni restano 12 mesi, il resto `eventi_mesi` dalle Impostazioni (36 se assente).
const INFO_MESI = 12;
const EVENTI_MESI = 36;

const mesiFa = (ora: Date, mesi: number) => {
  const d = new Date(ora);
  d.setMonth(d.getMonth() - mesi);
  return d;
};

/** Pulizia notturna (§15.7), in una transazione (V13): il trigger rende immutabili gli eventi e
 *  accetta le cancellazioni solo con `SET LOCAL decobrands.pulizia_registro = 'si'`. Le anomalie
 *  aperte non si cancellano mai. */
export async function pulisciRegistro(db: PrismaClient, ora = new Date(), eventiMesi = EVENTI_MESI) {
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL decobrands.pulizia_registro = 'si'`;
    await tx.registro.deleteMany({
      where: { genere: 'evento', livello: 'info', ts: { lt: mesiFa(ora, INFO_MESI) } },
    });
    await tx.registro.deleteMany({
      where: { ts: { lt: mesiFa(ora, eventiMesi) }, NOT: { genere: 'anomalia', stato: 'aperta' } },
    });
  });
}
