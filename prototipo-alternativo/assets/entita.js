/* ============================================================
   Entità per i campi di ricerca (CRM.CampoRicerca / CRM.RicercaEntita).
   Ognuna è definita una sola volta: voci (già ristrette dal contesto, es. il fornitore
   del documento), chiave, testo mostrato, colonne e filtri della maschera. Nell'app le voci arrivano da /api/lookup/* con ricerca lato server.
   Articolo: nel giro agenzia gli articoli non sono nell'anagrafica Decobrands; l'anagrafica di
   riferimento sono gli articoli già usati dal fornitore nei documenti registrati. Un articolo
   nuovo si può inserire (pallino rosso) e non blocca nulla.
   ============================================================ */
(function () {
  'use strict';

  CRM.Entita('fornitore', {
    titolo: 'Fornitore',
    voci: () => M.S.fornitori, chiave: f => f.id, testo: f => f.nome,
    dettaglio: f => 'paga sul ' + f.maturazione + ' · conferma entro ' + f.giorni_conferma + ' giorni', cerca: f => f.breve + ' ' + (f.piva || ''),
    colonne: [
      { key: 'nome', header: 'Fornitore', grow: true },
      { key: 'piva', header: 'P.IVA' },
      { key: 'maturazione', header: 'Paga sul' },
      { key: 'giorni_conferma', header: 'Attesa conferma', tipo: 'numero', cell: f => f.giorni_conferma + ' giorni' }
    ]
  });

  CRM.Entita('cliente', {
    titolo: 'Cliente',
    voci: () => M.S.clienti, chiave: c => c.piva, testo: c => c.nome,
    dettaglio: c => 'P.IVA ' + c.piva + (c.citta ? ' · ' + c.citta : ''), cerca: c => c.piva + ' ' + (c.citta || ''),
    colonne: [
      { key: 'nome', header: 'Ragione sociale', grow: true },
      { key: 'piva', header: 'P.IVA' },
      { key: 'citta', header: 'Città' },
      { key: 'forn', header: 'Fornitori abbinati', valore: c => M.S.abbinamenti.filter(a => a.cliente_piva === c.piva).map(a => M.fornitore(a.fornitore_id).breve).join(', ') }
    ]
  });

  CRM.Entita('subagente', {
    titolo: 'Subagente',
    voci: () => M.S.subagenti, chiave: s => s.id, testo: s => s.nome, dettaglio: s => s.email || '',
    colonne: [
      { key: 'nome', header: 'Subagente', grow: true },
      { key: 'email', header: 'Email' },
      { key: 'clienti', header: 'Clienti seguiti', tipo: 'numero', valore: s => M.S.abbinamenti.filter(a => a.subagente_id === s.id).length }
    ]
  });

  /* Codice con cui il fornitore indica il cliente sui documenti (interscambio). Contesto: fornitore_id. */
  CRM.Entita('codiceCliente', {
    titolo: 'Codice cliente del fornitore',
    voci: ctx => M.S.abbinamenti.filter(a => a.codice && (!ctx.fornitore_id || a.fornitore_id === Number(ctx.fornitore_id))),
    chiave: a => a.codice, testo: a => a.codice,
    dettaglio: a => M.nomeCliente(a.cliente_piva) + ' · ' + M.fornitore(a.fornitore_id).breve, cerca: a => M.nomeCliente(a.cliente_piva) + ' ' + a.cliente_piva,
    colonne: [
      { key: 'codice', header: 'Codice' },
      { key: 'cliente', header: 'Cliente', grow: true, valore: a => M.nomeCliente(a.cliente_piva) },
      { key: 'fornitore', header: 'Fornitore', valore: a => M.fornitore(a.fornitore_id).breve },
      { key: 'sub', header: 'Seguito da', valore: a => M.subagente(a.subagente_id).nome },
      { key: 'sconto', header: 'Sconto', tipo: 'pct' }
    ]
  });

  /* Articoli del fornitore, ricavati dai documenti delle pratiche (nell'app: tabella alimentata dai documenti registrati).
     Contesto: fornitore_id. */
  CRM.Entita('articolo', {
    titolo: 'Articolo',
    voci: ctx => {
      const mappa = new Map();
      M.S.pratiche.filter(p => !ctx.fornitore_id || p.fornitore_id === Number(ctx.fornitore_id)).forEach(p => p.documenti.forEach(d => d.righe.forEach(r => {
        if (!r.codice || r.qta < 0) return;
        const a = mappa.get(r.codice) || { codice: r.codice, descrizione: r.descrizione, prezzo: r.prezzo, data: '', fornitore_id: p.fornitore_id, pratiche: new Set() };
        if (d.data >= a.data) { a.data = d.data; a.prezzo = r.prezzo; a.descrizione = r.descrizione; }
        a.pratiche.add(p.id); mappa.set(r.codice, a);
      })));
      return Array.from(mappa.values()).sort((x, y) => x.codice.localeCompare(y.codice));
    },
    chiave: a => a.codice, testo: a => a.codice,
    dettaglio: a => a.descrizione + ' · ultimo prezzo ' + M.euro(a.prezzo), cerca: a => a.descrizione,
    colonne: [
      { key: 'codice', header: 'Articolo' },
      { key: 'descrizione', header: 'Descrizione', grow: true },
      { key: 'fornitore', header: 'Fornitore', valore: a => M.fornitore(a.fornitore_id).breve },
      { key: 'prezzo', header: 'Ultimo prezzo', tipo: 'euro' },
      { key: 'data', header: 'Ultimo documento', tipo: 'data' },
      { key: 'pratiche', header: 'Pratiche', tipo: 'numero', valore: a => a.pratiche.size }
    ]
  });

  /* Pratiche (ordini a fornitore). Contesto: fornitore_id. */
  CRM.Entita('pratica', {
    titolo: 'Pratica',
    voci: ctx => M.S.pratiche.filter(p => !ctx.fornitore_id || p.fornitore_id === Number(ctx.fornitore_id)), chiave: p => p.id, testo: p => p.numero,
    dettaglio: p => M.nomeCliente(p.cliente_piva) + ' · ' + M.fornitore(p.fornitore_id).breve + ' · ' + M.statoPratica(p).etichetta.toLowerCase(),
    cerca: p => M.nomeCliente(p.cliente_piva) + ' ' + p.documenti.map(d => d.numero).join(' '),
    colonne: [
      { key: 'numero', header: 'Pratica' },
      { key: 'cliente', header: 'Cliente', grow: true, valore: p => M.nomeCliente(p.cliente_piva) },
      { key: 'fornitore', header: 'Fornitore', valore: p => M.fornitore(p.fornitore_id).breve },
      { key: 'data', header: 'Data ordine', tipo: 'data' },
      { key: 'stato', header: 'Stato', sortValue: p => M.statoPratica(p).chiave, cell: p => CRM.statoPratica(p) },
      { key: 'importo', header: 'Importo', tipo: 'euro', valore: p => M.importoPratica(p) }
    ],
    filtri: () => [{ nome: 'stato', tipo: 'select', valore: '', opzioni: [{ value: '', label: 'Tutti gli stati' }, { value: 'aperte', label: 'Non fatturate' }, { value: 'fatturata', label: 'Fatturate' }] }],
    filtra: (p, v) => (!v.stato || (v.stato === 'aperte' ? M.statoPratica(p).chiave !== 'fatturata' : M.statoPratica(p).chiave === v.stato))
  });

  /* Fatture e note di credito registrate nelle pratiche. Contesto: fornitore_id, mese, anno. */
  CRM.Entita('documentoFiscale', {
    titolo: 'Fattura o nota di credito',
    voci: ctx => { const out = []; M.S.pratiche.filter(p => !ctx.fornitore_id || p.fornitore_id === Number(ctx.fornitore_id)).forEach(p => M.fiscali(p).forEach(d => out.push({ doc: d, pratica: p }))); return out; },
    chiave: x => x.doc.numero, testo: x => x.doc.numero,
    dettaglio: x => M.TIPI[x.doc.tipo] + ' del ' + M.data(x.doc.data) + ' · ' + M.nomeCliente(x.pratica.cliente_piva) + ' · ' + M.euro(M.importoDoc(x.doc)),
    cerca: x => x.pratica.numero + ' ' + M.nomeCliente(x.pratica.cliente_piva),
    colonne: [
      { key: 'numero', header: 'Documento', valore: x => x.doc.numero },
      { key: 'tipo', header: 'Tipo', valore: x => M.TIPI[x.doc.tipo] },
      { key: 'data', header: 'Data', tipo: 'data', valore: x => x.doc.data },
      { key: 'pratica', header: 'Pratica', valore: x => x.pratica.numero },
      { key: 'cliente', header: 'Cliente', grow: true, valore: x => M.nomeCliente(x.pratica.cliente_piva) },
      { key: 'imponibile', header: 'Imponibile', tipo: 'euro', valore: x => M.importoDoc(x.doc) }
    ],
    filtri: ctx => [{ nome: 'mese', tipo: 'select', valore: ctx.mese ? String(ctx.mese) : '', opzioni: [{ value: '', label: 'Tutti i mesi' }].concat(M.MESI.map((m, i) => ({ value: String(i + 1), label: m[0].toUpperCase() + m.slice(1) }))) }],
    filtra: (x, v) => (!v.mese || Number(x.doc.data.slice(5, 7)) === Number(v.mese))
  });
})();
