# Specifica — CRM Ordini a Fornitore, Bollettini e Provvigioni (Decobrands)

**Versione:** 8.32 - guida in linea nell'app (F5-A8, §7.17): `/guida/:argomento` con i 17 argomenti del prototipo (senza *Vendita diretta*, D-08), ricerca in tutto il testo (anche nomi di pulsanti e finestre), schemi del ciclo, degli stati e degli incassi, argomenti di *Gestione* solo con il permesso, link alle pagine vere dell'app, contenuti in `lib/guida.ts`. 8.31 - aggiornamenti dal server (F4-A6, §16.4.2, D-23): `GET /api/eventi/flusso` in Server-Sent Events, `collegato`, con un solo ciclo ogni ~4 s che legge il registro mentre qualcuno è collegato (aree dai codici e, per i codici generici, dall'entità; nessun evento vecchio; battito ogni ~25 s). Nel guscio un solo `EventSource` per scheda; in Pratiche e Bollettini i contatori si aggiornano da soli, le righe restano e la barra *Ci sono aggiornamenti · Aggiorna* applica i dati nuovi mantenendo filtri, ordinamento, pagina e scorrimento. Nella scheda *Pratiche* del cliente completati i filtri standard (segmenti con conteggi, fornitore a selezione multipla, ricerca, riepilogo). 8.30 - scheda *Report subagenti* nelle Liquidazioni (F4-A4, §7.8): `GET /api/liquidazione/report?anno=&trimestre=&subagente=` con i numeri di `analisiTrimestre` per il trimestre e per quello prima; senza subagente l'elenco con quota e variazione sul trimestre prima, con un subagente i tre numeri con il confronto, le barre dei trimestri dell'anno già iniziati e i primi 5 clienti. Scheda con grafico, tabella, numeri e link ad Analisi; percentuali e variazioni calcolate dal server (V12). 8.29 - nota della segnalazione d'incasso in una colonna sua (D-62, §5.14, §7.3, §8.1): `PUT /api/documenti/:id/incasso` scrive `nota_incasso` e non tocca più `note` (la nota del documento); `statoIncasso` e `incassi` del dettaglio pratica la restituiscono. 8.28 - pagina Liquidazioni nell'app (F4-A1, §7.8): `/liquidazioni` rimanda al trimestre di oggi, `/liquidazioni/<anno>/<trimestre>` con i quattro riquadri, l'elenco dei subagenti che fa da filtro, la scheda *Documenti* (contatore giallo con documenti in attesa, storni e riaccrediti con la fattura d'origine) e *Chiudi il trimestre* con conferma; `GET /api/liquidazioni` restituisce anche `documenti` con i nomi risolti e le etichette decise dal server (V12); la fotografia di un trimestre chiuso contiene le righe dei documenti, quindi il prospetto pagato si rilegge uguale (§4.2.19); il link *Analisi completa* passa periodo e subagente all'Analisi, che ora li legge dall'indirizzo (§7.22). Restano F4-A3 (export, PDF compreso) e F4-A4 (scheda *Report subagenti*). 8.27 - pagina Analisi (F4-A5, §7.22): numeri, grafici e tabella calcolati dal server con `fattiAnalisi` (competenza per data del documento, D-19), periodo di 3/6/12 mesi, filtri a selezione multipla con le voci proposte dagli altri filtri (D-23), filtro incrociato da barre e righe, tabella raggruppabile, esportazione Excel e CSV (`GET /api/analisi`, `GET /api/analisi/esporta`); il PDF e i grafici come immagine arrivano con F4-A3 (D-61). 8.26 - incassi dei clienti sul server (F3-A3, parte autonoma): lo stato d'incasso entra nel dettaglio della pratica (`incassi` per fattura, §7.3); `pagamentiDaSollecitare` nel motore ed esposto da `GET /api/pagamenti/solleciti` (voci + un testo per cliente composto dal server, come la contestazione D-58); `PUT /api/documenti/:id/incasso` (*Segna come non pagata/pagata*, fonte manuale, evento `stato.change_state` sul documento §15.2.5) e `POST /api/pagamenti/solleciti` (il testo è stato copiato: `solleciti +1`, `sollecitata_il=oggi`, evento `documento.export`). Restano le pagine (gruppo *Pagamenti da sollecitare* in Oggi F5-A1, finestra dei solleciti, riquadro *Incasso del cliente* §7.3) e l'evento sul documento alla verifica di un bollettino con storno/riaccredito. 8.25 - documenti della pratica per ogni fornitore (D-60, server): tipi ordine (1..n, si sommano), conferma e proforma facoltative (l'una o l'altra porta a *confermata*, la fattura a *fatturata* anche senza), fattura e nota di credito (le sole che toccano le provvigioni), pagamento (segno *pagato*, nessun effetto sui numeri), altro; ordine e conferma tolti dalla testata, righe sul loro documento; numero pratica `OF/AAAA/NNN` dal server; `POST /api/documenti/:id/abbina` (tipo e pratica scelti a mano, l'ordine senza pratica la apre) e `POST /api/pratiche/:id/documenti/:did/sposta`; canale con PDF, JPEG e PNG, Excel rifiutati (415); archivio per pratica `pratiche/AAAA/AAAAMM/<numero>/<tipo>_<numero o data>.<est>` dopo il commit (sostituisce D-55); `pagato` nel dettaglio e nell'elenco delle pratiche. 8.24 - nella cerniera dei bollettini la colonna *Differenza* si adatta ai valori fino a 999.999.999,99 € (minimo 230 px, a capo vietato), allineata fra riepilogo e righe. 8.23 - caricamento con sagome (D-59): titolo della pagina subito, il resto come sagome con la forma del contenuto finché i dati non arrivano (niente zeri, «Nessun elemento» o testi vuoti), stesse altezze e luce che scorre; sotto i ~150 ms non compaiono; ai cambi di filtro la tabella resta, più tenue. Componenti `Sagoma`, `SagomaTabella`, `SagomaSegmenti`, `SagomaRiquadri`, `SagomaMatrice`, `SagomaElenco`, hook `useSagome`, `DataTable`/`FilterBar` con `caricando`; guida §16.4.3. 8.22 - ritocchi al dettaglio del bollettino (F3-A2b, D-58): con righe aperte la barra dice *Mancano N righe da decidere* e *Vai alla prima* porta alla prima riga di *Da decidere* evidenziandola; *Abbina il documento* cerca fra fatture e note di credito del fornitore di ogni periodo (`GET /api/documenti/cerca`, con `su_riga` per quelle già usate); sotto gli 860 px la cerniera si impila con le etichette e i pulsanti a tutta larghezza; *Prepara la contestazione* (`GET /api/bollettini/:id/contestazione`) con testo dal server e modificabile, *Copia* e *Scarica .txt*, nessuna email. 8.21 - liquidazioni nell'app (F4-A1, server): `GET /api/liquidazioni?anno=&trimestre=` con i quattro trimestri (stato e totale), i subagenti con i totali, il riepilogo e se il trimestre si può chiudere; il trimestre chiuso si legge dalla fotografia; `POST /api/liquidazioni/:anno/:trimestre/chiudi` (`provvigioni.chiudi`) con trimestre finito e nessun documento in attesa dei bollettini, blocco di tutti i fornitori in ordine di id, fotografia, documenti e voci legati, evento `stato.change_state` (§15.2.6); le voci di storno già liquidate restano nel loro trimestre (D-57). 8.20 - pagina del bollettino nell'app (F3-A2): cerniera con gruppi *Da decidere · Decise · Quadrano · Incassi*, totali e azione proposta in alto; decisioni *accettato/contestato/attendere* con motivo (obbligatorio per contestare), documento mancante in `bollettini_attese` (D-56) e annullamento; abbinamento a mano a un documento del mese scelto fra quelli del dettaglio; chiusura *verificato/contestato* solo quando l'azione è *verifica/contesta*, con conferma che il mese diventa chiuso e pagina in sola lettura; PDF del bollettino affiancato; ritorno alla matrice nello stesso punto. 8.19 - matrice dei bollettini nell'app (F3-A1): `GET /api/bollettini?al=AAAA-MM&fornitori=1,2&vista=tutti|dafare` con 6 mesi che finiscono in `al`, stato per cella (atteso, non arrivato, arrivato, verificato, contestato, mese in corso, nessuna fattura) e totale riconosciuto in SQL (D-52); conteggi dei segmenti sui fornitori filtrati (D-23); `POST /api/bollettini {fornitore_id, anno, mese, arrivo_id?}` con fornitore bloccato, un solo bollettino per fornitore e mese (409), PDF dal canale comune e evento §15.2.5 nella stessa transazione; pagina con `PeriodoMesi`, filtro fornitore a selezione multipla, matrice che scorre di lato sul tablet; dettaglio segnaposto fino a F3-A2. 8.18 - dettaglio del bollettino nell'app (F3-A2): `GET /api/bollettini/:id` con la cerniera dal motore caricando solo i dati del bollettino; decisioni sulle righe e sui documenti mancanti (tabella `bollettini_attese`, D-56), abbinamento a mano di una riga a un documento, chiusura `verificato`/`contestato` con congelamento e periodo chiuso (D-51), eventi §15.2.5. 8.17 - dettaglio della pratica veloce: `GET /api/pratiche/:id` carica solo i dati della pratica (`caricaDatiPratica`, D-52, §7.3), stessa risposta, prova di coerenza su ogni pratica del seed. 8.16 - dettaglio pratica nell'app (F2-A2): `GET /api/pratiche/:id` con testata, stato, binario delle fasi, righe a confronto, provvigione e azione proposta calcolati dal motore; `GET /api/documenti/:id/file` legge il percorso solo dal database (D-55) e serve il PDF in linea e in sandbox; pagina con binario, schede *Riepilogo* (provvigione, documenti fiscali) e *Righe a confronto*, avviso delle variazioni e apertura sul confronto arrivando dal filtro *Con variazioni*; finestre della fattura e della nota di credito con il PDF; versione 8.15 - PDF in cartelle per anno e giorno di caricamento (D-55): `DOCUMENTI_DIR/AAAA/AAAAMMGG/<impronta>.pdf`, percorso salvato in `documenti_in_arrivo.file_percorso`; versione 8.14 - documenti fiscali della pratica e canale comune dei file (F2-A3, D-54): `GET/POST/PUT/DELETE /api/pratiche/:id/documenti` con netto e totali dal server, importo digitato positivo (la nota di credito si salva negativa), storno totale calcolato dal server, nota di credito non oltre quanto resta della fattura, numero unico per fornitore; `POST /api/documenti/carica` con un solo ingresso `riceviDocumento` (PDF dal contenuto, limite `DOCUMENTI_MAX_MB`, file su disco prima della transazione con l'impronta come nome, coda `in_coda`); versione 8.13 - il menu delle aree passa nel menu dell'utente (D-53): in cima alla barra resta il nome dell'area, in fondo il riquadro dell'utente che apre verso l'alto email, aree, Cambia la password, Guida ed Esci; versione 8.12 - elenco pratiche in SQL (D-52): stato, importo e variazioni ricavati dal motore e salvati sulla pratica con `aggiornaPratica` nella stessa transazione di ogni modifica; scadenza della conferma e subagente alla data calcolati nella query; versione 8.11 - aree in un menu a tendina nella barra (come un menu di account: email in cima, voci con icona e spunta sull'area aperta); versione 8.10 - pagina Pratiche nell'app (F2-A1): elenco con segmenti di stato e conteggi dal server, filtri standard, ordinamento e pagine sul server, variazioni con lo scostamento in euro; versione 8.9 - pagine delle percentuali datate e delle eccezioni personali nell'app (F1-A5): versioni in ordine (in vigore, future, passate) con *Correggi* ed *Elimina*, eccezioni con periodo e *Cambia la %*/*Termina*; versione 8.8 - un cambio vale da una data in poi, mai nel periodo chiuso (D-51): `ultimaChiusura` del fornitore, versioni delle percentuali anche fra due esistenti, correzione ed eliminazione dopo l'ultima chiusura, eccezioni personali con periodo proprio (fornitore, sconto, dal, al) senza copie, cambio di % e fine; versione 8.7 — sincronizzazione da Integra (F1-A4): colonne delle viste, margine di un giorno, disattivati esposti, anomalie `integra.*`, ponte finto `decobrands_ponte_prova`; versione 8.6 — percentuale e regola mensile dell'agenzia solo al responsabile (D-50), sconti proposti dagli scaglioni, filtri a ricerca multipla negli elenchi di Clienti e Fornitori; versione 8.5 — arrotondamento contabile al centesimo e decisione salvata sulla riga del bollettino (D-49); versione 8.4 — schema completo (fase 2a): CHECK dei valori ammessi che mancavano (§4.2); **identità e versioni delle anagrafiche già nello schema**, la sincronizzazione delle versioni resta in F1 (§4.6, D-48); tabelle §4.2, §4.3 e §4.4 allineate (`cliente_id` + versione al posto di `cliente_piva`, `codici_esterni` al posto di `codice_integra`); versione 8.3 — **menu per area** (D-47, §7.10): in cima alla barra le aree che l'utente può aprire (Provvigioni, Dati, Gestione), sotto solo le voci dell'area della pagina; l'area *Anagrafiche* diventa **Dati** (permessi `dati.*`, migrazione `area_dati`); *Documenti scartati* passa in Provvigioni, la *Guida* è comune a tutte le aree; sul tablet la barra va su due righe; versione 8.2 — **nessuno dà più di quello che ha** (D-45): in ogni area si concede al massimo il proprio livello, niente aree che non si hanno, niente gestione di chi è più in alto (il superutente sì); finestra utente con i livelli a segmenti, scheda *Permessi* a sezioni richiudibili per area (§8.3, §7.13); versione 8.1 — **ruoli per area** (D-45, §8.3): ruolo di Sistema (superutente, amministratore, utente) e, per ogni area (Anagrafiche, Provvigioni, domani Vendite), un livello lettura · operatore · responsabile; permessi `area.attività`; versione 8.0 — **anagrafiche con identità e versioni** (D-46, §4.6): id nostro stabile, codici di Integra in una tabella di collegamento, versioni che si aggiungono soltanto; i fatti (documenti, righe, bollettini, liquidazioni) puntano a identità **e** versione con chiave composta, le configurazioni solo all'identità; versione 7.9 — pagina Utenti nell'app; `GET /api/utenti/ruoli` (tabella *Cosa può fare ogni ruolo* dal server); *Reimposta la password* restituisce l'utente con l'esito dell'invio; colonne con `--colonne` che si impilano sul tablet (§8.3, §16.4); versione 7.8 — **niente telefono**: l'app è per computer e tablet; sotto i 744 px di larghezza si ferma subito, anche prima dell'accesso, con una pagina che chiede un computer o un tablet (V6, §16.6, D-44); versione 7.7 — pagina di accesso nell'app come nel prototipo; chiudendo la finestra (Esc, clic fuori, 2 minuti senza toccare nulla) il modulo riparte vuoto (§7.0, D-42); versione 7.6 — il CRM è il primo pezzo del **Sistema Informativo Aziendale** Decobrands: sottotitolo nuovo, in fondo all'accesso licenza d'uso e copyright con la finestra *Licenza d'uso*; Esc o un clic fuori dalla finestra di accesso tornano al logo (§1, §7.0, D-42, D-43); versione 7.5 — nuova pagina di accesso: tutta scura come la barra, logo al centro, il modulo si apre in una finestra al primo tasto o tocco; *Password dimenticata* cambia il contenuto della stessa finestra (§7.0, §16.4, D-42); versione 7.4 — limite ai tentativi per persona e, più largo, per IP, con valori nel `.env` e finestra che si azzera da sola (§3.3, D-41); versione 7.3 — API degli utenti con le regole di §7.13 sul server ed eventi §15.2.1.1; prove su un database a parte `decobrands_test` (§16.5, D-40); versione 7.2 — guscio dell'app (barra per ruolo da `GET /api/accesso/io`, sola lettura, Pagina riservata); `stile.css`: sul telefono la barra scorre da sola, senza allargare la pagina; versione 7.1 — pagine di accesso (§7.0, componente `CRM.Accesso`, campi `password` e `casella` del Form), pagina Utenti con nome utente, superutente e *Reimposta la password*, niente Microsoft 365 in Impostazioni (D-39); versione 7.0 — accesso con nome utente (o email) e password come nella Gestione Ordini, superutente che crea gli amministratori, password provvisoria e password dimenticata; tolti Microsoft 365 e il link di accesso (§3.3, §4.2.18, §7.13, §8.3, §15.2.1, D-39 sostituisce D-30); versione 6.3 — guard unico con `@Richiede`/`@Pubblica` (rotta senza dichiarazione negata), CSRF dal token di `GET /api/accesso/io`, nessun CORS (stessa origine) (§3.3, §8.3); versione 6.2 — `logEvent(tx, …)` e `logEventSicuro()`, schemi per codice, codice dell'errore 500 = `operazione_id` dell'evento (§15.2.7, §15.3–§15.4); versione 6.1 — utente corrente `GET /api/accesso/io`, ruolo riletto dal database a ogni richiesta, sessione rigenerata all'accesso, ritorno alla pagina chiesta (§8.3, D-38); versione 6.0 — schema snellito: tolti `ordinamento`, `cliente_ragione_sociale`, `conferma_scadenza` (calcolata), `dati_letti` e l'affidabilità del documento; migrazioni unite in una sola `iniziale` (D-37); versione 5.9 — V13: ogni operazione che scrive su più tabelle sta in una sola transazione, con blocco della riga sulle chiusure (§2, D-36); versione 5.8 — interscambio con periodi di validità, scaglioni a soglia, P.IVA dei clienti non univoca, chiusura del bollettino e storni legati al trimestre liquidato, prova automatica dei vincoli (D-35); versione 5.7 — revisione dello schema: un solo subagente attivo per cliente × fornitore, righe del bollettino legate al documento, documenti legati al trimestre liquidato e la nota di credito alla fattura, niente copie nella pratica e nel bollettino, nomi in italiano, file su disco (D-34); versione 5.6 — schema completato: `liquidazioni`, `clienti` da Integra, `sessioni` per utente, FK verso `utenti` nei documenti (§4.2.18–§4.2.20, §4.3, D-33); versione 5.5 — database `decobrands_db` sull'istanza PostgreSQL locale (V2, §3.4, §16.3); versione 5.4 — CRM staccato dalla Gestione Ordini: database e utenti propri, la Gestione Ordini si ingloberà con la vendita diretta (§1, V2, §4.1, §17, D-29); accesso misto con Microsoft 365 o link via email, solo su invito, senza password (V3, §3.3, §4.2.18, §7.13, §7.15, §8.3, §15.2.1, D-30); **registro unico** di eventi e anomalie con campi comuni e dettaglio JSON controllato per codice, Stato del sistema come vista del registro (V10, §4.2.11, §4.2.15, §7.11, §7.14, §15, D-31); viste di Integra lette da un database PostgreSQL ponte (§4.5, D-32); versione 5.3 — confronto con la nota di credito: solo le righe stornate, differenza = importo stornato (§7.3); FinestraAffiancata a tutto schermo sui telefoni (§16.4); versione 5.2 — **regola V12: ogni calcolo e operazione sensibile solo sul backend, mai da dati del frontend** (§2, §16.5, D-28); versione 5.1 — regole del subagente per cliente e per documento: % dell'agenzia, una fattura al mese, correzione sul documento con motivo (§4.2.6, §4.2.7.2, §5.2, §7.6, §7.8, §8.1, §10, §15.2.3, D-27); versione 5.0 — fotografia delle righe registrata nel cambio di stato della pratica, senza l'azione `snapshot_righe` (§15.2.4); percentuali dei fornitori con data di validità e calcolo per documento alla sua data; eccezioni personali dei subagenti inserite nel CRM; rotte delle pagine come il prototipo ufficiale; tolti i filtri vecchi della liquidazione; formula §10 sul netto dei documenti (§4.2.2, §4.2.3, §5.2, §5.11, §7, §7.5, §7.8, §8.1, §10, §13, §15.2.2, D-25, D-26); versione 4.9 — il **prototipo ufficiale** è `prototipo-alternativo/` (struttura, stile senza Bootstrap, componenti, testi, numeri); `prototipo-crm/` resta come archivio (V4, §3.1, §7.10, §16.1, §16.3, §16.4, D-24); versione 4.8 — **filtri standard** in tutte le barre: entità sempre con ricerca a selezione multipla, riepilogo e azzeramento a icona (Pratiche, Bollettini, Cliente → Pratiche, Analisi); numeri dei segmenti aggiornati dal vivo con gli altri filtri; contatori aggiornati dal vivo ai cambiamenti dei dati, tabelle su richiesta (§16.4.1, §16.4.2, D-22, D-23); versione 4.7 — filtri dell'Analisi su una riga con il periodo; campo a selezione multipla che mostra il nome della sola voce scelta o *Filtro multiplo (n)* e apre il menu con in alto le voci scelte; icone *Riepilogo dei filtri* (riquadro con tutti i filtri) e *Togli tutti i filtri* (§7.22, §16.4, D-21); versione 4.6 — campi di ricerca con **selezione singola o multipla** (stesso componente della ricerca articoli: etichette nel campo, ✓ nel menu, caselle nella maschera); filtri fornitori, subagenti e clienti dell'Analisi a selezione multipla (§7.22, §16.4, D-20); versione 4.5 — liquidazioni: tornano le due colonne (subagenti | documenti); nel pannello di destra le schede *Documenti* e *Report subagenti*; nuova pagina **Analisi** con la BI completa: periodo di 3, 6 o 12 mesi, filtri fornitore / subagente / cliente, filtro incrociato con un clic su grafici e righe, confronto con il periodo precedente, tabella raggruppabile, esportazione Excel con grafici, PDF e CSV (§7.8, §7.22, §16.4, D-18, D-19); versione 4.4 — liquidazioni: scheda *Sintesi* con numeri e grafici (fatturato, provvigioni, margine, fornitori, subagenti) prima del dettaglio; componente Grafico con Chart.js (§7.8, §16.4, D-17); versione 4.3: bollettini: sempre 6 mesi con selettore a mesi (anno + griglia, scorciatoie) e completamento automatico (§7.7, componente PeriodoMesi §16.4, D-16); versione 4.2: documenti: dettaglio a schede con prima l'azione proposta e poi le righe lette (§7.9, D-15); versione 4.1: bollettini: periodo Da–A di al massimo 6 mesi, filtro fornitore e *Con qualcosa da fare* (§7.7, D-14); versione 4.0: pratica a schede *Riepilogo* · *Righe a confronto* con avviso delle variazioni, niente percorso nelle pagine di dettaglio (§7.3); **registro delle decisioni con il loro perché** (§19) e regola di consegna (§16.5); versione 3.9: incassi dei clienti descritti nelle pagine: riquadro Pagamenti in Oggi, Incasso del cliente nella pratica, giorni per l'incasso nel fornitore, filtro Non pagate nel cliente, finestra Solleciti di pagamento (§7.1, §7.3, §7.4, §7.6, §5.14); versione 3.8: storno alla liquidazione successiva: mese per Decobrands, trimestre per il subagente con voce negativa; incassi dei clienti nel prototipo (§5.14, §7.8); versione 3.7: Stato del sistema: da dove vengono i dati di ogni servizio, come si calcola lo stato, catalogo dei problemi, vita di un problema, interfacce del server (§7.14.1–§7.14.5, §4.2.15); versione 3.6: incassi dei clienti: insoluti, storni e riaccrediti sul fatturato, riconoscimento al pagamento sul maturato, solleciti di pagamento ai clienti (§5.5, §5.14, §6.2, §7.7); versione 3.5: guida in linea completa: panoramica con schema del ciclo, comandi comuni, per ogni pagina passi, pulsanti e finestre (§7.17); versione 3.4: paginazione delle tabelle con ordinamento e totali su tutto l'elenco (§16.4); versione 3.3: scheda cliente con le schede *Agenzie* e *Pratiche* filtrabili (§7.6); versione 3.2: la **vendita diretta** (ordini cliente, articoli, giacenze, alias e kit) è un **ampliamento futuro**: progettata e conservata nel prototipo ma spenta (§17); come distinguere fra documenti dell'agenzia e ordini della vendita diretta nell'ingresso unico dei documenti (§17.2); versione 3.1: componente **Schede** (§16.4) e suo uso dove una scheda impilava più tabelle: esportazione per Integra (§7.18), fornitore (§7.4), utente (§7.13), colonna destra di Oggi (§7.1), Alias e kit (§7.21); versione 3.0: vendita diretta dalla Gestione Ordini: ordini cliente con esportazione per Integra (Ordine cliente e Ordine fornitore), articoli, giacenze con impegni, alias e kit (§7.18–§7.21, §4.2.16–§4.2.17); dati di Integra letti da viste sul database con sincronizzazione ogni pochi secondi, al posto dell'import da file (§4.1, §4.5); versione 2.9: idee e strumenti per il supporto alle decisioni con modelli linguistici e decisioni tipizzate, fase successiva (§18); pagine di gestione: utenti e ruoli (con sola lettura), stato del sistema, impostazioni, documenti scartati, guida (§7.13–§7.17, §8.3); esportazione della liquidazione: completa, un subagente, solo riepilogo, in Excel, PDF o CSV (§11); liquidazione con elenco subagenti che regge qualsiasi numero di subagenti (§7.8); bollettino atteso entro un giorno fissato per fornitore, sollecito solo dopo (§4.2.1, §5.6); pagina Oggi per gruppi di lavoro con solleciti per fornitore (§7.1); **Stato:** validata con il cliente; anagrafiche clienti e fornitori da Integra in sola lettura, schermata Clienti con le agenzie (§4.1, §7.6); ritorno alla schermata precedente nello stesso punto (§7.12); documenti della pratica consultabili affiancati al confronto (§7.3); evidenziazione del valore nel documento **da verificare** con prova di fattibilità (§6.6); stack allineato al Portale B2B Luis (§16.3); componenti standard (§16.4); ingresso documenti interno senza n8n, lettura con GLM-OCR in locale (§6.5); sostituzione della Gestione Ordini pianificata in una fase successiva (§17)
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
- Messaggio unico per nome utente sbagliato, password sbagliata o utente disattivato
  ("Credenziali non valide"): non dice chi esiste.
- Limite ai tentativi su accesso, password dimenticata, link e cambio password, in due livelli
  (D-41): **per persona** (IP + nome utente, email, link o sessione: 10 in 15 minuti) e **per IP**
  (100 in 15 minuti per ogni operazione, per tutto l'ufficio). Il campo della persona lo sceglie
  la rotta, non il corpo della richiesta; per il link il tetto per IP basta, perché il codice
  (256 bit) non si indovina. Finita la finestra il contatore riparte da zero; i
  valori stanno nel `.env` (`TENTATIVI`, `TENTATIVI_IP`, `TENTATIVI_MINUTI`). *Perché*: un ufficio
  esce con un solo IP, quindi un limite solo per IP bloccherebbe tutti i colleghi; il tetto per IP
  resta per fermare chi prova tanti nomi o email diversi. Contano anche le richieste riuscite; nome utente ed email dello stesso account hanno contatori
  separati (al massimo 20 prove invece di 10, accettato).
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

Un documento va al subagente il cui periodo contiene la **data del documento**. Quando il cliente passa a un altro subagente si chiude il periodo (`valido_al`) e se ne apre uno nuovo dallo stesso giorno.

*Perché (D-35):* con il solo flag `attivo` si sapeva chi segue il cliente oggi, non chi lo seguiva alla data della fattura: un cambio di subagente avrebbe spostato al nuovo anche le provvigioni passate. Le FK sono RESTRICT perché la storia delle agenzie non deve sparire con il subagente o il fornitore (si disattivano).

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

Indici: (`fornitore_id`, `stato`), `cliente_id`, `data_ordine`, `importo` (filtri e ordinamenti dell'elenco, §7.2).

*Perché (D-52):* `stato`, `importo` e `variazioni` sono **risultati del motore**, non dati da scrivere a mano: li ricalcola `aggiornaPratica(tx, id)` (`src/pratiche.ts`) nella stessa transazione di ogni scrittura sulla pratica, così l'elenco li legge in SQL anche con migliaia di pratiche. Non si salvano la scadenza della conferma (data + `giorni_attesa_conferma` del fornitore) né il subagente (`interscambio` alla data): cambiano con il fornitore o le agenzie e si calcolano nella query, sempre giusti senza riallineare. Dopo una migrazione o un cambio di regola del motore: `npm run pratiche:ricalcola`.

*Perché (D-34):* fatture e allegati non si copiano nella testata: le fatture stanno in `ordini_fornitore_documenti`, i file in `documenti_in_arrivo` (`abbinato_pratica_id`). Due copie della stessa cosa prima o poi divergono.

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
| `creato_il` | TIMESTAMPTZ | |

> **Importo netto della pratica** = somma algebrica degli `importo` dei documenti
> (fatture − note di credito). È il netto la **base del calcolo provvigioni** (§5.3):
> una nota di credito parziale riduce l'imponibile, una totale azzera la provvigione
> sulla fattura stornata. Finché la pratica non ha documenti, la base resta
> `importo_merce` (caso semplice: una sola fattura).
>
> **Fattura multi-ordine.** Il documento è sempre agganciato a **una** pratica
> (`testata_id`); una fattura che copre più ordini è rappresentata da **una riga per
> pratica**, con `importo` = quota attribuita a quella pratica. La somma delle quote
> con lo stesso `numero`/`tipo` ricostruisce il totale della fattura; la provvigione
> si calcola sulla quota di pratica, non sul totale. Stessa cosa per una nota di credito
> che storna fatture di più pratiche.

*Perché (D-34):* con le fatture su più pratiche il numero non identifica una riga, serve la FK `fattura_id`. `liquidazione_id` dice al motore se un documento è già stato pagato al subagente: uno storno che arriva dopo va nel trimestre successivo (D-11) senza cercare dentro il JSON di `liquidazioni.totali`.

*Perché (D-60):* un modello valido per ogni fornitore, senza legarsi ai nomi di uno solo (Auftrag, Rechnung…). Solo fattura e nota di credito toccano le provvigioni: il motore (`praticaDaDb`) le tiene in `documenti` e mette gli altri tipi a parte (`ordini`, `conferme`, `proforma`, `pagamenti`), così bollettini, liquidazioni e Analisi non cambiano. Spostare un documento in un'altra pratica dello stesso fornitore (`POST /api/pratiche/:id/documenti/:did/sposta`) ha le protezioni dell'annullamento: non se liquidato, in un bollettino o legato a una nota di credito; l'unico ordine della pratica non si sposta né si annulla.

*Perché (D-54):* il browser manda solo quello che l'operatore digita: l'importo è sempre positivo e il segno lo mette il server; con lo storno totale il server storna quello che resta della fattura (fattura + note già registrate), così due note non superano mai la fattura. Il numero è unico per fornitore: lo stesso numero su un'altra pratica è ammesso solo con la stessa data (fattura multi-ordine, una riga per pratica). Un documento già liquidato al subagente (`liquidazione_id`) non si corregge né si annulla: si registra una nota di credito (D-11). Un documento con legami non sparisce in silenzio: con una correzione del subagente (§4.2.7.2) o righe di bollettino non si annulla (409), e se è in un bollettino non cambiano importo, numero e data. Numero e data di una fattura su più pratiche si correggono su tutte le copie insieme; l'importo resta la quota di ogni pratica. La nota con storno totale segue l'importo della fattura. Annullando un documento il suo file torna in coda (`in_coda`, senza pratica).

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
| `controlli` | JSONB | esito dei controlli fissi (§6.5) |
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

Una riga per sezione (`chiave` = `azienda` · `casella` · `lettura` · `posta` · `accesso` · `integra` · `conservazione`), `valore` JSONB, `aggiornato_il`, `aggiornato_da`. Le password (casella IMAP, posta in uscita) sono **cifrate** (chiave nel file d'ambiente del server) e **non vengono mai restituite** dalle API: si sostituiscono soltanto. Ogni modifica scrive un evento (§15).

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

### 4.2.20 `clienti` — copia locale da Integra (D-33)

**Identità** del cliente (D-46, §4.6). La sincronizzazione (§4.5) copia qui la vista
`v_clienti`; la scrive **solo** il servizio `integra`, l'interfaccia la legge soltanto (D-01).
I dati descrittivi stanno in `clienti_versioni` (si aggiungono soltanto), il codice di Integra
in `codici_esterni`.

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

| Dato | Vista nel database ponte (schema `crm_viste`) | Ogni | Note |
|---|---|---|---|
| Clienti | `v_clienti` (P.IVA, ragione sociale, indirizzo, codice cliente) | 60 s | un cliente senza P.IVA valida è segnalato in Stato del sistema |
| Fornitori | `v_fornitori` (P.IVA, ragione sociale, paese, codice fornitore) | 60 s | |
| Articoli (ampliamento §17) | `v_articoli` (codice, descrizione, EAN, UM, attivo) | 60 s | |
| Giacenze (ampliamento §17) | `v_giacenze` (codice, quantità) | 15 s | la più frequente: serve al disponibile |
| Ordini registrati (ampliamento §17) | `v_ordini_registrati` (numero, codice cliente, data) | 60 s | chiude gli impegni (§4.2.16) |

- **In questa fase** si sincronizzano solo **clienti e fornitori** (piano F1-A4); articoli,
  giacenze e ordini registrati arrivano con l'ampliamento (§17).
- **Database ponte** (D-32): le viste stanno in un **database PostgreSQL** preparato da
  Ugo e collegato a Integra (schema `crm_viste`); il CRM legge solo da lì, con un utente
  **in sola lettura** (`crm_lettura`), e non si collega mai al database di Integra.
  Colonne, chiavi e data di modifica delle viste si fissano guardando i dati veri del ponte
  (piano F0-A8), compresa l'email del cliente (§5.14).
  *Perché (D-32):* le viste si provano e si correggono senza toccare Integra; il CRM parla
  solo PostgreSQL; un guasto di Integra resta fuori dal CRM e si vede come anomalia
  `integra.connessione`.
- **Colonne delle viste (proposta F1-A4, da confermare col ponte vero F0-A8)**:
  `v_clienti` e `v_fornitori` espongono `id_integra` (chiave `cli_cdcli`), `codice`
  (`cli_cdclistr`), `ragione_sociale`, `piva`, `codice_fiscale`, `indirizzo`, `cap`, `citta`,
  `provincia`, `paese`, `email`, `pec`, `attivo`, `modificato_il` (e `codice_agente` solo per i
  clienti). La chiave stabile è `id_integra`; il codice leggibile resta per la ricerca.
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

---

## 5. Regole di business

### 5.1 Modello a scaglioni

La provvigione si determina dallo **sconto accordato al cliente sul fornitore**
(`interscambio.sconto`): lo sconto cade in uno scaglione della tabella
`provvigioni_scaglioni` del fornitore, che definisce `pct_agente` e `pct_subagente`.

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

**Trimestre già chiuso** (D-57): una provvigione che cadrebbe in un trimestre già liquidato (fattura
sul maturato riconosciuta da un bollettino verificato dopo la chiusura, fattura sul fatturato registrata
in ritardo) va nel **primo trimestre ancora aperto dopo**, come gli storni; un documento o una voce già
legati a una liquidazione (`liquidazione_id`) restano in quella. Per lo stesso motivo i trimestri si
chiudono **in ordine**: prima il precedente.
*Perché:* il trimestre chiuso non si ricalcola, quindi senza questa regola la provvigione non sarebbe mai
pagata al subagente; l'ordine evita un trimestre aperto in mezzo a due chiusi, che resterebbe scoperto.

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

1. **Ricezione.** Un lavoro pianificato del backend (`@nestjs/schedule`, ogni 1–2 min)
   legge la casella con `imapflow` e salva gli allegati PDF e le foto; il caricamento
   manuale (trascinamento o "Carica documenti") scrive nella stessa tabella. Lo
   `file_hash` scarta i doppioni. Ogni file passa da **un solo ingresso** (`riceviDocumento`,
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
2. **Coda.** Il lettore prende un documento alla volta con `SELECT … FOR UPDATE SKIP
   LOCKED` (nessuna coda esterna); fino a 3 tentativi, poi stato `errore` con notifica
   in app.
3. **Lettura.** PDF → immagini delle pagine; chiamata a **GLM-OCR** servito da **vLLM**
   (interfaccia compatibile OpenAI) con:
   - prompt di estrazione e **uscita vincolata allo schema JSON** del tipo di documento
     (testata + righe; bollettino: righe documento/imponibile/%/importo);
   - `logprobs` attivi, per calcolare l'affidabilità;
   - la **posizione dei valori** nel file si ricava a parte, con il metodo e i limiti
     descritti in §6.6 (funzione da verificare).
   I documenti su più pagine si leggono pagina per pagina e le righe si uniscono.
   Gli Excel dei bollettini si leggono direttamente con `exceljs`, senza modello.
4. **Affidabilità per campo** (0–1), calcolata dal backend dalle probabilità dei
   pezzi di testo che compongono il valore: per numeri, codici e date la probabilità
   **minima**; per i testi lunghi la **media**. L'affidabilità del documento è quella
   del campo meno affidabile.
5. **Controlli fissi**, indipendenti dal modello: totale letto ≠ somma righe;
   quantità × prezzo ≠ totale riga; codice cliente non presente fra i clienti del
   fornitore (`interscambio`); articolo assente nella pratica proposta; data fuori dal
   periodo della pratica; bollettino già registrato per fornitore e mese.
   **Nessun blocco sull'anagrafica articoli**: nel giro dei bollettini Decobrands
   fa da agente e gli articoli dei fornitori non sono (né saranno) nella sua
   anagrafica. Il codice articolo è un campo di ricerca sugli **articoli già usati dal
   fornitore** nei documenti registrati: pallino verde se noto, rosso se nuovo; un
   articolo nuovo si inserisce lo stesso e non conta fra i punti da controllare.
   Le righe nuove si aggiungono da una finestra modale (articolo, descrizione,
   quantità, prezzo; un articolo noto propone descrizione e ultimo prezzo).
6. **Livello** del documento, mostrato in "Documenti" e sul pulsante "Correggi i dati
   letti" (numero di campi da controllare):

   | Livello | Regola iniziale (da tarare) | Interfaccia |
   |---|---|---|
   | `affidabile` | tutti i campi ≥ 0,90 e nessun controllo fallito | nessun avviso |
   | `da_controllare` | un campo fra 0,70 e 0,90 o un controllo fallito | avviso giallo |
   | `bassa` | un campo < 0,70 o fallito un controllo su campo chiave (codice cliente, totale) | avviso rosso; l'abbinamento chiede conferma |

7. **Correzione.** "Correggi i dati letti" apre una finestra a tutto schermo: a
   sinistra il PDF (divisore trascinabile), a destra testata e righe modificabili
   (aggiungi/elimina riga); i campi incerti hanno bordo giallo/rosso con l'affidabilità
   al passaggio del mouse; selezionando un campo si evidenzia nel PDF il punto da cui è
   stato letto, **se la posizione è stata trovata** (§6.6, funzione da verificare); ogni campo corretto o confermato diventa `verificato`. Salvando si
   ricalcolano controlli e abbinamento proposto.
8. **Taratura.** Ogni correzione resta in `documenti_campi` (letto, finale,
   affidabilità): dopo le prime centinaia di documenti si fissano le soglie per
   fornitore; lo stesso archivio serve per un eventuale riaddestramento del modello.

**Requisiti del server di lettura:** GPU NVIDIA con driver CUDA, vLLM e modello
`zai-org/GLM-OCR` (0,9 miliardi di parametri); la memoria video necessaria va
verificata nella prova F0-A6. Il server è a carico del cliente.

### 6.6 Evidenziazione del valore nel documento — DA VERIFICARE

> ⚠ **Funzione non garantita.** Evidenziare nel PDF (o nell'Excel) il punto da cui è
> stato letto un valore dipende dal tipo e dalla qualità del file. Sui PDF generati da
> gestionale ci si aspetta che funzioni bene; sui documenti **scansionati o fotografati**
> l'evidenziazione può risultare **approssimata o mancare**. La correzione dei dati
> funziona comunque: l'evidenziazione è un aiuto, non un requisito per salvare.
> La fattibilità si decide con la **prova F0-A7** (sotto) su documenti reali, **prima**
> di impegnarsi con il cliente; l'esito (percentuali misurate) gli viene comunicato.

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
    fornitore successivo; ogni copia resta nel registro operazioni (§15);
  - **Documenti da decidere**: riassunto della coda (pronti da abbinare, dati letti da
    controllare, da scegliere o verificare) e **solo** i documenti che chiedono una
    decisione (abbinamento non sicuro, cliente non riconosciuto, doppioni, lettura non
    affidabile); azione *Apri la coda* (§7.9);
  - **Bollettini**: da verificare, pronti da chiudere, **non arrivati** dopo il giorno
    atteso del fornitore, da sollecitare (§5.6).
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

**Nell'app (F2-A2 e F2-A3):**

- **Testata**: stato accanto al numero, cliente · fornitore · subagente alla data, *Torna alle
  pratiche*. *Carica un documento* e *Prepara il sollecito* arrivano con F6 e F3.
- **Binario**: le fasi fatte mostrano documento, data, importo e la differenza rispetto alla fase
  prima; quelle che mancano dicono quando sono attese (o da quanto sono in ritardo). Le
  percentuali e i soldi li calcola il server (V12). Con D-60 (server pronto, pagina da
  aggiornare): più ordini nella fase *Ordini* (primo numero + quanti altri, importo sommato);
  senza conferma la fase mostra la *Proforma* se c'è, oppure *Conferma — Non arrivata* se la
  pratica è già fatturata; il segno **pagato** con i documenti di pagamento (`pagato`,
  `pagamenti`) e gli altri documenti (`altri` di `GET /api/pratiche/:id/documenti`) si
  mostrano accanto ai documenti fiscali, senza toccare la provvigione. *Perché (D-60):* lo
  stesso binario vale per ogni fornitore, anche per chi non manda conferme.
- **Riepilogo**: avviso giallo con *Vedi le righe*; a sinistra **Provvigione** (imponibile,
  sconto e percentuali in vigore, quota a Decobrands e al subagente con le regole di D-27,
  maturato o fatturato), a destra la card **Documenti fiscali** (fatture e note di credito,
  netto, PDF, *Registra fattura*, *Nota di credito*, *Correggi*, *Annulla*). *Incasso del
  cliente* arriva con F3-A3.
- **Righe a confronto**: segmenti *Solo righe che cambiano · Tutte le righe*, righe evidenziate,
  colonna *Differenza*; aperta dall'elenco con il filtro *Con variazioni* la pratica si apre già
  su questa scheda.
- **Consultazione dei documenti**: finestra con le schede dei documenti che hanno un PDF; a
  sinistra il PDF originale (`GET /api/documenti/:id/file`, servito in una sandbox), a destra
  numero, data, importo, residuo e note. Il confronto riga per riga dentro la finestra arriva
  con F6.
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
- **Export** con i campi §11 nell'header del dettaglio.
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
d'origine) e i nomi sono calcolati dal server (V12). L'esportazione arriva con F4-A3; la correzione
della quota del subagente (D-27) resta da fare. *Perché:* la pagina serve a
controllare e chiudere, non a rifare i conti; le etichette sul server evitano che due browser dicano
cose diverse.

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

### 7.9 Documenti (`/documenti`)

Unico punto d'ingresso dei documenti (§6.5): area di caricamento, elenco "Da
controllare" con livello di affidabilità, dettaglio del documento scelto; pulsanti
"Correggi i dati letti" (con numero di campi da controllare) e "Scarta il documento";
finestra di correzione con il PDF a fianco. Il pulsante "Carica documenti" è sempre
presente nella barra laterale.

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
| **Casella dei documenti** (`casella`) | ogni N minuti (Impostazioni → Casella): legge le email nuove della cartella, salva gli allegati PDF/Excel in `documenti_in_arrivo`, sposta le email lette (§6.5 punti 1–2) | accesso IMAP e presenza delle due cartelle | email, allegati presi, allegati ignorati |
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
| casella | `casella.allegato` | attenzione | allegato non PDF né Excel (es. .zip), o file danneggiato | aprire l'email e caricare il documento a mano da Documenti | no (si segna come visto) |
| casella | `casella.vuota` | attenzione | email senza allegati dalla cartella dei fornitori | verificare se il documento era nel corpo dell'email | no |
| lettura | `lettura.non_raggiungibile` | errore | il server non risponde a 2 controlli di fila | verificare il servizio sulla macchina con la scheda video; i documenti restano in coda e si leggono alla ripresa | al primo controllo riuscito (con "N documenti riletti") |
| lettura | `lettura.lenta` | attenzione | media oltre 8 s per pagina sugli ultimi 10 documenti | controllare il carico della scheda video | quando la media rientra |
| lettura | `lettura.fallita` | errore | un documento non si legge dopo 3 tentativi | aprirlo in Documenti e inserire i dati a mano, o scartarlo | quando il documento è corretto o scartato |
| integra | `integra.connessione` | errore | database non raggiungibile per 3 giri di fila | verificare server, utente e password in Impostazioni → Sincronizzazione; avvisare chi gestisce Integra | al primo giro riuscito |
| integra | `integra.vista` | errore | una vista manca o ha colonne diverse | chiedere a chi gestisce Integra di ripristinare la vista (§4.5) | quando la vista si legge |
| integra | `integra.piva_mancante` | errore | un cliente o fornitore senza P.IVA valida (chiave = codice Integra) | correggere in Integra; entra da solo al giro successivo | quando la riga entra |
| integra | `integra.piva_doppia` | errore | due codici Integra con la stessa P.IVA | unire o correggere in Integra | quando il doppione sparisce |
| integra | `integra.lenta` | attenzione | un giro dura più del suo intervallo | segnalare a chi gestisce Integra (carico del database) | al primo giro nei tempi |
| posta | `posta.connessione` | errore | accesso SMTP fallito | controllare server, utente e password in Impostazioni → Posta | al primo invio o controllo riuscito |
| posta | `posta.respinta` | errore | il server rifiuta il destinatario (chiave = indirizzo) | correggere l'email dell'utente o del destinatario | no |

Testi e dettagli sono **frasi fisse con segnaposto** (nome del file, codice Integra,
secondi…) definite in un solo file del server; nessun messaggio tecnico grezzo nel testo
(il messaggio tecnico va nel `dettaglio` dell'anomalia e in `servizi_esecuzioni.misure`).

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

### 7.15 Impostazioni (`/impostazioni/:sezione`) — solo amministratore

Sezioni a sinistra (ElencoSelezionabile), modulo della sezione a destra con *Salva* e,
dove serve, *Prova la connessione*.

| Sezione | Campi |
|---|---|
| Dati dell'azienda | ragione sociale, P.IVA, indirizzo, email (intestazione dei prospetti esportati, §11) |
| Casella dei documenti | server IMAP, porta, utente, password, cartella da leggere, cartella dove spostare le email lette, ogni quanti minuti (1–60) |
| Server di lettura | indirizzo, modello, tempo massimo per documento, **soglie di affidabilità** (affidabile da, bassa sotto; §6.5) |
| Posta in uscita | server SMTP, porta, utente, password, mittente |

| Sincronizzazione da Integra | server del database ponte (§4.5), nome del database, utente in sola lettura, password, schema delle viste, ogni quanti secondi (anagrafiche, 10–3600), ogni quanti secondi le giacenze (5–600, solo con l'ampliamento §17) (§4.5) |
| Conservazione dei dati | registro eventi (mesi), documenti scartati (giorni), righe per pagina |

Le **password non si rileggono**: il campo mostra "impostata", si scrive solo per
sostituirla. Controlli: numeri validi, soglie 0 < bassa < affidabile ≤ 1, intervalli di sincronizzazione nei limiti indicati.
Ogni salvataggio scrive un evento con i campi cambiati (mai le password).

### 7.16 Documenti scartati (`/scartati`) — amministratore e operatore

- Lo **scarto chiede il motivo** (*Doppione* · *Non riguarda Decobrands* · *Documento
  illeggibile* · *Altro*) e una nota facoltativa.
- Elenco: scartato il / da chi, documento (tipo, numero, fornitore, file), motivo e nota,
  data di eliminazione automatica (`scartati_giorni`, §7.15); segmenti per motivo e
  ricerca.
- **Recupera** rimette il documento fra quelli da controllare (§7.9) e lo apre;
  **Elimina** definitivamente solo l'amministratore, con conferma.
- Da "Documenti" il collegamento "N scartati" accanto al contatore.

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
argomenti di *Gestione* si vedono con `sistema.utenti`, `sistema.stato`,
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
| **Excel** | foglio *Riepilogo* (4 numeri con periodo precedente e variazione); fogli *Per subagente*, *Per fornitore*, *Per cliente*, *Per mese* con i totali a formule `SUM`; foglio *Documenti*. Intestazione con periodo, filtri e data di generazione. I 4 grafici come immagini arrivano con F4-A3 |
| **PDF** | stesso contenuto e stessa impaginazione dell'Excel; arriva con F4-A3, che converte il medesimo `.xlsx` con LibreOffice |
| **CSV** | l'elenco dei documenti filtrati, separatore `;`, virgola decimale, UTF-8 con BOM, date `gg/mm/aaaa` |

- Il modello è lo stesso della liquidazione (§11): fogli → blocchi, con in più il blocco
  *immagine* per i grafici.
- Nell'app Excel e CSV si generano sul server (`exceljs`, §11) e prendono gli stessi numeri
  della pagina; i grafici come immagini richiedono un motore grafico sul server e arrivano con
  F4-A3, insieme al PDF (D-61).

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
| GET | `/api/fornitori-lista` | dropdown fornitori attivi |
| GET | `/subagenti` · `/subagenti/:id` · `/api/subagenti` | subagenti con clienti seguiti ed eccezioni |
| POST | `/api/subagenti` · PUT `/api/subagenti/:id` · DELETE `/api/subagenti/:id` | CRUD subagente |
| GET | `/clienti` · `/clienti/:piva` | clienti (sola lettura) con le agenzie |
| POST | `/api/interscambio` | nuova agenzia del cliente |
| PUT | `/api/interscambio/:id` | modifica agenzia (codice, subagente, sconto) |
| DELETE | `/api/interscambio/:id` | elimina agenzia |
| PUT · DELETE | `/api/documenti-fiscali/:id/correzione` | correzione della quota del subagente `{tipo, valore, motivo}` · la toglie (§4.2.7.2, D-27; permesso `modifica`, trimestre aperto) |
| GET | `/api/integra/stato` | ultima sincronizzazione per vista (§4.5) |
| GET | `/pratiche` · `/pratiche/:id` | elenco / dettaglio pratiche |
| POST | `/api/ordini-fornitore` | crea pratica |
| PUT | `/api/ordini-fornitore/:id` | aggiorna pratica (stati, conferma, fattura) |
| DELETE | `/api/ordini-fornitore/:id` | elimina pratica |
| POST | `/api/ordini-fornitore/:id/righe` | aggiunge riga |
| DELETE | `/api/ordini-fornitore/:id/righe/:rid` | elimina riga |
| POST | `/api/ordini-fornitore/:id/upload` | carica documento (ordine/conferma/fattura) |
| GET | `/api/pratiche/:id/documenti` | documenti della pratica: `{pratica: {id, numero, stato, importo}, altri: [{id, tipo, numero, data, importo, arrivo_id, file_nome, note}] (ordini, conferme, proforma, pagamenti, altri; D-60), documenti: [{id, tipo, numero, data, importo, storno_totale, fattura_id, stornato?, residuo?, arrivo_id, file_nome, stato_incasso, liquidato, note}], totali: {fatture, note_credito, netto}}`; importo negativo per la nota di credito; `stornato` e `residuo` solo sulle fatture; netto dal motore (§5.3) |
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
| GET | `/api/liquidazione/export?anno&trimestre&scelta=tutto\|uno\|riepilogo&subagente&formato=xlsx\|pdf\|csv` | file Excel della liquidazione (§11) |
| GET | `/api/analisi?dal=AAAA-MM&al=AAAA-MM&fornitori=&subagenti=&clienti=&raggruppa=subagente\|fornitore\|cliente\|mese\|documento` | pagina Analisi (F4-A5, §7.22), `provvigioni.consulta`; senza `dal`/`al` gli ultimi 12 mesi con dati (clampati fra il primo documento e il mese in corso): `{periodo: {da, a, primo, ultimo, mesi}, precedente: {da, a}, confronto: {possibile, etichetta}, filtri_attivi, voci: {fornitori, subagenti, clienti} (le voci proposte dai campi, con gli altri filtri attivi, D-23), numeri: {fatturato, prese, pagate, margine, documenti, clienti, precedente, variazione (percento arrotondato o null), pct}, grafici: {andamento: {mesi, serie}, fornitori: {etichette, chiavi, valori}, subagenti: {etichette, chiavi, serie}, clienti: {etichette, chiavi, valori}}, tabella: {raggruppa, totale (documenti del periodo), righe: [{chiave, nome, documenti, clienti, fatturato, prese, pagate, margine, quota}] o, per `documento`, [{chiave, numero, tipo, data, pratica_id, nome, fornitore, subagente, importi}]}}`; tutto calcolato dal motore (`fattiAnalisi`), D-19; 400 per mese non valido o `dal` dopo `al` |
| GET | `/api/analisi/esporta?formato=xlsx\|csv&dal&al&fornitori&subagenti&clienti` | file dell'Analisi (§11, §7.22), `provvigioni.esporta`: Excel con *Riepilogo*, *Per subagente*, *Per fornitore*, *Per cliente*, *Per mese* (totali `SUM`), *Documenti*; CSV dei soli documenti (`;`, virgola decimale, UTF-8 con BOM); stessi filtri e stessi numeri della pagina; nome `Analisi_<dal>_<al>[_filtrata].<est>` |
| GET | `/api/eventi/flusso` | canale degli aggiornamenti (§16.4.2, D-23), `@Sse`, `collegato`: eventi `{aree: [pratiche, documenti, bollettini, liquidazioni, anagrafiche, utenti, impostazioni]}` quando il registro cresce; un giro ogni ~4 s **solo mentre qualcuno è collegato**, parte dall'ultimo id (nessun evento vecchio), righe dello stesso giro unite; battito `{battito: true}` ogni ~25 s; le aree dai codici del registro e, per `crud.*` e `stato.change_state`, dalla colonna `entita` |
| GET | `/documenti` · `/api/documenti` | ingresso documenti: elenco da controllare (§7.9) |
| POST | `/api/documenti/carica` | caricamento manuale, multipart campo `file`, un PDF o una foto JPEG/PNG per richiesta (D-60) → coda `in_coda`; risponde `{id, file_nome, stato, ricevuto_il}`; 415 se non è un PDF né una foto (dai primi byte), con un messaggio a parte per gli Excel (rifiutati, D-60) e i `.msg`, 413 oltre `DOCUMENTI_MAX_MB`, 409 se lo stesso file è già arrivato (impronta), salvo se era scartato: torna in coda sulla stessa riga; permesso `provvigioni.modifica` (§6.5, D-54) |
| GET | `/api/documenti/:id` · `/api/documenti/:id/file` | dati letti con affidabilità e posizioni · file originale: percorso **solo** da `documenti_in_arrivo.file_percorso` (D-60), dentro `DOCUMENTI_DIR`, `application/pdf`, `image/jpeg` o `image/png` dall'estensione salvata, in linea con `nosniff` e `Content-Security-Policy: sandbox`; 404 se il file manca |
| GET | `/api/documenti/cerca?fornitore_id=&q=&mese=AAAA-MM&limite=` | documenti per l'abbinamento a mano (F3-A2b, §7.7), `provvigioni.consulta`: fatture e note di credito del fornitore **di ogni periodo**, cercate per numero o cliente (`q`, `%` e `_` valgono come lettere); prima i documenti del mese del bollettino (`mese`), poi gli altri dal più recente; `limite` 1–50 (20 se assente); risponde `[{id, numero, data, tipo, cliente, pratica_id, pratica, importo, su_riga: {bollettino_id, mese, anno} \| null}]`, `su_riga` valorizzato se il documento è già su una riga di un bollettino |
| GET | `/api/pagamenti/solleciti` | fatture da sollecitare al cliente (F3-A3, §5.14), `provvigioni.consulta`: `{voci: [{pratica_id, pratica, documento_id, numero, data, cliente_id, cliente, fornitore, importo, stato: {stato, dal, bollettino_id, manuale, giorni, limite, solleciti, sollecitata_il, nota}}], per_cliente: [{cliente_id, cliente, fatture: [numero], totale, testo}]}`; solo *insoluta* (fatturato) e *incassi da verificare* (maturato oltre `giorni_incasso`), dalla più vecchia; `testo` composto dal server (V12, come la contestazione D-58) |
| PUT | `/api/documenti/:id/incasso` | segna a mano una fattura come pagata o non pagata (segnalazione del fornitore, §5.14), `provvigioni.modifica`: `{stato: insoluta\|pagata, nota?}`; solo fatture (400); scrive `stato_incasso`/`fonte_incasso=manuale`/`insoluta_dal`/`pagata_il` e `nota_incasso` (D-62: `note`, la nota del documento, non si tocca); evento `stato.change_state` sul documento (§15.2.5) |
| POST | `/api/pagamenti/solleciti` | il testo del sollecito per un cliente è stato copiato (§5.14), `provvigioni.modifica`: `{cliente_id}`; sulle sue fatture da sollecitare `solleciti +1` e `sollecitata_il=oggi`; evento `documento.export` (§15.2.5); 404 se non ha fatture da sollecitare |
| PUT | `/api/documenti/:id` | correzione dei dati letti (campi verificati) |
| POST | `/api/documenti/:id/abbina` · `/apri-pratica` · `/registra-bollettino` | esito del controllo |
| POST | `/api/documenti/:id/scarta` · `/rileggi` | scarto · nuova lettura |
| GET | `/registro` | registro di eventi e anomalie (admin) |
| GET · POST | `/api/sistema*` | Stato del sistema, vedi §7.14.5 |
| GET | `/api/registro` | elenco eventi filtrato (admin) |
| GET | `/api/registro/:id` | dettaglio evento (admin) |
| GET | `/api/registro/export` | export CSV del log filtrato (admin) |

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
| Sistema | `sistema.impostazioni` | Impostazioni del portale (casella, posta, sincronizzazione, conservazione) | amministratore |
| Sistema | `sistema.stato` | Stato del sistema, segnare i problemi come visti | amministratore, oppure operatore in un'area |
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

---

## 11. Esportazione liquidazione

L'esportazione è sempre **di un trimestre**. Dalla pagina Liquidazioni, pulsante
*Esporta in Excel*, si sceglie il **contenuto** e il **formato**.

**Formato**

| Formato | Cosa contiene | Come si genera nell'app |
|---|---|---|
| **Excel** (.xlsx, predefinito) | fogli impaginati come descritto sotto, totali con formule | `exceljs` lato server |
| **PDF** | **derivato esatto dell'Excel**: stesso contenuto e stessa impaginazione stampata (A4 orizzontale, una sezione per foglio, piè di pagina, collegamenti dal riepilogo ai subagenti) | conversione del **medesimo .xlsx** con LibreOffice senza interfaccia (`soffice --headless --convert-to pdf`); nel prototipo è ricostruito con jsPDF + AutoTable con la stessa grafica |
| **CSV** | **solo dati**, senza totali né formattazione: separatore `;`, virgola decimale, UTF-8 con BOM, date `gg/mm/aaaa`. Contenuto *completo* o *un subagente*: una riga per documento con `Subagente` + gli 8 campi + `Stato` (liquidabile / in attesa del bollettino); *riepilogo*: una riga per subagente con le colonne del riepilogo | generato lato server |

Il nome del file è lo stesso nei tre formati, cambia l'estensione.

**Contenuto**

| Scelta | Contenuto del file | Nome file |
|---|---|---|
| **Tutto il trimestre, diviso per subagente** | foglio **Riepilogo** + **un foglio per subagente** con il dettaglio dei documenti e il suo totale | `Liquidazione_<anno>_T<n>_completa.<xlsx\|pdf\|csv>` |
| **Un solo subagente** (preselezionato se filtrato nella pagina) | il foglio di quel subagente: dettaglio + totale | `Liquidazione_<anno>_T<n>_<Nome_Cognome>.<estensione>` |
| **Solo il riepilogo** | il foglio **Riepilogo** | `Liquidazione_<anno>_T<n>_riepilogo.<estensione>` |

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
`gg/mm/aaaa`), non i raggruppamenti. Nomi: `Analisi_<dal>_<al>[_filtrata].<est>`. Il PDF e i
grafici come immagine nell'Excel arrivano con F4-A3: servono un motore grafico sul server e la
conversione del medesimo `.xlsx` (D-61).

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
  registra solo l'esito (riuscito/fallito). IP e sessione solo per eventi `auth`
  e tentativi `negato`. Elenco completo delle esclusioni in §15.8.

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
| correzione dati letti (§6.5) | `documento` | `update` | `documento` | `successo` | `{etichetta, documento_id, campi_corretti, livello_prima, livello_dopo}` |
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

#### 15.2.6 Liquidazione ed export (§8.1, §11)

| Operazione (API) | `tipo` | `azione` | `entita` | `esito` | `dettaglio` |
|------------------|--------|----------|----------|---------|-------------|
| GET `/api/liquidazione/export` | `export` | `export` | `liquidazione` | `successo` | `{etichetta: trimestre/anno, periodo: {trimestre, anno}, scelta: tutto|uno|riepilogo, formato: xlsx|pdf|csv, subagente?, n_righe, importo_totale}` |
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
| Errore di validazione 4xx (operazione rifiutata) | tipo dell'operazione tentata (es. `crud`) | azione dell'operazione | entità dell'operazione | `errore` | `{etichetta, errore: {campo, messaggio}}` |
| Problema di livello `errore` di un servizio aperto o chiuso da solo (§7.14.4) | `errore` | `error` | `sistema` | `errore` (apertura) · `successo` (chiusura) | `{etichetta: testo, servizio, codice, chiave, volte}` |
| *Segna come visto* / *Segna tutti come visti* | `stato` | `change_state` | `sistema` | `successo` | `{etichetta, problemi: [id]}` |

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

### 15.5 Errori applicativi

- Gli errori di validazione e 5xx arrivano al log tramite **handler globale**
  intermedio: nessuna eccezione gestita silenziosamente (catalogo §15.2.7).
- Al frontend viene restituito solo un **messaggio user-friendly**; il dettaglio
  tecnico (classe, messaggio) resta nel log e non viene mai esposto nel browser.
- Gli **errori di lettura documenti** lasciano il documento in `documenti_in_arrivo`
  (stato `errore`) e aprono l'anomalia `lettura.fallita` con `documento_id` (§7.14.3).

### 15.6 Schermata `/registro`

Comportamento di schermata in §7.11; specifiche operative:

- **Filtri**: genere, livello, servizio, codice, tipo, esito, entità, utente (select), periodo `da/a` (date), testo
  libero su `etichetta`; combinabili. Filtro rapido "solo errori".
- **Tabella** (contenitore stabile V9): `ts` (DESC), utente, tipo, entità, azione,
  riferimento (`etichetta` + `entita_id`), esito; paginazione 50 righe.
- **Dettaglio evento** in modale: JSON `dettaglio` formattato + colonne rimanenti
  (`sessione_id`, `ip`).
- **Export CSV** (`GET /api/eventi/export`): stesse righe filtrate, colonne fisse
  `ts;genere;livello;codice;utente;servizio;entita;entita_id;esito;messaggio;dettaglio(JSON)`.
- Nella **dashboard** (§7.1) gli admin vedono un contatore "errori di oggi" con
  collegamento al log filtrato.
- **Sola lettura**: nessun pulsante di modifica/eliminazione.

### 15.7 Conservazione e rotazione

- Job di pulizia notturno: righe `info` dopo 12 mesi, le altre dopo `eventi_mesi` (36,
  §7.15); le anomalie aperte non si cancellano mai.
  (nessuna cancellazione manuale).
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
| **Schede** | contenuti alternativi nello stesso spazio, quando una scheda di dettaglio impilerebbe più tabelle (§7.1, §7.4, §7.13, §7.18, §7.21) | schede (`id`, etichetta, contatore con variante neutro/giallo/rosso/verde, `disegna`), scheda attiva, `riempi`, `onCambia`; tastiera ← → Home Fine; **ricorda la scheda** per ogni passo della cronologia (§7.12). Le schede stanno **in alto**. Non sostituiscono i segmenti della FilterBar: i segmenti filtrano le stesse righe, le schede mostrano contenuti diversi |
| **Pannello** | card con testata | titolo, icona, azioni, piede |
| **Accesso** | pagine fuori dall'app: accesso, cambio e reimpostazione della password (§7.0, D-39, D-42) | `titolo`, `testo`, `avviso`, `campi` (come Form), `conferma`, `link`, `presentazione`, `onConferma(valori, form)`; pagina scura con il logo al centro, modulo in una finestra (con `presentazione` si apre al primo tasto o tocco, il tasto va nel primo campo), pulsante largo in attesa durante la conferma |
| **Form / FormModal** | moduli e finestre modali | campi (`nome`, `etichetta`, `tipo` — anche `password`, con mostra/nascondi, e `casella` —, `opzioni`, `col`, `obbligatorio`, `aiuto`, `completa` per `autocomplete`, `onChange`), pulsante / `onConferma` |
| **Intestazione** | testata pagina | titolo, icona, sottotitolo, azioni; pulsante **"Torna a …"** automatico (§7.12). Il parametro `briciole` (percorso "Elenco › Dettaglio") esiste ma **non si usa** nelle pagine di dettaglio: ripete il *Torna a …* e la voce evidenziata nella barra (D-12, §19) |
| **Stepper**, **Nota**, badge | passi di stato, note, stati | — |
| **Binario** | fasi documentali di una pratica, sempre sopra le schede (§7.3): ordine → conferma → fattura → nota di credito | tappe (`titolo`, `fatta`, `ritardo`, `numero`, `data`, `importo`, `delta` rispetto alla fase prima, `testo`, `assente`); nell'app `componenti/Flussi.tsx` |
| **Cerniera** | riconciliazione riga per riga del bollettino (§7.7): a sinistra il fornitore, a destra il nostro calcolo, la differenza sulla cucitura; gruppi *Da decidere · Decise · Quadrano · Incassi* | `sinistra`, `destra`, `totali` (sinistra, destra, differenza), `gruppi` (titolo, variante, chiuso, righe con titolo, dettagli, i due lati, differenza, `quadra`, azioni, esito). La colonna *Differenza* ha una larghezza minima di 230 px e non va a capo: ci sta 999.999.999,99 €, con la cucitura allineata fra riepilogo e righe. Sotto gli **860 px** le righe si impilano (documento e cliente, i due lati con l'etichetta presa dall'intestazione, la differenza in evidenza, i pulsanti sotto a tutta larghezza) **solo con il CSS**; nel prototipo `CRM.Cerniera` ha lo stesso markup e le stesse classi |
| **FinestraAffiancata** | documento a sinistra, dati a destra, divisore trascinabile; usata da "Correggi i dati letti" (§6.5) e dalla consultazione dei documenti della pratica (§7.3); sotto gli 860 px i pannelli si impilano, sotto i 576 px la finestra occupa tutto lo schermo e nulla esce in larghezza (le tabelle scorrono dentro) | titolo, sottotitolo, larghezza iniziale, `sinistra(host)`, `destra(host)`, azioni del piede |
| **PeriodoMesi** | periodo di N mesi scelto con anno e griglia dei mesi (Bollettini §7.7 con 6 mesi, Analisi §7.22 con 3, 6 o 12) | mese d'inizio, numero di mesi (6), primo e ultimo mese con dati, `onChange(da, a)`; scorciatoie *Ultimi N mesi* e semestri; completamento automatico dentro i mesi con dati; anteprima al passaggio del mouse. Stesso schema del selettore di date del Portale Luis (`react-date-range`: pulsante "da → a" e riquadro con scorciatoie), ma a mesi: nell'app un componente proprio, la libreria non sceglie mesi |
| **Grafico** | Report subagenti (Liquidazioni, §7.8), Analisi (§7.22) | `tipo` barre / linea / ciambella, etichette, serie (`nome`, `valori`, `colore`, `tipo` per barre+linea), `orizzontale`, `impilato`, `altezza`, importi in euro all'italiana su assi e suggerimenti, legenda in basso; `onClick(indice)` per usare il grafico come filtro (puntatore a mano), `evidenzia` (indice in risalto, gli altri schiariti), `immagine()` → PNG su fondo bianco per Excel e PDF. Libreria **Chart.js** 4 (MIT; nel prototipo `assets/lib/chart.umd.min.js`, nell'app `chart.js` + `react-chartjs-2`); colori dell'app (`COLORI_GRAFICI`) |
| **GruppiDaFare** | lista "Da fare" della pagina Oggi (§7.1) | gruppi (`id`, titolo, variante, contatore, voci, riassunto, azioni di gruppo, testo se vuoto); `filtra(id)` collegato ai riquadri |
| **Elenco** | liste semplici (documenti, registro) | voci (testo, destra, `onClick` facoltativo: voce cliccabile anche da tastiera) |
| **CampoRicerca** + **RicercaEntita** | ogni campo collegato a un'entità: fornitore, cliente, subagente, codice cliente del fornitore, articolo (articoli già usati dal fornitore: un articolo nuovo è ammesso col pallino rosso), pratica, fattura/nota di credito | autocompletamento con le prime 5 voci, lente / F4 che apre la maschera di ricerca (FilterBar + DataTable), pallino verde/rosso se il valore esiste in anagrafica; entità definite una volta (voci da `/api/lookup/*`, chiave, testo, colonne, filtri, contesto). **Selezione singola** (predefinita: righe dei documenti, moduli) **o multipla** (`multipla: true`, filtri dell'Analisi): il campo chiuso mostra il nome della sola voce scelta o *Filtro multiplo (n)*; il menu, aperto entrando nel campo, ha in alto le voci scelte (✓, clic = toglie, *Togli tutti*) e sotto le altre, resta aperto e il `change` parte alla chiusura; nessun valore libero (niente pallino), valore = elenco di chiavi; maschera con colonna di caselle, *Scegli tutte le righe filtrate*, *Togli tutte*, *Applica (n)*. `contesto.limita` restringe le voci proposte, `contesto.tutti` include le voci non attive. Uso fuori dai moduli: `CampoRicerca(host, …)` e FilterBar `{ tipo: 'ricerca', entita, multipla }`. Nell'app un solo componente React con la prop `multipla` |
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
| D-11 | 16 e 18/10/2026 | Incassi: Decobrands non incassa; sul fatturato storno e riaccredito, sul maturato riconoscimento nel mese del pagamento; **storno alla liquidazione successiva**: mese dopo per Decobrands, trimestre dopo per il subagente come voce negativa | è come lavorano i fornitori; il subagente non restituisce soldi già pagati ma si vede la voce negativa nel prospetto successivo | Decobrands (Matteo Caironi) | §5.5, §5.14, §7.8 |
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
