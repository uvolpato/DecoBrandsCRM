import { BadRequestException, ConflictException, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query, Req } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import type { Request } from 'express';
import { Richiede, contesto } from './accesso';
import { type Dati, caricaDati, giornoRoma } from './motore/dati';
import { fotografiaLiquidazione, giorni, limiti, r2, righeLiquidazione, trimestre } from './motore/motore';
import { PrismaService } from './prisma.service';
import { logEvent } from './registro';

// Liquidazioni ai subagenti (F4-A1, §7.8, §8.1): riquadri dei trimestri, subagenti con i totali (fanno da filtro),
// riepilogo e chiusura del trimestre. Calcolo dal motore sul database (V12); un trimestre chiuso si legge dalla
// fotografia salvata e non si ricalcola (§4.2.19, D-33).
// ponytail: caricaDati carica tutto. Il trimestre tocca documenti di altri periodi (maturato riconosciuto dopo,
// storni del trimestre prima che arrivano qui, "una fattura al mese"): un caricamento parziale va fatto quando i dati cresceranno.

type Db = Prisma.TransactionClient;
type Foto = ReturnType<typeof fotografiaLiquidazione>;
type Righe = ReturnType<typeof righeLiquidazione>;
type Riga = Righe[number] | Foto['documenti'][number];
const NOMI = ['gennaio–marzo', 'aprile–giugno', 'luglio–settembre', 'ottobre–dicembre'];
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const dataIt = (s: string) => s.split('-').reverse().join('/');
const Dec = Prisma.Decimal;

class Periodo {
  @IsOptional() @Type(() => Number) @IsInt() @Min(2000) @Max(2100) anno?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(4) trimestre?: number;
}

/** Stato del trimestre come il prototipo (M.statoTrimestre): chiusa · futura · in_corso · da_liquidare. */
function stato(S: Dati, a: number, t: number, chiusa: { chiusa_il: Date } | undefined) {
  const lim = limiti(a, t);
  if (chiusa) return { chiave: 'chiusa', etichetta: `Liquidata il ${dataIt(giornoRoma(chiusa.chiusa_il))}`, avanzamento: null };
  if (lim.da > S.oggi) return { chiave: 'futura', etichetta: 'Non iniziata', avanzamento: null };
  if (lim.a >= S.oggi) return { chiave: 'in_corso', etichetta: `In corso, si chiude il ${dataIt(lim.a)}`, avanzamento: Math.round((100 * giorni(lim.da, S.oggi)) / giorni(lim.da, lim.a)) };
  return { chiave: 'da_liquidare', etichetta: 'Da liquidare', avanzamento: null };
}

/** Perché il trimestre non si chiude, o null (§7.8, prototipo viste-periodo.js): finito, non già chiuso, il trimestre
 *  prima chiuso (D-57; senza liquidazioni né documenti prima, questo è il primo), nessun documento in attesa dei
 *  bollettini. Le fatture sul maturato in attesa d'incasso non bloccano (§5.14). */
function bloccoChiusura(S: Dati, st: { chiave: string }, righe: Righe, a: number, t: number) {
  if (st.chiave === 'chiusa') return 'Trimestre già liquidato';
  if (st.chiave === 'futura') return 'Il trimestre non è iniziato';
  if (st.chiave === 'in_corso') return `Il trimestre si chiude il ${dataIt(limiti(a, t).a)}`;
  const pa = t === 1 ? a - 1 : a, pt = t === 1 ? 4 : t - 1, da = limiti(a, t).da;
  const primaChiuso = S.liquidazioni_chiuse.some((l) => l.anno === pa && l.trimestre === pt);
  const qualcosaPrima = S.liquidazioni_chiuse.some((l) => l.anno * 10 + l.trimestre < a * 10 + t) || S.pratiche.some((p) => p.documenti.some((d) => d.data < da));
  if (!primaChiuso && qualcosaPrima) return `Chiudi prima il ${pt}° trimestre ${pa}`;
  const n = righe.filter((r) => !r.liquidabile && !r.incasso).length;
  return n ? `Ci sono ${n} ${n === 1 ? 'documento' : 'documenti'} in attesa dei bollettini` : null;
}

const chiuseDellAnno = (db: Db, anno: number) =>
  db.liquidazioni.findMany({ where: { anno }, include: { autore: { select: { nome: true } } } });

