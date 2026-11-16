# Pacchetto `sconto-pratica-002`

## Contesto
Ugo (15/11/2026): nella pratica **OF/2026/002** (AGRI AGGIO · ARTE WOHNACCESSORIES, ordini AU278665 e
AU278666, proforma PR102920, poi fattura) c'è uno **sconto del 10%** che la gestione delle provvigioni
**non rileva**: la provvigione è calcolata come se lo sconto non ci fosse.

Pacchetti precedenti sullo sconto: `strumenti/opencode/resoconto-sconto-riga.md`,
`resoconto-sconto-da-grezza.md`, `resoconto-importo-calcolato.md` (leggili prima).

## Compito
1. **Diagnosi** (sola lettura su `decobrands_db`, URL con grep, `.env` mai letto per intero): dove sta lo
   sconto del 10% nei documenti della pratica (sconto di riga, sconto in fondo al documento/sconto
   totale, sconto cassa, colonna letta o solo nella `lettura_grezza`)? Lo legge GLM-OCR? Finisce nei campi
   del documento? Il calcolo della provvigione (`app/backend/src/motore/motore.ts`, `proposta.ts`,
   `pratiche.ts`) lo usa? Su quale base si calcola la provvigione: imponibile scontato (quello giusto,
   verificalo nella spec `specifica-crm-provvigioni.md`) o lordo?
2. **Correzione alla radice** nel punto unico del calcolo: la provvigione si calcola sull'importo al netto
   dello sconto, sul server (V12), con una transazione se scrivi più tabelle (V13). Riusa
   `importoRigaLetta`/`fattoreSconto` se pertinenti. Se lo sconto è a piè di documento, va gestito anche
   quello (proporzionale sulle righe o sul totale: scegli quello coerente con la spec e motivalo).
3. **Vincolo file**: `proposta.ts`, `documenti.ts`, `VistaDocumento.tsx`, `CampoRicerca.tsx` sono in
   modifica da un altro pacchetto in corso: **non toccarli**. Se la correzione li richiede, scrivila nel
   resoconto (file, righe, codice) e fermati lì.
4. Non rileggere né modificare i documenti sul db vero: scrivi a Ugo cosa fare dall'interfaccia
   (rileggi / correggi) per sistemare la 002 dopo la correzione.

## File ammessi
`app/backend/src/motore/*.ts`, `pratiche.ts`, `lettura.ts`, `lettore.ts`, test in `app/backend/test/`
(`motore.spec.ts`, `pratiche.spec.ts`, `documenti-lettura.spec.ts`). Aggiungi, non riscrivere.

## Regole
Leggi prima `strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`. V12, V13, rimandi `// D-nn §19`.
Prove su `decobrands_test_sconto002` (creato e cancellato). Niente commit, 8001/8002, `cd`, `/tmp`, `&`,
Integra. Skill da caricare davvero: `owasp-security`, `ponytail-review`, `caveman`.

## Prove (0 KO)
`npx tsc --noEmit` backend; jest: pratica con righe scontate del 10% (e, se pertinente, sconto a piè di
documento) → provvigione sull'importo scontato.

## Resoconto
`strumenti/opencode/resoconto-sconto-pratica-002.md`: dove sta lo sconto, causa, file toccati, prove,
correzioni proposte su file bloccati, cosa deve fare Ugo sulla 002, «Da documentare».
