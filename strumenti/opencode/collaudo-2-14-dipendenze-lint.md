# Collaudo · Onda 2 · Pacchetto 2-14 — Dipendenze: inutile tolta, versioni bloccate, strumento di prova fuori da src, ESLint

Data: 08/11/2026 · **Esecutore: DeepSeek V4 Flash** · Gravità del pacchetto: **P3** · Rilievi: A8-09, A8-10, A8-11, A5-17 · Piano: `strumenti/collaudo/piano-correzioni.md`.

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

### A8-09 — Dipendenza mai usata: `@nestjs/config`
- Gravità: P3
- Dove: `app/backend/package.json` (dependencies)
- Problema: nessun import in `src`, `test`, `prisma`; la configurazione passa da `dotenv/config` e `process.env`.
- Scenario: installata e aggiornata (avvisi di sicurezza, `npm audit`) senza servire.
- Correzione puntuale: `npm uninstall @nestjs/config` in `app/backend`.
- Prova che la verifica: `npm run build`, `npm test`.
- Esecutore: DeepSeek V4 Flash — una riga di package.json
- File toccati: `backend/package.json`, `backend/package-lock.json`
- Dipende da / correlato a: A8-10 (stesso file)

### A8-10 — Versioni non bloccate e tipi di Node sbagliati
- Gravità: P3
- Dove: `app/backend/package.json` (`imapflow ^2.10.2`, `mailparser ^3.14.2`, `nodemailer ^7.0.10`,
  `@types/mailparser`, `@types/nodemailer`); `app/frontend/package.json` (`pdfjs-dist ^6.5.438`, `@types/node 20.19.43` con `engines` Node 24)
- Problema: tutto il resto è a versione esatta; queste cinque possono cambiare a ogni `npm install` senza lock.
- Scenario: `npm install` sul server senza lock aggiornato porta `pdfjs-dist` 6.6 → il worker cambia percorso
  e il rettangolo nel PDF (`PdfEvidenziato.tsx`) smette di disegnarsi; i tipi di Node 20 nascondono API di Node 24.
- Correzione puntuale: togliere i `^` (versione esatta presente nel lock); `@types/node` del frontend a `24.13.2` come il backend.
- Prova che la verifica: `npm ci && npm run build` in entrambe.
- Esecutore: DeepSeek V4 Flash — package.json
- File toccati: `backend/package.json`, `frontend/package.json`, i due lock
- Dipende da / correlato a: A8-09

### A8-11 — Strumento di prova `lettura-prova.ts` dentro `src/` (va in produzione)
- Gravità: P3
- Dove: `app/backend/src/lettura-prova.ts`; script `lettura:prova` in `backend/package.json:21`; `app/README.md:71`
- Problema: è una prova a mano del connettore (F6-A2); stando in `src/` si compila in `dist/` e va sul server.
- Scenario: sul server `npm run lettura:prova -- file.pdf` manda un documento a LlamaCloud con la chiave di
  esercizio e consuma crediti fuori dalla coda e fuori dal registro.
- Correzione puntuale: spostarlo in `app/backend/prisma/lettura-prova.ts` (come `ponte-prova.ts`), import con
  `../src/…`, script `ts-node prisma/lettura-prova.ts`; aggiornare il README. Oppure cancellarlo se F6 è chiusa.
