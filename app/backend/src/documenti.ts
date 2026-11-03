import {
  BadRequestException, Body, applyDecorators, ConflictException, Controller, Delete, Get, HttpCode, NotFoundException, Param, ParseIntPipe,
  PayloadTooLargeException, Post, Put, Req, UnsupportedMediaTypeException, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Prisma } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Max, MaxLength, Min } from 'class-validator';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { Request } from 'express';
import { Richiede, contesto } from './accesso';
import { Data, Facoltativo } from './fornitori';
import { CON_PRATICA, iso, praticaDaDb, type Testata } from './motore/dati';
import { netto, r2 } from './motore/motore';
import { aggiornaPratica } from './pratiche';
import { PrismaService } from './prisma.service';
import { type Contesto, logEvent } from './registro';

// Documenti fiscali della pratica e canale comune di ingresso dei file (F2-A3, §4.2.7.1, §5.3, §6.5, §8.1).
// Il browser manda solo i valori digitati; netto, totali e stato li calcola il server (V12, D-28).

type Tx = Prisma.TransactionClient;
const Dec = Prisma.Decimal;
const NOME = { fattura: 'Fattura', nota_credito: 'Nota di credito' } as const;

/* ---------- Canale comune: file → disco → coda (§6.5 punti 1–2, D-34, D-36) ---------- */

const MB = Number(process.env.DOCUMENTI_MAX_MB) || 20;
export const MAX_BYTE = MB * 1024 * 1024;

export interface FileRicevuto {
  nome: string; // nome originale: solo da mostrare, mai usato sul disco
  dati: Buffer;
  origine: 'caricamento' | 'email';
  email_da?: string;
  email_oggetto?: string;
}

/** Unico ingresso dei file (caricamento ora, casella email in F6-A1). Il file va su disco **prima** della transazione,
 *  con l'impronta SHA-256 come nome; la riga in coda e l'evento nella stessa transazione (D-36). Se la transazione
 *  fallisce il file resta orfano: stesso contenuto = stesso nome, un nuovo invio lo riusa (ponytail: la pulizia dei
 *  file senza riga arriva con la pulizia notturna, F5-A5). */
export async function riceviDocumento(db: PrismaService, f: FileRicevuto, ctx: Contesto) {
  if (f.dati.length > MAX_BYTE) throw new PayloadTooLargeException(`Il file supera ${MB} MB`);
  // tipo dal contenuto, non dall'estensione né dal Content-Type del browser
  if (!f.dati.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw new UnsupportedMediaTypeException('Il file non è un PDF');
  const hash = createHash('sha256').update(f.dati).digest('hex');
  const doppione = () => new ConflictException('Documento già caricato: è lo stesso file di uno già arrivato');
  // lo stesso file scartato si può ricaricare: torna in coda sulla stessa riga (D-54)
  const gia = await db.documenti_in_arrivo.findUnique({ where: { file_hash: hash }, select: { id: true, stato: true } });
  if (gia && gia.stato !== 'scartato') throw doppione();

  const cartella = process.env.DOCUMENTI_DIR;
  if (!cartella) throw new Error('DOCUMENTI_DIR non definita in .env');
  await mkdir(cartella, { recursive: true });
  await writeFile(join(cartella, hash + '.pdf'), f.dati, { flag: 'wx' }).catch((e: NodeJS.ErrnoException) => {
    if (e.code !== 'EEXIST') throw e; // già scritto da un invio non andato a buon fine: stesso contenuto
  });

  const file_nome = basename(f.nome.replace(/\\/g, '/')).replace(/[\x00-\x1f]/g, '').slice(0, 255) || 'documento.pdf';
  try {
    const d = await db.$transaction(async (tx) => {
      const dati = { origine: f.origine, email_da: f.email_da ?? null, email_oggetto: f.email_oggetto ?? null, file_nome, utente_id: ctx.utente_id ?? null };
      let d;
      if (gia) {
        await tx.$queryRaw`SELECT id FROM documenti_in_arrivo WHERE id = ${gia.id} FOR UPDATE`;
        if ((await tx.documenti_in_arrivo.findUniqueOrThrow({ where: { id: gia.id } })).stato !== 'scartato') throw doppione();
        d = await tx.documenti_in_arrivo.update({
          where: { id: gia.id },
          data: { ...dati, stato: 'in_coda', tentativi: 0, errore: null, ricevuto_il: new Date(), scartato_il: null, scartato_da: null, motivo_scarto: null, nota_scarto: null },
        });
      } else {
        d = await tx.documenti_in_arrivo.create({ data: { ...dati, file_hash: hash } });
      }
      await logEvent(tx, {
        tipo: 'documento', azione: 'upload', entita: 'documento', entita_id: d.id, esito: 'successo',
        dettaglio: { etichetta: file_nome, documento_id: String(d.id), file_nome, dimensione: f.dati.length, origine: f.origine, recuperato: !!gia },
      }, ctx);
      return d;
    });
    // F6-A2: qui, dopo il commit, si sveglia il lettore (stato in_coda = da leggere, §6.5)
    return { id: String(d.id), file_nome: d.file_nome, stato: d.stato, ricevuto_il: d.ricevuto_il.toISOString() };
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') throw doppione(); // stesso file arrivato insieme da due parti
    throw e;
  }
}

@Controller('documenti')
export class DocumentiController {
  constructor(private readonly db: PrismaService) {}

  /** Caricamento manuale (§8.1): multipart, campo `file`, un PDF. Va in coda "da leggere". */
  @Post('carica')
  @Richiede('provvigioni.modifica')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_BYTE, files: 1 } }))
  async carica(@Req() req: Request, @UploadedFile() file?: { originalname: string; buffer: Buffer }) {
    if (!file) throw new BadRequestException('Manca il file');
    return riceviDocumento(this.db, { nome: file.originalname, dati: file.buffer, origine: 'caricamento' }, contesto(req));
  }
}


