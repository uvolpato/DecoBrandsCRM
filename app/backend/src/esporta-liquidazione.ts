import { BadRequestException, Controller, Get, Query, Req, Res, ServiceUnavailableException, StreamableFile } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import ExcelJS from 'exceljs';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import type { Request, Response } from 'express';
import { Richiede, contesto } from './accesso';
import { cella } from './csv';
import { ragioneSociale } from './impostazioni';
import { liquidazione } from './liquidazioni';
import { giornoRoma } from './motore/dati';
import { r2 } from './motore/motore';
import { PrismaService } from './prisma.service';
import { logEvent } from './registro';

// Esportazione della liquidazione (F4-A3, §11, D-61): un unico modello di fogli alimenta Excel e CSV,
// e il PDF è la conversione del medesimo .xlsx con LibreOffice. I numeri arrivano da `liquidazione`
// (le stesse funzioni della pagina, V12); il browser manda solo anno, trimestre, contenuto e formato.

type B = Awaited<ReturnType<typeof liquidazione>>;
type Doc = B['documenti'][number];
type Gruppo = { id: string; nome: string; foglio: string; tutti: Doc[]; liq: Doc[]; att: Doc[] };

const CONTENUTI = ['completa', 'subagente', 'riepilogo'] as const;
const FORMATI = ['xlsx', 'pdf', 'csv'] as const;
type Contenuto = (typeof CONTENUTI)[number];
type Formato = (typeof FORMATI)[number];

const NOMI = ['gennaio–marzo', 'aprile–giugno', 'luglio–settembre', 'ottobre–dicembre'];
const dataIt = (s: string) => s.split('-').reverse().join('/');

/* ---------- Modello dei fogli ---------- */

type Col = { t: string; w: number; tipo?: 'euro' | 'pct' | 'data' | 'num'; al?: 'right' | 'center' };

const COL_DETTAGLIO: Col[] = [
  { t: 'Fornitore', w: 30 },
  { t: 'N. documento', w: 16 },
  { t: 'Data documento', w: 15, tipo: 'data', al: 'center' },
  { t: 'Codice cliente', w: 15 },
  { t: 'Ragione sociale', w: 36 },
  { t: 'Importo documento', w: 19, tipo: 'euro', al: 'right' },
  { t: '% provvigione', w: 14, tipo: 'pct', al: 'right' },
  { t: 'Importo provvigionale', w: 21, tipo: 'euro', al: 'right' },
];

const somma = (rr: Doc[], k: 'imponibile' | 'provvigione') => Number(r2(rr.reduce((s, x) => s + x[k], 0)));
const numDoc = (x: Doc) => (x.voce === 'storno' ? 'Storno ' : x.voce === 'riaccredito' ? 'Riaccredito ' : '') + x.numero;
const docs = (n: number) => n + (n === 1 ? ' documento' : ' documenti');

const nomeFoglio = (nome: string, usati: Set<string>) => {
  let n = nome.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31).trim(), k = 2;
  while (usati.has(n.toLowerCase())) n = (nome.slice(0, 28).trim() + ' ' + k++).slice(0, 31);
  usati.add(n.toLowerCase());
  return n;
};

/** Gruppi per subagente, solo quelli con documenti nel trimestre; l'ordine è quello del riepilogo (nome). */
function gruppi(b: B) {
  const usati = new Set(['riepilogo']);
  return b.subagenti.map((s) => {
    const tutti = b.documenti
      .filter((d) => d.subagente_id === s.id)
      .sort((x, y) => x.data.localeCompare(y.data) || x.numero.localeCompare(y.numero));
    return {
      id: s.id,
      nome: s.nome,
      foglio: nomeFoglio(s.nome, usati),
      tutti,
      liq: tutti.filter((d) => d.liquidabile),
      att: tutti.filter((d) => !d.liquidabile),
    };
  }).filter((g) => g.tutti.length);
}

