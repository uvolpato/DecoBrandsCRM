// Chiamate al backend (stessa origine: /api è inoltrato alla 8002). Il frontend manda solo le
// scelte dell'utente; calcoli, permessi e controlli stanno sul server (V12, D-28).

let csrf = ''; // token della sessione, da /api/accesso/io o /entra (§3.3)

export interface Io {
  id: string;
  username: string;
  nome: string;
  email: string;
  ruolo: string; // di Sistema: superutente | amministratore | utente (D-45)
  aree: Record<string, string>; // area → lettura | operatore | responsabile
  permessi: string[];
  cambia_password: boolean;
  csrf: string;
  righe_pagina: number; // §7.15: righe per pagina nelle tabelle
  ingressi: Record<string, string>; // pagina di ingresso per area (D-88), solo quelle ammesse adesso
  timeout_minuti: number;
}

export interface Risposta<T> {
  ok: boolean;
  stato: number;
  dati: T;
  messaggio: string; // già pronto da mostrare
}

const MESSAGGI: Record<number, string> = {
  429: 'Troppi tentativi: riprova tra 15 minuti.',
  500: 'Qualcosa non ha funzionato. Riprova; se succede ancora, avvisa l’amministratore.',
};

// Esci in corso: niente ricaricamento all'accesso mentre la chiusura non è ancora arrivata (A6-02).
let uscendo = false;

/** Sessione scaduta (timeout o chiusa altrove): si torna all'accesso con il ritorno alla pagina (D-89). */
function allAccesso() {
  if (uscendo || typeof window === 'undefined' || window.location.pathname.startsWith('/accesso')) return;
  window.location.assign('/accesso?dopo=' + encodeURIComponent(window.location.pathname));
}

/** Esci (D-53): chiude la sessione sul server e solo dopo va all'accesso, così la richiesta di uscita
 *  non corre con le altre richieste della pagina vecchia (A6-02). */
export async function esci() {
  uscendo = true;
  await api('accesso/esci', {});
  if (typeof window !== 'undefined') window.location.replace('/accesso');
}

/** GET senza corpo, POST con il corpo; PUT e DELETE si chiedono con `metodo`. `automatico` segna le
 *  richieste che il browser fa da solo (polling, riletture su evento SSE): non contano come attività
 *  della persona, così il timeout di inattività (D-89) scatta anche su una scheda aperta da sola. */
export async function api<T = unknown>(percorso: string, corpo?: object, metodo?: 'PUT' | 'DELETE', opzioni?: { automatico?: boolean }): Promise<Risposta<T>> {
  const scrive = !!corpo || !!metodo;
  // pagina appena aperta con una sessione: il token si prende prima di modificare (senza sessione non serve)
  if (scrive && !csrf && percorso !== 'accesso/io') await api('accesso/io');
  let r: Response;
  try {
    r = await fetch('/api/' + percorso, {
      method: metodo ?? (corpo ? 'POST' : 'GET'),
      headers: scrive
        ? { 'content-type': 'application/json', 'x-csrf-token': csrf, ...(opzioni?.automatico ? { 'x-automatico': '1' } : {}) }
        : opzioni?.automatico ? { 'x-automatico': '1' } : undefined,
      body: corpo ? JSON.stringify(corpo) : undefined,
      credentials: 'same-origin',
    });
  } catch { // server spento o rete caduta: chi chiama mostra il messaggio come per ogni altro errore
    return { ok: false, stato: 0, dati: null as T, messaggio: 'Il server non risponde: controlla la connessione e riprova.' };
  }
  const dati = r.status === 204 ? null : await r.json().catch(() => null);
  if (dati && typeof dati.csrf === 'string') csrf = dati.csrf;
  if (r.status === 401) allAccesso();
  // i messaggi del server sono già in italiano; dalla validazione dei DTO arriva una lista: il primo
  const m = dati?.message;
  const testo = typeof m === 'string' ? m : Array.isArray(m) && typeof m[0] === 'string' ? m[0] : '';
  return { ok: r.ok, stato: r.status, dati: dati as T, messaggio: r.ok ? '' : MESSAGGI[r.status] ?? (testo || MESSAGGI[500]) };
}

/** POST di un PDF in multipart/form-data (canale comune, §6.5): il file lo controlla il server. */
export async function caricaPdf(file: File): Promise<Risposta<{ id: string; file_nome: string; stato: string; ricevuto_il: string }>> {
  if (!csrf) await api('accesso/io');
  const corpo = new FormData();
  corpo.append('file', file);
  let r: Response;
  try {
    r = await fetch('/api/documenti/carica', { method: 'POST', headers: { 'x-csrf-token': csrf }, body: corpo, credentials: 'same-origin' });
  } catch {
    return { ok: false, stato: 0, dati: null!, messaggio: 'Il server non risponde: controlla la connessione e riprova.' };
  }
  const dati = await r.json().catch(() => null);
  if (dati && typeof dati.csrf === 'string') csrf = dati.csrf;
  if (r.status === 401) allAccesso();
  const m = dati?.message;
  const testo = typeof m === 'string' ? m : Array.isArray(m) && typeof m[0] === 'string' ? m[0] : '';
  return { ok: r.ok, stato: r.status, dati: dati as never, messaggio: r.ok ? '' : MESSAGGI[r.status] ?? (testo || MESSAGGI[500]) };
}

/** Pagina a cui tornare dopo l'accesso: solo percorsi interni (D-38). Il parser degli URL del browser
 *  toglie TAB e a capo, così `/\t/sito` diventa `//sito` (un altro dominio): si risolve e si confronta
 *  l'origine, invece di fidarsi di una regex sul secondo carattere (A1-04). */
export function dopo(valore: string | null) {
  if (!valore) return '/';
  try {
    if (typeof window === 'undefined') return '/';
    const u = new URL(valore, window.location.origin);
    if (u.origin !== window.location.origin || u.pathname.startsWith('/accesso')) return '/';
    return u.pathname + u.search + u.hash;
  } catch {
    return '/';
  }
}
