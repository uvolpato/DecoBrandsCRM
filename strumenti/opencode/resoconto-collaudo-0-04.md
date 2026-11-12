# Resoconto pacchetto 0-04 — Indici trigram per la ricerca delle Pratiche

Data: 12/11/2026 · Rilievo: A7-24 (P3, ipotesi) · Esecutore: DeepSeek V4

## Cosa ho fatto

1. `app/backend/prisma/migrations/20261113130000_ricerca_trgm/migration.sql`:
   - `CREATE EXTENSION IF NOT EXISTS pg_trgm` (riuscita con l'utente `decobrands`, che è proprietario del
     database di prova: nessun intervento di un amministratore);
   - quattro indici `GIN (… gin_trgm_ops)` su `ordini_fornitore_testata.numero_ordine`,
     `ordini_fornitore_documenti.numero`, `clienti_versioni.ragione_sociale`, `fornitori_versioni.ragione_sociale`,
     con i nomi che Prisma si aspetta (`<tabella>_<colonna>_idx`), così `migrate diff` non vede differenze.
2. `app/backend/prisma/schema.prisma`: i quattro indici descritti come
   `@@index([colonna(ops: raw("gin_trgm_ops"))], type: Gin)` con commento `// A7-24` — senza, `prisma migrate diff`
   li avrebbe voluti cancellare. Nessun cambio di codice: la query di `elenco` resta quella.

## Prova EXPLAIN (database di prova 0-04, volume finto: 20.000 testate, 60.000 documenti, 200 clienti)

Prima la ricerca `q='Cliente 137'` (colpisce ~100 pratiche su 20.000) **senza** indici trigram, poi **con**:

| Misura | Senza trigram | Con trigram |
|---|---|---|
| ricerca completa dell'elenco (4 colonne in OR, valore poco selettivo) | 89,9 ms, 1136 buffer | 49,5 ms, 358 buffer |
| EXISTS sui documenti (SubPlan) | Seq Scan, 40,5 ms, 800 buffer | **Bitmap Index Scan** su `ordini_fornitore_documenti_numero_idx`, 0,09 ms, 22 buffer |
| solo `numero_ordine ILIKE '%137%'` (140 righe) | Seq Scan, 12,7 ms, 328 buffer | **Bitmap Index Scan** su `ordini_fornitore_testata_numero_ordine_idx`, 0,5 ms, 28 buffer |

Cosa dice: l'indice trigram serve e si vede, soprattutto sul `EXISTS` dei documenti (da 40 ms a 0,09 ms) e su una
ricerca per numero (da 12,7 a 0,5 ms). Sulla ricerca completa il planner **non** usa l'indice trigram sulla testata:
il predicato è un `OR` fra colonne di tabelle diverse e deve comunque leggere tutte le testate per gli altri rami;
il guadagno viene dal `EXISTS`. **Resta aperto** (ipotesi A7, fuori da questo pacchetto): se con i dati veri la
ricerca è ancora lenta, il passo successivo è una colonna di ricerca unica (numero + cliente + fornitore) con il suo
indice trigram, oppure `pg_trgm` + `similarity` con soglia — va deciso con una misura sui dati veri, non qui.

## Prove lanciate (database `decobrands_test_0_04`, cancellato alla fine)

| Prova | Esito |
|---|---|
| `npx prisma migrate deploy` sul database di prova (fatto due volte, da database ricreato) | 24 migrazioni applicate, nessuna pendente |
| `CREATE EXTENSION pg_trgm` con l'utente `decobrands` | riuscita |
| `npx jest test/pratiche.spec.ts test/seed.spec.ts` | **2 suite, 23 prove, 0 KO** |
| `npx tsc --noEmit` | 0 errori |
| `npx prisma validate` / `npx prisma generate` | schema valido, client generato |
| `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` | nessuna differenza sulle mie estensione/indici; restano le **differenze pre-esistenti** già segnalate nei resoconti 0-01…0-03 (`soggetti_cf_norm_idx`, `soggetti_piva_norm_idx`, default di `soggetti.codice`, tre `RENAME INDEX` su `interscambio_storico_*`) |
| `git status --short` | solo i file ammessi (più `doppioni-anagrafica-integra.xlsx` e `prototipo-alternativo/.tmp-soggetti.png`, non miei, già presenti) |

## Prove nel browser da lanciare a fine onda

- `strumenti/prove/app_pratiche.py`: campo di ricerca delle Pratiche, `gri` → risultati giusti e tempi umani con
  il seme normale (la prova non misura i tempi: la misura vera è l'`EXPLAIN` sopra).
- `strumenti/prove/app_pratiche.py`: ricerca per numero parziale (`2026/04`) → risultati corretti (l'indice trigram
  non deve cambiare i risultati, solo i tempi).

## Da documentare (per il pacchetto documentazione)

**Riga §19 (proposta, numero da assegnare dal pacchetto documentazione: in �19 l'ultimo usato � D-113 e D-139 � gi� deciso per un'altro pacchetto):**

| D-nn | 12/11/2026 | **La ricerca delle Pratiche ha gli indici trigram.** Estensione `pg_trgm` e quattro indici `GIN (gin_trgm_ops)` su `ordini_fornitore_testata.numero_ordine`, `ordini_fornitore_documenti.numero`, `clienti_versioni.ragione_sociale`, `fornitori_versioni.ragione_sociale`. Nel 2026-11 `pg_trgm` è *trusted*: la crea il proprietario del database, non serve un amministratore. | La ricerca usa `ILIKE '%testo%'` e con il `%` iniziale i b-tree non servono: si leggeva tutta la tabella. Misura su 20.000 testate e 60.000 documenti: il `EXISTS` sui documenti scende da 40 ms a 0,09 ms, la ricerca per numero da 12,7 a 0,5 ms. Sulla testata il planner non usa ancora il trigram (OR fra tabelle diverse): se i dati veri lo chiedono, si valuta una colonna di ricerca unica. | Ugo (collaudo A7-24) | §7.5, §4.2.7, `prisma/schema.prisma`, migrazione `ricerca_trgm` |

**Riga *Perché* nella sezione della spec** (§7.5 *Pratiche*, ricerca e filtri): «La ricerca è `ILIKE '%…%'` su
numero, cliente, fornitore e numero dei documenti: per questo `numero_ordine`, `numero` dei documenti e le due
`ragione_sociale` hanno un indice trigram (D-nn). Il `EXISTS` sui documenti è la parte che ne guadagna di più.»

**Guida (`app/frontend/lib/guida.ts`)**: nulla (non si vede).

**Piano (`piano-lavoro-crm.md`)**: attività «Indici trigram della ricerca Pratiche (A7-24)», fase F2, 1 h
**da approvare** (migrazione, indici nel modello Prisma, misura `EXPLAIN`).

**README**: se si documenta il database, aggiungere che serve l'estensione `pg_trgm` (creata dalla migrazione).