/* ---------- Documenti fiscali della pratica (§4.2.7.1, §5.3) ---------- */

const Importo = () => applyDecorators(IsNumber({ maxDecimalPlaces: 2 }), IsPositive(), Max(9_999_999_999.99));
const Testo = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

class ModificaDocumento {
  @Facoltativo() @Testo() @IsString() @IsNotEmpty() @MaxLength(50) numero?: string;
  @Facoltativo() @Data() data?: string;
  // valore digitato, sempre positivo: per la nota di credito il server lo salva negativo (§4.2.7.1)
  @Facoltativo() @Importo() importo?: number;
  @Facoltativo() @IsBoolean() storno_totale?: boolean;
  @IsOptional() @IsString() @MaxLength(2000) note?: string | null; // null svuota la nota
}
class NuovoDocumento {
  @IsIn(['fattura', 'nota_credito']) tipo!: 'fattura' | 'nota_credito';
  @Testo() @IsString() @IsNotEmpty() @MaxLength(50) numero!: string;
  @Data() data!: string;
  @Facoltativo() @Importo() importo?: number;
  @Facoltativo() @IsBoolean() storno_totale?: boolean;
  @IsOptional() @IsString() @MaxLength(2000) note?: string;
  @Facoltativo() @IsInt() @Min(1) fattura_id?: number; // nota di credito: la fattura stornata (D-34)
  @Facoltativo() @IsInt() @Min(1) arrivo_id?: number; // file in coda dal canale comune
}

type Bozza = { tipo: string; importo?: number; storno_totale: boolean; fattura_id: bigint | null };
const nomeDi = (tipo: string) => NOME[tipo as keyof typeof NOME];

/** Blocchi in ordine fisso (D-54, come D-51): prima il fornitore, poi le pratiche per id, poi i documenti in arrivo.
 *  Il fornitore fa passare una alla volta le scritture sui suoi documenti: il numero unico si controlla senza corse. */
async function bloccaFornitore(tx: Tx, pratica_id: number) {
  const p = await tx.ordini_fornitore_testata.findUnique({ where: { id: BigInt(pratica_id) }, select: { fornitore_id: true } });
  if (!p) throw new NotFoundException('Pratica non trovata');
  await tx.$queryRaw`SELECT id FROM fornitori WHERE id = ${p.fornitore_id} FOR UPDATE`;
  return p.fornitore_id;
}
async function bloccaPratiche(tx: Tx, ids: bigint[]) {
  await tx.$queryRaw`SELECT id FROM ordini_fornitore_testata WHERE id IN (${Prisma.join([...new Set(ids)])}) ORDER BY id FOR UPDATE`;
}

