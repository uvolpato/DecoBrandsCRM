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
  // documenti (§15.2.4, F2-A3)
  'documento.upload': ['documento_id', 'file_nome', 'dimensione', 'origine'],
  'documento.create': ['pratica_id', 'documento_id', 'tipo', 'numero', 'data', 'importo', 'storno_totale', 'fattura_id'],
  'documento.update': ['documento_id', 'pratica_id', 'prima', 'dopo'],
  'documento.delete': ['documento_id', 'pratica_id', 'tipo', 'numero', 'importo'],
  'documento.match': ['documento_id', 'arrivo_id', 'pratica_id', 'tipo'], // abbinamento a mano di un file in coda (D-60)
  'documento.move': ['documento_id', 'tipo', 'prima', 'dopo'], // documento spostato in un'altra pratica (D-60)
  // sincronizzazione da Integra (§7.14.3): anomalie, non eventi
  'integra.connessione': ['errore'],
  'integra.vista': ['vista', 'errore'],
  'integra.piva_mancante': ['codice', 'piva'],
  'integra.piva_doppia': ['piva'],
  'integra.riga': ['vista', 'id_integra', 'errore'],
  'integra.lenta': ['secondi'],
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

/** Apre (o ripete) un'anomalia. Resta una sola riga aperta per servizio/codice/chiave. */
export async function apriAnomalia(db: Db, a: Anomalia, ora = new Date()) {
  const chiave = a.chiave ?? '';
  const aperta = await db.registro.findFirst({
    where: { genere: 'anomalia', servizio: a.servizio, codice: a.codice, chiave, stato: 'aperta' },
  });
  const dettaglio = (a.dettaglio ?? {}) as Prisma.InputJsonValue;
  if (aperta) {
    await db.registro.update({
      where: { id: aperta.id },
      data: { volte: { increment: 1 }, ultimo: ora, messaggio: a.messaggio, dettaglio },
    });
    return;
  }
  await db.registro.create({
    data: {
      genere: 'anomalia', livello: a.livello ?? 'errore', codice: a.codice, servizio: a.servizio,
      chiave, messaggio: a.messaggio, dettaglio, stato: 'aperta', ultimo: ora,
    },
  });
}

/** Chiude l'anomalia aperta (se c'è) quando il problema sparisce. */
export async function chiudiAnomalia(db: Db, servizio: string, codice: string, chiave = '', ora = new Date()) {
  await db.registro.updateMany({
    where: { genere: 'anomalia', servizio, codice, chiave, stato: 'aperta' },
    data: { stato: 'chiusa', chiusa_il: ora, ultimo: ora },
  });
}
