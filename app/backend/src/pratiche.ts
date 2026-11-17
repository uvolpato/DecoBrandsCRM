import { BadRequestException, Body, Controller, Get, NotFoundException, Param, ParseIntPipe, Put, Query, Req } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import type { Request } from 'express';
import { Richiede, contesto } from './accesso';
import { righePagina } from './impostazioni';
import { CON_PRATICA, type Dati, caricaDatiPratica, giornoRoma, iso, praticaDaDb } from './motore/dati';
import { abbinamento, anomaliaGruppo, anomaliaProvvigione, anomaliaScontoMedio, basePratica, calcoloDocumento, confronto, fasePratica, haVariazioni, importoPratica, pagato, percentuali, provvigioneDocumento, quotaSub, r2, raggruppamentoDi, scontoMedioFase, statoIncasso, statoPratica } from './motore/motore';
import { PrismaService } from './prisma.service';
import { type Contesto, apriAnomalia, chiudiAnomalia, logEvent } from './registro';

// Elenco delle pratiche (F2-A1, §7.2, §8.1): filtri, conteggi dei segmenti (D-23), ordinamento e
// paginazione nel database. Stato, importo e variazioni li ricava il motore dai documenti e li salva
// sulla pratica (aggiornaPratica, D-52 §19); la query aggiunge solo "scaduta" (scadenza < oggi) e il
// subagente alla data. Niente calcoli nel browser (V12, D-28).

const STATI = ['tutte', 'scaduta', 'attesa', 'confermata', 'fatturata', 'variazioni'] as const;
type Stato = (typeof STATI)[number];
const ORDINI = ['numero', 'cliente', 'fornitore', 'data', 'importo', 'stato', 'subagente', 'ordine_fornitore'] as const;
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
  @IsOptional() @IsIn(['si', 'no']) pagato?: 'si' | 'no'; // D-60: il cliente ha pagato (c'è un documento di pagamento)
  @IsOptional() @IsIn(['si']) deroga?: 'si'; // D-199: la pratica ha una deroga sul raggruppamento
  @IsOptional() @IsIn(ORDINI) ordina?: (typeof ORDINI)[number];
  @IsOptional() @IsIn(['asc', 'desc']) dir?: 'asc' | 'desc';
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) pagina?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) perPagina?: number;
}

/** Campo di ricerca delle pratiche per fornitore (D-60, §7.3: lo *Sposta*). */
class CercaPratiche {
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) fornitore_id?: number;
  // il documento è vincolato a cliente e fornitore: la ricerca filtra per tutti e due (15/11/2026)
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) cliente_id?: number;
  // D-177 §19: filtro per stato nella ricerca per l'abbinamento (lista chiusa, V12)
  @IsOptional() @IsIn(['attesa', 'confermata', 'fatturata']) stato?: 'attesa' | 'confermata' | 'fatturata';
}

/** Deroga sul raggruppamento della pratica (D-199 §19): `raggruppamento` null = come il fornitore,
 *  altrimenti documento | riga; il motivo è obbligatorio. */
class DerogaRaggruppamento {
  @IsOptional() @IsIn(['documento', 'riga']) raggruppamento?: 'documento' | 'riga' | null;
  @IsString() @IsNotEmpty() @MaxLength(2000) motivo!: string;
}

const idElenco = (s: string | undefined) => (s ? s.split(',').map((x) => BigInt(x)) : []);

// la colonna `stato` tiene la fase con i nomi di §4.2.7; l'elenco usa quelli del motore
const STATO_DB = { attesa: 'inviato', confermata: 'confermato', fatturata: 'fatturato' } as const;

const gg = (n: number) => `${n} ${n === 1 ? 'giorno' : 'giorni'}`;
/** La nota dei giorni accanto allo stato, la stessa nell'elenco e nel dettaglio (§7.2, §7.3). */
function notaStato(stato: string, giorni?: number | null) {
  const n = giorni ?? 0;
  return stato === 'confermata' ? 'in attesa di fattura'
    : stato === 'scaduta' ? `da ${gg(-n)}`
      : stato === 'attesa' ? (giorni === null ? 'il fornitore non manda la conferma' : n === 0 ? 'scade oggi' : `entro ${gg(n)}`) : null;
}
const dataIt = (s: string) => s.split('-').reverse().join('/');

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
  // la data della pratica è quella del primo ordine rimasto (annullamenti, spostamenti, correzioni: D-60)
  const primo = t.documenti.filter((d) => d.tipo === 'ordine').reduce<Date | null>((m, d) => (!m || d.data < m ? d.data : m), null);
  const nuovi = { stato: STATO_DB[fasePratica(p)], importo: importoPratica(p), variazioni: haVariazioni(p), variazione, ...(primo ? { data_ordine: primo } : {}) };
  await tx.ordini_fornitore_testata.update({ where: { id }, data: nuovi });
  await aggiornaAnomalieProvvigione(tx, p);
  await salvaCalcolo(tx, id); // D-183: valori calcolati dei documenti aperti
  if (motivo && t.stato !== nuovi.stato) {
    await logEvent(tx, {
      tipo: 'stato', azione: 'change_state', entita: 'pratica', entita_id: id, esito: 'successo',
      dettaglio: { etichetta: t.numero_ordine, prima: { stato: t.stato }, dopo: { stato: nuovi.stato }, motivo },
    }, ctx);
  }
  return { ...t, ...nuovi };
}

