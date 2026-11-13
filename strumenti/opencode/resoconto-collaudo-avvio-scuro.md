# Resoconto — Pagina d'avvio scura con indicatore di caricamento

Stato: finito.

## Lavoro
- Letto il pacchetto e le regole comuni; skill `caveman` caricata; `graphify query` eseguita prima di leggere il codice.
- grep: `avvio-gira` non esisteva nel codice (solo nel pacchetto). Nessun doppione creato.
- `app/frontend/app/(app)/layout.tsx`: `if (!io) return null;` sostituito dalla scena scura
  `.accesso-scena.aperta` con `<div className="avvio-gira" role="status" aria-label="Caricamento" />`,
  più un commento breve del perché (mai lampo chiaro). `body:has(.accesso-scena)` rende scuro il fondo.
- `app/frontend/app/stile/stile.css`: regole `.avvio-gira`, `@keyframes avvio-gira`, variante
  `prefers-reduced-motion` (2.4s), subito dopo il blocco delle animazioni dell'accesso.
- `prototipo-alternativo/assets/stile.css`: stesse regole (D-24); verificato che le due sezioni
  dell'accesso restano uguali con `diff`.

## Prove
- `npx tsc --noEmit` nel frontend: 0 errori.
- `diff` delle sezioni accesso dei due `stile.css`: uguali.
- Prove nel browser non lanciate (regole d'onda: le lancia Claude Code a fine onda).

## Da documentare
- `specifica-crm-provvigioni.md` §7.0 (accesso): al posto del vuoto, pagina scura d'attesa con
  cerchio di caricamento (indicatore `role=status`, etichetta «Caricamento»).
- §19: nuova decisione (D-nn, 13/11/2026) — «Guscio senza utente: scena scura d'avvio, mai pagina
  chiara vuota; il lampo chiaro è un difetto». Perché: il passaggio chiaro→scuro si vedeva a ogni
  accesso. Dove: `app/frontend/app/(app)/layout.tsx`, `stile.css`.
- `guida.js` / `LEGGIMI.md` del prototipo: nessun cambiamento di comportamento o testo visibile
  (il prototipo non usa questa scena, il CSS è solo allineato per D-24).
- `piano-lavoro-crm.md`: nessuna nuova attività (correzione dentro il collaudo).
