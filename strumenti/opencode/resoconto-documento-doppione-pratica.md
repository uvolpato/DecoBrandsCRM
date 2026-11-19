# Resoconto `documento-doppione-pratica` (backend)

Data: 18/11/2026. Pacchetto: `strumenti/opencode/documento-doppione-pratica.md`.
Richiesta di Ugo: dal 409 del file già caricato si deve sapere **per quale pratica** è arrivato, per poterla linkare.

## File toccati

- `app/backend/src/documenti.ts` (`riceviDocumento`)
- `app/backend/test/documenti.spec.ts` (describe `POST /api/documenti/carica`)

Nessun altro file. Niente commit, niente migrazioni, `.env` e Integra non toccati.

## Diff sintetico

`documenti.ts`, prima:

```ts
const doppione = () => new ConflictException('Documento già caricato: è lo stesso file di uno già arrivato');
```

dopo (funzione asincrona che riceve il client — `db` o `tx` — e l'id dell'abbinamento):

```ts
const doppione = async (client: Db, pratica_id: bigint | null) => {
  const p = pratica_id == null ? null
    : await client.ordini_fornitore_testata.findUnique({ where: { id: pratica_id }, select: { numero_ordine: true } });
  return p
    ? new ConflictException({ message: `Documento già caricato: è lo stesso file della pratica ${p.numero_ordine}`,
        pratica: { id: String(pratica_id), numero: p.numero_ordine } })
    : new ConflictException({ message: 'Documento già caricato: è lo stesso file di uno già arrivato', pratica: null });
};
```

I tre punti che lanciavano il 409 passano l'id del doppione:

1. lettura iniziale: `select` allargato a `abbinato_pratica_id` → `throw await doppione(db, gia.abbinato_pratica_id)`;
2. dentro la transazione, riga riletta per `id`: `throw await doppione(tx, riga.abbinato_pratica_id)` (V13: si resta su `tx`);
3. `P2002`: rilettura della riga per `file_hash` (`select: { abbinato_pratica_id: true }`) → `throw await doppione(db, altra?.abbinato_pratica_id ?? null)`; se la riga non c'è più, `pratica: null`.

Nessun campo nuovo, nessuna migrazione, nessun tipo esportato in più: il corpo si compone al volo e il numero si legge dal database (V12/D-28). Il corpo dell'eccezione è quello che Nest serializza così com'è quando si passa un oggetto (`node_modules/@nestjs/common/exceptions/http.exception.js` → `createBody`): nessun `statusCode` aggiunto, il 409 resta nel codice HTTP.

### Corpo 409 finale nei tre casi

- file già arrivato **senza** pratica (in coda, scartato caricato di nuovo…) —
  `{"message":"Documento già caricato: è lo stesso file di uno già arrivato","pratica":null}`
- file già arrivato e **abbinato** a una pratica —
  `{"message":"Documento già caricato: è lo stesso file della pratica OF/2026/002","pratica":{"id":"123","numero":"OF/2026/002"}}`
- pratica sparita fra abbinamento e doppione (riga con `abbinato_pratica_id` che non trova la testata, o `P2002` con riga scomparsa) — torna il primo corpo, `pratica: null`, senza errore.

## Prove

- `npx tsc --noEmit` in `app/backend`: **0 errori** (il `tsconfig` include anche `test/`, quindi il test nuovo compila).
- `npm test -- documenti.spec.ts`: al primo giro **70/70 KO al `beforeAll`**, prima di arrivare ai test (database di prova indietro sulle migrazioni). Errore:

