// Prova di F6-A3 (§6.5 punti 5–6, D-71): fornitore per nome normalizzato, proposta di abbinamento,
// controlli fissi e livello del documento. Nessuna rete: si chiamano direttamente le funzioni.
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import { configura } from '../src/main';
import { PrismaService } from '../src/prisma.service';
import {
  controlliFissi, lettoDaCampi, normalizzaNome, propostaDocumento, riconosciCliente, risolviFornitore, valutaLettura,
  type Letto, type RigaLetta, type Soglie,
} from '../src/proposta';
import { svuota } from './svuota';

let app: NestExpressApplication;
let db: PrismaService;
let n = 0;

const SOGLIE: Soglie = { soglia_ok: 0.9, soglia_bassa: 0.7 };
const r2 = (x: number) => Math.round(x * 100) / 100;
const giorno = (s: string) => new Date(s + 'T00:00:00Z');

let gries: { id: bigint; versione_id: bigint };
let gasper: { id: bigint; versione_id: bigint };
let c1: { id: bigint; versione_id: bigint };
let c2: { id: bigint; versione_id: bigint };

const L = (over: Partial<Letto>): Letto => ({
  tipo: null, fornitore_id: null, numero: null, data: null, codice_cliente: null, cliente: null, piva_cliente: null,
  importo: null, mese: null, anno: null, riferimento_fattura: null, righe: [],
  ...over,
});
const R = (over: Partial<RigaLetta>): RigaLetta => ({
  codice: null, descrizione: null, quantita: null, prezzo: null, importo: null,
  numero_fattura: null, data_fattura: null, provvigione: null, ...over,
});

async function creaFornitore(nome: string) {
  const f = await db.fornitori.create({ data: {} });
  const v = await db.fornitori_versioni.create({ data: { fornitore_id: f.id, fonte: 'integra', ragione_sociale: nome } });
  await db.fornitori.update({ where: { id: f.id }, data: { versione_corrente_id: v.id } });
  return { id: f.id, versione_id: v.id };
}
async function creaCliente(nome: string, piva: string) {
  const c = await db.clienti.create({ data: {} });
  const v = await db.clienti_versioni.create({ data: { cliente_id: c.id, fonte: 'integra', ragione_sociale: nome, piva } });
  await db.clienti.update({ where: { id: c.id }, data: { versione_corrente_id: v.id } });
  return { id: c.id, versione_id: v.id };
}

/** Una pratica con righe per fase e (facoltativi) documenti, per la proposta e i controlli. */
async function creaPratica(opts: {
  fornitore_id: bigint; fornitore_versione_id: bigint; cliente_id: bigint; cliente_versione_id: bigint;
  numero: string; data: string;
  righe?: { fase: string; codice: string; quantita: number; prezzo: number }[];
  documenti?: { tipo: string; numero: string; data: string }[];
}) {
  const t = await db.ordini_fornitore_testata.create({
    data: {
      fornitore_id: opts.fornitore_id, fornitore_versione_id: opts.fornitore_versione_id,
      cliente_id: opts.cliente_id, cliente_versione_id: opts.cliente_versione_id,
      numero_ordine: opts.numero, data_ordine: giorno(opts.data),
    },
  });
  for (const d of opts.documenti ?? []) {
    await db.ordini_fornitore_documenti.create({ data: { testata_id: t.id, tipo: d.tipo, numero: d.numero, data: giorno(d.data), importo: 0 } });
  }
  await db.ordini_fornitore_righe.createMany({ data: (opts.righe ?? []).map((r, i) => ({
    testata_id: t.id, fase: r.fase, numero_riga: i + 1, codice: r.codice, quantita: r.quantita, prezzo_unitario: r.prezzo, importo: r2(r.quantita * r.prezzo),
  })) });
  return t.id;
}

