# Resoconto pacchetto 0-03 — Numero della pratica UNIQUE e indici sulle chiavi esterne

Data: 12/11/2026 · Rilievi: A3-10, A3-11 (P3) · Esecutore: DeepSeek V4

## Cosa ho fatto

### A3-10 — numero della pratica unico

- `app/backend/prisma/migrations/20261113110000_numero_pratica_unico/migration.sql`:
  `CREATE UNIQUE INDEX "ordini_fornitore_testata_numero_ordine_key" ON "ordini_fornitore_testata"("numero_ordine");`
- `app/backend/prisma/schema.prisma` (`model ordini_fornitore_testata`): `@@unique([numero_ordine])` con commento `// A3-10`.
- Controllo dei doppioni prima della migrazione: nel seed `app/backend/prisma/seed/dati-prova.json` le 54 pratiche
  hanno numeri tutti diversi (0 doppi); il database di prova nasceva vuoto. Nessun'altra via crea pratiche:
  `nuovaPratica` è l'unica e calcola `OF/AAAA/NNN` sotto `pg_advisory_xact_lock`.
- Prova in `app/backend/test/vincoli.spec.ts`, describe «documenti e liquidazione (D-34)»: INSERT di una seconda
  pratica con `'O1'` → viola `ordini_fornitore_testata_numero_ordine_key` (SQLSTATE 23505).

### A3-11 — indici sulle chiavi esterne delle tabelle grandi

- `app/backend/prisma/migrations/20261113120000_indici_fk/migration.sql`: cinque `CREATE INDEX`
  - `documenti_campi_corretto_da_idx` su `documenti_campi("corretto_da")`
  - `documenti_in_arrivo_utente_id_idx` su `documenti_in_arrivo("utente_id")`
  - `documenti_in_arrivo_scartato_da_idx` su `documenti_in_arrivo("scartato_da")`
  - `bollettini_righe_deciso_da_idx` su `bollettini_righe("deciso_da")`
  - `ordini_fornitore_testata_agente_id_idx` su `ordini_fornitore_testata("agente_id")`
- `app/backend/prisma/schema.prisma`: `@@index([agente_id])` in `ordini_fornitore_testata`, `@@index([deciso_da])` in
  `bollettini_righe`, `@@index([utente_id])` e `@@index([scartato_da])` in `documenti_in_arrivo`,
  `@@index([corretto_da])` in `documenti_campi`. Le altre FK senza indice (tabelle piccole) restano come sono, come
  dice il pacchetto.

## Prove lanciate (database `decobrands_test_0_03`, cancellato alla fine)

| Prova | Esito |
|---|---|
| `npx prisma migrate deploy` sul database di prova | 23 migrazioni applicate, nessuna pendente |
| `npx prisma migrate status` | «Database schema is up to date!» |
| indici presenti nel database di prova (query su `pg_indexes`) | tutti e 6 presenti (unique + 5 indici) |
| `npx jest test/vincoli.spec.ts test/utenti.spec.ts test/seed.spec.ts test/documenti-pratica.spec.ts` | **4 suite, 79 prove, 0 KO** |
| `npx tsc --noEmit` | 0 errori |
| `npx prisma validate` / `npx prisma generate` | schema valido, client generato |
| `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` | nessuna differenza sulle mie UNIQUE/indici; restano le **differenze pre-esistenti** già segnalate nei resoconti 0-01 e 0-02 (`soggetti_cf_norm_idx`, `soggetti_piva_norm_idx`, default di `soggetti.codice`, tre `RENAME INDEX` su `interscambio_storico_*`) |
| `git status --short` | solo i file ammessi (più `doppioni-anagrafica-integra.xlsx` e `prototipo-alternativo/.tmp-soggetti.png`, non miei, già presenti) |

## Prove nel browser da lanciare a fine onda

Nessuna propria: cambiare un indice o un vincolo non si vede nell'interfaccia. Valgono le prove di fine onda:
- `strumenti/prove/app_pratiche.py`: aprire due pratiche e controllare che il numero `OF/AAAA/NNN` non si ripeta
  nemmeno creando ordini in fretta da due finestre (il 409 del numero doppio non deve apparire in uso normale).
- `strumenti/prove/app_utenti.py`: eliminare un utente di prova senza che la pagina si blocchi (gli indici rendono
  l'operazione immediata anche con molti documenti).

## Da documentare (per il pacchetto documentazione)

**Riga §19 (proposta, numero da assegnare dal pacchetto documentazione: in �19 l'ultimo usato � D-113 e D-139 � gi� deciso per un'altro pacchetto):**

| D-nn | 12/11/2026 | **Il numero della pratica è UNIQUE e le chiavi esterne delle tabelle grandi hanno il loro indice.** `CREATE UNIQUE INDEX ordini_fornitore_testata_numero_ordine_key` su `numero_ordine` (resta il blocco consultivo di `nuovaPratica`, che ora serve solo a evitare l'errore); indici su `documenti_campi.corretto_da`, `documenti_in_arrivo.utente_id`, `documenti_in_arrivo.scartato_da`, `bollettini_righe.deciso_da`, `ordini_fornitore_testata.agente_id`. Le FK senza indice su tabelle piccole si lasciano. | L'unicità di `OF/AAAA/NNN` si reggeva solo sul blocco consultivo: un seed, un ricalcolo o un import potevano scrivere due numeri uguali, con i documenti archiviati nella stessa cartella e le ricerche confuse. Senza indice, eliminare un utente faceva scorrere `documenti_campi` (decine di righe per documento) dentro la transazione che tiene il blocco degli utenti. | Ugo (collaudo A3-10, A3-11) | §4.2.7, §4.2.11, `prisma/schema.prisma`, migrazioni `numero_pratica_unico` e `indici_fk` |

**Riga *Perché* nella sezione della spec** (§4.2.7 *Pratiche*): «Il numero `OF/AAAA/NNN` è UNIQUE nel database
(D-nn): il blocco consultivo di `nuovaPratica` resta, ma non è più l'unica difesa. Le FK che crescono
(`documenti_campi`, `documenti_in_arrivo`, `bollettini_righe`, `ordini_fornitore_testata.agente_id`) hanno un indice,
così eliminare un utente o un agente non scorre le tabelle dentro la transazione.»

**Guida (`app/frontend/lib/guida.ts`)**: nulla da aggiungere (regola tecnica, non si vede).

**Piano (`piano-lavoro-crm.md`)**: attività «Unique del numero pratica e indici delle FK (A3-10, A3-11)», fase F2,
0,5 h **da approvare**.

**README**: nulla.
