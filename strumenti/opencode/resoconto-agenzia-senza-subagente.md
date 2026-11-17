# Resoconto — Agenzia senza subagente: la provvigione è tutta di Decobrands (17/11/2026)

**Esecutore: DeepSeek.** Pacchetto `strumenti/opencode/agenzia-senza-subagente.md`. Database di prova
`decobrands_test_senzasub` (creato, migrato, cancellato a fine lavoro).

## Cosa è stato fatto

1. **Schema** (`schema.prisma` + migrazione `20261117130000_agenzia_senza_subagente`): `interscambio.subagente_id`
   diventa `BIGINT` NULL ammesso (FK `RESTRICT` resta per i valori non nulli). L'EXCLUDE dei periodi (D-35) usa
   `cliente_id` e `fornitore_id`, non il subagente: nessun effetto sui vincoli di sovrapposizione. Migrazione
   **scritta, non applicata** a `decobrands_db`. `npx prisma migrate diff` dal database di prova → nessuna differenza.
2. **Server** (`clienti.ts`): `creaAgenzia` non chiede più «Subagente obbligatorio»; rifiuta **400** «Senza subagente
   la provvigione è tutta di Decobrands: percentuale e regola non si impostano» se `pct_subagente` o `regola_mensile`
   arrivano valorizzati senza subagente (anche in `modificaAgenzia`). `subagente_id` null nella risposta e nel
   registro; l'elenco clienti non conta più `"null"` fra i subagenti. `documenti.ts`: `nuovaPratica` con `agente_id`
   null quando il subagente manca (la pratica nasce lo stesso); `nomeSubagente` e `agenziaDaConfermare` null-safe.
3. **Motore** (`motore/dati.ts`, `motore/motore.ts`): agenzia senza subagente → quota subagente **0**
   (`percentuali`, `quotaSub`, `provvigioneRiga`), **nessuna riga in liquidazione** (`righeLiquidazione`), Decobrands
   prende la sua `pct_agente` (margine intero). `fattiAnalisi` conserva il fatto con `subagente_id` null.
4. **Analisi** (`analisi.ts`): il documento senza subagente compare sotto la voce **«Senza subagente»** (grafico,
   tabella, documenti, esportazioni); non è una voce sceglibile del filtro subagente. `VistaAnalisi.tsx`: chiave
   null non cliccabile (come «Altri N» dei fornitori).
5. **Frontend**: `FormAgenzia` spegne `pct_subagente` e `regola_mensile` quando il subagente è vuoto, con la nota
   «Senza subagente la provvigione è tutta di Decobrands.» (e non manda `subagente_id`); il Riepilogo della pratica
   mostra «Subagente: —, tutta a Decobrands»; `VistaClienti` gestisce `subagente_id` null. `lib/guida.ts` aggiornato.

## Prove

Su `decobrands_test_senzasub` (creato, `npx prisma migrate deploy`, poi cancellato): `npx prisma validate` pulito,
`npx prisma generate` pulito, `migrate diff` → nessuna differenza. `npx tsc --noEmit` pulito nel backend e nel frontend.

- jest (tutte le suite toccate, 0 KO): `agenzia-senza-subagente.spec.ts` **7/7** (nuovo, funzioni pure del motore:
  percentuali, quotaSub, provvigioneDoc, fattiAnalisi, righeLiquidazione, riconciliazione, transizione),
  `clienti.spec.ts` **44/44** (3 prove nuove: crea senza subagente, 400 con pct/regola, aggiunta del subagente dopo),
  `motore.spec.ts` **27/27**, `analisi.spec.ts` **15/15**, `liquidazioni.spec.ts` **25/25**, `bollettino.spec.ts` +
  `oggi.spec.ts` **40/40**, `pratiche.spec.ts` + `vincoli.spec.ts` **60/60**, `documenti.spec.ts` +
  `documenti-pratica.spec.ts` **103/103**, e 9 suite pure del motore (correzione, raggruppamento, scaglioni esatti,
  righe nota di credito, valori congelati, sconto medio, quota, percentuali, incassi) **103/103**.
- Prove nel browser **non lanciate** (regola onda): aggiunto a `app_clienti.py` il controllo «senza subagente:
  percentuale e regola spente, tutta di Decobrands»; `python -m py_compile` pulito. Le lancia Claude Code.

## Review

Skill caricate davvero: `owasp-security`, `postgresql-code-review`, `ponytail-review`, `caveman`. Rilievi veri:
nessuno. I controlli di `creaAgenzia`/`modificaAgenzia` restano sul server (V12) e le query sono Prisma/parametriche;
la migrazione è un semplice `ALTER COLUMN … DROP NOT NULL` (additiva, idempotente per Prisma). Scelta "lazy":
`quotaSub` esce subito con 0 senza toccare `regolaPiatta`/`percentuali`, e «Senza subagente» riusa il canale dei
`chiavi: null` già presente per «Altri N» dei fornitori (nessuna nuova colonna né rotta).

