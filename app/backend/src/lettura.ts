import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { letturaFallita, letturaNonRaggiungibile, prelevaDocumento } from './documenti';
import { letturaConfig } from './impostazioni';
import { pulisci } from './integra';
import { leggiDocumento, LetturaFallita, type Lettura } from './lettore';
import { TIPI_DOCUMENTO } from './motore/dati';
import { PrismaService } from './prisma.service';
import { logEvent } from './registro';
import { risolviFornitore, valutaLettura, type Soglie } from './proposta';

// Servizio di lettura dei documenti (F6-A2, §6.5 punti 3–4): consuma la coda, chiama il connettore
// scelto in Impostazioni → Server di lettura, salva i campi con affidabilità e posizione. Il file
// si legge da DOCUMENTI_DIR, mai da un percorso arrivato dal browser (V12). F6-A3: nella stessa
// transazione si risolvono fornitore, livello e controlli (§6.5 punti 5–6, V13, D-71).

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
    numero_ordine_fornitore: { type: 'string', description: 'Il numero d’ordine del fornitore: per l’ordine è il suo numero; per proforma, conferma, fattura e nota di credito è il riferimento all’ordine stampato (es. «Auftrag / Order / Ordine n.», «Ihre Bestellung», «Rif. ordine») seguito dal codice' },
    data: { type: 'string', description: 'Data del documento in formato AAAA-MM-GG' },
    fornitore: { type: 'string', description: 'Chi vende la merce: la riga «Fornitore», oppure chi emette la fattura o la conferma' },
    codice_cliente: { type: 'string', description: 'Codice con cui il fornitore identifica il cliente (es. «Codice cliente», «Kunden-Nr.»)' },
    cliente: { type: 'string', description: 'Chi compra: intestatario dell’ordine o insegna di consegna' },
    piva_cliente: { type: 'string', description: 'Partita IVA o codice fiscale dell’intestatario (es. «P.IVA», «USt-IdNr.», «C.F.»): solo se scritta sul documento' },
    piva_fornitore: { type: 'string', description: 'Partita IVA o codice fiscale del fornitore (chi vende la merce): solo se scritta sul documento' },
    importo_totale: { type: 'number', description: 'Imponibile del documento (netto), senza IVA' },
    mese: { type: 'number', description: 'Mese del bollettino (1–12)' },
    anno: { type: 'number', description: 'Anno del bollettino' },
    riferimento_fattura: { type: 'string', description: 'Per la nota di credito: il numero della fattura stornata' },
    righe: {
      type: 'array',
      description: 'Righe di tutte le pagine, in un solo elenco: per i documenti gli articoli, per il bollettino le fatture del mese',
      items: {
        type: 'object',
        properties: {
          codice: { type: 'string', description: 'Codice articolo' },
          descrizione: { type: 'string', description: 'Descrizione dell’articolo' },
          quantita: { type: 'number', description: 'Quantità' },
          prezzo: { type: 'number', description: 'Prezzo unitario in euro' },
          importo: { type: 'number', description: 'Importo della riga in euro; per il bollettino è l’imponibile della fattura' },
          sconto: { type: 'number', description: 'Sconto percentuale della riga (es. 10 = 10%). Solo se scritto accanto al prezzo (es. «Rabatt», «Sonderrabatt»); altrimenti lascia il campo vuoto' },
          numero_fattura: { type: 'string', description: 'Per il bollettino: numero della fattura del mese' },
          data_fattura: { type: 'string', description: 'Per il bollettino: data della fattura in formato AAAA-MM-GG' },
          provvigione: { type: 'number', description: 'Per il bollettino: provvigione riconosciuta per la fattura' },
          quota_pagata: { type: 'number', description: 'Per il bollettino: quota pagata della fattura in percentuale (es. 96,43 = 96,43 %), se c\'è una colonna che la indica (es. «% bezahlt»); altrimenti lascia il campo vuoto' },
          spesa: { type: 'boolean', description: 'True solo per le righe che non sono articoli ma spese (trasporto, imballo, «Fracht», «Porto», «Versand») o che hanno il codice come testo; per gli articoli normali lascia il campo vuoto' },
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
  'Nelle righe metti ogni riga con posizione, quantità, prezzo e importo, anche se il codice articolo è un testo (es. «Fracht», «Verpackung», «Porto», «Versand») o manca: il codice si copia così com’è. Per queste righe di spesa metti spesa: true. Non mettere subtotali, totali, intestazioni ripetute o note.',
  'Lo sconto di riga (sconto) è la percentuale scritta accanto al prezzo, es. «Rabatt», «Sonderrabatt», «10,00%»: metti solo il numero (10 per il 10%). Se non c’è, lascia il campo vuoto.',
  'Se il documento ha più pagine, unisci le righe di tutte le pagine in un solo elenco.',
  'Il tipo è uno di: ordine, conferma, proforma, fattura, nota_credito, pagamento, altro, bollettino.',
  'Il fornitore è chi vende la merce: quello indicato nella riga «Fornitore», oppure chi emette la fattura o la conferma.',
  'Il cliente è chi compra: l’intestatario dell’ordine o l’insegna di consegna. Non scambiare i due: un ordine scritto sulla carta del cliente ha il cliente in testata e il fornitore nella riga «Fornitore».',
  'Il codice cliente è il codice con cui il fornitore identifica il cliente (spesso «Codice cliente» o «Kunden-Nr.»).',
  'La partita IVA del cliente è quella dell’intestatario (P.IVA, USt-IdNr., codice fiscale): se non è scritta, lascia il campo vuoto.',
  'La partita IVA del fornitore (piva_fornitore) è quella di chi vende la merce: se non è scritta, lascia il campo vuoto.',
  'Per il bollettino compila mese e anno; le sue righe sono le fatture del mese: numero_fattura, data_fattura, importo (imponibile), provvigione e, se c\'è una colonna con la quota pagata (es. «% bezahlt»), quota_pagata come percentuale (es. 96,43 per il 96,43 %), non gli articoli.',
  'Per la nota di credito compila riferimento_fattura con il numero della fattura stornata.',
  'Il numero d’ordine del fornitore (numero_ordine_fornitore) è il numero d’ordine a cui si riferisce il documento: nell’ordine è il numero dell’ordine stesso; nella proforma, conferma, fattura e nota di credito è il numero d’ordine stampato accanto a diciture come «Auftrag», «Order», «Bestellung», «Ordine n.», «Ihre Bestellung», «Rif. ordine». Se il documento non cita un numero d’ordine, lascia il campo vuoto.',
].join(' ');

/** Salvataggio dopo la lettura, in una transazione (V13): la riga si blocca e, se non è più
 *  `in_lettura`, non si scrive niente (un'altra richiesta l'ha già presa). F6-A3: dopo i campi,
 *  fornitore dal nome letto, livello e controlli (stessa transazione). */
async function salva(db: PrismaService, id: bigint, r: Lettura, soglie: Soglie, ora = new Date()): Promise<void> {
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM documenti_in_arrivo WHERE id = ${id} FOR UPDATE`;
    const riga = await tx.documenti_in_arrivo.findUnique({ where: { id }, select: { stato: true, file_nome: true } });
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
    // F6-A3: fornitore per nome normalizzato (D-71), poi livello e controlli sui campi appena scritti
    const nome = typeof r.risultato.fornitore === 'string' ? r.risultato.fornitore : '';
    const f = nome ? await risolviFornitore(tx, nome) : null;
    await tx.documenti_in_arrivo.update({
      where: { id },
      data: { tipo, fornitore_id: f?.fornitore_id ?? null, fornitore_versione_id: f?.fornitore_versione_id ?? null },
    });
    const val = await valutaLettura(tx, id, soglie);
    // D-170: la risposta completa del lettore serve a ricavare campi nuovi dai documenti già letti
    // senza rileggerli. Tetto di 5 MB (JSON serializzato): oltre, si conservano solo i campi estratti.
    const grezza = (() => {
      const g = r.grezza ?? r.risultato;
      try {
        const s = JSON.stringify(g);
        return s != null && s.length <= 5_000_000 ? (g as Prisma.InputJsonValue) : Prisma.JsonNull;
      } catch {
        return Prisma.JsonNull;
      }
    })();
    await tx.documenti_in_arrivo.update({
      where: { id },
      data: {
        stato: 'da_controllare', letto_il: ora, modello: r.modello, errore: null, tentativi: 0,
        lettura_grezza: grezza,
        livello: val.livello, controlli: { falliti: val.controlli } as unknown as Prisma.InputJsonValue,
      },
    });
    // D-164 §19: il cambio di stato è un evento, così la pagina Documenti si aggiorna da sola (SSE)
    await logEvent(tx, {
      tipo: 'documento', azione: 'stato', entita: 'documento', entita_id: id, esito: 'successo',
      dettaglio: { etichetta: riga.file_nome, documento_id: String(id), prima: { stato: 'in_lettura' }, dopo: { stato: 'da_controllare' } },
    }, {});
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
    await salva(db, d.id, r, { soglia_ok: config.soglia_ok, soglia_bassa: config.soglia_bassa });
    await db.servizi_esecuzioni.update({
      where: { id: esecuzione.id },
      data: { fine: new Date(), esito: 'ok', testo: 'Documento letto', misure: misure as unknown as Prisma.InputJsonValue },
    });
  } catch (e) {
    const errore = pulisci(e);
    misure.secondi = Math.round((Date.now() - inizio) / 100) / 10;
    log.warn(`documento ${d.id} non letto: ${errore}`);
    // A4-01/C1: un errore del servizio (chiave scaduta, crediti finiti, rete giù, timeout, 5xx) non è
    // colpa del documento: non consuma il tentativo e apre un'anomalia sola, altrimenti un solo giro
    // sbagliato brucerebbe i 3 tentativi di ogni file in coda. Il tentativo si consuma solo per un
    // errore del documento (risposta valida ma illeggibile, oppure 4xx sul file).
    if (e instanceof LetturaFallita && e.servizio) {
      await letturaNonRaggiungibile(db, d.id, errore);
    } else {
      await letturaFallita(db, d.id, errore);
    }
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
