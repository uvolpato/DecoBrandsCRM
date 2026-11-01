import {
  Body, Controller, Get, NotFoundException, Param, ParseIntPipe, Put, Req,
} from '@nestjs/common';
import { type fornitori, type provvigioni_scaglioni } from '@prisma/client';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import type { Request } from 'express';
import { Richiede, contesto } from './accesso';
import { PrismaService } from './prisma.service';
import { logEvent } from './registro';

// Fornitori e scaglioni (F1-A1, §7.4, §8.1). Le anagrafiche (ragione sociale, P.IVA, paese) vengono da
// Integra e si leggono da fornitori_versioni: qui si modificano solo le regole del CRM.

// Campo facoltativo che non accetta null: @IsOptional lascerebbe passare null su colonne NOT NULL (500)
const Facoltativo = () => ValidateIf((_o, v) => v !== undefined);

class ModificaFornitore {
  @Facoltativo() @IsInt() @Min(0) giorni_attesa_conferma?: number;
  @Facoltativo() @IsInt() @Min(1) @Max(28) giorno_bollettino?: number;
  @Facoltativo() @IsIn(['maturato', 'fatturato']) tipo_provvigione?: string;
  @Facoltativo() @IsInt() @Min(0) giorni_incasso?: number;
  @IsOptional() @IsString() @MaxLength(2000) note?: string;
}


const CAMPI_REGOLE = ['giorni_attesa_conferma', 'giorno_bollettino', 'tipo_provvigione', 'giorni_incasso', 'note'] as const;

function mappaFornitore(f: fornitori & { corrente?: { ragione_sociale: string; piva: string | null; paese: string | null } | null }, codice: string | null) {
  return {
    id: String(f.id),
    ragione_sociale: f.corrente?.ragione_sociale ?? null,
    piva: f.corrente?.piva ?? null,
    paese: f.corrente?.paese ?? null,
    codice_integra: codice,
    giorni_attesa_conferma: f.giorni_attesa_conferma,
    giorno_bollettino: f.giorno_bollettino,
    tipo_provvigione: f.tipo_provvigione,
    giorni_incasso: f.giorni_incasso,
    note: f.note,
    attivo: f.attivo,
  };
}

function mappaScaglione(s: provvigioni_scaglioni) {
  return {
    id: String(s.id),
    sconto_min: Number(s.sconto_min),
    pct_agente: Number(s.pct_agente),
    pct_subagente: Number(s.pct_subagente),
    valido_dal: s.valido_dal.toISOString().slice(0, 10),
  };
}

@Controller('fornitori')
export class FornitoriController {
  constructor(private readonly db: PrismaService) {}

  @Get()
  @Richiede('dati.consulta')
  async elenco() {
    const [fornitori, codici] = await Promise.all([
      this.db.fornitori.findMany({
        include: { corrente: { select: { ragione_sociale: true, piva: true, paese: true } }, _count: { select: { scaglioni: true } } },
        orderBy: { id: 'asc' },
      }),
      this.db.codici_esterni.findMany({ where: { sistema: 'integra', tipo: 'fornitore' } }),
    ]);
    const codicePer = new Map(codici.map((c) => [String(c.entita_id), c.codice]));
    return fornitori.map((f) => ({
      ...mappaFornitore(f as never, codicePer.get(String(f.id)) ?? null),
      scaglioni: f._count.scaglioni,
    }));
  }

  @Get(':id')
  @Richiede('dati.consulta')
  async dettaglio(@Param('id', ParseIntPipe) id: number) {
    const f = await this.db.fornitori.findUnique({
      where: { id: BigInt(id) },
      include: {
        corrente: { select: { ragione_sociale: true, piva: true, paese: true } },
        scaglioni: { orderBy: { sconto_min: 'asc' } },
        agenzie: { include: { cliente: { include: { corrente: { select: { ragione_sociale: true, piva: true } } } }, subagente: { select: { id: true, codice: true, nome: true, cognome: true } } } },
      },
    });
    if (!f) throw new NotFoundException('Fornitore non trovato');
    const codice = await this.db.codici_esterni.findFirst({ where: { sistema: 'integra', tipo: 'fornitore', entita_id: BigInt(id) } });
    return {
      ...mappaFornitore(f as never, codice?.codice ?? null),
      scaglioni: f.scaglioni.map(mappaScaglione),
      clienti_seguiti: f.agenzie.map((a) => ({
        id: String(a.id),
        cliente_id: String(a.cliente_id),
        cliente: a.cliente.corrente?.ragione_sociale ?? null,
        piva: a.cliente.corrente?.piva ?? null,
        subagente_id: a.subagente_id ? String(a.subagente_id) : null,
        subagente: a.subagente ? `${a.subagente.cognome} ${a.subagente.nome}` : null,
        codice: a.subagente?.codice ?? null,
        codice_cliente_fornitore: a.codice_cliente_fornitore,
        sconto: Number(a.sconto),
        pct_subagente: a.pct_subagente === null ? null : Number(a.pct_subagente),
        regola_mensile: a.regola_mensile,
        valido_dal: a.valido_dal.toISOString().slice(0, 10),
        valido_al: a.valido_al ? a.valido_al.toISOString().slice(0, 10) : null,
      })),
    };
  }

  @Put(':id')
  @Richiede('dati.condizioni')
  async modifica(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() b: ModificaFornitore) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM fornitori WHERE id = ${BigInt(id)} FOR UPDATE`; // V13
      const prima = await tx.fornitori.findUnique({ where: { id: BigInt(id) }, include: { corrente: { select: { ragione_sociale: true, piva: true, paese: true } } } });
      if (!prima) throw new NotFoundException('Fornitore non trovato');
      const aggiornamenti: Record<string, unknown> = {};
      for (const c of CAMPI_REGOLE) {
        const v = (b as Record<string, unknown>)[c];
        if (v !== undefined) aggiornamenti[c] = v;
      }
      const primaDiff: Record<string, unknown> = {};
      const dopoDiff: Record<string, unknown> = {};
      for (const c of CAMPI_REGOLE) {
        if (aggiornamenti[c] !== undefined && aggiornamenti[c] !== (prima as Record<string, unknown>)[c]) {
          primaDiff[c] = (prima as Record<string, unknown>)[c];
          dopoDiff[c] = aggiornamenti[c];
        }
      }
      if (Object.keys(dopoDiff).length === 0) {
        const codice = await tx.codici_esterni.findFirst({ where: { sistema: 'integra', tipo: 'fornitore', entita_id: BigInt(id) } });
        return { ...mappaFornitore(prima as never, codice?.codice ?? null) };
      }
      const dopo = await tx.fornitori.update({ where: { id: BigInt(id) }, data: aggiornamenti, include: { corrente: { select: { ragione_sociale: true, piva: true, paese: true } } } });
      await logEvent(tx, {
        tipo: 'crud', azione: 'update', entita: 'fornitore', entita_id: prima.id, esito: 'successo',
        dettaglio: { etichetta: prima.corrente?.ragione_sociale ?? '', prima: primaDiff, dopo: dopoDiff },
      }, contesto(req));
      const codice = await tx.codici_esterni.findFirst({ where: { sistema: 'integra', tipo: 'fornitore', entita_id: BigInt(id) } });
      return { ...mappaFornitore(dopo as never, codice?.codice ?? null) };
    });
  }

  // ponytail: gli scaglioni sono in sola lettura qui (spec §7.4, D-25): le nuove percentuali da una data arrivano con F1-A5.
}