/** Un documento in arrivo con i suoi campi, per lettoDaCampi e valutaLettura. */
async function creaArrivo(opts: { tipo?: string | null; fornitore_id?: bigint | null; campi?: [string, string | null, number | null][]; verificati?: string[] }) {
  // fornitore e versione vanno insieme (CHECK): la versione è quella corrente del fornitore
  const versione = opts.fornitore_id != null
    ? (await db.fornitori.findUniqueOrThrow({ where: { id: opts.fornitore_id } })).versione_corrente_id
    : null;
  const r = await db.documenti_in_arrivo.create({
    data: {
      origine: 'email', file_nome: `d${++n}.pdf`, stato: 'da_controllare',
      file_hash: createHash('sha256').update(String(n)).digest('hex'), file_percorso: `in_arrivo/d${n}.pdf`,
      tipo: opts.tipo ?? null, fornitore_id: opts.fornitore_id ?? null, fornitore_versione_id: versione,
    },
  });
  if (opts.campi?.length) {
    await db.documenti_campi.createMany({ data: opts.campi.map(([campo, valore, affidabilita]) => ({
      documento_id: r.id, campo, valore_letto: valore, affidabilita, verificato: (opts.verificati ?? []).includes(campo),
    })) });
  }
  return r;
}

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
  gries = await creaFornitore('Gries GmbH & Co. KG');
  gasper = await creaFornitore('Gasper GmbH');
  c1 = await creaCliente('Verde Vita snc', 'IT00000000001');
  c2 = await creaCliente('Il Giardino di Sofia srl', 'IT00000000002');
  const agente = await db.agenti.create({ data: { codice: 'DECO', nome: 'Decobrands', cognome: 'SRL' } });
  const sub = await db.subagenti.create({ data: { agente_id: agente.id, codice: 'SUB1', nome: 'Mario', cognome: 'Rossi' } });
  await db.interscambio.create({ data: { subagente_id: sub.id, cliente_id: c1.id, fornitore_id: gries.id, codice_cliente_fornitore: 'K-100', valido_dal: giorno('2025-01-01') } });
  await db.interscambio.create({ data: { subagente_id: sub.id, cliente_id: c2.id, fornitore_id: gries.id, codice_cliente_fornitore: 'K-200', valido_dal: giorno('2025-01-01') } });
});

describe('normalizzaNome e risolviFornitore', () => {
  it('normalizza: minuscole, niente accenti, punteggiatura e spazi ridotti', () => {
    expect(normalizzaNome('  Gries  GmbH & Co. KG ')).toBe('gries gmbh co kg');
    expect(normalizzaNome('Àlbero S.à.r.l.')).toBe('albero s a r l');
  });

  it('riconosce il fornitore per nome normalizzato', async () => {
    expect(await risolviFornitore(db, 'gries gmbh & co. kg')).toEqual({ fornitore_id: gries.id, fornitore_versione_id: gries.versione_id });
  });

  it('nome sconosciuto: null', async () => {
    expect(await risolviFornitore(db, 'Sconosciuto S.p.A.')).toBeNull();
    expect(await risolviFornitore(db, '')).toBeNull();
  });

  it('due fornitori con lo stesso nome normalizzato: null', async () => {
    await creaFornitore('Doppio SRL');
    await creaFornitore('Doppio SRL');
    expect(await risolviFornitore(db, 'Doppio srl')).toBeNull();
  });

  it('nome troncato dal modello: ripiego senza sigle societarie, solo con un match unico', async () => {
    // sui documenti veri il modello ha letto «ARTE GmbH & Co.KG» per «Arte Wohnaccessoires GmbH & Co. KG»
    const arte = await creaFornitore('Arte Wohnaccessoires GmbH & Co. KG');
    expect(await risolviFornitore(db, 'ARTE GmbH & Co.KG')).toEqual({ fornitore_id: arte.id, fornitore_versione_id: arte.versione_id });
    // un secondo nome che comincia con la stessa parola: ambiguo, si sceglie a mano
    await creaFornitore('Arte della Casa SRL');
    expect(await risolviFornitore(db, 'ARTE GmbH')).toBeNull();
  });
});

describe('riconosciCliente (D-92)', () => {
  it('P.IVA riconosciuta', async () => {
    expect(await riconosciCliente(db, L({ piva_cliente: 'IT00000000001' }))).toEqual({ cliente_id: c1.id, ragione: 'Verde Vita snc' });
  });

  it('ragione sociale riconosciuta senza P.IVA', async () => {
    expect(await riconosciCliente(db, L({ cliente: 'Verde Vita snc' }))).toEqual({ cliente_id: c1.id, ragione: 'Verde Vita snc' });
  });

  it('ragione sociale normalizzata (spazi e punteggiatura)', async () => {
    expect(await riconosciCliente(db, L({ cliente: '  Verde   Vita snc ' }))).toEqual({ cliente_id: c1.id, ragione: 'Verde Vita snc' });
  });

  it('P.IVA non in anagrafica: null', async () => {
    expect(await riconosciCliente(db, L({ piva_cliente: 'IT99999999999' }))).toBeNull();
  });

  it('ragione sociale ambigua (due clienti uguali): null', async () => {
    await creaCliente('Verde Vita snc', 'IT00000000003');
    expect(await riconosciCliente(db, L({ cliente: 'Verde Vita snc' }))).toBeNull();
  });
});

