# Collaudo · Onda 3 · Pacchetto 3-01 — Arrivo dello stesso file e annullo di un documento letto

Data: 08/11/2026 · **Esecutore: DeepSeek V4** · Gravità del pacchetto: **P2** · Rilievi: A3-05, A4-03, A4-14, A4-06 · Piano: `strumenti/collaudo/piano-correzioni.md`.

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

## Rilievi da correggere (testo dei report del collaudo)

### A3-05 — Eliminazione di uno scartato e nuovo arrivo dello stesso file: riga in coda senza file
- Gravità: P2
- Dove: `app/backend/src/scartati.ts:164-186` (`elimina`), `sistema.ts:428-433`, `app/backend/src/documenti.ts:86` (`riceviDocumento`)
- Problema: il nome del file è l'impronta (D-34). L'eliminazione cancella il file **dopo** il commit; se nel frattempo lo stesso file arriva di nuovo, `riceviDocumento` trova il file ancora lì (`EEXIST`, non lo riscrive), crea la riga e il file sparisce subito dopo.
- Scenario: l'amministratore elimina lo scartato X mentre la casella riceve di nuovo lo stesso PDF → riga nuova `in_coda` con il file cancellato → 3 letture fallite, `lettura.fallita`; l'email è già spostata fra le lette: il documento va recuperato a mano.
- Correzione puntuale: in `riceviDocumento`, dopo il `$transaction` riuscito, riscrivere il file in modo idempotente: `await writeFile(join(radice, file_percorso), f.dati, { flag: 'wx' }).catch((e) => { if (e.code !== 'EEXIST') throw e; })` con commento `// ponytail: rimette il file se un'eliminazione dello stesso file l'ha tolto dopo il commit`. La finestra residua (cancellazione più lenta dell'intera transazione d'arrivo) è accettabile.
- Prova che la verifica: `app/backend/test/documenti.spec.ts` — `rm` del file fra due invii dello stesso contenuto, poi il file esiste.
- Esecutore: DeepSeek V4 Flash — un file, due righe.
- File toccati: `app/backend/src/documenti.ts`, `app/backend/test/documenti.spec.ts`.
- Dipende da / correlato a: A3-04, A4 (canale unico), D-34.

### A4-03 — Un file scritto a metà su disco resta per sempre come «stesso contenuto»
- Gravità: P2
- Dove: `app/backend/src/documenti.ts:86-88` (`writeFile(..., { flag: 'wx' })`, `EEXIST` accettato)
- Problema: se la scrittura si interrompe (disco pieno, processo fermato) il file parziale resta con il nome dell'impronta; il nuovo invio trova `EEXIST`, lo considera identico e crea la riga su un file troncato.
- Scenario: disco pieno durante il caricamento di un PDF di 12 MB → `ENOSPC`, 500 → si libera spazio e si ricarica → `EEXIST` → riga creata, il lettore manda a LlamaCloud un PDF rotto → 3 tentativi → `errore`; ricaricarlo dà 409 (doppione). Il file vero non entra più.
- Correzione puntuale: scrivere su `<percorso>.<randomUUID()>.tmp` e poi `link(tmp, percorso)` (fallisce se esiste) + `rm(tmp)`; su `EEXIST` rileggere il file esistente e confrontare lo SHA-256: se diverso, sostituirlo con `rename(tmp, percorso)`.
- Prova che la verifica: `test/documenti.spec.ts` — file parziale già presente con il nome dell'impronta → dopo il caricamento il contenuto su disco ha l'impronta giusta.
- Esecutore: DeepSeek V4 Flash — una funzione, logica locale.
- File toccati: `app/backend/src/documenti.ts`, `app/backend/test/documenti.spec.ts`.
- Dipende da / correlato a: D-54, V13.

