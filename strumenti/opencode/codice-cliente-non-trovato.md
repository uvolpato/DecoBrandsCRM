# «Codice cliente 45172 non presente fra i clienti del fornitore» su un documento vero (15/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità: **P1** (Ugo è nel giro con i documenti veri). Diagnosi e correzione.

Regole comuni: `regole-onda-parallela.md`. **Niente `cd`, niente `/tmp`, niente `&`, non leggere `.env`** (URL del database costruito con grep come nelle regole, mai stampato). Su `decobrands_db` **solo letture** per la diagnosi; prove su `decobrands_test_codice45172` (crealo, migrazioni, poi cancellalo). Mai 8001/8002, Integra mai. Niente commit.

## Caso (Ugo)
Documento proforma **PR102848** del 08/04/2026, letto prima della 0.2.6 (senza associazione). In *Correggi i dati letti*: Cliente letto «Agri Aggio srl», Cliente scelto «AGRI AGGIO SNC DI AGGIO …» (pallino verde), Codice cliente 45172, P.IVA cliente 04364290264 ✓; Fornitore letto «ARTE WOHNACCESSOIRES», Fornitore scelto «ARTE WOHNACCESSORIES GMB…» (verde). Il riepilogo dice «1 punto da controllare: **Codice cliente 45172 non presente fra i clienti del fornitore**». Eppure l'agenzia ARTE–Agri Aggio con codice 45172 esiste (importata dal vecchio CRM, `valido_dal` 2000-01-01, `da_confermare = true`, D-158/D-159) e lo stesso cliente ha già un ordine associato.

Il controllo è in `app/backend/src/proposta.ts` ~riga 692: `if (f && l.codice_cliente && proposta.abbinamento == null)`; l'abbinamento viene da `abbinamentoPerCodice` (~riga 250: `interscambio` per `fornitore_id`, codice, validità alla data).

## Da fare
1. **Diagnosi** con letture su `decobrands_db`: il documento PR102848 (tabelle `documenti_in_arrivo`, `documenti_campi` — guarda lo schema per i nomi delle colonne), i campi `fornitore_id`/`cliente_id` salvati, la riga `interscambio` con codice 45172 (fornitore, cliente, validità, `da_confermare`), e cosa ricava `propostaDocumento` per quel documento (puoi chiamare la funzione in uno script ts-node in sola lettura). Scrivi la causa vera nel resoconto. Ipotesi da verificare: `abbinamentoPerCodice` scarta le agenzie `da_confermare`; il `fornitore_id` usato è quello letto e non quello scelto; il codice salvato ha spazi o zeri; il proforma ha una data che cade fuori; il tipo «proforma» segue un'altra strada.
2. **Correzione** della causa (non del sintomo). Se il cliente scelto a mano ha un'agenzia con quel fornitore e quel codice, il controllo non deve segnalare nulla; se il codice è di un **altro** cliente il testo deve dirlo («Il codice 45172 presso ARTE è di <cliente>»); se l'agenzia è da confermare il testo deve dirlo e non dire «non presente».
3. Prova jest che riproduce il caso (documento con fornitore e cliente scelti a mano, agenzia da confermare con quel codice) prima della correzione: deve fallire prima e passare dopo.

## File ammessi
`app/backend/src/proposta.ts`, `app/backend/src/documenti.ts`, `app/backend/test/proposta.spec.ts`, `app/backend/test/riconoscimento-furbo.spec.ts`, `app/backend/test/documenti.spec.ts`, script di sola lettura in `strumenti/collaudo/e2e/uscita/` (non committati), il resoconto `strumenti/opencode/resoconto-codice-cliente-non-trovato.md`.

## Fine
- `npx tsc --noEmit` nel backend; jest delle suite toccate, una per volta, su `decobrands_test_codice45172`.
- Rifai la diagnosi in sola lettura su `decobrands_db` con il codice corretto (compilato in `dist-prove` o con ts-node) e scrivi che il punto sparisce per PR102848.
- Skill da caricare davvero: `owasp-security`, `ponytail-review`, `caveman`.
- Resoconto con causa, correzione, prove, «Da documentare» (§6.5).
