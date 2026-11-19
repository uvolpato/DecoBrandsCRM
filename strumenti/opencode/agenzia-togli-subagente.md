# Pacchetto `agenzia-togli-subagente`

Miglioria dalla revisione 0.2.12 (`strumenti/opencode/resoconto-revisione-0-2-12.md`, rilievo 2): nella **modifica**
di un'agenzia non si può togliere il subagente. `app/frontend/componenti/FormAgenzia.tsx` ~183 manda `subagente_id` solo
se valorizzato, quindi svuotare il campo non cambia niente.

## Regola (D-205)
Togliere il subagente da un'agenzia vale **da una data**, come ogni cambio di agenzia (D-35): dal giorno scelto i
documenti sono tutti di Decobrands; prima restano del subagente. Il frontend manda `subagente_id: null` esplicito quando
il campo è svuotato; il server lo distingue da «campo non mandato» (non cambiare), applica le stesse regole di
`creaAgenzia` (niente `pct_subagente`/`regola_mensile` senza subagente), nella stessa transazione e con l'evento nel
registro, come gli altri cambi dell'agenzia. Niente ricalcolo diverso da quello che il cambio di agenzia fa già.

## Prove
jest (su un tuo `decobrands_test_toglisub`, crea e cancella): agenzia con subagente → modifica con `subagente_id: null`
dalla data X → documenti prima di X al subagente, dopo X tutti a Decobrands; campo non mandato → invariato; null con
`pct_subagente` → 400. Suite `clienti`, `agenzia-senza-subagente`, `liquidazioni` 0 KO; `tsc` backend e frontend.
Prova nel browser: aggiungi un controllo a `strumenti/prove/app_clienti.py` (solo `py_compile`).

## File ammessi
`app/backend/src/clienti.ts`, `app/backend/test/**`, `app/frontend/componenti/FormAgenzia.tsx`, `strumenti/prove/app_clienti.py`.
**Non** toccare `app/frontend/app/**` né `stile.css` (altri pacchetti ci lavorano in parallelo).

## Regole
`strumenti/opencode/regole-onda-parallela.md` (niente script fuori da jest che toccano il db) e `CLAUDE.md`. V12, V13, D-35,
D-205. Niente commit, `cd`, `/tmp`, `&`, `.env` letto, porte 8001/8002/8012/8071 (non lanciare prove nel browser).
Skill: `owasp-security`, `ponytail-review`, `caveman`. Resoconto `strumenti/opencode/resoconto-agenzia-togli-subagente.md`.
Riepilogo in 5 righe.
