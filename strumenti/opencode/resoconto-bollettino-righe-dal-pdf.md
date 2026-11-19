# Resoconto `bollettino-righe-dal-pdf` (F7-A7, prima parte)

## File toccati

- `app/backend/src/bollettino.ts` — funzione esportata `importaRigheDalPdf(tx, bollettinoId, arrivoId)` e rotta `POST /api/bollettini/:id/righe/importa`.
- `app/backend/src/bollettini.ts` — chiamata a `importaRigheDalPdf` dentro la transazione di `POST /api/bollettini` quando c'è `arrivo_id`.
- `app/backend/test/bollettini.spec.ts` — due prove nuove (vedi sotto).
- `app/frontend/app/(app)/bollettini/[id]/VistaBollettino.tsx` — riquadro d'avviso e pulsante «Importa le righe dal PDF».

Nessun altro file; niente CSS, migrazioni, `.env`, Integra; nessun commit.

## Diff sintetico

**`importaRigheDalPdf`** (`bollettino.ts`, ~55 righe):

- se il bollettino ha già righe (`count > 0`) → 0, non tocca niente;
- legge `documenti_in_arrivo.lettura_grezza.extract_result.righe`; se non è un array → 0 (bollettino vuoto come prima);
- per riga scrive `bollettini_righe` con `tipo_riga = 'provvigione'`, `fattura_numero`, `fattura_data` (solo `AAAA-MM-GG`, altrimenti null), `importo_merce` (null se assente), `importo_riconosciuto` (0 se assente), `pct_riconosciuta = provvigione / importo × 100` a 2 decimali (null se importo manca o è 0), `quota_pagata` così com'è (null = 100 %), `cliente_id`/`cliente_versione_id` dalla pratica del documento;
- documento abbinato: stessa `fornitore_id` del bollettino, `tipo = 'fattura'`, stesso `numero`; se più di uno, quello con la stessa `data_fattura`, altrimenti il più recente con data ≤ fine mese del bollettino, altrimenti null;
- scrittura con un solo `createMany`. Tutto dentro la transazione di chi chiama, con la testata già bloccata (V13).

**Rotta `POST /api/bollettini/:id/righe/importa`** (`@Richiede('provvigioni.modifica')`, `@HttpCode(200)`):

- blocchi come `blocca()` (fornitore → bollettino, stato `da_verificare`);
- 409 «Il bollettino ha già le righe» se `b.righe.length > 0`;
- 409 «Questo bollettino non ha un PDF da cui leggere le righe» se nessun `documenti_in_arrivo` è legato (`abbinato_bollettino_id`);
- importa e restituisce la riconciliazione come `GET /bollettini/:id`.

**Creazione** (`POST /api/bollettini`): dopo aver legato il file, `importaRigheDalPdf(tx, t.id, arrivo_id)` nella stessa transazione.

**Frontend**: quando il bollettino è `modificabile`, ha un file e `d.righe.length === 0`, sotto il titolo del pannello «Bollettino del fornitore» compare un `div.avviso-variazioni` (icona avviso) con «Le righe del PDF non sono ancora state importate: senza righe non c'è confronto.» e il pulsante «Importa le righe dal PDF» (disabilitato durante la chiamata). Esito con `avviso()`, poi ricaricamento del dettaglio. Nessun'altra modifica all'interfaccia.

## API esposte

| Metodo | Percorso | Permesso | Risposta |
|---|---|---|---|
| POST | `/api/bollettini/:id/righe/importa` | `provvigioni.modifica` | 200 dettaglio del bollettino; 409 righe già presenti / nessun PDF; 403 senza permesso; 404 bollettino assente |

## Esiti delle prove

- `npx tsc --noEmit` in `app/backend`: 0 errori.
- `npx tsc --noEmit` in `app/frontend`: 0 errori.
- `npm test -- bollettino.spec.ts bollettini.spec.ts --forceExit`: **35 test, 35 passati, 0 KO** (era 33; +2 nuovi).

Prove nuove in `bollettini.spec.ts`:

1. creazione con PDF la cui `lettura_grezza` ha 3 righe finte: verifica numero, data, imponibile, provvigione, `pct_riconosciuta` (14,00 su 557,20/3.980), quota 96,43, `tipo_riga`, `documento_id` = F-2026-0921 e cliente/versione dalla pratica; riga con numero sconosciuto → documento null; imponibile 0 → `pct_riconosciuta` null, importo 0; il dettaglio mostra la riga del fornitore; il secondo import → 409 e righe invariate;
2. bollettino senza PDF → 409 con testo esatto; in sola lettura → 403; PDF caricato ma non letto → rotta 200 e 0 righe.

