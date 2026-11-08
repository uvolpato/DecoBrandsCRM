# A3 — Database e transazioni

Collaudo finale, 08/11/2026. Agente A3 (sola lettura).

- **Skill caricate** (strumento Skill): `postgresql-code-review`, `supabase-postgres-best-practices`, `prisma-client-api`, `prisma-cli`.
- **Prove lanciate**: nessuna (regola del piano: `npm test` e prove solo A6). Nessun comando sul database, nessun contatto con Integra.
- **Letto**: `prisma/schema.prisma`, tutte le 17 migrazioni (vincoli, indici, trigger), tutti i `$transaction` di `src/` (accesso, bollettini, bollettino, clienti, documenti, fornitori, impostazioni-api, incassi, integra, lettura, liquidazioni, registro, scartati, sistema, subagenti, superutente, utenti), tutto l'SQL grezzo (`$queryRaw`/`$executeRaw`/`Prisma.sql`), `integra.ts`, `registro.ts`, `eventi.ts`, `motore/dati.ts`.
- **Non controllato**: allineamento schema ↔ migrazioni con `prisma migrate diff --from-migrations` (vuole un database ombra: scrive, escluso); piani `EXPLAIN` su volumi veri; seed; prestazioni in memoria del motore (A7); regole dei soldi dentro il motore (A2).

**Esito generale**: buono. Nessuna iniezione SQL (tutto parametrico; ORDER BY da liste fisse validate con `@IsIn`; schema di Integra validato con regex). Ponte di Integra in sola lettura (`default_transaction_read_only=on`, solo SELECT parametriche, protocollo esteso nel giro). Email e spostamento dei file dopo il commit, file nuovo su disco prima del commit, eliminazione dei file dopo il commit. Liquidazione, bollettini, documenti, percentuali ed eccezioni bloccano il fornitore come chiede D-51. Il registro è immutabile con trigger. I rilievi sotto sono i buchi rimasti.

---

