# Specifica — CRM Ordini a Fornitore, Bollettini e Provvigioni (Decobrands)

**Versione:** 5.3 — confronto con la nota di credito: solo le righe stornate, differenza = importo stornato (§7.3); FinestraAffiancata a tutto schermo sui telefoni (§16.4); versione 5.2 — **regola V12: ogni calcolo e operazione sensibile solo sul backend, mai da dati del frontend** (§2, §16.5, D-28); versione 5.1 — regole del subagente per cliente e per documento: % dell'agenzia, una fattura al mese, correzione sul documento con motivo (§4.2.6, §4.2.7.2, §5.2, §7.6, §7.8, §8.1, §10, §15.2.3, D-27); versione 5.0 — fotografia delle righe registrata nel cambio di stato della pratica, senza l'azione `snapshot_righe` (§15.2.4); percentuali dei fornitori con data di validità e calcolo per documento alla sua data; eccezioni personali dei subagenti inserite nel CRM; rotte delle pagine come il prototipo ufficiale; tolti i filtri vecchi della liquidazione; formula §10 sul netto dei documenti (§4.2.2, §4.2.3, §5.2, §5.11, §7, §7.5, §7.8, §8.1, §10, §13, §15.2.2, D-25, D-26); versione 4.9 — il **prototipo ufficiale** è `prototipo-alternativo/` (struttura, stile senza Bootstrap, componenti, testi, numeri); `prototipo-crm/` resta come archivio (V4, §3.1, §7.10, §16.1, §16.3, §16.4, D-24); versione 4.8 — **filtri standard** in tutte le barre: entità sempre con ricerca a selezione multipla, riepilogo e azzeramento a icona (Pratiche, Bollettini, Cliente → Pratiche, Analisi); numeri dei segmenti aggiornati dal vivo con gli altri filtri; contatori aggiornati dal vivo ai cambiamenti dei dati, tabelle su richiesta (§16.4.1, §16.4.2, D-22, D-23); versione 4.7 — filtri dell'Analisi su una riga con il periodo; campo a selezione multipla che mostra il nome della sola voce scelta o *Filtro multiplo (n)* e apre il menu con in alto le voci scelte; icone *Riepilogo dei filtri* (riquadro con tutti i filtri) e *Togli tutti i filtri* (§7.22, §16.4, D-21); versione 4.6 — campi di ricerca con **selezione singola o multipla** (stesso componente della ricerca articoli: etichette nel campo, ✓ nel menu, caselle nella maschera); filtri fornitori, subagenti e clienti dell'Analisi a selezione multipla (§7.22, §16.4, D-20); versione 4.5 — liquidazioni: tornano le due colonne (subagenti | documenti); nel pannello di destra le schede *Documenti* e *Report subagenti*; nuova pagina **Analisi** con la BI completa: periodo di 3, 6 o 12 mesi, filtri fornitore / subagente / cliente, filtro incrociato con un clic su grafici e righe, confronto con il periodo precedente, tabella raggruppabile, esportazione Excel con grafici, PDF e CSV (§7.8, §7.22, §16.4, D-18, D-19); versione 4.4 — liquidazioni: scheda *Sintesi* con numeri e grafici (fatturato, provvigioni, margine, fornitori, subagenti) prima del dettaglio; componente Grafico con Chart.js (§7.8, §16.4, D-17); versione 4.3: bollettini: sempre 6 mesi con selettore a mesi (anno + griglia, scorciatoie) e completamento automatico (§7.7, componente PeriodoMesi §16.4, D-16); versione 4.2: documenti: dettaglio a schede con prima l'azione proposta e poi le righe lette (§7.9, D-15); versione 4.1: bollettini: periodo Da–A di al massimo 6 mesi, filtro fornitore e *Con qualcosa da fare* (§7.7, D-14); versione 4.0: pratica a schede *Riepilogo* · *Righe a confronto* con avviso delle variazioni, niente percorso nelle pagine di dettaglio (§7.3); **registro delle decisioni con il loro perché** (§19) e regola di consegna (§16.5); versione 3.9: incassi dei clienti descritti nelle pagine: riquadro Pagamenti in Oggi, Incasso del cliente nella pratica, giorni per l'incasso nel fornitore, filtro Non pagate nel cliente, finestra Solleciti di pagamento (§7.1, §7.3, §7.4, §7.6, §5.14); versione 3.8: storno alla liquidazione successiva: mese per Decobrands, trimestre per il subagente con voce negativa; incassi dei clienti nel prototipo (§5.14, §7.8); versione 3.7: Stato del sistema: da dove vengono i dati di ogni servizio, come si calcola lo stato, catalogo dei problemi, vita di un problema, interfacce del server (§7.14.1–§7.14.5, §4.2.15); versione 3.6: incassi dei clienti: insoluti, storni e riaccrediti sul fatturato, riconoscimento al pagamento sul maturato, solleciti di pagamento ai clienti (§5.5, §5.14, §6.2, §7.7); versione 3.5: guida in linea completa: panoramica con schema del ciclo, comandi comuni, per ogni pagina passi, pulsanti e finestre (§7.17); versione 3.4: paginazione delle tabelle con ordinamento e totali su tutto l'elenco (§16.4); versione 3.3: scheda cliente con le schede *Agenzie* e *Pratiche* filtrabili (§7.6); versione 3.2: la **vendita diretta** (ordini cliente, articoli, giacenze, alias e kit) è un **ampliamento futuro**: progettata e conservata nel prototipo ma spenta (§17); come distinguere fra documenti dell'agenzia e ordini della vendita diretta nell'ingresso unico dei documenti (§17.2); versione 3.1: componente **Schede** (§16.4) e suo uso dove una scheda impilava più tabelle: esportazione per Integra (§7.18), fornitore (§7.4), utente (§7.13), colonna destra di Oggi (§7.1), Alias e kit (§7.21); versione 3.0: vendita diretta dalla Gestione Ordini: ordini cliente con esportazione per Integra (Ordine cliente e Ordine fornitore), articoli, giacenze con impegni, alias e kit (§7.18–§7.21, §4.2.16–§4.2.17); dati di Integra letti da viste sul database con sincronizzazione ogni pochi secondi, al posto dell'import da file (§4.1, §4.5); versione 2.9: idee e strumenti per il supporto alle decisioni con modelli linguistici e decisioni tipizzate, fase successiva (§18); pagine di gestione: utenti e ruoli (con sola lettura), stato del sistema, impostazioni, documenti scartati, guida (§7.13–§7.17, §8.3); esportazione della liquidazione: completa, un subagente, solo riepilogo, in Excel, PDF o CSV (§11); liquidazione con elenco subagenti che regge qualsiasi numero di subagenti (§7.8); bollettino atteso entro un giorno fissato per fornitore, sollecito solo dopo (§4.2.1, §5.6); pagina Oggi per gruppi di lavoro con solleciti per fornitore (§7.1); **Stato:** validata con il cliente; anagrafiche clienti e fornitori da Integra in sola lettura, schermata Clienti con le agenzie (§4.1, §7.6); ritorno alla schermata precedente nello stesso punto (§7.12); documenti della pratica consultabili affiancati al confronto (§7.3); evidenziazione del valore nel documento **da verificare** con prova di fattibilità (§6.6); stack allineato al Portale B2B Luis (§16.3); componenti standard (§16.4); ingresso documenti interno senza n8n, lettura con GLM-OCR in locale (§6.5); sostituzione della Gestione Ordini pianificata in una fase successiva (§17)
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

La **Gestione Ordini** attuale resta in esercizio, invariata, per gli ordini cliente e
l'esportazione verso Integra. La sua **sostituzione** con un modulo del CRM, che userà lo
stesso ingresso documenti, è prevista in una **fase successiva** (§17), fuori da questo
preventivo.

---

## 2. Vincoli e requisiti generali

| # | Vincolo | Valore |
|---|---------|--------|
| V1 | Unica applicazione | Tutte le funzioni in un'unica applicazione web |
| V2 | Database condiviso | Stesso PostgreSQL (`decobrands`) della Gestione Ordini: tabelle esistenti riusate senza modificarle + tabelle nuove del CRM. I documenti del CRM entrano dall'**ingresso documenti interno** (§6.5), non dalla pipeline n8n della Gestione Ordini |
| V3 | Autenticazione | Tabella `users` con ruoli; utente di default `admin` (ruolo `admin`); sessione su cookie HttpOnly/Secure/SameSite + protezione CSRF (§3.3) |
| V4 | Stile grafico | Quello del prototipo ufficiale `prototipo-alternativo/` (D-24): `stile.css` con la palette Decobrands (primario `#0d6efd`, scuro `#212529`, sfondo `#f5f6f8`, stessi colori della Gestione Ordini), carattere Public Sans, barra laterale scura con logo; niente Bootstrap |
| V5 | Lingua | Tutte le interfacce in italiano |
| V6 | Responsive | Desktop + tablet + mobile |
| V7 | Stack | **Stesso stack del Portale B2B Luis**: Node 24, frontend Next.js 16 (App Router) + React 19 + TypeScript, backend NestJS 11, ORM Prisma 7 (adapter `pg`), PostgreSQL condiviso (V2). Due processi Node dietro Caddy; Docker solo in sviluppo (§3.4) |
| V8 | Fidelità | Alta fedeltà — dati reali, interazioni reali |
| V9 | Contenitori dati stabili | Ogni tabella è una **DataTable standard** (§16.4): occupa tutto lo spazio disponibile, intestazione fissa, righe scorrevoli, intestazioni ordinabili; il layout non cambia al variare del numero di righe |
| V11 | Lettura documenti in locale | **GLM-OCR** servito da **vLLM** su un server aziendale con GPU, chiamato direttamente dal backend NestJS; nessun n8n, nessun servizio esterno; i documenti non escono dall'azienda (§6.5) |
| V10 | Tracciamento eventi | Il sistema registra automaticamente gli eventi applicativi (CRUD, cambi di stato, upload/export, autenticazione) ed errori su `eventi_app` (§4.2.11), consultabili in sola lettura da `/eventi` (§7.11, §15); le tabelle della Gestione Ordini non vengono modificate (V2) |
| **V12** | **Calcoli e operazioni sensibili solo sul backend** | **Ogni calcolo e ogni operazione sensibile si esegue sul server partendo dai dati del database, MAI da dati presi dal frontend**: il client mostra e invia solo le scelte dell'utente (vedi la regola qui sotto, D-28) |

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

Moduli ripresi dal Portale B2B Luis:

- Tabella `users` **condivisa con la Gestione Ordini** (stessi ruoli); utente di default
  `admin` (ruolo `admin`).
