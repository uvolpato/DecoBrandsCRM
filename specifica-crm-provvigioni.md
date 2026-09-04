# Specifica — CRM Ordini a Fornitore, Bollettini e Provvigioni (Decobrands)

**Versione:** 1.5 — **Stato:** validata con il cliente
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

**Tutti i documenti del flusso** — ordini cliente, ordini a fornitore, conferme,
fatture e bollettini — vengono inseriti con **lo stesso sistema della Gestione Ordini**:
l'app li **importa** da PDF e vari documenti tramite **OCR** e li fa passare dalla
**validazione** dell'operatore, che conferma i dati letti prima del salvataggio. Il CRM
legge dal database condiviso senza doppie inserzioni manuali; la tracciatura *ordine →
conferma → fattura* lavora quindi sugli stessi documenti già importati ed elaborati da
quel sistema (`ordini_upload_queue`, `processing_errors`, §4.1, §6).

---

## 2. Vincoli e requisiti generali

| # | Vincolo | Valore |
|---|---------|--------|
| V1 | Unica applicazione | Tutte le funzioni in un'unica applicazione web |
| V2 | Database condiviso | Stesso PostgreSQL (`decobrands`) della Gestione Ordini: tabelle esistenti riusate senza modificarle + tabelle nuove del CRM. **Tutti i documenti entrano tramite lo stesso sistema della Gestione Ordini**: importazione (upload + OCR) e validazione dei dati letti; vengono poi letti dal CRM (§6) |
| V3 | Autenticazione | Tabella `users` con ruoli; utente di default `admin` (ruolo `admin`) |
| V4 | Stile grafico | Bootstrap 5.3, navbar scura, sfondo `#f5f6f8`, logo Decobrands |
| V5 | Lingua | Tutte le interfacce in italiano |
| V6 | Responsive | Desktop + tablet + mobile |
| V7 | Stack | Frontend Next.js (App Router) + React + TypeScript, backend NestJS, ORM Prisma, PostgreSQL condiviso (V2). Deploy senza Docker: frontend e backend girano come servizi/processi Node separati |
| V8 | Fidelità | Alta fedeltà — dati reali, interazioni reali |
| V9 | Contenitori dati stabili | Le viste con tabelle o liste filtrate usano contenitori stabili (altezza minima e massima, scroll interno, intestazione fissa): il layout non cambia al variare del numero di righe |
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
autenticazione, upload documenti, real-time) è descritta in §3.3 e §8; riprende le
stesse funzioni del collaudo e mantiene il foglio di stile comune (§V4: Bootstrap 5.3,
navbar scura, logo), con il layout invariato.

L'implementazione di collaudo resta **consultabile senza server**: si apre `index.html`
direttamente nel browser; nessun `npm install`, nessuna porta; Bootstrap e icone arrivano
da CDN. I calcoli provvigioni e le differenze bollettini sono eseguiti **lato client** dal
motore della sezione §10 su dati dimostrativi.

### 3.3 Autenticazione e autorizzazione

- Tabella `users` **condivisa con la Gestione Ordini** (stessi ruoli e flusso
  password/reset "resta connesso"); utente di default `admin` (ruolo `admin`).
- Sessioni server-side in PostgreSQL (sessione condivisa persistita nel DB),
  password con hash (argon2); supporto a cambio password, reset via token, remember cookie.
- `requireAuth`: tutte le viste tranne login/reset.
- `requireAdmin`: viste sensibili (clienti, utenti).

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
| `ordini_upload_queue` | coda di elaborazione degli upload documenti (import PDF/vari documenti tramite OCR della Gestione Ordini) |
| `audit_log` | log di tutte le scritture |
| `movimenti_giacenza` | movimenti stock |
| `processing_errors` | errori di elaborazione documenti |

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
| `discount` | NUMERIC(5,2) DEFAULT 0 | **sconto accordato al cliente su quel fornitore** — determina lo scaglione (**§4.4**) |
| `attivo` | BOOLEAN DEFAULT true | |
| `created_at` | TIMESTAMPTZ | |
| Vincolo | `UNIQUE(subagente_id, cliente_piva, fornitore_id)` | un solo subagente per cliente×fornitore (**§5.10**) |

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
| `fattura_numero` | VARCHAR(50) | |
| `fattura_data` | DATE | |
| `fattura_importo` | NUMERIC(12,2) | |
| `note` | TEXT | |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

