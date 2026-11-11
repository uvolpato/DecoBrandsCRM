# Collaudo · Onda 0 bis · Pacchetto 0b-03 — Storico del vecchio CRM e agenzia dal documento: coppia giusta e riga bloccata, subagente dal server, scaglioni dal server, import dello storico in transazione

Data: 11/11/2026 · **Esecutore: DeepSeek V4** · Gravità del pacchetto: **P2** · Rilievi: R1-07, R2-05, R2-06, R2-13, R1-10, R1-09, R1-13 · Piano: `strumenti/collaudo/piano-correzioni.md`.

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

- **D-134**: **Il subagente proposto per l'agenzia lo decide il server.** La lettura dello storico restituisce `subagente_id` (dal codice o dal nome, solo se il subagente è uno solo); se non si trova, il campo Subagente resta **vuoto** e va scelto: mai l'abbinamento dei nomi nel browser né il primo dell'elenco (V12).

## Rilievi da correggere (testo dei report R1/R2; i rilievi R0-D* nascono dalle domande dell'R0 decise da Ugo)

### R1-07 — Riga dello storico consumabile da un altro cliente dello stesso fornitore, e riusabile se già usata
- Gravità: P2
- Dove: app/backend/src/clienti.ts:32-44 (`stessaCoppia`), :221-225 e :255; app/backend/src/storico.ts:81-86 (`segnaUsata`)
- Problema: `stessaCoppia` dà vero se anche **un solo** lato coincide (`visto = true`): una riga con P.IVA del fornitore e senza P.IVA/ID del cliente (caso frequente: il report conta i «senza P.IVA cliente») passa per qualunque cliente di quel fornitore. Inoltre né `creaAgenzia` né `segnaUsata` controllano `stato = 'da_usare'`, e la riga non è bloccata (`FOR UPDATE`). `storico_id` arriva dal browser (V12).
- Scenario: riga 812 «Rossi SRL ↔ Gries, subagente Bianchi, sconto 10», senza P.IVA cliente. L'operatore crea l'agenzia di «Verdi SNC» con Gries passando `storico_id=812` (o il form lo precompila per errore) → accettata, la riga 812 passa a `usata` con l'`interscambio_id` di Verdi; quando arriva il documento di Rossi lo storico non lo propone più. Due agenzie di seguito con lo stesso `storico_id` → la riga viene sovrascritta.
- Correzione puntuale: in `stessaCoppia` richiedere che **entrambi** i lati abbiano una corrispondenza positiva (cliente per id o P.IVA o, in mancanza, nome normalizzato uguale; fornitore per id o P.IVA o nome); in `creaAgenzia` leggere la riga con `SELECT … FOR UPDATE` e rifiutare (409) se `stato <> 'da_usare'`.
- Prova che la verifica: test/clienti.spec.ts: riga senza P.IVA cliente di «Rossi» usata per «Verdi» → 400; seconda agenzia con lo stesso `storico_id` → 409.
- Esecutore: DeepSeek V4 — regola di dati che decide subagente e sconto (soldi), con lock.
- File toccati: app/backend/src/clienti.ts, app/backend/src/storico.ts, app/backend/test/clienti.spec.ts
- Dipende da / correlato a: D-112, F1-A13