- Sessioni server-side in PostgreSQL (`express-session` + `connect-pg-simple`), password
  con hash argon2; cambio password, reset via token, "resta connesso".
- Cookie di sessione HttpOnly + Secure + SameSite, protezione CSRF sulle richieste che
  modificano dati, Helmet, limite tentativi sul login (`@nestjs/throttler`), CORS
  ristretto all'origine del frontend, validazione input con DTO (`class-validator`).
- `requireAuth`: tutte le viste tranne login/reset.
- `requireAdmin`: viste sensibili (clienti, utenti, eventi).

**Accesso unico con la Gestione Ordini (da verificare in F0-A3):** se la Gestione Ordini
salva le sessioni nello stesso formato, la sessione è condivisa; altrimenti il CRM ha un
proprio accesso sulla **stessa** tabella `users` (stesse credenziali, login separato).

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
                 PostgreSQL `decobrands` (condiviso, V2)
```

- Esposte solo le porte 80/443; frontend, backend e database restano locali.
- Porte 8001/8002 per non collidere con la Gestione Ordini e con altre applicazioni sul server.
- Lavori pianificati (`@nestjs/schedule`): controllo giornaliero delle conferme scadute (§5.12).
- File Excel (lettura bollettini, export) con `exceljs`; upload documenti con `multer`
  (incluso in NestJS).
- Test: Jest + supertest (motore §10 e API).

---

## 4. Modello dati

### 4.1 Tabelle esistenti riusate (database condiviso)

Il CRM **condivide il database** con la gestione degli ordini: stesso schema
PostgreSQL, nessuna tabella esistente viene modificata. Le tabelle sotto sono quelle
già presenti che il CRM riusa (in lettura e, dove previsto, in scrittura).

| Tabella | Uso nel CRM |
|---------|-------------|
| `users` | autenticazione e ruoli (condivisa con la Gestione Ordini). Il CRM legge il ruolo da una tabella propria `crm_ruoli_utente` (`user_id`, `ruolo` = `amministratore` \| `operatore` \| `lettura`): i ruoli della Gestione Ordini (`admin`/`operator`) non cambiano (§8.3) |
| `remember_tokens` | sessione persistente |
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
> e collega le pratiche alla stessa `cliente_piva` usata negli ordini clienti.

### 4.2 Nuove tabelle CRM

### 4.2.1 `fornitori`

Anagrafica dei fornitori, con i giorni di attesa conferma e la modalità di pagamento
delle provvigioni.

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | BIGSERIAL PK | |
| `ragione_sociale` | VARCHAR(255) NOT NULL | da Integra, sola lettura |
| `piva` | VARCHAR(20) | univoco se valorizzato; da Integra, sola lettura |
| `codice_integra` | VARCHAR(20) UNIQUE | codice del fornitore in Integra, chiave dell'import |
| `giorni_attesa_conferma` | INT DEFAULT 30 | usato per le scadenze |
| `giorno_bollettino` | SMALLINT DEFAULT 10, CHECK 1–28 | giorno del **mese successivo** entro cui il fornitore manda il bollettino; prima è "atteso", dopo "non arrivato" con sollecito (§5.6) |
| `payment_type` | VARCHAR(20) DEFAULT `'invoiced'` | `matured` \| `invoiced` — maturazione provvigioni (**§5.5**) |
| `giorni_incasso` | SMALLINT DEFAULT 60 | giorni dalla data fattura entro cui ci si aspetta il pagamento del cliente; dopo, la fattura non riconosciuta (maturato) diventa **incasso da verificare** (§5.14) |
| `discount` | NUMERIC(5,2) DEFAULT 0 | sconto di default del fornitore (ridondante, vedi §4.4) |
| `note` | TEXT | |
| `attivo` | BOOLEAN DEFAULT true | |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

### 4.2.2 `provvigioni_scaglioni`

Tabella a scaglioni per fornitore: **più sconto si accorda al cliente, meno provvigione
si incassa / si paga**.

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | BIGSERIAL PK | |
| `fornitore_id` | BIGINT FK → `fornitori` | ON DELETE CASCADE |
| `sconto_min` | NUMERIC(5,2) DEFAULT 0 | |
| `sconto_max` | NUMERIC(5,2) DEFAULT 100 | |
| `pct_agente` | NUMERIC(5,2) DEFAULT 0 | % che incassa Decobrands dal fornitore |
| `pct_subagente` | NUMERIC(5,2) DEFAULT 0 | % che Decobrands paga al subagente |
| `valido_dal` | DATE NOT NULL | data da cui valgono le percentuali (versione); un documento usa la versione con `valido_dal` ≤ data del documento più recente (§5.11, D-25) |
| `ordinamento` | INT DEFAULT 0 | |
| `created_at` | TIMESTAMPTZ | |
| Vincolo | `UNIQUE(fornitore_id, sconto_min, valido_dal)` | uno scaglione per sconto in ogni versione |

*Nuove percentuali da una data* (scheda del fornitore, §7.4) crea una nuova versione di
tutti gli scaglioni del fornitore con la data indicata; le versioni precedenti restano e
calcolano i documenti di prima. **Perché** (D-25): le condizioni cambiano dal periodo in cui
vengono riviste e i documenti precedenti vanno riletti con le percentuali di allora, anche
quelli non ancora in un bollettino verificato e nell'Analisi dei periodi passati.

Esempio reale (fornitore Gries):

| Sconto | pct_agente | pct_subagente |
|--------|-----------|---------------|
| 0 % | 18 | 10 |
| 1 % | 18 | 0 |
| 5 % | 13 | 7 |
| 10 % | 5 | 2 |
| 100 % | 0 | 0 |

### 4.2.3 `provvigioni_eccezioni`

Eccezioni per singolo subagente su uno scaglione (rare, gestite a mano). Se presente,
il valore vince sulla percentuale standard dello scaglione.

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | BIGSERIAL PK | |
| `scaglione_id` | BIGINT FK → `provvigioni_scaglioni` | ON DELETE CASCADE |
| `subagente_id` | BIGINT FK → `subagenti` | |
| `pct_override` | NUMERIC(5,2) NOT NULL | |
| `created_at` | TIMESTAMPTZ | |

> Le eccezioni si **inseriscono, modificano ed eliminano nel CRM**, dalla scheda del
> subagente (§7.5, D-26). Valgono sulla versione delle percentuali in vigore quando si
> salvano; con *Nuove percentuali da una data* passano alla nuova versione con la stessa
> percentuale. Vincolo `UNIQUE(scaglione_id, subagente_id)`.

### 4.2.4 `agenti`

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | BIGSERIAL PK | |
| `codice` | VARCHAR(50) UNIQUE NOT NULL | |
| `nome` / `cognome` | VARCHAR(100) NOT NULL | |
| `email` / `telefono` | VARCHAR | |
| `attivo` | BOOLEAN DEFAULT true | |
| `created_at` | TIMESTAMPTZ | |

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
| `subagente_id` | BIGINT FK → `subagenti` | ON DELETE CASCADE |
| `cliente_piva` | VARCHAR(20) NOT NULL | |
| `fornitore_id` | BIGINT FK → `fornitori` | ON DELETE CASCADE |
| `codice_cliente_fornitore` | VARCHAR(50) | nullable — **codice con cui il fornitore identifica il cliente** (quello stampato su conferma e fattura): è la chiave per abbinare il documento ricevuto alla pratica (§4.4) |
| `discount` | NUMERIC(5,2) DEFAULT 0 | **sconto accordato al cliente su quel fornitore** — determina lo scaglione (**§4.4**) |
| `pct_subagente` | NUMERIC(5,2) NULL | % al subagente **per questo cliente** su questo fornitore; NULL = quella dello scaglione o dell'eccezione (§5.2, D-27) |
| `regola_mensile` | VARCHAR(10) NULL | NULL = provvigione al subagente su ogni fattura; `prima` · `piu_alta` = **una fattura al mese** (la prima o la più alta del mese), le altre a zero (§5.2, D-27) |
| `attivo` | BOOLEAN DEFAULT true | |
| `created_at` | TIMESTAMPTZ | |
| Vincolo | `UNIQUE(subagente_id, cliente_piva, fornitore_id)` | un solo subagente per cliente×fornitore (**§5.10**) |
| Vincolo | `UNIQUE(fornitore_id, codice_cliente_fornitore)` | il codice del fornitore non può essere attribuito a due clienti dello stesso fornitore (dove valorizzato) |

### 4.2.7 `ordini_fornitore_testata`

La **pratica** dell'ordine a fornitore. Si completa man mano che arrivano i documenti e
attraversa gli stati `inviato → confermato → fatturato`.

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | BIGSERIAL PK | |
| `fornitore_id` | BIGINT FK → `fornitori` | |
| `ordine_cliente_id` | BIGINT FK → `ordini_cliente_testata` | nullable — ordine cliente che ha originato la pratica (ponte §4.1) |
| `numero_ordine` | VARCHAR(50) | numero ordine del fornitore |
| `data_ordine` | DATE | |
| `cliente_piva` | VARCHAR(20) | cliente finale |
| `cliente_ragione_sociale` | VARCHAR(255) | |
| `agente_id` | BIGINT FK → `agenti` | nullable |
| `importo_merce` | NUMERIC(12,2) | importo merce (base del calcolo provvigioni) |
| `stato` | VARCHAR(20) DEFAULT `'inviato'` | `inviato` \| `confermato` \| `fatturato` |
| `att_filename_ordine` | TEXT | allegato PDF ordine |
| `att_filename_conferma` | TEXT | allegato PDF conferma |
| `att_filename_fattura` | TEXT | allegato PDF fattura |
| `conferma_data` | DATE | |
| `conferma_numero` | VARCHAR(50) | |
| `conferma_scadenza` | DATE | *data ordine + giorni_attesa_conferma* del fornitore |
| `fattura_numero` | VARCHAR(50) | riferimento sintetico all'ultima fattura (i documenti completi stanno in §4.2.7.1) |
| `fattura_data` | DATE | come sopra |
| `fattura_importo` | NUMERIC(12,2) | come sopra |
| `note` | TEXT | |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

#### 4.2.7.1 `ordini_fornitore_documenti`

Documenti fiscali **agganciati alla pratica**: fatture e **note di credito**. È il modello
a ponte pratica ↔ documento che copre **fatture multi-ordine** e **ordini fatturati in più
tranche** (§5.9): una pratica ha **n** documenti. Sostituisce, per i casi non banali, i campi
singoli `fattura_*` della testata.

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | BIGSERIAL PK | |
| `testata_id` | BIGINT FK → `ordini_fornitore_testata` | ON DELETE CASCADE |
| `tipo` | VARCHAR(20) | `fattura` \| `nota_credito` |
| `numero` | VARCHAR(50) | numero documento |
| `data` | DATE | |
| `importo` | NUMERIC(12,2) | **positivo** per fattura, **negativo** per nota di credito |
| `storno_totale` | BOOLEAN DEFAULT false | per una nota di credito: `true` = storna tutta la fattura, `false` = storno parziale |
| `fattura_riferimento` | VARCHAR(50) | nullable — numero della fattura stornata (per le note di credito) |
| `stato_incasso` | VARCHAR(15) DEFAULT `'da_incassare'` | solo fatture: `da_incassare` · `pagata` · `insoluta` (§5.14) |
| `insoluta_dal` · `pagata_il` | DATE | dal bollettino (storno, riaccredito, riconoscimento sul maturato) o dalla segnalazione del fornitore |
| `fonte_incasso` | VARCHAR(20) | `bollettino` · `fornitore` (segnalazione via email o telefono) · `manuale` |
| `sollecitata_il` · `solleciti` | DATE · SMALLINT | ultimo sollecito di pagamento al cliente e quanti ne sono stati fatti |
| `att_filename` | TEXT | allegato PDF del documento |
| `note` | TEXT | |
| `created_at` | TIMESTAMPTZ | |

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
| `creato_da` · `creato_il` | BIGINT FK → `users` · TIMESTAMPTZ | |

Si modifica solo finché il trimestre di liquidazione del documento è aperto.

### 4.2.8 `ordini_fornitore_righe`

Righe della pratica, **una fotografia per fase** (`fase`): `ordine` (come inviato),
`conferma` (come confermato dal fornitore, §5.8) e `fattura` (come fatturato). Le tre
fotografie non si sovrascrivono: il **confronto fra fasi** è calcolato a runtime
allineando le righe per `codice` (§7.3, §5.8).

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | BIGSERIAL PK | |
| `testata_id` | BIGINT FK → `ordini_fornitore_testata` | ON DELETE CASCADE |
| `fase` | VARCHAR(20) DEFAULT `'ordine'` | `ordine` \| `conferma` \| `fattura` |
| `numero_riga` | INT | |
| `codice` | VARCHAR(100) | chiave di allineamento nel confronto fasi |
| `descrizione` | VARCHAR(255) | |
| `um` | VARCHAR(20) | |
| `quantita` | NUMERIC(12,3) | |
| `prezzo_unitario` | NUMERIC(12,4) | |
| `importo` | NUMERIC(12,2) | |

> Vincolo `UNIQUE(testata_id, fase, numero_riga)`. Al passaggio di stato le righe
> della fase precedente **restano**; la nuova fase ne salva una copia che l'operatore
> (o la lettura del documento) può modificare.

### 4.2.9 `bollettini_testata`

Bollettino del fornitore su un mese/anno. Stato `da_verificare → verificato |
contestato`.

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | BIGSERIAL PK | |
| `fornitore_id` | BIGINT FK → `fornitori` | |
| `mese` | INT CHECK 1–12 | |
| `anno` | INT | |
| `att_filename` | TEXT | allegato bollettino |
| `importo_riconosciuto` | NUMERIC(12,2) | somma delle righe riconosciute dal fornitore |
| `importo_calcolato` | NUMERIC(12,2) | somma della provvigione attesa calcolata dal sistema |
| `stato` | VARCHAR(20) DEFAULT `'da_verificare'` | `da_verificare` \| `verificato` \| `contestato` |
| `note` | TEXT | |
| `created_at` / `updated_at` | TIMESTAMPTZ | |
| Vincolo | `UNIQUE(fornitore_id, mese, anno)` | un bollettino per fornitore/mese |

### 4.2.10 `bollettini_righe`

Si appaia **riga per riga** quello che il fornitore riconosce con quello che il sistema
ha calcolato.

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | BIGSERIAL PK | |
| `testata_id` | BIGINT FK → `bollettini_testata` | ON DELETE CASCADE |
| `fattura_numero` | VARCHAR(50) | |
| `fattura_data` | DATE | |
| `cliente_piva` | VARCHAR(20) | |
| `importo_merce` | NUMERIC(12,2) | |
| `pct_riconosciuta` | NUMERIC(5,2) | % applicata dal fornitore |
| `importo_riconosciuto` | NUMERIC(12,2) | importo riconosciuto dal fornitore |
| `pct_calcolata` | NUMERIC(5,2) | % attesa dal sistema |
| `importo_calcolato` | NUMERIC(12,2) | importo atteso dal sistema |
| `differenza` | NUMERIC(12,2) | riconosciuto − calcolato |
| `tipo_riga` | VARCHAR(15) DEFAULT `'provvigione'` | `provvigione` · `storno` (riga negativa: il cliente non ha pagato; solo fatturato) · `riaccredito` (riga positiva su fattura già stornata, dopo il pagamento) (§5.14) |
| `fattura_mese` | DATE | mese della fattura quando è diverso da quello del bollettino (storni, riaccrediti, riconoscimenti al pagamento sul maturato) |
| `created_at` | TIMESTAMPTZ | |

> `pct_calcolata` / `importo_calcolato` vengono **congelati alla verifica**: è il modo
> per rileggere un mese vecchio con le percentuali di allora (§5.11).

### 4.2.11 `eventi_app`

Registro **append-only** degli eventi applicativi (audit trail): CRUD, cambi di
stato, upload/export e autenticazione. Compilazione esclusivamente server-side (§15);
nessuna UPDATE/DELETE in esercizio.

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | BIGSERIAL PK | |
| `ts` | TIMESTAMPTZ | data/ora evento (server) |
| `utente_id` | BIGINT FK → `users` | NULL per eventi di sistema / login non riuscito |
| `sessione_id` | VARCHAR(100) | sessione server-side (per eventi `auth`) |
| `tipo` | VARCHAR(30) | `auth` · `crud` · `stato` · `documento` · `calcolo` · `export` · `errore` |
| `entita` | VARCHAR(50) | `fornitore`, `scaglione`, `eccezione`, `correzione`, `agente`, `subagente`, `interscambio`, `pratica`, `riga_pratica`, `documento`, `bollettino`, `riga_bollettino`, `liquidazione`, `ordine_cliente`, `alias`, `kit`, `utente`, `sistema` |
| `entita_id` | BIGINT | id dell'entità coinvolta (dove applicabile) |
| `azione` | VARCHAR(30) | `create` · `update` · `delete` · `upload` · `export` · `change_state` · `verify` · `login` · `logout` · `change_password` · `reset_requested` · `access_denied` · `error` |
| `esito` | VARCHAR(10) | `successo` · `errore` · `negato` |
| `dettaglio` | JSONB | sempre la chiave `etichetta`; diff `prima`/`dopo`, nuovo stato, riferimento documento / `documenti_in_arrivo`, errore tecnico breve (§15.4) |
| `ip` | VARCHAR(45) | indirizzo client (solo eventi `auth`/`negato`) |
| `created_at` | TIMESTAMPTZ | |

> Tabella **append-only**: nessuna modifica/eliminazione manuale. La riga viene scritta
> **nella stessa transazione** dell'operazione che la genera (§15.3); un job di pulizia
> elimina le righe più vecchie di 36 mesi (§15.7). Indici: `(tipo, ts)`,
> `(entita, entita_id)`, `(utente_id, ts)`.

### 4.2.12 `documenti_in_arrivo`

Coda e stato di ogni documento entrato nel CRM (§6.5), dalla ricezione all'abbinamento.

| Campo | Tipo | Note |
|---|---|---|
| `id` | BIGSERIAL PK | |
| `origine` | VARCHAR(12) | `email` · `caricamento` |
| `email_da` · `email_oggetto` | TEXT | solo per origine email |
| `file_nome` | TEXT | nome originale |
| `file_hash` | CHAR(64) UNIQUE | SHA-256 del file: evita di leggere due volte lo stesso documento |
| `file` | BYTEA | PDF o Excel originale (oppure percorso su disco, da decidere in F0) |
| `stato` | VARCHAR(16) | `in_coda` → `in_lettura` → `da_controllare` → `abbinato` · `scartato` · `errore` |
| `tentativi` · `errore` | INT · TEXT | riletture automatiche (max 3) e ultimo errore |
| `tipo` | VARCHAR(16) | `ordine` · `conferma` · `fattura` · `nota_credito` · `bollettino` (letto, correggibile) |
| `fornitore_id` | FK → `fornitori` | riconosciuto dalla lettura, correggibile |
| `dati_letti` | JSONB | testata + righe nello schema del tipo (§6.5) |
| `affidabilita` | NUMERIC(4,3) | valore del campo meno affidabile del documento |
| `livello` | VARCHAR(12) | `affidabile` · `da_controllare` · `bassa` (§6.5) |
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

Una riga per sezione (`chiave` = `azienda` · `casella` · `lettura` · `posta` · `integra` · `conservazione`), `valore` JSONB, `aggiornato_il`, `aggiornato_da`. Le password (casella IMAP, posta in uscita) sono **cifrate** (chiave nel file d'ambiente del server) e **non vengono mai restituite** dalle API: si sostituiscono soltanto. Ogni modifica scrive un evento (§15).

### 4.2.15 `servizi_esecuzioni` e `servizi_problemi`

Registro dei servizi automatici, letto dalla pagina Stato del sistema (§7.14). Li scrivono
**solo i servizi** (mai l'interfaccia, salvo *Segna come visto*), con un'unica funzione
`registraEsecuzione()` / `apriProblema()` nel livello dei servizi.

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
| `avviato_da` | BIGINT FK → `users` | NULL se pianificato; l'utente se da *Controlla adesso* |

`servizi_problemi` — una riga per problema **aperto o chiuso**; lo stesso problema che si
ripete aggiorna la riga esistente invece di crearne una nuova.

| Colonna | Tipo | Note |
|---|---|---|
| `id` | BIGSERIAL PK | |
| `servizio` | VARCHAR(15) | come sopra |
| `codice` | VARCHAR(40) | dal catalogo §7.14.3 (es. `casella.connessione`) |
| `chiave` | VARCHAR(120) | cosa riguarda, per riconoscere i doppioni (es. `C00931`, nome dell'allegato, email del destinatario); vuota se il problema è del servizio intero |
| `livello` | VARCHAR(10) | `errore` · `attenzione` |
| `testo` | VARCHAR(200) | titolo (es. "Cliente non sincronizzato: P.IVA mancante") |
| `dettaglio` | TEXT | cosa è successo e **cosa fare** |
| `primo` · `ultimo` | TIMESTAMPTZ | prima e ultima volta che si è presentato |
| `volte` | INT DEFAULT 1 | quante volte |
| `chiuso_il` | TIMESTAMPTZ | NULL = aperto; valorizzato quando la causa sparisce (chiusura automatica, §7.14.4) |
| `visto_il` · `visto_da` | TIMESTAMPTZ · BIGINT FK → `users` | *Segna come visto* |

Indici: `servizi_esecuzioni (servizio, inizio DESC)`; `servizi_problemi (servizio, codice,
chiave) WHERE chiuso_il IS NULL` univoco (un solo problema aperto per causa),
`servizi_problemi (visto_il) WHERE visto_il IS NULL`. Conservazione: esecuzioni 90 giorni
(sono molte: la sincronizzazione ne scrive una al minuto), problemi come il registro
eventi (`eventi_mesi`, §7.15); pulizia con un lavoro notturno.

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
| `creato_il` · `creato_da` | TIMESTAMPTZ · BIGINT FK → `users` | |
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

### 4.3 Diagramma relazionale

```
fornitori 1 ── n provvigioni_scaglioni 1 ── n provvigioni_eccezioni (→ subagenti)
fornitori 1 ── n interscambio ── n 1 subagenti n ── 1 agenti
fornitori 1 ── n ordini_fornitore_testata 1 ── n ordini_fornitore_righe
fornitori 1 ── n bollettini_testata 1 ── n bollettini_righe
ordini_fornitore_testata 1 ── n ordini_fornitore_documenti (fatture e note di credito, §4.2.7.1) 1 ── 0..1 provvigioni_correzioni (§4.2.7.2)
interscambio (cliente_piva, fornitore_id) → ordini_fornitore_testata (cliente_piva, fornitore_id)
interscambio (fornitore_id, codice_cliente_fornitore) → ordini_fornitore_testata (cliente_piva, fornitore_id)
ordini_cliente_testata 1 ── 0..n ordini_fornitore_testata (via ordine_cliente_id, ponte §4.1)
users 1 ── n eventi_app  (audit append-only, §15)
```

### 4.4 Note di schema

- **Vendita diretta**: `ordini_cliente_testata 1 ── n ordini_cliente_esportazioni`,
  `ordini_cliente_testata 1 ── n impegni_giacenza`, `codici_alias` e `kit_*` riferiscono
  `articoli` per codice (testo, non FK: un codice nuovo può arrivare dalla
  sincronizzazione dopo la creazione dell'alias).

- `interscambio.discount` è il **campo canonico** dello sconto cliente su fornitore
  (§5.7) e determina lo scaglione; `fornitori.discount` ne è solo un default ridondante.
- **Abbinamento dei documenti del fornitore**: la conferma e la fattura riportano il
  *codice cliente del fornitore*, non la P.IVA. `interscambio.codice_cliente_fornitore`
  fa da traduzione verso `cliente_piva`: in arrivo documento il sistema risolve
  `fornitore_id + codice_cliente_fornitore → cliente_piva` e propone la pratica
  corrispondente; se il codice non è valorizzato l'abbinamento resta manuale
  (confermato dall'operatore, §6.1).
- `conferma_scadenza` viene valorizzata automaticamente alla creazione della pratica
  con `data_ordine + giorni_attesa_conferma` (§6.1).
- Le percentuali hanno una data di validità (`provvigioni_scaglioni.valido_dal`, D-25); in
  più i valori calcolati si congelano su `bollettini_righe` alla verifica (§5.11).
- Le **righe per fase** (`ordini_fornitore_righe.fase`) non si sovrascrivono: conservano
  la fotografia di ordine, conferma e fattura, così il confronto fra fasi resta
  ispezionabile a posteriori (§5.8, §7.3).
- Gli **importi delle provvigioni** si calcolano sul **netto documenti** della pratica
  (§4.2.7.1, §5.3): le note di credito riducono l'imponibile senza generare pratiche a sé.

### 4.5 Sincronizzazione da Integra

| Dato | Vista su Integra (schema `crm_viste`) | Ogni | Note |
|---|---|---|---|
| Clienti | `v_clienti` (P.IVA, ragione sociale, indirizzo, codice cliente) | 60 s | un cliente senza P.IVA valida è segnalato in Stato del sistema |
| Fornitori | `v_fornitori` (P.IVA, ragione sociale, paese, codice fornitore) | 60 s | |
| Articoli (ampliamento §17) | `v_articoli` (codice, descrizione, EAN, UM, attivo) | 60 s | |
| Giacenze (ampliamento §17) | `v_giacenze` (codice, quantità) | 15 s | la più frequente: serve al disponibile |
| Ordini registrati (ampliamento §17) | `v_ordini_registrati` (numero, codice cliente, data) | 60 s | chiude gli impegni (§4.2.16) |

- **In questa fase** si sincronizzano solo **clienti e fornitori** (piano F1-A4); articoli,
  giacenze e ordini registrati arrivano con l'ampliamento (§17).
- **Accesso**: utente del database **in sola lettura** (`crm_lettura`), solo sulle viste;
  le viste le crea chi gestisce Integra. Parametri in Impostazioni → Sincronizzazione da
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
(`interscambio.discount`): lo sconto cade in uno scaglione della tabella
`provvigioni_scaglioni` del fornitore, che definisce `pct_agente` e `pct_subagente`.

### 5.2 Eccezioni per singolo subagente

Le eccezioni sono **rarissime**: tutti i subagenti hanno la stessa provvigione. Se
esiste una `provvigioni_eccezioni` per lo scaglione/subagente, `pct_override` vince sulla
percentuale standard. Si inseriscono nel CRM dalla scheda del subagente (§7.5) e il motore
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

### 5.4 Agente unico: Decobrands SRL

L'agente operativo è **uno solo**. Schwarzmeier e Monzani sono storici (ex-socio di Marco)
e non entrano nella liquidazione attuale; restano in anagrafica per non perdere il
dato storico.

### 5.5 Maturazione: maturato vs fatturato (per fornitore)

Alcuni fornitori pagano sul **maturato** (quando incassano dai clienti), altri sul
**fatturato** (all'emissione della fattura). Il criterio è **informazione del fornitore**
(`payment_type`) e si applica coerentemente sia a ciò che incassa Decobrands sia a ciò
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
completi) e si riflette in `interscambio` (`cliente_piva`, `fornitore_id`, `discount`).
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
(`att_filename_*`). Tutti i flussi sotto usano questo canale.

### 6.1 Flusso documentale: ordine → conferma → fattura

```
[1] Ordine  ──carica documento + dati letti──►  pratica in stato "inviato"
[2] Conferma ──aggancio alla pratica──►  stato "confermato"  (quantità/importi possono variare)
[3] Fattura  ──aggancio alla pratica──►  stato "fatturato"   → entra nel calcolo provvigioni
[4] Nota di credito ──documento agganciato alla fattura──►  riduce l'imponibile (totale/parziale)
```

- La pratica può essere agganciata all'**ordine cliente di origine** via
  `ordine_cliente_id` (§4.1): la tracciabilità parte dall'ordine ricevuto dal cliente.
- Ogni fase include **upload del documento PDF** allegato alla pratica
  (`att_filename_ordine` / `att_filename_conferma` / `att_filename_fattura`); fatture e
  note di credito vivono in `ordini_fornitore_documenti` con il proprio allegato (§4.2.7.1).
- **Variazioni di composizione**: a ogni cambio di fase le righe vengono fotografate
  (`fase`, §4.2.8); il confronto fra ordine, conferma e fattura è calcolato a runtime e
  gli scostamenti (articoli aggiunti/tolti, quantità, prezzi) finiscono fra le
  **segnalazioni** (§5.8, §5.12, §7.3).
- Alla creazione della pratica si calcola `conferma_scadenza = data_ordine +
  giorni_attesa_conferma` del fornitore.
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

- **Fornitori**: CRUD + `payment_type` (§5.5) + giorni attesa + scaglioni provvigione.
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
   legge la casella con `imapflow` e salva gli allegati PDF/Excel; il caricamento
   manuale (trascinamento o "Carica documenti") scrive nella stessa tabella. Lo
   `file_hash` scarta i doppioni.
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
| 1 | `/login`, `/cambia-password`, `/richiedi-reset`, `/reset-password` | Credenziali (condivise con la Gestione Ordini) |
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
| 12 | `/eventi` | Registro eventi (amministratore, §7.11) |
| — | `/ordini-cliente`, `/articoli`, `/giacenze`, `/alias-kit` | Vendita diretta: spenta, ampliamento futuro (§17) |

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

### 7.2 Elenco ordini fornitore (`/ordini-fornitore`)

- Filtri: stato (segmenti con i conteggi calcolati sugli altri filtri, §16.4.2), testo
  libero (numero ordine, cliente, fornitore, documento), **fornitore, cliente, subagente**
  (filtri standard a selezione multipla, §16.4.1), riepilogo dei filtri. Paginazione.
- Colonna con n° righe; accesso al dettaglio.
- **Flag variazioni**: le pratiche con scostamenti di composizione fra fasi o con note di
  credito mostrano un badge, così l'operatore le individua subito (§5.8).

### 7.3 Dettaglio pratica (`/ordini-fornitore/:id`)

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
  *Nessuna segnalazione* grigio), da dove viene (bollettino di …, segnalata dal fornitore)
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
  arriva il bollettino** (§5.6), `payment_type` (maturato/fatturato), **giorni per
  l'incasso dal cliente** (`giorni_incasso`, iniziale 60, §5.14), note, attivo. Nei dati
  del fornitore la riga *Pagamento provvigioni* spiega la regola (sul maturato:
  riconosciute nel mese in cui il cliente paga, incasso da verificare dopo N giorni).
- Sotto i dati del fornitore due **schede**: **Percentuali** (in vigore da una data, con
  *Nuove percentuali da una data* e le versioni) e **Clienti seguiti** in sola lettura
  (vista inversa delle agenzie, §7.6); ogni scheda ha la sua tabella che riempie lo spazio.
- Dettaglio con **tabella scaglioni** (sconto, % a Decobrands, % al subagente con le
  eccezioni personali sotto, totale dal fornitore, clienti); le percentuali non si
  modificano: si crea una nuova versione con *Nuove percentuali da una data* (§5.11, D-25).

### 7.5 Subagenti (`/subagenti`, `/subagenti/:id`)

- L'agente è uno solo, Decobrands SRL (§5.4): non ha una pagina.
- **Elenco** (sinistra): subagente con email, clienti seguiti, liquidabile e in attesa nel
  trimestre in corso; *Nuovo subagente*.
- **Scheda** (destra): dati, *Modifica*, *Elimina* (solo senza clienti né provvigioni,
  altrimenti *Rendi non attivo*), *Vedi la liquidazione*; clienti seguiti con la sua %.
- **Eccezioni personali** (D-26): elenco (fornitore, sconto, data delle percentuali, sua %
  invece della standard) e *Aggiungi eccezione*. La finestra chiede fornitore (campo di
  ricerca), sconto (dagli scaglioni del fornitore) e % al subagente (0–100); clic su
  un'eccezione la modifica o la elimina. Controlli: fornitore esistente, percentuale fra 0
  e 100, un'eccezione per subagente e scaglione. Permesso `anagrafiche` (§8.3).

### 7.6 Clienti e agenzie (`/clienti`, `/clienti/:piva`)

Il focus è sul **cliente** (anagrafica Decobrands da Integra); le righe di `interscambio`
sono le sue **agenzie**: i fornitori per cui Decobrands fa da agente verso quel cliente.

- **Elenco** (sinistra): ricerca per nome, P.IVA, codice Integra o codice cliente del
  fornitore; segmenti *Tutti · Con agenzie · Senza agenzie · Vendita diretta*; colonne
  cliente (con città e codice Integra), n° agenzie, pratiche aperte.
- **Scheda** (destra): anagrafica in **sola lettura** con la nota "anagrafica da Integra";
  sotto, due **schede** (un cliente può avere molte agenzie e molte pratiche; si ricorda
  l'ultima aperta):
  - **Agenzie** (scheda principale; contatore giallo se manca un codice cliente): ricerca
    per fornitore, codice o subagente, *Aggiungi agenzia*; colonne fornitore, codice
    cliente del fornitore, seguito da, provvigione totale con quota del subagente e
    sconto, pratiche aperte con quel fornitore. Clic su una riga apre la modifica, con
    *Elimina*. Il cliente è fisso; fornitore e subagente sono campi di ricerca (§16.4); gli
    sconti proposti seguono gli scaglioni del fornitore scelto. In più (D-27): *Al
    subagente per questo cliente %* (vuoto = quella dello scaglione) e *Provvigione al
    subagente* (*Su ogni fattura* · *Una fattura al mese: la prima* · *Una fattura al mese:
    la più alta*); la colonna provvigione mostra "(del cliente)" e "una fattura al mese".
    Vincoli: un solo subagente per cliente × fornitore (§5.10), codice unico per fornitore,
    percentuale fra 0 e 100.
  - **Pratiche** (meno usata, con filtro): segmenti *Aperte · In ritardo · Fatturate ·
    Non pagate · Tutte* (iniziale *Aperte*; *Non pagate* = pratiche con una fattura non
    pagata o da verificare, §5.14; numeri dei segmenti calcolati con gli altri filtri,
    §16.4.2), fornitore (filtro standard a selezione multipla, §16.4.1), ricerca per
    numero, riepilogo dei filtri; colonne pratica,
    fornitore, data, importo, stato; clic apre la pratica; nel piede le provvigioni ai
    subagenti del trimestre.
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
    per periodo e fornitore (`GET /api/bollettini/matrice?da=2026-04&a=2026-09&fornitore=`);
    "mesi con dati" = dal mese del primo bollettino registrato al mese in corso.
  - **Perché**: con più di 6 colonne la matrice non entra in larghezza e le celle (stato e
    importo) diventano illeggibili, con meno si spreca spazio; una tendina con tutti i mesi
    dopo qualche anno diventerebbe lunghissima, mentre anno + griglia dei mesi resta
    compatta; con 10 o più fornitori serve isolare quello di cui si parla al telefono o chi
    ha qualcosa da fare.
- Dettaglio: righe con fattura, cliente, merce, riconosciuto/calcolato e `differenza`
  evidenziata; azioni: aggiungi/elimina riga, **conferma importo fornitore o modifica
  manuale** (§5.13), passa a `verificato`/`contestato`.
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
rotte `#/percorso`. A sinistra c'è la **barra laterale**, con le voci raggruppate per
frequenza di lavoro; il gruppo *Gestione* si può chiudere. Il dato che collega tutta
l'applicazione è l'**ordine a fornitore** (la pratica). Tutti i documenti entrano dal
canale comune di ingresso documenti del CRM (§6.5).

