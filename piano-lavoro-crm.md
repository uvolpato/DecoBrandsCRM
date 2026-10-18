# Piano di lavoro — CRM Decobrands (fasi e attività parallele)

**Versione:** 1.3 · **Data:** 15/10/2026 (ingresso documenti interno senza n8n, GLM-OCR in locale; modulo ordini cliente rinviato alla fase successiva)
**Derivato da:** `specifica-crm-provvigioni.md` v2.0 (§16) · **Ore:** 71 h di attività + 18 h di margine = 89 h (preventivo §4)
**Scopo:** suddividere l'implementazione in fasi e attività indipendenti, assegnabili ad **agenti in parallelo**, con **replicazione maniacale** del prototipo navigabile.

---

## 1. Principi

### 1.1 Replicazione maniacale del prototipo (definizione operativa)

Il prototipo (`prototipo-crm/*.html` + `assets/css/crm.css` + `assets/js/app.js`) è la
**sorgente di verità visiva e comportamentale**. Ogni schermata implementata deve
superare questa checklist prima del merge (6 criteri, tutti obbligatori):

1. **Struttura e navigazione** — stesse aree nella stesso ordine: navbar fissa (logo + "CRM" → launcher, versione, link Launcher, voci di sezione §4.2), contenuto, footer fisso centrato; stesse rotte e breadcrumb (§7).
2. **Layout** — stesse card/sezioni/tabelle nello stesso ordine e con le stesse proporzioni; tabelle avvolte in `.table-box`/`.box-stabile` (altezze, scroll, thead sticky) con `thead class="table-dark"` (§2-V9); nessun elemento sovrapposto o tagliato.
3. **Componenti e stile** — schermata composta **solo** dai componenti standard (spec §16.4: DataTable, FilterBar, KpiRow, Tabs, Pannello, Form/FormModal…) con gli stessi parametri del prototipo; Bootstrap 5.3.2 + bootstrap-icons identichi e `crm.css` **copiato, non riscritto** (token, `.kpi-card`, `.tabs-crm`, `.badge-stato`, `.riep-card`, `.doc-chip`, `.db-footer`, bottoni e stati).
4. **Testi** — etichette, titoli, empty state, avvisi, note (es. nota regole §5 in Liquidazione): **italiano identico parola per parola** rispetto al file HTML del prototipo.
5. **Interazioni** — filtri (incl. multifiltro checkbox), tab, modali, stepper 4 passi, conferme, toast, export CSV, stati hover/focus/disabled: stesso comportamento e stessi messaggi.
6. **Dati** — seed §12 identico (`pratica`: stesso set di ordini/bollettini/anagrafiche) → **stessi numeri** in KPI, tabelle e totali; la verifica numerica è la prova oggettiva di replicazione.

**Verifica:** confronto side-by-side tra schermata implementata e sorgente HTML del
prototipo (struttura + testi) + confronto numerico sul seed. Le divergenze si
chiudono **prima del merge**, non in collaudo finale.

### 1.2 Regole di parallelizzazione

- **Attività = slice verticale con ownership disgiunta**: nessun file/modulo toccato da due agenti contemporaneamente. Se un'attività serve un oggetto condiviso, lo dichiara e lo crea nella **Fase 0** (o nel suo primo commit), non lo ridefinisce.
- **Contratti congelati in Fase 0**: schema tabelle §4.2, API §8 (firmi), motore di calcolo §10, helper `logEvent()` §15.3, seed §12. Le attività a valle consumano i contratti, non li modificano.
- **Ogni attività** riporta: ore, dipendenze, riferimenti di specifica, **file sorgente del prototipo da replicare**, output e DoD (Definition of Done).
- **Una PR per attività**, con checklist §11.1 allegata; il merge avviene solo a checklist superata.
- **Eventi applicativi (§15.2)**: a carico dell'attività che implementa il CRUD/operazione — il catalogo è tassativo (né più né meno eventi).
- **Seed per fasi**: la Fase 0 crea l'aggregatore `seed/00-base`; ogni attività aggiunge il proprio file (`seed/1x-*.ts` ecc.) senza toccare quello degli altri.

---

## 2. Stack tecnologico (confermato)

Lo stack **ricalca il Portale B2B Luis** (spec V7, §3.3, §3.4, §16.3):

