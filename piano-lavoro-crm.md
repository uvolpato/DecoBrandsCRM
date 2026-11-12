# Piano di lavoro — CRM Decobrands (fasi e attività parallele)

**Versione:** 2.0 — **04/11/2026:** tutte le ore segnate «da approvare» in questo piano sono **approvate da Ugo**: F4-A4 (2 h), F4-A6 (4 h), F4-A3 (+3 h), F1-A6 (4 h), la correzione D-62 di F3-A3 (1 h) e le attività già consegnate (F0-A3, F0-A4, F0-A7, F0-A8, F1-A4, F1-A7, F2-A1, F2-A4, F3-A3 nonché le pagine di F5/F6 ancora da fare). — versione 1.9 · **03/11/2026:** F2-A4 documenti della pratica per ogni fornitore, 8 h **da approvare** (D-60) · versione 1.8 · **Data:** 19/10/2026 (CRM staccato dalla Gestione Ordini, accesso con Microsoft 365 o link via email, registro unico, viste di Integra dal database ponte: F0-A3, F0-A8, F5-A2, F5-A5 con ore da approvare; spec D-29…D-32) · versione 1.7 (regola V12: tutto sul backend) · versione 1.6 (F1-A6 regole del subagente, da approvare) · versione 1.5 (F1-A5 percentuali datate ed eccezioni, approvate; riferimento alla checklist §1.1) · versione 1.4 (prototipo ufficiale `prototipo-alternativo/`, D-24: checklist §1.1 e file sorgente delle attività riscritti) · versione 1.3 del 15/10/2026 (ingresso documenti interno senza n8n, GLM-OCR in locale; modulo ordini cliente rinviato alla fase successiva)
**Derivato da:** `specifica-crm-provvigioni.md` v2.0 (§16) · **Ore:** 71 h di attività + 18 h di margine = 89 h (preventivo §4)
**Scopo:** suddividere l'implementazione in fasi e attività indipendenti, assegnabili ad **agenti in parallelo**, con **replicazione maniacale** del prototipo navigabile.

---

## 1. Principi

### 1.1 Replicazione maniacale del prototipo (definizione operativa)

Il prototipo ufficiale **`prototipo-alternativo/`** (spec §16.1, D-24) è la
**sorgente di verità visiva e comportamentale**:
- `index.html`, `assets/stile.css` e `assets/componenti.js`;
- le viste `assets/viste-*.js`;
- `assets/motore.js` e `assets/dati.js`.

Il primo prototipo `prototipo-crm/` (Bootstrap) è solo archivio. Ogni schermata
implementata deve superare questa checklist prima del merge (6 criteri, tutti
obbligatori):

1. **Struttura e navigazione** — barra laterale a gruppi con contatori, testata della pagina (*‹ Torna a …*, titolo, azioni, *Guida*), stesse rotte (spec §7.10), ritorno nello stesso punto (§7.12).
2. **Layout** — pagina alta quanto lo schermo, l'elemento che riempie (di norma la DataTable) prende lo spazio rimasto e scorre dentro; stessi pannelli, schede e colonne nello stesso ordine; nessun elemento sovrapposto o tagliato; sotto i 992 px flusso naturale.
3. **Componenti e stile** — schermata composta **solo** dai componenti standard (spec §16.4: Pagina, Pannello, Schede, DataTable, FilterBar, RiepilogoFiltri, KpiRow, CampoRicerca, PeriodoMesi, Grafico, Modale…) con gli stessi parametri del prototipo; `stile.css` **copiato, non riscritto**; Public Sans incorporato; niente Bootstrap.
4. **Testi** — etichette, titoli, segnaposto, messaggi vuoti, avvisi, note e Guida: **italiano identico parola per parola** al prototipo.
5. **Interazioni** — filtri standard e conteggi dal vivo (spec §16.4.1–§16.4.2), schede, finestre, campi di ricerca, conferme, avvisi, esportazioni: stesso comportamento e stessi messaggi.
6. **Dati** — seed §12 identico a `assets/dati.js` → **stessi numeri** in riquadri, tabelle, totali, grafici ed esportazioni; la verifica numerica è la prova oggettiva di replicazione.

**Verifica:** `strumenti/prove/flusso.py` sul prototipo come riferimento del comportamento; confronto affiancato tra schermata implementata e prototipo nel browser e
prototipo (struttura + testi) + confronto numerico sul seed. Le divergenze si
chiudono **prima del merge**, non in collaudo finale.

### 1.2 Regole di parallelizzazione

- **Attività = slice verticale con ownership disgiunta**: nessun file/modulo toccato da due agenti contemporaneamente. Se un'attività serve un oggetto condiviso, lo dichiara e lo crea nella **Fase 0** (o nel suo primo commit), non lo ridefinisce.
- ⚠ **Backend unica fonte dei calcoli** (spec V12, D-28): motore, regole, permessi ed eventi solo sul server; le API ricevono scelte, non risultati.
- **Contratti congelati in Fase 0**: schema tabelle §4.2, API §8 (firmi), motore di calcolo §10, helper `logEvent()` §15.3, seed §12. Le attività a valle consumano i contratti, non li modificano.
- **Ogni attività** riporta: ore, dipendenze, riferimenti di specifica, **file sorgente del prototipo da replicare**, output e DoD (Definition of Done).
- **Una PR per attività**, con checklist §1.1 allegata; il merge avviene solo a checklist superata.
- **Eventi applicativi (§15.2)**: a carico dell'attività che implementa il CRUD/operazione — il catalogo è tassativo (né più né meno eventi).
- **Seed per fasi**: la Fase 0 crea l'aggregatore `seed/00-base`; ogni attività aggiunge il proprio file (`seed/1x-*.ts` ecc.) senza toccare quello degli altri.

---

## 2. Stack tecnologico (confermato)

Lo stack **ricalca il Portale B2B Luis** (spec V7, §3.3, §3.4, §16.3):

- **Frontend:** Next.js 16 (App Router) + React 19 + TypeScript, `stile.css` del prototipo ufficiale (niente Bootstrap), Chart.js, ExcelJS, jsPDF;
- **Backend:** NestJS 11, DTO con `class-validator`, Prisma 7 (`@prisma/adapter-pg`);
- **Accesso e sicurezza:** `express-session` + `connect-pg-simple`, argon2, CSRF, Helmet, throttler;
- **Esercizio:** Caddy (HTTPS) → Next.js `localhost:8001` → inoltro `/api/*` → NestJS `localhost:8002` → PostgreSQL `decobrands_db` (istanza locale, PG 16); Docker solo in sviluppo; Node 24;
- **Varie:** `@nestjs/schedule` (conferme scadute, lettura casella), `exceljs` (bollettini/export), Jest + supertest;
- **Ingresso documenti (spec §6.5):** `imapflow`, coda su PostgreSQL (`FOR UPDATE SKIP LOCKED`), `pdftoppm`, **GLM-OCR su vLLM** nel server GPU locale — **nessun n8n**.

**Riuso da Luis B2B:** solo infrastruttura (sessioni, sicurezza, Prisma, registro eventi, utilità comuni, inoltro `/api/*`, pubblicazione) — elenco moduli in spec §16.3. **Nessun componente o CSS di Luis: layout e grafica sono quelli del prototipo** (§1.1).

**Prisma e database proprio (V2, D-29):** lo schema Prisma copre **tutte** le tabelle del
CRM (§4.2), nel database proprio `decobrands_db`; nessuna tabella della Gestione Ordini si legge o si
scrive. Le viste di Integra si leggono dal database ponte con un client `pg` in sola
lettura, fuori da Prisma (§4.5, D-32).

---

## 3. Fasi in riepilogo

| Fase | Ambito | Attività | Agenti paralleli | Ore | Dipende da |
|---|---|---|---|---|---|
| **F0** | Fondamenta: scaffold, DB, auth, shell + componenti, motore, prova GLM-OCR | 6 (A1–A6) | 1 → fino a 4 dopo A1 | **28** | — |
| **F1** | Anagrafiche (fornitori, agenti, interscambio) | 3 | **3 in parallelo** | **6** | F0 |
| **F2** | Pratiche ordini (lista, dettaglio, documenti, upload) | 3 | **3 in parallelo** | **6** | F0 |
| **F3** | Bollettini mensili | 2 | **2 in parallelo** | **4** | F0 |
| **F4** | Liquidazione (riepilogo, dettaglio, export) | 3 | **2–3 in parallelo** | **3** | F0 |
| **F5** | Dashboard + log eventi (`/eventi`) | 2 | **2 in parallelo** | **2** | F0 |
| **F6** | Ingresso documenti senza n8n (§6.5, §7.9) | 5 | **2–3 in parallelo** | **17** | F0 (A6 per la lettura) |
| **F7** | Collaudo, replicazione, rilascio | 1 (2 sottofasi) | 1–2 | **5** | merged F1–F6 |
| | | **23** | | **71** | |
| — | Margine di rischio 25 % (riserva, preventivo §4 att. 12) | — | — | **18** | — |
| | | | | **89** | |

