import { BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Param, ParseIntPipe, Put, Req } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min, ValidateIf } from 'class-validator';
import type { Request } from 'express';
import { Richiede, contesto } from './accesso';
import { type Dati, caricaDatiBollettino } from './motore/dati';
import { riconcilia } from './motore/motore';
import { PrismaService } from './prisma.service';
import { type Contesto, logEvent } from './registro';

// Dettaglio del bollettino e riconciliazione "a cerniera" (F3-A2, §6.2, §7.7, §8.1): righe del fornitore
// contro il nostro calcolo (riconcilia del motore), decisioni sulle righe (D-49), abbinamento di una riga a un
// documento, chiusura (verificato | contestato). Tutto dal database, nessun valore calcolato dal browser (V12).

type Tx = Prisma.TransactionClient;
type Riconciliata = ReturnType<typeof riconcilia>['righe'][number];
const DECISIONI = ['accettato', 'contestato', 'attendere'] as const;
// decisioni ammesse per categoria, come i pulsanti del prototipo (viste-periodo.js, §7.7)
const SCELTE: Record<string, readonly string[]> = { differenza: ['accettato', 'contestato'], sconosciuta: ['accettato', 'contestato'], mancante: ['attendere', 'contestato'] };
const num = (x: Prisma.Decimal | null | undefined) => (x == null ? null : Number(x));
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

// importi e percentuali come il prototipo (M.euro, M.pct): punto per le migliaia, virgola per i decimali
function numeroIt(n: number, dec: number, min = 0) {
  const [i, d0] = Math.abs(n).toFixed(dec).split('.');
  let d = d0;
  if (d && min < dec) { d = d.replace(/0+$/, ''); while (d.length < min) d += '0'; }
  return (n < 0 && Number(Math.abs(n).toFixed(dec)) !== 0 ? '-' : '') + i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (d ? ',' + d : '');
}
const euroIt = (n: number) => numeroIt(n, 2, 2) + ' €';
const pctIt = (n: number) => numeroIt(n, 2) + ' %';
const dataIt = (s: string) => s.split('-').reverse().join('/');

class Decisione {
  @ValidateIf((_o, v) => v !== null) @IsIn(DECISIONI) decisione!: (typeof DECISIONI)[number] | null; // null = annulla
  @IsOptional() @IsString() @MaxLength(2000) motivo?: string | null;
}
class Abbina {
  @IsInt() @Min(1) documento_id!: number;
}
class Chiusura {
  @IsIn(['verificato', 'contestato']) stato!: 'verificato' | 'contestato';
  @IsOptional() @IsString() @MaxLength(2000) note?: string | null;
}

