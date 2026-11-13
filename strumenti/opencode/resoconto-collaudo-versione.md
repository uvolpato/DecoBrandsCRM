# Resoconto collaudo — versione visibile nell'app (13/11/2026)

Esecutore: DeepSeek Flash.

## Fatto

- `app/backend/package.json` → `version: 0.2.0`; `app/frontend/package.json` → `0.2.0`.
- **Backend** — nuovo `app/backend/src/versione.ts`: `puntoVersione()` legge `version` dal
  package.json del backend (risalendo da `src` o `dist/src`) e, se Git risponde,
  `git describe --tags --always --dirty` con `execFileSync` (cwd radice del repository,
  timeout 2 s, errori ignorati → `commit: null`). Calcolata **una volta** all'import (avvio).
  Rotta `GET /api/versione` con `@Richiede('collegato')`: nessuna rotta nuova senza permesso,
  niente segreti né percorsi del disco nella risposta. Registrata in `app.module.ts`.
- **Frontend** — `VistaSistema.tsx`: riga in fondo alla pagina «Versione 0.2.0 (v0.2.0-3-g…)"
  (commit fra parentesi solo quando c'è). `Barra.tsx`: in fondo alla barra, sotto l'utente,
  «v0.2.0» in piccolo e tenue. Classe nuova `.barra-versione` in `stile.css` (il nome non
  esisteva già).
- **Prove** — `app/backend/test/versione.spec.ts`: il numero è quello del package.json (e
  `0.2.0`). `strumenti/prove/app_sistema.py`: due controlli nuovi (riga «Versione …» nella
  pagina, «v0.2.0» nella barra), confrontati con `GET /api/versione`.

## Prove eseguite

| Prova | Esito |
|---|---|
| `npx tsc --noEmit` backend | passa |
| `npx tsc --noEmit` frontend | passa |
| `npx jest test/versione.spec.ts` con `DATABASE_URL_TEST` su `decobrands_test_ver` | 1/1 passa |
| `python -m py_compile strumenti/prove/app_sistema.py` | passa |
| `decobrands_test_ver` | creato e cancellato |

Le prove nel browser (`strumenti/prove/app_sistema.py`) non sono state lanciate: le lancia
Claude Code a fine onda (regole dell'onda).

## Aperto

- `.barra-versione`: a ≤ 860 px la barra-piede è una riga orizzontale e la versione sta accanto
  all'utente; da guardare in una schermata a 768 px (prova del browser). Sotto i 744 px l'app si
  ferma (D-44).
- Controllo di sicurezza/permessi: la rotta legge solo una costante; `GET` con `collegato` è
  ammesso dalle regole dei permessi.

## Da documentare

### Spec §7.14 (Stato del sistema)

> In fondo alla pagina una riga tenue «Versione 0.2.0 (v0.2.0-3-gabc1234)»: il numero viene da
> `version` di `app/backend/package.json` (unico posto da alzare a ogni rilascio), il commit da
> `git describe --tags --always --dirty` quando Git risponde (in esercizio può mancare: si mostra
> il solo numero). La stessa versione compare in piccolo e tenue in fondo alla barra laterale
> («v0.2.0»). Fonte unica sul server, rotta `GET /api/versione` con il solo permesso `collegato`;
> il browser non calcola niente (V12).

### Nota di rilascio

> 0.2.0 — La versione dell'app ora si vede: in fondo allo *Stato del sistema* (numero e commit)
> e in fondo alla barra laterale (solo numero). Per sapere su quale versione è arrivata una
> segnalazione basta guardare la pagina.
