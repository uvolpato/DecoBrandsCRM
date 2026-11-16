# `sconto-medio` — correzioni 1: la guida

Ugo (15/11/2026): la regola dello sconto medio **deve essere ben chiara nella guida**.

In `app/frontend/lib/guida.ts` (pagina Pratica, e un rimando nelle pagine Fornitori/Clienti dove si
impostano gli scaglioni dell'agenzia, e nella Liquidazioni) scrivi una sezione «Come si sceglie la
percentuale» in italiano semplice, frasi brevi, con:
1. cos'è lo sconto medio (1 − netto/lordo del documento) con un esempio numerico vero;
2. la scelta dello scaglione con l'esempio di Ugo: scaglioni 0 e 5, sconto medio 3,5 → si usa il 5;
   esattamente 5 → 5; 0 → 0;
3. sconto medio oltre l'ultimo scaglione (es. 6,2) → anomalia, la pratica non si chiude, si risolve
   aggiungendo lo scaglione all'agenzia;
4. quale documento conta: nella pratica si vede l'ultimo arrivato; la fattura è definitiva; la nota di
   credito ricalcola sulla differenza (fattura − nota), e l'eventuale storno va nella liquidazione
   successiva;
5. documento senza righe leggibili → si usa lo sconto impostato sull'agenzia.
Niente parole inglesi, niente nomi di campi del database. Se la guida ha già un testo che dice il contrario
(scaglione dallo sconto dell'agenzia), correggilo.

Poi `tsc --noEmit` frontend e aggiorna il resoconto. Riepilogo in 4 righe.

## In più: seed e prove (Claude Code, 15/11/2026)
1. **Seed**: ora ammesso `app/backend/prisma/seed/` (dati e script). Aggiungi alle righe dei documenti del seed
   sconti di riga coerenti con lo sconto dell'agenzia (`abbinamenti.sconto`), così lo sconto medio cade nello
   stesso scaglione di prima e **i numeri di Bollettini, Liquidazioni e Analisi restano quelli del prototipo**.
   Gli importi netti dei documenti non devono cambiare: se serve, ricava il prezzo lordo dal netto.
2. Rilancia **tutta** la suite backend (`npx jest` completa) su `decobrands_test_sconto_medio` ricreato:
   0 KO (compresi `motore`, `percentuali`, `bollettini`, `bollettino`, `liquidazioni`, `analisi`, `oggi`).
   Se un KO non è tuo, scrivilo con la causa.
3. `prototipo-alternativo/assets/motore.js` e `dati.js`: stessa regola e stessi sconti di riga, solo se breve;
   altrimenti scrivilo nel resoconto (il prototipo è solo idea).
4. **Cancella** il db `decobrands_test_sconto_medio` alla fine (nel resoconto risultava ancora da cancellare).
