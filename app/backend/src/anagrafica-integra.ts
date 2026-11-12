import {
  BadGatewayException, BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, HttpCode,
  NotFoundException, Post, Query, Req,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import type { Request } from 'express';
import { Pool, type QueryConfig } from 'pg';
import { Richiede, contesto, permessiDi } from './accesso';
import { IntegraService, VISTE, codiceDi, datiCliente, datiFornitore, type Riga } from './integra';
import { PrismaService } from './prisma.service';
import { logEvent, type Contesto } from './registro';
import { datiFiscali, normalizzaPiva } from './soggetti';

// Anagrafica di Integra su richiesta (F1-A11, D-111, §4.7.1): niente import massivo, solo le righe
// che servono a un documento. `cerca` legge la vista con LIMIT 10; `importa` crea soggetto + ruolo +
// versione + codici_esterni in una transazione (V13). Il server rilegge tutto dalla vista per id:
// dal browser arriva solo `tipo` e `id_integra` (V12, D-28). Con `documento_id` collega anche il
// documento, nella stessa transazione (D-133).

type Tipo = 'cliente' | 'fornitore';
type Db = Prisma.TransactionClient | PrismaService;
const VISTA_DI: Record<Tipo, 'clienti' | 'fornitori'> = { cliente: 'clienti', fornitore: 'fornitori' };
const TEMPO_MASSIMO_MS = 3000; // D-111: oltre, «ponte lento» (§4.7.1)
const LENTO = Symbol('lento');

const testo = (v: unknown) => String(v ?? '').trim().replace(/\s+/g, ' ');

/** La query del ponte entro 3 s: oltre, la ricerca risponde «ponte lento» invece di un 500 (D-111).
 *  La query che resta appesa si annulla da sola con il `query_timeout` di `cerca` e `importa` (C2). */
async function conTempo<T>(p: Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<never>((_, rej) => { timer = setTimeout(() => rej(LENTO), TEMPO_MASSIMO_MS); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    // la query lasciata indietro può fallire dopo (`query_timeout`): non deve diventare un errore
    // non gestito e fermare il processo
    void p.catch(() => {});
  }
}

/**
 * Paese del soggetto e P.IVA con il prefisso del paese: la stessa regola di `paeseDi` degli script
 * d'import (prisma/import-vecchio-crm.ts, prisma/import-storico.ts), così il master è lo stesso
 * (D-101, D-102). Una P.IVA estera senza prefisso in Integra lo prende dal paese, altrimenti non si
 * ritrova il soggetto e nasce un doppione.
 * ponytail: la regola vive in tre punti (qui e nei due script, che questo pacchetto non tocca); un
 * aiuto unico quando uno dei due si riapre.
 */
function paesePiva(r: Riga): { paese: string; piva: string | null } {
  const pn = normalizzaPiva(testo(r.piva));
  const p = testo(r.paese).toUpperCase();
  const paese = /^[A-Z]{2}$/.test(p) ? p : /^[A-Z]{2}/.test(pn) ? pn.slice(0, 2) : 'IT';
  return { paese, piva: pn && paese !== 'IT' && !/^[A-Z]{2}/.test(pn) ? paese + pn : pn || null };
}

/** La SQL della ricerca mirata sulla vista: la usano `cerca` e il controllo del documento (C1). */
function sqlRicerca(schema: string, tipo: Tipo, q: string) {
  const v = VISTE[VISTA_DI[tipo]];
  const codice = testo(q).toUpperCase();
  const piva = normalizzaPiva(testo(q));
  return {
    // nessun conteggio e nessuna scansione completa: LIMIT 10 e ordine dal più preciso (§4.7.1)
    text: `
    SELECT ${v.colonne.join(', ')}
    FROM ${schema}.${v.vista}
    WHERE upper(COALESCE(codice, '')) = $1
       OR regexp_replace(upper(COALESCE(piva, '')), '[^A-Z0-9]', '', 'g') IN ($2, $3)
       OR ragione_sociale ILIKE $4
    ORDER BY (upper(COALESCE(codice, '')) = $1) DESC,
             (regexp_replace(upper(COALESCE(piva, '')), '[^A-Z0-9]', '', 'g') IN ($2, $3)) DESC,
             ragione_sociale
    LIMIT 10`,
    values: [codice, piva, `IT${piva}`, `%${testo(q)}%`],
  };
}

/** Le righe della vista, anche quelle già in anagrafica: il documento deve vederle tutte (C1).
 *  C2: il limite di 5 s vale solo per la ricerca e l'import su richiesta, non per la sincronizzazione. */
async function righeVista(ponte: Pool, schema: string, tipo: Tipo, q: string): Promise<Riga[]> {
  const { text, values } = sqlRicerca(schema, tipo, q);
  // @types/pg non dichiara `query_timeout`, che pg legge per query
  return (await conTempo(ponte.query<Riga>({ text, values, query_timeout: 5000 } as unknown as QueryConfig))).rows;
}

/** Ricerca mirata sulla vista: massimo 10 righe, per codice esatto → P.IVA → ragione sociale (D-111). */
export async function cerca(db: Db, ponte: Pool, schema: string, tipo: Tipo, q: string) {
  const inizio = Date.now();
  let righe: Riga[];
  try {
    righe = await righeVista(ponte, schema, tipo, q);
  } catch (e) {
    if (e === LENTO) return { errore: 'ponte lento' as const, ms: Date.now() - inizio };
    // C4: la ricerca non apre anomalie (la regola dei tre giri è della sincronizzazione, §7.14.3):
    // ponte giù (VPN, password, vista) → nessun candidato, non un 500
    return { errore: 'ponte non raggiungibile' as const, ms: Date.now() - inizio };
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
 * versione + codici_esterni. Idempotente per codice; la stessa P.IVA aggiunge il ruolo, ma un secondo
 * codice Integra sulla stessa P.IVA è un doppione e dà 409 (C5, D-111, §4.7.1, V13).
 * Con `documentoId` il nome letto si controlla prima della transazione e il documento si collega
 * dentro la stessa transazione (C1, C3, D-133).
 */
export async function importa(
  db: PrismaService, ponte: Pool, schema: string, tipo: Tipo, idIntegra: number,
  ctx: Contesto = {}, documentoId: bigint | null = null,
) {
  const v = VISTE[VISTA_DI[tipo]];
  let rows: Riga[];
  try {
    rows = (await conTempo(ponte.query<Riga>({
      text: `SELECT ${v.colonne.join(', ')} FROM ${schema}.${v.vista} WHERE id_integra = $1`,
      values: [idIntegra],
      query_timeout: 5000, // C2: il limite vale per l'import su richiesta, non per la sincronizzazione
    } as unknown as QueryConfig))).rows;
  } catch (e) {
    // R1-02: ponte appeso → 502, non una richiesta che non torna
    if (e === LENTO) throw new BadGatewayException('Integra non risponde in tempo: riprova');
    throw e;
  }
  const r = rows[0];
  if (!r) throw new NotFoundException(`${tipo} ${idIntegra} non trovato in Integra`);
  const p = paesePiva(r);
  const ora = new Date();

  // C3: nome letto e ricerca sul ponte **prima** della transazione: un ponte lento non tiene aperti
  // advisory lock, `FOR UPDATE` e il limite di 5 s della transazione di Prisma.
  let documento: { id: bigint; nome_letto: string } | null = null;
  if (documentoId != null) {
    if (tipo !== 'fornitore') throw new BadRequestException('documento_id vale solo per un fornitore');
    const campo = await db.documenti_campi.findFirst({
      where: { documento_id: documentoId, campo: 'fornitore' }, select: { valore_letto: true, valore_finale: true },
    });
    const letto = testo(campo?.valore_finale ?? campo?.valore_letto);
    if (!letto) throw new ConflictException('Il documento non ha il nome del fornitore letto');
    // V12: il nome letto lo rilegge il server; C1: la ricerca vede anche i fornitori già importati e
    // deve trovare **questa** riga, con la stessa P.IVA normalizzata
    let c: Riga[];
    try {
      c = await righeVista(ponte, schema, 'fornitore', letto);
    } catch {
      throw new BadGatewayException('Integra non risponde: riprova');
    }
    if (c.length !== 1 || c[0].id_integra !== idIntegra
      || normalizzaPiva(c[0].piva ?? '') !== normalizzaPiva(r.piva ?? '')) {
      throw new ConflictException('Il fornitore del documento non è questo: controlla il nome letto');
    }
    documento = { id: documentoId, nome_letto: letto };
  }

  return db.$transaction(async (tx) => {
    const codice = codiceDi(r);
    const nome = testo(r.ragione_sociale);
    // R1-05: due import dello stesso soggetto insieme si mettono in fila (V13)
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${'integra:' + tipo + ':' + codice}))`;

    // D-133: con `documento_id` si blocca e si ricontrolla il documento prima di qualsiasi scrittura
    let nomeFile = '';
    if (documento) {
      await tx.$queryRaw`SELECT id FROM documenti_in_arrivo WHERE id = ${documento.id} FOR UPDATE`;
      const doc = await tx.documenti_in_arrivo.findUnique({
        where: { id: documento.id }, select: { stato: true, fornitore_id: true, file_nome: true },
      });
      if (!doc) throw new NotFoundException('Documento non trovato');
      if (doc.stato !== 'da_controllare' || doc.fornitore_id != null) {
        throw new ConflictException('Il documento non è più da controllare o ha già il fornitore');
      }
      // C3: se il nome letto è cambiato mentre si cercava sul ponte, il documento è un altro
      const campo = await tx.documenti_campi.findFirst({
        where: { documento_id: documento.id, campo: 'fornitore' }, select: { valore_letto: true, valore_finale: true },
      });
      if (testo(campo?.valore_finale ?? campo?.valore_letto) !== documento.nome_letto) {
        throw new ConflictException('Il documento è cambiato: riprova');
      }
      nomeFile = doc.file_nome;
    }

    /** D-133: del documento si scrivono solo fornitore e versione, mai campi o righe. */
    const collegaDocumento = async (f: { id: bigint; versione_corrente_id: bigint | null }) => {
      if (!documento) return false;
      // i due campi vanno insieme (CHECK `fornitore_check`): senza versione corrente non si collega
      if (!f.versione_corrente_id) throw new ConflictException('Il fornitore non ha una versione corrente: riprova dalla scheda del fornitore');
      await tx.documenti_in_arrivo.update({
        where: { id: documento.id },
        data: { fornitore_id: f.id, fornitore_versione_id: f.versione_corrente_id },
      });
      await logEvent(tx, {
        tipo: 'documento', azione: 'update', entita: 'documento', entita_id: documento.id, esito: 'successo',
        dettaglio: {
          etichetta: nomeFile, documento_id: String(documento.id), pratica_id: null,
          prima: { fornitore_id: null }, dopo: { fornitore_id: String(f.id) }, codice_integra: codice,
        },
      }, ctx);
      return true;
    };

    /** R1-04: il ruolo c'era già ma senza il codice di Integra: si registra, così il giro lo aggiorna
     *  e la ricerca non lo ripropone più (D-102, D-111). */
    const registraCodice = async (entitaId: bigint) => {
      // C5: un ruolo con un altro codice Integra è un doppione in Integra (stessa P.IVA su due master):
      // registrargli il secondo farebbe alternare il ruolo a ogni giro
      const altro = await tx.codici_esterni.findFirst({
        where: { sistema: 'integra', tipo, entita_id: entitaId, codice: { not: codice } }, select: { codice: true },
      });
      if (altro) {
        throw new ConflictException(`Il ${tipo} è già legato al codice Integra ${altro.codice}: in Integra c'è un doppione con la stessa P.IVA (da correggere in Integra)`);
      }
      await tx.codici_esterni.create({ data: { sistema: 'integra', tipo, codice, etichetta: codice, entita_id: entitaId } });
      await logEvent(tx, {
        tipo: 'crud', azione: 'update', entita: tipo, entita_id: entitaId, esito: 'successo',
        dettaglio: {
          etichetta: nome, codice, id_integra: r.id_integra,
          prima: { codice_integra: null }, dopo: { codice_integra: codice },
        },
      }, ctx);
    };

    const esistente = await tx.codici_esterni.findFirst({ where: { sistema: 'integra', tipo, codice } });
    if (esistente) {
      let documentoCollegato = false;
      if (tipo === 'fornitore') {
        const f = await tx.fornitori.findUnique({ where: { id: esistente.entita_id }, select: { id: true, versione_corrente_id: true } });
        if (f) documentoCollegato = await collegaDocumento(f);
      }
      return { gia_presente: true, codice_registrato: false, documento_collegato: documentoCollegato, id: String(esistente.entita_id) };
    }

    const d = datiFiscali(p.piva, r.codice_fiscale ?? null, p.paese);
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

    if (tipo === 'cliente') {
      const gia = await tx.clienti.findFirst({ where: { soggetto_id: soggetto.id } });
      if (gia) {
        await registraCodice(gia.id); // idempotente anche per P.IVA
        return { gia_presente: true, codice_registrato: true, documento_collegato: false, id: String(gia.id) };
      }
      const ruolo = await tx.clienti.create({ data: { soggetto_id: soggetto.id, attivo: r.attivo ?? true, modificato_il: r.modificato_il ?? ora, sincronizzato_il: ora } });
      const versione = await tx.clienti_versioni.create({ data: { cliente_id: ruolo.id, fonte: 'integra', valido_dal: ora, ...datiCliente(r) } });
      await tx.clienti.update({ where: { id: ruolo.id }, data: { versione_corrente_id: versione.id } });
      await tx.codici_esterni.create({ data: { sistema: 'integra', tipo: 'cliente', codice, etichetta: codice, entita_id: ruolo.id } });
      await logEvent(tx, { tipo: 'crud', azione: 'create', entita: 'cliente', entita_id: ruolo.id, esito: 'successo', dettaglio: { etichetta: nome, codice, id_integra: r.id_integra } }, ctx);
      return { creato: true, id: String(ruolo.id), soggetto_id: String(soggetto.id), codice, ragione_sociale: nome };
    }

    const gia = await tx.fornitori.findFirst({ where: { soggetto_id: soggetto.id } });
    if (gia) {
      await registraCodice(gia.id);
      const documentoCollegato = await collegaDocumento(gia);
      return { gia_presente: true, codice_registrato: true, documento_collegato: documentoCollegato, id: String(gia.id) };
    }
    const ruolo = await tx.fornitori.create({ data: { soggetto_id: soggetto.id, attivo: r.attivo ?? true, modificato_il: r.modificato_il ?? ora, sincronizzato_il: ora } });
    const versione = await tx.fornitori_versioni.create({ data: { fornitore_id: ruolo.id, fonte: 'integra', valido_dal: ora, ...datiFornitore(r) } });
    await tx.fornitori.update({ where: { id: ruolo.id }, data: { versione_corrente_id: versione.id } });
    await tx.codici_esterni.create({ data: { sistema: 'integra', tipo: 'fornitore', codice, etichetta: codice, entita_id: ruolo.id } });
    await collegaDocumento({ id: ruolo.id, versione_corrente_id: versione.id });
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
  /** D-133: facoltativo, solo con `tipo: 'fornitore'`: il documento da collegare nella stessa transazione. */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) documento_id?: number;
}

@Controller('integra')
export class AnagraficaIntegraController {
  constructor(private readonly integra: IntegraService, private readonly db: PrismaService) {}

  @Get('cerca')
  @Richiede('dati.importa')
  async cerca(@Query() f: CercaFiltro) {
    const c = await this.integra.ponte();
    if (!c) throw new BadGatewayException('Sincronizzazione non configurata');
    const r = await cerca(this.db, c.pool, c.schema, f.tipo as Tipo, f.q);
    // R1-01: il ponte giù o lento è un 502 chiaro, non una lista vuota
    if ('errore' in r) {
      throw new BadGatewayException(r.errore === 'ponte lento'
        ? 'Integra non risponde in tempo: riprova'
        : 'Integra non raggiungibile: riprova più tardi');
    }
    return r;
  }

  @Post('importa')
  @HttpCode(200)
  @Richiede('dati.importa')
  async importa(@Req() req: Request, @Body() b: ImportaBody) {
    const c = await this.integra.ponte();
    if (!c) throw new BadGatewayException('Sincronizzazione non configurata');
    // D-133: collegare il documento richiede anche il permesso di correggerlo (come `PUT documenti/:id`),
    // controllato prima di scrivere qualsiasi cosa
    if (b.documento_id != null && !permessiDi(req.utente!.ruolo, req.livelli ?? {}).includes('provvigioni.modifica')) {
      throw new ForbiddenException('Serve il permesso di correggere i documenti');
    }
    return importa(this.db, c.pool, c.schema, b.tipo, b.id_integra, contesto(req), b.documento_id != null ? BigInt(b.documento_id) : null);
  }
}
