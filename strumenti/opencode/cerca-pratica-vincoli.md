# Pacchetto `cerca-pratica-vincoli`

## Contesto
Scheda del documento (`app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`), es. «Pagamento del 21/10/2026 ·
1.766,62 €», fornitore ARTE, cliente AGRI AGGIO. Riga «Oppure abbina a un'altra pratica di ARTE …» con il campo
di ricerca e la lente: oggi la ricerca filtra solo per **fornitore**.

Ugo (15/11/2026): i documenti sono **sempre vincolati** a cliente e fornitore: la ricerca delle pratiche (campo
e finestra della lente) deve filtrare per **cliente e fornitore** del documento.

## Compito
1. **Server (V12)**: `cerca` delle pratiche (`app/backend/src/pratiche.ts`, `CercaPratiche`) accetta anche
   `cliente_id` (validato, come `fornitore_id`); con entrambi filtra per tutti e due. Il browser manda solo gli id.
2. **Interfaccia**: il contesto della ricerca passa cliente e fornitore del documento (quelli scelti/abbinati
   nella testata). Testo della riga: «Oppure abbina a un'altra pratica di <cliente> con <fornitore>:». Nella
   finestra della lente un'indicazione dei vincoli (es. sotto il titolo «Pratiche di AGRI AGGIO … con ARTE …»).
   Se il cliente del documento manca, filtra solo per fornitore e dillo («cliente non ancora scelto»).
3. **Pagamento**: un pagamento paga una fattura, quindi lo stato proposto per la ricerca e per la tendina
   «Stato delle pratiche» del pagamento è **Fatturata** (oggi «Aperte» → «Nessuna pratica aperta da proporre»).
   Verifica `STATO_DAL_TIPO` e il filtro predefinito della proposta per tipo (`proposta.ts`, `filtro`):
   predefinito per tipo = ordine/proforma/conferma → Aperte; fattura → Aperte; nota di credito e pagamento →
   Fatturata. Il server sceglie il predefinito dal tipo se il browser non manda nulla.
4. **Testo sbagliato**: «Il codice — non corrisponde a nessun cliente di ARTE …» quando il codice cliente è vuoto
   (il pagamento non ce l'ha, e il cliente è già scelto). Con codice vuoto e cliente scelto: nessun messaggio;
   con codice vuoto e cliente non scelto: «Manca il codice cliente: scegli il cliente o la pratica a mano.»

## File ammessi
`pratiche.ts`, `proposta.ts`, test `pratiche.spec.ts`/`proposta.spec.ts`, `VistaDocumento.tsx`,
`componenti/CampoRicerca.tsx` (solo se serve mostrare i vincoli nella finestra, con parametro opzionale),
`lib/guida.ts`. **Non toccare** `motore/*`, seed, `bollettin*`, `liquidazioni*` (pacchetto `sconto-medio` in
corso). Aggiungi, non riscrivere.

## Regole
Leggi prima `strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`. V12. URL del db **solo con grep**,
`.env` mai letto con readFileSync o cat. Prove su `decobrands_test_cerca_vincoli` (creato e cancellato).
Niente commit, 8001/8002, `cd`, `/tmp`, `&`, Integra. Skill: `owasp-security`, `ponytail-review`, `caveman`.

## Prove (0 KO)
`npx tsc --noEmit` backend e frontend; jest: cerca con cliente+fornitore esclude le pratiche di altri clienti;
`cliente_id` non valido → 400; pagamento → predefinito Fatturata.

## Resoconto
`strumenti/opencode/resoconto-cerca-pratica-vincoli.md`: file, prove, «Da documentare».
