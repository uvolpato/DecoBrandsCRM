# Collaudo · Onda 1 · 1-01 — correzioni 1 (review di Claude Code, 12/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità: **P2**

Prima rileggi `collaudo-1-01-*.md` (il tuo pacchetto) e `resoconto-collaudo-1-01.md`. Regole: `regole-onda-parallela.md`, database `decobrands_test_1_01c`.

## Rilievi

### C1 — P2 · `suDocumento` confronta ancora solo il numero (numero riusato, maturato)
- **Dove**: `app/backend/src/motore/motore.ts` ~217 (`trovaDocumento`, già corretto) e `suDocumento`, usato da `riconosciutoIn`.
- **Scenario**: provvigione sul maturato. Il fornitore riusa il numero di fattura «15» nel 2025 e nel 2026. Una riga verificata del bollettino 2025 per la «15», non legata a un documento, fa risultare riconosciuta anche la «15» del 2026, nel mese sbagliato.
- **Correzione**: la ricerca del documento di una riga sta in **un solo** aiuto, quello che già c'è (`documentoDiRiga`) o uno nuovo, e distingue i numeri riusati per data e mese, come `trovaDocumento`. `suDocumento` lo usa. Niente copie.
- **Prova** in `test/motore.spec.ts`: numero riusato in due anni, sul maturato → riconosciuto solo nel mese giusto.

## File ammessi
- `app/backend/src/motore/motore.ts`
- `app/backend/test/motore.spec.ts`
- `strumenti/opencode/resoconto-collaudo-1-01-correzioni-1.md`

## Fine
- Prove: `test/motore.spec.ts test/liquidazioni.spec.ts test/analisi.spec.ts` con 0 KO; `npx tsc --noEmit` nel backend.
- Resoconto con «Da documentare» (testo pronto, se cambia una regola).
- Carica davvero `ponytail-review` e `caveman`.
