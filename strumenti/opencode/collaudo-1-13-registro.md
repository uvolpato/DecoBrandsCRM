# Collaudo · Onda 1 · Pacchetto 1-13 — Registro: 4xx registrati, dettaglio non valido in anomalia, anomalia atomica, filtri per giorno

Data: 08/11/2026 · **Esecutore: DeepSeek V4** · Gravità del pacchetto: **P2** · Rilievi: A8-02, A8-03, A3-09, A3-12 · Piano: `strumenti/collaudo/piano-correzioni.md`.

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

### A8-02 — Gli errori di validazione 4xx non arrivano al registro
- Gravità: P2
- Dove: `app/backend/src/errori.filter.ts:9-29`
- Problema: il `ponytail:` rimanda la registrazione dei 4xx «quando arrivano le prime rotte che scrivono»;
  le rotte che scrivono ci sono tutte da tempo, il filtro restituisce il 4xx e non scrive nulla.
- Scenario: un amministratore salva un fornitore con un valore rifiutato dal DTO → 400 in pagina, nessuna riga
  nel registro; la spec §15.2.7 (riga «Errore di validazione 4xx») e §15.5 («nessuna eccezione gestita
  silenziosamente») chiedono l'evento con `{etichetta, errore: {campo, messaggio}}`.
- Correzione puntuale: nel ramo `HttpException` con stato 400/422 (escluso 401/403/404/429), `logEventSicuro`
  con `tipo` dedotto dal metodo (`POST`→`crud/create`, `PUT|PATCH`→`crud/update`, `DELETE`→`crud/delete`),
  `entita` = primo segmento di `req.path` dopo `/api/`, `esito: 'errore'`, `dettaglio.errore` = primo messaggio
  del ValidationPipe (mai i valori inviati); aggiungere il codice in `SCHEMI` di `registro.ts`. Togliere il `ponytail:`.
  Se la mappa metodo→tipo non basta, decidere con Ugo il catalogo.
- Prova che la verifica: `test/registro-api.spec.ts` — PUT fornitore con campo non valido → 400 e una riga `esito='errore'`.
- Esecutore: DeepSeek V4 — tocca il registro (D-31) e il filtro globale
- File toccati: `errori.filter.ts`, `registro.ts`, `test/registro-api.spec.ts`
- Dipende da / correlato a: A1 (errori che espongono dati), A3 (registro), D-31

### A8-03 — In esercizio il `dettaglio` non valido non apre l'anomalia
- Gravità: P2
- Dove: `app/backend/src/registro.ts:89-91` (funzione `controlla`)
- Problema: il `ponytail:` dice «l'anomalia arriva con `apriAnomalia`»; `apriAnomalia` esiste (usata in
  `casella.ts`), ma in esercizio si fa solo `log.warn`.
- Scenario: un evento nuovo scritto con una chiave mancante → la riga va nel registro senza la chiave, nessuno
  lo vede in *Stato del sistema*; spec §15.4 chiede l'anomalia `app.dettaglio_non_valido`.
- Correzione puntuale: `controlla` restituisce l'errore invece di loggarlo; `logEvent`/`apriAnomalia`, dopo la
  scrittura, se c'è errore e `NODE_ENV !== 'test'` chiamano `apriAnomalia(db, { codice: 'app.dettaglio_non_valido', … })`
  (senza ricorsione: per quel codice si salta il controllo). Togliere il `ponytail:`.
- Prova che la verifica: `test/registro.spec.ts` con `NODE_ENV` forzato a `production` nel caso → anomalia aperta.
- Esecutore: DeepSeek V4 — registro e transazione corrente (V13)
- File toccati: `registro.ts`, `test/registro.spec.ts`
- Dipende da / correlato a: A8-02 (stesso file `registro.ts`: stesso pacchetto), A3, D-31

### A3-09 — `apriAnomalia` non è atomica: due aperture insieme rompono la transazione che la chiama
- Gravità: P3
- Dove: `app/backend/src/registro.ts:140-160`
- Problema: `findFirst` e poi `create`; l'indice univoco parziale `registro_anomalia_aperta_key` fa fallire la seconda con `P2002`. Dentro `letturaFallita` (`documenti.ts:139`) questo annulla tutta la transazione.
- Scenario: due letture fallite insieme sullo stesso codice e chiave (lettore e *Controlla adesso*), oppure `integra.piva_doppia` aperta da giro automatico e manuale insieme → la seconda va in errore 500 o il giro si segna `errore`.
- Correzione puntuale: un solo `INSERT … ON CONFLICT ((COALESCE(servizio,'')), codice, (COALESCE(chiave,''))) WHERE genere = 'anomalia' AND stato = 'aperta' DO UPDATE SET volte = registro.volte + 1, ultimo = EXCLUDED.ultimo, messaggio = EXCLUDED.messaggio, dettaglio = EXCLUDED.dettaglio` con `db.$executeRaw` parametrico.
- Prova che la verifica: `app/backend/test/registro.spec.ts` — `Promise.all` di due `apriAnomalia` uguali → una riga con `volte = 2`.
- Esecutore: DeepSeek V4 Flash — una funzione.
- File toccati: `app/backend/src/registro.ts`, `app/backend/test/registro.spec.ts`.
- Dipende da / correlato a: D-31.

