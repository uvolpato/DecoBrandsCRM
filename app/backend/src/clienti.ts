import {
  BadRequestException, Body, ConflictException, Controller, Delete, Get, HttpCode, NotFoundException, Param, ParseIntPipe, Post, Put, Req,
} from '@nestjs/common';
import { type clienti, type clienti_versioni, type interscambio } from '@prisma/client';
import { IsIn, IsInt, IsISO8601, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import type { Request } from 'express';
import { Richiede, contesto, permessiDi } from './accesso';
import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { logEvent } from './registro';

// Clienti (sola lettura, da Integra) e agenzie (interscambio) (F1-A3, §7.6, §8.1, §15.2.3).

// Campo facoltativo che non accetta null: @IsOptional lascerebbe passare null su colonne NOT NULL (500)
const Facoltativo = () => ValidateIf((_o, v) => v !== undefined);

class DatiAgenzia {
  @Facoltativo() @IsInt() subagente_id?: number;
  @Facoltativo() @IsInt() fornitore_id?: number;
  @IsOptional() @IsString() @MaxLength(50) codice_cliente_fornitore?: string | null;
  @Facoltativo() @IsNumber() @Min(0) @Max(100) sconto?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) pct_subagente?: number | null;
  @IsOptional() @IsIn(['prima', 'piu_alta']) regola_mensile?: string | null;
  @Facoltativo() @IsISO8601({ strict: true }) valido_dal?: string;
  @IsOptional() @IsISO8601({ strict: true }) valido_al?: string | null;
}

// D-50 §19: percentuale e regola del subagente cambiano i soldi: solo chi ha dati.condizioni
function soloResponsabile(req: Request, b: DatiAgenzia, attuale: { pct: number | null; regola: string | null }) {
  const cambia = (b.pct_subagente !== undefined && b.pct_subagente !== attuale.pct)
    || (b.regola_mensile !== undefined && b.regola_mensile !== attuale.regola);
  if (cambia && !permessiDi(req.utente!.ruolo, req.livelli ?? {}).includes('dati.condizioni')) {
    throw new ForbiddenException('Percentuale e regola del subagente le cambia un responsabile');
  }
}

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

function mappaCliente(c: clienti & { corrente?: clienti_versioni | null; soggetto?: { id: bigint; codice: string } | null }, codice: string | null) {
  const v = c.corrente;
  return {
    id: String(c.id),
    ragione_sociale: v?.ragione_sociale ?? null,
    piva: v?.piva ?? null,
    indirizzo: v?.indirizzo ?? null,
    cap: v?.cap ?? null,
    citta: v?.citta ?? null,
    provincia: v?.provincia ?? null,
    email: v?.email ?? null,
    codice_integra: codice,
    soggetto_id: c.soggetto ? String(c.soggetto.id) : null, // D-102: l'anagrafica unica
    soggetto_codice: c.soggetto?.codice ?? null,
    attivo: c.attivo,
  };
}

function mappaAgenzia(a: interscambio & {
  subagente?: { id: bigint; codice: string; nome: string; cognome: string } | null;
  fornitore?: { id: bigint; corrente?: { ragione_sociale: string | null } | null } | null;
}) {
  return {
    id: String(a.id),
    subagente_id: String(a.subagente_id),
    subagente: a.subagente ? `${a.subagente.cognome} ${a.subagente.nome}` : null,
    subagente_codice: a.subagente?.codice ?? null,
    fornitore_id: String(a.fornitore_id),
    fornitore: a.fornitore?.corrente?.ragione_sociale ?? null,
    codice_cliente_fornitore: a.codice_cliente_fornitore,
    sconto: Number(a.sconto),
    pct_subagente: a.pct_subagente === null ? null : Number(a.pct_subagente),
    regola_mensile: a.regola_mensile,
    valido_dal: iso(a.valido_dal)!,
    valido_al: iso(a.valido_al),
  };
}

