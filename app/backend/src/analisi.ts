import { BadRequestException, Controller, Get, Query, Res, StreamableFile } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import ExcelJS from 'exceljs';
import { IsIn, IsOptional, Matches } from 'class-validator';
import type { Response } from 'express';
import { Richiede } from './accesso';
import { cella } from './csv';
import { convertiPdf } from './esporta-liquidazione';
import { ragioneSociale } from './impostazioni';
import { type Dati, caricaDati } from './motore/dati';
import { fattiAnalisi, r2 } from './motore/motore';
import { PrismaService } from './prisma.service';

// Analisi (F4-A5, §7.22, §8.1): la BI del CRM. Un fatto per documento fiscale dal motore
// (`fattiAnalisi`: competenza = data del documento, note di credito negative, storni e riaccrediti
// esclusi, D-19); periodo, filtri, numeri, confronto, grafici, tabella ed esportazione si calcolano
// qui, dal database (V12). Il browser riceve i risultati già aggregati e non somma niente.
// ponytail: caricaDati carica tutto, come Liquidazioni. Se sui volumi grandi supera il secondo
// (test/carico-pratiche.ts), la vista `v_analisi_documenti` del piano: tocca i soldi, la decide Claude Code.

type Fatto = ReturnType<typeof fattiAnalisi>[number];

type Dec = Prisma.Decimal;
const Dec = Prisma.Decimal;
const ZERO = new Dec(0);
const MESE = /^\d{4}-(0[1-9]|1[0-2])$/;
const ELENCO_ID = /^\d{1,18}(,\d{1,18})*$/;
const RAGGRUPPA = ['subagente', 'fornitore', 'cliente', 'mese', 'documento'] as const;
const FORMATI = ['xlsx', 'pdf', 'csv'] as const;
type Raggruppa = (typeof RAGGRUPPA)[number];
type Formato = (typeof FORMATI)[number];

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const meseT = (k: string) => MESI[Number(k.slice(5, 7)) - 1] + ' ' + k.slice(0, 4);
const dataIt = (s: string) => s.split('-').reverse().join('/');

/** 'aaaa-mm' spostato di n mesi. */
const mese = (k: string, n: number) => {
  const t = Number(k.slice(0, 4)) * 12 + Number(k.slice(5, 7)) - 1 + n;
  return Math.floor(t / 12) + '-' + String((t % 12) + 1).padStart(2, '0');
};
const nMesi = (da: string, a: string) => Number(a.slice(0, 4)) * 12 + Number(a.slice(5, 7)) - Number(da.slice(0, 4)) * 12 - Number(da.slice(5, 7)) + 1;

/** Periodo di N mesi dentro i mesi con dati (stesso `completaPeriodo` di PeriodoMesi, §16.4). */
export function completaPeriodo(da: string, n: number, primo: string, ultimo: string) {
  let a = mese(da, n - 1);
  if (a > ultimo) { a = ultimo; da = mese(a, -(n - 1)); }
  if (da < primo) { da = primo; a = mese(da, n - 1); if (a > ultimo) a = ultimo; }
  return { da, a };
}

/* ---------- Fatti, totali e raggruppamenti ---------- */

type Totale = { fatturato: Dec; prese: Dec; pagate: Dec; margine: Dec; documenti: number; clienti: number };
type Gruppo = { chiave: string | null; nome: string } & Totale;

function somma(rr: Fatto[]): Totale {
  let fatturato = ZERO, prese = ZERO, pagate = ZERO, documenti = 0;
  const clienti = new Set<string>();
  for (const r of rr) {
    fatturato = fatturato.plus(r.importo);
    prese = prese.plus(r.prese);
    pagate = pagate.plus(r.pagate);
    if (r.tipo === 'fattura') documenti++;
    clienti.add(r.cliente_id);
  }
  return { fatturato: r2(fatturato), prese: r2(prese), pagate: r2(pagate), margine: r2(prese.minus(pagate)), documenti, clienti: clienti.size };
}

