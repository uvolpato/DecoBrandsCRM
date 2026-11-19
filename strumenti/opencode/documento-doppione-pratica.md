# Pacchetto `documento-doppione-pratica` (backend)

## Compito

Ugo (18/11/2026): «se aggiungo un file che è già stato aggiunto per errore, vorrei sapere nell'errore per quale pratica è stato aggiunto e poterla con un link vedere».

Oggi il doppione risponde solo `Documento già caricato: è lo stesso file di uno già arrivato`. Deve dire **su quale pratica** è quel file, così il frontend può mettere il link.

`app/backend/src/documenti.ts`, `riceviDocumento` (~riga 104):

- il doppione diventa una funzione asincrona che, dato il client (`db` oppure `tx`) e l'`abbinato_pratica_id`, risponde **409** con questo corpo:

  ```json
  { "message": "Documento già caricato: è lo stesso file della pratica OF/2026/002",
    "pratica": { "id": "123", "numero": "OF/2026/002" } }
  ```

  Se il file non è ancora su nessuna pratica: `pratica: null` e messaggio `Documento già caricato: è lo stesso file di uno già arrivato` (testo attuale).
- `numero` è `ordini_fornitore_testata.numero_ordine`; `id` è la stringa dell'id pratica (`BigInt` → `String`, come le altre risposte).
- i **tre** punti che oggi lanciano il 409 devono passare l'id del doppione:
  1. lettura iniziale `findUnique({ where: { file_hash: hash } })` (~riga 118): aggiungi `abbinato_pratica_id: true` al `select` e usa quel valore;
  2. dentro la transazione, riga già caricata con `findUnique({ where: { id: gia.id } })` (~riga 132): la riga intera ha già il campo;
  3. `P2002` (~riga 154): rileggi la riga per `file_hash` e usa il suo `abbinato_pratica_id` (se la riga non c'è più, `pratica: null`).
- Uso: `new ConflictException({ message, pratica })`.

## File ammessi

- `app/backend/src/documenti.ts`
- `app/backend/test/documenti.spec.ts`

Vietati tutti gli altri: frontend, CSS, altre pagine, spec, guida, piano, migrazioni, `.env`, Integra. Niente commit. Non toccare le porte 8001/8002.

## Vincoli

- 📕 **V12/D-28**: il numero della pratica si legge dal database, mai da un valore arrivato dal browser.
- Una operazione, una transazione (V13): i due punti dentro la transazione usano `tx`.
- Ponytail: nessun campo nuovo nel database, nessuna migrazione, nessun tipo esportato in più del necessario. Il corpo dell'errore si compone al volo.
- Il working tree ha **già modifiche non committate**: non fare `git stash`, `git checkout`, `git reset`.

## Prove

- `npx tsc --noEmit` in `app/backend`: 0 errori.
- `test/documenti.spec.ts`: il test del doppione (~riga 117) deve controllare anche che `pratica` sia `null` (file ancora in coda) e il messaggio resti quello attuale. Aggiungi **un** caso: una riga `documenti_in_arrivo` con `abbinato_pratica_id` valorizzata (basta un `update` via `db` nel test, come già si fa per `stato: 'scartato'`), ricaricando lo stesso file → 409 con `pratica: { id, numero }` uguali alla pratica. Scegli una pratica già presente nella fixture di quel file.
- Lancia `npm test -- documenti.spec.ts` (database `decobrands_test`): 0 KO. Se il database di prova non risponde, **non** crearlo né migrarlo: scrivilo nel resoconto e fermati lì.
- Non lanciare Playwright: le schermate le fa l'orchestratore.

## Resoconto

Scrivi `strumenti/opencode/resoconto-documento-doppione-pratica.md` con: file toccati, diff sintetico, corpo 409 finale nei tre casi, esito di `tsc` e di `jest`, dubbi. Aggiungi la sezione **Da documentare** con una riga pronta per spec §19 (D-nn: cosa, perché, dove) e il ritocco di testo per la §6.5/§4.2.12 se la spec descrive l'errore del doppione.
