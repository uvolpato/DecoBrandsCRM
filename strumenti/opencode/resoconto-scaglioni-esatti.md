# Resoconto — `scaglioni-esatti` (D-200)

Onda del 16/11/2026. Impostazione «Scaglioni» sul fornitore: accettare solo sconti esatti (±0,05) per
lo scaglione, al posto della fascia (prima soglia ≥ sconto). Senza soglia esatta → anomalia e
provvigione «da decidere». Chiude anche l'aperto del pacchetto precedente: il Riepilogo della pratica
in modalità riga usa la presa effettiva dei documenti.

## File toccati

- `app/backend/prisma/schema.prisma` + migrazione scritta `20261116180000_scaglioni_esatti`
  (`fornitori.scaglioni_esatti BOOLEAN NOT NULL DEFAULT false`), **non applicata** a `decobrands_db`.
- `app/backend/src/motore/motore.ts`: `scaglione()` esteso (fascia | solo sconti esatti, costante
  `TOLLERANZA_SCAGLIONE_ESATTO = 0.05` con rimando `// D-200 §19`), `anomaliaScontoMedio` e
  `anomaliaGruppo` ora usano `scaglione()` (quindi rispettano il modo esatto), `calcoloDocumento`
  aggiunge `scaglioni_esatti`. Firma `fornitori` opzionale per non toccare le prove pure esistenti.
- `app/backend/src/motore/dati.ts`: `scaglioni_esatti` sul fornitore e sul tipo `CalcoloDocumento`.
- `app/backend/src/fornitori.ts`: campo `scaglioni_esatti` (validato `@IsBoolean`), in `CAMPI_REGOLE`,
  `mappaFornitore` e ricalcolo degli aperti al cambio (evento già scritto dal `modifica`).
- `app/backend/src/pratiche.ts`: `aggiornaAnomalieProvvigione` porta il fornitore (raggruppamento +
  scaglioni_esatti) nel `S` minimo e distingue il messaggio (oltre l'ultimo / senza scaglione esatto);
  **aperto del pacchetto precedente**: `aDecobrands` nel Riepilogo = somma di `provvigioneDocumento`
  (prese effettive, gruppi in modalità riga), non più `base × bicchiere.dal_fornitore`.
- `app/backend/src/sconto-medio-ricalcola.ts`: usa `anomaliaProvvigione` (non più `anomaliaScontoMedio`),
  messaggio che distingue sconto medio / gruppo.
- `app/frontend/app/(app)/fornitori/VistaFornitori.tsx`: tendina «Scaglioni» (A fascia / Solo sconti
  esatti) nella finestra «Modifica le regole» + riga nel riepilogo.
- `app/frontend/lib/guida.ts`: esempio con soglie 0/1/5/10 in «Come si sceglie la percentuale».
- Prove: `test/scaglioni-esatti.spec.ts` (motore, 6) e `test/scaglioni-esatti-db.spec.ts` (endpoint,
  evento, congelato, 3).

## Prove ed esito

- `npx tsc --noEmit` backend e frontend: puliti.
- `npx jest` (su `decobrands_test_esatti`, creato con owner `decobrands`, migrazioni, cancellato):
  suite nuove `scaglioni-esatti` + `scaglioni-esatti-db` (9 prove) e suite toccate
  (`sconto-medio`, `raggruppamento-scaglioni*`, `motore`, `pratiche`, `percentuali`, `liquidazioni`,
  `analisi`, `bollettini`, `bollettino`, `documenti-pratica`, `correzione`, `fornitori`, `vincoli`,
  `incassi`, `valori-congelati`, `righe-nota-credito`) → **0 KO** (315 prove in 21 suite).
- Prove browser: non aggiornate (nessuna nuova schermata oltre la finestra regole già coperta da
  `app_fornitori.py`); le lancia Claude Code a fine onda.

## Numeri chiave

- a fascia: invariato (prima soglia ≥ sconto).
- esatti, soglie 0/1/5/10 (15/7/15/15): 0 → 15; 1 → 7; 9,98 → 15 (soglia 10); 3 → anomalia;
  0,5 → anomalia; 10,06 → anomalia.
- esatti + riga: righe 0 % e 3 % → anomalia del documento; righe 0 % e 10 % → due gruppi, somma giusta.
- Riepilogo in modalità riga: fattura 600@5 % + 400@20 % → 130 € a Decobrands, margine 62 €.

## Dubbi / punti aperti

- Il Riepilogo mostra ancora la voce «Sconto medio → scaglione» e le percentuali singole (`agente`,
  `sub`, `margine_pct`) anche in modalità riga e in modo esatto: sono la percentuale dello sconto medio,
  non quelle effettive. La presa/pagata/margine in euro sono corrette; se serve, in un passo successivo
  si possono esporre le pct effettive. Non richiesto dal pacchetto.
- Il messaggio del Riepilogo «supera l'ultimo scaglione» (VistaPratica) resta quello della fascia: in
  modo esatto l'anomalia è «senza scaglione esatto», ma `VistaPratica.tsx` è **fuori dai file ammessi**
  di questo pacchetto. Da allineare in un lavoro dedicato se Ugo lo vuole.
- Tolleranza ±0,05 fissata come costante del motore: è la scelta di Ugo (D-200), non un parametro.

## Da documentare (nota di rilascio 0.2.9)

Nuova impostazione «Scaglioni» sul fornitore: «A fascia (prima soglia ≥ sconto)», predefinita e
invariata, oppure «Solo sconti esatti (±0,05)». In quest'ultimo modo lo scaglione è la soglia che
coincide con lo sconto (entro 0,05 punti per gli arrotondamenti); senza soglia esatta la provvigione
resta da decidere (anomalia, come oggi oltre l'ultima soglia). Vale in entrambi i raggruppamenti
(documento e riga). Il Riepilogo della pratica in modalità riga mostra la presa effettiva dei
documenti (somma dei gruppi), non più la percentuale unica dello sconto medio.