function raggruppa(rr: Fatto[], chiave: (f: Fatto) => string | null, nome: (f: Fatto) => string): Gruppo[] {
  const m = new Map<string | null, Fatto[]>();
  for (const r of rr) { const g = m.get(chiave(r)); if (g) g.push(r); else m.set(chiave(r), [r]); }
  return [...m.entries()].map(([chiave, righe]) => ({ chiave, nome: nome(righe[0]), ...somma(righe) }));
}

/* ---------- Periodo, filtri e calcolo (uguale per pagina ed esportazione) ---------- */

class Filtri {
  @IsOptional() @Matches(MESE) dal?: string; // primo mese, compreso
  @IsOptional() @Matches(MESE) al?: string; // ultimo mese, compreso
  @IsOptional() @Matches(ELENCO_ID) fornitori?: string; // selezione multipla (D-22)
  @IsOptional() @Matches(ELENCO_ID) subagenti?: string;
  @IsOptional() @Matches(ELENCO_ID) clienti?: string;
  @IsOptional() @IsIn(RAGGRUPPA) raggruppa?: Raggruppa;
}

class FiltriEsporta extends Filtri {
  @IsOptional() @IsIn(FORMATI) formato?: Formato;
}

const scelte = (v?: string) => new Set((v ? v.split(',') : []));
const DIM = { fornitori: 'fornitore_id', subagenti: 'subagente_id', clienti: 'cliente_id' } as const;
type Dimensione = keyof typeof DIM;

/** Filtri della pagina (D-22): voci dello stesso campo in **o**, campi diversi in **e**. `salvo` serve al
 *  filtro incrociato e alle voci proposte dai campi: quella dimensione si ignora (D-18, D-23). */
function filtra(rr: Fatto[], q: Filtri, salvo?: Dimensione) {
  const insiemi = (Object.keys(DIM) as Dimensione[]).map((d) => [d, scelte(q[d])] as const);
  return rr.filter((f) => insiemi.every(([d, ks]) => {
    if (d === salvo || !ks.size) return true;
    const v = f[DIM[d]];
    return v != null && ks.has(v);
  }));
}

function nomi(S: Dati) {
  const f = (id: string) => S.fornitori.get(id)?.nome ?? '';
  const s = (id: string | null) => id == null ? 'Senza subagente' : S.subagenti.get(id)?.nome ?? '';
  const c = (id: string) => S.clienti.get(id)?.nome ?? '';
  return { f, s, c };
}

interface Calcolo {
  periodo: { da: string; a: string; primo: string; ultimo: string; mesi: number };
  precedente: { da: string; a: string };
  base: Fatto[];
  sel: Fatto[];
  totale: Totale;
  totalePrec: Totale;
  conPrecedente: boolean; // c'è almeno un fatto nel periodo prima (anche se i filtri non ne prendono)
  gruppi: Record<Dimensione, Gruppo[]>; // senza il proprio filtro (grafici, D-18)
  tabelle: Record<Dimensione, Gruppo[]>; // con tutti i filtri (tabella raggruppata)
  perMese: { chiave: string; nome: string }[]; // tutti i mesi del periodo, anche vuoti
  perMeseTot: Totale[];
}

