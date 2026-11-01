// Prova del motore (fase 2c, F0-A5): carica il seed su decobrands_test e confronta ogni numero con
// il prototipo vero (dati.js + motore.js eseguiti in Node, test/prototipo.ts), al centesimo.
// Alcuni numeri sono scritti anche a mano, come àncora dei casi di §12.
import 'dotenv/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../src/prisma.service';
import { seed } from '../prisma/seed';
import { caricaDati, Dati } from '../src/motore/dati';
import * as m from '../src/motore/motore';
import { svuota } from './svuota';
import { prototipo } from './prototipo';

/* eslint-disable @typescript-eslint/no-explicit-any */
const OGGI = '2026-09-04'; // "oggi" del prototipo
let db: PrismaService, S: Dati, M: any;
const n = (x: Prisma.Decimal | null | undefined) => (x == null ? null : x.toNumber());
const j = (x: unknown) => JSON.parse(JSON.stringify(x ?? null)); // oggetti del prototipo (altro contesto vm) → semplici
const dec = (x: number) => new Prisma.Decimal(x);

beforeAll(async () => {
  db = new PrismaService();
  await svuota(db);
  await seed(db);
  S = await caricaDati(db, OGGI);
  M = prototipo();
}, 120_000);
afterAll(async () => {
  await svuota(db);
  await db.$disconnect();
});

// corrispondenze fra i due mondi: numeri di pratica e documento, nomi di fornitori e subagenti
const pratica = (numero: string) => S.pratiche.find((p) => p.numero === numero)!;
const praticaM = (numero: string) => M.S.pratiche.find((p: any) => p.numero === numero);
const doc = (numero: string) => m.trovaDocumento(S, numero)!;
const nomeSub = (id: string) => S.subagenti.get(id)!.nome;
const fornitore = (inizio: string) => [...S.fornitori.values()].find((f) => f.nome.startsWith(inizio))!;
const TRIMESTRI = [2025, 2026].flatMap((a) => [1, 2, 3, 4].map((t) => [a, t] as const));

