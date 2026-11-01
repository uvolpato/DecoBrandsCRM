import {
  Body, ConflictException, Controller, Delete, Get, HttpCode, NotFoundException, Param, ParseIntPipe, Post, Put, Req,
} from '@nestjs/common';
import { Prisma, type agenti, type subagenti } from '@prisma/client';
import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';
import type { Request } from 'express';
import { Richiede, contesto } from './accesso';
import { PrismaService } from './prisma.service';
import { logEvent } from './registro';

// Agenti (lettura) e subagenti (CRUD) (F1-A2, ��4.2.4, ��4.2.5, ��7.5, D-07).
// I subagenti si gestiscono per intero nel CRM; si disattivano invece di cancellarli se hanno
// pratiche o abbinamenti (FK con ON DELETE RESTRICT).

// Campo facoltativo che non accetta null: @IsOptional lascerebbe passare null su colonne NOT NULL (500)
const Facoltativo = () => ValidateIf((_o, v) => v !== undefined);

class DatiSubagente {
  @IsString() @Matches(/\S/, { message: 'Scrivi il codice' }) @MaxLength(50) codice!: string;
  @IsString() @Matches(/\S/, { message: 'Scrivi il nome' }) @MaxLength(100) nome!: string;
  @IsString() @Matches(/\S/, { message: 'Scrivi il cognome' }) @MaxLength(100) cognome!: string;
  @IsOptional() @IsEmail({}, { message: "L'email non è valida" }) @MaxLength(255) email?: string | null;
  @IsInt() agente_id!: number;
  @IsOptional() @IsBoolean() attivo?: boolean;
}

// attivo non c'è: si cambia solo con POST /:id/attivo (stato, registro); con forbidNonWhitelisted è rifiutato
class ModificaSubagente {
  @Facoltativo() @IsString() @Matches(/\S/, { message: 'Scrivi il codice' }) @MaxLength(50) codice?: string;
  @Facoltativo() @IsString() @Matches(/\S/, { message: 'Scrivi il nome' }) @MaxLength(100) nome?: string;
  @Facoltativo() @IsString() @Matches(/\S/, { message: 'Scrivi il cognome' }) @MaxLength(100) cognome?: string;
  @IsOptional() @IsEmail({}, { message: "L'email non è valida" }) @MaxLength(255) email?: string | null;
  @Facoltativo() @IsInt() agente_id?: number;
}

class Attivo {
  @IsBoolean() attivo!: boolean;
}

function mappaAgente(a: agenti & { _count?: { subagenti: number } }) {
  return {
    id: String(a.id),
    codice: a.codice,
    nome: a.nome,
    cognome: a.cognome,
    email: a.email,
    telefono: a.telefono,
    attivo: a.attivo,
    creato_il: a.creato_il,
    subagenti: a._count?.subagenti ?? 0,
  };
}

function mappaSubagente(s: subagenti & { agente?: { id: bigint; codice: string; nome: string; cognome: string } | null }) {
  return {
    id: String(s.id),
    agente_id: String(s.agente_id),
    agente: s.agente ? `${s.agente.cognome} ${s.agente.nome}` : null,
    agente_codice: s.agente?.codice ?? null,
    codice: s.codice,
    nome: s.nome,
    cognome: s.cognome,
    email: s.email,
    attivo: s.attivo,
  };
}

@Controller('agenti')
export class AgentiController {
  constructor(private readonly db: PrismaService) {}

  @Get()
  @Richiede('dati.consulta')
  async elenco() {
    const a = await this.db.agenti.findMany({
      include: { _count: { select: { subagenti: true } } },
      orderBy: { cognome: 'asc' },
    });
    return a.map(mappaAgente);
  }

  @Get(':id')
  @Richiede('dati.consulta')
  async dettaglio(@Param('id', ParseIntPipe) id: number) {
    const a = await this.db.agenti.findUnique({
      where: { id: BigInt(id) },
      include: { subagenti: { orderBy: [{ cognome: 'asc' }, { nome: 'asc' }] } },
    });
    if (!a) throw new NotFoundException('Agente non trovato');
    return {
      ...mappaAgente(a as never),
      subagenti: a.subagenti.map((s) => mappaSubagente(s as never)),
    };
  }
}

@Controller('subagenti')
export class SubagentiController {
  constructor(private readonly db: PrismaService) {}

  @Get()
  @Richiede('dati.consulta')
  async elenco() {
    const s = await this.db.subagenti.findMany({
      include: { agente: { select: { id: true, codice: true, nome: true, cognome: true } } },
      orderBy: [{ cognome: 'asc' }, { nome: 'asc' }],
    });
    return s.map((x) => mappaSubagente(x as never));
  }

  @Get(':id')
  @Richiede('dati.consulta')
  async scheda(@Param('id', ParseIntPipe) id: number) {
    const s = await this.db.subagenti.findUnique({
      where: { id: BigInt(id) },
      include: { agente: { select: { id: true, codice: true, nome: true, cognome: true } } },
    });
    if (!s) throw new NotFoundException('Subagente non trovato');
    return mappaSubagente(s as never);
  }

