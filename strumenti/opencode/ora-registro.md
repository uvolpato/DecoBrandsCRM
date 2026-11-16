# Pacchetto `ora-registro`

## Contesto
Ugo (15/11/2026, ore 19:41 sull'orologio del PC): nella pagina Stato del sistema / registro, l'anomalia
«Il server di lettura non risponde a 2 controlli di fila… (lettura.non_raggiungibile, anomalia chiusa)»
è datata **15/11/2026 20:03**, cioè **nel futuro** di ~22 minuti. Gli altri eventi (19:22–19:28) sembrano
giusti. Le ore devono coincidere sempre con l'ora vera: chi gestisce le anomalie si basa su quelle.

## Compito
1. **Diagnosi** (sola lettura su `decobrands_db`, URL con grep, `.env` mai letto per intero): la riga del
   registro (tabella del registro unico, D-31): `creato_il`/data mostrata, eventuale `chiuso_il`, fuso
   (`timestamp` vs `timestamptz`), `dettaglio`. Chi scrive quell'evento (`lettura.non_raggiungibile`,
   cerca in `app/backend/src/`) e con quale ora: `now()` del db, `new Date()` di Node, un'ora presa
   dal server di lettura (GPU) o un orologio simulato/di prova («oggi» finto)? Quale data mostra la
   pagina (`VistaSistema.tsx` o la pagina del registro): creazione, ultimo aggiornamento, chiusura?
   Confronta `select now()` del db con l'ora di Node e del PC.
2. **Correzione alla radice**: ogni ora del registro viene da un'unica fonte (l'ora del server db o di
   Node, quella già usata dagli altri eventi), salvata con fuso, mostrata in ora italiana. Se l'ora viene
   da una macchina esterna o da un orologio di prova, non usarla mai per il registro. Se la pagina mostra
   l'ora di chiusura dove ci si aspetta quella di apertura, rendi chiaro quale è (es. colonna/scritta
   «chiusa alle …»).
3. Se la differenza nasce dall'orologio di una macchina (db o server) sballato, non correggere il codice:
   scrivilo nel resoconto con le misure.

## File ammessi
`app/backend/src/` tranne `proposta.ts`, `documenti.ts`, `motore/*`, `pratiche.ts`, `lettura.ts`,
`lettore.ts` (altri pacchetti in corso: se la correzione li richiede, scrivila nel resoconto e fermati);
`app/frontend/app/(app)/sistema/VistaSistema.tsx`; test in `app/backend/test/` nuovi o del registro.
Nessuna migrazione senza scriverlo nel resoconto (la applica Claude Code). Aggiungi, non riscrivere.

## Regole
Leggi prima `strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`. V12, V13. Prove su
`decobrands_test_ora` (creato e cancellato). Niente commit, 8001/8002, `cd`, `/tmp`, `&`, Integra.
Skill da caricare davvero: `owasp-security`, `ponytail-review`, `caveman` (+ `postgresql-code-review` se SQL).

## Resoconto
`strumenti/opencode/resoconto-ora-registro.md`: misure (ora PC, Node, db), causa, file toccati, prove,
«Da documentare».
