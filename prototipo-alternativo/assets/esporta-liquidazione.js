/* ============================================================
   Esportazione della liquidazione di un trimestre in Excel (ExcelJS, assets/lib).
   Tre scelte (spec §11):
   - 'tutto'     : foglio Riepilogo + un foglio per subagente (dettaglio + totale)
   - 'uno'       : il foglio di un solo subagente (dettaglio + totale)
   - 'riepilogo' : solo il foglio Riepilogo (una riga per subagente)
   Il dettaglio usa gli 8 campi concordati; i documenti in attesa dei bollettini
   sono elencati a parte e non entrano nel totale da liquidare.
   ============================================================ */
(function () {
  const C = {
    testo: 'FF212529', tenue: 'FF6C757D', bordo: 'FFDEE2E6', bordoTenue: 'FFE9ECEF',
    primario: 'FF0D6EFD', primarioTesto: 'FF084298', primarioTenue: 'FFE9F0FD',
    attesaTesto: 'FF664D03', attesaTenue: 'FFFFF3CD', sfondo: 'FFF8F9FA', negativo: 'FFB02A37'
  };
  const FONT = 'Calibri';
  const EURO = '#,##0.00 "€";[Red]-#,##0.00 "€";"—"';   // negativi in rosso, zero come trattino
  const EURO_N = '#,##0.00 "€";-#,##0.00 "€";"—"';
  const PCT = '0.00%';
  const DATA = 'dd/mm/yyyy';
  const CAMPI = [
    { t: 'Fornitore', w: 30 }, { t: 'N. documento', w: 16 }, { t: 'Data documento', w: 15, fmt: DATA, al: 'center' },
    { t: 'Codice cliente', w: 15 }, { t: 'Ragione sociale', w: 36 }, { t: 'Importo documento', w: 19, fmt: EURO_N, al: 'right' },
    { t: '% provvigione', w: 14, fmt: PCT, al: 'right' }, { t: 'Importo provvigionale', w: 21, fmt: EURO, al: 'right' }
  ];
  const dataExcel = iso => new Date(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))));
  const bordoSotto = (colore, stile) => ({ bottom: { style: stile || 'thin', color: { argb: colore } } });

  /* Intestazione del foglio: titolo, sottotitolo, riga di contesto, filetto blu. Restituisce la riga libera successiva. */
  function testata(ws, ncol, titolo, sotto, contesto) {
    ws.getColumn(1).width = ws.getColumn(1).width || 12;
    const r1 = ws.getRow(1); r1.height = 26;
    ws.mergeCells(1, 1, 1, ncol);
    Object.assign(ws.getCell(1, 1), { value: titolo, font: { name: FONT, size: 16, bold: true, color: { argb: C.testo } }, alignment: { vertical: 'middle' } });
    ws.mergeCells(2, 1, 2, ncol);
    Object.assign(ws.getCell(2, 1), { value: sotto, font: { name: FONT, size: 11, color: { argb: C.primarioTesto }, bold: true } });
    ws.mergeCells(3, 1, 3, ncol);
    Object.assign(ws.getCell(3, 1), { value: contesto, font: { name: FONT, size: 9.5, color: { argb: C.tenue } } });
    for (let c = 1; c <= ncol; c++) ws.getCell(3, c).border = bordoSotto(C.primario, 'medium');
    ws.getRow(4).height = 8;
    return 5;
  }
  function intestazioneTabella(ws, riga, colonne) {
    const r = ws.getRow(riga); r.height = 22;
    colonne.forEach((c, i) => {
      Object.assign(r.getCell(i + 1), {
        value: c.t, font: { name: FONT, size: 10, bold: true, color: { argb: C.primarioTesto } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: C.primarioTenue } },
        alignment: { vertical: 'middle', horizontal: c.al === 'right' ? 'right' : c.al === 'center' ? 'center' : 'left', wrapText: true },
        border: bordoSotto(C.primario)
      });
    });
  }
  function rigaDati(ws, riga, colonne, valori, opz) {
    opz = opz || {};
    const r = ws.getRow(riga); r.height = 18;
    valori.forEach((v, i) => {
      const c = colonne[i];
      Object.assign(r.getCell(i + 1), {
        value: v, numFmt: c.fmt, border: bordoSotto(C.bordoTenue),
        font: { name: FONT, size: 10, color: { argb: opz.colore || C.testo }, italic: !!opz.corsivo },
        alignment: { vertical: 'middle', horizontal: c.al === 'right' ? 'right' : c.al === 'center' ? 'center' : 'left' }
      });
    });
  }
  function rigaTotale(ws, riga, ncol, etichetta, formule, opz) {
    opz = opz || {};
    const r = ws.getRow(riga); r.height = 22;
    for (let c = 1; c <= ncol; c++) {
      const cell = r.getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opz.fondo || C.sfondo } };
      cell.border = { top: { style: 'medium', color: { argb: opz.linea || C.primarioTesto } }, bottom: { style: 'thin', color: { argb: C.bordo } } };
      cell.font = { name: FONT, size: 10.5, bold: true, color: { argb: opz.colore || C.testo } };
      cell.alignment = { vertical: 'middle', horizontal: c === 1 ? 'left' : 'right' };
    }
    r.getCell(1).value = etichetta;
    Object.keys(formule).forEach(col => { const f = formule[col]; Object.assign(r.getCell(Number(col)), { value: { formula: f.formula, result: f.result }, numFmt: f.fmt }); });
  }
  function nota(ws, riga, ncol, testo) {
    ws.mergeCells(riga, 1, riga, ncol);
    const cell = ws.getCell(riga, 1);
    Object.assign(cell, { value: testo, font: { name: FONT, size: 9, italic: true, color: { argb: C.tenue } }, alignment: { wrapText: true, vertical: 'top' } });
    ws.getRow(riga).height = Math.max(15, Math.ceil(testo.length / 150) * 13);
  }
  function stampa(ws, righeTitolo) {
    ws.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 }, printTitlesRow: righeTitolo };
    ws.headerFooter = { oddFooter: '&L&8Decobrands SRL · &A&R&8Pagina &P di &N' };
  }
  const nomeFoglio = (nome, usati) => {
    let n = nome.replace(/[\\\/\?\*\[\]:]/g, ' ').slice(0, 31).trim(), k = 2;
    while (usati.has(n.toLowerCase())) n = nome.slice(0, 28).trim() + ' ' + k++;
    usati.add(n.toLowerCase());
    return n;
  };

  /* Foglio di un subagente: dettaglio liquidabile + totale; documenti in attesa in una sezione a parte. */
  function foglioSubagente(wb, nomeWs, s, rr, ctx) {
    const ws = wb.addWorksheet(nomeWs, { views: [{ state: 'frozen', ySplit: 5, showGridLines: false }], properties: { tabColor: { argb: C.primario } } });
    CAMPI.forEach((c, i) => { ws.getColumn(i + 1).width = c.w; });
    let r = testata(ws, CAMPI.length, 'Prospetto provvigioni · ' + s.nome, ctx.periodo, ctx.contesto);
    const liq = rr.filter(x => x.liquidabile), att = rr.filter(x => !x.liquidabile);
    const valori = x => [x.fornitore.nome, x.doc.numero, dataExcel(x.doc.data), x.codice_cliente || '', M.nomeCliente(x.cliente), x.importo, x.pct / 100, x.provvigione];
    intestazioneTabella(ws, r, CAMPI);
    const prima = r + 1;
    liq.forEach(x => { r++; rigaDati(ws, r, CAMPI, valori(x)); });
    if (!liq.length) { r++; nota(ws, r, CAMPI.length, 'Nessun documento liquidabile nel trimestre.'); }
    const ultima = r;
    r++;
    const somma = col => liq.length ? 'SUM(' + col + prima + ':' + col + ultima + ')' : '0';
    rigaTotale(ws, r, CAMPI.length, 'Totale ' + s.nome + ' · ' + liq.length + (liq.length === 1 ? ' documento' : ' documenti'), {
      6: { formula: somma('F'), result: M.r2(liq.reduce((a, x) => a + x.importo, 0)), fmt: EURO_N },
      8: { formula: somma('H'), result: M.r2(liq.reduce((a, x) => a + x.provvigione, 0)), fmt: EURO }
    });
    if (liq.length) ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: ultima, column: CAMPI.length } };
    if (att.length) {
      r += 2;
      ws.mergeCells(r, 1, r, CAMPI.length);
      Object.assign(ws.getCell(r, 1), { value: 'In attesa dei bollettini · non inclusi nel totale da liquidare', font: { name: FONT, size: 10.5, bold: true, color: { argb: C.attesaTesto } } });
      r++; intestazioneTabella(ws, r, CAMPI);
      const p2 = r + 1;
      att.forEach(x => { r++; rigaDati(ws, r, CAMPI, valori(x), { colore: C.tenue, corsivo: true }); });
      const u2 = r; r++;
      rigaTotale(ws, r, CAMPI.length, 'Totale in attesa · ' + att.length + (att.length === 1 ? ' documento' : ' documenti'), {
        6: { formula: 'SUM(F' + p2 + ':F' + u2 + ')', result: M.r2(att.reduce((a, x) => a + x.importo, 0)), fmt: EURO_N },
        8: { formula: 'SUM(H' + p2 + ':H' + u2 + ')', result: M.r2(att.reduce((a, x) => a + x.provvigione, 0)), fmt: EURO }
      }, { fondo: C.attesaTenue, linea: C.attesaTesto, colore: C.attesaTesto });
      r++; nota(ws, r, CAMPI.length, att.map(x => x.doc.numero + ': ' + x.motivo).join(' · '));
    }
    r += 2;
    nota(ws, r, CAMPI.length, 'Importi in euro. Le note di credito hanno importo negativo e riducono la provvigione. Percentuale = quota del subagente in vigore alla data del documento.');
    stampa(ws, '5:5');
    return ws;
  }

  /* Foglio Riepilogo: una riga per subagente, con collegamento al suo foglio quando c'è. */
  function foglioRiepilogo(wb, gruppi, ctx, fogli) {
    const conAttesa = ctx.aperto && gruppi.some(g => g.att.length);
    const col = [{ t: 'Subagente', w: 30 }, { t: 'Documenti', w: 12, al: 'right' }, { t: 'Imponibile', w: 20, fmt: EURO_N, al: 'right' }, { t: 'Provvigione da liquidare', w: 24, fmt: EURO, al: 'right' }]
      .concat(conAttesa ? [{ t: 'In attesa dei bollettini', w: 24, fmt: EURO, al: 'right' }] : []);
    const ws = wb.addWorksheet('Riepilogo', { views: [{ state: 'frozen', ySplit: 5, showGridLines: false }], properties: { tabColor: { argb: C.primarioTesto } } });
    col.forEach((c, i) => { ws.getColumn(i + 1).width = c.w; });
    let r = testata(ws, col.length, 'Liquidazione provvigioni ai subagenti', ctx.periodo, ctx.contesto);
    intestazioneTabella(ws, r, col);
    const prima = r + 1;
    gruppi.forEach(g => {
      r++;
      const liq = g.liq, imp = M.r2(liq.reduce((a, x) => a + x.importo, 0)), prov = M.r2(liq.reduce((a, x) => a + x.provvigione, 0));
      rigaDati(ws, r, col, [g.s.nome, liq.length, imp, prov].concat(conAttesa ? [M.r2(g.att.reduce((a, x) => a + x.provvigione, 0))] : []));
      if (fogli[g.s.id]) {
        const cell = ws.getCell(r, 1);
        cell.value = { text: g.s.nome, hyperlink: "#'" + fogli[g.s.id] + "'!A1", tooltip: 'Apri il prospetto di ' + g.s.nome };
        cell.font = { name: FONT, size: 10, color: { argb: C.primario }, underline: true };
      }
    });
    const ultima = r; r++;
    const L = i => String.fromCharCode(64 + i);
    const tot = { 2: { formula: 'SUM(B' + prima + ':B' + ultima + ')', result: gruppi.reduce((a, g) => a + g.liq.length, 0) },
      3: { formula: 'SUM(C' + prima + ':C' + ultima + ')', result: M.r2(gruppi.reduce((a, g) => a + g.liq.reduce((b, x) => b + x.importo, 0), 0)), fmt: EURO_N },
      4: { formula: 'SUM(D' + prima + ':D' + ultima + ')', result: M.r2(gruppi.reduce((a, g) => a + g.liq.reduce((b, x) => b + x.provvigione, 0), 0)), fmt: EURO } };
    if (conAttesa) tot[5] = { formula: 'SUM(' + L(5) + prima + ':' + L(5) + ultima + ')', result: M.r2(gruppi.reduce((a, g) => a + g.att.reduce((b, x) => b + x.provvigione, 0), 0)), fmt: EURO };
    rigaTotale(ws, r, col.length, 'Totale · ' + gruppi.length + (gruppi.length === 1 ? ' subagente' : ' subagenti'), tot);
    r += 2;
    nota(ws, r, col.length, 'Imponibile e provvigione comprendono le note di credito (importi negativi).' +
      (conAttesa ? ' "In attesa dei bollettini": documenti di fornitori che pagano sul maturato, non ancora riconosciuti in un bollettino verificato; non sono compresi nella provvigione da liquidare.' : '') +
      (Object.keys(fogli).length ? ' Clic sul nome del subagente per aprire il suo prospetto.' : ''));
    stampa(ws, '5:5');
    return ws;
  }

  /* scelta: 'tutto' | 'uno' | 'riepilogo'; subId per 'uno'. Restituisce il nome del file scaricato. */
  CRM.esportaLiquidazione = async function (a, t, scelta, subId) {
    if (!window.ExcelJS) { CRM.Avviso('Libreria Excel non caricata'); return null; }
    const st = M.statoTrimestre(a, t), righe = M.righeLiquidazione(a, t);
    const gruppi = M.S.subagenti.map(s => {
      const rr = righe.filter(x => x.subagente_id === s.id).sort((x, y) => x.doc.data.localeCompare(y.doc.data) || x.doc.numero.localeCompare(y.doc.numero));
      return { s: s, rr: rr, liq: rr.filter(x => x.liquidabile), att: rr.filter(x => !x.liquidabile) };
    }).filter(g => g.rr.length).sort((x, y) => x.s.nome.localeCompare(y.s.nome));
    const ctx = {
      aperto: st.chiave !== 'chiusa',
      periodo: t + '° trimestre ' + a + ' · ' + M.nomeTrimestre(t),
      contesto: 'Decobrands SRL · ' + st.etichetta + ' · prospetto generato il ' + M.data(M.oggi())
    };
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Decobrands CRM'; wb.created = new Date(); wb.title = 'Liquidazione ' + t + '° trimestre ' + a;
    const usati = new Set(['riepilogo']), fogli = {};
    let nomeFile;
    if (scelta === 'uno') {
      const g = gruppi.find(x => x.s.id === Number(subId));
      if (!g) { CRM.Avviso('Il subagente non ha documenti nel trimestre'); return null; }
      foglioSubagente(wb, nomeFoglio(g.s.nome, usati), g.s, g.rr, ctx);
      nomeFile = 'Liquidazione_' + a + '_T' + t + '_' + g.s.nome.replace(/\s+/g, '_') + '.xlsx';
    } else {
      if (scelta === 'tutto') gruppi.forEach(g => { fogli[g.s.id] = nomeFoglio(g.s.nome, usati); });
      foglioRiepilogo(wb, gruppi, ctx, fogli);
      if (scelta === 'tutto') gruppi.forEach(g => foglioSubagente(wb, fogli[g.s.id], g.s, g.rr, ctx));
      nomeFile = 'Liquidazione_' + a + '_T' + t + (scelta === 'tutto' ? '_completa' : '_riepilogo') + '.xlsx';
    }
    const buf = await wb.xlsx.writeBuffer();
    CRM.scarica(nomeFile, buf, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return nomeFile;
  };
})();
