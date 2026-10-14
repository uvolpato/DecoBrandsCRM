/* ============================================================
   Viste "Anagrafiche": Fornitori, Subagenti, Clienti e abbinamenti
   ============================================================ */
(function () {
  'use strict';
  const e = U.esc;

  /* ---------- Fornitori ---------- */
  function vistaFornitori(idSel) {
    const corpo = U.pagina({ voce: 'fornitori', titolo: 'Fornitori', pieno: true, sotto: 'Condizioni di ogni fornitore e percentuali di provvigione per sconto, con la data da cui valgono.' });
    const f = M.fornitore(idSel) || M.S.fornitori[0];
    const cols = U.el('div', 'due-colonne pari');
    cols.style.cssText = 'flex:1 1 auto;min-height:0';
    corpo.appendChild(cols);

    const sx = U.el('div', 'riempi');
    sx.style.minHeight = '0';
    cols.appendChild(sx);
    U.tabella(sx, {
      colonne: [
        { key: 'nome', titolo: 'Fornitore', cresce: true, cella: x => '<b>' + e(x.nome) + '</b>' + (x.id === f.id ? ' ' + U.stato('s-ottone', 'aperto') : '') },
        { key: 'giorni_conferma', titolo: 'Attesa conferma', tipo: 'num', cella: x => x.giorni_conferma + ' giorni' },
        { key: 'maturazione', titolo: 'Paga sul' },
        { key: 'pratiche', titolo: 'Pratiche aperte', tipo: 'num', valore: x => M.S.pratiche.filter(p => p.fornitore_id === x.id && M.statoPratica(p).chiave !== 'fatturata').length }
      ],
      righe: M.S.fornitori,
      suRiga: x => { location.hash = '#/fornitori/' + x.id; }
    });

    const dx = U.el('section', 'foglio colonna');
    cols.appendChild(dx);
    const versioni = Array.from(new Set(M.S.scaglioni.filter(s => s.fornitore_id === f.id).map(s => s.valido_dal))).sort().reverse();
    const vigente = versioni.find(v => v <= M.oggi()) || versioni[versioni.length - 1];
    dx.innerHTML = '<div class="foglio-testa"><h2>' + e(f.nome) + '</h2><button type="button" class="btn sec piccolo" id="mod">Modifica condizioni</button></div>' +
      '<div class="foglio-corpo"><dl class="chiave-valore">' +
      '<dt>Partita IVA</dt><dd>' + e(f.piva) + '</dd>' +
      '<dt>Attesa della conferma</dt><dd>' + f.giorni_conferma + ' giorni dall’ordine, poi parte il sollecito</dd>' +
      '<dt>Pagamento provvigioni</dt><dd>sul ' + f.maturazione + (f.maturazione === 'maturato' ? ' (quando incassa dai clienti)' : ' (all’emissione della fattura)') + '</dd></dl>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin:22px 0 10px"><h3 style="font-size:15px">Percentuali in vigore dal ' + M.data(vigente) + '</h3>' +
      '<button type="button" class="btn sec piccolo" id="nuove">' + U.icona('piu') + 'Nuove percentuali da una data</button></div><div id="perc"></div>' +
      (versioni.length > 1 ? '<p class="testo-tenue piccolo">Versioni: ' + versioni.map(v => 'dal ' + M.data(v)).join(', ') + '. I documenti si calcolano con le percentuali in vigore alla loro data.</p>' :
        '<p class="testo-tenue piccolo">Se ' + e(f.breve) + ' rivede le condizioni, inserisci le nuove percentuali con la data da cui valgono: i documenti precedenti restano calcolati con quelle di allora.</p>') +
      '</div>';
    const sc = M.S.scaglioni.filter(s => s.fornitore_id === f.id && s.valido_dal === vigente);
    U.tabella(U.$('#perc', dx), {
      compatta: true, naturale: true,
      colonne: [
        { key: 'sconto', titolo: 'Sconto al cliente', tipo: 'pct' },
        { key: 'pct_agente', titolo: 'A Decobrands', tipo: 'pct' },
        { key: 'pct_sub', titolo: 'Al subagente', tipo: 'pct', cella: s => { const ecc = M.S.eccezioni.filter(x => x.scaglione_id === s.id); return M.pct(s.pct_sub) + (ecc.length ? '<span class="sec-riga">' + ecc.map(x => M.subagente(x.subagente_id).nome + ' ' + M.pct(x.pct_sub)).join(', ') + '</span>' : ''); } },
        { key: 'tot', titolo: 'Totale dal fornitore', tipo: 'pct', valore: s => s.pct_agente + s.pct_sub },
        { key: 'clienti', titolo: 'Clienti', tipo: 'num', valore: s => M.S.abbinamenti.filter(a => a.fornitore_id === f.id && a.sconto === s.sconto).length }
      ],
      righe: sc, ordine: { key: 'sconto', dir: 'asc' }
    });

    U.$('#mod', dx).addEventListener('click', () => U.modale({
      titolo: 'Condizioni di ' + f.breve,
      corpo: '<div class="griglia-campi">' + U.campo({ nome: 'giorni_conferma', etichetta: 'Giorni di attesa della conferma', tipo: 'numero', valore: f.giorni_conferma }) +
        U.campo({ nome: 'maturazione', etichetta: 'Pagamento provvigioni', tipo: 'select', valore: f.maturazione, opzioni: [{ value: 'maturato', label: 'Sul maturato (incassi)' }, { value: 'fatturato', label: 'Sul fatturato' }] }) + '</div>',
      azioni: [{ etichetta: 'Annulla', classe: 'sec' }, { etichetta: 'Salva condizioni', onClick: (c, el) => {
        const v = U.valori(el); f.giorni_conferma = Number(v.giorni_conferma) || f.giorni_conferma; f.maturazione = v.maturazione;
        M.annota('Condizioni di ' + f.breve + ' aggiornate'); M.salva(); U.avviso('Condizioni salvate'); U.naviga();
      } }]
    }));
    U.$('#nuove', dx).addEventListener('click', () => U.modale({
      titolo: 'Nuove percentuali di ' + f.breve,
      testo: 'Valgono per i documenti con data uguale o successiva a quella indicata.',
      corpo: U.campo({ nome: 'valido_dal', etichetta: 'Valide dal', tipo: 'data', valore: M.oggi() }) +
        '<div class="griglia-campi" style="grid-template-columns:auto 1fr 1fr;margin-top:14px;align-items:end">' + sc.sort((x, y) => x.sconto - y.sconto).map(s =>
          '<div style="padding-bottom:9px">Sconto ' + M.pct(s.sconto) + '</div>' + U.campo({ nome: 'a' + s.sconto, etichetta: 'A Decobrands %', tipo: 'numero', passo: '0.5', valore: s.pct_agente }) + U.campo({ nome: 's' + s.sconto, etichetta: 'Al subagente %', tipo: 'numero', passo: '0.5', valore: s.pct_sub })).join('') + '</div>',
      azioni: [{ etichetta: 'Annulla', classe: 'sec' }, { etichetta: 'Salva le nuove percentuali', onClick: (c, el) => {
        const v = U.valori(el);
        if (!v.valido_dal) return false;
        let id = Math.max.apply(null, M.S.scaglioni.map(s => s.id)) + 1;
        sc.forEach(s => M.S.scaglioni.push({ id: id++, fornitore_id: f.id, valido_dal: v.valido_dal, sconto: s.sconto, pct_agente: Number(v['a' + s.sconto]), pct_sub: Number(v['s' + s.sconto]) }));
        M.annota('Nuove percentuali di ' + f.breve + ' dal ' + M.data(v.valido_dal)); M.salva(); U.avviso('Percentuali salvate: valgono dal ' + M.data(v.valido_dal)); U.naviga();
      } }]
    }));
  }
  U.rotta(/^\/fornitori$/, () => vistaFornitori(null));
  U.rotta(/^\/fornitori\/(\d+)$/, id => vistaFornitori(id));

  /* ---------- Subagenti ---------- */
  function vistaSubagenti(idSel) {
    const corpo = U.pagina({ voce: 'subagenti', titolo: 'Subagenti', pieno: true, sotto: 'Chi segue quali clienti e quanto ha maturato nel trimestre in corso. L’agente è uno solo: Decobrands SRL.' });
    const t = M.trimestre(M.oggi());
    const righe = M.righeLiquidazione(2026, t);
    const s = M.subagente(idSel) || M.S.subagenti[0];
    const cols = U.el('div', 'due-colonne pari');
    cols.style.cssText = 'flex:1 1 auto;min-height:0';
    corpo.appendChild(cols);
    const sx = U.el('div', 'riempi'); sx.style.minHeight = '0'; cols.appendChild(sx);
    U.tabella(sx, {
      colonne: [
        { key: 'nome', titolo: 'Subagente', cresce: true, cella: x => '<b>' + e(x.nome) + '</b>' + (x.id === s.id ? ' ' + U.stato('s-ottone', 'aperto') : '') + '<span class="sec-riga">' + e(x.email) + '</span>' },
        { key: 'clienti', titolo: 'Clienti seguiti', tipo: 'num', valore: x => M.S.abbinamenti.filter(a => a.subagente_id === x.id).length },
        { key: 'liq', titolo: t + '° trim. liquidabile', tipo: 'euro', valore: x => righe.filter(r => r.subagente_id === x.id && r.liquidabile).reduce((a, r) => a + r.provvigione, 0) },
        { key: 'att', titolo: 'In attesa', tipo: 'euro', valore: x => righe.filter(r => r.subagente_id === x.id && !r.liquidabile).reduce((a, r) => a + r.provvigione, 0) }
      ],
      righe: M.S.subagenti,
      suRiga: x => { location.hash = '#/subagenti/' + x.id; }
    });
    const dx = U.el('section', 'foglio colonna');
    cols.appendChild(dx);
    const seguiti = M.S.abbinamenti.filter(a => a.subagente_id === s.id);
    const ecc = M.S.eccezioni.filter(x => x.subagente_id === s.id);
    dx.innerHTML = '<div class="foglio-testa"><h2>' + e(s.nome) + '</h2><a class="btn testo piccolo" href="#/liquidazioni/2026/' + t + '">Vedi la liquidazione</a></div><div class="foglio-corpo">' +
      '<h3 style="font-size:15px;margin-bottom:10px">Clienti seguiti</h3><div id="seg"></div>' +
      '<h3 style="font-size:15px;margin:20px 0 8px">Eccezioni personali</h3>' +
      (ecc.length ? '<ul style="margin:0;padding-left:18px">' + ecc.map(x => { const sc = M.S.scaglioni.find(y => y.id === x.scaglione_id); const f = M.fornitore(sc.fornitore_id);
        return '<li>' + e(f.breve) + ', sconto ' + M.pct(sc.sconto) + ': ' + M.pct(x.pct_sub) + ' invece di ' + M.pct(sc.pct_sub) + '</li>'; }).join('') + '</ul>'
        : '<p class="testo-tenue" style="margin:0">Nessuna: valgono le percentuali standard dei fornitori.</p>') + '</div>';
    U.tabella(U.$('#seg', dx), {
      compatta: true, naturale: true,
      colonne: [
        { key: 'cliente', titolo: 'Cliente', cresce: true, valore: a => M.nomeCliente(a.cliente_piva) },
        { key: 'fornitore', titolo: 'Fornitore', valore: a => M.fornitore(a.fornitore_id).breve },
        { key: 'sconto', titolo: 'Sconto', tipo: 'pct' },
        { key: 'pct', titolo: 'Sua %', tipo: 'pct', valore: a => { const sc = M.scaglione(a.fornitore_id, a.sconto, M.oggi()); const ex = sc && M.S.eccezioni.find(x => x.scaglione_id === sc.id && x.subagente_id === s.id); return ex ? ex.pct_sub : sc ? sc.pct_sub : 0; } }
      ],
      righe: seguiti,
      vuoto: { titolo: 'Nessun cliente', testo: 'Assegna clienti in Clienti e abbinamenti.' }
    });
  }
  U.rotta(/^\/subagenti$/, () => vistaSubagenti(null));
  U.rotta(/^\/subagenti\/(\d+)$/, id => vistaSubagenti(id));

  /* ---------- Clienti e abbinamenti ---------- */
  U.rotta(/^\/abbinamenti$/, function () {
    const corpo = U.pagina({
      voce: 'abbinamenti', titolo: 'Clienti e abbinamenti', pieno: true,
      sotto: 'Per ogni cliente e fornitore: chi lo segue, lo sconto concesso e il codice con cui il fornitore lo indica sui documenti.',
      azioni: [{ etichetta: 'Nuovo abbinamento', icona: 'piu', onClick: () => modifica(null) }]
    });
    const box = U.el('div', 'riempi'); corpo.appendChild(box);
    const tab = U.tabella(box, {
      colonne: [
        { key: 'cliente', titolo: 'Cliente', cresce: true, valore: a => M.nomeCliente(a.cliente_piva), cella: a => '<b>' + e(M.nomeCliente(a.cliente_piva)) + '</b><span class="sec-riga">P.IVA ' + e(a.cliente_piva) + ' · ' + e((M.cliente(a.cliente_piva) || {}).citta || '') + '</span>' },
        { key: 'fornitore', titolo: 'Fornitore', valore: a => M.fornitore(a.fornitore_id).breve },
        { key: 'codice', titolo: 'Codice del fornitore', cella: a => a.codice ? '<b>' + e(a.codice) + '</b>' : U.stato('s-attesa', 'manca: abbinamento documenti a mano') },
        { key: 'sub', titolo: 'Seguito da', valore: a => M.subagente(a.subagente_id).nome },
        { key: 'sconto', titolo: 'Sconto', tipo: 'pct' },
        { key: 'perc', titolo: 'Provvigione', ordinaPer: a => { const sc = M.scaglione(a.fornitore_id, a.sconto, M.oggi()); return sc ? sc.pct_agente + sc.pct_sub : 0; },
          cella: a => { const sc = M.scaglione(a.fornitore_id, a.sconto, M.oggi()); return sc ? M.pct(sc.pct_agente + sc.pct_sub) + '<span class="sec-riga">' + M.pct(sc.pct_agente) + ' Decobrands · ' + M.pct(sc.pct_sub) + ' subagente</span>' : '—'; }, allinea: 'dx' }
      ],
      righe: M.S.abbinamenti,
      ordine: { key: 'cliente', dir: 'asc' },
      suRiga: a => modifica(a),
      piede: 'Un cliente ha un solo subagente per fornitore; il codice è unico per fornitore.'
    });
    function modifica(a) {
      const nuovo = !a;
      const v0 = a || { cliente_piva: '', fornitore_id: '', subagente_id: '', sconto: 0, codice: '' };
      const opzSconti = fid => M.S.scaglioni.filter(s => s.fornitore_id === Number(fid)).map(s => s.sconto).filter((x, i, arr) => arr.indexOf(x) === i).sort((x, y) => x - y);
      U.modale({
        titolo: nuovo ? 'Nuovo abbinamento' : M.nomeCliente(a.cliente_piva) + ' · ' + M.fornitore(a.fornitore_id).breve,
        corpo: '<div class="griglia-campi">' +
          U.campo({ nome: 'cliente_piva', etichetta: 'Cliente', tipo: 'select', largo: true, valore: v0.cliente_piva, opzioni: [{ value: '', label: 'Scegli il cliente' }].concat(M.S.clienti.map(c => ({ value: c.piva, label: c.nome }))) }) +
          U.campo({ nome: 'fornitore_id', etichetta: 'Fornitore', tipo: 'select', valore: v0.fornitore_id, opzioni: [{ value: '', label: 'Scegli il fornitore' }].concat(M.S.fornitori.map(f => ({ value: f.id, label: f.nome }))) }) +
          U.campo({ nome: 'subagente_id', etichetta: 'Seguito da', tipo: 'select', valore: v0.subagente_id, opzioni: [{ value: '', label: 'Scegli il subagente' }].concat(M.S.subagenti.map(s => ({ value: s.id, label: s.nome }))) }) +
          U.campo({ nome: 'codice', etichetta: 'Codice del fornitore', valore: v0.codice, placeholder: 'es. GA-2271', aiuto: 'Come il fornitore chiama il cliente su conferme e fatture: serve ad abbinare i documenti in automatico.' }) +
          U.campo({ nome: 'sconto', etichetta: 'Sconto al cliente %', tipo: 'select', valore: v0.sconto, opzioni: (v0.fornitore_id ? opzSconti(v0.fornitore_id) : [0, 1, 3, 5, 10]).map(x => ({ value: x, label: M.pct(x) })) }) +
          '</div><p class="piccolo" id="errore" style="color:var(--rosso);margin:12px 0 0"></p>',
        azioni: (nuovo ? [] : [{ etichetta: 'Elimina', classe: 'pericolo', onClick: () => {
          U.conferma('Eliminare l’abbinamento?', 'Le pratiche di questo cliente con ' + M.fornitore(a.fornitore_id).breve + ' non genereranno più provvigioni.', 'Elimina', true).then(ok => {
            if (!ok) return; M.S.abbinamenti.splice(M.S.abbinamenti.indexOf(a), 1); M.annota('Abbinamento eliminato'); M.salva(); U.naviga();
          });
        } }]).concat([{ etichetta: 'Annulla', classe: 'sec' }, { etichetta: nuovo ? 'Crea abbinamento' : 'Salva', onClick: (c, el) => {
          const v = U.valori(el);
          const err = U.$('#errore', el);
          if (!v.cliente_piva || !v.fornitore_id || !v.subagente_id) { err.textContent = 'Scegli cliente, fornitore e subagente.'; return false; }
          const fid = Number(v.fornitore_id);
          const dup = M.S.abbinamenti.find(x => x !== a && x.cliente_piva === v.cliente_piva && x.fornitore_id === fid);
          if (dup) { err.textContent = M.nomeCliente(v.cliente_piva) + ' con ' + M.fornitore(fid).breve + ' è già seguito da ' + M.subagente(dup.subagente_id).nome + '.'; return false; }
          const dupC = v.codice && M.S.abbinamenti.find(x => x !== a && x.fornitore_id === fid && (x.codice || '').toUpperCase() === v.codice.toUpperCase());
          if (dupC) { err.textContent = 'Il codice ' + v.codice + ' è già di ' + M.nomeCliente(dupC.cliente_piva) + '.'; return false; }
          const rec = a || {};
          Object.assign(rec, { cliente_piva: v.cliente_piva, fornitore_id: fid, subagente_id: Number(v.subagente_id), sconto: Number(v.sconto), codice: v.codice || null });
          if (nuovo) { rec.id = Math.max.apply(null, M.S.abbinamenti.map(x => x.id)) + 1; M.S.abbinamenti.push(rec); }
          M.annota((nuovo ? 'Nuovo abbinamento ' : 'Abbinamento aggiornato ') + M.nomeCliente(rec.cliente_piva) + ' · ' + M.fornitore(fid).breve);
          M.salva(); U.avviso(nuovo ? 'Abbinamento creato' : 'Abbinamento salvato'); tab.aggiorna(M.S.abbinamenti); U.barra('abbinamenti');
        } }])
      });
    }
  });
})();
