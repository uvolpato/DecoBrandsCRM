// Chiamate al backend (stessa origine: /api è inoltrato alla 8002). Il frontend manda solo le
// scelte dell'utente; calcoli, permessi e controlli stanno sul server (V12, D-28).

let csrf = ''; // token della sessione, da /api/accesso/io o /entra (§3.3)

export interface Io {
  id: string;
  username: string;
  nome: string;
  email: string;
  ruolo: string;
  permessi: string[];
  cambia_password: boolean;
  csrf: string;
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

/** GET senza corpo, POST con il corpo; PUT e DELETE si chiedono con `metodo`. */
export async function api<T = unknown>(percorso: string, corpo?: object, metodo?: 'PUT' | 'DELETE'): Promise<Risposta<T>> {
  const scrive = !!corpo || !!metodo;
  // pagina appena aperta con una sessione: il token si prende prima di modificare (senza sessione non serve)
  if (scrive && !csrf && percorso !== 'accesso/io') await api('accesso/io');
  let r: Response;
  try {
    r = await fetch('/api/' + percorso, {
      method: metodo ?? (corpo ? 'POST' : 'GET'),
      headers: scrive ? { 'content-type': 'application/json', 'x-csrf-token': csrf } : undefined,
      body: corpo ? JSON.stringify(corpo) : undefined,
      credentials: 'same-origin',
    });
  } catch { // server spento o rete caduta: chi chiama mostra il messaggio come per ogni altro errore
    return { ok: false, stato: 0, dati: null as T, messaggio: 'Il server non risponde: controlla la connessione e riprova.' };
  }
  const dati = r.status === 204 ? null : await r.json().catch(() => null);
  if (dati && typeof dati.csrf === 'string') csrf = dati.csrf;
  // i messaggi del server sono già in italiano; dalla validazione dei DTO arriva una lista: il primo
  const m = dati?.message;
  const testo = typeof m === 'string' ? m : Array.isArray(m) && typeof m[0] === 'string' ? m[0] : '';
  return { ok: r.ok, stato: r.status, dati: dati as T, messaggio: r.ok ? '' : MESSAGGI[r.status] ?? (testo || MESSAGGI[500]) };
}

/** Pagina a cui tornare dopo l'accesso: solo percorsi interni (niente //sito o /\sito, D-38). */
export function dopo(valore: string | null) {
  return valore && /^\/(?![/\\])/.test(valore) && !valore.startsWith('/accesso') ? valore : '/';
}
