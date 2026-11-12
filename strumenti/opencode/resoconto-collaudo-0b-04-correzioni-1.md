# Resoconto · Onda 0 bis · 0b-04 correzioni 1 — `daIntegra` senza conteggi doppi

Data: 12/11/2026 · Esecutore: DeepSeek V4 Flash · Rilievo: C1 (P3) · Decisioni applicate: D-138, D-101, V12.

## Cosa ho fatto

- `app/backend/src/soggetti.ts:196-220` — `Ruolo` ha `fonte: string`; `ruoliDi` legge `fonte` nella versione corrente di cliente e fornitore (`corrente: { select: { ragione_sociale, fonte } }`). Per il subagente `fonte: ''` (non ha versioni).
- `app/backend/src/soggetti.ts:323` — `daIntegra(ruoli: Ruolo[])` è sincrona e calcola in memoria: `ruoli.some((r) => r.codice || r.fonte === 'integra')`. Via i due `count` su `clienti` e `fornitori`: gli stessi dati arrivano da `ruoliDi`.
- `app/backend/src/soggetti.ts:467` — il dettaglio usa i ruoli già letti: `da_integra: daIntegra(ruoli)`.
- `app/backend/src/soggetti.ts:499,542` — `PUT /soggetti/:id` e `POST /soggetti/:id/attivo`: dentro la transazione si leggono i ruoli una volta (`ruoliDi`) e si applica la guardia 409 di D-138. Stessa semantica di prima (un ruolo con codice o con versione corrente `fonte = 'integra'`; nessun ruolo = nessun blocco), una query in meno per chiamata.
- `app/backend/src/soggetti.ts:800,814` — `creaRuolo` restituisce `fonte: 'crm'`, coerente con la versione appena creata.

Semantica invariata: prima il codice era controllato sui ruoli e la fonte con due `count`; ora entrambe stanno sui ruoli già letti, compresi quelli non attivi (come prima: i `count` non filtravano `attivo`).

## Prove lanciate

- Database di prova `decobrands_test_0b_04c`: creato, `prisma migrate deploy` (26 migrazioni), prove, poi cancellato (`DROP DATABASE … WITH FORCE`).
- `cd app/backend && npx jest test/soggetti.spec.ts` (con `DATABASE_URL_TEST`, `TMP`/`TEMP` dedicati) → **1 suite, 25 prove, 0 KO**. Prove di D-138 non modificate.
- `cd app/backend && npx tsc --noEmit` → l'unico errore rimasto non è mio: `src/anagrafica-integra.ts` (righe 87, 129, 132, `query_timeout` e `Riga`/`Promise`), file di un altro pacchetto in scrittura nell'onda. In un giro precedente l'errore era in `src/documenti.ts`, poi sparito: file di altri pacchetti. `soggetti.ts` compila (ts-jest non ha segnalato diagnostica).
- Frontend non toccato: nessun `tsc` sul frontend, nessuna prova nel browser (regole dell'onda).
- Nessuna prova aggiunta: il pacchetto chiede solo le prove esistenti a 0 KO.

## Cose aperte

- Il campo `fonte` ora compare anche nei `ruoli` dell'elenco e del dettaglio (`GET /soggetti`, `GET /soggetti/:id`). Il frontend lo ignora (nessun tipo lo richiede) e non è un dato sensibile; se la spec §5 vuole la risposta dei ruoli senza `fonte`, va tolto in risposta (una `map`) — non l'ho fatto per non allargare il diff.
- `npx tsc --noEmit` sul backend va rilanciato a fine onda, quando i pacchetti paralleli avranno chiuso `anagrafica-integra.ts` e `documenti.ts`.

## Da documentare

Nulla di nuovo: C1 non cambia regole né interfaccia, è solo un risparmio di query dentro D-138. Nessuna riga §19, nessuna riga *Perché*, nessuna modifica a guida, piano o README. Se 0b-doc vuole, una nota in §19 sotto D-138: «`da_integra` si calcola dai ruoli già letti (`codice` o versione corrente `fonte = 'integra'`), senza conteggi separati».
