# Collaudo · Onda 1 · 1-e2e — correzioni 3: gli ultimi 2 (13/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità: **P2**

Rileggi `collaudo-1-e2e-correzioni.md` (contesto, script, file ammessi e vietati) e `resoconto-collaudo-1-e2e-correzioni-2.md`. Regole comuni: `regole-onda-parallela.md`. **Niente `cd`, niente `/tmp` o cartelle fuori dal progetto, niente `&`**: sono rifiutati e la sessione si ferma. File temporanei in `strumenti/collaudo/e2e/uscita/`. Scrivi **subito** `strumenti/opencode/resoconto-collaudo-1-e2e-correzioni-3.md` e aggiornalo strada facendo. Massimo 1 ora e mezza.

## Giro completo di Claude Code (database nuovo, ordine alfabetico)
25 prove a 0 KO. Restano:

1. **`app_bollettino` si blocca ancora alla riga 273**: dopo «Carica» del bollettino PDF (Ing's, settembre 2026) `.avviso` resta `hidden` per 30 s (63 volte «resolved hidden»). Da sola passava (42 OK), nel giro no. Nel giro la precedono `app_analisi` e `app_bollettini`.
   - Riproduci con `giro.sh decobrands_test_e2e app_analisi app_bollettini app_bollettino`, su un database appena preparato.
   - Capisci cosa succede al clic su «Carica»: il server risponde? con cosa (stato e corpo)? La finestra mostra un errore nel modulo invece dell'avviso (per esempio il fornitore non scelto nella ricerca, o un bollettino Ing's 2026-09 che esiste già perché `app_bollettini` l'ha creato)? Usa `page.on('response')` e una schermata in `uscita/`.
   - Se è un errore dell'app (a), correggi il codice; se dipende dai dati (c), rendi la prova indipendente (per esempio un mese libero letto dal server). Non togliere il controllo.
2. **`app_registro` 1 KO alla riga 70**: «il segmento restringe davvero le righe». Il conteggio delle righe va letto dopo che la tabella si è aggiornata. Controlla se è un problema di tempi (c) o se il numero di righe e il totale del piede non coincidono davvero (a).

Ogni correzione va provata **2 volte di fila** con la sequenza che la riproduce. Il giro completo lo rilancio io.

## Fine
- `tsc` del frontend e del backend se tocchi codice.
- Resoconto: causa (a/b/c), modifica e perché, prove ed esito.
- Carica davvero `playwright-best-practices`, `ponytail-review` e `caveman`.

---
## Ripresa (13/11/2026): la sessione V4 pro si è bloccata senza fare nulla. Diagnosi già fatta da Claude Code

**Esecutore: DeepSeek Flash.** Solo due ritocchi alle prove, niente codice dell'app. Massimo 45 minuti.

1. **`app_bollettino.py` riga 262–273** (c): `app_bollettini.py` (riga 122) carica già il bollettino di **Ing's 9/2026**, quindi nel giro il server risponde 409 «Il bollettino di 9/2026 di Ing's c'è già» (errore nella finestra, nessun `.avviso`).
   - Correzione: scegli un mese libero per Ing's leggendolo dal server, per esempio con l'API dei bollettini già usata nella prova (`id_bollettino(pg, "Ing's", 'AAAA-MM')` restituisce None se il mese è libero), provando i mesi del 2026 da 1 a 12 e prendendo il primo libero. Usa quel mese sia in `#c-mese` sia in `id_bollettino` dopo il caricamento. Se nessun mese è libero, `ok(False, …)` con un messaggio chiaro.
   - In più, dopo il clic su «Carica», se compare un errore nella finestra invece dell'avviso, la prova deve fallire subito con il testo dell'errore, non aspettare 30 s: per esempio `pg.wait_for_selector('.avviso:not([hidden]), .velo .errore, .velo [role=alert]')`, poi si controlla quale dei due è uscito (verifica il selettore dell'errore nel modulo in `app/frontend`).
2. **`app_registro.py` riga 70** (c, tempi): dopo il piede aggiornato, aspetta anche il numero di righe: `pg.wait_for_function("(n) => document.querySelectorAll('.dt tbody tr').length === n", arg=min(dati.get('per_pagina', 25), errori_api['totale']))` prima dell'`ok`. Nel messaggio del KO metti i due numeri.

Prove, in primo piano, ciascuna **2 volte**:
```bash
bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e
bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_bollettini app_bollettino app_registro
```
Resoconto in `strumenti/opencode/resoconto-collaudo-1-e2e-correzioni-3.md`. File ammessi: solo `strumenti/prove/app_bollettino.py`, `strumenti/prove/app_registro.py` e il resoconto. Carica davvero `caveman`.
