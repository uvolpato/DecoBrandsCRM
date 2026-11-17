# Pacchetto `agenzia-senza-subagente`

## Decisione di Ugo (17/11/2026)
Nell'agenzia (cliente presso un fornitore, tabella `interscambio`) il **subagente non è obbligatorio**. Senza subagente
la provvigione è **tutta di Decobrands**: quota del subagente = 0, margine Decobrands = provvigione intera. Caso vero:
«Nuova agenzia per Linea V Di Dilillo Veronica» presso ARTE, codice 45289: oggi rifiutata con «Subagente obbligatorio»
(`app/backend/src/clienti.ts:279`).

## Regola
- `interscambio.subagente_id` diventa **NULL ammesso** (migrazione; la FK resta per i valori non nulli; verifica che
  l'EXCLUDE dei periodi (D-35) non dipenda da `subagente_id`, e se sì che funzioni con NULL).
- Agenzia senza subagente: `pct_subagente` e `regola_mensile` non hanno senso → il server li rifiuta (400 chiaro) se
  arrivano valorizzati; nella finestra i due campi si disattivano quando il subagente è vuoto, con la nota «Senza
  subagente la provvigione è tutta di Decobrands».
- Motore: dove serve il subagente (`percentuali`, `quotaSub`, `regolaPiatta`, `provvigioneRiga`, eccezioni D-51,
  `righeLiquidazione`, `fattiAnalisi`/`analisiTrimestre`, riconciliazione, esportazioni) un'agenzia senza subagente dà
  quota subagente **0** e **nessuna riga in liquidazione** ai subagenti; Decobrands prende la sua `pct_agente` come oggi.
  Nessuna eccezione, nessun `null` che faccia sparire il documento (la provvigione Decobrands deve esserci).
- Analisi e report: il documento senza subagente compare sotto una voce **«Senza subagente»** (o «Diretto Decobrands»,
  scegli una sola etichetta e usala ovunque), non sparisce.
- Pagine: Clienti (agenzie), Pratica (Riepilogo: «Subagente: —, tutta a Decobrands»), Liquidazioni, Analisi: niente
  errori con subagente vuoto.
- Il subagente si può aggiungere dopo (modifica dell'agenzia con data di validità, come oggi).

## Prove (jest con `DATABASE_URL_TEST` su `decobrands_test_senzasub`, crea e cancella; tutte le suite toccate 0 KO, a gruppi;
`npx tsc --noEmit` backend e frontend)
- crea agenzia senza subagente → ok; con `pct_subagente` → 400;
- fattura di quel cliente: provvigione Decobrands = base × pct_agente, subagente 0, margine = tutto;
- liquidazione del trimestre: nessuna riga per quel documento; Analisi: voce «Senza subagente» con l'importo;
- bollettino: riconciliazione normale;
- agenzia che passa da nessun subagente a un subagente con data → i documenti dopo la data vanno al subagente.
Prova nel browser: aggiungi i controlli a `strumenti/prove/app_clienti.py` (solo `py_compile`).

## File ammessi
`app/backend/src/**`, `app/backend/prisma/schema.prisma` + nuova cartella di migrazione, `app/backend/test/**`,
`app/frontend/componenti/FormAgenzia.tsx`, `app/frontend/app/(app)/clienti/**`, `app/frontend/app/(app)/pratiche/**`,
`app/frontend/app/(app)/liquidazioni/**`, `app/frontend/app/(app)/analisi/**`, `app/frontend/lib/guida.ts`,
`strumenti/prove/app_clienti.py`, `specifica-crm-provvigioni.md` (§19 col primo numero libero dopo D-204, *Perché*, schema,
versione +0.01), `piano-lavoro-crm.md` (ore **da approvare**).

## Regole
`strumenti/opencode/regole-onda-parallela.md` (**niente script fuori da jest che toccano il database**) e `CLAUDE.md`.
V12, V13, D-07, D-35, D-51, D-166. Migrazione **scritta, non applicata** a `decobrands_db`. Ogni comando prisma/jest con
`DATABASE_URL`/`DATABASE_URL_TEST` esplicito; mai `decobrands_db`; `.env` mai letto. Niente commit, `cd`, `/tmp`, `&`, porte
8001/8002, Integra. Skill con lo strumento `skill`: `owasp-security`, `postgresql-code-review`, `ponytail-review`, `caveman`.
Resoconto `strumenti/opencode/resoconto-agenzia-senza-subagente.md`. Riepilogo in 10 righe.
