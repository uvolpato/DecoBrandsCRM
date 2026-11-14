# Resoconto — Ricerca del cliente col codice cliente del fornitore (14/11/2026)

Esecutore: DeepSeek V4 pro · Pacchetto: `strumenti/opencode/codice-cliente-in-ricerca.md` · Gravità P1.

## Cosa chiede Ugo

Nella ricerca del **cliente** (menu e maschera della lente, `CampoRicerca` con l'entità `cliente`)
serve la colonna **codice cliente presso il fornitore** (`interscambio.codice_cliente_fornitore`,
l'agenzia cliente–fornitore): il codice che deve coincidere con il «Codice cliente» letto dal documento.

## Cosa ho fatto

- **Server** (`clienti.ts`): `GET /api/clienti` accetta `?fornitore_id=…` (intero positivo,
  `ParseIntPipe` opzionale: valore non numerico → 400). Con il parametro ogni cliente porta anche
  `codice_fornitore` = `codice_cliente_fornitore` dell'agenzia col quel fornitore **valida oggi, o
  l'ultima** (per `valido_dal`). Una sola query su `interscambio` filtrata per fornitore, poi la
  scelta in memoria: niente N+1. Permessi come la rotta attuale (`dati.consulta`). Senza il
  parametro il campo non viene aggiunto (elenco clienti invariato).
- **Frontend**:
  - entità `cliente` (`entita.ts`): con `contesto.fornitore_id` le voci si caricano da
    `clienti?fornitore_id=…` e portano `codice_fornitore`; il dettaglio del menu mostra
    `Cod. 45172 · P.IVA …`; `cerca` include il codice; `colonne` può essere una funzione del
    contesto e, con fornitore, aggiunge la colonna «Cod. cliente» (vuota senza agenzia).
  - `CampoRicerca.tsx`: `RicercaEntita` risolve `ent.colonne` (array o funzione). Nel menu
    (`Singola`) se il contesto ha `codice_cliente`, la voce col codice uguale **sale in testa** e
    porta il segno «✓ coincide con il codice letto».
  - `VistaDocumento.tsx`: la ricerca Cliente di *Correggi i dati letti* riceve
    `contesto={{ fornitore_id, codice_cliente }}`. La modale *Apri la pratica* è diventata un
    componente `ApriPratica` che passa al campo Cliente il `fornitore_id` **scelto lì** (stato
    locale aggiornato da `onCambia` del campo Fornitore).
  - La cache delle voci distingue già il contesto (`caricaVoci`/`useVoci` usano il contesto come
    chiave): fornitore diverso → voci diverse.
- **Guida** (`guida.ts`): il «da sapere» dei Documenti descrive la colonna «Cod. cliente», la
  ricerca per codice e il segno «coincide con il codice letto».

## Prove

- `npx tsc --noEmit` backend: **OK**; frontend: **OK**.
- jest `test/clienti.spec.ts` su `decobrands_test_codcli` (creato, migrato, cancellato):
  **36/36** (6 nuove: codice dell'agenzia valida oggi, agenzia chiusa → vale l'ultima, senza
  agenzia → `null`, senza `fornitore_id` la proprietà manca, `fornitore_id` non numerico → 400,
  lettura consulta con `fornitore_id`).
- `python -m py_compile strumenti/prove/app_documenti.py`: **OK** (aggiunto il controllo «con
  fornitore scelto il menu cliente mostra il codice e il segno coincide»; prova browser non
  lanciata, come da regole).

## Controlli (skill caricate davvero)

- `caveman`: risposte concise.
- `owasp-security`: `fornitore_id` validato sul server (`ParseIntPipe`, intero positivo) e usato
  solo come filtro parametrizzato via Prisma; il `codice_fornitore` è un dato già visibile con
  `dati.consulta` (le agenzie del cliente) e non aggiunge superficie di attacco; il codice letto
  (`contesto.codice_cliente`) è testo mostrato da React (escapato), mai eseguito. Niente rilievi.
- `postgresql-code-review`: una sola query su `interscambio` con indice
  `interscambio_fornitore_id_codice_cliente_fornitore_idx` già presente; la scelta «valida oggi /
  ultima» in memoria, senza query per riga. Niente rilievi.
- `ponytail-review`: `colonne` come funzione è l'unico modo per far variare la colonna col
  contesto (nessuna astrazione nuova); il componente `ApriPratica` sostituisce il modulo statico
  solo per portare il fornitore scelto come contesto. `net: 0 linee da tagliare`.

## Da documentare (a cura di chi chiude l'onda)

- spec §7.9 (Correggi i dati letti) e §16.4.1 (ricerca/filtri standard): l'entità `cliente` accetta
  `contesto.fornitore_id` (e `codice_cliente`): con fornitore compare la colonna «Cod. cliente»
  (codice presso quel fornitore, vuoto senza agenzia) e la ricerca trova anche per codice; se il
  codice coincide con quello letto, la voce sale in testa col segno «coincide con il codice letto».
- spec §19 — decisione nuova **D-157 (da proporre)**: «nella ricerca del cliente con un fornitore
  nel contesto, la colonna «Cod. cliente» mostra `codice_cliente_fornitore` dell'agenzia valida
  oggi (o l'ultima) con quel fornitore, così si confronta col «Codice cliente» letto» + il perché
  (il documento porta il codice cliente del fornitore, non l'id CRM: senza quella colonna la scelta
  giusta non si distingue dalle altre; l'agenzia può essere chiusa, ma il codice resta utile).
- `entita.ts`/`CampoRicerca.tsx`: `colonne` può essere una funzione del contesto.

## Aperti / da segnalare

- La prova browser (app_documenti) va lanciata da Claude Code a fine onda: è l'unico punto non
  verificato qui (schermata `app-documenti-codice-cliente-1440.png`).
- Il numero di decisione D-157 è **da proporre**: un altro pacchetto dell'onda (`vecchio-crm-in-
  esercizio`) usa D-156; chi chiude l'onda assegna i numeri definitivi.
- «Apri la pratica»: il contesto del campo Cliente segue il fornitore scelto; non ho toccato il
  caso in cui si sceglie un fornitore diverso dopo aver già scelto il cliente (il cliente resta,
  il segno «coincide» può sparire finché non si risceglie).
