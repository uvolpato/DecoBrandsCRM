# Collaudo · Onda 2 · Pacchetto 2-07 — DataTable: paginazione sempre, intestazioni e righe da tastiera

Data: 08/11/2026 · **Esecutore: DeepSeek V4 Flash** · Gravità del pacchetto: **P2** · Rilievi: A5-07, A7-04, A7-05 · Piano: `strumenti/collaudo/piano-correzioni.md`.

Si lancia **dopo** il commit del lavoro f7 e la chiusura dell'onda precedente. Dipende da: 0b-05 (`collaudo-0b-05-cerca-integra-clienti.md`: rileggi il codice di `stile.css`, cambiato dall'onda 0 bis).

## Contesto e regole del progetto

- **Stack**: frontend Next.js 16 + React 19 + TypeScript (`app/frontend`), backend NestJS 11 + Prisma 7 +
  PostgreSQL (`app/backend`, database proprio `decobrands_db`), stile `app/frontend/app/stile/stile.css` copiato dal
  prototipo ufficiale `prototipo-alternativo/` (D-24), Public Sans, niente Bootstrap. Node 24.
- **Leggi prima `CLAUDE.md`** (radice) per intero, poi le righe di `specifica-crm-provvigioni.md` sulle decisioni
  citate nei rilievi (§19, registro D-nn).
- **Prima di leggere codice**: `graphify query "<domanda>"` (grafo in `graphify-out/`), poi solo le righe trovate.
  **Non** lanciare `graphify update .`: altri pacchetti lavorano in parallelo, il grafo lo aggiorna il controllo di fine onda.
- ⚠ **V12 — tutto sul backend**: ogni calcolo (provvigioni, totali, differenze, stati) e ogni operazione sensibile si
  fa sul server dal database; il browser manda solo scelte (id, valori digitati, motivo); il server ricarica,
  ricontrolla, ricalcola e non salva mai un valore calcolato arrivato dal browser.
- ⚠ **V13 — una operazione, una transazione**: se scrivi su più tabelle o più righe legate, una sola
  `prisma.$transaction(async (tx) => …)`, tutto da `tx` (registro compreso); chiusure, verifiche e abbinamenti
  bloccano la riga con `SELECT … FOR UPDATE`; email e lettura dei documenti dopo il commit, il file su disco prima.
- **Italiano** semplice in codice, commenti, messaggi e interfaccia (niente parole inglesi inutili). Nei punti non
  ovvi un commento breve che rimanda alla decisione: `// D-51 §19`, `// V13`.
- Le prove nel browser cercano le schede con `.schede-barra [role=tab]` (anche i segmenti hanno `role=tab`).
- Non c'è telefono (D-44): si prova a 1440 e 768 px.
- I numeri di riga dei report sono del 08/11 mattina: dopo il collaudo è stato committato altro lavoro (f7).
  **Rileggi il codice attuale.** Se un rilievo risulta già corretto, scrivilo nel resoconto e non cambiare nulla.

## Rilievi da correggere (testo dei report del collaudo; i rilievi U* nascono dalle decisioni di Ugo)

### A5-07 — `naturale` toglie la paginazione: Analisi › Documenti disegna tutte le righe
- Gravità: P2
- Dove: `app/frontend/componenti/DataTable.tsx:62`; uso in `analisi/VistaAnalisi.tsx:268`
- Problema: nell'app `naturale` imposta `perPagina = MAX_SAFE_INTEGER`; nel prototipo (`componenti.js`, DataTable) `naturale` cambia solo l'altezza e la paginazione resta (la toglie solo `perPagina:false`). Spec §16.4: "paginazione sempre attiva".
- Scenario: Analisi, 12 mesi, *Raggruppa: Documenti* con 3.000 documenti → 3.000 `<tr>` disegnati in una volta (blocco del browser a ogni cambio filtro), invece di 25 per pagina come nel prototipo.
- Correzione puntuale: `DataTable.tsx:62` → `const perPagina = pp === false ? Number.MAX_SAFE_INTEGER : (pp ?? io.righe_pagina ?? 25);` (`naturale` solo classe CSS). Controllare le tabelle brevi `naturale` (scaglioni, permessi, ConsultaDocumenti): sotto 25 righe non cambia nulla.
- Prova che la verifica: `strumenti/prove/app_analisi.py`: con *Documenti* il piede mostra "1–25 di N" e `.dt-pagine`.
- Esecutore: DeepSeek V4 Flash — una riga.
- File toccati: `componenti/DataTable.tsx`, `strumenti/prove/app_analisi.py`
- Dipende da / correlato a: §16.4 DataTable, A7 (prestazioni)