### R2-05 — FormAgenzia: subagente proposto deciso nel browser e con priorità sbagliata
- Gravità: P2
- Dove: app/frontend/componenti/FormAgenzia.tsx:51-58 (`normalizza`, `trovaSubagente`), 130 e 133
- Problema: il legame «nome del vecchio CRM → subagente» si decide nel browser (V12) e l'abbinamento per nome **vince** sul `subagente_id` già risolto dal server (`storico.ts:124`); se nessuno dei due c'è si ricade su `subagenti[0]`, cioè il primo subagente dell'elenco.
- Scenario: storico «Rossi Mario», `subagente_id` = 7 risolto dal server, in anagrafica esistono due «Mario Rossi» (omonimi) → si propone il primo trovato, non il 7. Storico «Bianchi Luca» non presente in anagrafica → il testo in testa dice «Dal vecchio CRM: subagente Bianchi Luca» ma il campo mostra il primo subagente in ordine alfabetico; con due Invio si crea l'agenzia sbagliata (provvigioni al subagente sbagliato).
- Correzione puntuale: il server risolve il subagente in `GET interscambio/storico` (campo `subagente_id` già c'è: riempirlo lì anche dal nome, unico o niente); nel frontend `const subPro = pro?.subagente_id ? { id: pro.subagente_id } : undefined;` togliere `normalizza`/`trovaSubagente`; per una agenzia nuova con storico senza subagente risolto, valore vuoto (`''`) invece di `subagenti[0]?.id`, così il campo obbligatorio va scelto.
- Prova che la verifica: test backend su `storico.ts` (nome → id unico, omonimi → null); Playwright: documento con storico non risolto → campo Subagente vuoto.
- Esecutore: DeepSeek V4 — backend + frontend, regola di riconoscimento.
- File toccati: app/backend/src/storico.ts, app/frontend/componenti/FormAgenzia.tsx, test
- Dipende da / correlato a: D-112, V12/D-28

> **Per questo pacchetto:** Decisione D-134: se il subagente non si trova (nome assente o omonimi), `subagente_id` è `null` e il campo resta **vuoto** (`''`), obbligatorio da scegliere. Mai `subagenti[0]`, mai abbinamento dei nomi nel browser: togli `normalizza`/`trovaSubagente` da `FormAgenzia.tsx`.

### R2-06 — FormAgenzia: scaglioni in memoria di modulo, mai aggiornati, N letture
- Gravità: P3
- Dove: FormAgenzia.tsx:61 (`const scaglioni = new Map`), 109-116
- Problema: gli scaglioni di ogni fornitore si leggono con una chiamata `fornitori/:id` per fornitore e restano in una `Map` globale fino al ricaricamento della pagina; l'aiuto «Scaglioni in vigore» è quindi vecchio dopo una modifica e la scelta «in vigore» si calcola nel browser (`scontiInVigore`, V12). Il calcolo era già in VistaClienti, qui è solo spostato.
- Scenario: fornitore importato da Integra senza scaglioni (D-113) → apro un'agenzia (cache vuota per lui) → configuro gli scaglioni in Fornitori → riapro l'agenzia: l'aiuto non li mostra fino al ricaricamento; con 40 fornitori la prima apertura fa 40 richieste.
- Correzione puntuale: un endpoint `GET fornitori/sconti-in-vigore` (server: per fornitore la lista degli `sconto_min` della versione in vigore) letto a ogni apertura; togliere la `Map` di modulo e `scontiInVigore`.
- Prova che la verifica: test backend dell'endpoint; Playwright: dopo «Nuove percentuali» l'aiuto dell'agenzia mostra i nuovi sconti.
- Esecutore: DeepSeek V4 Flash
- File toccati: app/backend/src/fornitori.ts, app/frontend/componenti/FormAgenzia.tsx
- Dipende da / correlato a: D-113, V12

> **Per questo pacchetto:** La rotta nuova (`GET fornitori/sconti-in-vigore`) va in `fornitori.ts`, con la guardia di lettura delle altre rotte del file; prova in `fornitori.spec.ts`.

### R2-13 — FormAgenzia: caricamento con testo «Caricamento…» invece della sagoma
- Gravità: P3
- Dove: app/frontend/componenti/FormAgenzia.tsx:149
- Problema: in attesa di fornitori, subagenti, scaglioni (fino a N+2 richieste) la finestra mostra solo «Caricamento…», contro D-59 (sagome) e senza soglia dei 150 ms; se `fornitori`/`subagenti` falliscono il form si apre con le liste vuote senza messaggio.
- Scenario: rete lenta → finestra vuota con «Caricamento…»; server 500 su `subagenti` → campo Subagente vuoto senza spiegazione.
- Correzione puntuale: dentro la Modale `<SagomaCorpo />` (con `useSagome`); se `!f.ok || !s.ok` mostrare `r.messaggio` nella Modale con «Chiudi».
- Prova che la verifica: Playwright con `page.route('**/api/subagenti', 500)` → messaggio d'errore nella finestra.
- Esecutore: DeepSeek V4 Flash
- File toccati: app/frontend/componenti/FormAgenzia.tsx
- Dipende da / correlato a: D-59, R2-06

### R1-10 — `import:storico --sostituisci` su `decobrands_db`: TRUNCATE fuori transazione e `RESTART IDENTITY` riusa gli id
- Gravità: P2
- Dove: app/backend/prisma/import-storico.ts:218-224
- Problema: lo storico vive nel database di esercizio. `--sostituisci` svuota le tabelle prima e fuori dalla transazione dell'import, azzera lo stato `usata`/`interscambio_id` delle righe già consumate e riparte da id 1; il registro (`dettaglio.storico_id` in `creaAgenzia`) punta allora a righe diverse. Se l'import fallisce a metà, le tabelle restano vuote.
- Scenario: dopo un mese di uso (200 righe `usata`) si rilancia con `--sostituisci` per un estratto corretto → le 200 righe tornano `da_usare` e vengono riproposte per agenzie già create; l'evento «agenzia creata da storico_id 812» ora indica un'altra coppia.
- Correzione puntuale: spostare il TRUNCATE dentro la `$transaction` di `importaStorico`; senza `RESTART IDENTITY`; rifiutare `--sostituisci` se esiste almeno una riga con `stato <> 'da_usare'` (o riportare stato, `interscambio_id`, `usato_il` per chiave `(fonte, cliente_legacy_id, fornitore_legacy_id)`).
- Prova che la verifica: test/storico.spec.ts: riga segnata `usata`, poi import con sostituzione → rifiutato (o stato conservato); import che lancia a metà → righe precedenti intatte.
- Esecutore: DeepSeek V4 Flash — un file, script.
- File toccati: app/backend/prisma/import-storico.ts, app/backend/test/storico.spec.ts
- Dipende da / correlato a: D-112, V13

> **Per questo pacchetto:** `import-storico.ts` gira sul database di esercizio: provalo **solo** sul tuo database di prova. Scegli la via «rifiutare `--sostituisci` se esiste una riga con `stato <> 'da_usare'`» (la più semplice); TRUNCATE dentro la transazione, senza `RESTART IDENTITY`.

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

> **Per questo pacchetto:** In questo pacchetto **solo** `storico.ts`: togli la copia locale di `normalizzaPiva` e importa quella esportata da `soggetti.ts` (non modificare `soggetti.ts`). Controlla con `storico.spec.ts` che i dati dello storico diano lo stesso risultato (prefisso `IT` tolto).

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

> **Per questo pacchetto:** In questo pacchetto **solo** le prove su `clienti.ts`/`storico.ts`/`fornitori.ts`: R1-07 (riga di un altro cliente → 400, riga già usata → 409), R2-05 (nome → id unico, omonimi → null), R2-06, R1-10. Le altre parti: 0b-01, 0b-02, 0b-04.

**Pacchetto sensibile (soldi (subagente e sconto dell'agenzia), lock e transazioni, script sul database di esercizio).** Prima di consegnare carica davvero (strumento `skill` di OpenCode) `owasp-security` e `ponytail-review`, e `postgresql-code-review` se scrivi SQL; rileggi il tuo diff con quelle regole e scrivi nel resoconto cosa hanno trovato. A fine onda Claude Code fa comunque la **review completa** (`owasp-security`, `/code-review`, `/ponytail:ponytail-review`).

## File ammessi (solo questi)

- `app/backend/src/storico.ts`
- `app/backend/src/clienti.ts`
- `app/backend/src/fornitori.ts`
- `app/backend/prisma/import-storico.ts`
- `app/frontend/componenti/FormAgenzia.tsx`
- `app/backend/test/clienti.spec.ts`
- `app/backend/test/storico.spec.ts`
- `app/backend/test/fornitori.spec.ts`
- `strumenti/opencode/resoconto-collaudo-0b-03.md`

## File vietati

Li modificano altri pacchetti della **stessa onda** (0 bis), in parallelo:

- `app/backend/src/anagrafica-integra.ts`
- `app/backend/src/documenti.ts`
- `app/backend/src/integra.ts`
- `app/backend/src/proposta.ts`
- `app/backend/src/soggetti.ts`
- `app/backend/test/anagrafica-integra.spec.ts`
- `app/backend/test/documenti-pratica.spec.ts`
- `app/backend/test/documenti.spec.ts`
- `app/backend/test/integra.spec.ts`
- `app/backend/test/proposta.spec.ts`
- `app/backend/test/soggetti.spec.ts`
- `app/frontend/app/(app)/clienti/VistaClienti.tsx`
- `app/frontend/app/(app)/documenti/VistaDocumenti.tsx`
- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`
- `app/frontend/app/(app)/fornitori/VistaFornitori.tsx`
- `app/frontend/app/(app)/soggetti/VistaSoggetti.tsx`
- `app/frontend/app/stile/stile.css`
- `app/frontend/componenti/CercaInIntegra.tsx`
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

Lavora **solo** sul tuo database di prova `decobrands_test_0b_03` (il nome contiene `decobrands_test`, come vuole
`app/backend/test/ambiente.ts`, che legge `DATABASE_URL_TEST`). Altri pacchetti della stessa onda lanciano jest
nello stesso momento su database loro: sul database condiviso `decobrands_test` due giri si cancellano i dati a
vicenda (A6-05). Anche la cartella dei documenti di prova va separata: `ambiente.ts` la mette in
`os.tmpdir()`, quindi cambia `TMP`/`TEMP`. In Git Bash, da `app/backend`:

```bash
export DATABASE_URL_TEST="$(grep '^DATABASE_URL' .env | cut -d= -f2- | sed 's#/decobrands_db#/decobrands_test_0b_03#')"
node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL_TEST.replace('/decobrands_test_0b_03','/postgres')});c.connect().then(()=>c.query('CREATE DATABASE decobrands_test_0b_03 OWNER decobrands')).then(()=>console.log('creato')).catch(e=>console.log(e.message)).finally(()=>c.end())"
DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy
export TMP="$TEMP/decobrands-0b-03"; export TEMP="$TMP"; mkdir -p "$TMP"
npx jest test/<file>.spec.ts            # sempre con le variabili sopra nella stessa shell
```

Alla fine cancella il database: lo stesso `node -e` con `DROP DATABASE decobrands_test_0b_03`. **Mai** `decobrands_db`, mai il
database `decobrands_test` condiviso, mai Integra (192.168.239.49: non si contatta per nessun motivo).

Prove da far passare:

- backend: `cd app/backend && npx jest test/clienti.spec.ts test/storico.spec.ts test/fornitori.spec.ts test/percentuali.spec.ts test/seed.spec.ts` (con le variabili sopra) → **0 KO**;
- `cd app/backend && npx tsc --noEmit` → 0 errori;
- frontend: `cd app/frontend && npx tsc --noEmit` → 0 errori;
- prove nel browser interessate: `app_clienti.py`, `app_fornitori.py`, `app_documenti.py` (non modificarle: sono di 0b-05 e 0b-01; scrivi nel resoconto i casi da guardare a fine onda: campo Subagente vuoto con storico non risolto, errore di `subagenti` dentro la finestra, scaglioni nuovi visti senza ricaricare). **Non lanciarle** (porte e cartella `.next` sono condivise con gli altri pacchetti): aggiorna quelle indicate nei rilievi, controlla la sintassi con `python -m py_compile <file>` e scrivi nel resoconto quali vanno lanciate. Le lancia il controllo di fine onda.
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-0b-03.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
