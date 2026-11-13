# Prova app_documenti bloccata alla riga ~445 (13/11/2026)

**Esecutore: DeepSeek Flash** · Gravità: P2.

Regole comuni: `regole-onda-parallela.md`. **Niente `cd`, niente `/tmp`, niente `&`, non leggere `.env`.** Mai `decobrands_db`, mai porte 8001/8002, Integra mai. Niente commit.

## Problema
`strumenti/prove/app_documenti.py` si blocca alla riga ~445 (blocco D-152 «ricerca del fornitore guarda anche Integra», pagina `pg7`): `wait_for_selector('.selezionabile a:has-text("PROVA-R1")')` va in timeout, quindi la prova esce senza contare OK/KO. Probabile causa (c): il blocco D-152 subito prima (`pg6`, «Scegli …» chiama la rotta `scegli`) cambia il documento PROVA-R1 e l'elenco `/documenti` (filtro di partenza «aperte») non lo mostra più. Verifica con la schermata o leggendo lo stato del documento, poi rendi la prova indipendente (es. `pg6` intercetta anche la rotta `scegli` senza scrivere, oppure `pg7` apre il documento direttamente con `/documenti?doc=<id>` o con il filtro giusto). **Non cambiare l'app** se l'errore è della prova; se è dell'app, fermati e scrivilo.

Nell'albero ci sono le modifiche non committate di `correggi-ordine`, `somma-righe`, `disposizione-testata` (testata a tre righe, pulsante ›, `piva_fornitore`): i controlli della prova devono essere allineati a quelle.

## Come lanciare
```bash
bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e
bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_documenti
```
Uscita in `strumenti/collaudo/e2e/uscita/e2e/app_documenti.txt`. Timeout lungo (10 min) per comando, in primo piano. Falla girare **2 volte** con 0 KO.

Aggiungi alla prova una schermata della finestra *Correggi i dati letti* a 1440 e 768 px in `strumenti/collaudo/e2e/uscita/correggi-1440.png` e `correggi-768.png`.

## File ammessi
Solo `strumenti/prove/app_documenti.py` e il resoconto `strumenti/opencode/resoconto-prova-documenti-blocco.md` (causa, modifica, esito dei 2 giri). Carica davvero `playwright-best-practices` e `caveman`.
