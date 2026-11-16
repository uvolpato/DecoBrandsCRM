# Specifica — CRM Ordini a Fornitore, Bollettini e Provvigioni (Decobrands)

**Versione:** 8.84 - **Registro completo dell'onda del 14/11 e precedenti (D-153…D-176):** le decisioni fino a D-152 non documentate entrano nel §19 (somma delle righe e testata di *Correggi* D-153/D-154, vecchio CRM in esercizio D-156, codice cliente nella ricerca D-157, agenzie da sempre e da confermare D-158/D-159, campi di ricerca D-161, scaglione e percentuali nel flusso D-162/D-163, vocabolario e somiglianza D-164, P.IVA dal documento D-165, percentuali che non si sommano D-166, navigazione in sequenza D-167, finestra a uno scaglione D-168, numero d'ordine del fornitore D-169, lettura grezza D-170, azioni a icone D-171, conferma con spunta D-172, icona Copia D-173, conferme multiple D-174, riconoscimento coerente D-175, righe copiate e gruppi D-176); D-155 e D-160 risultano non usati. Righe *Perché* di §4.2.2, §5.1, §5.11, §6.5, §7.9, §16.4, §16.4.1. Riferimenti del piano F7-A13/F7-A14 allineati. **Versione:** 8.83 - **Onda del 15/11/2026 (D-177…D-196):** lo scaglione si sceglie dallo sconto medio letto sui documenti, primo scaglione ≥ sconto medio, oltre l'ultimo = anomalia e pratica non chiudibile (D-182); le spese in fattura sono escluse dalla base salvo parametro del fornitore e ogni documento salva i propri valori calcolati congelandoli alla chiusura, la pratica è la somma (D-183); la sessione del database è in UTC, l'ora la decide il backend (D-181); il filtro per stato nell'abbinamento sta nella finestra di ricerca come tendina (D-177) e la tendina «Stato delle pratiche» parte da «Aperte» (D-178); la ricerca delle pratiche è vincolata a cliente e fornitore (D-185); dalla pratica si prende un documento già in coda (D-186); nelle email vincono i riferimenti del destinatario (D-184); la barra dei filtri sta su una riga con i segmenti in tendina (D-187); un pagamento non ha numero (D-188); importo letto 0 su riga che vale = non letto (D-179); testata della pratica con tutti gli ordini (D-180); voci «Documenti da decidere» più esplicite in Oggi (D-191); importi calcolati in blocco (D-192); visualizzatore PDF/foto con riquadro, zoom e errore visibile (D-190, D-193); righe di spesa lette con `spesa: true` (D-194); tendina dell'anno nelle Liquidazioni (D-195); somma righe in rosso senza «diversa di» (D-196); posizione del campo «indicativa», mai «esatta» (D-189). Righe *Perché* di §4.2.7.1, §4.2.8, §5.3, §5.7, §6.5, §7.1, §7.3, §7.8, §7.9, §16.4, §16.4.1. **Versione:** 8.82 - **Fornitore e cliente da scegliere fra i candidati (D-152):** dopo la lettura il server cerca in entrambe le fonti (CRM e Integra) per P.IVA e ragione sociale; se il riconoscimento non è univoco il documento mostra i candidati (massimo 10 per fonte, con fonte, motivo) e la persona sceglie — CRM si collega, Integra si importa e collega nella stessa transazione, «Nessuno di questi» resta la ricerca a mano. **Versione:** 8.81 - **Documentazione del collaudo (13/11/2026):** le soglie di affidabilità della lettura partono da 0,80/0,70, vivono solo sul server (il browser le riceve col documento, D-151) e al salvataggio riclassificano i documenti ancora da decidere. **Versione:** 8.80 - **Documentazione del collaudo (13/11/2026):** connessioni solo al superutente (D-115); sul maturato la nota di credito segue la sua fattura (D-118) e, se la fattura è già liquidata in un trimestre chiuso, la provvigione tolta va nella liquidazione successiva come voce negativa (D-150); le correzioni di un bollettino contestato arrivano nel bollettino del mese dopo (D-119); il tipo di provvigione del fornitore non cambia dopo la prima chiusura (D-121); uno scartato torna in coda solo se lo si ricarica a mano (D-122); la stessa fattura su un'altra pratica solo con la conferma «multi-ordine» (D-123); cliente riconosciuto per P.IVA condivisa decidendo per ragione sociale (D-124); il connettore di lettura locale non si sceglie finché non esiste (D-125); totali e differenze degli importi dal server (D-126); il confronto delle righe dei documenti ha una rotta sua; righe *Perché* di §5.5, §5.14, §6.2, §6.5, §7.3, §7.7, §7.9, §7.15, §8.3, §10, §11, §16.4, §16.4.1, §16.4.2; §8.1 allineata alle rotte vere (clienti, agenti, agenzie, Integra) e guida senza *Carica un documento* nella pratica. **Versione:** 8.79 - **Onda 1 del collaudo (D-114…D-132, D-144…D-149):** agenzie bloccate nel periodo chiuso (D-114); avviso al vecchio indirizzo quando cambia l'email di un utente (D-117); cliente riconosciuto per P.IVA con o senza prefisso del paese (D-124); blocco sotto i 744 px sulla larghezza della finestra, anche con lo zoom (D-127); pagina d'accesso svuotata dopo 2 minuti (D-129); nell'app il blocco dell'ordine senza fornitore, agenzia o scaglione è su *Apri la pratica* (D-131); Oggi guarda i bollettini degli ultimi 12 mesi (D-144); in esercizio il backend rifiuta i segreti d'esempio (D-145); il motore prende l'agenzia alla data dell'ordine (D-146); STARTTLS obbligatorio sulla casella fuori dalla 993 (D-147); messa in esercizio dietro Caddy ≥ 2.5, con HSTS e IP vero (D-148); avvisi con una sola regione live e errori come `alert` (D-149); recupero dei documenti in errore, `casella.interno`, rifiuto di validazione `negato`, sollecito con elenco fatture, righe *Perché* di §5.2, §5.14, §7.9, §7.14.3, §7.15, §7.16, §15.2.3, §15.2.7, §16.4, §16.4.2. **Versione:** 8.78 - **Onda 0 del collaudo (D-139…D-143):** il PDF di un bollettino non si scarta e non si abbina a una pratica (D-140); una decisione in un bollettino ferma l'annullamento e lo spostamento del documento (D-141); il numero della pratica è UNIQUE e le chiavi esterne delle tabelle grandi hanno il loro indice (D-142); la ricerca delle Pratiche ha gli indici trigram (D-143); `sconti` → `interscambio` è `ON DELETE RESTRICT` (D-139). **Versione 8.77:** - **Onda 0 bis del collaudo (D-133…D-138):** correggere un documento non cancella le righe che non arrivano e l'import da Integra lanciato dal documento collega il fornitore nella stessa transazione (D-133); il subagente proposto dallo storico lo decide il server (D-134); dopo *Importa* in Cerca in Integra si apre la scheda del nuovo soggetto (D-135); Cerca in Integra non entra nel prototipo (D-136); un documento che entra in una pratica già aperta vuole l'agenzia alla data dell'ordine (D-137); ciò che arriva da Integra non si tocca nel CRM (D-138). **Versione 8.76:** **Registro §19: doppione D-106 sciolto** (gli agenti di Integra diventano D-109, D-106 resta all'agenzia mancante dal documento; D-110 non usato). **Versione 8.75:** **L'anagrafica di Integra si importa su richiesta e i legami stanno in uno storico** (D-111, D-112, D-113, §4.7): la sincronizzazione aggiorna e non crea più; un fornitore o un cliente sconosciuto si cerca sulle viste (massimo 10 righe) e si importa con un clic (permesso `dati.importa`); i 4022 legami del vecchio CRM entrano in `interscambio_storico` (4022 righe, testi e id legacy, nessuna FK obbligatoria) e le 3403 schede in `soggetti_storico`, per proporre subagente e sconto; i 1625 senza subagente sono fornitori **senza rappresentanza** e non aprono la pratica; gli scaglioni di un fornitore nuovo si compilano a mano prima di aprire una pratica. 8.74 - **L'agente è un ruolo del master, non un dato del fornitore** (D-106, D-105, chiarimento dell'11/11/2026 con i programmatori di Integra): in Integra il codice agente sta **solo sulle righe cliente** (674 su 698; **0 fornitori su 115**) e i 21 master agente dell'azienda `001` non hanno righe in `cliazi`; il codice agente del cliente **non** si usa per riempire `interscambio.subagente_id`, perché i 1625 legami del vecchio CRM senza subagente sono fornitori **senza rappresentanza** per quel cliente. 8.73 - **Un agente senza P.IVA né codice fiscale non entra nell'anagrafica** (D-108): nell'import da Integra un master di `agenti` con P.IVA e CF vuoti non crea né il soggetto né il subagente; i suoi clienti restano senza subagente e l'import li elenca. 8.72 - **Il master `soggetti` si scrive solo per i soggetti importati** (D-107): l'import da Integra prende i clienti (698), i fornitori che non sono già clienti (109) e gli agenti/subagenti (21) — al massimo 828 soggetti; i 1060 master `clienti` senza ruolo in azienda `001` (in gran parte articoli) non entrano. 8.71 - **Gli agenti di Integra sono i subagenti e stanno in `agenti`, non in `cliazi`** (D-106): `cliazi.cla_tipo = 'A'` sono **articoli** (791 righe, `cla_codstr` = `prodotti.pro_cod`), non agenti; il ruolo agente ha una riga in `agenti` con l'identità nel master `clienti`, e le 21 righe dell'azienda `001` (18 attive, 16 usate) sono i subagenti del CRM; nuova vista `public.integra_v_agenti` e `agenti` fra le foreign table (17); restano aperte le decisioni di business (`030` «DIREZIONALE», nome/cognome, riconciliazione col vecchio CRM); la regola sugli agenti senza P.IVA/CF è chiusa da D-108. 8.70 - **Import del vecchio CRM nell'anagrafica a soggetti** (D-105, F1-A9a): un comando one-shot porta le schede del vecchio CRM nei soggetti, nei ruoli, nelle sedi, nei recapiti, nei legami e negli sconti, con la fusione dei doppioni a P.IVA uguale e i report degli scarti e dei conflitti; 1884 soggetti da 3403 schede, 1858 clienti, 1587 legami su 4022. 8.69 - **Pagine dell'anagrafica a soggetti** (D-104, F1-A8b): pagina `/soggetti` con elenco dal server (ricerca e segmenti con i numeri, ordinamento e pagine), scheda a schede *Ruoli · Sedi · Recapiti · Fatturazione*, finestre con le validazioni del server; il codice del soggetto `C000123` si vede anche in Clienti, Fornitori e Subagenti. 8.68 - **Anagrafica a soggetti implementata, additiva** (D-103, F1-A8a): il master `soggetti` con ruoli, sedi, recapiti, persone, fatturazione elettronica, sconti e audit si aggiunge sopra `clienti`/`fornitori`/`agenti`/`subagenti` (colonna `soggetto_id` nullable, nessuna FK toccata); codice `C000123` dalla sequenza, P.IVA/CF unici per paese con indici parziali, `sconti` solo tabella. 8.67 - **Il CRM diventa il centro di verità delle anagrafiche** (D-102): al passaggio si importano insieme clienti e fornitori **da Integra e dal vecchio CRM**, si fondono i doppioni, e da lì in poi cliente e fornitore **si censano nel CRM**; verso Integra si esporta un file quando serve. Resta invariato il vincolo di sola lettura su Integra (D-100) e la sincronizzazione continua per i soggetti che sono già là. 8.66 - **Le viste del ponte stanno nello schema `public`** (D-101): niente schema `crm_viste` dedicato, le viste `integra_v_clienti` e `integra_v_fornitori` stanno in `public` accanto alle tabelle del CRM. 8.65 - **Le viste del ponte prendono il prefisso `integra_` e la mappatura è confermata sui dati veri** (D-101): `id_integra` = `cli_cdcli`, `codice` = `cla_codstr` (codice cliente/fornitore), `paese` da `cli_stacod`, `codice_agente` = `cla_agecod`. 8.64 - **La connessione al server di Integra è SOLA LETTURA** (D-100): il CRM accede al server PostgreSQL di Integra (connessione diretta via `postgres_fdw`) solo con `SELECT`; vietate tutte le altre operazioni (INSERT, UPDATE, DELETE, DDL, funzioni che scrivono) e ogni modifica al server, né in sviluppo né in esercizio. 8.63 - **Il flusso degli aggiornamenti riparte se il registro torna indietro** (D-99): se il registro ha id più bassi dell'ultimo letto (ripristino di un backup, dati di prova ricaricati) il ciclo SSE riparte dall'ultimo id disponibile, invece di restare zitto per sempre; una prova Jest lo copre. 8.62 - **Chiusura dei rilievi del collaudo F7** (D-95…D-98): in Oggi il gruppo *Documenti da decidere* è acceso (voci con l'azione proposta, il fornitore e il livello, collegate a `/documenti/:id`) e i documenti contano nel "da fare"; nella matrice Bollettini la cella *Non arrivato* porta *Sollecita*, con il testo composto dal server dai documenti del mese (`GET`/`POST /api/solleciti/bollettini`) e l'evento `export.sollecito` alla copia; `/api/pratiche/cerca` senza `fornitore_id` risponde `[]` invece di 400; seed allineato a `dati.js` (11 fornitori, 17 documenti, 15 in coda) e `utenti_prova.js togli` toglie anche bollettini e trimestri chiusi dalle prove. 8.61 - **Aggiornamento mirato senza refresh nelle pagine master-detail** (D-94): in Documenti l'elenco sta nel *layout* (non nel page) e i nuovi documenti arrivano via SSE aggiornando solo l'elenco, così selezionare un documento non ricarica più la lista; il pattern (numeri subito, righe su *Aggiorna*, D-23) si estende ai dettagli (Pratica, Bollettino) e alle anagrafiche. 8.60 - **Niente pulsante *PDF*** (D-93): il documento si apre con il clic sulla riga (*Documenti della pratica*, file a sinistra e confronto a destra) e in Documenti il file è nella finestra di correzione; tolti il pulsante *PDF* dalle due card della pratica e dalla pagina Documenti, con la finestra che apriva (`componenti/Visualizzatore.tsx`, eliminato). 8.59 - **Il rettangolo del valore nel PDF è disegnato** (PDF.js, §6.6.1): la prova F0-A7 sul connettore cloud ha confermato la posizione `esatta` (riquadro presente), quindi nella correzione il campo selezionato si evidenzia sul PDF con un rettangolo; resta da verificare il connettore locale (GLM-OCR) e l'allineamento visivo. 8.58 - **Il blocco copre anche fornitore e cliente non riconosciuti, riconoscimento flessibile** (D-87 estesa, D-92): un ordine non apre la pratica finché non ci sono fornitore, cliente, agenzia e scaglione; il cliente si riconosce «prima con entrambi, poi con la più probabile» (P.IVA univoca, poi ragione sociale normalizzata a match unico). 8.57 - **La lettura estrae anche la P.IVA del cliente** (D-91): oltre a codice cliente e ragione sociale, lo schema di lettura legge la partita IVA dell'intestatario, così in Documenti il cliente si riconosce per P.IVA anche quando il codice del fornitore non è ancora abbinato (cliente esistente → link diretto alla sua scheda; cliente nuovo → registrarlo in Integra). 8.56 - **Profilo, timeout di inattività e numeri nel binario** (D-88…D-90): pagina `/profilo` con i dati in sola lettura, le aree con il livello, la **pagina di ingresso di ogni area** scelta dall'utente (vale anche dopo l'accesso) e *Cambia la password*; la sessione si chiude dopo **30 minuti di inattività** (`SESSION_TIMEOUT_MINUTI`, la connessione agli aggiornamenti non conta) e si torna all'accesso; nel binario della pratica i documenti di una fase mostrano **tutti i numeri affiancati**, con scorrimento orizzontale se non ci stanno. 8.55 - **Un ordine senza agenzia o scaglione non apre la pratica** (D-87): un ordine a fornitore entra nel flusso delle provvigioni solo se esistono l'agenzia (`interscambio` subagente × cliente × fornitore, con sconto, valida alla data) e lo scaglione del fornitore per quello sconto; se manca uno dei due il documento resta in coda come «da configurare» e l'operatore lo configura prima di aprire la pratica, così una provvigione mancante non diventa mai uno 0% silenzioso (lo sconto 100, che vale 0% per davvero, non è un dato mancante: il blocco guarda alla presenza di agenzia + scaglione, non al valore della percentuale). 8.54 - **Correzioni di sicurezza** (F7, audit OWASP, D-80…D-86): i CSV di liquidazione, Analisi e Registro neutralizzano le formule (apice davanti a `=`, `+`, `@`, tab, a capo, `-` non numerico); il limite ai tentativi è **davvero per persona** e i caricamenti dei documenti hanno il tetto loro (`TENTATIVI_CARICAMENTI`, 100 in 15 minuti); la casella legge prima la dimensione e non scarica le email oltre `DOCUMENTI_MAX_MB` (anomalia e spostamento); i solleciti di conferma chiedono `provvigioni.modifica` e dettaglio/file di uno scartato `provvigioni.scartati`; il backend non parte senza `NODE_ENV` e il testo delle email va nel log solo in sviluppo; il registro non salva più l'identificativo di sessione né il messaggio delle eccezioni (classe e codice); le pagine hanno una CSP completa (`object-src 'self'` per i PDF, `'unsafe-eval'` solo in sviluppo). 8.53 - **Ritocchi prima del collaudo** (D-75…D-79): i numeri del menu (Oggi, Documenti, Pratiche, Bollettini) arrivano da `GET /api/oggi/conteggi` a ogni cambio pagina, con Documenti e Pratiche in giallo quando c'è da fare; in ogni testata il pulsante *Torna a …* (a destra, accanto a Guida) riporta alla schermata precedente con la memoria di §7.12 e i vecchi pulsanti scritti a mano spariscono; nella finestra di correzione il ✓ conferma un campo senza cambiarne il valore e `PUT /api/documenti/:id` segna verificati solo i campi confermati o cambiati; *Consulta affiancati* e il clic su un documento della pratica aprono il confronto riga per riga con l'altro documento (schede, *Confrontato con*, segmenti, ← →), con le righe e il riferimento della nota di credito lette dal server; la pillola dello stato ha 10 px di spazio dal titolo. 8.52 - **Stato del sistema e documenti scartati nell'app** (F5-A5, F5-A7, D-74): controlli di salute ogni 5 minuti per i quattro servizi con prove iniettabili (anche per i servizi non configurati, che restano verdi con la nota «Non configurata»), anomalie aperte e chiuse solo per ciò che un controllo può verificare (`lettura.lenta` rinviata a F6-A5), stato e nota dei riquadri calcolati dal database, contatore dei problemi nella barra a ogni cambio pagina, *Controlla adesso* entro 30 secondi; pagina `/sistema` con riquadri-filtro, problemi (*Da vedere · Tutti*, *Segna come visto*) ed esecuzioni raggruppate, che si aggiorna ogni 30 secondi. Pagina `/scartati` con scarto il/da, motivo e nota, eliminazione automatica, recupero fra i documenti da controllare ed eliminazione definitiva solo dell'amministratore; collegamento «N scartati» in Documenti; pulizia notturna degli scartati e dei giri senza eventi (manutenzione). 8.51 - Il **totale riconosciuto** di un bollettino è la somma delle **provvigioni** delle sue righe (le fatture del mese), non degli imponibili (D-71, §7.9): il valore mostrato in Documenti e nella scheda *Cosa farne* usa `provvigione`. 8.50 - Pagina Documenti come il prototipo (D-24, D-73): **una sola pagina**, a sinistra *Da controllare* con il caricamento e l'elenco selezionabile, a destra il documento scelto (dati letti, schede, *Correggi i dati letti* e *Scarta il documento* nel pannello), senza segmenti, filtri e senza il PDF nel dettaglio; il file resta nella finestra di correzione. 8.49 - Pagina Documenti (F6-A4b, §7.9, §6.5 punto 7, D-73): `/documenti` con caricamento, segmenti *Da controllare · In coda · In lettura · Errore* e conteggi (D-23), ricerca, tipo e livello sul server; `/documenti/:id` con testata letta, schede *azione proposta* e *Righe lette* (D-15), PDF o foto originali, *Correggi i dati letti*, *Abbina a …*, *Apri la pratica*, *Registra e verifica* e *Scarta il documento*. La finestra di correzione è a tutto schermo (file a sinistra, testata e righe a destra, impilati sotto gli 860 px), con bordi 0,90/0,70 fissi nel browser e il PDF aperto alla pagina del campo; il rettangolo sul valore non si disegna ancora (D-06, F0-A7). 8.48 - Rotte della pagina Documenti (F6-A4a, §7.9, §8.1, D-72): `GET /api/documenti` con segmenti di stato e conteggi degli altri filtri (D-23), ricerca su numero/file/fornitore/cliente, tipo, livello e pagine sul server, testata e righe dai valori finali; `GET /api/documenti/:id` con campi e affidabilità, testata e righe, controlli e proposta ricalcolata, `bollettino.esiste`; `PUT /api/documenti/:id` con testata e righe (`i` = riga originale, `null` = aggiunta), tutto verificato, righe rinumerate, livello e controlli ricalcolati, evento `documento/update` con `campi_corretti`; `POST /api/documenti/:id/scarta` (`documento/update`, il catalogo non ha un codice suo); `lettoDaCampi` preferisce `valore_finale` (le correzioni contano). 8.47 - Controlli fissi, livello del documento e proposta di abbinamento (F6-A3, §6.5 punti 5-6, §4.2.12, D-71): `src/proposta.ts` con `lettoDaCampi` (conversioni difensive di numeri e date), `risolviFornitore` (nome normalizzato: minuscole, senza accenti, punteggiatura e spazi ridotti), `propostaDocumento` (esiti `doppio`/`bollettino`/`nuova`/`certo`/`probabile`/`ambiguo`/`nessuno`, candidati ordinati per articoli in comune con `punteggio`, `motivi` e `delta`), `controlliFissi` (codici `bollettino`, `codice_cliente`, `totale`, `riga`, `articolo`, `data`) e `valutaLettura` (livello con `tipo` escluso dal conteggio); il salvataggio della lettura risolve fornitore, livello e controlli nella stessa transazione (V13), senza salvare la proposta; lo schema di lettura aggiunge `riferimento_fattura` in testata e `numero_fattura`/`data_fattura`/`provvigione` nelle righe (per il bollettino le righe sono le fatture del mese). 8.46 - I parametri del server che stanno nel `.env` (D-70) si leggono nella pagina Impostazioni, in sola lettura: `GET /api/impostazioni` restituisce `ambiente` con nome, uso, sezioni che lo usano e se è impostato (il valore solo per i non segreti), e la pagina dice che si cambiano nel file `app/backend/.env` sul server e che serve riavviare il backend; il messaggio di `SEGRETI_CHIAVE` mancante manda lì. 8.45 - Servizio di lettura dei documenti (F6-A2, §6.5 punti 3-4, §4.2.13, §4.2.15, D-69): la coda si consuma con `LetturaService` ogni 15 s (un documento per giro, `SKIP LOCKED`), il file si legge solo da `DOCUMENTI_DIR` e si passa al connettore scelto; **un solo schema JSON** per l'estrazione (`SCHEMA_DOCUMENTO`, con il tipo letto dal modello e le righe di tutte le pagine in un solo elenco) e un prompt in italiano; i campi letti finiscono in `documenti_campi` con affidabilità, posizione e precisione, in una transazione che blocca la riga, poi il documento diventa `da_controllare`; gli errori passano da `letturaFallita` e ogni documento scrive una riga in `servizi_esecuzioni`; gli Excel dei bollettini sono rinviati (D-60). 8.44 - Le soglie di affidabilità accettano due decimali: il salvataggio del *Server di lettura* non chiede più numeri interi per `soglia_ok` e `soglia_bassa`. 8.43 - Il modello di lettura si sceglie da un menu (D-68): `llamacloud_eu` o `glm_ocr_locale`; ognuno ha i **suoi parametri salvati** (LlamaCloud: chiave cifrata, modo, progetto, attesa; locale: indirizzo, modello, attesa) e la pagina mostra solo quelli del modello scelto; le soglie di affidabilità sono comuni. Il modello visualizzato è quello usato per leggere i documenti. 8.42 - Connettore di lettura LlamaCloud UE (F6-A2, §6.5, §7.15, D-67): la sezione *Server di lettura* sceglie il connettore (`llamacloud_eu`), la chiave API (cifrata, mai riletta), il modo (economico · agentico · agentico plus) e il progetto; `leggiDocumento` carica il file, chiede l'estrazione con lo schema del tipo di documento, aspetta la fine e restituisce i campi con confidenza e citazione (pagina e riquadro normalizzato, §6.6); il file si cancella dal cloud dopo la lettura. Il connettore locale GLM-OCR/vLLM è previsto dallo stesso seam e si accende quando arriva la macchina. 8.41 - Ingresso documenti, ricezione e coda (F6-A1, §6.5 punti 1–2, §7.14, D-66): la casella si legge con `imapflow` ogni N minuti (Impostazioni → Casella), gli allegati PDF/JPEG/PNG entrano nella coda comune con `riceviDocumento` (doppioni ignorati, email lette spostate nella cartella delle lette); la coda è la tabella con `SKIP LOCKED` e 3 tentativi in `prelevaDocumento`/`letturaFallita` (contratto per F6-A2); anomalie `casella.connessione`, `casella.cartella`, `casella.allegato`, `casella.vuota` e `lettura.fallita`. 8.40 - Impostazioni (F5-A6, §4.2.14, §7.15, §8.1, D-65): pagina `/impostazioni/:sezione` con sei sezioni (azienda, casella, lettura, posta, integra, conservazione), segreti cifrati AES-256-GCM mai riletti, `GET`/`PUT /api/impostazioni` e `POST /api/impostazioni/:chiave/prova` (prova i valori salvati, non quelli digitati), evento `crud/update` su `impostazione` con `prima`/`dopo` e le password solo `impostata`/`sostituita`; i servizi leggono davvero le impostazioni: posta in uscita con nodemailer, sincronizzazione da Integra, conservazione del registro (`eventi_mesi`), righe per pagina e intestazione delle esportazioni. 8.39 - pagina del registro (F5-A2, §7.11, §15.6, §8.1, D-31): `/registro` in sola lettura con `sistema.registro`, `GET /api/registro` (filtri combinabili, segmenti *Tutto · Anomalie aperte · Errori* con i conteggi degli altri filtri, ordinamento e pagine sul server, riferimenti a pratiche, documenti, bollettini, liquidazioni e utenti risolti dal server), `GET /api/registro/:id` e `GET /api/registro/export` in CSV con BOM (nessun evento: §15.2.6 non ha il codice); dettaglio in finestra con `prima`/`dopo` e *Stessa operazione*; voce *Registro* in Gestione; riquadro *Errori di oggi* in Oggi solo per chi ha `sistema.registro`; la rotta di esportazione di §15.6 si allinea a §8.1 (`/api/registro/export`). Il fuoco dei campi dei filtri è un bordo interno, non un `outline` esterno, che finirebbe sotto il menu aperto (tendine e ricerca). 8.38 - il sollecito di conferma copiato resta nel registro (F5-A1, §7.1, §15.2.3): `POST /api/solleciti/conferme {fornitore_id}` ricalcola le pratiche in ritardo e scrive l'evento `export.sollecito` (fornitore e numeri delle pratiche); nessuna migrazione, il codice sta in `SCHEMI`. 8.37 - pagina Oggi (F5-A1, §7.1, §8.1): `GET /api/oggi` (`provvigioni.consulta`) con i quattro riquadri che filtrano, i gruppi *Conferme in ritardo*, *Documenti da decidere* (vuoto, arriva con F6: `disponibile: false`), *Bollettini*, *Pagamenti da sollecitare*, le scadenze dei 15 giorni, le ultime 6 operazioni e il trimestre in corso; `GET /api/solleciti/conferme` con un testo per fornitore; pagina `/` con sagome, contatori dal vivo e gruppi aggiornati con *Ci sono aggiornamenti · Aggiorna*; finestre *Solleciti di conferma* e *Solleciti di pagamento* con *Copia il testo*; riquadro *Incasso del cliente* nella pratica (F3-A3) con *Sollecita il cliente* e *Segna come pagata/non pagata*. La copia dei solleciti di conferma non scrive un evento: §15.2.3 non ha un codice e non se ne inventa uno. 8.36 - correzione della quota del subagente sul documento (F1-A6, §4.2.7.2, §7.8, §8.1, D-27): `PUT /api/documenti-fiscali/:id/correzione` con `{tipo: pct|importo|nessuna, valore?, motivo}` (una per documento, upsert; motivo obbligatorio, max 2000) e `DELETE` (204) che la toglie; `provvigioni.modifica`, 404 inesistente, 400 non fiscale o valori non validi, 409 se il documento è in una liquidazione chiusa; una transazione (blocco fornitore → documento, V13), evento `crud.create`/`crud.update`/`crud.delete` su `correzione`; PUT risponde la correzione salvata. Il documento in `GET /api/liquidazioni` espone `correzione: {tipo, valore, motivo} | null`; nella scheda *Documenti* il pulsante *Correggi* / *Cambia la correzione* (a trimestre aperto e con `provvigioni.modifica`) apre la finestra; nel prospetto esportato la nota *Provvigioni particolari* elenca correzione e motivo. 8.35 - esportazione della liquidazione (F4-A3, §11, D-61): `GET /api/liquidazione/export?anno=&trimestre=&contenuto=completa|subagente|riepilogo&subagente=&formato=xlsx|pdf|csv` (`provvigioni.esporta`), con i medesimi fogli per Excel e CSV e il PDF ottenuto convertendo lo stesso `.xlsx` con LibreOffice (`SOFFICE`); pulsante *Esporta* nella pagina Liquidazioni; evento `export.export`; PDF anche nell'Analisi. I grafici come immagine nell'Excel restano fuori. 8.34 - la ricerca pratica per lo *Sposta* la fa il server (D-60, §7.3, §8.1): `GET /api/pratiche/cerca?fornitore_id=` con numero, cliente, data e stato; via il limite delle ultime 200 pratiche scaricate dal browser. 8.33 - pagine della pratica per D-60 (F2-A4, §7.3): riquadro *Pagamento del cliente* con il segno *Pagato*, card *Documenti* con ordini, conferme, proforma, pagamenti e allegati (fuori dal netto e dalla provvigione), registrazione a mano di ogni tipo con PDF o foto, PDF di tutti i documenti nel visualizzatore e *Sposta* in un'altra pratica dello stesso fornitore; la card fiscale passa a `Elenco`. 8.32 - guida in linea nell'app (F5-A8, §7.17): `/guida/:argomento` con i 17 argomenti del prototipo (senza *Vendita diretta*, D-08), ricerca in tutto il testo (anche nomi di pulsanti e finestre), schemi del ciclo, degli stati e degli incassi, argomenti di *Gestione* solo con il permesso, link alle pagine vere dell'app, contenuti in `lib/guida.ts`. 8.31 - aggiornamenti dal server (F4-A6, §16.4.2, D-23): `GET /api/eventi/flusso` in Server-Sent Events, `collegato`, con un solo ciclo ogni ~4 s che legge il registro mentre qualcuno è collegato (aree dai codici e, per i codici generici, dall'entità; nessun evento vecchio; battito ogni ~25 s). Nel guscio un solo `EventSource` per scheda; in Pratiche e Bollettini i contatori si aggiornano da soli, le righe restano e la barra *Ci sono aggiornamenti · Aggiorna* applica i dati nuovi mantenendo filtri, ordinamento, pagina e scorrimento. Nella scheda *Pratiche* del cliente completati i filtri standard (segmenti con conteggi, fornitore a selezione multipla, ricerca, riepilogo). 8.30 - scheda *Report subagenti* nelle Liquidazioni (F4-A4, §7.8): `GET /api/liquidazione/report?anno=&trimestre=&subagente=` con i numeri di `analisiTrimestre` per il trimestre e per quello prima; senza subagente l'elenco con quota e variazione sul trimestre prima, con un subagente i tre numeri con il confronto, le barre dei trimestri dell'anno già iniziati e i primi 5 clienti. Scheda con grafico, tabella, numeri e link ad Analisi; percentuali e variazioni calcolate dal server (V12). 8.29 - nota della segnalazione d'incasso in una colonna sua (D-62, §5.14, §7.3, §8.1): `PUT /api/documenti/:id/incasso` scrive `nota_incasso` e non tocca più `note` (la nota del documento); `statoIncasso` e `incassi` del dettaglio pratica la restituiscono. 8.28 - pagina Liquidazioni nell'app (F4-A1, §7.8): `/liquidazioni` rimanda al trimestre di oggi, `/liquidazioni/<anno>/<trimestre>` con i quattro riquadri, l'elenco dei subagenti che fa da filtro, la scheda *Documenti* (contatore giallo con documenti in attesa, storni e riaccrediti con la fattura d'origine) e *Chiudi il trimestre* con conferma; `GET /api/liquidazioni` restituisce anche `documenti` con i nomi risolti e le etichette decise dal server (V12); la fotografia di un trimestre chiuso contiene le righe dei documenti, quindi il prospetto pagato si rilegge uguale (§4.2.19); il link *Analisi completa* passa periodo e subagente all'Analisi, che ora li legge dall'indirizzo (§7.22). Restano F4-A3 (export, PDF compreso) e F4-A4 (scheda *Report subagenti*). 8.27 - pagina Analisi (F4-A5, §7.22): numeri, grafici e tabella calcolati dal server con `fattiAnalisi` (competenza per data del documento, D-19), periodo di 3/6/12 mesi, filtri a selezione multipla con le voci proposte dagli altri filtri (D-23), filtro incrociato da barre e righe, tabella raggruppabile, esportazione Excel e CSV (`GET /api/analisi`, `GET /api/analisi/esporta`); il PDF e i grafici come immagine arrivano con F4-A3 (D-61). 8.26 - incassi dei clienti sul server (F3-A3, parte autonoma): lo stato d'incasso entra nel dettaglio della pratica (`incassi` per fattura, §7.3); `pagamentiDaSollecitare` nel motore ed esposto da `GET /api/pagamenti/solleciti` (voci + un testo per cliente composto dal server, come la contestazione D-58); `PUT /api/documenti/:id/incasso` (*Segna come non pagata/pagata*, fonte manuale, evento `stato.change_state` sul documento §15.2.5) e `POST /api/pagamenti/solleciti` (il testo è stato copiato: `solleciti +1`, `sollecitata_il=oggi`, evento `documento.export`). Restano le pagine (gruppo *Pagamenti da sollecitare* in Oggi F5-A1, finestra dei solleciti, riquadro *Incasso del cliente* §7.3) e l'evento sul documento alla verifica di un bollettino con storno/riaccredito. 8.25 - documenti della pratica per ogni fornitore (D-60, server): tipi ordine (1..n, si sommano), conferma e proforma facoltative (l'una o l'altra porta a *confermata*, la fattura a *fatturata* anche senza), fattura e nota di credito (le sole che toccano le provvigioni), pagamento (segno *pagato*, nessun effetto sui numeri), altro; ordine e conferma tolti dalla testata, righe sul loro documento; numero pratica `OF/AAAA/NNN` dal server; `POST /api/documenti/:id/abbina` (tipo e pratica scelti a mano, l'ordine senza pratica la apre) e `POST /api/pratiche/:id/documenti/:did/sposta`; canale con PDF, JPEG e PNG, Excel rifiutati (415); archivio per pratica `pratiche/AAAA/AAAAMM/<numero>/<tipo>_<numero o data>.<est>` dopo il commit (sostituisce D-55); `pagato` nel dettaglio e nell'elenco delle pratiche. 8.24 - nella cerniera dei bollettini la colonna *Differenza* si adatta ai valori fino a 999.999.999,99 € (minimo 230 px, a capo vietato), allineata fra riepilogo e righe. 8.23 - caricamento con sagome (D-59): titolo della pagina subito, il resto come sagome con la forma del contenuto finché i dati non arrivano (niente zeri, «Nessun elemento» o testi vuoti), stesse altezze e luce che scorre; sotto i ~150 ms non compaiono; ai cambi di filtro la tabella resta, più tenue. Componenti `Sagoma`, `SagomaTabella`, `SagomaSegmenti`, `SagomaRiquadri`, `SagomaMatrice`, `SagomaElenco`, hook `useSagome`, `DataTable`/`FilterBar` con `caricando`; guida §16.4.3. 8.22 - ritocchi al dettaglio del bollettino (F3-A2b, D-58): con righe aperte la barra dice *Mancano N righe da decidere* e *Vai alla prima* porta alla prima riga di *Da decidere* evidenziandola; *Abbina il documento* cerca fra fatture e note di credito del fornitore di ogni periodo (`GET /api/documenti/cerca`, con `su_riga` per quelle già usate); sotto gli 860 px la cerniera si impila con le etichette e i pulsanti a tutta larghezza; *Prepara la contestazione* (`GET /api/bollettini/:id/contestazione`) con testo dal server e modificabile, *Copia* e *Scarica .txt*, nessuna email. 8.21 - liquidazioni nell'app (F4-A1, server): `GET /api/liquidazioni?anno=&trimestre=` con i quattro trimestri (stato e totale), i subagenti con i totali, il riepilogo e se il trimestre si può chiudere; il trimestre chiuso si legge dalla fotografia; `POST /api/liquidazioni/:anno/:trimestre/chiudi` (`provvigioni.chiudi`) con trimestre finito e nessun documento in attesa dei bollettini, blocco di tutti i fornitori in ordine di id, fotografia, documenti e voci legati, evento `stato.change_state` (§15.2.6); le voci di storno già liquidate restano nel loro trimestre (D-57). 8.20 - pagina del bollettino nell'app (F3-A2): cerniera con gruppi *Da decidere · Decise · Quadrano · Incassi*, totali e azione proposta in alto; decisioni *accettato/contestato/attendere* con motivo (obbligatorio per contestare), documento mancante in `bollettini_attese` (D-56) e annullamento; abbinamento a mano a un documento del mese scelto fra quelli del dettaglio; chiusura *verificato/contestato* solo quando l'azione è *verifica/contesta*, con conferma che il mese diventa chiuso e pagina in sola lettura; PDF del bollettino affiancato; ritorno alla matrice nello stesso punto. 8.19 - matrice dei bollettini nell'app (F3-A1): `GET /api/bollettini?al=AAAA-MM&fornitori=1,2&vista=tutti|dafare` con 6 mesi che finiscono in `al`, stato per cella (atteso, non arrivato, arrivato, verificato, contestato, mese in corso, nessuna fattura) e totale riconosciuto in SQL (D-52); conteggi dei segmenti sui fornitori filtrati (D-23); `POST /api/bollettini {fornitore_id, anno, mese, arrivo_id?}` con fornitore bloccato, un solo bollettino per fornitore e mese (409), PDF dal canale comune e evento §15.2.5 nella stessa transazione; pagina con `PeriodoMesi`, filtro fornitore a selezione multipla, matrice che scorre di lato sul tablet; dettaglio segnaposto fino a F3-A2. 8.18 - dettaglio del bollettino nell'app (F3-A2): `GET /api/bollettini/:id` con la cerniera dal motore caricando solo i dati del bollettino; decisioni sulle righe e sui documenti mancanti (tabella `bollettini_attese`, D-56), abbinamento a mano di una riga a un documento, chiusura `verificato`/`contestato` con congelamento e periodo chiuso (D-51), eventi §15.2.5. 8.17 - dettaglio della pratica veloce: `GET /api/pratiche/:id` carica solo i dati della pratica (`caricaDatiPratica`, D-52, §7.3), stessa risposta, prova di coerenza su ogni pratica del seed. 8.16 - dettaglio pratica nell'app (F2-A2): `GET /api/pratiche/:id` con testata, stato, binario delle fasi, righe a confronto, provvigione e azione proposta calcolati dal motore; `GET /api/documenti/:id/file` legge il percorso solo dal database (D-55) e serve il PDF in linea e in sandbox; pagina con binario, schede *Riepilogo* (provvigione, documenti fiscali) e *Righe a confronto*, avviso delle variazioni e apertura sul confronto arrivando dal filtro *Con variazioni*; finestre della fattura e della nota di credito con il PDF; versione 8.15 - PDF in cartelle per anno e giorno di caricamento (D-55): `DOCUMENTI_DIR/AAAA/AAAAMMGG/<impronta>.pdf`, percorso salvato in `documenti_in_arrivo.file_percorso`; versione 8.14 - documenti fiscali della pratica e canale comune dei file (F2-A3, D-54): `GET/POST/PUT/DELETE /api/pratiche/:id/documenti` con netto e totali dal server, importo digitato positivo (la nota di credito si salva negativa), storno totale calcolato dal server, nota di credito non oltre quanto resta della fattura, numero unico per fornitore; `POST /api/documenti/carica` con un solo ingresso `riceviDocumento` (PDF dal contenuto, limite `DOCUMENTI_MAX_MB`, file su disco prima della transazione con l'impronta come nome, coda `in_coda`); versione 8.13 - il menu delle aree passa nel menu dell'utente (D-53): in cima alla barra resta il nome dell'area, in fondo il riquadro dell'utente che apre verso l'alto email, aree, Cambia la password, Guida ed Esci; versione 8.12 - elenco pratiche in SQL (D-52): stato, importo e variazioni ricavati dal motore e salvati sulla pratica con `aggiornaPratica` nella stessa transazione di ogni modifica; scadenza della conferma e subagente alla data calcolati nella query; versione 8.11 - aree in un menu a tendina nella barra (come un menu di account: email in cima, voci con icona e spunta sull'area aperta); versione 8.10 - pagina Pratiche nell'app (F2-A1): elenco con segmenti di stato e conteggi dal server, filtri standard, ordinamento e pagine sul server, variazioni con lo scostamento in euro; versione 8.9 - pagine delle percentuali datate e delle eccezioni personali nell'app (F1-A5): versioni in ordine (in vigore, future, passate) con *Correggi* ed *Elimina*, eccezioni con periodo e *Cambia la %*/*Termina*; versione 8.8 - un cambio vale da una data in poi, mai nel periodo chiuso (D-51): `ultimaChiusura` del fornitore, versioni delle percentuali anche fra due esistenti, correzione ed eliminazione dopo l'ultima chiusura, eccezioni personali con periodo proprio (fornitore, sconto, dal, al) senza copie, cambio di % e fine; versione 8.7 — sincronizzazione da Integra (F1-A4): colonne delle viste, margine di un giorno, disattivati esposti, anomalie `integra.*`, ponte finto `decobrands_ponte_prova`; versione 8.6 — percentuale e regola mensile dell'agenzia solo al responsabile (D-50), sconti proposti dagli scaglioni, filtri a ricerca multipla negli elenchi di Clienti e Fornitori; versione 8.5 — arrotondamento contabile al centesimo e decisione salvata sulla riga del bollettino (D-49); versione 8.4 — schema completo (fase 2a): CHECK dei valori ammessi che mancavano (§4.2); **identità e versioni delle anagrafiche già nello schema**, la sincronizzazione delle versioni resta in F1 (§4.6, D-48); tabelle §4.2, §4.3 e §4.4 allineate (`cliente_id` + versione al posto di `cliente_piva`, `codici_esterni` al posto di `codice_integra`); versione 8.3 — **menu per area** (D-47, §7.10): in cima alla barra le aree che l'utente può aprire (Provvigioni, Dati, Gestione), sotto solo le voci dell'area della pagina; l'area *Anagrafiche* diventa **Dati** (permessi `dati.*`, migrazione `area_dati`); *Documenti scartati* passa in Provvigioni, la *Guida* è comune a tutte le aree; sul tablet la barra va su due righe; versione 8.2 — **nessuno dà più di quello che ha** (D-45): in ogni area si concede al massimo il proprio livello, niente aree che non si hanno, niente gestione di chi è più in alto (il superutente sì); finestra utente con i livelli a segmenti, scheda *Permessi* a sezioni richiudibili per area (§8.3, §7.13); versione 8.1 — **ruoli per area** (D-45, §8.3): ruolo di Sistema (superutente, amministratore, utente) e, per ogni area (Anagrafiche, Provvigioni, domani Vendite), un livello lettura · operatore · responsabile; permessi `area.attività`; versione 8.0 — **anagrafiche con identità e versioni** (D-46, §4.6): id nostro stabile, codici di Integra in una tabella di collegamento, versioni che si aggiungono soltanto; i fatti (documenti, righe, bollettini, liquidazioni) puntano a identità **e** versione con chiave composta, le configurazioni solo all'identità; versione 7.9 — pagina Utenti nell'app; `GET /api/utenti/ruoli` (tabella *Cosa può fare ogni ruolo* dal server); *Reimposta la password* restituisce l'utente con l'esito dell'invio; colonne con `--colonne` che si impilano sul tablet (§8.3, §16.4); versione 7.8 — **niente telefono**: l'app è per computer e tablet; sotto i 744 px di larghezza si ferma subito, anche prima dell'accesso, con una pagina che chiede un computer o un tablet (V6, §16.6, D-44); versione 7.7 — pagina di accesso nell'app come nel prototipo; chiudendo la finestra (Esc, clic fuori, 2 minuti senza toccare nulla) il modulo riparte vuoto (§7.0, D-42); versione 7.6 — il CRM è il primo pezzo del **Sistema Informativo Aziendale** Decobrands: sottotitolo nuovo, in fondo all'accesso licenza d'uso e copyright con la finestra *Licenza d'uso*; Esc o un clic fuori dalla finestra di accesso tornano al logo (§1, §7.0, D-42, D-43); versione 7.5 — nuova pagina di accesso: tutta scura come la barra, logo al centro, il modulo si apre in una finestra al primo tasto o tocco; *Password dimenticata* cambia il contenuto della stessa finestra (§7.0, §16.4, D-42); versione 7.4 — limite ai tentativi per persona e, più largo, per IP, con valori nel `.env` e finestra che si azzera da sola (§3.3, D-41); versione 7.3 — API degli utenti con le regole di §7.13 sul server ed eventi §15.2.1.1; prove su un database a parte `decobrands_test` (§16.5, D-40); versione 7.2 — guscio dell'app (barra per ruolo da `GET /api/accesso/io`, sola lettura, Pagina riservata); `stile.css`: sul telefono la barra scorre da sola, senza allargare la pagina; versione 7.1 — pagine di accesso (§7.0, componente `CRM.Accesso`, campi `password` e `casella` del Form), pagina Utenti con nome utente, superutente e *Reimposta la password*, niente Microsoft 365 in Impostazioni (D-39); versione 7.0 — accesso con nome utente (o email) e password come nella Gestione Ordini, superutente che crea gli amministratori, password provvisoria e password dimenticata; tolti Microsoft 365 e il link di accesso (§3.3, §4.2.18, §7.13, §8.3, §15.2.1, D-39 sostituisce D-30); versione 6.3 — guard unico con `@Richiede`/`@Pubblica` (rotta senza dichiarazione negata), CSRF dal token di `GET /api/accesso/io`, nessun CORS (stessa origine) (§3.3, §8.3); versione 6.2 — `logEvent(tx, …)` e `logEventSicuro()`, schemi per codice, codice dell'errore 500 = `operazione_id` dell'evento (§15.2.7, §15.3–§15.4); versione 6.1 — utente corrente `GET /api/accesso/io`, ruolo riletto dal database a ogni richiesta, sessione rigenerata all'accesso, ritorno alla pagina chiesta (§8.3, D-38); versione 6.0 — schema snellito: tolti `ordinamento`, `cliente_ragione_sociale`, `conferma_scadenza` (calcolata), `dati_letti` e l'affidabilità del documento; migrazioni unite in una sola `iniziale` (D-37); versione 5.9 — V13: ogni operazione che scrive su più tabelle sta in una sola transazione, con blocco della riga sulle chiusure (§2, D-36); versione 5.8 — interscambio con periodi di validità, scaglioni a soglia, P.IVA dei clienti non univoca, chiusura del bollettino e storni legati al trimestre liquidato, prova automatica dei vincoli (D-35); versione 5.7 — revisione dello schema: un solo subagente attivo per cliente × fornitore, righe del bollettino legate al documento, documenti legati al trimestre liquidato e la nota di credito alla fattura, niente copie nella pratica e nel bollettino, nomi in italiano, file su disco (D-34); versione 5.6 — schema completato: `liquidazioni`, `clienti` da Integra, `sessioni` per utente, FK verso `utenti` nei documenti (§4.2.18–§4.2.20, §4.3, D-33); versione 5.5 — database `decobrands_db` sull'istanza PostgreSQL locale (V2, §3.4, §16.3); versione 5.4 — CRM staccato dalla Gestione Ordini: database e utenti propri, la Gestione Ordini si ingloberà con la vendita diretta (§1, V2, §4.1, §17, D-29); accesso misto con Microsoft 365 o link via email, solo su invito, senza password (V3, §3.3, §4.2.18, §7.13, §7.15, §8.3, §15.2.1, D-30); **registro unico** di eventi e anomalie con campi comuni e dettaglio JSON controllato per codice, Stato del sistema come vista del registro (V10, §4.2.11, §4.2.15, §7.11, §7.14, §15, D-31); viste di Integra lette da un database PostgreSQL ponte (§4.5, D-32); versione 5.3 — confronto con la nota di credito: solo le righe stornate, differenza = importo stornato (§7.3); FinestraAffiancata a tutto schermo sui telefoni (§16.4); versione 5.2 — **regola V12: ogni calcolo e operazione sensibile solo sul backend, mai da dati del frontend** (§2, §16.5, D-28); versione 5.1 — regole del subagente per cliente e per documento: % dell'agenzia, una fattura al mese, correzione sul documento con motivo (§4.2.6, §4.2.7.2, §5.2, §7.6, §7.8, §8.1, §10, §15.2.3, D-27); versione 5.0 — fotografia delle righe registrata nel cambio di stato della pratica, senza l'azione `snapshot_righe` (§15.2.4); percentuali dei fornitori con data di validità e calcolo per documento alla sua data; eccezioni personali dei subagenti inserite nel CRM; rotte delle pagine come il prototipo ufficiale; tolti i filtri vecchi della liquidazione; formula §10 sul netto dei documenti (§4.2.2, §4.2.3, §5.2, §5.11, §7, §7.5, §7.8, §8.1, §10, §13, §15.2.2, D-25, D-26); versione 4.9 — il **prototipo ufficiale** è `prototipo-alternativo/` (struttura, stile senza Bootstrap, componenti, testi, numeri); `prototipo-crm/` resta come archivio (V4, §3.1, §7.10, §16.1, §16.3, §16.4, D-24); versione 4.8 — **filtri standard** in tutte le barre: entità sempre con ricerca a selezione multipla, riepilogo e azzeramento a icona (Pratiche, Bollettini, Cliente → Pratiche, Analisi); numeri dei segmenti aggiornati dal vivo con gli altri filtri; contatori aggiornati dal vivo ai cambiamenti dei dati, tabelle su richiesta (§16.4.1, §16.4.2, D-22, D-23); versione 4.7 — filtri dell'Analisi su una riga con il periodo; campo a selezione multipla che mostra il nome della sola voce scelta o *Filtro multiplo (n)* e apre il menu con in alto le voci scelte; icone *Riepilogo dei filtri* (riquadro con tutti i filtri) e *Togli tutti i filtri* (§7.22, §16.4, D-21); versione 4.6 — campi di ricerca con **selezione singola o multipla** (stesso componente della ricerca articoli: etichette nel campo, ✓ nel menu, caselle nella maschera); filtri fornitori, subagenti e clienti dell'Analisi a selezione multipla (§7.22, §16.4, D-20); versione 4.5 — liquidazioni: tornano le due colonne (subagenti | documenti); nel pannello di destra le schede *Documenti* e *Report subagenti*; nuova pagina **Analisi** con la BI completa: periodo di 3, 6 o 12 mesi, filtri fornitore / subagente / cliente, filtro incrociato con un clic su grafici e righe, confronto con il periodo precedente, tabella raggruppabile, esportazione Excel con grafici, PDF e CSV (§7.8, §7.22, §16.4, D-18, D-19); versione 4.4 — liquidazioni: scheda *Sintesi* con numeri e grafici (fatturato, provvigioni, margine, fornitori, subagenti) prima del dettaglio; componente Grafico con Chart.js (§7.8, §16.4, D-17); versione 4.3: bollettini: sempre 6 mesi con selettore a mesi (anno + griglia, scorciatoie) e completamento automatico (§7.7, componente PeriodoMesi §16.4, D-16); versione 4.2: documenti: dettaglio a schede con prima l'azione proposta e poi le righe lette (§7.9, D-15); versione 4.1: bollettini: periodo Da–A di al massimo 6 mesi, filtro fornitore e *Con qualcosa da fare* (§7.7, D-14); versione 4.0: pratica a schede *Riepilogo* · *Righe a confronto* con avviso delle variazioni, niente percorso nelle pagine di dettaglio (§7.3); **registro delle decisioni con il loro perché** (§19) e regola di consegna (§16.5); versione 3.9: incassi dei clienti descritti nelle pagine: riquadro Pagamenti in Oggi, Incasso del cliente nella pratica, giorni per l'incasso nel fornitore, filtro Non pagate nel cliente, finestra Solleciti di pagamento (§7.1, §7.3, §7.4, §7.6, §5.14); versione 3.8: storno alla liquidazione successiva: mese per Decobrands, trimestre per il subagente con voce negativa; incassi dei clienti nel prototipo (§5.14, §7.8); versione 3.7: Stato del sistema: da dove vengono i dati di ogni servizio, come si calcola lo stato, catalogo dei problemi, vita di un problema, interfacce del server (§7.14.1–§7.14.5, §4.2.15); versione 3.6: incassi dei clienti: insoluti, storni e riaccrediti sul fatturato, riconoscimento al pagamento sul maturato, solleciti di pagamento ai clienti (§5.5, §5.14, §6.2, §7.7); versione 3.5: guida in linea completa: panoramica con schema del ciclo, comandi comuni, per ogni pagina passi, pulsanti e finestre (§7.17); versione 3.4: paginazione delle tabelle con ordinamento e totali su tutto l'elenco (§16.4); versione 3.3: scheda cliente con le schede *Agenzie* e *Pratiche* filtrabili (§7.6); versione 3.2: la **vendita diretta** (ordini cliente, articoli, giacenze, alias e kit) è un **ampliamento futuro**: progettata e conservata nel prototipo ma spenta (§17); come distinguere fra documenti dell'agenzia e ordini della vendita diretta nell'ingresso unico dei documenti (§17.2); versione 3.1: componente **Schede** (§16.4) e suo uso dove una scheda impilava più tabelle: esportazione per Integra (§7.18), fornitore (§7.4), utente (§7.13), colonna destra di Oggi (§7.1), Alias e kit (§7.21); versione 3.0: vendita diretta dalla Gestione Ordini: ordini cliente con esportazione per Integra (Ordine cliente e Ordine fornitore), articoli, giacenze con impegni, alias e kit (§7.18–§7.21, §4.2.16–§4.2.17); dati di Integra letti da viste sul database con sincronizzazione ogni pochi secondi, al posto dell'import da file (§4.1, §4.5); versione 2.9: idee e strumenti per il supporto alle decisioni con modelli linguistici e decisioni tipizzate, fase successiva (§18); pagine di gestione: utenti e ruoli (con sola lettura), stato del sistema, impostazioni, documenti scartati, guida (§7.13–§7.17, §8.3); esportazione della liquidazione: completa, un subagente, solo riepilogo, in Excel, PDF o CSV (§11); liquidazione con elenco subagenti che regge qualsiasi numero di subagenti (§7.8); bollettino atteso entro un giorno fissato per fornitore, sollecito solo dopo (§4.2.1, §5.6); pagina Oggi per gruppi di lavoro con solleciti per fornitore (§7.1); **Stato:** validata con il cliente; anagrafiche clienti e fornitori da Integra in sola lettura, schermata Clienti con le agenzie (§4.1, §7.6); ritorno alla schermata precedente nello stesso punto (§7.12); documenti della pratica consultabili affiancati al confronto (§7.3); evidenziazione del valore nel documento **da verificare** con prova di fattibilità (§6.6); stack allineato al Portale B2B Luis (§16.3); componenti standard (§16.4); ingresso documenti interno senza n8n, lettura con GLM-OCR in locale (§6.5); sostituzione della Gestione Ordini pianificata in una fase successiva (§17)
**Fonte:** `ANALISI_CRM_PROVVIGIONI.md` (analisi) + risposte di Matteo Caironi (Sales Assistant)

---

## 1. Contesto e obiettivi

L'applicazione porta dentro al sistema di Decobrands tre processi oggi seguiti
al di fuori di esso (Excel manuali):

1. **Tracciamento automatico** del percorso *ordine → conferma d'ordine → fattura* per gli
   ordini che Decobrands emette verso i propri fornitori.
2. **Controllo dei bollettini** delle provvigioni riconosciute dai fornitori, verificando
   che gli importi siano corretti.
3. **Liquidazione dei subagenti** ogni trimestre, con dati certi e calcolati al volo.

Le tre funzioni vivono nella **stessa applicazione**: sono lo stesso dato — un ordine di
Decobrands — osservato da tre angolazioni (pratica, bollettino, liquidazione).

Il flusso delle provvigioni va in **due direzioni** con percentuali indipendenti:

```
FORNITORE  ──provvigione agente──►  DECOBRANDS  ──provvigione subagente──►  SUBAGENTE
           (obiettivo 2: da controllare)         (obiettivo 3: da liquidare)
```

L'applicazione **condivide il database** con la gestione degli ordini di Decobrands:
stesso PostgreSQL, le stesse tabelle esistenti vengono **riusate senza modificarle**
e il CRM aggiunge le proprie tabelle (§4). Ordini, clienti, articoli e utenti sono
quindi gli stessi dati già visti dalla gestione ordini.

**Tutti i documenti del CRM** — ordini a fornitore, conferme, fatture, note di
credito e bollettini — entrano da un **ingresso documenti interno** all'applicazione
(§6.5): lettura della casella email o caricamento manuale → coda nel database →
lettura automatica con **GLM-OCR installato su un server locale con GPU** →
affidabilità per campo e controlli → **controllo dell'operatore** con il PDF a fianco →
abbinamento alla pratica o al bollettino. **Nessun n8n e nessun servizio di lettura
esterno**: tutto il flusso è codice del CRM, versionato con git.

La **Gestione Ordini** attuale resta in esercizio, invariata e **separata**, per gli ordini
cliente e l'esportazione verso Integra: il CRM non ne usa né gli utenti né le tabelle
(D-29). La sua **sostituzione** con un modulo del CRM, che userà lo
stesso ingresso documenti, è prevista in una **fase successiva** (§17), fuori da questo
preventivo.

---

## 2. Vincoli e requisiti generali

| # | Vincolo | Valore |
|---|---------|--------|
| V1 | Unica applicazione | Tutte le funzioni in un'unica applicazione web |
| V2 | Database proprio | PostgreSQL con un database **proprio del CRM** (`decobrands_db`): **nessuna tabella della Gestione Ordini**, né in lettura né in scrittura (D-29). Clienti e fornitori arrivano dalle viste di Integra nel database ponte (§4.5, D-32). I documenti del CRM entrano dall'**ingresso documenti interno** (§6.5), non dalla pipeline n8n della Gestione Ordini |
| V3 | Accesso | Si entra con **nome utente (o email) e password**, come nella Gestione Ordini; gli utenti li crea il superutente (amministratori) o un amministratore (operatori, sola lettura); password provvisoria per email da cambiare al primo accesso, password dimenticata con link monouso; sessione su cookie HttpOnly/Secure/SameSite + protezione CSRF (§3.3, D-39) |
| V4 | Stile grafico | Quello del prototipo ufficiale `prototipo-alternativo/` (D-24): `stile.css` con la palette Decobrands (primario `#0d6efd`, scuro `#212529`, sfondo `#f5f6f8`, stessi colori della Gestione Ordini), carattere Public Sans, barra laterale scura con logo; niente Bootstrap |
| V5 | Lingua | Tutte le interfacce in italiano |
| V6 | Schermi | **Computer e tablet**, niente telefono: sotto i **744 px** di larghezza l'app si ferma subito, anche prima dell'accesso, e chiede di usare un computer o un tablet (§16.6, D-44) |
| V7 | Stack | **Stesso stack del Portale B2B Luis**: Node 24, frontend Next.js 16 (App Router) + React 19 + TypeScript, backend NestJS 11, ORM Prisma 7 (adapter `pg`), PostgreSQL (V2). Due processi Node dietro Caddy; Docker solo in sviluppo (§3.4) |
| V8 | Fidelità | Alta fedeltà — dati reali, interazioni reali |
| V9 | Contenitori dati stabili | Ogni tabella è una **DataTable standard** (§16.4): occupa tutto lo spazio disponibile, intestazione fissa, righe scorrevoli, intestazioni ordinabili; il layout non cambia al variare del numero di righe |
| V11 | Lettura documenti in locale | **GLM-OCR** servito da **vLLM** su un server aziendale con GPU, chiamato direttamente dal backend NestJS; nessun n8n, nessun servizio esterno; i documenti non escono dall'azienda (§6.5) |
| V10 | Registro unico | Eventi applicativi (CRUD, cambi di stato, upload/export, accesso) e **anomalie** (errori dell'app, problemi dei servizi, errori di lettura, dati di Integra scartati) in **una sola tabella** `registro` (§4.2.11), con campi comuni e dettaglio JSON controllato per codice; consultabile da `/registro` (§7.11, §15, D-31) |
| **V12** | **Calcoli e operazioni sensibili solo sul backend** | **Ogni calcolo e ogni operazione sensibile si esegue sul server partendo dai dati del database, MAI da dati presi dal frontend**: il client mostra e invia solo le scelte dell'utente (vedi la regola qui sotto, D-28) |
| **V13** | **Una operazione, una transazione** | Ogni operazione che scrive su più tabelle (o più righe legate) sta in **una sola transazione**, registro compreso; email e servizio di lettura solo dopo il commit (regola qui sotto, D-36) |

> ⚠ **REGOLA FONDAMENTALE — tutto sul backend, MAI dai dati del frontend (V12, D-28).**
> Ogni calcolo e ogni operazione sensibile si esegue **sul server (NestJS)**, partendo **solo
> dai dati del database**. Il frontend **mostra** i risultati e **invia soltanto le scelte**
> dell'utente (id, valori digitati, motivo); il server **non usa mai** importi, percentuali,
> totali, stati, permessi o utente arrivati dal browser.
> - **Calcoli**: provvigioni, scaglioni ed eccezioni, regole del subagente, netto dei
>   documenti, differenze dei bollettini, liquidazione, storni, Analisi, totali delle
>   tabelle, esportazioni (Excel/PDF/CSV generati dal server).
> - **Operazioni sensibili**: cambi di stato, verifiche e chiusure (bollettino, trimestre),
>   abbinamenti, correzioni, permessi (`requirePermesso`), utente e data dell'evento,
>   registro eventi.
> - Ogni richiesta che modifica qualcosa **ricarica dal database** ciò che serve, **ricontrolla**
>   regole, vincoli e permessi e **ricalcola**; un valore calcolato mandato dal client si
>   ignora (o la richiesta si rifiuta), mai si salva.
> - Il prototipo calcola nel browser **solo perché è una dimostrazione senza server**: non è
>   un modello da copiare.
>
> **Perché**: dal browser chiunque può cambiare qualsiasi valore; le provvigioni sono soldi e
> il registro deve essere vero.

> ⚠ **V13 — Una operazione, una transazione (D-36).** Ogni operazione che scrive su **più di
> una tabella**, o su più righe che devono restare coerenti, si esegue in **una sola
> transazione** del database: o si salva tutto o niente.
> - Nel backend: `prisma.$transaction(async (tx) => { … })`, e **tutte** le letture e scritture
>   dell'operazione passano da `tx`, compresa la riga di `registro` (§15.3).
> - Esempi: abbinare un documento (documento in arrivo + pratica + documenti + registro);
>   verificare un bollettino (righe congelate + stato + `chiuso_il` + incassi + registro);
>   chiudere un trimestre (`liquidazioni` + `liquidazione_id` su documenti e storni +
>   registro); cambiare il subagente di un cliente (chiudere il periodo vecchio e aprire il
>   nuovo); disattivare un utente (utente + sessioni + registro).
> - Le operazioni che decidono su uno stato (chiusure, verifiche, abbinamenti) **bloccano la
>   riga** che controllano (`SELECT … FOR UPDATE`) prima di ricontrollarla: due persone che
>   chiudono lo stesso trimestre insieme non devono riuscirci entrambe.
> - Fuori dalla transazione, **dopo** il commit, solo gli effetti che il database non può
>   annullare: invio di email, chiamate al servizio di lettura. Un file su disco si scrive
>   **prima**, con l'impronta come nome: se la transazione fallisce resta un file orfano che
>   la pulizia toglie, mai una riga che punta a un file che non c'è.
> - Transazioni brevi: niente attese di rete o dell'utente dentro la transazione.
>
> **Perché**: un'operazione a metà (trimestre chiuso senza documenti segnati, storno
> contato due volte, bollettino verificato senza data di chiusura) lascia provvigioni
> sbagliate che nessuno vede; i vincoli del database (§4.2) reggono solo se ogni passo
> intermedio sta nella stessa transazione.

---

## 3. Architettura dell'applicazione

### 3.1 Struttura

L'applicazione è organizzata in viste che corrispondono alle schermate della sezione §7:

```
prototipo-alternativo/            # prototipo ufficiale (D-24): pagina unica, rotte #/percorso
  index.html                      # barra laterale a gruppi + area della pagina
  assets/stile.css                # stile (palette Decobrands, Public Sans), nessun Bootstrap
  assets/componenti.js            # libreria dei componenti standard CRM.* (§16.4) + rotte + memoria
  assets/motore.js                # regole e calcoli (§5, §10)
  assets/dati.js                  # dati dimostrativi = seed (§12)
  assets/entita.js                # entità dei campi di ricerca
  assets/viste-giorno.js          # Oggi, Documenti, Pratiche, Pratica
  assets/viste-periodo.js         # Bollettini, Bollettino, Liquidazioni (con Report subagenti)
  assets/viste-analisi.js         # Analisi (BI)
  assets/viste-anagrafiche.js     # Fornitori, Subagenti, Clienti con agenzie
  assets/viste-gestione.js        # Utenti e ruoli, Stato del sistema, Impostazioni, Scartati, Guida
  assets/viste-vendita.js …       # vendita diretta (spenta, §17)
  assets/esporta-*.js             # esportazioni Excel / PDF / CSV
  assets/guida.js                 # testi della Guida in linea
  assets/viste-componenti.js      # catalogo dei componenti (#/componenti)
```

Componenti condivise:

- foglio di stile comune (`stile.css` del prototipo ufficiale, V4);
- libreria dei componenti standard (§16.4);
- dati dimostrativi (interamente lato client);
- motore di calcolo provvigioni/bollettini (§10).

### 3.2 Avvio

L'architettura di esercizio (frontend Next.js + backend NestJS/Prisma, PostgreSQL,
autenticazione, upload documenti, lavori pianificati) è descritta in §3.3, §3.4 e §8; riprende le
stesse funzioni del prototipo e ne mantiene stile, componenti e layout (V4, §16.1).

L'implementazione di collaudo resta **consultabile senza server**: si apre `index.html`
direttamente nel browser (`prototipo-alternativo/index.html`); nessun `npm install`, nessuna
porta, nessuna risorsa esterna: carattere, icone e librerie sono nella cartella. I calcoli provvigioni e le differenze bollettini sono eseguiti **lato client** dal
motore della sezione §10 su dati dimostrativi.

### 3.3 Autenticazione e autorizzazione

Si entra con **nome utente (o email) e password**, come nella Gestione Ordini di Decobrands
(D-39). Gli utenti li crea chi amministra: nessuno si registra da solo. Da Luis si riprendono
solo sessioni, CSRF, Helmet, throttler e guard.

- **Utenti propri del CRM** (`utenti`, §4.2.18): nessun legame con la Gestione Ordini (D-29).
- **Superutente**: uno solo, creato all'installazione con un comando del server (nome utente,
  nome, email). Crea e gestisce gli **amministratori**; non si modifica, non si disattiva e
  non si elimina dall'interfaccia.
- **Amministratori**: creano e gestiscono operatori e utenti in sola lettura (non altri
  amministratori).
- **Nuovo utente**: chi lo crea scrive nome utente, nome, email e ruolo; il CRM genera una
  **password provvisoria** e la manda per email (*benvenuto*). Al primo accesso la password
  va **cambiata**: prima non si apre nessuna pagina.
- **Password**: almeno 8 caratteri, nessuna regola di composizione (ASVS 5.0, 6.2.5);
  salvate solo come hash **scrypt** con sale (libreria standard di Node, `node:crypto`), mai
  in chiaro, mai nel registro né nel log.
- **Password dimenticata**: si scrive l'email e arriva un link monouso valido **1 ora**; nel
  database si salva solo l'impronta del codice (SHA-256, `accessi_link`). La risposta è
  sempre la stessa, così non si scopre chi è registrato. L'amministratore può anche
  mandare una **nuova password provvisoria** (*Reimposta la password*, §7.13).
- **Resta collegato** (casella della pagina di accesso): sessione di 30 giorni; senza, la
  sessione finisce alla chiusura del browser.
- Sessioni server-side in PostgreSQL (`express-session` + `connect-pg-simple`).
  Disattivare un utente chiude le sue sessioni; cambiare la password chiude le **altre**
  sessioni dello stesso utente.
- **Inattività**: la sessione si chiude dopo **30 minuti** senza richieste (`SESSION_TIMEOUT_MINUTI`,
  anche con *Resta collegato*, che allunga solo la durata massima a 30 giorni). La connessione degli
  aggiornamenti (SSE) **non** conta come attività. *Perchè* (D-89): un computer lasciato aperto in
  ufficio non deve restare collegato tutto il giorno; alla prima richiesta si torna all'accesso.
  Non contano le richieste che il browser fa da sé (polling di *Stato del sistema*, riletture su
  evento SSE, intestazione `x-automatico`), altrimenti una scheda aperta in un ufficio attivo non
  farebbe mai scadere la sessione; i 30 giorni di *Resta collegato* sono un tetto massimo
  dall'accesso, non un rinnovo continuo, così un cookie rubato non vive oltre 30 giorni.
- Messaggio unico per nome utente sbagliato, password sbagliata o utente disattivato
  ("Credenziali non valide"): non dice chi esiste.
- Limite ai tentativi su accesso, password dimenticata, link e cambio password, in due livelli
  (D-41): **per persona** (nome utente, email, link o sessione: 10 in 15 minuti, **da qualunque IP**)
  e **per IP** (100 in 15 minuti per ogni operazione, per tutto l'ufficio). Il campo della persona lo sceglie
  la rotta, non il corpo della richiesta; per il link il tetto per IP basta, perché il codice
  (256 bit) non si indovina. Finita la finestra il contatore riparte da zero; i
  valori stanno nel `.env` (`TENTATIVI`, `TENTATIVI_IP`, `TENTATIVI_MINUTI`). *Perché*: un ufficio
  esce con un solo IP, quindi un limite solo per IP bloccherebbe tutti i colleghi; il tetto per IP
  resta per fermare chi prova tanti nomi o email diversi. Contano anche le richieste riuscite; nome utente ed email dello stesso account hanno contatori
  separati (al massimo 20 prove invece di 10, accettato). *Perché (D-81):* contando anche l'IP,
  un attacco da IP diversi ricominciava da 10 ogni volta e il tetto per persona non esisteva.
- **Caricamenti dei documenti**: tetto suo, `TENTATIVI_CARICAMENTI` (100 in 15 minuti per utente),
  oltre ai permessi: una persona carica un blocco di fatture e i 10 del login la fermerebbero.
  *Perchè*: la spec chiede il limite anche sull'upload, che riempie disco e memoria.
- **Ambiente esplicito**: il backend **non parte** se `NODE_ENV` non è `development`, `test` o
  `production`. Senza, il cookie di sessione non sarebbe `Secure` e le password provvisorie
  finirebbero nel log della posta; il testo delle email (password, link) si scrive nel log del
  processo **solo in sviluppo**. *Perché (D-84):* un `.env` senza `NODE_ENV` in esercizio è un
  errore silenzioso; meglio fermarsi all'avvio che degradare.
- **Intestazioni delle pagine**: CSP completa (`default-src 'self'`, `script-src` e `style-src`
  con `'unsafe-inline'`, `object-src 'self'` per i PDF in `<object>`, `frame-ancestors 'self'`);
  `'unsafe-eval'` **solo in sviluppo** (lo usano Next e le prove Playwright). Le altre
  intestazioni restano quelle di prima; `/api` le mette Helmet nel backend.
  *Perché (D-86):* una CSP completa ferma gli script iniettati anche se un valore di un documento
  finisce in pagina; `'unsafe-eval'` serve solo in sviluppo, in esercizio non c'è.
- Senza sessione le richieste che
  modificano si accettano solo in JSON (contro il login CSRF). Il nome utente non contiene `@`.
- Cookie di sessione HttpOnly + Secure + SameSite, protezione CSRF sulle richieste che
  modificano dati, Helmet, limite ai tentativi sull'accesso e sulla password dimenticata
  (`@nestjs/throttler`), nessun CORS (il browser parla solo con il frontend, che inoltra
  `/api/*`: stessa origine), validazione input con DTO (`class-validator`).
- `requireAuth`: tutte le viste tranne `/accesso` e `/accesso/password/:codice`.
- `requirePermesso(...)`: su ogni rotta, secondo il ruolo (§8.3). Nel backend è un guard unico su tutte le rotte
  (`AccessoGuard`, `app/backend/src/accesso.ts`): ogni rotta dichiara `@Richiede('permesso')` o `@Pubblica()`;
  una rotta senza dichiarazione è **negata a tutti**. CSRF: token nella sessione, dato da `GET /api/accesso/io`,
  richiesto in `x-csrf-token` su ogni richiesta che modifica da chi ha una sessione.

*Perché (D-39, sostituisce D-30):* in Decobrands si lavora già così nella Gestione Ordini:
stesse abitudini per chi usa le due app, nessuna attesa della registrazione in Entra ID, e
il CRM sarà inglobato nella Gestione Ordini (D-29) con lo stesso modo di entrare. Il
superutente è uno solo e non si tocca dall'interfaccia, così nessuno resta senza chi
può creare gli amministratori.

### 3.4 Esercizio

Stessa architettura del Portale B2B Luis, su server Windows con PostgreSQL già presente:

```
Browser ──HTTPS 443──► Caddy (certificato automatico)
                          │
                          ▼
                 Frontend Next.js  (localhost:8001)
                          │  inoltra /api/* (stessa origine: cookie e CSRF)
                          ▼
                 Backend NestJS    (localhost:8002)
                          │
                          ▼
                 PostgreSQL `decobrands_db` (proprio, V2)
```

- Esposte solo le porte 80/443; frontend, backend e database restano locali.
- Porte 8001/8002 per non collidere con la Gestione Ordini e con altre applicazioni sul server.
  Il backend ascolta solo su `127.0.0.1`; `GET /api/salute` risponde `{ok: true}` senza sessione
  se il server e il database rispondono (per Caddy e per l'avvio), e non dice altro.
- **Segreti veri in esercizio**: con `NODE_ENV=production` il backend **non parte** se
  `SESSION_SECRET` o `SEGRETI_CHIAVE` mancano, valgono `CAMBIARE` o sono lunghi meno di 32
  caratteri (il messaggio manda a `openssl rand -base64 48`). *Perché* (collaudo A1-06, D-145): la
  chiave d'esempio sta nel repository pubblico; chi ha un backup del database decifrerebbe i
  segreti delle Impostazioni. In sviluppo e in prova i valori del `.env.example` passano.
- **Dominio e certificato**: `crm.decobrands.it` è il dominio vero. All'inizio l'app gira solo in
  **intranet**, quindi Caddy non può prendere il certificato pubblico con la sfida HTTP: si sceglie
  al rilascio, con il tecnico della rete, fra `tls internal` (certificato interno da installare sui
  PC) e la sfida DNS (serve il modulo DNS del fornitore del dominio). IP vero e HSTS dipendono
  dall'unico ingresso esterno: Caddy sostituisce `X-Forwarded-For` (niente `trusted_proxies`) e
  manda `Strict-Transport-Security` (D-148).
- Lavori pianificati (`@nestjs/schedule`): controllo giornaliero delle conferme scadute (§5.12).
- File Excel (lettura bollettini, export) con `exceljs`; upload documenti con `multer`
  (incluso in NestJS).
- Test: Jest + supertest (motore §10 e API).

---

## 4. Modello dati

### 4.1 Tabelle della Gestione Ordini (non usate: riferimento per §17)

**Il CRM non usa queste tabelle** (D-29): ha un database proprio, utenti propri (`utenti`,
§4.2.18) e una propria copia dei clienti (`clienti`, stesse colonne, scritta solo dalla
sincronizzazione da Integra, §4.5). L'elenco resta come riferimento per l'ampliamento
§17, quando il CRM ingloberà la Gestione Ordini e ne migrerà i dati.

*Perché (D-29):* la Gestione Ordini è la vendita diretta, oggi spenta. Tenere separati i
due flussi evita di sovrapporre le prove; legarsi a utenti, sessioni e tabelle di un'app
che verrà sostituita obbligava a compatibilità (password bcrypt, sessioni, ruoli) da
buttare dopo.

| Tabella | Uso nel CRM |
|---------|-------------|
| `users` · `remember_tokens` | accesso della Gestione Ordini: **non usate**; il CRM ha `utenti` propri (§4.2.18, D-29) |
| `clienti` | anagrafica cliente importata da Integra (P.IVA univoca, ragione sociale, indirizzo, codice Integra, flag vendita diretta): **sola lettura** nel CRM |
| `articoli` | catalogo (codice, descrizione, EAN, UM) **sincronizzato dalle viste di Integra** (§4.5): sola lettura |
| `giacenze` | giacenza di Integra per codice, **sincronizzata** (§4.5): sola lettura. Il disponibile mostrato dal CRM = giacenza − impegni aperti (§4.2.16) |
| `codici_alias` | cambi codice articolo (vecchio → nuovo) con conferma: **tabella del CRM**, si gestisce in Alias e kit (§7.21) |
| `kit_testata` / `kit_dettaglio` | kit di articoli (articolo → componenti × quantità, attivo): **tabella del CRM**, §7.21 |
| `ordini_cliente_testata` / `ordini_cliente_articoli` | ordini dei clienti (`fornitore` è testo libero → si mappa ai fornitori CRM) |
| `ordini_upload_queue` | **non usata dal CRM**: resta della Gestione Ordini fino alla sua sostituzione (§17) |
| `audit_log` | log di tutte le scritture |
| `movimenti_giacenza` | **non usata dal CRM**: lo scarico locale della Gestione Ordini è sostituito dagli impegni (§4.2.16), perché la giacenza vera è quella di Integra |
| `processing_errors` | **non usata dal CRM**: gli errori di lettura del CRM stanno in `documenti_in_arrivo` (§4.2.12) |

> **Anagrafiche da Integra, sola lettura.** Clienti e fornitori (ragione sociale, P.IVA,
> indirizzo, codice Integra) arrivano **solo da Integra**, come tutti i dati anagrafici: il
> CRM non li crea né li modifica, e un cliente nuovo si censisce in Integra. Il CRM gestisce
> soltanto i **propri** dati: condizioni e percentuali dei fornitori (§4.2.1–4.2.2), agenzie
> dei clienti (`interscambio`, §4.2.6) e subagenti. **I subagenti non sono in Integra**: la
> loro anagrafica si gestisce per intero nel CRM (CRUD completo).
>
> **Come arrivano i dati di Integra.** Tutto ciò che viene da Integra (clienti, fornitori,
> articoli, giacenze, ordini registrati) si legge da **viste dirette sul database di Integra**
> con processi di **sincronizzazione periodici, nell'ordine dei secondi o del minuto**
> (§4.5). Niente file da importare. La sincronizzazione aggiorna i campi che arrivano da
> Integra senza toccare i dati del CRM.

> **Ordini cliente vs ordini fornitore: restano separati.** Gli ordini dei clienti
> (`ordini_cliente_testata` / `ordini_cliente_articoli`) e le pratiche ordine a fornitore
> (`ordini_fornitore_testata` / `ordini_fornitore_righe`, §4.2.7) sono **oggetti di
> business diversi** e non vanno unificati: il primo è l'ordine **ricevuto dal cliente**
> (pipeline OCR della Gestione Ordini, verifica operatore, CSV Integra, con `fornitore`
> come testo libero informativo); il secondo è l'ordine **emesso da Decobrands verso il
> fornitore**, con vita propria (stati `inviato → confermato → fatturato`, allegati
> conferma/fattura, quantità confermate §5.8) e ad esso si riconducono le provvigioni
> (`importo_merce`). Nessuna tabella esistente viene modificata (V2).
>
> **Ponte tra i due** (tracciabilità ordine → conferma → fattura): l'aggancio parte
> dall'ordine cliente tramite `fornitore` (testo libero, mappato all'anagrafica
> `fornitori` §4.2.1) e `rif_nro_ordine_fornitore` (numero ordine del fornitore indicato
> dal cliente, spec Gestione Ordini). La pratica fornitore risale all'ordine cliente di
> origine via `ordine_cliente_id` — FK opzionale su `ordini_fornitore_testata` §4.2.7 —
> e collega le pratiche allo stesso cliente (`cliente_id`, §4.6) usato negli ordini clienti.

### 4.2 Nuove tabelle CRM

### 4.2.1 `fornitori`

**Identità** del fornitore (D-46, §4.6) con le regole del CRM: giorni di attesa conferma e
modalità di pagamento delle provvigioni. I dati descrittivi da Integra (`piva`,
`ragione_sociale`, `paese`) stanno in `fornitori_versioni`, il codice di Integra in
`codici_esterni`.

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | BIGSERIAL PK | |
| `versione_corrente_id` | BIGINT FK composta → `fornitori_versioni` (`fornitore_id`, `id`) | versione in vigore (§4.6); ragione sociale, P.IVA e paese da Integra, sola lettura, stanno lì |
| `giorni_attesa_conferma` | INT DEFAULT 30 | usato per le scadenze |
| `giorno_bollettino` | SMALLINT DEFAULT 10, CHECK 1–28 | giorno del **mese successivo** entro cui il fornitore manda il bollettino; prima è "atteso", dopo "non arrivato" con sollecito (§5.6) |
| `tipo_provvigione` | VARCHAR(20) DEFAULT `'fatturato'` | `maturato` \| `fatturato` — maturazione provvigioni (**§5.5**) |
| `giorni_incasso` | SMALLINT DEFAULT 60 | giorni dalla data fattura entro cui ci si aspetta il pagamento del cliente; dopo, la fattura non riconosciuta (maturato) diventa **incasso da verificare** (§5.14) |
| `note` | TEXT | |
| `attivo` | BOOLEAN DEFAULT true | |
| `creato_il` · `modificato_il` · `sincronizzato_il` | TIMESTAMPTZ | `sincronizzato_il`: ultima copia da Integra, come in `clienti` (§4.2.20) |

### 4.2.2 `provvigioni_scaglioni`

Tabella a scaglioni per fornitore: **più sconto si accorda al cliente, meno provvigione
si incassa / si paga**.

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | BIGSERIAL PK | |
| `fornitore_id` | BIGINT FK → `fornitori` | ON DELETE CASCADE |
| `sconto_min` | NUMERIC(5,2) DEFAULT 0, CHECK 0–100 | soglia: vale lo scaglione con la soglia più alta ≤ sconto del cliente |
| `pct_agente` | NUMERIC(5,2) DEFAULT 0 | % che incassa Decobrands dal fornitore |
| `pct_subagente` | NUMERIC(5,2) DEFAULT 0 | % che Decobrands paga al subagente |
| `valido_dal` | DATE NOT NULL | data da cui valgono le percentuali (versione); un documento usa la versione con `valido_dal` ≤ data del documento più recente (§5.11, D-25) |
| `creato_il` | TIMESTAMPTZ | |
| Vincolo | `UNIQUE(fornitore_id, sconto_min, valido_dal)` | uno scaglione per sconto in ogni versione |

*Perché (D-35):* con `sconto_min` e `sconto_max` due scaglioni potevano sovrapporsi; con la sola soglia, come nel prototipo, la sovrapposizione è impossibile. Percentuali con CHECK 0–100.

*Perché (D-166):* `pct_agente` è la provvigione **totale** che il fornitore riconosce a Decobrands e `pct_subagente` è la parte «di cui» che Decobrands gira al subagente, non un'altra voce da sommare: il fornitore paga una sola provvigione e il margine è la differenza. Il server rifiuta `pct_subagente > pct_agente` negli scaglioni, nelle eccezioni personali e nelle agenzie: una quota più alta della provvigione non esiste e renderebbe il margine negativo.

*Nuove percentuali da una data* (scheda del fornitore, §7.4) crea una nuova versione di
tutti gli scaglioni del fornitore con la data indicata; le versioni precedenti restano e
calcolano i documenti di prima. **Perché** (D-25): le condizioni cambiano dal periodo in cui
vengono riviste e i documenti precedenti vanno riletti con le percentuali di allora, anche
quelli non ancora in un bollettino verificato e nell'Analisi dei periodi passati.

**Da una data in poi, mai nel periodo chiuso** (D-51): la nuova versione deve valere **dopo
l'ultima chiusura** del fornitore (la più recente fra la fine del mese dell'ultimo bollettino
*chiuso*, verificato o contestato, del fornitore e la fine dell'ultimo trimestre *liquidato*), non per forza dopo
l'ultima versione: può cadere fra due versioni. Una data già usata da una versione → 400
(si usa la correzione). Una versione si **corregge** (`PUT`, sostituisce le sue righe) o si
**elimina** (`DELETE`, non se è l'unica) solo se il suo `valido_dal` è dopo l'ultima chiusura;
altrimenti 409 *"Le percentuali dal … sono già usate in un periodo chiuso (fino al …): crea una
versione nuova da una data successiva"*. Ogni versione ha tutte le soglie di quella che la
precede, anche quando se ne infila una fra due: la nuova contiene le soglie della precedente e
la successiva contiene quelle della nuova, altrimenti 400 (il motore sceglie la versione per
soglia). Una correzione o un'eliminazione che toglierebbe la soglia a un'eccezione personale
valida in quel periodo → 409 *"Ci sono eccezioni personali sullo sconto X %: …"*. L'ultima chiusura la calcola una
funzione sola, `ultimaChiusura(db, fornitore_id)`, che riusano bollettini e liquidazioni.
*Perché (D-51):* i soldi già chiusi (bollettini verificati, trimestri pagati) non devono
cambiare, mentre dove una correzione non ha ancora effetto deve essere libera; niente regola
"solo dopo l'ultima versione", che obbligava a casi strani con le versioni future.

Esempio reale (fornitore Gries):

| Sconto | pct_agente | pct_subagente |
|--------|-----------|---------------|
| 0 % | 18 | 10 |
| 1 % | 18 | 0 |
| 5 % | 13 | 7 |
| 10 % | 5 | 2 |
| 100 % | 0 | 0 |

### 4.2.3 `provvigioni_eccezioni`

Eccezioni per singolo subagente su uno sconto di un fornitore (rare, gestite a mano), con un
periodo. Se presente alla data del documento, il valore vince sulla percentuale standard dello
scaglione con quella soglia.

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | BIGSERIAL PK | |
| `fornitore_id` | BIGINT FK → `fornitori` | ON DELETE RESTRICT |
| `subagente_id` | BIGINT FK → `subagenti` | indice |
| `sconto_min` | NUMERIC(5,2) NOT NULL, CHECK 0–100 | la soglia dello scaglione a cui si applica |
| `pct_personale` | NUMERIC(5,2) NOT NULL, CHECK 0–100 | |
| `valido_dal` | DATE NOT NULL | primo giorno |
| `valido_al` | DATE NULL, CHECK > `valido_dal` | primo giorno in cui **non vale più** (escluso, come `interscambio`); NULL = senza fine |
| `creato_il` | TIMESTAMPTZ | |
| Vincolo | `EXCLUDE USING gist (fornitore_id =, subagente_id =, sconto_min =, daterange(valido_dal, valido_al) &&)` (`[)`) | un solo periodo per fornitore × subagente × sconto in ogni giorno (btree_gist, come `interscambio`); violato → 409 *Periodo sovrapposto* |

> Le eccezioni si **inseriscono, modificano ed eliminano nel CRM**, dalla scheda del
> subagente (§7.5, D-26), con il permesso `dati.condizioni`. Non sono legate alle versioni
> delle percentuali e **non si copiano**: il motore prende lo scaglione alla data del
> documento e poi l'eccezione del subagente per (fornitore, soglia di quello scaglione) valida
> alla stessa data (D-51). Operazioni (`/api/eccezioni`):
> - **nuova** da una data dopo l'ultima chiusura, con uno sconto che il fornitore ha a quella data;
> - **cambio di %** da una data (`/:id/cambia`): la riga vecchia finisce a quella data (esclusa) e
>   la nuova parte da lì, in una transazione; la data è dopo l'ultima chiusura, dopo l'inizio e
>   prima della fine della riga;
> - **fine** (`/:id/termina`, `al` = primo giorno in cui non vale più): `al` dopo l'ultima chiusura,
>   e anche la fine precedente deve essere dopo l'ultima chiusura;
> - **correzione** (`PUT`) ed **eliminazione** (`DELETE`) solo se tutto il periodo è dopo l'ultima
>   chiusura, altrimenti 409.
>
> *Perché (D-51):* legate a una versione, le eccezioni andavano copiate a ogni versione nuova
> e una versione futura creava casi strani (eccezione inserita oggi assente sulla versione di
> domani). Con un periodo proprio non serve nessuna copia; la data mai nel periodo chiuso
> tiene fermi i soldi già pagati o verificati. `valido_al` escluso come in `interscambio`: una
> sola convenzione per i periodi in tutto lo schema.
> Ogni scrittura su percentuali ed eccezioni blocca prima la riga del fornitore (`FOR UPDATE`),
> poi l'eccezione: le scritture dello stesso fornitore passano una alla volta (V13).

### 4.2.4 `agenti`

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | BIGSERIAL PK | |
| `codice` | VARCHAR(50) UNIQUE NOT NULL | |
| `nome` / `cognome` | VARCHAR(100) NOT NULL | |
| `email` / `telefono` | VARCHAR | |
| `attivo` | BOOLEAN DEFAULT true | |
| `creato_il` | TIMESTAMPTZ | |

> L'agente operativo è **uno solo: Decobrands SRL**. Gli altri (Schwarzmeier,
> Monzani) restano come valore storico (§5.4).

### 4.2.5 `subagenti`

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | BIGSERIAL PK | |
| `agente_id` | BIGINT FK → `agenti` | ON DELETE CASCADE |
| `codice` | VARCHAR(50) UNIQUE NOT NULL | |
| `nome` / `cognome` | VARCHAR(100) NOT NULL | |
| `email` | VARCHAR(255) | |
| `attivo` | BOOLEAN DEFAULT true | |

### 4.2.6 `interscambio`

Collega **subagente × cliente × fornitore**: definisce quale subagente segue un cliente
presso un fornitore e con quale sconto.

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | BIGSERIAL PK | |
| `subagente_id` | BIGINT FK → `subagenti` | ON DELETE RESTRICT |
| `cliente_id` | BIGINT FK → `clienti` | ON DELETE RESTRICT; solo identità (configurazione, §4.6) |
| `fornitore_id` | BIGINT FK → `fornitori` | ON DELETE RESTRICT |
| `codice_cliente_fornitore` | VARCHAR(50) | nullable — **codice con cui il fornitore identifica il cliente** (quello stampato su conferma e fattura): è la chiave per abbinare il documento ricevuto alla pratica (§4.4) |
| `sconto` | NUMERIC(5,2) DEFAULT 0 | **sconto accordato al cliente su quel fornitore** — determina lo scaglione (**§4.4**) |
| `pct_subagente` | NUMERIC(5,2) NULL | % al subagente **per questo cliente** su questo fornitore; NULL = quella dello scaglione o dell'eccezione (§5.2, D-27) |
| `regola_mensile` | VARCHAR(10) NULL | NULL = provvigione al subagente su ogni fattura; `prima` · `piu_alta` = **una fattura al mese** (la prima o la più alta del mese), le altre a zero (§5.2, D-27) |
| `valido_dal` · `valido_al` | DATE NOT NULL · DATE | periodo in cui il subagente segue il cliente; `valido_al` escluso, NULL = lo segue oggi |
| `creato_il` | TIMESTAMPTZ | |
| Vincolo | `EXCLUDE (cliente_id =, fornitore_id =, daterange(valido_dal, valido_al) &&)` | un solo subagente per cliente×fornitore **in ogni giorno** (**§5.10**) |
| Vincolo | `EXCLUDE (fornitore_id =, codice_cliente_fornitore =, daterange &&)` | il codice del fornitore indica un solo cliente in ogni giorno (dove valorizzato) |

Un documento va al subagente il cui periodo contiene la **data dell'ordine** della pratica (D-146); scaglioni ed eccezioni restano alla data del documento. Quando il cliente passa a un altro subagente si chiude il periodo (`valido_al`) e se ne apre uno nuovo dallo stesso giorno.

*Perché (D-35):* con il solo flag `attivo` si sapeva chi segue il cliente oggi, non chi lo seguiva alla data della fattura: un cambio di subagente avrebbe spostato al nuovo anche le provvigioni passate. Le FK sono RESTRICT perché la storia delle agenzie non deve sparire con il subagente o il fornitore (si disattivano). Anche `sconti.interscambio_id` è `ON DELETE RESTRICT` (D-139): un'agenzia con sconti storici non si elimina, si chiude con `valido_al`, così i calcoli del passato restano rifacibili.

*Perché (D-114):* un'agenzia con `valido_dal` ≤ ultima chiusura del fornitore non si cambia nei campi che spostano i soldi (subagente, fornitore, sconto, %, regola, `valido_dal`) e non si elimina (409 «chiudi l'agenzia e aprine una nuova da una data successiva»): l'agenzia decide subagente e sconto di ogni documento alla sua data (D-35), quindi cambiarla sul posto sposterebbe le provvigioni di trimestri liquidati e manderebbe gli storni al subagente sbagliato (A2-01, A3-01). La fine (`valido_al`) si sposta solo dopo la chiusura. Il blocco del fornitore `FOR UPDATE` serializza il cambio con la chiusura in corso (D-51, V13).

*Perché (D-146):* il motore prende l'agenzia (subagente e sconto) alla **data dell'ordine**: il documento entra nella pratica per l'agenzia valida all'ordine (D-137), quindi anche la provvigione segue quella stessa agenzia. Presa alla data del documento, una fattura arrivata dopo la chiusura dell'agenzia varrebbe 0 € in silenzio. Restano alla data del documento solo scaglione ed eccezione, perché le percentuali possono cambiare nel frattempo (D-51).

### 4.2.7 `ordini_fornitore_testata`

La **pratica** dell'ordine a fornitore. Si completa man mano che arrivano i documenti e
attraversa gli stati `inviato → confermato → fatturato`.

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | BIGSERIAL PK | |
| `fornitore_id` · `fornitore_versione_id` | BIGINT FK composta → `fornitori_versioni` | fornitore e la sua versione corrente alla nascita della pratica (§4.6) |
| `ordine_cliente_id` | BIGINT FK → `ordini_cliente_testata` | nullable — ordine cliente che ha originato la pratica (ponte §4.1) |
| `numero_ordine` | VARCHAR(50) NOT NULL | **numero della pratica**: `OF/AAAA/NNN` dato dal server quando un ordine apre la pratica (AAAA = anno dell'ordine, NNN = il più alto dell'anno + 1, D-60); il numero d'ordine del fornitore sta nel documento `ordine` |
| `data_ordine` | DATE NOT NULL | data del primo ordine: la data della pratica (cartella dell'archivio, D-60) |
| `cliente_id` · `cliente_versione_id` | BIGINT NOT NULL, FK composta → `clienti_versioni` | cliente finale e la sua versione corrente alla nascita della pratica (§4.6) |
| `agente_id` | BIGINT FK → `agenti` | nullable |
| `importo_merce` | NUMERIC(12,2) | importo merce (base del calcolo provvigioni) |
| `stato` | VARCHAR(20) DEFAULT `'inviato'` | `inviato` \| `confermato` \| `fatturato`: lo scrive solo `aggiornaPratica` dai documenti (D-52) |
| `note` | TEXT | |
| `importo` | NUMERIC(14,2) NOT NULL DEFAULT 0 | netto dei documenti fiscali, altrimenti le conferme o gli ordini sommati (`importoPratica`, §5.3); da `aggiornaPratica` (D-52) |
| `variazioni` · `variazione` | BOOLEAN · NUMERIC(14,2) | righe che cambiano fra le fasi e loro scostamento in euro (§5.8); da `aggiornaPratica` (D-52) |
| `creato_il` · `modificato_il` | TIMESTAMPTZ | |

Indici: (`fornitore_id`, `stato`), `cliente_id`, `data_ordine`, `importo` (filtri e ordinamenti dell'elenco, §7.2); UNIQUE su `numero_ordine` e indice su `agente_id` (D-142).

*Perché (D-142):* il numero `OF/AAAA/NNN` è UNIQUE nel database: il blocco consultivo di `nuovaPratica` resta, ma non è più l'unica difesa, e un seed, un ricalcolo o un import non possono scrivere due numeri uguali. Le FK che crescono (`documenti_campi`, `documenti_in_arrivo`, `bollettini_righe`, `ordini_fornitore_testata.agente_id`) hanno un indice, così eliminare un utente o un agente non scorre le tabelle dentro la transazione; le FK senza indice su tabelle piccole si lasciano.

*Perché (D-52):* `stato`, `importo` e `variazioni` sono **risultati del motore**, non dati da scrivere a mano: li ricalcola `aggiornaPratica(tx, id)` (`src/pratiche.ts`) nella stessa transazione di ogni scrittura sulla pratica, così l'elenco li legge in SQL anche con migliaia di pratiche. Non si salvano la scadenza della conferma (data + `giorni_attesa_conferma` del fornitore) né il subagente (`interscambio` alla data): cambiano con il fornitore o le agenzie e si calcolano nella query, sempre giusti senza riallineare. Dopo una migrazione o un cambio di regola del motore: `npm run pratiche:ricalcola`.

*Perché (D-34):* fatture e allegati non si copiano nella testata: le fatture stanno in `ordini_fornitore_documenti`, i file in `documenti_in_arrivo` (`abbinato_pratica_id`). Due copie della stessa cosa prima o poi divergono. Il **numero da solo non identifica un documento** (un fornitore può riusarlo in un altro anno): per una riga di bollettino non abbinata si preferisce il documento con la stessa data della riga; senza data, il più recente entro la fine del mese del bollettino (A2-05). La ricerca sta in un solo aiuto (`documentoDiRiga`) e vale anche per dire se una riga è «su» un documento (`suDocumento`), così un numero riusato in due anni non fa risultare riconosciuto o stornato il documento dell'anno sbagliato sul maturato (C1).

*Perché (D-60):* anche ordine e conferma non stanno più nella testata (`conferma_data` e `conferma_numero` tolte): sono documenti come le fatture, così una pratica può avere più ordini che si sommano e conferme o proforma facoltative, con lo stesso modello per ogni fornitore.

#### 4.2.7.1 `ordini_fornitore_documenti`

Documenti **agganciati alla pratica** (D-60), con lo stesso modello per ogni fornitore:

| `tipo` | Quanti | Effetto |
|---|---|---|
| `ordine` | 1..n | il primo apre la pratica; i successivi si **sommano** (importo e righe) |
| `conferma` | 0..n | solo tracciata: confronto delle righe e ritardo (§5.1) |
| `proforma` | 0..n | solo tracciata; come la conferma fa avanzare la pratica |
| `fattura` | 0..n | **provvigioni** |
| `nota_credito` | 0..n | storno, **provvigioni** |
| `pagamento` | 0..n | prova del pagamento del cliente (spesso una foto): solo il segno *pagato* e il documento a supporto in una contestazione o differenza dei bollettini; **nessun effetto sui calcoli** |
| `altro` | 0..n | solo archivio |

Per fatture e note di credito è il modello a ponte pratica ↔ documento che copre **fatture
multi-ordine** e **ordini fatturati in più tranche** (§5.9). È l'unica fonte dei documenti della pratica.

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | BIGSERIAL PK | |
| `testata_id` | BIGINT FK → `ordini_fornitore_testata` | ON DELETE CASCADE |
| `tipo` | VARCHAR(20) | `ordine` \| `conferma` \| `proforma` \| `fattura` \| `nota_credito` \| `pagamento` \| `altro` (CHECK, D-60) |
| `numero` | VARCHAR(50) NOT NULL | numero documento; unico per fornitore per fattura, nota di credito e ordine; vuoto ammesso per pagamento e altro |
| `data` | DATE NOT NULL | |
| `importo` | NUMERIC(12,2) NOT NULL DEFAULT 0 | **negativo** per la nota di credito, **positivo o zero** per gli altri; conta per le provvigioni solo su fattura e nota di credito |
| `storno_totale` | BOOLEAN DEFAULT false | per una nota di credito: `true` = storna tutta la fattura, `false` = storno parziale |
| `fattura_id` | BIGINT FK → `ordini_fornitore_documenti` | nullable, ON DELETE RESTRICT — la fattura stornata; CHECK: solo per le note di credito |
| `stato_incasso` | VARCHAR(15) DEFAULT `'da_incassare'` | solo fatture: `da_incassare` · `pagata` · `insoluta` (§5.14) |
| `insoluta_dal` · `pagata_il` | DATE | dal bollettino (storno, riaccredito, riconoscimento sul maturato) o dalla segnalazione del fornitore |
| `fonte_incasso` | VARCHAR(20) | `bollettino` · `fornitore` (segnalazione via email o telefono) · `manuale` |
| `nota_incasso` | TEXT | la nota della segnalazione del fornitore (§5.14), sua: `note` resta la nota del documento (D-62) |
| `sollecitata_il` · `solleciti` | DATE · SMALLINT | ultimo sollecito di pagamento al cliente e quanti ne sono stati fatti |
| `arrivo_id` | BIGINT FK → `documenti_in_arrivo` | nullable — il file letto; una fattura su più pratiche ha più righe con lo stesso `arrivo_id` |
| `liquidazione_id` | BIGINT FK → `liquidazioni` | nullable, ON DELETE RESTRICT — il trimestre in cui il documento è stato liquidato al subagente; NULL = non ancora liquidato |
| `note` | TEXT | la nota del documento, modificabile dal form della pratica (D-62) |
| `calcolo` | JSONB | nullable — i valori calcolati del documento (base, spese, netto, sconto medio, scaglione, `pct_agente`/`pct_subagente`, provvigioni, regola), importi come testo al centesimo; lo scrive solo il server (V12) |
| `congelato_il` | TIMESTAMPTZ | nullable — quando il documento entra in un periodo chiuso (bollettino verificato o trimestre liquidato); congelato = non si modifica né si ricalcola (409), si corregge solo con una nota di credito o uno storno (D-183) |
| `creato_il` | TIMESTAMPTZ | |

> **Importo netto della pratica** = somma algebrica degli `importo` dei documenti
> (fatture − note di credito). È il netto la **base del calcolo provvigioni** (§5.3):
> una nota di credito parziale riduce l'imponibile, una totale azzera la provvigione
> sulla fattura stornata. Finché la pratica non ha documenti, la base resta
> `importo_merce` (caso semplice: una sola fattura).
>
> **Base provvigione del documento** (D-183) = `netto − spese` se il fornitore esclude le
> spese (predefinito), altrimenti `netto`; è il valore salvato in `calcolo` e usato dal motore
> (`baseDoc`), con riserva sul netto per i documenti aperti senza `calcolo`. Il `netto` della
> pratica resta `importoPratica` (somma degli importi).
>
> **Fattura multi-ordine.** Il documento è sempre agganciato a **una** pratica
> (`testata_id`); una fattura che copre più ordini è rappresentata da **una riga per
> pratica**, con `importo` = quota attribuita a quella pratica. La somma delle quote
> con lo stesso `numero`/`tipo` ricostruisce il totale della fattura; la provvigione
> si calcola sulla quota di pratica, non sul totale. Stessa cosa per una nota di credito
> che storna fatture di più pratiche.

*Perché (D-34):* con le fatture su più pratiche il numero non identifica una riga, serve la FK `fattura_id`. `liquidazione_id` dice al motore se un documento è già stato pagato al subagente: uno storno che arriva dopo va nel trimestre successivo (D-11) senza cercare dentro il JSON di `liquidazioni.totali`.

*Perché (D-60):* un modello valido per ogni fornitore, senza legarsi ai nomi di uno solo (Auftrag, Rechnung…). Solo fattura e nota di credito toccano le provvigioni: il motore (`praticaDaDb`) le tiene in `documenti` e mette gli altri tipi a parte (`ordini`, `conferme`, `proforma`, `pagamenti`), così bollettini, liquidazioni e Analisi non cambiano. Spostare un documento in un'altra pratica dello stesso fornitore (`POST /api/pratiche/:id/documenti/:did/sposta`) ha le protezioni dell'annullamento: non se liquidato, in un bollettino o legato a una nota di credito; l'unico ordine della pratica non si sposta né si annulla.

*Perché (D-54):* il browser manda solo quello che l'operatore digita: l'importo è sempre positivo e il segno lo mette il server; con lo storno totale il server storna quello che resta della fattura (fattura + note già registrate), così due note non superano mai la fattura. Il numero è unico per fornitore: lo stesso numero su un'altra pratica è ammesso solo con la stessa data (fattura multi-ordine, una riga per pratica). Un documento già liquidato al subagente (`liquidazione_id`) non si corregge né si annulla: si registra una nota di credito (D-11). Un documento con legami non sparisce in silenzio: con una correzione del subagente (§4.2.7.2) o righe di bollettino non si annulla (409), e se è in un bollettino non cambiano importo, numero e data. Numero e data di una fattura su più pratiche si correggono su tutte le copie insieme; l'importo resta la quota di ogni pratica. La nota con storno totale segue l'importo della fattura. Annullando un documento il suo file torna in coda (`in_coda`) se non era mai stato letto, altrimenti torna `da_controllare` con le correzioni conservate (A4-06), senza pratica.

*Perché (D-123):* la stessa fattura può coprire **più ordini** dello stesso fornitore (D-54), ma se il numero esiste già su un'altra pratica per un motivo diverso è un doppione. Il server rifiuta con 409 «Fattura già registrata in OF/…» e accetta solo con la conferma `multi_ordine` della persona: così lo stesso documento arrivato da due file (email e scansione) non raddoppia fatturato e provvigioni, e la conferma resta una scelta di chi registra.

#### 4.2.7.2 `provvigioni_correzioni`

Correzione della **quota del subagente** su un singolo documento fiscale (§5.2, D-27). Vince
su ogni altra regola; non cambia quanto riconosce il fornitore.

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | BIGSERIAL PK | |
| `documento_id` | BIGINT FK → `ordini_fornitore_documenti` UNIQUE | una correzione per documento |
| `tipo` | VARCHAR(10) | `pct` (altra percentuale) · `nessuna` · `importo` (importo fisso in euro) |
| `valore` | NUMERIC(12,2) | % (0–100) o euro; 0 per `nessuna` |
| `motivo` | TEXT NOT NULL | obbligatorio; compare nel prospetto del subagente (§11) |
| `creato_da` · `creato_il` | BIGINT FK → `utenti` ON DELETE RESTRICT · TIMESTAMPTZ | chi corregge un importo si disattiva, non si elimina (§7.13, D-34) |

Si modifica solo finché il trimestre di liquidazione del documento è aperto.

### 4.2.8 `ordini_fornitore_righe`

Righe della pratica, **una fotografia per fase** (`fase`): `ordine` (come inviato),
`conferma` (come confermato dal fornitore, §5.8) e `fattura` (come fatturato). Le tre
fotografie non si sovrascrivono: il **confronto fra fasi** è calcolato a runtime
allineando le righe per `codice` (§7.3, §5.8). Ogni riga sta sul **suo documento**
(`documento_id`, D-60): più ordini o più fatture della stessa fase si sommano per codice
(quantità e importo; prezzo uguale o medio).

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | BIGSERIAL PK | |
| `testata_id` | BIGINT FK → `ordini_fornitore_testata` | ON DELETE CASCADE |
| `documento_id` | BIGINT FK → `ordini_fornitore_documenti` | ON DELETE CASCADE; il documento della riga (D-60): un documento spostato porta con sé le righe |
| `fase` | VARCHAR(20) DEFAULT `'ordine'` | `ordine` \| `conferma` \| `fattura` |
| `numero_riga` | INT | |
| `codice` | VARCHAR(100) | chiave di allineamento nel confronto fasi |
| `descrizione` | VARCHAR(255) | |
| `um` | VARCHAR(20) | |
| `quantita` | NUMERIC(12,3) | |
| `prezzo_unitario` | NUMERIC(12,4) | |
| `importo` | NUMERIC(12,2) | |
| `spesa` | BOOLEAN DEFAULT false | riga non merce (trasporto, imballo, «Fracht», codice testo): fuori dallo sconto medio e dalla base quando le spese sono escluse (D-183, D-194) |

> Vincolo `UNIQUE(documento_id, numero_riga)` (D-60; prima `testata_id, fase, numero_riga`). Al passaggio di stato le righe
> della fase precedente **restano**; la nuova fase ne salva una copia che l'operatore
> (o la lettura del documento) può modificare.

### 4.2.9 `bollettini_testata`

Bollettino del fornitore su un mese/anno. Stato `da_verificare → verificato |
contestato`.

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | BIGSERIAL PK | |
| `fornitore_id` · `fornitore_versione_id` | BIGINT FK composta → `fornitori_versioni` | fornitore e la sua versione corrente alla nascita del bollettino (§4.6) |
| `mese` | INT CHECK 1–12 | |
| `anno` | INT | |
| `stato` | VARCHAR(20) DEFAULT `'da_verificare'` | `da_verificare` \| `verificato` \| `contestato` |
| `chiuso_il` · `chiuso_da` | TIMESTAMPTZ · BIGINT FK → `utenti` ON DELETE RESTRICT | valorizzati se e solo se lo stato non è `da_verificare` (CHECK); `chiuso_il` decide il trimestre in cui storni e riaccrediti vanno al subagente (D-11) |
| `note` | TEXT | |
| `creato_il` · `modificato_il` | TIMESTAMPTZ | |
| Vincolo | `UNIQUE(fornitore_id, mese, anno)` | un bollettino per fornitore/mese |

*Perché (D-34):* i totali riconosciuto e calcolato sono somme delle righe e il file sta in `documenti_in_arrivo` (`abbinato_bollettino_id`): non si salvano due volte.

### 4.2.10 `bollettini_righe`

Si appaia **riga per riga** quello che il fornitore riconosce con quello che il sistema
ha calcolato.

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | BIGSERIAL PK | |
| `testata_id` | BIGINT FK → `bollettini_testata` | ON DELETE CASCADE |
| `fattura_numero` | VARCHAR(50) NOT NULL | |
| `fattura_data` | DATE | |
| `cliente_id` · `cliente_versione_id` | BIGINT, FK composta → `clienti_versioni` | nullable, i due insieme (CHECK); cliente e versione corrente alla nascita della riga (§4.6) |
| `importo_merce` | NUMERIC(12,2) | |
| `pct_riconosciuta` | NUMERIC(5,2) | % applicata dal fornitore |
| `importo_riconosciuto` | NUMERIC(12,2) NOT NULL | importo riconosciuto dal fornitore |
| `pct_calcolata` | NUMERIC(5,2) | % attesa dal sistema |
| `importo_calcolato` | NUMERIC(12,2) | importo atteso dal sistema |
| `differenza` | NUMERIC(12,2) GENERATED | riconosciuto − calcolato, calcolata dal database |
| `tipo_riga` | VARCHAR(15) DEFAULT `'provvigione'` | `provvigione` · `storno` (riga negativa: il cliente non ha pagato; solo fatturato) · `riaccredito` (riga positiva su fattura già stornata, dopo il pagamento) (§5.14) |
| `fattura_mese` | DATE | mese della fattura quando è diverso da quello del bollettino (storni, riaccrediti, riconoscimenti al pagamento sul maturato) |
| `documento_id` | BIGINT FK → `ordini_fornitore_documenti` | nullable — il documento abbinato dalla riconciliazione; NULL = riga non abbinata |
| `liquidazione_id` | BIGINT FK → `liquidazioni` | nullable, ON DELETE RESTRICT, solo per `storno` e `riaccredito` (CHECK) — il trimestre in cui la voce è andata al subagente |
| `decisione` · `decisione_motivo` · `deciso_da` · `deciso_il` | VARCHAR(12) · TEXT · FK → `utenti` · TIMESTAMPTZ | riga che non quadra (§7.7): `accettato` · `contestato` · `attendere`; motivo obbligatorio per `contestato` (va nel testo della contestazione); CHECK sui quattro insieme. *Perché (D-49):* la decisione resta nello storico e chiude la riga anche dopo un ricalcolo |
| `creato_il` | TIMESTAMPTZ | |

> `pct_calcolata` / `importo_calcolato` vengono **congelati alla verifica**: è il modo
> per rileggere un mese vecchio con le percentuali di allora (§5.11).

*Perché (D-34):* senza `documento_id` la riconciliazione non salva quale fattura ha riconosciuto il fornitore, e storni, riaccrediti e incassi (§5.14) restano senza aggancio.

### 4.2.10.1 `bollettini_attese`

Decisione **nostra** su un documento fiscale del mese che il fornitore **non** ha scritto nel bollettino
(§7.7): *Attendi il prossimo* o *Contesta*. Le righe del fornitore restano solo in `bollettini_righe`.

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | BIGSERIAL PK | |
| `testata_id` | BIGINT FK → `bollettini_testata` | ON DELETE CASCADE |
| `documento_id` | BIGINT FK → `ordini_fornitore_documenti` | ON DELETE CASCADE |
| `decisione` · `decisione_motivo` | VARCHAR(12) · TEXT | `attendere` · `contestato` (CHECK; motivo obbligatorio per contestare) |
| `deciso_da` · `deciso_il` | FK → `utenti` · TIMESTAMPTZ | |
| Vincolo | `UNIQUE(testata_id, documento_id)` | una decisione per documento e bollettino |

Vale solo finché il documento manca: se una riga del fornitore viene abbinata al documento l'attesa si
toglie nella stessa transazione, e il motore ignora un'attesa su un documento che non manca più.

*Perché (D-56):* una riga finta in `bollettini_righe` si confondeva con quelle del fornitore (conteggi,
documenti "già in un bollettino", maturato pagato, storni); la decisione è nostra e sta a parte.

*Perché (D-35):* lo storno arriva come riga del bollettino, non sempre come nota di credito: senza `liquidazione_id` sulla riga e `chiuso_il` sul bollettino il motore non sa se la voce negativa è già stata pagata né in quale trimestre metterla.

### 4.2.11 `registro` — eventi e anomalie in un solo posto (D-31)

Una sola tabella per **tutto ciò che succede**: eventi applicativi (chi ha fatto cosa) e
**anomalie** (errori dell'app, problemi dei servizi, errori di lettura dei documenti, dati
di Integra scartati). I campi comuni servono a filtrare e cercare; i dati propri di ogni
caso stanno in `dettaglio` (JSONB), con una **forma fissa per ogni `codice`** (§15.4). La
scrive solo il server (§15).

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | BIGSERIAL PK | |
| `ts` | TIMESTAMPTZ DEFAULT now() | quando (dal server, mai dal client); per un'anomalia, la prima volta |
| `genere` | VARCHAR(10) | `evento` (è successo qualcosa) · `anomalia` (c'è qualcosa da guardare) |
| `livello` | VARCHAR(10) | `info` · `attenzione` · `errore` · `critico` |
| `codice` | VARCHAR(50) | dal catalogo: eventi `tipo.azione` (es. `stato.change_state`, §15.2), anomalie §7.14.3 (es. `integra.piva_mancante`) |
| `tipo` · `azione` | VARCHAR(30) | eventi: come nel catalogo §15.2 (`auth`, `crud`, `stato`, `documento`, `calcolo`, `export`, `errore`; `create`, `update`, `delete`, `upload`, `export`, `change_state`, `verify`, `login`, `logout`, `password_change`, `password_reset_requested`, `password_reset`, `password_temp`, `access_denied`, `error`); anomalie: `servizio` · `apri` |
| `servizio` | VARCHAR(15) | `casella` · `lettura` · `integra` · `posta` · `accesso` · `app`; NULL per gli eventi delle persone |
| `entita` · `entita_id` | VARCHAR(50) · BIGINT | cosa riguarda: `fornitore`, `scaglione`, `eccezione`, `correzione`, `agente`, `subagente`, `interscambio`, `pratica`, `riga_pratica`, `documento`, `bollettino`, `riga_bollettino`, `liquidazione`, `cliente`, `utente`, `sistema` |
| `esito` | VARCHAR(10) | `successo` · `errore` · `negato` |
| `messaggio` | VARCHAR(300) | frase in italiano da mostrare, con l'etichetta (numero, ragione sociale); frase fissa con segnaposto (§7.14.3) |
| `dettaglio` | JSONB | i dati propri del codice: diff `prima`/`dopo`, nuovo stato, `documento_id`, misure, errore tecnico breve (§15.4) |
| `utente_id` | BIGINT FK → `utenti` | chi; NULL per i servizi e per un accesso non riconosciuto |
| `operazione_id` | UUID | lega le righe di una stessa operazione (es. arrivo email → lettura → abbinamento) |
| `sessione_id` · `ip` | VARCHAR(100) · VARCHAR(45) | solo eventi `auth` e `negato` |
| **Solo anomalie** | | |
| `chiave` | VARCHAR(120) | cosa riguarda, per riconoscere i doppioni (es. `C00931`, nome dell'allegato, email); vuota se riguarda il servizio intero |
| `volte` · `ultimo` | INT DEFAULT 1 · TIMESTAMPTZ | quante volte si è ripresentata e l'ultima volta |
| `stato` | VARCHAR(10) | `aperta` · `chiusa` |
| `visto_il` · `visto_da` | TIMESTAMPTZ · BIGINT FK → `utenti` | *Segna come visto* (§7.14.4) |
| `chiusa_il` | TIMESTAMPTZ | quando la causa è sparita |

> **Eventi: solo aggiunta.** Le righe `evento` non si modificano né si cancellano a mano e
> si scrivono **nella stessa transazione** dell'operazione (§15.3). **Anomalie: cambia solo
> la loro vita** (`volte`, `ultimo`, `stato`, `visto_*`, `chiusa_il`, §7.14.4); *Segna come
> visto* scrive a sua volta un evento, così la storia resta completa.
>
> Indici: `(ts DESC)`, `(genere, livello, ts)`, `(codice, ts)`, `(entita, entita_id)`,
> `(utente_id, ts)`, `(operazione_id)`; univoco `(servizio, codice, chiave) WHERE genere =
> 'anomalia' AND stato = 'aperta'` (una sola anomalia aperta per causa); GIN su
> `dettaglio`. Pulizia: §15.7.

*Perché (D-31):* eventi, problemi dei servizi ed errori di lettura stavano in tre tabelle e
due pagine; per capire cosa era successo a un documento bisognava incrociarle. Con un solo
registro un filtro (o l'`operazione_id`) mostra tutta la storia; i campi comuni bastano per
filtrare, il JSON tiene i dettagli senza colonne nuove per ogni caso e lo schema per codice
impedisce che diventi testo libero.

### 4.2.12 `documenti_in_arrivo`

Coda e stato di ogni documento entrato nel CRM (§6.5), dalla ricezione all'abbinamento.

| Campo | Tipo | Note |
|---|---|---|
| `id` | BIGSERIAL PK | |
| `origine` | VARCHAR(12) | `email` · `caricamento` |
| `email_da` · `email_oggetto` | TEXT | solo per origine email |
| `file_nome` | TEXT | nome originale |
| `file_hash` | CHAR(64) UNIQUE | SHA-256 del file: evita di leggere due volte lo stesso documento. Il file originale sta **su disco** con l'impronta come nome (*Perché D-34:* i PDF nel database lo gonfiano e appesantiscono i backup) |
| `file_percorso` | VARCHAR(255) NOT NULL | Dove sta il file sotto `DOCUMENTI_DIR`: in coda `in_arrivo/AAAA/AAAAMMGG/<impronta>.<est>`, abbinato `pratiche/AAAA/AAAAMM/<numero pratica>/<tipo>_<numero o data>.<est>` (§6.5; *Perché D-60:* si ritrova anche a mano, per pratica) |
| `stato` | VARCHAR(16) | `in_coda` → `in_lettura` → `da_controllare` → `abbinato` · `scartato` · `errore` |
| `tentativi` · `errore` | INT · TEXT | riletture automatiche (max 3) e ultimo errore |
| `tipo` | VARCHAR(16) | `ordine` · `conferma` · `proforma` · `fattura` · `nota_credito` · `pagamento` · `altro` · `bollettino` (letto o scelto a mano, D-60) |
| `fornitore_id` · `fornitore_versione_id` | FK composta → `fornitori_versioni` | riconosciuto dalla lettura, correggibile; nullable, i due insieme (CHECK, §4.6) |
| `livello` | VARCHAR(12) | `affidabile` · `da_controllare` · `bassa` (§6.5), dal campo meno affidabile; i valori letti stanno **solo** in `documenti_campi` (*Perché D-37:* `dati_letti` in JSON li ripeteva) |
| `controlli` | JSONB | esito dei controlli fissi (§6.5 punto 5): `{falliti: [{codice, campo, testo, grave}]}` con `codice` fra `bollettino` · `codice_cliente` · `totale` · `riga` · `articolo` · `data` |
| `modello` | TEXT | versione del modello e del prompt usati |
| `ricevuto_il` · `letto_il` · `controllato_il` | TIMESTAMPTZ | |
| `abbinato_pratica_id` · `abbinato_bollettino_id` | FK | valorizzati all'abbinamento |
| `utente` | VARCHAR(100) | chi ha caricato / controllato |
| `scartato_il` · `scartato_da` · `motivo_scarto` · `nota_scarto` | TIMESTAMPTZ · VARCHAR · VARCHAR(40) · TEXT | motivo: `Doppione` · `Non riguarda Decobrands` · `Documento illeggibile` · `Altro`; il documento scartato resta recuperabile per `conservazione.scartati_giorni` (§7.16), poi un lavoro pianificato lo elimina |

### 4.2.13 `documenti_campi`

Un record per ogni campo letto (testata e righe): serve all'interfaccia di correzione e
alla **taratura** delle soglie sui documenti reali.

| Campo | Tipo | Note |
|---|---|---|
| `id` | BIGSERIAL PK | |
| `documento_id` | FK → `documenti_in_arrivo` (CASCADE) | |
| `campo` | TEXT | percorso nello schema, es. `numero`, `righe[3].prezzo` |
| `valore_letto` · `valore_finale` | TEXT | valore proposto dalla lettura e valore confermato |
| `affidabilita` | NUMERIC(4,3) | 0–1 (§6.5) |
| `posizione` | JSONB | dove si trova il valore nel file, per l'evidenziazione (§6.6): PDF `{tipo:'pdf', pagina, x0, y0, x1, y1}` normalizzati 0–1; Excel `{tipo:'excel', foglio, cella}` o `{…, riga}`; `null` se non trovato |
| `precisione` | VARCHAR(12) | `esatta` \| `approssimata` \| `assente` — come è stata trovata la posizione (§6.6) |
| `verificato` | BOOLEAN | confermato o corretto dall'operatore |
| `corretto_da` · `corretto_il` | VARCHAR(100) · TIMESTAMPTZ | |

### 4.2.14 `impostazioni`

Una riga per sezione (`chiave` = `azienda` · `casella` · `lettura` · `posta` · `integra` · `conservazione`), `valore` JSONB, `aggiornato_il`, `aggiornato_da`. Le password (casella IMAP, posta in uscita, Integra) sono **cifrate** (AES-256-GCM, chiave derivata da `SEGRETI_CHIAVE` nel file d'ambiente del server) e **non vengono mai restituite** dalle API: si sostituiscono soltanto. Ogni modifica scrive un evento (§15). La chiave `accesso` non si usa più (D-39); il vincolo del database `impostazioni_chiave_check` la ammette ancora, così le installazioni già in piedi non si rompono.

### 4.2.15 `servizi_esecuzioni`

Giri dei servizi automatici, letti dalla pagina Stato del sistema (§7.14). Li scrivono
**solo i servizi**, con un'unica funzione `registraEsecuzione()`. I **problemi** dei servizi
non hanno una tabella propria: sono **anomalie del `registro`** (§4.2.11, D-31), aperte con
`apriAnomalia()`. Le esecuzioni restano fuori dal registro perché sono misure, non fatti
da guardare (la sincronizzazione ne scrive una al minuto).

`servizi_esecuzioni` — una riga per ogni giro di lavoro o controllo di un servizio.

| Colonna | Tipo | Note |
|---|---|---|
| `id` | BIGSERIAL PK | |
| `servizio` | VARCHAR(15) | `casella` · `lettura` · `integra` · `posta` |
| `tipo` | VARCHAR(10) | `lavoro` (giro reale: email lette, documento letto, sincronizzazione, invio) · `controllo` (prova di salute periodica, §7.14.1) |
| `inizio` · `fine` | TIMESTAMPTZ | `fine` NULL finché il giro è in corso |
| `esito` | VARCHAR(10) | `ok` · `attenzione` · `errore` |
| `testo` | VARCHAR(300) | cosa ha fatto, leggibile (es. "1 email, 1 allegato (Gries_AB-77120.pdf)") |
| `misure` | JSONB | numeri del giro: `{email, allegati, ignorati}` · `{pagine, secondi, secondi_pagina, documento_id}` · `{vista, lette, aggiornate, scartate}` · `{destinatario, codice_smtp}` |
| `avviato_da` | BIGINT FK → `utenti` | NULL se pianificato; l'utente se da *Controlla adesso* |

Indici: `servizi_esecuzioni (servizio, inizio DESC)`. Conservazione: 90 giorni; pulizia
con un lavoro notturno.

### 4.2.16 `impegni_giacenza` — **ampliamento futuro (§17), non in questa fase**

Quantità esportate verso Integra (§7.18) e **non ancora registrate** da Integra. Servono a
non vendere due volte la stessa merce nell'intervallo fra l'esportazione e la
registrazione dell'ordine in Integra.

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | BIGSERIAL PK | |
| `ordine_cliente_id` | BIGINT FK → `ordini_cliente_testata` | |
| `codice_articolo` | VARCHAR(50) | codice esportato (dopo alias e kit) |
| `qta` | NUMERIC(12,2) | |
| `stato` | VARCHAR(12) | `impegnato` · `registrato` · `rilasciato` |
| `nota` | VARCHAR(200) | es. "alias VASA-3050 → VASA-3050N (nuovo)", "componente del kit KIT-ORTO" |
| `creato_il` · `creato_da` | TIMESTAMPTZ · BIGINT FK → `utenti` | |
| `chiuso_il` | TIMESTAMPTZ | quando è passato a `registrato` o `rilasciato` |

- **Disponibile** = giacenza di Integra − somma degli impegni `impegnato` del codice.
- Si crea alla **prima** esportazione dell'ordine; esportare di nuovo lo stesso ordine
  rigenera i file senza impegnare due volte.
- Passa a `registrato` quando la sincronizzazione trova l'ordine fra quelli registrati
  in Integra (vista degli ordini, chiave = numero ordine + codice cliente); da quel momento
  la giacenza di Integra lo comprende già.
- Passa a `rilasciato` con **Annulla esportazione**.
- Indici: `(codice_articolo, stato)`, `(ordine_cliente_id)`.

### 4.2.17 `ordini_cliente_esportazioni` — **ampliamento futuro (§17), non in questa fase**

Una riga per esportazione verso Integra (le tabelle della Gestione Ordini non si modificano):
`id`, `ordine_cliente_id`, `quando`, `utente_id`, `tipi` (`OC`, `OF` o entrambi), `file`
(nomi generati), `righe` JSONB (righe finali dopo alias e kit, con le decisioni
dell'operatore), `annullata_il`, `annullata_da`. L'ordine è "esportato" se ha
un'esportazione non annullata.

### 4.2.18 `utenti` e `accessi_link` (D-29, D-39)

`utenti` — gli utenti del CRM; nessun legame con la tabella `users` della Gestione Ordini.

| Colonna | Tipo | Note |
|---|---|---|
| `id` | BIGSERIAL PK | |
| `username` | VARCHAR(50) UNIQUE NOT NULL | nome utente, in minuscolo; si entra con questo o con l'email |
| `email` | VARCHAR(200) UNIQUE | in minuscolo; password provvisoria e password dimenticata |
| `nome` | VARCHAR(120) | |
| `ruolo` | VARCHAR(15) | ruolo di **Sistema**: `superutente` · `amministratore` · `utente` (§8.3, D-45); **un solo** superutente (indice univoco parziale) |
| `password_hash` | VARCHAR(200) | `scrypt$N$r$p$sale$hash`; NULL solo per l'utente dei servizi (CHECK) |
| `deve_cambiare_password` | BOOLEAN DEFAULT true | password provvisoria: va cambiata al primo accesso |
| `attivo` | BOOLEAN DEFAULT true | disattivato = non entra; i dati restano |
| `sistema` | BOOLEAN DEFAULT false | utente dei servizi automatici: non accede |
| `creato_il` · `ultimo_accesso` | TIMESTAMPTZ | `ultimo_accesso` NULL = non ancora entrato |
| `ultimo_invio` | JSONB | `{quando, tipo: benvenuto \| password \| reset, errore}`: l'ultima email e l'eventuale errore di recapito |

`utenti_aree` — il livello di ogni utente in ogni area (D-45): `utente_id` FK (ON DELETE CASCADE),
`area` (`anagrafiche` · `provvigioni` · `vendite`, CHECK), `livello` (`lettura` · `operatore` ·
`responsabile`, CHECK); chiave primaria (`utente_id`, `area`). Nessuna riga = l'area non si vede.

`accessi_link` — i link di *password dimenticata*: `id`, `utente_id` FK, `tipo` (`reset`),
`impronta` CHAR(64) UNIQUE (SHA-256 del codice: il codice in chiaro non si salva),
`scade_il` (1 ora), `usato_il`, `ip`. Un codice usato o scaduto non vale più; uno nuovo
annulla i precedenti dello stesso utente.

Il superutente si crea all'installazione con un comando del server (nome utente, nome,
email); riceve la password provvisoria per email come tutti.

`sessioni` — le sessioni di `connect-pg-simple` (§3.3): `sid` VARCHAR PK, `sess` JSONB (con
`utente_id`, `ip`, `agente` del browser, `creata_il`), `expire` TIMESTAMPTZ; in più
`utente_id` BIGINT **calcolata** da `sess` (colonna generata, con indice). Disattivare o
eliminare un utente cancella le sue righe; ogni accesso e uscita scrive l'evento `auth/*`
con il `sessione_id` (§15.2.1).

*Perché (D-33):* "disattivare un utente chiude le sue sessioni" (§3.3) richiede di trovare le
sessioni per utente senza leggere il JSON di tutte.

### 4.2.19 `liquidazioni` (D-33)

Chiusura del trimestre (§7.8): una riga per trimestre chiuso.

| Colonna | Tipo | Note |
|---|---|---|
| `id` | BIGSERIAL PK | |
| `anno` · `trimestre` | SMALLINT · SMALLINT CHECK 1–4 | `UNIQUE(anno, trimestre)` |
| `chiusa_il` · `chiusa_da` | TIMESTAMPTZ · BIGINT FK → `utenti` ON DELETE RESTRICT | |
| `totali` | JSONB | fotografia del prospetto alla chiusura: per subagente imponibile, provvigione, voci negative (storni) e totale; l'elenco `documenti` con le righe pagate (id, numero, data, origine, importi come testo, stato). I documenti inclusi si legano anche con `ordini_fornitore_documenti.liquidazione_id` (D-34) |

Un trimestre chiuso non si ricalcola: gli storni e le correzioni arrivati dopo vanno nel
trimestre successivo (§5.14, D-11). Una voce di storno o riaccredito con `liquidazione_id` resta nel
trimestre che l'ha pagata (D-57). Riapertura: non prevista per ora. Chiusura e riapertura scrivono un evento (§15.2.6).

*Perché (D-33):* il prototipo tiene i trimestri chiusi (`liquidazioni_chiuse`), la spec non
aveva dove salvarli; la fotografia fa sì che il prospetto pagato si rilegga uguale anche se
cambiano percentuali o documenti.

### 4.2.20 `clienti` — anagrafica del CRM alimentata da Integra (D-33, D-102)

**Identità** del cliente (D-46, §4.6). La sincronizzazione (§4.5) copia qui la vista
`integra_v_clienti`; fino al passaggio la scrive **solo** il servizio `integra`, l'interfaccia
la legge soltanto (D-01). I dati descrittivi stanno in `clienti_versioni` (si aggiungono
soltanto), il codice di Integra in `codici_esterni`.

> **Dal passaggio (D-102)** il **centro di verità è il CRM**: l'import iniziale prende i
> clienti da Integra **e** dal vecchio CRM e fonde i doppioni; da lì in poi un cliente nuovo si
> censisce **nel CRM** e verso Integra si esporta un file quando serve. La scrittura diretta su
> Integra resta vietata (D-100): l'esportazione è un file che carica chi gestisce Integra.
> *Perché:* le due anagrafiche non coincidono (3405 contatti contro 698 clienti, 593 P.IVA in
> comune su 1866) e il valore commerciale — sconti, subagenti, legami cliente-fornitore — vive
> solo nel CRM; con Integra come padrone quel dato non si poteva mantenere.

| Colonna | Tipo | Note |
|---|---|---|
| `id` | BIGSERIAL PK | |
| `versione_corrente_id` | BIGINT FK composta → `clienti_versioni` (`cliente_id`, `id`) | versione in vigore (§4.6) |
| `attivo` | BOOLEAN DEFAULT true | false se sparisce dalla vista: i dati storici restano |
| `modificato_il` · `sincronizzato_il` | TIMESTAMPTZ | data di modifica in Integra (lettura incrementale) e ultima copia |

**`clienti_versioni`** (§4.6, solo aggiunta): `id`, `cliente_id`, `valido_dal`, `fonte`, `creato_da`,
`piva` (VARCHAR(20), indice non univoco), `ragione_sociale` (NOT NULL), `indirizzo` · `cap` · `citta` ·
`provincia`, `email` (da confermare, §5.14); UNIQUE (`cliente_id`, `id`).
*Perché D-35:* Integra può avere P.IVA doppie (sedi, doppioni) e un vincolo univoco fermerebbe la
sincronizzazione; i doppioni si segnalano come anomalia. La P.IVA **non collega** più le tabelle
(lo fa `cliente_id`); un cliente senza P.IVA valida non si copia e apre l'anomalia `integra.piva_mancante`.

**`fornitori_versioni`** (§4.6, solo aggiunta): `id`, `fornitore_id`, `valido_dal`, `fonte`, `creato_da`,
`piva`, `ragione_sociale` (NOT NULL), `paese`; UNIQUE (`fornitore_id`, `id`).

**`codici_esterni`** (§4.6): `id`, `sistema` (`integra`), `tipo` (`cliente` · `fornitore`), `codice`,
`entita_id`, `creato_il`; UNIQUE (`sistema`, `tipo`, `codice`). Sostituisce `codice_integra`: è la
chiave della sincronizzazione.

*Perché (D-33):* §4.5 sincronizza ogni 60 s, ma solo i fornitori avevano una tabella locale;
leggere Integra a ogni pagina renderebbe il CRM lento e fermo quando il ponte non risponde.

**Note sulle colonne (D-33):** `ordini_fornitore_testata.ordine_cliente_id` resta senza
chiave esterna finché non esiste la vendita diretta (§17); in `documenti_in_arrivo`
(`utente`, `scartato_da`) e `documenti_campi` (`corretto_da`) chi ha fatto l'operazione è
un BIGINT FK → `utenti`, come nel resto dello schema.

### 4.3 Diagramma relazionale

```
fornitori 1 ── n provvigioni_scaglioni
fornitori 1 ── n provvigioni_eccezioni n ── 1 subagenti   (per sconto e periodo, D-51)
fornitori 1 ── n interscambio ── n 1 subagenti n ── 1 agenti
fornitori 1 ── n ordini_fornitore_testata 1 ── n ordini_fornitore_righe
fornitori 1 ── n bollettini_testata 1 ── n bollettini_righe
ordini_fornitore_testata 1 ── n ordini_fornitore_documenti (fatture e note di credito, §4.2.7.1) 1 ── 0..1 provvigioni_correzioni (§4.2.7.2)
ordini_fornitore_documenti (nota di credito) n ── 0..1 ordini_fornitore_documenti (fattura_id)
ordini_fornitore_documenti n ── 0..1 liquidazioni (liquidazione_id) · documenti_in_arrivo (arrivo_id)
bollettini_righe n ── 0..1 ordini_fornitore_documenti (documento_id, riconciliazione) · liquidazioni (liquidazione_id, storni)
interscambio (cliente_id, fornitore_id) → ordini_fornitore_testata (cliente_id, fornitore_id)
interscambio (fornitore_id, codice_cliente_fornitore) → ordini_fornitore_testata (cliente_id, fornitore_id)
ordini_cliente_testata 1 ── 0..n ordini_fornitore_testata (via ordine_cliente_id, ponte §4.1; senza FK fino a §17)
clienti 1 ── n clienti_versioni · fornitori 1 ── n fornitori_versioni (versione_corrente_id, §4.6)
clienti (id) → interscambio (cliente_id) · clienti_versioni (cliente_id, id) → ordini_fornitore_testata, bollettini_righe (cliente_id + cliente_versione_id)
fornitori_versioni (fornitore_id, id) → ordini_fornitore_testata, bollettini_testata, documenti_in_arrivo (fornitore_id + fornitore_versione_id)
codici_esterni (sistema, tipo, codice) → clienti · fornitori (entita_id, senza FK)
utenti 1 ── n registro  (eventi e anomalie, §15: chi ha fatto ogni operazione)
utenti 1 ── n sessioni · accessi_link · liquidazioni (chiusa_da) · provvigioni_correzioni (creato_da)
```

Diagramma grafico con colonne chiave e vincoli: https://claude.ai/artifact/SWCPp7gvWjHm7kmS9tfeHD

### 4.4 Note di schema

- **Vendita diretta**: `ordini_cliente_testata 1 ── n ordini_cliente_esportazioni`,
  `ordini_cliente_testata 1 ── n impegni_giacenza`, `codici_alias` e `kit_*` riferiscono
  `articoli` per codice (testo, non FK: un codice nuovo può arrivare dalla
  sincronizzazione dopo la creazione dell'alias).

- `interscambio.sconto` è il **solo campo** dello sconto cliente su fornitore
  (§5.7) e determina lo scaglione (lo sconto di default del fornitore è stato tolto, D-34).
- **Abbinamento dei documenti del fornitore**: la conferma e la fattura riportano il
  *codice cliente del fornitore*, non la P.IVA. `interscambio.codice_cliente_fornitore`
  fa da traduzione verso `cliente_id`: in arrivo documento il sistema risolve
  `fornitore_id + codice_cliente_fornitore → cliente_id` e propone la pratica
  corrispondente; se il codice non è valorizzato l'abbinamento resta manuale
  (confermato dall'operatore, §6.1).
- La **scadenza della conferma** non si salva: si calcola come `data_ordine + giorni_attesa_conferma`
  del fornitore (§6.1, D-37).
- Le percentuali hanno una data di validità (`provvigioni_scaglioni.valido_dal`, D-25); in
  più i valori calcolati si congelano su `bollettini_righe` alla verifica (§5.11).
- Le **righe per fase** (`ordini_fornitore_righe.fase`) non si sovrascrivono: conservano
  la fotografia di ordine, conferma e fattura, così il confronto fra fasi resta
  ispezionabile a posteriori (§5.8, §7.3).
- Gli **importi delle provvigioni** si calcolano sul **netto documenti** della pratica
  (§4.2.7.1, §5.3): le note di credito riducono l'imponibile senza generare pratiche a sé.

### 4.6 Anagrafiche: identità stabile e versioni (D-46)

Il CRM è il primo pezzo del Sistema Informativo Aziendale (D-43) e punta a diventare la fonte di
verità dell'azienda: le anagrafiche (clienti, fornitori, domani articoli e altro) **non si
sovrascrivono** e **non si spezzano**. Ogni anagrafica ha tre tabelle:

| Tabella | Cosa contiene | Regole |
|---|---|---|
| `<anagrafica>` (es. `clienti`) | **identità**: `id` nostro (BIGSERIAL), `attivo`, `versione_corrente_id`, campi tecnici | l'`id` non cambia mai; un record sparito da Integra diventa `attivo = false`, mai cancellato |
| `<anagrafica>_versioni` (es. `clienti_versioni`) | **dati descrittivi** che contano: ragione sociale, P.IVA, indirizzo, email, … | `id` BIGSERIAL, `<anagrafica>_id` FK, `valido_dal` TIMESTAMPTZ, `fonte` (`integra` · `crm`), `creato_da`; **si aggiungono soltanto** (trigger che rifiuta UPDATE e DELETE, come il registro); UNIQUE (`<anagrafica>_id`, `id`) per la chiave composta |
| `codici_esterni` (una per tutte) | **collegamento** ai sistemi esterni: `sistema` (`integra`, …), `tipo` (`cliente`, `fornitore`, …), `codice`, `entita_id` | UNIQUE (`sistema`, `tipo`, `codice`); due codici possono puntare allo stesso `entita_id` (fusione o cambio di codice in Integra) |

**Chi punta a cosa:**

| Tipo di tabella | Collegamento | Esempi |
|---|---|---|
| **Fatti** (prove di quello che è successo) | `cliente_id` **e** `cliente_versione_id`, con **chiave esterna composta** (`cliente_id`, `cliente_versione_id`) → `clienti_versioni` (`cliente_id`, `id`): il database impedisce di puntare alla versione di un altro cliente | testate e righe degli ordini a fornitore, documenti, bollettini, righe di liquidazione, incassi |
| **Configurazioni** (regole che valgono da adesso) | solo `cliente_id` | interscambio (abbinamenti cliente → agenzia → subagente), condizioni e scaglioni del fornitore, eccezioni; la loro storia l'hanno già con `valido_dal` (D-35) |

- **Quale versione si aggancia:** quella **corrente quando la riga nasce** (`versione_corrente_id`
  letta nella stessa transazione, V13). Una fattura di marzo registrata ad aprile, dopo un cambio
  in Integra, aggancia la versione di aprile; se l'OCR legge sul documento dati diversi
  (ragione sociale, P.IVA) si apre un'anomalia, non si corregge da soli. Quello che l'OCR ha letto
  resta sul documento come prova (`documenti_campi`).
- **Le date non collegano niente:** `valido_dal` serve solo a rispondere a "com'era il 15 marzo"
  (Analisi, controlli) e a ordinare le versioni.
- **Nuova versione solo se cambia un campo che conta** (quelli della tabella delle versioni);
  i campi tecnici (`sincronizzato_il`, `modificato_il` di Integra) stanno sull'identità e si
  sovrascrivono. La sincronizzazione (§4.5) confronta i campi e, se sono cambiati, aggiunge la
  versione e sposta `versione_corrente_id`, tutto in una transazione.
- **Oggi** le versioni le scrive la sincronizzazione da Integra (`fonte = integra`); **domani**,
  quando le anagrafiche le gestirà il CRM, le scrive l'utente (`fonte = crm`) e Integra le riceve
  da noi attraverso `codici_esterni`. Il modello non cambia.
- **Ciò che arriva da Integra non si tocca (D-138):** se il soggetto ha almeno un ruolo da Integra
  (codice in `codici_esterni` o versione corrente con `fonte = 'integra'`), il master è in **sola
  lettura**: `PUT /api/soggetti/:id` e l'attiva/disattiva rispondono 409 «Dati di Integra: si
  correggono in Integra» senza scrivere, e la scheda non mostra i comandi. Per un soggetto **solo del
  CRM**, cambiare la P.IVA apre una versione nuova di **ogni** ruolo (`clienti_versioni`,
  `fornitori_versioni`) nella stessa transazione del master, con la P.IVA nuova e gli altri campi
  uguali. Il **codice di Integra non si scrive a mano** (un `codice_integra` nel corpo di un ruolo
  nuovo è 400): nasce solo da *Importa*.
  *Perché:* la P.IVA dei ruoli restava quella vecchia e una fattura con la P.IVA nuova non riconosceva
  il cliente; un codice digitato per sbaglio faceva sovrascrivere dal giro di sincronizzazione i dati
  di un altro soggetto su quel ruolo (V12, V13, D-102, D-111).

*Perché (D-46):* sovrascrivere perde la memoria dell'azienda; annullare e ricreare il record
spezza il cliente in più record (analisi e abbinamenti da ricollegare a ogni versione). Con
identità stabile e versione agganciata ogni fatto sa esattamente con quali dati è nato, in modo
atomico, senza ricostruirlo dalle date (stesso giorno, modifiche retroattive, confini). Le
configurazioni restano sull'identità, altrimenti ogni piccolo cambio di Integra (un CAP)
obbligherebbe a riagganciarle, ed è lì che nascerebbero gli errori sulle provvigioni.
**Da non "semplificare":** niente aggiornamento in place dei campi delle versioni, niente FK alla
sola identità sui fatti.

Le tabelle `fornitori` (§4.2.1) e `clienti` (§4.2.20) si dividono così già nello schema della
fase 2a (piano F0-A2); la sincronizzazione che aggiunge le versioni resta in F1 (piano F1-A7).
*Perché (D-48):* il seed e il motore delle provvigioni vengono prima di F1 e devono nascere sulle
tabelle giuste, mentre sono ancora vuote.

### 4.5 Sincronizzazione da Integra

> **Schema completo del database Integra:** `schema-db-integra.md` (architettura, modello
> anagrafica master/ruolo, colonne, regole, punti aperti).

| Dato | Vista nel database ponte (schema `public`) | Ogni | Note |
|---|---|---|---|
| Clienti | `integra_v_clienti` (P.IVA, ragione sociale, indirizzo, codice cliente) | 60 s | un cliente senza P.IVA valida è segnalato in Stato del sistema |
| Fornitori | `integra_v_fornitori` (P.IVA, ragione sociale, paese, codice fornitore) | 60 s | |
| Articoli (ampliamento §17) | `v_articoli` (codice, descrizione, EAN, UM, attivo) | 60 s | |
| Giacenze (ampliamento §17) | `v_giacenze` (codice, quantità) | 15 s | la più frequente: serve al disponibile |
| Ordini registrati (ampliamento §17) | `v_ordini_registrati` (numero, codice cliente, data) | 60 s | chiude gli impegni (§4.2.16) |

- **In questa fase** si sincronizzano solo **clienti e fornitori** (piano F1-A4); articoli,
  giacenze e ordini registrati arrivano con l'ampliamento (§17).
- **Verso dei dati (D-102)**: fino al passaggio la sincronizzazione è l'unico modo con cui un
  cliente entra nel CRM. Dal passaggio la direzione si divide:
  - i soggetti **già presenti** in Integra si continuano a leggere dalle viste (aggiornamenti
    anagrafici e fiscali), così il CRM non diverge dal gestionale;
  - i soggetti **nuovi** si creano nel CRM e si esportano verso Integra con un file
    (CSV/Excel) che carica chi gestisce Integra — mai una scrittura diretta, che D-100 vieta
    senza eccezioni;
  - ogni soggetto porta in `codici_esterni` i due codici che servono: `id_integra`
    (`cli_cdcli`, chiave stabile) e `codice` (`cla_codstr`, codice cliente/fornitore del ruolo,
    che è diverso per cliente e fornitore dello stesso soggetto — D-101).
  *Perché (D-102):* un'anagrafica sola, ma senza toccare il gestionale di produzione.
- **Database ponte** (D-32): le viste stanno in un **database PostgreSQL** preparato da
  Ugo e collegato a Integra (schema `public`); il CRM legge solo da lì, con un utente
  **in sola lettura** (`crm_lettura`), e non si collega mai al database di Integra.
  Colonne, chiavi e data di modifica delle viste si fissano guardando i dati veri del ponte
  (piano F0-A8), compresa l'email del cliente (§5.14).
  *Perché (D-32):* le viste si provano e si correggono senza toccare Integra; il CRM parla
  solo PostgreSQL; un guasto di Integra resta fuori dal CRM e si vede come anomalia
  `integra.connessione`.

> ⚠ **Vincolo assoluto (D-100): la connessione al server di Integra è SOLA LETTURA.**
> Il server PostgreSQL di Integra (connessione diretta via `postgres_fdw`, foreign server
> `integra`) si interroga **solo con `SELECT`**. Sono vietate **tutte** le altre operazioni —
> `INSERT`, `UPDATE`, `DELETE`, `MERGE`, `COPY`, `TRUNCATE`, ogni DDL e qualunque funzione
> che scrive — anche dove tecnicamente possibili. Il server di Integra **non viene mai
> modificato in nessun modo**, né dai servizi né a mano, né in sviluppo né in esercizio.
> La sola lettura è garantita dall'utente `crm_lettura`, con permesso di sola `SELECT`
> sulle viste dello schema `public`.
- **Colonne delle viste (confermate col ponte vero, D-101)**:
  `integra_v_clienti` e `integra_v_fornitori` (schema `public`) espongono `id_integra`
  (chiave `clienti.cli_cdcli`), `codice` (`cliazi.cla_codstr`, il codice cliente/fornitore),
  `ragione_sociale` (`cli_rgsoc`), `piva` (`cli_piva`), `codice_fiscale` (`cli_cfisc`),
  `indirizzo`, `cap`, `citta`, `provincia`, `paese` (da `cli_stacod`: 086=Italia, 094=Germania;
  manca la tabella dei nomi nazione), `email`, `pec` (`cli_pecdest`), `attivo`
  (`cli_obsoleto=0 AND cla_obsoleto=0`), `modificato_il` (massimo di data+ora+minuti di master e
  ruolo, colonne separate `dtvar`/`oravar`/`minvar`); `codice_agente` (`cla_agecod`) **solo per i
  clienti** — in azienda `001` ce l'hanno 674 clienti su 698 e **nessuno** dei 115 fornitori,
  perché l'agente è un ruolo del master e **non è collegato al fornitore** (D-109). Il codice
  agente del cliente si legge ma **non** riempie `interscambio.subagente_id` (D-105): chi segue un
  cliente *per un singolo fornitore* è l'agenzia, e dove il legame non c'è quel fornitore non ha
  rappresentanza. La chiave stabile è `id_integra`; il codice leggibile resta per la ricerca.
  `integra_v_agenti` (D-109) espone `id_integra` (`clienti.cli_cdcli`), `codice` (`agenti.age_cod`),
  `codice_master`, `ragione_sociale`, `piva`, `codice_fiscale`, `email`,
  `codice_agente_padre` (`age_agecod`, `"--"` → NULL), `attivo` (master e `age_obsoleto`),
  `modificato_il`; legge `agenti` JOIN `clienti` con `azi_cdazi = '001'` e `age_cod <> '--'`.
  Gli agenti **non** hanno righe in `cliazi`: `cla_tipo = 'A'` sono articoli, non agenti.
  *Perché:* le viste di Luis non espongono i disattivati e non passano il filtro a Integra; il
  CRM ha bisogno di entrambi. I disattivati si espongono con `attivo = false` e non si
  cancellano mai (le pratiche restano); il filtro `modificato_il > …` deve arrivare a Integra
  con `postgres_fdw` o una funzione con parametro, altrimenti ogni 60 s si rileggono tutte le
  righe.
- **Incrementale con margine di un giorno**: si legge da `ultimo giro riuscito − 1 giorno`,
  perché Integra non ha i secondi e il fuso può spostare l'ora. Rileggere una riga senza
  cambi non crea versioni nuove.
  *Perché:* un margine più stretto perderebbe righe modificate a cavallo del giro; uno più
  largo costa poco, perché una riga uguale non scrive niente.
- **Mai password nelle viste o nei testi**: il ponte usa `postgres_fdw` con `USER MAPPING` e un
  utente Integra in sola lettura; il CRM conosce solo `PONTE_URL` e l'utente `crm_lettura`.
  *Perché:* la password di Integra non deve comparire nella definizione delle viste, nei log,
  nel registro o nelle risposte delle rotte.
- Parametri in Impostazioni → Sincronizzazione da
  Integra (§7.15).
- **Incrementale**: dove la vista ha la data di ultima modifica si leggono solo le righe
  cambiate; le giacenze si leggono intere (sono poche migliaia di righe).
- **Un solo processo** sul server del CRM, con un passo per vista; ogni giro scrive in
  `servizi_esecuzioni` (§4.2.15); se un giro fallisce si riprova al successivo e dopo 3
  fallimenti di fila si apre un problema (§7.14).
- In ogni pagina che mostra dati di Integra c'è l'ora dell'ultima sincronizzazione.

### 4.7 Anagrafica su richiesta e storico dei legami (D-111, D-112, D-113)

> **Il CRM è il centro di verità (D-102), ma non si riempie in anticipo.** Entra in anagrafica solo
> chi serve a un documento; le relazioni del vecchio CRM si conservano in una tabella di storico
> autosufficiente, che propone e non crea.

**Perché (D-111):** l'import massivo da Integra obbligava a decidere prima tutto quello che si
poteva decidere dopo (1060 master senza ruolo, 16 P.IVA su due master, 11 agenti che sono anche
fornitori, 23 P.IVA estere), e a correggere Integra prima di partire. Con l'import su richiesta
l'anagrafica contiene solo i soggetti che hanno documenti o legami: niente pulizia preventiva,
niente righe morte, e le decisioni di business (`030` «DIREZIONALE», nomi degli agenti, agenti
senza P.IVA) si prendono quando il primo documento le tocca.

#### 4.7.1 Regole

1. **La sincronizzazione aggiorna, non crea** (`src/integra.ts`): per i soggetti già in anagrafica
   legge le viste e aggiunge una versione solo se cambia un campo che conta (D-46); i `nuovi`
   restano a 0. I disattivati e le anomalie restano come oggi (§4.5).
2. **La ricerca sulle viste è mirata**: `GET /api/integra/cerca?tipo=fornitore|cliente&q=`
   (`dati.importa`), **massimo 10 righe**, per codice del ruolo (`codice`) esatto, P.IVA o ragione
   sociale; nessun conteggio e nessuna scansione completa. Si interroga **solo su richiesta
   esplicita** (pulsante *Cerca in Integra*), mai a ogni tasto e mai per popolare una lista.
   *Perché:* una query con `exists` correlato sulle viste ha superato i 120 secondi attraverso
   `postgres_fdw` (11/11/2026); il ponte regge la ricerca puntuale, non quella di massa. Il limite
   di tempo di **5 s** vale solo per questa ricerca e per l'import su richiesta: la
   sincronizzazione completa non ha limiti stretti.
3. **L'import è una transazione** (`POST /api/integra/importa`, `dati.importa`): soggetto + ruolo +
   `codici_esterni` + versione nella stessa transazione (V13), evento `crud.create` su `cliente` o
   `fornitore`, riferimento `integra:<id_integra>`. Idempotente per codice: se il codice è già in
   `codici_esterni` risponde `{già_presente: true, codice_registrato: false, documento_collegato, id}`
   e non scrive niente. Un soggetto che è già cliente e arriva come fornitore aggiunge il **ruolo**,
   non un secondo soggetto. Se il ruolo ha già un **altro** codice di Integra dello stesso tipo
   (stessa P.IVA su due master), l'import si ferma con 409 e dice quale codice è già legato: il
   doppione va corretto in Integra. La risposta distingue `codice_registrato` (il codice è stato
   aggiunto ora) da `documento_collegato` (ora il documento ha quel fornitore). Con `documento_id`
   l'import collega il documento nella stessa transazione (D-133): il documento si blocca
   (`FOR UPDATE`) e si scrivono solo `fornitore_id` e `fornitore_versione_id`. *Importa* chiude la
   finestra, ricarica l'elenco e **apre la scheda** del nuovo soggetto, anche quando era già in
   anagrafica (D-135).
4. **Permesso `dati.importa`** (livello operatore, area Dati): copiare un'anagrafica da Integra non
   è modificarla. Chi ha `provvigioni.modifica` e `dati.importa` sblocca il proprio documento; chi
   ha solo `dati.consulta` vede il pulsante spento con il motivo.
5. **Scaglioni a mano, obbligatori (D-113)**: un fornitore importato nasce **senza** percentuali
   (il vecchio CRM non le ha). Prima di aprire una pratica si compilano dal form degli scaglioni
   (`dati.condizioni`, responsabile); finché mancano, la pratica non si apre e la card dice
   *«Mancano gli scaglioni del fornitore»* con il percorso. *Perché:* le percentuali sono soldi e
   dipendono dallo sconto; non si indovinano e non si copiano da un'altra azienda. Il controllo
   `scaglioni_mancanti` guarda la **data del documento**, come la pagina del fornitore guarda oggi e
   come `nuovaPratica` guarda l'ordine: un fornitore con scaglioni solo futuri fa avvisare la card
   prima del 409 (R1-12).
6. **Nessuna modifica al motore**: `interscambio` resta l'unica verità operativa, con FK, periodi e
   `EXCLUDE` (D-35); i documenti continuano a puntare a cliente e fornitore **con la versione**
   (D-46); D-87 resta com'è.

*Perché (D-111, D-133…D-135):* il ponte di Integra può essere giù o lento (VPN, password, vista):
senza risposta la pagina Documenti deve restare utilizzabile, quindi `cerca` non lancia mai — torna
«ponte lento» o «ponte non raggiungibile», con **una** anomalia nel registro — e solo la rotta
`GET /api/integra/cerca` risponde 502. Il pool ha tempi massimi su connessione (3 s) e query (5 s):
una query appesa non tiene occupate le due connessioni. `importa` ha lo stesso limite di 3 s. Il
paese del soggetto segue la regola degli script d'import (paese a due lettere, altrimenti prefisso
della P.IVA, altrimenti `IT`) e una P.IVA estera senza prefisso lo prende dal paese: altrimenti lo
stesso fornitore diventa due soggetti (D-101, D-102). Se il ruolo esiste già senza il codice di
Integra, l'import **registra il codice** (con evento `crud.update`): la sincronizzazione riconosce i
soggetti solo per codice. Due import insieme dello stesso soggetto si mettono in fila con
`pg_advisory_xact_lock`, così il secondo risponde «già presente» invece di un 500. Il nome letto dal
documento deve portare a **una sola** riga di Integra, la stessa che si sta importando, **anche se il
fornitore è già in anagrafica**: con zero righe (nome non trovato) il documento non si collega,
altrimenti basterebbe un `id_integra` qualsiasi per attaccarlo al fornitore sbagliato. La ricerca sul
ponte e la lettura del nome letto si fanno **prima** della transazione: un ponte lento non tiene
aperti advisory lock e `FOR UPDATE`, e la transazione di Prisma non scade a 5 s. La ricerca non apre
anomalie: la regola dei tre giri di fila è della sincronizzazione, non di una pagina aperta. Il
doppione di P.IVA in Integra non deve far prendere due codici allo stesso ruolo, che poi si
alternerebbero a ogni giro.

#### 4.7.2 `interscambio_storico` (D-112)

Fotografia dei 4022 legami del vecchio CRM (`dati-crm-legacy/collegamenti.csv`, estratto
08/11/2026), **tutti**, compresi i 1625 senza subagente. Solo lettura per l'app: propone, non crea.
L'import scrive nel database **dell'app** (`decobrands_db`): `decobrands_import` è stato soltanto la
prova di importazione del vecchio CRM (Ugo, 11/11/2026).

| Colonna | Tipo | Note |
|---|---|---|
| `id` | BIGSERIAL | |
| `fonte` | VARCHAR(20) | `vecchio_crm` (CHECK) |
| `estratto_il` | DATE | 08/11/2026 |
| `cliente_legacy_id` / `fornitore_legacy_id` | BIGINT | id del vecchio CRM |
| `cliente_codice_fornitore` | VARCHAR(50) | **la chiave che portano i documenti**: il codice con cui il fornitore identifica il cliente |
| `cliente_ragione_sociale`, `cliente_piva`, `cliente_cf` | testo | **copie**, per riconoscere senza avere il ruolo in anagrafica |
| `cliente_piva_norm` | VARCHAR(20) NOT NULL DEFAULT '' | P.IVA normalizzata (senza `IT`), su cui sta l'indice |
| `fornitore_ragione_sociale`, `fornitore_piva` | testo | copie |
| `agente_nome` | VARCHAR(200) | come sta scritto nel vecchio CRM (`DECOBRANDS SRL`) |
| `subagente_nome` | VARCHAR(200) NULL | **NULL = fornitore senza rappresentanza per quel cliente** (1625) |
| `sconto_1`, `sconto_2` | NUMERIC(5,2) | 0 se assenti |
| `cliente_id`, `fornitore_id`, `subagente_id`, `interscambio_id` | BIGINT NULL | si riempiono quando i ruoli nascono; **nessuna FK obbligatoria** |
| `stato` | VARCHAR(12) | `da_usare` · `usata` · `scartata` (CHECK) |
| `nota` | testo | perché è stata usata o scartata |
| `creato_il`, `usato_il` | TIMESTAMPTZ | |

Indici: `(fornitore_piva, cliente_codice_fornitore)`, `(cliente_codice_fornitore)`,
`(stato)`, `(cliente_piva_norm)`, `(subagente_nome)`. **Niente FK obbligatorie**: sono proprio
quelle che hanno reso necessario l'import massivo.

**Il fornitore e il cliente si riconoscono dai dati, non dagli id**: `fornitore_id`/`cliente_id`
restano **NULL** finché un soggetto non viene collegato (l'import non li conosce) e non si usano per
cercare. La ricerca confronta il **codice cliente del fornitore**, la **P.IVA normalizzata** e la
**ragione sociale normalizzata**: è quello che i documenti portano davvero.

**Perché i codici servono (e gli id no):** il documento porta `codice_cliente`, e `proposta.ts`
cerca già l'agenzia per `interscambio.codice_cliente_fornitore`; quindi la chiave di confronto è
(fornitore, codice del cliente). Gli id del vecchio CRM servono solo a ritrovare la scheda.

**Perché (R1-07, D-134):** una riga dello storico si consuma **una volta sola**: si legge con
`SELECT … FOR UPDATE` e, se `stato <> 'da_usare'`, la creazione dell'agenzia risponde 409. La coppia
si riconosce solo se **entrambi** i lati hanno un riscontro — id, P.IVA o ragione sociale
normalizzata: la P.IVA del fornitore da sola passerebbe per ogni cliente di quel fornitore (V13).
Il subagente proposto lo risolve il server dal nome, solo se è uno solo; omonimi o assente → campo
vuoto da scegliere (D-134). La normalizzazione della P.IVA è una sola, quella di `soggetti.ts`.

#### 4.7.3 `soggetti_storico` (D-112)

Le 3403 schede del vecchio CRM, solo i campi che servono a **riconoscere e creare**: id legacy,
ragione sociale / nome e cognome, P.IVA e CF (normalizzati in `piva_norm` e `cf_norm`), indirizzo,
CAP, città, provincia e paese (`CHAR(2)`), email, telefono, `sorgente` (`vecchio_crm`). Serve per i
**1410 clienti che non esistono in Integra**: quando il loro documento arriva, il server propone
l'import da qui invece di far digitare tutto a mano. Nessun ruolo, nessun legame, nessuna deduplica.

*Numeri dell'import (11/11/2026):* 3403 righe dalle 3405 schede (le due con `scheda_errore`, id
1619 e 787, restano fuori e sono negli scarti); `nome`/`cognome` vuoti perché i clienti del vecchio
CRM sono aziende. Un fornitore si riconosce anche per nome normalizzato: in `fornitori.json` la voce
«ISA PACKAGING » ha uno spazio finale, e 38 legami si risolvono solo così.

*Perché (R1-10):* l'import dello storico con `--sostituisci` svuota dentro la stessa transazione
dell'import, senza `RESTART IDENTITY`, e **solo** se nessuna riga è già usata (altrimenti rifiuta con
il conteggio): il lock sulla tabella esclude una creazione concorrente e lo stato delle agenzie
create non si perde (V13).

#### 4.7.4 All'arrivo di un documento

| Situazione | Cosa mostra la card | Cosa succede |
|---|---|---|
| Fornitore non in anagrafica, **una** riga nelle viste | *C'è in Integra: importa* + nome e P.IVA | `POST /api/integra/importa` → fornitore + soggetto; poi *Mancano gli scaglioni* |
| Fornitore non in anagrafica, **zero o più** righe | *Fornitore non trovato* (com'è oggi) | registrazione a mano |
| Cliente non riconosciuto, coppia trovata in `interscambio_storico` **con subagente** | cliente proposto con nome e P.IVA, subagente e sconto proposti | import del cliente (Integra o `soggetti_storico`) + agenzia e sconti dallo storico; la riga passa a `usata` |
| Coppia trovata nello storico **senza subagente** (1625) | *«Questo fornitore non è rappresentato per questo cliente»* | non si apre la pratica: *Configura l'agenzia* (+ scaglioni). Se in futuro serve, si aggiunge l'agente (Ugo, 11/11/2026) |
| Cliente riconosciuto e agenzia valida | come oggi (D-87) | niente di nuovo |

---

## 5. Regole di business

### 5.1 Modello a scaglioni

La provvigione si determina dallo **sconto accordato al cliente sul fornitore**
(`interscambio.sconto`): lo sconto cade in uno scaglione della tabella
`provvigioni_scaglioni` del fornitore, che definisce `pct_agente` e `pct_subagente`.

*Perché (D-166):* la provvigione attesa dal fornitore è `importo × pct_agente / 100`; `pct_subagente` si toglie da quella per dare il margine di Decobrands. Sommare le due percentuali («20 % + 8 %») calcolava un atteso sbagliato nel bollettino e un margine gonfiato.

### 5.2 Eccezioni per singolo subagente

Le eccezioni sono **rarissime**: tutti i subagenti hanno la stessa provvigione. Se
esiste una `provvigioni_eccezioni` del subagente per il fornitore e la soglia dello scaglione,
valida alla data del documento, `pct_personale` vince sulla percentuale standard (D-51). Si inseriscono nel CRM dalla scheda del subagente (§7.5) e il motore
le applica da solo (es. `1%` = eccezione `3%` del subagente Bastasin).
**Perché** (D-26): tutto il calcolo delle provvigioni deve stare nel CRM; un'eccezione
gestita fuori non comparirebbe né nella liquidazione né nell'Analisi.

**Regole del subagente per cliente e per documento** (D-27). La quota del subagente su un
documento si decide così, vince la prima regola presente:

1. **correzione sul documento** (`provvigioni_correzioni`, §4.2.7.2): altra %, nessuna o
   importo fisso, con motivo obbligatorio; da Liquidazioni (§7.8);
2. **una fattura al mese** sull'agenzia (`interscambio.regola_mensile`): conta la prima o la
   più alta fattura del mese per quel cliente e fornitore; le altre danno 0 al subagente (le
   note di credito seguono la fattura a cui si riferiscono);
3. **% dell'agenzia** (`interscambio.pct_subagente`): vale solo per quel cliente;
4. **eccezione personale** sullo scaglione (§4.2.3);
5. **% standard** dello scaglione.

Le regole riguardano solo quanto si paga al subagente: quanto riconosce il fornitore segue
lo scaglione e si controlla nel bollettino (§6.2). Lo "sconto fittizio" (es. 1 % per dare a
Bastasin il 3 %) non serve più: lo sconto dell'agenzia resta quello vero.

**Perché** (D-27): gli accordi con i subagenti sono vari e non tutti prevedibili; con
agenzia, regola mensile e correzione sul documento ogni caso si gestisce nel CRM senza
cambiare il codice, e ogni scostamento resta motivato e tracciato.

*Perché (A2-02, A2-03):* se una fattura del mese è già liquidata, è lei la «fattura del mese»
anche se una tardiva vincerebbe `prima`/`piu_alta`: il mese è consumato e la tardiva va a quota 0.
La correzione a importo fisso su una nota di credito vale col segno invertito (il valore digitato
è sempre positivo e indica una riduzione): −10 e non +10.

### 5.3 Zero, trattino e note di credito

- `0,00 €` = **nessuna provvigione** (né agente né subagente).
- `–` = il subagente prende la **percentuale standard dello scaglione** (equivalente
  all'assenza di eccezione).
- **Nota di credito** → è un **documento della pratica** (`tipo = nota_credito`,
  §4.2.7.1), con importo **negativo**, figlio di una o più fatture. La provvigione
  lavora allo **stesso modo ma in negativo**: es. 10 % di −120,00 € = −12,00 €.
  - **Totale** (`storno_totale = true`): storna l'intera fattura a cui si riferisce →
    la provvigione su quella fattura va a zero.
  - **Parziale** (`storno_totale = false`): riduce l'imponibile della parte stornata
    per resi, abbuoni, sconti successivi.
  - Nel flusso, la nota di credito è un **documento agganciato alla pratica**
    (§6.1): non genera una pratica a sé. La provvigione si calcola sul **netto**
    dei documenti (fatture − note di credito, §4.2.7.1).
  - **Nota con storno totale** segue la fattura: se l'importo della fattura cambia, il server
    la ricalcola nella stessa transazione (storna quello che lasciano le note parziali, D-54).
  - **Da decidere con Matteo** (oggi non controllato): date coerenti (nota di credito non prima
    della sua fattura, fattura non prima dell'ordine) e documenti nuovi datati dentro un periodo
    già chiuso (bollettino verificato o trimestre liquidato, D-51).

*Perché (D-182, D-183):* lo **scaglione** si sceglie dallo **sconto medio** letto sui documenti
(1 − netto/lordo, pesato sul lordo), non dallo sconto impostato sull'agenzia; il documento che
comanda è l'ultimo arrivato (ordine → conferma/proforma → fattura), senza righe utili si usa lo
sconto dell'agenzia. La **base della provvigione** è il **netto meno le spese escluse**: le righe
di spesa (trasporto, imballo, «Fracht») non entrano nella base salvo che l'accordo col fornitore
le includa (`spese_base_provvigione`, predefinito no); lo sconto medio si calcola sulle sole righe
di merce. Lo sconto di riga dei documenti è già dentro l'imponibile netto del documento (ARTE lo
stampa per riga, non in fondo), quindi la provvigione è già sull'imponibile scontato: nessun
calcolo separato dello sconto a piè di documento. Ogni documento fiscale salva i propri valori
calcolati (base, spese, sconto medio, scaglione, % e provvigioni, regola) e li **congela** alla
chiusura; la pratica non salva valori suoi, è la somma dei documenti.

### 5.4 Agente unico: Decobrands SRL

L'agente operativo è **uno solo**. Schwarzmeier e Monzani sono storici (ex-socio di Marco)
e non entrano nella liquidazione attuale; restano in anagrafica per non perdere il
dato storico.

### 5.5 Maturazione: maturato vs fatturato (per fornitore)

Alcuni fornitori pagano sul **maturato** (quando incassano dai clienti), altri sul
**fatturato** (all'emissione della fattura). Il criterio è **informazione del fornitore**
(`tipo_provvigione`) e si applica coerentemente sia a ciò che incassa Decobrands sia a ciò
che paga ai subagenti: maturato→maturato, fatturato→fatturato.

Come si comportano quando **il cliente non paga** (risposta di Decobrands, 16/10/2026):

| | Fatturato | Maturato |
|---|---|---|
| Quando arriva la provvigione | nel bollettino del mese della fattura | nel bollettino del **mese in cui il cliente paga** |
| Se il cliente non paga | nel bollettino di 1 o 2 mesi dopo la provvigione viene **stornata** (riga negativa) | semplicemente **non viene riconosciuta** |
| Quando il cliente paga | la provvigione viene **riaccreditata** nel bollettino del mese del pagamento | viene riconosciuta in quel mese |

Le regole di dettaglio (stati della fattura, solleciti, effetto sui subagenti) sono in §5.14.

*Perché (D-121):* il tipo di provvigione è una regola strutturale dei soldi, non un dettaglio
dell'anagrafica: decide come si ricalcolano dal vivo i mesi già chiusi (Analisi, Report
subagenti). Si sceglie solo finché il fornitore non ha una chiusura (bollettino verificato o
trimestre liquidato); dopo, il server risponde 409. `giorno_bollettino` e `giorni_incasso`
restano liberi perché toccano solo solleciti e scadenze.

### 5.6 Cadenze

- **Subagenti**: liquidazione trimestrale su trimestri fissi **Gen-Mar, Apr-Giu,
  Lug-Set, Ott-Dic**.
- **Fornitori**: bollettini **mensili** — un documento per fornitore e mese
  (`fornitore_id`, `mese`, `anno`). Un fornitore con cadenza diversa sarà rimosso.
- Il bollettino è la base **mensile**; la **liquidazione ai subagenti** resta
  trimestrale (§6.3) aggregando i bollettini del trimestre di competenza.
- **Quando si aspetta il bollettino.** Il bollettino del mese *m* è atteso entro il
  giorno `fornitori.giorno_bollettino` (1–28, iniziale **10** per tutti, modificabile
  nelle condizioni del fornitore) del mese *m + 1*. Stato del mese per fornitore, quando
  ci sono documenti fiscali del mese e il bollettino non è registrato:
  - mese non finito → *in corso* (nessuna segnalazione);
  - mese finito, oggi ≤ data attesa → **atteso** (compare in "Prossime scadenze", §7.1,
    e nella matrice bollettini come "Atteso entro il gg/mm"; **nessun sollecito**);
  - oggi > data attesa → **non arrivato**: compare in "Da fare" come *Sollecita il
    bollettino* e nella matrice con l'azione *Sollecita*.
  Senza documenti fiscali nel mese il bollettino non è atteso.

### 5.7 Riferimento cliente → fornitore e sconto

Ogni cliente ha un **fornitore di riferimento** con un **codice cliente** e uno
**sconto**, se accordato. Questa relazione vive nella pagina **cliente** (riferimenti
completi) e si riflette in `interscambio` (`cliente_id`, `fornitore_id`, `sconto`).
Lo sconto di `interscambio` è **il campo canonico** che determina lo scaglione in
liquidazione e nel confronto bollettini.

*Perché (D-182):* `interscambio.sconto` non determina più lo scaglione: nasce dall'import del
vecchio CRM (`sconto1` di `collegamenti.csv`) o da `FormAgenzia`, mai dalle righe dei documenti.
Lo scaglione si sceglie dallo **sconto medio** letto sui documenti (D-182). Lo sconto di riga
(Rabatt/Sonderrabatt) è lo sconto del **fornitore** sulla merce e resta dentro l'imponibile netto:
non va collegato in automatico allo sconto che Decobrands accorda al cliente, per non confonderli.

### 5.8 La conferma può cambiare le carte in tavola

Il fornitore può confermare **quantità/importi diversi** dall'ordine (es. 10 articoli
ordinati, 7 confermati). La provvigione si calcola sui dati **fatturati**, non
sull'ordine originale.

Le tre fasi sono tenute come **fotografie separate** delle righe (`fase = ordine |
conferma | fattura`, §4.2.8): la riga confermata **non sostituisce** più quella ordinata.
Il sistema calcola il **confronto fra fasi** allineando le righe per `codice` e
segnala gli scostamenti di composizione (§7.3, §7.1):

- **articoli spariti** o **comparsi** fra una fase e l'altra;
- **variazioni di quantità** e/o **prezzo** (e quindi di importo);
- **delta complessivo** della pratica, evidenziato quando ≠ 0.

Le pratiche con scostamenti compaiono fra le **segnalazioni** della dashboard (§5.12).

### 5.9 Fatture multi-ordine e ordini multi-tranche

Entrambi i casi sono supportati dal modello a ponte dei **documenti** (§4.2.7.1):
- **una fattura copre più ordini** (già vista nel rendiconto: la 629 ne copre quattro):
  la stessa fattura compare su **più pratiche**, una riga per pratica in
  `ordini_fornitore_documenti` con la quota attribuita (§4.2.7.1);
- **un ordine viene fatturato in più tranche** (tipico di importatori come Gasper GmbH e
  Ing's Christmas Decor GmbH, o clienti che tengono articoli in back order).

Ogni documento (`fattura` o `nota_credito`) è una riga di `ordini_fornitore_documenti`
agganciata alla pratica; l'**importo netto** della pratica è la somma algebrica dei suoi
documenti ed è la base del calcolo provvigioni (§5.3).

### 5.10 Un cliente → un subagente per fornitore

Un cliente **non può** avere più subagenti sullo stesso fornitore (vincolo `UNIQUE` su
`interscambio`). Può invece avere subagenti diversi su fornitori diversi. I casi
residui vengono risolti internamente da Marco.

### 5.11 Le percentuali nel tempo

Le condizioni nuove valgono **dal periodo in cui vengono riviste**; quelle precedenti
vanno rilette con le percentuali di allora. Implementazione:
- ogni versione delle percentuali ha la sua data (`provvigioni_scaglioni.valido_dal`): ogni
  documento si calcola con la versione in vigore alla **sua data** (D-25);
- una versione nuova, una correzione o un'eccezione valgono **da una data in poi**, e la data
  deve essere **dopo l'ultima chiusura** del fornitore (fine mese dell'ultimo bollettino
  chiuso, verificato o contestato, o fine dell'ultimo trimestre liquidato, la più recente): prima, 409. Una versione
  può cadere fra due esistenti; le eccezioni hanno un periodo proprio e non si copiano (§4.2.2,
  §4.2.3). **Perché** (D-51): i soldi chiusi non cambiano; dove una correzione non ha ancora
  effetto resta libera; niente copie né casi strani con le versioni future;
- in più `bollettini_righe` congelano `pct_calcolata`/`importo_calcolato` alla verifica: un
  mese verificato non cambia più, nemmeno se si corregge una versione.

**Perché** (D-25): il solo congelamento copriva i mesi già verificati, non i documenti ancora
in attesa del bollettino né l'Analisi dei periodi passati.

**Una finestra per uno scaglione (D-168).** L'inserimento e la correzione usano una sola finestra piccola che mostra un scaglione alla volta; la data modificabile decide se aggiungere alla versione esistente o crearne una nuova, che copia gli scaglioni in vigore. *Perché (D-168):* la griglia larga con tutte le righe non stava nella finestra, obbligava a scorrere di lato e rendeva facile modificare la riga sbagliata; le rotte del server accettavano già l'elenco completo.

### 5.12 Alert solo in-app

Le segnalazioni (conferme in scadenza, bollettini da verificare, differenze, **variazioni
di composizione fra fasi e note di credito**) compaiono come **alert nella dashboard /
nelle schermate**. **Nessuna email.**

### 5.13 Modifica manuale senza blocchi

Nel controllo bollettino, quando gli importi non tornano (promozioni, condizioni
particolari), l'operatore può **confermare l'importo del fornitore o correggerlo
manualmente** senza che il flusso si blocchi. La differenza resta comunque registrata e
il bollettino può passare a `verificato` o `contestato`.

### 5.14 Incassi dei clienti: insoluti, storni, riaccrediti e solleciti di pagamento

**Chi incassa.** Decobrands **non incassa** dai clienti: incassa il fornitore. Se il
cliente non paga, il fornitore **sollecita Decobrands**, che a sua volta **sollecita il
cliente**. Il CRM quindi deve sapere, per ogni fattura, se è stata pagata, e aiutare a
sollecitare.

**Stato d'incasso della fattura** (`ordini_fornitore_documenti.stato_incasso`, §4.2.7.1):
`da_incassare` → `pagata` oppure `insoluta` → (dopo il pagamento) `pagata`. Si ricava dai
bollettini; si imposta anche a mano quando il fornitore segnala un insoluto per email o
telefono (*Segna come non pagata*, con data e nota).

**Fornitori sul fatturato**
1. La fattura entra nel bollettino del suo mese e la provvigione è riconosciuta.
2. Se il cliente non paga, 1–2 mesi dopo il bollettino contiene una **riga di storno**
   (importo negativo, riferita alla fattura). Nella verifica la riga è riconosciuta come
   `storno`: **non è una differenza da contestare**; la fattura passa a `insoluta` e
   compare fra i **pagamenti da sollecitare** al cliente.
3. Quando il cliente paga, un bollettino successivo contiene il **riaccredito** (riga
   positiva sulla fattura stornata): la fattura passa a `pagata`.
4. **Storno alla liquidazione successiva, per entrambi** (confermato da Decobrands il
   18/10/2026): per **Decobrands** lo storno arriva nel **bollettino mensile** successivo;
   per il **subagente** va nella **liquidazione trimestrale successiva**, cioè la prima
   ancora aperta dopo la chiusura del bollettino che contiene lo storno, come **voce
   negativa** riferita alla fattura (anche se la provvigione originale era già stata
   liquidata in un trimestre chiuso). Il riaccredito segue la stessa regola con una voce
   positiva. Nel prospetto di liquidazione (§11) le righe compaiono come *Storno
   F-…* / *Riaccredito F-…* con il trimestre della fattura d'origine.

   *Perché:* uno storno o un riaccredito di un documento già liquidato riprende subagente e
   provvigione dalla fotografia della liquidazione che l'ha pagato (non li ricalcola sull'agenzia
   attuale): così un cambio d'agenzia dopo la chiusura non sposta le provvigioni passate né le manda
   al subagente sbagliato (D-35, A2-01).

**Fornitori sul maturato**
1. Una fattura **assente** dal bollettino del suo mese non è una riga "mancante" da
   decidere: è **in attesa di incasso** (nessuna azione, nessun sollecito al fornitore).
2. Quando il cliente paga, la provvigione compare nel bollettino del **mese del
   pagamento**: la riga si abbina alla fattura di qualunque mese precedente, non solo del
   mese del bollettino; la fattura passa a `pagata`.
3. Se dopo `giorni_incasso` dalla data fattura (condizione del fornitore, iniziale 60) la
   provvigione non è ancora riconosciuta, la fattura diventa **incasso da verificare**: si
   chiede al fornitore se è stata pagata o si sollecita il cliente.
4. **Subagenti**: come oggi, la provvigione entra nella liquidazione quando il bollettino
   che la riconosce è verificato (maturato→maturato).

*Perché (D-118):* sul maturato una nota di credito segue la fattura a cui si riferisce e si
liquida quando quella fattura viene riconosciuta; «in attesa di incasso» è una condizione solo
delle fatture, non delle note di credito. Il fornitore spesso non elenca la nota nel bollettino:
senza questa regola restava non liquidabile per sempre e il subagente teneva la provvigione intera.

**Trimestre già chiuso** (D-57): una provvigione che cadrebbe in un trimestre già liquidato (fattura
sul maturato riconosciuta da un bollettino verificato dopo la chiusura, fattura sul fatturato registrata
in ritardo) va nel **primo trimestre ancora aperto dopo**, come gli storni; un documento o una voce già
legati a una liquidazione (`liquidazione_id`) restano in quella. Per lo stesso motivo i trimestri si
chiudono **in ordine**: prima il precedente.
*Perché:* il trimestre chiuso non si ricalcola, quindi senza questa regola la provvigione non sarebbe mai
pagata al subagente; l'ordine evita un trimestre aperto in mezzo a due chiusi, che resterebbe scoperto.

*Perché (D-150):* una nota di credito sul maturato di una fattura già liquidata in un trimestre
chiuso non riapre il chiuso (D-33) e non ne cambia la fotografia: la provvigione tolta va nella
liquidazione successiva come voce negativa (trimestre dopo per il subagente, mese dopo per
Decobrands), con una sola regola per gli storni (D-11). Il riferimento della nota è il più tardo
fra il suo documento e il riconoscimento della fattura; così non torna in un periodo già chiuso.

**Sollecito di pagamento al cliente**
- In **Oggi** un nuovo gruppo **Pagamenti da sollecitare** (fatture insolute e incassi da
  verificare), dal più vecchio; *Prepara i solleciti* crea **un testo per cliente** con le
  fatture non pagate (numero, data, fornitore, importo, giorni di ritardo), come per i
  solleciti di conferma (§7.1). Copiando il testo si registra il sollecito
  (`sollecitata_il`, `solleciti`) e l'evento (§15).
- Finestra **Solleciti di pagamento** (da Oggi, dal bollettino con *Prepara il sollecito al
  cliente*, dalla pratica con *Sollecita il cliente*): in alto una scheda per cliente con il
  numero di fatture (✓ quando il testo è stato copiato), sotto il destinatario e il testo
  modificabile (fatture con numero, data, fornitore, importo e giorni, totale, invito a
  pagare o a segnalare contestazioni). *Copia il testo* copia, registra il sollecito e
  passa al cliente successivo; *Chiudi* esce.
- Nella **pratica** la fattura mostra lo stato d'incasso; nel **cliente** (§7.6) la scheda
  Pratiche ha il filtro *Non pagate*.

**Domande per Decobrands** (prima di realizzare):
- il sollecito al cliente lo manda Decobrands o il subagente che lo segue (in copia)?
- i solleciti del fornitore arrivano per email in un formato ricorrente? Se sì possono
  entrare da Documenti come nuovo tipo `sollecito_insoluti`;
- `giorni_incasso`: basta un valore per fornitore o dipende dal cliente (termini di
  pagamento diversi)?
- l'email del cliente per il sollecito arriva da Integra (vista `v_clienti`)?

---

## 6. Flussi funzionali

**Canale comune: ingresso documenti (§6.5).** Tutti i documenti del CRM (ordini a
fornitore, conferme, fatture, note di credito, bollettini) entrano dall'ingresso
documenti interno: ricezione → coda → lettura GLM-OCR → controllo dell'operatore →
abbinamento — senza doppie digitazioni. I documenti non leggibili restano in
`documenti_in_arrivo` con stato `errore`; gli allegati restano sulla pratica
(`documenti_in_arrivo`). Tutti i flussi sotto usano questo canale.

### 6.1 Flusso documentale: ordine → conferma → fattura

```
[1] Ordine  ──carica documento + dati letti──►  pratica in stato "inviato"  (altri ordini si sommano)
[2] Conferma o proforma (facoltative) ──aggancio──►  stato "confermato"  (quantità/importi possono variare)
[3] Fattura  ──aggancio alla pratica──►  stato "fatturato"   → entra nel calcolo provvigioni (anche senza [2])
[4] Nota di credito ──documento agganciato alla fattura──►  riduce l'imponibile (totale/parziale)
[5] Pagamento del cliente (facoltativo) ──aggancio──►  segno "pagato", nessun effetto sui calcoli
```

*Perché (D-60):* lo stesso modello vale per ogni fornitore: c'è chi non manda la conferma, chi
manda la proforma, chi spezza l'ordine in più ordini. Conferma e proforma sono facoltative e lo
stato non le richiede.

*Perché (D-87):* un ordine apre la pratica **solo** se esistono il fornitore riconosciuto,
l'agenzia (`interscambio`, con sconto, valida alla data del documento) **e** lo scaglione del
fornitore per quello sconto. Se manca uno dei tre il documento non entra nel calcolo: una
provvigione mancante non deve mai diventare uno 0% silenzioso. Nell'app il blocco è al momento di
*Apri la pratica* (409 con il dato mancante); l'etichetta «da configurare» in coda è del prototipo
(D-131). Lo sconto 100 (percentuali 0/0 legittime) non è un dato mancante: il blocco guarda alla
presenza, non al valore.

*Perché (D-137):* un documento che entra in una pratica **già aperta** ha bisogno solo dell'agenzia
valida alla **data dell'ordine** di quella pratica (D-35/D-60): la provvigione è quella dell'ordine, e
una chiusura dell'agenzia dopo l'ordine non la cancella. L'agenzia alla **data del documento** si
chiede solo quando il documento apre una **pratica nuova** (D-106). Altrimenti una fattura datata dopo
la chiusura dell'agenzia non entrerebbe più nella sua pratica e la provvigione dell'ordine resterebbe
fuori; subagente e percentuali seguono comunque l'ordine, non la fattura.

- La pratica può essere agganciata all'**ordine cliente di origine** via
  `ordine_cliente_id` (§4.1): la tracciabilità parte dall'ordine ricevuto dal cliente.
- Ogni documento della pratica (ordine, conferma, proforma, fattura, nota di credito,
  pagamento, altro) è una riga di `ordini_fornitore_documenti` con il proprio file
  (`arrivo_id`, §4.2.7.1, D-60); il file sta nella cartella della pratica (§6.5).
- **Variazioni di composizione**: a ogni cambio di fase le righe vengono fotografate
  (`fase`, §4.2.8); il confronto fra ordine, conferma e fattura è calcolato a runtime e
  gli scostamenti (articoli aggiunti/tolti, quantità, prezzi) finiscono fra le
  **segnalazioni** (§5.8, §5.12, §7.3).
- La scadenza della conferma è `data_ordine + giorni_attesa_conferma` del fornitore,
  calcolata quando serve (D-37). Vale finché non arriva una conferma, una proforma o una
  fattura (D-60).
- Passata la scadenza senza conferma, la pratica finisce nella lista **segnalazioni**
  della dashboard (alert in-app, §5.12).
- La **lettura automatica** dei documenti propone i dati letti dal PDF (§6.5);
  l'operatore li **conferma o corregge** prima dell'abbinamento.

### 6.2 Flusso controllo bollettini

1. Si imposta il bollettino (fornitore, mese, anno).
2. Si inseriscono le **righe** del bollettino del fornitore (fattura, importo, % e
   importo riconosciuti).
3. Il sistema calcola il **corrispondente atteso**: scaglione del fornitore applicato
   all'importo merce → `pct_calcolata` e `importo_calcolato`, e quindi `differenza`.
4. Le righe con differenza ≠ 0 vengono evidenziate; la testata cumula
   `importo_riconosciuto`, `importo_calcolato` e `totale_differenze`.
5. L'operatore verifica: se gli importi divergono per promozioni/condizioni, **conferma o
   corregge manualmente** (§5.13) senza bloccare.
6. Il bollettino passa a **`verificato`** (ok) o **`contestato`** (si comunica al
   fornitore e si attende la rettifica).
7. **Incassi** (§5.14): le righe di **storno** e di **riaccredito** (fatturato) e le
   provvigioni riconosciute **al pagamento** su fatture di mesi precedenti (maturato) si
   abbinano alla fattura di origine e aggiornano il suo stato d'incasso; le fatture sul
   maturato assenti dal bollettino restano **in attesa di incasso** e non vanno decise.

*Perché (D-119):* un bollettino contestato non si riapre e non si sostituisce (D-56: uno per
fornitore e mese): le correzioni del fornitore arrivano come righe del bollettino del mese dopo,
riferite ai documenti del mese contestato, e si riconciliano contro quei documenti. Dire di
aspettare un «bollettino rettificato» lasciava il contestato in attesa per sempre.

### 6.3 Flusso liquidazione subagenti

1. Filtri: fornitore, subagente, trimestre, anno.
2. Il **rendiconto** è calcolato **al volo** dai dati fatturati (stato = `fatturato`),
   usando `interscambio` per associare cliente→subagente e gli scaglioni per la
   percentuale (§formula in §10).
3. Elenco righe per subagente + **riepilogo** (n. fatture, totale merce, totale
   provvigione subagente).
4. **Esportazione** con i campi concordati (§11), pronta per generare il bollettino per
   subagente.

### 6.4 Flusso anagrafiche

- **Fornitori**: CRUD + `tipo_provvigione` (§5.5) + giorni attesa + scaglioni provvigione.
- **Agenti / subagenti**: CRUD; l'agente operativo è Decobrands SRL (§5.4).
- **Interscambio**: associazione subagente × cliente × fornitore con sconto; vincolo
  unico (§5.10).

---

### 6.5 Ingresso documenti (senza n8n, GLM-OCR in locale)

```
casella email (IMAP) ─┐
caricamento manuale ──┴─► coda `documenti_in_arrivo` ─► lettura GLM-OCR (vLLM, GPU locale)
   ─► affidabilità per campo + controlli fissi ─► "Documenti": controllo operatore
   ─► abbinamento a pratica / nuova pratica / registrazione bollettino
```

1. **Ricezione.** Un lavoro pianificato del backend legge la casella con `imapflow` **ogni
   N minuti (Impostazioni → Casella, §7.15)** e salva gli allegati PDF e le foto (JPEG, PNG);
   il caricamento manuale (trascinamento o "Carica documenti") scrive nella stessa tabella. Lo
   `file_hash` scarta i doppioni e le email lette si spostano nella cartella delle lette
   (`cartella_lette`), così non si rileggono al giro dopo (D-66). Prima si leggono solo **UID e
   dimensione**: un'email oltre `DOCUMENTI_MAX_MB` non si scarica, apre `casella.allegato` e si
   sposta fra le lette, così un allegato enorme da un mittente qualsiasi non finisce in memoria
    (D-82). La soglia della casella vale sull'**email intera** con margine per la base64 e più
    allegati (`Math.ceil(DOCUMENTI_MAX_MB · 1,4) · 3`), così tre fatture da 7 MB in una sola email
    entrano; il limite del singolo file resta in `riceviDocumento` (A4-12). Ogni file passa da
   **un solo ingresso** (`riceviDocumento`,
   `src/documenti.ts`): tipo controllato dai primi byte, **PDF, JPEG o PNG** (D-60: i pagamenti
   arrivano spesso come foto); gli **Excel** (`.xlsx`, `.xlsm`, `.xls`, anche rinominati) si
   rifiutano con 415 e un messaggio chiaro (*Perché D-60:* sono fogli firmati a mano dagli
   impiegati, non documenti del fornitore); i messaggi di Outlook `.msg` pure (si carica
   l'allegato); limite `DOCUMENTI_MAX_MB` (413), file scritto su disco **prima** della
   transazione in `DOCUMENTI_DIR/in_arrivo/AAAA/AAAAMMGG/<impronta>.<pdf|jpg|png>` (giorno di
   Roma, percorso salvato in `file_percorso`) con l'impronta come nome (mai il nome del browser), poi riga `in_coda` ed
   evento `documento.upload` in una transazione; se la transazione fallisce il file resta
   orfano e un nuovo invio dello stesso file lo riusa (D-54). Lo stesso file già `scartato` si
   può ricaricare: torna `in_coda` sulla stessa riga, con l'evento. Un file si abbina solo se è
   `in_coda` o `da_controllare`. La lettura parte dopo il commit.

   *Perché (D-122):* lo stesso file di un documento scartato torna in coda solo se lo si ricarica
   a mano (`origine = caricamento`); se arriva di nuovo dalla casella il giro lo conta fra gli
   ignorati e lo scarto resta. Un promemoria del fornitore con lo stesso PDF non deve riaprire uno
   scarto voluto («Non riguarda Decobrands», «Doppione»), che precisa D-54.

   **Archivio per pratica (D-60, sostituisce D-55).** All'abbinamento il file si **sposta** in
   `DOCUMENTI_DIR/pratiche/AAAA/AAAAMM/<numero pratica>/<tipo>_<numero o data>.<est>`, es.
   `pratiche/2026/202609/OF-2026-041/fattura_F-2026-0891.pdf` (AAAA/AAAAMM = data della pratica;
   nomi ripuliti per il disco: lettere senza accenti, cifre, `.`, `_`, `-`; `_2`, `_3`… se il nome
   c'è già). Lo spostamento avviene **dopo il commit** (`archivia`), in quest'ordine: copia senza
   sovrascrivere → `file_percorso` aggiornato solo se nessuno l'ha cambiato → cancellazione del
   vecchio. Se un passo fallisce l'abbinamento resta, il file resta dov'era e il percorso salvato
   è giusto (al più resta una copia orfana). Se il documento passa a un'altra pratica il file la
   segue; annullando un documento il file resta dov'è. L'impronta resta nel database per i
   doppioni. *Perché:* i file si cercano anche a mano, per pratica, con nomi leggibili.
2. **Coda.** La coda è la tabella `documenti_in_arrivo` (nessuna coda esterna). Il lettore
   prende un documento alla volta con `prelevaDocumento` (`SELECT … FOR UPDATE SKIP LOCKED`,
   stato `in_lettura` e tentativo nella stessa transazione, V13) e, se la lettura non riesce,
   `letturaFallita` lo rimette `in_coda` o, al terzo tentativo, lo porta `errore` con
   l'anomalia `lettura.fallita` (§7.14.3). Le due funzioni stanno in `src/documenti.ts` e le
   usa F6-A2.
3. **Lettura.** Il lettore è un **connettore** scelto in Impostazioni → Server di lettura (D-67).
   Oggi c'è `llamacloud_eu`: carica il file, chiede l'estrazione con **un solo schema JSON**
   (`SCHEMA_DOCUMENTO`, `src/lettura.ts`) e restituisce ogni campo con la **confidenza** del
   fornitore e la **citazione** (pagina, testo, riquadro). Lo schema comprende il **tipo** del
   documento, che il modello legge insieme agli altri campi: il tipo non si sa prima di leggere e
   una seconda chiamata raddoppierebbe i crediti (D-69). Fra i campi c'è anche la **P.IVA del cliente** (`piva_cliente`, D-91): si riconosce il cliente anche quando il codice del fornitore non è ancora abbinato. Le righe di tutte le pagine arrivano in un
   solo elenco (`extraction_target: 'per_doc'`), quindi il nostro codice non le fonde. Quando arriva
   la macchina si aggiunge `openai_compatibile`: **GLM-OCR** servito da **vLLM** (interfaccia
   compatibile OpenAI), con prompt di estrazione, uscita vincolata allo schema e `logprobs` per
   l'affidabilità; la posizione si ricava a parte (§6.6, funzione da verificare).

   *Perché (D-125):* si legge solo con LlamaCloud UE; il connettore locale resta spento finché non
   arriva la macchina. Un connettore che non esiste, scelto, lascerebbe i documenti in coda per
   sempre, senza anomalia; per questo il salvataggio lo rifiuta con 400 (D-67, D-125).

   **Coda.** `LetturaService` (`src/lettura.ts`) consuma la coda ogni 15 s, un documento per giro:
   `prelevaDocumento` porta la riga `in_lettura`, il file si legge da `DOCUMENTI_DIR` (solo
   `file_percorso`, mai un percorso arrivato dal browser) e si passa al connettore; al salvataggio i
   campi vanno in `documenti_campi` e il documento diventa `da_controllare` con `tipo`, `letto_il`,
   `modello` ed `errore` vuoto. Senza connettore configurato non si preleva niente: i file restano in
   coda. Una lettura non riuscita passa da `letturaFallita`; ogni documento scrive una riga in
   `servizi_esecuzioni` (§4.2.15). **Excel dei bollettini:** rinviati (D-60: gli Excel si rifiutano
   con 415 e non c'è un ingresso alternativo); quando servirà si deciderà un canale a parte (D-69).
4. **Affidabilità per campo** (0–1): con `llamacloud_eu` è la `confidence` del fornitore; con il
   connettore locale è calcolata dal backend dalle probabilità dei pezzi di testo che compongono il
   valore (per numeri, codici e date la probabilità **minima**; per i testi lunghi la **media**).
   Ogni campo si salva in `documenti_campi` con `valore_letto`, `affidabilita`, `posizione` e
   `precisione`; `valore_finale` resta vuoto e `verificato` falso finché l'operatore non corregge
   (F6-A4). L'affidabilità del documento è quella del campo meno affidabile.
5. **Controlli fissi**, indipendenti dal modello, calcolati al salvataggio della lettura e
   ricalcolabili con le stesse funzioni in F6-A4 (in `controlli` resta l'ultimo esito). Il fornitore si riconosce
   dal nome letto, **normalizzato** (minuscole, senza accenti, punteggiatura e spazi ridotti; le
   sigle societarie restano parte del nome) contro la ragione sociale corrente: nessun match o più
   di uno → non riconosciuto. Se non combacia si riprova **senza le sigle societarie** (GmbH, S.r.l.,
   …), accettando un nome contenuto nell'altro solo con un **match unico**: sui documenti veri il
   modello ha letto «ARTE GmbH & Co.KG» per «Arte Wohnaccessoires GmbH & Co. KG» (D-71). I controlli, con la forma `{falliti: [{codice, campo, testo, grave}]}`
   in `documenti_in_arrivo.controlli` (§4.2.12):
   - `bollettino` (grave): bollettino già registrato per fornitore + mese + anno;
   - `codice_cliente` (grave): codice cliente non presente fra i clienti del fornitore
     (`interscambio` **valido alla data del documento**, oggi se la data manca);
   - `totale` (grave): totale letto ≠ somma delle righe, tolleranza 0,01;
   - `riga` (non grave): quantità × prezzo ≠ importo di una riga, tolleranza 0,01 — `campo: 'righe[N]'`;
   - `articolo` (non grave): articolo letto assente fra le righe della pratica proposta;
   - `data` (non grave): data del documento **precedente alla data dell'ordine** della pratica
     proposta (questa è "data fuori dal periodo della pratica", D-71).
    Se il fornitore non è riconosciuto, i controlli che ne hanno bisogno (codice cliente, articolo,
    bollettino) si saltano, senza segnarli falliti.
    *Perché:* la P.IVA estera porta il prefisso del paese e l'anagrafica può non averlo; si confronta
    senza prefisso e senza spazi (D-124), e con più clienti sulla stessa P.IVA decide la ragione
    sociale normalizzata a match unico.
    *Perché (D-92):* il documento può portare solo la P.IVA, solo la ragione sociale, o entrambe:
    si riconosce il cliente quando entrambi i lati hanno un riscontro, poi si sceglie la via più
    probabile (P.IVA univoca, altrimenti ragione sociale normalizzata a match unico). Un cliente
    riconosciuto per sbaglio sposta la provvigione al subagente sbagliato.
    *Perché (D-152):* il riconoscimento non è sempre univoco: più soggetti condividono la P.IVA o
    hanno nomi simili. Invece di scegliere a caso (D-111) il server prepara i candidati — dal CRM e
    da Integra — con la fonte e il motivo, e la persona decide; nessun calcolo nel browser (V12).
     Se Integra non risponde i candidati sono solo del CRM, con la nota: un errore non deve bloccare
     la pagina del documento.
     *Perché (D-164):* il confronto sul solo nome normalizzato non basta: sui documenti veri una lettera
     scambiata (ACCESSOIRES / ACCESSORIES) faceva fallire il riconoscimento e lasciava `fornitore_id`
     vuoto, bloccando anche l'abbinamento per codice cliente. Il vocabolario dei nomi già scelti
     (`alias_letti`) impara dall'operatore e si consulta per primo; la somiglianza `pg_trgm` (soglia
     0,6, distacco 0,2) riconosce un solo candidato e con più candidati propone, senza scegliere a caso.
     *Perché (D-165):* la P.IVA letta dal documento è il segnale che riconosce il soggetto quando manca
     in anagrafica: salvarla (solo se il campo è vuoto, mai sovrascrivendo) evita la ricerca a mano e
     non crea un doppione; con una P.IVA già di un altro soggetto il server rifiuta col nome.
   **Nessun blocco sull'anagrafica articoli**: nel giro dei bollettini Decobrands
   fa da agente e gli articoli dei fornitori non sono (né saranno) nella sua
   anagrafica. Il codice articolo è un campo di ricerca sugli **articoli già usati dal
   fornitore** nei documenti registrati: pallino verde se noto, rosso se nuovo; un
   articolo nuovo si inserisce lo stesso e non conta fra i punti da controllare.
   Le righe nuove si aggiungono da una finestra modale (articolo, descrizione,
   quantità, prezzo; un articolo noto propone descrizione e ultimo prezzo).
   *Perché (D-179, D-194):* un importo di riga restituito come **0** su una riga che vale
   (quantità × prezzo > 0) è uno 0 del lettore, non un importo letto: `componiLetto` lo mette
   a vuoto e la riga risulta **calcolata**; uno 0 vero (omaggio con prezzo 0) resta. Le righe di
   **spesa** (trasporto, imballo, «Fracht»: codice testo, non articolo) si leggono come righe e si
   segnano `spesa: true`; se entrino nella base lo decide D-183, non la lettura.
   *Perché (D-169):* il numero d'ordine del fornitore è il primo aggancio di ogni documento —
   nell'ordine è il suo numero, negli altri documenti è il riferimento all'ordine — e vale sempre in
   coppia con il fornitore: da solo un fornitore può riusarlo in un altro anno. La pratica porta il
   numero dell'ordine che l'ha aperta, cliente, fornitore e agenzia si ereditano dalla pratica, e la
   codifica interna `OF/AAAA/NNN` resta il riferimento principale.
   *Perché (D-170):* la risposta completa del lettore si conserva (`lettura_grezza`, solo sul server,
   tetto 5 MB): permette di ricavare campi nuovi dai documenti già letti senza spendere una rilettura,
   e il testo del documento non deve girare al browser (V12).
   *Perché (D-176):* le righe lette devono essere nella fotografia della pratica prima di confrontarle
   (prima le creava solo il seed), e il livello «Affidabile» riguarda la sola lettura: i punti
   sull'abbinamento stanno in un gruppo «confronto» a parte, così i due problemi non si confondono.
6. **Livello** del documento, mostrato in "Documenti" e sul pulsante "Correggi i dati
   letti" (numero di campi da controllare). Contano i campi con un valore, non `verificati`,
   con affidabilità sotto `soglia_ok`; **`tipo` è escluso dal conteggio** (la sua confidenza è
   strutturalmente bassa — è una classificazione, 0,47–0,86 sui documenti veri anche quando giusto,
   D-71). L'affidabilità nulla conta come incerta ma **non** come `bassa`. `n` = campi incerti +
   controlli falliti (il contatore "N da controllare").

   | Livello | Regola iniziale (tarata, D-151) | Interfaccia |
   |---|---|---|
   | `affidabile` | tutti i campi ≥ 0,80 e nessun controllo fallito | nessun avviso |
   | `da_controllare` | un campo fra 0,70 e 0,80 o un controllo fallito | avviso giallo |
   | `bassa` | un campo < 0,70 o fallito un controllo su campo chiave (codice cliente, totale) | avviso rosso; l'abbinamento chiede conferma |

7. **Correzione.** "Correggi i dati letti" apre una finestra a tutto schermo: a
   sinistra il PDF (divisore trascinabile), a destra testata e righe modificabili
   (aggiungi/elimina riga); i campi incerti hanno bordo giallo/rosso con l'affidabilità
   al passaggio del mouse; selezionando un campo si evidenzia nel PDF il punto da cui è
   stato letto, **se la posizione è stata trovata** (§6.6: cloud verificato, locale e scansionati da verificare); ogni campo corretto o confermato diventa `verificato`. Salvando si
   ricalcolano controlli e abbinamento proposto.

   *Perché (D-133):* la correzione è parziale di natura — chi cambia il solo fornitore non deve
   perdere le righe lette dal modello. In `correggi` le righe si riscrivono **solo se il corpo le
   porta**; l'import del fornitore da Integra si fa sul server, in una transazione, e non tocca campi
   né righe.

   **Nell'app (F6-A4b, D-73).** La finestra mostra il **file originale vero**: i PDF con
   **PDF.js** (canvas, §6.6.1), le foto con lo stesso visualizzatore; selezionando un campo il PDF apre la
   **pagina** del campo e disegna il **rettangolo** del valore quando la posizione è
   stata trovata (sotto dice *Pagina N · posizione indicativa / approssimativa, controlla sul documento*; mai «esatta», D-189). Il
   rettangolo vale per il connettore cloud (prova F0-A7 positiva); per il locale
   (GLM-OCR) e i PDF scansionati resta da verificare. I bordi dei campi usano le
   **soglie in vigore**, che il server manda col documento (`soglie`, D-151) e la
   pagina usa per colori, «%» e conteggio dei punti: niente soglie fisse nel browser
   (V12); il livello del documento resta quello calcolato dal server. Le righe nuove si
   aggiungono come ultima riga vuota, si portano in vista e si manda il fuoco sul loro
   primo campo; le righe si mandano con `i: null`.

   *Perché (D-151):* sui documenti veri i campi sopra 0,80 erano tutti giusti, quindi la soglia
   «affidabile da» parte da **0,80** (era 0,90) e «affidabilità bassa sotto» resta **0,70**. Le soglie
   sono una regolazione delle Impostazioni e valgono ovunque dal valore salvato: il browser non può
   avere soglie fisse, altrimenti colori e contatori discorderebbero dal livello calcolato dal server
   (V12). Cambiandole, i documenti ancora da decidere si riclassificano subito.
8. **Taratura.** Ogni correzione resta in `documenti_campi` (letto, finale,
   affidabilità): dopo le prime centinaia di documenti si fissano le soglie per
   fornitore; lo stesso archivio serve per un eventuale riaddestramento del modello.

**Requisiti del server di lettura:** GPU NVIDIA con driver CUDA, vLLM e modello
`zai-org/GLM-OCR` (0,9 miliardi di parametri); la memoria video necessaria va
verificata nella prova F0-A6. Il server è a carico del cliente.

### 6.6 Evidenziazione del valore nel documento — cloud verificato · locale da verificare

> ⚠ **Funzione non garantita.** Evidenziare nel PDF (o nell'Excel) il punto da cui è
> stato letto un valore dipende dal tipo e dalla qualità del file. Sui PDF generati da
> gestionale ci si aspetta che funzioni bene; sui documenti **scansionati o fotografati**
> l'evidenziazione può risultare **approssimata o mancare**. La correzione dei dati
> funziona comunque: l'evidenziazione è un aiuto, non un requisito per salvare.
> Il rettangolo sul valore è **verificato con il server di lettura cloud**; con GLM-OCR locale e
> con documenti scansionati o fotografati è **ancora da verificare** (D-06 confermata).
>
> **Con `llamacloud_eu`** (D-67) la citazione per campo porta pagina, testo e riquadro: se il
> riquadro c'è, `precisione = esatta`; se manca, `assente`. La prova F0-A7 resta per il connettore
> locale (GLM-OCR), non per il cloud.
>
> *Perché (U23, D-06 confermata):* il rettangolo sul valore è verificato con il server di lettura
> cloud; con GLM-OCR locale e con i documenti scansionati o fotografati è ancora da verificare.

**Perché serve una soluzione a parte.** GLM-OCR in modalità *estrazione con schema JSON*
(quella usata per leggere i dati, §6.5 punto 3) restituisce **solo i valori**, senza
posizione. La modalità *analisi della pagina* dello stesso pacchetto restituisce i
**blocchi** della pagina (testo, tabella, immagine) con il loro riquadro (`bbox_2d`,
coordinate normalizzate) ma **non** la posizione di singole parole, righe o celle: il
contenuto di un blocco tabella è HTML/Markdown senza coordinate. La posizione del
singolo valore va quindi ricavata **cercando il valore letto** in una fonte che abbia
le coordinate parola per parola.

#### 6.6.1 Visualizzazione (uguale per tutti i casi)

- **PDF:** ogni pagina si disegna con **PDF.js** come immagine nel browser; sopra c'è
  uno **strato trasparente** della stessa dimensione dove si disegnano i rettangoli di
  evidenziazione, posizionati in **percentuale** della pagina (restano allineati a ogni
  ingrandimento). Il file originale non si tocca.
- **Excel:** il foglio si ricostruisce come tabella HTML (larghezze di colonna, celle
  unite, formato dei numeri) con `exceljs`; l'evidenziazione colora la **cella** o la
  **riga** (indirizzo esatto, nessuna coordinata da calcolare).
- **Tre esiti**, visibili all'operatore:

  | `precisione` | Come appare | Quando |
  |---|---|---|
  | `esatta` | rettangolo pieno sul valore (o sulla riga) | valore trovato nelle parole del file o nella cella Excel |
  | `approssimata` | rettangolo tratteggiato sul **blocco** (es. tabella) o sulla **fascia** della riga | trovato solo il blocco o la riga, non il valore |
  | `assente` | nessun rettangolo; scritta "posizione non trovata" | valore non trovato |

#### 6.6.2 Come si trova la posizione

**A. PDF digitale** (con strato di testo: quasi tutte le conferme e fatture da
gestionale). Si estraggono le **parole con le coordinate** dallo strato di testo
(`pdfjs-dist` lato server, oppure `pdfplumber`), si **normalizza** il valore letto e lo
si cerca:
- importi: varianti `1.234,56` / `1234,56` / `1,234.56` / `1234.56`; date: `03.09.2026`,
  `03/09/2026`, `2026-09-03`, `3. Sep. 2026`; codici: maiuscole, senza spazi, con le
  confusioni tipiche `O/0`, `I/1`, `S/5`, `B/8`;
- se il valore compare più volte, si sceglie l'occorrenza **vicina all'etichetta**
  attesa (testata: "Datum", "Rechnung Nr.", "Kunden-Nr.", "Summe", "Gesamtbetrag"…;
  dizionario per fornitore) oppure **sulla riga giusta** (righe: vedi sotto);
- **righe:** si cerca il **codice articolo** della riga N; le parole con la stessa
  ordinata (±½ altezza di riga) formano la fascia della riga; quantità e prezzo si
  cercano dentro quella fascia. Il rettangolo della riga è l'unione delle sue parole.

**B. PDF scansionato o foto** (nessuno strato di testo). Serve una lettura che dia le
**parole con il riquadro**: si valuta nella prova, in quest'ordine,
1. un lettore a livello di parola affiancato a GLM-OCR solo per le posizioni
   (**PaddleOCR** PP-OCRv5 rilevamento + riconoscimento, oppure **Tesseract** con uscita
   hOCR), poi la stessa ricerca del punto A con confronto **tollerante** (distanza di
   modifica ≤ 1–2 caratteri sui codici, numeri uguali dopo la normalizzazione);
2. in mancanza, i **blocchi** dell'analisi della pagina GLM-OCR (`bbox_2d`): esito
   `approssimata` sul blocco (es. intera tabella o riquadro dei totali); per le righe
   la fascia si stima dividendo il blocco tabella per il numero di righe (solo se le
   righe hanno altezza regolare).

**C. Excel** (bollettini). Il valore è certo e l'indirizzo è noto: si legge con
`exceljs` e per ogni campo si salva `{foglio, cella}`; per una riga `{foglio, riga}`.
Il rischio non è la lettura ma l'**interpretazione** del foglio:
- **mappa delle colonne per fornitore** (nuova colonna `fornitori.mappa_excel` JSONB:
  foglio, riga di intestazione, colonna → campo, righe da saltare): proposta in
  automatico dalle intestazioni ("Rechnung", "Netto", "Provision", "%"), **confermata
  la prima volta** dall'operatore e riusata dalle volte successive;
- **punti da controllare** al posto dell'affidabilità di lettura: colonna non
  riconosciuta, intestazioni diverse dalla mappa salvata, righe scartate (subtotali,
  note), celle con testo al posto di un numero (`"1.234,50"`), celle unite nelle righe
  dati, totale del foglio ≠ somma delle righe;
- la finestra "Correggi i dati letti" resta la stessa (foglio a sinistra, dati a
  destra, clic su un punto → cella evidenziata).

#### 6.6.3 Prova di fattibilità F0-A7 — cosa estrarre e come

Obiettivo: **misurare** su documenti reali quanto spesso la posizione si trova e se è
giusta, e decidere se proporre la funzione al cliente (e in che forma).

1. **Campione** (fornito dal cliente): per Gries, Gasper, Ing's e un altro fornitore,
   10 conferme + 10 fatture + 3 note di credito + 3 bollettini PDF + 3 bollettini Excel,
   **includendo** tutti gli scansionati disponibili. Totale indicativo 100–120 file.
2. **Classificazione:** per ogni PDF si verifica se ha lo strato di testo (parole
   estraibili). La quota di **digitali** decide gran parte dell'esito.
3. **Estrazione dei valori** (già prevista in F0-A6): GLM-OCR via vLLM, schema JSON per
   tipo documento, `logprobs` → valori + affidabilità per campo.
4. **Estrazione delle posizioni**, tre fonti a confronto sullo stesso campione:
   - (a) parole + coordinate dallo strato di testo (`pdfjs-dist`/`pdfplumber`);
   - (b) GLM-OCR **analisi della pagina** (SDK `glmocr` con PP-DocLayoutV3): blocchi con
     etichetta e `bbox_2d`, HTML delle tabelle; si annota formato e sistema di
     coordinate effettivi, tempi per pagina e memoria video;
   - (c) per gli scansionati: PaddleOCR (o Tesseract hOCR) parole + riquadri.
5. **Abbinamento valore → posizione** con lo script di ricerca del §6.6.2
   (normalizzazione, etichette, ancora sul codice articolo) per ogni campo di testata e
   ogni riga.
6. **Verifica a mano** su ~300 campi estratti a caso: la posizione evidenziata è quella
   giusta? Si classificano `esatta` corretta / `esatta` sbagliata / `approssimata` /
   `assente`.
7. **Misure** per tipo di file (digitale, scansionato, Excel) e per campo (testata,
   righe): % trovati, % **errati** (il caso peggiore: evidenzia il punto sbagliato),
   tempo aggiuntivo per documento.
8. **Soglie di decisione** (proposte):

   | Esito | Criterio | Decisione |
   |---|---|---|
   | Verde | digitali: testata ≥ 95 % e righe ≥ 90 % `esatta` corretta, errati ≤ 1 % | funzione inclusa per i PDF digitali e gli Excel |
   | Giallo | scansionati: ≥ 70 % `esatta` o `approssimata` corretta, errati ≤ 3 % | inclusa come aiuto "approssimato" per gli scansionati, con la scritta di avviso |
   | Rosso | sotto le soglie o errati > 3 % | sugli scansionati nessuna evidenziazione: solo il PDF a fianco e la ricerca manuale |

9. **Consegna:** tabella dei risultati, esempi visivi (buoni e cattivi), raccomandazione
   e impatto sulle ore di F6-A2/F6-A4. **Solo dopo** si conferma al cliente cosa farà la
   funzione. Se un evidenziatore sbagliato è più frequente della soglia, è meglio non
   mostrarlo: un riquadro nel punto sbagliato confonde più di nessun riquadro.

#### 6.6.4 Fonti (consultate il 15/10/2026)

Cosa è stato verificato su ciascuna fonte e cosa resta da confermare nella prova F0-A7.

| Fonte | Cosa dice | Uso nel §6.6 |
|---|---|---|
| [GLM-OCR — repository ufficiale (zai-org)](https://github.com/zai-org/GLM-OCR) | Analisi in due fasi: **analisi della pagina con PP-DocLayout-V3** e lettura in parallelo dei blocchi; l'SDK restituisce Markdown + **JSON con i dettagli dei blocchi** (`result.json_result`); opzione `pipeline.layout.use_polygon`; servizio in proprio con **vLLM ≥ 0.19** (`vllm serve zai-org/GLM-OCR`) o SGLang. | Fonte (b) del punto 4 della prova; installazione del server (F0-A6). |
| [GLM-OCR — scheda del modello (Hugging Face)](https://huggingface.co/zai-org/GLM-OCR) | Due modalità: **lettura del documento** (richieste "Text Recognition:", "Table Recognition:", "Formula Recognition:") ed **estrazione di informazioni**, con richiesta che "deve seguire uno schema JSON rigoroso". L'esempio di estrazione **non contiene coordinate**. | Conferma che l'estrazione con schema (§6.5 punto 3) dà **solo i valori**: la posizione va ricavata a parte. |
| [Z.AI — Layout Parsing, documentazione API](https://docs.z.ai/api-reference/tools/layout-parsing) | Ogni blocco (`layout_details`) ha `index`, `label` (`text`, `table`, `formula`, `image`), `content` (testo o **HTML della tabella**), `bbox_2d` = `[x1, y1, x2, y2]` **normalizzati 0–1**, larghezza e altezza della pagina. **Nessuna coordinata per riga o parola.** | Esito `approssimata` sul blocco (§6.6.1); motivo per cui serve una fonte parola per parola. |
| [DebuggerCafe — GLM-OCR in proprio con vLLM](https://debuggercafe.com/self-hosting-glm-ocr-using-vllm-document-layout-and-ocr/) | Esempio di uscita del pacchetto in proprio: blocchi con `index`, `label`, `content` (tabella in Markdown), `bbox_2d` **in interi** (es. `[90, 66, 940, 966]`, verosimilmente scala 0–1000) e `polygon` a 4 punti. | **Da verificare** nella prova: scala e origine delle coordinate in proprio (diverse dall'API, che usa 0–1). |
| [GLM-OCR — segnalazione #241](https://github.com/zai-org/GLM-OCR/issues/241) | Su una tabella letta **ritagliata** dal suo `bbox_2d` si sono persi i separatori decimali (10,72 → 1072) in un'installazione su Apple/MLX; non riprodotto con vLLM; causa non confermata. | Rischio da controllare nella prova sui numeri con la virgola (importi tedeschi/italiani). |
| [PaddleOCR — analisi della pagina (PP-DocLayout)](https://www.paddleocr.ai/latest/en/version3.x/module_usage/layout_analysis.html) | Modulo che riconosce i blocchi della pagina e ne restituisce i riquadri; fa parte della stessa famiglia di strumenti che offre il rilevamento e la lettura **a livello di riga/parola** (PP-OCR). | Fonte (c) per gli scansionati, da valutare nella prova. |
| [PDF.js (Mozilla)](https://mozilla.github.io/pdf.js/) | Disegna le pagine PDF nel browser ed espone il testo della pagina con la posizione di ogni pezzo di testo. | Visualizzazione (§6.6.1) e fonte (a) lato server con `pdfjs-dist`. |
| [pdfplumber](https://github.com/jsvine/pdfplumber) | Estrae da un PDF digitale parole e caratteri con le coordinate. | Alternativa alla fonte (a). |
| [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) | Lettore con uscita **hOCR** (testo con riquadro per parola). | Alternativa alla fonte (c). |
| [exceljs](https://github.com/exceljs/exceljs) | Legge e scrive file xlsx: celle, formati, celle unite, larghezze di colonna. | Bollettini Excel (§6.6.2 C), già previsto in §6.5. |

**Non ancora verificato** (da chiudere nella prova F0-A7): scala e origine di
`bbox_2d` nel pacchetto in proprio; possibilità di ottenere dal pacchetto GLM-OCR
coordinate più fini del blocco; quota reale di PDF digitali e scansionati nei documenti
di Decobrands; tempi e memoria video con analisi della pagina attiva.

## 7. Schermate

Le rotte sono quelle del prototipo ufficiale (§7.10, D-24): nell'app lo stesso percorso
senza `#`.

| # | Rotta | Schermata |
|---|-------|-----------|
| 1 | `/accesso`, `/accesso/cambia`, `/accesso/dimenticata`, `/accesso/password/:codice` | Accesso con nome utente (o email) e password; cambio della password (obbligatorio con la provvisoria); password dimenticata (§7.0, §3.3) |
| 2 | `/` | Oggi: cose da fare per gruppi (home dopo l'accesso, §7.1) |
| 3 | `/documenti`, `/documenti/:id` | Ingresso documenti (§7.9) |
| 4 | `/pratiche`, `/pratiche/:id` | Elenco e dettaglio delle pratiche (§7.2, §7.3) |
| 5 | `/bollettini`, `/bollettini/:id` | Matrice di 6 mesi e riconciliazione (§7.7) |
| 6 | `/liquidazioni/:anno/:t` | Liquidazione del trimestre (§7.8) |
| 7 | `/analisi` | Analisi (§7.22) |
| 8 | `/fornitori`, `/fornitori/:id` | Fornitori con percentuali e clienti seguiti (§7.4) |
| 9 | `/subagenti`, `/subagenti/:id` | Subagenti con eccezioni personali (§7.5) |
| 10 | `/clienti`, `/clienti/:piva` | Clienti (da Integra) con le loro agenzie (§7.6) |
| 11 | `/utenti/:id`, `/sistema`, `/impostazioni/:sezione`, `/scartati`, `/guida/:argomento` | Gestione (§7.13–§7.17) |
| 12 | `/registro` | Registro di eventi e anomalie (amministratore, §7.11) |
| — | `/ordini-cliente`, `/articoli`, `/giacenze`, `/alias-kit` | Vendita diretta: spenta, ampliamento futuro (§17) |

### 7.0 Accesso (`/accesso`) — D-39, D-42

Pagine fuori dall'app, con lo stesso aspetto (componente `CRM.Accesso`, §16.4). Nessuna voce
di menu.

- **Presentazione** (solo *Accedi*): la pagina è tutta del colore scuro della barra; al centro
  compare il logo (bianco) con *Sistema Informativo Aziendale* e l'invito "Premi un tasto o tocca per
  entrare"; il logo resta finché non si preme un tasto o si tocca. In basso due righe: la
  licenza ("Software proprietario sviluppato internamente da Decobrands. Uso riservato agli
  utenti autorizzati.") e "© 2026 Decobrands S.r.l. · Tutti i diritti riservati · *Licenza
  d'uso*"; il collegamento apre una finestra con la licenza (D-43). Al primo tasto o tocco
  il modulo si apre in una finestra (passaggio veloce, circa 0,15 s) con il **primo campo
  attivo** e il logo scuro in testa (anche su *Password dimenticata*); il tasto premuto non si
  perde e finisce nel primo campo. Il modulo c'è già nella
  pagina, chiuso e non raggiungibile, così il gestore delle password del browser può
  riempirlo. *Perché* (D-42): ingresso col marchio, senza costare tempo a chi scrive subito.
- Fra le pagine di accesso (*Accedi* ↔ *Password dimenticata*) la finestra resta aperta e
  cambia solo il contenuto; dai link delle email (`/accesso/password/:codice`), dal cambio
  password e da *Esci* → *Accedi* aperto da un'altra pagina di accesso non c'è la
  presentazione. Su *Accedi* e *Password dimenticata* **Esc** o un **clic fuori** dalla finestra
  tornano al logo (D-42), e così dopo **2 minuti senza tasti né clic**; chi sta scrivendo non
  viene chiuso. Tornando al logo il modulo **riparte vuoto**: alla riapertura c'è solo il nuovo
  tasto. *Perché*: una finestra lasciata aperta su un computer d'ufficio non deve conservare
  quello che si era scritto. Chi ha chiesto meno animazioni al sistema la vede senza movimento.
  *Perché (D-129):* è voluto che i campi si svuotino: sulla postazione lasciata aperta i campi
  scritti non restano a vista. È un'eccezione voluta a WCAG 2.2.1, come il timeout di inattività
  (D-89).

- **Accedi** (`/accesso`): *Nome utente o email*, *Password* (con il pulsante mostra/nascondi),
  *Resta collegato su questo computer* (spuntata: 30 giorni; senza: fino alla chiusura del
  browser), **Entra**, *Password dimenticata?*. Un solo messaggio per ogni errore:
  "Credenziali non valide". Dopo l'accesso si torna alla pagina chiesta, senza un "Torna a"
  verso la pagina di accesso.
- **Scegli la tua password** (`/accesso/cambia`, obbligatoria con la password provvisoria):
  password provvisoria, nuova password, ripeti; **Salva e continua**; *Esci*. Finché non si
  cambia, ogni altra pagina riporta qui. La stessa pagina, con *Password attuale* e *Annulla*,
  serve a cambiarla quando si vuole (*Cambia la password* nel menu dell'utente, in fondo alla barra).
- **Password dimenticata** (`/accesso/dimenticata`): *Email*, **Manda il link**; poi sempre
  "Controlla la posta", anche se l'email non è registrata.
- **Nuova password** (`/accesso/password/:codice`, dal link dell'email): nuova password e
  ripeti; un link scaduto o già usato dà "Il link non è valido o è scaduto".
- **Esci**: nel menu dell'utente, in fondo alla barra.
- Campi con `autocomplete` (`username`, `current-password`, `new-password`): funzionano i
  gestori di password e l'incolla (WCAG 2.2, 3.3.8). Sul tablet i campi hanno carattere a 16 px
  (niente zoom automatico).

*Perché (D-39):* stesso modo di entrare della Gestione Ordini; aspetto uguale al resto
dell'app, così l'utente riconosce subito dove si trova; il pannello centrato è leggibile anche
sul tablet.

### 7.1 Oggi (`/dashboard`)

La pagina è una **lista di cose da fare organizzata per tipo di lavoro**, non un
cruscotto di numeri (prototipo: `prototipo-alternativo/`, pagina Oggi).

- **Riquadri in testa** (KpiRow) che fanno da **filtro**: *Conferme in ritardo* (con la
  più vecchia e il numero di fornitori da sollecitare), *Documenti in coda* (quanti
  chiedono una decisione e quanti sono pronti), *Bollettini* (da verificare o chiudere,
  da sollecitare), *Pagamenti dei clienti* (fatture da sollecitare, quanti clienti, giorni
  della più vecchia; §5.14). Clic = mostra solo quel gruppo; secondo clic = tutti.
- **"Da fare" in gruppi richiudibili** (componente GruppiDaFare, §16.4); aperti o chiusi
  restano come l'utente li lascia; la lista scorre nel suo riquadro, le intestazioni dei
  gruppi restano visibili:
  - **Conferme in ritardo** (alert §5.12), ordinate per giorni di ritardo, con il ritardo
    in evidenza; azione di gruppo **Prepara i solleciti**: **un testo per fornitore** con
    l'elenco delle sue pratiche in ritardo (numero, data, cliente, codice cliente del
    fornitore, importo, data attesa), schede per fornitore, *Copia il testo* passa al
    fornitore successivo; ogni copia resta nel registro operazioni (§15.2.3, `export.sollecito`);
  - **Documenti da decidere**: riassunto della coda (pronti da abbinare, dati letti da
    controllare, da scegliere o verificare) e **solo** i documenti che chiedono una
    decisione (abbinamento non sicuro, cliente non riconosciuto, doppioni, lettura non
    affidabile); azione *Apri la coda* (§7.9);
  - **Bollettini**: da verificare, pronti da chiudere, **non arrivati** dopo il giorno
    atteso del fornitore, da sollecitare (§5.6). I bollettini da verificare o sollecitare
    sono quelli degli **ultimi 12 mesi e del mese in corso**, non solo dell'anno di oggi: il
    bollettino di dicembre si sollecita a gennaio (A4-02, D-03, D-144).
  - **Pagamenti da sollecitare** (§5.14): fatture insolute (storno nel bollettino o
    segnalazione del fornitore) e incassi da verificare (maturato oltre `giorni_incasso`),
    dal più vecchio; *Prepara i solleciti* = un testo per cliente; riquadro *Pagamenti dei
    clienti* fra quelli in alto.
- **Colonna destra rivolta al futuro**:
  - due **schede** nello stesso riquadro (si ricorda l'ultima aperta): **Prossime scadenze** (15 giorni): conferme attese, bollettini del mese precedente
    attesi entro il giorno del fornitore (§5.6), fine del trimestre; ogni voce porta alla pagina relativa;
    e **Ultime operazioni** (6, compatte);
  - sotto, sempre visibile, il **trimestre in corso**: atteso dai fornitori, già
    riconosciuto, da liquidare, bloccato in attesa dei bollettini.
- Le **pratiche con variazioni** fra fasi (§5.8) restano segnalate nell'elenco
  Pratiche (filtro "Con variazioni").

**Nell'app (F5-A1):**

- `GET /api/oggi` (`provvigioni.consulta`, §8.1) calcola dal database riquadri, gruppi,
  scadenze, ultime 6 operazioni e trimestre in corso. I testi (titoli, dettagli, date e
  importi) li compone il server (V12); il browser mostra e filtra soltanto.
- I quattro **riquadri** filtrano la lista: un clic mostra solo quel gruppo, un secondo
  clic torna a tutti. I **gruppi** sono richiudibili e ricordano lo stato.
- **Documenti da decidere** elenca i documenti della coda (F6, D-95): titolo dell'azione
  proposta (apri l'ordine, abbina il documento, registra il bollettino), fornitore, livello
  di lettura e collegamento a `/documenti/:id`; il riquadro *Documenti in coda* e la voce
  del menu contano gli stessi documenti, che entrano anche nel totale "da fare".

  *Perché (D-191):* ogni voce dice **quale documento** chiede la decisione — bollettino →
  «Registra il bollettino di …», ordine → «Apri la pratica dell'ordine …» (o il nome del file
  se non letto), gli altri «Abbina …» + nome file (non letto) o tipo/numero (letto) — e la riga
  di descrizione unisce fornitore, cliente, importo, data, motivo e giorni in coda. Il fornitore
  è `ragione_sociale` dell'abbinamento, poi il campo letto `fornitore`, poi «non riconosciuto»:
  prima le voci erano tutte uguali e dicevano «non riconosciuto» anche quando l'OCR aveva letto il nome.
- **Conferme in ritardo**: *Prepara i solleciti* apre la finestra con un testo per
  fornitore da `GET /api/solleciti/conferme`; *Copia il testo* passa al successivo. La
  copia lascia l'evento `export.sollecito` (`POST /api/solleciti/conferme`, fornitore e
  numeri delle pratiche ricalcolati dal server): il registro dice quando un fornitore è
  stato sollecitato.

  *Perché (D-184):* il testo del sollecito mette in testa il riferimento che **serve a chi riceve**
  — `Ordine <numero del fornitore>` (`numero_ordine_fornitore`, D-169), poi data, cliente con
  «vostro codice cliente», importo e «conferma attesa entro il» — e il nostro numero di pratica
  solo in fondo come «nostro rif. OF/…», mai come primo riferimento.
- **Bollettini** e **Pagamenti da sollecitare** portano alle pagine che li risolvono;
  *Prepara i solleciti* dei pagamenti apre la finestra per cliente, e la copia registra
  il sollecito sulla fattura (`POST /api/pagamenti/solleciti`).
- **Contatori e tabelle** (D-23): quando il registro dice che qualcosa è cambiato, i
  riquadri, le scadenze, le operazioni e il trimestre si aggiornano da soli; i gruppi
  restano fermi e compare *Ci sono aggiornamenti · Aggiorna*.
- **Scadenze** (15 giorni), **Ultime operazioni** (6, dall'etichetta del registro) e
  **trimestre in corso** (atteso, riconosciuto, da liquidare, bloccato) stanno nella
  colonna destra; il trimestre usa `analisiTrimestre` e `liquidazione`, non un calcolo
  nuovo. Le pagine e le finestre seguono il prototipo; le sagome (D-59) coprono
  l'attesa e restano leggibili a 1440 e 768 px.

### 7.2 Elenco pratiche (`/pratiche`)

- Filtri: stato (segmenti con i conteggi calcolati sugli altri filtri, §16.4.2), testo
  libero (numero ordine, cliente, fornitore, documento), **fornitore, cliente, subagente**
  (filtri standard a selezione multipla, §16.4.1), riepilogo dei filtri. Paginazione.
  L'API accetta anche un periodo (`dal`/`al`); la pagina non lo mostra perché il prototipo
  non lo ha.
- Colonne: pratica, cliente, fornitore, data ordine, importo, stato (con la nota dei giorni
  e delle variazioni) e subagente. Clic sulla riga: dettaglio.
- **Tutto sul server** (`GET /api/pratiche`, §8.1): conteggi dei segmenti senza il filtro di
  stato (D-23), ordinamento, totali e pagine valgono su tutto l'elenco filtrato.
- **Flag variazioni**: le pratiche con scostamenti di composizione fra fasi o con note di
  credito mostrano "variazioni fra le fasi" con lo scostamento in euro (+/−), così l'operatore
  le individua subito (§5.8).
- **In SQL (D-52)**: filtri, conteggi dei segmenti (`count(*) FILTER`), totale, ordinamento e
  `LIMIT/OFFSET` li fa il database. Stato, importo e variazioni si leggono dalla pratica
  (§4.2.7, scritti dal motore); *scaduta* = `stato = 'inviato'` e data + giorni del fornitore
  prima di oggi (giorno di Roma); il subagente è quello di `interscambio` alla data
  dell'ordine; la nota dei giorni si scrive solo per le righe della pagina.
  *Perché:* prima ogni richiesta caricava tutte le pratiche e le passava al motore: con
  ~10.000 pratiche 1,5–1,8 s a clic, ora 10–35 ms. Lo stato resta del server e ricavato dai
  documenti: si salva solo il risultato.

  *Perché (D-143):* la ricerca è `ILIKE '%…%'` su numero, cliente, fornitore e numero dei documenti: per questo `numero_ordine`, `numero` dei documenti e le due `ragione_sociale` hanno un indice trigram (`pg_trgm`, `GIN (gin_trgm_ops)`). Il `EXISTS` sui documenti è la parte che ne guadagna di più; sulla testata il planner non usa ancora il trigram (l'`OR` tocca tabelle diverse), e se i dati veri lo chiederanno si valuta una colonna di ricerca unica.

- **Nell'app (F4-A6)**: quando il registro dice che le pratiche sono cambiate, i contatori dei
  segmenti e i totali si aggiornano da soli; le righe restano ferme e compare
  *Ci sono aggiornamenti · Aggiorna* (§16.4.2). Le modifiche fatte qui ridisegnano subito.

### 7.3 Dettaglio pratica (`/pratiche/:id`)

**Struttura (prototipo `prototipo-alternativo/`, decisione del 18/10/2026, D-12 §19):**

- **Testata** senza percorso ("Pratiche › …"): titolo con lo stato, cliente · fornitore ·
  subagente, azioni *Carica un documento* e, se la conferma è attesa o in ritardo,
  *Prepara il sollecito*.
- **Binario** ordine → conferma → fattura → nota di credito, sempre visibile sopra le schede
  (con la differenza di ogni fase rispetto alla precedente).
- Due **schede** (componente Schede, §16.4):
  1. **Riepilogo** (si apre per prima): se ci sono variazioni fra le fasi, in alto un
     **avviso** giallo "La conferma cambia N righe rispetto all'ordine, in totale ±X €" con
     *Vedi le righe*; sotto due colonne che stanno nello schermo: a sinistra
     **Provvigione** (imponibile, sconto e percentuali in vigore, quota a Decobrands e al
     subagente, regola maturato/fatturato e, sul maturato, riconoscimento di ogni
     documento), a destra **Incasso del cliente** e **Documenti**.
  2. **Righe a confronto**: nel titolo il contatore **rosso "N variazioni"** se quantità o
     prezzi cambiano o righe sono aggiunte/tolte, altrimenti grigio con il numero di righe;
     dentro la nota, i segmenti *Solo righe che cambiano · Tutte le righe* e la DataTable
     del confronto; clic su una riga apre il documento affiancato su quella riga.
- **Scheda iniziale**: *Riepilogo*; *Righe a confronto* se la pratica è aperta dall'elenco
  con il filtro *Con variazioni* (chi usa quel filtro cerca proprio le righe). Tornando
  indietro si riapre la scheda lasciata (§7.12).
- **Perché**: in questa fase chi apre una pratica vuole sapere quanto vale la provvigione,
  se è stata riconosciuta o pagata e quali documenti ci sono; le righe contano solo quando
  qualcosa non torna. Prima la tabella delle righe occupava metà schermo anche con "nessuna
  variazione" e i dati utili scorrevano. L'avviso nel Riepilogo esiste perché una scheda
  chiusa si ignora facilmente: le variazioni non devono passare inosservate.

*Perché (D-93):* niente pulsante *PDF*: il documento si apre con il clic sulla riga (*Documenti
della pratica*, file a sinistra e confronto a destra) e in Documenti il file è nella finestra di
correzione. Un pulsante in più apriva una finestra che faceva il lavoro di uno spazio già visibile.

*Perché (A5-02):* la differenza fra due documenti della pratica si calcola sul server
(`/documenti/:did/confronto`), mai nel browser: il browser sommerebbe le righe con lo stesso codice
con `find` (la prima, non la somma) e darebbe delta e totali sbagliati.

**Nell'app (F2-A2, F2-A3 e F2-A4):**

- **Testata**: stato accanto al numero, cliente · fornitore · subagente alla data, *Torna alle
  pratiche*. *Prepara il sollecito* arriva con F3. Nell'app **non** c'è *Carica un documento*:
  un documento si carica da *Carica documenti* della barra e si abbina in Documenti (§6.5, §7.9).

  *Perché (D-180):* la testata mostra **tutti** gli ordini della pratica («Ordine fornitore» /
  «Ordini fornitore», ogni numero con l'icona «Copia»), dal server (`fasi[0].numeri`, D-90); cliente ·
  fornitore · «seguita da» stanno su una riga a parte, sotto i numeri. Con più ordini ne nascondeva
  uno e la riga unica diventava illeggibile.
- **Binario**: le fasi fatte mostrano documento, data, importo e la differenza rispetto alla fase
  prima; quelle che mancano dicono quando sono attese (o da quanto sono in ritardo). Le
  percentuali e i soldi li calcola il server (V12). Con D-60 (F2-A4): tutti i numeri della fase affiancati (la riga scorre se non ci stanno, D-90), importo sommato;
  senza conferma la fase mostra la *Proforma* se c'è, oppure *Conferma — Non arrivata* se la
  pratica è già fatturata; il segno **pagato** con i documenti di pagamento (`pagato`,
  `pagamenti`) e gli altri documenti (`altri` di `GET /api/pratiche/:id/documenti`) si
  mostrano accanto ai documenti fiscali, senza toccare la provvigione. *Perché (D-60):* lo
  stesso binario vale per ogni fornitore, anche per chi non manda conferme.
- **Riepilogo**: avviso giallo con *Vedi le righe*; a sinistra **Provvigione** (imponibile,
  sconto e percentuali in vigore, quota a Decobrands e al subagente con le regole di D-27,
  maturato o fatturato), a destra la card **Documenti fiscali** (fatture e note di credito,
  netto, PDF, *Registra fattura*, *Nota di credito*, *Correggi*, *Annulla*, *Sposta*) e, con
  D-60 (F2-A4), il riquadro **Pagamento del cliente** (segno *Pagato* e documenti di pagamento,
  nessun effetto sui numeri) e la card **Documenti** con ordini, conferme, proforma, pagamenti e
  allegati (numero, data, importo, PDF, *Sposta*, *Registra un documento*). *Incasso del
  cliente* (F3-A3) mostra, per ogni fattura, lo stato d'incasso del motore (*Pagata*,
  *Non pagata*, *Incasso da verificare*, *In attesa di incasso*, *Nessuna segnalazione*),
  da dove viene (bollettino o segnalazione del fornitore con la nota) e i solleciti
  fatti; *Sollecita il cliente* apre la finestra dei solleciti su quel cliente,
  *Segna come pagata*/*Segna come non pagata* scrivono la segnalazione con l'evento
  `stato.change_state` (`PUT /api/documenti/:id/incasso`).

  *Perché (D-182, D-183):* nel Riepilogo la voce «Sconto medio → scaglione» mostra lo sconto medio
  letto sui documenti e lo scaglione che ne deriva (primo ≥ sconto medio); se supera l'ultimo
  scaglione c'è un avviso con il collegamento alle percentuali del fornitore e la provvigione resta
  da decidere. L'«Imponibile» diventa **«Base provvigione»**: netto meno le spese escluse (con
  «netto X − spese Y» in tenue quando differisce); accanto allo sconto medio il segno «fissato il …»
  quando i documenti sono congelati in un periodo chiuso.
- **Registrazione a mano** (D-60, F2-A4): una sola finestra con la tendina del tipo per i cinque
  tipi non fiscali; numero obbligatorio solo per l'ordine, data di oggi, importo e note
  facoltativi, PDF o foto. Fattura e nota di credito restano come in F2-A3.

  *Perché (D-186):* le finestre «Registra un documento / la fattura / la nota di credito» hanno la
  scelta **Prendi dalla coda · Inserisci a mano**: l'elenco dei documenti in coda è filtrato per
  fornitore (e cliente riconosciuto) della pratica, per tipo quando la finestra è di un solo tipo,
  con le sezioni «Cliente non riconosciuto» e «Tipo da verificare»; i dati si vedono in sola lettura
  e «Abbina alla pratica» manda solo documento, pratica ed eventuale fattura stornata (il server
  ricava i dati dal file e ricontrolla i soggetti, V12/V13).
- **Sposta** (D-60): dal documento a un'altra pratica dello stesso fornitore, scelta con il
  campo di ricerca (a selezione singola; le pratiche del fornitore le cerca il server,
  `GET /api/pratiche/cerca`); il rifiuto del server (liquidato, in un bollettino,
  legato a una nota di credito, unico ordine, numero già presente) si legge nella finestra.
  *Perché:* un documento abbinato alla pratica sbagliata si corregge senza annullarlo e
  ricaricarlo.
- **Decisione in un bollettino** (D-141): un documento con una riga in `bollettini_attese` (D-56)
  non si annulla e non si sposta (409); il database lo protegge con `ON DELETE RESTRICT`.
  *Perché (D-141):* la decisione è il testo della contestazione di un bollettino chiuso e la
  cancellazione a cascata la faceva sparire, senza poterla ricostruire.
- **Righe a confronto**: segmenti *Solo righe che cambiano · Tutte le righe*, righe evidenziate,
  colonna *Differenza*; aperta dall'elenco con il filtro *Con variazioni* la pratica si apre già
  su questa scheda.
- **Consultazione dei documenti**: finestra con le schede dei documenti che hanno un file (PDF o
  foto, D-60); a sinistra il documento originale (`GET /api/documenti/:id/file`, servito in una
  sandbox), a destra numero, data, importo, residuo e note. Il confronto riga per riga dentro la
  finestra arriva con F6.
- I comandi di scrittura compaiono solo con `provvigioni.modifica`. Il PDF si carica prima
  (`POST /api/documenti/carica`) e poi si lega al documento: se la registrazione non va, il file
  resta in coda e si riusa.
- **Caricamento**: `GET /api/pratiche/:id` legge solo i dati della pratica (`caricaDatiPratica`,
  D-52 §19): la pratica con righe e documenti, cliente, fornitore, scaglioni ed eccezioni del
  fornitore, agenzie cliente × fornitore con i loro subagenti e, per "una fattura al mese" (D-27),
  le pratiche dello stesso abbinamento con fatture negli stessi mesi. Una prova confronta, per ogni
  pratica del seed, la risposta con quella calcolata da tutto il database.
  **Perché**: prima caricava tutto il database per una pratica sola (~1,5 s con 10.000 pratiche,
  ora 4–94 ms); chi tocca il motore deve aggiungere qui quello che il dettaglio comincia a leggere.

Contenuti di dettaglio (dal primo prototipo, restano validi come elenco dei dati):

- **Stepper** stato pratica: `inviato → confermato → fatturato`.
- **Strip riepilogo**: fornitore, cliente, agente, importo merce, scadenza conferma.
- **Tab a flusso**:
  - **Pratica** — dati testata (fornitore, numero/data ordine, cliente, agente, importo
    merce, stato, note) + **subagente derivato da `interscambio`** (§5.10) + documento
    ordine;
  - **Conferma** — campi data/numero/scadenza; **Fattura** — campi numero/data/importo +
    elenco **documenti** (fatture e note di credito, §4.2.7.1) con importo netto;
    ciascuna fase con **upload PDF** e link all'allegato, evidenziata con check quando
    compilata;
  - **Righe** — tabella (numero riga, codice, descrizione, UM, q.tà, prezzo, importo)
    con aggiunta/eliminazione e **totale merce** in chiusura;
  - **Confronto fasi** — tabella per articolo con le tre colonne **Ordinato /
    Confermato / Fatturato** allineate per `codice`, delta di quantità/importo
    evidenziato e righe di articoli aggiunti/tolti; in coda le **note di credito** e lo
    **scostamento complessivo** della pratica (§5.8).
- Cambio stato guidato con accesso alla fase successiva.
- Riquadro **Incasso del cliente** (§5.14, solo se la pratica ha fatture), con la nota *sul
  fatturato* o *sul maturato*: per ogni fattura lo stato d'incasso (*Pagata* verde ·
  *Non pagata* rosso · *Incasso da verificare* giallo · *In attesa di incasso* /
  *Nessuna segnalazione* grigio), da dove viene (bollettino di …, segnalata dal fornitore, con la nota della segnalazione)
  e i solleciti già fatti (quante volte, ultima data). Pulsanti:
  - fattura non pagata o da verificare: *Sollecita il cliente* (finestra *Solleciti di
    pagamento* su quella fattura) e *Segna come pagata*;
  - altrimenti: *Segna come non pagata*, che apre la finestra **Fattura … non pagata**
    con una nota (es. "email di Gasper del …") e porta la fattura fra i pagamenti da
    sollecitare.
- **Consultazione dei documenti affiancata al confronto** (componente FinestraAffiancata,
  stesso schema di "Correggi i dati letti", §6.5, ma in sola lettura):
  - si apre con clic su un documento dell'elenco, con *Consulta affiancati* o con clic su
    una riga del confronto fasi (in quel caso apre l'ultimo documento con la riga già
    evidenziata);
  - **a sinistra** il PDF originale, sopra di esso le **schede dei documenti** della
    pratica (ordine, conferma, fatture, note di credito) per passare dall'uno all'altro
    senza chiudere la finestra (anche con ← →);
  - **a destra** i dati del documento (numero, data, importo) e il **confronto riga per
    riga** con un altro documento della pratica, scelto in "Confrontato con": di norma la
    fase precedente (conferma ↔ ordine, fattura ↔ conferma, nota di credito ↔ fattura
    stornata indicata nel riferimento); differenza totale e numero di righe che cambiano.
    **Con una nota di credito** si confrontano **solo le righe presenti nella nota**: le
    righe della fattura che non compaiono non sono state stornate, quindi non si mostrano;
    la differenza (in testata e per riga) è l'**importo stornato**, non nota − fattura;
    il conteggio dice "N righe stornate". **Perché**: la nota di credito storna solo una
    parte della fattura; mostrare le righe assenti come "tolte" falsava la differenza;
    segmenti *Solo righe che cambiano / Tutte le righe*; DataTable con le colonne dei due
    documenti (q.tà × prezzo e importo) e la differenza;
  - **selezionando una riga** la si vede evidenziata nel documento a sinistra (posizione
    restituita dalla lettura, §6.5); divisore trascinabile; Esc chiude.

### 7.4 Anagrafica fornitori (`/fornitori`, `/fornitori/:id`)

- Elenco con n° scaglioni e ordini aperti.
- Anagrafica (ragione sociale, P.IVA, codice Integra) **da Integra in sola lettura**;
  nel CRM si modificano solo le condizioni: giorni attesa conferma, **giorno entro cui
  arriva il bollettino** (§5.6), `tipo_provvigione` (maturato/fatturato), **giorni per
  l'incasso dal cliente** (`giorni_incasso`, iniziale 60, §5.14), note, attivo. Nei dati
  del fornitore la riga *Pagamento provvigioni* spiega la regola (sul maturato:
  riconosciute nel mese in cui il cliente paga, incasso da verificare dopo N giorni).
- Sotto i dati del fornitore due **schede**: **Percentuali** (in vigore da una data, con
  *Nuove percentuali da una data* e le versioni) e **Clienti seguiti** in sola lettura
  (vista inversa delle agenzie, §7.6); ogni scheda ha la sua tabella che riempie lo spazio.
- Dettaglio con **tabella scaglioni** (sconto, % a Decobrands, % al subagente con le
  eccezioni personali sotto, totale dal fornitore, clienti). *Nuove percentuali da una data*
  crea una versione da una data dopo l'ultima chiusura, anche fra due esistenti; una versione
  che vale dopo l'ultima chiusura si **corregge** o si **elimina** (non l'unica); quelle già
  usate in un periodo chiuso non si toccano (409, §5.11, D-25, D-51). Sotto ogni scaglione le
  eccezioni personali che valgono in qualche giorno della versione, con il loro periodo.
  Le versioni si vedono in ordine: quella in vigore in alto, poi le future dalla più vicina,
  poi le passate; *Correggi* ed *Elimina* stanno sulla versione e il rifiuto del server (409)
  compare nella finestra. *Nuove percentuali* accetta qualsiasi data dopo l'ultima chiusura.
  *Perché (D-51):* i soldi chiusi non cambiano, le correzioni dove non hanno effetto sì.

*Perché (D-138):* se il fornitore ha un ruolo da Integra, i dati del master sono in sola lettura e la
modifica risponde 409 «Dati di Integra: si correggono in Integra»; nel CRM restano condizioni,
percentuali ed eccezioni. Un codice di Integra digitato a mano poteva far sovrascrivere dal giro di
sincronizzazione i dati di un altro soggetto su quel ruolo.

### 7.5 Subagenti (`/subagenti`, `/subagenti/:id`)

- L'agente è uno solo, Decobrands SRL (§5.4): non ha una pagina.
- **Elenco** (sinistra): subagente con email, clienti seguiti, liquidabile e in attesa nel
  trimestre in corso; *Nuovo subagente*.
- **Scheda** (destra): dati, *Modifica*, *Elimina* (solo senza clienti né provvigioni,
  altrimenti *Rendi non attivo*), *Vedi la liquidazione*; clienti seguiti con la sua %.
- **Eccezioni personali** (D-26, D-51): scheda con l'elenco (fornitore, sconto, sua % invece
  della standard, dal, al), la più recente in alto e quelle finite in grigio. *Aggiungi eccezione*:
  la finestra chiede fornitore (campo di ricerca), sconto (dagli scaglioni in vigore del
  fornitore), % al subagente (0–100) e *dal*. Su un'eccezione:
  *Cambia percentuale da una data* (la riga vecchia finisce a quella data e la nuova parte da lì),
  *Termina* (dal giorno indicato non vale più), e *Modifica*/*Elimina* solo se tutto il periodo è dopo l'ultima
  chiusura del fornitore (`modificabile`). Controlli: fornitore e subagente esistenti,
  percentuale fra 0 e 100, sconto presente fra le soglie alla data, date mai nel periodo
  chiuso (409), un solo periodo per subagente, fornitore e sconto (409 *Periodo
  sovrapposto*). Permesso `dati.condizioni` (§8.3).
  *Perché (D-51):* l'eccezione non è legata a una versione delle percentuali: niente copie;
  il cambio da una data lascia intatti i periodi già pagati.

### 7.6 Clienti e agenzie (`/clienti`, `/clienti/:piva`)

Il focus è sul **cliente** (anagrafica Decobrands da Integra); le righe di `interscambio`
sono le sue **agenzie**: i fornitori per cui Decobrands fa da agente verso quel cliente.

- **Elenco** (sinistra): ricerca per nome, P.IVA, codice Integra o codice cliente del
  fornitore; segmenti *Tutti · Con agenzie · Senza agenzie · Vendita diretta*; colonne
  cliente (con città e codice Integra), n° agenzie, pratiche aperte. Filtri a scelta
  multipla per **fornitore** e **subagente** (clienti che hanno un'agenzia con quel
  fornitore o subagente; D-22), con riepilogo; i numeri dei segmenti contano con gli altri
  filtri (D-23); i filtri si ritrovano tornando indietro (§7.12).
- **Scheda** (destra): anagrafica in **sola lettura** con la nota "anagrafica da Integra";
  sotto, due **schede** (un cliente può avere molte agenzie e molte pratiche; si ricorda
  l'ultima aperta):
  - **Agenzie** (scheda principale; contatore giallo se manca un codice cliente): filtri a
    scelta multipla per fornitore e subagente, *Aggiungi agenzia*; colonne fornitore, codice
    cliente del fornitore, seguito da, provvigione totale con quota del subagente e
    sconto, pratiche aperte con quel fornitore. Clic su una riga apre la modifica, con
    *Elimina*. Il cliente è fisso; fornitore e subagente sono campi di ricerca (§16.4); gli
    sconti proposti seguono gli scaglioni del fornitore scelto. In più (D-27): *Al
    subagente per questo cliente %* (vuoto = quella dello scaglione) e *Provvigione al
    subagente* (*Su ogni fattura* · *Una fattura al mese: la prima* · *Una fattura al mese:
    la più alta*); la colonna provvigione mostra "(del cliente)" e "una fattura al mese".
    Vincoli: un solo subagente per cliente × fornitore (§5.10), codice unico per fornitore,
    percentuale fra 0 e 100.
    *Perché (D-50):* *Al subagente per questo cliente %* e *Provvigione al subagente*
    cambiano i soldi del subagente, come le eccezioni personali: li cambia solo chi ha
    `dati.condizioni` (responsabile). L'operatore vede i campi spenti con la nota «li cambia
    un responsabile» e salva il resto; il server risponde 403 se arrivano comunque, con un
    valore diverso dall'attuale. Così un operatore non può mettere 100 %.

    *Perché (R2-06, R2-13, D-134, D-139):* gli sconti in vigore di tutti i fornitori si leggono in
    una sola richiesta (`GET /api/fornitori/sconti-in-vigore`) a ogni apertura della finestra, dal
    server: niente cache nel browser e niente calcolo degli scaglioni nel browser (V12). In attesa il
    corpo è una **sagoma**; se una lettura fallisce la finestra mostra il messaggio del server con
    *Chiudi* (D-59). Il campo *Subagente* si precompila dallo storico **solo se** il vecchio CRM
    indica un subagente che in anagrafica è uno solo; se resta vuoto si sceglie, ed è obbligatorio
    (D-134). Un'agenzia con righe in `sconti` non si elimina: 409 «L'agenzia ha sconti storici: si
    chiude, non si elimina» (D-139).
  - **Pratiche** (meno usata, con filtro): segmenti *Aperte · In ritardo · Fatturate ·
    Non pagate · Tutte* (iniziale *Aperte*; *Non pagate* = pratiche con una fattura non
    pagata o da verificare, §5.14; numeri dei segmenti calcolati con gli altri filtri,
    §16.4.2), fornitore (filtro standard a selezione multipla, §16.4.1), ricerca per
    numero, riepilogo dei filtri; colonne pratica,
    fornitore, data, importo, stato; clic apre la pratica; nel piede le provvigioni ai
    subagenti del trimestre.
    Nell'app (F4-A6): la scheda ha i filtri standard — segmenti *Aperte · In ritardo ·
    Fatturate · Tutte* con i numeri calcolati sugli altri filtri, fornitore a selezione
    multipla (solo quelli del cliente), ricerca per numero, riepilogo e azzeramento.
    *Non pagate* non c'è ancora: serve lo stato d'incasso per pratica; il piede con le
    provvigioni del trimestre non c'è.
- **Vista inversa** nel dettaglio fornitore (§7.4): "Clienti seguiti per <fornitore>", in
  sola lettura; clic sul cliente apre la sua scheda.
- **Vendita diretta**: il flag arriva da Integra; la gestione dei clienti di sola vendita
  diretta (senza agenzie) si completa con la sostituzione della Gestione Ordini (§17).

**Cerca in Integra (D-135, R2-10).** La finestra cerca sulle viste e ogni riga ha il pulsante
*Importa <ragione sociale o codice>*, così il lettore di schermo dice quale riga importa. *Importa*
chiude la finestra, ricarica l'elenco e **apre la scheda** del nuovo cliente (o fornitore), anche
quando era già in anagrafica: chi importa vuole subito aggiungere agenzie o scaglioni, non cercare la
riga nell'elenco. L'`id` arriva sempre nella risposta di `POST /api/integra/importa`. La colonna
sinistra usa `clienti-filtri` come il prototipo: ricerca e segmenti restano su una riga anche nella
colonna stretta (D-24).
*Perché (D-135):* la guida prometteva «apre il nuovo» e la risposta non portava l'`id`; chi importa
vuole subito completare la scheda (scaglioni, agenzie), non cercare la riga nell'elenco.

### 7.7 Bollettini (`/bollettini`, `/bollettini/:id`)

- Elenco con filtro stato; colonne: fornitore, mese/anno, n° righe, riconosciuto,
  calcolato, **totale differenze** (evidenziato se ≠ 0).
- Matrice fornitore × mese (prototipo): verificato, da decidere, pronto da chiudere,
  **atteso entro il gg/mm**, **non arrivato** con *Sollecita*, mese in corso (§5.6).
- **Periodo e filtri** sopra la matrice (D-14, D-16, §19):
  - **sempre 6 mesi**: iniziale gli ultimi 6 mesi fino al mese in corso;
  - **selettore a mesi** (componente PeriodoMesi, §16.4), come il selettore di date del
    Portale Luis: un pulsante "apr 2026 → set 2026" apre un riquadro con a sinistra le
    **scorciatoie** (*Ultimi 6 mesi*, semestri interi con dati) e a destra l'**anno** con
    ‹ › e la griglia dei **12 mesi**; si sceglie il **mese d'inizio** e il periodo **si
    completa da solo** a 6 mesi dentro i mesi con dati: se dopo non ce ne sono abbastanza
    si allunga all'indietro (es. scelto agosto → aprile–settembre), se prima non ce ne sono
    si allunga in avanti; passando col mouse su un mese si vedono i 6 mesi che verrebbero
    scelti; i mesi senza dati sono spenti; Esc o clic fuori chiude;
  - *‹* · *›* accanto: spostano tutto il periodo di un mese, spenti ai limiti;
  - **Fornitore**: filtro standard a selezione multipla (§16.4.1); in fondo alla barra
    *Riepilogo dei filtri* (con il periodo) e *Togli tutti i filtri*;
  - segmenti *Tutti · Con qualcosa da fare* (fornitori con un bollettino da decidere,
    pronto, contestato o non arrivato nel periodo), con i conteggi calcolati sui fornitori
    scelti (§16.4.2);
  - la scelta si ricorda tornando indietro (§7.12); nell'app la matrice si chiede al server
    per periodo e fornitore (`GET /api/bollettini?al=2026-09&fornitori=1,2&vista=tutti|dafare`):
    `al` è l'ultimo dei 6 mesi, `primo`/`ultimo` sono i mesi con dati per il selettore;
    "mesi con dati" = dal mese del primo bollettino registrato al mese in corso. Fino al
    dettaglio (F3-A2) la cella di un bollettino arrivato dice *Arrivato* e non il numero di
    righe da decidere: quel conteggio nasce dalla riconciliazione del dettaglio. Sul tablet
    (768 px) la matrice scorre di lato invece di tagliare le ultime colonne.
  - **Nell'app (F4-A6)**: quando cambiano i bollettini i conteggi dei segmenti si aggiornano da
    soli; la matrice resta ferma e compare *Ci sono aggiornamenti · Aggiorna* (§16.4.2).
  - **Nell'app, cella non arrivata (D-96)**: la cella porta *Sollecita*; la finestra mostra il
    testo composto dal server (`GET /api/solleciti/bollettini`), con i documenti del mese e i
    loro importi, e *Copia il testo* lascia l'evento `export.sollecito` con fornitore, mese e
    numeri (`POST`, `provvigioni.modifica`). Il testo non si compone nel browser (V12).
  - **Perché**: con più di 6 colonne la matrice non entra in larghezza e le celle (stato e
    importo) diventano illeggibili, con meno si spreca spazio; una tendina con tutti i mesi
    dopo qualche anno diventerebbe lunghissima, mentre anno + griglia dei mesi resta
    compatta; con 10 o più fornitori serve isolare quello di cui si parla al telefono o chi
    ha qualcosa da fare.
- Dettaglio: righe con fattura, cliente, merce, riconosciuto/calcolato e `differenza`
  evidenziata; azioni: aggiungi/elimina riga, **conferma importo fornitore o modifica
  manuale** (§5.13), passa a `verificato`/`contestato`.
- **Dettaglio nell'app (F3-A2, §8.1):** la cerniera e i gruppi (*Da decidere · Decise · Quadrano ·
  Incassi*) arrivano dal server (`GET /api/bollettini/:id`), con le scelte ammesse per ogni riga:
  - differenza o documento sconosciuto: *Accetta il loro importo* · *Contesta*; documento del mese
    assente: *Attendi il prossimo* · *Contesta*; il motivo è obbligatorio solo per contestare;
  - una riga del fornitore si può abbinare a mano a un documento dello stesso fornitore, se il numero
    non coincide (un documento sta su una sola riga dello stesso tipo);
  - *Segna come verificato* quando tutte le righe quadrano o sono decise e nessuna è contestata,
    *Segna come contestato* quando almeno una è contestata; la chiusura congela % e importi calcolati
    (§5.11) e chiude il mese (D-51): da lì righe, decisioni e percentuali del mese non cambiano. La
    riapertura del prototipo non c'è nell'app.
  - **Perché** (D-56): la decisione su un documento che il fornitore non ha scritto deve restare nello
    storico come le altre (D-49), ma non è una riga del fornitore: sta in `bollettini_attese` (§4.2.10.1)
    e non conta come riconosciuta.

*Perché (D-119):* un bollettino contestato non si riapre e non si sostituisce (uno per fornitore e
mese, D-56): le correzioni del fornitore arrivano nel bollettino del mese dopo, riferite ai documenti
del mese contestato, e si riconciliano contro quelli. L'azione del contestato lo dice con il mese
preciso, invece di far aspettare un «bollettino rettificato» che non può esistere.

*Perché (D-126):* la differenza di ogni riga arriva calcolata dal server: il browser non sottrae
importi in virgola mobile, così il numero a schermo è quello vero al centesimo, uguale a quello delle
esportazioni (V12).
- **Pagina nell'app (F3-A2):** titolo con fornitore e mese, badge, azione proposta in alto e cerniera.
  Il PDF del bollettino, se c'è, sta affiancato a sinistra (`GET /api/documenti/<arrivo>/file`); sul
  tablet i due pannelli si impilano e la cerniera si impila (vedi i ritocchi F3-A2b). Le decisioni si prendono in una
  finestra che mostra il messaggio del server così com'è; *Contesta* vuole il motivo. Il documento per
  l'abbinamento si cerca fra quelli del fornitore (vedi i ritocchi F3-A2b). *Segna come verificato/contestato* è attivo
  solo con l'azione *verifica/contesta*: con righe aperte resta spento (il server rifiuterebbe con 409).
  La conferma dice che il mese diventa chiuso; dopo, la pagina è in sola lettura. Chi non ha
  `provvigioni.modifica` non vede i pulsanti di scrittura. Tornando alla matrice si ritrovano periodo
  e filtro (§7.12).
- **Ritocchi del dettaglio nell'app (F3-A2b, §19 D-58):**
  - **righe aperte:** accanto alla chiusura spenta il testo *Mancano N righe da decidere* e il
    collegamento *Vai alla prima*, che porta alla prima riga del gruppo *Da decidere* e la evidenzia
    un attimo; il 409 del server resta come difesa in più;
  - **abbinamento a qualsiasi documento del fornitore:** *Abbina il documento* cerca fra le fatture e
    le note di credito di quel fornitore di **ogni periodo** (`GET /api/documenti/cerca`), per numero
    o per cliente; i documenti del mese del bollettino vengono prima, poi gli altri dal più recente.
    Quelli già su una riga lo dicono (*già sul bollettino 7/2026*) ma si possono scegliere lo stesso:
    il 409 del server lo spiega nella finestra;
  - **cerniera impilata sul tablet:** sotto gli 860 px le righe non scorrono più di lato; ogni riga
    mostra documento e cliente, *Fornitore riconosce* con importo e percentuale, la differenza in
    evidenza, *Noi calcoliamo*, e in fondo i pulsanti a tutta larghezza; le intestazioni delle colonne
    spariscono e ogni valore porta la sua etichetta piccola (solo CSS, stesse classi nel prototipo);
  - ***Prepara la contestazione*** attivo con almeno una riga contestata, anche prima della chiusura:
    una finestra con oggetto e testo **modificabili** (facoltativi), *Copia* negli appunti e
    *Scarica .txt*; il testo lo compone il server (`GET /api/bollettini/:id/contestazione`) con numero,
    cliente, data, i due lati con importi e percentuali, la differenza, il motivo e il totale della
    differenza contestata. Nessuna email parte dal CRM: l'invio arriverà con F5/F6 e la finestra dice
    "Copia il testo nella tua email al fornitore". Il testo modificato non si salva.
  - **Perché**: dire quante righe mancano e portarci con un clic evita di cercarle scorrendo la
    cerniera, che dopo una ventina di righe diventa lunga (D-58); con la sola ricerca fra i documenti
    del mese un documento registrato in ritardo o fuori mese non si poteva abbinare, e si finiva per
    correggere i dati invece della riga; una cerniera che scorre di lato sul tablet nasconde i
    pulsanti di decisione proprio dove servono; il testo della contestazione è un calcolo sulle righe
    (V12) e deve restare pronto da copiare, senza dipendere da un invio che il CRM non fa ancora.
- **Righe d'incasso** (§5.14), con un segno proprio e senza decisione richiesta: *Storno:
  il cliente non ha pagato* (fattura → insoluta, con *Prepara il sollecito al cliente*),
  *Riaccredito dopo il pagamento*, *Riconosciuta al pagamento* (maturato, fattura di un mese
  precedente); le fatture sul maturato assenti stanno in fondo come *In attesa di incasso*
  (con i giorni dalla fattura, in giallo oltre `giorni_incasso`).

### 7.8 Liquidazione (`/liquidazione`)

**Struttura (prototipo `prototipo-alternativo/`, D-18 §19):** sotto i quattro trimestri ci sono due
colonne. A sinistra l'**elenco dei subagenti**, che fa da filtro. A destra un pannello con due
**schede**:
- **Documenti**, che si apre per prima. Il titolo mostra il numero dei documenti, in giallo
  se ce ne sono in attesa.
- **Report subagenti**.

Nella testata del pannello il pulsante **Analisi completa** apre la pagina Analisi (§7.22) sul
trimestre, filtrata sul subagente scelto. La scheda *Sintesi* a tutta pagina della versione
4.4 (D-17) è sostituita: i suoi grafici sono nella pagina Analisi.

**Report subagenti** è un riepilogo breve, da leggere in pochi secondi:
- usa gli stessi numeri del trimestre di liquidazione (`analisiTrimestre(a, t)`);
- il confronto è sul trimestre prima; per il 1° trimestre è il 4° dell'anno precedente.

Il contenuto cambia se a sinistra è scelto un subagente:
- **Nessun subagente scelto**:
  - barre orizzontali impilate con le provvigioni generate dai clienti di ogni subagente,
    divise fra la sua quota (grigio) e il margine di Decobrands (verde);
  - sotto, una tabella con una riga per subagente: clienti e documenti, fatturato,
    provvigione al subagente, margine Decobrands, variazione % della provvigione sul
    trimestre prima; riga totale.
- **Subagente scelto**:
  - tre numeri, ognuno con il confronto: fatturato dei suoi clienti, provvigione, margine
    Decobrands;
  - barre dei trimestri dell'anno (sua quota + margine), con il trimestre scelto segnato
    con ●;
  - i primi 5 clienti per fatturato, con la provvigione.

In fondo una nota con il collegamento *Analisi completa*, con gli stessi filtri del pulsante.

**Calcolo** (`analisiTrimestre(a, t)`, sulle stesse righe della liquidazione):
- fatturato = Σ imponibile;
- dai fornitori = Σ imponibile × % che il fornitore riconosce a Decobrands (agente +
  subagente, §5.1) alla data del documento;
- al subagente = Σ provvigione;
- margine = dai fornitori − al subagente.

Il calcolo comprende i documenti in attesa dei bollettini e le voci di storno.
Nell'app: `GET /api/liquidazione/report?anno=&trimestre=&subagente=`.

**Perché**: chi controlla la liquidazione vuole vedere i documenti e, nello stesso posto,
come va ogni subagente. L'analisi vera (periodi, filtri, esportazione) ha bisogno di una
pagina sua e non deve togliere spazio al controllo (D-18).

Dettaglio (colonna sinistra e scheda *Documenti*):

- **Filtri**: il trimestre (riquadri in alto) e il subagente (elenco a sinistra); niente
  altre barre di filtri né riquadri numerici: i numeri stanno nel *Report subagenti* (D-18,
  D-22).
- **Riepilogo e dettaglio affiancati** (prototipo `prototipo-alternativo/`, pagina
  Liquidazioni): a sinistra l'**elenco dei subagenti** (DataTable: nome, n° documenti,
  da liquidare / liquidato, in attesa dei bollettini; riga totale; ordinabile), a destra
  i **documenti del trimestre** (documento, cliente con subagente e codice, provvigione
  con % e imponibile, stato liquidabile / in attesa con motivo).
  - Clic su un subagente = filtra i documenti; secondo clic = tutti.
  - **Qualsiasi numero di subagenti**: l'elenco scorre e mostra **solo chi ha
    documenti nel trimestre**; gli altri sono contati nella testata ("4 con documenti ·
    8 senza"). Niente riquadri per subagente: con più di 4 non entrano in larghezza.
- **Esporta** nella testata (F4-A3, §11): tutto il trimestre diviso per subagente, un solo
  subagente o solo il riepilogo, in Excel, PDF o CSV. Con la pagina filtrata su un subagente
  la finestra lo propone già scelto. A chi non ha `provvigioni.esporta` il pulsante è spento.
- **Chiudi il trimestre** (`provvigioni.chiudi`, responsabile; `POST /api/liquidazioni/:anno/:trimestre/chiudi`): solo
  a trimestre finito, non già chiuso, con il trimestre prima già chiuso (il primo trimestre con documenti fa da
  inizio, D-57) e senza documenti **in attesa dei bollettini** (motivo *bollettino da
  verificare* o *non riconosciuta*); le fatture sul maturato in attesa d'incasso non bloccano (entrano nel
  trimestre in cui il cliente paga, §5.14). Il server ricalcola, salva la fotografia (`liquidazioni.totali`), lega
  documenti e voci alla liquidazione e scrive l'evento; da qui il trimestre si legge dalla fotografia e il periodo
  è chiuso per tutti i fornitori (D-51). La riapertura non c'è.
  *Perché (D-57):* gli importi pagati non devono cambiare dopo; una voce di storno legata alla liquidazione che
  l'ha pagata non deve ricomparire nel trimestre dopo.
- **Storni e riaccrediti** (fatturato, §5.14): compaiono fra i documenti della prima
  liquidazione ancora aperta dopo la chiusura del bollettino che li contiene, con segno *Storno: cliente non pagante* (provvigione
  negativa) o *Riaccredito*, e il riferimento alla fattura e al trimestre d'origine; si
  sommano alla liquidazione del subagente come le note di credito.
- **Correzione sul documento** (D-27): sotto la provvigione di ogni documento (non sulle
  voci di storno o riaccredito) *Correggi*, oppure *Cambia la correzione*. La finestra
  mostra cliente, fornitore, imponibile e provvigione attuale e chiede *Altra
  percentuale* · *Importo fisso* · *Nessuna provvigione*, il valore e il **motivo
  obbligatorio**; *Togli la correzione* torna alla regola normale. Solo a trimestre aperto
  e con il permesso `modifica`. Sotto la provvigione compare la regola applicata
  (percentuale dell'agenzia, una fattura al mese, eccezione personale, correzione con il
  motivo); nel prospetto esportato una nota *Provvigioni particolari* le elenca.

**Nell'app (F4-A1):** `/liquidazioni` rimanda a `/liquidazioni/<anno>/<trimestre>` del trimestre di
oggi, come il prototipo. In alto i quattro riquadri (anno, stato, avanzamento di quello in corso, totale;
i futuri spenti), sotto le due colonne: a sinistra i subagenti (solo quelli con documenti; la testata
dice «N con documenti · M senza»), a destra il pannello con la scheda *Documenti* — il contatore è giallo
se ci sono documenti in attesa — e il pulsante *Analisi completa* con `dal` e `al` del trimestre e il
subagente scelto. *Chiudi il trimestre* chiede conferma con l'importo e il numero di subagenti e manda
solo anno e trimestre: il server ricalcola e salva la fotografia. Da lì la pagina legge la fotografia
(righe comprese) e dice «Liquidazione chiusa il … da …»; lo stato di ogni documento (*Liquidabile*,
*In attesa* con il motivo, *Attesa incasso*, *Storno: cliente non pagante*, *Riaccredito* con la fattura
d'origine) e i nomi sono calcolati dal server (V12). L'esportazione è il pulsante *Esporta* (F4-A3).
La **correzione della quota del subagente** (D-27, F1-A6) è il pulsante *Correggi* (o *Cambia la
correzione*, se c'è già) sotto la provvigione di ogni documento, solo sulle fatture e note di credito
(non sulle voci di storno o riaccredito), a trimestre aperto e con `provvigioni.modifica`. La finestra
mostra cliente · fornitore · imponibile e la provvigione di adesso, e chiede *Provvigione al subagente*
(Altra percentuale · Importo fisso · Nessuna provvigione), *Percentuale o importo* e il **motivo
obbligatorio** (compare nel prospetto e nel registro); con una correzione esistente c'è *Togli la
correzione*, con conferma. Salva con `PUT /api/documenti-fiscali/:id/correzione`, toglie con `DELETE`:
il server ricarica, ricontrolla e ricalcola, poi la pagina si rilegge (totali, subagenti e scheda) e
avvisa (*Correzione salvata* / *Correzione tolta*); gli errori del server compaiono nella finestra.
*Perché:* la pagina serve a controllare e chiudere, non a rifare i conti; le etichette sul server
evitano che due browser dicano cose diverse.

*Perché (D-195):* nella testata c'è una **tendina dell'anno** (a sinistra di *Esporta*), predefinita
sull'anno corrente; l'elenco arriva dal server (`GET /liquidazioni/anni`, dal primo anno con dati
all'anno corrente) e scegliendo un anno si resta sullo stesso trimestre. Senza, si vedevano solo i
trimestri dell'anno in corso. La colonna dell'importo su cui si calcola si chiama **«Base
provvigione»** (D-183), non più «Imponibile».

**Nell'app (F4-A4):** la scheda *Report subagenti* sta accanto a *Documenti* e legge
`GET /api/liquidazione/report?anno=&trimestre=&subagente=` (`provvigioni.consulta`). Senza
`subagente` risponde con l'elenco `[{id, nome, clienti, documenti, fatturato, prese, pagate,
margine, quota, delta}]` ordinato per provvigione decrescente (`quota` = provvigione su prese in %,
`delta` = variazione % sul trimestre prima, `null` se il precedente è zero): la scheda mostra le
barre impilate (quota grigia, margine verde), la tabella e la riga totale. Con `subagente` risponde
con `{subagente, numeri, trimestri, primi_clienti}`: i tre numeri con il confronto sul trimestre
prima, le barre dei trimestri dell'anno già iniziati (il trimestre scelto segnato con ●) e i primi
5 clienti per fatturato. Numeri, percentuali e variazioni li calcola il server con
`analisiTrimestre` (V12); la nota finale porta all'Analisi con lo stesso periodo (e il subagente).
*Report subagenti* è un riepilogo breve: l'analisi completa resta la pagina Analisi (D-18).

**Nell'app (F4-A3):** *Esporta* apre una finestra come quella dell'Analisi: contenuto (tutto il
trimestre, un subagente, solo il riepilogo) e formato (Excel, PDF, CSV). Il browser manda solo
anno, trimestre, contenuto, subagente e formato; il server rilegge i dati e prepara il file con
le stesse funzioni della pagina (V12). Excel e CSV nascono dallo stesso modello di fogli; il PDF
è il medesimo `.xlsx` convertito con LibreOffice (`SOFFICE`, `soffice.com` su Windows). La nota
finale rimanda all'Analisi solo per altri periodi e filtri. Ogni esportazione scrive l'evento
`export.export` (§15.2.6).

### 7.9 Documenti (`/documenti`)

Unico punto d'ingresso dei documenti (§6.5): area di caricamento, elenco "Da
controllare" con livello di affidabilità, dettaglio del documento scelto; pulsanti
"Correggi i dati letti" (con numero di campi da controllare) e "Scarta il documento";
finestra di correzione con il PDF a fianco. Il pulsante "Carica documenti" è sempre
presente nella barra laterale.

**Riconoscimento e import (D-111, D-112):** se il fornitore o il cliente non sono in anagrafica,
il server cerca nelle viste di Integra (una query mirata, massimo 10 righe) e la card mostra
*C'è in Integra: importa* con nome e P.IVA; un clic crea soggetto e ruolo, e per un fornitore
chiede subito gli scaglioni (D-113). Se la coppia cliente-fornitore è in `interscambio_storico`
con un subagente, l'import propone anche agenzia e sconto; se è **senza** subagente, la card dice
*«Questo fornitore non è rappresentato per questo cliente»* e non apre la pratica (§4.7.4).

**Scelta fra i candidati (D-152).** Dopo la lettura il server cerca fornitore e cliente **in
entrambe le fonti** — anagrafica del CRM e viste di Integra — per P.IVA (con o senza prefisso del
paese, D-124) e per ragione sociale normalizzata. Un solo soggetto del CRM, o (se nel CRM non c'è)
una sola riga di Integra, si usa senza chiedere; altrimenti il documento mostra l'elenco dei
**candidati** (massimo 10 per fonte, ognuno con fonte CRM/Integra, ragione sociale, P.IVA, città
se c'è e motivo «P.IVA uguale» o «nome simile») e la persona sceglie: un candidato del CRM si
collega, uno di Integra si importa e collega nella stessa transazione (`dati.importa`, D-133/D-111;
senza il permesso il candidato si vede ma non si importa); «Nessuno di questi» resta la ricerca a
mano (CampoRicerca + Cerca in Integra). Mai una scelta a caso fra più candidati (D-111). Se Integra
non risponde: candidati solo del CRM e nota «Integra non raggiungibile», senza errore che blocca
la pagina. La rotta è `POST /api/documenti/:id/scegli` (`provvigioni.modifica`, più `dati.importa`
per Integra).

**Segni dell'elenco e import dal documento.** Accanto a ogni documento l'elenco mostra *Affidabile*,
*Da controllare*, *Affidabilità bassa*, **«Fornitore in Integra»** (il fornitore non è in anagrafica ma
esiste in Integra), **«Cliente in Integra»** (la stessa cosa per il cliente), *Non rappresentato* e
*Manca l'agenzia*. I due segni di Integra sono distinti perché dicono subito quale anagrafica manca,
senza aprire il documento. *Importa da Integra* dal documento importa il fornitore **e collega il
documento nella stessa transazione**: testata, righe, affidabilità e controlli restano come sono
(D-133). Mentre importa, il pulsante dice *Importo…* ed è spento; se il nome letto non porta a una
sola riga di Integra (o ne trova più di una) l'import si ferma e chiede di correggere il nome letto.
Il pulsante *Importa dal vecchio CRM* è spento finché l'import dello storico è a mano (D-112).

*Perché (D-133, R1-06, R1-11, D-137):* «Importa da Integra» sul documento fa **una** operazione:
senza, il `PUT` che seguiva riscriveva i dati letti e buttava le righe; il collegamento non tocca
campi né righe. In elenco clienti con la versione corrente e righe dello storico si leggono una volta
per pagina, con lo storico filtrato sui codici cliente della pagina: il costo non cresce con
l'anagrafica (D-102). Nello storico importato `fornitore_id` è `NULL`, quindi la coppia si confronta
sul **nome normalizzato** del fornitore (o sulla P.IVA normalizzata: la stessa regola di
`cercaLegame`), e le righe senza codice cliente si confrontano sulla chiave `fornitore|`. La pillola
*Manca l'agenzia* di un documento **non ancora abbinato** resta riferita alla **data del documento**:
la pratica non c'è e non si sa quale ordine lo riceverà. Quando il documento entra in una pratica
esistente vale D-137 (§6.1).

*Perché (D-152):* il riconoscimento non è sempre univoco (nessun candidato, più di uno, o solo
nomi simili) e scegliere a caso sposta la provvigione al subagente sbagliato (D-92, D-124). Mostrare
i candidati con fonte e motivo — preparati dal server (V12) — e lasciare decidere la persona evita
sia l'errore sia un secondo giro di ricerca a mano; se Integra non risponde la pagina resta
utilizzabile con i soli candidati del CRM.

**Dettaglio del documento** (D-15, §19; stessa struttura della pratica, §7.3):
- in alto, sempre visibili, i **dati letti** della testata (fornitore, tipo, data, codice
  cliente con il cliente riconosciuto o "non trovato", importo; per il bollettino mese e
  totale riconosciuto);
- due **schede**:
  1. **l'azione proposta** (si apre per prima), con un nome che dice cosa fare: *Pratica
     proposta* (conferme, fatture, note di credito: le pratiche candidate con i motivi e
     *Abbina a …*, più "abbina a un'altra pratica" con il campo di ricerca), *Scegli la
     pratica* (codice cliente non riconosciuto), *Nuova pratica* (ordine: *Apri la
     pratica*), *Cosa farne* (bollettino: *Registra e verifica*). Se delle righe sono state
     lette con poca sicurezza, in alto un **avviso** giallo "N righe lette con valori
     incerti: controllale prima di decidere" con *Vedi le righe*;
  2. **Righe lette**: nel titolo il contatore **"N da controllare"** (giallo, rosso se la
     lettura è bassa) quando delle righe hanno valori incerti, altrimenti grigio con il
     numero di righe; dentro la DataTable con le righe incerte evidenziate e il totale; le
     correzioni si fanno con *Correggi i dati letti*.
- **Perché**: in questa schermata si decide cosa fare del documento; le righe servono solo
  se la lettura è incerta. Prima le righe occupavano lo spazio e la proposta finiva sotto,
  fuori dallo schermo. L'avviso esiste perché una scheda chiusa si ignora facilmente.

**Nell'app (F6-A4b).** **Una pagina sola, come il prototipo**: a sinistra *Da controllare* con
l'area di caricamento (PDF e foto; gli Excel si rifiutano, D-60) e l'elenco selezionabile dei
documenti (tipo e numero, importo, fornitore e ricevuto, livello giallo/rosso); a destra il
documento scelto, senza cambiare pagina (l'indirizzo `/documenti/:id` serve al collegamento
diretto). Il pannello di destra ha il titolo `tipo numero · fornitore`, il file e le azioni
*Correggi i dati letti* (con il numero dei punti da controllare, rosso se il livello è basso) e
*Scarta il documento* (motivo e nota); sotto, i dati letti in colonne (fornitore o *non
riconosciuto*, tipo, data, codice cliente con il cliente trovato o *non trovato fra i clienti*,
importo; per il bollettino mese e totale riconosciuto, che è la somma delle **provvigioni** delle
righe, non degli imponibili (D-71)) e le due schede di D-15. **Il file non sta nel
dettaglio**: è a sinistra nella finestra di correzione, come nel prototipo. I documenti in coda,
in lettura o in errore non si elencano a parte: una nota dice quanti sono e che compaiono appena
letti. Le azioni proposte:
*Pratica proposta* con i candidati (numero, cliente, motivi, delta) e *Abbina a …*, più la
ricerca di un'altra pratica del fornitore; *Nuova pratica* per un ordine, con cliente e
fornitore precompilati dal codice riconosciuto (se mancano, campi di ricerca); *Cosa farne*
per il bollettino, con *Registra e verifica* (`POST /api/bollettini` con `arrivo_id`) e il
collegamento se il mese è già registrato. Per la **nota di credito** la fattura stornata si
cerca fra i documenti della pratica (`GET /api/pratiche/:id/documenti`) con il numero letto
in `riferimento_fattura`; se non c'è si sceglie, senza inventare. Con lettura bassa le
azioni chiedono conferma. Dopo abbinamento o scarto l'elenco si ricarica; in sola lettura i
pulsanti di modifica non compaiono.

*Perché (D-177, D-185):* la ricerca «Oppure abbina a un'altra pratica» filtra per **cliente e
fornitore** del documento (non più solo fornitore) e il filtro per stato sta **nella finestra di
ricerca, come tendina a destra del campo** (non più una riga di segmenti); il predefinito parte dal
tipo del documento («Aperte» per ordine/proforma/conferma/fattura, «Fatturata» per nota di credito e
pagamento) e lo sceglie il server. Con codice cliente vuoto e cliente già scelto non compare
l'avviso sul codice.

*Perché (D-153, D-154):* in *Correggi i dati letti* la testata sta su tre righe con il pulsante › fra
il campo letto e la ricerca (il «Cerca questo» sotto la ricerca spariva fra i campi) e la «Somma
righe» sta sopra l'Importo: importo del documento e somma delle righe possono non coincidere (per
esempio IVA inclusa), quindi si vedono in anteprima senza bloccare, mentre il server rifà lo stesso
controllo come punto `totale`.

*Perché (D-157, D-161, D-162):* nella ricerca del cliente col fornitore nel contesto la colonna
«Cod. cliente» mostra il codice dell'agenzia valida (il documento porta quello, non l'id del CRM);
finché le voci non arrivano il campo mostra il nome già noto, non l'id col pallino rosso; lo scaglione
mancante si configura nella finestra delle percentuali aperta da *Apri la pratica*, con la data
dell'ordine proposta, e poi l'apertura si riprova.

*Perché (D-158, D-159, D-175):* le agenzie del vecchio CRM valgono da sempre e restano «da
confermare» al primo uso («Usa questa» / «Configura»), perché sono dati importati e non verificati;
il fornitore riconosciuto si salva all'apertura del dettaglio (mai sopra una scelta a mano) e il
codice cliente risulta verde o giallo secondo il server, così elenco, dettaglio e correzione dicono la
stessa cosa.

*Perché (D-188, D-192, D-196):* in *Correggi i dati letti* un **pagamento** può restare senza numero
(«Riferimento (facoltativo)», titolo «Pagamento del <data> · <importo>»); **«Usa importi calcolati
(N)»** porta in blocco le righe discorde al calcolato; la **«Somma righe»** sta accanto a «Importo»,
in rosso quando differisce, senza «· diversa di …» (la differenza esatta nel suggerimento), e non
allarga la colonna.

*Perché (D-189, D-190, D-193):* la posizione del campo nel documento è sempre «indicativa» (mai
«esatta»); il visualizzatore unico di PDF e foto mostra «Non riesco a mostrare il PDF» con *Riprova*
e *Apri il PDF* in caso di errore (mai un fallimento silenzioso), ha il riquadro del valore anche
sulle foto, l'ingrandimento (−/%/+/Adatta) e la nota «Posizione del campo non disponibile per questo
documento» quando la posizione manca.

*Perché (D-171, D-172, D-173):* le azioni sulle righe sono icone in colonne fisse (`AzioniRiga`),
così non allargano la tabella e non si spostano da una riga all'altra; le operazioni senza ritorno
(rileggere, scartare, eliminare, chiudere) chiedono la conferma con la casella da spuntare
(`ConfermaGrave`), perché una perdita definitiva deve costare una scelta esplicita; gli
identificativi che si ricopiano hanno l'icona «Copia» (`Copiabile`), perché trascriverli a mano
introduce errori.

**Un documento in errore non è perso (A4-01).** Un documento in `errore` si recupera con
*Rileggi il documento* (torna in coda e il lettore lo riprende al giro successivo) oppure
inserendo i dati a mano con *Correggi i dati letti* e poi abbinandolo; solo se non serve lo si
scarta. *Perché (A4-01):* un errore del servizio di lettura — chiave scaduta o crediti finiti
(401/402/403/429), rete irraggiungibile, timeout del collegamento o risposta 5xx — non è colpa
del documento: i documenti restano in coda senza consumare i tentativi e si apre una sola anomalia
`lettura.non_raggiungibile`. Il tentativo si consuma solo per un errore del documento: risposta
valida ma illeggibile, oppure 4xx sul file. Il corpo di `PUT /api/documenti/:id` è un'interfaccia,
il `ValidationPipe` non lo valida: si controlla a mano che `testata` sia un oggetto e `righe` un
elenco di oggetti (al massimo 1000), così un corpo malformato dà 400 e non 500 (A4-13).

**Il PDF di un bollettino resta del bollettino (D-140).** Un file in arrivo legato a un
bollettino non si scarta e non si abbina a una pratica: le due azioni rispondono 409 «Il file è
il PDF di un bollettino». *Perché (D-140):* lo scarto lo manderebbe nella pulizia notturna, che
dopo i giorni di conservazione cancella riga e file, e il bollettino resterebbe senza il suo PDF;
lo stesso file come fattura di una pratica farebbe contare due volte lo stesso documento. Il
database lo impedisce con due CHECK (uno scarto non ha legami; un file non è insieme bollettino e
documento di pratica), così le rotte non sono l'unica difesa.

Non c'è un *Carica un documento* dentro la pratica: un documento si carica da *Carica documenti*
della barra e si abbina qui (§7.3, A9-10).

*Perché (D-93):* in Documenti il file sta nella finestra di correzione, non nel dettaglio: un
pulsante *PDF* in più apriva una finestra che faceva il lavoro di uno spazio già visibile.

*Perché (D-94):* l'elenco *Da controllare* sta nel layout e i nuovi documenti arrivano via SSE
aggiornando solo l'elenco, così selezionare un documento non ricarica più la lista; i numeri si
aggiornano subito e le righe si applicano con *Aggiorna* (D-23). Il dettaglio del documento si
rimonta quando cambia il documento scelto (`key`): così non conserva la scheda, il bollettino
registrato e la pratica scelta sul documento precedente.

*Perché (D-122):* uno scarto voluto non si riapre da solo: lo stesso file torna in coda solo se
ricaricato a mano; se arriva dalla casella il giro lo conta fra gli ignorati e lo scarto resta.

*Perché (D-126):* i totali delle righe del documento arrivano dal server, come quelli delle
tabelle: il browser non somma importi in virgola mobile (V12), quindi il piede è sempre quello
calcolato dal server al centesimo.

Il **modulo ordini cliente** (sostituzione della Gestione Ordini) è rinviato alla fase
successiva (§17).

### 7.10 Schema dei flussi e navigazione tra le schermate

Il prototipo ufficiale (`prototipo-alternativo/`, D-24) è una **pagina unica** con le
rotte `#/percorso`. A sinistra c'è la **barra laterale** con il **menu per area** (D-47, D-53):
in cima il nome dell'area aperta, sotto le voci dell'area, raggruppate per frequenza di lavoro.
Il dato che collega tutta
l'applicazione è l'**ordine a fornitore** (la pratica). Tutti i documenti entrano dal
canale comune di ingresso documenti del CRM (§6.5).

```
Barra laterale                         Rotte
[Provvigioni]                           nome dell'area aperta (solo titolo)
                                        …le voci dell'area…
[Ugo Volpato ▾]                         menu dell'utente: aree · password · Guida · Esci
├── Provvigioni
│   ├── Carica documenti               → apre la scelta dei file, poi Documenti (con provvigioni.modifica)
│   ├── Ogni giorno
│   │   ├── Oggi                       #/                       cose da fare per gruppi, scadenze
│   │   ├── Documenti                  #/documenti/:id          controlla, correggi, abbina, scarta
│   │   ├── Pratiche                   #/pratiche/:id           riepilogo · righe a confronto
│   │   └── Documenti scartati         #/scartati
│   ├── Ogni mese
│   │   └── Bollettini                 #/bollettini/:id         matrice 6 mesi → riconciliazione
│   └── Ogni trimestre
│       ├── Liquidazioni               #/liquidazioni/:anno/:t  documenti · report subagenti
│       └── Analisi                    #/analisi                BI con filtri ed esportazione
├── Dati
│   └── Anagrafiche
│       ├── Fornitori                  #/fornitori/:id          percentuali · clienti seguiti
│       ├── Subagenti                  #/subagenti/:id
│       └── Clienti                    #/clienti/:piva          agenzie · pratiche
├── Gestione (permessi di Sistema)
│   ├── Utenti e ruoli                 #/utenti/:id
│   ├── Stato del sistema              #/sistema
│   └── Impostazioni                   #/impostazioni/:sezione
├── Vendite (spenta, §17)
└── Guida (in ogni area)               #/guida/:argomento
```

Considerazioni:

- **Menu per area** (D-47, D-53):
  - l'area aperta è quella della pagina; le rotte non cambiano (niente prefisso d'area); sulle
    pagine comuni (Guida) resta aperta l'ultima area;
  - un clic su un'area apre la sua prima voce permessa;
  - in cima alla barra c'è il **nome dell'area aperta** (icona e testo), solo come titolo;
  - le aree stanno nel **menu dell'utente**, in fondo alla barra: cliccando sul proprio nome si
    apre verso l'alto un riquadro con l'email, le aree (icona e spunta sull'area aperta), una
    riga di separazione, *Cambia la password* e *Guida*, un'altra riga e *Esci*; si chiude con
    Esc, un clic fuori o scegliendo una voce; frecce su e giù spostano il fuoco e alla chiusura
    torna al pulsante;
  - sul tablet la barra va su una riga con il nome dell'area, *Carica documenti*, le voci e il
    riquadro dell'utente; il menu si apre verso il basso, per restare nello schermo.

  *Perché:* un solo posto per tutto quello che riguarda chi sei e dove lavori, come nelle app
  che gli utenti usano già; la barra resta per le voci dell'area. Il menu per area (D-47) resta
  perché il CRM è il primo modulo del portale (D-43): con tutte le voci in un'unica barra, ogni
  area nuova (Vendite, Gestione Ordini, …) la allungherebbe per tutti. L'area *Anagrafiche*
  diventa **Dati** perché conterrà tutte le tabelle consultabili e modificabili, non solo
  fornitori, clienti e subagenti (idea di Ugo, 01/11/2026).
- **Navigazione**:
  - ogni pagina ha una testata con *‹ Torna a …*, il titolo, le azioni e *Guida*;
  - si torna sempre alla schermata precedente nello stesso punto (§7.12);
  - le pagine di dettaglio non hanno il percorso "Pratiche › …" (D-12);
  - i contatori della barra laterale (Oggi, Documenti, Pratiche, Bollettini) seguono i
    dati (§16.4.2).
- **Utente**: in fondo alla barra laterale ci sono l'utente e il ruolo. Nel prototipo *Prova
  come* cambia utente, *Ripristina i dati di prova* riporta i dati all'inizio e la data di
  lavoro è simulata (04/09/2026). In esercizio (V3) si entra con nome utente (o email) e
  password (§3.3).
- **Oggi come punto d'ingresso**: raccoglie per gruppi di lavoro ciò che c'è da fare
  (documenti da controllare, conferme in ritardo, bollettini, pagamenti da sollecitare);
  da qui si entra nelle pagine.
- **L'agenzia (abbinamento cliente × fornitore) è la chiave di collegamento**: per ogni
  pratica risolve quale subagente segue il cliente presso il fornitore e con quale
  sconto. Lo sconto determina lo scaglione (§5.1), usato sia per il confronto dei
  bollettini sia per la liquidazione. Il vincolo unico di §5.10 garantisce un solo
  subagente per cliente × fornitore.
- **Documenti**: ogni fase (ordine, conferma, fattura, bollettino) passa dal canale
  comune di ingresso documenti (§6.5): ricezione → coda → lettura GLM-OCR → controllo
  operatore → abbinamento. I documenti non leggibili restano in `documenti_in_arrivo`
  con stato `errore`.
- **Liquidazione**: le regole di competenza (fatturato, maturato, storni e riaccrediti)
  sono in §5.14 e §7.8. Le percentuali sono quelle in vigore alla data del documento
  (§5.7); per i periodi chiusi valgono i valori congelati (§5.11).
- **Schede e pagine alte quanto lo schermo**: i dettagli con più contenuti usano le
  schede (§16.4), con prima l'informazione aggregata e l'azione proposta, poi le righe
  (D-12, D-15). Le tabelle riempiono lo spazio rimasto e scorrono dentro, così il
  layout non salta al variare del numero di righe.

### 7.11 Registro (`/registro`) — amministratore

- **Una pagina per eventi e anomalie** (D-31), **sola lettura** salvo *Segna come visto*
  sulle anomalie. Il prototipo non la mostra: si disegna con i componenti standard
  (DataTable, FilterBar, FormModal) come le altre liste.
- **Filtri standard** (§16.4.1): segmenti *Tutto · Anomalie aperte · Errori*; genere,
  livello, servizio, codice, utente, entità, periodo, testo sul messaggio. *Stessa
  operazione* su una riga mostra tutte le righe con la sua `operazione_id`.
- **Tabella** (contenitore stabile V9): quando, livello, messaggio, utente o servizio,
  riferimento (apre la pratica, il documento, il bollettino), volte; paginazione.
- **Dettaglio** in finestra: campi comuni e `dettaglio` mostrato come elenco di campi
  leggibili (diff `prima`/`dopo` affiancato).
- **Esporta** CSV delle righe filtrate (§8.1).
- La pagina **Stato del sistema** (§7.14) è una vista di questo registro: le anomalie dei
  servizi, con i giri di `servizi_esecuzioni`.
- Dettagli di progettazione in §15.

**Nell'app (F5-A2):** pagina `/registro` in sola lettura, per amministratore e superutente
(permesso `sistema.registro`), con la voce *Registro* in Gestione accanto a *Stato del sistema*.
- **Filtri standard** (§16.4.1): segmenti *Tutto · Anomalie aperte · Errori* con i conteggi sugli
  altri filtri (D-23); genere, livello, codice, tipo, esito, entità e servizio da tendine con i
  valori presenti nel registro; utente con il campo di ricerca; periodo Dal–Al con due date;
  ricerca nel messaggio e nell'etichetta del dettaglio; riepilogo dei filtri.
- **Tabella**: quando, livello, messaggio (col codice), utente o servizio, riferimento (apre la
  pratica, il documento, il bollettino o l'utente) e volte; ordinamento e pagine sul server.
- **Dettaglio** in finestra: campi comuni e `dettaglio` come elenco leggibile, con `prima` e `dopo`
  affiancati; *Stessa operazione* filtra tutte le righe con la stessa `operazione_id`.
- **Esporta** CSV delle righe filtrate (`GET /api/registro/export`). L'esportazione non scrive un
  evento: §15.2.6 non ha un codice per il registro e non se ne inventa uno.
- **Errori di oggi**: per chi ha `sistema.registro`, in Oggi un riquadro con gli eventi in errore di
  oggi e le anomalie aperte, che apre `/registro?da=oggi` (errori di oggi già filtrati). Per gli
  altri il riquadro non c'è e `GET /api/oggi` non restituisce il dato.
- Nessuna rotta di modifica o eliminazione (V10).

---

### 7.12 Navigazione: ritorno alla schermata precedente, nello stesso punto

Regola valida per **tutte** le schermate. Da qualunque schermata si apre un'altra (es.
da Clienti si apre una pratica, da una pratica un documento, dal fornitore un cliente) si
deve **poter sempre tornare indietro e ritrovare la schermata esattamente com'era**.

- **Pulsante "‹ Torna a <schermata precedente>"** in testa alla pagina,
  presente quando esiste una schermata precedente dell'app; equivale al tasto Indietro del
  browser (Alt + ←), che deve dare lo stesso risultato.
- **Cosa si ripristina:** filtri (FilterBar: segmenti, ricerca, select), riquadri KPI
  selezionati, **ordinamento** di ogni DataTable, **posizione di scorrimento** di ogni area
  scorrevole (righe della DataTable, pannelli, pagina) ed elemento selezionato (già
  nell'indirizzo, es. `/clienti/:piva`).
- **Ogni passo della cronologia ha la sua memoria**: la stessa schermata aperta due volte
  in momenti diversi ricorda due stati distinti. Lo stato vale per la sessione del
  browser (sopravvive al ricaricamento della pagina, non al login successivo).
- Dopo un **salvataggio** che ridisegna la schermata (es. aggiungi agenzia) filtri,
  ordinamento e scorrimento restano dove erano.
- I reindirizzamenti (es. vecchi indirizzi) **sostituiscono** il passo nella cronologia,
  non ne aggiungono uno, così Indietro non rimbalza.
- **Implementazione nell'app (React):** lo stato di filtri, ordinamento e selezioni sta
  nell'indirizzo (query string, es. `?stato=aperte&q=OF&ord=importo.desc`) oppure in un
  archivio per voce di cronologia (`history.state` / `location.key` di React Router);
  lo scorrimento si salva all'uscita e si ripristina dopo il disegno dei dati, per ogni
  area scorrevole (non solo la finestra). I componenti standard (§16.4) lo fanno da soli:
  nessuna schermata scrive codice proprio per questo. Nel prototipo: `CRM.naviga`,
  `CRM.registra`, `CRM.indietro` in `componenti.js`.

### 7.13 Utenti e ruoli (`/utenti`, `/utenti/:id`) — superutente e amministratore

- Gli **utenti sono propri del CRM** (`utenti`, §4.2.18, D-29); si entra con nome utente (o
  email) e password, come nella Gestione Ordini (§3.3, D-39).
- **Elenco** (sinistra): ricerca per nome, nome utente o email; segmenti *Attivi ·
  Disattivati · Tutti*; colonne utente (con nome utente ed email), ruolo, ultimo accesso
  (*Mai entrato* se non è ancora entrato).
- **Scheda** (destra): nome utente, email, ruolo, stato, ultimo accesso, **ultima email
  (benvenuto o nuova password) con l'eventuale errore di recapito**; azioni *Modifica*,
  *Reimposta la password* (nuova password provvisoria per email, da cambiare al primo
  accesso), *Disattiva/Riattiva*, *Elimina*.
- La scheda ha due **schede**: *Dati dell'utente* e **Cosa può fare ogni ruolo** (tabella
  attività × ruoli, la stessa di §8.3, con la colonna del ruolo dell'utente evidenziata).
- *Nuovo utente*: nome utente, nome, email, ruolo; parte l'email di benvenuto con la
  password provvisoria. Il superutente sceglie anche *Amministratore*; l'amministratore
  solo *Operatore* e *Sola lettura*.
- **Vincoli**: nome utente ed email unici; **deve restare almeno un amministratore
  attivo**; nessuno può cambiare il proprio ruolo, disattivarsi o eliminarsi;
  l'amministratore non modifica né elimina altri amministratori né il superutente; il
  **superutente** e l'**utente dei servizi automatici** non si modificano dall'interfaccia;
  eliminare un utente che ha già usato l'app chiede conferma e suggerisce di disattivarlo
  (il nome resta nel registro eventi). Un invio non recapitato apre l'anomalia
  `posta.respinta` (§7.14).

*Perché (D-117):* cambiare l'email senza avvisare il vecchio indirizzo permette a chi può
reimpostare la password di entrare al posto della persona, senza che questa ne sappia nulla;
l'avviso al vecchio indirizzo è l'unico segnale per il legittimo proprietario. Un invio fallito
apre l'anomalia e non annulla la modifica.

### 7.14 Stato del sistema (`/sistema`) — amministratore e operatore

- **Riquadri per servizio** (KpiRow, fanno da filtro): *Casella dei documenti*, *Server di
  lettura (GLM-OCR)*, *Sincronizzazione da Integra*, *Posta in uscita*; per ognuno stato
  (*Funziona* · *Da tenere d'occhio* · *Problema*, calcolato come in §7.14.2), nota
  (es. "lento: 9,8 s per pagina"), indirizzo, ultima esecuzione e ritmo, problemi da vedere.
- **Problemi** (sinistra): quando, livello (*Errore* · *Attenzione*), servizio, testo e
  **cosa fare**, "si è ripetuto N volte"; segmenti *Da vedere · Tutti*; *Segna come visto*
  per riga e *Segna tutti come visti*. Il numero dei problemi da vedere compare **nella
  barra** (voce Stato del sistema e titolo del gruppo Gestione), in giallo se c'è un
  errore. I problemi chiusi da soli hanno il segno *Risolto il …*.
- **Ultime esecuzioni** (destra): quando, servizio, esito, cosa ha fatto (ultime 50; con un
  servizio scelto nei riquadri, solo le sue). I `controllo` senza novità si raggruppano
  ("12 controlli riusciti dalle 09:00").
- *Controlla adesso*: esegue subito il giro della casella e il controllo di tutti i servizi
  (§7.14.1), poi ridisegna la pagina.
- La pagina si **aggiorna da sola** ogni 30 secondi mentre è aperta.
- È una **vista del registro** (§7.11, D-31): le anomalie dei servizi con i loro giri.

#### 7.14.1 Da dove vengono i dati: cosa scrive ogni servizio

Tutti i servizi girano nel server del CRM come **lavori pianificati** (stessa coda dei
lavori di §6.5) e scrivono in `servizi_esecuzioni` (§4.2.15) e aprono anomalie nel `registro` (§4.2.11). Oltre
al lavoro vero, ogni servizio ha un **controllo di salute** ogni 5 minuti, così si sa se
funziona anche quando non c'è nulla da fare.

| Servizio | Lavoro (`tipo = lavoro`) | Controllo di salute (`tipo = controllo`) | Misure registrate |
|---|---|---|---|
| **Casella dei documenti** (`casella`) | ogni N minuti (Impostazioni → Casella): legge le email nuove della cartella, salva gli allegati PDF/JPEG/PNG in `documenti_in_arrivo`, sposta le email lette (§6.5 punti 1–2). Fuori dalla porta 993 lo STARTTLS è obbligatorio (D-147) | accesso IMAP e presenza delle due cartelle | email, allegati presi, allegati ignorati |
| **Server di lettura** (`lettura`) | a ogni documento: invio a GLM-OCR, risposta, campi letti (§6.5 punti 3–4) | chiamata di prova al servizio (`/health` o modello caricato) e tempo di risposta | pagine, secondi, secondi per pagina, documento |
| **Sincronizzazione da Integra** (`integra`) | ogni 60 s per le anagrafiche (§4.5); una riga per giro con il riepilogo di tutte le viste | connessione al database e lettura di una riga per vista | per vista: righe lette, aggiornate, scartate |
| **Posta in uscita** (`posta`) | a ogni invio (password provvisorie, link di password dimenticata, solleciti se inviati dal CRM) | accesso SMTP senza inviare | destinatario, codice di risposta del server |

#### 7.14.2 Come si calcola lo stato del riquadro

Si valuta in quest'ordine; vince la prima regola vera. I valori sono parametri di
configurazione del server con questi valori iniziali.

| Stato | Quando |
|---|---|
| **Problema** (rosso) | c'è un problema aperto di livello `errore` per il servizio · oppure **servizio fermo**: nessuna esecuzione (lavoro o controllo) da più di 3 cicli (casella: 3 × minuti impostati; Integra: 3 minuti; lettura e posta: 15 minuti, cioè 3 controlli) · oppure gli ultimi 3 giri sono finiti in `errore` |
| **Da tenere d'occhio** (giallo) | c'è un problema aperto di livello `attenzione` · oppure il server di lettura negli ultimi 10 documenti ha una media oltre **8 s per pagina** · oppure una sincronizzazione è durata più del suo intervallo |
| **Funziona** (verde) | altrimenti |

La **nota** del riquadro è la frase più utile del momento, nell'ordine: causa del rosso o
del giallo ("2 clienti non sincronizzati", "lento: 9,8 s per pagina (di solito 4 s)",
"fermo da 22 minuti"), altrimenti un riepilogo del giorno ("6 allegati letti oggi",
"ultimo invio riuscito"). Il "di solito" è la media degli ultimi 7 giorni.

#### 7.14.3 Catalogo dei problemi

| Servizio | `codice` | Livello | Quando si apre | Cosa fare (testo del dettaglio) | Si chiude da solo |
|---|---|---|---|---|---|
| casella | `casella.connessione` | errore | accesso IMAP fallito 3 volte di fila | controllare server, utente e password in Impostazioni → Casella; *Prova la connessione* | al primo accesso riuscito |
| casella | `casella.cartella` | errore | la cartella da leggere o quella delle lette non esiste | crearla nella casella o correggere il nome | quando la cartella c'è |
| casella | `casella.allegato` | attenzione | allegato non PDF né foto (JPEG, PNG), es. `.zip`, o file danneggiato, **o email non leggibile (parse MIME fallito)**; chiave = uid | aprire l'email e caricare il documento a mano da Documenti | no (si segna come visto) |
| casella | `casella.interno` | attenzione | un errore del server ha impedito di registrare un'email (es. database giù); chiave = uid | riprovare; se si ripete, avvisare l'assistenza | no (si segna come visto) |
| casella | `casella.vuota` | attenzione | email senza allegati dalla cartella dei fornitori | verificare se il documento era nel corpo dell'email | no |
| lettura | `lettura.non_raggiungibile` | errore | il server non risponde a 2 controlli di fila | verificare il servizio sulla macchina con la scheda video; i documenti restano in coda e si leggono alla ripresa | al primo controllo riuscito (con "N documenti riletti") |
| lettura | `lettura.lenta` | attenzione | media oltre 8 s per pagina sugli ultimi 10 documenti | controllare il carico della scheda video | quando la media rientra |
| lettura | `lettura.fallita` | errore | un documento non si legge dopo 3 tentativi | aprirlo in Documenti e inserire i dati a mano, o scartarlo | quando il documento è corretto o scartato |
| integra | `integra.connessione` | errore | database non raggiungibile per **3 giri di sincronizzazione** di fila (una ricerca o un import su richiesta non la aprono: rispondono «Integra non raggiungibile, riprova più tardi») | verificare server, utente e password in Impostazioni → Sincronizzazione; avvisare chi gestisce Integra | al primo giro riuscito |
| integra | `integra.vista` | errore | una vista manca o ha colonne diverse | chiedere a chi gestisce Integra di ripristinare la vista (§4.5) | quando la vista si legge |
| integra | `integra.piva_mancante` | errore | un cliente o fornitore senza P.IVA valida (chiave = codice Integra) | correggere in Integra; entra da solo al giro successivo | quando la riga entra |
| integra | `integra.piva_doppia` | errore | due codici Integra con la stessa P.IVA | unire o correggere in Integra | quando il doppione sparisce |
| integra | `integra.lenta` | attenzione | un giro dura più del suo intervallo | segnalare a chi gestisce Integra (carico del database) | al primo giro nei tempi |
| posta | `posta.connessione` | errore | accesso SMTP fallito | controllare server, utente e password in Impostazioni → Posta | al primo invio o controllo riuscito |
| posta | `posta.respinta` | errore | il server rifiuta il destinatario (chiave = indirizzo) | correggere l'email dell'utente o del destinatario | no |

Testi e dettagli sono **frasi fisse con segnaposto** (nome del file, codice Integra,
secondi…) definite in un solo file del server; nessun messaggio tecnico grezzo nel testo
(il messaggio tecnico va nel `dettaglio` dell'anomalia e in `servizi_esecuzioni.misure`).

*Perché:* l'anomalia `integra.connessione` nasce solo da un giro della **sincronizzazione** fallito
tre volte di fila, non da una pagina che ha chiesto una ricerca: la VPN che cade un attimo non deve
riempire *Stato del sistema* con una riga per ogni pagina aperta (C4).

*Perché:* un'email malformata non deve fermare il giro intero: resta in cartella, si segnala con
`casella.allegato` e si ritenta al giro dopo (A4-05). Un guasto del server non è un'email
illeggibile: prima condivideva codice e testo con `casella.allegato` e mandava l'utente a caricare
il documento a mano; ora le due cause hanno codice e messaggio propri (`casella.interno`, C1).

#### 7.14.4 Vita di un problema

1. **Si apre**: se non c'è già un problema aperto con lo stesso `servizio + codice +
   chiave`, se ne crea uno (`primo = ultimo = adesso`, `volte = 1`).
2. **Si ripete**: se c'è, si aggiornano `ultimo` e `volte` e si **azzera `visto_il`** solo
   se il livello è `errore` (un errore che torna va rivisto).
3. **Si chiude da solo** quando la causa sparisce (colonna "si chiude da solo" di §7.14.3):
   `stato = chiusa`, `chiusa_il = adesso`; resta in *Tutti* con *Risolto il …* e non conta più nella barra.
4. **Visto**: *Segna come visto* toglie il problema dal contatore della barra ma non lo
   chiude; un problema visto e ancora aperto continua a colorare il riquadro.
5. Il problema è **una riga `anomalia` del registro** (§4.2.11): apertura, ripetizione e
   chiusura aggiornano quella riga; *Segna come visto* scrive anche un evento (D-31).

#### 7.14.5 Interfacce del server

| Metodo | Rotta | Descrizione |
|---|---|---|
| GET | `/api/sistema` | riquadri (stato e nota calcolati §7.14.2), problemi (`?vista=da_vedere|tutti&servizio=`), ultime esecuzioni (`?servizio=&limite=50`) |
| GET | `/api/sistema/contatore` | numero dei problemi da vedere e se c'è un errore (per la barra; letto a ogni cambio pagina) |
| POST | `/api/sistema/problemi/:id/visto` | *Segna come visto* (permesso `sistema`) |
| POST | `/api/sistema/problemi/visti` | *Segna tutti come visti* (permesso `sistema`) |
| POST | `/api/sistema/controlla` | *Controlla adesso*: mette in coda il giro della casella e i quattro controlli, risponde quando sono finiti (al massimo 30 s) |

**Nell'app (F5-A5).** Pagina `/sistema` con il permesso **`sistema.stato`** (amministratore, oppure operatore in un'area: §8.3), voce della barra in Gestione.
- `src/sistema.ts`: `SistemaService` fa i quattro controlli ogni 5 minuti (timer di 60 s, nessun timer nelle prove) con prove iniettabili (`sondaCasella`, `sondaLettura`, `sondaIntegra`, `sondaPosta`); ogni controllo scrive una riga `tipo = 'controllo'` in `servizi_esecuzioni`, **anche per un servizio non configurato** (`esito = 'ok'`, `testo = 'non configurata'`), così il riquadro non risulta fermo.
- Le prove: casella = `apriImap` (accesso e presenza delle due cartelle); lettura = `provaConnettore` (LlamaCloud), per il connettore locale «prova non disponibile» (verde); integra = `creaPonte` e `SELECT 1` su `v_clienti` e `v_fornitori`; posta = `creaTrasporto().verify()`. Ognuna ha un tempo massimo di 20 s; il tempo va in `misure`, il messaggio tecnico solo in `misure`/`dettaglio`.
- Anomalie che il controllo apre e chiude: `casella.connessione` (3 controlli falliti di fila), `casella.cartella` (subito, chiave = cartella), `lettura.non_raggiungibile` (2 di fila; si chiude al primo ok), `posta.connessione` (subito), `integra.connessione` (3 di fila), `integra.vista` (subito, chiave = vista). Le anomalie di connessione si chiudono anche quando il servizio viene spento dalle Impostazioni. **`lettura.lenta` non si apre ancora**: il lettore salva i `secondi` ma non le pagine (D-74; si aggiunge con F6-A5).
- Stato e nota del riquadro dal database (V12), nell'ordine di §7.14.2; un servizio non configurato è verde con la nota «Non configurata»; senza alcuna esecuzione la nota dice che il primo controllo non è ancora passato; il riepilogo del giorno conta gli allegati letti, i documenti letti, le righe dell'ultimo giro di Integra e l'ultimo invio.
- `GET /api/sistema` risponde `{servizi: [{id, nome, stato, nota, indirizzo, ultima, ritmo, problemi}], problemi: [{id, quando, livello, servizio, codice, testo, cosa_fare, chiave, volte, visto, stato, risolta_il}], esecuzioni: [{quando, servizio, esito, testo, misure, raggruppate?}], conteggi: {da_vedere, tutti}}`; `?vista=da_vedere|tutti`, `?servizio=` (problemi ed esecuzioni) e `?limite=` (50, al massimo 200). `cosa_fare` è la frase fissa del catalogo §7.14.3, in un solo elenco nel server.
- I `controllo` riusciti consecutivi dello stesso servizio si **raggruppano** in una riga «N controlli riusciti dalle HH:MM» (il testo dell'ultimo giro resta la causa se è diversa); a farlo è il server.
- `GET /api/sistema/contatore` → `{problemi, errore}`: le anomalie aperte e non viste dei servizi, e se ce n'è una in `errore`. La barra lo legge a ogni cambio pagina e scrive il numero sulla voce *Stato del sistema* e sul gruppo della Gestione, giallo con un errore; senza il permesso non c'è.
- *Segna come visto* e *Segna tutti come visti* scrivono `visto_il`/`visto_da` e l'evento `stato/change_state` su `sistema` con `{problemi: [id]}` (§15.2.7), in una transazione; già visto = nessun evento.
- *Controlla adesso* esegue il giro della casella (`CasellaService.esegui`, che rispetta il giro in corso) e i quattro controlli, e risponde entro **30 s**: le parti lente continuano e la pagina ricarica.
- Pulizia notturna: gli scartati oltre `scartati_giorni` (con i file, dopo il commit) e i giri di `servizi_esecuzioni` oltre 90 giorni. La pulizia del registro resta `PuliziaRegistro` (§15.7): non si duplica.
- La pagina mostra i riquadri (KpiRow, fanno da filtro), *Problemi* a sinistra (segmenti *Da vedere · Tutti* con i conteggi, *Segna come visto* per riga, *Risolto il …* per le chiuse), *Ultime esecuzioni* a destra, si aggiorna da sola ogni 30 secondi e usa le sagome (D-59); sul tablet le due tabelle si impilano con un'altezza propria.


### 7.15 Impostazioni (`/impostazioni/:sezione`) — solo amministratore

Sezioni a sinistra (ElencoSelezionabile), modulo della sezione a destra con *Salva* e,
dove serve, *Prova la connessione* (la prova usa i **valori salvati**, non quelli digitati).

| Sezione | Campi |
|---|---|
| Dati dell'azienda | ragione sociale, P.IVA, indirizzo, email (intestazione dei prospetti esportati, §11) |
| Casella dei documenti | server IMAP, porta, utente, password, cartella da leggere, cartella dove spostare le email lette, ogni quanti minuti (1–60) |
| Server di lettura | **modello di lettura** scelto da un menu (`llamacloud_eu` · `glm_ocr_locale`); per ogni modello i **suoi parametri salvati** — LlamaCloud: chiave API (cifrata, mai riletta), modo (economico · agentico · agentico plus), progetto (vuoto = il primo), tempo massimo; locale: indirizzo del server, modello, tempo massimo — e **soglie di affidabilità** comuni (affidabile da, bassa sotto; §6.5). La pagina mostra solo i parametri del modello scelto, che è quello usato per leggere i documenti |
| Posta in uscita | server SMTP, porta, utente, password, mittente |
| Sincronizzazione da Integra | server del database ponte (§4.5), nome del database, utente in sola lettura, password, schema delle viste, ogni quanti secondi (anagrafiche, 10–3600) (§4.5) |
| Conservazione dei dati | registro eventi (mesi, 12–120), documenti scartati (giorni, 1–3650), righe per pagina (5–200) |

**Nell'app (F5-A6):** sei sezioni con metadati e testi dal prototipo; `GET /api/impostazioni` li
restituisce (la pagina non li riscrive). Nel **Server di lettura** un menu sceglie il modello; la
pagina mostra solo i campi di quel modello (`gruppo`), salva solo quelli e lascia intatti i
parametri dell'altro; il modello scelto è quello usato da `letturaConfig` (D-68). Le **password non si rileggono**: il campo mostra
«impostata», si scrive solo per sostituirla; il valore cifrato non esce mai dal server e non
finisce nel registro (§15.4, §15.8). Controlli sul server (V12): numeri interi nei limiti (le
soglie con al massimo due decimali), `0 < soglia_bassa < soglia_ok ≤ 1`, `eventi_mesi ≥ 12` (le
informazioni durano comunque 12 mesi, §15.7), email con `@`, testi obbligatori; un errore dice
quale campo e il limite, mai il valore. Se cambia server, porta o utente di una connessione
(casella, posta, integra) e la password non è riscritta nello stesso salvataggio, il salvataggio è
rifiutato (400): il segreto salvato non parte mai verso un indirizzo nuovo (A1-01a, D-115).

*Perché (D-115):* Posta, Casella e Integra individuano una connessione esterna e si modificano e si
provano solo con `sistema.connessioni`, cioè dal superutente; le altre sezioni restano a
`sistema.impostazioni`. Dalla Posta passa il link di reset della password del superutente: un
amministratore con un SMTP suo poteva leggerlo e diventare superutente (D-39, D-45). Un amministratore
vede le connessioni in sola lettura, senza *Salva* né *Prova la connessione*.

*Perché (D-65):* le sei sezioni sono le sole cose che si configurano nel CRM e i loro valori sono
letti davvero dai servizi (posta, Integra, registro, righe per pagina, intestazione delle
esportazioni); i segreti stanno cifrati e non si rileggono mai, così una sezione salvata non resta
inerte e una password non esce dal server (V12).
Ogni salvataggio scrive un evento `crud/update` con i campi cambiati (mai le password), in una
transazione con la riga (V13). `POST /api/impostazioni/:chiave/prova` prova casella (imapflow),
posta (nodemailer `verify()`), server di lettura (`GET /models`, timeout 10 s) o Integra (pool in
sola lettura); una prova fallita è `200 {ok:false}` con il motivo, non un 500; `azienda` e
`conservazione` non hanno una connessione (400).

Quando cambiano `soglia_ok` o `soglia_bassa`, il salvataggio riclassifica i documenti **non ancora
abbinati né scartati** (`da_controllare`, `errore`) con le soglie nuove, nella stessa transazione
(V13), e l'evento `crud/update` porta `riclassificati` (il numero). I documenti già abbinati o
scartati non si toccano.

*Perché (D-151):* le soglie partono da 0,80/0,70 perché sui documenti veri i campi sopra 0,80 erano
tutti giusti. Sono un'impostazione globale, non una costante nel browser: la pagina del documento
riceve dal server le soglie in vigore e le usa per colori, «%» e conteggio dei punti. Al salvataggio
si riclassificano i soli documenti ancora da decidere, così i loro livelli concordano subito con le
soglie nuove; gli abbinati restano dov'erano perché la loro decisione è già presa.

**Parametri del server (`.env`).** Alcuni valori non stanno nel database e non si modificano dalla
pagina: `SEGRETI_CHIAVE` (senza, le password non si possono cifrare), `DOCUMENTI_DIR`,
`DOCUMENTI_MAX_MB` e `APP_URL`. `GET /api/impostazioni` li restituisce in `ambiente` (nome, uso,
sezioni che li usano, `obbligatorio`, `impostato`, valore solo se non è un segreto) e la pagina li
elenca sotto la sezione, con il file da modificare (`app/backend/.env` sul server) e l'avviso che il
backend va riavviato (D-70). *Perché:* un parametro che blocca un salvataggio deve dire dove si cambia,
invece di lasciare l'operatore davanti a un errore senza sapere cosa fare.

**Valori iniziali** (un'installazione nuova): azienda, lettura (soglie 0,80/0,70, attesa 120,
modello `zai-org/GLM-OCR`) e conservazione (36/90/25) come nel prototipo; `lettura.indirizzo` e i
campi di connessione di casella, posta e integra partono **vuoti**, così non si tentano indirizzi
d'esempio.

*Perché (D-125):* nel *Server di lettura* il connettore locale si mostra spento finché non c'è la
macchina, così nessuno sceglie un modello che non legge nulla; il salvataggio lo rifiuta con 400 e
si legge con LlamaCloud UE (D-67). Un connettore inesistente lascerebbe i documenti in coda per
sempre, senza anomalia.

**Dove vengono usate** (una sezione salvata ma ignorata è un errore): la **posta in uscita** manda
con nodemailer quando il server è configurato (`secure` sulla porta 465), altrimenti il log di
sviluppo; la **sincronizzazione da Integra** legge `integraConfig` a ogni giro e ricrea il pool solo
quando la configurazione cambia; la **conservazione del registro** usa `eventi_mesi` nella pulizia
notturna; le **righe per pagina** valgono nelle tabelle e negli elenchi del server; l'**intestazione
delle esportazioni** (liquidazione e Analisi) usa ragione sociale, P.IVA, indirizzo ed email.
`scartati_giorni` e `lettura`/`casella` si salvano qui ma le usano F5-A7 e F6.

### 7.16 Documenti scartati (`/scartati`) — amministratore e operatore

- Lo **scarto chiede il motivo** (*Doppione* · *Non riguarda Decobrands* · *Documento
  illeggibile* · *Altro*) e una nota facoltativa.
- Elenco: scartato il / da chi, documento (tipo, numero, fornitore, file), motivo e nota,
  data di eliminazione automatica (`scartati_giorni`, §7.15); segmenti per motivo e
  ricerca.
- **Recupera** rimette il documento fra quelli da controllare (§7.9) e lo apre;
  **Elimina** definitivamente solo l'amministratore, con conferma.
- Da "Documenti" il collegamento "N scartati" accanto al contatore.
- Anche il **dettaglio** e il **file** di un documento scartato chiedono `provvigioni.scartati`:
  la sola consulta non li apre (D-83).

**Nell'app (F5-A7).** Pagina `/scartati` con il permesso **`provvigioni.scartati`** (operatore o superiore), in Provvigioni.
- `GET /api/scartati?motivo=&q=&ordina=&dir=&pagina=&per_pagina=` → `{scartati: [{id, scartato_il, da, tipo, numero, cliente, fornitore, fornitore_id, file_nome, motivo, nota, elimina_il}], conteggi: {tutti, per_motivo: [{motivo, n}]}, giorni, totale, pagina, pagine, per_pagina}`; ricerca in numero, file, fornitore e cliente; conteggi dei segmenti sugli altri filtri (D-23); `elimina_il` = `scartato_il` + `conservazione.scartati_giorni`, calcolato dal server. Con `per_pagina=1` dà il solo numero per il collegamento «N scartati» di Documenti (solo con il permesso).
- `POST /api/scartati/:id/recupera` → il documento torna `da_controllare` con `tentativi = 0`, `errore = null` e i campi di scarto vuoti; 409 se non è scartato, 404 se non c'è; evento `documento/update` con `{stato: 'da_controllare'}`; la pagina apre `/documenti/:id`.
- `DELETE /api/scartati/:id` → **solo amministratore** (e superutente), oltre al permesso `provvigioni.elimina`: elimina la riga (i campi letti in cascata) e, dopo il commit, il file; 409 se il documento non è scartato, 404 se non c'è. Il catalogo §15.2.4 non ha un codice per l'eliminazione di uno scartato: si scrive `documento/update` con `{eliminato: true}` (D-74).
- La pagina ha i filtri standard (§16.4.1: segmenti per motivo con i conteggi, ricerca, riepilogo), la tabella con scarto il/da, documento (tipo, numero, fornitore, cliente, file), motivo e nota, la data di eliminazione automatica, *Recupera* e *Elimina* (amministratore, finestra di conferma), le sagome (D-59) e il ritorno alla schermata precedente (§7.12).
- Pulizia notturna: `SistemaService` elimina gli scartati oltre i giorni (righe e file, dopo il commit) senza scrivere eventi: è manutenzione, non un'operazione di una persona (D-74). *Perché:* la cancellazione ricontrolla lo stato nella stessa istruzione (`DELETE … WHERE stato = 'scartato' AND scartato_il < … RETURNING id, file_percorso`), così uno scartato recuperato o rianimato dalla casella mentre gira la pulizia non viene eliminato con il suo file (A3-04, A4-09).


### 7.17 Guida (`/guida/:argomento`) — tutti

- **Argomenti** a sinistra, raggruppati *Inizia qui · Lavoro · Anagrafiche · Gestione* (più
  *Vendita diretta* con l'ampliamento), con **ricerca in tutto il testo**: anche nomi di
  pulsanti e finestre ("Prepara la contestazione" trova Bollettini).
- **Inizia qui**: *Come funziona il CRM* (schema del ciclo documenti → pratiche →
  bollettini → liquidazioni con la cadenza di ognuno, ogni riquadro apre la pagina) e
  *Comandi comuni* (Torna a, Carica documenti, Guida, segmenti, riquadri-filtro, schede,
  ordinamento, pagine, campi con ricerca e F4, Esc).
- **Ogni argomento** ha la stessa struttura, sintetica ma completa:
  1. **sintesi** (a cosa serve, in due righe);
  2. **schema** dove aiuta (es. stati della pratica con i rami *Conferma in ritardo* e
     *Nota di credito*; incassi sul fatturato e sul maturato con lo storno al subagente);
  3. **Come si lavora**: i passi in ordine, numerati;
  4. **Pulsanti e comandi**: ogni pulsante della pagina con cosa fa;
  5. **Finestre**: ogni finestra che la pagina apre, con *si apre da*, cosa contiene
     (campi) e i suoi pulsanti;
  6. **Da sapere**: regole e avvertenze;
  7. **chi può modificare** (dai ruoli, §8.3).
- Argomento trasversale **Incassi dei clienti** (§5.14): chi incassa, fatturato e maturato
  a confronto, dove compaiono le fatture non pagate (Oggi, bollettino, pratica, cliente), la
  finestra *Solleciti di pagamento* e la regola dello storno alla liquidazione successiva.
- **Aiuto contestuale**: ogni pagina con un argomento ha in testata il pulsante *Guida*
  che apre l'argomento giusto. Gli argomenti di gestione si vedono solo con il permesso.
- I contenuti stanno in un solo file di dati (`CRM.GUIDA`, prototipo `assets/guida.js`):
  nell'app sono un file di contenuti versionato con il codice, da aggiornare **nella
  stessa attività** che cambia una pagina (regola di consegna §16.5).

**Nell'app (F5-A8):** `/guida` apre il primo argomento visibile, `/guida/:argomento` quello
scelto; un argomento inesistente o non permesso riporta al primo e l'elenco resta a sinistra.
I contenuti sono in `app/frontend/lib/guida.ts`: 17 argomenti del prototipo, senza *Vendita
diretta* (D-08), con gli indirizzi delle pagine dell'app al posto delle rotte `#/`. Gli
argomenti di *Gestione* si vedono con `sistema.utenti`, `sistema.stato`, `sistema.registro`,
`sistema.impostazioni`, `provvigioni.scartati`. Il pulsante *Guida* in testata si aggiunge con
ogni pagina che arriva (§16.5).

### 7.22 Analisi (`/analisi`) — tutti

È la **BI** del CRM. Risponde a queste domande:
- quanto fatturano i clienti;
- quanto riconoscono i fornitori;
- quanto si paga ai subagenti;
- quanto resta a Decobrands;
- da chi viene e come cambia nel tempo.

Nel menu è la voce *Analisi*, nel gruppo *Ogni trimestre*, sotto Liquidazioni.
Prototipo: `assets/viste-analisi.js`.

#### Dati: un fatto per documento fiscale (`fattiAnalisi()`)

Ogni fatto contiene:
- data e mese;
- fornitore, cliente, subagente, pratica;
- tipo: fattura, oppure nota di credito con importi negativi;
- imponibile;
- *dai fornitori* = imponibile × % dal fornitore alla data del documento;
- *ai subagenti* = imponibile × % del subagente;
- *margine* = dai fornitori − ai subagenti.

Regole:
- **Competenza = data del documento** (D-19).
- Storni e riaccrediti non sono fatti: cambiano il momento del pagamento, non il fatturato.

Nell'app:
- `GET /api/analisi?dal=AAAA-MM&al=AAAA-MM&fornitori=&subagenti=&clienti=&raggruppa=` (§8.1) risponde con periodo e periodo precedente, i 4 numeri con le variazioni, i dati dei 4 grafici, la tabella raggruppata, le voci proposte dai tre campi (calcolate con gli altri filtri attivi, D-23) e il numero di documenti;
- `GET /api/analisi/esporta?formato=xlsx|csv&…` dà il file (§11): Excel con i fogli e i totali a formule, CSV dei soli documenti;
- le aggregazioni si fanno sul server, dai fatti del motore (`fattiAnalisi`), non con SQL riscritto: le regole delle provvigioni restano una sola;
- ponytail: `caricaDati` carica tutto, come Liquidazioni; sui 10.000 pratiche la pagina risponde in ~1,8 s (`test/carico-analisi.ts`). Se i tempi cresceranno, la vista `v_analisi_documenti` del piano sostituisce il calcolo, ma tocca i soldi e la decide Claude Code con una prova sui numeri.

#### Periodo

- Durata di 3, 6 o 12 mesi, scelta con i segmenti.
- Il mese d'inizio si sceglie con PeriodoMesi (§16.4); ‹ › sposta di un mese.
- Il periodo resta dentro i mesi con dati, dal primo documento al mese in corso.
- Cambiando durata, il periodo finisce nello stesso mese di prima.
- Predefinito: gli ultimi 12 mesi.

#### Filtri

- Fornitori, subagenti, clienti: tre **campi di ricerca a selezione multipla** (CampoRicerca,
  §16.4), lo stesso componente della ricerca articoli (D-20):
  - stanno **sulla stessa riga** del periodo e della durata (D-21); l'etichetta è il
    segnaposto del campo vuoto (*Tutti i fornitori*, …), il suggerimento al passaggio del
    mouse elenca le voci scelte;
  - il campo chiuso mostra: vuoto = *Tutti i …*; una voce = il suo nome; più voci =
    **Filtro multiplo (n)** (campo azzurro);
  - entrando nel campo si apre il menu: **in alto le voci scelte** con ✓ (clic = la toglie,
    *Togli tutti*), sotto le altre (scrivendo si restringono; clic o Invio = aggiunge); il
    menu **resta aperto** per sceglierne altre;
  - il filtro si applica **alla chiusura del menu** (Esc, Invio a vuoto, Tab, clic fuori), una
    volta sola: la pagina non si ridisegna a ogni voce;
  - la lente (o F4) apre la maschera con le caselle, *Scegli tutte le righe filtrate* e
    *Togli tutte*, poi *Applica (n)*.
- Il menu e la maschera propongono solo le voci con documenti nel periodo e compatibili con
  gli altri filtri (`contesto.limita`); per i subagenti anche quelli non più attivi
  (`contesto.tutti`).
- Voci dello stesso campo in **o** (Gries o Gasper), campi diversi in **e** (fornitore e
  cliente).
- In fondo alla riga due **icone**:
  - **imbuto** con il numero delle voci scelte: apre un riquadro con il **riepilogo di tutti
    i filtri** (periodo, fornitori, subagenti, clienti), ogni voce con × per toglierla, e
    *Togli tutti i filtri*;
  - **imbuto barrato**: toglie tutti i filtri (spento se non ce ne sono).
- API: `fornitori`, `subagenti`, `clienti` accettano più valori separati da virgola (§8.1).
- Arrivando dal link *Analisi completa* della Liquidazione (§7.8) `dal`, `al` e `subagenti`
  stanno nell'indirizzo: la pagina li applica una volta al caricamento e poi toglie i parametri,
  così ricaricare non li riapplica (F4-A1).

#### Filtro incrociato

- Un clic su una fetta o una barra (fornitore, subagente, cliente) **aggiunge** quella voce
  al filtro; un secondo clic la toglie. Lo stesso vale per un clic su una riga della tabella
  raggruppata. Il campo corrispondente si aggiorna (nome o *Filtro multiplo (n)*).
- Ogni grafico per dimensione **ignora il proprio filtro**: mette in risalto le voci scelte
  e schiarisce le altre. Così si vede sempre il peso della scelta sul totale.

#### Numeri

Quattro valori:
- fatturato dei clienti, con il numero di fatture e di clienti;
- provvigioni dai fornitori, con la % sul fatturato;
- provvigioni ai subagenti, con la % delle provvigioni;
- margine Decobrands, con la % delle provvigioni.

Ognuno mostra la variazione % sul periodo precedente della stessa durata, con gli stessi
filtri:
- con 12 mesi la scritta è "sullo stesso periodo dell'anno prima";
- se prima non c'è nulla la scritta è "nessun dato per il confronto".

#### Grafici

Quattro grafici:
- *Andamento*, mese per mese: barre dai fornitori e ai subagenti, linea del margine. I mesi
  vuoti compaiono comunque.
- *Fatturato per fornitore*: ciambella con i primi 7 fornitori e "Altri N".
- *Subagenti*: barre impilate con la quota del subagente e il margine.
- *Primi 10 clienti* per fatturato.

#### Dettaglio

Una tabella con i segmenti *Per subagente · Per fornitore · Per cliente · Per mese ·
Documenti*.
- Nei raggruppamenti le colonne sono: fatture e clienti, fatturato, dai fornitori, ai
  subagenti, margine, quota del fatturato. I totali valgono su tutte le righe (§16.4).
- In *Documenti* le colonne sono: data, numero (apre la pratica), cliente con fornitore e
  subagente, importi.
- Il raggruppamento lo fa il server (`raggruppa=subagente|fornitore|cliente|mese|documento`,
  iniziale `subagente`); i grafici usano i raggruppamenti senza il proprio filtro, la tabella
  con tutti i filtri. La tabella ha l'altezza del contenuto (massimo 22 rem), perché sta in una
  pagina che scorre.

#### Esporta

Il pulsante apre una finestra in cui si sceglie il formato:

| Formato | Contenuto |
|---|---|
| **Excel** (.xlsx, predefinito) | foglio *Riepilogo* (4 numeri con periodo precedente e variazione); fogli *Per subagente*, *Per fornitore*, *Per cliente*, *Per mese* con i totali a formule `SUM`; foglio *Documenti*. Intestazione con periodo, filtri e data di generazione |
| **PDF** | stesso contenuto e stessa impaginazione dell'Excel: è il medesimo `.xlsx` convertito con LibreOffice (F4-A3) |
| **CSV** | l'elenco dei documenti filtrati, separatore `;`, virgola decimale, UTF-8 con BOM, date `gg/mm/aaaa` |

- Il modello è lo stesso della liquidazione (§11): fogli → blocchi.
- Nell'app Excel, CSV e PDF si generano sul server (`exceljs`, §11) e prendono gli stessi
  numeri della pagina; i grafici come immagini nell'Excel restano fuori: richiedono un motore
  grafico sul server (D-61).

#### Ruoli

Tutti consultano ed esportano, anche il ruolo *sola lettura* (D-05).

#### Perché

- La sintesi nella liquidazione era legata al trimestre. Per capire l'andamento, la
  produttività dei subagenti e il peso dei fornitori servono periodi liberi, filtri
  combinabili ed esportazione (D-18).
- La competenza per data del documento rende i numeri stabili: non cambiano quando arriva un
  bollettino o uno storno (D-19).
- I numeri vengono dal motore (`fattiAnalisi`) e non da SQL riscritto: le regole delle
  provvigioni restano una sola, e la pagina e l'esportazione danno gli stessi importi della
  liquidazione. Il costo è caricare i dati a ogni richiesta; si misura con
  `test/carico-analisi.ts` e, se cresce, si passa alla vista `v_analisi_documenti` (D-61).

### Vendita diretta (§7.18–§7.21) — **ampliamento futuro (§17), non in questa fase**

> Le pagine sotto sono progettate e funzionano nel prototipo, ma **spente**: il gruppo
> "Vendita diretta" non compare nella barra e gli indirizzi mostrano "Ampliamento previsto
> più avanti". Si accendono nel prototipo con `?vendita=1` nell'indirizzo. Nell'app non si
> sviluppano in questa fase.

### 7.18 Ordini cliente (`/ordini-cliente`, `/ordini-cliente/:id`) — vendita diretta

Replica la Gestione Ordini per gli ordini dei clienti in **vendita diretta** (articoli che
Decobrands vende in proprio). Gli ordini entrano dall'ingresso documenti (§6.5) con il
tipo `ordine_cliente` (§17).

- **Elenco** (sinistra, ElencoSelezionabile): segmenti *Da esportare · Esportati · Tutti*,
  ricerca per numero o cliente; per ordine numero, cliente, totale, data, righe, fornitore
  e stati (*Da esportare*, *N problemi*, *N alias*, *N kit*, *Esportato il …*). La voce
  della barra conta gli ordini da esportare.
- **Scheda** (destra): cliente con P.IVA, **codice Integra** (rosso se manca), data,
  fornitore e riferimento, totale, stato dell'esportazione (quando, chi, file); i
  problemi bloccanti in un riquadro rosso.
- **Righe**: articolo con pallino (verde = in anagrafica Integra, rosso = no), descrizione,
  segni *alias → nuovo* e *kit di N componenti*, quantità con UM, prezzo, importo, totale,
  **disponibile** (giacenza − impegni).
- **Esporta per Integra** (finestra larga, a **schede** perché un ordine può avere decine
  di alias e kit). Sopra le schede, sempre visibile, il **riepilogo**: righe nel file,
  cambi di codice e kit applicati, problemi bloccanti e avvisi. Le schede hanno il
  contatore (giallo se ci sono alias da confermare; *File e controlli* rosso se ci sono
  problemi, verde se è pronto); *Genera i file* con problemi apre *File e controlli*.
  Nelle schede alias e kit: ricerca per codice o descrizione, *Applica a tutti* / *A
  nessuno*; negli alias anche i segmenti *Tutti · Da confermare · Divisi · Non applicati*.
  Le quantità si modificano in tabella senza ridisegnarla (vecchio + nuovo = ordinato).
  1. **Codici vecchio → nuovo**: per ogni riga con alias il caso proposto — *A* disponibile
     il vecchio (nessun cambio), *B* disponibile in parte (divide la riga: il disponibile
     sul vecchio, il resto sul nuovo), *C* vecchio esaurito (tutto sul nuovo) — con
     *Applica* e quantità modificabili su vecchio e nuovo (la somma resta l'ordinato);
     "chiede conferma" se l'alias lo prevede.
  2. **Kit**: articolo con disponibile ≤ 0 (o assente) e kit attivo → righe dei componenti
     × quantità ordinata, con il disponibile di ciascuno; *Applica* per riga. Le righe dei
     componenti escono senza prezzo (Integra lo reperisce).
  3. **File e controlli**: anteprima delle righe finali del file (codice, descrizione,
     origine alias/kit, quantità, prezzo o "da Integra"); file da generare *Ordine cliente (OC)* e/o *Ordine fornitore (OF)*, con i nomi
     `aaaammgg_codiceIntegra_progressivo_TIPO.xlsx` (progressivo del giorno per cliente).
  4. **Controlli bloccanti**: data, codice cliente Integra, almeno una riga, codice e
     quantità di ogni riga, almeno un file scelto. **Avvisi**: articolo non in anagrafica,
     disponibile minore dell'esportato.
  5. *Genera i file*: scarica i file (uno per tipo), crea gli impegni (solo la prima
     volta, §4.2.16), registra l'esportazione (§4.2.17) e l'evento (§15).
- **Tracciato del file** (uguale alla Gestione Ordini): foglio `Ordine`, una riga per
  articolo, 28 colonne `mvt_mdtcod` … `mvr_reperisciprezzo`; documento `OC0000` o
  `OF0000`, serie `OC`/`OF`, tipo anagrafica `C`/`F`, numero `999999`, codice cliente
  Integra, valuta EUR, riferimento = numero ordine, ordinamento a passi di 5, codice
  articolo, quantità, prezzo, `SI` in reperisci prezzo; date `gg/mm/aaaa`.
- *Esporta di nuovo* (ordine già esportato): rigenera i file senza nuovi impegni.
  *Annulla esportazione*: l'ordine torna da esportare e gli impegni aperti si
  rilasciano; se Integra lo ha già registrato va annullato anche lì.

### 7.19 Articoli (`/articoli`) — sola lettura

Dati di Integra (§4.5) con l'ora dell'ultima sincronizzazione. Ricerca per codice,
descrizione o EAN; filtro per UM; segmenti *Tutti · Con alias · Kit · Esauriti*.
Colonne codice, descrizione (con *alias → nuovo*, *sostituisce …*, *kit · componenti*),
EAN, UM, disponibile. Il clic apre le giacenze dell'articolo. Gli articoli nuovi si
creano in Integra.

### 7.20 Giacenze (`/giacenze`, `/giacenze/:codice`) — sola lettura

- Riquadri-filtro: *Esauriti* (disponibile 0), *Negativi* (esportato più del disponibile),
  *Con impegni aperti*. La voce della barra conta i negativi.
- Elenco: articolo e descrizione, giacenza di Integra, impegnato, disponibile.
- Articolo scelto: giacenza in Integra − impegnato dal CRM = disponibile, e i movimenti
  del CRM (data, ordine con collegamento, quantità, stato *Impegnato* · *Registrato in
  Integra* · *Rilasciato*).

### 7.21 Alias e kit (`/alias-kit/alias`, `/alias-kit/kit/:codice`) — modifica solo amministratore

Due **schede** nella stessa pagina (*Codici vecchio → nuovo · Kit*), ognuna con il suo
indirizzo. Negli alias: ricerca per codice, descrizione o EAN e segmenti *Tutti · Chiedono
conferma · Codice non in Integra*.

- **Alias**: codice vecchio e nuovo con pallino e disponibile, descrizione ed EAN,
  *Chiede conferma* (casella modificabile in tabella), *Modifica*, *Elimina* (con
  conferma). Nuovo/modifica: codice vecchio, codice nuovo (campo di ricerca sugli
  articoli, compila descrizione ed EAN), conferma. Controlli: entrambi i codici, diversi,
  un solo alias per codice vecchio, **nessuna catena** (il nuovo non può essere a sua
  volta un codice vecchio). Il codice nuovo non ancora in Integra è ammesso con avviso.
- **Kit**: elenco (kit, descrizione, componenti, disponibile, *Spento*) e scheda con
  *Spegni/Accendi*, *Aggiungi componente*, *Elimina*; componenti con pallino,
  descrizione, quantità per kit, disponibile, *Modifica*, *Togli*. Controlli: quantità
  > 0, un kit non contiene se stesso, nessun componente doppio, un solo kit per articolo.
- Permesso `magazzino` (§8.3); gli altri ruoli vedono senza modificare.

### 7.23 Il mio profilo (`/profilo`) - tutti

Pagina personale, si apre dal menu dell'utente (D-88).
- **Dati** in sola lettura: nome e cognome, nome utente, email, ruolo di Sistema, stato (anche
  *Password provvisoria*), ultimo accesso.
- **Aree che puoi aprire**: una riga per area con il livello; Gestione «secondo il ruolo». Li cambia
  chi amministra (§7.13).
- **Pagina di ingresso per area**: un menu per area (Provvigioni, Dati, Gestione) con le sole pagine
  a cui l'utente ha accesso (elenco chiuso, D-88) e *Salva le preferenze*. Senza scelta si apre la
  prima pagina dell'area (in Gestione la prima consentita); dopo l'accesso, senza `dopo`, si atterra
  sulla pagina di ingresso della prima area aperta.
- **Sicurezza**: *Cambia la password* (§3.3) e la nota sulle sessioni.
- Il server valida area, percorso e permesso e li salva in `utenti.ingressi`; `GET /api/accesso/io`
  restituisce solo quelli ancora ammessi (`PUT /api/accesso/profilo`, evento `crud.update` su `utente`).
- Due colonne che si impilano sotto 1100 px (verificato a 1440 e 768); Guida in testata
  (argomento *Il mio profilo*).

## 8. API endpoint

### 8.1 Rotte nuove (CRM)

Le pagine (`/`, `/pratiche`, `/fornitori`, …, §7) sono servite da Next.js; le rotte `/api/*`
da NestJS, raggiunte tramite l'inoltro di Next (stessa origine, §3.4). Le pagine seguono le
rotte del prototipo (§7.10); le API tengono i nomi delle tabelle (es. `ordini-fornitore` =
pratiche).

| Metodo | Endpoint | Funzione |
|--------|----------|----------|
| GET | `/` | pagina Oggi |
| GET | `/fornitori` · `/fornitori/:id` | elenco / dettaglio fornitori |
| GET | `/api/pratiche` | elenco pratiche: `stato`, `q`, `fornitori`, `clienti`, `subagenti` (id separati da virgola), `dal`, `al`, `pagato` (`si`\|`no`, D-60), `ordina` (numero·cliente·fornitore·data·importo·stato·subagente), `dir`, `pagina` (da 0), `perPagina`; ogni riga ha anche `pagato`; risponde `{righe, totale, conteggi, totali: {importo}, pagina, pagine, per_pagina}` con stato, importi e variazioni calcolati dal motore (§7.2, V12) |
| GET | `/api/pratiche/cerca` | pratiche di un fornitore per il campo di ricerca (D-60, §7.3: lo *Sposta*): `fornitore_id`; risponde `[{id, numero, cliente, data, stato}]` con lo stato del motore (*attesa*, *confermata*, *fatturata*), dalla più recente; senza `fornitore_id` risponde `[]` (D-97: il campo di ricerca si apre vuoto prima di scegliere il fornitore, non è un errore); permesso `provvigioni.consulta` |
| GET | `/api/pratiche/:id` | dettaglio pratica (§7.3): testata con subagente alla data, `stato` e `nota`, `fasi` del binario (documento, data, importo, differenza o attesa; D-60: *Ordini* sommati, *Conferma* o *Proforma* se ci sono, *Conferma* `assente` se la pratica è fatturata senza), `pagato` e `pagamenti: [{id, numero, data, importo}]` (D-60, nessun effetto sui numeri), `incassi: [{documento_id, numero, data, importo, stato: {stato, dal, bollettino_id, manuale, giorni, limite, solleciti, sollecitata_il, nota}}]` (stato d'incasso di ogni fattura dal motore, §5.14), righe a confronto dal motore con `variazioni: {numero, totale}`, `provvigione` (percentuali alla data, quota del subagente per documento con le regole di D-27, maturato/fatturato) e `azione` proposta; tutto calcolato dal server (V12); 404 se la pratica non c'è |
| POST | `/api/fornitori` | crea fornitore |
| PUT | `/api/fornitori/:id` | aggiorna fornitore |
| GET | `/api/fornitori/:id/percentuali` | versioni dalla più recente, con `in_vigore` e `modificabile` (dopo l'ultima chiusura: *Correggi* ed *Elimina* compaiono solo lì, il server ricontrolla a ogni scrittura, D-51) |
| POST | `/api/fornitori/:id/percentuali` | nuova versione delle percentuali da una data dopo l'ultima chiusura: `{valido_dal, scaglioni: [{sconto_min, pct_agente, pct_subagente}]}`; data già usata 400, nel periodo chiuso 409 (§5.11, D-25, D-51) |
| PUT · DELETE | `/api/fornitori/:id/percentuali/:valido_dal` | corregge (`{scaglioni}`, la data sta nella rotta; sostituisce le righe) · elimina (non l'unica) una versione dopo l'ultima chiusura; altrimenti 409; 409 anche se un'eccezione valida resterebbe senza la sua soglia (D-51) |
| GET | `/api/eccezioni?subagente_id=&fornitore_id=` | eccezioni con `{id, subagente_id, subagente, fornitore_id, fornitore, sconto_min, pct_personale, pct_standard, valido_dal, valido_al, modificabile}` (almeno un filtro) |
| POST | `/api/eccezioni` | nuova eccezione `{subagente_id, fornitore_id, sconto_min, pct_personale, valido_dal}` (§5.2, D-26, D-51) |
| POST | `/api/eccezioni/:id/cambia` | `{pct_personale, dal}`: la riga vecchia prende `valido_al = dal` (escluso) e si apre la nuova da `dal`; risponde `{chiusa, nuova}` |
| POST | `/api/eccezioni/:id/termina` | `{al}`: primo giorno in cui non vale più (escluso) |
| PUT · DELETE | `/api/eccezioni/:id` | corregge `{pct_personale, valido_dal?}` · elimina, solo se tutto il periodo è dopo l'ultima chiusura (409) |
| GET | `/api/fornitori-lista` | *(non fatta)*: l'elenco dei fornitori attivi si legge con `GET /api/fornitori`; il dropdown del prototipo non ha una rotta sua |
| GET | `/api/integra/cerca?tipo=fornitore\|cliente&q=` | righe delle viste di Integra non ancora in anagrafica, **massimo 10**: per codice del ruolo, P.IVA o ragione sociale; `dati.importa`; solo su richiesta esplicita (D-111, §4.7.1) |
| POST | `/api/integra/importa` | `{tipo, id_integra}`: soggetto + ruolo + `codici_esterni` + versione in una transazione; idempotente (`{gia_presente, id}`); evento `crud.create` su `cliente`/`fornitore`; `dati.importa` (D-111) |
| POST | `/api/integra/prova` | prova la connessione al database ponte con i valori **salvati** (§7.15), `sistema.impostazioni`: `200 {ok, ms, testo}`, una prova fallita è `ok: false` con il motivo |
| POST | `/api/integra/sincronizza` | sincronizzazione immediata delle viste (§4.5), `sistema.impostazioni`: `200` con l'esito del giro (la stessa che gira ogni N secondi) |
| GET | `/api/interscambio/storico?fornitore_id=&cliente_id=&codice=` | righe di `interscambio_storico` per proporre subagente, sconto e lo stato «non rappresentato»; `dati.consulta` (D-112) |
| GET | `/subagenti` · `/subagenti/:id` · `/api/subagenti` | subagenti con clienti seguiti ed eccezioni |
| GET | `/api/agenti` · `/api/agenti/:id` | agenti di Integra (`dati.consulta`): elenco con il numero di subagenti · scheda con i suoi subagenti (§4.7) |
| POST | `/api/subagenti` · PUT `/api/subagenti/:id` · DELETE `/api/subagenti/:id` | CRUD subagente |
| GET | `/clienti` · `/clienti/:id` | clienti (sola lettura) con le agenzie; `dati.consulta` |
| GET | `/api/clienti/:id/pratiche` | pratiche del cliente per la scheda *Pratiche* (§7.6), `dati.consulta` |
| GET | `/api/clienti/:id/agenzie` | agenzie del cliente (`interscambio`) con subagente e fornitore, `dati.consulta` |
| POST | `/api/clienti/:id/agenzie` | nuova agenzia `{fornitore_id, subagente_id, valido_dal, codice_cliente_fornitore?, sconto?, pct_subagente?, regola_mensile?, valido_al?, storico_id?}`: `dati.modifica` (percentuale e regola mensile solo al responsabile, D-50), fornitore bloccato `FOR UPDATE` in una transazione; 400 per date o campi obbligatori, 404 fornitore o subagente inesistente, 409 se l'agenzia vale in un periodo chiuso (D-114) o se la riga dello storico è già usata (D-112) |
| PUT · DELETE | `/api/clienti/:id/agenzie/:aid` | modifica (codice, subagente, sconto, percentuale, regola, date) · elimina l'agenzia: `dati.modifica`, percentuale e regola solo al responsabile (D-50), 409 se cade nel periodo chiuso (D-114) |
| PUT · DELETE | `/api/documenti-fiscali/:id/correzione` | correzione della quota del subagente `{tipo, valore, motivo}` · la toglie (§4.2.7.2, D-27; permesso `provvigioni.modifica`, trimestre aperto). `tipo` = `pct` (0–100) · `importo` (positivo, max 9.999.999.999,99) · `nessuna` (salva `valore = 0`); `motivo` obbligatorio, non vuoto (max 2000); una correzione per documento (upsert). 404 documento inesistente; 400 non fiscale (solo `fattura` e `nota_credito` danno provvigioni) o valori non validi; 409 se il documento è in una liquidazione chiusa (`liquidazione_id` valorizzato) — si modifica solo finché il trimestre di liquidazione è aperto. Una transazione (blocco fornitore → riga del documento, lettura, scrittura, evento, V13); PUT risponde `{documento_id, tipo, valore, motivo, creato_da, creato_il}`, DELETE 204; evento `crud.create`/`crud.update`/`crud.delete` su `correzione` (§15.2.3) |
| GET | `/api/integra/stato` | *(non fatta)*: lo stato della sincronizzazione sta in Stato del sistema (§7.14) e in `GET /api/sistema` |
| GET | `/pratiche` · `/pratiche/:id` | elenco / dettaglio pratiche |
| POST · PUT · DELETE | `/api/ordini-fornitore(/:id)` · `/api/ordini-fornitore/:id/righe(/:rid)` · `/api/ordini-fornitore/:id/upload` | *(non fatte)*: la creazione e la modifica della pratica passano da `/api/documenti/:id/abbina` e `/api/pratiche/:id/documenti`; le righe si leggono dal documento; il caricamento è `POST /api/documenti/carica` |
| GET | `/api/pratiche/:id/documenti` | documenti della pratica: `{pratica: {id, numero, stato, importo}, altri: [{id, tipo, numero, data, importo, arrivo_id, file_nome, note}] (ordini, conferme, proforma, pagamenti, altri; D-60), documenti: [{id, tipo, numero, data, importo, storno_totale, fattura_id, stornato?, residuo?, arrivo_id, file_nome, stato_incasso, liquidato, note}], totali: {fatture, note_credito, netto}}`; importo negativo per la nota di credito; `stornato` e `residuo` solo sulle fatture; netto dal motore (§5.3) |
| GET | `/api/pratiche/:id/documenti/:did/confronto?rif=` | confronto fra due documenti della pratica (A5-02, D-78, §7.3), `provvigioni.consulta`: righe dello stesso codice sommate (D-60) e allineate, con `delta` e `differenza`; con una nota di credito solo le righe stornate e differenza = importo stornato; risponde `{righe: [{codice, descrizione, a, b, varia, delta}], differenza}` |
| POST · PUT · DELETE | `/api/pratiche/:id/documenti(/:did)` | registra `{tipo, numero, data, importo?, storno_totale?, fattura_id?, arrivo_id?, note?}` (D-60: `tipo` uno dei sette di §4.2.7.1; numero e data obbligatori per ordine, fattura e nota di credito, per gli altri facoltativi: numero vuoto, data di oggi; ordine con numero unico per fornitore, 409) · corregge `{numero?, data?, importo?, storno_totale?, note?}` · annulla (204). Importo digitato positivo; nota di credito con `fattura_id` di una fattura della pratica, non oltre il residuo (400), storno totale calcolato dal server; numero già usato dal fornitore 409 (ammesso su un'altra pratica solo con la stessa data, multi-ordine; il PUT di numero o data li cambia su tutte le copie); `arrivo_id` solo di un file `in_coda` o `da_controllare` (409), poi il file va nella cartella della pratica (§6.5); l'unico ordine della pratica non si annulla (409); liquidato, fattura con note che la stornano, correzione del subagente o riga di bollettino 409 (con il bollettino il PUT può cambiare solo le note; `note: null` la svuota); la nota con storno totale segue l'importo della fattura; l'annullamento rimette il file in coda. POST e PUT rispondono come il GET; stato e importo della pratica con `aggiornaPratica` (D-52, D-54) |
| POST | `/api/pratiche/:id/documenti/:did/sposta` | `{pratica_id}`: sposta il documento (con righe e file) in un'altra pratica dello **stesso fornitore** (correzione, D-60), `provvigioni.modifica`; 400 stessa pratica o altro fornitore, 404 pratica inesistente; 409 se liquidato, in un bollettino, legato a una nota di credito, unico ordine della pratica o numero già nella pratica di arrivo; blocchi fornitore → pratiche per id → file; evento `documento.move`, stato di tutte e due le pratiche con `aggiornaPratica`; risponde come il GET della pratica di arrivo |
| POST | `/api/documenti/:id/abbina` | abbinamento a mano di un file in coda (D-60, §7.9), `provvigioni.modifica`: `{tipo, pratica_id?, numero?, data?, importo?, note?, fattura_id?, storno_totale?, cliente_id?, fornitore_id?}`; la persona sceglie tipo e pratica anche contro i suggerimenti della lettura. Con `pratica_id` il documento va in quella pratica (stesse regole della registrazione a mano, fattura e nota di credito comprese); senza, solo un `ordine` con `cliente_id` e `fornitore_id` **apre una pratica** con numero `OF/AAAA/NNN` dal server (400 per gli altri tipi). File solo `in_coda` o `da_controllare` (409). Una transazione (pratica, documento, file, eventi `crud.create` della pratica, `documento.create`, `documento.match`), poi il file va nella cartella della pratica; risponde `{documento_id, pratica, altri, documenti, totali}` come il GET della pratica |
| GET | `/api/bollettini?al=AAAA-MM&fornitori=1,2&vista=tutti\|dafare` | matrice (F3-A1, §7.7), `provvigioni.consulta`: `{da, al, primo, ultimo, colonne: [AAAA-MM], fornitori: [{id, fornitore, maturazione, celle: [{mese, stato: atteso\|ritardo\|arrivato\|verificato\|contestato\|in_corso\|nessuno, bollettino_id?, importo?, entro?}]}], conteggi: {tutti, dafare}}`; 6 mesi che finiscono in `al`, iniziale il mese in corso; stato e totale riconosciuto in SQL (D-52), conteggi dei segmenti sui fornitori filtrati (D-23) |
| POST | `/api/bollettini` | crea `{fornitore_id, anno, mese, arrivo_id?}` (F3-A1, §15.2.5): `provvigioni.modifica`; blocca il fornitore (D-51), 409 se il bollettino di quel mese c'è già, 404 fornitore o documento inesistente, 409 documento scartato o già legato; crea `da_verificare` con la versione corrente del fornitore, lega `arrivo_id` e scrive `crud.create` nella stessa transazione (V13); risponde `{id}` |
| PUT | `/api/bollettini/:id` | aggiorna note |
| GET | `/api/bollettini/:id` | dettaglio (F3-A2, §7.7), `provvigioni.consulta`: `{id, fornitore_id, fornitore, maturazione, mese, anno, stato, badge: da_verificare\|pronto\|verificato\|contestato, ricevuto, chiuso_il, chiuso_da, note, file: {arrivo_id, nome}?, modificabile, righe: [{id?, documento_id?, numero, data, tipo, pratica_id, cliente_id, cliente, categoria, gruppo: da_decidere\|decise\|quadrano\|incassi, loro: {imponibile, pct, importo}?, noi: {…}?, differenza, aperta, incasso, pagamento, giorni, pagata_in: {id, mese, anno}?, decisione: {esito, motivo, da, da_nome, il}?, scelte}], totali: {riconosciuto, calcolato, differenza, aperte, contestate}, azione: {tipo: decidi\|contesta\|verifica\|chiuso, testo}}`; riconciliazione dal motore (`riconcilia`), caricando solo il bollettino, le pratiche che tocca e gli altri bollettini del fornitore (`caricaDatiBollettino`) |
| GET | `/api/bollettini/:id/contestazione` | testo della contestazione (F3-A2b, §7.7), `provvigioni.consulta`: `{oggetto, testo}` composto dal server con le righe e i mancanti **contestati** (numero, cliente, data, voi riconoscete / noi calcoliamo con importi e %, differenza, motivo) e il totale della differenza contestata; apertura e chiusura cortesi, intestazione con fornitore e mese; 409 `Nessuna riga contestata` se non ce ne sono |
| PUT | `/api/bollettini/:id/righe/:rid/decisione` · `/api/bollettini/:id/documenti/:did/decisione` | decisione `{decisione: accettato\|contestato\|attendere\|null, motivo?}` su una riga del fornitore che non quadra (`righe/:rid`) o su un documento del mese assente dal bollettino (`documenti/:did`, salvata in `bollettini_attese`, D-49, D-56); scelte per categoria: differenza e sconosciuta *accettato · contestato*, mancante *attendere · contestato* (400 se un'altra); motivo obbligatorio per contestare (400); riga che quadra o d'incasso 409; `null` annulla. `provvigioni.modifica`; risponde come il GET |
| PUT | `/api/bollettini/:id/righe/:rid/documento` | abbina a mano la riga a un documento fiscale `{documento_id}` dello stesso fornitore (400 se di un altro); 409 se il documento è già su un'altra riga dello stesso tipo in un bollettino (per id, o per numero se quella riga non è abbinata); toglie la decisione della riga e le attese del documento nuovo e di quello vecchio, che torna mancante e da decidere (D-34, D-56). `provvigioni.modifica`; risponde come il GET |
| PUT | `/api/bollettini/:id/stato` | chiusura `{stato: verificato\|contestato, note?}` (§6.2): 409 con righe da decidere, `verificato` con righe contestate o `contestato` senza; congela `pct_calcolata`/`importo_calcolato` e abbina le righe al documento per id; toglie le attese su documenti che non mancano più; scrive `chiuso_il`/`chiuso_da`; blocca prima il fornitore poi il bollettino (D-51); da qui il mese è periodo chiuso. Ogni scrittura su un bollettino chiuso: 409. Nessuna riapertura. `provvigioni.modifica`; risponde come il GET |
| POST | `/api/bollettini/:id/righe` | aggiunge riga (calcolo atteso + differenza) |
| DELETE | `/api/bollettini/:id/righe/:rid` | elimina riga |
| GET | `/api/liquidazioni?anno=&trimestre=` | liquidazione del trimestre (F4-A1, §7.8), `provvigioni.consulta`; senza parametri il trimestre di oggi: `{anno, trimestre, stato: {chiave: chiusa\|futura\|in_corso\|da_liquidare, etichetta, avanzamento}, trimestri: [{trimestre, nome, da, a, chiave, etichetta, avanzamento, totale}], subagenti: [{id, nome, attivo, documenti, liquidabili, imponibile, provvigione, in_attesa, storni}], documenti: [{documento_id, numero, tipo, data, origine, pratica_id, cliente_id, cliente, codice_cliente, fornitore_id, fornitore, subagente_id, subagente, imponibile, pct, provvigione, liquidabile, incasso, voce, motivo, motivo_testo, bollettino_id, stato: {etichetta, variante}}], senza_documenti, riepilogo: {documenti, liquidabili, imponibile, provvigione, in_attesa, bloccanti, storni}?, chiusura: {possibile, motivo}, chiusa_il, chiusa_da}`; trimestre aperto dal motore (`righeLiquidazione`, `fotografiaLiquidazione`), chiuso dalla fotografia salvata in `liquidazioni.totali` (non si ricalcola, righe comprese); nomi risolti e `stato.etichetta`/`motivo_testo` composti dal server (V12); `totale` = provvigione liquidabile, null per i trimestri futuri; solo i subagenti con documenti (gli altri in `senza_documenti`) |
| GET | `/api/liquidazione/report?anno=&trimestre=&subagente=` | report subagenti della liquidazione (F4-A4, §7.8), `provvigioni.consulta`; senza parametri il trimestre di oggi; 400 fuori range, 404 se il subagente non esiste. Senza `subagente`: `{anno, trimestre, precedente: {anno, trimestre}, subagenti: [{id, nome, clienti, documenti, fatturato, prese, pagate, margine, quota, delta}]}` ordinati per provvigione decrescente (`quota` = provvigione su prese in %, `delta` = variazione % sul trimestre prima, `null` se zero). Con `subagente`: `{anno, trimestre, precedente, subagente: {id, nome}, numeri: {fatturato, prese, pagate, margine, clienti, documenti, delta: {fatturato, pagate, margine}, pct: {margine_su_prese}}, trimestri: [{trimestre, pagate, margine, attivo}], primi_clienti: [{nome, fatturato, provvigione}]}`; `trimestri` = 1..4 dell'anno già iniziati (`attivo` sul trimestre scelto), `primi_clienti` = primi 5 per fatturato; zeri se il subagente non ha documenti. Numeri dal motore (`analisiTrimestre`) per il trimestre e per quello prima (provvigione e margine), calcolati dal server (V12) |
| POST | `/api/liquidazioni/:anno/:trimestre/chiudi` | chiusura del trimestre (§7.8), `provvigioni.chiudi` (responsabile): 409 se già chiuso (anche su `UNIQUE(anno, trimestre)`), non finito, con il trimestre prima ancora aperto (`Chiudi prima il …`, se ci sono liquidazioni o documenti prima) o con documenti in attesa dei bollettini (`bloccanti`); blocca tutti i fornitori in ordine di id (D-51, D-57), ricalcola dal database, salva la fotografia, lega documenti (`ordini_fornitore_documenti.liquidazione_id`) e voci di storno e riaccredito (`bollettini_righe.liquidazione_id`), evento §15.2.6, tutto in una transazione (V13); da qui il trimestre è periodo chiuso (`ultimaChiusura`). Nessuna riapertura. Risponde come il GET |
| GET | `/api/liquidazione/export?anno=&trimestre=&contenuto=completa\|subagente\|riepilogo&subagente=&formato=xlsx\|pdf\|csv` | esportazione della liquidazione (F4-A3, §11), `provvigioni.esporta`: Excel con *Riepilogo* e un foglio per subagente (o solo quello scelto, o solo il riepilogo), CSV dei documenti o del riepilogo, PDF convertito dal medesimo `.xlsx` con LibreOffice (`SOFFICE`); stessi numeri della pagina, `Content-Disposition` con `Liquidazione_<anno>_T<n>_<contenuto>` e evento `export.export` (§15.2.6); 400 per contenuto o subagente non validi e per un trimestre non iniziato |
| GET | `/api/analisi?dal=AAAA-MM&al=AAAA-MM&fornitori=&subagenti=&clienti=&raggruppa=subagente\|fornitore\|cliente\|mese\|documento` | pagina Analisi (F4-A5, §7.22), `provvigioni.consulta`; senza `dal`/`al` gli ultimi 12 mesi con dati (clampati fra il primo documento e il mese in corso): `{periodo: {da, a, primo, ultimo, mesi}, precedente: {da, a}, confronto: {possibile, etichetta}, filtri_attivi, voci: {fornitori, subagenti, clienti} (le voci proposte dai campi, con gli altri filtri attivi, D-23), numeri: {fatturato, prese, pagate, margine, documenti, clienti, precedente, variazione (percento arrotondato o null), pct}, grafici: {andamento: {mesi, serie}, fornitori: {etichette, chiavi, valori}, subagenti: {etichette, chiavi, serie}, clienti: {etichette, chiavi, valori}}, tabella: {raggruppa, totale (documenti del periodo), righe: [{chiave, nome, documenti, clienti, fatturato, prese, pagate, margine, quota}] o, per `documento`, [{chiave, numero, tipo, data, pratica_id, nome, fornitore, subagente, importi}]}}`; tutto calcolato dal motore (`fattiAnalisi`), D-19; 400 per mese non valido o `dal` dopo `al` |
| GET | `/api/analisi/esporta?formato=xlsx\|pdf\|csv&dal&al&fornitori&subagenti&clienti` | file dell'Analisi (§11, §7.22), `provvigioni.esporta`: Excel con *Riepilogo*, *Per subagente*, *Per fornitore*, *Per cliente*, *Per mese* (totali `SUM`), *Documenti*; PDF convertito dal medesimo `.xlsx` con LibreOffice (F4-A3); CSV dei soli documenti (`;`, virgola decimale, UTF-8 con BOM); stessi filtri e stessi numeri della pagina; nome `Analisi_<dal>_<al>[_filtrata].<est>` |
| GET | `/api/eventi/flusso` | canale degli aggiornamenti (§16.4.2, D-23), `@Sse`, `collegato`: eventi `{aree: [pratiche, documenti, bollettini, liquidazioni, anagrafiche, utenti, impostazioni]}` quando il registro cresce; un giro ogni ~4 s **solo mentre qualcuno è collegato**, parte dall'ultimo id (nessun evento vecchio), righe dello stesso giro unite; battito `{battito: true}` ogni ~25 s; le aree dai codici del registro e, per `crud.*` e `stato.change_state`, dalla colonna `entita` |
| GET | `/api/documenti?stato=&q=&tipo=&livello=&pagina=&per_pagina=` | elenco della pagina Documenti (F6-A4a, §7.9), `provvigioni.consulta`: `stato` fra `da_controllare` (iniziale), `in_coda`, `in_lettura`, `errore`; `q` cerca in numero, file, fornitore e cliente (`%` e `_` sono lettere); `tipo` fra gli otto ammessi; `livello` fra `affidabile`, `da_controllare`, `bassa`; `per_pagina` dalle Impostazioni, al massimo 200. Risponde `{documenti: [{id, file_nome, file_tipo: pdf\|jpg\|png, tipo, numero, data, fornitore_id, fornitore, codice_cliente, cliente, importo, livello, ricevuto_il, letto_il, controlli_n}], conteggi: {da_controllare, in_coda, in_lettura, errore}, totale, pagina, per_pagina}`; numero, data, importo, codice cliente e cliente da `documenti_campi` con `COALESCE(valore_finale, valore_letto)` (una query per pagina, niente N+1), `controlli_n` = controlli falliti, `conteggi` sugli altri filtri (D-23); ordine `ricevuto_il` decrescente; niente proposta (costosa) |
| POST | `/api/documenti/carica` | caricamento manuale, multipart campo `file`, un PDF o una foto JPEG/PNG per richiesta (D-60) → coda `in_coda`; risponde `{id, file_nome, stato, ricevuto_il}`; 415 se non è un PDF né una foto (dai primi byte), con un messaggio a parte per gli Excel (rifiutati, D-60) e i `.msg`, 413 oltre `DOCUMENTI_MAX_MB`, 409 se lo stesso file è già arrivato (impronta), salvo se era scartato: torna in coda sulla stessa riga; permesso `provvigioni.modifica` (§6.5, D-54) |
| GET | `/api/documenti/:id` | dettaglio del documento (F6-A4a, §7.9), `provvigioni.consulta`: `{id, file_nome, file_tipo, stato, tipo, livello, ricevuto_il, letto_il, errore, fornitore: {id, nome} \| null, campi: [{campo, valore_letto, valore_finale, affidabilita, posizione, precisione, verificato}], testata: {tipo, numero, data, fornitore_id, codice_cliente, cliente, importo, mese, anno, riferimento_fattura}, righe: [{i, codice, descrizione, quantita, prezzo, importo, numero_fattura, data_fattura, provvigione}], soglie: {soglia_ok, soglia_bassa}, controlli, proposta, bollettino: {esiste} \| null}`; testata e righe dai **valori finali** (con `i` = indice della riga), `campi` grezzi per i bordi di affidabilità, `soglie` = quelle in vigore (D-151, V12: il browser non ha soglie fisse), `proposta` da `propostaDocumento` con i candidati e l'abbinamento (`cliente_id` stringa), `bollettino.esiste` solo per il bollettino; 404 se non c'è |
| GET | `/api/documenti/:id/file` | file originale: percorso **solo** da `documenti_in_arrivo.file_percorso` (D-60), dentro `DOCUMENTI_DIR`, `application/pdf`, `image/jpeg` o `image/png` dall'estensione salvata, in linea con `nosniff` e `Content-Security-Policy: sandbox`; 404 se il file manca |
| GET | `/api/documenti/cerca?fornitore_id=&q=&mese=AAAA-MM&limite=` | documenti per l'abbinamento a mano (F3-A2b, §7.7), `provvigioni.consulta`: fatture e note di credito del fornitore **di ogni periodo**, cercate per numero o cliente (`q`, `%` e `_` valgono come lettere); prima i documenti del mese del bollettino (`mese`), poi gli altri dal più recente; `limite` 1–50 (20 se assente); risponde `[{id, numero, data, tipo, cliente, pratica_id, pratica, importo, su_riga: {bollettino_id, mese, anno} \| null}]`, `su_riga` valorizzato se il documento è già su una riga di un bollettino |
| GET | `/api/pagamenti/solleciti` | fatture da sollecitare al cliente (F3-A3, §5.14), `provvigioni.consulta`: `{voci: [{pratica_id, pratica, documento_id, numero, data, cliente_id, cliente, fornitore, importo, stato: {stato, dal, bollettino_id, manuale, giorni, limite, solleciti, sollecitata_il, nota}}], per_cliente: [{cliente_id, cliente, fatture: [numero], totale, testo}]}`; solo *insoluta* (fatturato) e *incassi da verificare* (maturato oltre `giorni_incasso`), dalla più vecchia; `testo` composto dal server (V12, come la contestazione D-58) |
| PUT | `/api/documenti/:id/incasso` | segna a mano una fattura come pagata o non pagata (segnalazione del fornitore, §5.14), `provvigioni.modifica`: `{stato: insoluta\|pagata, nota?}`; solo fatture (400); scrive `stato_incasso`/`fonte_incasso=manuale`/`insoluta_dal`/`pagata_il` e `nota_incasso` (D-62: `note`, la nota del documento, non si tocca); evento `stato.change_state` sul documento (§15.2.5) |
| POST | `/api/pagamenti/solleciti` | il testo del sollecito per un cliente è stato copiato (§5.14), `provvigioni.modifica`: `{cliente_id}`; sulle sue fatture da sollecitare `solleciti +1` e `sollecitata_il=oggi`; evento `documento.export` (§15.2.5); 404 se non ha fatture da sollecitare |
| GET | `/api/oggi` | pagina Oggi (F5-A1, §7.1), `provvigioni.consulta`: `{oggi, aggiornato_il, sottotitolo, riquadri: [{id: conferme\|documenti\|bollettini\|pagamenti, etichetta, valore, variante, dettagli: [{testo}], disponibile?}], gruppi: [{id, titolo, variante, tipo, conta, disponibile, sommario?, vuoto?, voci: [{tipo, titolo, dettaglio, href, azione, extra?}]}], scadenze: [{data, testo, dettaglio, href, giorni}], operazioni: [{testo, quando, chi}], registro_href, errori_oggi?: {conteggio, href} (solo con `sistema.registro`, §15.6), trimestre: {anno, trimestre, nome, etichetta, avanzamento, giorni, atteso, riconosciuto, da_liquidare, bloccato, href}}`; conferme, pagamenti, bollettini e trimestre dal motore (`confermeInRitardo`, `pagamentiDaSollecitare`, `analisiTrimestre`, `liquidazione`), bollettini degli ultimi 12 mesi e del mese in corso in SQL (A4-02, D-03, D-144); il gruppo *Documenti da decidere* è acceso dall'ingresso documenti (F6, D-95): voci con il documento, il fornitore e il livello, collegate a `/documenti/:id`; testi e numeri composti dal server (V12) |
| GET | `/api/solleciti/conferme` | solleciti di conferma (F5-A1, §5.12), `provvigioni.consulta`: `{totale, per_fornitore: [{fornitore_id, fornitore, pratiche, testo, voci: [{id, numero, data, cliente, codice, importo, attesa, giorni}]}]}`; un testo per fornitore con numero, data, cliente, codice cliente del fornitore, importo e data attesa; la copia non scrive eventi (§15.2.3 non ha un codice per i solleciti di conferma) |
| GET | `/api/solleciti/bollettini?fornitore_id=&anno=&mese=` | sollecito del bollettino di un mese (D-96, §7.7), `provvigioni.consulta`: `{fornitore_id, fornitore, anno, mese, documenti, numeri, testo}`; il testo elenca i documenti del mese con data, cliente e importo, composto dal server (V12) |
| POST | `/api/solleciti/bollettini` | il testo del sollecito è stato copiato (D-96), `provvigioni.modifica`: `{fornitore_id, anno, mese}`; ricalcola il testo sul database e scrive `export.sollecito` con `etichetta` («Fornitore · mese anno») e `pratiche` = numeri dei documenti; 204 |
| PUT | `/api/documenti/:id` | correzione dei dati letti (F6-A4a, §6.5 punto 7, D-72), `provvigioni.modifica`: `{testata: {tipo, numero, data, fornitore_id, codice_cliente, cliente, importo, mese, anno, riferimento_fattura}, righe: [{i, codice, descrizione, quantita, prezzo, importo, numero_fattura, data_fattura, provvigione}]}`; `i` = riga originale (conserva valore letto, affidabilità e posizione), `null` = riga aggiunta; le righe si salvano nell'ordine ricevuto e si rinumerano da 0. Solo se lo stato è `da_controllare` (409), 404 se non c'è, 400 per tipo, fornitore o date non validi (il messaggio dice il campo, mai il valore); un valore vuoto toglie il campo. Una transazione con la riga `FOR UPDATE` (V13): aggiorna `tipo` e fornitore, riscrive i campi (tutti quelli inviati `verificato = true`, le righe nuove nascono verificate), ricalcola livello e controlli dai valori finali, evento `documento/update` con `campi_corretti` (campi cambiati più righe nuove) e `livello_prima`/`livello_dopo`; risponde come il GET |
| POST | `/api/documenti/:id/scarta` | scarto (F6-A4a, §7.9, D-72), `provvigioni.modifica`: `{motivo: Doppione\|Non riguarda Decobrands\|Documento illeggibile\|Altro, nota?}` (max 2000). Solo da `da_controllare`, `errore` o `in_coda` (409 se abbinato, scartato o in lettura), 404 se non c'è; scrive `stato = scartato`, `scartato_il`, `scartato_da`, `motivo_scarto`, `nota_scarto`; il file resta sul disco (conservazione F5-A7); evento `documento/update` con `{etichetta, documento_id, stato: scartato, motivo, nota}` (il catalogo §15.2.4 non ha un codice per lo scarto); 204 |
| GET | `/registro` | registro di eventi e anomalie (admin) |
| GET | `/api/sistema` | Stato del sistema (F5-A5, §7.14), `sistema.stato`: `{servizi: [{id, nome, stato: ok\|attenzione\|errore, nota, indirizzo, ultima, ritmo, problemi}], problemi: [{id, quando, livello, servizio, codice, testo, cosa_fare, chiave, volte, visto, stato, risolta_il}], esecuzioni: [{quando, servizio, esito, testo, misure, raggruppate?}], conteggi: {da_vedere, tutti}}`; `?vista=da_vedere\|tutti` (iniziale `da_vedere`), `?servizio=casella\|lettura\|integra\|posta` per problemi ed esecuzioni, `?limite=` 1–200 (50); stato e nota calcolati dal database (§7.14.2), `cosa_fare` dal catalogo (§7.14.3), i controlli riusciti consecutivi raggruppati («N controlli riusciti dalle HH:MM»); conteggi dei segmenti sugli altri filtri (D-23) |
| GET | `/api/sistema/contatore` | contatore della barra (F5-A5, §7.14), `sistema.stato`: `{problemi, errore}` = anomalie dei servizi aperte e non viste, e se ce n'è una in `errore`; letto a ogni cambio pagina |
| POST | `/api/sistema/problemi/:id/visto` | *Segna come visto* (F5-A5, §7.14.4), `sistema.stato`: scrive `visto_il`/`visto_da` e l'evento `stato/change_state` su `sistema` con `{problemi: [id]}` (§15.2.7), in una transazione; 404 se non è un'anomalia di un servizio; 204, già visto = nessun evento |
| POST | `/api/sistema/problemi/visti` | *Segna tutti come visti* (F5-A5, §7.14.4), `sistema.stato`: tutte le anomalie dei servizi aperte e non viste, un solo evento con l'elenco; 204 |
| POST | `/api/sistema/controlla` | *Controlla adesso* (F5-A5, §7.14.5), `sistema.stato`: esegue il giro della casella e i quattro controlli (prove di §7.14.1) e risponde entro **30 secondi** con `{fatto, attesa_ms}` (le parti lente finiscono dopo); `avviato_da` = l'utente nelle righe `controllo` |
| GET | `/api/scartati` | documenti scartati (F5-A7, §7.16), `provvigioni.scartati`: `{scartati: [{id, scartato_il, da, tipo, numero, cliente, fornitore, fornitore_id, file_nome, motivo, nota, elimina_il}], conteggi: {tutti, per_motivo: [{motivo, n}]}, giorni, totale, pagina, pagine, per_pagina}`; `?motivo=Doppione\|Non riguarda Decobrands\|Documento illeggibile\|Altro`, `?q=` (numero, file, fornitore, cliente), `?ordina=scartato_il\|documento\|motivo\|da`, `?dir=`, `?pagina=` (da 1), `?per_pagina=` (massimo 200, iniziale dalle Impostazioni); `elimina_il` = `scartato_il` + `conservazione.scartati_giorni`; conteggi dei segmenti sugli altri filtri (D-23) |
| POST | `/api/scartati/:id/recupera` | recupero di uno scartato (F5-A7, §7.16), `provvigioni.scartati`: torna `da_controllare` con `tentativi = 0`, `errore = null` e i campi di scarto vuoti; 409 se non è scartato, 404 se non c'è; evento `documento/update` con `{stato: da_controllare}`; 204 |
| DELETE | `/api/scartati/:id` | eliminazione definitiva di uno scartato (F5-A7, §7.16), `provvigioni.elimina` e **ruolo amministratore** (o superutente): elimina la riga (i campi in cascata) e, dopo il commit, il file; 409 se non è scartato, 404 se non c'è; evento `documento/update` con `{eliminato: true}` (§15.2.4 non ha un codice per l'eliminazione di uno scartato, D-74); 204 |
| GET | `/api/registro` | registro di eventi e anomalie (F5-A2, §7.11, §15.6), `sistema.registro`, sola lettura: filtri `genere`, `livello`, `tipo`, `azione`, `codice`, `servizio`, `entita`, `esito`, `utente`, `dal`/`al`, `q` (messaggio ed etichetta del dettaglio), `stato`, `operazione_id`, `vista` (`tutto\|aperte\|errori`), `ordina`/`dir`, `pagina`/`perPagina` (righe per pagina dalle Impostazioni, iniziale 25). Risposta `{righe, totale, pagina, pagine, per_pagina, conteggi: {tutto, aperte, errori}, voci: {codici, tipi, servizi, entita, esiti}}`; ogni riga ha i campi del registro, l'`etichetta` del dettaglio e il `riferimento` risolto dal server (`pratica` → `/pratiche/:id`, `documento` → la sua pratica, `bollettino` → `/bollettini/:id`, `liquidazione` → `/liquidazioni/:anno/:trimestre`, `utente` → `/utenti/:id`, altrimenti null); ordine predefinito `ts` decrescente; conteggi dei segmenti sugli altri filtri (D-23) |
| GET | `/api/registro/:id` | dettaglio evento (F5-A2, §15.6), `sistema.registro`: tutti i campi (sessione, IP, chiave, ultimo, chiusa e visto compresi) e il `dettaglio` JSON; 404 se non esiste |
| GET | `/api/registro/export` | export CSV del registro filtrato (F5-A2, §15.6), `sistema.registro`: stessi filtri dell'elenco, colonne fisse, `;`, UTF-8 con BOM, date `gg/mm/aaaa hh:mm`; nessun evento (§15.2.6 non ha il codice) |
| GET | `/api/impostazioni` | le sei sezioni (F5-A6, §7.15), `sistema.impostazioni`: `{sezioni: [{chiave, titolo, sotto, campi: [{nome, etichetta, tipo (testo\|numero\|email\|password), aiuto, largo, min, max, step, valore, impostata?}]}], ambiente: [{nome, uso, sezioni, obbligatorio, impostato, valore}]}` in ordine fisso; i segreti come `{valore: null, impostata}`, mai il valore cifrato; `ambiente` sono i parametri del `.env` del server (D-70), in sola lettura, con `valore` null per i segreti |
| PUT | `/api/impostazioni/:chiave` | salva la sezione `{valori: {campo: valore}}` (F5-A6, §7.15), `sistema.impostazioni`: validazione sul server (numeri interi nei limiti (soglie con due decimali), email, testi obbligatori, campi sconosciuti 400; chiave sconosciuta 404); password vuota o assente = resta quella di prima; in una transazione (V13) upsert + evento `crud/update` su `impostazione` con `prima`/`dopo` dei soli campi cambiati e le password `impostata`/`non impostata`/`sostituita`; risponde la sezione pubblica |
| POST | `/api/impostazioni/:chiave/prova` | prova i valori salvati (F5-A6, §7.15), `sistema.impostazioni`: `{ok, ms, testo}`; casella (imapflow), posta (nodemailer `verify()`), lettura (`GET /models`, timeout 10 s), integra (pool in sola lettura); una prova fallita è `200 {ok:false}` con il motivo; `azienda`/`conservazione` 400; nessun evento (§15.1) |

### 8.2 Vendita diretta (§7.18–§7.21) — **ampliamento futuro (§17), non in questa fase**

| Metodo | Rotta | Descrizione |
|--------|-------|-------------|
| GET | `/api/ordini-cliente` · `/api/ordini-cliente/:id` | elenco (filtro esportati) / scheda con righe e disponibile |
| POST | `/api/ordini-cliente/:id/proposte` | proposte alias e kit (casi A/B/C) calcolate sul disponibile del momento |
| POST | `/api/ordini-cliente/:id/esporta` | `{tipi: ['OC','OF'], alias: [...], kit: [...]}` → controlli, file xlsx (zip se più di uno), impegni, esportazione (`modifica`) |
| POST | `/api/ordini-cliente/:id/annulla-esportazione` | rilascia gli impegni aperti (`modifica`) |
| GET | `/api/articoli` · `/api/giacenze` · `/api/giacenze/:codice` | sola lettura, con disponibile e impegni |
| GET · POST · PUT · DELETE | `/api/alias` · `/api/alias/:id` | alias (`magazzino` per le scritture) |
| GET · POST · PUT · DELETE | `/api/kit` · `/api/kit/:codice` · `/api/kit/:codice/componenti/:i` | kit e componenti (`magazzino` per le scritture) |

Il resto della Gestione Ordini (ingresso degli ordini cliente, errori di lettura) resta
nella fase successiva (§17).

### 8.3 Autenticazione

| Metodo | Rotta | Descrizione |
|---|---|---|
| POST | `/api/accesso/entra` | `{utente, password, resta}` (`utente` = nome utente o email); "Credenziali non valide" uguale per ogni errore |
| POST | `/api/accesso/esci` | chiude la sessione |
| POST | `/api/accesso/password` | cambio password `{attuale, nuova}`; obbligatorio con la password provvisoria; chiude le altre sessioni |
| POST | `/api/accesso/dimenticata` | `{email}` → link monouso di 1 ora; risposta sempre uguale |
| POST | `/api/accesso/reimposta` | `{codice, nuova}` dal link; chiude tutte le sessioni dell'utente |
| GET | `/api/utenti` · `/api/utenti/:id` | elenco e scheda (`gestione`); mai l'hash della password |
| GET | `/api/utenti/ruoli` | tabella *Cosa può fare ogni ruolo*: `[{id, testo, ruoli}]` dalla stessa tabella `PERMESSI` del guard, così non si disallinea (`gestione`) |
| POST | `/api/utenti` | `{username, nome, email, ruolo}` → utente con password provvisoria per email (`gestione`; `amministratore` solo dal superutente) |
| PUT | `/api/utenti/:id` | stessi campi; `ruolo` facoltativo (chi modifica i propri dati non lo manda); nel registro solo i campi cambiati |
| POST | `/api/utenti/:id/attivo` | `{attivo}`: disattivare chiude subito le sessioni dell'utente |
| DELETE | `/api/utenti/:id` | 409 se l'utente ha toccato importi (correzioni, liquidazioni, bollettini chiusi): si disattiva |
| POST | `/api/utenti/:id/password` | nuova password provvisoria per email; la vecchia, le sessioni e i link di reimpostazione non valgono più (`gestione`; un amministratore solo per operatori e sola lettura); restituisce l'utente con `ultimo_invio`, così l'interfaccia dice se l'email è partita |

Regole sul server (§7.13): mai su sé stessi stato, eliminazione e reimpostazione; mai sull'utente
dei servizi e sul superutente (che modifica solo i propri dati); gli amministratori li gestisce il
superutente; "deve restare almeno un amministratore attivo" con le righe bloccate
(`SELECT … FOR UPDATE`, V13): due tolte insieme non passano entrambe; nome utente o email doppi →
409 con il campo giusto.

Con la password provvisoria (`deve_cambiare_password`) ogni rotta risponde 403 `cambia_password`,
tranne `io`, `password` ed `esci`. Nessun accesso con Microsoft 365 (D-39). Guard `requireAuth` su tutte le
rotte; ogni rotta dichiara il **permesso** richiesto, verificato lato server
(`@Richiede('modifica')` ecc.), non solo nascondendo i pulsanti.

**Sessione e utente corrente (D-38):**
- `GET /api/accesso/io` → `{id, username, nome, email, ruolo, permessi: [...], cambia_password, csrf}` dell'utente della
  sessione, oppure 401. Il frontend lo legge all'avvio e a ogni cambio pagina: costruisce
  barra, fascia "Profilo in sola lettura" e "Pagina riservata". I permessi vengono dal
  server (tabella dei ruoli qui sotto), il frontend non li calcola.
- La sessione contiene **solo `utente_id`**: ruolo e stato `attivo` si rileggono dal
  database a ogni richiesta, così un cambio di ruolo o una disattivazione valgono
  subito, senza aspettare un nuovo accesso.
- All'accesso la sessione si **rigenera** (nuovo identificativo),
  si aggiorna `ultimo_accesso` e si scrive `auth/login`; *Esci* distrugge la sessione e
  cancella la riga in `sessioni` (`auth/logout`).
- Senza sessione il frontend porta a `/accesso` e, dopo l'accesso, torna alla pagina
  chiesta (solo percorsi interni: niente indirizzi esterni nel ritorno).

*Perché (D-38):* senza un "chi sono" il frontend dovrebbe indovinare il ruolo; con il
ruolo copiato nella sessione un utente declassato o disattivato terrebbe i vecchi
permessi fino all'uscita; senza rigenerare l'identificativo all'accesso la sessione
si può fissare in anticipo (session fixation).

**Ruoli e aree (D-45).** Il portale (D-43) è diviso in **Sistema**, che è di tutto il portale, e
**aree** di lavoro: oggi **Provvigioni** e **Dati** (prima *Anagrafiche*, D-47), domani **Vendite** (spenta, §17) e
altre. Ogni utente ha:

- un **ruolo di Sistema** (`utenti.ruolo`): `superutente` (uno solo) · `amministratore` ·
  `utente`;
- per ogni area, **un livello** (`utenti_aree`, §4.2.18): `lettura` · `operatore` ·
  `responsabile`, oppure nessuno (l'area non si vede). Anche il superutente e gli amministratori
  entrano in un'area solo se hanno un livello lì: gestire il portale non vuol dire lavorare
  nelle aree.

I livelli sono in ordine: chi è `responsabile` può tutto quello che può l'`operatore`, che può
tutto quello che può `lettura`. I permessi si chiamano `area.attività`:

| Area | Permesso | Attività | Serve |
|---|---|---|---|
| Sistema | `sistema.utenti` | Utenti (non amministratori): creare, modificare, livelli nelle aree, disattivare | amministratore |
| Sistema | `sistema.amministratori` | Amministratori: creare, modificare, disattivare | superutente |
| Sistema | `sistema.impostazioni` | Impostazioni del portale (azienda, lettura, conservazione) | amministratore |
| Sistema | `sistema.connessioni` | Connessioni (casella, posta, Integra) nelle Impostazioni: modificarle e provarle | solo superutente |
| Sistema | `sistema.stato` | Stato del sistema, segnare i problemi come visti | amministratore, oppure operatore in un'area |
| Sistema | `sistema.registro` | Registro di eventi e anomalie: consultare ed esportare | amministratore |
| Dati | `dati.consulta` | Consultare fornitori, clienti, subagenti | lettura |
| Dati | `dati.modifica` | Subagenti, agenzie dei clienti (interscambio), esclusi percentuale e regola mensile del subagente | operatore |
| Dati | `dati.condizioni` | Condizioni, scaglioni e percentuali dei fornitori; eccezioni personali; percentuale e regola mensile del subagente nell'agenzia | responsabile |

*Perché (D-50):* percentuale e regola mensile dell'agenzia (`pct_subagente`, `regola_mensile`)
cambiano i soldi del subagente come le eccezioni personali; un operatore non deve poter
mettere 100 %.
| Provvigioni | `provvigioni.consulta` | Consultare pratiche, documenti, bollettini, liquidazioni, analisi | lettura |
| Provvigioni | `provvigioni.esporta` | Esportare liquidazioni e analisi (Excel, PDF, CSV) | lettura |
| Provvigioni | `provvigioni.modifica` | Caricare, correggere e abbinare documenti; verificare bollettini; preparare solleciti | operatore |
| Provvigioni | `provvigioni.scartati` | Vedere e recuperare i documenti scartati | operatore |
| Provvigioni | `provvigioni.chiudi` | Chiudere la liquidazione del trimestre | responsabile |
| Provvigioni | `provvigioni.elimina` | Eliminare definitivamente i documenti scartati | responsabile |
| Vendite (§17) | `vendite.magazzino` | Alias e kit: creare, modificare, eliminare | responsabile |

- Il **registro** ha un permesso suo, `sistema.registro` (amministratore e superutente): non si
  riusa `sistema.utenti`, che resta degli utenti (Ugo, 06/11/2026).

- Il server calcola i permessi da ruolo di Sistema e livelli (`permessiDi`) e li rilegge a ogni
  richiesta (D-38); `GET /api/accesso/io` dà `ruolo`, `aree` e `permessi`. Ogni rotta dichiara
  il suo permesso (`@Richiede('provvigioni.chiudi')`); le rotte di chi è solo collegato (io,
  esci, cambio password) dichiarano `@Collegato()`.
- Barra (D-47, §7.10): un'area compare se l'utente può aprirne almeno una voce; le voci di
  un'area con il suo `*.consulta`; *Carica documenti* (nell'area Provvigioni) con
  `provvigioni.modifica`; Gestione con i permessi di Sistema.
- Scheda *Permessi* (§7.13): una sezione per area (righe = attività, colonne = livelli),
  evidenziato il livello dell'utente scelto; per Sistema le colonne sono i ruoli di Sistema.
- Chi gestisce chi (§7.13): l'amministratore crea e modifica gli utenti e i loro livelli in
  tutte le aree, anche `responsabile`; gli amministratori li crea e modifica il superutente;
  nessuno cambia il proprio ruolo né i propri livelli, tranne il superutente (è uno solo e
  altrimenti non potrebbe darsene).
- **Nessuno dà più di quello che ha** (Ugo, 30/10/2026): in ogni area si concede al massimo il
  proprio livello e non si danno aree che non si hanno; al massimo si crea una copia di sé. Chi ha
  in un'area un livello più alto del mio non lo gestisco (né modifica, né disattivazione, né
  reimpostazione della password): lo gestisce il superutente, che è l'unico senza questo limite
  (è uno solo e altrimenti non potrebbe dare niente). Lo controlla il server (`nonPiuDiMe`); la
  finestra spegne i livelli sopra il proprio. *Perché:* senza questo limite un amministratore
  potrebbe creare un utente più "potente" di sé e usarlo.
- **Aspetto** (§7.13): nella finestra utente ogni area ha una riga con i livelli a segmenti
  (*Nessuno · Lettura · Operatore · Responsabile*, radio veri, quelli sopra il proprio spenti);
  nella scheda *Dati dell'utente* l'elenco *Accesso alle aree* (area → livello); la scheda
  **Permessi** ha una sezione richiudibile per Sistema e per ogni area, con il ruolo o livello
  dell'utente nel titolo, aperte quelle dove ha accesso. *Perché:* le aree cresceranno; righe e
  sezioni richiudibili si allungano senza diventare una tabella illeggibile.
- `PUT /api/utenti/:id` con `aree`: si mandano solo le aree da cambiare (`null` toglie l'area);
  quelle non mandate restano, così una pagina che non mostra un'area (Vendite spenta) non la
  cancella.
- Il superutente creato dal comando d'installazione non ha livelli: gestisce il portale. Chi
  c'era prima della D-45 ha ricevuto con la migrazione livelli pari a quello che poteva fare
  (amministratore e superutente: responsabile in Dati e Provvigioni). Dopo l'accesso, chi
  non ha Provvigioni va alla prima pagina che può aprire.

*Perché (D-45):* il CRM è il primo pezzo di un portale (D-43): con un solo ruolo per tutto, chi
lavora sulle provvigioni vedrebbe domani anche le aree che non lo riguardano (vendite,
amministrazione). Tre livelli per area separano il lavoro quotidiano (operatore) dalle azioni
definitive o che cambiano i soldi (responsabile: chiudere il trimestre, condizioni dei fornitori,
eliminare per sempre). Rifarlo adesso tocca solo la gestione degli utenti; dopo, ogni pagina.

**Sola lettura** nell'interfaccia (pagine di un'area dove l'utente ha livello `lettura`):
fascia "Profilo in sola lettura: puoi consultare ed esportare, non modificare"; caricamento nascosto; pulsanti che modificano spenti
(restano attivi solo quelli consentiti: esporta, guida, navigazione); le pagine non
permesse mostrano "Pagina riservata" e non compaiono nella barra. Il gruppo **Gestione**
della barra è richiudibile, aperto solo nelle sue pagine, con il contatore dei problemi.

*Perché:* i pulsanti spenti (opacità e `pointer-events: none` nel CSS) si spengono anche per la
tastiera e per il lettore di schermo: il guscio blocca il clic in cattura sugli stessi selettori
del CSS e mette `aria-disabled="true"`, anche sugli elementi che compaiono dopo (finestre, righe
di tabella) con un `MutationObserver` (WCAG 4.1.2). Se il server non risponde al primo caricamento
(`/api/accesso/io` con 500/502 o rete caduta) non c'è schermo bianco: pagina scura come l'accesso,
con il messaggio e *Riprova*.

---

## 9. Stati della pratica

| Stato | Transizione | Condizioni |
|-------|-------------|------------|
| `inviato` | creazione pratica | il primo ordine apre la pratica; gli altri ordini si sommano |
| `confermato` | aggancio di una conferma **o** di una proforma | la conferma può variare quantità/importi (§5.8) |
| `fatturato` | aggancio di una fattura, **anche senza conferma né proforma** | entra nel calcolo provvigioni |

*Perché (D-60):* conferma e proforma sono facoltative: la regola più semplice è che la pratica
avanza con il primo documento che arriva dopo l'ordine. Il ritardo della conferma (*scaduta*)
resta come oggi, finché non arriva conferma, proforma o fattura. Il **pagamento** del cliente non
è uno stato: è un segno a parte (`pagato` nel dettaglio e nell'elenco), senza effetto sui numeri.

Al passaggio a `fatturato` la pratica diventa eleggibile per la liquidazione (§10) e per
il confronto del bollettino (§6.2).

Lo stato **non si scrive a mano**: lo ricava il motore dai documenti (`fasePratica`, §5.1) e
lo salva `aggiornaPratica(tx, id)`. **Regola per F2-A3, F6 e ogni scrittura futura (D-52,
V13):** chi crea, modifica, sposta o toglie documenti, righe o conferme di una pratica chiama
`aggiornaPratica` **nella stessa transazione**, dopo le scritture; la funzione blocca la
testata (`FOR UPDATE`), quindi due modifiche insieme non si perdono. In ritardo (*scaduta*)
non si salva: dipende da oggi e dai giorni del fornitore, lo calcola la query (§7.2).
*Perché:* l'elenco legge lo stato in SQL (D-52); una scrittura che dimentica
`aggiornaPratica` lascia la pratica con lo stato vecchio.

---

## 10. Calcolo delle provvigioni — formulario

La provvigione si calcola **per documento fiscale** (fattura o nota di credito) della
pratica, mai sull'ordine o sulla conferma (§5.8): la base è l'imponibile del documento e la
somma dei documenti è il netto della pratica (§4.2.7.1, §5.3).

```
Per ogni documento d della pratica (fattura > 0, nota di credito < 0):
  versione  = scaglioni del fornitore con valido_dal ≤ d.data, la più recente (§5.11)
  scaglione = quello con la soglia sconto_min più alta ≤ sconto del cliente (interscambio.sconto)
  pct_agente, pct_subagente dello scaglione
    (pct_personale da provvigioni_eccezioni del subagente per fornitore × sconto_min dello scaglione, valida alla data, §5.2, D-51)

  provv_agente(d)    = d.importo × pct_agente / 100
  provv_subagente(d) = regole del subagente (§5.2, D-27), nell'ordine:
                       correzione sul documento → una fattura al mese → % dell'agenzia
                       → eccezione → d.importo × pct_subagente / 100
  atteso dal fornitore(d) = provv_agente(d) + provv_subagente(d)

Pratica: provvigione = Σ sui documenti; nota di credito totale → la fattura stornata va a 0
pct_agente = 0 e pct_subagente = 0 → nessuna provvigione
Pratica senza fatture → nessuna provvigione maturata (il Riepilogo può mostrare l'attesa
sull'importo dell'ordine, solo come stima)
```

Il motore gira **solo lato server** (servizio NestJS): l'interfaccia mostra i valori
calcolati, non li ricalcola. Per i mesi con bollettino verificato valgono i valori congelati
(§5.11).

**Perché**: la provvigione la riconosce il fornitore sul fatturato; calcolarla sull'ordine
sbaglierebbe conferme ridotte, fatture in più tranche e note di credito. Il calcolo per
documento con la percentuale alla sua data tiene insieme percentuali datate (D-25),
liquidazione e Analisi (D-19).

*Perché (motore):* gli indici sui documenti e sulle righe dei bollettini si costruiscono una
volta in `componi` e le funzioni li riusano; nessuna funzione riscorre tutte le pratiche o tutti
i bollettini per ogni documento. Con tanti documenti il costo era quadratico (documenti × righe
di bollettino) e il `$transaction` della chiusura rischiava il tempo limite. Se `pratiche` o
`bollettini` vengono sostituiti, gli indici si rigenerano al primo uso.

---

## 11. Esportazione liquidazione

L'esportazione è sempre **di un trimestre**. Dalla pagina Liquidazioni, pulsante
*Esporta*, si sceglie il **contenuto** e il **formato**.

**Formato**

| Formato | Cosa contiene | Come si genera nell'app |
|---|---|---|
| **Excel** (.xlsx, predefinito) | fogli impaginati come descritto sotto, totali con formule | `exceljs` lato server |
| **PDF** | **derivato esatto dell'Excel**: stesso contenuto e stessa impaginazione stampata (A4 orizzontale, una sezione per foglio, piè di pagina, collegamenti dal riepilogo ai subagenti) | conversione del **medesimo .xlsx** con LibreOffice senza interfaccia (`soffice --headless --convert-to pdf`; su Windows `soffice.com`, perché `soffice.exe` restituisce subito il controllo). Programma da `SOFFICE`, altrimenti `soffice.com` su Windows e `soffice` su Linux; nel prototipo è ricostruito con jsPDF + AutoTable con la stessa grafica |
| **CSV** | **solo dati**, senza totali né formattazione: separatore `;`, virgola decimale, UTF-8 con BOM, date `gg/mm/aaaa`. Contenuto *completo* o *un subagente*: una riga per documento con `Subagente` + gli 8 campi + `Stato` (liquidabile / in attesa del bollettino); *riepilogo*: una riga per subagente con le colonne del riepilogo | generato lato server |

Il nome del file è lo stesso nei tre formati, cambia l'estensione.

**Contenuto**

| Scelta | Contenuto del file | Nome file |
|---|---|---|
| **Tutto il trimestre, diviso per subagente** | foglio **Riepilogo** + **un foglio per subagente** con il dettaglio dei documenti e il suo totale | `Liquidazione_<anno>_T<n>_completa.<xlsx\|pdf\|csv>` |
| **Un solo subagente** (preselezionato se filtrato nella pagina) | il foglio di quel subagente: dettaglio + totale | `Liquidazione_<anno>_T<n>_<Nome_Cognome>.<estensione>` |
| **Solo il riepilogo** | il foglio **Riepilogo** | `Liquidazione_<anno>_T<n>_riepilogo.<estensione>` |

**Formule nei CSV.** Una cella che comincia con `=`, `+`, `@`, tab, a capo o `-` non seguito da
una cifra si scrive con un **apice davanti** (`'=...`): il numero del documento arriva dal file
caricato, e senza l'apice Excel e LibreOffice lo eseguirebbero come formula (*formula injection*).
I numeri negativi restano numeri. La stessa regola vale per il CSV dell'Analisi e del Registro
(D-80). *Perchè*: un file esportato è aperto da una persona, quindi un valore scritto da un
fornitore non deve poter eseguire comandi.

Compaiono solo i subagenti con documenti nel trimestre.

**Foglio Riepilogo** — una riga per subagente: subagente, **numero documenti**,
**imponibile**, **provvigione da liquidare** e, solo a trimestre aperto, **in attesa dei
bollettini**; riga **Totale** con formule `SUM`; nel file completo il nome del
subagente è un collegamento al suo foglio.

**Foglio del subagente** — i **documenti liquidabili** con gli 8 campi qui sotto, ordinati
per data; riga **Totale** (importo documento e provvigione, formule `SUM`); se ci sono
documenti **in attesa dei bollettini** (fornitori sul maturato, §5.5) seguono in una
sezione a parte, **non** compresi nel totale, con il motivo.

**Presentazione** (uguale in tutti i fogli): titolo, periodo, riga di contesto
(Decobrands SRL, stato del trimestre, data di generazione) con filetto blu; intestazione
della tabella su fondo azzurro chiaro, testo blu scuro; importi `#,##0.00 €` con
negativi in rosso e zero come trattino; date come date Excel (`gg/mm/aaaa`);
percentuale come `0,00%`; riga totale su fondo grigio chiaro con filetto; griglia
nascosta, intestazione bloccata e filtro automatico; stampa orizzontale A4 adattata in
larghezza, intestazione ripetuta e piè di pagina "Decobrands SRL · foglio · pagina n di
N". Nell'app il file si genera lato server con la stessa libreria (`exceljs`); nel
prototipo: `prototipo-alternativo/assets/esporta-liquidazione.js` (un unico modello dei
fogli alimenta i tre formati, così il contenuto coincide).

**Nell'app (F4-A3).** `GET /api/liquidazione/export?anno=&trimestre=&contenuto=completa|subagente|riepilogo&subagente=&formato=xlsx|pdf|csv`
(`provvigioni.esporta`): il server rilegge i dati con `liquidazione` (le stesse funzioni della
pagina, V12) e compone i fogli; Excel e CSV nascono dallo stesso modello, il PDF è quel
`.xlsx` convertito da LibreOffice. Il CSV ha `;`, virgola decimale, UTF-8 con BOM e date
`gg/mm/aaaa`. Ogni esportazione scrive l'evento `export.export` (§15.2.6). I grafici come
immagine nell'Excel restano fuori: servono un motore grafico sul server (D-61).

*Perché (D-63):* Excel, PDF e CSV nascono dallo **stesso modello dei fogli**, letto dal
database sul server: il PDF è la conversione del medesimo `.xlsx` con LibreOffice, non un
documento ricostruito a parte. Così i tre formati hanno gli stessi numeri della pagina
(V12) e un solo cambiamento al modello li aggiorna tutti; i grafici come immagine restano
fuori perché servirebbero un motore grafico sul server (D-61).

Campi del dettaglio (come richiesto da Matteo, punto 6):

1. Fornitore
2. Numero documento (fattura)
3. Data documento (fattura)
4. Codice cliente
5. Ragione sociale
6. Importo documento
7. Percentuale provvigione
8. Importo provvigionale

**Analisi (§7.22).** L'Analisi usa lo stesso modello dei fogli (fogli → blocchi) con tre
differenze: il *Riepilogo* ha i 4 numeri del periodo e del periodo precedente con la
variazione; un foglio per subagente, fornitore, cliente e mese con la *Quota del fatturato*
e i totali `SUM`; il foglio *Documenti* ha data, documento, fornitore, cliente, subagente e i
4 importi. Il CSV ha i soli documenti (`;`, virgola decimale, UTF-8 con BOM, date
`gg/mm/aaaa`), non i raggruppamenti. Nomi: `Analisi_<dal>_<al>[_filtrata].<est>`. Con
`formato=pdf` l'Analisi converte il medesimo `.xlsx` come la liquidazione (F4-A3). I grafici
come immagine nell'Excel restano fuori: servono un motore grafico sul server (D-61).

---

## 12. Dati di esempio (seed)

Anagrafiche di riferimento per il collaudo:

- **Fornitore**: Gries con scaglioni 0/1/5/10/100 % (§4.2.2).
- **Agente**: Decobrands SRL (unico attivo).
- **Subagenti**: Bastasin, Nista (es. eccezione Bastasin `3` sullo scaglione 1 %).
- **Interscambio**: cliente con codice cliente del fornitore + sconto (`sconto`).
- **Pratiche**: esempi negli stati `inviato`, `confermato`, `fatturato`; un ordine con
  **conferma ridotta** (7/10 articoli, righe `fase=conferma`) per validare §5.8; una
  pratica **fatturata in più tranche** e una con **nota di credito parziale**
  (documento `nota_credito`, importo negativo, §5.3/§5.9) per validare il confronto fasi
  e il netto documenti.
- **Eventi**: esempi di `registro` (eventi e alcune anomalie) coerenti con i dati sopra (login admin, creazione
  fornitore, modifica scaglione, cambio stato pratica, verifica bollettino, export
  liquidazione) + **un evento di tipo `errore`** per collaudare filtri e dettaglio
  della schermata `/registro` (§7.11, §15).

---

## 13. Casi limite e domande residue (backlog)

| # | Argomento | Nota |
|---|-----------|------|
| B1 | ~~Gestione UI delle `provvigioni_eccezioni`~~ | chiuso: le eccezioni si inseriscono dalla scheda del subagente (§7.5, D-26); resta da chiarire la regola "una fattura al mese" dei clienti con sconto fittizio (§5.2) |
| B2 | Riga bollettino con solo totale cliente | supportare riga aggregata (cliente + totale) nel confronto |
| B3 | ~~Versioning scaglioni per periodo~~ | chiuso: percentuali con data di validità (§4.2.2, §5.11, D-25) |
| B4 | Consolidamento sconto | `interscambio.sconto` è il solo campo (§5.7); lo sconto di default del fornitore è stato tolto (D-34) |
| B5 | ~~Upload documenti~~ | chiuso: incluso nell'implementazione (multer, §3.4) |
| B6 | Dati storici / popolamento iniziale | capire se importare le prassi dagli Excel manuali |
| B7 | Casi cliente su più subagenti su fornitori diversi | risolti internamente da Marco |
| B8 | Incassi dei clienti (§5.14) | regole chiarite il 16 e 18/10/2026; nel prototipo; restano le domande di §5.14 (chi manda il sollecito, formato dei solleciti del fornitore, `giorni_incasso` per cliente, email del cliente) |
| B9 | Anagrafica unica a soggetti (master + ruoli) | **decisa la direzione (D-102)**: import da Integra + vecchio CRM con deduplica, poi il CRM è il centro di verità e si esporta un file verso Integra. Schema additivo in `specifica-anagrafica-soggetti.md` (non rompe le FK esistenti); restano da decidere conflitti di deduplica, regola dello sconto canonico e data di stacco |

---

## 14. Deliverable di riferimento

La specifica è accompagnata da un'implementazione navigabile in sola dimostrazione:
tutte le viste della sezione §7, dati dimostrativi (§12) e motore di calcolo (§10)
eseguito al volo nel browser.

| Area | Stato |
|------|-------|
| Viste principali (login, dashboard, anagrafiche, pratiche, bollettini, liquidazione) | ✅ |
| Motore provvigioni / differenze bollettini (§10) | ✅ |
| Export liquidazione (§11) | ✅ |
| Dati dimostrativi (§12) | ✅ |
| Tracciamento eventi applicativi (V10, §4.2.11, §15) | ⏳ |
| Frontend Next.js + backend NestJS (Prisma), database, autenticazione, upload, lavori pianificati (§3.3, §3.4, §8) — stack confermato: §16.3 | ⁄ in roadmap |
| Piano di lavoro a fasi e attività parallele (`piano-lavoro-crm.md`, §16) | ✅ |
| Casi limite §13 (B1–B7) | ⏳ |

---

## 15. Registro unico: eventi, anomalie ed errori

### 15.1 Principi

L'applicazione registra in **una sola tabella** (`registro`, §4.2.11, D-31) gli eventi
applicativi (operazioni CRUD, cambi di stato, upload/export di documenti, accesso) e le
**anomalie** (errori dell'app, problemi dei servizi, errori di lettura). Due funzioni del
livello dei servizi: `logEvent()` per gli eventi e `apriAnomalia()` per le anomalie
(§7.14.4). Scopo: tracciabilità (chi/cosa/quando), storico di pratiche
e bollettini, diagnosi degli errori.

- **Scrittura automatica server-side**: ogni operazione di scrittura sulle tabelle
  CRM, ogni cambio di stato, ogni upload/export e ogni evento di autenticazione
  produce una riga in `registro`. La scrittura avviene nel **service layer**,
  mai fidandosi di ciò che dichiara il client.
- **Un solo posto**: un errore di lettura resta come stato del documento in
  `documenti_in_arrivo` (§4.2.12) e apre l'anomalia `lettura.fallita` con il
  `documento_id`; non c'è una seconda tabella degli errori.
- **Solo lettura per l'utente** (salvo *Segna come visto* sulle anomalie): gli eventi non si modificano e non si eliminano
  dall'interfaccia (nemmeno dagli admin). L'eventuale correzione di errori passa
  dalle normali operazioni di business, che generano nuovi eventi.
- **Una riga per operazione**: il catalogo §15.2 definisce **esattamente** quali
  eventi genera ogni operazione; l'implementazione non aggiunge né omette eventi
  "a scelta". Le **GET di sola lettura** (elenchi, dettagli, calcoli eseguiti al
  volo) **non** generano eventi.
- **Privacy**: nei log non si scrivono mai password né dati sensibili; per l'auth si
  registra solo l'esito (riuscito/fallito). L'**IP** solo per gli eventi `auth`
  e tentativi `negato`; l'identificativo della sessione **non si salva** (bastano utente e IP,
  D-85). Elenco completo delle esclusioni in §15.8.

### 15.2 Catalogo eventi (cosa si traccia)

La matrice collega **ogni operazione esposta dalle API (§8.1, §8.3) al relativo
evento** con i valori esatti di `tipo`, `azione`, `entita`, `esito` e i campi del
`dettaglio`. `entita_id` è l'id dell'entità coinvolta; il riferimento descrittivo va
sempre salvato nella chiave `etichetta` del dettaglio (§15.4).

#### 15.2.1 Autenticazione e accesso (§8.3)

| Operazione (API) | `tipo` | `azione` | `entita` | `esito` | `dettaglio` |
|------------------|--------|----------|----------|---------|-------------|
| Accesso riuscito | `auth` | `login` | `utente` | `successo` | `{etichetta, modo: password, sessione_id}` |
| Accesso rifiutato (credenziali sbagliate, utente disattivato) | `auth` | `login` | `utente` | `errore` | `{etichetta: nome utente o email tentati, modo: password, motivo: credenziali \| disattivato}` (`utente_id` solo se l'utente esiste; `ip` sempre; mai la password) |
| POST `/api/accesso/esci` | `auth` | `logout` | `utente` | `successo` | `{etichetta, sessione_id}` |
| POST `/api/accesso/password` (cambio) | `auth` | `password_change` | `utente` | `successo` · `errore` | `{etichetta, motivo?: attuale_errata \| troppo_corta \| uguale}` |
| POST `/api/accesso/dimenticata` | `auth` | `password_reset_requested` | `utente` | `successo` | `{etichetta: email}` (anche se l'email non è registrata: `utente_id` NULL) |
| POST `/api/accesso/reimposta` | `auth` | `password_reset` | `utente` | `successo` · `errore` | `{etichetta, motivo?: scaduto \| usato \| sconosciuto}` |
| Password provvisoria mandata (nuovo utente o *Reimposta la password*) | `auth` | `password_temp` | `utente` | `successo` | `{etichetta, tipo: benvenuto \| password}` |
| Richiesta una rotta senza il permesso (§3.3) | `auth` | `access_denied` | `utente` | `negato` | `{etichetta, rotta, metodo}` (`ip` valorizzato) |

#### 15.2.1.1 Utenti (§7.13, §8.3)

| Operazione (API) | `tipo` | `azione` | `entita` | `esito` | `dettaglio` |
|------------------|--------|----------|----------|---------|-------------|
| POST `/api/utenti` | `crud` | `create` | `utente` | `successo` | `{etichetta: username, nome, email, ruolo}` + evento `auth/password_temp` `{tipo: benvenuto}` |
| PUT `/api/utenti/:id` | `crud` | `update` | `utente` | `successo` | `{etichetta, prima, dopo}` con i soli campi cambiati |
| POST `/api/utenti/:id/attivo` | `stato` | `change_state` | `utente` | `successo` | `{etichetta, prima: {attivo}, dopo: {attivo}}` |
| DELETE `/api/utenti/:id` | `crud` | `delete` | `utente` | `successo` | `{etichetta, nome, email, ruolo}` |
| POST `/api/utenti/:id/password` | `auth` | `password_temp` | `utente` | `successo` | `{etichetta, tipo: password}` |

#### 15.2.2 Anagrafiche — fornitori, percentuali ed eccezioni (§8.1)

| Operazione (API) | `tipo` | `azione` | `entita` | `esito` | `dettaglio` |
|------------------|--------|----------|----------|---------|-------------|
| POST `/api/fornitori` | `crud` | `create` | `fornitore` | `successo` | `{etichetta: ragione_sociale, p_iva, giorni_attesa_conferma, giorno_bollettino, tipo_provvigione, attivo}` |
| PUT `/api/fornitori/:id` | `crud` | `update` | `fornitore` | `successo` | `{etichetta, prima: {…campi cambiati}, dopo: {…}}` |
| POST `/api/fornitori/:id/percentuali` | `crud` | `create` | `scaglione` | `successo` | `{etichetta: fornitore · dal valido_dal, fornitore_id, valido_dal, scaglioni: [{sconto_min, pct_agente, pct_subagente}]}` (un evento per versione, non per scaglione; `entita_id` = fornitore, D-51) |
| PUT `/api/fornitori/:id/percentuali/:valido_dal` | `crud` | `update` | `scaglione` | `successo` | `{etichetta, fornitore_id, valido_dal, prima: {scaglioni}, dopo: {scaglioni}}` (`entita_id` = fornitore) |
| DELETE `/api/fornitori/:id/percentuali/:valido_dal` | `crud` | `delete` | `scaglione` | `successo` | `{etichetta, fornitore_id, valido_dal, scaglioni}` (`entita_id` = fornitore) |
| POST `/api/eccezioni` | `crud` | `create` | `eccezione` | `successo` | `{etichetta: subagente · fornitore sconto, eccezione_id, fornitore_id, subagente_id, sconto_min, pct_personale, valido_dal, valido_al}` |
| POST `/api/eccezioni/:id/cambia` | `crud` | `update` + `create` | `eccezione` | `successo` | sulla riga chiusa `{etichetta, prima: {valido_al}, dopo: {valido_al}, nuova_id}`; sulla nuova come POST |
| POST `/api/eccezioni/:id/termina` | `crud` | `update` | `eccezione` | `successo` | `{etichetta, prima: {valido_al}, dopo: {valido_al}}` |
| PUT `/api/eccezioni/:id` | `crud` | `update` | `eccezione` | `successo` | `{etichetta, prima, dopo}` (campi cambiati: `pct_personale`, `valido_dal`) |
| DELETE `/api/eccezioni/:id` | `crud` | `delete` | `eccezione` | `successo` | come POST |

> Il fornitore **non si elimina** via API: si disattiva con `attivo=false`
> (evento `crud/update`).

#### 15.2.3 Anagrafiche — agenti, subagenti, interscambio (§8.1)

| Operazione (API) | `tipo` | `azione` | `entita` | `esito` | `dettaglio` |
|------------------|--------|----------|----------|---------|-------------|
| create/update/delete agente | `crud` | `create`/`update`/`delete` | `agente` | `successo` | create/delete: `{etichetta: cognome, nome}`; update: `{etichetta, prima, dopo}` |
| create/update/delete subagente | `crud` | `create`/`update`/`delete` | `subagente` | `successo` | come agente (create include `agente_id`) |
| POST `/api/interscambio` | `crud` | `create` | `interscambio` | `successo` | `{etichetta: ragione sociale cliente · fornitore, subagente_id, cliente_id, fornitore_id, codice_cliente_fornitore, sconto}` |
| PUT `/api/interscambio/:id` | `crud` | `update` | `interscambio` | `successo` | `{etichetta, prima, dopo}` (comprende `pct_subagente` e `regola_mensile`) |
| PUT `/api/documenti-fiscali/:id/correzione` | `crud` | `create` · `update` | `correzione` | `successo` | `{etichetta: numero · subagente, documento_id, prima, dopo: {tipo, valore, motivo}}` |
| DELETE `/api/documenti-fiscali/:id/correzione` | `crud` | `delete` | `correzione` | `successo` | `{etichetta, documento_id, tipo, valore, motivo}` |
| DELETE `/api/interscambio/:id` | `crud` | `delete` | `interscambio` | `successo` | `{etichetta, interscambio_id, subagente_id, cliente_id, fornitore_id, codice_cliente_fornitore, sconto}` |

#### 15.2.4 Pratiche ordine a fornitore (§8.1)

| Operazione (API) | `tipo` | `azione` | `entita` | `esito` | `dettaglio` |
|------------------|--------|----------|----------|---------|-------------|
| POST `/api/ordini-fornitore` | `crud` | `create` | `pratica` | `successo` | `{etichetta: numero_ordine, fornitore_id, cliente_id, ordine_cliente_id, agente_id, importo_merce, stato}` |
| PUT `/api/ordini-fornitore/:id` **senza** cambio stato | `crud` | `update` | `pratica` | `successo` | `{etichetta, prima, dopo}` (lo `stato` è **escluso** dal diff) |
| PUT `/api/ordini-fornitore/:id` **con** cambio stato | `stato` | `change_state` | `pratica` | `successo` | `{etichetta, prima: {stato}, dopo: {stato}, motivo: note}`; se il cambio salva le righe della nuova fase, anche `{da_fase, a_fase, n_righe, importo, scostamento_vs_fase_precedente}` |
| PUT con **entrambi** (cambio stato + altri campi) | `crud`+`stato` | `update`+`change_state` | `pratica` | `successo` | **due eventi separati**, come da righe precedenti |
| POST `/api/ordini-fornitore/:id/righe` | `crud` | `create` | `riga_pratica` | `successo` | `{etichetta: codice · descrizione, pratica_id, riga_numero, codice, descrizione, quantita, prezzo, importo}` |
| DELETE `/api/ordini-fornitore/:id/righe/:rid` | `crud` | `delete` | `riga_pratica` | `successo` | `{etichetta, riga_pratica_id, pratica_id, codice, descrizione}` |
| DELETE `/api/ordini-fornitore/:id` | `crud` | `delete` | `pratica` | `successo` | `{etichetta: numero_ordine, pratica_id, fornitore_id, cliente_id, importo_merce, stato}` |
| POST `/api/ordini-fornitore/:id/upload` (ordine/conferma/fattura) | `documento` | `upload` | `pratica` | `successo` | `{etichetta, pratica_id, fase, file_nome, dimensione}` |
| POST `/api/documenti/carica` (e casella email, F6-A1) | `documento` | `upload` | `documento` | `successo` | `{etichetta: file_nome, documento_id, file_nome, dimensione, origine}` |
| scrittura di un documento fiscale che cambia lo stato della pratica (`aggiornaPratica`, D-52) | `stato` | `change_state` | `pratica` | `successo` | `{etichetta: numero_ordine, prima: {stato}, dopo: {stato}, motivo}`, nella stessa transazione |
| POST `/api/documenti/:id/abbina` con un ordine che apre la pratica (D-60) | `crud` | `create` | `pratica` | `successo` | `{etichetta: numero_ordine, cliente_id, fornitore_id, ordine, data}`, nella stessa transazione dell'abbinamento |
| POST `/api/documenti/:id/abbina` (D-60) | `documento` | `match` | `documento` | `successo` | `{etichetta, documento_id, arrivo_id, pratica_id, tipo, pratica_nuova}`; insieme a `documento.create` del documento registrato |
| POST `/api/pratiche/:id/documenti/:did/sposta` (D-60) | `documento` | `move` | `documento` | `successo` | `{etichetta, documento_id, tipo, prima: {pratica_id}, dopo: {pratica_id, numero}}`; più `stato.change_state` delle due pratiche se cambia lo stato |
| lettura con esito negativo (GLM-OCR non riuscita dopo 3 tentativi, §6.5) | `documento` | `upload` | `documento` | `errore` | `{etichetta, documento_id, file_nome, tentativi, errore}` |
| correzione dati letti (§6.5 punto 7, D-72) | `documento` | `update` | `documento` | `successo` | `{etichetta, documento_id, campi_corretti, livello_prima, livello_dopo}`; tutti i campi inviati diventano `verificato` (corretti o confermati), le righe nuove nascono verificate e quelle tolte si eliminano; per lo schema del registro anche `pratica_id: null` e `prima`/`dopo` con i livelli |
| scarto del documento (§7.9, D-72) | `documento` | `update` | `documento` | `successo` | `{etichetta, documento_id, stato: 'scartato', motivo, nota}`; per lo schema del registro anche `pratica_id: null` e `prima`/`dopo` con lo stato |
| recupero di uno scartato (§7.16, F5-A7) | `documento` | `update` | `documento` | `successo` | `{etichetta, documento_id, stato: 'da_controllare', pratica_id: null, prima: {stato: 'scartato'}, dopo: {stato: 'da_controllare'}}`; il catalogo non ha un codice per il recupero |
| eliminazione definitiva di uno scartato (§7.16, F5-A7) | `documento` | `update` | `documento` | `successo` | `{etichetta, documento_id, eliminato: true, pratica_id: null, prima: {stato: 'scartato'}, dopo: {eliminato: true}}`; il catalogo non ha un codice per questa eliminazione (D-74); la pulizia automatica oltre i giorni non scrive eventi |
| abbinamento / nuova pratica / registrazione bollettino | `documento` | `change_state` | `documento` | `successo` | `{etichetta, documento_id, pratica_id \| bollettino_id}` |
| POST `/api/pratiche/:id/documenti` (fattura/nota di credito, §4.2.7.1) | `documento` | `create` | `documento` | `successo` | `{etichetta: numero · tipo, pratica_id, documento_id, tipo, numero, data, importo, storno_totale, fattura_id}` |
| PUT `/api/pratiche/:id/documenti/:did` | `documento` | `update` | `documento` | `successo` | `{etichetta, documento_id, pratica_id, prima, dopo}` |
| DELETE `/api/pratiche/:id/documenti/:did` | `documento` | `delete` | `documento` | `successo` | `{etichetta, documento_id, pratica_id, tipo, numero, importo}` |
| PUT che fa avanzare di fase le righe (ordine→conferma→fattura, §5.8) | `stato` | `change_state` | `pratica` | `successo` | **nessun evento in più**: la fotografia delle righe è parte del cambio di stato; il dettaglio dell'evento `stato/change_state` della riga sopra aggiunge `{da_fase, a_fase, n_righe, importo, scostamento_vs_fase_precedente}`. **Perché**: l'elenco delle azioni (§4.2.11) è chiuso e il catalogo vuole una riga per operazione |

#### 15.2.5 Bollettini e righe bollettino (§8.1)

| Operazione (API) | `tipo` | `azione` | `entita` | `esito` | `dettaglio` |
|------------------|--------|----------|----------|---------|-------------|
| POST `/api/bollettini` | `crud` | `create` | `bollettino` | `successo` | `{etichetta: mese/anno · fornitore, fornitore_id, mese, anno, file_nome}` |
| PUT `/api/bollettini/:id` (dati/note, **senza** cambio stato) | `crud` | `update` | `bollettino` | `successo` | `{etichetta, prima, dopo}` |
| PUT `/api/bollettini/:id/stato` (`da_verificare → verificato`/`contestato`) | `stato` | `change_state` | `bollettino` | `successo` | `{etichetta, prima: {stato}, dopo: {stato}, motivo: note}` |
| **Verifica** del bollettino (conferma importi, congelamento % e importi §5.11) | `calcolo` | `verify` | `bollettino` | `successo` | `{etichetta, bollettino_id, periodo: {mese, anno}, importo_riconosciuto, importo_calcolato, differenza_totale}` |
| POST `/api/bollettini/:id/righe` | `crud` | `create` | `riga_bollettino` | `successo` | `{etichetta: fattura_numero · ragione sociale cliente, bollettino_id, fattura_numero, fattura_data, cliente_id, importo_merce, pct_riconosciuta, importo_riconosciuto, pct_calcolata, importo_calcolato, differenza}` |
| DELETE `/api/bollettini/:id/righe/:rid` | `crud` | `delete` | `riga_bollettino` | `successo` | `{etichetta, riga_bollettino_id, bollettino_id, fattura_numero, importo_riconosciuto, importo_calcolato}` |
| **Correzione manuale** di un importo (§5.13) | `crud` | `update` | `riga_bollettino` | `successo` | `{etichetta, riga_bollettino_id, bollettino_id, prima, dopo}` |
| Decisione su una riga (PUT `…/righe/:rid/decisione`, D-49) | `crud` | `update` | `riga_bollettino` | `successo` | `{etichetta: numero · cliente, riga_bollettino_id, bollettino_id, prima: {decisione, motivo}, dopo: {decisione, motivo}}` |
| Decisione su un documento mancante (PUT `…/documenti/:did/decisione`, D-56) | `crud` | `update` | `bollettino` | `successo` | `{etichetta: mese/anno · fornitore · numero mancante, bollettino_id, documento_id, prima: {decisione, motivo}, dopo: {decisione, motivo}}` |
| Abbinamento a mano di una riga a un documento (PUT `…/documento`) | `crud` | `update` | `riga_bollettino` | `successo` | `{etichetta, riga_bollettino_id, bollettino_id, prima: {documento_id}, dopo: {documento_id}}` |

> La chiusura (`verificato` o `contestato`) genera **due eventi**: `calcolo/verify` (congelamento) +
> `stato/change_state`, nella stessa transazione.

**Incassi (§5.14)**

| Operazione | `tipo` | `azione` | `entita` | `esito` | `dettaglio` |
|------------|--------|----------|----------|---------|-------------|
| Verifica di un bollettino con storno, riaccredito o riconoscimento al pagamento | `stato` | `change_state` | `documento` | `successo` | `{etichetta: fattura, prima: {stato_incasso}, dopo: {stato_incasso}, bollettino_id, tipo_riga}` |
| *Segna come non pagata* / *Segna come pagata* (segnalazione del fornitore) | `stato` | `change_state` | `documento` | `successo` | `{etichetta, prima, dopo, fonte_incasso, nota}` |
| Sollecito di pagamento copiato o inviato al cliente | `documento` | `export` | `documento` | `successo` | `{etichetta: cliente, fatture: [numero], importo_totale, solleciti}` |

*Perché:* l'evento del sollecito riporta `fatture` come **elenco dei numeri** delle fatture
davvero sollecitate e `importo_totale` come la loro somma, calcolati **dopo** il blocco
(`FOR UPDATE`): una fattura segnata pagata in mezzo non entra nell'evento (C1).

#### 15.2.6 Liquidazione ed export (§8.1, §11)

| Operazione (API) | `tipo` | `azione` | `entita` | `esito` | `dettaglio` |
|------------------|--------|----------|----------|---------|-------------|
| GET `/api/liquidazione/export` | `export` | `export` | `liquidazione` | `successo` | `{etichetta: trimestre/anno, periodo: {anno, trimestre}, scelta: completa\|subagente\|riepilogo, formato: xlsx\|pdf\|csv, subagente?, n_righe, importo_totale}` |
| Sollecito di conferma copiato per un fornitore (§7.1) | `export` | `sollecito` | `fornitore` | `successo` | `{etichetta: fornitore, pratiche: [numero]}` |
| export con errori (dati/campi mancanti) | `export` | `export` | `liquidazione` | `errore` | `{etichetta, periodo, motivo}` |
| POST `/api/liquidazioni/:anno/:trimestre/chiudi` | `stato` | `change_state` | `liquidazione` | `successo` | `{etichetta: "3° trimestre 2026", periodo: {anno, trimestre}, prima: {stato: da_liquidare}, dopo: {stato: chiusa}, documenti, voci, subagenti, imponibile, provvigione}` |

> Il **rendiconto** §7.8 è calcolato al volo (GET = nessun evento); diventa un evento
> quando viene esportato o quando il trimestre si chiude.

#### 15.2.6.1 Vendita diretta (§8.2) — **ampliamento futuro (§17), non in questa fase**

| Operazione (API) | `tipo` | `azione` | `entita` | `esito` | `dettaglio` |
|------------------|--------|----------|----------|---------|-------------|
| POST `/esporta` | `export` | `export` | `ordine_cliente` | `successo` | `{etichetta: numero, tipi, file, n_righe, alias_applicati, kit_applicati, impegni_creati}` |
| POST `/annulla-esportazione` | `stato` | `change_state` | `ordine_cliente` | `successo` | `{etichetta, impegni_rilasciati}` |
| CRUD alias / kit / componenti | `crud` | `create`·`update`·`delete` | `alias` · `kit` | `successo` | `{etichetta, prima, dopo}` |
| Sincronizzazione che chiude impegni | `stato` | `change_state` | `ordine_cliente` | `successo` | `{etichetta, impegni_registrati}` (utente di sistema) |

#### 15.2.7 Errori di sistema

| Evento | `tipo` | `azione` | `entita` | `esito` | `dettaglio` |
|--------|--------|----------|----------|---------|-------------|
| Eccezione non gestita / errore 5xx (handler globale) | `errore` | `error` | `sistema` | `errore` | `{etichetta: metodo rotta, rotta, metodo, http_status, errore: {classe, messaggio}}`; `operazione_id` = il codice mostrato all'utente con l'errore |
| Errore di validazione 4xx (operazione rifiutata) | tipo dell'operazione tentata (es. `crud`) | azione dell'operazione | entità dell'operazione | `negato` | `{etichetta, errore: {campo, messaggio: 'valore non valido'}}`; `entita` = primo segmento del percorso (es. `fornitori`); solo per un utente entrato, con `contesto(req)` (utente e IP), mai il testo dell'eccezione (D-85) |
| Problema di livello `errore` di un servizio aperto o chiuso da solo (§7.14.4) | `errore` | `error` | `sistema` | `errore` (apertura) · `successo` (chiusura) | `{etichetta: testo, servizio, codice, chiave, volte}` |
| *Segna come visto* / *Segna tutti come visti* | `stato` | `change_state` | `sistema` | `successo` | `{etichetta, problemi: [id]}` |

**Pulizie e anomalie (F5-A5, D-74).** La **pulizia notturna** (scartati oltre i giorni, giri dei servizi oltre 90 giorni) non scrive eventi: è manutenzione, non un'operazione di una persona. L'apertura e la chiusura automatica di un'anomalia dei servizi (§7.14.4) non scrivono ancora l'evento `errore/error` della riga sopra: lo aggiungerà chi scrive le anomalie, in un lavoro a parte, per non averne due versioni.

*Perché:* il rifiuto di validazione 4xx si registra solo per un utente entrato, con l'esito
`negato` (livello attenzione, fuori dagli errori di oggi) e nel dettaglio solo il nome del campo e
il messaggio generico `valore non valido`, mai il testo dell'eccezione, che può contenere il valore
inviato (D-85, C1).

#### 15.2.8 Impostazioni (§8.1)

| Operazione (API) | `tipo` | `azione` | `entita` | `esito` | `dettaglio` |
|------------------|--------|----------|----------|---------|-------------|
| PUT `/api/impostazioni/:chiave` | `crud` | `update` | `impostazione` | `successo` | `{etichetta: titolo della sezione, chiave, prima, dopo}` con i soli campi cambiati e le password `impostata`/`non impostata`/`sostituita` (mai il valore, §15.4, §15.8); `entita_id` NULL |

> Le **GET** e le **prove di connessione** non scrivono eventi (§15.1). Un salvataggio
> senza campi cambiati non scrive alcun evento.

### 15.3 Regole di scrittura (transazionali)

- **Un solo helper** `logEvent(tx, {tipo, azione, entita, entita_id, esito, dettaglio}, contesto)`
  (e `apriAnomalia()` per le anomalie) nel service layer (`app/backend/src/registro.ts`): ogni endpoint che genera eventi lo chiama; nessuna scrittura
  diretta dal client. `tx` è la transazione dell'operazione (V13); `contesto` (`utente_id`, `sessione_id`, `ip`) viene dalla sessione e dalla richiesta sul server.
  Per gli eventi senza transazione (accesso, negati, errori) c'è `logEventSicuro()`, che non fa mai fallire l'operazione.
- **Stessa transazione**: la riga di `registro` viene scritta **nella stessa
  transazione** dell'operazione di business — se l'operazione fa rollback non resta
  alcun evento (coerenza). Eccezione: `auth` (login/logout) e gli eventi `negato`,
  che non hanno transazione di business e usano una scrittura diretta
  **best-effort**.
- **Il log non fallisce mai l'operazione**: se la scrittura di `registro` va in
  errore fuori dalla transazione di business, l'errore viene inviato al **log
  applicativo** (file/console) e l'operazione prosegue.
- **`utente_id`**: l'utente autenticato della sessione; NULL solo per eventi di
  sistema e login non riconosciuto. **`ts`**: impostato dal server/DB, mai dal
  client. **Append-only**: l'evento nasce già completo, senza UPDATE successive.

### 15.4 Formato del `dettaglio` (JSONB)

- **Uno schema per codice** (D-31): ogni `codice` del catalogo (§15.2, §7.14.3) ha uno
  schema in un solo file del server (`SCHEMI` in `registro.ts`: per ora le chiavi obbligatorie; i tipi con zod quando servirà); un codice che non c'è è un errore; `logEvent()` e `apriAnomalia()` rifiutano un
  `dettaglio` che non lo rispetta (errore nelle prove, anomalia `app.dettaglio_non_valido`
  in esercizio, la riga si scrive lo stesso). Così il JSON resta interrogabile, ad esempio
  `dettaglio->>'documento_id'`, e non diventa testo libero.
- **Sempre** la chiave `etichetta` (stringa descrittiva per la colonna
  "riferimento": numero ordine, fattura, ragione sociale…), leggibile senza aprire
  il dettaglio.
- **update** → `{prima: {…}, dopo: {…}}` con i **soli campi cambiati**, nomi uguali
  alle colonne; numeri in formato decimale semplice, date `YYYY-MM-DD`, ore in ISO
  8601 UTC, `null` se un campo passa a NULL. Lo stato **non** compare mai in un diff
  `crud/update`: è coperto dall'evento `stato` (catalogo §15.2).
- **create/delete** → i soli campi essenziali per la ricostruzione, come da
  catalogo §15.2 (mai l'intero record).
- **contesto** → quando l'evento riguarda una riga o un sottorecord, il dettaglio
  include l'id del genitore (`pratica_id`, `bollettino_id`, `fornitore_id`).
- **riferimenti ai documenti** → `documento_id` è l'**id** della riga di
  `documenti_in_arrivo` (§4.2.12), così la UI apre il documento e il suo errore di
  lettura.
- **esiti non riusciti** → la scorciatoia `{etichetta, errore: {…}}` al posto delle chiavi del
  successo vale per `errore` e per `negato`, mai per `successo` (C2).

### 15.5 Errori applicativi

- Gli errori di validazione e 5xx arrivano al log tramite **handler globale**
  intermedio: nessuna eccezione gestita silenziosamente (catalogo §15.2.7).
- Al frontend viene restituito solo un **messaggio user-friendly**; il dettaglio
  tecnico (classe, messaggio) resta nel log e non viene mai esposto nel browser. Nel
  `dettaglio` del registro restano **solo la classe e, per gli errori del database, il codice**
  (`P2002`…): il testo del messaggio, che può contenere valori di riga, resta nel log del
  processo (D-85). La finestra dei troppi tentativi risponde in italiano (429).
- Gli **errori di lettura documenti** lasciano il documento in `documenti_in_arrivo`
  (stato `errore`) e aprono l'anomalia `lettura.fallita` con `documento_id` (§7.14.3).

### 15.6 Schermata `/registro`

Comportamento di schermata in §7.11; specifiche operative:

- **Filtri**: genere, livello, servizio, codice, tipo, esito, entità, utente (ricerca), periodo `dal`/`al` (date),
  testo libero su `messaggio` e sull'etichetta del `dettaglio`; combinabili. Segmenti *Tutto · Anomalie aperte ·
  Errori* con i conteggi sugli altri filtri (D-23); *Stessa operazione* filtra per `operazione_id`; `stato`
  (`aperta`/`chiusa`) vale per le anomalie.
- **Tabella** (contenitore stabile V9): `ts` (DESC), livello, messaggio (con il codice), utente o servizio,
  riferimento (apre la pratica, il documento, il bollettino o l'utente) e volte; ordinamento e paginazione
  sul server (righe per pagina dalle Impostazioni, iniziale 25). Risposta `{righe, totale, pagina, pagine, per_pagina, conteggi, voci}`.
- **Dettaglio evento** in modale: tutti i campi, JSON `dettaglio` formattato, colonne rimanenti
  (`sessione_id`, `ip`, `chiave`, `ultimo`, `chiusa_il`, `visto_il`/`visto_da`) e `prima`/`dopo` affiancati.
- **Export CSV** (`GET /api/registro/export`): stesse righe filtrate, colonne fisse
  `ts;genere;livello;codice;utente;servizio;entita;entita_id;esito;messaggio;dettaglio(JSON)`; separatore `;`,
  UTF-8 con BOM, date `gg/mm/aaaa hh:mm`. §15.2.6 non ha un codice per questa esportazione: non si scrive
  alcun evento.
- Nella **dashboard** (§7.1) gli admin vedono un contatore "errori di oggi" con collegamento a
  `/registro?da=oggi`; il numero lo calcola il server (eventi in errore di oggi più anomalie aperte) e
  `GET /api/oggi` lo restituisce solo a chi ha `sistema.registro`.
- **Sola lettura**: nessun pulsante di modifica/eliminazione.

### 15.7 Conservazione e rotazione

- Job di pulizia notturno: righe `info` dopo 12 mesi, le altre dopo `eventi_mesi` (dalle
  Impostazioni → Conservazione, iniziale 36, minimo 12 per la validazione §7.15); le anomalie
  aperte non si cancellano mai. (nessuna cancellazione manuale).
- Gli eventi eliminati non sono recuperabili: gli storici "permanenti" (es. verifica
  bollettini) sono garantiti dai dati congelati in `bollettini_righe` (§5.11), non
  dal log.

### 15.8 Cosa NON si traccia

- **Codici dei link, segreti, token e cookie di sessione**: solo l'esito e il `sessione_id`.
- **Contenuto dei documenti/allegati**: solo `file_nome` e dimensione.
- **Body HTTP integrale**: solo i campi significativi del catalogo §15.2.
- **Dati sensibili del cliente** oltre agli identificativi di dominio (P.IVA,
  ragione sociale): nessun dato di pagamento o personale.
- **Letture GET** di elenco/dettaglio e **calcoli al volo** non esportati.

### 15.9 Dati di esempio (seed, §12)

Il seed comprende eventi dimostrativi coerenti con i dati di §12, nell'ordine di
collaudo: login `admin` (`auth/login`), creazione fornitore Gries (`crud/create`),
creazione + modifica scaglione (`crud/create`/`crud/update`), creazione pratica in
`inviato` (`crud/create`), upload conferma con cambio stato a `confermato`
(`documento/upload` + `stato/change_state`), verifica bollettino (`calcolo/verify`),
export liquidazione (`export/export`) e **un evento di tipo `errore`**
(`documento/upload` esito `errore` con `documento_id`) per collaudare
filtri e dettaglio.

### 15.10 Riferimenti

Tabella: §4.2.11 (e §4.2.15 per i giri dei servizi) · Schermate: §7.11, §7.14 · API: §8.1 · Seed: §12 · Deliverable: §14 ·
Requisito: V10

---

## 16. Piano di lavoro, replicazione del prototipo e stack

Il dettaglio delle attività (ore, dipendenze, DoD, file sorgente per ciascuna) è in
`piano-lavoro-crm.md`; questa sezione ne fissa i vincoli.

### 16.1 Replicazione maniacale del prototipo

Il prototipo ufficiale è **`prototipo-alternativo/`** (D-24). È la **sorgente di verità**
dell'interfaccia:
- `index.html`;
- `assets/stile.css` (stile);
- `assets/componenti.js` (componenti);
- `assets/viste-*.js` (pagine);
- `assets/motore.js` (regole);
- `assets/dati.js` (dati = seed §12).

Il primo prototipo (`prototipo-crm/`, Bootstrap) resta solo come archivio e per le pagine
generate della documentazione. Non è un riferimento per l'app.

**Eccezione voluta (D-136):** *Cerca in Integra* (Clienti, Fornitori, Documento) è **solo nell'app**:
il prototipo non la mostra, perché la ricerca sulle viste di Integra non ha senso senza ponte. È
descritta in questa spec e nella guida dell'app; una nota in `prototipo-alternativo/LEGGIMI.md` lo
dice. Per questa sola funzione D-24 non vale.

Ogni schermata implementata deve superare tutti e sei i criteri **prima del merge**. Si
verificano in tre modi:
- confronto affiancato con il prototipo aperto nel browser;
- confronto numerico sul seed §12;
- `strumenti/prove/flusso.py`, la prova di riferimento del comportamento.

1. **Struttura e navigazione**:
   - barra laterale a gruppi con i contatori;
   - testata della pagina con *‹ Torna a …*, titolo, azioni e *Guida*;
   - stesse rotte (§7.10);
   - ritorno nello stesso punto (§7.12).
2. **Layout**:
   - pagina alta quanto lo schermo;
   - l'elemento che riempie (di norma la tabella) prende lo spazio rimasto e scorre
     dentro;
   - stessi pannelli, schede e colonne nello stesso ordine;
   - sotto i 992 px flusso naturale.
3. **Componenti e stile**:
   - schermata composta **solo** dai componenti standard §16.4, con gli stessi parametri;
   - `stile.css` (variabili di colore, misure, classi) **copiato, non riscritto**;
   - carattere Public Sans incorporato;
   - niente Bootstrap.
4. **Testi**: etichette, segnaposto, messaggi vuoti, avvisi, note e testi della Guida in
   italiano **identico** parola per parola al prototipo.
5. **Interazioni**: devono avere lo stesso comportamento e gli stessi messaggi:
   - filtri standard (§16.4.1) e conteggi dal vivo (§16.4.2);
   - schede, finestre, campi di ricerca (singoli e multipli);
   - selettore dei mesi, grafici cliccabili;
   - conferme, avvisi;
   - esportazioni (Excel, PDF, CSV).
6. **Dati**: con il seed §12 uguale a `dati.js` si ottengono gli **stessi numeri** in
   riquadri, tabelle, totali, grafici ed esportazioni. È la prova oggettiva.

### 16.2 Fasi e attività parallele

| Fase | Ambito | Attività | Agenti paralleli | Ore |
|---|---|---|---|---|
| F0 | Fondamenta: scaffold, DB/seed, auth, shell + componenti standard §16.4, motore §10 + `logEvent()`, prova GLM-OCR su documenti reali | A1–A6 | 1 → fino a 4 | 28 |
| F1 | Anagrafiche (fornitori, agenti, interscambio) | A1–A3 | 3 | 6 |
| F2 | Pratiche ordini (lista, dettaglio, documenti, upload) | A1–A3 | 3 | 6 |
| F3 | Bollettini mensili | A1–A2 | 2 | 4 |
| F4 | Liquidazione (filtri, dettaglio, export) | A1–A3 | 2–3 | 3 |
| F5 | Dashboard + registro (`/registro`) | A1–A2 | 2 | 2 |
| F6 | Ingresso documenti senza n8n: email + caricamento, coda, lettura GLM-OCR, affidabilità e controlli, `/documenti` con finestra di correzione (§6.5, §7.9) | A1–A5 | 2–3 | 17 |
| F7 | Collaudo, replicazione, rilascio | A1–A2 | 1–2 | 5 |
| | | **23** | | **71** (preventivo §4) |
| — | Margine di rischio 25 % (riserva, usata solo se necessaria) | — | — | 18 |
| | | | | **89** |

**F0 è bloccante** (scaffold A1 → DB/auth/shell/motore/prova documenti); da F0
avanti **F1–F6 procedono in parallelo** (slice disgiunte, ownership per file), F7
chiude. Regole: contratti (schema §4.2, API §8, motore §10, `logEvent()` §15.3,
seed §12) congelati in F0; eventi §15.2 a carico dell'attività che implementa
l'operazione; tabelle legacy in sola lettura (V2).

### 16.3 Stack confermato (V7)

Lo stack **ricalca il Portale B2B Luis** (opzione B del confronto precedente; le opzioni
A — solo Next.js — e C — Express + EJS — sono scartate):

| Livello | Scelta |
|---|---|
| Node | 24.15 (`.nvmrc`), npm ≥ 11 |
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript |
| Backend | NestJS 11 (Express), DTO con `class-validator` |
| Accesso ai dati | Prisma 7 + `@prisma/adapter-pg` |
| Database | PostgreSQL, database proprio `decobrands_db` (V2); viste di Integra dal database ponte (§4.5) |
| Accesso | Nome utente (o email) e password con hash `scrypt` (`node:crypto`), password provvisoria e password dimenticata; `express-session` + `connect-pg-simple`, CSRF, Helmet, throttler (§3.3, D-39) |
| Esercizio | Caddy + due processi Node (8001/8002), Docker solo in sviluppo (§3.4) |
| Lavori pianificati / Excel / test | `@nestjs/schedule` · `exceljs` · Jest + supertest |
| Esportazioni PDF | **LibreOffice senza interfaccia** (`soffice --headless --convert-to pdf`, profilo dedicato): converte il medesimo `.xlsx`, così PDF ed Excel non divergono (§11) |
| Ingresso documenti | `imapflow` (casella email) · coda su PostgreSQL (`FOR UPDATE SKIP LOCKED`) · PDF → immagini (`pdftoppm`) · **GLM-OCR** su **vLLM** (server GPU locale, interfaccia compatibile OpenAI, uscita vincolata allo schema, `logprobs`) — **nessun n8n** |
| Grafica | **`stile.css` del prototipo ufficiale** (V4, D-24): CSS proprio con le variabili del prototipo (moduli CSS o un unico foglio globale), Public Sans incorporato, icone SVG del prototipo; niente Bootstrap e niente grafica di Luis |

**Riuso da Luis B2B — solo infrastruttura, nessuna interfaccia:**

| Da Luis (`backend/src`, `frontend/`) | Uso nel CRM |
|---|---|
| `main.ts` (Helmet, CORS, cookie, sessione su PostgreSQL, controllo CSRF) | copiato, adattato a porte e origini del CRM |
| `auth/` (login, logout, cambio password, guard autenticazione/ruoli) | ripresi sessioni, logout e guard; accesso con password come nella Gestione Ordini Decobrands (D-39), hash `scrypt` invece di bcrypt; tabella `utenti` propria; tolti i gruppi di permessi |
| `prisma/` (servizio Prisma) | copiato |
| `common/`: `http-error.filter.ts`, `request-context*`, `access-log.interceptor.ts`, `env.ts`, `xlsx.ts`, `audit.extension.ts` | copiati; `audit.extension` e `xlsx` alla base di §15 e di bollettini/export |
| `audit/`, `events/` | base del registro unico `registro` e di `/registro` (§15) |
| `health/` | copiato (controllo stato servizio) |
| Throttler in `app.module.ts` | copiato |
| `frontend/next.config.ts` (inoltro `/api/*`, intestazioni di sicurezza) | copiato |
| `frontend/lib/api.ts`, `use-auth.ts`, `version.ts` (chiamate con token CSRF, utente corrente, versione) | copiati |
| `DEPLOY.md`, Caddyfile, `avvia.bat`, `.env.example` | adattati |

**Non si prende da Luis:** componenti React, `globals.css` e qualsiasi CSS, layout,
next-intl, socket.io, moduli di dominio (catalogo, carrello, checkout, AI, lead, mail).
**Layout, grafica e testi restano quelli del prototipo ufficiale** (`prototipo-alternativo/`,
§16.1): le schermate Next.js riproducono le pagine del prototipo con gli stessi componenti
e lo stesso `stile.css`.

Lo schema Prisma copre solo le tabelle CRM (§4.2); le
tabelle esistenti si leggono in sola lettura (V2), mai migrate.

### 16.4 Componenti standard

Ogni schermata è una **composizione di componenti standard** configurati con parametri,
mai codice di interfaccia scritto a mano pagina per pagina. Nel prototipo la libreria è
`prototipo-alternativo/assets/componenti.js` (stili in `stile.css`), con catalogo dal vivo
nella voce *Componenti* (`#/componenti`, `assets/viste-componenti.js`); nell'app gli stessi componenti diventano componenti React **con gli
stessi nomi e gli stessi parametri** (attività F0-A4).

| Componente | Uso | Parametri principali |
|---|---|---|
| **DataTable** | ogni tabella dell'app (modello DataTable di Luis B2B) | colonne (`key`, `header`, `tipo` testo/numero/euro/pct/data/stato/conteggio, `align`, `width`, `grow`, `valore`, `cell`, `sortable`, `totale`), righe, azioni di riga, testata (titolo, contatore, azioni, link), selezione, paginazione facoltativa, `onRowClick`, testo "nessun dato" |
| **FilterBar** | barra dei filtri **standard** (§16.4.1) | campi `segmenti` (con conteggi aggiornati dal vivo: `conta`), `cerca`, `select` (solo per valori fissi, mai per entità), `ricerca` su un'entità con `multipla`; `predefinito` (valore senza filtro), `nelRiepilogo`; `riepilogo` (icone *Riepilogo dei filtri* e *Togli tutti i filtri*, con voci esterne come il periodo); `classe` (classi in più sul contenitore, es. `filtri-entita` dell'Analisi); `onChange`; metodi `imposta`, `azzera`, `conta` |
| **Sagoma** | caricamento di una pagina (D-59, §16.4.3): titolo e sottotitolo subito, il resto come sagome con la forma del contenuto; mai zeri, «Nessun elemento» o testi vuoti | `Sagoma` (larghezza, altezza, arrotondato), `SagomaTabella` (righe, colonne = numero o intestazioni vere, `naturale`), `SagomaSegmenti`, `SagomaRiquadri`, `SagomaMatrice`, `SagomaElenco` (filtri veri, colonne, larghezze); hook `useSagome(caricando)` con soglia di ~150 ms; `DataTable caricando` e `FilterBar caricando`. Al primo caricamento i numeri dei segmenti diventano piccole sagome; ai cambi di filtro la tabella resta, più tenue (`.in-aggiornamento`) |
| **KpiRow** | riquadri numerici | voci (etichetta, valore, variante colore) |
| **Riepilogo** | schede compatte del dettaglio pratica | voci (etichetta, icona, valore, variante) |
| **Schede** | contenuti alternativi nello stesso spazio, quando una scheda di dettaglio impilerebbe più tabelle (§7.1, §7.4, §7.13, §7.18, §7.21) | schede (`id`, etichetta, contatore con variante neutro/giallo/rosso/verde, `disegna`), scheda attiva, `riempi`, `onCambia`, prop opzionale `azioni?: ReactNode` mostrata a destra della barra (il filtro «Stato delle pratiche», D-178); tastiera ← → Home Fine; **ricorda la scheda** per ogni passo della cronologia (§7.12). Le schede stanno **in alto**. Non sostituiscono i segmenti della FilterBar: i segmenti filtrano le stesse righe, le schede mostrano contenuti diversi |
| **Pannello** | card con testata | titolo, icona, azioni, piede |
| **Accesso** | pagine fuori dall'app: accesso, cambio e reimpostazione della password (§7.0, D-39, D-42) | `titolo`, `testo`, `avviso`, `campi` (come Form), `conferma`, `link`, `presentazione`, `onConferma(valori, form)`; pagina scura con il logo al centro, modulo in una finestra (con `presentazione` si apre al primo tasto o tocco, il tasto va nel primo campo), pulsante largo in attesa durante la conferma |
| **Form / FormModal** | moduli e finestre modali | campi (`nome`, `etichetta`, `tipo` — `testo`, `numero` (`inputMode="decimal"`, con `min`/`max`/`step`), `email`, `password` con mostra/nascondi, `casella`, `select`, `livello` —, `opzioni`, `segnaposto`, `largo`, `obbligatorio`, `aiuto`, `completa` per `autocomplete`, `onChange`), pulsante / `onConferma`; `casella` mostra la casella che abilita il pulsante (conferma con spunta, D-172). **ConfermaGrave** (D-172): come *Conferma*, con l'elenco delle conseguenze e la casella obbligatoria, pulsante rosso spento finché non è spuntata |
| **Intestazione** | testata pagina | titolo, icona, sottotitolo, azioni, prop opzionale `testa?: ReactNode` fra «Torna a …» e le azioni (la tendina dell'anno nelle Liquidazioni, D-195); pulsante **"Torna a …"** automatico (§7.12). Il parametro `briciole` (percorso "Elenco › Dettaglio") esiste ma **non si usa** nelle pagine di dettaglio: ripete il *Torna a …* e la voce evidenziata nella barra (D-12, §19) |
| **Stepper**, **Nota**, badge | passi di stato, note, stati | — |
| **AzioniRiga** | azioni sulle righe di ogni tabella e di ogni elenco (§7.2, §7.3, §7.7, §7.9, §7.14, §7.16): sempre icone, mai pulsanti con testo | una o più azioni, ognuna con la sua variante (Modifica, Elimina in rosso tenue, Conferma in evidenza), `aria-label`/`title` «verbo oggetto», slot fisso 32 px che resta vuoto se l'azione manca; fuoco a bordo interno (D-64). L'ordine delle icone è fisso in tutte le righe (D-171) |
| **Copiabile** | identificativi che si ricopiano per dialogare con fornitori e clienti: numero di pratica, ordine e documento, codice cliente, P.IVA (§7.3, §7.9) | il valore e una piccola icona «Copia»: copia negli appunti e mostra una spunta per 1,5 s, non sposta il testo, `aria-label`/`title` «Copia …», fuoco a bordo interno (D-64). Il marcatore «da confermare» delle agenzie importate dal vecchio CRM è nel suo testo (D-159) |
| **Binario** | fasi documentali di una pratica, sempre sopra le schede (§7.3): ordine → conferma → fattura → nota di credito | tappe (`titolo`, `fatta`, `ritardo`, `numero`, `data`, `importo`, `delta` rispetto alla fase prima, `testo`, `assente`); nell'app `componenti/Flussi.tsx` |
| **Cerniera** | riconciliazione riga per riga del bollettino (§7.7): a sinistra il fornitore, a destra il nostro calcolo, la differenza sulla cucitura; gruppi *Da decidere · Decise · Quadrano · Incassi* | `sinistra`, `destra`, `totali` (sinistra, destra, differenza), `gruppi` (titolo, variante, chiuso, righe con titolo, dettagli, i due lati, differenza, `quadra`, azioni, esito). La colonna *Differenza* ha una larghezza minima di 230 px e non va a capo: ci sta 999.999.999,99 €, con la cucitura allineata fra riepilogo e righe. Sotto gli **860 px** le righe si impilano (documento e cliente, i due lati con l'etichetta presa dall'intestazione, la differenza in evidenza, i pulsanti sotto a tutta larghezza) **solo con il CSS**; nel prototipo `CRM.Cerniera` ha lo stesso markup e le stesse classi |
| **FinestraAffiancata** | documento a sinistra, dati a destra, divisore trascinabile; usata da "Correggi i dati letti" (§6.5) e dalla consultazione dei documenti della pratica (§7.3); sotto gli 860 px i pannelli si impilano, sotto i 576 px la finestra occupa tutto lo schermo e nulla esce in larghezza (le tabelle scorrono dentro) | titolo, sottotitolo, larghezza iniziale, `sinistra(host)`, `destra(host)`, azioni del piede |
| **PeriodoMesi** | periodo di N mesi scelto con anno e griglia dei mesi (Bollettini §7.7 con 6 mesi, Analisi §7.22 con 3, 6 o 12) | mese d'inizio, numero di mesi (6), primo e ultimo mese con dati, `onChange(da, a)`; scorciatoie *Ultimi N mesi* e semestri; completamento automatico dentro i mesi con dati; anteprima al passaggio del mouse. Stesso schema del selettore di date del Portale Luis (`react-date-range`: pulsante "da → a" e riquadro con scorciatoie), ma a mesi: nell'app un componente proprio, la libreria non sceglie mesi |
| **Grafico** | Report subagenti (Liquidazioni, §7.8), Analisi (§7.22) | `tipo` barre / linea / ciambella, etichette, serie (`nome`, `valori`, `colore`, `tipo` per barre+linea), `orizzontale`, `impilato`, `altezza`, importi in euro all'italiana su assi e suggerimenti, legenda in basso; `onClick(indice)` per usare il grafico come filtro (puntatore a mano), `evidenzia` (indice in risalto, gli altri schiariti), `immagine()` → PNG su fondo bianco per Excel e PDF. Libreria **Chart.js** 4 (MIT; nel prototipo `assets/lib/chart.umd.min.js`, nell'app `chart.js` + `react-chartjs-2`); colori dell'app (`COLORI_GRAFICI`) |
| **GruppiDaFare** | lista "Da fare" della pagina Oggi (§7.1) | gruppi (`id`, titolo, variante, contatore, voci, riassunto, azioni di gruppo, testo se vuoto); `filtra(id)` collegato ai riquadri |
| **Elenco** | liste semplici (documenti, registro) | voci (testo, destra, `onClick` facoltativo: voce cliccabile anche da tastiera) |
| **Avviso** | messaggio temporaneo in basso a destra (conferme e rifiuti del server) | testo, `errore`: rosso con `role="alert"` e 8 s; senza `errore` verde con `role="status"` e 4,2 s. Una sola regione live, creata all'avvio e svuotata alla scadenza (non eliminata): una regione live creata insieme al testo non viene annunciata dai lettori di schermo (A7-11, D-149) |
| **CampoRicerca** + **RicercaEntita** | ogni campo collegato a un'entità: fornitore, cliente, subagente, codice cliente del fornitore, articolo (articoli già usati dal fornitore: un articolo nuovo è ammesso col pallino rosso), pratica, fattura/nota di credito | autocompletamento con le prime 5 voci, lente / F4 che apre la maschera di ricerca (FilterBar + DataTable), pallino verde/rosso se il valore esiste in anagrafica; entità definite una volta (voci da `/api/lookup/*`, chiave, testo, colonne, filtri, contesto). **Selezione singola** (predefinita: righe dei documenti, moduli) **o multipla** (`multipla: true`, filtri dell'Analisi): il campo chiuso mostra il nome della sola voce scelta o *Filtro multiplo (n)*; il menu, aperto entrando nel campo, ha in alto le voci scelte (✓, clic = toglie, *Togli tutti*) e sotto le altre, resta aperto e il `change` parte alla chiusura; nessun valore libero (niente pallino), valore = elenco di chiavi; maschera con colonna di caselle, *Scegli tutte le righe filtrate*, *Togli tutte*, *Applica (n)*. `contesto.limita` restringe le voci proposte, `contesto.tutti` include le voci non attive. Uso fuori dai moduli: `CampoRicerca(host, …)` e FilterBar `{ tipo: 'ricerca', entita, multipla }`. Nell'app un solo componente React con la prop `multipla`; prop opzionale `segmenti?: { voci: {valore, etichetta}[], valore, onCambia }` che mostra un filtro di stato nella finestra di ricerca (tendina a destra del campo, D-177) e `vincoli?: string` sotto il titolo (D-185) |
| **RiepilogoFiltri** | barre dei filtri con più campi (Analisi, §7.22) | due pulsanti a icona: imbuto con il numero delle voci scelte (dentro il pulsante, accanto all'icona) che apre il riquadro *Filtri attivi* (ogni filtro, anche il periodo, con × per togliere una voce, *Togli tutti i filtri*), imbuto barrato che toglie tutti i filtri; `voci: [{ etichetta, testo } \| { etichetta, valori: [{ testo, togli }] }]`, `attivi`, `onAzzera` |

**Comportamento fisso della DataTable** (uguale in ogni schermata):
- occupa **sempre tutto lo spazio** a disposizione del suo contenitore;
- **intestazione fissa**, **solo le righe scorrono**; riga totali fissa in fondo;
- **intestazioni ordinabili** (clic: crescente ▲ / decrescente ▼), ordinamento corretto per numeri, importi e date;
- **paginazione** sempre attiva oltre il numero di righe per pagina fissato nelle
  impostazioni (§7.15, iniziale 25): piede "26–50 di 50 elementi" con ‹ 1 2 … n ›.
  **Ordinamento, ricerca, filtri e totali valgono su tutto l'elenco**, non sulla sola
  pagina: si ordina tutto, poi si mostra la fetta; nell'app con molte righe ordinamento e
  pagina si chiedono al server (`?ordina=campo&verso=asc&pagina=2&righe=25`), che
  restituisce anche il totale delle righe e i totali delle colonne. Cambiando filtro o
  ordinamento si torna alla prima pagina; la pagina si ricorda tornando indietro (§7.12);
- piede con conteggio ("N elementi" su una pagina sola);
- non scende mai sotto ~3 righe visibili: se lo spazio manca scorre la scheda o la pagina;
- **ricorda ordinamento e scorrimento** per ogni passo della cronologia; FilterBar e KpiRow
  ricordano i valori scelti (§7.12).

*Perché (DataTable, A5-07, A7-04, A7-05, D-126):* `naturale` cambia solo l'altezza (il
contenuto, senza riempire lo spazio): la paginazione resta sempre attiva e si toglie solo con
`perPagina: false`, per le tabelle corte da impilare. Le intestazioni ordinabili sono pulsanti
dentro il `th`, raggiungibili con Tab e con Invio/Spazio (WCAG 2.1.1); le righe apribili hanno
`tabIndex=0` e si aprono con Invio o Spazio, con il fuoco come bordo interno e mai come `outline`
esterno (D-64). I totali delle colonne di importi arrivano già calcolati dal server (`totali`) e
la DataTable li mostra senza sommare (V12, D-126); `totale: 'somma'` resta il segnaposto della
colonna.

*Perché (Schede):* `attiva` è la scheda richiesta dal genitore e può cambiare dopo il primo
disegno (`Vedi le righe`): il componente la segue (§7.12). Con `memoria` il primo disegno non
forza `attiva`, così tornando alla pagina si riapre la scheda di prima.

*Perché (D-149):* l'avviso è una regione live permanente, creata una volta all'avvio e
lasciata vuota: i lettori di schermo annunciano solo le modifiche di una regione già presente
nel documento, e creata insieme al messaggio spesso non si sente nulla. Un errore del server
deve arrivare come `alert`, non come cortese `status`. La regione si riusa solo se è ancora nel
documento (`isConnected`), altrimenti si ricrea (C1).

*Perché:* il campo di ricerca è un `combobox` con `aria-controls` e `aria-activedescendant`; la
voce attiva (frecce ↑ ↓) è annunciata dal lettore di schermo e l'input ha sempre un nome
(`aria-label`, dall'etichetta o dal titolo dell'entità).

#### 16.4.1 Filtri standard (D-22)

Ogni barra dei filtri si costruisce con FilterBar e segue queste regole.

- **Filtri su entità** (fornitori, clienti, subagenti, articoli, …): sempre un campo di
  ricerca (CampoRicerca) a **selezione multipla**, mai una tendina. Il campo:
  - è vuoto ("Tutti i …") quando non filtra;
  - mostra il nome quando è scelta una sola voce;
  - mostra *Filtro multiplo (n)* quando le voci sono più d'una;
  - apre il menu con le voci scelte in alto.

  Il menu propone solo le voci presenti nell'elenco filtrato (`contesto.limita`).
- **Etichette**: non stanno davanti al campo. Le sostituisce il segnaposto ("Tutti i
  fornitori"); l'etichetta resta per chi usa il lettore di schermo e nel riepilogo.
- **Fuoco**: il bordo blu del campo con il fuoco sta **dentro** il bordo (ombra interna), non è
  un `outline` esterno: quello finirebbe sotto il menu aperto (tendina nativa o menu della
  ricerca) e verrebbe tagliato dai contenitori che non scorrono. Vale per ricerca, tendine e
  date di ogni barra dei filtri (Ugo, 06/11/2026).

  *Perché (D-64):* il bordo interno non esce dall'area del campo e quindi non finisce sotto il
  menu aperto, dove sarebbe tagliato o coperto; vale anche per i pulsanti dentro le intestazioni
  delle tabelle e per le righe apribili da tastiera (§16.4).
- **Riepilogo** (FilterBar `riepilogo`): con due o più filtri, in fondo alla barra ci sono le
  icone *Riepilogo dei filtri* e *Togli tutti i filtri* (RiepilogoFiltri).
  - Il riepilogo elenca ogni filtro della barra, più quelli esterni come il periodo
    (`riepilogo.prima`).
  - Ogni voce ha una × che la riporta al valore "senza filtro" (`predefinito`).
  - Il numero sull'imbuto conta le voci scelte e i filtri diversi dal predefinito.
  - I campi con `nelRiepilogo: false` (es. la durata dell'Analisi) non si azzerano.
- **Combinazione**: più voci nello stesso campo valgono in **o**; campi diversi valgono in
  **e**.
- **Memoria**: i valori si ricordano tornando indietro (§7.12).
- **Dove si applica oggi**:

  | Pagina | Filtri |
  |---|---|
  | Pratiche | fornitore, cliente, subagente |
  | Bollettini | fornitore |
  | Cliente → Pratiche | fornitore |
  | Analisi | fornitore, subagente, cliente |

  Le liste a sinistra delle anagrafiche hanno solo la ricerca libera e non cambiano.
- **API**: i parametri di filtro su entità accettano più valori separati da virgola
  (`?fornitori=1,2`, `?clienti=…`).
- **Su una riga** (D-187): la barra sta su una riga sola; quando i controlli non ci stanno, i
  **segmenti diventano una tendina** (`<select>` con i numeri) invece di andare a capo, e si torna
  ai segmenti solo quando c'è spazio vero (isteresi). `FilterBar` misura la larghezza necessaria dai
  segmenti a larghezza naturale (clone sempre nel DOM), non dal layout corrente, così non lampeggia.

  *Perché (D-187):* i segmenti a capo spingono i filtri sotto e cambiano la disposizione della
  pagina; la tendina li tiene sulla stessa riga. Vale per tutte le pagine con FilterBar.

- **Azioni sulle righe** (D-171): in tutte le tabelle e negli elenchi con pulsanti sulle righe le
  azioni sono **icone in colonne fisse** (`AzioniRiga`), ognuna sempre nello stesso punto; se una
  riga non ha quell'azione resta lo spazio vuoto e le altre non scorrono.
- **Conferme** (D-172): le operazioni impattanti e senza ritorno (rileggere o scartare un documento,
  eliminare, chiudere bollettini e liquidazioni, annullare documenti, svuotare gli Scartati) usano
  `ConfermaGrave`: elenco vero delle conseguenze, casella da spuntare, pulsante rosso spento finché
  non è spuntata. Le conferme leggere delle azioni reversibili restano come sono.

  *Perché (D-171, D-172):* i pulsanti con testo allargavano le tabelle e facevano scorrere di lato,
  e un'azione che cambia posizione da una riga all'altra fa sbagliare riga; una perdita di dati
  definitiva deve costare una scelta esplicita, non un clic distratto.

#### 16.4.2 Numeri e conteggi: quando si aggiornano (D-23)

Riguarda tutti i valori aggregati dell'interfaccia: i numeri nei segmenti, i KPI, i
totali delle tabelle, i contatori della barra laterale e delle schede.

**Rispetto ai filtri (dal vivo, nel browser).**
- Ogni cambio di filtro ricalcola subito i numeri, senza ricaricare la pagina.
- Il numero di un segmento conta le righe con **tutti gli altri filtri applicati**,
  escluso il segmento stesso. Esempio: con il fornitore Gries, *Tutte 12 · Fatturate 7*.
  Così si vede quante righe si otterrebbero cliccando.
- Componente: FilterBar `conta(nome, mappa)`.
- Si applica anche ai KPI cliccabili (KpiRow) e alle schede con contatore.

**Rispetto ai dati (cambiamenti fatti da altri o dai servizi).** Esempi: un documento
arrivato nella casella, una sincronizzazione da Integra, un salvataggio di un altro
utente.
- Il server pubblica un evento *dati cambiati* con l'elenco delle aree toccate (pratiche,
  documenti, bollettini, …). Il canale è `GET /api/eventi/flusso`, Server-Sent Events;
  in alternativa un controllo ogni 30 s.
- La pagina aperta reagisce in due modi:
  - **contatori** (barra laterale, schede, segmenti, KPI): si aggiornano **da soli**,
    senza toccare filtri, ordinamento e scorrimento;
  - **elenchi e tabelle**: **non** cambiano sotto le mani di chi lavora. In alto compare
    l'avviso *Ci sono aggiornamenti · Aggiorna*, che ridisegna la pagina mantenendo filtri,
    ordinamento, pagina e scheda (§7.12).
- Le modifiche fatte dall'utente stesso (salvataggi, abbinamenti, verifiche) ridisegnano
  subito la pagina, come nel prototipo.
- Nel prototipo non ci sono altri utenti né servizi: i dati cambiano solo per le azioni
  dell'utente, e ogni azione ridisegna la pagina con i numeri ricalcolati.
- **Perché**:
  - i numeri devono dire il vero in ogni momento: un contatore vecchio porta a cercare
    lavoro che non c'è più, o a non vedere quello nuovo;
  - spostare le righe mentre si legge o si clicca, invece, fa sbagliare riga: per questo
    le tabelle si aggiornano su richiesta.

*Perché (U20, D-75 confermata):* i contatori della barra si rileggono a ogni cambio pagina **e**
a ogni evento SSE delle loro aree (documenti, pratiche, bollettini, sistema); la richiesta è
leggera (conteggi in SQL), così il numero accanto alle voci è sempre quello del server.

*Perché (D-94):* in Documenti l'elenco sta nel **layout**, non nella pagina, e i nuovi documenti
arrivano via SSE aggiornando solo l'elenco; così selezionare un documento non ricarica più la
lista e non si perde il punto. Il pattern (numeri subito, righe su *Aggiorna*) vale per i dettagli
(Pratica, Bollettino) e per le anagrafiche.

**Nell'app (F4-A6):** `GET /api/eventi/flusso` è un canale SSE aperto dal guscio con **un solo**
`EventSource` per scheda (`lib/eventi.tsx`, `EventiProvider`); si chiude con la scheda e all'uscita.
Il server legge il `registro` (D-31) ogni ~4 s **mentre qualcuno è collegato**, parte dall'ultimo id
al primo collegamento (nessun evento vecchio), unisce le righe dello stesso giro in un solo
`{aree:[…]}` e manda un battito ogni ~25 s. Le aree si ricavano dai codici del registro (`pratica.*`,
`documento.*`, `bollettino.*`/`calcolo.*`, `liquidazione.*`/`provvigioni.*`, anagrafiche, utenti,
impostazioni) e, per i codici generici `crud.*` e `stato.change_state`, dalla colonna `entita`.
In **Pratiche** e **Bollettini** un evento della loro area rilegge in silenzio: i contatori
(segmenti e totali) cambiano subito, le righe restano; se sono cambiate compare la barra
*Ci sono aggiornamenti · Aggiorna*, che applica i dati nuovi mantenendo filtri, ordinamento, pagina,
scheda e scorrimento. Le altre pagine (Oggi, Documenti, Liquidazioni, Analisi, anagrafiche, Utenti)
leggono ancora al cambio di pagina: il provider è pronto per collegarle. Finché il backend ha un solo
processo basta il ciclo locale; con più processi servirà un canale condiviso (`shortcut:` nel codice).
Se il canale si chiude per un errore HTTP (502 durante un riavvio del backend, 401) `EventSource`
non riprova da solo: il guscio riapre la fonte dopo 15 s, senza avvisi e senza ricaricare la
pagina. Le riaperture non contano come attività per il timeout di inattività (D-89).

**Layout:** la pagina è alta quanto lo schermo; intestazione, filtri, KPI e note hanno
altezza propria, l'elemento "riempi" (di norma la DataTable) prende il resto. Sotto i
992 px la pagina torna a flusso naturale e le tabelle hanno altezza massima 65vh.

#### 16.4.3 Sagome di caricamento (D-59)

**Perché:** la pagina non mostra mai zeri o testi vuoti finti, e il layout non salta quando i
dati arrivano.

Regole valide in **tutta l'app**:

- il **titolo** e il sottotitolo della `Pagina` si vedono subito;
- finché i dati non arrivano, il resto è una **sagoma** con la stessa forma del contenuto
  (segmenti, filtri, righe della tabella, riquadri, matrice) e le stesse altezze;
- durante il caricamento non compaiono mai **0**, «Nessun elemento» o testi vuoti;
- se il caricamento dura meno di ~150 ms le sagome non compaiono, per evitare il lampo;
  con `prefers-reduced-motion` la luce non scorre; il contenitore ha `aria-busy="true"` e le
  sagome `aria-hidden`;
- **cambio di filtro o di pagina** con i dati già a schermo: niente sagome al posto della
  tabella; la tabella resta com'è, con una leggera opacità (`.in-aggiornamento`), finché
  arrivano i dati nuovi.

Come si usa in una pagina nuova (le sagome compaiono solo se servono davvero):

```tsx
const [dati, setDati] = useState<X[] | null>(null);
const sagome = useSagome(!dati);                 // vero solo se il caricamento supera ~150 ms
...
<DataTable righe={dati ?? []} colonne={colonne} caricando={sagome} ... />
```

Una pagina a due colonne usa `SagomaElenco` con la **stessa** `FilterBar` e le stesse
`larghezze` del `--colonne`; una matrice `SagomaMatrice`; numeri e riquadri `SagomaSegmenti`
e `SagomaRiquadri`; una scheda di dettaglio `SagomaCorpo`/`SagomaScheda`. L'esempio dal vivo
è nel catalogo `/componenti` (voce *Sagoma*).

### 16.5 Regole di consegna

> ⚠ **REGOLA FONDAMENTALE — tutto sul backend, MAI dai dati del frontend (V12, D-28).**
> Ogni calcolo e ogni operazione sensibile si esegue **sul server (NestJS)**, partendo **solo
> dai dati del database**. Il frontend **mostra** i risultati e **invia soltanto le scelte**
> dell'utente (id, valori digitati, motivo); il server **non usa mai** importi, percentuali,
> totali, stati, permessi o utente arrivati dal browser.
> - **Calcoli**: provvigioni, scaglioni ed eccezioni, regole del subagente, netto dei
>   documenti, differenze dei bollettini, liquidazione, storni, Analisi, totali delle
>   tabelle, esportazioni (Excel/PDF/CSV generati dal server).
> - **Operazioni sensibili**: cambi di stato, verifiche e chiusure (bollettino, trimestre),
>   abbinamenti, correzioni, permessi (`requirePermesso`), utente e data dell'evento,
>   registro eventi.
> - Ogni richiesta che modifica qualcosa **ricarica dal database** ciò che serve, **ricontrolla**
>   regole, vincoli e permessi e **ricalcola**; un valore calcolato mandato dal client si
>   ignora (o la richiesta si rifiuta), mai si salva.
> - Il prototipo calcola nel browser **solo perché è una dimostrazione senza server**: non è
>   un modello da copiare.
>
> **Perché**: dal browser chiunque può cambiare qualsiasi valore; le provvigioni sono soldi e
> il registro deve essere vero.

In revisione si respinge ogni PR in cui il server usa un importo, una percentuale, un totale, uno stato, un permesso o un utente ricevuto dal client, o in cui il frontend calcola un valore che poi viene salvato.

Ogni attività è una slice con ownership disgiunta (nessun file toccato da due agenti);
una PR per attività con checklist §16.1 allegata; testi e stile presi dal prototipo,
non inventati; prima del merge: checklist superata + test numerici seed §12 + eventi
§15.2 completi. Casi limite §13 restano backlog, non toccati dal piano.

**Il perché accompagna sempre il cosa.** Ogni regola o scelta d'interfaccia ha il suo
motivo nel registro delle decisioni (§19) o in una riga *Perché* nella sezione che la
descrive. Chi sviluppa:
- prima di cambiare un comportamento legge il perché: se il motivo vale ancora, il
  comportamento resta anche se sembra strano;
- se il codice deve discostarsi dalla specifica, lo dice nella PR con il motivo e si
  aggiunge una riga al §19;
- nei punti non ovvi del codice un commento breve rimanda alla decisione (es.
  `// storno alla liquidazione successiva, D-11 §19`).

---

### 16.6 Schermi: computer e tablet, niente telefono (D-44)

L'app si usa su **computer** e **tablet**. Il **telefono non è previsto**: pagine come
Liquidazioni, Bollettini (cerniera) e Analisi hanno tabelle larghe e due colonne affiancate, che
su un telefono non si leggono.

- **Soglia: 744 px** di larghezza della finestra (il tablet più piccolo diffuso, iPad mini, in
  verticale). Sotto la soglia **l'app si ferma a monte**: su ogni pagina, accesso compreso, al
  posto dell'app compare una pagina scura come l'accesso, con il logo e il testo "Il Sistema
  Informativo Aziendale si usa da computer o tablet. Apri questa pagina da uno schermo più
  grande, o allarga la finestra." Allargando la finestra (o girando il tablet) l'app torna da
  sola.
- Il controllo è sulla **larghezza**, non sul tipo di dispositivo (niente lettura dello
  user agent): conta se lo schermo è adatto, e così vale anche per una finestra del computer
  stretta. Si fa con il CSS (una regola `@media (max-width: 743px)` nel layout radice), quindi
  arriva già nell'HTML del server: nessun lampo dell'app prima del blocco.
- Non è una protezione di sicurezza (chi vuole può allargare la vista del browser): serve a non
  dare un'app che non si può usare. I dati restano protetti da accesso e permessi (§3.3, §8.3).
- **Tablet** (da 744 a circa 1100 px): le colonne affiancate si impilano (`.colonne`, variabile
  `--colonne` per le larghezze scelte dalla pagina) e la barra laterale diventa una riga in alto
  che scorre di lato.
- **Prove e schermate**: a **1440 px** (computer) e a **768 px** (tablet in verticale); non più
  a 390 px.

*Perché (D-44):* il CRM è uno strumento d'ufficio con tabelle e confronti fianco a fianco;
adattarlo al telefono costerebbe molto e darebbe pagine poco usabili. Fermare a monte evita
che qualcuno lavori su schermate tagliate e prenda errori per buoni.

*Perché (D-127):* il blocco guarda la larghezza della finestra, quindi vale anche con lo zoom; è
un'eccezione voluta a WCAG 1.4.10, perché l'alternativa sarebbe un'app che si può ingrandire ma non
si può usare.

## 17. Ampliamento futuro: vendita diretta e sostituzione della Gestione Ordini

Decisione: la **vendita diretta** (articoli che Decobrands compra e rivende in proprio) e la
sostituzione della Gestione Ordini attuale (Express + EJS + n8n + LlamaIndex) sono un
**ampliamento successivo**, **non in questa fase** e fuori da questo preventivo. Fino ad
allora la Gestione Ordini resta in esercizio, invariata e separata dal CRM (D-29);
con l'ampliamento il CRM la **ingloba** e ne migra i dati.

### 17.1 Cosa è già progettato

| Aspetto | Indicazione |
|---|---|
| Pagine | Ordini cliente con esportazione per Integra (§7.18), Articoli (§7.19), Giacenze (§7.20), Alias e kit (§7.21): **nel prototipo, spente** (`CRM.AMPLIAMENTI.vendita`, si accendono con `?vendita=1`) |
| Dati | `impegni_giacenza` (§4.2.16), `ordini_cliente_esportazioni` (§4.2.17); tabelle esistenti `ordini_cliente_*`, `articoli`, `giacenze`, `codici_alias`, `kit_*` riusate; viste di Integra per articoli, giacenze, ordini registrati (§4.5) |
| Esportazione verso Integra | file Ordine cliente (OC) e Ordine fornitore (OF) con il tracciato della Gestione Ordini, alias e kit applicati, impegni sul disponibile fino alla registrazione in Integra (§7.18) |
| Interfacce e permessi | §8.2, permesso `magazzino` (§8.3), eventi §15.2.6.1 |
| Prerequisito | ingresso documenti (§6.5) in esercizio e tarato sui documenti reali |
| Ingresso | gli ordini cliente entrano dallo **stesso ingresso documenti** del CRM (§17.2); si spegne il flusso n8n + LlamaIndex |
| Passaggio | i due sistemi in parallelo per un periodo di prova, poi spegnimento di n8n e della vecchia app |
| Stima | piano §10.1 (12 h indicative), da quotare a parte quando si avvia l'ampliamento. La sincronizzazione di **clienti e fornitori** non fa parte dell'ampliamento: è in questa fase (piano F1-A4) |

### 17.2 Ingresso unico: documento dell'agenzia o ordine della vendita diretta? — DA DECIDERE

Ordini, conferme e fatture dell'agenzia e ordini dei clienti della vendita diretta sono
tutti **documenti**: entrano dalla stessa pagina Documenti (§6.5, §7.9). Dopo la lettura il
documento va **classificato** per mandarlo nel flusso giusto: pratica (agenzia) oppure
Ordini cliente (vendita diretta).

**Cosa li distingue:** chi fattura al cliente. In agenzia fattura il fornitore e Decobrands
riceve la provvigione; in vendita diretta Decobrands compra dal fornitore e fattura lei.

| Segnale | Agenzia | Vendita diretta | Peso |
|---|---|---|---|
| Casella o mittente | casella dei documenti, indirizzo di un fornitore | casella degli ordini, indirizzo di un cliente | forte, se le caselle sono separate |
| Codici degli articoli | già usati da quel fornitore nelle pratiche | presenti fra gli articoli di Integra, o in alias e kit | forte |
| Intestazione del documento | fornitore venditore, codice cliente del fornitore (es. K-11036) | Decobrands venditrice, codice cliente di Integra | forte |
| Cliente | ha l'agenzia per quel fornitore (`interscambio`) | ha la vendita diretta attiva (`clienti`) | medio: un cliente può averle entrambe |
| Prezzi | listino del fornitore | listino Decobrands | debole |

**Proposta**
1. La lettura propone il tipo con un'affidabilità, come per i campi (§6.5): *Ordine
   (agenzia)* oppure *Ordine cliente (vendita diretta)*; per conferme, fatture, note di
   credito e bollettini il tipo è sempre agenzia.
2. Se i segnali concordano il documento va da solo nel flusso giusto; se sono in conflitto
   l'elenco mostra **Da classificare** e l'operatore sceglie con un clic.
3. **Ordine misto** (righe di articoli di Integra e righe di articoli del fornitore): si
   propone di **dividerlo in due**, una parte alla pratica e una agli Ordini cliente.
4. Ogni scelta manuale resta registrata (`documenti_in_arrivo.classificato_da`, evento §15)
   e serve a tarare le regole (es. "questo cliente manda sempre vendita diretta").
5. **La via più semplice e sicura**: due caselle separate (es. ordini@ e documenti@), che da
   sole risolvono la maggior parte dei casi; i segnali sul contenuto restano per i documenti
   caricati a mano e per i casi dubbi.

**Domande per Decobrands** (da chiudere prima di avviare l'ampliamento):
- i clienti mandano gli ordini dell'agenzia e quelli della vendita diretta allo stesso indirizzo?
- un unico ordine del cliente può contenere articoli in agenzia e articoli in vendita diretta?
- i documenti della vendita diretta hanno sempre il codice cliente di Integra?

---

## 18. Fase successiva: supporto alle decisioni e all'analisi con modelli

> Dettaglio: PRD `PRD-supporto-decisioni-llm.md` e specifica tecnica `specifica-automazione-llm.md` (architettura, dati, funzioni A1–A8, ombra e attivazione, API, sicurezza, prove, piano indicativo 46 h).

**Non in questa fase** e fuori dal preventivo: raccolta di idee e strumenti da valutare
dopo la messa in esercizio, con una prova misurata prima di ogni adozione.

### 18.1 Principi

1. **I numeri li calcola il programma**, mai il modello: il modello riceve importi,
   percentuali, date e storico già calcolati e si limita a classificare, spiegare,
   proporre o scrivere.
2. **Il modello propone, l'operatore decide**: nessuna azione automatica; ogni proposta
   ha un pulsante di conferma e si può ignorare.
3. **Ogni proposta mostra le prove** (i dati su cui si basa, con i collegamenti) e, quando
   c'è, la **probabilità**; sotto una soglia la proposta non si mostra.
4. **Si registra tutto**: proposta, probabilità, scelta dell'operatore (tabella
   `suggerimenti`, §18.5). Così si misura quanto il modello ci prende e se vale la pena.
5. **I dati non escono**: modelli in locale sul server con scheda video di GLM-OCR (§6.5);
   in alternativa un servizio esterno solo con contratto sul trattamento dei dati.
6. **Rispetto dei ruoli** (§8.3): le proposte che portano a una modifica compaiono solo a
   chi può modificare; le analisi in sola lettura a tutti.

### 18.2 Idee (ordinate per valore rispetto allo sforzo)

| # | Idea | Cosa fa | Dove compare | Strumento | Valore · sforzo |
|---|---|---|---|---|---|
| 1 | **Spiegare le differenze dei bollettini** | per ogni riga che non quadra propone la causa più probabile (sconto diverso da quello in anagrafica, percentuale vecchia, nota di credito non riconosciuta, fattura del mese sbagliato, errore del fornitore, informazioni insufficienti) con le prove; suggerisce *accetta* o *contesta* e scrive la contestazione in tedesco o inglese | cerniera del bollettino (§7.7) | decisione tipizzata per la causa; modello che scrive per il testo | alto · basso |
| 2 | **Anomalie prima che diventino differenze** | il programma confronta ogni documento con lo storico (prezzo di un articolo fuori dal solito, sconto fuori scaglione, conferme ridotte ricorrenti da un fornitore, ritardi di conferma in peggioramento); il modello decide se è un'anomalia e la riassume in una frase | Oggi (§7.1), gruppo dedicato | statistiche + decisione tipizzata (sì/no + punteggio) | alto · medio |
| 3 | **Domande in italiano sui dati** | es. "quanto ha maturato Nista da Gasper quest'anno rispetto al 2025?": il modello scrive l'interrogazione in **sola lettura** su viste dedicate, il programma la esegue e mostra la tabella con l'interrogazione visibile e i collegamenti | pagina "Chiedi ai dati", per tutti i ruoli | modello che scrive (SQL) su viste in sola lettura | alto · medio |
| 4 | **Riepilogo del trimestre per la direzione** | commento generato dai numeri: fornitori in crescita o in calo, provvigioni bloccate e perché, tempi medi di conferma per fornitore, clienti fermi da mesi | accanto all'esportazione della liquidazione (§11) | modello che scrive | medio · basso |
| 5 | **Leggere le email dei fornitori** | classifica le risposte (conferma in arrivo, ritardo, articolo esaurito, altro) e le allega come nota alla pratica; sospende il sollecito se il fornitore ha già risposto | ingresso documenti (§6.5), pratica (§7.3) | decisione tipizzata (scelta) | medio · medio |
| 6 | **Previsioni semplici** | data probabile di conferma per fornitore, provvigioni attese nel trimestre, quanto si sblocca con il prossimo bollettino sul maturato | Oggi, Liquidazioni | statistiche sullo storico (nessun modello linguistico) | medio · basso |
| 7 | **Lettura che migliora nel tempo** | dalle correzioni in `documenti_campi` propone regole per fornitore (es. "su Ing's la data è in formato tedesco"), da approvare prima dell'uso | Impostazioni › Server di lettura (§7.15) | modello che scrive + approvazione | medio · basso |

**Decisioni tipizzate adatte al CRM** (domande chiuse con probabilità):

| Decisione | Tipo | Dove entra |
|---|---|---|
| Che documento è questo allegato? (ordine · conferma · fattura · nota di credito · bollettino · non riguarda Decobrands) | scelta | prima della lettura (§6.5): smista la coda, propone lo scarto di listini e bolle |
| Perché questa riga del bollettino non quadra? (cause dell'idea 1 + informazioni insufficienti) | scelta + probabilità | cerniera del bollettino |
| A quale pratica va questo documento? (fra le candidate) | scelta | Documenti, abbinamenti "da scegliere" |
| Cosa dice la risposta del fornitore? | scelta | email in arrivo |
| Questa conferma è anomala rispetto allo storico? | sì/no + punteggio | Oggi |
| Quanto è urgente questa voce? | punteggio | ordine dei gruppi di Oggi |
| Il totale letto è plausibile? | sì/no | secondo parere accanto all'affidabilità di GLM-OCR |

### 18.3 Strumenti

| Strumento | A cosa serve | Note |
|---|---|---|
| **Rizzo Flow** (Rizzo AI Academy, licenza Apache 2.0) — versione aperta e locale di **Jev** (TypeSafe) | **decisioni tipizzate** senza generare testo: sì/no, scelta fra opzioni (fino a 26), punteggio, numero, ciascuna con probabilità; risposta di astensione "informazioni insufficienti"; **taratura sui propri dati etichettati** (`rizzo calibrate`) | servizio HTTP locale (`/v1/decisions`, compatibile Jev su `/v1/systemone`); modelli da 4 e 1,7 miliardi di parametri, motore llama.cpp, schede NVIDIA/AMD/Intel/Apple o processore. **Progetto giovane**: provato dai manutentori solo su Windows con scheda NVIDIA, **non protetto per l'esposizione in rete**, nessun limite alle richieste → solo dietro il server del CRM, mai raggiungibile da fuori. Stessa interfaccia del servizio commerciale Jev: si può passare dall'uno all'altro |
| **Modello che scrive, in locale** (modello aperto da 7–14 miliardi di parametri, da scegliere nella prova) servito da **vLLM** | spiegazioni, contestazioni e solleciti in tedesco/inglese, riepiloghi, interrogazioni in sola lettura (idea 3) | stesso server e stesso vLLM di GLM-OCR (§6.5); la memoria video necessaria si misura nella prova |
| **Statistiche sullo storico** (nel motore del CRM) | anomalie (idea 2), previsioni (idea 6) | nessun modello: medie, deviazioni, tempi per fornitore |
| **Viste in sola lettura** sul database | base per le domande sui dati (idea 3) | utente del database con soli permessi di lettura; tempo massimo per interrogazione |

### 18.4 Prova consigliata (prima di qualsiasi interfaccia)

1. **Due decisioni**: *tipo di allegato* e *causa delle differenze nei bollettini*.
2. Il servizio gira **in ombra** per un mese: per ogni caso registra proposta e
   probabilità, senza mostrarle; l'operatore lavora come sempre e la sua scelta diventa
   l'etichetta.
3. **Taratura** di Rizzo Flow sulle etichette raccolte.
4. **Misure**: % di proposte corrette sopra soglia, % di astensioni, errori gravi (es.
   "accetta" proposto dove l'operatore ha contestato), tempo per decisione.
5. **Decisione**: si mostra in interfaccia solo la decisione con **≥ 90 % di proposte
   corrette sopra soglia**; le altre restano in ombra o si abbandonano.
6. Poi, nello stesso modo, le idee 1 (testo della contestazione) e 2.

**Stima indicativa** (da quotare a parte): installazione dei servizi e registro dei
suggerimenti 6 h; prova in ombra delle due decisioni 8 h; taratura e relazione 4 h.

### 18.5 Dati

Tabella `suggerimenti`: `id`, `tipo` (es. `tipo_allegato`, `causa_differenza`),
`riferimento` (documento, riga di bollettino, pratica), `stato_in_ingresso` JSONB (i dati
passati al modello), `proposta`, `probabilita`, `modello` (nome e versione),
`mostrata` (bool), `scelta_operatore`, `scelto_da`, `scelto_il`. Conservazione come il
registro eventi (§7.15). È la base per tarare e misurare.

### 18.6 Fonti

- [Rizzo Flow — repository (Rizzo AI Academy)](https://github.com/Rizzo-AI-Academy/rizzo-flow),
  consultato il 16/10/2026: scopo ("decisioni tipizzate da un modello senza generare
  testo"), primitive e servizio HTTP, modelli e motore, licenza, avvertenze su sicurezza e
  piattaforme provate.
- vLLM e GLM-OCR: vedi §6.6.4.

---

## 19. Registro delle decisioni: cosa e perché

Una riga per ogni scelta che cambia il comportamento. **Perché** è il motivo per cui la
scelta è stata fatta: serve a chi sviluppa per capire cosa non va "semplificato" e a chi
rilegge per sapere da dove viene una regola. Le decisioni nuove si aggiungono in fondo.

Le decisioni fino a D-13 hanno il loro perché solo qui: nelle sezioni che descrivono non c'è
una riga *Perché (D-nn)* separata (A9-07).

| # | Data | Decisione | Perché | Chi | Dove |
|---|---|---|---|---|---|
| D-01 | 15/10/2026 | Clienti e fornitori solo da Integra, in sola lettura; i subagenti si gestiscono per intero nel CRM | un'anagrafica deve avere un solo padrone; i subagenti in Integra non ci sono | Decobrands | §4.1, §7.6 |
| D-02 | 15/10/2026 | Si torna sempre alla schermata precedente nello stesso punto (filtri, ordinamento, pagina, scorrimento, scheda) | il lavoro è un andare e tornare fra elenco e dettaglio: ricominciare ogni volta da capo fa perdere il filo | Ugo | §7.12 |
| D-03 | 15/10/2026 | Bollettino atteso entro un giorno fissato per fornitore; il sollecito parte solo dopo | i fornitori mandano il bollettino in giorni diversi: sollecitare a fine mese sarebbe sbagliato e fastidioso | Decobrands | §4.2.1, §5.6 |
| D-04 | 15/10/2026 | Esportazione della liquidazione per trimestre: completa per subagente, un subagente o solo riepilogo; Excel, PDF identico, CSV | sono i tre usi reali: invio a tutti, invio a uno, controllo dei totali | Decobrands | §11 |
| D-05 | 15/10/2026 | Ruolo *sola lettura*: consulta ed esporta, non modifica; i permessi si verificano anche sul server | chi deve solo vedere non deve poter cambiare; nascondere i pulsanti non basta | Ugo | §8.3 |
| D-06 | 15/10/2026 | Evidenziazione del valore nel documento **da verificare** con la prova F0-A7 | funziona bene su PDF da gestionale ed Excel, non è garantita sugli scansionati: il cliente non deve darla per certa | Ugo | §6.6 |
| D-07 | 16/10/2026 | Dati di Integra letti da viste sul database con sincronizzazione ogni pochi secondi, non da file | dati sempre allineati senza import manuali; utente in sola lettura, nessuna scrittura su Integra | Ugo | §4.1, §4.5 |
| D-08 | 16/10/2026 | Vendita diretta (ordini cliente, articoli, giacenze, alias e kit) progettata ma **spenta**: ampliamento futuro | prima va messo in esercizio il lavoro di agenzia; il progetto resta pronto e documentato | Ugo | §17 |
| D-09 | 16/10/2026 | Componente **Schede** dove un dettaglio impila più tabelle; i segmenti restano per filtrare le stesse righe | evitare colonne che scorrono e tabelle tagliate; due strumenti diversi per due bisogni diversi | Ugo | §16.4 |
| D-10 | 16/10/2026 | Paginazione delle tabelle con ordinamento, filtri e totali su **tutto** l'elenco | ordinare solo la pagina darebbe risultati sbagliati (il "più alto" non sarebbe il più alto) | Ugo | §16.4 |
| D-11 | 16/10/2026 (rivista 18/10/2026) | Incassi: Decobrands non incassa; sul fatturato storno e riaccredito, sul maturato riconoscimento nel mese del pagamento; **storno alla liquidazione successiva**: mese dopo per Decobrands, trimestre dopo per il subagente come voce negativa | è come lavorano i fornitori; il subagente non restituisce soldi già pagati ma si vede la voce negativa nel prospetto successivo | Decobrands (Matteo Caironi) | §5.5, §5.14, §7.8 |
| D-12 | 18/10/2026 | Pratica a schede: *Riepilogo* (provvigione, incasso, documenti) e *Righe a confronto* con il contatore delle variazioni nel titolo; tolto il percorso "Pratiche › …" nelle pagine di dettaglio | in questa fase le righe contano solo quando qualcosa non torna; il percorso ripeteva il *Torna a …* | Ugo | §7.3, §16.4 |
| D-13 | 18/10/2026 | Ogni decisione si registra con il suo perché (questa tabella) | chi sviluppa deve sapere cosa non "semplificare"; più facile far funzionare il codice come previsto | Ugo | §16.5 |
| D-14 | 18/10/2026 | Bollettini: periodo scelto *Da*–*A* di **al massimo 6 mesi**, con *Mese prima/dopo*, filtro fornitore e *Con qualcosa da fare* | oltre 6 colonne la matrice non è leggibile; con molti fornitori bisogna poter isolarne uno | Ugo | §7.7 |
| D-15 | 18/10/2026 | Documenti: dettaglio a schede, prima l'azione proposta (*Pratica proposta* · *Nuova pratica* · *Scegli la pratica* · *Cosa farne*), poi *Righe lette* con il contatore delle righe incerte e avviso nella prima scheda | si apre un documento per decidere cosa farne; le righe contano solo se la lettura è incerta; stessa logica e stesso aspetto della pratica (D-12) | Ugo | §7.9 |
| D-16 | 18/10/2026 | Bollettini: **sempre 6 mesi**, completati da soli dentro i mesi con dati; scelta del mese d'inizio con un selettore anno + griglia dei mesi con scorciatoie (come il selettore di date del Portale Luis), al posto delle tendine *Da*/*A* | una tendina con tutti i mesi diventa ingestibile in pochi anni; con sempre 6 colonne la matrice è sempre piena e leggibile | Ugo | §7.7, §16.4 |
| D-17 | 18/10/2026 | Liquidazioni a schede: prima la **Sintesi** (4 numeri con confronto sul trimestre precedente, andamento dell'anno, fatturato per fornitore, provvigioni generate per subagente), poi *Subagenti e documenti*; grafici con Chart.js (MIT) | il dettaglio delle fatture serve per controllare ma non è l'informazione principale; serve un'idea immediata di fatturato, margine e produttività | Ugo | §7.8, §16.4 |
| D-18 | 18/10/2026 | Liquidazioni: tornano le due colonne; nel pannello di destra le schede *Documenti* e *Report subagenti* (piccolo report per subagente); la BI completa va in una pagina nuova **Analisi** (periodo 3/6/12 mesi, filtri, filtro incrociato con un clic, confronto, tabella raggruppabile, esportazione Excel con grafici, PDF, CSV). Sostituisce la *Sintesi* di D-17 | la liquidazione serve a controllare e chiudere un trimestre: il report deve stare accanto ai documenti, non al loro posto; l'analisi ha bisogno di periodi liberi, filtri ed esportazione, che in una scheda del trimestre non entrano | Ugo | §7.8, §7.22, §16.4 |
| D-19 | 18/10/2026 | Analisi per **competenza = data del documento**; storni e riaccrediti esclusi dai fatti; grafici per dimensione che ignorano il proprio filtro e mettono in risalto la scelta | numeri stabili nel tempo (non cambiano all'arrivo di un bollettino) e confrontabili fra periodi; lo storno sposta il pagamento, non il fatturato; vedere la voce scelta sul totale evita di perdere il contesto | Ugo | §7.22 |
| D-20 | 18/10/2026 | Campi di ricerca con selezione **singola o multipla** nello stesso componente (quello della ricerca articoli); filtri fornitori, subagenti e clienti dell'Analisi a selezione multipla, al posto delle tendine | con molti clienti una tendina non si usa; confrontare due o tre fornitori o subagenti insieme è una domanda frequente; un solo componente riutilizzabile evita due modi diversi di cercare la stessa cosa. Le righe dei documenti restano a selezione singola: una riga ha un solo articolo | Ugo | §7.22, §16.4 |
| D-21 | 18/10/2026 | Selezione multipla senza etichette nel campo: il campo mostra il nome della sola voce o *Filtro multiplo (n)*; le voci scelte stanno in alto nel menu, dove si tolgono; filtri sulla stessa riga del periodo; icone *Riepilogo dei filtri* e *Togli tutti i filtri*. Sostituisce le etichette nel campo di D-20 | con più voci le etichette allungavano i campi su più righe e spingevano giù la pagina; una riga sola lascia spazio ai numeri; il riepilogo mostra comunque tutto in un clic; applicare alla chiusura del menu evita di ridisegnare la pagina a ogni voce | Ugo | §7.22, §16.4 |
| D-22 | 18/10/2026 | Il modo di filtrare dell'Analisi diventa lo **standard** di tutte le barre dei filtri: entità con ricerca a selezione multipla (mai tendine), etichetta come segnaposto, riepilogo e azzeramento a icona; applicato a Pratiche (fornitore, cliente, subagente), Bollettini, Cliente → Pratiche | un solo modo di filtrare in tutta l'applicazione si impara una volta; le tendine non reggono centinaia di clienti; il riepilogo fa vedere in un clic perché un elenco è corto | Ugo | §16.4, §16.4.1, §7.2, §7.6, §7.7 |
| D-23 | 18/10/2026 | Numeri e conteggi: ricalcolati **dal vivo** a ogni cambio di filtro (il numero di un segmento conta con tutti gli altri filtri applicati); ai cambiamenti dei dati fatti da altri o dai servizi i contatori si aggiornano da soli, le tabelle no: avviso *Ci sono aggiornamenti · Aggiorna* | un numero che non corrisponde a ciò che si vede fa perdere fiducia e fa cercare lavoro inesistente; righe che si spostano mentre si clicca fanno sbagliare riga | Ugo | §16.4.2 |
| D-24 | 18/10/2026 | Il **prototipo ufficiale** è `prototipo-alternativo/`: è la sorgente di verità per struttura, stile (`stile.css`, Public Sans, niente Bootstrap), componenti, testi e numeri; `prototipo-crm/` resta come archivio | tutte le decisioni d'interfaccia degli ultimi lavori (D-09 → D-23) sono state prese e provate lì; tenere due riferimenti porterebbe chi sviluppa a copiare quello sbagliato | Ugo | V4, §3.1, §7.10, §16.1, §16.3, §16.4 |
| D-25 | 18/10/2026 | *(aggiornata da D-51: la data deve essere dopo l'ultima chiusura, non dopo l'ultima versione)* Percentuali dei fornitori **con data di validità**: *Nuove percentuali da una data* crea una nuova versione; ogni documento si calcola con la versione in vigore alla sua data; resta il congelamento alla verifica del bollettino. Chiude B3 | le condizioni cambiano dal periodo in cui vengono riviste; il solo congelamento non copriva i documenti in attesa del bollettino né l'Analisi dei periodi passati; il cliente l'ha già vista nel prototipo | Ugo | §4.2.2, §5.11, §7.4, §10 |
| D-26 | 18/10/2026 | *(aggiornata da D-51: periodo proprio, niente copie sulla nuova versione)* Le **eccezioni personali** dei subagenti si inseriscono, modificano ed eliminano nel CRM (scheda del subagente) e il motore le applica; passano alla nuova versione delle percentuali. Chiude B1 | tutto il calcolo delle provvigioni sta nel CRM: un'eccezione gestita fuori non compare in liquidazione e Analisi | Ugo | §4.2.3, §5.2, §7.5, §8.1, §15.2.2 |
| D-27 | 18/10/2026 | Regole del subagente: **% dell'agenzia** (per cliente × fornitore), **una fattura al mese** (la prima o la più alta), **correzione sul singolo documento** con motivo obbligatorio; ordine: correzione → mensile → agenzia → eccezione → scaglione. Lo sconto fittizio non serve più | gli accordi con i subagenti sono vari e non prevedibili (caso Bastasin): tre livelli coprono ogni caso senza toccare il codice; il fornitore resta controllato nel bollettino; ogni scostamento è motivato e tracciato | Ugo | §4.2.6, §4.2.7.2, §5.2, §7.6, §7.8, §10, D-26 |
| D-28 | 18/10/2026 | **Ogni calcolo e operazione sensibile solo sul backend, partendo dal database, MAI da dati presi dal frontend**; il client mostra e invia solo scelte; il server ricarica, ricontrolla, ricalcola | dal browser si può alterare qualsiasi valore; provvigioni e liquidazioni sono soldi; registro eventi e permessi devono essere affidabili | Ugo | V12, §2, §10, §15.1, §16.5 |
| D-29 | 19/10/2026 | Il CRM si **stacca dalla Gestione Ordini**: database e utenti propri, nessuna tabella della Gestione Ordini né in lettura né in scrittura; la Gestione Ordini resta in esercizio, separata, e il CRM la ingloberà con la vendita diretta (§17), migrandone i dati | la Gestione Ordini è la vendita diretta, oggi spenta: tenerle separate evita di sovrapporre le prove dei due flussi; legare utenti e sessioni a un'app che verrà sostituita obbligava a compatibilità (bcrypt, sessioni, ruoli) da buttare dopo | Ugo | §1, V2, §3.3, §4.1, §4.2.18, §17 |
| D-30 | 19/10/2026 | ~~Sostituita da D-39~~ **Accesso misto, solo su invito**: Microsoft 365 (Entra ID, OpenID Connect) per gli account Decobrands, link monouso via email per gli altri; nessuna password nel CRM; l'amministratore invita e sceglie il modo; il link fa da riserva se Microsoft non risponde | Decobrands usa Microsoft 365: niente password da gestire e accesso tolto insieme all'account; il link copre subagenti ed esterni; l'invito impedisce l'accesso a chiunque abbia un account Microsoft | Ugo | V3, §3.3, §4.2.18, §7.13, §7.15, §8.3, §15.2.1 |
| D-31 | 19/10/2026 | **Registro unico** `registro`: eventi e anomalie (errori dell'app, problemi dei servizi, errori di lettura) in una tabella con campi comuni (quando, genere, livello, codice, servizio, entità, utente, messaggio, operazione) e `dettaglio` JSON controllato da uno schema per codice; le anomalie hanno una vita (aperta · vista · chiusa) e si contano invece di ripetersi; Stato del sistema è una vista del registro. Sostituisce `eventi_app` e `servizi_problemi` | un solo posto dove guardare e una sola storia per documento o pratica; i campi comuni bastano a filtrare, il JSON tiene i dettagli senza colonne nuove, lo schema impedisce il testo libero | Ugo | V10, §4.2.11, §4.2.15, §7.11, §7.14, §15 |
| D-32 | 19/10/2026 | Le viste di Integra stanno in un **database PostgreSQL ponte** preparato da Ugo e collegato a Integra; il CRM legge solo da lì, in sola lettura; colonne e chiavi si fissano sui dati veri (F0-A8) | le viste si provano e si correggono senza toccare Integra; il CRM parla solo PostgreSQL; un guasto di Integra resta fuori dal CRM | Ugo | §4.5, §5.14, §7.15 |
| D-33 | 29/10/2026 | Schema completato: tabelle `liquidazioni` (trimestri chiusi con fotografia del prospetto), `clienti` (copia locale di `v_clienti`), `sessioni` con `utente_id` calcolato; `ordine_cliente_id` senza FK fino alla vendita diretta; chi opera sui documenti è una FK verso `utenti` | la spec non diceva dove salvare trimestri chiusi e clienti sincronizzati; chiudere le sessioni di un utente disattivato e tracciare ogni operazione per utente richiede legami espliciti | Ugo | §4.2.18–§4.2.20, §4.3 |
| D-34 | 29/10/2026 | Revisione dello schema prima del codice: `UNIQUE(cliente_piva, fornitore_id) WHERE attivo` su `interscambio`; `bollettini_righe.documento_id`, `ordini_fornitore_documenti.liquidazione_id`, `arrivo_id` e `fattura_id` (al posto di `fattura_riferimento`); tolti `fattura_*` e `att_filename_*` dalla pratica, totali e allegato dal bollettino, `fornitori.discount`; `differenza` calcolata dal database; NOT NULL su ordine, documenti e righe del bollettino; ON DELETE RESTRICT verso `utenti` su correzioni e liquidazioni; nomi in italiano (`tipo_provvigione` `maturato`/`fatturato`, `sconto`, `pct_personale`, `creato_il`, `modificato_il`); `fornitori` sincronizzati come `clienti`; file dei documenti su disco | il vincolo di prima non garantiva un solo subagente per cliente; senza legami la riconciliazione e lo storno alla liquidazione successiva (D-11) non sono ricostruibili; i dati doppi divergono; a database vuoto cambiare costa poco | Ugo | §4.2, §4.3, §4.4 |
| D-35 | 29/10/2026 | `interscambio` con `valido_dal`/`valido_al` ed EXCLUDE sui periodi (al posto di `attivo`); FK RESTRICT verso subagenti e fornitori; scaglioni a sola soglia (`sconto_max` tolto) e CHECK 0–100 sulle percentuali; `clienti.piva` non univoca; `bollettini_testata.chiuso_il`/`chiuso_da`; `bollettini_righe.liquidazione_id` per storni e riaccrediti; prova automatica dei vincoli (`app/backend/test/vincoli.spec.ts`, `npm test`) | un cambio di subagente non deve spostare le provvigioni passate; la sovrapposizione degli scaglioni era possibile; la P.IVA univoca avrebbe fermato la sincronizzazione; lo storno del bollettino va nel trimestre successivo alla chiusura e va legato a quel trimestre (D-11) | Ugo | §4.2.2, §4.2.6, §4.2.9, §4.2.10, §4.2.20, §10 |
| D-36 | 29/10/2026 | Regola V13: ogni operazione che scrive su più tabelle o più righe legate si esegue in una sola transazione (`prisma.$transaction`, registro compreso); chiusure, verifiche e abbinamenti bloccano la riga con `SELECT … FOR UPDATE`; email e chiamate al servizio di lettura solo dopo il commit; il file su disco si scrive prima, con l'impronta come nome | un'operazione a metà lascia provvigioni sbagliate che nessuno vede; due chiusure contemporanee dello stesso trimestre non devono riuscire entrambe | Ugo | §2 (V13), §15.3 |
| D-37 | 30/10/2026 | Schema snellito prima del codice: tolti `provvigioni_scaglioni.ordinamento` (l'ordine è la soglia), `ordini_fornitore_testata.cliente_ragione_sociale` (si legge da `clienti`), `conferma_scadenza` (si calcola), `documenti_in_arrivo.dati_letti` e `affidabilita` (i valori letti stanno solo in `documenti_campi`); le migrazioni unite in una sola `iniziale`. `agenti` e `ordine_cliente_id` restano per la vendita diretta | colonne morte o copie di dati che si possono calcolare divergono; a database vuoto unire le migrazioni costa zero | Ugo | §4.2.2, §4.2.7, §4.2.12, §5, §6.1 |
| D-38 | 30/10/2026 | `GET /api/accesso/io` con ruolo e permessi calcolati dal server; nella sessione solo `utente_id`, ruolo e `attivo` riletti a ogni richiesta; sessione rigenerata all'accesso, distrutta (riga cancellata) all'uscita; senza sessione si va a `/accesso` e si torna alla pagina chiesta | il frontend non deve indovinare i permessi; declassare o disattivare un utente deve valere subito; evita la session fixation | Ugo | §8.3 |
| D-39 | 30/10/2026 | **Accesso con nome utente (o email) e password, come nella Gestione Ordini Decobrands** (sostituisce D-30): un **superutente** unico, creato da un comando del server, crea gli amministratori; gli amministratori creano operatori e utenti in sola lettura; password provvisoria per email da cambiare al primo accesso; password dimenticata con link monouso di 1 ora; *Reimposta la password* dall'amministratore; hash `scrypt`; tolti Microsoft 365 e il link di accesso | Decobrands lavora già così nella Gestione Ordini, che inglobierà il CRM (D-29); nessuna dipendenza dalla registrazione in Entra ID; chi crea gli amministratori è uno solo e non si può togliere per errore | Ugo | V3, §3.3, §4.2.18, §7.13, §8.3, §15.2.1 |
| D-40 | 30/10/2026 | Le prove automatiche del backend (`npm test`) girano su un database a parte, `decobrands_test` (stesse migrazioni), una alla volta; mai su `decobrands_db` | con i primi utenti veri le prove non possono più contare su un database vuoto, e non devono toccare i dati di chi lavora (il superutente è uno solo) | Ugo | `app/backend/test/ambiente.ts`, `app/README.md` |
| D-41 | 30/10/2026 | Limite ai tentativi in due livelli: per persona (IP + nome utente, email, link o sessione; 10 in 15 minuti) e per IP (100 in 15 minuti per operazione); valori nel `.env`, finestra che si azzera da sola | in un ufficio tutti escono con lo stesso IP: un limite solo per IP (com'era per *Password dimenticata*) bloccava i colleghi; il tetto per IP serve contro chi prova molti nomi o email. Una pagina in Impostazioni non serve finché i valori non cambiano spesso | Ugo | `app/backend/src/app.module.ts` (`limiti`), `src/accesso.ts` (`TentativiGuard`), `.env.example` |
| D-42 | 30/10/2026 | Nuova pagina di accesso: tutta scura come la barra, logo bianco al centro, modulo in una finestra che si apre al primo tasto o tocco (il tasto finisce nel primo campo, che ha il focus); *Password dimenticata* sostituisce il contenuto della stessa finestra; nessuna presentazione dai link delle email | ingresso col marchio Decobrands senza far perdere tempo: chi scrive subito non perde il primo tasto, il gestore delle password trova il modulo già nella pagina | Ugo | `prototipo-alternativo/assets/componenti.js` (`CRM.Accesso`), `stile.css`, §7.0 |
| D-43 | 30/10/2026 | Il CRM è il **primo pezzo del Sistema Informativo Aziendale** di Decobrands (portale aziendale generale): sottotitolo "Sistema Informativo Aziendale" al posto di "Pratiche e provvigioni"; software **proprietario**, sviluppato internamente, con licenza d'uso riservata (non open source) e copyright Decobrands S.r.l. in fondo all'accesso, finestra *Licenza d'uso* con titolarità, uso concesso, divieti, riservatezza e componenti di terzi | i moduli successivi (vendita diretta, Gestione Ordini, altro) entrano nello stesso portale: nomi, accessi, utenti e stile vanno pensati per il portale, non solo per le provvigioni; il software è sviluppato internamente in linea con le regole del **patent box** (software protetto da diritto d'autore, L. 633/1941): la titolarità va dichiarata. Il testo della licenza è una **bozza da far verificare al consulente** | Ugo | `prototipo-alternativo/assets/guida.js` (`CRM.LICENZA`), `componenti.js` (`CRM.Accesso`, `CRM.Barra`), §1, §7.0 |
| D-44 | 30/10/2026 | L'app è per **computer e tablet**, niente telefono: sotto i 744 px di larghezza si ferma a monte (anche prima dell'accesso) con una pagina che chiede uno schermo più grande; controllo sulla larghezza con il CSS, non sul tipo di dispositivo; prove e schermate a 1440 e 768 px | strumento d'ufficio con tabelle larghe e colonne affiancate: sul telefono sarebbe poco usabile e adattarlo costerebbe molto; meglio fermare che mostrare schermate tagliate | Ugo | V6, §16.6, CLAUDE.md regola 5 |
| D-45 | 30/10/2026 | **Ruoli per area**: ruolo di Sistema (`superutente`, `amministratore`, `utente`) più un livello per ogni area (`lettura`, `operatore`, `responsabile`, tabella `utenti_aree`); anche superutente e amministratori entrano in un'area solo con un livello; permessi `area.attività` (§8.3); **nessuno dà più di quello che ha** (livello ≤ al proprio in ogni area, niente gestione di chi è più in alto; solo il superutente senza limite); scheda *Permessi* a sezioni per area | il CRM è un'area di un portale più grande (D-43): servono confini fra le aree e fra lavoro quotidiano e azioni definitive; adesso tocca solo la gestione utenti | Ugo | §8.3, §4.2.18, §7.13, `app/backend/src/accesso.ts`, `utenti.ts`, prototipo `motore.js` |
| D-46 | 30/10/2026 | **Anagrafiche con identità stabile e versioni**: id nostro che non cambia, codici di Integra in `codici_esterni`, dati descrittivi in tabelle di versioni che si aggiungono soltanto; i **fatti** puntano a identità **e** versione (chiave esterna composta), la versione è quella corrente quando la riga nasce; le **configurazioni** puntano solo all'identità | proposta di Ugo (versione agganciata, atomica, senza affidarsi alle date) unita a identità stabile e codici esterni: si conserva lo storico senza spezzare il cliente, e il modello regge quando il CRM diventerà la fonte di verità aziendale (D-43) | Ugo | §4.2, §4.3, §4.4, §4.6, §4.5, piano F1-A7 |
| D-47 | 01/11/2026 | **Menu per area**: in cima alla barra le aree che l'utente può aprire (Provvigioni, Dati, Gestione), sotto solo le voci dell'area della pagina; rotte invariate; Guida comune; l'area *Anagrafiche* diventa **Dati** (permessi `dati.*`); **menu spostato da D-53** | Il portale crescerà per aree (D-43): una barra unica si allungherebbe per tutti; per area si vede solo il lavoro che si sta facendo. *Dati* conterrà tutte le tabelle, non solo le anagrafiche | Ugo | §7.10, §8.3, piano F0-A4 |
| D-48 | 01/11/2026 | **Identità e versioni nello schema subito** (fase 2a), non in F1: in F1-A7 resta solo la sincronizzazione che aggiunge le versioni | Le tabelle sono vuote ora; seed (2b) e motore (2c) vengono prima di F1 e nascono già sulle tabelle giuste, invece di essere rifatti e migrati dopo | Ugo | §4.2, §4.3, §4.6, piano F0-A2, F1-A7 |
| D-49 | 01/11/2026 | **Arrotondamento contabile** al centesimo (il mezzo si allontana dallo zero: −0,005 → −0,01), nel motore e nel prototipo; **decisione sulla riga del bollettino** salvata sulla riga (`bollettini_righe.decisione`: accettato · contestato · attendere; motivo obbligatorio per contestare; chi e quando) | Il prototipo usava `Math.round`, che sui negativi va verso lo zero (−0,005 → 0,00). La decisione presa su una riga che non quadra deve restare nello storico e tenerla chiusa anche quando il motore ricalcola | Ugo | §4.2.10, §7.7, `motore.ts` `r2` |
| D-50 | 02/11/2026 | **Percentuale e regola mensile dell'agenzia solo al responsabile**: `pct_subagente` e `regola_mensile` di `interscambio` richiedono `dati.condizioni`; l'operatore (`dati.modifica`) gestisce il resto dell'agenzia | Cambiano i soldi del subagente come le eccezioni personali; un operatore non deve poter mettere 100 % | Ugo | §7.6, §8.1 |
| D-51 | 02/11/2026 | **Un cambio vale da una data in poi, e la data non può cadere in un periodo chiuso.** Ultima chiusura del fornitore = la più recente fra la fine del mese dell'ultimo bollettino chiuso (verificato o contestato, `chiuso_il` valorizzato) e la fine dell'ultimo trimestre liquidato (`ultimaChiusura`). Percentuali: versione nuova da una data dopo l'ultima chiusura (anche fra due esistenti, con le soglie della precedente e tutte presenti nella successiva); correzione ed eliminazione solo dopo l'ultima chiusura e senza lasciare eccezioni senza soglia. Eccezioni personali staccate dalle versioni: (fornitore, subagente, sconto, %, `valido_dal`, `valido_al` escluso come `interscambio`) con EXCLUDE sui periodi; cambio di % da una data, fine, correzione ed eliminazione solo dopo l'ultima chiusura; niente copie. Permesso `dati.condizioni`. Ogni scrittura blocca la riga del fornitore. **Regola per F3/F4:** la verifica (o contestazione) di un bollettino e la chiusura di un trimestre bloccano la stessa riga del fornitore (`SELECT … FOR UPDATE` su `fornitori`, per ogni fornitore toccato), altrimenti una correzione contemporanea passa prima della chiusura | Niente copie delle eccezioni né casi strani con le versioni future; i soldi chiusi (bollettini verificati, trimestri pagati) non cambiano; le correzioni restano libere dove non hanno ancora effetto | Ugo | §4.2.2, §4.2.3, §5.2, §5.11, §7.4, §7.5, §10, §15.2.2 |
| D-53 | 03/11/2026 | **Il menu delle aree sta nel menu dell'utente.** In cima alla barra resta il nome dell'area (icona e testo), solo come titolo. Cliccando sul riquadro dell'utente in fondo si apre verso l'alto un menu con: email, aree con la spunta su quella aperta, separatore, *Cambia la password* e *Guida*, separatore, *Esci*. Spariscono dalla barra il pulsante dell'area, l'icona Esci, il link *Cambia la password* e la voce Guida. Esc, clic fuori e scelta chiudono; frecce su/giù spostano il fuoco; alla chiusura torna al pulsante. Con una sola area il menu si apre senza la parte delle aree; sul tablet si apre verso il basso | Un solo posto per tutto quello che riguarda chi sei e dove lavori, come nelle app che gli utenti usano già; la barra resta per le voci dell'area | Ugo | §7.1, §7.10, `Barra.tsx`, `componenti.js` |
| D-54 | 03/11/2026 | **Documenti fiscali e canale dei file sul server.** Rotte sotto `/api/pratiche/:id/documenti` (come l'elenco); il browser manda l'importo digitato, sempre positivo: il server mette il segno, calcola lo storno totale (quanto resta della fattura) e rifiuta la nota oltre il residuo; numero unico per fornitore, ammesso su un'altra pratica solo con la stessa data (multi-ordine); liquidato = non si corregge né si annulla. Un solo ingresso dei file (`riceviDocumento`): PDF dal contenuto, limite in `.env`, file su disco prima della transazione con l'impronta come nome; se la transazione fallisce il file resta orfano e si riusa; un file scartato ricaricato torna in coda. Blocchi in ordine fisso, come D-51: fornitore (`FOR UPDATE`, così il numero unico non ha corse), poi le pratiche per id (tutte le copie di una fattura multi-ordine), poi i documenti in arrivo. L'evento `stato.change_state` lo scrive solo `aggiornaPratica` (anche `pratiche:ricalcola`, motivo "ricalcolo") | Un valore calcolato non arriva mai dal browser (V12); il file prima del commit evita una riga che punta a un file mai scritto, mentre un file senza riga non fa danni e lo stesso contenuto ha lo stesso nome; toglierlo al rollback potrebbe cancellare il file di un invio uguale arrivato insieme | Ugo | §4.2.7.1, §6.5, §8.1, §15.2.4 |
| D-55 | 03/11/2026 | ~~Sostituita da D-60~~ **PDF in cartelle per anno e giorno di caricamento**: `DOCUMENTI_DIR/AAAA/AAAAMMGG/<impronta>.pdf` (giorno di Roma), percorso salvato in `documenti_in_arrivo.file_percorso`; un file scartato e ricaricato resta dove era. | Un eventuale ricerca a mano sul server è facile; il nome resta l'impronta (niente nomi dal browser, doppioni riconosciuti); salvare il percorso evita di ricalcolarlo da una data che può cambiare. | Ugo | §6.5, §4.2 `documenti_in_arrivo`, `src/documenti.ts` |
| D-52 | 03/11/2026 | **Stato, importo e variazioni della pratica si salvano sulla testata; l'elenco delle pratiche si fa in SQL.** Il motore ricava dai documenti lo stato (`inviato` · `confermato` · `fatturato`), l'importo (`importoPratica`) e le variazioni fra le fasi (`haVariazioni` e scostamento); `aggiornaPratica(tx, id)` li scrive nella stessa transazione di ogni scrittura su documenti, righe o conferma (regola per F2-A3 e F6), bloccando la testata. Scadenza della conferma (data + giorni del fornitore) e subagente alla data (`interscambio`) non si salvano: li calcola la query. `GET /api/pratiche` filtra, conta i segmenti, somma, ordina e pagina nel database, con la stessa risposta di prima. Righe esistenti: `npm run pratiche:ricalcola`. Anche il dettaglio `GET /api/pratiche/:id` carica solo i dati della pratica (`caricaDatiPratica`: cliente, fornitore, scaglioni, eccezioni, agenzie e le pratiche dello stesso abbinamento e mese per D-27), con la stessa risposta | Elenco veloce anche con migliaia di pratiche (~10.000: da 1,5–1,8 s a 10–35 ms; dettaglio da ~1,5 s a 4–94 ms); lo stato resta del server e ricavato dai documenti, si salva solo il risultato; quello che dipende da oggi, dal fornitore o dalle agenzie si calcola per non doverlo riallineare | Ugo | §4.2.7, §7.2, §7.3, §9, §8.1 |
| D-56 | 03/11/2026 | **Decisione su un documento assente dal bollettino** nella tabella `bollettini_attese` (bollettino, documento, `attendere` · `contestato`, motivo, chi, quando; una per documento e bollettino), non fra le righe del fornitore; vale solo finché il documento manca: abbinare una riga al documento la toglie nella stessa transazione e il motore ignora le attese orfane; spostando una riga da D a E l'attesa di E si toglie e D torna mancante e da decidere. **Chiusura** con `PUT /api/bollettini/:id/stato`: `verificato` se tutte le righe quadrano o sono decise e nessuna è contestata, `contestato` se almeno una lo è. **Scelta:** anche `contestato` congela % e importi e chiude il mese (D-51), come il prototipo che scrive `chiuso_il`. Nessuna riapertura. Abbinamento a mano: un documento su una sola riga dello stesso tipo | Non confondere le righe del fornitore con le nostre decisioni: una riga finta a zero contava nei conteggi, rendeva il documento "già in un bollettino" e poteva sembrare riconosciuta. Storno e riaccredito stanno sulla stessa fattura della provvigione, quindi il vincolo è per tipo | Ugo | §4.2.10, §4.2.10.1, §7.7, §8.1, §15.2.5, `src/bollettino.ts` |
| D-57 | 03/11/2026 | **Chiusura del trimestre nell'app (F4-A1).** Blocca **tutti** i fornitori in ordine di id (`SELECT id FROM fornitori ORDER BY id FOR UPDATE`), poi controlla che la liquidazione non ci sia, ricalcola dal database e la crea (UNIQUE(anno, trimestre)); condizioni: trimestre finito, non chiuso, trimestre prima chiuso (salvo che non ci siano liquidazioni né documenti prima), nessun documento in attesa dei bollettini; 409 anche su `UNIQUE(anno, trimestre)`; transazione fino a 30 s. Una provvigione liquidabile non legata che cadrebbe in un trimestre chiuso va nel primo trimestre aperto dopo (`trimestreLiquidazione`, come gli storni D-11); un documento con `liquidazione_id` resta in quella liquidazione. Una voce di storno o riaccredito con `bollettini_righe.liquidazione_id` resta nel trimestre di quella liquidazione (`righeLiquidazione`): senza questa regola, chiuso il trimestre, `trimestreLiquidazione` la spostava nel successivo e la contava due volte. Il GET carica tutti i dati (`caricaDati`), il trimestre chiuso si legge dalla fotografia. Riapertura non prevista per ora | La chiusura cambia il periodo chiuso di tutti i fornitori (`ultimaChiusura`), quindi deve aspettare ogni verifica di bollettino o correzione di percentuali in corso; l'ordine fisso evita lo stallo. Niente provvigioni perse dopo una chiusura: il trimestre chiuso non si ricalcola, quindi quello che arriva dopo va avanti; chiudere in ordine evita trimestri aperti scoperti fra due chiusi. Il trimestre tocca documenti di altri periodi (maturato riconosciuto dopo, storni del trimestre prima, una fattura al mese): un caricamento parziale va pensato a parte, con la sua prova di coerenza | Ugo | §4.2.19, §7.8, §8.1, §15.2.6, `src/liquidazioni.ts`, `src/motore/motore.ts` |
| D-58 | 03/11/2026 | **Ritocchi al dettaglio del bollettino (F3-A2b).** Con righe aperte la barra dice quante ne mancano e *Vai alla prima* porta alla prima riga di *Da decidere* evidenziandola un attimo; l'abbinamento cerca fra **tutti** i documenti del fornitore (`GET /api/documenti/cerca`: fatture e note di credito di ogni periodo, per numero o cliente, mese del bollettino per primo, `su_riga` per quelli già usati), non solo fra quelli del mese; sotto gli **860 px** la cerniera si impila (documento e cliente, i due lati con la loro etichetta, la differenza in evidenza, i pulsanti sotto a tutta larghezza, intestazioni nascoste) con il **solo CSS** e le stesse classi nel prototipo; *Prepara la contestazione* (`GET /api/bollettini/:id/contestazione`) dà oggetto e testo composti dal server, modificabili, con *Copia* e *Scarica .txt* e senza inviare email | dire quante righe mancano e portarci con un clic evita di cercarle in una cerniera lunga; con i soli documenti del mese un documento registrato in ritardo o fuori mese non si poteva abbinare e si finiva per correggere i dati invece della riga; una cerniera che scorre di lato sul tablet nasconde i pulsanti di decisione; il testo della contestazione è un calcolo sulle righe (V12) e deve restare pronto da copiare, senza dipendere da un invio che il CRM non fa ancora (F5/F6) | Ugo (prompt OpenCode) | §7.7, §8.1, `stile.css`, `VistaBollettino.tsx` |
| D-59 | 03/11/2026 | **Caricamento con sagome** in tutta l'app: il titolo della pagina si vede subito e, finché i dati non arrivano, il resto è una sagoma con la forma del contenuto (segmenti, filtri, righe, riquadri, matrice) e le stesse altezze; niente zeri, «Nessun elemento» o testi vuoti; sotto i ~150 ms le sagome non compaiono; ai cambi di filtro la tabella resta con una leggera opacità (`.in-aggiornamento`). Componenti `Sagoma`, `SagomaTabella`, `SagomaSegmenti`, `SagomaRiquadri`, `SagomaMatrice`, `SagomaElenco`; hook `useSagome`; `DataTable` e `FilterBar` con `caricando` | la pagina non mostra mai zeri o testi vuoti finti e il layout non salta: un numero a 0 o «Nessuna pratica» mentre il server risponde sembra un dato vero e fa perdere fiducia; le righe che si spostano fanno sbagliare clic | Ugo | §16.4, §16.4.3, `componenti/Sagoma.tsx`, `stile.css` |
| D-60 | 03/11/2026 | **Un modello dei documenti della pratica per ogni fornitore** (sostituisce D-55 per i file): tipi `ordine` (1..n, il primo apre la pratica, gli altri si sommano), `conferma` e `proforma` (0..n, facoltative, solo tracciate: una delle due porta a *confermata*, la fattura porta a *fatturata* anche senza), `fattura` e `nota_credito` (le sole che toccano le provvigioni), `pagamento` (prova del pagamento del cliente, spesso una foto: solo il segno *pagato*), `altro` (archivio); tutti in `ordini_fornitore_documenti`, righe sul loro documento (`documento_id`), conferma tolta dalla testata. Numero pratica `OF/AAAA/NNN` dal server. Abbinamento a mano di un file in coda (`POST /api/documenti/:id/abbina`) con tipo e pratica scelti dalla persona, un ordine senza pratica la apre; spostamento di un documento in un'altra pratica dello stesso fornitore con le protezioni di D-54. Canale: PDF, JPEG e PNG dai byte; Excel rifiutati (415). Archivio per pratica: in coda `in_arrivo/AAAA/AAAAMMGG/<impronta>.<est>`, abbinato `pratiche/AAAA/AAAAMM/<numero pratica>/<tipo>_<numero o data>.<est>`, spostato dopo il commit (copia → percorso → via il vecchio). | I documenti veri mostrano fornitori diversi: chi non manda conferma, chi manda la proforma, chi spezza l'ordine; un modello legato ai nomi di uno solo (Auftrag/Rechnung) non regge. Solo fattura e nota di credito toccano le provvigioni, così bollettini, liquidazioni e Analisi non cambiano; il pagamento serve a sostenere una contestazione e a non proporre il sollecito. L'archivio per pratica con nomi leggibili si cerca facilmente anche a mano; l'impronta resta nel database per i doppioni. Gli Excel sono fogli firmati a mano dagli impiegati, non documenti del fornitore. | Ugo | §4.2.7, §4.2.7.1, §4.2.8, §4.2.12, §6.1, §6.5, §7.3, §8.1, §9, §15.2.4, `src/documenti.ts`, `src/motore/{dati,motore}.ts`, `src/pratiche.ts`, migrazione `documenti_pratica`, `prototipo-alternativo/assets/motore.js` |
| D-61 | 04/11/2026 | **Analisi (F4-A5): i numeri dal motore, non da SQL riscritto.** `GET /api/analisi` e `GET /api/analisi/esporta` caricano i dati con `caricaDati` e aggregano i fatti di `fattiAnalisi`; periodo, filtri, numeri con il confronto, grafici e tabella si calcolano sul server (V12). Excel e CSV con `exceljs` e scrittura diretta; il PDF e i grafici come immagine arrivano con F4-A3, che converte il medesimo `.xlsx` con LibreOffice. La vista `v_analisi_documenti` del piano non si fa adesso: si misura prima con `test/carico-analisi.ts` (10.000 pratiche: ~1,8 s per la pagina, ~2,0 s per l'Excel) e la decide Claude Code con una prova sui numeri, perché tocca i soldi. | Le regole delle provvigioni (percentuali datate, eccezioni, "una fattura al mese", maturato) sono una sola nel motore: riscriverle in SQL per la BI le farebbe divergere da liquidazioni e bollettini, che è il danno peggiore in un'applicazione di soldi. Aggregare sul server evita che il browser sommi (V12) e dà gli stessi importi alla pagina e ai file. A 10.000 pratiche 1,8 s è accettabile per una pagina consultata ogni tanto; la soglia per cambiare è misurata e documentata, non decisa a intuito. | Ugo (prompt OpenCode) | §7.22, §8.1, §11, `src/analisi.ts`, `app/frontend/app/(app)/analisi/`, `test/analisi.spec.ts`, `test/carico-analisi.ts` |
| D-62 | 04/11/2026 | **La nota della segnalazione d'incasso ha una colonna sua** (`nota_incasso`, §5.14): `PUT /api/documenti/:id/incasso` la scrive lì e non tocca `note`, che resta la nota del documento (§4.2.7.1); il motore la restituisce nello stato d'incasso (`nota`) e il dettaglio pratica la mostra. | `note` è un campo del documento, modificabile dal form della pratica: usarlo per la segnalazione cancellava la nota del documento senza dirlo, ed è perdita di dati su un'azione normale. Lo stato d'incasso ha già i suoi campi (`stato_incasso`, `insoluta_dal`, `pagata_il`, `fonte_incasso`): la nota sta con loro. Nessun backfill: l'endpoint non aveva ancora una pagina e una vecchia nota non si distingue da una nota del documento. | Ugo | §4.2.7.1, §5.14, §7.3, §8.1, `prisma/migrations/20261104090000_nota_incasso`, `src/incassi.ts`, `src/motore/motore.ts`, `test/incassi.spec.ts` |
| D-63 | 05/11/2026 | **Esportazione della liquidazione e PDF (F4-A3).** `GET /api/liquidazione/export?anno=&trimestre=&contenuto=completa\|subagente\|riepilogo&subagente=&formato=xlsx\|pdf\|csv` (`provvigioni.esporta`): i numeri vengono da `liquidazione` (le stesse funzioni della pagina, V12), Excel e CSV dallo stesso modello di fogli, il PDF è il medesimo `.xlsx` convertito con LibreOffice da `SOFFICE` (su Windows `soffice.com`), una conversione alla volta e 120 s di tempo massimo su questa macchina. La finestra *Esporta* è nella testata della pagina Liquidazioni; l'Analisi ha in più `formato=pdf` con la stessa conversione. Evento `export.export` (§15.2.6). I grafici come immagine nell'Excel restano fuori. | Un solo modello evita che file e pagina divergano; il PDF derivato dallo stesso `.xlsx` garantisce che contenuto e impaginazione coincidano, come chiede il cliente. Il browser manda solo anno, trimestre, contenuto, subagente e formato (V12). I grafici come immagine richiedono un motore grafico sul server e restano un lavoro a parte (D-61). | Ugo (prompt OpenCode) | §7.8, §7.22, §8.1, §11, §15.2.6, `src/esporta-liquidazione.ts`, `src/registro.ts`, `VistaLiquidazioni.tsx`, `VistaAnalisi.tsx` |
| D-64 | 06/11/2026 | **Il fuoco dei campi dei filtri è un bordo interno**, non un `outline` esterno: vale per la ricerca, le tendine e le date (`box-shadow` interna in `stile.css`; la regola sta in §16.4.1). | L'outline esterno finisce sotto il menu aperto (tendina nativa o menu della ricerca) e viene tagliato dai contenitori che non scorrono: il campo sembra perdere il bordo quando lo si apre. La ricerca aveva già questa correzione; ora vale per tutti i campi dei filtri, così non si rifà l'errore. | Ugo | §16.4.1, `app/frontend/app/stile/stile.css`, `componenti/FilterBar.tsx` |
| D-65 | 06/11/2026 | **Impostazioni (F5-A6): sei sezioni** (`azienda`, `casella`, `lettura`, `posta`, `integra`, `conservazione`; `accesso` non si usa più, D-39, ma il vincolo del database la ammette), **segreti cifrati** con AES-256-GCM (chiave = SHA-256 di `SEGRETI_CHIAVE`), mai riletti e mai nel registro; **prova la connessione sui valori salvati** (imapflow, nodemailer, `GET /models`, pool del ponte), una prova fallita è `200 {ok:false}` non un 500; le impostazioni si usano davvero (posta in uscita, Integra, conservazione, righe per pagina, intestazione delle esportazioni). I campi di connessione partono vuoti. | Segreti e connessioni si gestiscono in un posto solo, cifrati a riposo e sostituibili, senza mai riesporli; una sezione salvata ma ignorata è un errore perché i servizi devono comportarsi come configurato; una prova fallita non deve sembrare un guasto dell'app. L'evento `crud/update` su `impostazione` con `prima`/`dopo` dei soli campi cambiati, e il riferimento `/impostazioni/:chiave` nel registro, chiudono il ciclo di tracciabilità. | Ugo (prompt OpenCode) | §4.2.14, §7.15, §8.1, §15.2.8, §15.7, `src/segreto.ts`, `src/impostazioni.ts`, `src/impostazioni-api.ts`, `src/posta.ts`, `src/integra.ts`, `src/registro.ts`, `app/(app)/impostazioni/`, `test/impostazioni.spec.ts` |
| D-66 | 06/11/2026 | **Ingresso documenti, ricezione e coda (F6-A1).** La casella si legge con `imapflow` ogni N minuti (Impostazioni → Casella) e gli allegati PDF/JPEG/PNG entrano nella coda comune con `riceviDocumento`; i doppioni si ignorano, un allegato non PDF né foto apre `casella.allegato`, un'email senza allegati `casella.vuota`, e ogni email lavorata si sposta nella cartella delle lette così non si rilegge al giro dopo. La coda è la tabella: `prelevaDocumento` (`SELECT … FOR UPDATE SKIP LOCKED`, stato `in_lettura` e tentativo nella stessa transazione) e `letturaFallita` (torna `in_coda` o, al terzo tentativo, `errore` con l'anomalia `lettura.fallita`) sono le funzioni che userà F6-A2; nessuna coda esterna. `casella.connessione` si apre solo al terzo giro fallito di fila e si chiude al primo riuscito, `casella.cartella` subito quando manca una delle due cartelle. | La lettura della posta e la coda sono i due attrezzi dell'ingresso: la prima porta i file nella tabella comune (già pronta con `riceviDocumento`, che controlla i formati dai byte e scarta i doppioni), la seconda dà al lettore un prelievo senza corse (`SKIP LOCKED`) e i tentativi senza perdere i file. Spostare le email lette evita di rileggere sempre tutto e di aprire anomalie su doppioni che si scarterebbero da soli. | Ugo (prompt OpenCode) | §6.5 punti 1–2, §7.14.1, §7.14.3, §15.2.4, `src/casella.ts`, `src/documenti.ts` (`prelevaDocumento`, `letturaFallita`), `src/registro.ts`, `test/casella.spec.ts`, `test/coda.spec.ts` |
| D-67 | 06/11/2026 | **Il lettore è un connettore; il primo è LlamaCloud UE.** La sezione *Server di lettura* ha `connettore` (`llamacloud_eu`), `chiave` (cifrata, mai riletta), `modo` (economico · agentico · agentico plus), `progetto` (vuoto = il primo), indirizzo fisso della regione UE, `attesa_s` (300) e le soglie; `leggiDocumento` carica il file, chiede l'estrazione con lo schema del tipo, aspetta la fine e restituisce i campi con la confidenza del fornitore e la citazione (pagina, testo, riquadro normalizzato); il file si cancella dal cloud dopo la lettura. Il connettore locale GLM-OCR/vLLM è previsto dallo stesso seam e si accende quando arriva la macchina; F6-A5 (installazione e taratura) si sposta a quel momento. | La macchina GPU non c'è ancora e 100–150 pagine al mese stanno nei 10.000 crediti gratuiti della regione UE: un connettore cloud sblocca F6 ora senza cambiare il resto del CRM; la chiave resta cifrata e il file si cancella, e quando arriva il locale si cambia solo il connettore. La confidenza del fornitore sostituisce i `logprobs` per il livello del documento; le citazioni danno la posizione. | Ugo (account di prova LlamaCloud UE) | §6.5, §6.6, §7.15, `src/lettore.ts`, `src/impostazioni.ts`, `src/impostazioni-api.ts`, `src/lettura-prova.ts`, `test/lettore.spec.ts` |
| D-68 | 06/11/2026 | **Un menu per il modello di lettura, parametri separati per modello.** Nel *Server di lettura* si sceglie `llamacloud_eu` o `glm_ocr_locale`; ogni modello ha i suoi parametri (LlamaCloud: `llamacloud_chiave`, `llamacloud_modo`, `llamacloud_progetto`, `llamacloud_attesa_s`; locale: `locale_indirizzo`, `locale_modello`, `locale_attesa_s`), le soglie sono comuni e il modello scelto (`connettore`) è quello usato da `letturaConfig`. La pagina mostra solo i campi del modello scelto (`gruppo`), salva solo quelli e non tocca i parametri dell'altro. | I due modelli non si usano insieme: un menu evita campi ambigui e un solo insieme di parametri condiviso, e permette di passare a GLM-OCR senza perdere la chiave e le impostazioni di LlamaCloud. Salvare solo i campi visibili impedisce che un salvataggio del modello locale azzeri la chiave del cloud. | Ugo | §6.5, §7.15, `src/impostazioni.ts`, `app/(app)/impostazioni/VistaImpostazioni.tsx`, `componenti/Campo.tsx`, `test/impostazioni.spec.ts` |
| D-69 | 06/11/2026 | **Servizio di lettura con un solo schema per documento (F6-A2).** `LetturaService` consuma la coda ogni 15 s, un documento per giro, con `prelevaDocumento` e `letturaFallita`; il file si legge da `DOCUMENTI_DIR` e si passa al connettore con `SCHEMA_DOCUMENTO` e un prompt in italiano: il tipo (uno degli otto ammessi) lo legge il modello insieme agli altri campi; le righe si salvano in `documenti_campi` con affidabilità e posizione e il documento passa `da_controllare`, tutto in una transazione con la riga bloccata. **Excel dei bollettini rinviati**: D-60 rifiuta gli Excel nel canale comune (415) e non c'è un ingresso alternativo, quindi non si scrive il lettore `exceljs` adesso. **Nessuna fusione di righe multipagina nel nostro codice**: `extraction_target: 'per_doc'` legge il documento intero e le righe arrivano in un solo elenco. | Il tipo di documento non si conosce prima di leggere: uno schema per tipo richiederebbe una prima chiamata solo per indovinarlo e una seconda per estrarre, raddoppiando i crediti; un solo schema con il tipo fra i campi costa una chiamata. Il lettore Excel senza un ingresso dei file sarebbe codice morto finché D-60 resta in vigore. Fondere righe che il connettore restituisce già unite aggiungerebbe codice e rischi senza un caso vero. | Ugo (prompt OpenCode) | §6.5 punti 3–4, §4.2.13, §4.2.15, `src/lettura.ts`, `src/lettura-prova.ts`, `src/app.module.ts`, `test/lettura.spec.ts` |
| D-70 | 06/11/2026 | **I parametri del `.env` si leggono nelle Impostazioni, non si modificano.** `GET /api/impostazioni` restituisce anche `ambiente`: `SEGRETI_CHIAVE`, `DOCUMENTI_DIR`, `DOCUMENTI_MAX_MB` e `APP_URL`, con l'uso, le sezioni che li usano, se ci sono e il valore **solo** per quelli non segreti. La pagina li elenca sotto la sezione, dice che si cambiano nel file `app/backend/.env` sul server e che serve riavviare il backend; il messaggio di `SEGRETI_CHIAVE` mancante manda a quei parametri. | Un parametro che impedisce di salvare la chiave di lettura deve dire dove si trova e cosa fare: chi usa la pagina non sa a chi rivolgersi. Mostrare il valore serve per `DOCUMENTI_DIR` e `APP_URL`, ma i segreti restano fuori anche da questa lettura, così la chiave non passa dal browser. | Ugo (errore salvando la chiave LlamaCloud) | §7.15, §8.1, `src/impostazioni-api.ts`, `src/impostazioni.ts`, `app/(app)/impostazioni/VistaImpostazioni.tsx`, `test/impostazioni.spec.ts` |
| D-71 | 06/11/2026 | **Controlli fissi, livello e proposta di abbinamento si calcolano, non si salvano (F6-A3).** Il fornitore si riconosce dal nome letto **normalizzato** (minuscole, senza accenti, punteggiatura e spazi ridotti; le sigle societarie restano parte del nome) contro la ragione sociale corrente; se non combacia, un **ripiego senza le sigle societarie** accetta un nome contenuto nell'altro solo con un match unico (mai una distanza di modifica); `tipo` è **fuori dal livello** (confidenza strutturalmente bassa, è una classificazione: 0,47–0,86 sui documenti veri anche quando giusto); le righe del bollettino sono le **fatture del mese** (numero, data, imponibile, provvigione), non gli articoli; "periodo della pratica" = **data del documento precedente alla data dell'ordine**; proposta e controlli si ricalcolano da `documenti_campi` in F6-A4, si salva solo `livello` e `controlli` (con `fornitore_id`/`fornitore_versione_id`). | Il nome letto dall'OCR è sporco: sui documenti veri il modello ha troncato «Arte Wohnaccessoires GmbH & Co. KG» in «ARTE GmbH & Co.KG». Una distanza di modifica (Levenshtein o simili) sarebbe imprevedibile; il ripiego toglie le sigle e chiede che un nome sia contenuto nell'altro con un solo match, altrimenti la persona sceglie in F6-A4. La confidenza del tipo non misura l'affidabilità dei valori (bassa per natura, giusta comunque): contarla abbasserebbe ogni documento a `bassa` senza motivo. Il bollettino non restituiva righe con lo schema degli articoli (codice/quantità/prezzo), perché le sue righe sono fatture. Proposta e controlli sono derivati dai campi: salvarli li farebbe diventare da riallineare a ogni correzione. | Ugo (prompt OpenCode) | §6.5 punti 5–6, §4.2.12, `src/proposta.ts`, `src/lettura.ts`, `test/proposta.spec.ts`, `test/lettura.spec.ts` |
| D-72 | 06/11/2026 | **Contratto della correzione dei dati letti e dello scarto (F6-A4a).** `PUT /api/documenti/:id` riceve testata e righe: `i` = indice della riga originale (valore letto, affidabilità e posizione conservati), `null` = riga aggiunta; le righe si salvano nell'ordine ricevuto e si rinumerano da 0. Tutti i campi inviati diventano `verificato = true` (corretti o confermati), un valore vuoto toglie il campo; campi e righe nuovi nascono con `valore_letto` nullo, affidabilità nulla e precisione `assente`. Una transazione con la riga `FOR UPDATE` (V13), poi `valutaLettura` sui valori finali; evento `documento/update` con `campi_corretti` (campi cambiati più righe nuove), `livello_prima`, `livello_dopo`. Lo scarto (`POST /api/documenti/:id/scarta`) usa `documento/update` con `{stato: 'scartato', motivo, nota}` perché il catalogo §15.2.4 non ha un codice suo. `lettoDaCampi` preferisce `valore_finale` al `valore_letto`, così proposta, controlli e livello vedono le correzioni. Le rotte `/apri-pratica` e `/registra-bollettino` non esistono: si usano `POST /api/documenti/:id/abbina` e `POST /api/bollettini`. | Se proposta, controlli e livello continuassero a leggere il valore letto, una correzione non cambierebbe l'abbinamento proposto: la persona correggerebbe un dato e la pagina le proporrebbe ancora la pratica sbagliata. `i` conserva la provenienza del dato (affidabilità e punto nel PDF) anche dopo aggiunte e cancellazioni; rinumerare da 0 evita buchi negli indici. Lo scarto non è nel catalogo degli eventi: riusare `documento/update` scrive il fatto nel registro senza inventare un codice né cambiare i contratti; i due nomi generici erano rimasti dalla prima stesura della spec. | Ugo (prompt OpenCode) | §6.5 punto 7, §7.9, §8.1, §15.2.4, `src/documenti.ts`, `src/proposta.ts`, `test/documenti-lettura.spec.ts`, `test/proposta.spec.ts` |
| D-73 | 06/11/2026 | **Pagina Documenti nell'app (F6-A4b), una pagina sola come il prototipo.** A sinistra *Da controllare* con il caricamento e l'elenco selezionabile (tipo e numero, importo, fornitore e ricevuto, livello); a destra il documento scelto, senza cambiare pagina (`/documenti/:id` serve al collegamento diretto), con titolo, file, *Correggi i dati letti*/*Scarta il documento* nel pannello, i dati letti in colonne e le schede *azione proposta* e *Righe lette* (D-15). Niente segmenti né filtri, che il prototipo non ha: i documenti in coda, in lettura o in errore si contano in una nota. **Il file sta solo nella finestra di correzione** (a sinistra), come nel prototipo. I bordi dei campi della correzione usano **0,90/0,70 fissi nel browser** perché le soglie stanno nelle Impostazioni e il dettaglio non le riceve; il livello resta quello del server. **Il rettangolo sul valore non si disegna**: dipende da D-06/F0-A7; la finestra apre il PDF alla pagina del campo e mostra la precisione. La nota di credito trova la fattura stornata dal numero letto (`riferimento_fattura`) fra i documenti della pratica (`GET /api/pratiche/:id/documenti`), altrimenti la fa scegliere; *Registra e verifica* usa `POST /api/bollettini` con `arrivo_id`. | **Perché:** la prima stesura era a due pagine (elenco → dettaglio) con il file affiancato; D-24 vuole il prototipo come sorgente di verità e il prototipo è master-detail, quindi si è tornati a quello togliendo segmenti e filtri che il prototipo non ha. La finestra piena lascia spazio al PDF e ai campi; le soglie nel browser sono un compromesso dichiarato finché il dettaglio non le riceve dal server; il rettangolo è rimandato per non promettere una funzione non verificata (D-06); per la nota di credito il numero letto è la chiave giusta e la scelta a mano evita abbinamenti inventati. | Ugo (prompt OpenCode) | §6.5 punto 7, §7.9, §8.1, `app/(app)/documenti/*`, `lib/guida.ts`, `strumenti/prove/app_documenti.py` |
| D-74 | 06/11/2026 | **Stato del sistema e documenti scartati nell'app (F5-A5, F5-A7).** I quattro servizi hanno un **controllo di salute ogni 5 minuti** (`servizi_esecuzioni` con `tipo = 'controllo'`) con **prove iniettabili** (casella: `apriImap`; lettura: `provaConnettore`; integra: `creaPonte` e una riga per vista; posta: `verify()`), tempo massimo 20 s, messaggio tecnico solo in `misure`. Anche un servizio **non configurato** scrive un controllo `ok` con `testo = 'non configurata'`: il riquadro è verde con la nota e non risulta fermo. Le anomalie si aprono solo per ciò che un controllo può verificare: `casella.connessione` (3 di fila), `casella.cartella` (subito), `lettura.non_raggiungibile` (2 di fila), `posta.connessione`, `integra.connessione` (3 giri), `integra.vista`; **`lettura.lenta` non si apre adesso** perché il lettore salva i `secondi` ma non le pagine — si aggiunge quando il connettore dà le pagine (F6-A5). **Il contatore** dei problemi nella barra è `GET /api/sistema/contatore`, letto a ogni cambio pagina (§7.14, D-23): è un numero del server, non un calcolo del browser. **Scarto, recupero ed eliminazione** degli scartati usano gli eventi che il catalogo §15.2.4 permette: `documento/update` con `{stato: 'da_controllare'}` per il recupero e con `{eliminato: true}` per l'eliminazione (manca un codice suo); l'eliminazione definitiva è **solo dell'amministratore** (e del superutente), oltre al permesso `provvigioni.elimina`. La **pulizia** notturna (scartati oltre i giorni con i file, giri oltre 90 giorni) **non scrive eventi**: è manutenzione; la pulizia del registro resta `PuliziaRegistro`, non si duplica. | Anomalie solo per ciò che un controllo può verificare, altrimenti *Stato del sistema* si riempie di problemi finti; il contatore nella barra è un numero del server (D-23); scarto, recupero ed eliminazione usano gli eventi che il catalogo §15.2.4 permette. | Ugo (prompt OpenCode) | §7.14, §7.16, §8.1, §15.2.4, §15.2.7, `app/backend/src/sistema.ts`, `app/backend/src/scartati.ts`, `app/(app)/sistema/*`, `app/(app)/scartati/*`, `strumenti/prove/app_sistema.py`, `strumenti/prove/app_scartati.py` |
| D-75 | 07/11/2026 | **I numeri del menu (barra laterale) si replicano dal prototipo.** `GET /api/oggi/conteggi` (`provvigioni.consulta`) restituisce `oggi` (documenti da controllare + conferme in ritardo + bollettini aperti/mancanti + pagamenti da sollecitare), `documenti` (file non ancora abbinati), `pratiche` (conferme scadute) e `bollettini` (aperti + mancanti), tutti calcolati dal database con le stesse funzioni della pagina Oggi (V12). La barra li legge a ogni cambio pagina: Oggi e Bollettini in grigio, Documenti e Pratiche **gialli** quando c'è qualcosa da fare; si nascondono a zero. | Il prototipo mette i numeri accanto alle voci e il cliente li ha visti: senza, il menu sembra vuoto e non dice dove c'è lavoro. Il numero di Oggi comprende i documenti, come `M.daFare()`; lasciarlo calcolare al browser o sommare i contatori delle pagine avrebbe dato numeri diversi da una pagina all'altra. | Ugo | §7.1, §8.1, `src/oggi.ts`, `componenti/Barra.tsx`, `test/oggi.spec.ts` |
| D-76 | 07/11/2026 | **"Torna a …" in ogni testata, a destra accanto a Guida.** `Pagina` ricorda l'ultimo percorso aperto nell'app e mostra un pulsante secondario *Torna a* + la voce di destinazione con l'articolo giusto (*a Oggi*, *ai Documenti*, *alle Pratiche*, *ai Bollettini*, *alle Liquidazioni*, *all'Analisi*, …). Usa `router.back()` (filtri, ordinamento, pagina e scorrimento restano quelli di §7.12), non compare dopo un accesso diretto o nelle pagine di accesso ed è attivo anche in sola lettura. Tolti i pulsanti *Torna alle pratiche* e *Torna ai bollettini* scritti a mano nelle pagine di dettaglio. | Il prototipo ha il link in alto a sinistra; una sola regola in `Pagina` evita un pulsante diverso per ogni dettaglio e non dimentica le nuove pagine. La freccia del browser non basta perché il pulsante deve dire dove si torna; la memoria è già gestita dal guscio. | Ugo | §7.12, `componenti/Pagina.tsx`, `app/(app)/pratiche/[id]/VistaPratica.tsx`, `app/(app)/bollettini/[id]/VistaBollettino.tsx` |
| D-77 | 07/11/2026 | **Il ✓ conferma un campo senza cambiarlo (sostituisce la parte di D-72 "tutti i campi inviati diventano verificati").** Nella finestra *Correggi i dati letti* ogni campo incerto ha il ✓ (come il prototipo): il campo diventa verde e non conta più fra i punti; il riepilogo si aggiorna subito. `PUT /api/documenti/:id` riceve anche `verificati: string[]` con le chiavi dei campi confermati: il server segna verificati **solo** i campi cambiati, quelli con ✓ e quelli già verificati; gli altri restano come sono. I campi nuovi e le righe nuove nascono verificati. | Con "tutto verificato" bastava salvare per far sparire anche i campi che nessuno aveva guardato: il cliente vuole dire "questo valore è giusto" campo per campo, come nel prototipo. Il server resta l'unico a decidere (V12) e la chiave `righe[i].campo` usa l'indice originale, così aggiunte e cancellazioni non confondono le conferme. | Ugo | §6.5 punto 7, §7.9, `src/documenti.ts`, `app/(app)/documenti/[id]/VistaDocumento.tsx`, `test/documenti-lettura.spec.ts`, `strumenti/prove/app_documenti.py` |
| D-78 | 07/11/2026 | **Consulta affiancati dei documenti di una pratica.** `GET /api/pratiche/:id/documenti` restituisce per ogni documento anche le `righe` (codice, descrizione, quantità, prezzo, importo) e il `riferimento` della nota di credito; il pulsante *Consulta affiancati* della card *Documenti* e il clic su una riga aprono la finestra con: schede di tutti i documenti, file a sinistra (o l'anteprima costruita dai dati, come la pagina del prototipo, per i documenti inseriti a mano), a destra tipo/numero/data, importo, *Confrontato con* (qualsiasi altro documento), differenza e numero di righe che cambiano, segmenti *Solo righe che cambiano / Tutte le righe*, tabella per articolo con le due fasi e la differenza, riga selezionata; ← → passano da un documento all'altro. Il documento precedente è quello stornato per la nota di credito, altrimenti l'ultimo della fase prima (conferma ← ordine, fattura ← conferma); con la nota di credito la differenza è lo storno, non nota − fattura. **Il rettangolo sul valore nel PDF non si disegna** (D-06/F0-A7): la riga si seleziona nella tabella e basta. | Era l'ultima funzione del prototipo non replicata: il cliente confronta fattura e conferma riga per riga e senza le righe per documento l'app poteva solo mostrare i dati di un file. Il confronto si calcola dal database sul server (V12); la nota di credito ha una regola sua già fissata in §7.3. | Ugo | §7.3, §5.3, §8.1, `src/documenti.ts`, `componenti/ConsultaDocumenti.tsx`, `app/(app)/pratiche/[id]/VistaPratica.tsx`, `test/documenti-pratica.spec.ts` |
| D-79 | 07/11/2026 | **La pillola dello stato nel titolo ha 10 px di spazio.** `.testa .testa-badge` ha `margin-left: 10px` (prima era attaccata al numero della pratica). | A occhio il numero e lo stato sembravano una parola sola; 10 px separano senza spostare il titolo. | Ugo | §16.4, `app/frontend/app/stile/stile.css`, `prototipo-alternativo/assets/stile.css` |
| D-80 | 07/11/2026 | **Formula injection nei CSV.** Le tre esportazioni CSV (liquidazione, Analisi, Registro) scrivono una cella che comincia con `=`, `+`, `@`, TAB, CR o `-` non seguito da una cifra con un **apice davanti** (`'=...`); la quotatura resta quella di prima e i numeri negativi restano numeri. La regola sta in **un solo posto** (`src/csv.ts`, `cella`), usato da tutti e tre. | Il numero del documento arriva da un PDF letto dall'OCR, quindi da un fornitore: senza l'apice Excel e LibreOffice eseguirebbero il valore come formula (`=cmd\|...`) quando una persona apre l'esportazione. Tre copie della stessa funzione sarebbero tornate diverse alla prima modifica. | Ugo (audit OWASP) | §11, `src/csv.ts`, `src/esporta-liquidazione.ts`, `src/analisi.ts`, `src/registro-api.ts`, `test/liquidazioni.spec.ts`, `test/analisi.spec.ts`, `test/registro-api.spec.ts` |
| D-81 | 07/11/2026 | **Limite ai tentativi davvero per persona, e un tetto ai caricamenti.** Il throttler `persona` conta **solo** la persona (nome utente, email, codice o sessione), con ripiego l'IP se manca; il tetto largo per IP resta al throttler `ip`. `POST /api/documenti/carica` ha il tetto suo, `TENTATIVI_CARICAMENTI` (default 100 in 15 minuti per utente), e salta `persona` e `ip`. | Il contatore era `${req.ip}\|${persona}`: chi provava da IP diversi ricominciava da 10 ogni volta e il limite per persona di D-41 non esisteva. L'upload non aveva nessun limite e la spec lo chiede; con i 10 del login, però, un blocco di fatture da caricare si fermerebbe. | Ugo (audit OWASP) | §3.3, D-41, `src/accesso.ts`, `src/app.module.ts`, `src/documenti.ts`, `.env.example`, `test/accesso.spec.ts`, `test/carica-limite.spec.ts` |
| D-82 | 07/11/2026 | **Casella: prima la dimensione, poi il download.** Il giro legge `{uid, size}` e scarica (`fetchOne`) solo le email sotto `DOCUMENTI_MAX_MB`; quelle oltre non si scaricano, aprono `casella.allegato` con un testo dedicato e si spostano fra le lette. | `fetch source:true` + `simpleParser` tenevano in memoria l'email intera prima di ogni controllo: chiunque conosca l'indirizzo della casella poteva spegnere il CRM con un allegato enorme. L'email scartata va spostata, altrimenti si rilegge a ogni giro. | Ugo (audit OWASP) | §6.5 punto 1, `src/casella.ts`, `test/casella.spec.ts` |
| D-83 | 07/11/2026 | **Due permessi sbagliati.** `POST /api/solleciti/conferme` (che scrive nel registro) passa da `provvigioni.consulta` a `provvigioni.modifica`. Il **dettaglio** e il **file** di un documento `scartato` chiedono `provvigioni.scartati` (con `permessiDi`, come fanno Clienti e Oggi), non la sola consulta. | La sola lettura poteva scrivere eventi di sollecito e falsare la traccia di audit; poteva anche enumerare gli id e leggere o scaricare gli scartati (spesso documenti di terzi o «non riguarda Decobrands»), aggirando il permesso della pagina Scartati. | Ugo (audit OWASP) | §3.3, §7.16, `src/solleciti.ts`, `src/documenti.ts`, `test/oggi.spec.ts`, `test/documenti.spec.ts` |
| D-84 | 07/11/2026 | **`NODE_ENV` obbligatorio e testo delle email solo in sviluppo.** `controllaAmbiente()` ferma l'avvio se `NODE_ENV` non è `development`, `test` o `production`; `avvia.bat` e `.env.example` lo impostano, `app/README.md` lo dice. In `posta.ts` il testo dell'email (password provvisoria, link) va nel log del processo **solo** in sviluppo. | Con la variabile assente il cookie di sessione non era `Secure` e le credenziali finivano nel log: un errore di configurazione in esercizio, silenzioso. Meglio non partire. In prova il link si legge dal log, quindi l'eccezione per lo sviluppo serve. | Ugo (audit OWASP) | §3.3, `src/main.ts`, `src/posta.ts`, `avvia.bat`, `.env.example`, `app/README.md`, `test/avvio.spec.ts` |
| D-85 | 07/11/2026 | **Registro: niente identificativo di sessione, errore senza testo.** `logEvent` scrive `sessione_id = null` e il dettaglio non lo espone più; nel `dettaglio.errore` dei 500 restano solo `classe` e, per gli errori del database, il `codice`. | L'id di sessione è un identificativo di autenticazione che non serve all'interfaccia e restava 36 mesi; il messaggio di un'eccezione Prisma può contenere valori di riga (email, importi) e non deve finire nel registro. Il messaggio completo resta nel log del processo. | Ugo (audit OWASP) | §15.1, §15.5, `src/registro.ts`, `src/registro-api.ts`, `src/errori.filter.ts`, `test/registro.spec.ts`, `test/registro-api.spec.ts`, `test/avvio.spec.ts` |
| D-86 | 07/11/2026 | **CSP completa sulle pagine.** `default-src 'self'`, `script-src`/`style-src` con `'unsafe-inline'`, `img-src 'self' data: blob:`, `font-src 'self' data:` (Public Sans è un data URI), `connect-src 'self'`, `object-src 'self'` (i PDF si vedono in `<object>`), `base-uri`, `form-action` e `frame-ancestors` `'self'`. `'unsafe-eval'` **solo** fuori dalla produzione. | La pagina aveva solo `frame-ancestors`: qualunque inserimento di script futuro non avrebbe avuto mitigazione. `object-src 'none'` avrebbe spento tutti i PDF e `font-src 'self'` il carattere: i due errori si sono visti subito in prova. `unsafe-eval` in sviluppo serve a Next e alle prove Playwright. | Ugo (audit OWASP) | §3.3, `app/frontend/next.config.ts` |
| D-87 | 07/11/2026 | **Un ordine senza fornitore, agenzia o scaglione non apre la pratica.** Un ordine a fornitore entra nel flusso delle provvigioni solo se esistono **tutti**: il fornitore riconosciuto (in anagrafica), l'agenzia (`interscambio` subagente × cliente × fornitore, con sconto, valida alla data del documento) e lo scaglione del fornitore per quello sconto. Se ne manca uno, nell'app il documento resta in coda come «da controllare» e il blocco scatta su *Apri la pratica* (409 con il dato mancante); l'etichetta «da configurare» in coda è del prototipo (D-131). L'operatore lo completa prima di aprire la pratica: fornitore nuovo → registrarlo in Integra; cliente nuovo → registrarlo in Integra; agenzia mancante → subagente + sconto + codice cliente; scaglione mancante → le percentuali. | Senza fornitore, agenzia o scaglione la provvigione si calcolerebbe come 0% **in silenzio**: un documento che non entra nel flusso è meglio di un calcolo sbagliato a zero. Lo sconto 100 (percentuali 0/0 legittime) non è un dato mancante: il blocco guarda alla *presenza* di fornitore + agenzia + scaglione, non al valore della percentuale. | Ugo | §6.1, §4.2.2, §4.2.6, `prototipo-alternativo/assets/motore.js` (`M.mancaPratica`, `M.apriPratica`, `M.riconosciCliente`, `M.daFare`), `viste-giorno.js`, `dati.js`, `guida.js` |
| D-88 | 07/11/2026 | **Il mio profilo e la pagina di ingresso per area.** Pagina `/profilo` dal menu dell'utente: dati in sola lettura, aree con il livello, **pagina di ingresso per area** (Provvigioni, Dati, Gestione) scelta dal singolo utente fra un elenco chiuso di percorsi, *Cambia la password*. `utenti.ingressi` JSONB; `GET /api/accesso/io` restituisce solo le voci ancora permesse; `PUT /api/accesso/profilo` valida area, percorso e permesso (V12) e scrive `crud.update` su `utente`. Scegliendo l'area nel menu si apre quella pagina; senza scelta la prima dell'area (in Gestione la prima consentita); dopo l'accesso si atterra sulla pagina di ingresso della prima area aperta. | Ognuno lavora su pagine diverse e tornare sempre su Oggi costringe a due clic; la preferenza è personale e innocua (il server ricontrolla il permesso a ogni lettura e una pagina non più permessa sparisce da sola). Il percorso è un elenco chiuso, non un indirizzo libero, così non si può puntare a una pagina riservata. | Ugo | §3.3, §7.23, §8.1, `src/accesso.ts`, `app/(app)/profilo/`, `componenti/Barra.tsx`, `lib/api.ts`, `test/profilo.spec.ts`, `strumenti/prove/app_profilo.py` |
| D-89 | 07/11/2026 | **Timeout di inattività della sessione.** Dopo **30 minuti** senza richieste (`SESSION_TIMEOUT_MINUTI`, 30 se assente o non valido) la sessione si distrugge e la prima richiesta risponde 401; il browser torna a `/accesso?dopo=`. *Resta collegato* resta 30 giorni di durata **massima**, non di inattività. `GET /api/eventi/flusso` (SSE) **non** rinnova il contatore. | Un computer lasciato aperto in ufficio non deve tenere la sessione viva tutto il giorno; il flusso degli aggiornamenti è una connessione automatica, non una persona che lavora, e se contasse il timeout non scatterebbe mai. | Ugo | §3.3, `src/accesso.ts`, `lib/api.ts`, `.env.example`, `test/profilo.spec.ts` |
| D-90 | 07/11/2026 | **Numeri affiancati nel binario della pratica.** Quando una fase ha più documenti il binario mostra **tutti i numeri** (`numeri: string[]` nella risposta), affiancati; la riga scorre in orizzontale se non ci stanno (barra sottile). Gli importi restano la somma della fase e la differenza sul totale. Sostituisce il «primo numero + quanti altri» di D-60. | Con «+ 1» non si sapeva quali documenti ci fossero: per controllare una doppia fattura bisognava aprire il confronto. Affiancarli li rende leggibili e lo scorrimento evita di allargare il binario. | Ugo | §7.3, `src/pratiche.ts`, `componenti/Flussi.tsx`, `prototipo-alternativo/assets/componenti.js`, `viste-giorno.js`, `stile.css` |
| D-91 | 07/11/2026 | **La lettura estrae anche la P.IVA del cliente.** Lo schema di lettura (`SCHEMA_DOCUMENTO`) aggiunge `piva_cliente`: la partita IVA (o codice fiscale) dell'intestatario, letta dal documento (P.IVA, USt-IdNr., C.F.), solo se scritta. In Documenti il cliente si riconosce per P.IVA anche quando il codice del fornitore non è ancora abbinato: cliente esistente → link diretto alla sua scheda; cliente nuovo → registrarlo in Integra. | Sul documento vero la P.IVA del cliente c'è (es. «Ihre USt-IdNr. lautet: IT…»): senza leggerla il sistema non distingue «cliente esistente non ancora associato» da «cliente nuovo», e non può portare l'operatore al cliente giusto con un link. | Ugo | §6.5 punto 3, `app/backend/src/lettura.ts`, `prototipo-alternativo/assets/motore.js`, `viste-giorno.js`, `dati.js` |
| D-92 | 07/11/2026 | **Riconoscimento del cliente flessibile: prima entrambi, poi la più probabile.** Il cliente di un documento si riconosce combinando `piva_cliente` e `cliente` (ragione sociale): vince la **P.IVA normalizzata** (univoca, spazi e maiuscole ignorate); se manca o non combacia, la **ragione sociale normalizzata** (minuscole, senza accenti/punteggiatura/spazi, sigle societarie finali ignorate) accettata solo con **un solo candidato**; «entrambi sullo stesso cliente» è il caso certo, «uno solo dei due» è il più probabile, nessuno → cliente non riconosciuto. | La P.IVA è il segnale più forte ma può mancare o essere dell'interlocutore (es. «Ihre USt-IdNr» su un documento tedesco); la ragione sociale c'è quasi sempre ma può avere doppioni. Combinarli evita di fermarsi su un dato solo, e il match unico evita di scegliere a caso fra omonimi. | Ugo | §6.5 punto 5, D-91, `prototipo-alternativo/assets/motore.js` (`M.riconosciCliente`, `M.normalizzaNome`) |
| D-93 | 08/11/2026 | **Niente pulsante *PDF***. Nella pratica il documento si apre con il **clic sulla riga** (*Documenti della pratica*: file a sinistra, confronto a destra) e in Documenti il file è nella **finestra di correzione**; tolti il pulsante *PDF* dalle due card della pratica e dalla pagina Documenti, con la finestra che apriva (`componenti/Visualizzatore.tsx`, eliminato). | Era un doppione: nella pratica il clic sulla riga apriva già lo stesso visualizzatore, e in Documenti il PDF è già nella correzione. Un solo modo per aprire il file, come nel prototipo; meno pulsanti nelle righe. | Ugo | §7.3, §7.9, `VistaPratica.tsx`, `VistaDocumento.tsx`, `strumenti/prove/app_pratica.py` |
| D-94 | 08/11/2026 | **Aggiornamento mirato senza refresh nelle pagine master-detail.** In Documenti l'elenco «Da controllare» sta nel **layout** (`documenti/layout.tsx`), non nel page: navigando fra `/documenti` e `/documenti/:id` il layout non si rimonta e l'elenco non si ricarica alla selezione; i nuovi documenti arrivano via **SSE** (`useEventi`, area `documenti`) e aggiornano solo elenco e conteggi (senza sagome), il dettaglio aperto resta com'è. `/documenti/:id` resta per il collegamento diretto (`[[...id]]` opzionale). Il pattern (D-23: numeri subito, righe su *Aggiorna*) si estende ai dettagli (Pratica, Bollettino) e alle anagrafiche. | Prima `/documenti` e `/documenti/:id` erano due `page.tsx` separati: ogni clic sull'elenco rimontava la pagina e rifaceva il fetch della lista; e i documenti arrivati da email/coda non comparivano senza un ricarica manuale. Il layout è il punto che Next.js non rimonta fra segmenti della stessa route, quindi è il posto giusto per lo stato condiviso. | Ugo | §7.9, §16.4.2, `documenti/layout.tsx`, `documenti/[[...id]]/page.tsx`, `VistaDocumenti.tsx`, `lib/eventi.tsx` |
| D-95 | 08/11/2026 | **In Oggi *Documenti da decidere* è acceso.** Il gruppo elenca i documenti della coda con il titolo dell'azione proposta (apri l'ordine, abbina il documento, registra il bollettino), fornitore, livello di lettura e collegamento a `/documenti/:id`; il riquadro *Documenti in coda* e la voce del menu contano gli stessi documenti, che entrano anche nel totale "da fare". | Il gruppo era rimasto spento (`disponibile: false`) dopo F6: con i documenti in coda già leggibili la schermata diceva il falso e il riquadro non filtrava. La coda c'è, quindi il gruppo mostra le stesse cose che si vedono in Documenti (V12: calcolate dal server). | Ugo | §7.1, `src/oggi.ts`, `VistaOggi.tsx`, `test/oggi.spec.ts` |
| D-96 | 08/11/2026 | **Sollecita il bollettino dall'app.** La cella «Non arrivato» della matrice Bollettini porta *Sollecita*; la finestra mostra il testo composto dal server (`GET /api/solleciti/bollettini?fornitore_id=&anno=&mese=`) con i documenti del mese, e *Copia il testo* ricalcola sul database e scrive `export.sollecito` (`POST`, `provvigioni.modifica`) con fornitore, mese e numeri. | Il prototipo ha *Sollecita* e l'app no: senza il pulsante il sollecito si scriveva a mano, fuori dal registro. Il testo è un calcolo (importi e documenti del mese), quindi si compone sul server (V12). | Ugo | §7.7, §8.1, `src/solleciti.ts`, `componenti/Solleciti.tsx`, `VistaBollettini.tsx` |
| D-97 | 08/11/2026 | **`/api/pratiche/cerca` senza `fornitore_id` risponde `[]`.** Il campo di ricerca delle pratiche (finestra *Sposta*, finestra di correzione) si apre prima che il fornitore sia scelto: senza fornitore non ci sono pratiche da proporre, non è un errore. | Il server rispondeva 400 e il browser lo mostrava a ogni apertura di Documenti (ricerca pratiche a vuoto), un errore finto che sporcava la pagina. | Ugo | §8.1, `src/pratiche.ts`, `test/pratiche.spec.ts`, `VistaDocumento.tsx`, `VistaPratica.tsx` |
| D-98 | 08/11/2026 | **Seed allineato al prototipo e pulizia delle prove.** `dati-prova.json` riprende `assets/dati.js`: 11 fornitori (aggiunto *Nuovo Fornitore Demo SRL*, senza scaglioni, per la regola D-87) e 17 documenti in arrivo (15 in coda), con i quattro ordini del 04/09/2026 (OF/2026/061–064). `utenti_prova.js togli` toglie anche i bollettini e i trimestri chiusi dagli utenti di prova (il CHECK vuole `chiuso_da` quando c'è `chiuso_il`, quindi non si può azzerare il riferimento). | Il seed era rimasto indietro rispetto al prototipo (10 fornitori, 13 documenti): i numeri di Oggi/Bollettini/Analisi non coincidevano con il §12 e due prove backend fallivano. Le prove chiudevano bollettini e trimestri con utenti di prova che poi non si potevano cancellare, lasciando il database di sviluppo sporco. | Ugo | §12, `prisma/seed/dati-prova.json`, `test/seed.spec.ts`, `strumenti/prove/utenti_prova.js` |
| D-99 | 08/11/2026 | **Il flusso degli aggiornamenti riparte se il registro torna indietro.** `nuoveAree` legge le righe con `id > ultimo`; se non ce ne sono e il massimo id del registro è più basso dell'ultimo letto (backup ripristinato, dati di prova ricaricati con identità azzerate), riparte da quel massimo. | Dopo un ripristino di un backup gli id ripartono da valori più bassi: il servizio SSE sarebbe rimasto zitto per sempre (le schede non avrebbero più mostrato *Ci sono aggiornamenti*). Caso vero di manutenzione, non solo di prova. | Ugo | §16.4.2, `src/eventi.ts`, `test/eventi.spec.ts` |
| D-108 | 09/11/2026 | **Un agente senza P.IVA né codice fiscale non entra nell'anagrafica.** Nell'import da Integra un master di `agenti` con P.IVA e CF vuoti non crea né il soggetto né il subagente; i suoi clienti restano senza subagente e l'import li elenca. | Un subagente senza un codice fiscale non si può riconoscere in modo affidabile (due omonimi, un refuso, un codice riusato), e senza identità fiscale la fusione coi soggetti e i controlli dei doppioni non hanno appiglio. Le provvigioni non ne hanno bisogno, ma l'anagrafica sì: meglio un subagente in meno, segnalato, che un soggetto fantasma. | Ugo | `specifica-anagrafica-soggetti.md` §7.1, §8.5, `schema-db-integra.md` §6 |
| D-107 | 09/11/2026 | **Il master `soggetti` si scrive solo per chi ha un ruolo: clienti, fornitori e agenti importati da Integra.** L'import legge `integra_v_clienti` (698), `integra_v_fornitori` (109 che non sono già clienti) e `integra_v_agenti` (21): al massimo **828 soggetti**, con chi è sia cliente sia fornitore che resta un soggetto solo. I **1060 master `clienti` senza ruolo** in azienda `001` — in gran parte articoli, 791 righe `cliazi` tipo `A` — **non** entrano nel master. | Un articolo non è un soggetto: importarlo riempirebbe anagrafica, ricerca e contatori di 1060 righe inutili, senza nulla da collegarci (nessun ruolo, nessun documento, nessun legame). Se servirà l'archivio storico si importa a parte, con una vista sua. | Ugo | §4.5, `specifica-anagrafica-soggetti.md` §7.1, `schema-db-integra.md` §4 |
| D-109 | 09/11/2026 | **Gli agenti di Integra stanno nella tabella `agenti`, non in `cliazi`: quelli dell'azienda `001` sono i subagenti del CRM.** `cliazi.cla_tipo = 'A'` è **articolo** (791 righe, `cla_codstr` = `prodotti.pro_cod`), non agente: la vecchia lettura «A = agente» era sbagliata. Il ruolo agente ha una riga per azienda in `agenti` (`age_cod`, `age_clicdcli` → `clienti`, `age_agecod` = padre, `age_obsoleto`); l'agente non ha alcuna riga in `cliazi` (0 casi). Poiché l'unico agente principale è Decobrands, le 21 righe di `agenti` in azienda `001` (18 attive, 16 usate dai clienti) sono i **subagenti**. Nuova vista `public.integra_v_agenti` (`id_integra`, `codice`, `codice_master`, `ragione_sociale`, `piva`, `codice_fiscale`, `email`, `codice_agente_padre`, `attivo`, `modificato_il`) e `agenti` entra nelle foreign table importate (17). L'agente è quindi un **ruolo del master** accanto a cliente e fornitore e **non è collegato al fornitore**: il codice agente sta solo sulla riga cliente (674 su 698; **0 fornitori su 115**) e i 21 master agente non hanno righe in `cliazi`; il suo codice non si usa per riempire `interscambio` (D-105). Restano aperte le decisioni di business: `030` «DIREZIONALE» (250 clienti, non pagabile), divisione di `cli_rgsoc` in nome/cognome, riconciliazione con i 3 agenti e 23 subagenti del vecchio CRM, agenti senza P.IVA. | Senza `agenti` la mappatura dei subagenti era impossibile: cercandoli in `cliazi` si sarebbero importati 791 articoli come agenti, e i subagenti veri (che in `cliazi` non compaiono) sarebbero spariti. La vista tiene l'identità nel master `clienti` e il ruolo in `agenti`, come fa Integra, così la fusione a soggetti resta additiva (D-102, D-103). | Ugo | §4.5, `strumenti/integra-fdw.sql`, `strumenti/crm-viste-integra.sql`, `schema-db-integra.md` §3.2-3.3, `specifica-anagrafica-soggetti.md` §7.1, §8.5 |
| D-106 | 10/11/2026 | **L'agenzia mancante si configura dal documento.** Se cliente e fornitore sono riconosciuti ma non c'è un `interscambio` valido alla data, la proposta del documento è `manca_agenzia` (con cliente, fornitore, codice cliente e data) e la lista porta `manca_agenzia`; l'operatore apre il form dell'agenzia dalla card, con cliente e fornitore fissi e la data del documento. Il controllo resta su registrazione, spostamento e abbinamento (409). | Al primo ordine di una coppia cliente-fornitore è normale che l'agenzia non ci sia: prima lo si scopriva solo alla fine, con la registrazione rifiutata. Anticiparlo e dare il percorso evita il giro su Clienti. | F1/F2 (DeepSeek V4 Pro), da approvare | §7.9, §8.1, `app/backend/src/proposta.ts`, `documenti.ts`, `componenti/FormAgenzia.tsx`, `documenti/VistaDocumento.tsx` |
| D-113 | 11/11/2026 | **Gli scaglioni di un fornitore importato si compilano a mano, prima di aprire una pratica.** Il fornitore nasce senza percentuali; il form degli scaglioni (una versione, `dati.condizioni`) è obbligatorio al primo uso e la pratica resta chiusa finché mancano, con il messaggio *«Mancano gli scaglioni del fornitore»* e il percorso. | Le percentuali sono soldi e dipendono dallo sconto: il vecchio CRM non le ha e non si copiano da un'altra azienda. Lasciare il fornitore senza scaglioni e aprire lo stesso la pratica produrrebbe uno 0% silenzioso, il caso che D-87 esiste per impedire. | Ugo | §4.7.1, §5.1, §7.9 |
| D-112 | 11/11/2026 | **I legami del vecchio CRM si importano tutti in una tabella di storico autosufficiente** (`interscambio_storico`, 4022 righe, più `soggetti_storico` con le 3403 schede), con i testi (ragioni sociali, P.IVA/CF, codice cliente del fornitore, agente, subagente) e gli id legacy, **senza FK obbligatorie**. Serve a proporre subagente e sconto e a dire «non rappresentato»; quando la coppia si usa nascono `interscambio` e `sconti` e la riga passa a `usata`. I **1625 con subagente vuoto** non producono provvigione: se arriva un documento la pratica resta chiusa e si configurano agenzia e scaglioni (Ugo, 11/11/2026). | Con le FK obbligatorie ogni legame avrebbe costretto a importare prima i tre ruoli: è il motivo per cui l'import massivo era fermo. Le copie di testo rendono la tabella leggibile e confrontabile senza anagrafica; il codice cliente del fornitore è la chiave che i documenti portano davvero. | Ugo | §4.7.2-4.7.4, `specifica-anagrafica-soggetti.md` §7, D-105 |
| D-110 | — | **Numero non usato** (saltato l'11/11/2026, quando più sessioni scrivevano il registro insieme). Lasciato vuoto per non far scorrere i numeri successivi. | — | Ugo (12/11/2026) | — |
| D-111 | 11/11/2026 | **L'anagrafica di Integra si importa su richiesta, non in massa.** La sincronizzazione aggiorna soltanto i soggetti già in anagrafica (versioni, D-46) e non crea più `clienti`/`fornitori`; quando un documento porta un fornitore o un cliente sconosciuto il server cerca nelle viste (`GET /api/integra/cerca`, massimo 10, per codice, P.IVA o ragione sociale) e la card offre *Importa da Integra*: una transazione crea soggetto, ruolo, `codici_esterni`, versione e, se serve, l'agenzia. Nuovo permesso **`dati.importa`** (operatore): copiare da Integra non è modificare l'anagrafica. Sostituisce l'import massivo previsto da F1-A9b; D-107 resta valido (nessun master senza ruolo entra). | L'import massivo obbligava a decidere prima tutto quello che si poteva decidere dopo (1060 master senza ruolo, doppioni a P.IVA, agenti che sono anche fornitori), e a correggere Integra prima di partire. Con l'import su richiesta entrano solo i soggetti che hanno documenti o legami: niente righe morte, nessuna fusione preventiva, e `030` «DIREZIONALE» o un agente senza P.IVA si affrontano quando il primo documento li tocca. | Ugo | §4.7, §7.9, §8.1, `specifica-anagrafica-soggetti.md` §7 |
| D-105 | 09/11/2026 | **Import one-shot del vecchio CRM nell'anagrafica a soggetti (F1-A9a).** `npm run import:vecchio-crm -- --db decobrands_import [--prova] [--sostituisci]`: una transazione, idempotente. Esiti: 1884 soggetti da 3403 schede (68 fusioni a P.IVA uguale), 1858 ruoli cliente, 20 fornitori, 23 subagenti, 3 agenti, 1587 legami su 4022, 91 persone, 20 gruppi, 25 settori. Restano fuori dal master 7 fornitori senza P.IVA (ruolo senza `soggetto_id`, per non perdere i legami) e i 1248 clienti senza P.IVA né CF (contatti). I legami senza subagente (1625) non entrano: `interscambio.subagente_id` è NOT NULL, e sono fornitori **senza rappresentanza** per quel cliente (Ugo, 11/11/2026), non un dato mancante da riempire con l'agente del cliente di Integra. `*_versioni.fonte='crm'` perché il CHECK non ammette `vecchio_crm`; la provenienza resta in `soggetti.sorgente` e `codici_esterni.sistema`. **`decobrands_import` era una prova** (Ugo, 11/11/2026): i dati veri stanno in `decobrands_db`. | Il vecchio CRM scade a gennaio: l'import va fatto ora, senza correggere a indovinare P.IVA mancanti o doppie. Le scelte conservano tutti i dati e mettono i casi dubbi nei report per Matteo. | F1 (DeepSeek V4 Pro), da approvare | `app/backend/prisma/import-vecchio-crm.ts`, `dati-crm-legacy/import/`, `specifica-anagrafica-soggetti.md` §7 |
| D-104 | 08/11/2026 | **Il codice del soggetto si vede in tutte le anagrafiche.** Nelle pagine Clienti, Fornitori e Subagenti il codice `C000123` del soggetto sta sotto il nome (seconda riga) e nel pannello come *Codice soggetto*, accanto al codice Integra del ruolo. | È il codice con cui si cita il soggetto al telefono; il codice di Integra è del singolo ruolo (D-101), quindi i due non vanno confusi. | F1 (DeepSeek V4.1 Flash), da approvare | `app/frontend/app/(app)/{clienti,fornitori,subagenti}/Vista*.tsx`, `specifica-anagrafica-soggetti.md` §10 |
| D-103 | 08/11/2026 | **Anagrafica a soggetti: implementazione additiva (F1-A8a).** `soggetti`, `sedi`, `recapiti`, `persone`, `persone_contatti`, `fatturazione`, `sconti`, `modifiche`, `gruppi`, `settori` si aggiungono; `clienti`, `fornitori`, `agenti`, `subagenti` restano con le stesse chiavi e ricevono `soggetto_id` nullable UNIQUE. Codice `C000123` dalla sequenza `soggetti_codice_seq`; P.IVA/CF unici per paese con indici parziali; `recapiti` senza `attivo` (chiusura con `valido_al`); `sconti` solo tabella. | D-100/D-101/D-102 senza riscrivere pratiche, bollettini e documenti: nessuna FK dello strato 0 cambia, il master si aggiunge sopra. | Ugo | §4.2.20, §4.5, `app/backend/prisma/migrations/20261108090000_anagrafica_soggetti`, `app/backend/src/soggetti.ts`, `specifica-anagrafica-soggetti.md` §10 |
| D-102 | 08/11/2026 | **Il CRM è il centro di verità delle anagrafiche: si importano clienti e fornitori da Integra e dal vecchio CRM insieme, si fondono i doppioni, e da lì in poi cliente e fornitore si censano nel CRM; verso Integra si esporta un file quando serve.** Restano invariati: Integra in sola lettura (D-100), le viste `integra_v_*` e la loro mappatura (D-101), l'identità stabile con versioni (D-46). La sincronizzazione continua per i soggetti già presenti in Integra; i nuovi si creano nel CRM e si esportano con un file che carica chi gestisce Integra. | Le due anagrafiche non coincidono (3405 contatti nel vecchio CRM, 698 clienti in Integra, 593 P.IVA in comune su 1866; 1410 contatti con P.IVA assente) e il dato che vale — legami cliente-fornitore, sconti, subagenti — esiste solo nel CRM. Con Integra come padrone quel dato non si può mantenere, e il vecchio CRM scade a gennaio. L'import unico con deduplica evita di scegliere fra due anagrafiche sbagliate. D-01 (anagrafica con un solo padrone) resta valido nel principio, cambia il padrone; D-07 e D-100 restano perché il gestionale di produzione non si tocca. | Ugo | §4.2.20, §4.5, `specifica-anagrafica-soggetti.md` |
| D-101 | 08/11/2026 | **Le viste del ponte si chiamano `integra_v_clienti` e `integra_v_fornitori` (schema `public`, senza schema dedicato), e la mappatura è confermata sui dati veri.** `id_integra` = `clienti.cli_cdcli` (id anagrafica), `codice` = `cliazi.cla_codstr` (il codice cliente/fornitore, NON `cli_cdclistr` che è il codice anagrafica), `codice_agente` = `cla_agecod`, `paese` da `cli_stacod`, `attivo` = master e ruolo non obsoleti, `modificato_il` ricostruito dalle colonne separate data/ora/minuti. | Il ponte vero ha mostrato che l'anagrafica è unica (`clienti` = master, `cliazi` = ruolo C/F/A in azi `001`): il «codice cliente» sui documenti è `cla_codstr` (es. DECOBRANDS è cliente `03208` e fornitore `00002`), non il codice anagrafica. Il prefisso `integra_` evita l'omonimia con le tabelle `clienti`/`fornitori` del CRM. | Ugo | §4.5, `strumenti/crm-viste-integra.sql`, `src/integra.ts` |
| D-100 | 08/11/2026 | **La connessione al server di Integra è SOLA LETTURA, senza eccezioni.** Il CRM accede al server PostgreSQL di Integra (connessione diretta via `postgres_fdw`, foreign server `integra`) esclusivamente con **`SELECT`**. Sono vietate **tutte** le altre operazioni — `INSERT`, `UPDATE`, `DELETE`, `MERGE`, `COPY`, `TRUNCATE`, ogni DDL e qualunque funzione che scrive — anche dove tecnicamente possibili. Il server di Integra **non viene mai modificato in nessun modo**, né dai servizi né a mano, né in sviluppo né in esercizio. La sola lettura è garantita dall'utente `crm_lettura`, con permesso di sola `SELECT` sulle viste dello schema `crm_viste`. | Integra è il gestionale di produzione di Decobrands: ogni scrittura accidentale (un `DELETE` scappato, un `UPDATE` di massa, un `TRUNCATE`) danneggerebbe dati reali e irreversibili. Il CRM deve essere un **consumatore passivo**: legge le viste e non tocca mai il server d'origine. Il vincolo va imposto a più livelli — permessi dell'utente, revisione del codice, niente percorso di scrittura — perché un solo livello può essere aggirato. | Ugo | §4.5, D-32, `src/integra.ts` |
| D-133 | 11/11/2026 | **Correggere un documento non tocca le righe che non arrivano; l'import da Integra lanciato dal documento collega il fornitore sul server, nella stessa transazione.** In `correggi` le righe si riscrivono solo se il corpo le porta; `POST integra/importa` con `documento_id` importa e collega (`fornitore_id`, `fornitore_versione_id`, registro) in una sola transazione; il browser non manda più il secondo PUT. | *Importa da Integra* dal documento cancellava tutte le righe lette (valori, affidabilità, posizioni), e import e collegamento erano due transazioni: con un 403 sul secondo il fornitore restava importato e il documento scollegato (collaudo R2-01, V12, V13). | Ugo (collaudo 11/11/2026, R0 domanda 1) | §6, §4.7; `documenti.ts`, `anagrafica-integra.ts`, `VistaDocumento.tsx` |
| D-134 | 11/11/2026 | **Il subagente proposto per l'agenzia lo decide il server.** Dallo storico arriva `subagente_id` (dal codice o dal nome, solo se il subagente è uno solo); se non si trova il campo Subagente resta vuoto e va scelto: mai l'abbinamento dei nomi nel browser, mai il primo dell'elenco. | Con omonimi o nomi assenti il browser proponeva il subagente sbagliato e due Invio creavano un'agenzia che paga la persona sbagliata (collaudo R2-05, V12). | Ugo (collaudo 11/11/2026, R0 domanda 2) | §4.7; `storico.ts`, `FormAgenzia.tsx` |
| D-135 | 11/11/2026 | **Dopo *Importa* in Cerca in Integra si apre la scheda del nuovo cliente o fornitore.** | È quello che la guida prometteva; chi importa vuole subito completare la scheda (scaglioni, agenzie) (collaudo R2-09). | Ugo (collaudo 11/11/2026, R0 domanda 3) | §7 Clienti e Fornitori; `CercaInIntegra.tsx` |
| D-136 | 11/11/2026 | **Cerca in Integra non entra nel prototipo**: è descritta in spec e guida dell'app, e una nota in `prototipo-alternativo/LEGGIMI.md` lo dice. | Il prototipo serve a mostrare l'idea, non deve funzionare in ogni dettaglio (Ugo, 30/10/2026); la ricerca sulle viste di Integra non ha senso senza ponte. Eccezione voluta a D-24 per questa sola funzione. | Ugo (collaudo 11/11/2026, R0 domanda 4) | §16.1; `prototipo-alternativo/LEGGIMI.md` |
| D-137 | 11/11/2026 | **Un documento che entra in una pratica già aperta ha bisogno solo dell'agenzia valida alla data dell'ordine** (D-35/D-60); l'agenzia alla data del documento si chiede solo quando il documento apre una pratica nuova. Precisa D-106 («L'agenzia mancante si configura dal documento»). | Una fattura datata dopo la chiusura dell'agenzia non entrava più nella sua pratica e la provvigione dell'ordine restava fuori; subagente e percentuali seguono l'ordine, non la fattura (collaudo R1, domanda 1). | Ugo (collaudo 11/11/2026, R0 domanda 5) | §6.1, §4.2.6; `documenti.ts` |
| D-138 | 12/11/2026 | **La verità è su Integra: ciò che arriva da Integra non si tocca nel CRM.** Soggetto con un ruolo da Integra: il master è tutto in sola lettura e mostra solo i dati di Integra (409, si correggono in Integra); per ora, da rivedere più avanti. Il codice di Integra nasce solo da *Importa*, mai scritto a mano. Soggetto solo del CRM: cambiare la P.IVA crea una nuova versione (D-46) di ogni ruolo nella stessa transazione. Precisa D-102: il CRM è il centro per ciò che nasce nel CRM. | Il master cambiava ma i ruoli restavano con la P.IVA vecchia; un codice scritto a mano poteva far copiare i dati di un'altra azienda (collaudo R1-08, R1 domanda 2; V12, V13). | Ugo (12/11/2026) | §4.7, §7.4; `soggetti.ts` |
| D-139 | 11/11/2026 | **`sconti` → `interscambio` è `ON DELETE RESTRICT`**: un'agenzia con sconti storici non si elimina, si chiude (come le altre chiavi dell'anagrafica, A3-03). | Eliminare un'agenzia cancellava in silenzio gli sconti storici; le altre chiavi dell'anagrafica sono già RESTRICT (report R1, domanda 3; A3-03). | Ugo (collaudo 11/11/2026, R0 domanda 7) | §4.2.6; migrazione `20261113140000_sconti_restrict` |
| D-140 | 12/11/2026 | **Il PDF di un bollettino non si scarta e non si abbina a una pratica.** Un file in arrivo legato a un bollettino (`abbinato_bollettino_id`) non passa da `POST /api/documenti/:id/scarta` né entra in una pratica con `POST /api/documenti/:id/abbina` o `POST /api/pratiche/:id/documenti`: 409 «Il file è il PDF di un bollettino». Due CHECK nel database: uno scarto non ha legami, e un file non è insieme bollettino e documento di pratica. | Lo scarto porta il file nella pulizia notturna, che dopo i giorni di conservazione cancella riga e file: il bollettino perderebbe il suo PDF. Lo stesso file come fattura di una pratica farebbe contare due volte lo stesso documento. Le due rotte da sole non bastano: il vincolo sta nel database. | collaudo A3-02 | §7.9, §7.16, §15.2.4, `src/documenti.ts`, migrazione `20261113090000_bollettino_file` |
| D-141 | 12/11/2026 | **Una decisione su un documento mancante vale anche contro l'annullamento.** Se un documento ha una riga in `bollettini_attese` (D-56), `DELETE /api/pratiche/:id/documenti/:did` e lo spostamento rispondono 409 «… ha una decisione in un bollettino: non si annulla / non si sposta». La FK `bollettini_attese.documento_id` passa a `ON DELETE RESTRICT`. | Il testo della contestazione di un bollettino chiuso è l'unica traccia del perché una fattura manca: la cascata lo cancellava in silenzio e il bollettino non si ricostruiva più. Il blocco nella rotta dà il messaggio, il vincolo nel database copre ogni altra via. | collaudo A3-03 | §7.7, §7.3, §4.2.7.1, `src/documenti.ts`, `prisma/schema.prisma`, migrazione `20261113100000_attese_restrict` |
| D-142 | 12/11/2026 | **Il numero della pratica è UNIQUE e le chiavi esterne delle tabelle grandi hanno il loro indice.** `CREATE UNIQUE INDEX ordini_fornitore_testata_numero_ordine_key` su `numero_ordine` (resta il blocco consultivo di `nuovaPratica`, che ora serve solo a evitare l'errore); indici su `documenti_campi.corretto_da`, `documenti_in_arrivo.utente_id`, `documenti_in_arrivo.scartato_da`, `bollettini_righe.deciso_da`, `ordini_fornitore_testata.agente_id`. Le FK senza indice su tabelle piccole si lasciano. | L'unicità di `OF/AAAA/NNN` si reggeva solo sul blocco consultivo: un seed, un ricalcolo o un import potevano scrivere due numeri uguali, con i documenti archiviati nella stessa cartella e le ricerche confuse. Senza indice, eliminare un utente faceva scorrere `documenti_campi` dentro la transazione che tiene il blocco degli utenti. | collaudo A3-10, A3-11 | §4.2.7, §4.2.11, `prisma/schema.prisma`, migrazioni `20261113110000_numero_pratica_unico` e `20261113120000_indici_fk` |
| D-143 | 12/11/2026 | **La ricerca delle Pratiche ha gli indici trigram.** Estensione `pg_trgm` e quattro indici `GIN (gin_trgm_ops)` su `ordini_fornitore_testata.numero_ordine`, `ordini_fornitore_documenti.numero`, `clienti_versioni.ragione_sociale`, `fornitori_versioni.ragione_sociale`. Nel 2026-11 `pg_trgm` è *trusted*: la crea il proprietario del database, non serve un amministratore. | La ricerca usa `ILIKE '%testo%'` e con il `%` iniziale i b-tree non servono: si leggeva tutta la tabella. Misura su 20.000 testate e 60.000 documenti: il `EXISTS` sui documenti scende da 40 ms a 0,09 ms, la ricerca per numero da 12,7 a 0,5 ms. Sulla testata il planner non usa ancora il trigram (OR fra tabelle diverse): se i dati veri lo chiedono, si valuta una colonna di ricerca unica. | collaudo A7-24 | §7.2, §4.2.7, `prisma/schema.prisma`, migrazione `20261113130000_ricerca_trgm` |
| D-114 | 08/11/2026 | **Agenzie bloccate nel periodo chiuso (D-51 esteso a `interscambio`).** Creazione, eliminazione e modifica di subagente, fornitore, sconto, % dell'agenzia, regola mensile o `valido_dal` di un'agenzia con `valido_dal` ≤ ultima chiusura del fornitore → 409 «chiudi l'agenzia e aprine una nuova da una data successiva»; `valido_al` si sposta solo dopo la chiusura; la riga del fornitore si blocca `FOR UPDATE` nella stessa transazione. | L'agenzia decide subagente, sconto e percentuale di ogni documento alla sua data (D-35): cambiarla sul posto spostava provvigioni di trimestri liquidati e mandava gli storni al subagente sbagliato (collaudo A2-01, A3-01). | Ugo (collaudo 08/11/2026, U1) | §4.2.6, §7.6; `clienti.ts`, `fornitori.ts` |
| D-115 | 08/11/2026 | **Connessioni solo al superutente.** Le sezioni Posta, Casella e Integra delle Impostazioni si modificano con il permesso nuovo `sistema.connessioni` (solo superutente); le altre sezioni restano a `sistema.impostazioni`. Se cambia server, porta o utente di una connessione la password va riscritta (400): il segreto salvato non parte mai verso un indirizzo nuovo. | Dalla Posta passa il link di reset della password del superutente: un amministratore con un SMTP suo poteva leggerlo e diventare superutente, contro D-39 e D-45 (collaudo A1-01). | Ugo (collaudo 08/11/2026, U2) | §7.15, §8.3; `impostazioni.ts`, `impostazioni-api.ts`, `accesso.ts` |
| D-117 | 08/11/2026 | **Avviso al vecchio indirizzo quando cambia l'email di un utente.** Se un amministratore o il superutente cambia l'email di un utente, dopo il commit il server manda al vecchio indirizzo un'email con chi ha fatto il cambio e quando, senza rivelare il nuovo indirizzo; un invio fallito apre un'anomalia (`posta.respinta`/`posta.connessione`) ma non annulla la modifica. Nessun invio se il vecchio indirizzo è vuoto. | Un amministratore poteva cambiare l'email di un operatore e reimpostarne la password per entrare al suo posto: l'avviso lo rende visibile alla persona (collaudo A1, D-39). | Ugo (collaudo 08/11/2026, U4) | §7.13; `utenti.ts`, `posta.ts` |
| D-118 | 08/11/2026 | **Sul maturato la nota di credito segue la sua fattura.** Una nota di credito di un fornitore sul maturato entra in liquidazione con il riconoscimento della sua fattura (`riconosciutoIn` della fattura `fattura_id`); il motivo «in attesa di incasso» vale solo per le fatture. | Il fornitore spesso non elenca la nota nel bollettino: restava non liquidabile per sempre e il subagente teneva la provvigione intera (collaudo A2-06). | Ugo (collaudo 08/11/2026, U5) | §5.5, §5.14; `motore.ts` (`righeLiquidazione`) |
| D-119 | 08/11/2026 | **Le correzioni di un bollettino contestato arrivano nel bollettino del mese dopo.** Il bollettino contestato non si riapre e non si sostituisce (D-56, uno per fornitore e mese): le correzioni del fornitore sono righe del bollettino del mese successivo riferite ai documenti del mese contestato, e si riconciliano contro quei documenti. | Un secondo bollettino dello stesso mese non si può caricare (vincolo fornitore × mese): senza questa regola le correzioni non avevano dove entrare (collaudo A2). | Ugo (collaudo 08/11/2026, U6) | §5.6, §7.7; `bollettino.ts`, `motore.ts` (`riconcilia`) |
| D-121 | 08/11/2026 | **Il tipo di provvigione del fornitore non cambia dopo la prima chiusura.** `fornitori.tipo_provvigione` (fatturato / maturato) → 409 se il fornitore ha già una chiusura (bollettino verificato o trimestre liquidato, `ultimaChiusura`); `giorno_bollettino` e `giorni_incasso` restano liberi. | Il tipo decide come si ricalcolano dal vivo i mesi chiusi (Analisi, Report): cambiarlo riscriveva il passato; gli altri due campi toccano solo solleciti e scadenze (collaudo A3). | Ugo (collaudo 08/11/2026, U8) | §5.5, §7.4; `fornitori.ts` |
| D-122 | 08/11/2026 | **Uno scartato torna in coda solo se lo si ricarica a mano.** Lo stesso file (stessa impronta) di un documento scartato lo rimette in coda solo con `origine = caricamento`; se arriva dalla casella il giro lo conta fra gli ignorati e lo scarto resta. Precisa D-54. | Un promemoria del fornitore con lo stesso PDF riapriva scarti voluti («Non riguarda Decobrands», «Doppione») (collaudo A4). | Ugo (collaudo 08/11/2026, U10) | §6.5, §7.9; `documenti.ts` (`riceviDocumento`), `casella.ts` |
| D-123 | 08/11/2026 | **La stessa fattura su un'altra pratica solo con la conferma «multi-ordine».** Registrando una fattura o una nota di credito con tipo e numero già presenti per lo stesso fornitore su un'altra pratica, il server risponde 409 «Fattura già registrata in OF/…» a meno che la persona confermi (`multi_ordine: true`). Precisa D-54. | Lo stesso documento arrivato in due file diversi (email e scansione) si abbinava a due pratiche: fatturato e provvigioni doppi (collaudo A4-08). | Ugo (collaudo 08/11/2026, U11) | §4.2.7.1, §7.3; `documenti.ts` (`registra`) |
| D-124 | 08/11/2026 | **Cliente riconosciuto per P.IVA anche quando è condivisa.** La P.IVA letta si confronta **senza il prefisso del paese** (`IT`, `DE`, … davanti alle cifre) e senza spazi; un solo cliente con quella P.IVA → quello; più clienti → decide la ragione sociale normalizzata se il candidato è uno solo, altrimenti «non riconosciuto». Precisa D-92. | I documenti esteri portano la P.IVA con il prefisso (`Ihre USt-IdNr.: IT 01234567890`, `DE 811223344`) e l'anagrafica a volte è scritta senza: senza normalizzare l'operatore doveva cercare il cliente a mano. Con più sedi della stessa catena la P.IVA non basta, quindi il secondo segnale è la ragione sociale, accettata solo a match unico. | Ugo | §6.5 punto 5, D-91, D-92, `app/backend/src/proposta.ts` |
| D-125 | 08/11/2026 | **Il connettore di lettura locale non si sceglie finché non esiste.** In Impostazioni › Lettura `glm_ocr_locale` non si salva (400 «Il connettore locale non è ancora disponibile: si legge con LlamaCloud UE (D-67)») e nella pagina resta in elenco spento col motivo; i documenti si leggono con LlamaCloud UE (D-67). | Scegliendolo i documenti restavano in coda per sempre, senza anomalia (collaudo A4). | Ugo (collaudo 08/11/2026, U13) | §6.5, §7.15; `impostazioni.ts`, `VistaImpostazioni.tsx` |
| D-126 | 08/11/2026 | **Totali e differenze degli importi dal server.** I totali in fondo alle tabelle di Liquidazioni, Analisi e righe del documento e la differenza riga per riga del Bollettino arrivano nella risposta del server (`totali`, `differenza`); la DataTable li mostra senza sommare. La somma nel browser resta solo per colonne che non sono importi. | V12 e CLAUDE.md regola 0 mettono i totali fra i calcoli solo lato server; le somme in virgola mobile davano due totali diversi sulla stessa pagina (collaudo A5-08). | Ugo (collaudo 08/11/2026, U14) | §16.4 (DataTable), §16.5; `liquidazioni.ts`, `analisi.ts`, `bollettino.ts`, `documenti.ts` |
| D-127 | 08/11/2026 | **Il blocco sotto i 744 px vale sulla larghezza della finestra, anche con lo zoom.** `@media (max-width: 743px)`: chi ingrandisce al 200 % su uno schermo da 1440 px vede la pagina «usa un computer o un tablet». Eccezione voluta a WCAG 1.4.10. Precisa D-44. | Il CRM si usa da computer e tablet (D-44); bloccare su `screen.width` lascerebbe passare finestre davvero strette. | Ugo (collaudo 08/11/2026, U17) | §16.6; `app/layout.tsx`, `stile.css` |
| D-129 | 08/11/2026 | **La pagina d'accesso si svuota dopo 2 minuti senza tasti.** È voluto: sulla postazione lasciata aperta i campi scritti non restano a vista. Eccezione voluta a WCAG 2.2.1. | Sicurezza della postazione, come il timeout di inattività (D-89) (collaudo A7). | Ugo (collaudo 08/11/2026, U19) | §7.0; `ScenaAccesso.tsx` |
| D-131 | 08/11/2026 | **D-87 nell'app: blocco su *Apri la pratica*.** Un ordine senza fornitore, agenzia o scaglione resta in coda come «da controllare»; *Apri la pratica* risponde 409 con il dato mancante. L'etichetta «da configurare» in coda è solo del prototipo. Precisa D-87. | Il blocco sui soldi c'è già (niente pratica, niente 0 %); lo stato in coda costava un pacchetto in più senza cambiare il risultato (collaudo A9-09). | Ugo (collaudo 08/11/2026, U22) | §6.1; `documenti.ts` |
| D-144 | 12/11/2026 | **Oggi guarda i bollettini degli ultimi 12 mesi e del mese in corso, non solo dell'anno.** `mesiBollettini` in `src/oggi.ts` genera i periodi da `date_trunc('month', oggi) - interval '12 months'` a `date_trunc('month', oggi)`, con `anno` accanto a `mese` nei titoli («dicembre 2026»). | A gennaio il bollettino di dicembre dell'anno prima non entrava più in Oggi: né fra i non arrivati da sollecitare né fra gli aperti da chiudere. Vale la regola di §5.6/D-03 (bollettino atteso il mese dopo), che non si ferma al cambio d'anno. | collaudo A4-02 | §5.6, §7.1, §8.1, `src/oggi.ts` |
| D-145 | 12/11/2026 | **In esercizio il backend rifiuta i segreti d'esempio.** `controllaAmbiente()` ferma l'avvio, con `NODE_ENV=production`, se `SESSION_SECRET` o `SEGRETI_CHIAVE` mancano, valgono `CAMBIARE` o sono lunghi meno di 32 caratteri; il messaggio manda a `openssl rand -base64 48`. In sviluppo e in prova i valori del `.env.example` passano. | La chiave d'esempio è scritta nel repository pubblico: con un backup del database chiunque decifra i segreti delle Impostazioni (casella, posta, Integra, LlamaCloud) e firma i cookie di sessione. Meglio fermarsi all'avvio che partire insicuri: è lo stesso principio di D-84, applicato ai segreti. | Ugo (collaudo A1-06) | §3.4, `src/main.ts`, `test/avvio.spec.ts` |
| D-146 | 12/11/2026 | **Il motore prende l'agenzia (subagente e sconto) alla data dell'ordine; scaglioni ed eccezioni restano alla data del documento.** `percentuali` cerca l'abbinamento a `p.data`, la data dell'ordine, non alla data del documento. | È la regola di D-137, già valida per l'apertura della pratica: il motore la deve seguire, altrimenti una fattura dopo un cambio d'agenzia va al subagente nuovo. Una fattura datata dopo la chiusura dell'agenzia entra nella pratica (D-137) e valeva 0 € in liquidazione, bollettino e Analisi, senza avviso (collaudo 1-25). | Ugo (collaudo 12/11/2026) | §4.2.6, `motore.ts` (`percentuali`) |
| D-147 | 12/11/2026 | **Lo STARTTLS della casella è obbligatorio sulle porte diverse da 993.** Con `imapflow` `doSTARTTLS: true` la connessione sulle altre porte deve passare a TLS e fallisce se il server non offre STARTTLS: la password della casella dei fornitori non viaggia mai in chiaro. Sulla 993 la connessione è già TLS (`secure: true`) e `doSTARTTLS` resta `undefined`. | La posta in uscita già lo imponeva (`requireTLS`); la casella era l'unico punto in chiaro: un intermediario poteva togliere STARTTLS dalle capacità e ottenere un `LOGIN` in chiaro (collaudo A4-04). | Ugo (collaudo 12/11/2026) | §7.14.1, `src/casella.ts` (`opzioniImap`) |
| D-148 | 12/11/2026 | **Messa in esercizio dietro Caddy ≥ 2.5, con HSTS e IP vero.** `app/deploy/Caddyfile` dichiara il dominio (certificato automatico), manda `Strict-Transport-Security` (1 anno, `includeSubDomains`) e **non** dichiara `trusted_proxies`: Caddy sostituisce `X-Forwarded-For` con l'IP del client, quindi il limite per IP e il registro non si fidano di un'intestazione del browser (D-41). Il proxy aspetta 190 s per il PDF di LibreOffice. Le pagine mettono HSTS anche da `next.config.ts`, solo con `NODE_ENV=production`. Pubblicazione solo di `app/` con `git sparse-checkout set --no-cone "app/"` (in modo cone git porta sempre i file di radice), `npm ci`, `prisma migrate deploy`, build: `deploy/pubblica.bat`; avvio con `deploy/avvia-backend.bat` e `deploy/avvia-frontend.bat`, orchestrati da `avvia-esercizio.bat`. | Senza `trusted_proxies` Caddy è l'unico che può dire l'IP: con una configurazione larga chi prova password poteva ruotare `X-Forwarded-For` e sfuggire al tetto per IP (D-41), e il registro salvava IP falsi. Senza HSTS il primo accesso da una rete ostile poteva essere declassato a http. Lo sparse checkout in modo cone portava sul server specifica, preventivo e istruzioni per agenti, contro il vincolo «solo `app/`». Caddy < 2.5 non è supportato per queste regole. | Ugo | `app/deploy/Caddyfile`, `app/deploy/*.bat`, `app/avvia-esercizio.bat`, `app/frontend/next.config.ts`, `app/README.md`, `app/NOTA-RILASCIO.md`, §3.2, §3.4 |
| D-149 | 12/11/2026 | **Gli avvisi hanno una sola regione live, creata all'avvio e lasciata vuota; gli errori sono `alert`.** Il contenitore `.avviso` si crea una volta sola all'avvio (vuoto e nascosto), non a ogni messaggio: `avviso()` azzera il testo, imposta il ruolo, scrive il messaggio e lo mostra; alla scadenza svuota e nasconde, non elimina. Con `errore` il ruolo è `alert` e dura 8 s; altrimenti `status` e 4,2 s. La regione si riusa solo se è ancora nel documento (`isConnected`). | Una regione live creata insieme al testo spesso non viene annunciata (NVDA): l'utente credeva che un'operazione rifiutata fosse andata a buon fine. Gli errori del server, annunciati come `status`, arrivavano con tono cortese e non venivano riconosciuti come problemi (A7-11). | Ugo (collaudo onda 1) | §16.4; `componenti/Piccoli.tsx` |
| D-150 | 13/11/2026 | **Nota di credito sul maturato di una fattura già liquidata in un trimestre chiuso: la provvigione tolta va nella liquidazione successiva.** Il trimestre chiuso non si riapre (D-33) e la sua fotografia resta: la nota di credito entra nella prima liquidazione aperta dopo, come voce negativa riferita alla fattura, come lo storno sul fatturato (D-11). | Una sola regola per gli storni, nessun trimestre riaperto: con D-118 la nota segue il riconoscimento della sua fattura, ma se quella fattura è in un trimestre già chiuso la quota negativa andrebbe persa o sposterebbe i soldi di un periodo chiuso. | Ugo (collaudo 13/11/2026) | §5.14; `motore.ts` (`righeLiquidazione`), `motore.js` |
| D-151 | 13/11/2026 | **Le soglie di affidabilità della lettura partono da 0,80/0,70 (prima 0,90/0,70) e vivono solo sul server.** Sono una regolazione delle Impostazioni (§7.15) valida ovunque dal valore salvato; il browser non ha soglie fisse: `GET /api/documenti/:id` manda col documento le soglie in vigore e la pagina le usa per colori, «%» e conteggio dei punti. Al salvataggio, se cambiano `soglia_ok` o `soglia_bassa`, i documenti **non ancora abbinati né scartati** (`da_controllare`, `errore`) si riclassificano con le soglie nuove nella stessa transazione (V13), con l'evento nel registro; gli abbinati non si toccano. | Taratura sui documenti veri: sopra 0,80 tutti i campi erano giusti, quindi la soglia «affidabile da» scende a 0,80 e «bassa sotto» resta 0,70. Le soglie fisse nel browser (0,90/0,70) potevano discordare dal livello calcolato dal server e dalle Impostazioni (V12). | Ugo (collaudo 13/11/2026) | §6.5, §7.15; `impostazioni.ts`, `proposta.ts`, `impostazioni-api.ts`, `documenti.ts`, `VistaDocumento.tsx`, `lettura.ts` |
| D-152 | 13/11/2026 | **Fornitore e cliente si cercano in entrambe le fonti e, se il riconoscimento non è univoco, la persona sceglie fra i candidati.** Dopo la lettura il server cerca per P.IVA (con o senza prefisso del paese) e per ragione sociale normalizzata sia nel CRM sia nelle viste di Integra: un solo soggetto del CRM o una sola riga di Integra si usa senza chiedere (come oggi); altrimenti il documento mostra l'elenco dei **candidati** (massimo 10 per fonte, con fonte CRM/Integra, ragione sociale, P.IVA, città se c'è e motivo «P.IVA uguale»/«nome simile») e la persona sceglie: un candidato del CRM si collega, uno di Integra si importa e collega nella stessa transazione (`dati.importa`, D-133/D-111), «Nessuno di questi» resta la ricerca a mano. Mai una scelta a caso fra più candidati (D-111); se Integra non risponde i candidati sono solo del CRM, con la nota. | Sui documenti veri la sola P.IVA o il solo nome non bastano: più soggetti condividono la P.IVA o hanno nomi simili, e scegliere il primo a caso sposta la provvigione al subagente sbagliato (D-92, D-124). | Ugo (collaudo 13/11/2026) | §6.5, §7.9; `proposta.ts`, `documenti.ts` (`scegli`), `anagrafica-integra.ts`, `VistaDocumento.tsx` |
| D-153 | 13/11/2026 | **La somma delle righe sta accanto all'importo in *Correggi i dati letti*.** «Somma righe» in sola lettura accanto all'Importo (da D-154 sopra l'etichetta): spunta verde se coincide, avviso se differisce, non bloccante; il piede della tabella somma l'importo della riga, altrimenti quantità × prezzo. Il server, al salvataggio, ricalcola la somma e aggiunge il punto `totale` se differisce. Lo stesso numero indica nei commenti del codice anche la **ricerca per parole** dei nomi (sigle societarie e punteggiatura escluse, fino a 5 parole di almeno 3 lettere, tutte in AND, CRM e Integra): la regola va rinumerata. | L'importo del documento e la somma delle righe possono non coincidere (per esempio IVA inclusa): il controllo esisteva già sul server come punto da controllare, qui si vede in anteprima mentre si corregge, senza bloccare. | Ugo (collaudo 13/11/2026) | §7.9, §16.4.2; `VistaDocumento.tsx`, `stile.css`, `proposta.ts` (`controlliFissi`) |
| D-154 | 13/11/2026 | **Testata di *Correggi i dati letti* su tre righe, con il pulsante › fra il campo letto e la ricerca.** Riga 1 Tipo · Numero · Data · Importo con «Somma righe» sopra l'Importo; riga 2 Cliente letto › Cliente (CRM + Integra) · Codice cliente · P.IVA cliente; riga 3 Fornitore letto › Fornitore · P.IVA fornitore (nuovo campo letto `piva_fornitore`). Il › porta il valore letto nella ricerca e apre il menu; al posto di «Cerca questo» in questa finestra (resta nei moduli). | Il «Cerca questo» sotto la ricerca spariva fra i campi; la freccia fra campo letto e ricerca dice il verso del dato, e la somma delle righe accanto all'importo non entrava nella riga. | Ugo (collaudo 13/11/2026) | §6.5, §7.9, §16.4.1; `VistaDocumento.tsx`, `CampoRicerca.tsx`, `lettura.ts`, `proposta.ts`, `documenti.ts` |
| D-155 | — | *Numero non usato.* | | | |
| D-156 | 14/11/2026 | **Per provare con i documenti veri si attinge, per ora, anche all'anagrafica del vecchio CRM.** La modalità additiva `--aggiungi` dello script d'import porta fornitori, clienti, subagenti e collegamenti (codice cliente, sconti, subagente) con deduplica per P.IVA/CF e codice esterno; ciò che manca in Integra si segna in `da-inserire-in-integra.csv`. In esercizio la regola resta: un cliente o fornitore nuovo si inserisce prima in Integra e poi si trova nel CRM. | Servivano l'anagrafica storica e i codici cliente del vecchio CRM per collaudare con i documenti veri; Integra resta in sola lettura (D-100) e le mancanze si colmano là, non nel CRM. | Ugo (14/11/2026) | §4.1, §4.5; `prisma/import-vecchio-crm.ts`, `specifica-anagrafica-soggetti.md` §7 |
| D-157 | 14/11/2026 | **Nella ricerca del cliente con un fornitore nel contesto compare la colonna «Cod. cliente».** Mostra `codice_cliente_fornitore` dell'agenzia valida oggi (o l'ultima) per quel fornitore; se coincide con il codice letto la voce sale in testa col segno «coincide con il codice letto». L'entità `cliente` accetta `contesto.fornitore_id` e `codice_cliente`, e `colonne` può essere una funzione del contesto. | Il documento porta il codice cliente del fornitore, non l'id del CRM: senza quella colonna la scelta giusta non si distingue dalle altre; l'agenzia può essere chiusa ma il codice resta utile. | Ugo (14/11/2026) | §7.9, §16.4.1; `entita.ts`, `CampoRicerca.tsx`, `clienti.ts` |
| D-158 | 14/11/2026 | **Le agenzie del vecchio CRM valgono da sempre e si configurano dentro il flusso.** `valido_dal = 2000-01-01`; `--correggi-date` riporta a quella data le agenzie già importate con la data dell'estratto, solo se non toccate né usate in un periodo chiuso. In *Apri la pratica* il pulsante «Aggiungi l'agenzia» apre `FormAgenzia` con cliente, fornitore e codice bloccati e «Valido dal» = data dell'ordine. | Il vecchio CRM non ha la data d'inizio dell'agenzia; configurare senza uscire dal documento evita di perdere il lavoro e di ricominciare la ricerca. | Ugo (14/11/2026) | §5, §7.9; `import-vecchio-crm.ts`, `documenti.ts`, `FormAgenzia.tsx` |
| D-159 | 14/11/2026 | **Le 1587 agenzie importate dal vecchio CRM restano «da confermare» al primo uso.** Quando servono a un documento l'operatore sceglie «Usa questa» (così come sono) o «Configura»; alla prima conferma diventano agenzie normali. L'import le crea `da_confermare`; la migrazione marca quelle già importate. In Clienti, scheda Agenzie, hanno il segno «da confermare» e l'azione «Conferma». | I dati importati non sono verificati: prima si propone ciò che c'è, poi si conferma o si corregge, così un dato vecchio non muove subagente e provvigioni in silenzio. | Ugo (14/11/2026) | §5, §7.9; `schema.prisma` (`interscambio.da_confermare`), migrazione `20261114090000_agenzie_da_confermare`, `documenti.ts`, `VistaClienti.tsx` |
| D-160 | — | *Numero non usato.* | | | |
| D-161 | 14/11/2026 | **Finché le voci di un campo di ricerca non sono arrivate, il campo non mostra l'id né il pallino rosso.** Mostra il nome già noto (`nomeIniziale`, dal documento o dall'agenzia) o resta vuoto con pallino grigio; il verde e il rosso arrivano solo a voci caricate, quando il valore c'è o davvero non c'è. | Un id con il pallino rosso per un istante sembra un errore e disturba a ogni apertura; il nome letto è già disponibile, non c'è motivo di mostrare l'id. | Ugo (14/11/2026) | §7.9, §16.4; `CampoRicerca.tsx`, `entita.ts` |
| D-162 | 14/11/2026 | **Lo scaglione mancante si configura dentro «Apri la pratica».** Il 409 `scaglione_mancante` porta codice e dati (fornitore, sconto, data dell'ordine, `ha_percentuali`) e apre lì la finestra delle percentuali (condivisa `FormPercentuali`) con «Valide dal» proposta alla data dell'ordine; salvando si riprova l'apertura. | Senza percentuali valide la provvigione sarebbe zero; mandare in Fornitori faceva perdere il documento. Stessa logica di D-158: il dato che manca si crea dove serve. | Ugo (14/11/2026) | §7.9, §16.4; `documenti.ts`, `FormPercentuali.tsx`, `VistaFornitori.tsx` |
| D-163 | 14/11/2026 | **La correzione delle percentuali permette di aggiungere e togliere scaglioni.** La correzione sostituisce le righe della versione con l'elenco completo; togliere uno scaglione usato da un'eccezione personale o da un periodo chiuso è rifiutato (409). Da *Apri la pratica*, se alla data dell'ordine esiste già una versione, la finestra apre la correzione di quella con lo sconto dell'agenzia già proposto. | Le condizioni cambiano anche per un solo scaglione: si corregge dove serve, senza creare versioni inutili; i vincoli del server impediscono di rompere eccezioni e periodi chiusi. | Ugo (14/11/2026) | §5.11, §7.4; `fornitori.ts`, `FormPercentuali.tsx` |
| D-164 | 15/11/2026 | **Il riconoscimento impara dai nomi già scelti e usa la somiglianza.** Nuova tabella `alias_letti` (nome letto → soggetto scelto), consultata prima di tutto e alimentata da `scegli`, `correggi` e `abbina`. Il fornitore si riconosce anche per somiglianza `pg_trgm` (`similarity`, soglia 0,6, distacco 0,2): un solo candidato si prende, più candidati → `fornitore_da_scegliere` col punteggio. La coda di lavoro va dal più vecchio e si aggiorna via SSE (`documento.stato`) senza rimontare il dettaglio. | Sui documenti veri una lettera scambiata (ACCESSOIRES / ACCESSORIES) faceva fallire il riconoscimento: `fornitore_id` restava vuoto e l'abbinamento per codice cliente non partiva, pur essendo giusto. | Ugo (15/11/2026) | §6.5; `proposta.ts`, `schema.prisma`, migrazione `20261115090000_alias_letti` |
| D-165 | 15/11/2026 | **La P.IVA letta dal documento si può salvare sul soggetto riconosciuto.** Nota «Salva la P.IVA» quando il soggetto non ha la P.IVA e il documento ne porta una valida; la rotta `POST /documenti/:id/piva` (`dati.modifica`, una transazione, riga bloccata) crea la nuova versione del ruolo, scrive nel registro e rifiuta, col nome, se un altro soggetto ha già quella P.IVA; il testo ricorda di aggiornare anche Integra, che non si tocca (D-100). | La P.IVA mancante impediva il riconoscimento automatico; prenderla dal documento evita la ricerca a mano e non crea un doppione. | Ugo (15/11/2026) | §6.5, §7.9; `documenti.ts`, `VistaDocumento.tsx` |
| D-166 | 15/11/2026 | **Le percentuali non si sommano: il fornitore paga solo la % di Decobrands.** `pct_agente` è la provvigione **totale** che il fornitore riconosce; `pct_subagente` è la parte «di cui» girata al subagente, presa da quella; `dal fornitore(d) = importo × pct_agente / 100`, `al subagente(d)` come le regole del subagente, `margine(d) = dal fornitore − al subagente`. Vincolo `pct_subagente ≤ pct_agente` negli scaglioni, nelle eccezioni personali e nelle agenzie: il server rifiuta con messaggio chiaro. Etichette «Provvigione dal fornitore %» / «di cui al subagente %» / «Margine Decobrands». | La somma («20 % + 8 %») calcolava un atteso sbagliato nel bollettino e un margine gonfiato: il fornitore riconosce una sola provvigione e Decobrands ne gira una parte. | Ugo (15/11/2026) | §4.2.2, §5.1, §5.3, §7.4, §7.8; `motore.ts`, `fornitori.ts`, `clienti.ts`, `FormPercentuali.tsx`, `VistaFornitori.tsx`, `dati.js` |
| D-167 | 15/11/2026 | **I dati interconnessi sono navigabili in sequenza.** Ogni pagina di dettaglio ha link verso le entità che mostra (documento → pratica → cliente → agenzia → fornitore → percentuali); un solo componente link, mostrato solo se l'utente può vedere la pagina d'arrivo, nella stessa scheda; dentro una finestra con modifiche non salvate si chiede conferma prima di uscire. «Indietro» torna alla schermata precedente nello stesso stato. | La catena si percorre senza vicoli ciechi e senza perdere filtri, scheda e scorrimento; il collegamento porta al soggetto vero invece di lasciarlo solo citato. | Ugo (15/11/2026) | §7.3, §7.7, §7.9, §16.4; `strumenti/regole-interfaccia.md`, `CampoRicerca.tsx`, `FormAgenzia.tsx`, pagine di dettaglio |
| D-168 | 15/11/2026 | **La finestra delle percentuali è una sola, piccola, per uno scaglione.** Inserimento e modifica con la stessa finestra; la data modificabile decide se aggiungere alla versione esistente o crearne una nuova che copia gli scaglioni in vigore; la griglia larga sparisce. Niente sovrapposizioni (sconto una volta per versione), matita e cestino per riga, l'ultimo scaglione non si elimina. | La griglia con tutte le righe non stava nella finestra, obbligava a scorrere di lato e rendeva facile modificare la riga sbagliata; le rotte del server accettavano già l'elenco completo. | Ugo (15/11/2026) | §5.11, §7.4; `FormPercentuali.tsx`, `VistaFornitori.tsx` |
| D-169 | 15/11/2026 | **Il numero d'ordine del fornitore è la chiave dell'aggancio.** Campo letto `numero_ordine_fornitore` (nell'ordine è il suo numero; in proforma, conferma, fattura e nota di credito il numero d'ordine stampato: «Auftrag», «Order», «Bestellung», «Ordine n.», «Rif. ordine»). La pratica è marchiata col numero, unico per fornitore (409 se già usato); il documento si aggancia per fornitore + numero prima di tutto il resto e cliente, fornitore e agenzia si ereditano dalla pratica, verificando il cliente. La codifica interna `OF/AAAA/NNN` resta il riferimento principale. | È il numero che il fornitore conosce e ripete sui suoi documenti; da solo non basta (un fornitore può riusarlo in un altro anno), quindi la chiave è la coppia fornitore + numero. | Ugo (15/11/2026) | §6.5, §7.3, §7.9; `documenti.ts`, `schema.prisma`, migrazione `20261115100000_numero_ordine_fornitore` |
| D-170 | 15/11/2026 | **La risposta completa del lettore si salva (`lettura_grezza`), mai al browser.** Colonna JSONB con il JSON del lettore (testo/markdown compreso, tetto 5 MB), salvata nella stessa transazione dei campi; al browser va solo il booleano. Azione «Ricava i campi nuovi dal testo già letto» per `numero_ordine_fornitore` con regole sulle diciture, senza rileggere; «Rileggi il documento» vale anche da `da_controllare`. Lo stesso numero indica nei commenti del codice anche il pallino verde che apre la scheda nella stessa scheda e la conferma prima di uscire con dati non salvati (descritti in D-161 e D-167): la regola va rinumerata. | I campi nuovi si ricavano dai documenti già letti senza spendere una lettura, e il testo del documento non gira al browser (V12). | Ugo (15/11/2026) | §6.5, §7.9; `lettura.ts`, `lettore.ts`, `documenti.ts`, `sistema-dati.ts` |
| D-171 | 15/11/2026 | **Sulle righe le azioni sono icone in colonne fisse.** Componente unico `AzioniRiga`: ogni azione sempre nello stesso punto (Modifica, Elimina in rosso tenue, Conferma in evidenza), slot vuoto se l'azione manca, `aria-label`/`title` «verbo oggetto», area di clic 32 px, fuoco a bordo interno (D-64). Vale anche per gli elenchi che non sono DataTable (Elenco, incassi). | I pulsanti con testo allargavano le tabelle e facevano scorrere di lato; un'azione che si sposta da una riga all'altra fa sbagliare riga. | Ugo (15/11/2026) | §7.2, §7.3, §7.7, §7.9, §7.14, §7.16, §16.4, §16.4.1; `AzioniRiga.tsx`, `stile.css` |
| D-172 | 15/11/2026 | **Le operazioni senza ritorno chiedono la conferma con una casella da spuntare.** Componente `ConfermaGrave`: titolo, elenco vero delle conseguenze, casella «Ho capito, procedi» che abilita il pulsante rosso (Invio non conferma finché è spenta, Esc annulla). Si applica a rileggere o scartare un documento, eliminare (agenzie, scaglioni, eccezioni, utenti, subagenti), chiudere bollettini e liquidazioni, annullare documenti, svuotare gli Scartati; le conferme leggere restano. | Una perdita di dati definitiva deve costare una scelta esplicita, non un clic distratto; il server non cambia, è solo interfaccia. | Ugo (15/11/2026) | §7.3, §7.9, §16.4, §16.4.1; `ConfermaGrave.tsx`, `FormModal.tsx` (`casella`), `stile.css` |
| D-173 | 15/11/2026 | **Gli identificativi che si copiano hanno l'icona «Copia».** Numero di pratica, ordine e documento, codice cliente, P.IVA con il componente `Copiabile`: copia negli appunti e mostra una spunta per 1,5 s, non sposta il testo, `aria-label`/`title` «Copia …», fuoco a bordo interno (D-64); dentro le celle delle tabelle da valutare caso per caso. | Quei codici si ricopiano per dialogare con fornitori e clienti: trascriverli a mano introduce errori. | Ugo (15/11/2026) | §7.3, §7.9, §16.4; `Copiabile.tsx`, `VistaPratica.tsx`, `ConsultaDocumenti.tsx` |
| D-174 | 15/11/2026 | **Più conferme o proforme per la stessa pratica: parziali o sostitutive.** `ordini_fornitore_documenti.ruolo` (`parziale` · `sostituisce`) e `superato_da` (id di chi sostituisce, senza FK): la prima conferma porta ad «attesa fattura» come oggi, le successive si agganciano (parziale si somma, sostituisce marca superati i precedenti che non contano più). La proposta non esclude più le pratiche già confermate e suggerisce il ruolo (parziale se la somma resta entro l'ordine ±1 %, sostituisce se ≈ ordine o ≈ una conferma presente); l'operatore sceglie in «Abbina». «Confermato X di Y» e superati in grigio con «superata da …». | Allo stesso ordine arrivano più conferme e una può correggere la precedente: senza il ruolo le somme raddoppiavano o perdevano pezzi. | Ugo (15/11/2026) | §4.2.7.1, §5, §6.5, §7.3, §7.9; `schema.prisma`, migrazione `20261115200000_conferme_multiple`, `documenti.ts`, `proposta.ts`, `VistaPratica.tsx` |
| D-175 | 15/11/2026 | **Il riconoscimento è lo stesso in elenco, dettaglio e correzione.** All'apertura del dettaglio il fornitore riconosciuto ma non ancora salvato si salva sul documento in una transazione (evento `documento.update` `riconosciuto: 'apertura'`), senza mai sovrascrivere una scelta a mano. Il cliente non si salva (resterebbe «scelto a mano» e vincerebbe sull'abbinamento per codice); l'intestazione e *Correggi* usano il riconoscimento del server. Sotto «Codice cliente» una spunta verde se il codice è del cliente associato, altrimenti un avviso giallo col motivo (codice di un altro cliente, senza agenzia, da confermare). | L'elenco diceva «non riconosciuto» mentre il dettaglio sì: una sola fonte per ciò che si mostra, e il riconoscimento derivato dal server non è un dato dell'utente. | Ugo (15/11/2026) | §6.5, §7.9; `documenti.ts`, `VistaDocumento.tsx` |
| D-176 | 15/11/2026 | **Le righe lette si copiano nella pratica all'abbinamento e i punti si dividono in lettura e confronto.** Le righe del documento con la fase (ordine, conferma, fattura) si copiano nella fotografia della pratica (prima le creava solo il seed), con un comando di servizio per il riempimento retroattivo; il confronto usa le sole righe di fase e codici normalizzati (spazi via, zeri iniziali parte del codice). L'articolo assente è un avviso non grave col numero dell'ordine, un solo punto se ne mancano più della metà. Il livello «Affidabile» riguarda la sola lettura; i punti sull'abbinamento stanno nel gruppo «confronto» (in *Correggi*: «Lettura» / «Confronto con la pratica»; nell'elenco «N avvisi»). | Il confronto righe non trovava le righe della pratica e mescolava i problemi di lettura con quelli di abbinamento, cambiando il livello per cose diverse. | Ugo (15/11/2026) | §4.2.8, §6.5, §7.9; `documenti.ts`, `proposta.ts`, `riempi-righe.ts` |
| D-177 | 15/11/2026 | **Il filtro per stato nell'abbinamento sta nella finestra di ricerca, come tendina a destra del campo.** Il filtro (Tutte · Solo ordine · Confermata · Fatturata) vive nella finestra di ricerca (lente/F4), non accanto al campo né in una riga di segmenti; il valore lo tiene il chiamante, il campo scritto direttamente usa lo stesso filtro, il valore iniziale viene dal tipo del documento. Il server applica il filtro (lista chiusa, V12). | Il campo e lo stato devono stare su una riga sola; i segmenti in cima alla finestra rubavano spazio e non era chiaro che filtro applicassero. | Ugo | §7.9, §16.4; `pratiche.ts`, `documenti.ts`, `CampoRicerca.tsx`, `VistaDocumento.tsx` |
| D-178 | 15/11/2026 | **Filtro per stato delle pratiche suggerite (predefinito «Aperte»).** Nella scheda «Pratica proposta» del documento una tendina «Stato delle pratiche» (Aperte · Tutte · Solo ordine · Confermata · Fatturata) filtra le pratiche suggerite; predefinita «Aperte» (le fatturate non si propongono). Il server filtra le candidate prima dell'esito e dopo la risoluzione «nota di credito → fattura stornata», che resta certa. Filtro di stato (non di entità), quindi è ammessa la tendina (D-22 vale per le entità). | Nel dettaglio del documento uscivano anche pratiche già fatturate, che non sono una proposta utile; la nota di credito che storna una fattura resta certa anche con «Aperte». | Ugo | §7.9, §16.4; `proposta.ts`, `documenti.ts`, `VistaDocumento.tsx`, `Schede.tsx` |
| D-179 | 15/11/2026 | **Un importo di riga letto come 0 su una riga che vale è «non letto», non 0.** In `componiLetto` un `importo === 0` su una riga con quantità × prezzo > 0 è uno 0 del lettore (il campo `number` senza valore): diventa null e la riga risulta calcolata. Uno 0 vero (riga omaggio con prezzo 0) resta 0. Vale sui documenti già letti senza rileggere. | Il lettore scrive 0 nella colonna importo quando non la legge; senza la regola le 26 righe di un ordine risultavano lette a 0,00 € in arancio, ognuna da correggere a mano. Completa la regola dell'importo calcolato quando non letto. | Ugo | §7.9, §6.5; `proposta.ts` (`componiLetto`) |
| D-180 | 15/11/2026 | **La testata della pratica mostra tutti gli ordini e mette i soggetti su una riga a parte.** «Ordine fornitore» al singolare, «Ordini fornitore» al plurale, ogni numero con l'icona «Copia»; cliente · fornitore · «seguita da» stanno su una riga sotto (senza accodarsi ai numeri). L'elenco arriva dal server (`fasi[0].numeri`, D-90). | Con più ordini la testata ne nascondeva uno e la riga unica di cliente · fornitore · subagente · ordini diventava illeggibile. | Ugo | §7.3; `VistaPratica.tsx` |
| D-181 | 15/11/2026 | **La sessione del database va tenuta in UTC; l'ora la decide il backend.** `options: '-c TimeZone=UTC'` nella connessione Prisma; le date di lavoro restano in `Europe/Rome`. L'adattatore `@prisma/adapter-pg` scrive le `Date` senza fuso e rilegge i `timestamptz` senza fuso: entrambe corrette solo con la sessione UTC. | Con la sessione del server (`Europe/Berlin`) ogni ora scritta da Node perdeva un'ora e ogni ora letta ne guadagnava una: l'ora del registro (`ts`, scritto con `DEFAULT CURRENT_TIMESTAMP` e riletto da Prisma) appariva un'ora nel futuro. | Ugo | §16.5; `prisma.service.ts`, `superutente.ts`, `lettura-prova.ts` |
| D-182 | 15/11/2026 | **Lo scaglione della provvigione si sceglie dallo sconto medio letto sui documenti, non più da `interscambio.sconto`.** Sconto medio = 1 − netto/lordo del documento che comanda (fattura → conferma/proforma → ordine), pesato sul lordo; senza righe utili riserva sullo sconto dell'agenzia. Scelta «primo scaglione ≥ sconto medio»; oltre l'ultimo scaglione = anomalia `provvigione.sconto_medio` (pratica non chiudibile, provvigione da decidere). | Lo sconto di riga dei documenti determina lo scaglione reale; `interscambio.sconto` (impostato a mano o dall'import) non era più la fonte. | Ugo | §5.3, §4.2.7.1; `motore.ts` (`scontoMedio`, `scaglione`), `pratiche.ts`, `bollettino.ts`, `liquidazioni.ts`, `sconto-medio-ricalcola.ts`, `VistaPratica.tsx` |
| D-183 | 15/11/2026 | **La base della provvigione è il netto meno le spese escluse; ogni documento fiscale salva i suoi valori calcolati e li congela alla chiusura.** Spese in fattura (trasporto, imballo, «Fracht») escluse dalla base salvo che l'accordo col fornitore le includa (`fornitori.spese_base_provvigione`, predefinito no); lo sconto medio si calcola sulle sole righe di merce. Il documento salva `calcolo` (JSON: base, spese, netto, sconto medio, scaglione, % e provvigioni, regola) e `congelato_il` quando entra in un periodo chiuso; la pratica non salva valori suoi (è la somma dei documenti); niente controllo notturno, i documenti aperti si ricalcolano a ogni cambio di un ingresso del calcolo. | Integrità dei numeri chiusi (si fissano alla chiusura e si correggono solo con rettifiche) e accordo per fornitore sulle spese; «il da dove viene» sta sul documento, non in un ricalcolo notturno. | Ugo | §5.3, §4.2.7.1, §4.2.8; `motore.ts` (`calcoloDocumento`, `baseDoc`), `pratiche.ts`, `documenti.ts`, `fornitori.ts`, `bollettino.ts`, `liquidazioni.ts`, `analisi.ts`, `prisma/schema.prisma` + migrazione `20261115210000_valori_congelati` |
| D-184 | 15/11/2026 | **Nelle email ai fornitori vincono i riferimenti del destinatario.** Il sollecito di conferma mette in testa `Ordine <numero del fornitore>` (`numero_ordine_fornitore`, D-169), poi data, cliente con «vostro codice cliente», importo, «conferma attesa entro il»; il numero della nostra pratica va in fondo come «nostro rif. OF/…», mai come primo riferimento. Singolare/plurale coerente («inviarcela»/«inviarcele»). | Il riferimento che serve a chi riceve è il numero d'ordine che il fornitore conosce, non il nostro OF. | Ugo | §7.1, §5.12; `solleciti.ts` |
| D-185 | 15/11/2026 | **La ricerca delle pratiche è vincolata a cliente e fornitore del documento.** `GET /api/pratiche/cerca` accetta anche `cliente_id` (validato come `fornitore_id`), con entrambi filtra per tutti e due. Il predefinito della tendina «Stato delle pratiche» e della ricerca dipende dal tipo: nota di credito e pagamento → fatturate, gli altri → aperte; lo sceglie il server (`filtroDalTipo`) se il browser non manda nulla (V12). Con codice cliente vuoto e cliente scelto nessun avviso sul codice. | Un documento è sempre di un cliente e un fornitore: cercare per solo fornitore proponeva pratiche di altri clienti; un pagamento paga una fattura e una nota di credito la storna, quindi cercano le fatturate. | Ugo | §7.9, §6.5; `pratiche.ts`, `proposta.ts`, `documenti.ts`, `VistaDocumento.tsx`, `CampoRicerca.tsx` |
| D-186 | 15/11/2026 | **Dalla pratica si prende un documento già in coda («Prendi dalla coda»).** Nelle finestre «Registra un documento / la fattura / la nota di credito» la scelta «Prendi dalla coda · Inserisci a mano»; l'elenco è filtrato per fornitore (e cliente riconosciuto) della pratica, per tipo quando la finestra è di un tipo solo. Il browser manda solo documento, pratica ed eventuale fattura stornata; il server blocca la riga, ricava tipo/numero/data/importo dal file letto e ricontrolla fornitore/cliente (V12/V13). | Evita di reinserire a mano un documento che il sistema ha già letto dalla coda; il server resta l'unico a decidere i dati (V12). | Ugo | §7.3, §7.9, §8.1; `documenti.ts` (`abbina`, `elenco`), `VistaPratica.tsx` |
| D-187 | 15/11/2026 | **La barra dei filtri sta su una riga; quando non ci stanno, i segmenti diventano una tendina.** `FilterBar` misura la larghezza (contenitore e larghezza necessaria dai segmenti a larghezza naturale) e, se la barra andrebbe a capo, sostituisce i segmenti con una tendina (`<select>` con i numeri); si torna ai segmenti solo con spazio vero (isteresi). Vale per tutte le pagine. | I segmenti a capo spingono i filtri sotto e cambiano la disposizione; la tendina li mantiene sulla stessa riga. | Ugo | §16.4.1; `FilterBar.tsx`, `stile.css` |
| D-188 | 15/11/2026 | **Un pagamento non ha un numero di documento.** Il campo numero per il pagamento diventa «Riferimento (facoltativo)» e si può lasciare vuoto; il titolo diventa «Pagamento del <data> · <importo>» (o il nome del file). Il doppione resta solo per impronta del file (D-60). | Una distinta di bonifico o una foto della banca non ha numero; il salvataggio era bloccato solo dal frontend mentre il server già lo permetteva. | Ugo | §7.9, §16.4; `VistaDocumento.tsx`, `VistaDocumenti.tsx` |
| D-189 | 15/11/2026 | **Mai la parola «esatta» per la posizione del campo nel documento.** «Seleziona un campo per vedere dove è stato letto sul documento (indicativo)», «posizione indicativa» / «posizione approssimativa, controlla sul documento»; il valore `precisione` del backend non cambia. | Le scritte promettevano troppo: il riquadro non è sempre preciso. | Ugo | §7.9; `VistaDocumento.tsx`, `lib/guida.ts` |
| D-190 | 15/11/2026 | **Il visualizzatore PDF non fallisce in silenzio.** Al posto del `.catch(() => {})` muto, un errore mostra «Non riesco a mostrare il PDF» con «Riprova» e «Apri il PDF»; durante il caricamento compare la sagoma (D-59), non un pannello grigio vuoto. | Il riquadro grigio muto era la causa di «il PDF non si vedeva, poi ricaricando sì»: l'errore spariva senza segnale né retry. | Ugo | §7.9, §16.4; `PdfEvidenziato.tsx` |
| D-191 | 15/11/2026 | **Le voci «Documenti da decidere» di Oggi dicono quale documento e usano il nome letto del fornitore.** Bollettino → «Registra il bollettino di …», ordine → «Apri la pratica dell'ordine …» (o il nome del file se non letto); gli altri «Abbina …» + nome file (non letto) o tipo/numero (letto). Descrizione su una riga (fornitore, cliente, importo, data, motivo, giorni in coda, troncata con ellissi). Il fornitore è `ragione_sociale` dell'abbinamento, poi il campo letto `fornitore`, poi «non riconosciuto». | Le voci erano tutte uguali («Abbina documento»/«fornitore non riconosciuto») anche quando l'OCR aveva letto il nome (es. ARTE WOHNACCESSOIRES). | Ugo | §7.1, §8.1; `oggi.ts`, `Flussi.tsx` |
| D-192 | 15/11/2026 | **«Usa importi calcolati (N)» in blocco.** Nella tabella delle righe, accanto ad «+ Aggiungi riga», compare solo se almeno una riga ha l'importo letto diverso dal calcolato (≥ 0,01 €); un clic porta tutte quelle righe al calcolato (stessa regola del pulsantino «Usa … €»). Non salva: si salva con «Salva e ricalcola l'abbinamento»; il server ricalcola il vuoto (V12). | Con molte righe lette a 0 i pulsantini uno per uno sono decine di clic; stessa regola del pulsantino singolo, quindi stessa funzione. | Ugo | §7.9; `VistaDocumento.tsx` |
| D-193 | 15/11/2026 | **Un solo visualizzatore per PDF e foto, con riquadro e ingrandimento.** Il riquadro del valore si disegna anche sulle foto (la posizione è già salvata dal lettore); ingrandimento (−/%/+/Adatta), Ctrl+rotella verso il puntatore, trascinamento a documento ingrandito, doppio clic = Adatta; se la posizione manca: «Posizione del campo non disponibile per questo documento» (anche per i PDF). | Le posizioni sulle foto c'erano ma il frontend mostrava una semplice `<img>` senza riquadro; mancavano anche zoom e nota per la posizione assente. | Ugo | §16.4; `PdfEvidenziato.tsx`, `VistaDocumento.tsx`, `Icona.tsx` |
| D-194 | 15/11/2026 | **Le righe di spesa (codice testo) si leggono e si segnano `spesa: true`.** Il prompt mette ogni riga (anche con codice testo o mancante) e il campo `spesa` la marca come non merce («Fracht», «Porto», «Versand»); `componiLetto` lo legge. I calcoli delle provvigioni non cambiano (le spese entrano o no nella base per D-183). | La colonna articolo di queste righe contiene testo, il prompt le scartava e il totale non tornava con la somma delle righe. | Ugo | §6.5; `lettura.ts`, `proposta.ts` |
| D-195 | 15/11/2026 | **Tendina dell'anno nelle Liquidazioni.** Nella testata un `<select>` nativo con l'anno (a sinistra di «Esporta in Excel»), predefinito l'anno corrente; l'elenco lo dà il server (`GET /liquidazioni/anni`), dal primo anno con dati all'anno corrente. Scegliendo un anno si resta sullo stesso trimestre; l'anno entra nell'indirizzo e nell'esportazione. | Oggi l'anno non si può scegliere: si vedono solo i trimestri dell'anno in corso. | Ugo | §7.8; `liquidazioni.ts`, `VistaLiquidazioni.tsx`, `componenti/Pagina.tsx` |
| D-196 | 15/11/2026 | **La «Somma righe» sta accanto all'etichetta «Importo», in rosso quando differisce, senza «· diversa di …».** Il testo può andare a capo senza allargare la colonna (niente barra orizzontale); la differenza esatta sta nel suggerimento (title). | Il testo «Somma righe … · diversa di …» allargava la colonna e faceva comparire sempre la barra di scorrimento orizzontale della finestra. | Ugo | §7.9; `VistaDocumento.tsx`, `stile.css` |
