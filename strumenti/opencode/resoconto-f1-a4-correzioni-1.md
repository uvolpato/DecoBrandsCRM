# Resoconto F1-A4 — correzioni 1

## Punto 1 — un giro alla volta anche dalla rotta
- `IntegraService.sincronizza()` controlla `inCorso` prima di partire e lo rilascia nel `finally`;
  il timer (`giro()`) non lo imposta più. Se c'è già un giro, la rotta risponde **409**
  «Sincronizzazione già in corso».
- Prova: due `sincronizza()` insieme → uno solo completa, l'altro rifiuta con quel messaggio;
  un solo cliente in database.

## Punto 2 — una riga in errore non sparisce
- Aggiunta l'anomalia `integra.riga` (schema in `SCHEMI`), chiave `"<vista>:<id_integra>"`,
  dettaglio `{ vista, id_integra, errore }`, testo fisso «Il cliente/fornitore X non è stato
  copiato: …». Si chiude quando la riga passa.
- `daQuando()` torna alla più vecchia anomalia `integra.riga` aperta meno un giorno.
- Prova: identità che punta a un cliente inesistente → anomalia aperta; tolta l'identità
  sbagliata, il giro successivo (2 giorni dopo) copia la riga e chiude l'anomalia.

## Punto 3 — «Integra non risponde» solo per il ponte
- `misure.ponte = !ponteKo` in ogni giro; `controllaConnessione()` conta solo gli ultimi 3 giri
  conclusi con `misure.ponte === false` (filtro JSON Prisma `path`).
- Prova: 2 giri con vista mancante + 1 con ponte giù → nessuna `integra.connessione`; 3 giri con
  ponte giù → anomalia aperta. La prova esistente dei 3 giri resta verde.

## Punto 4 — chiave solo dal codice di Integra
- `identita()` cerca solo `codiceDi(r)`; tolto il secondo tentativo su `String(id_integra)`.
- Aggiunta la domanda 6 in fondo a `strumenti/integra/viste-crm.sql` (`cli_cdclistr` unico e
  stabile?).
- Prova: soggetto A con codice `"500"`, soggetto B con `id_integra = 500` e codice `"C00500"` →
  due soggetti, A invariato.

## Punto 5 — ponte in sola lettura anche dal CRM
- Esportata `creaPonte(url)` con `options: '-c default_transaction_read_only=on'`; usata da
  `IntegraService` e dalle prove, senza duplicare le opzioni.
- Prova: `SHOW transaction_read_only` → `on`; `INSERT` sul ponte → errore `25006`.

## Punto 6 — niente indirizzo nei messaggi
- `pulisci()` (ora esportata) toglie URL `postgres://`, IPv4 con o senza porta, host dopo
  `ENOTFOUND`/`EAI_AGAIN` e `password=…`.
- Prova: i tre esempi (IP con porta, `ENOTFOUND host`, URL con password) non lasciano indirizzo,
  host o password.

## Punto 7 — codice più corto
- `pivaDoppie()`: conteggio in SQL con `GROUP BY piva HAVING count(*) > 1`; via la `Map` JS.
- `applicaCliente()`/`applicaFornitore()`: **lasciate separate**. Unirle con una tabella per tipo
  richiederebbe cast/`any` sui delegati Prisma e verrebbe più lunga delle due funzioni attuali
  (il compilatore non accetta l'accesso dinamico tipizzato ai modelli); annotato qui come da
  richiesta.

## Verifica
- `npx tsc --noEmit`: 0 errori.
- `npx jest --runInBand test/integra.spec.ts`: 20/20, 0 KO.
- `npx jest --runInBand` (tutte le prove): **159/159**, 0 KO, due volte di seguito.
- Database usato: `decobrands_test`; il ponte finto `decobrands_ponte_prova`.

## Dubbi
- Nessuno bloccante. Restano le domande al sistemista già nel resoconto F1-A4 (codice azienda,
  privati senza P.IVA, email/PEC, `cla_agecod`, `postgres_fdw` o funzione) più la nuova su
  `cli_cdclistr`.
