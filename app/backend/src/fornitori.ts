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
import { unico } from './clienti';
import { giornoRoma, ultimaChiusura } from './motore/dati';
import { piuGiorni } from './motore/motore';
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

// Data 'aaaa-mm-gg' valida (2026-02-30 no)
const Data = () => applyDecorators(Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data nel formato aaaa-mm-gg' }), IsISO8601({ strict: true }));

class ScaglioniVersione {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => ScaglioneNuovo) scaglioni!: ScaglioneNuovo[];
}
class NuovePercentuali extends ScaglioniVersione {
  @Data() valido_dal!: string;
}

class NuovaEccezione {
  @IsInt() subagente_id!: number;
  @IsInt() fornitore_id!: number;
  @Pct() sconto_min!: number;
  @Pct() pct_personale!: number;
  @Data() valido_dal!: string;
}
class ModificaEccezione {
  @Pct() pct_personale!: number;
  @Facoltativo() @Data() valido_dal?: string;
}
class CambiaEccezione {
  @Pct() pct_personale!: number;
  @Data() dal!: string;
}
class TerminaEccezione {
  @Data() al!: string;
}
class FiltroEccezioni {
  @IsOptional() @Type(() => Number) @IsInt() subagente_id?: number;
  @IsOptional() @Type(() => Number) @IsInt() fornitore_id?: number;
}

type Db = Prisma.TransactionClient | PrismaService;
const iso = (d: Date) => d.toISOString().slice(0, 10); // colonne DATE: mezzanotte UTC
const nomeSub = (s: { nome: string; cognome: string }) => `${s.cognome} ${s.nome}`;

/** Versioni delle percentuali del fornitore, dalla più recente; in vigore = la più recente con valido_dal ≤ oggi (D-25).
 *  Per ogni scaglione le eccezioni personali che valgono in qualche giorno della versione (D-51). */
async function percentualiFornitore(db: Db, fid: bigint) {
  const oggi = giornoRoma(new Date());
  const [sc, agenzie, ecc, chiusura] = await Promise.all([
    db.provvigioni_scaglioni.findMany({ where: { fornitore_id: fid }, orderBy: [{ valido_dal: 'desc' }, { sconto_min: 'asc' }] }),
    db.interscambio.findMany({ where: { fornitore_id: fid }, select: { sconto: true } }),
    db.provvigioni_eccezioni.findMany({
      where: { fornitore_id: fid }, include: { subagente: { select: { nome: true, cognome: true } } }, orderBy: [{ valido_dal: 'asc' }, { id: 'asc' }],
    }),
    ultimaChiusura(db, fid),
  ]);
  const date = [...new Set(sc.map((s) => iso(s.valido_dal)))];
  const in_vigore = date.find((d) => d <= oggi) ?? null;
  return {
    in_vigore,
    versioni: date.map((d, i) => {
      const fino = date[i - 1]; // la versione dopo (date in ordine decrescente)
      const righe = sc.filter((s) => iso(s.valido_dal) === d);
      // agenzia sullo scaglione con la soglia più alta ≤ suo sconto, come il motore (§5.1)
      const sogliaDi = (sconto: Prisma.Decimal) => righe.filter((r) => r.sconto_min.lte(sconto)).pop();
      return {
        valido_dal: d,
        in_vigore: d === in_vigore,
        modificabile: !chiusura || d > chiusura, // D-51: correggi/elimina solo fuori dal periodo chiuso (lo ricontrolla la scrittura)
        scaglioni: righe.map((s) => ({
          ...mappaScaglione(s),
          dal_fornitore: Number(s.pct_agente.plus(s.pct_subagente)),
          clienti: agenzie.filter((a) => sogliaDi(a.sconto) === s).length,
          eccezioni: ecc
            .filter((e) => e.sconto_min.equals(s.sconto_min) && (!fino || iso(e.valido_dal) < fino) && (!e.valido_al || iso(e.valido_al) > d))
            .map((e) => ({
              id: String(e.id), subagente_id: String(e.subagente_id), subagente: nomeSub(e.subagente), pct_personale: Number(e.pct_personale),
              valido_dal: iso(e.valido_dal), valido_al: e.valido_al ? iso(e.valido_al) : null,
            })),
        })),
      };
    }),
  };
}

