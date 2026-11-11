# Collaudo · Onda 7 · Pacchetto 7-01 — Aiuti copiati in un solo modulo (dataIt, MESI, ELENCO_ID, MESE) e commenti ponytail chiusi

Data: 08/11/2026 · **Esecutore: DeepSeek V4 Flash** · Gravità del pacchetto: **P3** · Rilievi: A8-07, A8-12, A8-13 · Piano: `strumenti/collaudo/piano-correzioni.md`.

Si lancia **dopo** il commit del lavoro f7 e la chiusura dell'onda precedente. Dipende da: 4-04 (`collaudo-4-04-formati-backend.md`), 1-13 (`collaudo-1-13-registro.md`), 2-05 (`collaudo-2-05-bollettino-somme-concorrenza.md`), 3-06 (`collaudo-3-06-carichi-oggi-liquidazioni.md`), 2-09 (`collaudo-2-09-motore-indici.md`).

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

### A8-07 — Aiuti e controlli copiati fra i moduli
- Gravità: P3
- Dove: backend `dataIt` ×8 (`analisi`, `bollettino`, `esporta-liquidazione`, `incassi`, `liquidazioni`, `oggi`,
  `pratiche`, `solleciti`), `MESI` ×4 (`analisi`, `bollettino`, `liquidazioni`, `oggi`), regex `ELENCO_ID` ×4
  (`analisi:27`, `bollettini:15`, `pratiche:21`, `registro-api:20`) e `MESE` ×2; frontend `mpiu`/`mk` ×3
  (`analisi/VistaAnalisi.tsx:25`, `bollettini/VistaBollettini.tsx:24`, `componenti/PeriodoMesi.tsx:11`)
- Problema: oggi uguali; `ELENCO_ID` è un controllo d'ingresso: se lo si stringe in un file gli altri tre restano larghi.
- Scenario: si decide di limitare la selezione multipla a 200 id: va cambiato in 4 file, uno sfugge.
- Correzione puntuale: backend in `formati.ts` di A8-01 (`dataIt`, `MESI`) e in un `validazione.ts` (o lo
  stesso file) `ELENCO_ID`, `MESE`; frontend esportare `mpiu`/`mk` da `PeriodoMesi.tsx` e importarli nelle due viste.
- Prova che la verifica: `npm test`; `strumenti/prove/app_bollettini.py`, `app_analisi.py`.
- Esecutore: DeepSeek V4 Flash — spostamento senza cambio di logica
- File toccati: quelli elencati + `backend/src/formati.ts`
- Dipende da / correlato a: A8-01 (fare dopo, stesso file nuovo)

> **Per questo pacchetto:** In questo pacchetto **solo il backend**: `dataIt` e `MESI` in `app/backend/src/formati.ts` (creato dal pacchetto dei formati), `ELENCO_ID` e `MESE` in un nuovo `app/backend/src/validazione.ts`. `mpiu`/`mk` del frontend sono in un altro pacchetto.

### A8-12 — Commenti `ponytail:` senza tetto né uscita
- Gravità: P3
- Dove: `app/backend/src/bollettino.ts:87`, `app/backend/src/liquidazioni.ts:150`
- Problema: non sono scorciatoie ma spiegazioni dell'ordine dei blocchi (V13): non nominano limite né quando
  rivederli, quindi nel registro del debito restano aperti per sempre.
- Scenario: chi fa la pulizia dei `ponytail:` li «chiude» togliendo il blocco `FOR UPDATE` credendolo provvisorio.
- Correzione puntuale: trasformarli in commenti normali con il riferimento (`// V13, D-36: …`). Non toccare il codice.
- Prova che la verifica: nessuna (solo commento).
- Esecutore: DeepSeek V4 Flash — commenti
- File toccati: `bollettino.ts`, `liquidazioni.ts`
- Dipende da / correlato a: D-36, A3

