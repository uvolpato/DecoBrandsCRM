import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import ExcelJS from 'exceljs';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { sofficeDisponibile } from '../src/esporta-liquidazione';
import { configura } from '../src/main';
import { cifra } from '../src/password';
import { PrismaService } from '../src/prisma.service';
import { seed } from '../prisma/seed';
import { prototipo } from './prototipo';
import { svuota } from './svuota';

// F4-A5: pagina Analisi (§7.22, §11, D-18, D-19, D-22, D-23, D-60). I numeri vengono dal motore
// (`fattiAnalisi`) e si confrontano con il prototipo, che resta la fonte degli attesi.

/* eslint-disable @typescript-eslint/no-explicit-any */
let app: NestExpressApplication;
let db: PrismaService;
let M: any;
const DOMINIO = '@prova-analisi.it';
const PW = 'password-di-prova';
const j = (x: unknown) => JSON.parse(JSON.stringify(x ?? null));

async function creaUtente(username: string, livello: string, area = 'provvigioni') {
  await db.utenti.create({
    data: {
      username, email: username + DOMINIO, nome: 'Prova ' + username, ruolo: 'utente',
      aree: { create: [{ area, livello }] }, password_hash: await cifra(PW), deve_cambiare_password: false,
    },
  });
}
async function entra(utente: string) {
  const agente = request.agent(app.getHttpServer());
  const csrf = (await agente.post('/api/accesso/entra').send({ utente, password: PW }).expect(200)).body.csrf as string;
  return { get: (p: string) => agente.get('/api' + p), post: (p: string, b: object = {}) => agente.post('/api' + p).set('x-csrf-token', csrf).send(b) };
}
let resp: Awaited<ReturnType<typeof entra>>, dati: Awaited<ReturnType<typeof entra>>, lett: Awaited<ReturnType<typeof entra>>;

const fornitoreId = async (breve: string) =>
  String((await db.fornitori_versioni.findFirstOrThrow({ where: { ragione_sociale: { startsWith: breve } } })).fornitore_id);
const clienteId = async (piva: string) => String((await db.clienti_versioni.findFirstOrThrow({ where: { piva } })).cliente_id);
const subagenteId = async (nome: string, cognome: string) => String((await db.subagenti.findFirstOrThrow({ where: { nome, cognome } })).id);

const nel = (r: any, da: string, a: string) => r.mese >= da && r.mese <= a;
/** Gli stessi totali della pagina (V12), calcolati sui fatti del prototipo. */
const somma = (rr: any[]) => ({
  fatturato: M.r2(rr.reduce((s: number, r: any) => s + r.importo, 0)),
  prese: M.r2(rr.reduce((s: number, r: any) => s + r.prese, 0)),
  pagate: M.r2(rr.reduce((s: number, r: any) => s + r.pagate, 0)),
  margine: M.r2(rr.reduce((s: number, r: any) => s + r.margine, 0)),
  documenti: rr.filter((r: any) => r.tipo === 'fattura').length,
  clienti: new Set(rr.map((r: any) => r.cliente)).size,
});
const atteso = (da: string, a: string, cond: (r: any) => boolean = () => true) => somma(M.fattiAnalisi().filter((r: any) => nel(r, da, a) && cond(r)));
const numeri = (b: any) => ({
  fatturato: b.numeri.fatturato, prese: b.numeri.prese, pagate: b.numeri.pagate, margine: b.numeri.margine,
  documenti: b.numeri.documenti, clienti: b.numeri.clienti,
});
const variazione = (v: number, p: number) => (Math.abs(p) < 0.01 ? null : Math.round((100 * (v - p)) / Math.abs(p)));
const pagina = async (p = '') => (await resp.get('/analisi' + p).expect(200)).body;

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
  db = app.get(PrismaService);
  await svuota(db);
  await seed(db);
  await creaUtente('resp-analisi', 'responsabile');
  await creaUtente('dati-analisi', 'responsabile', 'dati');
  await creaUtente('lett-analisi', 'lettura');
  [resp, dati, lett] = await Promise.all([entra('resp-analisi'), entra('dati-analisi'), entra('lett-analisi')]);
  M = prototipo();
}, 120_000);

