# Pacchetto `documenti-lentezza` (diagnosi + correzione)

## Problema (Ugo, 17/11/2026)
Aprendo la pagina **Documenti** passano **almeno 5 s** prima che compaia la **coda** e altri **~3 s** per il **dettaglio**
del documento scelto. I dati sono pochi: 13 documenti in arrivo, 10 documenti fiscali, 3 pratiche, 1.858 clienti, 1.885
soggetti. Quindi non è il volume: è come si caricano (caricamento completo di tutti i dati a ogni chiamata, `caricaDati`
o simili, query N+1, ricalcoli del motore, viste di Integra/ponte, PDF letti dal disco, chiamate in serie dal frontend…).

## Database per la diagnosi
`decobrands_test_perf`: **copia** di `decobrands_db` fatta da Claude Code (stessi dati veri). Usala con
`DATABASE_URL_TEST` (in `app/backend`: `export DATABASE_URL_TEST="$(grep '^DATABASE_URL=' .env | cut -d= -f2- | sed 's#/decobrands_db#/decobrands_test_perf#')"`).
**Solo letture** finché non hai capito; non cancellarla (la cancella Claude Code). Mai `decobrands_db`, mai 8001/8002.

## Compito
1. **Misura**, con una prova jest (supertest sull'app, `DATABASE_URL_TEST` sulla copia; **niente script fuori da jest**):
   i tempi delle chiamate che la pagina Documenti fa all'apertura (elenco/coda, contatori, dettaglio del documento,
   proposte, ricerche, PDF) — trova quali sono guardando `app/frontend/app/(app)/documenti/**`. Per ognuna: tempo, numero
   di query (log di Prisma), dati restituiti. Guarda anche se il frontend fa chiamate **in serie** che potrebbero andare in
   parallelo o se ripete la stessa chiamata.
2. **Causa**: scrivi nel resoconto quale chiamata pesa e perché (con i numeri).
3. **Correggi alla radice**, codice minimo, senza cambiare i risultati: query mirate invece del caricamento completo,
   niente N+1, chiamate in parallelo nel frontend, niente lavoro ripetuto. Non introdurre cache con invalidazione
   complicata; se serve una cache, scrivilo nei dubbi e fermati.
4. **Obiettivo**: coda < 1 s e dettaglio < 1 s sulla copia, misurati con la stessa prova; lascia la prova come controllo
   (soglia larga, es. 2 s, per non renderla fragile).

## Prove
La prova di misura + le suite toccate (sulla copia per la misura, su `decobrands_test_lentezza` creato da te per le suite
normali, 0 KO); `npx tsc --noEmit` backend e frontend. `py_compile` sulle prove nel browser se le tocchi.

## File ammessi
`app/backend/src/**`, `app/backend/test/**`, `app/frontend/app/(app)/documenti/**`, `app/frontend/lib/**` (solo se la
chiamata sta lì). Niente migrazioni senza fermarti prima (un indice mancante va scritto nel resoconto come proposta, con la
misura che lo giustifica).

## Regole
Leggi `strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`. V12, V13. Niente commit, `cd`, `/tmp`, `&`, `.env` letto,
porte 8001/8002, Integra. Skill con lo strumento `skill`: `performance`, `prisma-client-api`, `ponytail-review`, `caveman`.

## Resoconto
`strumenti/opencode/resoconto-documenti-lentezza.md`: tabella chiamata → tempo prima → tempo dopo → causa → correzione;
prove ed esito; dubbi. Riepilogo in massimo 10 righe.
