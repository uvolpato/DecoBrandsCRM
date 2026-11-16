# Resoconto — Sconto medio sui documenti (pacchetto `sconto-medio`, 15/11/2026)

Esecutore: DeepSeek V4 pro · Pacchetto: `strumenti/opencode/sconto-medio.md`.
Nuova regola (decisione di Ugo): lo scaglione della provvigione si sceglie dallo **sconto medio letto sui
documenti** (1 − netto/lordo), non più da `interscambio.sconto`. Numero di decisione proposto: **D-182**.

## Punto unico scelto

`percentuali()` in `app/backend/src/motore/motore.ts` (già usato da pratica, bollettini, liquidazioni,
Analisi, esportazioni). Lo scaglione si sceglie così: `sconto = scontoMedio(p) ?? ab.sconto` (riserva sullo
sconto dell'agenzia quando non ci sono righe utili). La scelta dello scaglione cambia da «soglia più alta ≤
sconto» a «**primo scaglione ≥ sconto medio**» (es. sconto medio 3,5 con scaglioni 0 e 5 → 5; esattamente 5 →
5; 0 → 0; oltre l'ultimo → null = anomalia).

## Regole implementate

1. **`scontoMedio(p)`** (motore.ts): sconto medio del documento che comanda (fattura → conferma/proforma →
   ordine), `1 − Σ importo / Σ (quantità × prezzo)`, in %, a 2 decimali. Righe senza quantità o prezzo fuori
   dal calcolo; senza righe utili → `null` → riserva sullo sconto dell'agenzia. La media è già pesata sul
   lordo perché `importo` è il netto di riga (D-49).
2. **`scaglione()`**: «primo ≥ sconto»; `ultimoScaglione()` per la soglia più alta; `anomaliaScontoMedio(S, p)`
   quando lo sconto medio supera l'ultimo scaglione (dettaglio: pratica, documento, sconto medio, ultimo
   scaglione).
3. **Anomalia + blocco**: `aggiornaPratica` (pratiche.ts) apre/chiude l'anomalia
   `provvigione.sconto_medio` (servizio `provvigioni`, chiave = id pratica) a ogni salvataggio della pratica.
   Blocco nella chiusura: `bloccoChiusura` (liquidazioni.ts, ora esportata) e `chiudi` del bollettino
   (bollettino.ts) rispondono 409 finché una pratica ha lo sconto medio oltre l'ultimo scaglione. La
   provvigione è «da decidere» (`percentuali` → null), mai calcolata su uno scaglione inventato.
4. **Pagina pratica** (`pratiche.ts` `dettaglioPratica`): risposta con `sconto_medio` (`{ valore, scaglione,
   documento, oltre, ultimo_scaglione }`) e, se oltre l'ultimo, la provvigione resta null.
5. **Frontend** (`VistaPratica.tsx`): nel Riepilogo la voce «Sconto medio → scaglione» (es. «3,50 % → 5 %»);
   se oltre l'ultimo, avviso con il collegamento a `percentuali del fornitore` (classe esistente
   `.avviso-verifica`).
6. **Comando di servizio** `app/backend/src/sconto-medio-ricalcola.ts` (`npm run sconto:medio -- [--prova]`):
   ricalcola e stampa prima/dopo (pratica, sconto medio, scaglione, provvigione Decobrands e subagente) per
   le pratiche **non** in liquidazioni chiuse. Non lancia scritture in `--prova`. Non va lanciato su
   `decobrands_db` senza copia di sicurezza: lo lancia Claude Code.

## File toccati

- `app/backend/src/motore/motore.ts` — `scontoMedio`, `soglieInVigore`, `scaglione` (nuova scelta),
  `ultimoScaglione`, `anomaliaScontoMedio`, `percentuali` (fonte = sconto medio, espone `sconto_medio`).
- `app/backend/src/pratiche.ts` — `aggiornaAnomaliaScontoMedio`, `dettaglioPratica` (`sconto_medio`).
- `app/backend/src/bollettino.ts` — blocco 409 in `chiudi`.
- `app/backend/src/liquidazioni.ts` — blocco in `bloccoChiusura` (ora `export`).
- `app/backend/src/sconto-medio-ricalcola.ts` — nuovo comando.
- `app/backend/package.json` — script `sconto:medio`.
- `app/backend/test/sconto-medio.spec.ts` — prove nuove (9).
- `app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx` — voce e avviso.
- `app/frontend/lib/guida.ts` — testo per la pagina Pratica.

## Prove

- `npx tsc --noEmit` backend: **OK**. Frontend: **OK**.
- jest su `decobrands_test_sconto_medio` (creato, migrato; da cancellare):
  - `sconto-medio.spec.ts`: **9/9** (media pesata 10 %/0 % → 3,33 %; scaglione 3,5→5, 5→5, 0→0, 6,2→null;
    anomalia 6,2 con pratica/documento/sconto medio/ultimo; riserva senza righe; fattura comanda sull'ordine;
    nota di credito invariata; `bloccoChiusura` rifiuta con anomalia e lascia chiudere senza).
  - `seed.spec.ts`: **9/9** (il seed si carica ancora con `aggiornaAnomaliaScontoMedio`).

## Correzioni 1 (15/11/2026)

