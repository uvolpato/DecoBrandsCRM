import {
  BadGatewayException, Body, Controller, Get, HttpCode, NotFoundException, Post, Query, Req,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsString, MaxLength, Min } from 'class-validator';
import type { Request } from 'express';
import { Pool } from 'pg';
import { Richiede, contesto } from './accesso';
import { IntegraService, VISTE, codiceDi, datiCliente, datiFornitore, type Riga } from './integra';
import { PrismaService } from './prisma.service';
import { logEvent, type Contesto } from './registro';
import { datiFiscali, normalizzaPiva } from './soggetti';

// Anagrafica di Integra su richiesta (F1-A11, D-111, §4.7.1): niente import massivo, solo le righe
// che servono a un documento. `cerca` legge la vista con LIMIT 10; `importa` crea soggetto + ruolo +
// versione + codici_esterni in una transazione (V13). Il server rilegge tutto dalla vista per id:
// dal browser arriva solo `tipo` e `id_integra` (V12, D-28).

type Tipo = 'cliente' | 'fornitore';
const VISTA_DI: Record<Tipo, 'clienti' | 'fornitori'> = { cliente: 'clienti', fornitore: 'fornitori' };
const TEMPO_MASSIMO_MS = 3000; // D-111: oltre, «ponte lento» (§4.7.1)
const LENTO = Symbol('lento');

const testo = (v: unknown) => String(v ?? '').trim().replace(/\s+/g, ' ');