  @Post()
  @Richiede('dati.modifica')
  async crea(@Req() req: Request, @Body() b: DatiSubagente) {
    const agente = await this.db.agenti.findUnique({ where: { id: BigInt(b.agente_id) } });
    if (!agente) throw new NotFoundException('Agente non trovato');
    const s = await unico(() => this.db.$transaction(async (tx) => {
      const creato = await tx.subagenti.create({
        data: {
          agente_id: BigInt(b.agente_id),
          codice: b.codice.trim(),
          nome: b.nome.trim(),
          cognome: b.cognome.trim(),
          email: b.email ? b.email.trim().toLowerCase() : null,
          attivo: b.attivo ?? true,
        },
        include: { agente: { select: { id: true, codice: true, nome: true, cognome: true } } },
      });
      await logEvent(tx, {
        tipo: 'crud', azione: 'create', entita: 'subagente', entita_id: creato.id, esito: 'successo',
        dettaglio: { etichetta: `${creato.cognome} ${creato.nome}`, codice: creato.codice, agente_id: String(creato.agente_id) },
      }, contesto(req));
      return creato;
    }));
    return mappaSubagente(s as never);
  }

  @Put(':id')
  @Richiede('dati.modifica')
  async modifica(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() b: ModificaSubagente) {
    return unico(() => this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM subagenti WHERE id = ${BigInt(id)} FOR UPDATE`; // V13
      const prima = await tx.subagenti.findUnique({
        where: { id: BigInt(id) },
        include: { agente: { select: { id: true, codice: true, nome: true, cognome: true } } },
      });
      if (!prima) throw new NotFoundException('Subagente non trovato');
      if (b.agente_id !== undefined) {
        const ag = await tx.agenti.findUnique({ where: { id: BigInt(b.agente_id) } });
        if (!ag) throw new NotFoundException('Agente non trovato');
      }
      const dopoData = {
        codice: b.codice !== undefined ? b.codice.trim() : prima.codice,
        nome: b.nome !== undefined ? b.nome.trim() : prima.nome,
        cognome: b.cognome !== undefined ? b.cognome.trim() : prima.cognome,
        email: b.email !== undefined ? (b.email ? b.email.trim().toLowerCase() : null) : prima.email,
        agente_id: b.agente_id !== undefined ? BigInt(b.agente_id) : prima.agente_id,
      };
      const campi = ['codice', 'nome', 'cognome', 'email', 'agente_id'] as const;
      const primaDiff: Record<string, unknown> = {};
      const dopoDiff: Record<string, unknown> = {};
      for (const c of campi) {
        const pv = c === 'agente_id' ? String(prima.agente_id) : (prima as Record<string, unknown>)[c];
        const dv = c === 'agente_id' ? String(dopoData.agente_id) : (dopoData as Record<string, unknown>)[c];
        if (pv !== dv) { primaDiff[c] = pv; dopoDiff[c] = dv; }
      }
      if (Object.keys(dopoDiff).length === 0) {
        const ag = await tx.agenti.findUnique({ where: { id: prima.agente_id }, select: { id: true, codice: true, nome: true, cognome: true } });
        return mappaSubagente({ ...prima, agente: ag } as never);
      }
      const dopo = await tx.subagenti.update({
        where: { id: prima.id },
        data: {
          codice: dopoData.codice,
          nome: dopoData.nome,
          cognome: dopoData.cognome,
          email: dopoData.email,
          agente_id: dopoData.agente_id,
        },
        include: { agente: { select: { id: true, codice: true, nome: true, cognome: true } } },
      });
      await logEvent(tx, {
        tipo: 'crud', azione: 'update', entita: 'subagente', entita_id: prima.id, esito: 'successo',
        dettaglio: { etichetta: `${dopo.cognome} ${dopo.nome}`, prima: primaDiff, dopo: dopoDiff },
      }, contesto(req));
      return mappaSubagente(dopo as never);
    }));
  }

  @Post(':id/attivo')
  @HttpCode(200)
  @Richiede('dati.modifica')
  async attivo(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() b: Attivo) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM subagenti WHERE id = ${BigInt(id)} FOR UPDATE`; // V13
      const s = await tx.subagenti.findUnique({
        where: { id: BigInt(id) },
        include: { agente: { select: { id: true, codice: true, nome: true, cognome: true } } },
      });
      if (!s) throw new NotFoundException('Subagente non trovato');
      if (s.attivo === b.attivo) return mappaSubagente(s as never);
      const dopo = await tx.subagenti.update({
        where: { id: s.id },
        data: { attivo: b.attivo },
        include: { agente: { select: { id: true, codice: true, nome: true, cognome: true } } },
      });
      await logEvent(tx, {
        tipo: 'stato', azione: 'change_state', entita: 'subagente', entita_id: s.id, esito: 'successo',
        dettaglio: { etichetta: `${s.cognome} ${s.nome}`, prima: { attivo: s.attivo }, dopo: { attivo: b.attivo } },
      }, contesto(req));
      return mappaSubagente(dopo as never);
    });
  }

  @Delete(':id')
  @HttpCode(204)
  @Richiede('dati.modifica')
  async elimina(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    try {
      await this.db.$transaction(async (tx) => {
        const s = await tx.subagenti.findUnique({ where: { id: BigInt(id) } });
        if (!s) throw new NotFoundException('Subagente non trovato');
        await tx.subagenti.delete({ where: { id: s.id } });
        await logEvent(tx, {
          tipo: 'crud', azione: 'delete', entita: 'subagente', entita_id: s.id, esito: 'successo',
          dettaglio: { etichetta: `${s.cognome} ${s.nome}`, codice: s.codice },
        }, contesto(req));
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && ['P2003', 'P2014'].includes(e.code)) {
        throw new ConflictException('Questo subagente ha pratiche/abbinamenti: disattivalo invece di eliminarlo');
      }
      throw e;
    }
  }
}

async function unico<T>(fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new ConflictException('Il codice è già di un altro subagente');
    }
    throw e;
  }
}