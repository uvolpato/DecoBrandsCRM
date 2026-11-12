# Resoconto · Onda 0 bis · Pacchetto 0b-01 — Import da Integra dal documento

Data: 12/11/2026 · Esecutore: DeepSeek V4 Flash · Pacchetto: `strumenti/opencode/collaudo-0b-01-import-integra-documento.md`

## Cosa ho fatto, per rilievo

### R2-01 (parte 2, D-133) — import e collegamento del documento in una transazione

- `app/backend/src/anagrafica-integra.ts:114-252` — `importa` prende un settimo argomento `documentoId`
  (`bigint | null`). Con `documento_id`:
  - rifiuta `tipo: 'cliente'` (400): il documento si collega solo al fornitore;
  - blocca il documento con `SELECT id FROM documenti_in_arrivo … FOR UPDATE` e controlla, **prima di
    qualsiasi scrittura**, che sia `da_controllare` e senza fornitore (409), che abbia un nome fornitore
    letto (409) e che la ricerca sul nome letto — la stessa della proposta, `cerca(..., 'fornitore', letto)`,
    riletta dal server in `tx` (V12) — dia una sola riga, quella importata, con la **P.IVA normalizzata**
    uguale a quella della vista (`normalizzaPiva` di `soggetti.ts`), altrimenti 409; ponte che non risponde
    → 502. Zero righe (codice già in anagrafica da una pagina vecchia) → si collega lo stesso;
  - scrive **solo** `fornitore_id` e `fornitore_versione_id` (+ l'evento `documento.update` nel registro,
    da `tx`) con l'helper `collegaDocumento` (`:170-184`), chiamato anche nei rami «già presente», così un
    documento resta collegato anche quando il fornitore c'era già;
  - se il fornitore non ha `versione_corrente_id` si ferma con 409, perché la coppia è legata dal CHECK
    `documenti_in_arrivo_fornitore_check`.
- `app/backend/src/anagrafica-integra.ts:260-296` — `ImportaBody` accetta `documento_id` facoltativo
  (intero ≥ 1, `forbidNonWhitelisted` fa il resto); la rotta `POST integra/importa` controlla
  **`provvigioni.modifica`** con `permessiDi` prima di chiamare `importa` (403: niente import, niente
  collegamento). La risposta porta sempre `id` (D-135).
- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx:365-393` — `importaFornitore` manda
  `{ tipo, id_integra, documento_id }` e poi fa solo `carica()`: **il `PUT documenti/:id` non c'è più**.
  `importaCliente` non scriveva nulla dopo l'import: invariato.
- `documenti.ts` **non toccato** (la parte 1, `correggi`, è di 0b-02).

### R2-07 — «Configura l'agenzia» senza permesso

`VistaDocumento.tsx:131` (`const puoAgenzia = puo('dati.modifica')`) e i due pulsanti (`:421`, `:440`):
`disabled` + `title` «Serve il livello operatore in Dati», come in Clienti.

### R2-08 — doppio import

`VistaDocumento.tsx:137` `const [importando, setImportando]` (nome `importando`, non `importo`: `importo` è
già l'importo del documento e si confonderebbero). Le due funzioni hanno `if (… || importando) return` e
`try/finally`; i pulsanti `disabled={!puoImporta || importando}` con testo «Importo…».

### R1-01 — ponte giù

`anagrafica-integra.ts:74-84` — in `cerca` ogni errore del pool diverso dal timeout diventa
`{ errore: 'ponte non raggiungibile' }` (non lancia) e apre **una** anomalia `integra.connessione`
(`apriAnomalia`, servizio `integra`, senza chiave: una riga sola, `volte` che sale), con
`dettaglio.errore = pulisci(e)`. La rotta `GET /integra/cerca` (`:273-283`) traduce `errore` in **502** con
due messaggi distinti («non risponde in tempo» / «non raggiungibile»). Elenco e dettaglio Documenti, che
usano `cerca`, non danno più 500.

### R1-02 — ponte lento

- `integra.ts:351-362` — `creaPonte` con `connectionTimeoutMillis: 3000`, `query_timeout: 5000`,
  `options: '-c default_transaction_read_only=on -c statement_timeout=5000'`.
- `anagrafica-integra.ts:119-129` — la SELECT di `importa` passa da `conTempo`: oltre 3 s → 502 «Integra
  non risponde in tempo: riprova».
- `anagrafica-integra.ts:31-45` — `conTempo` aggancia un `.catch` alla promise lasciata indietro: con
  `query_timeout` la query appesa fallisce dopo e non deve diventare un errore non gestito (farebbe cadere
  il processo). Tolto lo `shortcut:` che rimandava a `query_timeout` (ora c'è).
- La parte «interrompere le ricerche successive» resta in `documenti.ts` (0b-02), non toccato.

### R1-03 — paese della P.IVA estera

`anagrafica-integra.ts:47-58` — helper `paesePiva`, con la regola di `paeseDi` di
`prisma/import-vecchio-crm.ts` e `prisma/import-storico.ts` (citati nel commento): paese = `r.paese` se è
di due lettere, altrimenti prefisso della P.IVA normalizzata, altrimenti `IT`; se la P.IVA non ha prefisso
e il paese non è `IT` il prefisso si aggiunge prima di `datiFiscali` (`:207`). `// ponytail:` dice che la
regola vive ancora in tre punti e che l'aiuto unico arriva quando si riaprono gli script (questo pacchetto
non li tocca). `soggetti.ts` non toccato.

