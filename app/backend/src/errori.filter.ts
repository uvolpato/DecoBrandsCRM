import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { PrismaService } from './prisma.service';
import { logEventSicuro } from './registro';

// Errori generici verso il browser: niente dettagli interni (§15.5). I 4xx tornano con il loro
// messaggio; i 5xx con un codice, che è l'operazione_id dell'evento errore.error nel registro.
// ponytail: i 4xx di validazione si registrano con il tipo dell'operazione (§15.2.7) quando
// arrivano le prime rotte che scrivono.
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
      res.status(errore.getStatus()).json(errore.getResponse());
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
