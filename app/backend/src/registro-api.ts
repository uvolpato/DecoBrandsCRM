import { Controller, Get, Injectable, Logger, NotFoundException, Param, ParseIntPipe, Query, Res, StreamableFile } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, MaxLength, Min } from 'class-validator';
import type { Response } from 'express';
import { Richiede } from './accesso';
import { PrismaService } from './prisma.service';
import { pulisciRegistro } from './registro';

// Pagina del registro (F5-A2, §7.11, §15.6, D-31): elenco, dettaglio ed esportazione in **sola
// lettura** (V10). Filtri, conteggi dei segmenti (D-23), ordinamento, pagine e riferimenti alle
// pagine vere li calcola il server (V12); il browser manda solo le scelte.
// Il controller sta qui e non in registro.ts per non creare un ciclo di import con accesso.ts.

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^\d{1,18}$/;
const ELENCO_ID = /^\d{1,18}(,\d{1,18})*$/;
const VISTE = ['tutto', 'aperte', 'errori'] as const;
const GENERI = ['evento', 'anomalia'] as const;
const LIVELLI = ['info', 'attenzione', 'errore'] as const;
const ORDINI = ['ts', 'livello', 'codice', 'servizio', 'entita', 'esito', 'messaggio', 'volte'] as const;
type Vista = (typeof VISTE)[number];

class Filtri {
  @IsOptional() @IsIn(VISTE) vista?: Vista; // segmenti Tutto · Anomalie aperte · Errori
  @IsOptional() @IsIn(GENERI) genere?: string;
  @IsOptional() @IsIn(LIVELLI) livello?: string;
  @IsOptional() @IsString() @MaxLength(50) servizio?: string;
  @IsOptional() @IsString() @MaxLength(50) codice?: string;
  @IsOptional() @IsString() @MaxLength(50) entita?: string;
  @IsOptional() @Matches(ELENCO_ID) utenti?: string; // selezione multipla (D-22)
  @IsOptional() @Matches(DATA) dal?: string;
  @IsOptional() @Matches(DATA) al?: string;
  @IsOptional() @IsString() @MaxLength(200) q?: string; // messaggio, codice ed etichetta del dettaglio
  @IsOptional() @IsUUID() operazione?: string; // *Stessa operazione*
  @IsOptional() @IsIn(ORDINI) ordina?: (typeof ORDINI)[number];
  @IsOptional() @IsIn(['asc', 'desc']) dir?: 'asc' | 'desc';
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) pagina?: number;
}

type RigaDb = {
  id: bigint; ts: Date; genere: string; livello: string; codice: string;
  servizio: string | null; entita: string | null; entita_id: bigint | null; esito: string | null;
  messaggio: string | null; dettaglio: unknown; utente_id: bigint | null; utente_nome: string | null;
  operazione_id: string | null; volte: number; stato: string | null;
};

type Riferimento = { testo: string; href: string | null };

const etichettaDi = (dettaglio: unknown) => {
  const e = (dettaglio as { etichetta?: unknown } | null)?.etichetta;
  return typeof e === 'string' ? e : null;
};

const periodoDi = (dettaglio: unknown) => (dettaglio as { periodo?: { anno?: unknown; trimestre?: unknown } } | null)?.periodo;

/** Riferimento alla pagina vera (§7.11); per gli altri `href: null`. */
function riferimento(entita: string | null, entitaId: bigint | null, messaggio: string | null, codice: string, dettaglio: unknown): Riferimento {
  const testo = etichettaDi(dettaglio) ?? messaggio ?? codice;
  if (entitaId == null) return { testo, href: null };
  const id = String(entitaId);
  const periodo = periodoDi(dettaglio);
  const liquidazione = periodo?.anno != null && periodo?.trimestre != null
    ? `/liquidazioni/${String(periodo.anno)}/${String(periodo.trimestre)}` : null;
  const href = entita === 'pratica' ? '/pratiche/' + id
    : entita === 'bollettino' ? '/bollettini/' + id
      : entita === 'documento' ? '/documenti/' + id
        : entita === 'fornitore' ? '/fornitori/' + id
          : entita === 'cliente' ? '/clienti/' + id
            : entita === 'subagente' ? '/subagenti/' + id
              : entita === 'utente' ? '/utenti/' + id
                : entita === 'liquidazione' ? liquidazione : null;
  return { testo, href };
}