### R1-04 — codice di Integra registrato sul ruolo già presente

`anagrafica-integra.ts:185-196` (`registraCodice`) — nei due rami «già presente» (cliente e fornitore)
crea `codici_esterni(integra, tipo, codice, entita_id)` se manca, con evento `crud.update` (`prima`
`codice_integra: null`, `dopo` il codice), sempre in `tx`, e risponde `{ gia_presente: true, collegato:
true, id }`. La sincronizzazione ora trova l'identità e `cerca` non ripropone la riga.

### R1-05 — import concorrente

`anagrafica-integra.ts:137-138` — `SELECT 1 FROM pg_advisory_xact_lock(hashtext('integra:<tipo>:<codice>'))`
prima di leggere `codici_esterni` e di creare soggetto/ruolo (V13): il secondo import aspetta il primo e
risponde `gia_presente`. Nota: `hashtext` è a 32 bit, quindi due codici diversi possono serializzarsi per
collisione — solo attesa, nessun effetto sui dati.

### R1-13 — prove

`app/backend/test/anagrafica-integra.spec.ts`: helper `mettiDocumento` (`:65-80`) e 7 prove nuove —
R1-03 (P.IVA `DE…` e variante senza prefisso), R1-04 (codice registrato, `crud.update`, `cerca` non
ripropone), R1-05 (`Promise.all` → un `creato` e un `gia_presente`, un cliente), R1-02 (`importa` con
query appesa → 502; parametri di `creaPonte`), R1-01 (pool che rifiuta → `{ errore: 'ponte non
raggiungibile' }` + una sola anomalia aperta), D-133 (collegamento in una transazione senza toccare i campi;
fornitore diverso da quello letto → 409, niente creato, documento non collegato), rotte (`extra: 1` →
400; `documento_id` senza `provvigioni.modifica` → 403 e nessuna scrittura, con `provvigioni.modifica` →
200 e documento collegato). `test/integra.spec.ts` non ha richiesto modifiche.

## Prove lanciate

Database `decobrands_test_0b_01` (creato con `CREATE DATABASE … OWNER decobrands`, `prisma migrate deploy`,
`TMP`/`TEMP` in `%TEMP%\decobrands-0b-01`), ponte finto nelle tabelle `public.integra_v_*` dello stesso
database (il ponte vero non si tocca):

- `npx jest test/anagrafica-integra.spec.ts test/integra.spec.ts test/seed.spec.ts` → **3 suite, 47 prove,
  0 KO** (20 in `anagrafica-integra.spec.ts`, di cui 7 nuove);
- `cd app/backend && npx tsc --noEmit` → **0 errori**;
- `cd app/frontend && npx tsc --noEmit` → **0 errori**;
- `python -m py_compile strumenti/prove/app_documenti.py` → **ok** (prova **non lanciata**: porte e `.next`
  condivisi con gli altri pacchetti).

## Prove nel browser da lanciare a fine onda

- `python strumenti/prove/app_documenti.py <suffisso> <cartella>` — nuove verifiche in fondo (D-133, R2-01,
  R2-08): pulsante «Importa da Integra» attivo; al clic diventa «Importo…» e spento; un secondo clic non
  manda una seconda richiesta; **nessun `PUT /api/documenti/:id`**; dopo l'import la scheda si ricarica e le
  righe lette sono ancora nella scheda Righe. La scheda del documento è simulata con `page.route` (un
  documento vero con fornitore solo in Integra vorrebbe righe nel ponte finto e `PONTE_URL`); i controlli
  guardano il comportamento del browser, non i conti del server.
