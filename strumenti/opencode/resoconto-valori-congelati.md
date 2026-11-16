# Resoconto — Valori congelati sui documenti (pacchetto `valori-congelati`, 15/11/2026)

Esecutore: DeepSeek V4 pro · Pacchetto: `strumenti/opencode/valori-congelati.md`.
Decisione di Ugo: le spese in fattura (trasporto, imballo, «Fracht») di norma **non** entrano nella base
della provvigione; ogni documento fiscale salva i suoi valori calcolati e li **congela** quando entra in un
periodo chiuso. Numero di decisione proposto: **D-183**.

## ⚠️ Attenzione: migrazione applicata per errore a `decobrands_db`

Il primo `npx prisma migrate deploy` è stato eseguito **senza** reindirizzare `DATABASE_URL`, quindi ha
applicato `20261115210000_valori_congelati` a `decobrands_db` (la migrazione è **additiva**: 3 colonne
`spese_base_provvigione` su fornitori, `calcolo`/`congelato_il` su documenti, `spesa` su righe, tutte con
default/nullable, non distruttiva). Da valutare con Ugo: lasciare così o togliere le colonne.

## Schema scelto e perché

- `fornitori.spese_base_provvigione Boolean @default(false)` — l'accordo col fornitore. Predefinito **no**
  (escluse), non datato: il cambio è un evento nel registro (come le altre regole, D-121).
- `ordini_fornitore_righe.spesa Boolean @default(false)` — riga non merce (codice testo). Già letta come
  `spesa` dal lettore (`RigaLetta`, pacchetto `riga-codice-testo`); ora salvata anche nella fotografia.
- `ordini_fornitore_documenti.calcolo Json?` + `congelato_il DateTime?` — **JSON con schema chiaro** invece
  di colonne separate: i valori si leggono sempre insieme e sono ~10 campi fissi; importi come **testo al
  centesimo** (mai virgola mobile, come `liquidazioni.totali`). Schema documentato nel commento della
  migrazione: `{ base, spese, netto, sconto_medio, scaglione, pct_agente, pct_subagente, provvigione_agente,
  provvigione_subagente, regola }`.

## Punto unico di calcolo

`calcoloDocumento(S, p, d)` in `app/backend/src/motore/motore.ts` (riusa `percentuali` e `quotaSub`):
`base = netto − spese` se il fornitore è «no» (altrimenti base = netto); sconto medio **solo sulle righe di
merce** (`utilePerSconto` ora esclude `spesa`); scaglione, percentuali e provvigioni sulla **base**.

Le letture usano i valori salvati: `baseDoc(d)` (base salvata, riserva sul netto) sostituisce `d.importo` in
`quotaSub`, `provvigioneDoc`, `riconcilia` (imponibile «noi» e attesi), `righeLiquidazione` (importo),
`fattiAnalisi`/`analisiTrimestre` (il «fatturato» è ora la base). `basePratica` = somma delle basi dei
documenti. Il `netto` della pratica resta `importoPratica` (somma degli importi).

## Dove si congela e rifiuto

- `salvaCalcolo` in `pratiche.ts` riscrive `calcolo` dei documenti **aperti** a ogni `aggiornaPratica`
  (creazione, correzione, spostamento, annullamento). I congelati si saltano.
- `congelaDocumenti` (pratiche.ts) ricalcola e fissa `congelato_il` **nella stessa transazione** di chiusura:
  chiamata da `bollettino.chiudi` (documenti sulle righe abbinate) e `liquidazioni.chiudi` (documenti
  liquidabili). V13: `S` è già caricato con i blocchi.
- `ricalcolaDocumentiAperti` (pratiche.ts) ricalcola gli aperti del fornitore al cambio di
  `spese_base_provvigione` (fornitori.ts `modifica`).
- Rifiuto: `documentoDi` e `bloccaDocumento` rispondono **409** se `congelato_il` non è nullo.

## Visualizzazione

- **Pratica**: «Imponibile» → **«Base provvigione»**; se diversa dal netto, in tenue «netto X − spese Y
  (escluse per accordo col fornitore)»; vicino allo sconto medio il segno «fissato il …» quando tutti i
  documenti sono congelati (`congelato` nel payload di `dettaglioPratica`).