/** Riconciliazione del bollettino nella forma delle pagine; esportata per la prova di coerenza con caricaDati. */
export function riconciliazione(S: Dati, id: string) {
  const b = S.bollettini.find((x) => x.id === id);
  if (!b) return null;
  const f = S.fornitori.get(b.fornitore_id)!;
  const r = riconcilia(S, b);
  const aperto = b.stato === 'da_verificare';
  const lato = (l: Riconciliata['loro']) => l && { imponibile: num(l.imponibile), pct: num(l.pct), importo: Number(l.importo) };
  const contestate = r.righe.filter((x) => x.decisione?.esito === 'contestato').length;
  const n = (k: number, uno: string, piu: string) => `${k} ${k === 1 ? uno : piu}`;
  const azione = !aperto
    ? { tipo: 'chiuso', testo: b.stato === 'verificato' ? 'Bollettino verificato. Le provvigioni riconosciute sono acquisite.' : `Bollettino contestato: in attesa del bollettino rettificato da ${f.nome}.` }
    : r.aperte ? { tipo: 'decidi', testo: `${n(r.aperte, 'riga da decidere', 'righe da decidere')} prima di chiudere il bollettino.` }
      : contestate ? { tipo: 'contesta', testo: `${n(contestate, 'riga da contestare', 'righe da contestare')} a ${f.nome}.` }
        : { tipo: 'verifica', testo: 'Tutte le righe sono quadrate o decise.' };
  return {
    id: b.id, fornitore_id: b.fornitore_id, fornitore: f.nome, maturazione: f.maturazione, mese: b.mese, anno: b.anno,
    stato: b.stato, // da_verificare | verificato | contestato
    badge: aperto ? (r.aperte ? 'da_verificare' : 'pronto') : b.stato,
    ricevuto: b.ricevuto, chiuso_il: b.chiuso_il, modificabile: aperto,
    righe: r.righe.map((x) => ({
      id: x.id, documento_id: x.documento_id, numero: x.numero, data: x.data, tipo: x.tipo,
      pratica_id: x.pratica_id, cliente_id: x.cliente_id, cliente: x.cliente_id ? (S.clienti.get(x.cliente_id)?.nome ?? null) : null,
      categoria: x.categoria, // quadra · differenza · mancante · sconosciuta · storno · riaccredito · attesa_incasso · pagata_dopo
      gruppo: x.aperta ? 'da_decidere' : x.decisione ? 'decise' : x.incasso ? 'incassi' : 'quadrano',
      loro: lato(x.loro), noi: lato(x.noi), differenza: num(x.differenza),
      aperta: x.aperta, incasso: x.incasso, pagamento: x.pagamento, giorni: x.giorni,
      pagata_in: x.pagata_in ? (({ id, mese, anno }) => ({ id, mese, anno }))(S.bollettini.find((o) => o.id === x.pagata_in)!) : null,
      decisione: x.decisione, // {esito, motivo, da, il}; il nome di chi ha deciso lo aggiunge la rotta
      scelte: aperto && !x.incasso ? (SCELTE[x.categoria] ?? []) : [],
    })),
    totali: { riconosciuto: Number(r.riconosciuto), calcolato: Number(r.atteso), differenza: Number(r.differenza), aperte: r.aperte, contestate },
    azione,
  };
}

const etichetta = (S: Dati, b: Dati['bollettini'][number]) => `${b.mese}/${b.anno} · ${S.fornitori.get(b.fornitore_id)!.nome}`;

/** Blocchi in ordine fisso (D-51): prima la riga del fornitore, poi il bollettino; poi rilegge e ricalcola
 *  dal database. Solo un bollettino da verificare si modifica: chiuso = periodo chiuso. */
async function blocca(tx: Tx, id: bigint) {
  // ponytail: il fornitore di un bollettino non cambia, si legge prima del blocco; tutto il resto dopo
  const t = await tx.bollettini_testata.findUnique({ where: { id }, select: { fornitore_id: true } });
  if (!t) throw new NotFoundException('Bollettino non trovato');
  await tx.$queryRaw`SELECT id FROM fornitori WHERE id = ${t.fornitore_id} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM bollettini_testata WHERE id = ${id} FOR UPDATE`;
  const S = (await caricaDatiBollettino(tx, id))!; // una lettura sola del bollettino, dopo i blocchi
  const b = S.bollettini.find((x) => x.id === String(id))!;
  if (b.stato !== 'da_verificare') throw new ConflictException(`Bollettino ${b.stato}: è chiuso e non si modifica`);
  return { S, b, r: riconcilia(S, b) };
}

const eventoRiga = (tx: Tx, S: Dati, b: Dati['bollettini'][number], x: Riconciliata, riga_id: bigint, prima: object, dopo: object, ctx: Contesto) => logEvent(tx, {
  tipo: 'crud', azione: 'update', entita: 'riga_bollettino', entita_id: riga_id, esito: 'successo',
  dettaglio: { etichetta: `${x.numero}${x.cliente_id ? ' · ' + (S.clienti.get(x.cliente_id)?.nome ?? '') : ''}`, riga_bollettino_id: String(riga_id), bollettino_id: b.id, prima, dopo },
}, ctx);

@Controller('bollettini')
export class BollettinoController {
  constructor(private readonly db: PrismaService) {}

