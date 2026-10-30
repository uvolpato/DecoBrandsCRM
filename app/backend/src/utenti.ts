import {
  Body, ConflictException, Controller, Delete, ForbiddenException, Get, HttpCode,
  NotFoundException, Param, ParseIntPipe, Post, Put, Req,
} from '@nestjs/common';
import { Prisma, type utenti } from '@prisma/client';
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import type { Request } from 'express';
import { contesto, permessiDi, Richiede } from './accesso';
import { cifra, provvisoria } from './password';
import { mandaPassword } from './posta';
import { PrismaService } from './prisma.service';
import { logEvent } from './registro';

// Utenti e ruoli (§7.13, §8.3, D-39). Tutte le regole stanno qui, sul server (V12): l'interfaccia
// nasconde i pulsanti, ma è questo file che decide.

class DatiUtente {
  @IsString() @Matches(/^[a-z0-9._-]{2,50}$/, { message: 'Il nome utente può avere minuscole, numeri, punto o trattino (2–50 caratteri, senza @)' })
  username!: string;
  @IsString() @MaxLength(120) nome!: string;
  @IsEmail({}, { message: 'L’email non è valida' }) @MaxLength(200) email!: string;
  @IsIn(['amministratore', 'operatore', 'lettura'], { message: 'Ruolo non valido' }) ruolo!: string; // mai superutente (§3.3)
}

/** Nella modifica il ruolo si può non mandare: chi modifica i propri dati (anche il superutente) lo lascia com'è. */
class ModificaUtente extends DatiUtente {
  @IsOptional() @IsIn(['amministratore', 'operatore', 'lettura'], { message: 'Ruolo non valido' }) declare ruolo: string;
}

class Attivo {
  @IsBoolean() attivo!: boolean;
}

// Quello che esce verso il browser: mai l'hash della password.
const VISIBILI = {
  id: true, username: true, email: true, nome: true, ruolo: true, attivo: true, sistema: true,
  deve_cambiare_password: true, creato_il: true, ultimo_accesso: true, ultimo_invio: true,
} satisfies Prisma.utentiSelect;

type Tx = Prisma.TransactionClient;

@Controller('utenti')
export class UtentiController {
  constructor(private readonly db: PrismaService) {}

  @Get()
  @Richiede('gestione')
  elenco() {
    return this.db.utenti.findMany({ select: VISIBILI, orderBy: { nome: 'asc' } }).then((r) => r.map(fuori));
  }

  @Get(':id')
  @Richiede('gestione')
  async scheda(@Param('id', ParseIntPipe) id: number) {
    return fuori(await this.trova(this.db, id));
  }

  /** Nuovo utente: password provvisoria per email, da cambiare al primo accesso. */
  @Post()
  @Richiede('gestione')
  async crea(@Req() req: Request, @Body() b: DatiUtente) {
    puoDareRuolo(req, b.ruolo);
    const password = provvisoria();
    const hash = await cifra(password);
    const u = await unico(() => this.db.$transaction(async (tx) => {
      const u = await tx.utenti.create({ data: { ...pulisci(b), password_hash: hash } });
      await logEvent(tx, { tipo: 'crud', azione: 'create', entita: 'utente', entita_id: u.id, esito: 'successo',
        dettaglio: { etichetta: u.username, nome: u.nome, email: u.email, ruolo: u.ruolo } }, contesto(req));
      await logEvent(tx, { tipo: 'auth', azione: 'password_temp', entita: 'utente', entita_id: u.id, esito: 'successo',
        dettaglio: { etichetta: u.username, tipo: 'benvenuto' } }, contesto(req));
      return u;
    }));
    await mandaPassword(this.db, u, password, 'benvenuto'); // dopo il commit (V13)
    return fuori(await this.trova(this.db, Number(u.id)));
  }

