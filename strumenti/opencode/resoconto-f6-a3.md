# F6-A3 — Controlli fissi, livello del documento e proposta di abbinamento

Data: 06/11/2026 · ramo `main` · nessun commit, nessun push.

## File toccati

| File | Cosa |
|---|---|
| `app/backend/src/proposta.ts` **(nuovo)** | `lettoDaCampi`, `risolviFornitore`, `propostaDocumento`, `controlliFissi`, `valutaLettura`, `normalizzaNome` (esportate), più i tipi `Letto`, `RigaLetta`, `Proposta`, `Controllo`, `Soglie`, `Valutazione`. Nessuna rotta |
| `app/backend/src/lettura.ts` | `salva` risolve fornitore, livello e controlli nella stessa transazione (V13); `SCHEMA_DOCUMENTO` aggiunge `riferimento_fattura` in testata e `numero_fattura`/`data_fattura`/`provvigione` nelle righe; `PROMPT_DOCUMENTO` aggiornato (bollettino = fatture del mese, nota di credito = fattura stornata) |
| `app/backend/test/proposta.spec.ts` **(nuovo)** | 32 prove: fornitore per nome, proposta (ordine/conferma/fattura/nota di credito/bollettino), controlli fissi, `lettoDaCampi`, `valutaLettura` |
| `app/backend/test/lettura.spec.ts` | il salvataggio ora verifica `livello` e `controlli`; 3 prove nuove (fornitore riconosciuto, campo a 0,5 → `bassa`, controllo fallito) |
| `specifica-crm-provvigioni.md` | versione **8.47**, §6.5 punti 5–6 riscritti, §4.2.12 forma di `controlli`, nuova riga **D-71** in §19 |
| `piano-lavoro-crm.md` | riga F6-A3 aggiornata (nessuna ora nuova) |
| `prototipo-crm/specifica.html` | rigenerata con `python strumenti/genera-pagine-doc.py` |

Nessuna migrazione: tabelle e colonne (`livello`, `controlli`, `fornitore_id`+`fornitore_versione_id`, `documenti_campi`) c'erano già.

## Regole implementate

