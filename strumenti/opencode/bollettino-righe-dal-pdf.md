# Pacchetto `bollettino-righe-dal-pdf` (F7-A7, prima parte)

## Compito

Ugo (18/11/2026): «Ho caricato il bollettino di marzo … non vedo il confronto … non vedo le fatture che sono nel bollettino e che non sono registrate».

Diagnosi già fatta: il PDF del bollettino (documento in arrivo 68, `Provisionsabrechnung_20_März2026.pdf`, fornitore 31) **è stato letto** — `documenti_in_arrivo.lettura_grezza.extract_result.righe` ha 12 righe con `numero_fattura`, `data_fattura`, `importo`, `provvigione`, `quota_pagata` — ma **nessuna riga è mai stata scritta in `bollettini_righe`**: la tabella del bollettino (id 1, marzo 2026) è vuota, per questo il confronto è vuoto.

Ora: importare quelle righe nel bollettino, così il confronto a cerniera funziona (righe quadrate con il nostro valore, differenze, righe non registrate come «non è fra le nostre pratiche»).

## 1. Backend — `app/backend/src/bollettini.ts` e `bollettino.ts`

Una funzione sola, esportata da `bollettino.ts` e usata in due punti (V13: dentro la transazione che ha già i blocchi):

```ts
export async function importaRigheDalPdf(tx: Prisma.TransactionClient, bollettinoId: bigint, arrivoId: bigint): Promise<number>
```

- legge `documenti_in_arrivo.lettura_grezza` del documento: le righe stanno in `extract_result.righe` (array di `{ numero_fattura, data_fattura, importo, provvigione, quota_pagata }`); se non è un array → 0 righe, nessun errore (il bollettino resta senza righe come oggi);
- per ogni riga scrive in `bollettini_righe` (campi della tabella):
  - `testata_id` = bollettino, `tipo_riga` = `'provvigione'`,
  - `fattura_numero` = `numero_fattura` (stringa, `''` se assente), `fattura_data` = `data_fattura` (date o null),
  - `importo_merce` = `importo`, `importo_riconosciuto` = `provvigione` (0 se assente),
  - `pct_riconosciuta` = `provvigione / importo × 100` arrotondata a 2 decimali (null se `importo` manca o è 0),
  - `quota_pagata` = `quota_pagata` così com'è (percentuale 0-100; null = 100 %),
  - `documento_id` = la fattura del fornitore che corrisponde: stesso `fornitore_id` del bollettino, `tipo = 'fattura'`, `numero = numero_fattura`; se ce ne sono più di una, quella con la stessa `data_fattura`, altrimenti la più recente entro la fine del mese del bollettino;
  - `cliente_id` e `cliente_versione_id` dalla pratica di quel documento (null se non trovato).
- **non** importa due volte: se il bollettino ha già righe, non tocca niente e restituisce 0.

Dove si usa:
- `POST /api/bollettini` (`carica`): quando c'è `arrivo_id`, dopo aver creato la testata e legato il file, chiama `importaRigheDalPdf` nella stessa transazione.
- nuova rotta `POST /api/bollettini/:id/righe/importa` (`@Richiede('provvigioni.modifica')`): per i bollettini già creati e ancora vuoti. Blocca come `blocca()` (stato `da_verificare`), chiama la funzione con l'`arrivo_id` del file del bollettino (la colonna c'è già: la usa `d.file`), restituisce la riconciliazione come `GET /bollettini/:id`. Se il bollettino ha già righe → **409** «Il bollettino ha già le righe». Se non ha un file → **409** «Questo bollettino non ha un PDF da cui leggere le righe».

## 2. Frontend — `app/frontend/app/(app)/bollettini/[id]/VistaBollettino.tsx`

Quando il bollettino è `modificabile`, ha un file e **non ha righe** (`d.righe.length === 0`): nel pannello «Bollettino del fornitore», sotto il PDF, un riquadro d'avviso (classe `avviso-variazioni`) con il testo «Le righe del PDF non sono ancora state importate: senza righe non c'è confronto.» e il pulsante `Importa le righe dal PDF` che chiama la rotta nuova, mostra l'avviso di esito e ricarica il dettaglio.

Nessun altro cambiamento all'interfaccia.

## File ammessi

- `app/backend/src/bollettino.ts`
- `app/backend/src/bollettini.ts`
- `app/backend/test/bollettino.spec.ts` (o `bollettini.spec.ts`): prove della funzione e della rotta
- `app/frontend/app/(app)/bollettini/[id]/VistaBollettino.tsx`

Vietati tutti gli altri: CSS, altre pagine, motore, spec, guida, piano, migrazioni, `.env`, Integra. Niente commit. Non toccare le porte 8001/8002. Ugo usa l'app sul database di sviluppo: lavora solo su `decobrands_test`.

## Vincoli

- 📕 V12/D-28: le righe si leggono dal database, il browser manda solo la richiesta. V13: tutto dentro la transazione che ha i blocchi.
- Semplicità (ponytail): una funzione, due chiamate, nessuna colonna nuova, nessuna migrazione.
- ⚠️ Working tree con molte modifiche non committate: niente `git stash/checkout/reset`.

## Prove

- `npx tsc --noEmit` in backend e frontend: 0 errori.
- `npm test -- bollettino.spec.ts bollettini.spec.ts --forceExit`: 0 KO, con un caso che importa righe da una `lettura_grezza` finta e verifica numero, importo, provvigione, quota e `documento_id` abbinato.
- Non lanciare Playwright: la prova la fa l'orchestratore.

## Resoconto

Scrivi `strumenti/opencode/resoconto-bollettino-righe-dal-pdf.md`: file toccati, diff sintetico, esiti `tsc`/`jest`, dubbi, **Da documentare** (riga §19 per la decisione, ritocco §6.2/§7.7, Guida).