Nessuna prova Playwright lanciata (la fa l'orchestratore).

## Numeri del seed

Le righe dei bollettini del seed non cambiano: l'import parte solo su un bollettino vuoto, e i 7 bollettini del seed hanno già le righe. La prova di coerenza del dettaglio (righe, categorie, totali, azione contro il prototipo, compreso lo storno F-2026-0822 e le attese di agosto Gasper) passa identica: `bollettino.spec.ts` resta verde. La liquidazione successiva non è toccata da questo pacchetto.

## Dubbi

- `lettura_grezza` è l'intero job del lettore (D-170): si legge `extract_result.righe`. Se un domani venisse salvato solo `extract_result`, l'import restituirebbe 0: nessun errore, ma niente righe.
- Se un PDF è stato letto *dopo* la creazione del bollettino, la rotta nuova risolve (il bollettino è ancora vuoto); se invece le righe esistono già non si reimporta, come chiesto.
- L'import non scrive un evento nel registro né un'anomalia: non era richiesto. Da valutare se si vuole tracciarlo come `crud.update` sul bollettino.
- Gli importi con la virgola (`"1.234,56"`) non sono gestiti: il lettore dà numeri JSON (schema `number`) e il prompt impone il punto decimale. Una stringa con la sola virgola decimale viene convertita; i separatori delle migliaia non.

## Da documentare

- **§19** — nuova decisione (es. D-xxx, F7-A7): «Le righe del bollettino si importano dalla lettura già salvata del PDF (`lettura_grezza.extract_result.righe`), alla creazione o su richiesta finché il bollettino è vuoto e da verificare; il documento del fornitore si abbina per numero, con la data se serve a disambiguare. Perché: il PDF era letto ma il confronto restava vuoto; niente riletture né valori dal browser (V12).»
- **§6.2 / §7.7** — una riga «Perché» e la descrizione del pulsante nel pannello del PDF e della rotta.
- **Guida (`guida.js`, `prototipo-alternativo/LEGGIMI.md`)** — «Se il bollettino è vuoto, *Importa le righe dal PDF* legge le righe già lette dal documento: senza righe non c'è confronto.»
- **Piano §12** — attività F7-A7 aggiornata (prima parte fatta: import delle righe; seconda parte: righe «non registrate» da creare come pratiche).

## Dati letti e pulsante (seconda parte)

### File toccati

- `app/backend/src/bollettino.ts` — `righe_fornitore` nella risposta di `riconciliazione()`.
- `app/backend/src/documenti.ts` — `quota_pagata` nelle righe di `dettaglioDocumento`, con ripiego su `lettura_grezza`.
- `app/backend/test/bollettini.spec.ts` — attesa nuova su `righe_fornitore`.
- `app/frontend/app/(app)/bollettini/[id]/VistaBollettino.tsx` — condizione del pulsante e finestra «Dati letti».

Nessun altro file: niente CSS, componenti nuovi, migrazioni, `.env`, Integra; nessun commit.

### Diff sintetico

- `riconciliazione()` aggiunge `righe_fornitore: b.righe.length` (le righe vere del bollettino, non quelle del confronto): la pagina sa se l'import dal PDF è ancora da fare.
- `VistaBollettino.tsx`: avviso e pulsante «Importa le righe dal PDF» quando `modificabile && d.file && d.righe_fornitore === 0`. Nel pannello del PDF il pulsante «Dati letti» apre una `Modale` larga: a sinistra `PdfEvidenziato` (senza rettangolo), a destra `Dettagli` con tipo, numero, data, fornitore, cliente, periodo e importo, poi `DataTable` con fattura, data, importo, provvigione, quota pagata e spesa. In sola lettura, piede con «Apri il documento in Documenti» (`/documenti/<arrivo_id>`) e Chiudi. I dati arrivano da `GET /api/documenti/:id` (stesso permesso della pagina, `provvigioni.consulta`).
- `documenti.ts`: `righe` prendono `quota_pagata` dai campi e, se manca (documenti letti prima che lo schema la chiedesse), da `lettura_grezza.extract_result.righe[i].quota_pagata` (D-170, V12). Accetta numero o stringa con la virgola.

### API esposte

Nessuna rotta nuova: `GET /api/bollettini/:id` guadagna il campo `righe_fornitore`; `GET /api/documenti/:id` ora porta `quota_pagata` valorizzata anche sui documenti già letti.

### Esiti

- `npx tsc --noEmit` in `app/backend` e `app/frontend`: 0 errori.
- `npm test -- bollettini.spec.ts --forceExit`: 15/15 passati, 0 KO (con l'attesa `righe_fornitore === 3`).
- `npm test -- bollettino.spec.ts --forceExit`: 20/20 passati (i 7 bollettini del seed coincidono col prototipo, compreso lo storno F-2026-0822 in Gasper agosto e la riga mancante F-2026-0933). La liquidazione successiva non è toccata.

### Dubbi

- Il ripiego sulla lettura grezza allinea le righe per indice: se `documenti_campi` avesse meno righe del `extract_result` (righe vuote scartate al salvataggio) la quota potrebbe finire sulla riga sbagliata. Caso raro, e solo per il bollettino.
- La finestra mostra il PDF anche se il file è una foto: stesso comportamento della pagina.

### Riga per la Guida

«Accanto al PDF, *Dati letti* mostra cosa il sistema ha letto dal bollettino, in sola lettura; per correggerlo apri il documento in Documenti.»