describe('proposta — ordine', () => {
  it('nuova con codice cliente riconosciuto', async () => {
    const p = await propostaDocumento(db, L({ tipo: 'ordine', fornitore_id: gries.id, numero: 'OF-999', codice_cliente: 'K-100' }));
    expect(p.esito).toBe('nuova');
    expect(p.abbinamento).toMatchObject({ cliente_id: c1.id, codice: 'K-100' });
  });

  it('nessuno senza codice cliente', async () => {
    const p = await propostaDocumento(db, L({ tipo: 'ordine', fornitore_id: gries.id, numero: 'OF-998', codice_cliente: null }));
    expect(p.esito).toBe('nessuno');
    expect(p.abbinamento).toBeNull();
  });

  it('doppio se lo stesso ordine è già registrato in una pratica', async () => {
    // il numero del documento è quello del fornitore, non il numero della pratica (D-60)
    await creaPratica({
      fornitore_id: gries.id, fornitore_versione_id: gries.versione_id, cliente_id: c1.id, cliente_versione_id: c1.versione_id,
      numero: 'OF/2026/777', data: '2026-05-01', documenti: [{ tipo: 'ordine', numero: 'AU278233', data: '2026-05-01' }],
    });
    const p = await propostaDocumento(db, L({ tipo: 'ordine', fornitore_id: gries.id, numero: 'AU278233', codice_cliente: 'K-100' }));
    expect(p.esito).toBe('doppio');
  });
});

