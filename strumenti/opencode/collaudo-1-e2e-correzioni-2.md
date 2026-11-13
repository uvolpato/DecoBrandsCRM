# Collaudo · Onda 1 · 1-e2e — correzioni 2: i KO rimasti (13/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità: **P2**

Prima rileggi `collaudo-1-e2e-correzioni.md`: contesto, script del giro, regole, file ammessi e vietati valgono uguali. Regole comuni: `regole-onda-parallela.md`, **niente `cd` nei comandi, niente `/tmp` o cartelle fuori dal progetto, niente `&`** (sono rifiutati e la sessione si ferma: è già successo due volte). File temporanei in `strumenti/collaudo/e2e/uscita/`.

## Situazione
- Una sessione precedente ha già lavorato su questo pacchetto. Le sue modifiche sono nell'albero: guarda `git diff` di `strumenti/prove/` e dei file del frontend e backend toccati.
- Quella sessione è finita **per tempo scaduto (2 ore) senza scrivere il resoconto**. Questa volta:
  - **scrivi subito** `strumenti/opencode/resoconto-collaudo-1-e2e.md` con quello che trovi già fatto;
  - aggiornalo dopo ogni KO risolto;
  - hai al massimo 2 ore.
- Ora sono a posto: guscio, menu_utente, registro, sistema, impostazioni, pratiche e gli altri.
- Il frontend di prova (8071) è stato riavviato pulito: non c'è bisogno di riavviarlo.

## KO e blocchi rimasti (ultimo giro completo, database nuovo, ordine alfabetico)
1. `app_bollettino` si blocca alla riga 272: dopo «Carica» del bollettino in PDF `.avviso` non diventa visibile. Guarda cosa risponde il server, nel log `uscita/backend-app_bollettino.log` e con un `page.on('response')`, e se l'avviso esce e sparisce prima dell'attesa.
2. `app_liquidazioni` si blocca alla riga 232, `KeyError: 'message'` su `POST liquidazioni/2026/3/chiudi`. Controlla stato e corpo veri della risposta.
3. `app_eventi` si blocca alla riga 105 (`.schede-barra` non visibile). Nel giro prima era passata 16/16: probabile dipendenza dall'ordine o dai tempi.
4. `app_soggetti` si blocca alla riga 84: `.soggetti-filtri .dt tbody tr td:first-child` nth(14). Nel giro prima aveva invece 5 KO sui conteggi (28 soggetti, 13 clienti, 12 fornitori, pagina 2): i conteggi dipendono dai soggetti che le prove precedenti creano o importano (clienti, fornitori). Rendi la prova indipendente: conteggi letti dal server, non scritti fissi (c).
5. `app_documenti` 2 KO: «a destra il documento scelto, senza cambiare pagina» e «dettaglio: titolo con il documento».
6. `app_flusso` 3 KO: «54 pratiche, 52 del prototipo + 2», «i numeri dei segmenti vengono dal server (54…)», «pagine 26–50 di 55». Il numero di pratiche dipende dalle prove precedenti, che ne creano: leggi il numero dal server o rendi la prova indipendente.
7. `app_pratica` 2 KO: «annullata la nota di credito» e «netto tornato a 1.000,00». Nel giro prima era 85/85.
   - Possibile regressione D-141 dell'onda 0: una decisione in un bollettino ferma l'annullamento.
   - Possibile dipendenza dall'ordine.
   - Capisci quale delle due e scrivilo nel resoconto.
8. `app_componenti` 1 KO: «amministratore: Pagina riservata». Il catalogo `/componenti` è solo del superutente: controlla cosa vede ora un amministratore e se è cambiato di proposito.
9. `app_scartati` 1 KO: «il sottotitolo dice i giorni di conservazione».
10. `app_caricamento` 1 KO: «Clienti: la prima riga resta ferma (339 → 289 px)», instabile da un giro all'altro. Lo spostamento c'è davvero (sagome D-59: le sagome devono avere la stessa altezza del contenuto vero) oppure la misura è presa troppo presto?

**Le prove variano da un giro all'altro.** Per ogni prova che correggi, falla girare almeno 2 volte prima di dirla chiusa.

## Fine
- **Il giro completo lo lancia Claude Code**, non tu: dura ~40 minuti, troppo per un comando. Tu lancia `prepara.sh` e poi `giro.sh` con **una o poche prove** per volta, in primo piano, con un timeout lungo (fino a 10 minuti per comando). Per un KO che dipende dalle prove precedenti, lancia insieme la prova che crea i dati e quella che li conta, nell'ordine alfabetico.
- `tsc` nel backend e nel frontend; jest delle suite toccate, una per volta.
- Resoconto completo: per ogni KO del primo prompt e di questo, causa (a/b/c), modifica e perché; «Da documentare».
- Carica davvero `playwright-best-practices`, `ponytail-review` e `caveman`.
