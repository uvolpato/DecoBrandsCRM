/* ============================================================
   Decobrands — Prototipo alternativo — componenti
   Tabella standard, pagina, finestra modale, avvisi, icone, rotte.
   ============================================================ */
(function () {
  'use strict';
  const U = window.U = {};

  U.esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  U.$ = (sel, base) => (base || document).querySelector(sel);
  U.$$ = (sel, base) => Array.from((base || document).querySelectorAll(sel));
  U.el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  /* ---------- Icone (tratto, 24×24) ---------- */
  const PERCORSI = {
    oggi: '<rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M8 2.5v4M16 2.5v4M3 9.5h18M9 15l2 2 4-4"/>',
    arrivo: '<path d="M3 13l2.6-7.4A2 2 0 0 1 7.5 4.3h9a2 2 0 0 1 1.9 1.3L21 13v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 13h5l1.5 3h5l1.5-3h5"/>',
    pratiche: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    bollettini: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    liquidazioni: '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7"/><path d="M9 15v2c0 1.7 2.7 3 6 3s6-1.3 6-3v-5c0-1.7-2.7-3-6-3"/>',
    fornitori: '<path d="M3 21V10l6 3v-3l6 3V5l6 3v13z"/><path d="M3 21h18"/>',
    subagenti: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>',
    abbinamenti: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    cerca: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    spunta: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    scarica: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    carica: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
    piu: '<path d="M12 5v14M5 12h14"/>',
    posta: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    avviso: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17.5v.5"/>'
  };
  U.icona = nome => '<svg class="icona" viewBox="0 0 24 24" aria-hidden="true">' + (PERCORSI[nome] || '') + '</svg>';

  /* ---------- Stati ---------- */
  U.stato = (classe, testo) => '<span class="stato ' + classe + '">' + U.esc(testo) + '</span>';
  U.statoPratica = function (p) {
    const s = M.statoPratica(p);
    const cl = { fatturata: 's-ok', confermata: 's-neutro', attesa: 's-attesa', scaduta: 's-ritardo' }[s.chiave];
    return U.stato(cl, s.etichetta);
  };
  U.segno = n => n > 0.004 ? 'positivo' : n < -0.004 ? 'negativo' : '';
  U.euroSegno = n => (n > 0.004 ? '+' : '') + M.euro(n);

  /* ---------- Avvisi ---------- */
  let timer;
  U.avviso = function (testo) {
    let a = U.$('.avviso');
    if (!a) { a = U.el('div', 'avviso'); a.setAttribute('role', 'status'); document.body.appendChild(a); }
    a.textContent = testo;
    clearTimeout(timer);
    timer = setTimeout(() => a.remove(), 4200);
  };

  /* ---------- Finestra modale ----------
     opz: { titolo, testo, corpo (html | fn(el)), azioni: [{ etichetta, classe, onClick(chiudi, el) → false per restare }] } */
  U.modale = function (opz) {
    const velo = U.el('div', 'velo');
    velo.innerHTML = '<div class="modale" role="dialog" aria-modal="true" aria-labelledby="mod-t">' +
      '<div class="modale-testa"><h2 id="mod-t">' + U.esc(opz.titolo) + '</h2>' + (opz.testo ? '<p>' + opz.testo + '</p>' : '') + '</div>' +
      '<div class="modale-corpo"></div><div class="modale-piede"></div></div>';
    const corpo = U.$('.modale-corpo', velo);
    if (typeof opz.corpo === 'function') opz.corpo(corpo); else if (opz.corpo) corpo.innerHTML = opz.corpo; else corpo.remove();
    const chiudi = () => { velo.remove(); document.removeEventListener('keydown', esc); };
    const esc = e => { if (e.key === 'Escape') chiudi(); };
    document.addEventListener('keydown', esc);
    velo.addEventListener('click', e => { if (e.target === velo) chiudi(); });
    const piede = U.$('.modale-piede', velo);
    (opz.azioni || [{ etichetta: 'Chiudi', classe: 'sec' }]).forEach(a => {
      const b = U.el('button', 'btn ' + (a.classe || ''), U.esc(a.etichetta));
      b.type = 'button';
      b.addEventListener('click', () => { if (!a.onClick || a.onClick(chiudi, corpo) !== false) chiudi(); });
      piede.appendChild(b);
    });
    document.body.appendChild(velo);
    const primo = U.$('input, textarea, select', corpo) || U.$('.modale-piede .btn:last-child', velo);
    if (primo) primo.focus();
    return { chiudi: chiudi, corpo: corpo };
  };
  U.conferma = (titolo, testo, etichetta, pericolo) => new Promise(ok => U.modale({
    titolo: titolo, testo: testo,
    azioni: [{ etichetta: 'Annulla', classe: 'sec', onClick: () => ok(false) }, { etichetta: etichetta, classe: pericolo ? 'pericolo' : '', onClick: () => ok(true) }]
  }));

  /* ---------- Campi ---------- */
  U.campo = function (c) {
    let ctl;
    const id = 'c-' + c.nome;
    if (c.tipo === 'select') ctl = '<select id="' + id + '" name="' + c.nome + '">' + c.opzioni.map(o => '<option value="' + U.esc(o.value) + '"' + (String(o.value) === String(c.valore) ? ' selected' : '') + '>' + U.esc(o.label) + '</option>').join('') + '</select>';
    else if (c.tipo === 'area') ctl = '<textarea id="' + id + '" name="' + c.nome + '" rows="' + (c.righe || 3) + '">' + U.esc(c.valore || '') + '</textarea>';
    else ctl = '<input id="' + id + '" name="' + c.nome + '" type="' + ({ numero: 'number', data: 'date' }[c.tipo] || 'text') + '"' + (c.passo ? ' step="' + c.passo + '"' : '') + ' value="' + U.esc(c.valore == null ? '' : c.valore) + '"' + (c.placeholder ? ' placeholder="' + U.esc(c.placeholder) + '"' : '') + '>';
    return '<div class="campo' + (c.largo ? ' largo' : '') + '"><label for="' + id + '">' + U.esc(c.etichetta) + '</label>' + ctl + (c.aiuto ? '<span class="aiuto" data-aiuto="' + c.nome + '">' + c.aiuto + '</span>' : '') + '</div>';
  };
  U.valori = el => { const v = {}; U.$$('[name]', el).forEach(x => { v[x.name] = x.value.trim(); }); return v; };

  /* ---------- Scarica un file ---------- */
  U.scarica = function (nome, contenuto, tipo) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([contenuto], { type: tipo || 'text/csv;charset=utf-8' }));
    a.download = nome; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  /* =========================================================
     Tabella standard
     Riempie lo spazio, intestazione fissa, righe scorrevoli, intestazioni ordinabili,
     totali fissi in fondo, piede con il conteggio.
     opz: { colonne: [{ key, titolo, tipo: 'testo'|'euro'|'num'|'pct'|'data', valore(r), cella(r) → html,
                        allinea, cresce, ordina (default true), totale: 'somma' }],
            righe, suRiga(r), classeRiga(r), vuoto: { titolo, testo }, ordine: { key, dir }, compatta, naturale (altezza del contenuto), piede (html), etichettaTotale }
     ========================================================= */
  const TIPI = {
    testo: { fmt: v => v == null || v === '' ? '—' : U.esc(v), ord: v => String(v == null ? '' : v).toLowerCase(), al: '' },
    euro: { fmt: v => M.euro(v), ord: v => Number(v) || 0, al: 'dx' },
    num: { fmt: v => M.num(v), ord: v => Number(v) || 0, al: 'dx' },
    pct: { fmt: v => M.pct(v), ord: v => Number(v) || 0, al: 'dx' },
    data: { fmt: v => M.data(v), ord: v => v || '', al: '' }
  };
  U.tabella = function (host, opz) {
    const box = U.el('div', 'tab' + (opz.compatta ? ' compatta' : '') + (opz.naturale ? ' naturale' : ''));
    host.appendChild(box);
    let righe = opz.righe || [];
    let ord = opz.ordine || null;
    const cols = opz.colonne.map(c => {
      const t = TIPI[c.tipo || 'testo'];
      const val = c.valore || (r => r[c.key]);
      return Object.assign({ ordina: true }, c, { _val: val, _fmt: c.cella || (r => t.fmt(val(r))), _ord: c.ordinaPer || (r => t.ord(val(r))), _al: c.allinea || t.al });
    });
    function disegna() {
      let lista = righe;
      if (ord) {
        const c = cols.find(x => x.key === ord.key);
        lista = righe.slice().sort((a, b) => { const x = c._ord(a), y = c._ord(b); const r = x < y ? -1 : x > y ? 1 : 0; return ord.dir === 'desc' ? -r : r; });
      }
      const thead = '<thead><tr>' + cols.map(c => {
        const att = ord && ord.key === c.key;
        return '<th class="' + [c._al, c.ordina ? 'ordinabile' : '', att ? 'attivo' : ''].join(' ') + '"' + (c.ordina ? ' data-k="' + c.key + '" aria-sort="' + (att ? (ord.dir === 'asc' ? 'ascending' : 'descending') : 'none') + '"' : '') + '>' +
          U.esc(c.titolo) + (c.ordina ? '<span class="freccia">' + (att ? (ord.dir === 'asc' ? '▲' : '▼') : '▲▼') + '</span>' : '') + '</th>';
      }).join('') + '</tr></thead>';
      const tbody = '<tbody>' + (lista.length ? lista.map((r, i) =>
        '<tr data-i="' + i + '" class="' + [opz.suRiga ? 'cliccabile' : '', opz.classeRiga ? opz.classeRiga(r) : ''].join(' ') + '">' +
        cols.map(c => '<td class="' + [c._al, c.cresce ? 'cresce' : '', c.classe ? (typeof c.classe === 'function' ? c.classe(r) : c.classe) : ''].join(' ') + '">' + c._fmt(r) + '</td>').join('') + '</tr>').join('')
        : '<tr><td colspan="' + cols.length + '"><div class="vuoto"><b>' + U.esc((opz.vuoto || {}).titolo || 'Nessun elemento') + '</b>' + U.esc((opz.vuoto || {}).testo || '') + '</div></td></tr>') + '</tbody>';
      let tfoot = '';
      if (lista.length && cols.some(c => c.totale)) {
        const primo = cols.findIndex(c => c.totale);
        tfoot = '<tfoot><tr><td colspan="' + Math.max(1, primo) + '">' + U.esc(opz.etichettaTotale || 'Totale') + '</td>' +
          cols.slice(Math.max(1, primo)).map(c => '<td class="' + c._al + '">' + (c.totale ? TIPI[c.tipo || 'num'].fmt(lista.reduce((s, r) => s + (Number(c._val(r)) || 0), 0)) : '') + '</td>').join('') + '</tr></tfoot>';
      }
      box.innerHTML = '<div class="tab-scorri"><table>' + thead + tbody + tfoot + '</table></div>' +
        '<div class="tab-piede"><span>' + lista.length + (lista.length === 1 ? ' elemento' : ' elementi') + '</span>' + (opz.piede ? '<span>' + opz.piede + '</span>' : '') + '</div>';
      U.$$('th[data-k]', box).forEach(th => th.addEventListener('click', () => {
        const k = th.dataset.k;
        ord = { key: k, dir: ord && ord.key === k && ord.dir === 'asc' ? 'desc' : 'asc' };
        disegna();
      }));
      if (opz.suRiga) U.$$('tbody tr[data-i]', box).forEach(tr => tr.addEventListener('click', e => {
        if (e.target.closest('a, button')) return;
        opz.suRiga(lista[Number(tr.dataset.i)]);
      }));
    }
    disegna();
    return { el: box, aggiorna: nuove => { righe = nuove; disegna(); } };
  };

  /* ---------- Segmenti (filtro a scelta singola) ---------- */
  U.segmenti = function (host, voci, attivo, onCambia) {
    const box = U.el('div', 'segmenti');
    box.setAttribute('role', 'tablist');
    box.innerHTML = voci.map(v => '<button type="button" role="tab" data-v="' + v.v + '" class="' + (v.v === attivo ? 'attivo' : '') + '" aria-selected="' + (v.v === attivo) + '">' + U.esc(v.t) + (v.n != null ? '<span class="n">' + v.n + '</span>' : '') + '</button>').join('');
    U.$$('button', box).forEach(b => b.addEventListener('click', () => {
      U.$$('button', box).forEach(x => { x.classList.toggle('attivo', x === b); x.setAttribute('aria-selected', x === b); });
      onCambia(b.dataset.v);
    }));
    host.appendChild(box);
    return box;
  };

  /* =========================================================
     Pagina e barra laterale
     ========================================================= */
  const VOCI = [
    { gruppo: 'Ogni giorno', voci: [
      { id: 'oggi', href: '#/', t: 'Oggi', icona: 'oggi' },
      { id: 'documenti', href: '#/documenti', t: 'Documenti in arrivo', icona: 'arrivo' },
      { id: 'pratiche', href: '#/pratiche', t: 'Pratiche', icona: 'pratiche' }] },
    { gruppo: 'Ogni mese', voci: [
      { id: 'bollettini', href: '#/bollettini', t: 'Bollettini', icona: 'bollettini' }] },
    { gruppo: 'Ogni trimestre', voci: [
      { id: 'liquidazioni', href: '#/liquidazioni', t: 'Liquidazioni', icona: 'liquidazioni' }] },
    { gruppo: 'Anagrafiche', voci: [
      { id: 'fornitori', href: '#/fornitori', t: 'Fornitori', icona: 'fornitori' },
      { id: 'subagenti', href: '#/subagenti', t: 'Subagenti', icona: 'subagenti' },
      { id: 'abbinamenti', href: '#/abbinamenti', t: 'Clienti e abbinamenti', icona: 'abbinamenti' }] }
  ];
  function conteggi() {
    const fare = M.daFare();
    return {
      oggi: { n: fare.length },
      documenti: { n: M.S.in_arrivo.length, urgente: M.S.in_arrivo.length > 0 },
      pratiche: { n: M.S.pratiche.filter(p => M.statoPratica(p).chiave === 'scaduta').length, urgente: true },
      bollettini: { n: fare.filter(x => x.tipo === 'bollettino' || x.tipo === 'mancante').length }
    };
  }
  U.barra = function (attiva) {
    const c = conteggi();
    const b = U.$('#barra');
    b.innerHTML = '<div class="marchio"><b>Decobrands</b><span>Pratiche e provvigioni</span></div>' +
      VOCI.map(g => '<nav class="gruppo" aria-label="' + g.gruppo + '"><div class="gruppo-nome">' + g.gruppo + '</div>' +
        g.voci.map(v => {
          const k = c[v.id];
          return '<a class="voce' + (v.id === attiva ? ' attiva' : '') + '" href="' + v.href + '"' + (v.id === attiva ? ' aria-current="page"' : '') + '>' + U.icona(v.icona) + '<span>' + v.t + '</span>' +
            (k && k.n ? '<span class="conta' + (k.urgente ? ' urgente' : '') + '">' + k.n + '</span>' : '') + '</a>';
        }).join('') + '</nav>').join('') +
      '<div class="barra-piede">Data simulata: ' + M.dataLunga(M.oggi()) + '<br><button type="button" id="ripristina">Ripristina i dati di prova</button></div>';
    U.$('#ripristina').addEventListener('click', async () => {
      if (!(await U.conferma('Ripristinare i dati di prova?', 'Le modifiche fatte in questa demo andranno perse.', 'Ripristina', true))) return;
      M.ripristina(); U.avviso('Dati di prova ripristinati'); U.naviga();
    });
  };
  /* opz: { voce, titolo, titoloHtml, sotto, percorso: [{ t, href }], azioni: [{ etichetta, icona, classe, onClick, href, disabilitato, titolo }], pieno } → corpo */
  U.pagina = function (opz) {
    U.barra(opz.voce);
    const p = U.$('#principale');
    p.innerHTML = '<header class="testa"><div>' +
      (opz.percorso ? '<div class="percorso">' + opz.percorso.map(x => x.href ? '<a href="' + x.href + '">' + U.esc(x.t) + '</a>' : U.esc(x.t)).join(' › ') + '</div>' : '') +
      '<h1>' + (opz.titoloHtml || U.esc(opz.titolo)) + '</h1>' + (opz.sotto ? '<div class="sotto">' + opz.sotto + '</div>' : '') + '</div>' +
      '<div class="testa-azioni"></div></header><section class="corpo' + (opz.pieno ? ' pieno' : '') + '"></section>';
    const az = U.$('.testa-azioni', p);
    (opz.azioni || []).forEach(a => {
      const b = U.el(a.href ? 'a' : 'button', 'btn ' + (a.classe || ''), (a.icona ? U.icona(a.icona) : '') + U.esc(a.etichetta));
      if (a.href) b.href = a.href; else b.type = 'button';
      if (a.disabilitato) b.disabled = true;
      if (a.titolo) b.title = a.titolo;
      if (a.onClick) b.addEventListener('click', a.onClick);
      az.appendChild(b);
    });
    document.title = (opz.titolo || 'Decobrands') + ' · Decobrands';
    p.scrollTop = 0;
    return U.$('.corpo', p);
  };

  /* ---------- Rotte (#/percorso) ---------- */
  const ROTTE = [];
  U.rotta = (re, fn) => ROTTE.push({ re: re, fn: fn });
  U.naviga = function () {
    const h = (location.hash || '#/').slice(1);
    for (const r of ROTTE) { const m = h.match(r.re); if (m) { r.fn.apply(null, m.slice(1)); return; } }
    location.hash = '#/';
  };
  window.addEventListener('hashchange', U.naviga);
})();