- **Frontend:** Next.js 16 (App Router) + React 19 + TypeScript, Bootstrap 5.3.2 + `crm.css` del prototipo;
- **Backend:** NestJS 11, DTO con `class-validator`, Prisma 7 (`@prisma/adapter-pg`);
- **Accesso e sicurezza:** `express-session` + `connect-pg-simple`, argon2, CSRF, Helmet, throttler;
- **Esercizio:** Caddy (HTTPS) → Next.js `localhost:8001` → inoltro `/api/*` → NestJS `localhost:8002` → PostgreSQL `decobrands`; Docker solo in sviluppo; Node 24;
- **Varie:** `@nestjs/schedule` (conferme scadute, lettura casella), `exceljs` (bollettini/export), Jest + supertest;
- **Ingresso documenti (spec §6.5):** `imapflow`, coda su PostgreSQL (`FOR UPDATE SKIP LOCKED`), `pdftoppm`, **GLM-OCR su vLLM** nel server GPU locale — **nessun n8n**.

**Riuso da Luis B2B:** solo infrastruttura (accesso, sicurezza, Prisma, registro eventi, utilità comuni, inoltro `/api/*`, pubblicazione) — elenco moduli in spec §16.3. **Nessun componente o CSS di Luis: layout e grafica sono quelli del prototipo** (§1.1).

**Prisma e DB condiviso (V2):** lo schema Prisma copre **solo le tabelle nuove del CRM
(§4.2)**; le tabelle esistenti della Gestione Ordini si leggono in sola lettura, **mai
migrate**.

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
- **Sorgente prototipo:** `assets/css/crm.css` (intero file, copiato), `login.html` (CDN: Bootstrap 5.3.2 CSS/JS bundle + bootstrap-icons 1.11.3)
- **Output:** `frontend/` (Next.js) + `backend/` (NestJS + Prisma) sul modello di Luis B2B, import di `crm.css`, inoltro `/api/*`, `.env.example`, `avvia.bat`, Caddyfile.
- **DoD:** frontend su 8001 e backend su 8002 avviati; nessun CSS riscritto a mano; CDN/moduli identici al prototipo.

#### F0-A2 · Schema dati + seed — 6 h
- **Dipende da:** F0-A1 · **Blocca:** F1–F6 (lette/scritture), F0-A5
- **Riferimenti:** spec §4.2.1–4.2.13 (tabelle nuove, incl. `documenti_in_arrivo`/`documenti_campi`), §4.1 (tabelle legacy read-only), §12 (seed), §4.3 (relazioni), §4.4 (note schema, `ordine_cliente_id`, `codice_cliente_fornitore`)
- **Sorgente prototipo:** `assets/js/data.js` (struttura dati demo = forma del seed)
- **Output:** schema Prisma tabelle CRM + migrazioni; introspection letta sulle tabelle esistenti **senza migrazione** (V2); aggregatore seed con `seed/00-base`.
- **DoD:** migrazioni riusate su DB `decobrands`; seed §12 caricato; vincoli chiave presenti (`UNIQUE(fornitore_id, mese, anno)` bollettini, `UNIQUE(fornitore_id, codice_cliente_fornitore)` interscambio, FK `ordine_cliente_id`).

#### F0-A3 · Autenticazione condivisa — 3 h
- **Dipende da:** F0-A1 · **Blocca:** tutte le schermate login-guardate
- **Riferimenti:** spec §3.3, §8.3, preventivo §4 att. 2 (sessioni server-side su PostgreSQL, argon2, remember cookie, `requireAuth`/`requireAdmin` — stessa tabella `users`)
- **Sorgente prototipo:** `login.html` (UI: card, "← Torna al launcher", versione `.7rem opacity .6` §24)
- **Output:** moduli di accesso ripresi da Luis B2B (sessioni, CSRF, Helmet, throttler) sulla tabella `users` condivisa; login/logout/reset/cambio password, guard admin, UI login identica; **verifica compatibilità sessioni con la Gestione Ordini** (se incompatibili: login separato, stesse credenziali — spec §3.3).
- **DoD:** accesso con utenti della Gestione Ordini; UI login = prototipo (checklist §11.1); eventi `auth/*` §15.2.1 scritti da `logEvent()` (F0-A5).

