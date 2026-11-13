# Collaudo · Onda 1 · 1-10 — correzioni 1 (review di Claude Code, 12/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità: **P3**

Prima rileggi `collaudo-1-10-*.md` (il tuo pacchetto) e `resoconto-collaudo-1-10.md`. Regole: `regole-onda-parallela.md`, database `decobrands_test_1_10c`.

## Rilievi

### C1 — P3 · Un errore interno della casella viene segnalato come «email non leggibile»
- **Dove**: `app/backend/src/casella.ts` ~237. Il ramo dell'errore interno (es. database giù in `riceviDocumento`) copia il blocco dell'anomalia «illeggibile»: stesso codice, stessa chiave, stesso testo.
- **Problema**: per un guasto del server il messaggio manda l'utente a caricare il documento a mano. In più il blocco è duplicato.
- **Correzione**:
  - un aiuto unico per l'anomalia, con codice e messaggio diversi per le due cause;
  - email illeggibile: il testo di oggi;
  - errore interno: «Un'email non si è potuta registrare per un errore del server: riprova; se si ripete, avvisa l'assistenza».
  - Il codice nuovo va nel catalogo §7.14.3: scrivilo in «Da documentare».
- **Prova** in `test/casella.spec.ts`: errore interno → anomalia con il codice dell'errore interno.

## File ammessi
- `app/backend/src/casella.ts`
- `app/backend/test/casella.spec.ts`
- `strumenti/opencode/resoconto-collaudo-1-10-correzioni-1.md`

## Fine
- Prove: `test/casella.spec.ts` con 0 KO; `npx tsc --noEmit` nel backend.
- Resoconto con «Da documentare» (testo pronto, se cambia una regola).
- Carica davvero `ponytail-review` e `caveman`.