/** D-183 §19: riscrive i valori calcolati (`calcolo`) dei documenti aperti della pratica, dal motore.
 *  I congelati (congelato_il non nullo) non si toccano. Chiamata a ogni modifica che può cambiare la base. */
async function salvaCalcolo(tx: Prisma.TransactionClient, id: bigint) {
  const S = await caricaDatiPratica(tx, id);
  if (!S) return;
  for (const pp of S.pratiche) for (const d of pp.documenti) {
    if (d.congelato_il) continue;
    await tx.ordini_fornitore_documenti.update({ where: { id: BigInt(d.id) }, data: { calcolo: calcoloDocumento(S, pp, d) as unknown as Prisma.InputJsonValue } });
  }
}

/** D-183: un cambio di parametro del fornitore (spese nella base) o di scaglioni/percentuali ricalcola i
 *  documenti aperti del fornitore; i congelati restano con i valori con cui sono stati chiusi. */
export async function ricalcolaDocumentiAperti(tx: Prisma.TransactionClient, fornitore_id: bigint) {
  const testate = await tx.ordini_fornitore_testata.findMany({ where: { fornitore_id }, select: { id: true } });
  for (const t of testate) await salvaCalcolo(tx, t.id); // ponytail: una carica per pratica; filtro per fornitore se cresce
}

/** D-183 §19: congela i documenti dati nella transazione di chiusura (bollettino verificato, liquidazione
 *  chiusa): ricalcola i valori una volta e fissa `congelato_il`; da qui non cambiano più. V13: tutto dentro
 *  la stessa transazione, `S` è già caricato con i dati bloccati. */
export async function congelaDocumenti(tx: Prisma.TransactionClient, S: Dati, ids: Iterable<string>) {
  const perDoc = new Map<string, { p: Dati['pratiche'][number]; d: Dati['pratiche'][number]['documenti'][number] }>();
  for (const p of S.pratiche) for (const d of p.documenti) perDoc.set(d.id, { p, d });
  for (const id of ids) {
    const v = perDoc.get(id);
    if (!v || v.d.congelato_il) continue;
    await tx.ordini_fornitore_documenti.update({
      where: { id: BigInt(id) },
      data: { calcolo: calcoloDocumento(S, v.p, v.d) as unknown as Prisma.InputJsonValue, congelato_il: new Date() },
    });
  }
}

/** Apre (o chiude) l'anomalia della provvigione della pratica (D-182 §19, D-199 §19): sconto medio
 *  oltre l'ultimo scaglione in modalità documento, gruppo oltre l'ultimo scaglione in modalità riga
 *  (lì lo sconto medio non comanda). Il dettaglio porta pratica, documento, sconto e ultimo scaglione.
 *  `fornitore` e `scaglioni` si possono passare già caricati (cambio a livello di fornitore), altrimenti
 *  li legge qui. */
