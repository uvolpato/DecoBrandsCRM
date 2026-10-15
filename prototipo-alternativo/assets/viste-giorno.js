/* ============================================================
   Viste "Ogni giorno": Oggi, Documenti in arrivo, Pratiche, Pratica
   Solo composizione di componenti CRM.*
   ============================================================ */
(function () {
  'use strict';
  const e = CRM.esc;
  const VARIANTE_FARE = { ritardo: 'errore', mancante: 'errore', documento: 'primario', bollettino: 'attesa' };

  /* ---------- Oggi: ListaDaFare + Cifre del trimestre + Elenco operazioni ---------- */
  CRM.rotta(/^\/$/, function () {
    const fare = M.daFare();
    const corpo = CRM.Pagina({ voce: 'oggi', titolo: 'Oggi',
      sottotitolo: M.dataLunga(M.oggi()) + ' · ' + (fare.length ? fare.length + (fare.length === 1 ? ' cosa da fare' : ' cose da fare') : 'niente in sospeso') });
    const col = CRM.blocco(corpo, 'colonne');

    const daFare = CRM.Pannello(col, { titolo: 'Da fare', nota: 'in ordine di urgenza', senzaMargine: true });
    CRM.ListaDaFare(daFare.corpo, fare.map(x => ({ tipo: VARIANTE_FARE[x.tipo], titolo: x.titolo, dettaglio: x.dettaglio, href: x.link, azione: x.azione })),
      { titolo: 'Tutto in ordine', testo: 'Nessun documento da abbinare, nessuna conferma in ritardo, nessun bollettino da verificare.' });

    const destra = CRM.blocco(col, 'pila');
    const a = 2026, t = M.trimestre(M.oggi());
    const st = M.statoTrimestre(a, t);
    const righe = M.righeLiquidazione(a, t);
    const somma = f => righe.filter(f).reduce((s, r) => s + r.provvigione, 0);
    let atteso = 0, riconosciuto = 0;
    righe.forEach(r => { atteso += r.importo * M.percentuali(r.pratica, r.doc.data).dal_fornitore / 100; });
    M.S.bollettini.filter(b => b.anno === a && Math.floor((b.mese - 1) / 3) + 1 === t).forEach(b => b.righe.forEach(r => { riconosciuto += r.importo; }));
    const lim = M.limiti(a, t);
    const trim = CRM.Pannello(destra, { titolo: t + '° trimestre ' + a, azioni: [{ etichetta: 'Apri liquidazione', variante: 'testo', href: '#/liquidazioni/' + a + '/' + t }] });
    CRM.Periodi(trim.corpo, [{ href: '#/liquidazioni/' + a + '/' + t, titolo: M.nomeTrimestre(t), sotto: st.etichetta, stato: st.giorni != null ? 'mancano ' + st.giorni + ' giorni' : '',
      avanzamento: Math.round(100 * M.giorni(lim.da, M.oggi()) / M.giorni(lim.da, lim.a)) }], 'Trimestre in corso').style.boxShadow = 'none';
    CRM.Cifre(trim.corpo, [
      { etichetta: 'Atteso dai fornitori', valore: atteso },
      { etichetta: 'Già riconosciuto nei bollettini', valore: riconosciuto },
      { etichetta: 'Da liquidare ai subagenti', valore: somma(r => r.liquidabile) },
      { etichetta: 'Bloccato in attesa dei bollettini', valore: somma(r => !r.liquidabile), variante: somma(r => !r.liquidabile) ? 'attesa' : '' }
    ]);
    const reg = CRM.Pannello(destra, { titolo: 'Ultime operazioni' });
    CRM.Elenco(reg.corpo, M.S.registro.slice(0, 8).map(x => ({ testo: e(x.testo) })), 'Qui compaiono le operazioni fatte: abbinamenti, verifiche, liquidazioni.');
  });

  /* ---------- Documenti: Caricamento + ElencoSelezionabile + Dettagli + DataTable + Scelte ----------
     Tutti i documenti entrano da qui: caricamento → lettura automatica → controllo dei dati letti → abbinamento. */
  const ESITO = { certo: ['ok', 'Abbinamento sicuro'], probabile: ['attesa', 'Abbinamento da confermare'], ambiguo: ['attesa', 'Da scegliere'], nessuno: ['errore', 'Cliente non riconosciuto'],
    nuova: ['info', 'Nuova pratica'], bollettino: ['info', 'Bollettino da registrare'], doppio: ['errore', 'Già registrato'] };
  const ACCETTA = '.pdf,.xlsx,.xls,.csv';
  function carica(files, preferenza) {
    let primo = null, letti = 0;
    files.forEach(f => { const d = M.leggiDocumento(f.name, preferenza); if (d) { letti++; primo = primo || d; } });
    M.salva();
    if (!primo) { CRM.Avviso('Nel prototipo la lettura è simulata e i documenti di esempio sono finiti: ripristina i dati di prova per ricominciare.'); return; }
    CRM.Avviso(letti === 1 ? 'Letto ' + M.TIPI[primo.tipo].toLowerCase() + ' ' + primo.numero + ' di ' + M.fornitore(primo.fornitore_id).breve + ': controlla i dati e abbinalo.' : letti + ' documenti letti: controllali e abbinali.');
    location.hash = '#/documenti/' + primo.id;
  }
  CRM.caricaDocumenti = carica;
  CRM.alCaricamento = files => carica(files);

  function vistaDocumenti(idSel) {
    const docs = M.S.in_arrivo;
    const corpo = CRM.Pagina({
      voce: 'documenti', titolo: 'Documenti', pieno: true,
      sottotitolo: 'Qui entrano tutti i documenti dei fornitori: ordini, conferme, fatture, note di credito e bollettini. Caricali, controlla i dati letti e abbinali: la pratica avanza da sola.'
    });
    const col = CRM.blocco(corpo, 'colonne posta riempi');
    const sx = CRM.Pannello(col, { titolo: 'Da controllare', nota: String(docs.length), riempi: true });
    CRM.Caricamento(sx.corpo, { titolo: 'Trascina qui i documenti', testo: 'PDF di ordini, conferme, fatture e note di credito; bollettini in PDF o Excel', accetta: ACCETTA, onFile: f => carica(f) });
    if (!docs.length) {
      CRM.Nota(sx.corpo, 'Nessun documento da controllare.').style.marginTop = '12px';
      const dx = CRM.Pannello(col, { titolo: 'Come entrano i documenti', riempi: true });
      CRM.Elenco(dx.corpo, [
        { testo: '<b>Carica</b> il file qui o con <b>Carica documenti</b> nella barra a sinistra, da qualsiasi pagina.' },
        { testo: '<b>Lettura automatica</b>: il sistema riconosce fornitore, tipo, numero, data, codice cliente e righe.' },
        { testo: '<b>Controlla</b> i dati letti e correggili se serve.' },
        { testo: '<b>Abbina</b>: un ordine apre una nuova pratica; conferme, fatture e note di credito si agganciano alla pratica proposta; un bollettino si registra e si verifica riga per riga.' }
      ]);
      CRM.Nota(dx.corpo, 'Nel prototipo la lettura è simulata: qualsiasi file produce uno dei documenti di esempio.').style.marginTop = '12px';
      return;
    }
    const sel = docs.find(d => d.id === Number(idSel)) || docs[0];
    CRM.blocco(sx.corpo, '', 'height:12px');
    CRM.ElencoSelezionabile(sx.corpo, docs.map(d => {
      const pr = M.proposta(d);
      return { id: d.id, href: '#/documenti/' + d.id, titolo: M.TIPI[d.tipo] + ' ' + d.numero, valore: M.euro(pr.importo),
        sotto: M.fornitore(d.fornitore_id).breve + ' · caricato il ' + M.data(d.ricevuto), stato: CRM.stato(ESITO[pr.esito][0], ESITO[pr.esito][1]) + statoLetturaHtml(d) };
    }), sel.id);

    const pr = M.proposta(sel);
    const f = M.fornitore(sel.fornitore_id);
    const ab = pr.abbinamento;
    const boll = sel.tipo === 'bollettino';
    const stl = M.statoLettura(sel);
    const dx = CRM.Pannello(col, { titolo: M.TIPI[sel.tipo] + ' ' + sel.numero + ' · ' + f.breve, riempi: true, nota: CRM.icona('file') + ' ' + e(sel.file),
      azioni: [{ etichetta: 'Correggi i dati letti', onClick: () => correggi(sel), conta: stl.n || null, contaVariante: stl.livello === 'bassa' ? 'errore' : 'attesa',
        contaTitolo: stl.n + (stl.n === 1 ? ' punto da controllare' : ' punti da controllare') }, { etichetta: 'Scarta il documento', variante: 'pericolo', onClick: () => scarta(sel) }] });
    dx.corpo.insertAdjacentHTML('beforeend', '<h3>Letto dal documento</h3>');
    CRM.Dettagli(dx.corpo, (boll ? [
      { etichetta: 'Fornitore', valore: e(f.nome) },
      { etichetta: 'Mese', valore: M.mese(sel.mese, sel.anno) },
      { etichetta: 'Totale riconosciuto', valore: M.euro(pr.importo) }
    ] : [
      { etichetta: 'Fornitore', valore: e(f.nome) },
      { etichetta: 'Tipo', valore: M.TIPI[sel.tipo] },
      { etichetta: 'Data del documento', valore: M.data(sel.data) },
      { etichetta: 'Codice cliente', valore: e(sel.codice_cliente) + (ab ? '<span class="sec-riga">' + e(M.nomeCliente(ab.cliente_piva)) + '</span>' : ' ' + CRM.stato('errore', 'non trovato fra i clienti ' + f.breve)) },
      { etichetta: 'Importo', valore: M.euro(pr.importo) }
    ]), { inColonne: true });
    CRM.blocco(dx.corpo, '', 'height:18px;flex:none');
    CRM.DataTable(dx.corpo, boll ? {
      compatta: true, naturale: true, righe: sel.righe, etichettaTotale: 'Totale',
      colonne: [
        { key: 'numero', header: 'Documento', grow: true },
        { key: 'data', header: 'Data', tipo: 'data' },
        { key: 'imponibile', header: 'Imponibile', tipo: 'euro' },
        { key: 'pct', header: '%', tipo: 'pct' },
        { key: 'importo', header: 'Provvigione', tipo: 'euro', totale: 'somma' }
      ]
    } : {
      compatta: true, naturale: true, righe: sel.righe, etichettaTotale: 'Totale',
      colonne: [
        { key: 'codice', header: 'Articolo' },
        { key: 'descrizione', header: 'Descrizione', grow: true },
        { key: 'qta', header: 'Quantità', tipo: 'numero' },
        { key: 'prezzo', header: 'Prezzo', tipo: 'euro' },
        { key: 'importo', header: 'Importo', tipo: 'euro', valore: r => M.importoRiga(r), totale: 'somma' }
      ]
    });

    if (boll) {
      dx.corpo.insertAdjacentHTML('beforeend', '<h3>Cosa farne</h3>');
      if (pr.esito === 'doppio') CRM.Nota(dx.corpo, 'Il bollettino di ' + M.meseMin(sel.mese) + ' di ' + e(f.breve) + ' è già registrato: <a href="#/bollettini/' + pr.esistente.id + '">aprilo</a>. Se questo è la versione rettificata, correggi il mese o scartalo.');
      else CRM.Scelte(dx.corpo, [{
        titolo: 'Registra il bollettino di ' + M.mese(sel.mese, sel.anno), consigliata: true,
        punti: [sel.righe.length + (sel.righe.length === 1 ? ' riga letta' : ' righe lette') + ', totale ' + M.euro(pr.importo),
          'dopo la registrazione lo confronti riga per riga con le nostre pratiche'],
        azione: { etichetta: 'Registra e verifica', onClick: () => seAffidabile(sel, () => { const b = M.registraBollettino(sel.id); M.salva(); CRM.Avviso('Bollettino registrato: ora verificalo'); location.hash = '#/bollettini/' + b.id; }) }
      }]);
    } else if (sel.tipo === 'ordine') {
      dx.corpo.insertAdjacentHTML('beforeend', '<h3>Nuova pratica</h3>');
      if (pr.esito === 'doppio') CRM.Nota(dx.corpo, 'Esiste già la pratica <a href="#/pratiche/' + pr.esistente.id + '">' + e(pr.esistente.numero) + '</a>: controlla il numero letto o scarta il documento.');
      else if (pr.esito === 'nessuno') CRM.Nota(dx.corpo, 'Il codice ' + e(sel.codice_cliente) + ' non corrisponde a nessun cliente di ' + e(f.breve) +
        '. Correggi il codice letto oppure, se è un cliente nuovo, aggiungilo in <a href="#/abbinamenti">Clienti e abbinamenti</a>.');
      else {
        const sub = M.subagente(ab.subagente_id);
        CRM.Scelte(dx.corpo, [{
          titolo: sel.numero + ' · ' + M.nomeCliente(ab.cliente_piva), sottotitolo: CRM.stato('attesa', 'Attesa conferma'), consigliata: true,
          punti: ['codice cliente ' + e(ab.codice) + ' = ' + e(M.nomeCliente(ab.cliente_piva)), 'seguita da ' + e(sub.nome) + ', sconto ' + M.pct(ab.sconto),
            'conferma attesa entro ' + f.giorni_conferma + ' giorni, poi parte il sollecito'],
          azione: { etichetta: 'Apri la pratica', onClick: () => seAffidabile(sel, () => { const p = M.apriPratica(sel.id); M.salva(); CRM.Avviso('Aperta la pratica ' + p.numero); location.hash = '#/pratiche/' + p.id; }) }
        }]);
      }
    } else {
      dx.corpo.insertAdjacentHTML('beforeend', '<h3>' + (pr.esito === 'nessuno' ? 'A quale pratica appartiene?' : 'Pratica proposta') + '</h3>');
      if (pr.esito === 'nessuno') CRM.Nota(dx.corpo, 'Il codice ' + e(sel.codice_cliente) + ' non corrisponde a nessun cliente di ' + e(f.breve) +
        '. Scegli la pratica a mano oppure, se è un cliente nuovo, aggiungi il codice in <a href="#/abbinamenti">Clienti e abbinamenti</a>.').style.marginBottom = '12px';
      let candidati = pr.candidati;
      if (pr.esito === 'nessuno') candidati = M.S.pratiche.filter(p => p.fornitore_id === sel.fornitore_id && (sel.tipo === 'conferma' ? !M.doc(p, 'conferma') : !M.fiscali(p).some(d => d.tipo === 'fattura')))
        .map(p => ({ pratica: p, motivi: ['pratica ' + f.breve + ' ancora aperta'], delta: M.r2(pr.importo - M.importoDoc(M.doc(p, 'conferma') || M.doc(p, 'ordine'))) }));
      CRM.Scelte(dx.corpo, candidati.map((c, i) => {
        const p = c.pratica;
        const prima = M.statoPratica(p).etichetta;
        const dopo = sel.tipo === 'conferma' ? 'Confermata' : sel.tipo === 'fattura' ? 'Fatturata' : prima;
        const rif = M.doc(p, 'conferma') ? 'alla conferma' : 'all’ordine';
        return {
          titolo: p.numero + ' · ' + M.nomeCliente(p.cliente_piva),
          sottotitolo: CRM.statoPratica(p) + (prima !== dopo ? ' › ' + CRM.stato(dopo === 'Fatturata' ? 'ok' : 'info', dopo) : ''),
          punti: c.motivi.map(e).concat([Math.abs(c.delta) < 0.01 ? 'importo uguale ' + rif : '<span class="' + CRM.classeSegno(c.delta) + '">' + CRM.euroSegno(c.delta) + '</span> rispetto ' + rif]),
          consigliata: i === 0 && pr.esito !== 'nessuno',
          azione: { etichetta: 'Abbina a ' + p.numero, onClick: () => seAffidabile(sel, () => abbina(sel, p)) }
        };
      }), 'Nessuna pratica aperta di ' + f.breve + ' a cui abbinarlo.');
      const altra = CRM.blocco(dx.corpo, 'abbina-altra');
      altra.innerHTML = '<span class="testo-tenue">Oppure abbina a un’altra pratica di ' + e(f.breve) + ':</span>' + CRM.campoRicercaHtml({ entita: 'pratica', placeholder: 'Numero pratica o cliente', contesto: { fornitore_id: sel.fornitore_id } }) +
        '<button type="button" class="btn sec" disabled>Abbina</button>';
      CRM.attivaRicerche(altra, () => ({ fornitore_id: sel.fornitore_id }));
      let scelta = null;
      const btn = CRM.$('.btn', altra);
      altra.addEventListener('ricerca-scelta', ev => { scelta = ev.detail.voce; btn.disabled = false; btn.textContent = 'Abbina a ' + scelta.numero; });
      altra.addEventListener('change', () => { if (!CRM.$('input[type=hidden]', altra).value || !M.pratica(Number(CRM.$('input[type=hidden]', altra).value))) { scelta = null; btn.disabled = true; btn.textContent = 'Abbina'; } });
      btn.addEventListener('click', () => { if (scelta) seAffidabile(sel, () => abbina(sel, scelta)); });
    }
  }
  /* Stato della lettura per l'elenco e conferma prima di usare dati poco affidabili. */
  function statoLetturaHtml(d) {
    const st = M.statoLettura(d);
    return st.n ? ' ' + CRM.stato(st.livello === 'bassa' ? 'errore' : 'attesa', st.n + (st.n === 1 ? ' punto da controllare' : ' punti da controllare')) : '';
  }
  async function seAffidabile(d, fn) {
    const st = M.statoLettura(d);
    if (st.livello === 'bassa' && !(await CRM.Conferma('Lettura con affidabilità bassa',
      'Ci sono ' + st.n + (st.n === 1 ? ' punto da controllare' : ' punti da controllare') + ' nei dati letti. Conviene correggerli prima: vuoi procedere comunque?', 'Procedi comunque'))) return;
    fn();
  }
  async function scarta(sel) {
    if (!(await CRM.Conferma('Scartare ' + M.TIPI[sel.tipo].toLowerCase() + ' ' + sel.numero + '?', 'Il documento esce da questo elenco e non viene registrato: usalo per doppioni o documenti che non riguardano Decobrands.', 'Scarta', true))) return;
    M.scarta(sel.id); M.salva(); CRM.Avviso('Documento ' + sel.numero + ' scartato'); location.hash = '#/documenti';
  }

  /* ---------- Correggi i dati letti: FinestraAffiancata (spec §6.5 punto 7) ----------
     A sinistra il documento com'è stampato, a destra testata e righe modificabili.
     Campi incerti bordati (giallo 0,70–0,90 · rosso < 0,70); selezionando un campo
     si evidenzia nel documento il punto da cui è stato letto. */
  const COLONNE_RIGHE = {
    articoli: [{ k: 'codice', t: 'Articolo' }, { k: 'descrizione', t: 'Descrizione', largo: true }, { k: 'qta', t: 'Quantità', n: true }, { k: 'prezzo', t: 'Prezzo', n: true }],
    bollettino: [{ k: 'numero', t: 'Documento' }, { k: 'data', t: 'Data', data: true }, { k: 'imponibile', t: 'Imponibile', n: true }, { k: 'pct', t: '%', n: true }, { k: 'importo', t: 'Provvigione', n: true }]
  };
  const ETICHETTE = { tipo: 'Tipo', numero: 'Numero', data: 'Data', fornitore_id: 'Fornitore', codice_cliente: 'Codice cliente', totale: 'Totale del documento', mese: 'Mese', anno: 'Anno' };
  const nomeCampo = (c, boll) => {
    const m = /^righe\.(\d+)\.(\w+)$/.exec(c);
    if (!m) return ETICHETTE[c] || c;
    const col = COLONNE_RIGHE[boll ? 'bollettino' : 'articoli'].find(x => x.k === m[2]);
    return (col ? col.t : m[2]) + ' riga ' + (Number(m[1]) + 1);
  };
  const classeAff = (a, ver) => ver ? 'campo-verificato' : a < M.SOGLIA_BASSA ? 'incerto-errore' : a < M.SOGLIA_OK ? 'incerto-attesa' : '';

  function correggi(d) {
    const boll = d.tipo === 'bollettino';
    const cols = COLONNE_RIGHE[boll ? 'bollettino' : 'articoli'];
    const l = d.lettura || {};
    // bozza di lavoro: le righe portano con sé affidabilità e verifiche, così aggiunte ed eliminazioni non le confondono
    const b = { tipo: d.tipo, numero: d.numero, data: d.data, fornitore_id: d.fornitore_id, codice_cliente: d.codice_cliente, mese: d.mese, anno: d.anno,
      totale: M.totaleStampato(d).toFixed(2), aff: {}, ver: {}, toccati: {} };
    Object.keys(l.campi || {}).filter(c => !/^righe\./.test(c)).forEach(c => { b.aff[c] = l.campi[c]; });
    Object.keys(l.verificati || {}).filter(c => !/^righe\./.test(c)).forEach(c => { b.ver[c] = true; });
    b.righe = d.righe.map((r, i) => {
      const x = Object.assign({}, r, { _aff: {}, _ver: {} });
      cols.forEach(c => { const k = 'righe.' + i + '.' + c.k; if (l.campi && l.campi[k] != null) x._aff[c.k] = l.campi[k]; if (M.verificato(d, k)) x._ver[c.k] = true; });
      return x;
    });
    const affT = c => b.aff[c] != null ? b.aff[c] : M.affidabilita(d, c);
    // documento "virtuale" dalla bozza per ricalcolare controlli e livello
    const comeDoc = () => {
      const campi = {}, verificati = {};
      Object.keys(b.aff).forEach(c => { campi[c] = b.aff[c]; });
      Object.keys(b.ver).forEach(c => { verificati[c] = true; });
      b.righe.forEach((r, i) => { Object.keys(r._aff).forEach(k => { campi['righe.' + i + '.' + k] = r._aff[k]; }); Object.keys(r._ver).forEach(k => { verificati['righe.' + i + '.' + k] = true; }); });
      return { id: d.id, tipo: b.tipo, fornitore_id: Number(b.fornitore_id), codice_cliente: b.codice_cliente, mese: Number(b.mese), anno: Number(b.anno),
        righe: b.righe.map(r => { const x = Object.assign({}, r); cols.filter(c => c.n).forEach(c => { x[c.k] = Number(x[c.k]) || 0; }); return x; }),
        lettura: { campi: campi, verificati: verificati, totale: Number(b.totale) || 0 } };
    };

    let fin;
    const anteprima = host => {
      const f = M.fornitore(d.fornitore_id);
      const o = (c, v) => M.originale(d, c, v);
      const intest = boll
        ? '<div class="doc-titolo">Provisionsabrechnung · Bollettino provvigioni</div><div class="doc-meta"><span>Periodo <b data-campo="mese">' + M.mese(d.mese, d.anno) + '</b></span><span>Agente: Decobrands SRL</span></div>'
        : '<div class="doc-titolo">' + e(M.TIPI[d.tipo]).toUpperCase() + ' N. <b data-campo="numero">' + e(o('numero', d.numero)) + '</b></div>' +
          '<div class="doc-meta"><span>Data <b data-campo="data">' + M.data(o('data', d.data)) + '</b></span><span>Cod. cliente <b data-campo="codice_cliente">' + e(o('codice_cliente', d.codice_cliente)) + '</b></span><span>Agente: Decobrands SRL</span></div>';
      const th = cols.map(c => '<th' + (c.n ? ' class="dx"' : '') + '>' + e(c.t) + '</th>').join('') + (boll ? '' : '<th class="dx">Importo</th>');
      const fmt = (c, v) => c.data ? M.data(v) : c.k === 'pct' ? M.num(v) + '%' : c.k === 'qta' ? M.num(v) : c.n ? M.dec(v) : e(v);
      const righe = d.righe.map((r, i) => '<tr data-riga="' + i + '">' + cols.map(c => '<td' + (c.n ? ' class="dx"' : '') + ' data-campo="righe.' + i + '.' + c.k + '">' + fmt(c, o('righe.' + i + '.' + c.k, r[c.k])) + '</td>').join('') +
        (boll ? '' : '<td class="dx">' + M.dec(o('righe.' + i + '.qta', r.qta) * o('righe.' + i + '.prezzo', r.prezzo)) + '</td>') + '</tr>').join('');
      host.innerHTML = '<div class="doc-pagina" aria-label="Anteprima del documento originale"><div class="doc-intest"><div><b class="doc-marchio">' + e(f.nome) + '</b><span>' + e(f.piva ? 'P.IVA ' + f.piva : '') + '</span></div><span class="doc-file">' + CRM.icona('file') + ' ' + e(d.file) + '</span></div>' +
        intest + '<table class="doc-tab"><thead><tr>' + th + '</tr></thead><tbody>' + righe + '</tbody>' +
        '<tfoot><tr><td colspan="' + (cols.length + (boll ? 0 : 1) - 1) + '">Totale' + (boll ? ' provvigioni' : ' documento') + '</td><td class="dx" data-campo="totale"><b>' + M.dec(M.totaleStampato(d)) + '</b></td></tr></tfoot></table>' +
        '<p class="doc-nota">Anteprima simulata del PDF. Nell\'app qui c\'è il file originale; l\'evidenziazione usa la posizione restituita dalla lettura.</p></div>';
    };
    const evidenzia = campo => {
      const pag = CRM.$('.doc-pagina', fin.sinistra);
      CRM.$$('.evidenziato', pag).forEach(x => x.classList.remove('evidenziato'));
      const t = campo && CRM.$('[data-campo="' + campo + '"]', pag);
      if (t) { t.classList.add('evidenziato'); const r = t.closest('tr'); if (r) r.classList.add('evidenziato'); t.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    };

    const campoTestata = (c, tipoInput, valore, opzioni, extra) => {
      const a = affT(c), ver = !!b.ver[c];
      const ctl = tipoInput === 'ricerca'
        ? CRM.campoRicercaHtml({ entita: opzioni, campo: c, valore: valore, contesto: { fornitore_id: b.fornitore_id } })
        : tipoInput === 'select'
        ? '<select data-campo="' + c + '">' + opzioni.map(x => '<option value="' + e(x.value) + '"' + (String(x.value) === String(valore) ? ' selected' : '') + '>' + e(x.label) + '</option>').join('') + '</select>'
        : '<input data-campo="' + c + '" type="' + (tipoInput || 'text') + '"' + (tipoInput === 'number' ? ' step="0.01"' : '') + ' value="' + e(valore == null ? '' : valore) + '"' + (extra === 'sola' ? ' readonly tabindex="-1"' : '') + '>';
      const incerto = a < M.SOGLIA_OK && !ver;
      return '<div class="campo-letto ' + classeAff(a, ver && a < M.SOGLIA_OK) + '" data-box="' + c + '"><label>' + e(ETICHETTE[c] || c) +
        (incerto ? ' <span class="aff" title="Affidabilità della lettura">' + Math.round(a * 100) + '%</span>' : '') + '</label><div class="campo-riga">' + ctl +
        (incerto ? '<button type="button" class="conferma-campo" data-conferma="' + c + '" title="Il valore è giusto: confermalo">✓</button>' : '') + '</div>' + (extra && extra !== 'sola' ? extra : '') + '</div>';
    };
    const destra = host => {
      const st = M.statoLettura(comeDoc());
      const opF = M.S.fornitori.map(f => ({ value: f.id, label: f.nome }));
      const ab = !boll && M.abbinamentoPerCodice(Number(b.fornitore_id), b.codice_cliente);
      const somma = M.importoLetto(comeDoc());
      host.innerHTML = '<div class="aff-riepilogo" id="aff-riep"></div>' +
        '<h3>Testata</h3><div class="griglia-letti">' + (boll
          ? campoTestata('fornitore_id', 'ricerca', b.fornitore_id, 'fornitore') +
            campoTestata('mese', 'select', b.mese, M.MESI.map((m, i) => ({ value: i + 1, label: m[0].toUpperCase() + m.slice(1) }))) +
            campoTestata('anno', 'number', b.anno)
          : campoTestata('tipo', 'select', b.tipo, ['ordine', 'conferma', 'fattura', 'nota_credito'].map(t => ({ value: t, label: M.TIPI[t] }))) +
            campoTestata('numero', 'text', b.numero) +
            campoTestata('data', 'date', b.data) +
            campoTestata('fornitore_id', 'ricerca', b.fornitore_id, 'fornitore') +
            campoTestata('codice_cliente', 'ricerca', b.codice_cliente, 'codiceCliente', '<span class="esito-campo">' + (ab ? '<span class="pallino ok"></span>' + e(M.nomeCliente(ab.cliente_piva)) : '<span class="pallino ko"></span>non trovato fra i clienti del fornitore') + '</span>') +
            campoTestata('totale', 'number', b.totale, null, '<span class="esito-campo">' + (Math.abs((Number(b.totale) || 0) - somma) < 0.01
              ? '<span class="pallino ok"></span>uguale alla somma delle righe' : '<span class="pallino ko"></span>somma delle righe ' + M.euro(somma)) + '</span>')) +
        '</div><div class="righe-testa"><h3>Righe <span class="testo-tenue">' + b.righe.length + '</span></h3><button type="button" class="btn sec piccolo" data-aggiungi="1">' + CRM.icona('piu') + 'Aggiungi riga</button></div>';
      // righe: DataTable standard con celle modificabili; ogni riga ricorda la sua posizione (_i) anche se si ordina
      b.righe.forEach((r, i) => { r._i = i; });
      const affR = (r, k) => r._aff[k] != null ? r._aff[k] : 0.97;
      const cella = c => r => {
        const a = affR(r, c.k), incerto = a < M.SOGLIA_OK && !r._ver[c.k], v = r[c.k];
        const val = v == null ? '' : (c.n && c.k !== 'qta' && v !== '' ? Number(v).toFixed(2) : v);
        if (boll && c.k === 'numero') return '<div class="campo-riga">' + CRM.campoRicercaHtml({ entita: 'documentoFiscale', campo: 'righe.' + r._i + '.numero', valore: v, contesto: { fornitore_id: b.fornitore_id } }) +
          (incerto ? '<button type="button" class="conferma-campo" data-conferma="righe.' + r._i + '.numero" title="Il valore è giusto: confermalo">✓</button>' : '') + '</div>';
        return '<div class="campo-riga">' +
          '<input data-campo="righe.' + r._i + '.' + c.k + '"' + (c.largo ? ' title="' + e(v || '') + '"' : '') + ' type="' + (c.data ? 'date' : c.n ? 'number' : 'text') + '"' + (c.n ? ' step="any"' : '') + ' value="' + e(val) + '"' +
          (incerto ? ' title="Affidabilità della lettura ' + Math.round(a * 100) + '%"' : '') + '>' +
          (incerto ? '<button type="button" class="conferma-campo" data-conferma="righe.' + r._i + '.' + c.k + '" title="Il valore è giusto: confermalo">✓</button>' : '') + '</div>';
      };
      CRM.DataTable(CRM.blocco(host, 'riempi aff-righe tab-righe'), {
        compatta: true, righe: b.righe, etichettaTotale: 'Totale righe', rowClass: r => r._nuova ? 'nuova' : '',
        emptyText: 'Nessuna riga', emptyHint: 'Aggiungi le righe del documento.',
        colonne: [{ key: '_i', header: '#', tipo: 'numero', valore: r => r._i + 1, classe: 'testo-tenue' }]
          .concat(cols.map(c => ({
            key: c.k, header: c.t, tipo: c.n ? 'numero' : 'testo', grow: !!c.largo, cell: cella(c),
            sortValue: r => c.n ? Number(r[c.k]) || 0 : String(r[c.k] || '').toLowerCase(),
            classe: r => [classeAff(affR(r, c.k), !!r._ver[c.k] && affR(r, c.k) < M.SOGLIA_OK), c.largo ? 'largo' : c.k === 'codice' || c.k === 'numero' ? 'col-codice' : ''].join(' '),
            totale: boll && c.k === 'importo' ? 'somma' : undefined, valore: c.n ? (r => Number(r[c.k]) || 0) : undefined
          })))
          .concat(boll ? [] : [{ key: 'importo', header: 'Importo', tipo: 'euro', valore: r => M.r2((Number(r.qta) || 0) * (Number(r.prezzo) || 0)), totale: 'somma', classe: 'calcolato' }])
          .concat([{ key: 'elimina', header: '', sortable: false, cell: r => '<button type="button" class="btn testo piccolo" data-elimina="' + r._i + '" title="Elimina la riga" aria-label="Elimina la riga ' + (r._i + 1) + '">✕</button>' }])
      });
      // riepilogo: livello, controlli falliti e campi incerti, con salto al campo
      const riep = CRM.$('#aff-riep', host);
      const LIV = { affidabile: ['ok', 'Lettura affidabile'], da_controllare: ['attesa', 'Da controllare'], bassa: ['errore', 'Affidabilità bassa'] }[st.livello];
      riep.innerHTML = '<div class="riep-testa">' + CRM.stato(LIV[0], LIV[1]) + ' <span>' + (st.n ? st.n + (st.n === 1 ? ' punto da controllare' : ' punti da controllare') : 'tutti i campi sono controllati') + '</span></div>' +
        (st.n ? '<ul>' + st.controlli.map(c => '<li class="' + (c.grave ? 'grave' : '') + '"><button type="button" class="btn testo piccolo" data-vai="' + c.campo + '">' + e(c.testo) + '</button></li>').join('') +
          st.campi.map(c => '<li><button type="button" class="btn testo piccolo" data-vai="' + c + '">' + e(nomeCampo(c, boll)) + ': letto con affidabilità ' + Math.round(M.affidabilita(comeDoc(), c) * 100) + '%</button></li>').join('') + '</ul>' : '');
      fin.piede.innerHTML = st.n ? '<b>' + st.n + '</b> ' + (st.n === 1 ? 'punto da controllare' : 'punti da controllare') : '<span style="color:var(--ok-testo)">Tutto controllato</span>';
    };
    const ridisegna = () => { const y = fin.destra.scrollTop; destra(fin.destra); fin.destra.scrollTop = y; };
    const valoreDa = (campo, v) => { const m = /^righe\.(\d+)\.(\w+)$/.exec(campo); if (m) { b.righe[m[1]][m[2]] = v; b.righe[m[1]]._ver[m[2]] = true; } else { b[campo] = v; b.ver[campo] = true; } b.toccati[campo] = true; };
    const conferma = campo => { const m = /^righe\.(\d+)\.(\w+)$/.exec(campo); if (m) b.righe[m[1]]._ver[m[2]] = true; else b.ver[campo] = true; };
    // eventi delegati sul pannello destro: restano validi anche quando la DataTable si ridisegna (ordinamento)
    const trovaCampo = c => CRM.$('[data-evidenzia="' + c + '"]', fin.destra) || CRM.$('[data-campo="' + c + '"]', fin.destra);
    function collega(host) {
      const vai = c => { const n = trovaCampo(c); if (n) { n.focus(); n.scrollIntoView({ block: 'center', behavior: 'smooth' }); } };
      CRM.attivaRicerche(host, () => ({ fornitore_id: b.fornitore_id, mese: b.mese, anno: b.anno }));
      host.addEventListener('focusin', ev => { const x = ev.target.closest('[data-campo], [data-evidenzia]'); if (x) evidenzia(x.dataset.campo || x.dataset.evidenzia); });
      host.addEventListener('ricerca-scelta', ev => {
        const m = /^righe\.(\d+)\.numero$/.exec(ev.detail.campo || ''); if (!m || !boll) return;
        const r = b.righe[m[1]], x = ev.detail.voce;
        r.data = x.doc.data; r.imponibile = M.importoDoc(x.doc); r._ver.data = true; r._ver.imponibile = true;
      });
      host.addEventListener('change', ev => {
        const x = ev.target.closest('[data-campo]'); if (!x) return;
        valoreDa(x.dataset.campo, x.value); ridisegna(); const n = trovaCampo(x.dataset.campo); if (n) n.focus();
      });
      host.addEventListener('click', ev => {
        const t = ev.target.closest('[data-conferma], [data-vai], [data-elimina], [data-aggiungi]'); if (!t) return;
        if (t.dataset.conferma) { conferma(t.dataset.conferma); ridisegna(); }
        else if (t.dataset.vai) vai(t.dataset.vai);
        else if (t.dataset.elimina != null) { b.righe.splice(Number(t.dataset.elimina), 1); b.toccati.righe = true; ridisegna(); }
        else {
          const r = { _aff: {}, _ver: {}, _nuova: true }; cols.forEach(c => { r[c.k] = c.n ? 0 : ''; }); b.righe.push(r); b.toccati.righe = true; ridisegna();
          vai('righe.' + (b.righe.length - 1) + '.' + cols[0].k);
        }
      });
    }
    const salva = () => {
      const v = comeDoc();
      if (!boll && !String(b.numero || '').trim()) { CRM.Avviso('Il numero del documento è obbligatorio'); return false; }
      Object.assign(d, { tipo: v.tipo, fornitore_id: v.fornitore_id, righe: v.righe.map(r => { const x = Object.assign({}, r); delete x._aff; delete x._ver; delete x._nuova; delete x._i; return x; }) });
      if (boll) { d.mese = v.mese; d.anno = v.anno || d.anno; d.numero = M.MESI[d.mese - 1] + ' ' + d.anno; }
      else Object.assign(d, { numero: String(b.numero).trim(), data: b.data || d.data, codice_cliente: String(b.codice_cliente || '').trim() });
      d.lettura = Object.assign({}, d.lettura || {}, { campi: v.lettura.campi, verificati: v.lettura.verificati, totale: v.lettura.totale });
      const st = M.statoLettura(d), n = Object.keys(b.toccati).length;
      M.annota('Controllati i dati letti di ' + M.TIPI[d.tipo].toLowerCase() + ' ' + d.numero + (n ? ' · ' + n + (n === 1 ? ' correzione' : ' correzioni') : ''));
      M.salva();
      CRM.Avviso(st.n ? 'Dati salvati: restano ' + st.n + (st.n === 1 ? ' punto da controllare' : ' punti da controllare') : 'Dati salvati: lettura controllata, l’abbinamento è ricalcolato');
      CRM.naviga();
    };
    fin = CRM.FinestraAffiancata({
      titolo: 'Correggi i dati letti · ' + M.TIPI[d.tipo] + ' ' + d.numero,
      sottotitolo: 'A sinistra il documento, a destra i dati letti. Correggi o conferma i campi bordati: selezionandone uno lo vedi evidenziato nel documento.',
      sinistra: anteprima, larghezza: 42, azioni: [{ etichetta: 'Annulla', variante: 'sec' }, { etichetta: 'Salva e ricalcola l’abbinamento', onClick: salva }]
    });
    collega(fin.destra);
    destra(fin.destra);
    const primo = CRM.$('.incerto-errore .ricerca-testo, .incerto-errore [data-campo]:not([type=hidden]), .incerto-attesa .ricerca-testo, .incerto-attesa [data-campo]:not([type=hidden])', fin.destra);
    if (primo) primo.focus();
  }

  function abbina(doc, p) {
    const esito = M.abbina(doc.id, p.id);
    let extra = '';
    if (doc.tipo === 'fattura') {
      const b = M.S.bollettini.find(x => x.fornitore_id === doc.fornitore_id && x.righe.some(r => r.numero === doc.numero));
      if (b) { const r = M.riconcilia(b).righe.find(x => x.numero === doc.numero); if (r && r.categoria === 'quadra') extra = ' Nel bollettino di ' + M.meseMin(b.mese) + ' ora la riga quadra.'; }
    }
    M.salva();
    CRM.Avviso(M.TIPI[doc.tipo] + ' ' + doc.numero + ' abbinata a ' + p.numero + (esito.prima !== esito.dopo ? ': ora ' + esito.dopo.toLowerCase() + '.' : '.') + extra);
    location.hash = M.S.in_arrivo.length ? '#/documenti/' + M.S.in_arrivo[0].id : '#/documenti';
  }
  CRM.rotta(/^\/documenti$/, () => vistaDocumenti(null));
  CRM.rotta(/^\/documenti\/(\d+)$/, id => vistaDocumenti(id));

  /* ---------- Pratiche: FilterBar + DataTable ---------- */
  let filtri = { stato: 'tutte', q: '' };
  CRM.rotta(/^\/pratiche$/, function () {
    const corpo = CRM.Pagina({ voce: 'pratiche', titolo: 'Pratiche', pieno: true, sottotitolo: 'Ogni ordine a fornitore con i suoi documenti. Lo stato avanza quando arrivano conferma e fattura.' });
    const tutte = M.S.pratiche;
    const REGOLE = {
      tutte: () => true, scaduta: p => M.statoPratica(p).chiave === 'scaduta', attesa: p => M.statoPratica(p).chiave === 'attesa',
      confermata: p => M.statoPratica(p).chiave === 'confermata', fatturata: p => M.statoPratica(p).chiave === 'fatturata', variazioni: p => M.haVariazioni(p)
    };
    const ETICH = { tutte: 'Tutte', scaduta: 'Conferma in ritardo', attesa: 'Attesa conferma', confermata: 'Attesa fattura', fatturata: 'Fatturate', variazioni: 'Con variazioni' };
    CRM.FilterBar(corpo, {
      campi: [
        { nome: 'stato', tipo: 'segmenti', valore: filtri.stato, opzioni: Object.keys(REGOLE).map(k => ({ value: k, label: ETICH[k], n: tutte.filter(REGOLE[k]).length })) },
        { nome: 'q', tipo: 'cerca', valore: filtri.q, placeholder: 'Cerca pratica, cliente, documento' }
      ],
      onChange: v => { filtri = v; aggiorna(); }
    });
    const tab = CRM.DataTable(CRM.blocco(corpo, 'riempi'), {
      colonne: [
        { key: 'numero', header: 'Pratica', cell: p => '<a href="#/pratiche/' + p.id + '"><b>' + e(p.numero) + '</b></a>' },
        { key: 'cliente', header: 'Cliente', grow: true, valore: p => M.nomeCliente(p.cliente_piva) },
        { key: 'fornitore', header: 'Fornitore', valore: p => M.fornitore(p.fornitore_id).breve },
        { key: 'data', header: 'Data ordine', tipo: 'data' },
        { key: 'importo', header: 'Importo', tipo: 'euro', valore: p => M.importoPratica(p) },
        { key: 'stato', header: 'Stato', sortValue: p => ['scaduta', 'attesa', 'confermata', 'fatturata'].indexOf(M.statoPratica(p).chiave),
          cell: p => { const s = M.statoPratica(p); return CRM.statoPratica(p) + (s.nota ? '<span class="sec-riga">' + e(s.nota) + '</span>' : '') + (M.haVariazioni(p) ? '<span class="sec-riga" style="color:var(--attesa-testo)">variazioni fra le fasi</span>' : ''); } },
        { key: 'sub', header: 'Subagente', valore: p => { const a = M.abbinamento(p.cliente_piva, p.fornitore_id); return a ? M.subagente(a.subagente_id).nome : '—'; } }
      ],
      ordinamentoIniziale: { key: 'stato', dir: 'asc' },
      onRowClick: p => { location.hash = '#/pratiche/' + p.id; },
      emptyText: 'Nessuna pratica', emptyHint: 'Prova a togliere il filtro o a cambiare la ricerca.'
    });
    function aggiorna() {
      const q = filtri.q.trim().toLowerCase();
      tab.aggiorna(tutte.filter(REGOLE[filtri.stato]).filter(p => !q || [p.numero, M.nomeCliente(p.cliente_piva), M.fornitore(p.fornitore_id).nome].concat(p.documenti.map(d => d.numero)).some(x => x.toLowerCase().indexOf(q) >= 0)));
    }
    aggiorna();
  });

  /* ---------- Pratica: Binario + DataTable confronto + Cifre provvigione + Elenco documenti ---------- */
  CRM.rotta(/^\/pratiche\/(\d+)$/, function (id) {
    const p = M.pratica(id);
    if (!p) { location.hash = '#/pratiche'; return; }
    const f = M.fornitore(p.fornitore_id);
    const ab = M.abbinamento(p.cliente_piva, p.fornitore_id);
    const sub = ab ? M.subagente(ab.subagente_id) : null;
    const s = M.statoPratica(p);
    const corpo = CRM.Pagina({
      voce: 'pratiche', pieno: true, titolo: p.numero, badge: CRM.statoPratica(p),
      briciole: [{ etichetta: 'Pratiche', href: '#/pratiche' }, { etichetta: p.numero }],
      sottotitolo: e(M.nomeCliente(p.cliente_piva)) + ' · ' + e(f.nome) + (sub ? ' · seguita da ' + e(sub.nome) : ' · nessun subagente abbinato'),
      azioni: [{ etichetta: 'Carica un documento', icona: 'carica', variante: 'sec', onClick: () => CRM.scegliFile({ accetta: ACCETTA, onFile: f => carica(f) }) }]
        .concat(s.chiave === 'scaduta' || s.chiave === 'attesa' ? [{ etichetta: 'Prepara il sollecito', icona: 'posta', variante: s.chiave === 'scaduta' ? 'primario' : 'sec', onClick: () => sollecito(p) }] : [])
    });

    const ordine = M.doc(p, 'ordine'), conf = M.doc(p, 'conferma');
    const fatture = M.fiscali(p).filter(d => d.tipo === 'fattura'), nc = M.fiscali(p).filter(d => d.tipo === 'nota_credito');
    const imp = docs => docs.reduce((x, d) => x + M.importoDoc(d), 0);
    const impOrd = M.importoDoc(ordine), impConf = conf ? M.importoDoc(conf) : null;
    const pan = CRM.Pannello(corpo, { senzaMargine: true });
    CRM.Binario(pan.corpo, [
      { titolo: 'Ordine', fatta: true, numero: ordine.numero, data: ordine.data, importo: impOrd },
      conf ? { titolo: 'Conferma', fatta: true, numero: conf.numero, data: conf.data, importo: impConf, delta: M.r2(impConf - impOrd) }
        : { titolo: 'Conferma', ritardo: s.chiave === 'scaduta', testo: s.chiave === 'scaduta' ? 'In ritardo ' + s.nota + ' (attesa entro il ' + M.data(s.scadenza) + ')' : s.scadenza ? 'Attesa entro il ' + M.data(s.scadenza) : 'Attesa' },
      fatture.length ? { titolo: fatture.length > 1 ? 'Fatture' : 'Fattura', fatta: true, numero: fatture[0].numero + (fatture.length > 1 ? ' + ' + (fatture.length - 1) : ''), data: fatture[0].data,
        importo: imp(fatture), delta: M.r2(imp(fatture) - (impConf != null ? impConf : impOrd)) } : { titolo: 'Fattura', testo: 'In attesa' },
      nc.length ? { titolo: 'Nota di credito', fatta: true, numero: nc[0].numero, data: nc[0].data, importo: imp(nc) } : { titolo: 'Nota di credito', assente: true, testo: 'Nessuna' }
    ]);

    const col = CRM.blocco(corpo, 'colonne riempi');
    const fasi = M.fasi(p);
    const conf2 = CRM.Pannello(col, { titolo: 'Righe a confronto', senzaMargine: true, riempi: true,
      nota: fasi.length > 1 ? (M.haVariazioni(p) ? 'le righe evidenziate cambiano fra le fasi' : 'nessuna variazione fra le fasi') : 'il confronto parte quando arriva la conferma' });
    const tutte = M.confronto(p), variate = tutte.filter(r => r.varia);
    if (variate.length) {
      const fb = CRM.FilterBar(conf2.corpo, { campi: [{ nome: 'vista', tipo: 'segmenti', valore: 'variate', opzioni: [
        { value: 'variate', label: 'Solo righe che cambiano', n: variate.length }, { value: 'tutte', label: 'Tutte le righe', n: tutte.length }] }],
        onChange: v => tabConf.aggiorna(v.vista === 'tutte' ? tutte : variate) });
      fb.el.style.cssText = 'padding:10px 14px;flex:none';
    }
    const tabConf = CRM.DataTable(conf2.corpo, {
      compatta: true, righe: variate.length ? variate : tutte, rowClass: r => r.varia ? 'evidenzia' : '',
      colonne: [{ key: 'codice', header: 'Articolo', grow: true, cell: r => '<b>' + e(r.codice) + '</b><span class="sec-riga">' + e(r.descrizione) + '</span>' }]
        .concat(fasi.map((d, i) => ({ key: 'f' + i, header: M.TIPI[d.tipo], align: 'right', sortValue: r => r.per[i] ? M.importoRiga(r.per[i]) : -1,
          cell: r => r.per[i] ? M.num(r.per[i].qta) + ' × ' + M.euro(r.per[i].prezzo) + '<span class="sec-riga">' + M.euro(M.importoRiga(r.per[i])) + '</span>' : '<span class="testo-tenue">assente</span>' })))
        .concat(fasi.length > 1 ? [{ key: 'delta', header: 'Differenza', tipo: 'euro', cell: r => Math.abs(r.delta) < 0.01 ? '<span class="testo-tenue">—</span>' : '<b class="' + CRM.classeSegno(r.delta) + '">' + CRM.euroSegno(r.delta) + '</b>' }] : [])
    });

    const destra = CRM.blocco(col, 'pila', 'overflow:auto');
    const perc = M.percentuali(p, (fatture[0] || ordine).data);
    const base = M.importoPratica(p);
    const prov = CRM.Pannello(destra, { titolo: 'Provvigione', nota: M.fiscali(p).length ? 'sul netto fatturato' : 'prevista' });
    if (!perc) CRM.Nota(prov.corpo, 'Nessun abbinamento cliente × fornitore: la pratica non genera provvigioni. <a href="#/abbinamenti">Aggiungi l’abbinamento</a>.');
    else {
      CRM.Cifre(prov.corpo, [
        { etichetta: 'Imponibile', valore: base },
        { etichetta: 'Sconto al cliente', valore: M.pct(perc.sconto), nota: 'percentuali in vigore dal ' + M.data(perc.scaglione.valido_dal) },
        { etichetta: 'Da ' + f.breve + ' a Decobrands: ' + M.pct(perc.agente) + ' + ' + M.pct(perc.sub_standard), valore: base * perc.dal_fornitore / 100 },
        { etichetta: 'A ' + sub.nome + ': ' + M.pct(perc.sub) + (perc.eccezione ? ' (eccezione personale)' : ''), valore: base * perc.sub / 100 }
      ]);
      CRM.Nota(prov.corpo, e(f.breve) + (f.maturazione === 'maturato' ? ' paga sul maturato: la provvigione del subagente si sblocca quando ' + e(f.breve) + ' la riconosce in un bollettino verificato.' : ' paga sul fatturato: la provvigione del subagente entra nel trimestre della fattura.')).style.marginTop = '10px';
      if (f.maturazione === 'maturato' && M.fiscali(p).length) CRM.Elenco(prov.corpo, M.fiscali(p).map(d => {
        const b = M.riconosciutoIn(d.numero), bb = M.S.bollettini.find(x => x.righe.some(r => r.numero === d.numero));
        return { testo: e(d.numero), destra: b ? CRM.stato('ok', 'riconosciuta da ' + f.breve) : bb ? CRM.stato('attesa', 'nel bollettino di ' + M.meseMin(bb.mese) + ', da verificare') : CRM.stato('neutro', 'non ancora nei bollettini') };
      }));
    }
    const docs = CRM.Pannello(destra, { titolo: 'Documenti', nota: String(p.documenti.length) });
    CRM.Elenco(docs.corpo, p.documenti.map(d => ({
      testo: CRM.icona('file') + ' ' + e(M.TIPI[d.tipo]) + ' <b>' + e(d.numero) + '</b> <span class="testo-tenue">del ' + M.data(d.data) + '</span>' + (d.riferimento ? '<span class="sec-riga">storna ' + e(d.riferimento) + (d.nota ? ' · ' + e(d.nota) : '') + '</span>' : ''),
      destra: '<span class="' + CRM.classeSegno(Math.min(0, M.importoDoc(d))) + '">' + M.euro(M.importoDoc(d)) + '</span>'
    })));
  });

  function sollecito(p) {
    const f = M.fornitore(p.fornitore_id);
    CRM.TestoDaInviare({
      titolo: 'Sollecito di conferma · ' + p.numero, destinatario: f.nome,
      testo: 'Gentili colleghi di ' + f.nome + ',\n\nnon abbiamo ancora ricevuto la conferma del nostro ordine ' + p.numero + ' del ' + M.data(p.data) + ' per il cliente ' + M.nomeCliente(p.cliente_piva) +
        ' (vostro codice ' + ((M.abbinamento(p.cliente_piva, p.fornitore_id) || {}).codice || '—') + '), di ' + M.euro(M.importoDoc(M.doc(p, 'ordine'))) + '.\n\n' +
        'Vi chiediamo di inviarcela appena possibile, indicando eventuali articoli non disponibili.\n\nGrazie,\nDecobrands SRL',
      onCopia: () => { M.annota('Sollecito conferma preparato per ' + p.numero); M.salva(); }
    });
  }
})();