function calcola(S: Dati, fatti: Fatto[], q: Filtri): Calcolo {
  const N = nomi(S);
  const mesiDati = [...new Set(fatti.map((f) => f.mese))].sort();
  const oggi = S.oggi.slice(0, 7);
  const primo = mesiDati[0] ?? oggi;
  const ultimo = mesiDati.length ? (mesiDati[mesiDati.length - 1] < oggi ? mesiDati[mesiDati.length - 1] : oggi) : oggi;
  const dal = q.dal ?? mese(q.al ?? ultimo, -11);
  const al = q.al ?? ultimo;
  if (dal > al) throw new BadRequestException('Il periodo non è valido: il mese di inizio è dopo quello di fine');
  const per = completaPeriodo(dal, nMesi(dal, al), primo, ultimo);
  const mesi = nMesi(per.da, per.a);
  const precedente = { da: mese(per.da, -mesi), a: mese(per.da, -1) };
  const nel = (f: Fatto, p: { da: string; a: string }) => f.mese >= p.da && f.mese <= p.a;
  const base = fatti.filter((f) => nel(f, per));
  const sel = filtra(base, q);
  const basePrec = fatti.filter((f) => nel(f, precedente));

  const perMese: { chiave: string; nome: string }[] = [];
  for (let k = per.da; k <= per.a; k = mese(k, 1)) perMese.push({ chiave: k, nome: meseT(k) });

  return {
    periodo: { ...per, primo, ultimo, mesi },
    precedente,
    base,
    sel,
    totale: somma(sel),
    totalePrec: somma(filtra(basePrec, q)),
    conPrecedente: basePrec.length > 0,
    gruppi: {
      fornitori: raggruppa(filtra(base, q, 'fornitori'), (f) => f.fornitore_id, (f) => N.f(f.fornitore_id)),
      subagenti: raggruppa(filtra(base, q, 'subagenti'), (f) => f.subagente_id, (f) => N.s(f.subagente_id)),
      clienti: raggruppa(filtra(base, q, 'clienti'), (f) => f.cliente_id, (f) => N.c(f.cliente_id)),
    },
    tabelle: {
      fornitori: raggruppa(sel, (f) => f.fornitore_id, (f) => N.f(f.fornitore_id)),
      subagenti: raggruppa(sel, (f) => f.subagente_id, (f) => N.s(f.subagente_id)),
      clienti: raggruppa(sel, (f) => f.cliente_id, (f) => N.c(f.cliente_id)),
    },
    perMese,
    perMeseTot: perMese.map((m) => somma(sel.filter((f) => f.mese === m.chiave))),
  };
}

const n = (x: Dec) => Number(x);
const variazione = (v: Dec, p: Dec) => (p.abs().lt(new Dec('0.01')) ? null : Math.round(v.minus(p).times(100).div(p.abs()).toNumber()));
const pct = (v: Dec, su: Dec) => (su.isZero() ? 0 : n(r2(v.times(100).div(su))));
const perFatturato = (a: Gruppo, b: Gruppo) => b.fatturato.comparedTo(a.fatturato);
const perPrese = (a: Gruppo, b: Gruppo) => b.prese.comparedTo(a.prese);

/* ---------- Pagina ---------- */