function modello(b: B, contenuto: Contenuto, subagente?: string, azienda = '') {
  const g = gruppi(b);
  const scelto = subagente == null ? null : g.find((x) => x.id === subagente);
  if (contenuto === 'subagente' && !scelto) throw new BadRequestException('Il subagente non ha documenti nel trimestre');
  const nomeBase = `Liquidazione_${b.anno}_T${b.trimestre}`;
  const nome = contenuto === 'completa' ? nomeBase + '_completa'
    : contenuto === 'riepilogo' ? nomeBase + '_riepilogo'
      : nomeBase + '_' + scelto!.nome.replace(/\s+/g, '_').replace(/[\\/?%*:|"<>]/g, '');
  const aperto = b.stato.chiave !== 'chiusa';
  const ctx = {
    aperto,
    azienda, // ragione sociale, P.IVA, indirizzo ed email dalle Impostazioni (D-65)
    periodo: `${b.trimestre}° trimestre ${b.anno} · ${NOMI[b.trimestre - 1]}`,
    contesto: [azienda, b.stato.etichetta, `prospetto generato il ${dataIt(giornoRoma(new Date()))}`].filter(Boolean).join(' · '),
  };
  return { nome, contenuto, gruppi: contenuto === 'subagente' ? [scelto!] : g, scelto, ctx };
}

type Modello = ReturnType<typeof modello>;

/* ---------- Excel ---------- */

const X = {
  testo: 'FF212529', tenue: 'FF6C757D', bordo: 'FFDEE2E6', bordoTenue: 'FFE9ECEF',
  primario: 'FF0D6EFD', primarioTesto: 'FF084298', primarioTenue: 'FFE9F0FD',
  attesaTesto: 'FF664D03', attesaTenue: 'FFFFF3CD', sfondo: 'FFF8F9FA',
};
const FONT = 'Calibri';
const FMT = {
  euro: '#,##0.00 "€";[Red]-#,##0.00 "€";"—"',
  pct: '0.00%', data: 'dd/mm/yyyy', num: '0',
};
const dataExcel = (iso: string) => new Date(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))));
const sotto = (colore: string, stile: 'thin' | 'medium' = 'thin') => ({ bottom: { style: stile, color: { argb: colore } } });
const lettera = (i: number) => String.fromCharCode(65 + i);
const allinea = (c: Col) => c.al ?? 'left';

type Tabella = { tipo: 'tabella'; colonne: Col[]; righe: (string | number | Date)[][]; vuoto?: string; variante?: 'attesa'; totale?: { etichetta: string; valori: Record<number, number> }; filtro?: boolean; link?: string[] };
type Blocco = { tipo: 'titolo'; testo: string } | { tipo: 'nota'; testo: string; stretta?: boolean } | Tabella;

function rigaDettaglio(x: Doc): (string | number | Date)[] {
  return [x.fornitore, numDoc(x), dataExcel(x.data), x.codice_cliente || '', x.cliente, x.imponibile, x.pct / 100, x.provvigione];
}

function blocchiSubagente(g: Gruppo): Blocco[] {
  const out: Blocco[] = [{
    tipo: 'tabella', colonne: COL_DETTAGLIO, righe: g.liq.map(rigaDettaglio), vuoto: 'Nessun documento liquidabile nel trimestre.',
    totale: { etichetta: 'Totale ' + g.nome + ' · ' + docs(g.liq.length), valori: { 5: somma(g.liq, 'imponibile'), 7: somma(g.liq, 'provvigione') } },
    filtro: true,
  }];
  if (g.att.length) out.push(
    { tipo: 'titolo', testo: 'In attesa dei bollettini · non inclusi nel totale da liquidare' },
    {
      tipo: 'tabella', colonne: COL_DETTAGLIO, righe: g.att.map(rigaDettaglio), variante: 'attesa',
      totale: { etichetta: 'Totale in attesa · ' + docs(g.att.length), valori: { 5: somma(g.att, 'imponibile'), 7: somma(g.att, 'provvigione') } },
    },
    { tipo: 'nota', testo: g.att.map((x) => x.numero + ': ' + (x.motivo_testo ?? 'in attesa del bollettino')).join(' · '), stretta: true },
  );
  // correzioni della quota del subagente con il motivo (D-27 §19): la nota *Provvigioni particolari* del prospetto
  const corrette = g.tutti.filter((x) => x.correzione);
  if (corrette.length) out.push({ tipo: 'nota', testo: 'Provvigioni particolari: ' + corrette.map((x) => x.numero + ': ' + x.correzione!.motivo).join(' · '), stretta: true });
  out.push({ tipo: 'nota', testo: 'Importi in euro. Le note di credito hanno importo negativo e riducono la provvigione. Percentuale = quota del subagente in vigore alla data del documento.' });
  return out;
}

