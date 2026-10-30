import {
  BadRequestException, Body, CanActivate, Logger, Controller, ExecutionContext, ForbiddenException, Get, HttpCode, Injectable, Post, Req,
  SetMetadata, UnauthorizedException, UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { createHash, randomBytes } from 'node:crypto';
import type { Request } from 'express';
import type { utenti } from '@prisma/client';
import { cifra, MASSIMO, MINIMO, verifica } from './password';
import { indirizzo, invia } from './posta';
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
    livelli?: Partial<Record<'anagrafiche' | 'provvigioni' | 'vendite', 'lettura' | 'operatore' | 'responsabile'>>; // D-45
  }
}

/** Ruoli e aree (§8.3, D-45): ruolo di Sistema + un livello per area; stessa tabella di M.PERMESSI del prototipo. */
export const RUOLI = ['superutente', 'amministratore', 'utente'] as const;
export const AREE = ['anagrafiche', 'provvigioni', 'vendite'] as const;
export const LIVELLI = ['lettura', 'operatore', 'responsabile'] as const; // in ordine: ognuno comprende i precedenti
export type Area = (typeof AREE)[number];
export type Livello = (typeof LIVELLI)[number];
export type Livelli = Partial<Record<Area, Livello>>;

interface DefPermesso {
  area: 'sistema' | Area;
  testo: string;
  ruoli?: readonly string[]; // Sistema: i ruoli che lo hanno
  ancheOperatore?: boolean; // Sistema: anche chi è almeno operatore in un'area
  minimo?: Livello; // area: il livello che serve
}
export const PERMESSI = {
  'sistema.utenti': { area: 'sistema', testo: 'Utenti (non amministratori): creare, modificare, livelli nelle aree, disattivare', ruoli: ['superutente', 'amministratore'] },
  'sistema.amministratori': { area: 'sistema', testo: 'Amministratori: creare, modificare, disattivare', ruoli: ['superutente'] },
  'sistema.impostazioni': { area: 'sistema', testo: 'Impostazioni del portale (casella, posta, sincronizzazione, conservazione)', ruoli: ['superutente', 'amministratore'] },
  'sistema.stato': { area: 'sistema', testo: 'Stato del sistema, segnare i problemi come visti', ruoli: ['superutente', 'amministratore'], ancheOperatore: true },
  'anagrafiche.consulta': { area: 'anagrafiche', testo: 'Consultare fornitori, clienti, subagenti', minimo: 'lettura' },
  'anagrafiche.modifica': { area: 'anagrafiche', testo: 'Subagenti, agenzie dei clienti (interscambio)', minimo: 'operatore' },
  'anagrafiche.condizioni': { area: 'anagrafiche', testo: 'Condizioni, scaglioni e percentuali dei fornitori; eccezioni personali', minimo: 'responsabile' },
  'provvigioni.consulta': { area: 'provvigioni', testo: 'Consultare pratiche, documenti, bollettini, liquidazioni, analisi', minimo: 'lettura' },
  'provvigioni.esporta': { area: 'provvigioni', testo: 'Esportare liquidazioni e analisi (Excel, PDF, CSV)', minimo: 'lettura' },
  'provvigioni.modifica': { area: 'provvigioni', testo: 'Caricare, correggere e abbinare documenti; verificare bollettini; preparare solleciti', minimo: 'operatore' },
  'provvigioni.scartati': { area: 'provvigioni', testo: 'Vedere e recuperare i documenti scartati', minimo: 'operatore' },
  'provvigioni.chiudi': { area: 'provvigioni', testo: 'Chiudere la liquidazione del trimestre', minimo: 'responsabile' },
  'provvigioni.elimina': { area: 'provvigioni', testo: 'Eliminare definitivamente i documenti scartati', minimo: 'responsabile' },
  'vendite.consulta': { area: 'vendite', testo: 'Consultare ordini cliente, articoli, giacenze', minimo: 'lettura' },
  'vendite.magazzino': { area: 'vendite', testo: 'Alias e kit: creare, modificare, eliminare', minimo: 'responsabile' },
} as const satisfies Record<string, DefPermesso>;
/** 'collegato': chiunque sia entrato (io, esci, cambio password). */
export type Permesso = keyof typeof PERMESSI | 'collegato';