const utenteDi = (r: { utente_id: bigint | null; utente_nome: string | null }) =>
  r.utente_id == null ? null : { id: String(r.utente_id), nome: r.utente_nome ?? '' };

/** Filtri comuni a elenco ed esportazione (§7.11, §15.6). La vista (segmento) resta fuori: i
 *  conteggi dei segmenti contano gli altri filtri (D-23). */
function query(q: Filtri) {
  const filtri: Prisma.Sql[] = [Prisma.sql`TRUE`];
  if (q.genere) filtri.push(Prisma.sql`r.genere = ${q.genere}`);
  if (q.livello) filtri.push(Prisma.sql`r.livello = ${q.livello}`);
  if (q.servizio) filtri.push(Prisma.sql`r.servizio = ${q.servizio}`);
  if (q.codice) filtri.push(Prisma.sql`r.codice = ${q.codice}`);
  if (q.entita) filtri.push(Prisma.sql`r.entita = ${q.entita}`);
  if (q.utenti) filtri.push(Prisma.sql`r.utente_id IN (${Prisma.join(q.utenti.split(',').map((x) => BigInt(x)))})`);
  if (q.dal) filtri.push(Prisma.sql`(r.ts AT TIME ZONE 'Europe/Rome')::date >= ${q.dal}::date`);
  if (q.al) filtri.push(Prisma.sql`(r.ts AT TIME ZONE 'Europe/Rome')::date <= ${q.al}::date`);
  if (q.operazione) filtri.push(Prisma.sql`r.operazione_id = ${q.operazione}::uuid`);
  const testo = (q.q ?? '').trim();
  if (testo) {
    const simile = '%' + testo.replace(/[\\%_]/g, '\\$&') + '%';
    filtri.push(Prisma.sql`(r.messaggio ILIKE ${simile} OR r.codice ILIKE ${simile} OR r.dettaglio->>'etichetta' ILIKE ${simile})`);
  }
  const base = Prisma.sql`
    WITH base AS (
      SELECT r.id, r.ts, r.genere, r.livello, r.codice, r.servizio, r.entita, r.entita_id,
             r.esito, r.messaggio, r.dettaglio, r.utente_id, u.nome AS utente_nome,
             r.operazione_id, r.volte, r.stato
      FROM registro r
      LEFT JOIN utenti u ON u.id = r.utente_id
      WHERE ${Prisma.join(filtri, ' AND ')}
    )`;
  const vista = q.vista ?? 'tutto';
  const scelta = vista === 'aperte' ? Prisma.sql`genere = 'anomalia' AND stato = 'aperta'`
    : vista === 'errori' ? Prisma.sql`livello = 'errore'` : Prisma.sql`TRUE`;
  return { base, scelta, vista };
}

/** Colonne da un elenco chiuso (ORDINI, validato): mai testo del browser nella query. */
const COLONNA: Record<(typeof ORDINI)[number], Prisma.Sql> = {
  ts: Prisma.sql`ts`,
  livello: Prisma.sql`CASE livello WHEN 'errore' THEN 0 WHEN 'attenzione' THEN 1 WHEN 'info' THEN 2 ELSE 3 END`,
  codice: Prisma.sql`codice`,
  servizio: Prisma.sql`coalesce(servizio, '')`,
  entita: Prisma.sql`coalesce(entita, '')`,
  esito: Prisma.sql`coalesce(esito, '')`,
  messaggio: Prisma.sql`coalesce(messaggio, codice)`,
  volte: Prisma.sql`volte`,
};