```
Barra laterale                         Rotte
├── Carica documenti (sempre visibile) → apre la scelta dei file, poi Documenti
├── Ogni giorno
│   ├── Oggi                           #/                       cose da fare per gruppi, scadenze
│   ├── Documenti                      #/documenti/:id          controlla, correggi, abbina, scarta
│   └── Pratiche                       #/pratiche/:id           riepilogo · righe a confronto
├── Ogni mese
│   └── Bollettini                     #/bollettini/:id         matrice 6 mesi → riconciliazione
├── Ogni trimestre
│   ├── Liquidazioni                   #/liquidazioni/:anno/:t  documenti · report subagenti
│   └── Analisi                        #/analisi                BI con filtri ed esportazione
├── Vendita diretta (spenta, §17)
├── Anagrafiche
│   ├── Fornitori                      #/fornitori/:id          percentuali · clienti seguiti
│   ├── Subagenti                      #/subagenti/:id
│   └── Clienti                        #/clienti/:piva          agenzie · pratiche
└── Gestione (richiudibile)
    ├── Utenti e ruoli                 #/utenti/:id
    ├── Stato del sistema              #/sistema
    ├── Impostazioni                   #/impostazioni/:sezione
    ├── Documenti scartati             #/scartati
    └── Guida                          #/guida/:argomento
```

