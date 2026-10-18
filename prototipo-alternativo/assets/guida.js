/* ============================================================
   Guida in linea (spec §7.17): contenuti per argomento.
   Ogni argomento: sintesi · flusso (passi in ordine) · pulsanti · finestre · da sapere.
   La pagina Guida (viste-gestione.js) li disegna; il pulsante "Guida" in testata di ogni
   pagina apre l'argomento con lo stesso id della voce di menu.
   Campi:
     id, titolo, gruppo, vai (indirizzo della pagina), sintesi (html),
     schema: 'ciclo' | 'stati' (disegno dedicato, facoltativo),
     flusso: [[titolo, testo]], pulsanti: [[nome, cosa fa]],
     finestre: [{ nome, da (dove si apre), cosa, campi: [[campo, note]], azioni: [[pulsante, effetto]] }],
     sapere: [testo]
   ============================================================ */
(function () {
  'use strict';
  CRM.GUIDA = [
    /* ---------------- Inizia qui ---------------- */
    { id: 'panoramica', titolo: 'Come funziona il CRM', gruppo: 'Inizia qui', vai: '#/', schema: 'ciclo',
      sintesi: 'Il CRM segue il lavoro di agenzia di Decobrands: i <b>documenti</b> dei fornitori costruiscono le <b>pratiche</b>, ogni mese i <b>bollettini</b> dicono quanto il fornitore riconosce, ogni trimestre si <b>liquidano</b> i subagenti. Il menu a sinistra segue questo ritmo: ogni giorno, ogni mese, ogni trimestre.',
      flusso: [
        ['Arriva un documento', 'Dalla casella email in automatico o trascinato in Documenti. Viene letto da solo.'],
        ['Controlli e abbini', 'Correggi i dati incerti; l’ordine apre una pratica, conferma e fattura si abbinano alla pratica giusta.'],
        ['La pratica avanza', 'Lo stato cambia da solo: attesa conferma → confermata → fatturata.'],
        ['Verifichi il bollettino', 'Ogni mese confronti quanto riconosce il fornitore con il calcolo del CRM, riga per riga.'],
        ['Liquidi il trimestre', 'Le provvigioni sbloccate vanno ai subagenti: esporti il prospetto e chiudi il trimestre.']
      ],
      sapere: [
        '<b>Oggi</b> è la pagina di partenza: raccoglie tutto quello che chiede un’azione.',
        'Clienti e fornitori arrivano da Integra in sola lettura; nel CRM si gestiscono condizioni, percentuali, agenzie e subagenti.',
        'Ogni modifica resta nel registro eventi con chi l’ha fatta e quando.'
      ] },
    { id: 'comandi', titolo: 'Comandi comuni', gruppo: 'Inizia qui', vai: '#/',
      sintesi: 'Gli stessi comandi valgono in tutte le pagine: impari una volta, li ritrovi ovunque.',
      pulsanti: [
        ['‹ Torna a …', 'In alto a sinistra: torna alla schermata precedente con filtri, ordinamento, pagina e scorrimento come li avevi lasciati. Anche Alt + ← o il tasto Indietro del browser.'],
        ['Carica documenti', 'Nella barra, da qualsiasi pagina: scegli o trascina PDF ed Excel; finiscono in Documenti.'],
        ['Guida', 'In alto a destra di ogni pagina: apre l’argomento di quella pagina.'],
        ['Segmenti (Tutti · Aperte · …)', 'Filtrano le righe della tabella sotto; il numero è quante righe restano.'],
        ['Riquadri numerici', 'Dove sono cliccabili fanno da filtro: un clic mostra solo quel gruppo, un secondo clic tutto.'],
        ['Schede', 'Contenuti diversi nello stesso spazio (es. Agenzie · Pratiche); il numero dice quanti elementi ci sono. Frecce ← → per passare da una all’altra.'],
        ['Intestazione di colonna', 'Clic: ordina crescente ▲, di nuovo decrescente ▼. L’ordinamento vale su tutto l’elenco, non solo sulla pagina.'],
        ['‹ 1 2 … ›', 'In fondo alle tabelle lunghe: cambia pagina. Le righe per pagina si fissano nelle Impostazioni.'],
        ['Campo con lente', 'Scrivi: compaiono le prime 5 corrispondenze (↑ ↓ Invio). La lente o F4 apre la ricerca completa. Pallino verde = trovato in anagrafica, rosso = non trovato.'],
        ['× / Esc', 'Chiudono la finestra in primo piano senza salvare.']
      ],
      sapere: [
        'Con il profilo <b>sola lettura</b> compare una fascia in alto: si consulta e si esporta, i pulsanti che modificano sono spenti.',
        '<b>Prova come</b> (in fondo alla barra, solo nel prototipo) cambia utente per vedere cosa vede ogni ruolo.'
      ] },

    /* ---------------- Lavoro ---------------- */
    { id: 'oggi', titolo: 'Oggi', gruppo: 'Lavoro', vai: '#/',
      sintesi: 'Cosa c’è da fare adesso, diviso per tipo di lavoro, più le scadenze dei prossimi giorni e l’andamento del trimestre.',
      flusso: [
        ['Guarda i riquadri', 'Conferme in ritardo, documenti in coda, bollettini, pagamenti dei clienti: quanti sono e quanto sono vecchi.'],
        ['Lavora per gruppo', 'Nella lista Da fare ogni gruppo si apre e chiude; le voci sono in ordine di urgenza.'],
        ['Agisci sulla voce', 'Il pulsante a destra porta dove si risolve: pratica, documento, bollettino.']
      ],
      pulsanti: [
        ['Riquadri in alto', 'Filtrano la lista Da fare su un solo gruppo; secondo clic per tornare a tutti.'],
        ['Prepara i solleciti', 'Gruppo conferme in ritardo: un testo per ogni fornitore con tutte le sue pratiche in ritardo. Gruppo pagamenti: un testo per ogni cliente con le fatture non pagate.'],
        ['Apri la coda', 'Gruppo documenti: va in Documenti.'],
        ['Apri bollettini', 'Gruppo bollettini: va alla matrice dei bollettini.'],
        ['Apri · Abbina · Verifica · Chiudi · Vedi', 'Sulla singola voce: apre la pagina dove si completa.'],
        ['Prossime scadenze · Ultime operazioni', 'Schede a destra: cosa scade nei prossimi 15 giorni, cosa è stato fatto di recente.'],
        ['Apri liquidazione', 'Riquadro del trimestre: va alla liquidazione del trimestre in corso.']
      ],
      finestre: [
        { nome: 'Solleciti di conferma', da: 'Prepara i solleciti (conferme)', cosa: 'Un testo pronto per ogni fornitore, in schede, con l’elenco delle pratiche in ritardo.',
          azioni: [['Copia il testo', 'Copia negli appunti e passa al fornitore successivo; il sollecito resta nel registro.'], ['Chiudi', 'Esce senza registrare altro.']] },
        { nome: 'Solleciti di pagamento', da: 'Prepara i solleciti · Prepara il sollecito al cliente · Sollecita il cliente', cosa: 'Un testo per ogni cliente con le fatture non pagate: numero, data, fornitore, importo, giorni, totale.', campi: [['Schede in alto', 'Una per cliente, con il numero di fatture; ✓ quando il testo è stato copiato.'], ['Testo', 'Modificabile prima di copiarlo.']], azioni: [['Copia il testo', 'Copia, registra il sollecito sulla fattura (quante volte, ultima data) e passa al cliente successivo.'], ['Chiudi', 'Esce.']] }
      ],
      sapere: ['<b>Pagamenti da sollecitare</b>: fatture che il cliente non ha pagato (stornate dal fornitore o segnalate) e, sul maturato, fatture non ancora riconosciute oltre i giorni d’incasso del fornitore.', 'Una conferma è in ritardo dopo i giorni di attesa fissati nelle condizioni del fornitore.', 'Il bollettino si sollecita solo dopo il giorno in cui il fornitore lo manda di solito.'] },

    { id: 'documenti', titolo: 'Documenti', gruppo: 'Lavoro', vai: '#/documenti',
      sintesi: 'L’unico ingresso di tutti i documenti dei fornitori: ordini, conferme, fatture, note di credito, bollettini. Ogni documento viene letto, controllato e mandato al posto giusto.',
      flusso: [
        ['Entra', 'Dalla casella email ogni pochi minuti, o trascinando i file nel riquadro a sinistra.'],
        ['Viene letto', 'Testata e righe con un’affidabilità per campo; controlli fissi (codice cliente, totale, doppioni).'],
        ['Controlli', 'Se ci sono punti incerti: Correggi i dati letti.'],
        ['Decidi', 'Ordine → apri la pratica; conferma, fattura, nota di credito → abbina; bollettino → registra.'],
        ['Esce dalla coda', 'La pratica o il bollettino si aggiornano; il documento resta consultabile lì.']
      ],
      pulsanti: [
        ['Trascina qui · Scegli i file', 'Carica PDF ed Excel.'],
        ['N scartati', 'In alto all’elenco: apre i documenti scartati.'],
        ['Correggi i dati letti', 'Apre la finestra di correzione; il numero sul pulsante sono i punti da controllare.'],
        ['Schede del documento', 'Prima l’azione proposta (Pratica proposta · Nuova pratica · Scegli la pratica · Cosa farne), poi Righe lette: il contatore dice quante righe sono incerte.'],
        ['Vedi le righe', 'Nell’avviso giallo: apre la scheda Righe lette con le righe incerte evidenziate.'],
        ['Abbina a …', 'Abbina il documento alla pratica proposta (codice cliente + articoli in comune).'],
        ['Apri la pratica', 'Per un ordine: crea la pratica nuova.'],
        ['Registra e verifica', 'Per un bollettino: lo registra e apre la verifica.'],
        ['Scarta il documento', 'Per doppioni o documenti che non riguardano Decobrands.']
      ],
      finestre: [
        { nome: 'Correggi i dati letti', da: 'Correggi i dati letti', cosa: 'A tutto schermo: a sinistra il documento com’è stampato, a destra testata e righe modificabili. In alto il riepilogo dei punti da controllare: un clic porta al campo.',
          campi: [['Campi bordati', 'Giallo = incerto, rosso = poco affidabile, con la percentuale.'], ['✓ accanto al campo', 'Conferma che il valore letto è giusto.'], ['Righe', 'Tabella modificabile; il codice articolo è un campo con ricerca.']],
          azioni: [['Aggiungi riga', 'Apre una piccola finestra: scegliendo un articolo noto propone descrizione e ultimo prezzo.'], ['Salva e ricalcola l’abbinamento', 'Salva le correzioni e rifà la proposta.'], ['Divisore centrale', 'Si trascina per allargare documento o dati.']] },
        { nome: 'Scartare il documento', da: 'Scarta il documento', cosa: 'Chiede il motivo prima di scartare.',
          campi: [['Motivo', 'Doppione · Non riguarda Decobrands · Documento illeggibile · Altro.'], ['Nota', 'Facoltativa.']],
          azioni: [['Scarta', 'Il documento va negli scartati e si può recuperare.']] },
        { nome: 'Lettura con affidabilità bassa', da: 'Abbina, con lettura poco sicura', cosa: 'Chiede conferma prima di abbinare un documento letto male.',
          azioni: [['Abbina comunque', 'Procede.'], ['Annulla', 'Torna indietro per correggere.']] }
      ],
      sapere: ['Le righe stanno nella seconda scheda perché qui si decide cosa fare del documento; se sono incerte, l’avviso e il contatore lo dicono subito.', '⚠ L’evidenziazione del valore nel documento è da verificare sui file reali: precisa su PDF da gestionale ed Excel, approssimata o assente sugli scansionati.'] },

    { id: 'pratiche', titolo: 'Pratiche', gruppo: 'Lavoro', vai: '#/pratiche', schema: 'stati',
      sintesi: 'Ogni ordine a fornitore è una pratica. Lo stato non si scrive a mano: si ricava dai documenti arrivati. La scheda della pratica ha il binario delle fasi e due schede: Riepilogo e Righe a confronto.',
      flusso: [
        ['Guarda il binario', 'Ordine → conferma → fattura → nota di credito, con la differenza di ogni fase rispetto alla precedente.'],
        ['Leggi il Riepilogo', 'Provvigione, incasso del cliente, documenti. Se le fasi cambiano delle righe, un avviso giallo lo dice in alto.'],
        ['Controlla le righe se serve', 'Scheda Righe a confronto: il numero rosso nel titolo dice quante righe cambiano.']
      ],
      pulsanti: [
        ['Segmenti di stato', 'Tutte · Conferma in ritardo · Attesa conferma · Attesa fattura · Fatturate · Con variazioni. Con questo filtro la pratica si apre direttamente sulle righe.'],
        ['Cerca', 'Per pratica, cliente o numero di documento.'],
        ['Clic sulla riga', 'Apre la scheda della pratica.'],
        ['Riepilogo · Righe a confronto', 'Le due schede della pratica; tornando indietro si riapre quella lasciata.'],
        ['Vedi le righe', 'Nell’avviso delle variazioni: apre la scheda Righe a confronto.'],
        ['Solo righe che cambiano · Tutte le righe', 'Nella scheda Righe: filtra il confronto.'],
        ['Carica un documento', 'Nella scheda: carica un documento già destinato a questa pratica.'],
        ['Consulta affiancati', 'Apre i documenti della pratica affiancati al confronto.'],
        ['Clic su documento o riga a confronto', 'Apre la stessa finestra su quel documento o su quella riga.'],
        ['Incasso del cliente', 'Riquadro della scheda: per ogni fattura pagata, non pagata, in attesa di incasso o da verificare.'],
        ['Sollecita il cliente · Segna come pagata · Segna come non pagata', 'Nel riquadro Incasso: sollecito al cliente, o segnalazione del fornitore ricevuta per email o telefono.']
      ],
      finestre: [
        { nome: 'Documenti della pratica', da: 'Consulta affiancati', cosa: 'A sinistra il documento (schede per ordine, conferma, fattura, nota di credito; ← → per scorrerli), a destra il confronto riga per riga con un altro documento.',
          campi: [['Confrontato con', 'Sceglie il documento di confronto.'], ['Solo righe che cambiano · Tutte', 'Filtra il confronto.']],
          azioni: [['Clic su una riga', 'La evidenzia nel documento a sinistra.'], ['Esc', 'Chiude.']] },
        { nome: 'Fattura non pagata', da: 'Segna come non pagata', cosa: 'Registra la segnalazione del fornitore che il cliente non ha pagato.', campi: [['Nota', 'Facoltativa, es. “email di Gasper del 12/09”.']], azioni: [['Segna come non pagata', 'La fattura va fra i pagamenti da sollecitare in Oggi.']] },
        { nome: 'Solleciti di pagamento', da: 'Prepara i solleciti · Prepara il sollecito al cliente · Sollecita il cliente', cosa: 'Un testo per ogni cliente con le fatture non pagate: numero, data, fornitore, importo, giorni, totale.', campi: [['Schede in alto', 'Una per cliente, con il numero di fatture; ✓ quando il testo è stato copiato.'], ['Testo', 'Modificabile prima di copiarlo.']], azioni: [['Copia il testo', 'Copia, registra il sollecito sulla fattura (quante volte, ultima data) e passa al cliente successivo.'], ['Chiudi', 'Esce.']] }
      ],
      sapere: ['Le righe contano soprattutto quando qualcosa non torna: per questo stanno nella seconda scheda, ma il contatore rosso e l’avviso nel Riepilogo non le lasciano passare inosservate.', 'Stati d’incasso: <b>Pagata</b> · <b>Non pagata</b> (stornata o segnalata) · <b>Incasso da verificare</b> (maturato, oltre i giorni d’incasso) · <b>In attesa di incasso</b> · <b>Nessuna segnalazione</b>. Vedi <a href="#/guida/incassi">Incassi dei clienti</a>.'] },

    { id: 'bollettini', titolo: 'Bollettini', gruppo: 'Lavoro', vai: '#/bollettini',
      sintesi: 'Ogni mese ogni fornitore comunica le provvigioni che riconosce. Il CRM le confronta con il proprio calcolo e mostra cosa quadra e cosa no.',
      flusso: [
        ['Arriva', 'Dal fornitore entro il giorno fissato nelle sue condizioni; si carica da Documenti o da qui.'],
        ['Si confronta', 'A cerniera: a sinistra il fornitore, a destra il nostro calcolo, al centro la differenza.'],
        ['Decidi le righe', 'Ogni riga che non quadra si accetta o si contesta; se manca un documento si attende il prossimo. Storni, riaccrediti e fatture non ancora pagate stanno nel gruppo Incassi dei clienti e non vanno decisi.'],
        ['Chiudi', 'Verificato o contestato. Per chi paga sul maturato si sbloccano le provvigioni dei subagenti.']
      ],
      pulsanti: [
        ['Carica un bollettino', 'In testata: carica il file del bollettino.'],
        ['apr 2026 → set 2026', 'Il periodo: sempre 6 mesi. Clic: a sinistra le scorciatoie (Ultimi 6 mesi, semestri), a destra l’anno e i mesi; scegli il mese d’inizio e il periodo si completa da solo (passando col mouse vedi quali mesi prende).'],
        ['‹ · ›', 'Spostano tutto il periodo di un mese.'],
        ['Fornitore', 'Mostra un solo fornitore.'],
        ['Tutti · Con qualcosa da fare', 'Solo i fornitori con un bollettino da decidere, pronto, contestato o non arrivato nel periodo.'],
        ['Cella della matrice', 'Fornitore × mese: verificato, da decidere, pronto, atteso, non arrivato. Clic apre il bollettino.'],
        ['Sollecita', 'Cella non arrivato: prepara il testo di sollecito con i documenti del mese.'],
        ['Accetta il loro importo', 'Sulla riga: accetti quanto dice il fornitore, con motivo.'],
        ['Contesta', 'Sulla riga: contesti, con motivo obbligatorio.'],
        ['Attendi il prossimo', 'Documento assente dal bollettino: lo aspetti nel mese successivo.'],
        ['Abbina il documento', 'Riga del fornitore senza documento nostro, ma il documento è in coda: va ad abbinarlo.'],
        ['Segna come verificato · Segna come contestato', 'Chiude il bollettino.'],
        ['Prepara la contestazione', 'Testo per il fornitore con le righe contestate e gli importi attesi.'],
        ['Prepara il sollecito al cliente', 'Su una riga di storno: testo per il cliente con le fatture non pagate.']
      ],
      finestre: [
        { nome: 'Accetta · Contesta · Attendi', da: 'pulsanti sulla riga', cosa: 'Registra la decisione sulla riga.', campi: [['Motivo', 'Obbligatorio per contestare.']], azioni: [['Conferma · Contesta', 'Salva la decisione; la riga passa fra le decise.']] },
        { nome: 'Sollecito · Contestazione', da: 'Sollecita · Prepara la contestazione', cosa: 'Testo pronto da inviare al fornitore.', azioni: [['Copia il testo', 'Copia negli appunti e lo annota nel registro.']] },
        { nome: 'Solleciti di pagamento', da: 'Prepara i solleciti · Prepara il sollecito al cliente · Sollecita il cliente', cosa: 'Un testo per ogni cliente con le fatture non pagate: numero, data, fornitore, importo, giorni, totale.', campi: [['Schede in alto', 'Una per cliente, con il numero di fatture; ✓ quando il testo è stato copiato.'], ['Testo', 'Modificabile prima di copiarlo.']], azioni: [['Copia il testo', 'Copia, registra il sollecito sulla fattura (quante volte, ultima data) e passa al cliente successivo.'], ['Chiudi', 'Esce.']] }
      ],
      sapere: ['Gruppo <b>Incassi dei clienti</b> in fondo al bollettino. Sul fatturato: <i>storno</i> (il cliente non ha pagato: fattura Non pagata) e <i>riaccredito</i> (ha pagato). Sul maturato: fatture del mese non ancora pagate, con i giorni dalla fattura (gialli oltre i giorni d’incasso), e fatture di mesi precedenti riconosciute ora che il cliente ha pagato.'] },

    { id: 'liquidazioni', titolo: 'Liquidazioni', gruppo: 'Lavoro', vai: '#/liquidazioni',
      sintesi: 'Le provvigioni ai subagenti per trimestre: cosa è liquidabile, cosa è ancora in attesa dei bollettini, il prospetto da inviare.',
      flusso: [
        ['Scegli il trimestre', 'Quattro riquadri fissi: liquidato, in corso, da liquidare, non iniziato.'],
        ['Guarda la Sintesi', 'Fatturato, provvigioni dai fornitori e ai subagenti, margine, con il confronto sul trimestre precedente; andamento dell’anno, fatturato per fornitore, provvigioni per subagente.'],
        ['Controlla il dettaglio', 'Scheda Subagenti e documenti: a sinistra i subagenti (clic = filtro; in rosso quanti storni hanno), a destra i documenti con stato liquidabile o in attesa, più le voci di storno e riaccredito.'],
        ['Esporta', 'Il prospetto per subagente in Excel, PDF o CSV.'],
        ['Chiudi il trimestre', 'A trimestre finito e senza documenti in attesa: gli importi si fissano.']
      ],
      pulsanti: [
        ['Riquadri dei trimestri', 'Cambiano trimestre.'],
        ['Sintesi · Subagenti e documenti', 'Le due schede: prima i numeri e i grafici, poi il dettaglio documento per documento.'],
        ['Grafici', 'Passando col mouse su una barra o una fetta si legge l’importo; clic su una voce della legenda la nasconde o la mostra.'],
        ['Riga del subagente', 'Filtra i documenti su quel subagente; secondo clic per tutti.'],
        ['vai ai bollettini', 'Se ci sono documenti in attesa: porta ai bollettini da verificare.'],
        ['Esporta in Excel', 'Apre la finestra di esportazione.'],
        ['Chiudi il trimestre', 'Fissa gli importi; chiede conferma.'],
        ['Voce Storno · Riaccredito', 'Fra i documenti: provvigione negativa o positiva su una fattura di un trimestre precedente; nell’esportazione compare come “Storno F-…”.']
      ],
      finestre: [
        { nome: 'Esporta la liquidazione', da: 'Esporta in Excel', cosa: 'Scegli cosa e in che formato.',
          campi: [['Cosa', 'Tutto il trimestre diviso per subagente (dettaglio e riepilogo) · Un solo subagente · Solo il riepilogo.'], ['Formato', 'Excel (.xlsx) · PDF identico all’Excel · CSV di soli dati.']],
          azioni: [['Scarica', 'Genera il file; l’esportazione resta nel registro.']] },
        { nome: 'Chiudere la liquidazione', da: 'Chiudi il trimestre', cosa: 'Conferma della chiusura.', azioni: [['Chiudi il trimestre', 'Gli importi non cambiano più.']] }
      ],
      sapere: ['La Sintesi mostra importi di competenza (compresi i documenti in attesa e gli storni), non quelli incassati. Margine = provvigioni dai fornitori − provvigioni ai subagenti.', 'Chi paga sul <b>fatturato</b> (es. Gasper, Ing’s): la provvigione entra nel trimestre della fattura. Se il cliente non paga, il fornitore la storna 1–2 mesi dopo e la riaccredita quando il cliente paga: al subagente lo storno arriva nella liquidazione successiva come <b>voce negativa</b> (il riaccredito come voce positiva).', 'Chi paga sul <b>maturato</b> (es. Gries): la provvigione arriva nel bollettino del mese in cui il cliente paga ed entra quando quel bollettino è verificato.'] },

    { id: 'incassi', titolo: 'Incassi dei clienti', gruppo: 'Lavoro', vai: '#/', schema: 'incassi',
      sintesi: 'Decobrands non incassa: incassa il fornitore. Se il cliente non paga, il fornitore sollecita Decobrands e Decobrands sollecita il cliente. Il CRM segue per ogni fattura se è stata pagata e aiuta a sollecitare.',
      flusso: [
        ['Il fornitore segnala', 'Con uno storno nel bollettino (fatturato) o non riconoscendo la fattura (maturato); oppure per email o telefono: Segna come non pagata nella pratica.'],
        ['Compare in Oggi', 'Gruppo Pagamenti da sollecitare: fatture non pagate e incassi da verificare, dal più vecchio.'],
        ['Solleciti il cliente', 'Prepara i solleciti: un testo per cliente; copiandolo il sollecito resta registrato sulla fattura.'],
        ['Il cliente paga', 'Riaccredito nel bollettino (fatturato) o riconoscimento nel mese del pagamento (maturato); oppure Segna come pagata.']
      ],
      pulsanti: [
        ['Pagamenti dei clienti', 'Riquadro in Oggi: quante fatture, quanti clienti, la più vecchia.'],
        ['Prepara i solleciti', 'Gruppo Pagamenti da sollecitare in Oggi.'],
        ['Prepara il sollecito al cliente', 'Su una riga di storno nel bollettino.'],
        ['Sollecita il cliente · Segna come pagata · Segna come non pagata', 'Riquadro Incasso del cliente nella pratica.'],
        ['Non pagate', 'Filtro nella scheda Pratiche del cliente.']
      ],
      finestre: [{ nome: 'Solleciti di pagamento', da: 'Prepara i solleciti · Prepara il sollecito al cliente · Sollecita il cliente', cosa: 'Un testo per ogni cliente con le fatture non pagate: numero, data, fornitore, importo, giorni, totale.', campi: [['Schede in alto', 'Una per cliente, con il numero di fatture; ✓ quando il testo è stato copiato.'], ['Testo', 'Modificabile prima di copiarlo.']], azioni: [['Copia il testo', 'Copia, registra il sollecito sulla fattura (quante volte, ultima data) e passa al cliente successivo.'], ['Chiudi', 'Esce.']] }],
      sapere: [
        '<b>Fatturato</b>: la provvigione arriva nel bollettino del mese della fattura; se il cliente non paga viene stornata 1–2 mesi dopo e riaccreditata quando paga.',
        '<b>Maturato</b>: la provvigione arriva solo nel bollettino del mese in cui il cliente paga; se non arriva entro i giorni d’incasso del fornitore (iniziale 60) l’incasso è da verificare.',
        '<b>Lo storno va alla liquidazione successiva</b>: per Decobrands nel bollettino del mese dopo, per il subagente nella liquidazione del trimestre dopo come voce negativa (anche se la provvigione era già stata liquidata). Il riaccredito allo stesso modo, come voce positiva.'
      ] },

    /* ---------------- Anagrafiche ---------------- */
    { id: 'fornitori', titolo: 'Fornitori', gruppo: 'Anagrafiche', vai: '#/fornitori',
      sintesi: 'Anagrafica da Integra in sola lettura; nel CRM si gestiscono le condizioni e le percentuali di provvigione per sconto, con la data da cui valgono.',
      pulsanti: [
        ['Riga del fornitore', 'Apre la scheda a destra.'],
        ['Modifica condizioni', 'Giorni di attesa della conferma, giorno del bollettino, pagamento sul maturato o sul fatturato, giorni per l’incasso dal cliente.'],
        ['Schede Percentuali · Clienti seguiti', 'Percentuali in vigore e versioni; clienti seguiti per quel fornitore (si modificano dal cliente).'],
        ['Nuove percentuali da una data', 'Inserisce una nuova versione delle percentuali.']
      ],
      finestre: [
        { nome: 'Condizioni del fornitore', da: 'Modifica condizioni', cosa: 'Regole che fanno scattare solleciti e liquidazioni.',
          campi: [['Giorni di attesa della conferma', 'Dopo, la pratica è in ritardo.'], ['Bollettino atteso entro il giorno', 'Del mese successivo (1–28); dopo, compare il sollecito.'], ['Pagamento provvigioni', 'Maturato o fatturato.'], ['Giorni per l’incasso dal cliente', 'Sul maturato: dopo questi giorni dalla fattura non ancora riconosciuta, l’incasso è da verificare (iniziale 60).']], azioni: [['Salva condizioni', 'Applica subito.']] },
        { nome: 'Nuove percentuali', da: 'Nuove percentuali da una data', cosa: 'Per ogni sconto: % a Decobrands e % al subagente.', campi: [['Valide dal', 'I documenti precedenti restano calcolati con le percentuali di allora.']], azioni: [['Salva', 'Crea la nuova versione.']] }
      ] },
    { id: 'subagenti', titolo: 'Subagenti', gruppo: 'Anagrafiche', vai: '#/subagenti',
      sintesi: 'Chi segue i clienti per conto di Decobrands. Non sono in Integra: si gestiscono per intero nel CRM.',
      pulsanti: [['Nuovo subagente', 'Nome, email, codice fiscale o P.IVA, telefono.'], ['Modifica', 'Cambia i dati.'], ['Rendi non attivo', 'Un subagente con clienti o provvigioni non si elimina: si disattiva.'], ['Vedi la liquidazione', 'Apre la liquidazione filtrata sul subagente.']],
      finestre: [{ nome: 'Subagente', da: 'Nuovo subagente · Modifica', cosa: 'Dati anagrafici.', azioni: [['Salva', 'Registra.'], ['Elimina', 'Solo se non ha clienti né provvigioni.']] }] },
    { id: 'clienti', titolo: 'Clienti', gruppo: 'Anagrafiche', vai: '#/clienti',
      sintesi: 'Anagrafica da Integra in sola lettura. Per ogni cliente le <b>agenzie</b>: i fornitori per cui Decobrands fa da agente, con codice cliente del fornitore, subagente e sconto.',
      pulsanti: [
        ['Segmenti', 'Tutti · Con agenzie · Senza agenzie · Diretta.'],
        ['Scheda Agenzie', 'Ricerca fra le agenzie; clic su una riga per modificarla; contatore giallo se manca un codice cliente.'],
        ['Aggiungi agenzia', 'Nuovo fornitore per questo cliente.'],
        ['Scheda Pratiche', 'Pratiche del cliente con filtro: Aperte · In ritardo · Fatturate · Non pagate · Tutte, fornitore, numero.']
      ],
      finestre: [{ nome: 'Agenzia', da: 'Aggiungi agenzia · clic su una riga', cosa: 'Il cliente è fisso.',
        campi: [['Fornitore', 'Campo con ricerca.'], ['Codice cliente del fornitore', 'Come il fornitore chiama il cliente: serve ad abbinare i documenti in automatico.'], ['Seguito da', 'Subagente, campo con ricerca.'], ['Sconto al cliente', 'Gli sconti proposti seguono le percentuali del fornitore.']],
        azioni: [['Aggiungi agenzia · Salva', 'Registra.'], ['Elimina', 'Con conferma: le pratiche con quel fornitore non generano più provvigioni.']] }],
      sapere: ['Un solo subagente per cliente e fornitore; il codice cliente è unico per fornitore.'] },

    /* ---------------- Vendita diretta (ampliamento) ---------------- */
    { id: 'ordini-cliente', titolo: 'Ordini cliente', gruppo: 'Vendita diretta', vai: '#/ordini-cliente',
      sintesi: 'Gli ordini dei clienti in vendita diretta, da controllare ed esportare per Integra.',
      flusso: [['Controlla', 'Pallino verde = articolo in Integra; disponibile per riga.'], ['Esporta', 'Alias, kit, file OC e/o OF.'], ['Impegna', 'Le quantità restano impegnate finché Integra non registra l’ordine.']],
      pulsanti: [['Esporta per Integra', 'Apre la finestra di esportazione.'], ['Esporta di nuovo', 'Rigenera i file senza nuovi impegni.'], ['Annulla esportazione', 'Rilascia gli impegni aperti.']],
      finestre: [{ nome: 'Esporta per Integra', da: 'Esporta per Integra', cosa: 'Riepilogo sempre visibile e tre schede.', campi: [['Codici vecchio → nuovo', 'Applica, quantità sul vecchio e sul nuovo, filtri.'], ['Kit', 'Sostituisce l’articolo esaurito con i componenti.'], ['File e controlli', 'OC, OF, problemi, avvisi, anteprima delle righe.']], azioni: [['Genera i file', 'Scarica i file e impegna le quantità.']] }] },
    { id: 'articoli', titolo: 'Articoli', gruppo: 'Vendita diretta', vai: '#/articoli', sintesi: 'Articoli da Integra in sola lettura, con disponibile, alias e kit.', pulsanti: [['Clic sulla riga', 'Apre le giacenze dell’articolo.']] },
    { id: 'giacenze', titolo: 'Giacenze', gruppo: 'Vendita diretta', vai: '#/giacenze', sintesi: 'Disponibile = giacenza di Integra meno le quantità esportate e non ancora registrate.', pulsanti: [['Riquadri', 'Esauriti · Negativi · Con impegni aperti.'], ['Clic sulla riga', 'Mostra gli impegni dell’articolo.']] },
    { id: 'alias-kit', titolo: 'Alias e kit', gruppo: 'Vendita diretta', vai: '#/alias-kit', sintesi: 'Regole usate all’esportazione: codice vecchio → nuovo e kit di componenti.', pulsanti: [['Nuovo alias · Nuovo kit', 'Solo amministratore.'], ['Chiede conferma', 'Il cambio compare all’esportazione per essere confermato.'], ['Spegni · Aggiungi componente', 'Nella scheda del kit.']] },

    /* ---------------- Gestione ---------------- */
    { id: 'utenti', titolo: 'Utenti e ruoli', gruppo: 'Gestione', vai: '#/utenti',
      sintesi: 'Gli utenti sono gli stessi della Gestione Ordini, con le stesse credenziali. Il ruolo decide cosa si può fare nel CRM.',
      pulsanti: [['Nuovo utente', 'Nome, nome utente, email, ruolo; parte l’email con la password temporanea.'], ['Modifica', 'Nome, email, ruolo.'], ['Invia nuova password', 'Password temporanea da cambiare al primo accesso.'], ['Disattiva · Riattiva', 'L’utente non entra più; i suoi dati restano.'], ['Elimina', 'Con conferma; se l’utente ha già usato l’app conviene disattivarlo, il suo nome resta nel registro.'], ['Schede Dati dell’utente · Cosa può fare ogni ruolo', 'Dettagli e tabella dei permessi.']],
      finestre: [{ nome: 'Utente', da: 'Nuovo utente · Modifica', cosa: 'Dati e ruolo.', campi: [['Ruolo', 'Amministratore · Operatore · Sola lettura.']], azioni: [['Salva', 'Registra.']] }, { nome: 'Inviare una nuova password', da: 'Invia nuova password', cosa: 'Conferma l’invio.', azioni: [['Invia', 'Manda l’email.']] }],
      sapere: ['Deve restare almeno un amministratore attivo; non puoi cambiare il tuo ruolo né disattivarti.'] },
    { id: 'sistema', titolo: 'Stato del sistema', gruppo: 'Gestione', vai: '#/sistema',
      sintesi: 'I servizi che lavorano da soli: casella dei documenti, server di lettura, sincronizzazione da Integra, posta in uscita.',
      pulsanti: [['Riquadri dei servizi', 'Funziona · Da tenere d’occhio · Problema; fanno da filtro.'], ['Segna come visto', 'Sul problema, dopo averlo letto.'], ['Segna tutti come visti', 'In testata.'], ['Controlla adesso', 'Rilegge subito la casella e verifica i servizi.']],
      sapere: ['I problemi da vedere hanno il contatore nella barra, sul gruppo Gestione.'] },
    { id: 'impostazioni', titolo: 'Impostazioni', gruppo: 'Gestione', vai: '#/impostazioni',
      sintesi: 'Parametri validi per tutti: dati dell’azienda, casella dei documenti, server di lettura e soglie, posta in uscita, sincronizzazione da Integra, conservazione dei dati.',
      pulsanti: [['Sezioni a sinistra', 'Una per area.'], ['Salva …', 'Salva la sezione.'], ['Prova la connessione', 'Verifica casella, server di lettura, posta o database di Integra.']],
      sapere: ['Le password non si rileggono: si sostituiscono.', 'Righe per pagina: quante righe mostrano le tabelle prima di andare a pagina successiva.'] },
    { id: 'scartati', titolo: 'Documenti scartati', gruppo: 'Gestione', vai: '#/scartati',
      sintesi: 'I documenti scartati restano per i giorni fissati nelle impostazioni, con motivo e autore.',
      pulsanti: [['Recupera', 'Rimette il documento fra quelli da controllare e lo apre.'], ['Elimina', 'Definitivo, solo amministratore, con conferma.']] }
  ];
})();
