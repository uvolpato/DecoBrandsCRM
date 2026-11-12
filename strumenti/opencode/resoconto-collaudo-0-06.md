# Resoconto pacchetto 0-06 — Schema e database allineati (deriva dei soggetti e dello storico)

Data: 12/11/2026 · Rilievo: O0-12 (P3) · Esecutore: DeepSeek V4 · Correlati: D-102, F1-A8a/b, F1-A12

## Cosa ho fatto

Tutto risolto **dallo schema**: nessuna migrazione nuova, nessun `DROP`/`RENAME` eseguito, nessun dato toccato.

1. `app/backend/prisma/schema.prisma`, modello `interscambio_storico`: `map:` con i nomi che esistono già
   nel database, presi dalla migrazione `20261112090000_storico_legami`:
   - `@@unique([fonte, cliente_legacy_id, fornitore_legacy_id], map: "interscambio_storico_fonte_cliente_fornitore_key")`
   - `@@index([fornitore_piva, cliente_codice_fornitore], map: "interscambio_storico_fornitore_piva_codice_idx")`
   - `@@index([cliente_codice_fornitore], map: "interscambio_storico_cliente_codice_idx")`
   - `@@index([stato], map: "interscambio_storico_stato_idx")` (già allineato per nome, mappato per coerenza)
   Così `migrate diff` non propone più le tre `RENAME INDEX`.
2. `soggetti`: aggiunti i due indici che la migrazione `20261108090000_anagrafica_soggetti` crea e che lo
   schema non esprimeva, con il nome già in uso:
   `@@index([piva_norm], map: "soggetti_piva_norm_idx")` e `@@index([cf_norm], map: "soggetti_cf_norm_idx")`.
   Non sono parziali (le unicità parziali `soggetti_piva_norm_key` / `soggetti_cf_norm_key` sono un'altra cosa
   e restano nella migrazione): Prisma li esprime, quindi lo schema è la verità e nessuno li toglierà più.
   Servono alla ricerca e a `controlloDuplicati` (D-102).
3. `soggetti.codice`: allineato il `dbgenerated` alla forma che il database conserva davvero, cioè
   `('C'::text || lpad((nextval('soggetti_codice_seq'::regclass))::text, 6, '0'::text))`, presa da
   `information_schema.columns` (la migrazione scrive `('C' || lpad(nextval(...)::text, 6, '0'))`: Postgres
   aggiunge i cast e Prisma confronta il testo). Stessa funzione, stessi codici già emessi: nessun codice cambia.

Dopo `npx prisma format`, che aveva riallineato mezza dozzina di modelli estranei al rilievo, ho riportato il
file alla forma di `HEAD` e riapplicato solo le tre modifiche: il diff è di 10 righe aggiunte e 5 tolte, non un
reformat del file (altri pacchetti lavorano in parallelo sullo stesso file).

## Prove lanciate (database `decobrands_test_0_06`, proprio, cancellato alla fine)

| Prova | Esito |
|---|---|
| database nuovo (`CREATE DATABASE decobrands_test_0_06`) → `npx prisma migrate deploy` | 25 migrazioni applicate |
| `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` | **vuoto** ("This is an empty migration") |
| `npx prisma validate` | schema valido |
| `npx prisma generate` | client generato (v7.8.0) |
| `npx tsc --noEmit` | 0 errori |
| `npx jest test/soggetti.spec.ts test/storico.spec.ts test/vincoli.spec.ts` | **3 suite, 69 prove, 0 KO** (34 s) |

Il `migrate diff` è stato rifatto dopo ogni passaggio (prima vuoto, poi dopo `prisma format`, poi dopo il
ripristino della formattazione): sempre vuoto. La prova con database nuovo è stata ripetuta cancellando e
ricreando `decobrands_test_0_06` dopo la modifica allo schema: deploy + diff vuoto.

Nota: l'intera suite `vincoli.spec.ts` stampa il solito `DeprecationWarning` di `pg` ("client.query() when the
client is already executing"), preesistente e già segnalato nel resoconto 0-05; non viene da questo pacchetto.

## Review chiesta dal pacchetto (skill caricate davvero)

**`prisma-cli`** (usata per `validate`, `generate`, `migrate deploy`, `migrate diff --from-config-datasource`):
nessuna operazione distruttiva lanciata; `migrate dev` non è stato usato, così non si genera una migrazione.

**`postgresql-code-review`** (sullo schema e sugli indici):
- Gli indici mappati non sono parziali: `@@index` è la forma giusta; le unicità parziali restano in SQL come
  prima, perché Prisma non le esprime. Nessuna perdita di indice.
- `dbgenerated` copiato verbatim da `information_schema`: è l'unico modo di non far divergere Prisma su un
  default con cast; la sequenza resta l'unica sorgente dei codici.
- Nessuna migrazione = nessun `ACCESS EXCLUSIVE`, nessuna riscrittura di tabella, nessun dato toccato.

**`ponytail-review`** (correttezza, rischio, snellezza):
- La correzione sono 5 righe di schema; nessun codice nuovo, nessun file nuovo oltre il resoconto.
- Rischio residuo: se in futuro si cambia il nome di un indice nel database, lo schema va aggiornato a mano
  (il `map` lo rende esplicito). È il comportamento voluto dal rilievo.
- Verdetto: **spedire**.

## Da documentare

Nulla: non cambia nessuna regola né l'interfaccia. Il §19 non va toccato; il registro non ha una decisione da
aggiungere (è un allineamento tecnico a D-102). Nessuna riga *Perché*, nessuna guida, nessuna ora di piano.

## Cose aperte

- La deriva era solo di testo (nomi degli indici e forma del default): la correzione non ne crea altra. Se un
  giorno `migrate dev` proporrà comunque una migrazione su `soggetti` o `interscambio_storico`, vuol dire che
  qualcuno ha cambiato un database a mano: fermarsi e guardare prima di applicarla.
- `decobrands_db` non è stato aperto (il pacchetto lo vieta): la verifica è sul database nuovo di prova.
