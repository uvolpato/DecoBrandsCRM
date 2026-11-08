# Collaudo · Onda in attesa · Pacchetto attesa-07 — Totali delle tabelle e differenze del bollettino dal server (V12)

Data: 08/11/2026 · **Esecutore: DeepSeek V4** · Gravità del pacchetto: **P2** · Rilievi: A5-08 · Piano: `strumenti/collaudo/piano-correzioni.md`.

> ⛔ **NON LANCIARE** finché Ugo non decide la domanda **U14 — V12: totali in fondo alle tabelle e differenza riga per riga del bollettino si sommano nel browser.** (`piano-correzioni.md`, *Da decidere*). Raccomandazione: (a) almeno per Liquidazioni, Analisi e Bollettino (soldi): CLAUDE.md regola 0 elenca i totali fra i calcoli solo lato server. Se Ugo sceglie diversamente, Claude Code riscrive questo prompt. Quando si lancia: Claude Code sceglie l'onda (la prima dopo la decisione in cui nessun altro pacchetto tocca questi file) e completa l'elenco dei file vietati.

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

### A5-08 — Totali delle colonne sommati nel browser (V12)
- Gravità: P2
- Dove: `app/frontend/componenti/DataTable.tsx:132-136` (`totale: 'somma'` → `reduce`); usi: `liquidazioni/VistaLiquidazioni.tsx:196,235,310-312`, `analisi/VistaAnalisi.tsx:159-162,175-178`, `documenti/[id]/VistaDocumento.tsx:419,424,728`; differenza riga per riga in `bollettini/[id]/VistaBollettino.tsx:233` (`loro − noi`)
- Problema: V12 / §16.5 elenca "totali delle tabelle" e "differenze dei bollettini" fra i calcoli solo lato server; qui si sommano/sottraggono in virgola mobile i valori arrivati.
- Scenario: Liquidazioni, piede "Totale" della colonna *Da liquidare* = somma JS di `s.provvigione`, mentre la nota del pannello mostra `riepilogo.provvigione` del server: se il server arrotonda per riga diversamente (o un subagente ha voci escluse), i due totali sulla stessa pagina possono differire di centesimi e nessuno dei due è "quello vero" per il browser.
- Correzione puntuale: aggiungere a `DataTable` il prop `totali?: Record<string, number>` (dal server) usato al posto di `reduce` quando c'è; il server restituisce `totali` per ogni tabella con piede (liquidazioni subagenti/documenti, report, analisi tabella, righe del documento) e `differenza` per ogni riga del bollettino; `totale:'somma'` resta solo come segnaposto della colonna.
- Prova che la verifica: test backend dei totali sul seed §12 = numeri del prototipo; `app_liquidazioni.py` confronta piede e nota del pannello.
- Esecutore: DeepSeek V4 — backend + frontend, soldi.
- File toccati: `componenti/DataTable.tsx`, pagine elencate, `backend/src/liquidazioni.ts`, `analisi.ts`, `bollettino.ts`, `documenti.ts`, test
- Dipende da / correlato a: V12, D-28, A2 → anche in *Da decidere*

> **Per questo pacchetto:** Nota di A8: anche `documenti/[id]/VistaDocumento.tsx:728` somma nel browser. Se Ugo sceglie (a), questo pacchetto va **diviso** da Claude Code in due parti (Liquidazioni+Analisi; Documento+Bollettino) prima del lancio: supera gli 8 file.

## File ammessi (solo questi)

- `app/frontend/componenti/DataTable.tsx`
- `app/frontend/app/(app)/liquidazioni/VistaLiquidazioni.tsx`
- `app/frontend/app/(app)/analisi/VistaAnalisi.tsx`
- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`
- `app/frontend/app/(app)/bollettini/[id]/VistaBollettino.tsx`
- `app/backend/src/liquidazioni.ts`
- `app/backend/src/analisi.ts`
- `app/backend/src/bollettino.ts`
- `app/backend/src/documenti.ts`
- `strumenti/opencode/resoconto-collaudo-attesa-07.md`

## File vietati

Da completare da Claude Code al lancio (file degli altri pacchetti della stessa onda).

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

Lavora **solo** sul tuo database di prova `decobrands_test_attesa_07` (il nome contiene `decobrands_test`, come vuole
`app/backend/test/ambiente.ts`, che legge `DATABASE_URL_TEST`). Altri pacchetti della stessa onda lanciano jest
nello stesso momento su database loro: sul database condiviso `decobrands_test` due giri si cancellano i dati a
vicenda (A6-05). Anche la cartella dei documenti di prova va separata: `ambiente.ts` la mette in
`os.tmpdir()`, quindi cambia `TMP`/`TEMP`. In Git Bash, da `app/backend`:

```bash
export DATABASE_URL_TEST="$(grep '^DATABASE_URL' .env | cut -d= -f2- | sed 's#/decobrands_db#/decobrands_test_attesa_07#')"
node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL_TEST.replace('/decobrands_test_attesa_07','/postgres')});c.connect().then(()=>c.query('CREATE DATABASE decobrands_test_attesa_07 OWNER decobrands')).then(()=>console.log('creato')).catch(e=>console.log(e.message)).finally(()=>c.end())"
DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy
export TMP="$TEMP/decobrands-attesa-07"; export TEMP="$TMP"; mkdir -p "$TMP"
npx jest test/<file>.spec.ts            # sempre con le variabili sopra nella stessa shell
```

Alla fine cancella il database: lo stesso `node -e` con `DROP DATABASE decobrands_test_attesa_07`. **Mai** `decobrands_db`, mai il
database `decobrands_test` condiviso, mai Integra (192.168.239.49: non si contatta per nessun motivo).

Prove da far passare:

- backend: `cd app/backend && npx jest test/liquidazioni.spec.ts test/analisi.spec.ts test/bollettino.spec.ts` (con le variabili sopra) → **0 KO**;
- `cd app/backend && npx tsc --noEmit` → 0 errori;
- frontend: `cd app/frontend && npx tsc --noEmit` → 0 errori;
- prove nel browser interessate: `app_liquidazioni.py`, `app_analisi.py`, `app_bollettino.py`. **Non lanciarle** (porte e cartella `.next` sono condivise con gli altri pacchetti): aggiorna quelle indicate nei rilievi, controlla la sintassi con `python -m py_compile <file>` e scrivi nel resoconto quali vanno lanciate. Le lancia il controllo di fine onda.
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-attesa-07.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
