// Prova del numero d'ordine del fornitore (D-169, P1): aggancio prima di tutto il resto, eredità di
// cliente/fornitore/agenzia dalla pratica, verifica del cliente (D-169 4b), più pratiche con lo stesso
// numero → da scegliere, documento senza numero → riconoscimento di prima. Nessuna rete: funzioni pure.
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import { configura } from '../src/main';
import { PrismaService } from '../src/prisma.service';
import { estraiNumeroOrdine, testiDaGrezza } from '../src/documenti';
import { controlliFissi, propostaDocumento, type Letto } from '../src/proposta';
import { svuota } from './svuota';

let app: NestExpressApplication;
let db: PrismaService;
let n = 0;

const L = (over: Partial<Letto>): Letto => ({
  tipo: null, fornitore_id: null, fornitore: null, numero: null, numero_ordine_fornitore: null, data: null, codice_cliente: null, cliente: null, cliente_id: null, piva_cliente: null,
  importo: null, mese: null, anno: null, riferimento_fattura: null, righe: [],
  ...over,
});

const giorno = (s: string) => new Date(s + 'T00:00:00Z');

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

/** Una pratica marchiata col numero d'ordine del fornitore, con agenzia cliente × fornitore. */
async function creaPratica(f: { id: bigint; versione_id: bigint }, c: { id: bigint; versione_id: bigint }, sub: bigint, numeroOrdineFornitore: string, numero = 'OF/2026/001') {
  const t = await db.ordini_fornitore_testata.create({
    data: {
      fornitore_id: f.id, fornitore_versione_id: f.versione_id, cliente_id: c.id, cliente_versione_id: c.versione_id,
      numero_ordine: numero, numero_ordine_fornitore: numeroOrdineFornitore, data_ordine: giorno('2026-04-08'),
    },
  });
  await db.interscambio.create({ data: { subagente_id: sub, cliente_id: c.id, fornitore_id: f.id, codice_cliente_fornitore: '45172', valido_dal: giorno('2025-01-01') } });
  return t.id;
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
});

describe('estraiNumeroOrdine (D-170)', () => {
  it('ricava il codice dalla dizione Auftrag/Order/Bestellung/Ordine n.', () => {
    expect(estraiNumeroOrdine('Auftrag AU276839 del 01/04/2026')).toBe('AU276839');
    expect(estraiNumeroOrdine('Ihre Bestellung AU-276839')).toBe('AU-276839'.replace(/\s+/g, '').toUpperCase());
    expect(estraiNumeroOrdine('Order Nr. 102848')).toBe('102848');
    expect(estraiNumeroOrdine('Rif. ordine 45172')).toBe('45172');
    expect(estraiNumeroOrdine('nessun numero d’ordine qui')).toBeNull();
  });
  it('testiDaGrezza raccoglie tutte le stringhe del JSON', () => {
    const testi = testiDaGrezza({ a: 'uno', b: [{ c: 'due' }], n: 3, result: { numero_ordine_fornitore: 'AU276839' } });
    expect(testi).toEqual(['uno', 'due', 'AU276839']);
  });
});