function pagina(S: Dati, c: Calcolo, q: Filtri) {
  const t = c.totale, p = c.totalePrec;
  const filtriAttivi = (Object.keys(DIM) as Dimensione[]).some((d) => scelte(q[d]).size);
  const N = nomi(S);
  const perDim = (dim: Dimensione) => [...c.gruppi[dim]]; // grafici: senza il proprio filtro
  const perTabella = (dim: Dimensione) => [...c.tabelle[dim]]; // tabella: con tutti i filtri
  const vociDi = (dim: Dimensione) => [...new Set(filtra(c.base, q, dim).map((x) => x[DIM[dim]]))];

  // 2. fatturato per fornitore: i primi 7, gli altri insieme ("Altri N")
  const fo = perDim('fornitori').sort(perFatturato);
  const primi = fo.slice(0, fo.length <= 8 ? 8 : 7), altri = fo.slice(primi.length);
  const graficoFornitori = {
    etichette: primi.map((x) => x.nome).concat(altri.length ? ['Altri ' + altri.length] : []),
    chiavi: (primi.map((x) => x.chiave) as (string | null)[]).concat(altri.length ? [null] : []),
    valori: primi.map((x) => n(x.fatturato)).concat(altri.length ? [n(r2(altri.reduce((x, y) => x.plus(y.fatturato), ZERO)))] : []),
  };
  // 3. subagenti: provvigioni generate, divise fra subagente e Decobrands (impilate)
  const su = perDim('subagenti').sort(perPrese);
  const cl = perDim('clienti').sort(perFatturato).slice(0, 10);

  const righe = ((): Gruppo[] | null => {
    const g = q.raggruppa ?? 'subagente';
    if (g === 'documento') return null;
    return g === 'mese'
      ? c.perMese.map((m, i) => ({ chiave: m.chiave, nome: m.nome, ...c.perMeseTot[i] })).filter((x) => x.documenti || !x.fatturato.isZero())
        .sort((a, b) => a.chiave.localeCompare(b.chiave))
      : (g === 'fornitore' ? perTabella('fornitori') : g === 'subagente' ? perTabella('subagenti') : perTabella('clienti')).sort(perFatturato);
  })();

  return {
    periodo: c.periodo,
    precedente: c.precedente,
    confronto: {
      possibile: c.conPrecedente,
      etichetta: c.periodo.mesi === 12 ? 'sullo stesso periodo dell’anno prima' : 'sui ' + c.periodo.mesi + ' mesi prima',
    },
    filtri_attivi: filtriAttivi,
    // voci proposte dai campi di ricerca: con gli altri filtri attivi, senza il proprio (D-23); il
    // documento senza subagente non è una voce sceglibile (non è un subagente)
    voci: { fornitori: vociDi('fornitori'), subagenti: vociDi('subagenti').filter((x) => x != null) as string[], clienti: vociDi('clienti') },
    numeri: {
      fatturato: n(t.fatturato), prese: n(t.prese), pagate: n(t.pagate), margine: n(t.margine),
      documenti: t.documenti, clienti: t.clienti,
      precedente: { fatturato: n(p.fatturato), prese: n(p.prese), pagate: n(p.pagate), margine: n(p.margine) },
      variazione: {
        fatturato: variazione(t.fatturato, p.fatturato), prese: variazione(t.prese, p.prese),
        pagate: variazione(t.pagate, p.pagate), margine: variazione(t.margine, p.margine),
      },
      pct: { prese_su_fatturato: pct(t.prese, t.fatturato), pagate_su_prese: pct(t.pagate, t.prese), margine_su_prese: pct(t.margine, t.prese) },
    },
    grafici: {
      andamento: {
        mesi: c.perMese.map((m) => m.chiave),
        serie: [
          { nome: 'Dai fornitori', valori: c.perMeseTot.map((x) => n(x.prese)) },
          { nome: 'Ai subagenti', valori: c.perMeseTot.map((x) => n(x.pagate)) },
          { nome: 'Margine', valori: c.perMeseTot.map((x) => n(x.margine)), tipo: 'line' as const },
        ],
      },
      fornitori: graficoFornitori,
      subagenti: {
        etichette: su.map((x) => x.nome), chiavi: su.map((x) => x.chiave),
        serie: [
          { nome: 'Al subagente', valori: su.map((x) => n(x.pagate)) },
          { nome: 'Margine Decobrands', valori: su.map((x) => n(x.margine)) },
        ],
      },
      clienti: { etichette: cl.map((x) => x.nome), chiavi: cl.map((x) => x.chiave), valori: cl.map((x) => n(x.fatturato)) },
    },
    tabella: {
      raggruppa: q.raggruppa ?? 'subagente',
      totale: c.sel.length,
      // totali degli importi dal server (V12, D-126 §19): il piede li mostra senza sommare
      totali: { fatturato: n(t.fatturato), prese: n(t.prese), pagate: n(t.pagate), margine: n(t.margine) },
      righe: righe
        ? righe.map((x) => ({
          chiave: x.chiave, nome: x.nome, documenti: x.documenti, clienti: x.clienti,
          fatturato: n(x.fatturato), prese: n(x.prese), pagate: n(x.pagate), margine: n(x.margine),
          quota: t.fatturato.isZero() ? 0 : n(r2(x.fatturato.times(100).div(t.fatturato))),
        }))
        : c.sel.map((x) => ({
          chiave: x.documento_id, tipo: x.tipo, numero: x.numero, data: x.data, pratica_id: x.pratica_id,
          nome: N.c(x.cliente_id), fornitore: N.f(x.fornitore_id), subagente: N.s(x.subagente_id),
          fatturato: n(x.importo), prese: n(x.prese), pagate: n(x.pagate), margine: n(x.margine),
        })),
    },
  };
}

/* ---------- Esportazione (§11): Excel e CSV, stessi numeri della pagina ---------- */

