# Resoconto — `documenti-lentezza` (17/11/2026)

## Causa (con i numeri)

La lentezza della pagina Documenti non è il volume (13 documenti) né il caricamento completo dei
clienti (1858 clienti, ~150 ms): è il **ponte di Integra**, chiamato in modo sincrono all'apertura.

- una sola `cerca` su Integra: **~3.005 ms** («ponte lento»: la connessione risponde ma la vista è
  lenta, oltre il tempo massimo D-111).
- `elenco` (`GET /api/documenti?stato=aperte`) chiama `esitiImportazione` → `cerca` per i candidati
  «da importare»; `dettaglio` (`GET /api/documenti/:id`) chiama `contestoDocumento` → `cerca`.
- Tolto il ponte (spia `ponte() → null`), l'elenco scende a **~130–270 ms** e il dettaglio a **~80–100 ms**:
  quasi tutta la lentezza era Integra.

## Tempi (misurati su `decobrands_test_perf`, 3 giri)

| Chiamata | Prima | Dopo | Causa | Correzione |
|---|---|---|---|---|
| Coda `GET /api/documenti?stato=aperte&per_pagina=200` | ~4.075 ms (mediana) | ~900 ms giro singolo, ~1.350 ms mediana di 3 giri consecutivi | `cerca` Integra sincrona (3 s) in `esitiImportazione` | tempo breve `TEMPO_AUTO_MS` |
| Dettaglio `GET /api/documenti/:id` | ~3.308 ms (mediana) | ~906 ms (mediana) | `cerca` Integra sincrona (3 s) in `contestoDocumento` | tempo breve `TEMPO_AUTO_MS` |
| Ricerca automatica su Integra | 3.005 ms | **~500 ms** | — | `TEMPO_AUTO_MS = 500` |

La ricerca su richiesta (`GET /api/integra/cerca`, `importa`) mantiene il tempo pieno di D-111 (3 s).

## Correzione (minima, senza cambiare i risultati)

- `anagrafica-integra.ts`: `cerca` accetta un tempo massimo `ms` (default 3000, D-111); nuovo
  `TEMPO_AUTO_MS = 500` per le ricerche automatiche. `conTempo`/`righeVista` ricevono il tempo.
- `documenti.ts`: `esitiImportazione` (elenco) e `contestoDocumento` (dettaglio) passano
  `TEMPO_AUTO_MS` alle `cerca` automatiche.
- Quando il ponte è sano, i candidati compaiono come prima; quando è lento, la pagina risponde in
  ~500 ms invece di 3 s, con lo stesso esito («nessun candidato»).

## Prove ed esito

- Misura: `app/backend/test/documenti-lentezza.spec.ts` su `decobrands_test_perf` (2 test, 0 KO).
  Soglia di controllo larga (2 s) per non renderla fragile.
- Suite toccate su `decobrands_test_lentezza` (migrazioni applicate, 0 KO):
  - `integra.spec.ts` + `anagrafica-integra.spec.ts`: 46 passati.
  - `documenti.spec.ts` + `documenti-lettura.spec.ts` + `documenti-pratica.spec.ts` + `correzione.spec.ts`: 135 passati.
- `npx tsc --noEmit` (backend): pulito. Frontend non toccato.

## Dubbi / aperti

1. **Ponte Integra lento (>3 s per vista):** il CRM non può sistemarlo, dipende da Integra/VPN. La
   vista è cercata con `regexp_replace`/`ILIKE` senza indice: da segnalare a chi gestisce Integra.
2. **Saturazione del pool (max 2):** le query lente abbandonate tengono le connessioni; sotto raffica
   il mediano sale (~1,3 s). Se il problema persiste, serve un health-gate/cache sul ponte (non introdotta
   qui, come richiesto).
3. **Caricamento completo dei clienti** (`clienti.findMany`, 1858, ~150 ms): non è la causa, ma crescerà
   coi dati; ottimizzabile con query mirate (non fatto: fuori dalla causa e rischio di cambiare risultati).

## Da documentare (§19)

- Nuova decisione: le **ricerche automatiche di Integra** nella pagina Documenti (candidati «da importare»)
  usano un tempo breve (500 ms) invece del tempo pieno di D-111 (3 s), per non fermare la pagina su un
  ponte lento. La ricerca su richiesta resta a 3 s. Da registrare come D-nn in spec §19 e §4.7.1.

## Correzioni 1 (17/11/2026)

Il tempo breve (500 ms) era un cerotto: con il ponte giù la pagina pagava ancora 0,5 s per chiamata, il
pool (2 connessioni) si saturava e i candidati sparivano senza dirlo. Correzione alla radice, codice minimo.

### Fatto

- **Interruttore sul ponte** in `anagrafica-integra.ts` (un punto solo): se una `cerca` fallisce o va oltre
  il tempo, per i successivi **60 s** le ricerche **automatiche** non chiamano il ponte (rispondono subito
  «ponte non disponibile»); la ricerca **su richiesta** prova sempre e, se riesce, richiude l'interruttore
  (`chiudiInterruttore`). Variabile in memoria (`ponteKoFino`), niente cache né tabelle. `cerca` ha il nuovo
  parametro `automatica`; `importa` richiude l'interruttore dopo la lettura riuscita.
- **Non nascondere**: `esitiImportazione` (elenco) e `contestoDocumento` (dettaglio) passano `automatica: true`;
  quando il ponte non è stato interrogato o non ha risposto, la risposta porta `integra: 'non_disponibile'`
  e la pagina mostra la riga tenue «Integra non raggiungibile: i candidati da importare non sono aggiornati»
  invece di «nessun candidato» (`VistaDocumenti.tsx`, `VistaDocumento.tsx`).
- `TEMPO_AUTO_MS = 500` resta per il primo tentativo.
- Spec: D-203 in §19, *Perché* in §4.7.1, versione 8.92.

### Prove ed esito (su `decobrands_test_lentezza`, 0 KO)

- `anagrafica-integra.spec.ts`: nuove prove dell'interruttore (ponte lento → automatiche senza chiamare il
  ponte per 60 s, poi riprova; ricerca su richiesta riuscita richiude).
- `documenti.spec.ts`: elenco e dettaglio con `integra: 'non_disponibile'` quando il ponte non risponde.
- Suite toccate: `integra.spec.ts` + `anagrafica-integra.spec.ts` = 96 passati; `documenti.spec.ts` +
  `documenti-lettura.spec.ts` + `documenti-pratica.spec.ts` + `correzione.spec.ts` = 88 passati.
- `npx tsc --noEmit`: pulito nel backend e nel frontend.

### Aperti

1. **Saturazione del pool (max 2)**: l'interruttore evita di pagare il tempo a ogni apertura, ma il primo
   tentativo di una raffica resta 500 ms e può ancora saturare il pool. Se persiste, serve un health-gate
   condiviso fra processi (fuori da questo pacchetto).
2. **Ponte lento in Integra** (vista con `regexp_replace`/`ILIKE` senza indice): da segnalare a chi gestisce
   Integra, il CRM non può sistemarlo.
