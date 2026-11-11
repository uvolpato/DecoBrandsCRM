# Collaudo · Onda 0 · Pacchetto 0-01 — Il file di un bollettino non si scarta e non si abbina a una pratica

Data: 08/11/2026 · **Esecutore: DeepSeek V4** · Gravità del pacchetto: **P1** · Rilievi: A3-02 · Piano: `strumenti/collaudo/piano-correzioni.md`.

Si lancia **dopo** il commit del lavoro f7 e la chiusura dell'onda precedente. Dipende da: —.

## Contesto e regole del progetto

- **Stack**: frontend Next.js 16 + React 19 + TypeScript (`app/frontend`), backend NestJS 11 + Prisma 7 +
  PostgreSQL (`app/backend`, database proprio `decobrands_db`), stile `app/frontend/app/stile/stile.css` copiato dal
  prototipo ufficiale `prototipo-alternativo/` (D-24), Public Sans, niente Bootstrap. Node 24.
- **Leggi prima `CLAUDE.md`** (radice) per intero, poi le righe di `specifica-crm-provvigioni.md` sulle decisioni
  citate nei rilievi (§19, registro D-nn).
- **Prima di leggere codice**: `graphify query "<domanda>"` (grafo in `graphify-out/`), poi solo le righe trovate.
  **Non** lanciare `graphify update .`: altri pacchetti lavorano in parallelo, il grafo lo aggiorna il controllo di fine onda.
- ⚠ **V12 — tutto sul backend**: ogni calcolo (provvigioni, totali, differenze, stati) e ogni operazione sensibile si
  fa sul server dal database; il browser manda solo scelte (id, valori digitati, motivo); il server ricarica,
  ricontrolla, ricalcola e non salva mai un valore calcolato arrivato dal browser.
- ⚠ **V13 — una operazione, una transazione**: se scrivi su più tabelle o più righe legate, una sola
  `prisma.$transaction(async (tx) => …)`, tutto da `tx` (registro compreso); chiusure, verifiche e abbinamenti
  bloccano la riga con `SELECT … FOR UPDATE`; email e lettura dei documenti dopo il commit, il file su disco prima.
- **Italiano** semplice in codice, commenti, messaggi e interfaccia (niente parole inglesi inutili). Nei punti non
  ovvi un commento breve che rimanda alla decisione: `// D-51 §19`, `// V13`.
- Le prove nel browser cercano le schede con `.schede-barra [role=tab]` (anche i segmenti hanno `role=tab`).
- Non c'è telefono (D-44): si prova a 1440 e 768 px.
- I numeri di riga dei report sono del 08/11 mattina: dopo il collaudo è stato committato altro lavoro (f7).
  **Rileggi il codice attuale.** Se un rilievo risulta già corretto, scrivilo nel resoconto e non cambiare nulla.

## Rilievi da correggere (testo dei report del collaudo; i rilievi U* nascono dalle decisioni di Ugo)

### A3-02 — Il file di un bollettino si può scartare (e poi cancellare) o abbinare a una pratica
- Gravità: P1
- Dove: `app/backend/src/bollettini.ts:163` (carica), `app/backend/src/documenti.ts:686` (`scarta`), `documenti.ts:1056` (`registra`), `app/backend/src/sistema.ts:419` (`pulisciScartati`)
- Problema: legare un documento in arrivo a un bollettino scrive solo `abbinato_bollettino_id`; lo stato resta `in_coda`/`da_controllare`. `scarta` e `registra` controllano solo lo stato, non `abbinato_bollettino_id`. Nessun vincolo nel database lo impedisce.
- Scenario: PDF del bollettino di agosto caricato e legato al bollettino 8/2026; in Documenti resta «da controllare»; un operatore lo scarta («già caricato») → dopo 90 giorni `pulisciScartati` cancella riga e file: il bollettino perde il suo PDF (perdita di dati). Oppure lo abbina come fattura a una pratica: lo stesso file è bollettino e fattura.
- Correzione puntuale:
  - `documenti.ts` `scarta` e `registra` (blocco `if (b.arrivo_id)`): se `abbinato_bollettino_id` non è null → 409 «Il file è il PDF di un bollettino».
  - Migrazione nuova (onda 0): `ALTER TABLE documenti_in_arrivo ADD CONSTRAINT documenti_in_arrivo_scarto_libero_check CHECK (stato <> 'scartato' OR (abbinato_bollettino_id IS NULL AND abbinato_pratica_id IS NULL));` e `… CHECK (abbinato_bollettino_id IS NULL OR abbinato_pratica_id IS NULL);` (prima verificare che il seed non li violi).
  - Lo stato del file legato al bollettino (lasciarlo leggere o portarlo ad `abbinato`) e la sua uscita dall'elenco *da controllare* li decide A4/Ugo: qui solo il blocco.
