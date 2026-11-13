# Prove nel browser dopo i pacchetti del pomeriggio (13/11/2026)

**Esecutore: DeepSeek V4 pro** · Regole comuni: `strumenti/opencode/regole-onda-parallela.md` (**niente `cd` fuori dal progetto, niente `/tmp`, niente `&`, non leggere la copia del frontend fuori dal progetto, mai `.env`**; mai `decobrands_db`, mai le porte 8001/8002, Integra mai). Sei l'unico pacchetto in corso. Scrivi subito `strumenti/opencode/resoconto-prove-pomeriggio.md`. Massimo 1 ora e mezza.

Nell'albero, non committati, i pacchetti di oggi pomeriggio (resoconti in `strumenti/opencode/`): `coda-visibile`, `soglie-lettura` (D-151, soglia 0,80), `pdf-tutte-le-pagine`, `lente-ricerca`, `impostazioni-senza-ricarica`, `riconosci-scegli` (D-152), `campi-euro`. tsc e jest verdi.

## KO del giro di Claude Code (database nuovo)
1. `app_documenti` si blocca alla riga 135: dopo la correzione aspetta `.selezionabile a:has-text("PROVA-R1") .stato:has-text("Affidabile")`. Con D-151 (soglie dal server, ricalcolo dei livelli) o con D-152 (esiti `*_da_scegliere`) il livello o l'etichetta mostrati sono cambiati? Capisci se il livello dopo la correzione è giusto (a) o la prova è superata (b).
2. `app_flusso` 1 KO riga 234: `.aff-sx canvas` `== 1` → il visore ora disegna tutte le pagine: `>= 1` (b).
3. `app_bollettino` si blocca alla riga 72: sulla riga `F-2026-0933` non c'è il pulsante «Attendi il prossimo». Alle 17:30 passava (43/0); dopo sono entrati `riconosci-scegli` e `campi-euro`. Rilancia da sola su database nuovo: se passa è (c, ordine), altrimenti trova la causa.
4. `app_clienti` si blocca alla riga 89: «Togli tutti i filtri» (`.riepilogo-filtri .btn-icona` nth(1)) è `disabled`. Da sola alle 17:40 passava (46/0). Stessa verifica: da sola su database nuovo; se è un errore vero (lente, `FilterBar`, riepilogo) correggilo.

Per ognuno: causa (a/b/c) e correzione vera; non aggiornare una prova per far passare un errore vero.
```bash
bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e
bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_documenti
```
Ogni prova corretta passa **2 volte**. Alla fine, una volta, in primo piano: `giro.sh decobrands_test_e2e app_documenti app_pratica app_flusso app_bollettino app_clienti app_oggi` su database appena preparato.

## File ammessi
`app/frontend/**`, `app/backend/src/**`, `app/backend/test/**`, `strumenti/prove/*.py`, `strumenti/prove/*.js`, il resoconto. Vietati: spec, guida.js, piano, schema, migrazioni, seed. Carica davvero `playwright-best-practices`, `caveman`.
