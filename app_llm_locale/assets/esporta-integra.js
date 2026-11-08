/* ============================================================
   File per Integra di un ordine (vendita diretta): stesso tracciato della Gestione Ordini.
   Una riga per articolo, 28 colonne mvt_* (testata) e mvr_* (righe); tipo 'OC' (ordine
   cliente) o 'OF' (ordine fornitore). Descrizione, UM e IVA vuote: le mette Integra.
   ============================================================ */
(function () {
  'use strict';
  const COLS = ['mvt_mdtcod', 'mvt_dtmov', 'mvt_mvnserie', 'mvt_num', 'mvt_clatipo', 'mvt_clacodstr', 'mvt_valcod', 'mvt_pagcod', 'mvt_specod', 'mvt_porcod',
    'mvt_dtconr', 'mvt_ivacod', 'mvt_tlscod', 'mvt_vsrif', 'mvt_dtvsrif', 'mvt_iban', 'mvr_ordinamento', 'mvr_procod', 'mvr_descr', 'mvr_umicod', 'mvr_qta',
    'mvr_przval', 'mvr_dtconr', 'mvr_ivacod', 'mvr_mvgcod', 'mvr_magcod', 'mvr_comcod', 'mvr_reperisciprezzo'];
  const LARG = [10, 13, 12, 8, 8, 13, 6, 8, 8, 8, 10, 8, 8, 22, 10, 10, 14, 18, 38, 8, 10, 10, 10, 8, 10, 8, 8, 18];
  CRM.TRACCIATO_INTEGRA = COLS;
  CRM.fileIntegra = async function (o, righe, tipo) {
    const forn = tipo === 'OF', cod = forn ? 'OF0000' : 'OC0000';
    const cl = M.cliente(o.cliente_piva);
    const wb = new ExcelJS.Workbook(); wb.creator = 'Decobrands CRM';
    const ws = wb.addWorksheet('Ordine');
    ws.addRow(COLS);
    const d = o.data.split('-').map(Number), data = new Date(Date.UTC(d[0], d[1] - 1, d[2]));
    (righe.length ? righe : [{}]).forEach((r, i) => {
      const row = ws.addRow([cod, data, forn ? 'OF' : 'OC', 999999, forn ? 'F' : 'C', (cl && cl.codice_integra) || '', 'EUR', null, null, null, null, null, null,
        o.numero || '', null, null, (i + 1) * 5, r.codice || '', null, null, r.qta != null ? Number(r.qta) : null, r.prezzo != null ? Number(r.prezzo) : null,
        null, null, cod, null, null, 'SI']);
      row.getCell(2).numFmt = 'dd/mm/yyyy'; row.getCell(21).numFmt = '#,##0.00'; row.getCell(22).numFmt = '#,##0.00';
    });
    LARG.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
    return new Blob([await wb.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  };
})();
