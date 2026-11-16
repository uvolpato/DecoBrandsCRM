import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { PrismaService } from './prisma.service';
import { contesto } from './accesso';
import { logEventSicuro } from './registro';

// Errori generici verso il browser: niente dettagli interni (§15.5). I 4xx tornano con il loro
// messaggio; i 5xx con un codice, che è l'operazione_id dell'evento errore.error nel registro.
// I 4xx di validazione (400/422) si registrano nel registro, solo per un utente entrato (§15.2.7).

/** Campo di un errore di validazione: la prima parola del messaggio del ValidationPipe (il nome del
 *  campo), senza mai i valori inviati (§15.2.7, D-85). Il testo dell'eccezione non si usa: a volte
 *  contiene il valore inviato (`Area sconosciuta: xyz`, `Campo sconosciuto: <k>`). */
function campoValidazione(risposta: unknown): string | null {
  if (!risposta || typeof risposta !== 'object') return null;
  const m = (risposta as { message?: unknown }).message;
  if (!Array.isArray(m)) return null;
  const primo = typeof m[0] === 'string' ? m[0] : String(m[0] ?? '');
  const i = primo.indexOf(' ');
  return i > 0 ? primo.slice(0, i) : primo;
}

/** Nome italiano dei campi per i messaggi di validazione (§15.2.7): i rifiuti del ValidationPipe non
 *  devono arrivare in inglese. I campi non ovvi restano fuori: per loro vale il messaggio generico. */
const NOME_CAMPO: Record<string, string> = {
  numero: 'Numero', data: 'Data', importo: 'Importo', importo_totale: 'Importo', tipo: 'Tipo',
  note: 'Note', motivo: 'Motivo', valore: 'Valore', codice: 'Codice', nome: 'Nome', cognome: 'Cognome',
  email: 'Email', utente: 'Utente', password: 'Password', mese: 'Mese', anno: 'Anno',
  cliente: 'Cliente', fornitore: 'Fornitore', cliente_id: 'Cliente', fornitore_id: 'Fornitore',
  codice_cliente: 'Codice cliente', piva_cliente: 'P.IVA cliente', piva_fornitore: 'P.IVA fornitore',
  riferimento_fattura: 'Fattura stornata', numero_ordine_fornitore: 'Ordine fornitore',
  pratica_id: 'Pratica', subagente_id: 'Subagente', fattura_id: 'Fattura', ragione_sociale: 'Ragione sociale',
};

/** Traduce un messaggio di validazione del ValidationPipe. I messaggi già italiani (personalizzati nei
 *  DTO, es. «Data nel formato aaaa-mm-gg») restano com'erano; quelli inglesi standard di class-validator
 *  diventano italiani con il nome del campo tradotto, o il messaggio generico se il campo non è ovvio. */
function traduciValidazione(messaggio: string): string {
  const i = messaggio.indexOf(' ');
  const campo = i > 0 ? messaggio.slice(0, i) : messaggio;
  const testo = i > 0 ? messaggio.slice(i + 1) : '';
  // non è un modello inglese standard → è già italiano (personalizzato nei DTO)
  if (!testo.startsWith('must ') && !testo.startsWith('should ')) return messaggio;
  const nome = NOME_CAMPO[campo];
  if (!nome) return 'Dati non validi: controlla i campi';
  const n = testo.match(/\d+(?:\.\d+)?/)?.[0] ?? '';
  if (testo.startsWith('must be shorter than or equal to')) return `Il campo ${nome} è troppo lungo (al massimo ${n} caratteri)`;
  if (testo.startsWith('must be longer than or equal to')) return `Il campo ${nome} è troppo corto (almeno ${n} caratteri)`;
  if (testo.startsWith('must not be greater than')) return `Il campo ${nome} non può superare ${n}`;
  if (testo.startsWith('must not be less than')) return `Il campo ${nome} non può essere inferiore a ${n}`;
  if (testo.startsWith('must be a string')) return `Il campo ${nome} deve essere un testo`;
  if (testo.startsWith('must be an integer')) return `Il campo ${nome} deve essere un numero intero`;
  if (testo.startsWith('must be a number')) return `Il campo ${nome} deve essere un numero`;
  if (testo.startsWith('must be a positive number')) return `Il campo ${nome} deve essere un numero positivo`;
  if (testo.startsWith('must be a boolean')) return `Il campo ${nome} deve essere vero o falso`;
  if (testo.startsWith('must be a valid ISO 8601')) return `Il campo ${nome} deve essere una data valida`;
  if (testo.startsWith('must be an email')) return `Il campo ${nome} deve essere un indirizzo email`;
  if (testo.startsWith('must be one of')) return `Il campo ${nome} non ha un valore valido`;
  if (testo.startsWith('must match')) return `Il campo ${nome} non ha un formato valido`;
  if (testo.startsWith('must be a UUID')) return `Il campo ${nome} non è valido`;
  if (testo.startsWith('should not be empty')) return `Il campo ${nome} è obbligatorio`;
  return 'Dati non validi: controlla i campi';
}

