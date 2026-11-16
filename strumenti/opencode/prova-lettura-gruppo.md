# Pacchetto `prova-lettura-gruppo`

`app/backend/test/lettura.spec.ts:206` fallisce per il campo `gruppo` mancante (D-176, vedi
`strumenti/opencode/resoconto-importo-riga-zero.md`, voce «Aperto»). Capisci se è la prova a essere vecchia
(D-176 ha cambiato la forma attesa) o il codice a essere sbagliato; correggi il lato sbagliato con il minimo.
Se è il codice (`lettura.ts`/`lettore.ts`), correggilo solo se il caso è chiaro, altrimenti scrivilo nel resoconto.

File ammessi: `app/backend/test/lettura.spec.ts`, `app/backend/src/lettura.ts`, `app/backend/src/lettore.ts`.
Regole: leggi prima `strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`. Prove su
`decobrands_test_lett_gruppo` (creato e cancellato). Niente commit, 8001/8002, `cd`, `/tmp`, `&`, Integra.
Skill: `ponytail-review`, `caveman`.
Prove: `npx tsc --noEmit` backend; jest `lettura.spec.ts` 0 KO.
Resoconto: `strumenti/opencode/resoconto-prova-lettura-gruppo.md`.
