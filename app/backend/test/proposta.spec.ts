// Prova di F6-A3 (§6.5 punti 5–6, D-71): fornitore per nome normalizzato, proposta di abbinamento,
// controlli fissi e livello del documento. Nessuna rete: si chiamano direttamente le funzioni.
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configura } from '../src/main';
import { cifra } from '../src/password';
import { PrismaService } from '../src/prisma.service';
import { IntegraService } from '../src/integra';
import {
  controlliFissi, filtroDalTipo, lettoDaCampi, normalizzaNome, propostaDocumento, riconosciCliente, risolviFornitore, valutaLettura,
  type Contesto, type Letto, type RigaIntegra, type RigaLetta, type RigaStorico, type Soglie,
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
  tipo: null, fornitore_id: null, fornitore: null, numero: null, numero_ordine_fornitore: null, data: null, codice_cliente: null, cliente: null, cliente_id: null, piva_cliente: null,
  importo: null, mese: null, anno: null, riferimento_fattura: null, righe: [],
  ...over,
});
const R = (over: Partial<RigaLetta>): RigaLetta => ({
  codice: null, descrizione: null, quantita: null, prezzo: null, importo: null,
  sconto: null, numero_fattura: null, data_fattura: null, provvigione: null, ...over,
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

  it('P.IVA con il prefisso IT e spazi (R1-09): l\'anagrafica è scritta senza, si riconosce lo stesso', async () => {
    const c = await creaCliente('Orti Riuniti snc', '01234567890');
    expect(await riconosciCliente(db, L({ piva_cliente: 'IT 01234567890' }))).toEqual({ cliente_id: c.id, ragione: 'Orti Riuniti snc' });
  });

  it('P.IVA con il prefisso del paese davanti alle cifre (D-124): si confronta senza', async () => {
    const c = await creaCliente('Orti Riuniti snc', '01234567890');
    expect(await riconosciCliente(db, L({ piva_cliente: 'IT01234567890' }))).toEqual({ cliente_id: c.id, ragione: 'Orti Riuniti snc' });
    expect(await riconosciCliente(db, L({ piva_cliente: 'DE 01234567890' }))).toEqual({ cliente_id: c.id, ragione: 'Orti Riuniti snc' });
  });

  it('P.IVA condivisa da più clienti: decide la ragione sociale, altrimenti null (D-124)', async () => {
    // due sedi della stessa catena in Integra, stessa P.IVA scritta con e senza prefisso
    const bergamo = await creaCliente('Garden Rossi Bergamo srl', '01234567890');
    const brescia = await creaCliente('Garden Rossi Brescia srl', 'IT 01234567890');
    expect(await riconosciCliente(db, L({ piva_cliente: 'IT01234567890', cliente: 'Garden Rossi Brescia srl' })))
      .toEqual({ cliente_id: brescia.id, ragione: 'Garden Rossi Brescia srl' });
    expect(await riconosciCliente(db, L({ piva_cliente: 'DE 01234567890', cliente: ' Garden Rossi Bergamo SRL ' })))
      .toEqual({ cliente_id: bergamo.id, ragione: 'Garden Rossi Bergamo srl' });
    // P.IVA condivisa e ragione sociale assente o diversa: non riconosciuto, niente cliente a caso
    expect(await riconosciCliente(db, L({ piva_cliente: 'IT01234567890' }))).toBeNull();
    expect(await riconosciCliente(db, L({ piva_cliente: 'IT01234567890', cliente: 'Garden Rossi Verona srl' }))).toBeNull();
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

  it('conferma: la pratica già confermata non è più esclusa (D-174), col suggerimento del ruolo', async () => {
    await creaPratica({ fornitore_id: gries.id, fornitore_versione_id: gries.versione_id, cliente_id: c1.id, cliente_versione_id: c1.versione_id, numero: 'OF-1', data: '2026-05-01', righe: [{ fase: 'ordine', codice: 'A1', quantita: 2, prezzo: 10 }], documenti: [{ tipo: 'conferma', numero: 'C-1', data: '2026-05-15' }] });
    await creaPratica({ fornitore_id: gries.id, fornitore_versione_id: gries.versione_id, cliente_id: c1.id, cliente_versione_id: c1.versione_id, numero: 'OF-2', data: '2026-06-01', righe: [{ fase: 'ordine', codice: 'A1', quantita: 2, prezzo: 10 }] });
    const p = await propostaDocumento(db, L({ tipo: 'conferma', fornitore_id: gries.id, numero: 'C-NUOVA', codice_cliente: 'K-100', righe: [R({ codice: 'A1', quantita: 2, prezzo: 10, importo: 20 })] }));
    expect(p.candidati).toHaveLength(2);
    const gia = p.candidati.find((c) => c.pratica.numero === 'OF-1')!;
    const libera = p.candidati.find((c) => c.pratica.numero === 'OF-2')!;
    expect(gia.ruolo).not.toBe(null); // già confermata: si propone con una scelta
    expect(libera.ruolo).toBe(null); // prima conferma: nessuna scelta
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

describe('proposta — proforma come conferma (D-60)', () => {
  it('proforma con cliente scelto a mano e agenzia per il codice: propone l\'unica pratica aperta della coppia', async () => {
    await creaPratica({ fornitore_id: gries.id, fornitore_versione_id: gries.versione_id, cliente_id: c1.id, cliente_versione_id: c1.versione_id, numero: 'OF/2026/001', data: '2026-02-17', righe: [{ fase: 'ordine', codice: 'A1', quantita: 2, prezzo: 10 }] });
    const l = L({ tipo: 'proforma', fornitore_id: gries.id, numero: 'PR102848', codice_cliente: 'K-100', cliente: 'Verde Vita snc', cliente_id: String(c1.id), data: '2026-04-08' });
    const p = await propostaDocumento(db, l);
    expect(p.esito).toBe('certo');
    expect(p.candidati).toHaveLength(1);
    expect(p.candidati[0].pratica.numero).toBe('OF/2026/001');
    expect(p.cliente_riconosciuto).toEqual({ cliente_id: c1.id, ragione: 'Verde Vita snc' });
    const controlli = await controlliFissi(db, l, p);
    expect(controlli.filter((c) => c.codice === 'codice_cliente')).toEqual([]);
  });

  it('proforma su una pratica che ha già una proforma: ora si propone, con il suggerimento del ruolo (D-174)', async () => {
    await creaPratica({ fornitore_id: gries.id, fornitore_versione_id: gries.versione_id, cliente_id: c1.id, cliente_versione_id: c1.versione_id, numero: 'OF/2026/001', data: '2026-02-17', documenti: [{ tipo: 'ordine', numero: 'AU', data: '2026-02-17' }, { tipo: 'proforma', numero: 'P-1', data: '2026-03-01' }] });
    const d = await db.ordini_fornitore_documenti.findFirstOrThrow({ where: { tipo: 'ordine' } });
    await db.ordini_fornitore_documenti.update({ where: { id: d.id }, data: { importo: 2154.5 } });
    const p = await propostaDocumento(db, L({ tipo: 'proforma', fornitore_id: gries.id, numero: 'PR102849', codice_cliente: 'K-100', righe: [R({ codice: 'A1', quantita: 1, prezzo: 37.2, importo: 37.2 })] }));
    expect(p.esito).toBe('certo');
    expect(p.candidati).toHaveLength(1);
    expect(p.candidati[0].ruolo).toBe('parziale'); // la somma (37,20) resta entro l'ordine (2.154,50)
  });
});

describe('proposta — conferme/proforme multiple (D-174)', () => {
  async function praticaCon(doc: { tipo: string; numero: string; importo: number }[]) {
    const tid = await creaPratica({ fornitore_id: gries.id, fornitore_versione_id: gries.versione_id, cliente_id: c1.id, cliente_versione_id: c1.versione_id, numero: 'OF-9', data: '2026-05-01' });
    for (const x of doc) await db.ordini_fornitore_documenti.create({ data: { testata_id: tid, tipo: x.tipo, numero: x.numero, data: giorno('2026-05-10'), importo: x.importo } });
    return tid;
  }

  it('seconda proforma parziale: propone «parziale» con i numeri (somma attuale, importo ordine)', async () => {
    await praticaCon([{ tipo: 'ordine', numero: 'AU276839', importo: 2154.5 }, { tipo: 'proforma', numero: 'PR102813', importo: 2117.3 }]);
    const p = await propostaDocumento(db, L({ tipo: 'proforma', fornitore_id: gries.id, numero: 'PR102848', codice_cliente: 'K-100', righe: [R({ codice: 'A1', importo: 37.2 })] }));
    expect(p.esito).toBe('certo');
    expect(p.candidati).toHaveLength(1);
    expect(p.candidati[0].ruolo).toBe('parziale');
    expect(p.candidati[0].motivi.join(' ')).toContain('confermato 2117,30 € su ordine 2154,50 €');
  });

  it('proforma ≈ all\'ordine totale: propone «sostituisce»', async () => {
    await praticaCon([{ tipo: 'ordine', numero: 'AU', importo: 100 }, { tipo: 'proforma', numero: 'P-1', importo: 60 }]);
    const p = await propostaDocumento(db, L({ tipo: 'proforma', fornitore_id: gries.id, numero: 'P-2', codice_cliente: 'K-100', righe: [R({ codice: 'A1', importo: 100 })] }));
    expect(p.candidati[0].ruolo).toBe('sostituisce');
  });

  it('prima conferma (nessuna conferma/proforma precedente): ruolo null', async () => {
    await praticaCon([{ tipo: 'ordine', numero: 'AU', importo: 100 }]);
    const p = await propostaDocumento(db, L({ tipo: 'conferma', fornitore_id: gries.id, numero: 'C-1', codice_cliente: 'K-100', righe: [R({ codice: 'A1', importo: 100 })] }));
    expect(p.esito).toBe('certo');
    expect(p.candidati).toHaveLength(1);
    expect(p.candidati[0].ruolo).toBe(null);
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

describe('proposta — agenzia mancante (D-106)', () => {
  it('agenzia valida alla data: esito normale e agenzia_mancante null', async () => {
    const p = await propostaDocumento(db, L({ tipo: 'ordine', fornitore_id: gries.id, numero: 'OF-901', codice_cliente: 'K-100' }));
    expect(p.esito).toBe('nuova');
    expect(p.agenzia_mancante).toBeNull();
  });

  it('agenzia assente (cliente riconosciuto per P.IVA): manca_agenzia con i dati giusti', async () => {
    const p = await propostaDocumento(db, L({ tipo: 'ordine', fornitore_id: gasper.id, numero: 'OF-902', codice_cliente: 'K-100', piva_cliente: 'IT00000000001', data: '2026-06-01' }));
    expect(p.esito).toBe('manca_agenzia');
    expect(p.agenzia_mancante).toMatchObject({ cliente_id: c1.id, fornitore_id: gasper.id, cliente: 'Verde Vita snc', fornitore: 'Gasper GmbH', codice_cliente: 'K-100', data: '2026-06-01' });
  });

  it('agenzia presente ma non valida alla data: manca_agenzia', async () => {
    const sub = await db.subagenti.findFirstOrThrow();
    await db.interscambio.create({ data: { subagente_id: sub.id, cliente_id: c1.id, fornitore_id: gasper.id, codice_cliente_fornitore: 'K-G', valido_dal: giorno('2026-01-01') } });
    const p = await propostaDocumento(db, L({ tipo: 'ordine', fornitore_id: gasper.id, numero: 'OF-903', codice_cliente: 'K-G', cliente: 'Verde Vita snc', data: '2025-06-01' }));
    expect(p.esito).toBe('manca_agenzia');
    expect(p.agenzia_mancante).toMatchObject({ cliente_id: c1.id, fornitore_id: gasper.id, data: '2025-06-01' });
  });

  it('cliente non riconosciuto: esito attuale, senza agenzia_mancante', async () => {
    const p = await propostaDocumento(db, L({ tipo: 'ordine', fornitore_id: gasper.id, numero: 'OF-904', codice_cliente: 'ZZZ-9', cliente: 'Sconosciuto SRL' }));
    expect(p.esito).toBe('nessuno');
    expect(p.agenzia_mancante).toBeNull();
  });

  it('pagamento/altro: mai manca_agenzia', async () => {
    for (const tipo of ['pagamento', 'altro']) {
      const p = await propostaDocumento(db, L({ tipo: tipo as 'pagamento' | 'altro', fornitore_id: gasper.id, codice_cliente: 'K-100', piva_cliente: 'IT00000000001' }));
      expect(p.esito).toBe('nessuno');
      expect(p.agenzia_mancante).toBeNull();
    }
  });
});

describe('controlliFissi', () => {
  it('totale diverso dalla somma delle righe: grave', async () => {
    const l = L({ tipo: 'fattura', fornitore_id: gries.id, codice_cliente: 'K-100', importo: 523.7, righe: [R({ codice: 'A1', quantita: 1, prezzo: 471.7, importo: 471.7 })] });
    const c = await controlliFissi(db, l, await propostaDocumento(db, l));
    expect(c).toContainEqual({ codice: 'totale', campo: 'totale', testo: 'Totale del documento 523,70 € diverso dalla somma delle righe 471,70 €', grave: true, gruppo: 'lettura' });
  });

  it('riga: quantità × prezzo diverso dall\'importo, non grave', async () => {
    const l = L({ tipo: 'fattura', fornitore_id: gries.id, codice_cliente: 'K-100', importo: 25, righe: [R({ codice: 'A1', quantita: 2, prezzo: 10, importo: 25 })] });
    const c = await controlliFissi(db, l, await propostaDocumento(db, l));
    expect(c).toContainEqual({ codice: 'riga', campo: 'righe[0]', testo: 'Riga 1: quantità × prezzo 20,00 € diverso dall\'importo 25,00 €', grave: false, gruppo: 'lettura' });
  });

  it('riga con sconto: quantità × prezzo × (1 − sconto/100) quadra, nessun rilievo', async () => {
    const l = L({ tipo: 'fattura', fornitore_id: gries.id, codice_cliente: 'K-100', importo: 26.82, righe: [R({ codice: 'A1', quantita: 2, prezzo: 14.9, sconto: 10, importo: 26.82 })] });
    const c = await controlliFissi(db, l, await propostaDocumento(db, l));
    expect(c.filter((x) => x.codice === 'riga')).toEqual([]);
  });

  it('riga senza importo letto, con sconto: il totale è calcolato, nessun rilievo riga', async () => {
    const l = L({ tipo: 'fattura', fornitore_id: gries.id, codice_cliente: 'K-100', importo: 26.82, righe: [R({ codice: 'A1', quantita: 2, prezzo: 14.9, sconto: 10 })] });
    const p = await propostaDocumento(db, l);
    const c = await controlliFissi(db, l, p);
    expect(p.importo).toBe(26.82); // importoRigaLetta: 2 × 14,9 × (1 − 10/100)
    expect(c.filter((x) => x.codice === 'riga')).toEqual([]);
  });

  it('codice cliente assente: grave', async () => {
    const l = L({ tipo: 'fattura', fornitore_id: gries.id, codice_cliente: 'ZZZ-999' });
    const c = await controlliFissi(db, l, await propostaDocumento(db, l));
    expect(c).toContainEqual({ codice: 'codice_cliente', campo: 'codice_cliente', testo: 'Codice cliente ZZZ-999 non presente fra i clienti del fornitore', grave: true, gruppo: 'lettura' });
  });

  it('cliente scelto a mano con agenzia per quel codice: nessun rilievo', async () => {
    const l = L({ tipo: 'proforma', fornitore_id: gries.id, codice_cliente: 'K-100', cliente_id: String(c1.id) });
    const c = await controlliFissi(db, l, await propostaDocumento(db, l));
    expect(c.map((x) => x.codice)).not.toContain('codice_cliente');
  });

  it('agenzia da confermare per il cliente scelto: testo «da confermare», non «non presente»', async () => {
    const sub = await db.subagenti.findFirstOrThrow();
    await db.interscambio.create({ data: { subagente_id: sub.id, cliente_id: c1.id, fornitore_id: gasper.id, codice_cliente_fornitore: 'K-DC', valido_dal: giorno('2025-01-01'), da_confermare: true } });
    const l = L({ tipo: 'proforma', fornitore_id: gasper.id, codice_cliente: 'K-DC', cliente_id: String(c1.id) });
    const c = await controlliFissi(db, l, await propostaDocumento(db, l));
    expect(c).toContainEqual({ codice: 'codice_cliente', campo: 'codice_cliente', testo: 'Codice cliente K-DC: agenzia dal vecchio CRM, da confermare', grave: false, gruppo: 'lettura' });
  });

  it('codice di un altro cliente: il testo dice di chi è', async () => {
    const l = L({ tipo: 'proforma', fornitore_id: gries.id, codice_cliente: 'K-200', cliente_id: String(c1.id) });
    const c = await controlliFissi(db, l, await propostaDocumento(db, l));
    expect(c).toContainEqual({ codice: 'codice_cliente', campo: 'codice_cliente', testo: 'Il codice K-200 presso Gries GmbH & Co. KG è di Il Giardino di Sofia srl', grave: true, gruppo: 'lettura' });
  });

  it('articolo assente fra le righe dell\'ordine: avviso con il numero dell\'ordine', async () => {
    await creaPratica({ fornitore_id: gries.id, fornitore_versione_id: gries.versione_id, cliente_id: c1.id, cliente_versione_id: c1.versione_id, numero: 'OF-1', data: '2026-05-01', documenti: [{ tipo: 'ordine', numero: 'AU276839', data: '2026-05-01' }], righe: [{ fase: 'ordine', codice: 'A1', quantita: 2, prezzo: 10 }] });
    const l = L({ tipo: 'fattura', fornitore_id: gries.id, codice_cliente: 'K-100', importo: 10, righe: [R({ codice: 'A9', quantita: 1, prezzo: 10, importo: 10 })] });
    const c = await controlliFissi(db, l, await propostaDocumento(db, l));
    expect(c).toContainEqual({ codice: 'articolo', campo: 'righe[0]', testo: "L'articolo A9 non c'è nell'ordine AU276839: controlla se è un'aggiunta del fornitore", grave: false, gruppo: 'confronto' });
  });

  it('codici uguali a quelli dell\'ordine: nessun punto articolo', async () => {
    await creaPratica({ fornitore_id: gries.id, fornitore_versione_id: gries.versione_id, cliente_id: c1.id, cliente_versione_id: c1.versione_id, numero: 'OF-1', data: '2026-05-01', documenti: [{ tipo: 'ordine', numero: 'AU276839', data: '2026-05-01' }], righe: [{ fase: 'ordine', codice: 'A1', quantita: 2, prezzo: 10 }, { fase: 'ordine', codice: 'A2', quantita: 1, prezzo: 5 }] });
    const l = L({ tipo: 'proforma', fornitore_id: gries.id, codice_cliente: 'K-100', importo: 25, righe: [R({ codice: 'A1', quantita: 2, prezzo: 10, importo: 20 }), R({ codice: 'A2', quantita: 1, prezzo: 5, importo: 5 })] });
    const c = await controlliFissi(db, l, await propostaDocumento(db, l));
    expect(c.map((x) => x.codice)).not.toContain('articolo');
  });

  it('codici con spazi: trattati come uguali (nessun punto articolo)', async () => {
    await creaPratica({ fornitore_id: gries.id, fornitore_versione_id: gries.versione_id, cliente_id: c1.id, cliente_versione_id: c1.versione_id, numero: 'OF-1', data: '2026-05-01', documenti: [{ tipo: 'ordine', numero: 'AU276839', data: '2026-05-01' }], righe: [{ fase: 'ordine', codice: ' A1 ', quantita: 2, prezzo: 10 }] });
    const l = L({ tipo: 'proforma', fornitore_id: gries.id, codice_cliente: 'K-100', importo: 20, righe: [R({ codice: 'A1', quantita: 2, prezzo: 10, importo: 20 })] });
    const c = await controlliFissi(db, l, await propostaDocumento(db, l));
    expect(c.map((x) => x.codice)).not.toContain('articolo');
  });

  it('molti articoli assenti: un solo punto riassuntivo', async () => {
    await creaPratica({ fornitore_id: gries.id, fornitore_versione_id: gries.versione_id, cliente_id: c1.id, cliente_versione_id: c1.versione_id, numero: 'OF-1', data: '2026-05-01', documenti: [{ tipo: 'ordine', numero: 'AU276839', data: '2026-05-01' }], righe: [{ fase: 'ordine', codice: 'A1', quantita: 2, prezzo: 10 }] });
    const l = L({ tipo: 'proforma', fornitore_id: gries.id, codice_cliente: 'K-100', importo: 30, righe: [R({ codice: 'B1', quantita: 1, prezzo: 10, importo: 10 }), R({ codice: 'B2', quantita: 1, prezzo: 10, importo: 10 }), R({ codice: 'B3', quantita: 1, prezzo: 10, importo: 10 })] });
    const c = await controlliFissi(db, l, await propostaDocumento(db, l));
    expect(c.filter((x) => x.codice === 'articolo')).toEqual([{ codice: 'articolo', campo: 'righe', testo: "Nessuna riga in comune con l'ordine AU276839: forse la pratica non è quella giusta", grave: false, gruppo: 'confronto' }]);
  });

  it('data precedente alla data dell\'ordine: non grave', async () => {
    await creaPratica({ fornitore_id: gries.id, fornitore_versione_id: gries.versione_id, cliente_id: c1.id, cliente_versione_id: c1.versione_id, numero: 'OF-1', data: '2026-06-01', righe: [{ fase: 'ordine', codice: 'A1', quantita: 2, prezzo: 10 }] });
    const l = L({ tipo: 'fattura', fornitore_id: gries.id, codice_cliente: 'K-100', data: '2026-05-15', importo: 20, righe: [R({ codice: 'A1', quantita: 2, prezzo: 10, importo: 20 })] });
    const c = await controlliFissi(db, l, await propostaDocumento(db, l));
    expect(c).toContainEqual({ codice: 'data', campo: 'data', testo: 'Data del documento 2026-05-15 precedente alla data dell\'ordine 2026-06-01', grave: false, gruppo: 'confronto' });
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
    expect(c).toContainEqual({ codice: 'bollettino', campo: 'mese', testo: 'Bollettino già registrato per questo fornitore e mese', grave: true, gruppo: 'lettura' });
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

describe('proposta — import da Integra e storico (D-111/D-112)', () => {
  const integraFornitore = (id = 1, ragione = 'Nuovo Fornitore SRL', piva = '12345678901'): RigaIntegra => ({ id_integra: id, ragione_sociale: ragione, piva });
  const integraCliente = (id = 2, ragione = 'Cliente Nuovo SRL', piva = '99999999999'): RigaIntegra => ({ id_integra: id, ragione_sociale: ragione, piva });
  const storico = (over: Partial<RigaStorico> = {}): RigaStorico => ({
    cliente_codice_fornitore: 'K-100', cliente_ragione_sociale: 'Verde Vita snc', cliente_piva: 'IT00000000001',
    subagente_nome: 'Mario Rossi', sconto: 5, rappresentato: true, ...over,
  });

  it('fornitore non in anagrafica con una sola riga in Integra: fornitore_da_integra', async () => {
    const p = await propostaDocumento(db, L({ tipo: 'ordine', fornitore_id: null, numero: 'OF-1' }), { fornitore_su_integra: [integraFornitore()] });
    expect(p.esito).toBe('fornitore_da_integra');
    expect(p.fornitore_da_integra).toMatchObject({ id_integra: 1, ragione_sociale: 'Nuovo Fornitore SRL', piva: '12345678901' });
  });

  it('fornitore non in anagrafica senza candidati: esito di oggi (nessuno)', async () => {
    const p = await propostaDocumento(db, L({ tipo: 'ordine', fornitore_id: null, numero: 'OF-2' }), { fornitore_su_integra: [] });
    expect(p.esito).toBe('nessuno');
    expect(p.fornitore_da_integra).toBeNull();
  });

  it('fornitore non in anagrafica con più righe: mai una scelta a caso', async () => {
    const p = await propostaDocumento(db, L({ tipo: 'ordine', fornitore_id: null, numero: 'OF-3' }), { fornitore_su_integra: [integraFornitore(1, 'Alfa SRL'), integraFornitore(2, 'Beta SRL')] });
    expect(p.esito).not.toBe('fornitore_da_integra');
    expect(p.fornitore_da_integra).toBeNull();
  });

  it('cliente non riconosciuto con coppia nello storico (subagente): cliente_da_integra con sconto', async () => {
    const p = await propostaDocumento(db, L({ tipo: 'ordine', fornitore_id: gasper.id, numero: 'OF-4', codice_cliente: 'ZZZ-9', cliente: 'Sconosciuto SRL' }), { storico: [storico()] });
    expect(p.esito).toBe('cliente_da_integra');
    expect(p.cliente_da_integra).toMatchObject({ id_integra: null, ragione_sociale: 'Verde Vita snc', subagente: 'Mario Rossi', sconto: 5 });
  });

  it('cliente non riconosciuto con una sola riga in Integra: cliente_da_integra senza storico', async () => {
    const p = await propostaDocumento(db, L({ tipo: 'ordine', fornitore_id: gasper.id, numero: 'OF-5', codice_cliente: 'ZZZ-9', cliente: 'Sconosciuto SRL' }), { cliente_su_integra: [integraCliente()] });
    expect(p.esito).toBe('cliente_da_integra');
    expect(p.cliente_da_integra).toMatchObject({ id_integra: 2, ragione_sociale: 'Cliente Nuovo SRL', subagente: null, sconto: null });
  });

  it('manca_rappresentanza: coppia nello storico senza subagente e senza agenzia', async () => {
    const p = await propostaDocumento(db, L({ tipo: 'ordine', fornitore_id: gasper.id, numero: 'OF-6', codice_cliente: 'K-100', piva_cliente: 'IT00000000001', data: '2026-06-01' }), { storico: [storico({ subagente_nome: null, rappresentato: false })] });
    expect(p.esito).toBe('manca_rappresentanza');
    expect(p.agenzia_mancante).toMatchObject({ cliente_id: c1.id, fornitore_id: gasper.id });
    expect(p.manca_rappresentanza).toMatchObject({ cliente: 'Verde Vita snc', fornitore: 'Gasper GmbH' });
  });

  it('senza contesto gli esiti di oggi non cambiano (manca_agenzia resta)', async () => {
    const p = await propostaDocumento(db, L({ tipo: 'ordine', fornitore_id: gasper.id, numero: 'OF-7', codice_cliente: 'K-100', piva_cliente: 'IT00000000001', data: '2026-06-01' }));
    expect(p.esito).toBe('manca_agenzia');
    expect(p.manca_rappresentanza).toBeNull();
    expect(p.fornitore_da_integra).toBeNull();
    expect(p.cliente_da_integra).toBeNull();
  });
});

describe('proposta — candidati da scegliere (D-152)', () => {
  it('cliente scelto a mano: certo, vince su codice/P.IVA/nome (come il fornitore scelto)', async () => {
    const p = await propostaDocumento(db, L({ tipo: 'ordine', fornitore_id: gries.id, numero: 'OF-SCELTO', cliente_id: String(c1.id), piva_cliente: 'IT00000000002' }));
    expect(p.cliente_riconosciuto).toEqual({ cliente_id: c1.id, ragione: 'Verde Vita snc' });
    expect(p.abbinamento).toBeNull(); // il codice non si usa: vale la scelta a mano
  });

  it('cliente scelto a mano inesistente o senza versione: si ignora e si riconosce per P.IVA', async () => {
    const p = await propostaDocumento(db, L({ tipo: 'ordine', fornitore_id: gries.id, numero: 'OF-SCELTO2', cliente_id: '999999', piva_cliente: 'IT00000000001' }));
    expect(p.cliente_riconosciuto).toEqual({ cliente_id: c1.id, ragione: 'Verde Vita snc' });
  });

  it('cliente riconosciuto per P.IVA unica: certo, nessun candidato', async () => {
    const p = await propostaDocumento(db, L({ tipo: 'ordine', fornitore_id: gasper.id, numero: 'OF-152', piva_cliente: 'IT00000000001' }));
    expect(p.cliente_riconosciuto).toMatchObject({ cliente_id: c1.id });
    expect(p.candidati_cliente).toEqual([]);
  });

  it('due clienti con la stessa P.IVA e nome diverso: candidati (D-152)', async () => {
    const a = await creaCliente('Garden Rossi Bergamo srl', '01234567890');
    const b = await creaCliente('Garden Rossi Brescia srl', '01234567890');
    const p = await propostaDocumento(db, L({ tipo: 'ordine', fornitore_id: gasper.id, numero: 'OF-153', piva_cliente: '01234567890', cliente: 'Garden Rossi Verona srl' }));
    expect(p.esito).toBe('cliente_da_scegliere');
    expect(p.candidati_cliente).toHaveLength(2);
    expect(p.candidati_cliente.map((c) => c.id).sort()).toEqual([String(a.id), String(b.id)].sort());
    expect(p.candidati_cliente.every((c) => c.fonte === 'crm' && c.motivo === 'P.IVA uguale')).toBe(true);
  });

  it('fornitore con più nomi simili: candidati dal CRM (nome simile)', async () => {
    await creaFornitore('Arte Wohnaccessoires GmbH & Co. KG');
    await creaFornitore('Arte della Casa SRL');
    const p = await propostaDocumento(db, L({ tipo: 'ordine', fornitore_id: null, fornitore: 'ARTE GmbH', numero: 'OF-154' }));
    expect(p.esito).toBe('fornitore_da_scegliere');
    expect(p.candidati_fornitore.length).toBeGreaterThanOrEqual(2);
    expect(p.candidati_fornitore.every((c) => c.fonte === 'crm' && c.motivo === 'nome simile')).toBe(true);
  });

  it('fornitore con una sola riga di Integra e nessun candidato CRM: certo (come oggi)', async () => {
    const p = await propostaDocumento(db, L({ tipo: 'ordine', fornitore_id: null, fornitore: 'Nuovo Fornitore SRL', numero: 'OF-155' }), { fornitore_su_integra: [{ id_integra: 7, ragione_sociale: 'Nuovo Fornitore SRL', piva: '12345678901' }] });
    expect(p.esito).toBe('fornitore_da_integra');
    expect(p.candidati_fornitore).toEqual([]);
  });

  it('Integra giù: candidati solo dal CRM con la nota', async () => {
    await creaFornitore('Arte Wohnaccessoires GmbH & Co. KG');
    await creaFornitore('Arte della Casa SRL');
    const p = await propostaDocumento(db, L({ tipo: 'ordine', fornitore_id: null, fornitore: 'ARTE GmbH', numero: 'OF-156' }), { fornitore_su_integra: [], integra_non_raggiungibile: true });
    expect(p.esito).toBe('fornitore_da_scegliere');
    expect(p.integra_non_raggiungibile).toBe(true);
    expect(p.candidati_fornitore.every((c) => c.fonte === 'crm')).toBe(true);
  });
});

describe('proposta — filtro per stato delle pratiche suggerite (D-178)', () => {
  // lo stato della pratica è la colonna della testata (aggiornaPratica, D-52): qui si imposta a mano
  async function praticaStato(stato: string, numero: string, documenti: { tipo: string; numero: string; data: string }[] = []) {
    const id = await creaPratica({
      fornitore_id: gries.id, fornitore_versione_id: gries.versione_id, cliente_id: c1.id, cliente_versione_id: c1.versione_id,
      numero, data: '2026-05-01', righe: [{ fase: 'ordine', codice: 'A1', quantita: 2, prezzo: 10 }], documenti,
    });
    await db.ordini_fornitore_testata.update({ where: { id }, data: { stato } });
    return id;
  }
  const fatturaNuova = () => L({ tipo: 'fattura', fornitore_id: gries.id, numero: 'F-NUOVA', codice_cliente: 'K-100', righe: [R({ codice: 'A1', quantita: 2, prezzo: 10, importo: 20 })] });

  it('predefinito «aperte»: la pratica fatturata non è proposta', async () => {
    await praticaStato('fatturato', 'OF-1', [{ tipo: 'fattura', numero: 'F-VECCHIA', data: '2026-06-01' }]);
    const p = await propostaDocumento(db, fatturaNuova(), {}, 'aperte');
    expect(p.candidati).toHaveLength(0);
  });

  it('con «tutte» la pratica fatturata è proposta, col motivo «pratica già fatturata»', async () => {
    await praticaStato('fatturato', 'OF-1', [{ tipo: 'fattura', numero: 'F-VECCHIA', data: '2026-06-01' }]);
    const p = await propostaDocumento(db, fatturaNuova(), {}, 'tutte');
    expect(p.candidati).toHaveLength(1);
    expect(p.candidati[0].motivi).toContain('pratica già fatturata');
  });

  it('«solo_ordine» e «confermata» filtrano per stato', async () => {
    await praticaStato('inviato', 'OF-1');
    await praticaStato('confermato', 'OF-2');
    const l = fatturaNuova();
    const solo = await propostaDocumento(db, l, {}, 'solo_ordine');
    expect(solo.candidati.map((c) => c.pratica.numero)).toEqual(['OF-1']);
    const confermata = await propostaDocumento(db, l, {}, 'confermata');
    expect(confermata.candidati.map((c) => c.pratica.numero)).toEqual(['OF-2']);
  });

  it('valore fuori lista → 400 (DTO)', async () => {
    jest.spyOn(IntegraService.prototype, 'ponte').mockResolvedValue(null);
    await db.utenti.create({ data: {
      username: 'filtro-178', email: 'filtro-178@prova-filtro.it', nome: 'Prova Filtro', ruolo: 'utente',
      aree: { create: [{ area: 'provvigioni', livello: 'lettura' }] },
      password_hash: await cifra('password-di-prova'), deve_cambiare_password: false,
    } });
    const agente = request.agent(app.getHttpServer());
    await agente.post('/api/accesso/entra').send({ utente: 'filtro-178', password: 'password-di-prova' }).expect(200);
    const arrivo = await creaArrivo({ tipo: 'fattura', fornitore_id: gries.id });
    await agente.get(`/api/documenti/${arrivo.id}?filtro=strano`).expect(400);
  });
});

describe('proposta — predefinito dal tipo (15/11/2026)', () => {
  it('filtroDalTipo: nota di credito e pagamento → fatturata, gli altri → aperte', () => {
    expect(filtroDalTipo('nota_credito')).toBe('fatturata');
    expect(filtroDalTipo('pagamento')).toBe('fatturata');
    expect(filtroDalTipo('ordine')).toBe('aperte');
    expect(filtroDalTipo('proforma')).toBe('aperte');
    expect(filtroDalTipo('conferma')).toBe('aperte');
    expect(filtroDalTipo('fattura')).toBe('aperte');
    expect(filtroDalTipo('altro')).toBe('aperte');
    expect(filtroDalTipo(null)).toBe('aperte');
  });

  it('nota di credito senza filtro: il server propone solo le pratiche fatturate', async () => {
    const aperta = await creaPratica({ fornitore_id: gries.id, fornitore_versione_id: gries.versione_id, cliente_id: c1.id, cliente_versione_id: c1.versione_id, numero: 'OF-APERTA', data: '2026-05-01', righe: [{ fase: 'ordine', codice: 'A1', quantita: 2, prezzo: 10 }] });
    await db.ordini_fornitore_testata.update({ where: { id: aperta }, data: { stato: 'inviato' } });
    const fatta = await creaPratica({ fornitore_id: gries.id, fornitore_versione_id: gries.versione_id, cliente_id: c1.id, cliente_versione_id: c1.versione_id, numero: 'OF-FATT', data: '2026-06-01', righe: [{ fase: 'ordine', codice: 'A1', quantita: 2, prezzo: 10 }], documenti: [{ tipo: 'fattura', numero: 'F-1', data: '2026-06-15' }] });
    await db.ordini_fornitore_testata.update({ where: { id: fatta }, data: { stato: 'fatturato' } });

    jest.spyOn(IntegraService.prototype, 'ponte').mockResolvedValue(null);
    await db.utenti.create({ data: {
      username: 'pred-178', email: 'pred-178@prova-pred.it', nome: 'Prova Pred', ruolo: 'utente',
      aree: { create: [{ area: 'provvigioni', livello: 'lettura' }] },
      password_hash: await cifra('password-di-prova'), deve_cambiare_password: false,
    } });
    const agente = request.agent(app.getHttpServer());
    await agente.post('/api/accesso/entra').send({ utente: 'pred-178', password: 'password-di-prova' }).expect(200);
    const arrivo = await creaArrivo({ tipo: 'nota_credito', fornitore_id: gries.id, campi: [
      ['numero', 'NC-1', 0.95], ['codice_cliente', 'K-100', 0.95],
      ['righe[0].codice', 'A1', 0.95], ['righe[0].quantita', '2', 0.95], ['righe[0].prezzo', '10', 0.95], ['righe[0].importo', '20', 0.95],
    ] });
    const r = await agente.get(`/api/documenti/${arrivo.id}`).expect(200);
    const candidati = r.body.proposta.candidati as { pratica: { numero: string } }[];
    expect(candidati.map((c) => c.pratica.numero)).toEqual(['OF-FATT']);
  });
});
