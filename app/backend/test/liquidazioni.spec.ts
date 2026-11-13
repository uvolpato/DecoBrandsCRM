import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import ExcelJS from 'exceljs';
import request from 'supertest';
import { sofficeDisponibile } from '../src/esporta-liquidazione';
import { cella as cellaCsv } from '../src/csv';
import { AppModule } from '../src/app.module';
import { configura } from '../src/main';
import { caricaDati, giornoRoma, ultimaChiusura } from '../src/motore/dati';
import { fotografiaLiquidazione, righeLiquidazione, trimestre } from '../src/motore/motore';
import { cifra } from '../src/password';
import { PrismaService } from '../src/prisma.service';
import * as registro from '../src/registro';
import { seed } from '../prisma/seed';
import { prototipo } from './prototipo';
import { svuota } from './svuota';

// F4-A1: trimestri, subagenti con i totali, chiusura del trimestre (§7.8, §4.2.19, D-11, D-33, D-51).

/* eslint-disable @typescript-eslint/no-explicit-any */
let app: NestExpressApplication;
let db: PrismaService;
let M: any;
const DOMINIO = '@prova-liquidazioni.it';
const PW = 'password-di-prova';
const OGGI = giornoRoma(new Date()); // lo stesso "oggi" del server
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
  return {
    get: (p: string) => agente.get('/api' + p),
    post: (p: string, b: object = {}) => agente.post('/api' + p).set('x-csrf-token', csrf).send(b),
  };
}
let resp: Awaited<ReturnType<typeof entra>>, op: Awaited<ReturnType<typeof entra>>, lett: Awaited<ReturnType<typeof entra>>, dati: Awaited<ReturnType<typeof entra>>;

const fornitore = async (nome: string) => (await db.fornitori_versioni.findFirstOrThrow({ where: { ragione_sociale: { startsWith: nome } } })).fornitore_id;
const pagina = async (a: number, t: number) => (await resp.get(`/liquidazioni?anno=${a}&trimestre=${t}`).expect(200)).body;
const SENZA_PAGINA = (b: any) => ({ ...b, trimestri: b.trimestri.map((q: any) => ({ ...q, etichetta: undefined })) });
const dataIt = (s: string) => s.split('-').reverse().join('/');

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
  db = app.get(PrismaService);
  await svuota(db);
  await seed(db);
  await creaUtente('resp-liq', 'responsabile');
  await creaUtente('op-liq', 'operatore');
  await creaUtente('lett-liq', 'lettura');
  await creaUtente('dati-liq', 'responsabile', 'dati');
  [resp, op, lett, dati] = await Promise.all([entra('resp-liq'), entra('op-liq'), entra('lett-liq'), entra('dati-liq')]);
  M = prototipo();
  M.S.oggi = OGGI;
}, 120_000);

afterAll(async () => {
  jest.restoreAllMocks();
  const utenti = (await db.utenti.findMany({ where: { email: { endsWith: DOMINIO } } })).map((u) => u.id);
  await svuota(db); // prima le liquidazioni: puntano agli utenti di prova
  await db.$transaction([
    db.$executeRaw`SET LOCAL decobrands.pulizia_registro = 'si'`,
    db.registro.deleteMany({ where: { utente_id: { in: utenti } } }),
    db.sessioni.deleteMany({ where: { utente_id: { in: utenti } } }),
    db.utenti.deleteMany({ where: { id: { in: utenti } } }),
  ]);
  await app.close();
});