function bloccoRiepilogo(m: Modello): Tabella {
  const conAttesa = m.ctx.aperto && m.gruppi.some((g) => g.att.length);
  const col: Col[] = [
    { t: 'Subagente', w: 30 },
    { t: 'Documenti', w: 12, tipo: 'num', al: 'right' },
    { t: 'Imponibile', w: 20, tipo: 'euro', al: 'right' },
    { t: 'Provvigione da liquidare', w: 24, tipo: 'euro', al: 'right' },
  ];
  if (conAttesa) col.push({ t: 'In attesa dei bollettini', w: 24, tipo: 'euro', al: 'right' });
  const righe = m.gruppi.map((g) => [g.nome, g.liq.length, somma(g.liq, 'imponibile'), somma(g.liq, 'provvigione')]
    .concat(conAttesa ? [somma(g.att, 'provvigione')] : []));
  const valori: Record<number, number> = {
    1: m.gruppi.reduce((n, g) => n + g.liq.length, 0),
    2: Number(r2(m.gruppi.reduce((s, g) => s + somma(g.liq, 'imponibile'), 0))),
    3: Number(r2(m.gruppi.reduce((s, g) => s + somma(g.liq, 'provvigione'), 0))),
  };
  if (conAttesa) valori[4] = Number(r2(m.gruppi.reduce((s, g) => s + somma(g.att, 'provvigione'), 0)));
  return {
    tipo: 'tabella', colonne: col, righe,
    totale: { etichetta: 'Totale · ' + m.gruppi.length + (m.gruppi.length === 1 ? ' subagente' : ' subagenti'), valori },
    filtro: true,
    link: m.contenuto === 'completa' ? m.gruppi.map((g) => g.foglio) : undefined,
    vuoto: 'Nessun subagente con documenti nel trimestre.',
  };
}

function notaRiepilogo(m: Modello): Blocco {
  const conAttesa = m.ctx.aperto && m.gruppi.some((g) => g.att.length);
  return {
    tipo: 'nota',
    testo: 'Imponibile e provvigione comprendono le note di credito (importi negativi).'
      + (conAttesa ? ' "In attesa dei bollettini": documenti di fornitori che pagano sul maturato, non ancora riconosciuti in un bollettino verificato; non sono compresi nella provvigione da liquidare.' : '')
      + (m.contenuto === 'completa' ? ' Clic sul nome del subagente per aprire il suo prospetto.' : ''),
  };
}