Considerazioni:

- **Navigazione**:
  - ogni pagina ha una testata con *‹ Torna a …*, il titolo, le azioni e *Guida*;
  - si torna sempre alla schermata precedente nello stesso punto (§7.12);
  - le pagine di dettaglio non hanno il percorso "Pratiche › …" (D-12);
  - i contatori della barra laterale (Oggi, Documenti, Pratiche, Bollettini) seguono i
    dati (§16.4.2).
- **Utente**: in fondo alla barra laterale ci sono l'utente e il ruolo. Nel prototipo *Prova
  come* cambia utente, *Ripristina i dati di prova* riporta i dati all'inizio e la data di
  lavoro è simulata (04/09/2026). In esercizio (V3) l'accesso usa la tabella `users`
  (§3.3).
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

### 7.11 Log eventi applicativi (`/eventi`)

- **Sola lettura, admin**: nessuna modifica/eliminazione di eventi; accesso con ruolo
  `admin` (§3.3).
- **Filtri**: tipo evento, entità, utente, periodo (da/a), esito; filtro rapido
  "solo errori".
- **Tabella** (contenitore stabile V9): data/ora, utente, tipo, entità, riferimento
  (es. pratica/bollettino), esito; intestazione fissa, scroll interno, paginazione.
- **Dettaglio evento** in modale: JSON `dettaglio` formattato (diff `prima`/`dopo`,
  nuovo stato, riferimento documento / `documenti_in_arrivo`).
