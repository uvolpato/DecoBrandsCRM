import { BadRequestException, Body, Controller, Get, NotFoundException, Param, ParseIntPipe, Post, Put, Req } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import type { Request } from 'express';
import { Richiede, contesto } from './accesso';
import { caricaDati, giornoRoma } from './motore/dati';
import { pagamentiDaSollecitare, r2 } from './motore/motore';
import { PrismaService } from './prisma.service';
import { logEvent } from './registro';

// Incassi dei clienti (F3-A3, §5.14): stato d'incasso delle fatture, "segna come non pagata/pagata",
// pagamenti da sollecitare e solleciti. Tutto dal database, nessun valore calcolato dal browser (V12).

type Voce = ReturnType<typeof pagamentiDaSollecitare>[number];
const euro = (n: number) => n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const dataIt = (s: string) => s.split('-').reverse().join('/');

/** Un testo per cliente con le fatture non pagate, come nel prototipo (viste-giorno.js, §5.14). */
function testoCliente(vv: Voce[], totale: Prisma.Decimal) {
  const elenco = vv.map((v) => `- ${v.numero} del ${dataIt(v.data)} · ${v.fornitore} · ${euro(Number(v.importo))} (${v.stato.giorni} giorni)`).join('\n');
  return `Gentile ${vv[0].cliente},\n\nci risulta ancora da saldare ${vv.length === 1 ? 'la seguente fattura' : 'le seguenti fatture'}:\n\n${elenco}` +
    `\n\nTotale: ${euro(Number(totale))}.\nVi chiediamo di provvedere al pagamento o di comunicarci eventuali contestazioni. Se avete già pagato, ignorate questo messaggio.\n\nGrazie,\nDecobrands SRL`;
}

class IncassoDocumento {
  @IsIn(['insoluta', 'pagata']) stato!: 'insoluta' | 'pagata';
  @IsOptional() @IsString() @MaxLength(2000) nota?: string;
}
class RegistraSollecito {
  @IsInt() @Min(1) cliente_id!: number;
}

@Controller()
export class IncassiController {
  constructor(private readonly db: PrismaService) {}

  /** Fatture da sollecitare al cliente (§5.14): non pagate (fatturato) e incassi da verificare
   *  (maturato oltre i giorni d'incasso), dalla più vecchia, con un testo già pronto per cliente. */
  @Get('pagamenti/solleciti')
  @Richiede('provvigioni.consulta')
  async elenco() {
    const S = await caricaDati(this.db);
    const voci = pagamentiDaSollecitare(S);
    const per = new Map<string, Voce[]>();
    for (const v of voci) (per.get(v.cliente_id) ?? per.set(v.cliente_id, []).get(v.cliente_id)!).push(v);
    return {
      voci: voci.map((v) => ({
        pratica_id: v.pratica_id, pratica: v.pratica, documento_id: v.documento_id, numero: v.numero, data: v.data,
        cliente_id: v.cliente_id, cliente: v.cliente, fornitore_id: v.fornitore_id, fornitore: v.fornitore,
        importo: Number(v.importo), stato: v.stato,
      })),
      per_cliente: [...per.entries()].map(([cliente_id, vv]) => {
        const totale = r2(vv.reduce((s, v) => s.plus(v.importo), new Prisma.Decimal(0)));
        return { cliente_id, cliente: vv[0].cliente, fatture: vv.map((v) => v.numero), totale: Number(totale), testo: testoCliente(vv, totale) };
      }),
    };
  }

  /** Segna a mano una fattura come pagata o non pagata (§5.14): la segnalazione del fornitore (email o
   *  telefono) vince sui bollettini se non è più vecchia. Solo fatture; evento stato.change_state. */
  @Put('documenti/:id/incasso')
  @Richiede('provvigioni.modifica')
  async incasso(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() b: IncassoDocumento) {
    const ctx = contesto(req);
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM ordini_fornitore_documenti WHERE id = ${BigInt(id)} FOR UPDATE`;
      const d = await tx.ordini_fornitore_documenti.findUnique({ where: { id: BigInt(id) } });
      if (!d) throw new NotFoundException('Documento non trovato');
      if (d.tipo !== 'fattura') throw new BadRequestException('Solo le fatture hanno uno stato di incasso');
      const oggi = giornoRoma(new Date());
      const prima = d.stato_incasso;
      const nota = b.nota !== undefined ? b.nota : d.note;
      await tx.ordini_fornitore_documenti.update({
        where: { id: d.id },
        data: {
          stato_incasso: b.stato, fonte_incasso: 'manuale',
          insoluta_dal: b.stato === 'insoluta' ? new Date(oggi) : null,
          pagata_il: b.stato === 'pagata' ? new Date(oggi) : null,
          note: nota,
        },
      });
      await logEvent(tx, {
        tipo: 'stato', azione: 'change_state', entita: 'documento', entita_id: d.id, esito: 'successo',
        dettaglio: { etichetta: `${d.numero} · Fattura`, prima: { stato_incasso: prima }, dopo: { stato_incasso: b.stato }, fonte_incasso: 'manuale', nota: nota ?? null },
      }, ctx);
      return { id: String(d.id), numero: d.numero, stato_incasso: b.stato, fonte_incasso: 'manuale' };
    });
  }

  /** Il testo del sollecito per un cliente è stato copiato (§5.14): si registra il sollecito sulle sue
   *  fatture da sollecitare (solleciti +1, sollecitata_il = oggi) e l'evento documento.export. */
  @Post('pagamenti/solleciti')
  @Richiede('provvigioni.modifica')
  async registra(@Req() req: Request, @Body() b: RegistraSollecito) {
    const ctx = contesto(req);
    return this.db.$transaction(async (tx) => {
      const voci = pagamentiDaSollecitare(await caricaDati(tx)).filter((v) => v.cliente_id === String(b.cliente_id));
      if (!voci.length) throw new NotFoundException('Nessuna fattura da sollecitare per questo cliente');
      const ids = voci.map((v) => BigInt(v.documento_id));
      await tx.$queryRaw`SELECT id FROM ordini_fornitore_documenti WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`;
      const massimo = (await tx.ordini_fornitore_documenti.aggregate({ where: { id: { in: ids } }, _max: { solleciti: true } }))._max.solleciti ?? 0;
      await tx.ordini_fornitore_documenti.updateMany({ where: { id: { in: ids } }, data: { solleciti: { increment: 1 }, sollecitata_il: new Date(giornoRoma(new Date())) } });
      const totale = r2(voci.reduce((s, v) => s.plus(v.importo), new Prisma.Decimal(0)));
      await logEvent(tx, {
        tipo: 'documento', azione: 'export', entita: 'documento', esito: 'successo',
        dettaglio: { etichetta: voci[0].cliente, fatture: voci.map((v) => v.numero), importo_totale: Number(totale), solleciti: massimo + 1 },
      }, ctx);
      return { cliente_id: String(b.cliente_id), cliente: voci[0].cliente, fatture: voci.length, solleciti: massimo + 1 };
    });
  }
}