describe('proposta — conferma e fattura', () => {
  it('certo con un solo candidato', async () => {
    await creaPratica({ fornitore_id: gries.id, fornitore_versione_id: gries.versione_id, cliente_id: c1.id, cliente_versione_id: c1.versione_id, numero: 'OF-1', data: '2026-05-01', righe: [{ fase: 'ordine', codice: 'A1', quantita: 2, prezzo: 10 }, { fase: 'ordine', codice: 'A2', quantita: 1, prezzo: 5 }] });
    const p = await propostaDocumento(db, L({ tipo: 'fattura', fornitore_id: gries.id, numero: 'F-1', codice_cliente: 'K-100', righe: [R({ codice: 'A1', quantita: 2, prezzo: 10, importo: 20 }), R({ codice: 'A2', quantita: 1, prezzo: 5, importo: 5 })] }));
    expect(p.esito).toBe('certo');
    expect(p.candidati).toHaveLength(1);
    expect(p.candidati[0].pratica.numero).toBe('OF-1');
  });

  it('probabile: il primo distanzia il secondo di almeno 0,5', async () => {
    await creaPratica({ fornitore_id: gries.id, fornitore_versione_id: gries.versione_id, cliente_id: c1.id, cliente_versione_id: c1.versione_id, numero: 'OF-1', data: '2026-05-01', righe: [{ fase: 'ordine', codice: 'A1', quantita: 2, prezzo: 10 }, { fase: 'ordine', codice: 'A2', quantita: 1, prezzo: 5 }] });
    await creaPratica({ fornitore_id: gries.id, fornitore_versione_id: gries.versione_id, cliente_id: c1.id, cliente_versione_id: c1.versione_id, numero: 'OF-2', data: '2026-06-01', righe: [{ fase: 'ordine', codice: 'A1', quantita: 1, prezzo: 10 }] });
    const p = await propostaDocumento(db, L({ tipo: 'fattura', fornitore_id: gries.id, numero: 'F-1', codice_cliente: 'K-100', righe: [R({ codice: 'A1', quantita: 2, prezzo: 10, importo: 20 }), R({ codice: 'A2', quantita: 1, prezzo: 5, importo: 5 })] }));
    expect(p.esito).toBe('probabile');
    expect(p.candidati[0].pratica.numero).toBe('OF-1'); // 2/2 articoli contro 1/2
  });

  it('ambiguo: candidati vicini', async () => {
    await creaPratica({ fornitore_id: gries.id, fornitore_versione_id: gries.versione_id, cliente_id: c1.id, cliente_versione_id: c1.versione_id, numero: 'OF-1', data: '2026-05-01', righe: [{ fase: 'ordine', codice: 'A1', quantita: 2, prezzo: 10 }, { fase: 'ordine', codice: 'A2', quantita: 1, prezzo: 5 }, { fase: 'ordine', codice: 'A3', quantita: 1, prezzo: 1 }] });
    await creaPratica({ fornitore_id: gries.id, fornitore_versione_id: gries.versione_id, cliente_id: c1.id, cliente_versione_id: c1.versione_id, numero: 'OF-2', data: '2026-06-01', righe: [{ fase: 'ordine', codice: 'A1', quantita: 2, prezzo: 10 }, { fase: 'ordine', codice: 'A2', quantita: 1, prezzo: 5 }] });
    const p = await propostaDocumento(db, L({ tipo: 'fattura', fornitore_id: gries.id, numero: 'F-1', codice_cliente: 'K-100', righe: [R({ codice: 'A1', quantita: 2, prezzo: 10, importo: 20 }), R({ codice: 'A2', quantita: 1, prezzo: 5, importo: 5 })] }));
    expect(p.esito).toBe('ambiguo');
  });

  it('pratica già fatturata: −0,5 e motivo', async () => {
    await creaPratica({ fornitore_id: gries.id, fornitore_versione_id: gries.versione_id, cliente_id: c1.id, cliente_versione_id: c1.versione_id, numero: 'OF-1', data: '2026-05-01', righe: [{ fase: 'ordine', codice: 'A1', quantita: 2, prezzo: 10 }], documenti: [{ tipo: 'fattura', numero: 'F-VECCHIA', data: '2026-06-01' }] });
    const p = await propostaDocumento(db, L({ tipo: 'fattura', fornitore_id: gries.id, numero: 'F-NUOVA', codice_cliente: 'K-100', righe: [R({ codice: 'A1', quantita: 2, prezzo: 10, importo: 20 })] }));
    expect(p.candidati[0].punteggio).toBe(0.5); // 1/1 articolo, −0,5 già fatturata
    expect(p.candidati[0].motivi).toContain('pratica già fatturata');
  });

  it('conferma: esclude la pratica che ha già una conferma', async () => {
    await creaPratica({ fornitore_id: gries.id, fornitore_versione_id: gries.versione_id, cliente_id: c1.id, cliente_versione_id: c1.versione_id, numero: 'OF-1', data: '2026-05-01', righe: [{ fase: 'ordine', codice: 'A1', quantita: 2, prezzo: 10 }], documenti: [{ tipo: 'conferma', numero: 'C-1', data: '2026-05-15' }] });
    const p2 = await creaPratica({ fornitore_id: gries.id, fornitore_versione_id: gries.versione_id, cliente_id: c1.id, cliente_versione_id: c1.versione_id, numero: 'OF-2', data: '2026-06-01', righe: [{ fase: 'ordine', codice: 'A1', quantita: 2, prezzo: 10 }] });
    const p = await propostaDocumento(db, L({ tipo: 'conferma', fornitore_id: gries.id, numero: 'C-NUOVA', codice_cliente: 'K-100', righe: [R({ codice: 'A1', quantita: 2, prezzo: 10, importo: 20 })] }));
    expect(p.esito).toBe('certo');
    expect(p.candidati).toHaveLength(1);
    expect(p.candidati[0].pratica.id).toBe(String(p2));
  });

  it('nota di credito con riferimento: certa e prima', async () => {
    const p1 = await creaPratica({ fornitore_id: gries.id, fornitore_versione_id: gries.versione_id, cliente_id: c1.id, cliente_versione_id: c1.versione_id, numero: 'OF-1', data: '2026-05-01', righe: [{ fase: 'ordine', codice: 'A1', quantita: 2, prezzo: 10 }], documenti: [{ tipo: 'fattura', numero: 'F-100', data: '2026-06-01' }] });
    await creaPratica({ fornitore_id: gries.id, fornitore_versione_id: gries.versione_id, cliente_id: c1.id, cliente_versione_id: c1.versione_id, numero: 'OF-2', data: '2026-06-01', righe: [{ fase: 'ordine', codice: 'A1', quantita: 2, prezzo: 10 }] });
    const p = await propostaDocumento(db, L({ tipo: 'nota_credito', fornitore_id: gries.id, numero: 'NC-1', codice_cliente: 'K-100', riferimento_fattura: 'F-100', righe: [R({ codice: 'A1', quantita: 2, prezzo: 10, importo: 20 })] }));
    expect(p.esito).toBe('certo');
    expect(p.candidati[0].pratica.id).toBe(String(p1));
    expect(p.candidati[0].motivi[0]).toBe('storna la fattura F-100 di questa pratica');
  });
});

