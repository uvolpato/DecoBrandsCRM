/* ============================================================
   Viste "Anagrafiche": Fornitori, Subagenti, Clienti e abbinamenti
   Solo composizione di componenti CRM.*
   ============================================================ */
(function () {
  'use strict';
  const e = CRM.esc;

  /* ---------- Fornitori: DataTable + Pannello (Dettagli, DataTable percentuali) + FormModal ---------- */
  function vistaFornitori(idSel) {
    const corpo = CRM.Pagina({ voce: 'fornitori', titolo: 'Fornitori', pieno: true, sottotitolo: 'Condizioni di ogni fornitore e percentuali di provvigione per sconto, con la data da cui valgono.' });
    const f = M.fornitore(Number(idSel)) || M.S.fornitori[0];
    const col = CRM.blocco(corpo, 'colonne pari riempi');
    CRM.DataTable(CRM.blocco(col, 'riempi'), {
      colonne: [
        { key: 'nome', header: 'Fornitore', grow: true, cell: x => '<b>' + e(x.nome) + '</b>' + (x.id === f.id ? ' ' + CRM.stato('primario', 'aperto') : '') },
        { key: 'giorni_conferma', header: 'Attesa conferma', tipo: 'numero', cell: x => x.giorni_conferma + ' giorni' },
        { key: 'maturazione', header: 'Paga sul' },
        { key: 'pratiche', header: 'Pratiche aperte', tipo: 'numero', valore: x => M.S.pratiche.filter(p => p.fornitore_id === x.id && M.statoPratica(p).chiave !== 'fatturata').length }
      ],
      righe: M.S.fornitori, rowClass: x => x.id === f.id ? 'selezionata' : '',
      onRowClick: x => { location.hash = '#/fornitori/' + x.id; }
    });

    const versioni = Array.from(new Set(M.S.scaglioni.filter(s => s.fornitore_id === f.id).map(s => s.valido_dal))).sort().reverse();
    const vigente = versioni.find(v => v <= M.oggi()) || versioni[versioni.length - 1];
    const sc = M.S.scaglioni.filter(s => s.fornitore_id === f.id && s.valido_dal === vigente).sort((x, y) => x.sconto - y.sconto);
    const dx = CRM.Pannello(col, { titolo: f.nome, riempi: true, azioni: [{ etichetta: 'Modifica condizioni', onClick: () => modificaCondizioni(f) }] });
    CRM.Dettagli(dx.corpo, [
      { etichetta: 'Partita IVA', valore: e(f.piva) },
      { etichetta: 'Attesa della conferma', valore: f.giorni_conferma + ' giorni dall’ordine, poi parte il sollecito' },
      { etichetta: 'Pagamento provvigioni', valore: 'sul ' + f.maturazione + (f.maturazione === 'maturato' ? ' (quando incassa dai clienti)' : ' (all’emissione della fattura)') }
    ]);
    const perc = CRM.Pannello(dx.corpo, { titolo: 'Percentuali in vigore dal ' + M.data(vigente), senzaMargine: true,
      azioni: [{ etichetta: 'Nuove percentuali da una data', icona: 'piu', onClick: () => nuovePercentuali(f, sc) }] });
    perc.el.style.cssText = 'margin-top:20px;box-shadow:none';
    CRM.DataTable(perc.corpo, {
      compatta: true, naturale: true, righe: sc, ordinamentoIniziale: { key: 'sconto', dir: 'asc' },
      colonne: [
        { key: 'sconto', header: 'Sconto al cliente', tipo: 'pct' },
        { key: 'pct_agente', header: 'A Decobrands', tipo: 'pct' },
        { key: 'pct_sub', header: 'Al subagente', tipo: 'pct', cell: s => { const ecc = M.S.eccezioni.filter(x => x.scaglione_id === s.id); return M.pct(s.pct_sub) + (ecc.length ? '<span class="sec-riga">' + ecc.map(x => e(M.subagente(x.subagente_id).nome) + ' ' + M.pct(x.pct_sub)).join(', ') + '</span>' : ''); } },
        { key: 'tot', header: 'Totale dal fornitore', tipo: 'pct', valore: s => s.pct_agente + s.pct_sub },
        { key: 'clienti', header: 'Clienti', tipo: 'numero', valore: s => M.S.abbinamenti.filter(a => a.fornitore_id === f.id && a.sconto === s.sconto).length }
      ]
    });
    CRM.Nota(dx.corpo, versioni.length > 1 ? 'Versioni: ' + versioni.map(v => 'dal ' + M.data(v)).join(', ') + '. I documenti si calcolano con le percentuali in vigore alla loro data.'
      : 'Se ' + e(f.breve) + ' rivede le condizioni, inserisci le nuove percentuali con la data da cui valgono: i documenti precedenti restano calcolati con quelle di allora.').style.marginTop = '12px';
  }
  function modificaCondizioni(f) {
    CRM.FormModal({
      titolo: 'Condizioni di ' + f.breve, conferma: 'Salva condizioni', colonne: 2,
      campi: [
        { nome: 'giorni_conferma', etichetta: 'Giorni di attesa della conferma', tipo: 'numero', valore: f.giorni_conferma },
        { nome: 'maturazione', etichetta: 'Pagamento provvigioni', tipo: 'select', valore: f.maturazione, opzioni: [{ value: 'maturato', label: 'Sul maturato (incassi)' }, { value: 'fatturato', label: 'Sul fatturato' }] }
      ],
      onConferma: v => {
        f.giorni_conferma = Number(v.giorni_conferma) || f.giorni_conferma; f.maturazione = v.maturazione;
        M.annota('Condizioni di ' + f.breve + ' aggiornate'); M.salva(); CRM.Avviso('Condizioni salvate'); CRM.naviga();
      }
    });
  }
  function nuovePercentuali(f, sc) {
    const campi = [{ nome: 'valido_dal', etichetta: 'Valide dal', tipo: 'data', valore: M.oggi(), largo: true }];
    sc.forEach(s => campi.push(
      { nome: 'a' + s.sconto, etichetta: 'Sconto ' + M.pct(s.sconto) + ' · a Decobrands %', tipo: 'numero', passo: '0.5', valore: s.pct_agente },
      { nome: 's' + s.sconto, etichetta: 'Sconto ' + M.pct(s.sconto) + ' · al subagente %', tipo: 'numero', passo: '0.5', valore: s.pct_sub }));
    CRM.FormModal({
      titolo: 'Nuove percentuali di ' + f.breve, testo: 'Valgono per i documenti con data uguale o successiva a quella indicata.',
      conferma: 'Salva le nuove percentuali', colonne: 2, campi: campi,
      onConferma: (v, form) => {
        if (!v.valido_dal) { form.aiuto('valido_dal', 'Indica la data da cui valgono.', true); return false; }
        let id = Math.max.apply(null, M.S.scaglioni.map(s => s.id)) + 1;
        sc.forEach(s => M.S.scaglioni.push({ id: id++, fornitore_id: f.id, valido_dal: v.valido_dal, sconto: s.sconto, pct_agente: Number(v['a' + s.sconto]), pct_sub: Number(v['s' + s.sconto]) }));
        M.annota('Nuove percentuali di ' + f.breve + ' dal ' + M.data(v.valido_dal)); M.salva(); CRM.Avviso('Percentuali salvate: valgono dal ' + M.data(v.valido_dal)); CRM.naviga();
      }
    });
  }
  CRM.rotta(/^\/fornitori$/, () => vistaFornitori(null));
  CRM.rotta(/^\/fornitori\/(\d+)$/, id => vistaFornitori(id));

  /* ---------- Subagenti: DataTable + Pannello (DataTable clienti, Elenco eccezioni) ---------- */
  const pctSub = (a, s) => { const sc = M.scaglione(a.fornitore_id, a.sconto, M.oggi()); const ex = sc && M.S.eccezioni.find(x => x.scaglione_id === sc.id && x.subagente_id === s.id); return ex ? ex.pct_sub : sc ? sc.pct_sub : 0; };
  function vistaSubagenti(idSel) {
    const corpo = CRM.Pagina({ voce: 'subagenti', titolo: 'Subagenti', pieno: true, sottotitolo: 'Chi segue quali clienti e quanto ha maturato nel trimestre in corso. L’agente è uno solo: Decobrands SRL.' });
    const t = M.trimestre(M.oggi());
    const righe = M.righeLiquidazione(2026, t);
    const s = M.subagente(Number(idSel)) || M.S.subagenti[0];
    const col = CRM.blocco(corpo, 'colonne pari riempi');
    CRM.DataTable(CRM.blocco(col, 'riempi'), {
      colonne: [
        { key: 'nome', header: 'Subagente', grow: true, cell: x => '<b>' + e(x.nome) + '</b>' + (x.id === s.id ? ' ' + CRM.stato('primario', 'aperto') : '') + '<span class="sec-riga">' + e(x.email) + '</span>' },
        { key: 'clienti', header: 'Clienti seguiti', tipo: 'numero', valore: x => M.S.abbinamenti.filter(a => a.subagente_id === x.id).length },
        { key: 'liq', header: t + '° trim. liquidabile', tipo: 'euro', totale: 'somma', valore: x => righe.filter(r => r.subagente_id === x.id && r.liquidabile).reduce((a, r) => a + r.provvigione, 0) },
        { key: 'att', header: 'In attesa', tipo: 'euro', totale: 'somma', valore: x => righe.filter(r => r.subagente_id === x.id && !r.liquidabile).reduce((a, r) => a + r.provvigione, 0) }
      ],
      righe: M.S.subagenti, rowClass: x => x.id === s.id ? 'selezionata' : '',
      onRowClick: x => { location.hash = '#/subagenti/' + x.id; }
    });
    const dx = CRM.Pannello(col, { titolo: s.nome, riempi: true, azioni: [{ etichetta: 'Vedi la liquidazione', variante: 'testo', href: '#/liquidazioni/2026/' + t }] });
    dx.corpo.insertAdjacentHTML('beforeend', '<h3>Clienti seguiti</h3>');
    CRM.DataTable(dx.corpo, {
      compatta: true, naturale: true, righe: M.S.abbinamenti.filter(a => a.subagente_id === s.id),
      colonne: [
        { key: 'cliente', header: 'Cliente', grow: true, valore: a => M.nomeCliente(a.cliente_piva) },
        { key: 'fornitore', header: 'Fornitore', valore: a => M.fornitore(a.fornitore_id).breve },
        { key: 'sconto', header: 'Sconto', tipo: 'pct' },
        { key: 'pct', header: 'Sua %', tipo: 'pct', valore: a => pctSub(a, s) }
      ],
      emptyText: 'Nessun cliente', emptyHint: 'Assegna clienti in Clienti e abbinamenti.'
    });
    dx.corpo.insertAdjacentHTML('beforeend', '<h3>Eccezioni personali</h3>');
    CRM.Elenco(dx.corpo, M.S.eccezioni.filter(x => x.subagente_id === s.id).map(x => {
      const sc = M.S.scaglioni.find(y => y.id === x.scaglione_id);
      return { testo: e(M.fornitore(sc.fornitore_id).breve) + ', sconto ' + M.pct(sc.sconto), destra: M.pct(x.pct_sub) + ' <span class="testo-tenue">invece di ' + M.pct(sc.pct_sub) + '</span>' };
    }), 'Nessuna: valgono le percentuali standard dei fornitori.');
  }
  CRM.rotta(/^\/subagenti$/, () => vistaSubagenti(null));
  CRM.rotta(/^\/subagenti\/(\d+)$/, id => vistaSubagenti(id));

  /* ---------- Clienti e abbinamenti: DataTable + FormModal ---------- */
  CRM.rotta(/^\/abbinamenti$/, function () {
    const corpo = CRM.Pagina({
      voce: 'abbinamenti', titolo: 'Clienti e abbinamenti', pieno: true,
      sottotitolo: 'Per ogni cliente e fornitore: chi lo segue, lo sconto concesso e il codice con cui il fornitore lo indica sui documenti.',
      azioni: [{ etichetta: 'Nuovo abbinamento', icona: 'piu', onClick: () => modifica(null) }]
    });
    CRM.DataTable(CRM.blocco(corpo, 'riempi'), {
      colonne: [
        { key: 'cliente', header: 'Cliente', grow: true, valore: a => M.nomeCliente(a.cliente_piva), cell: a => '<b>' + e(M.nomeCliente(a.cliente_piva)) + '</b><span class="sec-riga">P.IVA ' + e(a.cliente_piva) + ' · ' + e((M.cliente(a.cliente_piva) || {}).citta || '') + '</span>' },
        { key: 'fornitore', header: 'Fornitore', valore: a => M.fornitore(a.fornitore_id).breve },
        { key: 'codice', header: 'Codice del fornitore', cell: a => a.codice ? '<b>' + e(a.codice) + '</b>' : CRM.stato('attesa', 'manca: abbinamento documenti a mano') },
        { key: 'sub', header: 'Seguito da', valore: a => M.subagente(a.subagente_id).nome },
        { key: 'sconto', header: 'Sconto', tipo: 'pct' },
        { key: 'perc', header: 'Provvigione', align: 'right', sortValue: a => { const sc = M.scaglione(a.fornitore_id, a.sconto, M.oggi()); return sc ? sc.pct_agente + sc.pct_sub : 0; },
          cell: a => { const sc = M.scaglione(a.fornitore_id, a.sconto, M.oggi()); return sc ? M.pct(sc.pct_agente + sc.pct_sub) + '<span class="sec-riga">' + M.pct(sc.pct_agente) + ' Decobrands · ' + M.pct(sc.pct_sub) + ' subagente</span>' : '—'; } }
      ],
      righe: M.S.abbinamenti, ordinamentoIniziale: { key: 'cliente', dir: 'asc' },
      onRowClick: a => modifica(a),
      piede: 'Un cliente ha un solo subagente per fornitore; il codice è unico per fornitore.'
    });
  });
  function modifica(a) {
    const nuovo = !a;
    const v0 = a || { cliente_piva: '', fornitore_id: '', subagente_id: '', sconto: 0, codice: '' };
    const sconti = v0.fornitore_id ? M.S.scaglioni.filter(s => s.fornitore_id === Number(v0.fornitore_id)).map(s => s.sconto).filter((x, i, arr) => arr.indexOf(x) === i).sort((x, y) => x - y) : [0, 1, 3, 5, 10];
    CRM.FormModal({
      titolo: nuovo ? 'Nuovo abbinamento' : M.nomeCliente(a.cliente_piva) + ' · ' + M.fornitore(a.fornitore_id).breve,
      conferma: nuovo ? 'Crea abbinamento' : 'Salva', colonne: 2,
      campi: [
        { nome: 'cliente_piva', etichetta: 'Cliente', tipo: 'select', largo: true, valore: v0.cliente_piva, opzioni: [{ value: '', label: 'Scegli il cliente' }].concat(M.S.clienti.map(c => ({ value: c.piva, label: c.nome }))) },
        { nome: 'fornitore_id', etichetta: 'Fornitore', tipo: 'select', valore: v0.fornitore_id, opzioni: [{ value: '', label: 'Scegli il fornitore' }].concat(M.S.fornitori.map(f => ({ value: f.id, label: f.nome }))) },
        { nome: 'subagente_id', etichetta: 'Seguito da', tipo: 'select', valore: v0.subagente_id, opzioni: [{ value: '', label: 'Scegli il subagente' }].concat(M.S.subagenti.map(s => ({ value: s.id, label: s.nome }))) },
        { nome: 'codice', etichetta: 'Codice del fornitore', valore: v0.codice, placeholder: 'es. GA-2271', aiuto: 'Come il fornitore chiama il cliente su conferme e fatture: serve ad abbinare i documenti in automatico.' },
        { nome: 'sconto', etichetta: 'Sconto al cliente %', tipo: 'select', valore: v0.sconto, opzioni: sconti.map(x => ({ value: x, label: M.pct(x) })) }
      ],
      azioniExtra: nuovo ? [] : [{ etichetta: 'Elimina', variante: 'pericolo', onClick: () => {
        CRM.Conferma('Eliminare l’abbinamento?', 'Le pratiche di questo cliente con ' + M.fornitore(a.fornitore_id).breve + ' non genereranno più provvigioni.', 'Elimina', true).then(ok => {
          if (!ok) return; M.S.abbinamenti.splice(M.S.abbinamenti.indexOf(a), 1); M.annota('Abbinamento eliminato'); M.salva(); CRM.Avviso('Abbinamento eliminato'); CRM.naviga();
        });
      } }],
      onConferma: (v, form) => {
        if (!v.cliente_piva || !v.fornitore_id || !v.subagente_id) { form.errore('Scegli cliente, fornitore e subagente.'); return false; }
        const fid = Number(v.fornitore_id);
        const dup = M.S.abbinamenti.find(x => x !== a && x.cliente_piva === v.cliente_piva && x.fornitore_id === fid);
        if (dup) { form.errore(M.nomeCliente(v.cliente_piva) + ' con ' + M.fornitore(fid).breve + ' è già seguito da ' + M.subagente(dup.subagente_id).nome + '.'); return false; }
        const dupC = v.codice && M.S.abbinamenti.find(x => x !== a && x.fornitore_id === fid && (x.codice || '').toUpperCase() === v.codice.toUpperCase());
        if (dupC) { form.errore('Il codice ' + v.codice + ' è già di ' + M.nomeCliente(dupC.cliente_piva) + '.'); return false; }
        const rec = a || {};
        Object.assign(rec, { cliente_piva: v.cliente_piva, fornitore_id: fid, subagente_id: Number(v.subagente_id), sconto: Number(v.sconto), codice: v.codice || null });
        if (nuovo) { rec.id = Math.max.apply(null, M.S.abbinamenti.map(x => x.id)) + 1; M.S.abbinamenti.push(rec); }
        M.annota((nuovo ? 'Nuovo abbinamento ' : 'Abbinamento aggiornato ') + M.nomeCliente(rec.cliente_piva) + ' · ' + M.fornitore(fid).breve);
        M.salva(); CRM.Avviso(nuovo ? 'Abbinamento creato' : 'Abbinamento salvato'); CRM.naviga();
      }
    });
  }
})();
