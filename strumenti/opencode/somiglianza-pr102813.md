# PR102813: perché la somiglianza non riconosce il fornitore ARTE (15/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità: P1. Diagnosi su dati veri + correzione.

Prima leggi `resoconto-riconoscimento-furbo.md` e `resoconto-proposta-pr102848.md`. Regole comuni: `regole-onda-parallela.md`. **Niente `cd`, niente `/tmp`, niente `&`, non leggere `.env`.** Su `decobrands_db` solo letture; prove su `decobrands_test_pr102813` (crealo, migrazioni, poi cancellalo). Mai 8001/8002, Integra. Niente commit. In parallelo girano pacchetti solo frontend: **non toccare `app/frontend/**`**.

## Caso
PR102813 (proforma, 02/03/2026, 2.117,30 €) ha fornitore letto «ARTE WOHNACCESSOIRES…» e resta `fornitore_da_scegliere` (`fornitore_id` null). In anagrafica c'è «ARTE WOHNACCESSORIES GMBH & CO.KG» (fornitore 31), e anche «Arte 2». La somiglianza `pg_trgm` (soglia 0,6, distacco 0,2, D-164) avrebbe dovuto riconoscerlo. Inoltre PR102848 (stesso nome letto) ha fornitore riconosciuto solo perché Ugo l'ha scelto a mano: il vocabolario (`alias_letti`) avrebbe dovuto riconoscere PR102813 dallo stesso nome letto.

## Da fare
1. Sola lettura su `decobrands_db`: il nome letto esatto di PR102813 e di PR102848 (normalizzato come fa `proposta.ts`), le righe di `alias_letti`, e il valore di `similarity(...)` fra il nome letto e i fornitori (ARTE, Arte 2, altri primi 5) come lo calcola la query di `proposta.ts`. Scrivi i numeri nel resoconto.
2. Cause probabili: le sigle societarie non tolte (nel resoconto della 0.2.6 è un aperto: «somiglianza senza togliere le sigle»), «Arte 2» troppo vicino (distacco < 0,2), il vocabolario non salvato quando la scelta del fornitore avviene in *Correggi i dati letti* (solo in `scegli`?), o la normalizzazione diversa fra salvataggio e ricerca.
3. Correggi: togli le sigle societarie da entrambi i lati prima di `similarity` (stessa funzione `senzaSigle` già presente); il vocabolario si salva per **ogni** scelta a mano di fornitore o cliente (Correggi, Apri la pratica, scegli) con la stessa normalizzazione usata in ricerca; con due candidati vicini (ARTE e Arte 2) → «da scegliere» con i punteggi (mai a caso). Somiglianza anche per il **cliente** (aperto della 0.2.6), con le stesse regole.
4. Prove jest: «ARTE WOHNACCESSOIRES GMBH & CO.KG» → ARTE (31) anche con «Arte 2» in anagrafica, oppure da scegliere se il distacco non basta (scrivi quale e perché); vocabolario salvato da Correggi → documento successivo riconosciuto; somiglianza cliente. Rilancia la diagnosi su `decobrands_db`: esito nuovo per PR102813.

## File ammessi
`app/backend/src/proposta.ts`, `app/backend/src/documenti.ts`, `app/backend/test/riconoscimento-furbo.spec.ts`, `app/backend/test/proposta.spec.ts`, script di sola lettura in `strumenti/collaudo/e2e/uscita/`, il resoconto `strumenti/opencode/resoconto-somiglianza-pr102813.md`.

## Fine
- `npx tsc --noEmit` nel backend; jest delle suite toccate, una per volta.
- Skill: `owasp-security`, `postgresql-code-review`, `ponytail-review`, `caveman`.
