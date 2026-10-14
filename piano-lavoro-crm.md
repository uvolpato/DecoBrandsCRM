# Piano di lavoro — CRM Decobrands (fasi e attività parallele)

**Versione:** 1.1 · **Data:** 14/10/2026 (stack confermato: Portale B2B Luis)
**Derivato da:** `specifica-crm-provvigioni.md` v1.8 (§16) · **Ore:** 59 h di attività + 15 h di margine = 74 h (preventivo §4)
**Scopo:** suddividere l'implementazione in fasi e attività indipendenti, assegnabili ad **agenti in parallelo**, con **replicazione maniacale** del prototipo navigabile.

---

## 1. Principi

### 1.1 Replicazione maniacale del prototipo (definizione operativa)

Il prototipo (`prototipo-crm/*.html` + `assets/css/crm.css` + `assets/js/app.js`) è la
**sorgente di verità visiva e comportamentale**. Ogni schermata implementata deve
superare questa checklist prima del merge (6 criteri, tutti obbligatori):

1. **Struttura e navigazione** — stesse aree nella stesso ordine: navbar fissa (logo + "CRM" → launcher, versione, link Launcher, voci di sezione §4.2), contenuto, footer fisso centrato; stesse rotte e breadcrumb (§7).
2. **Layout** — stesse card/sezioni/tabelle nello stesso ordine e con le stesse proporzioni; tabelle avvolte in `.table-box`/`.box-stabile` (altezze, scroll, thead sticky) con `thead class="table-dark"` (§2-V9); nessun elemento sovrapposto o tagliato.
3. **Componenti e stile** — Bootstrap 5.3.2 + bootstrap-icons identichi e `crm.css` **copiato, non riscritto** (token, `.kpi-card`, `.tabs-crm`, `.badge-stato`, `.riep-card`, `.doc-chip`, `.db-footer`, bottoni e stati).
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
- **Varie:** `@nestjs/schedule` (conferme scadute), `exceljs` (bollettini/export), Jest + supertest.

**Riuso da Luis B2B:** solo infrastruttura (accesso, sicurezza, Prisma, registro eventi, utilità comuni, inoltro `/api/*`, pubblicazione) — elenco moduli in spec §16.3. **Nessun componente o CSS di Luis: layout e grafica sono quelli del prototipo** (§1.1).

**Prisma e DB condiviso (V2):** lo schema Prisma copre **solo le tabelle nuove del CRM
(§4.2)**; le tabelle esistenti della Gestione Ordini si leggono in sola lettura, **mai
migrate**.

---

## 3. Fasi in riepilogo

| Fase | Ambito | Attività | Agenti paralleli | Ore | Dipende da |
|---|---|---|---|---|---|
| **F0** | Fondamenta: scaffold, DB, auth, shell, motore, prova documenti | 6 (A1–A6) | 1 → fino a 4 dopo A1 | **25** | — |
| **F1** | Anagrafiche (fornitori, agenti, interscambio) | 3 | **3 in parallelo** | **6** | F0 |
| **F2** | Pratiche ordini (lista, dettaglio, documenti, upload) | 3 | **3 in parallelo** | **7** | F0 |
| **F3** | Bollettini mensili | 2 | **2 in parallelo** | **4** | F0 |
| **F4** | Liquidazione (riepilogo, dettaglio, export) | 3 | **2–3 in parallelo** | **4** | F0 |
| **F5** | Dashboard + log eventi (`/eventi`) | 2 | **2 in parallelo** | **2** | F0 |
| **F6** | Modulo ordini cliente (§7.9) | 1 (2 sottofasi) | 1–2 | **6** | F0 |
| **F7** | Collaudo, replicazione, rilascio | 1 (2 sottofasi) | 1–2 | **5** | merged F1–F6 |
| | | **20** | | **59** | |
| — | Margine di rischio 25 % (riserva, preventivo §4 att. 12) | — | — | **15** | — |
| | | | | **74** | |

```
F0-A1 (scaffold, modello Luis B2B)
        ├─ F0-A2 (DB + seed) ──┐
        ├─ F0-A3 (auth)        ├── F0-A4 (shell) + F0-A5 (motore + logEvent)
        │                       │
        ▼                       ▼
   ┌──────────── Fase 0 chiusa (contratti congelati) ────────────┐
   │  F1 ∥ F2 ∥ F3 ∥ F4 ∥ F5 ∥ F6        (6 filiere in parallelo) │
   └──────────────────────────────────────────────────────────────┘
                         │
                         ▼
              F7 collaudo + replicazione + rilascio
```