@Controller('clienti')
export class ClientiController {
  constructor(private readonly db: PrismaService) {}

  @Get()
  @Richiede('dati.consulta')
  async elenco() {
    const clienti = await this.db.clienti.findMany({
      include: {
        corrente: { select: { ragione_sociale: true, piva: true, citta: true } },
        soggetto: { select: { id: true, codice: true } },
      },
      orderBy: { id: 'asc' },
    });
    const codici = await this.db.codici_esterni.findMany({ where: { sistema: 'integra', tipo: 'cliente' } });
    const codicePer = new Map(codici.map((c) => [String(c.entita_id), c.codice]));
    const righe = await this.db.interscambio.findMany({ select: { cliente_id: true, fornitore_id: true, subagente_id: true } });
    const agenziePer = new Map<string, number>();
    const fornPer = new Map<string, Set<string>>();
    const subPer = new Map<string, Set<string>>();
    for (const r of righe) { // D-50: id per i filtri dell'elenco
      const k = String(r.cliente_id);
      agenziePer.set(k, (agenziePer.get(k) ?? 0) + 1);
      (fornPer.get(k) ?? fornPer.set(k, new Set()).get(k)!).add(String(r.fornitore_id));
      (subPer.get(k) ?? subPer.set(k, new Set()).get(k)!).add(String(r.subagente_id));
    }
    const pratiche = await this.db.ordini_fornitore_testata.groupBy({ by: ['cliente_id'], _count: { _all: true }, where: { stato: { not: 'fatturato' } } });
    const pratichePer = new Map(pratiche.map((p) => [String(p.cliente_id), p._count._all]));
    return clienti.map((c) => ({
      id: String(c.id),
      ragione_sociale: c.corrente?.ragione_sociale ?? null,
      piva: c.corrente?.piva ?? null,
      citta: c.corrente?.citta ?? null,
      codice_integra: codicePer.get(String(c.id)) ?? null,
      soggetto_id: c.soggetto ? String(c.soggetto.id) : null, // D-102: l'anagrafica unica
      soggetto_codice: c.soggetto?.codice ?? null,
      attivo: c.attivo,
      agenzie: agenziePer.get(String(c.id)) ?? 0,
      fornitori_ids: [...(fornPer.get(String(c.id)) ?? [])],
      subagenti_ids: [...(subPer.get(String(c.id)) ?? [])],
      pratiche_aperte: pratichePer.get(String(c.id)) ?? 0,
    }));
  }

  @Get(':id')
  @Richiede('dati.consulta')
  async dettaglio(@Param('id', ParseIntPipe) id: number) {
    const c = await this.db.clienti.findUnique({
      where: { id: BigInt(id) },
      include: {
        corrente: true,
        soggetto: { select: { id: true, codice: true } },
        agenzie: {
          include: {
            subagente: { select: { id: true, codice: true, nome: true, cognome: true } },
            fornitore: { include: { corrente: { select: { ragione_sociale: true } } } },
          },
          orderBy: { id: 'asc' },
        },
      },
    });
    if (!c) throw new NotFoundException('Cliente non trovato');
    const codice = await this.db.codici_esterni.findFirst({ where: { sistema: 'integra', tipo: 'cliente', entita_id: BigInt(id) } });
    return {
      ...mappaCliente(c as never, codice?.codice ?? null),
      agenzie: c.agenzie.map((a) => mappaAgenzia(a as never)),
    };
  }

  @Get(':id/pratiche')
  @Richiede('dati.consulta')
  async pratiche(@Param('id', ParseIntPipe) id: number) {
    const c = await this.db.clienti.findUnique({ where: { id: BigInt(id) } });
    if (!c) throw new NotFoundException('Cliente non trovato');
    const ps = await this.db.ordini_fornitore_testata.findMany({
      where: { cliente_id: BigInt(id) },
      include: {
        fornitore: { select: { ragione_sociale: true } },
      },
      orderBy: { data_ordine: 'desc' },
    });
    return ps.map((p) => ({
      id: String(p.id),
      numero_ordine: p.numero_ordine,
      data_ordine: iso(p.data_ordine)!,
      fornitore_id: String(p.fornitore_id),
      fornitore: p.fornitore?.ragione_sociale ?? null,
      importo_merce: p.importo_merce === null ? null : Number(p.importo_merce),
      stato: p.stato,
    }));
  }

