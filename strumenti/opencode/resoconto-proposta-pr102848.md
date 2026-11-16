# Resoconto — Perché la proforma PR102848 non propone l'abbinamento alla pratica OF/2026/001 (P0, 15/11/2026)

**Esecutore: DeepSeek V4 pro.** Pacchetto `strumenti/opencode/proposta-pr102848.md`. Regole comuni rispettate: nessun `cd`/`/tmp`/`&`, `.env` mai letto (URL del database costruito con grep, mai stampato), solo letture su `decobrands_db`, prove su `decobrands_test_pr102848` (creato, migrazioni, poi cancellato), niente 8001/8002, niente Integra, niente commit, frontend mai toccato (gira in parallelo `azioni-riga` su `app/frontend/**`).

## Causa vera

Documento proforma **PR102848** (`documenti_in_arrivo.id = 3`): `tipo = proforma`, `fornitore_id = 31` (ARTE WOHNACCESSORIES, riconosciuto), `numero_ordine_fornitore = null`, campi `codice_cliente = 45172`, `cliente_id = 1` (scelto a mano), `piva_cliente = 04364290264`, data 2026-04-08. L'agenzia esiste: `interscambio.id = 2480` → fornitore 31, cliente 1, codice 45172, `valido_dal = 2000-01-01`, `da_confermare = false`. La pratica **OF/2026/001** (fornitore 31, cliente 1, stato `inviato` = attesa conferma, `numero_ordine_fornitore = null` su DB) è aperta.

La causa è in `proposta.ts`: il tipo **`proforma` era trattato come «non entra in una pratica»**. In `propostaDocumento` il ramo `if (l.tipo !== 'conferma' && l.tipo !== 'fattura' && l.tipo !== 'nota_credito')` (ex riga 716) restituiva `esito: 'nessuno'` con `candidati: []` appena il tipo è `proforma`, prima di cercare le pratiche aperte. Con `candidati` vuoto e `esito: 'nessuno'` il frontend (`VistaDocumento.tsx`, ramo non-ordine) mostrava i due messaggi: «Il codice 45172 non corrisponde a nessun cliente…» e «Nessuna pratica aperta…». In più, il filtro delle pratiche si applicava solo su `ab` (agenzia per codice), che resta `null` quando il cliente è scelto a mano (`ab = clienteScelto ? null : …`), quindi la coppia non filtrava. La spec non prevede un trattamento separato per la proforma: **§4.2.7.1 (D-60) — «proforma: solo tracciata; come la conferma fa avanzare la pratica»** e lo stato `confermato` scatta con «una conferma **o** una proforma».

## Correzione

In `proposta.ts` (nessun altro file di codice):

- `ENTRA_IN_PRATICA` (riga 456) ora include `'proforma'` (è come la conferma, D-60).
- Il ramo dei tipi che non entrano in pratica (riga 720) esclude solo `pagamento`/`altro`/tipo non letto: la `proforma` prosegue nella strada di conferma/fattura/nota.
- `clientePratica` (riga 678): il cliente certo (agenzia per codice, scelto a mano o vocabolario) filtra le pratiche della coppia. Il filtro del pool (riga 747) usa `clientePratica` al posto del solo `ab`, così il cliente scelto a mano non viene ignorato. Il riconosciuto per P.IVA/nome non filtra (resta il confronto per articoli di prima).
- Pool (riga 755): la proforma, come la conferma, esclude le pratiche che hanno già una conferma o una proforma (già confermate) e quelle fiscali.
- Esito (riga 796): con cliente certo (`clientePratica != null`) e un solo candidato l'esito è `certo`, come già per l'agenzia per codice.

## Prove

Su `decobrands_test_pr102848` (creato, `prisma migrate deploy`, poi cancellato):

- `npx tsc --noEmit` nel backend: pulito.
- jest, una suite per volta: `proposta.spec.ts` **65/65**, `numero-ordine-fornitore.spec.ts` **7/7**, `documenti.spec.ts` **68/68**, `riconoscimento-furbo.spec.ts` **13/13**.
- Aggiunte in `proposta.spec.ts` (blocco «proposta — proforma come conferma (D-60)»): la proforma con cliente scelto a mano e agenzia per il codice propone l'unica pratica aperta della coppia (`esito: 'certo'`, `candidati[0].pratica.numero = 'OF/2026/001'`, nessun rilievo `codice_cliente`); la proforma non è proposta a una pratica che ha già una proforma o una conferma. Falliscono prima della correzione, passano dopo.
- Modificato il test `proforma/pagamento/altro: mai manca_agenzia` → ora «pagamento/altro: mai manca_agenzia» (la proforma è uscita da quella strada).
- Diagnosi rifatta in sola lettura su `decobrands_db` con il codice corretto: PR102848 → `esito: 'certo'`, `candidati: [OF/2026/001]`, `cliente_riconosciuto` = AGRI AGGIO, nessun rilievo `codice_cliente`; resta solo il controllo non grave «Articolo 75584 assente fra le righe della pratica proposta». PR102813 resta `fornitore_da_scegliere` (il fornitore letto «ARTE WOHNACCESSOIRES GMBH & CO.KG» — con la grafia errata — non è riconosciuto: `fornitore_id = null`; questione a parte, non di questo pacchetto).

## Review

Skill caricate davvero: `owasp-security`, `ponytail-review`, `caveman`. Rilievi veri: nessuno. `clientePratica` è un `bigint` passato a Prisma (query parametriche, nessuna iniezione); nessun dato sensibile nei testi; nessuna nuova superficie di accesso. `ponytail-review`: il ramo `proforma` del pool è una riga che rispecchia la conferma, `clientePratica` sostituisce la variabile `clienteCerto` (ridondante) — niente da tagliare.

## Da documentare

- **§4.2.7.1** e lo stato della pratica (tabella §5.8): la proforma «come la conferma» ora vale anche nella **proposta di abbinamento** (non solo nell'avanzamento di stato). Aggiungere una riga *Perché* in §6.5: la proforma entra in una pratica come la conferma (D-60) e la proposta la abbina alle pratiche aperte della coppia cliente-fornitore.
- **§6.5 punto 5**: il controllo del codice cliente non cambia, ma chiarire che per la proforma (come per la conferma) la proposta cerca le pratiche aperte della coppia quando il cliente è scelto a mano o l'agenzia per codice esiste.

## Aperto

- **PR102813** (proforma, fornitore letto «ARTE WOHNACCESSOIRES …» con grafia errata → `fornitore_id = null`): resta `fornitore_da_scegliere`. Il riconoscimento del fornitore dal nome storpiato è una questione a parte (nome non risolto da `risolviFornitore`), non coperta da questo pacchetto.
- In `documenti-pratica.spec.ts` c'è **1 test già rotto prima di questo lavoro** («pratica nuova solo se il fornitore ha uno scaglione per lo sconto dell'agenzia (D-87)»): aspetta `/scaglione/` nel messaggio, ma `documenti.ts` (modificato da un'altra onda in corso) ora scrive «… non ha ancora le percentuali delle provvigioni valide …». Non è causato da questa correzione e non l'ho toccato.
