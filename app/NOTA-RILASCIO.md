# Nota di rilascio — CRM provvigioni Decobrands

Prima versione dell'applicazione (F7-A2, spec §3.2 e §14). Il CRM è il primo modulo del Sistema
Informativo Aziendale: qui ci sono documenti dei fornitori, pratiche, bollettini, liquidazioni ai
subagenti, incassi dei clienti, analisi, anagrafiche (da Integra), gestione di utenti, ruoli,
impostazioni, registro, scarti e guida in linea.

## Versioni

La versione si vede in fondo a *Stato del sistema* (numero e commit) e in fondo alla barra. Ogni
consegna ha un tag di Git (`v0.2.0`); `git describe --tags` dice cosa gira, `git log v0.1.0..v0.2.0`
cosa è cambiato.

### 0.2.14 — 20/11/2026 — deploy col doppio click

- **`deploy/deploy.cmd` senza argomento prende l'ultima versione di `main`** e lascia la finestra
  aperta con l'esito (prima il doppio click stampava l'uso ed usciva, e ogni errore chiudeva la
  finestra). Con un tag si comporta come prima: backup, migrazioni, build, prova di salute, ritorno
  al rilascio precedente. Il ritorno indietro resta il tag più recente.
- **`app/README.md` e `app/DEPLOY.md`** aggiornati: l'aggiornamento è `deploy.cmd` (doppio click o
  tag), `pubblica.bat` resta senza backup.

### 0.2.13 — 19/11/2026 — bollettino leggibile, provvigioni sul pagato, deploy

- **Bollettino: le righe arrivano dal PDF.** Il rendiconto del fornitore viene letto come gli altri
  documenti e le sue righe (fattura, data, importo, provvigione, quota pagata) entrano nel bollettino:
  il confronto a cerniera mostra «loro» e «noi», le differenze e le fatture del bollettino che non
  sono fra le nostre pratiche. Per i bollettini già caricati e vuoti c'è *Importa le righe dal PDF*.
- **Dati letti del bollettino**: pulsante che apre la finestra con il PDF a sinistra e, a destra, i
  campi e le righe lette (quota compresa), con il collegamento per correggerli in Documenti.
- **Percentuale e quota separate**: la colonna «Noi calcoliamo» dice «15% di 2.117,30 € · quota 96%»,
  non più la percentuale effettiva (14,4%) che sembrava un errore.