const EURO = '#,##0.00 "€"';
const QUOTA = '0.00%';
const DATA = 'dd/mm/yyyy';
const BLU = 'FF084298', BLU_TENUE = 'FFE9F0FD', GRIGIO = 'FFF1F3F5', BORDO = 'FFBFD3EA';

type Col = { t: string; w: number; tipo?: 'euro' | 'pct' | 'data' | 'num' };

function tabella(ws: ExcelJS.Worksheet, col: Col[], righe: (string | number | Date)[][], totale?: (string | number | null)[], somme: number[] = []) {
  col.forEach((c, i) => { ws.getColumn(i + 1).width = c.w; });
  const testa = ws.addRow(col.map((c) => c.t));
  testa.font = { bold: true, color: { argb: BLU } };
  testa.eachCell((x) => { x.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLU_TENUE } }; x.border = { bottom: { style: 'thin', color: { argb: BORDO } } }; });
  const prima = ws.rowCount + 1;
  for (const r of righe) {
    const x = ws.addRow(r);
    col.forEach((c, i) => { if (c.tipo) x.getCell(i + 1).numFmt = c.tipo === 'euro' ? EURO : c.tipo === 'pct' ? QUOTA : c.tipo === 'data' ? DATA : '0'; });
  }
  if (totale) {
    const ultima = ws.rowCount;
    const x = ws.addRow(totale);
    x.font = { bold: true };
    x.eachCell((y) => { y.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIGIO } }; y.border = { top: { style: 'thin', color: { argb: BORDO } } }; });
    for (const i of somme) {
      const l = ws.getColumn(i + 1).letter;
      // la formula con il risultato già calcolato: Excel la ricalcola, chi legge il file la vede subito
      x.getCell(i + 1).value = { formula: `SUM(${l}${prima}:${l}${ultima})`, result: Number(totale[i] ?? 0) };
      x.getCell(i + 1).numFmt = col[i].tipo === 'euro' ? EURO : '0';
    }
  }
  ws.autoFilter = { from: { row: prima - 1, column: 1 }, to: { row: prima - 1 + righe.length, column: col.length } };
}

