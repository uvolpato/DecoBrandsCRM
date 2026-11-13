# Collaudo · Onda 2 · correzioni di fine onda 2 (13/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità **P1**.

Rileggi `collaudo-2-fine-correzioni-1.md` e il suo resoconto. Regole comuni: `regole-onda-parallela.md`: **niente `cd` fuori dal progetto, niente `/tmp`, niente `&`, non leggere la copia del frontend fuori dal progetto** (rifiutati: la sessione si ferma). File temporanei in `strumenti/collaudo/e2e/uscita/`. Scrivi **subito** `strumenti/opencode/resoconto-collaudo-2-fine-correzioni-2.md` e aggiornalo strada facendo. Massimo 2 ore.

## Giro completo di Claude Code dopo le correzioni 1 (database nuovo, ordine alfabetico)
20 prove a 0 KO; il guasto di `Schede` è chiuso. Restano, tutti nati nell'onda 2 (le prove nel browser dei pacchetti non erano state lanciate):

1. `app_clienti` riga 48: `.schede-corpo .dt tbody` non arriva (scheda del cliente). Guarda 2-12 (scheda Pratiche del cliente) e 2-02 (`Schede`).
2. `app_documenti` riga 79: `.abbina-altra input` non c'è. Guarda 2-02 (A5-04: `key={selezionato}` su `VistaDocumento`, testi A6-16).
3. `app_eventi` riga 36: aprendo `/pratiche` senza sessione non si arriva a `/accesso`. Guarda 2-06 (uscita, ritorno dopo l'accesso) e 2-08 (pagina d'errore del guscio se il server non risponde: un 401 non deve diventare la pagina d'errore).
4. `app_flusso` riga 246: `.schede-corpo button:has-text("Abbina a")` non arriva.
5. `app_pratica` riga 184: clic che non riesce (vedi il registro della prova).
6. `app_scartati` 1 KO: «in Documenti c'è il link «N scartati»».
7. `app_utenti` 1 KO: permessi, «15 = 5 Sistema…»: 2-03 ha aggiunto il permesso `sistema.connessioni`, quindi il conteggio cambia (probabile b). Controlla e aggiorna la prova se è così.
8. **Rilievo di review (2-03)**: in `app/backend/src/impostazioni-api.ts` `controllaConnessione` controlla `req.utente?.ruolo !== 'superutente'` invece del permesso `sistema.connessioni` dichiarato in `accesso.ts`. Usa il permesso (come fanno gli altri controlli, `permessiDi` o simile), così il permesso dichiarato è quello che vale. Prova: `npx jest test/impostazioni.spec.ts`.

Per ognuno: causa (a) errore dell'app, (b) prova superata da una decisione dell'onda 2 (leggi il resoconto del pacchetto), (c) dati o tempi. Correggi la causa vera; non aggiornare una prova per far passare un errore vero.

```bash
bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e
bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_clienti app_documenti
```
Poche prove per volta, in primo piano; dopo ogni modifica al codice dell'app rilancia `prepara.sh`. Ogni prova corretta passa **2 volte**. Il giro completo lo lancia Claude Code.

## File ammessi
`app/frontend/**`, `app/backend/src/**`, `app/backend/test/**`, `strumenti/prove/app_*.py`, `strumenti/collaudo/e2e/*` (non `uscita/`), il resoconto. **Vietati**: spec, guida.js, piano, schema e migrazioni, seed.

## Fine
`tsc` backend e frontend; jest delle suite toccate, una per volta (`DATABASE_URL_TEST` su `decobrands_test_2_fine2`, creato e cancellato da te). Resoconto con causa e correzione di ogni punto. Carica davvero `playwright-best-practices`, `ponytail-review`, `caveman`.
