# Specifica — CRM Ordini a Fornitore, Bollettini e Provvigioni (Decobrands)

**Versione:** 2.0 — **Stato:** validata con il cliente; stack allineato al Portale B2B Luis (§16.3); componenti standard (§16.4); ingresso documenti interno senza n8n, lettura con GLM-OCR in locale (§6.5); sostituzione della Gestione Ordini pianificata in una fase successiva (§17)
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
| V4 | Stile grafico | Bootstrap 5.3, navbar scura, sfondo `#f5f6f8`, logo Decobrands |
| V5 | Lingua | Tutte le interfacce in italiano |
| V6 | Responsive | Desktop + tablet + mobile |
| V7 | Stack | **Stesso stack del Portale B2B Luis**: Node 24, frontend Next.js 16 (App Router) + React 19 + TypeScript, backend NestJS 11, ORM Prisma 7 (adapter `pg`), PostgreSQL condiviso (V2). Due processi Node dietro Caddy; Docker solo in sviluppo (§3.4) |
| V8 | Fidelità | Alta fedeltà — dati reali, interazioni reali |
| V9 | Contenitori dati stabili | Ogni tabella è una **DataTable standard** (§16.4): occupa tutto lo spazio disponibile, intestazione fissa, righe scorrevoli, intestazioni ordinabili; il layout non cambia al variare del numero di righe |
| V11 | Lettura documenti in locale | **GLM-OCR** servito da **vLLM** su un server aziendale con GPU, chiamato direttamente dal backend NestJS; nessun n8n, nessun servizio esterno; i documenti non escono dall'azienda (§6.5) |
| V10 | Tracciamento eventi | Il sistema registra automaticamente gli eventi applicativi (CRUD, cambi di stato, upload/export, autenticazione) ed errori su `eventi_app` (§4.2.11), consultabili in sola lettura da `/eventi` (§7.11, §15); le tabelle della Gestione Ordini non vengono modificate (V2) |

---

## 3. Architettura dell'applicazione

### 3.1 Struttura

L'applicazione è organizzata in viste che corrispondono alle schermate della sezione §7:

```
index.html              # launcher schermate (dashboard, ordini, bollettini, liquidazione, anagrafiche)
login.html              # accesso (facciata)
dashboard.html          # schermata riepilogo
ordini-fornitore.html   # pratiche ordine a fornitore
ordine-fornitore-dettaglio.html  # dettaglio ordine: conferma/fattura/righe/documenti
fornitori.html          # anagrafica fornitori + scaglioni
fornitore-dettaglio.html
agenti.html             # anagrafica agenti e subagenti
interscambio.html       # tabella subagente × cliente × fornitore
bollettini.html         # controllo bollettini
bollettino-dettaglio.html
liquidazione.html       # rendiconto provvigioni subagenti + export CSV
```

Componenti condivise:

- foglio di stile comune (Bootstrap 5.3, sfondo `#f5f6f8`, navbar scura, logo);
- dati dimostrativi (interamente lato client);
- motore di calcolo provvigioni/bollettini (§10).

### 3.2 Avvio

L'architettura di esercizio (frontend Next.js + backend NestJS/Prisma, PostgreSQL,
autenticazione, upload documenti, lavori pianificati) è descritta in §3.3, §3.4 e §8; riprende le
stesse funzioni del collaudo e mantiene il foglio di stile comune (§V4: Bootstrap 5.3,
navbar scura, logo), con il layout invariato.

L'implementazione di collaudo resta **consultabile senza server**: si apre `index.html`
direttamente nel browser; nessun `npm install`, nessuna porta; Bootstrap e icone arrivano
da CDN. I calcoli provvigioni e le differenze bollettini sono eseguiti **lato client** dal
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
| `users` | autenticazione e ruoli (condivisa con la Gestione Ordini) |
| `remember_tokens` | sessione persistente |
| `clienti` | anagrafica cliente (P.IVA univoca, ragione sociale, codice Integra) |
| `articoli` | catalogo (codice, descrizione, EAN, UM) |
| `giacenze` | giacenza per codice (`qta_disponibile`) |
| `codici_alias` | cambi codice articolo con conferma |
| `kit_testata` / `kit_dettaglio` | kit di articoli |
| `ordini_cliente_testata` / `ordini_cliente_articoli` | ordini dei clienti (`fornitore` è testo libero → si mappa ai fornitori CRM) |
| `ordini_upload_queue` | **non usata dal CRM**: resta della Gestione Ordini fino alla sua sostituzione (§17) |
| `audit_log` | log di tutte le scritture |
| `movimenti_giacenza` | movimenti stock |
| `processing_errors` | **non usata dal CRM**: gli errori di lettura del CRM stanno in `documenti_in_arrivo` (§4.2.12) |

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
| `ragione_sociale` | VARCHAR(255) NOT NULL | |
| `piva` | VARCHAR(20) | univoco se valorizzato |
| `giorni_attesa_conferma` | INT DEFAULT 30 | usato per le scadenze |
| `payment_type` | VARCHAR(20) DEFAULT `'invoiced'` | `matured` \| `invoiced` — maturazione provvigioni (**§5.5**) |
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
| `ordinamento` | INT DEFAULT 0 | |
| `created_at` | TIMESTAMPTZ | |

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