> Il supporto a **ordine fatturato in più tranche** e **fattura che copre più ordini**
> (§5.9) passa da qui: i riferimenti fattura vanno estesi con un modello a ponte
> `ordini_fornitore_fatture` (pratica ↔ fattura) — vedi §13 backlog.

### 4.2.8 `ordini_fornitore_righe`

righe dell'ordine (con la conferma può cambiare la quantità: §5.8).

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | BIGSERIAL PK | |
| `testata_id` | BIGINT FK → `ordini_fornitore_testata` | ON DELETE CASCADE |
| `numero_riga` | INT | |
| `codice` | VARCHAR(100) | |
| `descrizione` | VARCHAR(255) | |
| `um` | VARCHAR(20) | |
| `quantita` | NUMERIC(12,3) | |
| `prezzo_unitario` | NUMERIC(12,4) | |
| `importo` | NUMERIC(12,2) | |

### 4.2.9 `bollettini_testata`

Bollettino del fornitore su un trimestre/anno. Stato `da_verificare → verificato |
contestato`.

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | BIGSERIAL PK | |
| `fornitore_id` | BIGINT FK → `fornitori` | |
| `trimestre` | INT CHECK 1–4 | |
| `anno` | INT | |
| `att_filename` | TEXT | allegato bollettino |
| `importo_riconosciuto` | NUMERIC(12,2) | somma delle righe riconosciute dal fornitore |
| `importo_calcolato` | NUMERIC(12,2) | somma della provvigione attesa calcolata dal sistema |
| `stato` | VARCHAR(20) DEFAULT `'da_verificare'` | `da_verificare` \| `verificato` \| `contestato` |
| `note` | TEXT | |
| `created_at` / `updated_at` | TIMESTAMPTZ | |
| Vincolo | `UNIQUE(fornitore_id, trimestre, anno)` | un bollettino per fornitore/periodo |

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
> per rileggere un trimestre vecchio con le percentuali di allora (§5.11).

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
| `entita` | VARCHAR(50) | `fornitore`, `scaglione`, `agente`, `subagente`, `interscambio`, `pratica`, `riga_pratica`, `bollettino`, `riga_bollettino`, `liquidazione`, `utente`, `sistema` |
| `entita_id` | BIGINT | id dell'entità coinvolta (dove applicabile) |
| `azione` | VARCHAR(30) | `create` · `update` · `delete` · `upload` · `export` · `change_state` · `verify` · `login` · `logout` · `change_password` · `reset_requested` · `access_denied` · `error` |
| `esito` | VARCHAR(10) | `successo` · `errore` · `negato` |
| `dettaglio` | JSONB | sempre la chiave `etichetta`; diff `prima`/`dopo`, nuovo stato, riferimento documento / `processing_errors`, errore tecnico breve (§15.4) |
| `ip` | VARCHAR(45) | indirizzo client (solo eventi `auth`/`negato`) |
| `created_at` | TIMESTAMPTZ | |

> Tabella **append-only**: nessuna modifica/eliminazione manuale. La riga viene scritta
> **nella stessa transazione** dell'operazione che la genera (§15.3); un job di pulizia
> elimina le righe più vecchie di 36 mesi (§15.7). Indici: `(tipo, ts)`,
> `(entita, entita_id)`, `(utente_id, ts)`.

### 4.3 Diagramma relazionale

```
fornitori 1 ── n provvigioni_scaglioni 1 ── n provvigioni_eccezioni (→ subagenti)
fornitori 1 ── n interscambio ── n 1 subagenti n ── 1 agenti
fornitori 1 ── n ordini_fornitore_testata 1 ── n ordini_fornitore_righe
fornitori 1 ── n bollettini_testata 1 ── n bollettini_righe
interscambio (cliente_piva, fornitore_id) → ordini_fornitore_testata (cliente_piva, fornitore_id)
ordini_cliente_testata 1 ── 0..n ordini_fornitore_testata (via ordine_cliente_id, ponte §4.1)
users 1 ── n eventi_app  (audit append-only, §15)
```

### 4.4 Note di schema

- `interscambio.discount` è il **campo canonico** dello sconto cliente su fornitore
  (§5.7) e determina lo scaglione; `fornitori.discount` ne è solo un default ridondante.
