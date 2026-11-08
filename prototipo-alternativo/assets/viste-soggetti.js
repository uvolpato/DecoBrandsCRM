/* ============================================================
   Vista "Soggetti" — CRUD dell'anagrafica unica a soggetti
   (specifica-anagrafica-soggetti.md, direzione D-102).
   Il master contiene l'identità (P.IVA, codice fiscale); cliente,
   fornitore e subagente sono ruoli che ci si collegano con
   soggetto_id. Niente cancellazioni: attivo = false.
   Le viste sono solo composizione di componenti CRM.*
   ============================================================ */
(function () {
  'use strict';
  const e = CRM.esc;

  /* chi apre una pagina vecchia nello storage: porta i dati demo del master (come M.salva in sola lettura) */
  if (!M.S.soggetti) ['soggetti', 'sedi', 'recapiti', 'persone', 'persone_contatti', 'fatturazioni']
    .forEach(k => { if (!M.S[k]) M.S[k] = JSON.parse(JSON.stringify(window.DATI_DEMO[k])); });

  /* ---------- normalizzazione al confine: si salva il valore com'è scritto + quello normalizzato (§1.6) ---------- */
  const normPiva = v => { let s = String(v || '').toUpperCase().replace(/[\s.]/g, ''); if (/^IT\d{11}$/.test(s)) s = s.slice(2); return s; };
  const normCF = v => String(v || '').toUpperCase().replace(/[\s.]/g, '');
  const pivaValida = s => /^[0-9]{11}$/.test(s) || /^[A-Z]{2}[A-Z0-9]{2,}$/.test(s);   // P.IVA corte (9–10 cifre): in scarto (§7.4)
  const HUB = /^[A-Z0-9]{7}$/;

  /* ---------- letture: identità, ruoli, nome ---------- */
  const ruoliDi = s => [
    ...M.S.clienti.filter(c => c.soggetto_id === s.id).map(c => ({ tipo: 'cliente', rec: c, nome: c.nome, codice: c.codice_integra || '', attivo: c.attivo !== false })),
    ...M.S.fornitori.filter(f => f.soggetto_id === s.id).map(f => ({ tipo: 'fornitore', rec: f, nome: f.breve || f.nome, codice: f.codice_integra || '', attivo: f.attivo !== false })),
    ...M.S.subagenti.filter(x => x.soggetto_id === s.id).map(x => ({ tipo: 'subagente', rec: x, nome: x.nome, codice: '', attivo: x.attivo !== false }))
  ];
  const nomeSoggetto = s => (ruoliDi(s).filter(r => r.attivo)[0] || {}).nome || '';
  const dettaglioSoggetto = s => s.piva_norm ? 'P.IVA ' + s.piva_norm : s.cf_norm ? 'C.F. ' + s.cf_norm : 'Nessun dato fiscale';
  const sedeDi = id => M.S.sedi.find(x => x.id === id);
  const personaDi = id => M.S.persone.find(x => x.id === id);
  const fattOf = s => M.S.fatturazioni.find(f => f.soggetto_id === s.id);
  const codiceNuovo = () => {
    let max = 0;
    M.S.soggetti.forEach(s => { const n = Number(String(s.codice || '').slice(1)); if (n > max) max = n; });
    return 'C' + String(max + 1).padStart(6, '0');
  };
  const ETICHETTE_RECAPITO = ['', 'ordini', 'amministrazione', 'magazzino', 'direzione'];
  const TITOLO_EUR = { legale: 'Sede legale', operativa: 'Sede operativa', punto_vendita: 'Punto vendita', magazzino: 'Magazzino', fatturazione: 'Sede di fatturazione' };
  const badgeRuolo = t => CRM.stato(t === 'cliente' ? 'info' : t === 'fornitore' ? 'ok' : 'attesa', t === 'subagente' ? 'subagente' : t);
  const puoModifica = () => M.puo('anagrafiche.modifica');

  /* ---------- scheda comune: elenco a sinistra, agenda del soggetto a destra ---------- */
  let filtroSoggetti = { vista: 'tutti', q: '' };
  function vistaSoggetti(idSel) {
    const s = M.S.soggetti.find(x => x.id === Number(idSel)) || M.S.soggetti.slice().sort((a, b) => a.codice.localeCompare(b.codice))[0];
    const corpo = CRM.Pagina({ voce: 'soggetti', titolo: 'Soggetti', pieno: true,
      sottotitolo: 'Anagrafica unica (proposta D-102): identità, sedi e recapiti sono del soggetto; cliente, fornitore e subagente sono ruoli sopra.',
      azioni: puoModifica() ? [{ etichetta: 'Nuovo soggetto', icona: 'piu', onClick: () => modificaSoggetto(null) }] : [] });
    const col = CRM.blocco(corpo, 'colonne pari riempi');

    /* elenco */
    const sx = CRM.blocco(col, 'riempi');
    const VISTE = {
      tutti: () => true, cliente: x => ruoliDi(x).some(r => r.tipo === 'cliente'), fornitore: x => ruoliDi(x).some(r => r.tipo === 'fornitore'),
      subagente: x => ruoliDi(x).some(r => r.tipo === 'subagente'), nonattivi: x => x.attivo === false
    };
    const filtra = () => {
      const q = (filtroSoggetti.q || '').trim().toLowerCase();
      return M.S.soggetti.filter(VISTE[filtroSoggetti.vista]).filter(x => !q ||
        [x.codice, nomeSoggetto(x), x.piva, x.piva_norm, x.codice_fiscale, x.cf_norm].some(t => String(t || '').toLowerCase().indexOf(q) >= 0));
    };
    const fb = CRM.FilterBar(sx, { campi: [
      { nome: 'q', tipo: 'cerca', valore: filtroSoggetti.q, placeholder: 'Codice, nome, P.IVA o codice fiscale' },
      { nome: 'vista', tipo: 'segmenti', valore: filtroSoggetti.vista, opzioni: [
        { value: 'tutti', label: 'Tutti', n: M.S.soggetti.length }, { value: 'cliente', label: 'Clienti', n: M.S.soggetti.filter(VISTE.cliente).length },
        { value: 'fornitore', label: 'Fornitori', n: M.S.soggetti.filter(VISTE.fornitore).length },
        { value: 'subagente', label: 'Subagenti', n: M.S.soggetti.filter(VISTE.subagente).length },
        { value: 'nonattivi', label: 'Non attivi', n: M.S.soggetti.filter(VISTE.nonattivi).length }] }
    ], onChange: v => { filtroSoggetti = v; fb.conta('vista', { tutti: M.S.soggetti.filter(VISTE.tutti).length, cliente: M.S.soggetti.filter(VISTE.cliente).length, fornitore: M.S.soggetti.filter(VISTE.fornitore).length, subagente: M.S.soggetti.filter(VISTE.subagente).length, nonattivi: M.S.soggetti.filter(VISTE.nonattivi).length }); tab.aggiorna(filtra()); } });
    const tab = CRM.DataTable(CRM.blocco(sx, 'riempi'), {
      colonne: [
        { key: 'codice', header: 'Codice' },
        { key: 'nome', header: 'Soggetto', grow: true, cell: x => '<b>' + e(nomeSoggetto(x) || 'Senza ruolo') + '</b><span class="sec-riga">' + e(dettaglioSoggetto(x)) + '</span>' },
        { key: 'ruoli', header: 'Ruoli', cell: x => ruoliDi(x).filter(r => r.attivo).map(r => badgeRuolo(r.tipo)).join(' ') || '<span class="testo-tenue">—</span>' },
        { key: 'attivo', header: 'Stato', cell: x => x.attivo === false ? CRM.stato('neutro', 'non attivo') : '' }
      ],
      righe: filtra(), ordinamentoIniziale: { key: 'codice', dir: 'asc' }, rowClass: x => x.id === s.id ? 'selezionata' : '',
      onRowClick: x => { location.hash = '#/soggetti/' + x.id; },
      emptyText: 'Nessun soggetto', emptyHint: 'Cambia la ricerca o il segmento.'
    });

    /* scheda del soggetto */
    const nome = nomeSoggetto(s);
    const dx = CRM.Pannello(col, { titolo: nome || 'Soggetto ' + s.codice, nota: 'identità master', riempi: true,
      azioni: puoModifica() ? [
        { etichetta: 'Modifica identità', onClick: () => modificaSoggetto(s) },
        s.attivo === false ? { etichetta: 'Riattiva', onClick: () => { s.attivo = true; M.annota('Soggetto ' + s.codice + ' riattivato'); M.salva(); CRM.Avviso('Soggetto riattivato'); CRM.naviga(); } }
                           : { etichetta: 'Disattiva', variante: 'pericolo', onClick: () => disattivaSoggetto(s) }
      ] : [] });
    CRM.Dettagli(dx.corpo, [
      { etichetta: 'Codice CRM', valore: '<b>' + e(s.codice) + '</b> <span class="testo-tenue">· come si cita al telefono</span>' },
      { etichetta: 'Natura', valore: s.natura === 'persona' ? 'Persona' : 'Azienda' },
      { etichetta: 'Partita IVA', valore: s.piva ? e(s.piva) + '<span class="testo-tenue"> · normalizzata ' + e(s.piva_norm) + '</span>' : '<span class="testo-tenue">—</span>' },
      { etichetta: 'Codice fiscale', valore: s.codice_fiscale ? e(s.codice_fiscale) : '<span class="testo-tenue">—</span>' },
      { etichetta: 'Paese', valore: e(s.paese) },
      { etichetta: 'Sorgente', valore: { integra: 'Integra', vecchio_crm: 'Vecchio CRM', crm: 'Censita nel CRM' }[s.sorgente] || e(s.sorgente) },
      { etichetta: 'Stato', valore: s.attivo === false ? CRM.stato('neutro', 'Non attivo: i documenti restano appesi ai loro ruoli') : CRM.stato('ok', 'Attivo') }
    ], { inColonne: true });
    if (s.note) CRM.Nota(dx.corpo, e(s.note));
    CRM.blocco(dx.corpo, '', 'height:8px;flex:none');

    const ru = ruoliDi(s), se = M.S.sedi.filter(x => x.soggetto_id === s.id && x.attivo !== false),
      rc = M.S.recapiti.filter(x => x.attivo !== false && (x.soggetto_id === s.id || se.some(y => y.id === x.sede_id) ||
        M.S.persone_contatti.some(pc => pc.soggetto_id === s.id && pc.persona_id === x.persona_id))),
      ft = fattOf(s);
    CRM.Schede(dx.corpo, { riempi: true, attiva: schedaSoggetto, onCambia: id => { schedaSoggetto = id; }, schede: [
      { id: 'ruoli', etichetta: 'Ruoli', conta: ru.length, disegna: h => disegnaRuoli(h, s, ru) },
      { id: 'sedi', etichetta: 'Sedi', conta: se.length, disegna: h => disegnaSedi(h, s, se) },
      { id: 'recapiti', etichetta: 'Recapiti', conta: rc.length, disegna: h => disegnaRecapiti(h, s, rc, se) },
      { id: 'fatturazione', etichetta: 'Fatturazione', conta: ft && ft.attiva ? 1 : 0, contaVariante: ft && ft.attiva ? 'ok' : 'neutro', disegna: h => disegnaFatturazione(h, s) }
    ] });
  }
  let schedaSoggetto = 'ruoli';

  /* ---------- Ruoli: aggiunta dal soggetto; i dati del ruolo si gestiscono nella sua pagina ---------- */
  function disegnaRuoli(h, s, ru) {
    const t = CRM.blocco(h, 'strumenti-scheda');
    t.innerHTML = '<span class="spazio"></span>';
    if (puoModifica()) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn sec piccolo'; b.innerHTML = CRM.icona('piu') + 'Aggiungi ruolo';
      b.addEventListener('click', () => modificaRuolo(s)); t.appendChild(b);
    }
    CRM.DataTable(CRM.blocco(h, 'riempi'), {
      compatta: true, righe: ru, ordinamentoIniziale: { key: 'tipo', dir: 'asc' },
      colonne: [
        { key: 'tipo', header: 'Ruolo', cell: r => badgeRuolo(r.tipo) },
        { key: 'nome', header: 'Nome', grow: true, cell: r => '<b>' + e(r.nome || '—') + '</b>' + (r.attivo ? '' : ' ' + CRM.stato('neutro', 'chiuso')) },
        { key: 'codice', header: 'Codice Integra', cell: r => r.codice ? e(r.codice) : '<span class="testo-tenue">—</span>' },
        { key: 'vai', header: '', cell: () => '<span class="testo-tenue">clic per aprire</span>' }
      ],
      onRowClick: r => { location.hash = r.tipo === 'cliente' ? '#/clienti/' + r.rec.piva : r.tipo === 'fornitore' ? '#/fornitori/' + r.rec.id : '#/subagenti/' + r.rec.id; },
      emptyText: 'Nessun ruolo', emptyHint: 'Un soggetto può essere cliente e fornitore insieme: due codici diversi (D-101).'
    });
    CRM.Nota(h, 'Il ruolo si chiude nella sua pagina (attivo = false): i documenti restano appesi. Il codice di Integra lo assegna a chi carica l’export.');
  }
  function modificaRuolo(s, tipoPreferito) {
    const v0 = { tipo: tipoPreferito || 'cliente' };
    CRM.FormModal({
      titolo: 'Aggiungi ruolo · ' + (nomeSoggetto(s) || s.codice), conferma: 'Aggiungi ruolo', colonne: 2,
      campi: [
        { nome: 'tipo', etichetta: 'Ruolo', tipo: 'select', valore: v0.tipo, opzioni: [
          { value: 'cliente', label: 'Cliente' }, { value: 'fornitore', label: 'Fornitore' }, { value: 'subagente', label: 'Subagente (persona)' }] },
        { nome: 'nome', etichetta: 'Ragione sociale / nome', valore: '', largo: true, aiuto: 'Va nella versione del ruolo, come in Integra.' },
        { nome: 'codice', etichetta: 'Codice Integra', valore: '', aiuto: 'Lo scrive chi carica l’export; vuoto finché Integra non lo rifiuta. (D-102)' },
        { nome: 'citta', etichetta: 'Città (ruoli azienda)', valore: '' }
      ],
      onConferma: (v, form) => {
        const tipo = v.tipo;
        if (ruoliDi(s).some(r => r.tipo === tipo)) { form.errore('Il soggetto ha già il ruolo ' + tipo + '.'); return false; }
        if ((tipo === 'cliente' || tipo === 'fornitore') && !v.nome) { form.errore('La ragione sociale è obbligatoria.'); return false; }
        const codiceIntegra = String(v.codice || '').trim().toUpperCase();
        const oggi = M.oggi();
        if (tipo === 'cliente') {
          M.S.clienti.push({ piva: s.piva_norm || '', nome: v.nome, citta: v.citta, indirizzo: '', codice_integra: codiceIntegra, vendita_diretta: false, soggetto_id: s.id, attivo: true, valido_dal: oggi });
        } else if (tipo === 'fornitore') {
          M.S.fornitori.push({ id: Math.max.apply(null, M.S.fornitori.map(x => x.id)) + 1, nome: v.nome, breve: v.nome.split(/[ .]/)[0], piva: s.piva || '', paese: s.paese === 'IT' ? 'Italia' : s.paese,
            codice_integra: codiceIntegra, giorni_conferma: 21, giorno_bollettino: 10, giorni_incasso: 60, maturazione: 'fatturato', attivo: true, soggetto_id: s.id, valido_dal: oggi });
        } else {
          if (s.natura !== 'persona') { form.errore('Il subagente è una persona: metti Natura = persona.'); return false; }
          M.S.subagenti.push({ id: Math.max.apply(null, M.S.subagenti.map(x => x.id)) + 1, nome: String(v.nome).trim(), email: '', telefono: '', cf: s.cf_norm || s.piva_norm || '', attivo: true, soggetto_id: s.id, valido_dal: oggi });
        }
        M.annota('Ruolo ' + tipo + ' aggiunto al soggetto ' + s.codice + (v.nome ? ' (' + v.nome + ')' : ''));
        M.salva(); CRM.Avviso('Ruolo aggiunto'); CRM.naviga();
      }
    });
  }

  /* ---------- Sedi: CRUD con predefinita unica per tipo ---------- */
  function disegnaSedi(h, s, se) {
    const t = CRM.blocco(h, 'strumenti-scheda');
    t.innerHTML = '<span class="spazio"></span>';
    if (puoModifica()) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn sec piccolo'; b.innerHTML = CRM.icona('piu') + 'Nuova sede';
      b.addEventListener('click', () => modificaSede(s, null)); t.appendChild(b);
    }
    CRM.DataTable(CRM.blocco(h, 'riempi'), {
      compatta: true, righe: se, ordinamentoIniziale: { key: 'tipo', dir: 'asc' },
      colonne: [
        { key: 'tipo', header: 'Tipo', cell: x => CRM.stato(x.tipo === 'punto_vendita' ? 'attesa' : 'neutro', TITOLO_EUR[x.tipo] || x.tipo) },
        { key: 'insegna', header: 'Insegna', grow: true, cell: x => '<b>' + e(x.insegna || '') + '</b><span class="sec-riga">' + e([x.indirizzo, x.cap, x.citta, x.provincia].filter(Boolean).join(', ')) + '</span>' },
        { key: 'predefinita', header: '', cell: x => x.predefinita ? CRM.stato('ok', 'Predefinita') : '' }
      ],
      onRowClick: puoModifica() ? x => modificaSede(s, x) : null,
      emptyText: 'Nessuna sede', emptyHint: 'Il settore e il gruppo sono della sede, non dell’azienda.'
    });
    CRM.Nota(h, 'Una catena = un soggetto con N punti vendita (Consorzio Agrario, MCL): i documenti restano appesi alla sede. Valido_al chiude, non si cancella.');
  }
  function modificaSede(s, sede) {
    const nuovo = !sede;
    CRM.FormModal({
      titolo: (nuovo ? 'Nuova sede · ' : 'Sede · ') + (nomeSoggetto(s) || s.codice), conferma: 'Salva sede', colonne: 2,
      campi: [
        { nome: 'tipo', etichetta: 'Tipo', tipo: 'select', valore: nuovo ? 'punto_vendita' : sede.tipo, opzioni: Object.keys(TITOLO_EUR).map(k => ({ value: k, label: TITOLO_EUR[k] })) },
        { nome: 'insegna', etichetta: 'Insegna del punto vendita', valore: sede ? sede.insegna : '', aiuto: 'Vuota per le sedi legali o di magazzino.' },
        { nome: 'indirizzo', etichetta: 'Indirizzo', largo: true },
        { nome: 'cap', etichetta: 'CAP' },
        { nome: 'citta', etichetta: 'Città' },
        { nome: 'provincia', etichetta: 'Provincia', aiuto: 'Due lettere.' },
        { nome: 'predefinita', etichetta: 'Predefinita di questo tipo', tipo: 'casella', valore: !nuovo && sede.predefinita, aiuto: 'Una sola per tipo: l’export a Integra porta l’indirizzo della predefinita.' }
      ],
      onConferma: (v, form) => {
        if (!v.indirizzo || !v.citta) { form.errore('Indirizzo e città sono obbligatori.'); return false; }
        if (!nuovo && v.tipo !== sede.tipo && sede.predefinita && M.S.sedi.some(x => x !== sede && x.soggetto_id === s.id && x.tipo === v.tipo && x.predefinita)) {
          form.errore('Il soggetto ha già una sede predefinita del tipo scelto.'); return false;
        }
        const rec = sede || { id: Math.max.apply(null, M.S.sedi.map(x => x.id)) + 1, soggetto_id: s.id, attivo: true, valido_dal: M.oggi(), valido_al: null };
        if (v.predefinita) M.S.sedi.filter(x => x.soggetto_id === s.id && x.tipo === v.tipo && x.predefinita).forEach(x => { x.predefinita = false; });
        Object.assign(rec, { tipo: v.tipo, insegna: v.insegna, indirizzo: v.indirizzo, cap: v.cap, citta: v.citta, provincia: String(v.provincia || '').toUpperCase(), predefinita: !!v.predefinita });
        if (nuovo) M.S.sedi.push(rec);
        M.annota((nuovo ? 'Nuova ' : rec.tipo + ' aggiornata: ') + (TITOLO_EUR[rec.tipo].toLowerCase()) + ' di ' + s.codice);
        M.salva(); CRM.Avviso('Sede salvata'); CRM.naviga();
      }
    });
  }

  /* ---------- Recapiti: allegabili a soggetto, sede o persona referente ---------- */
  function disegnaRecapiti(h, s, rc, se) {
    const t = CRM.blocco(h, 'strumenti-scheda');
    t.innerHTML = '<span class="spazio"></span>';
    if (puoModifica()) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn sec piccolo'; b.innerHTML = CRM.icona('piu') + 'Nuovo recapito';
      b.addEventListener('click', () => modificaRecapito(s, se, null)); t.appendChild(b);
    }
    CRM.DataTable(CRM.blocco(h, 'riempi'), {
      compatta: true, righe: rc, ordinamentoIniziale: { key: 'tipo', dir: 'asc' },
      colonne: [
        { key: 'tipo', header: 'Tipo' },
        { key: 'valore', header: 'Recapito', grow: true, cell: x => '<b>' + e(x.valore) + '</b>' + (x.etichetta ? '<span class="sec-riga">' + e(x.etichetta) + '</span>' : '') },
        { key: 'dove', header: 'Allegato a', cell: x => e(x.sede_id ? (sedeDi(x.sede_id) || {}).insegna || 'sede' : x.persona_id ? [personaDi(x.persona_id)].filter(Boolean).map(p => p.nome + ' ' + p.cognome)[0] || 'persona' : 'soggetto') },
        { key: 'predefinito', header: '', cell: x => x.predefinito ? CRM.stato('ok', 'Predefinito') : '' }
      ],
      onRowClick: puoModifica() ? x => modificaRecapito(s, se, x) : null,
      emptyText: 'Nessun recapito', emptyHint: 'Una email per soggetto non basta: ordini, fatture, PEC e solleciti vanno su indirizzi diversi. (§4.3)'
    });
  }
  function modificaRecapito(s, se, x) {
    const nuovo = !x;
    const sediSoggetto = se.map(y => ({ value: 'se' + y.id, label: 'Sede: ' + (y.insegna || TITOLO_EUR[y.tipo]) }));
    const collegamenti = M.S.persone_contatti.filter(pc => pc.soggetto_id === s.id)
      .map(pc => { const p = personaDi(pc.persona_id); return p ? { value: 'pe' + p.id, label: p.nome + ' ' + p.cognome } : null; }).filter(Boolean);
    const opzioniDove = [{ value: 'so', label: 'Soggetto' }].concat(sediSoggetto, collegamenti);
    const doveDi = y => y.sede_id ? 'se' + y.sede_id : y.persona_id ? 'pe' + y.persona_id : 'so';
    CRM.FormModal({
      titolo: (nuovo ? 'Nuovo recapito · ' : 'Recapito · ') + (nomeSoggetto(s) || s.codice), conferma: 'Salva recapito', colonne: 2,
      campi: [
        { nome: 'tipo', etichetta: 'Tipo', tipo: 'select', valore: x ? x.tipo : 'email', opzioni: ['email', 'pec', 'telefono', 'cellulare', 'fax', 'sito'].map(k => ({ value: k, label: k })) },
        { nome: 'valore', etichetta: 'Valore', largo: true, aiuto: 'Le email in minuscolo, i telefoni nel formato +39…: si salva anche normalizzato.' },
        { nome: 'dove', etichetta: 'Allegato a', tipo: 'select', valore: x ? doveDi(x) : 'so', opzioni: opzioniDove },
        { nome: 'etichetta', etichetta: 'Uso', tipo: 'select', valore: x ? (x.etichetta || '') : '', opzioni: ETICHETTE_RECAPITO.map(k => ({ value: k, label: k || '—' })) },
        { nome: 'predefinito', etichetta: 'Predefinito per questo uso', tipo: 'casella', valore: !nuovo && x.predefinito }
      ],
      azioniExtra: nuovo ? [] : [{ etichetta: 'Disattiva', variante: 'pericolo', onClick: () => {
        CRM.Conferma('Disattivare il recapito?', 'Resta nei dati ma non si usa più; i documenti passati lo citano.', 'Disattiva', true).then(ok => {
          if (!ok) return; x.attivo = false; M.annota('Recapito disattivato: ' + x.valore); M.salva(); CRM.Avviso('Recapito disattivato'); CRM.naviga();
        });
      } }],
      onConferma: (v, form) => {
        if (!v.valore) { form.errore('Il valore è obbligatorio.'); return false; }
        if ((v.tipo === 'email' || v.tipo === 'pec') && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.valore)) { form.errore('L’email non è valida.'); return false; }
        const sedeId = v.dove.indexOf('se') === 0 ? Number(v.dove.slice(2)) : null;
        const personaId = v.dove.indexOf('pe') === 0 ? Number(v.dove.slice(2)) : null;
        const dup = M.S.recapiti.find(y => y !== x && y.attivo !== false && y.tipo === v.tipo && y.valore.toLowerCase() === v.valore.toLowerCase() &&
          (y.sede_id || null) === sedeId && (y.persona_id || null) === personaId && (y.soggetto_id || null) === (sedeId || personaId ? null : s.id));
        if (dup) { form.errore('Questo recapito esiste già, identico e attivo.'); return false; }
        const rec = x || { id: Math.max.apply(null, M.S.recapiti.map(y => y.id)) + 1, attivo: true, valido_dal: M.oggi(), valido_al: null };
        Object.assign(rec, { tipo: v.tipo, valore: v.tipo === 'email' || v.tipo === 'pec' ? v.valore.toLowerCase() : v.valore,
          etichetta: v.etichetta || '', predefinito: !!v.predefinito,
          sede_id: sedeId, persona_id: personaId, soggetto_id: sedeId || personaId ? null : s.id });
        if (nuovo) M.S.recapiti.push(rec);
        M.annota((nuovo ? 'Nuovo ' : 'Recapito aggiornato: ') + v.tipo + ' ' + rec.valore);
        M.salva(); CRM.Avviso('Recapito salvato'); CRM.naviga();
      }
    });
  }

  /* ---------- Fatturazione elettronica: 1:1 con il soggetto (§4.5) ---------- */
  function disegnaFatturazione(h, s) {
    const f = fattOf(s);
    const campi = [
      { etichetta: 'Configurata', valore: f && f.attiva ? CRM.stato('ok', 'Sì') : CRM.stato('neutro', 'No') },
      { etichetta: 'Codice destinatario (SDI)', valore: f && f.codice_destinatario ? '<b>' + e(f.codice_destinatario) + '</b>' : '<span class="testo-tenue">—</span>' },
      { etichetta: 'PEC del destinatario', valore: f && f.pec_destinatario ? e(f.pec_destinatario) : '<span class="testo-tenue">—</span>' },
      { etichetta: 'Identificativo estero', valore: f && f.id_codice_estero ? e(f.id_paese_estero + ' · ' + f.id_codice_estero) : '<span class="testo-tenue">—</span>' },
      { etichetta: 'Regime fiscale', valore: f && f.regime_fiscale ? e(f.regime_fiscale) : '<span class="testo-tenue">—</span>' },
      { etichetta: 'Esigibilità IVA', valore: f && f.esigibilita_iva ? ({ I: 'Immediata', D: 'Differita', S: 'Scissione dei pagamenti' }[f.esigibilita_iva] || e(f.esigibilita_iva)) : '<span class="testo-tenue">—</span>' }
    ];
    CRM.Dettagli(h, campi, { inColonne: true });
    if (f && (f.split_payment || f.reverse_charge)) CRM.Nota(h, (f.split_payment ? 'Split payment. ' : '') + (f.reverse_charge ? 'Reverse charge.' : ''));
    if (puoModifica()) {
      const t = CRM.blocco(h, 'strumenti-scheda');
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn sec piccolo'; b.innerHTML = CRM.icona('piu') + 'Modifica fatturazione';
      b.addEventListener('click', () => modificaFatturazione(s)); t.appendChild(b);
    }
    CRM.Nota(h, 'Dati dell’amministrazione che cambiano nel tempo; sono del soggetto fiscale, non del ruolo: usati anche nelle fatture dei fornitori. (§4.5)');
  }
  function modificaFatturazione(s) {
    const f0 = fattOf(s);
    const f = f0 || { soggetto_id: s.id, codice_destinatario: '', pec_destinatario: '', codice_univoco_ufficio: '', id_paese_estero: '', id_codice_estero: '', regime_fiscale: '', split_payment: false, reverse_charge: false, esigibilita_iva: '', attiva: false, note: '' };
    CRM.FormModal({
      titolo: 'Fatturazione elettronica · ' + (nomeSoggetto(s) || s.codice), conferma: 'Salva', colonne: 2,
      campi: [
        { nome: 'attiva', etichetta: 'Configurata', tipo: 'select', valore: f.attiva ? 'si' : 'no', opzioni: [{ value: 'si', label: 'Sì' }, { value: 'no', label: 'No' }] },
        { nome: 'codice_destinatario', etichetta: 'Codice destinatario SDI (7 caratteri)', valore: f.codice_destinatario, aiuto: 'Oppure la PEC; per i destinatari esteri il campo vuoto.' },
        { nome: 'pec_destinatario', etichetta: 'PEC del destinatario', valore: f.pec_destinatario },
        { nome: 'regime_fiscale', etichetta: 'Regime fiscale', tipo: 'select', valore: f.regime_fiscale, opzioni: ['', 'RF01', 'RF02', 'RF04', 'RF08', 'RF10', 'RF16', 'RF19'].map(k => ({ value: k, label: k || '—' })) },
        { nome: 'esigibilita', etichetta: 'Esigibilità IVA', tipo: 'select', valore: f.esigibilita_iva, opzioni: [{ value: '', label: '—' }, { value: 'I', label: 'Immediata' }, { value: 'D', label: 'Differita' }, { value: 'S', label: 'Scissione' }] },
        { nome: 'split_payment', etichetta: 'Split payment', tipo: 'casella', valore: f.split_payment },
        { nome: 'reverse_charge', etichetta: 'Reverse charge', tipo: 'casella', valore: f.reverse_charge },
        { nome: 'id_estero', etichetta: 'Identificativo estero', valore: f.id_codice_estero, largo: true, aiuto: 'Solo per i destinatari senza SDI: codice di un max 2 lettere + identificativo.' }
      ],
      onConferma: (v, form) => {
        const cod = String(v.codice_destinatario || '').toUpperCase();
        if (cod && !HUB.test(cod)) { form.errore('Il codice destinatario ha 7 lettere o cifre.'); return false; }
        if (v.attiva === 'si' && !cod && !v.pec_destinatario && !v.id_estero) { form.errore('Configurata serve almeno un modo di ricevere la fattura: codice, PEC o identificativo estero.'); return false; }
        const rec = f.soggetto_id ? f : Object.assign({ soggetto_id: s.id }, f);
        let paeseEst = f.id_paese_estero;
        if (v.id_estero) { const m = String(v.id_estero).match(/^([A-Z]{2})\s*·\s*(.+)$|^([A-Z]{2})\s+(.+)$/); paeseEst = (m && (m[1] || m[3])) || 'IT'; }
        Object.assign(rec, { codice_destinatario: cod, pec_destinatario: (v.pec_destinatario || '').toLowerCase(),
          regime_fiscale: v.regime_fiscale, esigibilita_iva: v.esigibilita, split_payment: !!v.split_payment, reverse_charge: !!v.reverse_charge,
          id_paese_estero: v.id_estero ? paeseEst : '', id_codice_estero: v.id_estero || '', attiva: v.attiva === 'si' });
        if (!f0) M.S.fatturazioni.push(rec);
        M.annota('Fatturazione elettronica di ' + s.codice + (rec.attiva ? ' configurata' : ' non configurata'));
        M.salva(); CRM.Avviso('Fatturazione salvata'); CRM.naviga();
      }
    });
  }

  /* ---------- Identità master: nuovo soggetto e modifica ---------- */
  function modificaSoggetto(s) {
    const nuovo = !s;
    CRM.FormModal({
      titolo: nuovo ? 'Nuovo soggetto' : 'Modifica identità · ' + (nomeSoggetto(s) || s.codice),
      testo: 'Solo identità e chiavi di riconoscimento. Il nome arriverà con i ruoli, le sedi e i recapiti restano qui.',
      conferma: nuovo ? 'Crea soggetto' : 'Salva', colonne: 2,
      campi: [
        { nome: 'natura', etichetta: 'Natura', tipo: 'select', valore: s ? s.natura : 'azienda', opzioni: [{ value: 'azienda', label: 'Azienda' }, { value: 'persona', label: 'Persona' }] },
        { nome: 'paese', etichetta: 'Paese (ISO 2)', valore: s ? s.paese : 'IT' },
        { nome: 'piva', etichetta: 'Partita IVA', valore: s ? s.piva : '', largo: true, aiuto: 'Com’è scritta in origine; la versione normalizzata si calcola in salvataggio.' },
        { nome: 'codice_fiscale', etichetta: 'Codice fiscale', valore: s ? s.codice_fiscale : '' },
        { nome: 'note', etichetta: 'Note', tipo: 'area', righe: 2, largo: true }
      ],
      onConferma: (v, form) => {
        if (!['azienda', 'persona'].includes(v.natura)) { form.errore('Scegli la natura.'); return false; }
        const paese = String(v.paese || 'IT').toUpperCase().slice(0, 2);
        const pn = normPiva(v.piva), cn = normCF(v.codice_fiscale);
        if (pn && !pivaValida(pn)) { form.errore('La P.IVA non è valida: le corte (9–10 cifre) vanno in scarto, non si inventano. (§7.4)'); return false; }
        if (!pn && !cn) { form.errore('Serve almeno P.IVA o codice fiscale: senza, sono contatti del vecchio CRM, non soggetti.'); return false; }
        const dupP = pn && M.S.soggetti.find(y => y !== s && y.paese === paese && y.piva_norm === pn);
        if (dupP) { form.errore('Esiste già: ' + (nomeSoggetto(dupP) || dupP.codice) + ' (' + dupP.codice + '). La fusione in un soggetto unico si decide con la deduplica, non si crea un doppione.'); return false; }
        const dupC = !pn && cn && M.S.soggetti.find(y => y !== s && y.paese === paese && !y.piva_norm && y.cf_norm === cn);
        if (dupC) { form.errore('Esiste già un soggetto con questo codice fiscale: ' + (nomeSoggetto(dupC) || dupC.codice) + '.'); return false; }
        const rec = s || { id: Math.max.apply(null, M.S.soggetti.map(y => y.id)) + 1, codice: codiceNuovo(), sorgente: 'crm', attivo: true, note: '' };
        Object.assign(rec, { natura: v.natura, paese: paese, piva: v.piva, piva_norm: pn, codice_fiscale: v.codice_fiscale, cf_norm: cn, note: v.note || '' });
        if (nuovo) M.S.soggetti.push(rec);
        M.annota((nuovo ? 'Nuovo soggetto ' : 'Identità aggiornata: ') + rec.codice);
        M.salva(); CRM.Avviso(nuovo ? 'Soggetto creato' : 'Identità salvata'); location.hash = '#/soggetti/' + rec.id; CRM.naviga();
      }
    });
  }
  function disattivaSoggetto(s) {
    const attivi = ruoliDi(s).filter(r => r.attivo);
    if (attivi.length) {
      CRM.Modale({ titolo: 'Non si può disattivare ' + s.codice,
        testo: 'Ha ruoli attivi (' + attivi.map(r => r.tipo).join(', ') + '): dagli una fine (valido_al) prima. I documenti restano appesi alle loro versioni.',
        azioni: [{ etichetta: 'Chiudi', variante: 'sec' }] });
      return;
    }
    CRM.Conferma('Disattivare ' + s.codice + '?', 'Nessuna cancellazione: il soggetto resta in elenco come non attivo, con i suoi dati.', 'Disattiva', true).then(ok => {
      if (!ok) return; s.attivo = false; M.annota('Soggetto ' + s.codice + ' disattivato'); M.salva(); CRM.Avviso('Soggetto disattivato'); CRM.naviga();
    });
  }

  CRM.rotta(/^\/soggetti$/, () => vistaSoggetti(null));
  CRM.rotta(/^\/soggetti\/(\d+)$/, id => vistaSoggetti(id));
})();
