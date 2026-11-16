import { Controller, Get, Post, HttpCode, Body, NotFoundException, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { Richiede, contesto } from './accesso';
import { type Dati, caricaDati, giornoRoma } from './motore/dati';
import { fiscaliDelMese } from './motore/motore';
import { confermeInRitardo } from './oggi';
import { PrismaService } from './prisma.service';
import { logEvent } from './registro';

// Solleciti di conferma (§7.1, §5.12): il testo lo compone il server, un fornitore per scheda, con le
// sue pratiche in ritardo. La copia lascia l'evento export.sollecito (chi e quali pratiche): così resta
// traccia del sollecito anche quando la conferma non arriva.

const euro = (n: Prisma.Decimal) => Number(n).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const dataIt = (s: string) => s.split('-').reverse().join('/');

type Scaduta = ReturnType<typeof confermeInRitardo>[number];
type VoceConRiferimento = Scaduta & { ordine_fornitore: string | null };

/** Testo del sollecito di conferma (§7.1, §5.12): in testa il numero d'ordine del fornitore (quello
 *  che lui conosce, D-169), il nostro numero di pratica solo in fondo come «nostro rif.». Se il numero
 *  del fornitore manca, si usa il nostro numero d'ordine con data e cliente, senza inventare. */
function testoFornitore(fornitore: string, voci: VoceConRiferimento[]) {
  const elenco = voci.map((v) => {
    const riferimento = v.ordine_fornitore ?? v.numero;
    const nostro = v.ordine_fornitore ? ` · nostro rif. ${v.numero}` : '';
    return `- Ordine ${riferimento} del ${dataIt(v.data)} · ${v.cliente} (vostro codice cliente ${v.codice}) · ${euro(v.importo)} · conferma attesa entro il ${dataIt(v.scadenza)}${nostro}`;
  }).join('\n');
  const singolo = voci.length === 1;
  return `Gentili colleghi di ${fornitore},\n\nnon abbiamo ancora ricevuto la conferma ${singolo ? 'del seguente ordine' : 'dei seguenti ordini'}:\n\n${elenco}` +
    `\n\nVi chiediamo di ${singolo ? 'inviarcela' : 'inviarcele'} appena possibile, indicando eventuali articoli non disponibili.\n\nGrazie,\nDecobrands SRL`;
}

class SollecitoConferme {
  @Type(() => Number) @IsInt() @Min(1) fornitore_id!: number;
}
class SollecitoBollettino {
  @Type(() => Number) @IsInt() @Min(1) fornitore_id!: number;
  @Type(() => Number) @IsInt() @Min(2000) @Max(2100) anno!: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(12) mese!: number;
}
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

/** Testo del sollecito del bollettino di un mese (§7.7), composto dal server sui documenti del mese. */
export function sollecitoBollettino(S: Dati, b: { fornitore_id: number; anno: number; mese: number }) {
  const fid = String(b.fornitore_id), f = S.fornitori.get(fid);
  if (!f) throw new NotFoundException('Fornitore non trovato');
  const mese = `${b.anno}-${String(b.mese).padStart(2, '0')}`;
  const docs = fiscaliDelMese(S, fid, mese);
  const righe = docs.map(({ pratica, doc }) =>
    `- ${doc.numero} del ${dataIt(doc.data)} · ${S.clienti.get(pratica.cliente_id)?.nome ?? ''} · ${euro(doc.importo)}`);
  return {
    fornitore_id: fid, fornitore: f.nome, anno: b.anno, mese: b.mese, documenti: docs.length,
    numeri: docs.map((x) => x.doc.numero),
    testo: [
      `Gentili colleghi di ${f.nome},`,
      `non abbiamo ancora ricevuto il bollettino provvigioni di ${MESI[b.mese - 1]} ${b.anno}.`,
      'Ci risultano questi documenti del mese:',
      ...(righe.length ? righe : ['- nessun documento del mese']),
      'Vi chiediamo di inviarcelo appena possibile.',
      'Grazie,\nDecobrands SRL',
    ].join('\n\n'),
  };
}

@Controller('solleciti')
export class SollecitiController {
  constructor(private readonly db: PrismaService) {}

  /** Testi pronti per fornitore (§7.1): numero d'ordine del fornitore, data, cliente con il suo codice,
   *  importo e data attesa; il nostro numero di pratica in fondo come «nostro rif.». */
  @Get('conferme')
  @Richiede('provvigioni.consulta')
  async conferme() {
    const S = await caricaDati(this.db, giornoRoma(new Date()));
    return sollecitiConferme(S, await numeriOrdineFornitore(this.db, S));
  }

  /** Testo del sollecito del bollettino di un mese (§7.7): il fornitore non l'ha ancora mandato. */
  @Get('bollettini')
  @Richiede('provvigioni.consulta')
  async bollettini(@Query() q: SollecitoBollettino) {
    return sollecitoBollettino(await caricaDati(this.db, giornoRoma(new Date())), q);
  }

  /** Il testo del sollecito del bollettino è stato copiato: resta nel registro. */
  @Post('bollettini')
  @HttpCode(204)
  @Richiede('provvigioni.modifica')
  async copiaBollettino(@Req() req: Request, @Body() b: SollecitoBollettino) {
    const r = sollecitoBollettino(await caricaDati(this.db, giornoRoma(new Date())), b);
    await logEvent(this.db, {
      tipo: 'export', azione: 'sollecito', entita: 'fornitore', entita_id: BigInt(b.fornitore_id), esito: 'successo',
      dettaglio: { etichetta: `${r.fornitore} · ${MESI[b.mese - 1]} ${b.anno}`, pratiche: r.numeri },
    }, contesto(req));
  }

  /** Il testo del sollecito di conferma per un fornitore è stato copiato (§7.1): resta nel registro
   *  con le pratiche in ritardo di adesso (ricalcolate qui, non arrivate dal browser, V12). */
  @Post('conferme')
  @HttpCode(204)
  @Richiede('provvigioni.modifica')
  async copia(@Req() req: Request, @Body() b: SollecitoConferme) {
    const S = await caricaDati(this.db, giornoRoma(new Date()));
    const f = sollecitiConferme(S).per_fornitore.find((x) => x.fornitore_id === String(b.fornitore_id));
    if (!f) throw new NotFoundException('Nessuna conferma in ritardo per questo fornitore');
    await logEvent(this.db, {
      tipo: 'export', azione: 'sollecito', entita: 'fornitore', entita_id: BigInt(b.fornitore_id), esito: 'successo',
      dettaglio: { etichetta: f.fornitore, pratiche: f.voci.map((v) => v.numero) },
    }, contesto(req));
  }
}

/** I solleciti di conferma per fornitore; esportata per le prove con il giorno del prototipo.
 *  `numeriFornitore`: numero d'ordine del fornitore per pratica (D-169), letto dal database. */
export function sollecitiConferme(S: Dati, numeriFornitore: ReadonlyMap<string, string> = new Map()) {
  const voci = confermeInRitardo(S);
  const per = new Map<string, typeof voci>();
  for (const v of voci) {
    const lista = per.get(v.fornitore_id) ?? [];
    lista.push(v);
    per.set(v.fornitore_id, lista);
  }
  return {
    totale: voci.length,
    per_fornitore: [...per.entries()].map(([fornitore_id, vv]) => ({
      fornitore_id, fornitore: vv[0].fornitore, pratiche: vv.length,
      testo: testoFornitore(vv[0].fornitore, vv.map((v) => ({ ...v, ordine_fornitore: numeriFornitore.get(v.id) ?? null }))),
      voci: vv.map((v) => ({
        id: v.id, numero: v.numero, data: v.data, cliente: v.cliente, codice: v.codice,
        importo: Number(v.importo), attesa: v.scadenza, giorni: v.giorni,
      })),
    })),
  };
}

/** Numero d'ordine del fornitore (D-169) per le pratiche in ritardo: il riferimento che il fornitore
 *  conosce, letto dal database (V12). Il nostro numero di pratica non è il suo riferimento. */
async function numeriOrdineFornitore(db: PrismaService, S: Dati): Promise<Map<string, string>> {
  const ids = confermeInRitardo(S).map((v) => BigInt(v.id));
  if (!ids.length) return new Map();
  const righe = await db.ordini_fornitore_testata.findMany({ where: { id: { in: ids } }, select: { id: true, numero_ordine_fornitore: true } });
  return new Map(righe.filter((r) => r.numero_ordine_fornitore).map((r) => [String(r.id), r.numero_ordine_fornitore!]));
}