```
F0-A1 (scaffold, modello Luis B2B)
        ├─ F0-A2 (DB + seed) ──┐
        ├─ F0-A3 (auth)        ├── F0-A4 (shell + componenti) + F0-A5 (motore + logEvent)
        │                       │
        ▼                       ▼
   ┌──────────── Fase 0 chiusa (contratti congelati) ────────────┐
   │  F1 ∥ F2 ∥ F3 ∥ F4 ∥ F5 ∥ F6        (6 filiere in parallelo) │
   └──────────────────────────────────────────────────────────────┘
                         │
                         ▼
              F7 collaudo + replicazione + rilascio
```

Totale ore verificato: 28 + 6 + 6 + 4 + 3 + 2 + 17 + 5 = **71 h** di attività + **18 h** di margine = **89 h** = preventivo §4. Il margine non è assegnato a una fase: si usa dove emergono imprevisti e si rendiconta a ore.

---

## 4. Fase 0 — Fondamenta (bloccante, 28 h)

#### F0-A1 · Scaffold applicativo — 3 h
- **Dipende da:** — · **Blocca:** tutte le attività
- **Riferimenti:** spec §3.4, §16.3, V7 (stack Luis B2B), V5 (italiano), V6 (responsive)
- **Sorgente prototipo:** `prototipo-alternativo/assets/stile.css` (intero file, copiato), `prototipo-alternativo/assets/font/` (Public Sans), `prototipo-alternativo/assets/lib/` (versioni di ExcelJS, jsPDF, Chart.js)
- **Output:** `frontend/` (Next.js) + `backend/` (NestJS + Prisma) sul modello di Luis B2B, import di `stile.css`, inoltro `/api/*`, `.env.example`, `avvia.bat`, Caddyfile.
- **DoD:** frontend su 8001 e backend su 8002 avviati; nessun CSS riscritto a mano; librerie alle stesse versioni del prototipo.

#### F0-A2 · Schema dati + seed — 6 h
- **Dipende da:** F0-A1 · **Blocca:** F1–F6 (lette/scritture), F0-A5
- **Riferimenti:** spec §4.2.1–4.2.13 (tabelle nuove, incl. `documenti_in_arrivo`/`documenti_campi`), §4.2.18 (`utenti`, `accessi_link`), §12 (seed), §4.3 (relazioni), §4.4 (note schema, `ordine_cliente_id`, `codice_cliente_fornitore`)
- **Sorgente prototipo:** `prototipo-alternativo/assets/dati.js` (struttura dei dati di prova = forma del seed)
- **Output:** schema Prisma tabelle CRM + migrazioni; nessuna tabella della Gestione Ordini (D-29); aggregatore seed con `seed/00-base`.
- **DoD:** migrazioni applicate sul database `decobrands_db`; seed §12 caricato; vincoli chiave presenti (`UNIQUE(fornitore_id, mese, anno)` bollettini, `UNIQUE(fornitore_id, codice_cliente_fornitore)` interscambio, FK `ordine_cliente_id`).

#### F0-A3 · Accesso con nome utente e password, come nella Gestione Ordini — 3 h + 2 h **da approvare**
- **Dipende da:** F0-A1 · **Blocca:** tutte le schermate login-guardate · **Serve dal cliente:** casella SMTP per le email (password provvisoria, password dimenticata)
- **Riferimenti:** spec §3.3, §4.2.18, §7.13, §8.3, §15.2.1, D-29, D-39
- **Sorgente prototipo:** il prototipo ufficiale **non ha la pagina di accesso**: si disegna con `stile.css` e i componenti (riquadro centrato con logo, nome utente o email, password, *Resta collegato*, *Entra*, *Password dimenticata?*; pagina del cambio password obbligatorio) e si fa approvare prima di svilupparla; la pagina Utenti del prototipo passa a nome utente, *Reimposta la password* e ruolo Superutente; in fondo alla barra laterale utente, ruolo ed *Esci* come nel prototipo (`componenti.js`, `CRM.Barra`)
- **Output:** sessioni, CSRF, Helmet, throttler ripresi da Luis B2B; tabella `utenti` propria con `username`, `password_hash` (scrypt), `deve_cambiare_password`; superutente unico creato da un comando del server; accesso, uscita, cambio password, password dimenticata (`accessi_link`, impronta SHA-256, 1 ora), nuova password provvisoria dall'amministratore; pagina di accesso approvata.
- **DoD:** entra solo chi ha credenziali giuste ed è attivo; messaggio uguale per ogni errore; con la password provvisoria non si apre nessuna pagina prima del cambio; link usato o scaduto rifiutato; risposta della password dimenticata uguale per email registrate e non; limite ai tentativi; eventi `auth/*` §15.2.1 scritti da `logEvent()` (F0-A5).
- **Ore:** 3 h del preventivo (sessioni, guard, pagina) + **1 h da approvare** (superutente, password provvisoria e password dimenticata, D-39; le 2 h di Microsoft 365 e link di D-30 non servono più) + **1 h da approvare** (nuova pagina di accesso scura con logo e finestra, prototipo e app, D-42).

#### F0-A4 · Shell layout comune + componenti standard — 5 h + 0,5 h + 1 h **da approvare**
- **Dipende da:** F0-A1 · **Blocca:** tutte le schermate
- **Riferimenti:** spec §7.10 (barra laterale e rotte), §7.12 (ritorno nello stesso punto), **§16.4, §16.4.1, §16.4.2 (componenti standard, filtri, conteggi)**
- **Menu per area (D-47, nelle 5 h):** aree a segmenti in cima alla barra, voci dell'area della pagina, area *Anagrafiche* → *Dati* (fatto, passo 1.16).
- **Schermi (D-44, da approvare 0,5 h):** pagina "usa un computer o un tablet" sotto i 744 px, nel layout radice con il CSS, uguale nel prototipo; prove a 1440 e 768 px.
- **Sagome di caricamento (D-59, da approvare 1 h):** componenti `Sagoma`, `SagomaTabella`, `SagomaSegmenti`, `SagomaRiquadri`, `SagomaMatrice`, `SagomaElenco`, `SagomaCorpo`/`SagomaScheda`; hook `useSagome` con soglia di ~150 ms; `DataTable` e `FilterBar` con `caricando`; integrazione in Pratiche, Pratica, Bollettini, Bollettino, Clienti, Fornitori, Subagenti, Utenti; catalogo e spec §16.4.3; prova `app_caricamento.py`.
- **Sorgente prototipo:** `prototipo-alternativo/assets/componenti.js` (intero: Pagina, Barra, Pannello, Schede, DataTable, FilterBar, RiepilogoFiltri, KpiRow, CampoRicerca/RicercaEntita, PeriodoMesi, Grafico, Modale, FormModal, Conferma, Avviso, Elenco, Binario, Matrice, Cerniera, Periodi, …, rotte e memoria `registra`), `prototipo-alternativo/assets/entita.js`, catalogo `prototipo-alternativo/assets/viste-componenti.js`; `stile.css`
- **Output:** layout comune (barra laterale a gruppi con contatori + testata della pagina + avvisi) e **libreria componenti React** con gli stessi nomi e parametri di `componenti.js`; pagina catalogo `/componenti` (solo admin) equivalente a `#/componenti`.
- **DoD:** ogni rotta eredita la shell senza duplicarla; ogni componente supera il confronto con il catalogo del prototipo (DataTable: riempie lo spazio, intestazione fissa, righe scorrevoli, ordinamento ▲▼, totali fissi, piede); nessuna tabella o modale scritta a mano fuori dalla libreria.