- Prova che la verifica: `app/backend/test/bollettini.spec.ts` (carica con `arrivo_id`, poi `POST /documenti/:id/scarta` → 409; abbina a pratica → 409); `app/backend/test/vincoli.spec.ts` (UPDATE diretto a `scartato` con bollettino → errore 23514).
- Esecutore: DeepSeek V4 — migrazione e vincoli.
- File toccati: `app/backend/prisma/migrations/<nuova>_bollettino_file/migration.sql`, `app/backend/src/documenti.ts`, `app/backend/test/bollettini.spec.ts`, `app/backend/test/vincoli.spec.ts`.
- Dipende da / correlato a: D-54, D-60, D-74; rilievi A4 sul canale unico.

**Nota del pacchetto.** Prima di scrivere i CHECK verifica sul seed (`app/backend/prisma/seed/dati-prova.json`) e sul tuo database di prova che nessuna riga li violi (`SELECT count(*) …`). Lo stato del file legato al bollettino (lasciarlo «da controllare» o portarlo ad `abbinato`) **non** si decide qui: solo il blocco.

## File ammessi (solo questi)

- `app/backend/prisma/migrations/20261113090000_bollettino_file/migration.sql`
- `app/backend/src/documenti.ts`
- `app/backend/test/bollettini.spec.ts`
- `app/backend/test/vincoli.spec.ts`
- `strumenti/opencode/resoconto-collaudo-0-01.md`

## File vietati

Onda 0: i pacchetti vanno **in serie**, uno per volta, nell'ordine 0-01 → 0-05. Non toccare le migrazioni degli altri pacchetti dell'onda 0.

Documentazione (la scrive il **pacchetto documentazione** dell'onda, dopo di te: tu metti il testo pronto nel resoconto, sezione *Da documentare*):

- `specifica-crm-provvigioni.md`
- `app/frontend/lib/guida.ts`
- `piano-lavoro-crm.md`
- `PRD-crm-provvigioni.md`
- `prototipo-alternativo/LEGGIMI.md`
- `prototipo-alternativo/assets/guida.js`
- `app/README.md`
- `CLAUDE.md`
- `prototipo-crm/specifica.html`
- `prototipo-crm/preventivo.html`
- qualsiasi altro file non elencato fra gli ammessi

## Database e prove

Lavora **solo** sul tuo database di prova `decobrands_test_0_01` (il nome contiene `decobrands_test`, come vuole
`app/backend/test/ambiente.ts`, che legge `DATABASE_URL_TEST`). Altri pacchetti della stessa onda lanciano jest
nello stesso momento su database loro: sul database condiviso `decobrands_test` due giri si cancellano i dati a
vicenda (A6-05). Anche la cartella dei documenti di prova va separata: `ambiente.ts` la mette in
`os.tmpdir()`, quindi cambia `TMP`/`TEMP`. In Git Bash, da `app/backend`:

```bash
export DATABASE_URL_TEST="$(grep '^DATABASE_URL' .env | cut -d= -f2- | sed 's#/decobrands_db#/decobrands_test_0_01#')"
node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL_TEST.replace('/decobrands_test_0_01','/postgres')});c.connect().then(()=>c.query('CREATE DATABASE decobrands_test_0_01 OWNER decobrands')).then(()=>console.log('creato')).catch(e=>console.log(e.message)).finally(()=>c.end())"
DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy
export TMP="$TEMP/decobrands-0-01"; export TEMP="$TMP"; mkdir -p "$TMP"
npx jest test/<file>.spec.ts            # sempre con le variabili sopra nella stessa shell
```

Alla fine cancella il database: lo stesso `node -e` con `DROP DATABASE decobrands_test_0_01`. **Mai** `decobrands_db`, mai il
database `decobrands_test` condiviso, mai Integra (192.168.239.49: non si contatta per nessun motivo).

Prove da far passare:

- backend: `cd app/backend && npx jest test/bollettini.spec.ts test/vincoli.spec.ts test/documenti.spec.ts test/seed.spec.ts` (con le variabili sopra) → **0 KO**;
- `cd app/backend && npx tsc --noEmit` → 0 errori;
- `cd app/backend && npx prisma validate` e `npx prisma generate`; lo schema deve coincidere con le migrazioni: `npx prisma migrate diff` dal tuo database di prova (già migrato) allo schema → nessuna differenza (skill `prisma-cli` per la sintassi di Prisma 7);
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-0-01.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
