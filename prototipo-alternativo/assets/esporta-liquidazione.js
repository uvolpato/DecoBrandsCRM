/* ============================================================
   Esportazione della liquidazione di un trimestre (spec §11).
   Contenuto — tre scelte:
   - 'tutto'     : Riepilogo + un foglio per subagente (dettaglio + totale)
   - 'uno'       : il foglio di un solo subagente (dettaglio + totale)
   - 'riepilogo' : solo il Riepilogo (una riga per subagente)
   Formato — tre scelte:
   - 'xlsx' : Excel curato (ExcelJS, assets/lib)
   - 'pdf'  : stesso contenuto e stessa impaginazione dell'Excel (jsPDF + AutoTable, assets/lib);
              nell'app il PDF si ottiene convertendo lo stesso .xlsx (LibreOffice), quindi è identico
   - 'csv'  : solo dati, separatore ';', virgola decimale, UTF-8 con BOM (si apre in Excel italiano)
   Un unico modello (fogli → blocchi) alimenta i tre formati: il contenuto è lo stesso.
   ============================================================ */
(function () {
  /* ---------- Modello ---------- */
  const COL_DETTAGLIO = [
    { t: 'Fornitore', w: 30 }, { t: 'N. documento', w: 16 }, { t: 'Data documento', w: 15, tipo: 'data', al: 'center' },
    { t: 'Codice cliente', w: 15 }, { t: 'Ragione sociale', w: 36 }, { t: 'Importo documento', w: 19, tipo: 'euro_n', al: 'right' },
    { t: '% provvigione', w: 14, tipo: 'pct', al: 'right' }, { t: 'Importo provvigionale', w: 21, tipo: 'euro', al: 'right' }
  ];
  const somma = (rr, k) => M.r2(rr.reduce((a, x) => a + x[k], 0));
  const docs = n => n + (n === 1 ? ' documento' : ' documenti');
  // storni e riaccrediti (§5.14): voce con il numero della fattura d'origine
  const numDoc = x => (x.voce === 'storno' ? 'Storno ' : x.voce === 'riaccredito' ? 'Riaccredito ' : '') + x.doc.numero;
  const rigaDettaglio = x => [x.fornitore.nome, numDoc(x), x.doc.data, x.codice_cliente || '', M.nomeCliente(x.cliente), x.importo, x.pct / 100, x.provvigione];
  const NOTA_DETTAGLIO = 'Importi in euro. Le note di credito hanno importo negativo e riducono la provvigione. Percentuale = quota del subagente in vigore alla data del documento.';

  function foglioSubagente(g, ctx) {
    const blocchi = [{ tipo: 'tabella', colonne: COL_DETTAGLIO, righe: g.liq.map(rigaDettaglio), vuoto: 'Nessun documento liquidabile nel trimestre.',
      totale: { etichetta: 'Totale ' + g.s.nome + ' · ' + docs(g.liq.length), valori: { 5: somma(g.liq, 'importo'), 7: somma(g.liq, 'provvigione') } }, filtro: true }];
    if (g.att.length) blocchi.push(
      { tipo: 'titolo', testo: 'In attesa dei bollettini · non inclusi nel totale da liquidare', variante: 'attesa' },
      { tipo: 'tabella', colonne: COL_DETTAGLIO, righe: g.att.map(rigaDettaglio), variante: 'attesa',
        totale: { etichetta: 'Totale in attesa · ' + docs(g.att.length), valori: { 5: somma(g.att, 'importo'), 7: somma(g.att, 'provvigione') } } },
      { tipo: 'nota', testo: g.att.map(x => x.doc.numero + ': ' + x.motivo).join(' · '), stretta: true });
    blocchi.push({ tipo: 'nota', testo: NOTA_DETTAGLIO });
    return { nome: g.foglio, titolo: 'Prospetto provvigioni · ' + g.s.nome, colonne: COL_DETTAGLIO, blocchi: blocchi, ctx: ctx, subagente: g.s.nome };
  }
  function foglioRiepilogo(gruppi, ctx, conLink) {
    const conAttesa = ctx.aperto && gruppi.some(g => g.att.length);
    const col = [{ t: 'Subagente', w: 30 }, { t: 'Documenti', w: 12, tipo: 'num', al: 'right' }, { t: 'Imponibile', w: 20, tipo: 'euro_n', al: 'right' },
      { t: 'Provvigione da liquidare', w: 24, tipo: 'euro', al: 'right' }].concat(conAttesa ? [{ t: 'In attesa dei bollettini', w: 24, tipo: 'euro', al: 'right' }] : []);
    const righe = gruppi.map(g => [g.s.nome, g.liq.length, somma(g.liq, 'importo'), somma(g.liq, 'provvigione')].concat(conAttesa ? [somma(g.att, 'provvigione')] : []));
    const tot = { 1: gruppi.reduce((a, g) => a + g.liq.length, 0), 2: M.r2(gruppi.reduce((a, g) => a + somma(g.liq, 'importo'), 0)), 3: M.r2(gruppi.reduce((a, g) => a + somma(g.liq, 'provvigione'), 0)) };
    if (conAttesa) tot[4] = M.r2(gruppi.reduce((a, g) => a + somma(g.att, 'provvigione'), 0));
    return { nome: 'Riepilogo', titolo: 'Liquidazione provvigioni ai subagenti', colonne: col, ctx: ctx, riepilogo: true,
      blocchi: [
        { tipo: 'tabella', colonne: col, righe: righe, link: conLink ? gruppi.map(g => g.foglio) : null,
          totale: { etichetta: 'Totale · ' + gruppi.length + (gruppi.length === 1 ? ' subagente' : ' subagenti'), valori: tot }, filtro: true },
        { tipo: 'nota', testo: 'Imponibile e provvigione comprendono le note di credito (importi negativi).' +
          (conAttesa ? ' "In attesa dei bollettini": documenti di fornitori che pagano sul maturato, non ancora riconosciuti in un bollettino verificato; non sono compresi nella provvigione da liquidare.' : '') +
          (conLink ? ' Clic sul nome del subagente per aprire il suo prospetto.' : '') }
      ] };
  }
  const nomeFoglio = (nome, usati) => {
    let n = nome.replace(/[\\\/\?\*\[\]:]/g, ' ').slice(0, 31).trim(), k = 2;
    while (usati.has(n.toLowerCase())) n = nome.slice(0, 28).trim() + ' ' + k++;
    usati.add(n.toLowerCase());
    return n;
  };
  function modello(a, t, scelta, subId) {
    const st = M.statoTrimestre(a, t), righe = M.righeLiquidazione(a, t);
    const usati = new Set(['riepilogo']);
    const gruppi = M.S.subagenti.map(s => {
      const rr = righe.filter(x => x.subagente_id === s.id).sort((x, y) => x.doc.data.localeCompare(y.doc.data) || x.doc.numero.localeCompare(y.doc.numero));
      return { s: s, rr: rr, liq: rr.filter(x => x.liquidabile), att: rr.filter(x => !x.liquidabile) };
    }).filter(g => g.rr.length).sort((x, y) => x.s.nome.localeCompare(y.s.nome));
    gruppi.forEach(g => { g.foglio = nomeFoglio(g.s.nome, usati); });
    const ctx = { aperto: st.chiave !== 'chiusa', periodo: t + '° trimestre ' + a + ' · ' + M.nomeTrimestre(t),
      contesto: 'Decobrands SRL · ' + st.etichetta + ' · prospetto generato il ' + M.data(M.oggi()) };
    const base = 'Liquidazione_' + a + '_T' + t;
    if (scelta === 'uno') {
      const g = gruppi.find(x => x.s.id === Number(subId));
      if (!g) return null;
      return { nome: base + '_' + g.s.nome.replace(/\s+/g, '_'), titolo: 'Prospetto provvigioni ' + g.s.nome + ' · ' + t + '° trimestre ' + a, fogli: [foglioSubagente(g, ctx)], gruppi: [g], scelta: scelta };
    }
    const fogli = [foglioRiepilogo(gruppi, ctx, scelta === 'tutto')].concat(scelta === 'tutto' ? gruppi.map(g => foglioSubagente(g, ctx)) : []);
    return { nome: base + (scelta === 'tutto' ? '_completa' : '_riepilogo'), titolo: 'Liquidazione ' + t + '° trimestre ' + a, fogli: fogli, gruppi: gruppi, scelta: scelta };
  }

  /* ---------- Formato dei valori per PDF e CSV (italiano) ---------- */
  const num2 = v => { const s = M.dec(Math.abs(v)); return (v < 0 ? '-' : '') + s; };
  const testoValore = (c, v) => {
    if (v == null || v === '') return '';
    switch (c.tipo) {
      case 'euro': case 'euro_n': return Math.abs(v) < 0.005 ? '—' : num2(v) + ' €';
      case 'pct': return num2(v * 100) + '%';
      case 'data': return M.data(v);
      case 'num': return String(v);
      default: return String(v);
    }
  };

  /* ---------- Excel ---------- */
  const X = {
    testo: 'FF212529', tenue: 'FF6C757D', bordo: 'FFDEE2E6', bordoTenue: 'FFE9ECEF',
    primario: 'FF0D6EFD', primarioTesto: 'FF084298', primarioTenue: 'FFE9F0FD',
    attesaTesto: 'FF664D03', attesaTenue: 'FFFFF3CD', sfondo: 'FFF8F9FA'
  };
  const FONT = 'Calibri';
  const FMT = { euro: '#,##0.00 "€";[Red]-#,##0.00 "€";"—"', euro_n: '#,##0.00 "€";-#,##0.00 "€";"—"', pct: '0.00%', data: 'dd/mm/yyyy', num: '0' };
  const dataExcel = iso => new Date(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))));
  const sotto = (colore, stile) => ({ bottom: { style: stile || 'thin', color: { argb: colore } } });
  const lettera = i => String.fromCharCode(65 + i);
  const allinea = c => c.al === 'right' ? 'right' : c.al === 'center' ? 'center' : 'left';

  function xlsxFoglio(wb, f) {
    const n = f.colonne.length;
    const ws = wb.addWorksheet(f.nome, { views: [{ state: 'frozen', ySplit: 5, showGridLines: false }], properties: { tabColor: { argb: f.riepilogo ? X.primarioTesto : X.primario } } });
    f.colonne.forEach((c, i) => { ws.getColumn(i + 1).width = c.w; });
    ws.getRow(1).height = 26;
    [[f.titolo, { size: 16, bold: true, color: X.testo }], [f.ctx.periodo, { size: 11, bold: true, color: X.primarioTesto }], [f.ctx.contesto, { size: 9.5, color: X.tenue }]].forEach((x, i) => {
      ws.mergeCells(i + 1, 1, i + 1, n);
      Object.assign(ws.getCell(i + 1, 1), { value: x[0], font: { name: FONT, size: x[1].size, bold: !!x[1].bold, color: { argb: x[1].color } }, alignment: { vertical: 'middle' } });
    });
    for (let c = 1; c <= n; c++) ws.getCell(3, c).border = sotto(X.primario, 'medium');
    ws.getRow(4).height = 8;
    let r = 4, primaTabella = true;
    f.blocchi.forEach(b => {
      if (b.tipo === 'titolo') {
        r += 2; ws.mergeCells(r, 1, r, n);
        Object.assign(ws.getCell(r, 1), { value: b.testo, font: { name: FONT, size: 10.5, bold: true, color: { argb: X.attesaTesto } } });
      } else if (b.tipo === 'nota') {
        r += b.stretta ? 1 : 2; ws.mergeCells(r, 1, r, n);
        Object.assign(ws.getCell(r, 1), { value: b.testo, font: { name: FONT, size: 9, italic: true, color: { argb: X.tenue } }, alignment: { wrapText: true, vertical: 'top' } });
        ws.getRow(r).height = Math.max(15, Math.ceil(b.testo.length / 150) * 13);
      } else {
        r += primaTabella ? 1 : 1;
        const att = b.variante === 'attesa';
        const rh = ws.getRow(r); rh.height = 22;
        b.colonne.forEach((c, i) => Object.assign(rh.getCell(i + 1), {
          value: c.t, font: { name: FONT, size: 10, bold: true, color: { argb: X.primarioTesto } },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: X.primarioTenue } },
          alignment: { vertical: 'middle', horizontal: allinea(c), wrapText: true }, border: sotto(X.primario) }));
        const intest = r, prima = r + 1;
        b.righe.forEach((v, k) => {
          r++; const row = ws.getRow(r); row.height = 18;
          v.forEach((val, i) => {
            const c = b.colonne[i];
            Object.assign(row.getCell(i + 1), { value: c.tipo === 'data' ? dataExcel(val) : val, numFmt: FMT[c.tipo], border: sotto(X.bordoTenue),
              font: { name: FONT, size: 10, color: { argb: att ? X.tenue : X.testo }, italic: att }, alignment: { vertical: 'middle', horizontal: allinea(c) } });
          });
          if (b.link) { const cell = row.getCell(1); cell.value = { text: v[0], hyperlink: "#'" + b.link[k] + "'!A1", tooltip: 'Apri il prospetto di ' + v[0] }; cell.font = { name: FONT, size: 10, color: { argb: X.primario }, underline: true }; }
        });
        if (!b.righe.length && b.vuoto) { r++; ws.mergeCells(r, 1, r, n); Object.assign(ws.getCell(r, 1), { value: b.vuoto, font: { name: FONT, size: 10, italic: true, color: { argb: X.tenue } } }); }
        const ultima = r;
        r++; const rt = ws.getRow(r); rt.height = 22;
        for (let c = 1; c <= n; c++) Object.assign(rt.getCell(c), {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: att ? X.attesaTenue : X.sfondo } },
          border: { top: { style: 'medium', color: { argb: att ? X.attesaTesto : X.primarioTesto } }, bottom: { style: 'thin', color: { argb: X.bordo } } },
          font: { name: FONT, size: 10.5, bold: true, color: { argb: att ? X.attesaTesto : X.testo } }, alignment: { vertical: 'middle', horizontal: c === 1 ? 'left' : 'right' } });
        rt.getCell(1).value = b.totale.etichetta;
        Object.keys(b.totale.valori).forEach(i => {
          const c = b.colonne[i], L = lettera(Number(i));
          rt.getCell(Number(i) + 1).value = { formula: b.righe.length ? 'SUM(' + L + prima + ':' + L + ultima + ')' : '0', result: b.totale.valori[i] };
          rt.getCell(Number(i) + 1).numFmt = FMT[c.tipo];
        });
        if (b.filtro && b.righe.length) ws.autoFilter = { from: { row: intest, column: 1 }, to: { row: ultima, column: n } };
        primaTabella = false;
      }
    });
    ws.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 }, printTitlesRow: '5:5' };
    ws.headerFooter = { oddFooter: '&L&8Decobrands SRL · &A&R&8Pagina &P di &N' };
  }
  async function xlsx(m) {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Decobrands CRM'; wb.created = new Date(); wb.title = m.titolo;
    m.fogli.forEach(f => xlsxFoglio(wb, f));
    return new Blob([await wb.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  /* ---------- PDF: stessa impaginazione dell'Excel stampato (A4 orizzontale, una sezione per foglio) ---------- */
  const P = { testo: [33, 37, 41], tenue: [108, 117, 125], bordo: [222, 226, 230], bordoTenue: [233, 236, 239], primario: [13, 110, 253],
    primarioTesto: [8, 66, 152], primarioTenue: [233, 240, 253], attesaTesto: [102, 77, 3], attesaTenue: [255, 243, 205], sfondo: [248, 249, 250], negativo: [220, 53, 69] };
  function pdf(m) {
    const doc = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setProperties({ title: m.titolo, creator: 'Decobrands CRM' });
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), MX = 12.7, MY = 15;
    const larghezza = W - 2 * MX;
    const pagineFoglio = [];   // per il piè di pagina: nome del foglio di ogni pagina
    m.fogli.forEach((f, fi) => {
      if (fi) doc.addPage();
      const inizio = doc.getNumberOfPages();
      let y = MY;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(...P.testo); doc.text(f.titolo, MX, y + 4); y += 10;
      doc.setFontSize(10.5); doc.setTextColor(...P.primarioTesto); doc.text(f.ctx.periodo, MX, y); y += 5;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...P.tenue); doc.text(f.ctx.contesto, MX, y); y += 2.2;
      doc.setDrawColor(...P.primario); doc.setLineWidth(0.6); doc.line(MX, y, W - MX, y); y += 5;
      const pesi = f.colonne.map(c => c.w), tot = pesi.reduce((a, b) => a + b, 0);
      const stiliCol = {}; f.colonne.forEach((c, i) => { stiliCol[i] = { cellWidth: larghezza * c.w / tot, halign: allinea(c) }; });
      f.blocchi.forEach(b => {
        if (b.tipo === 'titolo') {
          y += 4; doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...P.attesaTesto); doc.text(b.testo, MX, y); y += 2.5;
        } else if (b.tipo === 'nota') {
          y += b.stretta ? 3 : 6;
          doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(...P.tenue);
          const righe = doc.splitTextToSize(b.testo, larghezza);
          if (y + righe.length * 3.6 > H - MY) { doc.addPage(); y = MY; }
          doc.text(righe, MX, y); y += righe.length * 3.6;
        } else {
          const att = b.variante === 'attesa';
          const corpo = b.righe.map(v => v.map((val, i) => testoValore(b.colonne[i], val)));
          if (!corpo.length && b.vuoto) corpo.push([{ content: b.vuoto, colSpan: b.colonne.length, styles: { fontStyle: 'italic', textColor: P.tenue } }]);
          // etichetta del totale estesa fino alla prima colonna con un valore (come la cella unita dell'Excel stampato)
          const primo = Math.max(1, Math.min.apply(null, Object.keys(b.totale.valori).map(Number)));
          const piede = [[{ content: b.totale.etichetta, colSpan: primo }].concat(b.colonne.slice(primo).map((c, k) => { const i = k + primo; return b.totale.valori[i] != null ? testoValore(c, b.totale.valori[i]) : ''; }))];
          doc.autoTable({
            startY: y, margin: { left: MX, right: MX, top: MY, bottom: MY + 4 }, tableWidth: larghezza, theme: 'plain',
            head: [b.colonne.map(c => c.t)], body: corpo, foot: piede, showFoot: 'lastPage', showHead: 'everyPage',
            styles: { font: 'helvetica', fontSize: 8.5, cellPadding: { top: 1.6, bottom: 1.6, left: 1.8, right: 1.8 }, textColor: att ? P.tenue : P.testo, fontStyle: att ? 'italic' : 'normal', lineColor: P.bordoTenue, overflow: 'linebreak' },
            headStyles: { fillColor: P.primarioTenue, textColor: P.primarioTesto, fontStyle: 'bold', fontSize: 8.5 },
            footStyles: { fillColor: att ? P.attesaTenue : P.sfondo, textColor: att ? P.attesaTesto : P.testo, fontStyle: 'bold', fontSize: 9 },
            columnStyles: stiliCol,
            didParseCell: d => {
              const c = b.colonne[d.column.index];
              if (d.section === 'head') d.cell.styles.halign = allinea(c);
              if (d.section === 'foot') d.cell.styles.halign = d.column.index === 0 ? 'left' : 'right';
              const raw = d.section === 'body' ? (b.righe[d.row.index] || [])[d.column.index] : d.section === 'foot' ? b.totale.valori[d.column.index] : null;
              if (c && c.tipo === 'euro' && typeof raw === 'number' && raw < 0 && !att) d.cell.styles.textColor = P.negativo;
              if (d.section === 'body' && b.link && d.column.index === 0) { d.cell.styles.textColor = P.primario; }
            },
            didDrawCell: d => {
              if (d.section === 'head') { doc.setDrawColor(...P.primario); doc.setLineWidth(0.3); doc.line(d.cell.x, d.cell.y + d.cell.height, d.cell.x + d.cell.width, d.cell.y + d.cell.height); }
              if (d.section === 'body') { doc.setDrawColor(...P.bordoTenue); doc.setLineWidth(0.2); doc.line(d.cell.x, d.cell.y + d.cell.height, d.cell.x + d.cell.width, d.cell.y + d.cell.height); }
              if (d.section === 'foot') { doc.setDrawColor(...(att ? P.attesaTesto : P.primarioTesto)); doc.setLineWidth(0.5); doc.line(d.cell.x, d.cell.y, d.cell.x + d.cell.width, d.cell.y); }
              if (d.section === 'body' && b.link && d.column.index === 0) {   // collegamento interno alla sezione del subagente
                const dest = m.fogli.findIndex(x => x.nome === b.link[d.row.index]);
                if (dest >= 0) pendenti.push({ pagina: doc.getCurrentPageInfo().pageNumber, x: d.cell.x, y: d.cell.y, w: d.cell.width, h: d.cell.height, foglio: dest });
              }
            }
          });
          y = doc.lastAutoTable.finalY;
        }
      });
      for (let p = inizio; p <= doc.getNumberOfPages(); p++) pagineFoglio[p] = f.nome;
      inizioFoglio[fi] = inizio;
    });
    // collegamenti dal Riepilogo alle sezioni dei subagenti
    pendenti.forEach(l => { doc.setPage(l.pagina); doc.link(l.x, l.y, l.w, l.h, { pageNumber: inizioFoglio[l.foglio] }); });
    const n = doc.getNumberOfPages();
    for (let p = 1; p <= n; p++) {
      doc.setPage(p); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...P.testo);
      doc.text('Decobrands SRL · ' + pagineFoglio[p], MX, H - 7);
      doc.text('Pagina ' + p + ' di ' + n, W - MX, H - 7, { align: 'right' });
    }
    pendenti.length = 0; inizioFoglio.length = 0;
    return doc.output('blob');
  }
  const pendenti = [], inizioFoglio = [];

  /* ---------- CSV: solo dati, senza totali né formattazione ---------- */
  function csv(m) {
    const q = v => { const s = String(v == null ? '' : v); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const n = (v, d) => (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d).replace('.', ',');
    let righe;
    if (m.scelta === 'riepilogo') {
      const att = m.fogli[0].colonne.length > 4;
      righe = [['Subagente', 'Documenti', 'Imponibile', 'Provvigione da liquidare'].concat(att ? ['In attesa dei bollettini'] : [])]
        .concat(m.gruppi.map(g => [g.s.nome, g.liq.length, n(somma(g.liq, 'importo'), 2), n(somma(g.liq, 'provvigione'), 2)].concat(att ? [n(somma(g.att, 'provvigione'), 2)] : [])));
    } else {
      righe = [['Subagente'].concat(COL_DETTAGLIO.map(c => c.t)).concat(['Stato'])];
      m.gruppi.forEach(g => g.rr.forEach(x => righe.push([g.s.nome, x.fornitore.nome, numDoc(x), M.data(x.doc.data), x.codice_cliente || '', M.nomeCliente(x.cliente),
        n(x.importo, 2), n(x.pct, 2), n(x.provvigione, 2), x.liquidabile ? 'liquidabile' : 'in attesa del bollettino'])));
    }
    return new Blob(['﻿' + righe.map(r => r.map(q).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  }

  /* scelta: 'tutto' | 'uno' | 'riepilogo'; formato: 'xlsx' | 'pdf' | 'csv'. Restituisce il nome del file scaricato. */
  CRM.esportaLiquidazione = async function (a, t, scelta, subId, formato) {
    formato = formato || 'xlsx';
    if (formato === 'xlsx' && !window.ExcelJS || formato === 'pdf' && !(window.jspdf && window.jspdf.jsPDF)) { CRM.Avviso('Libreria per il formato ' + formato.toUpperCase() + ' non caricata'); return null; }
    const m = modello(a, t, scelta, subId);
    if (!m) { CRM.Avviso('Il subagente non ha documenti nel trimestre'); return null; }
    const blob = formato === 'pdf' ? pdf(m) : formato === 'csv' ? csv(m) : await xlsx(m);
    const nome = m.nome + '.' + formato;
    CRM.scarica(nome, blob, blob.type);
    return nome;
  };
  CRM.modelloLiquidazione = modello;   // per prove e per il catalogo
})();
