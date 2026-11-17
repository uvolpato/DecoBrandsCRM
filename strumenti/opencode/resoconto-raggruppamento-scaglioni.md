# Resoconto — `raggruppamento-scaglioni` (D-199)

Onda del 16/11/2026. Impostazione «Raggruppamento» sul fornitore e deroga sulla pratica: in
modalità `riga` le righe merce si raggruppano per sconto di riga, ogni gruppo prende il suo scaglione
e la provvigione è la somma dei gruppi. Il calcolo resta una **previsione**: il bollettino è il dato certo.

## File toccati

- `app/backend/prisma/schema.prisma` + migrazione scritta `20261116130000_raggruppamento_scaglioni`.
- `app/backend/src/motore/dati.ts`: `raggruppamento` su fornitore e pratica; tipo `CalcoloDocumento`
  con `raggruppamento`, `raggruppamento_da`, `gruppi`; tipo `GruppoRiga`.
- `app/backend/src/motore/motore.ts`: `raggruppamentoDi`, `scontoRiga`, `provvigioneRiga`,
  `calcoloDocumento` (modalità riga e ripiego).
- `app/backend/src/fornitori.ts`: campo `raggruppamento` (validato `documento`|`riga`), evento e ricalcolo.
- `app/backend/src/pratiche.ts`: endpoint `PUT /pratiche/:id/raggruppamento` (motivo obbligatorio,
  `FOR UPDATE`, evento prima/dopo+motivo, ricalcolo aperti); `deroga` nel filtro, nei conteggi e nella
  risposta dell'elenco; `raggruppamento`/`raggruppamento_da`/`raggruppamento_motivo` nel dettaglio.
- `app/frontend/app/(app)/fornitori/VistaFornitori.tsx`: tendina «Raggruppamento» nelle regole.
- `app/frontend/app/(app)/pratiche/VistaPratica.tsx`: riga «Raggruppamento» nel Riepilogo + modale «Cambia».
- `app/frontend/app/(app)/pratiche/VistaPratiche.tsx`: segmento «Raggruppamento» e segno «deroga» sulle righe.
- `app/frontend/lib/guida.ts`: punto 8 in «Come si sceglie la percentuale».
- Test: `test/raggruppamento-scaglioni.spec.ts`, `test/raggruppamento-scaglioni-db.spec.ts`; ritocco a
  `test/pratiche.spec.ts` (conteggi con `deroga`) e ai fixture (`raggruppamento: null`).
- Prove browser: `strumenti/prove/app_pratica.py` (controlli Raggruppamento + modale).

## Schema e migrazione

```
fornitori.raggruppamento VARCHAR(10) NOT NULL DEFAULT 'documento'   (CHECK documento|riga)
ordini_fornitore_testata.raggruppamento VARCHAR(10) NULL            (CHECK documento|riga)
```
Scritta, **non applicata** a `decobrands_db` (applicata solo al database di prova
`decobrands_test_raggruppamento`, cancellato alla fine).

## Esempio numerico

Fattura con una riga al 5 % (merce 600) e una al 20 % (merce 400); scaglioni 0–10 → 15/8, 20 → 10/5.
- **Sconto medio** (`documento`): 11,63 % → un solo scaglione (20 → 10/5) = 1 000 × 10 % = **100 €**.
- **Per riga** (`riga`): 5 % → scaglione 10 (15/8) = 90 €, 20 % → scaglione 20 (10/5) = 40 €,
  somma **130 €**; subagente 48 + 20 = **68 €**. `calcolo.gruppi` con 2 voci, `pct_agente` 13,00 %,
  `pct_subagente` 6,80 % (effettive).

## Prove ed esito

- `npx tsc --noEmit` backend e frontend: puliti.
- `npx jest` (su `decobrands_test_raggruppamento`): **880 prove, 0 KO** (52 suite). Nuove suite:
  `raggruppamento-scaglioni` (8, motore) e `raggruppamento-scaglioni-db` (5, endpoint/eventi/congelato).
- Browser: `python -m py_compile strumenti/prove/app_pratica.py` pulito (le prove le lancia Claude Code).

## Dove una pct unica non regge (riconciliazione, esportazioni, liquidazione, Analisi)

In modalità `riga` il documento salva `calcolo.pct_agente`/`pct_subagente` = percentuale **effettiva**
(provvigione ÷ base). I punti che calcolano **dal vivo con una pct unica** (lo scaglione dello sconto
medio) e quindi non reggono in modalità riga, finché non passano a leggere i valori effettivi del
`calcolo`:

- `motore.ts` `riconcilia` (bollettini): `riga.noi` usa `perc.dal_fornitore` (unico). Verificato il
  bollettino usa `importo_calcolato` (congelato), quindi il problema c'è solo prima della verifica.
- `motore.ts` `righeLiquidazione`/`quotaSub` (liquidazioni): la quota del subagente usa lo scaglione
  unico dello sconto medio, non i gruppi.
- `motore.ts` `fattiAnalisi`/`provvigioneDoc` e `analisiTrimestre` (Analisi): usano
  `percentuali().dal_fornitore` e `quotaSub`, non i gruppi.

Conseguenza: per un fornitore in modalità `riga` la **previsione** mostrata in Bollettini (prima della
verifica), Liquidazioni e Analisi resta su un solo scaglione; il `calcolo` per documento (giusto, con i
gruppi e la pct effettiva) è già salvato e pronto per quei punti in un passo successivo.

## Dubbi / punti aperti

