# Collaudo · Onda 1 · Pacchetto 1-01 — Motore: storni dalla fotografia, una fattura al mese, correzioni su NC, numero riusato

Data: 08/11/2026 · **Esecutore: DeepSeek V4** · Gravità del pacchetto: **P0** · Rilievi: A2-01, A2-02, A2-03, A2-05, A6-13, A2-08, A8-06 · Piano: `strumenti/collaudo/piano-correzioni.md`.

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

> **Per questo pacchetto:** In questo pacchetto **solo il punto 2** della correzione (voce di storno con subagente e provvigione della fotografia della liquidazione). Il punto 1 (blocco delle agenzie nel periodo chiuso) aspetta la decisione U1 di Ugo: **non toccare `clienti.ts`**.

### A2-02 — "Una fattura al mese": fattura arrivata tardi in un mese già liquidato fa pagare due volte
- Gravità: P0
- Dove: app/backend/src/motore/motore.ts:149-156 (`fatturaDelMese`) e :170-175 (`quotaSub`)
- Problema: la scelta della fattura del mese si ricalcola su tutte le fatture presenti; se dopo la chiusura arriva una
  fattura dello stesso mese che vince la regola, il motore paga anche quella (D-57 la porta nel trimestre aperto),
  mentre quella già pagata resta pagata. In più, uno storno successivo della prima fattura vale 0 (ora è "mensile").
- Scenario: agenzia con `regola_mensile = 'piu_alta'`, quota 5 %. F1 1.000 € del 10/03/2026 → 50 € liquidati nel
  1° trim. (chiuso). A maggio si registra G 2.000 € del 20/03/2026 (fattura arrivata tardi). G non è legata → va nel
  2° trim. con quota 100 € (è la più alta di marzo). Totale pagato per marzo **150 €** invece di 100 €. Se poi il
  bollettino storna F1, la voce vale **0 €** (quotaSub(F1) = 'mensile' 0) invece di −50 €. Con `'prima'` uguale
  quando la fattura tardiva ha data precedente a F1.
- Correzione puntuale: in `fatturaDelMese`, se fra le fatture del mese ce n'è una con `liquidazione_id` (già pagata),
  scegliere quella (la più vecchia per `liquidazione_id`) prima di applicare `prima`/`piu_alta`: il mese è già
  "consumato". Lo storno usa la fotografia (punto 2 di A2-01).
- Prova che la verifica: app/backend/test/motore.spec.ts nuovo caso "una fattura al mese: fattura tardiva nel mese già
  liquidato → quota 0, la liquidata resta la scelta; storno della liquidata = −50".
- Esecutore: DeepSeek V4 — regola delle provvigioni
- File toccati: app/backend/src/motore/motore.ts, app/backend/test/motore.spec.ts, specifica-crm-provvigioni.md (§5.2 *Perché*, §19)
- Dipende da / correlato a: A2-01; D-27, D-57

### A2-03 — Correzione a importo fisso su una nota di credito: la provvigione diventa positiva
- Gravità: P1
- Dove: app/backend/src/motore/motore.ts:167 (`quotaSub`, ramo `cor.tipo === 'importo'`); app/backend/src/documenti.ts:1192 (accetta solo importi > 0)
- Problema: il valore della correzione è sempre positivo e il motore lo usa così com'è, anche quando il documento è
  una nota di credito (importo negativo).
- Scenario: NC −200 € (quota standard 3 % = −6 €). L'utente mette "importo fisso 10 €" per ridurre di 10 € al
  subagente → la liquidazione gli **dà +10 €** (pct mostrata −5 %). Atteso −10 €.
- Correzione puntuale: in `quotaSub` per `tipo === 'importo'`: `const v = imp.isNegative() ? cor.valore.neg() : cor.valore;`
  e usare `v` per `provvigione` e per `pct`. Allineare il prototipo (`M.quotaSub`).
- Prova che la verifica: app/backend/test/correzione.spec.ts nuovo caso "importo fisso su nota di credito → provvigione negativa".
- Esecutore: DeepSeek V4 Flash — una riga, logica già chiara
- File toccati: app/backend/src/motore/motore.ts, prototipo-alternativo/assets/motore.js, app/backend/test/correzione.spec.ts
- Dipende da / correlato a: D-27

> **Per questo pacchetto:** Allinea anche `M.quotaSub` del prototipo (`prototipo-alternativo/assets/motore.js`), solo quella riga.

