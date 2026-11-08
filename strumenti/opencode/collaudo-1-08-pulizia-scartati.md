# Collaudo · Onda 1 · Pacchetto 1-08 — Pulizia degli scartati senza cancellare un documento recuperato

Data: 08/11/2026 · **Esecutore: DeepSeek V4 Flash** · Gravità del pacchetto: **P2** · Rilievi: A3-04, A4-09 · Piano: `strumenti/collaudo/piano-correzioni.md`.

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

### A3-04 — La pulizia degli scartati cancella anche un documento appena recuperato
- Gravità: P2
- Dove: `app/backend/src/sistema.ts:419-424` (`pulisciScartati`)
- Problema: legge gli scartati vecchi senza bloccarli, poi `deleteMany({ id: { in } })` senza ricontrollare lo stato.
- Scenario: alle 03:00 la pulizia legge lo scartato X (scartato 91 giorni fa); nello stesso istante un utente fa *Recupera* su X (`scartati.ts:134`, commit prima del delete) → X ora è `da_controllare` ma viene cancellato con il suo file.
- Correzione puntuale: sostituire `findMany` con `tx.$queryRaw\`SELECT id, file_percorso FROM documenti_in_arrivo WHERE stato = 'scartato' AND scartato_il < ${limite} FOR UPDATE SKIP LOCKED\``; nel `deleteMany` aggiungere anche `stato: 'scartato'`.
- Prova che la verifica: `app/backend/test/scartati.spec.ts` — scartato vecchio portato a `da_controllare` dopo la lettura (finto) → non cancellato; più semplice: verificare che `deleteMany` con stato diverso non tocchi la riga.
- Esecutore: DeepSeek V4 Flash — un file, modifica locale.
- File toccati: `app/backend/src/sistema.ts`, `app/backend/test/scartati.spec.ts`.
- Dipende da / correlato a: A3-05, D-74.

### A4-09 — La pulizia notturna degli scartati può cancellare un documento appena recuperato
- Gravità: P2
- Dove: `app/backend/src/sistema.ts:419-424` (`pulisciScartati`: `findMany` poi `deleteMany` per id, senza ricontrollare lo stato)
- Problema: fra la lettura degli id e la cancellazione una riga può essere stata recuperata (`/scartati/:id/recupera`) o rianimata dallo stesso file arrivato per email (`riceviDocumento` riporta in coda uno scartato, e la casella gira anche di notte); `deleteMany({ id: { in } })` la cancella comunque, file compreso.
- Scenario: documento scartato 91 giorni fa; il fornitore lo rimanda per email alle 03:00 mentre gira la pulizia → la riga torna `in_coda`, poi viene cancellata e il file rimosso; l'email è già stata spostata nelle lette → documento perso senza traccia.
- Correzione puntuale: una sola istruzione `DELETE FROM documenti_in_arrivo WHERE stato = 'scartato' AND scartato_il < ${limite} RETURNING id, file_percorso` con `tx.$queryRaw` (oppure `deleteMany` con lo stesso `where` completo dopo un `SELECT … FOR UPDATE`), poi anomalie e file sui soli id restituiti.
- Prova che la verifica: `test/sistema.spec.ts` — riga scartata vecchia riportata `in_coda` dopo la lettura degli id (simulare con due chiamate) → non cancellata.
- Esecutore: DeepSeek V4 Flash — una query in un file.
- File toccati: `app/backend/src/sistema.ts`, `app/backend/test/sistema.spec.ts`.
- Dipende da / correlato a: A3 (transazioni), D-74.

**Nota del pacchetto.** A3-04 e A4-09 sono lo stesso difetto: una sola correzione (`DELETE … WHERE stato = 'scartato' AND scartato_il < … RETURNING id, file_percorso`, poi file e anomalie solo sugli id restituiti). Una prova sola basta (in `sistema.spec.ts` o `scartati.spec.ts`).

## File ammessi (solo questi)

- `app/backend/src/sistema.ts`
- `app/backend/test/sistema.spec.ts`
- `app/backend/test/scartati.spec.ts`
- `strumenti/opencode/resoconto-collaudo-1-08.md`

## File vietati

Li modificano altri pacchetti della **stessa onda**, in parallelo:

- `.gitignore`
- `app/NOTA-RILASCIO.md`
- `app/README.md`
- `app/avvia-esercizio.bat`
- `app/backend/package.json`
- `app/backend/prisma/seed/dati-prova.json`
- `app/backend/src/accesso.ts`
- `app/backend/src/casella.ts`
- `app/backend/src/documenti.ts`
- `app/backend/src/errori.filter.ts`
- `app/backend/src/impostazioni-api.ts`
- `app/backend/src/impostazioni.ts`
- `app/backend/src/incassi.ts`
- `app/backend/src/lettore.ts`
- `app/backend/src/lettura.ts`
- `app/backend/src/main.ts`
- `app/backend/src/motore/dati.ts`
- `app/backend/src/motore/motore.ts`
- `app/backend/src/oggi.ts`
- `app/backend/src/proposta.ts`
- `app/backend/src/registro-api.ts`
- `app/backend/src/registro.ts`
- `app/backend/test/avvio.spec.ts`
- `app/backend/test/blocco.ts`
- `app/backend/test/casella.spec.ts`
- `app/backend/test/coda.spec.ts`
- `app/backend/test/correzione.spec.ts`
- `app/backend/test/documenti-lettura.spec.ts`
- `app/backend/test/documenti-pratica.spec.ts`
- `app/backend/test/impostazioni.spec.ts`
- `app/backend/test/incassi.spec.ts`
- `app/backend/test/liquidazioni.spec.ts`
- `app/backend/test/motore.spec.ts`
- `app/backend/test/oggi.spec.ts`
- `app/backend/test/permessi.spec.ts`
- `app/backend/test/profilo.spec.ts`
- `app/backend/test/proposta.spec.ts`
- `app/backend/test/registro-api.spec.ts`
- `app/backend/test/registro.spec.ts`
- `app/backend/test/seed.spec.ts`
- `app/deploy/*`
- `app/deploy/Caddyfile`
- `app/frontend/app/(app)/bollettini/VistaBollettini.tsx`
- `app/frontend/app/(app)/bollettini/[id]/VistaBollettino.tsx`
- `app/frontend/app/(app)/clienti/VistaClienti.tsx`
- `app/frontend/app/(app)/documenti/VistaDocumenti.tsx`
- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`
- `app/frontend/app/(app)/fornitori/VistaFornitori.tsx`
- `app/frontend/app/(app)/oggi/VistaOggi.tsx`
- `app/frontend/app/(app)/pratiche/VistaPratiche.tsx`
- `app/frontend/app/(app)/sistema/VistaSistema.tsx`
- `app/frontend/app/(app)/subagenti/VistaSubagenti.tsx`
- `app/frontend/app/(app)/utenti/VistaUtenti.tsx`
- `app/frontend/app/layout.tsx`
- `app/frontend/app/stile/stile.css`
- `app/frontend/componenti/CampoRicerca.tsx`
- `app/frontend/componenti/Piccoli.tsx`
- `app/frontend/lib/api.ts`
- `app/frontend/lib/eventi.tsx`
- `app/frontend/next.config.ts`
- `body.json`
- `cookies.txt`
- `prototipo-alternativo/assets/motore.js`
- `prototipo-alternativo/assets/stile.css`
- `prototipo-alternativo/index.html`
- `strumenti/prove/app_analisi.py`
- `strumenti/prove/app_bollettini.py`
- `strumenti/prove/app_bollettino.py`
- `strumenti/prove/app_clienti.py`
- `strumenti/prove/app_componenti.py`
- `strumenti/prove/app_documenti.py`
- `strumenti/prove/app_eventi.py`
- `strumenti/prove/app_flusso.py`
- `strumenti/prove/app_guscio.py`
- `strumenti/prove/app_oggi.py`
- `strumenti/prove/app_subagenti.py`

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

Lavora **solo** sul tuo database di prova `decobrands_test_1_08` (il nome contiene `decobrands_test`, come vuole
`app/backend/test/ambiente.ts`, che legge `DATABASE_URL_TEST`). Altri pacchetti della stessa onda lanciano jest
nello stesso momento su database loro: sul database condiviso `decobrands_test` due giri si cancellano i dati a
vicenda (A6-05). Anche la cartella dei documenti di prova va separata: `ambiente.ts` la mette in
`os.tmpdir()`, quindi cambia `TMP`/`TEMP`. In Git Bash, da `app/backend`:

```bash
export DATABASE_URL_TEST="$(grep '^DATABASE_URL' .env | cut -d= -f2- | sed 's#/decobrands_db#/decobrands_test_1_08#')"
node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL_TEST.replace('/decobrands_test_1_08','/postgres')});c.connect().then(()=>c.query('CREATE DATABASE decobrands_test_1_08 OWNER decobrands')).then(()=>console.log('creato')).catch(e=>console.log(e.message)).finally(()=>c.end())"
DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy
export TMP="$TEMP/decobrands-1-08"; export TEMP="$TMP"; mkdir -p "$TMP"
npx jest test/<file>.spec.ts            # sempre con le variabili sopra nella stessa shell
```

Alla fine cancella il database: lo stesso `node -e` con `DROP DATABASE decobrands_test_1_08`. **Mai** `decobrands_db`, mai il
database `decobrands_test` condiviso, mai Integra (192.168.239.49: non si contatta per nessun motivo).

Prove da far passare:

- backend: `cd app/backend && npx jest test/sistema.spec.ts test/scartati.spec.ts` (con le variabili sopra) → **0 KO**;
- `cd app/backend && npx tsc --noEmit` → 0 errori;
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-1-08.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