describe('GET /api/liquidazioni', () => {
  it('stati dei trimestri e subagenti dei trimestri aperti come il prototipo', async () => {
    for (const t of [1, 2, 3, 4]) {
      const b = await pagina(2026, t);
      expect(b.trimestri.map((q: any) => q.chiave)).toEqual([1, 2, 3, 4].map((q) => M.statoTrimestre(2026, q).chiave));
      if (b.stato.chiave === 'chiusa' || b.stato.chiave === 'futura') continue;
      const loro = M.righeLiquidazione(2026, t);
      const somma = (rr: any[]) => M.r2(rr.reduce((s: number, r: any) => s + r.provvigione, 0));
      const attesi = M.S.subagenti.map((s: any) => {
        const rr = loro.filter((r: any) => r.subagente_id === s.id);
        return [s.nome, rr.length, somma(rr.filter((r: any) => r.liquidabile)), somma(rr.filter((r: any) => !r.liquidabile)), rr.filter((r: any) => r.voce === 'storno').length];
      }).filter((x: any) => x[1]).sort((x: any, y: any) => x[0].localeCompare(y[0]));
      expect(b.subagenti.map((s: any) => [s.nome, s.documenti, s.provvigione, s.in_attesa, s.storni])).toEqual(j(attesi));
      expect(b.senza_documenti).toBe(M.S.subagenti.length - attesi.length);
      expect(b.riepilogo.bloccanti).toBe(loro.filter((r: any) => !r.liquidabile && !r.incasso).length);
      expect(b.trimestri[t - 1].totale).toBe(b.riepilogo.provvigione);
      // totali degli importi dal server (D-126 §19): il piede li mostra senza sommare
      expect(b.totali.subagenti.provvigione).toBe(b.riepilogo.provvigione);
      expect(b.totali.documenti.provvigione).toBeCloseTo(M.r2(loro.reduce((s: number, r: any) => s + r.provvigione, 0)), 2);
      // i documenti del trimestre: stessi numeri del prototipo, nomi risolti e stato deciso dal server (V12)
      expect(b.documenti.map((x: any) => [x.numero, x.tipo, x.data, x.cliente, x.fornitore, x.subagente, x.codice_cliente, x.imponibile, x.pct, x.provvigione, x.liquidabile, x.incasso, x.voce]))
        .toEqual(loro.map((r: any) => [r.doc.numero, r.doc.tipo, r.doc.data, M.nomeCliente(r.cliente), r.fornitore.nome, M.subagente(r.subagente_id).nome, r.codice_cliente, r.importo, r.pct, r.provvigione, r.liquidabile, r.incasso, r.voce ?? null]));
      for (const x of b.documenti) {
        if (x.voce) continue; // storni e riaccrediti hanno l'etichetta della voce (prova sotto)
        expect(x.stato.etichetta).toBe(x.liquidabile ? 'Liquidabile' : x.incasso ? 'Attesa incasso' : 'In attesa');
        expect(!!x.motivo_testo).toBe(!x.liquidabile);
      }
    }
  });

  it('storno e riaccredito: voce con segno, fattura d’origine e trimestre (D-11)', async () => {
    // caso costruito: il bollettino di agosto di Gasper (che contiene lo storno) viene chiuso; poi torna com'era
    const gasper = await fornitore('Gasper');
    const dove = { fornitore_id: gasper, anno: 2026, mese: 8 };
    const b0 = await db.bollettini_testata.findFirstOrThrow({ where: dove, include: { righe: true } });
    const riga = b0.righe.find((r) => r.tipo_riga === 'storno')!;
    const ugo = (await db.utenti.findFirstOrThrow({ where: { username: 'ugo' } })).id;
    await db.bollettini_testata.updateMany({ where: dove, data: { stato: 'verificato', chiuso_il: new Date('2026-09-10T10:00:00Z'), chiuso_da: ugo } });
    try {
      const voce = (await pagina(2026, 3)).documenti.find((x: any) => x.voce === 'storno');
      expect(voce).toMatchObject({ stato: { etichetta: 'Storno: cliente non pagante', variante: 'errore' }, voce: 'storno' });
      expect(voce.provvigione).toBeLessThan(0);
      expect(voce.motivo_testo).toBe(`Storno: il cliente non ha pagato la fattura del ${dataIt(voce.origine)} (2° trimestre 2026; bollettino di agosto)`);
      await db.bollettini_righe.update({ where: { id: riga.id }, data: { tipo_riga: 'riaccredito' } });
      const riaccredito = (await pagina(2026, 3)).documenti.find((x: any) => x.voce === 'riaccredito');
      expect(riaccredito).toMatchObject({ stato: { etichetta: 'Riaccredito', variante: 'ok' }, voce: 'riaccredito' });
      expect(riaccredito.provvigione).toBeGreaterThan(0);
    } finally {
      await db.bollettini_righe.update({ where: { id: riga.id }, data: { tipo_riga: 'storno' } });
      await db.bollettini_testata.updateMany({ where: dove, data: { stato: 'da_verificare', chiuso_il: null, chiuso_da: null } });
    }
  });

  it('storno di una fattura liquidata: voce = −provvigione della fotografia, allo stesso subagente, anche se l\'agenzia è cambiata (A2-01)', async () => {
    const S = await caricaDati(db);
    const liquida = S.pratiche.flatMap((p) => p.documenti.map((d) => ({ p, d })))
      .find(({ p, d }) => d.tipo === 'fattura' && d.liquidazione_id && S.fornitori.get(p.fornitore_id)!.maturazione !== 'maturato')!;
    expect(liquida).toBeTruthy();
    const foto = S.fotografie.get(liquida.d.id)!;
    expect(foto).toBeTruthy();
    const ab = S.interscambio.find((a) => a.cliente_id === liquida.p.cliente_id && a.fornitore_id === liquida.p.fornitore_id)!;
    const altro = [...S.subagenti.keys()].find((id) => id !== foto.subagente_id)!;
    const prima = ab.subagente_id;
    ab.subagente_id = altro; // cambio d'agenzia in memoria: la provvigione passata non si sposta (D-35)
    const b: any = {
      id: 'prova-storno', fornitore_id: liquida.p.fornitore_id, anno: 2026, mese: 8, stato: 'verificato',
      ricevuto: '2026-08-20', chiuso_il: '2026-09-10',
      righe: [{ id: 'prova-storno-riga', documento_id: liquida.d.id, liquidazione_id: null, numero: liquida.d.numero, data: null, imponibile: null, pct: null, importo: null, tipo: 'storno', pct_calcolata: null, importo_calcolato: null, decisione: null }],
      attese: [],
    };
    (S.bollettini as any[]).push(b);
    try {
      const voce = righeLiquidazione(S, 2026, 3).find((r) => r.riga_bollettino_id === 'prova-storno-riga')!;
      expect(voce).toBeTruthy();
      expect(voce.subagente_id).toBe(foto.subagente_id);
      expect(Number(voce.provvigione)).toBe(-Number(foto.provvigione));
      expect(Number(voce.pct)).toBe(Number(foto.pct));
    } finally {
      ab.subagente_id = prima;
      (S.bollettini as any[]).pop();
    }
  });

  it('trimestre chiuso: dalla fotografia salvata', async () => {
    const liq = await db.liquidazioni.findUniqueOrThrow({ where: { anno_trimestre: { anno: 2026, trimestre: 2 } }, include: { autore: true } });
    const b = await pagina(2026, 2);
    const f = liq.totali as any;
    expect(b.stato.chiave).toBe('chiusa');
    expect(b.subagenti.map((s: any) => [s.id, s.provvigione, s.in_attesa])).toEqual(f.subagenti.map((s: any) => [s.subagente_id, Number(s.provvigione), Number(s.in_attesa)]));
    expect(b.riepilogo.provvigione).toBe(Number(f.totale.provvigione));
    // le righe vengono dalla fotografia: stessi documenti e stessi importi della chiusura
    expect(f.documenti.length).toBeGreaterThan(0);
    expect(b.documenti.map((x: any) => [x.documento_id, x.numero, x.imponibile, x.provvigione, x.stato.etichetta]))
      .toEqual(f.documenti.map((r: any) => [r.documento_id, r.numero, Number(r.importo), Number(r.provvigione),
        r.voce ? (r.voce === 'storno' ? 'Storno: cliente non pagante' : 'Riaccredito') : r.liquidabile ? 'Liquidata' : r.incasso ? 'Attesa incasso' : 'In attesa']));
    expect(b).toMatchObject({ chiusura: { possibile: false, motivo: 'Trimestre già liquidato' }, chiusa_il: giornoRoma(liq.chiusa_il), chiusa_da: liq.autore!.nome });
  });

  it('senza parametri: il trimestre di oggi; trimestre 5 o anno sbagliato 400; senza area provvigioni 403', async () => {
    const b = (await resp.get('/liquidazioni').expect(200)).body;
    expect([b.anno, b.trimestre]).toEqual([Number(OGGI.slice(0, 4)), trimestre(OGGI)]);
    await resp.get('/liquidazioni?anno=2026&trimestre=5').expect(400);
    await resp.get('/liquidazioni?anno=abc').expect(400);
    await dati.get('/liquidazioni').expect(403);
  });
});

