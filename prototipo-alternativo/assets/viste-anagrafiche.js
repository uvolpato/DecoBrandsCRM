/* ============================================================
   Viste "Anagrafiche": Fornitori, Subagenti, Clienti.
   Clienti e fornitori arrivano da Integra (sola lettura); il CRM gestisce solo i suoi dati:
   condizioni e percentuali dei fornitori, agenzie dei clienti, subagenti.
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
        { key: 'giorno_bollettino', header: 'Bollettino entro', tipo: 'numero', cell: x => 'il ' + (x.giorno_bollettino || 10) },
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
    CRM.Nota(dx.corpo, 'Anagrafica da Integra (sola lettura). Qui si gestiscono solo condizioni e percentuali di provvigione.').style.marginBottom = '10px';
    CRM.Dettagli(dx.corpo, [
      { etichetta: 'Partita IVA', valore: e(f.piva) + ' <span class="testo-tenue">· ' + e(f.paese || '') + '</span>' },
      { etichetta: 'Codice Integra', valore: e(f.codice_integra || '—') },
      { etichetta: 'Attesa della conferma', valore: f.giorni_conferma + ' giorni dall’ordine, poi parte il sollecito' },
      { etichetta: 'Bollettino mensile', valore: 'atteso entro il ' + (f.giorno_bollettino || 10) + ' del mese successivo, poi parte il sollecito' },
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
    // vista inversa delle agenzie: i clienti seguiti per questo fornitore (si modificano dal cliente)
    const cli = CRM.Pannello(dx.corpo, { titolo: 'Clienti seguiti per ' + f.breve, nota: 'si modificano dal cliente', senzaMargine: true });
    cli.el.style.cssText = 'margin-top:20px;box-shadow:none';
    CRM.DataTable(cli.corpo, {
      compatta: true, naturale: true, righe: M.S.abbinamenti.filter(a => a.fornitore_id === f.id), ordinamentoIniziale: { key: 'cliente', dir: 'asc' },
      colonne: [
        { key: 'cliente', header: 'Cliente', grow: true, valore: a => M.nomeCliente(a.cliente_piva) },
        { key: 'codice', header: 'Codice', cell: a => a.codice ? e(a.codice) : CRM.stato('attesa', 'manca') },
        { key: 'sub', header: 'Seguito da', valore: a => M.subagente(a.subagente_id).nome },
        { key: 'sconto', header: 'Sconto', tipo: 'pct' }
      ],
      onRowClick: a => { location.hash = '#/clienti/' + a.cliente_piva; },
      emptyText: 'Nessun cliente', emptyHint: 'Le agenzie si aggiungono dalla scheda del cliente.'
    });
    CRM.Nota(dx.corpo, versioni.length > 1 ? 'Versioni: ' + versioni.map(v => 'dal ' + M.data(v)).join(', ') + '. I documenti si calcolano con le percentuali in vigore alla loro data.'
      : 'Se ' + e(f.breve) + ' rivede le condizioni, inserisci le nuove percentuali con la data da cui valgono: i documenti precedenti restano calcolati con quelle di allora.').style.marginTop = '12px';
  }
  function modificaCondizioni(f) {
    CRM.FormModal({
      titolo: 'Condizioni di ' + f.breve, conferma: 'Salva condizioni', colonne: 2,
      campi: [
        { nome: 'giorni_conferma', etichetta: 'Giorni di attesa della conferma', tipo: 'numero', valore: f.giorni_conferma },
        { nome: 'giorno_bollettino', etichetta: 'Bollettino atteso entro il giorno', tipo: 'numero', valore: f.giorno_bollettino || 10, aiuto: 'del mese successivo (1–28); dopo questa data in Oggi compare il sollecito' },
        { nome: 'maturazione', etichetta: 'Pagamento provvigioni', tipo: 'select', valore: f.maturazione, opzioni: [{ value: 'maturato', label: 'Sul maturato (incassi)' }, { value: 'fatturato', label: 'Sul fatturato' }] }
      ],
      onConferma: v => {
        f.giorni_conferma = Number(v.giorni_conferma) || f.giorni_conferma; f.maturazione = v.maturazione;
        f.giorno_bollettino = Math.min(28, Math.max(1, Number(v.giorno_bollettino) || 10));
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
    const corpo = CRM.Pagina({ voce: 'subagenti', titolo: 'Subagenti', pieno: true, sottotitolo: 'Chi segue quali clienti e quanto ha maturato nel trimestre in corso. L’agente è uno solo: Decobrands SRL.',
      azioni: [{ etichetta: 'Nuovo subagente', icona: 'piu', onClick: () => modificaSubagente(null) }] });
    const t = M.trimestre(M.oggi());
    const righe = M.righeLiquidazione(2026, t);
    const s = M.subagente(Number(idSel)) || M.S.subagenti[0];
    const col = CRM.blocco(corpo, 'colonne pari riempi');
    CRM.DataTable(CRM.blocco(col, 'riempi'), {
      colonne: [
        { key: 'nome', header: 'Subagente', grow: true, cell: x => '<b>' + e(x.nome) + '</b>' + (x.attivo === false ? ' ' + CRM.stato('neutro', 'non attivo') : '') + (x.id === s.id ? ' ' + CRM.stato('primario', 'aperto') : '') + '<span class="sec-riga">' + e(x.email || '') + (x.telefono ? ' · ' + e(x.telefono) : '') + '</span>' },
        { key: 'clienti', header: 'Clienti seguiti', tipo: 'numero', valore: x => M.S.abbinamenti.filter(a => a.subagente_id === x.id).length },
        { key: 'liq', header: t + '° trim. liquidabile', tipo: 'euro', totale: 'somma', valore: x => righe.filter(r => r.subagente_id === x.id && r.liquidabile).reduce((a, r) => a + r.provvigione, 0) },
        { key: 'att', header: 'In attesa', tipo: 'euro', totale: 'somma', valore: x => righe.filter(r => r.subagente_id === x.id && !r.liquidabile).reduce((a, r) => a + r.provvigione, 0) }
      ],
      righe: M.S.subagenti, rowClass: x => x.id === s.id ? 'selezionata' : '',
      onRowClick: x => { location.hash = '#/subagenti/' + x.id; }
    });
    const dx = CRM.Pannello(col, { titolo: s.nome, riempi: true, azioni: [{ etichetta: 'Vedi la liquidazione', variante: 'testo', href: '#/liquidazioni/2026/' + t },
      { etichetta: 'Modifica', onClick: () => modificaSubagente(s) }, { etichetta: 'Elimina', variante: 'pericolo', onClick: () => eliminaSubagente(s) }] });
    CRM.Dettagli(dx.corpo, [
      { etichetta: 'Email', valore: s.email ? e(s.email) : '<span class="testo-tenue">—</span>' },
      { etichetta: 'Telefono', valore: s.telefono ? e(s.telefono) : '<span class="testo-tenue">—</span>' },
      { etichetta: 'Codice fiscale / P.IVA', valore: s.cf ? e(s.cf) : '<span class="testo-tenue">—</span>' },
      { etichetta: 'Stato', valore: s.attivo === false ? CRM.stato('neutro', 'Non attivo: non si può assegnare a nuovi clienti') : CRM.stato('ok', 'Attivo') }
    ], { inColonne: true });
    CRM.blocco(dx.corpo, '', 'height:8px;flex:none');
    dx.corpo.insertAdjacentHTML('beforeend', '<h3>Clienti seguiti</h3>');
    CRM.DataTable(dx.corpo, {
      compatta: true, naturale: true, righe: M.S.abbinamenti.filter(a => a.subagente_id === s.id),
      colonne: [
        { key: 'cliente', header: 'Cliente', grow: true, valore: a => M.nomeCliente(a.cliente_piva) },
        { key: 'fornitore', header: 'Fornitore', valore: a => M.fornitore(a.fornitore_id).breve },
        { key: 'sconto', header: 'Sconto', tipo: 'pct' },
        { key: 'pct', header: 'Sua %', tipo: 'pct', valore: a => pctSub(a, s) }
      ],
      emptyText: 'Nessun cliente', emptyHint: 'I clienti si assegnano dalla scheda del cliente (Clienti).'
    });
    dx.corpo.insertAdjacentHTML('beforeend', '<h3>Eccezioni personali</h3>');
    CRM.Elenco(dx.corpo, M.S.eccezioni.filter(x => x.subagente_id === s.id).map(x => {
      const sc = M.S.scaglioni.find(y => y.id === x.scaglione_id);
      return { testo: e(M.fornitore(sc.fornitore_id).breve) + ', sconto ' + M.pct(sc.sconto), destra: M.pct(x.pct_sub) + ' <span class="testo-tenue">invece di ' + M.pct(sc.pct_sub) + '</span>' };
    }), 'Nessuna: valgono le percentuali standard dei fornitori.');
  }
  function modificaSubagente(sa) {
    const nuovo = !sa;
    CRM.FormModal({
      titolo: nuovo ? 'Nuovo subagente' : 'Modifica ' + sa.nome, conferma: nuovo ? 'Crea subagente' : 'Salva', colonne: 2,
      campi: [
        { nome: 'nome', etichetta: 'Nome e cognome', valore: sa ? sa.nome : '', largo: true },
        { nome: 'email', etichetta: 'Email', valore: sa ? sa.email : '', aiuto: 'Riceve il prospetto della liquidazione.' },
        { nome: 'telefono', etichetta: 'Telefono', valore: sa ? sa.telefono : '' },
        { nome: 'cf', etichetta: 'Codice fiscale / P.IVA', valore: sa ? sa.cf : '' },
        { nome: 'attivo', etichetta: 'Stato', tipo: 'select', valore: sa && sa.attivo === false ? 'no' : 'si', opzioni: [{ value: 'si', label: 'Attivo' }, { value: 'no', label: 'Non attivo' }] }
      ],
      onConferma: (v, form) => {
        if (!v.nome) { form.errore('Il nome è obbligatorio.'); return false; }
        if (v.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) { form.errore('L’email non è valida.'); return false; }
        const dup = M.S.subagenti.find(x => x !== sa && x.nome.toLowerCase() === v.nome.toLowerCase());
        if (dup) { form.errore('Esiste già un subagente con questo nome.'); return false; }
        const rec = sa || { id: Math.max.apply(null, M.S.subagenti.map(x => x.id)) + 1 };
        Object.assign(rec, { nome: v.nome, email: v.email, telefono: v.telefono, cf: v.cf, attivo: v.attivo !== 'no' });
        if (nuovo) M.S.subagenti.push(rec);
        M.annota((nuovo ? 'Nuovo subagente ' : 'Subagente aggiornato ') + rec.nome); M.salva();
        CRM.Avviso(nuovo ? 'Subagente creato' : 'Subagente salvato'); location.hash = '#/subagenti/' + rec.id; CRM.naviga();
      }
    });
  }
  async function eliminaSubagente(sa) {
    const clienti = M.S.abbinamenti.filter(a => a.subagente_id === sa.id).length;
    const liquidato = M.S.liquidazioni_chiuse.length && [1, 2, 3, 4].some(t => M.righeLiquidazione(2026, t).some(r => r.subagente_id === sa.id));
    if (clienti || liquidato) {
      CRM.Modale({ titolo: 'Non si può eliminare ' + sa.nome,
        testo: (clienti ? 'Segue ' + clienti + (clienti === 1 ? ' cliente' : ' clienti') + ': riassegnali prima dalla scheda dei clienti. ' : '') +
          (liquidato ? 'Ha provvigioni nei trimestri: lo storico delle liquidazioni deve restare. ' : '') + 'Puoi renderlo non attivo: resta nello storico ma non si assegna a nuovi clienti.',
        azioni: [{ etichetta: 'Chiudi', variante: 'sec' }].concat(sa.attivo === false ? [] : [{ etichetta: 'Rendi non attivo', onClick: () => { sa.attivo = false; M.annota('Subagente ' + sa.nome + ' reso non attivo'); M.salva(); CRM.Avviso('Subagente reso non attivo'); CRM.naviga(); } }]) });
      return;
    }
    if (!(await CRM.Conferma('Eliminare ' + sa.nome + '?', 'Non segue clienti e non ha provvigioni: l’eliminazione è definitiva.', 'Elimina', true))) return;
    M.S.subagenti.splice(M.S.subagenti.indexOf(sa), 1); M.annota('Subagente ' + sa.nome + ' eliminato'); M.salva(); CRM.Avviso('Subagente eliminato'); location.hash = '#/subagenti';
  }
  CRM.rotta(/^\/subagenti$/, () => vistaSubagenti(null));
  CRM.rotta(/^\/subagenti\/(\d+)$/, id => vistaSubagenti(id));

  /* ---------- Clienti: elenco + scheda del cliente con le sue agenzie ----------
     Il cliente è anagrafica Decobrands importata da Integra (sola lettura).
     Agenzie = fornitori per cui Decobrands fa da agente verso il cliente (tabella interscambio):
     codice con cui il fornitore indica il cliente, subagente, sconto. */
  let filtroClienti = { vista: 'tutti', q: '' };
  const agenzie = piva => M.S.abbinamenti.filter(a => a.cliente_piva === piva);
  const praticheAperte = piva => M.S.pratiche.filter(p => p.cliente_piva === piva && M.statoPratica(p).chiave !== 'fatturata');
  function vistaClienti(pivaSel) {
    const corpo = CRM.Pagina({ voce: 'clienti', titolo: 'Clienti', pieno: true,
      sottotitolo: 'Anagrafica da Integra. Per ogni cliente: le agenzie (fornitori per cui Decobrands fa da agente), chi lo segue e con quale sconto.' });
    const c = M.cliente(pivaSel) || M.S.clienti.slice().sort((x, y) => x.nome.localeCompare(y.nome))[0];
    const col = CRM.blocco(corpo, 'colonne riempi', 'grid-template-columns:minmax(0,1fr) minmax(0,1.3fr)');
    const sx = CRM.blocco(col, 'pila riempi');
    const VISTE = { tutti: () => true, agenzie: x => agenzie(x.piva).length > 0, senza: x => !agenzie(x.piva).length, diretta: x => x.vendita_diretta };
    CRM.FilterBar(sx, { campi: [
      { nome: 'q', tipo: 'cerca', valore: filtroClienti.q, placeholder: 'Nome, P.IVA o codice' },
      { nome: 'vista', tipo: 'segmenti', valore: filtroClienti.vista, opzioni: [
        { value: 'tutti', label: 'Tutti', n: M.S.clienti.length }, { value: 'agenzie', label: 'Con agenzie', n: M.S.clienti.filter(VISTE.agenzie).length },
        { value: 'senza', label: 'Senza agenzie', n: M.S.clienti.filter(VISTE.senza).length }, { value: 'diretta', label: 'Diretta', n: M.S.clienti.filter(VISTE.diretta).length }] }
    ], onChange: v => { filtroClienti = v; tab.aggiorna(filtra()); } });
    const filtra = () => {
      const q = (filtroClienti.q || '').trim().toLowerCase();
      return M.S.clienti.filter(VISTE[filtroClienti.vista]).filter(x => !q || [x.nome, x.piva, x.citta, x.codice_integra].concat(agenzie(x.piva).map(a => a.codice || '')).some(t => String(t || '').toLowerCase().indexOf(q) >= 0));
    };
    const tab = CRM.DataTable(CRM.blocco(sx, 'riempi'), {
      colonne: [
        { key: 'nome', header: 'Cliente', grow: true, cell: x => '<b>' + e(x.nome) + '</b><span class="sec-riga">' + e(x.citta || '') + ' · ' + e(x.codice_integra || '') + '</span>' },
        { key: 'agenzie', header: 'Agenzie', tipo: 'numero', valore: x => agenzie(x.piva).length },
        { key: 'aperte', header: 'Pratiche aperte', tipo: 'numero', valore: x => praticheAperte(x.piva).length }
      ],
      righe: filtra(), ordinamentoIniziale: { key: 'nome', dir: 'asc' }, rowClass: x => x.piva === c.piva ? 'selezionata' : '',
      onRowClick: x => { location.hash = '#/clienti/' + x.piva; },
      emptyText: 'Nessun cliente', emptyHint: 'Cambia la ricerca o il filtro. I clienti nuovi si creano in Integra.'
    });

    const dx = CRM.Pannello(col, { titolo: c.nome, nota: 'anagrafica da Integra', riempi: true });
    CRM.Dettagli(dx.corpo, [
      { etichetta: 'Partita IVA', valore: e(c.piva) },
      { etichetta: 'Indirizzo', valore: e((c.indirizzo ? c.indirizzo + ', ' : '') + (c.citta || '')) },
      { etichetta: 'Codice Integra', valore: e(c.codice_integra || '—') },
      { etichetta: 'Vendita diretta', valore: c.vendita_diretta ? CRM.stato('info', 'Sì') : '<span class="testo-tenue">No</span>' }
    ], { inColonne: true });

    const ag = CRM.Pannello(dx.corpo, { titolo: 'Agenzie', nota: 'fornitori per cui Decobrands fa da agente', senzaMargine: true,
      azioni: [{ etichetta: 'Aggiungi agenzia', icona: 'piu', onClick: () => modificaAgenzia(c, null) }] });
    ag.el.style.cssText = 'margin-top:18px;box-shadow:none;flex:none';
    CRM.DataTable(ag.corpo, {
      compatta: true, naturale: true, righe: agenzie(c.piva), ordinamentoIniziale: { key: 'fornitore', dir: 'asc' },
      colonne: [
        { key: 'fornitore', header: 'Fornitore', valore: a => M.fornitore(a.fornitore_id).breve },
        { key: 'codice', header: 'Codice cliente', cell: a => a.codice ? '<b>' + e(a.codice) + '</b>' : CRM.stato('attesa', 'manca') },
        { key: 'sub', header: 'Seguito da', valore: a => M.subagente(a.subagente_id).nome },
        { key: 'sconto', header: 'Sconto', tipo: 'pct' },
        { key: 'perc', header: 'Provvigione', align: 'right', sortValue: a => { const sc = M.scaglione(a.fornitore_id, a.sconto, M.oggi()); return sc ? sc.pct_agente + sc.pct_sub : 0; },
          cell: a => { const sc = M.scaglione(a.fornitore_id, a.sconto, M.oggi()); return sc ? M.pct(sc.pct_agente + sc.pct_sub) + '<span class="sec-riga">' + M.pct(sc.pct_sub) + ' sub.</span>' : '—'; } }
      ],
      onRowClick: a => modificaAgenzia(c, a),
      emptyText: 'Nessuna agenzia', emptyHint: c.vendita_diretta ? 'Cliente di sola vendita diretta. Aggiungi un’agenzia se Decobrands lo segue anche per un fornitore.' : 'Aggiungi il fornitore per cui Decobrands segue questo cliente.'
    });
    CRM.Nota(dx.corpo, 'Un solo subagente per cliente e fornitore; il codice è unico per fornitore. Clic su una riga per modificarla.').style.marginTop = '8px';

    const att = CRM.Pannello(dx.corpo, { titolo: 'Attività', senzaMargine: false });
    att.el.style.cssText = 'margin-top:18px;box-shadow:none;flex:none';
    const tr = M.trimestre(M.oggi()), prov = M.righeLiquidazione(2026, tr).filter(r => r.cliente === c.piva);
    CRM.Cifre(att.corpo, [
      { etichetta: 'Pratiche aperte', valore: String(praticheAperte(c.piva).length) },
      { etichetta: 'Provvigioni ai subagenti, ' + tr + '° trimestre', valore: prov.reduce((x, r) => x + r.provvigione, 0) }
    ]);
    CRM.Elenco(att.corpo, M.S.pratiche.filter(p => p.cliente_piva === c.piva).sort((x, y) => y.data.localeCompare(x.data)).slice(0, 5).map(p => ({
      testo: '<a href="#/pratiche/' + p.id + '">' + e(p.numero) + '</a> <span class="testo-tenue">' + e(M.fornitore(p.fornitore_id).breve) + ' · ' + M.data(p.data) + '</span>',
      destra: CRM.statoPratica(p) })), 'Nessuna pratica per questo cliente.');
  }
  CRM.rotta(/^\/clienti$/, () => vistaClienti(null));
  CRM.rotta(/^\/clienti\/(\w+)$/, piva => vistaClienti(piva));
  CRM.rotta(/^\/abbinamenti$/, () => { location.replace('#/clienti'); });

  /* Agenzia del cliente: il cliente è fisso, si sceglie fornitore e subagente con i campi di ricerca. */
  function modificaAgenzia(c, a) {
    const nuovo = !a;
    const v0 = a || { fornitore_id: '', subagente_id: '', sconto: 0, codice: '' };
    const sconti = fid => { const x = M.S.scaglioni.filter(s => s.fornitore_id === Number(fid)).map(s => s.sconto).filter((y, i, arr) => arr.indexOf(y) === i).sort((p, q) => p - q); return x.length ? x : [0]; };
    CRM.FormModal({
      titolo: (nuovo ? 'Nuova agenzia · ' : 'Agenzia · ') + c.nome, testo: nuovo ? 'Fornitore per cui Decobrands segue questo cliente.' : null,
      conferma: nuovo ? 'Aggiungi agenzia' : 'Salva', colonne: 2,
      campi: [
        { nome: 'fornitore_id', etichetta: 'Fornitore', tipo: 'ricerca', entita: 'fornitore', valore: v0.fornitore_id, placeholder: 'Nome del fornitore' },
        { nome: 'codice', etichetta: 'Codice cliente del fornitore', valore: v0.codice, placeholder: 'es. GA-2271', aiuto: 'Come il fornitore chiama il cliente su conferme e fatture: serve ad abbinare i documenti in automatico.' },
        { nome: 'subagente_id', etichetta: 'Seguito da', tipo: 'ricerca', entita: 'subagente', valore: v0.subagente_id, placeholder: 'Nome del subagente' },
        { nome: 'sconto', etichetta: 'Sconto al cliente %', tipo: 'select', valore: v0.sconto, opzioni: sconti(v0.fornitore_id || 1).map(x => ({ value: x, label: M.pct(x) })) }
      ],
      dopo: form => form.el.addEventListener('change', ev => {   // gli sconti dipendono dalle percentuali del fornitore
        if (ev.target.name !== 'fornitore_id' || !M.fornitore(Number(ev.target.value))) return;
        const sel = form.campo('sconto'), prima = sel.value;
        sel.innerHTML = sconti(ev.target.value).map(x => '<option value="' + x + '"' + (String(x) === prima ? ' selected' : '') + '>' + M.pct(x) + '</option>').join('');
      }),
      azioniExtra: nuovo ? [] : [{ etichetta: 'Elimina', variante: 'pericolo', onClick: () => {
        CRM.Conferma('Eliminare l’agenzia ' + M.fornitore(a.fornitore_id).breve + '?', 'Le pratiche di questo cliente con ' + M.fornitore(a.fornitore_id).breve + ' non genereranno più provvigioni.', 'Elimina', true).then(ok => {
          if (!ok) return; M.S.abbinamenti.splice(M.S.abbinamenti.indexOf(a), 1); M.annota('Agenzia ' + M.fornitore(a.fornitore_id).breve + ' eliminata per ' + c.nome); M.salva(); CRM.Avviso('Agenzia eliminata'); CRM.naviga();
        });
      } }],
      onConferma: (v, form) => {
        if (!v.fornitore_id || !v.subagente_id) { form.errore('Scegli fornitore e subagente.'); return false; }
        if (!M.fornitore(Number(v.fornitore_id)) || !M.subagente(Number(v.subagente_id))) { form.errore('Scegli fornitore e subagente dall’elenco: i valori con il pallino rosso non esistono in anagrafica.'); return false; }
        const fid = Number(v.fornitore_id);
        const dup = M.S.abbinamenti.find(x => x !== a && x.cliente_piva === c.piva && x.fornitore_id === fid);
        if (dup) { form.errore(c.nome + ' con ' + M.fornitore(fid).breve + ' è già seguito da ' + M.subagente(dup.subagente_id).nome + '.'); return false; }
        const dupC = v.codice && M.S.abbinamenti.find(x => x !== a && x.fornitore_id === fid && (x.codice || '').toUpperCase() === v.codice.toUpperCase());
        if (dupC) { form.errore('Il codice ' + v.codice + ' è già di ' + M.nomeCliente(dupC.cliente_piva) + '.'); return false; }
        const rec = a || {};
        Object.assign(rec, { cliente_piva: c.piva, fornitore_id: fid, subagente_id: Number(v.subagente_id), sconto: Number(v.sconto), codice: v.codice || null });
        if (nuovo) { rec.id = Math.max.apply(null, M.S.abbinamenti.map(x => x.id)) + 1; M.S.abbinamenti.push(rec); }
        M.annota((nuovo ? 'Nuova agenzia ' : 'Agenzia aggiornata ') + M.fornitore(fid).breve + ' per ' + c.nome);
        M.salva(); CRM.Avviso(nuovo ? 'Agenzia aggiunta' : 'Agenzia salvata'); CRM.naviga();
      }
    });
  }
})();