### A2-05 — Storno su riga senza `documento_id`: per numero prende il documento di un altro anno
- Gravità: P2
- Dove: app/backend/src/motore/motore.ts:139-146 (`trovaDocumento`), :196, :212; app/backend/src/motore/dati.ts:141
- Problema: per le righe non abbinate il documento si cerca per numero nel fornitore e vince la pratica con id più
  basso; D-34 dice che il fornitore può riusare il numero in un altro anno. La riga ha `data` (`fattura_data`) ma non si usa.
  Alla chiusura del bollettino (bollettino.ts:283) l'abbinamento sbagliato viene **congelato** per id.
- Scenario: Gries riusa "F12": F12 del 05/03/2026 (cliente A, Rossi) e F12 del 04/03/2027 (cliente B, Bianchi).
  Bollettino di luglio 2027 con storno "F12" senza `documento_id` → abbinato alla F12/2026 → −quota a Rossi su un
  cliente che ha pagato; Bianchi non viene stornato.
- Correzione puntuale: `trovaDocumento(S, numero, fornitore_id, data?)`: fra i documenti con quel numero preferire
  quello con `d.data === data`; senza data, il più recente con data ≤ fine del mese del bollettino. Passare `r.data`
  da `documentoDiRiga` e `riconcilia`.
- Prova che la verifica: app/backend/test/motore.spec.ts nuovo caso "numero riusato in due anni: lo storno va sul documento con la stessa data".
- Esecutore: DeepSeek V4 Flash — una funzione
- File toccati: app/backend/src/motore/motore.ts, app/backend/test/motore.spec.ts
- Dipende da / correlato a: D-34; A4 (creazione righe del bollettino)

