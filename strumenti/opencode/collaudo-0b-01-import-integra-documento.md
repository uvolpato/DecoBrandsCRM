# Collaudo · Onda 0 bis · Pacchetto 0b-01 — Import da Integra dal documento: collegamento sul server, ponte giù o lento, paese, codice già presente, doppio import

Data: 11/11/2026 · **Esecutore: DeepSeek V4** · Gravità del pacchetto: **P0** · Rilievi: R2-01, R2-07, R2-08, R1-01, R1-02, R1-03, R1-04, R1-05, R1-13 · Piano: `strumenti/collaudo/piano-correzioni.md`.

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
- **D-135**: **Dopo *Importa* (Cerca in Integra) si apre la scheda del nuovo cliente o fornitore**, come dice la guida; l'`id` arriva nella risposta di `integra/importa`.

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

> **Per questo pacchetto:** In questo pacchetto **solo la parte (2)** (decisione D-133): `POST integra/importa` accetta `documento_id` facoltativo. Se c'è: dentro la **stessa** `prisma.$transaction` dell'import (V13) blocca il documento (`SELECT … FOR UPDATE`), controlla che l'utente abbia anche il permesso di correggere i documenti (lo stesso della `PUT documenti/:id`) **prima** di scrivere qualsiasi cosa (403: niente import, niente collegamento), che il documento sia `da_controllare` e senza fornitore, e che la P.IVA letta del fornitore (normalizzata con `normalizzaPiva` di `soggetti.ts`) coincida con quella importata (altrimenti 409); poi scrivi **solo** `fornitore_id` e `fornitore_versione_id` del documento (né campi né righe) e l'evento nel registro da `tx`. Nel frontend `importaFornitore` manda `documento_id` e poi fa solo `carica()`: **togli il PUT**. Se anche `importaCliente` scrive qualcosa dopo l'import, stessa regola; se no, lascialo. La parte (1), `correggi` in `documenti.ts`, la fa 0b-02: **non toccare `documenti.ts`**. La risposta di `integra/importa` porta **sempre** l'`id` del cliente o fornitore (lo usa 0b-05 per aprire la scheda, D-135).

### R2-07 — Documento: «Configura l'agenzia» attivo anche senza il permesso di salvarla
- Gravità: P3
- Dove: VistaDocumento.tsx:354 e 373
- Problema: il pulsante non controlla `dati.modifica`, richiesto da `POST clienti/:id/agenzie` (`clienti.ts:206`); in Clienti lo stesso pulsante è nascosto senza permesso.
- Scenario: utente con `provvigioni.modifica` ma solo lettura in Dati → compila il form → «Crea» → 403 «permesso negato» dopo aver scritto tutto.
- Correzione puntuale: `const puoAgenzia = puo('dati.modifica');` e sui due pulsanti `disabled={!puoAgenzia} title={!puoAgenzia ? 'Serve il livello operatore in Dati' : undefined}`.
- Prova che la verifica: Playwright con un utente lettura-Dati → pulsante disabilitato.
- Esecutore: DeepSeek V4 Flash
- File toccati: app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx
- Dipende da / correlato a: D-106, D-50

> **Per questo pacchetto:** Solo `VistaDocumento.tsx`; `puo` è già usato nella pagina: riusalo.

### R2-08 — Documento: «Importa da Integra» senza stato di attesa (doppio clic)
- Gravità: P3
- Dove: VistaDocumento.tsx:347 e 365 (`importaFornitore`, `importaCliente`)
- Problema: il pulsante resta attivo durante le chiamate (import + PUT + ricarica): un secondo clic rifà tutto (il server non crea doppioni, ma rifà il PUT di R2-01 e mostra due avvisi).
- Scenario: ponte lento, l'utente clicca due volte → due import (`gia_presente` al secondo), due PUT, due «Fornitore importato».
- Correzione puntuale: `const [importo, setImporto] = useState(false)`; nelle due funzioni `if (importo) return; setImporto(true); try { … } finally { setImporto(false); }`; `disabled={!puoImporta || importo}` e testo «Importo…».
- Prova che la verifica: Playwright con risposta ritardata → il secondo clic non parte (una sola richiesta `integra/importa`).
- Esecutore: DeepSeek V4 Flash
- File toccati: app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx
- Dipende da / correlato a: R2-01