### A7-04 — Le intestazioni ordinabili della DataTable non si usano da tastiera
- Gravità: P2
- Dove: `app/frontend/componenti/DataTable.tsx:102-111`
- Problema: l'ordinamento sta in `onClick` sul `<th>`, che non si raggiunge con Tab e non risponde a Invio o Spazio (WCAG 2.1.1).
- Scenario: Pratiche da tastiera → non si può ordinare per Importo o Data. Vale per tutte le tabelle (regola §16.4: ordinamento su tutto l'elenco).
- Correzione puntuale: dentro il `th` ordinabile mettere `<button type="button" className="dt-ordina" onClick={…}>{c.header}<span className="freccia" aria-hidden>…</span></button>`. `aria-sort` resta sul `th`. In `stile.css` (del prototipo, poi ricopiato) `.dt-ordina { all: inherit; display: inline-flex; cursor: pointer }` e `:focus-visible` con un bordo interno (D-64).
- Prova che la verifica: `app_pratiche.py`: fuoco sull'intestazione «Importo», Invio → `aria-sort="ascending"` e la richiesta ha `ordina=importo`.
- Esecutore: DeepSeek V4 Flash. Componente e stile.
- File toccati: `app/frontend/componenti/DataTable.tsx`, `prototipo-alternativo/assets/stile.css`, `app/frontend/app/stile/stile.css`
- Dipende da / correlato a: D-64

### A7-05 — Le righe cliccabili non si aprono da tastiera (Pratiche, Clienti, Fornitori, Subagenti, Utenti, Registro)
- Gravità: P2
- Dove: `DataTable.tsx:124-125`; chi la usa: `pratiche/VistaPratiche.tsx:168`, `clienti/VistaClienti.tsx:319`, `fornitori/VistaFornitori.tsx:335`, `subagenti/VistaSubagenti.tsx:409`, `utenti/VistaUtenti.tsx:256`, `registro/VistaRegistro.tsx:217`, `liquidazioni/VistaLiquidazioni.tsx:189`, `analisi/VistaAnalisi.tsx:274`
- Problema: `onRowClick` sta solo sul `<tr>` (niente `tabIndex`, niente tasti), e nelle celle non c'è un link. Chi usa la tastiera **non riesce ad aprire una pratica dall'elenco** (WCAG 2.1.1).
- Scenario: Pratiche → Tab porta ai filtri e alla paginazione, ma nessuna riga riceve il fuoco, quindi `/pratiche/123` non si apre. Anche la selezione del subagente in Liquidazioni e il filtro dalla tabella di Analisi funzionano solo con il mouse.
- Correzione puntuale: in `DataTable`, quando c'è `onRowClick`, sul `tr` mettere `tabIndex={0}` e `onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); onRowClick(r); } }}`, cioè lo stesso schema di `Elenco` in `Flussi.tsx:18-19`. In CSS `.dt tr.cliccabile:focus-visible { outline: 2px solid var(--primario); outline-offset: -2px }`.
- Prova che la verifica: `app_pratiche.py`: Tab fino alla prima riga, Invio → l'URL diventa `/pratiche/<id>`.
- Esecutore: DeepSeek V4 Flash. Un componente e una riga di stile.
- File toccati: `DataTable.tsx`, `prototipo-alternativo/assets/stile.css`, `app/frontend/app/stile/stile.css`
- Dipende da / correlato a: A7-04 (stesso file, stesso pacchetto)

**Nota del pacchetto.** Il fuoco è un bordo interno (D-64), mai un `outline` esterno che finisce sotto i menu. Stessa regola nei due `stile.css` (D-24).

## File ammessi (solo questi)

- `app/frontend/componenti/DataTable.tsx`
- `app/frontend/app/stile/stile.css`
- `prototipo-alternativo/assets/stile.css`
- `strumenti/prove/app_pratiche.py`
- `strumenti/prove/app_analisi.py`
- `strumenti/opencode/resoconto-collaudo-2-07.md`

## File vietati

Li modificano altri pacchetti della **stessa onda**, in parallelo:

- `app/backend/package-lock.json`
- `app/backend/package.json`
- `app/backend/prisma/lettura-prova.ts`
- `app/backend/src/accesso.ts`
- `app/backend/src/bollettino.ts`
- `app/backend/src/documenti.ts`
- `app/backend/src/esporta-liquidazione.ts`
- `app/backend/src/eventi.ts`
- `app/backend/src/fornitori.ts`
- `app/backend/src/impostazioni-api.ts`
- `app/backend/src/impostazioni.ts`
- `app/backend/src/incassi.ts`
- `app/backend/src/lettura-prova.ts`
- `app/backend/src/motore/dati.ts`
- `app/backend/src/motore/motore.ts`
- `app/backend/src/proposta.ts`
- `app/backend/src/solleciti.ts`
- `app/backend/test/bollettino.spec.ts`
- `app/backend/test/documenti-pratica.spec.ts`
- `app/backend/test/eventi.spec.ts`
- `app/backend/test/fornitori.spec.ts`
- `app/backend/test/impostazioni.spec.ts`
- `app/backend/test/liquidazioni.spec.ts`
- `app/backend/test/motore-volumi.spec.ts`
- `app/backend/test/pratiche.spec.ts`
- `app/backend/test/proposta.spec.ts`
- `app/frontend/app/(app)/analisi/VistaAnalisi.tsx`
- `app/frontend/app/(app)/bollettini/VistaBollettini.tsx`
- `app/frontend/app/(app)/clienti/VistaClienti.tsx`
- `app/frontend/app/(app)/documenti/VistaDocumenti.tsx`
- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`
- `app/frontend/app/(app)/impostazioni/*`
- `app/frontend/app/(app)/layout.tsx`
- `app/frontend/app/(app)/oggi/VistaOggi.tsx`
- `app/frontend/app/(app)/pratiche/VistaPratiche.tsx`
- `app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx`
- `app/frontend/app/(app)/sistema/VistaSistema.tsx`
- `app/frontend/app/accesso/esci/page.tsx`
- `app/frontend/componenti/Barra.tsx`
- `app/frontend/componenti/ConsultaDocumenti.tsx`
- `app/frontend/componenti/PeriodoMesi.tsx`
- `app/frontend/componenti/Schede.tsx`
- `app/frontend/eslint.config.mjs`
- `app/frontend/lib/api.ts`
- `app/frontend/lib/stati.ts`
- `app/frontend/package-lock.json`
- `app/frontend/package.json`
- `strumenti/prove/app_accesso.py`
- `strumenti/prove/app_clienti.py`
- `strumenti/prove/app_documenti.py`
- `strumenti/prove/app_eventi.py`
- `strumenti/prove/app_guscio.py`
- `strumenti/prove/app_liquidazioni.py`
- `strumenti/prove/app_pratica.py`
- `strumenti/prove/app_sistema.py`

Documentazione (la scrive il **pacchetto documentazione** dell'onda, dopo di te: tu metti il testo pronto nel resoconto, sezione *Da documentare*):

- `specifica-crm-provvigioni.md`
- `app/frontend/lib/guida.ts`
- `piano-lavoro-crm.md`
- `PRD-crm-provvigioni.md`
- `prototipo-alternativo/LEGGIMI.md`
- `prototipo-alternativo/assets/guida.js`
- `app/README.md`
- `CLAUDE.md`
- `prototipo-crm/specifica.html`
- `prototipo-crm/preventivo.html`
- `app/backend/prisma/schema.prisma` e `app/backend/prisma/migrations/` (le migrazioni stanno solo nell'onda 0)
- qualsiasi altro file non elencato fra gli ammessi

## Database e prove

Prove da far passare:

- frontend: `cd app/frontend && npx tsc --noEmit` → 0 errori;
- prove nel browser interessate: `app_pratiche.py`, `app_analisi.py`, `app_componenti.py`, `app_liquidazioni.py`. **Non lanciarle** (porte e cartella `.next` sono condivise con gli altri pacchetti): aggiorna quelle indicate nei rilievi, controlla la sintassi con `python -m py_compile <file>` e scrivi nel resoconto quali vanno lanciate. Le lancia il controllo di fine onda.
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-2-07.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