> Nota: modello dati presente; la gestione UI delle eccezioni è in backlog (§13).

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
| `entita` | VARCHAR(50) | `fornitore`, `scaglione`, `agente`, `subagente`, `interscambio`, `pratica`, `riga_pratica`, `documento`, `bollettino`, `riga_bollettino`, `liquidazione`, `utente`, `sistema` |
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
| `pagina` · `riquadro` | INT · JSONB | posizione nel PDF (`x, y, w, h` normalizzati) per l'evidenziazione |
| `verificato` | BOOLEAN | confermato o corretto dall'operatore |
| `corretto_da` · `corretto_il` | VARCHAR(100) · TIMESTAMPTZ | |

### 4.3 Diagramma relazionale

```
fornitori 1 ── n provvigioni_scaglioni 1 ── n provvigioni_eccezioni (→ subagenti)
fornitori 1 ── n interscambio ── n 1 subagenti n ── 1 agenti
fornitori 1 ── n ordini_fornitore_testata 1 ── n ordini_fornitore_righe
fornitori 1 ── n bollettini_testata 1 ── n bollettini_righe
ordini_fornitore_testata 1 ── n ordini_fornitore_documenti (fatture e note di credito, §4.2.7.1)
interscambio (cliente_piva, fornitore_id) → ordini_fornitore_testata (cliente_piva, fornitore_id)
interscambio (fornitore_id, codice_cliente_fornitore) → ordini_fornitore_testata (cliente_piva, fornitore_id)
ordini_cliente_testata 1 ── 0..n ordini_fornitore_testata (via ordine_cliente_id, ponte §4.1)
users 1 ── n eventi_app  (audit append-only, §15)
```

### 4.4 Note di schema

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
- Le percentuali storiche vengono congelate su `bollettini_righe` (§5.11); il versioning
  degli scaglioni per periodo è in backlog (§13).
- Le **righe per fase** (`ordini_fornitore_righe.fase`) non si sovrascrivono: conservano
  la fotografia di ordine, conferma e fattura, così il confronto fra fasi resta
  ispezionabile a posteriori (§5.8, §7.3).
- Gli **importi delle provvigioni** si calcolano sul **netto documenti** della pratica
  (§4.2.7.1, §5.3): le note di credito riducono l'imponibile senza generare pratiche a sé.

---

## 5. Regole di business

### 5.1 Modello a scaglioni

La provvigione si determina dallo **sconto accordato al cliente sul fornitore**
(`interscambio.discount`): lo sconto cade in uno scaglione della tabella
`provvigioni_scaglioni` del fornitore, che definisce `pct_agente` e `pct_subagente`.

### 5.2 Eccezioni per singolo subagente

Le eccezioni sono **rarissime**: tutti i subagenti hanno la stessa provvigione. Se
esiste una `provvigioni_eccezioni` per lo scaglione/subagente, `pct_override` vince sulla
percentuale standard. Gli sconti speciali usati solo per differire la provvigione (es.
`1%` = eccezione `3%` del subagente Bastasin) si gestiscono a mano fuori dal calcolo
automatico; per quei clienti le provvigioni non vengono riconosciute per ogni ordine ma
**solo una fattura al mese**.

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

### 5.6 Cadenze

- **Subagenti**: liquidazione trimestrale su trimestri fissi **Gen-Mar, Apr-Giu,
  Lug-Set, Ott-Dic**.
- **Fornitori**: bollettini **mensili** — un documento per fornitore e mese
  (`fornitore_id`, `mese`, `anno`). Un fornitore con cadenza diversa sarà rimosso.
- Il bollettino è la base **mensile**; la **liquidazione ai subagenti** resta
  trimestrale (§6.3) aggregando i bollettini del trimestre di competenza.

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
vanno rilette con le percentuali di allora. Implementazione: `bollettini_righe` congelano
`pct_calcolata`/`importo_calcolato` alla verifica; la rilettura di un mese passato
usa i valori congelati. Versioning degli scaglioni per periodo = estensione (§13).