- `conferma_scadenza` viene valorizzata automaticamente alla creazione della pratica
  con `data_ordine + giorni_attesa_conferma` (§6.1).
- Le percentuali storiche vengono congelate su `bollettini_righe` (§5.11); il versioning
  degli scaglioni per periodo è in backlog (§13).

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
- **Nota di credito** (importo negativo) → la provvigione lavora allo **stesso modo ma in
  negativo**: es. 10 % di −120,00 € = −12,00 €.

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

- **Subagenti**: trimestri fissi **Gen-Mar, Apr-Giu, Lug-Set, Ott-Dic**.
- **Fornitori**: inviano i bollettini **mensilmente** (la verifica resta per periodi
  aggregabili). Un fornitore ha cadenza diversa ma sarà rimosso.
- Nel modello dati il bollettino corrente è su base trimestrale; l'importazione mensile
  è un'estensione prevista (§13).

### 5.7 Riferimento cliente → fornitore e sconto

Ogni cliente ha un **fornitore di riferimento** con un **codice cliente** e uno
**sconto**, se accordato. Questa relazione vive nella pagina **cliente** (riferimenti
completi) e si riflette in `interscambio` (`cliente_piva`, `fornitore_id`, `discount`).
Lo sconto di `interscambio` è **il campo canonico** che determina lo scaglione in
liquidazione e nel confronto bollettini.

### 5.8 La conferma può cambiare le carte in tavola

Il fornitore può confermare **quantità/importi diversi** dall'ordine (es. 10 articoli
ordinati, 7 confermati). La provvigione si calcola sui dati **confermati**, non
sull'ordine originale. Stato pratica: la riga confermata sostituisce quella ordinata.

### 5.9 Fatture multi-ordine e ordini multi-tranche

Entrambi i casi sono possibili e vanno supportati:
- **una fattura copre più ordini** (già vista nel rendiconto: la 629 ne copre quattro);
- **un ordine viene fatturato in più tranche** (tipico di importatori come Gasper GmbH e
  Ing's Christmas Decor GmbH, o clienti che tengono articoli in back order).

### 5.10 Un cliente → un subagente per fornitore

Un cliente **non può** avere più subagenti sullo stesso fornitore (vincolo `UNIQUE` su
`interscambio`). Può invece avere subagenti diversi su fornitori diversi. I casi
residui vengono risolti internamente da Marco.

### 5.11 Le percentuali nel tempo

Le condizioni nuove valgono **dal periodo in cui vengono riviste**; quelle precedenti
vanno rilette con le percentuali di allora. Implementazione: `bollettini_righe` congelano
`pct_calcolata`/`importo_calcolato` alla verifica; la rilettura di un trimestre passato
usa i valori congelati. Versioning degli scaglioni per periodo = estensione (§13).

### 5.12 Alert solo in-app

Le segnalazioni (conferme in scadenza, bollettini da verificare, differenze) compaiono
come **alert nella dashboard / nelle schermate**. **Nessuna email.**

### 5.13 Modifica manuale senza blocchi

Nel controllo bollettino, quando gli importi non tornano (promozioni, condizioni
particolari), l'operatore può **confermare l'importo del fornitore o correggerlo
manualmente** senza che il flusso si blocchi. La differenza resta comunque registrata e
il bollettino può passare a `verificato` o `contestato`.

---

## 6. Flussi funzionali

**Canale comune: importazione e validazione.** Tutti i documenti (ordini cliente,
ordini a fornitore, conferme, fatture, bollettini) vengono inseriti con lo **stesso
sistema della Gestione Ordini**: l'app li **importa** (upload del file → coda
`ordini_upload_queue` → estrazione automatica OCR) e li fa passare dalla
**validazione** dell'operatore, che conferma o corregge i dati letti prima del
salvataggio — senza doppie digitazioni. I documenti non elaborabili finiscono in
`processing_errors`; gli allegati restano sulla pratica (`att_filename_*`). Tutti i
flussi sotto usano questo canale.

### 6.1 Flusso documentale: ordine → conferma → fattura

```
[1] Ordine  ──carica documento + dati letti──►  pratica in stato "inviato"
[2] Conferma ──aggancio alla pratica──►  stato "confermato"  (quantità/importi possono variare)
[3] Fattura  ──aggancio alla pratica──►  stato "fatturato"   → entra nel calcolo provvigioni
```

