import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { prelevaDocumento, letturaFallita } from './documenti';
import { letturaConfig } from './impostazioni';
import { pulisci } from './integra';
import { leggiDocumento, type Lettura } from './lettore';
import { TIPI_DOCUMENTO } from './motore/dati';
import { PrismaService } from './prisma.service';

// Servizio di lettura dei documenti (F6-A2, §6.5 punti 3–4): consuma la coda, chiama il connettore
// scelto in Impostazioni → Server di lettura, salva i campi con affidabilità e posizione. Il file
// si legge da DOCUMENTI_DIR, mai da un percorso arrivato dal browser (V12). Il livello e i
// controlli fissi sono F6-A3: qui non si calcolano.

const log = new Logger('Lettura');
const OGNI_MS = 15_000;

type Config = NonNullable<Awaited<ReturnType<typeof letturaConfig>>>;
type Lettore = (config: Config, nome: string, dati: Buffer, schema: object, prompt?: string) => Promise<Lettura>;

/** Tipi ammessi in `documenti_in_arrivo.tipo` (§4.2.12): i sette dei documenti più il bollettino. */
const TIPI = new Set<string>([...TIPI_DOCUMENTO, 'bollettino']);

/** Un solo schema per ogni documento (D-69): il tipo non si sa prima di leggere. */
export const SCHEMA_DOCUMENTO = {
  type: 'object',
  properties: {
    tipo: {
      type: 'string',
      enum: ['ordine', 'conferma', 'proforma', 'fattura', 'nota_credito', 'pagamento', 'altro', 'bollettino'],
      description: 'Tipo del documento',
    },
    numero: { type: 'string', description: 'Numero del documento' },
    data: { type: 'string', description: 'Data del documento in formato AAAA-MM-GG' },
    fornitore: { type: 'string', description: 'Chi vende la merce: la riga «Fornitore», oppure chi emette la fattura o la conferma' },
    codice_cliente: { type: 'string', description: 'Codice con cui il fornitore identifica il cliente (es. «Codice cliente», «Kunden-Nr.»)' },
    cliente: { type: 'string', description: 'Chi compra: intestatario dell’ordine o insegna di consegna' },
    importo_totale: { type: 'number', description: 'Imponibile del documento (netto), senza IVA' },
    mese: { type: 'number', description: 'Mese del bollettino (1–12)' },
    anno: { type: 'number', description: 'Anno del bollettino' },
    righe: {
      type: 'array',
      description: 'Righe articolo di tutte le pagine, in un solo elenco',
      items: {
        type: 'object',
        properties: {
          codice: { type: 'string', description: 'Codice articolo' },
          descrizione: { type: 'string', description: 'Descrizione dell’articolo' },
          quantita: { type: 'number', description: 'Quantità' },
          prezzo: { type: 'number', description: 'Prezzo unitario in euro' },
          importo: { type: 'number', description: 'Importo della riga in euro' },
        },
      },
    },
  },
  required: ['tipo'],
};

export const PROMPT_DOCUMENTO = [
  'Leggi il documento e compila solo i campi che ci sono davvero: non inventare e non ripetere valori.',
  'Le date vanno in formato AAAA-MM-GG.',
  'Gli importi sono numeri con il punto decimale e senza separatori delle migliaia.',
  'L’importo totale è l’imponibile (netto) senza IVA: se il documento mostra anche il totale con IVA, prendi il netto.',
  'Un rendiconto delle provvigioni del fornitore (Provisionsabrechnung, Abrechnung, «Provisionen») è di tipo bollettino: mese e anno sono quelli del periodo scritto nel titolo.',
  'Nelle righe metti solo le righe articolo: non subtotali, totali, intestazioni ripetute o note.',
  'Se il documento ha più pagine, unisci le righe di tutte le pagine in un solo elenco.',
  'Il tipo è uno di: ordine, conferma, proforma, fattura, nota_credito, pagamento, altro, bollettino.',
  'Il fornitore è chi vende la merce: quello indicato nella riga «Fornitore», oppure chi emette la fattura o la conferma.',
  'Il cliente è chi compra: l’intestatario dell’ordine o l’insegna di consegna. Non scambiare i due: un ordine scritto sulla carta del cliente ha il cliente in testata e il fornitore nella riga «Fornitore».',
  'Il codice cliente è il codice con cui il fornitore identifica il cliente (spesso «Codice cliente» o «Kunden-Nr.»).',
  'Per il bollettino compila mese e anno.',
].join(' ');

