// Prova del servizio di lettura (F6-A2, §6.5 punti 3–4): coda, salvataggio in transazione,
// tipo ammesso, tentativi e file mancante. Nessuna rete: il lettore è finto.
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import { configura } from '../src/main';
import { leggiDallaCoda, PROMPT_DOCUMENTO, SCHEMA_DOCUMENTO } from '../src/lettura';
import { leggiDocumento, type CampoLetto, type Lettura } from '../src/lettore';
import { PrismaService } from '../src/prisma.service';
import { svuota } from './svuota';

let app: NestExpressApplication;
let db: PrismaService;
let n = 0;

const config = {
  connettore: 'llamacloud_eu' as const, indirizzo: 'https://api.cloud.eu.llamaindex.ai', chiave: 'llx-prova',
  modo: 'agentic' as const, progetto: '', attesa_s: 30, soglia_ok: 0.9, soglia_bassa: 0.7,
};

const radice = process.env.DOCUMENTI_DIR!;

async function inCoda() {
  const nome = `documento-${++n}.pdf`;
  const percorso = `in_arrivo/2026/20260904/${nome}`;
  await mkdir(join(radice, dirname(percorso)), { recursive: true });
  await writeFile(join(radice, percorso), Buffer.from('%PDF-1.4\n%%EOF\n'));
  return db.documenti_in_arrivo.create({
    data: {
      origine: 'email', file_nome: nome, stato: 'in_coda', ricevuto_il: new Date('2026-09-01'),
      file_hash: createHash('sha256').update(String(n)).digest('hex'), file_percorso: percorso,
    },
  });
}

const campo = (campo: string, valore: string | null, affidabilita: number | null = null): CampoLetto => ({
  campo, valore, affidabilita, posizione: null, precisione: 'assente',
});

/** Il documento di prova: una fattura di due pagine, con un campo vuoto da saltare. */
const lettura: Lettura = {
  modello: 'finto:1',
  crediti: null,
  risultato: { tipo: 'fattura', numero: 'F-2026-0891' },
  campi: [
    { ...campo('tipo', 'fattura', 0.98), posizione: { tipo: 'pdf', pagina: 1, x0: 0.1, y0: 0.1, x1: 0.2, y1: 0.12 }, precisione: 'esatta' },
    campo('numero', 'F-2026-0891', 0.97),
    campo('cliente', '', 0.4),
    campo('note', null, null),
    campo('righe[0].codice', 'AB-1', 0.99),
    campo('righe[0].prezzo', '12.5', 0.62),
    campo('righe[0].quantita', '4', 0.95),
    campo('righe[1].codice', 'AB-2', 0.9),
    campo('righe[1].prezzo', '7.25', 0.88),
  ],
};
const lettore = async () => lettura;

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
  db = app.get(PrismaService);
}, 120_000);

afterAll(async () => {
  await svuota(db);
  await app.close();
});

beforeEach(async () => {
  await svuota(db);
});

