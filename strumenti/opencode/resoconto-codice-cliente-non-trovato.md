# Resoconto — «Codice cliente 45172 non presente fra i clienti del fornitore» su un documento vero (P1, 15/11/2026)

**Esecutore: DeepSeek V4 pro.** Pacchetto `strumenti/opencode/codice-cliente-non-trovato.md`. Regole comuni rispettate: nessun `cd`/`/tmp`/`&`, `.env` mai letto (URL del database costruito con grep), solo letture su `decobrands_db`, prove su `decobrands_test_codice45172` (creato, migrazioni, poi cancellato), niente 8001/8002, niente Integra, niente commit.

## Causa vera

Documento proforma **PR102848** (`documenti_in_arrivo.id = 3`): `tipo = proforma`, `fornitore_id = 31` (ARTE WOHNACCESSORIES), campi `codice_cliente = 45172`, `cliente_id = 1` (scelto a mano, `verificato = true`), `piva_cliente = 04364290264`.

L'agenzia esiste: `interscambio.id = 2480` → `fornitore_id = 31`, `cliente_id = 1`, `codice_cliente_fornitore = 45172`, `valido_dal = 2000-01-01`, `da_confermare = false`.

La causa **non** è `da_confermare` (nell'anagrafica attuale è già `false`: l'agenzia risulta già usata, quindi la migrazione non l'ha marcata). La causa è in `proposta.ts`: quando il cliente è **scelto a mano** (`cliente_id` valorizzato), `propostaDocumento` salta `abbinamentoPerCodice` (`ab = clienteScelto ? null : …`, ex riga 553), quindi `proposta.abbinamento` resta `null`. Il controllo `codice_cliente` in `controlliFissi` (riga 692) segnalava allora «Codice cliente 45172 non presente fra i clienti del fornitore» anche se l'agenzia per quel codice esiste ed è proprio del cliente scelto. Le ipotesi alternative (fornitore letto vs scelto, spazi/zeri, data fuori, altra strada per il proforma) sono escluse: `fornitore_id` è quello scelto (31), il codice non ha spazi, la data 2026-04-08 è dentro la validità `[2000-01-01, ∞)`.

## Correzione

In `proposta.ts`:

- Estratta `agenziaPerCodice` (una query sola di `interscambio` per fornitore + codice validi alla data) che oltre al cliente riporta `da_confermare` e il nome del fornitore; `abbinamentoPerCodice` la riusa (nessuna query duplicata).
- Il controllo in `controlliFissi`, quando `proposta.abbinamento == null` e c'è un codice, rilegge l'agenzia e distingue:
  1. agenzia assente → «Codice cliente … non presente fra i clienti del fornitore» (grave, come prima);
  2. agenzia `da_confermare` → «Codice cliente …: agenzia dal vecchio CRM, da confermare» (non grave);
  3. agenzia del cliente scelto a mano → nessun rilievo;
  4. agenzia di un **altro** cliente → «Il codice … presso <fornitore> è di <cliente>» (grave).

La precedenza «da confermare» prima di «del cliente scelto» segue il caso: un'agenzia da confermare va comunque segnalata (non come «non presente»), non taciuta. `documenti.ts` non è stato toccato: il comportamento della proposta non cambia per i documenti senza cliente scelto.

## Prove

Su `decobrands_test_codice45172` (creato, `prisma migrate deploy`, poi cancellato):

- `npx tsc --noEmit` nel backend: pulito.
- jest, una suite per volta: `proposta.spec.ts` **63/63**, `riconoscimento-furbo.spec.ts` **13/13**, `documenti.spec.ts` **68/68**.
- Aggiunte in `proposta.spec.ts` (blocco `controlliFissi`), le tre che riproducono i casi richiesti: cliente scelto con agenzia per quel codice → nessun rilievo; agenzia da confermare → «da confermare» (e non «non presente»); codice di un altro cliente → «Il codice K-200 presso Gries GmbH & Co. KG è di Il Giardino di Sofia srl». Falliscono prima della correzione, passano dopo.
- Diagnosi rifatta in sola lettura su `decobrands_db` con il codice corretto: per PR102848 `controlliFissi` ora restituisce `[]` — il punto «Codice cliente 45172 non presente» **sparisce**.

## Review

Skill caricate davvero: `owasp-security`, `ponytail-review`, `caveman`. Rilievi veri: nessuno. `agenziaPerCodice` usa Prisma/query parametriche (nessuna iniezione); il testo dei controlli è composto sul server (nessun dato sensibile, nessun XSS); il confronto `BigInt(l.cliente_id)` avviene solo dopo il controllo `^\d+$`. `ponytail-review`: la query condivisa evita il doppione, i quattro rami del controllo sono i quattro messaggi distinti richiesti — niente da tagliare.

## Da documentare (§6.5 punto 5)

- Aggiornare la descrizione del controllo `codice_cliente` in **§6.5 punto 5**: oggi dice solo «codice cliente non presente fra i clienti del fornitore». Va precisato che, quando il cliente è scelto a mano, il controllo rilegge l'agenzia per quel codice e distingue: assente («non presente», grave), da confermare («agenzia dal vecchio CRM, da confermare», non grave), del cliente scelto (nessun rilievo), di un altro cliente («Il codice … presso <fornitore> è di <cliente>», grave).

## Aperto

- Nulla. La correzione è locale a `proposta.ts` e non tocca la proposta né il flusso di `documenti.ts`.