#### F0-A4 · Shell layout comune + componenti standard — 5 h
- **Dipende da:** F0-A1 · **Blocca:** tutte le schermate
- **Riferimenti:** spec §4.2 (navbar), §7.10, **§16.4 (componenti standard)**; STILE-GUIDA §4.2
- **Sorgente prototipo:** `assets/js/app.js` → `navbar()`, `footer()`; **`assets/js/componenti.js`** (intero: Intestazione, DataTable, FilterBar, KpiRow, Riepilogo, Tabs, Pannello, Form, FormModal, Stepper, Nota, badge) e catalogo `componenti.html`; `crm.css` (layout a tutta altezza `.crm-pagina`/`.crm-riempi`, `.dt-*`)
- **Output:** layout route (navbar fissa + footer fisso + toast) e **libreria componenti React** con gli stessi nomi e parametri di `componenti.js`; pagina catalogo `/componenti` (solo admin) equivalente a `componenti.html`.
- **DoD:** ogni rotta eredita la shell senza duplicarla; ogni componente supera il confronto con il catalogo del prototipo (DataTable: riempie lo spazio, intestazione fissa, righe scorrevoli, ordinamento ▲▼, totali fissi, piede); nessuna tabella o modale scritta a mano fuori dalla libreria.

#### F0-A5 · Motore di calcolo §10 + contratto eventi — 7 h
- **Dipende da:** F0-A1, F0-A2 · **Blocca:** F2, F3, F4 (calcoli)
- **Riferimenti:** spec §10 (formulario), §5.1–5.13 (regole), §11 (export), §15.3 (`logEvent()` service, da modulo `audit` di Luis B2B), preventivo §4 att. 4 + 9
- **Sorgente prototipo:** `assets/js/app.js` → `commissionePerOrdine`, `rigaBollettinoCalcolata`, `confrontoFasi`, `documentiOrdine`, `importoNettoOrdine`, `fasiOrdine`, `haVariazioni`, `inTrimestre`, helper `fmt*`/`meseLabel`
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

## 5. Fase 1 — Anagrafiche (6 h, 3 agenti in parallelo)

| Attività | Ore | Dipende da | Sorgente prototipo da replicare | Riferimenti spec |
|---|---|---|---|---|
| **F1-A1** Fornitori + scaglioni (CRUD, dettaglio, flag/stati) | 2 | F0 | `fornitori.html`, `fornitore-dettaglio.html` (tab scaglioni in `.box-stabile`, thead scuro) | §4.2.1, §4.2.2, §7.4, §8.1, §15.2.2 |
| **F1-A2** Agenti + subagenti | 2 | F0 | `agenti.html` (2 liste in `.table-box`, modali) | §4.2.4, §4.2.5, §7.5, §8.1, §15.2.3 |
| **F1-A3** Clienti e agenzie (interscambio + codice cliente fornitore) | 2 | F0 | `clienti.html` (anagrafica da Integra in sola lettura, pannello Agenzie con modale e campi di ricerca, blocco duplicati per fornitore, vista inversa nel fornitore) | §4.2.6, §4.4, §7.6, §8.1, §15.2.3 |
| **F1-A4** Sincronizzazione da Integra delle **anagrafiche clienti e fornitori**: viste sul database (`v_clienti`, `v_fornitori`), utente in sola lettura, processo ogni 60 s, incrementale, aggiorna solo i campi di Integra senza toccare i dati del CRM, registri di esecuzione e problemi (cliente senza P.IVA o P.IVA doppia), sezione delle impostazioni e *Prova la connessione*; sostituisce l'import da file | 3 · **da approvare** | F0-A2 | `prototipo-alternativo/assets/dati.js` (`sistema`, `impostazioni.integra`), `viste-gestione.js` (Impostazioni → Sincronizzazione da Integra) | §4.1, §4.5, §7.14, §7.15 |

