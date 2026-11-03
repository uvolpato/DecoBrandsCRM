import { Controller, Get, Query } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { Richiede } from './accesso';
import { CON_PRATICA, giornoRoma, praticaDaDb } from './motore/dati';
import { confronto, fasePratica, haVariazioni, importoPratica, r2 } from './motore/motore';
import { PrismaService } from './prisma.service';
import { type Contesto, logEvent } from './registro';

// Elenco delle pratiche (F2-A1, §7.2, §8.1): filtri, conteggi dei segmenti (D-23), ordinamento e
// paginazione nel database. Stato, importo e variazioni li ricava il motore dai documenti e li salva
// sulla pratica (aggiornaPratica, D-52 §19); la query aggiunge solo "scaduta" (scadenza < oggi) e il
// subagente alla data. Niente calcoli nel browser (V12, D-28).

const STATI = ['tutte', 'scaduta', 'attesa', 'confermata', 'fatturata', 'variazioni'] as const;
type Stato = (typeof STATI)[number];
const ORDINI = ['numero', 'cliente', 'fornitore', 'data', 'importo', 'stato', 'subagente'] as const;
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const ELENCO_ID = /^\d{1,18}(,\d{1,18})*$/;

class FiltroPratiche {
  @IsOptional() @IsIn(STATI) stato?: Stato;
  @IsOptional() @IsString() @MaxLength(200) q?: string;
  // filtri sulle entità: id separati da virgola (selezione multipla, D-22)
  @IsOptional() @Matches(ELENCO_ID) fornitori?: string;
  @IsOptional() @Matches(ELENCO_ID) clienti?: string;
  @IsOptional() @Matches(ELENCO_ID) subagenti?: string;
  @IsOptional() @Matches(DATA) dal?: string;
  @IsOptional() @Matches(DATA) al?: string;
  @IsOptional() @IsIn(ORDINI) ordina?: (typeof ORDINI)[number];
  @IsOptional() @IsIn(['asc', 'desc']) dir?: 'asc' | 'desc';
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) pagina?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) perPagina?: number;
}

const idElenco = (s: string | undefined) => (s ? s.split(',').map((x) => BigInt(x)) : []);

// la colonna `stato` tiene la fase con i nomi di §4.2.7; l'elenco usa quelli del motore
const STATO_DB = { attesa: 'inviato', confermata: 'confermato', fatturata: 'fatturato' } as const;

/** Ricalcola con il motore quello che la pratica salva (D-52 §19): stato dai documenti, importo,
 *  variazioni. Va chiamata nella stessa transazione di ogni scrittura su documenti, righe o conferma
 *  della pratica (V13, D-36). Blocca la testata: due modifiche insieme non si perdono a vicenda.
 *  Con `motivo`, se lo stato cambia scrive lei l'evento stato.change_state (§15.2.4): un posto solo.
 *  Restituisce la pratica già caricata con i valori nuovi, per non rileggerla. */
export async function aggiornaPratica(tx: Prisma.TransactionClient, id: bigint, ctx: Contesto = {}, motivo?: string) {
  await tx.$queryRaw`SELECT 1 FROM ordini_fornitore_testata WHERE id = ${id} FOR UPDATE`;
  const t = await tx.ordini_fornitore_testata.findUniqueOrThrow({ where: { id }, include: CON_PRATICA });
  const p = praticaDaDb(t);
  const variazione = r2(confronto(p).filter((r) => r.varia).reduce((s, r) => s.plus(r.delta), new Prisma.Decimal(0)));
  const nuovi = { stato: STATO_DB[fasePratica(p)], importo: importoPratica(p), variazioni: haVariazioni(p), variazione };
  await tx.ordini_fornitore_testata.update({ where: { id }, data: nuovi });
  if (motivo && t.stato !== nuovi.stato) {
    await logEvent(tx, {
      tipo: 'stato', azione: 'change_state', entita: 'pratica', entita_id: id, esito: 'successo',
      dettaglio: { etichetta: t.numero_ordine, prima: { stato: t.stato }, dopo: { stato: nuovi.stato }, motivo },
    }, ctx);
  }
  return { ...t, ...nuovi };
}

type Riga = {
  id: bigint; numero: string; cliente_id: bigint; cliente: string; fornitore_id: bigint; fornitore: string;
  subagente_id: bigint | null; subagente: string | null; data: string; importo: Prisma.Decimal; stato: string; giorni: number;
  variazioni: boolean; variazione: Prisma.Decimal;
};

@Controller('pratiche')
export class PraticheController {
  constructor(private readonly db: PrismaService) {}

