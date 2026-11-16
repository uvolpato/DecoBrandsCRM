# Le percentuali non si sommano: il fornitore paga solo la % di Decobrands (15/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità: **P0** — soldi: oggi il CRM calcola sbagliato quello che il fornitore deve a Decobrands.

Regole comuni: `regole-onda-parallela.md`. **Niente `cd`, niente `/tmp`, niente `&`, non leggere `.env`.** Prove solo su `decobrands_test_nonsomma` (crealo, migrazioni, seed, poi cancellalo). Mai `decobrands_db`, 8001/8002, Integra. Niente commit. In parallelo girano `codice-cliente-non-trovato` (`proposta.ts`, `documenti.ts`) e `pallini-link` (`VistaDocumento.tsx`, `CampoRicerca.tsx`): non toccarli; se ti servono, fermati e scrivilo.

## Decisione di Ugo (D-166, sostituisce la regola della spec §5.1 «atteso dal fornitore = provv_agente + provv_subagente»)
Esempio: «Da ARTE a Decobrands: 20% + 8%» è **sbagliato**. Le provvigioni **non si sommano**:
- `pct_agente` (oggi «A Decobrands %») è la **provvigione totale** che il fornitore riconosce a Decobrands (20 %);
- `pct_subagente` (8 %) è la parte che **Decobrands paga al subagente**, presa da quel 20 %;
- il **margine di Decobrands** è la differenza (20 − 8 = 12 %).
Quindi:
```
dal fornitore(d)   = d.importo × pct_agente / 100            (atteso nel bollettino)
al subagente(d)    = regole del subagente come oggi (§5.2, D-27) … → d.importo × pct_subagente / 100
margine(d)         = dal fornitore(d) − al subagente(d)
```
Vincolo nuovo: `pct_subagente ≤ pct_agente` in ogni scaglione (e la % personale delle eccezioni e dell'agenzia ≤ `pct_agente` dello scaglione): il server rifiuta altrimenti, con messaggio chiaro.

## Cosa fare
1. **Motore** (`app/backend/src/motore/motore.ts`): oggi `dal_fornitore: sc.pct_agente.plus(sc.pct_sub)` (~riga 136). Diventa `pct_agente`. Rivedi **ogni** uso di `dal_fornitore`, `provv_agente`, «atteso», margine/«a Decobrands» nel motore, nei bollettini (riconciliazione a cerniera: atteso = solo la % di Decobrands), nelle liquidazioni, nell'Analisi (colonne «a Decobrands», «margine»), nelle esportazioni, in `pratiche.ts` (riepilogo della pratica), `fornitori.ts`. Cerca anche i nomi senza `dal_fornitore` (somme di `pct_agente` e `pct_sub*`, `provv_agente + provv_subagente`). Fai l'elenco nel resoconto. La parte di Decobrands che oggi si chiama «provv_agente» deve diventare il **margine** dove si intende ciò che resta a Decobrands.
2. **Validazione**: rotte delle percentuali (`fornitori.ts`), delle eccezioni personali e delle agenzie (`clienti.ts` / dove sta `pct_subagente` dell'agenzia): `pct_subagente ≤ pct_agente`. Dati già salvati che violano il vincolo: non toccarli, elencali nel resoconto (query di sola lettura che lancerà Claude Code su `decobrands_db`).
3. **Interfaccia**:
   - finestra delle percentuali (`app/frontend/componenti/FormPercentuali.tsx`) e tabella in Fornitori (`VistaFornitori.tsx`, colonna «Totale» = `dal_fornitore`): etichette «Provvigione dal fornitore %» e «di cui al subagente %»; colonna **«Margine Decobrands»** = differenza al posto di «Totale»; testo dove si legge «a Decobrands: 20% + 8%» → «Da ARTE a Decobrands 20 %, di cui 8 % al subagente (margine 12 %)».
   - Pratica (`VistaPratica.tsx`) e ogni pagina che mostra «a Decobrands»/totali: allinea i nomi (dal fornitore, al subagente, margine).
   - `app/frontend/lib/guida.ts`: testi coerenti.
4. **Prototipo** (`prototipo-alternativo/assets/motore.js`, solo la regola, e le etichette in `viste-anagrafiche.js` se ci sono): stessa correzione, così i numeri del seed coincidono ancora con il prototipo (CLAUDE.md §6).
5. **Prove**: aggiorna le attese di jest (motore, bollettini, liquidazioni, analisi, pratiche, percentuali) **ricalcolandole a mano con la regola nuova** — scrivi nel resoconto per un caso (es. Gries sconto 0 %, 18/10, fattura 1.000 €) i numeri prima e dopo: dal fornitore 280 → 180, al subagente 100, margine 180 → 80. Prove nuove: vincolo `pct_subagente ≤ pct_agente` (rifiuto), atteso del bollettino = solo `pct_agente`.

## File ammessi
`app/backend/src/**` tranne `proposta.ts` e `documenti.ts` (se servono, fermati e scrivilo), `app/backend/test/**`, `app/backend/prisma/seed*` (solo se una percentuale del seed viola il vincolo: scrivilo), `app/frontend/**` tranne `VistaDocumento.tsx` e `CampoRicerca.tsx`, `prototipo-alternativo/assets/motore.js`, `prototipo-alternativo/assets/viste-*.js` (solo etichette), `strumenti/prove/app_*.py`, il resoconto. Vietati: schema e migrazioni (se serve un CHECK in database, scrivilo negli aperti), spec, piano (li fa il pacchetto di documentazione dopo).

## Fine
- `npx tsc --noEmit` backend e frontend; **tutte** le suite jest toccate, una per volta, su `decobrands_test_nonsomma`, 0 KO.
- Prove nel browser solo `py_compile` (il giro lo lancia Claude Code): aggiorna i numeri attesi nelle prove `app_*.py` che controllano importi di provvigioni.
- Skill da caricare davvero: `owasp-security`, `ponytail-review`, `caveman`, e `postgresql-code-review` se tocchi SQL.
- Resoconto `strumenti/opencode/resoconto-provvigione-non-somma.md`: elenco di ogni punto cambiato, numeri prima/dopo, query di sola lettura dei dati che violano il vincolo, **«Da documentare»** completo per la spec (§4.2.2 tabella e esempio Gries, §5.1 pseudocodice, §5.x bollettini, liquidazioni, Analisi, §19 D-166 con il perché: «il fornitore paga a Decobrands una sola provvigione; Decobrands ne gira una parte al subagente; il margine è la differenza»).
