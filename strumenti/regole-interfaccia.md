# Regole d'interfaccia nate dal collaudo del Decobrands CRM

Raccolta delle migliorie d'interfaccia chieste da Ugo durante il collaudo con i documenti veri
(novembre 2026). Serve come base per una **skill riusabile negli altri progetti**: ogni regola è
scritta in modo generale, con l'esempio del CRM e il rimando alla decisione (§19 della spec).
Si aggiorna a ogni nuova regola (Claude Code la tiene allineata quando chiude un pacchetto).

## Navigazione
1. **I dati interconnessi sono navigabili in sequenza** (D-167): ogni pagina di dettaglio ha link
   verso tutte le entità che mostra; la catena si percorre senza vicoli ciechi (documento → pratica
   → cliente → agenzia → fornitore → percentuali) e «Indietro» del browser torna alla schermata
   precedente **nello stesso stato** (filtri, scheda, voce selezionata, scorrimento).
2. **Un solo componente link** in tutta l'app; il link si mostra solo se l'utente può vedere la
   pagina d'arrivo, altrimenti testo semplice.
3. **I link si aprono nella stessa scheda**; dentro una finestra con modifiche non salvate prima
   si chiede conferma con una finestra dell'app («Hai correzioni non salvate: uscire?» Esci /
   Resta). Mai `window.confirm`/`alert` (bloccano il browser e l'automazione).
4. **Il pallino di stato di una scelta valida è un link** all'entità scelta (D-161, pallini-link).
5. Le pagine a più sezioni (Impostazioni) aggiornano **solo la parte destra**, non ricaricano tutto.
6. Le pagine si aprono sulla **scheda giusta** da un parametro (`?scheda=percentuali`).

## Flusso di lavoro
7. **Configurare nel flusso, non «vai in X»** (D-158, D-162): se manca un dato per proseguire
   (agenzia, percentuali), il messaggio spiega cosa manca e offre il pulsante che apre **la stessa
   finestra della pagina di gestione**, con i campi già noti compilati e bloccati; salvando si
   riprova l'operazione di partenza.
8. **Prima i dati che ci sono già, poi la configurazione a mano**: proporre il dato esistente (es.
   dal vecchio sistema) con «Usa questa» / «Configura»; i dati importati restano «da confermare»
   finché un operatore non li conferma (D-159).
9. **Le liste di lavoro vanno dal più vecchio al più recente** (coda: in coda, in lettura, da
   controllare); quelle chiuse dal più recente.
10. **Le liste si aggiornano da sole** (eventi dal server o aggiornamento solo mentre c'è lavoro in
    corso e la pagina è visibile) **senza toccare il dettaglio aperto** né le finestre aperte.
11. **La coda è visibile** appena si carica qualcosa, con la possibilità di toglierla prima che
    venga elaborata; si dice ogni quanto viene elaborata.
12. **Chiave di aggancio esplicita**: un riferimento esterno (es. numero d'ordine del fornitore) è
    un campo a sé, chiave insieme al suo proprietario (fornitore + numero), e si guarda per primo;
    la codifica interna resta il riferimento principale (D-169).
13. **Imparare dalle scelte a mano** (vocabolario: nome letto → soggetto scelto) e riconoscere per
    somiglianza; con più candidati si propone, mai una scelta a caso (D-111, D-164).

13b. **Una sola fonte per ciò che si mostra**: elenco, dettaglio e finestre di correzione usano lo
    stesso risultato calcolato dal server; un dato riconosciuto all'apertura si salva (senza
    sovrascrivere le scelte a mano), così l'elenco non dice «non riconosciuto» mentre il dettaglio sì.
13c. **Coerenza fra due dati legati** (es. codice cliente ↔ cliente): spunta verde se coincidono,
    avviso giallo con il motivo se no; niente ripetere il dato già mostrato accanto.

## Moduli e campi
14. **Lente e azioni dopo il campo**, sulla stessa riga; etichette su una riga; campi della stessa
    riga alla stessa altezza; niente scorrimento orizzontale nelle finestre.
15. **Campi data** sempre con selettore nativo e formato locale (gg/mm/aaaa); **mai date ISO** nei
    testi, nei messaggi del server e nelle tabelle.
16. **Importi e prezzi in formato valuta** (`12,50 €`), allineati a destra.
17. **Campo di ricerca con stato**: pallino grigio (vuoto / in caricamento), verde (trovato), rosso
    (solo se davvero non esiste). **Mai mostrare l'id** mentre le voci caricano: nome già noto o
    sagoma (D-161). Il dato letto dal documento si porta nella ricerca con un pulsante «›».
18. **Valore calcolato accanto al dato letto** (es. «Somma righe» sopra l'Importo): sola lettura,
    spunta se coincide, avviso (non errore, non bloccante) se differisce; il server rifà lo stesso
    controllo (D-154).
19. **Dato mancante preso dal documento** con proposta esplicita («Salva la P.IVA») e solo se il
    campo è vuoto; mai sovrascrivere (D-165).
20. **Fuoco sulla riga appena aggiunta**; fuoco con **bordo interno**, non `outline` esterno (D-64).
21. **Riepiloghi a tendina chiusi di default** con la freccia (▸/▾); vuoti non occupano spazio.
22. **Icona «Copia»** accanto agli identificativi che servono per dialogare con altri (numeri di
    documento, ordine, P.IVA, codici): copia negli appunti e mostra «Copiato» (D-173).

## Barra dei filtri
0. **Barra filtri su una riga; segmenti in tendina quando non ci stanno** (15/11/2026): a 1440 px la
   barra sta su una riga (ricerca contenuta, entità compatte); quando la finestra si stringe e i
   segmenti non ci stanno più, i segmenti diventano una tendina nativa con le stesse voci e i numeri
   dal vivo, invece di andare a capo. La misura è con `ResizeObserver` nel componente `FilterBar`
   (parametrico, vale per tutte le pagine), con isteresi per non sfarfallare al limite.

## Tabelle
23. Tutte uguali: riempiono lo spazio, intestazione fissa, ordinamento e totali su tutto
    l'elenco, paginazione (D-22…D-23).
24. **Azioni sulle righe solo come icone in colonne fisse**: ogni azione sempre nello stesso
    punto; se una riga non l'ha resta lo spazio vuoto (D-171). Vale anche per le liste che non
    sono tabelle (elenchi, incassi): un solo componente `AzioniRiga` ovunque.
25. **Modifica di una riga con una finestra piccola** (inserimento e modifica con la stessa
    finestra) invece di una griglia larga con tutte le righe; il server controlla sovrapposizioni
    e vincoli al salvataggio (D-168).
26. **Il dettaglio mostra sempre i propri dati**, anche quando la funzione principale (confronto)
    non è disponibile; il controllo che non serve è spento con il motivo nel `title`.
26b. **Spiegazioni lunghe sotto una tabella → pulsante informazioni** (icona «i», componente
    `Informazioni`) in alto a destra: apre una finestra con il testo diviso in punti brevi, invece
    di stare in pagina. La tabella resta senza scorrimento orizzontale (testi brevi, larghezze in
    %, numeri a destra) e scorrono solo le righe, con intestazione fissa.

## Conferme e messaggi
27. **Operazioni senza ritorno**: finestra di conferma con l'elenco **vero** delle conseguenze e
    una **casella da spuntare** che abilita il pulsante (rosso); Invio non conferma finché è
    spenta, Esc annulla (D-172).
28. **Non nominare i fornitori dei servizi** nei testi («il servizio di lettura», non il nome
    commerciale): possono cambiare.
29. **Messaggi che dicono cosa fare** e, se possibile, offrono il pulsante per farlo; niente
    «aggiungila in Clienti» senza link.
30. **Caricamento a sagome** (D-59), mai zeri o «nessun elemento» finti; pagina d'avvio con il
    colore della schermata d'accesso e uno spinner.

## Documenti (PDF)
31. **Il PDF si vede tutto e si scorre**; scegliendo un campo si va alla sua pagina e lo si
    evidenzia.
32. **Conservare la risposta completa del servizio di lettura** (solo sul server) per ricavare
    campi nuovi senza rileggere (D-170).
