/* ============================================================
   Viste "Gestione" (spec §7.12–§7.16): Utenti e ruoli, Stato del sistema, Impostazioni,
   Documenti scartati, Guida. Solo composizione di componenti CRM.*
   Permessi per ruolo in M.PERMESSI (motore): la barra mostra solo le voci consentite e
   ogni pagina riservata lo verifica con CRM.permesso().
   ============================================================ */
(function () {
  'use strict';
  const e = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const quando = iso => iso ? M.data(iso.slice(0, 10)) + (iso.length > 10 ? ' ' + iso.slice(11, 16) : '') : '—';
  const STATO_SERVIZIO = { ok: ['ok', 'Funziona'], attesa: ['attesa', 'Da tenere d’occhio'], errore: ['errore', 'Problema'] };

  /* Contenuti della guida: assets/guida.js (CRM.GUIDA). */

  /* =========================================================
     Utenti e ruoli: elenco + scheda + cosa può fare ogni ruolo
     ========================================================= */
  let filtroUtenti = { vista: 'attivi', q: '' }, schedaUtente = 'utente';
  function vistaUtenti(idSel) {
    if (!CRM.permesso('gestione', 'utenti', 'Utenti e ruoli')) return;
    const corpo = CRM.Pagina({ voce: 'utenti', titolo: 'Utenti e ruoli', pieno: true,
      sottotitolo: 'Gli stessi utenti della Gestione Ordini, con le stesse credenziali. Il ruolo decide cosa si può fare nel CRM.',
      azioni: [{ etichetta: 'Nuovo utente', icona: 'piu', onClick: () => modificaUtente(null) }] });
    const utenti = M.S.utenti;
    const u = utenti.find(x => x.id === Number(idSel)) || utenti[0];
    const col = CRM.blocco(corpo, 'colonne riempi', 'grid-template-columns:minmax(0,1.15fr) minmax(0,1fr)');
    const sx = CRM.blocco(col, 'pila riempi');
    const VISTE = { attivi: x => x.attivo, disattivati: x => !x.attivo, tutti: () => true };
    CRM.FilterBar(sx, { campi: [
      { nome: 'q', tipo: 'cerca', valore: filtroUtenti.q, placeholder: 'Nome, utente o email' },
      { nome: 'vista', tipo: 'segmenti', valore: filtroUtenti.vista, opzioni: [
        { value: 'attivi', label: 'Attivi', n: utenti.filter(VISTE.attivi).length }, { value: 'disattivati', label: 'Disattivati', n: utenti.filter(VISTE.disattivati).length }, { value: 'tutti', label: 'Tutti', n: utenti.length }] }
    ], onChange: v => { filtroUtenti = v; tab.aggiorna(filtra()); } });
    const filtra = () => { const q = (filtroUtenti.q || '').toLowerCase(); return utenti.filter(VISTE[filtroUtenti.vista]).filter(x => !q || [x.nome, x.utente, x.email].some(t => t.toLowerCase().indexOf(q) >= 0)); };
    const tab = CRM.DataTable(CRM.blocco(sx, 'riempi'), {
      righe: filtra(), ordinamentoIniziale: { key: 'nome', dir: 'asc' }, rowClass: x => x.id === u.id ? 'selezionata' : '',
      colonne: [
        { key: 'nome', header: 'Utente', grow: true, cell: x => '<b>' + e(x.nome) + '</b>' + (x.id === M.utente().id ? ' <span class="testo-tenue">(tu)</span>' : '') + '<span class="sec-riga">' + e(x.utente) + ' · ' + e(x.email) + '</span>' },
        { key: 'ruolo', header: 'Ruolo', valore: x => M.RUOLI[x.ruolo].nome, cell: x => x.sistema ? CRM.stato('neutro', 'Servizi automatici') : CRM.stato(x.ruolo === 'amministratore' ? 'primario' : x.ruolo === 'operatore' ? 'info' : 'neutro', M.RUOLI[x.ruolo].nome) },
        { key: 'accesso', header: 'Ultimo accesso', valore: x => x.ultimo_accesso || '', cell: x => x.attivo ? quando(x.ultimo_accesso) : CRM.stato('neutro', 'Disattivato') }
      ],
      onRowClick: x => { location.hash = '#/utenti/' + x.id; },
      emptyText: 'Nessun utente', emptyHint: 'Cambia la ricerca o il filtro.'
    });

    const io = M.utente(), protetto = !!u.sistema;
    const p = CRM.Pannello(col, { titolo: u.nome, nota: u.sistema ? 'utente dei servizi automatici' : '', riempi: true,
      azioni: protetto ? [] : [{ etichetta: 'Modifica', onClick: () => modificaUtente(u) }, { etichetta: 'Invia nuova password', icona: 'chiave', onClick: () => inviaPassword(u) }] });
    const ruoli = Object.keys(M.RUOLI);
    // dati dell'utente e tabella dei permessi in due schede: niente scorrimento nella colonna
    CRM.Schede(p.corpo, { riempi: true, attiva: schedaUtente, onCambia: id => { schedaUtente = id; }, schede: [
      { id: 'utente', etichetta: 'Dati dell’utente', disegna: c => {
        CRM.Dettagli(c, [
          { etichetta: 'Nome utente', valore: e(u.utente) },
          { etichetta: 'Email', valore: e(u.email) },
          { etichetta: 'Ruolo', valore: e(M.RUOLI[u.ruolo].nome) },
          { etichetta: 'Stato', valore: u.attivo ? CRM.stato('ok', 'Attivo') : CRM.stato('neutro', 'Disattivato') },
          { etichetta: 'Ultimo accesso', valore: quando(u.ultimo_accesso) },
          { etichetta: 'Password', valore: u.cambio_password ? CRM.stato('attesa', 'da cambiare al prossimo accesso') : 'impostata dall’utente' },
          { etichetta: 'Ultimo invio password', valore: u.ultimo_invio ? quando(u.ultimo_invio.quando) + (u.ultimo_invio.errore ? '<span class="sec-riga negativo">' + e(u.ultimo_invio.errore) + '</span>' : '') : '—' }
        ], { inColonne: true });
        if (protetto) { CRM.Nota(c, 'Utente usato dai servizi automatici (lettura della casella, sincronizzazione da Integra): non si modifica e non accede all’app.'); return; }
        const az = CRM.blocco(c, 'azioni-riga');
        const b1 = document.createElement('button'); b1.type = 'button'; b1.className = 'btn sec piccolo'; b1.textContent = u.attivo ? 'Disattiva' : 'Riattiva';
        b1.addEventListener('click', () => attiva(u, !u.attivo)); az.appendChild(b1);
        const b2 = document.createElement('button'); b2.type = 'button'; b2.className = 'btn pericolo piccolo'; b2.textContent = 'Elimina';
        b2.addEventListener('click', () => elimina(u)); az.appendChild(b2);
        if (u.id === io.id) { b1.disabled = b2.disabled = true; b1.title = b2.title = 'Non puoi disattivare o eliminare te stesso'; }
      } },
      { id: 'ruoli', etichetta: 'Cosa può fare ogni ruolo', conta: M.PERMESSI.length, disegna: c => {
        CRM.DataTable(CRM.blocco(c, 'riempi'), {
          compatta: true, righe: M.PERMESSI,
          colonne: [{ key: 'testo', header: 'Attività', grow: true, sortable: false }].concat(ruoli.map(r => ({
            key: r, header: M.RUOLI[r].nome, align: 'center', sortable: false,
            cell: x => x.ruoli.indexOf(r) >= 0 ? '<span class="si" aria-label="sì">' + CRM.icona('spunta') + '</span>' : '<span class="testo-tenue" aria-label="no">—</span>',
            classe: x => r === u.ruolo ? 'col-evidenza' : '' })))
        });
        CRM.Nota(c, 'Evidenziata la colonna del ruolo di ' + e(u.nome) + '.');
      } }
    ] });
  }
  CRM.rotta(/^\/utenti$/, () => vistaUtenti(null));
  CRM.rotta(/^\/utenti\/(\d+)$/, id => vistaUtenti(id));

  const amministratoriAttivi = escluso => M.S.utenti.filter(x => x.attivo && !x.sistema && x.ruolo === 'amministratore' && x !== escluso).length;
  function modificaUtente(u) {
    const nuovo = !u, io = M.utente();
    CRM.FormModal({
      titolo: nuovo ? 'Nuovo utente' : 'Modifica ' + u.nome, conferma: nuovo ? 'Crea e invia la password' : 'Salva', colonne: 2,
      testo: nuovo ? 'L’utente riceve per email una password temporanea da cambiare al primo accesso.' : null,
      campi: [
        { nome: 'nome', etichetta: 'Nome e cognome', valore: u ? u.nome : '' },
        { nome: 'utente', etichetta: 'Nome utente', valore: u ? u.utente : '', placeholder: 'nome.cognome', aiuto: nuovo ? 'Per accedere; non si cambia dopo.' : 'Non si cambia.' },
        { nome: 'email', etichetta: 'Email', valore: u ? u.email : '', largo: true },
        { nome: 'ruolo', etichetta: 'Ruolo', tipo: 'select', valore: u ? u.ruolo : 'operatore', largo: true, opzioni: Object.keys(M.RUOLI).map(r => ({ value: r, label: M.RUOLI[r].nome })),
          aiuto: 'Amministratore: tutto. Operatore: lavoro quotidiano e anagrafiche del CRM. Sola lettura: consulta ed esporta.' }
      ],
      dopo: form => { if (!nuovo) form.campo('utente').readOnly = true; if (u && u.id === io.id) { form.campo('ruolo').disabled = true; form.aiuto('ruolo', 'Non puoi cambiare il tuo ruolo.'); } },
      onConferma: (v, form) => {
        if (!v.nome || !v.utente || !v.email) { form.errore('Compila nome, nome utente ed email.'); return false; }
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) { form.errore('L’email ' + v.email + ' non è valida.'); return false; }
        if (M.S.utenti.some(x => x !== u && x.utente.toLowerCase() === v.utente.toLowerCase())) { form.errore('Il nome utente ' + v.utente + ' è già usato.'); return false; }
        if (M.S.utenti.some(x => x !== u && x.email.toLowerCase() === v.email.toLowerCase())) { form.errore('L’email ' + v.email + ' è già di un altro utente.'); return false; }
        const ruolo = u && u.id === io.id ? u.ruolo : v.ruolo;
        if (u && u.ruolo === 'amministratore' && ruolo !== 'amministratore' && u.attivo && !amministratoriAttivi(u)) { form.errore('Deve restare almeno un amministratore attivo.'); return false; }
        if (nuovo) {
          const rec = { id: Math.max.apply(null, M.S.utenti.map(x => x.id)) + 1, utente: v.utente, nome: v.nome, email: v.email.toLowerCase(), ruolo: ruolo, attivo: true, ultimo_accesso: null, cambio_password: true, ultimo_invio: { quando: M.oggi() + 'T' + new Date().toTimeString().slice(0, 5), errore: null } };
          M.S.utenti.push(rec); M.annota('Nuovo utente ' + rec.utente + ' (' + M.RUOLI[ruolo].nome.toLowerCase() + '), password inviata');
          M.salva(); CRM.Avviso('Utente creato: password inviata a ' + rec.email); location.hash = '#/utenti/' + rec.id; return;
        }
        Object.assign(u, { nome: v.nome, email: v.email.toLowerCase(), ruolo: ruolo });
        M.annota('Utente ' + u.utente + ' aggiornato'); M.salva(); CRM.Avviso('Utente salvato'); CRM.naviga();
      }
    });
  }
  async function inviaPassword(u) {
    if (!(await CRM.Conferma('Inviare una nuova password a ' + u.nome + '?', 'Riceve a ' + e(u.email) + ' una password temporanea da cambiare al primo accesso. Quella attuale smette di funzionare.', 'Invia'))) return;
    const errore = /bianchi/.test(u.email) ? 'Casella inesistente (550 5.1.1)' : null;   // nel prototipo: l'indirizzo di Luca Bianchi non esiste più
    u.ultimo_invio = { quando: M.oggi() + 'T' + new Date().toTimeString().slice(0, 5), errore: errore }; u.cambio_password = true;
    M.annota('Nuova password inviata a ' + u.utente + (errore ? ' (non recapitata)' : ''));
    if (errore) M.S.sistema.problemi.unshift({ id: Date.now(), quando: u.ultimo_invio.quando, servizio: 'posta', livello: 'errore', testo: 'Invio non riuscito', dettaglio: 'Password a ' + u.email + ': ' + errore + '.', visto: false });
    M.salva(); CRM.Avviso(errore ? 'Invio non riuscito: ' + errore : 'Password inviata a ' + u.email); CRM.naviga();
  }
  function attiva(u, si) {
    if (!si && u.ruolo === 'amministratore' && !amministratoriAttivi(u)) { CRM.Avviso('Deve restare almeno un amministratore attivo'); return; }
    u.attivo = si; M.annota('Utente ' + u.utente + (si ? ' riattivato' : ' disattivato')); M.salva(); CRM.Avviso(si ? 'Utente riattivato' : 'Utente disattivato: non può più accedere'); CRM.naviga();
  }
  async function elimina(u) {
    if (u.ruolo === 'amministratore' && u.attivo && !amministratoriAttivi(u)) { CRM.Avviso('Deve restare almeno un amministratore attivo'); return; }
    if (u.ultimo_accesso) {
      if (!(await CRM.Conferma('Eliminare ' + u.nome + '?', u.nome + ' ha già usato l’app: il suo nome resta nel registro eventi. Se deve solo smettere di accedere, conviene disattivarlo.', 'Elimina', true))) return;
    } else if (!(await CRM.Conferma('Eliminare ' + u.nome + '?', 'Non ha mai effettuato l’accesso.', 'Elimina', true))) return;
    M.S.utenti.splice(M.S.utenti.indexOf(u), 1); M.annota('Utente ' + u.utente + ' eliminato'); M.salva(); CRM.Avviso('Utente eliminato'); location.hash = '#/utenti';
  }

  /* =========================================================
     Stato del sistema: servizi (riquadri-filtro), problemi da vedere, ultime esecuzioni
     ========================================================= */
  let servizioSel = null, vistaProblemi = 'nuovi';
  CRM.rotta(/^\/sistema$/, function () {
    if (!CRM.permesso('sistema', 'sistema', 'Stato del sistema')) return;
    const S = M.S.sistema, nome = id => (S.servizi.find(x => x.id === id) || {}).nome || id;
    const nuovi = S.problemi.filter(x => !x.visto);
    const corpo = CRM.Pagina({ voce: 'sistema', titolo: 'Stato del sistema', pieno: true,
      sottotitolo: 'I servizi che lavorano da soli: lettura della casella, lettura dei documenti, sincronizzazione da Integra, invio email.',
      azioni: [{ etichetta: 'Controlla adesso', icona: 'sistema', variante: 'sec', onClick: () => {
        const ora = M.oggi() + 'T' + new Date().toTimeString().slice(0, 5);
        S.servizi.forEach(s => { s.ultimo = ora; }); S.esecuzioni.unshift({ quando: ora, servizio: 'casella', esito: 'ok', testo: 'controllo manuale: nessuna email nuova' });
        M.annota('Controllo manuale dei servizi'); M.salva(); CRM.Avviso('Servizi controllati'); CRM.naviga();
      } }].concat(nuovi.length ? [{ etichetta: 'Segna tutti come visti', icona: 'spunta', onClick: () => { S.problemi.forEach(x => { x.visto = true; }); M.annota(nuovi.length + ' problemi segnati come visti'); M.salva(); CRM.Avviso('Problemi segnati come visti'); CRM.naviga(); } }] : []) });
    CRM.KpiRow(corpo, S.servizi.map(s => {
      const aperti = nuovi.filter(x => x.servizio === s.id).length;
      return { id: s.id, etichetta: s.nome, valore: STATO_SERVIZIO[s.stato][1], variante: STATO_SERVIZIO[s.stato][0],
        dettagli: [{ testo: s.nota, variante: s.stato === 'ok' ? '' : s.stato }, { testo: 'ultimo: ' + quando(s.ultimo) + ' · ' + s.ritmo }].concat(aperti ? [{ testo: aperti + (aperti === 1 ? ' problema da vedere' : ' problemi da vedere'), variante: 'errore' }] : []) };
    }), { selezionata: servizioSel, onSeleziona: id => { servizioSel = id; aggiorna(); } });

    const col = CRM.blocco(corpo, 'colonne riempi', 'grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)');
    const pp = CRM.Pannello(col, { titolo: 'Problemi', riempi: true, senzaMargine: true, nota: nuovi.length ? nuovi.length + ' da vedere' : 'nessuno da vedere' });
    const fb = CRM.FilterBar(pp.corpo, { campi: [{ nome: 'vista', tipo: 'segmenti', valore: vistaProblemi, opzioni: [
      { value: 'nuovi', label: 'Da vedere', n: nuovi.length }, { value: 'tutti', label: 'Tutti', n: S.problemi.length }] }], onChange: v => { vistaProblemi = v.vista; aggiorna(); } });
    fb.el.style.cssText = 'padding:10px 14px;flex:none';
    const filtra = () => S.problemi.filter(x => (vistaProblemi === 'tutti' || !x.visto) && (!servizioSel || x.servizio === servizioSel));
    const tab = CRM.DataTable(pp.corpo, {
      compatta: true, righe: filtra(), ordinamentoIniziale: { key: 'quando', dir: 'desc' }, rowClass: x => x.visto ? 'decisa' : '',
      colonne: [
        { key: 'quando', header: 'Quando', cell: x => quando(x.quando) + '<span class="sec-riga">' + CRM.stato(x.livello === 'errore' ? 'errore' : 'attesa', x.livello === 'errore' ? 'Errore' : 'Attenzione') + '</span>' },
        { key: 'testo', header: 'Problema', grow: true, cell: x => '<b>' + e(x.testo) + '</b> <span class="testo-tenue">· ' + e(nome(x.servizio)) + '</span><span class="sec-riga">' + e(x.dettaglio) + '</span>' },
        { key: 'visto', header: '', sortable: false, cell: x => x.visto ? '<span class="testo-tenue">visto</span>' : '<button type="button" class="btn sec piccolo" data-visto="' + x.id + '">Segna come visto</button>' }
      ],
      emptyText: 'Nessun problema', emptyHint: servizioSel ? 'Per questo servizio va tutto bene.' : 'Va tutto bene.'
    });
    tab.el.addEventListener('click', ev => {
      const b = ev.target.closest('[data-visto]'); if (!b) return;
      const x = S.problemi.find(p => p.id === Number(b.dataset.visto)); x.visto = true; M.annota('Problema «' + x.testo + '» segnato come visto'); M.salva(); CRM.naviga();
    });
    const pe = CRM.Pannello(col, { titolo: 'Ultime esecuzioni', riempi: true, senzaMargine: true });
    const tabE = CRM.DataTable(pe.corpo, {
      compatta: true, righe: S.esecuzioni.filter(x => !servizioSel || x.servizio === servizioSel), ordinamentoIniziale: { key: 'quando', dir: 'desc' },
      colonne: [
        { key: 'quando', header: 'Quando', cell: x => quando(x.quando) },
        { key: 'testo', header: 'Cosa', grow: true, cell: x => CRM.stato(x.esito === 'ok' ? 'ok' : x.esito === 'errore' ? 'errore' : 'attesa', x.esito === 'ok' ? 'Riuscita' : x.esito === 'errore' ? 'Errore' : 'Attenzione') + ' <b>' + e(nome(x.servizio)) + '</b><span class="sec-riga">' + e(x.testo) + '</span>' }
      ],
      emptyText: 'Nessuna esecuzione'
    });
    function aggiorna() { tab.aggiorna(filtra()); tabE.aggiorna(S.esecuzioni.filter(x => !servizioSel || x.servizio === servizioSel)); }
  });

  /* =========================================================
     Impostazioni: sezioni a sinistra, modulo della sezione a destra
     ========================================================= */
  const SEZIONI = [
    { id: 'azienda', titolo: 'Dati dell’azienda', sotto: 'intestazione dei prospetti esportati', campi: s => [
      { nome: 'ragione_sociale', etichetta: 'Ragione sociale', valore: s.ragione_sociale, largo: true },
      { nome: 'piva', etichetta: 'Partita IVA', valore: s.piva },
      { nome: 'email', etichetta: 'Email', valore: s.email },
      { nome: 'indirizzo', etichetta: 'Indirizzo', valore: s.indirizzo, largo: true }] },
    { id: 'casella', titolo: 'Casella dei documenti', sotto: 'da dove arrivano i documenti dei fornitori', campi: s => [
      { nome: 'server', etichetta: 'Server (IMAP)', valore: s.server }, { nome: 'porta', etichetta: 'Porta', tipo: 'numero', valore: s.porta },
      { nome: 'utente', etichetta: 'Utente', valore: s.utente }, { nome: 'password', etichetta: 'Password', tipo: 'password', impostata: s.password },
      { nome: 'cartella', etichetta: 'Cartella da leggere', valore: s.cartella }, { nome: 'cartella_lette', etichetta: 'Sposta le email lette in', valore: s.cartella_lette },
      { nome: 'minuti', etichetta: 'Controlla ogni (minuti)', tipo: 'numero', valore: s.minuti, aiuto: 'Da 1 a 60.' }] },
    { id: 'lettura', titolo: 'Server di lettura', sotto: 'GLM-OCR e soglie di affidabilità', campi: s => [
      { nome: 'indirizzo', etichetta: 'Indirizzo del server', valore: s.indirizzo, largo: true },
      { nome: 'modello', etichetta: 'Modello', valore: s.modello }, { nome: 'attesa_s', etichetta: 'Tempo massimo per documento (s)', tipo: 'numero', valore: s.attesa_s },
      { nome: 'soglia_ok', etichetta: 'Affidabile da', tipo: 'numero', passo: '0.01', valore: s.soglia_ok, aiuto: 'Campi sopra questa soglia: nessun controllo (spec §6.5).' },
      { nome: 'soglia_bassa', etichetta: 'Affidabilità bassa sotto', tipo: 'numero', passo: '0.01', valore: s.soglia_bassa, aiuto: 'Fra le due soglie: da controllare; sotto: bassa.' }] },
    { id: 'posta', titolo: 'Posta in uscita', sotto: 'password agli utenti, avvisi', campi: s => [
      { nome: 'server', etichetta: 'Server (SMTP)', valore: s.server }, { nome: 'porta', etichetta: 'Porta', tipo: 'numero', valore: s.porta },
      { nome: 'utente', etichetta: 'Utente', valore: s.utente }, { nome: 'password', etichetta: 'Password', tipo: 'password', impostata: s.password },
      { nome: 'mittente', etichetta: 'Mittente', valore: s.mittente, largo: true }] },
    { id: 'integra', titolo: 'Sincronizzazione da Integra', sotto: 'viste sul database di Integra', campi: s => [
      { nome: 'server', etichetta: 'Server del database', valore: s.server }, { nome: 'database', etichetta: 'Database', valore: s.database },
      { nome: 'utente', etichetta: 'Utente (sola lettura)', valore: s.utente }, { nome: 'password', etichetta: 'Password', tipo: 'password', impostata: s.password },
      { nome: 'schema', etichetta: 'Schema delle viste', valore: s.schema, aiuto: CRM.AMPLIAMENTI.vendita ? 'Clienti, fornitori, articoli, giacenze, registrazioni degli ordini.' : 'Clienti e fornitori.' },
      { nome: 'secondi', etichetta: 'Anagrafiche ogni (secondi)', tipo: 'numero', valore: s.secondi, aiuto: 'Da 10 a 3600.' },
      ...(CRM.AMPLIAMENTI.vendita ? [{ nome: 'secondi_giacenze', etichetta: 'Giacenze e registrazioni ogni (secondi)', tipo: 'numero', valore: s.secondi_giacenze, aiuto: 'Da 5 a 600.' }] : [])] },
    { id: 'conservazione', titolo: 'Conservazione dei dati', sotto: 'per quanto restano registro e scartati', campi: s => [
      { nome: 'eventi_mesi', etichetta: 'Registro eventi (mesi)', tipo: 'numero', valore: s.eventi_mesi, aiuto: 'Poi le righe più vecchie vengono eliminate in automatico.' },
      { nome: 'scartati_giorni', etichetta: 'Documenti scartati (giorni)', tipo: 'numero', valore: s.scartati_giorni },
      { nome: 'righe_pagina', etichetta: 'Righe per pagina nelle tabelle', tipo: 'numero', valore: s.righe_pagina }] }
  ];
  CRM.rotta(/^\/impostazioni$/, () => { location.replace('#/impostazioni/azienda'); });
  CRM.rotta(/^\/impostazioni\/(\w+)$/, function (idSez) {
    if (!CRM.permesso('gestione', 'impostazioni', 'Impostazioni')) return;
    const sez = SEZIONI.find(x => x.id === idSez) || SEZIONI[0];
    const corpo = CRM.Pagina({ voce: 'impostazioni', titolo: 'Impostazioni', pieno: true,
      sottotitolo: 'Valgono per tutti gli utenti. Le password non si rileggono: si sostituiscono. Ogni modifica resta nel registro eventi.' });
    const col = CRM.blocco(corpo, 'colonne riempi', 'grid-template-columns:minmax(240px,0.6fr) minmax(0,2fr)');
    const ps = CRM.Pannello(col, { titolo: 'Sezioni', riempi: true });
    CRM.ElencoSelezionabile(ps.corpo, SEZIONI.map(x => ({ id: x.id, href: '#/impostazioni/' + x.id, titolo: x.titolo, sotto: x.sotto })), sez.id);
    const dati = M.S.impostazioni[sez.id];
    const p = CRM.Pannello(col, { titolo: sez.titolo, nota: sez.sotto, riempi: true });
    const campi = sez.campi(dati).map(c => c.tipo === 'password'
      ? Object.assign({}, c, { tipo: 'testo', valore: '', placeholder: c.impostata ? '•••••••• impostata · scrivi per sostituirla' : 'non impostata', aiuto: 'Lascia vuoto per non cambiarla.' })
      : c);
    const form = CRM.Form(p.corpo, { campi: campi, colonne: 2 });
    sez.campi(dati).filter(c => c.tipo === 'password').forEach(c => { const x = form.campo(c.nome); x.type = 'password'; x.autocomplete = 'new-password'; });
    const az = CRM.blocco(p.corpo, 'azioni-riga');
    const salva = document.createElement('button'); salva.type = 'button'; salva.className = 'btn'; salva.textContent = 'Salva ' + sez.titolo.toLowerCase();
    az.appendChild(salva);
    if (sez.id === 'casella' || sez.id === 'lettura' || sez.id === 'posta' || sez.id === 'integra') {
      const prova = document.createElement('button'); prova.type = 'button'; prova.className = 'btn sec consentito'; prova.textContent = 'Prova la connessione';
      prova.addEventListener('click', () => CRM.Avviso(sez.id === 'lettura' ? 'Server di lettura raggiungibile · modello ' + (dati.modello || '') : sez.id === 'integra' ? 'Database di Integra raggiungibile · 6 viste lette · ultima sincronizzazione ' + quando(M.S.sincronizzato) : 'Connessione riuscita'));
      az.appendChild(prova);
    }
    salva.addEventListener('click', () => {
      const v = form.valori(); form.errore('');
      const numeri = sez.campi(dati).filter(c => c.tipo === 'numero');
      for (const c of numeri) if (v[c.nome] === '' || isNaN(Number(v[c.nome]))) { form.errore(c.etichetta + ': inserisci un numero.'); return; }
      if (sez.id === 'lettura' && !(Number(v.soglia_bassa) > 0 && Number(v.soglia_bassa) < Number(v.soglia_ok) && Number(v.soglia_ok) <= 1)) { form.errore('Le soglie devono essere fra 0 e 1, con "bassa" minore di "affidabile".'); return; }
      if (sez.id === 'casella' && !(Number(v.minuti) >= 1 && Number(v.minuti) <= 60)) { form.errore('Controlla ogni: da 1 a 60 minuti.'); return; }
      if (sez.id === 'integra' && !(Number(v.secondi) >= 10 && Number(v.secondi) <= 3600 && (!CRM.AMPLIAMENTI.vendita || Number(v.secondi_giacenze) >= 5 && Number(v.secondi_giacenze) <= 600))) { form.errore('Anagrafiche: da 10 a 3600 secondi; giacenze: da 5 a 600.'); return; }
      sez.campi(dati).forEach(c => {
        if (c.tipo === 'password') { if (v[c.nome]) dati[c.nome] = true; return; }
        dati[c.nome] = c.tipo === 'numero' ? Number(v[c.nome]) : v[c.nome];
      });
      if (sez.id === 'lettura') M.soglie();
      M.annota('Impostazioni aggiornate: ' + sez.titolo.toLowerCase()); M.salva(); CRM.Avviso('Impostazioni salvate'); CRM.naviga();
    });
    if (sez.id === 'lettura') CRM.Nota(p.corpo, 'Livelli attuali: affidabile da ' + M.pct(M.SOGLIA_OK * 100) + ', bassa sotto ' + M.pct(M.SOGLIA_BASSA * 100) + '. Valgono per le prossime letture e per i documenti in coda.').style.marginTop = '12px';
  });

  /* =========================================================
     Documenti scartati: recupera (operatore) o elimina definitivamente (amministratore)
     ========================================================= */
  let filtroScartati = { motivo: 'tutti', q: '' };
  CRM.rotta(/^\/scartati$/, function () {
    if (!CRM.permesso('scartati', 'scartati', 'Documenti scartati')) return;
    const giorni = M.S.impostazioni.conservazione.scartati_giorni;
    const lista = M.S.scartati;
    const corpo = CRM.Pagina({ voce: 'scartati', titolo: 'Documenti scartati', pieno: true,
      briciole: [{ etichetta: 'Documenti', href: '#/documenti' }, { etichetta: 'Scartati' }],
      sottotitolo: 'Restano qui ' + giorni + ' giorni (Impostazioni › Conservazione), poi vengono eliminati. Recupera un documento scartato per errore: torna fra quelli da controllare.' });
    const motivi = lista.map(x => x.motivo).filter((m, i, a) => a.indexOf(m) === i);
    CRM.FilterBar(corpo, { campi: [
      { nome: 'motivo', tipo: 'segmenti', valore: filtroScartati.motivo, opzioni: [{ value: 'tutti', label: 'Tutti', n: lista.length }].concat(motivi.map(m => ({ value: m, label: m, n: lista.filter(x => x.motivo === m).length }))) },
      { nome: 'q', tipo: 'cerca', valore: filtroScartati.q, placeholder: 'Numero, fornitore o file' }
    ], onChange: v => { filtroScartati = v; tab.aggiorna(filtra()); } });
    const filtra = () => { const q = (filtroScartati.q || '').toLowerCase(); return lista.filter(x => filtroScartati.motivo === 'tutti' || x.motivo === filtroScartati.motivo)
      .filter(x => !q || [x.doc.numero, M.fornitore(x.doc.fornitore_id).nome, x.doc.file].some(t => String(t).toLowerCase().indexOf(q) >= 0)); };
    const admin = M.puo('gestione');
    const tab = CRM.DataTable(CRM.blocco(corpo, 'riempi'), {
      righe: filtra(), ordinamentoIniziale: { key: 'quando', dir: 'desc' },
      colonne: [
        { key: 'quando', header: 'Scartato il', cell: x => quando(x.quando) + '<span class="sec-riga">da ' + e(x.da) + '</span>' },
        { key: 'doc', header: 'Documento', grow: true, valore: x => x.doc.numero, cell: x => '<b>' + e(M.TIPI[x.doc.tipo] + ' ' + x.doc.numero) + '</b><span class="sec-riga">' + e(M.fornitore(x.doc.fornitore_id).breve) + ' · ' + CRM.icona('file') + ' ' + e(x.doc.file) + '</span>' },
        { key: 'motivo', header: 'Motivo', cell: x => e(x.motivo) + (x.nota ? '<span class="sec-riga">' + e(x.nota) + '</span>' : '') },
        { key: 'scade', header: 'Eliminato il', valore: x => M.piuGiorni(x.quando.slice(0, 10), giorni), cell: x => M.data(M.piuGiorni(x.quando.slice(0, 10), giorni)) },
        { key: 'az', header: '', sortable: false, cell: x => '<span class="azioni-cella"><button type="button" class="btn sec piccolo" data-recupera="' + x.id + '">Recupera</button>' +
          (admin ? '<button type="button" class="btn testo piccolo pericolo-testo" data-elimina="' + x.id + '">Elimina</button>' : '') + '</span>' }
      ],
      emptyText: 'Nessun documento scartato', emptyHint: 'I documenti scartati da "Documenti" compaiono qui.'
    });
    tab.el.addEventListener('click', async ev => {
      const r = ev.target.closest('[data-recupera]'), d = ev.target.closest('[data-elimina]');
      if (r) { const doc = M.recuperaScartato(Number(r.dataset.recupera)); M.salva(); CRM.Avviso(M.TIPI[doc.tipo] + ' ' + doc.numero + ' recuperata: è fra i documenti da controllare'); location.hash = '#/documenti/' + doc.id; }
      if (d) {
        const x = lista.find(y => y.id === Number(d.dataset.elimina));
        if (!(await CRM.Conferma('Eliminare definitivamente ' + M.TIPI[x.doc.tipo].toLowerCase() + ' ' + x.doc.numero + '?', 'Il file e i dati letti vengono cancellati e non si possono più recuperare.', 'Elimina', true))) return;
        M.eliminaScartato(x.id); M.salva(); CRM.Avviso('Documento eliminato'); CRM.naviga();
      }
    });
  });

  /* =========================================================
     Guida: argomenti a sinistra (con ricerca), contenuto a destra
     ========================================================= */
  let cercaGuida = '';
  const testoPiano = g => JSON.stringify([g.titolo, g.sintesi, g.flusso, g.pulsanti, g.finestre, g.sapere]).replace(/<[^>]+>/g, '').toLowerCase();
  // schemi disegnati: il ciclo del lavoro (panoramica) e gli stati della pratica
  const SCHEMI = {
    ciclo: () => '<div class="guida-schema ciclo" role="img" aria-label="Ciclo del lavoro: documenti, pratiche, bollettini, liquidazioni">' +
      [['Ogni giorno', 'Documenti', 'entrano, si leggono, si abbinano', 'arrivo', '#/documenti'], ['Ogni giorno', 'Pratiche', 'ordine → conferma → fattura', 'pratiche', '#/pratiche'],
       ['Ogni mese', 'Bollettini', 'il fornitore riconosce, noi verifichiamo', 'bollettini', '#/bollettini'], ['Ogni trimestre', 'Liquidazioni', 'si paga ai subagenti', 'liquidazioni', '#/liquidazioni']]
        .map((x, i) => (i ? '<span class="freccia" aria-hidden="true"></span>' : '') + '<a class="nodo" href="' + x[4] + '"><span class="cadenza">' + x[0] + '</span>' + CRM.icona(x[3]) + '<b>' + x[1] + '</b><span>' + x[2] + '</span></a>').join('') +
      '</div><p class="guida-sotto-schema">' + CRM.icona('oggi') + '<span><b>Oggi</b> raccoglie da tutte e quattro le fasi quello che chiede un’azione.</span></p>',
    incassi: () => '<div class="guida-schema incassi" role="img" aria-label="Incassi sul fatturato e sul maturato">' +
      [['Sul fatturato', [['ok', 'Fattura', 'provvigione nel bollettino del mese'], ['errore', 'Storno', '1–2 mesi dopo se il cliente non paga'], ['ok', 'Riaccredito', 'nel mese in cui il cliente paga']]],
       ['Sul maturato', [['neutro', 'Fattura', 'nessuna provvigione finché il cliente non paga'], ['attesa', 'Da verificare', 'oltre i giorni d’incasso'], ['ok', 'Riconosciuta', 'nel mese in cui il cliente paga']]]]
        .map(c => '<div class="corsia"><b>' + c[0] + '</b><div class="passi">' + c[1].map((x, i) => (i ? '<span class="freccia" aria-hidden="true"></span>' : '') + '<div class="stato-nodo">' + CRM.stato(x[0], x[1]) + '<span>' + x[2] + '</span></div>').join('') + '</div></div>').join('') +
      '</div><p class="guida-sotto-schema">' + CRM.icona('liquidazioni') + '<span>Al subagente lo storno arriva nella <b>liquidazione del trimestre successivo</b> come voce negativa.</span></p>',
    stati: () => '<div class="guida-schema stati" role="img" aria-label="Stati della pratica">' +
      '<div class="stato-nodo">' + CRM.stato('info', 'Attesa conferma') + '<span>arriva l’ordine</span><div class="ramo">' + CRM.stato('errore', 'Conferma in ritardo') + '<span>passati i giorni di attesa del fornitore</span></div></div>' +
      '<span class="freccia" aria-hidden="true"></span><div class="stato-nodo">' + CRM.stato('primario', 'Confermata') + '<span>arriva la conferma</span></div>' +
      '<span class="freccia" aria-hidden="true"></span><div class="stato-nodo">' + CRM.stato('ok', 'Fatturata') + '<span>arriva la fattura</span><div class="ramo">' + CRM.stato('neutro', 'Nota di credito') + '<span>riduce l’imponibile, non cambia lo stato</span></div></div></div>'
  };
  function vistaGuida(idSel) {
    const corpo = CRM.Pagina({ voce: 'guida', titolo: 'Guida', pieno: true, sottotitolo: 'Come si usa il CRM, pagina per pagina: cosa fa, come si lavora, a cosa servono i pulsanti e le finestre. Da ogni pagina il pulsante "Guida" in alto apre l’argomento giusto.' });
    const visibili = CRM.GUIDA.filter(g => g.gruppo !== 'Vendita diretta' || CRM.AMPLIAMENTI.vendita).filter(g => g.gruppo !== 'Gestione' || M.puo(g.id === 'sistema' ? 'sistema' : g.id === 'scartati' ? 'scartati' : 'gestione'));
    const g = visibili.find(x => x.id === idSel) || visibili[0];
    const col = CRM.blocco(corpo, 'colonne riempi', 'grid-template-columns:minmax(240px,0.55fr) minmax(0,2fr)');
    const sx = CRM.Pannello(col, { titolo: 'Argomenti', riempi: true });
    CRM.FilterBar(sx.corpo, { campi: [{ nome: 'q', tipo: 'cerca', valore: cercaGuida, placeholder: 'Cerca un pulsante, una finestra…' }], onChange: v => { cercaGuida = v.q; disegna(); } });
    const elenco = CRM.blocco(sx.corpo, '');
    function disegna() {
      const q = cercaGuida.trim().toLowerCase();
      const trovati = visibili.filter(x => !q || testoPiano(x).indexOf(q) >= 0);
      elenco.innerHTML = '';
      if (!trovati.length) { CRM.Nota(elenco, 'Nessun argomento contiene «' + e(cercaGuida) + '».'); return; }
      CRM.ElencoSelezionabile(elenco, trovati.map(x => ({ id: x.id, href: '#/guida/' + x.id, titolo: x.titolo, sotto: x.gruppo })), g.id);
    }
    disegna();
    const ruoli = (() => {
      const mappa = { utenti: 'gestione', impostazioni: 'gestione', sistema: 'sistema', scartati: 'scartati', 'alias-kit': 'magazzino' };
      const perm = M.PERMESSI.find(p => p.id === (mappa[g.id] || (g.gruppo === 'Anagrafiche' ? 'anagrafiche' : 'modifica')));
      return perm.ruoli.map(r => M.RUOLI[r].nome).join(', ');
    })();
    const p = CRM.Pannello(col, { titolo: g.titolo, nota: e(g.gruppo), riempi: true, azioni: g.gruppo === 'Inizia qui' ? [] : [{ etichetta: 'Apri la pagina', href: g.vai, consentito: true }] });
    const sez = (titolo, html) => '<section class="guida-sez"><h3>' + titolo + '</h3>' + html + '</section>';
    const coppie = (lista, classe) => '<dl class="' + classe + '">' + lista.map(x => '<div><dt>' + x[0] + '</dt><dd>' + x[1] + '</dd></div>').join('') + '</dl>';
    let html = '<p class="guida-sintesi">' + g.sintesi + '</p>';
    if (g.schema) html += SCHEMI[g.schema]();
    if (g.flusso) html += sez('Come si lavora', '<ol class="guida-flusso">' + g.flusso.map((x, i) => '<li><span class="n">' + (i + 1) + '</span><b>' + x[0] + '</b><span>' + x[1] + '</span></li>').join('') + '</ol>');
    if (g.pulsanti) html += sez('Pulsanti e comandi', coppie(g.pulsanti.map(x => ['<span class="tasto">' + x[0] + '</span>', x[1]]), 'guida-pulsanti'));
    if (g.finestre) html += sez('Finestre', '<div class="guida-finestre">' + g.finestre.map(f => '<article class="guida-finestra"><header><b>' + f.nome + '</b><span>si apre da <span class="tasto piccolo">' + f.da + '</span></span></header>' +
      '<p>' + f.cosa + '</p>' + (f.campi ? '<h4>Cosa contiene</h4>' + coppie(f.campi, 'guida-campi') : '') + (f.azioni ? '<h4>Pulsanti</h4>' + coppie(f.azioni.map(x => ['<span class="tasto piccolo">' + x[0] + '</span>', x[1]]), 'guida-campi') : '') + '</article>').join('') + '</div>');
    if (g.sapere) html += sez('Da sapere', '<ul class="guida-sapere">' + g.sapere.map(x => '<li>' + x + '</li>').join('') + '</ul>');
    if (g.gruppo !== 'Inizia qui') html += '<p class="guida-ruoli">' + CRM.icona('lucchetto') + '<span><b>Chi può modificare:</b> ' + e(ruoli) + '. Con il profilo sola lettura la pagina si consulta (e le liquidazioni si esportano) ma non si modifica.</span></p>';
    p.corpo.insertAdjacentHTML('beforeend', '<div class="guida">' + html + '</div>');
  }
  CRM.rotta(/^\/guida$/, () => vistaGuida(null));
  CRM.rotta(/^\/guida\/([\w-]+)$/, id => vistaGuida(id));
})();