/** Giorno 'aaaa-mm-gg' dalla rotta, 400 se non è una data vera. */
function giornoDa(d: string) {
  const t = Date.parse(d);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || isNaN(t) || iso(new Date(t)) !== d) throw new BadRequestException('Data nel formato aaaa-mm-gg');
  return new Date(t);
}

/** D-51 §19: un cambio vale da una data in poi e la data non cade in un periodo chiuso; 409 altrimenti. */
async function dopoChiusura(tx: Db, fid: bigint, data: string, testo: (chiusura: string) => string) {
  const c = await ultimaChiusura(tx, fid);
  if (c && data <= c) throw new ConflictException(testo(c));
}
const usate = (d: string) => (c: string) =>
  `Le percentuali dal ${d} sono già usate in un periodo chiuso (fino al ${c}): crea una versione nuova da una data successiva`;

/** Fornitore bloccato per la transazione (V13): una scrittura di percentuali o eccezioni alla volta. */
async function fornitoreBloccato(tx: Db, id: number | bigint) {
  await tx.$queryRaw`SELECT id FROM fornitori WHERE id = ${BigInt(id)} FOR UPDATE`;
  const f = await tx.fornitori.findUnique({ where: { id: BigInt(id) }, include: { corrente: { select: { ragione_sociale: true, piva: true, paese: true } } } });
  if (!f) throw new NotFoundException('Fornitore non trovato');
  return f;
}

/** Soglie della versione che precede e di quella che segue la data (null se non c'è). */
async function versioniVicine(tx: Db, fid: bigint, dal: Date) {
  const soglie = async (v: { valido_dal: Date } | null) => v && {
    data: iso(v.valido_dal),
    soglie: (await tx.provvigioni_scaglioni.findMany({ where: { fornitore_id: fid, valido_dal: v.valido_dal } })).map((x) => Number(x.sconto_min)),
  };
  const [prima, dopo] = await Promise.all([
    tx.provvigioni_scaglioni.findFirst({ where: { fornitore_id: fid, valido_dal: { lt: dal } }, orderBy: { valido_dal: 'desc' } }),
    tx.provvigioni_scaglioni.findFirst({ where: { fornitore_id: fid, valido_dal: { gt: dal } }, orderBy: { valido_dal: 'asc' } }),
  ]);
  return { prima: await soglie(prima), dopo: await soglie(dopo) };
}

/** Ogni versione ha tutte le soglie di quella che la precede, anche quando se ne infila una fra due: il motore
 *  sceglie la versione per soglia e una soglia omessa resterebbe in vigore con la versione vecchia (D-25, D-51). */
async function controllaSoglie(tx: Db, fid: bigint, dal: Date, scaglioni: ScaglioneNuovo[]) {
  const soglie = scaglioni.map((s) => s.sconto_min);
  if (new Set(soglie).size !== soglie.length) throw new BadRequestException('Uno sconto è ripetuto');
  const { prima, dopo } = await versioniVicine(tx, fid, dal);
  const manca = prima?.soglie.find((x) => !soglie.includes(x));
  if (manca !== undefined) throw new BadRequestException(`Manca lo sconto ${manca} %: la versione comprende tutti gli scaglioni di quella dal ${prima!.data}`);
  const nuova = dopo && soglie.find((x) => !dopo.soglie.includes(x));
  if (nuova != null) {
    throw new BadRequestException(`La versione dal ${dopo!.data} non ha lo sconto ${nuova} %: aggiungilo prima a quella versione o toglilo da questa`);
  }
}

