# Collaudo · Onda 1 · 1-02 — correzioni 1 (review di Claude Code, 12/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità: **P2**

Prima rileggi `collaudo-1-02-*.md` (il tuo pacchetto) e `resoconto-collaudo-1-02.md`. Regole: `regole-onda-parallela.md`, database `decobrands_test_1_02c`.

## Rilievi

### C1 — P2 · Una prova di `documenti.spec.ts` crea l'agenzia nel periodo chiuso
- **Dove**: `app/backend/test/documenti.spec.ts` ~463, la prova «creata l'agenzia via API, la registrazione riesce e la pillola sparisce».
- **Problema**: la prova crea l'agenzia con `valido_dal: '2026-01-01'` su un fornitore che ha già il periodo chiuso. Il blocco D-114 del tuo pacchetto risponde giustamente 409, e la prova, che aspetta 201, fallisce.
- **Correzione**: cambia solo la prova. Usa un `valido_dal` successivo alla chiusura del fornitore, oppure un fornitore senza chiusure. La data deve comunque coprire la data del documento, altrimenti «Manca l'agenzia» non sparisce. Non toccare il codice di D-114.
- **Prova**: `test/documenti.spec.ts` con 0 KO.

## File ammessi
- `app/backend/test/documenti.spec.ts`
- `strumenti/opencode/resoconto-collaudo-1-02-correzioni-1.md`

## Fine
- Prove: `test/documenti.spec.ts test/clienti.spec.ts` con 0 KO; `npx tsc --noEmit` nel backend.
- Resoconto con «Da documentare» (testo pronto, se cambia una regola).
- Carica davvero `javascript-typescript-jest` e `caveman`.
