# Collaudo · Onda 2 · Pacchetto 2-04 — Chiusura del bollettino, somme in Decimal, prove di concorrenza (V13)

Data: 08/11/2026 · **Esecutore: DeepSeek V4 Flash** · Gravità del pacchetto: **P2** · Rilievi: A3-08, A2-09, A6-11 · Piano: `strumenti/collaudo/piano-correzioni.md`.

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

### A3-08 — Chiusura del bollettino con tempo limite predefinito e un UPDATE per riga
- Gravità: P2
- Dove: `app/backend/src/bollettino.ts:274-300` (`chiudi`)
- Problema: dentro la transazione (limite 5 s) ci sono i blocchi, `caricaDatiBollettino`, la riconciliazione, un `UPDATE` per ogni riga del fornitore, `eventiIncassi` (un evento per documento).
- Scenario: bollettino di Gries con 300 righe → 300 UPDATE sequenziali + eventi; su un server carico si superano 5 s → `P2028`, il bollettino non si chiude e l'utente riprova; nessun danno ai dati ma la funzione non va.
- Correzione puntuale: `{ timeout: 30_000 }` sul `$transaction` di `chiudi` (bollettino.ts:274), con commento `// ponytail: un UPDATE per riga; updateMany per gruppi se i bollettini superano qualche centinaio di righe`.
- Prova che la verifica: `app/backend/test/bollettino.spec.ts` (esistente).
- Esecutore: DeepSeek V4 Flash — una riga.
- File toccati: `app/backend/src/bollettino.ts`.
- Dipende da / correlato a: A7.

### A2-09 — Totali dell'esportazione sommati in virgola mobile
- Gravità: P3
- Dove: app/backend/src/esporta-liquidazione.ts:53 (`somma`), :160-163, :389; app/backend/src/bollettino.ts:164 (totale della contestazione)
- Problema: somme di `Number` poi `r2`; i valori sono già al centesimo e l'errore resta sotto il centesimo, ma la regola
  del motore è Decimal ovunque e i totali chiusi esistono già in `foto.totale`.
- Scenario: nessun errore visibile con i volumi attesi; con decine di migliaia di righe l'errore si accumula (1e-9 per somma).
- Correzione puntuale: `somma` con `Prisma.Decimal` (`rr.reduce((s,x)=>s.plus(x[k]), new Dec(0))`), stesso per la contestazione.
- Prova che la verifica: liquidazioni.spec.ts esistente "Excel completo: … totali uguali alla pagina".
- Esecutore: DeepSeek V4 Flash — locale
- File toccati: app/backend/src/esporta-liquidazione.ts, app/backend/src/bollettino.ts
- Dipende da / correlato a: V12

