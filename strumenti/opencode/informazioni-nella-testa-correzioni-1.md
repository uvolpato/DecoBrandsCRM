# Correzioni 1 — `informazioni-nella-testa`

Ugo (18/11/2026): «la “i” deve stare sempre a destra».

## Rilievo

Nella testata del pannello l’«i» è oggi **fra la nota e le azioni**: `nota → info → pulsanti`.
Deve stare **sempre all’estrema destra**, dopo i pulsanti: `nota → pulsanti → info`.

## Correzione

- In `app/frontend/componenti/Pagina.tsx`, `Pannello`: sposta `{info}` **dopo** `{azioni.map(…)}` dentro `.pannello-destra`, come ultimo elemento.
- Nient’altro: non cambiare `VistaPratica.tsx`, i testi, le altre pagine.

## File ammessi

- `app/frontend/componenti/Pagina.tsx`

## Prove

- `npx tsc --noEmit` in `app/frontend`: 0 errori.
- Aggiorna `strumenti/opencode/resoconto-informazioni-nella-testa.md` con la correzione (ordine finale `nota → info → pulsanti` **errato**, corretto `nota → pulsanti → info`).