  /** Dettaglio (§7.7): testata, righe a cerniera, totali, azione proposta. Carica solo i dati del bollettino. */
  @Get(':id')
  @Richiede('provvigioni.consulta')
  async dettaglio(@Param('id', ParseIntPipe) id: number) {
    const S = await caricaDatiBollettino(this.db, BigInt(id));
    const r = S && riconciliazione(S, String(id));
    if (!r) throw new NotFoundException('Bollettino non trovato');
    const [t, utenti] = await Promise.all([
      this.db.bollettini_testata.findUniqueOrThrow({ where: { id: BigInt(id) }, select: { note: true, chiusore: { select: { nome: true } }, arrivati: { select: { id: true, file_nome: true }, take: 1 } } }),
      this.db.utenti.findMany({ where: { id: { in: r.righe.flatMap((x) => (x.decisione?.da ? [BigInt(x.decisione.da)] : [])) } }, select: { id: true, nome: true } }),
    ]);
    const nome = new Map(utenti.map((u) => [String(u.id), u.nome]));
    return {
      ...r, note: t.note, chiuso_da: t.chiusore?.nome ?? null,
      file: t.arrivati[0] ? { arrivo_id: String(t.arrivati[0].id), nome: t.arrivati[0].file_nome } : null,
      righe: r.righe.map((x) => ({ ...x, decisione: x.decisione && { ...x.decisione, da_nome: x.decisione.da ? (nome.get(x.decisione.da) ?? null) : null } })),
    };
  }

  /** Testo della contestazione da mandare al fornitore (F3-A2b, §7.7): righe contestate con i due lati,
   *  la differenza e il motivo, calcolato dal server (V12). 409 se nessuna riga è contestata. */
  @Get(':id/contestazione')
  @Richiede('provvigioni.consulta')
  async contestazione(@Param('id', ParseIntPipe) id: number) {
    const S = await caricaDatiBollettino(this.db, BigInt(id));
    const r = S && riconciliazione(S, String(id));
    if (!r) throw new NotFoundException('Bollettino non trovato');
    const righe = r.righe.filter((x) => x.decisione?.esito === 'contestato');
    if (!righe.length) throw new ConflictException('Nessuna riga contestata');
    const mese = MESI[r.mese - 1] + ' ' + r.anno;
    const conDifferenza = righe.filter((x) => x.differenza != null);
    const totale = conDifferenza.reduce((s, x) => s + (x.differenza ?? 0), 0);
    const riga = (x: (typeof righe)[number]) => {
      const chi = x.cliente ? ` (${x.cliente})` : '';
      const quando = x.data ? ` del ${dataIt(x.data)}` : '';
      const testo = x.categoria === 'mancante'
        ? `non compare nel bollettino, la provvigione attesa è ${euroIt(x.noi!.importo)} (${pctIt(x.noi!.pct ?? 0)})`
        : x.categoria === 'sconosciuta'
          ? `non ci risulta fra le nostre pratiche; voi riconoscete ${euroIt(x.loro!.importo)} (${pctIt(x.loro!.pct ?? 0)})`
          : `voi riconoscete ${euroIt(x.loro!.importo)} (${pctIt(x.loro!.pct ?? 0)}), noi calcoliamo ${euroIt(x.noi!.importo)} (${pctIt(x.noi!.pct ?? 0)})`;
      const differenza = x.differenza != null && x.categoria !== 'sconosciuta' ? ` Differenza ${euroIt(x.differenza)}.` : '';
      const motivo = x.decisione?.motivo ? ` Motivo: ${x.decisione.motivo}.` : '';
      return `- ${x.numero}${chi}${quando}: ${testo}.${differenza}${motivo}`;
    };
    return {
      oggetto: `Contestazione bollettino provvigioni ${mese} · ${r.fornitore}`,
      testo: [
        `Gentili colleghi di ${r.fornitore},`,
        `abbiamo verificato il bollettino provvigioni di ${mese} e vi segnaliamo:`,
        righe.map(riga).join('\n'),
        ...(conDifferenza.length ? [`Totale della differenza contestata: ${euroIt(totale)}.`] : []),
        'Vi chiediamo di inviarci il bollettino rettificato.',
        'Grazie,\nDecobrands SRL',
      ].join('\n\n'),
    };
  }

  /** Decisione su una riga del fornitore che non quadra (D-49): accettato · contestato (motivo obbligatorio); null annulla. */
  @Put(':id/righe/:rid/decisione')
  @Richiede('provvigioni.modifica')
  async decidiRiga(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Param('rid', ParseIntPipe) rid: number, @Body() d: Decisione) {
    return this.decidi(req, id, (x) => x.id === String(rid), d);
  }