Totale ore verificato: 25 + 6 + 7 + 4 + 4 + 2 + 6 + 5 = **59 h** di attività + **15 h** di margine = **74 h** = preventivo §4. Il margine non è assegnato a una fase: si usa dove emergono imprevisti e si rendiconta a ore.

---

## 4. Fase 0 — Fondamenta (bloccante, 25 h)

#### F0-A1 · Scaffold applicativo — 3 h
- **Dipende da:** — · **Blocca:** tutte le attività
- **Riferimenti:** spec §3.4, §16.3, V7 (stack Luis B2B), V5 (italiano), V6 (responsive)
- **Sorgente prototipo:** `assets/css/crm.css` (intero file, copiato), `login.html` (CDN: Bootstrap 5.3.2 CSS/JS bundle + bootstrap-icons 1.11.3)
- **Output:** `frontend/` (Next.js) + `backend/` (NestJS + Prisma) sul modello di Luis B2B, import di `crm.css`, inoltro `/api/*`, `.env.example`, `avvia.bat`, Caddyfile.
- **DoD:** frontend su 8001 e backend su 8002 avviati; nessun CSS riscritto a mano; CDN/moduli identici al prototipo.

#### F0-A2 · Schema dati + seed — 6 h
- **Dipende da:** F0-A1 · **Blocca:** F1–F6 (lette/scritture), F0-A5
- **Riferimenti:** spec §4.2.1–4.2.11 (tabelle nuove), §4.1 (tabelle legacy read-only), §12 (seed), §4.3 (relazioni), §4.4 (note schema, `ordine_cliente_id`, `codice_cliente_fornitore`)
- **Sorgente prototipo:** `assets/js/data.js` (struttura dati demo = forma del seed)
- **Output:** schema Prisma tabelle CRM + migrazioni; introspection letta sulle tabelle esistenti **senza migrazione** (V2); aggregatore seed con `seed/00-base`.
- **DoD:** migrazioni riusate su DB `decobrands`; seed §12 caricato; vincoli chiave presenti (`UNIQUE(fornitore_id, mese, anno)` bollettini, `UNIQUE(fornitore_id, codice_cliente_fornitore)` interscambio, FK `ordine_cliente_id`).

#### F0-A3 · Autenticazione condivisa — 3 h
- **Dipende da:** F0-A1 · **Blocca:** tutte le schermate login-guardate
- **Riferimenti:** spec §3.3, §8.3, preventivo §4 att. 2 (sessioni server-side su PostgreSQL, argon2, remember cookie, `requireAuth`/`requireAdmin` — stessa tabella `users`)
- **Sorgente prototipo:** `login.html` (UI: card, "← Torna al launcher", versione `.7rem opacity .6` §24)
- **Output:** moduli di accesso ripresi da Luis B2B (sessioni, CSRF, Helmet, throttler) sulla tabella `users` condivisa; login/logout/reset/cambio password, guard admin, UI login identica; **verifica compatibilità sessioni con la Gestione Ordini** (se incompatibili: login separato, stesse credenziali — spec §3.3).
- **DoD:** accesso con utenti della Gestione Ordini; UI login = prototipo (checklist §11.1); eventi `auth/*` §15.2.1 scritti da `logEvent()` (F0-A5).

#### F0-A4 · Shell layout comune — 2 h
- **Dipende da:** F0-A1 · **Blocca:** tutte le schermate
- **Riferimenti:** spec §4.2 (navbar), §7.10; STILE-GUIDA §4.2
- **Sorgente prototipo:** `assets/js/app.js` → `navbar()` (voci, dropdown Anagrafiche, `data-active`, versione, Launcher), `footer()`; `crm.css` → `.db-footer`, `.table-box`, `.box-stabile`, `#topnav` fixed
- **Output:** layout route (navbar fissa + footer fisso centrato + toast + breadcrumb), macro-componenti condivisi (card, header tabella, empty state).
- **DoD:** ogni rotta eredita la shell senza duplicarla; navbar/footer identici parola per parola; focus-visible e stati bottoni conformi.

#### F0-A5 · Motore di calcolo §10 + contratto eventi — 7 h
- **Dipende da:** F0-A1, F0-A2 · **Blocca:** F2, F3, F4 (calcoli)
- **Riferimenti:** spec §10 (formulario), §5.1–5.13 (regole), §11 (export), §15.3 (`logEvent()` service, da modulo `audit` di Luis B2B), preventivo §4 att. 4 + 9
- **Sorgente prototipo:** `assets/js/app.js` → `commissionePerOrdine`, `rigaBollettinoCalcolata`, `confrontoFasi`, `documentiOrdine`, `importoNettoOrdine`, `fasiOrdine`, `haVariazioni`, `inTrimestre`, helper `fmt*`/`meseLabel`
- **Output:** motore server-side: scaglioni, eccezioni, maturato/fatturato, congelamento percentuali (§5.11), netto documenti (fatture − NC §5.3), differenze bollettino, confronto fasi; helper `logEvent()` conforme §15.3 (stessa transazione, formato §15.4).
- **DoD:** test numerici (Jest) sui casi seed §12 (es. Gries 0/1/5/10/100 %, conferma ridotta 7/10, NC-2026-005) = stessi risultati del prototipo; nessun calcolo duplicato altrove (motore solo lato server).

