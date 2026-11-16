# Resoconto — PR102813: la somiglianza non riconosce il fornitore ARTE (P1, 15/11/2026)

**Esecutore: DeepSeek V4 pro.** Pacchetto `strumenti/opencode/somiglianza-pr102813.md`. Regole rispettate: niente `cd`/`/tmp`/`&`, `.env` mai letto (URL costruito con grep, mai stampato), solo letture su `decobrands_db`, prove su `decobrands_test_pr102813` (creato, migrazioni, poi cancellato), niente 8001/8002, niente Integra, niente commit, frontend mai toccato.

## Diagnosi (sola lettura su `decobrands_db`)

- **PR102813** (`documenti_in_arrivo.id = 2`, proforma 02/03/2026): `fornitore` letto `ARTE WOHNACCESSOIRES GMBH & CO.KG`, `fornitore_id = null`, `stato = da_controllare`.
- **PR102848** (id = 3, proforma 08/04/2026): stesso nome letto, `fornitore_id = 31`, `stato = da_controllare`.
- **`alias_letti`** già presente (creato 15/11 07:46, quando Ugo ha scelto a mano il fornitore di PR102848): `fornitore "arte wohnaccessoires gmbh co kg" → ruolo_id 31` e `cliente "agri aggio srl" → 1`. Il vocabolario era già salvato.
- **`similarity()`** (come la calcola `fornitoriSimili`, su `t = "arte wohnaccessoires gmbh co kg"`): ARTE WOHNACCESSORIES GMBH & CO.KG (31) = **0,7778**, GRIES = 0,1957, **Arte 2 = 0,1471**, distacco 0,58. Senza sigle: `"arte wohnaccessoires"` vs `"arte wohnaccessories"` = **0,68**, vs `"arte 2"` = 0,217.

## Causa vera

Il fornitore **non si ri-risolve all'apertura**: `risolviFornitore` (vocabolario + somiglianza, D-164) gira solo al salvataggio della lettura (`lettura.ts`), non in `propostaDocumento`/`dettaglioDocumento`. PR102813 era stato letto **prima** del riconoscimento furbo, quindi `fornitore_id = null` restava persistito e a ogni riapertura la proposta mostrava «da scegliere» senza mai ripassare da vocabolario/somiglianza. Le ipotesi del pacchetto sono smentite dai dati: **Arte 2 non è vicina** (0,147, non < 0,2) e **il vocabolario è già salvato in ogni scelta a mano** (scegli, Correggi, abbina, `imparaAlias`), con la stessa normalizzazione della ricerca.

## Correzioni (`proposta.ts`, `documenti.ts`)

- **Ri-risoluzione del fornitore a ogni apertura**: `propostaDocumento` e `dettaglioDocumento` chiamano `risolviFornitore` quando `fornitore_id` è null (vocabolario prima, poi somiglianza). PR102813 ora riconosce ARTE senza rileggere il file; `dettaglioDocumento` riempie anche `fornitore`/`testata.fornitore_id`/scaglioni nella risposta.
- **Somiglianza senza sigle societarie** da entrambi i lati (aperto 0.2.6): `NOME_NETTO` in SQL toglie le stesse sigle di `senzaSigle` (parole intere, per non confondere «co» dentro «company»), per fornitori e clienti.
- **Somiglianza anche per il cliente** (aperto 0.2.6, stesse regole): riconoscimento (`clientePerSomiglianza`, un solo candidato o distacco ≥ 0,2) e candidati con punteggio in `clienteDaIntegra`; più candidati vicini → «da scegliere», mai a caso.
- **`unicoPerDistacco`** estrae la regola «un solo candidato o il primo distaccato» condivisa da fornitore e cliente (snellisce `risolviFornitore`).

## Prove

Su `decobrands_test_pr102813` (poi cancellato):

- `npx tsc --noEmit` nel backend: pulito.
- jest, una suite per volta: `riconoscimento-furbo.spec.ts` **18/18**, `proposta.spec.ts` **65/65**, `documenti.spec.ts` **68/68**.
- Test nuovi in `riconoscimento-furbo.spec.ts`: ARTE riconosciuta con «Arte 2» in anagrafica; la proposta ri-risolve il fornitore già letto (`fornitore_id` null) invece di «da scegliere»; vocabolario salvato da Correggi → documento successivo riconosciuto; somiglianza cliente (riconoscimento e «da scegliere» con punteggio). Aggiornato il test «due fornitori simili» (ora usa una terza grafia equidistante, perché il nome uguale a uno dei due si risolve).
- **Diagnosi nuova su `decobrands_db`** (codice compilato in `dist-prove`): PR102813 → `esito: "certo"`, `candidati: ["OF/2026/001"]`, `abbinamento: cliente 1 AGRI AGGIO SNC DI AGGIO MAURO & C.`, `candidati_fornitore: 0`. PR102848 → `esito: "certo"`, `OF/2026/001`.

## Controlli (skill caricate davvero)

- `owasp-security`: nessuna iniezione. `NOME_NETTO` usa `Prisma.raw` solo con nomi di colonna costanti e la lista sigle (costanti); l'input `t` resta parametrizzato (`${t}`), mai nel raw. Rotte di sola lettura (dettaglio) non scrivono.
- `postgresql-code-review`: `similarity` sulla trasformazione `lower(regexp_replace(...))` non usa l'indice gin_trgm (già noto: poche decine di versioni correnti, accettabile). La rimozione delle sigle usa parole intere `(^| )(…)(?= |$)`, non il prefisso «co» di «company».
- `ponytail-review`: lean. `unicoPerDistacco`/`NOME_NETTO`/`clientiSimili` sono riusati, non astrazioni; nessun ramo speculativo. `net: 0`.

## Da documentare (per Ugo / il lead)

- **§19 D-164**: il fornitore si ri-risolve a ogni apertura (proposta e dettaglio), la somiglianza ora toglie le sigle societarie da entrambi i lati e vale anche per il **cliente** (chiude l'aperto 0.2.6 «somiglianza solo per il fornitore»).
- **Aperti** (ereditati, non di questo pacchetto): il master `soggetti.piva` non viene allineato quando si salva la P.IVA del ruolo dal documento; le pillole dell'elenco Documenti (`mancaAgenziaRighe`) non consultano vocabolario e somiglianza del cliente.