- **Liquidazioni/Analisi/esportazioni**: la colonna dell'importo su cui si calcola si chiama
  **«Base provvigione»** (rinominate `Imponibile` nel riepilogo della liquidazione e `Fatturato` in Analisi,
  nei CSV/Excel). I KPI descrittivi («Fatturato dei clienti», «Fatturato per fornitore») restano invariati:
  non sono «la colonna».
- **Documento** (`VistaDocumento.tsx`, FinestraCorreggi): colonna «Spesa» con casella per riga; nel segno
  tenue «· spesa» sulle righe lette. Salvataggio come gli altri campi (`spesa` in `RIGA_CAMPI` e `RIGA_KEYS`).
- **Fornitori** (`VistaFornitori.tsx`): casella «Spese nella base della provvigione» in Modifica condizioni
  e voce «Spese nella base» nel dettaglio.

## File toccati

- Backend: `motore/motore.ts` (`speseDoc`, `speseEscluse`, `baseDoc`, `basePratica`, `calcoloDocumento`,
  `REGOLA_CALCOLO`, `scontoMedio` esclude spesa, base in `quotaSub`/`provvigioneDoc`/`riconcilia`/
  `righeLiquidazione`), `motore/dati.ts` (carica `spesa`, `calcolo`, `congelato_il`, `spese_base_provvigione`,
  righe per documento), `pratiche.ts` (`salvaCalcolo`, `ricalcolaDocumentiAperti`, `congelaDocumenti`,
  base in `dettaglioPratica`), `documenti.ts` (`spesa` in `RIGA_CAMPI` e registrazione, 409 sui congelati),
  `fornitori.ts` (parametro), `bollettino.ts`/`liquidazioni.ts` (congelamento), `analisi.ts`/
  `esporta-liquidazione.ts` (colonne), `prisma/schema.prisma` + migrazione, `valori-congelati-ricalcola.ts`
  (comando), `package.json` (script `valori:congelati`), prove.
- Frontend: `VistaPratica.tsx`, `VistaDocumento.tsx`, `VistaFornitori.tsx`, `VistaAnalisi.tsx`,
  `VistaLiquidazioni.tsx` (solo nome colonna), `lib/guida.ts`.

## Prove (jest, database `decobrands_test_congelati`, creato e cancellato)

- `valori-congelati.spec.ts` (pure): **6/6** — speseDoc; base netto−87,50 (no) vs netto (sì); sconto medio
  solo merce; `calcoloDocumento` (base 876,28, scaglione, provvigione 175,26, regola); `baseDoc` con
  riserva; pratica = somma delle basi.
- `valori-congelati-db.spec.ts`: **2/2** — documento congelato non si modifica (409); parametro spese 403
  senza `dati.condizioni`.
- `motore.spec.ts`: **27/27** (corrette 3 prove che spalmavano `calcolo`/`righe` del seed su documenti
  fittizi: ora `calcolo: null, righe: []`). `sconto-medio` 9/9, `seed` 9/9, `documenti-pratica`, `documenti`,
  `liquidazioni`, `analisi`, `fornitori`, `bollettino`, `percentuali`, `correzione`, `lettura`,
  `documenti-lettura`, `incassi`, `proposta`, `vincoli`, `motore-volumi`, `oggi`, `bollettini`, `pratiche`,
  `numero-ordine-fornitore`, `riconoscimento-*`, `permessi`, `scartati`, `accesso`, `anagrafica-integra`,
  `avvio`, `carica-limite`, `casella`, `clienti`, `coda`, `eventi`, `impostazioni`, `integra`, `lettore`,
  `registro-api`, `sistema-*`, `soggetti`, `storico`, `subagenti`, `superutente`, `utenti`: **0 KO mio**.
- **KO non miei**: `versione.spec.ts` (attende 0.2.0, il package è 0.2.6: pre-esistente) e `registro.spec.ts`
  (Unique constraint in `registro.create`, da modifiche di un altro pacchetto in parallelo: il diff di
  `test/registro.spec.ts` non è mio). `proposta.spec.ts` passa da solo (79/79), flaky in batch come già noto.
