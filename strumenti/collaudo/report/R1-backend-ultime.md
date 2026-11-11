# R1 — Revisione backend delle ultime modifiche (`89a4105..HEAD`, 08–11/11/2026)

Oggetto: anagrafica a soggetti (F1-A8a/b), import vecchio CRM (F1-A9a), agenzia dal documento (F2-A5),
ponte vero verso Integra (D-100…D-113), storico legami (F1-A12), anagrafica su richiesta (F1-A11/A11b),
proposta del documento (F2-A6), scaglioni obbligatori (F1-A13).

**Skill caricate (strumento Skill):** `owasp-security`, `postgresql-code-review`, `prisma-client-api`,
`nestjs-best-practices`.

**Prove lanciate:** nessuna (consegna: sola lettura, `npm test` lo lancia la sessione principale).
Integra non contattata; `ponte:prova` e `import:*` non eseguiti.

**Non controllato:** frontend; `import-vecchio-crm.ts` riga per riga (solo guardia del database,
transazione, idempotenza); `seed/00-base.ts`; `verifica-import.js`; prestazioni misurate (solo lette
dal codice); D-51 (periodo chiuso), che il diff non tocca.

**Esito in breve:** migrazioni additive e corrette sul database esistente (nessun NOT NULL/UNIQUE nuovo
su righe vecchie, CHECK di `codici_esterni` solo allargati). Il ponte è in sola lettura
(`default_transaction_read_only=on`, solo SELECT parametriche, schema validato con regex). Le rotte nuove
hanno guardie (`dati.importa`, `dati.modifica`, `dati.consulta`) e DTO con `forbidNonWhitelisted`.
I problemi veri stanno nella tenuta quando il ponte non risponde, nei doppioni di soggetto per le P.IVA
estere e nella riconciliazione tra import da Integra e soggetti già presenti.

---

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

### R1-08 — Ruolo cliente/fornitore creato dal soggetto con un `codice_integra` scritto dal browser, senza verifica sul ponte
- Gravità: P2
- Dove: app/backend/src/soggetti.ts:731, :745, :760 (`creaRuolo`)
- Problema: il codice di Integra digitato diventa `codici_esterni(integra, …)` senza controllare che quel codice esista nella vista né che la sua P.IVA sia quella del soggetto. Da quel momento la sincronizzazione (integra.ts `applicaCliente`, che riconosce solo per codice) scrive su questo ruolo i dati della riga di Integra con quel codice (V12; D-111 vuole che il legame con Integra nasca dall'import, che rilegge dal ponte).
- Scenario: l'operatore crea il ruolo cliente di «Verdi SNC» (P.IVA A) scrivendo per sbaglio `C0124`, che in Integra è «Neri SRL» (P.IVA B) → al giro successivo la versione corrente del cliente Verdi diventa ragione sociale «Neri SRL», P.IVA B: documenti, agenzie e liquidazioni di Verdi mostrano Neri.
- Correzione puntuale: togliere `codice_integra` da `NuovoRuolo` (il codice si collega solo con `POST /integra/importa`), oppure, se resta, leggere la riga dal ponte per codice dentro la rotta e rifiutare (409) se la P.IVA normalizzata non coincide con `s.piva_norm`.
- Prova che la verifica: test/soggetti.spec.ts: `POST /soggetti/:id/ruoli` con `codice_integra` → 400 (campo non ammesso), oppure 409 con P.IVA diversa dalla vista simulata.
- Esecutore: DeepSeek V4 — tocca l'identità verso Integra.
- File toccati: app/backend/src/soggetti.ts, app/backend/test/soggetti.spec.ts (e il form del frontend se manda il campo)
- Dipende da / correlato a: D-100, D-111, V12

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

---

## Da decidere (Ugo)

1. **`richiediAgenzia` su tutti i documenti registrati in pratica** (documenti.ts:1167-1175, :1184, :1067): una fattura o nota di credito con data successiva alla **chiusura** dell'agenzia (cliente non più seguito, senza agenzia successiva) non si registra più nella pratica aperta prima. Le provvigioni di quell'ordine restano fuori. È quello che vuole D-106 («alla data del documento») o per i documenti di una pratica esistente deve bastare l'agenzia alla data dell'ordine (D-35/D-60)?
2. **Modifica della P.IVA del soggetto** (soggetti.ts:450-484): cambia il master ma non `clienti_versioni`/`fornitori_versioni` dei ruoli, che restano con la P.IVA vecchia (e la proposta riconosce il cliente su quella). La versione del ruolo va aggiornata insieme (nuova versione D-46) o il master è solo indicativo finché c'è Integra?
3. **`sconti` con `ON DELETE CASCADE` da `interscambio`** (migrazione 20261108090000, riga 184): eliminare un'agenzia cancella anche gli sconti storici collegati. Oggi la tabella non si usa; prima di usarla, va bene la cascata o serve `RESTRICT` come per le altre FK dell'anagrafica?

## Conteggio

| Gravità | N | ID |
|---|---|---|
| P0 | 0 | — |
| P1 | 1 | R1-01 |
| P2 | 9 | R1-02, R1-03, R1-04, R1-06, R1-07, R1-08, R1-09, R1-10, R1-13 |
| P3 | 3 | R1-05, R1-11, R1-12 |
