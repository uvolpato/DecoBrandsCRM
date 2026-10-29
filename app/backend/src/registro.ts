import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// Registro unico (§4.2.11, §15, D-31). Un solo helper per gli eventi: lo chiama il server,
// mai il client. Dentro un'operazione si passa `tx`, così l'evento sparisce con il rollback (V13).

type Db = Prisma.TransactionClient;

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
  'auth.link_requested': [],
  'auth.invite': ['tipo'],
  'auth.access_denied': ['rotta', 'metodo'],
  'errore.error': ['rotta', 'metodo', 'http_status', 'errore'],
};

const log = new Logger('Registro');

function controlla(codice: string, dettaglio: Record<string, unknown>) {
  const chiavi = SCHEMI[codice];
  const mancano = chiavi && ['etichetta', ...chiavi].filter((k) => dettaglio[k] === undefined);
  if (mancano && !mancano.length) return;
  const errore = `registro: dettaglio non valido per ${codice}` + (mancano ? `: mancano ${mancano.join(', ')}` : ' (codice sconosciuto)');
  // nelle prove si ferma subito; in esercizio la riga si scrive lo stesso (§15.4)
  // ponytail: in esercizio solo il log del processo; l'anomalia app.dettaglio_non_valido arriva con apriAnomalia (§7.14.4)
  if (process.env.NODE_ENV === 'test') throw new Error(errore);
  log.warn(errore);
}

/** Scrive un evento. Dentro un'operazione: `logEvent(tx, …)`, stessa transazione (§15.3, V13). */
export async function logEvent(db: Db, e: Evento, ctx: Contesto = {}) {
  const codice = `${e.tipo}.${e.azione}`;
  controlla(codice, e.dettaglio);
  const conRete = e.tipo === 'auth' || e.esito === 'negato'; // IP e sessione solo qui (§15.1)
  return db.registro.create({
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
      sessione_id: conRete ? ctx.sessione_id : null,
      ip: conRete ? ctx.ip : null,
    },
  });
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