- **Export CSV** del log filtrato (§8.1).
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

### 7.13 Utenti e ruoli (`/utenti`, `/utenti/:id`) — solo amministratore

- Gli **utenti sono quelli della Gestione Ordini** (tabella `users` condivisa, stesse
  credenziali); il **ruolo nel CRM** è proprio (`crm_ruoli_utente`, §4.1).
- **Elenco** (sinistra): ricerca per nome, utente o email; segmenti *Attivi · Disattivati ·
  Tutti*; colonne utente (con nome utente ed email), ruolo, ultimo accesso.
- **Scheda** (destra): nome utente, email, ruolo, stato, ultimo accesso, stato della
  password (da cambiare al prossimo accesso), **ultimo invio password con eventuale
  errore di recapito**; azioni *Modifica*, *Invia nuova password*, *Disattiva/Riattiva*,
  *Elimina*.
- La scheda ha due **schede**: *Dati dell'utente* e **Cosa può fare ogni ruolo** (tabella
  attività × ruoli, la stessa di §8.3, con la colonna del ruolo dell'utente evidenziata).
- *Nuovo utente*: nome, nome utente (non modificabile dopo), email, ruolo; parte l'email
  con la password temporanea da cambiare al primo accesso (`must_change_password`).
- **Vincoli**: nome utente ed email unici; **deve restare almeno un amministratore
  attivo**; nessuno può cambiare il proprio ruolo, disattivarsi o eliminarsi; l'**utente
  dei servizi automatici** non si modifica e non accede all'app; eliminare un utente che
  ha già usato l'app chiede conferma e suggerisce di disattivarlo (il nome resta nel
  registro eventi). Un invio non recapitato crea un problema in §7.14.

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
- Sostituisce la pagina "Errori" della Gestione Ordini per il CRM.

#### 7.14.1 Da dove vengono i dati: cosa scrive ogni servizio

Tutti i servizi girano nel server del CRM come **lavori pianificati** (stessa coda dei
lavori di §6.5) e scrivono in `servizi_esecuzioni` / `servizi_problemi` (§4.2.15). Oltre
al lavoro vero, ogni servizio ha un **controllo di salute** ogni 5 minuti, così si sa se
funziona anche quando non c'è nulla da fare.

| Servizio | Lavoro (`tipo = lavoro`) | Controllo di salute (`tipo = controllo`) | Misure registrate |
|---|---|---|---|
| **Casella dei documenti** (`casella`) | ogni N minuti (Impostazioni → Casella): legge le email nuove della cartella, salva gli allegati PDF/Excel in `documenti_in_arrivo`, sposta le email lette (§6.5 punti 1–2) | accesso IMAP e presenza delle due cartelle | email, allegati presi, allegati ignorati |
| **Server di lettura** (`lettura`) | a ogni documento: invio a GLM-OCR, risposta, campi letti (§6.5 punti 3–4) | chiamata di prova al servizio (`/health` o modello caricato) e tempo di risposta | pagine, secondi, secondi per pagina, documento |
| **Sincronizzazione da Integra** (`integra`) | ogni 60 s per le anagrafiche (§4.5); una riga per giro con il riepilogo di tutte le viste | connessione al database e lettura di una riga per vista | per vista: righe lette, aggiornate, scartate |
| **Posta in uscita** (`posta`) | a ogni invio (password, solleciti se inviati dal CRM) | accesso SMTP senza inviare | destinatario, codice di risposta del server |

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
(il messaggio tecnico va in `servizi_esecuzioni.misure`).

#### 7.14.4 Vita di un problema