/** Numero unico per fornitore; la stessa fattura su più pratiche (multi-ordine) ha la stessa data (§4.2.7.1).
 *  `escludi` = il documento e le sue copie sulle altre pratiche. */
async function controllaNumero(tx: Tx, fornitore_id: bigint, testata_id: bigint, tipo: string, numero: string, data: string, escludi: bigint[] = []) {
  const stessi = await tx.ordini_fornitore_documenti.findMany({
    where: { tipo, numero, testata: { fornitore_id }, id: { notIn: escludi } }, select: { testata_id: true, data: true },
  });
  if (stessi.some((x) => x.testata_id === testata_id)) throw new ConflictException(`${nomeDi(tipo)} ${numero} è già registrata in questa pratica`);
  if (stessi.some((x) => iso(x.data) !== data)) throw new ConflictException(`Il fornitore ha già una ${nomeDi(tipo).toLowerCase()} ${numero} con un'altra data`);
}

/** Importo da salvare, con il segno (§5.3). `id` = il documento corretto. */
async function importoValido(tx: Tx, testata_id: bigint, d: Bozza, id?: bigint) {
  if (d.tipo === 'fattura') {
    if (d.storno_totale) throw new BadRequestException('Lo storno totale vale solo per la nota di credito');
    if (d.importo === undefined) throw new BadRequestException("Manca l'importo");
    const imp = r2(d.importo);
    // le note parziali restano; quella con storno totale si ricalcola (ricalcolaStornoTotale)
    const nc = id && (await tx.ordini_fornitore_documenti.aggregate({ where: { fattura_id: id, storno_totale: false }, _sum: { importo: true } }))._sum.importo;
    if (nc && imp.plus(nc).lt(0)) throw new ConflictException(`Le note di credito stornano ${nc.neg().toFixed(2)} € da questa fattura: l'importo non può essere più basso`);
    return imp;
  }
  if (!d.fattura_id) throw new BadRequestException('Indica la fattura che la nota di credito storna');
  const f = await tx.ordini_fornitore_documenti.findUnique({ where: { id: d.fattura_id } });
  if (!f || f.tipo !== 'fattura' || f.testata_id !== testata_id) throw new BadRequestException('La nota di credito deve stornare una fattura di questa pratica');
  const gia = (await tx.ordini_fornitore_documenti.aggregate({ where: { fattura_id: f.id, ...(id ? { id: { not: id } } : {}) }, _sum: { importo: true } }))._sum.importo;
  const residuo = f.importo.plus(gia ?? 0);
  // §5.3: totale = storna tutta la fattura (quello che resta); parziale = non oltre quello che resta
  if (d.storno_totale) {
    if (residuo.lte(0)) throw new ConflictException(`La fattura ${f.numero} è già stornata per intero`);
    return residuo.neg();
  }
  if (d.importo === undefined) throw new BadRequestException("Manca l'importo");
  const imp = r2(d.importo);
  if (imp.gt(residuo)) throw new BadRequestException(`La nota di credito supera la fattura ${f.numero}: si possono stornare al massimo ${residuo.toFixed(2)} €`);
  return imp.neg();
}

/** Documento con i suoi legami; liquidato al subagente = chiuso, si corregge con una nota di credito (D-11, §4.2.7.2). */
async function documentoDi(tx: Tx, testata_id: bigint, did: number | bigint) {
  const d = await tx.ordini_fornitore_documenti.findUnique({
    where: { id: BigInt(did) }, include: { correzione: { select: { id: true } }, _count: { select: { righe_bollettino: true, note_credito: true } } },
  });
  if (!d || d.testata_id !== testata_id) throw new NotFoundException('Documento non trovato');
  if (d.liquidazione_id) throw new ConflictException(`${nomeDi(d.tipo)} ${d.numero} già liquidata al subagente: non si modifica, registra una nota di credito`);
  return d;
}
type Doc = Awaited<ReturnType<typeof documentoDi>>;
const inBollettino = (d: Doc) => {
  if (d._count.righe_bollettino) throw new ConflictException(`${nomeDi(d.tipo)} ${d.numero} è già in un bollettino: importo, numero e data non cambiano`);
};

