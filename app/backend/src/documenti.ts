import {
  BadRequestException, Body, applyDecorators, ConflictException, Controller, Delete, ForbiddenException, Get, HttpCode, Logger, NotFoundException, Param, ParseIntPipe,
  PayloadTooLargeException, Post, Put, Query, Req, Res, StreamableFile, UnsupportedMediaTypeException, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SkipThrottle } from '@nestjs/throttler';
import { Prisma, type PrismaClient } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve, sep } from 'node:path';
import type { Request, Response } from 'express';
import { permessiDi, Richiede, TentativiGuard, contesto } from './accesso';
import { Data, Facoltativo } from './fornitori';
import { righePagina } from './impostazioni';
import { CON_PRATICA, TIPI_DOCUMENTO, type TipoDocumento, fiscale, giornoRoma, iso, praticaDaDb, type Testata } from './motore/dati';
import { netto, r2 } from './motore/motore';
import { aggiornaPratica } from './pratiche';
import { cerca } from './anagrafica-integra';
import { IntegraService } from './integra';
import { cercaLegame } from './storico';
import { type Controllo, lettoDaCampi, mancaAgenziaRighe, mancaRappresentanzaRighe, propostaDocumento, riconosciClienteDai, valutaLettura, type Contesto as ContestoProposta, type Letto, type RigaStorico } from './proposta';
import { PrismaService } from './prisma.service';
import { type Contesto, apriAnomalia, chiudiAnomalia, logEvent } from './registro';

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

/* ---------- Coda per il lettore (F6-A1, §6.5 punto 2): la userà F6-A2, senza rotte ---------- */

/** Prende il documento più vecchio in coda e lo porta `in_lettura`: prelievo e cambio di stato nella
 *  stessa transazione (V13). `SKIP LOCKED`: più processi leggono insieme, ognuno un file diverso. */
export async function prelevaDocumento(db: PrismaService): Promise<{ id: bigint; file_nome: string; file_percorso: string; tentativi: number } | null> {
  return db.$transaction(async (tx) => {
    const righe = await tx.$queryRaw<{ id: bigint; file_nome: string; file_percorso: string; tentativi: number }[]>`
      SELECT id, file_nome, file_percorso, tentativi FROM documenti_in_arrivo
      WHERE stato = 'in_coda' ORDER BY ricevuto_il, id FOR UPDATE SKIP LOCKED LIMIT 1`;
    const d = righe[0];
    if (!d) return null;
    const tentativi = d.tentativi + 1;
    await tx.documenti_in_arrivo.update({ where: { id: d.id }, data: { stato: 'in_lettura', tentativi } });
    return { id: d.id, file_nome: d.file_nome, file_percorso: d.file_percorso, tentativi };
  });
}

/** Lettura non riuscita (§6.5 punto 2): fino a 3 tentativi torna `in_coda` con l'errore; al terzo
 *  porta `errore`, scrive l'evento e apre `lettura.fallita`. Se la riga non è `in_lettura` non si
 *  tocca (un'altra richiesta l'ha già presa). Ritorna lo stato finale. */
