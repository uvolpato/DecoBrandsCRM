# Scaglione nel flusso — correzioni 1: app_fornitori (14/11/2026)

**Esecutore: DeepSeek V4 pro.** Prima leggi `scaglione-nel-flusso.md` e `resoconto-scaglione-nel-flusso.md` (modifiche non committate: `FormPercentuali.tsx` estratto da `VistaFornitori.tsx`, numeri rossi in `CampoRicerca.tsx`). Regole: `regole-onda-parallela.md`; **niente `cd`, `/tmp`, `&`, `.env`**; mai `decobrands_db`, 8001/8002, Integra. Niente commit.

## KO (giro `app_documenti app_componenti app_fornitori app_pratica`: documenti 135/0, componenti 59/0, pratica 87/0)
`strumenti/prove/app_fornitori.py`:
- primo giro (database nuovo): blocco alla riga 57, dopo il clic su `.dt tbody tr.cliccabile` la pagina non va su `/fornitori/<id>` (timeout);
- secondo giro (stesso database): 2 KO «indietro: stesso fornitore e ricerca ricordata» e «indietro: stessa scheda».
Prima di questo pacchetto `app_fornitori` passava 35/0. Sospetto: lo spostamento in `FormPercentuali` o la correzione di `CampoRicerca` (numeri rossi) hanno toccato la memoria della schermata (`registra`, §7.12) o il clic sulla riga. Anche `app_componenti` aveva avuto «memoria: la scheda aperta si ritrova» (gara dopo `go_back`, corretta solo nella prova): verifica che non sia lo stesso difetto dell'app.

Causa (a) app / (b) prova / (c) dati: se è l'app correggi l'app.

## Come lanciare
`bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e` poi `bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_fornitori app_componenti` (timeout 10 min). Chiudi con **due giri** a 0 KO, ognuno dopo `prepara.sh`.

## File ammessi
`app/frontend/app/(app)/fornitori/**`, `app/frontend/componenti/FormPercentuali.tsx`, `app/frontend/componenti/CampoRicerca.tsx`, `app/frontend/componenti/Schede.tsx`, `app/frontend/lib/memoria*` (o il file di `registra`), `strumenti/prove/app_fornitori.py`, `strumenti/prove/app_componenti.py`, il resoconto `resoconto-scaglione-nel-flusso-correzioni-1.md`. `tsc --noEmit` nel frontend. Carica davvero `playwright-best-practices`, `ponytail-review`, `caveman`.
