# Collaudo · Onda in attesa · Pacchetto attesa-01 — Agenzie bloccate nel periodo chiuso (D-51 esteso)

Data: 08/11/2026 · **Esecutore: DeepSeek V4** · Gravità del pacchetto: **P0** · Rilievi: A2-01, A3-01, A6-12 · Piano: `strumenti/collaudo/piano-correzioni.md`.

> ⛔ **NON LANCIARE** finché Ugo non decide la domanda **U1 — Agenzie e periodo chiuso: D-51 vale anche per le agenzie (`interscambio`)?** (`piano-correzioni.md`, *Da decidere*). Raccomandazione: (a). È l'unico modo di rispettare D-35 («un cambio di subagente non deve spostare le provvigioni passate»); lo storno usa già la fotografia (pacchetto del motore). Se Ugo sceglie diversamente, Claude Code riscrive questo prompt. Quando si lancia: Claude Code sceglie l'onda (la prima dopo 1-01, 2-08 in cui nessun altro pacchetto tocca questi file) e completa l'elenco dei file vietati.

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

### A2-01 — Agenzia modificabile o eliminabile nel periodo chiuso: storni sbagliati o persi
- Gravità: P0
- Dove: app/backend/src/clienti.ts:179-356 (`creaAgenzia`, `modificaAgenzia`, `eliminaAgenzia`); effetto in
  app/backend/src/motore/motore.ts:359-369 (storni in `righeLiquidazione`) e :113 (`percentuali`)
