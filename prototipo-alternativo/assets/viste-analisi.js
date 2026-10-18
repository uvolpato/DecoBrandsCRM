/* ============================================================
   Analisi (#/analisi, spec §7.22): la BI completa del CRM.
   Domande a cui risponde: quanto fatturano i clienti, quanto ci riconoscono i fornitori,
   quanto paghiamo ai subagenti, quanto resta a Decobrands; da chi viene, come cambia nel tempo.
   - un fatto per documento fiscale (M.fattiAnalisi), per data del documento (competenza, D-19)
   - periodo di 3, 6 o 12 mesi scelto a mesi (PeriodoMesi), confronto con il periodo precedente
   - filtri fornitore / subagente / cliente; clic su grafici e righe = filtro (incrociato):
     ogni grafico per dimensione ignora il proprio filtro e mette in risalto la voce scelta,
     così si vede sempre il peso della scelta sul totale (D-18)
   - tabella raggruppabile; esportazione Excel (con i grafici), PDF, CSV
   Solo composizione di componenti CRM.*
   ============================================================ */
(function () {
  'use strict';
  const e = CRM.esc;
  const C = () => CRM.COLORI_GRAFICI;
  const piu = (k, n) => { const t = Number(k.slice(0, 4)) * 12 + Number(k.slice(5, 7)) - 1 + n; return Math.floor(t / 12) + '-' + String(t % 12 + 1).padStart(2, '0'); };
  const nMesi = (da, a) => (Number(a.slice(0, 4)) * 12 + Number(a.slice(5, 7))) - (Number(da.slice(0, 4)) * 12 + Number(da.slice(5, 7))) + 1;
  const etMese = k => M.meseMin(Number(k.slice(5, 7))) + ' ' + k.slice(0, 4);
  const etMeseBreve = k => M.meseMin(Number(k.slice(5, 7))).slice(0, 3) + ' ' + k.slice(2, 4);
  const corto = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s;

  /* Stato della pagina (resta per la sessione): periodo, durata, filtri, raggruppamento della tabella */
  const BI = { da: null, n: 12, f: [], s: [], c: [], per: 'subagente' };   // f, s, c: elenchi di chiavi (selezione multipla, D-20)
  const DIM = {
    f: { campo: 'fornitore_id', nome: 'fornitore', etichetta: 'Fornitore', plurale: 'fornitori' },
    s: { campo: 'subagente_id', nome: 'subagente', etichetta: 'Subagente', plurale: 'subagenti' },
    c: { campo: 'cliente', nome: 'nome_cliente', etichetta: 'Cliente', plurale: 'clienti' }
  };
  /* Apertura da altre pagine (es. Liquidazioni → Report subagenti): filtri e periodo già impostati */
  CRM.apriAnalisi = function (o) {
    o = o || {};
    Object.assign(BI, { f: [], s: [], c: [] }, o);
    ['f', 's', 'c'].forEach(d => { if (!Array.isArray(BI[d])) BI[d] = BI[d] ? [String(BI[d])] : []; });
    if (o.n && !o.da) BI.da = null;   // periodo che finisce con l'ultimo mese con dati
    if (location.hash === '#/analisi') vista(); else location.hash = '#/analisi';
  };

  const somma = rr => {
    const t = rr.reduce((x, r) => { x.fatturato += r.importo; x.prese += r.prese; x.pagate += r.pagate; if (r.tipo === 'fattura') x.documenti++; return x; }, { fatturato: 0, prese: 0, pagate: 0, documenti: 0 });
    return { fatturato: M.r2(t.fatturato), prese: M.r2(t.prese), pagate: M.r2(t.pagate), margine: M.r2(t.prese - t.pagate), documenti: t.documenti, clienti: new Set(rr.map(r => r.cliente)).size };
  };
  const raggruppa = (rr, chiave, nome) => {
    const m = new Map();
    rr.forEach(r => { const k = String(r[chiave]); if (!m.has(k)) m.set(k, { chiave: k, nome: r[nome], rr: [] }); m.get(k).rr.push(r); });
    return Array.from(m.values()).map(g => Object.assign({ chiave: g.chiave, nome: g.nome }, somma(g.rr)));
  };
  // filtri attivi, tranne quello della dimensione indicata (filtro incrociato dei grafici)
  const filtra = (rr, salvo) => rr.filter(x => Object.keys(DIM).every(d => d === salvo || !BI[d].length || BI[d].indexOf(String(x[DIM[d].campo])) >= 0));
  // nomi delle voci scelte in un filtro (per i testi dell'esportazione)
  const nomeFiltro = (d, fatti) => BI[d].map(k => { const x = fatti.find(r => String(r[DIM[d].campo]) === k); return x ? x[DIM[d].nome] : k; }).join(', ');
  const ENT = { f: 'fornitore', s: 'subagente', c: 'cliente' };

  CRM.rotta(/^\/analisi$/, vista);
  function vista() {
    const fatti = M.fattiAnalisi();
    const oggi = M.oggi().slice(0, 7);
    const mesiDati = Array.from(new Set(fatti.map(x => x.mese))).sort();
    const corpo0 = () => CRM.Pagina({ voce: 'analisi', titolo: 'Analisi' });
    if (!mesiDati.length) { CRM.Pannello(corpo0(), {}).corpo.innerHTML = '<div class="vuoto"><b>Nessun documento da analizzare</b>I numeri compaiono con le prime fatture abbinate alle pratiche.</div>'; return; }
    const primo = mesiDati[0], ultimo = mesiDati[mesiDati.length - 1] < oggi ? mesiDati[mesiDati.length - 1] : oggi;
    if (!BI.da) BI.da = piu(ultimo, -(BI.n - 1));
    const per = CRM.completaPeriodo(BI.da, BI.n, primo, ultimo); BI.da = per.da;
    const lung = nMesi(per.da, per.a);
    const prec = { da: piu(per.da, -lung), a: piu(per.da, -1) };
    const nel = (x, p) => x.mese >= p.da && x.mese <= p.a;
    const base = fatti.filter(x => nel(x, per)), basePrec = fatti.filter(x => nel(x, prec));
    const sel = filtra(base), tot = somma(sel), totPrec = somma(filtra(basePrec));
    const conPrec = basePrec.length > 0;
    const etPrec = lung === 12 ? 'sullo stesso periodo dell’anno prima' : 'sui ' + lung + ' mesi prima';
    const filtriAttivi = Object.keys(DIM).filter(d => BI[d].length);

    const grafici = {};
    const corpo = CRM.Pagina({
      voce: 'analisi', titolo: 'Analisi',
      sottotitolo: 'Fatturato dei clienti, provvigioni dai fornitori e ai subagenti, margine Decobrands. Scegli periodo e filtri; un clic su un grafico o su una riga filtra tutta la pagina.',
      azioni: [{ etichetta: 'Esporta', icona: 'scarica', variante: 'sec', consentito: true, disabilitato: !sel.length, titolo: sel.length ? '' : 'Nessun documento con questi filtri', onClick: () => esporta() }]
    });

    /* ---------- Barra: periodo, durata, filtri ---------- */
    const riga = CRM.blocco(corpo, 'barra-periodo');
    CRM.PeriodoMesi(riga, { da: per.da, mesi: BI.n, primo: primo, ultimo: ultimo, onChange: da => { BI.da = da; vista(); } });
    const nav = CRM.blocco(riga, 'sposta-periodo');
    [['‹', 'Sposta il periodo di un mese indietro', -1], ['›', 'Sposta il periodo di un mese avanti', 1]].forEach(x => {
      const b = CRM.el('button', 'btn sec piccolo', x[0]); b.type = 'button'; b.title = x[1];
      b.disabled = x[2] < 0 ? per.da <= primo : per.a >= ultimo;
      b.addEventListener('click', () => { BI.da = piu(per.da, x[2]); vista(); });
      nav.appendChild(b);
    });
    CRM.FilterBar(riga, { campi: [
      { nome: 'n', tipo: 'segmenti', valore: String(BI.n), opzioni: [{ value: '3', label: '3 mesi' }, { value: '6', label: '6 mesi' }, { value: '12', label: '12 mesi' }] }
    ], onChange: v => {
      // cambiando durata il periodo finisce nello stesso mese di prima
      if (Number(v.n) !== BI.n) { BI.da = piu(per.a, -(Number(v.n) - 1)); BI.n = Number(v.n); vista(); }
    } });
    // fornitori, subagenti, clienti: campi di ricerca a selezione multipla (stesso componente della
    // ricerca articoli); il menu propone solo le voci con documenti nel periodo e compatibili con gli altri filtri
    const rigaFiltri = CRM.blocco(corpo, 'filtri-bi');
    const presenti = d => raggruppa(filtra(base, d), DIM[d].campo, DIM[d].nome).map(x => x.chiave);
    CRM.FilterBar(rigaFiltri, { campi: ['f', 's', 'c'].map(d => ({ nome: d, tipo: 'ricerca', entita: ENT[d], multipla: true, etichetta: DIM[d].etichetta, valore: BI[d],
      placeholder: 'Tutti i ' + DIM[d].plurale, contesto: { limita: presenti(d), tutti: true } })),
      onChange: v => { Object.assign(BI, { f: v.f, s: v.s, c: v.c }); vista(); } });
    if (filtriAttivi.length) {
      const az = CRM.el('button', 'link-azzera', 'Togli tutti i filtri'); az.type = 'button';
      az.addEventListener('click', () => { BI.f = []; BI.s = []; BI.c = []; vista(); });
      rigaFiltri.appendChild(az);
    }

    /* ---------- Numeri ---------- */
    const conf = (v, p) => !conPrec ? { testo: 'nessun dato per il confronto' } : Math.abs(p) < 0.01 ? { testo: 'nessun importo ' + etPrec } :
      { testo: (v >= p ? '+' : '−') + M.num(Math.abs(Math.round(100 * (v - p) / Math.abs(p)))) + '% ' + etPrec, variante: v >= p ? 'ok' : 'errore' };
    CRM.KpiRow(corpo, [
      { id: 'f', etichetta: 'Fatturato dei clienti', valore: tot.fatturato, variante: 'primario', dettagli: [conf(tot.fatturato, totPrec.fatturato), { testo: tot.documenti + (tot.documenti === 1 ? ' fattura' : ' fatture') + ' · ' + tot.clienti + (tot.clienti === 1 ? ' cliente' : ' clienti') }] },
      { id: 'p', etichetta: 'Provvigioni dai fornitori', valore: tot.prese, variante: 'info', dettagli: [conf(tot.prese, totPrec.prese), { testo: tot.fatturato ? M.pct(M.r2(100 * tot.prese / tot.fatturato)) + ' del fatturato' : '' }] },
      { id: 's', etichetta: 'Provvigioni ai subagenti', valore: tot.pagate, variante: 'attesa', dettagli: [conf(tot.pagate, totPrec.pagate), { testo: tot.prese ? M.pct(M.r2(100 * tot.pagate / tot.prese)) + ' delle provvigioni' : '' }] },
      { id: 'm', etichetta: 'Margine Decobrands', valore: tot.margine, variante: 'ok', dettagli: [conf(tot.margine, totPrec.margine), { testo: tot.prese ? M.pct(M.r2(100 * tot.margine / tot.prese)) + ' delle provvigioni' : '' }] }
    ]);
    if (!sel.length) {
      CRM.Pannello(corpo, {}).corpo.innerHTML = '<div class="vuoto"><b>Nessun documento con questi filtri nel periodo</b>Togli un filtro o scegli altri mesi.</div>';
      return;
    }

    /* ---------- Grafici ---------- */
    const griglia = CRM.blocco(corpo, 'griglia-bi');
    // 1. andamento mese per mese (tutti i mesi del periodo, anche quelli senza documenti)
    const mesi = []; for (let k = per.da; k <= per.a; k = piu(k, 1)) mesi.push(k);
    const perMese = mesi.map(k => somma(sel.filter(x => x.mese === k)));
    const p1 = CRM.Pannello(griglia, { titolo: 'Andamento', nota: 'provvigioni mese per mese' });
    grafici.andamento = { titolo: 'Andamento mese per mese', g: CRM.Grafico(p1.corpo, { tipo: 'bar', titolo: 'Provvigioni dai fornitori, ai subagenti e margine per mese', altezza: 260,
      etichette: mesi.map(etMeseBreve),
      serie: [
        { nome: 'Dai fornitori', valori: perMese.map(x => x.prese), colore: C().primario },
        { nome: 'Ai subagenti', valori: perMese.map(x => x.pagate), colore: C().neutro },
        { nome: 'Margine', valori: perMese.map(x => x.margine), colore: C().ok, tipo: 'line' }
      ] }) };
    // grafico per dimensione: ignora il proprio filtro, evidenzia la voce scelta; clic = filtro (di nuovo = toglie)
    const perDim = (d, ord) => raggruppa(filtra(base, d), DIM[d].campo, DIM[d].nome).sort(ord || ((x, y) => y.fatturato - x.fatturato));
    const scegli = (d, chiave) => { const i = BI[d].indexOf(chiave); if (i >= 0) BI[d].splice(i, 1); else BI[d].push(chiave); vista(); };
    const indici = (d, voci) => voci.map((x, i) => BI[d].indexOf(x.chiave) >= 0 ? i : -1).filter(i => i >= 0);
    // 2. fatturato per fornitore (i primi 7, gli altri insieme)
    const fo = perDim('f'), foV = fo.slice(0, fo.length <= 8 ? 8 : 7), foA = fo.slice(foV.length);
    const p2 = CRM.Pannello(griglia, { titolo: 'Fatturato per fornitore', nota: BI.f.length ? 'clic su una voce scelta per toglierla' : 'clic per filtrare' });
    const etFo = foV.map(x => x.nome).concat(foA.length ? ['Altri ' + foA.length] : []);
    const ixF = indici('f', foV).concat(foA.some(x => BI.f.indexOf(x.chiave) >= 0) ? [etFo.length - 1] : []);
    grafici.fornitori = { titolo: 'Fatturato per fornitore', g: CRM.Grafico(p2.corpo, { tipo: 'doughnut', titolo: 'Distribuzione del fatturato per fornitore', altezza: 260, etichette: etFo,
      evidenzia: BI.f.length ? ixF : null,
      serie: [{ nome: 'Fatturato', valori: foV.map(x => x.fatturato).concat(foA.length ? [M.r2(foA.reduce((s, x) => s + x.fatturato, 0))] : []), colore: ['#0d6efd', '#6ea8fe', '#198754', '#75b798', '#ffc107', '#ffda6a', '#6f42c1', '#adb5bd'] }],
      onClick: i => { if (foV[i]) scegli('f', foV[i].chiave); } }) };
    // 3. subagenti: provvigioni generate dai loro clienti, divise fra subagente e Decobrands
    const su = perDim('s', (x, y) => y.prese - x.prese);
    const p3 = CRM.Pannello(griglia, { titolo: 'Subagenti', nota: 'provvigioni generate dai loro clienti' });
    grafici.subagenti = { titolo: 'Provvigioni generate per subagente', g: CRM.Grafico(p3.corpo, { tipo: 'bar', orizzontale: true, impilato: true, titolo: 'Provvigioni generate per subagente', altezza: Math.max(170, 34 * su.length + 70),
      etichette: su.map(x => x.nome), evidenzia: BI.s.length ? indici('s', su) : null,
      serie: [{ nome: 'Al subagente', valori: su.map(x => x.pagate), colore: C().neutro }, { nome: 'Margine Decobrands', valori: su.map(x => x.margine), colore: C().ok }],
      onClick: i => scegli('s', su[i].chiave) }) };
    // 4. i 10 clienti con più fatturato
    const cl = perDim('c').slice(0, 10);
    const p4 = CRM.Pannello(griglia, { titolo: 'Primi 10 clienti', nota: 'per fatturato' });
    grafici.clienti = { titolo: 'Primi 10 clienti per fatturato', g: CRM.Grafico(p4.corpo, { tipo: 'bar', orizzontale: true, titolo: 'Primi 10 clienti per fatturato', altezza: Math.max(170, 30 * cl.length + 50),
      etichette: cl.map(x => corto(x.nome, 26)), evidenzia: BI.c.length ? indici('c', cl) : null,
      serie: [{ nome: 'Fatturato', valori: cl.map(x => x.fatturato), colore: C().primario }],
      onClick: i => scegli('c', cl[i].chiave) }) };

    /* ---------- Tabella raggruppata ---------- */
    const RAGGR = { subagente: ['s', 'Subagente'], fornitore: ['f', 'Fornitore'], cliente: ['c', 'Cliente'], mese: [null, 'Mese'], documento: [null, 'Documento'] };
    const pt = CRM.Pannello(corpo, { titolo: 'Dettaglio', nota: 'stessi filtri dei grafici' });
    pt.el.classList.add('pannello-bi');
    const host = CRM.blocco(pt.corpo, '');
    CRM.FilterBar(pt.corpo, { campi: [{ nome: 'per', tipo: 'segmenti', valore: BI.per, opzioni: [
      { value: 'subagente', label: 'Per subagente' }, { value: 'fornitore', label: 'Per fornitore' }, { value: 'cliente', label: 'Per cliente' }, { value: 'mese', label: 'Per mese' }, { value: 'documento', label: 'Documenti', n: sel.length }] }],
      onChange: v => { BI.per = v.per; tabella(); } });
    pt.corpo.appendChild(host);   // i segmenti sopra, la tabella sotto
    function tabella() {
      host.innerHTML = '';
      if (BI.per === 'documento') {
        CRM.DataTable(host, { naturale: true, righe: sel, ordinamentoIniziale: { key: 'data', dir: 'desc' }, etichettaTotale: 'Totale',
          colonne: [
            { key: 'data', header: 'Data', tipo: 'data' },
            { key: 'numero', header: 'Documento', cell: r => '<a href="#/pratiche/' + r.pratica_id + '">' + e(r.numero) + '</a>' + (r.tipo === 'nota_credito' ? '<span class="sec-riga">nota di credito</span>' : '') },
            { key: 'nome_cliente', header: 'Cliente', grow: true, cell: r => e(r.nome_cliente) + '<span class="sec-riga">' + e(r.fornitore) + ' · ' + e(r.subagente) + '</span>' },
            { key: 'importo', header: 'Fatturato', tipo: 'euro', totale: 'somma' },
            { key: 'prese', header: 'Dai fornitori', tipo: 'euro', totale: 'somma' },
            { key: 'pagate', header: 'Ai subagenti', tipo: 'euro', totale: 'somma' },
            { key: 'margine', header: 'Margine', tipo: 'euro', totale: 'somma' }
          ], emptyText: 'Nessun documento' });
        return;
      }
      const d = RAGGR[BI.per][0];
      const righe = BI.per === 'mese' ? mesi.map((k, i) => Object.assign({ chiave: k, nome: M.mese(Number(k.slice(5, 7)), k.slice(0, 4)) }, perMese[i])).filter(x => x.documenti || x.fatturato)
        : raggruppa(sel, DIM[d].campo, DIM[d].nome);
      righe.forEach(x => { x.quota = tot.fatturato ? M.r2(100 * x.fatturato / tot.fatturato) : 0; });
      CRM.DataTable(host, { naturale: true, righe: righe, ordinamentoIniziale: BI.per === 'mese' ? { key: 'chiave', dir: 'asc' } : { key: 'fatturato', dir: 'desc' }, etichettaTotale: 'Totale',
        rowClass: x => d && BI[d].indexOf(x.chiave) >= 0 ? 'selezionata' : '',
        onRowClick: d ? (x => scegli(d, x.chiave)) : null,
        piede: d ? 'Clic su una riga per aggiungerla al filtro, di nuovo per toglierla.' : '',
        colonne: [
          { key: BI.per === 'mese' ? 'chiave' : 'nome', header: RAGGR[BI.per][1], grow: true, cell: x => '<b>' + e(x.nome) + '</b><span class="sec-riga">' + x.documenti + (x.documenti === 1 ? ' fattura' : ' fatture') + (BI.per !== 'cliente' ? ' · ' + x.clienti + (x.clienti === 1 ? ' cliente' : ' clienti') : '') + '</span>' },
          { key: 'fatturato', header: 'Fatturato', tipo: 'euro', totale: 'somma' },
          { key: 'prese', header: 'Dai fornitori', tipo: 'euro', totale: 'somma' },
          { key: 'pagate', header: 'Ai subagenti', tipo: 'euro', totale: 'somma' },
          { key: 'margine', header: 'Margine', tipo: 'euro', totale: 'somma' },
          { key: 'quota', header: 'Quota del fatturato', tipo: 'pct' }
        ], emptyText: 'Nessun dato' });
    }
    tabella();
    CRM.Nota(corpo, 'Importi per data del documento (competenza): fatture e note di credito abbinate alle pratiche, comprese quelle non ancora riconosciute nei bollettini. Gli storni per mancato pagamento non cambiano questi numeri: spostano solo il momento in cui la provvigione è pagata (vedi Liquidazioni).');

    /* ---------- Esportazione: Excel (con i grafici), PDF, CSV ---------- */
    function esporta() {
      let formato = 'xlsx';
      const NOTE = { xlsx: 'Riepilogo con i grafici, un foglio per subagente, fornitore, cliente e mese, l’elenco dei documenti. Totali con formule.', pdf: 'Stesso contenuto dell’Excel, da inviare o archiviare.', csv: 'Solo l’elenco dei documenti filtrati, separatore punto e virgola, per altri programmi.' };
      CRM.Modale({
        titolo: 'Esporta l’analisi', testo: 'Periodo ' + etMese(per.da) + ' – ' + etMese(per.a) + (filtriAttivi.length ? ', con i filtri attivi: ' + filtriAttivi.map(d => DIM[d].etichetta.toLowerCase() + ' ' + nomeFiltro(d, fatti)).join(', ') : ', senza filtri') + '.',
        corpo: c => {
          c.innerHTML = '<div class="formato-esporta"><span>Formato</span><div class="segmenti" role="radiogroup" aria-label="Formato del file">' +
            [['xlsx', 'Excel'], ['pdf', 'PDF'], ['csv', 'CSV']].map(f => '<button type="button" role="radio" data-formato="' + f[0] + '">' + f[1] + '</button>').join('') +
            '</div></div><p class="testo-tenue" id="formato-nota"></p>';
          const agg = () => { CRM.$('#formato-nota', c).textContent = NOTE[formato]; CRM.$$('[data-formato]', c).forEach(b => { b.setAttribute('aria-checked', String(b.dataset.formato === formato)); b.setAttribute('aria-selected', String(b.dataset.formato === formato)); }); };
          CRM.$$('[data-formato]', c).forEach(b => b.addEventListener('click', () => { formato = b.dataset.formato; agg(); }));
          agg();
        },
        azioni: [{ etichetta: 'Annulla', variante: 'sec' }, { etichetta: 'Scarica', icona: 'scarica', consentito: true, onClick: () => {
          CRM.esportaModello(modello(), formato).then(nome => { if (nome) CRM.Avviso('Scaricato ' + nome); });
        } }]
      });
    }
    function modello() {
      const testoFiltri = filtriAttivi.length ? filtriAttivi.map(d => DIM[d].etichetta + ': ' + nomeFiltro(d, fatti)).join(' · ') : 'tutti i fornitori, subagenti e clienti';
      const ctx = { periodo: 'Da ' + etMese(per.da) + ' a ' + etMese(per.a) + ' · ' + testoFiltri, contesto: 'Decobrands SRL · importi per data del documento · generato il ' + M.data(M.oggi()) };
      const var_ = (v, p) => conPrec && Math.abs(p) >= 0.01 ? M.r2((v - p) / Math.abs(p)) : '';
      const colR = [{ t: 'Voce', w: 34 }, { t: 'Periodo', w: 20, tipo: 'euro_n', al: 'right' }, { t: 'Periodo precedente', w: 20, tipo: 'euro_n', al: 'right' }, { t: 'Variazione', w: 14, tipo: 'pct', al: 'right' }];
      const voci = [['Fatturato dei clienti', 'fatturato'], ['Provvigioni dai fornitori', 'prese'], ['Provvigioni ai subagenti', 'pagate'], ['Margine Decobrands', 'margine']];
      const img = (k, mm, px) => { const x = grafici[k].g.immagine ? grafici[k].g.immagine() : null; return x ? { tipo: 'immagine', testo: grafici[k].titolo, dati: x.dati, larghezza: x.larghezza, altezza: x.altezza, larghezzaMm: mm, larghezzaPx: px } : null; };
      const riepilogo = { nome: 'Riepilogo', titolo: 'Analisi provvigioni', colonne: colR, ctx: ctx, riepilogo: true, blocchi: [
        { tipo: 'tabella', colonne: colR, righe: voci.map(v => [v[0], tot[v[1]], conPrec ? totPrec[v[1]] : '', var_(tot[v[1]], totPrec[v[1]])]) },
        { tipo: 'nota', testo: 'Periodo precedente: ' + etMese(prec.da) + ' – ' + etMese(prec.a) + ', stessi filtri. ' + tot.documenti + ' fatture, ' + tot.clienti + ' clienti.', stretta: true },
        img('andamento', 230, 760), img('fornitori', 140, 420), img('subagenti', 200, 640), img('clienti', 200, 640),
        { tipo: 'nota', testo: 'Importi per data del documento (competenza), note di credito comprese con segno negativo; gli storni per mancato pagamento non cambiano questi numeri.' }
      ].filter(Boolean) };
      const colG = t => [{ t: t, w: 34 }, { t: 'Fatture', w: 10, tipo: 'num', al: 'right' }, { t: 'Fatturato', w: 18, tipo: 'euro_n', al: 'right' }, { t: 'Dai fornitori', w: 18, tipo: 'euro', al: 'right' },
        { t: 'Ai subagenti', w: 18, tipo: 'euro', al: 'right' }, { t: 'Margine Decobrands', w: 20, tipo: 'euro', al: 'right' }, { t: 'Quota del fatturato', w: 16, tipo: 'pct', al: 'right' }];
      const foglioG = (nome, t, gruppi) => {
        const col = colG(t), s = somma(sel);
        return { nome: nome, titolo: 'Analisi per ' + t.toLowerCase(), colonne: col, ctx: ctx, blocchi: [{ tipo: 'tabella', colonne: col, filtro: true,
          righe: gruppi.map(x => [x.nome, x.documenti, x.fatturato, x.prese, x.pagate, x.margine, tot.fatturato ? M.r2(x.fatturato / tot.fatturato * 10000) / 10000 : 0]),
          totale: { etichetta: 'Totale', valori: { 1: s.documenti, 2: s.fatturato, 3: s.prese, 4: s.pagate, 5: s.margine } } }] };
      };
      const ord = rr => rr.sort((x, y) => y.fatturato - x.fatturato);
      const perMeseG = mesi.map((k, i) => Object.assign({ nome: M.mese(Number(k.slice(5, 7)), k.slice(0, 4)) }, perMese[i]));
      const colD = [{ t: 'Data', w: 12, tipo: 'data', al: 'center' }, { t: 'Documento', w: 16 }, { t: 'Fornitore', w: 18 }, { t: 'Cliente', w: 32 }, { t: 'Subagente', w: 20 },
        { t: 'Fatturato', w: 16, tipo: 'euro_n', al: 'right' }, { t: 'Dai fornitori', w: 16, tipo: 'euro', al: 'right' }, { t: 'Ai subagenti', w: 16, tipo: 'euro', al: 'right' }, { t: 'Margine', w: 16, tipo: 'euro', al: 'right' }];
      const documenti = { nome: 'Documenti', titolo: 'Documenti del periodo', colonne: colD, ctx: ctx, blocchi: [{ tipo: 'tabella', colonne: colD, filtro: true,
        righe: sel.map(r => [r.data, (r.tipo === 'nota_credito' ? 'NC ' : '') + r.numero, r.fornitore, r.nome_cliente, r.subagente, r.importo, r.prese, r.pagate, r.margine]),
        totale: { etichetta: 'Totale · ' + sel.length + ' documenti', valori: { 5: tot.fatturato, 6: tot.prese, 7: tot.pagate, 8: tot.margine } } }] };
      return {
        nome: 'Analisi_' + per.da + '_' + per.a + (filtriAttivi.length ? '_filtrata' : ''), titolo: 'Analisi provvigioni ' + etMese(per.da) + ' – ' + etMese(per.a),
        fogli: [riepilogo, foglioG('Per subagente', 'Subagente', ord(raggruppa(sel, 'subagente_id', 'subagente'))), foglioG('Per fornitore', 'Fornitore', ord(raggruppa(sel, 'fornitore_id', 'fornitore'))),
          foglioG('Per cliente', 'Cliente', ord(raggruppa(sel, 'cliente', 'nome_cliente'))), foglioG('Per mese', 'Mese', perMeseG), documenti],
        csv: [['Data', 'Documento', 'Tipo', 'Fornitore', 'Partita IVA cliente', 'Cliente', 'Subagente', 'Fatturato', 'Dai fornitori', 'Ai subagenti', 'Margine']]
          .concat(sel.map(r => [M.data(r.data), r.numero, r.tipo === 'nota_credito' ? 'nota di credito' : 'fattura', r.fornitore, r.cliente, r.nome_cliente, r.subagente, r.importo, r.prese, r.pagate, r.margine]))
      };
    }
    CRM.modelloAnalisi = modello;   // per le prove
  }
})();