### 5.12 Alert solo in-app

Le segnalazioni (conferme in scadenza, bollettini da verificare, differenze, **variazioni
di composizione fra fasi e note di credito**) compaiono come **alert nella dashboard /
nelle schermate**. **Nessuna email.**

### 5.13 Modifica manuale senza blocchi

Nel controllo bollettino, quando gli importi non tornano (promozioni, condizioni
particolari), l'operatore può **confermare l'importo del fornitore o correggerlo
manualmente** senza che il flusso si blocchi. La differenza resta comunque registrata e
il bollettino può passare a `verificato` o `contestato`.

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
   - pipeline di riconoscimento dei blocchi di pagina per ricavare la posizione dei
     valori nel PDF.
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
   al passaggio del mouse; selezionando un campo si evidenzia nel PDF il blocco da cui è
   stato letto; ogni campo corretto o confermato diventa `verificato`. Salvando si
   ricalcolano controlli e abbinamento proposto.
8. **Taratura.** Ogni correzione resta in `documenti_campi` (letto, finale,
   affidabilità): dopo le prime centinaia di documenti si fissano le soglie per
   fornitore; lo stesso archivio serve per un eventuale riaddestramento del modello.

**Requisiti del server di lettura:** GPU NVIDIA con driver CUDA, vLLM e modello
`zai-org/GLM-OCR` (0,9 miliardi di parametri); la memoria video necessaria va
verificata nella prova F0-A6. Il server è a carico del cliente.

## 7. Schermate

| # | Route | Schermata |
|---|-------|-----------|
| 1 | `/login` | Login |
| 2 | `/dashboard` | Dashboard (home dopo login) |
| 3 | `/ordini-fornitore` | Elenco pratiche ordini fornitore |
| 4 | `/ordini-fornitore/:id` | Dettaglio pratica (tab per fase + strip riepilogo + righe + storico) |
| 5 | `/fornitori` | Anagrafica fornitori |
| 6 | `/fornitori/:id` | Dettaglio fornitore con scaglioni |
| 7 | `/agenti` | Agenti + subagenti |
| 8 | `/interscambio` | Tabella interscambio |
| 9 | `/bollettini` | Elenco bollettini con stato e differenze |
| 10 | `/bollettini/:id` | Dettaglio bollettino con righe e divergenze |
| 11 | `/liquidazione` | Rendiconto provvigioni subagenti |
| 12 | `/cambia-password`, `/richiedi-reset` | Gestione credenziali |
| 13 | `/ordini`, `/ordini/upload`, `/liste` | Gestione ordini cliente |
| 14 | `/clienti`, `/utenti`, `/errori` | Anagrafiche e utility (admin) |
| 15 | `/eventi` | Log eventi applicativi: CRUD, cambi di stato, upload/export, autenticazione, errori (admin) |

### 7.1 Dashboard (`/dashboard`)

- Header con titolo e **trimestre corrente**; **KPI sempre visibili**: ordini in stato
  `inviato` / `confermato` / `fatturato` e totale merce fatturata del trimestre.
- **Organizzazione a tab** (pattern `tabs-crm`): **Segnalazioni** — conferme scadute
  (alert §5.12), bollettini in stato `da_verificare` e **pratiche con variazioni di
  composizione fra fasi** (o con note di credito, §5.8), con contatore sul tab;
  **Ordini fornitore** — ultimi ordini (8) con accesso al dettaglio.
- Contenitori stabili (V9): liste segnalazioni con altezza costante, ultimi ordini in
  tabella con intestazione fissa e scroll interno.

### 7.2 Elenco ordini fornitore (`/ordini-fornitore`)

- Filtri: stato (`inviato`/`confermato`/`fatturato`), testo libero (numero ordine,
  cliente, fornitore). Paginazione.
- Colonna con n° righe; accesso al dettaglio.
- **Flag variazioni**: le pratiche con scostamenti di composizione fra fasi o con note di
  credito mostrano un badge, così l'operatore le individua subito (§5.8).

### 7.3 Dettaglio pratica (`/ordini-fornitore/:id`)

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

### 7.4 Anagrafica fornitori (`/fornitori`, `/fornitori/:id`)

- Elenco con n° scaglioni e ordini aperti.
- CRUD fornitore: ragione sociale, P.IVA, giorni attesa conferma, `payment_type`
  (maturato/fatturato), note, attivo.
- Dettaglio con **tabella scaglioni** editabile (sconto min/max, % agente, % subagente);
  gestione eccezioni per subagente (backlog).

### 7.5 Agenti e subagenti (`/agenti`)

