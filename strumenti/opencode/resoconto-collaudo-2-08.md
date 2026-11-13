# Resoconto collaudo onda 2 · pacchetto 2-08 — Guscio: pagina d'errore se il server non risponde; pulsanti spenti anche da tastiera

Rilievi: A5-14, A7-07. Esecutore: DeepSeek V4.

## Stato

Fatto. Nessun file fuori dagli ammessi; nessun commit.

## Cosa ho fatto

### A5-14 — pagina bianca se `/accesso/io` fallisce al primo caricamento

- `app/frontend/app/(app)/layout.tsx:29-31, 39-52`: stato `errore` + `tentativo`. Quando
  `accesso/io` risponde con `!r.ok && r.stato !== 401` il guscio mette `errore` con `r.messaggio`
  (il 401 resta gestito da `lib/api.ts`, che porta all'accesso). Il pulsante *Riprova* azzera
  `errore` e incrementa `tentativo`, che rilancia l'effetto di lettura.
- `layout.tsx:74-89`: pagina scura come l'accesso (`body:has(.accesso-scena)`), con il messaggio
  (`role="alert"`) e *Riprova*. Non c'è più lo schermo bianco.

### A7-07 — profilo in sola lettura: i pulsanti «spenti» si premono lo stesso con la tastiera

- `layout.tsx:16-24`: `SELETTORE_SPENTI` con gli **stessi** selettori di `stile.css`
  (`.principale button.btn:not(.consentito):not(.torna)`, `.velo .modale-piede …`,
  `.affiancata .aff-piede …`, `.velo .modale-corpo …`).
- `layout.tsx:54-72`: quando `solaLettura`, un effetto registra su `document` un
  `addEventListener('click', blocca, true)` in cattura (`preventDefault` + `stopPropagation` se
  `e.target.closest(SELETTORE_SPENTI)`) e mette `aria-disabled="true"` sugli elementi che
  corrispondono, anche quando compaiono dopo (finestre, righe di tabella) con un `MutationObserver`
  su `#principale`. Pulisce tutto allo smontaggio.

## Prove

Fatte:

- `python -m py_compile strumenti/prove/app_guscio.py strumenti/prove/app_liquidazioni.py` → OK.
- `npx tsc --noEmit` in `app/frontend` → 0 errori.
- `git status --short` / `git diff --name-only` → solo i file ammessi
  (`app/(app)/layout.tsx`, `app_guscio.py`, `app_liquidazioni.py`).

Prove nel browser da lanciare a fine onda (non lanciate qui: porte e `.next` condivisi):

- `app_guscio.py` — nuova verifica A5-14: `page.route('**/api/accesso/io', 500)` su `/pratiche` →
  testo del messaggio («Qualcosa non ha funzionato») e pulsante *Riprova* visibili, schermata
  `guscio-errore-server-1440.png`.
- `app_liquidazioni.py` — nuove verifiche A7-07 nella sezione sola lettura: il pulsante spento
  («Liquidazione chiusa») ha `aria-disabled="true"`, il pulsante consentito (Esporta) no.

## Da documentare

Testo pronto per il pacchetto documentazione.

### Specifica §8.3 (Profilo in sola lettura) — riga *Perché*

> I pulsanti spenti in sola lettura (opacità e `pointer-events: none` nel CSS) si spengono anche
> per la tastiera e per il lettore di schermo: il guscio blocca il clic in cattura sugli stessi
> selettori del CSS e mette `aria-disabled="true"` sugli elementi, anche quando compaiono dopo
> (finestre, righe di tabella) con un `MutationObserver` (WCAG 4.1.2). Se il server non risponde al
> primo caricamento (`/accesso/io` con 500/502 o rete caduta) niente schermo bianco: pagina scura
> come l'accesso con il messaggio e *Riprova*.

### §19 — registro decisioni

Nessuna decisione nuova: le correzioni applicano regole già decise (D-45, §8.3, WCAG 4.1.2). Non
serve una riga D-nn.

### Guida (`app/frontend/lib/guida.ts`) — voce relativa alla sola lettura

> **Da sapere.** In un'area con la sola lettura i pulsanti spenti non si attivano neanche con la
> tastiera (Invio o Spazio) e il lettore di schermo li annuncia come non disponibili. Se il server
> non risponde all'apertura della pagina, al posto della pagina compare una schermata scura con il
> messaggio e il pulsante *Riprova*.

### Piano (`piano-lavoro-crm.md`)

Nessuna nuova attività: correzioni dentro il collaudo dell'onda 2 (P2). 0 ore da approvare.

### README (`app/README.md`)

Nessuna modifica necessaria.

## Aperto (da segnalare, fuori ammessi)

Il pulsante **Scarica** della finestra *Esporta* in Liquidazioni (`VistaLiquidazioni.tsx:391`) è
`.btn` senza `.consentito` né `.sec`: in sola lettura viene spento dal CSS (mouse) e ora anche da
tastiera, ma l'esportazione **è consentita** in sola lettura (il pulsante «Esporta in Excel» ha
`.consentito`). Prima di questo pacchetto si poteva ancora esportare da tastiera (Tab + Invio), ora
no. Va aggiunto `.consentito` a quel pulsante (file non ammesso in questo pacchetto).