const grado = (l?: string) => LIVELLI.indexOf(l as Livello); // -1 = nessun livello
/** I permessi di un utente dal suo ruolo di Sistema e dai livelli nelle aree; il server li rilegge a ogni richiesta (D-38). */
export function permessiDi(ruolo: string, livelli: Livelli): Permesso[] {
  const operatore = Object.values(livelli).some((l) => grado(l) >= grado('operatore'));
  const def = PERMESSI as Record<string, DefPermesso>;
  return ['collegato', ...(Object.keys(def) as Permesso[]).filter((id) => {
    const p = def[id];
    return p.area === 'sistema'
      ? p.ruoli!.includes(ruolo) || (!!p.ancheOperatore && operatore)
      : grado(livelli[p.area]) >= grado(p.minimo);
  })];
}
/** Le righe di utenti_aree come mappa area → livello. */
export const livelliDi = (righe: { area: string; livello: string }[]): Livelli =>
  Object.fromEntries(righe.map((r) => [r.area, r.livello]));

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
    const trovato = id ? await this.db.utenti.findUnique({ where: { id: BigInt(id) }, include: { aree: true } }) : null;
    const { aree, ...utente } = trovato ?? { aree: [] };
    if (!trovato || !trovato.attivo || trovato.sistema) {
      if (id) await new Promise((ok) => req.session.destroy(ok)); // disattivato o sparito: fuori subito
      throw new UnauthorizedException();
    }
    req.utente = utente as utenti;
    req.livelli = livelliDi(aree);
    if (trovato.deve_cambiare_password && !this.reflector.getAllAndOverride<boolean>('provvisoria', dove)) {
      throw new ForbiddenException('cambia_password'); // prima il cambio della password provvisoria
    }
    if (permessiDi(trovato.ruolo, req.livelli).includes(permesso)) return true;

    await logEventSicuro(this.db, {
      tipo: 'auth', azione: 'access_denied', entita: 'utente', entita_id: trovato.id, esito: 'negato',
      dettaglio: { etichetta: trovato.username, rotta: req.path, metodo: req.method },
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

class Dimenticata {
  @IsEmail() @MaxLength(200) email!: string;
}

class Reimposta {
  @IsString() @MaxLength(100) codice!: string;
  @IsString() @MaxLength(MASSIMO) nuova!: string;
}

const NON_VALIDE = 'Credenziali non valide';
const UN_ORA = 3600 * 1000;
const impronta = (codice: string) => createHash('sha256').update(codice).digest('hex');

/** Limite ai tentativi (D-41): ogni persona ha il suo contatore (IP e nome utente, email, link o
 *  sessione), perché in ufficio tutti escono con lo stesso IP; il tetto largo per solo IP (in
 *  app.module) ferma chi prova tanti nomi o email diversi. Valori nel .env, si azzerano da soli. */
const CAMPO: Record<string, 'utente' | 'email' | 'codice'> = { entra: 'utente', dimenticata: 'email', reimposta: 'codice' };

@Injectable()
class TentativiGuard extends ThrottlerGuard {
  protected getTracker(req: Request, ctx?: ExecutionContext) { // la libreria passa anche il contesto
    // il campo lo decide la rotta, non chi scrive il corpo; cambio password: la sessione
    const campo = ctx && CAMPO[ctx.getHandler().name];
    const v = campo && (req.body as Record<string, unknown> | undefined)?.[campo];
    const chi = typeof v === 'string' ? v.trim().toLowerCase() : req.session?.utente_id;
    return Promise.resolve(`${req.ip}|${chi ?? ''}`);
  }
}

@Controller('accesso')
export class AccessoController {
  private readonly log = new Logger('Accesso');

  constructor(private readonly db: PrismaService) {}

  /** Chi sono e cosa posso fare: il frontend costruisce barra e pagine da qui (D-38). */
  @Get('io')
  @Richiede('collegato')
  @AncheProvvisoria()
  io(@Req() req: Request) {
    const u = req.utente!;
    return {
      id: String(u.id), username: u.username, nome: u.nome, email: u.email, ruolo: u.ruolo, aree: req.livelli ?? {},
      permessi: permessiDi(u.ruolo, req.livelli ?? {}), cambia_password: u.deve_cambiare_password, csrf: req.session.csrf,
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
  @Richiede('collegato')
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
  @Richiede('collegato')
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
      await tx.accessi_link.deleteMany({ where: { utente_id: u.id, usato_il: null } }); // un link già mandato non vale più
      await logEvent(tx, { ...evento, esito: 'successo', dettaglio: { etichetta: u.username } }, contesto(req));
    });
  }

  /** Password dimenticata: link monouso di 1 ora; risposta sempre uguale (§3.3, D-39). */
  @Post('dimenticata')
  @HttpCode(204)
  @Pubblica()
  @UseGuards(TentativiGuard)
  async dimenticata(@Req() req: Request, @Body() b: Dimenticata) {
    const email = b.email.trim().toLowerCase();
    const u = await this.db.utenti.findFirst({ where: { email, attivo: true, sistema: false } });
    await logEventSicuro(this.db, {
      tipo: 'auth', azione: 'password_reset_requested', entita: 'utente', entita_id: u?.id, esito: 'successo',
      dettaglio: { etichetta: email },
    }, { utente_id: u?.id, ip: req.ip });
    if (!u) return;
    // tutto il lavoro dopo la risposta: il tempo non dice se l'email è registrata (chi prova
    // tante email diverse lo ferma solo il tetto per IP, che è largo)
    void this.mandaLink(u, req.ip).catch((e: unknown) => this.log.error(`link non creato per ${u.id}: ${String(e)}`));
  }

  private async mandaLink(u: utenti, ip: string | undefined) {
    const codice = randomBytes(32).toString('base64url'); // in chiaro solo nell'email
    await this.db.$transaction([
      this.db.accessi_link.deleteMany({ where: { utente_id: u.id, usato_il: null } }), // uno nuovo annulla i precedenti
      this.db.accessi_link.create({ data: { utente_id: u.id, tipo: 'reset', impronta: impronta(codice), scade_il: new Date(Date.now() + UN_ORA), ip } }),
    ]);
    await invia(this.db, u.id, 'reset', {
      a: u.email,
      oggetto: 'Decobrands: reimposta la password',
      testo: `Ciao ${u.nome},\n\nper scegliere una nuova password apri questo link entro un'ora:\n${indirizzo()}/accesso/password/${codice}\n\n` +
        "Se non l'hai chiesto tu, ignora questa email: la password resta quella di prima.",
    });
  }

  /** Nuova password dal link: il link vale una volta; chiude tutte le sessioni dell'utente. */
  @Post('reimposta')
  @HttpCode(204)
  @Pubblica()
  @UseGuards(TentativiGuard)
  async reimposta(@Req() req: Request, @Body() b: Reimposta) {
    const link = await this.db.accessi_link.findUnique({ where: { impronta: impronta(b.codice) }, include: { utente: true } });
    const motivo = !link || !link.utente.attivo ? 'sconosciuto' : link.usato_il ? 'usato' : link.scade_il < new Date() ? 'scaduto' : null;
    const evento = { tipo: 'auth', azione: 'password_reset', entita: 'utente', entita_id: link?.utente_id } as const;
    const ctx = { utente_id: link?.utente_id, ip: req.ip };
    if (motivo) {
      await logEventSicuro(this.db, { ...evento, esito: 'errore', dettaglio: { etichetta: link?.utente.username ?? '-', motivo } }, ctx);
      throw new BadRequestException('Il link non è valido o è scaduto: chiedine uno nuovo');
    }
    if (b.nuova.length < MINIMO) throw new BadRequestException(`La nuova password deve avere almeno ${MINIMO} caratteri`);
    const hash = await cifra(b.nuova);
    await this.db.$transaction(async (tx) => {
      // usato una volta sola anche con due richieste insieme: vince chi lo segna per primo
      const { count } = await tx.accessi_link.updateMany({ where: { id: link!.id, usato_il: null }, data: { usato_il: new Date() } });
      if (count !== 1) throw new BadRequestException('Il link non è valido o è scaduto: chiedine uno nuovo');
      // ricontrollo dentro la transazione: un utente disattivato nel frattempo non cambia password
      const { count: attivi } = await tx.utenti.updateMany({ where: { id: link!.utente_id, attivo: true }, data: { password_hash: hash, deve_cambiare_password: false } });
      if (attivi !== 1) throw new BadRequestException('Il link non è valido o è scaduto: chiedine uno nuovo');
      await tx.sessioni.deleteMany({ where: { utente_id: link!.utente_id } });
      await logEvent(tx, { ...evento, esito: 'successo', dettaglio: { etichetta: link!.utente.username } }, ctx);
    });
  }
}
