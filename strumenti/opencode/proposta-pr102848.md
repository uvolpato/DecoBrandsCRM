# PR102848: perché non propone l'abbinamento alla pratica OF/2026/001 (15/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità: **P0** (Ugo è bloccato: è il caso base del flusso). Diagnosi su dati veri + correzione.

Regole comuni: `regole-onda-parallela.md`. **Niente `cd`, niente `/tmp`, niente `&`, non leggere `.env`** (URL del database con grep, mai stampato). Su `decobrands_db` **solo letture**; prove su `decobrands_test_pr102848` (crealo, migrazioni, poi cancellalo). Mai 8001/8002, Integra. Niente commit. In parallelo gira `azioni-riga` (solo `app/frontend/**`): **non toccare il frontend**; se serve, scrivilo negli aperti.

## Caso
Documento proforma **PR102848** (08/04/2026, 37,20 €), fornitore ARTE (fornitore_id 31) riconosciuto, codice cliente letto 45172, cliente scelto a mano AGRI AGGIO (cliente_id 1), agenzia 2480 ARTE–Agri Aggio codice 45172 valida dal 2000-01-01. Esiste la pratica **OF/2026/001** (AGRI AGGIO · ARTE, ordine AU276839 del 17/02/2026, stato «Conferma in ritardo», attesa conferma). Il backend sulla 8002 è aggiornato con tutti i pacchetti fino a `numero-ordine-fornitore`.
Nel dettaglio del documento Ugo vede ancora:
- «Il codice 45172 non corrisponde a nessun cliente di ARTE WOHNACCESSORIES GMBH & CO.KG. Scegli la pratica a mano oppure correggi il codice.»
- «Nessuna pratica aperta di ARTE WOHNACCESSORIES GMBH & CO.KG a cui abbinarlo.»
Atteso: la proposta di abbinare la proforma alla pratica OF/2026/001 (stesso fornitore, stesso cliente, agenzia valida; con il numero d'ordine AU276839 se il documento lo ha, altrimenti per cliente + fornitore).

## Da fare
1. **Riproduci in sola lettura** su `decobrands_db`: chiama `propostaDocumento` / `dettaglioDocumento` per PR102848 con il codice attuale (script ts-node o `dist`), stampa l'esito (`esito`, `abbinamento`, `candidati`, `pratiche`, `controlli`) e i dati in ingresso (`Letto`: tipo, data, fornitore_id, cliente_id, codice_cliente). Scrivi nel resoconto **dove** si perde: `abbinamentoPerCodice`/`agenziaPerCodice` (fornitore usato, codice con spazi, data), la ricerca delle pratiche aperte (filtro di stato: «conferma in ritardo» è considerata aperta? filtro per cliente con `ab` null?), il tipo `proforma` (segue la strada di conferma/ordine?), il `cliente_id` scelto a mano ignorato.
2. **Correggi la causa** (non il testo): con fornitore riconosciuto e cliente scelto/agenzia per codice il documento deve proporre le pratiche aperte di quella coppia; la proforma deve poter essere abbinata come una conferma (verifica nella spec §6.5/§7.9 come va trattata la proforma; se la spec non la prevede, trattala come la conferma e scrivilo negli aperti per Ugo). I due messaggi non devono comparire in questo caso.
3. **Prova jest** che riproduce il caso esatto (proforma, cliente scelto a mano, agenzia valida da 2000, pratica in attesa conferma): fallisce prima, passa dopo. Rilancia la diagnosi su `decobrands_db` e scrivi l'esito nuovo per PR102848 (e PR102813).

## File ammessi
`app/backend/src/proposta.ts`, `app/backend/src/documenti.ts`, `app/backend/test/**` (solo le suite di proposta/documenti/numero-ordine/riconoscimento), script di sola lettura in `strumenti/collaudo/e2e/uscita/` (non committati), il resoconto `strumenti/opencode/resoconto-proposta-pr102848.md`.

## Fine
- `npx tsc --noEmit` nel backend; jest delle suite toccate, una per volta.
- Skill da caricare davvero: `owasp-security`, `ponytail-review`, `caveman`.
- Resoconto: causa con le righe di codice, correzione, prove, esito per PR102848/PR102813, «Da documentare».