function xlsxFoglio(wb: ExcelJS.Workbook, nome: string, titolo: string, ctx: Modello['ctx'], colonne: Col[], blocchi: Blocco[]) {
  const n = Math.max(colonne.length, 1);
  const ws = wb.addWorksheet(nome, {
    views: [{ state: 'frozen', ySplit: 5, showGridLines: false }],
    properties: { tabColor: { argb: nome === 'Riepilogo' ? X.primarioTesto : X.primario } },
  });
  colonne.forEach((c, i) => { ws.getColumn(i + 1).width = c.w; });
  ws.getRow(1).height = 26;
  [[titolo, { size: 16, bold: true, color: X.testo }], [ctx.periodo, { size: 11, bold: true, color: X.primarioTesto }], [ctx.contesto, { size: 9.5, color: X.tenue }]]
    .forEach(([testo, stile], i) => {
      ws.mergeCells(i + 1, 1, i + 1, n);
      Object.assign(ws.getCell(i + 1, 1), { value: testo, font: { name: FONT, ...(stile as object) }, alignment: { vertical: 'middle' } });
    });
  for (let c = 1; c <= n; c++) ws.getCell(3, c).border = sotto(X.primario, 'medium');
  ws.getRow(4).height = 8;

  let r = 4;
  for (const b of blocchi) {
    if (b.tipo === 'titolo') {
      r += 2; ws.mergeCells(r, 1, r, n);
      Object.assign(ws.getCell(r, 1), { value: b.testo, font: { name: FONT, size: 10.5, bold: true, color: { argb: X.attesaTesto } } });
    } else if (b.tipo === 'nota') {
      r += b.stretta ? 1 : 2; ws.mergeCells(r, 1, r, n);
      Object.assign(ws.getCell(r, 1), { value: b.testo, font: { name: FONT, size: 9, italic: true, color: { argb: X.tenue } }, alignment: { wrapText: true, vertical: 'top' } });
      ws.getRow(r).height = Math.max(15, Math.ceil(b.testo.length / 150) * 13);
    } else {
      r += 1;
      const att = b.variante === 'attesa';
      const rh = ws.getRow(r); rh.height = 22;
      b.colonne.forEach((c, i) => Object.assign(rh.getCell(i + 1), {
        value: c.t, font: { name: FONT, size: 10, bold: true, color: { argb: X.primarioTesto } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: X.primarioTenue } },
        alignment: { vertical: 'middle', horizontal: allinea(c), wrapText: true }, border: sotto(X.primario),
      }));
      const intest = r, prima = r + 1;
      b.righe.forEach((v, k) => {
        r++; const row = ws.getRow(r); row.height = 18;
        v.forEach((val, i) => {
          const c = b.colonne[i];
          Object.assign(row.getCell(i + 1), {
            value: val, numFmt: c.tipo ? FMT[c.tipo] : undefined, border: sotto(X.bordoTenue),
            font: { name: FONT, size: 10, color: { argb: att ? X.tenue : X.testo }, italic: att },
            alignment: { vertical: 'middle', horizontal: allinea(c) },
          });
        });
        if (b.link) {
          const cell = row.getCell(1);
          cell.value = { text: String(v[0]), hyperlink: "#'" + b.link[k] + "'!A1", tooltip: 'Apri il prospetto di ' + v[0] };
          cell.font = { name: FONT, size: 10, color: { argb: X.primario }, underline: true };
        }
      });
      if (!b.righe.length && b.vuoto) {
        r++; ws.mergeCells(r, 1, r, n);
        Object.assign(ws.getCell(r, 1), { value: b.vuoto, font: { name: FONT, size: 10, italic: true, color: { argb: X.tenue } } });
      }
      const ultima = r;
      if (b.filtro && b.righe.length) ws.autoFilter = { from: { row: intest, column: 1 }, to: { row: ultima, column: n } };
      if (!b.totale) continue;
      r++; const rt = ws.getRow(r); rt.height = 22;
      for (let c = 1; c <= n; c++) Object.assign(rt.getCell(c), {
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: att ? X.attesaTenue : X.sfondo } },
        border: { top: { style: 'medium', color: { argb: att ? X.attesaTesto : X.primarioTesto } }, bottom: { style: 'thin', color: { argb: X.bordo } } },
        font: { name: FONT, size: 10.5, bold: true, color: { argb: att ? X.attesaTesto : X.testo } },
        alignment: { vertical: 'middle', horizontal: c === 1 ? 'left' : 'right' },
      });
      rt.getCell(1).value = b.totale.etichetta;
      for (const [i, valore] of Object.entries(b.totale.valori)) {
        const c = b.colonne[Number(i)], L = lettera(Number(i));
        rt.getCell(Number(i) + 1).value = { formula: (b.righe.length ? `SUM(${L}${prima}:${L}${ultima})` : '0'), result: valore };
        rt.getCell(Number(i) + 1).numFmt = c.tipo ? FMT[c.tipo] : '0';
      }
    }
  }
  ws.pageSetup = {
    orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0,
    margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 }, printTitlesRow: '5:5',
  };
  ws.headerFooter = { oddFooter: [ctx.azienda, nome, 'pagina &P di &N'].filter(Boolean).join(' · ') };
}