#### F0-A6 · Prova lettura automatica documenti fornitore — 4 h
- **Dipende da:** F0-A1 · **Blocca:** nulla (in parallelo ad A2–A5); l'esito condiziona F2-A3 e F3
- **Riferimenti:** spec V2, §6, §6.1, §6.2; preventivo §4 att. 11
- **Output:** conferme, fatture e bollettini di 2–3 fornitori reali (Gries + un importatore) passati nella pipeline OCR della Gestione Ordini; tabella esito per campo letto (numero, data, importo, cliente, righe).
- **DoD:** esito documentato; stima dell'adattamento per fornitore consegnata al cliente prima di F2-A3.

---

## 5. Fase 1 — Anagrafiche (6 h, 3 agenti in parallelo)

| Attività | Ore | Dipende da | Sorgente prototipo da replicare | Riferimenti spec |
|---|---|---|---|---|
| **F1-A1** Fornitori + scaglioni (CRUD, dettaglio, flag/stati) | 2 | F0 | `fornitori.html`, `fornitore-dettaglio.html` (tab scaglioni in `.box-stabile`, thead scuro) | §4.2.1, §4.2.2, §7.4, §8.1, §15.2.2 |
| **F1-A2** Agenti + subagenti | 2 | F0 | `agenti.html` (2 liste in `.table-box`, modali) | §4.2.4, §4.2.5, §7.5, §8.1, §15.2.3 |
| **F1-A3** Interscambio (+ codice cliente fornitore) | 2 | F0 | `interscambio.html` (colonna "Cod. cliente fornitore", modale Nuova Associazione con hint, blocco duplicati per fornitore) | §4.2.6, §4.4, §7.6, §8.1, §15.2.3 |

- **Output per ciascuna:** rotta pagina + API CRUD + eventi §15.2 + test delle regole univocità.
- **DoD comune:** checklist §11.1 superata; CRUD completo; eventi esatti (es. fornitore non eliminabile ma `attivo=false` §15.2.2).

## 6. Fase 2 — Pratiche ordini (7 h, 3 agenti in parallelo)

| Attività | Ore | Dipende da | Sorgente prototipo da replicare | Riferimenti spec |
|---|---|---|---|---|
| **F2-A1** Elenco ordini fornitore (filtri, icone variazioni/NC, `.table-box`) | 2 | F0 | `ordini-fornitore.html` | §7.2, §8.1, §15.2.4 |
| **F2-A2** Dettaglio pratica: stepper 4 passi, strip riepilogo, tab Pratica/Conferma/Fattura/Righe/Confronto | 3 | F0, F2-A1 | `ordine-fornitore-dettaglio.html` (intero: tab `tabs-crm`, check fase, subagente da interscambio, documenti per fase) | §7.3, §6.1, §5.8, §5.9, §5.10, §15.2.4 |
| **F2-A3** Documenti fiscali (fatture/NC, netto) + canale comune upload/validazione §6 | 2 | F0 | card "Documenti fiscali", modale NC (§6 canale: upload → coda → validazione → salvataggio) | §4.2.7.1, §5.3, §6, §8.1 (`/api/pratiche/:id/documenti`), §15.2.4 |

- **Nota:** il confronto fasi non si salva: calcolato al volo da `F0-A5` sugli snapshot per fase (§4.2.8 `fase = ordine|conferma|fattura`).
- **DoD:**NC totale → provvigione 0; variazioni comparse/spariti evidenziate; cambio stato = evento `crud/update` + `stato/change_state` (due righe §15.2.4).

## 7. Fase 3 — Bollettini mensili (4 h, 2 agenti in parallelo)

| Attività | Ore | Dipende da | Sorgente prototipo da replicare | Riferimenti spec |
|---|---|---|---|---|
| **F3-A1** Elenco bollettini + nuovo bollettino (mese/anno, dup-check) | 2 | F0 | `bollettini.html` (colonna Mese, select 12 mesi, `meseLabel`, filtri in card, `.table-box`) | §4.2.9, §5.6, §7.7, §15.2.5 |
| **F3-A2** Dettaglio bollettino (righe, riconosciuto vs calcolato, stati, differenze) | 2 | F0, F3-A1 | `bollettino-dettaglio.html` (colonne, badge stato, nota §10, `.box-stabile`) | §4.2.10, §6.2, §7.7, §15.2.5 |

