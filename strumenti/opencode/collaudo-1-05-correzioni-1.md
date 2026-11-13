# Collaudo · Onda 1 · 1-05 — correzioni 1 (review di Claude Code, 12/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità: **P2**

Prima rileggi `collaudo-1-05-*.md` (il tuo pacchetto) e `resoconto-collaudo-1-05.md`. Regole: `regole-onda-parallela.md`, database `decobrands_test_1_05c`.

## Rilievi

### C1 — P2 · Le sessioni nate prima della modifica non scadono mai (D-89)
- **Dove**: `app/backend/src/accesso.ts` ~196. Il limite dei 30 giorni vale solo se `req.session.creata` c'è.
- **Scenario**: un utente entrato con «Resta collegato» prima del rilascio usa il CRM ogni giorno. `creata` resta `undefined` e la sessione vive per sempre.
- **Correzione**: se `creata` manca, impostala ad adesso al primo passaggio: i 30 giorni partono da lì.
- **Prova** nella suite delle sessioni che già c'è:
  - sessione senza `creata` → dopo la richiesta ha `creata`;
  - sessione con `creata` di 31 giorni fa → 401.

## File ammessi
- `app/backend/src/accesso.ts`
- la suite di prova delle sessioni (`app/backend/test/accesso*.spec.ts` o quella che le prova oggi): scrivi nel resoconto quale
- `strumenti/opencode/resoconto-collaudo-1-05-correzioni-1.md`

## Fine
- Prove: la suite toccata con 0 KO; `npx tsc --noEmit` nel backend.
- Resoconto con «Da documentare» (testo pronto, se cambia una regola).
- Carica davvero `owasp-security` e `caveman`.