const perEvento = (d: { id: bigint; testata_id: bigint; tipo: string; numero: string; data: Date; importo: Prisma.Decimal; storno_totale: boolean; fattura_id: bigint | null }) => ({
  etichetta: `${d.numero} · ${nomeDi(d.tipo)}`, pratica_id: String(d.testata_id), documento_id: String(d.id),
  tipo: d.tipo, numero: d.numero, data: iso(d.data), importo: Number(d.importo), storno_totale: d.storno_totale, fattura_id: d.fattura_id ? String(d.fattura_id) : null,
});
const eventoModifica = (tx: Tx, d: { id: bigint; testata_id: bigint; numero: string; tipo: string }, prima: object, dopo: object, ctx: Contesto) =>
  logEvent(tx, {
    tipo: 'documento', azione: 'update', entita: 'documento', entita_id: d.id, esito: 'successo',
    dettaglio: { etichetta: `${d.numero} · ${nomeDi(d.tipo)}`, documento_id: String(d.id), pratica_id: String(d.testata_id), prima, dopo },
  }, ctx);

/** La nota con storno totale segue l'importo della fattura: storna quello che le note parziali lasciano (§5.3). */
async function ricalcolaStornoTotale(tx: Tx, fattura: { id: bigint; testata_id: bigint }, importo: Prisma.Decimal, ctx: Contesto) {
  const totali = await tx.ordini_fornitore_documenti.findMany({ where: { fattura_id: fattura.id, storno_totale: true }, select: { id: true } });
  if (!totali.length) return;
  const parziali = (await tx.ordini_fornitore_documenti.aggregate({ where: { fattura_id: fattura.id, storno_totale: false }, _sum: { importo: true } }))._sum.importo;
  const nuovo = importo.plus(parziali ?? 0).neg();
  for (const nc of totali) { // al più una: dopo uno storno totale il residuo è zero
    const d = await documentoDi(tx, fattura.testata_id, nc.id);
    if (d.importo.equals(nuovo)) continue;
    inBollettino(d);
    await tx.ordini_fornitore_documenti.update({ where: { id: d.id }, data: { importo: nuovo } });
    await eventoModifica(tx, d, { importo: Number(d.importo) }, { importo: Number(nuovo) }, ctx);
  }
}

/** Documenti fiscali della pratica con netto e totali dal motore (§5.3), dalla pratica già caricata. */
function documentiPratica(t: Testata) {
  const somma = (tipo: string) => r2(t.documenti.filter((d) => d.tipo === tipo).reduce((s, d) => s.plus(d.importo), new Dec(0)));
  const stornato = new Map<bigint, Prisma.Decimal>();
  for (const d of t.documenti) if (d.fattura_id) stornato.set(d.fattura_id, (stornato.get(d.fattura_id) ?? new Dec(0)).minus(d.importo));
  return {
    pratica: { id: String(t.id), numero: t.numero_ordine, stato: t.stato, importo: Number(t.importo) },
    documenti: t.documenti.map((d) => {
      const s = stornato.get(d.id) ?? new Dec(0);
      return {
        id: String(d.id), tipo: d.tipo, numero: d.numero, data: iso(d.data),
        importo: Number(d.importo), // negativo per la nota di credito
        storno_totale: d.storno_totale, fattura_id: d.fattura_id ? String(d.fattura_id) : null,
        // fattura: quanto stornano le sue note di credito e quanto si può ancora stornare
        ...(d.tipo === 'fattura' ? { stornato: Number(s), residuo: Number(d.importo.minus(s)) } : {}),
        arrivo_id: d.arrivo_id ? String(d.arrivo_id) : null, file_nome: d.arrivo?.file_nome ?? null,
        stato_incasso: d.tipo === 'fattura' ? d.stato_incasso : null,
        liquidato: d.liquidazione_id !== null, note: d.note,
      };
    }),
    totali: { fatture: Number(somma('fattura')), note_credito: Number(somma('nota_credito')), netto: Number(netto(praticaDaDb(t))) },
  };
}

@Controller('pratiche/:id/documenti')
export class DocumentiPraticaController {
  constructor(private readonly db: PrismaService) {}

  @Get()
  @Richiede('provvigioni.consulta')
  async elenco(@Param('id', ParseIntPipe) id: number) {
    const t = await this.db.ordini_fornitore_testata.findUnique({ where: { id: BigInt(id) }, include: CON_PRATICA });
    if (!t) throw new NotFoundException('Pratica non trovata');
    return documentiPratica(t);
  }

