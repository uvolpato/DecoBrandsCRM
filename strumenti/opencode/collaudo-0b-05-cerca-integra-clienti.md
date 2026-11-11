# Collaudo · Onda 0 bis · Pacchetto 0b-05 — Cerca in Integra: dopo Importa si apre la scheda, pulsanti con il nome della riga; Clienti con i filtri su una riga

Data: 11/11/2026 · **Esecutore: DeepSeek V4 Flash** · Gravità del pacchetto: **P3** · Rilievi: R2-09, R2-11, R2-10 · Piano: `strumenti/collaudo/piano-correzioni.md`.

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

## Decisioni di Ugo per questo pacchetto (11/11/2026)

Sono decise: applicale come scritte, non riaprirle. La riga del §19 la scrive il pacchetto documentazione dell'onda (0b-doc).

- **D-135**: **Dopo *Importa* (Cerca in Integra) si apre la scheda del nuovo cliente o fornitore**, come dice la guida; l'`id` arriva nella risposta di `integra/importa`.

## Rilievi da correggere (testo dei report R1/R2; i rilievi R0-D* nascono dalle domande dell'R0 decise da Ugo)

### R2-09 — Guida: Cerca in Integra promette «apre il nuovo» e mancano le azioni nuove del Documento
- Gravità: P3
- Dove: app/frontend/lib/guida.ts (voci Clienti e Fornitori, finestra «Cerca in Integra», azione Importa; argomento Documenti)
- Problema: la guida dice che *Importa* «chiude la finestra, ricarica l'elenco e **apre il nuovo** cliente/fornitore», ma `CercaInIntegra.importa` chiama solo `onImportato` (= `carica`) e non naviga; nel Documento mancano «Importa da Integra» (fornitore e cliente), «Importa dal vecchio CRM» (spento), il caso «Non rappresentato» e i badge della lista Documenti («In Integra», «Non rappresentato», «Manca l'agenzia»); in Fornitori manca «Configura gli scaglioni».
- Scenario: l'utente importa e cerca la scheda aperta che la guida promette.
- Correzione puntuale: o `onImportato(id)` con `router.push('/clienti/' + id)` (l'id arriva nella risposta di `integra/importa`) — più utile —, o togliere «e apre il nuovo …» dalla guida; aggiungere in `guida.ts` (Documenti: pulsanti e «da sapere»; Fornitori: pulsante «Configura gli scaglioni»).
- Prova che la verifica: lettura; se si naviga, Playwright: dopo Importa l'URL è `/clienti/<id>`.
- Esecutore: DeepSeek V4 Flash
- File toccati: app/frontend/lib/guida.ts, app/frontend/componenti/CercaInIntegra.tsx (se si naviga), VistaClienti.tsx, VistaFornitori.tsx
- Dipende da / correlato a: D-111, D-113, regola 3 di CLAUDE.md

> **Per questo pacchetto:** Decisione D-135: si **naviga** (`onImportato(id)` e `router.push('/clienti/' + id)` o `'/fornitori/' + id`). La risposta di `integra/importa` porta l'`id` (0b-01 lo garantisce). La parte della guida (`guida.ts`) **non è tua**: la scrive 0b-doc; metti il testo pronto nel resoconto.

### R2-11 — Cerca in Integra: tutti i pulsanti si chiamano «Importa»
- Gravità: P3
- Dove: app/frontend/componenti/CercaInIntegra.tsx:90-91
- Problema: fino a 10 pulsanti con lo stesso nome accessibile; col lettore di schermo o nell'elenco dei controlli non si sa quale riga importano.
- Scenario: NVDA, elenco pulsanti: «Importa, Importa, Importa…».
- Correzione puntuale: `aria-label={'Importa ' + (x.ragione_sociale || x.codice)}` sul `<button>`.
- Prova che la verifica: Playwright `get_by_role('button', name='Importa <ragione sociale>')`.
- Esecutore: DeepSeek V4 Flash
- File toccati: app/frontend/componenti/CercaInIntegra.tsx
- Dipende da / correlato a: —

### R2-10 — Clienti: barra filtri del prototipo («su una riga») non riportata nell'app
- Gravità: P3
- Dove: prototipo-alternativo/assets/stile.css:238-243 (`.clienti-filtri …`) e viste-anagrafiche.js:271; app/frontend/app/stile/stile.css e app/(app)/clienti/VistaClienti.tsx (nessun `clienti-filtri`)
- Problema: i commit f4f0d84/5d820ee mettono ricerca e segmenti di Clienti su una riga nel prototipo; nell'app le regole CSS e la classe sul contenitore mancano, quindi i due `stile.css` divergono e l'app non segue il prototipo.
- Scenario: Clienti a 1440 px nell'app: segmenti a capo sotto la ricerca, nel prototipo sulla stessa riga.
- Correzione puntuale: copiare le 6 righe `.clienti-filtri …` nello `stile.css` dell'app (dopo `.soggetti-filtri`) e aggiungere `clienti-filtri` al `div.pila.riempi` della colonna sinistra di VistaClienti (riga ~192).
- Prova che la verifica: schermata Playwright 1440/768 di `/clienti`.
- Esecutore: DeepSeek V4 Flash
- File toccati: app/frontend/app/stile/stile.css, app/frontend/app/(app)/clienti/VistaClienti.tsx
- Dipende da / correlato a: D-22, D-24

> **Per questo pacchetto:** Copia le regole `.clienti-filtri` **identiche** dallo `stile.css` del prototipo (il prototipo non si tocca). Prima un `grep` della classe nello `stile.css` dell'app (CLAUDE.md §3).

**Controllo.** Pacchetto non sensibile: a fine onda Claude Code fa la review leggera (rilettura del diff) e il controllo visivo a 1440 e 768 px.

## File ammessi (solo questi)

- `app/frontend/componenti/CercaInIntegra.tsx`
- `app/frontend/app/(app)/clienti/VistaClienti.tsx`
- `app/frontend/app/(app)/fornitori/VistaFornitori.tsx`
- `app/frontend/app/stile/stile.css`
- `strumenti/prove/app_clienti.py`
- `strumenti/prove/app_fornitori.py`
- `strumenti/opencode/resoconto-collaudo-0b-05.md`

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
- `app/frontend/app/(app)/documenti/VistaDocumenti.tsx`
- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`
- `app/frontend/app/(app)/soggetti/VistaSoggetti.tsx`
- `app/frontend/componenti/FormAgenzia.tsx`
- `strumenti/prove/app_documenti.py`
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

Lavora **solo** sul tuo database di prova `decobrands_test_0b_05` (il nome contiene `decobrands_test`, come vuole
`app/backend/test/ambiente.ts`, che legge `DATABASE_URL_TEST`). Altri pacchetti della stessa onda lanciano jest
nello stesso momento su database loro: sul database condiviso `decobrands_test` due giri si cancellano i dati a
vicenda (A6-05). Anche la cartella dei documenti di prova va separata: `ambiente.ts` la mette in
`os.tmpdir()`, quindi cambia `TMP`/`TEMP`. In Git Bash, da `app/backend`:

```bash
export DATABASE_URL_TEST="$(grep '^DATABASE_URL' .env | cut -d= -f2- | sed 's#/decobrands_db#/decobrands_test_0b_05#')"
node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL_TEST.replace('/decobrands_test_0b_05','/postgres')});c.connect().then(()=>c.query('CREATE DATABASE decobrands_test_0b_05 OWNER decobrands')).then(()=>console.log('creato')).catch(e=>console.log(e.message)).finally(()=>c.end())"
DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy
export TMP="$TEMP/decobrands-0b-05"; export TEMP="$TMP"; mkdir -p "$TMP"
npx jest test/<file>.spec.ts            # sempre con le variabili sopra nella stessa shell
```

Alla fine cancella il database: lo stesso `node -e` con `DROP DATABASE decobrands_test_0b_05`. **Mai** `decobrands_db`, mai il
database `decobrands_test` condiviso, mai Integra (192.168.239.49: non si contatta per nessun motivo).

Prove da far passare:

- backend: nessuna prova jest (pacchetto solo frontend): il database di prova non serve;
- `cd app/backend && npx tsc --noEmit` → 0 errori;
- frontend: `cd app/frontend && npx tsc --noEmit` → 0 errori;
- prove nel browser interessate: `app_clienti.py`, `app_fornitori.py` (dopo *Importa* l'URL è `/clienti/<id>` o `/fornitori/<id>`; pulsanti `Importa <ragione sociale>`). **Non lanciarle** (porte e cartella `.next` sono condivise con gli altri pacchetti): aggiorna quelle indicate nei rilievi, controlla la sintassi con `python -m py_compile <file>` e scrivi nel resoconto quali vanno lanciate. Le lancia il controllo di fine onda.
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-0b-05.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
