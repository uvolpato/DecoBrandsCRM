# Versione visibile nell'app (13/11/2026)

**Esecutore: DeepSeek Flash** · richiesta di Ugo.

Regole comuni: `regole-onda-parallela.md`: **niente `cd` fuori dal progetto, niente `/tmp`, niente `&`, non leggere la copia del frontend fuori dal progetto**. Altri lavori in corso toccano spec, guida e piano: **non toccarli**. Scrivi subito `strumenti/opencode/resoconto-collaudo-versione.md`.

## Scopo
Quando Ugo segnala un problema si deve sapere su quale versione era. Fonte unica: `version` di `app/backend/package.json` (portala a **0.2.0**; allinea `app/frontend/package.json` a 0.2.0) più il commit di Git.

## Da fare (codice minimo, ponytail)
1. **Backend**: all'avvio calcola una volta la versione: `version` del package.json del backend e, se Git risponde, `git describe --tags --always --dirty` (con `execFileSync`, `cwd` la radice del repository, timeout breve, errori ignorati: in esercizio può mancare Git). Esempio di risultato: `{ numero: '0.2.0', commit: 'v0.2.0-3-gabc1234' }` oppure `commit: null`.
   - Esponila dove il frontend già legge i dati dell'utente collegato o dello stato del sistema (cerca con `graphify query "stato del sistema"` e `graphify query "utente collegato"`): **nessuna rotta nuova senza permesso**; va bene una rotta `GET /api/versione` con `@Richiede('collegato')` se è la via più corta.
   - Niente segreti, niente percorsi del disco nella risposta.
2. **Frontend**:
   - **Stato del sistema** (`app/frontend/app/(app)/sistema/VistaSistema.tsx`): una riga «Versione 0.2.0 (v0.2.0-3-gabc1234)».
   - **Barra** (`app/frontend/componenti/Barra.tsx`): in fondo, testo piccolo e tenue «v0.2.0». Usa classi CSS già esistenti (`grep` su `app/frontend/app/stile/stile.css`); se serve una classe nuova controlla che il nome non esista già.
3. **Prove**: una prova jest piccola sulla rotta o sul calcolo (numero uguale al package.json); `strumenti/prove/app_sistema.py` controlla che compaia «Versione» (solo `py_compile`, la lancia Claude Code).

## File ammessi
`app/backend/package.json`, `app/frontend/package.json` (solo `version`), `app/backend/src/**` (solo i file della versione e il punto dove si espone), `app/backend/test/**` (una prova), `app/frontend/app/(app)/sistema/VistaSistema.tsx`, `app/frontend/componenti/Barra.tsx`, `app/frontend/app/stile/stile.css` (solo se serve), `app/frontend/lib/api.ts` (solo se serve), `strumenti/prove/app_sistema.py`, il resoconto. Vietati: spec, guida, piano, LEGGIMI, `package-lock.json` (non lanciare `npm install`).

## Fine
`npx tsc --noEmit` backend e frontend; jest della prova nuova con `DATABASE_URL_TEST` su `decobrands_test_ver` (creato e cancellato da te, come nei pacchetti dell'onda) se la prova usa il database. Nel resoconto, «Da documentare»: testo per spec §7.14 (Stato del sistema) e per la nota di rilascio. Carica davvero `ponytail-review`, `caveman`.
