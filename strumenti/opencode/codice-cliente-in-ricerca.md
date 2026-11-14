# Ricerca del cliente con il codice cliente del fornitore (14/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità: **P1**. Prima leggi `resoconto-cliente-scelto.md` (stesso file, appena modificato).

Regole comuni: `regole-onda-parallela.md`. **Niente `cd`, niente `/tmp`, niente `&`, non leggere `.env`.** Prove solo su `decobrands_test_codcli` (crealo, migrazioni, poi cancellalo). Mai `decobrands_db`, mai porte 8001/8002, Integra mai. Niente commit.

## Cosa chiede Ugo
Nella ricerca del **cliente** (menu e maschera della lente, `CampoRicerca` con l'entità `cliente` di `app/frontend/lib/entita.ts`) serve la colonna **codice cliente presso il fornitore** (`interscambio.codice_cliente_fornitore`, l'agenzia cliente–fornitore): è il codice che deve coincidere con il campo «Codice cliente» letto dal documento.

## Cosa fare
1. **Server (V12)**: quando la ricerca del cliente ha nel contesto un `fornitore_id`, le voci portano anche `codice_fornitore` = codice cliente presso quel fornitore (agenzia valida oggi, o l'ultima). Usa la rotta clienti già esistente con un parametro (`GET /api/clienti?fornitore_id=…`) o quella che già serve a questo; una query sola (join su `interscambio`), niente N+1. Permessi come la rotta attuale.
2. **Frontend**:
   - entità `cliente`: con `contesto.fornitore_id` le voci si caricano con quel parametro; colonna **«Cod. cliente»** nella maschera, codice anche nel dettaglio della voce del menu (`Cod. 45172 · P.IVA …`); la ricerca trova anche per codice (`cerca` include il codice).
   - Se il contesto ha anche `codice_cliente` (quello letto), la voce col codice uguale va **prima** e porta un segno «coincide con il codice letto».
   - In *Correggi i dati letti* (`VistaDocumento.tsx`) la ricerca Cliente riceve `contesto={{ fornitore_id: b.testata.fornitore_id, codice_cliente: b.testata.codice_cliente }}`; lo stesso nella modale *Apri la pratica* con il fornitore scelto lì. Senza fornitore la colonna non c'è (resta com'è oggi).
   - La cache delle voci (`useVoci`) deve distinguere il contesto (fornitore diverso → voci diverse).
3. Senza agenzia per quel fornitore la cella è vuota.

## File ammessi
`app/frontend/lib/entita.ts`, `app/frontend/componenti/CampoRicerca.tsx`, `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`, `app/backend/src/clienti.ts` (o il file della rotta clienti), il suo spec in `app/backend/test/`, `app/frontend/lib/guida.ts`, `strumenti/prove/app_documenti.py`, il resoconto. Vietati: schema, migrazioni, seed, spec, piano.

## Fine
- `npx tsc --noEmit` backend e frontend; jest della suite clienti toccata su `decobrands_test_codcli` (con e senza `fornitore_id`, permessi).
- `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e` e `bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_documenti app_clienti` (timeout 10 min), 0 KO; aggiungi un controllo: con fornitore scelto il menu cliente mostra il codice.
- Skill da caricare davvero: `owasp-security`, `postgresql-code-review`, `ponytail-review`, `caveman`.
- Resoconto `strumenti/opencode/resoconto-codice-cliente-in-ricerca.md` con «Da documentare» (§7.9, §16.4.1, §19).