### A4-14 — Ricaricare uno scartato mentre lo si elimina dà 500
- Gravità: P3
- Dove: `app/backend/src/documenti.ts:96-97` (`findUniqueOrThrow` sulla riga appena cancellata da `scartati.ts:563` o da `pulisciScartati`)
- Problema: la riga letta fuori dalla transazione può sparire prima del `FOR UPDATE`; `findUniqueOrThrow` → P2025 → 500 (e il file può essere rimosso subito dopo dall'eliminazione).
- Scenario: l'amministratore elimina definitivamente uno scartato nello stesso istante in cui il file torna per email → 500, il giro della casella finisce in `errore` (vedi A4-05) e l'email resta.
- Correzione puntuale: se la riga bloccata non c'è più, uscire dalla transazione e rifare `riceviDocumento` una volta da capo (nuova riga, nuovo percorso del giorno).
- Prova che la verifica: `test/documenti.spec.ts` (riga cancellata fra la lettura e la transazione: simulare con uno spy su `findUnique`).
- Esecutore: DeepSeek V4 Flash.
- File toccati: `app/backend/src/documenti.ts`, `app/backend/test/documenti.spec.ts`.
- Dipende da / correlato a: A4-05, A4-09.

### A4-06 — Annullare un documento abbinato lo rimanda alla lettura: correzioni perse e crediti spesi
- Gravità: P2
- Dove: `app/backend/src/documenti.ts:1034` (`elimina`: `stato: 'in_coda'`), `app/backend/src/lettura.ts:303` (`deleteMany` dei campi)
- Problema: «il file torna in coda» oggi vuol dire «da leggere»: il lettore lo preleva, cancella tutti i `documenti_campi` (valori finali e ✓ verificati compresi) e lo rilegge a pagamento.
- Scenario: fattura letta, 4 campi corretti a mano, abbinata alla pratica sbagliata → *Annulla* per abbinarla a quella giusta → entro 15 s il documento torna `da_controllare` con i valori letti originali: le 4 correzioni sono sparite e si è consumata una lettura LlamaCloud.
- Correzione puntuale: in `elimina`, `stato: a.letto_il ? 'da_controllare' : 'in_coda'` (leggere `letto_il` dalla riga bloccata). Allineare il testo «torna in coda» in guida/spec.
- Prova che la verifica: `test/documenti.spec.ts:211-225` — dopo l'annullamento di un documento letto lo stato è `da_controllare` e i campi corretti restano.
- Esecutore: DeepSeek V4 Flash — una condizione in un file.
- File toccati: `app/backend/src/documenti.ts`, `app/backend/test/documenti.spec.ts`, `app/frontend/lib/guida.ts`.
- Dipende da / correlato a: D-54, D-60, D-72.

> **Per questo pacchetto:** Il testo «torna in coda» di guida/spec lo cambia il pacchetto documentazione: scrivi la frase nuova nel resoconto.

**Nota del pacchetto.** I tre rilievi A3-05, A4-03 e A4-14 toccano la stessa funzione `riceviDocumento`: una sola scrittura del file (temporaneo + `link`, A4-03) che copre anche la riscrittura dopo il commit (A3-05). Niente due meccanismi diversi.

## File ammessi (solo questi)

- `app/backend/src/documenti.ts`
- `app/backend/test/documenti.spec.ts`
- `strumenti/opencode/resoconto-collaudo-3-01.md`

## File vietati

Li modificano altri pacchetti della **stessa onda**, in parallelo:

- `app/backend/src/liquidazioni.ts`
- `app/backend/src/oggi.ts`
- `app/backend/test/liquidazioni.spec.ts`
- `app/backend/test/oggi.spec.ts`
- `app/frontend/app/(app)/[...resto]/page.tsx`
- `app/frontend/app/(app)/bollettini/VistaBollettini.tsx`
- `app/frontend/app/(app)/clienti/VistaClienti.tsx`
- `app/frontend/app/(app)/componenti/page.tsx`
- `app/frontend/app/(app)/documenti/VistaDocumenti.tsx`
- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`
- `app/frontend/app/(app)/fornitori/VistaFornitori.tsx`
- `app/frontend/app/(app)/liquidazioni/VistaLiquidazioni.tsx`
- `app/frontend/app/(app)/not-found.tsx`
- `app/frontend/app/(app)/oggi/VistaOggi.tsx`
- `app/frontend/app/(app)/pratiche/VistaPratiche.tsx`
- `app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx`
- `app/frontend/app/(app)/registro/VistaRegistro.tsx`
- `app/frontend/app/(app)/subagenti/VistaSubagenti.tsx`
- `app/frontend/app/stile/stile.css`
- `app/frontend/componenti/ConsultaDocumenti.tsx`
- `app/frontend/componenti/DataTable.tsx`
- `app/frontend/componenti/FilterBar.tsx`
- `app/frontend/componenti/InCostruzione.tsx`
- `app/frontend/componenti/Modale.tsx`
- `app/frontend/lib/formati.ts`
- `prototipo-alternativo/assets/stile.css`
- `strumenti/prove/app_caricamento.py`
- `strumenti/prove/app_clienti.py`
- `strumenti/prove/app_componenti.py`
- `strumenti/prove/app_documenti.py`
- `strumenti/prove/app_guscio.py`
- `strumenti/prove/app_pratica.py`

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
- `app/backend/prisma/schema.prisma` e `app/backend/prisma/migrations/` (le migrazioni stanno solo nell'onda 0)
- qualsiasi altro file non elencato fra gli ammessi

## Database e prove

Lavora **solo** sul tuo database di prova `decobrands_test_3_01` (il nome contiene `decobrands_test`, come vuole
`app/backend/test/ambiente.ts`, che legge `DATABASE_URL_TEST`). Altri pacchetti della stessa onda lanciano jest
nello stesso momento su database loro: sul database condiviso `decobrands_test` due giri si cancellano i dati a
vicenda (A6-05). Anche la cartella dei documenti di prova va separata: `ambiente.ts` la mette in
`os.tmpdir()`, quindi cambia `TMP`/`TEMP`. In Git Bash, da `app/backend`:

```bash
export DATABASE_URL_TEST="$(grep '^DATABASE_URL' .env | cut -d= -f2- | sed 's#/decobrands_db#/decobrands_test_3_01#')"
node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL_TEST.replace('/decobrands_test_3_01','/postgres')});c.connect().then(()=>c.query('CREATE DATABASE decobrands_test_3_01 OWNER decobrands')).then(()=>console.log('creato')).catch(e=>console.log(e.message)).finally(()=>c.end())"
DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy
export TMP="$TEMP/decobrands-3-01"; export TEMP="$TMP"; mkdir -p "$TMP"
npx jest test/<file>.spec.ts            # sempre con le variabili sopra nella stessa shell
```

Alla fine cancella il database: lo stesso `node -e` con `DROP DATABASE decobrands_test_3_01`. **Mai** `decobrands_db`, mai il
database `decobrands_test` condiviso, mai Integra (192.168.239.49: non si contatta per nessun motivo).

Prove da far passare:

- backend: `cd app/backend && npx jest test/documenti.spec.ts test/documenti-pratica.spec.ts test/scartati.spec.ts test/coda.spec.ts` (con le variabili sopra) → **0 KO**;
- `cd app/backend && npx tsc --noEmit` → 0 errori;
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-3-01.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
