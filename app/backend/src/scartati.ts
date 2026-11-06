import {
  ConflictException, Controller, Delete, ForbiddenException, Get, HttpCode, NotFoundException, Param, ParseIntPipe, Post, Query, Req,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { rm } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import type { Request } from 'express';
import { contesto, Richiede } from './accesso';
import { righePagina } from './impostazioni';
import { PrismaService } from './prisma.service';
import { chiudiAnomalia, logEvent } from './registro';

// Documenti scartati (F5-A7, §7.16, §8.1): l'elenco con motivo, autore e data di eliminazione
// automatica, il recupero (torna fra quelli da controllare) e l'eliminazione definitiva, che è
// dell'amministratore. Ricerca, conteggi dei segmenti (D-23) e pagine sul server (V12).

const MOTIVI = ['Doppione', 'Non riguarda Decobrands', 'Documento illeggibile', 'Altro'] as const;
const GIORNO = 24 * 60 * 60 * 1000;
const ORDINI = ['scartato_il', 'documento', 'motivo', 'da'] as const;

class FiltriScartati {
  @IsOptional() @IsIn(['', ...MOTIVI]) motivo?: string;
  @IsOptional() @IsString() @MaxLength(100) q?: string; // numero, fornitore, cliente o file
  @IsOptional() @IsIn(ORDINI) ordina?: (typeof ORDINI)[number];
  @IsOptional() @IsIn(['asc', 'desc']) dir?: 'asc' | 'desc';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pagina?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) per_pagina?: number;
}

/** aaaa-mm-gg all'ora di Roma: è la data dell'eliminazione automatica (scartato il + giorni). */
const eliminaIl = (d: Date, giorni: number) =>
  new Date(d.getTime() + giorni * GIORNO).toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });

/** Colonne da un elenco chiuso (ORDINI, validato): mai testo del browser nella query. */
const COLONNA: Record<(typeof ORDINI)[number], Prisma.Sql> = {
  scartato_il: Prisma.sql`d.scartato_il`,
  documento: Prisma.sql`coalesce(c.numero, d.file_nome)`,
  motivo: Prisma.sql`coalesce(d.motivo_scarto, '')`,
  da: Prisma.sql`coalesce(u.nome, '')`,
};

@Controller('scartati')
export class ScartatiController {
  constructor(private readonly db: PrismaService) {}

