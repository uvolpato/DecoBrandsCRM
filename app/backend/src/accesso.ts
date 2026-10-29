import {
  CanActivate, Controller, ExecutionContext, ForbiddenException, Get, Injectable, Req,
  SetMetadata, UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { randomBytes } from 'node:crypto';
import type { Request } from 'express';
import type { utenti } from '@prisma/client';
import { PrismaService } from './prisma.service';
import { Contesto, logEventSicuro } from './registro';

// Accesso e permessi (§3.3, §8.3, D-30, D-38).

declare module 'express-session' {
  interface SessionData {
    utente_id: string; // solo l'id: ruolo e stato si rileggono a ogni richiesta (D-38)
    csrf: string;
  }
}
declare module 'express' {
  interface Request {
    utente?: utenti;
  }
}

/** Permessi per ruolo: la stessa tabella di M.PERMESSI del prototipo (§8.3). */
export const PERMESSI = {
  consulta: ['amministratore', 'operatore', 'lettura'],
  esporta: ['amministratore', 'operatore', 'lettura'],
  modifica: ['amministratore', 'operatore'],
  anagrafiche: ['amministratore', 'operatore'],
  chiudi: ['amministratore', 'operatore'],
  scartati: ['amministratore', 'operatore'],
  sistema: ['amministratore', 'operatore'],
  magazzino: ['amministratore'],
  gestione: ['amministratore'],
} as const;
export type Permesso = keyof typeof PERMESSI;

export const permessiDi = (ruolo: string) =>
  (Object.keys(PERMESSI) as Permesso[]).filter((p) => (PERMESSI[p] as readonly string[]).includes(ruolo));

// Ogni rotta dichiara cosa serve: un permesso, oppure che è pubblica. Senza dichiarazione: negata.
export const Richiede = (permesso: Permesso) => SetMetadata('permesso', permesso);
export const Pubblica = () => SetMetadata('permesso', 'pubblica');

export const contesto = (req: Request): Contesto => ({
  utente_id: req.utente?.id ?? null,
  sessione_id: req.sessionID,
  ip: req.ip,
});

/** Dopo un accesso riuscito: sessione nuova (contro la session fixation) con utente e token CSRF (D-38). */
export function apriSessione(req: Request, utente_id: bigint) {
  return new Promise<void>((ok, ko) =>
    req.session.regenerate((err) => {
      if (err) return ko(err);
      req.session.utente_id = String(utente_id);
      req.session.csrf = randomBytes(32).toString('hex');
      req.session.save((e) => (e ? ko(e) : ok()));
    }),
  );
}

@Injectable()
export class AccessoGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly db: PrismaService) {}

  async canActivate(ctx: ExecutionContext) {
    const permesso = this.reflector.getAllAndOverride<Permesso | 'pubblica' | undefined>('permesso', [ctx.getHandler(), ctx.getClass()]);
    if (permesso === 'pubblica') return true;
    if (!permesso) throw new ForbiddenException('Rotta senza permesso dichiarato'); // errore di chi sviluppa: si nega

    const req = ctx.switchToHttp().getRequest<Request>();
    const id = req.session?.utente_id;
    const utente = id ? await this.db.utenti.findUnique({ where: { id: BigInt(id) } }) : null;
    if (!utente?.attivo || utente.sistema) {
      if (id) await new Promise((ok) => req.session.destroy(ok)); // disattivato o sparito: fuori subito
      throw new UnauthorizedException();
    }
    req.utente = utente;
    if (permessiDi(utente.ruolo).includes(permesso)) return true;

    await logEventSicuro(this.db, {
      tipo: 'auth', azione: 'access_denied', entita: 'utente', entita_id: utente.id, esito: 'negato',
      dettaglio: { etichetta: utente.email, rotta: req.path, metodo: req.method },
    }, contesto(req));
    throw new ForbiddenException();
  }
}

@Controller('accesso')
export class AccessoController {
  /** Chi sono e cosa posso fare: il frontend costruisce barra e pagine da qui (D-38). */
  @Get('io')
  @Richiede('consulta')
  io(@Req() req: Request) {
    const u = req.utente!;
    return { id: String(u.id), nome: u.nome, email: u.email, ruolo: u.ruolo, permessi: permessiDi(u.ruolo), csrf: req.session.csrf };
  }
}