describe('GET /api/liquidazione/report', () => {
  const report = async (q: string) => (await resp.get('/liquidazione/report' + q).expect(200)).body;
  const delta = (v: number, p: number) => (Math.abs(p) > 0.01 ? Math.round((100 * (v - p)) / Math.abs(p)) : null);

  it('senza subagente: elenco con quota e variazione sul trimestre prima, come il prototipo', async () => {
    const b = await report('?anno=2026&trimestre=3');
    const an = M.analisiTrimestre(2026, 3), prec = M.analisiTrimestre(2026, 2);
    const attesi = an.subagenti.map((x: any) => {
      const p = prec.subagenti.find((y: any) => String(y.chiave) === String(x.chiave));
      return [x.nome, x.clienti, x.documenti, x.fatturato, x.prese, x.pagate, x.margine, x.prese ? M.r2((100 * x.pagate) / x.prese) : 0, delta(x.pagate, p ? p.pagate : 0)];
    }).sort((x: any, y: any) => y[5] - x[5]);
    expect(b.precedente).toEqual({ anno: 2026, trimestre: 2 });
    expect(b.subagenti.map((s: any) => [s.nome, s.clienti, s.documenti, s.fatturato, s.prese, s.pagate, s.margine, s.quota, s.delta])).toEqual(j(attesi));
    // totali degli importi dal server (D-126 §19), uguali alla sintesi del trimestre
    expect(b.totali).toEqual({ fatturato: an.totale.fatturato, pagate: an.totale.pagate, margine: an.totale.margine });
  });

  it('un subagente: numeri con confronto, trimestri dell’anno senza i futuri, primi 5 clienti', async () => {
    const an = M.analisiTrimestre(2026, 3), prec = M.analisiTrimestre(2026, 2);
    for (const s of an.subagenti) {
      const id = String(s.chiave);
      const b = await report(`?anno=2026&trimestre=3&subagente=${id}`);
      const p = prec.subagenti.find((y: any) => String(y.chiave) === id);
      expect(b.subagente).toEqual({ id, nome: s.nome });
      expect([b.numeri.fatturato, b.numeri.prese, b.numeri.pagate, b.numeri.margine, b.numeri.clienti, b.numeri.documenti])
        .toEqual([s.fatturato, s.prese, s.pagate, s.margine, s.clienti, s.documenti]);
      expect(b.numeri.delta).toEqual({
        fatturato: delta(s.fatturato, p ? p.fatturato : 0),
        pagate: delta(s.pagate, p ? p.pagate : 0),
        margine: delta(s.margine, p ? p.margine : 0),
      });
      expect(b.numeri.pct.margine_su_prese).toBe(s.prese ? M.r2((100 * s.margine) / s.prese) : 0);
      const trim = [1, 2, 3, 4].filter((q) => M.statoTrimestre(2026, q).chiave !== 'futura').map((q) => {
        const y = M.analisiTrimestre(2026, q).subagenti.find((z: any) => String(z.chiave) === id);
        return [q, y ? y.pagate : 0, y ? y.margine : 0, q === 3];
      });
      expect(b.trimestri.map((x: any) => [x.trimestre, x.pagate, x.margine, x.attivo])).toEqual(j(trim));
      const perCli: Record<string, { nome: string; fatturato: number; provvigione: number }> = {};
      M.righeLiquidazione(2026, 3).filter((r: any) => String(r.subagente_id) === id).forEach((r: any) => {
        const c = (perCli[r.cliente] = perCli[r.cliente] || { nome: M.nomeCliente(r.cliente), fatturato: 0, provvigione: 0 });
        c.fatturato += r.importo;
        c.provvigione += r.provvigione;
      });
      const cli = Object.values(perCli).sort((u, v) => v.fatturato - u.fatturato).slice(0, 5)
        .map((c) => [c.nome, M.r2(c.fatturato), M.r2(c.provvigione)]);
      expect(b.primi_clienti.map((c: any) => [c.nome, c.fatturato, c.provvigione])).toEqual(j(cli));
    }
  });

  it('subagente senza documenti: zeri, non un errore; i trimestri futuri non ci sono', async () => {
    const primo = M.analisiTrimestre(2026, 3).subagenti[0];
    const b = await report(`?anno=2024&trimestre=1&subagente=${primo.chiave}`);
    expect(b.numeri).toEqual({
      fatturato: 0, prese: 0, pagate: 0, margine: 0, clienti: 0, documenti: 0,
      delta: { fatturato: null, pagate: null, margine: null }, pct: { margine_su_prese: 0 },
    });
    expect(b.trimestri).toEqual([1, 2, 3, 4].map((q) => ({ trimestre: q, pagate: 0, margine: 0, attivo: q === 1 })));
    expect(b.primi_clienti).toEqual([]);
    // anno non ancora iniziato: il report non inventa trimestri
    expect((await report(`?anno=2027&trimestre=1&subagente=${primo.chiave}`)).trimestri).toEqual([]);
  });

  it('parametri non validi 400; subagente inesistente 404; sola lettura 200 e 403 senza area', async () => {
    await resp.get('/liquidazione/report?anno=2026&trimestre=5').expect(400);
    await resp.get('/liquidazione/report?anno=abc').expect(400);
    await resp.get('/liquidazione/report?anno=2026&trimestre=3&subagente=999999').expect(404);
    expect((await lett.get('/liquidazione/report?anno=2026&trimestre=3').expect(200)).body.subagenti.length).toBeGreaterThan(0);
    await dati.get('/liquidazione/report?anno=2026&trimestre=3').expect(403);
  });
});