- Elenco agenti (con n° subagenti) + elenco subagenti con riferimenti agente.
- CRUD di entrambi.

### 7.6 Interscambio (`/interscambio`)

- Tabella: subagente (codice, cognome, nome) × agente × cliente (ragione sociale o
  P.IVA) × fornitore, con **codice cliente del fornitore** e sconto.
- Nuova associazione: subagente + cliente (P.IVA) + fornitore + **codice cliente del
  fornitore** (come compare su conferma/fattura, §4.4) + sconto; vincolo unico
  (§5.10) e vincolo unico del codice per fornitore. Eliminazione riga.

### 7.7 Bollettini (`/bollettini`, `/bollettini/:id`)

- Elenco con filtro stato; colonne: fornitore, mese/anno, n° righe, riconosciuto,
  calcolato, **totale differenze** (evidenziato se ≠ 0).
- Dettaglio: righe con fattura, cliente, merce, riconosciuto/calcolato e `differenza`
  evidenziata; azioni: aggiungi/elimina riga, **conferma importo fornitore o modifica
  manuale** (§5.13), passa a `verificato`/`contestato`.

### 7.8 Liquidazione (`/liquidazione`)

- **Filtri in card**: fornitore (**multifiltro a checkbox**: selezione multipla,
  "Tutti i fornitori" di default, etichetta con contatore; nessun fornitore
  selezionato = nessuna riga), subagente, trimestre, anno.
- **KPI del periodo**: documenti liquidabili, totale merce, provvigione agente,
  provvigione subagenti (solo pratiche `fatturato` del periodo, §5.5; V9).
- **Tab Riepilogo / Dettaglio rendiconto**: riepilogo per subagente (n° fatture, totale
  merce, totale provvigione subagente) con riga totale; dettaglio riga per riga.
- **Export** con i campi §11 nell'header del dettaglio.

### 7.9 Documenti (`/documenti`)

Unico punto d'ingresso dei documenti (§6.5): area di caricamento, elenco "Da
controllare" con livello di affidabilità, dettaglio con dati letti, righe e proposta di
abbinamento; pulsanti "Correggi i dati letti" (con numero di campi da controllare) e
"Scarta il documento"; finestra di correzione con il PDF a fianco. Il pulsante "Carica
documenti" è sempre presente nella barra laterale.

Il **modulo ordini cliente** (sostituzione della Gestione Ordini) è rinviato alla fase
successiva (§17).

### 7.10 Schema dei flussi e navigazione tra le schermate

Il prototipo si naviga a partire dal launcher `index.html`; ogni schermata ha la
navbar comune che riporta al launcher (nessun menu laterale). Il dato che collega
tutta l'applicazione è l'**ordine a fornitore**, osservato a tre livelli:
anagrafiche, pratiche, controlli/pagamenti. Tutti i documenti entrano dal canale
comune di ingresso documenti del CRM (§6.5).

```
index.html (launcher) ───── login.html (facciata, autenticazione in esercizio §3.3)
        │
        ├── dashboard.html ─────────────────┐   aggregatore: KPI per stato, segnalazioni
        │                                   │   conferme scadute, bollettini da verificare,
        │                                   │   ultime pratiche, riepilogo provvigioni
        │                                   │
        ├── Anagrafiche                     │
        │   fornitori → fornitore-dettaglio │   scaglioni provvigioni (§5.1)
        │   agenti                          │   agente + subagenti
        │   interscambio                    │   subagente × cliente × fornitore, sconto
        │        │_ sconto → scaglione (§5.1)
        │
        ├── Pratiche
        │   ordini-fornitore → ordine-fornitore-dettaglio
        │        stati inviato → confermato → fatturato, documenti per fase (§6.1)
        │
        └── Controlli e pagamenti
            bollettini → bollettino-dettaglio    riconosciuto vs calcolato (§10)
            liquidazione                         rendiconto trimestrale + export (§11)
```

Considerazioni:

- **Navigazione**: nel prototipo l'ingresso è il launcher `index.html`; ogni schermata
  è un file HTML separato (`prototipo-crm/`) con i dati dimostrativi condivisi in
  `assets/js/data.js` e il motore di calcolo in `assets/js/app.js`; la navbar comune
  (logo + versione) riporta al launcher.
- **Login**: `login.html` è una schermata di facciata nel prototipo (nessuna
  autenticazione reale). In esercizio (V3) l'accesso usa la tabella `users` (§3.3)
  con sessioni server-side e `requireAuth`/`requireAdmin`.
- **Dashboard come aggregatore**: è il punto d'ingresso del percorso consigliato;
  i documenti nuovi letti dall'ingresso documenti (§6.5) compaiono tra le
  segnalazioni e nei KPI, da qui si entra nelle liste.