async function aggiornaAnomalieProvvigione(
  tx: Prisma.TransactionClient,
  p: ReturnType<typeof praticaDaDb>,
  fornitore?: { raggruppamento: string | null; scaglioni_esatti: boolean },
  scaglioni?: { id: bigint; fornitore_id: bigint; sconto_min: Prisma.Decimal; pct_agente: Prisma.Decimal; pct_subagente: Prisma.Decimal; valido_dal: Date }[],
) {
  if (!fornitore || !scaglioni) {
    [fornitore, scaglioni] = await Promise.all([
      tx.fornitori.findUniqueOrThrow({ where: { id: BigInt(p.fornitore_id) }, select: { raggruppamento: true, scaglioni_esatti: true } }),
      tx.provvigioni_scaglioni.findMany({ where: { fornitore_id: BigInt(p.fornitore_id) } }),
    ]);
  }
  const S = { scaglioni: scaglioni.map((s) => ({ id: String(s.id), fornitore_id: String(s.fornitore_id), sconto: s.sconto_min, pct_agente: s.pct_agente, pct_sub: s.pct_subagente, valido_dal: iso(s.valido_dal) })), fornitori: new Map([[p.fornitore_id, fornitore]]) } as unknown as Dati;
  const ragg = p.raggruppamento ?? fornitore.raggruppamento ?? 'documento';
  // D-200 §19: con «solo sconti esatti» l'anomalia è lo sconto senza soglia esatta (±0,05), non oltre l'ultimo scaglione
  const esatti = fornitore.scaglioni_esatti;
  if (ragg === 'riga') {
    const a = anomaliaGruppo(S, p);
    if (a) {
      await apriAnomalia(tx, {
        servizio: 'provvigioni', codice: 'provvigione.gruppo_scaglione', chiave: p.id,
        messaggio: esatti
          ? `La pratica ${a.numero} ha un gruppo con sconto ${a.sconto_gruppo.toFixed(2)} % senza scaglione esatto (±0,05): la provvigione resta da decidere.`
          : `La pratica ${a.numero} ha un gruppo con sconto ${a.sconto_gruppo.toFixed(2)} % oltre l'ultimo scaglione (${(a.ultimo_scaglione ?? new Prisma.Decimal(0)).toFixed(2)} %): la provvigione resta da decidere.`,
        dettaglio: { pratica: a.numero, documento: a.documento, sconto_gruppo: Number(a.sconto_gruppo), ultimo_scaglione: a.ultimo_scaglione != null ? Number(a.ultimo_scaglione) : null },
      });
    } else {
      await chiudiAnomalia(tx, 'provvigioni', 'provvigione.gruppo_scaglione', p.id);
    }
    await chiudiAnomalia(tx, 'provvigioni', 'provvigione.sconto_medio', p.id); // in riga comandano i gruppi
    return;
  }
  const a = anomaliaScontoMedio(S, p);
  if (a) {
    await apriAnomalia(tx, {
      servizio: 'provvigioni', codice: 'provvigione.sconto_medio', chiave: p.id,
      messaggio: esatti
        ? `La pratica ${a.numero} ha sconto medio ${a.sconto_medio.toFixed(2)} % senza scaglione esatto (±0,05): la provvigione resta da decidere.`
        : `La pratica ${a.numero} ha sconto medio ${a.sconto_medio.toFixed(2)} % oltre l'ultimo scaglione (${a.ultimo_scaglione.toFixed(2)} %): la provvigione resta da decidere.`,
      dettaglio: { pratica: a.numero, documento: a.documento, sconto_medio: Number(a.sconto_medio), ultimo_scaglione: Number(a.ultimo_scaglione) },
    });
  } else {
    await chiudiAnomalia(tx, 'provvigioni', 'provvigione.sconto_medio', p.id);
  }
  await chiudiAnomalia(tx, 'provvigioni', 'provvigione.gruppo_scaglione', p.id);
}

/** D-199/D-200 §19: dopo un cambio di `raggruppamento` o di `scaglioni_esatti` sul fornitore, riapre o
 *  chiude le anomalie di provvigione delle sue pratiche nella stessa transazione. Il solo ricalcolo dei
 *  calcoli non basta: l'elenco anomalie resterebbe incoerente fino a un'altra modifica. */
export async function aggiornaAnomalieFornitore(tx: Prisma.TransactionClient, fornitore_id: bigint) {
  const fornitore = await tx.fornitori.findUniqueOrThrow({ where: { id: fornitore_id }, select: { raggruppamento: true, scaglioni_esatti: true } });
  const scaglioni = await tx.provvigioni_scaglioni.findMany({ where: { fornitore_id } });
  const testate = await tx.ordini_fornitore_testata.findMany({ where: { fornitore_id }, include: CON_PRATICA });
  for (const t of testate) await aggiornaAnomalieProvvigione(tx, praticaDaDb(t), fornitore, scaglioni);
}