  /** Registra a mano una fattura o una nota di credito, con il file facoltativo in coda dal canale. */
  @Post()
  @Richiede('provvigioni.modifica')
  async crea(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() b: NuovoDocumento) {
    const ctx = contesto(req);
    return this.db.$transaction(async (tx) => {
      const fid = await bloccaFornitore(tx, id);
      const pid = BigInt(id);
      await bloccaPratiche(tx, [pid]);
      if (b.tipo === 'fattura' && b.fattura_id) throw new BadRequestException('Solo la nota di credito storna una fattura');
      const fattura_id = b.fattura_id ? BigInt(b.fattura_id) : null;
      const storno_totale = b.storno_totale ?? false;
      await controllaNumero(tx, fid, pid, b.tipo, b.numero, b.data);
      const importo = await importoValido(tx, pid, { tipo: b.tipo, importo: b.importo, storno_totale, fattura_id });
      let arrivo_id: bigint | null = null;
      if (b.arrivo_id) {
        arrivo_id = BigInt(b.arrivo_id);
        await tx.$queryRaw`SELECT id FROM documenti_in_arrivo WHERE id = ${arrivo_id} FOR UPDATE`;
        const a = await tx.documenti_in_arrivo.findUnique({ where: { id: arrivo_id } });
        if (!a) throw new BadRequestException('File non trovato');
        // solo un file in coda: uno già abbinato, scartato o in lettura non si riusa (D-54)
        if (a.stato !== 'in_coda') throw new ConflictException('Il file non è più in coda: è già abbinato, scartato o in lettura');
        await tx.documenti_in_arrivo.update({ where: { id: arrivo_id }, data: { stato: 'abbinato', tipo: b.tipo, abbinato_pratica_id: pid, controllato_il: new Date() } });
      }
      const d = await tx.ordini_fornitore_documenti.create({
        data: { testata_id: pid, tipo: b.tipo, numero: b.numero, data: new Date(b.data), importo, storno_totale, fattura_id, arrivo_id, note: b.note },
      });
      await logEvent(tx, { tipo: 'documento', azione: 'create', entita: 'documento', entita_id: d.id, esito: 'successo', dettaglio: { ...perEvento(d), arrivo_id: arrivo_id ? String(arrivo_id) : null } }, ctx);
      return documentiPratica(await aggiornaPratica(tx, pid, ctx, `${nomeDi(b.tipo)} ${b.numero}`));
    });
  }

