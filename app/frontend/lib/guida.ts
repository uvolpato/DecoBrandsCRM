// Guida in linea (§7.17): i contenuti per argomento, copiati dal prototipo ufficiale
// (prototipo-alternativo/assets/guida.js), con gli indirizzi delle pagine dell'app. Gli argomenti
// della Vendita diretta non ci sono (D-08, ampliamento spento). La pagina Guida li disegna
// (app/(app)/guida); i testi si aggiornano nella stessa attività che cambia una pagina (§16.5).
// sintesi, pulsanti, finestre e sapere contengono HTML: si mostrano con dangerouslySetInnerHTML.
// flusso/pulsanti: [titolo o nome, testo]; finestre: campi e azioni sono [campo o pulsante, note].

export type Gruppo = 'Inizia qui' | 'Lavoro' | 'Anagrafiche' | 'Gestione';

export interface Finestra {
  nome: string;
  da: string; // da dove si apre
  cosa: string;
  campi?: string[][];
  azioni?: string[][];
}

export interface Argomento {
  id: string;
  titolo: string;
  gruppo: Gruppo;
  vai: string; // la pagina dell'app (per "Apri la pagina")
  sintesi: string;
  schema?: 'ciclo' | 'stati' | 'incassi';
  flusso?: string[][];
  pulsanti?: string[][];
  finestre?: Finestra[];
  sapere?: string[];
  modifica?: string; // chi può modificare (dalla tabella dei permessi, §8.3)
}