const SERVIZI: Record<string, string> = {
  casella: 'Casella dei documenti',
  lettura: 'Server di lettura',
  integra: 'Sincronizzazione da Integra',
  posta: 'Posta in uscita',
};

/** gg/mm/aaaa hh:mm:ss all'ora italiana, come le altre esportazioni. */
const quandoCsv = (d: Date) =>
  d.toLocaleString('it-IT', {
    timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).replace(',', '');

const oggiRoma = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });

@Controller('registro')
export class RegistroController {
  constructor(private readonly db: PrismaService) {}

  /** L'elenco (§7.11, §15.6): filtri combinabili, conteggi dei segmenti sugli altri filtri (D-23),
   *  ordinamento e pagine sul server; il riferimento alle pagine vere è risolto qui (V12). */
  @Get()
  @Richiede('sistema.registro')
  async elenco(@Query() q: Filtri) {
    const { base, scelta, vista } = query(q);
    const [c] = await this.db.$queryRaw<{ tutto: number; aperte: number; errori: number }[]>`${base}
      SELECT count(*)::int AS tutto,
             count(*) FILTER (WHERE genere = 'anomalia' AND stato = 'aperta')::int AS aperte,
             count(*) FILTER (WHERE livello = 'errore')::int AS errori
      FROM base`;
    const totale = c[vista];

    const ordina = q.ordina ?? 'ts';
    const dir = q.dir ?? (ordina === 'ts' ? 'desc' : 'asc');
    const ordine = Prisma.sql`ORDER BY ${COLONNA[ordina]} ${dir === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`}, id DESC`;
    const pagine = Math.max(1, Math.ceil(totale / 50));
    const pagina = Math.min(Math.max(q.pagina ?? 0, 0), pagine - 1);

    const [righe, [voci]] = await Promise.all([
      this.db.$queryRaw<RigaDb[]>`${base}
        SELECT * FROM base WHERE ${scelta}
        ${ordine}
        LIMIT 50 OFFSET ${pagina * 50}`,
      this.db.$queryRaw<{ codici: string[]; servizi: string[]; entita: string[] }[]>`
        SELECT
          coalesce((SELECT array_agg(DISTINCT codice ORDER BY codice) FROM registro), '{}') AS codici,
          coalesce((SELECT array_agg(DISTINCT servizio ORDER BY servizio) FROM registro WHERE servizio IS NOT NULL), '{}') AS servizi,
          coalesce((SELECT array_agg(DISTINCT entita ORDER BY entita) FROM registro WHERE entita IS NOT NULL), '{}') AS entita`,
    ]);

    return {
      righe: righe.map((r) => this.riga(r)),
      conteggi: { tutto: c.tutto, aperte: c.aperte, errori: c.errori },
      opzioni: {
        servizi: [
          ...Object.entries(SERVIZI).map(([valore, etichetta]) => ({ valore, etichetta })),
          ...voci.servizi.filter((s) => !SERVIZI[s]).map((s) => ({ valore: s, etichetta: s })),
        ],
        codici: voci.codici.map((v) => ({ valore: v, etichetta: v })),
        entita: voci.entita.map((v) => ({ valore: v, etichetta: v })),
      },
      pagina,
      pagine,
      totale,
      per_pagina: 50,
    };
  }

  /** Esportazione CSV (§15.6): le stesse righe filtrate, colonne fisse, `;`, UTF-8 con BOM.
   *  §15.2.6 non ha un codice per questa esportazione: non si scrive un evento. */
  @Get('export')
  @Richiede('sistema.registro')
  async esporta(@Query() q: Filtri, @Res({ passthrough: true }) res: Response) {
    const { base, scelta } = query(q);
    const righe = await this.db.$queryRaw<RigaDb[]>`${base}
      SELECT * FROM base WHERE ${scelta}
      ORDER BY ts DESC, id DESC`;
    const escaper = (v: unknown) => {
      const x = String(v ?? '');
      return /[;"\n\r]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x;
    };
    const csv = [
      ['ts', 'genere', 'livello', 'codice', 'utente', 'servizio', 'entita', 'entita_id', 'esito', 'messaggio', 'dettaglio'],
      ...righe.map((r) => [
        quandoCsv(r.ts), r.genere, r.livello, r.codice, r.utente_nome ?? '', r.servizio ?? '',
        r.entita ?? '', r.entita_id == null ? '' : String(r.entita_id), r.esito ?? '', r.messaggio ?? '',
        r.dettaglio == null ? '' : JSON.stringify(r.dettaglio),
      ]),
    ];
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="Registro_${oggiRoma()}.csv"`,
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(Buffer.from('\ufeff' + csv.map((r) => r.map(escaper).join(';')).join('\r\n'), 'utf8'));
  }

  /** Dettaglio in finestra (§7.11): tutti i campi e il `dettaglio` JSON. */
  @Get(':id')
  @Richiede('sistema.registro')
  async dettaglio(@Param('id', ParseIntPipe) id: number) {
    const r = await this.db.registro.findUnique({
      where: { id: BigInt(id) },
      include: { utente: { select: { id: true, nome: true, email: true } } },
    });
    if (!r) throw new NotFoundException('Evento non trovato');
    return {
      id: String(r.id), ts: r.ts.toISOString(), genere: r.genere, livello: r.livello, codice: r.codice,
      tipo: r.tipo, azione: r.azione, servizio: r.servizio, entita: r.entita,
      entita_id: r.entita_id == null ? null : String(r.entita_id), esito: r.esito, messaggio: r.messaggio,
      dettaglio: r.dettaglio,
      utente: r.utente ? { id: String(r.utente.id), nome: r.utente.nome, email: r.utente.email } : null,
      operazione_id: r.operazione_id,
      sessione_id: r.sessione_id, ip: r.ip, volte: r.volte, stato: r.stato, chiave: r.chiave,
      ultimo: r.ultimo?.toISOString() ?? null, visto_il: r.visto_il?.toISOString() ?? null,
      chiusa_il: r.chiusa_il?.toISOString() ?? null,
      riferimento: riferimento(r.entita, r.entita_id, r.messaggio, r.codice, r.dettaglio),
    };
  }

  private riga(r: RigaDb) {
    return {
      id: String(r.id), ts: r.ts.toISOString(), genere: r.genere, livello: r.livello, codice: r.codice,
      servizio: r.servizio, entita: r.entita, entita_id: r.entita_id == null ? null : String(r.entita_id),
      esito: r.esito, messaggio: r.messaggio, utente: utenteDi(r), operazione_id: r.operazione_id,
      volte: r.volte, stato: r.stato,
      riferimento: riferimento(r.entita, r.entita_id, r.messaggio, r.codice, r.dettaglio),
    };
  }
}

/** Pulizia notturna del registro (§15.7): non deve mai fermare l'applicazione. */
@Injectable()
export class PuliziaRegistro {
  private readonly log = new Logger('PuliziaRegistro');
  constructor(private readonly db: PrismaService) {}

  @Cron('30 3 * * *')
  async esegui() {
    try {
      await pulisciRegistro(this.db);
    } catch (err) {
      this.log.error('pulizia del registro non riuscita', err instanceof Error ? err.stack : String(err));
    }
  }
}

/** Il contatore *Errori di oggi* della pagina Oggi (§15.6): eventi `errore` di oggi (ora di Roma)
 *  più le anomalie ancora aperte. */
export async function erroriOggi(db: PrismaService, oggi: string) {
  const [r] = await db.$queryRaw<{ n: number }[]>`
    SELECT (
      (SELECT count(*) FROM registro
        WHERE genere = 'evento' AND livello = 'errore' AND (ts AT TIME ZONE 'Europe/Rome')::date = ${oggi}::date)
      + (SELECT count(*) FROM registro WHERE genere = 'anomalia' AND stato = 'aperta')
    )::int AS n`;
  return r.n;
}
