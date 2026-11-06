# Resoconto F6-A4a — rotte server della pagina Documenti

Data: 06/11/2026. Prima metà di F6-A4 (server e prove). Le pagine e la finestra di correzione
sono la seconda metà (F6-A4b): **nessun file del frontend è stato toccato**.

## File toccati

- `app/backend/src/proposta.ts`: `lettoDaCampi` legge `valore_finale ?? valore_letto` (D-72).
- `app/backend/src/documenti.ts`: rotte `GET /api/documenti`, `GET /api/documenti/:id`,
  `PUT /api/documenti/:id`, `POST /api/documenti/:id/scarta` e funzioni di dettaglio/validazione.
- `app/backend/test/documenti-lettura.spec.ts` (nuovo): 18 prove.
- `app/backend/test/proposta.spec.ts`: prova del valore finale.
- `specifica-crm-provvigioni.md`: versione 8.48, §8.1 (contratti veri), §15.2.4 (correzione e
  scarto), D-72 in §19.
- `piano-lavoro-crm.md`: F6-A4 divisa in **F6-A4a** (server) e **F6-A4b** (pagine), 2 + 2 ore
  (totale invariato 4).
- `prototipo-crm/specifica.html`: rigenerato con `python strumenti/genera-pagine-doc.py`.
- `strumenti/opencode/resoconto-f6-a4a.md`: questo file.

Nessuna migrazione, nessun file di `.env`, nessun commit, nessun push.

## API esposte

Tutte richiedono una sessione; `provvigioni.consulta` per le GET e `provvigioni.modifica` per
le scritture.

### `GET /api/documenti`

Query: `stato` (iniziale `da_controllare`; ammessi `da_controllare`, `in_coda`,
`in_lettura`, `errore`), `q` (numero, file, fornitore, cliente; `%` e `_` sono lettere), `tipo`,
`livello`, `pagina` (1), `per_pagina` (dalle Impostazioni, massimo 200).

Risposta: `{documenti, conteggi: {da_controllare, in_coda, in_lettura, errore}, totale, pagina,
per_pagina}`. Ogni documento: `id, file_nome, file_tipo, tipo, numero, data, fornitore_id,
fornitore, codice_cliente, cliente, importo, livello, ricevuto_il, letto_il, controlli_n`.
Numero, data, importo, codice cliente e cliente arrivano da `documenti_campi` con
`COALESCE(valore_finale, valore_letto)`; due query per pagina (nessun N+1). `conteggi` è
calcolato sugli altri filtri (tipo, q, livello), come D-23. Ordine `ricevuto_il DESC, id DESC`.
Niente proposta: è costosa.

### `GET /api/documenti/:id`

Dettaglio con campi grezzi (`valore_letto`, `valore_finale`, `affidabilita`, `posizione`,
`precisione`, `verificato`), testata e righe dai valori finali (righe con `i`), controlli
salvati, proposta ricalcolata (`propostaDocumento`, `abbinamento.cliente_id` come stringa) e
`bollettino: {esiste} | null`. 404 se non c'è.

### `PUT /api/documenti/:id`

Corpo `{testata, righe}`. `i` = riga originale (conserva valore letto, affidabilità e
posizione), `null` = riga nuova. Le righe si salvano nell'ordine ricevuto e si rinumerano da 0.
Solo se lo stato è `da_controllare` (altrimenti 409). Valida tipo fra gli otto, fornitore
esistente con versione corrente (o null), date `AAAA-MM-GG` reali, numeri; un valore vuoto
toglie il campo. Una transazione con la riga `FOR UPDATE` (V13): aggiorna tipo e fornitore,
riscrive i campi (tutti quelli inviati `verificato = true`, righe nuove verificate), ricalcola
livello e controlli con `valutaLettura` sui valori finali, scrive `documento/update` con
`campi_corretti` (campi cambiati + righe nuove), `livello_prima`, `livello_dopo`; risponde come
il GET. 404 se non c'è; 400 con il nome del campo.

### `POST /api/documenti/:id/scarta`

