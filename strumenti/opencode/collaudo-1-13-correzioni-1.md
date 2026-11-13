# Collaudo · Onda 1 · 1-13 — correzioni 1 (review di Claude Code, 12/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità: **P2**

Prima rileggi `collaudo-1-13-*.md` (il tuo pacchetto) e `resoconto-collaudo-1-13.md`. Regole: `regole-onda-parallela.md`, database `decobrands_test_1_13c`.

## Rilievi

### C1 — P2 · I 400 di validazione fanno salire «errori oggi» e si possono scrivere anche senza accesso
- **Dove**: `app/backend/src/errori.filter.ts` ~53.
- **Scenario**:
  - un utente sbaglia un campo dieci volte → dieci righe con `livello='errore'`, e il contatore degli errori in Sistema e nella barra sale di 10;
  - chiunque, anche senza accesso, riempie il registro mandando POST sbagliati.
- **Correzione**:
  - si registra **solo** la richiesta di un utente entrato (`req.utente`), con `contesto(req)` (utente e IP);
  - un rifiuto di validazione non è un errore del sistema e non deve contare in «errori oggi». Usa l'esito o il livello che il registro prevede già per un rifiuto: guarda `registro.ts` e §15.2.7. Se non c'è, scrivi la proposta nel resoconto e intanto non registrarlo come `errore`;
  - nel dettaglio vanno solo il campo e un messaggio generico («valore non valido»), mai il testo dell'eccezione: a volte contiene il valore inviato (`Area sconosciuta: xyz`, `Campo sconosciuto: <k>`).
- **Prova**:
  - 400 senza accesso → nessuna riga;
  - 400 da un utente entrato → una riga con l'utente, senza il valore inviato, che non conta in «errori oggi».

### C2 — P3 · `erroreAlPosto` salta lo schema di un evento riuscito che ha il campo `errore`
- **Dove**: `app/backend/src/registro.ts` ~90. Guarda solo se `dettaglio` ha la chiave `errore`, non se `e.esito === 'errore'`.
- **Correzione**: la scorciatoia vale solo con `esito === 'errore'`.
- **Prova** in `test/registro.spec.ts`: evento `successo` con `errore` ma senza i campi obbligatori → rifiutato dal controllo.

## File ammessi
- `app/backend/src/errori.filter.ts`
- `app/backend/src/registro.ts`
- `app/backend/test/registro.spec.ts`
- `app/backend/test/registro-api.spec.ts`
- `strumenti/opencode/resoconto-collaudo-1-13-correzioni-1.md`

## Fine
- Prove: `test/registro.spec.ts test/registro-api.spec.ts test/sistema.spec.ts` con 0 KO; `npx tsc --noEmit` nel backend.
- Resoconto con «Da documentare» (testo pronto, se cambia una regola).
- Carica davvero `owasp-security` e `caveman`.