- **`risolviFornitore`**: nome normalizzato (minuscole, NFKD senza accenti, punteggiatura via, spazi ridotti a uno; le sigle societarie restano lettere) contro la ragione sociale della versione corrente; 0 o più di un match → null. Niente ricerca approssimata (D-71).
- **`propostaDocumento`**: esiti `doppio` (ordine con numero già in pratica; fattura già in una pratica; bollettino già registrato), `bollettino`, `nuova` (ordine con codice riconosciuto), `certo`, `probabile`, `ambiguo`, `nessuno`. Candidati = pratiche dello stesso fornitore (e cliente se il codice è riconosciuto), riga di riferimento = conferma se c'è, altrimenti ordine; `punteggio` = articoli in comune / max(articoli documento, articoli pratica), −0,5 se già fatturata; `motivi` in italiano; `delta` = importo letto − importo del riferimento; ordinati per punteggio. Conferma esclude le pratiche con conferma o fiscali; fattura esclude quelle con la stessa fattura; nota di credito con `riferimento_fattura` va prima con esito `certo`.
- **`controlliFissi`**: `bollettino` (grave), `codice_cliente` (grave, `interscambio` valido alla data, oggi se manca), `totale` (grave, tolleranza 0,01), `riga` (non grave, `righe[N]`), `articolo` (non grave), `data` (non grave, data del documento prima della data dell'ordine). Fornitore non riconosciuto → si saltano codice cliente, articolo, bollettino.
- **`valutaLettura`**: campi con valore, non `verificati`, sotto `soglia_ok`; **`tipo` escluso** (confidenza strutturalmente bassa); affidabilità nulla = incerta ma non `bassa`; `bassa` se un campo < `soglia_bassa` o un controllo grave; `n` = campi + controlli. Soglie da `letturaConfig` (0,9/0,7 di default), parametro per le prove.
- **Salvataggio (V13)**: `salva` scrive i campi, risolve il fornitore, poi `valutaLettura` nella stessa transazione e salva `fornitore_id`+`fornitore_versione_id` (insieme), `livello`, `controlli` (`{falliti: […]}`). La proposta **non** si salva: F6-A4 la ricalcola.

## Prove ed esito

- `npx tsc --noEmit`: pulito.
- `npx jest test/proposta.spec.ts test/lettura.spec.ts`: **2 suite, 42 prove, 42 passate**.
- `npm test` completo, in tre gruppi (alfabetico) per evitare il crash di memoria:
  - gruppo 1 (11 suite): **149 prove, 149 passate**;
  - gruppo 2 (10 suite): **114 prove, 114 passate**;
  - gruppo 3 (10 suite): **160 prove, 160 passate**.
  - Totale: **31 suite, 423 prove, 0 KO**.

## Cosa funziona sui documenti reali e cosa no

- **Funziona sui documenti reali**: tutto il flusso F6-A3 lavora sui campi già estratti da F6-A2 (validati sui documenti veri il 06/11/2026). Fornitore per nome normalizzato, codice cliente da `interscambio`, controlli e livello girano sul database vero. Le prove usano campi simulati: la logica è identica perché parte da `documenti_campi`.
- **Bollettino**: lo schema ora prevede righe come fatture del mese (numero, data, imponibile,
  provvigione). **Verificato dopo la revisione** sul `Provisionsabrechnung_20_Januar2026.pdf`: righe
  `RE191175` 789,80 / 118,47 e `RE191624` 178,80 / 26,82, totale merce 968,60 e provvigioni 145,29
  (prima restituiva 0 righe).
- **`importo` del bollettino**: è la somma degli imponibili delle righe (come da schema), non la somma delle provvigioni. Se a F6-A4 servirà il "totale riconosciuto" (somma provvigioni) andrà letto dai campi `provvigione` delle righe.

## Correzioni fatte in revisione (sessione principale)

1. **Doppione dell'ordine**: `propostaDocumento` cercava il numero letto in
   `ordini_fornitore_testata.numero_ordine`, che però è il numero **della pratica**
   (`OF/AAAA/NNN`, D-60): non avrebbe mai trovato un doppione vero. Ora cerca il documento
   `ordine` con quel numero del fornitore in `ordini_fornitore_documenti`, come per la fattura.
   La prova crea una pratica con un documento d'ordine, non una pratica con lo stesso numero.
2. **Fornitore troncato dal modello**: la prova sul bollettino ha letto «ARTE GmbH & Co.KG» per
   «Arte Wohnaccessoires GmbH & Co. KG». Aggiunto un ripiego: se il nome normalizzato non combacia,
   si tolgono le sigle societarie e si accetta un nome contenuto nell'altro **solo con un match
   unico** (niente distanza di modifica). D-71 e §6.5 aggiornati; prova aggiunta.
3. Spec §6.5 punto 5: chiarito che i controlli si calcolano e si possono ricalcolare in F6-A4,
   in `controlli` resta l'ultimo esito (la frase precedente sembrava dire che non si salvano).

Totale prove dopo le correzioni: `proposta` + `lettura` **43** (32 + 11); il totale scende a
**424** prove con la nuova prova del fornitore troncato.

## Dubbi e cose aperte

- **Interpretazione di "data fuori dal periodo della pratica"**: ho scelto "data del documento precedente alla data dell'ordine della pratica proposta" (D-71, non grave). Una fattura datata dopo l'ordine non è segnalata (è il caso normale). Se servisse anche il limite superiore, va deciso con Ugo.
- **`tipo` escluso dal livello**: confermato e registrato (D-71). La confidenza del tipo è una classificazione, non misura l'affidabilità dei valori.
- **Fornitore per nome senza ricerca approssimata**: un nome letto con un refuso (es. "Gries GmbH & Co KG" senza punto) non combacia e lascia il fornitore null: la persona lo sceglie in F6-A4. Volutamente (D-71).
- **`proforma`/`pagamento`/`altro`**: `propostaDocumento` restituisce `nessuno` (il prototipo non li tratta); l'abbinamento a mano resta F6-A4.
- **Evidenziazione nel PDF (D-06)**: non toccata; resta subordinata a F0-A7.
