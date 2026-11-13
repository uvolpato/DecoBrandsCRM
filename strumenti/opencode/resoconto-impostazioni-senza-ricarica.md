# Resoconto — Impostazioni senza ricarica (13/11/2026)

Pacchetto: `strumenti/opencode/impostazioni-senza-ricarica.md` — esecutore DeepSeek Flash.

## Lavoro
- Nuovo `app/frontend/app/(app)/impostazioni/layout.tsx`: monta `<VistaImpostazioni />` nel layout, che
  Next tiene montato fra `/impostazioni/<sezione>`. La sezione la legge `VistaImpostazioni` da
  `useParams`, quindi indirizzo, tasto Indietro e *Salva* restano come prima; cambiando sezione si
  ridisegna solo il pannello di destra (stessi componenti, `form key={sez.chiave}` come già era).
- `app/frontend/app/(app)/impostazioni/[sezione]/page.tsx`: restituisce `null` (dà solo l'indirizzo).
- `app/frontend/app/(app)/impostazioni/page.tsx`: invariato (`redirect('/impostazioni/azienda')`).
- Dati caricati una volta: `useEffect(..., [])` dentro `VistaImpostazioni` non rifà `GET /api/impostazioni`
  al cambio sezione. Dopo *Salva* `carica()` ricalca il comportamento di prima.
- Permessi invariati: la vista sta dentro il `children` del guscio `(app)/layout.tsx`, quindi la
  `Riservata` continua a coprirla (la prova su `lett` → «Pagina riservata» resta valida).
- Memoria della schermata (`useMemoria`, `lib/memoria.ts`): `VistaImpostazioni` non usa `useMemoria`
  (nessun filtro, scheda, ordinamento o pagina da ricordare; le due `useEffect` con chiave `sez?.chiave`
  girano anche restando montati). Nulla da adattare. Il calcolo delle chiavi in `lib/memoria.ts` usa i
  primi due segmenti (`/impostazioni`), quindi eventuali memorie future restano per sezione.
- Nessun'altra pagina toccata.

## Prove
- `npx tsc --noEmit` nel frontend: passa.
- `npx tsc --noEmit` nel backend: passa (backend non toccato).
- `python -m py_compile strumenti/prove/app_impostazioni.py`: passa.
- Controllo nuovo in `strumenti/prove/app_impostazioni.py`: dopo il clic su *Conservazione dei dati*
  (1) il pannello «Sezioni» è lo stesso nodo (attributo `data-prova-ferma` messo con `evaluate` prima
  del clic e ancora presente dopo), (2) nessun `.sagoma` in pagina, (3) a destra compare
  `#c-righe_pagina`, (4) nessuna `GET /api/impostazioni` fra le risposte.
- **Prova nel browser non lanciata**: `strumenti/collaudo/e2e/uscita/` mostra attività di altri
  pacchetti (log `backend-app_bollettino.log` alle 17:19, mentre questo pacchetto girava), quindi per
  la regola della shell mi sono fermato a `py_compile`. La lancia Claude Code a fine onda con
  `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e` e
  `bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_impostazioni`.

## Pagine con lo stesso schema (menu a sinistra, dettaglio a destra) — solo elencate, non cambiate
- **Già a posto (la vista sta nel layout, non si rimonta):** `documenti` (layout + `[[...id]]`),
  `utenti`, `clienti`, `fornitori`, `subagenti`, `soggetti`, `bollettini` (l'elenco si monta solo senza
  `id`, il dettaglio è una vista sua), `pratiche` (idem).
- **Da guardare:** `liquidazioni` — `app/(app)/liquidazioni/[anno]/[trimestre]/page.tsx` monta
  `VistaLiquidazioni` dentro la pagina, senza layout: cambiando trimestre la vista si rimonta (il
  commento dice «la pagina resta montata», ma non c'è un layout che lo garantisca). Stesso schema del
  rilievo di Impostazioni; va corretto a parte.

## Da documentare
- Spec §7.15 (Impostazioni): aggiungere una riga *Perché* — la vista sta nel layout della sezione così
  il cambio sezione non rimonta la pagina e non rifà `GET /api/impostazioni`; eventuale decisione nuova
  in §19 (D-nn) a cura di Claude Code.
- `prototipo-alternativo/LEGGIMI.md` e `guida.js`: nessun cambio di testo visibile (la pagina è identica),
  quindi nulla da aggiornare salvo la nota tecnica nella spec.
- `strumenti/prove/app_impostazioni.py`: descrizione in testa da estendere col controllo «cambio sezione
  senza rimontare» (fatto qui, la riga di commento è già nel file).
- Liquidazioni: segnalato sopra; farlo con un pacchetto suo se Ugo lo vuole.