1. **Si apre**: se non c'è già un problema aperto con lo stesso `servizio + codice +
   chiave`, se ne crea uno (`primo = ultimo = adesso`, `volte = 1`).
2. **Si ripete**: se c'è, si aggiornano `ultimo` e `volte` e si **azzera `visto_il`** solo
   se il livello è `errore` (un errore che torna va rivisto).
3. **Si chiude da solo** quando la causa sparisce (colonna "si chiude da solo" di §7.14.3):
   `chiuso_il = adesso`; resta in *Tutti* con *Risolto il …* e non conta più nella barra.
4. **Visto**: *Segna come visto* toglie il problema dal contatore della barra ma non lo
   chiude; un problema visto e ancora aperto continua a colorare il riquadro.
5. Ogni apertura e chiusura di un problema di livello `errore` scrive anche un evento
   (§15.2.7).

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
| Sincronizzazione da Integra | server del database, nome del database, utente in sola lettura, password, schema delle viste, ogni quanti secondi (anagrafiche, 10–3600), ogni quanti secondi le giacenze (5–600, solo con l'ampliamento §17) (§4.5) |
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
- vista `v_analisi_documenti`;
- `GET /api/analisi?da=&a=&fornitore=&subagente=&cliente=`;
- le aggregazioni si fanno sul server; il client riceve fatti già filtrati per periodo.

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
- API: `fornitore`, `subagente`, `cliente` accettano più valori separati da virgola.

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

#### Esporta

Il pulsante apre una finestra in cui si sceglie il formato:

| Formato | Contenuto |
|---|---|
| **Excel** | foglio *Riepilogo* (4 numeri con periodo precedente e variazione, i 4 grafici come immagini); fogli *Per subagente*, *Per fornitore*, *Per cliente*, *Per mese* con totali a formule; foglio *Documenti*. Intestazione con periodo e filtri |
| **PDF** | stesso contenuto e stessa impaginazione dell'Excel |
| **CSV** | l'elenco dei documenti filtrati, separatore `;` |

- Il modello è lo stesso della liquidazione (§11): fogli → blocchi, con in più il blocco
  *immagine* per i grafici.
- Nell'app i grafici si generano sul server (stessa configurazione Chart.js) oppure arrivano
  dal client come PNG.

#### Ruoli

Tutti consultano ed esportano, anche il ruolo *sola lettura* (D-05).

#### Perché

- La sintesi nella liquidazione era legata al trimestre. Per capire l'andamento, la
  produttività dei subagenti e il peso dei fornitori servono periodi liberi, filtri
  combinabili ed esportazione (D-18).
- La competenza per data del documento rende i numeri stabili: non cambiano quando arriva un
  bollettino o uno storno (D-19).

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
| POST | `/api/fornitori` | crea fornitore |
| PUT | `/api/fornitori/:id` | aggiorna fornitore |
| POST | `/api/fornitori/:id/percentuali` | nuova versione delle percentuali da una data: `{valido_dal, scaglioni: [{sconto, pct_agente, pct_subagente}]}`; copia le eccezioni sulla nuova versione (§5.11, D-25) |
| POST | `/api/eccezioni` | nuova eccezione personale `{subagente_id, fornitore_id, sconto, pct_override}` sullo scaglione in vigore (§5.2, D-26) |
| PUT · DELETE | `/api/eccezioni/:id` | modifica · elimina eccezione |
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
| POST/PUT/DELETE | `/api/ordini-fornitore/:id/documenti(/:did)` | documenti fiscali: fatture e note di credito (§4.2.7.1) |
| GET | `/bollettini` · `/bollettini/:id` | elenco / dettaglio bollettini |
| POST | `/api/bollettini` | crea bollettino |
| PUT | `/api/bollettini/:id` | aggiorna stato/note |
| POST | `/api/bollettini/:id/righe` | aggiunge riga (calcolo atteso + differenza) |
| DELETE | `/api/bollettini/:id/righe/:rid` | elimina riga |
| GET | `/liquidazioni/:anno/:t` | liquidazione del trimestre |
| GET | `/api/liquidazione/export?anno&trimestre&scelta=tutto\|uno\|riepilogo&subagente&formato=xlsx\|pdf\|csv` | file Excel della liquidazione (§11) |
| GET | `/documenti` · `/api/documenti` | ingresso documenti: elenco da controllare (§7.9) |
| POST | `/api/documenti/carica` | caricamento manuale (uno o più file) → coda |
| GET | `/api/documenti/:id` · `/api/documenti/:id/file` | dati letti con affidabilità e posizioni · file originale |
| PUT | `/api/documenti/:id` | correzione dei dati letti (campi verificati) |
| POST | `/api/documenti/:id/abbina` · `/apri-pratica` · `/registra-bollettino` | esito del controllo |
| POST | `/api/documenti/:id/scarta` · `/rileggi` | scarto · nuova lettura |
| GET | `/eventi` | log eventi applicativi (admin) |
| GET · POST | `/api/sistema*` | Stato del sistema, vedi §7.14.5 |
| GET | `/api/eventi` | elenco eventi filtrato (admin) |
| GET | `/api/eventi/:id` | dettaglio evento (admin) |
| GET | `/api/eventi/export` | export CSV del log filtrato (admin) |

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

`/login` (POST), `/logout` (POST), `/cambia-password`, `/richiedi-reset`,
`/reset-password` (stessi della Gestione Ordini). Guard `requireAuth` su tutte le
rotte; ogni rotta dichiara il **permesso** richiesto, verificato lato server
(`requirePermesso('modifica')` ecc.), non solo nascondendo i pulsanti.

**Ruoli del CRM** (`crm_ruoli_utente`, §4.1):

| Attività (permesso) | Amministratore | Operatore | Sola lettura |
|---|:-:|:-:|:-:|
| Consultare pratiche, documenti, bollettini, liquidazioni e anagrafiche (`consulta`) | ✓ | ✓ | ✓ |
| Esportare le liquidazioni in Excel, PDF, CSV (`esporta`) | ✓ | ✓ | ✓ |
| Caricare, correggere e abbinare documenti; verificare bollettini; preparare solleciti (`modifica`) | ✓ | ✓ | — |
| Condizioni e percentuali dei fornitori, agenzie dei clienti, subagenti ed eccezioni personali (`anagrafiche`) | ✓ | ✓ | — |
| Chiudere la liquidazione del trimestre (`chiudi`) | ✓ | ✓ | — |
| Vedere e recuperare i documenti scartati (`scartati`) | ✓ | ✓ | — |
| Stato del sistema, segnare i problemi come visti (`sistema`) | ✓ | ✓ | — |
| Alias e kit: creare, modificare, eliminare (`magazzino`, ampliamento §17) | ✓ | — | — |
| Utenti e ruoli, impostazioni, eliminazione definitiva degli scartati (`gestione`) | ✓ | — | — |

**Sola lettura** nell'interfaccia: fascia "Profilo in sola lettura: puoi consultare ed
esportare, non modificare"; caricamento nascosto; pulsanti che modificano spenti
(restano attivi solo quelli consentiti: esporta, guida, navigazione); le pagine non
permesse mostrano "Pagina riservata" e non compaiono nella barra. Il gruppo **Gestione**
della barra è richiudibile, aperto solo nelle sue pagine, con il contatore dei problemi.

---

## 9. Stati della pratica

| Stato | Transizione | Condizioni |
|-------|-------------|------------|
| `inviato` | creazione pratica | ordine caricato |
| `confermato` | upload/aggancio conferma | la conferma può variare quantità/importi (§5.8) |
| `fatturato` | upload/aggancio fattura | entra nel calcolo provvigioni |

Al passaggio a `fatturato` la pratica diventa eleggibile per la liquidazione (§10) e per
il confronto del bollettino (§6.2).

---

## 10. Calcolo delle provvigioni — formulario

La provvigione si calcola **per documento fiscale** (fattura o nota di credito) della
pratica, mai sull'ordine o sulla conferma (§5.8): la base è l'imponibile del documento e la
somma dei documenti è il netto della pratica (§4.2.7.1, §5.3).

```
Per ogni documento d della pratica (fattura > 0, nota di credito < 0):
  versione  = scaglioni del fornitore con valido_dal ≤ d.data, la più recente (§5.11)
  scaglione = sconto del cliente sul fornitore (interscambio.discount) ∈ [sconto_min, sconto_max]
  pct_agente, pct_subagente dello scaglione
    (pct_override da provvigioni_eccezioni del subagente su quello scaglione, se presente, §5.2)

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

---

## 12. Dati di esempio (seed)

Anagrafiche di riferimento per il collaudo:

- **Fornitore**: Gries con scaglioni 0/1/5/10/100 % (§4.2.2).
- **Agente**: Decobrands SRL (unico attivo).
- **Subagenti**: Bastasin, Nista (es. eccezione Bastasin `3` sullo scaglione 1 %).
- **Interscambio**: cliente con codice cliente del fornitore + sconto (`discount`).
- **Pratiche**: esempi negli stati `inviato`, `confermato`, `fatturato`; un ordine con
  **conferma ridotta** (7/10 articoli, righe `fase=conferma`) per validare §5.8; una
  pratica **fatturata in più tranche** e una con **nota di credito parziale**
  (documento `nota_credito`, importo negativo, §5.3/§5.9) per validare il confronto fasi
  e il netto documenti.
- **Eventi**: esempi di `eventi_app` coerenti con i dati sopra (login admin, creazione
  fornitore, modifica scaglione, cambio stato pratica, verifica bollettino, export
  liquidazione) + **un evento di tipo `errore`** per collaudare filtri e dettaglio
  della schermata `/eventi` (§7.11, §15).

---

## 13. Casi limite e domande residue (backlog)

| # | Argomento | Nota |
|---|-----------|------|
| B1 | ~~Gestione UI delle `provvigioni_eccezioni`~~ | chiuso: le eccezioni si inseriscono dalla scheda del subagente (§7.5, D-26); resta da chiarire la regola "una fattura al mese" dei clienti con sconto fittizio (§5.2) |
| B2 | Riga bollettino con solo totale cliente | supportare riga aggregata (cliente + totale) nel confronto |
| B3 | ~~Versioning scaglioni per periodo~~ | chiuso: percentuali con data di validità (§4.2.2, §5.11, D-25) |
| B4 | Consolidamento sconto | `interscambio.discount` resta il campo canonico (§5.7); `fornitori.discount` è un semplice default |
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

## 15. Tracciamento eventi applicativi, CRUD ed errori

### 15.1 Principi

L'applicazione registra su una tabella **append-only** (`eventi_app`, §4.2.11) gli
eventi applicativi: operazioni CRUD, cambi di stato, upload/export di documenti,
autenticazione ed errori. Scopo: tracciabilità (chi/cosa/quando), storico di pratiche
e bollettini, diagnosi degli errori.

- **Scrittura automatica server-side**: ogni operazione di scrittura sulle tabelle
  CRM, ogni cambio di stato, ogni upload/export e ogni evento di autenticazione
  produce una riga in `eventi_app`. La scrittura avviene nel **service layer**,
  mai fidandosi di ciò che dichiara il client.