- Problema: scaglioni ed eccezioni hanno il blocco D-51 (`dopoChiusura`/`ultimaChiusura`), l'agenzia (`interscambio`:
  subagente, sconto, % dell'agenzia, regola mensile, date) no; il motore ricalcola tutto con l'agenzia attuale, quindi
  un cambio "in place" sposta le provvigioni passate, contro D-35 ("un cambio di subagente non deve spostare le
  provvigioni passate").
- Scenario: agenzia C×Gries, Rossi, sconto 5, dal 01/01/2026. Fattura F 10.000 € del 15/02/2026, quota 3 % → Rossi
  300 € liquidati nel 1° trim. (chiuso). Ad agosto un utente con `dati.modifica` corregge l'agenzia mettendo Bianchi
  (PUT, stesso periodo). Il bollettino di luglio (chiuso il 10/08) storna F → nel 3° trim. la voce è **−300 € a
  Bianchi** e Rossi tiene 300 €. Se invece l'agenzia viene **eliminata**, `percentuali` dà null e la voce di storno
  viene saltata (`continue` a :367): **nessuno storno**, Rossi tiene 300 € di una fattura non pagata. Cambia anche
  l'Analisi di febbraio (contro D-19, numeri stabili) e i documenti sul maturato non ancora riconosciuti.
- Correzione puntuale:
  1. clienti.ts, nelle tre rotte: dentro la transazione bloccare il fornitore (`SELECT id FROM fornitori WHERE id = … FOR UPDATE`,
     ordine D-51), leggere `c = ultimaChiusura(tx, fornitore_id)`; con `c` valorizzato rifiutare con 409 se
     (create) `valido_dal <= c`; (update) l'agenzia ha `valido_dal <= c` e cambia uno fra `subagente_id`,
     `fornitore_id`, `sconto`, `pct_subagente`, `regola_mensile`, `valido_dal`, oppure il nuovo `valido_al <= c`;
     (delete) `valido_dal <= c`. Messaggio come fornitori.ts:131 ("chiudi l'agenzia e creane una nuova da una data
     successiva"). Per update che cambia `fornitore_id` controllare la chiusura di entrambi i fornitori.
  2. motore.ts storni (:366-368): se il documento ha `liquidazione_id`, usare per la voce **subagente e provvigione
     della fotografia** di quella liquidazione (`liquidazioni.totali.documenti`, già salvati) col segno della voce,
     non `quotaSub` ricalcolato; serve caricare in dati.ts (`componi`) una mappa `documento_id → {subagente_id,
     provvigione, pct, importo}` dalle fotografie. Copre anche A2-02.
- Prova che la verifica: app/backend/test/clienti.spec.ts nuovo caso "agenzia nel periodo chiuso: modifica, fine e
  eliminazione 409, nuova da dopo la chiusura 201"; app/backend/test/liquidazioni.spec.ts nuovo caso "storno di una
  fattura liquidata: voce = −provvigione della fotografia, allo stesso subagente, anche se l'agenzia è cambiata".
- Esecutore: DeepSeek V4 — soldi, più file, lock
- File toccati: app/backend/src/clienti.ts, app/backend/src/motore/motore.ts, app/backend/src/motore/dati.ts,
  app/backend/test/clienti.spec.ts, app/backend/test/liquidazioni.spec.ts, specifica-crm-provvigioni.md (§19 nuova D-nn, §4.2.6 *Perché*), app/frontend/lib/guida.ts (Clienti › agenzie)
- Dipende da / correlato a: A2-02; D-35, D-51, D-11, D-57; eventuale rilievo A3 sul lock

> **Per questo pacchetto:** In questo pacchetto **solo il punto 1** (blocco delle tre rotte delle agenzie). Il punto 2 l'ha già fatto il pacchetto del motore (`collaudo-1-…-motore-storni-mese`).

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

> **Per questo pacchetto:** Stesso difetto di A2-01 punto 1: una sola correzione, con la funzione `dopoChiusura` spostata in `motore/dati.ts` come dice A3-01.

### A6-12 — Prova da aggiungere: agenzie nel periodo chiuso
- Gravità: P2
- Dove: `app/backend/src/clienti.ts:179,226,328`; prova `test/clienti.spec.ts` (solo sovrapposizioni e codice doppio)
- Problema: nessuna prova che modificare o eliminare un'agenzia con documenti in un trimestre liquidato o in un bollettino verificato sia rifiutato.
- Scenario da provare: agenzia di Bastasin su Gries con fatture nel 2° trimestre 2026 liquidato → `PUT /api/clienti/:id/agenzie/:aid` con `pct_subagente` diverso e `DELETE` → atteso 409; la liquidazione del 2° trimestre e il report restano uguali.
- Correzione puntuale: due `it` in `clienti.spec.ts` (rossi finché non si corregge A2-01/A3-01).
- Prova che la verifica: `npx jest test/clienti.spec.ts`.
- Esecutore: DeepSeek V4 Flash — prova (la correzione è di A2-01/A3-01).
- File toccati: `app/backend/test/clienti.spec.ts`
- Dipende da / correlato a: A2-01, A3-01, D-51

> **Per questo pacchetto:** Le prove di A6-12 sono quelle di questo pacchetto.

## File ammessi (solo questi)

- `app/backend/src/clienti.ts`
- `app/backend/src/fornitori.ts`
- `app/backend/src/motore/dati.ts`
- `app/backend/test/clienti.spec.ts`
- `strumenti/opencode/resoconto-collaudo-attesa-01.md`

## File vietati

Da completare da Claude Code al lancio (file degli altri pacchetti della stessa onda).

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

Lavora **solo** sul tuo database di prova `decobrands_test_attesa_01` (il nome contiene `decobrands_test`, come vuole
`app/backend/test/ambiente.ts`, che legge `DATABASE_URL_TEST`). Altri pacchetti della stessa onda lanciano jest
nello stesso momento su database loro: sul database condiviso `decobrands_test` due giri si cancellano i dati a
vicenda (A6-05). Anche la cartella dei documenti di prova va separata: `ambiente.ts` la mette in
`os.tmpdir()`, quindi cambia `TMP`/`TEMP`. In Git Bash, da `app/backend`:

```bash
export DATABASE_URL_TEST="$(grep '^DATABASE_URL' .env | cut -d= -f2- | sed 's#/decobrands_db#/decobrands_test_attesa_01#')"
node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL_TEST.replace('/decobrands_test_attesa_01','/postgres')});c.connect().then(()=>c.query('CREATE DATABASE decobrands_test_attesa_01 OWNER decobrands')).then(()=>console.log('creato')).catch(e=>console.log(e.message)).finally(()=>c.end())"
DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy
export TMP="$TEMP/decobrands-attesa-01"; export TEMP="$TMP"; mkdir -p "$TMP"
npx jest test/<file>.spec.ts            # sempre con le variabili sopra nella stessa shell
```

Alla fine cancella il database: lo stesso `node -e` con `DROP DATABASE decobrands_test_attesa_01`. **Mai** `decobrands_db`, mai il
database `decobrands_test` condiviso, mai Integra (192.168.239.49: non si contatta per nessun motivo).

Prove da far passare:

- backend: `cd app/backend && npx jest test/clienti.spec.ts test/fornitori.spec.ts test/percentuali.spec.ts test/liquidazioni.spec.ts` (con le variabili sopra) → **0 KO**;
- `cd app/backend && npx tsc --noEmit` → 0 errori;
- prove nel browser interessate: `app_clienti.py`. **Non lanciarle** (porte e cartella `.next` sono condivise con gli altri pacchetti): aggiorna quelle indicate nei rilievi, controlla la sintassi con `python -m py_compile <file>` e scrivi nel resoconto quali vanno lanciate. Le lancia il controllo di fine onda.
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-attesa-01.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