  /** Correzione. Numero e data valgono per tutte le copie della stessa fattura sulle altre pratiche (multi-ordine);
   *  l'importo è la quota di questa pratica. Tipo e fattura stornata non cambiano. */
  @Put(':did')
  @Richiede('provvigioni.modifica')
  async modifica(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Param('did', ParseIntPipe) did: number, @Body() b: ModificaDocumento) {
    const ctx = contesto(req);
    return this.db.$transaction(async (tx) => {
      const fid = await bloccaFornitore(tx, id);
      const pid = BigInt(id);
      const x = await tx.ordini_fornitore_documenti.findUnique({ where: { id: BigInt(did) }, select: { tipo: true, numero: true } });
      // con il fornitore bloccato le copie non cambiano: si trovano prima, poi si bloccano le pratiche in ordine di id
      const copie = x
        ? await tx.ordini_fornitore_documenti.findMany({ where: { tipo: x.tipo, numero: x.numero, testata: { fornitore_id: fid }, id: { not: BigInt(did) } }, select: { id: true, testata_id: true } })
        : [];
      await bloccaPratiche(tx, [pid, ...copie.map((c) => c.testata_id)]);
      const d = await documentoDi(tx, pid, did);

      const numero = b.numero ?? d.numero, data = b.data ?? iso(d.data);
      const cambiaNumero = numero !== d.numero || data !== iso(d.data);
      const cambiaImporto = d.tipo === 'fattura' ? b.importo !== undefined : b.importo !== undefined || b.storno_totale !== undefined;
      if (cambiaNumero || cambiaImporto) inBollettino(d);
      const altre = cambiaNumero ? await Promise.all(copie.map((c) => documentoDi(tx, c.testata_id, c.id))) : [];
      altre.forEach(inBollettino);
      if (cambiaNumero) await controllaNumero(tx, fid, pid, d.tipo, numero, data, [d.id, ...copie.map((c) => c.id)]);
      const storno_totale = b.storno_totale ?? d.storno_totale;
      const importo = cambiaImporto
        ? await importoValido(tx, pid, { tipo: d.tipo, importo: b.importo ?? Math.abs(Number(d.importo)), storno_totale, fattura_id: d.fattura_id }, d.id)
        : d.importo;

      const nuovo = { numero, data, importo: Number(importo), storno_totale, note: b.note !== undefined ? b.note : d.note };
      const vecchio = { numero: d.numero, data: iso(d.data), importo: Number(d.importo), storno_totale: d.storno_totale, note: d.note };
      const prima: Record<string, unknown> = {}, dopo: Record<string, unknown> = {};
      for (const k of Object.keys(nuovo) as (keyof typeof nuovo)[]) if (nuovo[k] !== vecchio[k]) { prima[k] = vecchio[k]; dopo[k] = nuovo[k]; }
      const motivo = `${nomeDi(d.tipo)} ${numero} corretta`;
      if (Object.keys(dopo).length) {
        await tx.ordini_fornitore_documenti.update({ where: { id: d.id }, data: { ...nuovo, data: new Date(data), importo } });
        await eventoModifica(tx, d, prima, dopo, ctx);
        for (const c of altre) {
          await tx.ordini_fornitore_documenti.update({ where: { id: c.id }, data: { numero, data: new Date(data) } });
          await eventoModifica(tx, c, { numero: c.numero, data: iso(c.data) }, { numero, data }, ctx);
        }
        if (d.tipo === 'fattura' && cambiaImporto) await ricalcolaStornoTotale(tx, d, importo, ctx);
        for (const c of altre) await aggiornaPratica(tx, c.testata_id, ctx, motivo);
      }
      return documentiPratica(await aggiornaPratica(tx, pid, ctx, motivo));
    });
  }

  /** Annullamento di un documento registrato per errore: non se liquidato, stornato da una nota, corretto per il
   *  subagente o già in un bollettino (niente cancellazioni a cascata silenziose). Il suo file torna in coda. */
  @Delete(':did')
  @HttpCode(204)
  @Richiede('provvigioni.modifica')
  async elimina(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Param('did', ParseIntPipe) did: number) {
    const ctx = contesto(req);
    await this.db.$transaction(async (tx) => {
      await bloccaFornitore(tx, id);
      const pid = BigInt(id);
      await bloccaPratiche(tx, [pid]);
      const d = await documentoDi(tx, pid, did);
      const quale = `${nomeDi(d.tipo)} ${d.numero}`;
      if (d._count.note_credito) throw new ConflictException(`Una nota di credito storna la ${quale.toLowerCase()}: annulla prima la nota di credito`);
      if (d.correzione) throw new ConflictException(`${quale} ha una correzione della quota del subagente: toglila prima`);
      if (d._count.righe_bollettino) throw new ConflictException(`${quale} è già in un bollettino: non si annulla`);
      await tx.ordini_fornitore_documenti.delete({ where: { id: d.id } });
      // il file torna in coda, se nessun altro documento lo usa
      if (d.arrivo_id && !(await tx.ordini_fornitore_documenti.count({ where: { arrivo_id: d.arrivo_id } }))) {
        await tx.$queryRaw`SELECT id FROM documenti_in_arrivo WHERE id = ${d.arrivo_id} FOR UPDATE`;
        await tx.documenti_in_arrivo.update({ where: { id: d.arrivo_id }, data: { stato: 'in_coda', abbinato_pratica_id: null } });
      }
      const e = perEvento(d);
      await logEvent(tx, {
        tipo: 'documento', azione: 'delete', entita: 'documento', entita_id: d.id, esito: 'successo',
        dettaglio: { etichetta: e.etichetta, documento_id: e.documento_id, pratica_id: e.pratica_id, tipo: e.tipo, numero: e.numero, importo: e.importo, arrivo_id: d.arrivo_id ? String(d.arrivo_id) : null },
      }, ctx);
      await aggiornaPratica(tx, pid, ctx, `${quale} annullata`);
    });
  }
}
