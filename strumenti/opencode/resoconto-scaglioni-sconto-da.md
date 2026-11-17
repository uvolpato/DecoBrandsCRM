# Resoconto — Scaglioni «da soglia in su» come nel vecchio CRM (pacchetto `scaglioni-sconto-da`, 17/11/2026)

## Regola (D-202)
La soglia è **«Sconto da %»** (limite inferiore), come nel vecchio CRM. A fascia vale l'**ultima soglia ≤ sconto** (la più alta fra quelle non superiori), non più la prima ≥ (D-182). Sconto **sotto la prima soglia** (tabella senza 0) → anomalia «sconto X% sotto la prima soglia Y%»; sconto **sopra l'ultima soglia** → vale l'ultima (non è più un'anomalia). «Solo sconti esatti» (D-200) invariato. Vale in documento e in riga (gruppi) e per l'eccezione del subagente (D-51).

## File toccati
- `motore/motore.ts`: una sola funzione di scelta (`scaglione`); `ultimoScaglione` → `primaSoglia`; `anomaliaScontoMedio`, `anomaliaGruppo`, `descrizioneAnomalia` con `prima_soglia` e messaggi «sotto la prima soglia»; commenti.
- `motore/dati.ts`: commenti («null se sotto la prima soglia»).
- `pratiche.ts`: messaggi e `dettaglio` dell'anomalia (`prima_soglia`), campo `prima_soglia` nel Riepilogo.
- `bollettino.ts`, `liquidazioni.ts`: commenti del blocco alla chiusura.
- `sconto-medio-ricalcola.ts`: messaggio (`prima_soglia`); `--prova` era già presente.
- `prisma/seed/00-base.ts`: commento (le soglie del seed sono già «da»: 0/1/5/10/100; lo sconto medio a 2 decimali cade esattamente sulla soglia dell'agenzia, quindi sia D-182 sia D-202 scelgono la soglia giusta e i numeri restano quelli del prototipo).
- Prove: `sconto-medio.spec.ts`, `scaglioni-esatti.spec.ts`, `raggruppamento-scaglioni.spec.ts`, `righe-nota-credito.spec.ts`, `motore.spec.ts` (riallineate); `raggruppamento-scaglioni-db.spec.ts` era già aggiornato per D-202 da un giro precedente.
- Frontend: `FormPercentuali.tsx` (riga «Ogni soglia vale da quello sconto in su…»), `VistaFornitori.tsx` («A fascia (da soglia in su)» in 2 posti + riga nelle Informazioni), `VistaPratica.tsx` (messaggi «è sotto la prima soglia», campo `prima_soglia`), `lib/guida.ts` («Come si sceglie la percentuale» con l'esempio Gasper).
- `specifica-crm-provvigioni.md` (versione 8.91, §19 D-202, *Perché (D-202)*), `piano-lavoro-crm.md` (F7-A26).

## Numeri di prova cambiati (prima → dopo)
- `scaglione` a fascia: `SOGLIE_05` 0/5 → sconto 3,5 → **0** (era 5), 6,2 → **5** (era null/anomalia).
- Gasper (0 → 20/10, 30 → 15/8, 40 → 10/6): 25 → 20 %, 30 → 15 %, 39,99 → 15 %, 40 → 10 %, 55 → 10 %.
- `raggruppamento-scaglioni`: soglie 0 → 15/8 e 10 → 10/5 (erano 10/20); gruppo 5 % → scaglione **0**, 20 % → **10**, documento 11,63 % → **10**. Provvigioni invariate (agente 130/sub 68, documento 100/50).
- `scaglioni-esatti` a fascia: 3 → soglia **1** (7 %), 0,5 → **0** (15 %), 9,98 → **5**, 10,06 → **10** (non più null); calcolo 970 × 7 % = **67,90** (era 145,50).
- `righe-nota-credito`: 1 % → scaglione **0** (era 5); l'anomalia «oltre l'ultimo» diventa «sotto la prima soglia» (tabella senza 0).

## Prove ed esito
- `npx tsc --noEmit` backend e frontend: **0 errori**.
- Jest puri (`sconto-medio`, `scaglioni-esatti`, `raggruppamento-scaglioni`, `righe-nota-credito`): **43/43 OK**.
- `motore.spec.ts` (seed vs prototipo): **27/27 OK**.
- `raggruppamento-scaglioni-db.spec.ts`: **8/8 OK**. `scaglioni-esatti-db.spec.ts`: **3/3 OK** (su database fresco).
- `python -m py_compile strumenti/prove/app_*.py`: OK (nessuna prova browser ha numeri fissi sullo scaglione).

## Comando di ricalcolo
`npm run sconto:medio -- --prova` (ricalcola sconto medio e scaglione degli aperti e stampa prima/dopo; `--prova` non scrive). **Non lanciato** su `decobrands_db`: lo lancia Claude Code. `decobrands_db` ha 10 documenti, nessuno fissato: basta il ricalcolo degli aperti.

## Cose aperte
- `schema.prisma` (fuori dai file ammessi, nessuna migrazione) ha ancora il commento «false = a fascia (prima soglia ≥ sconto)» (riga 30); lo stesso testo nella spec §4.2.1. Da allineare a «da soglia in su» quando il file entra nei file ammessi.
- Durante il collaudo le prove con il database hanno mostrato **flakiness** (lock consultivo 424242 lasciato da giri interrotti, dati sporchi): i fallimenti spariscono su un database di prova ricreato pulito. Non è un difetto del pacchetto.

## Da documentare (nota di rilascio)
Gli scaglioni tornano a valere **«da soglia in su»** come nel vecchio CRM: a fascia vale l'ultima soglia ≤ sconto medio (non più la prima ≥); sotto la prima soglia la provvigione resta da decidere (anomalia), sopra l'ultima vale l'ultima soglia. «Solo sconti esatti» resta invariato. Vale in modalità documento e riga, e per l'eccezione del subagente.