- **`interscambio` è la chiave di collegamento**: per ogni pratica risolve quale
  subagente segue il cliente presso il fornitore e con quale sconto; lo sconto
  determina lo scaglione (§5.1) usato sia per il confronto bollettini sia per la
  liquidazione. Il vincolo unico di §5.10 garantisce un solo subagente per
  cliente × fornitore.
- **Documenti**: ogni fase (ordine, conferma, fattura, bollettino) passa dal canale
  comune di ingresso documenti (§6.5): ricezione → coda → lettura GLM-OCR → controllo
  operatore → abbinamento; i documenti non leggibili restano in `documenti_in_arrivo`
  con stato `errore`.
- **Liquidazione**: considera solo le pratiche in stato `fatturato` nel periodo
  filtrato; le percentuali sono risolte dagli scaglioni correnti (o dalle eccezioni
  temporanee, §5.7), mentre per i periodi passati si usano i valori congelati (§5.11).
- **Tab e contenitori stabili**: le viste complesse organizzano le informazioni a tab
  per flusso (Pratica → Conferma → Fattura → Righe; Riepilogo/Dettaglio liquidazione;
  Segnalazioni/Ordini in dashboard); le tabelle filtrate usano contenitori stabili
  (V9) così il layout non salta al variare del numero di righe.

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

## 8. API endpoint

### 8.1 Rotte nuove (CRM)

Le pagine (`GET /dashboard`, `/fornitori`, …) sono servite da Next.js; le rotte `/api/*`
da NestJS, raggiunte tramite l'inoltro di Next (stessa origine, §3.4).

| Metodo | Endpoint | Funzione |
|--------|----------|----------|
| GET | `/dashboard` | pagina dashboard |
| GET | `/fornitori` · `/fornitori/:id` | elenco / dettaglio fornitori |
| POST | `/api/fornitori` | crea fornitore |
| PUT | `/api/fornitori/:id` | aggiorna fornitore |
| POST | `/api/fornitori/:id/scaglioni` | aggiunge scaglione |
| DELETE | `/api/scaglioni/:id` | elimina scaglione |
| GET | `/api/fornitori-lista` | dropdown fornitori attivi |
| GET | `/agenti` · `/api/agenti-lista` · `/api/subagenti` | anagrafica agenti/subagenti |
| POST | `/api/agenti` · PUT `/api/agenti/:id` · DELETE `/api/agenti/:id` | CRUD agente |
| POST | `/api/subagenti` · PUT `/api/subagenti/:id` · DELETE `/api/subagenti/:id` | CRUD subagente |
| GET | `/interscambio` | tabella interscambio |
| POST | `/api/interscambio` | nuova associazione |
| DELETE | `/api/interscambio/:id` | elimina associazione |
| GET | `/ordini-fornitore` · `/ordini-fornitore/:id` | elenco / dettaglio pratiche |
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
| GET | `/liquidazione` | rendiconto provvigioni |
| GET | `/api/liquidazione/export` | export CSV della liquidazione (§11) |
| GET | `/documenti` · `/api/documenti` | ingresso documenti: elenco da controllare (§7.9) |
| POST | `/api/documenti/carica` | caricamento manuale (uno o più file) → coda |
| GET | `/api/documenti/:id` · `/api/documenti/:id/file` | dati letti con affidabilità e posizioni · file originale |
| PUT | `/api/documenti/:id` | correzione dei dati letti (campi verificati) |
| POST | `/api/documenti/:id/abbina` · `/apri-pratica` · `/registra-bollettino` | esito del controllo |
| POST | `/api/documenti/:id/scarta` · `/rileggi` | scarto · nuova lettura |
| GET | `/eventi` | log eventi applicativi (admin) |
| GET | `/api/eventi` | elenco eventi filtrato (admin) |
| GET | `/api/eventi/:id` | dettaglio evento (admin) |
| GET | `/api/eventi/export` | export CSV del log filtrato (admin) |

### 8.2 Modulo ordini cliente (fase successiva, §17)

`/api/ordini*`, `/api/lookup/*`, `/api/clienti*`, `/api/utenti*`: API del futuro modulo
ordini cliente, che sostituirà la Gestione Ordini; non incluse in questa fase.

### 8.3 Autenticazione

`/login` (POST), `/logout` (POST), `/cambia-password`, `/richiedi-reset`. Guard
`requireAuth` su tutte le rotte app, `requireAdmin` su clienti/utenti/eventi.

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

Base = `importo_merce` della pratica fatturata (o confermata, a seconda dello stato
§5.8).