- **F1-A4: 3 h fuori preventivo, da approvare** (la sincronizzazione dalle viste sostituisce l'import da file, non previsto nel preventivo originale). Le viste le crea chi gestisce Integra.
- **Output per ciascuna:** rotta pagina + API CRUD + eventi §15.2 + test delle regole univocità.
- **DoD comune:** checklist §11.1 superata; CRUD completo; eventi esatti (es. fornitore non eliminabile ma `attivo=false` §15.2.2).

## 6. Fase 2 — Pratiche ordini (6 h, 3 agenti in parallelo)

| Attività | Ore | Dipende da | Sorgente prototipo da replicare | Riferimenti spec |
|---|---|---|---|---|
| **F2-A1** Elenco ordini fornitore (filtri, icone variazioni/NC, `.table-box`) | 2 | F0 | `ordini-fornitore.html` | §7.2, §8.1, §15.2.4 |
| **F2-A2** Dettaglio pratica: stepper 4 passi, strip riepilogo, tab Pratica/Conferma/Fattura/Righe/Confronto | 2 | F0, F2-A1 | `ordine-fornitore-dettaglio.html` (intero: tab `tabs-crm`, check fase, subagente da interscambio, documenti per fase) | §7.3, §6.1, §5.8, §5.9, §5.10, §15.2.4 |
| **F2-A3** Documenti fiscali (fatture/NC, netto) + canale comune upload/validazione §6 | 2 | F0 | card "Documenti fiscali", modale NC (§6 canale: upload → coda → validazione → salvataggio) | §4.2.7.1, §5.3, §6, §8.1 (`/api/pratiche/:id/documenti`), §15.2.4 |

- **Nota:** il confronto fasi non si salva: calcolato al volo da `F0-A5` sugli snapshot per fase (§4.2.8 `fase = ordine|conferma|fattura`).
- **DoD:**NC totale → provvigione 0; variazioni comparse/spariti evidenziate; cambio stato = evento `crud/update` + `stato/change_state` (due righe §15.2.4).

## 7. Fase 3 — Bollettini mensili (4 h, 2 agenti in parallelo)

| Attività | Ore | Dipende da | Sorgente prototipo da replicare | Riferimenti spec |
|---|---|---|---|---|
| **F3-A1** Elenco bollettini + nuovo bollettino (mese/anno, dup-check) | 2 | F0 | `bollettini.html` (colonna Mese, select 12 mesi, `meseLabel`, filtri in card, `.table-box`) | §4.2.9, §5.6, §7.7, §15.2.5 |
| **F3-A2** Dettaglio bollettino (righe, riconosciuto vs calcolato, stati, differenze) | 2 | F0, F3-A1 | `bollettino-dettaglio.html` (colonne, badge stato, nota §10, `.box-stabile`) | §4.2.10, §6.2, §7.7, §15.2.5 |

| **F3-A3** Incassi dei clienti: stato d'incasso della fattura, righe di storno e riaccredito (fatturato), riconoscimento al pagamento su fatture di mesi precedenti e *in attesa di incasso* (maturato), `giorni_incasso` nelle condizioni del fornitore, gruppo *Pagamenti da sollecitare* in Oggi con un testo per cliente, storni e riaccrediti nella liquidazione | 4 · **da approvare** | F3-A2, F4 | `prototipo-alternativo/assets/motore.js` (`statoIncasso`, `pagamentiDaSollecitare`, `trimestreLiquidazione`), `viste-periodo.js`, `viste-giorno.js` (`sollecitiPagamento`) | §5.5, §5.14, §6.2, §7.1, §7.7, §7.8, §15.2.5 |

- **DoD:** bollettino unico per `(fornitore, mese, anno)`; differenze = calcolo `F0-A5`; verifica/contestazione genera `calcolo/verify` + `stato/change_state` (§15.2.5).
- **F3-A3: 4 h fuori preventivo, da approvare** (regole chiarite da Decobrands il 16/10/2026; restano le domande di §5.14).

## 8. Fase 4 — Liquidazione (3 h, 2–3 agenti in parallelo)

| Attività | Ore | Dipende da | Sorgente prototipo da replicare | Riferimenti spec |
|---|---|---|---|---|
| **F4-A1** Filtri (incl. **multifiltro fornitori**), KPI periodo, tab Riepilogo per subagente | 1 | F0 | `liquidazione.html` (dropdown checkbox "Tutti/Fornitori (n)/Nessun", `.table-box`, `tfoot` totale) | §7.8, §6.3, §15.2.6 |
| **F4-A2** Tab Dettaglio rendiconto (13 colonne, contatore, `.table-box`) | 1 | F0, F4-A1 | `liquidazione.html` tab dettaglio | §7.8, §15.2.6 |
| **F4-A3** Esportazione (§11): completa per subagente, un subagente, solo riepilogo; Excel curato con formule, PDF convertito dallo stesso Excel (LibreOffice), CSV di soli dati + trimestri | 4 (era 1: +3 h da approvare) | F4-A2 | `prototipo-alternativo/assets/esporta-liquidazione.js` | §11, §8.1 (`/api/liquidazione/export`), §15.2.6 |
| **F4-A4** Report subagenti nel pannello della liquidazione (scheda accanto a *Documenti*): grafico e tabella per subagente con confronto sul trimestre prima; con un subagente scelto 3 numeri, trimestri dell'anno, primi clienti (Chart.js + react-chartjs-2), API `/api/liquidazione/report` | 2 · **da approvare** | F4-A1 | `prototipo-alternativo/assets/viste-periodo.js` (`reportSubagenti`), `motore.js` (`analisiTrimestre`), `componenti.js` (`Grafico`) | §7.8, §16.4, D-18 |
| **F4-A5** Pagina **Analisi** (BI): vista `v_analisi_documenti` e API con aggregazioni sul server; periodo 3/6/12 mesi con PeriodoMesi, filtri fornitori/subagenti/clienti con campi di ricerca a selezione multipla (CampoRicerca `multipla`, D-20), filtro incrociato da grafici e righe, 4 numeri con periodo precedente, 4 grafici, tabella raggruppabile; esportazione Excel con grafici, PDF, CSV | 11 · **da approvare** | F4-A4, F4-A3 | `prototipo-alternativo/assets/viste-analisi.js`, `motore.js` (`fattiAnalisi`), `esporta-liquidazione.js` (`esportaModello`, blocco immagine) | §7.22, §11, §16.4, D-18, D-19 |

- **F4-A4 + F4-A5: 13 h fuori preventivo, da approvare** (sostituiscono le 3 h della sintesi, D-17 → D-18). Ripartizione F4-A5: dati e API 3 h, pagina con filtri e grafici 4 h, selezione multipla nel componente di ricerca (campo e maschera) 1 h, esportazione con grafici 3 h.
- **DoD:** solo pratiche `fatturate` del trimestre del subagente; KPI = somma righe; export = 8 campi §11; evento `export/export` solo al download.

## 9. Fase 5 — Dashboard + log eventi (2 h, 2 agenti in parallelo)

| Attività | Ore | Dipende da | Sorgente prototipo da replicare | Riferimenti spec |
|---|---|---|---|---|
| **F5-A1** Dashboard: KPI, tab Segnalazioni (conferme scadute, bollettini da verificare, variazioni, NC) / Ordini, contatori, "Vedi tutti" | 1 | F0 (+ dati da F1–F4 per popolare) | `dashboard.html` (KPI invariati, `box-stabile`, `.table-box`) | §7.1, §5.12, §6.1 |
| **F5-A2** Schermata `/eventi` (filtri, dettaglio JSON in modale, export CSV, rotazione 36 mesi) | 1 | F0-A5 | — (nessuna schermata prototipo: nuova, stile identico alle liste) | §7.11, §8.1, §15.6, §15.7 |

| **F5-A3** Ruoli e permessi: tabella `crm_ruoli_utente`, `requirePermesso()` su ogni rotta, interfaccia in sola lettura, barra per ruolo | 2 · **da approvare** | F0-A3 | `prototipo-alternativo/assets/motore.js` (`M.PERMESSI`), `componenti.js` (barra) | §8.3 |
| **F5-A4** Utenti e ruoli `/utenti` (elenco, scheda, nuova password via email, vincoli) | 2 · **da approvare** | F5-A3 | `prototipo-alternativo/assets/viste-gestione.js` | §7.13 |
| **F5-A5** Stato del sistema `/sistema` + registri `servizi_esecuzioni` / `servizi_problemi` scritti dai servizi: controlli di salute ogni 5 minuti, calcolo dello stato, catalogo dei problemi con apertura, ripetizione e chiusura automatica, *Controlla adesso*, pulizia notturna | 3 · **da approvare** | F6-A1 | idem | §7.14–§7.14.5, §4.2.15 |
| **F5-A6** Impostazioni `/impostazioni` (6 sezioni, password cifrate mai rilette, prova connessione) | 3 · **da approvare** | F0 | idem | §7.15, §4.2.14 |
| **F5-A7** Documenti scartati `/scartati` (motivo, recupero, eliminazione automatica) | 1 · **da approvare** | F6-A4 | idem | §7.16 |
| **F5-A8** Guida in linea `/guida` + pulsante *Guida* nelle testate | 2 · **da approvare** | F0-A4 | idem (`CRM.GUIDA`) | §7.17 |

- **Pagine di gestione (F5-A3…A8): 13 h fuori preventivo, da approvare.**
- **Nota:** la scrittura degli eventi **non** è di F5: la fa l'attività che implementa ogni operazione (§15.2 tassativo). F5 costruisce solo lettura/filtri/export.

## 10. Fase 6 — Ingresso documenti senza n8n (17 h, 2–3 agenti)

| Attività | Ore | Dipende da | Sorgente prototipo | Riferimenti spec |
|---|---|---|---|---|
| **F6-A1** Ricezione e coda: lettura casella (`imapflow`, lavoro pianificato), caricamento manuale, `file_hash` contro i doppioni, coda con `SKIP LOCKED`, tentativi ed errori | 3 | F0 | — | §4.2.12, §6.5 punti 1–2, §8.1 |
| **F6-A2** Servizio di lettura: PDF → immagini, chiamata GLM-OCR/vLLM con schema per tipo documento, `logprobs` → affidabilità per campo, posizione nel PDF, unione righe multipagina, bollettini Excel con `exceljs` | 6 | F0-A6 | — | §6.5 punti 3–4, §4.2.13, V11 |
| **F6-A3** Controlli fissi e livello del documento; proposta di abbinamento (codice cliente + articoli in comune) | 2 | F0-A5, F6-A2 | `prototipo-alternativo/assets/motore.js` (`proposta`, `daFare`) | §6.5 punti 5–6 |
| **F6-A4** Schermata `/documenti` + finestra di correzione (PDF a sinistra, testata e righe a destra, campi incerti evidenziati, evidenziazione nel PDF), abbina / apri pratica / registra bollettino / scarta | 4 | F0-A4, F6-A3 | `prototipo-alternativo/` vista Documenti | §6.5 punto 7, §7.9, §15.2.4 |
| **F6-A5** Installazione in esercizio (servizio vLLM, avvio automatico, controllo stato) e prima taratura delle soglie sui documenti reali | 2 | F6-A2 | — | §6.5 punto 8, §3.4 |

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

#### F7-A1 · Verifica replicazione + E2E — 3 h
- **Dipende da:** merge F1–F6 · **Output:** report checklist §11.1 per **tutte** le schermate (una riga per criterio), test E2E su flussi critici (stati pratica, NC → netto, multifiltro, export, eventi)
- **DoD:** 6/6 criteri su ogni schermata; numeri seed §12 identici al prototipo; zero divergenze aperte.

#### F7-A2 · Responsive + collaudo dati + rilascio — 2 h
- **Dipende da:** F7-A1 · **Riferimenti:** V6 (desktop/tablet/mobile), §3.2, §14
- **Output:** rifiniture responsive (nessun overflow orizzontale), collaudo con seed §12 e dati reali di prova, build di produzione, pubblicazione **senza Docker** (Caddy + Next.js 8001 + NestJS 8002), nota di rilascio.
- **DoD:** app avviata in produzione; elenco attendibile del backlog §13 non toccato.

---

## 12. Regole di consegna per agente (riepilogo)


- **Perché prima del cosa**: prima di implementare o cambiare un comportamento leggere il motivo nel registro delle decisioni (spec §19); se il codice si discosta dalla specifica, motivo nella PR e nuova riga al §19; commento breve nel codice che rimanda alla decisione nei punti non ovvi.
1. **Prima** leggere la sezione di specifica citata nell'attività + i file prototipo indicati. **Il prototipo vince** su ogni interpretazione stilistica.
2. CSS: si usa `crm.css` così com'è; nuove regole solo se il prototipo le ha (altrimenti si replica il pattern più vicino e si segnala).
3. Testi: copiare le stringhe dal prototipo; niente sinonimi "migliori".
4. Eventi: §15.2 per operazione, scrittura nel service layer (§15.3), mai dal client.
5. Tabelle legacy: **solo lettura** (V2) salvo le scritture già previste dalla Gestione Ordini.
6. Prima del merge: checklist §11.1 compilata + `git diff --check` + test numerici seed.
7. Conflitti: se due attività necessitano dello stesso file condiviso, la prevale in Fase 0 o l'attività lo dichiara all'orchestratore — mai edit contemporanei.

## 13. Riferimenti

Specifica: `specifica-crm-provvigioni.md` v2.0 (§16, §6.5, §17) · Preventivo: `preventivo-crm-provvigioni.md` (89 h da svolgere, margine incluso) ·
Prototipo sorgente: `prototipo-crm/` · Stile: `STILE-GUIDA-DECOBRANDS.md` · Seed: spec §12 · Eventi: spec §15