/** Un'eccezione valida fra `dal` e la versione dopo deve trovare la sua soglia fra quelle che restano (D-51). */
async function controllaOrfane(tx: Db, fid: bigint, dal: Date, restano: number[], fino: string | undefined) {
  const orfana = await tx.provvigioni_eccezioni.findFirst({
    where: {
      fornitore_id: fid, sconto_min: { notIn: restano },
      ...(fino ? { valido_dal: { lt: new Date(fino) } } : {}),
      OR: [{ valido_al: null }, { valido_al: { gt: dal } }],
    },
  });
  if (orfana) {
    throw new ConflictException(`Ci sono eccezioni personali sullo sconto ${Number(orfana.sconto_min)} % in questo periodo: terminale o lascia lo sconto nella versione`);
  }
}
const righeScaglioni = (fid: bigint, dal: Date, scaglioni: ScaglioneNuovo[]) =>
  scaglioni.map((s) => ({ fornitore_id: fid, valido_dal: dal, sconto_min: s.sconto_min, pct_agente: s.pct_agente, pct_subagente: s.pct_subagente }));
const perEvento = (scaglioni: { sconto_min: number | Prisma.Decimal; pct_agente: number | Prisma.Decimal; pct_subagente: number | Prisma.Decimal }[]) =>
  scaglioni.map((s) => ({ sconto_min: Number(s.sconto_min), pct_agente: Number(s.pct_agente), pct_subagente: Number(s.pct_subagente) }));

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
      const prima = await fornitoreBloccato(tx, id); // V13
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

  /** Nuove percentuali da una data (§4.2.2, §5.11, D-25, D-51): una versione di tutti gli scaglioni, anche
   *  fra due esistenti, purché dopo l'ultima chiusura. Le eccezioni personali non si copiano (D-51). */
  @Post(':id/percentuali')
  @Richiede('dati.condizioni')
  async nuovePercentuali(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() b: NuovePercentuali) {
    return this.db.$transaction(async (tx) => {
      const f = await fornitoreBloccato(tx, id);
      await dopoChiusura(tx, f.id, b.valido_dal, (c) => `Il periodo fino al ${c} è chiuso: le nuove percentuali devono valere da una data successiva`);
      const dal = new Date(b.valido_dal);
      if (await tx.provvigioni_scaglioni.findFirst({ where: { fornitore_id: f.id, valido_dal: dal } })) {
        throw new BadRequestException(`Ci sono già percentuali dal ${b.valido_dal}: usa la correzione`);
      }
      await controllaSoglie(tx, f.id, dal, b.scaglioni);
      await tx.provvigioni_scaglioni.createMany({ data: righeScaglioni(f.id, dal, b.scaglioni) });
      await logEvent(tx, {
        tipo: 'crud', azione: 'create', entita: 'scaglione', entita_id: f.id, esito: 'successo', // un evento per versione (§15.2.2)
        dettaglio: { etichetta: `${f.corrente?.ragione_sociale ?? ''} · dal ${b.valido_dal}`, fornitore_id: String(f.id), valido_dal: b.valido_dal, scaglioni: perEvento(b.scaglioni) },
      }, contesto(req));
      return percentualiFornitore(tx, f.id);
    });
  }

  /** Correzione di una versione (D-51): solo se vale dopo l'ultima chiusura; sostituisce le sue righe. */
  @Put(':id/percentuali/:valido_dal')
  @Richiede('dati.condizioni')
  async correggiPercentuali(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Param('valido_dal') d: string, @Body() b: ScaglioniVersione) {
    const dal = giornoDa(d);
    return this.db.$transaction(async (tx) => {
      const f = await fornitoreBloccato(tx, id);
      const prima = await tx.provvigioni_scaglioni.findMany({ where: { fornitore_id: f.id, valido_dal: dal }, orderBy: { sconto_min: 'asc' } });
      if (!prima.length) throw new NotFoundException('Versione non trovata');
      await dopoChiusura(tx, f.id, d, usate(d));
      await controllaSoglie(tx, f.id, dal, b.scaglioni);
      await controllaOrfane(tx, f.id, dal, b.scaglioni.map((s) => s.sconto_min), (await versioniVicine(tx, f.id, dal)).dopo?.data);
      await tx.provvigioni_scaglioni.deleteMany({ where: { fornitore_id: f.id, valido_dal: dal } });
      await tx.provvigioni_scaglioni.createMany({ data: righeScaglioni(f.id, dal, b.scaglioni) });
      await logEvent(tx, {
        tipo: 'crud', azione: 'update', entita: 'scaglione', entita_id: f.id, esito: 'successo',
        dettaglio: {
          etichetta: `${f.corrente?.ragione_sociale ?? ''} · dal ${d}`, fornitore_id: String(f.id), valido_dal: d,
          prima: { scaglioni: perEvento(prima) }, dopo: { scaglioni: perEvento(b.scaglioni) },
        },
      }, contesto(req));
      return percentualiFornitore(tx, f.id);
    });
  }

  /** Eliminazione di una versione (D-51): solo dopo l'ultima chiusura e se non è l'unica. */
  @Delete(':id/percentuali/:valido_dal')
  @HttpCode(204)
  @Richiede('dati.condizioni')
  async eliminaPercentuali(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Param('valido_dal') d: string) {
    const dal = giornoDa(d);
    await this.db.$transaction(async (tx) => {
      const f = await fornitoreBloccato(tx, id);
      const righe = await tx.provvigioni_scaglioni.findMany({ where: { fornitore_id: f.id, valido_dal: dal }, orderBy: { sconto_min: 'asc' } });
      if (!righe.length) throw new NotFoundException('Versione non trovata');
      await dopoChiusura(tx, f.id, d, usate(d));
      if (!(await tx.provvigioni_scaglioni.count({ where: { fornitore_id: f.id, valido_dal: { not: dal } } }))) {
        throw new ConflictException('È l\'unica versione delle percentuali: correggila invece di eliminarla');
      }
      const { prima, dopo } = await versioniVicine(tx, f.id, dal);
      await controllaOrfane(tx, f.id, dal, prima?.soglie ?? [], dopo?.data); // dopo l'eliminazione vale la versione prima
      await tx.provvigioni_scaglioni.deleteMany({ where: { fornitore_id: f.id, valido_dal: dal } });
      await logEvent(tx, {
        tipo: 'crud', azione: 'delete', entita: 'scaglione', entita_id: f.id, esito: 'successo',
        dettaglio: { etichetta: `${f.corrente?.ragione_sociale ?? ''} · dal ${d}`, fornitore_id: String(f.id), valido_dal: d, scaglioni: perEvento(righe) },
      }, contesto(req));
    });
  }
}

