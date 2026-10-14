/* ============================================================
   Viste "Ogni giorno": Oggi, Documenti in arrivo, Pratiche, Pratica
   ============================================================ */
(function () {
  'use strict';
  const e = U.esc;

  /* ---------- Oggi ---------- */
  U.rotta(/^\/$/, function () {
    const fare = M.daFare();
    const corpo = U.pagina({ voce: 'oggi', titolo: 'Oggi', sotto: M.dataLunga(M.oggi()) + ' · ' + (fare.length ? fare.length + (fare.length === 1 ? ' cosa da fare' : ' cose da fare') : 'niente in sospeso') });
    const cols = U.el('div', 'due-colonne');
    corpo.appendChild(cols);

    const lista = U.el('section', 'foglio');
    lista.innerHTML = '<div class="foglio-testa"><h2>Da fare</h2><span class="nota">in ordine di urgenza</span></div>' +
      (fare.length ? '<ul class="lista-fare">' + fare.map(x =>
        '<li class="t-' + x.tipo + '"><span class="segno"></span><div><b>' + e(x.titolo) + '</b><span>' + e(x.dettaglio) + '</span></div>' +
        '<a class="btn sec piccolo" href="' + x.link + '">' + e(x.azione) + '</a></li>').join('') + '</ul>'
        : '<div class="vuoto"><b>Tutto in ordine</b>Nessun documento da abbinare, nessuna conferma in ritardo, nessun bollettino da verificare.</div>');
    cols.appendChild(lista);

    const destra = U.el('div');
    destra.style.cssText = 'display:flex;flex-direction:column;gap:16px';
    const a = 2026, t = M.trimestre(M.oggi());
    const st = M.statoTrimestre(a, t);
    const righe = M.righeLiquidazione(a, t);
    const liq = righe.filter(r => r.liquidabile).reduce((s, r) => s + r.provvigione, 0);
    const att = righe.filter(r => !r.liquidabile).reduce((s, r) => s + r.provvigione, 0);
    let attesoFornitori = 0, riconosciuto = 0;
    righe.forEach(r => { const p = M.percentuali(r.pratica, r.doc.data); attesoFornitori += r.importo * p.dal_fornitore / 100; });
    M.S.bollettini.filter(b => b.anno === a && M.trimestre(b.anno + '-' + String(b.mese).padStart(2, '0') + '-01') === t).forEach(b => b.righe.forEach(r => { riconosciuto += r.importo; }));
    const lim = M.limiti(a, t);
    const quota = Math.min(100, Math.max(0, 100 * M.giorni(lim.da, M.oggi()) / M.giorni(lim.da, lim.a)));
    const trim = U.el('section', 'foglio');
    trim.innerHTML = '<div class="foglio-testa"><h2>' + t + '° trimestre ' + a + '</h2><a href="#/liquidazioni/' + a + '/' + t + '" class="btn testo piccolo">Apri liquidazione</a></div>' +
      '<div class="foglio-corpo"><div class="testo-tenue piccolo">' + e(st.etichetta) + (st.giorni != null ? ' · mancano ' + st.giorni + ' giorni' : '') + '</div>' +
      '<div class="barra-scadenza" aria-hidden="true"><i style="width:' + quota.toFixed(0) + '%"></i></div>' +
      '<dl class="cifre" style="margin-top:8px">' +
      '<div><dt>Atteso dai fornitori</dt><dd>' + M.euro(attesoFornitori) + '</dd></div>' +
      '<div><dt>Già riconosciuto nei bollettini</dt><dd>' + M.euro(riconosciuto) + '</dd></div>' +
      '<div><dt>Da liquidare ai subagenti</dt><dd>' + M.euro(liq) + '</dd></div>' +
      '<div><dt>Bloccato in attesa dei bollettini</dt><dd class="' + (att ? 'negativo' : '') + '">' + M.euro(att) + '</dd></div></dl></div>';
    destra.appendChild(trim);

    const reg = U.el('section', 'foglio');
    reg.innerHTML = '<div class="foglio-testa"><h2>Ultime operazioni</h2></div><div class="foglio-corpo">' +
      (M.S.registro.length ? '<ul class="registro">' + M.S.registro.slice(0, 8).map(x => '<li>' + e(x.testo) + '</li>').join('') + '</ul>'
        : '<p class="testo-tenue piccolo" style="margin:0">Qui compaiono le operazioni fatte: abbinamenti, verifiche, liquidazioni.</p>') + '</div>';
    destra.appendChild(reg);
    cols.appendChild(destra);
  });

  /* ---------- Documenti in arrivo ---------- */
  const ESITO = {
    certo: ['s-ok', 'Abbinamento sicuro'],
    probabile: ['s-attesa', 'Abbinamento da confermare'],
    ambiguo: ['s-attesa', 'Da scegliere'],
    nessuno: ['s-ritardo', 'Cliente non riconosciuto']
  };
  function vistaDocumenti(idSel) {
    const docs = M.S.in_arrivo;
    const corpo = U.pagina({
      voce: 'documenti', titolo: 'Documenti in arrivo', pieno: true,
      sotto: 'Conferme e fatture lette in automatico. Controlla l’abbinamento proposto e conferma: la pratica avanza da sola.',
      azioni: [{ etichetta: 'Simula l’arrivo di un documento', icona: 'carica', classe: 'sec', onClick: () => {
        const d = M.simulaArrivo();
        if (!d) return U.avviso('Nel prototipo è previsto un solo arrivo simulato: è già stato usato.');
        M.salva(); U.avviso('Arrivata la fattura ' + d.numero + ' di Gries'); location.hash = '#/documenti/' + d.id;
      } }]
    });
    if (!docs.length) {
      corpo.innerHTML = '<div class="foglio"><div class="vuoto"><b>Nessun documento da abbinare</b>I documenti dei fornitori compaiono qui appena letti. Puoi simularne uno con il pulsante in alto.</div></div>';
      return;
    }
    const sel = docs.find(d => d.id === Number(idSel)) || docs[0];
    const posta = U.el('div', 'posta');
    corpo.appendChild(posta);

    const sx = U.el('section', 'foglio colonna');
    sx.innerHTML = '<div class="foglio-testa"><h2>Da abbinare</h2><span class="nota">' + docs.length + '</span></div><ul class="posta-lista">' + docs.map(d => {
      const pr = M.proposta(d);
      return '<li><a href="#/documenti/' + d.id + '" class="' + (d.id === sel.id ? 'attivo' : '') + '"' + (d.id === sel.id ? ' aria-current="true"' : '') + '>' +
        '<div class="riga1"><span>' + e(M.TIPI[d.tipo]) + ' ' + e(d.numero) + '</span><span>' + M.euro(pr.importo) + '</span></div>' +
        '<div class="riga2">' + e(M.fornitore(d.fornitore_id).breve) + ' · arrivato il ' + M.data(d.ricevuto) + '</div>' +
        '<div style="margin-top:6px">' + U.stato(ESITO[pr.esito][0], ESITO[pr.esito][1]) + '</div></a></li>';
    }).join('') + '</ul>';
    posta.appendChild(sx);

    const pr = M.proposta(sel);
    const f = M.fornitore(sel.fornitore_id);
    const dx = U.el('section', 'foglio colonna');
    dx.innerHTML = '<div class="foglio-testa"><h2>' + e(M.TIPI[sel.tipo]) + ' ' + e(sel.numero) + ' · ' + e(f.breve) + '</h2>' +
      '<span class="nota" style="display:inline-flex;gap:6px;align-items:center">' + U.icona('file') + e(sel.file) + '</span></div><div class="foglio-corpo"></div>';
    posta.appendChild(dx);
    const c = U.$('.foglio-corpo', dx);

    const ab = pr.abbinamento;
    c.innerHTML = '<h3 style="font-size:15px;margin-bottom:10px">Letto dal documento</h3>' +
      '<dl class="chiave-valore">' +
      '<dt>Fornitore</dt><dd>' + e(f.nome) + '</dd>' +
      '<dt>Data del documento</dt><dd>' + M.data(sel.data) + '</dd>' +
      '<dt>Codice cliente</dt><dd>' + e(sel.codice_cliente) + (ab ? ' <span class="testo-tenue">= ' + e(M.nomeCliente(ab.cliente_piva)) + '</span>' : ' ' + U.stato('s-ritardo', 'non trovato fra i clienti ' + f.breve)) + '</dd>' +
      '<dt>Importo</dt><dd>' + M.euro(pr.importo) + '</dd></dl>' +
      '<div id="righe-doc" style="margin:14px 0 22px"></div>' +
      '<h3 style="font-size:15px;margin-bottom:10px">' + (pr.esito === 'nessuno' ? 'A quale pratica appartiene?' : 'Pratica proposta') + '</h3>' +
      (pr.esito === 'nessuno' ? '<p class="testo-tenue" style="margin:0 0 12px">Il codice ' + e(sel.codice_cliente) + ' non corrisponde a nessun cliente di ' + e(f.breve) +
        '. Scegli la pratica a mano oppure, se è un cliente nuovo, aggiungi il codice in <a href="#/abbinamenti">Clienti e abbinamenti</a>.</p>' : '') +
      '<div id="proposte"></div>' +
      '<div style="margin-top:22px;padding-top:14px;border-top:1px solid var(--linea-tenue)"><button type="button" class="btn pericolo piccolo" id="scarta">Scarta il documento</button>' +
      ' <span class="testo-tenue piccolo">se è un doppione o non riguarda Decobrands</span></div>';

    U.tabella(U.$('#righe-doc', c), {
      compatta: true, naturale: true,
      colonne: [
        { key: 'codice', titolo: 'Articolo' },
        { key: 'descrizione', titolo: 'Descrizione', cresce: true },
        { key: 'qta', titolo: 'Quantità', tipo: 'num' },
        { key: 'prezzo', titolo: 'Prezzo', tipo: 'euro' },
        { key: 'importo', titolo: 'Importo', tipo: 'euro', valore: r => M.importoRiga(r), totale: 'somma' }
      ],
      righe: sel.righe
    });

    const boxP = U.$('#proposte', c);
    let candidati = pr.candidati;
    if (pr.esito === 'nessuno') candidati = M.S.pratiche.filter(p => p.fornitore_id === sel.fornitore_id && (sel.tipo === 'conferma' ? !M.doc(p, 'conferma') : !M.fiscali(p).some(d => d.tipo === 'fattura')))
      .map(p => ({ pratica: p, motivi: ['pratica ' + f.breve + ' ancora aperta'], delta: M.r2(pr.importo - M.importoDoc(M.doc(p, 'conferma') || M.doc(p, 'ordine'))) }));
    if (!candidati.length) boxP.innerHTML = '<p class="testo-tenue">Nessuna pratica aperta di ' + e(f.breve) + ' a cui abbinarlo.</p>';
    candidati.forEach((cand, i) => {
      const p = cand.pratica;
      const prima = M.statoPratica(p).etichetta;
      const dopo = sel.tipo === 'conferma' ? 'Confermata' : sel.tipo === 'fattura' ? 'Fatturata' : prima;
      const rif = M.doc(p, 'conferma') ? 'alla conferma' : 'all’ordine';
      const box = U.el('div', 'proposta' + (i === 0 && pr.esito !== 'nessuno' ? ' prima' : ''));
      box.innerHTML = '<div><h3>' + e(p.numero) + ' · ' + e(M.nomeCliente(p.cliente_piva)) + '</h3>' +
        '<div class="passaggio">' + U.statoPratica(p) + (prima !== dopo ? ' <span aria-hidden="true">›</span> ' + U.stato(dopo === 'Fatturata' ? 's-ok' : 's-neutro', dopo) : '') + '</div>' +
        '<ul>' + cand.motivi.map(m => '<li>' + e(m) + '</li>').join('') +
        '<li>' + (Math.abs(cand.delta) < 0.01 ? 'importo uguale ' + rif : '<span class="' + U.segno(cand.delta) + '">' + U.euroSegno(cand.delta) + '</span> rispetto ' + rif) + '</li></ul></div>' +
        '<button type="button" class="btn' + (i === 0 && pr.esito !== 'nessuno' ? '' : ' sec') + '">Abbina a ' + e(p.numero) + '</button>';
      U.$('button', box).addEventListener('click', () => abbina(sel, p));
      boxP.appendChild(box);
    });
    U.$('#scarta', c).addEventListener('click', async () => {
      if (!(await U.conferma('Scartare ' + M.TIPI[sel.tipo].toLowerCase() + ' ' + sel.numero + '?', 'Il documento esce da questo elenco e non viene abbinato a nessuna pratica.', 'Scarta', true))) return;
      M.scarta(sel.id); M.salva(); U.avviso('Documento ' + sel.numero + ' scartato'); location.hash = '#/documenti';
    });
  }
  function abbina(doc, p) {
    const esito = M.abbina(doc.id, p.id);
    let extra = '';
    if (doc.tipo === 'fattura') {
      const b = M.S.bollettini.find(x => x.fornitore_id === doc.fornitore_id && x.righe.some(r => r.numero === doc.numero));
      if (b) { const r = M.riconcilia(b).righe.find(x => x.numero === doc.numero); extra = r && r.categoria === 'quadra' ? ' Nel bollettino di ' + M.meseMin(b.mese) + ' ora la riga quadra.' : ''; }
    }
    M.salva();
    U.avviso(M.TIPI[doc.tipo] + ' ' + doc.numero + ' abbinata a ' + p.numero + (esito.prima !== esito.dopo ? ': ora ' + esito.dopo.toLowerCase() + '.' : '.') + extra);
    location.hash = M.S.in_arrivo.length ? '#/documenti/' + M.S.in_arrivo[0].id : '#/documenti';
  }
  U.rotta(/^\/documenti$/, () => vistaDocumenti(null));
  U.rotta(/^\/documenti\/(\d+)$/, id => vistaDocumenti(id));

  /* ---------- Pratiche ---------- */
  let filtroPratiche = 'tutte', cercaPratiche = '';
  U.rotta(/^\/pratiche$/, function () {
    const corpo = U.pagina({ voce: 'pratiche', titolo: 'Pratiche', pieno: true, sotto: 'Ogni ordine a fornitore con i suoi documenti. Lo stato avanza quando arrivano conferma e fattura.' });
    const tutte = M.S.pratiche;
    const FILTRI = [
      { v: 'tutte', t: 'Tutte', f: () => true },
      { v: 'scaduta', t: 'Conferma in ritardo', f: p => M.statoPratica(p).chiave === 'scaduta' },
      { v: 'attesa', t: 'Attesa conferma', f: p => M.statoPratica(p).chiave === 'attesa' },
      { v: 'confermata', t: 'Attesa fattura', f: p => M.statoPratica(p).chiave === 'confermata' },
      { v: 'fatturata', t: 'Fatturate', f: p => M.statoPratica(p).chiave === 'fatturata' },
      { v: 'variazioni', t: 'Con variazioni', f: p => M.haVariazioni(p) }
    ];
    const barra = U.el('div', 'barra-filtri');
    corpo.appendChild(barra);
    U.segmenti(barra, FILTRI.map(x => ({ v: x.v, t: x.t, n: tutte.filter(x.f).length })), filtroPratiche, v => { filtroPratiche = v; aggiorna(); });
    const cerca = U.el('label', 'cerca', U.icona('cerca') + '<input type="search" placeholder="Cerca pratica, cliente, documento" aria-label="Cerca">');
    barra.appendChild(cerca);
    const inp = U.$('input', cerca);
    inp.value = cercaPratiche;
    inp.addEventListener('input', () => { cercaPratiche = inp.value; aggiorna(); });

    const box = U.el('div', 'riempi');
    corpo.appendChild(box);
    const tab = U.tabella(box, {
      colonne: [
        { key: 'numero', titolo: 'Pratica', cella: p => '<a href="#/pratiche/' + p.id + '"><b>' + e(p.numero) + '</b></a>' },
        { key: 'cliente', titolo: 'Cliente', cresce: true, valore: p => M.nomeCliente(p.cliente_piva) },
        { key: 'fornitore', titolo: 'Fornitore', valore: p => M.fornitore(p.fornitore_id).breve },
        { key: 'data', titolo: 'Data ordine', tipo: 'data' },
        { key: 'importo', titolo: 'Importo', tipo: 'euro', valore: p => M.importoPratica(p) },
        { key: 'stato', titolo: 'Stato', ordinaPer: p => ['scaduta', 'attesa', 'confermata', 'fatturata'].indexOf(M.statoPratica(p).chiave),
          cella: p => { const s = M.statoPratica(p); return U.statoPratica(p) + (s.nota ? '<span class="sec-riga">' + e(s.nota) + '</span>' : '') + (M.haVariazioni(p) ? '<span class="sec-riga">' + U.icona('avviso').replace('class="icona"', 'class="icona" style="width:13px;height:13px;vertical-align:-2px;color:var(--ambra)"') + ' variazioni fra le fasi</span>' : ''); } },
        { key: 'sub', titolo: 'Subagente', valore: p => { const a = M.abbinamento(p.cliente_piva, p.fornitore_id); return a ? M.subagente(a.subagente_id).nome : '—'; } }
      ],
      ordine: { key: 'stato', dir: 'asc' },
      suRiga: p => { location.hash = '#/pratiche/' + p.id; },
      vuoto: { titolo: 'Nessuna pratica', testo: 'Prova a togliere il filtro o a cambiare la ricerca.' }
    });
    function aggiorna() {
      const f = FILTRI.find(x => x.v === filtroPratiche).f;
      const q = cercaPratiche.trim().toLowerCase();
      tab.aggiorna(tutte.filter(f).filter(p => !q || [p.numero, M.nomeCliente(p.cliente_piva), M.fornitore(p.fornitore_id).nome].concat(p.documenti.map(d => d.numero)).some(x => x.toLowerCase().indexOf(q) >= 0)));
    }
    aggiorna();
  });

  /* ---------- Pratica: il binario dei documenti ---------- */
  U.rotta(/^\/pratiche\/(\d+)$/, function (id) {
    const p = M.pratica(id);
    if (!p) { location.hash = '#/pratiche'; return; }
    const f = M.fornitore(p.fornitore_id);
    const ab = M.abbinamento(p.cliente_piva, p.fornitore_id);
    const sub = ab ? M.subagente(ab.subagente_id) : null;
    const s = M.statoPratica(p);
    const corpo = U.pagina({
      voce: 'pratiche', titolo: p.numero,
      titoloHtml: e(p.numero) + ' <span style="vertical-align:4px">' + U.statoPratica(p) + '</span>',
      percorso: [{ t: 'Pratiche', href: '#/pratiche' }, { t: p.numero }],
      sotto: e(M.nomeCliente(p.cliente_piva)) + ' · ' + e(f.nome) + (sub ? ' · seguita da ' + e(sub.nome) : ' · nessun subagente abbinato'),
      azioni: s.chiave === 'scaduta' || s.chiave === 'attesa' ? [{ etichetta: 'Prepara il sollecito', icona: 'posta', classe: s.chiave === 'scaduta' ? '' : 'sec', onClick: () => sollecito(p) }] : []
    });

    /* Binario: ordine → conferma → fattura → nota di credito */
    const ordine = M.doc(p, 'ordine'), conf = M.doc(p, 'conferma');
    const fatture = M.fiscali(p).filter(d => d.tipo === 'fattura'), nc = M.fiscali(p).filter(d => d.tipo === 'nota_credito');
    const tappa = (titolo, doc, extraDocs, statoVuoto, prec) => {
      if (!doc) return '<div class="tappa ' + (statoVuoto.ritardo ? 'ritardo' : '') + '"><div class="nodo"></div><h3>' + titolo + '</h3><div class="' + (statoVuoto.ritardo ? 'negativo' : 'testo-tenue') + '">' + e(statoVuoto.testo) + '</div></div>';
      const imp = M.importoDoc(doc) + (extraDocs || []).reduce((x, d) => x + M.importoDoc(d), 0);
      const delta = prec != null ? M.r2(imp - prec) : 0;
      return '<div class="tappa fatta"><div class="nodo">' + U.icona('spunta') + '</div><h3>' + titolo + '</h3>' +
        '<div class="num">' + e(doc.numero) + (extraDocs && extraDocs.length ? ' + ' + extraDocs.length : '') + '</div><div class="testo-tenue piccolo">' + M.data(doc.data) + '</div>' +
        '<div class="imp ' + (imp < 0 ? 'negativo' : '') + '">' + M.euro(imp) + '</div>' +
        (prec != null && Math.abs(delta) >= 0.01 ? '<span class="delta">' + U.euroSegno(delta) + ' rispetto alla fase prima</span>' : '') + '</div>';
    };
    const impOrd = M.importoDoc(ordine);
    const impConf = conf ? M.importoDoc(conf) : null;
    const bin = U.el('section', 'foglio');
    bin.innerHTML = '<div class="binario">' +
      tappa('Ordine', ordine, null, {}, null) +
      tappa('Conferma', conf, null, s.chiave === 'scaduta' ? { ritardo: true, testo: 'In ritardo ' + s.nota + ' (attesa entro il ' + M.data(s.scadenza) + ')' } : { testo: s.scadenza ? 'Attesa entro il ' + M.data(s.scadenza) : 'Attesa' }, impOrd) +
      tappa(fatture.length > 1 ? 'Fatture' : 'Fattura', fatture[0], fatture.slice(1), { testo: conf || s.chiave !== 'fatturata' ? 'In attesa' : '' }, impConf != null ? impConf : impOrd) +
      (nc.length ? tappa('Nota di credito', nc[0], nc.slice(1), {}, null) : '<div class="tappa"><div class="nodo" style="border-style:dotted"></div><h3>Nota di credito</h3><div class="testo-tenue">Nessuna</div></div>') +
      '</div>';
    corpo.appendChild(bin);

    const cols = U.el('div', 'due-colonne');
    corpo.appendChild(cols);

    /* Righe a confronto fra le fasi */
    const fasi = M.fasi(p);
    const conf2 = U.el('section', 'foglio colonna');
    conf2.innerHTML = '<div class="foglio-testa"><h2>Righe a confronto</h2><span class="nota">' + (fasi.length > 1 ? (M.haVariazioni(p) ? 'le righe evidenziate cambiano fra le fasi' : 'nessuna variazione fra le fasi') : 'il confronto parte quando arriva la conferma') + '</span></div>';
    cols.appendChild(conf2);
    const confronto = M.confronto(p);
    const boxT = U.el('div');
    boxT.style.cssText = 'display:flex;flex-direction:column;min-height:0;flex:1 1 auto';
    conf2.appendChild(boxT);
    const tc = U.tabella(boxT, {
      compatta: true,
      colonne: [{ key: 'codice', titolo: 'Articolo', cella: r => '<b>' + e(r.codice) + '</b><span class="sec-riga" style="white-space:normal">' + e(r.descrizione) + '</span>', cresce: true }]
        .concat(fasi.map((d, i) => ({ key: 'f' + i, titolo: M.TIPI[d.tipo], allinea: 'dx', ordinaPer: r => r.per[i] ? M.importoRiga(r.per[i]) : -1,
          cella: r => r.per[i] ? M.num(r.per[i].qta) + ' × ' + M.euro(r.per[i].prezzo) + '<span class="sec-riga">' + M.euro(M.importoRiga(r.per[i])) + '</span>' : '<span class="testo-tenue">assente</span>' })))
        .concat(fasi.length > 1 ? [{ key: 'delta', titolo: 'Differenza', tipo: 'euro', cella: r => Math.abs(r.delta) < 0.01 ? '<span class="testo-tenue">—</span>' : '<b class="' + U.segno(r.delta) + '">' + U.euroSegno(r.delta) + '</b>' }] : []),
      righe: confronto,
      classeRiga: r => r.varia ? 'evidenzia' : ''
    });
    tc.el.style.border = '0'; tc.el.style.borderRadius = '0';

    /* Provvigione e documenti */
    const dx = U.el('div');
    dx.style.cssText = 'display:flex;flex-direction:column;gap:16px';
    cols.appendChild(dx);
    const perc = M.percentuali(p, (fatture[0] || ordine).data);
    const base = M.importoPratica(p);
    const prov = U.el('section', 'foglio');
    if (!perc) {
      prov.innerHTML = '<div class="foglio-testa"><h2>Provvigione</h2></div><div class="foglio-corpo testo-tenue">Nessun abbinamento cliente × fornitore: la pratica non genera provvigioni. <a href="#/abbinamenti">Aggiungi l’abbinamento</a>.</div>';
    } else {
      const maturazione = f.maturazione === 'maturato'
        ? M.fiscali(p).map(d => { const b = M.riconosciutoIn(d.numero); const bb = M.S.bollettini.find(x => x.righe.some(r => r.numero === d.numero));
            return '<li>' + e(d.numero) + ': ' + (b ? U.stato('s-ok', 'riconosciuta da ' + f.breve) : bb ? U.stato('s-attesa', 'nel bollettino di ' + M.meseMin(bb.mese) + ', da verificare') : U.stato('s-neutro', 'non ancora nei bollettini')) + '</li>'; }).join('')
        : '';
      prov.innerHTML = '<div class="foglio-testa"><h2>Provvigione</h2><span class="nota">' + (M.fiscali(p).length ? 'sul netto fatturato' : 'prevista') + '</span></div><div class="foglio-corpo">' +
        '<dl class="cifre">' +
        '<div><dt>Imponibile</dt><dd>' + M.euro(base) + '</dd></div>' +
        '<div><dt>Sconto al cliente</dt><dd>' + M.pct(perc.sconto) + '<span class="sec-riga">percentuali in vigore dal ' + M.data(perc.scaglione.valido_dal) + '</span></dd></div>' +
        '<div><dt>Da ' + e(f.breve) + ' a Decobrands: ' + M.pct(perc.agente) + ' + ' + M.pct(perc.sub_standard) + '</dt><dd>' + M.euro(base * perc.dal_fornitore / 100) + '</dd></div>' +
        '<div><dt>A ' + e(sub.nome) + ': ' + M.pct(perc.sub) + (perc.eccezione ? ' (eccezione personale)' : '') + '</dt><dd>' + M.euro(base * perc.sub / 100) + '</dd></div>' +
        '</dl>' +
        '<p class="testo-tenue piccolo" style="margin:10px 0 0">' + e(f.breve) + (f.maturazione === 'maturato' ? ' paga sul maturato: la provvigione del subagente si sblocca quando ' + e(f.breve) + ' la riconosce in un bollettino verificato.' : ' paga sul fatturato: la provvigione del subagente entra nel trimestre della fattura.') + '</p>' +
        (maturazione ? '<ul style="margin:8px 0 0;padding-left:18px">' + maturazione + '</ul>' : '') + '</div>';
    }
    dx.appendChild(prov);

    const docsBox = U.el('section', 'foglio');
    docsBox.innerHTML = '<div class="foglio-testa"><h2>Documenti</h2><span class="nota">' + p.documenti.length + '</span></div><div class="foglio-corpo" style="padding-top:6px;padding-bottom:6px"><ul class="registro">' +
      p.documenti.map(d => '<li style="display:flex;justify-content:space-between;gap:10px"><span>' + U.icona('file').replace('class="icona"', 'class="icona" style="width:15px;height:15px;vertical-align:-3px;color:var(--grafite)"') + ' ' + e(M.TIPI[d.tipo]) + ' <b>' + e(d.numero) + '</b> <span class="testo-tenue">del ' + M.data(d.data) + '</span>' +
        (d.riferimento ? '<span class="sec-riga testo-tenue">storna ' + e(d.riferimento) + (d.nota ? ' · ' + e(d.nota) : '') + '</span>' : '') + '</span><span class="' + (M.importoDoc(d) < 0 ? 'negativo' : '') + '">' + M.euro(M.importoDoc(d)) + '</span></li>').join('') +
      '</ul></div>';
    dx.appendChild(docsBox);
  });

  /* Testo del sollecito di conferma, da copiare nella posta. */
  function sollecito(p) {
    const f = M.fornitore(p.fornitore_id);
    const testo = 'Gentili colleghi di ' + f.nome + ',\n\n' +
      'non abbiamo ancora ricevuto la conferma del nostro ordine ' + p.numero + ' del ' + M.data(p.data) + ' per il cliente ' + M.nomeCliente(p.cliente_piva) +
      ' (vostro codice ' + ((M.abbinamento(p.cliente_piva, p.fornitore_id) || {}).codice || '—') + '), di ' + M.euro(M.importoDoc(M.doc(p, 'ordine'))) + '.\n\n' +
      'Vi chiediamo di inviarcela appena possibile, indicando eventuali articoli non disponibili.\n\nGrazie,\nDecobrands SRL';
    U.modale({
      titolo: 'Sollecito di conferma · ' + p.numero, testo: 'Copia il testo e invialo a ' + U.esc(f.nome) + '.',
      corpo: '<textarea class="testo-email" aria-label="Testo del sollecito">' + U.esc(testo) + '</textarea>',
      azioni: [{ etichetta: 'Chiudi', classe: 'sec' }, { etichetta: 'Copia il testo', onClick: (chiudi, el) => {
        const t = U.$('textarea', el); t.select();
        try { navigator.clipboard.writeText(t.value); } catch (x) { document.execCommand('copy'); }
        M.annota('Sollecito conferma preparato per ' + p.numero); M.salva(); U.avviso('Testo del sollecito copiato');
      } }]
    });
  }
  U.sollecito = sollecito;
})();