Corpo `{motivo, nota?}` (motivi chiusi, nota massimo 2000). Solo da `da_controllare`,
`errore` o `in_coda` (409 se abbinato, scartato o in lettura). Scrive `stato='scartato'`,
`scartato_il`, `scartato_da`, `motivo_scarto`, `nota_scarto`; il file resta sul disco
(conservazione F5-A7). Evento `documento/update` con `{stato: 'scartato', motivo, nota}`,
perché il catalogo §15.2.4 non ha un codice per lo scarto. 204; 404 se non c'è.

## Prove e numeri

- `npx tsc --noEmit`: pulito.
- `npx jest test/documenti-lettura.spec.ts test/proposta.spec.ts`: **51 prove passate**
  (18 nuove + 33 di proposta).
- `npm test` completo in tre gruppi (per non far esplodere la memoria):
  - 9 suite, **105 prove**;
  - 10 suite, **134 prove** (comprese le nuove);
  - 13 suite, **204 prove**.
  - Totale **443 prove, 0 KO**.

Copertura delle prove nuove: elenco (stato, ordine, ricerca con finale preferito, filtri
tipo/livello, conteggi sugli altri filtri, paginazione, valori finali, tipo del file),
dettaglio (404, campi, testata, righe, proposta, controlli, bollettino esistente/non
esistente), PUT (finale salvato e verificato, letto intatto, riga aggiunta, riga tolta e
rinumerata, metadati conservati, livello ricalcolato, evento con `campi_corretti` e livelli,
409, 400 tipo/fornitore/data, 404), scarto (stato e campi, evento, 409, 404, 400), permessi
(sola lettura consulta ma non scrive).

## Cosa funziona sui documenti reali e cosa no

- **Funziona davvero**: elenco, dettaglio, correzione e scarto leggono e scrivono il database
  vero, con transazioni e blocco della riga; la correzione cambia ciò che vedono proposta,
  controlli e livello perché `lettoDaCampi` preferisce il valore finale. Non c'è nessun valore
  calcolato dal browser (V12).
- **Provato solo con documenti costruiti a mano**: le prove creano `documenti_in_arrivo` e
  `documenti_campi` direttamente, come le altre prove di F6. Non è stato fatto un giro su un
  PDF reale letto da GLM-OCR/LlamaCloud: quello resta il collaudo di F6-A5 e delle prove E2E.
- **Evidenziazione del valore nel PDF (D-06)**: non implementata, come da istruzioni, perché
  F0-A7 non l'ha ancora validata. La rotta di dettaglio restituisce `posizione` così com'è nel
  database: la pagina potrà usarla quando la funzione sarà confermata, altrimenti mostrerà solo
  i dati letti.
- **Elenco**: la proposta non c'è per scelta (costosa); la pagina avrà tipo, numero, fornitore,
  importo, livello e `controlli_n`.

## Dubbi e scelte da conoscere

- **Evento dello scarto**: `registro.SCHEMI['documento.update']` richiede `documento_id`,
  `pratica_id`, `prima`, `dopo`; per non cambiare i contratti, il dettaglio porta anche
  `pratica_id: null` e `prima`/`dopo` con livello o stato, oltre ai campi chiesti. Se in futuro
  si vuole un dettaglio più stretto, va deciso in §15.2.4 e in `SCHEMI`.
- **`campi_corretti`**: conta i campi di testata e riga il cui valore finale differisce dal
  letto, più una unità per ogni riga aggiunta. Le righe tolte non incrementano il contatore
  (la richiesta diceva «+ le righe nuove»).
- **Livello dopo la correzione**: può restare `da_controllare` per un controllo non grave, per
  esempio un articolo nuovo assente dalla pratica proposta. È il comportamento voluto dal
  §6.5 punto 5; la prova lo evita aggiungendo l'articolo alla pratica di prova, ma sui
  documenti veri capita.
- **Rotte generiche tolte dalla spec**: `/apri-pratica` e `/registra-bollettino` non esistono;
  restano `POST /api/documenti/:id/abbina` (già implementata) e `POST /api/bollettini` (F3-A1).
  Anche `/rileggi` è stato tolto: non è implementato e non era in questa consegna.
