/* ============================================================
   Viste "Vendita diretta" (dalla Gestione Ordini, spec §7.18–§7.21):
   Ordini cliente con esportazione per Integra, Articoli, Giacenze, Alias e kit.
   Articoli e giacenze arrivano da Integra (viste sul database, sincronizzazione ogni pochi
   secondi): sola lettura. Alias e kit sono del CRM. Solo composizione di componenti CRM.*
   ============================================================ */
(function () {
  'use strict';
  const e = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const quando = iso => iso ? M.data(iso.slice(0, 10)) + (iso.length > 10 ? ' ' + iso.slice(11, 19) : '') : '—';
  const sync = () => 'Da Integra, sincronizzato alle ' + (M.S.sincronizzato || '').slice(11, 19) + ' del ' + M.data((M.S.sincronizzato || '').slice(0, 10)) + ' · sola lettura';
  const pallinoAnag = cod => '<span class="pallino ' + (cod && M.articoloAnag(cod) ? 'ok' : 'ko') + '" title="' + (cod && M.articoloAnag(cod) ? 'Articolo in anagrafica Integra' : 'Non in anagrafica Integra') + '"></span>';
  const disp = cod => { const d = M.disponibile(cod); return d == null ? '<span class="testo-tenue">—</span>' : '<span class="' + (d < 0 ? 'negativo' : d === 0 ? 'testo-attesa' : '') + '">' + M.num(d) + '</span>'; };

  /* =========================================================
     Ordini cliente: elenco + scheda + esportazione per Integra
     ========================================================= */
  let filtroOrdini = { vista: 'da', q: '' };
  function vistaOrdini(idSel) {
    const ordini = M.S.ordini_cliente;
    const corpo = CRM.Pagina({ voce: 'ordini-cliente', titolo: 'Ordini cliente', pieno: true,
      sottotitolo: 'Vendita diretta: gli ordini dei clienti, controllati e esportati per Integra applicando codici nuovi (alias) e kit.' });
    const o = M.ordineCliente(idSel) || ordini.filter(x => !x.esportato)[0] || ordini[0];
    const col = CRM.blocco(corpo, 'colonne posta riempi');
    const sx = CRM.Pannello(col, { titolo: 'Ordini', riempi: true, nota: ordini.filter(x => !x.esportato).length + ' da esportare' });
    const VISTE = { da: x => !x.esportato, esp: x => !!x.esportato, tutti: () => true };
    CRM.FilterBar(sx.corpo, { campi: [
      { nome: 'vista', tipo: 'segmenti', valore: filtroOrdini.vista, opzioni: [{ value: 'da', label: 'Da esportare', n: ordini.filter(VISTE.da).length }, { value: 'esp', label: 'Esportati', n: ordini.filter(VISTE.esp).length }, { value: 'tutti', label: 'Tutti', n: ordini.length }] },
      { nome: 'q', tipo: 'cerca', valore: filtroOrdini.q, placeholder: 'Numero o cliente' }
    ], onChange: v => { filtroOrdini = v; disegnaElenco(); } });
    const elenco = CRM.blocco(sx.corpo, '');
    function disegnaElenco() {
      const q = (filtroOrdini.q || '').toLowerCase();
      const lista = ordini.filter(VISTE[filtroOrdini.vista]).filter(x => !q || (x.numero + ' ' + M.nomeCliente(x.cliente_piva)).toLowerCase().indexOf(q) >= 0).sort((a, b) => b.data.localeCompare(a.data));
      elenco.innerHTML = '';
      if (!lista.length) { CRM.Nota(elenco, 'Nessun ordine in questo elenco.'); return; }
      CRM.ElencoSelezionabile(elenco, lista.map(x => {
        const p = M.proposteEsportazione(x), err = M.controlliEsportazione(x, M.righeFinali(x, p));
        return { id: x.id, href: '#/ordini-cliente/' + x.id, titolo: x.numero + ' · ' + M.nomeCliente(x.cliente_piva), valore: M.euro(M.totaleOrdineCliente(x)),
          sotto: M.data(x.data) + ' · ' + x.righe.length + ' righe · ' + x.fornitore,
          stato: x.esportato ? CRM.stato('ok', 'Esportato il ' + M.data(x.esportato.quando.slice(0, 10))) :
            (err.length ? CRM.stato('errore', err.length + (err.length === 1 ? ' problema' : ' problemi')) : CRM.stato('info', 'Da esportare')) +
            (p.alias.length ? ' ' + CRM.stato('attesa', p.alias.length + ' alias') : '') + (p.kit.length ? ' ' + CRM.stato('attesa', p.kit.length + ' kit') : '') };
      }), o && o.id);
    }
    disegnaElenco();
    if (!o) return;

    const cl = M.cliente(o.cliente_piva), p = M.proposteEsportazione(o), err = M.controlliEsportazione(o, M.righeFinali(o, p));
    const dx = CRM.Pannello(col, { titolo: o.numero + ' · ' + M.nomeCliente(o.cliente_piva), riempi: true, nota: CRM.icona('file') + ' ' + e(o.file),
      azioni: o.esportato ? [{ etichetta: 'Esporta di nuovo', icona: 'scarica', onClick: () => esporta(o) }, { etichetta: 'Annulla esportazione', variante: 'pericolo', onClick: () => annulla(o) }]
        : [{ etichetta: 'Esporta per Integra', icona: 'scarica', variante: 'primario', onClick: () => esporta(o) }] });
    CRM.Dettagli(dx.corpo, [
      { etichetta: 'Cliente', valore: e(M.nomeCliente(o.cliente_piva)) + '<span class="sec-riga">P.IVA ' + e(o.cliente_piva) + '</span>' },
      { etichetta: 'Codice Integra', valore: cl && cl.codice_integra ? e(cl.codice_integra) : '<span class="negativo">mancante</span>' },
      { etichetta: 'Data ordine', valore: M.data(o.data) },
      { etichetta: 'Fornitore', valore: e(o.fornitore) + (o.rif_fornitore ? '<span class="sec-riga">rif. ' + e(o.rif_fornitore) + '</span>' : '') },
      { etichetta: 'Totale', valore: M.euro(M.totaleOrdineCliente(o)) },
      { etichetta: 'Esportazione', valore: o.esportato ? CRM.stato('ok', 'Esportato') + '<span class="sec-riga">' + quando(o.esportato.quando) + ' · ' + e(o.esportato.da) + '<br>' + o.esportato.file.map(e).join('<br>') + '</span>' : CRM.stato('info', 'Da esportare') }
    ], { inColonne: true });
    if (err.length) CRM.Nota(dx.corpo, '<b>Da sistemare prima di esportare:</b> ' + err.map(e).join(' · ')).classList.add('nota-errore');
    CRM.blocco(dx.corpo, '', 'height:14px;flex:none');
    CRM.DataTable(CRM.blocco(dx.corpo, 'riempi'), {
      compatta: true, righe: o.righe, etichettaTotale: 'Totale ordine',
      colonne: [
        { key: 'n', header: '#', tipo: 'numero' },
        { key: 'codice', header: 'Articolo', grow: true, cell: r => '<span class="cod-anag">' + pallinoAnag(r.codice) + (r.codice ? '<b>' + e(r.codice) + '</b>' : '<span class="negativo">codice mancante</span>') + '</span>' +
          '<span class="sec-riga">' + e(r.descrizione) + '</span>' +
          (M.aliasDi(r.codice) ? '<span class="sec-riga">' + CRM.stato('attesa', 'alias → ' + M.aliasDi(r.codice).nuovo) + '</span>' : '') + (M.kitDi(r.codice) ? '<span class="sec-riga">' + CRM.stato('attesa', 'kit di ' + M.kitDi(r.codice).componenti.length + ' componenti') + '</span>' : '') },
        { key: 'qta', header: 'Quantità', align: 'right', cell: r => M.num(r.qta) + ' <span class="testo-tenue">' + e(r.um) + '</span>' },
        { key: 'prezzo', header: 'Prezzo', tipo: 'euro' },
        { key: 'tot', header: 'Importo', tipo: 'euro', valore: r => M.r2(r.qta * r.prezzo), totale: 'somma' },
        { key: 'disp', header: 'Disponibile', align: 'right', sortValue: r => M.disponibile(r.codice) || 0, cell: r => r.codice ? disp(r.codice) : '' }
      ]
    });
    CRM.Nota(dx.corpo, 'Pallino verde: articolo nell’anagrafica di Integra. Disponibile = giacenza di Integra meno le quantità già esportate e non ancora registrate in Integra.' +
      (o.esportato && M.S.impegni.some(i => i.ordine === o.numero && i.stato === 'impegnato') ? ' <button type="button" class="btn testo piccolo" id="simula-reg">Prototipo: simula la registrazione in Integra</button>' : '')).style.marginTop = '8px';
    const sim = CRM.$('#simula-reg', dx.corpo);
    if (sim) sim.addEventListener('click', () => { M.simulaRegistrazioneIntegra(o); M.salva(); CRM.Avviso('Integra ha registrato ' + o.numero + ': impegni chiusi, giacenze aggiornate'); CRM.naviga(); });
  }
  CRM.rotta(/^\/ordini-cliente$/, () => vistaOrdini(null));
  CRM.rotta(/^\/ordini-cliente\/(\d+)$/, id => vistaOrdini(id));

  /* Esportazione: scheda codici vecchio → nuovo, scheda kit, tipo di file, controlli. */
  function esporta(o) {
    const p = M.proposteEsportazione(o);
    let tipi = { OC: true, OF: false };
    const m = CRM.Modale({
      titolo: 'Esporta ' + o.numero + ' per Integra', testo: 'Controlla i cambi di codice e i kit, scegli i file e genera. Le quantità esportate vengono impegnate finché Integra non registra l’ordine.',
      corpo: c => {
        const ridisegna = () => {
          const fin = M.righeFinali(o, p), err = M.controlliEsportazione(o, fin), av = M.avvisiEsportazione(fin);
          c.innerHTML = '';
          const sez = (titolo, nota) => { const h = document.createElement('h3'); h.className = 'esp-titolo'; h.innerHTML = e(titolo) + (nota ? ' <span class="testo-tenue">' + nota + '</span>' : ''); c.appendChild(h); };
          sez('Codici vecchio → nuovo', p.alias.length ? p.alias.length + (p.alias.length === 1 ? ' riga' : ' righe') : 'nessun cambio di codice');
          if (p.alias.length) {
            const t = CRM.DataTable(c, { compatta: true, naturale: true, righe: p.alias, colonne: [
              { key: 'applica', header: 'Applica', sortable: false, cell: a => '<input type="checkbox" data-alias="' + a.n + '"' + (a.applica ? ' checked' : '') + ' aria-label="Applica il cambio di codice">' },
              { key: 'vecchio', header: 'Riga · codice', cell: a => a.n + ' · <b>' + e(a.vecchio) + '</b> → <b>' + e(a.nuovo) + '</b><span class="sec-riga">' + ({ A: 'disponibile il vecchio: nessun cambio', B: 'disponibile in parte: divide', C: 'vecchio esaurito: tutto sul nuovo' })[a.caso] + (a.conferma ? ' · chiede conferma' : '') + '</span>' },
              { key: 'qta', header: 'Ordinato', tipo: 'numero' },
              { key: 'dv', header: 'Disp. vecchio', align: 'right', cell: a => a.disp_vecchio == null ? '—' : M.num(a.disp_vecchio) },
              { key: 'qv', header: 'Sul vecchio', align: 'right', sortable: false, cell: a => '<input type="number" min="0" step="1" class="qta-cella" data-qv="' + a.n + '" value="' + a.qta_vecchio + '"' + (a.applica ? '' : ' disabled') + '>' },
              { key: 'qn', header: 'Sul nuovo', align: 'right', sortable: false, cell: a => '<input type="number" min="0" step="1" class="qta-cella" data-qn="' + a.n + '" value="' + a.qta_nuovo + '"' + (a.applica ? '' : ' disabled') + '>' }
            ] });
            t.el.addEventListener('change', ev => {
              const x = ev.target, a = p.alias.find(y => String(y.n) === (x.dataset.alias || x.dataset.qv || x.dataset.qn));
              if (x.dataset.alias) a.applica = x.checked;
              if (x.dataset.qv) { a.qta_vecchio = Math.max(0, Number(x.value) || 0); a.qta_nuovo = Math.max(0, M.r2(a.qta - a.qta_vecchio)); }
              if (x.dataset.qn) { a.qta_nuovo = Math.max(0, Number(x.value) || 0); a.qta_vecchio = Math.max(0, M.r2(a.qta - a.qta_nuovo)); }
              ridisegna();
            });
          }
          sez('Kit', p.kit.length ? 'articoli esauriti sostituiti dai componenti' : 'nessun kit da applicare');
          if (p.kit.length) {
            const t = CRM.DataTable(c, { compatta: true, naturale: true, righe: p.kit, colonne: [
              { key: 'applica', header: 'Applica', sortable: false, cell: k => '<input type="checkbox" data-kit="' + k.n + '"' + (k.applica ? ' checked' : '') + ' aria-label="Sostituisci con i componenti">' },
              { key: 'codice', header: 'Riga · kit', cell: k => k.n + ' · <b>' + e(k.codice) + '</b> × ' + M.num(k.qta) + '<span class="sec-riga">disponibile ' + (k.disponibile == null ? 'assente' : M.num(k.disponibile)) + '</span>' },
              { key: 'comp', header: 'Componenti × quantità = totale', grow: true, sortable: false, cell: k => k.componenti.map(x => e(x.codice) + ' × ' + M.num(x.qta_comp) + ' = <b>' + M.num(x.qta_tot) + '</b>' + (x.disponibile != null && x.disponibile < x.qta_tot ? ' <span class="negativo">(disp. ' + M.num(x.disponibile) + ')</span>' : '')).join('<br>') }
            ] });
            t.el.addEventListener('change', ev => { const k = p.kit.find(y => String(y.n) === ev.target.dataset.kit); if (k) { k.applica = ev.target.checked; ridisegna(); } });
          }
          sez('File da generare');
          const f = document.createElement('div'); f.className = 'scelte-tipi';
          f.innerHTML = [['OC', 'Ordine cliente', 'OC0000 · cliente ' + ((M.cliente(o.cliente_piva) || {}).codice_integra || '?')], ['OF', 'Ordine fornitore', 'OF0000 · stesso ordine verso il fornitore']].map(x =>
            '<label class="scelta-esporta"><input type="checkbox" data-tipo="' + x[0] + '"' + (tipi[x[0]] ? ' checked' : '') + '><span><b>' + x[1] + ' (' + x[0] + ')</b><span>' + x[2] + '</span></span></label>').join('');
          c.appendChild(f);
          f.addEventListener('change', ev => { tipi[ev.target.dataset.tipo] = ev.target.checked; ridisegna(); });
          const scelti = Object.keys(tipi).filter(k => tipi[k]);
          const r = document.createElement('p'); r.className = 'nota';
          r.innerHTML = '<b>' + fin.length + (fin.length === 1 ? ' riga' : ' righe') + '</b> nel file' + (scelti.length ? ': ' + M.nomiFileIntegra(o, scelti).map(e).join(', ') : '') + '.';
          c.appendChild(r);
          if (!scelti.length) err.push('Scegli almeno un file (OC o OF)');
          if (err.length) CRM.Nota(c, '<b>Non si può generare:</b> ' + err.map(e).join(' · ')).classList.add('nota-errore');
          if (av.length) CRM.Nota(c, '<b>Attenzione:</b> ' + av.map(e).join(' · ')).classList.add('nota-attesa');
          const b = CRM.$('.modale-piede .btn:last-child', c.closest('.modale')); if (b) b.disabled = !!err.length;
        };
        setTimeout(ridisegna);   // dopo la creazione del piede
        ridisegna();
      },
      azioni: [{ etichetta: 'Annulla', variante: 'sec' }, { etichetta: 'Genera i file', onClick: () => {
        const fin = M.righeFinali(o, p), scelti = Object.keys(tipi).filter(k => tipi[k]);
        if (M.controlliEsportazione(o, fin).length || !scelti.length) return false;
        const nomi = M.nomiFileIntegra(o, scelti);
        Promise.all(scelti.map(t => CRM.fileIntegra(o, fin, t))).then(blobs => {
          blobs.forEach((b, i) => CRM.scarica(nomi[i], b, b.type));
          const prima = !o.esportato;
          M.registraEsportazione(o, fin, nomi); M.salva();
          CRM.Avviso((nomi.length === 1 ? 'Generato ' : 'Generati ') + nomi.join(', ') + (prima ? ' · quantità impegnate' : ''));
          CRM.naviga();
        });
      } }]
    });
    m.corpo.closest('.modale').classList.add('larga');
  }
  async function annulla(o) {
    const n = M.S.impegni.filter(i => i.ordine === o.numero && i.stato === 'impegnato').length;
    if (!(await CRM.Conferma('Annullare l’esportazione di ' + o.numero + '?', 'L’ordine torna "da esportare"' + (n ? ' e ' + n + (n === 1 ? ' impegno viene rilasciato' : ' impegni vengono rilasciati') : '') + '. Se Integra lo ha già registrato, va annullato anche in Integra.', 'Annulla esportazione', true))) return;
    const r = M.annullaEsportazione(o); M.salva(); CRM.Avviso('Esportazione annullata' + (r ? ': ' + r + ' impegni rilasciati' : '')); CRM.naviga();
  }

  /* =========================================================
     Articoli (da Integra, sola lettura)
     ========================================================= */
  let filtroArt = { q: '', um: '', vista: 'tutti' };
  CRM.rotta(/^\/articoli$/, function () {
    const art = M.S.articoli;
    const corpo = CRM.Pagina({ voce: 'articoli', titolo: 'Articoli', pieno: true, sottotitolo: sync() + '. Servono a controllare le righe degli ordini cliente e a definire alias e kit.' });
    const ums = art.map(a => a.um).filter((u, i, x) => u && x.indexOf(u) === i).sort();
    const VISTE = { tutti: () => true, alias: a => M.S.alias.some(x => x.vecchio === a.codice || x.nuovo === a.codice), kit: a => M.S.kit.some(k => k.codice === a.codice), esauriti: a => (M.disponibile(a.codice) || 0) <= 0 };
    CRM.FilterBar(corpo, { campi: [
      { nome: 'q', tipo: 'cerca', valore: filtroArt.q, placeholder: 'Codice, descrizione o EAN' },
      { nome: 'um', tipo: 'select', valore: filtroArt.um, opzioni: [{ value: '', label: 'Tutte le UM' }].concat(ums.map(u => ({ value: u, label: u }))) },
      { nome: 'vista', tipo: 'segmenti', valore: filtroArt.vista, opzioni: [{ value: 'tutti', label: 'Tutti', n: art.length }, { value: 'alias', label: 'Con alias', n: art.filter(VISTE.alias).length }, { value: 'kit', label: 'Kit', n: art.filter(VISTE.kit).length }, { value: 'esauriti', label: 'Esauriti', n: art.filter(VISTE.esauriti).length }] }
    ], onChange: v => { filtroArt = v; tab.aggiorna(filtra()); } });
    const filtra = () => { const q = (filtroArt.q || '').toLowerCase(); return art.filter(VISTE[filtroArt.vista]).filter(a => !filtroArt.um || a.um === filtroArt.um).filter(a => !q || [a.codice, a.descrizione, a.ean].some(t => String(t || '').toLowerCase().indexOf(q) >= 0)); };
    const tab = CRM.DataTable(CRM.blocco(corpo, 'riempi'), {
      righe: filtra(), ordinamentoIniziale: { key: 'codice', dir: 'asc' },
      colonne: [
        { key: 'codice', header: 'Codice', cell: a => '<b>' + e(a.codice) + '</b>' },
        { key: 'descrizione', header: 'Descrizione', grow: true, cell: a => e(a.descrizione) + (M.aliasDi(a.codice) ? '<span class="sec-riga">alias → ' + e(M.aliasDi(a.codice).nuovo) + '</span>' : '') + (M.S.alias.some(x => x.nuovo === a.codice) ? '<span class="sec-riga">sostituisce ' + M.S.alias.filter(x => x.nuovo === a.codice).map(x => e(x.vecchio)).join(', ') + '</span>' : '') + (M.S.kit.some(k => k.codice === a.codice) ? '<span class="sec-riga">kit · <a href="#/alias-kit/kit/' + encodeURIComponent(a.codice) + '">componenti</a></span>' : '') },
        { key: 'ean', header: 'EAN' },
        { key: 'um', header: 'UM' },
        { key: 'disp', header: 'Disponibile', align: 'right', sortValue: a => M.disponibile(a.codice) == null ? -1e9 : M.disponibile(a.codice), cell: a => disp(a.codice) }
      ],
      onRowClick: a => { location.hash = '#/giacenze/' + encodeURIComponent(a.codice); },
      emptyText: 'Nessun articolo', emptyHint: 'Gli articoli nuovi si creano in Integra e arrivano con la sincronizzazione.'
    });
  });

  /* =========================================================
     Giacenze: elenco (Integra − impegni) + movimenti dell'articolo
     ========================================================= */
  let filtroGiac = null;
  function vistaGiacenze(codSel) {
    const codici = M.S.articoli.map(a => a.codice).concat(M.S.giacenze.map(g => g.codice)).filter((c, i, x) => x.indexOf(c) === i);
    const riga = c => ({ codice: c, art: M.articoloAnag(c), integra: M.giacenzaIntegra(c), imp: M.impegnato(c), disp: M.disponibile(c) });
    const righe = codici.map(riga);
    const sel = codSel ? riga(decodeURIComponent(codSel)) : null;
    const corpo = CRM.Pagina({ voce: 'giacenze', titolo: 'Giacenze', pieno: true, sottotitolo: sync() + ' (giacenze ogni ' + M.S.impostazioni.integra.secondi_giacenze + ' secondi). Disponibile = giacenza di Integra meno le quantità esportate e non ancora registrate.' });
    const aperti = M.S.impegni.filter(i => i.stato === 'impegnato');
    const F = { esauriti: x => x.disp != null && x.disp === 0, negativi: x => x.disp != null && x.disp < 0, impegnati: x => x.imp > 0 };
    CRM.KpiRow(corpo, [
      { id: 'esauriti', etichetta: 'Esauriti', valore: String(righe.filter(F.esauriti).length), variante: 'attesa', dettagli: [{ testo: 'disponibile a zero' }] },
      { id: 'negativi', etichetta: 'Negativi', valore: String(righe.filter(F.negativi).length), variante: righe.some(F.negativi) ? 'errore' : 'ok', dettagli: [{ testo: 'esportato più del disponibile' }] },
      { id: 'impegnati', etichetta: 'Con impegni aperti', valore: String(righe.filter(F.impegnati).length), variante: 'primario', dettagli: [{ testo: aperti.length + ' impegni in attesa di Integra' }] }
    ], { selezionata: filtroGiac, onSeleziona: id => { filtroGiac = id; tab.aggiorna(filtra()); } });
    const filtra = () => righe.filter(x => !filtroGiac || F[filtroGiac](x));
    const col = CRM.blocco(corpo, 'colonne riempi');
    const pl = CRM.Pannello(col, { titolo: 'Articoli', riempi: true, senzaMargine: true });
    const tab = CRM.DataTable(pl.corpo, {
      compatta: true, righe: filtra(), ordinamentoIniziale: { key: 'codice', dir: 'asc' }, rowClass: x => sel && x.codice === sel.codice ? 'selezionata' : '',
      colonne: [
        { key: 'codice', header: 'Articolo', grow: true, cell: x => '<b>' + e(x.codice) + '</b><span class="sec-riga">' + e(x.art ? x.art.descrizione + ' · ' + x.art.um : 'non in anagrafica') + '</span>' },
        { key: 'integra', header: 'Integra', tipo: 'numero', valore: x => x.integra, cell: x => x.integra == null ? '<span class="testo-tenue">—</span>' : M.num(x.integra) },
        { key: 'imp', header: 'Impegnato', tipo: 'numero', cell: x => x.imp ? M.num(x.imp) : '<span class="testo-tenue">—</span>' },
        { key: 'disp', header: 'Disponibile', align: 'right', sortValue: x => x.disp == null ? -1e9 : x.disp, cell: x => disp(x.codice) }
      ],
      onRowClick: x => { location.hash = '#/giacenze/' + encodeURIComponent(x.codice); }
    });
    const pd = CRM.Pannello(col, { titolo: sel ? sel.codice : 'Movimenti', riempi: true, senzaMargine: !sel, nota: sel && sel.art ? e(sel.art.descrizione) : '' });
    if (!sel) { pd.corpo.innerHTML = '<div class="vuoto"><b>Scegli un articolo</b>Vedi giacenza di Integra, impegni del CRM e ordini che li hanno creati.</div>'; return; }
    CRM.Cifre(pd.corpo, [
      { etichetta: 'Giacenza in Integra', valore: sel.integra == null ? '—' : M.num(sel.integra) },
      { etichetta: 'Impegnato dal CRM', valore: sel.imp ? '− ' + M.num(sel.imp) : '—', nota: 'esportato, in attesa che Integra registri' },
      { etichetta: 'Disponibile', valore: sel.disp == null ? '—' : M.num(sel.disp), forte: true }
    ]);
    const mov = M.S.impegni.filter(i => i.codice === sel.codice);
    CRM.blocco(pd.corpo, '', 'height:12px;flex:none');
    CRM.DataTable(CRM.blocco(pd.corpo, 'riempi'), {
      compatta: true, righe: mov, ordinamentoIniziale: { key: 'quando', dir: 'desc' },
      colonne: [
        { key: 'quando', header: 'Esportato', cell: i => quando(i.quando) },
        { key: 'ordine', header: 'Ordine', cell: i => { const o = M.S.ordini_cliente.find(x => x.numero === i.ordine); return o ? '<a href="#/ordini-cliente/' + o.id + '">' + e(i.ordine) + '</a>' : e(i.ordine); } },
        { key: 'qta', header: 'Quantità', tipo: 'numero' },
        { key: 'stato', header: 'Stato', cell: i => i.stato === 'impegnato' ? CRM.stato('attesa', 'Impegnato') : i.stato === 'registrato' ? CRM.stato('ok', 'Registrato in Integra') + '<span class="sec-riga">' + quando(i.registrato) + '</span>' : CRM.stato('neutro', 'Rilasciato') + '<span class="sec-riga">esportazione annullata</span>' }
      ],
      emptyText: 'Nessun movimento dal CRM', emptyHint: 'La giacenza arriva solo da Integra.'
    });
  }
  CRM.rotta(/^\/giacenze$/, () => vistaGiacenze(null));
  CRM.rotta(/^\/giacenze\/(.+)$/, c => vistaGiacenze(c));

  /* =========================================================
     Alias e kit (tabelle del CRM): due schede nella stessa pagina
     ========================================================= */
  function testataAliasKit(scheda) {
    const corpo = CRM.Pagina({ voce: 'alias-kit', titolo: 'Alias e kit', pieno: true,
      sottotitolo: 'Regole applicate all’esportazione degli ordini cliente: un codice vecchio passa al nuovo in base al disponibile; un articolo esaurito si sostituisce con i componenti del suo kit.',
      azioni: M.puo('magazzino') ? [scheda === 'alias' ? { etichetta: 'Nuovo alias', icona: 'piu', onClick: () => modificaAlias(null) } : { etichetta: 'Nuovo kit', icona: 'piu', onClick: () => nuovoKit() }] : [] });
    CRM.FilterBar(corpo, { campi: [{ nome: 's', tipo: 'segmenti', valore: scheda, opzioni: [{ value: 'alias', label: 'Codici vecchio → nuovo', n: M.S.alias.length }, { value: 'kit', label: 'Kit', n: M.S.kit.length }] }],
      onChange: v => { location.hash = '#/alias-kit/' + v.s; } });
    return corpo;
  }
  CRM.rotta(/^\/alias-kit$/, () => { location.replace('#/alias-kit/alias'); });
  CRM.rotta(/^\/alias-kit\/alias$/, function () {
    const corpo = testataAliasKit('alias');
    const puo = M.puo('magazzino');
    const tab = CRM.DataTable(CRM.blocco(corpo, 'riempi'), {
      righe: M.S.alias, ordinamentoIniziale: { key: 'vecchio', dir: 'asc' },
      colonne: [
        { key: 'vecchio', header: 'Codice vecchio', cell: a => '<span class="cod-anag">' + pallinoAnag(a.vecchio) + '<b>' + e(a.vecchio) + '</b></span><span class="sec-riga">disponibile ' + (M.disponibile(a.vecchio) == null ? '—' : M.num(M.disponibile(a.vecchio))) + '</span>' },
        { key: 'nuovo', header: 'Codice nuovo', cell: a => '<span class="cod-anag">' + pallinoAnag(a.nuovo) + '<b>' + e(a.nuovo) + '</b></span><span class="sec-riga">disponibile ' + (M.disponibile(a.nuovo) == null ? '—' : M.num(M.disponibile(a.nuovo))) + '</span>' },
        { key: 'descrizione', header: 'Descrizione', grow: true, cell: a => e(a.descrizione) + (a.ean ? '<span class="sec-riga">EAN ' + e(a.ean) + '</span>' : '') },
        { key: 'conferma', header: 'Chiede conferma', align: 'center', sortValue: a => a.conferma ? 1 : 0, cell: a => '<input type="checkbox" data-conferma="' + a.id + '"' + (a.conferma ? ' checked' : '') + (puo ? '' : ' disabled') + ' aria-label="Chiede conferma all’esportazione">' },
        { key: 'az', header: '', sortable: false, cell: a => puo ? '<span class="azioni-cella"><button type="button" class="btn sec piccolo" data-mod="' + a.id + '">Modifica</button><button type="button" class="btn testo piccolo pericolo-testo" data-del="' + a.id + '">Elimina</button></span>' : '' }
      ],
      piede: 'Pallino verde: codice nell’anagrafica di Integra. "Chiede conferma": all’esportazione il cambio compare per essere confermato o modulato.',
      emptyText: 'Nessun alias', emptyHint: 'Aggiungi un alias quando un fornitore cambia codice a un articolo.'
    });
    tab.el.addEventListener('change', ev => { const id = ev.target.dataset.conferma; if (!id) return; const a = M.S.alias.find(x => x.id === Number(id)); a.conferma = ev.target.checked; M.annota('Alias ' + a.vecchio + ': conferma ' + (a.conferma ? 'richiesta' : 'non richiesta')); M.salva(); });
    tab.el.addEventListener('click', async ev => {
      const m = ev.target.closest('[data-mod]'), d = ev.target.closest('[data-del]');
      if (m) modificaAlias(M.S.alias.find(x => x.id === Number(m.dataset.mod)));
      if (d) { const a = M.S.alias.find(x => x.id === Number(d.dataset.del)); if (!(await CRM.Conferma('Eliminare l’alias ' + a.vecchio + ' → ' + a.nuovo + '?', 'Gli ordini con il codice vecchio verranno esportati con il codice vecchio.', 'Elimina', true))) return; M.S.alias.splice(M.S.alias.indexOf(a), 1); M.annota('Alias ' + a.vecchio + ' eliminato'); M.salva(); CRM.naviga(); }
    });
  });
  function modificaAlias(a) {
    CRM.FormModal({
      titolo: a ? 'Alias ' + a.vecchio : 'Nuovo alias', conferma: 'Salva', colonne: 2,
      campi: [
        { nome: 'vecchio', etichetta: 'Codice vecchio', valore: a ? a.vecchio : '', placeholder: 'come arriva negli ordini' },
        { nome: 'nuovo', etichetta: 'Codice nuovo', tipo: 'ricerca', entita: 'articoloAnag', valore: a ? a.nuovo : '', placeholder: 'articolo di Integra' },
        { nome: 'descrizione', etichetta: 'Descrizione', valore: a ? a.descrizione : '', largo: true },
        { nome: 'ean', etichetta: 'EAN', valore: a ? a.ean : '' },
        { nome: 'conferma', etichetta: 'All’esportazione', tipo: 'select', valore: !a || a.conferma ? 'si' : 'no', opzioni: [{ value: 'si', label: 'Chiede conferma' }, { value: 'no', label: 'Applica senza chiedere' }] }
      ],
      dopo: form => form.el.addEventListener('ricerca-scelta', ev => { if (!form.campo('descrizione').value) form.campo('descrizione').value = ev.detail.voce.descrizione; if (!form.campo('ean').value) form.campo('ean').value = ev.detail.voce.ean || ''; }),
      onConferma: (v, form) => {
        const vec = v.vecchio.toUpperCase(), nuo = v.nuovo.toUpperCase();
        if (!vec || !nuo) { form.errore('Indica codice vecchio e codice nuovo.'); return false; }
        if (vec === nuo) { form.errore('Il codice nuovo deve essere diverso dal vecchio.'); return false; }
        if (M.S.alias.some(x => x !== a && x.vecchio.toUpperCase() === vec)) { form.errore('Il codice ' + vec + ' ha già un alias.'); return false; }
        if (M.S.alias.some(x => x !== a && x.vecchio.toUpperCase() === nuo)) { form.errore(nuo + ' è a sua volta un codice vecchio: crea una catena. Punta direttamente al codice finale.'); return false; }
        const rec = a || { id: Math.max(0, ...M.S.alias.map(x => x.id)) + 1 };
        Object.assign(rec, { vecchio: vec, nuovo: nuo, descrizione: v.descrizione, ean: v.ean, conferma: v.conferma === 'si' });
        if (!a) M.S.alias.push(rec);
        M.annota('Alias ' + vec + ' → ' + nuo + (a ? ' aggiornato' : ' creato')); M.salva(); CRM.Avviso(M.articoloAnag(nuo) ? 'Alias salvato' : 'Alias salvato: ' + nuo + ' non è ancora fra gli articoli di Integra'); CRM.naviga();
      }
    });
  }

  CRM.rotta(/^\/alias-kit\/kit$/, () => vistaKit(null));
  CRM.rotta(/^\/alias-kit\/kit\/(.+)$/, c => vistaKit(decodeURIComponent(c)));
  function vistaKit(codSel) {
    const corpo = testataAliasKit('kit');
    const puo = M.puo('magazzino');
    const k = M.S.kit.find(x => x.codice === codSel) || M.S.kit[0];
    const col = CRM.blocco(corpo, 'colonne riempi', 'grid-template-columns:minmax(0,1fr) minmax(0,1.3fr)');
    const pl = CRM.Pannello(col, { titolo: 'Kit', riempi: true, senzaMargine: true });
    CRM.DataTable(pl.corpo, {
      compatta: true, righe: M.S.kit, ordinamentoIniziale: { key: 'codice', dir: 'asc' }, rowClass: x => k && x.codice === k.codice ? 'selezionata' : '',
      colonne: [
        { key: 'codice', header: 'Kit', grow: true, cell: x => '<b>' + e(x.codice) + '</b> ' + (x.attivo ? '' : CRM.stato('neutro', 'Spento')) + '<span class="sec-riga">' + e(x.descrizione) + '</span>' },
        { key: 'n', header: 'Componenti', tipo: 'numero', valore: x => x.componenti.length },
        { key: 'disp', header: 'Disponibile', align: 'right', sortValue: x => M.disponibile(x.codice) || 0, cell: x => disp(x.codice) }
      ],
      onRowClick: x => { location.hash = '#/alias-kit/kit/' + encodeURIComponent(x.codice); },
      emptyText: 'Nessun kit'
    });
    if (!k) return;
    const pd = CRM.Pannello(col, { titolo: k.codice, nota: e(k.descrizione), riempi: true, senzaMargine: false,
      azioni: puo ? [{ etichetta: k.attivo ? 'Spegni' : 'Accendi', onClick: () => { k.attivo = !k.attivo; M.annota('Kit ' + k.codice + (k.attivo ? ' acceso' : ' spento')); M.salva(); CRM.naviga(); } },
        { etichetta: 'Aggiungi componente', icona: 'piu', onClick: () => componente(k, null) }, { etichetta: 'Elimina', variante: 'pericolo', onClick: async () => {
          if (!(await CRM.Conferma('Eliminare il kit ' + k.codice + '?', 'Gli ordini con ' + k.codice + ' verranno esportati con il codice del kit anche se esaurito.', 'Elimina', true))) return;
          M.S.kit.splice(M.S.kit.indexOf(k), 1); M.annota('Kit ' + k.codice + ' eliminato'); M.salva(); location.hash = '#/alias-kit/kit'; } }] : [] });
    CRM.Nota(pd.corpo, 'Quando ' + e(k.codice) + ' è esaurito (disponibile ' + (M.disponibile(k.codice) == null ? 'assente' : M.num(M.disponibile(k.codice))) + '), all’esportazione la riga si sostituisce con questi componenti, ognuno moltiplicato per la quantità ordinata.' + (k.attivo ? '' : ' <b>Kit spento: non si applica.</b>')).style.marginBottom = '12px';
    const tc = CRM.DataTable(CRM.blocco(pd.corpo, 'riempi'), {
      compatta: true, righe: k.componenti.map((c, i) => Object.assign({ i: i }, c)),
      colonne: [
        { key: 'codice', header: 'Componente', grow: true, cell: c => '<span class="cod-anag">' + pallinoAnag(c.codice) + '<b>' + e(c.codice) + '</b></span><span class="sec-riga">' + e((M.articoloAnag(c.codice) || {}).descrizione || 'non fra gli articoli di Integra') + '</span>' },
        { key: 'qta', header: 'Per kit', tipo: 'numero' },
        { key: 'disp', header: 'Disponibile', align: 'right', sortValue: c => M.disponibile(c.codice) || 0, cell: c => disp(c.codice) },
        { key: 'az', header: '', sortable: false, cell: c => puo ? '<span class="azioni-cella"><button type="button" class="btn sec piccolo" data-cmod="' + c.i + '">Modifica</button><button type="button" class="btn testo piccolo pericolo-testo" data-cdel="' + c.i + '">Togli</button></span>' : '' }
      ],
      emptyText: 'Nessun componente', emptyHint: 'Un kit senza componenti non si applica.'
    });
    tc.el.addEventListener('click', ev => {
      const m = ev.target.closest('[data-cmod]'), d = ev.target.closest('[data-cdel]');
      if (m) componente(k, Number(m.dataset.cmod));
      if (d) { const c = k.componenti.splice(Number(d.dataset.cdel), 1)[0]; M.annota('Kit ' + k.codice + ': tolto ' + c.codice); M.salva(); CRM.naviga(); }
    });
  }
  function componente(k, i) {
    const c = i == null ? null : k.componenti[i];
    CRM.FormModal({
      titolo: (c ? 'Componente ' + c.codice : 'Nuovo componente') + ' · ' + k.codice, conferma: 'Salva', colonne: 2,
      campi: [{ nome: 'codice', etichetta: 'Articolo', tipo: 'ricerca', entita: 'articoloAnag', valore: c ? c.codice : '' }, { nome: 'qta', etichetta: 'Quantità per kit', tipo: 'numero', passo: '1', valore: c ? c.qta : 1 }],
      onConferma: (v, form) => {
        const cod = v.codice.toUpperCase(), q = Number(v.qta);
        if (!cod || !(q > 0)) { form.errore('Indica articolo e quantità maggiore di zero.'); return false; }
        if (cod === k.codice.toUpperCase()) { form.errore('Un kit non può contenere se stesso.'); return false; }
        if (k.componenti.some((x, j) => j !== i && x.codice.toUpperCase() === cod)) { form.errore(cod + ' è già fra i componenti: modifica la quantità.'); return false; }
        if (c) Object.assign(c, { codice: cod, qta: q }); else k.componenti.push({ codice: cod, qta: q });
        M.annota('Kit ' + k.codice + ': ' + cod + ' × ' + q); M.salva(); CRM.naviga();
      }
    });
  }
  function nuovoKit() {
    CRM.FormModal({
      titolo: 'Nuovo kit', conferma: 'Crea il kit', testo: 'Il kit si applica a un articolo di Integra: quando è esaurito, all’esportazione viene sostituito dai componenti.',
      campi: [{ nome: 'codice', etichetta: 'Articolo da sostituire', tipo: 'ricerca', entita: 'articoloAnag', valore: '' }, { nome: 'descrizione', etichetta: 'Descrizione', valore: '' }],
      dopo: form => form.el.addEventListener('ricerca-scelta', ev => { form.campo('descrizione').value = ev.detail.voce.descrizione; }),
      onConferma: (v, form) => {
        const cod = v.codice.toUpperCase();
        if (!cod) { form.errore('Scegli l’articolo.'); return false; }
        if (M.S.kit.some(x => x.codice.toUpperCase() === cod)) { form.errore(cod + ' ha già un kit.'); return false; }
        M.S.kit.push({ codice: cod, descrizione: v.descrizione || (M.articoloAnag(cod) || {}).descrizione || '', attivo: true, componenti: [] });
        M.annota('Kit ' + cod + ' creato'); M.salva(); CRM.Avviso('Kit creato: aggiungi i componenti'); location.hash = '#/alias-kit/kit/' + encodeURIComponent(cod);
      }
    });
  }
})();