### R1-01 — Ponte di Integra giù: Documenti (elenco e dettaglio) va in 500
- Gravità: P1
- Dove: app/backend/src/anagrafica-integra.ts:60-65 (`cerca`), chiamata da app/backend/src/documenti.ts:290-308 (`contestoDocumento`) e :326-363 (`esitiImportazione`)
- Problema: `cerca` gestisce solo il timeout (`LENTO`); ogni altro errore del ponte (ECONNREFUSED, VPN giù, password cambiata, vista mancante) si propaga, e `GET /documenti` e `GET /documenti/:id` lo chiamano senza try/catch.
- Scenario: VPN verso il ponte spenta e un documento in coda con fornitore non riconosciuto → `GET /api/documenti?stato=da_controllare` risponde 500; la pagina principale del lavoro quotidiano non si apre finché il ponte non torna. Stessa cosa sul dettaglio. Contraddice il commento «senza ponte si prosegue senza candidati».
- Correzione puntuale: in `contestoDocumento` e `esitiImportazione` avvolgere ogni `cerca(...)` in `try { … } catch { /* ponte giù: nessun candidato */ }` (oppure in `cerca` restituire `{ errore: 'ponte non raggiungibile' }` per ogni errore del pool, lasciando il `throw` solo alla rotta `GET /integra/cerca`, dove diventa 502). Registrare l'errore una volta con `apriAnomalia` (servizio `integra`), non per riga.
- Prova che la verifica: in test/documenti.spec.ts, `jest.spyOn(anagraficaIntegra, 'cerca').mockRejectedValue(new Error('ECONNREFUSED'))` con `ponte` simulato: elenco e dettaglio rispondono 200, `fornitore_da_integra=false`, esito come senza ponte.
- Esecutore: DeepSeek V4 Flash — un file, try/catch locali più una prova.
- File toccati: app/backend/src/documenti.ts (o anagrafica-integra.ts), app/backend/test/documenti.spec.ts
- Dipende da / correlato a: R1-02; D-111

