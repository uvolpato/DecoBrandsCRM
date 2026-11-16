# Correggi i dati letti: i pallini verdi di cliente e fornitore sono link (15/11/2026)

**Esecutore: DeepSeek Flash** · Gravità: P2.

Regole comuni: `regole-onda-parallela.md`. **Niente `cd`, niente `/tmp`, niente `&`, non leggere `.env`.** Mai `decobrands_db`, 8001/8002, Integra. Niente commit. In parallelo gira `codice-cliente-non-trovato` (solo backend): non toccare `app/backend/**`.

## Cosa vuole Ugo
Nella finestra *Correggi i dati letti* (`app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`) il **pallino verde** accanto alla ricerca Cliente e alla ricerca Fornitore (scelta valida) diventa un **link** alla pagina del cliente / del fornitore **già filtrata e con la voce selezionata** (es. `/clienti?…` o `/clienti/<id>` e `/fornitori/<id>`: usa le rotte e i parametri che le pagine Clienti e Fornitori già capiscono per aprire una voce selezionata; guarda come ci arrivano gli altri link dell'app, es. il link alla scheda del cliente nel riquadro «agenzia mancante»).
- Si apre in una **nuova scheda del browser** (`target="_blank" rel="noopener"`), così le correzioni non salvate della finestra non si perdono.
- Solo con il pallino verde (valore scelto e trovato); grigio o rosso restano come sono.
- Accessibile: `aria-label` «Apri la scheda del cliente <nome>» / «… del fornitore …», `title` uguale, fuoco con bordo interno (D-64).
- Fallo nel componente condiviso `app/frontend/componenti/CampoRicerca.tsx` con una prop opzionale (es. `link?: (id) => string`) usata da `VistaDocumento.tsx` per cliente e fornitore, così vale anche altrove se servirà; nessun cambiamento dove la prop non c'è.

## File ammessi
`app/frontend/componenti/CampoRicerca.tsx`, `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`, il foglio di stile dell'app (solo classi nuove, controllate con grep), `app/frontend/lib/guida.ts`, `strumenti/prove/app_documenti.py`, il resoconto `strumenti/opencode/resoconto-pallini-link.md`.

## Fine
- `npx tsc --noEmit` nel frontend.
- `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e` e `bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_documenti` (timeout 10 min), 0 KO; controllo nuovo: pallino verde è un link con `href` alla pagina giusta e `target=_blank`.
- Carica davvero `ponytail-review`, `caveman`.
