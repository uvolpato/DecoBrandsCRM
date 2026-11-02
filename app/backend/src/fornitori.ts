import {
  BadRequestException, Body, applyDecorators, ConflictException, Controller, Delete, Get, HttpCode, NotFoundException, Param, ParseIntPipe, Post, Put, Query, Req,
} from '@nestjs/common';
import { Prisma, type fornitori, type provvigioni_scaglioni } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsISO8601, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateIf, ValidateNested,
} from 'class-validator';
import type { Request } from 'express';
import { Richiede, contesto } from './accesso';
import { giornoRoma } from './motore/dati';
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


// Percentuali come le colonne NUMERIC(5,2) con CHECK 0–100 (§4.2.2, §4.2.3)
const Pct = () => applyDecorators(IsNumber({ maxDecimalPlaces: 2 }), Min(0), Max(100));

class ScaglioneNuovo {
  @Pct() sconto_min!: number;
  @Pct() pct_agente!: number;
  @Pct() pct_subagente!: number;
}

class NuovePercentuali {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data nel formato aaaa-mm-gg' }) @IsISO8601({ strict: true }) valido_dal!: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => ScaglioneNuovo) scaglioni!: ScaglioneNuovo[];
}

class NuovaEccezione {
  @IsInt() subagente_id!: number;
  @IsInt() fornitore_id!: number;
  @Pct() sconto_min!: number;
  @Pct() pct_personale!: number;
}

class ModificaEccezione {
  @Pct() pct_personale!: number;
}

type Db = Prisma.TransactionClient | PrismaService;
const iso = (d: Date) => d.toISOString().slice(0, 10); // colonne DATE: mezzanotte UTC
const nomeSub = (s: { nome: string; cognome: string }) => `${s.cognome} ${s.nome}`;

/** Versioni delle percentuali del fornitore, dalla più recente; in vigore = la più recente con valido_dal ≤ oggi (D-25). */
async function percentualiFornitore(db: Db, fid: bigint) {
  const oggi = giornoRoma(new Date());
  const [sc, agenzie] = await Promise.all([
    db.provvigioni_scaglioni.findMany({
      where: { fornitore_id: fid },
      orderBy: [{ valido_dal: 'desc' }, { sconto_min: 'asc' }],
      include: { eccezioni: { include: { subagente: { select: { nome: true, cognome: true } } }, orderBy: { id: 'asc' } } },
    }),
    db.interscambio.findMany({ where: { fornitore_id: fid }, select: { sconto: true } }),
  ]);
  const date = [...new Set(sc.map((s) => iso(s.valido_dal)))];
  const in_vigore = date.find((d) => d <= oggi) ?? null;
  return {
    in_vigore,
    versioni: date.map((d) => {
      const righe = sc.filter((s) => iso(s.valido_dal) === d);
      // agenzia sullo scaglione con la soglia più alta ≤ suo sconto, come il motore (§5.1)
      const sogliaDi = (sconto: Prisma.Decimal) => righe.filter((r) => r.sconto_min.lte(sconto)).pop();
      return {
        valido_dal: d,
        in_vigore: d === in_vigore,
        scaglioni: righe.map((s) => ({
          ...mappaScaglione(s),
          dal_fornitore: Number(s.pct_agente.plus(s.pct_subagente)),
          clienti: agenzie.filter((a) => sogliaDi(a.sconto) === s).length,
          eccezioni: s.eccezioni.map((e) => ({ id: String(e.id), subagente_id: String(e.subagente_id), subagente: nomeSub(e.subagente), pct_personale: Number(e.pct_personale) })),
        })),
      };
    }),
  };
}

