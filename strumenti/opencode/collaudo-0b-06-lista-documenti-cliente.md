# Collaudo · Onda 0 bis · Pacchetto 0b-06 — Lista Documenti: segno «Cliente in Integra»

Data: 11/11/2026 · **Esecutore: DeepSeek V4 Flash** · Gravità del pacchetto: **P3** · Rilievi: R2-12 · Piano: `strumenti/collaudo/piano-correzioni.md`.

Si lancia **dopo** la chiusura dell'onda 0 (migrazioni 0-01 → 0-05) e **prima** dell'onda 1. Fonte: `strumenti/collaudo/report/R0-ultime-modifiche.md`, `R1-backend-ultime.md`, `R2-frontend-ultime.md` (commit 89a4105..e879c62). I pacchetti dell'onda 0 bis lavorano in parallelo e non hanno file in comune. Dipende da: —.

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
- I numeri di riga dei report R1/R2 sono dell'11/11 (commit `e879c62`); prima di te passano le migrazioni dell'onda 0.
  **Rileggi il codice attuale.** Se un rilievo risulta già corretto, scrivilo nel resoconto e non cambiare nulla.
- **Integra (192.168.239.49) non si contatta mai**: nelle prove il ponte è sempre simulato (pool finto o `jest.spyOn`), nessun `PONTE_URL` vero.

## Rilievi da correggere (testo dei report R1/R2; i rilievi R0-D* nascono dalle domande dell'R0 decise da Ugo)

### R2-12 — Lista Documenti: il cliente da importare non ha il suo segno
- Gravità: P3
- Dove: app/frontend/app/(app)/documenti/VistaDocumenti.tsx:20-25 (blocco `stato`)
- Problema: l'interfaccia riceve `cliente_da_integra` ma mostra solo «In Integra» per il fornitore; un documento con esito `cliente_da_integra` in lista non dice che c'è un cliente da importare.
- Scenario: fattura con cliente non in anagrafica ma presente in Integra → in lista nessun segno; si scopre solo aprendo il documento.
- Correzione puntuale: aggiungere `d.cliente_da_integra` alla condizione e `{d.cliente_da_integra ? <Stato v="info">Cliente in Integra</Stato> : null}` (e il testo «In Integra» del fornitore diventa «Fornitore in Integra» per distinguerli).
- Prova che la verifica: Playwright sulla lista Documenti con il seed del caso.
- Esecutore: DeepSeek V4 Flash
- File toccati: app/frontend/app/(app)/documenti/VistaDocumenti.tsx, guida.ts
- Dipende da / correlato a: R2-09, D-111

> **Per questo pacchetto:** Solo `VistaDocumenti.tsx`. Il testo della guida lo scrive 0b-doc: mettilo pronto nel resoconto.

**Controllo.** Pacchetto non sensibile: a fine onda Claude Code fa la review leggera (rilettura del diff) e il controllo visivo a 1440 e 768 px.

## File ammessi (solo questi)

- `app/frontend/app/(app)/documenti/VistaDocumenti.tsx`
- `strumenti/opencode/resoconto-collaudo-0b-06.md`

## File vietati

Li modificano altri pacchetti della **stessa onda** (0 bis), in parallelo:

- `app/backend/prisma/import-storico.ts`
- `app/backend/src/anagrafica-integra.ts`
- `app/backend/src/clienti.ts`
- `app/backend/src/documenti.ts`
- `app/backend/src/fornitori.ts`
- `app/backend/src/integra.ts`
- `app/backend/src/proposta.ts`
- `app/backend/src/soggetti.ts`
- `app/backend/src/storico.ts`
- `app/backend/test/anagrafica-integra.spec.ts`
- `app/backend/test/clienti.spec.ts`
- `app/backend/test/documenti-pratica.spec.ts`
- `app/backend/test/documenti.spec.ts`
- `app/backend/test/fornitori.spec.ts`
- `app/backend/test/integra.spec.ts`
- `app/backend/test/proposta.spec.ts`
- `app/backend/test/soggetti.spec.ts`
- `app/backend/test/storico.spec.ts`
- `app/frontend/app/(app)/clienti/VistaClienti.tsx`
- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`
- `app/frontend/app/(app)/fornitori/VistaFornitori.tsx`
- `app/frontend/app/(app)/soggetti/VistaSoggetti.tsx`
- `app/frontend/app/stile/stile.css`
- `app/frontend/componenti/CercaInIntegra.tsx`
- `app/frontend/componenti/FormAgenzia.tsx`
- `strumenti/prove/app_clienti.py`
- `strumenti/prove/app_documenti.py`
- `strumenti/prove/app_fornitori.py`
- `strumenti/prove/app_soggetti.py`

Documentazione (la scrive il **pacchetto documentazione** dell'onda, 0b-doc, dopo di te: tu metti il testo pronto nel resoconto, sezione *Da documentare*):

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

Lavora **solo** sul tuo database di prova `decobrands_test_0b_06` (il nome contiene `decobrands_test`, come vuole
`app/backend/test/ambiente.ts`, che legge `DATABASE_URL_TEST`). Altri pacchetti della stessa onda lanciano jest
nello stesso momento su database loro: sul database condiviso `decobrands_test` due giri si cancellano i dati a
vicenda (A6-05). Anche la cartella dei documenti di prova va separata: `ambiente.ts` la mette in
`os.tmpdir()`, quindi cambia `TMP`/`TEMP`. In Git Bash, da `app/backend`:

```bash
export DATABASE_URL_TEST="$(grep '^DATABASE_URL' .env | cut -d= -f2- | sed 's#/decobrands_db#/decobrands_test_0b_06#')"
node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL_TEST.replace('/decobrands_test_0b_06','/postgres')});c.connect().then(()=>c.query('CREATE DATABASE decobrands_test_0b_06 OWNER decobrands')).then(()=>console.log('creato')).catch(e=>console.log(e.message)).finally(()=>c.end())"
DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy
export TMP="$TEMP/decobrands-0b-06"; export TEMP="$TMP"; mkdir -p "$TMP"
npx jest test/<file>.spec.ts            # sempre con le variabili sopra nella stessa shell
```

Alla fine cancella il database: lo stesso `node -e` con `DROP DATABASE decobrands_test_0b_06`. **Mai** `decobrands_db`, mai il
database `decobrands_test` condiviso, mai Integra (192.168.239.49: non si contatta per nessun motivo).

Prove da far passare:

- backend: nessuna prova jest (pacchetto solo frontend): il database di prova non serve;
- `cd app/backend && npx tsc --noEmit` → 0 errori;
- frontend: `cd app/frontend && npx tsc --noEmit` → 0 errori;
- prove nel browser interessate: `app_documenti.py` (non modificarla: è di 0b-01; scrivi nel resoconto il caso da guardare a fine onda). **Non lanciarle** (porte e cartella `.next` sono condivise con gli altri pacchetti): aggiorna quelle indicate nei rilievi, controlla la sintassi con `python -m py_compile <file>` e scrivi nel resoconto quali vanno lanciate. Le lancia il controllo di fine onda.
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-0b-06.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