  @Put(':id')
  @Richiede('gestione')
  async modifica(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() b: ModificaUtente) {
    await unico(() => this.db.$transaction(async (tx) => {
      const prima = await this.gestibile(tx, req, id, true);
      const io = req.utente!;
      if (prima.id === io.id && b.ruolo && b.ruolo !== prima.ruolo) throw new ForbiddenException('Non puoi cambiare il tuo ruolo');
      const nuovo = { ...pulisci(b), ruolo: prima.ruolo === 'superutente' || !b.ruolo ? prima.ruolo : b.ruolo };
      if (nuovo.ruolo !== prima.ruolo) puoDareRuolo(req, nuovo.ruolo);
      if (prima.ruolo === 'amministratore' && nuovo.ruolo !== 'amministratore') await restaUnAmministratore(tx, prima);
      const diff = differenze(prima, nuovo);
      if (!diff) return;
      await tx.utenti.update({ where: { id: prima.id }, data: nuovo });
      await logEvent(tx, { tipo: 'crud', azione: 'update', entita: 'utente', entita_id: prima.id, esito: 'successo',
        dettaglio: { etichetta: nuovo.username, ...diff } }, contesto(req));
    }));
    return fuori(await this.trova(this.db, id));
  }

  /** Disattiva (fuori subito: le sue sessioni si chiudono) o riattiva. */
  @Post(':id/attivo')
  @HttpCode(200)
  @Richiede('gestione')
  async attivo(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() b: Attivo) {
    await this.db.$transaction(async (tx) => {
      const u = await this.gestibile(tx, req, id);
      if (u.attivo === b.attivo) return;
      if (!b.attivo && u.ruolo === 'amministratore') await restaUnAmministratore(tx, u);
      await tx.utenti.update({ where: { id: u.id }, data: { attivo: b.attivo } });
      if (!b.attivo) await tx.sessioni.deleteMany({ where: { utente_id: u.id } });
      await logEvent(tx, { tipo: 'stato', azione: 'change_state', entita: 'utente', entita_id: u.id, esito: 'successo',
        dettaglio: { etichetta: u.username, prima: { attivo: u.attivo }, dopo: { attivo: b.attivo } } }, contesto(req));
    });
    return fuori(await this.trova(this.db, id));
  }

  /** Elimina. Chi ha toccato importi (correzioni, liquidazioni chiuse) non si elimina: si disattiva (§7.13). */
  @Delete(':id')
  @HttpCode(204)
  @Richiede('gestione')
  async elimina(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    try {
      await this.db.$transaction(async (tx) => {
        const u = await this.gestibile(tx, req, id);
        if (u.ruolo === 'amministratore' && u.attivo) await restaUnAmministratore(tx, u);
        await tx.sessioni.deleteMany({ where: { utente_id: u.id } });
        await tx.utenti.delete({ where: { id: u.id } }); // nel registro utente_id passa a NULL, il nome resta in etichetta
        await logEvent(tx, { tipo: 'crud', azione: 'delete', entita: 'utente', entita_id: u.id, esito: 'successo',
          dettaglio: { etichetta: u.username, nome: u.nome, email: u.email, ruolo: u.ruolo } }, contesto(req));
      });
    } catch (e) {
      // FK con ON DELETE RESTRICT (correzioni, liquidazioni, bollettini chiusi: §4.2, D-34)
      if (e instanceof Prisma.PrismaClientKnownRequestError && ['P2003', 'P2014'].includes(e.code)) {
        throw new ConflictException('Questo utente ha già fatto operazioni sugli importi: disattivalo invece di eliminarlo');
      }
      throw e;
    }
  }

  /** Reimposta la password: nuova provvisoria per email; quella di prima e le sessioni aperte non valgono più. */
  @Post(':id/password')
  @HttpCode(204)
  @Richiede('gestione')
  async reimposta(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    const password = provvisoria();
    const hash = await cifra(password);
    const u = await this.db.$transaction(async (tx) => {
      const u = await this.gestibile(tx, req, id);
      await tx.utenti.update({ where: { id: u.id }, data: { password_hash: hash, deve_cambiare_password: true } });
      await tx.sessioni.deleteMany({ where: { utente_id: u.id } });
      await tx.accessi_link.deleteMany({ where: { utente_id: u.id, usato_il: null } });
      await logEvent(tx, { tipo: 'auth', azione: 'password_temp', entita: 'utente', entita_id: u.id, esito: 'successo',
        dettaglio: { etichetta: u.username, tipo: 'password' } }, contesto(req));
      return u;
    });
    await mandaPassword(this.db, u, password, 'password');
  }