/* ---------- Eccezioni personali (§4.2.3, §5.2, §7.5, D-26, D-51) ---------- */
const conDettagli = {
  subagente: { select: { nome: true, cognome: true } },
  fornitore: { include: { corrente: { select: { ragione_sociale: true } } } },
} as const;
type EccezioneCompleta = Prisma.provvigioni_eccezioniGetPayload<{ include: typeof conDettagli }>;

/** Ritorno per le pagine: % standard dello scaglione alla data di oggi, tenuta dentro il periodo della riga
 *  (valido_dal se futura, valido_al se finita); modificabile = tutto il periodo dopo l'ultima chiusura. */
async function mappaEccezioni(db: Db, ee: EccezioneCompleta[]) {
  const fids = [...new Set(ee.map((e) => e.fornitore_id))];
  const [sc, chiusure] = await Promise.all([
    db.provvigioni_scaglioni.findMany({ where: { fornitore_id: { in: fids } }, orderBy: { valido_dal: 'desc' } }),
    Promise.all(fids.map((f) => ultimaChiusura(db, f))),
  ]);
  const chiusa = new Map(fids.map((f, i) => [f, chiusure[i]]));
  const oggi = giornoRoma(new Date());
  return ee.map((e) => {
    const dal = iso(e.valido_dal), al = e.valido_al ? iso(e.valido_al) : null;
    const data = oggi < dal ? dal : al && al <= oggi ? piuGiorni(al, -1) : oggi; // valido_al escluso
    const std = sc.find((s) => s.fornitore_id === e.fornitore_id && s.sconto_min.equals(e.sconto_min) && iso(s.valido_dal) <= data);
    const c = chiusa.get(e.fornitore_id) ?? null;
    return {
      id: String(e.id),
      subagente_id: String(e.subagente_id),
      subagente: nomeSub(e.subagente),
      fornitore_id: String(e.fornitore_id),
      fornitore: e.fornitore.corrente?.ragione_sociale ?? null,
      sconto_min: Number(e.sconto_min),
      pct_personale: Number(e.pct_personale),
      pct_standard: std ? Number(std.pct_subagente) : null,
      valido_dal: dal,
      valido_al: al,
      modificabile: !c || dal > c,
    };
  });
}
const mappaEccezione = async (db: Db, e: EccezioneCompleta) => (await mappaEccezioni(db, [e]))[0];
const etichettaEcc = (e: EccezioneCompleta) => `${nomeSub(e.subagente)} · ${e.fornitore.corrente?.ragione_sociale ?? ''} ${Number(e.sconto_min)} %`;
const perEventoEcc = (e: EccezioneCompleta) => ({
  etichetta: etichettaEcc(e), eccezione_id: String(e.id), fornitore_id: String(e.fornitore_id), subagente_id: String(e.subagente_id),
  sconto_min: Number(e.sconto_min), pct_personale: Number(e.pct_personale), valido_dal: iso(e.valido_dal), valido_al: e.valido_al ? iso(e.valido_al) : null,
});
const SOVRAPPOSTO = 'Periodo sovrapposto: il subagente ha già un\'eccezione su questo sconto in quei giorni';

