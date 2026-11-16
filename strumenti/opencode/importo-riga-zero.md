# Pacchetto `importo-riga-zero`

## Contesto
Leggi `strumenti/opencode/resoconto-usa-importi-calcolati.md`. Un documento in coda con **26 righe** ha
`documenti_campi.righe[i].importo = "0"` su **tutte** le righe, mentre quantità, prezzo e sconto sono letti
bene. Nella correzione l'operatore vede 0,00 € in arancio su ogni riga. Difetto del lettore.

## Compito
1. **Diagnosi** (sola lettura su `decobrands_db`, URL con grep, `.env` mai letto per intero): trova il
   documento, guarda la `lettura_grezza` (cosa ha restituito GLM-OCR nella colonna importo: vuoto, «0»,
   colonna mancante, colonna scambiata?) e il PDF se serve. Segui il percorso in `app/backend/src/lettore.ts`
   / `lettura.ts` / `documenti.ts` fino a `righe[i].importo`.
2. **Correzione alla radice**: un importo non letto (vuoto, assente, non numerico) resta **vuoto**, mai `0`,
   così la riga risulta «calcolata» (D-… del pacchetto `importo-calcolato`). Uno `0` vero si tiene solo se
   il documento lo stampa davvero (es. riga omaggio con prezzo 0). Se la colonna è letta in un'altra (es.
   importo finito nello sconto o nel prezzo), correggi la mappatura.
3. Non rileggere sul db vero: scrivi a Ugo come rimettere a posto il documento (Rileggi dall'interfaccia).

## File ammessi
`lettore.ts`, `lettura.ts`, `documenti.ts`, `proposta.ts` (solo se serve), test
`app/backend/test/documenti-lettura.spec.ts`. Aggiungi, non riscrivere. **Non toccare** `motore/*`,
`liquidazioni*`, la pagina Oggi, il registro, `VistaSistema.tsx` (altri pacchetti in corso).

## Regole
Leggi prima `strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`. V12, V13. Prove su
`decobrands_test_importo_zero` (creato e cancellato). Niente commit, 8001/8002, `cd`, `/tmp`, `&`, Integra,
niente chiamate al server di lettura vero. Skill da caricare davvero: `owasp-security`, `ponytail-review`,
`caveman`.

## Prove (0 KO)
`npx tsc --noEmit` backend; jest: grezza con importo vuoto/assente → `importo` vuoto; importo «0,00»
stampato con prezzo 0 → 0.

## Resoconto
`strumenti/opencode/resoconto-importo-riga-zero.md`: documento, cosa dice la grezza, causa, file, prove,
cosa fa Ugo, «Da documentare».
