# Resoconto · Onda 2 · Pacchetto 2-13 — mpiu/mk esportati da PeriodoMesi

Data: 13/11/2026 · Esecutore: DeepSeek V4 Flash · Rilievo: A8-07 (solo parte frontend, P3)

## Cosa ho fatto

**A8-07 — aiuti duplicati, parte frontend** (solo `mpiu`/`mk`, come chiede il pacchetto):

- `app/frontend/componenti/PeriodoMesi.tsx:10-11` — `mk` e `mpiu` ora sono `export const`. Nessun cambio di logica: restano le stesse funzioni, usate da `completaPeriodo` e dal componente.
- `app/frontend/app/(app)/analisi/VistaAnalisi.tsx:10` — `mpiu` importato da `@/componenti/PeriodoMesi`; rimossa la copia locale (ex riga 25). La copia locale calcolava l'anno con `Math.floor(t / 12) + '-' + String((t % 12) + 1).padStart(2, '0')`: stesso risultato della versione esportata, che passa da `mk` (mese sempre a due cifre).
- `app/frontend/app/(app)/bollettini/VistaBollettini.tsx:9` — `mpiu` importato da `@/componenti/PeriodoMesi`; rimosse le copie locali di `mk` e `mpiu` (ex righe 24-25). In questa vista `mk` serviva solo dentro `mpiu`, quindi non si importa.

`MESI` ed `etichetta` duplicati nelle due viste **non** sono stati toccati: il pacchetto limita questo lavoro a `mpiu`/`mk` (le altre copie sono in A8-01/altri pacchetti).

Nessun file fuori dagli ammessi è stato modificato. Nessun commit.

## Prove

- `npx tsc --noEmit` in `app/frontend`: **1 errore, non mio** —
  `app/(app)/pratiche/VistaPratiche.tsx(54,63): error TS2304: Cannot find name 'Variante'`.
  Quel file è in lavorazione da un pacchetto in parallelo (è nella lista dei vietati per me). I tre file del pacchetto non producono errori.
- `git diff --name-only`: solo `app/frontend/componenti/PeriodoMesi.tsx`, `app/frontend/app/(app)/analisi/VistaAnalisi.tsx`, `app/frontend/app/(app)/bollettini/VistaBollettini.tsx` (+ questo resoconto). Le altre modifiche presenti nel working tree sono di altri pacchetti dell'onda.
- `python -m py_compile strumenti/prove/app_analisi.py strumenti/prove/app_bollettini.py`: OK (nessuna modifica alle prove; non citano `mpiu`/`mk`).
- `npm test` del backend **non** lanciato: il pacchetto non tocca il backend e i file backend sono in modifica dai pacchetti paralleli (esito non attendibile). Il backend lo copre A8-01, che sposta `dataIt`/`MESI`.
- Lint non lanciato: in `app/frontend` manca ancora `eslint.config.mjs` (lo aggiunge il pacchetto 2-14).
- Database di prova: non usato.

## Prove nel browser da lanciare a fine onda

- `strumenti/prove/app_analisi.py` — pulsante periodo, segmenti di durata e frecce ‹ › usano `mpiu` (`VistaAnalisi.tsx:132,135`).
- `strumenti/prove/app_bollettini.py` — frecce ‹ › della matrice usano `mpiu` (`VistaBollettini.tsx:107`).

## Da documentare

- §19 / spec: **nulla**. È uno spostamento senza cambio di regola: nessuna nuova decisione, nessuna riga *Perché*.
- `app/frontend/lib/guida.ts`: nulla (l'interfaccia non cambia).
- `piano-lavoro-crm.md`: attività di manutenzione dentro A8-07, ore già previste; nessuna riga nuova.
- README / LEGGIMI / PRD: nulla.
