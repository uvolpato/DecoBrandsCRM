# Collaudo · Onda 3 · Pacchetto 3-06 — Meno caricamenti completi: conteggi della barra in SQL, Oggi raggruppato, report nella stessa richiesta

Data: 08/11/2026 · **Esecutore: DeepSeek V4** · Gravità del pacchetto: **P2** · Rilievi: A7-20, A7-22 · Piano: `strumenti/collaudo/piano-correzioni.md`.

Si lancia **dopo** il commit del lavoro f7 e la chiusura dell'onda precedente. Dipende da: 1-01 (`collaudo-1-01-motore-storni-mese.md`), 1-06 (`collaudo-1-06-oggi-bollettini-documenti.md`), 2-04 (`collaudo-2-04-eventi-dal-vivo.md`).

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

### A7-20 — Ogni cambio di pagina carica tutto il database per i numeri della barra
- Gravità: P2 (ipotesi)
- Dove: `app/frontend/componenti/Barra.tsx:77-91` (si rilegge a ogni `percorso`); `app/backend/src/oggi.ts:268-272` → `caricaDati` (`motore/dati.ts:75-88`)
- Problema: `GET /api/oggi/conteggi` legge **tutte** le pratiche con righe e documenti e tutti i bollettini con le righe, e poi fa passare il motore su tutto (`confermeInRitardo`, `pagamentiDaSollecitare` e un'altra volta `statoPratica` su ogni pratica). Succede a ogni clic nel menu, per ogni utente.
- Scenario: con 3 anni di dati (circa 5.000 pratiche e 15.000 documenti) ogni navigazione legge decine di MB da Postgres in Node. Aprendo Oggi i caricamenti completi sono 2 (pagina e barra); con Liquidazioni 3 (vedi A7-22). Il tempo cresce in modo lineare o peggio (A7-21).
- Correzione puntuale:
  1. Frontend: in `Barra.tsx` le dipendenze dell'effetto diventano `[useEventi().provvigioni]` e non `[percorso]`: si rilegge quando il server segnala un cambiamento, non a ogni pagina.
  2. Backend: in `conteggiBarra` i conteggi `pratiche`/`conferme` si fanno con la stessa SQL dello stato `scaduta` di `pratiche.ts:113-118`, senza `caricaDati`. Solo `pagamenti` resta sul motore, con una cache in memoria che vale finché non cambia `max(registro.id)` (`SELECT max(id) FROM registro`, che costa poco).
- Prova che la verifica: un seme moltiplicato (script che copia 50 volte le pratiche del seme §12 in `decobrands_test`), poi `curl -s -o /dev/null -w '%{time_total}\n' -b cookies.txt http://127.0.0.1:8002/api/oggi/conteggi` prima e dopo. I numeri devono restare quelli di `app_oggi.py` e `app_guscio.py`.
- Esecutore: DeepSeek V4. Backend e frontend insieme, conteggi legati alle regole di stato.
- File toccati: `app/frontend/componenti/Barra.tsx`, `app/backend/src/oggi.ts`
- Dipende da / correlato a: A7-21, A7-22; commento `ponytail:` in `motore/dati.ts:6-7` (debito noto, A8)

> **Per questo pacchetto:** Solo la **parte 2 (backend)**: conteggi `pratiche`/`conferme` di `conteggiBarra` in SQL (stessa condizione di `pratiche.ts:113-118`), `pagamenti` con la cache su `max(registro.id)`. La parte 1 (Barra che si rilegge solo all'evento) **non si fa** (decisione U20): non toccare `Barra.tsx`.

### A7-22 — Oggi si ricarica intero a ogni evento in ogni scheda aperta; Liquidazioni fa 3 caricamenti completi
- Gravità: P2 (ipotesi)
- Dove: `app/frontend/app/(app)/oggi/VistaOggi.tsx:64-79` (a ogni `vEventi` → `GET /api/oggi` → `caricaDati`); `liquidazioni/VistaLiquidazioni.tsx:76,94` (`liquidazioni` e `liquidazione/report` partono insieme, ognuno con `caricaDati`, più la barra)
- Problema: il canale SSE manda un evento per ogni operazione del registro (`eventi.ts:125`, controllo ogni 4 s). Ogni scheda aperta su Oggi risponde con un caricamento completo.
- Scenario: 5 utenti con Oggi aperto e un collega che verifica 20 righe di bollettino in un minuto → fino a 15 eventi ogni 4 s × 5 schede, cioè decine di `caricaDati` al minuto senza che nessuno clicchi. Aprire Liquidazioni Q3 costa 3 caricamenti completi più `analisiTrimestre` ×2–7.
- Correzione puntuale: in `VistaOggi` raggruppare gli eventi, così ne parte una sola rilettura ogni 2 s (un `setTimeout` che riparte a ogni evento). Nel backend un'unica `caricaDati` per richiesta di pagina: `GET /api/oggi` restituisce anche i `conteggi` della barra (la barra li prende da lì quando la pagina è Oggi). In Liquidazioni il report si calcola nella stessa richiesta (`?report=1`), oppure `reportSubagenti` riceve `S` già caricato.
- Prova che la verifica: Playwright con 3 contesti su Oggi e 20 operazioni dal quarto: si contano le richieste `GET /api/oggi` (`page.on('request')`), che devono essere ≤ 3 per contesto.
- Esecutore: DeepSeek V4. Frontend e backend.
- File toccati: `VistaOggi.tsx`, `oggi.ts`, `VistaLiquidazioni.tsx`, `liquidazioni.ts`
- Dipende da / correlato a: A7-20, D-23

> **Per questo pacchetto:** Senza la parte «la barra li prende da lì» (niente `Barra.tsx`). In Liquidazioni il report si calcola nella stessa richiesta o riceve `S` già caricato.

**Nota del pacchetto.** Ipotesi di prestazioni (A7): i **numeri** non devono cambiare (`oggi.spec.ts`, `app_f7_numeri.py`: conteggi barra = Oggi). Nel resoconto metti i tempi prima/dopo con `test/carico-pratiche.ts`, se riesci.

## File ammessi (solo questi)

- `app/backend/src/oggi.ts`
- `app/backend/test/oggi.spec.ts`
- `app/frontend/app/(app)/oggi/VistaOggi.tsx`
- `app/frontend/app/(app)/liquidazioni/VistaLiquidazioni.tsx`
- `app/backend/src/liquidazioni.ts`
- `app/backend/test/liquidazioni.spec.ts`
- `strumenti/opencode/resoconto-collaudo-3-06.md`

## File vietati

Li modificano altri pacchetti della **stessa onda**, in parallelo:

- `app/backend/src/accesso.ts`
- `app/backend/src/app.module.ts`
- `app/backend/src/casella.ts`
- `app/backend/src/documenti.ts`
- `app/backend/src/impostazioni.ts`
- `app/backend/src/motore/motore.ts`
- `app/backend/test/accesso.spec.ts`
- `app/backend/test/casella.spec.ts`
- `app/backend/test/documenti.spec.ts`
- `app/backend/test/impostazioni.spec.ts`
- `app/backend/test/motore.spec.ts`
- `app/frontend/app/(app)/[...resto]/page.tsx`
- `app/frontend/app/(app)/bollettini/VistaBollettini.tsx`
- `app/frontend/app/(app)/clienti/VistaClienti.tsx`
- `app/frontend/app/(app)/componenti/page.tsx`
- `app/frontend/app/(app)/documenti/VistaDocumenti.tsx`
- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`
- `app/frontend/app/(app)/fornitori/VistaFornitori.tsx`
- `app/frontend/app/(app)/impostazioni/*`
- `app/frontend/app/(app)/not-found.tsx`
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
- `prototipo-alternativo/assets/motore.js`
- `prototipo-alternativo/assets/stile.css`
- `strumenti/prove/app_caricamento.py`
- `strumenti/prove/app_clienti.py`
- `strumenti/prove/app_componenti.py`
- `strumenti/prove/app_documenti.py`
- `strumenti/prove/app_guscio.py`
- `strumenti/prove/app_impostazioni.py`
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

Lavora **solo** sul tuo database di prova `decobrands_test_3_06` (il nome contiene `decobrands_test`, come vuole
`app/backend/test/ambiente.ts`, che legge `DATABASE_URL_TEST`). Altri pacchetti della stessa onda lanciano jest
nello stesso momento su database loro: sul database condiviso `decobrands_test` due giri si cancellano i dati a
vicenda (A6-05). Anche la cartella dei documenti di prova va separata: `ambiente.ts` la mette in
`os.tmpdir()`, quindi cambia `TMP`/`TEMP`. In Git Bash, da `app/backend`:

```bash
export DATABASE_URL_TEST="$(grep '^DATABASE_URL' .env | cut -d= -f2- | sed 's#/decobrands_db#/decobrands_test_3_06#')"
node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL_TEST.replace('/decobrands_test_3_06','/postgres')});c.connect().then(()=>c.query('CREATE DATABASE decobrands_test_3_06 OWNER decobrands')).then(()=>console.log('creato')).catch(e=>console.log(e.message)).finally(()=>c.end())"
DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy
export TMP="$TEMP/decobrands-3-06"; export TEMP="$TMP"; mkdir -p "$TMP"
npx jest test/<file>.spec.ts            # sempre con le variabili sopra nella stessa shell
```

Alla fine cancella il database: lo stesso `node -e` con `DROP DATABASE decobrands_test_3_06`. **Mai** `decobrands_db`, mai il
database `decobrands_test` condiviso, mai Integra (192.168.239.49: non si contatta per nessun motivo).

Prove da far passare:

- backend: `cd app/backend && npx jest test/oggi.spec.ts test/liquidazioni.spec.ts test/analisi.spec.ts` (con le variabili sopra) → **0 KO**;
- `cd app/backend && npx tsc --noEmit` → 0 errori;
- frontend: `cd app/frontend && npx tsc --noEmit` → 0 errori;
- prove nel browser interessate: `app_oggi.py`, `app_guscio.py`, `app_liquidazioni.py`, `app_f7_numeri.py`. **Non lanciarle** (porte e cartella `.next` sono condivise con gli altri pacchetti): aggiorna quelle indicate nei rilievi, controlla la sintassi con `python -m py_compile <file>` e scrivi nel resoconto quali vanno lanciate. Le lancia il controllo di fine onda.
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-3-06.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
