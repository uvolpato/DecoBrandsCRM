import {
  BadRequestException, Body, CanActivate, Controller, ExecutionContext, ForbiddenException, Get, HttpCode, Injectable, Post, Req,
  SetMetadata, UnauthorizedException, UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { randomBytes } from 'node:crypto';
import type { Request } from 'express';
import type { utenti } from '@prisma/client';
import { cifra, MASSIMO, MINIMO, verifica } from './password';
import { PrismaService } from './prisma.service';
import { Contesto, logEvent, logEventSicuro } from './registro';

// Accesso e permessi (§3.3, §8.3, D-38, D-39).

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

/** Permessi per ruolo: la tabella di §8.3 (M.PERMESSI del prototipo, più il superutente di D-39). */
export const PERMESSI = {
  consulta: ['superutente', 'amministratore', 'operatore', 'lettura'],
  esporta: ['superutente', 'amministratore', 'operatore', 'lettura'],
  modifica: ['superutente', 'amministratore', 'operatore'],
  anagrafiche: ['superutente', 'amministratore', 'operatore'],
  chiudi: ['superutente', 'amministratore', 'operatore'],
  scartati: ['superutente', 'amministratore', 'operatore'],
  sistema: ['superutente', 'amministratore', 'operatore'],
  magazzino: ['superutente', 'amministratore'],
  gestione: ['superutente', 'amministratore'],
  amministratori: ['superutente'],
} as const;
export type Permesso = keyof typeof PERMESSI;

export const permessiDi = (ruolo: string) =>
  (Object.keys(PERMESSI) as Permesso[]).filter((p) => (PERMESSI[p] as readonly string[]).includes(ruolo));

// Ogni rotta dichiara cosa serve: un permesso, oppure che è pubblica. Senza dichiarazione: negata.
export const Richiede = (permesso: Permesso) => SetMetadata('permesso', permesso);
export const Pubblica = () => SetMetadata('permesso', 'pubblica');
// Le sole rotte aperte a chi ha ancora la password provvisoria (§8.3, D-39).
const AncheProvvisoria = () => SetMetadata('provvisoria', true);

export const contesto = (req: Request): Contesto => ({
  utente_id: req.utente?.id ?? null,
  sessione_id: req.sessionID,
  ip: req.ip,
});

const TRENTA_GIORNI = 30 * 24 * 3600 * 1000;

/** Dopo un accesso riuscito: sessione nuova (contro la session fixation) con utente e token CSRF (D-38). */
export function apriSessione(req: Request, utente_id: bigint, resta = true) {
  return new Promise<void>((ok, ko) =>
    req.session.regenerate((err) => {
      if (err) return ko(err);
      req.session.utente_id = String(utente_id);
      req.session.csrf = randomBytes(32).toString('hex');
      // senza "Resta collegato" il cookie non ha scadenza e finisce con il browser (null: i tipi non lo prevedono)
      (req.session.cookie as { maxAge: number | null }).maxAge = resta ? TRENTA_GIORNI : null;
      req.session.save((e) => (e ? ko(e) : ok()));
    }),
  );
}

@Injectable()
export class AccessoGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly db: PrismaService) {}

  async canActivate(ctx: ExecutionContext) {
    const dove = [ctx.getHandler(), ctx.getClass()];
    const permesso = this.reflector.getAllAndOverride<Permesso | 'pubblica' | undefined>('permesso', dove);
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
    if (utente.deve_cambiare_password && !this.reflector.getAllAndOverride<boolean>('provvisoria', dove)) {
      throw new ForbiddenException('cambia_password'); // prima il cambio della password provvisoria
    }
    if (permessiDi(utente.ruolo).includes(permesso)) return true;

    await logEventSicuro(this.db, {
      tipo: 'auth', azione: 'access_denied', entita: 'utente', entita_id: utente.id, esito: 'negato',
      dettaglio: { etichetta: utente.username, rotta: req.path, metodo: req.method },
    }, contesto(req));
    throw new ForbiddenException();
  }
}

class Entra {
  @IsString() @MaxLength(200) utente!: string; // nome utente o email
  @IsString() @MaxLength(MASSIMO) password!: string;
  @IsOptional() @IsBoolean() resta?: boolean;
}

class CambiaPassword {
  @IsString() @MaxLength(MASSIMO) attuale!: string;
  @IsString() @MaxLength(MASSIMO) nuova!: string;
}

const NON_VALIDE = 'Credenziali non valide';

/** Limite ai tentativi per IP e nome utente tentato: in ufficio tutti escono con lo stesso IP,
 *  un limite solo per IP bloccherebbe tutti; così si ferma chi prova password su un account. */
