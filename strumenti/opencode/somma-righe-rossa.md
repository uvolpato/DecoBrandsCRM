# Pacchetto `somma-righe-rossa`

Finestra di correzione del documento (`app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`), campo
**Importo**: sopra il campo c'è «Somma righe 0,00 € · diversa di 1.766,62 €». Quel testo allarga la colonna e
fa comparire **sempre la barra di scorrimento orizzontale** della finestra.

Ugo (15/11/2026):
- togli «· diversa di …»;
- «Somma righe 0,00 €» **in rosso** quando la somma è diversa dall'importo (colore errore esistente, es.
  `var(--errore-testo)`), normale/tenue quando coincide;
- mettilo **a fianco dell'etichetta «Importo»** (stessa riga: «Importo  Somma righe 0,00 €»); va a capo
  **solo se non ci sta**;
- **nessuna barra orizzontale**: il testo può andare a capo, la colonna non si allarga (`min-width: 0`,
  `flex-wrap`, `overflow-wrap`), verifica anche gli altri campi della stessa griglia.
L'importo diverso resta comunque spiegato nel `title` della scritta («diversa dall'importo di 1.766,62 €»).

File ammessi: `VistaDocumento.tsx`, `app/frontend/app/stile/stile.css` (solo aggiunte in fondo, `grep` sui
nomi prima), `app/frontend/lib/guida.ts` se descrive «diversa di». Aggiungi, non riscrivere.
Regole: leggi prima `strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`. Niente commit, `cd`, `/tmp`,
`&`, 8001/8002. Skill: `ponytail-review`, `caveman`.
Prove: `npx tsc --noEmit` frontend. Riepilogo in 5 righe, niente resoconto a parte.