- `npx tsc --noEmit`: backend **OK**, frontend **OK**.
- Il blocco consultivo `pg_advisory_lock` è **globale**, non per database come dice il commento di
  `blocco.ts`: un giro jest di un altro pacchetto mi ha bloccato il giro completo; ho atteso, liberato un
  backend orfano mio (`pg_terminate_backend` su una connessione idle che teneva il lock) e verificato a
  gruppi. Da segnalare a Ugo per `blocco.ts`/il parallelismo.

## Comando da lanciare (lo lancia Claude Code, dopo copia di sicurezza di `decobrands_db`)

```
npm run build && npm run valori:congelati -- --prova
```

Numeri attesi su `decobrands_db` (dopo la rilettura di PR102829 del pacchetto `riga-codice-testo-prova-vera`):
- **PR102829/AU276950** (Gries, riga «Fracht» 87,50): base **876,28 €** (963,78 − 87,50), provvigioni in
  proporzione; i tre documenti dell'ordine AU276950 cambiano insieme.
- **OF/2026/002**: nessuna riga di spesa → base = netto 1840,23 €, provvigione invariata (331,24 / 110,41 €,
  come in `resoconto-sconto-medio.md`).
- I documenti già in bollettini chiusi / liquidazioni chiuse si congelano con le regole vecchie
  (`interscambio.sconto`, spese comprese): il comando stampa prima/dopo e «verifica che coincidano con la
  fotografia della liquidazione dove c'è» confrontando il foglio con i numeri attesi.

## Dubbi e limiti

- **Nota di credito**: il motore non salva le righe della nota (`faseDi('nota_credito') = null`), quindi una
  nota di credito non può avere righe di spesa proprie: la sua base è il suo `importo` (netto). Resta il
  limite già noto (migrazione futura per le righe della nota, vedi `resoconto-sconto-medio.md`).
- **`riconcilia`/`righeLiquidazione`**: la base «noi» usa `baseDoc(d)` (valore salvato); per un documento
  aperto appena creato senza `calcolo` il motore fa riserva sul netto, coerente con l'assenza di spese.
- **Scaglioni/percentuali dopo la chiusura**: i congelati restano con i valori salvati; il cambio di
  scaglioni/percentuali ricalcola i soli aperti (via `ricalcolaDocumentiAperti`, chiamata oggi dal solo
  cambio di `spese_base_provvigione`). I soldi già chiusi restano fermi su `bollettini_righe` e sulla
  fotografia delle liquidazioni (meccanismi pre-esistenti), non sui `calcolo` dei documenti.

## Da documentare

- **spec §5.3** (e §4.2.7.1): la base della provvigione è il **netto meno le spese escluse** (righe segnate
  «spesa»: trasporto, imballo, «Fracht»); le spese entrano nella base solo se l'accordo col fornitore lo
  prevede (`spese_base_provvigione`, predefinito no). Lo sconto medio si calcola sulle sole righe di merce.
  Ogni documento fiscale salva i propri valori calcolati (base, spese, sconto medio, scaglione, % e
  provvigioni) e la versione della regola; la pratica non salva valori suoi, è la somma dei documenti.
- **spec §4.2.7.1**: `calcolo` (JSON, schema fisso) e `congelato_il` sul documento.
- **spec §19 — D-183** (numero proposto): il perché è nella «Decisione di Ugo» del pacchetto
  `valori-congelati.md`: integrità dei numeri chiusi (i valori si fissano alla chiusura e si correggono solo
  con rettifiche) e accordo per fornitore sulle spese. Include: base = netto − spese escluse; congelamento
  alla chiusura di bollettino/liquidazione; rifiuto di modifica e ricalcolo sui congelati; nessun controllo
  notturno (il «da dove viene» sta sul documento).
- **piano §12**: resta da verificare su `decobrands_db` il comando `valori:congelati` e da decidere la
  migrazione applicata per errore (vedi avviso in testa).

## Correzioni 1 (16/11/2026)