- **Tabella dei gruppi nel dettaglio del documento**: la spec chiede «in modalità riga, nel dettaglio del
  documento, i gruppi in una piccola tabella»: richiede `app/frontend/app/(app)/documenti/**`
  (`VistaDocumento.tsx` + esporre `calcolo.gruppi` al dettaglio documento), **fuori dai file ammessi** di
  questo pacchetto. Non fatto; da inserire in un lavoro dedicato.
- **Anomalia per gruppo oltre l'ultimo scaglione**: `calcoloDocumento` in modalità riga mette la
  provvigione `null` («da decidere») come per lo sconto medio, ma l'anomalia `provvigione.sconto_medio`
  resta legata allo sconto medio dell'intero documento (non per gruppo). Da decidere se serve
  un'anomalia dedicata per gruppo.
- **Ricalcolo su deroga**: `salvaCalcolo` ricalcola solo gli **aperti** (i congelati restano, D-183),
  come richiesto; confermato dalla prova `congelato resta, aperto si ricalcola`.

## Da documentare (nota di rilascio 0.2.9)

Nuova impostazione «Raggruppamento» sul fornitore (Sconto medio del documento, predefinito, oppure Per
sconto di riga) con deroga sulla singola pratica (motivo obbligatorio). In modalità «Per sconto di riga»
le righe merce si raggruppano per il loro sconto e ogni gruppo usa il proprio scaglione; la provvigione
è la somma dei gruppi. Il calcolo resta una previsione: il bollettino del fornitore è il dato certo.
Nell'elenco delle pratiche un filtro «Raggruppamento» e il segno «deroga» sulle pratiche che lo hanno.

Riepilogo: rilievi corretti nessuno (solo il ritocco al conteggio `deroga` in `pratiche.spec.ts`); prove
a 0 KO (880); aperti: gruppi nel dettaglio documento (file fuori ammessi) e pct unica in
riconciliazione/liquidazione/Analisi.

## Correzioni 1 (16/11/2026)

I quattro rilievi di `raggruppamento-scaglioni-correzioni-1`, chiusi alla radice.

1. **Provvigione per documento con due verità** (grave, soldi). Rilievo: in modalità `riga`
   `quotaSub` / `provvigioneDoc` / `riconcilia` (riga.noi) / `righeLiquidazione` / `fattiAnalisi` /
   `analisiTrimestre` ricalcolavano con lo scaglione unico dello sconto medio. Cosa è cambiato: nuovo
   `provvigioneDocumento(S, p, d)` (il `calcolo` salvato se congelato, altrimenti `calcoloDocumento`)
   letto da tutti quei punti; `quotaSub` in modalità riga delega a `provvigioneRiga` e per i congelati
   legge il `calcolo`; `riconcilia` e `analisiTrimestre` prendono la presa effettiva. Prova: fattura
   600@5 % + 400@20 % in `riga` → documento, liquidazione, Analisi e bollettino danno 130 € / 68 €; in
   `documento` restano 100 / 50; il congelato usa il valore fissato in liquidazione e Analisi. 0 KO.

2. **Anomalia del gruppo**. Rilievo: un gruppo oltre l'ultimo scaglione non aveva un'anomalia propria e
   lo sconto medio comandava anche in `riga`. Cosa è cambiato: `anomaliaGruppo` + `anomaliaProvvigione`
   (`riga` → gruppo, `documento` → sconto medio), codice `provvigione.gruppo_scaglione`; le chiusure
   (bollettino, liquidazione) e `aggiornaAnomalieProvvigione` usano `anomaliaProvvigione`, e in `riga`
   si chiude `provvigione.sconto_medio`. Prova: gruppo al 25 % → anomalia del gruppo, nessuna anomalia
   dello sconto medio; in `documento` resta quella dello sconto medio. 0 KO.

3. **Gruppi nel dettaglio del documento**. Rilievo: mancava la tabella dei gruppi. Cosa è cambiato:
   `GET /pratiche/:id/documenti` espone `gruppi` (`calcolo.gruppi`); `VistaPratica.tsx` li mostra in una
   piccola tabella tenue (sconto, base, scaglione, % Decobrands, % subagente, provvigioni) sotto ogni
   documento fiscale in modalità riga (V12: nessun conto nel browser). Prova: `tsc --noEmit` frontend
   pulito; il controllo visivo lo fa Claude Code.

4. **Base = somma delle righe**. Rilievo: se la somma delle righe non torna col netto, la base era
   sbagliata. Cosa è cambiato: in `calcoloDocumento` in modalità riga, se la somma dei gruppi differisce
   dal netto oltre 0,05 € si ricade sullo sconto medio con `regola` «righe che non tornano col netto:
   sconto medio». Prova: righe 600+400 col netto 990 → regola scritta, provvigione 99 €. 0 KO.

### Prove

- `npx tsc --noEmit` backend e frontend: puliti.
- `npx jest` su `decobrands_test_raggruppamento2` (creato, migrazioni, cancellato): suite toccate +
  `percentuali`, `liquidazioni`, `analisi`, `bollettini`, `valori-congelati*`, `righe-nota-credito`,
  `sconto-medio`, `raggruppamento-scaglioni*`, `motore`, `correzione`, `pratiche`, `documenti-pratica`
  → **225 prove, 15 suite, 0 KO**.

### Aperti

- Il Riepilogo della pratica (`VistaPratica.tsx`, voce «Da … a Decobrands») usa ancora la percentuale
  unica (`bicchiere.dal_fornitore`) per `a_decobrands`/`margine` in modalità riga; il subagente è già
  corretto via `quotaSub`, la presa no. Da allineare con `provvigioneDocumento` in un passo successivo.
- `sconto-medio-ricalcola.ts` (script a sé, non nel flusso) usa ancora `anomaliaScontoMedio`.
