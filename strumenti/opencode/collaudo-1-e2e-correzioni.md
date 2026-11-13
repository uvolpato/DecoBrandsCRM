# Collaudo · Onda 1 · 1-e2e — KO delle prove nel browser dopo l'onda 1 (13/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità: **P2**: prima del commit dell'onda 1.

Regole di lavoro: `regole-onda-parallela.md`. Sei **l'unico pacchetto in corso**.

> **Comandi**: niente `cd` nei comandi della shell (un `cd` fuori posto viene rifiutato e la sessione si ferma). Usa sempre percorsi dalla radice del progetto (`app/frontend/...`, `npx --prefix app/backend ...` oppure lo strumento `workdir` se c'è) e per cercare file usa gli strumenti glob/grep, non `find`. Una sessione precedente si è fermata così senza fare nulla: ricomincia da capo.

## Contesto
- L'onda 1 (pacchetti 1-01…1-25, resoconti `resoconto-collaudo-1-*.md`) è nell'albero, non ancora committata: `git diff` mostra tutte le sue modifiche.
- Jest è verde (40 suite) e `tsc` è a posto.
- Il giro delle prove nel browser (`strumenti/prove/app_*.py`) ha i KO e i blocchi qui sotto.
- Per ognuno devi capire se è:
  - **(a) un errore dell'app**: una regressione dell'onda 1 o un difetto vero. Si corregge il codice;
  - **(b) una prova superata**: l'app è cambiata di proposito (decisione nel §19, resoconto di un pacchetto, seed nuovo) e la prova si aggiorna;
  - **(c) un problema dei dati di prova**: le prove girano in sequenza sullo stesso database e una cambia i dati di quella dopo. Si rende la prova indipendente.
- **Nel dubbio fra (a) e (b) leggi la spec e i resoconti.** Non aggiornare una prova per far passare un errore vero.

## Come lanciare le prove nel browser (qui puoi farlo tu)
- Il frontend di prova è già acceso sulla 8071 (`next dev`), da una **copia** di `app/frontend`.
- Il backend lo avvia lo script sulla 8012, uno nuovo per ogni prova.
- Dalla radice:
  ```bash
  bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e      # database nuovo + build + copia del frontend
  bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_registro app_sistema   # le prove scelte
  ```
- L'esito di ogni prova è in `strumenti/collaudo/e2e/uscita/e2e/<prova>.txt`, il log del backend in `uscita/backend-<prova>.log`.
- **Dopo ogni modifica al codice dell'app rilancia `prepara.sh`**: build e copia del frontend.
- Gli script leggono da soli l'indirizzo del database. Tu non leggere `.env` e non stampare indirizzi con la password.
- Non toccare le porte 8001/8002 né `decobrands_db`. Integra mai.
- Le prove vanno in sequenza sullo stesso database. Per un KO che dipende dall'ordine, rifai il database e lancia la prova da sola, oppure nell'ordine alfabetico del giro completo.

## KO e blocchi (giro completo, database nuovo, ordine alfabetico)
1. `app_bollettino` si blocca alla riga 272: dopo «Carica» del bollettino in PDF non compare `.avviso`. Nota: 1-23 ha cambiato gli avvisi (`componenti/Piccoli.tsx`: regione unica, nascosta finché non c'è un messaggio).
2. `app_componenti` si blocca alla riga 115 su `wait_for_selector`. Da sola, dopo un'altra esecuzione, era passata la parte iniziale.
3. `app_liquidazioni` si blocca alla riga 232 con `KeyError: 'message'`: la risposta di `POST liquidazioni/2026/3/chiudi` non ha `message`. Guarda lo stato e il corpo veri: c'entra il filtro errori (1-13, `errori.filter.ts`)?
4. `app_guscio` (riga 60) e `app_menu_utente` (riga 66): dopo «Dati» la prova aspetta `/fornitori`, ma l'area Dati apre `/soggetti` (pagina aggiunta nell'onda 0 bis). Probabile (b). Controlla in spec §7/§8 qual è la prima voce dell'area Dati.
5. `app_documenti` 4 KO:
   - «a destra il documento scelto, senza cambiare pagina»;
   - «dettaglio: titolo con il documento»;
   - «errore: pulsante Rileggi il documento»;
   - «errore: pulsante Correggi i dati letti».
   Gli ultimi due dipendono da 1-03 (A4-01: servizio non disponibile, i tentativi non si consumano).
6. `app_pratiche` 2 KO: «ordinamento per importo crescente» e «secondo clic: importo decrescente».
7. `app_registro` 5 KO: i conteggi `Tutto` 163, `Anomalie aperte` 5, `Errori` 7, il totale della tabella e le righe della prima pagina. Nota: 1-13 registra i 400 come `negato` e non più come errori. Controlla se i numeri attesi sono scritti fissi nella prova (b/c) o se c'è un errore vero.
8. `app_sistema` 2 KO: «i servizi spenti sono verdi con la nota "Non configurata" (3/4)» e «lo stato dei servizi spenti è "Funziona"». Guarda 1-03 e 1-10 (`sistema.ts`, `lettura.ts`, `casella.ts`).
9. `app_scartati` 1 KO: «il sottotitolo dice i giorni di conservazione».
10. `app_caricamento` 2 KO: «Clienti / Fornitori: la prima riga resta ferma» (280 → 289 px, 203 → 262 px): la tabella si sposta durante il caricamento (sagome, D-59).
11. `app_flusso` 4 KO:
    - «54 pratiche» e «i numeri dei segmenti vengono dal server (54…)»;
    - «pagine 26–50 di 55»;
    - «Guida: 18 argomenti».
    Probabile seed o guida cambiati (b): verifica.

Insieme ai KO correggi anche questi rilievi aperti dell'onda 1, se sono piccoli:
- **1-10**: il codice nuovo `casella.interno` va in `sistema.ts` (`COSA_FARE` o simile) e negli schemi del registro (`registro.ts`), come gli altri codici della casella.
- **1-23**: la regione degli avvisi va creata vuota dopo il montaggio (A7-11), con un `useEffect` nel layout `app/frontend/app/(app)/layout.tsx` o in un componente `RegioneAvvisi` esportato da `Piccoli.tsx`. Lo snippet è pronto in `resoconto-collaudo-1-23-correzioni-1.md`.

## Regole
- V12: calcoli sul backend; V13: una transazione.
- Codice minimo (ponytail), italiano, commento con rimando alla decisione.
- Le prove nel browser: `.schede-barra [role=tab]` per le schede.
- File ammessi: `app/backend/src/**`, `app/frontend/**`, `app/backend/test/**` (solo per allineare), `strumenti/prove/app_*.py`, `strumenti/prove/utenti_prova.js`, `strumenti/collaudo/e2e/*` (non `uscita/`), il resoconto.
- **Vietati**: spec, guida (`guida.js`, pagina Guida dell'app solo se un KO lo richiede, scrivilo), piano, `prisma/schema.prisma` e migrazioni, `prisma/seed*`.
- Se una correzione tocca uno di questi file, fermati e scrivilo nel resoconto.

## Fine
- Il giro completo delle prove qui sopra con 0 KO e 0 blocchi:
  ```bash
  bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e
  bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e $(cd strumenti/prove && ls app_*.py | sed 's/\.py$//' | grep -v '^app_accesso$\|^app_scena$\|^app_f7_numeri$\|^app_f7_analisi_fornitori$')
  ```
- Dopo le modifiche al backend: jest delle suite toccate, una per volta. `npx tsc --noEmit` nel backend e nel frontend.
- Resoconto `strumenti/opencode/resoconto-collaudo-1-e2e.md`:
  - per ogni KO, la causa (a/b/c), cosa hai cambiato e perché;
  - «Da documentare».
- Carica davvero `playwright-best-practices`, `ponytail-review` e `caveman`. Se tocchi codice sensibile (accesso, soldi, registro), anche `owasp-security`.
