# Pacchetto `barra-filtri-lampeggio`

Leggi `strumenti/opencode/resoconto-barra-filtri-una-riga.md`. Il pacchetto ha reso `FilterBar.tsx` capace di
trasformare i segmenti in tendina quando la barra non sta su una riga. **Difetto** (Ugo, 15/11/2026, visibile
nella pagina **Utenti e ruoli**, `app/frontend/app/(app)/utenti/VistaUtenti.tsx`): la barra passa da tendina a
segmenti e indietro molte volte al secondo (lampeggio).

Causa probabile: la decisione dipende dal layout corrente (va a capo / non va a capo), che cambia proprio per
effetto della decisione, e il `ResizeObserver` osserva elementi la cui misura cambia con lo scambio.

## Compito
Correggi alla radice in `FilterBar.tsx`: la decisione dipende **solo** da grandezze che non cambiano con lo
scambio:
- larghezza del contenitore esterno (osserva solo quello, non i figli);
- larghezza necessaria = larghezza naturale dei segmenti (dal clone nascosto) + larghezza degli altri controlli
  (misurata indipendentemente dallo stato, es. somma delle larghezze dei controlli non-segmento, aggiornata
  quando cambiano voci/numeri) + spazi.
`stretta = contenitore < necessaria`; si torna ai segmenti solo se `contenitore >= necessaria + 24`. Nessun
`setState` se il valore non cambia. Controlla anche le altre pagine con segmenti (Utenti, Pratiche, Documenti,
Bollettini, Clienti, Soggetti, Analisi…): stesso comportamento, nessun lampeggio.

Se riesci ad avviare il frontend su una porta di prova (non 8001/8002), prova con Playwright a 1440, 1100 e 768 px
su Utenti e Pratiche che dopo il primo assestamento i cambi in 2 secondi siano 0; se non puoi, scrivilo.

File ammessi: `FilterBar.tsx`, `stile.css` (solo le regole del pacchetto precedente), uno script di prova in
`strumenti/prove/`. Regole: leggi prima `strumenti/opencode/regole-onda-parallela.md`. Niente commit, `cd`,
`/tmp`, `&`. Skill: `ponytail-review`, `caveman`. Prove: `npx tsc --noEmit` frontend. Aggiorna il resoconto del
pacchetto precedente (sezione «Lampeggio»). Riepilogo in 5 righe.
