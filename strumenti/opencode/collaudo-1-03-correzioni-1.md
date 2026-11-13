# Collaudo · Onda 1 · 1-03 — correzioni 1 (review di Claude Code, 12/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità: **P2**

Prima rileggi `collaudo-1-03-*.md` (il tuo pacchetto) e `resoconto-collaudo-1-03.md`. Regole: `regole-onda-parallela.md`, database `decobrands_test_1_03c`.

## Rilievi

### C1 — P2 · Se il servizio di lettura è giù, ogni documento in coda consuma i tentativi
- **Dove**: `app/backend/src/lettura.ts` ~154. Oggi solo `LetturaFallita` con 401/402/403/429 non consuma il tentativo.
- **Scenario**: vLLM spento (fetch TypeError, timeout di `AbortSignal`) o risposta 5xx. Ogni 15 s un documento va in `letturaFallita`: dopo 3 giri tutta la coda è in `errore`, con un'anomalia per documento.
- **Correzione**:
  - anche rete irraggiungibile, timeout e 5xx sono «servizio non disponibile»: non consumano il tentativo del documento;
  - aprono, o aggiornano, **un'anomalia sola** del servizio e fermano il giro fino al prossimo;
  - il tentativo si consuma solo per un errore del documento: risposta valida ma illeggibile, oppure 4xx sul file;
  - riusa il ramo che già c'è per 401/402/403/429, non copiarlo.
- **Prova** in `test/lettura.spec.ts`: servizio che risponde 503 e servizio che va in timeout → tentativi invariati e una sola anomalia.

## File ammessi
- `app/backend/src/lettura.ts`
- `app/backend/test/lettura.spec.ts`
- `strumenti/opencode/resoconto-collaudo-1-03-correzioni-1.md`

## Fine
- Prove: `test/lettura.spec.ts test/documenti.spec.ts` con 0 KO; `npx tsc --noEmit` nel backend.
- Resoconto con «Da documentare» (testo pronto, se cambia una regola).
- Carica davvero `ponytail-review` e `caveman`.
