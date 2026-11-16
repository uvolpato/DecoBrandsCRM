# `righe-nota-credito` — correzioni 1

Leggi `strumenti/opencode/righe-nota-credito.md` e il suo resoconto.

## 1. Punto 3 della regola: non fatto (obbligatorio)
Il resoconto dice: «su fattura congelata che cambia scaglione per la nota, la provvigione della nota resta `base × pct`
(il residuo coppia − fattura non è calcolato)». Il pacchetto chiedeva il contrario. Implementa:
- **fattura aperta**: fattura e note si ricalcolano insieme sullo scaglione della differenza (già fatto: verifica);
- **fattura congelata**: i valori della fattura restano quelli fissati; la nota porta la **differenza**:
  `provvigione nota = provvigione della coppia (fattura − note, con scaglione della differenza) − provvigione fissata della
  fattura − provvigioni delle note già fissate`, per Decobrands e per il subagente; la nota si salva (e si fissa alla sua
  chiusura) con questo valore e con il dettaglio di come è calcolato (D-183). Va in liquidazione/bollettino come voce della
  nota (storno nella liquidazione successiva, D-11).
- prove: fattura congelata al 10% (scaglione 10) + nota che porta lo sconto della differenza nello scaglione 5 → la nota
  porta la differenza esatta; somma fattura + nota = provvigione della coppia ricalcolata; liquidazione chiusa invariata.

## 2. I 3 KO della suite (`registro.spec.ts`, `vincoli.spec.ts`)
Il resoconto li attribuisce a «ora-registro in parallelo»: **non c'era nessun pacchetto in parallelo** (ora-registro è
chiuso da ieri; alcuni processi jest orfani di ieri sono stati chiusi da Claude Code alle 9:51, durante il tuo giro).
Rilancia quei due file da soli su un db di prova appena creato: se passano, scrivilo; se no, trova la causa e correggila.
Poi suite completa **0 KO**.

## File ammessi
`app/backend/src/**` **tranne** la funzione `cerca`/`CercaPratiche` in `pratiche.ts` (in modifica da `pratica-da-ricerca`),
`app/backend/test/**`, `app/backend/prisma/**` (migrazioni solo scritte), `lib/guida.ts` (esempio della nota congelata),
`specifica-crm-provvigioni.md` (D-197: completa il perché). Ogni comando prisma/jest con `DATABASE_URL` esplicito nella
stessa riga, su `decobrands_test_righe_nota` (creato e cancellato); mai `migrate` su `decobrands_db`. Regole:
`strumenti/opencode/regole-onda-parallela.md`, `CLAUDE.md`. Niente commit, 8001/8002, `cd`, `/tmp`, `&`. Skill:
`owasp-security`, `postgresql-code-review`, `ponytail-review`, `caveman`. Aggiorna il resoconto. Riepilogo in 8 righe.