> **Per questo pacchetto:** Usa la **seconda** via della correzione: in `cerca` (`anagrafica-integra.ts`) ogni errore del pool diventa `{ errore: 'ponte non raggiungibile' }` (anomalia del servizio `integra` aperta una volta con `apriAnomalia`, non per riga); la rotta `GET /integra/cerca` lo trasforma in 502. **Non toccare `documenti.ts`**: con `cerca` che non lancia più, elenco e dettaglio smettono di dare 500. Prova in `anagrafica-integra.spec.ts` (pool finto che rifiuta la connessione → `cerca` restituisce l'errore, non lancia).

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

> **Per questo pacchetto:** In questo pacchetto: `creaPonte` (`integra.ts`) con i tempi massimi, `importa` con `conTempo` → 502 «ponte lento». La parte «interrompere le ricerche successive dopo il primo `ponte lento`» sta in `documenti.ts` (`esitiImportazione`) e la fa 0b-02.

### R1-03 — Import da Integra con paese fisso `IT`: doppione di soggetto per le P.IVA estere, o import impossibile
- Gravità: P2
- Dove: app/backend/src/anagrafica-integra.ts:99 (`datiFiscali(r.piva, r.codice_fiscale, 'IT')`)
- Problema: il paese del soggetto è sempre `IT`, anche se la vista porta `paese`. Il vecchio CRM (import-vecchio-crm.ts:57 `paeseDi`) mette invece il paese dal prefisso della P.IVA. L'unicità è su `(paese, piva_norm)`, quindi lo stesso fornitore estero diventa due soggetti.
- Scenario: fornitore tedesco con P.IVA `DE123456789`, importato dal vecchio CRM come soggetto `paese=DE`. Un documento arriva, *Importa da Integra* → `findFirst({ paese: 'IT', piva_norm: 'DE123456789' })` non lo trova → nasce un secondo soggetto `paese=IT`, nessun vincolo lo ferma: due master per un fornitore (D-102 violata). Variante: in Integra la P.IVA estera è senza prefisso (`123456789`) → `pivaValida` fallisce → 400, e il fornitore non si può importare.
- Correzione puntuale: calcolare il paese come `r.paese` normalizzato a 2 lettere (se valido) altrimenti il prefisso della P.IVA normalizzata, altrimenti `IT`; se la P.IVA non ha prefisso e il paese non è IT, anteporre il paese prima di `datiFiscali`. Stessa regola in un helper unico usato anche da import-vecchio-crm.ts (`paeseDi`).
- Prova che la verifica: test/anagrafica-integra.spec.ts: soggetto esistente `paese=DE, piva_norm=DE123456789`, vista con lo stesso fornitore → `importa` aggiunge il ruolo allo stesso soggetto (count soggetti invariato).
- Esecutore: DeepSeek V4 — identità del master, regole di dedup.
- File toccati: app/backend/src/anagrafica-integra.ts, app/backend/src/soggetti.ts (helper), app/backend/test/anagrafica-integra.spec.ts
- Dipende da / correlato a: D-101, D-102, `doppioni-anagrafica-integra.md` (P.IVA estere)

> **Per questo pacchetto:** Il paese calcolalo **dentro `anagrafica-integra.ts`** (stessa regola di `paeseDi` di `prisma/import-vecchio-crm.ts` e `prisma/import-storico.ts`, con un commento che lo dice) e passalo a `datiFiscali`. **Non toccare `soggetti.ts`** (lo modifica 0b-04) né gli script di import: l'aiuto unico per i tre è rimandato (`// ponytail:` con il motivo).

### R1-04 — `importa` trova il ruolo per P.IVA ma non registra il codice di Integra: niente sincronizzazione e proposta infinita
- Gravità: P2
- Dove: app/backend/src/anagrafica-integra.ts:117-118 e :127-128
- Problema: quando il soggetto ha già il ruolo (creato dal vecchio CRM, a mano dal CRM, o un secondo codice Integra con la stessa P.IVA) la funzione risponde `gia_presente` senza creare `codici_esterni(integra, tipo, codice)`. La sincronizzazione riconosce solo per codice (`identita`, integra.ts:167), e `cerca` esclude solo i codici già presenti.
- Scenario: cliente «Rossi SRL» nato dall'import del vecchio CRM (nessun codice integra). Documento con il codice Integra `C0123` → card *Importa da Integra* → «già presente» → la riga resta proposta a ogni apertura, il cliente non riceve mai gli aggiornamenti di Integra (versioni D-46) e il documento non si abbina per codice. Lo stesso succede per i doppioni di Integra (due codici, una P.IVA).
- Correzione puntuale: nei due rami `if (gia)` creare, se manca, `codici_esterni { sistema: 'integra', tipo, codice, etichetta: codice, entita_id: gia.id }` e un evento `crud/update` nel registro, sempre in `tx`; restituire `{ gia_presente: true, collegato: true, id }`.
- Prova che la verifica: test/anagrafica-integra.spec.ts: cliente con soggetto e P.IVA ma senza codice integra → `importa` → esiste `codici_esterni` integra che punta a quel cliente e una seconda `cerca` non lo propone più.
- Esecutore: DeepSeek V4 Flash — un file, ramo locale.
- File toccati: app/backend/src/anagrafica-integra.ts, app/backend/test/anagrafica-integra.spec.ts
- Dipende da / correlato a: D-102, D-111; `doppioni-anagrafica-integra.md`

> **Per questo pacchetto:** Il codice registrato qui è anche la strada per collegare a Integra un soggetto censito nel CRM: 0b-04 toglie `codice_integra` dalla creazione del ruolo (R1-08).

### R1-05 — Import concorrente dello stesso soggetto: 500 invece di «già presente»
- Gravità: P3
- Dove: app/backend/src/anagrafica-integra.ts:94-135 (`importa`, nessun lock né `unico`)
- Problema: due `POST /integra/importa` contemporanei per la stessa riga passano entrambi il controllo su `codici_esterni` e il secondo cade su P2002 (`codici_esterni_sistema_tipo_codice_key`, `soggetti_piva_norm_key` o `clienti_soggetto_id_key`). I vincoli evitano il doppione, ma la risposta è un 500 generico.
- Scenario: due operatori premono *Importa da Integra* sullo stesso fornitore a pochi ms di distanza → il secondo vede un errore del server e il registro scrive un'eccezione.
- Correzione puntuale: dentro la transazione `SELECT pg_advisory_xact_lock(hashtext('integra:' || tipo || ':' || codice))` prima del `findFirst`, oppure intercettare P2002/23505 e rispondere `gia_presente` (riusare `unico` di soggetti.ts esportandolo).
- Prova che la verifica: test/anagrafica-integra.spec.ts: `Promise.all([importa(...), importa(...)])` → un `creato`, un `gia_presente`, un solo cliente.
- Esecutore: DeepSeek V4 Flash — modifica locale.
- File toccati: app/backend/src/anagrafica-integra.ts, app/backend/test/anagrafica-integra.spec.ts
- Dipende da / correlato a: V13, D-111

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

> **Per questo pacchetto:** In questo pacchetto **solo** le prove di `anagrafica-integra.spec.ts`/`integra.spec.ts`: R1-01, R1-02 (`importa` appeso → 502), R1-03, R1-04, R1-05, i due `it` sui permessi (utente senza `dati.importa` → 403; body `{ tipo: 'cliente', id_integra: 'x', extra: 1 }` → 400), e `importa` con `documento_id` (collega in una transazione; senza il permesso dei documenti → 403 e nessun fornitore creato; P.IVA diversa → 409). Le altre parti: 0b-02 (documenti), 0b-03 (clienti, storico), 0b-04 (soggetti).

**Pacchetto sensibile (Integra, transazioni (V13), permessi).** Prima di consegnare carica davvero (strumento `skill` di OpenCode) `owasp-security` e `ponytail-review`, e `postgresql-code-review` se scrivi SQL; rileggi il tuo diff con quelle regole e scrivi nel resoconto cosa hanno trovato. A fine onda Claude Code fa comunque la **review completa** (`owasp-security`, `/code-review`, `/ponytail:ponytail-review`).

## File ammessi (solo questi)

- `app/backend/src/anagrafica-integra.ts`
- `app/backend/src/integra.ts`
- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`
- `app/backend/test/anagrafica-integra.spec.ts`
- `app/backend/test/integra.spec.ts`
- `strumenti/prove/app_documenti.py`
- `strumenti/opencode/resoconto-collaudo-0b-01.md`

## File vietati

Li modificano altri pacchetti della **stessa onda** (0 bis), in parallelo:

- `app/backend/prisma/import-storico.ts`
- `app/backend/src/clienti.ts`
- `app/backend/src/documenti.ts`
- `app/backend/src/fornitori.ts`
- `app/backend/src/proposta.ts`
- `app/backend/src/soggetti.ts`
- `app/backend/src/storico.ts`
- `app/backend/test/clienti.spec.ts`
- `app/backend/test/documenti-pratica.spec.ts`
- `app/backend/test/documenti.spec.ts`
- `app/backend/test/fornitori.spec.ts`
- `app/backend/test/proposta.spec.ts`
- `app/backend/test/soggetti.spec.ts`
- `app/backend/test/storico.spec.ts`
- `app/frontend/app/(app)/clienti/VistaClienti.tsx`
- `app/frontend/app/(app)/documenti/VistaDocumenti.tsx`
- `app/frontend/app/(app)/fornitori/VistaFornitori.tsx`
- `app/frontend/app/(app)/soggetti/VistaSoggetti.tsx`
- `app/frontend/app/stile/stile.css`
- `app/frontend/componenti/CercaInIntegra.tsx`
- `app/frontend/componenti/FormAgenzia.tsx`
- `strumenti/prove/app_clienti.py`
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

Lavora **solo** sul tuo database di prova `decobrands_test_0b_01` (il nome contiene `decobrands_test`, come vuole
`app/backend/test/ambiente.ts`, che legge `DATABASE_URL_TEST`). Altri pacchetti della stessa onda lanciano jest
nello stesso momento su database loro: sul database condiviso `decobrands_test` due giri si cancellano i dati a
vicenda (A6-05). Anche la cartella dei documenti di prova va separata: `ambiente.ts` la mette in
`os.tmpdir()`, quindi cambia `TMP`/`TEMP`. In Git Bash, da `app/backend`:

```bash
export DATABASE_URL_TEST="$(grep '^DATABASE_URL' .env | cut -d= -f2- | sed 's#/decobrands_db#/decobrands_test_0b_01#')"
node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL_TEST.replace('/decobrands_test_0b_01','/postgres')});c.connect().then(()=>c.query('CREATE DATABASE decobrands_test_0b_01 OWNER decobrands')).then(()=>console.log('creato')).catch(e=>console.log(e.message)).finally(()=>c.end())"
DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy
export TMP="$TEMP/decobrands-0b-01"; export TEMP="$TMP"; mkdir -p "$TMP"
npx jest test/<file>.spec.ts            # sempre con le variabili sopra nella stessa shell
```

Alla fine cancella il database: lo stesso `node -e` con `DROP DATABASE decobrands_test_0b_01`. **Mai** `decobrands_db`, mai il
database `decobrands_test` condiviso, mai Integra (192.168.239.49: non si contatta per nessun motivo).

Prove da far passare:

- backend: `cd app/backend && npx jest test/anagrafica-integra.spec.ts test/integra.spec.ts test/seed.spec.ts` (con le variabili sopra) → **0 KO**;
- `cd app/backend && npx tsc --noEmit` → 0 errori;
- frontend: `cd app/frontend && npx tsc --noEmit` → 0 errori;
- prove nel browser interessate: `app_documenti.py` (aggiungi: import del fornitore dal documento → righe ancora visibili nella scheda Righe; secondo clic su *Importa da Integra* durante l'attesa → una sola richiesta). **Non lanciarle** (porte e cartella `.next` sono condivise con gli altri pacchetti): aggiorna quelle indicate nei rilievi, controlla la sintassi con `python -m py_compile <file>` e scrivi nel resoconto quali vanno lanciate. Le lancia il controllo di fine onda.
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-0b-01.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