function excel(m: Modello): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Decobrands CRM';
  wb.created = new Date();
  wb.title = 'Liquidazione ' + m.ctx.periodo;
  if (m.contenuto !== 'subagente') {
    const rip = bloccoRiepilogo(m);
    xlsxFoglio(wb, 'Riepilogo', 'Liquidazione provvigioni ai subagenti', m.ctx, rip.colonne, [rip, notaRiepilogo(m)]);
  }
  if (m.contenuto !== 'riepilogo') {
    for (const g of m.gruppi) {
      xlsxFoglio(wb, g.foglio, 'Prospetto provvigioni · ' + g.nome, m.ctx, COL_DETTAGLIO, blocchiSubagente(g));
    }
  }
  return wb.xlsx.writeBuffer().then((b) => Buffer.from(b));
}

/* ---------- CSV (solo dati, §11) ---------- */

const num = (v: number) => (Math.round(v * 100) / 100).toFixed(2).replace('.', ',');

function csv(m: Modello): Buffer {
  let righe: string[][];
  if (m.contenuto === 'riepilogo') {
    const conAttesa = m.ctx.aperto && m.gruppi.some((g) => g.att.length);
    righe = [['Subagente', 'Documenti', 'Imponibile', 'Provvigione da liquidare'].concat(conAttesa ? ['In attesa dei bollettini'] : [])];
    for (const g of m.gruppi) {
      righe.push([g.nome, String(g.liq.length), num(somma(g.liq, 'imponibile')), num(somma(g.liq, 'provvigione'))]
        .concat(conAttesa ? [num(somma(g.att, 'provvigione'))] : []));
    }
  } else {
    righe = [['Subagente', ...COL_DETTAGLIO.map((c) => c.t), 'Stato']];
    for (const g of m.gruppi) for (const x of g.tutti) {
      righe.push([g.nome, x.fornitore, numDoc(x), dataIt(x.data), x.codice_cliente || '', x.cliente,
        num(x.imponibile), num(x.pct), num(x.provvigione), x.liquidabile ? 'liquidabile' : 'in attesa del bollettino']);
    }
  }
  return Buffer.from('\ufeff' + righe.map((r) => r.map(cella).join(';')).join('\r\n'), 'utf8');
}

/* ---------- PDF: conversione del medesimo .xlsx con LibreOffice (§11) ---------- */

const execFileAsync = promisify(execFile);

/** `SOFFICE`, poi LibreOffice in Program Files su Windows, poi il comando nel PATH. */
export function percorsoSoffice() {
  if (process.env.SOFFICE) return process.env.SOFFICE;
  if (process.platform === 'win32' && existsSync('C:\\Program Files\\LibreOffice\\program\\soffice.com')) return 'C:\\Program Files\\LibreOffice\\program\\soffice.com';
  return process.platform === 'win32' ? 'soffice.com' : 'soffice';
}

/** Vero se il binario c'è: le prove del PDF si saltano su una macchina senza LibreOffice. */
export function sofficeDisponibile() {
  const p = percorsoSoffice();
  if (p.includes('/') || p.includes('\\')) return existsSync(p);
  return (process.env.PATH ?? '').split(delimiter).some((d) => existsSync(join(d, p)));
}

// Un profilo dedicato per processo (non quello di un LibreOffice aperto) e una conversione alla volta:
// due soffice sulla stessa cartella si bloccano, e un profilo nuovo a ogni PDF costa decine di secondi.
let coda: Promise<unknown> = Promise.resolve();
const inCoda = <T>(f: () => Promise<T>) => {
  const r = coda.then(f, f);
  coda = r.catch(() => undefined);
  return r;
};

