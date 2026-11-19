# Pacchetto `bollettino-dati-letti` (seguito F7-A7)

L'import delle righe funziona (provato sul bollettino di marzo: 12 righe del fornitore, confronto con loro/noi, righe «non è fra le nostre pratiche»). Restano due difetti visti a schermo.

## 1. Il pulsante «Importa le righe dal PDF» non compare mai

In `VistaBollettino.tsx` la condizione usa `d.righe.length === 0`, ma `d.righe` sono le righe del **confronto** (calcolate dal motore, sempre presenti), non quelle del fornitore.

- `app/backend/src/bollettino.ts`, `riconciliazione()`: aggiungi alla risposta `righe_fornitore: b.righe.length` (le righe vere del bollettino, `Dati['bollettini'][n].righe`).
- `app/frontend/app/(app)/bollettini/[id]/VistaBollettino.tsx`: campo `righe_fornitore: number` nell'interfaccia `Dettaglio`; il riquadro d'avviso e il pulsante compaiono quando `modificabile && d.file && d.righe_fornitore === 0`.

## 2. Manca la finestra con i dati letti dal PDF (richiesta di Ugo)

Nella pagina del bollettino, accanto al PDF, un pulsante **Dati letti** che apre una finestra a tutto schermo con il PDF a sinistra e, a destra, **cosa ha letto il sistema**: i campi della testata (tipo, numero, data, fornitore, cliente, mese/anno, importo) e le righe lette (numero fattura, data, importo, provvigione, quota pagata, spesa), come la finestra di correzione dei documenti.

- I dati arrivano da `GET /api/documenti/:arrivo_id` (già esiste: restituisce `testata` e `righe`). Nel bollettino l'id del documento in arrivo è `d.file.arrivo_id`.
- Il PDF è lo stesso `PdfEvidenziato` già in pagina (`/api/documenti/<arrivo>/file`): nella finestra basta il PDF senza rettangolo, come in `componenti/ConsultaDocumenti`.
- Solo lettura: chi corregge lo fa dalla pagina Documenti (aggiungi nella finestra il collegamento `Apri il documento in Documenti` verso `/documenti/<arrivo_id>`).
- Riusa `Modale` (larga, a tutto schermo come le altre finestre) e `DataTable` o `Elenco` per le righe: niente componenti nuovi.

**Difetto da correggere insieme**: le righe che `GET /api/documenti/:id` restituisce hanno `quota_pagata: null` anche quando il PDF la porta (96,43 %). Nel mapping delle righe lette (`src/documenti.ts`, `dettaglioDocumento` → `righe`) aggiungi `quota_pagata` dal valore letto (`extract_result.righe[i].quota_pagata`, o `documenti_campi` se c'è), così la finestra mostra la quota.

## File ammessi

- `app/backend/src/bollettino.ts`
- `app/backend/src/documenti.ts`
- `app/backend/test/bollettini.spec.ts` (aggiorna le attese di `righe_fornitore` se serve)
- `app/frontend/app/(app)/bollettini/[id]/VistaBollettino.tsx`

Vietati tutti gli altri: CSS, altre pagine, motore, spec, guida, piano, migrazioni, `.env`, Integra. Niente commit. Non toccare le porte 8001/8002, non toccare il database di sviluppo (Ugo sta usando l'app): prove solo su `decobrands_test`.

## Vincoli

- V12/D-28: i numeri e i valori mostrati vengono dal server.
- Ponytail: nessun componente nuovo, nessuna classe CSS nuova; si riusano `Modale`, `PdfEvidenziato`, `Elenco`.
- ⚠️ Working tree con molte modifiche non committate: niente `git stash/checkout/reset`.

## Prove

- `npx tsc --noEmit` in backend e frontend: 0 errori.
- `npm test -- bollettini.spec.ts --forceExit`: 0 KO.
- Non lanciare Playwright: la prova la fa l'orchestratore.

## Resoconto

Aggiorna `strumenti/opencode/resoconto-bollettino-righe-dal-pdf.md` con la sezione «Dati letti e pulsante» (file, diff sintetico, esiti, dubbi, riga per la Guida).
