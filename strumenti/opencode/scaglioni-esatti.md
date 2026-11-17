# Pacchetto `scaglioni-esatti`

## Contesto
Oggi `scaglione()` (`app/backend/src/motore/motore.ts`) sceglie la **prima soglia ≥ sconto** (fascia, D-182); oltre
l'ultima soglia → anomalia. Con soglie come quelle di Arte (0 → 15, 1 → 7 introdotta per la fiera, 5 → 15, 10 → 15, …)
la fascia sbaglia: sconto 0,5% → 7%, sconto 3% → 15% della soglia 5. Decisione di Ugo (16/11/2026): impostazione sul
fornitore per accettare **solo sconti esatti**, altrimenti anomalia. Il pacchetto precedente `raggruppamento-scaglioni`
ha appena aggiunto `fornitori.raggruppamento` (documento | riga) e i gruppi per sconto di riga: leggi il suo resoconto
`strumenti/opencode/resoconto-raggruppamento-scaglioni.md` e **non toglierne niente**.

## Regola
1. `fornitori.scaglioni_esatti BOOLEAN NOT NULL DEFAULT false`:
   - `false` (a fascia): comportamento di oggi invariato al centesimo;
   - `true` (solo sconti esatti): lo scaglione è la soglia con `|sconto − soglia| ≤ 0,05` punti (tolleranza fissa per gli
     arrotondamenti, costante nel motore con commento `// D-nn §19`); nessuna soglia → **anomalia** e provvigione
     «da decidere», come oggi per lo sconto oltre l'ultima soglia (stesso meccanismo, stesso elenco anomalie, messaggio
     proprio: «sconto X% senza scaglione esatto»).
2. Vale in entrambi i raggruppamenti: in modalità documento sullo sconto medio, in modalità riga su ogni gruppo (un gruppo
   senza soglia esatta → anomalia del documento).
3. Nessuna deroga sulla pratica: i casi particolari si coprono con la correzione del documento che c'è già.
4. Documenti già congelati non cambiano; cambiare l'impostazione ricalcola solo i documenti aperti del fornitore, nella
   stessa transazione, con evento nel registro (come `raggruppamento`, riusa lo stesso percorso).
5. `calcolo` del documento: aggiunge `scaglioni_esatti: true|false`.

## Compito
- **Prima, rimasto aperto dal pacchetto precedente** (resoconto «Correzioni 1» → «Aperti»): il Riepilogo della pratica
  (`a_decobrands` / `margine`, voce «Da … a Decobrands») usa ancora la percentuale unica `bicchiere.dal_fornitore` in
  modalità riga. Allinealo a `provvigioneDocumento` (server, V12), con prova: fornitore `riga`, 600@5% + 400@20% →
  Riepilogo 130 € a Decobrands, margine 62 €. Stessa cosa per `sconto-medio-ricalcola.ts` → `anomaliaProvvigione`.
- Migrazione **scritta, non applicata** a `decobrands_db` (colonna sopra).
- Motore: una sola funzione di scelta della soglia (estendi `scaglione()`), usata ovunque (anomalia compresa:
  `anomaliaScontoMedio` e quella dei gruppi). Codice minimo.
- Fornitore (`src/fornitori.ts`, `VistaFornitori.tsx`): campo «Scaglioni» nella stessa finestra di «Raggruppamento»
  (tendina: «A fascia (prima soglia ≥ sconto)» / «Solo sconti esatti (±0,05)»), mostrato nel riepilogo del fornitore.
- Guida (`lib/guida.ts`, «Come si sceglie la percentuale»): esempio con soglie 0/1/5/10: sconto 3% → a fascia 15%
  (soglia 5), esatti → anomalia; sconto 1% → 7% in entrambi.
- Spec: riga §19 col primo numero libero, *Perché* accanto a D-182, schema della tabella fornitori, versione +0.01.
  Piano: attività con ore **da approvare**.

## Prove (jest con `DATABASE_URL` esplicito su `decobrands_test_esatti`, suite toccate 0 KO; `npx tsc --noEmit` backend e frontend)
- a fascia: suite esistenti invariate;
- esatti, soglie 0/1/5/10 (15/7/15/15): sconto 0 → 15; 1 → 7; 9,98 → 15 (soglia 10); 3 → anomalia; 0,5 → anomalia;
  10,06 → anomalia;
- esatti + raggruppamento riga: righe a 0% e 3% → anomalia del documento; righe 0% e 10% → due gruppi, somma giusta;
- documento congelato invariato al cambio dell'impostazione; evento nel registro.

## File ammessi
`app/backend/src/**`, `app/backend/prisma/schema.prisma` + nuova cartella di migrazione, `app/backend/test/**`,
`app/frontend/app/(app)/fornitori/VistaFornitori.tsx`, `app/frontend/lib/guida.ts`, `strumenti/prove/app_*.py` (solo
`py_compile`), `specifica-crm-provvigioni.md`, `piano-lavoro-crm.md`. Vietati: prototipo, `componenti/**`, `stile.css`.

## Regole
Leggi `strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`. V12, V13, D-31, D-182, D-183. Italiano semplice, commenti
brevi con rimando. **Ogni comando prisma/jest con `DATABASE_URL` esplicito nella stessa riga** su `decobrands_test_esatti`
(crealo con owner `decobrands`, migrazioni, cancellalo alla fine); mai `decobrands_db`. `.env` mai letto (URL con grep).
Niente commit, porte 8001/8002, `cd`, `/tmp`, `&`, Integra. Skill con lo strumento `skill`: `owasp-security`,
`postgresql-code-review`, `ponytail-review`, `caveman`.

## Resoconto
`strumenti/opencode/resoconto-scaglioni-esatti.md`: file toccati, migrazione, prove ed esito, dubbi, «Da documentare»
(nota di rilascio 0.2.9). Riepilogo in massimo 10 righe.