  @Get(':id/agenzie')
  @Richiede('dati.consulta')
  async elencoAgenzie(@Param('id', ParseIntPipe) id: number) {
    const c = await this.db.clienti.findUnique({ where: { id: BigInt(id) } });
    if (!c) throw new NotFoundException('Cliente non trovato');
    const ag = await this.db.interscambio.findMany({
      where: { cliente_id: BigInt(id) },
      include: {
        subagente: { select: { id: true, codice: true, nome: true, cognome: true } },
        fornitore: { include: { corrente: { select: { ragione_sociale: true } } } },
      },
      orderBy: { id: 'asc' },
    });
    return ag.map((a) => mappaAgenzia(a as never));
  }

  @Post(':id/agenzie')
  @Richiede('dati.modifica')
  async creaAgenzia(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() b: DatiAgenzia) {
    soloResponsabile(req, b, { pct: null, regola: null });
    if (!b.subagente_id) throw new BadRequestException('Subagente obbligatorio');
    if (!b.fornitore_id) throw new BadRequestException('Fornitore obbligatorio');
    if (!b.valido_dal) throw new BadRequestException('Data di inizio obbligatoria');
    if (b.valido_al && new Date(b.valido_al) <= new Date(b.valido_dal)) throw new BadRequestException('La data di fine deve essere dopo la data di inizio');
    return unico(() => this.db.$transaction(async (tx) => {
      const cliente = await tx.clienti.findUnique({ where: { id: BigInt(id) }, include: { corrente: { select: { ragione_sociale: true } } } });
      if (!cliente) throw new NotFoundException('Cliente non trovato');
      const sub = await tx.subagenti.findUnique({ where: { id: BigInt(b.subagente_id!) } });
      if (!sub) throw new NotFoundException('Subagente non trovato');
      const fornitore = await tx.fornitori.findUnique({ where: { id: BigInt(b.fornitore_id!) }, include: { corrente: { select: { ragione_sociale: true } } } });
      if (!fornitore) throw new NotFoundException('Fornitore non trovato');
      const creato = await tx.interscambio.create({
        data: {
          cliente_id: BigInt(id),
          subagente_id: BigInt(b.subagente_id!),
          fornitore_id: BigInt(b.fornitore_id!),
          codice_cliente_fornitore: b.codice_cliente_fornitore ? b.codice_cliente_fornitore.trim() : null,
          sconto: b.sconto ?? 0,
          pct_subagente: b.pct_subagente === undefined ? null : b.pct_subagente,
          regola_mensile: b.regola_mensile ?? null,
          valido_dal: new Date(b.valido_dal!),
          valido_al: b.valido_al ? new Date(b.valido_al) : null,
        },
        include: {
          subagente: { select: { id: true, codice: true, nome: true, cognome: true } },
          fornitore: { include: { corrente: { select: { ragione_sociale: true } } } },
        },
      });
      await logEvent(tx, {
        tipo: 'crud', azione: 'create', entita: 'interscambio', entita_id: creato.id, esito: 'successo',
        dettaglio: {
          etichetta: `${cliente.corrente?.ragione_sociale ?? ''} · ${fornitore.corrente?.ragione_sociale ?? ''}`,
          subagente_id: String(creato.subagente_id),
          cliente_id: String(creato.cliente_id),
          fornitore_id: String(creato.fornitore_id),
          codice_cliente_fornitore: creato.codice_cliente_fornitore,
          sconto: Number(creato.sconto),
        },
      }, contesto(req));
      return mappaAgenzia(creato as never);
    }));
  }