### Guida

In `app/frontend/lib/guida.ts` ho scritto la sezione «**Come si sceglie la percentuale**» (pagina Pratica,
`sapere`) con i 5 punti richiesti: definizione di sconto medio con esempio (lordo 1 000 / netto 900 → 10 %);
scelta dello scaglione con l'esempio di Ugo (scaglioni 0 e 5: 3,5 → 5; 5 → 5; 0 → 0); oltre l'ultimo scaglione
(6,2) → anomalia e pratica non chiudibile; quale documento conta (ultimo arrivato, la fattura è definitiva, la
nota ricalcola sulla differenza e l'eventuale storno va alla liquidazione successiva); documento senza righe →
sconto dell'agenzia. Rimandi anche in **Fornitori**, **Clienti** e **Liquidazioni** (`sapere`), e corretto il
vecchio testo della Pratica che diceva «sconto dall'agenzia».

### Seed (ora ammesso `prisma/seed/`)

In `00-base.ts` aggiungo su ogni riga uno sconto di riga = `abbinamenti.sconto` (il prezzo resta il **netto**, il
lordo si ricava: `prezzo_unitario = prezzo / (1 − sconto/100)`, con `Math.floor` a 4 decimali così lo sconto
medio resta appena sotto la soglia). Il **netto dei documenti non cambia**, lo sconto medio cade nello **stesso
scaglione di prima** e i numeri di Bollettini, Liquidazioni e Analisi restano quelli del prototipo. Verificato:
sconto medio = 1,00 / 0,00 / 3,00 / 5,00 / 10,00 % esattamente uguale ad `abbinamenti.sconto`, 0 anomalie.

### Prototipo (solo la parte breve)

`prototipo-alternativo/assets/motore.js`: aggiornato solo `M.scaglione` a «primo scaglione ≥ sconto» (una riga).
**Non** ho portato la regola completa al prototipo (sconto medio in `M.percentuali` + sconti di riga in `dati.js`):
non è breve, il prototipo è solo idea → resta da fare, lo segnalo.

### Prove (suite completa su `decobrands_test_sconto_medio`)

- `motore.spec.ts`: corretto il test `scaglioni Gries` (attesi «primo ≥») e i due test D-146 (righe vuote → riserva
  sullo sconto dell'agenzia). **27/27**.
- Tutta la suite a gruppi: **0 KO mio**. L'unico KO non mio è `versione.spec.ts` (si aspetta `0.2.0`, il
  package.json è `0.2.6`: pre-esistente, il bump di versione non ha aggiornato la prova). `proposta.spec.ts`
  ha un timeout flaky in batch, ma passa da solo (79/79): non è un KO mio (altri pacchetti stanno su
  `proposta.ts`/`proposta.spec.ts`).
- `npx tsc --noEmit` backend e frontend: **OK**.

## Comando da lanciare (lo lancia Claude Code, dopo copia di sicurezza)

```
npm run build && npm run sconto:medio -- --prova
```

Numeri attesi su `decobrands_db` (in particolare **OF/2026/002**, da `resoconto-sconto-cliente-002.md`):
sconto medio 10 % (netto 1840,23 / lordo 2044,70) → scaglione 10 (18 %/6 %) → provvigione Decobrands 331,24 €,
subagente 110,41 € (prima: scaglione 0, 368,05 € / 147,22 €). Le altre pratiche con sconto di riga sui
documenti cambiano di conseguenza.

## Dubbi e limiti

- **Nota di credito**: il motore non salva le righe della nota (`faseDi('nota_credito') = null`). Lo sconto
  medio di «fattura − nota» non è calcolabile dal lordo/righe della nota: la nota segue lo scaglione della sua
  fattura (invariato, come il caso «nota su righe al 10 %»). Il caso «nota che cambia la media» richiede di
  salvare le righe della nota (migrazione futura). Segnalato, non implementato.
- La data per l'`ultimoScaglione`/anomalia è quella dell'ultimo documento fiscale (o dell'ordine): la scelta
  della versione dello scaglione è la stessa di `percentuali` a quella data.

## Da documentare

- **spec §5.3** (e §4.2.7.1): lo scaglione della provvigione si sceglie dallo sconto medio letto sui documenti
  (1 − netto/lordo), non più da `interscambio.sconto`; la base dell'imponibile resta il netto. Documento senza
  righe utili → sconto dell'agenzia (riserva).
- **spec §19 — D-182** (numero proposto): il perché è nella sezione «Decisione di Ugo» del pacchetto
  `sconto-medio.md` (lo sconto di riga dei documenti determina lo scaglione reale, `interscambio.sconto` non è
  più la fonte). Include: scelta «primo scaglione ≥ sconto medio», anomalia `provvigione.sconto_medio` con
  schema del dettaglio (pratica, documento, sconto medio, ultimo scaglione), blocco di chiusura/verifica.
- **piano §12**: resta l'attività di portare al **prototipo** la regola completa (sconto medio in `M.percentuali`
  + sconti di riga in `dati.js`): il seed e lo `scaglione` del prototipo sono già allineati. Da aggiornare anche
  `versione.spec.ts` (0.2.0 → 0.2.6), KO pre-esistente non mio.
