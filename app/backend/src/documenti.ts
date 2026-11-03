import {
  BadRequestException, Body, applyDecorators, ConflictException, Controller, Delete, Get, HttpCode, Logger, NotFoundException, Param, ParseIntPipe,
  PayloadTooLargeException, Post, Put, Query, Req, Res, StreamableFile, UnsupportedMediaTypeException, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Prisma } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve, sep } from 'node:path';
import type { Request, Response } from 'express';
import { Richiede, contesto } from './accesso';
import { Data, Facoltativo } from './fornitori';
import { CON_PRATICA, TIPI_DOCUMENTO, type TipoDocumento, fiscale, giornoRoma, iso, praticaDaDb, type Testata } from './motore/dati';
import { netto, r2 } from './motore/motore';
import { aggiornaPratica } from './pratiche';
import { PrismaService } from './prisma.service';
import { type Contesto, logEvent } from './registro';

// Documenti fiscali della pratica e canale comune di ingresso dei file (F2-A3, §4.2.7.1, §5.3, §6.5, §8.1).
// Il browser manda solo i valori digitati; netto, totali e stato li calcola il server (V12, D-28).

type Tx = Prisma.TransactionClient;
const Dec = Prisma.Decimal;
const NOME: Record<TipoDocumento, string> = {
  ordine: 'Ordine', conferma: 'Conferma', proforma: 'Proforma', fattura: 'Fattura', nota_credito: 'Nota di credito', pagamento: 'Pagamento', altro: 'Documento',
};

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

/** Formati ammessi, riconosciuti dai primi byte (non dall'estensione né dal Content-Type del browser). D-60: anche le foto. */
const FORMATI = [
  { est: 'pdf', mime: 'application/pdf', firma: Buffer.from('%PDF-') },
  { est: 'jpg', mime: 'image/jpeg', firma: Buffer.from([0xff, 0xd8, 0xff]) },
  { est: 'png', mime: 'image/png', firma: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
];
const ZIP_OLE = [Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from([0xd0, 0xcf, 0x11, 0xe0])]; // xlsx/xlsm; xls e msg

/** Estensione del file dai byte; 415 con un messaggio chiaro per Excel (D-60: non si accettano) e per il resto. */
function formato(dati: Buffer, nome: string) {
  const f = FORMATI.find((x) => dati.subarray(0, x.firma.length).equals(x.firma));
  if (f) return f.est;
  if (/\.msg$/i.test(nome)) throw new UnsupportedMediaTypeException("I messaggi di Outlook (.msg) non si caricano: salva l'allegato e carica quello");
  if (/\.xls[xmb]?$/i.test(nome) || ZIP_OLE.some((z) => dati.subarray(0, z.length).equals(z))) {
    throw new UnsupportedMediaTypeException('I file Excel non si accettano: carica il PDF o la foto del documento');
  }
  throw new UnsupportedMediaTypeException('Il file non è un PDF né una foto (JPEG, PNG)');
}

/** Unico ingresso dei file (caricamento ora, casella email in F6-A1). Il file va su disco **prima** della transazione,
 *  con l'impronta SHA-256 come nome; la riga in coda e l'evento nella stessa transazione (D-36). Se la transazione
 *  fallisce il file resta orfano: stesso contenuto = stesso nome, un nuovo invio lo riusa (ponytail: la pulizia dei
 *  file senza riga arriva con la pulizia notturna, F5-A5). */
export async function riceviDocumento(db: PrismaService, f: FileRicevuto, ctx: Contesto) {
  if (f.dati.length > MAX_BYTE) throw new PayloadTooLargeException(`Il file supera ${MB} MB`);
  const est = formato(f.dati, f.nome);
  const hash = createHash('sha256').update(f.dati).digest('hex');
  const doppione = () => new ConflictException('Documento già caricato: è lo stesso file di uno già arrivato');
  // lo stesso file scartato si può ricaricare: torna in coda sulla stessa riga (D-54)
  const gia = await db.documenti_in_arrivo.findUnique({ where: { file_hash: hash }, select: { id: true, stato: true, file_percorso: true } });
  if (gia && gia.stato !== 'scartato') throw doppione();

  const radice = process.env.DOCUMENTI_DIR;
  if (!radice) throw new Error('DOCUMENTI_DIR non definita in .env');
  // D-60: in coda in_arrivo/AAAA/AAAAMMGG/<impronta>.<est> (giorno di Roma); all'abbinamento va nella cartella della
  // pratica (archivia). Un file scartato ricaricato resta dove era
  const g = giornoRoma(new Date()).replace(/-/g, '');
  const file_percorso = gia?.file_percorso ?? `in_arrivo/${g.slice(0, 4)}/${g}/${hash}.${est}`;
  await mkdir(dirname(join(radice, file_percorso)), { recursive: true });
  await writeFile(join(radice, file_percorso), f.dati, { flag: 'wx' }).catch((e: NodeJS.ErrnoException) => {
    if (e.code !== 'EEXIST') throw e; // già scritto da un invio non andato a buon fine: stesso contenuto
  });

  const file_nome = basename(f.nome.replace(/\\/g, '/')).replace(/[\x00-\x1f]/g, '').slice(0, 255) || `documento.${est}`;
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
        d = await tx.documenti_in_arrivo.create({ data: { ...dati, file_hash: hash, file_percorso } });
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

/** Pezzo di nome leggibile e sicuro per il disco: lettere senza accenti, cifre, . _ - (D-60). */
const pulisci = (s: string) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.-]+/g, '-').replace(/^[-.]+|[-.]+$/g, '').slice(0, 60);