### A3-12 — Filtri per giorno sul registro non usano l'indice su `ts`
- Gravità: P3
- Dove: `app/backend/src/registro-api.ts:98-99`, `:284-289` (`erroriOggi`)
- Problema: `(r.ts AT TIME ZONE 'Europe/Rome')::date >= …` applica una funzione alla colonna: l'indice `registro_ts_idx` non serve.
- Scenario: registro con 36 mesi di eventi; filtro «dal 01/11 al 08/11» nella pagina Registro → scansione di tutta la tabella a ogni cambio di filtro o pagina.
- Correzione puntuale: `r.ts >= (${q.dal}::date::timestamp AT TIME ZONE 'Europe/Rome')` e `r.ts < ((${q.al}::date + 1)::timestamp AT TIME ZONE 'Europe/Rome')`; stessa forma in `erroriOggi` per `oggi`.
- Prova che la verifica: `app/backend/test/registro-api.spec.ts` (esistente: stessi risultati ai bordi del giorno, 23:30 e 00:30 di Roma).
- Esecutore: DeepSeek V4 Flash — SQL locale.
- File toccati: `app/backend/src/registro-api.ts`.
- Dipende da / correlato a: A7.

**Nota del pacchetto.** Registro unico D-31: `dettaglio` sempre con lo schema del codice in `SCHEMI`; nel 4xx **mai** i valori inviati dall'utente, solo campo e messaggio.

## File ammessi (solo questi)

- `app/backend/src/errori.filter.ts`
- `app/backend/src/registro.ts`
- `app/backend/src/registro-api.ts`
- `app/backend/test/registro.spec.ts`
- `app/backend/test/registro-api.spec.ts`
- `strumenti/opencode/resoconto-collaudo-1-13.md`

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
- `app/backend/src/clienti.ts`
- `app/backend/src/documenti.ts`
- `app/backend/src/fornitori.ts`
- `app/backend/src/impostazioni-api.ts`
- `app/backend/src/impostazioni.ts`
- `app/backend/src/incassi.ts`
- `app/backend/src/lettore.ts`
- `app/backend/src/lettura.ts`
- `app/backend/src/main.ts`
- `app/backend/src/motore/dati.ts`
- `app/backend/src/motore/motore.ts`
- `app/backend/src/oggi.ts`
- `app/backend/src/posta.ts`
- `app/backend/src/proposta.ts`
- `app/backend/src/sistema.ts`
- `app/backend/src/utenti.ts`
- `app/backend/test/avvio.spec.ts`
- `app/backend/test/blocco.ts`
- `app/backend/test/casella.spec.ts`
- `app/backend/test/clienti.spec.ts`
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
- `app/backend/test/scartati.spec.ts`
- `app/backend/test/seed.spec.ts`
- `app/backend/test/sistema.spec.ts`
- `app/backend/test/utenti.spec.ts`
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

Lavora **solo** sul tuo database di prova `decobrands_test_1_13` (il nome contiene `decobrands_test`, come vuole
`app/backend/test/ambiente.ts`, che legge `DATABASE_URL_TEST`). Altri pacchetti della stessa onda lanciano jest
nello stesso momento su database loro: sul database condiviso `decobrands_test` due giri si cancellano i dati a
vicenda (A6-05). Anche la cartella dei documenti di prova va separata: `ambiente.ts` la mette in
`os.tmpdir()`, quindi cambia `TMP`/`TEMP`. In Git Bash, da `app/backend`:

```bash
export DATABASE_URL_TEST="$(grep '^DATABASE_URL' .env | cut -d= -f2- | sed 's#/decobrands_db#/decobrands_test_1_13#')"
node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL_TEST.replace('/decobrands_test_1_13','/postgres')});c.connect().then(()=>c.query('CREATE DATABASE decobrands_test_1_13 OWNER decobrands')).then(()=>console.log('creato')).catch(e=>console.log(e.message)).finally(()=>c.end())"
DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy
export TMP="$TEMP/decobrands-1-13"; export TEMP="$TMP"; mkdir -p "$TMP"
npx jest test/<file>.spec.ts            # sempre con le variabili sopra nella stessa shell
```

Alla fine cancella il database: lo stesso `node -e` con `DROP DATABASE decobrands_test_1_13`. **Mai** `decobrands_db`, mai il
database `decobrands_test` condiviso, mai Integra (192.168.239.49: non si contatta per nessun motivo).

Prove da far passare:

- backend: `cd app/backend && npx jest test/registro.spec.ts test/registro-api.spec.ts test/sistema.spec.ts test/casella.spec.ts` (con le variabili sopra) → **0 KO**;
- `cd app/backend && npx tsc --noEmit` → 0 errori;
- prove nel browser interessate: `app_registro.py`. **Non lanciarle** (porte e cartella `.next` sono condivise con gli altri pacchetti): aggiorna quelle indicate nei rilievi, controlla la sintassi con `python -m py_compile <file>` e scrivi nel resoconto quali vanno lanciate. Le lancia il controllo di fine onda.
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-1-13.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
