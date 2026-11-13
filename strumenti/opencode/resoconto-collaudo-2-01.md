# Resoconto pacchetto 2-01 — Confronto delle righe dei documenti calcolato dal server (V12, D-60)

Data: 13/11/2026 · Esecutore: DeepSeek V4 · Gravità: P1 · Rilievi: A5-02.

Esito: **1 rilievo corretto**. `npx tsc --noEmit` (backend) 0 errori, (frontend) 0 errori. `npx jest test/pratiche.spec.ts test/documenti-pratica.spec.ts` → **36 prove, 0 KO**. `python -m py_compile strumenti/prove/app_pratica.py` OK. Prove nel browser **non lanciate** (regole dell'onda): le lancia il controllo di fine onda.

## Rilievi

### A5-02 — Confronto delle righe calcolato nel browser, diverso da quello del server (V12, D-60)

- `app/backend/src/documenti.ts`: nuova funzione `confrontoDocumenti(t, cur, rif)` accanto a `documentiPratica`. Somma le righe dello stesso codice (D-60, stessa regola di `perCodice` del motore), allinea i due documenti, calcola `delta` e `differenza` al centesimo (`r2`); con una nota di credito mostra solo le righe stornate e la differenza è l'importo stornato (§7.3, portata identica alla regola che stava nel browser). Nuova rotta `GET /pratiche/:id/documenti/:did/confronto?rif=` (permesso `provvigioni.consulta`) nel controller `DocumentiPraticaController`. A ogni documento della risposta di `GET /pratiche/:id/documenti` si aggiunge `pratica_id` (serve alla finestra per chiamare la rotta nuova).
- `app/frontend/componenti/ConsultaDocumenti.tsx`: tolte le funzioni locali `confronto` (allineava con `find`, prima riga, senza sommare), `diff` (differenza in euro) e `somma` (totale dell'anteprima). La finestra ora carica `{righe, differenza}` dalla rotta nuova con un `useEffect` (stato `caricando`, «…» e «Caricamento…» mentre arriva); `a` è il documento di confronto, `b` quello corrente. L'anteprima usa il totale del documento del server (`d.importo`).
- `app/backend/test/pratiche.spec.ts`: nuovo `describe` `GET /api/pratiche/:id/documenti/:did/confronto` con il caso del rilievo: ordine con l'articolo X su due righe (10 + 5 pezzi) e fattura con X su una riga (15 pezzi) → una sola riga, `varia: false`, `delta: 0`, `differenza: 0`, e `a`/`b` sommate a 15.
- `strumenti/prove/app_pratica.py`: nuova sezione che apre la finestra sulla pratica `OF/2026/038` (ordine = conferma = fattura, senza variazioni) e verifica che le righe a confronto della tabella coincidano con quelle della rotta nuova e che la differenza sia «nessuna».

Nota: `perCodice` non è esportato da `app/backend/src/motore/motore.ts` (file vietato, lo modificano altri pacchetti), quindi il pacchetto non ha potuto «importarlo» come indicava la consegna: la somma per codice è replicata fedelmente dentro `confrontoDocumenti`. Nessuna modifica a `motore.ts`.

## Prove

| Prova | Esito |
|---|---|
| `npx tsc --noEmit` in `app/backend` | 0 errori |
| `npx tsc --noEmit` in `app/frontend` | 0 errori |
| `npx jest test/pratiche.spec.ts test/documenti-pratica.spec.ts` (su `decobrands_test_2_01`) | 36 prove, 0 KO |
| `python -m py_compile strumenti/prove/app_pratica.py` | OK |
| `app_pratica.py` (browser) | **da lanciare a fine onda** |

Database di prova `decobrands_test_2_01` creato, usato e **cancellato**. `documenti-pratica.spec.ts` è nella lista dei vietati (lo toccano altri pacchetti): non l'ho modificato, solo eseguito; l'aggiunta di `pratica_id` ai documenti non ne cambia le asserzioni.

File toccati (solo ammessi): `app/backend/src/documenti.ts`, `app/frontend/componenti/ConsultaDocumenti.tsx`, `app/backend/test/pratiche.spec.ts`, `strumenti/prove/app_pratica.py`, questo resoconto. Nessun file vietato.

## Da documentare

**Registro §19 — nessuna decisione nuova.** È la correzione di A5-02 dentro D-78 (che già dice: «Il confronto si calcola dal database sul server (V12)»). Se il pacchetto documentazione vuole una riga di traccia, il testo pronto è:
> D-… (13/11/2026) — *Il confronto della finestra dei documenti è una rotta sua.* `GET /api/pratiche/:id/documenti/:did/confronto?rif=` restituisce le righe dei due documenti già sommate per codice (D-60) e allineate, con `delta` e `differenza`; la finestra (`ConsultaDocumenti`) le mostra senza ricalcolarle. Perché: il browser sommava con `find` (la prima riga, non la somma) e calcolava differenze e totali in locale, numeri diversi dal server. Chi: DeepSeek V4. Dove: `src/documenti.ts`, `componenti/ConsultaDocumenti.tsx`.

**Spec §8.1 (tabella API) — riga pronta** (accanto a `GET /api/pratiche/:id/documenti`):
> | GET | `/api/pratiche/:id/documenti/:did/confronto?rif=` | confronto fra due documenti della pratica (D-78, §7.3): righe dello stesso codice sommate (D-60) e allineate, con `delta` e `differenza`; con una nota di credito solo le righe stornate e differenza = importo stornato; risponde `{righe: [{codice, descrizione, a, b, varia, delta}], differenza}`; permesso `provvigioni.consulta` |

**Spec §7.3 — nota pronta:**
> *Perché (A5-02):* la differenza fra due documenti della pratica si calcola sul server (`/documenti/:did/confronto`), mai nel browser: il browser sommerebbe le righe con lo stesso codice con `find` (la prima, non la somma) e darebbe delta e totali sbagliati.

**Guida (`lib/guida.ts`)**: niente da cambiare (il testo della finestra resta lo stesso; il dove-si-calcola non è materia della guida).

**Piano (`piano-lavoro-crm.md`)**: nessuna attività nuova, 0 ore da approvare (correzione dentro D-78 / F2 già previste).

**README**: niente da cambiare.
