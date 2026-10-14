/* ============================================================
   Viste "Ogni mese" e "Ogni trimestre": Bollettini, Bollettino, Liquidazioni
   Solo composizione di componenti CRM.*
   ============================================================ */
(function () {
  'use strict';
  const e = CRM.esc;
  const MESI_VISTA = [5, 6, 7, 8, 9];
  const ANNO = 2026;

  /* ---------- Bollettini: Matrice fornitore × mese ---------- */
  CRM.rotta(/^\/bollettini$/, function () {
    const corpo = CRM.Pagina({ voce: 'bollettini', titolo: 'Bollettini',
      sottotitolo: 'Ogni mese ogni fornitore ci comunica le provvigioni che ci riconosce. Qui vedi quali sono arrivati e quali vanno ancora verificati.',
      azioni: [{ etichetta: 'Carica un bollettino', icona: 'carica', onClick: () => CRM.scegliFile({ accetta: '.pdf,.xlsx,.xls,.csv', onFile: f => CRM.caricaDocumenti(f, 'bollettino') }) }] });
    const imp = b => M.euro(b.righe.reduce((s, r) => s + r.importo, 0));
    CRM.Matrice(corpo, {
      angolo: 'Fornitore',
      colonne: MESI_VISTA.map(m => M.mese(m, ANNO)),
      righe: M.S.fornitori.map(f => ({
        titolo: f.nome, sotto: 'paga sul ' + f.maturazione,
        celle: MESI_VISTA.map(m => {
          const c = M.casellaBollettino(f.id, ANNO, m);
          switch (c.tipo) {
            case 'verificato': return { href: '#/bollettini/' + c.b.id, stato: CRM.stato('ok', 'Verificato'), valore: imp(c.b) };
            case 'contestato': return { href: '#/bollettini/' + c.b.id, stato: CRM.stato('errore', 'Contestato'), valore: imp(c.b) };
            case 'da_verificare': return { href: '#/bollettini/' + c.b.id, stato: CRM.stato('attesa', c.aperte + (c.aperte === 1 ? ' riga da decidere' : ' righe da decidere')), valore: imp(c.b) };
            case 'pronto': return { href: '#/bollettini/' + c.b.id, stato: CRM.stato('primario', 'Pronto da chiudere'), valore: imp(c.b) };
            case 'mancante': return { stato: CRM.stato('errore', 'Non arrivato'), azione: { etichetta: 'Sollecita', onClick: () => sollecitoBollettino(f, m) } };
            case 'in_corso': return { vuota: 'Mese in corso' };
            default: return { vuota: 'Nessuna fattura' };
          }
        })
      }))
    });
    CRM.Nota(corpo, 'Un bollettino è atteso per ogni mese chiuso in cui il fornitore ci ha fatturato qualcosa. Le righe si confrontano con quanto calcoliamo dalle pratiche: le differenze vanno accettate o contestate prima di chiudere il bollettino.');
  });
  function sollecitoBollettino(f, m) {
    const docs = M.fiscaliDelMese(f.id, ANNO, m);
    CRM.TestoDaInviare({
      titolo: 'Sollecito bollettino · ' + f.breve + ' ' + M.meseMin(m), destinatario: f.nome,
      testo: 'Gentili colleghi di ' + f.nome + ',\n\nnon abbiamo ancora ricevuto il bollettino provvigioni di ' + M.meseMin(m) + ' ' + ANNO + '.\nCi risultano questi documenti del mese:\n' +
        docs.map(x => '- ' + x.doc.numero + ' del ' + M.data(x.doc.data) + ', ' + M.nomeCliente(x.pratica.cliente_piva) + ', ' + M.euro(M.importoDoc(x.doc))).join('\n') +
        '\n\nVi chiediamo di inviarcelo appena possibile.\n\nGrazie,\nDecobrands SRL',
      onCopia: () => { M.annota('Sollecito bollettino ' + M.meseMin(m) + ' preparato per ' + f.breve); M.salva(); }
    });
  }

  /* ---------- Bollettino: Cerniera + barra della decisione ---------- */
  CRM.rotta(/^\/bollettini\/(\d+)$/, function (id) {
    const b = M.bollettino(id);
    if (!b) { location.hash = '#/bollettini'; return; }
    const f = M.fornitore(b.fornitore_id);
    const r = M.riconcilia(b);
    const contestate = r.righe.filter(x => x.decisione && x.decisione.esito === 'contestato');
    const badge = b.stato === 'verificato' ? CRM.stato('ok', 'Verificato') : b.stato === 'contestato' ? CRM.stato('errore', 'Contestato') : r.aperte ? CRM.stato('attesa', 'Da verificare') : CRM.stato('primario', 'Pronto da chiudere');
    const corpo = CRM.Pagina({
      voce: 'bollettini', pieno: true, titolo: f.breve + ' · ' + M.mese(b.mese, b.anno), badge: badge,
      briciole: [{ etichetta: 'Bollettini', href: '#/bollettini' }, { etichetta: f.breve + ' ' + M.meseMin(b.mese) }],
      sottotitolo: 'Ricevuto il ' + M.data(b.ricevuto) + ' · ' + e(b.file) + ' · ' + e(f.breve) + ' paga sul ' + f.maturazione +
        (f.maturazione === 'maturato' ? ': verificando il bollettino si sbloccano le provvigioni dei subagenti su queste fatture.' : '.')
    });
    const CATEG = { differenza: 'importo diverso', mancante: 'manca nel bollettino', sconosciuta: 'non è fra le nostre pratiche' };
    const modificabile = b.stato === 'da_verificare';
    const riga = x => {
      const inArrivo = x.categoria === 'sconosciuta' && M.S.in_arrivo.find(d => d.numero === x.numero);
      let azioni = [], esito = '';
      if (modificabile && x.decisione) {
        esito = x.decisione.esito === 'contestato' ? CRM.stato('errore', 'Da contestare') : x.decisione.esito === 'attendere' ? CRM.stato('neutro', 'Al prossimo bollettino') : CRM.stato('ok', 'Accettata');
        azioni = [{ etichetta: 'Annulla', variante: 'testo', onClick: () => { delete b.decisioni[x.numero]; M.salva(); CRM.naviga(); } }];
      } else if (modificabile && x.categoria !== 'quadra') {
        azioni = [inArrivo ? { etichetta: 'Abbina il documento', href: '#/documenti/' + inArrivo.id }
          : x.categoria === 'mancante' ? { etichetta: 'Attendi il prossimo', variante: 'sec', onClick: () => decidi(b, x, 'attendere') }
          : { etichetta: 'Accetta il loro importo', variante: 'sec', onClick: () => decidi(b, x, 'accettato') },
          { etichetta: 'Contesta', variante: 'pericolo', onClick: () => decidi(b, x, 'contestato') }];
      }
      return {
        titolo: x.pratica ? '<a href="#/pratiche/' + x.pratica.id + '"><b>' + e(x.numero) + '</b></a>' : '<b>' + e(x.numero) + '</b>',
        dettagli: (x.cliente ? e(M.nomeCliente(x.cliente)) + ' · ' : '') + M.data(x.data) + (x.categoria !== 'quadra' ? ' · ' + CATEG[x.categoria] : '') +
          (x.nota_fornitore ? '<br><span style="color:var(--attesa-testo)">Nota del fornitore: ' + e(x.nota_fornitore) + '</span>' : '') +
          (x.decisione && x.decisione.motivo ? '<br>Motivo: ' + e(x.decisione.motivo) : ''),
        sinistra: x.loro ? { importo: x.loro.importo, dett: M.pct(x.loro.pct) + ' di ' + M.euro(x.loro.imponibile) } : null,
        destra: x.noi ? { importo: x.noi.importo, dett: M.pct(x.noi.pct) + ' di ' + M.euro(x.noi.imponibile) } : null,
        differenza: x.loro && x.noi ? M.r2(x.loro.importo - x.noi.importo) : x.loro ? x.loro.importo : -x.noi.importo,
        quadra: x.categoria === 'quadra', esito: esito, azioni: azioni
      };
    };
    const aperte = r.righe.filter(x => x.aperta), decise = r.righe.filter(x => x.decisione), quadrano = r.righe.filter(x => x.categoria === 'quadra' && !x.decisione);
    CRM.Cerniera(corpo, {
      sinistra: f.breve + ' riconosce', destra: 'Noi calcoliamo',
      totali: { sinistra: r.riconosciuto, destra: r.atteso, differenza: r.differenza },
      gruppi: [
        { titolo: 'Da decidere', variante: 'attesa', righe: aperte.map(riga) },
        { titolo: 'Decise', variante: 'neutro', righe: decise.map(riga) },
        { titolo: 'Quadrano', variante: 'ok', chiuso: aperte.length + decise.length > 0, righe: quadrano.map(riga) }
      ]
    });

    const barra = CRM.blocco(corpo, 'barra-decisione');
    if (!modificabile) {
      barra.innerHTML = '<span>' + (b.stato === 'verificato' ? 'Bollettino verificato. Le provvigioni riconosciute sono acquisite.' : 'Bollettino contestato: in attesa del bollettino rettificato da ' + e(f.breve) + '.') + '</span><button type="button" class="btn sec">Riapri la verifica</button>';
      CRM.$('button', barra).addEventListener('click', () => { b.stato = 'da_verificare'; M.annota('Bollettino ' + f.breve + ' ' + M.meseMin(b.mese) + ' riaperto'); M.salva(); CRM.naviga(); });
    } else if (r.aperte) {
      barra.innerHTML = '<span>' + r.aperte + (r.aperte === 1 ? ' riga da decidere' : ' righe da decidere') + ' prima di chiudere il bollettino.</span><button type="button" class="btn" disabled>Segna come verificato</button>';
    } else if (contestate.length) {
      barra.innerHTML = '<span>' + contestate.length + (contestate.length === 1 ? ' riga da contestare' : ' righe da contestare') + ' a ' + e(f.breve) + '.</span>' +
        '<span style="display:flex;gap:8px"><button type="button" class="btn sec" id="prep">Prepara la contestazione</button><button type="button" class="btn" id="contesta">Segna come contestato</button></span>';
      CRM.$('#prep', barra).addEventListener('click', () => contestazione(b, f, contestate));
      CRM.$('#contesta', barra).addEventListener('click', () => { b.stato = 'contestato'; M.annota('Bollettino ' + f.breve + ' ' + M.meseMin(b.mese) + ' contestato'); M.salva(); CRM.Avviso('Bollettino segnato come contestato'); CRM.naviga(); });
    } else {
      barra.innerHTML = '<span>Tutte le righe sono quadrate o decise.</span><button type="button" class="btn">Segna come verificato</button>';
      CRM.$('button', barra).addEventListener('click', () => {
        const prima = sbloccate(); b.stato = 'verificato'; const dopo = sbloccate();
        M.annota('Bollettino ' + f.breve + ' ' + M.meseMin(b.mese) + ' verificato'); M.salva();
        const sbl = M.r2(dopo - prima);
        CRM.Avviso('Bollettino verificato.' + (sbl ? ' Sbloccati ' + M.euro(sbl) + ' di provvigioni ai subagenti.' : ''));
        CRM.naviga();
      });
    }
  });
  function sbloccate() {
    let s = 0;
    [1, 2, 3, 4].forEach(t => M.righeLiquidazione(ANNO, t).forEach(x => { if (x.liquidabile) s += x.provvigione; }));
    return s;
  }
  function decidi(b, x, esito) {
    const f = M.fornitore(b.fornitore_id);
    const T = {
      accettato: ['Accetta l’importo di ' + f.breve, 'Registriamo ' + M.euro(x.loro ? x.loro.importo : 0) + ' come importo corretto. Al subagente resta la provvigione calcolata sull’imponibile.', 'Conferma'],
      contestato: ['Contesta la riga ' + x.numero, 'La riga finirà nella contestazione da inviare al fornitore.', 'Contesta'],
      attendere: ['Attendi il prossimo bollettino', 'Il documento non c’è in questo bollettino: lo aspettiamo nel prossimo.', 'Conferma']
    }[esito];
    CRM.FormModal({
      titolo: T[0], testo: T[1], conferma: T[2], pericolo: esito === 'contestato',
      campi: [{ nome: 'motivo', etichetta: 'Motivo', tipo: 'area', valore: esito === 'accettato' ? (x.nota_fornitore || '') : '',
        aiuto: esito === 'contestato' ? 'Obbligatorio: comparirà nel testo della contestazione.' : 'Facoltativo, resta nello storico.' }],
      onConferma: (v, form) => {
        if (esito === 'contestato' && !v.motivo) { form.aiuto('motivo', 'Scrivi il motivo: comparirà nel testo della contestazione.', true); return false; }
        b.decisioni[x.numero] = { esito: esito, motivo: v.motivo, importo: x.loro ? x.loro.importo : null };
        M.salva(); CRM.naviga();
      }
    });
  }
  function contestazione(b, f, righe) {
    CRM.TestoDaInviare({
      titolo: 'Contestazione · ' + f.breve + ' ' + M.meseMin(b.mese), destinatario: f.nome,
      testo: 'Gentili colleghi di ' + f.nome + ',\n\nabbiamo verificato il bollettino provvigioni di ' + M.meseMin(b.mese) + ' ' + b.anno + ' e vi segnaliamo:\n\n' +
        righe.map(x => '- ' + x.numero + (x.cliente ? ' (' + M.nomeCliente(x.cliente) + ')' : '') + ': ' +
          (x.categoria === 'mancante' ? 'documento non presente nel bollettino, provvigione attesa ' + M.euro(x.noi.importo) :
            x.categoria === 'sconosciuta' ? 'documento che non ci risulta, importo indicato ' + M.euro(x.loro.importo) :
              'indicati ' + M.euro(x.loro.importo) + ' (' + M.pct(x.loro.pct) + '), attesi ' + M.euro(x.noi.importo) + ' (' + M.pct(x.noi.pct) + ')') +
          (x.decisione.motivo ? '. ' + x.decisione.motivo : '')).join('\n') +
        '\n\nVi chiediamo di inviarci il bollettino rettificato.\n\nGrazie,\nDecobrands SRL'
    });
  }

  /* ---------- Liquidazioni: Periodi + KpiRow (filtro per subagente) + DataTable ---------- */
  let subSel = null;
  CRM.rotta(/^\/liquidazioni$/, () => { location.hash = '#/liquidazioni/' + ANNO + '/' + M.trimestre(M.oggi()); });
  CRM.rotta(/^\/liquidazioni\/(\d{4})\/([1-4])$/, function (aS, tS) {
    const a = Number(aS), t = Number(tS);
    const st = M.statoTrimestre(a, t);
    const righe = M.righeLiquidazione(a, t);
    const inAttesa = righe.filter(r => !r.liquidabile), liquidabili = righe.filter(r => r.liquidabile);
    const puoChiudere = st.chiave === 'da_liquidare' && !inAttesa.length;
    const perche = st.chiave === 'chiusa' ? 'Trimestre già liquidato' : st.chiave === 'futura' ? 'Il trimestre non è iniziato' :
      st.chiave === 'in_corso' ? 'Il trimestre si chiude il ' + M.data(M.limiti(a, t).a) : inAttesa.length ? 'Ci sono documenti in attesa dei bollettini' : '';
    const totLiq = liquidabili.reduce((s, r) => s + r.provvigione, 0);
    const corpo = CRM.Pagina({
      voce: 'liquidazioni', titolo: 'Liquidazioni', pieno: true,
      sottotitolo: 'Provvigioni ai subagenti per trimestre: gennaio–marzo, aprile–giugno, luglio–settembre, ottobre–dicembre.',
      azioni: [
        { etichetta: 'Scarica i prospetti', icona: 'scarica', variante: 'sec', disabilitato: !liquidabili.length, onClick: () => scarica(a, t, liquidabili) },
        { etichetta: st.chiave === 'chiusa' ? 'Liquidazione chiusa' : 'Chiudi il trimestre', icona: 'spunta', disabilitato: !puoChiudere, titolo: perche, onClick: async () => {
          if (!(await CRM.Conferma('Chiudere la liquidazione del ' + t + '° trimestre?', 'Gli importi vengono fissati: ' + M.euro(totLiq) + ' a ' + new Set(liquidabili.map(r => r.subagente_id)).size + ' subagenti.', 'Chiudi il trimestre'))) return;
          M.chiudiTrimestre(a, t); M.salva(); CRM.Avviso('Liquidazione del ' + t + '° trimestre chiusa'); CRM.naviga();
        } }
      ]
    });
    CRM.Periodi(corpo, [1, 2, 3, 4].map(q => {
      const s = M.statoTrimestre(a, q), lim = M.limiti(a, q);
      return { href: '#/liquidazioni/' + a + '/' + q, titolo: q + '° trimestre', sotto: M.nomeTrimestre(q), stato: s.etichetta, attivo: q === t, futuro: s.chiave === 'futura',
        avanzamento: s.chiave === 'in_corso' ? Math.round(100 * M.giorni(lim.da, M.oggi()) / M.giorni(lim.da, lim.a)) : null };
    }), 'Trimestri ' + a);
    if (st.chiave === 'futura') {
      CRM.Pannello(corpo, {}).corpo.innerHTML = '<div class="vuoto"><b>Trimestre non ancora iniziato</b>Le provvigioni compariranno qui con le prime fatture di ' + M.nomeTrimestre(t).split('–')[0] + '.</div>';
      return;
    }
    CRM.KpiRow(corpo, M.S.subagenti.map(s => {
      const rr = righe.filter(x => x.subagente_id === s.id);
      const liq = rr.filter(x => x.liquidabile).reduce((x, r) => x + r.provvigione, 0);
      const att = rr.filter(x => !x.liquidabile).reduce((x, r) => x + r.provvigione, 0);
      return { id: String(s.id), etichetta: s.nome, valore: liq, variante: att ? 'attesa' : 'ok',
        dettagli: [{ testo: (st.chiave === 'chiusa' ? 'liquidati' : 'da liquidare') + ' · ' + rr.length + (rr.length === 1 ? ' documento' : ' documenti') }].concat(att ? [{ testo: M.euro(att) + ' in attesa del bollettino', variante: 'attesa' }] : []) };
    }), { selezionata: subSel, onSeleziona: id => { subSel = id; CRM.$('h2', pan.el).textContent = titolo(); tab.aggiorna(filtra()); } });

    const filtra = () => subSel ? righe.filter(x => String(x.subagente_id) === subSel) : righe;
    const titolo = () => subSel ? 'Documenti di ' + M.subagente(Number(subSel)).nome : 'Tutti i documenti del trimestre';
    const pan = CRM.Pannello(corpo, { titolo: titolo(), riempi: true, senzaMargine: true,
      nota: 'Totale da liquidare <b>' + M.euro(totLiq) + '</b>' + (inAttesa.length ? ' · ' + inAttesa.length + ' documenti in attesa · <a href="#/bollettini">vai ai bollettini</a>' : '') });
    const tab = CRM.DataTable(pan.corpo, {
      colonne: [
        { key: 'numero', header: 'Documento', valore: r => r.doc.numero, cell: r => '<a href="#/pratiche/' + r.pratica.id + '">' + e(r.doc.numero) + '</a><span class="sec-riga">' + e(r.fornitore.breve) + ' · ' + M.data(r.doc.data) + '</span>' },
        { key: 'cliente', header: 'Cliente', grow: true, valore: r => M.nomeCliente(r.cliente), cell: r => e(M.nomeCliente(r.cliente)) + '<span class="sec-riga">codice ' + e(r.codice_cliente) + '</span>' },
        { key: 'sub', header: 'Subagente', valore: r => M.subagente(r.subagente_id).nome },
        { key: 'importo', header: 'Imponibile', tipo: 'euro' },
        { key: 'pct', header: 'Provvigione %', tipo: 'pct', cell: r => M.pct(r.pct) + (r.eccezione ? '<span class="sec-riga">eccezione</span>' : '') },
        { key: 'provvigione', header: 'Provvigione', tipo: 'euro', totale: 'somma', cell: r => '<b class="' + CRM.classeSegno(Math.min(0, r.provvigione)) + '">' + M.euro(r.provvigione) + '</b>' },
        { key: 'stato', header: 'Stato', grow: true, sortValue: r => r.liquidabile ? 1 : 0,
          cell: r => r.liquidabile ? CRM.stato('ok', st.chiave === 'chiusa' ? 'Liquidata' : 'Liquidabile') : CRM.stato('attesa', 'In attesa') + '<span class="sec-riga">' + e(r.motivo) + '</span>' }
      ],
      righe: filtra(), ordinamentoIniziale: { key: 'stato', dir: 'asc' }, etichettaTotale: 'Totale in elenco, compresi i documenti in attesa',
      piede: 'Entrano fatture e note di credito con data nel trimestre. Gasper e Ing’s pagano sul fatturato; Gries sul maturato: le sue fatture entrano quando il bollettino che le riconosce è verificato.',
      emptyText: 'Nessun documento', emptyHint: 'Nessuna fattura o nota di credito con data in questo trimestre.'
    });
  });
  function scarica(a, t, righe) {
    M.S.subagenti.forEach(s => {
      const rr = righe.filter(r => r.subagente_id === s.id);
      if (rr.length) CRM.scarica('liquidazione_' + a + '_T' + t + '_' + s.nome.replace(/\s+/g, '_') + '.csv', M.csvLiquidazione(rr));
    });
    CRM.Avviso('Prospetti scaricati: uno per subagente, con gli 8 campi concordati');
  }
})();
