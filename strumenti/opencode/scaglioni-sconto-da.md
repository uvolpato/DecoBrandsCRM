# Pacchetto `scaglioni-sconto-da`

## Contesto (decisione di Ugo, 17/11/2026)
Gli scaglioni devono funzionare **come nel vecchio CRM**, altrimenti Matteo non sa più configurarli e non ci si capisce:
la soglia è **«Sconto da %»** (limite inferiore). Oggi (D-182) il motore usa «prima soglia ≥ sconto» (limite superiore).

## Regola nuova (D-202, sostituisce la scelta della soglia di D-182; il resto di D-182 resta)
- **A fascia**: vale l'**ultima soglia ≤ sconto** (la più alta fra quelle non superiori allo sconto).
  - Sconto **sotto la prima soglia** (tabella senza 0) → anomalia, provvigione «da decidere» (stesso meccanismo di oggi,
    messaggio «sconto X% sotto la prima soglia Y%»).
  - Sconto **sopra l'ultima soglia** → vale l'ultima soglia (non è più un'anomalia).
- **Solo esatti** (D-200): invariato (sconto = soglia ±0,05, altrimenti anomalia).
- Vale in modalità documento e in modalità riga (gruppi), e per l'eccezione del subagente sulla soglia (D-51).
- Esempi: Gasper 0 → 20/10, 30 → 15/8, 40 → 10/6: sconto 25 → 20%; 30 → 15%; 55 → 10%. Arte (esatti) 0/1/5/10/15/20/25/30:
  sconto 1 → 7%; 3 → anomalia.

## Compito
- Motore: **una sola funzione** di scelta della soglia (`scaglione()`); tutte le anomalie collegate (`anomaliaScontoMedio`,
  `anomaliaGruppo`, `anomaliaProvvigione`, `ultimoScaglione` se non serve più → togli) seguono la regola nuova; i
  messaggi «oltre l'ultimo scaglione» diventano «sotto la prima soglia» dove serve (backend, `bollettino.ts`,
  `liquidazioni.ts`, Riepilogo pratica, guida). Codice minimo, niente doppioni.
- **Dati di prova**: riallinea il seed (`prisma/seed/**`) perché i numeri di prova restino sensati con la regola nuova
  (sposta le soglie al limite inferiore, es. una tabella 10/20/30 «fino a» diventa 0/10/20 «da» con le stesse %); poi
  riallinea i valori attesi delle prove jest **solo** dove cambiano per la regola nuova, spiegando nel resoconto ogni
  numero cambiato. Le prove nel browser (`strumenti/prove/app_*.py`) con numeri fissi: aggiornale e verifica con
  `py_compile`.
- Interfaccia: nella finestra degli scaglioni (`FormPercentuali.tsx`) e nella finestra «Informazioni» delle
  Percentuali (`VistaFornitori.tsx`) una riga chiara: «Ogni soglia vale da quello sconto in su, fino alla successiva
  (come nel vecchio CRM). Con "solo sconti esatti" lo sconto deve coincidere con una soglia.» Il riepilogo del fornitore
  «A fascia (prima soglia ≥ sconto)» diventa «A fascia (da soglia in su)».
- **Dati veri**: `decobrands_db` ha 10 documenti, **nessuno fissato**: il ricalcolo degli aperti basta. Prepara il
  comando di servizio (estendi `sconto-medio-ricalcola.ts` o `valori-congelati-ricalcola.ts`, quello che c'è) con
  `--prova`; **non lanciarlo su `decobrands_db`**: lo lancia Claude Code.
- Spec: riga §19 **D-202** (data 17/11/2026, chi: Ugo; perché: stessa lingua del vecchio CRM con Matteo), *Perché* nella
  sezione dello sconto medio accanto a D-182 (scrivi che D-202 sostituisce la scelta della soglia), versione +0.01.
  Guida (`lib/guida.ts`, «Come si sceglie la percentuale»): esempio Gasper sopra. Piano: attività con ore **da approvare**.

## Prove (jest con `DATABASE_URL_TEST` su `decobrands_test_scontoda`, crea e cancella; tutte le suite 0 KO, a gruppi di ~9;
`npx tsc --noEmit` backend e frontend)
- Gasper: 0 → 20%, 25 → 20%, 30 → 15%, 39,99 → 15%, 40 → 10%, 55 → 10%;
- tabella senza 0 (prima soglia 5): sconto 2 → anomalia «sotto la prima soglia»;
- esatti Arte: 1 → 7%, 3 → anomalia, 9,98 → 15% (soglia 10);
- modalità riga: gruppi con la regola nuova;
- eccezione del subagente sulla soglia scelta con la regola nuova.

## File ammessi
`app/backend/src/**`, `app/backend/prisma/seed/**`, `app/backend/test/**`, `app/frontend/componenti/FormPercentuali.tsx`,
`app/frontend/app/(app)/fornitori/VistaFornitori.tsx`, `app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx` (solo
messaggi), `app/frontend/lib/guida.ts`, `strumenti/prove/app_*.py`, `specifica-crm-provvigioni.md`, `piano-lavoro-crm.md`.
Niente migrazioni (la tabella non cambia).

## Regole
Leggi `strumenti/opencode/regole-onda-parallela.md` (**niente script fuori da jest che toccano il database**) e
`CLAUDE.md`. V12, V13, D-51, D-182, D-183, D-199, D-200. Il pacchetto `bollettini-quota-somma` ha appena toccato
`motore.ts` e `bollettino.ts`: non togliere niente del suo lavoro. Ogni comando prisma/jest con `DATABASE_URL` /
`DATABASE_URL_TEST` esplicito; mai `decobrands_db`; `.env` mai letto. Niente commit, `cd`, `/tmp`, `&`, porte 8001/8002.
Skill con lo strumento `skill`: `ponytail-review`, `owasp-security`, `caveman`.

## Resoconto
`strumenti/opencode/resoconto-scaglioni-sconto-da.md`: file toccati, regola, numeri di prova cambiati (prima → dopo, perché),
prove ed esito, comando di ricalcolo, «Da documentare». Riepilogo in massimo 10 righe.
