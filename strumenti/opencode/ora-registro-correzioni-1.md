# `ora-registro` — correzioni 1 (allargamento)

Ugo (15/11/2026): non solo il registro. **In tutta l'applicazione** l'ora usata deve essere **una sola:
quella del server che ospita l'applicazione** (la macchina del backend).

## Compito
1. **Censimento** (sola lettura): elenca ogni punto in `app/backend/src/` e `app/frontend/` dove si prende
   l'ora o la data: `new Date()`, `Date.now()`, `now()`/`CURRENT_TIMESTAMP`/`default(now())` di Prisma e
   PostgreSQL, orologi simulati o di prova («oggi» finto), ore arrivate da macchine esterne (server di
   lettura GPU, posta, Integra), ore prese dal browser. Tabella nel resoconto: file:riga, cosa, fonte.
2. **Regola**: l'ora la decide il backend con il **suo** orologio (Node, `new Date()` sul server, in un
   unico helper se non esiste già — riusalo se c'è). Il database non mette ore sue dove il backend può
   passarle; se restano `default(now())`, verifica e scrivi nel resoconto che il db gira **sulla stessa
   macchina** o con lo stesso orologio, con la misura (`select now()` vs Node). Il browser **non manda
   mai** un'ora che venga salvata (V12); il browser usa l'ora solo per mostrare, e i confronti «da quanto
   tempo», «scaduto», «oggi» si calcolano sul server. Ore da macchine esterne: tenute solo come dato
   informativo, mai come ora dell'evento.
   Orologio di prova: solo con variabile esplicita nei test, mai attivo in esercizio.
3. **Correggi** i punti che violano la regola, con il minimo codice. Non toccare `lettore.ts`, `lettura.ts`,
   `documenti.ts`, `proposta.ts`, `pratiche.ts`, `motore/*`, pagina Oggi, `VistaDocumento.tsx`,
   `PdfEvidenziato.tsx` (altri pacchetti in corso): per quelli scrivi la correzione nel resoconto.
   Migrazioni: solo scritte, non applicate.
4. Mostra sempre in ora italiana (`Europe/Rome`) con un solo formattatore nel frontend (riusa quello che c'è).

## Prove
`npx tsc --noEmit` backend e frontend; jest sul registro e sugli helper toccati.

Aggiungi tutto al resoconto `strumenti/opencode/resoconto-ora-registro.md` (sezione «Ora unica»).