/** Riga del prospetto con i nomi risolti e le etichette decise qui (V12, §7.8): il browser mostra e basta. */
function rigaDocumento(S: Dati, r: Riga, chiusa: boolean) {
  const fornitore = S.fornitori.get(r.fornitore_id)?.nome ?? '';
  const b = r.bollettino_id ? S.bollettini.find((x) => x.id === r.bollettino_id) : null;
  const origine = r.origine ?? r.data;
  const quando = `${dataIt(origine)} (${trimestre(origine)}° trimestre ${origine.slice(0, 4)}${b ? '; bollettino di ' + MESI[b.mese - 1] : ''})`;
  const motivo_testo = r.voce
    ? (r.voce === 'storno' ? 'Storno: il cliente non ha pagato' : 'Riaccredito: il cliente ha pagato') + ' la fattura del ' + quando
    : r.motivo === 'attesa_incasso' ? `In attesa di incasso: ${fornitore} la riconosce quando il cliente paga`
      : r.motivo === 'bollettino_da_verificare' ? `Il bollettino di ${b ? MESI[b.mese - 1] : ''} di ${fornitore} non è ancora verificato`
        : r.motivo === 'non_riconosciuta' ? `Non ancora riconosciuto da ${fornitore}` : null;
  const stato = r.voce === 'storno' ? { etichetta: 'Storno: cliente non pagante', variante: 'errore' }
    : r.voce === 'riaccredito' ? { etichetta: 'Riaccredito', variante: 'ok' }
      : r.liquidabile ? { etichetta: chiusa ? 'Liquidata' : 'Liquidabile', variante: 'ok' }
        : r.incasso ? { etichetta: 'Attesa incasso', variante: 'neutro' }
          : { etichetta: 'In attesa', variante: 'attesa' };
  return {
    documento_id: r.documento_id, numero: r.numero, tipo: r.tipo, data: r.data, origine: r.origine, pratica_id: r.pratica_id,
    cliente_id: r.cliente_id, cliente: S.clienti.get(r.cliente_id)?.nome ?? '', codice_cliente: r.codice_cliente,
    fornitore_id: r.fornitore_id, fornitore, subagente_id: r.subagente_id, subagente: S.subagenti.get(r.subagente_id)?.nome ?? '',
    imponibile: Number(r.importo), pct: Number(r.pct), provvigione: Number(r.provvigione),
    liquidabile: r.liquidabile, incasso: r.incasso, voce: r.voce, motivo: r.motivo, motivo_testo, bollettino_id: r.bollettino_id, stato,
  };
}

/** Pagina della liquidazione di un trimestre; esportata per le prove. */
export async function liquidazione(db: Db, a: number, t: number, oggi?: string) {
  const [S, chiuse] = await Promise.all([caricaDati(db, oggi), chiuseDellAnno(db, a)]);
  const chiusa = (q: number) => chiuse.find((l) => l.trimestre === q);
  const calcolo = new Map<number, Righe>(); // un trimestre aperto si calcola una volta sola
  const righe = (q: number) => calcolo.get(q) ?? calcolo.set(q, righeLiquidazione(S, a, q)).get(q)!;
  // trimestre chiuso: la fotografia salvata; aperto: la stessa forma dal motore
  const foto = (q: number) => (chiusa(q)?.totali as Foto | undefined) ?? fotografiaLiquidazione(S, righe(q));
  const trimestri = [1, 2, 3, 4].map((q) => {
    const st = stato(S, a, q, chiusa(q)), lim = limiti(a, q);
    return { trimestre: q, nome: NOMI[q - 1], da: lim.da, a: lim.a, ...st, totale: st.chiave === 'futura' ? null : Number(foto(q).totale.provvigione) };
  });
  const st = trimestri[t - 1], l = chiusa(t);
  if (st.chiave === 'futura') return { anno: a, trimestre: t, stato: st, trimestri, subagenti: [], senza_documenti: S.subagenti.size, riepilogo: null, chiusura: { possibile: false, motivo: 'Il trimestre non è iniziato' }, chiusa_il: null, chiusa_da: null, documenti: [] };
  const f = foto(t);
  // chiuso: le righe salvate con la fotografia (non si ricalcola, §4.2.19); aperto: quelle del motore
  // shortcut: le fotografie salvate prima di F4-A1 non hanno le righe, si ricalcolano finché non si rigenera il seed
  const documenti = (l ? (f.documenti ?? righe(t)) : righe(t)).map((r) => rigaDocumento(S, r, st.chiave === 'chiusa'));
  const subagenti = f.subagenti.map((s) => ({
    id: s.subagente_id, nome: s.nome, attivo: S.subagenti.get(s.subagente_id)?.attivo ?? true, documenti: s.documenti, liquidabili: s.liquidabili,
    imponibile: Number(s.imponibile), provvigione: Number(s.provvigione), in_attesa: Number(s.in_attesa), storni: s.storni,
  }));
  const motivo = l ? 'Trimestre già liquidato' : bloccoChiusura(S, st, righe(t), a, t);
  return {
    anno: a, trimestre: t, stato: st, trimestri, subagenti, senza_documenti: S.subagenti.size - subagenti.length,
    riepilogo: {
      documenti: subagenti.reduce((n, s) => n + s.documenti, 0), liquidabili: f.totale.documenti,
      imponibile: Number(f.totale.imponibile), provvigione: Number(f.totale.provvigione),
      in_attesa: Number(r2(f.subagenti.reduce((x, s) => x.plus(s.in_attesa), new Dec(0)))),
      bloccanti: l ? 0 : righe(t).filter((r) => !r.liquidabile && !r.incasso).length, // in attesa dei bollettini
      storni: subagenti.reduce((n, s) => n + s.storni, 0),
    },
    chiusura: { possibile: !motivo, motivo },
    chiusa_il: l ? giornoRoma(l.chiusa_il) : null, chiusa_da: l?.autore?.nome ?? null,
    documenti,
  };
}