- Prova che la verifica: `npm run build` (in `dist/src` non c'è più `lettura-prova.js`).
- Esecutore: DeepSeek V4 Flash — spostamento di un file
- File toccati: `src/lettura-prova.ts` → `prisma/lettura-prova.ts`, `package.json`, `app/README.md`
- Dipende da / correlato a: A4, D-67; A8-09/10 (stesso package.json)

> **Per questo pacchetto:** La riga del README la cambia il pacchetto documentazione: scrivila nel resoconto.

### A5-17 — Nessun ESLint: regole dei hook non controllate, commenti `eslint-disable` inutili
- Gravità: P3
- Dove: `app/frontend/package.json` (nessun `eslint`/`eslint-config-next`); 20+ `// eslint-disable-*` nel codice
- Problema: le dipendenze degli effetti sono escluse a mano senza che un linter le controlli; difetti come A5-01/A5-04 non emergono.
- Scenario: un effetto nuovo con dipendenze mancanti passa `tsc` senza segnalazioni.
- Correzione puntuale: aggiungere `eslint` + `eslint-config-next` (flat config `next/core-web-vitals`) e uno script `"lint": "eslint ."`; correggere o motivare i rilievi.
- Prova che la verifica: `npm run lint` in `app/frontend` con 0 errori.
- Esecutore: DeepSeek V4 Flash — configurazione.
- File toccati: `app/frontend/package.json`, `app/frontend/eslint.config.mjs`
- Dipende da / correlato a: A8

> **Per questo pacchetto:** Qui: dipendenze, `eslint.config.mjs`, script `lint`, e un giro di `npm run lint`. Correggi **solo** errori banali nei file che già tocchi; tutti gli altri rilievi del linter vanno elencati nel resoconto (diventano un prompt successivo). Non toccare file di altre pagine.

**Nota del pacchetto.** ⚠ **Lancia questo pacchetto per ultimo nella sua onda**, quando gli altri pacchetti di codice hanno finito: `npm ci` riscrive `node_modules` e farebbe cadere le loro prove. Dopo il cambio dei pacchetti: `npm ci && npm run build` in `app/backend` e in `app/frontend`. Non aggiornare versioni: si tolgono solo i `^` lasciando la versione del lock.

## File ammessi (solo questi)

- `app/backend/package.json`
- `app/backend/package-lock.json`
- `app/frontend/package.json`
- `app/frontend/package-lock.json`
- `app/backend/src/lettura-prova.ts`
- `app/backend/prisma/lettura-prova.ts`
- `app/frontend/eslint.config.mjs`
- `strumenti/opencode/resoconto-collaudo-2-14.md`

## File vietati

Li modificano altri pacchetti della **stessa onda**, in parallelo:

- `app/backend/src/accesso.ts`
- `app/backend/src/bollettino.ts`
- `app/backend/src/documenti.ts`
- `app/backend/src/esporta-liquidazione.ts`
- `app/backend/src/eventi.ts`
- `app/backend/src/fornitori.ts`
- `app/backend/src/impostazioni-api.ts`
- `app/backend/src/impostazioni.ts`
- `app/backend/src/incassi.ts`
- `app/backend/src/motore/dati.ts`
- `app/backend/src/motore/motore.ts`
- `app/backend/src/proposta.ts`
- `app/backend/src/solleciti.ts`
- `app/backend/test/bollettino.spec.ts`
- `app/backend/test/documenti-pratica.spec.ts`
- `app/backend/test/eventi.spec.ts`
- `app/backend/test/fornitori.spec.ts`
- `app/backend/test/impostazioni.spec.ts`
- `app/backend/test/liquidazioni.spec.ts`
- `app/backend/test/motore-volumi.spec.ts`
- `app/backend/test/pratiche.spec.ts`
- `app/backend/test/proposta.spec.ts`
- `app/frontend/app/(app)/analisi/VistaAnalisi.tsx`
- `app/frontend/app/(app)/bollettini/VistaBollettini.tsx`
- `app/frontend/app/(app)/clienti/VistaClienti.tsx`
- `app/frontend/app/(app)/documenti/VistaDocumenti.tsx`
- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`
- `app/frontend/app/(app)/impostazioni/*`
- `app/frontend/app/(app)/layout.tsx`
- `app/frontend/app/(app)/oggi/VistaOggi.tsx`
- `app/frontend/app/(app)/pratiche/VistaPratiche.tsx`
- `app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx`
- `app/frontend/app/(app)/sistema/VistaSistema.tsx`
- `app/frontend/app/accesso/esci/page.tsx`
- `app/frontend/app/stile/stile.css`
- `app/frontend/componenti/Barra.tsx`
- `app/frontend/componenti/ConsultaDocumenti.tsx`
- `app/frontend/componenti/DataTable.tsx`
- `app/frontend/componenti/PeriodoMesi.tsx`
- `app/frontend/componenti/Schede.tsx`
- `app/frontend/lib/api.ts`
- `app/frontend/lib/stati.ts`
- `prototipo-alternativo/assets/stile.css`
- `strumenti/prove/app_accesso.py`
- `strumenti/prove/app_analisi.py`
- `strumenti/prove/app_clienti.py`
- `strumenti/prove/app_documenti.py`
- `strumenti/prove/app_eventi.py`
- `strumenti/prove/app_guscio.py`
- `strumenti/prove/app_liquidazioni.py`
- `strumenti/prove/app_pratica.py`
- `strumenti/prove/app_pratiche.py`
- `strumenti/prove/app_sistema.py`

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

Lavora **solo** sul tuo database di prova `decobrands_test_2_14` (il nome contiene `decobrands_test`, come vuole
`app/backend/test/ambiente.ts`, che legge `DATABASE_URL_TEST`). Altri pacchetti della stessa onda lanciano jest
nello stesso momento su database loro: sul database condiviso `decobrands_test` due giri si cancellano i dati a
vicenda (A6-05). Anche la cartella dei documenti di prova va separata: `ambiente.ts` la mette in
`os.tmpdir()`, quindi cambia `TMP`/`TEMP`. In Git Bash, da `app/backend`:

```bash
export DATABASE_URL_TEST="$(grep '^DATABASE_URL' .env | cut -d= -f2- | sed 's#/decobrands_db#/decobrands_test_2_14#')"
node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL_TEST.replace('/decobrands_test_2_14','/postgres')});c.connect().then(()=>c.query('CREATE DATABASE decobrands_test_2_14 OWNER decobrands')).then(()=>console.log('creato')).catch(e=>console.log(e.message)).finally(()=>c.end())"
DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy
export TMP="$TEMP/decobrands-2-14"; export TEMP="$TMP"; mkdir -p "$TMP"
npx jest test/<file>.spec.ts            # sempre con le variabili sopra nella stessa shell
```

Alla fine cancella il database: lo stesso `node -e` con `DROP DATABASE decobrands_test_2_14`. **Mai** `decobrands_db`, mai il
database `decobrands_test` condiviso, mai Integra (192.168.239.49: non si contatta per nessun motivo).

Prove da far passare:

- backend: `cd app/backend && npx jest test/lettura.spec.ts test/lettore.spec.ts` (con le variabili sopra) → **0 KO**;
- `cd app/backend && npx tsc --noEmit` → 0 errori;
- frontend: `cd app/frontend && npx tsc --noEmit` → 0 errori;
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-2-14.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