describe('proposta — bollettino', () => {
  it('bollettino non ancora registrato', async () => {
    const p = await propostaDocumento(db, L({ tipo: 'bollettino', fornitore_id: gries.id, mese: 6, anno: 2026, righe: [R({ numero_fattura: 'F-1', importo: 100, provvigione: 5 })] }));
    expect(p.esito).toBe('bollettino');
    expect(p.importo).toBe(5); // il totale riconosciuto sono le provvigioni, non gli imponibili
  });

  it('doppio se già registrato per fornitore+mese+anno', async () => {
    await db.bollettini_testata.create({ data: { fornitore_id: gries.id, fornitore_versione_id: gries.versione_id, mese: 6, anno: 2026 } });
    const p = await propostaDocumento(db, L({ tipo: 'bollettino', fornitore_id: gries.id, mese: 6, anno: 2026 }));
    expect(p.esito).toBe('doppio');
  });
});

describe('controlliFissi', () => {
  it('totale diverso dalla somma delle righe: grave', async () => {
    const l = L({ tipo: 'fattura', fornitore_id: gries.id, codice_cliente: 'K-100', importo: 523.7, righe: [R({ codice: 'A1', quantita: 1, prezzo: 471.7, importo: 471.7 })] });
    const c = await controlliFissi(db, l, await propostaDocumento(db, l));
    expect(c).toContainEqual({ codice: 'totale', campo: 'totale', testo: 'Totale del documento 523,70 € diverso dalla somma delle righe 471,70 €', grave: true });
  });

  it('riga: quantità × prezzo diverso dall\'importo, non grave', async () => {
    const l = L({ tipo: 'fattura', fornitore_id: gries.id, codice_cliente: 'K-100', importo: 25, righe: [R({ codice: 'A1', quantita: 2, prezzo: 10, importo: 25 })] });
    const c = await controlliFissi(db, l, await propostaDocumento(db, l));
    expect(c).toContainEqual({ codice: 'riga', campo: 'righe[0]', testo: 'Riga 1: quantità × prezzo 20,00 € diverso dall\'importo 25,00 €', grave: false });
  });

  it('codice cliente assente: grave', async () => {
    const l = L({ tipo: 'fattura', fornitore_id: gries.id, codice_cliente: 'ZZZ-999' });
    const c = await controlliFissi(db, l, await propostaDocumento(db, l));
    expect(c).toContainEqual({ codice: 'codice_cliente', campo: 'codice_cliente', testo: 'Codice cliente ZZZ-999 non presente fra i clienti del fornitore', grave: true });
  });

  it('articolo assente fra le righe della pratica proposta: non grave', async () => {
    await creaPratica({ fornitore_id: gries.id, fornitore_versione_id: gries.versione_id, cliente_id: c1.id, cliente_versione_id: c1.versione_id, numero: 'OF-1', data: '2026-05-01', righe: [{ fase: 'ordine', codice: 'A1', quantita: 2, prezzo: 10 }] });
    const l = L({ tipo: 'fattura', fornitore_id: gries.id, codice_cliente: 'K-100', importo: 10, righe: [R({ codice: 'A9', quantita: 1, prezzo: 10, importo: 10 })] });
    const c = await controlliFissi(db, l, await propostaDocumento(db, l));
    expect(c).toContainEqual({ codice: 'articolo', campo: 'righe[0]', testo: 'Articolo A9 assente fra le righe della pratica proposta', grave: false });
  });

  it('data precedente alla data dell\'ordine: non grave', async () => {
    await creaPratica({ fornitore_id: gries.id, fornitore_versione_id: gries.versione_id, cliente_id: c1.id, cliente_versione_id: c1.versione_id, numero: 'OF-1', data: '2026-06-01', righe: [{ fase: 'ordine', codice: 'A1', quantita: 2, prezzo: 10 }] });
    const l = L({ tipo: 'fattura', fornitore_id: gries.id, codice_cliente: 'K-100', data: '2026-05-15', importo: 20, righe: [R({ codice: 'A1', quantita: 2, prezzo: 10, importo: 20 })] });
    const c = await controlliFissi(db, l, await propostaDocumento(db, l));
    expect(c).toContainEqual({ codice: 'data', campo: 'data', testo: 'Data del documento 2026-05-15 precedente alla data dell\'ordine 2026-06-01', grave: false });
  });

  it('fornitore non riconosciuto: salta codice cliente, articolo e bollettino', async () => {
    const l = L({ tipo: 'fattura', fornitore_id: null, codice_cliente: 'ZZZ-999', importo: 10, righe: [R({ codice: 'A9', quantita: 1, prezzo: 10, importo: 10 })] });
    const c = await controlliFissi(db, l, await propostaDocumento(db, l));
    expect(c.map((x) => x.codice)).not.toContain('codice_cliente');
    expect(c.map((x) => x.codice)).not.toContain('articolo');
  });

  it('bollettino già registrato: grave', async () => {
    await db.bollettini_testata.create({ data: { fornitore_id: gries.id, fornitore_versione_id: gries.versione_id, mese: 6, anno: 2026 } });
    const l = L({ tipo: 'bollettino', fornitore_id: gries.id, mese: 6, anno: 2026 });
    const c = await controlliFissi(db, l, await propostaDocumento(db, l));
    expect(c).toContainEqual({ codice: 'bollettino', campo: 'mese', testo: 'Bollettino già registrato per questo fornitore e mese', grave: true });
  });
});