  @Put(':id/agenzie/:aid')
  @Richiede('dati.modifica')
  async modificaAgenzia(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Param('aid', ParseIntPipe) aid: number, @Body() b: DatiAgenzia) {
    return unico(() => this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM interscambio WHERE id = ${BigInt(aid)} FOR UPDATE`;
      const prima = await tx.interscambio.findUnique({
        where: { id: BigInt(aid) },
        include: {
          subagente: { select: { id: true, codice: true, nome: true, cognome: true } },
          fornitore: { include: { corrente: { select: { ragione_sociale: true } } } },
          cliente: { include: { corrente: { select: { ragione_sociale: true } } } },
        },
      });
      if (!prima || prima.cliente_id !== BigInt(id)) throw new NotFoundException('Agenzia non trovata');
      soloResponsabile(req, b, { pct: prima.pct_subagente === null ? null : Number(prima.pct_subagente), regola: prima.regola_mensile });
      if (b.subagente_id !== undefined) {
        const sub = await tx.subagenti.findUnique({ where: { id: BigInt(b.subagente_id) } });
        if (!sub) throw new NotFoundException('Subagente non trovato');
      }
      if (b.fornitore_id !== undefined) {
        const fornitore = await tx.fornitori.findUnique({ where: { id: BigInt(b.fornitore_id) } });
        if (!fornitore) throw new NotFoundException('Fornitore non trovato');
      }
      const dopoData = {
        subagente_id: b.subagente_id !== undefined ? BigInt(b.subagente_id) : prima.subagente_id,
        fornitore_id: b.fornitore_id !== undefined ? BigInt(b.fornitore_id) : prima.fornitore_id,
        codice_cliente_fornitore: b.codice_cliente_fornitore !== undefined
          ? (b.codice_cliente_fornitore ? b.codice_cliente_fornitore.trim() : null)
          : prima.codice_cliente_fornitore,
        sconto: b.sconto !== undefined ? b.sconto : Number(prima.sconto),
        pct_subagente: b.pct_subagente !== undefined ? b.pct_subagente : (prima.pct_subagente === null ? null : Number(prima.pct_subagente)),
        regola_mensile: b.regola_mensile !== undefined ? b.regola_mensile : prima.regola_mensile,
        valido_dal: b.valido_dal !== undefined ? new Date(b.valido_dal) : prima.valido_dal,
        valido_al: b.valido_al !== undefined ? (b.valido_al ? new Date(b.valido_al) : null) : prima.valido_al,
      };
      if (dopoData.valido_al && dopoData.valido_al <= dopoData.valido_dal) throw new BadRequestException('La data di fine deve essere dopo la data di inizio');
      const campi = ['subagente_id', 'fornitore_id', 'codice_cliente_fornitore', 'sconto', 'pct_subagente', 'regola_mensile', 'valido_dal', 'valido_al'] as const;
      const primaDiff: Record<string, unknown> = {};
      const dopoDiff: Record<string, unknown> = {};
      for (const c of campi) {
        let pv: unknown;
        let dv: unknown;
        if (c === 'subagente_id' || c === 'fornitore_id') {
          pv = String((prima as Record<string, unknown>)[c]);
          dv = String(dopoData[c]);
        } else if (c === 'valido_dal' || c === 'valido_al') {
          pv = iso((prima as Record<string, unknown>)[c] as Date | null);
          dv = iso(dopoData[c] as Date | null);
        } else if (c === 'sconto') {
          pv = Number(prima.sconto);
          dv = dopoData.sconto;
        } else if (c === 'pct_subagente') {
          pv = prima.pct_subagente === null ? null : Number(prima.pct_subagente);
          dv = dopoData.pct_subagente;
        } else {
          pv = (prima as Record<string, unknown>)[c];
          dv = (dopoData as Record<string, unknown>)[c];
        }
        if (JSON.stringify(pv) !== JSON.stringify(dv)) {
          primaDiff[c] = pv;
          dopoDiff[c] = dv;
        }
      }
      if (Object.keys(dopoDiff).length === 0) {
        const ag = await tx.interscambio.findUnique({
          where: { id: prima.id },
          include: {
            subagente: { select: { id: true, codice: true, nome: true, cognome: true } },
            fornitore: { include: { corrente: { select: { ragione_sociale: true } } } },
          },
        });
        return mappaAgenzia(ag as never);
      }
      const dopo = await tx.interscambio.update({
        where: { id: prima.id },
        data: {
          subagente_id: dopoData.subagente_id,
          fornitore_id: dopoData.fornitore_id,
          codice_cliente_fornitore: dopoData.codice_cliente_fornitore,
          sconto: dopoData.sconto,
          pct_subagente: dopoData.pct_subagente,
          regola_mensile: dopoData.regola_mensile,
          valido_dal: dopoData.valido_dal,
          valido_al: dopoData.valido_al,
        },
        include: {
          subagente: { select: { id: true, codice: true, nome: true, cognome: true } },
          fornitore: { include: { corrente: { select: { ragione_sociale: true } } } },
        },
      });
      await logEvent(tx, {
        tipo: 'crud', azione: 'update', entita: 'interscambio', entita_id: prima.id, esito: 'successo',
        dettaglio: {
          etichetta: `${prima.cliente?.corrente?.ragione_sociale ?? ''} · ${prima.fornitore?.corrente?.ragione_sociale ?? ''}`,
          prima: primaDiff,
          dopo: dopoDiff,
        },
      }, contesto(req));
      return mappaAgenzia(dopo as never);
    }));
  }

  @Delete(':id/agenzie/:aid')
  @HttpCode(204)
  @Richiede('dati.modifica')
  async eliminaAgenzia(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Param('aid', ParseIntPipe) aid: number) {
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM interscambio WHERE id = ${BigInt(aid)} FOR UPDATE`;
      const a = await tx.interscambio.findUnique({
        where: { id: BigInt(aid) },
        include: {
          cliente: { include: { corrente: { select: { ragione_sociale: true } } } },
          fornitore: { include: { corrente: { select: { ragione_sociale: true } } } },
        },
      });
      if (!a || a.cliente_id !== BigInt(id)) throw new NotFoundException('Agenzia non trovata');
      await tx.interscambio.delete({ where: { id: a.id } });
      await logEvent(tx, {
        tipo: 'crud', azione: 'delete', entita: 'interscambio', entita_id: a.id, esito: 'successo',
        dettaglio: {
          etichetta: `${a.cliente?.corrente?.ragione_sociale ?? ''} · ${a.fornitore?.corrente?.ragione_sociale ?? ''}`,
          interscambio_id: String(a.id),
          subagente_id: String(a.subagente_id),
          cliente_id: String(a.cliente_id),
          fornitore_id: String(a.fornitore_id),
          codice_cliente_fornitore: a.codice_cliente_fornitore,
          sconto: Number(a.sconto),
        },
      }, contesto(req));
    });
  }
}

/** Errori del database come risposte: periodo sovrapposto (EXCLUDE) 409, CHECK 400, riferimento 409. */
export async function unico<T>(fn: () => Promise<T>, sovrapposto = 'Periodo sovrapposto per questo cliente/fornitore') {
  try {
    return await fn();
  } catch (e) {
    const anyErr = e as { code?: string; cause?: { originalCode?: string; originalMessage?: string } } & Error;
    const code = anyErr.code ?? anyErr.cause?.originalCode;
    if (code === '23P01') throw new ConflictException(sovrapposto);
    if (code === '23514') throw new BadRequestException('Valore non ammesso');
    if (code === 'P2003') throw new ConflictException('Riferimento non valido');
    throw e;
  }
}