# Prove dopo la pagina d'avvio scura (13/11/2026)

**Esecutore: DeepSeek Flash** · lavoro piccolo, massimo 20 minuti. Regole comuni: `regole-onda-parallela.md` (**niente `cd` fuori dal progetto, niente `/tmp`, niente `&`, non leggere la copia del frontend fuori dal progetto**). Resoconto breve in `strumenti/opencode/resoconto-collaudo-avvio-scuro-prove.md`.

La pagina d'avvio (`app/frontend/app/(app)/layout.tsx`) mentre aspetta `/accesso/io` ora mostra `.accesso-scena` con `.avvio-gira` (indicatore). Due prove leggono troppo presto:
1. `strumenti/prove/app_guscio.py` riga ~125: `pg.wait_for_selector('.accesso-scena')` trova la scena d'avvio, non quella d'errore. Aspetta invece `.accesso-scena button:has-text("Riprova")`.
2. `strumenti/prove/app_utenti.py` riga ~101: dopo `entra(S + '-oper')` legge `.principale` mentre c'è ancora l'indicatore. Aspetta che l'indicatore sparisca (`.avvio-gira` detached) e che compaia `.principale h1` prima di leggere il testo. Se `entra()` è comune, correggi lì (un posto solo).
Controlla con grep se altre prove (`strumenti/prove/app_*.py`) aspettano `.accesso-scena` per capire che la pagina è pronta, e correggile allo stesso modo.

Prova: dalla radice, `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e` e `bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_guscio app_utenti` in primo piano, due volte, 0 KO.

File ammessi: `strumenti/prove/app_*.py`, il resoconto. Carica davvero `caveman`.