describe('lettoDaCampi', () => {
  it('costruisce il Letto con conversioni difensive', async () => {
    const r = await creaArrivo({ tipo: 'fattura', fornitore_id: gries.id, campi: [
      ['numero', 'F-1', 0.95], ['data', '2026-06-01', 0.95], ['codice_cliente', 'K-100', 0.95],
      ['importo_totale', '523,70', 0.95], ['riferimento_fattura', null, 0.95],
      ['righe[0].codice', 'A1', 0.95], ['righe[0].quantita', '4', 0.95], ['righe[0].prezzo', '12.5', 0.95],
      ['righe[0].numero_fattura', 'F-1', 0.95], ['righe[0].data_fattura', '2026-05-20', 0.95], ['righe[0].provvigione', '3,50', 0.95],
      ['righe[1].codice', 'A2', 0.95], ['righe[1].importo', '12.25', 0.95],
    ] });
    const l = await lettoDaCampi(db, r.id);
    expect(l.tipo).toBe('fattura');
    expect(l.fornitore_id).toBe(gries.id);
    expect(l.numero).toBe('F-1');
    expect(l.data).toBe('2026-06-01');
    expect(l.importo).toBe(523.7); // virgola → punto
    expect(l.riferimento_fattura).toBeNull();
    expect(l.righe).toHaveLength(2);
    expect(l.righe[0]).toMatchObject({ codice: 'A1', quantita: 4, prezzo: 12.5, numero_fattura: 'F-1', data_fattura: '2026-05-20', provvigione: 3.5 });
    expect(l.righe[1].importo).toBe(12.25);
  });

  it('preferisce il valore finale della correzione (D-72)', async () => {
    const r = await creaArrivo({ tipo: 'fattura', campi: [
      ['numero', 'LETTO', 0.5], ['righe[0].codice', 'A1', 0.5], ['righe[0].quantita', '2', 0.5],
    ] });
    await db.documenti_campi.updateMany({ where: { documento_id: r.id, campo: 'numero' }, data: { valore_finale: 'CORRETTO' } });
    await db.documenti_campi.updateMany({ where: { documento_id: r.id, campo: 'righe[0].quantita' }, data: { valore_finale: '5' } });
    const l = await lettoDaCampi(db, r.id);
    expect(l.numero).toBe('CORRETTO');
    expect(l.righe[0].quantita).toBe(5);
  });

  it('valori non validi: null, mai eccezione', async () => {
    const r = await creaArrivo({ tipo: 'fattura', campi: [['data', 'ieri', 0.9], ['importo_totale', 'non-un-numero', 0.9], ['mese', '13,5', 0.9]] });
    const l = await lettoDaCampi(db, r.id);
    expect(l.data).toBeNull();
    expect(l.importo).toBeNull();
    expect(l.mese).toBeNull();
  });
});