/** Lo sconto deve essere una soglia del fornitore in vigore alla data. */
async function controllaSconto(tx: Db, fid: bigint, sconto: number, dal: string) {
  const sc = await tx.provvigioni_scaglioni.findFirst({ where: { fornitore_id: fid, sconto_min: sconto, valido_dal: { lte: new Date(dal) } } });
  if (!sc) throw new BadRequestException(`Il fornitore non ha lo sconto ${sconto} % nelle percentuali in vigore al ${dal}`);
}

/** V13: prima la riga del fornitore (come percentuali e nuove eccezioni), poi l'eccezione: una scrittura alla volta per fornitore. */
async function eccezioneBloccata(tx: Db, id: number) {
  const x = await tx.provvigioni_eccezioni.findUnique({ where: { id: BigInt(id) }, select: { fornitore_id: true } });
  if (!x) throw new NotFoundException('Eccezione non trovata');
  await fornitoreBloccato(tx, x.fornitore_id);
  await tx.$queryRaw`SELECT id FROM provvigioni_eccezioni WHERE id = ${BigInt(id)} FOR UPDATE`;
  const e = await tx.provvigioni_eccezioni.findUnique({ where: { id: BigInt(id) }, include: conDettagli });
  if (!e) throw new NotFoundException('Eccezione non trovata');
  return e;
}

/** Correzione o eliminazione libere solo se tutta la riga vale dopo l'ultima chiusura (D-51). */
async function rigaAperta(tx: Db, e: EccezioneCompleta) {
  await dopoChiusura(tx, e.fornitore_id, iso(e.valido_dal), (c) =>
    `L'eccezione dal ${iso(e.valido_dal)} è già usata in un periodo chiuso (fino al ${c}): cambia la percentuale o termina l'eccezione da una data successiva`);
}

/** Eccezioni personali dei subagenti: per fornitore × sconto, con periodo (D-51). Si scrivono dalla scheda del subagente. */
@Controller('eccezioni')
export class EccezioniController {
  constructor(private readonly db: PrismaService) {}