afterAll(async () => {
  const utenti = (await db.utenti.findMany({ where: { email: { endsWith: DOMINIO } } })).map((u) => u.id);
  await svuota(db);
  await db.$transaction([
    db.$executeRaw`SET LOCAL decobrands.pulizia_registro = 'si'`,
    db.registro.deleteMany({ where: { utente_id: { in: utenti } } }),
    db.sessioni.deleteMany({ where: { utente_id: { in: utenti } } }),
    db.utenti.deleteMany({ where: { id: { in: utenti } } }),
  ]);
  await app.close();
});

describe('GET /api/analisi', () => {
  it('periodo predefinito: gli ultimi 12 mesi con dati', async () => {
    const b = await pagina();
    expect(b.periodo).toMatchObject({ da: '2025-10', a: '2026-09', primo: '2025-01', ultimo: '2026-09', mesi: 12 });
    expect(b.precedente).toEqual({ da: '2024-10', a: '2025-09' });
    expect(b.confronto).toEqual({ possibile: true, etichetta: 'sullo stesso periodo dell’anno prima' });
  });

  it('i 4 numeri e il confronto con il periodo precedente come il prototipo', async () => {
    const b = await pagina('?dal=2025-10&al=2026-09');
    const ora = atteso('2025-10', '2026-09'), prima = atteso('2024-10', '2025-09');
    expect(numeri(b)).toEqual(j(ora));
    expect(b.numeri.precedente).toEqual(j({ fatturato: prima.fatturato, prese: prima.prese, pagate: prima.pagate, margine: prima.margine }));
    expect(b.numeri.variazione).toEqual({
      fatturato: variazione(ora.fatturato, prima.fatturato), prese: variazione(ora.prese, prima.prese),
      pagate: variazione(ora.pagate, prima.pagate), margine: variazione(ora.margine, prima.margine),
    });
    // i numeri del prototipo sul seed (§12)
    expect(numeri(b)).toEqual(j({ fatturato: 79534.06, prese: 12976.26, pagate: 4127.34, margine: 8848.92, documenti: 19, clienti: 7 }));
  });

  it('durata di 6 mesi: periodo precedente della stessa durata', async () => {
    const b = await pagina('?dal=2026-01&al=2026-06');
    expect(b.periodo).toMatchObject({ da: '2026-01', a: '2026-06', mesi: 6 });
    expect(b.precedente).toEqual({ da: '2025-07', a: '2025-12' });
    expect(b.confronto.etichetta).toBe('sui 6 mesi prima');
    expect(numeri(b)).toEqual(j(atteso('2026-01', '2026-06')));
    expect(b.numeri.precedente.fatturato).toBe(atteso('2025-07', '2025-12').fatturato);
  });

  it('i 4 grafici: andamento con i mesi vuoti, fornitori, subagenti, primi 10 clienti', async () => {
    const b = await pagina('?dal=2025-10&al=2026-09');
    const perMese = (m: string) => atteso(m, m);
    expect(b.grafici.andamento.mesi).toEqual(['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09']);
    expect(b.grafici.andamento.serie.map((s: any) => s.nome)).toEqual(['Dai fornitori', 'Ai subagenti', 'Margine']);
    expect(b.grafici.andamento.serie[0].valori).toEqual(b.grafici.andamento.mesi.map((m: string) => perMese(m).prese));
    expect(b.grafici.andamento.serie[2].tipo).toBe('line');

    const fo = atteso('2025-10', '2026-09');
    expect(b.grafici.fornitori.etichette.length).toBe(8); // 8 fornitori: nessun "Altri"
    expect(b.grafici.fornitori.valori.reduce((s: number, x: number) => s + x, 0)).toBeCloseTo(fo.fatturato, 2);
    expect(b.grafici.clienti.etichette.length).toBeLessThanOrEqual(10);
    expect(b.grafici.clienti.valori.reduce((s: number, x: number) => s + x, 0)).toBeLessThanOrEqual(fo.fatturato + 0.01);
    const sub = M.fattiAnalisi().filter((r: any) => nel(r, '2025-10', '2026-09'));
    expect(b.grafici.subagenti.etichette.length).toBe(new Set(sub.map((r: any) => r.subagente_id)).size);
    expect(b.grafici.subagenti.serie.map((s: any) => s.nome)).toEqual(['Al subagente', 'Margine Decobrands']);
  });

  it('tabella raggruppata: subagente (predefinito), fornitore, cliente, mese, documenti', async () => {
    const sub = await pagina('?dal=2025-10&al=2026-09');
    expect(sub.tabella.raggruppa).toBe('subagente');
    const sommaRighe = (b: any) => M.r2(b.tabella.righe.reduce((s: number, r: any) => s + r.fatturato, 0));
    expect(sommaRighe(sub)).toBe(sub.numeri.fatturato);
    expect(sub.tabella.righe.map((r: any) => r.nome)).toEqual(['Elisa Ravelli', 'Stefano Bastasin', 'Marco Nista', 'Giorgio Pontoglio']);
    expect(sub.tabella.righe.reduce((s: number, r: any) => s + r.quota, 0)).toBeCloseTo(100, 1);

    for (const [g, chiave] of [['fornitore', 'fornitore_id'], ['cliente', 'cliente']] as const) {
      const b = await pagina(`?dal=2025-10&al=2026-09&raggruppa=${g}`);
      expect(b.tabella.raggruppa).toBe(g);
      expect(b.tabella.righe.length).toBe(new Set(M.fattiAnalisi().filter((r: any) => nel(r, '2025-10', '2026-09')).map((r: any) => r[chiave])).size);
      expect(sommaRighe(b)).toBe(b.numeri.fatturato);
    }
    const mese = await pagina('?dal=2025-10&al=2026-09&raggruppa=mese');
    expect(mese.tabella.righe.map((r: any) => r.chiave)).toEqual(
      [...new Set(M.fattiAnalisi().filter((r: any) => nel(r, '2025-10', '2026-09')).map((r: any) => r.mese))].sort());
    const doc = await pagina('?dal=2025-10&al=2026-09&raggruppa=documento');
    expect(doc.tabella.totale).toBe(M.fattiAnalisi().filter((r: any) => nel(r, '2025-10', '2026-09')).length);
    expect(doc.tabella.righe.length).toBe(doc.tabella.totale);
    expect(doc.tabella.righe[0]).toMatchObject({ numero: expect.any(String), pratica_id: expect.any(String), fatturato: expect.any(Number) });
  });
});

