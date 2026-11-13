# Collaudo · Onda 1 · 1-20 — correzioni 1 (review di Claude Code, 12/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità: **P2**

Prima rileggi `collaudo-1-20-*.md` (il tuo pacchetto) e `resoconto-collaudo-1-20.md`. Regole: `regole-onda-parallela.md`, database `decobrands_test_1_20c`.

## Rilievi

### C1 — P2 · L'avviso al vecchio indirizzo nomina l'utente sbagliato
- **Dove**: `app/backend/src/utenti.ts` ~119.
- **Scenario**: l'amministratore «mrossi» cambia l'email di «lbianchi». Al vecchio indirizzo di lbianchi arriva «L'email del tuo utente mrossi è stata cambiata…», e chi lo riceve non riconosce il suo account.
- **Correzione**: il nome utente è quello dell'account cambiato (`prima.username`); `req.utente` serve solo per dire da chi.

### C2 — P3 · L'ora dell'avviso è nel fuso del server
- **Dove**: `app/backend/src/posta.ts` ~103: `toLocaleString('it-IT')` senza `timeZone`.
- **Correzione**: aggiungi `{ timeZone: 'Europe/Rome' }`.
- **Prova** in `test/utenti.spec.ts`: un amministratore cambia l'email di un altro utente → l'avviso contiene il nome dell'utente cambiato e l'ora di Roma.

## File ammessi
- `app/backend/src/utenti.ts`
- `app/backend/src/posta.ts`
- `app/backend/test/utenti.spec.ts`
- `strumenti/opencode/resoconto-collaudo-1-20-correzioni-1.md`

## Fine
- Prove: `test/utenti.spec.ts` con 0 KO; `npx tsc --noEmit` nel backend.
- Resoconto con «Da documentare» (testo pronto, se cambia una regola).
- Carica davvero `owasp-security` e `caveman`.
