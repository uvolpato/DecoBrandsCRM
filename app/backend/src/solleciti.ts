import { Controller, Get, Post, HttpCode, Body, NotFoundException, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';
import { Richiede, contesto } from './accesso';
import { type Dati, caricaDati, giornoRoma } from './motore/dati';
import { confermeInRitardo } from './oggi';
import { PrismaService } from './prisma.service';
import { logEvent } from './registro';

// Solleciti di conferma (§7.1, §5.12): il testo lo compone il server, un fornitore per scheda, con le
// sue pratiche in ritardo. La copia lascia l'evento export.sollecito (chi e quali pratiche): così resta
// traccia del sollecito anche quando la conferma non arriva.

const euro = (n: Prisma.Decimal) => Number(n).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const dataIt = (s: string) => s.split('-').reverse().join('/');

function testoFornitore(fornitore: string, voci: ReturnType<typeof confermeInRitardo>) {
  const elenco = voci.map((v) =>
    `- ${v.numero} del ${dataIt(v.data)} · ${v.cliente} (vostro codice ${v.codice}) · ${euro(v.importo)} · attesa entro il ${dataIt(v.scadenza)}`).join('\n');
  return `Gentili colleghi di ${fornitore},\n\nnon abbiamo ancora ricevuto la conferma ${voci.length === 1 ? 'del seguente ordine' : 'dei seguenti ordini'}:\n\n${elenco}` +
    '\n\nVi chiediamo di inviarcele appena possibile, indicando eventuali articoli non disponibili.\n\nGrazie,\nDecobrands SRL';
}

class SollecitoConferme {
  @Type(() => Number) @IsInt() @Min(1) fornitore_id!: number;
}

@Controller('solleciti')
export class SollecitiController {
  constructor(private readonly db: PrismaService) {}

  /** Testi pronti per fornitore (§7.1): numero, data, cliente, codice del fornitore, importo e data attesa. */
  @Get('conferme')
  @Richiede('provvigioni.consulta')
  async conferme() {
    return sollecitiConferme(await caricaDati(this.db, giornoRoma(new Date())));
  }

  /** Il testo del sollecito di conferma per un fornitore è stato copiato (§7.1): resta nel registro
   *  con le pratiche in ritardo di adesso (ricalcolate qui, non arrivate dal browser, V12). */
  @Post('conferme')
  @HttpCode(204)
  @Richiede('provvigioni.consulta')
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

/** I solleciti di conferma per fornitore; esportata per le prove con il giorno del prototipo. */
export function sollecitiConferme(S: Dati) {
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
      fornitore_id, fornitore: vv[0].fornitore, pratiche: vv.length, testo: testoFornitore(vv[0].fornitore, vv),
      voci: vv.map((v) => ({
        id: v.id, numero: v.numero, data: v.data, cliente: v.cliente, codice: v.codice,
        importo: Number(v.importo), attesa: v.scadenza, giorni: v.giorni,
      })),
    })),
  };
}