- **Nessuna modifica alle tabelle esistenti** (V2): `eventi_app` è una tabella nuova
  del CRM; gli errori di lettura documenti restano in `documenti_in_arrivo` (§4.2.12)
  e vengono solo **referenziati** dagli eventi, non duplicati.
- **Solo lettura per l'utente**: gli eventi non si modificano e non si eliminano
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
| POST `/login` riuscita | `auth` | `login` | `utente` | `successo` | `{etichetta, sessione_id}` |
| POST `/login` fallita (password errata o utente inesistente) | `auth` | `login` | `utente` | `errore` | `{etichetta: utente tentato, motivo}` (`utente_id` solo se l'account esiste; `ip` sempre) |
| POST `/logout` | `auth` | `logout` | `utente` | `successo` | `{etichetta, sessione_id}` |
| POST `/cambia-password` | `auth` | `change_password` | `utente` | `successo` | `{etichetta}` (esito `errore` se la richiesta fallisce) |
| POST `/richiedi-reset` | `auth` | `reset_requested` | `utente` | `successo` | `{etichetta}` |
| Richiesta a rotta `requireAdmin` senza il ruolo (§3.3) | `auth` | `access_denied` | `utente` | `negato` | `{etichetta, rotta, metodo}` (`ip` valorizzato) |

#### 15.2.2 Anagrafiche — fornitori, percentuali ed eccezioni (§8.1)

| Operazione (API) | `tipo` | `azione` | `entita` | `esito` | `dettaglio` |
|------------------|--------|----------|----------|---------|-------------|
| POST `/api/fornitori` | `crud` | `create` | `fornitore` | `successo` | `{etichetta: ragione_sociale, p_iva, giorni_attesa_conferma, giorno_bollettino, payment_type, attivo}` |
| PUT `/api/fornitori/:id` | `crud` | `update` | `fornitore` | `successo` | `{etichetta, prima: {…campi cambiati}, dopo: {…}}` |
| POST `/api/fornitori/:id/percentuali` | `crud` | `create` | `scaglione` | `successo` | `{etichetta: fornitore · dal valido_dal, fornitore_id, valido_dal, scaglioni: [{sconto_min, sconto_max, pct_agente, pct_subagente}], eccezioni_copiate}` (un evento per versione, non per scaglione) |
| POST `/api/eccezioni` | `crud` | `create` | `eccezione` | `successo` | `{etichetta: subagente · fornitore sconto, subagente_id, scaglione_id, pct_override}` |
| PUT `/api/eccezioni/:id` | `crud` | `update` | `eccezione` | `successo` | `{etichetta, prima, dopo}` |
| DELETE `/api/eccezioni/:id` | `crud` | `delete` | `eccezione` | `successo` | `{etichetta, eccezione_id, subagente_id, scaglione_id, pct_override}` |

> Il fornitore **non si elimina** via API: si disattiva con `attivo=false`
> (evento `crud/update`).

#### 15.2.3 Anagrafiche — agenti, subagenti, interscambio (§8.1)

| Operazione (API) | `tipo` | `azione` | `entita` | `esito` | `dettaglio` |
|------------------|--------|----------|----------|---------|-------------|
| create/update/delete agente | `crud` | `create`/`update`/`delete` | `agente` | `successo` | create/delete: `{etichetta: cognome, nome}`; update: `{etichetta, prima, dopo}` |
| create/update/delete subagente | `crud` | `create`/`update`/`delete` | `subagente` | `successo` | come agente (create include `agente_id`) |
| POST `/api/interscambio` | `crud` | `create` | `interscambio` | `successo` | `{etichetta: cliente_piva · fornitore, subagente_id, cliente_piva, fornitore_id, codice_cliente_fornitore, discount}` |
| PUT `/api/interscambio/:id` | `crud` | `update` | `interscambio` | `successo` | `{etichetta, prima, dopo}` (comprende `pct_subagente` e `regola_mensile`) |
| PUT `/api/documenti-fiscali/:id/correzione` | `crud` | `create` · `update` | `correzione` | `successo` | `{etichetta: numero · subagente, documento_id, prima, dopo: {tipo, valore, motivo}}` |
| DELETE `/api/documenti-fiscali/:id/correzione` | `crud` | `delete` | `correzione` | `successo` | `{etichetta, documento_id, tipo, valore, motivo}` |
| DELETE `/api/interscambio/:id` | `crud` | `delete` | `interscambio` | `successo` | `{etichetta, interscambio_id, subagente_id, cliente_piva, fornitore_id, codice_cliente_fornitore, discount}` |

#### 15.2.4 Pratiche ordine a fornitore (§8.1)

| Operazione (API) | `tipo` | `azione` | `entita` | `esito` | `dettaglio` |
|------------------|--------|----------|----------|---------|-------------|
| POST `/api/ordini-fornitore` | `crud` | `create` | `pratica` | `successo` | `{etichetta: numero_ordine, fornitore_id, cliente_piva, ordine_cliente_id, agente_id, importo_merce, stato}` |
| PUT `/api/ordini-fornitore/:id` **senza** cambio stato | `crud` | `update` | `pratica` | `successo` | `{etichetta, prima, dopo}` (lo `stato` è **escluso** dal diff) |
| PUT `/api/ordini-fornitore/:id` **con** cambio stato | `stato` | `change_state` | `pratica` | `successo` | `{etichetta, prima: {stato}, dopo: {stato}, motivo: note}`; se il cambio salva le righe della nuova fase, anche `{da_fase, a_fase, n_righe, importo, scostamento_vs_fase_precedente}` |
| PUT con **entrambi** (cambio stato + altri campi) | `crud`+`stato` | `update`+`change_state` | `pratica` | `successo` | **due eventi separati**, come da righe precedenti |
| POST `/api/ordini-fornitore/:id/righe` | `crud` | `create` | `riga_pratica` | `successo` | `{etichetta: codice · descrizione, pratica_id, riga_numero, codice, descrizione, quantita, prezzo, importo}` |
| DELETE `/api/ordini-fornitore/:id/righe/:rid` | `crud` | `delete` | `riga_pratica` | `successo` | `{etichetta, riga_pratica_id, pratica_id, codice, descrizione}` |
| DELETE `/api/ordini-fornitore/:id` | `crud` | `delete` | `pratica` | `successo` | `{etichetta: numero_ordine, pratica_id, fornitore_id, cliente_piva, importo_merce, stato}` |
| POST `/api/ordini-fornitore/:id/upload` (ordine/conferma/fattura) | `documento` | `upload` | `pratica` | `successo` | `{etichetta, pratica_id, fase, att_filename, dimensione}` |
| lettura con esito negativo (GLM-OCR non riuscita dopo 3 tentativi, §6.5) | `documento` | `upload` | `documento` | `errore` | `{etichetta, documento_id, file_nome, tentativi, errore}` |
| correzione dati letti (§6.5) | `documento` | `update` | `documento` | `successo` | `{etichetta, documento_id, campi_corretti, livello_prima, livello_dopo}` |
| abbinamento / nuova pratica / registrazione bollettino | `documento` | `change_state` | `documento` | `successo` | `{etichetta, documento_id, pratica_id \| bollettino_id}` |
| POST `/api/ordini-fornitore/:id/documenti` (fattura/nota di credito, §4.2.7.1) | `documento` | `create` | `documento` | `successo` | `{etichetta: numero · tipo, pratica_id, documento_id, tipo, numero, data, importo, storno_totale, fattura_riferimento}` |
| PUT `/api/ordini-fornitore/:id/documenti/:did` | `documento` | `update` | `documento` | `successo` | `{etichetta, documento_id, pratica_id, prima, dopo}` |
| DELETE `/api/ordini-fornitore/:id/documenti/:did` | `documento` | `delete` | `documento` | `successo` | `{etichetta, documento_id, pratica_id, tipo, numero, importo}` |
| PUT che fa avanzare di fase le righe (ordine→conferma→fattura, §5.8) | `stato` | `change_state` | `pratica` | `successo` | **nessun evento in più**: la fotografia delle righe è parte del cambio di stato; il dettaglio dell'evento `stato/change_state` della riga sopra aggiunge `{da_fase, a_fase, n_righe, importo, scostamento_vs_fase_precedente}`. **Perché**: l'elenco delle azioni (§4.2.11) è chiuso e il catalogo vuole una riga per operazione |

#### 15.2.5 Bollettini e righe bollettino (§8.1)

| Operazione (API) | `tipo` | `azione` | `entita` | `esito` | `dettaglio` |
|------------------|--------|----------|----------|---------|-------------|
| POST `/api/bollettini` | `crud` | `create` | `bollettino` | `successo` | `{etichetta: mese/anno · fornitore, fornitore_id, mese, anno, att_filename}` |
| PUT `/api/bollettini/:id` (dati/note, **senza** cambio stato) | `crud` | `update` | `bollettino` | `successo` | `{etichetta, prima, dopo}` |
| PUT `/api/bollettini/:id` **con** cambio stato (`da_verificare → verificato`/`contestato`) | `stato` | `change_state` | `bollettino` | `successo` | `{etichetta, prima: {stato}, dopo: {stato}, motivo: note}` |
| **Verifica** del bollettino (conferma importi, congelamento % e importi §5.11) | `calcolo` | `verify` | `bollettino` | `successo` | `{etichetta, bollettino_id, periodo: {mese, anno}, importo_riconosciuto, importo_calcolato, differenza_totale}` |
| POST `/api/bollettini/:id/righe` | `crud` | `create` | `riga_bollettino` | `successo` | `{etichetta: fattura_numero · cliente_piva, bollettino_id, fattura_numero, fattura_data, cliente_piva, importo_merce, pct_riconosciuta, importo_riconosciuto, pct_calcolata, importo_calcolato, differenza}` |
| DELETE `/api/bollettini/:id/righe/:rid` | `crud` | `delete` | `riga_bollettino` | `successo` | `{etichetta, riga_bollettino_id, bollettino_id, fattura_numero, importo_riconosciuto, importo_calcolato}` |
| **Correzione manuale** di un importo (§5.13) | `crud` | `update` | `riga_bollettino` | `successo` | `{etichetta, riga_bollettino_id, bollettino_id, prima, dopo}` |

> Quando la verifica conferma anche il passaggio a `verificato`, si generano **due
> eventi**: `calcolo/verify` + `stato/change_state`.

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

> Il **rendiconto** §7.8 è calcolato al volo (GET = nessun evento); diventa un evento
> **solo quando viene esportato**.

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
| Eccezione non gestita / errore 5xx (handler globale) | `errore` | `error` | `sistema` | `errore` | `{rotta, metodo, http_status, errore: {classe, messaggio}}` |
| Errore di validazione 4xx (operazione rifiutata) | tipo dell'operazione tentata (es. `crud`) | azione dell'operazione | entità dell'operazione | `errore` | `{etichetta, errore: {campo, messaggio}}` |
| Problema di livello `errore` di un servizio aperto o chiuso da solo (§7.14.4) | `errore` | `error` | `sistema` | `errore` (apertura) · `successo` (chiusura) | `{etichetta: testo, servizio, codice, chiave, volte}` |
| *Segna come visto* / *Segna tutti come visti* | `stato` | `change_state` | `sistema` | `successo` | `{etichetta, problemi: [id]}` |

### 15.3 Regole di scrittura (transazionali)

- **Un solo helper** `logEvent({tipo, azione, entita, entita_id, esito, etichetta, dettaglio, req})`
  nel service layer: ogni endpoint che genera eventi lo chiama; nessuna scrittura
  diretta dal client (`req` si usa solo per estrarre sessione e IP lato server).
- **Stessa transazione**: la riga di `eventi_app` viene scritta **nella stessa
  transazione** dell'operazione di business — se l'operazione fa rollback non resta
  alcun evento (coerenza). Eccezione: `auth` (login/logout) e gli eventi `negato`,
  che non hanno transazione di business e usano una scrittura diretta
  **best-effort**.
- **Il log non fallisce mai l'operazione**: se la scrittura di `eventi_app` va in
  errore fuori dalla transazione di business, l'errore viene inviato al **log
  applicativo** (file/console) e l'operazione prosegue.
- **`utente_id`**: l'utente autenticato della sessione; NULL solo per eventi di
  sistema e login non riconosciuto. **`ts`**: impostato dal server/DB, mai dal
  client. **Append-only**: l'evento nasce già completo, senza UPDATE successive.

### 15.4 Formato del `dettaglio` (JSONB)

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
- Gli **errori di lettura documenti** stanno in `documenti_in_arrivo` (stato `errore`,
  campo `errore`) e compaiono nel log come riferimento (§15.4) — non vengono
  duplicati nel testo dell'evento.

### 15.6 Schermata `/eventi`

Comportamento di schermata in §7.11; specifiche operative:

- **Filtri**: tipo, esito, entità, utente (select), periodo `da/a` (date), testo
  libero su `etichetta`; combinabili. Filtro rapido "solo errori".
- **Tabella** (contenitore stabile V9): `ts` (DESC), utente, tipo, entità, azione,
  riferimento (`etichetta` + `entita_id`), esito; paginazione 50 righe.
- **Dettaglio evento** in modale: JSON `dettaglio` formattato + colonne rimanenti
  (`sessione_id`, `ip`).
- **Export CSV** (`GET /api/eventi/export`): stesse righe filtrate, colonne fisse
  `ts;utente;tipo;entita;entita_id;azione;esito;etichetta;dettaglio(JSON)`.
- Nella **dashboard** (§7.1) gli admin vedono un contatore "errori di oggi" con
  collegamento al log filtrato.
- **Sola lettura**: nessun pulsante di modifica/eliminazione.

### 15.7 Conservazione e rotazione

- Job di pulizia notturno: `DELETE FROM eventi_app WHERE ts < now() - interval '36 months';`
  (nessuna cancellazione manuale).
- Gli eventi eliminati non sono recuperabili: gli storici "permanenti" (es. verifica
  bollettini) sono garantiti dai dati congelati in `bollettini_righe` (§5.11), non
  dal log.

### 15.8 Cosa NON si traccia

- **Password, hash, token e cookie di sessione**: solo l'esito e il `sessione_id`.
- **Contenuto dei documenti/allegati**: solo `att_filename` e dimensione.
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

Tabella: §4.2.11 · Schermata: §7.11 · API: §8.1 · Seed: §12 · Deliverable: §14 ·
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
| F5 | Dashboard + log eventi (`/eventi`) | A1–A2 | 2 | 2 |
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
| Database | PostgreSQL condiviso `decobrands` (V2) |
| Accesso | `express-session` + `connect-pg-simple`, argon2, CSRF, Helmet, throttler (§3.3) |
| Esercizio | Caddy + due processi Node (8001/8002), Docker solo in sviluppo (§3.4) |
| Lavori pianificati / Excel / test | `@nestjs/schedule` · `exceljs` · Jest + supertest |
| Ingresso documenti | `imapflow` (casella email) · coda su PostgreSQL (`FOR UPDATE SKIP LOCKED`) · PDF → immagini (`pdftoppm`) · **GLM-OCR** su **vLLM** (server GPU locale, interfaccia compatibile OpenAI, uscita vincolata allo schema, `logprobs`) — **nessun n8n** |
| Grafica | **`stile.css` del prototipo ufficiale** (V4, D-24): CSS proprio con le variabili del prototipo (moduli CSS o un unico foglio globale), Public Sans incorporato, icone SVG del prototipo; niente Bootstrap e niente grafica di Luis |

**Riuso da Luis B2B — solo infrastruttura, nessuna interfaccia:**

| Da Luis (`backend/src`, `frontend/`) | Uso nel CRM |
|---|---|
| `main.ts` (Helmet, CORS, cookie, sessione su PostgreSQL, controllo CSRF) | copiato, adattato a porte e origini del CRM |
| `auth/` (login, logout, cambio password, guard autenticazione/ruoli) | adattato alla tabella `users` della Gestione Ordini e ai ruoli `admin`/utente; tolti i gruppi di permessi |
| `prisma/` (servizio Prisma) | copiato |
| `common/`: `password.ts`, `http-error.filter.ts`, `request-context*`, `access-log.interceptor.ts`, `env.ts`, `xlsx.ts`, `audit.extension.ts` | copiati; `audit.extension` e `xlsx` alla base di §15 e di bollettini/export |
| `audit/`, `events/` | base del registro eventi `eventi_app` e di `/eventi` (§15) |
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
| **FilterBar** | barra dei filtri **standard** (§16.4.1) | campi `segmenti` (con conteggi aggiornati dal vivo: `conta`), `cerca`, `select` (solo per valori fissi, mai per entità), `ricerca` su un'entità con `multipla`; `predefinito` (valore senza filtro), `nelRiepilogo`; `riepilogo` (icone *Riepilogo dei filtri* e *Togli tutti i filtri*, con voci esterne come il periodo); `onChange`; metodi `imposta`, `azzera`, `conta` |
| **KpiRow** | riquadri numerici | voci (etichetta, valore, variante colore) |
| **Riepilogo** | schede compatte del dettaglio pratica | voci (etichetta, icona, valore, variante) |
| **Schede** | contenuti alternativi nello stesso spazio, quando una scheda di dettaglio impilerebbe più tabelle (§7.1, §7.4, §7.13, §7.18, §7.21) | schede (`id`, etichetta, contatore con variante neutro/giallo/rosso/verde, `disegna`), scheda attiva, `riempi`, `onCambia`; tastiera ← → Home Fine; **ricorda la scheda** per ogni passo della cronologia (§7.12). Le schede stanno **in alto**. Non sostituiscono i segmenti della FilterBar: i segmenti filtrano le stesse righe, le schede mostrano contenuti diversi |
| **Pannello** | card con testata | titolo, icona, azioni, piede |
| **Form / FormModal** | moduli e finestre modali | campi (`nome`, `etichetta`, `tipo`, `opzioni`, `col`, `obbligatorio`, `aiuto`, `onChange`), pulsante / `onConferma` |
| **Intestazione** | testata pagina | titolo, icona, sottotitolo, azioni; pulsante **"Torna a …"** automatico (§7.12). Il parametro `briciole` (percorso "Elenco › Dettaglio") esiste ma **non si usa** nelle pagine di dettaglio: ripete il *Torna a …* e la voce evidenziata nella barra (D-12, §19) |
| **Stepper**, **Nota**, badge | passi di stato, note, stati | — |
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
  (`?fornitore=1,2`).

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

**Layout:** la pagina è alta quanto lo schermo; intestazione, filtri, KPI e note hanno
altezza propria, l'elemento "riempi" (di norma la DataTable) prende il resto. Sotto i
992 px la pagina torna a flusso naturale e le tabelle hanno altezza massima 65vh.

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

## 17. Ampliamento futuro: vendita diretta e sostituzione della Gestione Ordini

Decisione: la **vendita diretta** (articoli che Decobrands compra e rivende in proprio) e la
sostituzione della Gestione Ordini attuale (Express + EJS + n8n + LlamaIndex) sono un
**ampliamento successivo**, **non in questa fase** e fuori da questo preventivo. Fino ad
allora la Gestione Ordini resta in esercizio, invariata, sullo stesso database.

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
| D-25 | 18/10/2026 | Percentuali dei fornitori **con data di validità**: *Nuove percentuali da una data* crea una nuova versione; ogni documento si calcola con la versione in vigore alla sua data; resta il congelamento alla verifica del bollettino. Chiude B3 | le condizioni cambiano dal periodo in cui vengono riviste; il solo congelamento non copriva i documenti in attesa del bollettino né l'Analisi dei periodi passati; il cliente l'ha già vista nel prototipo | Ugo | §4.2.2, §5.11, §7.4, §10 |
| D-26 | 18/10/2026 | Le **eccezioni personali** dei subagenti si inseriscono, modificano ed eliminano nel CRM (scheda del subagente) e il motore le applica; passano alla nuova versione delle percentuali. Chiude B1 | tutto il calcolo delle provvigioni sta nel CRM: un'eccezione gestita fuori non compare in liquidazione e Analisi | Ugo | §4.2.3, §5.2, §7.5, §8.1, §15.2.2 |
| D-27 | 18/10/2026 | Regole del subagente: **% dell'agenzia** (per cliente × fornitore), **una fattura al mese** (la prima o la più alta), **correzione sul singolo documento** con motivo obbligatorio; ordine: correzione → mensile → agenzia → eccezione → scaglione. Lo sconto fittizio non serve più | gli accordi con i subagenti sono vari e non prevedibili (caso Bastasin): tre livelli coprono ogni caso senza toccare il codice; il fornitore resta controllato nel bollettino; ogni scostamento è motivato e tracciato | Ugo | §4.2.6, §4.2.7.2, §5.2, §7.6, §7.8, §10, D-26 |
| D-28 | 18/10/2026 | **Ogni calcolo e operazione sensibile solo sul backend, partendo dal database, MAI da dati presi dal frontend**; il client mostra e invia solo scelte; il server ricarica, ricontrolla, ricalcola | dal browser si può alterare qualsiasi valore; provvigioni e liquidazioni sono soldi; registro eventi e permessi devono essere affidabili | Ugo | V12, §2, §10, §15.1, §16.5 |