@Injectable()
class TentativiGuard extends ThrottlerGuard {
  protected getTracker(req: Request) {
    const chi = typeof req.body?.utente === 'string' ? req.body.utente.trim().toLowerCase() : '';
    return Promise.resolve(`${req.ip}|${chi || req.session?.utente_id || ''}`);
  }
}

@Controller('accesso')
export class AccessoController {
  constructor(private readonly db: PrismaService) {}

  /** Chi sono e cosa posso fare: il frontend costruisce barra e pagine da qui (D-38). */
  @Get('io')
  @Richiede('consulta')
  @AncheProvvisoria()
  io(@Req() req: Request) {
    const u = req.utente!;
    return {
      id: String(u.id), username: u.username, nome: u.nome, email: u.email, ruolo: u.ruolo,
      permessi: permessiDi(u.ruolo), cambia_password: u.deve_cambiare_password, csrf: req.session.csrf,
    };
  }

  /** Nome utente (o email) e password, come nella Gestione Ordini (D-39). Un solo messaggio per ogni errore. */
  @Post('entra')
  @HttpCode(200)
  @Pubblica()
  @UseGuards(TentativiGuard)
  async entra(@Req() req: Request, @Body() b: Entra) {
    const chi = b.utente.trim().toLowerCase();
    const u = await this.db.utenti.findFirst({ where: { OR: [{ username: chi }, { email: chi }], sistema: false } });
    const giusta = await verifica(b.password, u?.password_hash); // calcolo fatto anche se l'utente non c'è
    if (!u || !giusta || !u.attivo) {
      await logEventSicuro(this.db, {
        tipo: 'auth', azione: 'login', entita: 'utente', entita_id: u?.id, esito: 'errore',
        dettaglio: { etichetta: chi, modo: 'password', motivo: u && giusta ? 'disattivato' : 'credenziali' },
      }, { utente_id: u?.id, ip: req.ip });
      throw new UnauthorizedException(NON_VALIDE);
    }
    await apriSessione(req, u.id, b.resta ?? false);
    await this.db.utenti.update({ where: { id: u.id }, data: { ultimo_accesso: new Date() } });
    await logEventSicuro(this.db, {
      tipo: 'auth', azione: 'login', entita: 'utente', entita_id: u.id, esito: 'successo',
      dettaglio: { etichetta: u.username, modo: 'password', sessione_id: req.sessionID },
    }, { utente_id: u.id, sessione_id: req.sessionID, ip: req.ip });
    req.utente = u;
    return this.io(req);
  }

  @Post('esci')
  @HttpCode(204)
  @Richiede('consulta')
  @AncheProvvisoria()
  async esci(@Req() req: Request) {
    const u = req.utente!;
    await logEventSicuro(this.db, {
      tipo: 'auth', azione: 'logout', entita: 'utente', entita_id: u.id, esito: 'successo',
      dettaglio: { etichetta: u.username, sessione_id: req.sessionID },
    }, contesto(req));
    await new Promise((ok) => req.session.destroy(ok)); // cancella anche la riga in sessioni
  }

  /** Cambio password: obbligatorio con la provvisoria; chiude le altre sessioni dell'utente (§3.3). */
  @Post('password')
  @HttpCode(204)
  @Richiede('consulta')
  @AncheProvvisoria()
  @UseGuards(TentativiGuard)
  async password(@Req() req: Request, @Body() b: CambiaPassword) {
    const u = req.utente!;
    const motivo = !(await verifica(b.attuale, u.password_hash)) ? 'attuale_errata'
      : b.nuova.length < MINIMO ? 'troppo_corta'
      : b.nuova === b.attuale ? 'uguale' : null;
    const evento = { tipo: 'auth', azione: 'password_change', entita: 'utente', entita_id: u.id } as const;
    if (motivo) {
      await logEventSicuro(this.db, { ...evento, esito: 'errore', dettaglio: { etichetta: u.username, motivo } }, contesto(req));
      throw new BadRequestException(
        motivo === 'attuale_errata' ? 'La password attuale non è giusta'
          : motivo === 'troppo_corta' ? `La nuova password deve avere almeno ${MINIMO} caratteri`
            : 'La nuova password deve essere diversa da quella attuale',
      );
    }
    const hash = await cifra(b.nuova);
    await this.db.$transaction(async (tx) => {
      await tx.utenti.update({ where: { id: u.id }, data: { password_hash: hash, deve_cambiare_password: false } });
      await tx.sessioni.deleteMany({ where: { utente_id: u.id, NOT: { sid: req.sessionID } } });
      await logEvent(tx, { ...evento, esito: 'successo', dettaglio: { etichetta: u.username } }, contesto(req));
    });
  }
}
