# Collaudo · Onda 5 · Pacchetto 5-05 — Correzioni di un bollettino contestato nel mese dopo

Data: 08/11/2026 · **Esecutore: DeepSeek V4** · Gravità del pacchetto: **P2** · Rilievi: U6 · Piano: `strumenti/collaudo/piano-correzioni.md`.

Si lancia **dopo** il commit del lavoro f7 e la chiusura dell'onda precedente. Dipende da: 2-05 (`collaudo-2-05-bollettino-somme-concorrenza.md`), 2-09 (`collaudo-2-09-motore-indici.md`), 3-07 (`collaudo-3-07-nc-maturato.md`).

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

## Decisioni di Ugo per questo pacchetto (08/11/2026)

Sono decise: applicale come scritte, non riaprirle. La riga del §19 la scrive il pacchetto documentazione dell'onda.

- **U6 → D-119**: **Le correzioni di un bollettino contestato arrivano nel bollettino del mese dopo.** Il bollettino contestato non si riapre e non si sostituisce (D-56, uno per fornitore e mese): le correzioni del fornitore sono righe del bollettino del mese successivo riferite ai documenti del mese contestato, e si riconciliano contro quei documenti.

## Rilievi da correggere (testo dei report del collaudo; i rilievi U* nascono dalle decisioni di Ugo)

### U6 — Correzioni di un bollettino contestato nel bollettino del mese dopo (D-119)
- Gravità: P2
- Dove: `app/backend/src/bollettino.ts` (azione proposta per lo stato `contestato`: «in attesa del bollettino rettificato»), `app/backend/src/motore/motore.ts` (`riconcilia`, `documentoDiRiga`)
- Problema: il bollettino contestato dice di aspettare un bollettino rettificato, che non si può caricare (vincolo fornitore × mese, D-56).
- Scenario: bollettino di luglio di Gries contestato; Gries manda le correzioni → un secondo bollettino di luglio dà 409 (`bollettini.ts:155-158`); l'azione resta «in attesa» per sempre (A2, *Da decidere* 2).
- Correzione puntuale: (1) testo dell'azione e dello stato del bollettino contestato: «Le correzioni del fornitore arrivano nel bollettino di <mese dopo>»; (2) prova nel motore che una riga del bollettino del mese M+1 con `documento_id` di un documento del mese M si riconcilia contro quel documento (confronto della provvigione, non «non abbinata»). Se il motore lo fa già: solo la prova. Se no: `riconcilia` accetta righe di documenti di mesi precedenti dello stesso fornitore, senza cambiare le altre regole. Le righe del bollettino le crea la prova (l'importazione delle righe non c'è ancora: attività nuova U9).
- Prova che la verifica: `app/backend/test/motore.spec.ts` (riga del mese dopo riconciliata) e `app/backend/test/bollettino.spec.ts` (testo dell'azione del contestato).
- Esecutore: DeepSeek V4 — riconciliazione dei bollettini.
- File toccati: `app/backend/src/bollettino.ts`, `app/backend/src/motore/motore.ts`, `app/backend/test/bollettino.spec.ts`, `app/backend/test/motore.spec.ts`
- Dipende da / correlato a: D-56 → D-119; U9 (righe dei bollettini)

**Nota del pacchetto.** Le righe dei bollettini nel database oggi arrivano solo dal seed (la loro creazione è l'attività nuova U9): nella prova creale a mano.

## File ammessi (solo questi)

- `app/backend/src/bollettino.ts`
- `app/backend/src/motore/motore.ts`
- `app/backend/test/bollettino.spec.ts`
- `app/backend/test/motore.spec.ts`
- `strumenti/opencode/resoconto-collaudo-5-05.md`

## File vietati

Li modificano altri pacchetti della **stessa onda**, in parallelo:

- `app/backend/src/analisi.ts`
- `app/backend/src/documenti.ts`
- `app/backend/src/liquidazioni.ts`
- `app/backend/test/analisi.spec.ts`
- `app/backend/test/documenti-pratica.spec.ts`
- `app/backend/test/liquidazioni.spec.ts`
- `app/frontend/app/(app)/analisi/VistaAnalisi.tsx`
- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`
- `app/frontend/app/(app)/liquidazioni/VistaLiquidazioni.tsx`
- `app/frontend/app/(app)/pratiche/VistaPratiche.tsx`
- `app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx`
- `app/frontend/componenti/DataTable.tsx`
- `app/frontend/componenti/Flussi.tsx`
- `app/frontend/lib/memoria.ts`
- `strumenti/prove/app_liquidazioni.py`
- `strumenti/prove/app_pratiche.py`

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

Lavora **solo** sul tuo database di prova `decobrands_test_5_05` (il nome contiene `decobrands_test`, come vuole
`app/backend/test/ambiente.ts`, che legge `DATABASE_URL_TEST`). Altri pacchetti della stessa onda lanciano jest
nello stesso momento su database loro: sul database condiviso `decobrands_test` due giri si cancellano i dati a
vicenda (A6-05). Anche la cartella dei documenti di prova va separata: `ambiente.ts` la mette in
`os.tmpdir()`, quindi cambia `TMP`/`TEMP`. In Git Bash, da `app/backend`:

```bash
export DATABASE_URL_TEST="$(grep '^DATABASE_URL' .env | cut -d= -f2- | sed 's#/decobrands_db#/decobrands_test_5_05#')"
node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL_TEST.replace('/decobrands_test_5_05','/postgres')});c.connect().then(()=>c.query('CREATE DATABASE decobrands_test_5_05 OWNER decobrands')).then(()=>console.log('creato')).catch(e=>console.log(e.message)).finally(()=>c.end())"
DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy
export TMP="$TEMP/decobrands-5-05"; export TEMP="$TMP"; mkdir -p "$TMP"
npx jest test/<file>.spec.ts            # sempre con le variabili sopra nella stessa shell
```

Alla fine cancella il database: lo stesso `node -e` con `DROP DATABASE decobrands_test_5_05`. **Mai** `decobrands_db`, mai il
database `decobrands_test` condiviso, mai Integra (192.168.239.49: non si contatta per nessun motivo).

Prove da far passare:

- backend: `cd app/backend && npx jest test/bollettino.spec.ts test/motore.spec.ts test/seed.spec.ts` (con le variabili sopra) → **0 KO**;
- `cd app/backend && npx tsc --noEmit` → 0 errori;
- prove nel browser interessate: `app_bollettino.py`. **Non lanciarle** (porte e cartella `.next` sono condivise con gli altri pacchetti): aggiorna quelle indicate nei rilievi, controlla la sintassi con `python -m py_compile <file>` e scrivi nel resoconto quali vanno lanciate. Le lancia il controllo di fine onda.
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-5-05.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
