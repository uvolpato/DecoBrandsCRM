# Resoconto — Visore PDF: tutte le pagine, scorrevoli

**Pacchetto:** `strumenti/opencode/pdf-tutte-le-pagine.md` · **Esecutore:** DeepSeek Flash · 13/11/2026

## Stato

Fatto. Prove a 0 KO.

## File toccati

- `app/frontend/componenti/PdfEvidenziato.tsx` — riscritto: tutte le pagine in un riquadro che
  scorre, un `<canvas>` per pagina (`aria-label="Pagina N di M"`), rettangolo del valore sulla
  pagina `pagina` (coordinate 0–1, margine calcolato dall'altezza della pagina) e
  `scrollIntoView` del rettangolo al cambio del campo selezionato. Firma invariata
  (`src`, `pagina` ora facoltativa con valore 1, `posizione`): `VistaDocumento.tsx` e
  `VistaBollettino.tsx` non cambiano.
- `strumenti/prove/app_bollettino.py` — il PDF di prova ha ora **due pagine**: la prova
  controlla i due canvas (`Pagina 1 di 2`, `Pagina 2 di 2`) e che siano disegnati entrambi.
- Nessuna modifica a `stile.css` né a `VistaDocumento.tsx` / `app_documenti.py` (li tocca il
  pacchetto delle soglie). Spazio fra le pagine con stile in linea (`marginBottom: 8`).

## Scelte

- Tutte le pagine disegnate subito (limite ~20 pagine dichiarato nel commento `ponytail:` nel
  componente). Oltre, il posto per il disegno a richiesta è il ciclo di render in fondo all'effetto.
- I canvas nascono al render successivo al conteggio delle pagine: l'effetto aspetta un
  fotogramma (`requestAnimationFrame`) prima di disegnarci sopra.
- Altezza della pagina del rettangolo ricavata dall'aspetto (`height/base.width`) della sola
  pagina indicata: il margine di 5 px resta in percentuale corretta anche con pagine di formato
  diverso.
- `pagina` fuori intervallo: nessun rettangolo e nessuna eccezione (prima PDF.js lanciava su
  `getPage`).

## Prove

- `npx tsc --noEmit` nel frontend: **passa**.
- `python -m py_compile strumenti/prove/app_bollettino.py`: passa.
- `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e` + `giro.sh ... app_bollettino`:
  **43 controlli, 0 KO** (con il PDF di prova a 2 pagine: due canvas disegnati). prepara.log era
  fermo da oltre un'ora e nessun python in corso: nessun conflitto con il pacchetto delle soglie
  (il suo frontend di prova sulla 8071 è stato ricopiato dal mio `prepara.sh`).
- Controllo visivo: schermata `uscita/e2e/app_bollettino/app-bollettino-768.png` — le due pagine
  sono una sotto l'altra alla larghezza del riquadro, separate dal fondo grigio; nessuna
  regressione di layout.
- Da fare in onda (Claude Code): rilanciare `app_documenti.py`, che tocca lo stesso componente
  (rettangolo e pagina del campo): non l'ho lanciato perché è del pacchetto delle soglie.
  I suoi selettori `.aff-sx canvas` contano 1 canvas e i PDF di prova di lì sono a una pagina,
  quindi non dovrebbero rompersi.

## Da documentare

- Spec §6.6.1: il visore mostra **tutte** le pagine del PDF, una sotto l'altra in un riquadro
  che scorre; il campo selezionato porta alla sua pagina, con il rettangolo del valore disegnato
  sulla pagina giusta. Senza posizione nessuno scorrimento forzato.
- Guida (Documenti, «da sapere»): il visore mostra tutto il documento e scorre; scegliendo un
  campo si arriva alla pagina che lo contiene.