describe('filtri (D-22) e voci dei campi (D-23)', () => {
  it('filtro multiplo: voci dello stesso campo in o, campi diversi in e', async () => {
    const gries = await fornitoreId('Gries'), gasper = await fornitoreId('Gasper');
    const piva = (await db.clienti_versioni.findFirstOrThrow({ where: { ragione_sociale: { startsWith: 'Orti Urbani' } } })).piva!;
    const orti = await clienteId(piva);
    const b = await pagina(`?dal=2025-10&al=2026-09&fornitori=${gries},${gasper}`);
    const due = atteso('2025-10', '2026-09', (r) => ['Gries', 'Gasper'].includes(r.fornitore));
    expect(numeri(b)).toEqual(j(due));

    const bc = await pagina(`?dal=2025-10&al=2026-09&fornitori=${gries},${gasper}&clienti=${orti}`);
    expect(numeri(bc)).toEqual(j(atteso('2025-10', '2026-09', (r) => ['Gries', 'Gasper'].includes(r.fornitore) && r.cliente === piva)));
    // le voci proposte tengono gli altri filtri: con Orti Urbani, Gries e Gasper restano solo quelli con documenti per lui
    expect(bc.voci.fornitori).toEqual([gries, gasper].filter((id) => bc.voci.fornitori.includes(id)));
    expect(bc.voci.clienti.length).toBe(new Set(M.fattiAnalisi().filter((r: any) => nel(r, '2025-10', '2026-09') && ['Gries', 'Gasper'].includes(r.fornitore)).map((r: any) => r.cliente)).size);
  });

  it('filtro incrociato: il raggruppamento filtra la pagina e i grafici ignorano il proprio filtro', async () => {
    const gries = await fornitoreId('Gries');
    const stefano = await subagenteId('Stefano', 'Bastasin');
    const b = await pagina(`?dal=2025-10&al=2026-09&raggruppa=fornitore&fornitori=${gries}&subagenti=${stefano}`);
    expect(b.tabella.righe.map((r: any) => r.chiave)).toEqual([gries]);
    expect(numeri(b)).toEqual(j(atteso('2025-10', '2026-09', (r) => r.fornitore === 'Gries' && r.subagente === 'Stefano Bastasin')));
    // il grafico dei fornitori ignora il filtro fornitori: c'è Gries e ci sono gli altri
    expect(b.grafici.fornitori.chiavi).toContain(gries);
    expect(b.grafici.fornitori.chiavi.length).toBeGreaterThan(1);
    // il grafico dei subagenti ignora il filtro subagenti
    expect(b.grafici.subagenti.chiavi.length).toBeGreaterThan(1);
    // il proprio grafico è evidenziato sugli indici scelti (lato pagina: chiavi e filtro)
    expect(b.tabella.righe[0].nome).toBe('Gries GmbH & Co. KG');
  });
});