describe('valutaLettura', () => {
  const campiPuliti = (): [string, string | null, number | null][] => [
    ['tipo', 'fattura', 0.5], // sempre basso, ma escluso (D-71)
    ['numero', 'F-1', 0.95],
    ['data', '2026-06-01', 0.95],
    ['codice_cliente', 'K-100', 0.95],
    ['importo_totale', '100', 0.95],
    ['righe[0].codice', 'A1', 0.95],
    ['righe[0].quantita', '2', 0.95],
    ['righe[0].prezzo', '50', 0.95],
    ['righe[0].importo', '100', 0.95],
  ];
  // cambia valore e affidabilità di un campo, mantenendo il tipo tupla
  const cambia = (campi: [string, string | null, number | null][], campo: string, valore: string | null, aff: number | null): [string, string | null, number | null][] =>
    campi.map(([c, v, a]): [string, string | null, number | null] => (c === campo ? [c, valore, aff] : [c, v, a]));

  it('affidabile: tutti i campi ≥ soglia e nessun controllo', async () => {
    const r = await creaArrivo({ tipo: 'fattura', fornitore_id: gries.id, campi: campiPuliti() });
    expect((await valutaLettura(db, r.id, SOGLIE)).livello).toBe('affidabile');
  });

  it('da_controllare: un campo fra le soglie', async () => {
    const campi = cambia(campiPuliti(), 'numero', 'F-1', 0.8);
    const r = await creaArrivo({ tipo: 'fattura', fornitore_id: gries.id, campi });
    const val = await valutaLettura(db, r.id, SOGLIE);
    expect(val.livello).toBe('da_controllare');
    expect(val.campi).toEqual(['numero']);
    expect(val.n).toBe(1);
  });

  it('bassa: un campo sotto la soglia bassa', async () => {
    const campi = cambia(campiPuliti(), 'numero', 'F-1', 0.5);
    const r = await creaArrivo({ tipo: 'fattura', fornitore_id: gries.id, campi });
    expect((await valutaLettura(db, r.id, SOGLIE)).livello).toBe('bassa');
  });

  it('bassa per un controllo grave (codice cliente non presente)', async () => {
    const campi = cambia(campiPuliti(), 'codice_cliente', 'ZZZ-999', 0.95);
    const r = await creaArrivo({ tipo: 'fattura', fornitore_id: gries.id, campi });
    const val = await valutaLettura(db, r.id, SOGLIE);
    expect(val.livello).toBe('bassa');
    expect(val.controlli.some((c) => c.codice === 'codice_cliente')).toBe(true);
  });

  it('tipo escluso dal conteggio anche se basso', async () => {
    const r = await creaArrivo({ tipo: 'fattura', fornitore_id: gries.id, campi: campiPuliti() });
    const val = await valutaLettura(db, r.id, SOGLIE);
    expect(val.livello).toBe('affidabile');
    expect(val.campi).not.toContain('tipo');
  });

  it('campo verificato escluso dal conteggio', async () => {
    const campi = cambia(campiPuliti(), 'numero', 'F-1', 0.5);
    const r = await creaArrivo({ tipo: 'fattura', fornitore_id: gries.id, campi, verificati: ['numero'] });
    expect((await valutaLettura(db, r.id, SOGLIE)).livello).toBe('affidabile');
  });

  it('affidabilità nulla: incerta ma non bassa', async () => {
    const campi = cambia(campiPuliti(), 'numero', 'F-1', null);
    const r = await creaArrivo({ tipo: 'fattura', fornitore_id: gries.id, campi });
    const val = await valutaLettura(db, r.id, SOGLIE);
    expect(val.campi).toContain('numero');
    expect(val.livello).toBe('da_controllare'); // non bassa
  });
});
