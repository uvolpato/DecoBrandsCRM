# Pacchetto `pagamento-numero-lungo`

Ugo (16/11/2026): associando un **pagamento** (il primo documento della coda, db vero `decobrands_db`, app 8001/8002)
compare l'avviso rosso **«numero must be shorter than or equal to 50 characters»**. Il pagamento non ha un numero di
documento (pacchetto `pagamento-senza-numero`: campo «Riferimento (facoltativo)»).

## Compito
1. **Causa** (sola lettura su `decobrands_db`: `SELECT` soltanto, URL costruito con grep da `app/backend/.env`, mai
   `cat .env`): guarda il primo documento della coda (`arrivi` / documento di tipo pagamento più vecchio non abbinato) e
   cosa il frontend manda come `numero` (riferimento, nome del file, testo letto?). Trova da dove arriva un valore
   oltre 50 caratteri.
2. **Correzione** alla radice: per il pagamento il riferimento facoltativo non deve bloccare l'abbinamento. Scegli la
   soluzione più semplice coerente con lo schema (es. il valore proposto dalla lettura non va messo in `numero` se
   non è un numero/riferimento; oppure si tronca solo se il campo DB lo consente — **niente migrazioni** salvo
   necessità vera, in quel caso solo scritta). Il controllo resta sul server (V12).
3. **Messaggi di validazione in italiano**: i rifiuti del `ValidationPipe` di NestJS non devono arrivare all'utente in
   inglese. Nel punto unico (pipe globale / `exceptionFactory` o il gestore degli errori del frontend) restituisci un
   messaggio italiano comprensibile (es. «Il campo Numero è troppo lungo (al massimo 50 caratteri)»), con il nome del
   campo in italiano dove ovvio, altrimenti un messaggio generico «Dati non validi: controlla i campi».
4. Prove jest: pagamento con riferimento lungo/assente si abbina; messaggio di validazione in italiano.

## File ammessi
`app/backend/src/**`, `app/backend/test/**`, `app/frontend/app/(app)/documenti/**`, `app/frontend/lib/api*.ts`
(solo se il messaggio si traduce lì). **Non toccare** `strumenti/prove/**` (sessione `giro-0-2-8-prove` in corso).
Ogni comando prisma/jest con `DATABASE_URL` esplicito nella stessa riga su `decobrands_test_pag_numero` (creato e
cancellato); su `decobrands_db` solo `SELECT`. Regole: `strumenti/opencode/regole-onda-parallela.md`, `CLAUDE.md`.
Niente commit, 8001/8002 (solo lettura del db), `cd`, `/tmp`, `&`, Integra. Skill: `owasp-security`,
`ponytail-review`, `caveman`.
Resoconto: `strumenti/opencode/resoconto-pagamento-numero-lungo.md` (causa, correzione, prove, «Da documentare").
Riepilogo in 6 righe.