export async function letturaFallita(db: PrismaService, id: bigint, errore: string): Promise<string> {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM documenti_in_arrivo WHERE id = ${id} FOR UPDATE`;
    const riga = await tx.documenti_in_arrivo.findUnique({ where: { id } });
    if (!riga || riga.stato !== 'in_lettura') return riga?.stato ?? ''; // non in lettura: non si tocca
    const errorePulito = errore.replace(/\s+/g, ' ').slice(0, 300);
    if (riga.tentativi >= 3) {
      await tx.documenti_in_arrivo.update({ where: { id }, data: { stato: 'errore', errore: errorePulito } });
      await logEvent(tx, {
        tipo: 'documento', azione: 'upload', entita: 'documento', entita_id: id, esito: 'errore',
        dettaglio: { etichetta: riga.file_nome, documento_id: String(id), file_nome: riga.file_nome, tentativi: riga.tentativi, errore: errorePulito },
      }, {});
      await apriAnomalia(tx, {
        servizio: 'lettura', codice: 'lettura.fallita', chiave: String(id),
        messaggio: `Il documento ${riga.file_nome} non si legge dopo 3 tentativi: aprirlo in Documenti e inserire i dati a mano, o scartarlo.`,
        dettaglio: { documento_id: String(id), errore: errorePulito },
      });
      return 'errore';
    }
    await tx.documenti_in_arrivo.update({ where: { id }, data: { stato: 'in_coda', errore: errorePulito } });
    return 'in_coda';
  });
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

/* ---------- Pagina Documenti (F6-A4a, §7.9, §8.1, D-72) ---------- */

const STATI_ELENCO = ['da_controllare', 'in_coda', 'in_lettura', 'errore'] as const;
const TIPI_ARRIVO = [...TIPI_DOCUMENTO, 'bollettino'] as const;
const MOTIVI_SCARTO = ['Doppione', 'Non riguarda Decobrands', 'Documento illeggibile', 'Altro'] as const;

class ElencoDocumenti {
  @IsOptional() @IsIn(STATI_ELENCO) stato?: (typeof STATI_ELENCO)[number];
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @IsIn(TIPI_ARRIVO) tipo?: (typeof TIPI_ARRIVO)[number];
  @IsOptional() @IsIn(['affidabile', 'da_controllare', 'bassa']) livello?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pagina?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) per_pagina?: number;
}

class ScartaDocumento {
  @IsIn(MOTIVI_SCARTO as unknown as string[]) motivo!: string;
  @IsOptional() @IsString() @MaxLength(2000) nota?: string;
}

/** Correzione dei dati letti: testata e righe arrivano come oggetti, validati qui campo per campo
 *  (le righe con `i` conservano i metadati, quelle senza sono nuove). */
interface CorrezioneLettura {
  testata: Record<string, unknown>;
  righe: Record<string, unknown>[];
  verificati?: string[]; // campi confermati con il ✓ (F6-A4b): restano verificati anche se il valore non cambia
}

type DbLetto = Prisma.TransactionClient | PrismaClient;

/** Tipo del file dall'estensione salvata (D-60): per la pagina, che sceglie PDF o immagine. */
const fileTipo = (percorso: string) => {
  const p = percorso.toLowerCase();
  return p.endsWith('.jpg') || p.endsWith('.jpeg') ? 'jpg' : p.endsWith('.png') ? 'png' : 'pdf';
};

const controlliFalliti = (v: unknown): number => {
  const f = (v as { falliti?: unknown[] } | null)?.falliti;
  return Array.isArray(f) ? f.length : 0;
};

/** Pool e schema del ponte di Integra (D-111): null se la sincronizzazione non è configurata. */
type Ponte = NonNullable<Awaited<ReturnType<IntegraService['ponte']>>>;

/** Una riga dello storico ridotta ai campi della proposta (D-112). `sconto` = `sconto_1` del vecchio CRM. */
const rigaStorico = (r: { cliente_codice_fornitore: string | null; cliente_ragione_sociale: string | null; cliente_piva: string | null; subagente_nome: string | null; sconto_1: Prisma.Decimal }): RigaStorico => ({
  cliente_codice_fornitore: r.cliente_codice_fornitore,
  cliente_ragione_sociale: r.cliente_ragione_sociale,
  cliente_piva: r.cliente_piva,
  subagente_nome: r.subagente_nome,
  sconto: Number(r.sconto_1),
  rappresentato: !!r.subagente_nome, // D-112: falso = fornitore senza rappresentanza
});

/** Contesto della proposta (D-111/D-112): candidati di Integra e righe dello storico per un documento.
 *  Il ponte si tocca solo se serve (fornitore o cliente non riconosciuti) e una ricerca per tipo; senza
 *  ponte si prosegue senza candidati e l'esito resta quello di oggi. */
async function contestoDocumento(db: DbLetto, ponte: Ponte | null, letto: Letto, fornitoreNome: string | null): Promise<ContestoProposta> {
  const c: ContestoProposta = {};
  if (letto.fornitore_id == null) {
    // D-111: fornitore non riconosciuto → ricerca mirata sul nome letto
    if (ponte && fornitoreNome) {
      const r = await cerca(db as PrismaService, ponte.pool, ponte.schema, 'fornitore', fornitoreNome);
      if (!('errore' in r)) c.fornitore_su_integra = r.righe;
    }
    return c;
  }
  // D-112: fornitore riconosciuto → storico della coppia (per codice del fornitore) e candidati cliente
  const storico = await cercaLegame(db, { fornitoreId: letto.fornitore_id, codice: letto.codice_cliente ?? null });
  c.storico = storico.map(rigaStorico);
  if (ponte) {
    const q = (letto.codice_cliente || letto.piva_cliente || letto.cliente || '').trim();
    if (q) {
      const r = await cerca(db as PrismaService, ponte.pool, ponte.schema, 'cliente', q);
      if (!('errore' in r)) c.cliente_su_integra = r.righe;
    }
  }
  return c;
}

/** D-111/D-112: per la lista, i documenti con fornitore o cliente da importare. Una ricerca di Integra
 *  per chiave distinta e una query di storico, mai per riga (V12). `fornitore` = fornitore non in
 *  anagrafica con una sola riga in Integra; `cliente` = fornitore riconosciuto e cliente non riconosciuto
 *  con la coppia nello storico (con subagente) o una sola riga in Integra. */
async function esitiImportazione(
  db: PrismaService,
  ponte: Ponte | null,
  righe: { id: bigint; fornitore_id: bigint | null; fornitore_letto: string | null; codice_cliente: string | null; cliente: string | null; piva_cliente: string | null }[],
): Promise<{ fornitore: Set<bigint>; cliente: Set<bigint> }> {
  const fornitore = new Set<bigint>();
  const cliente = new Set<bigint>();

  if (ponte) {
    // fornitore non riconosciuto → una ricerca per nome distinto (di norma una per pagina)
    const senzaFornitore = righe.filter((r) => r.fornitore_id == null && r.fornitore_letto);
    for (const nome of new Set(senzaFornitore.map((r) => r.fornitore_letto!))) {
      const r = await cerca(db, ponte.pool, ponte.schema, 'fornitore', nome);
      if (!('errore' in r) && r.righe.length === 1) {
        for (const d of senzaFornitore) if (d.fornitore_letto === nome) fornitore.add(d.id);
      }
    }
  }

  const conFornitore = righe.filter((r) => r.fornitore_id != null);
  if (!conFornitore.length) return { fornitore, cliente };
  const clienti = await db.clienti.findMany({ where: { versione_corrente_id: { not: null } }, include: { corrente: true } });
  const fornitori = [...new Set(conFornitore.map((r) => r.fornitore_id!))];
  const interscambi = await db.interscambio.findMany({
    where: { fornitore_id: { in: fornitori } },
    select: { cliente_id: true, fornitore_id: true, codice_cliente_fornitore: true },
  });
  // D-112: coppia con subagente nello storico → proposta di import (subagente + sconto)
  const storici = await db.interscambio_storico.findMany({
    where: { subagente_nome: { not: null } },
    select: { fornitore_id: true, cliente_codice_fornitore: true },
  });
  const storicoCon = new Set(storici.filter((s) => s.fornitore_id != null).map((s) => `${s.fornitore_id}|${(s.cliente_codice_fornitore ?? '').toLowerCase()}`));
  const daCercare = new Map<string, bigint[]>(); // q Integra → documenti con quella chiave
  for (const r of conFornitore) {
    const f = r.fornitore_id!;
    const perCodice = r.codice_cliente
      ? interscambi.some((a) => a.fornitore_id === f && (a.codice_cliente_fornitore ?? '').toLowerCase() === r.codice_cliente!.toLowerCase())
      : false;
    if (perCodice || riconosciClienteDai(clienti as Parameters<typeof riconosciClienteDai>[0], r.piva_cliente, r.cliente)) continue; // cliente riconosciuto
    if (storicoCon.has(`${f}|${(r.codice_cliente ?? '').toLowerCase()}`)) { cliente.add(r.id); continue; }
    const q = (r.codice_cliente || r.piva_cliente || r.cliente || '').trim();
    if (q) daCercare.set(q, [...(daCercare.get(q) ?? []), r.id]);
  }
  if (ponte) {
    for (const [q, ids] of daCercare) {
      const r = await cerca(db, ponte.pool, ponte.schema, 'cliente', q);
      if (!('errore' in r) && r.righe.length === 1) for (const id of ids) cliente.add(id);
    }
  }
  return { fornitore, cliente };
}

/** Dettaglio per la pagina (§7.9): testata e righe dai valori finali, campi grezzi per i bordi
 *  di affidabilità, proposta ricalcolata. Una sola lettura dei campi per proposta e testata. */
async function dettaglioDocumento(db: DbLetto, id: bigint, ponte: Ponte | null = null) {
  const d = await db.documenti_in_arrivo.findUnique({
    where: { id }, include: { fornitore: true, campi: { orderBy: { id: 'asc' } } },
  });
  if (!d) throw new NotFoundException('Documento non trovato');
  const letto = await lettoDaCampi(db, id);
  // il nome letto del fornitore è un campo grezzo (§6.5): serve solo a cercare su Integra (D-111)
  const campoFornitore = d.campi.find((c) => c.campo === 'fornitore');
  const fornitoreNome = (campoFornitore?.valore_finale ?? campoFornitore?.valore_letto ?? null);
  const p = await propostaDocumento(db, letto, await contestoDocumento(db, ponte, letto, fornitoreNome));
  // il cliente dell'abbinamento è un BigInt: nella risposta va come stringa (come gli altri id)
  const proposta = {
    ...p,
    abbinamento: p.abbinamento ? { ...p.abbinamento, cliente_id: String(p.abbinamento.cliente_id) } : null,
    cliente_riconosciuto: p.cliente_riconosciuto ? { ...p.cliente_riconosciuto, cliente_id: String(p.cliente_riconosciuto.cliente_id) } : null,
    agenzia_mancante: p.agenzia_mancante ? { ...p.agenzia_mancante, cliente_id: String(p.agenzia_mancante.cliente_id), fornitore_id: String(p.agenzia_mancante.fornitore_id) } : null,
  };
  const controlli = (d.controlli as { falliti?: Controllo[] } | null)?.falliti ?? [];
  // solo il bollettino ha un omonimo da cercare (D-71): «esiste» dice se è già registrato
  const bollettino = letto.tipo === 'bollettino'
    ? {
      esiste: letto.fornitore_id != null && letto.mese != null && letto.anno != null
        && !!(await db.bollettini_testata.findFirst({
          where: { fornitore_id: letto.fornitore_id, mese: letto.mese, anno: letto.anno }, select: { id: true },
        })),
    }
    : null;
  // D-113: un fornitore riconosciuto senza scaglioni → la card lo dice (non blocca il giro)
  const scaglioni_mancanti = letto.fornitore_id != null
    ? !(await db.provvigioni_scaglioni.findFirst({ where: { fornitore_id: letto.fornitore_id }, select: { id: true } }))
    : false;
  return {
    id: String(d.id), file_nome: d.file_nome, file_tipo: fileTipo(d.file_percorso), stato: d.stato,
    tipo: d.tipo, livello: d.livello, ricevuto_il: d.ricevuto_il.toISOString(),
    letto_il: d.letto_il?.toISOString() ?? null, errore: d.errore, scaglioni_mancanti,
    fornitore: letto.fornitore_id != null ? { id: String(letto.fornitore_id), nome: d.fornitore?.ragione_sociale ?? null } : null,
    campi: d.campi.map((c) => ({
      campo: c.campo, valore_letto: c.valore_letto, valore_finale: c.valore_finale,
      affidabilita: c.affidabilita == null ? null : Number(c.affidabilita),
      posizione: c.posizione, precisione: c.precisione, verificato: c.verificato,
    })),
    testata: {
      tipo: letto.tipo, numero: letto.numero, data: letto.data,
      fornitore_id: letto.fornitore_id != null ? String(letto.fornitore_id) : null,
      codice_cliente: letto.codice_cliente, cliente: letto.cliente, importo: letto.importo,
      mese: letto.mese, anno: letto.anno, riferimento_fattura: letto.riferimento_fattura,
    },
    righe: letto.righe.map((r, i) => ({ i, ...r })),
    controlli, proposta, bollettino,
  };
}

/* ---------- Valori della correzione (V12: il server valida e scrive) ---------- */
const testoO = (v: unknown): string | null => {
  if (v == null) return null;
  const t = String(v).trim();
  return t ? t : null;
};
const dataBuona = (t: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return false;
  const d = new Date(t + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === t;
};
/** Testo normalizzato di un campo, con il 400 che dice il campo (mai il valore). */
const valoreCampo = (v: unknown, campo: string, tipo: 'testo' | 'data' | 'numero' | 'intero'): string | null => {
  const t = testoO(v);
  if (t == null) return null;
  if (tipo === 'testo') return t;
  if (tipo === 'data') {
    if (!dataBuona(t)) throw new BadRequestException(`Data non valida per ${campo}`);
    return t;
  }
  const n = Number(t.replace(',', '.'));
  if (!Number.isFinite(n) || (tipo === 'intero' && !Number.isInteger(n))) throw new BadRequestException(`Valore non valido per ${campo}`);
  if (campo === 'mese' && (n < 1 || n > 12)) throw new BadRequestException('Mese non valido: da 1 a 12');
  if (campo === 'anno' && (n < 1900 || n > 2200)) throw new BadRequestException('Anno non valido');
  return String(n);
};
const diverso = (tipo: string, letto: string | null, nuovo: string) => {
  if (letto == null) return true;
  // il letto può avere la virgola decimale: si confrontano i numeri, non il testo
  return tipo === 'numero' || tipo === 'intero'
    ? Number(letto.replace(',', '.')) !== Number(nuovo)
    : letto !== nuovo;
};

/** I campi della testata: nome nell'API → nome in documenti_campi (l'importo è `importo_totale`). */
const TESTATA_CAMPI: Record<string, { campo: string; tipo: 'testo' | 'data' | 'numero' | 'intero' }> = {
  numero: { campo: 'numero', tipo: 'testo' },
  data: { campo: 'data', tipo: 'data' },
  codice_cliente: { campo: 'codice_cliente', tipo: 'testo' },
  cliente: { campo: 'cliente', tipo: 'testo' },
  importo: { campo: 'importo_totale', tipo: 'numero' },
  mese: { campo: 'mese', tipo: 'intero' },
  anno: { campo: 'anno', tipo: 'intero' },
  riferimento_fattura: { campo: 'riferimento_fattura', tipo: 'testo' },
};
const RIGA_CAMPI: Record<string, 'testo' | 'data' | 'numero'> = {
  codice: 'testo', descrizione: 'testo', quantita: 'numero', prezzo: 'numero', importo: 'numero',
  numero_fattura: 'testo', data_fattura: 'data', provvigione: 'numero',
};

@Controller('documenti')
export class DocumentiController {
  constructor(private readonly db: PrismaService, private readonly integra: IntegraService) {}

  /** Elenco dei documenti in ingresso (F6-A4a, §7.9, §8.1): segmenti di stato con i conteggi degli
   *  altri filtri (D-23), ricerca e pagine sul server. Testata e righe stanno in `documenti_campi`
   *  (valori finali quando ci sono); niente proposta qui, è costosa: la pagina mostra tipo, numero,
   *  fornitore, importo e livello. */
  @Get()
  @Richiede('provvigioni.consulta')
  async elenco(@Query() q: ElencoDocumenti) {
    const stato = q.stato ?? 'da_controllare';
    const perPagina = q.per_pagina ?? await righePagina(this.db);
    const pagina = q.pagina ?? 1;
    const testo = (q.q ?? '').trim();
    const simile = '%' + testo.replace(/[\\%_]/g, '\\$&') + '%'; // % e _ sono lettere, non jolly
    const tipo = q.tipo ?? '';
    const livello = q.livello ?? '';
    // una sola sottoquery dei campi per pagina (niente N+1): finale se c'è, altrimenti letto
    const campi = Prisma.sql`campi AS (
      SELECT documento_id,
        MAX(CASE WHEN campo = 'numero' THEN COALESCE(valore_finale, valore_letto) END) AS numero,
        MAX(CASE WHEN campo = 'data' THEN COALESCE(valore_finale, valore_letto) END) AS data,
        MAX(CASE WHEN campo = 'codice_cliente' THEN COALESCE(valore_finale, valore_letto) END) AS codice_cliente,
        MAX(CASE WHEN campo = 'cliente' THEN COALESCE(valore_finale, valore_letto) END) AS cliente,
        MAX(CASE WHEN campo = 'importo_totale' THEN COALESCE(valore_finale, valore_letto) END) AS importo,
        MAX(CASE WHEN campo = 'piva_cliente' THEN COALESCE(valore_finale, valore_letto) END) AS piva_cliente,
        MAX(CASE WHEN campo = 'fornitore' THEN COALESCE(valore_finale, valore_letto) END) AS fornitore_letto
      FROM documenti_campi GROUP BY documento_id
    )`;
    const altro = Prisma.sql`
      (${testo} = '' OR COALESCE(c.numero, '') ILIKE ${simile} OR d.file_nome ILIKE ${simile}
        OR COALESCE(fv.ragione_sociale, '') ILIKE ${simile} OR COALESCE(c.cliente, '') ILIKE ${simile})
      AND (${tipo} = '' OR d.tipo = ${tipo})
      AND (${livello} = '' OR d.livello = ${livello})`;
    const righe = await this.db.$queryRaw<{
      id: bigint; file_nome: string; file_percorso: string; tipo: string | null; fornitore_id: bigint | null;
      fornitore: string | null; numero: string | null; data: string | null; codice_cliente: string | null;
      cliente: string | null; piva_cliente: string | null; fornitore_letto: string | null; importo: string | null; livello: string | null; ricevuto_il: Date;
      letto_il: Date | null; controlli: Prisma.JsonValue | null;
    }[]>`
      WITH ${campi}
      SELECT d.id, d.file_nome, d.file_percorso, d.tipo, d.fornitore_id, fv.ragione_sociale AS fornitore,
             c.numero, c.data, c.codice_cliente, c.cliente, c.piva_cliente, c.fornitore_letto, c.importo, d.livello, d.ricevuto_il, d.letto_il, d.controlli
      FROM documenti_in_arrivo d
      LEFT JOIN campi c ON c.documento_id = d.id
      LEFT JOIN fornitori_versioni fv ON fv.fornitore_id = d.fornitore_id AND fv.id = d.fornitore_versione_id
      WHERE d.stato = ${stato} AND ${altro}
      ORDER BY d.ricevuto_il DESC, d.id DESC
      LIMIT ${perPagina} OFFSET ${(pagina - 1) * perPagina}`;
    const conti = await this.db.$queryRaw<{ stato: string; n: bigint }[]>`
      WITH ${campi}
      SELECT d.stato, count(*) AS n
      FROM documenti_in_arrivo d
      LEFT JOIN campi c ON c.documento_id = d.id
      LEFT JOIN fornitori_versioni fv ON fv.fornitore_id = d.fornitore_id AND fv.id = d.fornitore_versione_id
      WHERE ${altro}
      GROUP BY d.stato`;
    const conteggi: Record<(typeof STATI_ELENCO)[number], number> = { da_controllare: 0, in_coda: 0, in_lettura: 0, errore: 0 };
    for (const c of conti) if (c.stato in conteggi) conteggi[c.stato as keyof typeof conteggi] = Number(c.n);
    // D-106: manca_agenzia con la stessa risoluzione della proposta, una query per pagina (V12)
    const manca = await mancaAgenziaRighe(this.db, righe);
    // D-112: la coppia senza subagente nello storico → «Non rappresentato» invece di «Manca l'agenzia»
    const nonRappresentata = await mancaRappresentanzaRighe(this.db, righe, manca);
    // D-111: candidati di Integra per fornitore o cliente non riconosciuti, una ricerca per chiave per pagina
    const importa = await esitiImportazione(this.db, await this.integra.ponte(), righe);
    return {
      documenti: righe.map((r) => ({
        id: String(r.id), file_nome: r.file_nome, file_tipo: fileTipo(r.file_percorso), tipo: r.tipo,
        numero: r.numero, data: r.data, fornitore_id: r.fornitore_id != null ? String(r.fornitore_id) : null,
        fornitore: r.fornitore, codice_cliente: r.codice_cliente, cliente: r.cliente,
        importo: r.importo == null ? null : Number(r.importo), livello: r.livello,
        ricevuto_il: r.ricevuto_il.toISOString(), letto_il: r.letto_il?.toISOString() ?? null,
        controlli_n: controlliFalliti(r.controlli),
        manca_agenzia: manca.has(r.id) && !nonRappresentata.has(r.id),
        manca_rappresentanza: nonRappresentata.has(r.id),
        fornitore_da_integra: importa.fornitore.has(r.id),
        cliente_da_integra: importa.cliente.has(r.id),
      })),
      conteggi, totale: conteggi[stato], pagina, per_pagina: perPagina,
    };
  }

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

  /** Caricamento manuale (§8.1): multipart, campo `file`, un PDF o una foto (D-60). Va in coda "da leggere".
   *  Tetto dedicato per utente (TENTATIVI_CARICAMENTI): persona e ip qui non valgono (§3.3, D-41). */
  @Post('carica')
  @Richiede('provvigioni.modifica')
  @UseGuards(TentativiGuard)
  @SkipThrottle({ persona: true, ip: true })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_BYTE, files: 1 } }))
  async carica(@Req() req: Request, @UploadedFile() file?: { originalname: string; buffer: Buffer }) {
    if (!file) throw new BadRequestException('Manca il file');
    return riceviDocumento(this.db, { nome: file.originalname, dati: file.buffer, origine: 'caricamento' }, contesto(req));
  }

  /** Il file originale di un documento arrivato (F2-A3, §8.1): PDF o foto. Il percorso viene solo dal database
   *  (D-60), mai dal browser; la risposta è in linea e chiusa in una sandbox. */
  @Get(':id/file')
  @Richiede('provvigioni.consulta')
  async file(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Res({ passthrough: true }) res: Response) {
    const d = await this.db.documenti_in_arrivo.findUnique({ where: { id: BigInt(id) }, select: { file_percorso: true, file_nome: true, stato: true } });
    if (!d) throw new NotFoundException('Documento non trovato');
    // uno scartato si vede solo con il permesso provvigioni.scartati, non con la sola consulta (§7.16)
    if (d.stato === 'scartato' && !permessiDi(req.utente!.ruolo, req.livelli ?? {}).includes('provvigioni.scartati')) throw new ForbiddenException();
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

  /** Dettaglio del documento (F6-A4a, §7.9, §8.1): dati letti con affidabilità e posizioni,
   *  testata e righe dai valori finali, proposta di abbinamento ricalcolata. */
  @Get(':id')
  @Richiede('provvigioni.consulta')
  async dettaglio(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    const did = BigInt(id);
    const d = await this.db.documenti_in_arrivo.findUnique({ where: { id: did }, select: { stato: true } });
    if (!d) throw new NotFoundException('Documento non trovato');
    // uno scartato si apre solo con il permesso provvigioni.scartati, non con la sola consulta (§7.16)
    if (d.stato === 'scartato' && !permessiDi(req.utente!.ruolo, req.livelli ?? {}).includes('provvigioni.scartati')) throw new ForbiddenException();
    return dettaglioDocumento(this.db, did, await this.integra.ponte());
  }

  /** Correzione dei dati letti (F6-A4a, §6.5 punto 7, D-72). Una transazione con la riga bloccata
   *  (V13): testata e righe riscritte nei campi, tutto verificato, livello e controlli ricalcolati
   *  dai valori finali. `i` = riga originale (metadati conservati), `null` = riga nuova. */
  @Put(':id')
  @Richiede('provvigioni.modifica')
  async correggi(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() b: CorrezioneLettura) {
    const ctx = contesto(req);
    const did = BigInt(id);
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM documenti_in_arrivo WHERE id = ${did} FOR UPDATE`;
      const d = await tx.documenti_in_arrivo.findUnique({ where: { id: did } });
      if (!d) throw new NotFoundException('Documento non trovato');
      if (d.stato !== 'da_controllare') throw new ConflictException('Il documento non è più da controllare');

      const testata = b.testata ?? {};
      const righeInput = Array.isArray(b.righe) ? b.righe : [];
      // campi confermati con il ✓: si segnano verificati anche se il valore resta quello letto
      const confermati = new Set((Array.isArray(b.verificati) ? b.verificati : []).filter((x): x is string => typeof x === 'string'));
      const tipo = valoreCampo(testata.tipo, 'tipo', 'testo');
      if (!tipo || !TIPI_ARRIVO.includes(tipo as (typeof TIPI_ARRIVO)[number])) {
        throw new BadRequestException('Tipo del documento non valido');
      }

      // fornitore con la versione corrente (D-46); null svuota i due campi insieme
      let fornitore_id: bigint | null = d.fornitore_id;
      let fornitore_versione_id: bigint | null = d.fornitore_versione_id;
      if ('fornitore_id' in testata) {
        const f = testoO(testata.fornitore_id);
        if (f == null) {
          fornitore_id = null;
          fornitore_versione_id = null;
        } else {
          const n = Number(f);
          if (!Number.isInteger(n) || n < 1) throw new BadRequestException('Fornitore non valido');
          const fornitore = await tx.fornitori.findUnique({ where: { id: BigInt(f) }, select: { versione_corrente_id: true } });
          if (!fornitore?.versione_corrente_id) throw new BadRequestException('Fornitore non valido');
          fornitore_id = BigInt(f);
          fornitore_versione_id = fornitore.versione_corrente_id;
        }
      }

      const campiGia = await tx.documenti_campi.findMany({ where: { documento_id: did } });
      const giaPerCampo = new Map(campiGia.map((c) => [c.campo, c]));
      const ora = new Date();
      let corretti = 0;

      // testata: aggiorna o crea; un valore vuoto toglie il campo
      for (const [chiave, def] of Object.entries(TESTATA_CAMPI)) {
        if (!(chiave in testata)) continue;
        const valore = valoreCampo(testata[chiave], chiave, def.tipo);
        const gia = giaPerCampo.get(def.campo);
        if (valore == null) {
          if (gia) await tx.documenti_campi.delete({ where: { id: gia.id } });
          continue;
        }
        const cambiato = diverso(def.tipo, gia?.valore_letto ?? null, valore);
        if (cambiato) corretti++;
        if (gia) {
          await tx.documenti_campi.update({
            where: { id: gia.id },
            data: {
              valore_finale: valore,
              verificato: cambiato || confermati.has(def.campo) || gia.verificato,
              corretto_da: ctx.utente_id ?? null, corretto_il: ora,
            },
          });
        } else {
          await tx.documenti_campi.create({
            data: {
              documento_id: did, campo: def.campo, valore_letto: null, valore_finale: valore,
              affidabilita: null, posizione: Prisma.DbNull, precisione: 'assente', verificato: true,
              corretto_da: ctx.utente_id ?? null, corretto_il: ora,
            },
          });
        }
      }

      // righe: elimina le vecchie, ricrea nell'ordine ricevuto (numerazione 0..n-1);
      // la riga con lo stesso `i` porta con sé valore letto, affidabilità, posizione e precisione
      const giaPerRiga = new Map<number, Map<string, (typeof campiGia)[number]>>();
      for (const c of campiGia) {
        const m = /^righe\[(\d+)\]\.(.+)$/.exec(c.campo);
        if (!m) continue;
        const ri = Number(m[1]);
        if (!giaPerRiga.has(ri)) giaPerRiga.set(ri, new Map());
        giaPerRiga.get(ri)!.set(m[2], c);
      }
      await tx.documenti_campi.deleteMany({ where: { documento_id: did, campo: { startsWith: 'righe[' } } });
      const nuove: Prisma.documenti_campiCreateManyInput[] = [];
      righeInput.forEach((r, j) => {
        let i: number | null = null;
        if (r.i != null && r.i !== '') {
          const n = Number(r.i);
          if (!Number.isInteger(n) || n < 0) throw new BadRequestException('Indice di riga non valido');
          i = n;
        }
        const origine = i == null ? undefined : giaPerRiga.get(i);
        const rigaNuova = i == null;
        if (rigaNuova) corretti++; // una riga aggiunta conta come una correzione
        for (const [chiave, tipoCampo] of Object.entries(RIGA_CAMPI)) {
          if (!(chiave in r)) continue;
          const valore = valoreCampo(r[chiave], `righe[${j}].${chiave}`, tipoCampo);
          if (valore == null) continue;
          const gia = origine?.get(chiave);
          const cambiato = !rigaNuova && diverso(tipoCampo, gia?.valore_letto ?? null, valore);
          if (cambiato) corretti++;
          const confermato = i != null && confermati.has(`righe[${i}].${chiave}`);
          nuove.push({
            documento_id: did, campo: `righe[${j}].${chiave}`,
            valore_letto: gia?.valore_letto ?? null, valore_finale: valore,
            affidabilita: gia?.affidabilita ?? null,
            posizione: gia?.posizione != null ? (gia.posizione as Prisma.InputJsonValue) : Prisma.DbNull,
            precisione: gia?.precisione ?? 'assente',
            verificato: rigaNuova || cambiato || confermato || !!gia?.verificato,
            corretto_da: ctx.utente_id ?? null, corretto_il: ora,
          });
        }
      });
      if (nuove.length) await tx.documenti_campi.createMany({ data: nuove });

      const livelloPrima = d.livello;
      await tx.documenti_in_arrivo.update({
        where: { id: did },
        data: { tipo, fornitore_id, fornitore_versione_id, errore: null },
      });
      const val = await valutaLettura(tx, did);
      await tx.documenti_in_arrivo.update({
        where: { id: did },
        data: { livello: val.livello, controlli: { falliti: val.controlli } as unknown as Prisma.InputJsonValue },
      });
      await logEvent(tx, {
        tipo: 'documento', azione: 'update', entita: 'documento', entita_id: did, esito: 'successo',
        dettaglio: {
          etichetta: d.file_nome, documento_id: String(did), pratica_id: null,
          campi_corretti: corretti, livello_prima: livelloPrima, livello_dopo: val.livello,
          prima: { livello: livelloPrima }, dopo: { livello: val.livello },
        },
      }, ctx);
      return dettaglioDocumento(tx, did);
    });
  }

  /** Scarto del documento (F6-A4a, §7.9, D-72): il file resta sul disco (la conservazione è F5-A7);
   *  si scarta da `da_controllare`, `errore` o `in_coda`, non se è già abbinato o in lettura. */
  @Post(':id/scarta')
  @HttpCode(204)
  @Richiede('provvigioni.modifica')
  async scarta(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() b: ScartaDocumento) {
    const ctx = contesto(req);
    const did = BigInt(id);
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM documenti_in_arrivo WHERE id = ${did} FOR UPDATE`;
      const d = await tx.documenti_in_arrivo.findUnique({ where: { id: did } });
      if (!d) throw new NotFoundException('Documento non trovato');
      if (!['da_controllare', 'errore', 'in_coda'].includes(d.stato)) {
        throw new ConflictException('Il documento è già abbinato, scartato o in lettura');
      }
      // il PDF di un bollettino non si scarta: la pulizia degli scartati cancellerebbe il suo file (D-74)
      if (d.abbinato_bollettino_id) throw new ConflictException('Il file è il PDF di un bollettino');
      const nota = b.nota?.trim() || null;
      await tx.documenti_in_arrivo.update({
        where: { id: did },
        data: { stato: 'scartato', scartato_il: new Date(), scartato_da: ctx.utente_id ?? null, motivo_scarto: b.motivo, nota_scarto: nota },
      });
      // il catalogo §15.2.4 non ha un codice per lo scarto: si usa documento/update (D-72)
      await logEvent(tx, {
        tipo: 'documento', azione: 'update', entita: 'documento', entita_id: did, esito: 'successo',
        dettaglio: {
          etichetta: d.file_nome, documento_id: String(did), stato: 'scartato', motivo: b.motivo, nota,
          pratica_id: null, prima: { stato: d.stato }, dopo: { stato: 'scartato' },
        },
      }, ctx);
      // §7.14.3: l'anomalia della lettura si chiude quando il documento è scartato
      await chiudiAnomalia(tx, 'lettura', 'lettura.fallita', String(did));
    });
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

/** Correzione della quota del subagente su un documento (§4.2.7.2, D-27): il browser manda solo tipo,
 *  valore e motivo; il server ricontrolla, ricalcola e scrive (V12). Una correzione per documento. */
class Correzione {
  @IsIn(['pct', 'importo', 'nessuna']) tipo!: 'pct' | 'importo' | 'nessuna';
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) valore?: number;
  @Testo() @IsString() @IsNotEmpty() @MaxLength(2000) motivo!: string;
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
    where: { id: BigInt(did) }, include: { correzione: { select: { id: true } }, _count: { select: { righe_bollettino: true, note_credito: true, attese_bollettino: true } } },
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
  // la decisione su un documento mancante (D-56) sta nel bollettino: cancellarla con il documento la perderebbe (A3-03)
  if (d._count.attese_bollettino) throw new ConflictException(`${quale} ha una decisione in un bollettino: ${cosa}`);
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
  // righe per documento: servono al confronto affiancato della pagina pratica (§7.3)
  const righeDi = (d: { id: bigint }) => t.righe.filter((r) => r.documento_id === d.id).map((r) => ({
    codice: r.codice, descrizione: r.descrizione,
    quantita: r.quantita == null ? null : Number(r.quantita),
    prezzo: r.prezzo_unitario == null ? null : Number(r.prezzo_unitario),
    importo: r.importo == null ? null : Number(r.importo),
  }));
  const riferimento = (d: { fattura_id: bigint | null }) =>
    d.fattura_id ? (t.documenti.find((x) => x.id === d.fattura_id)?.numero ?? null) : null;
  return {
    pratica: { id: String(t.id), numero: t.numero_ordine, stato: t.stato, importo: Number(t.importo) },
    // D-60: ordini, conferme, proforma, pagamenti e altri, solo tracciati
    altri: t.documenti.filter((d) => !fiscale(d.tipo)).map((d) => ({
      id: String(d.id), tipo: d.tipo, numero: d.numero, data: iso(d.data), importo: Number(d.importo),
      arrivo_id: d.arrivo_id ? String(d.arrivo_id) : null, file_nome: d.arrivo?.file_nome ?? null, note: d.note,
      righe: righeDi(d), riferimento: riferimento(d),
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
        righe: righeDi(d), riferimento: riferimento(d),
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
      await richiediAgenzia(tx, nid, iso(d.data)); // D-106: anche spostandolo serve l'agenzia alla data
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

/** D-106: il documento entra in pratica solo se il cliente ha un'agenzia valida col fornitore alla data
 *  del documento (una regola, non un pulsante). Stessa condizione di `nuovaPratica`. */
async function richiediAgenzia(tx: Tx, pid: bigint, data: string) {
  const t = await tx.ordini_fornitore_testata.findUnique({ where: { id: pid }, select: { cliente_id: true, fornitore_id: true } });
  if (!t) throw new NotFoundException('Pratica non trovata');
  const ag = await tx.interscambio.findFirst({
    where: { cliente_id: t.cliente_id, fornitore_id: t.fornitore_id, valido_dal: { lte: new Date(data) }, OR: [{ valido_al: null }, { valido_al: { gt: new Date(data) } }] },
    select: { id: true },
  });
  if (!ag) throw new ConflictException("Il cliente non ha un'agenzia con questo fornitore alla data del documento: aggiungila in Clienti o dal documento");
}

/** Registra un documento nella pratica già bloccata (D-60 §19): un posto solo per la registrazione a mano e
 *  l'abbinamento di un file in coda. Fattura e nota di credito con le regole di F2-A3 (numero unico, importo, storno);
 *  l'ordine con numero unico per fornitore; gli altri tipi solo tracciati. Evento documento.create. */
async function registra(tx: Tx, fid: bigint, pid: bigint, b: NuovoDocumento, ctx: Contesto) {
  if ((fiscale(b.tipo) || b.tipo === 'ordine') && (!b.numero || !b.data)) throw new BadRequestException(`${nomeDi(b.tipo)}: numero e data sono obbligatori`);
  if (b.tipo !== 'nota_credito' && b.fattura_id) throw new BadRequestException('Solo la nota di credito storna una fattura');
  const numero = b.numero ?? '', data = b.data ?? giornoRoma(new Date());
  await richiediAgenzia(tx, pid, data); // D-106
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
    // il PDF di un bollettino resta suo: non diventa anche il documento di una pratica (D-54, D-74)
    if (a.abbinato_bollettino_id) throw new ConflictException('Il file è il PDF di un bollettino');
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
    select: { sconto: true, subagente: { select: { agente_id: true } } },
  });
  if (!ag) throw new ConflictException("Il cliente non ha un'agenzia con questo fornitore alla data dell'ordine: aggiungila in Clienti");
  // D-87: serve anche lo scaglione del fornitore per lo sconto dell'agenzia, altrimenti la provvigione sarebbe 0% in silenzio
  const sc = await tx.provvigioni_scaglioni.findFirst({
    where: { fornitore_id: fid, sconto_min: { lte: ag.sconto }, valido_dal: { lte: new Date(b.data) } },
    select: { id: true },
  });
  if (!sc) throw new ConflictException(`Il fornitore non ha uno scaglione per lo sconto ${Number(ag.sconto)}% alla data dell'ordine: configuralo in Fornitori`);
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

/* ---------- Correzione della quota del subagente (§4.2.7.2, D-27, §8.1) ---------- */

/** Blocca il fornitore (serializza con la chiusura del trimestre, D-51), poi la riga del documento, e
 *  ricontrolla che sia fiscale e non ancora liquidato. Si corregge solo a trimestre aperto (§4.2.7.2). */
async function bloccaDocumento(tx: Tx, id: number) {
  const t = await tx.ordini_fornitore_documenti.findUnique({ where: { id: BigInt(id) }, select: { testata_id: true } });
  if (!t) throw new NotFoundException('Documento non trovato');
  await bloccaFornitore(tx, Number(t.testata_id));
  await tx.$queryRaw`SELECT id FROM ordini_fornitore_documenti WHERE id = ${BigInt(id)} FOR UPDATE`;
  const d = await tx.ordini_fornitore_documenti.findUnique({ where: { id: BigInt(id) }, include: { correzione: true, testata: { select: { cliente_id: true, fornitore_id: true } } } });
  if (!d) throw new NotFoundException('Documento non trovato');
  if (!fiscale(d.tipo)) throw new BadRequestException(`${nomeDi(d.tipo)} ${d.numero} non dà provvigioni al subagente`);
  // già pagato al subagente: il trimestre è chiuso, si corregge con una nota di credito (D-11)
  if (d.liquidazione_id) throw new ConflictException(`${nomeDi(d.tipo)} ${d.numero} già liquidata al subagente: non si modifica, registra una nota di credito`);
  return d;
}

/** Nome del subagente che segue il cliente alla data del documento, per l'etichetta dell'evento (D-35). */
async function nomeSubagente(tx: Tx, testata: { cliente_id: bigint; fornitore_id: bigint }, data: Date) {
  const a = await tx.interscambio.findFirst({
    where: { cliente_id: testata.cliente_id, fornitore_id: testata.fornitore_id, valido_dal: { lte: data }, OR: [{ valido_al: null }, { valido_al: { gt: data } }] },
    select: { subagente: { select: { nome: true, cognome: true } } },
  });
  return a ? `${a.subagente.nome} ${a.subagente.cognome}` : '';
}

@Controller('documenti-fiscali')
export class DocumentiFiscaliController {
  constructor(private readonly db: PrismaService) {}

  /** Salva (o aggiorna) la correzione della quota del subagente. Valore: % per pct, € per importo,
   *  zero per nessuna; motivo obbligatorio. Risponde con la correzione salvata (V12). */
  @Put(':id/correzione')
  @Richiede('provvigioni.modifica')
  async correggi(@Req() req: Request, @Param('id', ParseIntPipe) id: number, @Body() b: Correzione) {
    const ctx = contesto(req);
    const motivo = b.motivo.trim();
    if (!motivo) throw new BadRequestException('Scrivi il motivo della correzione');
    let valore: Prisma.Decimal;
    if (b.tipo === 'nessuna') {
      valore = new Dec(0);
    } else {
      if (b.valore === undefined || Number.isNaN(b.valore)) throw new BadRequestException(b.tipo === 'pct' ? 'Indica una percentuale fra 0 e 100' : 'Indica un importo in euro');
      valore = r2(b.valore);
      if (b.tipo === 'pct' && (valore.lt(0) || valore.gt(100))) throw new BadRequestException('Indica una percentuale fra 0 e 100');
      if (b.tipo === 'importo' && (valore.lte(0) || valore.gt(9_999_999_999.99))) throw new BadRequestException('Indica un importo positivo');
    }
    return this.db.$transaction(async (tx) => {
      const d = await bloccaDocumento(tx, id);
      const nomeSub = await nomeSubagente(tx, d.testata, d.data);
      const dopo = { tipo: b.tipo, valore: Number(valore), motivo };
      const c = d.correzione
        ? await tx.provvigioni_correzioni.update({ where: { id: d.correzione.id }, data: { tipo: b.tipo, valore, motivo, creato_da: ctx.utente_id ?? null } })
        : await tx.provvigioni_correzioni.create({ data: { documento_id: d.id, tipo: b.tipo, valore, motivo, creato_da: ctx.utente_id ?? null } });
      await logEvent(tx, {
        tipo: 'crud', azione: d.correzione ? 'update' : 'create', entita: 'correzione', entita_id: c.id, esito: 'successo',
        dettaglio: {
          etichetta: `${d.numero} · ${nomeSub}`, documento_id: String(d.id),
          prima: d.correzione ? { tipo: d.correzione.tipo, valore: Number(d.correzione.valore), motivo: d.correzione.motivo } : null,
          dopo,
        },
      }, ctx);
      return { documento_id: String(d.id), tipo: b.tipo, valore: Number(valore), motivo, creato_da: c.creato_da ? String(c.creato_da) : null, creato_il: c.creato_il.toISOString() };
    });
  }

  /** Toglie la correzione: torna a valere la regola dell'agenzia o la percentuale dello scaglione. */
  @Delete(':id/correzione')
  @HttpCode(204)
  @Richiede('provvigioni.modifica')
  async togli(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    const ctx = contesto(req);
    await this.db.$transaction(async (tx) => {
      const d = await bloccaDocumento(tx, id);
      if (!d.correzione) return; // niente da togliere
      const nomeSub = await nomeSubagente(tx, d.testata, d.data);
      const correzione = d.correzione;
      await tx.provvigioni_correzioni.delete({ where: { id: correzione.id } });
      await logEvent(tx, {
        tipo: 'crud', azione: 'delete', entita: 'correzione', entita_id: correzione.id, esito: 'successo',
        dettaglio: { etichetta: `${d.numero} · ${nomeSub}`, documento_id: String(d.id), tipo: correzione.tipo, valore: Number(correzione.valore), motivo: correzione.motivo },
      }, ctx);
    });
  }
}
