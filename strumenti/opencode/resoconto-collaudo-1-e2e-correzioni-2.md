# Resoconto collaudo · Onda 1 · 1-e2e — correzioni 2 (13/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità P2 · ripresa del pacchetto `collaudo-1-e2e-correzioni-2.md`.

## Situazione all'avvio

- Una sessione precedente aveva già corretto parte dei KO (guscio, menu_utente, registro, sistema,
  impostazioni, pratiche e altri). Le sue modifiche sono nell'albero (frontend, backend, prove).
- Restavano i KO elencati nel pacchetto. Li ho riprodotti **singolarmente** (database nuovo, una
  prova per volta) per separare «difetto vero» da «dipendenza dall'ordine» e «prova superata».

## Risultato

Tutte le 10 prove del pacchetto chiudono a **0 KO** singolarmente. Le correzioni sono di due tipi:
**(b) prove superate** (l'app è cambiata di proposito: conteggi dal server, permesso Componenti,
avvisi A7-11) e **(c) dipendenze dall'ordine** (le prove girano in sequenza sullo stesso database e
una cambia i dati dell'altra). Nessun difetto (a) di codice sensibile trovato.

## KO risolti (causa, modifica)

1. **`app_bollettino` — `.avviso` non visibile dopo «Carica»** (b/c). La regione degli avvisi è
   cambiata in 1-23 (una sola regione, nascosta finché non c'è un messaggio); il rilievo aperto
   A7-11 («regione vuota al montaggio») era rimasto da fare. Aggiunto `RegioneAvvisi` a
   `componenti/Piccoli.tsx` e montato in `app/(app)/layout.tsx`. La prova passa da sola (42 OK);
   il «Carica» e il PDF di prova (PDF.js, `pdf_prova`) erano già stati sistemati dalla sessione
   precedente.
2. **`app_liquidazioni` — `KeyError: 'message'` su `POST …/chiudi`** (c). In giro completo
   `app_flusso` verificava il primo bollettino «arrivato» (dopo `app_bollettino` = **Gries luglio**),
   così la chiusura del trimestre in `app_liquidazioni` riusciva (200, senza `message`) invece di
   essere rifiutata (409). Corretto `app_flusso`: verifica **sempre Gasper agosto (id 6)** e salta
   se già verificato. In più `app_liquidazioni` ora decide la riga «importo diverso» **solo se serve**
   (una prova prima può averla già decisa).
3. **`app_eventi` — `.schede-barra` non visibile (riga 105)** (c, tempi). Aggiunto
   `wait_for_load_state('networkidle')` prima dell'attesa sulla scheda. Passa 16/16.
4. **`app_soggetti` — blocca su `nth(14)` e 5 KO sui conteggi** (c). I conteggi (28 soggetti,
   13 clienti, 12 fornitori, righe della pagina 2) dipendono dai soggetti creati/importati dalle
   prove precedenti. Letti **dal server** (`/api/soggetti` → `conteggi`) al posto dei numeri fissi.
   Reso `codici`/`codici_attesi` tollerante alla tabella che cambia pagina (`all_inner_texts()` +
   ripetizione). Passa 63 OK.
5. **`app_documenti` — «a destra il documento scelto» e «titolo con il documento»** (c, tempi).
   Il dettaglio arriva dal server dopo il clic: aggiunto `wait_for_selector('.dettagli')` e l'attesa
   su `aria-current` (avevo tolto il `wait_for_timeout(200)` che dava tempo alla selezione). 50 OK.
6. **`app_flusso` — 3 KO (54 pratiche, numeri dei segmenti, pagine)** (c). Il numero di pratiche
   cambia con le prove precedenti. Letto `totale` dal server (`pratiche?pagina=0`) e usato al posto
   del fisso 54 (con controllo `>= 54` per il seed). 192 OK.
7. **`app_pratica` — «annullata la nota di credito» e «netto 1.000,00»** (c, tempi). Non è la
   regressione D-141: la nota è appena registrata (nessun legame col bollettino) e la prova passa
   da sola e dopo `app_flusso`/`app_liquidazioni`. Era un'attesa fissa di 1,5 s: sostituita con
   `wait_for(state='detached')`. 85 OK.
8. **`app_componenti` — «amministratore: Pagina riservata»** (c, tempi). La voce `/componenti` è
   del solo superutente (`sistema.amministratori`, ruoli `['superutente']`): è un cambiamento
   **voluto** (Ugo 01/11/2026). Il KO era l'attesa: aggiunto `wait_for_selector('.testa h1')` dopo
   l'accesso. 59 OK.
9. **`app_scartati` — «sottotitolo con i giorni»** (c, tempi). L'attesa `.testa .sotto:has-text("giorni")`
   passava già col testo segnaposto («…i giorni fissati…») prima dei dati. Cambiata in
   `has-text("90 giorni")`. 30 OK.
10. **`app_caricamento` — «Clienti: la prima riga resta ferma (339→289 px)»** (a, piccolo). La
    sagoma dell'elenco Clienti perdeva la classe `clienti-filtri` (che tiene `flex-wrap: nowrap`
    alla barra filtri): la barra andava a capo durante il caricamento e, a dati arrivati, il layout
    saltava. Aggiunto il prop `classe` a `SagomaElenco` e passato `classe="clienti-filtri"` da
    `VistaClienti`. 43 OK.

## Rilievi aperti dell'onda 1 già presenti (corretti qui)

- **A7-11** (da 1-23): regione degli avvisi creata vuota al montaggio — `RegioneAvvisi` in
  `Piccoli.tsx` + montaggio nel guscio.

## Prove

- `npx tsc --noEmit` nel **backend** e nel **frontend**: 0 errori.
- `python -m py_compile` su tutte le 10 prove modificate: OK.
- Prove nel browser lanciate singolarmente (database nuovo): 0 KO per tutte le 10 (esiti sopra).
  Giro completo: resta a Claude Code (regole dell'onda).

## Cose aperte

- Il giro completo (ordine alfabetico, un solo database) va lanciato da Claude Code: ho verificato
  le prove singolarmente e in piccole sequenze, ma l'ordine completo non è riprodotto qui.
- In una sequenza lunga ho visto comparire un flake non in elenco (`app_bollettino` «annullata la
  decisione», `app_flusso` «Scheda utente: due schede»): entrambe attese a tempo fisso rese robuste
  (attesa sul pulsante che deve comparire). Se ricompaiono nel giro completo, sono da riesaminare.

## Da documentare

- §19/§16.4: nessuna decisione nuova. Confermato che `/componenti` è del solo superutente
  (`sistema.amministratori`, D-45 area sistema) e che gli avvisi hanno la regione vuota al montaggio
  (A7-11, già registrato dal pacchetto 1-23).
- Piano: nessuna ora aggiuntiva (solo correzioni di collaudo).