```
Scaglione applicato:
  sconto_cliente_fornitore (interscambio.discount)  ∈  [sconto_min, sconto_max]
  → pct_agente, pct_subagente  (o pct_override da provvigioni_eccezioni se presente)

provv_agente     = importo_merce × pct_agente / 100
provv_subagente  = importo_merce × pct_subagente / 100
provv_totale     = provv_agente + provv_subagente

Nota di credito: importo_merce < 0 → provvigioni negative (§5.3)
pct_agente = 0 e pct_subagente = 0 → nessuna provvigione
```

Il motore gira **solo lato server** (servizio NestJS): l'interfaccia mostra i valori
calcolati, non li ricalcola. Il rendiconto usa i dati fatturati del periodo filtrato; le percentuali sono risolte
al volo dagli scaglioni correnti (o dalle eccezioni). Per i periodi passati i valori
restano quelli congelati nel bollettino (§5.11).

---

## 11. Esportazione liquidazione

Campi dell'export (come richiesto da Matteo, punto 6):

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
| B1 | Gestione UI delle `provvigioni_eccezioni` | modello dati pronto, UI da sviluppare |
| B2 | Riga bollettino con solo totale cliente | supportare riga aggregata (cliente + totale) nel confronto |
| B3 | Versioning scaglioni per periodo | rilettura storica automatica (§5.11) |
| B4 | Consolidamento sconto | `interscambio.discount` resta il campo canonico (§5.7); `fornitori.discount` è un semplice default |
| B5 | ~~Upload documenti~~ | chiuso: incluso nell'implementazione (multer, §3.4) |
| B6 | Dati storici / popolamento iniziale | capire se importare le prassi dagli Excel manuali |
| B7 | Casi cliente su più subagenti su fornitori diversi | risolti internamente da Marco |

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

#### 15.2.2 Anagrafiche — fornitori e scaglioni (§8.1)

| Operazione (API) | `tipo` | `azione` | `entita` | `esito` | `dettaglio` |
|------------------|--------|----------|----------|---------|-------------|
| POST `/api/fornitori` | `crud` | `create` | `fornitore` | `successo` | `{etichetta: ragione_sociale, p_iva, giorni_attesa_conferma, payment_type, attivo}` |
| PUT `/api/fornitori/:id` | `crud` | `update` | `fornitore` | `successo` | `{etichetta, prima: {…campi cambiati}, dopo: {…}}` |
| POST `/api/fornitori/:id/scaglioni` | `crud` | `create` | `scaglione` | `successo` | `{etichetta: sconto min–max, fornitore_id, sconto_min, sconto_max, pct_agente, pct_subagente}` |
| DELETE `/api/scaglioni/:id` | `crud` | `delete` | `scaglione` | `successo` | `{etichetta, scaglione_id, fornitore_id, sconto_min, sconto_max, pct_agente, pct_subagente}` |

> Il fornitore **non si elimina** via API: si disattiva con `attivo=false`
> (evento `crud/update`).

#### 15.2.3 Anagrafiche — agenti, subagenti, interscambio (§8.1)

| Operazione (API) | `tipo` | `azione` | `entita` | `esito` | `dettaglio` |
|------------------|--------|----------|----------|---------|-------------|
| create/update/delete agente | `crud` | `create`/`update`/`delete` | `agente` | `successo` | create/delete: `{etichetta: cognome, nome}`; update: `{etichetta, prima, dopo}` |
| create/update/delete subagente | `crud` | `create`/`update`/`delete` | `subagente` | `successo` | come agente (create include `agente_id`) |
| POST `/api/interscambio` | `crud` | `create` | `interscambio` | `successo` | `{etichetta: cliente_piva · fornitore, subagente_id, cliente_piva, fornitore_id, codice_cliente_fornitore, discount}` |
| DELETE `/api/interscambio/:id` | `crud` | `delete` | `interscambio` | `successo` | `{etichetta, interscambio_id, subagente_id, cliente_piva, fornitore_id, codice_cliente_fornitore, discount}` |

#### 15.2.4 Pratiche ordine a fornitore (§8.1)