### A3-01 — Agenzie (interscambio) modificabili anche nel periodo chiuso, senza blocco del fornitore
- Gravità: P1
- Dove: `app/backend/src/clienti.ts:179` (`creaAgenzia`), `:226` (`modificaAgenzia`), `:328` (`eliminaAgenzia`)
- Problema: create/modifica/elimina di `interscambio` non controllano `ultimaChiusura` e non bloccano la riga del fornitore; percentuali ed eccezioni lo fanno (D-51), le agenzie no. L'agenzia decide subagente e sconto (quindi scaglione e %) di ogni documento alla sua data (D-35).
- Scenario: bollettino di luglio di Gries verificato, trimestre 3 aperto. Si cambia lo sconto dell'agenzia Agri Aggio × Gries (valida dal 01/01/2026) da 10 a 20 → le fatture di luglio, già confrontate e congelate nel bollettino, nella liquidazione del 3° trimestre pagano al subagente la % dello scaglione 20 invece di quella usata alla verifica. Peggio: si elimina l'agenzia di un trimestre già liquidato e poi il subagente (`subagenti.elimina` passa, non ha più agenzie) → Report subagenti e Analisi dei trimestri chiusi, ricalcolati da `caricaDati`, perdono il subagente e cambiano numeri. Inoltre, senza blocco del fornitore, un cambio contemporaneo alla chiusura del trimestre passa fra le letture di `caricaDati` (READ COMMITTED, 9 SELECT separate).
- Correzione puntuale: spostare `dopoChiusura` da `fornitori.ts:126` a `motore/dati.ts` (accanto a `ultimaChiusura`) ed esportarla. Nelle tre rotte, come prima istruzione della transazione: `SELECT id FROM fornitori WHERE id IN (…) ORDER BY id FOR UPDATE` (in modifica vecchio e nuovo fornitore), poi:
  - crea: `dopoChiusura(tx, fid, valido_dal, …)`;
  - modifica: se cambiano subagente, fornitore, sconto, pct, regola o `valido_dal` → `prima.valido_dal` e il nuovo `valido_dal` devono essere dopo la chiusura (altrimenti 409 «chiudi l'agenzia e aprine una nuova da una data successiva»); se cambia solo `valido_al` → vecchio e nuovo `valido_al` (se non null) dopo la chiusura, come `fornitori.ts:524`;
  - elimina: solo se `valido_dal` è dopo la chiusura.
  Il codice cliente del fornitore resta libero (serve solo all'abbinamento).
- Prova che la verifica: `app/backend/test/clienti.spec.ts` — agenzia con bollettino chiuso nel periodo: modifica sconto 409, elimina 409, chiusura con `valido_al` dopo la chiusura 200.
- Esecutore: DeepSeek V4 — lock e regola dei periodi chiusi.
- File toccati: `app/backend/src/clienti.ts`, `app/backend/src/fornitori.ts`, `app/backend/src/motore/dati.ts`, `app/backend/test/clienti.spec.ts`; spec §4.2.6/§19 (riga *Perché*), `app/frontend/lib/guida.ts` (pagina Clienti, "da sapere").
- Dipende da / correlato a: D-35, D-51 (vedi *Da decidere*), A2 (numeri dei trimestri chiusi).

### A3-02 — Il file di un bollettino si può scartare (e poi cancellare) o abbinare a una pratica
- Gravità: P1
- Dove: `app/backend/src/bollettini.ts:163` (carica), `app/backend/src/documenti.ts:686` (`scarta`), `documenti.ts:1056` (`registra`), `app/backend/src/sistema.ts:419` (`pulisciScartati`)
- Problema: legare un documento in arrivo a un bollettino scrive solo `abbinato_bollettino_id`; lo stato resta `in_coda`/`da_controllare`. `scarta` e `registra` controllano solo lo stato, non `abbinato_bollettino_id`. Nessun vincolo nel database lo impedisce.
- Scenario: PDF del bollettino di agosto caricato e legato al bollettino 8/2026; in Documenti resta «da controllare»; un operatore lo scarta («già caricato») → dopo 90 giorni `pulisciScartati` cancella riga e file: il bollettino perde il suo PDF (perdita di dati). Oppure lo abbina come fattura a una pratica: lo stesso file è bollettino e fattura.
- Correzione puntuale:
  - `documenti.ts` `scarta` e `registra` (blocco `if (b.arrivo_id)`): se `abbinato_bollettino_id` non è null → 409 «Il file è il PDF di un bollettino».
  - Migrazione nuova (onda 0): `ALTER TABLE documenti_in_arrivo ADD CONSTRAINT documenti_in_arrivo_scarto_libero_check CHECK (stato <> 'scartato' OR (abbinato_bollettino_id IS NULL AND abbinato_pratica_id IS NULL));` e `… CHECK (abbinato_bollettino_id IS NULL OR abbinato_pratica_id IS NULL);` (prima verificare che il seed non li violi).
  - Lo stato del file legato al bollettino (lasciarlo leggere o portarlo ad `abbinato`) e la sua uscita dall'elenco *da controllare* li decide A4/Ugo: qui solo il blocco.
- Prova che la verifica: `app/backend/test/bollettini.spec.ts` (carica con `arrivo_id`, poi `POST /documenti/:id/scarta` → 409; abbina a pratica → 409); `app/backend/test/vincoli.spec.ts` (UPDATE diretto a `scartato` con bollettino → errore 23514).
- Esecutore: DeepSeek V4 — migrazione e vincoli.
- File toccati: `app/backend/prisma/migrations/<nuova>_bollettino_file/migration.sql`, `app/backend/src/documenti.ts`, `app/backend/test/bollettini.spec.ts`, `app/backend/test/vincoli.spec.ts`.
- Dipende da / correlato a: D-54, D-60, D-74; rilievi A4 sul canale unico.

### A3-03 — Annullare un documento cancella in cascata le decisioni di un bollettino chiuso
- Gravità: P2
- Dove: `app/backend/src/documenti.ts:822` (`togliibile`), `documenti.ts:1030` (delete); FK `bollettini_attese.documento_id ON DELETE CASCADE` (migrazione `20261103150000_bollettini_attese`)
- Problema: `togliibile` blocca se il documento ha righe del bollettino, note, correzioni, ma non guarda `bollettini_attese` (decisioni *attendere/contestato* sui documenti mancanti, D-56).
- Scenario: bollettino di luglio chiuso come *contestato* con l'attesa «contestato: fattura F 123 mancante»; F 123 non è liquidata → l'operatore annulla F 123 → la riga di `bollettini_attese` del bollettino chiuso sparisce senza traccia nel bollettino (resta solo l'evento `documento.delete`); il testo della contestazione non si ricostruisce più.
- Correzione puntuale: in `documentoDi` (`documenti.ts:813`) aggiungere `attese_bollettino: true` a `_count.select`; in `togliibile`: `if (d._count.attese_bollettino) throw new ConflictException(\`${quale} ha una decisione in un bollettino: ${cosa}\`)`. Rete di sicurezza (onda 0): migrazione che porta la FK `bollettini_attese_documento_id_fkey` a `ON DELETE RESTRICT` (e `onDelete: Restrict` nello schema).
- Prova che la verifica: `app/backend/test/documenti-pratica.spec.ts` — attesa su un documento, `DELETE` del documento → 409; `sposta` → 409.
- Esecutore: DeepSeek V4 — vincolo e migrazione.
- File toccati: `app/backend/src/documenti.ts`, `app/backend/prisma/schema.prisma`, `app/backend/prisma/migrations/<nuova>_attese_restrict/migration.sql`, `app/backend/test/documenti-pratica.spec.ts`.
- Dipende da / correlato a: D-54, D-56.

### A3-04 — La pulizia degli scartati cancella anche un documento appena recuperato
- Gravità: P2
- Dove: `app/backend/src/sistema.ts:419-424` (`pulisciScartati`)
- Problema: legge gli scartati vecchi senza bloccarli, poi `deleteMany({ id: { in } })` senza ricontrollare lo stato.
- Scenario: alle 03:00 la pulizia legge lo scartato X (scartato 91 giorni fa); nello stesso istante un utente fa *Recupera* su X (`scartati.ts:134`, commit prima del delete) → X ora è `da_controllare` ma viene cancellato con il suo file.
- Correzione puntuale: sostituire `findMany` con `tx.$queryRaw\`SELECT id, file_percorso FROM documenti_in_arrivo WHERE stato = 'scartato' AND scartato_il < ${limite} FOR UPDATE SKIP LOCKED\``; nel `deleteMany` aggiungere anche `stato: 'scartato'`.
- Prova che la verifica: `app/backend/test/scartati.spec.ts` — scartato vecchio portato a `da_controllare` dopo la lettura (finto) → non cancellato; più semplice: verificare che `deleteMany` con stato diverso non tocchi la riga.
- Esecutore: DeepSeek V4 Flash — un file, modifica locale.
- File toccati: `app/backend/src/sistema.ts`, `app/backend/test/scartati.spec.ts`.
- Dipende da / correlato a: A3-05, D-74.

### A3-05 — Eliminazione di uno scartato e nuovo arrivo dello stesso file: riga in coda senza file
- Gravità: P2
- Dove: `app/backend/src/scartati.ts:164-186` (`elimina`), `sistema.ts:428-433`, `app/backend/src/documenti.ts:86` (`riceviDocumento`)
- Problema: il nome del file è l'impronta (D-34). L'eliminazione cancella il file **dopo** il commit; se nel frattempo lo stesso file arriva di nuovo, `riceviDocumento` trova il file ancora lì (`EEXIST`, non lo riscrive), crea la riga e il file sparisce subito dopo.
- Scenario: l'amministratore elimina lo scartato X mentre la casella riceve di nuovo lo stesso PDF → riga nuova `in_coda` con il file cancellato → 3 letture fallite, `lettura.fallita`; l'email è già spostata fra le lette: il documento va recuperato a mano.
- Correzione puntuale: in `riceviDocumento`, dopo il `$transaction` riuscito, riscrivere il file in modo idempotente: `await writeFile(join(radice, file_percorso), f.dati, { flag: 'wx' }).catch((e) => { if (e.code !== 'EEXIST') throw e; })` con commento `// ponytail: rimette il file se un'eliminazione dello stesso file l'ha tolto dopo il commit`. La finestra residua (cancellazione più lenta dell'intera transazione d'arrivo) è accettabile.
- Prova che la verifica: `app/backend/test/documenti.spec.ts` — `rm` del file fra due invii dello stesso contenuto, poi il file esiste.
- Esecutore: DeepSeek V4 Flash — un file, due righe.
- File toccati: `app/backend/src/documenti.ts`, `app/backend/test/documenti.spec.ts`.
- Dipende da / correlato a: A3-04, A4 (canale unico), D-34.

### A3-06 — Aggiornamenti dal vivo persi: il canale legge il registro per id crescente
- Gravità: P2
- Dove: `app/backend/src/eventi.ts:48-58` (`nuoveAree`), `:111` (`maxId`)
- Problema: l'id (BIGSERIAL) si assegna all'INSERT, non al commit. Una transazione lunga prende l'id N, una corta prende N+1 e committa prima: il giro legge N+1, porta `ultimo` a N+1 e N, committato dopo, non si vedrà mai.
- Scenario: la chiusura del trimestre (fino a 30 s, scrive l'evento `liquidazione` presto) e intanto un documento caricato committa → le schede aperte non ricevono l'area `liquidazioni`: Liquidazioni mostra «Da liquidare» finché non si ricarica a mano (D-23 conteggi dal vivo).
- Correzione puntuale: rileggere una finestra e scartare i già visti. In `EventiService`: `private visti = new Set<bigint>()`; `nuoveAree(db, ultimo, visti)` interroga `id > ultimo - 500n` (`take: 1000`), tiene solo le righe non in `visti`, le aggiunge a `visti`, toglie da `visti` gli id `< nuovoUltimo - 500n`. `// ponytail: finestra di 500 id; LISTEN/NOTIFY se il registro cresce più di 500 righe in 4 s`.
- Prova che la verifica: `app/backend/test/eventi.spec.ts` — inserire id 10 e 12, chiamare `nuoveAree`, poi inserire 11 (id esplicito) e ri-chiamare → l'area di 11 arriva.
- Esecutore: DeepSeek V4 — cambio di logica.
- File toccati: `app/backend/src/eventi.ts`, `app/backend/test/eventi.spec.ts`.
- Dipende da / correlato a: D-23, D-31, §16.4.2.

### A3-07 — Sollecito di pagamento: tutto il database letto in una transazione da 5 s, e prima del blocco
- Gravità: P2
- Dove: `app/backend/src/incassi.ts:98-112` (`registra`)
- Problema: `caricaDati(tx)` (tutte le pratiche, tutti i bollettini) gira dentro una transazione interattiva col tempo limite predefinito di Prisma (5 s); le fatture da sollecitare si scelgono prima del `FOR UPDATE`.
- Scenario: con qualche migliaio di pratiche `caricaDati` supera 5 s → `P2028` (transazione scaduta) → 500, il sollecito copiato non si registra. Oppure una fattura segnata *pagata* (`incasso`) fra la lettura e il blocco riceve lo stesso il +1 ai solleciti.
- Correzione puntuale: `{ timeout: 30_000 }` sul `$transaction` (come `liquidazioni.ts:148`); dopo il `FOR UPDATE` riscrivere l'update come `updateMany({ where: { id: { in: ids }, stato_incasso: { not: 'pagata' } } })` e usare il `count` restituito nella risposta e nell'evento.
- Prova che la verifica: `app/backend/test/incassi.spec.ts` (esistente, da rilanciare) + caso con una fattura portata a `pagata` prima della chiamata.
- Esecutore: DeepSeek V4 Flash — un file, locale.
- File toccati: `app/backend/src/incassi.ts`, `app/backend/test/incassi.spec.ts`.
- Dipende da / correlato a: A7 (tempi), §5.14.

### A3-08 — Chiusura del bollettino con tempo limite predefinito e un UPDATE per riga
- Gravità: P2
- Dove: `app/backend/src/bollettino.ts:274-300` (`chiudi`)
- Problema: dentro la transazione (limite 5 s) ci sono i blocchi, `caricaDatiBollettino`, la riconciliazione, un `UPDATE` per ogni riga del fornitore, `eventiIncassi` (un evento per documento).
- Scenario: bollettino di Gries con 300 righe → 300 UPDATE sequenziali + eventi; su un server carico si superano 5 s → `P2028`, il bollettino non si chiude e l'utente riprova; nessun danno ai dati ma la funzione non va.
- Correzione puntuale: `{ timeout: 30_000 }` sul `$transaction` di `chiudi` (bollettino.ts:274), con commento `// ponytail: un UPDATE per riga; updateMany per gruppi se i bollettini superano qualche centinaio di righe`.
- Prova che la verifica: `app/backend/test/bollettino.spec.ts` (esistente).
- Esecutore: DeepSeek V4 Flash — una riga.
- File toccati: `app/backend/src/bollettino.ts`.
- Dipende da / correlato a: A7.

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

### A3-10 — Numero della pratica senza vincolo UNIQUE
- Gravità: P3
- Dove: `app/backend/src/documenti.ts:1099-1103` (`nuovaPratica`); schema `ordini_fornitore_testata.numero_ordine`
- Problema: l'unicità di `OF/AAAA/NNN` si regge solo sul blocco consultivo; nessun vincolo nel database, e la `max(…) … LIKE 'OF/2026/%'` scorre tutta la tabella.
- Scenario: uno script (seed, ricalcolo, import futuro) o una rotta nuova che crea pratiche senza il blocco produce due `OF/2026/015`: i documenti si archiviano nella stessa cartella `pratiche/…/OF_2026_015` e le ricerche per numero confondono le pratiche.
- Correzione puntuale (onda 0): migrazione `CREATE UNIQUE INDEX "ordini_fornitore_testata_numero_ordine_key" ON "ordini_fornitore_testata"("numero_ordine");` + `@@unique([numero_ordine])` nello schema; prima un controllo dei doppioni sul seed.
- Prova che la verifica: `app/backend/test/vincoli.spec.ts` — due insert con lo stesso numero → `23505`.
- Esecutore: DeepSeek V4 — migrazione.
- File toccati: `app/backend/prisma/schema.prisma`, `app/backend/prisma/migrations/<nuova>_numero_pratica_unico/migration.sql`, `app/backend/test/vincoli.spec.ts`.
- Dipende da / correlato a: D-60.

### A3-11 — Chiavi esterne senza indice sulle tabelle grandi
- Gravità: P3
- Dove: schema/migrazioni — `documenti_campi.corretto_da`, `documenti_in_arrivo.utente_id`, `documenti_in_arrivo.scartato_da`, `bollettini_righe.deciso_da`, `ordini_fornitore_testata.agente_id`
- Problema: ON DELETE SET NULL/RESTRICT su queste FK senza indice: l'eliminazione di un utente (o agente) scorre le tabelle intere.
- Scenario: `DELETE /utenti/:id` con `documenti_campi` a centinaia di migliaia di righe (decine di campi per documento) → scansioni sequenziali dentro la transazione che tiene il blocco consultivo `decobrands.utenti` → tutte le scritture sugli utenti ferme per secondi.
- Correzione puntuale (onda 0): una migrazione con `CREATE INDEX` su quelle 5 colonne e i relativi `@@index` nello schema. Le altre FK senza indice (`liquidazioni.chiusa_da`, `impostazioni.aggiornato_da`, `*_versioni.creato_da`, `subagenti.agente_id`, …) stanno su tabelle piccole: si lasciano.
- Prova che la verifica: `npx prisma migrate status` sul database di prova + `app/backend/test/utenti.spec.ts` (eliminazione).
- Esecutore: DeepSeek V4 — migrazione.
- File toccati: `app/backend/prisma/schema.prisma`, `app/backend/prisma/migrations/<nuova>_indici_fk/migration.sql`.
- Dipende da / correlato a: —

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

---

## Riepilogo

| Gravità | N. | ID |
|---|---|---|
| P0 | 0 | — |
| P1 | 2 | A3-01, A3-02 |
| P2 | 6 | A3-03, A3-04, A3-05, A3-06, A3-07, A3-08 |
| P3 | 4 | A3-09, A3-10, A3-11, A3-12 |

Migrazioni proposte (onda 0, in serie): A3-02 (CHECK su scarto e doppio abbinamento), A3-03 (FK attese → RESTRICT), A3-10 (UNIQUE numero pratica), A3-11 (indici FK).

## Da decidere (Ugo)

1. **D-51 vale anche per le agenzie (`interscambio`)?** D-51 parla di percentuali ed eccezioni; D-35 dice che «un cambio di subagente non deve spostare le provvigioni passate». A3-01 propone di estendere D-51 alle agenzie (niente modifiche o eliminazioni prima dell'ultima chiusura, si chiude e se ne apre una nuova). Se sì: riga D-nn nel §19 e *Perché* in §4.2.6.
2. **Regole del fornitore senza data** (`fornitori.tipo_provvigione`, `giorno_bollettino`, `giorni_incasso`): `PUT /fornitori/:id` le cambia per tutto il passato. Passare da *fatturato* a *maturato* cambia come si ricalcolano dal vivo i mesi chiusi (Analisi, Report subagenti; la fotografia della liquidazione resta). Bloccarle dopo la prima chiusura, datarle, o accettare? (D-51, §5.5).
3. **Righe dei bollettini**: nel backend nessuna rotta crea `bollettini_righe` (solo il seed); da confermare che l'importazione delle righe (dalla lettura del PDF) sia un'attività ancora aperta del piano e non una mancanza.
