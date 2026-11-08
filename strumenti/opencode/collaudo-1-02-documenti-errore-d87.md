# Collaudo · Onda 1 · Pacchetto 1-02 — Documenti: D-87 sulla fattura, documento in errore recuperabile, corpo non valido

Data: 08/11/2026 · **Esecutore: DeepSeek V4** · Gravità del pacchetto: **P1** · Rilievi: A2-04, A4-01, A4-13 · Piano: `strumenti/collaudo/piano-correzioni.md`.

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

### A2-04 — Fattura con data fuori dall'agenzia: provvigione a 0 in silenzio (D-87 solo sull'ordine)
- Gravità: P1
- Dove: app/backend/src/documenti.ts:1088-1098 (`nuovaPratica`: controllo agenzia/scaglione alla data dell'**ordine**);
  nessun controllo alla registrazione di fattura/nota (`importoValido` :782); effetto motore.ts:340, :367 (`if (!percentuali) continue`)
- Problema: il motore calcola alla data del documento fiscale (D-35); se a quella data non c'è agenzia o scaglione,
  la fattura sparisce da liquidazione e Analisi e nel bollettino risulta "noi 0 %". D-87 vieta proprio lo 0 % in silenzio.
- Scenario: ordine del 20/06/2026, agenzia valida fino al 01/07/2026 (esclusa), nessuna agenzia dopo. Fattura 5.000 €
  del 10/07/2026: nessuna riga in liquidazione, nessun fatto in Analisi, nel bollettino di luglio "noi 0,00 €" →
  differenza da accettare a mano.
- Correzione puntuale: nella registrazione (e modifica di data) di `fattura`/`nota_credito` in documenti.ts, stessi due
  controlli di :1088-1098 alla data del documento (agenzia valida e scaglione con `sconto_min <= sconto` e
  `valido_dal <= data`); 409 con il testo D-87 ("aggiungi l'agenzia in Clienti / configura lo scaglione").
- Prova che la verifica: app/backend/test/documenti-pratica.spec.ts nuovo caso "fattura dopo la fine dell'agenzia → 409".
- Esecutore: DeepSeek V4 — regola D-87 su più rotte
- File toccati: app/backend/src/documenti.ts, app/backend/test/documenti-pratica.spec.ts
- Dipende da / correlato a: D-87, D-35; eventuale rilievo A4 su D-87

### A4-01 — Un documento in `errore` non si può più né correggere, né abbinare, né rileggere
- Gravità: P1
- Dove: `app/backend/src/documenti.ts:548` (`correggi`: solo `da_controllare`), `documenti.ts:1063` (`registra`: solo `in_coda`/`da_controllare`), `documenti.ts:77` (ricaricare lo stesso file → 409 doppione), `app/backend/src/lettura.ts:359-368`, `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx:305`
- Problema: l'anomalia `lettura.fallita` dice «aprirlo in Documenti e inserire i dati a mano», ma da `errore` l'unica azione ammessa è lo scarto; in più un errore del servizio (chiave scaduta, crediti finiti: 401/402/403/429) brucia i 3 tentativi di **ogni** documento in coda in 45 s.
- Scenario: finiscono i crediti di LlamaCloud → ogni giro (15 s) risponde 402 → tutti i documenti in coda vanno in `errore` dopo 3 giri, con un'anomalia ciascuno → l'operatore apre il documento: niente *Correggi*, `PUT /api/documenti/:id` → 409, `POST /documenti/:id/abbina` → 409, ricaricare il PDF → 409 «Documento già caricato». Resta solo il giro scarta → recupera.
- Correzione puntuale: (1) nuova rotta `POST /api/documenti/:id/rileggi` (`provvigioni.modifica`, transazione con `FOR UPDATE`, solo da `errore`: `stato='in_coda', tentativi=0, errore=null`, chiude `lettura.fallita`, evento `documento/update`); (2) ammettere `errore` in `correggi` (porta a `da_controllare`) e in `registra`; (3) in `leggiDallaCoda`, se l'errore è di servizio (`LetturaFallita` con stato HTTP 401/402/403/429 — farlo portare come proprietà `stato` in `lettore.ts`) rimettere la riga `in_coda` **senza** consumare il tentativo (`tentativi - 1`) e aprire `lettura.non_raggiungibile`; (4) pulsante *Rileggi* nella pagina per `errore`.
- Prova che la verifica: `test/coda.spec.ts` (402 non consuma tentativi), `test/documenti-lettura.spec.ts` (rileggi da `errore`; `PUT` da `errore` → 200), `strumenti/prove/app_documenti.py` (pulsante).
- Esecutore: DeepSeek V4 — più file, backend + frontend, cambio di flusso.
- File toccati: `app/backend/src/documenti.ts`, `app/backend/src/lettura.ts`, `app/backend/src/lettore.ts`, `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`, `app/frontend/lib/guida.ts`, spec §7.9/§8.1/§19, test sopra.
- Dipende da / correlato a: D-66, D-69, D-72, D-74.

### A4-13 — `PUT /api/documenti/:id` con un corpo non oggetto dà 500
- Gravità: P3
- Dove: `app/backend/src/documenti.ts:541-553` (corpo tipizzato con un'interfaccia: il `ValidationPipe` non lo controlla)
- Problema: `'fornitore_id' in testata` con `testata` stringa o numero, oppure una riga `null`, lancia `TypeError` → 500 nel registro errori.
- Scenario: `{"testata":"x","righe":[null]}` → 500 invece di 400.
- Correzione puntuale: in testa a `correggi`: `const ogg = (v) => v != null && typeof v === 'object' && !Array.isArray(v)`; 400 se `b.testata` non è oggetto, se `b.righe` non è un array di oggetti o supera 1000 righe.
- Prova che la verifica: `test/documenti-lettura.spec.ts` — corpo errato → 400.
- Esecutore: DeepSeek V4 Flash.
- File toccati: `app/backend/src/documenti.ts`, `app/backend/test/documenti-lettura.spec.ts`.
- Dipende da / correlato a: D-72, V12.

## File ammessi (solo questi)

- `app/backend/src/documenti.ts`
- `app/backend/src/lettura.ts`
- `app/backend/src/lettore.ts`
- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`
- `app/backend/test/documenti-pratica.spec.ts`
- `app/backend/test/documenti-lettura.spec.ts`
- `app/backend/test/coda.spec.ts`
- `strumenti/prove/app_documenti.py`
- `strumenti/opencode/resoconto-collaudo-1-02.md`

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
- `app/backend/src/errori.filter.ts`
- `app/backend/src/impostazioni-api.ts`
- `app/backend/src/impostazioni.ts`
- `app/backend/src/incassi.ts`
- `app/backend/src/main.ts`
- `app/backend/src/motore/dati.ts`
- `app/backend/src/motore/motore.ts`
- `app/backend/src/oggi.ts`
- `app/backend/src/proposta.ts`
- `app/backend/src/registro-api.ts`
- `app/backend/src/registro.ts`
- `app/backend/src/sistema.ts`
- `app/backend/test/avvio.spec.ts`
- `app/backend/test/blocco.ts`
- `app/backend/test/casella.spec.ts`
- `app/backend/test/correzione.spec.ts`
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
- `app/backend/test/scartati.spec.ts`
- `app/backend/test/seed.spec.ts`
- `app/backend/test/sistema.spec.ts`
- `app/deploy/*`
- `app/deploy/Caddyfile`
- `app/frontend/app/(app)/bollettini/VistaBollettini.tsx`
- `app/frontend/app/(app)/bollettini/[id]/VistaBollettino.tsx`
- `app/frontend/app/(app)/clienti/VistaClienti.tsx`
- `app/frontend/app/(app)/documenti/VistaDocumenti.tsx`
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

Lavora **solo** sul tuo database di prova `decobrands_test_1_02` (il nome contiene `decobrands_test`, come vuole
`app/backend/test/ambiente.ts`, che legge `DATABASE_URL_TEST`). Altri pacchetti della stessa onda lanciano jest
nello stesso momento su database loro: sul database condiviso `decobrands_test` due giri si cancellano i dati a
vicenda (A6-05). Anche la cartella dei documenti di prova va separata: `ambiente.ts` la mette in
`os.tmpdir()`, quindi cambia `TMP`/`TEMP`. In Git Bash, da `app/backend`:

```bash
export DATABASE_URL_TEST="$(grep '^DATABASE_URL' .env | cut -d= -f2- | sed 's#/decobrands_db#/decobrands_test_1_02#')"
node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL_TEST.replace('/decobrands_test_1_02','/postgres')});c.connect().then(()=>c.query('CREATE DATABASE decobrands_test_1_02 OWNER decobrands')).then(()=>console.log('creato')).catch(e=>console.log(e.message)).finally(()=>c.end())"
DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy
export TMP="$TEMP/decobrands-1-02"; export TEMP="$TMP"; mkdir -p "$TMP"
npx jest test/<file>.spec.ts            # sempre con le variabili sopra nella stessa shell
```

Alla fine cancella il database: lo stesso `node -e` con `DROP DATABASE decobrands_test_1_02`. **Mai** `decobrands_db`, mai il
database `decobrands_test` condiviso, mai Integra (192.168.239.49: non si contatta per nessun motivo).

Prove da far passare:

- backend: `cd app/backend && npx jest test/documenti-pratica.spec.ts test/documenti-lettura.spec.ts test/coda.spec.ts test/documenti.spec.ts test/lettura.spec.ts test/lettore.spec.ts` (con le variabili sopra) → **0 KO**;
- `cd app/backend && npx tsc --noEmit` → 0 errori;
- frontend: `cd app/frontend && npx tsc --noEmit` → 0 errori;
- prove nel browser interessate: `app_documenti.py`. **Non lanciarle** (porte e cartella `.next` sono condivise con gli altri pacchetti): aggiorna quelle indicate nei rilievi, controlla la sintassi con `python -m py_compile <file>` e scrivi nel resoconto quali vanno lanciate. Le lancia il controllo di fine onda.
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-1-02.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
