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
    filtro: '<path d="M3 5h18l-7 8.5V19l-4 2v-7.5z"/>',
    'filtro-via': '<path d="M3 5h12l-5 6.5V18l-3 2v-8.5z"/><path d="M16 12l5 5M21 12l-5 5"/>',
    analisi: '<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
    sistema: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
    impostazioni: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    cestino: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    guida: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.5V14M12 17.5v.5"/>',
    chiave: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>',
    lucchetto: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    indietro: '<path d="M15 18l-6-6 6-6"/>',
    chiudi: '<path d="M6 6l12 12M18 6L6 18"/>',
    spunta: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    scarica: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    carica: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
    piu: '<path d="M12 5v14M5 12h14"/>',
    posta: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    avviso: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17.5v.5"/>',
    carrello: '<path d="M3 4h2l2.4 11h11l2-8H6.2"/><circle cx="9" cy="19.5" r="1.5"/><circle cx="17" cy="19.5" r="1.5"/>',
    scatola: '<path d="M3 7.5l9-4.5 9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5l9 4.5 9-4.5M12 12v9"/>',
    magazzino: '<path d="M3 21V9l9-5 9 5v12"/><path d="M7 21v-8h10v8M7 17h10"/>',
    catena: '<rect x="3" y="9" width="8" height="6" rx="3"/><rect x="13" y="9" width="8" height="6" rx="3"/><path d="M9 12h6"/>'
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
    const tasto = e => { if (e.key !== 'Escape') return; const aperte = $$('.velo'); if (aperte[aperte.length - 1] === velo) chiudi(); };   // Esc chiude solo la finestra in primo piano
    document.addEventListener('keydown', tasto);
    velo.addEventListener('click', e => { if (e.target === velo) chiudi(); });
    const piede = $('.modale-piede', velo);
    (opz.azioni || [{ etichetta: 'Chiudi', variante: 'sec' }]).forEach(a => {
      const b = el('button', 'btn ' + (a.variante && a.variante !== 'primario' ? a.variante : '') + (a.consentito ? ' consentito' : ''), esc(a.etichetta));
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
     FinestraAffiancata: finestra a tutto schermo con due pannelli e divisore trascinabile
     (es. documento originale a sinistra, dati da correggere a destra)
     opz: { titolo, sottotitolo (html), sinistra(host), destra(host), piede(host) (html a sinistra del piede),
            azioni: [{ etichetta, variante, onClick(chiudi) → false per restare }], larghezza: % iniziale del pannello sinistro }
     → { chiudi, sinistra, destra, piede }
     ========================================================= */
  CRM.FinestraAffiancata = function (opz) {
    const velo = el('div', 'velo velo-pieno');
    velo.innerHTML = '<div class="affiancata" role="dialog" aria-modal="true" aria-labelledby="aff-t">' +
      '<div class="modale-testa aff-testa"><div><h2 id="aff-t">' + esc(opz.titolo) + '</h2>' + (opz.sottotitolo ? '<p>' + opz.sottotitolo + '</p>' : '') + '</div>' +
      '<button type="button" class="btn-chiudi aff-chiudi" aria-label="Chiudi" title="Chiudi (Esc)">' + CRM.icona('chiudi') + '</button></div>' +
      '<div class="aff-corpo"><div class="aff-sx"></div><div class="aff-divisore" role="separator" aria-orientation="vertical" tabindex="0" title="Trascina per allargare"></div><div class="aff-dx"></div></div>' +
      '<div class="modale-piede aff-piede"><div class="aff-piede-info"></div></div></div>';
    const sx = $('.aff-sx', velo), dx = $('.aff-dx', velo), piede = $('.aff-piede', velo), info = $('.aff-piede-info', velo);
    sx.style.flexBasis = (opz.larghezza || 46) + '%';
    const chiudi = () => { velo.remove(); document.removeEventListener('keydown', tasto); };
    const tasto = e => { if (e.key !== 'Escape') return; const aperte = $$('.velo'); if (aperte[aperte.length - 1] === velo) chiudi(); };   // Esc chiude solo la finestra in primo piano
    document.addEventListener('keydown', tasto);
    $('.aff-chiudi', velo).addEventListener('click', chiudi);
    // divisore: trascinamento con il mouse o frecce da tastiera
    const div = $('.aff-divisore', velo), corpo = $('.aff-corpo', velo);
    const imposta = pct => { sx.style.flexBasis = Math.max(20, Math.min(75, pct)) + '%'; };
    div.addEventListener('mousedown', e => {
      e.preventDefault(); div.classList.add('trascina');
      const muovi = ev => { const r = corpo.getBoundingClientRect(); imposta(100 * (ev.clientX - r.left) / r.width); };
      const fine = () => { div.classList.remove('trascina'); document.removeEventListener('mousemove', muovi); document.removeEventListener('mouseup', fine); };
      document.addEventListener('mousemove', muovi); document.addEventListener('mouseup', fine);
    });
    div.addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); imposta(parseFloat(sx.style.flexBasis) + (e.key === 'ArrowLeft' ? -4 : 4)); } });
    (opz.azioni || [{ etichetta: 'Chiudi', variante: 'sec' }]).forEach(a => {
      const b = el('button', 'btn ' + (a.variante && a.variante !== 'primario' ? a.variante : ''), esc(a.etichetta));
      b.type = 'button';
      b.addEventListener('click', () => { if (!a.onClick || a.onClick(chiudi) !== false) chiudi(); });
      piede.appendChild(b);
    });
    document.body.appendChild(velo);
    if (opz.sinistra) opz.sinistra(sx);
    if (opz.destra) opz.destra(dx);
    if (opz.piede) opz.piede(info);
    return { chiudi: chiudi, sinistra: sx, destra: dx, piede: info };
  };

  /* =========================================================
     TestoDaInviare: testo precompilato da copiare (solleciti, contestazioni)
     opz: { titolo, destinatario, testo, onCopia() }
     ========================================================= */
  CRM.TestoDaInviare = opz => CRM.Modale({
    titolo: opz.titolo, testo: 'Copia il testo e invialo a ' + esc(opz.destinatario) + '.',
    corpo: '<textarea class="testo-email" aria-label="Testo da inviare">' + esc(opz.testo) + '</textarea>',
    azioni: [{ etichetta: 'Chiudi', variante: 'sec' }, { etichetta: 'Copia il testo', onClick: (c, corpo) => {
      const t = $('textarea', corpo); t.select();
      try { navigator.clipboard.writeText(t.value).catch(() => document.execCommand('copy')); } catch (x) { document.execCommand('copy'); }
      if (opz.onCopia) opz.onCopia();
      CRM.Avviso('Testo copiato');
    } }]
  });

  /* =========================================================
     Form
     opz: { campi: [{ nome, etichetta, tipo: 'testo'|'numero'|'data'|'select'|'area'|'ricerca' (con entita), opzioni: [{ value, label }],
                      valore, aiuto, largo, passo, placeholder }], colonne: 1|2|3 }
     → { el, valori(), campo(nome), aiuto(nome, html, errore), errore(testo) }
     ========================================================= */
  function campoHtml(c) {
    const id = 'c-' + c.nome;
    let ctl;
    if (c.tipo === 'ricerca') ctl = CRM.campoRicercaHtml({ nome: c.nome, entita: c.entita, valore: c.valore, multipla: c.multipla, valori: c.valori, id: id, placeholder: c.placeholder });
    else if (c.tipo === 'select') ctl = '<select id="' + id + '" name="' + c.nome + '">' + c.opzioni.map(o => '<option value="' + esc(o.value) + '"' + (String(o.value) === String(c.valore) ? ' selected' : '') + '>' + esc(o.label) + '</option>').join('') + '</select>';
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
    CRM.attivaRicerche(f, opz.contesto);
    return {
      el: f,
      valori: () => { const v = {}; $$('[name]', f).forEach(x => { v[x.name] = x.closest('.ricerca.multipla') ? leggiScelte(x) : x.value.trim(); }); return v; },   // ricerca multipla: elenco di chiavi
      campo: n => f.elements[n],
      aiuto: (n, html, errore) => { const a = $('[data-aiuto="' + n + '"]', f); a.innerHTML = html || ''; a.hidden = !html; a.classList.toggle('errore', !!errore); },
      errore: t => { const p = $('.modulo-errore', f); p.textContent = t || ''; p.hidden = !t; }
    };
  };

  /* =========================================================
     FormModal
     opz: { titolo, testo, campi, colonne, conferma ('Salva'), pericolo, azioniExtra: [{ etichetta, variante, onClick(chiudi) }],
            contesto() (per i campi di ricerca), dopo(form) (eventi sui campi),
            onConferma(valori, form) → false per lasciarla aperta }
     ========================================================= */
  /* =========================================================
     Campi di ricerca collegati alle entità
     CRM.Entita(nome, def) registra un'entità una volta sola:
       def: { titolo, voci(ctx) → righe, chiave(r), testo(r), dettaglio(r), cerca(r) (testo su cui cercare),
              colonne: [colonne DataTable], filtri(ctx) → [campi FilterBar], filtra(r, valori) → boolean }
     CRM.campoRicercaHtml({ nome, entita, valore, id, placeholder, campo }) → html del campo
       (autocompletamento con le prime 5 voci, lente che apre la maschera, pallino verde/rosso)
     CRM.attivaRicerche(contenitore, contesto()) attiva i campi presenti (eventi delegati):
       alla scelta aggiorna il valore nascosto, emette 'change' e l'evento 'ricerca-scelta' { campo, voce }
     CRM.RicercaEntita({ entita, contesto, testo, onScelta(voce) }) → maschera di ricerca completa
     Selezione SINGOLA (predefinita) o MULTIPLA (multipla: true, D-20 §19):
       - campoRicercaHtml({ ..., multipla: true, valori: [chiavi] }): il campo chiuso mostra
         "Tutti i …" (segnaposto), il nome della sola voce scelta o "Filtro multiplo (n)" (con
         l'elenco nel suggerimento); entrando nel campo si apre il menu: in alto le voci scelte
         con ✓ (clic = toglie, "Togli tutti"), sotto le altre che corrispondono a quanto scritto
         (clic o Invio = aggiunge); il menu resta aperto e 'change' parte una volta, alla
         chiusura (Esc, Invio senza voce, Tab, clic fuori). Niente valori liberi (niente
         pallino); il valore nascosto è un elenco JSON di chiavi (D-21)
       - RicercaEntita({ ..., multipla: true, scelte: [chiavi], onScelta(voci[]) }): colonna di
         caselle, "Scegli tutte le righe filtrate", "Togli tutte", pulsante Applica (n)
       - contesto.limita: [chiavi] restringe le voci (es. solo quelle con dati nel periodo);
         contesto.tutti: anche le voci non attive (es. subagenti cessati, nelle analisi)
     CRM.CampoRicerca(host, { entita, multipla, valore | valori, contesto, placeholder, onChange(valore | valori) })
       → { el, valore() }: il campo già attivo, da usare fuori dai moduli (filtri, barre)
     ========================================================= */
  const ENTITA = CRM.ENTITA = {};
  CRM.Entita = (nome, def) => { ENTITA[nome] = def; };
  // voci dell'entità nel contesto, ristrette a contesto.limita se c'è
  const vociDi = (ent, ctx) => {
    const v = ent.voci(ctx || {});
    if (!ctx || !ctx.limita) return v;
    const k = new Set(ctx.limita.map(String));
    return v.filter(r => k.has(String(ent.chiave(r))));
  };
  const leggiScelte = h => { try { return (JSON.parse(h.value || '[]') || []).map(String); } catch (e) { return []; } };
  // voci scelte cercate senza limita: una voce scelta resta riconoscibile anche se esce dal periodo
  const vociScelte = (ent, ctx, chiavi) => {
    const tutte = ent.voci(Object.assign({}, ctx, { limita: null, tutti: true }));
    return chiavi.map(k => tutte.find(x => String(ent.chiave(x)) === k) || null).map((r, i) => r || { _k: chiavi[i] });
  };
  const testoScelta = (ent, r) => r._k != null ? r._k : ent.testo(r);
  // cosa mostra il campo chiuso: niente (segnaposto "Tutti i …"), il nome della sola voce, "Filtro multiplo (n)"
  const riassunto = (ent, ctx, chiavi) => !chiavi.length ? '' : chiavi.length === 1 ? testoScelta(ent, vociScelte(ent, ctx, chiavi)[0]) : 'Filtro multiplo (' + chiavi.length + ')';
  const trovaVoce = (ent, ctx, valore) => {
    if (valore == null || valore === '') return null;
    const v = String(valore).toLowerCase(), voci = vociDi(ent, ctx);
    return voci.find(r => String(ent.chiave(r)).toLowerCase() === v) || voci.find(r => String(ent.testo(r)).toLowerCase() === v) || null;
  };
  CRM.campoRicercaHtml = function (o) {
    const ent = ENTITA[o.entita];
    if (o.multipla) {
      const chiavi = (o.valori || []).map(String), ctx = o.contesto || {}, ria = riassunto(ent, ctx, chiavi);
      const tit = chiavi.length ? ent.titolo + ': ' + vociScelte(ent, ctx, chiavi).map(r => testoScelta(ent, r)).join(', ') : '';   // suggerimento con l'elenco completo
      return '<div class="ricerca multipla' + (chiavi.length ? ' con-scelte' : '') + (chiavi.length > 1 ? ' piu-scelte' : '') + '" data-entita="' + o.entita + '" data-multipla="1">' +
        '<input class="ricerca-testo"' + (o.id ? ' id="' + o.id + '"' : '') + ' type="text" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-label="' + esc(o.etichetta || 'Cerca ' + ent.titolo.toLowerCase()) + '" placeholder="' + esc(ria || o.placeholder || 'Scrivi per cercare') + '" data-vuoto="' + esc(o.placeholder || 'Scrivi per cercare') + '" title="' + esc(tit) + '">' +
        '<input type="hidden"' + (o.nome ? ' name="' + o.nome + '"' : '') + (o.campo ? ' data-campo="' + o.campo + '"' : '') + ' value="' + esc(JSON.stringify(chiavi)) + '" data-iniziale="' + esc(JSON.stringify(chiavi)) + '">' +
        '<button type="button" class="ricerca-lente" title="Apri la ricerca di ' + esc(ent.titolo.toLowerCase()) + ' (F4): scelta di più voci" aria-label="Apri la ricerca">' + CRM.icona('cerca') + '</button>' +
        '<ul class="ricerca-menu" role="listbox" aria-multiselectable="true" hidden></ul></div>';
    }
    const voce = trovaVoce(ent, o.contesto || {}, o.valore);  // contesto: restringe le voci (es. fornitore)
    const testo = voce ? ent.testo(voce) : (o.valore == null ? '' : o.valore);
    return '<div class="ricerca" data-entita="' + o.entita + '">' +
      '<span class="pallino ' + (voce ? 'ok' : o.valore ? 'ko' : 'vuoto') + '" title="' + (voce ? esc(ent.titolo) + ' trovato in anagrafica' : o.valore ? 'Valore non trovato in anagrafica' : '') + '"></span>' +
      '<input class="ricerca-testo"' + (o.id ? ' id="' + o.id + '"' : '') + (o.campo ? ' data-evidenzia="' + o.campo + '"' : '') + ' type="text" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" value="' + esc(testo) + '" placeholder="' + esc(o.placeholder || 'Scrivi per cercare') + '">' +
      '<input type="hidden"' + (o.nome ? ' name="' + o.nome + '"' : '') + (o.campo ? ' data-campo="' + o.campo + '"' : '') + ' value="' + esc(o.valore == null ? '' : o.valore) + '">' +
      '<button type="button" class="ricerca-lente" title="Apri la ricerca di ' + esc(ent.titolo.toLowerCase()) + ' (F4)" aria-label="Apri la ricerca">' + CRM.icona('cerca') + '</button>' +
      '<ul class="ricerca-menu" role="listbox" hidden></ul></div>';
  };
  CRM.attivaRicerche = function (cont, contesto) {
    if (!cont || cont._ricerche) return; cont._ricerche = true;
    const ctx = () => (contesto ? contesto() : {}) || {};
    const parti = box => ({ ent: ENTITA[box.dataset.entita], testo: $('.ricerca-testo', box), nascosto: $('input[type=hidden]', box), menu: $('.ricerca-menu', box), pallino: $('.pallino', box), multi: box.dataset.multipla === '1' });
    // selezione multipla (D-20, D-21): il campo chiuso mostra un riassunto; aperto, il menu ha in alto
    // le voci scelte (clic = toglie) e sotto le altre (clic = aggiunge); resta aperto per sceglierne
    // altre e il 'change' parte una volta sola, alla chiusura del menu (Esc, Tab, clic fuori)
    const scriviScelte = (box, chiavi, emetti) => {
      const p = parti(box), c = ctx();
      p.nascosto.value = JSON.stringify(chiavi);
      p.testo.placeholder = riassunto(p.ent, c, chiavi) || p.testo.dataset.vuoto;
      p.testo.title = chiavi.length ? p.ent.titolo + ': ' + vociScelte(p.ent, c, chiavi).map(r => testoScelta(p.ent, r)).join(', ') : '';
      box.classList.toggle('con-scelte', chiavi.length > 0); box.classList.toggle('piu-scelte', chiavi.length > 1);
      if (emetti) emettiSeCambiato(box);
    };
    const emettiSeCambiato = box => {
      const p = parti(box);
      if (p.nascosto.value === p.nascosto.dataset.iniziale) return;
      p.nascosto.dataset.iniziale = p.nascosto.value;
      p.nascosto.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const alterna = (box, chiave) => {
      const p = parti(box), ch = leggiScelte(p.nascosto);
      const i = ch.indexOf(chiave); if (i >= 0) ch.splice(i, 1); else ch.push(chiave);
      scriviScelte(box, ch, false); p.testo.value = ''; mostra(box); p.testo.focus();
    };
    const chiudiMulti = box => { const p = parti(box); chiudiMenu(box); p.testo.value = ''; emettiSeCambiato(box); };
    const chiudiMenu = box => { const p = parti(box); p.menu.hidden = true; p.testo.setAttribute('aria-expanded', 'false'); };
    const imposta = (box, voce, testoLibero) => {
      const p = parti(box), vecchio = p.nascosto.value;
      if (p.multi) { if (voce) alterna(box, String(p.ent.chiave(voce))); return; }
      if (voce) { p.testo.value = p.ent.testo(voce); p.nascosto.value = p.ent.chiave(voce); }
      else p.nascosto.value = testoLibero || '';
      p.pallino.className = 'pallino ' + (voce ? 'ok' : testoLibero ? 'ko' : 'vuoto');
      p.pallino.title = voce ? p.ent.titolo + ' trovato in anagrafica' : testoLibero ? 'Valore non trovato in anagrafica' : '';
      chiudiMenu(box);
      if (voce) box.dispatchEvent(new CustomEvent('ricerca-scelta', { bubbles: true, detail: { campo: p.nascosto.dataset.campo || p.nascosto.name, voce: voce } }));
      if (String(vecchio) !== String(p.nascosto.value)) p.nascosto.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const apriMaschera = box => {
      const p = parti(box);
      if (p.multi) {
        CRM.RicercaEntita({ entita: box.dataset.entita, contesto: ctx(), testo: p.testo.value, multipla: true, scelte: leggiScelte(p.nascosto),
          onScelta: voci => { p.testo.value = ''; scriviScelte(box, voci.map(v => String(p.ent.chiave(v))), true); } });
        return;
      }
      const noto = trovaVoce(p.ent, ctx(), p.nascosto.value);
      CRM.RicercaEntita({ entita: box.dataset.entita, contesto: ctx(), testo: noto ? '' : p.testo.value, onScelta: v => { imposta(box, v); p.testo.focus(); } });
    };
    const mostra = box => {
      const p = parti(box), q = p.testo.value.trim().toLowerCase();
      if (p.multi) return mostraMulti(box, p, q);
      const punteggio = r => {
        const k = String(p.ent.chiave(r)).toLowerCase(), t = String(p.ent.testo(r)).toLowerCase(), c = String(p.ent.cerca ? p.ent.cerca(r) : '').toLowerCase();
        if (!q) return 3; if (t.startsWith(q) || k.startsWith(q)) return 0; if (c.startsWith(q) || t.indexOf(q) >= 0) return 1; if (c.indexOf(q) >= 0 || k.indexOf(q) >= 0) return 2; return -1;
      };
      const trovate = vociDi(p.ent, ctx()).map(r => ({ r: r, s: punteggio(r) })).filter(x => x.s >= 0).sort((a, b) => a.s - b.s);
      const prime = trovate.slice(0, 5);
      const scelte = p.multi ? leggiScelte(p.nascosto) : [];
      const spunta = r => p.multi ? '<i class="spunta-voce" aria-hidden="true">' + (scelte.indexOf(String(p.ent.chiave(r))) >= 0 ? '✓' : '') + '</i>' : '';
      p.menu._voci = prime.map(x => x.r); p.menu._attiva = prime.length ? 0 : -1;
      p.menu.innerHTML = (prime.length ? prime.map((x, i) => '<li role="option" data-i="' + i + '"' + (i === 0 ? ' class="attiva"' : '') + (p.multi ? ' aria-checked="' + (scelte.indexOf(String(p.ent.chiave(x.r))) >= 0) + '"' : (i === 0 ? ' aria-selected="true"' : '')) + '>' + spunta(x.r) + '<b>' + esc(p.ent.testo(x.r)) + '</b><span>' + esc(p.ent.dettaglio ? p.ent.dettaglio(x.r) : '') + '</span></li>').join('')
        : '<li class="nessuna">Nessun risultato</li>') +
        '<li class="altre" data-maschera="1">' + CRM.icona('cerca') + (trovate.length > 5 ? 'Altri ' + (trovate.length - 5) + ' risultati: ' : '') + 'apri la ricerca di ' + esc(p.ent.titolo.toLowerCase()) + '</li>';
      const r = p.testo.getBoundingClientRect();   // posizione fissa: il menu non viene tagliato da tabelle e finestre che scorrono
      Object.assign(p.menu.style, { top: (r.bottom + 2) + 'px', left: r.left + 'px', width: Math.max(r.width + 40, 280) + 'px' });
      p.menu.hidden = false; p.testo.setAttribute('aria-expanded', 'true');
    };
    cont.addEventListener('focusin', ev => { if (eTesto(ev.target) && ev.target.closest('.ricerca.multipla')) mostra(ev.target.closest('.ricerca')); });
    cont.addEventListener('mousedown', ev => {   // clic sul campo già attivo: riapre il menu
      if (eTesto(ev.target) && ev.target.closest('.ricerca.multipla') && document.activeElement === ev.target) mostra(ev.target.closest('.ricerca'));
    });
    const posiziona = p => {
      const r = (p.multi ? p.testo.closest('.ricerca') : p.testo).getBoundingClientRect();
      Object.assign(p.menu.style, { top: (r.bottom + 2) + 'px', left: r.left + 'px', width: Math.max(r.width, 300) + 'px' });
      p.menu.hidden = false; p.testo.setAttribute('aria-expanded', 'true');
    };
    function mostraMulti(box, p, q) {
      const c = ctx(), scelte = leggiScelte(p.nascosto);
      const corrisponde = r => !q || [p.ent.chiave(r), p.ent.testo(r), p.ent.cerca ? p.ent.cerca(r) : ''].join(' ').toLowerCase().indexOf(q) >= 0;
      const sopra = vociScelte(p.ent, c, scelte);
      const altre = vociDi(p.ent, c).filter(r => scelte.indexOf(String(p.ent.chiave(r))) < 0 && corrisponde(r));
      const sotto = altre.slice(0, 8);
      p.menu._chiavi = sopra.map((r, i) => scelte[i]).concat(sotto.map(r => String(p.ent.chiave(r))));
      p.menu._attiva = p.menu._chiavi.length ? (sopra.length && !q ? 0 : sopra.length) : -1;
      if (p.menu._attiva >= p.menu._chiavi.length) p.menu._attiva = p.menu._chiavi.length - 1;
      let i = 0;
      const voce = (r, scelta) => { const j = i++; return '<li role="option" data-i="' + j + '" aria-selected="' + scelta + '"' + (j === p.menu._attiva ? ' class="attiva"' : '') + '>' +
        '<i class="spunta-voce" aria-hidden="true">' + (scelta ? '✓' : '') + '</i><b>' + esc(testoScelta(p.ent, r)) + '</b>' + (r._k == null && p.ent.dettaglio ? '<span>' + esc(p.ent.dettaglio(r)) + '</span>' : '') + '</li>'; };
      p.menu.innerHTML =
        (sopra.length ? '<li class="menu-titolo" role="presentation">Scelti (' + sopra.length + ')<button type="button" class="link-azzera" data-togli-tutti>Togli tutti</button></li>' + sopra.map(r => voce(r, true)).join('') : '') +
        '<li class="menu-titolo" role="presentation">' + (q ? 'Risultati' : sopra.length ? 'Aggiungi' : 'Scegli una o più voci') + '</li>' +
        (sotto.length ? sotto.map(r => voce(r, false)).join('') : '<li class="nessuna">' + (q ? 'Nessun risultato' : 'Nessun’altra voce') + '</li>') +
        '<li class="altre" data-maschera="1">' + CRM.icona('cerca') + (altre.length > 8 ? 'Altri ' + (altre.length - 8) + ' risultati: ' : '') + 'apri la ricerca di ' + esc(p.ent.titolo.toLowerCase()) + '</li>';
      posiziona(p);
    }
    const spostaVoce = (box, i) => {
      const p = parti(box), li = $$('li[data-i]', p.menu); if (!li.length) return;
      p.menu._attiva = (i + li.length) % li.length;
      li.forEach((x, j) => { x.classList.toggle('attiva', j === p.menu._attiva); x.setAttribute('aria-selected', String(j === p.menu._attiva)); });
    };
    const eTesto = t => t && t.classList && t.classList.contains('ricerca-testo');
    cont.addEventListener('input', ev => { if (eTesto(ev.target)) mostra(ev.target.closest('.ricerca')); });
    cont.addEventListener('change', ev => { if (eTesto(ev.target)) ev.stopPropagation(); }, true);   // il valore vero è quello nascosto
    cont.addEventListener('keydown', ev => {
      if (!eTesto(ev.target)) return;
      const box = ev.target.closest('.ricerca'), p = parti(box);
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') { ev.preventDefault(); if (p.menu.hidden) mostra(box); else spostaVoce(box, p.menu._attiva + (ev.key === 'ArrowDown' ? 1 : -1)); }
      else if (ev.key === 'Enter') { if (!p.menu.hidden && p.menu._attiva >= 0) { ev.preventDefault(); if (p.multi) alterna(box, p.menu._chiavi[p.menu._attiva]); else imposta(box, p.menu._voci[p.menu._attiva]); } else if (p.multi) { ev.preventDefault(); chiudiMulti(box); } }
      else if (ev.key === 'Escape') { if (!p.menu.hidden) { ev.stopPropagation(); if (p.multi) chiudiMulti(box); else chiudiMenu(box); } }
      else if (ev.key === 'F4') { ev.preventDefault(); chiudiMenu(box); apriMaschera(box); }
    });
    cont.addEventListener('mousedown', ev => {
      const li = ev.target.closest('.ricerca-menu li'); if (!li) return;
      ev.preventDefault(); const box = li.closest('.ricerca'), p = parti(box);
      if (ev.target.closest('[data-togli-tutti]')) { scriviScelte(box, [], false); mostra(box); return; }
      if (li.dataset.maschera) { chiudiMenu(box); apriMaschera(box); }
      else if (li.dataset.i != null) { if (p.multi) alterna(box, p.menu._chiavi[Number(li.dataset.i)]); else imposta(box, p.menu._voci[Number(li.dataset.i)]); }
    });
    cont.addEventListener('click', ev => {
      const b = ev.target.closest('.ricerca-lente'); if (b) apriMaschera(b.closest('.ricerca'));
    });
    cont.addEventListener('focusout', ev => {
      if (!eTesto(ev.target)) return;
      const box = ev.target.closest('.ricerca'), p = parti(box);
      setTimeout(() => {
        if (!box.isConnected) return;
        if (p.multi) { if (document.activeElement !== p.testo) chiudiMulti(box); return; }   // niente valori liberi; il 'change' parte qui
        chiudiMenu(box);
        const t = p.testo.value.trim(), noto = trovaVoce(p.ent, ctx(), p.nascosto.value);
        if (noto && p.ent.testo(noto) === t) return;          // nessun cambiamento
        imposta(box, trovaVoce(p.ent, ctx(), t), t);           // testo scritto a mano: cerca corrispondenza esatta, altrimenti valore libero
      }, 120);
    });
  };
  CRM.RicercaEntita = function (o) {
    if (o.multipla) return ricercaMultipla(o);
    const ent = ENTITA[o.entita], ctx = o.contesto || {};
    let tab, valori = {}, scelta = null;
    const filtra = () => vociDi(ent, ctx).filter(r => {
      const q = (valori.q || '').trim().toLowerCase();
      const testo = [ent.chiave(r), ent.testo(r), ent.dettaglio ? ent.dettaglio(r) : '', ent.cerca ? ent.cerca(r) : ''].join(' ').toLowerCase();
      return (!q || testo.indexOf(q) >= 0) && (!ent.filtra || ent.filtra(r, valori));
    });
    const m = CRM.Modale({
      titolo: 'Cerca ' + ent.titolo.toLowerCase(), testo: 'Filtra e fai doppio clic su una riga, oppure selezionala e premi Seleziona.',
      corpo: c => {
        c.classList.add('ricerca-corpo');
        const campi = [{ nome: 'q', tipo: 'cerca', valore: o.testo || '', placeholder: 'Cerca ' + ent.titolo.toLowerCase() }].concat(ent.filtri ? ent.filtri(ctx) : []);
        const fb = CRM.FilterBar(c, { campi: campi, onChange: v => { valori = v; tab.aggiorna(filtra()); } });
        valori = fb.valori();
        tab = CRM.DataTable(CRM.blocco(c, 'riempi'), { compatta: true, colonne: ent.colonne, righe: filtra(), rowClass: r => r === scelta ? 'selezionata' : '',
          onRowClick: r => { scelta = r; }, emptyText: 'Nessun risultato', emptyHint: 'Cambia la ricerca o i filtri.' });
        // selezione senza ridisegnare la tabella, così il doppio clic resta sulla stessa riga
        c.addEventListener('click', ev => { const tr = ev.target.closest('tbody tr[data-i]'); if (!tr) return; $$('tbody tr.selezionata', c).forEach(x => x.classList.remove('selezionata')); tr.classList.add('selezionata'); });
        c.addEventListener('dblclick', ev => { const tr = ev.target.closest('tbody tr[data-i]'); if (tr && scelta) { o.onScelta(scelta); m.chiudi(); } });
        setTimeout(() => { const i = $('.cerca input', c); if (i) { i.focus(); i.select(); } }, 0);
      },
      azioni: [{ etichetta: 'Annulla', variante: 'sec' }, { etichetta: 'Seleziona', onClick: () => { if (!scelta) { CRM.Avviso('Seleziona una riga'); return false; } o.onScelta(scelta); } }]
    });
    m.corpo.closest('.modale').classList.add('larga');
    return m;
  };

  /* Maschera di ricerca a selezione multipla: casella per riga, scelta di tutte le righe filtrate */
  function ricercaMultipla(o) {
    const ent = ENTITA[o.entita], ctx = o.contesto || {};
    const sel = new Set((o.scelte || []).map(String));
    let tab, valori = {};
    const k = r => String(ent.chiave(r));
    const filtra = () => vociDi(ent, ctx).filter(r => {
      const q = (valori.q || '').trim().toLowerCase();
      const testo = [ent.chiave(r), ent.testo(r), ent.dettaglio ? ent.dettaglio(r) : '', ent.cerca ? ent.cerca(r) : ''].join(' ').toLowerCase();
      return (!q || testo.indexOf(q) >= 0) && (!ent.filtra || ent.filtra(r, valori));
    });
    let conta, applica;
    const aggiornaConta = () => { conta.textContent = sel.size ? sel.size + (sel.size === 1 ? ' scelta' : ' scelte') : 'Nessuna scelta: vale come “tutti”'; if (applica) applica.innerHTML = 'Applica' + (sel.size ? ' (' + sel.size + ')' : ''); };
    const m = CRM.Modale({
      titolo: 'Cerca ' + ent.titolo.toLowerCase(), testo: 'Spunta una o più righe (clic sulla riga), poi premi Applica.',
      corpo: c => {
        c.classList.add('ricerca-corpo');
        const campi = [{ nome: 'q', tipo: 'cerca', valore: o.testo || '', placeholder: 'Cerca ' + ent.titolo.toLowerCase() }].concat(ent.filtri ? ent.filtri(ctx) : []);
        const fb = CRM.FilterBar(c, { campi: campi, onChange: v => { valori = v; tab.aggiorna(filtra()); } });
        valori = fb.valori();
        const barra = CRM.blocco(c, 'ricerca-scelta-barra');
        barra.innerHTML = '<span class="testo-tenue" data-conta></span><span><button type="button" class="link-azzera" data-tutte>Scegli tutte le righe filtrate</button> <button type="button" class="link-azzera" data-nessuna>Togli tutte</button></span>';
        conta = $('[data-conta]', barra);
        const colonne = [{ key: '_sel', header: '', sortable: false, cell: r => '<input type="checkbox" data-k="' + esc(k(r)) + '"' + (sel.has(k(r)) ? ' checked' : '') + ' aria-label="Scegli ' + esc(ent.testo(r)) + '">' }].concat(ent.colonne);
        tab = CRM.DataTable(CRM.blocco(c, 'riempi'), { compatta: true, colonne: colonne, righe: filtra(), rowClass: r => sel.has(k(r)) ? 'selezionata' : '',
          onRowClick: r => { if (sel.has(k(r))) sel.delete(k(r)); else sel.add(k(r)); }, emptyText: 'Nessun risultato', emptyHint: 'Cambia la ricerca o i filtri.' });
        // dopo il clic sulla riga: casella e riga allineate alla scelta, senza ridisegnare la tabella
        c.addEventListener('click', ev => {
          const tr = ev.target.closest('tbody tr[data-i]'); if (!tr) return;
          const cb = $('input[type=checkbox]', tr); if (!cb) return;
          cb.checked = sel.has(cb.dataset.k); tr.classList.toggle('selezionata', cb.checked); aggiornaConta();
        });
        $('[data-tutte]', barra).addEventListener('click', () => { filtra().forEach(r => sel.add(k(r))); tab.aggiorna(filtra()); aggiornaConta(); });
        $('[data-nessuna]', barra).addEventListener('click', () => { sel.clear(); tab.aggiorna(filtra()); aggiornaConta(); });
        aggiornaConta();
        setTimeout(() => { const i = $('.cerca input', c); if (i) { i.focus(); i.select(); } }, 0);
      },
      azioni: [{ etichetta: 'Annulla', variante: 'sec' }, { etichetta: 'Applica', onClick: () => {
        const tutte = ent.voci(Object.assign({}, ctx, { limita: null }));
        o.onScelta(Array.from(sel).map(x => tutte.find(r => k(r) === x)).filter(Boolean));
      } }]
    });
    m.corpo.closest('.modale').classList.add('larga');
    applica = $$('.modale-piede .btn', m.corpo.closest('.modale')).pop();
    aggiornaConta();
    return m;
  }
  /* =========================================================
     RiepilogoFiltri: due pulsanti a icona per le barre dei filtri (D-21 §19)
     - imbuto con il numero dei filtri attivi: apre un riquadro con il riassunto di TUTTI i
       filtri (periodo compreso), ogni voce con × per toglierla, e "Togli tutti i filtri"
     - imbuto barrato: toglie tutti i filtri (spento se non ce ne sono)
     opz: { voci: [{ etichetta, testo } | { etichetta, valori: [{ testo, togli() }] }], attivi (n), onAzzera() }
     ========================================================= */
  CRM.RiepilogoFiltri = function (host, opz) {
    const n = opz.attivi || 0;
    const box = el('div', 'riepilogo-filtri');
    box.innerHTML = '<button type="button" class="btn-icona' + (n ? ' con-conta' : '') + '" data-riepilogo aria-haspopup="dialog" aria-expanded="false" title="Riepilogo dei filtri" aria-label="Riepilogo dei filtri' + (n ? ': ' + n + ' attivi' : '') + '">' + CRM.icona('filtro') + (n ? '<span class="btn-icona-conta">' + n + '</span>' : '') + '</button>' +
      '<button type="button" class="btn-icona" data-azzera title="Togli tutti i filtri" aria-label="Togli tutti i filtri"' + (n ? '' : ' disabled') + '>' + CRM.icona('filtro-via') + '</button>' +
      '<div class="riepilogo-pop" role="dialog" aria-label="Filtri attivi" hidden></div>';
    const btn = $('[data-riepilogo]', box), pop = $('.riepilogo-pop', box);
    pop.innerHTML = '<p class="riepilogo-titolo">Filtri attivi</p><dl>' + opz.voci.map((v, i) => '<dt>' + esc(v.etichetta) + '</dt><dd>' +
      (v.valori ? (v.valori.length ? v.valori.map((x, j) => '<span class="scelta">' + esc(x.testo) + '<button type="button" class="scelta-togli" data-v="' + i + '" data-j="' + j + '" aria-label="Togli ' + esc(x.testo) + '" title="Togli">' + CRM.icona('chiudi') + '</button></span>').join('') : '<span class="testo-tenue">tutti</span>')
        : esc(v.testo)) + '</dd>').join('') + '</dl>' +
      (n ? '<button type="button" class="link-azzera" data-azzera-pop>Togli tutti i filtri</button>' : '<p class="testo-tenue">Nessun filtro su fornitori, subagenti e clienti.</p>');
    const fuori = ev => { if (!box.contains(ev.target)) chiudi(); };
    const tasto = ev => { if (ev.key === 'Escape') { chiudi(); btn.focus(); } };
    function chiudi() { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); document.removeEventListener('click', fuori); document.removeEventListener('keydown', tasto); }
    btn.addEventListener('click', () => {
      if (!pop.hidden) { chiudi(); return; }
      pop.hidden = false; btn.setAttribute('aria-expanded', 'true');
      setTimeout(() => document.addEventListener('click', fuori)); document.addEventListener('keydown', tasto);
    });
    pop.addEventListener('click', ev => {
      const t = ev.target.closest('.scelta-togli'); if (t) { chiudi(); opz.voci[Number(t.dataset.v)].valori[Number(t.dataset.j)].togli(); return; }
      if (ev.target.closest('[data-azzera-pop]')) { chiudi(); opz.onAzzera(); }
    });
    $('[data-azzera]', box).addEventListener('click', () => opz.onAzzera());
    ospite(host).appendChild(box);
    return { el: box };
  };

  /* Campo di ricerca già attivo, da usare fuori dai moduli (filtri delle pagine) */
  CRM.CampoRicerca = function (host, o) {
    const w = el('div', 'campo-ricerca');
    w.innerHTML = CRM.campoRicercaHtml(o);
    ospite(host).appendChild(w);
    CRM.attivaRicerche(w, () => o.contesto || {});
    const h = $('input[type=hidden]', w);
    const valore = () => o.multipla ? leggiScelte(h) : h.value;
    h.addEventListener('change', () => { if (o.onChange) o.onChange(valore()); });
    return { el: w, valore: valore };
  };

  CRM.FormModal = function (opz) {
    let form;
    return CRM.Modale({
      titolo: opz.titolo, testo: opz.testo,
      corpo: c => { form = CRM.Form(c, { campi: opz.campi, colonne: opz.colonne, contesto: () => Object.assign({}, form ? form.valori() : {}, opz.contesto ? opz.contesto() : {}) }); if (opz.dopo) opz.dopo(form); },
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
    const ind = CRM.indietro();
    h.innerHTML = '<div>' +
      (ind ? '<button type="button" class="torna" title="Torna alla schermata precedente, con filtri e posizione (Alt + ←)">' + CRM.icona('indietro') + 'Torna a ' + esc(ind.titolo) + '</button>' : '') +
      (opz.briciole ? '<nav class="percorso" aria-label="Percorso">' + opz.briciole.map(x => x.href ? '<a href="' + x.href + '">' + esc(x.etichetta) + '</a>' : '<span>' + esc(x.etichetta) + '</span>').join(' › ') + '</nav>' : '') +
      '<h1>' + (opz.titoloHtml || esc(opz.titolo)) + (opz.badge ? ' <span class="testa-badge">' + opz.badge + '</span>' : '') + '</h1>' +
      (opz.sottotitolo ? '<div class="sotto">' + opz.sottotitolo + '</div>' : '') + '</div><div class="testa-azioni"></div>';
    if (ind) $('.torna', h).addEventListener('click', ind.vai);
    const az = $('.testa-azioni', h);
    (opz.azioni || []).forEach(a => {
      const b = el(a.href ? 'a' : 'button', 'btn ' + (a.variante && a.variante !== 'primario' ? a.variante : '') + (a.consentito ? ' consentito' : ''), (a.icona ? CRM.icona(a.icona) : '') + esc(a.etichetta));
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
    // aiuto contestuale: ogni pagina con una voce di guida ha il collegamento "Guida" in testata
    if (opz.voce && CRM.GUIDA && CRM.GUIDA.some(g => g.id === opz.voce && (g.gruppo !== 'Vendita diretta' || CRM.AMPLIAMENTI.vendita)) && opz.voce !== 'guida')
      opz = Object.assign({}, opz, { azioni: (opz.azioni || []).concat([{ etichetta: 'Guida', icona: 'guida', variante: 'testo', href: '#/guida/' + opz.voce, consentito: true }]) });
    CRM.Intestazione(p, opz);
    const corpo = el('section', 'corpo' + (opz.pieno ? ' pieno' : ''));
    p.appendChild(corpo);
    document.title = (opz.titolo || 'Decobrands') + ' · Decobrands';
    return corpo;
  };

  /* Pagina non permessa al ruolo dell'utente: spiega perché, senza mostrare i dati. */
  CRM.permesso = function (azione, voce, titolo) {
    if (M.puo(azione)) return true;
    const corpo = CRM.Pagina({ voce: voce, titolo: titolo });
    CRM.Pannello(corpo, {}).corpo.innerHTML = '<div class="vuoto"><b>Pagina riservata</b>Con il ruolo ' + esc(M.RUOLI[M.utente().ruolo].nome.toLowerCase()) + ' non puoi aprire questa pagina. Chiedi a un amministratore.</div>';
    return false;
  };

  /* =========================================================
     Pannello
     opz: { titolo, nota (html a destra), azioni: [{ etichetta, icona, variante, onClick, href, conta, contaVariante: 'attesa'|'errore', contaTitolo }], riempi, senzaMargine }
     → { el, corpo, nota(html) }
     ========================================================= */
  CRM.Pannello = function (host, opz) {
    const p = el('section', 'pannello' + (opz.riempi ? ' riempi' : ''));
    p.innerHTML = (opz.titolo ? '<div class="pannello-testa"><h2>' + esc(opz.titolo) + '</h2><div class="pannello-destra"><span class="pannello-nota">' + (opz.nota || '') + '</span></div></div>' : '') +
      '<div class="pannello-corpo' + (opz.senzaMargine ? ' senza-margine' : '') + '"></div>';
    (opz.azioni || []).forEach(a => {
      const b = el(a.href ? 'a' : 'button', 'btn piccolo ' + (a.variante || 'sec') + (a.consentito ? ' consentito' : ''), (a.icona ? CRM.icona(a.icona) : '') + esc(a.etichetta) +
        (a.conta ? '<span class="btn-conta c-' + (a.contaVariante || 'attesa') + '" title="' + esc(a.contaTitolo || '') + '">' + esc(a.conta) + '</span>' : ''));
      if (a.href) b.href = a.href; else b.type = 'button';
      if (a.onClick) b.addEventListener('click', a.onClick);
      $('.pannello-destra', p).appendChild(b);
    });
    ospite(host).appendChild(p);
    return { el: p, corpo: $('.pannello-corpo', p), nota: html => { $('.pannello-nota', p).innerHTML = html; } };
  };

  /* =========================================================
     Schede: contenuti alternativi nello stesso spazio, con contatore per scheda
     opz: { schede: [{ id, etichetta, conta, contaVariante: 'attesa'|'errore'|'ok'|'neutro', disegna(corpo) }],
            attiva (id), riempi (la scheda occupa lo spazio rimasto e scorre dentro), onCambia(id),
            senzaMemoria (nelle finestre: non ricordare la scheda tornando indietro) }
     → { el, corpo, attiva() → id, vai(id), conta(id, n, variante), ridisegna() }
     Tastiera: ← → fra le schede, Home / Fine prima e ultima. La scheda si disegna solo quando si apre.
     ========================================================= */
  CRM.Schede = function (host, opz) {
    const box = el('div', 'schede' + (opz.riempi ? ' riempi' : ''));
    const uid = 'sk' + Math.random().toString(36).slice(2, 7);
    box.innerHTML = '<div class="schede-barra" role="tablist"></div><div class="schede-corpo" role="tabpanel"></div>';
    const barra = $('.schede-barra', box), corpo = $('.schede-corpo', box);
    let attiva = opz.attiva && opz.schede.some(s => s.id === opz.attiva) ? opz.attiva : opz.schede[0].id;
    // memoria della navigazione (§7.12): tornando indietro si riapre la stessa scheda
    if (!opz.senzaMemoria) { const rip = CRM.registra('schede', () => attiva); if (rip !== undefined && opz.schede.some(x => x.id === rip)) attiva = rip; }
    const contaHtml = s => s.conta == null || s.conta === '' ? '' : '<span class="schede-conta c-' + (s.contaVariante || 'neutro') + '">' + esc(s.conta) + '</span>';
    opz.schede.forEach(s => {
      const b = el('button', '', '<span>' + esc(s.etichetta) + '</span>' + contaHtml(s));
      b.type = 'button'; b.id = uid + '-' + s.id; b.dataset.id = s.id;
      b.setAttribute('role', 'tab'); b.setAttribute('aria-controls', uid + '-corpo');
      b.addEventListener('click', () => vai(s.id));
      barra.appendChild(b);
    });
    corpo.id = uid + '-corpo';
    barra.addEventListener('keydown', ev => {
      const ids = opz.schede.map(s => s.id), i = ids.indexOf(attiva);
      const n = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: ids.length - 1 }[ev.key];
      if (n == null) return;
      ev.preventDefault(); vai(ids[(n + ids.length) % ids.length]); $('#' + uid + '-' + attiva, barra).focus();
    });
    function disegna() {
      $$('[role=tab]', barra).forEach(b => { const si = b.dataset.id === attiva; b.setAttribute('aria-selected', String(si)); b.tabIndex = si ? 0 : -1; });
      corpo.setAttribute('aria-labelledby', uid + '-' + attiva);
      corpo.innerHTML = '';
      opz.schede.find(s => s.id === attiva).disegna(corpo);
    }
    function vai(id) { if (id === attiva && corpo.childNodes.length) return; attiva = id; disegna(); if (opz.onCambia) opz.onCambia(id); }
    ospite(host).appendChild(box);
    disegna();
    return {
      el: box, corpo: corpo, attiva: () => attiva, vai: vai, ridisegna: disegna,
      conta: (id, n, variante) => { const s = opz.schede.find(x => x.id === id); s.conta = n; if (variante) s.contaVariante = variante;
        const b = $('#' + uid + '-' + id, barra), v = $('.schede-conta', b); if (v) v.remove(); b.insertAdjacentHTML('beforeend', contaHtml(s)); }
    };
  };

  /* =========================================================
     PeriodoMesi: scelta di un periodo di N mesi (es. 6) con mese e anno, come il selettore di
     date del Portale Luis (pulsante "da → a" che apre un riquadro con scorciatoie a sinistra),
     ma a mesi: si sceglie il mese d'inizio e il periodo si completa da solo a N mesi restando
     dentro i mesi con dati (primo…ultimo). D-16 §19.
     opz: { da: 'aaaa-mm', mesi: 6, primo: 'aaaa-mm', ultimo: 'aaaa-mm', onChange(da, a) }
     → { el, valori() → { da, a } }
     ========================================================= */
  const MESI_BREVI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  const mk = (a, m) => a + '-' + String(m).padStart(2, '0');
  const mpiu = (k, n) => { const t = Number(k.slice(0, 4)) * 12 + Number(k.slice(5, 7)) - 1 + n; return mk(Math.floor(t / 12), t % 12 + 1); };
  const metichetta = k => MESI_BREVI[Number(k.slice(5, 7)) - 1] + ' ' + k.slice(0, 4);
  CRM.completaPeriodo = function (da, n, primo, ultimo) {
    let a = mpiu(da, n - 1);
    if (a > ultimo) { a = ultimo; da = mpiu(a, -(n - 1)); }
    if (da < primo) { da = primo; a = mpiu(da, n - 1); if (a > ultimo) a = ultimo; }
    return { da: da, a: a };
  };
  CRM.PeriodoMesi = function (host, opz) {
    const n = opz.mesi || 6;
    let cur = CRM.completaPeriodo(opz.da, n, opz.primo, opz.ultimo);
    const rip = CRM.registra('periodo', () => cur.da);
    if (rip && rip !== cur.da) { cur = CRM.completaPeriodo(rip, n, opz.primo, opz.ultimo); CRM.dopoDisegno(() => opz.onChange(cur.da, cur.a)); }
    const box = el('div', 'periodo-mesi');
    box.innerHTML = '<button type="button" class="periodo-btn" aria-haspopup="dialog" aria-expanded="false">' + CRM.icona('oggi') + '<span></span></button>' +
      '<div class="periodo-pop" role="dialog" aria-label="Scegli il periodo" hidden></div>';
    const btn = $('.periodo-btn', box), pop = $('.periodo-pop', box);
    const testo = () => { $('span', btn).textContent = metichetta(cur.da) + ' → ' + metichetta(cur.a); };
    testo();
    let anno = Number(cur.da.slice(0, 4));
    const scegli = da => { cur = CRM.completaPeriodo(da, n, opz.primo, opz.ultimo); testo(); chiudi(); opz.onChange(cur.da, cur.a); };
    // scorciatoie: ultimi N mesi, semestri interi con dati
    const scorciatoie = () => {
      const out = [{ t: 'Ultimi ' + n + ' mesi', da: mpiu(opz.ultimo, -(n - 1)) }];
      for (let y = Number(opz.ultimo.slice(0, 4)); y >= Number(opz.primo.slice(0, 4)); y--) {
        if (mk(y, 12) <= opz.ultimo && mk(y, 7) >= opz.primo) out.push({ t: '2° semestre ' + y, da: mk(y, 7) });
        if (mk(y, 6) <= opz.ultimo && mk(y, 1) >= opz.primo) out.push({ t: '1° semestre ' + y, da: mk(y, 1) });
      }
      return out.slice(0, 6);
    };
    function disegnaPop() {
      const anteprima = k => { const p = CRM.completaPeriodo(k, n, opz.primo, opz.ultimo); return p; };
      pop.innerHTML = '<div class="pm-scorciatoie">' + scorciatoie().map(x => '<button type="button" data-da="' + x.da + '"' + (x.da === cur.da ? ' class="attiva"' : '') + '>' + esc(x.t) + '</button>').join('') + '</div>' +
        '<div class="pm-griglia"><div class="pm-anno"><button type="button" data-anno="-1" aria-label="Anno precedente"' + (anno <= Number(opz.primo.slice(0, 4)) ? ' disabled' : '') + '>‹</button><b>' + anno + '</b>' +
        '<button type="button" data-anno="1" aria-label="Anno successivo"' + (anno >= Number(opz.ultimo.slice(0, 4)) ? ' disabled' : '') + '>›</button></div><div class="pm-mesi">' +
        MESI_BREVI.map((m, i) => { const k = mk(anno, i + 1), fuori = k < opz.primo || k > opz.ultimo, dentro = k >= cur.da && k <= cur.a;
          return '<button type="button" data-mese="' + k + '"' + (fuori ? ' disabled title="Nessun dato"' : '') + ' class="' + (dentro ? 'dentro' : '') + (k === cur.da || k === cur.a ? ' estremo' : '') + '">' + m + '</button>'; }).join('') +
        '</div><p class="pm-nota">Scegli il mese d’inizio: il periodo si completa da solo a ' + n + ' mesi.</p></div>';
      // anteprima al passaggio del mouse: mostra i mesi che verrebbero scelti
      $$('[data-mese]', pop).forEach(b => b.addEventListener('mouseenter', () => {
        const p = anteprima(b.dataset.mese); $('.pm-mesi', pop).classList.add('in-anteprima');
        $$('[data-mese]', pop).forEach(x => x.classList.toggle('anteprima', x.dataset.mese >= p.da && x.dataset.mese <= p.a));
      }));
      $('.pm-mesi', pop).addEventListener('mouseleave', () => { $('.pm-mesi', pop).classList.remove('in-anteprima'); $$('[data-mese]', pop).forEach(x => x.classList.remove('anteprima')); });
    }
    pop.addEventListener('click', ev => {
      const t = ev.target.closest('button'); if (!t || t.disabled) return;
      if (t.dataset.anno) { anno += Number(t.dataset.anno); disegnaPop(); return; }
      if (t.dataset.mese) scegli(t.dataset.mese);
      if (t.dataset.da) scegli(t.dataset.da);
    });
    const fuori = ev => { if (!box.contains(ev.target)) chiudi(); };
    const tasto = ev => { if (ev.key === 'Escape') { chiudi(); btn.focus(); } };
    function apri() { anno = Number(cur.da.slice(0, 4)); disegnaPop(); pop.hidden = false; btn.setAttribute('aria-expanded', 'true'); setTimeout(() => document.addEventListener('click', fuori)); document.addEventListener('keydown', tasto); }
    function chiudi() { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); document.removeEventListener('click', fuori); document.removeEventListener('keydown', tasto); }
    btn.addEventListener('click', () => { if (pop.hidden) apri(); else chiudi(); });
    ospite(host).appendChild(box);
    return { el: box, valori: () => Object.assign({}, cur) };
  };

  /* =========================================================
     Grafico: involucro di Chart.js (MIT, assets/lib/chart.umd.min.js) con lo stile del CRM:
     carattere e colori dell'app, importi in euro all'italiana, legenda in basso, niente
     animazioni vistose. D-17 §19.
     opz: { tipo: 'bar'|'line'|'doughnut', etichette: [..], serie: [{ nome, valori, colore, tipo, asse }],
            orizzontale, impilato, altezza (px), euro (true: valori in euro), titolo (aria),
            onClick(indice) (clic su una barra o fetta: usato come filtro), evidenzia (indice o elenco di indici da mettere in risalto: gli altri si schiariscono) }
     → { el, grafico, immagine() → PNG base64 su fondo bianco, per le esportazioni }
     ========================================================= */
  CRM.COLORI_GRAFICI = { primario: '#0d6efd', primarioTenue: '#9ec5fe', neutro: '#adb5bd', ok: '#198754', attesa: '#ffc107', errore: '#dc3545', testo: '#495057', griglia: '#e9ecef' };
  CRM.Grafico = function (host, opz) {
    const box = el('div', 'grafico');
    box.style.height = (opz.altezza || 240) + 'px';
    box.innerHTML = '<canvas role="img" aria-label="' + esc(opz.titolo || 'Grafico') + '"></canvas>';
    ospite(host).appendChild(box);
    if (!window.Chart) { box.innerHTML = '<p class="nota">Grafico non disponibile.</p>'; return { el: box, grafico: null }; }
    const C = CRM.COLORI_GRAFICI, euro = opz.euro !== false;
    const fmt = v => euro ? M.euro(v).replace(',00', '') : M.num(v);
    const fmtAsse = v => euro ? (Math.abs(v) >= 1000 ? M.num(Math.round(v / 100) / 10) + ' k€' : M.num(v) + ' €') : M.num(v);
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    Chart.defaults.color = C.testo;
    const tondo = opz.tipo === 'doughnut';
    // evidenzia: il punto scelto resta pieno, gli altri diventano trasparenti (filtro attivo da un clic)
    const schiarisci = c => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c + '4d' : c;
    const colore = s => {
      const c = s.colore || C.primario;
      const ev = opz.evidenzia == null ? [] : [].concat(opz.evidenzia);
      if (!ev.length || s.tipo === 'line') return c;
      return s.valori.map((v, i) => { const x = Array.isArray(c) ? c[i % c.length] : c; return ev.indexOf(i) >= 0 ? x : schiarisci(x); });
    };
    const g = new Chart($('canvas', box), {
      type: opz.tipo || 'bar',
      data: { labels: opz.etichette, datasets: opz.serie.map(s => ({
        label: s.nome, data: s.valori, type: s.tipo, yAxisID: s.asse,
        backgroundColor: colore(s), borderColor: s.tipo === 'line' ? (s.colore || C.ok) : (tondo ? '#fff' : 'transparent'),
        borderWidth: s.tipo === 'line' ? 2.5 : (tondo ? 2 : 0), borderRadius: tondo ? 0 : 4, pointRadius: s.tipo === 'line' ? 4 : 0,
        maxBarThickness: 34, order: s.tipo === 'line' ? 0 : 1 })) },
      options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 250 },
        indexAxis: opz.orizzontale ? 'y' : 'x',
        onClick: opz.onClick ? (ev, els) => { if (els.length) opz.onClick(els[0].index, els[0].datasetIndex); } : undefined,
        onHover: opz.onClick ? (ev, els) => { ev.native.target.style.cursor = els.length ? 'pointer' : 'default'; } : undefined,
        plugins: {
          legend: { display: opz.serie.length > 1 || tondo, position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, useBorderRadius: true, borderRadius: 2, padding: 14, sort: (x, y) => x.datasetIndex - y.datasetIndex } },
          tooltip: { callbacks: { label: c => ' ' + (c.dataset.label ? c.dataset.label + ': ' : '') + fmt(tondo ? c.parsed : (opz.orizzontale ? c.parsed.x : c.parsed.y)) } }
        },
        scales: tondo ? {} : {
          x: { stacked: !!opz.impilato, grid: { display: !!opz.orizzontale, color: C.griglia }, ticks: opz.orizzontale ? { callback: fmtAsse } : {} },
          y: { stacked: !!opz.impilato, grid: { display: !opz.orizzontale, color: C.griglia }, ticks: opz.orizzontale ? {} : { callback: fmtAsse }, beginAtZero: true }
        }
      }
    });
    if (opz.onClick) box.classList.add('cliccabile');
    // immagine per Excel e PDF: il canvas è trasparente, lo si copia su fondo bianco a risoluzione doppia
    const immagine = () => {
      const cv = $('canvas', box), k = document.createElement('canvas');
      k.width = cv.width; k.height = cv.height;
      const x = k.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, k.width, k.height); x.drawImage(cv, 0, 0);
      return { dati: k.toDataURL('image/png'), larghezza: cv.width, altezza: cv.height };
    };
    return { el: box, grafico: g, immagine: immagine };
  };

  /* ---------- Nota (testo informativo) ---------- */
  CRM.Nota = function (host, html) { const n = el('p', 'nota', html); ospite(host).appendChild(n); return n; };

  /* =========================================================
     DataTable — riempie lo spazio, intestazione fissa, righe scorrevoli, intestazioni ordinabili,
     totali fissi, piede con conteggio. Stessi parametri del primo prototipo.
     opz: { colonne: [{ key, header, tipo: 'testo'|'euro'|'numero'|'pct'|'data', valore(r), cell(r) → html, align: 'left'|'right'|'center',
                        grow, sortable (default true), sortValue(r), classe(r), totale: 'somma' }],
            righe, onRowClick(r), rowClass(r), emptyText, emptyHint, ordinamentoIniziale: { key, dir },
            compatta, naturale (altezza del contenuto), piede (html), etichettaTotale,
            perPagina (righe per pagina; predefinito: Impostazioni → Conservazione → righe per pagina; false = senza pagine) }
     → { el, aggiorna(righe), pagina(n) }
     Paginazione: ordinamento e totali valgono su TUTTE le righe; la pagina mostra solo una fetta
     dell'elenco già ordinato. Cambiando filtro (aggiorna) si torna alla prima pagina; cambiando
     ordinamento pure. Pagina e ordinamento si ricordano tornando indietro (§7.12).
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
    const ordR = CRM.registra('ord', () => ord);
    if (ordR !== undefined) ord = ordR;
    const conf = ((M.S.impostazioni || {}).conservazione || {}).righe_pagina;
    const perPagina = opz.perPagina === false ? 0 : Number(opz.perPagina || conf || 25);
    let pag = 0;
    const pagR = CRM.registra('pagina', () => pag);
    if (pagR !== undefined) pag = pagR;
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
      const tutte = lista;                                   // ordinate: totali e conteggio su tutte
      const pagine = perPagina ? Math.max(1, Math.ceil(tutte.length / perPagina)) : 1;
      if (pag >= pagine) pag = pagine - 1;
      if (perPagina && tutte.length > perPagina) lista = tutte.slice(pag * perPagina, (pag + 1) * perPagina);
      const tbody = '<tbody>' + (lista.length ? lista.map((r, i) =>
        '<tr data-i="' + i + '" class="' + [opz.onRowClick ? 'cliccabile' : '', opz.rowClass ? opz.rowClass(r) : ''].join(' ') + '">' +
        cols.map(c => '<td class="' + [c._al, c.grow ? 'cresce' : '', c.classe ? (typeof c.classe === 'function' ? c.classe(r) : c.classe) : ''].join(' ') + '">' + c._fmt(r) + '</td>').join('') + '</tr>').join('')
        : '<tr><td colspan="' + cols.length + '"><div class="vuoto"><b>' + esc(opz.emptyText || 'Nessun elemento') + '</b>' + esc(opz.emptyHint || '') + '</div></td></tr>') + '</tbody>';
      let tfoot = '';
      if (tutte.length && cols.some(c => c.totale)) {
        const primo = Math.max(1, cols.findIndex(c => c.totale));
        tfoot = '<tfoot><tr><td colspan="' + primo + '">' + esc(opz.etichettaTotale || 'Totale') + '</td>' +
          cols.slice(primo).map(c => '<td class="' + c._al + '">' + (c.totale ? TIPI[c.tipo || 'numero'].fmt(tutte.reduce((s, r) => s + (Number(c._val(r)) || 0), 0)) : '') + '</td>').join('') + '</tr></tfoot>';
      }
      box.innerHTML = '<div class="dt-scorri"><table>' + thead + tbody + tfoot + '</table></div>' +
        '<div class="dt-piede"><span>' + (pagine > 1 ? (pag * perPagina + 1) + '–' + (pag * perPagina + lista.length) + ' di ' : '') + tutte.length + (tutte.length === 1 ? ' elemento' : ' elementi') + '</span>' +
        (pagine > 1 ? navPagine(pagine) : '') + (opz.piede ? '<span>' + opz.piede + '</span>' : '') + '</div>';
      $$('th[data-k]', box).forEach(th => th.addEventListener('click', () => {
        const k = th.dataset.k;
        ord = { key: k, dir: ord && ord.key === k && ord.dir === 'asc' ? 'desc' : 'asc' };
        pag = 0; disegna();
      }));
      $$('.dt-pagine [data-p]', box).forEach(b => b.addEventListener('click', () => { pag = Number(b.dataset.p); disegna(); const sc = $('.dt-scorri', box); if (sc) sc.scrollTop = 0; }));
      if (opz.onRowClick) $$('tbody tr[data-i]', box).forEach(tr => tr.addEventListener('click', e => {
        if (e.target.closest('a, button')) return;
        opz.onRowClick(lista[Number(tr.dataset.i)]);
      }));
    }
    // pulsanti delle pagine: prima, precedente, numeri vicini (con … se sono molte), successiva, ultima
    function navPagine(n) {
      const num = [];
      for (let i = 0; i < n; i++) if (i === 0 || i === n - 1 || Math.abs(i - pag) <= 1) num.push(i); else if (num[num.length - 1] !== '…') num.push('…');
      const b = (p, t, tit, dis, att) => '<button type="button" data-p="' + p + '"' + (dis ? ' disabled' : '') + (att ? ' aria-current="page" class="attiva"' : '') + ' title="' + tit + '">' + t + '</button>';
      return '<nav class="dt-pagine" aria-label="Pagine">' + b(pag - 1, '‹', 'Pagina precedente', pag === 0) +
        num.map(i => i === '…' ? '<span>…</span>' : b(i, i + 1, 'Pagina ' + (i + 1), false, i === pag)).join('') + b(pag + 1, '›', 'Pagina successiva', pag === n - 1) + '</nav>';
    }
    disegna();
    return { el: box, aggiorna: nuove => { righe = nuove; pag = 0; disegna(); }, pagina: n => { pag = n; disegna(); } };
  };

  /* =========================================================
     FilterBar
     opz: { campi: [{ nome, tipo: 'segmenti'|'cerca'|'select'|'ricerca', opzioni: [{ value, label, n }], valore, placeholder, etichetta (select e ricerca) }], onChange(valori) }
     tipo 'ricerca': campo di ricerca su un'entità (entita, multipla, contesto); valore = chiave o, se multipla, elenco di chiavi
     → { el, valori() }
     ========================================================= */
  CRM.FilterBar = function (host, opz) {
    const bar = el('div', 'filtri');
    const val = {};
    const rip = CRM.registra('filtri', () => Object.assign({}, val));
    let cambiati = false;
    opz.campi.forEach(c => {
      if (c.tipo === 'ricerca') {
        val[c.nome] = c.multipla ? (c.valore || []).map(String) : (c.valore == null ? '' : String(c.valore));
        if (rip && rip[c.nome] != null && JSON.stringify(rip[c.nome]) !== JSON.stringify(val[c.nome])) { val[c.nome] = rip[c.nome]; cambiati = true; }
        const l = el('div', 'filtro-etichetta filtro-ricerca', c.etichetta ? '<span>' + esc(c.etichetta) + '</span>' : '');
        CRM.CampoRicerca(l, { entita: c.entita, multipla: c.multipla, valori: c.multipla ? val[c.nome] : null, valore: c.multipla ? null : val[c.nome],
          contesto: c.contesto, placeholder: c.placeholder, etichetta: c.etichetta, onChange: v => { val[c.nome] = v; opz.onChange(Object.assign({}, val)); } });
        bar.appendChild(l);
        return;
      }
      val[c.nome] = c.valore != null ? String(c.valore) : (c.tipo === 'segmenti' ? String(c.opzioni[0].value) : '');
      if (rip && rip[c.nome] != null && rip[c.nome] !== val[c.nome] && (c.tipo === 'cerca' || c.opzioni.some(o => String(o.value) === rip[c.nome]))) { val[c.nome] = rip[c.nome]; cambiati = true; }
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
        s.setAttribute('aria-label', c.etichetta || c.nome);
        s.addEventListener('change', () => { val[c.nome] = s.value; opz.onChange(Object.assign({}, val)); });
        // etichetta facoltativa davanti alla tendina (es. "Da", "A", "Fornitore")
        if (c.etichetta) { const l = el('label', 'filtro-etichetta', '<span>' + esc(c.etichetta) + '</span>'); l.appendChild(s); bar.appendChild(l); }
        else bar.appendChild(s);
      }
    });
    ospite(host).appendChild(bar);
    if (cambiati) CRM.dopoDisegno(() => opz.onChange(Object.assign({}, val)));
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
    if (opz.onSeleziona) {
      const sel = () => { const b = $('button.kpi[aria-pressed="true"]', row); return b ? b.dataset.id : null; };
      const rip = CRM.registra('kpi', sel);
      if (rip !== undefined && rip !== (opz.selezionata == null ? null : String(opz.selezionata)) && (rip === null || $('button.kpi[data-id="' + rip + '"]', row)))
        CRM.dopoDisegno(() => { $$('button.kpi', row).forEach(x => x.setAttribute('aria-pressed', String(x.dataset.id === rip))); opz.onSeleziona(rip); });
    }
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
  /* opz.inColonne: le coppie si dispongono affiancate (etichetta sopra, valore sotto) e vanno a capo da sole */
  CRM.Dettagli = function (host, voci, opz) {
    const col = opz && opz.inColonne;
    const dl = el('dl', 'dettagli' + (col ? ' in-colonne' : ''), voci.map(v => (col ? '<div>' : '') + '<dt>' + esc(v.etichetta) + '</dt><dd>' + v.valore + '</dd>' + (col ? '</div>' : '')).join(''));
    ospite(host).appendChild(dl);
    return dl;
  };

  /* ---------- Elenco semplice (registro, documenti) ----------
     voci: [{ testo (html), destra (html) }], vuoto */
  CRM.Elenco = function (host, voci, vuoto) {
    const ul = el('ul', 'elenco', voci.length ? voci.map((v, i) => '<li' + (v.onClick ? ' class="cliccabile" tabindex="0" role="button" data-i="' + i + '"' + (v.titolo ? ' title="' + esc(v.titolo) + '"' : '') : '') + '><span>' + v.testo + '</span>' + (v.destra != null ? '<span class="destra">' + v.destra + '</span>' : '') + '</li>').join('') : '<li class="testo-tenue">' + esc(vuoto || 'Nessun elemento') + '</li>');
    $$('li[data-i]', ul).forEach(li => { const v = voci[Number(li.dataset.i)]; li.addEventListener('click', ev => { if (!ev.target.closest('a')) v.onClick(); }); li.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); v.onClick(); } }); });
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
    ul.innerHTML = voci.length ? voci.map(x => '<li class="t-' + x.tipo + '"><span class="segno" aria-hidden="true"></span><div><b>' + esc(x.titolo) + (x.extra || '') + '</b><span>' + esc(x.dettaglio) + '</span></div>' +
      '<a class="btn sec piccolo" href="' + x.href + '">' + esc(x.azione) + '</a></li>').join('')
      : '<li class="vuoto"><b>' + esc(vuoto.titolo) + '</b>' + esc(vuoto.testo) + '</li>';
    ospite(host).appendChild(ul);
    return ul;
  };

  /* =========================================================
     GruppiDaFare: lista "Da fare" divisa in gruppi richiudibili, con azioni sul gruppo intero
     gruppi: [{ id, titolo, variante, voci: [come ListaDaFare], sommario (html), azioni: [{ etichetta, onClick, href, variante }], vuoto }]
     → { el, filtra(id | null) }   filtra: mostra un solo gruppo (null = tutti)
     ========================================================= */
  const gruppiAperti = {};
  CRM.GruppiDaFare = function (host, gruppi, vuoto) {
    const box = el('div', 'gruppi-fare');
    const conVoci = gruppi.filter(g => g.voci.length || g.sommario);
    if (!conVoci.length) box.innerHTML = '<ul class="da-fare"><li class="vuoto"><b>' + esc(vuoto.titolo) + '</b>' + esc(vuoto.testo) + '</li></ul>';
    conVoci.forEach(g => {
      const d = el('details', 'gruppo-fare g-' + (g.variante || 'neutro'));
      d.dataset.id = g.id;
      d.open = gruppiAperti[g.id] !== false;
      d.innerHTML = '<summary><span class="gf-titolo">' + esc(g.titolo) + '<span class="gf-conta">' + g.conta + '</span></span><span class="gf-azioni"></span></summary>' +
        (g.sommario ? '<p class="gf-sommario">' + g.sommario + '</p>' : '');
      const az = $('.gf-azioni', d);
      (g.azioni || []).forEach(a => {
        const b = el(a.href ? 'a' : 'button', 'btn piccolo ' + (a.variante || 'sec'), (a.icona ? CRM.icona(a.icona) : '') + esc(a.etichetta));
        if (a.href) b.href = a.href; else b.type = 'button';
        b.addEventListener('click', ev => { ev.stopPropagation(); if (a.onClick) { ev.preventDefault(); a.onClick(); } });
        az.appendChild(b);
      });
      if (g.voci.length) CRM.ListaDaFare(d, g.voci, vuoto);
      else if (g.vuoto) d.insertAdjacentHTML('beforeend', '<p class="gf-sommario testo-tenue">' + esc(g.vuoto) + '</p>');
      d.addEventListener('toggle', () => { gruppiAperti[g.id] = d.open; });
      box.appendChild(d);
    });
    ospite(host).appendChild(box);
    return { el: box, filtra: id => $$('.gruppo-fare', box).forEach(d => { d.hidden = !!id && d.dataset.id !== id; if (id && d.dataset.id === id) d.open = true; }) };
  };

  /* =========================================================
     ElencoSelezionabile: elenco a sinistra di una vista a due pannelli
     voci: [{ id, href, titolo, valore, sotto, stato (html) }], selezionata
     ========================================================= */
  let elencoY = null;
  CRM.ElencoSelezionabile = function (host, voci, selezionata) {
    const ul = el('ul', 'selezionabile', voci.map(v => '<li><a href="' + v.href + '"' + (v.id === selezionata ? ' class="attivo" aria-current="true"' : '') + '>' +
      '<span class="r1"><span>' + esc(v.titolo) + '</span><span>' + esc(v.valore || '') + '</span></span><span class="r2">' + esc(v.sotto || '') + '</span>' + (v.stato ? '<span class="r3">' + v.stato + '</span>' : '') + '</a></li>').join(''));
    ospite(host).appendChild(ul);
    // scegliendo una voce la schermata si ridisegna: l'elenco resta dove era e la voce scelta resta visibile
    // area che scorre: l'elenco stesso o il primo contenitore scorrevole
    let area = ul;
    while (area && area.parentElement && !(/(auto|scroll)/.test(getComputedStyle(area).overflowY) && area.scrollHeight > area.clientHeight)) area = area.parentElement;
    if (!area || area === document.body || area === document.documentElement) area = ul;
    if (elencoY != null) { area.scrollTop = elencoY; elencoY = null; }
    const att = $('a.attivo', ul);
    if (att) { const r = att.getBoundingClientRect(), ra = area.getBoundingClientRect(); if (r.top < ra.top || r.bottom > ra.bottom) att.scrollIntoView({ block: 'nearest' }); }
    ul.addEventListener('click', ev => { if (ev.target.closest('a')) elencoY = area.scrollTop; });
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
  /* Ampliamenti progettati ma non in questa fase: spenti, il codice resta pronto (spec §17).
     Per provarli: CRM.AMPLIAMENTI.vendita = true nella console, poi ricarica la pagina con il menu. */
  CRM.AMPLIAMENTI = { vendita: /[?&]vendita=1\b/.test(location.search) };
  const VOCI = [
    { gruppo: 'Ogni giorno', voci: [
      { id: 'oggi', href: '#/', t: 'Oggi', icona: 'oggi' },
      { id: 'documenti', href: '#/documenti', t: 'Documenti', icona: 'arrivo' },
      { id: 'pratiche', href: '#/pratiche', t: 'Pratiche', icona: 'pratiche' }] },
    { gruppo: 'Ogni mese', voci: [{ id: 'bollettini', href: '#/bollettini', t: 'Bollettini', icona: 'bollettini' }] },
    { gruppo: 'Ogni trimestre', voci: [{ id: 'liquidazioni', href: '#/liquidazioni', t: 'Liquidazioni', icona: 'liquidazioni' },
      { id: 'analisi', href: '#/analisi', t: 'Analisi', icona: 'analisi' }] },
    { gruppo: 'Vendita diretta', ampliamento: 'vendita', voci: [
      { id: 'ordini-cliente', href: '#/ordini-cliente', t: 'Ordini cliente', icona: 'carrello' },
      { id: 'articoli', href: '#/articoli', t: 'Articoli', icona: 'scatola' },
      { id: 'giacenze', href: '#/giacenze', t: 'Giacenze', icona: 'magazzino' },
      { id: 'alias-kit', href: '#/alias-kit', t: 'Alias e kit', icona: 'catena' }] },
    { gruppo: 'Anagrafiche', voci: [
      { id: 'fornitori', href: '#/fornitori', t: 'Fornitori', icona: 'fornitori' },
      { id: 'subagenti', href: '#/subagenti', t: 'Subagenti', icona: 'subagenti' },
      { id: 'clienti', href: '#/clienti', t: 'Clienti', icona: 'abbinamenti' }] },
    { gruppo: 'Gestione', voci: [
      { id: 'utenti', href: '#/utenti', t: 'Utenti e ruoli', icona: 'subagenti', permesso: 'gestione' },
      { id: 'sistema', href: '#/sistema', t: 'Stato del sistema', icona: 'sistema', permesso: 'sistema' },
      { id: 'impostazioni', href: '#/impostazioni', t: 'Impostazioni', icona: 'impostazioni', permesso: 'gestione' },
      { id: 'scartati', href: '#/scartati', t: 'Documenti scartati', icona: 'cestino', permesso: 'scartati' },
      { id: 'guida', href: '#/guida', t: 'Guida', icona: 'guida' }], richiudibile: true }
  ];
  let gestioneAperta = false;
  CRM.Barra = function (attiva) {
    const fare = M.daFare();
    const conta = {
      oggi: { n: fare.length },
      documenti: { n: M.S.in_arrivo.length, urgente: M.S.in_arrivo.length > 0 },
      // la voce si chiama "Documenti": qui si caricano e si abbinano
      pratiche: { n: M.S.pratiche.filter(p => M.statoPratica(p).chiave === 'scaduta').length, urgente: true },
      bollettini: { n: fare.filter(x => x.tipo === 'bollettino' || x.tipo === 'mancante').length },
      'ordini-cliente': { n: (M.S.ordini_cliente || []).filter(o => !o.esportato).length },
      giacenze: { n: (M.S.giacenze || []).filter(g => M.disponibile && M.disponibile(g.codice) < 0).length, urgente: true },
      sistema: { n: M.S.sistema.problemi.filter(x => !x.visto).length, urgente: M.S.sistema.problemi.some(x => !x.visto && x.livello === 'errore') }
    };
    const io = M.utente();
    document.body.classList.toggle('sola-lettura', !M.puo('modifica'));
    const b = $('#barra');
    b.innerHTML = '<div class="marchio"><img src="assets/logo-decobrands.png" alt="Decobrands"><span>Pratiche e provvigioni</span></div>' +
      '<button type="button" class="carica-barra" id="carica-barra">' + CRM.icona('carica') + 'Carica documenti</button>' +
      '<div class="barra-menu">' + VOCI.filter(g => !g.ampliamento || CRM.AMPLIAMENTI[g.ampliamento]).map(g => Object.assign({}, g, { voci: g.voci.filter(v => !v.permesso || M.puo(v.permesso)) })).filter(g => g.voci.length).map(g => {
        // il gruppo Gestione si apre da solo quando si è in una delle sue pagine (il contatore dei problemi resta visibile sul titolo)
        const aperto = !g.richiudibile || gestioneAperta || window.innerWidth <= 860 || g.voci.some(v => v.id === attiva);
        const titolo = g.richiudibile ? '<summary class="gruppo-nome">' + g.gruppo + (conta.sistema && conta.sistema.n && M.puo('sistema') ? ' <span class="conta' + (conta.sistema.urgente ? ' urgente' : '') + '">' + conta.sistema.n + '</span>' : '') + '</summary>' : '<div class="gruppo-nome">' + g.gruppo + '</div>';
        return (g.richiudibile ? '<details class="gruppo richiudibile"' + (aperto ? ' open' : '') + ' aria-label="' + g.gruppo + '">' : '<nav class="gruppo" aria-label="' + g.gruppo + '">') + titolo + g.voci.map(v => {
        const k = conta[v.id];
        return '<a class="voce' + (v.id === attiva ? ' attiva' : '') + '" href="' + v.href + '"' + (v.id === attiva ? ' aria-current="page"' : '') + '>' + CRM.icona(v.icona) + '<span>' + v.t + '</span>' +
          (k && k.n ? '<span class="conta' + (k.urgente ? ' urgente' : '') + '">' + k.n + '</span>' : '') + '</a>';
      }).join('') + (g.richiudibile ? '</details>' : '</nav>'); }).join('') + '</div>' +
      '<div class="barra-piede"><div class="io"><span class="io-sigla" aria-hidden="true">' + esc(io.nome.split(' ').map(x => x[0]).join('').slice(0, 2)) + '</span><span><b>' + esc(io.nome) + '</b>' + esc(M.RUOLI[io.ruolo].nome) + '</span></div>' +
      '<label class="io-cambia">Prova come <select id="accedi-come" aria-label="Prova il prototipo come">' + M.S.utenti.filter(u => u.attivo && !u.sistema).map(u => '<option value="' + u.id + '"' + (u.id === io.id ? ' selected' : '') + '>' + esc(u.nome + ' · ' + M.RUOLI[u.ruolo].breve) + '</option>').join('') + '</select></label>' +
      'Data simulata: ' + M.dataLunga(M.oggi()) + '<br><button type="button" id="ripristina">Ripristina i dati di prova</button> · <a href="#/componenti"' + (attiva === 'componenti' ? ' aria-current="page"' : '') + '>Componenti</a></div>';
    const det = $('details.richiudibile', b); if (det) det.addEventListener('toggle', () => { gestioneAperta = det.open; });
    $('#carica-barra').addEventListener('click', () => CRM.scegliFile({ accetta: '.pdf,.xlsx,.xls,.csv', onFile: f => CRM.alCaricamento && CRM.alCaricamento(f) }));
    $('#accedi-come').addEventListener('change', ev => { M.S.utente_corrente = Number(ev.target.value); M.salvaSempre(); CRM.Avviso('Ora sei ' + M.utente().nome + ' · ' + M.RUOLI[M.utente().ruolo].nome); CRM.naviga(); });
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
  /* ---------- Memoria della schermata ----------
     Ogni passo della cronologia (history.state.crm = n) ricorda come l'utente ha lasciato la
     schermata: filtri (FilterBar), riquadri selezionati (KpiRow), ordinamento (DataTable) e
     posizione di scorrimento di ogni area. Tornando indietro (pulsante "Torna a…", tasto
     Indietro del browser o ridisegno dopo un salvataggio) tutto viene ripristinato.
     I componenti si registrano in ordine di creazione: stessa schermata → stesso indice. */
  const MEM = (() => { try { return JSON.parse(sessionStorage.getItem('crm-memoria')) || {}; } catch (e) { return {}; } })();
  let contatore = Object.keys(MEM).reduce((x, k) => Math.max(x, Number(k) || 0), 0);
  let voce = null, registro = [], differiti = [];
  CRM._mem = { ripristino: null };
  CRM.registra = (tipo, leggi) => { const i = registro.filter(x => x.tipo === tipo).length; registro.push({ tipo: tipo, leggi: leggi }); const r = CRM._mem.ripristino; return r && r[tipo] ? r[tipo][i] : undefined; };
  CRM.dopoDisegno = fn => differiti.push(fn);
  const percorso = n => { const out = []; const radice = $('#principale'); while (n && n !== radice) { out.unshift(Array.prototype.indexOf.call(n.parentNode.children, n)); n = n.parentNode; } return out; };
  const risolvi = p => p.reduce((n, i) => n && n.children[i], $('#principale'));
  function cattura() {
    const st = { scorri: [] };
    registro.forEach(x => { (st[x.tipo] = st[x.tipo] || []).push(x.leggi()); });
    $$('#principale *').forEach(n => { if (n.scrollTop || n.scrollLeft) st.scorri.push({ p: percorso(n), t: n.scrollTop, l: n.scrollLeft }); });
    st.pagina = (document.scrollingElement || document.documentElement).scrollTop;
    return st;
  }
  function salvaMemoria() { try { sessionStorage.setItem('crm-memoria', JSON.stringify(MEM)); } catch (e) { /* memoria solo per la sessione */ } }
  CRM.indietro = () => { const st = history.state; return st && st.prec && MEM[st.prec] ? { titolo: MEM[st.prec].titolo, vai: () => history.back() } : null; };
  CRM.naviga = function () {
    if (voce && MEM[voce.n]) { MEM[voce.n].stato = cattura(); }
    const h = (location.hash || '#/').slice(1);
    let st = history.state, n;
    if (st && st.crm) n = st.crm;
    else { n = ++contatore; history.replaceState({ crm: n, prec: voce ? voce.n : null }, ''); }
    const ritorno = MEM[n] && MEM[n].hash === h ? MEM[n].stato : null;
    CRM._mem.ripristino = ritorno; registro = []; differiti = [];
    const r = ROTTE.find(x => h.match(x.re));
    if (!r) { location.replace('#/'); return; }
    r.fn.apply(null, h.match(r.re).slice(1));
    differiti.forEach(fn => fn());
    if (ritorno) {
      ritorno.scorri.forEach(x => { const el = risolvi(x.p); if (el) { el.scrollTop = x.t; el.scrollLeft = x.l; } });
      (document.scrollingElement || document.documentElement).scrollTop = ritorno.pagina || 0;
    }
    CRM._mem.ripristino = null;
    voce = { n: n }; MEM[n] = { hash: h, titolo: (document.title || '').replace(/ · Decobrands$/, ''), stato: MEM[n] && MEM[n].stato };
    salvaMemoria();
  };
  window.addEventListener('beforeunload', () => { if (voce && MEM[voce.n]) { MEM[voce.n].stato = cattura(); salvaMemoria(); } });
  window.addEventListener('hashchange', CRM.naviga);
})();