- `python strumenti/prove/app_clienti.py <suffisso> <cartella>` e `app_fornitori.py` (Cerca in Integra): la
  rotta `GET /integra/cerca` ora risponde 502 quando il ponte è giù o lento. `CercaInIntegra.tsx` (non
  toccato, è di 0b-03) mostra già `r.messaggio` quando `!r.ok`; la prova di `app_clienti.py` simula la
  vecchia risposta `200 {errore:'ponte lento'}`, che il componente continua a gestire. Da confermare a fine
  onda con il ponte acceso.

## Cose aperte / scelte da sapere

- **Nessun campo «P.IVA del fornitore» letto dall'OCR**: lo schema di lettura (`src/lettura.ts`) ha solo
  `piva_cliente`. La regola del pacchetto («la P.IVA letta del fornitore deve coincidere») è quindi
  applicata così: il server ripete la ricerca della proposta sul **nome letto** del fornitore e pretende
  **una sola** riga, quella importata, con la **stessa P.IVA normalizzata**. Se in futuro il lettore
  estrae anche la P.IVA del fornitore, il confronto diretto è una riga in più.
- **`statement_timeout=5000` vale anche per il giro di sincronizzazione** (stesso pool): se un giorno una
  lettura del giro supera i 5 s, il giro fallisce con `integra.connessione`. È la scelta del pacchetto
  (R1-02); da tenere d'occhio col ponte vero (F0-A8).
- Il nome dello stato React è `importando` (il pacchetto diceva `importo`): `importo` è già il campo
  dell'importo del documento.

## Controlli fatti (skill caricate davvero)

- **`owasp-security`** — A01: il collegamento del documento richiede `provvigioni.modifica` controllato
  **sul server e prima di ogni scrittura** (il permesso della rotta, `dati.importa`, non basta). A10: tutto
  fallisce chiuso (409/502, nessuna scrittura parziale) e i messaggi sono in italiano; il dettaglio tecnico
  del ponte passa da `pulisci(e)` (niente host, utente o password nei testi). A05: SQL parametrico
  (`hashtext($1)`, `id = $1`), nessun testo del browser entra in una query. V12: dal browser arrivano solo
  `tipo`, `id_integra` e `documento_id`; nome letto, P.IVA e stato del documento si rileggono dal database.
- **`ponytail-review`** — correttezza e complessità. Ha trovato un difetto vero: `conTempo` lasciava la
  promise appesa senza un gestore e, con il nuovo `query_timeout`, la query che fallisce dopo sarebbe
  diventata un errore non gestito (processo giù) — corretto agganciando un `.catch`. Nient'altro da
  togliere: le due funzioni interne (`collegaDocumento`, `registraCodice`) sono usate da due rami ciascuna,
  l'helper del paese è l'unico modo per non ripetere la regola dei tre punti.
- **`postgresql-code-review`** — SQL: `pg_advisory_xact_lock` è preso dentro la transazione (si libera da
  solo al commit/rollback) e `FOR UPDATE` blocca il documento prima di leggerlo; il `CHECK`
  `documenti_in_arrivo_fornitore_check` ha imposto il guard sulla versione corrente. Nessuna query nuova su
  tabelle grandi; `hashtext` (32 bit) può solo far aspettare, non sbagliare.
- **`caveman`** — risposte brevi; qui serve il testo per la documentazione, quindi prosa normale.

## Da documentare (per il pacchetto 0b-doc)

### §19 — righe nuove

> **D-133** (11/11/2026) · **Correggere un documento non tocca le righe che non arrivano; l'import da
> Integra lanciato dal documento collega il fornitore sul server, nella stessa transazione.** · Perché:
> il `PUT documenti/:id` che seguiva l'import cancellava le righe lette (valore, affidabilità, posizione) e
> lasciava il fornitore importato con il documento scollegato se il PUT falliva; due transazioni per una
> sola azione (V13). · Chi: Ugo · Dove: `anagrafica-integra.ts` (`importa`, `POST integra/importa` con
> `documento_id`), `VistaDocumento.tsx`, §4.7.1, §7.9.
>
> **D-135** (11/11/2026) · **Dopo «Importa» (Cerca in Integra) si apre la scheda del nuovo cliente o
> fornitore**; l'`id` arriva nella risposta di `integra/importa`. · Perché: la guida lo prometteva e la
> risposta non lo portava. · Chi: Ugo · Dove: `integra/importa`, `CercaInIntegra.tsx`, §4.7.1.

