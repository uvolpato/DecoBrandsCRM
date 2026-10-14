/* ============================================================
   Decobrands — Prototipo alternativo — libreria componenti (window.CRM)
   Ogni vista è una composizione di questi oggetti configurati con parametri.
   Nomi e parametri allineati al primo prototipo (prototipo-crm/assets/js/componenti.js)
   per i componenti in comune; gli altri sono propri dei flussi di questo prototipo.
   Catalogo dal vivo: index.html#/componenti

   Struttura:   Pagina · Intestazione · Pannello · Nota
   Dati:        DataTable · FilterBar · KpiRow · Cifre · Dettagli · Elenco · Matrice
   Flussi:      ListaDaFare · ElencoSelezionabile · Scelte · Binario · Cerniera · Periodi
   Moduli:      Form · FormModal · Modale · Conferma · TestoDaInviare · Avviso
   Piccoli:     stato() · statoPratica() · icona() · euroSegno() · classeSegno()
   ============================================================ */
(function () {
  'use strict';
  const CRM = window.CRM = {};

  /* ---------- Utilità ---------- */
  const esc = CRM.esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const $ = CRM.$ = (sel, base) => (base || document).querySelector(sel);
  const $$ = CRM.$$ = (sel, base) => Array.from((base || document).querySelectorAll(sel));
  const el = CRM.el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const ospite = h => typeof h === 'string' ? $(h) : h;
  CRM.blocco = (host, classe, stile) => { const b = el('div', classe || ''); if (stile) b.style.cssText = stile; ospite(host).appendChild(b); return b; };

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
    componenti: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    cerca: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    spunta: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    scarica: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    carica: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
    piu: '<path d="M12 5v14M5 12h14"/>',
    posta: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    avviso: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17.5v.5"/>'
  };
  CRM.icona = (nome, classe) => '<svg class="icona' + (classe ? ' ' + classe : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (PERCORSI[nome] || '') + '</svg>';

  /* ---------- Stati e segni ----------
     varianti: 'ok' (verde), 'attesa' (giallo), 'errore' (rosso), 'info' (azzurro), 'primario' (blu), 'neutro' (grigio) */
  CRM.stato = (variante, testo) => '<span class="stato s-' + variante + '">' + esc(testo) + '</span>';
  CRM.statoPratica = function (p) {
    const s = M.statoPratica(p);
    return CRM.stato({ fatturata: 'ok', confermata: 'info', attesa: 'attesa', scaduta: 'errore' }[s.chiave], s.etichetta);
  };
  CRM.classeSegno = n => n > 0.004 ? 'positivo' : n < -0.004 ? 'negativo' : '';
  CRM.euroSegno = n => (n > 0.004 ? '+' : '') + M.euro(n);

  /* =========================================================
     Avviso (messaggio temporaneo in basso a destra)
     ========================================================= */
  let timer;
  CRM.Avviso = function (testo) {
    let a = $('.avviso');
    if (!a) { a = el('div', 'avviso'); a.setAttribute('role', 'status'); document.body.appendChild(a); }
    a.textContent = testo;
    clearTimeout(timer);
    timer = setTimeout(() => a.remove(), 4200);
  };

  /* =========================================================
     Modale · Conferma
     Modale({ titolo, testo, corpo: html | fn(el), azioni: [{ etichetta, variante: 'primario'|'sec'|'pericolo', onClick(chiudi, corpo) → false per restare }] })
     Conferma(titolo, testo, etichetta, pericolo) → Promise<boolean>
     ========================================================= */
  CRM.Modale = function (opz) {
    const velo = el('div', 'velo');
    velo.innerHTML = '<div class="modale" role="dialog" aria-modal="true" aria-labelledby="mod-t">' +
      '<div class="modale-testa"><h2 id="mod-t">' + esc(opz.titolo) + '</h2>' + (opz.testo ? '<p>' + opz.testo + '</p>' : '') + '</div>' +
      '<div class="modale-corpo"></div><div class="modale-piede"></div></div>';
    const corpo = $('.modale-corpo', velo);
    if (typeof opz.corpo === 'function') opz.corpo(corpo); else if (opz.corpo) corpo.innerHTML = opz.corpo; else corpo.remove();
    const chiudi = () => { velo.remove(); document.removeEventListener('keydown', tasto); };
    const tasto = e => { if (e.key === 'Escape') chiudi(); };
    document.addEventListener('keydown', tasto);
    velo.addEventListener('click', e => { if (e.target === velo) chiudi(); });
    const piede = $('.modale-piede', velo);
    (opz.azioni || [{ etichetta: 'Chiudi', variante: 'sec' }]).forEach(a => {
      const b = el('button', 'btn ' + (a.variante && a.variante !== 'primario' ? a.variante : ''), esc(a.etichetta));
      b.type = 'button';
      b.addEventListener('click', () => { if (!a.onClick || a.onClick(chiudi, corpo) !== false) chiudi(); });
      piede.appendChild(b);
    });
    document.body.appendChild(velo);
    const primo = $('input, textarea, select', corpo) || $('.modale-piede .btn:last-child', velo);
    if (primo) primo.focus();
    return { chiudi: chiudi, corpo: corpo };
  };
  CRM.Conferma = (titolo, testo, etichetta, pericolo) => new Promise(ok => CRM.Modale({
    titolo: titolo, testo: testo,
    azioni: [{ etichetta: 'Annulla', variante: 'sec', onClick: () => ok(false) }, { etichetta: etichetta, variante: pericolo ? 'pericolo' : 'primario', onClick: () => ok(true) }]
  }));

  /* =========================================================
     TestoDaInviare: testo precompilato da copiare (solleciti, contestazioni)
     opz: { titolo, destinatario, testo, onCopia() }
     ========================================================= */
  CRM.TestoDaInviare = opz => CRM.Modale({
    titolo: opz.titolo, testo: 'Copia il testo e invialo a ' + esc(opz.destinatario) + '.',
    corpo: '<textarea class="testo-email" aria-label="Testo da inviare">' + esc(opz.testo) + '</textarea>',
    azioni: [{ etichetta: 'Chiudi', variante: 'sec' }, { etichetta: 'Copia il testo', onClick: (c, corpo) => {
      const t = $('textarea', corpo); t.select();
      try { navigator.clipboard.writeText(t.value); } catch (x) { document.execCommand('copy'); }
      if (opz.onCopia) opz.onCopia();
      CRM.Avviso('Testo copiato');
    } }]
  });

  /* =========================================================
     Form
     opz: { campi: [{ nome, etichetta, tipo: 'testo'|'numero'|'data'|'select'|'area', opzioni: [{ value, label }],
                      valore, aiuto, largo, passo, placeholder }], colonne: 1|2|3 }
     → { el, valori(), campo(nome), aiuto(nome, html, errore), errore(testo) }
     ========================================================= */
  function campoHtml(c) {
    const id = 'c-' + c.nome;
    let ctl;
    if (c.tipo === 'select') ctl = '<select id="' + id + '" name="' + c.nome + '">' + c.opzioni.map(o => '<option value="' + esc(o.value) + '"' + (String(o.value) === String(c.valore) ? ' selected' : '') + '>' + esc(o.label) + '</option>').join('') + '</select>';
    else if (c.tipo === 'area') ctl = '<textarea id="' + id + '" name="' + c.nome + '" rows="' + (c.righe || 3) + '">' + esc(c.valore || '') + '</textarea>';
    else ctl = '<input id="' + id + '" name="' + c.nome + '" type="' + ({ numero: 'number', data: 'date' }[c.tipo] || 'text') + '"' + (c.passo ? ' step="' + c.passo + '"' : '') +
      ' value="' + esc(c.valore == null ? '' : c.valore) + '"' + (c.placeholder ? ' placeholder="' + esc(c.placeholder) + '"' : '') + '>';
    return '<div class="campo' + (c.largo ? ' largo' : '') + '">' + (c.etichetta ? '<label for="' + id + '">' + esc(c.etichetta) + '</label>' : '') + ctl +
      '<span class="aiuto" data-aiuto="' + c.nome + '"' + (c.aiuto ? '' : ' hidden') + '>' + (c.aiuto || '') + '</span></div>';
  }
  CRM.Form = function (host, opz) {
    const f = el('form', 'modulo modulo-' + (opz.colonne || 1));
    f.addEventListener('submit', e => e.preventDefault());
    f.innerHTML = opz.campi.map(campoHtml).join('') + '<p class="modulo-errore" role="alert" hidden></p>';
    ospite(host).appendChild(f);
    return {
      el: f,
      valori: () => { const v = {}; $$('[name]', f).forEach(x => { v[x.name] = x.value.trim(); }); return v; },
      campo: n => f.elements[n],
      aiuto: (n, html, errore) => { const a = $('[data-aiuto="' + n + '"]', f); a.innerHTML = html || ''; a.hidden = !html; a.classList.toggle('errore', !!errore); },
      errore: t => { const p = $('.modulo-errore', f); p.textContent = t || ''; p.hidden = !t; }
    };
  };

  /* =========================================================
     FormModal
     opz: { titolo, testo, campi, colonne, conferma ('Salva'), pericolo, azioniExtra: [{ etichetta, variante, onClick(chiudi) }],
            onConferma(valori, form) → false per lasciarla aperta }
     ========================================================= */
  CRM.FormModal = function (opz) {
    let form;
    return CRM.Modale({
      titolo: opz.titolo, testo: opz.testo,
      corpo: c => { form = CRM.Form(c, { campi: opz.campi, colonne: opz.colonne }); },
      azioni: (opz.azioniExtra || []).concat([{ etichetta: 'Annulla', variante: 'sec' },
        { etichetta: opz.conferma || 'Salva', variante: opz.pericolo ? 'pericolo' : 'primario', onClick: () => opz.onConferma(form.valori(), form) }])
    });
  };

  /* =========================================================
     Pagina · Intestazione
     Pagina({ voce, titolo, titoloHtml, sottotitolo, briciole: [{ etichetta, href }], badge,
              azioni: [{ etichetta, icona, variante, onClick, href, disabilitato, titolo }], pieno }) → corpo
     ========================================================= */
  CRM.Intestazione = function (host, opz) {
    const h = el('header', 'testa');
    h.innerHTML = '<div>' +
      (opz.briciole ? '<nav class="percorso" aria-label="Percorso">' + opz.briciole.map(x => x.href ? '<a href="' + x.href + '">' + esc(x.etichetta) + '</a>' : '<span>' + esc(x.etichetta) + '</span>').join(' › ') + '</nav>' : '') +
      '<h1>' + (opz.titoloHtml || esc(opz.titolo)) + (opz.badge ? ' <span class="testa-badge">' + opz.badge + '</span>' : '') + '</h1>' +
      (opz.sottotitolo ? '<div class="sotto">' + opz.sottotitolo + '</div>' : '') + '</div><div class="testa-azioni"></div>';
    const az = $('.testa-azioni', h);
    (opz.azioni || []).forEach(a => {
      const b = el(a.href ? 'a' : 'button', 'btn ' + (a.variante && a.variante !== 'primario' ? a.variante : ''), (a.icona ? CRM.icona(a.icona) : '') + esc(a.etichetta));
      if (a.href) b.href = a.href; else b.type = 'button';
      if (a.disabilitato) b.disabled = true;
      if (a.titolo) b.title = a.titolo;
      if (a.onClick) b.addEventListener('click', a.onClick);
      az.appendChild(b);
    });
    ospite(host).appendChild(h);
    return h;
  };
  CRM.Pagina = function (opz) {
    CRM.Barra(opz.voce);
    const p = $('#principale');
    p.innerHTML = '';
    CRM.Intestazione(p, opz);
    const corpo = el('section', 'corpo' + (opz.pieno ? ' pieno' : ''));
    p.appendChild(corpo);
    document.title = (opz.titolo || 'Decobrands') + ' · Decobrands';
    return corpo;
  };

  /* =========================================================
     Pannello
     opz: { titolo, nota (html a destra), azioni: [{ etichetta, icona, variante, onClick, href }], riempi, senzaMargine }
     → { el, corpo, nota(html) }
     ========================================================= */
  CRM.Pannello = function (host, opz) {
    const p = el('section', 'pannello' + (opz.riempi ? ' riempi' : ''));
    p.innerHTML = (opz.titolo ? '<div class="pannello-testa"><h2>' + esc(opz.titolo) + '</h2><div class="pannello-destra"><span class="pannello-nota">' + (opz.nota || '') + '</span></div></div>' : '') +
      '<div class="pannello-corpo' + (opz.senzaMargine ? ' senza-margine' : '') + '"></div>';
    (opz.azioni || []).forEach(a => {
      const b = el(a.href ? 'a' : 'button', 'btn piccolo ' + (a.variante || 'sec'), (a.icona ? CRM.icona(a.icona) : '') + esc(a.etichetta));
      if (a.href) b.href = a.href; else b.type = 'button';
      if (a.onClick) b.addEventListener('click', a.onClick);
      $('.pannello-destra', p).appendChild(b);
    });
    ospite(host).appendChild(p);
    return { el: p, corpo: $('.pannello-corpo', p), nota: html => { $('.pannello-nota', p).innerHTML = html; } };
  };

  /* ---------- Nota (testo informativo) ---------- */
  CRM.Nota = function (host, html) { const n = el('p', 'nota', html); ospite(host).appendChild(n); return n; };

  /* =========================================================
     DataTable — riempie lo spazio, intestazione fissa, righe scorrevoli, intestazioni ordinabili,
     totali fissi, piede con conteggio. Stessi parametri del primo prototipo.
     opz: { colonne: [{ key, header, tipo: 'testo'|'euro'|'numero'|'pct'|'data', valore(r), cell(r) → html, align: 'left'|'right'|'center',
                        grow, sortable (default true), sortValue(r), classe(r), totale: 'somma' }],
            righe, onRowClick(r), rowClass(r), emptyText, emptyHint, ordinamentoIniziale: { key, dir },
            compatta, naturale (altezza del contenuto), piede (html), etichettaTotale }
     → { el, aggiorna(righe) }
     ========================================================= */
  const TIPI = {
    testo: { fmt: v => v == null || v === '' ? '—' : esc(v), ord: v => String(v == null ? '' : v).toLowerCase(), al: '' },
    euro: { fmt: v => M.euro(v), ord: v => Number(v) || 0, al: 'right' },
    numero: { fmt: v => M.num(v), ord: v => Number(v) || 0, al: 'right' },
    pct: { fmt: v => M.pct(v), ord: v => Number(v) || 0, al: 'right' },
    data: { fmt: v => M.data(v), ord: v => v || '', al: '' }
  };
  CRM.DataTable = function (host, opz) {
    const box = el('div', 'dt' + (opz.compatta ? ' compatta' : '') + (opz.naturale ? ' naturale' : ''));
    ospite(host).appendChild(box);
    let righe = opz.righe || [];
    let ord = opz.ordinamentoIniziale || null;
    const cols = opz.colonne.map(c => {
      const t = TIPI[c.tipo || 'testo'];
      const val = c.valore || (r => r[c.key]);
      const al = c.align === 'right' ? 'dx' : c.align === 'center' ? 'cx' : c.align === 'left' ? '' : (t.al === 'right' ? 'dx' : '');
      return Object.assign({ sortable: true }, c, { _val: val, _fmt: c.cell || (r => t.fmt(val(r))), _ord: c.sortValue || (r => t.ord(val(r))), _al: al });
    });
    function disegna() {
      let lista = righe;
      if (ord) {
        const c = cols.find(x => x.key === ord.key);
        lista = righe.slice().sort((a, b) => { const x = c._ord(a), y = c._ord(b); const r = x < y ? -1 : x > y ? 1 : 0; return ord.dir === 'desc' ? -r : r; });
      }
      const thead = '<thead><tr>' + cols.map(c => {
        const att = ord && ord.key === c.key;
        return '<th class="' + [c._al, c.sortable ? 'ordinabile' : '', att ? 'attivo' : ''].join(' ') + '"' +
          (c.sortable ? ' data-k="' + c.key + '" aria-sort="' + (att ? (ord.dir === 'asc' ? 'ascending' : 'descending') : 'none') + '"' : '') + '>' +
          esc(c.header) + (c.sortable ? '<span class="freccia" aria-hidden="true">' + (att ? (ord.dir === 'asc' ? '▲' : '▼') : '▲▼') + '</span>' : '') + '</th>';
      }).join('') + '</tr></thead>';
      const tbody = '<tbody>' + (lista.length ? lista.map((r, i) =>
        '<tr data-i="' + i + '" class="' + [opz.onRowClick ? 'cliccabile' : '', opz.rowClass ? opz.rowClass(r) : ''].join(' ') + '">' +
        cols.map(c => '<td class="' + [c._al, c.grow ? 'cresce' : '', c.classe ? (typeof c.classe === 'function' ? c.classe(r) : c.classe) : ''].join(' ') + '">' + c._fmt(r) + '</td>').join('') + '</tr>').join('')
        : '<tr><td colspan="' + cols.length + '"><div class="vuoto"><b>' + esc(opz.emptyText || 'Nessun elemento') + '</b>' + esc(opz.emptyHint || '') + '</div></td></tr>') + '</tbody>';
      let tfoot = '';
      if (lista.length && cols.some(c => c.totale)) {
        const primo = Math.max(1, cols.findIndex(c => c.totale));
        tfoot = '<tfoot><tr><td colspan="' + primo + '">' + esc(opz.etichettaTotale || 'Totale') + '</td>' +
          cols.slice(primo).map(c => '<td class="' + c._al + '">' + (c.totale ? TIPI[c.tipo || 'numero'].fmt(lista.reduce((s, r) => s + (Number(c._val(r)) || 0), 0)) : '') + '</td>').join('') + '</tr></tfoot>';
      }
      box.innerHTML = '<div class="dt-scorri"><table>' + thead + tbody + tfoot + '</table></div>' +
        '<div class="dt-piede"><span>' + lista.length + (lista.length === 1 ? ' elemento' : ' elementi') + '</span>' + (opz.piede ? '<span>' + opz.piede + '</span>' : '') + '</div>';
      $$('th[data-k]', box).forEach(th => th.addEventListener('click', () => {
        const k = th.dataset.k;
        ord = { key: k, dir: ord && ord.key === k && ord.dir === 'asc' ? 'desc' : 'asc' };
        disegna();
      }));
      if (opz.onRowClick) $$('tbody tr[data-i]', box).forEach(tr => tr.addEventListener('click', e => {
        if (e.target.closest('a, button')) return;
        opz.onRowClick(lista[Number(tr.dataset.i)]);
      }));
    }
    disegna();
    return { el: box, aggiorna: nuove => { righe = nuove; disegna(); } };
  };

  /* =========================================================
     FilterBar
     opz: { campi: [{ nome, tipo: 'segmenti'|'cerca'|'select', opzioni: [{ value, label, n }], valore, placeholder }], onChange(valori) }
     → { el, valori() }
     ========================================================= */
  CRM.FilterBar = function (host, opz) {
    const bar = el('div', 'filtri');
    const val = {};
    opz.campi.forEach(c => {
      val[c.nome] = c.valore != null ? String(c.valore) : (c.tipo === 'segmenti' ? String(c.opzioni[0].value) : '');
      if (c.tipo === 'segmenti') {
        const g = el('div', 'segmenti');
        g.setAttribute('role', 'tablist');
        g.innerHTML = c.opzioni.map(o => '<button type="button" role="tab" data-v="' + esc(o.value) + '" aria-selected="' + (String(o.value) === val[c.nome]) + '">' + esc(o.label) + (o.n != null ? '<span class="n">' + o.n + '</span>' : '') + '</button>').join('');
        $$('button', g).forEach(b => b.addEventListener('click', () => {
          $$('button', g).forEach(x => x.setAttribute('aria-selected', String(x === b)));
          val[c.nome] = b.dataset.v; opz.onChange(Object.assign({}, val));
        }));
        bar.appendChild(g);
      } else if (c.tipo === 'cerca') {
        const l = el('label', 'cerca', CRM.icona('cerca') + '<input type="search" aria-label="Cerca" placeholder="' + esc(c.placeholder || 'Cerca') + '">');
        const i = $('input', l); i.value = val[c.nome];
        i.addEventListener('input', () => { val[c.nome] = i.value; opz.onChange(Object.assign({}, val)); });
        bar.appendChild(l);
      } else {
        const s = el('select', 'filtro-select', c.opzioni.map(o => '<option value="' + esc(o.value) + '">' + esc(o.label) + '</option>').join(''));
        s.value = val[c.nome];
        s.addEventListener('change', () => { val[c.nome] = s.value; opz.onChange(Object.assign({}, val)); });
        bar.appendChild(s);
      }
    });
    ospite(host).appendChild(bar);
    return { el: bar, valori: () => Object.assign({}, val) };
  };

  /* =========================================================
     KpiRow — riquadri numerici; se selezionabile fanno da filtro
     voci: [{ id, etichetta, valore, variante: 'primario'|'ok'|'attesa'|'errore'|'info', dettagli: [{ testo, variante }] }]
     opz: { selezionata, onSeleziona(id | null) }
     ========================================================= */
  CRM.KpiRow = function (host, voci, opz) {
    opz = opz || {};
    const row = el('div', 'kpi-riga');
    row.style.setProperty('--n', voci.length);
    row.innerHTML = voci.map(v => {
      const tag = opz.onSeleziona ? 'button' : 'div';
      return '<' + tag + (tag === 'button' ? ' type="button" aria-pressed="' + (opz.selezionata === v.id) + '"' : '') + ' class="kpi k-' + (v.variante || 'primario') + '" data-id="' + esc(v.id) + '">' +
        '<span class="kpi-etichetta">' + esc(v.etichetta) + '</span><span class="kpi-valore ' + (typeof v.valore === 'number' ? CRM.classeSegno(Math.min(0, v.valore)) : '') + '">' + (typeof v.valore === 'number' ? M.euro(v.valore) : esc(v.valore)) + '</span>' +
        (v.dettagli || []).map(d => '<span class="kpi-dettaglio' + (d.variante ? ' d-' + d.variante : '') + '">' + esc(d.testo) + '</span>').join('') + '</' + tag + '>';
    }).join('');
    if (opz.onSeleziona) $$('button.kpi', row).forEach(b => b.addEventListener('click', () => {
      const id = b.getAttribute('aria-pressed') === 'true' ? null : b.dataset.id;
      $$('button.kpi', row).forEach(x => x.setAttribute('aria-pressed', String(x.dataset.id === id)));
      opz.onSeleziona(id);
    }));
    ospite(host).appendChild(row);
    return row;
  };

  /* ---------- Cifre: elenco etichetta → importo ----------
     voci: [{ etichetta, valore (numero = euro, testo), nota, variante, forte }] */
  CRM.Cifre = function (host, voci) {
    const dl = el('dl', 'cifre', voci.map(v => '<div' + (v.forte ? ' class="forte"' : '') + '><dt>' + esc(v.etichetta) + (v.nota ? '<span class="sec-riga">' + v.nota + '</span>' : '') + '</dt>' +
      '<dd class="' + (v.variante ? 'c-' + v.variante : (typeof v.valore === 'number' ? CRM.classeSegno(Math.min(0, v.valore)) : '')) + '">' + (typeof v.valore === 'number' ? M.euro(v.valore) : v.valore) + '</dd></div>').join(''));
    ospite(host).appendChild(dl);
    return dl;
  };

  /* ---------- Dettagli: coppie etichetta / valore ---------- */
  CRM.Dettagli = function (host, voci) {
    const dl = el('dl', 'dettagli', voci.map(v => '<dt>' + esc(v.etichetta) + '</dt><dd>' + v.valore + '</dd>').join(''));
    ospite(host).appendChild(dl);
    return dl;
  };

  /* ---------- Elenco semplice (registro, documenti) ----------
     voci: [{ testo (html), destra (html) }], vuoto */
  CRM.Elenco = function (host, voci, vuoto) {
    const ul = el('ul', 'elenco', voci.length ? voci.map(v => '<li><span>' + v.testo + '</span>' + (v.destra != null ? '<span class="destra">' + v.destra + '</span>' : '') + '</li>').join('') : '<li class="testo-tenue">' + esc(vuoto || 'Nessun elemento') + '</li>');
    ospite(host).appendChild(ul);
    return ul;
  };

  /* =========================================================
     Matrice: griglia righe × colonne (es. fornitore × mese)
     opz: { angolo, colonne: [testo], righe: [{ titolo, sotto, celle: [{ stato (html), valore, href, azione: { etichetta, onClick }, vuota }] }] }
     ========================================================= */
  CRM.Matrice = function (host, opz) {
    const g = el('div', 'matrice');
    g.style.gridTemplateColumns = 'minmax(170px, 1.2fr) repeat(' + opz.colonne.length + ', minmax(120px, 1fr))';
    g.innerHTML = '<div class="m-intest">' + esc(opz.angolo || '') + '</div>' + opz.colonne.map(c => '<div class="m-intest">' + esc(c) + '</div>').join('') +
      opz.righe.map((r, ri) => '<div class="m-riga"><b>' + esc(r.titolo) + '</b>' + (r.sotto ? '<span>' + esc(r.sotto) + '</span>' : '') + '</div>' +
        r.celle.map((c, ci) => {
          if (c.vuota) return '<div class="m-cella vuota">' + esc(c.vuota) + '</div>';
          const dentro = (c.stato || '') + (c.valore != null ? '<span class="m-valore">' + c.valore + '</span>' : '') +
            (c.azione ? '<button type="button" class="btn testo piccolo" data-az="' + ri + '-' + ci + '">' + esc(c.azione.etichetta) + '</button>' : '');
          return c.href ? '<a class="m-cella" href="' + c.href + '">' + dentro + '</a>' : '<div class="m-cella">' + dentro + '</div>';
        }).join('')).join('');
    $$('[data-az]', g).forEach(b => { const [ri, ci] = b.dataset.az.split('-').map(Number); b.addEventListener('click', opz.righe[ri].celle[ci].azione.onClick); });
    ospite(host).appendChild(g);
    return g;
  };

  /* =========================================================
     ListaDaFare: attività in ordine di urgenza
     voci: [{ tipo: 'errore'|'attesa'|'primario', titolo, dettaglio, href, azione }], vuoto: { titolo, testo }
     ========================================================= */
  CRM.ListaDaFare = function (host, voci, vuoto) {
    const ul = el('ul', 'da-fare');
    ul.innerHTML = voci.length ? voci.map(x => '<li class="t-' + x.tipo + '"><span class="segno" aria-hidden="true"></span><div><b>' + esc(x.titolo) + '</b><span>' + esc(x.dettaglio) + '</span></div>' +
      '<a class="btn sec piccolo" href="' + x.href + '">' + esc(x.azione) + '</a></li>').join('')
      : '<li class="vuoto"><b>' + esc(vuoto.titolo) + '</b>' + esc(vuoto.testo) + '</li>';
    ospite(host).appendChild(ul);
    return ul;
  };

  /* =========================================================
     ElencoSelezionabile: elenco a sinistra di una vista a due pannelli
     voci: [{ id, href, titolo, valore, sotto, stato (html) }], selezionata
     ========================================================= */
  CRM.ElencoSelezionabile = function (host, voci, selezionata) {
    const ul = el('ul', 'selezionabile', voci.map(v => '<li><a href="' + v.href + '"' + (v.id === selezionata ? ' class="attivo" aria-current="true"' : '') + '>' +
      '<span class="r1"><span>' + esc(v.titolo) + '</span><span>' + esc(v.valore || '') + '</span></span><span class="r2">' + esc(v.sotto || '') + '</span>' + (v.stato ? '<span class="r3">' + v.stato + '</span>' : '') + '</a></li>').join(''));
    ospite(host).appendChild(ul);
    return ul;
  };

  /* =========================================================
     Scelte: opzioni alternative, ognuna con motivi e un'azione (es. pratiche candidate)
     voci: [{ titolo, sottotitolo (html), punti: [html], azione: { etichetta, onClick }, consigliata }]
     ========================================================= */
  CRM.Scelte = function (host, voci, vuoto) {
    const box = el('div', 'scelte');
    if (!voci.length) box.innerHTML = '<p class="testo-tenue">' + esc(vuoto || 'Nessuna opzione disponibile.') + '</p>';
    voci.forEach(v => {
      const s = el('div', 'scelta' + (v.consigliata ? ' consigliata' : ''));
      s.innerHTML = '<div><h3>' + esc(v.titolo) + '</h3>' + (v.sottotitolo ? '<div class="scelta-sotto">' + v.sottotitolo + '</div>' : '') +
        '<ul>' + v.punti.map(p => '<li>' + p + '</li>').join('') + '</ul></div>' +
        '<button type="button" class="btn' + (v.consigliata ? '' : ' sec') + '">' + esc(v.azione.etichetta) + '</button>';
      $('button', s).addEventListener('click', v.azione.onClick);
      box.appendChild(s);
    });
    ospite(host).appendChild(box);
    return box;
  };

  /* =========================================================
     Binario: fasi documentali di una pratica
     tappe: [{ titolo, fatta, ritardo, numero, data, importo, delta, testo (se non fatta), assente (fase facoltativa) }]
     ========================================================= */
  CRM.Binario = function (host, tappe) {
    const b = el('div', 'binario');
    b.style.setProperty('--n', tappe.length);
    b.innerHTML = tappe.map(t => {
      if (!t.fatta) return '<div class="tappa' + (t.ritardo ? ' ritardo' : '') + (t.assente ? ' assente' : '') + '"><span class="nodo"></span><h3>' + esc(t.titolo) + '</h3><div class="' + (t.ritardo ? 'negativo' : 'testo-tenue') + '">' + esc(t.testo || '') + '</div></div>';
      return '<div class="tappa fatta"><span class="nodo">' + CRM.icona('spunta') + '</span><h3>' + esc(t.titolo) + '</h3><div class="num">' + esc(t.numero) + '</div>' +
        '<div class="testo-tenue piccolo">' + M.data(t.data) + '</div><div class="imp ' + CRM.classeSegno(Math.min(0, t.importo)) + '">' + M.euro(t.importo) + '</div>' +
        (t.delta && Math.abs(t.delta) >= 0.01 ? '<span class="delta">' + CRM.euroSegno(t.delta) + ' rispetto alla fase prima</span>' : '') + '</div>';
    }).join('');
    ospite(host).appendChild(b);
    return b;
  };

  /* =========================================================
     Cerniera: confronto riga per riga fra due parti, la differenza sulla cucitura
     opz: { sinistra, destra (titoli), totali: { sinistra, destra, differenza },
            gruppi: [{ titolo, variante, chiuso, righe: [{ titolo (html), dettagli (html), sinistra: { importo, dett } | null,
                       destra: { importo, dett } | null, differenza, quadra, azioni: [{ etichetta, variante, onClick, href }], esito (html) }] }] }
     → { riepilogo, lista }
     ========================================================= */
  CRM.Cerniera = function (host, opz) {
    const rie = el('section', 'cerniera-riepilogo');
    rie.innerHTML = '<div class="lato"><span>' + esc(opz.sinistra) + '</span><b>' + M.euro(opz.totali.sinistra) + '</b></div>' +
      '<div class="cucitura"><span>Differenza</span><b class="' + CRM.classeSegno(opz.totali.differenza) + '">' + (Math.abs(opz.totali.differenza) < 0.01 ? 'Quadra' : CRM.euroSegno(opz.totali.differenza)) + '</b></div>' +
      '<div class="lato destro"><span>' + esc(opz.destra) + '</span><b>' + M.euro(opz.totali.destra) + '</b></div>';
    ospite(host).appendChild(rie);
    const lista = el('section', 'cerniera');
    const lato = x => x ? '<span class="cifra">' + M.euro(x.importo) + '</span><span class="dett">' + esc(x.dett || '') + '</span>' : '<span class="dett">non presente</span>';
    const azioni = [];
    const riga = r => '<div class="c-riga' + (r.esito ? ' decisa' : '') + '"><div>' + r.titolo + (r.dettagli ? '<span class="sec-riga">' + r.dettagli + '</span>' : '') + '</div>' +
      '<div class="c-sx">' + lato(r.sinistra) + '</div><div class="c-cucitura">' + (r.quadra ? CRM.stato('ok', 'Quadra') : '<span class="diff ' + CRM.classeSegno(r.differenza) + '">' + CRM.euroSegno(r.differenza) + '</span>') + '</div>' +
      '<div class="c-dx">' + lato(r.destra) + '</div><div class="c-azioni">' + (r.esito || '') + (r.azioni || []).map(a => {
        azioni.push(a);
        return a.href ? '<a class="btn piccolo ' + (a.variante || '') + '" href="' + a.href + '">' + esc(a.etichetta) + '</a>' : '<button type="button" class="btn piccolo ' + (a.variante || '') + '" data-a="' + (azioni.length - 1) + '">' + esc(a.etichetta) + '</button>';
      }).join('') + '</div></div>';
    lista.innerHTML = '<div class="c-intest"><div>Documento</div><div class="c-sx">' + esc(opz.sinistra) + '</div><div class="c-cucitura">Differenza</div><div class="c-dx">' + esc(opz.destra) + '</div><div></div></div>' +
      opz.gruppi.filter(g => g.righe.length).map(g => {
        const testa = '<span class="c-gruppo-testo">' + CRM.stato(g.variante, String(g.righe.length)) + ' ' + esc(g.titolo) + '</span>';
        return g.chiuso !== undefined
          ? '<details' + (g.chiuso ? '' : ' open') + '><summary class="c-gruppo">' + testa + '</summary>' + g.righe.map(riga).join('') + '</details>'
          : '<div class="c-gruppo">' + testa + '</div>' + g.righe.map(riga).join('');
      }).join('');
    $$('[data-a]', lista).forEach(b => b.addEventListener('click', azioni[Number(b.dataset.a)].onClick));
    ospite(host).appendChild(lista);
    return { riepilogo: rie, lista: lista };
  };

  /* =========================================================
     Periodi: striscia di periodi (trimestri) con stato e avanzamento
     voci: [{ href, titolo, sotto, stato, attivo, futuro, avanzamento (0–100) }]
     ========================================================= */
  CRM.Periodi = function (host, voci, etichetta) {
    const nav = el('nav', 'periodi');
    nav.setAttribute('aria-label', etichetta || 'Periodi');
    nav.style.setProperty('--n', voci.length);
    nav.innerHTML = voci.map(v => '<a href="' + v.href + '" class="' + (v.attivo ? 'attivo' : '') + (v.futuro ? ' futuro' : '') + '"' + (v.attivo ? ' aria-current="page"' : '') + '>' +
      '<b>' + esc(v.titolo) + '</b><span>' + esc(v.sotto) + '</span><span>' + esc(v.stato) + '</span>' +
      (v.avanzamento != null ? '<span class="avanzamento" aria-hidden="true"><i style="width:' + v.avanzamento + '%"></i></span>' : '') + '</a>').join('');
    ospite(host).appendChild(nav);
    return nav;
  };

  /* =========================================================
     Caricamento: area dove trascinare i file o sceglierli
     opz: { titolo, testo, accetta ('.pdf,.xlsx'), onFile(files) }
     scegliFile({ accetta, onFile }) apre la scelta dei file da un pulsante qualsiasi
     ========================================================= */
  CRM.Caricamento = function (host, opz) {
    const z = el('label', 'caricamento');
    z.innerHTML = CRM.icona('carica') + '<b>' + esc(opz.titolo || 'Trascina qui i file') + '</b><span>' + (opz.testo || '') + '</span>' +
      '<span class="btn sec piccolo">Scegli i file</span><input type="file" multiple accept="' + esc(opz.accetta || '') + '">';
    const inp = $('input', z);
    inp.addEventListener('change', () => { if (inp.files.length) opz.onFile(Array.from(inp.files)); inp.value = ''; });
    z.addEventListener('dragover', e => { e.preventDefault(); z.classList.add('sopra'); });
    z.addEventListener('dragleave', () => z.classList.remove('sopra'));
    z.addEventListener('drop', e => { e.preventDefault(); z.classList.remove('sopra'); if (e.dataTransfer.files.length) opz.onFile(Array.from(e.dataTransfer.files)); });
    ospite(host).appendChild(z);
    return z;
  };
  CRM.scegliFile = function (opz) {
    const inp = el('input'); inp.type = 'file'; inp.multiple = true; if (opz.accetta) inp.accept = opz.accetta;
    inp.addEventListener('change', () => { if (inp.files.length) opz.onFile(Array.from(inp.files)); });
    inp.click();
  };
  /* Aggancio impostato dalle viste: cosa fare con i file caricati dalla barra. */
  CRM.alCaricamento = null;

  /* =========================================================
     Barra laterale: navigazione per cadenza di lavoro
     ========================================================= */
  const VOCI = [
    { gruppo: 'Ogni giorno', voci: [
      { id: 'oggi', href: '#/', t: 'Oggi', icona: 'oggi' },
      { id: 'documenti', href: '#/documenti', t: 'Documenti', icona: 'arrivo' },
      { id: 'pratiche', href: '#/pratiche', t: 'Pratiche', icona: 'pratiche' }] },
    { gruppo: 'Ogni mese', voci: [{ id: 'bollettini', href: '#/bollettini', t: 'Bollettini', icona: 'bollettini' }] },
    { gruppo: 'Ogni trimestre', voci: [{ id: 'liquidazioni', href: '#/liquidazioni', t: 'Liquidazioni', icona: 'liquidazioni' }] },
    { gruppo: 'Anagrafiche', voci: [
      { id: 'fornitori', href: '#/fornitori', t: 'Fornitori', icona: 'fornitori' },
      { id: 'subagenti', href: '#/subagenti', t: 'Subagenti', icona: 'subagenti' },
      { id: 'abbinamenti', href: '#/abbinamenti', t: 'Clienti e abbinamenti', icona: 'abbinamenti' }] },
    { gruppo: 'Prototipo', voci: [{ id: 'componenti', href: '#/componenti', t: 'Componenti', icona: 'componenti' }] }
  ];
  CRM.Barra = function (attiva) {
    const fare = M.daFare();
    const conta = {
      oggi: { n: fare.length },
      documenti: { n: M.S.in_arrivo.length, urgente: M.S.in_arrivo.length > 0 },
      // la voce si chiama "Documenti": qui si caricano e si abbinano
      pratiche: { n: M.S.pratiche.filter(p => M.statoPratica(p).chiave === 'scaduta').length, urgente: true },
      bollettini: { n: fare.filter(x => x.tipo === 'bollettino' || x.tipo === 'mancante').length }
    };
    const b = $('#barra');
    b.innerHTML = '<div class="marchio"><img src="assets/logo-decobrands.png" alt="Decobrands"><span>Pratiche e provvigioni</span></div>' +
      '<button type="button" class="carica-barra" id="carica-barra">' + CRM.icona('carica') + 'Carica documenti</button>' +
      VOCI.map(g => '<nav class="gruppo" aria-label="' + g.gruppo + '"><div class="gruppo-nome">' + g.gruppo + '</div>' + g.voci.map(v => {
        const k = conta[v.id];
        return '<a class="voce' + (v.id === attiva ? ' attiva' : '') + '" href="' + v.href + '"' + (v.id === attiva ? ' aria-current="page"' : '') + '>' + CRM.icona(v.icona) + '<span>' + v.t + '</span>' +
          (k && k.n ? '<span class="conta' + (k.urgente ? ' urgente' : '') + '">' + k.n + '</span>' : '') + '</a>';
      }).join('') + '</nav>').join('') +
      '<div class="barra-piede">Data simulata: ' + M.dataLunga(M.oggi()) + '<br><button type="button" id="ripristina">Ripristina i dati di prova</button></div>';
    $('#carica-barra').addEventListener('click', () => CRM.scegliFile({ accetta: '.pdf,.xlsx,.xls,.csv', onFile: f => CRM.alCaricamento && CRM.alCaricamento(f) }));
    $('#ripristina').addEventListener('click', async () => {
      if (!(await CRM.Conferma('Ripristinare i dati di prova?', 'Le modifiche fatte in questa demo andranno perse.', 'Ripristina', true))) return;
      M.ripristina(); CRM.Avviso('Dati di prova ripristinati'); CRM.naviga();
    });
  };

  /* ---------- Download di un file ---------- */
  CRM.scarica = function (nome, contenuto, tipo) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([contenuto], { type: tipo || 'text/csv;charset=utf-8' }));
    a.download = nome; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  /* ---------- Rotte (#/percorso) ---------- */
  const ROTTE = [];
  CRM.rotta = (re, fn) => ROTTE.push({ re: re, fn: fn });
  CRM.naviga = function () {
    const h = (location.hash || '#/').slice(1);
    for (const r of ROTTE) { const m = h.match(r.re); if (m) { r.fn.apply(null, m.slice(1)); return; } }
    location.hash = '#/';
  };
  window.addEventListener('hashchange', CRM.naviga);
})();