/** Archivio per pratica (D-60 §19, sostituisce D-55): dopo il commit il file abbinato va in
 *  pratiche/AAAA/AAAAMM/<numero pratica>/<tipo>_<numero o data>.<est> (AAAA/AAAAMM = data della pratica), con _2, _3… se
 *  il nome c'è già. Ordine sicuro: copia (mai sopra un altro file) → percorso nel database solo se nessuno l'ha cambiato →
 *  via il vecchio. Se qualcosa fallisce il file resta dov'era e il percorso salvato è giusto; al più resta una copia orfana. */
export async function archivia(db: PrismaService, arrivo_id: bigint) {
  const radice = process.env.DOCUMENTI_DIR;
  if (!radice) throw new Error('DOCUMENTI_DIR non definita in .env');
  const a = await db.documenti_in_arrivo.findUnique({
    where: { id: arrivo_id },
    select: { file_percorso: true, documenti: { orderBy: { id: 'asc' }, take: 1, include: { testata: { select: { numero_ordine: true, data_ordine: true } } } } },
  });
  const d = a?.documenti[0];
  if (!a || !d) return null;
  // la cartella non segue la data della pratica, che cambia con gli ordini: si riusa quella dei file già archiviati
  const nome = pulisci(d.testata.numero_ordine) || 'pratica';
  const gia = await db.documenti_in_arrivo.findFirst({
    where: { file_percorso: { startsWith: 'pratiche/' }, documenti: { some: { testata_id: d.testata_id } } },
    select: { file_percorso: true },
  });
  const g = iso(d.testata.data_ordine).replace(/-/g, '');
  const cartella = gia?.file_percorso.startsWith('pratiche/') && dirname(gia.file_percorso).endsWith('/' + nome)
    ? dirname(gia.file_percorso) : `pratiche/${g.slice(0, 4)}/${g.slice(0, 6)}/${nome}`;
  if (dirname(a.file_percorso) === cartella) return a.file_percorso; // già nella sua pratica
  const base = `${d.tipo}_${pulisci(d.numero) || iso(d.data)}`;
  await mkdir(join(radice, cartella), { recursive: true });
  for (let n = 1; ; n++) {
    const nuovo = `${cartella}/${base}${n > 1 ? '_' + n : ''}${extname(a.file_percorso)}`;
    try {
      await copyFile(join(radice, a.file_percorso), join(radice, nuovo), constants.COPYFILE_EXCL);
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (code === 'EEXIST' && n < 100) continue;
      if (code === 'ENOENT') { // un'altra richiesta l'ha già spostato: vale il percorso salvato adesso
        const ora = await db.documenti_in_arrivo.findUnique({ where: { id: arrivo_id }, select: { file_percorso: true } });
        if (ora && ora.file_percorso !== a.file_percorso) return ora.file_percorso;
      }
      throw e;
    }
    let fatto = false;
    try {
      fatto = (await db.documenti_in_arrivo.updateMany({ where: { id: arrivo_id, file_percorso: a.file_percorso }, data: { file_percorso: nuovo } })).count > 0;
    } finally {
      await rm(join(radice, fatto ? a.file_percorso : nuovo), { force: true });
    }
    return fatto ? nuovo : null;
  }
}
const log = new Logger('documenti');
/** Dopo il commit: uno spostamento che fallisce non annulla l'abbinamento, già salvato (il file resta dov'era). */
const archiviaDopo = async (db: PrismaService, arrivo_id: bigint | null) => {
  if (arrivo_id) await archivia(db, arrivo_id).catch((e: Error) => log.warn(`file del documento in arrivo ${arrivo_id} non spostato: ${e.message}`));
};

