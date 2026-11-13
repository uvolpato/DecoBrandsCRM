# Resoconto collaudo · Onda 1 · Pacchetto 1-09 — Pulizia degli scartati senza cancellare un documento recuperato

Data: 12/11/2026 · Esecutore: DeepSeek V4 Flash · Rilievi: **A3-04**, **A4-09** (stesso difetto, una correzione).

## Esito

Entrambi i rilievi **corretti** con la correzione unica indicata nella *Nota del pacchetto*. Nessun file fuori
dagli ammessi toccato, nessun commit.

## Cosa ho fatto

### A3-04 e A4-09 — la pulizia notturna non cancella più uno scartato recuperato nel frattempo (D-74)

Il difetto era ancora presente nel codice attuale (f7 non l'aveva toccato): `findMany` degli id senza blocco,
poi `deleteMany({ id: { in } })` che ignorava lo stato.

- `app/backend/src/sistema.ts:419-429` (`pulisciScartati`): le due istruzioni sono diventate una sola, come da
  *Correzione puntuale*:

  ```sql
  DELETE FROM documenti_in_arrivo
  WHERE stato = 'scartato' AND scartato_il < ${limite}
  RETURNING id, file_percorso
  ```
  con `tx.$queryRaw` (transazione già esistente, V13). Lo stato si ricontrolla **dentro il WHERE al momento
  della cancellazione**: un documento recuperato (`stato = 'da_controllare'`) o rianimato dalla casella
  (`in_coda`) nel frattempo non entra più nella DELETE e resta con il suo file. Anomalie della lettura e
  rimozione dei file restano sui soli id restituiti da `RETURNING`, dopo il commit. Nessuna migrazione, nessun
  cambio di schema.

  Perché è corretto anche sotto la corsa vera: `recupera` (`scartati.ts:134`) blocca la riga con `SELECT … FOR
  UPDATE`. Se vince il recupero, la DELETE in READ COMMITTED rivaluta la riga dopo il lock e la salta; se vince
  la DELETE, il recupero trova la riga sparita e risponde 404. In nessun caso il file viene rimosso per un
  documento che non è più scartato.

- `app/backend/test/scartati.spec.ts:76-100`: helper `dbConRecupero(id)`, un `PrismaService` finto che, un
  attimo **prima** della cancellazione (sia `deleteMany` del vecchio codice sia `$queryRaw` della correzione),
  riporta il documento `in_coda` con `db` fuori transazione. Rende certa la corsa invece di sperarla.
- `app/backend/test/scartati.spec.ts:237-245`: prova «non elimina uno scartato recuperato fra la lettura e la
  cancellazione (A3-04, A4-09)» — scartato di 20 giorni con `scartati_giorni = 10`; attesi `0` eliminati, riga
  ancora presente e file ancora su disco.
- Ho verificato che la prova **coglie davvero il difetto**: rimettendo temporaneamente il vecchio
  `findMany` + `deleteMany` la prova fallisce (`Expected: 0, Received: 1`), poi ho ripristinato la correzione
  (controllato con `grep`: la DELETE è al suo posto) e la prova torna verde.

## Prove eseguite

Database di prova `decobrands_test_1_09` creato con le variabili del pacchetto, `DATABASE_URL` di prova per
`prisma migrate deploy`, cartella documenti in `TMP/TEMP`, poi **cancellato**.

- `cd app/backend && npx jest test/sistema.spec.ts test/scartati.spec.ts` → **2 suite, 31 prove, 0 KO**
  (eseguito due volte: verde in entrambe).
- Un solo giro intermedio aveva fatto fallire la prova di tempo di `sistema.spec.ts` («una prova lenta non
  trattiene la risposta oltre il tempo massimo», 0 controlli scritti invece di 4): è la prova nota sensibile ai
  tempi quando due suite girano insieme sullo stesso database; rilanciata da sola → 22/22 verde, e il giro
  completo successivo è stato verde. Nessuna modifica a `sistema.spec.ts`.
- `cd app/backend && npx tsc --noEmit` → **0 errori**.
- `git status --short` / `git diff --name-only`: fra i miei file ho toccato solo
  `app/backend/src/sistema.ts`, `app/backend/test/scartati.spec.ts` e questo resoconto. Gli altri file
  modificati o non tracciati che si vedono in `git status` sono lavoro degli altri pacchetti in parallelo:
  **non li ho toccati**.
- Database `decobrands_test_1_09` **cancellato** (`DROP DATABASE`) a fine lavoro.

## Prove nel browser da lanciare a fine onda

Nessuna prova nuova: il difetto è solo nel backend, senza effetto visibile (i file e le righe eliminate sono
gli stessi quando non c'è la corsa). Le prove esistenti da rilanciare, invariate:

- `python strumenti/prove/app_scartati.py <suffisso> <cartella schermate>` — elenco, recupero, eliminazione
  definitiva e messaggi d'errore;
- `python strumenti/prove/app_sistema.py <suffisso> <cartella schermate>` — Stato del sistema e manutenzione;
- `python strumenti/prove/app_flusso.py <suffisso> <cartella schermate>` — flusso completo (regressione).

## Cose aperte

- Nessuna correzione contro il §19: D-74 resta come scritta (la pulizia non scrive eventi, è manutenzione).
- Nota per chi rilegge: il difetto toccava anche la rianimazione di uno scartato da parte della casella
  (`riceviDocumento`, `A4-09`); la stessa DELETE con lo stato nel `WHERE` la copre, senza toccare `documenti.ts`
  (file vietato a questo pacchetto).

## Da documentare (per il pacchetto documentazione dell'onda)

### §19 — riga D-nn

**Nessuna nuova decisione.** È una correzione di correttezza dentro D-74 (la pulizia notturna è manutenzione e
non scrive eventi); la regola non cambia. Non serve una riga nuova nel registro.

### Spec §7.16 — riga *Perché*

Nella voce «Pulizia notturna» (§7.16, e la stessa frase in §8.1 dove si parla di conservazione degli scartati)
chiarire: «*Perché:* la cancellazione ricontrolla lo stato nella stessa istruzione (`DELETE … WHERE stato =
'scartato' AND scartato_il < … RETURNING id, file_percorso`), così uno scartato recuperato o rianimato dalla
casella mentre gira la pulizia non viene eliminato con il suo file.»

### Guida in linea (`app/frontend/lib/guida.ts`) e prototipo (`prototipo-alternativo/assets/guida.js`)

**Nessuna modifica**: non cambia niente per chi usa l'app (stessi documenti, stessi giorni di conservazione).

### Piano (`piano-lavoro-crm.md`)

**Nessuna voce nuova**: la correzione sta dentro F5-A7/F5-A5 già previste; se il controllo di fine onda vuole
tracciarla, riga «pulizia degli scartati: DELETE condizionata allo stato (A3-04, A4-09)» con 0,5 h **da
approvare**, fatte.

### README

**Nessuna modifica**: `app/README.md` non descrive la pulizia notturna. `prototipo-alternativo/LEGGIMI.md`:
nessuna modifica (il prototipo non ha pulizia reale, dimostra solo i dati di prova).