- La pratica può essere agganciata all'**ordine cliente di origine** via
  `ordine_cliente_id` (§4.1): la tracciabilità parte dall'ordine ricevuto dal cliente.
- Ogni fase include **upload del documento PDF** allegato alla pratica
  (`att_filename_ordine` / `att_filename_conferma` / `att_filename_fattura`).
- Alla creazione della pratica si calcola `conferma_scadenza = data_ordine +
  giorni_attesa_conferma` del fornitore.
- Passata la scadenza senza conferma, la pratica finisce nella lista **segnalazioni**
  della dashboard (alert in-app, §5.12).
- La **lettura automatica** dei documenti propone i dati letti dal PDF (canale §6:
  importazione + validazione); l'operatore li **conferma** prima del salvataggio.

### 6.2 Flusso controllo bollettini

1. Si imposta il bollettino (fornitore, trimestre, anno).
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
  (alert §5.12) e bollettini in stato `da_verificare`, con contatore sul tab; **Ordini
  fornitore** — ultimi ordini (8) con accesso al dettaglio.
- Contenitori stabili (V9): liste segnalazioni con altezza costante, ultimi ordini in
  tabella con intestazione fissa e scroll interno.

### 7.2 Elenco ordini fornitore (`/ordini-fornitore`)

- Filtri: stato (`inviato`/`confermato`/`fatturato`), testo libero (numero ordine,
  cliente, fornitore). Paginazione.
- Colonna con n° righe; accesso al dettaglio.

### 7.3 Dettaglio pratica (`/ordini-fornitore/:id`)

- **Stepper** stato pratica: `inviato → confermato → fatturato`.
- **Strip riepilogo**: fornitore, cliente, agente, importo merce, scadenza conferma.
- **Tab a flusso**:
  - **Pratica** — dati testata (fornitore, numero/data ordine, cliente, agente, importo
    merce, stato, note) + **subagente derivato da `interscambio`** (§5.10) + documento
    ordine;
  - **Conferma** — campi data/numero/scadenza; **Fattura** — campi numero/data/importo;
    ciascuna fase con **upload PDF** e link all'allegato (`att_filename_*`), evidenziata
    con check quando compilata;
  - **Righe** — tabella (numero riga, codice, descrizione, UM, q.tà, prezzo, importo)
    con aggiunta/eliminazione e **totale merce** in chiusura.
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
  P.IVA) × fornitore.
- Nuova associazione: subagente + cliente (P.IVA) + fornitore (+ sconto); vincolo unico
  (§5.10). Eliminazione riga.

### 7.7 Bollettini (`/bollettini`, `/bollettini/:id`)

- Elenco con filtro stato; colonne: fornitore, trimestre/anno, n° righe, riconosciuto,
  calcolato, **totale differenze** (evidenziato se ≠ 0).
- Dettaglio: righe con fattura, cliente, merce, riconosciuto/calcolato e `differenza`
  evidenziata; azioni: aggiungi/elimina riga, **conferma importo fornitore o modifica
  manuale** (§5.13), passa a `verificato`/`contestato`.

### 7.8 Liquidazione (`/liquidazione`)

- **Filtri in card**: fornitore, subagente, trimestre, anno.
- **KPI del periodo**: documenti liquidabili, totale merce, provvigione agente,
  provvigione subagenti (solo pratiche `fatturato` del periodo, §5.5; V9).
- **Tab Riepilogo / Dettaglio rendiconto**: riepilogo per subagente (n° fatture, totale
  merce, totale provvigione subagente) con riga totale; dettaglio riga per riga.
- **Export** con i campi §11 nell'header del dettaglio.

### 7.9 Modulo ordini cliente

Ordini cliente, liste, articoli, giacenze, errori, clienti, utenti: viste integrate
nell'applicazione con lo stesso comportamento e lo stesso stile di tutte le altre.

### 7.10 Schema dei flussi e navigazione tra le schermate

Il prototipo si naviga a partire dal launcher `index.html`; ogni schermata ha la
navbar comune che riporta al launcher (nessun menu laterale). Il dato che collega
tutta l'applicazione è l'**ordine a fornitore**, osservato a tre livelli:
anagrafiche, pratiche, controlli/pagamenti. Tutti i documenti entrano dal canale
comune di importazione e validazione della Gestione Ordini (§6).

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
  gli ordini che arrivano nuovi dalla Gestione Ordini (§6) compaiono tra le
  segnalazioni e nei KPI, da qui si entra nelle liste.
