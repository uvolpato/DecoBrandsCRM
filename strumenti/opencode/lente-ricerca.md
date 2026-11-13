# Lente dei campi di ricerca dopo il testo (13/11/2026)

**Esecutore: DeepSeek Flash** · segnalazione di Ugo (schermata: finestra «Cerca fornitore», la lente copre l'inizio di «Cerca fornitore»). Regole comuni: `strumenti/opencode/regole-onda-parallela.md` (**niente `cd` fuori dal progetto, niente `/tmp`, niente `&`, non leggere la copia del frontend fuori dal progetto, mai `.env`**; mai `decobrands_db`, mai le porte 8001/8002). Altri pacchetti lavorano su documenti, soglie e visore PDF: tocca **solo** i file ammessi. Scrivi subito `strumenti/opencode/resoconto-lente-ricerca.md`. Massimo 45 minuti.

## Problema
Il campo di ricerca standard (`app/frontend/componenti/FilterBar.tsx` riga ~105: `<label className="cerca"><Icona nome="cerca" /><input type="search" …/></label>`; CSS `app/frontend/app/stile/stile.css` righe ~182–188: `.cerca .icona` assoluta a sinistra, `.cerca input` con `padding-left: 34px`) in alcuni punti — sicuramente nella finestra di `RicercaEntita` (`componenti/CampoRicerca.tsx`, «Cerca fornitore/cliente/…») — mostra la lente **sopra** il testo. È diffuso.

## Correzione (decisione di Ugo)
- La lente va **dopo il campo, a destra** (dentro il bordo, a destra), in **tutti** i campi `.cerca`: `.cerca .icona { left: auto; right: 10px; }` e `.cerca input { padding: 7px 34px 7px 12px; }` o equivalente, e il marcatore nativo di `type=search` (la ✕ di Chrome) non deve finire sotto la lente (nascondilo o spostalo: scegli il più semplice).
- Trova **perché** nella finestra il padding non valeva (regola più specifica che lo sovrascrive?) e sistemalo alla radice, non con una regola solo per la finestra se si può evitare.
- Cerca con grep **tutti** gli altri campi di ricerca con una lente (`Icona nome="cerca"`, classi `cerca*`, `ricerca-lente`, `esp-strumenti .cerca-esp`, `strumenti-scheda .cerca`) e rendili coerenti: lente a destra, testo mai coperto. Il pulsante `.ricerca-lente` del campo di ricerca a selezione multipla è già a destra: lascialo.
- Stessa modifica in `prototipo-alternativo/assets/stile.css` (i due fogli restano uguali, D-24).

## Prova (controllo visivo, regola 5 di CLAUDE.md)
Uno script Playwright breve in `strumenti/collaudo/e2e/uscita/` (non nel progetto) che apre il **catalogo dei componenti del prototipo** `prototipo-alternativo/index.html#/componenti` da file (niente server) e fa schermate a 1440 e 768 px dei campi di ricerca e della finestra di ricerca; guardale e scrivi nel resoconto cosa hai verificato. Poi `npx tsc --noEmit` nel frontend. Le prove nel browser dell'app le lancia Claude Code.

## File ammessi
`app/frontend/app/stile/stile.css`, `prototipo-alternativo/assets/stile.css`, `app/frontend/componenti/FilterBar.tsx` (solo se serve spostare l'icona nel markup), il resoconto. Carica davvero `caveman`.