(R1-01, R1-02, R1-03, R1-04, R1-05 sono correzioni di difetti: se vanno registrate, bastano le righe
*Perché* nelle sezioni, senza una D nuova.)

### §4.7.1 (Anagrafica su richiesta da Integra) — riga *Perché*

> *Perché:* il ponte di Integra può essere giù o lento (VPN, password, vista): senza risposta la pagina
> Documenti deve restare utilizzabile, quindi `cerca` non lancia mai — torna «ponte lento» o «ponte non
> raggiungibile», con **una** anomalia nel registro — e solo la rotta `GET /integra/cerca` risponde 502.
> Il pool ha tempi massimi su connessione (3 s), query e `statement_timeout` (5 s): una query appesa non
> tiene occupate le due connessioni. `importa` ha lo stesso limite di 3 s. Il paese del soggetto segue la
> regola degli script d'import (paese a due lettere, altrimenti prefisso della P.IVA, altrimenti `IT`) e una
> P.IVA estera senza prefisso lo prende dal paese: altrimenti lo stesso fornitore diventa due soggetti
> (D-101, D-102). Se il ruolo esiste già senza il codice di Integra, l'import **registra il codice** (con
> evento `crud.update`): la sincronizzazione riconosce i soggetti solo per codice. Due import insieme dello
> stesso soggetto si mettono in fila con `pg_advisory_xact_lock`, così il secondo risponde «già presente»
> invece di un 500. Con `documento_id` l'import collega il documento nella stessa transazione (D-133): il
> documento si blocca (`FOR UPDATE`), si controlla `da_controllare` senza fornitore, che il nome letto porti
> a questa sola riga di Integra con la stessa P.IVA, e si scrivono solo `fornitore_id` e
> `fornitore_versione_id`; serve anche `provvigioni.modifica` (lo stesso permesso di `PUT documenti/:id`),
> controllato prima di ogni scrittura.

### §7.9 (Documento, azione proposta) — riga *Perché*

> *Perché:* «Importa da Integra» sul documento fa **una** operazione: il fornitore nasce e il documento si
> collega nella stessa transazione, senza il `PUT` dal browser (che riscriveva i dati letti e buttava le
> righe). Il collegamento non tocca campi né righe. Durante l'import il pulsante dice «Importo…» ed è
> spento: un secondo clic non rifà l'operazione. «Configura l'agenzia» richiede `dati.modifica` come in
> Clienti, e senza permesso il pulsante è spento con il motivo nel suggerimento.

### Testo per la guida (`app/frontend/lib/guida.ts`, pagina Documenti)

> **Importa da Integra (dal documento)** — Quando il fornitore del documento non è in anagrafica ma c'è in
> Integra, il pulsante lo importa e **collega il documento** nella stessa operazione: i dati letti e le
> righe restano come sono. Se il nome letto non corrisponde a quel fornitore (o in Integra ce n'è più di
> uno), l'import si ferma e chiede di correggere il nome letto. Mentre importa, il pulsante diventa
> «Importo…»: un secondo clic non fa niente. Se il ponte di Integra non risponde, Documenti continua a
> funzionare senza i candidati; «Cerca in Integra» dice di riprovare.

### Piano (`piano-lavoro-crm.md`, onda 0 bis)

> **0b-01 · Import da Integra dal documento** — collegamento del documento dentro la transazione
> dell'import (`documento_id`), tempi massimi del ponte (connessione, query, `statement_timeout`), `cerca`
> che non lancia, paese della P.IVA estera, codice di Integra sui ruoli già presenti, lucchetto sugli
> import concorrenti, pulsante dell'import con attesa e «Configura l'agenzia» col permesso. Prove: 7 in
> `anagrafica-integra.spec.ts`, 3 verifiche in `app_documenti.py`. **Ore: da approvare.**

### README (`app/README.md`)

> Nelle prove del browser, `app_documenti.py` simula la scheda di un documento con fornitore solo in
> Integra (`page.route`): il test guarda che il browser non mandi più il `PUT` che cancellava le righe e che
> aspetti l'import. Non serve il ponte vero.