- **`interscambio` è la chiave di collegamento**: per ogni pratica risolve quale
  subagente segue il cliente presso il fornitore e con quale sconto; lo sconto
  determina lo scaglione (§5.1) usato sia per il confronto bollettini sia per la
  liquidazione. Il vincolo unico di §5.10 garantisce un solo subagente per
  cliente × fornitore.
- **Documenti**: ogni fase (ordine, conferma, fattura, bollettino) passa dal canale
  comune importazione + validazione della Gestione Ordini (§6): upload → coda →
  OCR → validazione operatore; i documenti non leggibili finiscono in
  `processing_errors`.
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
  nuovo stato, riferimento documento / `processing_errors`).
- **Export CSV** del log filtrato (§8.1).
- Dettagli di progettazione in §15.

---

## 8. API endpoint

### 8.1 Rotte nuove (CRM)

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
| GET | `/bollettini` · `/bollettini/:id` | elenco / dettaglio bollettini |
| POST | `/api/bollettini` | crea bollettino |
| PUT | `/api/bollettini/:id` | aggiorna stato/note |
| POST | `/api/bollettini/:id/righe` | aggiunge riga (calcolo atteso + differenza) |
| DELETE | `/api/bollettini/:id/righe/:rid` | elimina riga |
| GET | `/liquidazione` | rendiconto provvigioni |
| GET | `/api/liquidazione/export` | export CSV della liquidazione (§11) |
| GET | `/eventi` | log eventi applicativi (admin) |
| GET | `/api/eventi` | elenco eventi filtrato (admin) |
| GET | `/api/eventi/:id` | dettaglio evento (admin) |
| GET | `/api/eventi/export` | export CSV del log filtrato (admin) |

### 8.2 Modulo ordini cliente

`/api/ordini*`, `/api/lookup/*`, `/api/clienti*`, `/api/utenti*`, `/api/errori*`: API del
modulo ordini cliente, montate sul server dell'applicazione; leggono e scrivono le
tabelle condivise di §4.1 (ordini cliente, clienti, articoli, giacenze, log).

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

Il rendiconto usa i dati fatturati del periodo filtrato; le percentuali sono risolte
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
- **Interscambio**: cliente con riferimenti fornitore + sconto (`discount`).
- **Pratiche**: esempi negli stati `inviato`, `confermato`, `fatturato`; una nota di
  credito (importo negativo) per validare §5.3; un ordine con conferma ridotta (7/10
  articoli) per validare §5.8.
- **Eventi**: esempi di `eventi_app` coerenti con i dati sopra (login admin, creazione
  fornitore, modifica scaglione, cambio stato pratica, verifica bollettino, export
  liquidazione) + **un evento di tipo `errore`** per collaudare filtri e dettaglio
  della schermata `/eventi` (§7.11, §15).

---

## 13. Casi limite e domande residue (backlog)

| # | Argomento | Nota |
|---|-----------|------|
| B1 | Gestione UI delle `provvigioni_eccezioni` | modello dati pronto, UI da sviluppare |
| B2 | Ordine multi-tranche / fattura multi-ordine | estendere con tabella a ponte pratica↔fattura |
| B3 | Importazione mensile bollettini fornitori | il modello corrente è trimestrale; i bollettini arrivano mensili (§5.6) |
| B4 | Riga bollettino con solo totale cliente | supportare riga aggregata (cliente + totale) nel confronto |
| B5 | Versioning scaglioni per periodo | rilettura storica automatica (§5.11) |
| B6 | Consolidamento sconto | `interscambio.discount` resta il campo canonico (§5.7); `fornitori.discount` è un semplice default |
| B7 | Upload documenti | generare il file reale al posto del segnaposto (multer) |
| B8 | Dati storici / popolamento iniziale | capire se importare le prassi dagli Excel manuali |
| B9 | Casi cliente su più subagenti su fornitori diversi | risolti internamente da Marco |

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
| Frontend Next.js + backend NestJS (Prisma), database, autenticazione, upload, real-time (§3.3, §8) | ⁄ in roadmap |
| Casi limite §13 (B1–B9) | ⏳ |

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
  del CRM; gli errori di importazione documenti restano in `processing_errors` della
  Gestione Ordini (§4.1) e vengono solo **referenziati** dagli eventi, non duplicati.
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
| POST `/api/interscambio` | `crud` | `create` | `interscambio` | `successo` | `{etichetta: cliente_piva · fornitore, subagente_id, cliente_piva, fornitore_id, discount}` |
| DELETE `/api/interscambio/:id` | `crud` | `delete` | `interscambio` | `successo` | `{etichetta, interscambio_id, subagente_id, cliente_piva, fornitore_id, discount}` |

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
| upload con esito negativo (validazione/OCR non riuscita, §6) | `documento` | `upload` | `pratica` | `errore` | `{etichetta, pratica_id, fase, att_filename, processing_errors_id}` |