/** Salvataggio dopo la lettura, in una transazione (V13): la riga si blocca e, se non è più
 *  `in_lettura`, non si scrive niente (un'altra richiesta l'ha già presa). */
async function salva(db: PrismaService, id: bigint, r: Lettura, ora = new Date()): Promise<void> {
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM documenti_in_arrivo WHERE id = ${id} FOR UPDATE`;
    const riga = await tx.documenti_in_arrivo.findUnique({ where: { id }, select: { stato: true } });
    if (!riga || riga.stato !== 'in_lettura') return;
    await tx.documenti_campi.deleteMany({ where: { documento_id: id } });
    const campi = r.campi
      .filter((c) => c.valore !== null && c.valore.trim() !== '')
      .map((c) => ({
        documento_id: id,
        campo: c.campo,
        valore_letto: c.valore,
        valore_finale: null,
        affidabilita: c.affidabilita,
        posizione: c.posizione ? (c.posizione as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
        precisione: c.precisione,
        verificato: false,
      }));
    if (campi.length) await tx.documenti_campi.createMany({ data: campi });
    const letto = r.risultato.tipo;
    const tipo = typeof letto === 'string' && TIPI.has(letto) ? letto : null;
    await tx.documenti_in_arrivo.update({
      where: { id },
      data: { stato: 'da_controllare', tipo, letto_il: ora, modello: r.modello, errore: null, tentativi: 0 },
    });
  });
}

/** Un documento dalla coda: legge il file, chiama il lettore e salva. Non lancia: un errore passa
 *  da `letturaFallita` e il documento torna in coda o va in errore. `true` se ha lavorato. */
export async function leggiDallaCoda(db: PrismaService, config: Config | null, lettore: Lettore = leggiDocumento): Promise<boolean> {
  // il connettore locale non è ancora acceso: prelevare i file brucerebbe i 3 tentativi (§6.5)
  // shortcut: quando il locale è implementato (F6-A5) si toglie questo controllo
  if (!config || config.connettore !== 'llamacloud_eu') return false;
  const d = await prelevaDocumento(db);
  if (!d) return false;
  const esecuzione = await db.servizi_esecuzioni.create({ data: { servizio: 'lettura', tipo: 'lavoro', avviato_da: null } });
  const inizio = Date.now();
  const misure = { documento_id: String(d.id), secondi: 0 };
  try {
    const radice = process.env.DOCUMENTI_DIR;
    if (!radice) throw new Error('DOCUMENTI_DIR non definita in .env');
    const dati = await readFile(join(radice, d.file_percorso));
    const r = await lettore(config, d.file_nome, dati, SCHEMA_DOCUMENTO, PROMPT_DOCUMENTO);
    misure.secondi = Math.round((Date.now() - inizio) / 100) / 10;
    await salva(db, d.id, r);
    await db.servizi_esecuzioni.update({
      where: { id: esecuzione.id },
      data: { fine: new Date(), esito: 'ok', testo: 'Documento letto', misure: misure as unknown as Prisma.InputJsonValue },
    });
  } catch (e) {
    const errore = pulisci(e);
    misure.secondi = Math.round((Date.now() - inizio) / 100) / 10;
    log.warn(`documento ${d.id} non letto: ${errore}`);
    await letturaFallita(db, d.id, errore);
    await db.servizi_esecuzioni.update({
      where: { id: esecuzione.id },
      data: { fine: new Date(), esito: 'errore', testo: 'Lettura non riuscita', misure: misure as unknown as Prisma.InputJsonValue },
    });
  }
  return true;
}

/** Un documento ogni 15 s (§6.5 punto 2): niente timer nelle prove (§7.14). */
@Injectable()
export class LetturaService implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;
  private inCorso = false;

  constructor(private readonly db: PrismaService) {}

  onModuleInit(): void {
    if (process.env.NODE_ENV === 'test' || this.timer) return;
    this.timer = setInterval(() => void this.esegui(), OGNI_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Un giro subito: è il metodo che userà F5-A5 per *Controlla adesso* (§7.14). Non lancia. */
  async esegui(): Promise<boolean> {
    if (this.inCorso) return false;
    this.inCorso = true;
    try {
      return await leggiDallaCoda(this.db, await letturaConfig(this.db));
    } catch (e) {
      log.warn(`giro di lettura non riuscito: ${pulisci(e)}`);
      return false;
    } finally {
      this.inCorso = false;
    }
  }
}