- **Provvigione sul pagamento** (D-208): con una sola fattura nella pratica, se c'è il documento di
  pagamento del cliente la provvigione si calcola su quello (lo sconto per pagamento anticipato è già
  dentro l'importo), altrimenti sulla fattura. I documenti congelati in un periodo chiuso non si
  muovono.
- **Lettura dei prezzi**: il prezzo unitario è quello di listino, prima dello sconto di riga. Se il
  modello restituisce il prezzo già scontato, un controllo aritmetico lo riporta al listino
  (`importo = quantità × prezzo` con sconto a parte). Un documento intitolato «Shipping Advice» è un
  ordine.
- **Documenti**: il 409 del file già caricato dice la pratica (o il documento in coda) e la apre con un
  link; i documenti letti tre volte senza successo compaiono in *Da controllare* come «Non leggibile»;
  il dettaglio si rilegge quando la finestra torna in primo piano; la nota sul codice cliente compare
  solo quando il codice davvero non corrisponde.
- **Ricerca della pratica**: filtro **Non pagata** (fatturata e senza pagamento) usato da solo quando
  il documento è un pagamento; le pratiche suggerite compaiono solo con un elemento in comune (cliente
  o articoli), con il link per aprirle in una nuova scheda.
- **Pagamenti**: «Segna come pagata» chiede conferma; «Annulla il pagamento» richiede una motivazione
  (anche il server la pretende) e riporta la fattura a non pagata.
- **Pratica**: annullamento e ripristino con motivo, eliminazione (solo amministratore, solo se non è
  contabilizzata), versioni precedenti dei documenti con *Sostituisci*, agenzia senza subagente.
- **Interfaccia**: il pulsante «i» sta nella testata dei pannelli, all'estrema destra.
- **Deploy sul server** (`app/DEPLOY.md`): `setup.cmd` per la prima installazione e `deploy.cmd <tag>`
  per gli aggiornamenti, con backup, prova di salute e ritorno al rilascio precedente; sul server si
  scarica solo `app/` (checkout sparso).

### 0.2.12 — 17/11/2026 — agenzia senza subagente

- **Il subagente nell'agenzia non è più obbligatorio** (D-205): senza subagente la provvigione è tutta
  di Decobrands. La quota del subagente è 0 (anche sui documenti fissati e in modalità per riga), il
  documento non entra nelle liquidazioni dei subagenti e in Analisi compare sotto «Senza subagente».
  Nella finestra dell'agenzia «Al subagente %» e «Provvigione al subagente» si spengono finché il
  subagente è vuoto; il subagente si può aggiungere dopo, con la sua data.
- Una correzione della quota del subagente su un documento senza subagente è rifiutata.

### 0.2.11 — 17/11/2026 — ordine, conferma e proforma aggiornati

- **Sostituisci il documento registrato** (D-204): un ordine, una conferma o una proforma che arriva di
  nuovo con lo stesso numero (es. «agg Auftrag…», «agg Proforma…») è la versione aggiornata. La pagina
  dice «Questo ordine c'è già nella pratica N» e offre «Sostituisci…»: una finestra mostra prima e dopo
  (data, importo, righe, cliente) e chiede il motivo; il documento prende dati, righe e PDF nuovi, il
  PDF vecchio resta nella pratica, tutto finisce nel registro e si ricalcolano i documenti aperti. Non si
  può su una pratica chiusa; con due documenti aperti con lo stesso numero si abbina a mano. Fatture e
  note di credito restano doppioni.
- **Codice cliente**: su un documento già registrato il cliente si propone dal codice; l'avviso «il
  codice è di …» compare solo se il cliente scelto a mano è un altro.

### 0.2.10 — 17/11/2026 — bollettini a consuntivo, scaglioni come il vecchio CRM, Documenti più veloce

- **Scaglioni «Sconto da %» come nel vecchio CRM** (D-202): ogni soglia vale da quello sconto in su,
  fino alla successiva. Sotto la prima soglia è un'anomalia; sopra l'ultima vale l'ultima. Con «solo
  sconti esatti» lo sconto deve coincidere con una soglia.
- **Quota pagata nel bollettino** (D-201): dove il fornitore la scrive (Arte, «% bezahlt») si legge e
  il nostro conto la usa (base × quota × %), così non ogni riga risulta diversa.
- **Più righe del bollettino sulla stessa fattura** (Arte: una al 10% e una al 15%) si sommano e si
  confrontano con la nostra unica provvigione; una sola decisione per il gruppo. La stessa fattura in due
  bollettini diversi resta un doppione. Tolleranza 0,01 € per fattura.
- **Le differenze si guardano a consuntivo**: il CRM le evidenzia, una persona decide (accettato,
  contestato, attendere); niente regole per indovinare la logica del fornitore.
- **Documenti più veloce** (D-203): la coda e il dettaglio aspettavano Integra fino a 3 s a ogni
  apertura. Ora la ricerca automatica aspetta al massimo 0,5 s e, se Integra non risponde, per un minuto
  non lo interroga; la pagina dice «Integra non raggiungibile» invece di «nessun candidato».

### 0.2.9 — 17/11/2026 — percentuale per riga, scaglioni esatti, informazioni a comparsa

- **Raggruppamento sul fornitore** (D-199): «Sconto medio del documento» (come prima) oppure **«Per
  sconto di riga»**: le righe si raggruppano per sconto, ogni gruppo prende il suo scaglione e la
  provvigione è la somma (come fa Arte). Sulla pratica si può **derogare**, con motivo obbligatorio
  che resta nel registro; le pratiche con deroga hanno un segno e un filtro. In pratica e nel documento
  si vedono i gruppi. Documento, Riepilogo, liquidazione, Analisi e bollettini usano lo stesso calcolo.
- **Scaglioni «solo sconti esatti»** (D-200): sul fornitore si sceglie «a fascia» (come prima) oppure
  «solo sconti esatti» (±0,05 punti): uno sconto che non coincide con una soglia (es. 3% con soglie
  0/1/5/10) diventa un'anomalia e la provvigione resta da decidere, invece di prendere la soglia
  successiva. Serve per tabelle come quella di Arte con l'1% della fiera.
- **Il calcolo del CRM è una previsione**: il dato certo resta il bollettino del fornitore.
- **Informazioni a comparsa**: le spiegazioni lunghe sotto la tabella degli scaglioni (Fornitori) e
  dei ruoli (Soggetti) stanno ora in una finestra che si apre con il pulsante «i» in alto a destra; la
  tabella degli scaglioni non scorre più di lato e scorrono solo le righe.
- **Correzioni**: le anomalie di provvigione si registrano di nuovo (il registro rifiutava il servizio
  `provvigioni` dalla 0.2.7); una nota di credito già fissata non si sottrae più due volte nella
  liquidazione del subagente.
- **Sicurezza dei dati**: svuotamento e dati di prova si rifiutano su un database che non sia di prova.

### 0.2.8 — 16/11/2026 — note di credito più precise e pratica in una scheda a parte

- **La nota di credito porta le sue righe**: quelle lette dal documento si salvano come quelle della
  fattura. Così lo sconto medio si calcola sulla **differenza** fra fattura e nota: se la nota toglie
  le righe meno scontate, lo sconto medio sale e può cambiare lo scaglione (e quindi la provvigione).
- **Fattura già chiusa**: i suoi numeri non si toccano più; la nota di credito porta la **differenza**
  fra la provvigione ricalcolata sulla coppia fattura − nota e quella già fissata, per Decobrands e
  per il subagente. Una nota senza righe resta in attesa; lo storno totale azzera la provvigione.
- **Cerca pratica più utile**: nella ricerca della pratica, dal documento, c'è la colonna **Importo**
  (il valore dell'ultima fase della pratica) e un pulsante su ogni riga che apre la pratica in una
  **nuova scheda**, senza barra né menu, con «Chiudi la scheda». Così si controlla la pratica giusta
  senza perdere il documento che si sta lavorando.

### 0.2.7 — 16/11/2026 — sconto medio, spese e numeri che si fissano

- **La percentuale si sceglie dallo sconto medio dei documenti** (lo sconto reale che il fornitore
  stampa sulle righe), non più dallo sconto impostato sull'agenzia: nel Riepilogo della pratica
  compare «Sconto medio → scaglione». Se lo sconto supera l'ultimo scaglione, la pratica resta da
  decidere e non si chiude finché non si aggiunge lo scaglione.
- **Le spese** (trasporto, imballo, «Fracht») sono escluse dalla base della provvigione, salvo che
  l'accordo col fornitore le includa (spunta nelle condizioni del fornitore). L'«Imponibile» ora si
  chiama «Base provvigione».
- **I numeri si fissano**: quando un documento entra in un bollettino verificato o in un trimestre
  liquidato, i suoi valori non cambiano più (segno «fissato il …»); si correggono solo con una nota
  di credito o uno storno.
- **Pratiche suggerite**: una tendina filtra le pratiche per stato, parte da «Aperte» (le già
  fatturate non si propongono). La ricerca cerca solo fra le pratiche dello stesso cliente e
  fornitore del documento.
- **Prendi dalla coda**: dalla pratica si prende un documento già arrivato, senza reinserirlo a mano.
- **Nelle email ai fornitori** il riferimento in testa è il loro numero d'ordine; il numero della
  pratica nostra va in fondo come «nostro rif. OF/…».
- **Più piccoli**: barra dei filtri su una riga (i segmenti diventano una tendina quando non ci
  stanno); un pagamento non ha più un numero obbligatorio; la testata della pratica mostra tutti gli
  ordini; le voci di Oggi dicono quale documento chiede una decisione; «Usa importi calcolati (N)»
  corregge in blocco; il visualizzatore del PDF ha zoom ed errore visibile; tendina dell'anno nelle
  Liquidazioni; la posizione del campo è «indicativa», mai «esatta».

### 0.2.6 — 15/11/2026 — riconoscimento più furbo e coda che si aggiorna

- **Coda**: in coda e in lettura dal più vecchio al più recente (ordine di lettura); l’elenco si aggiorna da solo
  (evento `documento.stato`), il documento aperto a destra non si ricarica.
- **Riconoscimento** (D-164): vocabolario dei nomi letti (tabella `alias_letti`, migrazione
  `20261115090000_alias_letti`) imparato dalle scelte a mano; somiglianza dei nomi (pg_trgm, soglia 0,6, mai a
  caso); poi il codice cliente del fornitore, anche con agenzia da confermare.
- **P.IVA dal documento** (D-165): se manca nel CRM si propone «Salva la P.IVA» (solo CRM, da aggiornare in Integra).
- Prove: `giro.sh` avvia il backend di prova con `TENTATIVI=1000`.

### 0.2.5 — 14/11/2026 — percentuali dentro Apri la pratica

- **Percentuali mancanti** (D-162): *Apri la pratica* spiega che il fornitore non ha percentuali valide alla
  data dell’ordine e offre «Configura le percentuali» (la stessa finestra di Fornitori, ora componente comune).
- **Correzione delle percentuali** (D-163): si aggiungono e si tolgono scaglioni; da *Apri la pratica*, se la
  versione con quella data c’è già, si apre la sua correzione con lo sconto dell’agenzia pronto.
- **Campi di ricerca** (D-161): mentre i nomi arrivano niente numeri né pallino rosso.
- Nel vecchio CRM non ci sono percentuali: vanno inserite per fornitore.

### 0.2.4 — 14/11/2026 — agenzie del vecchio CRM da confermare

- **Agenzie del vecchio CRM** valgono da sempre (dal 01/01/2000: il vecchio CRM non ha la data d’inizio,
  D-158) e sono **da confermare** (D-159): aprendo la pratica si sceglie «Usa questa» o «Configura».
  Migrazione `20261114090000_agenzie_da_confermare`; `import:vecchio-crm -- --aggiungi --correggi-date`.
- **Agenzia mancante**: «Aggiungi l’agenzia» apre *Nuova agenzia per …* con cliente, fornitore e codice
  già compilati e bloccati, senza uscire da *Apri la pratica*.
- Clienti, scheda Agenzie: segno «da confermare» e azione «Conferma».

### 0.2.3 — 14/11/2026 — anagrafica del vecchio CRM e cliente nella correzione

- **Vecchio CRM, per ora** (D-156): fornitori, clienti, subagenti e collegamenti (codice cliente, sconti,
  subagente) aggiunti al database senza toccare i dati presenti (`import:vecchio-crm -- --db decobrands_db
  --aggiungi`, idempotente). Cosa manca in Integra: `dati-crm-legacy/import/da-inserire-in-integra.csv`.
  In esercizio un cliente o fornitore nuovo si inserisce prima in Integra.
- **Cliente scelto** in *Correggi i dati letti*: resta nel campo (pallino verde), si salva e la pratica parte
  con quello; «Cliente letto» non si sovrascrive.
- **Codice cliente nella ricerca del cliente**: con il fornitore scelto si vede il codice cliente presso quel
  fornitore; quello uguale al codice letto va in cima.

### 0.2.2 — 13/11/2026 — Correggi i dati letti più ordinata

- **Testata su tre righe**: Tipo, Numero, Data, Importo; Cliente letto › Cliente, Codice e P.IVA cliente;
  Fornitore letto › Fornitore, P.IVA fornitore. Il pulsante › porta il nome letto nella ricerca.
- **Somma righe** accanto all’Importo: si aggiorna con le righe e diventa **rossa** quando
  differisce dall’importo (la differenza esatta è nel suggerimento); non blocca il salvataggio,
  ma il server lo mette fra i punti da controllare.
- **P.IVA fornitore** letta dal documento (vale per i documenti letti da ora).
- **Ricerca su Integra e nel CRM per parole**: «ARTE WOHNACCESSOIRES GMBH & CO.KG» trova «Arte
  Wohnaccessoires GmbH & Co. KG» (sigle societarie e punteggiatura non contano).
- **Cliente** cercabile anche in *Correggi i dati letti* e con il nome letto in *Apri la pratica*.
- **Riepilogo dell’affidabilità** chiuso all’apertura, con la freccia; vuoto non occupa spazio.

### 0.2.1 — 13/11/2026 — correzioni dal primo giro con i documenti veri

- **Coda visibile**: i file caricati compaiono subito in *Documenti* («In coda», «In lettura») e si
  possono togliere dalla coda prima della lettura; se la lettura non è configurata lo dicono
  Documenti, Oggi e Stato del sistema. Si legge un documento ogni 15 secondi.
- **Soglie di affidabilità** (D-151): «Affidabile da» 0,80; le soglie arrivano dal server e i documenti
  ancora da controllare si riclassificano quando si salvano.
- **Fornitore e cliente** (D-152): dopo la lettura si cercano nel CRM e in Integra; se non è certo,
  l'operatore sceglie fra i candidati (un candidato di Integra si importa e si collega insieme).
- **PDF**: si vedono tutte le pagine e si scorrono; il campo scelto porta alla sua pagina.
- **Correggi i dati letti**: prezzi e importi in euro (`12,50 €`); *Aggiungi riga* porta il fuoco sulla
  riga nuova.
- **Interfaccia**: lente dei campi di ricerca a destra; in Impostazioni cambiando sezione si aggiorna
  solo la parte destra; pagina d'avvio scura.

### 0.2.0 — 13/11/2026 — primi documenti veri

Collaudo delle onde 0, 0 bis, 1 e 2 e dei pacchetti 3-01, 3-07, 3-09, 5-01, 5-04, 5-05, 6-01
(spec 8.80). In breve:
- **Documenti**: lo stesso file arrivato due volte non crea doppioni; uno scartato torna solo a mano;
  annullare un documento letto lo rimette da controllare con i dati corretti conservati.
- **Fattura su più pratiche**: la stessa fattura su una seconda pratica si accetta solo confermando
  «fattura su più ordini».
- **Soldi**: totali di documenti, bollettini, liquidazioni e Analisi calcolati dal server; somme in
  decimali esatti; il motore prende l'agenzia alla data dell'ordine (D-146).
- **Nota di credito sul maturato** di una fattura già liquidata: va nella liquidazione successiva
  come voce negativa, il trimestre chiuso non si riapre (D-150, Ugo).
- **Rettifiche di un bollettino contestato** nel mese dopo; tipo di provvigione bloccato dopo la
  prima chiusura.
- **Sicurezza**: casella, posta e Integra le cambia solo il superutente (D-115); il flusso degli
  aggiornamenti si chiude quando la sessione scade; segreti d'esempio rifiutati in esercizio.
- **Interfaccia**: avvisi letti dal lettore di schermo, tabelle da tastiera, schede che si
  ricordano, pagina d'avvio scura con indicatore di caricamento, versione visibile.

**Da verificare con i documenti veri**: lettura dei PDF dei fornitori (connettore cloud), abbinamento
alle pratiche, bollettini mensili in tedesco (*Provisionsabrechnung*). Excel ed email `.msg` non
si caricano: vanno convertiti in PDF.

## Cosa serve sul server

| Componente | Versione / nota |
|---|---|
| Node.js | 24 |
| PostgreSQL | database `decobrands_db` (utente proprietario `decobrands`) |
| Caddy | ≥ 2.5, davanti all'app, porte 80/443 (`deploy/Caddyfile`) |
| LibreOffice | per i PDF delle liquidazioni e dell'Analisi (`SOFFICE`) |
| Cartella documenti | `DOCUMENTI_DIR`, fuori dal repository, con backup |

Niente Docker: tre processi (backend 8002, frontend 8001, Caddy). Backend e frontend ascoltano solo
su `127.0.0.1`.

## Passi

1. Scaricare **solo `app/`** (sparse checkout `--no-cone`, vedi `README.md`) e `npm ci` in
   `backend/` e `frontend/`.
2. `backend/.env` da `.env.example`: `NODE_ENV=production`, `DATABASE_URL`, `SESSION_SECRET`,
   `SEGRETI_CHIAVE`, `DOCUMENTI_DIR`, `DOCUMENTI_MAX_MB`, `SOFFICE`, e i parametri della casella e di
   Integra quando ci sono.
3. `npx prisma migrate deploy` in `backend/`, poi `npm run build` in `backend/` e `frontend/`.
4. Primo utente: `npm run superutente -- <nome utente> <email> "<nome>"` (da `backend/`).
5. `avvia-esercizio.bat`: backend (`start:prod`), frontend (`start`) e Caddy.
6. Nel `deploy/Caddyfile` sostituire `crm.decobrands.it` con il nome del server: Caddy prende il
   certificato da solo. Il file mette `Strict-Transport-Security` e non dichiara `trusted_proxies`
   (Caddy sostituisce `X-Forwarded-For` con l'IP del client, D-41). Per gli aggiornamenti:
   `deploy/pubblica.bat` (`git pull` di `app/`, `npm ci`, migrazioni, build).

## Controlli dopo l'avvio

- `GET /api/salute` risponde `{ok: true}`; in *Stato del sistema* i quattro servizi sono verdi o
  dicono cosa manca.
- `curl -I https://<server>/` mostra `Strict-Transport-Security`; con
  `curl -H 'X-Forwarded-For: 1.2.3.4' …` il registro salva l'IP vero (D-41).
- Accesso con il superutente, poi creazione degli amministratori e degli utenti; ogni utente cambia
  la password provvisoria al primo accesso.
- In *Impostazioni → Casella dei documenti* e *Server di lettura* i parametri si vedono in sola
  lettura e si provano; i valori veri stanno in `backend/.env` o nel database (cifrati).
- Caricare un PDF di prova: deve entrare in *Documenti*, essere letto e abbinabile.
- Backup: database **e** `DOCUMENTI_DIR` ogni notte; il registro si conserva secondo `eventi_mesi`.

## Limiti noti di questa versione

- **Lettura con GLM-OCR in locale (F6-A5) non ancora attiva**: si usa il connettore LlamaCloud UE.
  Il connettore locale si accende quando arriva la macchina con la GPU.
- **Rettangolo del valore sul PDF**: disegnato con PDF.js sulla posizione letta (D-06); da verificare
  con il connettore locale.
- **`lettura.lenta`** non è ancora un'anomalia dello Stato del sistema (serve il conteggio delle
  pagine dal connettore locale).
- **Solleciti**: il CRM prepara il testo e lo copia; non manda email ai fornitori o ai clienti.
- **Integra**: clienti e fornitori si leggono soltanto (viste sul database ponte).
- Sotto i 744 px l'app non si adatta: è per computer e tablet (D-44).

## Ripristino

Fermare i tre processi, ripristinare l'ultimo backup del database e di `DOCUMENTI_DIR`, rilanciare
`avvia-esercizio.bat`. Le migrazioni sono in avanti soltanto: per tornare a una versione precedente
serve anche il backup.