  private async trova(db: Tx, id: number) {
    const u = await db.utenti.findUnique({ where: { id: BigInt(id) }, select: VISIBILI });
    if (!u) throw new NotFoundException('Utente non trovato');
    return u;
  }

  /**
   * L'utente che si vuole toccare, bloccato fino alla fine della transazione (V13), se chi opera può
   * gestirlo: mai l'utente dei servizi né il superutente (salvo i propri dati), gli amministratori solo
   * il superutente; su sé stessi solo i propri dati (modifica), mai stato, eliminazione o reimpostazione.
   */
  private async gestibile(tx: Tx, req: Request, id: number, propriDati = false): Promise<utenti> {
    await tx.$queryRaw`SELECT id FROM utenti WHERE id = ${BigInt(id)} FOR UPDATE`;
    const u = await tx.utenti.findUnique({ where: { id: BigInt(id) } });
    if (!u) throw new NotFoundException('Utente non trovato');
    const io = req.utente!;
    if (u.id === io.id) {
      if (propriDati) return u;
      throw new ForbiddenException('Non puoi farlo sul tuo utente');
    }
    if (u.sistema) throw new ForbiddenException('L’utente dei servizi automatici non si modifica');
    if (u.ruolo === 'superutente') throw new ForbiddenException('Il superutente non si modifica da qui');
    if (u.ruolo === 'amministratore' && !permessiDi(io.ruolo).includes('amministratori')) {
      throw new ForbiddenException('Gli amministratori li gestisce il superutente');
    }
    return u;
  }
}

/** Solo il superutente dà il ruolo di amministratore (D-39). */
function puoDareRuolo(req: Request, ruolo: string) {
  if (ruolo === 'amministratore' && !permessiDi(req.utente!.ruolo).includes('amministratori')) {
    throw new ForbiddenException('Solo il superutente crea gli amministratori');
  }
}

/** Deve restare almeno un amministratore attivo (§7.13). Le righe si bloccano: due tolte insieme non passano entrambe. */
export async function restaUnAmministratore(tx: Tx, tolto: utenti) {
  const altri = await tx.$queryRaw<{ id: bigint }[]>`
    SELECT id FROM utenti WHERE ruolo = 'amministratore' AND attivo AND NOT sistema AND id <> ${tolto.id} FOR UPDATE`;
  if (!altri.length) throw new ConflictException('Deve restare almeno un amministratore attivo');
}

const pulisci = (b: DatiUtente | ModificaUtente) => ({ username: b.username.trim().toLowerCase(), nome: b.nome.trim(), email: b.email.trim().toLowerCase(), ruolo: b.ruolo });

/** Solo i campi cambiati, per il registro (§15.4). */
function differenze(prima: utenti, dopo: ReturnType<typeof pulisci>) {
  const k = (Object.keys(dopo) as (keyof typeof dopo)[]).filter((c) => prima[c] !== dopo[c]);
  return k.length ? { prima: Object.fromEntries(k.map((c) => [c, prima[c]])), dopo: Object.fromEntries(k.map((c) => [c, dopo[c]])) } : null;
}

/** Nome utente o email già usati: messaggio chiaro invece dell'errore del database. */
async function unico<T>(fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      // con l'adapter pg il vincolo violato sta nel messaggio originale (utenti_email_key / utenti_username_key)
      const campo = JSON.stringify(e.meta ?? {});
      throw new ConflictException(campo.includes('utenti_username_key') ? 'Il nome utente è già di un altro utente' : 'L’email è già di un altro utente');
    }
    throw e;
  }
}

/** BigInt non va in JSON: gli id escono come testo. */
const fuori = <T extends { id: bigint }>(u: T) => ({ ...u, id: String(u.id) });