```
PrismaClientKnownRequestError:
Invalid `prisma.$executeRawUnsafe()` invocation:
Raw query failed. Code: `42P01`. Message: `la relazione "alias_letti" non esiste`
      at svuota (test/svuota.ts:13:5) — TRUNCATE …, alias_letti, …
```

  Causa: il database `decobrands_test` è **indietro sulle migrazioni** — manca `alias_letti`, creata da `prisma/migrations/20261115090000_alias_letti` (committata) e usata da `test/svuota.ts`. Il guasto è del database di prova, non di questa modifica: falliscono tutti i test del file, compresi quelli non toccati, prima che `riceviDocumento` venga chiamato. Come da pacchetto **non** ho creato né migrato il database di prova. Serve un `npx prisma migrate deploy` su `decobrands_test` (con `DATABASE_URL` che punta lì), deciso da Ugo.
  Nota d'ambiente: `jest` non esce a fine giro ("Jest did not exit one second after the test run has completed" — handle aperti); il primo `npm test` è andato in timeout per questo, la prova è stata rilanciata come `node node_modules/jest/bin/jest.js documenti.spec.ts --runInBand`. Per gli script conviene `--forceExit`.
- **Risolto dall'orchestratore (18/11/2026)**: `npx prisma migrate deploy` su `decobrands_test` (migrazioni già committate) e `npm test -- documenti.spec.ts --forceExit` → **70/70 passati**, test nuovo compreso.
- **Prova vera col backend acceso** (database di sviluppo, sola lettura più il 409): ricaricato il file già abbinato alla pratica OF/2026/011 → `{"message":"Documento già caricato: è lo stesso file della pratica OF/2026/011","pratica":{"id":"11","numero":"OF/2026/011"}}`; nella finestra della pratica il messaggio nomina la pratica e sotto compare il link «Apri la pratica OF/2026/011» → `/pratiche/11`.

## Test aggiunti

- `lo stesso file una seconda volta: 409 (doppione per impronta), senza pratica se è ancora in coda` — oltre allo stato 409 controlla `message` (testo attuale) e `pratica: null`.
- `doppione di un file già abbinato: il 409 dice la pratica, per il link` — carica un PDF nuovo, mette `abbinato_pratica_id = pratica.id` con un `db.documenti_in_arrivo.update` (come già si fa per `stato: 'scartato'`), ricarica lo stesso file e controlla `message` e `pratica: { id, numero }` presi dalla testata `pratica` della fixture. La riga è nuova e in coda, quindi non altera i conteggi relativi dei test successivi.

## Dubbi

1. Il test nuovo resta **non eseguito** finché `decobrands_test` non è allineato: appena lo è, va rilanciato `npm test -- documenti.spec.ts`.
2. Il link nel browser dipende dal frontend (non mio): deve leggere `pratica` dal corpo del 409 e aprire `#/pratiche/<id>` o la rotta dell'app. Oggi nessun consumatore legge quel campo.
3. Scelta di prova: `toMatchObject` (non `toEqual`) sul corpo, così il test non si rompe se Nest aggiungesse chiavi al corpo; `message` e `pratica` sono comunque verificati per intero.

## Da documentare

- **§19, riga nuova** (numero da assegnare): *D-nn — 18/11/2026 — Il 409 del file già caricato dice anche la pratica. Il doppione per impronta risponde `{ message, pratica: { id, numero } | null }`, con `numero` da `ordini_fornitore_testata.numero_ordine`; senza pratica il messaggio resta quello di prima. Perché: Ugo vuole sapere da quale pratica è arrivato il file che sta ricaricando e raggiungerla con un link (il numero si legge dal database, V12). Dove: §6.5 punto 1, §8.1; `src/documenti.ts` (`riceviDocumento`), `test/documenti.spec.ts`.*
- **§6.5, punto 1**, dopo «`file_hash` scarta i doppioni»: aggiungere — «Il 409 del doppione dice anche la pratica da cui il file è già arrivato (`pratica: { id, numero }`, numero = `numero_ordine`); se il file non è ancora abbinato `pratica` è `null` e il messaggio resta «è lo stesso file di uno già arrivato».»
- **§8.1, riga `POST /api/documenti/carica`**: al posto di «409 se lo stesso file è già arrivato (impronta)» → «409 se lo stesso file è già arrivato (impronta), con `pratica: { id, numero }` quando è già abbinato (`null` se ancora in coda)».