### A8-13 — Cinque `ponytail:` sullo stesso tetto (`caricaDati` carica tutto)
- Gravità: P3
- Dove: `motore/dati.ts:6`, `analisi.ts:18`, `liquidazioni.ts:15`, `liquidazioni.ts:147`, `liquidazioni.ts:198`
- Problema: lo stesso limite è scritto cinque volte con soglie diverse («supera il secondo», «costa secondi»,
  «quando i dati crescono»): nessuna è misurabile tranne la prima.
- Scenario: A7 o il carico (`test/carico-pratiche.ts`) mostra 3 s sulla liquidazione: non è chiaro quale
  commento scatta e chi decide.
- Correzione puntuale: un solo `ponytail:` in `motore/dati.ts` con soglia unica e misurabile
  (es. «> 1 s con `test/carico-pratiche.ts` a N pratiche → filtrare per periodo/fornitore»); negli altri
  quattro `// vedi caricaDati (motore/dati.ts)`.
- Prova che la verifica: nessuna (commenti); il numero lo dà A7.
- Esecutore: DeepSeek V4 Flash — commenti
- File toccati: i cinque elencati
- Dipende da / correlato a: A7, A8-12 (stesso `liquidazioni.ts`)

**Nota del pacchetto.** Spostamenti e commenti, **nessun cambio di logica**: per questo il pacchetto supera gli 8 file (13). Per A8-12/A8-13 `git diff -w` di quei punti mostra solo righe di commento.

## File ammessi (solo questi)

- `app/backend/src/formati.ts`
- `app/backend/src/validazione.ts`
- `app/backend/src/analisi.ts`
- `app/backend/src/bollettino.ts`
- `app/backend/src/esporta-liquidazione.ts`
- `app/backend/src/incassi.ts`
- `app/backend/src/liquidazioni.ts`
- `app/backend/src/oggi.ts`
- `app/backend/src/pratiche.ts`
- `app/backend/src/solleciti.ts`
- `app/backend/src/bollettini.ts`
- `app/backend/src/registro-api.ts`
- `app/backend/src/motore/dati.ts`
- `strumenti/opencode/resoconto-collaudo-7-01.md`

## File vietati

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

Lavora **solo** sul tuo database di prova `decobrands_test_7_01` (il nome contiene `decobrands_test`, come vuole
`app/backend/test/ambiente.ts`, che legge `DATABASE_URL_TEST`). Altri pacchetti della stessa onda lanciano jest
nello stesso momento su database loro: sul database condiviso `decobrands_test` due giri si cancellano i dati a
vicenda (A6-05). Anche la cartella dei documenti di prova va separata: `ambiente.ts` la mette in
`os.tmpdir()`, quindi cambia `TMP`/`TEMP`. In Git Bash, da `app/backend`:

```bash
export DATABASE_URL_TEST="$(grep '^DATABASE_URL' .env | cut -d= -f2- | sed 's#/decobrands_db#/decobrands_test_7_01#')"
node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL_TEST.replace('/decobrands_test_7_01','/postgres')});c.connect().then(()=>c.query('CREATE DATABASE decobrands_test_7_01 OWNER decobrands')).then(()=>console.log('creato')).catch(e=>console.log(e.message)).finally(()=>c.end())"
DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy
export TMP="$TEMP/decobrands-7-01"; export TEMP="$TMP"; mkdir -p "$TMP"
npx jest test/<file>.spec.ts            # sempre con le variabili sopra nella stessa shell
```

Alla fine cancella il database: lo stesso `node -e` con `DROP DATABASE decobrands_test_7_01`. **Mai** `decobrands_db`, mai il
database `decobrands_test` condiviso, mai Integra (192.168.239.49: non si contatta per nessun motivo).

Prove da far passare:

- backend: `cd app/backend && npx jest test/analisi.spec.ts test/bollettino.spec.ts test/bollettini.spec.ts test/liquidazioni.spec.ts test/incassi.spec.ts test/oggi.spec.ts test/pratiche.spec.ts test/registro-api.spec.ts` (con le variabili sopra) → **0 KO**;
- `cd app/backend && npx tsc --noEmit` → 0 errori;
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-7-01.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