## Da documentare

- **§19 — D-205** (registrata): agenzia senza subagente, `subagente_id` NULL, 400 su pct/regola, quota 0, nessuna
  riga in liquidazione, voce «Senza subagente» in Analisi, subagente aggiungibile dopo.
- **§4.2.6 (`interscambio`)** — schema e «Perché (D-205)».
- **§7.8 / §7.22** — il documento senza subagente non compare in liquidazione e compare in Analisi sotto «Senza
  subagente»; guida delle pagine Clienti e Analisi.
- **piano §12** — attività F7-A28, 5 h **da approvare**.

## Aperto

- L'indicatore «atteso» in Oggi (`analisiTrimestre(...).totale.prese`) e il Report subagenti si basano su
  `righeLiquidazione`, che per scelta non emette righe per i documenti senza subagente: quei documenti non contano
  nell'«atteso» né nel report per subagente (nessun effetto sul margine reale, visibile in Analisi). Se in futuro
  servirà vederli anche lì, va separata l'aggregazione delle prese dal dettaglio per subagente.
- Il giro del browser non è stato eseguito qui (regola onda): lo lancia Claude Code.

## Revisione (rilievo 1, corretto)

Con agenzia senza subagente la correzione della quota del documento (`PUT /api/documenti-fiscali/:id/correzione`)
veniva accettata e poteva salvare una `provvigione_subagente` non zero; inoltre `quotaSub` su un documento congelato
leggeva il valore congelato **prima** del controllo sul subagente null. Corretto alla radice:

- **`quotaSub`**: il controllo «senza subagente → 0» ora sta **prima** della lettura del congelato.
- **`provvigioneRiga`**: la quota (`sub` e `pct_sub`) è 0 senza subagente **anche nel ramo piatta** (la correzione
  non dà quota al subagente quando non c'è).
- **`correggi`** (`documenti.ts`): rifiutata con **400** «Senza subagente la provvigione è tutta di Decobrands:
  non c'è una quota da correggere» quando l'agenzia alla data dell'ordine non ha subagente (D-146, come il motore);
  `bloccaDocumento` ora legge anche `data_ordine`.

Prove su `decobrands_test_senzasub2` (creato e cancellato): `agenzia-senza-subagente.spec.ts` **9/9** (2 prove nuove:
congelato che non vince sulla quota 0, correzione in modalità riga che non dà quota), `correzione.spec.ts` **6/6**
(1 prova nuova: 400 sulla correzione senza subagente), `motore.spec.ts` **27/27**, `liquidazioni.spec.ts` **25/25**,
`documenti.spec.ts` + `documenti-pratica.spec.ts` **103/103**. `npx tsc --noEmit` pulito nel backend.

## Giro nel browser (lanciato qui, 17/11)

`app_clienti` e `app_analisi` si fermavano subito, ma **non per il subagente null**: la pagina carica bene (13 clienti
nell'elenco, i 4 KPI e i 4 grafici in Analisi). La causa è la funzione «segmenti → tendina quando non stanno su una
riga» (FilterBar, 16/11/2026, **precedente a questo pacchetto**): a 1440 px la colonna dell'elenco Clienti è larga
589 px e i segmenti «Tutti/Con agenzie/Senza agenzie» non ci stanno con cerca + due filtri di ricerca, quindi
collassano in una tendina (`<select>`); in Analisi idem per la Durata (3/6/12 mesi). Le prove cercavano `[role=tab]`
e scadevano dopo 30 s.

Corretto **nelle prove** (la tendina è il comportamento voluto): `app_clienti.py` e `app_analisi.py` leggono il
segmento sia come pulsante `[role=tab]` sia come voce della tendina (numeri, clic, «è scelto»). Aggiunto anche in
`app_clienti.py` il controllo «operatore senza subagente: percentuale e regola spente, nota «tutta di Decobrands»»,
e scelto un subagente prima di verificare la nota del responsabile (D-50), che ora compare solo quando il subagente
c'è (prima della modifica la precedenza «senza subagente» mascherava la nota «responsabile»).

Esito: `app_analisi` **38/0 KO**; `app_clienti` **53 OK / 2 KO**, entrambi «Agenzie 1440/768: nessuno scorrimento
orizzontale della tabella» — **rilievo preesistente, non di questo pacchetto**: la tabella della scheda Agenzie
(7 colonne con `white-space: nowrap`, «Regola» e «Periodo» lunghi) è larga ~894 px dentro un pannello di ~495 px;
non c'entra il subagente null (non tocca colonne né larghezze).

`npx tsc --noEmit` pulito (backend e frontend). Jest su `decobrands_test_senzasub3` (creato e cancellato):
`agenzia-senza-subagente.spec.ts` + `correzione.spec.ts` + `clienti.spec.ts` **59/59**, `motore.spec.ts` +
`liquidazioni.spec.ts` **52/52**. `python -m py_compile` pulito su `app_clienti.py` e `app_analisi.py`.

