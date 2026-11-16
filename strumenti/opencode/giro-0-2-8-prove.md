# Pacchetto `giro-0-2-8-prove`

Giro nel browser dopo `pratica-da-ricerca` e `righe-nota-credito` (16/11/2026, Claude Code):
`app_oggi` 43/0, `app_liquidazioni` 77/0, `app_pratiche` 24/0; **si fermano con un errore**:
- `app_documenti` riga 203: `wait_for_selector('.avviso:has-text("Agenzia creata")')` in timeout;
- `app_pratica` riga 424: `pg.go_back(); wait_for_function("location.pathname === …")` in timeout.
Uscite in `strumenti/collaudo/e2e/uscita/e2e/<prova>.txt` e schermate nella cartella omonima.

## Compito
1. Capisci la causa di ciascuno: difetto vero dell'app (es. avviso che non compare più, «Torna indietro» rotto dalla
   nuova `?vista=sola` o dal pulsante «apri in nuova scheda» di `RicercaEntita`) oppure prova da aggiornare a un
   cambio voluto (scrivi quale pacchetto). Difetto vero → correggi l'app, non la prova.
2. Giro: `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_giro` una volta, poi
   `bash strumenti/collaudo/e2e/giro.sh decobrands_test_giro <prove…>` (backend 8012, frontend 8071; **mai 8001/8002**).
   Se una pagina va in timeout al primo giro, scaldala con `curl -s -o /dev/null -m 180 http://localhost:8071/<pagina>`
   e rilancia. Obiettivo **0 KO e nessun errore** su: `app_documenti`, `app_pratica`, `app_pratiche`, `app_oggi`,
   `app_liquidazioni`, `app_fornitori`, `app_soggetti`, `app_utenti`, `app_componenti`, `app_registro`.
3. Prova anche (in `app_documenti` o `app_pratica`) il pulsante icona «Apri la pratica in una nuova scheda» della
   modale «Cerca pratica»: si apre una scheda nuova su `/pratiche/<id>?vista=sola` senza barra di navigazione né
   «Torna a…», con «Chiudi la scheda»; il clic non seleziona la riga.
4. `npx tsc --noEmit` frontend.

File ammessi: `strumenti/prove/*.py`, `strumenti/collaudo/e2e/*`, `app/frontend/**` (solo difetti veri, scrivili).
Backend solo per un difetto vero (scrivilo in testa al resoconto). Regole: `strumenti/opencode/regole-onda-parallela.md`,
`CLAUDE.md` (selettori schede: `.schede-barra [role=tab]`). Niente commit, `cd`, `/tmp`, `&` (il `&` dentro giro.sh va
bene), `.env` mai letto, mai `decobrands_db`. Skill: `playwright-best-practices`, `ponytail-review`, `caveman`.
Resoconto: `strumenti/opencode/resoconto-giro-0-2-8-prove.md` (prova → OK/KO prima e dopo, cause, difetti corretti).
Riepilogo in 8 righe.