describe('regole e permessi', () => {
  it('un pagamento o una proforma non cambiano i numeri (D-60)', async () => {
    const prima = await pagina('?dal=2025-10&al=2026-09&raggruppa=documento');
    const pratica = await db.ordini_fornitore_testata.findFirstOrThrow({ where: { documenti: { some: { tipo: 'fattura' } } }, orderBy: { id: 'asc' } });
    const creati = await db.$transaction([
      db.ordini_fornitore_documenti.create({ data: { testata_id: pratica.id, tipo: 'proforma', numero: 'PRO-FORMA-1', data: new Date('2026-06-10'), importo: 5000 } }),
      db.ordini_fornitore_documenti.create({ data: { testata_id: pratica.id, tipo: 'pagamento', numero: 'PAG-1', data: new Date('2026-06-20'), importo: 5000 } }),
    ]);
    try {
      const dopo = await pagina('?dal=2025-10&al=2026-09&raggruppa=documento');
      expect(j(dopo)).toEqual(j(prima));
    } finally {
      await db.ordini_fornitore_documenti.deleteMany({ where: { id: { in: creati.map((d) => d.id) } } });
    }
  });

  it('sola lettura consulta ed esporta; senza l’area provvigioni 403', async () => {
    expect((await lett.get('/analisi').expect(200)).body.numeri.fatturato).toBeGreaterThan(0);
    await lett.get('/analisi/esporta?formato=csv').expect(200);
    await dati.get('/analisi').expect(403);
    await dati.get('/analisi/esporta?formato=csv').expect(403);
  });

  it('parametri sbagliati: 400', async () => {
    await resp.get('/analisi?dal=2026-13').expect(400);
    await resp.get('/analisi?dal=2026-09&al=2026-01').expect(400);
    await resp.get('/analisi?raggruppa=piva').expect(400);
    await resp.get('/analisi?fornitori=abc').expect(400);
    await resp.get('/analisi/esporta?formato=doc').expect(400);
  });

  it('senza documenti: numeri a zero, grafici e tabella vuoti', async () => {
    const b = await pagina('?dal=2025-10&al=2026-09&fornitori=999999');
    expect(numeri(b)).toEqual({ fatturato: 0, prese: 0, pagate: 0, margine: 0, documenti: 0, clienti: 0 });
    // il grafico dei fornitori ignora il proprio filtro (D-18): resta cliccabile per sceglierne uno
    expect(b.grafici.fornitori.etichette.length).toBe(8);
    expect(b.grafici.andamento.serie[0].valori.every((v: number) => v === 0)).toBe(true);
    expect(b.tabella.righe).toEqual([]);
    expect(b.tabella.totale).toBe(0);
  });
});