### 1. Ricalcolo degli aperti su tutti gli ingressi del calcolo
`ricalcolaDocumentiAperti` era chiamata dal solo cambio di `spese_base_provvigione`. Ora ogni operazione che
cambia un ingresso del calcolo ricalcola, nella stessa transazione (V13), i documenti aperti coinvolti:
- scaglioni/percentuali: `nuovePercentuali`, `correggiPercentuali`, `eliminaPercentuali` (fornitori.ts);
- eccezioni personali: `crea`, `cambia`, `termina`, `modifica`, `elimina` (fornitori.ts);
- agenzie (interscambio): `creaAgenzia`, `modificaAgenzia` (vecchio e nuovo fornitore se cambia),
  `eliminaAgenzia` (clienti.ts).

Il punto unico resta `ricalcolaDocumentiAperti(tx, fornitore_id)` → `salvaCalcolo` (per pratica); i congelati si
saltano sempre. Le modifiche a documenti/righe/pratiche passavano già da `aggiornaPratica` → `salvaCalcolo`.
Un documento senza `calcolo` continua a leggere il netto (`baseDoc`, riserva) finché il ricalcolo non lo riempie:
nessun numero diverso da prima. Scelta: riempire al volo con `baseDoc`, nessun comando notturno aggiuntivo
(coerente con «il da dove viene sta sul documento»).

Prove: `valori-congelati-db.spec.ts` «ricalcolo degli aperti…» (cambio % → aperto a pct 25, congelato identico).

### 2. KO lasciati
- `versione.spec.ts`: tolta la versione scritta a mano (`toBe('0.2.0')`); la prova legge solo il `package.json`.
- `registro.spec.ts`: passa (7/7). Il «Unique constraint in registro.create» era transitorio: lo stato in volo
  del pacchetto `ora-registro` in parallelo (src/registro.ts ora pulito). Nessuna correzione di codice.
- `blocco.ts`: **correzione non applicata**. Verificato empiricamente su PostgreSQL 16.8: `pg_try_advisory_lock`
  con due connessioni su database diversi (decobrands_db e decobrands_test) dà il blocco a entrambe → il lock
  consultivo è **per database**, come dice già il commento. La premessa «globale al server» non regge; il blocco
  osservato era un backend orfano dello stesso database (connessione idle che teneva il lock). Commento corretto.

## Revisione (16/11/2026, skill caricate: owasp-security, postgresql-code-review, ponytail-review)

- **V12** rispettato: i DTO accettano solo scelte (spesa, importo, …); `calcolo` e `congelato_il` si scrivono solo
  dal server (`salvaCalcolo`/`congelaDocumenti`), mai letti dal corpo della richiesta.
- **V13** rispettato: ogni scrittura multi-tabella in una transazione con `tx`; chiusure e abbinamenti con
  `FOR UPDATE` (`blocca`, `fornitoreBloccato`, `bloccaFornitori`); il ricalcolo è dentro la stessa transazione.
- **D-11** rispettato: `congelaDocumenti` scrive solo `calcolo`/`congelato_il`, non tocca `liquidazioni.totali`
  né la fotografia delle liquidazioni chiuse.
- **Permessi**: `/liquidazioni/anni` `provvigioni.consulta`; filtri elenco documenti, `abbina`, `correzione`,
  `sposta` con `provvigioni.modifica`; parametro fornitore con `dati.condizioni`. Tutti via `@Richiede`.
- **SQL parametrizzato**: `Prisma.sql`/`$executeRaw` con interpolazione `${}`, nessuna concatenazione di testo
  del browser. Migrazioni additive: indice unico parziale corretto su
  `(fornitore_id, numero_ordine_fornitore) WHERE … IS NOT NULL`; `calcolo` JSONB con schema nel commento
  (il server è l'unico scrittore, niente CHECK necessario).
- **Ponytail**: le chiamate di ricalcolo sono una riga l'una; il punto unico resta `ricalcolaDocumentiAperti`.
  Niente da tagliare. Rilievi scartati: nessuno.

## Suite completa (16/11/2026)
`npx jest` completa su `decobrands_test_congelati` (ricreato e migrato): **49 suite, 846 prove, 0 KO**.
`npx tsc --noEmit` backend e frontend: OK. Il giro completo dura ~20 minuti (non è un blocco): `proposta.spec.ts`
e i lettori girano in coda. Al termine il database di prova è stato cancellato.
