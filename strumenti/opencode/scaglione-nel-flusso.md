# Scaglione mancante: configurarlo dentro Apri la pratica (14/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità: **P1** (Ugo è fermo nel giro con i documenti veri). Percentuali delle provvigioni: lavoro sensibile.

Regole comuni: `regole-onda-parallela.md`. **Niente `cd`, niente `/tmp`, niente `&`, non leggere `.env`.** Prove solo su `decobrands_test_scaglione` (crealo, migrazioni, poi cancellalo). Mai `decobrands_db`, mai 8001/8002, Integra mai. Niente commit. Nell'albero ci sono modifiche non committate del pacchetto `ricerca-numeri-rossi` (stessi file frontend): non perderle.

## Problema (Ugo)
In *Apri la pratica* (ARTE WOHNACCESSORIES, ordine 17/02/2026, agenzia confermata con sconto 0 %) esce «Il fornitore non ha uno scaglione per lo sconto 0% alla data dell'ordine: configuralo in Fornitori» (`app/backend/src/documenti.ts` ~riga 1562, D-87). Ugo vuole configurarlo **lì**, come per l'agenzia (pacchetti `agenzia-nel-flusso`, `agenzia-da-confermare`: riquadro con pulsante che apre la finestra già esistente e poi riprova).

## Cosa fare
1. **Server**: il 409 dello scaglione mancante porta un codice (es. `scaglione_mancante`) e i dati che servono alla finestra: `fornitore_id`, nome del fornitore, sconto dell'agenzia, data dell'ordine, e se il fornitore ha già versioni di percentuali (per sapere se proporre «Configura gli scaglioni» o «Nuove percentuali»). Messaggio nuovo, più chiaro, per esempio: «ARTE WOHNACCESSORIES non ha ancora le percentuali delle provvigioni valide al 17/02/2026 (sconto 0 %): senza, la provvigione sarebbe zero.» Stesso stile del 409 `agenzia_da_confermare`.
2. **Componente condiviso**: la finestra delle percentuali/scaglioni oggi è dentro `app/frontend/app/(app)/fornitori/VistaFornitori.tsx` (righe ~195–265: `nuovePercentuali`, salvataggio su `fornitori/:id/percentuali`, controlli). Spostala in un componente `app/frontend/componenti/FormPercentuali.tsx` (stesso comportamento, stesse rotte, stessi controlli del server: nessuna logica nuova) e usala sia in Fornitori sia in *Apri la pratica*. In Fornitori non deve cambiare nulla di visibile.
3. **Apri la pratica** (`VistaDocumento.tsx`, `ApriPratica`): al 409 `scaglione_mancante` riquadro con il messaggio e pulsante **«Configura le percentuali»** che apre `FormPercentuali` sopra la modale, con il fornitore fisso e «Valido dal» proposto alla data dell'ordine (o prima, mai dopo); al salvataggio riprova ad aprire la pratica. Senza il permesso delle percentuali del fornitore: pulsante spento con il motivo nel `title`.
4. Vedi se lo stesso messaggio compare altrove (abbinamento di conferme/fatture, bollettino): stesso trattamento se è lo stesso 409, altrimenti scrivilo negli aperti.

## File ammessi
`app/backend/src/documenti.ts`, `app/backend/test/documenti.spec.ts`, `app/frontend/componenti/FormPercentuali.tsx` (nuovo), `app/frontend/app/(app)/fornitori/VistaFornitori.tsx`, `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`, `app/frontend/lib/guida.ts`, `strumenti/prove/app_documenti.py`, `strumenti/prove/app_fornitori.py`, il resoconto. Vietati: schema, migrazioni, seed, motore, spec, piano.

## Fine
- `npx tsc --noEmit` backend e frontend; jest `documenti.spec.ts` su `decobrands_test_scaglione` (409 con codice e dati).
- `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e` e `bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_documenti app_fornitori app_pratica` (timeout 10 min), 0 KO; controllo nuovo con rotte simulate: 409 `scaglione_mancante` → «Configura le percentuali» → salva → la pratica si apre. Limite di 10 accessi per utente (D-41).
- Skill da caricare davvero: `owasp-security`, `ponytail-review`, `vercel-composition-patterns`, `caveman`.
- Resoconto `strumenti/opencode/resoconto-scaglione-nel-flusso.md` con «Da documentare» (§7.9, §16.4 componente nuovo, §19 D-162).