  /** Decisione su un documento del mese che manca nel bollettino (D-56): attendere · contestato, in bollettini_attese. */
  @Put(':id/documenti/:did/decisione')
  @Richiede('provvigioni.modifica')
  async decidiDocumento(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Param('did', ParseIntPipe) did: number, @Body() d: Decisione) {
    return this.decidi(req, id, (x) => x.categoria === 'mancante' && x.documento_id === String(did), d);
  }

  private async decidi(req: Request, id: number, quale: (x: Riconciliata) => boolean, d: Decisione) {
    const ctx = contesto(req);
    await this.db.$transaction(async (tx) => {
      const { S, b, r } = await blocca(tx, BigInt(id));
      const x = r.righe.find(quale);
      if (!x) throw new NotFoundException('Riga non trovata');
      const scelte = x.incasso ? [] : (SCELTE[x.categoria] ?? []);
      if (!scelte.length) throw new ConflictException('Questa riga quadra o è un incasso: non va decisa');
      if (d.decisione && !scelte.includes(d.decisione)) throw new BadRequestException(`Su questa riga si sceglie fra: ${scelte.join(', ')}`);
      const motivo = d.motivo?.trim() || null;
      if (d.decisione === 'contestato' && !motivo) throw new BadRequestException('Scrivi il motivo: comparirà nel testo della contestazione');
      const v = d.decisione && { decisione: d.decisione, decisione_motivo: motivo, deciso_da: ctx.utente_id ?? null, deciso_il: new Date() };
      const di = (y: { esito: string; motivo: string | null } | null) => ({ decisione: y?.esito ?? null, motivo: y?.motivo ?? null });
      const prima = di(x.decisione), dopo = di(d.decisione ? { esito: d.decisione, motivo } : null);
      if (x.categoria !== 'mancante') {
        await tx.bollettini_righe.update({ where: { id: BigInt(x.id!) }, data: v || { decisione: null, decisione_motivo: null, deciso_da: null, deciso_il: null } });
        await eventoRiga(tx, S, b, x, BigInt(x.id!), prima, dopo, ctx);
        return;
      }
      const chiave = { testata_id: BigInt(id), documento_id: BigInt(x.documento_id!) };
      if (!v) {
        if (!(await tx.bollettini_attese.deleteMany({ where: chiave })).count) return; // niente da annullare
      } else {
        await tx.bollettini_attese.upsert({ where: { testata_id_documento_id: chiave }, create: { ...chiave, ...v }, update: v });
      }
      await logEvent(tx, {
        tipo: 'crud', azione: 'update', entita: 'bollettino', entita_id: BigInt(id), esito: 'successo',
        dettaglio: { etichetta: `${etichetta(S, b)} · ${x.numero} mancante`, bollettino_id: b.id, documento_id: x.documento_id, prima, dopo },
      }, ctx);
    });
    return this.dettaglio(id);
  }

  /** Abbinamento a mano di una riga del fornitore a un documento fiscale dello stesso fornitore (§4.2.10 documento_id, D-34).
   *  Toglie la decisione presa prima: il confronto è un altro. */
  @Put(':id/righe/:rid/documento')
  @Richiede('provvigioni.modifica')
  async abbina(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Param('rid', ParseIntPipe) rid: number, @Body() a: Abbina) {
    const ctx = contesto(req);
    await this.db.$transaction(async (tx) => {
      const { S, b, r } = await blocca(tx, BigInt(id));
      const riga = await tx.bollettini_righe.findUnique({ where: { id: BigInt(rid) } });
      if (!riga || riga.testata_id !== BigInt(id)) throw new NotFoundException('Riga non trovata');
      const doc = await tx.ordini_fornitore_documenti.findUnique({ where: { id: BigInt(a.documento_id) }, include: { testata: { select: { fornitore_id: true } } } });
      if (!doc) throw new NotFoundException('Documento non trovato');
      if (String(doc.testata.fornitore_id) !== b.fornitore_id) throw new BadRequestException('Il documento è di un altro fornitore');
      // lo stesso documento sta su una sola riga dello stesso tipo (storno e riaccredito sono righe a parte, §5.14):
      // per id, o per numero se l'altra riga non è ancora abbinata (come suDocumento del motore)
      const altra = await tx.bollettini_righe.findFirst({
        where: { id: { not: riga.id }, tipo_riga: riga.tipo_riga, OR: [{ documento_id: doc.id }, { documento_id: null, fattura_numero: doc.numero, testata: { fornitore_id: doc.testata.fornitore_id } }] },
        include: { testata: { select: { mese: true, anno: true } } },
      });
      if (altra) throw new ConflictException(`Il documento ${doc.numero} è già sulla riga ${altra.fattura_numero} del bollettino ${altra.testata.mese}/${altra.testata.anno}`);
      const x = r.righe.find((y) => y.id === String(rid))!;
      // D-56: E (il nuovo) non manca più, la sua attesa si toglie; D (il vecchio) torna mancante e da decidere
      await tx.bollettini_attese.deleteMany({ where: { testata_id: riga.testata_id, documento_id: { in: [doc.id, ...(x.documento_id ? [BigInt(x.documento_id)] : [])] } } });
      await tx.bollettini_righe.update({ where: { id: riga.id }, data: { documento_id: doc.id, decisione: null, decisione_motivo: null, deciso_da: null, deciso_il: null } });
      await eventoRiga(tx, S, b, x, riga.id, { documento_id: x.documento_id }, { documento_id: String(doc.id) }, ctx);
    });
    return this.dettaglio(id);
  }