@Controller('liquidazioni')
export class LiquidazioniController {
  constructor(private readonly db: PrismaService) {}

  /** Trimestre (§7.8): senza parametri quello di oggi, come il prototipo. */
  @Get()
  @Richiede('provvigioni.consulta')
  async pagina(@Query() q: Periodo) {
    const oggi = giornoRoma(new Date());
    return liquidazione(this.db, q.anno ?? Number(oggi.slice(0, 4)), q.trimestre ?? trimestre(oggi));
  }

  /** Chiusura del trimestre (§4.2.19, §7.8, D-11, D-33, D-51): blocca le righe di tutti i fornitori in ordine di id
   *  (la liquidazione chiude il periodo di tutti, come la verifica di un bollettino blocca il suo), poi ricontrolla e
   *  ricalcola dal database; salva la fotografia, lega documenti e voci alla liquidazione, un evento. Da qui il
   *  trimestre è periodo chiuso (ultimaChiusura). Riapertura: la spec non la descrive. */
  @Post(':anno/:trimestre/chiudi')
  @HttpCode(200)
  @Richiede('provvigioni.chiudi')
  async chiudi(@Req() req: Request, @Param('anno', ParseIntPipe) a: number, @Param('trimestre', ParseIntPipe) t: number) {
    if (a < 2000 || a > 2100 || t < 1 || t > 4) throw new BadRequestException('Anno o trimestre non validi');
    const ctx = contesto(req);
    // ponytail: 30 s perché carica tutti i dati (caricaDati); caricamento parziale quando i dati crescono
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM fornitori ORDER BY id FOR UPDATE`;
      // ponytail: la riga della liquidazione nasce qui; due chiusure insieme si fermano sul blocco dei fornitori e su UNIQUE(anno, trimestre)
      if (await tx.liquidazioni.findUnique({ where: { anno_trimestre: { anno: a, trimestre: t } } })) throw new ConflictException('Trimestre già liquidato');
      const S = await caricaDati(tx);
      const righe = righeLiquidazione(S, a, t);
      const motivo = bloccoChiusura(S, stato(S, a, t, undefined), righe, a, t);
      if (motivo) throw new ConflictException(motivo);
      const foto = fotografiaLiquidazione(S, righe);
      const liq = await tx.liquidazioni.create({ data: { anno: a, trimestre: t, chiusa_da: ctx.utente_id ?? null, totali: foto } }).catch((e) => {
        // senza fornitori da bloccare due chiusure insieme arrivano qui: la seconda trova UNIQUE(anno, trimestre)
        throw e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002' ? new ConflictException('Trimestre già liquidato') : e;
      });
      const documenti = righe.filter((r) => r.liquidabile && !r.voce).map((r) => BigInt(r.documento_id));
      const voci = righe.filter((r) => r.riga_bollettino_id).map((r) => BigInt(r.riga_bollettino_id!));
      // solo righe non ancora liquidate: un documento pagato due volte è un errore, non si scrive niente
      const d = await tx.ordini_fornitore_documenti.updateMany({ where: { id: { in: documenti }, liquidazione_id: null }, data: { liquidazione_id: liq.id } });
      const v = await tx.bollettini_righe.updateMany({ where: { id: { in: voci }, liquidazione_id: null }, data: { liquidazione_id: liq.id } });
      if (d.count !== documenti.length || v.count !== voci.length) throw new ConflictException('Ci sono documenti già liquidati in un altro trimestre');
      await logEvent(tx, {
        tipo: 'stato', azione: 'change_state', entita: 'liquidazione', entita_id: liq.id, esito: 'successo',
        dettaglio: {
          etichetta: `${t}° trimestre ${a}`, periodo: { anno: a, trimestre: t }, prima: { stato: 'da_liquidare' }, dopo: { stato: 'chiusa' },
          documenti: documenti.length, voci: voci.length, subagenti: foto.subagenti.length, imponibile: Number(foto.totale.imponibile), provvigione: Number(foto.totale.provvigione),
        },
      }, ctx);
    }, { timeout: 30_000 });
    return liquidazione(this.db, a, t);
  }
}