describe('GET /api/liquidazione/export', () => {
  const bin = (res: request.Response, cb: (e: Error | null, b: Buffer) => void) => {
    const pezzi: Buffer[] = [];
    res.on('data', (c: Buffer) => pezzi.push(c));
    res.on('end', () => cb(null, Buffer.concat(pezzi)));
  };
  const file = (p: string, chi = resp) => chi.get('/liquidazione/export?' + p).buffer(true).parse(bin);
  const excel = async (p: string) => {
    const r = await file(p).expect(200);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(r.body as unknown as ArrayBuffer);
    return { r, wb };
  };
  const testo = (v: unknown) => (v && typeof v === 'object' && 'text' in v ? (v as { text: string }).text : v);
  const rigaCon = (ws: ExcelJS.Worksheet, inizio: string) => {
    for (let i = 1; i <= ws.rowCount; i++) if (String(testo(ws.getRow(i).getCell(1).value) ?? '').startsWith(inizio)) return ws.getRow(i);
    throw new Error('riga non trovata: ' + inizio);
  };

  it('Excel completo: Riepilogo + un foglio per subagente, totali uguali alla pagina', async () => {
    const b = await pagina(2026, 3);
    const { r, wb } = await excel('anno=2026&trimestre=3&contenuto=completa&formato=xlsx');
    expect(r.headers['content-type']).toContain('spreadsheetml');
    expect(r.headers['content-disposition']).toBe('attachment; filename="Liquidazione_2026_T3_completa.xlsx"');
    expect(wb.worksheets.map((w) => w.name)).toEqual(['Riepilogo', ...b.subagenti.map((s: any) => s.nome)]);

    const rip = wb.getWorksheet('Riepilogo')!;
    expect(rip.getRow(5).values).toEqual([undefined, 'Subagente', 'Documenti', 'Imponibile', 'Provvigione da liquidare', 'In attesa dei bollettini']);
    expect(rip.getRow(5).getCell(1).fill).toMatchObject({ fgColor: { argb: 'FFE9F0FD' } });
    expect(rip.views[0]).toMatchObject({ state: 'frozen', ySplit: 5, showGridLines: false });
    expect(rip.pageSetup).toMatchObject({ orientation: 'landscape', fitToPage: true, fitToWidth: 1, printTitlesRow: '5:5' });
    expect(rip.headerFooter!.oddFooter).toContain('Decobrands SRL');
    expect(rip.headerFooter!.oddFooter).toContain('IT03589740163'); // intestazione dalle Impostazioni (D-65)
    expect(rip.headerFooter!.oddFooter).toContain('Riepilogo · pagina &P di &N');
    expect(rip.autoFilter).toBeTruthy();

    b.subagenti.forEach((s: any, i: number) => {
      const riga = rip.getRow(6 + i);
      expect([testo(riga.getCell(1).value), riga.getCell(2).value, riga.getCell(3).value, riga.getCell(4).value, riga.getCell(5).value])
        .toEqual([s.nome, s.liquidabili, s.imponibile, s.provvigione, s.in_attesa]);
      // il nome è un collegamento al foglio del subagente (solo nel file completo)
      const v = riga.getCell(1).value as { hyperlink?: string };
      expect(v.hyperlink).toBe("#'" + s.nome + "'!A1");
    });
    const totale = rigaCon(rip, 'Totale · ');
    expect(totale.getCell(2).value).toMatchObject({ formula: expect.stringMatching(/^SUM\(/), result: b.riepilogo.liquidabili });
    expect(totale.getCell(3).value).toMatchObject({ result: b.riepilogo.imponibile });
    expect(totale.getCell(4).value).toMatchObject({ result: b.riepilogo.provvigione });
    expect(totale.getCell(5).value).toMatchObject({ result: b.riepilogo.in_attesa });

    const s0 = b.subagenti[0];
    const ws = wb.getWorksheet(s0.nome)!;
    expect(ws.getRow(5).values).toEqual([undefined, 'Fornitore', 'N. documento', 'Data documento', 'Codice cliente', 'Ragione sociale', 'Importo documento', '% provvigione', 'Importo provvigionale']);
    const doc = b.documenti.find((d: any) => d.subagente_id === s0.id && d.liquidabile);
    const prima = ws.getRow(6);
    expect([prima.getCell(1).value, prima.getCell(2).value, prima.getCell(6).value, prima.getCell(8).value])
      .toEqual([doc.fornitore, (doc.voce === 'storno' ? 'Storno ' : doc.voce === 'riaccredito' ? 'Riaccredito ' : '') + doc.numero, doc.imponibile, doc.provvigione]);
    expect(prima.getCell(3).value).toBeInstanceOf(Date);
    expect(prima.getCell(7).value).toBeCloseTo(doc.pct / 100, 6);
    const totSub = rigaCon(ws, 'Totale ' + s0.nome);
    expect(totSub.getCell(6).value).toMatchObject({ formula: expect.stringMatching(/^SUM\(/), result: s0.imponibile });
    expect(totSub.getCell(8).value).toMatchObject({ result: s0.provvigione });
  });

  it('un solo subagente e solo il riepilogo: un foglio e il nome del file giusto', async () => {
    const b = await pagina(2026, 3);
    const s = b.subagenti.find((x: any) => x.nome === 'Marco Nista')!;
    const uno = await excel(`anno=2026&trimestre=3&contenuto=subagente&subagente=${s.id}`);
    expect(uno.r.headers['content-disposition']).toBe('attachment; filename="Liquidazione_2026_T3_Marco_Nista.xlsx"');
    expect(uno.wb.worksheets.map((w) => w.name)).toEqual(['Marco Nista']);

    const rip = await excel('anno=2026&trimestre=3&contenuto=riepilogo');
    expect(rip.r.headers['content-disposition']).toBe('attachment; filename="Liquidazione_2026_T3_riepilogo.xlsx"');
    expect(rip.wb.worksheets.map((w) => w.name)).toEqual(['Riepilogo']);
    // nel solo riepilogo il nome non è un collegamento
    expect(typeof rip.wb.getWorksheet('Riepilogo')!.getRow(6).getCell(1).value).toBe('string');
  });

  it('CSV: solo dati, ; e virgola decimale, BOM, date gg/mm/aaaa; completo, subagente e riepilogo', async () => {
    const b = await pagina(2026, 3);
    const r = await file('anno=2026&trimestre=3&contenuto=completa&formato=csv').expect(200);
    expect(r.headers['content-type']).toContain('text/csv');
    expect(r.headers['content-disposition']).toBe('attachment; filename="Liquidazione_2026_T3_completa.csv"');
    const buf = r.body as Buffer;
    expect([buf[0], buf[1], buf[2]]).toEqual([0xef, 0xbb, 0xbf]);
    const righe = buf.toString('utf8').slice(1).split('\r\n');
    expect(righe[0]).toBe('Subagente;Fornitore;N. documento;Data documento;Codice cliente;Ragione sociale;Importo documento;% provvigione;Importo provvigionale;Stato');
    expect(righe.length - 1).toBe(b.documenti.length);
    expect(righe[1]).toMatch(/^[^;]+;[^;]+;.*;\d{2}\/\d{2}\/\d{4};/);
    const liquidabili = righe.slice(1).filter((x) => x.endsWith(';liquidabile'));
    const totale = M.r2(liquidabili.reduce((s: number, x: string) => s + Number(x.split(';')[8].replace(',', '.')), 0));
    expect(totale).toBe(b.riepilogo.provvigione);
    expect(liquidabili.length).toBe(b.riepilogo.liquidabili);

    const s = b.subagenti.find((x: any) => x.nome === 'Marco Nista')!;
    const uno = (await file(`anno=2026&trimestre=3&contenuto=subagente&subagente=${s.id}&formato=csv`).expect(200)).body as Buffer;
    const righeUno = uno.toString('utf8').slice(1).split('\r\n');
    expect(righeUno.length - 1).toBe(b.documenti.filter((d: any) => d.subagente_id === s.id).length);
    expect(righeUno.slice(1).every((x) => x.startsWith('Marco Nista;'))).toBe(true);

    const rip = (await file('anno=2026&trimestre=3&contenuto=riepilogo&formato=csv').expect(200)).body as Buffer;
    const righeRip = rip.toString('utf8').slice(1).split('\r\n');
    expect(righeRip[0]).toBe('Subagente;Documenti;Imponibile;Provvigione da liquidare;In attesa dei bollettini');
    expect(righeRip.length - 1).toBe(b.subagenti.length);
    expect(righeRip[1].split(';')[0]).toBe(b.subagenti[0].nome);
  });

  it('CSV: formula injection neutralizzata (apice davanti a =, +, @, tab e - non seguito da cifra)', () => {
    expect(cellaCsv('=1+1')).toBe("'=1+1");
    expect(cellaCsv('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(cellaCsv('+123')).toBe("'+123");
    expect(cellaCsv('\tX')).toBe("'\tX");
    expect(cellaCsv('-abc')).toBe("'-abc");
    expect(cellaCsv('-12,50')).toBe('-12,50'); // numero negativo: resta numero
    expect(cellaCsv('nome;')).toBe('"nome;"');
  });

  (sofficeDisponibile() ? it : it.skip)('PDF: il medesimo .xlsx convertito, inizia con %PDF-', async () => {
    const r = await file('anno=2026&trimestre=3&contenuto=completa&formato=pdf').expect(200);
    expect(r.headers['content-type']).toBe('application/pdf');
    expect(r.headers['content-disposition']).toBe('attachment; filename="Liquidazione_2026_T3_completa.pdf"');
    const buf = r.body as Buffer;
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buf.length).toBeGreaterThan(1000);
  }, 180_000);

  it('permesso provvigioni.esporta, parametri e trimestri non validi; evento export.export', async () => {
    await dati.get('/liquidazione/export?anno=2026&trimestre=3').expect(403);
    await lett.get('/liquidazione/export?anno=2026&trimestre=3&contenuto=riepilogo').expect(200);
    await resp.get('/liquidazione/export?anno=2026&trimestre=3&contenuto=altro').expect(400);
    await resp.get('/liquidazione/export?anno=2026&trimestre=3&contenuto=subagente').expect(400);
    expect((await resp.get('/liquidazione/export?anno=2026&trimestre=3&contenuto=subagente&subagente=999999').expect(400)).body.message)
      .toBe('Il subagente non ha documenti nel trimestre');
    await resp.get('/liquidazione/export?anno=2027&trimestre=4&contenuto=completa').expect(400);
    const eventi = await db.registro.findMany({ where: { codice: 'export.export', entita: 'liquidazione' } });
    expect(eventi.length).toBeGreaterThan(0);
    expect(eventi.some((e) => JSON.stringify(e.dettaglio).includes('"scelta":"completa"'))).toBe(true);
    expect(eventi[0].dettaglio).toMatchObject({ periodo: { anno: 2026, trimestre: 3 }, n_righe: expect.any(Number), importo_totale: expect.any(Number) });
  });
});

describe('chiusura del trimestre', () => {
  const chiudi = (a: number, t: number, chi = resp) => chi.post(`/liquidazioni/${a}/${t}/chiudi`);

  it('operatore 403; trimestre non valido 400', async () => {
    await chiudi(2026, 3, op).expect(403);
    await chiudi(2026, 5).expect(400);
  });

  it('condizioni non rispettate: 409 (già chiuso, in corso, futuro, documenti in attesa dei bollettini)', async () => {
    expect((await chiudi(2026, 2).expect(409)).body.message).toBe('Trimestre già liquidato');
    expect((await chiudi(2027, 4).expect(409)).body.message).toBe('Il trimestre non è iniziato');
    const q = trimestre(OGGI), a = Number(OGGI.slice(0, 4));
    expect((await chiudi(a, q).expect(409)).body.message).toMatch(/^Il trimestre si chiude il/);
    const b = await pagina(2026, 3);
    expect(b.riepilogo.bloccanti).toBeGreaterThan(0); // luglio di Gries da verificare
    expect((await chiudi(2026, 3).expect(409)).body.message).toMatch(/in attesa dei bollettini/);
    expect(b.chiusura).toEqual({ possibile: false, motivo: expect.stringMatching(/in attesa dei bollettini/) });
    expect(await db.liquidazioni.count()).toBe(2);
  });

  describe('3° trimestre 2026, con luglio di Gries verificato', () => {
    let prima: Awaited<ReturnType<typeof caricaDati>>;
    let nuovo: { id: bigint; numero: string; data: Date };
    beforeAll(async () => {
      // fattura Gries di luglio che il bollettino di luglio non riconosce: maturato in attesa d'incasso, non blocca
      const base = await db.ordini_fornitore_documenti.findFirstOrThrow({ where: { numero: 'F-2026-0891' } });
      nuovo = await db.ordini_fornitore_documenti.create({ data: { testata_id: base.testata_id, tipo: 'fattura', numero: 'F-2026-PROVA-Q3', data: new Date('2026-07-20'), importo: 1000 } });
      // caso costruito: il bollettino che teneva in attesa i documenti viene chiuso
      await db.bollettini_testata.updateMany({ where: { fornitore_id: await fornitore('Gries'), anno: 2026, mese: 7 }, data: { stato: 'verificato', chiuso_il: new Date('2026-08-12T10:00:00Z'), chiuso_da: (await db.utenti.findFirstOrThrow({ where: { username: 'ugo' } })).id } });
      prima = await caricaDati(db);
    });

    it('ora si può chiudere', async () => {
      expect((await pagina(2026, 3)).chiusura).toEqual({ possibile: true, motivo: null });
    });

    it('rollback: se il registro fallisce non resta niente', async () => {
      const spia = jest.spyOn(registro, 'logEvent').mockImplementation(async (d, e, c) => {
        if (e.entita === 'liquidazione') throw new Error('registro giù');
        return jest.requireActual('../src/registro').logEvent(d, e, c);
      });
      await chiudi(2026, 3).expect(500);
      spia.mockRestore();
      expect(await db.liquidazioni.count()).toBe(2);
      expect(await db.ordini_fornitore_documenti.count({ where: { liquidazione: { trimestre: 3 } } })).toBe(0);
    });

    it('chiusura: fotografia, documenti e voci legati, evento, periodo chiuso; seconda chiusura 409', async () => {
      const righe = righeLiquidazione(prima, 2026, 3);
      const b = (await chiudi(2026, 3).expect(200)).body;
      expect(b).toMatchObject({ stato: { chiave: 'chiusa' }, chiusura: { possibile: false }, chiusa_da: 'Prova resp-liq' });
      const liq = await db.liquidazioni.findUniqueOrThrow({ where: { anno_trimestre: { anno: 2026, trimestre: 3 } }, include: { documenti: true, storni: true } });
      expect(liq.totali).toEqual(j(fotografiaLiquidazione(prima, righe)));
      expect(liq.documenti.map((d) => String(d.id)).sort()).toEqual(righe.filter((r) => r.liquidabile && !r.voce).map((r) => r.documento_id).sort());
      expect(liq.storni.map((r) => String(r.id)).sort()).toEqual(righe.flatMap((r) => r.riga_bollettino_id ?? []).sort());
      expect(liq.documenti.length).toBeGreaterThan(0);
      expect(await db.registro.count({ where: { codice: 'stato.change_state', entita: 'liquidazione', entita_id: liq.id } })).toBe(1);
      // periodo chiuso per tutti i fornitori (D-51): nuove percentuali nel trimestre 409
      const ings = await fornitore("Ing's");
      expect(await ultimaChiusura(db, ings)).toBe('2026-09-30');
      await dati.post(`/fornitori/${ings}/percentuali`, { valido_dal: '2026-09-15', scaglioni: [{ sconto_min: 0, pct_agente: 20, pct_subagente: 10 }] }).expect(409);
      expect((await chiudi(2026, 3).expect(409)).body.message).toBe('Trimestre già liquidato');
    });

    it('il trimestre chiuso non si ricalcola: dati cambiati dopo, stessa pagina; le voci liquidate non passano al trimestre dopo', async () => {
      const prima3 = await pagina(2026, 3);
      const liq = await db.liquidazioni.findUniqueOrThrow({ where: { anno_trimestre: { anno: 2026, trimestre: 3 } }, include: { documenti: true } });
      const d = liq.documenti[0];
      await db.ordini_fornitore_documenti.update({ where: { id: d.id }, data: { importo: d.importo.times(10) } });
      expect(SENZA_PAGINA(await pagina(2026, 3))).toEqual(SENZA_PAGINA(prima3));
      await db.ordini_fornitore_documenti.update({ where: { id: d.id }, data: { importo: d.importo } });
      // nel seed nessuna voce cade nel 3° trimestre: caso costruito in memoria, uno storno chiuso ad agosto e liquidato nel 3°
      const S = await caricaDati(db);
      const b = S.bollettini.find((x) => x.righe.some((r) => r.tipo === 'storno'))!;
      const rb = b.righe.find((r) => r.tipo === 'storno')!;
      Object.assign(b, { stato: 'verificato', chiuso_il: '2026-08-15' });
      const voce = (t: number) => righeLiquidazione(S, 2026, t).filter((r) => r.riga_bollettino_id === rb.id).length;
      expect([voce(3), voce(4)]).toEqual([0, 1]); // non legata: va nel primo trimestre aperto
      rb.liquidazione_id = String(liq.id);
      expect([voce(3), voce(4)]).toEqual([1, 0]); // legata: resta dove è stata pagata (D-11)
    });

    it('riconosciuta dopo la chiusura: va nel primo trimestre aperto e lì si lega (D-57); si chiude in ordine', async () => {
      const gries = await fornitore('Gries');
      const f = await db.fornitori.findUniqueOrThrow({ where: { id: gries } });
      const ugo = (await db.utenti.findFirstOrThrow({ where: { username: 'ugo' } })).id;
      // il cliente paga: il bollettino di settembre, verificato a ottobre, riconosce la fattura di luglio (Q3 già chiuso)
      await db.bollettini_testata.create({ data: {
        fornitore_id: gries, fornitore_versione_id: f.versione_corrente_id!, anno: 2026, mese: 9, stato: 'verificato', chiuso_il: new Date('2026-10-12T10:00:00Z'), chiuso_da: ugo,
        righe: { create: [{ fattura_numero: nuovo.numero, fattura_data: nuovo.data, documento_id: nuovo.id, importo_merce: 1000, pct_riconosciuta: 10, importo_riconosciuto: 100 }] },
      } });
      const S = await caricaDati(db);
      const dove = (t: number) => righeLiquidazione(S, 2026, t).filter((r) => r.documento_id === String(nuovo.id));
      expect(dove(3)).toEqual([]);
      expect(dove(4)).toEqual([expect.objectContaining({ liquidabile: true })]);
      // ad aprile 2027: prima il 4° trimestre 2026, poi il 1° del 2027
      jest.useFakeTimers({ now: new Date('2027-04-10T10:00:00Z'), doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask', 'hrtime', 'performance'] });
      try {
        const r = await entra('resp-liq');
        expect((await r.post('/liquidazioni/2027/1/chiudi').expect(409)).body.message).toBe('Chiudi prima il 4° trimestre 2026');
        await r.post('/liquidazioni/2026/4/chiudi').expect(200);
      } finally {
        jest.useRealTimers();
      }
      const d = await db.ordini_fornitore_documenti.findUniqueOrThrow({ where: { id: nuovo.id }, include: { liquidazione: true } });
      expect(d.liquidazione).toMatchObject({ anno: 2026, trimestre: 4 });
    });
  });
});


describe('due chiusure insieme (V13, D-36)', () => {
  it('una 200 e una 409: una sola liquidazione, i documenti legati una volta', async () => {
    // aprile 2027: il 4° trimestre 2026 è chiuso dalla prova sopra, il 1° 2027 si può chiudere
    jest.useFakeTimers({ now: new Date('2027-04-10T10:00:00Z'), doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask', 'hrtime', 'performance'] });
    try {
      const r = await entra('resp-liq');
      const atteso = (await r.get('/liquidazioni?anno=2027&trimestre=1').expect(200)).body.riepilogo.liquidabili as number;
      const esiti = await Promise.allSettled([r.post('/liquidazioni/2027/1/chiudi'), r.post('/liquidazioni/2027/1/chiudi')]);
      const stati = esiti.map((e) => (e.status === 'fulfilled' ? e.value.status : 0)).sort();
      expect(stati).toEqual([200, 409]);
      const liq = await db.liquidazioni.findUniqueOrThrow({ where: { anno_trimestre: { anno: 2027, trimestre: 1 } } });
      expect(await db.liquidazioni.count({ where: { anno: 2027, trimestre: 1 } })).toBe(1);
      expect(await db.ordini_fornitore_documenti.count({ where: { liquidazione_id: liq.id } })).toBe(atteso);
    } finally {
      jest.useRealTimers();
    }
  });
});