  /** Chiusura (§6.2 punto 6, §5.11): verificato se tutte le righe quadrano o sono decise e nessuna è contestata,
   *  contestato se ce n'è almeno una contestata. Congela % e importo calcolati e abbina le righe ai documenti per id
   *  (D-34); da qui il mese è periodo chiuso (D-51, ultimaChiusura). Riapertura: la spec non la prevede. */
  @Put(':id/stato')
  @Richiede('provvigioni.modifica')
  async chiudi(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() c: Chiusura) {
    const ctx = contesto(req);
    await this.db.$transaction(async (tx) => {
      const { S, b, r } = await blocca(tx, BigInt(id));
      const contestate = r.righe.filter((x) => x.decisione?.esito === 'contestato').length;
      if (r.aperte) throw new ConflictException(`Ci sono ${r.aperte} righe da decidere prima di chiudere il bollettino`);
      if (c.stato === 'verificato' && contestate) throw new ConflictException('Ci sono righe contestate: il bollettino va segnato come contestato');
      if (c.stato === 'contestato' && !contestate) throw new ConflictException('Nessuna riga contestata: il bollettino va segnato come verificato');
      for (const x of r.righe) {
        if (!x.id || !x.loro || !x.documento_id) continue; // righe del fornitore abbinate a un nostro documento
        const congela = !x.incasso && x.noi ? { pct_calcolata: x.noi.pct, importo_calcolato: x.noi.importo } : {};
        await tx.bollettini_righe.update({ where: { id: BigInt(x.id) }, data: { documento_id: BigInt(x.documento_id), ...congela } });
      }
      // attese rimaste su documenti che ora sono su una riga (abbinati per numero): non valgono più (D-56)
      const mancanti = r.righe.filter((x) => x.categoria === 'mancante').map((x) => BigInt(x.documento_id!));
      await tx.bollettini_attese.deleteMany({ where: { testata_id: BigInt(id), documento_id: { notIn: mancanti } } });
      const note = c.note === undefined ? undefined : c.note?.trim() || null;
      await tx.bollettini_testata.update({ where: { id: BigInt(id) }, data: { stato: c.stato, chiuso_il: new Date(), chiuso_da: ctx.utente_id ?? null, note } });
      const et = etichetta(S, b);
      await logEvent(tx, {
        tipo: 'calcolo', azione: 'verify', entita: 'bollettino', entita_id: BigInt(id), esito: 'successo',
        dettaglio: { etichetta: et, bollettino_id: b.id, periodo: { mese: b.mese, anno: b.anno }, importo_riconosciuto: Number(r.riconosciuto), importo_calcolato: Number(r.atteso), differenza_totale: Number(r.differenza) },
      }, ctx);
      await logEvent(tx, {
        tipo: 'stato', azione: 'change_state', entita: 'bollettino', entita_id: BigInt(id), esito: 'successo',
        dettaglio: { etichetta: et, prima: { stato: b.stato }, dopo: { stato: c.stato }, motivo: note ?? null },
      }, ctx);
    });
    return this.dettaglio(id);
  }
}