- **DoD:** bollettino unico per `(fornitore, mese, anno)`; differenze = calcolo `F0-A5`; verifica/contestazione genera `calcolo/verify` + `stato/change_state` (§15.2.5).

## 8. Fase 4 — Liquidazione (4 h, 2–3 agenti in parallelo)

| Attività | Ore | Dipende da | Sorgente prototipo da replicare | Riferimenti spec |
|---|---|---|---|---|
| **F4-A1** Filtri (incl. **multifiltro fornitori**), KPI periodo, tab Riepilogo per subagente | 2 | F0 | `liquidazione.html` (dropdown checkbox "Tutti/Fornitori (n)/Nessun", `.table-box`, `tfoot` totale) | §7.8, §6.3, §15.2.6 |
| **F4-A2** Tab Dettaglio rendiconto (13 colonne, contatore, `.table-box`) | 1 | F0, F4-A1 | `liquidazione.html` tab dettaglio | §7.8, §15.2.6 |
| **F4-A3** Export CSV 8 campi (§11) + trimestri | 1 | F4-A2 | `esportaCSV()` di `liquidazione.html` | §11, §8.1 (`/api/liquidazione/export`), §15.2.6 |

- **DoD:** solo pratiche `fatturate` del trimestre del subagente; KPI = somma righe; export = 8 campi §11; evento `export/export` solo al download.

## 9. Fase 5 — Dashboard + log eventi (2 h, 2 agenti in parallelo)

| Attività | Ore | Dipende da | Sorgente prototipo da replicare | Riferimenti spec |
|---|---|---|---|---|
| **F5-A1** Dashboard: KPI, tab Segnalazioni (conferme scadute, bollettini da verificare, variazioni, NC) / Ordini, contatori, "Vedi tutti" | 1 | F0 (+ dati da F1–F4 per popolare) | `dashboard.html` (KPI invariati, `box-stabile`, `.table-box`) | §7.1, §5.12, §6.1 |
| **F5-A2** Schermata `/eventi` (filtri, dettaglio JSON in modale, export CSV, rotazione 36 mesi) | 1 | F0-A5 | — (nessuna schermata prototipo: nuova, stile identico alle liste) | §7.11, §8.1, §15.6, §15.7 |

- **Nota:** la scrittura degli eventi **non** è di F5: la fa l'attività che implementa ogni operazione (§15.2 tassativo). F5 costruisce solo lettura/filtri/export.

## 10. Fase 6 — Modulo ordini cliente (6 h, 1–2 agenti)

| Attività | Ore | Dipende da | Sorgente prototipo | Riferimenti spec |
|---|---|---|---|---|
| **F6-A1** API modulo (ordini, lookup, clienti, utenti, errori — letture sulle tabelle legacy) | 3 | F0 | — | §7.9, §8.2, §4.1 |
| **F6-A2** Viste modulo (liste, upload, errori — stesso stile e stesse regole delle altre schermate) | 3 | F6-A1 | stile generale (STILE-GUIDA §7, `.table-box`, thead scuro) | §7.9, §6 |

- **DoD:** zero scrittura su tabelle legacy oltre a quelle consentite (V2); UI indistinguibile dal resto dell'app.

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

1. **Prima** leggere la sezione di specifica citata nell'attività + i file prototipo indicati. **Il prototipo vince** su ogni interpretazione stilistica.
2. CSS: si usa `crm.css` così com'è; nuove regole solo se il prototipo le ha (altrimenti si replica il pattern più vicino e si segnala).
3. Testi: copiare le stringhe dal prototipo; niente sinonimi "migliori".
4. Eventi: §15.2 per operazione, scrittura nel service layer (§15.3), mai dal client.
5. Tabelle legacy: **solo lettura** (V2) salvo le scritture già previste dalla Gestione Ordini.
6. Prima del merge: checklist §11.1 compilata + `git diff --check` + test numerici seed.
7. Conflitti: se due attività necessitano dello stesso file condiviso, la prevale in Fase 0 o l'attività lo dichiara all'orchestratore — mai edit contemporanei.

## 13. Riferimenti

Specifica: `specifica-crm-provvigioni.md` v1.8 (§16) · Preventivo: `preventivo-crm-provvigioni.md` (74 h da svolgere, margine incluso) ·
Prototipo sorgente: `prototipo-crm/` · Stile: `STILE-GUIDA-DECOBRANDS.md` · Seed: spec §12 · Eventi: spec §15