type Riga = {
  id: bigint; numero: string; numero_ordine_fornitore: string | null; cliente_id: bigint; cliente: string; fornitore_id: bigint; fornitore: string;
  subagente_id: bigint | null; subagente: string | null; data: string; importo: Prisma.Decimal; stato: string; giorni: number;
  variazioni: boolean; variazione: Prisma.Decimal; pagato: boolean; deroga: boolean;
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
    const pagato = Prisma.sql`EXISTS (SELECT 1 FROM ordini_fornitore_documenti d WHERE d.testata_id = t.id AND d.tipo = 'pagamento')`;
    if (q.pagato) filtri.push(q.pagato === 'si' ? pagato : Prisma.sql`NOT ${pagato}`);
    if (q.deroga) filtri.push(Prisma.sql`t.raggruppamento IS NOT NULL`); // D-199: deroga sul raggruppamento
    if (testo) filtri.push(Prisma.sql`(t.numero_ordine ILIKE ${simile} OR t.numero_ordine_fornitore ILIKE ${simile} OR cv.ragione_sociale ILIKE ${simile} OR fv.ragione_sociale ILIKE ${simile}
      OR EXISTS (SELECT 1 FROM ordini_fornitore_documenti d WHERE d.testata_id = t.id AND d.numero ILIKE ${simile}))`);

    // scaduta = in attesa e scadenza (data + giorni del fornitore) passata: dipende da oggi, si calcola qui (§5.1).
    // Il subagente è quello dell'agenzia alla data dell'ordine (D-35): l'EXCLUDE su interscambio ne garantisce uno solo.
    const base = Prisma.sql`
      WITH base AS (
        SELECT t.id, t.numero_ordine AS numero, t.numero_ordine_fornitore, t.cliente_id, coalesce(cv.ragione_sociale, '') AS cliente,
               t.fornitore_id, coalesce(fv.ragione_sociale, '') AS fornitore,
               a.subagente_id, s.nome || ' ' || s.cognome AS subagente, to_char(t.data_ordine, 'YYYY-MM-DD') AS data,
               t.importo, t.variazioni, t.variazione, ${pagato} AS pagato,
               (t.raggruppamento IS NOT NULL) AS deroga,
               CASE t.stato WHEN 'fatturato' THEN 'fatturata' WHEN 'confermato' THEN 'confermata'
                 ELSE CASE WHEN f.giorni_attesa_conferma > 0 AND t.data_ordine + f.giorni_attesa_conferma < ${oggi}::date THEN 'scaduta' ELSE 'attesa' END END AS stato,
               CASE WHEN f.giorni_attesa_conferma > 0 THEN (t.data_ordine + f.giorni_attesa_conferma) - ${oggi}::date END AS giorni -- 0 = nessuna scadenza (D-60)
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

    const [c] = await this.db.$queryRaw<(Record<Stato, number> & { totale: number; deroga: number; importo: Prisma.Decimal | null })[]>`${base}
      SELECT count(*)::int AS tutte,
             count(*) FILTER (WHERE stato = 'scaduta')::int AS scaduta, count(*) FILTER (WHERE stato = 'attesa')::int AS attesa,
             count(*) FILTER (WHERE stato = 'confermata')::int AS confermata, count(*) FILTER (WHERE stato = 'fatturata')::int AS fatturata,
             count(*) FILTER (WHERE variazioni)::int AS variazioni,
             count(*) FILTER (WHERE deroga)::int AS deroga,
             count(*) FILTER (WHERE ${scelte})::int AS totale, sum(importo) FILTER (WHERE ${scelte}) AS importo
      FROM base`;

    // colonne da un elenco chiuso (ORDINI, validato): mai testo del browser nella query
    const COLONNA: Record<(typeof ORDINI)[number], Prisma.Sql> = {
      numero: Prisma.sql`numero`, cliente: Prisma.sql`cliente`, fornitore: Prisma.sql`fornitore`, data: Prisma.sql`data`,
      importo: Prisma.sql`importo`, subagente: Prisma.sql`coalesce(subagente, '')`,
      ordine_fornitore: Prisma.sql`coalesce(numero_ordine_fornitore, '')`,
      stato: Prisma.sql`CASE stato WHEN 'scaduta' THEN 0 WHEN 'attesa' THEN 1 WHEN 'confermata' THEN 2 ELSE 3 END`,
    };
    const dir = q.dir === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`;
    const perPagina = q.perPagina ?? await righePagina(this.db); // §7.15: senza perPagina, la riga delle impostazioni
    const pagine = Math.max(1, Math.ceil(c.totale / perPagina));
    const pagina = Math.min(Math.max(q.pagina ?? 0, 0), pagine - 1);
    const righe = await this.db.$queryRaw<Riga[]>`${base}
      SELECT * FROM base WHERE ${scelte}
      ORDER BY ${COLONNA[q.ordina ?? 'stato']} ${dir}, numero ${dir}, id
      LIMIT ${perPagina} OFFSET ${pagina * perPagina}`;

    return {
      righe: righe.map((r) => ({
        id: String(r.id), numero: r.numero, numero_ordine_fornitore: r.numero_ordine_fornitore, cliente_id: String(r.cliente_id), cliente: r.cliente,
        fornitore_id: String(r.fornitore_id), fornitore: r.fornitore,
        subagente_id: r.subagente_id == null ? null : String(r.subagente_id), subagente: r.subagente,
        data: r.data, importo: Number(r.importo), stato: r.stato, nota: notaStato(r.stato, r.giorni),
        variazioni: r.variazioni, variazione: Number(r.variazione), pagato: r.pagato,
        deroga: r.deroga,
      })),
      totale: c.totale,
      conteggi: { ...Object.fromEntries(STATI.map((s) => [s, c[s]])) as Record<Stato, number>, deroga: c.deroga },
      totali: { importo: Number(c.importo ?? 0) },
      pagina,
      pagine,
      per_pagina: perPagina,
    };
  }

  /** Pratiche di un fornitore per il campo di ricerca (D-60, §7.3: lo *Sposta*), con i soli dati
   *  che il menu mostra. Il documento è sempre vincolato a cliente e fornitore (15/11/2026): con
   *  `cliente_id` filtra per tutti e due. Il filtro per numero lo fa il campo; qui contano i vincoli.
   *  shortcut: tutte le pratiche del fornitore in una volta, con migliaia per fornitore serve una
   *  ricerca a testo sul server. */
  @Get('cerca')
  @Richiede('provvigioni.consulta')
  async cerca(@Query() q: CercaPratiche) {
    if (!q.fornitore_id) return [];
    // D-177 §19: il filtro per stato lo applica il server; il browser invia solo la scelta (V12)
    const stato = q.stato ? Prisma.sql`AND t.stato = ${STATO_DB[q.stato]}` : Prisma.empty;
    const cliente = q.cliente_id != null ? Prisma.sql`AND t.cliente_id = ${BigInt(q.cliente_id)}` : Prisma.empty;
    // §16.4: colonna Importo della ricerca = importoPratica (l'ultima fase: fatture − note, conferme, ordini),
    // salvato da aggiornaPratica sulla testata (D-52); il server non ricalcola qui (V12).
    const righe = await this.db.$queryRaw<{ id: bigint; numero: string; cliente: string; data: string; stato: string; importo: Prisma.Decimal }[]>`
      SELECT t.id, t.numero_ordine AS numero, coalesce(cv.ragione_sociale, '') AS cliente,
             to_char(t.data_ordine, 'YYYY-MM-DD') AS data,
             CASE t.stato WHEN 'fatturato' THEN 'fatturata' WHEN 'confermato' THEN 'confermata' ELSE 'attesa' END AS stato,
             t.importo AS importo
      FROM ordini_fornitore_testata t
      JOIN clienti c ON c.id = t.cliente_id
      LEFT JOIN clienti_versioni cv ON cv.id = c.versione_corrente_id
      WHERE t.fornitore_id = ${BigInt(q.fornitore_id)} ${cliente} ${stato}
      ORDER BY t.data_ordine DESC, t.id DESC`;
    return righe.map((r) => ({ id: String(r.id), numero: r.numero, cliente: r.cliente, data: r.data, stato: r.stato, importo: Number(r.importo) }));
  }

  /** Dettaglio della pratica (§7.3, §8.1): testata, stato, binario delle fasi, righe a confronto,
   *  provvigione e azione proposta. Tutto calcolato dal motore sul server (V12, D-28). */
  @Get(':id')
  @Richiede('provvigioni.consulta')
  async dettaglio(@Param('id', ParseIntPipe) id: number) {
    const S = await caricaDatiPratica(this.db, BigInt(id)); // solo i dati della pratica (D-52 §19)
    const r = S && dettaglioPratica(S, String(id));
    if (!r) throw new NotFoundException('Pratica non trovata');
    // D-169: il numero d'ordine del fornitore sta sulla testata, non nei dati del motore
    const t = await this.db.ordini_fornitore_testata.findUnique({ where: { id: BigInt(id) }, select: { numero_ordine_fornitore: true } });
    // D-199: il motivo dell'ultima deroga sul raggruppamento sta nel registro, sull'evento che porta
    // `campo: 'raggruppamento'` (un campo esplicito: non si fida dell'ultimo crud.update sulla pratica)
    const ev = await this.db.registro.findFirst({
      where: { entita: 'pratica', entita_id: BigInt(id), codice: 'crud.update', dettaglio: { path: ['campo'], equals: 'raggruppamento' } },
      orderBy: { id: 'desc' },
    });
    const dd = (ev?.dettaglio ?? null) as { motivo?: string } | null;
    const raggruppamento_motivo = dd?.motivo ?? null;
    return { ...r, numero_ordine_fornitore: t?.numero_ordine_fornitore ?? null, raggruppamento_motivo };
  }

  /** Imposta la deroga sul raggruppamento della pratica (D-199 §19): null = come il fornitore, altrimenti
   *  documento | riga; motivo obbligatorio. Stessi permessi della correzione della provvigione. Ricalcola
   *  i documenti aperti della pratica nella stessa transazione (V13); i congelati restano (D-183). */
  @Put(':id/raggruppamento')
  @Richiede('provvigioni.modifica')
  async derogaRaggruppamento(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() b: DerogaRaggruppamento) {
    const ctx = contesto(req);
    const motivo = b.motivo.trim();
    if (!motivo) throw new BadRequestException('Scrivi il motivo della deroga');
    const dopo = b.raggruppamento ?? null;
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM ordini_fornitore_testata WHERE id = ${BigInt(id)} FOR UPDATE`;
      const t = await tx.ordini_fornitore_testata.findUnique({ where: { id: BigInt(id) }, select: { numero_ordine: true, raggruppamento: true } });
      if (!t) throw new NotFoundException('Pratica non trovata');
      const prima = t.raggruppamento ?? null;
      await tx.ordini_fornitore_testata.update({ where: { id: BigInt(id) }, data: { raggruppamento: dopo } });
      await logEvent(tx, {
        tipo: 'crud', azione: 'update', entita: 'pratica', entita_id: BigInt(id), esito: 'successo',
        dettaglio: { etichetta: t.numero_ordine, campo: 'raggruppamento', prima: { raggruppamento: prima }, dopo: { raggruppamento: dopo }, motivo },
      }, ctx);
      await salvaCalcolo(tx, BigInt(id)); // D-199: ricalcola gli aperti della pratica, i congelati restano (D-183)
      // D-199: il cambio del raggruppamento può aprire o chiudere un'anomalia di provvigione: aggiornala subito
      await aggiornaAnomalieProvvigione(tx, praticaDaDb(await tx.ordini_fornitore_testata.findUniqueOrThrow({ where: { id: BigInt(id) }, include: CON_PRATICA })));
      return { raggruppamento: dopo, raggruppamento_da: dopo == null ? 'fornitore' : 'pratica', motivo };
    });
  }
}

/** Risposta del dettaglio dai dati del motore; esportata per la prova di coerenza con caricaDati. */
export function dettaglioPratica(S: Dati, id: string) {
  const p = S.pratiche.find((x) => x.id === id);
  if (!p) return null;

  const s = statoPratica(S, p), nota = notaStato(s.chiave, s.giorni);
  const fatture = p.documenti.filter((d) => d.tipo === 'fattura');
  const note = p.documenti.filter((d) => d.tipo === 'nota_credito');
  const somma = (ds: { importo: Prisma.Decimal }[]) => r2(ds.reduce((x, d) => x.plus(d.importo), new Prisma.Decimal(0)));
  // più documenti dello stesso tipo: il primo numero + quanti altri (D-60)
  const numeri = (ds: { numero: string }[]) => ds[0].numero + (ds.length > 1 ? ` + ${ds.length - 1}` : '');
  const tutti = (ds: { numero: string }[]) => ds.map((d) => d.numero); // elenco per il binario (D-90)
  // una conferma registrata senza importo è arrivata, ma non dà un importo né una differenza (D-60)
  const impOrdine = somma(p.ordini);
  // D-174: conferme e proforme valide (non superate) contano insieme per il progresso
  const conferme = p.conferme.filter((d) => !d.superato);
  const proforme = p.proforma.filter((d) => !d.superato);
  const impConferma = somma(conferme), impValide = r2(impConferma.plus(somma(proforme)));
  const confermaConImporto = !impConferma.isZero();
  // «Confermato X di Y»: X = somma delle conferme/proforme valide, Y = importo dell'ordine (D-174)
  const parziale = (conferme.length || proforme.length) && impValide.lt(impOrdine);
  const progresso = (conferme.length || proforme.length) ? { x: Number(impValide), y: Number(impOrdine), parziale } : null;
  const titoloConferma = conferme.length ? (conferme.length > 1 ? 'Conferme' : 'Conferma') : (proforme.length > 1 ? 'Proforme' : 'Proforma');

  const fasi = [
    { titolo: p.ordini.length > 1 ? 'Ordini' : 'Ordine', fatta: true, numero: p.ordini.length ? numeri(p.ordini) : p.numero, numeri: p.ordini.length ? tutti(p.ordini) : [p.numero], data: p.data, importo: Number(impOrdine) },
    conferme.length
      ? { titolo: titoloConferma, fatta: true, numero: numeri(conferme), numeri: tutti(conferme), data: conferme[0].data,
          ...(confermaConImporto ? { importo: Number(impValide), delta: Number(r2(impValide.minus(impOrdine))) } : {}) }
      // conferma e proforma facoltative (D-60 §19): la proforma o la fattura fanno avanzare la pratica
      : proforme.length ? { titolo: titoloConferma, fatta: true, numero: numeri(proforme), numeri: tutti(proforme), data: proforme[0].data, importo: Number(impValide), delta: Number(r2(impValide.minus(impOrdine))) }
        : s.chiave === 'fatturata' ? { titolo: 'Conferma', assente: true, testo: 'Non arrivata' }
          : {
            titolo: 'Conferma', ritardo: s.chiave === 'scaduta',
            testo: s.chiave === 'scaduta' ? `In ritardo ${nota} (attesa entro il ${dataIt(s.scadenza!)})`
              : s.scadenza ? `Attesa entro il ${dataIt(s.scadenza)}` : 'Attesa',
          },
    fatture.length
      ? {
        titolo: fatture.length > 1 ? 'Fatture' : 'Fattura', fatta: true,
        numero: numeri(fatture), numeri: tutti(fatture), data: fatture[0].data,
        importo: Number(somma(fatture)), delta: Number(r2(somma(fatture).minus(confermaConImporto ? impConferma : impOrdine))),
      }
      : { titolo: 'Fattura', testo: 'In attesa' },
    note.length
      ? { titolo: 'Nota di credito', fatta: true, numero: numeri(note), numeri: tutti(note), data: note[0].data, importo: Number(somma(note)) }
      : { titolo: 'Nota di credito', assente: true, testo: 'Nessuna' },
  ];

  const faseRighe = (['ordine', 'conferma', 'fattura'] as const).filter((f) => p.righe[f].length);
  const etichetta = { ordine: 'Ordine', conferma: 'Conferma', fattura: 'Fattura' } as const;
  const numeroFase = (f: (typeof faseRighe)[number]) =>
    f === 'ordine' ? { numero: p.ordini.map((d) => d.numero).join(' + ') || p.numero, data: p.data }
      : f === 'conferma' ? { numero: p.conferme.map((d) => d.numero).join(' + '), data: p.conferme[0]?.data ?? p.data }
        : { numero: fatture.map((d) => d.numero).join(' + '), data: fatture[0]?.data ?? p.data };
  const righe = confronto(p);
  const variate = righe.filter((r) => r.varia);
  const deltaVariazioni = Number(r2(variate.reduce((s, r) => s.plus(r.delta), new Prisma.Decimal(0))));

  // provvigione: le percentuali alla data del documento; al subagente la quota per documento (D-27)
  const bicchiere = percentuali(S, p, fatture[0]?.data ?? p.data);
  const fiscali = p.documenti.filter((d) => d.tipo === 'fattura' || d.tipo === 'nota_credito');
  const quote = fiscali.map((d) => quotaSub(S, p, d)).filter((q): q is NonNullable<typeof q> => !!q);
  const netto = importoPratica(p);
  const base = basePratica(p); // D-183: la provvigione si calcola sulla base (netto − spese escluse)
  const sub = abbinamento(S, p.cliente_id, p.fornitore_id, p.data);
  // D-182 §19, D-199 §19, D-200 §19: l'anomalia di provvigione dipende dal modo di raggruppamento
  // (sconto medio in documento, gruppo in riga); in riga lo sconto medio non comanda.
  const anomalia = anomaliaProvvigione(S, p);
  const esatti = S.fornitori.get(p.fornitore_id)?.scaglioni_esatti ?? false;
  const sconto_medio = anomalia
    ? {
        valore: Number('sconto_gruppo' in anomalia ? anomalia.sconto_gruppo : anomalia.sconto_medio),
        scaglione: null, documento: anomalia.documento, oltre: true,
        ultimo_scaglione: anomalia.ultimo_scaglione != null ? Number(anomalia.ultimo_scaglione) : null,
        gruppo: 'sconto_gruppo' in anomalia, esatti,
      }
    : bicchiere?.sconto_medio != null
      ? { valore: Number(bicchiere.sconto_medio), scaglione: Number(bicchiere.scaglione.sconto), documento: null, oltre: false, ultimo_scaglione: null, gruppo: false, esatti }
      : null;
  // D-197 §19: lo sconto medio della differenza (fattura − nota) quando cambia rispetto a quello della
  // fattura: sulla riga della nota si mostra «sconto medio dopo la nota X% → scaglione Y».
  const sconto_dopo_nota = note.length && bicchiere?.sconto_medio != null && !anomalia
    ? (() => {
        const prima = scontoMedioFase(p);
        if (prima == null || prima.equals(bicchiere.sconto_medio)) return null;
        return { valore: Number(bicchiere.sconto_medio), scaglione: Number(bicchiere.scaglione.sconto), fattura: Number(prima) };
      })()
    : null;
  // In modalità riga la provvigione non dipende da `percentuali` (che con lo sconto medio senza scaglione
  // tornerebbe null anche se i gruppi hanno la loro soglia): si mostra lo stesso, con i valori effettivi.
  const inRiga = raggruppamentoDi(S, p).raggruppamento === 'riga';
  const provvigione = (!sub || (!inRiga && !bicchiere)) ? null : (() => {
    // D-166 §19: dal fornitore = somma delle prese effettive dei documenti (gruppi in modalità riga,
    // D-197/D-199); al subagente = quota dei documenti; margine = differenza.
    const aDecobrands = r2(fiscali.reduce((x, d) => x.plus(provvigioneDocumento(S, p, d).agente ?? new Prisma.Decimal(0)), new Prisma.Decimal(0)));
    const aSubagente = quote.length
      ? r2(quote.reduce((x, q) => x.plus(q.provvigione), new Prisma.Decimal(0)))
      : (bicchiere ? r2(base.times(bicchiere.sub).div(100)) : new Prisma.Decimal(0));
    const margine = r2(aDecobrands.minus(aSubagente));
    // in modalità riga le percentuali «singole» sono quelle effettive (somma dei gruppi ÷ base),
    // non una soglia dello sconto medio che lì non comanda (D-199)
    const eff = (tot: Prisma.Decimal) => (base.isZero() ? new Prisma.Decimal(0) : r2(tot.div(base).times(100)));
    const agentePct = inRiga ? eff(aDecobrands) : bicchiere!.agente;
    const subPct = inRiga ? eff(aSubagente) : bicchiere!.sub;
    return {
      imponibile: Number(base),
      netto: Number(netto),
      spese: Number(r2(netto.minus(base))),
      // D-183: tutti i documenti congelati → il segno «fissato il» (la data più recente di congelamento)
      congelato: fiscali.length && fiscali.every((d) => d.congelato_il) ? fiscali.map((d) => d.congelato_il!).sort().pop()! : null,
      sconto: Number(inRiga ? (bicchiere?.sconto ?? new Prisma.Decimal(0)) : bicchiere!.sconto),
      valido_dal: inRiga ? (bicchiere?.scaglione.valido_dal ?? '') : bicchiere!.scaglione.valido_dal,
      agente: Number(agentePct), sub_standard: Number(inRiga ? eff(aSubagente) : bicchiere!.sub_standard),
      sub: Number(subPct), eccezione: inRiga ? quote.some((q) => q.eccezione) : bicchiere!.eccezione, da_fornitore: Number(agentePct),
      a_decobrands: Number(aDecobrands),
      a_subagente: Number(aSubagente),
      margine: Number(margine),
      margine_pct: Number(r2(agentePct.minus(subPct))),
      maturazione: S.fornitori.get(p.fornitore_id)?.maturazione ?? null,
      regole: [...new Set(quote.map((q) => q.regola))],
    };
  })();

  const azione = s.chiave === 'fatturata'
    ? { tipo: 'nessuna', testo: 'Pratica fatturata: non serve altro.' }
    : s.chiave === 'confermata'
      ? { tipo: 'fattura', testo: 'Attesa la fattura del fornitore: registrala quando arriva.' }
      : s.chiave === 'scaduta'
        ? { tipo: 'sollecito', testo: `Conferma in ritardo ${nota}: chiedila al fornitore.` }
        : { tipo: 'attesa', testo: s.scadenza ? `Attesa la conferma entro il ${dataIt(s.scadenza)}.` : 'Il fornitore non manda la conferma: si attende la fattura.' };

  return {
    id: p.id, numero: p.numero,
    cliente_id: p.cliente_id, cliente: S.clienti.get(p.cliente_id)?.nome ?? '',
    fornitore_id: p.fornitore_id, fornitore: S.fornitori.get(p.fornitore_id)?.nome ?? '',
    // D-199 §19: raggruppamento effettivo (deroga della pratica o fornitore) per lo scaglione
    raggruppamento: raggruppamentoDi(S, p).raggruppamento,
    raggruppamento_da: raggruppamentoDi(S, p).da,
    subagente_id: sub?.subagente_id ?? null, subagente: sub ? (S.subagenti.get(sub.subagente_id)?.nome ?? null) : null,
    data: p.data, importo: Number(netto), stato: s.chiave, nota, scadenza: s.scadenza ?? null,
    fasi,
    // D-174: «Confermato X di Y» con X = somma delle conferme/proforme valide, Y = importo dell'ordine
    progresso,
    // il cliente ha pagato (D-60): solo un segno con i documenti a supporto, nessun effetto sui numeri
    pagato: pagato(p), pagamenti: p.pagamenti.map((d) => ({ id: d.id, numero: d.numero, data: d.data, importo: Number(d.importo) })),
    // Incasso del cliente (§5.14): stato d'incasso di ogni fattura dal motore (bollettini o segnalazione a mano)
    incassi: fatture.map((d) => ({ documento_id: d.id, numero: d.numero, data: d.data, importo: Number(d.importo), stato: statoIncasso(S, p, d) })),
    confronto: {
      fasi: faseRighe.map((f) => ({ tipo: f, etichetta: etichetta[f], ...numeroFase(f) })),
      righe: righe.map((r) => ({
        codice: r.codice, descrizione: r.descrizione, varia: r.varia, delta: Number(r.delta),
        per: r.per.map((x) => x ? { qta: Number(x.qta), prezzo: Number(x.prezzo), importo: Number(x.importo) } : null),
      })),
      variazioni: { numero: variate.length, totale: deltaVariazioni },
    },
    provvigione, sconto_medio, sconto_dopo_nota, azione,
  };
}
