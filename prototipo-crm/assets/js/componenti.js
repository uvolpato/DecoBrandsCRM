/* ============================================================
   DecoBrands CRM — Prototipo — componenti.js
   Libreria di componenti standard: ogni schermata è una
   composizione di questi oggetti, configurati con parametri.
   Gli stessi componenti, con gli stessi parametri, si riportano
   1:1 in React nell'applicazione (spec §16.4).

   Componenti:
     CRM.Intestazione   titolo pagina, briciole, azioni
     CRM.DataTable      tabella standard (modello DataTable di Luis B2B)
     CRM.FilterBar      barra filtri (select, multiselezione, ricerca, numero)
     CRM.KpiRow         riga di riquadri numerici
     CRM.Riepilogo      riga di schede riepilogo (dettaglio pratica)
     CRM.Tabs           schede
     CRM.Pannello       card con testata e corpo
     CRM.Form           modulo da configurazione campi
     CRM.FormModal      finestra modale con modulo
     CRM.Stepper        passi di stato
     CRM.Nota           nota informativa
     CRM.badgeStato     badge di stato (html)

   Regola di layout: la pagina è alta quanto lo schermo; l'elemento
   marcato "riempi" prende tutto lo spazio rimasto. Le DataTable
   riempiono sempre il loro contenitore: intestazione fissa, righe
   scorrevoli, riga totali fissa in fondo.
   ============================================================ */