  @Get()
  @Richiede('dati.consulta')
  async elenco(@Query() q: FiltroEccezioni) {
    if (q.subagente_id === undefined && q.fornitore_id === undefined) throw new BadRequestException('Indica subagente_id o fornitore_id');
    const ee = await this.db.provvigioni_eccezioni.findMany({
      where: {
        ...(q.subagente_id !== undefined ? { subagente_id: BigInt(q.subagente_id) } : {}),
        ...(q.fornitore_id !== undefined ? { fornitore_id: BigInt(q.fornitore_id) } : {}),
      },
      include: conDettagli,
      orderBy: [{ fornitore_id: 'asc' }, { sconto_min: 'asc' }, { valido_dal: 'asc' }],
    });
    return mappaEccezioni(this.db, ee);
  }

  @Post()
  @Richiede('dati.condizioni')
  async crea(@Req() req: Request, @Body() b: NuovaEccezione) {
    return unico(() => this.db.$transaction(async (tx) => {
      const f = await fornitoreBloccato(tx, b.fornitore_id);
      if (!(await tx.subagenti.findUnique({ where: { id: BigInt(b.subagente_id) } }))) throw new NotFoundException('Subagente non trovato');
      await dopoChiusura(tx, f.id, b.valido_dal, (c) => `Il periodo fino al ${c} è chiuso: l'eccezione deve valere da una data successiva`);
      await controllaSconto(tx, f.id, b.sconto_min, b.valido_dal);
      const e = await tx.provvigioni_eccezioni.create({
        data: { fornitore_id: f.id, subagente_id: BigInt(b.subagente_id), sconto_min: b.sconto_min, pct_personale: b.pct_personale, valido_dal: new Date(b.valido_dal) },
        include: conDettagli,
      });
      await logEvent(tx, { tipo: 'crud', azione: 'create', entita: 'eccezione', entita_id: e.id, esito: 'successo', dettaglio: perEventoEcc(e) }, contesto(req));
      return mappaEccezione(tx, e);
    }), SOVRAPPOSTO);
  }

  /** Cambio di % da una data: chiude la riga il giorno prima e apre quella nuova (D-51). */
  @Post(':id/cambia')
  @Richiede('dati.condizioni')
  async cambia(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() b: CambiaEccezione) {
    return unico(() => this.db.$transaction(async (tx) => {
      const e = await eccezioneBloccata(tx, id);
      if (b.dal <= iso(e.valido_dal)) throw new BadRequestException(`Il cambio deve valere dopo il ${iso(e.valido_dal)}`);
      if (e.valido_al && b.dal >= iso(e.valido_al)) throw new BadRequestException(`L'eccezione non vale più dal ${iso(e.valido_al)}: il cambio cade fuori dal suo periodo`);
      if (Number(e.pct_personale) === b.pct_personale) throw new BadRequestException('La percentuale è già questa');
      await dopoChiusura(tx, e.fornitore_id, b.dal, (c) => `Il periodo fino al ${c} è chiuso: il cambio deve valere da una data successiva`);
      const chiusa = await tx.provvigioni_eccezioni.update({ where: { id: e.id }, data: { valido_al: new Date(b.dal) }, include: conDettagli }); // valido_al escluso
      const nuova = await tx.provvigioni_eccezioni.create({
        data: { fornitore_id: e.fornitore_id, subagente_id: e.subagente_id, sconto_min: e.sconto_min, pct_personale: b.pct_personale, valido_dal: new Date(b.dal), valido_al: e.valido_al },
        include: conDettagli,
      });
      await logEvent(tx, {
        tipo: 'crud', azione: 'update', entita: 'eccezione', entita_id: e.id, esito: 'successo',
        dettaglio: { etichetta: etichettaEcc(e), prima: { valido_al: e.valido_al ? iso(e.valido_al) : null }, dopo: { valido_al: b.dal }, nuova_id: String(nuova.id) },
      }, contesto(req));
      await logEvent(tx, { tipo: 'crud', azione: 'create', entita: 'eccezione', entita_id: nuova.id, esito: 'successo', dettaglio: perEventoEcc(nuova) }, contesto(req));
      const [c, n] = await mappaEccezioni(tx, [chiusa, nuova]);
      return { chiusa: c, nuova: n };
    }), SOVRAPPOSTO);
  }

