# Resoconto · Collaudo 1-05 · Correzioni 1 — Sessioni nate prima della correzione (D-89)

Data: 12/11/2026 · Esecutore: DeepSeek V4 pro · Onda 1 · Pacchetto 1-05-correzioni-1 (P2) · Rilievo: C1

## Cosa ho fatto per il rilievo

### C1 — Le sessioni nate prima della modifica non scadono mai (D-89)
- `app/backend/src/accesso.ts` (~riga 191, guard `AccessoGuard`): il controllo della durata massima
  prima era `if (req.session.creata && ora - req.session.creata > TRENTA_GIORNI)`. Una sessione nata
  prima del rilascio (senza `creata`) saltava il controllo e viveva per sempre. Ora:
  `if (!req.session.creata) req.session.creata = ora; else if (ora - req.session.creata > TRENTA_GIORNI) { destroy; 401 }`.
  Se `creata` manca, la si imposta adesso al primo passaggio: i 30 giorni partono da lì, come chiesto.
- Prova nella suite che prova già D-89, `app/backend/test/profilo.spec.ts`:
  - nuova prova «una sessione senza creata … la riceve al primo passaggio (C1)»: scrive una sessione
    senza `creata`, fa una richiesta e verifica che `creata` compaia (valore vicino ad adesso).
  - la prova esistente «sessione più vecchia di 30 giorni → 401» (A1-03) continua a passare.
- Nota: la prova usa un utente dedicato (`c1`) e non `oper`, perché `entra('oper')` è già usato 10
  volte e supererebbe il tetto `TENTATIVI=10` per persona del guard `TentativiGuard` (D-41), dando 429.

## Prove lanciate (database `decobrands_test_1_05c`, cancellato alla fine)

- `cd app/backend && npx jest test/profilo.spec.ts test/accesso.spec.ts test/eventi.spec.ts` →
  **47 passati, 0 KO** (profilo: 16; accesso ed eventi invariati).
- `cd app/backend && npx tsc --noEmit`: **nessun errore nei miei file** (`accesso.ts`,
  `profilo.spec.ts`). Restano errori in `src/motore/motore.ts` e `test/motore.spec.ts`
  (TS2554 «Expected 4 arguments, but got 2» e mismatch dei tipi su `bollettini`), file di un altro
  pacchetto della stessa onda (F3, in parallelo): non li tocco, sono fuori dai miei ammessi.
- `git diff --name-only` sui miei file: solo `app/backend/src/accesso.ts` e
  `app/backend/test/profilo.spec.ts` (gli altri file modificati sono dei pacchetti paralleli).
- Database `decobrands_test_1_05c` cancellato (`DROP DATABASE`).

## Prove nel browser da lanciare a fine onda

Nessuna. Il comportamento visibile non cambia: la correzione tocca solo la durata massima delle
sessioni, invisibile all'interfaccia. Le prove `app_profilo.py`, `app_oggi.py`, `app_eventi.py` restano
quelle dell'onda, nessuna modifica richiesta.

## Da documentare

Nessuna decisione nuova né regola cambiata: C1 chiude una lacuna di **D-89** già esistente (durata
massima di 30 giorni). Nessuna riga D-nn nel §19, nessuna modifica a guida, piano o README.
