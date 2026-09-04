# Specifica — CRM Ordini a Fornitore, Bollettini e Provvigioni (Decobrands)

**Versione:** 1.2 — **Stato:** validata con il cliente
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

---

## 2. Vincoli e requisiti generali

| # | Vincolo | Valore |
|---|---------|--------|
| V1 | Unica applicazione | Tutte le funzioni in un'unica applicazione web |
| V2 | Database condiviso | Stesso PostgreSQL (`decobrands`) della Gestione Ordini: tabelle esistenti riusate senza modificarle + tabelle nuove del CRM |
| V3 | Autenticazione | Tabella `users` con ruoli; utente di default `admin` (ruolo `admin`) |
| V4 | Stile grafico | Bootstrap 5.3, navbar scura, sfondo `#f5f6f8`, logo Decobrands |
| V5 | Lingua | Tutte le interfacce in italiano |
| V6 | Responsive | Desktop + tablet + mobile |
| V7 | Stack | Frontend Next.js (App Router) + React + TypeScript, backend NestJS, ORM Prisma, PostgreSQL condiviso (V2). Deploy senza Docker: frontend e backend girano come servizi/processi Node separati |
| V8 | Fidelità | Alta fedeltà — dati reali, interazioni reali |

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
| `ordini_upload_queue` | coda di elaborazione degli upload documenti |
| `audit_log` | log di tutte le scritture |
| `movimenti_giacenza` | movimenti stock |
| `processing_errors` | errori di elaborazione documenti |

> In `ordini_cliente_testata` il fornitore è una stringa libera; il CRM aggiunge
> l'anagrafica `fornitori` (§4.2.1) e collega le pratiche fornitore alla stessa
> `cliente_piva` usata negli ordini clienti.

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

### 4.3 Diagramma relazionale

```
fornitori 1 ── n provvigioni_scaglioni 1 ── n provvigioni_eccezioni (→ subagenti)
fornitori 1 ── n interscambio ── n 1 subagenti n ── 1 agenti
fornitori 1 ── n ordini_fornitore_testata 1 ── n ordini_fornitore_righe
fornitori 1 ── n bollettini_testata 1 ── n bollettini_righe
interscambio (cliente_piva, fornitore_id) → ordini_fornitore_testata (cliente_piva, fornitore_id)
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

### 6.1 Flusso documentale: ordine → conferma → fattura

```
[1] Ordine  ──carica documento + dati letti──►  pratica in stato "inviato"
[2] Conferma ──aggancio alla pratica──►  stato "confermato"  (quantità/importi possono variare)
[3] Fattura  ──aggancio alla pratica──►  stato "fatturato"   → entra nel calcolo provvigioni
```

- Ogni fase include **upload del documento PDF** allegato alla pratica
  (`att_filename_ordine` / `att_filename_conferma` / `att_filename_fattura`).
- Alla creazione della pratica si calcola `conferma_scadenza = data_ordine +
  giorni_attesa_conferma` del fornitore.
- Passata la scadenza senza conferma, la pratica finisce nella lista **segnalazioni**
  della dashboard (alert in-app, §5.12).
- La lettura automatica dei documenti propone i dati letti dal PDF; l'operatore li
  conferma prima del salvataggio.

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
| 4 | `/ordini-fornitore/:id` | Dettaglio pratica (3 pannelli documento + righe + storico) |
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

### 7.1 Dashboard (`/dashboard`)

- KPI: ordini in stato `inviato` / `confermato` / `fatturato`.
- **Segnalazioni**: ordini in attesa di conferma con scadenza superata (alert §5.12).
- **Bollettini da verificare**: bollettini in stato `da_verificare`.
- Ultimi ordini fornitore (8).
- Riepilogo provvigioni del trimestre corrente (totale merce fatturato).

### 7.2 Elenco ordini fornitore (`/ordini-fornitore`)

- Filtri: stato (`inviato`/`confermato`/`fatturato`), testo libero (numero ordine,
  cliente, fornitore). Paginazione.
- Colonna con n° righe; accesso al dettaglio.

### 7.3 Dettaglio pratica (`/ordini-fornitore/:id`)

- Dati testata (fornitore, numero/data ordine, cliente, agente, importo merce, stato,
  note).
- **3 pannelli documento**: Ordine / Conferma / Fattura, ciascuno con **upload PDF** e
  link all'allegato (`att_filename_*`).
- Campi conferma (data, numero, scadenza) e fattura (numero, data, importo).
- Tabella **righe** (numero riga, codice, descrizione, UM, q.tà, prezzo, importo) con
  aggiunta/eliminazione.
- Cambio stato guidato: `inviato → confermato → fatturato`.

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

- Filtri: fornitore, subagente, trimestre, anno.
- Riepilogo per subagente (n° fatture, totale merce, totale provvigione subagente).
- Rendiconto in dettaglio (riga per riga).
- **Export** con i campi §11.

### 7.9 Modulo ordini cliente

Ordini cliente, liste, articoli, giacenze, errori, clienti, utenti: viste integrate
nell'applicazione con lo stesso comportamento e lo stesso stile di tutte le altre.

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

### 8.2 Modulo ordini cliente

`/api/ordini*`, `/api/lookup/*`, `/api/clienti*`, `/api/utenti*`, `/api/errori*`: API del
modulo ordini cliente, montate sul server dell'applicazione; leggono e scrivono le
tabelle condivise di §4.1 (ordini cliente, clienti, articoli, giacenze, log).

### 8.3 Autenticazione

`/login` (POST), `/logout` (POST), `/cambia-password`, `/richiedi-reset`. Guard
`requireAuth` su tutte le rotte app, `requireAdmin` su clienti/utenti.

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
| Frontend Next.js + backend NestJS (Prisma), database, autenticazione, upload, real-time (§3.3, §8) | ⁄ in roadmap |
| Casi limite §13 (B1–B9) | ⏳ |