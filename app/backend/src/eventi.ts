import { Controller, Injectable, Logger, type MessageEvent, type OnModuleDestroy, Req, Sse } from '@nestjs/common';
import { Observable, Subject, filter, interval, mergeMap, takeUntil } from 'rxjs';
import type { Request } from 'express';
import { Richiede } from './accesso';
import { PrismaService } from './prisma.service';

// Aggiornamenti dal server (F4-A6, §16.4.2, D-23): un canale Server-Sent Events che dice quali aree sono
// cambiate. Le aree si ricavano dal registro (D-31), non da chiamate sparse nei servizi: un solo ciclo
// ogni ~4 s legge le righe nuove, le unisce in un evento solo e lo manda a tutte le schede collegate.
// Il ciclo non interroga il database per client e gira solo mentre qualcuno è collegato.

/** Codici del registro → aree della barra. Fissa e provata senza SSE. */
const PREFISSI: [string, string][] = [
  ['pratica.', 'pratiche'],
  ['documento.', 'documenti'],
  ['bollettino.', 'bollettini'], ['calcolo.', 'bollettini'],
  ['liquidazione.', 'liquidazioni'], ['provvigioni.', 'liquidazioni'],
  ['fornitore.', 'anagrafiche'], ['cliente.', 'anagrafiche'], ['subagente.', 'anagrafiche'], ['agente.', 'anagrafiche'],
  ['eccezione.', 'anagrafiche'], ['percentuale.', 'anagrafiche'], ['interscambio.', 'anagrafiche'], ['integra.', 'anagrafiche'],
  ['utente.', 'utenti'], ['auth.', 'utenti'],
  ['impostazione.', 'impostazioni'],
];

/** Codici generici (`crud.*`, `stato.change_state`): l'area la dice la colonna `registro.entita`. */
const ENTITA: Record<string, string> = {
  pratica: 'pratiche', documento: 'documenti', bollettino: 'bollettini', riga_bollettino: 'bollettini',
  liquidazione: 'liquidazioni',
  fornitore: 'anagrafiche', cliente: 'anagrafiche', subagente: 'anagrafiche', agente: 'anagrafiche',
  eccezione: 'anagrafiche', percentuale: 'anagrafiche', interscambio: 'anagrafiche', scaglione: 'anagrafiche',
  utente: 'utenti', impostazione: 'impostazioni',
};

/** Aree toccate da un evento: prima il prefisso del codice, poi (codici generici) l'entità. */
export function areeDi(codice: string, entita?: string | null): string[] {
  const prefisso = PREFISSI.find(([p]) => codice.startsWith(p));
  if (prefisso) return [prefisso[1]];
  const area = entita ? ENTITA[entita] : undefined;
  return area ? [area] : [];
}

/** Righe nuove del registro → elenco delle aree, senza doppioni. */
export function areeDelleRighe(righe: { codice: string; entita: string | null }[]): string[] {
  const aree = new Set<string>();
  for (const r of righe) for (const a of areeDi(r.codice, r.entita)) aree.add(a);
  return [...aree];
}

/** Un ciclo di lettura: righe nuove della finestra, il nuovo ultimo e le aree toccate.
 *  L'id (BIGSERIAL) si assegna all'INSERT, non al commit: una transazione lunga committa dopo una corta
 *  con id più alto. La finestra rilegge gli ultimi 500 id e `visti` scarta quelli già emessi, così
 *  l'evento committato fuori ordine arriva al giro dopo (A3-06). */
export async function nuoveAree(db: Pick<PrismaService, 'registro' | '$queryRaw'>, ultimo: bigint, visti: Set<bigint>) {
  // take: un giro non deve portarsi dietro un registro cresciuto di colpo; il resto arriva al giro dopo
  const righe = await db.registro.findMany({
    where: { id: { gt: ultimo - 500n } },
    orderBy: { id: 'asc' },
    take: 1000,
    select: { id: true, codice: true, entita: true },
  });
  if (!righe.length) {
    // registro riportato indietro (ripristino di un backup, dati di prova ricaricati): si riparte
    // dall'ultimo id e si dimentica ciò che si era già visto, altrimenti il flusso resterebbe zitto
    const [r] = await db.$queryRaw<{ id: bigint | null }[]>`SELECT max(id) AS id FROM registro`;
    const max = r.id ?? 0n;
    visti.clear();
    return { ultimo: max < ultimo ? max : ultimo, aree: [] as string[] };
  }
  const nuove = righe.filter((r) => !visti.has(r.id));
  for (const r of righe) visti.add(r.id);
  const nuovoUltimo = righe[righe.length - 1].id;
  // ponytail: finestra di 500 id; LISTEN/NOTIFY se il registro cresce più di 500 righe in 4 s
  for (const id of visti) if (id < nuovoUltimo - 500n) visti.delete(id);
  return { ultimo: nuovoUltimo, aree: areeDelleRighe(nuove) };
}

