# `rilettura-mirata` — correzioni 1

Dopo la rilettura vera di PR102829 (id 11) e RE193612 (id 12), `npm run rilettura:mirata -- --prova` li segna ancora
«→ RILEGGI», anche se ora somma righe = importo (963,78) e hanno la riga di spesa. Il criterio «è uno dei tre documenti
di AU276950» è per nome: toglilo. Resta solo: somma righe ≠ importo (con tolleranza 0,01) e non congelato e senza
correzioni a mano. Rilanciato dopo la rilettura → «da rileggere: 0». Aggiorna `rilettura-mirata.spec.ts` (caso: riletto
e ora coerente → nessuna azione). File ammessi: `app/backend/src/rilettura-mirata.ts`, il suo test. Prove su
`decobrands_test_rilettura` con `DATABASE_URL` esplicito nella stessa riga (mai migrate su `decobrands_db`); poi verifica
con `--prova` su `decobrands_db` (sola lettura). Regole: `strumenti/opencode/regole-onda-parallela.md`. Niente commit,
`cd`, `/tmp`, `&`. Skill: `ponytail-review`, `caveman`. Aggiorna il resoconto. Riepilogo in 4 righe.
