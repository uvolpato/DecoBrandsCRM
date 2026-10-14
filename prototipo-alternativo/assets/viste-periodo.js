/* ============================================================
   Viste "Ogni mese" e "Ogni trimestre": Bollettini, Bollettino, Liquidazioni
   ============================================================ */
(function () {
  'use strict';
  const e = U.esc;
  const MESI_VISTA = [5, 6, 7, 8, 9];
  const ANNO = 2026;

  /* ---------- Bollettini: matrice fornitore × mese ---------- */
  U.rotta(/^\/bollettini$/, function () {
    const corpo = U.pagina({ voce: 'bollettini', titolo: 'Bollettini',
      sotto: 'Ogni mese ogni fornitore ci comunica le provvigioni che ci riconosce. Qui vedi quali sono arrivati e quali vanno ancora verificati.' });
    const m = U.el('div', 'matrice');
    m.style.gridTemplateColumns = 'minmax(170px, 1.2fr) repeat(' + MESI_VISTA.length + ', minmax(120px, 1fr))';
    m.innerHTML = '<div class="intest">Fornitore</div>' + MESI_VISTA.map(x => '<div class="intest">' + M.mese(x, ANNO) + '</div>').join('') +
      M.S.fornitori.map(f => '<div class="fornitore">' + e(f.nome) + '<span>paga sul ' + f.maturazione + '</span></div>' + MESI_VISTA.map(mm => casella(f, mm)).join('')).join('');
    corpo.appendChild(m);
    U.$$('[data-sollecita]', m).forEach(b => b.addEventListener('click', () => {
      const [fid, mm] = b.dataset.sollecita.split('-').map(Number);
      sollecitoBollettino(M.fornitore(fid), mm);
    }));
    const nota = U.el('p', 'testo-tenue piccolo', 'Un bollettino è atteso per ogni mese chiuso in cui il fornitore ci ha fatturato qualcosa. Le righe si confrontano con quanto calcoliamo dalle pratiche: le differenze vanno accettate o contestate prima di chiudere il bollettino.');
    nota.style.margin = '0';
    corpo.appendChild(nota);
  });
  function casella(f, mm) {
    const c = M.casellaBollettino(f.id, ANNO, mm);
    const imp = b => '<span class="imp">' + M.euro(b.righe.reduce((s, r) => s + r.importo, 0)) + '</span>';
    switch (c.tipo) {
      case 'verificato': return '<a class="casella" href="#/bollettini/' + c.b.id + '">' + U.stato('s-ok', 'Verificato') + imp(c.b) + '</a>';
      case 'contestato': return '<a class="casella" href="#/bollettini/' + c.b.id + '">' + U.stato('s-ritardo', 'Contestato') + imp(c.b) + '</a>';
      case 'da_verificare': return '<a class="casella" href="#/bollettini/' + c.b.id + '">' + U.stato('s-attesa', c.aperte + (c.aperte === 1 ? ' riga da decidere' : ' righe da decidere')) + imp(c.b) + '</a>';
      case 'pronto': return '<a class="casella" href="#/bollettini/' + c.b.id + '">' + U.stato('s-ottone', 'Pronto da chiudere') + imp(c.b) + '</a>';
      case 'mancante': return '<div class="casella">' + U.stato('s-ritardo', 'Non arrivato') + '<button type="button" class="btn testo piccolo" data-sollecita="' + f.id + '-' + mm + '">Sollecita</button></div>';
      case 'in_corso': return '<div class="casella vuota">Mese in corso</div>';
      default: return '<div class="casella vuota">Nessuna fattura</div>';
    }
  }
  function sollecitoBollettino(f, mm) {
    const docs = M.fiscaliDelMese(f.id, ANNO, mm);
    const testo = 'Gentili colleghi di ' + f.nome + ',\n\nnon abbiamo ancora ricevuto il bollettino provvigioni di ' + M.meseMin(mm) + ' ' + ANNO + '.\n' +
      'Ci risultano questi documenti del mese:\n' + docs.map(x => '- ' + x.doc.numero + ' del ' + M.data(x.doc.data) + ', ' + M.nomeCliente(x.pratica.cliente_piva) + ', ' + M.euro(M.importoDoc(x.doc))).join('\n') +
      '\n\nVi chiediamo di inviarcelo appena possibile.\n\nGrazie,\nDecobrands SRL';
    U.modale({ titolo: 'Sollecito bollettino · ' + f.breve + ' ' + M.meseMin(mm), testo: 'Copia il testo e invialo al fornitore.',
      corpo: '<textarea class="testo-email" aria-label="Testo del sollecito">' + e(testo) + '</textarea>',
      azioni: [{ etichetta: 'Chiudi', classe: 'sec' }, { etichetta: 'Copia il testo', onClick: (c, el) => {
        const t = U.$('textarea', el); t.select(); try { navigator.clipboard.writeText(t.value); } catch (x) { document.execCommand('copy'); }
        M.annota('Sollecito bollettino ' + M.meseMin(mm) + ' preparato per ' + f.breve); M.salva(); U.avviso('Testo del sollecito copiato');
      } }] });
  }

  /* ---------- Bollettino: riconciliazione a cerniera ---------- */
  U.rotta(/^\/bollettini\/(\d+)$/, function (id) {
    const b = M.bollettino(id);
    if (!b) { location.hash = '#/bollettini'; return; }
    const f = M.fornitore(b.fornitore_id);
    const r = M.riconcilia(b);
    const contestate = r.righe.filter(x => x.decisione && x.decisione.esito === 'contestato');
    const statoChip = b.stato === 'verificato' ? U.stato('s-ok', 'Verificato') : b.stato === 'contestato' ? U.stato('s-ritardo', 'Contestato') : r.aperte ? U.stato('s-attesa', 'Da verificare') : U.stato('s-ottone', 'Pronto da chiudere');
    const corpo = U.pagina({
      voce: 'bollettini', pieno: true, titolo: f.breve + ' · ' + M.mese(b.mese, b.anno),
      titoloHtml: e(f.breve) + ' · ' + M.mese(b.mese, b.anno) + ' <span style="vertical-align:4px">' + statoChip + '</span>',
      percorso: [{ t: 'Bollettini', href: '#/bollettini' }, { t: f.breve + ' ' + M.meseMin(b.mese) }],
      sotto: 'Ricevuto il ' + M.data(b.ricevuto) + ' · ' + e(b.file) + ' · ' + e(f.breve) + ' paga sul ' + f.maturazione +
        (f.maturazione === 'maturato' ? ': verificando il bollettino si sbloccano le provvigioni dei subagenti su queste fatture.' : '.')
    });

    const rie = U.el('section', 'foglio riepilogo-cerniera');
    rie.innerHTML = '<div class="lato"><span>' + e(f.breve) + ' ci riconosce</span><b>' + M.euro(r.riconosciuto) + '</b></div>' +
      '<div class="cucitura"><span>Differenza</span><b class="' + U.segno(r.differenza) + '">' + (Math.abs(r.differenza) < 0.01 ? 'Quadra' : U.euroSegno(r.differenza)) + '</b></div>' +
      '<div class="lato noi"><span>Noi calcoliamo</span><b>' + M.euro(r.atteso) + '</b></div>';
    corpo.appendChild(rie);

    const lista = U.el('section', 'foglio colonna cerniera');
    lista.style.flex = '0 1 auto';
    corpo.appendChild(lista);
    const scorri = U.el('div');
    scorri.style.cssText = 'overflow:auto;flex:1 1 auto;min-height:0';
    lista.appendChild(scorri);
    const aperte = r.righe.filter(x => x.aperta), decise = r.righe.filter(x => x.decisione), quadrano = r.righe.filter(x => x.categoria === 'quadra' && !x.decisione);
    const CATEG = { differenza: 'Importo diverso', mancante: 'Manca nel bollettino', sconosciuta: 'Non è fra le nostre pratiche' };
    const riga = x => {
      const loro = x.loro ? '<span class="cifra">' + M.euro(x.loro.importo) + '</span><span class="dett">' + M.pct(x.loro.pct) + ' di ' + M.euro(x.loro.imponibile) + '</span>' : '<span class="dett">non indicata</span>';
      const noi = x.noi ? '<span class="cifra">' + M.euro(x.noi.importo) + '</span><span class="dett">' + M.pct(x.noi.pct) + ' di ' + M.euro(x.noi.imponibile) + '</span>' : '<span class="dett">nessuna pratica</span>';
      const d = x.loro && x.noi ? M.r2(x.loro.importo - x.noi.importo) : x.loro ? x.loro.importo : -x.noi.importo;
      const seam = x.categoria === 'quadra' ? U.stato('s-ok', 'Quadra') : '<span class="diff ' + U.segno(d) + '">' + U.euroSegno(d) + '</span>';
      let az = '';
      if (b.stato === 'da_verificare') {
        if (x.decisione) az = (x.decisione.esito === 'contestato' ? U.stato('s-ritardo', 'Da contestare') : x.decisione.esito === 'attendere' ? U.stato('s-neutro', 'Al prossimo bollettino') : U.stato('s-ok', 'Accettata')) +
          ' <button type="button" class="btn testo piccolo" data-annulla="' + e(x.numero) + '">Annulla</button>';
        else if (x.categoria !== 'quadra') {
          const inArrivo = x.categoria === 'sconosciuta' && M.S.in_arrivo.find(dd => dd.numero === x.numero);
          az = (inArrivo ? '<a class="btn piccolo" href="#/documenti/' + inArrivo.id + '">Abbina il documento</a>' :
            x.categoria === 'mancante' ? '<button type="button" class="btn sec piccolo" data-decidi="attendere" data-n="' + e(x.numero) + '">Attendi il prossimo</button>' :
            '<button type="button" class="btn sec piccolo" data-decidi="accettato" data-n="' + e(x.numero) + '">Accetta il loro importo</button>') +
            '<button type="button" class="btn pericolo piccolo" data-decidi="contestato" data-n="' + e(x.numero) + '">Contesta</button>';
        }
      }
      return '<div class="cerniera-riga' + (x.decisione ? ' decisa' : '') + '">' +
        '<div>' + (x.pratica ? '<a href="#/pratiche/' + x.pratica.id + '"><b>' + e(x.numero) + '</b></a>' : '<b>' + e(x.numero) + '</b>') +
        '<span class="sec-riga testo-tenue piccolo" style="display:block">' + (x.cliente ? e(M.nomeCliente(x.cliente)) + ' · ' : '') + M.data(x.data) +
        (x.categoria !== 'quadra' ? ' · ' + CATEG[x.categoria] : '') + '</span>' +
        (x.nota_fornitore ? '<span class="piccolo" style="display:block;color:#7A5C17">Nota del fornitore: ' + e(x.nota_fornitore) + '</span>' : '') +
        (x.decisione && x.decisione.motivo ? '<span class="piccolo testo-tenue" style="display:block">Motivo: ' + e(x.decisione.motivo) + '</span>' : '') + '</div>' +
        '<div class="lato-loro">' + loro + '</div><div class="seam">' + seam + '</div><div class="lato-noi">' + noi + '</div><div class="azioni">' + az + '</div></div>';
    };
    scorri.innerHTML = '<div class="cerniera-intest"><div>Documento</div><div class="lato-loro">' + e(f.breve) + ' riconosce</div><div class="seam">Differenza</div><div class="lato-noi">Noi calcoliamo</div><div></div></div>' +
      (aperte.length ? '<div class="cerniera-gruppo">' + U.stato('s-attesa', String(aperte.length)) + ' Da decidere</div>' + aperte.map(riga).join('') : '') +
      (decise.length ? '<div class="cerniera-gruppo">' + U.stato('s-neutro', String(decise.length)) + ' Decise</div>' + decise.map(riga).join('') : '') +
      (quadrano.length ? '<details' + (aperte.length + decise.length ? '' : ' open') + '><summary class="cerniera-gruppo">' + U.stato('s-ok', String(quadrano.length)) + ' Quadrano</summary>' + quadrano.map(riga).join('') + '</details>' : '');

    U.$$('[data-decidi]', scorri).forEach(btn => btn.addEventListener('click', () => decidi(b, btn.dataset.n, btn.dataset.decidi, r)));
    U.$$('[data-annulla]', scorri).forEach(btn => btn.addEventListener('click', () => {
      delete b.decisioni[btn.dataset.annulla]; M.salva(); U.naviga();
    }));

    /* Barra della decisione finale */
    const barra = U.el('section', 'foglio barra-decisione');
    corpo.appendChild(barra);
    if (b.stato !== 'da_verificare') {
      barra.innerHTML = '<span>' + (b.stato === 'verificato' ? 'Bollettino verificato. Le provvigioni riconosciute sono acquisite.' : 'Bollettino contestato: in attesa del bollettino rettificato da ' + e(f.breve) + '.') + '</span>' +
        '<button type="button" class="btn sec">Riapri la verifica</button>';
      U.$('button', barra).addEventListener('click', () => { b.stato = 'da_verificare'; M.annota('Bollettino ' + f.breve + ' ' + M.meseMin(b.mese) + ' riaperto'); M.salva(); U.naviga(); });
      return;
    }
    if (r.aperte) {
      barra.innerHTML = '<span>' + r.aperte + (r.aperte === 1 ? ' riga da decidere' : ' righe da decidere') + ' prima di chiudere il bollettino.</span><button type="button" class="btn" disabled>Segna come verificato</button>';
      return;
    }
    if (contestate.length) {
      barra.innerHTML = '<span>' + contestate.length + (contestate.length === 1 ? ' riga da contestare' : ' righe da contestare') + ' a ' + e(f.breve) + '.</span>' +
        '<div style="display:flex;gap:8px"><button type="button" class="btn sec" id="prep">Prepara la contestazione</button><button type="button" class="btn" id="contesta">Segna come contestato</button></div>';
      U.$('#prep', barra).addEventListener('click', () => contestazione(b, f, contestate));
      U.$('#contesta', barra).addEventListener('click', () => { b.stato = 'contestato'; M.annota('Bollettino ' + f.breve + ' ' + M.meseMin(b.mese) + ' contestato'); M.salva(); U.avviso('Bollettino segnato come contestato'); U.naviga(); });
      return;
    }
    barra.innerHTML = '<span>Tutte le righe sono quadrate o decise.</span><button type="button" class="btn">Segna come verificato</button>';
    U.$('button', barra).addEventListener('click', () => {
      const prima = sbloccate();
      b.stato = 'verificato';
      const dopo = sbloccate();
      M.annota('Bollettino ' + f.breve + ' ' + M.meseMin(b.mese) + ' verificato');
      M.salva();
      const sbl = M.r2(dopo - prima);
      U.avviso('Bollettino verificato.' + (sbl ? ' Sbloccati ' + M.euro(sbl) + ' di provvigioni ai subagenti.' : ''));
      U.naviga();
    });
  });
  function sbloccate() {
    let s = 0;
    [1, 2, 3, 4].forEach(t => M.righeLiquidazione(ANNO, t).forEach(x => { if (x.liquidabile) s += x.provvigione; }));
    return s;
  }
  function decidi(b, numero, esito, r) {
    const x = r.righe.find(y => y.numero === numero);
    const TIT = { accettato: 'Accetta l’importo di ' + M.fornitore(b.fornitore_id).breve, contestato: 'Contesta la riga ' + numero, attendere: 'Attendi il prossimo bollettino' };
    const TESTO = {
      accettato: 'Registriamo ' + M.euro(x.loro ? x.loro.importo : 0) + ' come importo corretto. Al subagente resta la provvigione calcolata sull’imponibile.',
      contestato: 'La riga finirà nella contestazione da inviare al fornitore.',
      attendere: 'Il documento non c’è in questo bollettino: lo aspettiamo nel prossimo.'
    };
    U.modale({
      titolo: TIT[esito], testo: TESTO[esito],
      corpo: U.campo({ nome: 'motivo', etichetta: 'Motivo', tipo: 'area', valore: esito === 'accettato' ? (x.nota_fornitore || '') : '', aiuto: esito === 'contestato' ? 'Obbligatorio: comparirà nel testo della contestazione.' : 'Facoltativo, resta nello storico.' }),
      azioni: [{ etichetta: 'Annulla', classe: 'sec' }, { etichetta: esito === 'contestato' ? 'Contesta' : 'Conferma', classe: esito === 'contestato' ? 'pericolo' : '', onClick: (c, el) => {
        const motivo = U.valori(el).motivo;
        if (esito === 'contestato' && !motivo) { U.$('[data-aiuto]', el).style.color = 'var(--rosso)'; return false; }
        b.decisioni[numero] = { esito: esito, motivo: motivo, importo: x.loro ? x.loro.importo : null };
        M.salva(); U.naviga();
      } }]
    });
  }
  function contestazione(b, f, righe) {
    const testo = 'Gentili colleghi di ' + f.nome + ',\n\nabbiamo verificato il bollettino provvigioni di ' + M.meseMin(b.mese) + ' ' + b.anno + ' e vi segnaliamo:\n\n' +
      righe.map(x => '- ' + x.numero + (x.cliente ? ' (' + M.nomeCliente(x.cliente) + ')' : '') + ': ' +
        (x.categoria === 'mancante' ? 'documento non presente nel bollettino, provvigione attesa ' + M.euro(x.noi.importo) :
          x.categoria === 'sconosciuta' ? 'documento che non ci risulta, importo indicato ' + M.euro(x.loro.importo) :
            'indicati ' + M.euro(x.loro.importo) + ' (' + M.pct(x.loro.pct) + '), attesi ' + M.euro(x.noi.importo) + ' (' + M.pct(x.noi.pct) + ')') +
        (x.decisione.motivo ? '. ' + x.decisione.motivo : '')).join('\n') +
      '\n\nVi chiediamo di inviarci il bollettino rettificato.\n\nGrazie,\nDecobrands SRL';
    U.modale({ titolo: 'Contestazione · ' + f.breve + ' ' + M.meseMin(b.mese), testo: 'Copia il testo e invialo al fornitore.',
      corpo: '<textarea class="testo-email" aria-label="Testo della contestazione">' + e(testo) + '</textarea>',
      azioni: [{ etichetta: 'Chiudi', classe: 'sec' }, { etichetta: 'Copia il testo', onClick: (c, el) => {
        const t = U.$('textarea', el); t.select(); try { navigator.clipboard.writeText(t.value); } catch (x) { document.execCommand('copy'); }
        U.avviso('Testo della contestazione copiato');
      } }] });
  }

  /* ---------- Liquidazioni ---------- */
  let subSel = 'tutti';
  U.rotta(/^\/liquidazioni$/, () => { location.hash = '#/liquidazioni/' + ANNO + '/' + M.trimestre(M.oggi()); });
  U.rotta(/^\/liquidazioni\/(\d{4})\/([1-4])$/, function (aS, tS) {
    const a = Number(aS), t = Number(tS);
    const st = M.statoTrimestre(a, t);
    const righe = M.righeLiquidazione(a, t);
    const inAttesa = righe.filter(r => !r.liquidabile);
    const liquidabili = righe.filter(r => r.liquidabile);
    const puoChiudere = st.chiave === 'da_liquidare' && !inAttesa.length;
    const perche = st.chiave === 'chiusa' ? 'Trimestre già liquidato' : st.chiave === 'futura' ? 'Il trimestre non è iniziato' :
      st.chiave === 'in_corso' ? 'Il trimestre si chiude il ' + M.data(M.limiti(a, t).a) : inAttesa.length ? 'Ci sono documenti in attesa dei bollettini' : '';
    const corpo = U.pagina({
      voce: 'liquidazioni', titolo: 'Liquidazioni', pieno: true,
      sotto: 'Provvigioni ai subagenti per trimestre: gennaio–marzo, aprile–giugno, luglio–settembre, ottobre–dicembre.',
      azioni: [
        { etichetta: 'Scarica i prospetti', icona: 'scarica', classe: 'sec', disabilitato: !liquidabili.length, onClick: () => scarica(a, t, liquidabili) },
        { etichetta: st.chiave === 'chiusa' ? 'Liquidazione chiusa' : 'Chiudi il trimestre', icona: 'spunta', disabilitato: !puoChiudere, titolo: perche, onClick: async () => {
          if (!(await U.conferma('Chiudere la liquidazione del ' + t + '° trimestre?', 'Gli importi vengono fissati: ' + M.euro(liquidabili.reduce((s, r) => s + r.provvigione, 0)) + ' a ' + new Set(liquidabili.map(r => r.subagente_id)).size + ' subagenti.', 'Chiudi il trimestre'))) return;
          M.chiudiTrimestre(a, t); M.salva(); U.avviso('Liquidazione del ' + t + '° trimestre chiusa'); U.naviga();
        } }
      ]
    });

    const strip = U.el('nav', 'trimestri');
    strip.setAttribute('aria-label', 'Trimestri ' + a);
    strip.innerHTML = [1, 2, 3, 4].map(q => {
      const s = M.statoTrimestre(a, q);
      const lim = M.limiti(a, q);
      const quota = s.chiave === 'in_corso' ? Math.round(100 * M.giorni(lim.da, M.oggi()) / M.giorni(lim.da, lim.a)) : null;
      return '<a href="#/liquidazioni/' + a + '/' + q + '" class="' + (q === t ? 'attivo' : '') + (s.chiave === 'futura' ? ' futura' : '') + '"' + (q === t ? ' aria-current="page"' : '') + '>' +
        '<b>' + q + '° trimestre</b><span>' + M.nomeTrimestre(q) + '</span><span>' + e(s.etichetta) + '</span>' +
        (quota != null ? '<div class="barra-scadenza"><i style="width:' + quota + '%"></i></div>' : '') + '</a>';
    }).join('');
    corpo.appendChild(strip);

    if (st.chiave === 'futura') {
      corpo.insertAdjacentHTML('beforeend', '<div class="foglio"><div class="vuoto"><b>Trimestre non ancora iniziato</b>Le provvigioni compariranno qui con le prime fatture di ' + M.nomeTrimestre(t).split('–')[0] + '.</div></div>');
      return;
    }

    /* Schede per subagente: riepilogo e filtro della tabella */
    const perSub = M.S.subagenti.map(s => {
      const rr = righe.filter(x => x.subagente_id === s.id);
      return { s: s, n: rr.length, liquidabile: rr.filter(r => r.liquidabile).reduce((x, r) => x + r.provvigione, 0),
        attesa: rr.filter(r => !r.liquidabile).reduce((x, r) => x + r.provvigione, 0), nAttesa: rr.filter(r => !r.liquidabile).length };
    });
    const schede = U.el('div', 'schede-sub');
    schede.setAttribute('role', 'group');
    schede.setAttribute('aria-label', 'Filtra per subagente');
    schede.innerHTML = perSub.map(x => '<button type="button" class="scheda-sub" data-s="' + x.s.id + '" aria-pressed="' + (subSel === String(x.s.id)) + '">' +
      '<span class="nome">' + e(x.s.nome) + '</span><span class="imp ' + (x.liquidabile < 0 ? 'negativo' : '') + '">' + M.euro(x.liquidabile) + '</span>' +
      '<span class="det">' + (st.chiave === 'chiusa' ? 'liquidati' : 'da liquidare') + ' · ' + x.n + (x.n === 1 ? ' documento' : ' documenti') + '</span>' +
      (x.attesa ? '<span class="det attesa">' + M.euro(x.attesa) + ' in attesa del bollettino</span>' : '') + '</button>').join('');
    corpo.appendChild(schede);

    const sx = U.el('section', 'foglio colonna');
    sx.style.cssText = 'flex:1 1 auto;min-height:16rem';
    const totLiq = perSub.reduce((s, x) => s + x.liquidabile, 0);
    sx.innerHTML = '<div class="foglio-testa"><h2 id="titolo-doc"></h2><span class="nota">Totale da liquidare ' + M.euro(totLiq) +
      (inAttesa.length ? ' · ' + inAttesa.length + ' documenti in attesa del bollettino · <a href="#/bollettini">vai ai bollettini</a>' : '') + '</span></div>';
    corpo.appendChild(sx);
    const boxT = U.el('div');
    boxT.style.cssText = 'display:flex;flex-direction:column;flex:1 1 auto;min-height:0;padding:12px 18px 16px';
    sx.appendChild(boxT);
    const filtra = () => subSel === 'tutti' ? righe : righe.filter(x => String(x.subagente_id) === subSel);
    const titolo = () => { U.$('#titolo-doc', sx).textContent = subSel === 'tutti' ? 'Tutti i documenti del trimestre' : 'Documenti di ' + M.subagente(subSel).nome; };
    titolo();
    const tab = U.tabella(boxT, {
      colonne: [
        { key: 'numero', titolo: 'Documento', valore: r => r.doc.numero, cella: r => '<a href="#/pratiche/' + r.pratica.id + '">' + e(r.doc.numero) + '</a><span class="sec-riga">' + e(r.fornitore.breve) + ' · ' + M.data(r.doc.data) + '</span>' },
        { key: 'cliente', titolo: 'Cliente', cresce: true, valore: r => M.nomeCliente(r.cliente), cella: r => e(M.nomeCliente(r.cliente)) + '<span class="sec-riga">codice ' + e(r.codice_cliente) + '</span>' },
        { key: 'sub', titolo: 'Subagente', valore: r => M.subagente(r.subagente_id).nome },
        { key: 'importo', titolo: 'Imponibile', tipo: 'euro' },
        { key: 'pct', titolo: 'Provvigione %', tipo: 'pct', cella: r => M.pct(r.pct) + (r.eccezione ? '<span class="sec-riga">eccezione</span>' : '') },
        { key: 'provvigione', titolo: 'Provvigione', tipo: 'euro', totale: 'somma', cella: r => '<b class="' + (r.provvigione < 0 ? 'negativo' : '') + '">' + M.euro(r.provvigione) + '</b>' },
        { key: 'stato', titolo: 'Stato', ordinaPer: r => r.liquidabile ? 1 : 0, cresce: true,
          cella: r => r.liquidabile ? U.stato('s-ok', st.chiave === 'chiusa' ? 'Liquidata' : 'Liquidabile') : U.stato('s-attesa', 'In attesa') + '<span class="sec-riga">' + e(r.motivo) + '</span>' }
      ],
      righe: filtra(),
      ordine: { key: 'stato', dir: 'asc' }, etichettaTotale: 'Totale in elenco, compresi i documenti in attesa',
      piede: 'Entrano fatture e note di credito con data nel trimestre. Gasper e Ing’s pagano sul fatturato; Gries sul maturato: le sue fatture entrano quando il bollettino che le riconosce è verificato.',
      vuoto: { titolo: 'Nessun documento', testo: 'Nessuna fattura o nota di credito con data in questo trimestre.' }
    });
    U.$$('.scheda-sub', schede).forEach(b => b.addEventListener('click', () => {
      subSel = subSel === b.dataset.s ? 'tutti' : b.dataset.s;
      U.$$('.scheda-sub', schede).forEach(x => x.setAttribute('aria-pressed', String(x.dataset.s === subSel)));
      titolo(); tab.aggiorna(filtra());
    }));
  });
  function scarica(a, t, righe) {
    M.S.subagenti.forEach(s => {
      const rr = righe.filter(r => r.subagente_id === s.id);
      if (rr.length) U.scarica('liquidazione_' + a + '_T' + t + '_' + s.nome.replace(/\s+/g, '_') + '.csv', M.csvLiquidazione(rr));
    });
    U.avviso('Prospetti scaricati: uno per subagente, con gli 8 campi concordati');
  }
})();
