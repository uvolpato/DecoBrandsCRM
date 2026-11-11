# Collaudo · Onda 0 bis · Pacchetto 0b-02 — Documenti: righe salve nella correzione, storico senza fornitore, scaglioni alla data, agenzia alla data dell'ordine, P.IVA con «IT»

Data: 11/11/2026 · **Esecutore: DeepSeek V4** · Gravità del pacchetto: **P0** · Rilievi: R2-01, R0-D5, R1-02, R1-06, R1-09, R1-11, R1-12, R1-13 · Piano: `strumenti/collaudo/piano-correzioni.md`.

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

- **D-133**: **Correggere un documento non tocca le righe che non arrivano; l'import da Integra lanciato dal documento collega il fornitore sul server, nella stessa transazione.** In `correggi` le righe si riscrivono solo se il corpo le porta (`Array.isArray(b.righe)`): vale per tutti i chiamanti. `POST integra/importa` con `documento_id` importa e collega il documento (`fornitore_id`, `fornitore_versione_id`, registro) in una sola `$transaction` (V13); il browser non manda più il secondo PUT.
- **D-137**: **Un documento che entra in una pratica già aperta ha bisogno solo dell'agenzia valida alla data dell'ordine** (D-35/D-60). L'agenzia alla data del documento (`richiediAgenzia`) si chiede solo quando il documento apre una pratica nuova. Precisa D-106.

## Rilievi da correggere (testo dei report R1/R2; i rilievi R0-D* nascono dalle domande dell'R0 decise da Ugo)

### R2-01 — «Importa da Integra» del fornitore dal Documento cancella tutte le righe lette
- Gravità: **P0** (perdita di dati)
- Dove: app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx:301-315 (`importaFornitore`) → app/backend/src/documenti.ts:658-773 (`correggi`, PUT `documenti/:id`)
- Problema: dopo l'import il browser manda `PUT documenti/:id { testata: { tipo, fornitore_id } }` senza `righe`; `correggi` fa sempre `deleteMany` dei campi `righe[*]` e ricrea solo quelle ricevute (`righeInput = []`), quindi tutte le righe OCR (valore letto, affidabilità, posizione) spariscono. In più il tipo viene segnato «verificato/corretto» dall'utente e import + collegamento sono due transazioni (V13).
- Scenario: fattura con 12 righe lette, fornitore non in anagrafica → esito `fornitore_da_integra` → clic «Importa da Integra» → fornitore creato, documento collegato, **0 righe**; l'importo delle righe e i controlli sono persi; se il PUT fallisce (utente con `dati.importa` ma senza `provvigioni.modifica` → 403) il fornitore resta importato e il documento scollegato.
- Correzione puntuale: (1) backend `correggi`: riscrivere le righe solo se il corpo le porta — `if (Array.isArray(b.righe)) { …deleteMany + createMany… }` (righe 732-773); (2) meglio: togliere il PUT dal browser e far collegare il documento al server, dentro la stessa transazione dell'import: `integra/importa` accetta `documento_id` facoltativo e, se il documento è `da_controllare` e la sua P.IVA letta coincide con quella importata, scrive `fornitore_id`/`fornitore_versione_id` sul documento (senza toccare campi e righe), oppure la proposta riconosce il fornitore per P.IVA dopo l'import e il frontend fa solo `carica()`.
- Prova che la verifica: test backend in `app/backend/test/documenti*.spec.ts`: PUT `documenti/:id` con sola `testata` → il numero di campi `righe[` resta invariato; `strumenti/prove/app_documenti*.py` con import fornitore da documento → righe ancora visibili nella scheda Righe.
- Esecutore: DeepSeek V4 — tocca transazione e due moduli backend.
- File toccati: app/backend/src/documenti.ts, app/backend/src/anagrafica-integra.ts (se si sceglie la via 2), app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx, test backend
- Dipende da / correlato a: D-111, D-113, V12/D-28, V13/D-36

> **Per questo pacchetto:** In questo pacchetto **solo la parte (1)** (decisione D-133): in `correggi` le righe (`deleteMany` dei campi `righe[*]` e ricreazione) si riscrivono **solo** se `Array.isArray(b.righe)`; protegge tutti i chiamanti. Prova: `PUT documenti/:id` con sola `testata` → numero dei campi `righe[` invariato, valori e affidabilità uguali. La parte (2), collegamento sul server e frontend, la fa 0b-01.