export function convertiPdf(xlsx: Buffer): Promise<Buffer> {
  return inCoda(async () => {
    const dir = await mkdtemp(join(tmpdir(), 'crm-prospetto-'));
    const file = join(dir, 'prospetto.xlsx');
    // profilo per processo: niente lock lasciati da un'esecuzione precedente
    const profilo = pathToFileURL(join(tmpdir(), 'decobrands-crm-lo-' + process.pid)).href;
    try {
      await writeFile(file, xlsx);
      try {
        await execFileAsync(percorsoSoffice(), [
          '-env:UserInstallation=' + profilo, '--headless', '--norestore', '--nolockcheck', '--convert-to', 'pdf', '--outdir', dir, file,
        ], { timeout: 120_000, windowsHide: true });
      } catch (e) {
        const err = e as NodeJS.ErrnoException & { killed?: boolean; stderr?: string };
        if (err.code === 'ENOENT') throw new ServiceUnavailableException('Per il PDF serve LibreOffice sul server: installalo o imposta SOFFICE');
        throw new Error('LibreOffice non è riuscito a convertire il prospetto in PDF'
          + (err.killed ? ' (tempo scaduto)' : '') + (err.stderr ? ': ' + err.stderr.slice(0, 300) : ''));
      }
      return await readFile(join(dir, 'prospetto.pdf'));
    } finally {
      // se LibreOffice tiene ancora un file, la cartella resta: il PDF è già pronto
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  });
}

/* ---------- Rotta ---------- */

class Esporta {
  @IsOptional() @Type(() => Number) @IsInt() @Min(2000) @Max(2100) anno?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(4) trimestre?: number;
  @IsOptional() @IsIn(CONTENUTI) contenuto?: Contenuto;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) subagente?: number;
  @IsOptional() @IsIn(FORMATI) formato?: Formato;
}

@Controller('liquidazione')
export class LiquidazioneExportController {
  constructor(private readonly db: PrismaService) {}

  /** Esportazione (§11): Excel, PDF (lo stesso .xlsx convertito) o CSV; `contenuto` completa · un subagente · riepilogo. */
  @Get('export')
  @Richiede('provvigioni.esporta')
  async esporta(@Req() req: Request, @Query() q: Esporta, @Res({ passthrough: true }) res: Response) {
    const oggi = giornoRoma(new Date());
    const anno = q.anno ?? Number(oggi.slice(0, 4));
    const trimestre = q.trimestre ?? Math.floor((Number(oggi.slice(5, 7)) - 1) / 3) + 1;
    const b = await liquidazione(this.db, anno, trimestre);
    if (b.stato.chiave === 'futura') throw new BadRequestException('Il trimestre non è iniziato');
    const contenuto = q.contenuto ?? 'completa';
    const formato = q.formato ?? 'xlsx';
    const a = await ragioneSociale(this.db);
    const azienda = [a.ragione_sociale, a.piva, a.indirizzo, a.email].filter(Boolean).join(' · ');
    const m = modello(b, contenuto, q.subagente == null ? undefined : String(q.subagente), azienda);
    const dati = formato === 'csv' ? csv(m)
      : formato === 'pdf' ? await convertiPdf(await excel(m))
        : await excel(m);
    const totale = contenuto === 'subagente'
      ? somma(m.gruppi[0].liq, 'provvigione')
      : Number(r2(m.gruppi.reduce((s, g) => s + somma(g.liq, 'provvigione'), 0)));
    await logEvent(this.db, {
      tipo: 'export', azione: 'export', entita: 'liquidazione', esito: 'successo',
      dettaglio: {
        etichetta: `${trimestre}° trimestre ${anno}`, periodo: { anno, trimestre },
        scelta: contenuto, formato, subagente: q.subagente ?? undefined,
        n_righe: contenuto === 'riepilogo' ? m.gruppi.length : m.gruppi.reduce((n, g) => n + g.tutti.length, 0),
        importo_totale: totale,
      },
    }, contesto(req));
    res.set({
      'Content-Type': formato === 'csv' ? 'text/csv; charset=utf-8'
        : formato === 'pdf' ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${m.nome}.${formato}"`,
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(dati);
  }
}