@Injectable()
export class EventiService implements OnModuleDestroy {
  private readonly log = new Logger('Eventi');
  private readonly canale = new Subject<MessageEvent>();
  private ultimo: bigint | null = null;
  private visti = new Set<bigint>();
  private inCorso = false;
  private clienti = 0;
  private ciclico?: ReturnType<typeof setInterval>;
  private battito?: ReturnType<typeof setInterval>;

  constructor(private readonly db: PrismaService) {}

  /** Un flusso per chi ascolta; il ciclo parte al primo e si ferma con l'ultimo. La sessione si
   *  ricontrolla ogni minuto (A1-08, D-38): se la riga sparisce o scade, il flusso si chiude. */
  flusso(sessionID: string, periodo = 60_000): Observable<MessageEvent> {
    const chiuso = interval(periodo).pipe(
      mergeMap(() => this.sessioneViva(sessionID)),
      filter((viva) => !viva),
    );
    return new Observable((sottoscrittore) => {
      this.clienti++;
      if (this.clienti === 1) void this.avvia();
      const s = this.canale.pipe(takeUntil(chiuso)).subscribe(sottoscrittore);
      return () => {
        s.unsubscribe();
        this.clienti--;
        if (this.clienti <= 0) this.ferma();
      };
    });
  }

  /** Chiamato dal timer (e dalle prove): legge le righe nuove e manda le aree cambiate. */
  async prossimo() {
    if (this.inCorso) return; // un giro lento non si sovrappone al successivo
    this.inCorso = true;
    try {
      if (this.ultimo == null) {
        this.ultimo = await this.maxId();
        return;
      }
      const { ultimo, aree } = await nuoveAree(this.db, this.ultimo, this.visti);
      this.ultimo = ultimo;
      if (aree.length) this.canale.next({ data: { aree } });
    } catch (e) {
      // il registro non si legge: si riprova al giro dopo, il canale resta aperto
      this.log.warn('lettura del registro non riuscita: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      this.inCorso = false;
    }
  }

  onModuleDestroy() {
    this.ferma();
    this.canale.complete();
  }

  /** La riga di sessione c'è ancora e non è scaduta? (A1-08, D-38). */
  private async sessioneViva(sid: string) {
    const s = await this.db.sessioni.findUnique({ where: { sid }, select: { expire: true } });
    return s != null && s.expire.getTime() > Date.now();
  }

  private async maxId() {
    // nessun evento vecchio al primo collegamento: si parte dall'ultimo id
    const [r] = await this.db.$queryRaw<{ id: bigint | null }[]>`SELECT max(id) AS id FROM registro`;
    return r.id ?? 0n;
  }

  private async avvia() {
    try {
      this.ultimo = await this.maxId();
    } catch (e) {
      this.ultimo = null; // si riprova al primo giro
      this.log.warn('lettura del registro non riuscita: ' + (e instanceof Error ? e.message : String(e)));
    }
    if (!this.clienti) return;
    // ponytail: un ciclo per processo; con più processi serve un canale condiviso (Postgres LISTEN/NOTIFY)
    this.ciclico = setInterval(() => void this.prossimo(), 4000);
    // battito: proxy e browser non chiudono un canale zitto
    this.battito = setInterval(() => this.canale.next({ data: { battito: true } }), 25_000);
  }

  private ferma() {
    if (this.ciclico) clearInterval(this.ciclico);
    if (this.battito) clearInterval(this.battito);
    this.ciclico = this.battito = undefined;
  }
}

@Controller('eventi')
export class EventiController {
  constructor(private readonly eventi: EventiService) {}

  /** Canale degli aggiornamenti (§16.4.2, D-23): solo per chi è entrato. */
  @Sse('flusso')
  @Richiede('collegato')
  flusso(@Req() req: Request): Observable<MessageEvent> {
    return this.eventi.flusso(req.sessionID);
  }
}
