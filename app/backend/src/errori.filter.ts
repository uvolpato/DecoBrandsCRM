import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';

// Errori generici verso il browser: niente dettagli interni (§15). Gli errori 4xx tornano
// con il loro messaggio; i 5xx con un codice da cercare nel log.
// ponytail: per ora scrive nel log del processo; il passo 1.5 lo porta nel registro (D-31).
@Catch()
export class ErroriFilter implements ExceptionFilter {
  private readonly log = new Logger('Errori');

  catch(errore: unknown, host: ArgumentsHost) {
    const req = host.switchToHttp().getRequest<Request>();
    const res = host.switchToHttp().getResponse<Response>();

    if (errore instanceof HttpException) {
      res.status(errore.getStatus()).json(errore.getResponse());
      return;
    }
    const codice = randomUUID();
    this.log.error(`${codice} ${req.method} ${req.url}`, errore instanceof Error ? errore.stack : String(errore));
    res.status(500).json({ statusCode: 500, message: 'Errore interno', codice });
  }
}
