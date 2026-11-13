# Regole per i pacchetti di un'onda lanciati in parallelo

Valgono per ogni sessione di OpenCode che esegue un pacchetto `collaudo-<onda>-NN-*.md`.

- Leggi il pacchetto tutto e seguilo alla lettera: rilievi, decisioni di Ugo (non riaprirle), file ammessi e vietati, prove.
- Altri pacchetti della stessa onda lavorano **in parallelo** su altri file: tocca **solo** i tuoi file ammessi. Se ti serve cambiare un file non ammesso, fermati e scrivilo nel resoconto.
- Database di prova: **solo il tuo** (`decobrands_test_<onda>_NN`, nome scritto nel pacchetto, via `DATABASE_URL_TEST`), cancellato alla fine.
- Prove nel browser: **non lanciarle**. Aggiornale e controllale con `python -m py_compile`; le lancia Claude Code a fine onda.
- Carica davvero con lo strumento `skill` le skill che il pacchetto chiede, più `caveman`. Usa `graphify query` prima di leggere il codice; non lanciare `graphify update`.
- Mai:
  - commit, push, stash, reset, checkout;
  - Integra (192.168.239.49);
  - `decobrands_db`;
  - le porte 8001/8002 (ci girano i server di Ugo).
- Se una correzione va contro il §19 della spec o non si applica, fermati e scrivilo nel resoconto. Non inventare.
- Il pacchetto è finito quando:
  - le prove del pacchetto sono a 0 KO;
  - `npx tsc --noEmit` passa nel backend e, se hai toccato il frontend, anche nel frontend;
  - c'è il resoconto `strumenti/opencode/resoconto-collaudo-<onda>-NN.md` con la sezione «Da documentare».
- Alla fine scrivi un riepilogo di massimo 10 righe: rilievi corretti, prove con l'esito, cose aperte.

## Comandi della shell (13/11/2026)
- Niente `cd` nei comandi: `opencode run` rifiuta da solo i permessi per le cartelle esterne e un `cd` fuori posto ferma la sessione senza lavoro. Percorsi sempre dalla radice del progetto (`npx --prefix app/backend …`); per cercare file gli strumenti glob/grep, non `find`.
- Niente `/tmp` né cartelle fuori dal progetto (anche questo ferma la sessione): file temporanei e log in `strumenti/collaudo/e2e/uscita/` (ignorata da git). Niente processi lanciati in background con `&`: i comandi lunghi si lanciano in primo piano con un timeout lungo.
- Il frontend di prova (8071) gira da una **copia fuori dal progetto**: non leggerla e non toccarla (permesso rifiutato, la sessione si ferma, 13/11/2026). Il codice vero è `app/frontend`; `prepara.sh` lo ricopia.
- **Mai leggere `.env`** (rifiutato, la sessione si ferma). L'indirizzo del database di prova si costruisce dentro il comando, senza stamparlo: `export DATABASE_URL_TEST="$(grep '^DATABASE_URL=' .env | cut -d= -f2- | sed 's#/decobrands_db#/decobrands_test_<pacchetto>#')"` (workdir `app/backend`). Gli script `strumenti/collaudo/e2e/*.sh` lo fanno da soli.
