# Resoconto — `pdf-errore-visibile`

## File toccati

- `app/frontend/componenti/PdfEvidenziato.tsx` (unico file di codice).

## Cosa è cambiato

- Il `.catch(() => {})` silenzioso è sparito. Il caricamento ora ha un **tentativo automatico in più**;
  se fallisce anche quello, il pannello mostra «Non riesco a mostrare il PDF» con il pulsante
  **Riprova** (`tentativo` in più nell'effetto) e il link **Apri il PDF** (stesso `src`, nuova scheda).
- Mentre carica, al posto del grigio vuoto c'è una **sagoma** (`Sagoma` + `useSagome`, D-59): compare
  dopo 150 ms e resta finché la prima pagina non è disegnata (`pronto`), così non lampeggia.
- Larghezza 0 al montaggio: era **già coperta** dal `ResizeObserver` esistente dell'effetto della
  larghezza (osserva per tutta la vita del componente e riporta la nuova misura appena il pannello
  ne ha una), quindi nessun cambio: l'effetto di caricamento riparte da solo quando `larghezza` passa
  da 0 a un valore. Nessun nuovo osservatore, niente codice morto.
- Nessuna modifica a `stile.css`: riusati `.btn` e `.btn.sec` (già con `text-decoration: none` per il
  link); il resto è stile in linea come nel componente originale.

## Prove

- `npx --prefix app/frontend tsc --noEmit -p app/frontend`: **0 errori**.
- Prove nel browser non lanciate (regole dell'onda): le esegue Claude Code a fine onda.

## Da documentare

- Registrare una decisione (§19): il visualizzatore PDF della finestra «Correggi i dati letti» non deve
  fallire in silenzio; un errore mostra «Non riesco a mostrare il PDF» con Riprova e Apri il PDF, e
  durante il caricamento si mostra la sagoma (D-59), non un pannello vuoto.
- Nota di correzione: un errore di `PdfEvidenziato` non va più inghiottito; il riquadro grigio muto era
  la causa di «il PDF non si vedeva, poi ricaricando sì».
