# Resoconto — prove dopo la pagina d'avvio scura (13/11/2026)

Esecutore: DeepSeek Flash.

## Rilievi

- [x] R1 `app_guscio.py:125`: aspettava `.accesso-scena`, che ora è anche la scena d'attesa. Ora aspetta
  `.accesso-scena button:has-text("Riprova")`.
- [x] R2 `app_utenti.py:30`: dopo `entra()` leggeva `.principale` mentre c'era l'indicatore. In `entra()`
  (un posto solo) ora aspetta `.avvio-gira` detached e `.principale h1` prima di tornare.
- [x] R3 grep su `strumenti/prove/app_*.py`: le altre attese di `.accesso-scena` sono tutte sulla scena
  d'accesso (goto `/accesso` + Enter), non sull'attesa del guscio. Nessun'altra correzione.

## Prove

- `python -m py_compile` sui due file: ok.
- `prepara.sh decobrands_test_e2e`: database pronto, build ok, frontend copiato.
- `giro.sh decobrands_test_e2e app_guscio app_utenti`, giro 1: app_guscio 29 OK 0 KO; app_utenti 28 OK 0 KO.
- `giro.sh decobrands_test_e2e app_guscio app_utenti`, giro 2: app_guscio 29 OK 0 KO; app_utenti 28 OK 0 KO.
  (Il giro 2 stampa «utenti di prova NON creati» perché gli utenti esistono già; le prove passano.)
- `npx tsc --noEmit` nel backend: passa.

## Da documentare

Nessuna modifica a interfaccia, spec o guida: solo prove. Niente da registrare nel §19.