/** Parametri della ricerca dei documenti per l'abbinamento a mano (§7.7, §8.1). */
class CercaDocumenti {
  @Type(() => Number) @IsInt() @Min(1) fornitore_id!: number;
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}$/) mese?: string; // AAAA-MM del bollettino: i suoi documenti vengono prima
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limite?: number;
}

@Controller('documenti')
export class DocumentiController {
  constructor(private readonly db: PrismaService) {}

  /** Documenti di un fornitore per l'abbinamento a mano (F3-A2b, §7.7, §8.1): fatture e note di
   *  credito di ogni periodo, cercate per numero o per cliente. Prima quelli del mese del
   *  bollettino, poi gli altri dal più recente; `su_riga` dice se sono già su una riga di un bollettino. */
  @Get('cerca')
  @Richiede('provvigioni.consulta')
  async cerca(@Query() q: CercaDocumenti) {
    const testo = (q.q ?? '').trim();
    const simile = '%' + testo.replace(/[\\%_]/g, '\\$&') + '%'; // % e _ sono lettere, non jolly (come pratiche.ts)
    const mese = q.mese ?? '';
    const righe = await this.db.$queryRaw<{
      id: bigint; numero: string; data: string; tipo: string; cliente: string;
      pratica_id: bigint; pratica: string; importo: Prisma.Decimal;
      bollettino_id: bigint | null; mese: number | null; anno: number | null;
    }[]>`
      WITH bollettino_riga AS (
        SELECT DISTINCT ON (d.id) d.id AS documento_id, bt.id AS testata_id, bt.mese, bt.anno
        FROM ordini_fornitore_documenti d
        JOIN ordini_fornitore_testata t ON t.id = d.testata_id
        -- anche una riga non ancora abbinata con lo stesso numero (il server la tratta come già usata)
        JOIN bollettini_righe br ON br.documento_id = d.id
          OR (br.documento_id IS NULL AND br.fattura_numero = d.numero
            AND ((d.tipo = 'fattura' AND br.tipo_riga = 'provvigione') OR (d.tipo <> 'fattura' AND br.tipo_riga <> 'provvigione')))
        JOIN bollettini_testata bt ON bt.id = br.testata_id AND bt.fornitore_id = t.fornitore_id
        ORDER BY d.id, bt.anno DESC, bt.mese DESC
      )
      SELECT d.id, d.numero, to_char(d.data, 'YYYY-MM-DD') AS data, d.tipo,
             coalesce(cv.ragione_sociale, '') AS cliente, t.id AS pratica_id, t.numero_ordine AS pratica, d.importo,
             rb.testata_id AS bollettino_id, rb.mese, rb.anno
      FROM ordini_fornitore_documenti d
      JOIN ordini_fornitore_testata t ON t.id = d.testata_id
      JOIN clienti c ON c.id = t.cliente_id
      LEFT JOIN clienti_versioni cv ON cv.id = c.versione_corrente_id
      LEFT JOIN bollettino_riga rb ON rb.documento_id = d.id
      WHERE t.fornitore_id = ${BigInt(q.fornitore_id)} AND d.tipo IN ('fattura', 'nota_credito')
        AND (${testo} = '' OR d.numero ILIKE ${simile} OR coalesce(cv.ragione_sociale, '') ILIKE ${simile})
      ORDER BY CASE WHEN ${mese} <> '' AND to_char(d.data, 'YYYY-MM') = ${mese} THEN 0 ELSE 1 END,
               d.data DESC, d.numero
      LIMIT ${q.limite ?? 20}`;
    return righe.map((r) => ({
      id: String(r.id), numero: r.numero, data: r.data, tipo: r.tipo, cliente: r.cliente,
      pratica_id: String(r.pratica_id), pratica: r.pratica, importo: Number(r.importo),
      su_riga: r.bollettino_id ? { bollettino_id: String(r.bollettino_id), mese: r.mese, anno: r.anno } : null,
    }));
  }