describe('GET /api/analisi/esporta', () => {
  const bin = (res: request.Response, cb: (e: Error | null, b: Buffer) => void) => {
    const pezzi: Buffer[] = [];
    res.on('data', (c: Buffer) => pezzi.push(c));
    res.on('end', () => cb(null, Buffer.concat(pezzi)));
  };
  const file = async (p: string) => (await resp.get('/analisi/esporta?' + p).buffer(true).parse(bin).expect(200));

  it('Excel: fogli, intestazioni e totali uguali alla pagina', async () => {
    const r = await file('dal=2025-10&al=2026-09');
    expect(r.headers['content-type']).toContain('spreadsheetml');
    expect(r.headers['content-disposition']).toBe('attachment; filename="Analisi_2025-10_2026-09.xlsx"');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(r.body as unknown as ArrayBuffer); // supertest dà i byte; ExcelJS vuole un ArrayBuffer
    expect(wb.worksheets.map((w) => w.name)).toEqual(['Riepilogo', 'Per subagente', 'Per fornitore', 'Per cliente', 'Per mese', 'Documenti']);

    const b = await pagina('?dal=2025-10&al=2026-09');
    const riepilogo = wb.getWorksheet('Riepilogo')!;
    const riga = (voce: string) => {
      for (let i = 1; i <= riepilogo.rowCount; i++) {
        const celle = riepilogo.getRow(i);
        if (celle.getCell(1).value === voce) return celle.values as any[];
      }
      throw new Error('voce non trovata: ' + voce);
    };
    expect(riga('Fatturato dei clienti').slice(2, 5)).toEqual([b.numeri.fatturato, b.numeri.precedente.fatturato, expect.any(Number)]);
    expect(riga('Margine Decobrands')[2]).toBe(b.numeri.margine);

    const doc = wb.getWorksheet('Documenti')!;
    const totale = doc.lastRow!;
    expect(totale.getCell(6).value).toMatchObject({ formula: expect.stringMatching(/^SUM\(/), result: b.numeri.fatturato });
    expect(totale.getCell(9).value).toMatchObject({ result: b.numeri.margine });
    expect(doc.getRow(5).getCell(2).value).toEqual(expect.any(String)); // prima riga di dati
  });

  it('CSV: BOM, separatore ; e virgola decimale, somma uguale alla pagina', async () => {
    const r = await file('dal=2025-10&al=2026-09&formato=csv&fornitori=' + (await fornitoreId('Gries')));
    expect(r.headers['content-type']).toContain('text/csv');
    expect(r.headers['content-disposition']).toBe('attachment; filename="Analisi_2025-10_2026-09_filtrata.csv"');
    const buf = r.body as Buffer;
    expect([buf[0], buf[1], buf[2]]).toEqual([0xef, 0xbb, 0xbf]);
    const righe = buf.toString('utf8').slice(1).split('\r\n');
    expect(righe[0]).toBe('Data;Documento;Tipo;Fornitore;Partita IVA cliente;Cliente;Subagente;Fatturato;Dai fornitori;Ai subagenti;Margine');
    const b = await pagina('?dal=2025-10&al=2026-09&fornitori=' + (await fornitoreId('Gries')));
    expect(righe.length - 1).toBe(b.tabella.totale);
    const totale = righe.slice(1).reduce((s, x) => s + Number(x.split(';')[7].replace(',', '.')), 0);
    expect(M.r2(totale)).toBe(b.numeri.fatturato);
    expect(righe[1]).toMatch(/^\d{2}\/\d{2}\/\d{4};/);
  });

  (sofficeDisponibile() ? it : it.skip)('PDF: il medesimo .xlsx convertito, inizia con %PDF-', async () => {
    const r = await file('dal=2025-10&al=2026-09&formato=pdf');
    expect(r.headers['content-type']).toBe('application/pdf');
    expect(r.headers['content-disposition']).toBe('attachment; filename="Analisi_2025-10_2026-09.pdf"');
    const buf = r.body as Buffer;
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buf.length).toBeGreaterThan(1000);
  }, 180_000);
});