  @Get()
  @Richiede('provvigioni.consulta')
  async elenco(@Query() q: FiltroPratiche) {
    const oggi = giornoRoma(new Date());
    const fornitori = idElenco(q.fornitori), clienti = idElenco(q.clienti), subagenti = idElenco(q.subagenti);
    const testo = (q.q ?? '').trim();
    const simile = '%' + testo.replace(/[\\%_]/g, '\\$&') + '%';

    // tutti i filtri tranne lo stato: base dei conteggi dei segmenti (D-23)
    const filtri: Prisma.Sql[] = [Prisma.sql`TRUE`];
    if (fornitori.length) filtri.push(Prisma.sql`t.fornitore_id IN (${Prisma.join(fornitori)})`);
    if (clienti.length) filtri.push(Prisma.sql`t.cliente_id IN (${Prisma.join(clienti)})`);
    if (subagenti.length) filtri.push(Prisma.sql`a.subagente_id IN (${Prisma.join(subagenti)})`);
    if (q.dal) filtri.push(Prisma.sql`t.data_ordine >= ${q.dal}::date`);
    if (q.al) filtri.push(Prisma.sql`t.data_ordine <= ${q.al}::date`);
    if (testo) filtri.push(Prisma.sql`(t.numero_ordine ILIKE ${simile} OR cv.ragione_sociale ILIKE ${simile} OR fv.ragione_sociale ILIKE ${simile}
      OR EXISTS (SELECT 1 FROM ordini_fornitore_documenti d WHERE d.testata_id = t.id AND d.numero ILIKE ${simile}))`);

    // scaduta = in attesa e scadenza (data + giorni del fornitore) passata: dipende da oggi, si calcola qui (§5.1).
    // Il subagente è quello dell'agenzia alla data dell'ordine (D-35): l'EXCLUDE su interscambio ne garantisce uno solo.
    const base = Prisma.sql`
      WITH base AS (
        SELECT t.id, t.numero_ordine AS numero, t.cliente_id, coalesce(cv.ragione_sociale, '') AS cliente,
               t.fornitore_id, coalesce(fv.ragione_sociale, '') AS fornitore,
               a.subagente_id, s.nome || ' ' || s.cognome AS subagente, to_char(t.data_ordine, 'YYYY-MM-DD') AS data,
               t.importo, t.variazioni, t.variazione,
               CASE t.stato WHEN 'fatturato' THEN 'fatturata' WHEN 'confermato' THEN 'confermata'
                 ELSE CASE WHEN t.data_ordine + f.giorni_attesa_conferma < ${oggi}::date THEN 'scaduta' ELSE 'attesa' END END AS stato,
               (t.data_ordine + f.giorni_attesa_conferma) - ${oggi}::date AS giorni
        FROM ordini_fornitore_testata t
        JOIN fornitori f ON f.id = t.fornitore_id
        LEFT JOIN fornitori_versioni fv ON fv.id = f.versione_corrente_id
        JOIN clienti c ON c.id = t.cliente_id
        LEFT JOIN clienti_versioni cv ON cv.id = c.versione_corrente_id
        LEFT JOIN interscambio a ON a.cliente_id = t.cliente_id AND a.fornitore_id = t.fornitore_id
          AND a.valido_dal <= t.data_ordine AND (a.valido_al IS NULL OR t.data_ordine < a.valido_al)
        LEFT JOIN subagenti s ON s.id = a.subagente_id
        WHERE ${Prisma.join(filtri, ' AND ')}
      )`;
    const stato = q.stato ?? 'tutte';
    const scelte = stato === 'tutte' ? Prisma.sql`TRUE` : stato === 'variazioni' ? Prisma.sql`variazioni` : Prisma.sql`stato = ${stato}`;

    const [c] = await this.db.$queryRaw<(Record<Stato, number> & { totale: number; importo: Prisma.Decimal | null })[]>`${base}
      SELECT count(*)::int AS tutte,
             count(*) FILTER (WHERE stato = 'scaduta')::int AS scaduta, count(*) FILTER (WHERE stato = 'attesa')::int AS attesa,
             count(*) FILTER (WHERE stato = 'confermata')::int AS confermata, count(*) FILTER (WHERE stato = 'fatturata')::int AS fatturata,
             count(*) FILTER (WHERE variazioni)::int AS variazioni,
             count(*) FILTER (WHERE ${scelte})::int AS totale, sum(importo) FILTER (WHERE ${scelte}) AS importo
      FROM base`;

    // colonne da un elenco chiuso (ORDINI, validato): mai testo del browser nella query
    const COLONNA: Record<(typeof ORDINI)[number], Prisma.Sql> = {
      numero: Prisma.sql`numero`, cliente: Prisma.sql`cliente`, fornitore: Prisma.sql`fornitore`, data: Prisma.sql`data`,
      importo: Prisma.sql`importo`, subagente: Prisma.sql`coalesce(subagente, '')`,
      stato: Prisma.sql`CASE stato WHEN 'scaduta' THEN 0 WHEN 'attesa' THEN 1 WHEN 'confermata' THEN 2 ELSE 3 END`,
    };
    const dir = q.dir === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`;
    const perPagina = q.perPagina ?? 25;
    const pagine = Math.max(1, Math.ceil(c.totale / perPagina));
    const pagina = Math.min(Math.max(q.pagina ?? 0, 0), pagine - 1);
    const righe = await this.db.$queryRaw<Riga[]>`${base}
      SELECT * FROM base WHERE ${scelte}
      ORDER BY ${COLONNA[q.ordina ?? 'stato']} ${dir}, numero ${dir}, id
      LIMIT ${perPagina} OFFSET ${pagina * perPagina}`;

    const gg = (n: number) => `${n} ${n === 1 ? 'giorno' : 'giorni'}`;
    return {
      righe: righe.map((r) => ({
        id: String(r.id), numero: r.numero, cliente_id: String(r.cliente_id), cliente: r.cliente,
        fornitore_id: String(r.fornitore_id), fornitore: r.fornitore,
        subagente_id: r.subagente_id == null ? null : String(r.subagente_id), subagente: r.subagente,
        data: r.data, importo: Number(r.importo), stato: r.stato,
        nota: r.stato === 'confermata' ? 'in attesa di fattura'
          : r.stato === 'scaduta' ? `da ${gg(-r.giorni)}`
          : r.stato === 'attesa' ? (r.giorni === 0 ? 'scade oggi' : `entro ${gg(r.giorni)}`) : null,
        variazioni: r.variazioni, variazione: Number(r.variazione),
      })),
      totale: c.totale,
      conteggi: Object.fromEntries(STATI.map((s) => [s, c[s]])) as Record<Stato, number>,
      totali: { importo: Number(c.importo ?? 0) },
      pagina,
      pagine,
      per_pagina: perPagina,
    };
  }
}