### A6-13 — Prova da aggiungere: nota di credito sul maturato e storno senza documento
- Gravità: P2
- Dove: `app/backend/src/motore/motore.ts` (riconoscimento maturato, storni); prove `test/motore.spec.ts`, `test/liquidazioni.spec.ts`
- Problema: il maturato è provato solo per fatture (`motore.spec.ts:201`); la nota di credito di un fornitore sul maturato e lo storno su riga di bollettino senza `documento_id` non hanno prove.
- Scenario da provare: Gries (maturato), nota di credito −500 € su una fattura riconosciuta → la quota del subagente scende nel trimestre del bollettino che la riconosce (non resta «in attesa d'incasso»); riga di storno con solo il numero `F-2026-0858` mentre esiste lo stesso numero nel 2025 → lega il documento del 2026.
- Correzione puntuale: due `it` in `motore.spec.ts` sui dati del seed con un documento aggiunto nella prova.
- Prova che la verifica: `npx jest test/motore.spec.ts test/liquidazioni.spec.ts`.
- Esecutore: DeepSeek V4 Flash — prove (le correzioni sono di A2).
- File toccati: `app/backend/test/motore.spec.ts`
- Dipende da / correlato a: A2-05, A2-06, D-11, §5.14

> **Per questo pacchetto:** Solo la **seconda** prova (riga di storno con solo il numero, stesso numero in due anni). La prova sulla nota di credito sul maturato aspetta la decisione U5.

### A2-08 — Importo riga calcolato con ROUND_HALF_CEIL invece del contabile (D-49)
- Gravità: P3
- Dove: app/backend/src/motore/dati.ts:27
- Problema: riga senza `importo`: `qta × prezzo` arrotondato HALF_CEIL; sui negativi (resi) −0,005 → 0,00, contro D-49
  (−0,01). Tocca solo il confronto delle righe e la variazione della pratica, non le provvigioni.
- Scenario: riga di reso qta −1, prezzo 0,005 → importo 0,00 invece di −0,01; variazione della pratica sbagliata di 1 cent.
- Correzione puntuale: sostituire con `r2(qta.times(prezzo))` (importare `r2` da motore.ts) o `Dec.ROUND_HALF_UP`.
- Prova che la verifica: app/backend/test/motore.spec.ts caso piccolo su `praticaDaDb` con riga negativa.
- Esecutore: DeepSeek V4 Flash — una riga
- File toccati: app/backend/src/motore/dati.ts, app/backend/test/motore.spec.ts
- Dipende da / correlato a: D-49

### A8-06 — Esportazioni morte
- Gravità: P3
- Dove: `app/backend/src/impostazioni.ts:313` `elencoSezioni`; `app/backend/src/motore/motore.ts:31` `importoRighe`
- Problema: esportate, mai usate né nel file né altrove (né nelle prove).
- Scenario: chi legge il motore pensa che `importoRighe` sia il modo di sommare le righe e lo usa al posto di quello vero.
- Correzione puntuale: cancellare le due righe.
- Prova che la verifica: `npm run build` e `npm test`.
- Esecutore: DeepSeek V4 Flash — codice morto
- File toccati: `impostazioni.ts`, `motore/motore.ts`
- Dipende da / correlato a: —

> **Per questo pacchetto:** Solo `importoRighe` in `motore/motore.ts`. `elencoSezioni` di `impostazioni.ts` lo toglie un altro pacchetto.

**Nota del pacchetto.** Sono **calcoli delle provvigioni**: i numeri del seed §12 (`seed.spec.ts`, `motore.spec.ts`, `analisi.spec.ts`) devono restare **identici** dove i rilievi non li cambiano di proposito. Se un numero atteso cambia, scrivi nel resoconto quale, di quanto e perché.

## File ammessi (solo questi)

- `app/backend/src/motore/motore.ts`
- `app/backend/src/motore/dati.ts`
- `app/backend/test/motore.spec.ts`
- `app/backend/test/correzione.spec.ts`
- `app/backend/test/liquidazioni.spec.ts`
- `prototipo-alternativo/assets/motore.js`
- `strumenti/opencode/resoconto-collaudo-1-01.md`

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
- `app/backend/src/errori.filter.ts`
- `app/backend/src/fornitori.ts`
- `app/backend/src/impostazioni-api.ts`
- `app/backend/src/impostazioni.ts`
- `app/backend/src/incassi.ts`
- `app/backend/src/lettore.ts`
- `app/backend/src/lettura.ts`
- `app/backend/src/main.ts`
- `app/backend/src/oggi.ts`
- `app/backend/src/posta.ts`
- `app/backend/src/proposta.ts`
- `app/backend/src/registro-api.ts`
- `app/backend/src/registro.ts`
- `app/backend/src/sistema.ts`
- `app/backend/src/utenti.ts`
- `app/backend/test/avvio.spec.ts`
- `app/backend/test/blocco.ts`
- `app/backend/test/casella.spec.ts`
- `app/backend/test/clienti.spec.ts`
- `app/backend/test/coda.spec.ts`
- `app/backend/test/documenti-lettura.spec.ts`
- `app/backend/test/documenti-pratica.spec.ts`
- `app/backend/test/impostazioni.spec.ts`
- `app/backend/test/incassi.spec.ts`
- `app/backend/test/oggi.spec.ts`
- `app/backend/test/permessi.spec.ts`
- `app/backend/test/profilo.spec.ts`
- `app/backend/test/proposta.spec.ts`
- `app/backend/test/registro-api.spec.ts`
- `app/backend/test/registro.spec.ts`
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

Lavora **solo** sul tuo database di prova `decobrands_test_1_01` (il nome contiene `decobrands_test`, come vuole
`app/backend/test/ambiente.ts`, che legge `DATABASE_URL_TEST`). Altri pacchetti della stessa onda lanciano jest
nello stesso momento su database loro: sul database condiviso `decobrands_test` due giri si cancellano i dati a
vicenda (A6-05). Anche la cartella dei documenti di prova va separata: `ambiente.ts` la mette in
`os.tmpdir()`, quindi cambia `TMP`/`TEMP`. In Git Bash, da `app/backend`:

```bash
export DATABASE_URL_TEST="$(grep '^DATABASE_URL' .env | cut -d= -f2- | sed 's#/decobrands_db#/decobrands_test_1_01#')"
node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL_TEST.replace('/decobrands_test_1_01','/postgres')});c.connect().then(()=>c.query('CREATE DATABASE decobrands_test_1_01 OWNER decobrands')).then(()=>console.log('creato')).catch(e=>console.log(e.message)).finally(()=>c.end())"
DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy
export TMP="$TEMP/decobrands-1-01"; export TEMP="$TMP"; mkdir -p "$TMP"
npx jest test/<file>.spec.ts            # sempre con le variabili sopra nella stessa shell
```

Alla fine cancella il database: lo stesso `node -e` con `DROP DATABASE decobrands_test_1_01`. **Mai** `decobrands_db`, mai il
database `decobrands_test` condiviso, mai Integra (192.168.239.49: non si contatta per nessun motivo).

Prove da far passare:

- backend: `cd app/backend && npx jest test/motore.spec.ts test/correzione.spec.ts test/liquidazioni.spec.ts test/analisi.spec.ts test/seed.spec.ts test/bollettino.spec.ts` (con le variabili sopra) → **0 KO**;
- `cd app/backend && npx tsc --noEmit` → 0 errori;
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-1-01.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
