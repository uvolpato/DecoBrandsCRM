import { BadRequestException, Body, Controller, Get, HttpCode, Param, Post, Put, Req } from '@nestjs/common';
import { IsObject } from 'class-validator';
import { Prisma } from '@prisma/client';
import { ImapFlow } from 'imapflow';
import type { Request } from 'express';
import { Richiede, contesto } from './accesso';
import { creaPonte, pulisci } from './integra';
import {
  applica, casellaConfig, integraConfig, letturaConfig, postaConfig, sezionePubblica, sezioneDi,
} from './impostazioni';
import { creaTrasporto } from './posta';
import { provaConnettore } from './lettore';
import { PrismaService } from './prisma.service';
import { logEvent } from './registro';

// Rotta delle Impostazioni (§7.15, D-65): lettura e salvataggio in una transazione con l'evento
// (V13); *Prova la connessione* prova i valori salvati, non quelli digitati. Le GET e le prove non
// scrivono eventi (§15.1). I segreti non escono mai dal server e non finiscono nel registro (§15.8).

class Salva {
  @IsObject()
  valori!: Record<string, unknown>;
}

/** Parametri che vivono nel .env del server, non nelle Impostazioni (D-70): si mostrano in sola
 *  lettura, con la sezione che li usa e se ci sono; i valori segreti non escono mai. */
const AMBIENTE = [
  { nome: 'SEGRETI_CHIAVE', uso: 'Chiave per cifrare le password salvate qui: senza, non si possono salvare segreti.', sezioni: ['casella', 'lettura', 'posta', 'integra'], segreto: true, obbligatorio: true },
  { nome: 'DOCUMENTI_DIR', uso: 'Cartella dei documenti arrivati, sul server.', sezioni: ['casella', 'conservazione'], obbligatorio: true },
  { nome: 'DOCUMENTI_MAX_MB', uso: 'Dimensione massima di un documento caricato, in MB (20 se non scritto).', sezioni: ['casella'] },
  { nome: 'APP_URL', uso: 'Indirizzo pubblico dell’app, per i link nelle email (localhost se non scritto).', sezioni: ['posta'] },
];

const TESTO_PROVA: Record<string, string> = {
  casella: 'Casella non configurata: completa server, utente e password.',
  posta: 'Posta non configurata: completa server, utente e password.',
  lettura: 'Server di lettura non configurato: scegli il modello e imposta i suoi parametri.',
  integra: 'Sincronizzazione non configurata: completa server, database, utente e password.',
};

@Controller('impostazioni')
export class ImpostazioniController {
  constructor(private readonly db: PrismaService) {}

  /** Le sei sezioni, in ordine fisso, con metadati e valori; i segreti solo `impostata`. */
  @Get()
  @Richiede('sistema.impostazioni')
  async elenco() {
    const sezioni = await Promise.all((['azienda', 'casella', 'lettura', 'posta', 'integra', 'conservazione'] as const)
      .map((chiave) => sezionePubblica(this.db, chiave)));
    const ambiente = AMBIENTE.map(({ nome, uso, sezioni: dove, segreto, obbligatorio }) => ({
      nome, uso, sezioni: dove, obbligatorio: !!obbligatorio,
      impostato: !!process.env[nome],
      valore: segreto ? null : (process.env[nome] ?? null), // un segreto non esce nemmeno qui
    }));
    return { sezioni, ambiente };
  }

  @Put(':chiave')
  @Richiede('sistema.impostazioni')
  async salva(@Req() req: Request, @Param('chiave') chiave: string, @Body() b: Salva) {
    const ctx = contesto(req);
    const utenteId = ctx.utente_id ?? null;
    // una transazione: upsert della riga + evento, tutto da tx (V13); sezione sconosciuta → 404
    await this.db.$transaction(async (tx) => {
      const { nuovo, prima, dopo } = await applica(tx, chiave, b.valori);
      await tx.impostazioni.upsert({
        where: { chiave },
        update: { valore: nuovo as Prisma.InputJsonValue, aggiornato_da: utenteId },
        create: { chiave, valore: nuovo as Prisma.InputJsonValue, aggiornato_da: utenteId },
      });
      if (Object.keys(prima).length) {
        await logEvent(tx, {
          tipo: 'crud', azione: 'update', entita: 'impostazione', entita_id: null, esito: 'successo',
          dettaglio: { etichetta: sezioneDi(chiave).titolo, chiave, prima, dopo },
        }, ctx);
      }
    });
    return sezionePubblica(this.db, chiave);
  }