#### F0-A5 · Motore di calcolo §10 + contratto eventi — 7 h
- **Dipende da:** F0-A1, F0-A2 · **Blocca:** F2, F3, F4 (calcoli)
- **Riferimenti:** spec §10 (formulario), §5.1–5.13 (regole), §11 (export), §15.3 (`logEvent()` service, da modulo `audit` di Luis B2B), preventivo §4 att. 4 + 9
- **Sorgente prototipo:** `prototipo-alternativo/assets/motore.js` → `percentuali`, `statoPratica`, `riconcilia`, `righeLiquidazione`, `statoIncasso`, `trimestreLiquidazione`, `analisiTrimestre`, `fattiAnalisi`, `importoDoc`, `haVariazioni`, formattazione `euro`/`pct`/`data`
- **Output:** motore server-side: scaglioni, eccezioni, maturato/fatturato, congelamento percentuali (§5.11), netto documenti (fatture − NC §5.3), differenze bollettino, confronto fasi; helper `logEvent()` conforme §15.3 (stessa transazione, formato §15.4).
- **DoD:** test numerici (Jest) sui casi seed §12 (es. Gries 0/1/5/10/100 %, conferma ridotta 7/10, NC-2026-005) = stessi risultati del prototipo; nessun calcolo duplicato altrove (motore solo lato server).

#### F0-A6 · Prova GLM-OCR su documenti reali — 4 h
- **Dipende da:** F0-A1 · **Blocca:** F6-A2 (lettura); in parallelo ad A2–A5
- **Riferimenti:** spec V11, §6.5; preventivo §4 att. 11
- **Output:** GLM-OCR servito da vLLM sul server GPU del cliente; conferme, fatture e bollettini di 2–3 fornitori reali (Gries + un importatore) letti con lo schema e i `logprobs`; tabella esito per campo (valore atteso, letto, affidabilità); memoria video e tempi per pagina misurati.
- **DoD:** esito documentato; prime soglie di affidabilità proposte; stima dell'adattamento per fornitore consegnata al cliente prima di F6-A2.

#### F0-A7 · Prova di fattibilità: evidenziazione del valore nel documento — 6 h · **FUORI PREVENTIVO, DA APPROVARE**
- **Dipende da:** F0-A6 (stesso campione e stesso server) · **Blocca:** la parte "posizione" di F6-A2 e l'evidenziazione di F6-A4
- **Riferimenti:** spec §6.6 (in particolare §6.6.3), §4.2.13 `posizione` / `precisione`
- **Output:** classificazione dei PDF del campione (digitali / scansionati); posizioni ricavate da tre fonti (strato di testo con `pdfjs-dist`/`pdfplumber`; analisi della pagina GLM-OCR con PP-DocLayoutV3; PaddleOCR o Tesseract per gli scansionati); script di abbinamento valore → posizione; verifica a mano su ~300 campi; mappa delle colonne per i bollettini Excel di ogni fornitore.
- **DoD:** tabella esiti per tipo di file e per campo (% esatta corretta, approssimata, assente, **errata**); esito verde/giallo/rosso secondo le soglie §6.6.3; raccomandazione scritta da consegnare al cliente **prima** di confermare la funzione; ore di F6-A2/F6-A4 riviste di conseguenza.
- **Nota:** finché la prova non è fatta, la funzione è presentata al cliente come **da verificare** (avviso nel prototipo e in specifica §6.6).

---

#### F0-A8 · Viste di Integra sul database ponte — 2 h · **FUORI PREVENTIVO, DA APPROVARE**
- **Dipende da:** database ponte pronto (lo prepara Ugo, collegato a Integra) · **Blocca:** F1-A4
- **Riferimenti:** spec §4.5, §5.14 (email del cliente), D-32
- **Output:** lettura dei dati veri delle viste `v_clienti` e `v_fornitori`; colonne, tipi, chiave (codice Integra), data di ultima modifica per la lettura incrementale, email del cliente; casi da scartare (P.IVA mancante o doppia) contati sui dati reali; spec §4.5 aggiornata con il testo delle viste.
- **DoD:** spec §4.5 con le colonne vere; utente `crm_lettura` provato in sola lettura; domanda §5.14 sull'email del cliente chiusa o riportata a Matteo.

## 5. Fase 1 — Anagrafiche (6 h, 3 agenti in parallelo)