#### 15.2.5 Bollettini e righe bollettino (§8.1)

| Operazione (API) | `tipo` | `azione` | `entita` | `esito` | `dettaglio` |
|------------------|--------|----------|----------|---------|-------------|
| POST `/api/bollettini` | `crud` | `create` | `bollettino` | `successo` | `{etichetta: trimestre/anno · fornitore, fornitore_id, trimestre, anno, att_filename}` |
| PUT `/api/bollettini/:id` (dati/note, **senza** cambio stato) | `crud` | `update` | `bollettino` | `successo` | `{etichetta, prima, dopo}` |
| PUT `/api/bollettini/:id` **con** cambio stato (`da_verificare → verificato`/`contestato`) | `stato` | `change_state` | `bollettino` | `successo` | `{etichetta, prima: {stato}, dopo: {stato}, motivo: note}` |
| **Verifica** del bollettino (conferma importi, congelamento % e importi §5.11) | `calcolo` | `verify` | `bollettino` | `successo` | `{etichetta, bollettino_id, periodo: {trimestre, anno}, importo_riconosciuto, importo_calcolato, differenza_totale}` |
| POST `/api/bollettini/:id/righe` | `crud` | `create` | `riga_bollettino` | `successo` | `{etichetta: fattura_numero · cliente_piva, bollettino_id, fattura_numero, fattura_data, cliente_piva, importo_merce, pct_riconosciuta, importo_riconosciuto, pct_calcolata, importo_calcolato, differenza}` |
| DELETE `/api/bollettini/:id/righe/:rid` | `crud` | `delete` | `riga_bollettino` | `successo` | `{etichetta, riga_bollettino_id, bollettino_id, fattura_numero, importo_riconosciuto, importo_calcolato}` |
| **Correzione manuale** di un importo (§5.13) | `crud` | `update` | `riga_bollettino` | `successo` | `{etichetta, riga_bollettino_id, bollettino_id, prima, dopo}` |

> Quando la verifica conferma anche il passaggio a `verificato`, si generano **due
> eventi**: `calcolo/verify` + `stato/change_state`.

#### 15.2.6 Liquidazione ed export (§8.1, §11)

| Operazione (API) | `tipo` | `azione` | `entita` | `esito` | `dettaglio` |
|------------------|--------|----------|----------|---------|-------------|
| GET `/api/liquidazione/export` | `export` | `export` | `liquidazione` | `successo` | `{etichetta: trimestre/anno, periodo: {trimestre, anno}, filtro: {fornitore?, subagente?}, n_righe, importo_totale}` |
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
- **riferimenti esterni** → `processing_errors_id` è l'**id** della riga di
  `processing_errors`, così la UI apre il dettaglio dell'errore della Gestione
  Ordini.

### 15.5 Errori applicativi

- Gli errori di validazione e 5xx arrivano al log tramite **handler globale**
  intermedio: nessuna eccezione gestita silenziosamente (catalogo §15.2.7).
- Al frontend viene restituito solo un **messaggio user-friendly**; il dettaglio
  tecnico (classe, messaggio) resta nel log e non viene mai esposto nel browser.
- Gli **errori di importazione OCR/validazione** restano di competenza della
  Gestione Ordini (`processing_errors`) e compaiono nel log come riferimento
  (§15.4) — non vengono duplicati nel testo dell'evento.

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
(`documento/upload` esito `errore` con `processing_errors_id`) per collaudare
filtri e dettaglio.

### 15.10 Riferimenti

Tabella: §4.2.11 · Schermata: §7.11 · API: §8.1 · Seed: §12 · Deliverable: §14 ·
Requisito: V10