const CAMPI_REGOLE =['giorni_attesa_conferma', 'giorno_bollettino', 'tipo_provvigione', 'giorni_incasso', 'note'] as const;

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
    const [fornitori, codici, conti] = await Promise.all([
      this.db.fornitori.findMany({
        include: { corrente: { select: { ragione_sociale: true, piva: true, paese: true } } },
        orderBy: { id: 'asc' },
      }),
      this.db.codici_esterni.findMany({ where: { sistema: 'integra', tipo: 'fornitore' } }),
      // scaglioni in vigore oggi: le soglie con valido_dal ≤ oggi, una per sconto (D-25)
      this.db.$queryRaw<{ fornitore_id: bigint; n: number }[]>`
        SELECT fornitore_id, count(DISTINCT sconto_min)::int AS n FROM provvigioni_scaglioni
        WHERE valido_dal <= ${giornoRoma(new Date())}::date GROUP BY fornitore_id`,
    ]);
    const codicePer = new Map(codici.map((c) => [String(c.entita_id), c.codice]));
    const contoPer = new Map(conti.map((c) => [String(c.fornitore_id), c.n]));
    return fornitori.map((f) => ({
      ...mappaFornitore(f as never, codicePer.get(String(f.id)) ?? null),
      scaglioni: contoPer.get(String(f.id)) ?? 0,
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

  @Get(':id/percentuali')
  @Richiede('dati.consulta')
  async percentuali(@Param('id', ParseIntPipe) id: number) {
    if (!(await this.db.fornitori.findUnique({ where: { id: BigInt(id) } }))) throw new NotFoundException('Fornitore non trovato');
    return percentualiFornitore(this.db, BigInt(id));
  }

  /** Nuove percentuali da una data (§4.2.2, §5.11, D-25): una versione nuova di tutti gli scaglioni;
   *  le versioni precedenti non si toccano e le eccezioni personali passano alla nuova (D-26). */
  @Post(':id/percentuali')
  @Richiede('dati.condizioni')
  async nuovePercentuali(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() b: NuovePercentuali) {
    const soglie = b.scaglioni.map((s) => s.sconto_min);
    if (new Set(soglie).size !== soglie.length) throw new BadRequestException('Uno sconto è ripetuto');
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM fornitori WHERE id = ${BigInt(id)} FOR UPDATE`; // V13: una versione alla volta
      const f = await tx.fornitori.findUnique({ where: { id: BigInt(id) }, include: { corrente: { select: { ragione_sociale: true } } } });
      if (!f) throw new NotFoundException('Fornitore non trovato');
      const dal = new Date(b.valido_dal);
      const ultima = await tx.provvigioni_scaglioni.findFirst({ where: { fornitore_id: f.id }, orderBy: { valido_dal: 'desc' } });
      // le versioni non si sovrascrivono e non si infilano fra due esistenti: la data viene dopo l'ultima
      if (ultima && dal <= ultima.valido_dal) {
        throw new BadRequestException(`Ci sono già percentuali dal ${iso(ultima.valido_dal)}: la nuova data deve essere successiva`);
      }
      const vecchi = ultima
        ? await tx.provvigioni_scaglioni.findMany({ where: { fornitore_id: f.id, valido_dal: ultima.valido_dal }, include: { eccezioni: true } })
        : [];
      // il motore sceglie la versione per soglia: una soglia omessa resterebbe in vigore con la versione vecchia
      const manca = vecchi.find((v) => !soglie.includes(Number(v.sconto_min)));
      if (manca) throw new BadRequestException(`Manca lo sconto ${Number(manca.sconto_min)} %: la nuova versione comprende tutti gli scaglioni`);
      let eccezioni_copiate = 0;
      for (const s of b.scaglioni) {
        const nuovo = await tx.provvigioni_scaglioni.create({
          data: { fornitore_id: f.id, valido_dal: dal, sconto_min: s.sconto_min, pct_agente: s.pct_agente, pct_subagente: s.pct_subagente },
        });
        const ecc = vecchi.find((v) => Number(v.sconto_min) === s.sconto_min)?.eccezioni ?? [];
        if (ecc.length) {
          await tx.provvigioni_eccezioni.createMany({
            data: ecc.map((e) => ({ scaglione_id: nuovo.id, subagente_id: e.subagente_id, pct_personale: e.pct_personale })),
          });
          eccezioni_copiate += ecc.length;
        }
      }
      await logEvent(tx, {
        tipo: 'crud', azione: 'create', entita: 'scaglione', entita_id: f.id, esito: 'successo', // un evento per versione (§15.2.2)
        dettaglio: {
          etichetta: `${f.corrente?.ragione_sociale ?? ''} · dal ${b.valido_dal}`,
          fornitore_id: String(f.id), valido_dal: b.valido_dal,
          scaglioni: b.scaglioni.map((s) => ({ sconto_min: s.sconto_min, pct_agente: s.pct_agente, pct_subagente: s.pct_subagente })),
          eccezioni_copiate,
        },
      }, contesto(req));
      return percentualiFornitore(tx, f.id);
    });
  }
}

/** Ritorno dell'eccezione per le pagine: fornitore, sconto, data delle percentuali, sua % e quella standard. */
const conDettagli = {
  subagente: { select: { nome: true, cognome: true } },
  scaglione: { include: { fornitore: { include: { corrente: { select: { ragione_sociale: true } } } } } },
} as const;
type EccezioneCompleta = Prisma.provvigioni_eccezioniGetPayload<{ include: typeof conDettagli }>;

function mappaEccezione(e: EccezioneCompleta) {
  return {
    id: String(e.id),
    subagente_id: String(e.subagente_id),
    subagente: nomeSub(e.subagente),
    scaglione_id: String(e.scaglione_id),
    fornitore_id: String(e.scaglione.fornitore_id),
    fornitore: e.scaglione.fornitore.corrente?.ragione_sociale ?? null,
    sconto_min: Number(e.scaglione.sconto_min),
    valido_dal: iso(e.scaglione.valido_dal),
    pct_personale: Number(e.pct_personale),
    pct_standard: Number(e.scaglione.pct_subagente),
  };
}
const etichettaEcc = (e: EccezioneCompleta) =>
  `${nomeSub(e.subagente)} · ${e.scaglione.fornitore.corrente?.ragione_sociale ?? ''} ${Number(e.scaglione.sconto_min)} %`;

/** Eccezioni personali dei subagenti (§4.2.3, §5.2, §7.5, D-26): si scrivono dalla scheda del subagente. */
@Controller('eccezioni')
export class EccezioniController {
  constructor(private readonly db: PrismaService) {}

  @Get()
  @Richiede('dati.consulta')
  async elenco(@Query('subagente_id', ParseIntPipe) subagente_id: number) {
    const ee = await this.db.provvigioni_eccezioni.findMany({
      where: { subagente_id: BigInt(subagente_id) }, include: conDettagli,
      orderBy: [{ scaglione: { fornitore_id: 'asc' } }, { scaglione: { valido_dal: 'desc' } }, { scaglione: { sconto_min: 'asc' } }],
    });
    return ee.map(mappaEccezione);
  }

  /** Vale sulla versione delle percentuali in vigore oggi (§4.2.3): lo scaglione lo trova il server. */
  @Post()
  @Richiede('dati.condizioni')
  async crea(@Req() req: Request, @Body() b: NuovaEccezione) {
    try {
      return await this.db.$transaction(async (tx) => {
        // V13: stesso blocco di Nuove percentuali, così la copia sulla nuova versione non perde l'eccezione
        await tx.$queryRaw`SELECT id FROM fornitori WHERE id = ${BigInt(b.fornitore_id)} FOR UPDATE`;
        if (!(await tx.fornitori.findUnique({ where: { id: BigInt(b.fornitore_id) } }))) throw new NotFoundException('Fornitore non trovato');
        if (!(await tx.subagenti.findUnique({ where: { id: BigInt(b.subagente_id) } }))) throw new NotFoundException('Subagente non trovato');
        const sc = await tx.provvigioni_scaglioni.findFirst({
          where: { fornitore_id: BigInt(b.fornitore_id), sconto_min: b.sconto_min, valido_dal: { lte: new Date(giornoRoma(new Date())) } },
          orderBy: { valido_dal: 'desc' },
        });
        if (!sc) throw new BadRequestException(`Il fornitore non ha lo sconto ${b.sconto_min} % nelle percentuali in vigore`);
        const e = await tx.provvigioni_eccezioni.create({
          data: { scaglione_id: sc.id, subagente_id: BigInt(b.subagente_id), pct_personale: b.pct_personale },
          include: conDettagli,
        });
        await logEvent(tx, {
          tipo: 'crud', azione: 'create', entita: 'eccezione', entita_id: e.id, esito: 'successo',
          dettaglio: { etichetta: etichettaEcc(e), subagente_id: String(e.subagente_id), scaglione_id: String(e.scaglione_id), pct_personale: b.pct_personale },
        }, contesto(req));
        return mappaEccezione(e);
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Il subagente ha già un\'eccezione su questo scaglione: modificala');
      }
      throw e;
    }
  }

  @Put(':id')
  @Richiede('dati.condizioni')
  async modifica(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() b: ModificaEccezione) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM provvigioni_eccezioni WHERE id = ${BigInt(id)} FOR UPDATE`; // V13
      const prima = await tx.provvigioni_eccezioni.findUnique({ where: { id: BigInt(id) }, include: conDettagli });
      if (!prima) throw new NotFoundException('Eccezione non trovata');
      if (Number(prima.pct_personale) === b.pct_personale) return mappaEccezione(prima);
      const dopo = await tx.provvigioni_eccezioni.update({ where: { id: prima.id }, data: { pct_personale: b.pct_personale }, include: conDettagli });
      await logEvent(tx, {
        tipo: 'crud', azione: 'update', entita: 'eccezione', entita_id: prima.id, esito: 'successo',
        dettaglio: { etichetta: etichettaEcc(prima), prima: { pct_personale: Number(prima.pct_personale) }, dopo: { pct_personale: b.pct_personale } },
      }, contesto(req));
      return mappaEccezione(dopo);
    });
  }

  @Delete(':id')
  @HttpCode(204)
  @Richiede('dati.condizioni')
  async elimina(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM provvigioni_eccezioni WHERE id = ${BigInt(id)} FOR UPDATE`; // V13
      const e = await tx.provvigioni_eccezioni.findUnique({ where: { id: BigInt(id) }, include: conDettagli });
      if (!e) throw new NotFoundException('Eccezione non trovata');
      await tx.provvigioni_eccezioni.delete({ where: { id: e.id } });
      await logEvent(tx, {
        tipo: 'crud', azione: 'delete', entita: 'eccezione', entita_id: e.id, esito: 'successo',
        dettaglio: {
          etichetta: etichettaEcc(e), eccezione_id: String(e.id), subagente_id: String(e.subagente_id),
          scaglione_id: String(e.scaglione_id), pct_personale: Number(e.pct_personale),
        },
      }, contesto(req));
    });
  }
}
