# Resoconto — Prove nel browser bloccate (14/11/2026)

Esecutore: DeepSeek V4 pro · Pacchetto: `strumenti/opencode/prove-14-11.md` · Gravità P1.

## Cosa chiede Ugo

Sbloccare due prove del giro `app_documenti app_clienti` (database nuovo): il blocco D-154 «Somma righe»
in `app_documenti.py` (riga ~566) e la riga agenzia `T<RUN>` che non compare in `app_clienti.py` (riga ~166).

## Causa vera (diversa dall'ipotesi del pacchetto)

- **Blocco 1 (app_documenti)**: NON è «scheda simulata senza i campi nuovi» né «`clienti?fornitore_id=`
  non intercettata». È il **limite ai tentativi (D-41, `TENTATIVI=10` per persona)**. I pacchetti
  `cliente-scelto` e `codice-cliente-in-ricerca` hanno aggiunto due blocchi di prova, ciascuno con un
  `entra(S + '-ammi')`: i login di `r1-ammi` sono saliti a **11**, oltre il tetto di 10. L'undicesimo
  `POST /api/accesso/entra` risponde **429 «Troppi tentativi»** e il `wait_for_function` sul ritorno a
  `/documenti` va in timeout. (Verificato con uno strumento di prova: 10×200 + 1×429.)
- **Blocco 2 (app_clienti)**: **non riproducibile**. `app_clienti` passa 46/0 (da solo e nel giro completo
  dopo `app_documenti`). La pagina Clienti non usa l'entità `cliente` (usa `fornitore`/`subagente`) e chiama
  `api('clienti')` senza `fornitore_id`: né `entita.ts` né `clienti.ts` la toccano. Il KO del rapporto era
  con ogni probabilità un caso sporadico, o una coda del fallimento di `app_documenti`.

## Cosa ho fatto

- `strumenti/prove/app_documenti.py`: i due blocchi nuovi («cliente scelto» e «codice cliente»,
  `pg6` e `pgC`) entrano con `S + '-oper'` invece di `S + '-ammi'`. `r1-oper` ha `provvigioni.modifica`
  (livello operatore), quindi la finestra «Correggi i dati letti» c'è uguale; i login di `r1-ammi`
  scendono a 9 (sotto il tetto), `r1-oper` resta a 2. Nessun cambiamento di app né di spec.

## Prove

- `python -m py_compile strumenti/prove/app_documenti.py`: OK.
- Giro completo su `decobrands_test_e2e` (database ricreato con `prepara.sh`): **due giri**, entrambi
  - `app_documenti`: **107 controlli, 0 KO**;
  - `app_clienti`: **46 controlli, 0 KO**.
- Nessuna modifica all'app: `tsc` backend e frontend già verdi (build backend OK da `prepara.sh`, frontend
  `tsc --noEmit` OK).

## Controlli (skill caricate davvero)

- `playwright-best-practices`: la causa si è letta dal 429 sul login, non dal testo del timeout; `page.on('response')`
  per vedere lo stato della risposta. Nessuna modifica al selettore né ai wait.
- `ponytail-review`: diff di 2 righe (`-ammi` → `-oper`). Niente da tagliare: *Lean already. Ship.*
- `caveman`: risposte concise.

## Da documentare (a cura di chi chiude l'onda)

- Nessuna decisione nuova né modifica di spec: è una correzione della sola prova.
- Nota per l'onda: `app_documenti.py` ora fa 9 login da `r1-ammi` + 2 da `r1-oper` + 1 da `r1-lett`. È
  vicino al tetto `TENTATIVI=10` (D-41): un altro blocco che riusa `-ammi` lo supererebbe di nuovo. Il
  giro non imposta `TENTATIVI=1000` come indicato altrove (`piano-correzioni.md`, `A6-prove.md`): se si
  vuole toglierlo, va cambiato `giro.sh` (fuori dai file ammessi di questo pacchetto).

## Aperti / da segnalare

- La causa di blocco 2 non è confermata (non riprodotta): resta un sospetto di caso sporadico. I due giri
  puliti non l'hanno più vista.
- Il tetto `TENTATIVI=10` resta una fragilità delle prove nel browser: il fix definitivo sarebbe
  `TENTATIVI=1000` in `giro.sh`, ma quel file non è fra quelli ammessi.