describe('F6-A2 lettura dalla coda', () => {
  it('coda vuota: false e nessuna esecuzione', async () => {
    expect(await leggiDallaCoda(db, config, lettore)).toBe(false);
    expect(await db.servizi_esecuzioni.count()).toBe(0);
  });

  it('senza configurazione non preleva: il documento resta in coda', async () => {
    const d = await inCoda();
    expect(await leggiDallaCoda(db, null, lettore)).toBe(false);
    expect((await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: d.id } })).stato).toBe('in_coda');
  });

  it('connettore locale non ancora acceso: non preleva, il documento resta in coda', async () => {
    const d = await inCoda();
    const locale = { connettore: 'glm_ocr_locale' as const, indirizzo: 'http://gpu:8080/v1', modello: 'zai-org/GLM-OCR', attesa_s: 300, soglia_ok: 0.9, soglia_bassa: 0.7 };
    expect(await leggiDallaCoda(db, locale, lettore)).toBe(false);
    expect((await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: d.id } })).stato).toBe('in_coda');
  });

  it('legge, salva i campi e la riga del servizio', async () => {
    const d = await inCoda();
    expect(await leggiDallaCoda(db, config, lettore)).toBe(true);
    const riga = await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: d.id } });
    expect(riga).toMatchObject({ stato: 'da_controllare', tipo: 'fattura', modello: 'finto:1', errore: null, tentativi: 0 });
    expect(riga.letto_il).not.toBeNull();
    // F6-A3: livello e controlli calcolati al salvataggio; il campo righe[0].prezzo a 0,62 porta il livello a bassa
    expect(riga.livello).toBe('bassa');
    expect(riga.controlli).toEqual({ falliti: [] });

    const campi = await db.documenti_campi.findMany({ where: { documento_id: d.id }, orderBy: { id: 'asc' } });
    expect(campi.map((c) => c.campo)).toEqual([
      'tipo', 'numero', 'righe[0].codice', 'righe[0].prezzo', 'righe[0].quantita', 'righe[1].codice', 'righe[1].prezzo',
    ]);
    expect(campi.every((c) => c.valore_finale === null && !c.verificato)).toBe(true);
    const prezzo = campi.find((c) => c.campo === 'righe[0].prezzo')!;
    expect(prezzo.valore_letto).toBe('12.5');
    expect(Number(prezzo.affidabilita)).toBe(0.62);
    expect(prezzo.precisione).toBe('assente');
    expect(prezzo.posizione).toBeNull();
    const tipo = campi.find((c) => c.campo === 'tipo')!;
    expect(tipo.posizione).toMatchObject({ tipo: 'pdf', pagina: 1, x0: 0.1, y1: 0.12 });
    expect(tipo.precisione).toBe('esatta');

    const esecuzione = await db.servizi_esecuzioni.findFirstOrThrow({ where: { servizio: 'lettura' } });
    expect(esecuzione).toMatchObject({ tipo: 'lavoro', esito: 'ok', testo: 'Documento letto' });
    expect(esecuzione.fine).not.toBeNull();
    expect(esecuzione.misure).toMatchObject({ documento_id: String(d.id) });
  });

  it('tipo non ammesso: la lettura si salva, il tipo resta vuoto', async () => {
    const d = await inCoda();
    await leggiDallaCoda(db, config, async () => ({ ...lettura, risultato: { tipo: 'scontrino' } }));
    const riga = await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: d.id } });
    expect(riga).toMatchObject({ stato: 'da_controllare', tipo: null });
    expect(await db.documenti_campi.count({ where: { documento_id: d.id } })).toBe(7);
  });

  it('riga spesa (codice testo) e flag spesa: si salvano; schema e prompt li chiedono', async () => {
    // lo schema descrive il flag e il prompt chiede le righe con codice testo (es. «Fracht»)
    const proprieta = (SCHEMA_DOCUMENTO.properties.righe as { items: { properties: Record<string, unknown> } }).items.properties;
    expect(proprieta.spesa).toBeDefined();
    expect(PROMPT_DOCUMENTO).toContain('Fracht');
    expect(PROMPT_DOCUMENTO).toContain('spesa: true');

    const d = await inCoda();
    const r: Lettura = {
      modello: 'finto:1', crediti: null, risultato: { tipo: 'proforma', importo_totale: 963.78 },
      campi: [
        campo('tipo', 'proforma', 0.98),
        campo('righe[0].codice', 'Fracht', 0.95),
        campo('righe[0].descrizione', 'Verpackung und Versand', 0.95),
        campo('righe[0].quantita', '1', 0.95),
        campo('righe[0].prezzo', '87.5', 0.95),
        campo('righe[0].importo', '87.5', 0.95),
        campo('righe[0].spesa', 'true', 0.95),
      ],
    };
    await leggiDallaCoda(db, config, async () => r);
    const campi = await db.documenti_campi.findMany({ where: { documento_id: d.id } });
    expect(campi.map((c) => c.campo)).toContain('righe[0].spesa');
    expect(campi.find((c) => c.campo === 'righe[0].spesa')!.valore_letto).toBe('true');
    expect(campi.find((c) => c.campo === 'righe[0].codice')!.valore_letto).toBe('Fracht');
  });

  it('errore del lettore: 3 giri, poi errore e anomalia lettura.fallita', async () => {
    const d = await inCoda();
    const rotto = async (): Promise<Lettura> => { throw new Error('il modello non risponde'); };
    await leggiDallaCoda(db, config, rotto);
    expect(await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: d.id } }))
      .toMatchObject({ stato: 'in_coda', errore: 'il modello non risponde', tentativi: 1 });
    await leggiDallaCoda(db, config, rotto);
    await leggiDallaCoda(db, config, rotto);
    expect(await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: d.id } }))
      .toMatchObject({ stato: 'errore', errore: 'il modello non risponde', tentativi: 3 });
    expect(await db.registro.count({ where: { codice: 'lettura.fallita', stato: 'aperta' } })).toBe(1);
    expect(await db.documenti_campi.count({ where: { documento_id: d.id } })).toBe(0);
    expect(await db.servizi_esecuzioni.count({ where: { servizio: 'lettura', esito: 'errore' } })).toBe(3);
  });

  it('file mancante su disco: letturaFallita, nessun campo', async () => {
    const d = await inCoda();
    await db.documenti_in_arrivo.update({ where: { id: d.id }, data: { file_percorso: 'in_arrivo/manca.pdf' } });
    expect(await leggiDallaCoda(db, config, lettore)).toBe(true);
    const riga = await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: d.id } });
    expect(riga.stato).toBe('in_coda');
    expect(riga.errore).toContain('manca.pdf');
    expect(await db.documenti_campi.count({ where: { documento_id: d.id } })).toBe(0);
  });

  it('se al salvataggio il documento non è più in_lettura non si scrive niente', async () => {
    const d = await inCoda();
    await leggiDallaCoda(db, config, async () => {
      await db.documenti_in_arrivo.update({ where: { id: d.id }, data: { stato: 'abbinato' } });
      return lettura;
    });
    expect(await db.documenti_campi.count({ where: { documento_id: d.id } })).toBe(0);
    expect((await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: d.id } })).stato).toBe('abbinato');
  });

  it('con fornitore riconosciuto salva fornitore_id e versione (D-71)', async () => {
    const f = await db.fornitori.create({ data: {} });
    const v = await db.fornitori_versioni.create({ data: { fornitore_id: f.id, fonte: 'integra', ragione_sociale: 'Gries GmbH & Co. KG' } });
    await db.fornitori.update({ where: { id: f.id }, data: { versione_corrente_id: v.id } });
    const d = await inCoda();
    const r: Lettura = {
      modello: 'finto:1', crediti: null, risultato: { tipo: 'fattura', fornitore: 'gries gmbh & co. kg' },
      campi: [campo('tipo', 'fattura', 0.98), campo('fornitore', 'Gries GmbH & Co. KG', 0.97)],
    };
    await leggiDallaCoda(db, config, async () => r);
    const riga = await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: d.id } });
    expect(riga).toMatchObject({ fornitore_id: f.id, fornitore_versione_id: v.id });
  });

  it('un campo a 0,5 porta il livello a bassa', async () => {
    const d = await inCoda();
    const r: Lettura = {
      modello: 'finto:1', crediti: null, risultato: { tipo: 'fattura' },
      campi: [campo('tipo', 'fattura', 0.98), campo('numero', 'F-1', 0.98), campo('data', '2026-06-01', 0.5)],
    };
    await leggiDallaCoda(db, config, async () => r);
    expect((await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: d.id } })).livello).toBe('bassa');
  });

  it('un controllo fallito compare in controlli e porta il livello a bassa', async () => {
    const f = await db.fornitori.create({ data: {} });
    const v = await db.fornitori_versioni.create({ data: { fornitore_id: f.id, fonte: 'integra', ragione_sociale: 'Gries GmbH & Co. KG' } });
    await db.fornitori.update({ where: { id: f.id }, data: { versione_corrente_id: v.id } });
    const d = await inCoda();
    const r: Lettura = {
      modello: 'finto:1', crediti: null, risultato: { tipo: 'fattura', fornitore: 'Gries GmbH & Co. KG', codice_cliente: 'ZZZ-999' },
      campi: [campo('tipo', 'fattura', 0.98), campo('codice_cliente', 'ZZZ-999', 0.98)],
    };
    await leggiDallaCoda(db, config, async () => r);
    const riga = await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: d.id } });
    expect(riga.controlli).toEqual({ falliti: [{ codice: 'codice_cliente', campo: 'codice_cliente', testo: 'Codice cliente ZZZ-999 non presente fra i clienti del fornitore', grave: true, gruppo: 'lettura' }] });
    expect(riga.livello).toBe('bassa');
  });

  // C1: se il servizio è giù (5xx, rete o timeout) il documento non consuma il tentativo e
  // l'anomalia del servizio resta una sola, non una per documento.
  async function treGiri(lettore: Parameters<typeof leggiDallaCoda>[2]) {
    await leggiDallaCoda(db, config, lettore);
    await leggiDallaCoda(db, config, lettore);
    await leggiDallaCoda(db, config, lettore);
  }

  it('servizio che risponde 503: tentativi invariati e una sola anomalia di servizio', async () => {
    const d = await inCoda();
    const giu = (async () => new Response('giù', { status: 503 })) as typeof fetch;
    await treGiri((c, nome, dati, schema, prompt) => leggiDocumento(c, nome, dati, schema, prompt, giu, 1));
    expect(await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: d.id } }))
      .toMatchObject({ stato: 'in_coda', tentativi: 0 });
    expect(await db.registro.count({ where: { codice: 'lettura.non_raggiungibile', stato: 'aperta' } })).toBe(1);
    expect(await db.registro.count({ where: { codice: 'lettura.fallita' } })).toBe(0);
  });

  it('servizio che va in timeout: tentativi invariati e una sola anomalia di servizio', async () => {
    const d = await inCoda();
    const inTimeout = (async () => { throw Object.assign(new Error('The operation timed out'), { name: 'TimeoutError' }); }) as typeof fetch;
    await treGiri((c, nome, dati, schema, prompt) => leggiDocumento(c, nome, dati, schema, prompt, inTimeout, 1));
    expect(await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: d.id } }))
      .toMatchObject({ stato: 'in_coda', tentativi: 0 });
    expect(await db.registro.count({ where: { codice: 'lettura.non_raggiungibile', stato: 'aperta' } })).toBe(1);
    expect(await db.registro.count({ where: { codice: 'lettura.fallita' } })).toBe(0);
  });
});