  /** Prova i valori salvati; una prova fallita è 200 {ok:false}, non un 500 (§7.15). */
  @Post(':chiave/prova')
  @HttpCode(200)
  @Richiede('sistema.impostazioni')
  async prova(@Param('chiave') chiave: string) {
    sezioneDi(chiave); // 404 per chiave sconosciuta
    if (chiave === 'azienda' || chiave === 'conservazione') {
      throw new BadRequestException('Questa sezione non ha una connessione da provare');
    }
    const inizio = Date.now();
    const ms = () => Date.now() - inizio;
    if (chiave === 'casella') return this.provaCasella(ms);
    if (chiave === 'posta') return this.provaPosta(ms);
    if (chiave === 'lettura') return this.provaLettura(ms);
    return this.provaIntegra(ms);
  }

  private async provaCasella(ms: () => number) {
    const c = await casellaConfig(this.db);
    if (!c) return { ok: false, ms: ms(), testo: TESTO_PROVA.casella };
    const client = new ImapFlow({ host: c.server, port: c.porta, secure: c.porta === 993, auth: { user: c.utente, pass: c.password }, logger: false });
    try {
      await client.connect();
      const lettura = await client.mailboxOpen(c.cartella || 'INBOX');
      await client.mailboxOpen(c.cartella_lette || c.cartella || 'INBOX');
      return { ok: true, ms: ms(), testo: `Casella raggiungibile · ${lettura.exists} email nella cartella` };
    } catch (e) {
      return { ok: false, ms: ms(), testo: 'Connessione alla casella non riuscita: ' + pulisci(e) };
    } finally {
      await client.logout().catch(() => undefined);
    }
  }

  private async provaPosta(ms: () => number) {
    const c = await postaConfig(this.db);
    if (!c) return { ok: false, ms: ms(), testo: TESTO_PROVA.posta };
    try {
      await creaTrasporto(c).verify();
      return { ok: true, ms: ms(), testo: 'Accesso SMTP riuscito.' };
    } catch (e) {
      return { ok: false, ms: ms(), testo: 'Connessione alla posta non riuscita: ' + pulisci(e) };
    }
  }

  private async provaLettura(ms: () => number) {
    const c = await letturaConfig(this.db);
    if (!c) return { ok: false, ms: ms(), testo: TESTO_PROVA.lettura };
    if (c.connettore !== 'llamacloud_eu') {
      return { ok: false, ms: ms(), testo: 'Il connettore locale non è ancora disponibile: si accende quando arriva la macchina.' };
    }
    const r = await provaConnettore(c);
    return { ok: r.ok, ms: ms(), testo: r.testo };
  }

  private async provaIntegra(ms: () => number) {
    const c = await integraConfig(this.db);
    if (!c) return { ok: false, ms: ms(), testo: TESTO_PROVA.integra };
    const url = `postgresql://${encodeURIComponent(c.utente)}:${encodeURIComponent(c.password)}@${c.server}:5432/${encodeURIComponent(c.database)}`;
    const ponte = creaPonte(url);
    try {
      const [clienti, fornitori] = await Promise.all([
        ponte.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${c.schema}.v_clienti`),
        ponte.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${c.schema}.v_fornitori`),
      ]);
      return { ok: true, ms: ms(), testo: `Database ponte raggiungibile · ${clienti.rows[0].n} clienti, ${fornitori.rows[0].n} fornitori` };
    } catch (e) {
      return { ok: false, ms: ms(), testo: 'Database ponte non raggiungibile: ' + pulisci(e) };
    } finally {
      await ponte.end();
    }
  }
}