| Operazione (API) | `tipo` | `azione` | `entita` | `esito` | `dettaglio` |
|------------------|--------|----------|----------|---------|-------------|
| POST `/api/ordini-fornitore` | `crud` | `create` | `pratica` | `successo` | `{etichetta: numero_ordine, fornitore_id, cliente_piva, ordine_cliente_id, agente_id, importo_merce, stato}` |
| PUT `/api/ordini-fornitore/:id` **senza** cambio stato | `crud` | `update` | `pratica` | `successo` | `{etichetta, prima, dopo}` (lo `stato` è **escluso** dal diff) |
| PUT `/api/ordini-fornitore/:id` **con** cambio stato | `stato` | `change_state` | `pratica` | `successo` | `{etichetta, prima: {stato}, dopo: {stato}, motivo: note}` |
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
| PUT che fa avanzare di fase le righe (ordine→conferma→fattura, §5.8) | `stato` | `snapshot_righe` | `pratica` | `successo` | `{etichetta, pratica_id, da_fase, a_fase, n_righe, importo, scostamento_vs_fase_precedente}` |

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

#### 15.2.6 Liquidazione ed export (§8.1, §11)

| Operazione (API) | `tipo` | `azione` | `entita` | `esito` | `dettaglio` |
|------------------|--------|----------|----------|---------|-------------|
| GET `/api/liquidazione/export` | `export` | `export` | `liquidazione` | `successo` | `{etichetta: trimestre/anno, periodo: {trimestre, anno}, filtro: {fornitori?: number[], subagente?}, n_righe, importo_totale}` |
| export con errori (dati/campi mancanti) | `export` | `export` | `liquidazione` | `errore` | `{etichetta, periodo, motivo}` |

> Il **rendiconto** §7.8 è calcolato al volo (GET = nessun evento); diventa un evento
> **solo quando viene esportato**.

#### 15.2.7 Errori di sistema

| Evento | `tipo` | `azione` | `entita` | `esito` | `dettaglio` |
|--------|--------|----------|----------|---------|-------------|
| Eccezione non gestita / errore 5xx (handler globale) | `errore` | `error` | `sistema` | `errore` | `{rotta, metodo, http_status, errore: {classe, messaggio}}` |
| Errore di validazione 4xx (operazione rifiutata) | tipo dell'operazione tentata (es. `crud`) | azione dell'operazione | entità dell'operazione | `errore` | `{etichetta, errore: {campo, messaggio}}` |

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

Il prototipo navigabile (`prototipo-crm/*.html` + `assets/css/crm.css` +
`assets/js/app.js`) è la **sorgente di verità**. Ogni schermata implementata deve
superare tutti e sei i criteri, verificati con confronto side-by-side con la sorgente
HTML e confronto numerico sul seed §12, **prima del merge**:

1. **Struttura/navigazione** — stesse aree e ordine: navbar fissa (§4.2), contenuto, footer fisso centrato; stesse rotte (§7).
2. **Layout** — stesse card/tabelle nello stesso ordine; `.table-box`/`.box-stabile` con altezze e thead sticky; `thead class="table-dark"`.
3. **Componenti/stile** — schermata composta **solo** dai componenti standard §16.4 con gli stessi parametri del prototipo; Bootstrap 5.3.2 + bootstrap-icons identichi; `crm.css` **copiato, non riscritto**.
4. **Testi** — etichette, empty state, avvisi e note: italiano identico parola per parola al file di prototipo.
5. **Interazioni** — filtri (incl. multifiltro checkbox §7.8), tab, modali, stepper, conferme, toast, export: stesso comportamento e stessi messaggi.
6. **Dati** — seed §12 identico → stessi numeri in KPI e tabelle (prova oggettiva).

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
| Grafica | **Bootstrap 5.3.2 + `crm.css` del prototipo** (V4): coerenza con la Gestione Ordini, non con la grafica di Luis |

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
**Layout, grafica e testi restano quelli del prototipo** (`prototipo-crm/*.html` +
`crm.css`, §16.1): le schermate Next.js riproducono l'HTML del prototipo con Bootstrap 5.3.2.

Lo schema Prisma copre solo le tabelle CRM (§4.2); le
tabelle esistenti si leggono in sola lettura (V2), mai migrate.

### 16.4 Componenti standard

Ogni schermata è una **composizione di componenti standard** configurati con parametri,
mai codice di interfaccia scritto a mano pagina per pagina. Nel prototipo la libreria è
`prototipo-crm/assets/js/componenti.js` (stili in `crm.css`), con catalogo dal vivo in
`componenti.html`; nell'app gli stessi componenti diventano componenti React **con gli
stessi nomi e gli stessi parametri** (attività F0-A4).

