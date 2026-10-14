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

  /* ---------- Documenti in arrivo: ElencoSelezionabile + Dettagli + DataTable + Scelte ---------- */
  const ESITO = { certo: ['ok', 'Abbinamento sicuro'], probabile: ['attesa', 'Abbinamento da confermare'], ambiguo: ['attesa', 'Da scegliere'], nessuno: ['errore', 'Cliente non riconosciuto'] };
  function vistaDocumenti(idSel) {
    const docs = M.S.in_arrivo;
    const corpo = CRM.Pagina({
      voce: 'documenti', titolo: 'Documenti in arrivo', pieno: true,
      sottotitolo: 'Conferme e fatture lette in automatico. Controlla l’abbinamento proposto e conferma: la pratica avanza da sola.',
      azioni: [{ etichetta: 'Simula l’arrivo di un documento', icona: 'carica', variante: 'sec', onClick: () => {
        const d = M.simulaArrivo();
        if (!d) return CRM.Avviso('Nel prototipo è previsto un solo arrivo simulato: è già stato usato.');
        M.salva(); CRM.Avviso('Arrivata la fattura ' + d.numero + ' di Gries'); location.hash = '#/documenti/' + d.id;
      } }]
    });
    if (!docs.length) {
      const p = CRM.Pannello(corpo, {});
      p.corpo.innerHTML = '<div class="vuoto"><b>Nessun documento da abbinare</b>I documenti dei fornitori compaiono qui appena letti. Puoi simularne uno con il pulsante in alto.</div>';
      return;
    }
    const sel = docs.find(d => d.id === Number(idSel)) || docs[0];
    const col = CRM.blocco(corpo, 'colonne posta riempi');
    const sx = CRM.Pannello(col, { titolo: 'Da abbinare', nota: String(docs.length), riempi: true, senzaMargine: true });
    CRM.ElencoSelezionabile(sx.corpo, docs.map(d => {
      const pr = M.proposta(d);
      return { id: d.id, href: '#/documenti/' + d.id, titolo: M.TIPI[d.tipo] + ' ' + d.numero, valore: M.euro(pr.importo),
        sotto: M.fornitore(d.fornitore_id).breve + ' · arrivato il ' + M.data(d.ricevuto), stato: CRM.stato(ESITO[pr.esito][0], ESITO[pr.esito][1]) };
    }), sel.id);

    const pr = M.proposta(sel);
    const f = M.fornitore(sel.fornitore_id);
    const ab = pr.abbinamento;
    const dx = CRM.Pannello(col, { titolo: M.TIPI[sel.tipo] + ' ' + sel.numero + ' · ' + f.breve, nota: CRM.icona('file') + ' ' + e(sel.file), riempi: true });
    dx.corpo.insertAdjacentHTML('beforeend', '<h3>Letto dal documento</h3>');
    CRM.Dettagli(dx.corpo, [
      { etichetta: 'Fornitore', valore: e(f.nome) },
      { etichetta: 'Data del documento', valore: M.data(sel.data) },
      { etichetta: 'Codice cliente', valore: e(sel.codice_cliente) + ' ' + (ab ? '<span class="testo-tenue">= ' + e(M.nomeCliente(ab.cliente_piva)) + '</span>' : CRM.stato('errore', 'non trovato fra i clienti ' + f.breve)) },
      { etichetta: 'Importo', valore: M.euro(pr.importo) }
    ]);
    CRM.blocco(dx.corpo, '', 'height:14px');
    CRM.DataTable(dx.corpo, {
      compatta: true, naturale: true, righe: sel.righe, etichettaTotale: 'Totale',
      colonne: [
        { key: 'codice', header: 'Articolo' },
        { key: 'descrizione', header: 'Descrizione', grow: true },
        { key: 'qta', header: 'Quantità', tipo: 'numero' },
        { key: 'prezzo', header: 'Prezzo', tipo: 'euro' },
        { key: 'importo', header: 'Importo', tipo: 'euro', valore: r => M.importoRiga(r), totale: 'somma' }
      ]
    });
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
        azione: { etichetta: 'Abbina a ' + p.numero, onClick: () => abbina(sel, p) }
      };
    }), 'Nessuna pratica aperta di ' + f.breve + ' a cui abbinarlo.');
    CRM.blocco(dx.corpo, '', 'margin-top:20px;padding-top:14px;border-top:1px solid var(--bordo-tenue)').innerHTML =
      '<button type="button" class="btn pericolo piccolo" id="scarta">Scarta il documento</button> <span class="testo-tenue piccolo">se è un doppione o non riguarda Decobrands</span>';
    CRM.$('#scarta').addEventListener('click', async () => {
      if (!(await CRM.Conferma('Scartare ' + M.TIPI[sel.tipo].toLowerCase() + ' ' + sel.numero + '?', 'Il documento esce da questo elenco e non viene abbinato a nessuna pratica.', 'Scarta', true))) return;
      M.scarta(sel.id); M.salva(); CRM.Avviso('Documento ' + sel.numero + ' scartato'); location.hash = '#/documenti';
    });
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
      voce: 'pratiche', titolo: p.numero, badge: CRM.statoPratica(p),
      briciole: [{ etichetta: 'Pratiche', href: '#/pratiche' }, { etichetta: p.numero }],
      sottotitolo: e(M.nomeCliente(p.cliente_piva)) + ' · ' + e(f.nome) + (sub ? ' · seguita da ' + e(sub.nome) : ' · nessun subagente abbinato'),
      azioni: s.chiave === 'scaduta' || s.chiave === 'attesa' ? [{ etichetta: 'Prepara il sollecito', icona: 'posta', variante: s.chiave === 'scaduta' ? 'primario' : 'sec', onClick: () => sollecito(p) }] : []
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

    const col = CRM.blocco(corpo, 'colonne');
    const fasi = M.fasi(p);
    const conf2 = CRM.Pannello(col, { titolo: 'Righe a confronto', senzaMargine: true,
      nota: fasi.length > 1 ? (M.haVariazioni(p) ? 'le righe evidenziate cambiano fra le fasi' : 'nessuna variazione fra le fasi') : 'il confronto parte quando arriva la conferma' });
    CRM.DataTable(conf2.corpo, {
      compatta: true, naturale: true, righe: M.confronto(p), rowClass: r => r.varia ? 'evidenzia' : '',
      colonne: [{ key: 'codice', header: 'Articolo', grow: true, cell: r => '<b>' + e(r.codice) + '</b><span class="sec-riga">' + e(r.descrizione) + '</span>' }]
        .concat(fasi.map((d, i) => ({ key: 'f' + i, header: M.TIPI[d.tipo], align: 'right', sortValue: r => r.per[i] ? M.importoRiga(r.per[i]) : -1,
          cell: r => r.per[i] ? M.num(r.per[i].qta) + ' × ' + M.euro(r.per[i].prezzo) + '<span class="sec-riga">' + M.euro(M.importoRiga(r.per[i])) + '</span>' : '<span class="testo-tenue">assente</span>' })))
        .concat(fasi.length > 1 ? [{ key: 'delta', header: 'Differenza', tipo: 'euro', cell: r => Math.abs(r.delta) < 0.01 ? '<span class="testo-tenue">—</span>' : '<b class="' + CRM.classeSegno(r.delta) + '">' + CRM.euroSegno(r.delta) + '</b>' }] : [])
    });

    const destra = CRM.blocco(col, 'pila');
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