/** Il messaggio di un 400/422 può essere una stringa (già italiana, es. «Scegli la pratica») o un
 *  elenco di messaggi del ValidationPipe (in inglese): qui l'elenco si traduce in italiano. */
function validazioneInItaliano(risposta: unknown): unknown {
  if (!risposta || typeof risposta !== 'object') return risposta;
  const r = risposta as { message?: unknown };
  if (!Array.isArray(r.message)) return risposta;
  return { ...risposta, message: r.message.map((m) => (typeof m === 'string' ? traduciValidazione(m) : m)) };
}

@Catch()
@Injectable()
export class ErroriFilter implements ExceptionFilter {
  private readonly log = new Logger('Errori');

  constructor(private readonly db: PrismaService) {}

  async catch(errore: unknown, host: ArgumentsHost) {
    const req = host.switchToHttp().getRequest<Request>();
    const res = host.switchToHttp().getResponse<Response>();

    if (errore instanceof HttpException) {
      // il 429 del throttler porta un testo in inglese: la finestra parla italiano (§3.3, D-41)
      if (errore.getStatus() === 429) {
        res.status(429).json({ statusCode: 429, message: 'Troppi tentativi ravvicinati: riprova fra qualche minuto.' });
        return;
      }
      const stato = errore.getStatus();
      if (stato === 400 || stato === 422) {
        // operazione rifiutata dalla validazione: si registra solo la richiesta di un utente entrato,
        // come rifiuto (`negato`, livello attenzione), mai come errore del sistema, e mai con i valori
        // inviati (solo campo e messaggio generico, §15.2.7, D-85).
        const risposta = errore.getResponse();
        if (req.utente) {
          const azione = req.method === 'POST' ? 'create' : req.method === 'PUT' || req.method === 'PATCH' ? 'update' : req.method === 'DELETE' ? 'delete' : null;
          if (azione) {
            const campo = campoValidazione(risposta);
            await logEventSicuro(this.db, {
              tipo: 'crud',
              azione,
              entita: req.path.split('/').filter(Boolean)[1] ?? 'sistema',
              esito: 'negato',
              dettaglio: { etichetta: `${req.method} ${req.path}`, errore: { messaggio: 'valore non valido', ...(campo ? { campo } : {}) } },
            }, contesto(req));
          }
        }
        // i rifiuti del ValidationPipe arrivano in inglese: si traducono prima di mostrarli (§15.2.7)
        res.status(stato).json(validazioneInItaliano(risposta));
        return;
      }
      res.status(stato).json(errore.getResponse());
      return;
    }
    const codice = randomUUID();
    const e = errore instanceof Error ? errore : new Error(String(errore));
    this.log.error(`${codice} ${req.method} ${req.url}`, e.stack);
    await logEventSicuro(this.db, {
      tipo: 'errore',
      azione: 'error',
      entita: 'sistema',
      esito: 'errore',
      operazione_id: codice,
      dettaglio: {
        etichetta: `${req.method} ${req.path}`,
        rotta: req.path, // senza query: niente parametri nel log (§15.8)
        metodo: req.method,
        http_status: 500,
        // mai il testo dell'errore (può contenere valori di riga): classe e, per Prisma, il codice
        errore: { classe: e.constructor.name, ...(typeof (e as { code?: string }).code === 'string' ? { codice: (e as { code?: string }).code } : {}) },
      },
    });
    res.status(500).json({ statusCode: 500, message: 'Errore interno', codice });
  }
}
