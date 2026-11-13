# Collaudo · Onda 1 · 1-16 — correzioni 1 (review di Claude Code, 12/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità: **P3**

Prima rileggi `collaudo-1-16-*.md` (il tuo pacchetto) e `resoconto-collaudo-1-16.md`. Regole: `regole-onda-parallela.md`, database `decobrands_test_1_16c`.

## Rilievi

### C1 — P3 · Sollecito: importo e fatture del registro non corrispondono a quanto sollecitato
- **Dove**: `app/backend/src/incassi.ts` ~111.
- **Scenario**: due fatture da sollecitare; una diventa `pagata` fra `caricaDati` e il `FOR UPDATE`. Se ne sollecita una sola, ma il registro scrive l'`importo_totale` di tutte e due. In più l'evento ora ha solo il conteggio (`fatture: 1`) al posto dei numeri.
- **Correzione**: `importo_totale` e l'elenco dei **numeri** delle fatture nell'evento si calcolano solo dalle voci aggiornate dopo il blocco.
- **Prova** in `test/incassi.spec.ts`: una delle due fatture viene pagata prima del blocco → importo e numeri solo dell'altra.

## File ammessi
- `app/backend/src/incassi.ts`
- `app/backend/test/incassi.spec.ts`
- `strumenti/opencode/resoconto-collaudo-1-16-correzioni-1.md`

## Fine
- Prove: `test/incassi.spec.ts` con 0 KO; `npx tsc --noEmit` nel backend.
- Resoconto con «Da documentare» (testo pronto, se cambia una regola).
- Carica davvero `postgresql-code-review` e `caveman`.