function foglio(wb: ExcelJS.Workbook, nome: string, titolo: string, ctx: string, azienda = '') {
  const ws = wb.addWorksheet(nome, {
    views: [{ state: 'frozen', ySplit: 4 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    headerFooter: { oddFooter: [azienda, nome, 'pagina &P di &N'].filter(Boolean).join(' · ') },
  });
  ws.addRow([titolo]).font = { bold: true, size: 14, color: { argb: BLU } };
  ws.addRow([ctx]);
  ws.addRow([]);
  return ws;
}

const colGruppi = (voce: string): Col[] => [
  { t: voce, w: 34 }, { t: 'Fatture', w: 10, tipo: 'num' }, { t: 'Base provvigione', w: 18, tipo: 'euro' },
  { t: 'Dai fornitori', w: 18, tipo: 'euro' }, { t: 'Ai subagenti', w: 18, tipo: 'euro' }, { t: 'Margine Decobrands', w: 20, tipo: 'euro' },
  { t: 'Quota del fatturato', w: 18, tipo: 'pct' },
];

/** Il file Excel dell'analisi: riepilogo, un foglio per raggruppamento, i documenti. */
async function excel(S: Dati, c: Calcolo, q: Filtri, azienda = '') {
  const N = nomi(S);
  const { f, s } = N;
  const t = c.totale, p = c.totalePrec;
  const filtriAttivi = (Object.keys(DIM) as Dimensione[]).some((d) => scelte(q[d]).size);
  const nomeVoci = (d: Dimensione) => [...scelte(q[d])].map((k) => (d === 'fornitori' ? f(k) : d === 'subagenti' ? s(k) : N.c(k)) || k).join(', ');
  const testoFiltri = filtriAttivi
    ? (['fornitori', 'subagenti', 'clienti'] as Dimensione[]).filter((d) => scelte(q[d]).size).map((d) => d[0].toUpperCase() + d.slice(1) + ': ' + nomeVoci(d)).join(' · ')
    : 'tutti i fornitori, subagenti e clienti';
  const ctx = `Da ${meseT(c.periodo.da)} a ${meseT(c.periodo.a)} · ${testoFiltri}`;
  const nota = [azienda, 'importi per data del documento', `generato il ${dataIt(S.oggi)}`].filter(Boolean).join(' · ');

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Decobrands CRM';
  const r = foglio(wb, 'Riepilogo', 'Analisi provvigioni ' + meseT(c.periodo.da) + ' – ' + meseT(c.periodo.a), ctx + '\n' + nota, azienda);
  const var_ = (v: Dec, x: Dec) => (x.abs().lt(new Dec('0.01')) ? '' : v.minus(x).div(x.abs()).toDecimalPlaces(4).toNumber());
  tabella(r, [
    { t: 'Voce', w: 34 }, { t: 'Periodo', w: 20, tipo: 'euro' }, { t: 'Periodo precedente', w: 20, tipo: 'euro' }, { t: 'Variazione', w: 14, tipo: 'pct' },
  ], [
    ['Fatturato dei clienti', n(t.fatturato), n(p.fatturato), var_(t.fatturato, p.fatturato)],
    ['Provvigioni dai fornitori', n(t.prese), n(p.prese), var_(t.prese, p.prese)],
    ['Provvigioni ai subagenti', n(t.pagate), n(p.pagate), var_(t.pagate, p.pagate)],
    ['Margine Decobrands', n(t.margine), n(p.margine), var_(t.margine, p.margine)],
  ]);
  r.addRow([]);
  r.addRow([`Periodo precedente: ${meseT(c.precedente.da)} – ${meseT(c.precedente.a)}, stessi filtri. ${t.documenti} fatture, ${t.clienti} clienti.`]);
  r.addRow(['Importi per data del documento (competenza), note di credito comprese con segno negativo; gli storni per mancato pagamento non cambiano questi numeri.']);

  const gruppi = (d: Dimensione, voce: string) => {
    const rr = [...c.tabelle[d]].sort(perFatturato);
    const ws = foglio(wb, 'Per ' + voce.toLowerCase(), 'Analisi per ' + voce.toLowerCase(), ctx + '\n' + nota, azienda);
    tabella(ws, colGruppi(voce), rr.map((x) => [
      x.nome, x.documenti, n(x.fatturato), n(x.prese), n(x.pagate), n(x.margine),
      t.fatturato.isZero() ? 0 : x.fatturato.div(t.fatturato).toDecimalPlaces(4).toNumber(),
    ]), ['Totale', t.documenti, n(t.fatturato), n(t.prese), n(t.pagate), n(t.margine), 1], [1, 2, 3, 4, 5]);
  };
  gruppi('subagenti', 'Subagente');
  gruppi('fornitori', 'Fornitore');
  gruppi('clienti', 'Cliente');
  {
    const ws = foglio(wb, 'Per mese', 'Analisi per mese', ctx + '\n' + nota, azienda);
    tabella(ws, colGruppi('Mese'), c.perMese.map((m, i) => {
      const x = c.perMeseTot[i];
      return [m.nome, x.documenti, n(x.fatturato), n(x.prese), n(x.pagate), n(x.margine), t.fatturato.isZero() ? 0 : x.fatturato.div(t.fatturato).toDecimalPlaces(4).toNumber()];
    }), ['Totale', t.documenti, n(t.fatturato), n(t.prese), n(t.pagate), n(t.margine), 1], [1, 2, 3, 4, 5]);
  }
  {
    const col: Col[] = [
      { t: 'Data', w: 12, tipo: 'data' }, { t: 'Documento', w: 16 }, { t: 'Fornitore', w: 18 }, { t: 'Cliente', w: 32 },
      { t: 'Subagente', w: 20 }, { t: 'Base provvigione', w: 16, tipo: 'euro' }, { t: 'Dai fornitori', w: 16, tipo: 'euro' },
      { t: 'Ai subagenti', w: 16, tipo: 'euro' }, { t: 'Margine', w: 16, tipo: 'euro' },
    ];
    const ws = foglio(wb, 'Documenti', 'Documenti del periodo', ctx + '\n' + nota, azienda);
    tabella(ws, col, c.sel.map((x) => [
      new Date(Date.UTC(Number(x.data.slice(0, 4)), Number(x.data.slice(5, 7)) - 1, Number(x.data.slice(8, 10)))),
      (x.tipo === 'nota_credito' ? 'NC ' : '') + x.numero, f(x.fornitore_id), N.c(x.cliente_id), s(x.subagente_id),
      n(x.importo), n(x.prese), n(x.pagate), n(x.margine),
    ]), ['Totale · ' + c.sel.length + ' documenti', null, null, null, null, n(t.fatturato), n(t.prese), n(t.pagate), n(t.margine)], [5, 6, 7, 8]);
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** CSV: solo l'elenco dei documenti, separatore ';', virgola decimale, UTF-8 con BOM (§11). */
function csv(S: Dati, c: Calcolo) {
  const N = nomi(S);
  const { f, s } = N;
  const num = (v: number) => v.toFixed(2).replace('.', ',');
  const righe = [['Data', 'Documento', 'Tipo', 'Fornitore', 'Partita IVA cliente', 'Cliente', 'Subagente', 'Base provvigione', 'Dai fornitori', 'Ai subagenti', 'Margine']];
  for (const x of c.sel) {
    righe.push([dataIt(x.data), x.numero, x.tipo === 'nota_credito' ? 'nota di credito' : 'fattura', f(x.fornitore_id),
      S.clienti.get(x.cliente_id)?.piva ?? '', N.c(x.cliente_id), s(x.subagente_id), num(n(x.importo)), num(n(x.prese)), num(n(x.pagate)), num(n(x.margine))]);
  }
  return Buffer.from('\ufeff' + righe.map((r) => r.map(cella).join(';')).join('\r\n'), 'utf8');
}

/* ---------- Rotte ---------- */

@Controller('analisi')
export class AnalisiController {
  constructor(private readonly db: PrismaService) {}

  /** La pagina (§7.22): periodo, filtri, numeri con il periodo precedente, grafici e tabella raggruppata.
   *  `raggruppa` sceglie la tabella; senza `dal`/`al`, gli ultimi 12 mesi con dati. */
  @Get()
  @Richiede('provvigioni.consulta')
  async pagina(@Query() q: Filtri) {
    if (q.dal && q.al && q.dal > q.al) throw new BadRequestException('Il periodo non è valido: il mese di inizio è dopo quello di fine');
    const S = await caricaDati(this.db);
    // D-207 §19: gli ordini annullati sono esclusi dai fatti (fattiAnalisi); qui solo il conteggio a parte
    return { ...pagina(S, calcola(S, fattiAnalisi(S), q), q), annullati: S.pratiche.filter((p) => p.annullata).length };
  }

  /** Esportazione (§11): Excel con i fogli e i totali a formule, CSV dei documenti, o PDF convertito dal
   *  medesimo .xlsx con LibreOffice (F4-A3, D-61). */
  @Get('esporta')
  @Richiede('provvigioni.esporta')
  async esporta(@Query() q: FiltriEsporta, @Res({ passthrough: true }) res: Response) {
    if (q.dal && q.al && q.dal > q.al) throw new BadRequestException('Il periodo non è valido: il mese di inizio è dopo quello di fine');
    const S = await caricaDati(this.db);
    const c = calcola(S, fattiAnalisi(S), q);
    const formato = q.formato ?? 'xlsx';
    const filtro = (Object.keys(DIM) as Dimensione[]).some((d) => scelte(q[d]).size) ? '_filtrata' : '';
    const nome = `Analisi_${c.periodo.da}_${c.periodo.a}${filtro}.${formato}`;
    const a = await ragioneSociale(this.db);
    const azienda = [a.ragione_sociale, a.piva, a.indirizzo, a.email].filter(Boolean).join(' · ');
    const dati = formato === 'csv' ? csv(S, c) : await excel(S, c, q, azienda);
    res.set({
      'Content-Type': formato === 'csv' ? 'text/csv; charset=utf-8'
        : formato === 'pdf' ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nome}"`,
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(formato === 'pdf' ? await convertiPdf(dati) : dati);
  }
}