### R0-D5 — Documenti di una pratica già aperta rifiutati se l'agenzia è chiusa alla data del documento
- Gravità: P1
- Dove: app/backend/src/documenti.ts:1167-1175 (`richiediAgenzia`), chiamata a :1067 (spostamento del documento) e :1184 (registrazione in pratica)
- Problema: `richiediAgenzia` alla data del documento vale per tutti i documenti registrati in pratica; una fattura o nota di credito datata dopo la **chiusura** dell'agenzia (cliente non più seguito, senza agenzia successiva) non entra più nella pratica aperta prima, e le provvigioni di quell'ordine restano fuori (report R1, *Da decidere* 1).
- Scenario: agenzia Rossi ↔ Gries dal 01/01/2026 al 30/06/2026, ordine del 10/05/2026 con pratica aperta; fattura del 15/07/2026 → 409 «manca l'agenzia» → la fattura non si registra e la provvigione dell'ordine di maggio non si calcola mai.
- Correzione puntuale (decisione di Ugo, D-137): per un documento che entra in una pratica **già esistente** basta l'agenzia valida alla **data dell'ordine** della pratica (D-35/D-60: subagente e percentuali seguono l'ordine). `richiediAgenzia` alla data del documento resta **solo** quando il documento apre una pratica nuova. Rileggi le due chiamate (:1067 e :1184) e, quando la pratica di destinazione c'è già, passa la data del suo ordine.
- Prova che la verifica: test/documenti-pratica.spec.ts: agenzia chiusa il 30/06, pratica con ordine del 10/05, fattura del 15/07 → registrata nella pratica; ordine nuovo del 15/07 senza agenzia → 409 come oggi.
- Esecutore: DeepSeek V4 — regola che decide se una provvigione entra (soldi).
- File toccati: app/backend/src/documenti.ts, app/backend/test/documenti-pratica.spec.ts
- Dipende da / correlato a: D-35, D-60, D-106 («L'agenzia mancante si configura dal documento»), D-137

### R1-02 — Ponte lento: le query restano appese e saturano il pool (max 2); `importa` senza tempo massimo
- Gravità: P2
- Dove: app/backend/src/integra.ts:352-353 (`creaPonte`), app/backend/src/anagrafica-integra.ts:27-39 (`conTempo`) e :87-90 (`importa`), app/backend/src/documenti.ts:333-361
- Problema: `conTempo` smette di aspettare dopo 3 s ma la query resta in corso sul pool, che ha `max: 2` e nessun `statement_timeout`/`query_timeout`/`connectionTimeoutMillis`. `importa` non ha nemmeno `conTempo`. L'elenco Documenti fa una `cerca` sequenziale per ogni nome fornitore e per ogni chiave cliente distinti della pagina.
- Scenario: ponte che accetta la connessione ma non risponde → le prime due ricerche occupano entrambe le connessioni; ogni `cerca` successiva aspetta 3 s e risponde «ponte lento»; una pagina con 15 chiavi distinte impiega circa 45 s; il giro di sincronizzazione e `POST /integra/importa` restano appesi senza limite (richiesta HTTP che non torna).
- Correzione puntuale: in `creaPonte` aggiungere `connectionTimeoutMillis: 3000`, `query_timeout: 5000` e `options: '-c default_transaction_read_only=on -c statement_timeout=5000'`; in `importa` usare `conTempo` sulla SELECT e restituire 502 «ponte lento»; in `esitiImportazione` interrompere le ricerche successive dopo il primo `errore: 'ponte lento'` della stessa richiesta.
- Prova che la verifica: test/anagrafica-integra.spec.ts con un `Pool` finto la cui `query` non si risolve mai: `cerca` torna «ponte lento» entro 3,5 s e `importa` risponde 502; test/documenti.spec.ts: con `cerca` lenta l'elenco chiama `cerca` una sola volta.
- Esecutore: DeepSeek V4 — pool condiviso con la sincronizzazione, più file.
- File toccati: app/backend/src/integra.ts, app/backend/src/anagrafica-integra.ts, app/backend/src/documenti.ts, app/backend/test/anagrafica-integra.spec.ts, app/backend/test/documenti.spec.ts
- Dipende da / correlato a: R1-01; D-111 (lo shortcut nel commento di `conTempo` lo prevede già)

> **Per questo pacchetto:** In questo pacchetto **solo** l'ultima parte: in `esitiImportazione`, dopo il primo esito `errore` (ponte lento o non raggiungibile) della stessa richiesta, non chiamare più `cerca`. Nella prova simula `cerca` con `jest.spyOn` che restituisce `{ errore: 'ponte lento' }` (0b-01 rende uguale la forma anche per gli altri errori): una sola chiamata. Il resto (pool, `importa`) lo fa 0b-01.

### R1-06 — Elenco Documenti: `cliente_da_integra` dallo storico usa `fornitore_id`, che nei dati veri è NULL
- Gravità: P2
- Dove: app/backend/src/documenti.ts:342-346 (`esitiImportazione`, `storicoCon`)
- Problema: la chiave è `${s.fornitore_id}|codice` e filtra `s.fornitore_id != null`; storico.ts:35-38 e il commit F1-A13 dicono che `fornitore_id` è NULL finché un soggetto non si collega. Il dettaglio (`cercaLegame`, per P.IVA/nome) e la pillola «Non rappresentato» (`mancaRappresentanzaRighe`, per nome) sono già stati corretti; questo punto no.
- Scenario: storico importato (4022 righe, tutte con `fornitore_id` NULL), ordine Gries con codice cliente presente nello storico con subagente → il dettaglio propone *cliente da Integra* con subagente e sconto, l'elenco no (pillola assente). La prova `documenti.spec.ts:517` passa solo perché imposta `fornitore_id`.
- Correzione puntuale: confrontare come `mancaRappresentanzaRighe`: chiave `normalizzaNome(fornitore_ragione_sociale)|codice` (o P.IVA normalizzata del fornitore) con `r.fornitore` della riga; togliere il filtro `fornitore_id != null`.
- Prova che la verifica: in test/documenti.spec.ts:517 creare la riga di storico **senza** `fornitore_id`, con `fornitore_ragione_sociale` uguale al fornitore → `cliente_da_integra` vero.
- Esecutore: DeepSeek V4 Flash — un punto, più la prova.
- File toccati: app/backend/src/documenti.ts, app/backend/test/documenti.spec.ts
- Dipende da / correlato a: D-112, F1-A13

### R1-09 — Tre `normalizzaPiva` diverse: la proposta non riconosce il cliente se il documento porta `IT` davanti
- Gravità: P2
- Dove: app/backend/src/proposta.ts:243 (`normalizzaPiva` tiene il prefisso `IT`), contro soggetti.ts:29, storico.ts:17, integra.ts `piva()` (tolgono `IT`)
- Problema: `riconosciClienteDai` confronta la P.IVA letta (`IT01234567890` → `IT01234567890`) con `clienti_versioni.piva` scritta dalla sincronizzazione/import senza prefisso (`01234567890`): non coincidono mai. La funzione esisteva già; con F2-A5/F2-A6 decide anche `manca_agenzia` e `cliente_da_integra` (elenco e dettaglio).
- Scenario: fattura con «P.IVA IT01234567890» del cliente, codice cliente del fornitore non abbinato → cliente non riconosciuto → niente pillola «Manca l'agenzia»; se il nome differisce di poco, la proposta va su `cliente_da_integra`/`nessuno` invece di riconoscere il cliente esistente.
- Correzione puntuale: in proposta.ts usare una sola normalizzazione (esportare `normalizzaPiva` da soggetti.ts e importarla in proposta.ts e storico.ts, togliendo le copie); in proposta mantenere la pulizia dei caratteri non alfanumerici prima di togliere `IT`.
- Prova che la verifica: test/proposta.spec.ts: cliente con versione `piva='01234567890'`, documento con `piva_cliente='IT 01234567890'` → `cliente_riconosciuto` valorizzato.
- Esecutore: DeepSeek V4 Flash — sostituzione di un helper, più la prova.
- File toccati: app/backend/src/proposta.ts, app/backend/src/storico.ts, app/backend/src/soggetti.ts, app/backend/test/proposta.spec.ts
- Dipende da / correlato a: D-92, D-106

> **Per questo pacchetto:** In questo pacchetto **solo `proposta.ts`**: usa `normalizzaPiva` già esportata da `soggetti.ts` (non modificare `soggetti.ts`: lo tocca 0b-04), togliendo prima i caratteri non alfanumerici, e cancella la copia locale. La copia di `storico.ts` la toglie 0b-03.

### R1-11 — Elenco Documenti carica tutti i clienti e tutto lo storico a ogni pagina, due volte
- Gravità: P3
- Dove: app/backend/src/documenti.ts:337 e :342-345 (`esitiImportazione`), app/backend/src/proposta.ts:322 (`mancaAgenziaRighe`) e :353-356 (`mancaRappresentanzaRighe`)
- Problema: per ogni `GET /documenti` si leggono tutti i clienti con versione (due volte: `mancaAgenziaRighe` e `esitiImportazione`) e tutto `interscambio_storico` (due volte, con e senza subagente: 4022 righe in tutto), anche per una pagina di 25 documenti.
- Scenario: 700 clienti + 4022 righe di storico lette e trasferite a ogni cambio di filtro o pagina; il costo cresce con l'anagrafica (D-102 la fa crescere).
- Correzione puntuale: caricare i clienti una volta in `elenco` e passarli a entrambe le funzioni; per lo storico filtrare in SQL su `cliente_codice_fornitore IN (codici della pagina)` con `mode: 'insensitive'` (l'indice `interscambio_storico_cliente_codice_idx` c'è già).
- Prova che la verifica: test/documenti.spec.ts con spia su `db.clienti.findMany`: una sola chiamata per `GET /documenti`.
- Esecutore: DeepSeek V4 Flash — ottimizzazione locale.
- File toccati: app/backend/src/documenti.ts, app/backend/src/proposta.ts, app/backend/test/documenti.spec.ts
- Dipende da / correlato a: D-23 (conteggi dal vivo), V12

> **Per questo pacchetto:** Tocca `proposta.ts` (`mancaAgenziaRighe`, `mancaRappresentanzaRighe`) e `documenti.ts` (`elenco`, `esitiImportazione`): sono tutti tuoi.

### R1-12 — `scaglioni_mancanti` del documento non guarda la data, il fornitore sì (D-113)
- Gravità: P3
- Dove: app/backend/src/documenti.ts:397-399 contro app/backend/src/fornitori.ts:259-261
- Problema: il dettaglio documento cerca uno scaglione qualsiasi; la pagina fornitore cerca quelli con `valido_dal <= oggi`; `nuovaPratica` (documenti.ts:1227) vuole lo scaglione alla data dell'ordine e per lo sconto dell'agenzia.
- Scenario: fornitore importato con scaglioni inseriti solo dal 01/01/2027; ordine del 05/11/2026 → la card del documento non avvisa, la pagina fornitore sì, l'apertura della pratica fallisce con 409 «non ha uno scaglione».
- Correzione puntuale: in `dettaglioDocumento` aggiungere `valido_dal: { lte: new Date(letto.data ?? oggi) }` al `findFirst`.
- Prova che la verifica: test/documenti.spec.ts: scaglione solo futuro → `scaglioni_mancanti: true`.
- Esecutore: DeepSeek V4 Flash — una condizione.
- File toccati: app/backend/src/documenti.ts, app/backend/test/documenti.spec.ts
- Dipende da / correlato a: D-87, D-113

### R1-13 — Prove mancanti sui percorsi critici nuovi
- Gravità: P2
- Dove: app/backend/test/anagrafica-integra.spec.ts, documenti.spec.ts, soggetti.spec.ts, clienti.spec.ts
- Problema: le prove coprono i casi felici (creazione, idempotenza per codice e per P.IVA, 404, LIMIT 10, 409 senza agenzia). Mancano: ponte che lancia un errore non di timeout (R1-01); ponte appeso per `importa` (R1-02); P.IVA estera e paese (R1-03); ruolo già presente senza codice integra (R1-04); import concorrente (R1-05); storico senza `fornitore_id` nell'elenco (R1-06); `storico_id` di un altro cliente con P.IVA cliente vuota e riga già usata (R1-07); `creaRuolo` con `codice_integra` (R1-08); `GET /integra/cerca` e `POST /integra/importa` con un utente senza `dati.importa` (403) e con `id_integra` non intero o campo in più (400).
- Scenario: le regressioni descritte sopra passano tutte la suite attuale.
- Correzione puntuale: aggiungere le prove indicate in ciascun rilievo; per i permessi, due `it` in anagrafica-integra.spec.ts con l'utente in sola lettura (403) e con body `{ tipo: 'cliente', id_integra: 'x', extra: 1 }` (400).
- Prova che la verifica: `npm test` sui file elencati, 0 KO.
- Esecutore: DeepSeek V4 Flash — prove su logica da correggere nei rilievi collegati.
- File toccati: i quattro spec elencati
- Dipende da / correlato a: R1-01…R1-08

> **Per questo pacchetto:** In questo pacchetto **solo** le prove su `documenti.ts`/`proposta.ts`: R1-06 (storico senza `fornitore_id`), R1-02 (una sola `cerca` dopo il ponte lento), R1-09, R1-11, R1-12, R0-D5, R2-01 parte (1). Le altre parti: 0b-01, 0b-03, 0b-04.

**Pacchetto sensibile (soldi (agenzia e provvigioni), transazioni, dati letti).** Prima di consegnare carica davvero (strumento `skill` di OpenCode) `owasp-security` e `ponytail-review`, e `postgresql-code-review` se scrivi SQL; rileggi il tuo diff con quelle regole e scrivi nel resoconto cosa hanno trovato. A fine onda Claude Code fa comunque la **review completa** (`owasp-security`, `/code-review`, `/ponytail:ponytail-review`).

## File ammessi (solo questi)

- `app/backend/src/documenti.ts`
- `app/backend/src/proposta.ts`
- `app/backend/test/documenti.spec.ts`
- `app/backend/test/documenti-pratica.spec.ts`
- `app/backend/test/proposta.spec.ts`
- `strumenti/opencode/resoconto-collaudo-0b-02.md`

## File vietati

Li modificano altri pacchetti della **stessa onda** (0 bis), in parallelo:

- `app/backend/prisma/import-storico.ts`
- `app/backend/src/anagrafica-integra.ts`
- `app/backend/src/clienti.ts`
- `app/backend/src/fornitori.ts`
- `app/backend/src/integra.ts`
- `app/backend/src/soggetti.ts`
- `app/backend/src/storico.ts`
- `app/backend/test/anagrafica-integra.spec.ts`
- `app/backend/test/clienti.spec.ts`
- `app/backend/test/fornitori.spec.ts`
- `app/backend/test/integra.spec.ts`
- `app/backend/test/soggetti.spec.ts`
- `app/backend/test/storico.spec.ts`
- `app/frontend/app/(app)/clienti/VistaClienti.tsx`
- `app/frontend/app/(app)/documenti/VistaDocumenti.tsx`
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

Lavora **solo** sul tuo database di prova `decobrands_test_0b_02` (il nome contiene `decobrands_test`, come vuole
`app/backend/test/ambiente.ts`, che legge `DATABASE_URL_TEST`). Altri pacchetti della stessa onda lanciano jest
nello stesso momento su database loro: sul database condiviso `decobrands_test` due giri si cancellano i dati a
vicenda (A6-05). Anche la cartella dei documenti di prova va separata: `ambiente.ts` la mette in
`os.tmpdir()`, quindi cambia `TMP`/`TEMP`. In Git Bash, da `app/backend`:

```bash
export DATABASE_URL_TEST="$(grep '^DATABASE_URL' .env | cut -d= -f2- | sed 's#/decobrands_db#/decobrands_test_0b_02#')"
node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL_TEST.replace('/decobrands_test_0b_02','/postgres')});c.connect().then(()=>c.query('CREATE DATABASE decobrands_test_0b_02 OWNER decobrands')).then(()=>console.log('creato')).catch(e=>console.log(e.message)).finally(()=>c.end())"
DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy
export TMP="$TEMP/decobrands-0b-02"; export TEMP="$TMP"; mkdir -p "$TMP"
npx jest test/<file>.spec.ts            # sempre con le variabili sopra nella stessa shell
```

Alla fine cancella il database: lo stesso `node -e` con `DROP DATABASE decobrands_test_0b_02`. **Mai** `decobrands_db`, mai il
database `decobrands_test` condiviso, mai Integra (192.168.239.49: non si contatta per nessun motivo).

Prove da far passare:

- backend: `cd app/backend && npx jest test/documenti.spec.ts test/documenti-pratica.spec.ts test/documenti-lettura.spec.ts test/proposta.spec.ts test/coda.spec.ts test/pratiche.spec.ts test/seed.spec.ts` (con le variabili sopra) → **0 KO**;
- `cd app/backend && npx tsc --noEmit` → 0 errori;
- prove nel browser interessate: `app_documenti.py`, `app_pratica.py` (non modificarle: scrivi nel resoconto i casi da guardare a fine onda). **Non lanciarle** (porte e cartella `.next` sono condivise con gli altri pacchetti): aggiorna quelle indicate nei rilievi, controlla la sintassi con `python -m py_compile <file>` e scrivi nel resoconto quali vanno lanciate. Le lancia il controllo di fine onda.
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-0b-02.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