describe('aggancio per numero d’ordine del fornitore (D-169)', () => {
  let arte: { id: bigint; versione_id: bigint };
  let gasper: { id: bigint; versione_id: bigint };
  let agri: { id: bigint; versione_id: bigint };
  let altro: { id: bigint; versione_id: bigint };
  let sub: bigint;

  beforeEach(async () => {
    arte = await creaFornitore('Arte Wohnaccessories GmbH & Co. KG');
    gasper = await creaFornitore('Gasper GmbH');
    agri = await creaCliente('Agri Aggio srl', 'IT00000000001');
    altro = await creaCliente('Altro Cliente snc', 'IT00000000002');
    const agente = await db.agenti.create({ data: { codice: 'DECO', nome: 'Decobrands', cognome: 'SRL' } });
    const s = await db.subagenti.create({ data: { agente_id: agente.id, codice: 'SUB1', nome: 'Mario', cognome: 'Rossi' } });
    sub = s.id;
  });

  it('proforma che cita l’ordine: aggancio certo alla pratica, cliente che coincide (nessun punto)', async () => {
    await creaPratica(arte, agri, sub, 'AU276839');
    const p = await propostaDocumento(db, L({ tipo: 'proforma', fornitore_id: arte.id, numero: 'PR102848', numero_ordine_fornitore: 'AU276839', codice_cliente: '45172', cliente: 'Agri Aggio srl' }));
    expect(p.esito).toBe('certo');
    expect(p.candidati[0].motivi[0]).toContain('AU276839');
    expect(p.pratica_ordine).not.toBeNull();
    expect(p.pratica_ordine!.pratica.numero_ordine_fornitore).toBe('AU276839');
    expect(p.pratica_ordine!.cliente_coincide).toBe(true);
    // per codice cliente (45172 → agenzia di Agri Aggio) il cliente coincide: nessun punto da controllare
    const controlli = await controlliFissi(db, L({ tipo: 'proforma', fornitore_id: arte.id, numero_ordine_fornitore: 'AU276839', codice_cliente: '45172', cliente: 'Agri Aggio srl' }), p);
    expect(controlli.filter((c) => c.codice === 'cliente_ordine')).toEqual([]);
  });

  it('cliente diverso da quello della pratica: punto da controllare, mai abbinato da solo', async () => {
    await creaPratica(arte, agri, sub, 'AU276839');
    const l = L({ tipo: 'fattura', fornitore_id: arte.id, numero: 'F-1', numero_ordine_fornitore: 'AU276839', piva_cliente: 'IT00000000002' });
    const p = await propostaDocumento(db, l);
    expect(p.esito).toBe('certo');
    expect(p.pratica_ordine!.cliente_coincide).toBe(false);
    expect(p.abbinamento).toBeNull(); // mai abbinato da solo
    const controlli = await controlliFissi(db, l, p);
    expect(controlli.some((c) => c.codice === 'cliente_ordine' && c.testo.includes('AU276839'))).toBe(true);
  });

  it('fornitore non riconosciuto e due pratiche con lo stesso numero: da scegliere, mai a caso', async () => {
    await creaPratica(arte, agri, sub, 'AU276839', 'OF/2026/001');
    await creaPratica(gasper, altro, sub, 'AU276839', 'OF/2026/002');
    const p = await propostaDocumento(db, L({ tipo: 'proforma', fornitore_id: null, numero: 'PR102848', numero_ordine_fornitore: 'AU276839' }));
    expect(p.esito).toBe('ambiguo');
    expect(p.candidati).toHaveLength(2);
    expect(p.pratica_ordine).toBeNull(); // mai agganciato da solo
  });

  it('documento senza numero d’ordine: riconoscimento di prima (non si entra nell’aggancio)', async () => {
    await creaPratica(arte, agri, sub, 'AU276839');
    const p = await propostaDocumento(db, L({ tipo: 'fattura', fornitore_id: arte.id, numero: 'F-2', codice_cliente: '45172' }));
    // con codice cliente abbinato l'esito è quello classico (nuova/probabile), non certo per numero d'ordine
    expect(p.pratica_ordine).toBeNull();
  });

  it('proforma con cliente scelto a mano e agenzia per il codice: cliente riconosciuto, nessun rilievo (E di Ugo)', async () => {
    await creaPratica(arte, agri, sub, 'AU276839');
    const l = L({ tipo: 'proforma', fornitore_id: arte.id, numero: 'PR102848', codice_cliente: '45172', cliente: 'Agri Aggio srl', cliente_id: String(agri.id), piva_cliente: '04364290264', data: '2026-04-08' });
    const p = await propostaDocumento(db, l);
    // il cliente scelto a mano deve risultare riconosciuto (non null), anche per la proforma
    expect(p.cliente_riconosciuto).not.toBeNull();
    expect(p.cliente_riconosciuto!.cliente_id).toBe(agri.id);
    const controlli = await controlliFissi(db, l, p);
    expect(controlli.filter((c) => c.codice === 'codice_cliente')).toEqual([]);
  });
});
