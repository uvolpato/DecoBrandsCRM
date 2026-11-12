# Resoconto pacchetto 0-01 — Il file di un bollettino non si scarta e non si abbina a una pratica

Data: 12/11/2026 · Rilievo: A3-02 (P1) · Esecutore: DeepSeek V4

## Cosa ho fatto

Il rilievo era ancora aperto: in `documenti.ts` `scarta` e `registra` non guardavano
`abbinato_bollettino_id`, e il database non lo impediva.

1. `app/backend/src/documenti.ts:813` (`scarta`, blocco DocumentiController): dopo il controllo
   dello stato, se `abbinato_bollettino_id` non è null → `409` «Il file è il PDF di un bollettino».
   Commento `// il PDF di un bollettino non si scarta: la pulizia degli scartati cancellerebbe il suo file (D-74)`.
2. `app/backend/src/documenti.ts:1200` (`registra`, blocco `if (b.arrivo_id)`, dopo il controllo
   dello stato): se `a.abbinato_bollettino_id` non è null → `409` con lo stesso testo. Copre sia
   `POST /pratiche/:id/documenti` (`crea`) sia `POST /documenti/:id/abbina` (`abbina`), che passano
   entrambi da `registra`. Commento `// D-54, D-74`.
3. Migrazione nuova `app/backend/prisma/migrations/20261113090000_bollettino_file/migration.sql`, due CHECK
   (come da correzione puntuale):
   - `documenti_in_arrivo_scarto_libero_check`: `stato <> 'scartato' OR (abbinato_bollettino_id IS NULL AND abbinato_pratica_id IS NULL)`;
   - `documenti_in_arrivo_un_abbinamento_check`: `abbinato_bollettino_id IS NULL OR abbinato_pratica_id IS NULL`.
   Prima di scriverli ho controllato il seed: gli unici `stato = 'scartato'` sono `D.scartati`
   (`prisma/seed/00-base.ts:242-246`) e nascono senza `abbinato_pratica_id` né `abbinato_bollettino_id`
   → nessuna riga viola i CHECK. Il database di prova era pulito.
4. Prove nuove:
   - `test/bollettini.spec.ts` (test «il PDF passa dal canale comune e resta legato al bollettino»):
     `POST /documenti/:id/scarta` → 409 e stato invariato; `POST /documenti/:id/abbina`
     (`tipo: conferma`, pratica dello stesso fornitore) → 409 con il testo esatto e nessun legame a pratica.
   - `test/vincoli.spec.ts` (describe «valori ammessi»): INSERT con bollettino legato → poi
     `UPDATE … stato = 'scartato'` viola `documenti_in_arrivo_scarto_libero_check` (SQLSTATE 23514),
     `UPDATE … abbinato_pratica_id` viola `documenti_in_arrivo_un_abbinamento_check`, INSERT diretto
     `scartato` + pratica viola il primo CHECK; l'abbinamento a una pratica sola passa.

Non ho deciso lo stato del file legato al bollettino (resta `in_coda`, fuori da *da controllare* solo
perché `oggi.ts` già esclude i file con `abbinato_bollettino_id`): la scelta è di A4/Ugo, come dice il pacchetto.

## Prove lanciate (database `decobrands_test_0_01`, cancellato alla fine)

| Prova | Esito |
|---|---|
| `npx prisma migrate deploy` sul database di prova | 20 migrazioni applicate, nessuna pendente |
| `npx jest test/bollettini.spec.ts test/vincoli.spec.ts test/documenti.spec.ts test/seed.spec.ts` | **4 suite, 94 prove, 0 KO** |
| `npx tsc --noEmit` | 0 errori |
| `npx prisma validate` / `npx prisma generate` | schema valido, client generato |
| `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` | **differenze pre-esistenti, non mie** (vedi sotto) |
| `git diff --name-only` + `git status --short` | solo i file ammessi (più due file non miei già in working copy: `doppioni-anagrafica-integra.xlsx`, `prototipo-alternativo/.tmp-soggetti.png`) |

### Deriva dello schema trovata (non toccata)

`prisma migrate diff` dal database di prova (già migrato) allo schema elenca:

- `DROP INDEX "soggetti_cf_norm_idx"`, `DROP INDEX "soggetti_piva_norm_idx"`;
- `ALTER TABLE "soggetti" ALTER COLUMN "codice" SET DEFAULT …`;
- tre `RENAME INDEX` su `interscambio_storico_*` (nomi corti nel database, nomi lunghi nello schema).

Non vengono dalla mia migrazione (i CHECK non entrano nel diff di Prisma) e riguardano migrazioni del
lavoro f7 (`anagrafica_soggetti`, `storico_legami`): **resta aperto** per chi ha in mano quei file
(pacchetto 0-03 sugli indici o documentazione di fine onda). Non ho toccato `schema.prisma` né le
migrazioni altrui.

## Prove nel browser da lanciare a fine onda

- `strumenti/prove/app_documenti.py`: aprire un file di un bollettino in *Documenti*, provare «Scarta» →
  la finestra non deve chiudersi con un errore tecnico ma mostrare «Il file è il PDF di un bollettino»;
  provare l'abbinamento a una pratica dallo stesso file → stesso messaggio; il file resta in elenco.
- `strumenti/prove/app_scartati.py`: nessun PDF di bollettino fra gli scartati dopo un giro.

## Da documentare (per il pacchetto documentazione)

**Riga §19 (nuova decisione: numero da assegnare dal pacchetto documentazione — in §19 l'ultimo usato è
D-113 e D-139 è già deciso per un altro pacchetto; attenzione, in spec esistono due righe `D-106`, da
rinumerare a parte):**

| D-nn | 12/11/2026 | **Il PDF di un bollettino non si scarta e non si abbina a una pratica.** Un file in arrivo legato a un bollettino (`abbinato_bollettino_id`) non passa da `POST /api/documenti/:id/scarta` né entra in una pratica con `POST /api/documenti/:id/abbina` o `POST /api/pratiche/:id/documenti`: 409 «Il file è il PDF di un bollettino». Due CHECK nel database: uno scarto non ha legami, e un file non è insieme bollettino e documento di pratica. | Lo scarto porta il file nella pulizia notturna, che dopo i giorni di conservazione cancella riga e file: il bollettino perderebbe il suo PDF (perdita di dati). Lo stesso file come fattura di una pratica farebbe contare due volte lo stesso documento. Le due rotte da sole non bastano: il vincolo sta nel database. | Ugo (collaudo A3-02) | §7.9, §7.16, §15.2.4, `src/documenti.ts`, migrazione `bollettino_file` |

**Riga *Perché* nella sezione della spec** (§7.9 *Documenti*, dopo lo scarto):
«Un file legato a un bollettino non si scarta e non si abbina a una pratica (D-nn): lo scarto lo
manderebbe nella pulizia che cancella i file dopo i giorni di conservazione, e il bollettino resterebbe
senza il suo PDF; il database lo impedisce con due CHECK.»

**Guida (`app/frontend/lib/guida.ts`)** — nella voce dei Documenti, *Da sapere*:
«Il PDF di un bollettino resta del bollettino: non si scarta (la pulizia degli scartati lo
cancellerebbe) e non si abbina a una pratica. Se serve un altro file, caricalo dal canale.»

**Piano (`piano-lavoro-crm.md`)**: attività «Vincoli del file di un bollettino (A3-02)» nella fase F6,
0,5 h **da approvare** (migrazione + due rotte + prove).

**README**: nulla.