  /** Caricamento manuale (§8.1): multipart, campo `file`, un PDF o una foto (D-60). Va in coda "da leggere". */
  @Post('carica')
  @Richiede('provvigioni.modifica')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_BYTE, files: 1 } }))
  async carica(@Req() req: Request, @UploadedFile() file?: { originalname: string; buffer: Buffer }) {
    if (!file) throw new BadRequestException('Manca il file');
    return riceviDocumento(this.db, { nome: file.originalname, dati: file.buffer, origine: 'caricamento' }, contesto(req));
  }

  /** Il file originale di un documento arrivato (F2-A3, §8.1): PDF o foto. Il percorso viene solo dal database
   *  (D-60), mai dal browser; la risposta è in linea e chiusa in una sandbox. */
  @Get(':id/file')
  @Richiede('provvigioni.consulta')
  async file(@Param('id', ParseIntPipe) id: number, @Res({ passthrough: true }) res: Response) {
    const d = await this.db.documenti_in_arrivo.findUnique({ where: { id: BigInt(id) }, select: { file_percorso: true, file_nome: true } });
    if (!d) throw new NotFoundException('Documento non trovato');
    const radice = resolve(process.env.DOCUMENTI_DIR ?? '');
    if (!process.env.DOCUMENTI_DIR) throw new Error('DOCUMENTI_DIR non definita in .env');
    const percorso = resolve(radice, d.file_percorso);
    if (!percorso.startsWith(radice + sep)) throw new NotFoundException('File non trovato');
    let dati: Buffer;
    try {
      dati = await readFile(percorso);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') throw new NotFoundException('File non trovato');
      throw e;
    }
    // RFC 5987: niente virgolette né a capo nell'intestazione (il nome arriva dal browser)
    const nome = encodeURIComponent(d.file_nome).replace(/['()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
    res.set({
      'Content-Type': FORMATI.find((f) => '.' + f.est === extname(d.file_percorso))?.mime ?? 'application/octet-stream',
      'Content-Disposition': `inline; filename*=UTF-8''${nome}`,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': 'sandbox',
    });
    return new StreamableFile(dati);
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
  @IsIn(TIPI_DOCUMENTO) tipo!: TipoDocumento; // D-60
  // obbligatori per ordine, fattura e nota di credito (registra); un pagamento può non avere numero
  @Facoltativo() @Testo() @IsString() @IsNotEmpty() @MaxLength(50) numero?: string;
  @Facoltativo() @Data() data?: string;
  @Facoltativo() @Importo() importo?: number;
  @Facoltativo() @IsBoolean() storno_totale?: boolean;
  @IsOptional() @IsString() @MaxLength(2000) note?: string;
  @Facoltativo() @IsInt() @Min(1) fattura_id?: number; // nota di credito: la fattura stornata (D-34)
  @Facoltativo() @IsInt() @Min(1) arrivo_id?: number; // file in coda dal canale comune
}
/** Abbinamento a mano di un file in coda (D-60): pratica esistente, oppure cliente e fornitore per un ordine che apre una pratica nuova. */
class AbbinaDocumento extends NuovoDocumento {
  @Facoltativo() @IsInt() @Min(1) pratica_id?: number;
  @Facoltativo() @IsInt() @Min(1) cliente_id?: number;
  @Facoltativo() @IsInt() @Min(1) fornitore_id?: number;
}
class SpostaDocumento {
  @IsInt() @Min(1) pratica_id!: number;
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
  if (!fiscale(tipo) && tipo !== 'ordine') return; // D-60: conferme, proforma, pagamenti e altri non hanno un numero unico
  const stessi = await tx.ordini_fornitore_documenti.findMany({
    where: { tipo, numero, testata: { fornitore_id }, id: { notIn: escludi } }, select: { testata_id: true, data: true },
  });
  if (tipo === 'ordine' && stessi.length) throw new ConflictException(`Il fornitore ha già un ordine ${numero}`); // un ordine sta in una pratica sola
  if (stessi.some((x) => x.testata_id === testata_id)) throw new ConflictException(`${nomeDi(tipo)} ${numero} è già registrata in questa pratica`);
  if (stessi.some((x) => iso(x.data) !== data)) throw new ConflictException(`Il fornitore ha già una ${nomeDi(tipo).toLowerCase()} ${numero} con un'altra data`);
}

/** Importo da salvare, con il segno (§5.3). `id` = il documento corretto. */
async function importoValido(tx: Tx, testata_id: bigint, d: Bozza, id?: bigint) {
  if (!fiscale(d.tipo)) { // D-60: documento solo tracciato, l'importo (facoltativo) non tocca le provvigioni
    if (d.storno_totale) throw new BadRequestException('Lo storno totale vale solo per la nota di credito');
    return r2(d.importo ?? 0);
  }
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
/** Si può togliere dalla pratica (annullare o spostare)? Stesse regole per i due casi (D-54, D-60). */
async function togliibile(tx: Tx, pid: bigint, d: Doc, quale: string, cosa: string) {
  if (d._count.note_credito) throw new ConflictException(`Una nota di credito storna la ${quale.toLowerCase()}: annulla prima la nota di credito`);
  if (d.correzione) throw new ConflictException(`${quale} ha una correzione della quota del subagente: toglila prima`);
  if (d._count.righe_bollettino) throw new ConflictException(`${quale} è già in un bollettino: ${cosa}`);
  if (d.tipo === 'ordine' && (await tx.ordini_fornitore_documenti.count({ where: { testata_id: pid, tipo: 'ordine' } })) === 1) {
    throw new ConflictException(`${quale} è l'unico ordine della pratica: ${cosa}`); // la pratica nasce dal primo ordine
  }
}
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
    // D-60: ordini, conferme, proforma, pagamenti e altri, solo tracciati
    altri: t.documenti.filter((d) => !fiscale(d.tipo)).map((d) => ({
      id: String(d.id), tipo: d.tipo, numero: d.numero, data: iso(d.data), importo: Number(d.importo),
      arrivo_id: d.arrivo_id ? String(d.arrivo_id) : null, file_nome: d.arrivo?.file_nome ?? null, note: d.note,
    })),
    documenti: t.documenti.filter((d) => fiscale(d.tipo)).map((d) => {
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

  /** Registra a mano un documento della pratica (D-60: ogni tipo), con il file facoltativo in coda dal canale. */
  @Post()
  @Richiede('provvigioni.modifica')
  async crea(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() b: NuovoDocumento) {
    const ctx = contesto(req);
    const r = await this.db.$transaction(async (tx) => {
      const fid = await bloccaFornitore(tx, id);
      const pid = BigInt(id);
      await bloccaPratiche(tx, [pid]);
      const d = await registra(tx, fid, pid, b, ctx);
      return documentiPratica(await aggiornaPratica(tx, pid, ctx, `${nomeDi(d.tipo)} ${d.numero}`.trim()));
    });
    await archiviaDopo(this.db, b.arrivo_id ? BigInt(b.arrivo_id) : null);
    return r;
  }

  /** Sposta un documento in un'altra pratica dello stesso fornitore (correzione, D-60): non se liquidato, in un
   *  bollettino o legato a una nota di credito (come l'annullamento, D-54). Righe e file lo seguono. */
  @Post(':did/sposta')
  @HttpCode(200)
  @Richiede('provvigioni.modifica')
  async sposta(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Param('did', ParseIntPipe) did: number, @Body() b: SpostaDocumento) {
    const ctx = contesto(req);
    if (b.pratica_id === id) throw new BadRequestException('Il documento è già in questa pratica');
    let arrivo_id: bigint | null = null;
    const r = await this.db.$transaction(async (tx) => {
      const fid = await bloccaFornitore(tx, id);
      const pid = BigInt(id), nid = BigInt(b.pratica_id);
      const nuova = await tx.ordini_fornitore_testata.findUnique({ where: { id: nid }, select: { fornitore_id: true, numero_ordine: true } });
      if (!nuova) throw new NotFoundException('Pratica di destinazione non trovata');
      if (nuova.fornitore_id !== fid) throw new BadRequestException('La pratica di destinazione è di un altro fornitore');
      await bloccaPratiche(tx, [pid, nid]);
      const d = await documentoDi(tx, pid, did); // liquidato: 409
      const quale = `${nomeDi(d.tipo)} ${d.numero}`.trim();
      if (d.fattura_id) throw new ConflictException(`${quale} storna una fattura: si sposta con la sua fattura, non da sola`);
      await togliibile(tx, pid, d, quale, 'non si sposta');
      await controllaNumero(tx, fid, nid, d.tipo, d.numero, iso(d.data), [d.id]);
      await tx.ordini_fornitore_documenti.update({ where: { id: d.id }, data: { testata_id: nid } });
      await tx.ordini_fornitore_righe.updateMany({ where: { documento_id: d.id }, data: { testata_id: nid } });
      if (d.arrivo_id) {
        arrivo_id = d.arrivo_id;
        await tx.$queryRaw`SELECT id FROM documenti_in_arrivo WHERE id = ${d.arrivo_id} FOR UPDATE`;
        await tx.documenti_in_arrivo.update({ where: { id: d.arrivo_id }, data: { abbinato_pratica_id: nid } });
      }
      await logEvent(tx, {
        tipo: 'documento', azione: 'move', entita: 'documento', entita_id: d.id, esito: 'successo',
        dettaglio: { etichetta: quale, documento_id: String(d.id), tipo: d.tipo, prima: { pratica_id: String(pid) }, dopo: { pratica_id: String(nid), numero: nuova.numero_ordine } },
      }, ctx);
      const motivo = `${quale} spostato in ${nuova.numero_ordine}`;
      await aggiornaPratica(tx, pid, ctx, motivo);
      return documentiPratica(await aggiornaPratica(tx, nid, ctx, motivo));
    });
    await archiviaDopo(this.db, arrivo_id); // il file segue il documento
    return r;
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
      const copie = x && fiscale(x.tipo) // D-60: la stessa fattura su più pratiche; i documenti tracciati non hanno copie
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
      await togliibile(tx, pid, d, quale, 'non si annulla');
      await tx.ordini_fornitore_documenti.delete({ where: { id: d.id } });
      // il file torna in coda, se nessun altro documento lo usa
      if (d.arrivo_id && !(await tx.ordini_fornitore_documenti.count({ where: { arrivo_id: d.arrivo_id } }))) {
        await tx.$queryRaw`SELECT id FROM documenti_in_arrivo WHERE id = ${d.arrivo_id} FOR UPDATE`;
        await tx.documenti_in_arrivo.update({ where: { id: d.arrivo_id }, data: { stato: 'in_coda', abbinato_pratica_id: null } });
      }
      await logEvent(tx, {
        tipo: 'documento', azione: 'delete', entita: 'documento', entita_id: d.id, esito: 'successo',
        dettaglio: { ...perEvento(d), arrivo_id: d.arrivo_id ? String(d.arrivo_id) : null },
      }, ctx);
      await aggiornaPratica(tx, pid, ctx, `${quale} annullata`);
    });
  }
}

/** Registra un documento nella pratica già bloccata (D-60 §19): un posto solo per la registrazione a mano e
 *  l'abbinamento di un file in coda. Fattura e nota di credito con le regole di F2-A3 (numero unico, importo, storno);
 *  l'ordine con numero unico per fornitore; gli altri tipi solo tracciati. Evento documento.create. */
async function registra(tx: Tx, fid: bigint, pid: bigint, b: NuovoDocumento, ctx: Contesto) {
  if ((fiscale(b.tipo) || b.tipo === 'ordine') && (!b.numero || !b.data)) throw new BadRequestException(`${nomeDi(b.tipo)}: numero e data sono obbligatori`);
  if (b.tipo !== 'nota_credito' && b.fattura_id) throw new BadRequestException('Solo la nota di credito storna una fattura');
  const numero = b.numero ?? '', data = b.data ?? giornoRoma(new Date());
  const fattura_id = b.fattura_id ? BigInt(b.fattura_id) : null;
  const storno_totale = b.storno_totale ?? false;
  await controllaNumero(tx, fid, pid, b.tipo, numero, data);
  const importo = await importoValido(tx, pid, { tipo: b.tipo, importo: b.importo, storno_totale, fattura_id });
  let arrivo_id: bigint | null = null;
  if (b.arrivo_id) {
    arrivo_id = BigInt(b.arrivo_id);
    await tx.$queryRaw`SELECT id FROM documenti_in_arrivo WHERE id = ${arrivo_id} FOR UPDATE`;
    const a = await tx.documenti_in_arrivo.findUnique({ where: { id: arrivo_id } });
    if (!a) throw new NotFoundException('File non trovato');
    // solo un file in coda o letto da controllare: uno già abbinato, scartato o in lettura non si riusa (D-54)
    if (a.stato !== 'in_coda' && a.stato !== 'da_controllare') throw new ConflictException('Il file non è più in coda: è già abbinato, scartato o in lettura');
    await tx.documenti_in_arrivo.update({ where: { id: arrivo_id }, data: { stato: 'abbinato', tipo: b.tipo, abbinato_pratica_id: pid, controllato_il: new Date(), utente_id: ctx.utente_id ?? a.utente_id } });
  }
  const d = await tx.ordini_fornitore_documenti.create({
    data: { testata_id: pid, tipo: b.tipo, numero, data: new Date(data), importo, storno_totale, fattura_id, arrivo_id, note: b.note },
  });
  await logEvent(tx, { tipo: 'documento', azione: 'create', entita: 'documento', entita_id: d.id, esito: 'successo', dettaglio: { ...perEvento(d), arrivo_id: arrivo_id ? String(arrivo_id) : null } }, ctx);
  return d;
}

/** Pratica nuova dal primo ordine (D-60): numero OF/AAAA/NNN, AAAA = anno dell'ordine, NNN = il più alto dell'anno + 1.
 *  Il blocco consultivo fa passare una alla volta le pratiche nuove: niente numeri doppi. Cliente e fornitore con la
 *  versione corrente (D-46). Evento crud.create. */
async function nuovaPratica(tx: Tx, b: AbbinaDocumento, ctx: Contesto) {
  if (!b.cliente_id || !b.fornitore_id) throw new BadRequestException('Per aprire una pratica servono cliente e fornitore');
  if (!b.numero || !b.data) throw new BadRequestException('Ordine: numero e data sono obbligatori');
  const fid = BigInt(b.fornitore_id), cid = BigInt(b.cliente_id);
  await tx.$queryRaw`SELECT id FROM fornitori WHERE id = ${fid} FOR UPDATE`;
  const [f, c] = await Promise.all([
    tx.fornitori.findUnique({ where: { id: fid }, select: { versione_corrente_id: true } }),
    tx.clienti.findUnique({ where: { id: cid }, select: { versione_corrente_id: true } }),
  ]);
  if (!f?.versione_corrente_id) throw new BadRequestException('Fornitore non trovato');
  if (!c?.versione_corrente_id) throw new BadRequestException('Cliente non trovato');
  // l'agenzia cliente × fornitore alla data dell'ordine dà il subagente e l'agente (D-60): senza, la pratica non si apre
  const ag = await tx.interscambio.findFirst({
    where: { cliente_id: cid, fornitore_id: fid, valido_dal: { lte: new Date(b.data) }, OR: [{ valido_al: null }, { valido_al: { gt: new Date(b.data) } }] },
    select: { subagente: { select: { agente_id: true } } },
  });
  if (!ag) throw new ConflictException("Il cliente non ha un'agenzia con questo fornitore alla data dell'ordine: aggiungila in Clienti");
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('ordini_fornitore_testata.numero_ordine'))`;
  const anno = b.data.slice(0, 4);
  const [m] = await tx.$queryRaw<{ n: number | null }[]>`
    SELECT max(substring(numero_ordine FROM ${'^OF/' + anno + '/(\\d+)$'})::int) AS n FROM ordini_fornitore_testata WHERE numero_ordine LIKE ${'OF/' + anno + '/%'}`;
  const numero_ordine = `OF/${anno}/${String((m.n ?? 0) + 1).padStart(3, '0')}`;
  const t = await tx.ordini_fornitore_testata.create({ data: {
    fornitore_id: fid, fornitore_versione_id: f.versione_corrente_id, cliente_id: cid, cliente_versione_id: c.versione_corrente_id,
    numero_ordine, data_ordine: new Date(b.data), importo_merce: b.importo ?? null, agente_id: ag.subagente.agente_id,
  } });
  await logEvent(tx, {
    tipo: 'crud', azione: 'create', entita: 'pratica', entita_id: t.id, esito: 'successo',
    dettaglio: { etichetta: numero_ordine, cliente_id: String(cid), fornitore_id: String(fid), ordine: b.numero, data: b.data },
  }, ctx);
  return { fid, pid: t.id };
}

@Controller('documenti')
export class DocumentiAbbinaController {
  constructor(private readonly db: PrismaService) {}

  /** Abbinamento a mano di un file in coda (D-60 §19, §7.9): tipo e pratica li sceglie la persona, anche contro i
   *  suggerimenti della lettura. Un ordine senza pratica apre la pratica; fattura e nota di credito passano dalle
   *  regole di F2-A3. Una transazione; poi il file va nella cartella della pratica. Blocchi: fornitore → pratica → file. */
  @Post(':id/abbina')
  @Richiede('provvigioni.modifica')
  async abbina(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() b: AbbinaDocumento) {
    const ctx = contesto(req);
    const r = await this.db.$transaction(async (tx) => {
      let fid: bigint, pid: bigint;
      if (b.pratica_id) {
        fid = await bloccaFornitore(tx, b.pratica_id);
        pid = BigInt(b.pratica_id);
        await bloccaPratiche(tx, [pid]);
      } else if (b.tipo === 'ordine') {
        ({ fid, pid } = await nuovaPratica(tx, b, ctx));
      } else throw new BadRequestException('Scegli la pratica: solo un ordine apre una pratica nuova');
      const d = await registra(tx, fid, pid, { ...b, arrivo_id: id }, ctx);
      await logEvent(tx, {
        tipo: 'documento', azione: 'match', entita: 'documento', entita_id: d.id, esito: 'successo',
        dettaglio: { etichetta: `${nomeDi(d.tipo)} ${d.numero}`.trim(), documento_id: String(d.id), arrivo_id: String(id), pratica_id: String(pid), tipo: d.tipo, pratica_nuova: !b.pratica_id },
      }, ctx);
      return { documento_id: String(d.id), ...documentiPratica(await aggiornaPratica(tx, pid, ctx, `${nomeDi(d.tipo)} ${d.numero}`.trim())) };
    });
    await archiviaDopo(this.db, BigInt(id));
    return r;
  }
}