| Componente | Uso | Parametri principali |
|---|---|---|
| **DataTable** | ogni tabella dell'app (modello DataTable di Luis B2B) | colonne (`key`, `header`, `tipo` testo/numero/euro/pct/data/stato/conteggio, `align`, `width`, `grow`, `valore`, `cell`, `sortable`, `totale`), righe, azioni di riga, testata (titolo, contatore, azioni, link), selezione, paginazione facoltativa, `onRowClick`, testo "nessun dato" |
| **FilterBar** | filtri sopra le tabelle | campi `select` / `multi` (selezione multipla con "Tutti") / `cerca` / `numero`, `onChange`, Reset |
| **KpiRow** | riquadri numerici | voci (etichetta, valore, variante colore) |
| **Riepilogo** | schede compatte del dettaglio pratica | voci (etichetta, icona, valore, variante) |
| **Tabs** | schede | id, etichetta, icona, badge |
| **Pannello** | card con testata | titolo, icona, azioni, piede |
| **Form / FormModal** | moduli e finestre modali | campi (`nome`, `etichetta`, `tipo`, `opzioni`, `col`, `obbligatorio`, `aiuto`, `onChange`), pulsante / `onConferma` |
| **Intestazione** | testata pagina | titolo, icona, sottotitolo, briciole, azioni |
| **Stepper**, **Nota**, badge | passi di stato, note, stati | — |
| **CampoRicerca** + **RicercaEntita** | ogni campo collegato a un'entità: fornitore, cliente, subagente, codice cliente del fornitore, articolo (articoli già usati dal fornitore: un articolo nuovo è ammesso col pallino rosso), pratica, fattura/nota di credito | autocompletamento con le prime 5 voci, lente / F4 che apre la maschera di ricerca (FilterBar + DataTable), pallino verde/rosso se il valore esiste in anagrafica; entità definite una volta (voci da `/api/lookup/*`, chiave, testo, colonne, filtri, contesto) |

**Comportamento fisso della DataTable** (uguale in ogni schermata):
- occupa **sempre tutto lo spazio** a disposizione del suo contenitore;
- **intestazione fissa**, **solo le righe scorrono**; riga totali fissa in fondo;
- **intestazioni ordinabili** (clic: crescente ▲ / decrescente ▼), ordinamento corretto per numeri, importi e date;
- piede con conteggio ("N righe" o "1–20 di N" con paginazione);
- non scende mai sotto ~3 righe visibili: se lo spazio manca scorre la scheda o la pagina.

**Layout:** la pagina è alta quanto lo schermo; intestazione, filtri, KPI e note hanno
altezza propria, l'elemento "riempi" (di norma la DataTable) prende il resto. Sotto i
992 px la pagina torna a flusso naturale e le tabelle hanno altezza massima 65vh.

### 16.5 Regole di consegna

Ogni attività è una slice con ownership disgiunta (nessun file toccato da due agenti);
una PR per attività con checklist §16.1 allegata; testi e stile presi dal prototipo,
non inventati; prima del merge: checklist superata + test numerici seed §12 + eventi
§15.2 completi. Casi limite §13 restano backlog, non toccati dal piano.

---

## 17. Fase successiva: sostituzione della Gestione Ordini

Decisione: la Gestione Ordini attuale (Express + EJS + n8n + LlamaIndex) sarà
**sostituita** da un modulo del CRM, **non in questa fase** e fuori da questo preventivo.
Fino ad allora resta in esercizio, invariata, sullo stesso database.

| Aspetto | Indicazione |
|---|---|
| Prerequisito | ingresso documenti (§6.5) in esercizio e tarato sui documenti reali |
| Ambito | ordini cliente (testata + righe), controllo P.IVA e codici articolo (anagrafica, alias, kit), giacenze, esportazione CSV verso Integra, errori di lettura, anagrafiche clienti/articoli/utenti |
| Ingresso | gli ordini cliente entrano dallo **stesso ingresso documenti** del CRM, con un nuovo tipo `ordine_cliente` e il suo schema; si spegne il flusso n8n + LlamaIndex |
| Interfaccia | stile e componenti standard del CRM (§16.4); la finestra di correzione di §6.5 sostituisce la vista ordine attuale (PDF a sinistra, dati a destra) |
| Dati | tabelle esistenti (`ordini_cliente_*`, `clienti`, `articoli`, …) riusate; migrazione solo se servono colonne nuove (affidabilità, riferimento a `documenti_in_arrivo`) |
| Esportazione verso Integra | **da analizzare**: per la sola **commercializzazione diretta** (fatture cliente o fornitore di articoli che Decobrands vende in proprio) i documenti vanno esportati verso Integra come fa oggi la Gestione Ordini, con **sostituzione dei codici articolo (alias)** e **esplosione dei kit**; qui servono l'anagrafica articoli e il relativo controllo, assenti nel giro agenzia (§6.5) |
| Passaggio | i due sistemi in parallelo per un periodo di prova, poi spegnimento di n8n e della vecchia app |
| Stima | da quotare a parte dopo la messa in esercizio del CRM |

