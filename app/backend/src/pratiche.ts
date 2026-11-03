import { Controller, Get, NotFoundException, Param, ParseIntPipe, Query } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { Richiede } from './accesso';
import { CON_PRATICA, caricaDati, giornoRoma, praticaDaDb } from './motore/dati';
import { abbinamento, confronto, fasePratica, haVariazioni, importoPratica, importoRighe, percentuali, quotaSub, r2, statoPratica } from './motore/motore';
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

const gg = (n: number) => `${n} ${n === 1 ? 'giorno' : 'giorni'}`;
/** La nota dei giorni accanto allo stato, la stessa nell'elenco e nel dettaglio (§7.2, §7.3). */
function notaStato(stato: string, giorni?: number) {
  const n = giorni ?? 0;
  return stato === 'confermata' ? 'in attesa di fattura'
    : stato === 'scaduta' ? `da ${gg(-n)}`
      : stato === 'attesa' ? (n === 0 ? 'scade oggi' : `entro ${gg(n)}`) : null;
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

    return {
      righe: righe.map((r) => ({
        id: String(r.id), numero: r.numero, cliente_id: String(r.cliente_id), cliente: r.cliente,
        fornitore_id: String(r.fornitore_id), fornitore: r.fornitore,
        subagente_id: r.subagente_id == null ? null : String(r.subagente_id), subagente: r.subagente,
        data: r.data, importo: Number(r.importo), stato: r.stato, nota: notaStato(r.stato, r.giorni),
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

  /** Dettaglio della pratica (§7.3, §8.1): testata, stato, binario delle fasi, righe a confronto,
   *  provvigione e azione proposta. Tutto calcolato dal motore sul server (V12, D-28). */
  @Get(':id')
  @Richiede('provvigioni.consulta')
  async dettaglio(@Param('id', ParseIntPipe) id: number) {
    const S = await caricaDati(this.db);
    const p = S.pratiche.find((x) => x.id === String(id));
    if (!p) throw new NotFoundException('Pratica non trovata');

    const s = statoPratica(S, p), nota = notaStato(s.chiave, s.giorni);
    const ordine = p.righe.ordine, conferma = p.righe.conferma;
    const impOrdine = importoRighe(ordine), impConferma = p.conferma ? importoRighe(conferma) : null;
    const fatture = p.documenti.filter((d) => d.tipo === 'fattura');
    const note = p.documenti.filter((d) => d.tipo === 'nota_credito');
    const somma = (ds: typeof p.documenti) => r2(ds.reduce((x, d) => x.plus(d.importo), new Prisma.Decimal(0)));

    const fasi = [
      { titolo: 'Ordine', fatta: true, numero: p.numero, data: p.data, importo: Number(impOrdine) },
      p.conferma && impConferma
        ? { titolo: 'Conferma', fatta: true, numero: p.conferma.numero, data: p.conferma.data, importo: Number(impConferma), delta: Number(r2(impConferma.minus(impOrdine))) }
        : {
          titolo: 'Conferma', ritardo: s.chiave === 'scaduta',
          testo: s.chiave === 'scaduta' ? `In ritardo ${nota} (attesa entro il ${dataIt(s.scadenza!)})`
            : s.scadenza ? `Attesa entro il ${dataIt(s.scadenza)}` : 'Attesa',
        },
      fatture.length
        ? {
          titolo: fatture.length > 1 ? 'Fatture' : 'Fattura', fatta: true,
          numero: fatture[0].numero + (fatture.length > 1 ? ` + ${fatture.length - 1}` : ''), data: fatture[0].data,
          importo: Number(somma(fatture)), delta: Number(r2(somma(fatture).minus(impConferma ?? impOrdine))),
        }
        : { titolo: 'Fattura', testo: 'In attesa' },
      note.length
        ? { titolo: 'Nota di credito', fatta: true, numero: note[0].numero + (note.length > 1 ? ` + ${note.length - 1}` : ''), data: note[0].data, importo: Number(somma(note)) }
        : { titolo: 'Nota di credito', assente: true, testo: 'Nessuna' },
    ];

    const faseRighe = (['ordine', 'conferma', 'fattura'] as const).filter((f) => p.righe[f].length);
    const etichetta = { ordine: 'Ordine', conferma: 'Conferma', fattura: 'Fattura' } as const;
    const numeroFase = (f: (typeof faseRighe)[number]) =>
      f === 'ordine' ? { numero: p.numero, data: p.data }
        : f === 'conferma' ? { numero: p.conferma?.numero ?? '', data: p.conferma?.data ?? p.data }
          : { numero: fatture.map((d) => d.numero).join(' + '), data: fatture[0]?.data ?? p.data };
    const righe = confronto(p);
    const variate = righe.filter((r) => r.varia);
    const deltaVariazioni = Number(r2(variate.reduce((s, r) => s.plus(r.delta), new Prisma.Decimal(0))));

    // provvigione: le percentuali alla data del documento; al subagente la quota per documento (D-27)
    const bicchiere = percentuali(S, p, fatture[0]?.data ?? p.data);
    const fiscali = p.documenti.filter((d) => d.tipo === 'fattura' || d.tipo === 'nota_credito');
    const quote = fiscali.map((d) => quotaSub(S, p, d)).filter((q): q is NonNullable<typeof q> => !!q);
    const imponibile = importoPratica(p);
    const sub = abbinamento(S, p.cliente_id, p.fornitore_id, p.data);
    const provvigione = bicchiere ? {
      imponibile: Number(imponibile),
      sconto: Number(bicchiere.sconto), valido_dal: bicchiere.scaglione.valido_dal,
      agente: Number(bicchiere.agente), sub_standard: Number(bicchiere.sub_standard),
      sub: Number(bicchiere.sub), eccezione: bicchiere.eccezione, da_fornitore: Number(bicchiere.dal_fornitore),
      a_decobrands: Number(r2(imponibile.times(bicchiere.dal_fornitore).div(100))),
      a_subagente: Number(quote.length
        ? r2(quote.reduce((x, q) => x.plus(q.provvigione), new Prisma.Decimal(0)))
        : r2(imponibile.times(bicchiere.sub).div(100))),
      maturazione: S.fornitori.get(p.fornitore_id)?.maturazione ?? null,
      regole: [...new Set(quote.map((q) => q.regola))],
    } : null;

    const azione = s.chiave === 'fatturata'
      ? { tipo: 'nessuna', testo: 'Pratica fatturata: non serve altro.' }
      : s.chiave === 'confermata'
        ? { tipo: 'fattura', testo: 'Attesa la fattura del fornitore: registrala quando arriva.' }
        : s.chiave === 'scaduta'
          ? { tipo: 'sollecito', testo: `Conferma in ritardo ${nota}: chiedila al fornitore.` }
          : { tipo: 'attesa', testo: `Attesa la conferma entro il ${dataIt(s.scadenza!)}.` };

    return {
      id: p.id, numero: p.numero,
      cliente_id: p.cliente_id, cliente: S.clienti.get(p.cliente_id)?.nome ?? '',
      fornitore_id: p.fornitore_id, fornitore: S.fornitori.get(p.fornitore_id)?.nome ?? '',
      subagente_id: sub?.subagente_id ?? null, subagente: sub ? (S.subagenti.get(sub.subagente_id)?.nome ?? null) : null,
      data: p.data, importo: Number(imponibile), stato: s.chiave, nota, scadenza: s.scadenza ?? null,
      fasi,
      confronto: {
        fasi: faseRighe.map((f) => ({ tipo: f, etichetta: etichetta[f], ...numeroFase(f) })),
        righe: righe.map((r) => ({
          codice: r.codice, descrizione: r.descrizione, varia: r.varia, delta: Number(r.delta),
          per: r.per.map((x) => x ? { qta: Number(x.qta), prezzo: Number(x.prezzo), importo: Number(x.importo) } : null),
        })),
        variazioni: { numero: variate.length, totale: deltaVariazioni },
      },
      provvigione, azione,
    };
  }
}
