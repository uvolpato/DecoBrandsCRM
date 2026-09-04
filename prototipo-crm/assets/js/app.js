/* ============================================================
   DecoBrands CRM — Prototipo — app.js
   Helper condivisi + motore di calcolo provvigioni (spec §10)
   Ricalcato lato client sugli stessi principi di liquidazione.js
   ============================================================ */

(function () {
  'use strict';

  /* ---------- Formattazione (stile it-IT, coerente con le view EJS) ---------- */
  window.fmtEuro = function (n) {
    n = Number(n || 0);
    return '\u20AC' + n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  window.fmtEuro0 = function (n) {
    n = Number(n || 0);
    return '\u20AC' + n.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };
  window.fmtNum = function (n, dec) {
    dec = dec || 0;
    return Number(n || 0).toLocaleString('it-IT', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  };
  window.fmtPct = function (n) { return Number(n || 0).toFixed(2) + '%'; };
  window.fmtData = function (iso) {
    if (!iso) return '\u2014';
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('it-IT');
  };
  window.OGGI = new Date('2026-09-04T12:00:00');

  /* ---------- Toast (identico a _foot.ejs) ---------- */
  window.showToast = function (msg, ok) {
    if (ok === undefined) ok = true;
    const t = document.getElementById('toast');
    if (!t) return alert((ok ? '' : 'ERRORE: ') + msg);
    t.className = 'toast text-white border-0 bg-' + (ok ? 'success' : 'danger');
    document.getElementById('toast-msg').textContent = msg;
    bootstrap.Toast.getOrCreateInstance(t, { delay: 3000 }).show();
  };
  window.conferma = function (msg) { return confirm(msg); };

  /* ---------- Lookup anagrafiche ---------- */
  window.fornitoreNome = function (id) {
    const f = DATA.fornitori.find(x => x.id === Number(id));
    return f ? f.ragione_sociale : '\u2014';
  };
  window.clienteNome = function (piva) {
    const c = DATA.clienti.find(x => x.piva === piva);
    return c ? c.ragione_sociale : (piva || '\u2014');
  };
  window.subagenteNome = function (id) {
    const s = DATA.subagenti.find(x => x.id === Number(id));
    return s ? s.nome + ' ' + s.cognome : '\u2014';
  };
  window.agenteNome = function (id) {
    const a = DATA.agenti.find(x => x.id === Number(id));
    return a ? a.nome + ' ' + a.cognome : '\u2014';
  };

  /* ---------- Trimestri ---------- */
  window.TRIMESTRI = { 1: 'Q1', 2: 'Q2', 3: 'Q3', 4: 'Q4' };
  window.trimestreLabel = function (t) {
    return ({ 1: 'Q1 (Gen-Mar)', 2: 'Q2 (Apr-Giu)', 3: 'Q3 (Lug-Set)', 4: 'Q4 (Ott-Dic)' })[Number(t)] || ('Q' + t);
  };
  window.trimestreCorrente = function () {
    const m = OGGI.getMonth() + 1; // 1-12
    return Math.floor((m - 1) / 3) + 1;
  };
  window.trimestreRange = function (t, anno) {
    const y = anno || OGGI.getFullYear();
    const startM = (Number(t) - 1) * 3; // 0-based
    const start = new Date(y, startM, 1);
    const end = new Date(y, startM + 3, 0);
    const iso = function (d) { return d.toISOString().split('T')[0]; };
    return { start: iso(start), end: iso(end) };
  };
  function inRange(iso, r) { return iso >= r.start && iso <= r.end; }
  window.inTrimestre = function (iso, t, anno) { return inRange(iso, trimestreRange(t, anno)); };

  /* ---------- Motore provvigioni (spec §10) ---------- */
  /* Trova lo scaglione del fornitore che contiene lo sconto (bucket discreti) */
  window.scaglionePerSconto = function (fornitoreId, discount) {
    const list = DATA.scaglioni.filter(s => s.fornitore_id === Number(fornitoreId));
    let sc = list.find(s => discount >= s.sconto_min && discount <= s.sconto_max);
    if (!sc) sc = list.find(s => s.sconto_max >= 100); // bucket di coda
    if (!sc && list.length) sc = list[list.length - 1];
    return sc || null;
  };
  /* Eccezione per singolo subagente (spec §5.2) */
  window.pctSubagente = function (scaglione, subagenteId) {
    const ex = DATA.eccezioni.find(e => e.scaglione_id === scaglione.id && e.subagente_id === Number(subagenteId));
    return ex ? ex.pct_override : scaglione.pct_subagente;
  };
  /* Associazione intersectuale del subagente per cliente×fornitore */
  window.interscambioPerOrdine = function (ordine) {
    return DATA.interscambio.find(x => x.cliente_piva === ordine.cliente_piva && x.fornitore_id === ordine.fornitore_id);
  };
  /* Rendiconto di un ordine: percentuali e provvigioni (agente + subagente) */
  window.commissionePerOrdine = function (ordine) {
    const isc = interscambioPerOrdine(ordine);
    if (!isc) return null;
    const sc = scaglionePerSconto(ordine.fornitore_id, isc.discount);
    if (!sc) return null;
    const pctA = sc.pct_agente;
    const pctS = pctSubagente(sc, isc.subagente_id);
    const merce = Number(ordine.importo_merce || 0);
    return {
      subagenteId: isc.subagente_id,
      sconto: isc.discount,
      pct_agente: pctA,
      pct_subagente: pctS,
      pct_totale: pctA + pctS,
      provv_agente: merce * pctA / 100,
      provv_subagente: merce * pctS / 100,
      provv_totale: merce * (pctA + pctS) / 100
    };
  };
  /* Riga bollettino: percentuale/importo CALCOLATI dall'app (da confrontare col riconosciuto).
     La riga fattura riferisce l'ordine corrispondente; se la fattura non è ancora saldata sull'ordine
     (ordine solo confermato, es. Ing's stagionale) ripiega sull'ordine cliente×fornitore presente. */
  window.rigaBollettinoCalcolata = function (bollettino, riga) {
    let ord = DATA.ordini.find(o => o.stato === 'fatturato' && o.fattura_numero === riga.fattura_numero);
    if (!ord) ord = DATA.ordini.find(o => o.cliente_piva === riga.cliente_piva && o.fornitore_id === bollettino.fornitore_id);
    if (!ord) return { pct_calcolata: 0, importo_calcolato: 0 };
    const c = commissionePerOrdine(ord);
    if (!c) return { pct_calcolata: 0, importo_calcolato: 0 };
    return { pct_calcolata: c.pct_totale, importo_calcolato: Number(riga.importo_merce || 0) * c.pct_totale / 100 };
  };
  /* Totali bollettino calcolati a runtime */
  window.bollettinoTotali = function (b) {
    let riconosciuto = 0, calcolato = 0;
    (b.righe || []).forEach(r => {
      riconosciuto += Number(r.importo_riconosciuto || 0);
      const c = rigaBollettinoCalcolata(b, r);
      calcolato += c.importo_calcolato;
    });
    return { riconosciuto: riconosciuto, calcolato: calcolato, differenza: riconosciuto - calcolato };
  };
  window.bollettinoRighe = function (b) {
    return (b.righe || []).map(r => {
      const c = rigaBollettinoCalcolata(b, r);
      return Object.assign({}, r, { pct_calcolata: c.pct_calcolata, importo_calcolato: c.importo_calcolato, differenza: Number(r.importo_riconosciuto || 0) - c.importo_calcolato });
    });
  };

  /* ---------- Export CSV (BOM utf-8 come nelle view) ---------- */
  window.exportCSV = function (filename, header, rows) {
    const csv = header + '\n' + rows.map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  };

  /* ---------- Document ready: navbar + toast ---------- */
  function navbar() {
    const slot = document.getElementById('topnav');
    if (!slot) return;
    slot.innerHTML =
      '<nav class="navbar navbar-dark bg-dark px-3 py-2">' +
      '<a class="navbar-brand d-flex align-items-center gap-2" href="index.html" title="Torna al launcher">' +
      '<img src="assets/img/logo-decobrands.png" alt="CRM" style="max-height:32px;max-width:120px;object-fit:contain;filter:brightness(0) invert(1)" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'inline-block\'">' +
      '<i class="bi bi-box-seam" style="display:none"></i>' +
      'CRM</a>' +
      '</nav>';
  }

  function footer() {
    const f = document.createElement('footer');
    f.className = 'db-footer';
    f.innerHTML =
      '<div class="container-fluid px-3 px-md-4">' +
      '<span>&copy; 2026 Ugo Volpato AI Consultant</span>' +
      '<span class="db-footer-sep">&middot;</span>' +
      '<a href="licenza.html">Licenza BSL 1.1</a>' +
      '</div>';
    document.body.appendChild(f);
  }

  function toast() {
    const c = document.createElement('div');
    c.className = 'toast-container';
    c.innerHTML = '<div id="toast" class="toast text-white border-0" role="alert"><div class="d-flex"><div class="toast-body" id="toast-msg"></div><button class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div></div>';
    document.body.appendChild(c);
  }

  document.addEventListener('DOMContentLoaded', function () {
    navbar();
    toast();
    footer();
  });
})();