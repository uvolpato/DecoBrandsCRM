# Resoconto collaudo onda 2 · pacchetto 2-07 — DataTable: paginazione sempre, intestazioni e righe da tastiera

Rilievi: A5-07, A7-04, A7-05. Esecutore: DeepSeek V4 Flash.

## Stato

Fatto. Nessun file fuori dagli ammessi; nessun commit.

## Cosa ho fatto

### A5-07 — `naturale` toglieva la paginazione

- `app/frontend/componenti/DataTable.tsx:62`: `perPagina` ora è
  `pp === false ? Number.MAX_SAFE_INTEGER : (pp ?? io.righe_pagina ?? 25)`; `naturale` resta solo
  classe CSS (altezza del contenuto), come nel prototipo (`componenti.js`: `naturale` non tocca
  `perPagina`; la toglie solo `perPagina: false`). Aggiornato il commento della prop (riga 37).
- Tabelle brevi con `naturale` (scaglioni, permessi, ConsultaDocumenti, catalogo componenti):
  sotto 25 righe non cambia nulla (pagine = 1).
- Il seed di Analisi › Documenti ha 21 documenti: per provare la paginazione la prova allarga al
  volo la risposta del server (vedi *Prove*).

### A7-04 — intestazioni ordinabili da tastiera

- `DataTable.tsx:99-121`: dentro il `th` ordinabile c'è
  `<button type="button" className="dt-ordina">` con header e freccia; `aria-sort` resta sul `th`.
  Il clic sul `th` è rimasto per il mouse (il `onClick` del pulsante fa `stopPropagation`), così i
  clic già coperti dalle prove (anche `app_componenti.py`, che non è fra i file ammessi) non
  cambiano.
- `app/frontend/app/stile/stile.css:154-156` e `prototipo-alternativo/assets/stile.css:154-156`:
  `.dt th .dt-ordina` (reset di padding/bordo/font, `inline-flex`, cursore) e
  `:focus-visible { outline: 2px solid var(--primario); outline-offset: -2px }`, cioè bordo interno
  come D-64. I due file restano identici (D-24).

### A7-05 — righe cliccabili da tastiera

- `DataTable.tsx:130-136`: con `onRowClick` il `tr` ha `tabIndex={0}` e `onKeyDown` che, su Invio o  Spazio con `e.target === e.currentTarget`, fa `preventDefault()` e chiama `onRowClick(r)` (stesso
  schema di `Elenco` in `Flussi.tsx`). Vale per Pratiche, Clienti, Fornitori, Subagenti, Utenti,
  Registro, Liquidazioni e Analisi (nessun file di quelle viste toccato).
- `stile.css` (app e prototipo, riga 163): `.dt tbody tr.cliccabile:focus-visible` con
  `outline` interno (`outline-offset: -2px`), D-64.

## Prove

Fatte:

- `python -m py_compile strumenti/prove/app_pratiche.py strumenti/prove/app_analisi.py` → OK.
- `npx tsc --noEmit` in `app/frontend` → 0 errori.
- `npx eslint componenti/DataTable.tsx` in `app/frontend` → non eseguibile: nel progetto non c'è
  `eslint.config.*` (ESLint 10 si ferma). Nessun lint disponibile, nessun errore riportato.

Prove nel browser da lanciare a fine onda (non lanciate qui: porte e `.next` condivisi):

- `app_pratiche.py` — nuove verifiche: fuoco su «Importo» (`.dt-ordina`) + Invio → richiesta con
  `ordina=importo` e `aria-sort="ascending"`, secondo Invio `descending`; Tab fino a una riga,
  Invio → `/pratiche/<id>`.
- `app_analisi.py` — nuova verifica: risposta del server allargata a 60 documenti, con
  *Raggruppa: Documenti* il piede mostra «1–25 di 60 elementi», c'è `.dt-pagine` e 25 righe in
  pagina (A5-07). La risposta si allarga con `route.fetch()` + `fulfill` dentro la prova, perché il
  seed ha 21 documenti (< 25).
- `app_componenti.py` e `app_liquidazioni.py` — da rilanciare comunque: toccano DataTable e
  righe cliccabili. `app_flusso.py` usa i clic sul `th` (restano validi).

## Da documentare

Testo pronto per il pacchetto documentazione.

### Specifica §16.4 (DataTable) — riga *Perché*

> *naturale* cambia solo l'altezza (il contenuto, senza riempire lo spazio): la paginazione resta
> sempre attiva, come dice §16.4; si toglie solo con `perPagina: false` (tabelle corte da impilare).
> Le intestazioni ordinabili sono pulsanti dentro il `th`: si raggiungono con Tab e rispondono a
> Invio/Spazio (WCAG 2.1.1). Le righe con `onRowClick` hanno `tabIndex=0` e si aprono con Invio o
> Spazio; il fuoco è un bordo interno, mai un `outline` esterno che finisce sotto i menu (D-64).

### §19 — registro decisioni

Nessuna nuova decisione: le correzioni applicano regole già decise (§16.4 paginazione sempre
attiva, D-24 stile unico app/prototipo, D-44/D-64 fuoco interno, WCAG 2.1.1). Non serve una riga
D-nn nuova. Se si vuole traccia, la più vicina è la riga di D-64 (fuoco interno) da citare come
"vale anche per DataTable".

### Guida (`app/frontend/lib/guida.ts`) — voce DataTable / tabelle

> **Da sapere.** Le tabelle hanno sempre la paginazione, anche quelle con poche righe visibili una
> sotto l'altra (`naturale`): cambia solo l'altezza, non il numero di righe per pagina. Le
> intestazioni con la freccia ordinano l'elenco intero: si possono usare anche da tastiera (Tab per
> arrivarci, Invio o Spazio per ordinare). Le righe che aprono un dettaglio si aprono con Invio o
> Spazio dopo averle raggiunte con Tab; il fuoco è un bordo interno.

### Piano (`piano-lavoro-crm.md`)

Nessuna nuova attività: correzioni dentro il collaudo dell'onda 2 (P2). 0 ore da approvare.

### README (`app/README.md`)

Nessuna modifica necessaria: componenti e prove restano quelli descritti.