(function () {
  'use strict';

  const CRM = window.CRM = {};

  /* ---------- Utilità ---------- */
  const esc = CRM.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  CRM.el = el;
  function ospite(h) { return typeof h === 'string' ? document.querySelector(h) : h; }
  function valoreDi(fn, row, def) { return typeof fn === 'function' ? fn(row) : (fn === undefined ? def : fn); }

  /** Crea un contenitore figlio. opz.riempi: prende lo spazio rimasto. opz.griglia: n colonne. */
  CRM.blocco = function (parent, opz) {
    opz = opz || {};
    const cls = ['crm-blocco'];
    if (opz.riempi) cls.push('crm-riempi');
    if (opz.griglia) cls.push('crm-griglia', 'crm-griglia-' + opz.griglia);
    if (opz.classe) cls.push(opz.classe);
    const b = el('div', cls.join(' '));
    ospite(parent).appendChild(b);
    return b;
  };

  /* ---------- Formati di colonna (tipo) ---------- */
  const TIPI = {
    testo:  { align: 'left',   fmt: v => v == null || v === '' ? '—' : esc(v), sort: v => String(v == null ? '' : v).toLowerCase() },
    numero: { align: 'right',  fmt: v => fmtNum(v, 0),  sort: v => Number(v || 0) },
    numero2:{ align: 'right',  fmt: v => fmtNum(v, 2),  sort: v => Number(v || 0) },
    euro:   { align: 'right',  fmt: v => fmtEuro(v),    sort: v => Number(v || 0) },
    pct:    { align: 'right',  fmt: v => fmtNum(v, 2) + '%', sort: v => Number(v || 0) },
    data:   { align: 'left',   fmt: v => fmtData(v),    sort: v => v || '' },
    stato:  { align: 'left',   fmt: v => CRM.badgeStato(v), sort: v => String(v || '') },
    conteggio: { align: 'center', fmt: v => '<span class="badge bg-secondary">' + Number(v || 0) + '</span>', sort: v => Number(v || 0) }
  };
  CRM.TIPI = TIPI;

  /* ---------- Badge di stato ---------- */
  CRM.badgeStato = function (stato, etichetta) {
    if (!stato) return '';
    const testo = etichetta || String(stato).replace(/_/g, ' ');
    return '<span class="badge badge-stato badge-' + esc(stato) + '">' + esc(testo) + '</span>';
  };

  /** Badge attivo/inattivo delle anagrafiche. */
  CRM.badgeAttivo = function (attivo) {
    return attivo ? '<span class="badge badge-attivo">Attivo</span>' : '<span class="badge badge-inattivo">Inattivo</span>';
  };

  /* =========================================================
     Intestazione pagina
     opz: { titolo, icona, sottotitolo, badge (html), briciole:[{etichetta, href}],
            azioni:[{etichetta, icona, variante, onClick, href, id, piccolo}] }
     ========================================================= */
  CRM.Intestazione = function (host, opz) {
    host = ospite(host);
    const box = el('div', 'crm-intestazione');
    host.appendChild(box);
    function pulsanti(lista) {
      return (lista || []).map(function (a, i) {
        const cls = 'btn ' + (a.piccolo ? 'btn-sm ' : '') + 'btn-' + (a.variante || 'primary');
        const ico = a.icona ? '<i class="bi ' + a.icona + ' me-1"></i>' : '';
        return a.href
          ? '<a class="' + cls + '" href="' + a.href + '" data-az="' + i + '">' + ico + esc(a.etichetta) + '</a>'
          : '<button type="button" class="' + cls + '" data-az="' + i + '"' + (a.id ? ' id="' + a.id + '"' : '') + '>' + ico + esc(a.etichetta) + '</button>';
      }).join('');
    }
    function disegna() {
      const bc = opz.briciole && opz.briciole.length
        ? '<nav aria-label="breadcrumb"><ol class="breadcrumb mb-2">' + opz.briciole.map(function (b, i, a) {
            return i === a.length - 1
              ? '<li class="breadcrumb-item active">' + esc(b.etichetta) + '</li>'
              : '<li class="breadcrumb-item"><a href="' + b.href + '">' + esc(b.etichetta) + '</a></li>';
          }).join('') + '</ol></nav>'
        : '';
      box.innerHTML = bc +
        '<div class="d-flex flex-wrap justify-content-between align-items-end gap-2">' +
        '<div><h5 class="fw-bold mb-' + (opz.sottotitolo ? '1' : '0') + '">' +
        (opz.icona ? '<i class="bi ' + opz.icona + ' me-2 text-primary"></i>' : '') + (opz.titoloHtml || esc(opz.titolo || '')) +
        (opz.badge ? ' ' + opz.badge : '') + '</h5>' +
        (opz.sottotitolo ? '<p class="text-muted mb-0 nota-prototipo">' + esc(opz.sottotitolo) + '</p>' : '') + '</div>' +
        '<div class="d-flex align-items-center gap-2">' + (opz.destra || '') +
        (opz.azioni && opz.azioni.length ? '<div class="' + (opz.gruppo ? 'btn-group' : 'd-flex gap-2') + '">' + pulsanti(opz.azioni) + '</div>' : '') +
        '</div></div>';
      box.querySelectorAll('[data-az]').forEach(function (b) {
        const a = opz.azioni[Number(b.dataset.az)];
        if (a && a.onClick) b.addEventListener('click', function (e) { if (!a.href) e.preventDefault(); a.onClick(e); });
      });
    }
    disegna();
    return {
      el: box,
      aggiorna: function (nuove) { Object.assign(opz, nuove); disegna(); }
    };
  };

  /* =========================================================
     DataTable — modello DataTable di Luis B2B
     opz: {
       colonne: [{ key, header, tipo:'testo'|'numero'|'numero2'|'euro'|'pct'|'data'|'stato'|'conteggio',
                   align, width, minWidth, grow, mono, classe(row),
                   valore(row) (default row[key]), cell(row) -> html, sortable (default true),
                   sortValue(row), totale: 'somma' | fn(righe) | testo }],
       righe, rowKey(row), azioni: [{ icona, tooltip (str|fn), onClick(row), href(row), variante:'danger', hidden(row) }],
       titolo, icona, contatore (bool), linkTestata: {href, etichetta}, azioniTestata: [{etichetta, icona, variante, onClick, id, disabilitato(righe)}],
       emptyText, loading, onRowClick(row), rowHref(row), rowClass(row),
       selezionabile, onSelezione(chiavi), rigaSelezionabile(row),
       pageSize (paginazione facoltativa), ordinamentoIniziale: {key, dir},
       etichettaTotale ('Totale'), piede (html sotto la tabella), compatta (table-sm)
     }
     Ritorna: { aggiorna(righe), righe(), ordina(key, dir), selezione(), el }
     ========================================================= */
  CRM.DataTable = function (host, opz) {
    host = ospite(host);
    opz = Object.assign({ righe: [], azioni: [], emptyText: 'Nessun dato', rowKey: function (r, i) { return r.id != null ? r.id : i; } }, opz);
    function prepara(colonne) { return colonne.map(function (c) {
      const t = TIPI[c.tipo || 'testo'] || TIPI.testo;
      return Object.assign({ sortable: true }, c, {
        _align: c.align || t.align,
        _val: c.valore || function (r) { return r[c.key]; },
        _cell: c.cell || function (r) { return t.fmt((c.valore || function (x) { return x[c.key]; })(r)); },
        _sort: c.sortValue || function (r) { return t.sort((c.valore || function (x) { return x[c.key]; })(r)); }
      });
    }); }
    let cols = prepara(opz.colonne);
    let righe = opz.righe.slice();
    let sortKey = opz.ordinamentoIniziale ? opz.ordinamentoIniziale.key : null;
    let sortDir = opz.ordinamentoIniziale ? opz.ordinamentoIniziale.dir || 'asc' : 'asc';
    let pagina = 1;
    const selez = new Set();

    const card = el('div', 'dt card');
    host.appendChild(card);

    function testata() {
      if (!opz.titolo && !opz.azioniTestata && !opz.linkTestata) return '';
      const az = (opz.azioniTestata || []).map(function (a, i) {
        const dis = a.disabilitato && a.disabilitato(righe) ? ' disabled' : '';
        return '<button type="button" class="btn btn-sm btn-' + (a.variante || 'outline-primary') + '" data-azt="' + i + '"' + (a.id ? ' id="' + a.id + '"' : '') + dis + '>' +
          (a.icona ? '<i class="bi ' + a.icona + ' me-1"></i>' : '') + esc(a.etichetta) + '</button>';
      }).join('');
      const link = opz.linkTestata ? '<a href="' + opz.linkTestata.href + '" class="text-decoration-none small text-nowrap">' + esc(opz.linkTestata.etichetta || 'Vedi tutti') + ' &rarr;</a>' : '';
      return '<div class="card-header bg-white d-flex justify-content-between align-items-center gap-2 dt-testata">' +
        '<span class="fw-semibold">' + (opz.icona ? '<i class="bi ' + opz.icona + ' me-2"></i>' : '') + esc(opz.titolo || '') +
        (opz.contatore ? ' <span class="badge ' + (opz.classeContatore || 'bg-secondary-subtle text-secondary') + ' rounded-pill ms-1 dt-contatore">0</span>' : '') +
        (opz.testataExtra ? ' <span class="dt-testata-extra">' + opz.testataExtra + '</span>' : '') + '</span>' +
        '<div class="d-flex align-items-center gap-2">' + (opz.testataDestra ? '<span class="dt-testata-destra">' + opz.testataDestra + '</span>' : '') + az + link + '</div></div>';
    }

    function ordinate() {
      if (!sortKey) return righe;
      const c = cols.find(function (x) { return x.key === sortKey; });
      if (!c || !c.sortable) return righe;
      return righe.slice().sort(function (a, b) {
        const va = c._sort(a), vb = c._sort(b);
        const cmp = va < vb ? -1 : va > vb ? 1 : 0;
        return sortDir === 'desc' ? -cmp : cmp;
      });
    }

    function totaleCol(c, lista) {
      if (c.totale === undefined) return '';
      if (c.totale === 'somma') {
        const s = lista.reduce(function (acc, r) { return acc + Number(c._val(r) || 0); }, 0);
        return (TIPI[c.tipo] || TIPI.numero).fmt(s);
      }
      if (typeof c.totale === 'function') return c.totale(lista);
      return esc(c.totale);
    }

    function disegna() {
      const lista = ordinate();
      const tot = lista.length;
      const ps = opz.pageSize || 0;
      const nPag = ps ? Math.max(1, Math.ceil(tot / ps)) : 1;
      if (pagina > nPag) pagina = nPag;
      const vis = ps ? lista.slice((pagina - 1) * ps, pagina * ps) : lista;
      const haAz = opz.azioni && opz.azioni.length;
      const nCol = cols.length + (haAz ? 1 : 0) + (opz.selezionabile ? 1 : 0);

      const colg = '<colgroup>' + (opz.selezionabile ? '<col style="width:44px">' : '') +
        cols.map(function (c) {
          if (c.grow) return '<col>';
          const st = (c.width ? 'width:' + c.width + ';' : '') + (c.minWidth ? 'min-width:' + c.minWidth + ';' : '');
          return '<col' + (st ? ' style="' + st + '"' : '') + '>';
        }).join('') + (haAz ? '<col style="width:' + (opz.azioni.length * 40 + 24) + 'px">' : '') + '</colgroup>';

      const tutteSel = vis.length > 0 && vis.every(function (r, i) { return selez.has(opz.rowKey(r, i)); });
      const thead = '<thead class="table-dark"><tr>' +
        (opz.selezionabile ? '<th><input type="checkbox" class="form-check-input dt-sel-tutti"' + (tutteSel ? ' checked' : '') + '></th>' : '') +
        cols.map(function (c) {
          const att = c.key === sortKey;
          const freccia = c.sortable ? '<i class="bi ' + (att ? (sortDir === 'asc' ? 'bi-caret-up-fill' : 'bi-caret-down-fill') : 'bi-chevron-expand') + ' dt-freccia' + (att ? ' attiva' : '') + '"></i>' : '';
          return '<th class="' + (c.sortable ? 'dt-ordinabile' : '') + ' text-' + (c._align === 'right' ? 'end' : c._align === 'center' ? 'center' : 'start') + '"' +
            (c.sortable ? ' data-sort="' + esc(c.key) + '" title="Ordina per ' + esc(String(c.header).replace(/<[^>]+>/g, '')) + '"' : '') + '>' +
            c.header + freccia + '</th>';
        }).join('') + (haAz ? '<th class="text-end">Azioni</th>' : '') + '</tr></thead>';

      let tbody;
      if (!vis.length) {
        tbody = '<tbody><tr><td colspan="' + nCol + '" class="text-center text-muted py-4 dt-vuota">' + esc(opz.emptyText) + '</td></tr></tbody>';
      } else {
        tbody = '<tbody>' + vis.map(function (r, i) {
          const k = opz.rowKey(r, i);
          const cliccabile = opz.onRowClick || opz.rowHref;
          const cls = [opz.rowClass ? opz.rowClass(r) : '', cliccabile ? 'cursor-pointer' : '', selez.has(k) ? 'table-active' : ''].filter(Boolean).join(' ');
          return '<tr data-k="' + esc(k) + '"' + (cls ? ' class="' + cls + '"' : '') + '>' +
            (opz.selezionabile ? '<td class="dt-no-click"><input type="checkbox" class="form-check-input dt-sel"' + (selez.has(k) ? ' checked' : '') +
              (opz.rigaSelezionabile && !opz.rigaSelezionabile(r) ? ' disabled' : '') + '></td>' : '') +
            cols.map(function (c) {
              const ex = c.classe ? valoreDi(c.classe, r, '') : '';
              const cl = [c._align === 'right' ? 'text-end' : c._align === 'center' ? 'text-center' : '', c.mono ? 'font-monospace' : '', c.grow ? 'dt-cresce' : '', ex].filter(Boolean).join(' ');
              return '<td' + (cl ? ' class="' + cl + '"' : '') + '>' + c._cell(r) + '</td>';
            }).join('') +
            (haAz ? '<td class="text-end text-nowrap dt-no-click">' + opz.azioni.map(function (a, j) {
              if (a.hidden && a.hidden(r)) return '';
              const tip = esc(valoreDi(a.tooltip, r, ''));
              const cl = 'btn btn-sm btn-outline-' + (a.variante === 'danger' ? 'danger' : 'secondary');
              return a.href
                ? '<a class="' + cl + '" href="' + a.href(r) + '" title="' + tip + '" aria-label="' + tip + '" data-az="' + j + '"><i class="bi ' + valoreDi(a.icona, r, '') + '"></i></a>'
                : '<button type="button" class="' + cl + '" title="' + tip + '" aria-label="' + tip + '" data-az="' + j + '"><i class="bi ' + valoreDi(a.icona, r, '') + '"></i></button>';
            }).join(' ') + '</td>' : '') +
            '</tr>';
        }).join('') + '</tbody>';
      }

      const haTot = cols.some(function (c) { return c.totale !== undefined; });
      let tfoot = '';
      if (haTot) {
        /* l'etichetta occupa (colspan) tutte le colonne che precedono il primo totale */
        const primo = Math.max(1, cols.findIndex(function (c) { return c.totale !== undefined; }));
        const span = primo + (opz.selezionabile ? 1 : 0);
        tfoot = '<tfoot class="table-light"><tr><td colspan="' + span + '" class="fw-bold' + (primo > 1 ? ' text-end' : '') + '">' + esc(opz.etichettaTotale || 'Totale') + '</td>' +
          cols.slice(primo).map(function (c) {
            return '<td class="fw-bold ' + (c._align === 'right' ? 'text-end' : c._align === 'center' ? 'text-center' : '') + '">' + totaleCol(c, lista) + '</td>';
          }).join('') + (haAz ? '<td></td>' : '') + '</tr></tfoot>';
      }

      const da = tot === 0 ? 0 : (ps ? (pagina - 1) * ps + 1 : 1);
      const a = ps ? Math.min(pagina * ps, tot) : tot;
      const piede = '<div class="dt-piede">' +
        '<span>' + (ps ? da + '–' + a + ' di ' + tot : tot + (tot === 1 ? ' riga' : ' righe')) +
        (opz.selezionabile && selez.size ? ' · ' + selez.size + ' selezionate' : '') + '</span>' +
        (ps && nPag > 1 ? '<div class="dt-pager"><button type="button" class="btn btn-sm btn-outline-secondary" data-pag="-1"' + (pagina <= 1 ? ' disabled' : '') + ' aria-label="Pagina precedente"><i class="bi bi-chevron-left"></i></button>' +
          '<span>' + pagina + ' / ' + nPag + '</span>' +
          '<button type="button" class="btn btn-sm btn-outline-secondary" data-pag="1"' + (pagina >= nPag ? ' disabled' : '') + ' aria-label="Pagina successiva"><i class="bi bi-chevron-right"></i></button></div>' : '') +
        (opz.piedeDestra ? '<span>' + opz.piedeDestra + '</span>' : '') +
        '</div>';

      card.innerHTML = testata() +
        '<div class="dt-scorri' + (opz.loading ? ' dt-caricamento' : '') + '">' +
        '<table class="table table-hover align-middle mb-0' + (opz.compatta ? ' table-sm' : '') + '">' + colg + thead + tbody + tfoot + '</table></div>' +
        piede + (opz.piede ? '<div class="card-footer bg-white form-text small">' + opz.piede + '</div>' : '');

      const cnt = card.querySelector('.dt-contatore');
      if (cnt) cnt.textContent = tot;

      /* eventi */
      card.querySelectorAll('th[data-sort]').forEach(function (th) {
        th.addEventListener('click', function () {
          const k = th.dataset.sort;
          sortDir = sortKey === k && sortDir === 'asc' ? 'desc' : 'asc';
          sortKey = k;
          disegna();
        });
      });
      card.querySelectorAll('[data-azt]').forEach(function (b) {
        const a = opz.azioniTestata[Number(b.dataset.azt)];
        b.addEventListener('click', function () { a.onClick && a.onClick(); });
      });
      card.querySelectorAll('[data-pag]').forEach(function (b) {
        b.addEventListener('click', function () { pagina += Number(b.dataset.pag); disegna(); });
      });
      card.querySelectorAll('tbody tr[data-k]').forEach(function (tr, i) {
        const r = vis[i];
        tr.querySelectorAll('[data-az]').forEach(function (b) {
          const a = opz.azioni[Number(b.dataset.az)];
          b.addEventListener('click', function (e) {
            e.stopPropagation();
            if (a.onClick) { if (!a.href) e.preventDefault(); a.onClick(r); }
          });
        });
        const chk = tr.querySelector('.dt-sel');
        if (chk) chk.addEventListener('change', function () {
          const k = opz.rowKey(r, i);
          if (chk.checked) selez.add(k); else selez.delete(k);
          opz.onSelezione && opz.onSelezione(new Set(selez));
          disegna();
        });
        if (opz.onRowClick || opz.rowHref) {
          tr.addEventListener('click', function (e) {
            if (e.target.closest('.dt-no-click, a, button, input')) return;
            if (opz.onRowClick) opz.onRowClick(r);
            else location.href = opz.rowHref(r);
          });
        }
      });
      const tutti = card.querySelector('.dt-sel-tutti');
      if (tutti) {
        const alcune = vis.some(function (r, i) { return selez.has(opz.rowKey(r, i)); });
        tutti.indeterminate = alcune && !tutteSel;
        tutti.addEventListener('change', function () {
          vis.forEach(function (r, i) {
            if (opz.rigaSelezionabile && !opz.rigaSelezionabile(r)) return;
            const k = opz.rowKey(r, i);
            if (tutti.checked) selez.add(k); else selez.delete(k);
          });
          opz.onSelezione && opz.onSelezione(new Set(selez));
          disegna();
        });
      }
    }

    disegna();
    return {
      el: card,
      aggiorna: function (nuove, altro) { if (nuove) righe = nuove.slice(); if (altro) { Object.assign(opz, altro); if (altro.colonne) cols = prepara(altro.colonne); } disegna(); },
      righe: function () { return ordinate(); },
      ordina: function (k, d) { sortKey = k; sortDir = d || 'asc'; disegna(); },
      selezione: function () { return new Set(selez); },
      testata: function (altro) { Object.assign(opz, altro); disegna(); }
    };
  };

  /* =========================================================
     FilterBar
     opz: { campi: [{ nome, tipo:'select'|'multi'|'cerca'|'numero', etichetta, opzioni:[{value,label}],
                      valore, placeholder, col:'col-md-3' }],
            onChange(valori), reset (bool), card (bool, default true) }
     Ritorna: { valori(), imposta(valori) }
     ========================================================= */
  CRM.FilterBar = function (host, opz) {
    host = ospite(host);
    const iniziali = {};
    const wrap = el('div', opz.card === false ? 'crm-filtri' : 'card crm-filtri');
    host.appendChild(wrap);
    const body = el('div', opz.card === false ? 'row g-2 align-items-end' : 'card-body py-3 row g-3 align-items-end mx-0');
    wrap.appendChild(body);
    const etich = function (c) { return c.etichetta ? '<label class="form-label small text-muted text-uppercase fw-semibold mb-1" style="letter-spacing:.4px">' + esc(c.etichetta) + '</label>' : ''; };

    opz.campi.forEach(function (c) {
      const col = el('div', c.col || (c.tipo === 'cerca' ? 'col' : 'col-md-3'));
      body.appendChild(col);
      if (c.tipo === 'select') {
        iniziali[c.nome] = c.valore != null ? String(c.valore) : '';
        col.innerHTML = etich(c) + '<select class="form-select form-select-sm" data-f="' + c.nome + '">' +
          c.opzioni.map(function (o) { return '<option value="' + esc(o.value) + '">' + esc(o.label) + '</option>'; }).join('') + '</select>';
        col.querySelector('select').value = iniziali[c.nome];
      } else if (c.tipo === 'multi') {
        iniziali[c.nome] = (c.valore || c.opzioni.map(function (o) { return o.value; })).map(String);
        col.innerHTML = etich(c) + '<div class="dropdown"><button type="button" class="btn btn-sm bg-white border w-100 d-flex justify-content-between align-items-center dropdown-toggle text-start" data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-expanded="false"><span class="ms-lbl"></span></button>' +
          '<ul class="dropdown-menu p-2 w-100" style="max-height:240px;overflow-y:auto">' +
          '<li><label class="dropdown-item d-flex align-items-center gap-2 fw-semibold"><input type="checkbox" class="form-check-input mt-0 ms-tutti"> ' + esc(c.etichettaTutti || 'Tutti') + '</label></li><li><hr class="dropdown-divider my-1"></li>' +
          c.opzioni.map(function (o) { return '<li><label class="dropdown-item d-flex align-items-center gap-2"><input type="checkbox" class="form-check-input mt-0 ms-voce" value="' + esc(o.value) + '"> ' + esc(o.label) + '</label></li>'; }).join('') +
          '</ul></div>';
        col.dataset.f = c.nome;
        col.addEventListener('change', function (e) {
          const tutti = col.querySelector('.ms-tutti');
          const voci = Array.from(col.querySelectorAll('.ms-voce'));
          if (e.target === tutti) voci.forEach(function (v) { v.checked = tutti.checked; });
          etichettaMulti(c, col);
        });
      } else if (c.tipo === 'cerca') {
        iniziali[c.nome] = c.valore || '';
        col.innerHTML = etich(c) + '<div class="input-group input-group-sm"><span class="input-group-text bg-white"><i class="bi bi-search"></i></span>' +
          '<input type="search" class="form-control" data-f="' + c.nome + '" placeholder="' + esc(c.placeholder || 'Cerca...') + '"></div>';
      } else {
        iniziali[c.nome] = c.valore != null ? String(c.valore) : '';
        col.innerHTML = etich(c) + '<input type="number" class="form-control form-control-sm" data-f="' + c.nome + '" placeholder="' + esc(c.placeholder || '') + '">';
      }
    });
    if (opz.reset) {
      const col = el('div', 'col-auto');
      col.innerHTML = '<button type="button" class="btn btn-sm btn-outline-secondary"><i class="bi bi-arrow-counterclockwise me-1"></i>Reset</button>';
      col.querySelector('button').addEventListener('click', function () { imposta(iniziali); cambia(); });
      body.appendChild(col);
    }

    function etichettaMulti(c, col) {
      const voci = Array.from(col.querySelectorAll('.ms-voce'));
      const n = voci.filter(function (v) { return v.checked; }).length;
      const tutti = col.querySelector('.ms-tutti');
      tutti.checked = n === voci.length;
      tutti.indeterminate = n > 0 && n < voci.length;
      col.querySelector('.ms-lbl').textContent = n === voci.length ? (c.etichettaTutti || 'Tutti') : n === 0 ? (c.etichettaNessuno || 'Nessuno') : (c.etichettaParziale || c.etichetta) + ' (' + n + ')';
    }
    function valori() {
      const v = {};
      opz.campi.forEach(function (c) {
        if (c.tipo === 'multi') {
          v[c.nome] = Array.from(wrap.querySelectorAll('[data-f="' + c.nome + '"] .ms-voce:checked')).map(function (x) { return x.value; });
        } else {
          v[c.nome] = wrap.querySelector('[data-f="' + c.nome + '"]').value.trim();
        }
      });
      return v;
    }
    function imposta(val) {
      opz.campi.forEach(function (c) {
        if (!(c.nome in val)) return;
        if (c.tipo === 'multi') {
          const col = wrap.querySelector('[data-f="' + c.nome + '"]');
          col.querySelectorAll('.ms-voce').forEach(function (x) { x.checked = val[c.nome].indexOf(x.value) >= 0; });
          etichettaMulti(c, col);
        } else {
          wrap.querySelector('[data-f="' + c.nome + '"]').value = val[c.nome];
        }
      });
    }
    function cambia() { opz.onChange && opz.onChange(valori()); }
    imposta(iniziali);
    wrap.addEventListener('change', cambia);
    wrap.addEventListener('input', function (e) { if (e.target.type === 'search' || e.target.type === 'number') cambia(); });
    return { el: wrap, valori: valori, imposta: function (v) { imposta(v); cambia(); } };
  };

  /** Filtro testo libero su più campi (usato con FilterBar 'cerca'). */
  CRM.corrisponde = function (q, campi) {
    q = String(q || '').trim().toLowerCase();
    if (!q) return true;
    return campi.some(function (c) { return String(c == null ? '' : c).toLowerCase().indexOf(q) >= 0; });
  };

  /* =========================================================
     KpiRow
     voci: [{ id, etichetta, valore, variante:'warning'|'info'|'success'|'danger', colorato (bool), contenuto (html, riquadro libero) }]
     Ritorna: { aggiorna(id, valore, variante) , etichetta(id, testo) }
     ========================================================= */
  CRM.KpiRow = function (host, voci) {
    host = ospite(host);
    const row = el('div', 'row g-3 crm-kpi');
    host.appendChild(row);
    const n = voci.length;
    voci.forEach(function (v) {
      const col = el('div', n >= 4 ? 'col-6 col-md-3' : 'col-md-' + Math.floor(12 / n));
      if (v.contenuto) {
        col.innerHTML = '<div class="card h-100"><div class="card-body d-flex flex-column justify-content-center py-2">' + v.contenuto + '</div></div>';
      } else {
        col.innerHTML = '<div class="kpi-card" data-kpi="' + v.id + '"><div class="kpi-value"></div><div class="kpi-label"></div></div>';
      }
      row.appendChild(col);
    });
    function aggiorna(id, valore, variante) {
      const v = voci.find(function (x) { return x.id === id; });
      const card = row.querySelector('[data-kpi="' + id + '"]');
      if (!v || !card) return;
      if (valore !== undefined) v.valore = valore;
      if (variante !== undefined) v.variante = variante;
      card.className = 'kpi-card' + (v.variante ? ' kpi-' + v.variante : '');
      const val = card.querySelector('.kpi-value');
      val.className = 'kpi-value' + (v.variante && v.colorato !== false ? ' text-' + v.variante : '');
      val.textContent = v.valore == null ? '' : v.valore;
      card.querySelector('.kpi-label').innerHTML = v.etichettaHtml || esc(v.etichetta);
    }
    voci.forEach(function (v) { if (!v.contenuto) aggiorna(v.id); });
    return {
      el: row,
      aggiorna: aggiorna,
      etichetta: function (id, html) { const v = voci.find(function (x) { return x.id === id; }); v.etichettaHtml = html; aggiorna(id); }
    };
  };

  /* =========================================================
     Riepilogo (schede compatte)
     voci: [{ id, etichetta, icona, valore, variante:'warn'|'danger' }]
     ========================================================= */
  CRM.Riepilogo = function (host, voci) {
    host = ospite(host);
    const row = el('div', 'row g-3 crm-riepilogo');
    host.appendChild(row);
    voci.forEach(function (v) {
      const col = el('div', 'col-6 col-lg');
      col.innerHTML = '<div class="riep-card" data-riep="' + v.id + '"><div class="riep-label">' + (v.icona ? '<i class="bi ' + v.icona + ' me-1"></i>' : '') + esc(v.etichetta) + '</div><div class="riep-value">—</div></div>';
      row.appendChild(col);
    });
    function aggiorna(id, valore, variante) {
      const c = row.querySelector('[data-riep="' + id + '"]');
      if (!c) return;
      c.className = 'riep-card' + (variante ? ' riep-' + variante : '');
      c.querySelector('.riep-value').textContent = valore == null || valore === '' ? '—' : valore;
    }
    voci.forEach(function (v) { if (v.valore !== undefined) aggiorna(v.id, v.valore, v.variante); });
    return { el: row, aggiorna: aggiorna };
  };

  /* =========================================================
     Tabs
     schede: [{ id, etichetta, icona, badge (html) , riempi (default true) }]
     Ritorna: { pane(id), badge(id, html), mostra(id), el }
     Ogni pane è un contenitore a tutta altezza: un figlio marcato riempi prende lo spazio.
     ========================================================= */
  let nTabs = 0;
  CRM.Tabs = function (host, schede, opz) {
    host = ospite(host);
    opz = opz || {};
    const id = 'tabs' + (++nTabs);
    const box = el('div', 'crm-tabs' + (opz.riempi === false ? '' : ' crm-riempi'));
    host.appendChild(box);
    const nav = el('ul', 'nav nav-tabs tabs-crm');
    nav.setAttribute('role', 'tablist');
    const cont = el('div', 'tab-content');
    box.appendChild(nav);
    box.appendChild(cont);
    schede.forEach(function (s, i) {
      const li = el('li', 'nav-item');
      li.setAttribute('role', 'presentation');
      li.innerHTML = '<button class="nav-link' + (i === 0 ? ' active' : '') + '" id="' + id + '-nav-' + s.id + '" data-bs-toggle="tab" data-bs-target="#' + id + '-' + s.id + '" type="button" role="tab" aria-selected="' + (i === 0) + '">' +
        (s.icona ? '<i class="bi ' + s.icona + ' me-1"></i>' : '') + esc(s.etichetta) + ' <span class="crm-tab-badge">' + (s.badge || '') + '</span></button>';
      nav.appendChild(li);
      const pane = el('div', 'tab-pane fade' + (i === 0 ? ' show active' : ''));
      pane.id = id + '-' + s.id;
      pane.setAttribute('role', 'tabpanel');
      cont.appendChild(pane);
    });
    return {
      el: box,
      pane: function (sid) { return document.getElementById(id + '-' + sid); },
      badge: function (sid, html) { const b = document.querySelector('#' + id + '-nav-' + sid + ' .crm-tab-badge'); if (b) b.innerHTML = html || ''; },
      mostra: function (sid) { bootstrap.Tab.getOrCreateInstance(document.getElementById(id + '-nav-' + sid)).show(); }
    };
  };
  /** Badge contatore standard per le schede. */
  CRM.badgeConteggio = function (n, classe) {
    return '<span class="badge ' + (classe || 'bg-secondary-subtle text-secondary') + ' rounded-pill ms-1">' + n + '</span>';
  };

  /* =========================================================
     Pannello (card con testata)
     opz: { titolo, icona, extra (html accanto al titolo), destra (html), azioni:[{etichetta, icona, variante, onClick}], piede (html), riempi, corpoClasse }
     Ritorna: { corpo, el, testata(html) }
     ========================================================= */
  CRM.Pannello = function (host, opz) {
    host = ospite(host);
    const card = el('div', 'card crm-pannello' + (opz.riempi ? ' crm-riempi' : ''));
    host.appendChild(card);
    const az = (opz.azioni || []).map(function (a, i) {
      return '<button type="button" class="btn btn-sm btn-' + (a.variante || 'outline-primary') + '" data-azp="' + i + '">' + (a.icona ? '<i class="bi ' + a.icona + ' me-1"></i>' : '') + esc(a.etichetta) + '</button>';
    }).join('');
    card.innerHTML = (opz.titolo ? '<div class="card-header bg-white fw-semibold d-flex justify-content-between align-items-center gap-2">' +
      '<span>' + (opz.icona ? '<i class="bi ' + opz.icona + ' me-2"></i>' : '') + esc(opz.titolo) + (opz.extra ? ' <span class="crm-pannello-extra">' + opz.extra + '</span>' : '') + '</span>' +
      '<span class="d-flex align-items-center gap-2"><span class="crm-pannello-destra small text-muted fw-normal">' + (opz.destra || '') + '</span>' + az + '</span></div>' : '') +
      '<div class="card-body ' + (opz.corpoClasse || '') + '"></div>' +
      (opz.piede ? '<div class="card-footer bg-white form-text small">' + opz.piede + '</div>' : '');
    card.querySelectorAll('[data-azp]').forEach(function (b) {
      const a = opz.azioni[Number(b.dataset.azp)];
      b.addEventListener('click', function () { a.onClick && a.onClick(); });
    });
    return {
      el: card,
      corpo: card.querySelector('.card-body'),
      extra: function (html) { const x = card.querySelector('.crm-pannello-extra'); if (x) x.innerHTML = html; },
      destra: function (html) { const x = card.querySelector('.crm-pannello-destra'); if (x) x.innerHTML = html; }
    };
  };

  /* =========================================================
     Form
     opz: { campi: [{ nome, etichetta, tipo:'testo'|'numero'|'data'|'email'|'select'|'area'|'nascosto'|'sola-lettura',
                      opzioni:[{value,label}] | fn(), col ('col-md-6'), obbligatorio, passo, min, placeholder, aiuto, righe,
                      onChange(form), valore }],
            valori, piccolo (form-*-sm), pulsante: { etichetta, icona, variante, onClick(valori) }, pulsanteExtra (html) }
     Ritorna: { valori(), imposta(valori), campo(nome), aiuto(nome, html), el }
     ========================================================= */
  CRM.Form = function (host, opz) {
    host = ospite(host);
    const form = el('form', 'crm-form');
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    host.appendChild(form);
    const sm = opz.piccolo ? ' form-control-sm' : '';
    const ssm = opz.piccolo ? ' form-select-sm' : '';
    const row = el('div', 'row g-3');
    form.appendChild(row);
    opz.campi.forEach(function (c) {
      if (c.tipo === 'nascosto') { form.insertAdjacentHTML('afterbegin', '<input type="hidden" name="' + c.nome + '">'); return; }
      const col = el('div', c.col || 'col-12');
      const lab = c.etichetta ? '<label class="form-label">' + esc(c.etichetta) + (c.obbligatorio ? ' *' : '') + '</label>' : '';
      let ctl;
      const ph = c.placeholder ? ' placeholder="' + esc(c.placeholder) + '"' : '';
      if (c.tipo === 'select') {
        const ops = typeof c.opzioni === 'function' ? c.opzioni() : (c.opzioni || []);
        ctl = '<select class="form-select' + ssm + '" name="' + c.nome + '">' + ops.map(function (o) { return '<option value="' + esc(o.value) + '">' + esc(o.label) + '</option>'; }).join('') + '</select>';
      } else if (c.tipo === 'area') {
        ctl = '<textarea class="form-control' + sm + '" name="' + c.nome + '" rows="' + (c.righe || 2) + '"' + ph + '></textarea>';
      } else if (c.tipo === 'sola-lettura') {
        ctl = '<input type="text" class="form-control' + sm + '" name="' + c.nome + '" readonly>';
      } else {
        const t = { numero: 'number', data: 'date', email: 'email' }[c.tipo] || 'text';
        ctl = '<input type="' + t + '" class="form-control' + sm + '" name="' + c.nome + '"' + ph +
          (c.passo ? ' step="' + c.passo + '"' : '') + (c.min != null ? ' min="' + c.min + '"' : '') + '>';
      }
      col.innerHTML = lab + ctl + '<div class="form-text crm-aiuto" data-aiuto="' + c.nome + '">' + (c.aiuto || '') + '</div>';
      if (!c.aiuto) col.querySelector('.crm-aiuto').classList.add('d-none');
      row.appendChild(col);
      if (c.onChange) {
        const x = form.elements[c.nome];
        x.addEventListener('change', function () { c.onChange(api); });
        x.addEventListener('input', function () { c.onChange(api); });
      }
    });
    if (opz.pulsante) {
      const bar = el('div', 'd-flex align-items-center gap-3 mt-3');
      bar.innerHTML = '<button type="button" class="btn btn-' + (opz.pulsante.variante || 'primary') + (opz.piccolo ? ' btn-sm' : '') + '">' +
        (opz.pulsante.icona ? '<i class="bi ' + opz.pulsante.icona + ' me-1"></i>' : '') + esc(opz.pulsante.etichetta) + '</button>' +
        '<span class="form-text small crm-form-info"></span>';
      bar.querySelector('button').addEventListener('click', function () { opz.pulsante.onClick(api.valori()); });
      form.appendChild(bar);
    }
    const api = {
      el: form,
      valori: function () { return Object.fromEntries(new FormData(form)); },
      imposta: function (v) {
        Object.keys(v || {}).forEach(function (k) {
          const x = form.elements[k];
          if (x) x.value = v[k] == null ? '' : (typeof v[k] === 'boolean' ? String(v[k]) : v[k]);
        });
      },
      campo: function (n) { return form.elements[n]; },
      opzioni: function (n, ops) { form.elements[n].innerHTML = ops.map(function (o) { return '<option value="' + esc(o.value) + '">' + esc(o.label) + '</option>'; }).join(''); },
      aiuto: function (n, html) { const a = form.querySelector('[data-aiuto="' + n + '"]'); if (a) { a.innerHTML = html || ''; a.classList.toggle('d-none', !html); } },
      info: function (txt) { const i = form.querySelector('.crm-form-info'); if (i) i.textContent = txt || ''; },
      reset: function () { form.reset(); }
    };
    opz.campi.forEach(function (c) { if (c.valore !== undefined) api.imposta({ [c.nome]: c.valore }); });
    if (opz.valori) api.imposta(opz.valori);
    return api;
  };

  /* =========================================================
     FormModal
     opz: { titolo, campi (come Form), valori, dimensione:'lg'|'', conferma ('Salva'), nota (html),
            onConferma(valori, form) -> false per lasciarla aperta, onApri(form) }
     ========================================================= */
  CRM.FormModal = function (opz) {
    const m = el('div', 'modal fade');
    m.tabIndex = -1;
    m.innerHTML = '<div class="modal-dialog' + (opz.dimensione ? ' modal-' + opz.dimensione : '') + '"><div class="modal-content">' +
      '<div class="modal-header"><h5 class="modal-title">' + esc(opz.titolo) + '</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>' +
      '<div class="modal-body"></div>' +
      '<div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annulla</button>' +
      '<button type="button" class="btn btn-primary crm-ok">' + esc(opz.conferma || 'Salva') + '</button></div></div></div>';
    document.body.appendChild(m);
    const corpo = m.querySelector('.modal-body');
    const form = CRM.Form(corpo, { campi: opz.campi, valori: opz.valori });
    if (opz.nota) corpo.insertAdjacentHTML('beforeend', '<div class="form-text mt-2">' + opz.nota + '</div>');
    const modal = new bootstrap.Modal(m);
    m.querySelector('.crm-ok').addEventListener('click', function () {
      if (opz.onConferma(form.valori(), form) === false) return;
      modal.hide();
    });
    m.addEventListener('hidden.bs.modal', function () { m.remove(); });
    if (opz.onApri) opz.onApri(form);
    modal.show();
    return { form: form, chiudi: function () { modal.hide(); } };
  };

  /* =========================================================
     Stepper
     opz: { passi: [{ etichetta, stato:'done'|'active'|'', icona, title }], nota (html) }
     ========================================================= */
  CRM.Stepper = function (host, opz) {
    host = ospite(host);
    const box = el('div', 'crm-stepper');
    host.appendChild(box);
    function disegna(o) {
      box.innerHTML = '<div class="step-states">' + o.passi.map(function (p, i) {
        const ico = p.icona || (p.stato === 'done' ? 'bi-check-circle-fill' : p.stato === 'active' ? 'bi-circle-fill' : 'bi-circle');
        return (i ? '<span class="step-arrow">→</span>' : '') +
          '<span class="step' + (p.stato ? ' ' + p.stato : '') + '"' + (p.title ? ' title="' + esc(p.title) + '"' : '') + '><i class="bi ' + ico + '"></i>' + esc(p.etichetta) + '</span>';
      }).join('') + '</div>' + (o.nota ? '<div class="form-text small mt-2">' + o.nota + '</div>' : '');
    }
    disegna(opz);
    return { el: box, aggiorna: function (o) { disegna(Object.assign(opz, o)); } };
  };

  /* ---------- Nota informativa ---------- */
  CRM.Nota = function (host, html, tipo) {
    host = ospite(host);
    const n = el('div', 'alert ' + (tipo === 'avviso' ? 'alert-warning py-2 small' : 'alert-light border nota-prototipo') + ' mb-0 crm-nota',
      '<i class="bi ' + (tipo === 'avviso' ? 'bi-exclamation-triangle' : 'bi-info-circle') + ' me-1"></i>' + html);
    host.appendChild(n);
    return n;
  };

  /* ---------- Errore "non trovato" ---------- */
  CRM.Errore = function (host, testo) {
    ospite(host).appendChild(el('div', 'alert alert-danger mb-0', esc(testo)));
  };

  /* ---------- Documento allegato (chip) ---------- */
  CRM.docChip = function (nome, vuoto) {
    return nome
      ? '<span class="doc-chip"><i class="bi bi-file-earmark-pdf"></i>' + esc(nome) + '</span>'
      : '<span class="doc-chip"><i class="bi bi-paperclip"></i>' + esc(vuoto || 'Non caricato') + '</span>';
  };

  /* ---------- Opzioni per select da anagrafiche ---------- */
  CRM.opz = {
    fornitori: function (vuota) { return (vuota ? [{ value: '', label: vuota }] : []).concat(DATA.fornitori.map(function (x) { return { value: x.id, label: x.ragione_sociale }; })); },
    clienti: function (vuota, conPiva) { return (vuota ? [{ value: '', label: vuota }] : []).concat(DATA.clienti.map(function (x) { return { value: x.piva, label: x.ragione_sociale + (conPiva ? ' (' + x.piva + ')' : '') }; })); },
    agenti: function (vuota, soloAttivi) { return (vuota ? [{ value: '', label: vuota }] : []).concat(DATA.agenti.filter(function (a) { return !soloAttivi || a.attivo; }).map(function (a) { return { value: a.id, label: a.nome + ' ' + a.cognome }; })); },
    subagenti: function (vuota) { return (vuota ? [{ value: '', label: vuota }] : []).concat(DATA.subagenti.map(function (s) { return { value: s.id, label: s.nome + ' ' + s.cognome }; })); },
    mesi: function () { return MESI.map(function (m, i) { return { value: i + 1, label: m }; }); },
    attivo: [{ value: 'true', label: 'Attivo' }, { value: 'false', label: 'Inattivo' }],
    pagamento: [{ value: 'matured', label: 'Maturato (su incassi clienti)' }, { value: 'invoiced', label: 'Fatturato (sul fatturato)' }]
  };

  /** Nuovo id progressivo per una lista dimostrativa. */
  CRM.nuovoId = function (lista) { return lista.length ? Math.max.apply(null, lista.map(function (x) { return x.id; })) + 1 : 1; };

  /** Apre una pratica / un bollettino (stessa convenzione delle pagine originali). */
  CRM.apriOrdine = function (id) { sessionStorage.setItem('ordineId', id); location.href = 'ordine-fornitore-dettaglio.html?id=' + id; };
  CRM.apriBollettino = function (id) { sessionStorage.setItem('bollettinoId', id); location.href = 'bollettino-dettaglio.html?id=' + id; };
})();
