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
        if (req.utente) {
          const azione = req.method === 'POST' ? 'create' : req.method === 'PUT' || req.method === 'PATCH' ? 'update' : req.method === 'DELETE' ? 'delete' : null;
          if (azione) {
            const campo = campoValidazione(errore.getResponse());
            await logEventSicuro(this.db, {
              tipo: 'crud',
              azione,
              entita: req.path.split('/').filter(Boolean)[1] ?? 'sistema',
              esito: 'negato',
              dettaglio: { etichetta: `${req.method} ${req.path}`, errore: { messaggio: 'valore non valido', ...(campo ? { campo } : {}) } },
            }, contesto(req));
          }
        }
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