  /** Fine dell'eccezione: `al` è il primo giorno in cui non vale più (escluso, come interscambio). I giorni fino
   *  all'ultima chiusura non cambiano: né la vecchia né la nuova fine possono cadere entro la chiusura (D-51). */
  @Post(':id/termina')
  @Richiede('dati.condizioni')
  async termina(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() b: TerminaEccezione) {
    return unico(() => this.db.$transaction(async (tx) => {
      const e = await eccezioneBloccata(tx, id);
      const prima = e.valido_al ? iso(e.valido_al) : null;
      if (b.al <= iso(e.valido_dal)) throw new BadRequestException(`L'eccezione comincia il ${iso(e.valido_dal)}: la fine viene dopo`);
      const c = await ultimaChiusura(tx, e.fornitore_id);
      if (c && (b.al <= c || (prima && prima <= c))) throw new ConflictException(`Il periodo fino al ${c} è chiuso: l'eccezione può smettere di valere solo dopo il ${c}`);
      if (prima === b.al) return mappaEccezione(tx, e);
      const dopo = await tx.provvigioni_eccezioni.update({ where: { id: e.id }, data: { valido_al: new Date(b.al) }, include: conDettagli });
      await logEvent(tx, {
        tipo: 'crud', azione: 'update', entita: 'eccezione', entita_id: e.id, esito: 'successo',
        dettaglio: { etichetta: etichettaEcc(e), prima: { valido_al: prima }, dopo: { valido_al: b.al } },
      }, contesto(req));
      return mappaEccezione(tx, dopo);
    }), SOVRAPPOSTO);
  }

  /** Correzione libera (% e inizio) solo se tutta la riga vale dopo l'ultima chiusura (D-51). */
  @Put(':id')
  @Richiede('dati.condizioni')
  async modifica(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() b: ModificaEccezione) {
    return unico(() => this.db.$transaction(async (tx) => {
      const e = await eccezioneBloccata(tx, id);
      await rigaAperta(tx, e);
      const dal = b.valido_dal ?? iso(e.valido_dal);
      if (b.valido_dal !== undefined) {
        await dopoChiusura(tx, e.fornitore_id, dal, (c) => `Il periodo fino al ${c} è chiuso: l'eccezione deve valere da una data successiva`);
        await controllaSconto(tx, e.fornitore_id, Number(e.sconto_min), dal);
      }
      const prima: Record<string, unknown> = {}, dopoDiff: Record<string, unknown> = {};
      if (Number(e.pct_personale) !== b.pct_personale) { prima.pct_personale = Number(e.pct_personale); dopoDiff.pct_personale = b.pct_personale; }
      if (dal !== iso(e.valido_dal)) { prima.valido_dal = iso(e.valido_dal); dopoDiff.valido_dal = dal; }
      if (!Object.keys(dopoDiff).length) return mappaEccezione(tx, e);
      const dopo = await tx.provvigioni_eccezioni.update({ where: { id: e.id }, data: { pct_personale: b.pct_personale, valido_dal: new Date(dal) }, include: conDettagli });
      await logEvent(tx, {
        tipo: 'crud', azione: 'update', entita: 'eccezione', entita_id: e.id, esito: 'successo', dettaglio: { etichetta: etichettaEcc(e), prima, dopo: dopoDiff },
      }, contesto(req));
      return mappaEccezione(tx, dopo);
    }), SOVRAPPOSTO);
  }

  @Delete(':id')
  @HttpCode(204)
  @Richiede('dati.condizioni')
  async elimina(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    await this.db.$transaction(async (tx) => {
      const e = await eccezioneBloccata(tx, id);
      await rigaAperta(tx, e);
      await tx.provvigioni_eccezioni.delete({ where: { id: e.id } });
      await logEvent(tx, { tipo: 'crud', azione: 'delete', entita: 'eccezione', entita_id: e.id, esito: 'successo', dettaglio: perEventoEcc(e) }, contesto(req));
    });
  }
}