/** La query del ponte entro 3 s: oltre, la ricerca risponde «ponte lento» invece di un 500 (D-111). */
// shortcut: la query non si annulla, resta appesa finché il ponte non risponde; se succede spesso,
// mettere `query_timeout` su `creaPonte` (src/integra.ts) e valutare il tempo del giro di sincronizzazione.
async function conTempo<T>(p: Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<never>((_, rej) => { timer = setTimeout(() => rej(LENTO), TEMPO_MASSIMO_MS); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Ricerca mirata sulla vista: massimo 10 righe, per codice esatto → P.IVA → ragione sociale (D-111). */
export async function cerca(db: PrismaService, ponte: Pool, schema: string, tipo: Tipo, q: string) {
  const v = VISTE[VISTA_DI[tipo]];
  const codice = testo(q).toUpperCase();
  const piva = normalizzaPiva(testo(q));
  const nome = `%${testo(q)}%`;
  // nessun conteggio e nessuna scansione completa: LIMIT 10 e ordine dal più preciso (§4.7.1)
  const sql = `
    SELECT ${v.colonne.join(', ')}
    FROM ${schema}.${v.vista}
    WHERE upper(COALESCE(codice, '')) = $1
       OR regexp_replace(upper(COALESCE(piva, '')), '[^A-Z0-9]', '', 'g') IN ($2, $3)
       OR ragione_sociale ILIKE $4
    ORDER BY (upper(COALESCE(codice, '')) = $1) DESC,
             (regexp_replace(upper(COALESCE(piva, '')), '[^A-Z0-9]', '', 'g') IN ($2, $3)) DESC,
             ragione_sociale
    LIMIT 10`;
  const inizio = Date.now();
  let righe: Riga[];
  try {
    righe = (await conTempo(ponte.query<Riga>(sql, [codice, piva, `IT${piva}`, nome]))).rows;
  } catch (e) {
    if (e === LENTO) return { errore: 'ponte lento' as const, ms: Date.now() - inizio };
    throw e;
  }
  // esclude chi è già in anagrafica: una sola query sui codici trovati, niente cicli (D-111)
  const codici = righe.map(codiceDi);
  const importati = new Set(
    (await db.codici_esterni.findMany({ where: { sistema: 'integra', tipo, codice: { in: codici } }, select: { codice: true } }))
      .map((x) => x.codice),
  );
  return {
    righe: righe.filter((r) => !importati.has(codiceDi(r))).map((r) => ({
      id_integra: r.id_integra, codice: testo(r.codice), ragione_sociale: testo(r.ragione_sociale),
      piva: testo(r.piva), attivo: r.attivo ?? true,
    })),
    ms: Date.now() - inizio,
  };
}

/**
 * Import puntuale in una transazione: rilegge la riga dalla vista per id, poi soggetto + ruolo +
 * versione + codici_esterni. Idempotente per codice e per P.IVA/CF (D-111, §4.7.1, V13).
 */
export async function importa(db: PrismaService, ponte: Pool, schema: string, tipo: Tipo, idIntegra: number, ctx: Contesto = {}) {
  const v = VISTE[VISTA_DI[tipo]];
  const { rows } = await ponte.query<Riga>(
    `SELECT ${v.colonne.join(', ')} FROM ${schema}.${v.vista} WHERE id_integra = $1`,
    [idIntegra],
  );
  const r = rows[0];
  if (!r) throw new NotFoundException(`${tipo} ${idIntegra} non trovato in Integra`);
  const ora = new Date();
  return db.$transaction(async (tx) => {
    const codice = codiceDi(r);
    const esistente = await tx.codici_esterni.findFirst({ where: { sistema: 'integra', tipo, codice } });
    if (esistente) return { gia_presente: true, id: String(esistente.entita_id) };

    const d = datiFiscali(r.piva ?? null, r.codice_fiscale ?? null, 'IT');
    // stessa P.IVA/CF → stesso soggetto, si aggiunge il ruolo, non un secondo soggetto (D-102)
    const trovato = d.piva_norm
      ? await tx.soggetti.findFirst({ where: { paese: d.paese, piva_norm: d.piva_norm } })
      : await tx.soggetti.findFirst({ where: { paese: d.paese, piva_norm: '', cf_norm: d.cf_norm } });
    const soggetto = trovato ?? await tx.soggetti.create({ data: {
      natura: 'azienda',
      piva: d.piva,
      piva_norm: d.piva_norm,
      codice_fiscale: d.codice_fiscale,
      cf_norm: d.cf_norm,
      paese: d.paese,
      sorgente: 'integra',
      attivo: r.attivo ?? true,
    } });
    const nome = testo(r.ragione_sociale);

    if (tipo === 'cliente') {
      const gia = await tx.clienti.findFirst({ where: { soggetto_id: soggetto.id } });
      if (gia) return { gia_presente: true, id: String(gia.id) }; // idempotente anche per P.IVA
      const ruolo = await tx.clienti.create({ data: { soggetto_id: soggetto.id, attivo: r.attivo ?? true, modificato_il: r.modificato_il ?? ora, sincronizzato_il: ora } });
      const versione = await tx.clienti_versioni.create({ data: { cliente_id: ruolo.id, fonte: 'integra', valido_dal: ora, ...datiCliente(r) } });
      await tx.clienti.update({ where: { id: ruolo.id }, data: { versione_corrente_id: versione.id } });
      await tx.codici_esterni.create({ data: { sistema: 'integra', tipo: 'cliente', codice, etichetta: codice, entita_id: ruolo.id } });
      await logEvent(tx, { tipo: 'crud', azione: 'create', entita: 'cliente', entita_id: ruolo.id, esito: 'successo', dettaglio: { etichetta: nome, codice, id_integra: r.id_integra } }, ctx);
      return { creato: true, id: String(ruolo.id), soggetto_id: String(soggetto.id), codice, ragione_sociale: nome };
    }

    const gia = await tx.fornitori.findFirst({ where: { soggetto_id: soggetto.id } });
    if (gia) return { gia_presente: true, id: String(gia.id) };
    const ruolo = await tx.fornitori.create({ data: { soggetto_id: soggetto.id, attivo: r.attivo ?? true, modificato_il: r.modificato_il ?? ora, sincronizzato_il: ora } });
    const versione = await tx.fornitori_versioni.create({ data: { fornitore_id: ruolo.id, fonte: 'integra', valido_dal: ora, ...datiFornitore(r) } });
    await tx.fornitori.update({ where: { id: ruolo.id }, data: { versione_corrente_id: versione.id } });
    await tx.codici_esterni.create({ data: { sistema: 'integra', tipo: 'fornitore', codice, etichetta: codice, entita_id: ruolo.id } });
    await logEvent(tx, { tipo: 'crud', azione: 'create', entita: 'fornitore', entita_id: ruolo.id, esito: 'successo', dettaglio: { etichetta: nome, codice, id_integra: r.id_integra } }, ctx);
    return { creato: true, id: String(ruolo.id), soggetto_id: String(soggetto.id), codice, ragione_sociale: nome };
  });
}

class CercaFiltro {
  @IsIn(['cliente', 'fornitore']) tipo!: string;
  @IsString() @MaxLength(200) q!: string;
}

class ImportaBody {
  @IsIn(['cliente', 'fornitore']) tipo!: 'cliente' | 'fornitore';
  @Type(() => Number) @IsInt() @Min(0) id_integra!: number;
}

@Controller('integra')
export class AnagraficaIntegraController {
  constructor(private readonly integra: IntegraService, private readonly db: PrismaService) {}

  @Get('cerca')
  @Richiede('dati.importa')
  async cerca(@Query() f: CercaFiltro) {
    const c = await this.integra.ponte();
    if (!c) throw new BadGatewayException('Sincronizzazione non configurata');
    return cerca(this.db, c.pool, c.schema, f.tipo as Tipo, f.q);
  }

  @Post('importa')
  @HttpCode(200)
  @Richiede('dati.importa')
  async importa(@Req() req: Request, @Body() b: ImportaBody) {
    const c = await this.integra.ponte();
    if (!c) throw new BadGatewayException('Sincronizzazione non configurata');
    return importa(this.db, c.pool, c.schema, b.tipo, b.id_integra, contesto(req));
  }
}