  /** L'elenco (§7.16): scarto il/da, documento, motivo e nota, eliminazione automatica; pagine. */
  @Get()
  @Richiede('provvigioni.scartati')
  async elenco(@Query() q: FiltriScartati) {
    const perPagina = q.per_pagina ?? await righePagina(this.db);
    const motivo = q.motivo ?? '';
    const testo = (q.q ?? '').trim();
    const simile = '%' + testo.replace(/[\\%_]/g, '\\$&') + '%'; // % e _ sono lettere, non jolly
    // una sola sottoquery dei campi (niente N+1): finale se c'è, altrimenti letto
    const campi = Prisma.sql`campi AS (
      SELECT documento_id,
        MAX(CASE WHEN campo = 'numero' THEN COALESCE(valore_finale, valore_letto) END) AS numero,
        MAX(CASE WHEN campo = 'cliente' THEN COALESCE(valore_finale, valore_letto) END) AS cliente
      FROM documenti_campi GROUP BY documento_id
    )`;
    const join = Prisma.sql`
      FROM documenti_in_arrivo d
      LEFT JOIN campi c ON c.documento_id = d.id
      LEFT JOIN fornitori_versioni fv ON fv.fornitore_id = d.fornitore_id AND fv.id = d.fornitore_versione_id
      LEFT JOIN utenti u ON u.id = d.scartato_da
      WHERE d.stato = 'scartato'
        AND (${testo} = '' OR COALESCE(c.numero, '') ILIKE ${simile} OR d.file_nome ILIKE ${simile}
          OR COALESCE(fv.ragione_sociale, '') ILIKE ${simile} OR COALESCE(c.cliente, '') ILIKE ${simile})`;

    // i conteggi dei segmenti contano gli altri filtri (D-23), non il motivo scelto
    const conti = await this.db.$queryRaw<{ motivo: string | null; n: bigint }[]>`WITH ${campi}
      SELECT d.motivo_scarto AS motivo, count(*) AS n
      ${join}
      GROUP BY d.motivo_scarto`;
    const perMotivo = new Map(conti.map((c) => [c.motivo ?? '', Number(c.n)]));
    const tutti = conti.reduce((s, c) => s + Number(c.n), 0);
    const totale = motivo ? perMotivo.get(motivo) ?? 0 : tutti;
    const pagine = Math.max(1, Math.ceil(totale / perPagina));
    const pagina = Math.min(Math.max(q.pagina ?? 1, 1), pagine);
    const ordina = q.ordina ?? 'scartato_il';
    const dir = q.dir ?? 'desc';
    const ordine = Prisma.sql`ORDER BY ${COLONNA[ordina]} ${dir === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`}, d.id DESC`;
    const giorni = await this.giorni();

    const righe = await this.db.$queryRaw<{
      id: bigint; scartato_il: Date; motivo: string | null; nota: string | null; file_nome: string;
      tipo: string | null; numero: string | null; cliente: string | null; fornitore: string | null;
      fornitore_id: bigint | null; da: string | null;
    }[]>`WITH ${campi}
      SELECT d.id, d.scartato_il, d.motivo_scarto AS motivo, d.nota_scarto AS nota, d.file_nome, d.tipo,
             c.numero, c.cliente, fv.ragione_sociale AS fornitore, d.fornitore_id, u.nome AS da
      ${join} AND (${motivo} = '' OR d.motivo_scarto = ${motivo})
      ${ordine}
      LIMIT ${perPagina} OFFSET ${(pagina - 1) * perPagina}`;

    return {
      scartati: righe.map((r) => ({
        id: String(r.id),
        scartato_il: r.scartato_il.toISOString(),
        da: r.da,
        tipo: r.tipo,
        numero: r.numero,
        cliente: r.cliente,
        fornitore: r.fornitore,
        fornitore_id: r.fornitore_id != null ? String(r.fornitore_id) : null,
        file_nome: r.file_nome,
        motivo: r.motivo,
        nota: r.nota,
        elimina_il: r.scartato_il ? eliminaIl(r.scartato_il, giorni) : null,
      })),
      conteggi: {
        tutti,
        per_motivo: [...MOTIVI, ...[...perMotivo.keys()].filter((m) => !(MOTIVI as readonly string[]).includes(m))]
          .filter((m) => perMotivo.has(m))
          .map((m) => ({ motivo: m, n: perMotivo.get(m) ?? 0 })),
      },
      giorni,
      totale,
      pagina,
      pagine,
      per_pagina: perPagina,
    };
  }

  /** Recupera (§7.16): torna fra i documenti da controllare, la pagina lo apre (§7.9). */
  @Post(':id/recupera')
  @HttpCode(204)
  @Richiede('provvigioni.scartati')
  async recupera(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    const ctx = contesto(req);
    const did = BigInt(id);
    await this.db.$transaction(async (tx) => {
      const righe = await tx.$queryRaw<{ stato: string }[]>`SELECT stato FROM documenti_in_arrivo WHERE id = ${did} FOR UPDATE`;
      if (!righe[0]) throw new NotFoundException('Documento non trovato');
      if (righe[0].stato !== 'scartato') throw new ConflictException('Il documento non è scartato');
      const d = await tx.documenti_in_arrivo.update({
        where: { id: did },
        data: { stato: 'da_controllare', tentativi: 0, errore: null, scartato_il: null, scartato_da: null, motivo_scarto: null, nota_scarto: null },
      });
      // §15.2.4 non ha un codice per il recupero: documento/update come per lo scarto (D-74)
      await logEvent(tx, {
        tipo: 'documento', azione: 'update', entita: 'documento', entita_id: did, esito: 'successo',
        dettaglio: {
          etichetta: d.file_nome, documento_id: String(did), pratica_id: null, stato: 'da_controllare',
          prima: { stato: 'scartato' }, dopo: { stato: 'da_controllare' },
        },
      }, ctx);
      // se era un documento non letto, l'anomalia non ha più ragione di restare aperta (§7.14.3)
      await chiudiAnomalia(tx, 'lettura', 'lettura.fallita', String(did));
    });
  }

  /** Eliminazione definitiva (§7.16): solo l'amministratore, con conferma; il file va via dopo il commit. */
  @Delete(':id')
  @HttpCode(204)
  @Richiede('provvigioni.elimina')
  async elimina(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    const ctx = contesto(req);
    const ruolo = req.utente?.ruolo;
    if (ruolo !== 'amministratore' && ruolo !== 'superutente') throw new ForbiddenException('L’eliminazione definitiva è dell’amministratore');
    const did = BigInt(id);
    const tolto = await this.db.$transaction(async (tx) => {
      const righe = await tx.$queryRaw<{ stato: string; file_percorso: string; file_nome: string }[]>`
        SELECT stato, file_percorso, file_nome FROM documenti_in_arrivo WHERE id = ${did} FOR UPDATE`;
      const d = righe[0];
      if (!d) throw new NotFoundException('Documento non trovato');
      if (d.stato !== 'scartato') throw new ConflictException('Il documento non è scartato');
      await tx.documenti_in_arrivo.delete({ where: { id: did } }); // i campi letti vanno in cascata
      await chiudiAnomalia(tx, 'lettura', 'lettura.fallita', String(did));
      // §15.2.4 non ha un codice per l'eliminazione di uno scartato: documento/update con `eliminato` (D-74)
      await logEvent(tx, {
        tipo: 'documento', azione: 'update', entita: 'documento', entita_id: did, esito: 'successo',
        dettaglio: {
          etichetta: d.file_nome, documento_id: String(did), pratica_id: null, eliminato: true,
          prima: { stato: 'scartato' }, dopo: { eliminato: true },
        },
      }, ctx);
      return d.file_percorso;
    });
    const radice = resolve(process.env.DOCUMENTI_DIR ?? '');
    const percorso = resolve(radice, tolto);
    if (percorso.startsWith(radice + sep)) await rm(percorso, { force: true }).catch(() => undefined);
  }

  private async giorni() {
    const v = await this.db.impostazioni.findUnique({ where: { chiave: 'conservazione' } });
    const n = Number((v?.valore as { scartati_giorni?: unknown } | null)?.scartati_giorni);
    return Number.isInteger(n) && n >= 1 ? n : 90; // §7.15: valori iniziali 90 giorni
  }
}