export const GUIDA: Argomento[] = [
  { id: 'panoramica', titolo: 'Come funziona il CRM', gruppo: 'Inizia qui', vai: '/', schema: 'ciclo',
    sintesi: 'Il CRM segue il lavoro di agenzia di Decobrands: i <b>documenti</b> dei fornitori costruiscono le <b>pratiche</b>, ogni mese i <b>bollettini</b> dicono quanto il fornitore riconosce, ogni trimestre si <b>liquidano</b> i subagenti. Il menu a sinistra segue questo ritmo: ogni giorno, ogni mese, ogni trimestre.',
    flusso: [
      ['Arriva un documento', 'Dalla casella email in automatico o trascinato in Documenti. Viene letto da solo.'],
      ['Controlli e abbini', 'Correggi i dati incerti; l’ordine apre una pratica, conferma e fattura si abbinano alla pratica giusta.'],
      ['La pratica avanza', 'Lo stato cambia da solo: attesa conferma → confermata → fatturata.'],
      ['Verifichi il bollettino', 'Ogni mese confronti quanto riconosce il fornitore con il calcolo del CRM, riga per riga.'],
      ['Liquidi il trimestre', 'Le provvigioni sbloccate vanno ai subagenti: esporti il prospetto e chiudi il trimestre.'],
    ],
    sapere: [
      '<b>Oggi</b> è la pagina di partenza: raccoglie tutto quello che chiede un’azione.',
      'Clienti e fornitori arrivano da Integra in sola lettura; nel CRM si gestiscono condizioni, percentuali, agenzie e subagenti.',
      'Ogni modifica resta nel registro eventi con chi l’ha fatta e quando.',
    ],
  },
  { id: 'comandi', titolo: 'Comandi comuni', gruppo: 'Inizia qui', vai: '/',
    sintesi: 'Gli stessi comandi valgono in tutte le pagine: impari una volta, li ritrovi ovunque.',
    pulsanti: [
      ['‹ Torna a …', 'In alto a destra, accanto a Guida: torna alla schermata precedente con filtri, ordinamento, pagina e scorrimento come li avevi lasciati. Anche Alt + ← o il tasto Indietro del browser.'],
      ['Numeri del menu', 'Accanto a Oggi, Documenti, Pratiche e Bollettini dicono quante cose ci sono da fare; giallo = urgente. Sono contati dal server.'],
      ['Carica documenti', 'Nella barra, da qualsiasi pagina: scegli o trascina PDF ed Excel; finiscono in Documenti.'],
      ['Guida', 'In alto a destra di ogni pagina: apre l’argomento di quella pagina.'],
      ['Segmenti (Tutti · Aperte · …)', 'Filtrano le righe della tabella sotto; il numero dice quante righe resterebbero, tenendo conto degli altri filtri. Si aggiorna subito, senza ricaricare la pagina.'],
      ['Tutti i fornitori · clienti · subagenti', 'I filtri sulle anagrafiche sono tutti uguali: clic nel campo, in alto le voci già scelte (clic per toglierle), sotto le altre (scrivi per restringere, clic o Invio per aggiungere). Il filtro si applica quando chiudi il menu (Esc o clic fuori). Il campo mostra il nome o “Filtro multiplo (n)”. Più voci nello stesso campo = una o l’altra; campi diversi = tutte insieme.'],
      ['Imbuto · Imbuto barrato', 'In fondo alla barra dei filtri: l’imbuto (con il numero dei filtri attivi) apre il riepilogo di tutti i filtri, ognuno con × per toglierlo; l’imbuto barrato li toglie tutti.'],
      ['Riquadri numerici', 'Dove sono cliccabili fanno da filtro: un clic mostra solo quel gruppo, un secondo clic tutto.'],
      ['Schede', 'Contenuti diversi nello stesso spazio (es. Agenzie · Pratiche); il numero dice quanti elementi ci sono. Frecce ← → per passare da una all’altra.'],
      ['Intestazione di colonna', 'Clic: ordina crescente ▲, di nuovo decrescente ▼. L’ordinamento vale su tutto l’elenco, non solo sulla pagina.'],
      ['‹ 1 2 … ›', 'In fondo alle tabelle lunghe: cambia pagina. Le righe per pagina si fissano nelle Impostazioni.'],
      ['Menu dell’utente', 'In fondo alla barra, clic sul tuo nome: cambia area (Provvigioni, Dati, Gestione), Cambia la password, Guida, Esci.'],
      ['Campo con lente', 'Scrivi: compaiono le prime 5 corrispondenze (↑ ↓ Invio). La lente o F4 apre la ricerca completa. Pallino verde = trovato in anagrafica, rosso = non trovato.'],
      ['× / Esc', 'Chiudono la finestra in primo piano senza salvare.'],
    ],
    sapere: [
      'I numeri (segmenti, riquadri, contatori della barra) seguono i filtri senza ricaricare la pagina. Nell’applicazione, se altri o i servizi cambiano i dati, i contatori si aggiornano da soli; le tabelle no: compare “Ci sono aggiornamenti · Aggiorna”, così le righe non si spostano mentre lavori.',
      'Con il profilo <b>sola lettura</b> compare una fascia in alto: si consulta e si esporta, i pulsanti che modificano sono spenti.',
    ],
  },
  { id: 'oggi', titolo: 'Oggi', gruppo: 'Lavoro', vai: '/',
    sintesi: 'Cosa c’è da fare adesso, diviso per tipo di lavoro, più le scadenze dei prossimi giorni e l’andamento del trimestre.',
    flusso: [
      ['Guarda i riquadri', 'Conferme in ritardo, documenti in coda, bollettini, pagamenti dei clienti: quanti sono e quanto sono vecchi.'],
      ['Lavora per gruppo', 'Nella lista Da fare ogni gruppo si apre e chiude; le voci sono in ordine di urgenza.'],
      ['Agisci sulla voce', 'Il pulsante a destra porta dove si risolve: pratica, documento, bollettino.'],
    ],
    pulsanti: [
      ['Riquadri in alto', 'Filtrano la lista Da fare su un solo gruppo; secondo clic per tornare a tutti.'],
      ['Prepara i solleciti', 'Gruppo conferme in ritardo: un testo per ogni fornitore con tutte le sue pratiche in ritardo. Gruppo pagamenti: un testo per ogni cliente con le fatture non pagate.'],
      ['Apri la coda', 'Gruppo documenti: va in Documenti.'],
      ['Apri bollettini', 'Gruppo bollettini: va alla matrice dei bollettini.'],
      ['Apri · Abbina · Verifica · Chiudi · Vedi', 'Sulla singola voce: apre la pagina dove si completa.'],
      ['Prossime scadenze · Ultime operazioni', 'Schede a destra: cosa scade nei prossimi 15 giorni, cosa è stato fatto di recente.'],
      ['Apri liquidazione', 'Riquadro del trimestre: va alla liquidazione del trimestre in corso.'],
    ],
    finestre: [
      { nome: 'Solleciti di conferma', da: 'Prepara i solleciti (conferme)', cosa: 'Un testo pronto per ogni fornitore, in schede, con l’elenco delle pratiche in ritardo.',
        azioni: [
          ['Copia il testo', 'Copia negli appunti e passa al fornitore successivo; resta nel registro (export.sollecito).'],
          ['Chiudi', 'Esce senza registrare altro.'],
        ] },
      { nome: 'Solleciti di pagamento', da: 'Prepara i solleciti · Prepara il sollecito al cliente · Sollecita il cliente', cosa: 'Un testo per ogni cliente con le fatture non pagate: numero, data, fornitore, importo, giorni, totale.',
        campi: [
          ['Schede in alto', 'Una per cliente, con il numero di fatture; ✓ quando il testo è stato copiato.'],
          ['Testo', 'Modificabile prima di copiarlo.'],
        ],
        azioni: [
          ['Copia il testo', 'Copia, registra il sollecito sulla fattura (quante volte, ultima data) e passa al cliente successivo.'],
          ['Chiudi', 'Esce.'],
        ] }
    ],
    sapere: [
      '<b>Pagamenti da sollecitare</b>: fatture che il cliente non ha pagato (stornate dal fornitore o segnalate) e, sul maturato, fatture non ancora riconosciute oltre i giorni d’incasso del fornitore.',
      'Una conferma è in ritardo dopo i giorni di attesa fissati nelle condizioni del fornitore.',
      'Il bollettino si sollecita solo dopo il giorno in cui il fornitore lo manda di solito.',
    ],
    modifica: 'Operatore o superiore nell’area Provvigioni.',
  },
  { id: 'documenti', titolo: 'Documenti', gruppo: 'Lavoro', vai: '/documenti',
    sintesi: 'L’unico ingresso di tutti i documenti dei fornitori: ordini, conferme, fatture, note di credito, bollettini. Ogni documento viene letto, controllato e mandato al posto giusto.',
    flusso: [
      ['Entra', 'Dalla casella email in automatico (il ritmo si fissa in Impostazioni → Casella dei documenti) o trascinando i file nel riquadro in alto. Solo PDF e foto (JPEG, PNG): gli Excel e i messaggi di Outlook si rifiutano (D-60).'],
      ['Viene letto', 'Testata e righe con un’affidabilità per campo; controlli fissi (codice cliente, totale, doppioni).'],
      ['Controlli', 'Se ci sono punti incerti: Correggi i dati letti. Accanto a un campo incerto il ✓ conferma il valore senza cambiarlo: il campo diventa verde e non conta più.'],
      ['Decidi', 'Ordine → apri la pratica; conferma, fattura, nota di credito → abbina; bollettino → registra.'],
      ['Esce dalla coda', 'La pratica o il bollettino si aggiornano; il documento resta consultabile lì.'],
    ],
    pulsanti: [
      ['Trascina qui i documenti · Scegli i file', 'Carica PDF e foto; la lettura parte da sola.'],
      ['Da controllare', 'A sinistra i documenti da controllare, con fornitore, importo e livello; clic su un documento per vederlo a destra senza cambiare pagina.'],
      ['Correggi i dati letti', 'Apre la finestra di correzione; il numero sul pulsante sono i punti da controllare.'],
      ['Schede del documento', 'Prima l’azione proposta (Pratica proposta · Nuova pratica · Scegli la pratica · Cosa farne), poi Righe lette: il contatore dice quante righe sono incerte.'],
      ['Vedi le righe', 'Nell’avviso giallo: apre la scheda Righe lette con le righe incerte evidenziate.'],
      ['Abbina a …', 'Abbina il documento alla pratica proposta (codice cliente + articoli in comune).'],
      ['Apri la pratica', 'Per un ordine: crea la pratica nuova, con cliente e fornitore.'],
      ['Registra e verifica', 'Per un bollettino: lo registra e apre la verifica.'],
      ['Scarta il documento', 'Per doppioni o documenti che non riguardano Decobrands.'],
    ],
    finestre: [
      { nome: 'Correggi i dati letti', da: 'Correggi i dati letti', cosa: 'A tutto schermo: a sinistra il documento originale (PDF o foto), a destra testata e righe modificabili. Il PDF si apre alla pagina del campo scelto. Sotto gli 860 px i due lati si impilano.',
        campi: [
          ['Campi bordati', 'Giallo = incerto, rosso = poco affidabile, con la percentuale; verde quando il valore è confermato. Il ✓ accanto al campo conferma il valore letto senza cambiarlo.'],
          ['Posizione', 'Sotto il documento: pagina e precisione (esatta, approssimata, assente) del campo scelto.'],
          ['Righe', 'Tabella modificabile: aggiungi una riga vuota, correggi i valori, elimina con ✕.'],
        ],
        azioni: [
          ['Salva e ricalcola l’abbinamento', 'Salva le correzioni, rifà controlli e proposta e dice quanti punti restano.'],
          ['Annulla', 'Chiude senza salvare.'],
        ] },
      { nome: 'Scartare il documento', da: 'Scarta il documento', cosa: 'Chiede il motivo prima di scartare.',
        campi: [
          ['Motivo', 'Doppione · Non riguarda Decobrands · Documento illeggibile · Altro.'],
          ['Nota', 'Facoltativa.'],
        ],
        azioni: [
          ['Scarta', 'Il documento va negli scartati e si può recuperare.'],
        ] },
      { nome: 'Lettura con affidabilità bassa', da: 'Abbina, Apri la pratica, Registra e verifica, con lettura poco sicura', cosa: 'Chiede conferma prima di usare un documento letto male.',
        azioni: [
          ['Procedi comunque', 'Procede.'],
          ['Annulla', 'Torna indietro per correggere.'],
        ] }
    ],
    sapere: [
      'Le righe stanno nella seconda scheda perché qui si decide cosa fare del documento; se sono incerte, l’avviso e il contatore lo dicono subito.',
      '⚠ L’evidenziazione del valore nel documento è da verificare sui file reali (D-06, prova F0-A7): il rettangolo sul valore non si disegna ancora. La finestra apre il PDF alla pagina del campo e dice quanto è precisa la posizione; sui documenti scansionati o fotografati può mancare.',
      'Gli Excel dei bollettini non entrano da qui: il canale comune accetta solo PDF e foto (D-60).',
    ],
    modifica: 'Operatore o superiore nell’area Provvigioni.',
  },
  { id: 'pratiche', titolo: 'Pratiche', gruppo: 'Lavoro', vai: '/pratiche', schema: 'stati',
    sintesi: 'Ogni ordine a fornitore è una pratica. Lo stato non si scrive a mano: si ricava dai documenti arrivati. La scheda della pratica ha il binario delle fasi e due schede: Riepilogo e Righe a confronto.',
    flusso: [
      ['Guarda il binario', 'Ordine → conferma → fattura → nota di credito, con la differenza di ogni fase rispetto alla precedente.'],
      ['Leggi il Riepilogo', 'Provvigione, incasso del cliente, documenti. Se le fasi cambiano delle righe, un avviso giallo lo dice in alto.'],
      ['Controlla le righe se serve', 'Scheda Righe a confronto: il numero rosso nel titolo dice quante righe cambiano.'],
    ],
    pulsanti: [
      ['Segmenti di stato', 'Tutte · Conferma in ritardo · Attesa conferma · Attesa fattura · Fatturate · Con variazioni. Con questo filtro la pratica si apre direttamente sulle righe. Nella lista una variazione mostra anche lo scostamento in euro.'],
      ['Tutti i fornitori · clienti · subagenti', 'Filtri standard a selezione multipla; i numeri dei segmenti si ricalcolano subito. Imbuto per il riepilogo, imbuto barrato per toglierli tutti.'],
      ['Cerca', 'Per pratica, cliente o numero di documento.'],
      ['Clic sulla riga', 'Apre la scheda della pratica.'],
      ['Riepilogo · Righe a confronto', 'Le due schede della pratica; tornando indietro si riapre quella lasciata.'],
      ['Vedi le righe', 'Nell’avviso delle variazioni: apre la scheda Righe a confronto.'],
      ['Solo righe che cambiano · Tutte le righe', 'Nella scheda Righe: filtra il confronto.'],
      ['Registra fattura · Nota di credito', 'Nella card Documenti fiscali: registra il documento quando arriva dal fornitore, con il PDF facoltativo. La nota di credito sceglie la fattura da stornare.'],
      ['Correggi · Annulla', 'Su una riga della card: correggi numero, data, importo o note, oppure annulla il documento (se ha un file, torna fra i documenti da controllare).'],
      ['Registra un documento', 'Nella card Documenti: ordine, conferma, proforma, pagamento o allegato. Restano fuori dal netto e dalla provvigione.'],
      ['Sposta', 'Su una riga di una delle due card: porta il documento, con righe e file, in un’altra pratica dello stesso fornitore.'],
      ['Pagamento del cliente', 'Riquadro in alto a destra quando c’è un documento di pagamento: il segno Pagato, senza effetto sulla provvigione.'],
      ['Carica un documento', 'Nella scheda: carica un documento già destinato a questa pratica.'],
      ['Consulta affiancati', 'Apre i documenti della pratica affiancati al confronto.'],
      ['Clic su documento o riga a confronto', 'Apre la stessa finestra su quel documento o su quella riga.'],
      ['Incasso del cliente', 'Riquadro della scheda: per ogni fattura pagata, non pagata, in attesa di incasso o da verificare.'],
      ['Sollecita il cliente · Segna come pagata · Segna come non pagata', 'Nel riquadro Incasso: sollecito al cliente, o segnalazione del fornitore ricevuta per email o telefono.'],
    ],
    finestre: [
      { nome: 'Documenti della pratica', da: 'Consulta affiancati · clic su un documento o su una riga a confronto', cosa: 'A sinistra il documento (schede per ordine, conferma, fattura, nota di credito; ← → per scorrerli), a destra i dati e il confronto riga per riga con un altro documento. Se il file originale non c’è, a sinistra c’è l’anteprima costruita dai dati. Con una nota di credito si vedono solo le righe stornate e la differenza è l’importo stornato.',
        campi: [
          ['Confrontato con', 'Sceglie il documento di confronto.'],
          ['Solo righe che cambiano · Tutte', 'Filtra il confronto.'],
        ],
        azioni: [
          ['Clic su una riga', 'La seleziona nella tabella; nel PDF il rettangolo sul valore non si disegna ancora (D-06).'],
          ['Esc', 'Chiude.'],
        ] },
      { nome: 'Registra la fattura', da: 'Registra fattura', cosa: 'Registra la fattura del fornitore sulla pratica; da lì la pratica passa a Fatturata e il netto si aggiorna.',
        campi: [
          ['Numero', 'Come sul documento; non può ripetersi per lo stesso fornitore.'],
          ['Data', 'La data della fattura.'],
          ['Importo', 'Il lordo della fattura.'],
          ['Note', 'Facoltative.'],
          ['PDF', 'Facoltativo: il file si carica prima e resta in coda se la registrazione non va.'],
        ],
        azioni: [
          ['Registra', 'Salva il documento; numero doppio o file non in coda: il messaggio del server compare nella finestra.'],
        ] },
      { nome: 'Registra la nota di credito', da: 'Nota di credito', cosa: 'Storna tutto o in parte una fattura della pratica.',
        campi: [
          ['Fattura stornata', 'La fattura da stornare, con quello che ne resta.'],
          ['Importo', 'Positivo; non può superare quello che resta della fattura.'],
          ['Storna tutta la fattura', 'L’importo lo calcola il server su quello che resta.'],
          ['PDF', 'Facoltativo, come per la fattura.'],
        ],
        azioni: [
          ['Registra', 'Salva la nota con importo negativo; oltre il residuo il server rifiuta e la finestra resta aperta.'],
        ] },
      { nome: 'Registra un documento', da: 'Registra un documento', cosa: 'Registra ordine, conferma, proforma, pagamento o allegato sulla pratica.',
        campi: [
          ['Tipo di documento', 'Ordine, conferma, proforma, pagamento o altro.'],
          ['Numero', 'Obbligatorio per l’ordine; per gli altri facoltativo.'],
          ['Data', 'Quella del documento; di oggi se non la cambi.'],
          ['Importo', 'Facoltativo: non tocca il netto né la provvigione.'],
          ['Note · PDF o foto', 'Facoltativi; per il pagamento va bene la foto.'],
        ],
        azioni: [
          ['Registra', 'Salva il documento; per un numero d’ordine già usato dal fornitore il server rifiuta e il motivo compare nella finestra.'],
        ] },
      { nome: 'Sposta in un’altra pratica', da: 'Sposta', cosa: 'Porta il documento, con le sue righe e il suo file, in un’altra pratica dello stesso fornitore.',
        campi: [
          ['Pratica di arrivo', 'Campo di ricerca: solo le pratiche dello stesso fornitore.'],
        ],
        azioni: [
          ['Sposta', 'Se il documento è liquidato, in un bollettino, legato a una nota di credito o è l’unico ordine della pratica, il server rifiuta e il motivo compare nella finestra.'],
        ] },
      { nome: 'Fattura non pagata', da: 'Segna come non pagata', cosa: 'Registra la segnalazione del fornitore che il cliente non ha pagato.',
        campi: [
          ['Nota', 'Facoltativa, es. “email di Gasper del 12/09”.'],
        ],
        azioni: [
          ['Segna come non pagata', 'La fattura va fra i pagamenti da sollecitare in Oggi.'],
        ] },
      { nome: 'Solleciti di pagamento', da: 'Prepara i solleciti · Prepara il sollecito al cliente · Sollecita il cliente', cosa: 'Un testo per ogni cliente con le fatture non pagate: numero, data, fornitore, importo, giorni, totale.',
        campi: [
          ['Schede in alto', 'Una per cliente, con il numero di fatture; ✓ quando il testo è stato copiato.'],
          ['Testo', 'Modificabile prima di copiarlo.'],
        ],
        azioni: [
          ['Copia il testo', 'Copia, registra il sollecito sulla fattura (quante volte, ultima data) e passa al cliente successivo.'],
          ['Chiudi', 'Esce.'],
        ] }
    ],
    sapere: [
      'Le righe contano soprattutto quando qualcosa non torna: per questo stanno nella seconda scheda, ma il contatore rosso e l’avviso nel Riepilogo non le lasciano passare inosservate.',
      'La nota di credito non può superare quello che resta della fattura: il server rifiuta e la finestra resta aperta per correggere l’importo.',
      'Un documento che è in un bollettino non si cambia (importo, numero, data): si corregge con una nota di credito.',
      'Ordini, conferme, proforma, pagamenti e allegati sono solo tracciati: il netto e la provvigione restano su fatture e note di credito. Il segno <b>Pagato</b> arriva da un documento di pagamento.',
      '<b>Più ordini, conferme e fatture.</b> In una pratica possono esserci <b>più ordini</b> (il primo la apre, gli altri si sommano) e <b>più conferme o proforme</b>, facoltative: una delle due porta a <b>Confermata</b>. Anche le <b>fatture</b> possono essere più di una — un ordine fatturato in due tranche, o una fattura che copre più ordini — e lo stesso numero non si ripete. «Una fattura al mese» vale solo per i clienti con sconto o agenzia e riguarda il calcolo della provvigione, non quante fatture si possono registrare.',
      'Numero e data valgono per tutte le pratiche della stessa fattura (una fattura su più ordini): correggendoli si aggiornano tutte.',
      'Stati d’incasso: <b>Pagata</b> · <b>Non pagata</b> (stornata o segnalata) · <b>Incasso da verificare</b> (maturato, oltre i giorni d’incasso) · <b>In attesa di incasso</b> · <b>Nessuna segnalazione</b>. Vedi <a href="/guida/incassi">Incassi dei clienti</a>.',
    ],
    modifica: 'Operatore o superiore nell’area Provvigioni.',
  },
  { id: 'bollettini', titolo: 'Bollettini', gruppo: 'Lavoro', vai: '/bollettini',
    sintesi: 'Ogni mese ogni fornitore comunica le provvigioni che riconosce. Il CRM le confronta con il proprio calcolo e mostra cosa quadra e cosa no.',
    flusso: [
      ['Arriva', 'Dal fornitore entro il giorno fissato nelle sue condizioni; si carica da Documenti o da qui.'],
      ['Si confronta', 'A cerniera: a sinistra il fornitore, a destra il nostro calcolo, al centro la differenza.'],
      ['Decidi le righe', 'Ogni riga che non quadra si accetta o si contesta; se manca un documento si attende il prossimo. Storni, riaccrediti e fatture non ancora pagate stanno nel gruppo Incassi dei clienti e non vanno decisi.'],
      ['Chiudi', 'Verificato o contestato. Per chi paga sul maturato si sbloccano le provvigioni dei subagenti.'],
    ],
    pulsanti: [
      ['Carica un bollettino', 'In testata: scegli fornitore, mese e anno e allega il PDF. Un solo bollettino per fornitore e mese: il secondo viene rifiutato.'],
      ['apr 2026 → set 2026', 'Il periodo: sempre 6 mesi. Clic: a sinistra le scorciatoie (Ultimi 6 mesi, semestri), a destra l’anno e i mesi; scegli il mese d’inizio e il periodo si completa da solo (passando col mouse vedi quali mesi prende).'],
      ['‹ · ›', 'Spostano tutto il periodo di un mese.'],
      ['Tutti i fornitori', 'Filtro standard: uno o più fornitori. I numeri di Tutti · Con qualcosa da fare contano solo i fornitori scelti.'],
      ['Imbuto · Imbuto barrato', 'Riepilogo dei filtri (con il periodo) · togli tutti i filtri.'],
      ['Tutti · Con qualcosa da fare', 'Solo i fornitori con un bollettino arrivato da verificare, contestato o non arrivato nel periodo.'],
      ['Cella della matrice', 'Fornitore × mese: verificato, arrivato, contestato, atteso, non arrivato, mese in corso. Clic su una cella con il bollettino: si apre il dettaglio.'],
      ['Sollecita', 'Cella non arrivato: apre il testo del sollecito con i documenti del mese e i loro importi; Copia il testo lo copia e lo registra.'],
      ['Accetta il loro importo', 'Sulla riga: accetti quanto dice il fornitore, con motivo.'],
      ['Contesta', 'Sulla riga: contesti, con motivo obbligatorio.'],
      ['Attendi il prossimo', 'Documento assente dal bollettino: lo aspetti nel mese successivo.'],
      ['Abbina il documento', 'Riga del fornitore che non corrisponde: scegli il documento del fornitore, anche di un altro mese, cercandolo per numero o cliente. Quelli già su un bollettino lo dicono ma si possono scegliere; il server rifiuta se il documento è già su un\'altra riga dello stesso tipo.'],
      ['Vai alla prima', 'Con righe da decidere: porta alla prima riga di Da decidere e la evidenzia un attimo.'],
      ['Segna come verificato · Segna come contestato', 'Chiude il bollettino: chiede conferma, il mese diventa chiuso e la pagina resta in sola lettura. Con righe aperte resta spento e la barra dice quante ne mancano.'],
      ['Prepara la contestazione', 'Con almeno una riga contestata: oggetto e testo composti dal server, modificabili, da copiare o scaricare in .txt. Nessuna email parte dal CRM.'],
      ['Prepara il sollecito al cliente', 'Su una riga di storno: testo per il cliente con le fatture non pagate.'],
      ['PDF del bollettino', 'Se il fornitore l’ha mandato, sta a sinistra della cerniera; sul tablet va sopra.'],
    ],
    finestre: [
      { nome: 'Accetta · Contesta · Attendi', da: 'pulsanti sulla riga', cosa: 'Registra la decisione sulla riga.',
        campi: [
          ['Motivo', 'Obbligatorio per contestare.'],
        ],
        azioni: [
          ['Conferma · Contesta', 'Salva la decisione; la riga passa fra le decise.'],
        ] },
      { nome: 'Sollecito · Contestazione', da: 'Sollecita · Prepara la contestazione', cosa: 'Testo pronto da inviare al fornitore: oggetto e testo modificabili (le modifiche non si salvano).',
        azioni: [
          ['Copia', 'Copia il testo negli appunti.'],
          ['Scarica .txt', 'Scarica il testo come file di testo.'],
        ] },
      { nome: 'Solleciti di pagamento', da: 'Prepara i solleciti · Prepara il sollecito al cliente · Sollecita il cliente', cosa: 'Un testo per ogni cliente con le fatture non pagate: numero, data, fornitore, importo, giorni, totale.',
        campi: [
          ['Schede in alto', 'Una per cliente, con il numero di fatture; ✓ quando il testo è stato copiato.'],
          ['Testo', 'Modificabile prima di copiarlo.'],
        ],
        azioni: [
          ['Copia il testo', 'Copia, registra il sollecito sulla fattura (quante volte, ultima data) e passa al cliente successivo.'],
          ['Chiudi', 'Esce.'],
        ] }
    ],
    sapere: [
      'Gruppo <b>Incassi dei clienti</b> in fondo al bollettino. Sul fatturato: <i>storno</i> (il cliente non ha pagato: fattura Non pagata) e <i>riaccredito</i> (ha pagato). Sul maturato: fatture del mese non ancora pagate, con i giorni dalla fattura (gialli oltre i giorni d’incasso), e fatture di mesi precedenti riconosciute ora che il cliente ha pagato.',
      'Contestare una riga vuole il motivo: comparirà nel testo della contestazione. Se il fornitore non ha scritto un documento del mese, <i>Attendi il prossimo</i> vale finché manca: abbinando una riga a quel documento l’attesa si toglie da sola.',
      'La chiusura (<i>Segna come verificato</i> o <i>Segna come contestato</i>) è attiva quando tutte le righe quadrano o sono decise. Chiede conferma e chiude il mese: da lì percentuali e documenti di quel mese non si cambiano più e la pagina resta in sola lettura. Anche una contestazione chiude il mese.',
    ],
    modifica: 'Operatore o superiore nell’area Provvigioni.',
  },
  { id: 'liquidazioni', titolo: 'Liquidazioni', gruppo: 'Lavoro', vai: '/liquidazioni',
    sintesi: 'Le provvigioni ai subagenti per trimestre: cosa è liquidabile, cosa è ancora in attesa dei bollettini, il prospetto da inviare.',
    flusso: [
      ['Scegli il trimestre', 'Quattro riquadri fissi: liquidato, in corso, da liquidare, non iniziato.'],
      ['Controlla i documenti', 'A sinistra i subagenti (clic = filtro; in rosso quanti storni hanno); a destra la scheda Documenti con stato liquidabile o in attesa, più le voci di storno e riaccredito.'],
      ['Guarda il Report subagenti', 'Nella scheda accanto: per ogni subagente fatturato, provvigione, margine Decobrands e variazione sul trimestre prima; scegliendo un subagente a sinistra, i suoi numeri, i suoi trimestri e i clienti principali.'],
      ['Esporta', 'Il prospetto per subagente in Excel, PDF o CSV.'],
      ['Chiudi il trimestre', 'A trimestre finito e senza documenti in attesa: gli importi si fissano.'],
    ],
    pulsanti: [
      ['Riquadri dei trimestri', 'Cambiano trimestre.'],
      ['Documenti · Report subagenti', 'Le due schede del pannello di destra: il dettaglio per controllare, il report per capire come va ogni subagente.'],
      ['Analisi completa', 'Apre la pagina Analisi sul trimestre, filtrata sul subagente scelto.'],
      ['Grafici', 'Passando col mouse su una barra si legge l’importo; clic su una voce della legenda la nasconde o la mostra.'],
      ['Riga del subagente', 'Filtra documenti e report su quel subagente; secondo clic per tutti.'],
      ['vai ai bollettini', 'Se ci sono documenti in attesa: porta ai bollettini da verificare.'],
      ['Esporta', 'Apre la finestra: tutto il trimestre, un solo subagente o solo il riepilogo; Excel, PDF o CSV.'],
      ['Chiudi il trimestre', 'Fissa gli importi; chiede conferma.'],
      ['Voce Storno · Riaccredito', 'Fra i documenti: provvigione negativa o positiva su una fattura di un trimestre precedente; nell’esportazione compare come “Storno F-…”.'],
      ['Correggi · Cambia la correzione', 'Sotto la provvigione di un documento: cambia solo quanto va al subagente su quel documento, con un motivo.'],
    ],
    finestre: [
      { nome: 'Esporta la liquidazione', da: 'Esporta', cosa: 'Scegli cosa e in che formato.',
        campi: [
          ['Cosa', 'Tutto il trimestre diviso per subagente (dettaglio e riepilogo) · Un solo subagente · Solo il riepilogo.'],
          ['Formato', 'Excel (.xlsx) · PDF identico all’Excel · CSV di soli dati.'],
        ],
        azioni: [
          ['Scarica', 'Genera il file; l’esportazione resta nel registro.'],
        ] },
      { nome: 'Chiudere la liquidazione', da: 'Chiudi il trimestre', cosa: 'Conferma della chiusura.',
        azioni: [
          ['Chiudi il trimestre', 'Gli importi non cambiano più.'],
        ] },
      { nome: 'Provvigione del subagente su un documento', da: 'Correggi · Cambia la correzione', cosa: 'Cliente, fornitore, imponibile e provvigione di adesso.',
        campi: [
          ['Provvigione al subagente', 'Altra percentuale · Importo fisso · Nessuna provvigione.'],
          ['Percentuale o importo', '% da 0 a 100 o euro; vuoto per Nessuna.'],
          ['Motivo', 'Obbligatorio: compare nel prospetto e nel registro.'],
        ],
        azioni: [
          ['Salva la correzione', 'Vince su ogni altra regola per quel documento.'],
          ['Togli la correzione', 'Con conferma: torna la regola normale.'],
        ] }
    ],
    sapere: [
      'Il Report subagenti usa i numeri del trimestre di liquidazione (compresi i documenti in attesa e gli storni), non quelli incassati. Margine = provvigioni dai fornitori − provvigioni ai subagenti. Per altri periodi e filtri c’è la pagina <b>Analisi</b>; l’esportazione di questo trimestre è nel pulsante <b>Esporta</b>.',
      'Chi paga sul <b>fatturato</b> (es. Gasper, Ing’s): la provvigione entra nel trimestre della fattura. Se il cliente non paga, il fornitore la storna 1–2 mesi dopo e la riaccredita quando il cliente paga: al subagente lo storno arriva nella liquidazione successiva come <b>voce negativa</b> (il riaccredito come voce positiva).',
      'Chi paga sul <b>maturato</b> (es. Gries): la provvigione arriva nel bollettino del mese in cui il cliente paga ed entra quando quel bollettino è verificato.',
    ],
    modifica: 'Operatore o superiore nell’area Provvigioni; chiudere il trimestre è per il responsabile.',
  },
  { id: 'analisi', titolo: 'Analisi', gruppo: 'Lavoro', vai: '/analisi',
    sintesi: 'Quanto fatturano i clienti, quanto riconoscono i fornitori, quanto va ai subagenti e quanto resta a Decobrands: per periodo, fornitore, subagente e cliente, con il confronto sul periodo prima.',
    flusso: [
      ['Scegli il periodo', '3, 6 o 12 mesi; il mese d’inizio dal selettore a mesi, ‹ › per spostarlo di un mese.'],
      ['Filtra', 'Campi Fornitore, Subagente, Cliente: puoi scegliere più voci in ognuno; oppure un clic su una fetta, una barra o una riga.'],
      ['Leggi', '4 numeri con la variazione sul periodo precedente, l’andamento mese per mese, i pesi di fornitori, subagenti e clienti.'],
      ['Approfondisci', 'Tabella Dettaglio per subagente, fornitore, cliente, mese o documento per documento.'],
      ['Esporta', 'Excel con i fogli, PDF o CSV, con gli stessi filtri.'],
    ],
    pulsanti: [
      ['Periodo · ‹ ›', 'Sceglie il mese d’inizio o sposta il periodo di un mese.'],
      ['3 mesi · 6 mesi · 12 mesi', 'Durata del periodo; finisce nello stesso mese di prima.'],
      ['Tutti i fornitori · subagenti · clienti', 'Clic nel campo: si apre il menu con in alto le voci già scelte (✓, clic per toglierle, “Togli tutti”) e sotto le altre; scrivi per restringere, clic o Invio per aggiungere. Il menu resta aperto: il filtro si applica quando lo chiudi (Esc o clic fuori). Il campo mostra il nome della voce scelta o “Filtro multiplo (n)”. Propongono solo le voci con documenti nel periodo.'],
      ['Imbuto', 'Riepilogo di tutti i filtri, periodo compreso, con il numero delle voci scelte; × su una voce per toglierla.'],
      ['Imbuto barrato', 'Toglie tutti i filtri.'],
      ['Lente (F4)', 'Apre la ricerca completa con le caselle: spunta più righe, “Scegli tutte le righe filtrate”, poi Applica.'],
      ['Clic su un grafico', 'Aggiunge fornitore, subagente o cliente al filtro; di nuovo per toglierlo. Il grafico continua a mostrare tutte le voci, con le scelte in risalto.'],
      ['Per subagente · Per fornitore · Per cliente · Per mese · Documenti', 'Raggruppamento della tabella; clic su una riga = aggiunge la voce al filtro.'],
      ['Esporta', 'Apre la finestra di esportazione.'],
    ],
    finestre: [
      { nome: 'Cerca fornitore · subagente · cliente', da: 'Lente del campo (F4)', cosa: 'Ricerca completa a selezione multipla.',
        campi: [
          ['Cerca e filtri', 'Restringono le righe.'],
          ['Caselle', 'Clic sulla riga per spuntarla o toglierla; “Scegli tutte le righe filtrate” · “Togli tutte”.'],
        ],
        azioni: [
          ['Applica (n)', 'Le righe spuntate diventano le voci del filtro; nessuna = tutti.'],
        ] },
      { nome: 'Esporta l’analisi', da: 'Esporta', cosa: 'Periodo e filtri attivi sono quelli della pagina.',
        campi: [
          ['Formato', 'Excel: riepilogo, un foglio per subagente, fornitore, cliente e mese, l’elenco dei documenti · PDF con lo stesso contenuto · CSV con i soli documenti.'],
        ],
        azioni: [
          ['Scarica', 'Genera il file.'],
        ] }
    ],
    sapere: [
      'Gli importi sono per <b>data del documento</b> (competenza): fatture e note di credito abbinate alle pratiche, anche se non ancora riconosciute nei bollettini. Non cambiano quando arriva un bollettino.',
      'Gli storni per mancato pagamento non cambiano questi numeri: spostano solo il momento in cui la provvigione è pagata (vedi Liquidazioni).',
      'Dai fornitori = imponibile × % che il fornitore riconosce a Decobrands; ai subagenti = imponibile × % del subagente; margine = differenza.',
      'Più voci nello stesso campo valgono in “o” (Gries o Gasper); campi diversi in “e” (fornitore e cliente).',
    ],
    modifica: 'Si consulta ed esporta con qualunque livello nell’area Provvigioni.',
  },
  { id: 'incassi', titolo: 'Incassi dei clienti', gruppo: 'Lavoro', vai: '/', schema: 'incassi',
    sintesi: 'Decobrands non incassa: incassa il fornitore. Se il cliente non paga, il fornitore sollecita Decobrands e Decobrands sollecita il cliente. Il CRM segue per ogni fattura se è stata pagata e aiuta a sollecitare.',
    flusso: [
      ['Il fornitore segnala', 'Con uno storno nel bollettino (fatturato) o non riconoscendo la fattura (maturato); oppure per email o telefono: Segna come non pagata nella pratica.'],
      ['Compare in Oggi', 'Gruppo Pagamenti da sollecitare: fatture non pagate e incassi da verificare, dal più vecchio.'],
      ['Solleciti il cliente', 'Prepara i solleciti: un testo per cliente; copiandolo il sollecito resta registrato sulla fattura.'],
      ['Il cliente paga', 'Riaccredito nel bollettino (fatturato) o riconoscimento nel mese del pagamento (maturato); oppure Segna come pagata.'],
    ],
    pulsanti: [
      ['Pagamenti dei clienti', 'Riquadro in Oggi: quante fatture, quanti clienti, la più vecchia.'],
      ['Prepara i solleciti', 'Gruppo Pagamenti da sollecitare in Oggi.'],
      ['Prepara il sollecito al cliente', 'Su una riga di storno nel bollettino.'],
      ['Sollecita il cliente · Segna come pagata · Segna come non pagata', 'Riquadro Incasso del cliente nella pratica.'],
      ['Non pagate', 'Filtro nella scheda Pratiche del cliente.'],
    ],
    finestre: [
      { nome: 'Solleciti di pagamento', da: 'Prepara i solleciti · Prepara il sollecito al cliente · Sollecita il cliente', cosa: 'Un testo per ogni cliente con le fatture non pagate: numero, data, fornitore, importo, giorni, totale.',
        campi: [
          ['Schede in alto', 'Una per cliente, con il numero di fatture; ✓ quando il testo è stato copiato.'],
          ['Testo', 'Modificabile prima di copiarlo.'],
        ],
        azioni: [
          ['Copia il testo', 'Copia, registra il sollecito sulla fattura (quante volte, ultima data) e passa al cliente successivo.'],
          ['Chiudi', 'Esce.'],
        ] }
    ],
    sapere: [
      '<b>Fatturato</b>: la provvigione arriva nel bollettino del mese della fattura; se il cliente non paga viene stornata 1–2 mesi dopo e riaccreditata quando paga.',
      '<b>Maturato</b>: la provvigione arriva solo nel bollettino del mese in cui il cliente paga; se non arriva entro i giorni d’incasso del fornitore (iniziale 60) l’incasso è da verificare.',
      '<b>Lo storno va alla liquidazione successiva</b>: per Decobrands nel bollettino del mese dopo, per il subagente nella liquidazione del trimestre dopo come voce negativa (anche se la provvigione era già stata liquidata). Il riaccredito allo stesso modo, come voce positiva.',
    ],
    modifica: 'Operatore o superiore nell’area Provvigioni, per sollecitare e segnare gli incassi.',
  },
  { id: 'fornitori', titolo: 'Fornitori', gruppo: 'Anagrafiche', vai: '/fornitori',
    sintesi: 'Anagrafica da Integra in sola lettura; nel CRM si gestiscono le condizioni e le percentuali di provvigione per sconto, con la data da cui valgono.',
    pulsanti: [
      ['Riga del fornitore', 'Apre la scheda a destra.'],
      ['Modifica condizioni', 'Giorni attesa conferma, giorno del bollettino, pagamento sul maturato o sul fatturato, giorni per l’incasso dal cliente.'],
      ['Schede Percentuali · Clienti seguiti', 'Percentuali per versione: quella in vigore in alto, poi le future e le passate, con le eccezioni personali sotto la percentuale al subagente; clienti seguiti per quel fornitore (si modificano dal cliente), con filtro a scelta multipla per subagente.'],
      ['Nuove percentuali', 'Inserisce una nuova versione delle percentuali da una data: le righe partono da quelle più recenti e si possono aggiungere sconti, non togliere.'],
      ['Correggi · Elimina', 'Sulla singola versione. Valgono solo dopo l’ultima chiusura del fornitore (bollettino verificato o contestato, trimestre liquidato); altrimenti il server rifiuta e la finestra lo spiega.'],
    ],
    finestre: [
      { nome: 'Condizioni del fornitore', da: 'Modifica condizioni', cosa: 'Regole che fanno scattare solleciti e liquidazioni.',
        campi: [
          ['Giorni attesa conferma', 'Dopo, la pratica è in ritardo.'],
          ['Bollettino atteso entro il giorno', 'Del mese successivo (1–28); dopo, compare il sollecito.'],
          ['Pagamento provvigioni', 'Maturato o fatturato.'],
          ['Giorni per l’incasso dal cliente', 'Sul maturato: dopo questi giorni dalla fattura non ancora riconosciuta, l’incasso è da verificare (iniziale 60).'],
        ],
        azioni: [
          ['Salva condizioni', 'Applica subito.'],
        ] },
      { nome: 'Nuove percentuali', da: 'Nuove percentuali', cosa: 'Per ogni sconto: % a Decobrands e % al subagente.',
        campi: [
          ['Valide dal', 'Deve venire dopo l’ultima chiusura del fornitore; può cadere fra due versioni. I documenti precedenti restano calcolati con le percentuali di allora.'],
          ['Aggiungi uno sconto', 'Facoltativo: le soglie esistenti non si tolgono.'],
        ],
        azioni: [
          ['Salva le nuove percentuali', 'Crea la nuova versione.'],
          ['Salva la correzione', 'Con Correggi: sostituisce le percentuali di quella versione.'],
        ] }
    ],
    modifica: 'Responsabile nell’area Dati, per condizioni e percentuali; operatore per il resto.',
  },
  { id: 'subagenti', titolo: 'Subagenti', gruppo: 'Anagrafiche', vai: '/subagenti',
    sintesi: 'Chi segue i clienti per conto di Decobrands. Non sono in Integra: si gestiscono per intero nel CRM.',
    pulsanti: [
      ['Nuovo subagente', 'Nome, email, codice fiscale o P.IVA, telefono.'],
      ['Modifica', 'Cambia i dati.'],
      ['Rendi non attivo', 'Un subagente con clienti o provvigioni non si elimina: si disattiva.'],
      ['Vedi la liquidazione', 'Apre la liquidazione filtrata sul subagente.'],
      ['Aggiungi eccezione', 'Una percentuale personale che vale al posto di quella dello scaglione, dal giorno indicato e fino a una fine (la imposta un responsabile).'],
      ['Clic su un’eccezione', 'Apre il periodo e le azioni: Cambia la %, Termina, e Modifica o Elimina quando tutto il periodo è dopo l’ultima chiusura.'],
    ],
    finestre: [
      { nome: 'Subagente', da: 'Nuovo subagente · Modifica', cosa: 'Dati anagrafici.',
        azioni: [
          ['Salva', 'Registra.'],
          ['Elimina', 'Solo se non ha clienti né provvigioni.'],
        ] },
      { nome: 'Eccezione', da: 'Aggiungi eccezione · clic su un’eccezione', cosa: 'Il subagente è fisso.',
        campi: [
          ['Fornitore', 'Campo con ricerca.'],
          ['Sconto al cliente', 'Gli sconti proposti sono quelli in vigore del fornitore.'],
          ['Al subagente %', 'Da 0 a 100; 0 = nessuna provvigione su quello sconto.'],
          ['Dal', 'La data deve venire dopo l’ultima chiusura del fornitore.'],
        ],
        azioni: [
          ['Aggiungi eccezione · Salva', 'Apre il periodo dell’eccezione.'],
          ['Cambia la %', 'Chiude il periodo alla data indicata e ne apre uno nuovo con la nuova percentuale.'],
          ['Termina', 'Dal giorno indicato non vale più (quel giorno è escluso).'],
          ['Modifica · Elimina', 'Solo se il periodo è tutto dopo l’ultima chiusura.'],
          ['Elimina', 'Con conferma: torna a valere la percentuale standard.'],
        ] }
    ],
    sapere: [
      'Le eccezioni sono rare: di norma tutti i subagenti hanno la percentuale dello scaglione.',
      'L’eccezione non è legata a una versione delle percentuali: vale nei giorni del suo periodo e con <b>Nuove percentuali</b> del fornitore continua da sola, senza copie.',
    ],
    modifica: 'Operatore o superiore nell’area Dati.',
  },
  { id: 'clienti', titolo: 'Clienti', gruppo: 'Anagrafiche', vai: '/clienti',
    sintesi: 'Anagrafica da Integra in sola lettura. Per ogni cliente le <b>agenzie</b>: i fornitori per cui Decobrands fa da agente, con codice cliente del fornitore, subagente e sconto.',
    pulsanti: [
      ['Segmenti e filtri', 'Tutti · Con agenzie · Senza agenzie · Diretta; filtri a scelta multipla per fornitore e subagente (i clienti con un’agenzia così), con riepilogo; i numeri dei segmenti contano con gli altri filtri.'],
      ['Scheda Agenzie', 'Filtri a scelta multipla per fornitore e subagente; clic su una riga per modificarla; contatore giallo se manca un codice cliente.'],
      ['Aggiungi agenzia', 'Nuovo fornitore per questo cliente.'],
      ['Scheda Pratiche', 'Pratiche del cliente con filtro: Aperte · In ritardo · Fatturate · Non pagate · Tutte (numeri calcolati con gli altri filtri), fornitori (filtro standard), numero; imbuto per il riepilogo.'],
    ],
    finestre: [
      { nome: 'Agenzia', da: 'Aggiungi agenzia · clic su una riga', cosa: 'Il cliente è fisso.',
        campi: [
          ['Fornitore', 'Campo con ricerca.'],
          ['Codice cliente del fornitore', 'Come il fornitore chiama il cliente: serve ad abbinare i documenti in automatico.'],
          ['Seguito da', 'Subagente, campo con ricerca.'],
          ['Sconto al cliente', 'Sotto il campo compaiono gli sconti degli scaglioni in vigore dei fornitori; un altro valore va bene lo stesso.'],
          ['Al subagente per questo cliente % · Provvigione al subagente', 'Riservati al responsabile: per l’operatore sono spenti (cambiano i soldi del subagente).'],
        ],
        azioni: [
          ['Aggiungi agenzia · Salva', 'Registra.'],
          ['Elimina', 'Con conferma: le pratiche con quel fornitore non generano più provvigioni.'],
        ] }
    ],
    sapere: [
      'Un solo subagente per cliente e fornitore; il codice cliente è unico per fornitore.',
      '<b>Al subagente per questo cliente %</b> e <b>Provvigione al subagente</b> li cambia solo un responsabile, come le eccezioni personali. La percentuale vale solo per questo cliente e fornitore; vuoto = la percentuale dello scaglione o l’eccezione del subagente.',
      '<b>Una fattura al mese</b> (la prima o la più alta): le altre fatture del mese non danno provvigione al subagente. Il fornitore non cambia: si controlla nel bollettino.',
      'Per un caso singolo si corregge il documento in Liquidazioni (<b>Correggi</b>), con il motivo. Lo sconto fittizio non serve più: lo sconto resta quello vero.',
    ],
    modifica: 'Operatore o superiore nell’area Dati; le percentuali al subagente sono del responsabile.',
  },
  { id: 'accesso', titolo: 'Accesso', gruppo: 'Gestione', vai: '/accesso/cambia',
    sintesi: 'Si entra con nome utente (o email) e password, come nella Gestione Ordini. La prima volta si usa la password provvisoria arrivata per email e se ne sceglie una propria.',
    pulsanti: [
      ['Premi un tasto o tocca', 'Sulla pagina col logo apre il modulo di accesso; il tasto premuto è già nel nome utente. Esc, un clic fuori o 2 minuti senza toccare nulla tornano al logo e il modulo riparte vuoto.'],
      ['Licenza d’uso', 'In fondo alla pagina di accesso: chi può usare il sistema e cosa non si può fare.'],
      ['Entra', 'Nome utente o email e password; con “Resta collegato” la sessione dura 30 giorni, senza finisce alla chiusura del browser.'],
      ['Password dimenticata?', 'Scrivi l’email: arriva un link per sceglierne una nuova, valido un’ora e una volta sola.'],
      ['Esci', 'Nel menu dell’utente, in fondo alla barra: clic sul tuo nome.'],
      ['Cambia la password', 'Nel menu dell’utente, in fondo alla barra: password attuale e nuova (almeno 8 caratteri).'],
    ],
    sapere: [
      'Il messaggio “Credenziali non valide” è lo stesso per nome sbagliato, password sbagliata o utente disattivato: così non si scopre chi è registrato.',
      'Dopo troppi tentativi su un utente bisogna aspettare 15 minuti; i colleghi dello stesso ufficio entrano lo stesso.',
      'Con la password provvisoria non si apre nessuna pagina prima di averla cambiata.',
      'Cambiare la password chiude le sessioni aperte sugli altri computer.',
    ],
    modifica: 'Ognuno con le proprie credenziali; chi amministra crea gli utenti.',
  },
  { id: 'utenti', titolo: 'Utenti e ruoli', gruppo: 'Gestione', vai: '/utenti',
    sintesi: 'Gli utenti del CRM. Si entra con nome utente (o email) e password; la password provvisoria arriva per email e va cambiata al primo accesso. Il ruolo decide cosa si può fare.',
    pulsanti: [
      ['Nuovo utente', 'Nome, nome utente, email, ruolo; parte l’email con la password provvisoria.'],
      ['Modifica', 'Nome, nome utente, email, ruolo.'],
      ['Reimposta la password', 'Manda una nuova password provvisoria per email: quella di prima smette di funzionare.'],
      ['Cambia la tua password', 'Sulla tua scheda: porta al cambio della password.'],
      ['Disattiva · Riattiva', 'Chi è disattivato non entra; i suoi dati restano.'],
      ['Elimina', 'Solo per chi non serve più; chi ha già usato l’app conviene disattivarlo.'],
    ],
    finestre: [
      { nome: 'Utente', da: 'Nuovo utente · Modifica', cosa: 'Dati e ruolo.',
        campi: [
          ['Nome utente', 'Minuscole, numeri, punto o trattino, senza @; unico.'],
          ['Email', 'Unica; ci arrivano la password provvisoria e il link di password dimenticata.'],
          ['Ruolo', 'Il superutente sceglie anche Amministratore; l’amministratore solo Operatore e Sola lettura.'],
        ] }
    ],
    sapere: [
      'Gli utenti li crea chi amministra: nessuno si registra da solo.',
      'Il superutente è uno solo, si crea all’installazione e gestisce gli amministratori; non si modifica da qui.',
      'Deve restare almeno un amministratore attivo; non puoi cambiare il tuo ruolo né disattivarti.',
      'L’esito dell’ultima email (consegnata o no) è nella scheda dell’utente.',
    ],
    modifica: 'Superutente e Amministratore.',
  },
  { id: 'sistema', titolo: 'Stato del sistema', gruppo: 'Gestione', vai: '/sistema',
    sintesi: 'I servizi che lavorano da soli: casella dei documenti, server di lettura, sincronizzazione da Integra, posta in uscita.',
    pulsanti: [
      ['Riquadri dei servizi', 'Funziona · Da tenere d’occhio · Problema; fanno da filtro sui problemi e sulle esecuzioni. Ogni riquadro dice la causa (o il riepilogo del giorno), l’indirizzo, l’ultimo giro e il ritmo.'],
      ['Segna come visto', 'Sul problema, dopo averlo letto: esce dal contatore ma resta aperto (e continua a colorare il riquadro).'],
      ['Segna tutti come visti', 'In testata, quando ci sono problemi da vedere.'],
      ['Controlla adesso', 'Rilegge subito la casella e verifica i servizi; se qualcosa è lento la pagina non aspetta più di 30 secondi e si aggiorna da sola.'],
    ],
    sapere: [
      'I problemi da vedere hanno il contatore nella barra, sulla voce e sul gruppo Gestione: giallo se ce n’è uno in errore. Il numero lo dà il server a ogni cambio pagina.',
      'Un servizio non configurato resta verde con la nota «Non configurata»: si imposta nelle Impostazioni. Un servizio fermo (nessun giro da tre cicli) o con gli ultimi tre giri falliti è un problema.',
      'I controlli senza novità sono raggruppati («12 controlli riusciti dalle 09:00»); le anomalie chiuse da sole restano in Tutti con «Risolto il …».',
      'La pagina si aggiorna da sola ogni 30 secondi mentre è aperta.',
    ],
    modifica: 'Amministratore; anche chi è operatore in un’area.',
  },
  { id: 'impostazioni', titolo: 'Impostazioni', gruppo: 'Gestione', vai: '/impostazioni',
    sintesi: 'Parametri validi per tutti: dati dell’azienda, casella dei documenti, server di lettura e soglie, posta in uscita, sincronizzazione da Integra (database ponte), conservazione dei dati.',
    pulsanti: [
      ['Sezioni a sinistra', 'Dati dell’azienda, Casella dei documenti, Server di lettura, Posta in uscita, Sincronizzazione da Integra, Conservazione dei dati.'],
      ['Salva …', 'Salva la sezione; i controlli (numeri nei limiti, email, soglie) li fa il server e l’errore dice quale campo e quale limite.'],
      ['Prova la connessione', 'Sulla casella, il server di lettura, la posta e la sincronizzazione da Integra: prova i valori salvati, non quelli ancora digitati. Una prova fallita dice il motivo, senza mai mostrare le password.'],
    ],
    sapere: [
      'Password e segreti non si rileggono: il campo dice «impostata» e si scrive solo per sostituirla; il valore cifrato non esce mai dal server e non finisce nel registro eventi.',
      'Server di lettura: scegli il modello dal menu (LlamaCloud UE o GLM-OCR locale quando c’è la macchina); ognuno ha i suoi parametri e la pagina mostra quelli del modello scelto, che è quello usato per leggere i documenti. La chiave non si rilegge e il file si cancella dal cloud dopo la lettura.',
      'Righe per pagina: quante righe mostrano le tabelle prima di andare a pagina successiva.',
      'Le impostazioni si usano davvero: la posta in uscita, la sincronizzazione da Integra, la conservazione del registro, le righe per pagina e l’intestazione delle esportazioni.',
      'Alcuni parametri non stanno qui ma nel file .env del server (per esempio SEGRETI_CHIAVE, senza cui le password non si possono salvare): li trovi elencati in fondo alla sezione, in sola lettura, con il file da modificare e il riavvio del backend che serve per caricarli.',
    ],
    modifica: 'Superutente e Amministratore.',
  },
  { id: 'scartati', titolo: 'Documenti scartati', gruppo: 'Gestione', vai: '/scartati',
    sintesi: 'I documenti scartati restano per i giorni fissati nelle impostazioni (Impostazioni › Conservazione dei dati), con motivo e autore.',
    pulsanti: [
      ['Recupera', 'Rimette il documento fra quelli da controllare e lo apre.'],
      ['Elimina', 'Definitivo, solo amministratore, con conferma: cancella il file e i dati letti.'],
    ],
    sapere: [
      'I filtri sono per motivo (con il numero di ciascuno) e una ricerca su numero, fornitore, cliente o file.',
      'La colonna «Eliminato il» dice quando il documento sparirà da solo: scartato il + i giorni della conservazione.',
      'Da Documenti, accanto al numero dei documenti da controllare, il collegamento «N scartati» porta qui.',
    ],
    modifica: 'Operatore o superiore nell’area Provvigioni; l’eliminazione definitiva è per l’amministratore.',
  },
  { id: 'registro', titolo: 'Registro', gruppo: 'Gestione', vai: '/registro',
    sintesi: 'Tutto quello che l’applicazione registra: operazioni, accessi, esportazioni e anomalie dei servizi. È in sola lettura.',
    pulsanti: [
      ['Tutto · Anomalie aperte · Errori', 'I segmenti filtrano l’elenco e dicono quante righe prendono gli altri filtri.'],
      ['Filtri', 'Genere, livello, servizio, codice, entità, utenti (ricerca multipla), periodo Dal–Al e ricerca nel messaggio, nel codice o nel riferimento. Il riepilogo li mostra e li toglie.'],
      ['Clic sulla riga', 'Apre il dettaglio in finestra: campi comuni e dettaglio leggibile, con prima e dopo affiancati.'],
      ['Stessa operazione', 'Nel dettaglio: mostra tutte le righe della stessa operazione.'],
      ['Esporta', 'Scarica in CSV le righe filtrate, con le stesse colonne della tabella.'],
    ],
    finestre: [
      { nome: 'Dettaglio', da: 'Clic sulla riga', cosa: 'L’evento o l’anomalia per esteso.',
        campi: [
          ['Quando e livello', 'Data e ora, gravità e genere.'],
          ['Messaggio e codice', 'Cosa è successo e il codice che lo classifica.'],
          ['Utente o servizio', 'Chi l’ha fatto, oppure il servizio che l’ha scritto.'],
          ['Riferimento', 'Il collegamento alla pratica, al documento o al bollettino.'],
          ['Dettaglio', 'I campi dell’evento; per le modifiche Prima e Dopo affiancati.'],
        ] },
    ],
    sapere: [
      'La pagina è per gli amministratori: chi non ce l’ha non vede nemmeno la voce nel menu.',
      'Niente si modifica né si elimina dal registro: le correzioni passano dalle normali operazioni, che scrivono nuove righe.',
      'Le informazioni restano 12 mesi, il resto 36; le anomalie aperte non si cancellano mai.',
      'Il riferimento porta alla pagina vera quando il server sa dove andare; altrimenti resta il testo dell’etichetta.',
    ],
    modifica: 'Amministratore e superutente.',
  },
];
