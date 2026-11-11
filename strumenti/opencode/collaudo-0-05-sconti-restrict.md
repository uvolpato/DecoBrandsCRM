# Collaudo · Onda 0 · Pacchetto 0-05 — `sconti` → `interscambio` con ON DELETE RESTRICT

Data: 11/11/2026 · **Esecutore: DeepSeek V4** · Gravità del pacchetto: **P3** · Rilievi: R0-D7 · Piano: `strumenti/collaudo/piano-correzioni.md`.

Si lancia **dopo** il commit del lavoro f7 e la chiusura dell'onda precedente. Dipende da: 0-04 (`collaudo-0-04-ricerca-trgm.md`).

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

## Decisioni di Ugo per questo pacchetto (11/11/2026)

Sono decise: applicale come scritte, non riaprirle. La riga del §19 la scrive il pacchetto documentazione dell'onda.

- **D-139**: **`sconti` → `interscambio` è `ON DELETE RESTRICT`**: un'agenzia con sconti storici non si elimina, si chiude (come le altre chiavi dell'anagrafica, A3-03).

## Rilievi da correggere (domanda 7 del report `strumenti/collaudo/report/R0-ultime-modifiche.md`, decisa da Ugo l'11/11/2026)

### R0-D7 — `sconti` con `ON DELETE CASCADE` da `interscambio`: eliminare un'agenzia cancella gli sconti storici
- Gravità: P3
- Dove: app/backend/prisma/migrations/20261108090000_anagrafica_soggetti/migration.sql:184 (`sconti_interscambio_id_fkey … ON DELETE CASCADE`), `app/backend/prisma/schema.prisma` (relazione `sconti` → `interscambio`)
- Problema: eliminare un'agenzia cancella in silenzio gli sconti collegati; le altre chiavi esterne dell'anagrafica sono `RESTRICT` (report R1, *Da decidere* 3; correlato ad A3-03, che per le attese ha già scelto `RESTRICT`).
- Scenario: oggi la tabella non si usa; quando si userà, eliminare un'agenzia con sconti storici li perde senza errore e i calcoli del passato non si possono più rifare.
- Correzione puntuale (decisione di Ugo, D-139): migrazione nuova `20261113140000_sconti_restrict` che rifà il vincolo: `ALTER TABLE "sconti" DROP CONSTRAINT "sconti_interscambio_id_fkey", ADD CONSTRAINT "sconti_interscambio_id_fkey" FOREIGN KEY ("interscambio_id") REFERENCES "interscambio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;` e `onDelete: Restrict` nella relazione di `schema.prisma`. Non toccare la migrazione vecchia.
- Prova che la verifica: test/vincoli.spec.ts: agenzia con uno sconto → `DELETE` dell'agenzia rifiutato (23503 / P2003); senza sconti → eliminata.
- Esecutore: DeepSeek V4 — migrazione.
- File toccati: nuova migrazione, `app/backend/prisma/schema.prisma`, `app/backend/test/vincoli.spec.ts`
- Dipende da / correlato a: A3-03, D-139

**Pacchetto sensibile (migrazione).** Prima di consegnare carica davvero (strumento `skill` di OpenCode) `postgresql-code-review` e `ponytail-review`, rileggi il diff e scrivi nel resoconto cosa hanno trovato. A fine onda Claude Code fa la review completa.

## File ammessi (solo questi)

- `app/backend/prisma/migrations/20261113140000_sconti_restrict/migration.sql`
- `app/backend/prisma/schema.prisma`
- `app/backend/test/vincoli.spec.ts`
- `strumenti/opencode/resoconto-collaudo-0-05.md`

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

Lavora **solo** sul tuo database di prova `decobrands_test_0_05` (il nome contiene `decobrands_test`, come vuole
`app/backend/test/ambiente.ts`, che legge `DATABASE_URL_TEST`). Altri pacchetti della stessa onda lanciano jest
nello stesso momento su database loro: sul database condiviso `decobrands_test` due giri si cancellano i dati a
vicenda (A6-05). Anche la cartella dei documenti di prova va separata: `ambiente.ts` la mette in
`os.tmpdir()`, quindi cambia `TMP`/`TEMP`. In Git Bash, da `app/backend`:

```bash
export DATABASE_URL_TEST="$(grep '^DATABASE_URL' .env | cut -d= -f2- | sed 's#/decobrands_db#/decobrands_test_0_05#')"
node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL_TEST.replace('/decobrands_test_0_05','/postgres')});c.connect().then(()=>c.query('CREATE DATABASE decobrands_test_0_05 OWNER decobrands')).then(()=>console.log('creato')).catch(e=>console.log(e.message)).finally(()=>c.end())"
DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy
export TMP="$TEMP/decobrands-0-05"; export TEMP="$TMP"; mkdir -p "$TMP"
npx jest test/<file>.spec.ts            # sempre con le variabili sopra nella stessa shell
```

Alla fine cancella il database: lo stesso `node -e` con `DROP DATABASE decobrands_test_0_05`. **Mai** `decobrands_db`, mai il
database `decobrands_test` condiviso, mai Integra (192.168.239.49: non si contatta per nessun motivo).

Prove da far passare:

- backend: `cd app/backend && npx jest test/vincoli.spec.ts test/clienti.spec.ts test/seed.spec.ts` (con le variabili sopra) → **0 KO**;
- `cd app/backend && npx tsc --noEmit` → 0 errori;
- `cd app/backend && npx prisma validate` e `npx prisma generate`; lo schema deve coincidere con le migrazioni: `npx prisma migrate diff` dal tuo database di prova (già migrato) allo schema → nessuna differenza (skill `prisma-cli` per la sintassi di Prisma 7);
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-0-05.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
