# Resoconto pacchetto 2-06 — Esci sicuro, ritorno dopo l'accesso, contatori della barra dal vivo, Stato del sistema

Data: 13/11/2026 · Esecutore: DeepSeek V4 · Gravità: P2 · Rilievi: A6-02, A1-04, A5-13, A6-17.

Esito: **3 rilievi corretti (A6-02, A1-04, A5-13), A6-17 corretto in parte** (testi/stile della barra; stato «Da configurare» e `flex-wrap` rimandati). `npx tsc --noEmit` (frontend) 0 errori. `python -m py_compile strumenti/prove/app_accesso.py app_eventi.py app_sistema.py` OK. Prove nel browser **non lanciate** (regole dell'onda): le lancia il controllo di fine onda.

## Rilievi

### A6-02 — *Esci*: la pagina d'accesso compariva prima che la sessione fosse chiusa
- `app/frontend/lib/api.ts:33-46`: variabile di modulo `uscendo = false`; `allAccesso()` esce subito se `uscendo` (niente `assign('/accesso?dopo=…')` in corsa). Nuovo `export async function esci()`: `uscendo = true`, `await api('accesso/esci', {})`, poi `window.location.replace('/accesso')`.
- `app/frontend/componenti/Barra.tsx:187`: la voce *Esci* ora è un `button` (non `Link`) che chiama `esci()`; la navigazione all'accesso avviene solo **dopo** la risposta del server.
- `app/frontend/app/accesso/esci/page.tsx`: usa `esci()` (resta per il link della password provvisoria).
- Prova `strumenti/prove/app_accesso.py:58`: subito dopo `esci(pg)` il controllo `fetch('/api/accesso/io')` = **401 senza attese** (prima il giro si fermava qui 1 volta su 3).

### A1-04 — Reindirizzamento aperto con un TAB nel parametro `dopo`
- `app/frontend/lib/api.ts:97-107`: `dopo(v)` ora risolve `new URL(v, window.location.origin)` e confronta l'origine (il parser degli URL toglie TAB e a capo: `/\t/sito` diventa `//sito`), rifiuta `pathname.startsWith('/accesso')` e torna `u.pathname + u.search + u.hash`. Un valore che risolve fuori origine o non valido dà `/`.
- Prova `strumenti/prove/app_accesso.py:89-93`: loop su `%2F%09%2Fexample.com`, `%2F%0A%2Fexample.com`, `%2F%5C%2Fexample.com` (oltre al già presente `//esempio.com`): dopo l'accesso l'URL resta sull'origine dell'app.

### A5-13 — Contatori della barra laterale fermi fino al cambio pagina
- `app/frontend/componenti/Barra.tsx:78-95`: `const eventi = useEventi()` e `vEventi = (eventi.documenti ?? 0) + (eventi.pratiche ?? 0) + (eventi.bollettini ?? 0) + (eventi.sistema ?? 0)`; dipendenze dell'effetto `[percorso, vEventi]` (U20: si rilegge a ogni pagina **e** a ogni evento; `percorso` resta).
- Prova `strumenti/prove/app_eventi.py:161-190`: da un'altra scheda si carica un PDF (`POST /api/documenti/carica`) e il contatore *Documenti* della barra cresce senza navigare; pulizia con `scarta`.

### A6-17 — Stato del sistema: «Funziona» su servizi non configurati, testata e barra
- **Corretto**: `app/frontend/componenti/Barra.tsx:162` — spazio `margin-left: .4rem` fra etichetta del gruppo e contatore (il gruppo si leggeva «Portale4»).
- **Rimandato (non nel frontend)**: lo stato «Da configurare»/«Attenzione» lo calcola il server (`stato` arriva già come `'ok' | 'attenzione' | 'errore'`, VistaSistema commento riga 12-14 e `app/backend/src/oggi.ts`/`sistema.ts`): serve un valore nuovo lato backend, pacchetto V4 a parte (il pacchetto lo dice esplicitamente).
- **Rimandato**: `flex-wrap: nowrap` sulla testata sta in `app/frontend/app/stile/stile.css:92` (`.testa-azioni`), file vietato in questa onda (lo tocca un altro pacchetto). Da fare nell'onda in cui `stile.css` è libero.

## Prove

| Prova | Esito |
|---|---|
| `npx tsc --noEmit` in `app/frontend` | 0 errori |
| `python -m py_compile strumenti/prove/app_accesso.py` | OK |
| `python -m py_compile strumenti/prove/app_eventi.py` | OK |
| `python -m py_compile strumenti/prove/app_sistema.py` | OK (non modificato) |
| `app_accesso.py` (browser) | **da lanciare a fine onda** |
| `app_eventi.py` (browser) | **da lanciare a fine onda** |
| `app_sistema.py` (browser) | **da lanciare a fine onda** |
| `app_guscio.py` (browser) | **da lanciare a fine onda** |

Database di prova: non usato (nessuna prova di backend in questo pacchetto); niente da cancellare.
File toccati (solo ammessi): `app/frontend/componenti/Barra.tsx`, `app/frontend/lib/api.ts`, `app/frontend/app/accesso/esci/page.tsx`, `strumenti/prove/app_accesso.py`, `strumenti/prove/app_eventi.py`, questo resoconto. Nessun file vietato (né `stile.css`, né file backend).

## Da documentare

**Registro §19 — U20** (riga pronta; la scrive il pacchetto documentazione):
> D-… (13/11/2026) — *La barra si rilegge a ogni pagina e a ogni evento.* I contatori della barra laterale (Documenti, Pratiche, Bollettini, problemi di sistema) si ricaricano a ogni cambio pagina **e** a ogni evento SSE delle loro aree, non solo navigando. Perché: arrivando un documento in coda il numero giallo di *Documenti* restava quello vecchio finché non si cambiava pagina (D-23). Chi: Ugo (U20) / DeepSeek V4. Dove: `componenti/Barra.tsx`.

**Spec §16.4.2 (contatori dal vivo) — riga *Perché* pronta:**
> La barra laterale rilegge i contatori a ogni pagina e a ogni evento SSE delle aree `documenti`, `pratiche`, `bollettini`, `sistema` (U20); così il numero accanto alle voci è sempre quello del server senza aspettare un cambio pagina.

**Spec §7.0 / §3.3 (Esci) — nota pronta (facoltativa):**
> *Esci* chiude la sessione sul server e naviga all'accesso **solo dopo** la risposta; una variabile `uscendo` ferma il ricaricamento all'accesso che una richiesta concorrente della pagina vecchia poteva innescare (A6-02).

**Guida (`lib/guida.ts`)**: niente da cambiare (nessun testo d'interfaccia modificato).

**Piano (`piano-lavoro-crm.md`)**: nessuna attività nuova, 0 ore da approvare (correzioni dentro F4-A6/D-23, F5-A5 e §7.0 già previsti).

**Resta aperto (per un pacchetto backend V4):** lo stato «Da configurare» (grigio) dei servizi spenti e «Attenzione» con problemi da vedere sono calcolati dal server; e `flex-wrap: nowrap` sulla testata (`stile.css`) va fatto quando il file non è occupato da un altro pacchetto.

**README**: niente da cambiare.
