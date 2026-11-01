# Prompt per OpenCode — correzioni del blocco 3, gruppo 1

Da incollare in OpenCode, nella cartella `C:\Progetti\Decobrands_CRM`. Viene dal controllo di
Claude Code sul lavoro di `fase3-gruppo1.md`: il codice c'è, ma va corretto prima del commit.

---

Sei la sessione principale di OpenCode. Correggi il lavoro del gruppo 1 del blocco 3 (F1-A1,
F1-A2, F1-A3), che è già nella cartella senza commit.

**Prima di cominciare:**
- rileggi `CLAUDE.md`;
- carica con lo strumento `skill`: `fase`, `ponytail`, `nestjs-best-practices`,
  `prisma-client-api`, `javascript-typescript-jest`, `nextjs-app-router-patterns`,
  `webapp-testing`, `playwright-best-practices`, `owasp-security`;
- usa sottoagenti (`task`, agente `general`) **solo per i punti 3 e 4**: uno per pagina, con i
  file separati come nella prima volta. I punti 1, 2 e 5 li fai tu.

Valgono le regole di `strumenti/opencode/fase3-gruppo1.md`: database solo di prova, niente
commit né push, niente `.env`.

## 1. Le prove del server non devono dipendere dall'ordine (bloccante)

Su `decobrands_test`, `npx jest --runInBand` dà **42 KO su 135**:
- `fornitori.spec.ts`, `clienti.spec.ts` e `subagenti.spec.ts` leggono i dati del seed senza
  caricarli;
- `seed.spec.ts` e `motore.spec.ts` svuotano il database.

Il resoconto diceva 0 KO solo perché il database era già caricato.

Correzione:
- in ogni spec nuova, in `beforeAll`, svuota e carica il seed come fa `test/motore.spec.ts`
  (`svuota` da `test/svuota.ts`, poi `seed`);
- in `afterAll`, svuota;
- gli utenti di prova si creano dopo il seed.

Verifica:
- `npx jest --runInBand` di **tutte** le prove, **due volte di seguito**, con 0 KO;
- poi `npx jest --runInBand test/motore.spec.ts test/fornitori.spec.ts test/clienti.spec.ts
  test/subagenti.spec.ts`, con 0 KO (le spec nuove subito dopo una che svuota).

## 2. Scaglioni: le percentuali non si modificano (spec §7.4, D-25)

La spec dice: «le percentuali non si modificano: si crea una nuova versione con *Nuove
percentuali da una data*». Modificare o cancellare uno scaglione in vigore riscrive le
provvigioni del passato. La nuova versione da una data è F1-A5 (Opus), che non fai.

Quindi in F1-A1 la scheda *Percentuali* è **in sola lettura**:
- togli `POST/PUT/DELETE /api/fornitori/:id/scaglioni` da `src/fornitori.ts`, le loro prove e i
  pulsanti nella pagina;
- lascia una nota nella scheda: «Le nuove percentuali da una data arrivano con F1-A5» (testo
  provvisorio, `// ponytail:` nel codice).

Le regole del fornitore (giorni, tipo di provvigione, note) restano modificabili con
`dati.condizioni`. A `note` aggiungi `@MaxLength(2000)`.

## 3. Agenzie: errori e date (`src/clienti.ts`)

- **`unico()`** trasforma in «Periodo sovrapposto» anche un CHECK fallito o qualsiasi messaggio
  che contiene "vincolo" (es. sconto fuori dai limiti).
  - Correggi: «Periodo sovrapposto» **solo** per il codice `23P01`, cioè l'EXCLUDE
    `interscambio_*_excl`;
  - un `23514` (CHECK) diventa 400 «Valore non ammesso»;
  - togli il controllo sul testo del messaggio;
  - aggiungi una prova per il CHECK.
- **Date**: `valido_dal` e `valido_al` usano `@IsString()`, quindi una data sbagliata arriva a
  Prisma e dà 500. Usa `@IsISO8601({ strict: true })`, controlla che `valido_al` non sia prima
  di `valido_dal` (400) e aggiungi la prova.
- **Modifica e cancellazione dell'agenzia**: dentro la transazione blocca la riga con
  `SELECT … FOR UPDATE` (`tx.$queryRaw` con parametro) prima di leggerla (V13).

## 4. Pagine: fornitore e subagente sono campi di ricerca (spec §7.6, D-22, §16.4)

Nella finestra dell'agenzia (`VistaClienti.tsx`) e nella scheda del subagente (agente), i campi
fornitore, subagente e agente sono tendine (`tipo: 'select'`). La spec li vuole **campi di
ricerca**: `Campo` con `tipo: 'ricerca'`, `entita`.

1. Aggiungi le entità `fornitore`, `subagente` e `agente` in `app/frontend/lib/entita.ts`, sul
   modello di quelle che ci sono e di `prototipo-alternativo/assets/entita.js`. Le `voci`
   arrivano da `GET /api/fornitori`, `/api/subagenti` e `/api/agenti`, già fatte.
2. Usale nelle finestre.
3. Dove il prototipo lo prevede (`viste-anagrafiche.js`), aggiungi i filtri a ricerca multipla
   anche negli elenchi: per esempio nella scheda *Agenzie* (fornitore, subagente).

Gli sconti proposti seguono gli scaglioni del fornitore scelto (§7.6): se è semplice, falli; se
no, scrivilo nel resoconto.

## 5. Prove nel browser vere

`app_fornitori.py`, `app_subagenti.py` e `app_clienti.py` fanno **3 controlli ciascuno**: non
bastano. Ognuna deve provare, come `app_utenti.py` e `app_componenti.py`:
- elenco con ricerca e segmenti, apertura della scheda, schede che si ricordano tornando
  indietro;
- per Fornitori: modifica delle regole con un responsabile; un operatore vede i pulsanti spenti;
- per Subagenti: crea, modifica, disattiva; eliminazione rifiutata se ha agenzie;
- per Clienti: aggiungi un'agenzia con i campi di ricerca, il periodo sovrapposto che dà il
  messaggio, modifica, elimina;
- nessun errore JavaScript, nessuno scorrimento orizzontale a 768 px.

Inoltre:
- rimetti la base dagli argomenti (predefinita `http://localhost:8011`, come `app_componenti.py`):
  il resoconto dice che gli script sono stati cambiati "temporaneamente";
- lancia le tre prove come nella sezione 4 di `fase3-gruppo1.md` (8012/8011, `decobrands_test_f1a1`
  con il seed, build rifatta con `BACKEND_URL`), con 0 KO;
- guarda le schermate a 1440 e 768 px;
- chiudi i processi.

## 6. Resoconto

Aggiorna `strumenti/opencode/resoconto-fase3.md` con una sezione **Correzioni**: per ogni punto
cosa hai cambiato, i comandi delle prove con il numero di OK/KO, e i dubbi.