describe('motore §10 = prototipo', () => {
  it('scaglioni Gries 0/1/5/10/100 % e versioni datate (D-25)', () => {
    const attesi: [number, number, number][] = [[0, 18, 10], [1, 18, 0], [3, 18, 0], [5, 13, 7], [7, 13, 7], [10, 5, 2], [50, 5, 2], [100, 0, 0]];
    for (const [sconto, agente, sub] of attesi) {
      const sc = m.scaglione(S, fornitore('Gries').id, dec(sconto), OGGI)!;
      const p = M.scaglione(1, sconto, OGGI);
      expect([sconto, n(sc.pct_agente), n(sc.pct_sub)]).toEqual([sconto, p.pct_agente, p.pct_sub]);
      expect([sconto, n(sc.pct_agente), n(sc.pct_sub)]).toEqual([sconto, agente, sub]);
    }
    // nuova versione dello scaglione 0 dal 01/09/2026: i documenti di prima restano al 18 + 10
    const nuova = { ...S.scaglioni[0], id: 'nuova', valido_dal: '2026-09-01', pct_agente: dec(20) };
    const S2 = { ...S, scaglioni: [...S.scaglioni, nuova] };
    M.S.scaglioni.push({ id: 999, fornitore_id: 1, valido_dal: '2026-09-01', sconto: 0, pct_agente: 20, pct_sub: 10 });
    try {
      for (const data of ['2026-08-31', '2026-09-01']) {
        expect(n(m.scaglione(S2, fornitore('Gries').id, dec(0), data)!.pct_agente)).toBe(M.scaglione(1, 0, data).pct_agente);
      }
      expect(n(m.scaglione(S2, fornitore('Gries').id, dec(0), '2026-09-01')!.pct_agente)).toBe(20);
    } finally { M.S.scaglioni.pop(); }
  });

  it('eccezione Bastasin 3 % sullo scaglione 1 % (§5.2)', () => {
    const perc = m.percentuali(S, pratica('OF/2026/041'))!;
    expect(nomeSub(perc.subagente_id)).toBe('Stefano Bastasin');
    expect([n(perc.sconto), n(perc.agente), n(perc.sub_standard), n(perc.sub), perc.eccezione, n(perc.dal_fornitore)]).toEqual([1, 18, 0, 3, true, 18]);
    const pm = M.percentuali(praticaM('OF/2026/041'));
    expect([n(perc.sub), n(perc.dal_fornitore)]).toEqual([pm.sub, pm.dal_fornitore]);
  });

  it('ogni documento fiscale: importo, % dal fornitore, provvigione presa e quota del subagente', () => {
    const nostri = S.pratiche.flatMap((p) => p.documenti.map((d) => {
      const pr = m.provvigioneDoc(S, p, d);
      return [d.numero, n(d.importo), n(pr?.perc.dal_fornitore), n(pr?.prese), n(pr?.sub.pct), n(pr?.pagate), pr?.sub.regola ?? null, pr ? nomeSub(pr.perc.subagente_id) : null];
    }));
    const loro = M.S.pratiche.flatMap((p: any) => M.fiscali(p).map((d: any) => {
      const perc = M.percentuali(p, d.data), q = perc && M.quotaSub(p, d), imp = M.importoDoc(d);
      return [d.numero, imp, perc?.dal_fornitore ?? null, perc ? M.r2(imp * perc.dal_fornitore / 100) : null, q?.pct ?? null, q?.provvigione ?? null, q?.regola ?? null, perc ? M.subagente(perc.subagente_id).nome : null];
    }));
    expect(nostri).toHaveLength(40);
    expect(nostri).toEqual(j(loro));
    expect(nostri.filter((x) => x[6] === 'eccezione')).toHaveLength(1);
  });

  it('pratiche: stato ricavato dai documenti, importo, netto, variazioni fra le fasi', () => {
    // S12-2 escluso dalle variazioni: vedi la prova delle tranche
    const nostri = S.pratiche.map((p) => { const st = m.statoPratica(S, p); return [p.numero, st.chiave, 'scadenza' in st ? st.scadenza : null, n(m.importoPratica(p)), n(m.netto(p)), p.numero === 'OF/2026/S12-2' || m.haVariazioni(p)]; });
    const loro = M.S.pratiche.map((p: any) => { const st = M.statoPratica(p); return [p.numero, st.chiave, st.scadenza ?? null, M.importoPratica(p), M.netto(p), p.numero === 'OF/2026/S12-2' || M.haVariazioni(p)]; });
    expect(nostri).toHaveLength(54);
    expect(nostri).toEqual(j(loro));
  });

  it('conferma ridotta 7/10 (S12-1, §5.8)', () => {
    const p = pratica('OF/2026/S12-1'), c = m.confronto(p);
    expect(c).toHaveLength(10);
    expect(c.filter((r) => r.per[1] === null).map((r) => r.codice)).toEqual(['CIOT-387', 'SOGG-0491', 'VASA-3828']);
    expect(c.map((r) => [r.codice, r.varia, n(r.delta)])).toEqual(j(M.confronto(praticaM('OF/2026/S12-1')).map((r: any) => [r.codice, r.varia, r.delta])));
    expect(m.haVariazioni(p)).toBe(true);
    expect(m.statoPratica(S, p).chiave).toBe('confermata');
    expect(n(m.importoPratica(p))).toBe(M.importoPratica(praticaM('OF/2026/S12-1')));
    expect(n(m.importoPratica(p))).toBe(1891.32); // la conferma, non l'ordine
  });

  it('fattura in due tranche (S12-2, §5.9): netto = somma delle fatture, provvigione per tranche', () => {
    const p = pratica('OF/2026/S12-2'), pm = praticaM('OF/2026/S12-2');
    expect(p.documenti.map((d) => n(d.importo))).toEqual([764.4, 481.2]);
    expect(n(m.netto(p))).toBe(M.netto(pm));
    expect(n(m.netto(p))).toBe(1245.6);
    expect(m.statoPratica(S, p).chiave).toBe('fatturata');
    // differenza voluta: il prototipo confronta solo la prima tranche (M.doc trova una fattura) e vede
    // due articoli spariti; nel database le righe di fattura sono tutte le tranche e non c'è variazione
    expect(M.haVariazioni(pm)).toBe(true);
    expect(m.haVariazioni(p)).toBe(false);
  });

  it('nota di credito parziale NC-2026-005: −1311,00, provvigione in negativo (§5.3)', () => {
    const { pratica: p, doc: d } = doc('NC-2026-005');
    expect([n(d.importo), m.documentoPerId(S, d.fattura_id!)!.doc.numero]).toEqual([-1311, 'F-2026-0815']);
    const pr = m.provvigioneDoc(S, p, d)!;
    expect(n(pr.prese)).toBe(-367.08); // 28 % come nel bollettino Gries di agosto
    expect(n(m.netto(p))).toBe(M.netto(praticaM(p.numero)));
    expect(n(m.netto(p))).toBe(4289);
  });

  it('riconciliazione di tutti i bollettini (differenze, mancanti, storni, maturato)', () => {
    expect(S.bollettini).toHaveLength(M.S.bollettini.length);
    S.bollettini.forEach((b, i) => {
      const r = m.riconcilia(S, b), x = M.riconcilia(M.S.bollettini[i]);
      const riga = (y: any) => [y.numero, y.categoria, y.noi?.importo ?? null, y.differenza ?? null, y.aperta, !!y.incasso, !!y.pagamento];
      expect([b.anno, b.mese, n(r.riconosciuto), n(r.atteso), n(r.differenza), r.aperte]).toEqual(j([M.S.bollettini[i].anno, M.S.bollettini[i].mese, x.riconosciuto, x.atteso, x.differenza, x.aperte]));
      expect(r.righe.map((y) => riga({ ...y, noi: y.noi && { importo: n(y.noi.importo) }, differenza: n(y.differenza) }))).toEqual(j(x.righe.map(riga)));
    });
    // Gries luglio: F-2026-0912 riconosciuta al 17,5 % invece del 18 % (promozione)
    const luglio = m.riconcilia(S, S.bollettini.find((b) => b.fornitore_id === fornitore('Gries').id && b.mese === 7)!);
    const f = luglio.righe.find((r) => r.numero === 'F-2026-0912')!;
    expect([f.categoria, n(f.noi!.importo), n(f.differenza)]).toEqual(['differenza', 1177.2, -32.7]);
    // Gries agosto (maturato): F-2026-0858 di giugno pagata ad agosto
    const agosto = m.riconcilia(S, S.bollettini.find((b) => b.fornitore_id === fornitore('Gries').id && b.mese === 8)!);
    expect(agosto.righe.find((r) => r.numero === 'F-2026-0858')!.pagamento).toBe(true);
  });

  it('stato d\'incasso di ogni fattura (§5.14)', () => {
    const nostri = S.pratiche.flatMap((p) => p.documenti.map((d) => { const st = m.statoIncasso(S, p, d); return [d.numero, st?.stato ?? null, st && !st.manuale ? st.dal : null, st?.giorni ?? null]; }));
    // la data della segnalazione a mano nel prototipo è un segnaposto ('%d-%02d-15'): si confronta lo stato
    const loro = M.S.pratiche.flatMap((p: any) => M.fiscali(p).map((d: any) => { const st = M.statoIncasso(p, d); return [d.numero, st?.stato ?? null, st && !st.manuale ? st.dal ?? null : null, st?.giorni ?? null]; }));
    // differenza voluta (§5.14): il server conta solo i bollettini chiusi, il prototipo anche quelli da verificare
    const diversi = nostri.filter((x, i) => JSON.stringify(x) !== JSON.stringify(loro[i])).map((x) => x[0]);
    expect(diversi).toEqual(['F-2026-0891', 'F-2026-0912', 'F-2026-0822']);
    expect(nostri.filter((x) => !diversi.includes(x[0] as string))).toEqual(j(loro.filter((x: any) => !diversi.includes(x[0]))));
    const st = (num: string) => { const x = doc(num); return m.statoIncasso(S, x.pratica, x.doc)!; };
    expect([st('F-2026-0858').stato, st('F-2026-0858').dal]).toEqual(['pagata', '2026-08-01']); // maturato: pagata nel mese del bollettino verificato
    expect(st('F-2026-0891').stato).toBe('da_verificare'); // maturato: bollettino di luglio da verificare, 64 giorni > 60 (prototipo: pagata)
    expect(st('F-2026-0912').stato).toBe('da_incassare'); // idem, 38 giorni (prototipo: pagata)
    expect(st('F-2026-0822').stato).toBe('da_incassare'); // storno nel bollettino Gasper di agosto, da verificare (prototipo: insoluta)
    // verificato il bollettino, lo storno rende la fattura insoluta come nel prototipo
    const b = S.bollettini.find((x) => x.fornitore_id === fornitore('Gasper').id && x.mese === 8)!;
    b.stato = 'verificato';
    try { expect(st('F-2026-0822').stato).toBe('insoluta'); } finally { b.stato = 'da_verificare'; }
  });

  it('liquidazioni 2025–2026: righe e totali per subagente', () => {
    for (const [a, t] of TRIMESTRI) {
      const ordina = (x: any[]) => x.sort((p, q) => p[2].localeCompare(q[2]) || p[0].localeCompare(q[0]) || String(p[1]).localeCompare(String(q[1])));
      const nostre = m.righeLiquidazione(S, a, t);
      const loro = M.righeLiquidazione(a, t);
      expect([a, t, ordina(nostre.map((r) => [r.numero, r.voce, r.data, r.liquidabile, r.incasso, n(r.importo), n(r.pct), n(r.provvigione), nomeSub(r.subagente_id)]))])
        .toEqual(j([a, t, ordina(loro.map((r: any) => [r.doc.numero, r.voce ?? null, r.doc.data, r.liquidabile, r.incasso ?? false, r.importo, r.pct, r.provvigione, M.subagente(r.subagente_id).nome]))]));
      const somma = (rr: any[], k: string) => M.r2(rr.reduce((s, r) => s + r[k], 0));
      const loroSub = M.S.subagenti.map((s: any) => {
        const rr = loro.filter((r: any) => r.subagente_id === s.id), liq = rr.filter((r: any) => r.liquidabile);
        return [s.nome, rr.length, liq.length, somma(liq, 'importo'), somma(liq, 'provvigione'), somma(rr.filter((r: any) => !r.liquidabile), 'provvigione'), rr.filter((r: any) => r.voce === 'storno').length];
      }).filter((x: any) => x[1]).sort((x: any, y: any) => x[0].localeCompare(y[0]));
      expect([a, t, m.riepilogoLiquidazione(S, nostre).map((s) => [s.nome, s.documenti, s.liquidabili, n(s.imponibile), n(s.provvigione), n(s.in_attesa), s.storni])]).toEqual(j([a, t, loroSub]));
    }
    // àncora: 3° trimestre 2026, provvigione liquidabile e in attesa per subagente
    expect(m.riepilogoLiquidazione(S, m.righeLiquidazione(S, 2026, 3)).map((s) => [s.nome, s.documenti, n(s.provvigione), n(s.in_attesa)])).toEqual([
      ['Elisa Ravelli', 2, 558.75, 309.6], ['Giorgio Pontoglio', 1, 278.6, 0], ['Marco Nista', 2, 960, 0], ['Stefano Bastasin', 5, 189.03, 196.2]]);
  });

  it('trimestre chiuso: fotografia del prospetto e documenti legati (D-33, D-34)', async () => {
    const liq = await db.liquidazioni.findUniqueOrThrow({ where: { anno_trimestre: { anno: 2026, trimestre: 2 } }, include: { documenti: true } });
    // come alla chiusura: era chiuso solo il 1° trimestre
    const prima = { ...S, liquidazioni_chiuse: S.liquidazioni_chiuse.filter((x) => x.trimestre === 1) };
    const righe = m.righeLiquidazione(prima, 2026, 2);
    expect(liq.totali).toEqual(j(m.fotografiaLiquidazione(prima, righe)));
    // nel seed nessuno storno cade in un trimestre chiuso: nessuna riga di bollettino legata
    expect(await db.bollettini_righe.count({ where: { liquidazione_id: { not: null } } })).toBe(0);
    // righe dei bollettini chiusi abbinate al documento per id (D-34)
    expect(await db.bollettini_righe.count({ where: { documento_id: { not: null } } })).toBe(5);
    expect(liq.documenti.map((d) => d.numero).sort()).toEqual(righe.filter((r) => r.liquidabile && !r.voce).map((r) => r.numero).sort());
    expect(liq.documenti.length).toBeGreaterThan(0);
  });

  it('storno in un trimestre aperto alla chiusura: la voce porta la riga del bollettino da legare (D-11)', () => {
    // il bollettino Gasper di agosto chiuso a giugno, quando il 2° trimestre era ancora aperto (caso costruito)
    const b = S.bollettini.find((x) => x.fornitore_id === fornitore('Gasper').id && x.mese === 8)!;
    const prima = { ...S, liquidazioni_chiuse: S.liquidazioni_chiuse.filter((x) => x.trimestre === 1) };
    b.stato = 'verificato'; b.chiuso_il = '2026-06-25';
    try {
      const voce = m.righeLiquidazione(prima, 2026, 2).find((r) => r.voce === 'storno')!;
      expect([voce.numero, voce.riga_bollettino_id]).toEqual(['F-2026-0822', b.righe.find((r) => r.tipo === 'storno')!.id]);
    } finally { b.stato = 'da_verificare'; b.chiuso_il = null; }
  });

  it('fornitore sul maturato: la fattura entra nel trimestre del bollettino che la riconosce', () => {
    // F-2026-0858 (Gries, giugno) riconosciuta nel bollettino di agosto verificato → 3° trimestre, non il 2°
    expect(m.righeLiquidazione(S, 2026, 2).some((r) => r.numero === 'F-2026-0858')).toBe(false);
    expect(m.righeLiquidazione(S, 2026, 3).find((r) => r.numero === 'F-2026-0858')!.liquidabile).toBe(true);
    // F-2026-0891 (luglio) è nel bollettino di luglio non ancora verificato: in attesa
    const r = m.righeLiquidazione(S, 2026, 3).find((x) => x.numero === 'F-2026-0891')!;
    expect([r.liquidabile, r.motivo]).toEqual([false, 'bollettino_da_verificare']);
  });

  it('storno: al subagente nella prima liquidazione aperta dopo la chiusura del bollettino (D-11)', () => {
    expect(m.trimestreLiquidazione(S, '2026-05-10')).toEqual(j(M.trimestreLiquidazione('2026-05-10')));
    expect(m.trimestreLiquidazione(S, '2026-05-10')).toEqual({ a: 2026, t: 3 }); // il 2° è chiuso
    // il bollettino Gasper di agosto si verifica oggi: lo storno di F-2026-0822 (giugno, 2° trimestre già liquidato) va al 3°
    const b = S.bollettini.find((x) => x.fornitore_id === fornitore('Gasper').id && x.mese === 8)!;
    const bm = M.S.bollettini.find((x: any) => x.fornitore_id === 2 && x.mese === 8);
    b.stato = bm.stato = 'verificato'; b.chiuso_il = OGGI;
    try {
      const voce = m.righeLiquidazione(S, 2026, 3).find((r) => r.voce === 'storno')!;
      const loro = M.righeLiquidazione(2026, 3).find((r: any) => r.voce === 'storno');
      expect([voce.numero, voce.origine, voce.data, n(voce.importo), n(voce.provvigione)]).toEqual(j([loro.doc.numero, loro.doc.origine, loro.doc.data, loro.importo, loro.provvigione]));
      expect([voce.numero, voce.origine, n(voce.importo)]).toEqual(['F-2026-0822', '2026-06-20', -2450]);
      expect(n(voce.provvigione)).toBeLessThan(0);
      expect(m.righeLiquidazione(S, 2026, 2).some((r) => r.voce)).toBe(false);
      expect(m.riepilogoLiquidazione(S, m.righeLiquidazione(S, 2026, 3)).reduce((s, x) => s + x.storni, 0)).toBe(1);
      const a = m.analisiTrimestre(S, 2026, 3), am = M.analisiTrimestre(2026, 3);
      expect([n(a.totale.fatturato), n(a.totale.prese), n(a.totale.pagate), n(a.totale.margine)]).toEqual([am.totale.fatturato, am.totale.prese, am.totale.pagate, am.totale.margine]);
    } finally { b.stato = bm.stato = 'da_verificare'; b.chiuso_il = null; }
  });

  it('analisi del trimestre e fatti dell\'Analisi (D-19)', () => {
    for (const [a, t] of TRIMESTRI) {
      const x = m.analisiTrimestre(S, a, t), y = M.analisiTrimestre(a, t);
      const tot = (z: any) => [z.fatturato, z.prese, z.pagate, z.margine];
      const gruppo = (z: any) => [z.nome, ...tot(z), z.clienti, z.documenti];
      const num = (z: any) => ({ ...z, fatturato: n(z.fatturato), prese: n(z.prese), pagate: n(z.pagate), margine: n(z.margine) });
      expect([a, t, x.documenti, tot(num(x.totale))]).toEqual(j([a, t, y.documenti, tot(y.totale)]));
      expect(x.subagenti.map((z) => gruppo(num(z)))).toEqual(j(y.subagenti.map(gruppo)));
      expect(x.fornitori.map((z) => [...tot(num(z)), z.clienti, z.documenti])).toEqual(j(y.fornitori.map((z: any) => [...tot(z), z.clienti, z.documenti])));
    }
    const fatti = m.fattiAnalisi(S).map((f) => [f.numero, f.data, f.tipo, n(f.importo), n(f.prese), n(f.pagate), n(f.margine), nomeSub(f.subagente_id)]);
    expect(fatti).toEqual(j(M.fattiAnalisi().map((f: any) => [f.numero, f.data, f.tipo, f.importo, f.prese, f.pagate, f.margine, f.subagente])));
  });

  it('regole del subagente D-27: correzione, una fattura al mese, % dell\'agenzia', () => {
    // le stesse regole messe in memoria nei due mondi; il seed non ne ha
    const abDi = (num: string) => { const x = doc(num); return m.percentuali(S, x.pratica, x.doc.data)!.ab; };
    const abDiM = (num: string) => { const p = M.praticaPerDocumento(num); return M.abbinamento(p.cliente_piva, p.fornitore_id); };
    const agenzia = abDi('F-2026-0907'), mensile = abDi('F-2026-0858');
    agenzia.pct_subagente = dec(4); abDiM('F-2026-0907').pct_sub = 4;
    mensile.regola_mensile = 'piu_alta'; abDiM('F-2026-0858').mensile = 'piu_alta';
    const correzioni: [string, string, number][] = [['F-2026-0921', 'pct', 2.5], ['NC-2026-007', 'importo', -10], ['F-2026-0840', 'nessuna', 0]];
    for (const [num, tipo, valore] of correzioni) {
      doc(num).doc.correzione = { tipo, valore: dec(valore), motivo: 'prova' };
      M.S.correzioni_sub.push({ numero: num, tipo, valore, motivo: 'prova' });
    }
    try {
      const nostri = S.pratiche.flatMap((p) => p.documenti.map((d) => { const q = m.quotaSub(S, p, d); return [d.numero, n(q?.pct), n(q?.provvigione), q?.regola ?? null]; }));
      const loro = M.S.pratiche.flatMap((p: any) => M.fiscali(p).map((d: any) => { const q = M.quotaSub(p, d); return [d.numero, q?.pct ?? null, q?.provvigione ?? null, q?.regola ?? null]; }));
      expect(nostri).toEqual(j(loro));
      expect(nostri.filter((x) => x[3] === 'mensile').map((x) => x[0])).toHaveLength(1); // F-2026-0858 e 0862 nello stesso mese: vale la più alta
      expect(nostri.filter((x) => x[3] === 'correzione')).toHaveLength(3);
      expect(nostri.some((x) => x[3] === 'agenzia')).toBe(true);
    } finally {
      agenzia.pct_subagente = null; delete abDiM('F-2026-0907').pct_sub;
      mensile.regola_mensile = null; delete abDiM('F-2026-0858').mensile;
      for (const [num] of correzioni) doc(num).doc.correzione = null;
      M.S.correzioni_sub.length = 0;
    }
  });
});