| Attività | Ore | Dipende da | Sorgente prototipo da replicare | Riferimenti spec |
|---|---|---|---|---|
| **F1-A1** Fornitori + scaglioni (CRUD, dettaglio, flag/stati) | 2 | F0 | `prototipo-alternativo/assets/viste-anagrafiche.js` (Fornitori: elenco, dettaglio a schede *Percentuali · Clienti seguiti*) | §4.2.1, §4.2.2, §7.4, §8.1, §15.2.2 |
| **F1-A2** Agenti + subagenti | 2 | F0 | `prototipo-alternativo/assets/viste-anagrafiche.js` (Subagenti: elenco e scheda) | §4.2.4, §4.2.5, §7.5, §8.1, §15.2.3 |
| **F1-A3** Clienti e agenzie (interscambio + codice cliente fornitore) | 2 | F0 | `prototipo-alternativo/assets/viste-anagrafiche.js` (Clienti: anagrafica da Integra in sola lettura, schede *Agenzie · Pratiche*, finestra dell'agenzia con campi di ricerca, blocco duplicati per fornitore) | §4.2.6, §4.4, §7.6, §8.1, §15.2.3 |
| **F1-A4** Sincronizzazione da Integra delle **anagrafiche clienti e fornitori**: viste sul database (`v_clienti`, `v_fornitori`), utente in sola lettura, processo ogni 60 s, incrementale, aggiorna solo i campi di Integra senza toccare i dati del CRM, registri di esecuzione e problemi (cliente senza P.IVA o P.IVA doppia), sezione delle impostazioni e *Prova la connessione*; sostituisce l'import da file | 3 · **da approvare** | F0-A2, F0-A8 | `prototipo-alternativo/assets/dati.js` (`sistema`, `impostazioni.integra`), `viste-gestione.js` (Impostazioni → Sincronizzazione da Integra) | §4.1, §4.5, §7.14, §7.15 |
| **F1-A5** Percentuali con data di validità (`valido_dal`, nuova versione da una data, calcolo per documento alla sua data) ed **eccezioni personali** dei subagenti (inserisci, modifica, elimina dalla scheda del subagente), API `/api/fornitori/:id/percentuali` e `/api/eccezioni`, eventi §15.2.2; **D-51**: ultima chiusura del fornitore, versioni anche fra due esistenti con correzione ed eliminazione dopo l'ultima chiusura, eccezioni con periodo proprio (cambio di % da una data, fine), migrazione delle eccezioni esistenti | 5 · approvate | F1-A1, F1-A2, F0-A5 | `prototipo-alternativo/assets/viste-anagrafiche.js` (`nuovePercentuali`, `modificaEccezione`), `motore.js` (`scaglione`, `percentuali`) | §4.2.2, §4.2.3, §5.2, §5.11, §7.4, §7.5, §10, D-25, D-26, D-51 |
| **F1-A6** Regole del subagente (D-27): % dell'agenzia e *una fattura al mese* nella finestra dell'agenzia; tabella `provvigioni_correzioni` e finestra *Correggi* in Liquidazioni con motivo obbligatorio; motore con l'ordine correzione → mensile → agenzia → eccezione → scaglione, usato da liquidazione, Analisi, pratica ed esportazione; API ed eventi | 4 · **da approvare** | F1-A3, F1-A5, F4-A2 | `motore.js` (`quotaSub`, `fatturaDelMese`), `viste-anagrafiche.js` (`modificaAgenzia`), `viste-periodo.js` (`correggiQuota`), `esporta-liquidazione.js` | §4.2.6, §4.2.7.2, §5.2, §7.6, §7.8, §10, D-27 |
| **F1-A7** Anagrafiche con identità e versioni (D-46): `clienti`/`fornitori` divise in identità + `_versioni` (si aggiungono soltanto, trigger) + `codici_esterni`; chiavi composte (id, versione) sui fatti — **schema anticipato nella fase 2a (D-48), qui resta la** sincronizzazione che aggiunge una versione solo se cambia un campo che conta; prove dei vincoli | 5 **da approvare** | F1-A4 | — | §4.6, §4.5, D-46 |
| **F1-A8a** Anagrafica unica a soggetti (D-102, D-103), **additiva**, solo server: `soggetti`, `sedi`, `recapiti`, `persone`, `persone_contatti`, `fatturazione`, `sconti`, `modifiche`, `gruppi`, `settori`; `soggetto_id` nullable UNIQUE su `clienti`/`fornitori`/`agenti`/`subagenti`; `codici_esterni.etichetta`; API `/api/soggetti` (elenco, scheda, identità, attivo, sedi, recapiti, persone, fatturazione, ruoli) e `/api/persone`; seed con 28 soggetti e MCL (D-101); nessuna FK dello strato 0 toccata (prove: conteggi identici, jest invariato, pratica/bollettino/documento leggibili dopo). **Fatta l'08/11/2026**: migrazione `20261108090000_anagrafica_soggetti`, 37 suite / 528 prove | 14 · **da approvare** | F1-A4, F1-A7 | — | `specifica-anagrafica-soggetti.md`, §4.2.20, §4.5, D-102, D-103 |
| | F1-A8b Pagine dell'anagrafica a soggetti: `/soggetti` (elenco con ricerca e segmenti, scheda a schede *Ruoli · Sedi · Recapiti · Fatturazione*, finestre di creazione e modifica), voce di menu, guida, `PAGINE` in `accesso.ts`, codice del soggetto in Clienti/Fornitori/Subagenti, prova `app_soggetti.py`. **Fatta l'08/11/2026**: `app_soggetti.py` 57 controlli 0 KO, altre prove 33/25/30/26, 528 prove server | 10 · **da approvare** | F1-A8a | `prototipo-alternativo/assets/viste-soggetti.js` | `specifica-anagrafica-soggetti.md`, §7.12, §16.1, D-59, D-102, D-103, D-104 |
| **F1-A9a** Import one-shot del **vecchio CRM** (`dati-crm-legacy/`, estratto 08/11/2026) con deduplica a P.IVA/CF, fusione dei doppioni in un soggetto con N sedi, ruoli cliente/fornitore, sedi, recapiti, persone, fatturazione, agenti/subagenti, `interscambio` e `sconti`, report di scarti e conflitti; comando `npm run import:vecchio-crm` in una transazione su `decobrands_import`. **Fatta il 09/11/2026**: 1884 soggetti, 1858 clienti, 20 fornitori, 1587 legami, 91 persone; punti aperti per Matteo nei report | 12 · **da approvare** | F1-A8 | — | `specifica-anagrafica-soggetti.md` §7, D-102, D-105 |
| **F1-A9b** Import one-shot da **Integra** dei soggetti con ruolo (`integra_v_clienti` + `integra_v_fornitori`) e dei **subagenti** (`integra_v_agenti`, D-109), e unione con i soggetti del vecchio CRM. **Schema e ponte fatti il 09/11/2026** (1 h, D-106): `agenti` fra le foreign table, vista `integra_v_agenti`, `schema-db-integra.md` corretto (`cliazi.cla_tipo='A'` = articoli, non agenti). **Il codice di import resta fermo** finché Matteo non decide `030` «DIREZIONALE», nome/cognome, riconciliazione con il vecchio CRM e agenti senza P.IVA. **Chiave dei soggetti: il codice master (`codice_master`, `cli_cdclistr`), non l'id numerico** (indicazione di Ugo, 09/11/2026). **Doppioni della sorgente** in `doppioni-anagrafica-integra.md` (16 P.IVA su due master, 11 agenti che sono anche fornitori, Decobrands con tre master, 23 P.IVA estere da normalizzare): si correggono in Integra prima dell'import. **Matteo (10/11/2026):** annotati i fogli 4-5 (Flover `D`, Toscana ed Eurosand da unire, Manfron `D`, `016`/`020` vecchi subagenti); fogli 1-3 aperti per Laura e Rosario. **Chiarimento 11/11/2026 (D-106, D-105):** l'agente è un ruolo del master e non è collegato al fornitore (codice agente su 674 clienti su 698, 0 fornitori su 115), quindi il suo codice **non** riempie `interscambio.subagente_id`: i 1625 legami senza subagente sono fornitori senza rappresentanza per quel cliente. **Ridotta l'11/11/2026 (D-111):** l'import massivo non si fa più; restano lo storico dei legami (F1-A12) e l'import su richiesta (F1-A11), e le decisioni di business di Matteo si prendono quando il primo documento le tocca | 2 · **da approvare** | F1-A9a, F0-A8 | — | `specifica-anagrafica-soggetti.md` §7, §8.5, D-102, D-105, D-106 |
| **F1-A10** Export verso Integra a file (CSV/Excel) dei soggetti nuovi o modificati dall'ultimo export, con evento `export.integra`; nessuna scrittura su Integra (D-100) | da stimare · **da approvare** | F1-A8, F1-A9 | — | `specifica-anagrafica-soggetti.md` §7.6, D-102 |
| **F1-A12** Storico dei legami del vecchio CRM (D-112): `interscambio_storico` (4022 righe, testi e id legacy, **nessuna FK obbligatoria**, indici su (fornitore, codice cliente), P.IVA, stato) e `soggetti_storico` (3403 schede); comando `npm run import:storico` idempotente in una transazione sul database dell'app, report di scarti; servizio di ricerca `legamiStorico` (per codice cliente del fornitore, poi P.IVA, poi nome) e `GET /api/interscambio/storico`; prove: conteggi, idempotenza, 1625 senza subagente, matching per codice e per P.IVA. **Fatta l'11/11/2026** (DeepSeek V4 Pro, OpenCode): migrazione `20261112090000_storico_legami`, import 4022 legami + 3403 schede (2 schede in errore negli scarti, 969 legami senza P.IVA cliente, 443 senza P.IVA fornitore), `cercaLegame`/`segnaUsata`, rotta, 10 prove; suite 547/0, `tsc` pulito | 7 · **da approvare** | F1-A8a | `app/backend/src/storico.ts` (nuovo), `app/backend/prisma/import-storico.ts` (nuovo), `dati-crm-legacy/` | §4.7.2-4.7.3, `specifica-anagrafica-soggetti.md` §7.8, D-112 |
| **F1-A11** Anagrafica su richiesta (D-111): `integra.ts` aggiorna e non crea più; `GET /api/integra/cerca` mirata (massimo 10 righe, codice/P.IVA/ragione sociale, solo su richiesta) e `POST /api/integra/importa` (soggetto + ruolo + `codici_esterni` + versione in una transazione, idempotente, evento `crud.create`); permesso **`dati.importa`** (operatore, area Dati); prove: creazione, ruolo aggiunto a un soggetto esistente, idempotenza, nessuna creazione dal giro di sincronizzazione, 403 senza permesso. **Fatta l'11/11/2026** (DeepSeek V4 Pro, OpenCode): permesso `dati.importa`, `src/anagrafica-integra.ts`, rotte con ricerca mirata e limite di 3 s, import idempotente per codice e P.IVA; prove `integra` 19 e `anagrafica-integra` 12 | 6 · **da approvare** | F1-A12 (per le prove sul riconoscimento), F0-A3 | `app/backend/src/integra.ts`, `app/backend/src/anagrafica-integra.ts` (nuovo), `app/backend/src/accesso.ts` | §4.7.1, §8.1, D-111 |
| **F1-A13** Scaglioni e agenzia al momento dell'import (D-113, D-112): form obbligatorio degli scaglioni per un fornitore senza percentuali (`dati.condizioni`, un blocco con il percorso), agenzia precompilata da `interscambio_storico` (subagente + sconto) con la riga che diventa `usata`, messaggi *«Mancano gli scaglioni»* / *«Questo fornitore non è rappresentato per questo cliente»*, pulsanti spenti con il motivo quando manca il permesso. **Fatta l'11/11/2026** (DeepSeek Flash, OpenCode): `mancano_scaglioni`, avviso nella scheda *Percentuali*, `storico_id` sull'agenzia con `segnaUsata` nella stessa transazione, form precompilato; corretto il matching dello storico su P.IVA e nome (gli id sono NULL nei dati veri) | 5 · **da approvare** | F1-A1, F1-A11, F1-A12 | `clienti/FormAgenzia.tsx`, `fornitori/…`, `app/backend/src/clienti.ts`, `app/backend/src/fornitori.ts` | §4.7.1-4.7.4, §7.6, D-113 |
| **F2-A6** Proposta del documento con l'import (D-111, D-112): esiti `fornitore_da_integra` e `cliente_da_integra` nel server e nel campo della lista, cliente proposto dai dati dello storico (nome, P.IVA, subagente, sconto), pillola e pulsante *Importa da Integra*, guardia *non rappresentato*; prove: documento con fornitore nuovo, con cliente noto solo dallo storico, con coppia senza subagente. **Fatta l'11/11/2026** (DeepSeek V4 Pro, OpenCode): contesto iniettato (proposta pura), tre esiti nuovi, lista con una ricerca per chiave distinta, card e pillole; prove proposta 50 e documenti 40 | 4 · **da approvare** | F1-A11, F1-A12 | `app/backend/src/proposta.ts`, `documenti/VistaDocumento.tsx`, `documenti/VistaDocumenti.tsx` | §7.9, §4.7.4, D-111, D-112 |
| **F1-A11b** Pagine Clienti e Fornitori con *Cerca in Integra* (D-111): ricerca mirata sotto il campo della lista, solo su richiesta, righe non ancora in anagrafica con il pulsante di import; guida aggiornata; prove browser a 1440 e 768 px. **Fatta l'11/11/2026** (DeepSeek Flash, OpenCode): componente `CercaInIntegra`, voce nel catalogo, guida; `app_clienti` 42 e `app_fornitori` 34 | 3 · **da approvare** | F1-A11 | `clienti/VistaClienti.tsx`, `fornitori/VistaFornitori.tsx` | §4.7.1, `lib/guida.ts`, D-111 |
| **F2-A7** Prove del percorso completo e documentazione: `app_import_anagrafica.py` (documento reale → fornitore importato → scaglioni → cliente dallo storico → pratica aperta) e `app_clienti.py` 33/`app_documenti.py` 40 aggiornate, 0 KO; schermate 1440/768; spec, guida, cataloghi allineati | 6 · **da approvare** | F1-A11, F1-A11b, F1-A13, F2-A6 | — | §4.7, §7.9, §8.1, D-111…D-113 |

- **F1-A6: 4 h fuori preventivo, da approvare** (agenzia 1 h, regola mensile 1,5 h, correzione sul documento 1,5 h).
- **F1-A5: 5 h fuori preventivo, approvate da Ugo il 02/11/2026** (percentuali datate 2 h, eccezioni 1 h; chiudono B3 e B1, spec D-25, D-26; **+2 h D-51**: un cambio vale da una data in poi e mai nel periodo chiuso, eccezioni con periodo, niente copie).
- **F1-A4: 3 h fuori preventivo, da approvare** (la sincronizzazione dalle viste sostituisce l'import da file, non previsto nel preventivo originale). Le viste stanno nel database ponte (F0-A8, D-32).
- **F1-A8a, F1-A8b, F1-A9, F1-A10: fuori preventivo, ore da stimare e da approvare** (D-102). F1-A8a fatta l'08/11/2026 (14 h proposte). Non sostituiscono F1-A4: la sincronizzazione resta per i soggetti già in Integra; cambia solo il padrone dei dati e si aggiunge l'export a file.
- **Output per ciascuna:** rotta pagina + API CRUD + eventi §15.2 + test delle regole univocità.
- **DoD comune:** checklist §1.1 superata; CRUD completo; eventi esatti (es. fornitore non eliminabile ma `attivo=false` §15.2.2).

## 6. Fase 2 — Pratiche ordini (6 h, 3 agenti in parallelo)

| Attività | Ore | Dipende da | Sorgente prototipo da replicare | Riferimenti spec |
|---|---|---|---|---|
| **F2-A1** Elenco pratiche (segmenti di stato con conteggi, filtri standard, segno delle variazioni); stato, importo e variazioni salvati sulla pratica e elenco in SQL (D-52) | 2 + 2 · **da approvare** | F0 | `prototipo-alternativo/assets/viste-giorno.js` (Pratiche: segmenti con conteggi, filtri standard, DataTable) | §7.2, §8.1, §15.2.4 |
| **F2-A2** Dettaglio pratica: binario delle fasi, schede *Riepilogo · Righe a confronto* con avviso delle variazioni, documenti affiancati | 2 | F0, F2-A1 | `prototipo-alternativo/assets/viste-giorno.js` (Pratica: binario delle fasi, schede *Riepilogo · Righe a confronto*, documenti affiancati) | §7.3, §6.1, §5.8, §5.9, §5.10, §15.2.4 |
| **F2-A3** Documenti fiscali (fatture/NC, netto) + canale comune upload/validazione §6 | 2 | F0 | card "Documenti fiscali", modale NC (§6 canale: upload → coda → validazione → salvataggio) | §4.2.7.1, §5.3, §6, §8.1 (`/api/pratiche/:id/documenti`), §15.2.4 |
| **F2-A4** Documenti della pratica per ogni fornitore (D-60): tipi ordine (1..n, si sommano), conferma e proforma facoltative, fattura e nota di credito, pagamento (segno *pagato*), altro; righe sul loro documento; abbinamento a mano di un file in coda (`POST /api/documenti/:id/abbina`, l'ordine apre la pratica); spostamento fra pratiche; foto nel canale ed Excel rifiutati; archivio per pratica | 8 · approvate (Ugo, 03/11/2026) | F2-A3 | `prototipo-alternativo/assets/motore.js` (`M.fasi` con documenti sommati, proforma) | §4.2.7–§4.2.8, §4.2.12, §6.1, §6.5, §7.3, §8.1, §9, §15.2.4 |
| **F2-A5** Agenzia mancante configurabile dal documento (D-106): esito `manca_agenzia` nella proposta con cliente, fornitore, codice e data; campo `manca_agenzia` nella lista; pillola e pulsante *Configura l'agenzia* con il form condiviso (cliente e fornitore fissi, data del documento); il 409 resta su registrazione, spostamento e abbinamento. **Fatta il 10/11/2026**: `app_documenti.py` 40 controlli, app_clienti 33, app_guida 26 | 4 · **da approvare** | F2-A2, F2-A4 | `documenti/VistaDocumento.tsx`, `documenti/VistaDocumenti.tsx`, `clienti/VistaClienti.tsx` (finestra dell'agenzia) | §7.6, §7.9, §8.1, D-50, D-106 |

- **F2-A1: 2 h fuori preventivo, da approvare** (D-52: colonne `importo`, `variazioni`, `variazione` sulla pratica, `aggiornaPratica` nella stessa transazione di ogni modifica, elenco con filtri, conteggi, ordinamento e pagine in SQL, `npm run pratiche:ricalcola`; ~10.000 pratiche: da 1,5–1,8 s a 10–35 ms).
- **F2-A4: 8 h fuori preventivo, da approvare** (D-60, arrivati i documenti veri: server, migrazione, motore e prove fatti; le pagine Pratica e Documenti vanno aggiornate a parte).
- **F2-A5: 4 h fuori preventivo, da approvare** (D-106: al primo ordine di una coppia cliente-fornitore manca l'agenzia, e prima lo si scopriva solo con un 409 alla registrazione).
- **Regola per F2-A3 e F6 (D-52):** ogni scrittura su documenti, righe o conferma di una pratica chiama `aggiornaPratica(tx, id)` nella stessa transazione.
- **Nota:** il confronto fasi non si salva: calcolato al volo da `F0-A5` sugli snapshot per fase (§4.2.8 `fase = ordine|conferma|fattura`).
- **DoD:**NC totale → provvigione 0; variazioni comparse/spariti evidenziate; cambio stato = evento `crud/update` + `stato/change_state` (due righe §15.2.4).

## 7. Fase 3 — Bollettini mensili (4 h, 2 agenti in parallelo)

| Attività | Ore | Dipende da | Sorgente prototipo da replicare | Riferimenti spec |
|---|---|---|---|---|
| **F3-A1** Matrice dei bollettini (fornitore × 6 mesi, selettore a mesi, filtri standard) + caricamento (mese/anno, controllo doppioni) | 2 | F0 | `prototipo-alternativo/assets/viste-periodo.js` (Bollettini: matrice fornitore × 6 mesi, PeriodoMesi, filtri standard) | §4.2.9, §5.6, §7.7, §15.2.5 |
| **F3-A2** Dettaglio bollettino (righe, riconosciuto vs calcolato, stati, differenze) | 2 | F0, F3-A1 | `prototipo-alternativo/assets/viste-periodo.js` (Bollettino: cerniera fornitore | nostro calcolo, decisioni, incassi) | §4.2.10, §6.2, §7.7, §15.2.5 |

| **F3-A3** Incassi dei clienti: stato d'incasso della fattura, righe di storno e riaccredito (fatturato), riconoscimento al pagamento su fatture di mesi precedenti e *in attesa di incasso* (maturato), `giorni_incasso` nelle condizioni del fornitore, gruppo *Pagamenti da sollecitare* in Oggi con un testo per cliente, storni e riaccrediti nella liquidazione | 4 · approvate (Ugo, 03/11/2026) | F3-A2, F4 | `prototipo-alternativo/assets/motore.js` (`statoIncasso`, `pagamentiDaSollecitare`, `trimestreLiquidazione`), `viste-periodo.js`, `viste-giorno.js` (`sollecitiPagamento`) | §5.5, §5.14, §6.2, §7.1, §7.7, §7.8, §15.2.5 |

- **DoD:** bollettino unico per `(fornitore, mese, anno)`; differenze = calcolo `F0-A5`; verifica/contestazione genera `calcolo/verify` + `stato/change_state` (§15.2.5).
- **F3-A3: 4 h fuori preventivo, da approvare** (regole chiarite da Decobrands il 16/10/2026; restano le domande di §5.14).
- **F3-A3: correzione del 04/11/2026, 1 h da approvare** (D-62): la nota della segnalazione d'incasso ha la sua colonna `nota_incasso` e non sovrascrive più la nota del documento.

## 8. Fase 4 — Liquidazione (3 h, 2–3 agenti in parallelo)

| Attività | Ore | Dipende da | Sorgente prototipo da replicare | Riferimenti spec |
|---|---|---|---|---|
| **F4-A1** Trimestri (riquadri dei periodi), elenco dei subagenti con totali che fa da filtro, chiusura del trimestre | 1 | F0 | `prototipo-alternativo/assets/viste-periodo.js` (Liquidazioni: trimestri, subagenti a sinistra, schede a destra) | §7.8, §6.3, §15.2.6 |
| **F4-A2** Scheda *Documenti* (liquidabili e in attesa, storni e riaccrediti, contatore nella scheda) | 1 | F0, F4-A1 | `prototipo-alternativo/assets/viste-periodo.js` (scheda *Documenti*) | §7.8, §15.2.6 |
| **F4-A3** Esportazione (§11): completa per subagente, un subagente, solo riepilogo; Excel curato con formule, PDF convertito dallo stesso Excel (LibreOffice), CSV di soli dati + trimestri | 4 (era 1: +3 h da approvare) | F4-A2 | `prototipo-alternativo/assets/esporta-liquidazione.js` | §11, §8.1 (`/api/liquidazione/export`), §15.2.6 |
| **F4-A4** Report subagenti nel pannello della liquidazione (scheda accanto a *Documenti*): grafico e tabella per subagente con confronto sul trimestre prima; con un subagente scelto 3 numeri, trimestri dell'anno, primi clienti (Chart.js + react-chartjs-2), API `/api/liquidazione/report` | 2 · **da approvare** | F4-A1 | `prototipo-alternativo/assets/viste-periodo.js` (`reportSubagenti`), `motore.js` (`analisiTrimestre`), `componenti.js` (`Grafico`) | §7.8, §16.4, D-18 |
| **F4-A5** Pagina **Analisi** (BI): API `/api/analisi` con aggregazioni sul server dai fatti del motore (`fattiAnalisi`, D-61; la vista `v_analisi_documenti` resta se i tempi crescono); periodo 3/6/12 mesi con PeriodoMesi, filtri fornitori/subagenti/clienti con campi di ricerca a selezione multipla (CampoRicerca `multipla`, D-20), filtro incrociato da grafici e righe, 4 numeri con periodo precedente, 4 grafici, tabella raggruppabile; esportazione Excel e CSV (i grafici come immagine e il PDF vanno con F4-A3) | 11 · approvate (Ugo, 03/11/2026) | F4-A4, F4-A3 | `prototipo-alternativo/assets/viste-analisi.js`, `motore.js` (`fattiAnalisi`), `esporta-liquidazione.js` (`esportaModello`, blocco immagine) | §7.22, §11, §16.4, D-18, D-19, D-61 |
| **F4-A6** Filtri standard e aggiornamento dei numeri: FilterBar con campi di ricerca multipli, riepilogo e azzeramento, conteggi dei segmenti sugli altri filtri (Pratiche, Bollettini, Cliente → Pratiche); evento *dati cambiati* (SSE `/api/eventi/flusso`) con contatori aggiornati da soli e avviso *Ci sono aggiornamenti · Aggiorna* per le tabelle | 4 · **da approvare** | F0-A4, F4-A5 | `prototipo-alternativo/assets/componenti.js` (`FilterBar`, `RiepilogoFiltri`, `CampoRicerca` multipla) | §16.4.1, §16.4.2, D-22, D-23 |

- **F4-A6: 4 h fuori preventivo, da approvare** (filtri standard 2 h, aggiornamento dal vivo dei numeri 2 h).
- **F4-A4 + F4-A5: 13 h fuori preventivo, da approvare** (sostituiscono le 3 h della sintesi, D-17 → D-18). Ripartizione F4-A5: dati e API 3 h, pagina con filtri e grafici 4 h, selezione multipla nel componente di ricerca (campo e maschera) 1 h, esportazione con grafici 3 h (i grafici come immagine e il PDF si chiudono con F4-A3).
- **DoD:** solo pratiche `fatturate` del trimestre del subagente; KPI = somma righe; export = 8 campi §11; evento `export/export` solo al download.
- **F4-A1: fatta il 04/11/2026** (pagina `/liquidazioni/:anno/:trimestre`, riquadri, subagenti, scheda *Documenti* con contatore, chiusura e fotografia; `documenti` nel `GET /api/liquidazioni`). La scheda *Documenti* prevista da **F4-A2** è compresa: F4-A2 è chiusa con F4-A1. La correzione della quota del subagente (D-27) resta in **F1-A6**.
- **F4-A4: fatta il 04/11/2026** (scheda *Report subagenti* accanto a *Documenti*: barre e tabella per subagente con quota e variazione sul trimestre prima; con un subagente i tre numeri, i trimestri dell'anno e i primi 5 clienti; `GET /api/liquidazione/report`, numeri da `analisiTrimestre` sul server).
- **F4-A6: fatta il 04/11/2026** (aggiornamenti dal server: `GET /api/eventi/flusso` SSE con un ciclo sul registro, `EventiProvider` e barra *Ci sono aggiornamenti · Aggiorna* in Pratiche e Bollettini; completati i filtri standard nella scheda *Pratiche* del cliente. Le altre pagine restano da collegare).

## 9. Fase 5 — Dashboard + registro (2 h, 2 agenti in parallelo)

| Attività | Ore | Dipende da | Sorgente prototipo da replicare | Riferimenti spec |
|---|---|---|---|---|
| **F5-A1** Oggi: gruppi di lavoro (documenti, conferme in ritardo, bollettini, pagamenti da sollecitare), scadenze, ultime operazioni, contatori della barra | 1 | F0 (+ dati da F1–F4 per popolare) | `prototipo-alternativo/assets/viste-giorno.js` (Oggi: gruppi di lavoro, scadenze, ultime operazioni) | §7.1, §5.12, §6.1 |
| **F5-A2** **Registro unico** (D-31): tabella `registro` per eventi e anomalie, `logEvent()` e `apriAnomalia()` con uno schema (zod) per codice, schermata `/registro` (filtri standard, *Anomalie aperte*, *Stessa operazione*, dettaglio in finestra, esporta CSV), pulizia notturna | 1 + 2 · **2 da approvare** | F0-A5 | — (nessuna schermata prototipo: nuova, stile identico alle liste) | §4.2.11, §7.11, §8.1, §15, D-31 |

| **F5-A3** Ruoli e permessi: `utenti.ruolo`, `requirePermesso()` su ogni rotta, interfaccia in sola lettura, barra per ruolo | 2 · **da approvare** | F0-A3 | `prototipo-alternativo/assets/motore.js` (`M.PERMESSI`), `componenti.js` (barra) | §8.3 |
| **F5-A4** Utenti e ruoli `/utenti` (elenco, scheda, modo di accesso, invito e link di accesso, vincoli) | 2 · **da approvare** | F5-A3 | `prototipo-alternativo/assets/viste-gestione.js` | §7.13 |
| **F5-A4b** Ruoli per area (D-45): ruolo di Sistema + livello per area (`utenti_aree`), permessi `area.attività`, migrazione dei ruoli esistenti, barra e sola lettura per area, *Cosa può fare ogni ruolo* per area; prototipo, server, app e prove | 3 **da approvare** | F5-A4 | `prototipo-alternativo/assets/motore.js`, `viste-gestione.js` | §8.3, §4.2.18, D-45 |
| **F5-A5** Stato del sistema `/sistema` + giri in `servizi_esecuzioni` e problemi come **anomalie del registro** (F5-A2), scritti dai servizi: controlli di salute ogni 5 minuti, calcolo dello stato, catalogo dei problemi con apertura, ripetizione e chiusura automatica, *Controlla adesso*, pulizia notturna. **Fatta (D-74):** `SistemaService` con prove iniettabili, `GET /api/sistema`, `/contatore`, visto/visti e *Controlla adesso* entro 30 s, pagina con riquadri-filtro e contatore nella barra, guida | 3 · **da approvare** | F6-A1 | idem | §7.14–§7.14.5, §4.2.15 |
| **F5-A6** Impostazioni `/impostazioni` (sei sezioni: azienda, casella, lettura, posta, integra, conservazione; password e segreti cifrati mai riletti, prova connessione sui valori salvati) | 3 · **da approvare** | F0 | idem | §7.15, §4.2.14 |
| **F5-A7** Documenti scartati `/scartati` (motivo, recupero, eliminazione automatica). **Fatta (D-74):** elenco con ricerca e segmenti per motivo, recupero fra i documenti da controllare (`documento/update`), eliminazione definitiva dell'amministratore con conferma, pulizia notturna, collegamento «N scartati» in Documenti, guida | 1 · **da approvare** | F6-A4 | idem | §7.16 |
| **F5-A8** Guida in linea `/guida` + pulsante *Guida* nelle testate | 2 · **da approvare** | F0-A4 | idem (`CRM.GUIDA`) | §7.17 |

- **Pagine di gestione (F5-A3…A8): 13 h fuori preventivo, da approvare.**
- **F5-A2: 2 h fuori preventivo, da approvare** (registro unico al posto di `eventi_app` + `servizi_problemi`: schema per codice, vita delle anomalie, pagina con le anomalie; D-31).
- **Nota:** la scrittura degli eventi **non** è di F5: la fa l'attività che implementa ogni operazione (§15.2 tassativo). F5 costruisce solo lettura/filtri/export.

## 10. Fase 6 — Ingresso documenti senza n8n (17 h, 2–3 agenti)

| Attività | Ore | Dipende da | Sorgente prototipo | Riferimenti spec |
|---|---|---|---|---|
| **F6-A1** Ricezione e coda: lettura casella (`imapflow`, lavoro pianificato ogni N minuti da Impostazioni → Casella; allegati PDF/JPEG/PNG in `riceviDocumento`, doppioni ignorati, email lette spostate), caricamento manuale già fatto (F2-A3), coda con `SKIP LOCKED` e 3 tentativi (`prelevaDocumento`/`letturaFallita`), anomalie `casella.*` e `lettura.fallita` | 3 | F0 | — | §4.2.12, §6.5 punti 1–2, §8.1 |
| **F6-A2** Servizio di lettura con **connettore** (D-67) e **modello scelto da un menu** con parametri separati per modello (D-68): `llamacloud_eu` oggi (file → estrazione con lo schema del tipo, confidenza per campo e citazioni con riquadro, file cancellato dal cloud), connettore locale GLM-OCR/vLLM previsto dallo stesso seam e acceso quando arriva la macchina; **schema unico** con il tipo letto dal modello (D-69); righe multipagina già unite dal connettore (`per_doc`); **Excel dei bollettini rinviati (D-60)**; servizio di coda (`LetturaService`, un documento ogni 15 s), salvataggio in `documenti_campi` e `servizi_esecuzioni` | 6 | F0-A6 (solo per il locale) | - | §6.5 punti 3-4, §6.6, §4.2.13, §4.2.15, V11, D-67, D-68, D-69 |
| **F6-A3** Controlli fissi, livello del documento e proposta di abbinamento: `src/proposta.ts` (`lettoDaCampi`, `risolviFornitore` per nome normalizzato D-71, `propostaDocumento` con esiti `doppio`/`bollettino`/`nuova`/`certo`/`probabile`/`ambiguo`/`nessuno` e candidati ordinati per articoli in comune, `controlliFissi` con codici `bollettino`/`codice_cliente`/`totale`/`riga`/`articolo`/`data`, `valutaLettura` con `tipo` escluso); salvataggio della lettura che risolve fornitore, livello e controlli nella stessa transazione; schema di lettura con `riferimento_fattura` e righe del bollettino come fatture del mese | 2 | F0-A5, F6-A2 | `prototipo-alternativo/assets/motore.js` (`proposta`, `daFare`) | §6.5 punti 5–6 |
| **F6-A4a** Rotte della pagina Documenti (server): `GET /api/documenti` (segmenti di stato e conteggi, ricerca, tipo, livello, pagine), `GET /api/documenti/:id` (campi, testata e righe dai valori finali, proposta e `bollettino.esiste`), `PUT /api/documenti/:id` (correzione con testata e righe, tutto verificato, rinumerazione, ricalcolo di livello e controlli, evento `documento/update`), `POST /api/documenti/:id/scarta` (`documento/update`); `lettoDaCampi` preferisce `valore_finale`; prove delle quattro rotte | 2 | F0-A4, F6-A3 | — | §6.5 punto 7, §7.9, §8.1, §15.2.4, D-72 |
| **F6-A4b** Pagine di F6-A4: **una pagina sola** `/documenti` come il prototipo, elenco selezionabile a sinistra (caricamento, tipo e numero, importo, fornitore, livello) e documento scelto a destra (dati letti in colonne, schede *azione proposta* e *Righe lette*, *Correggi i dati letti* e *Scarta il documento* nel pannello; `/documenti/:id` per il collegamento diretto); il PDF o la foto stanno nella finestra di correzione a tutto schermo (file a sinistra, testata e righe a destra, bordi 0,90/0,70 fissi, PDF alla pagina del campo; rettangolo solo se F0-A7 lo valida); abbina, apri la pratica, registra il bollettino, scarta; guida e prova browser a 1440 e 768 px | 2 | F6-A4a | `prototipo-alternativo/` vista Documenti | §6.5 punto 7, §7.9, D-73 |
| **F6-A4c** Ritocchi pre-collaudo: numeri del menu (D-75), *Torna a …* (D-76), ✓ per campo (D-77), *Consulta affiancati* (D-78), pillola del titolo (D-79); PDF riapribile dal pannello Documenti | 2 | F6-A4b | `prototipo-alternativo/` | §7.1, §7.3, §7.9, §7.12, D-75…D-79 |
| **F6-A5** Quando arriva la macchina del cliente: installazione in esercizio del servizio locale (vLLM, avvio automatico, controllo stato) e prima taratura delle soglie sui documenti reali | 2 | F6-A2 + macchina GPU | — | §6.5 punto 8, §3.4, D-67 |

- **DoD:** un PDF inviato alla casella o caricato compare in `/documenti` letto, con affidabilità per campo e livello; correzioni salvate in `documenti_campi`; nessun n8n e nessuna chiamata a servizi esterni; eventi `documento/*` §15.2.4 scritti.
- L'**ingresso degli ordini cliente** (sostituzione completa della Gestione Ordini) è nella fase successiva, spec §17; la vendita diretta è un ampliamento futuro (§10.1).

### 10.1 Vendita diretta dalla Gestione Ordini — ampliamento futuro, fuori da questo piano (12 h indicative)

> Decisione: la vendita diretta è un ampliamento successivo (spec §17). Le attività restano qui come stima indicativa; nel prototipo le pagine sono spente.

| Attività | Ore | Dipende da | Sorgente prototipo | Riferimenti spec |
|---|---|---|---|---|
| **F8-A1** Sincronizzazione da Integra di **articoli, giacenze e ordini registrati** (`v_articoli`, `v_giacenze` ogni 15 s, `v_ordini_registrati` che chiude gli impegni), sullo stesso processo di F1-A4 | 2 · ampliamento | F1-A4 | `prototipo-alternativo/assets/dati.js` | §4.5, §4.2.16 |
| **F8-A2** Articoli e Giacenze (sola lettura), impegni e disponibile | 2 · ampliamento | F8-A1 | `assets/viste-vendita.js`, `assets/motore-vendita.js` | §7.19, §7.20, §4.2.16 |
| **F8-A3** Alias e kit (CRUD, controlli, permesso `magazzino`) | 2 · ampliamento | F0-A4 | idem | §7.21, §8.3 |
| **F8-A4** Ordini cliente: elenco, scheda, controlli, proposte alias/kit (casi A/B/C) | 3 · ampliamento | F8-A2, F8-A3 | idem | §7.18 |
| **F8-A5** Esportazione OC/OF: tracciato Integra a 28 colonne, nomi file, impegni, esporta di nuovo, annulla, eventi | 3 · ampliamento | F8-A4 | `assets/esporta-integra.js` | §7.18, §4.2.17, §15.2.6.1 |

- **DoD:** un ordine cliente con alias e kit si esporta in OC e OF con lo stesso contenuto dei file della Gestione Ordini; il disponibile scende subito e torna quando la sincronizzazione vede l'ordine registrato o l'esportazione viene annullata.
- **Vendita diretta (F8): ampliamento futuro, 12 h indicative, da quotare quando si avvia.** La sincronizzazione delle anagrafiche clienti e fornitori è in questa fase (F1-A4).

## 11. Fase 7 — Collaudo e rilascio (5 h)

#### F7-A0 · Correzioni di sicurezza dopo l'audit OWASP — 3 h **da approvare**
- **Dipende da:** merge F1–F6 · **Output:** le correzioni di D-80…D-86 con le loro prove: formula injection nei CSV (liquidazione, Analisi, Registro con un solo `cella`), limite ai tentativi davvero per persona e tetto ai caricamenti (`TENTATIVI_CARICAMENTI`), casella che legge la dimensione prima del download, permessi di solleciti e documenti scartati, `NODE_ENV` obbligatorio con il testo delle email nel log solo in sviluppo, registro senza identificativo di sessione e senza messaggio delle eccezioni, CSP completa delle pagine.
- **DoD:** `npm test` 0 KO (35 suite, 487 prove); prove browser del collaudo 0 KO; documenti allineati nello stesso commit.
- **Ore:** 3 h **fuori preventivo**: non entrano nel totale di §4 finché Ugo non le approva.

#### F7-A1 · Verifica replicazione + E2E — 3 h
- **Dipende da:** merge F1–F6 · **Output:** report checklist §1.1 per **tutte** le schermate (una riga per criterio), test E2E su flussi critici (stati pratica, NC → netto, multifiltro, export, eventi)
- **DoD:** 6/6 criteri su ogni schermata; numeri seed §12 identici al prototipo; zero divergenze aperte.

#### F7-A2 · Responsive + collaudo dati + rilascio — 2 h
- **Dipende da:** F7-A1 · **Riferimenti:** V6 (desktop/tablet/mobile), §3.2, §14
- **Output:** rifiniture responsive (nessun overflow orizzontale), collaudo con seed §12 e dati reali di prova, build di produzione, pubblicazione **senza Docker** (Caddy + Next.js 8001 + NestJS 8002), nota di rilascio.
- **Prima del rilascio (Ugo, 07/11/2026):** l'app si prova **con dati veri**; la pubblicazione viene **dopo** questa prova. Il deploy è **solo di `app/`**, non di tutta la repository (sparse checkout `app`): la radice con specifica, prototipo e strumenti non va sul server.
- **DoD:** app avviata in produzione; elenco attendibile del backlog §13 non toccato.

#### F7-A3 · Profilo, pagina di ingresso e timeout — 4 h **da approvare**
- **Dipende da:** F7-A1 · **Riferimenti:** §3.3, §7.23, D-88, D-89
- **Output:** pagina `/profilo` (dati in sola lettura, aree con il livello, pagina di ingresso per area, sicurezza); `utenti.ingressi` con migrazione; `GET /api/accesso/io` e `PUT /api/accesso/profilo` che validano area, percorso e permesso; menu dell'utente e atterraggio dopo l'accesso sulla pagina scelta; timeout di inattività di 30 minuti (`SESSION_TIMEOUT_MINUTI`), SSE esclusa, 401 che riporta all'accesso.
- **DoD:** `test/profilo.spec.ts` e `app_profilo.py` 0 KO; 1440 e 768 px; documenti allineati.
- **Ore:** 4 h **fuori preventivo** (1,5 server + 1,5 pagina + 1 prove e documenti): non entrano nel totale di §4 finché non sono approvate.

#### F7-A4 · Onda 0 bis del collaudo — correzioni su Documenti e anagrafiche — 6 h **da approvare**
- **Dipende da:** merge F1–F6 · **Riferimenti:** D-133…D-138, §4.7, §6.5, §7.9
- **Output:** righe del documento salve nella correzione e import da Integra che collega il documento nella stessa transazione (0b-01/0b-02, 2 h); storico senza fornitore nell'elenco, scaglioni alla data del documento, agenzia alla data dell'ordine (D-137), P.IVA con «IT», clienti e storico letti una volta per pagina (0b-02, compreso nel conteggio sopra); storico consumato una volta, subagente deciso dal server (D-134), sconti in vigore dal server, sagome e 409 sull'eliminazione dell'agenzia con sconti (0b-03, 1 h); soggetti da Integra in sola lettura e versioni sulla P.IVA (D-138) con la scheda del soggetto (0b-04, 1,5 h); *Importa* che apre la scheda (D-135) e riga dei filtri nei Clienti (0b-05, 1 h); i segni «Fornitore in Integra» e «Cliente in Integra» in elenco (0b-06).
- **Da aggiungere:** le ore di 0b-01 (import da Integra dal documento: collegamento in transazione, tempi del ponte, codice sui ruoli, lucchetto) e della sua correzione di review, non conteggiate qui.
- **Ore:** 6 h **fuori preventivo**: non entrano nel totale di §4 finché Ugo non le approva.

---

## 12. Regole di consegna per agente (riepilogo)

- ⚠ **Tutto sul backend, MAI dai dati del frontend** (spec V12, D-28): ogni calcolo (provvigioni, bollettini, liquidazione, Analisi, totali, esportazioni) e ogni operazione sensibile (stati, verifiche, chiusure, abbinamenti, correzioni, permessi, eventi) si esegue sul server partendo dal database; il frontend mostra e invia solo le scelte (id, valori digitati, motivo); il server ricarica, ricontrolla e ricalcola, e non salva mai un valore calcolato arrivato dal browser. Il prototipo calcola nel browser solo perché è una dimostrazione. Vale per **ogni attività**: una PR che la viola non si unisce.


- **Perché prima del cosa**: prima di implementare o cambiare un comportamento leggere il motivo nel registro delle decisioni (spec §19); se il codice si discosta dalla specifica, motivo nella PR e nuova riga al §19; commento breve nel codice che rimanda alla decisione nei punti non ovvi.
1. **Prima** leggere la sezione di specifica citata nell'attività + i file prototipo indicati. **Il prototipo vince** su ogni interpretazione stilistica.
2. CSS: si usa `stile.css` del prototipo ufficiale così com'è; nuove regole solo se il prototipo le ha (altrimenti si replica il pattern più vicino e si segnala).
3. Testi: copiare le stringhe dal prototipo; niente sinonimi "migliori".
4. Eventi: §15.2 per operazione, scrittura nel service layer (§15.3), mai dal client.
5. Tabelle legacy: **solo lettura** (V2) salvo le scritture già previste dalla Gestione Ordini.
6. Prima del merge: checklist §1.1 compilata + `git diff --check` + test numerici seed.
7. Conflitti: se due attività necessitano dello stesso file condiviso, la prevale in Fase 0 o l'attività lo dichiara all'orchestratore — mai edit contemporanei.

## 13. Riferimenti

Specifica: `specifica-crm-provvigioni.md` v2.0 (§16, §6.5, §17) · Preventivo: `preventivo-crm-provvigioni.md` (89 h da svolgere, margine incluso) ·
Prototipo sorgente: `prototipo-alternativo/` (D-24; `prototipo-crm/` solo archivio) · Stile: `prototipo-alternativo/assets/stile.css` · Seed: spec §12 · Eventi: spec §15