### A6-11 — Prova da aggiungere: chiusure e abbinamenti in parallelo (V13)
- Gravità: P2
- Dove: `app/backend/src/liquidazioni.ts:141-149` (chiudi, `FOR UPDATE` sui fornitori), `app/backend/src/bollettino.ts:90-91,270` (stato), `app/backend/src/documenti.ts:1122,1155` (abbina), `:930` (sposta); prove in `test/liquidazioni.spec.ts`, `test/bollettino.spec.ts`, `test/documenti-pratica.spec.ts`
- Problema: i blocchi `SELECT … FOR UPDATE` ci sono ma nessuna prova lancia due richieste insieme (l'unica prova di concorrenza è `integra.spec.ts:261`).
- Scenario da provare: `Promise.allSettled([chiudi(2026,3), chiudi(2026,3)])` → una 201 e una 409, **una** riga in `liquidazioni` e documenti legati una volta; due `PUT /bollettini/:id/stato` «verificato» insieme → una 200 e una 409, righe congelate una volta; lo stesso documento abbinato a due pratiche diverse insieme → uno solo riesce.
- Correzione puntuale: tre `it(...)` con `Promise.allSettled` su due agenti supertest della stessa sessione, controllando stati HTTP e conteggi in tabella.
- Prova che la verifica: i tre `it` nuovi, poi `npm test` completo.
- Esecutore: DeepSeek V4 Flash — prove su logica già scritta.
- File toccati: `app/backend/test/liquidazioni.spec.ts`, `app/backend/test/bollettino.spec.ts`, `app/backend/test/documenti-pratica.spec.ts`
- Dipende da / correlato a: V13, D-36, A4-08, A3-08

**Nota del pacchetto.** A6-11 aggiunge solo prove. Se una prova di concorrenza fallisce perché il blocco manca davvero, **non** correggere il codice qui: scrivilo nel resoconto (è un difetto V13 da pacchetto V4).

## File ammessi (solo questi)

- `app/backend/src/bollettino.ts`
- `app/backend/src/esporta-liquidazione.ts`
- `app/backend/test/bollettino.spec.ts`
- `app/backend/test/liquidazioni.spec.ts`
- `app/backend/test/documenti-pratica.spec.ts`
- `strumenti/opencode/resoconto-collaudo-2-04.md`

## File vietati

Li modificano altri pacchetti della **stessa onda**, in parallelo:

- `app/backend/package-lock.json`
- `app/backend/package.json`
- `app/backend/prisma/lettura-prova.ts`
- `app/backend/src/documenti.ts`
- `app/backend/src/eventi.ts`
- `app/backend/src/incassi.ts`
- `app/backend/src/lettura-prova.ts`
- `app/backend/src/motore/dati.ts`
- `app/backend/src/motore/motore.ts`
- `app/backend/src/solleciti.ts`
- `app/backend/test/eventi.spec.ts`
- `app/backend/test/motore-volumi.spec.ts`
- `app/backend/test/pratiche.spec.ts`
- `app/frontend/app/(app)/analisi/VistaAnalisi.tsx`
- `app/frontend/app/(app)/bollettini/VistaBollettini.tsx`
- `app/frontend/app/(app)/clienti/VistaClienti.tsx`
- `app/frontend/app/(app)/documenti/VistaDocumenti.tsx`
- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`
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
- `app/frontend/eslint.config.mjs`
- `app/frontend/lib/api.ts`
- `app/frontend/lib/stati.ts`
- `app/frontend/package-lock.json`
- `app/frontend/package.json`
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

Lavora **solo** sul tuo database di prova `decobrands_test_2_04` (il nome contiene `decobrands_test`, come vuole
`app/backend/test/ambiente.ts`, che legge `DATABASE_URL_TEST`). Altri pacchetti della stessa onda lanciano jest
nello stesso momento su database loro: sul database condiviso `decobrands_test` due giri si cancellano i dati a
vicenda (A6-05). Anche la cartella dei documenti di prova va separata: `ambiente.ts` la mette in
`os.tmpdir()`, quindi cambia `TMP`/`TEMP`. In Git Bash, da `app/backend`:

```bash
export DATABASE_URL_TEST="$(grep '^DATABASE_URL' .env | cut -d= -f2- | sed 's#/decobrands_db#/decobrands_test_2_04#')"
node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL_TEST.replace('/decobrands_test_2_04','/postgres')});c.connect().then(()=>c.query('CREATE DATABASE decobrands_test_2_04 OWNER decobrands')).then(()=>console.log('creato')).catch(e=>console.log(e.message)).finally(()=>c.end())"
DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy
export TMP="$TEMP/decobrands-2-04"; export TEMP="$TMP"; mkdir -p "$TMP"
npx jest test/<file>.spec.ts            # sempre con le variabili sopra nella stessa shell
```

Alla fine cancella il database: lo stesso `node -e` con `DROP DATABASE decobrands_test_2_04`. **Mai** `decobrands_db`, mai il
database `decobrands_test` condiviso, mai Integra (192.168.239.49: non si contatta per nessun motivo).

Prove da far passare:

- backend: `cd app/backend && npx jest test/bollettino.spec.ts test/liquidazioni.spec.ts test/documenti-pratica.spec.ts` (con le variabili sopra) → **0 KO**;
- `cd app/backend && npx tsc --noEmit` → 0 errori;
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-2-04.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
