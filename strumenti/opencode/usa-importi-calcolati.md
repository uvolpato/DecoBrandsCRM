# Pacchetto `usa-importi-calcolati`

## Contesto
Finestra di correzione del documento (`app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`), tabella
**Righe** con «+ Aggiungi riga» in alto a destra. Per ogni riga in cui l'importo letto è diverso dal
calcolato (quantità × prezzo × (1 − sconto/100)) la cella è arancio con il pulsantino «Usa 25,65 €»
(pacchetto `importo-calcolato`, resoconto `strumenti/opencode/resoconto-importo-calcolato.md`).
Con 26 righe da sistemare bisogna cliccarli uno per uno.

Ugo (15/11/2026): aggiungi il pulsante **«Usa importi calcolati»** accanto a «+ Aggiungi riga» (a sinistra
di questo): mette il calcolato su **tutte** le righe che hanno il pulsantino «Usa …», cioè fa per ognuna
quello che fa il pulsantino (l'importo diventa calcolato, cioè vuoto). Visibile solo se almeno una riga
è diversa; testo con il numero («Usa importi calcolati (26)»). Stile `.btn` secondario esistente.

## Note
- Nessun salvataggio automatico: cambia solo la bozza; si salva con il pulsante di sempre. Il server
  ricalcola come già fa (V12).
- Nello screenshot gli importi letti sono **0,00 €** su tutte le righe: verifica (sola lettura,
  `decobrands_db`, URL con grep) se è una lettura vera a 0 o un difetto della tabella (es. importo letto
  vuoto mostrato come 0,00 invece di «calcolato»). Se è un difetto della tabella correggilo in questo file;
  se è altro, scrivilo nel resoconto.

## File ammessi
Solo `VistaDocumento.tsx` e `app/frontend/lib/guida.ts` (una riga). Aggiungi, non riscrivere.

## Regole
Leggi prima `strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`. Italiano, codice minimo. Niente
commit, 8001/8002, `cd`, `/tmp`, `&`. Skill: `ponytail-review`, `caveman`.

## Prove
`npx tsc --noEmit` frontend pulito.

## Resoconto
`strumenti/opencode/resoconto-usa-importi-calcolati.md`: file toccati, causa degli 0,00 €, prove,
«Da documentare».
