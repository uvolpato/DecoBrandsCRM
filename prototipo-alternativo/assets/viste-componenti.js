/* ============================================================
   Catalogo dei componenti standard CRM.* — esempi dal vivo e parametri.
   Ogni vista del prototipo è composta solo da questi componenti.
   ============================================================ */
(function () {
  'use strict';
  const e = CRM.esc;
  const prova = () => CRM.Avviso('Azione di prova');

  const RIGHE = [
    { codice: 'K-10122', cliente: 'Arredo Bagno Rossi', data: '2026-08-12', importo: 4820.5, pct: 17.5, stato: 'ok' },
    { codice: 'GA-2271', cliente: 'Ceramiche Verdi', data: '2026-07-30', importo: 1240, pct: 12, stato: 'attesa' },
    { codice: 'IN-3150', cliente: 'Casa & Stile', data: '2026-08-21', importo: -310.2, pct: 15, stato: 'errore' },
    { codice: 'K-10140', cliente: 'Bianchi Interni', data: '2026-06-03', importo: 9120, pct: 17.5, stato: 'ok' },
    { codice: 'GA-2290', cliente: 'Ferri Design', data: '2026-08-02', importo: 2210.75, pct: 12, stato: 'ok' },
    { codice: 'IN-3166', cliente: 'Studio Lupi', data: '2026-05-18', importo: 640, pct: 15, stato: 'attesa' }
  ];
  const ST = { ok: ['ok', 'Liquidabile'], attesa: ['attesa', 'In attesa'], errore: ['errore', 'Contestata'] };
  const COLONNE = [
    { key: 'codice', header: 'Codice' },
    { key: 'cliente', header: 'Cliente', grow: true },
    { key: 'data', header: 'Data', tipo: 'data' },
    { key: 'importo', header: 'Importo', tipo: 'euro', totale: 'somma' },
    { key: 'pct', header: '%', tipo: 'pct' },
    { key: 'stato', header: 'Stato', cell: r => CRM.stato(ST[r.stato][0], ST[r.stato][1]) }
  ];

  const VOCI = [
    { nome: 'Pagina', gruppo: 'Struttura', testo: 'Ogni vista parte da qui: disegna la barra laterale, l’intestazione e restituisce il corpo dove comporre gli altri componenti.',
      firma: 'CRM.Pagina({ voce, titolo, sottotitolo, briciole: [{ etichetta, href }], badge, azioni: [{ etichetta, icona, variante, onClick, href, disabilitato, titolo }], pieno }) → corpo',
      demo: h => CRM.Intestazione(h, { titolo: 'Titolo della vista', sottotitolo: 'Sottotitolo che spiega a cosa serve la pagina.', badge: CRM.stato('attesa', 'Da verificare'),
        briciole: [{ etichetta: 'Elenco', href: '#/componenti' }, { etichetta: 'Dettaglio' }],
        azioni: [{ etichetta: 'Secondaria', variante: 'sec', icona: 'scarica', onClick: prova }, { etichetta: 'Principale', icona: 'spunta', onClick: prova }] }) },
    { nome: 'Pannello', gruppo: 'Struttura', testo: 'Contenitore bianco con titolo, nota e azioni. Con riempi occupa lo spazio rimasto e scorre al suo interno.',
      firma: 'CRM.Pannello(host, { titolo, nota, azioni: [{ etichetta, icona, variante, onClick, href }], riempi, senzaMargine }) → { el, corpo, nota(html) }',
      demo: h => { const p = CRM.Pannello(h, { titolo: 'Titolo del pannello', nota: 'nota a destra', azioni: [{ etichetta: 'Azione', onClick: prova }] }); CRM.Nota(p.corpo, 'Il contenuto va in <b>corpo</b>.'); } },
    { nome: 'DataTable', gruppo: 'Dati', alto: true, testo: 'Tabella standard: occupa tutto lo spazio, intestazione fissa, righe scorrevoli, intestazioni ordinabili, totali fissi, conteggio nel piede. Con naturale prende l’altezza del contenuto.',
      firma: 'CRM.DataTable(host, { colonne: [{ key, header, tipo: testo|euro|numero|pct|data, valore(r), cell(r), align, grow, sortable, sortValue(r), totale: \'somma\' }],\n  righe, onRowClick(r), rowClass(r), emptyText, emptyHint, ordinamentoIniziale: { key, dir }, compatta, naturale, piede, etichettaTotale }) → { el, aggiorna(righe) }',
      demo: h => CRM.DataTable(h, { colonne: COLONNE, righe: RIGHE, onRowClick: r => CRM.Avviso('Riga ' + r.codice), ordinamentoIniziale: { key: 'data', dir: 'desc' }, piede: 'Clic su una riga o su un’intestazione.' }) },
    { nome: 'FilterBar', gruppo: 'Dati', testo: 'Filtri sopra una tabella: segmenti con conteggio, ricerca, select. Chiama onChange con tutti i valori.',
      firma: 'CRM.FilterBar(host, { campi: [{ nome, tipo: segmenti|cerca|select, opzioni: [{ value, label, n }], valore, placeholder }], onChange(valori) }) → { el, valori() }',
      demo: h => {
        const t = CRM.DataTable(CRM.el('div'), { colonne: COLONNE, righe: RIGHE, naturale: true, compatta: true });
        let v = { stato: 'tutte', q: '' };
        const agg = () => t.aggiorna(RIGHE.filter(r => (v.stato === 'tutte' || r.stato === v.stato) && r.cliente.toLowerCase().indexOf(v.q.toLowerCase()) >= 0));
        CRM.FilterBar(h, { campi: [{ nome: 'stato', tipo: 'segmenti', opzioni: [{ value: 'tutte', label: 'Tutte', n: 6 }, { value: 'ok', label: 'Liquidabili', n: 3 }, { value: 'attesa', label: 'In attesa', n: 2 }, { value: 'errore', label: 'Contestate', n: 1 }] },
          { nome: 'q', tipo: 'cerca', placeholder: 'Cerca cliente' }], onChange: x => { v = x; agg(); } });
        h.appendChild(t.el);
      } },
    { nome: 'KpiRow', gruppo: 'Dati', testo: 'Riquadri numerici con bordo colorato a sinistra. Con onSeleziona diventano un filtro (clic di nuovo per togliere).',
      firma: 'CRM.KpiRow(host, [{ id, etichetta, valore, variante: primario|ok|attesa|errore|info, dettagli: [{ testo, variante }] }], { selezionata, onSeleziona(id) })',
      demo: h => CRM.KpiRow(h, [
        { id: 'a', etichetta: 'Mario Bianchi', valore: 1284.4, variante: 'ok', dettagli: [{ testo: 'da liquidare · 6 documenti' }] },
        { id: 'b', etichetta: 'Laura Neri', valore: 512.1, variante: 'attesa', dettagli: [{ testo: 'da liquidare · 3 documenti' }, { testo: '210,00 € in attesa', variante: 'attesa' }] },
        { id: 'c', etichetta: 'Paolo Riva', valore: 0, variante: 'info', dettagli: [{ testo: 'nessun documento' }] }
      ], { onSeleziona: id => CRM.Avviso(id ? 'Filtro: ' + id : 'Filtro tolto') }) },
    { nome: 'Cifre', gruppo: 'Dati', testo: 'Elenco etichetta → importo, per riepiloghi brevi (trimestre, provvigione).',
      firma: 'CRM.Cifre(host, [{ etichetta, valore (numero = euro), nota, variante, forte }])',
      demo: h => CRM.Cifre(h, [{ etichetta: 'Atteso dai fornitori', valore: 3120.4 }, { etichetta: 'Già riconosciuto', valore: 2210 }, { etichetta: 'Bloccato', valore: 505.8, variante: 'attesa' }, { etichetta: 'Rettifica', valore: -42.5, nota: 'nota di credito' }]) },
    { nome: 'Dettagli', gruppo: 'Dati', testo: 'Coppie etichetta / valore per le schede.',
      firma: 'CRM.Dettagli(host, [{ etichetta, valore (html) }])',
      demo: h => CRM.Dettagli(h, [{ etichetta: 'Fornitore', valore: 'Gries Deco Company' }, { etichetta: 'Codice cliente', valore: '<b>K-10122</b>' }, { etichetta: 'Stato', valore: CRM.stato('info', 'Confermata') }]) },
    { nome: 'Elenco', gruppo: 'Dati', testo: 'Lista semplice con testo e valore a destra (registro, documenti di una pratica).',
      firma: 'CRM.Elenco(host, [{ testo (html), destra (html) }], vuoto)',
      demo: h => CRM.Elenco(h, [{ testo: CRM.icona('file') + ' Ordine <b>DB-2026-0412</b>', destra: M.euro(4820.5) }, { testo: CRM.icona('file') + ' Conferma <b>AB-77120</b>', destra: M.euro(4790) }]) },
    { nome: 'stato', gruppo: 'Dati', testo: 'Etichetta di stato. Sei varianti, sempre con testo: il colore non porta da solo il significato.',
      firma: 'CRM.stato(variante: ok|attesa|errore|info|primario|neutro, testo) → html',
      demo: h => { h.innerHTML = '<div style="display:flex;gap:8px;flex-wrap:wrap">' + [['ok', 'Fatturata'], ['info', 'Confermata'], ['attesa', 'Attesa conferma'], ['errore', 'In ritardo'], ['primario', 'Pronto da chiudere'], ['neutro', 'Al prossimo bollettino']].map(x => CRM.stato(x[0], x[1])).join('') + '</div>'; } },
    { nome: 'Caricamento', gruppo: 'Flussi', testo: 'Area dove trascinare i file o sceglierli. È il punto d’ingresso di tutti i documenti; scegliFile apre la stessa scelta da un pulsante qualsiasi (barra laterale, Bollettini, Pratica).',
      firma: 'CRM.Caricamento(host, { titolo, testo, accetta, onFile(files) })\nCRM.scegliFile({ accetta, onFile(files) })',
      demo: h => CRM.Caricamento(h, { titolo: 'Trascina qui i documenti', testo: 'PDF o Excel', onFile: f => CRM.Avviso(f.length + (f.length === 1 ? ' file scelto: ' + f[0].name : ' file scelti')) }) },
    { nome: 'ListaDaFare', gruppo: 'Flussi', testo: 'Attività in ordine di urgenza, ognuna con il pulsante che porta dove si risolve.',
      firma: 'CRM.ListaDaFare(host, [{ tipo: errore|attesa|primario, titolo, dettaglio, href, azione }], vuoto: { titolo, testo })',
      demo: h => CRM.ListaDaFare(h, [
        { tipo: 'errore', titolo: 'Conferma in ritardo · DB-2026-0398', dettaglio: 'Gasper, attesa da 6 giorni', href: '#/componenti', azione: 'Sollecita' },
        { tipo: 'primario', titolo: 'Fattura F-2026-0930 da abbinare', dettaglio: 'Ing’s · abbinamento sicuro', href: '#/componenti', azione: 'Abbina' },
        { tipo: 'attesa', titolo: 'Bollettino Gries luglio', dettaglio: '1 riga da decidere', href: '#/componenti', azione: 'Verifica' }], {}) },
    { nome: 'ElencoSelezionabile', gruppo: 'Flussi', testo: 'Colonna sinistra di una vista a due pannelli: la voce aperta è evidenziata.',
      firma: 'CRM.ElencoSelezionabile(host, [{ id, href, titolo, valore, sotto, stato (html) }], selezionata)',
      demo: h => CRM.ElencoSelezionabile(h, [
        { id: 1, href: '#/componenti', titolo: 'Fattura F-2026-0930', valore: M.euro(3150), sotto: 'Ing’s · arrivato il 03/09/2026', stato: CRM.stato('ok', 'Abbinamento sicuro') },
        { id: 2, href: '#/componenti', titolo: 'Conferma C-2026/1101', valore: M.euro(880), sotto: 'Gasper · arrivato il 04/09/2026', stato: CRM.stato('errore', 'Cliente non riconosciuto') }], 1) },
    { nome: 'Scelte', gruppo: 'Flussi', testo: 'Alternative con i motivi e un’azione ciascuna; quella consigliata è in evidenza.',
      firma: 'CRM.Scelte(host, [{ titolo, sottotitolo (html), punti: [html], azione: { etichetta, onClick }, consigliata }], vuoto)',
      demo: h => CRM.Scelte(h, [
        { titolo: 'DB-2026-0412 · Arredo Bagno Rossi', sottotitolo: CRM.stato('attesa', 'Attesa conferma') + ' › ' + CRM.stato('info', 'Confermata'), punti: ['codice cliente K-10122', '3 articoli in comune', 'importo uguale all’ordine'], consigliata: true, azione: { etichetta: 'Abbina a DB-2026-0412', onClick: prova } },
        { titolo: 'DB-2026-0420 · Bianchi Interni', punti: ['1 articolo in comune', '<span class="negativo">-120,00 €</span> rispetto all’ordine'], azione: { etichetta: 'Abbina a DB-2026-0420', onClick: prova } }]) },
    { nome: 'Binario', gruppo: 'Flussi', testo: 'Le fasi documentali di una pratica, con le differenze fra una fase e la precedente.',
      firma: 'CRM.Binario(host, [{ titolo, fatta, ritardo, numero, data, importo, delta, testo, assente }])',
      demo: h => CRM.Binario(h, [
        { titolo: 'Ordine', fatta: true, numero: 'DB-2026-0412', data: '2026-07-20', importo: 4820.5 },
        { titolo: 'Conferma', fatta: true, numero: 'AB-77120', data: '2026-07-24', importo: 4790, delta: -30.5 },
        { titolo: 'Fattura', ritardo: true, testo: 'In ritardo di 4 giorni' },
        { titolo: 'Nota di credito', assente: true, testo: 'Nessuna' }]) },
    { nome: 'Matrice', gruppo: 'Flussi', testo: 'Griglia righe × colonne (fornitore × mese) con stato, importo, collegamento o azione per cella.',
      firma: 'CRM.Matrice(host, { angolo, colonne: [testo], righe: [{ titolo, sotto, celle: [{ stato, valore, href, azione: { etichetta, onClick }, vuota }] }] })',
      demo: h => CRM.Matrice(h, { angolo: 'Fornitore', colonne: ['Luglio 2026', 'Agosto 2026', 'Settembre 2026'], righe: [
        { titolo: 'Gries Deco Company', sotto: 'paga sul maturato', celle: [{ href: '#/componenti', stato: CRM.stato('attesa', '1 riga da decidere'), valore: M.euro(1144.5) }, { stato: CRM.stato('errore', 'Non arrivato'), azione: { etichetta: 'Sollecita', onClick: prova } }, { vuota: 'Mese in corso' }] },
        { titolo: 'Ing’s', sotto: 'paga sul fatturato', celle: [{ href: '#/componenti', stato: CRM.stato('ok', 'Verificato'), valore: M.euro(420) }, { href: '#/componenti', stato: CRM.stato('primario', 'Pronto da chiudere'), valore: M.euro(472.5) }, { vuota: 'Mese in corso' }] }] }) },
    { nome: 'Cerniera', gruppo: 'Flussi', testo: 'Riconciliazione riga per riga: a sinistra il fornitore, a destra il nostro calcolo, la differenza sulla cucitura. Gruppi richiudibili.',
      firma: 'CRM.Cerniera(host, { sinistra, destra, totali: { sinistra, destra, differenza },\n  gruppi: [{ titolo, variante, chiuso, righe: [{ titolo, dettagli, sinistra: { importo, dett }, destra, differenza, quadra, azioni: [{ etichetta, variante, onClick, href }], esito }] }] })',
      demo: h => CRM.Cerniera(h, { sinistra: 'Gries riconosce', destra: 'Noi calcoliamo', totali: { sinistra: 1144.5, destra: 1180, differenza: -35.5 }, gruppi: [
        { titolo: 'Da decidere', variante: 'attesa', righe: [{ titolo: '<b>F-0912</b>', dettagli: 'Arredo Bagno Rossi · 12/07/2026 · importo diverso', sinistra: { importo: 1144.5, dett: '17,50 % di 6.540,00 €' }, destra: { importo: 1180, dett: '18,04 % di 6.540,00 €' }, differenza: -35.5,
          azioni: [{ etichetta: 'Accetta il loro importo', variante: 'sec', onClick: prova }, { etichetta: 'Contesta', variante: 'pericolo', onClick: prova }] }] },
        { titolo: 'Quadrano', variante: 'ok', chiuso: true, righe: [{ titolo: '<b>F-0901</b>', sinistra: { importo: 210, dett: '' }, destra: { importo: 210, dett: '' }, differenza: 0, quadra: true }] }] }) },
    { nome: 'Periodi', gruppo: 'Flussi', testo: 'Striscia di periodi (trimestri) con stato e barra di avanzamento per quello in corso.',
      firma: 'CRM.Periodi(host, [{ href, titolo, sotto, stato, attivo, futuro, avanzamento (0–100) }], etichetta)',
      demo: h => CRM.Periodi(h, [
        { href: '#/componenti', titolo: '1° trimestre', sotto: 'gennaio–marzo', stato: 'Liquidato' },
        { href: '#/componenti', titolo: '2° trimestre', sotto: 'aprile–giugno', stato: 'Liquidato' },
        { href: '#/componenti', titolo: '3° trimestre', sotto: 'luglio–settembre', stato: 'In corso', attivo: true, avanzamento: 72 },
        { href: '#/componenti', titolo: '4° trimestre', sotto: 'ottobre–dicembre', stato: 'Non iniziato', futuro: true }]) },
    { nome: 'Form', gruppo: 'Finestre', testo: 'Campi standard con etichetta, aiuto e messaggio d’errore. Restituisce i valori già ripuliti.',
      firma: 'CRM.Form(host, { campi: [{ nome, etichetta, tipo: testo|numero|data|select|area, opzioni, valore, aiuto, largo, passo, placeholder }], colonne }) → { el, valori(), campo(n), aiuto(n, html, errore), errore(t) }',
      demo: h => CRM.Form(h, { colonne: 2, campi: [{ nome: 'demo_codice', etichetta: 'Codice del fornitore', placeholder: 'es. GA-2271', aiuto: 'Come il fornitore chiama il cliente.' },
        { nome: 'demo_sconto', etichetta: 'Sconto %', tipo: 'select', opzioni: [{ value: 0, label: '0 %' }, { value: 5, label: '5 %' }] }, { nome: 'demo_data', etichetta: 'Valide dal', tipo: 'data', valore: M.oggi() }, { nome: 'demo_pct', etichetta: 'Percentuale', tipo: 'numero', passo: '0.5', valore: 10 }] }) },
    { nome: 'FormModal · Modale · Conferma · TestoDaInviare', gruppo: 'Finestre', testo: 'Finestre sopra la pagina. FormModal resta aperta se onConferma restituisce false (validazione). TestoDaInviare prepara solleciti e contestazioni da copiare.',
      firma: 'CRM.FormModal({ titolo, testo, campi, colonne, conferma, pericolo, azioniExtra, onConferma(valori, form) → false per restare })\nCRM.Modale({ titolo, testo, corpo, azioni: [{ etichetta, variante, onClick(chiudi, corpo) }] })\nCRM.Conferma(titolo, testo, etichetta, pericolo) → Promise<boolean>\nCRM.TestoDaInviare({ titolo, destinatario, testo, onCopia })\nCRM.Avviso(testo)',
      demo: h => {
        const b = CRM.blocco(h, '', 'display:flex;gap:8px;flex-wrap:wrap');
        const btn = (t, v, fn) => { const x = CRM.el('button', 'btn ' + v, e(t)); x.type = 'button'; x.addEventListener('click', fn); b.appendChild(x); };
        btn('FormModal', '', () => CRM.FormModal({ titolo: 'Contesta la riga F-0912', testo: 'Il motivo è obbligatorio.', conferma: 'Contesta', pericolo: true, campi: [{ nome: 'motivo', etichetta: 'Motivo', tipo: 'area' }],
          onConferma: (v, f) => { if (!v.motivo) { f.aiuto('motivo', 'Scrivi il motivo.', true); return false; } CRM.Avviso('Contestata: ' + v.motivo); } }));
        btn('Conferma', 'sec', () => CRM.Conferma('Chiudere il trimestre?', 'Gli importi vengono fissati.', 'Chiudi il trimestre').then(ok => CRM.Avviso(ok ? 'Confermato' : 'Annullato')));
        btn('TestoDaInviare', 'sec', () => CRM.TestoDaInviare({ titolo: 'Sollecito di conferma', destinatario: 'Gasper', testo: 'Gentili colleghi,\n\nnon abbiamo ancora ricevuto la conferma…' }));
        btn('Avviso', 'sec', () => CRM.Avviso('Operazione completata'));
      } },
    { nome: 'CampoRicerca · RicercaEntita', gruppo: 'Finestre', testo: 'Ogni campo collegato a un’entità (fornitore, cliente, subagente, codice cliente del fornitore, pratica, fattura o nota di credito): scrivendo compare un menu con le prime 5 corrispondenze (↑ ↓ Invio, Esc), in fondo il collegamento alla ricerca completa; la lente o F4 apre la maschera con filtri e DataTable. Il pallino è verde se il valore esiste in anagrafica, rosso se no. Le entità si definiscono una sola volta in entita.js.',
      firma: "CRM.Entita(nome, { titolo, voci(ctx), chiave(r), testo(r), dettaglio(r), cerca(r), colonne, filtri(ctx), filtra(r, valori) })\nCRM.Form(host, { campi: [{ nome, etichetta, tipo: 'ricerca', entita }], contesto() })\nCRM.campoRicercaHtml({ nome, entita, valore, campo, contesto }) + CRM.attivaRicerche(contenitore, contesto)\n→ eventi 'change' sul valore e 'ricerca-scelta' { campo, voce }\nCRM.RicercaEntita({ entita, contesto, testo, onScelta(voce) })",
      demo: h => { CRM.Form(h, { colonne: 2, campi: [{ nome: 'demo_cliente', etichetta: 'Cliente', tipo: 'ricerca', entita: 'cliente', placeholder: 'Ragione sociale o P.IVA' }, { nome: 'demo_fornitore', etichetta: 'Fornitore', tipo: 'ricerca', entita: 'fornitore', valore: 1 }] }); } },
    { nome: 'FinestraAffiancata', gruppo: 'Finestre', testo: 'Finestra a tutto schermo con due pannelli e divisore trascinabile (anche con le frecce). Usata da "Correggi i dati letti": documento a sinistra, dati da correggere a destra.',
      firma: 'CRM.FinestraAffiancata({ titolo, sottotitolo, sinistra(host), destra(host), piede(host), azioni: [{ etichetta, variante, onClick(chiudi) → false per restare }], larghezza })\n→ { chiudi, sinistra, destra, piede }',
      demo: h => { const b = CRM.el('button', 'btn sec', 'Apri la finestra affiancata'); b.type = 'button'; h.appendChild(b);
        b.addEventListener('click', () => CRM.FinestraAffiancata({ titolo: 'Finestra affiancata', sottotitolo: 'Trascina il divisore per cambiare le proporzioni.',
          sinistra: x => { x.innerHTML = '<div class="doc-pagina"><div class="doc-titolo">Documento</div><p>Contenuto di sinistra.</p></div>'; },
          destra: x => { CRM.Nota(x, 'Contenuto di destra: moduli, tabelle, riepiloghi.'); }, piede: x => { x.textContent = 'Informazioni nel piede'; },
          azioni: [{ etichetta: 'Chiudi', variante: 'sec' }] })); } },
    { nome: 'Pulsante con contatore', gruppo: 'Base', testo: 'Le azioni dei pannelli possono mostrare un contatore colorato (es. punti da controllare nella lettura).',
      firma: "CRM.Pannello(host, { azioni: [{ etichetta, conta, contaVariante: 'attesa'|'errore', contaTitolo }] })",
      demo: h => CRM.Pannello(h, { titolo: 'Documento letto', azioni: [{ etichetta: 'Correggi i dati letti', conta: 3, contaVariante: 'errore', onClick: prova }, { etichetta: 'Altro', conta: 1, onClick: prova }] }) },
    { nome: 'Pulsanti e icone', gruppo: 'Base', testo: 'Quattro varianti di pulsante (principale, secondario, pericolo, testo) in due misure; icone a tratto.',
      firma: '<button class="btn [sec|pericolo|testo] [piccolo]">\nCRM.icona(nome) → svg   ' + 'oggi arrivo pratiche bollettini liquidazioni fornitori subagenti abbinamenti componenti cerca spunta file scarica carica piu posta avviso',
      demo: h => { h.innerHTML = '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="btn">' + CRM.icona('spunta') + 'Principale</button><button class="btn sec">Secondario</button><button class="btn pericolo">Pericolo</button><button class="btn testo">Testo</button><button class="btn piccolo">Piccolo</button><button class="btn" disabled>Disabilitato</button></div>' +
        '<div style="display:flex;gap:14px;flex-wrap:wrap;color:var(--testo-intest)">' + 'oggi arrivo pratiche bollettini liquidazioni fornitori subagenti abbinamenti componenti cerca spunta file scarica carica piu posta avviso'.split(' ').map(n => '<span title="' + n + '">' + CRM.icona(n) + '</span>').join('') + '</div>'; } }
  ];

  CRM.rotta(/^\/componenti$/, function () {
    const corpo = CRM.Pagina({ voce: 'componenti', titolo: 'Componenti',
      sottotitolo: 'I componenti standard con cui sono composte tutte le viste: stessi nomi e parametri del primo prototipo, più quelli propri di questi flussi.' });
    const cat = CRM.blocco(corpo, 'catalogo');
    const indice = CRM.el('nav', 'catalogo-indice');
    indice.setAttribute('aria-label', 'Indice dei componenti');
    cat.appendChild(indice);
    const voci = CRM.blocco(cat, 'catalogo-voci');
    let gruppo = '';
    VOCI.forEach((v, i) => {
      if (v.gruppo !== gruppo) { gruppo = v.gruppo; indice.insertAdjacentHTML('beforeend', '<div class="gruppo-nome" style="color:var(--testo-tenue);padding:8px 8px 2px">' + e(gruppo) + '</div>'); }
      const a = CRM.el('a', '', e(v.nome)); a.href = '#/componenti'; a.addEventListener('click', ev => { ev.preventDefault(); document.getElementById('comp-' + i).scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      indice.appendChild(a);
      const p = CRM.Pannello(voci, { titolo: v.nome, nota: e(v.gruppo) });
      p.el.id = 'comp-' + i;
      CRM.Nota(p.corpo, e(v.testo)).style.marginBottom = '12px';
      const es = CRM.blocco(p.corpo, 'esempio' + (v.alto ? ' alto' : ''));
      v.demo(es);
      CRM.blocco(p.corpo, '').innerHTML = '<pre class="codice">' + e(v.firma) + '</pre>';
    });
  });
})();
