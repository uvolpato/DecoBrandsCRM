# Resoconto · Collaudo onda 1 · Pacchetto 1-12 — SSE che si riapre dopo un errore HTTP

Data: 12/11/2026 · Esecutore: DeepSeek V4 Flash · Rilievi: A5-12 (P2) · Esito: **corretto**, prove di sintassi e tipi a 0 errori; prova nel browser da lanciare a fine onda.

## Cosa ho fatto

### A5-12 — Canale SSE chiuso per sempre dopo un 502 o una sessione scaduta

- `app/frontend/lib/eventi.tsx:18-52` — la fonte è ora creata da `apri()`, richiamabile: espone `onmessage` e un `onerror` che, se `readyState === EventSource.CLOSED`, riapre dopo 15 s (`clearTimeout` prima di ogni nuovo timer, così non si accumulano). La fonte corrente sta in `fonte` e viene chiusa nel cleanup; `attivo` impedisce di riaprire dopo lo smontaggio e `clearTimeout` annulla il timer. La riconnessione nativa di `EventSource` resta valida per le cadute di rete (in quel caso `readyState` è `CONNECTING`, non `CLOSED`, quindi non si duplica). Commento aggiornato con il rimando ad A5-12.
- `strumenti/prove/app_eventi.py:1-8, 68-91` — nuova verifica all'inizio, dopo l'accesso: si installa un `page.route('**/api/eventi/flusso', …)` che risponde **502 una sola volta**, si ricarica la scheda A, si conta le richieste al flusso e si attende (fino a 25 s) che arrivi la **seconda** richiesta, quella della riapertura automatica. Poi la rotta finta si toglie (`unroute`) e la prova continua come prima: la barra *Ci sono aggiornamenti · Aggiorna* e i contatori che cambiano dimostrano che dopo la riapertura gli eventi del server tornano a essere ricevuti.

Nessuna deviazione dalla *Correzione puntuale*: stessa soglia (15 s), stesso `readyState === EventSource.CLOSED`, nessuna modifica al backend.

### Correlato A1 — le riconnessioni SSE non rinnovano il timeout di inattività (D-89)

Verificato in `app/backend/src/accesso.ts:187-200`: `AccessoGuard` aggiorna `session.ultimo` solo se `x-automatico !== '1'` **e** la richiesta non è `GET /api/eventi/flusso`. Quindi anche le riaperture introdotte qui non tengono viva la sessione. **Nessuna modifica necessaria** (il file è comunque vietato a questo pacchetto).

## Prove

| Prova | Esito |
|---|---|
| `cd app/frontend && npx tsc --noEmit` | 0 errori |
| `python -m py_compile strumenti/prove/app_eventi.py` | OK |
| `git diff --name-only` / `git status --short` | toccati solo `app/frontend/lib/eventi.tsx` e `strumenti/prove/app_eventi.py` (gli altri file sporchi sono dei pacchetti in parallelo) |
| Database di prova | non usato: nessuna prova del backend in questo pacchetto, nessun database creato |

**Prove nel browser da lanciare a fine onda** (non lanciate qui, porte e `.next` condivisi):

- `python strumenti/prove/app_eventi.py <suffisso> <cartella-schermate> [base]` — 16 controlli, di cui 1 nuovo (A5-12: riapertura della fonte dopo il 502). Il nuovo controllo aggiunge ~15 s di attesa per la riapertura; la verifica degli eventi successivi resta quella già esistente (barra e contatori), con timeout 30 s.

## Da documentare

Nessuna nuova decisione: è l'attuazione di **D-23** (§16.4.2), non una regola nuova, quindi **nessuna riga D-nn** nel §19 e **nessuna voce di guida** (per chi usa l'app non cambia nulla: dopo un riavvio del backend gli aggiornamenti riprendono da soli, senza ricaricare la pagina). Nessuna ora da aggiungere al piano.

Testo pronto per la spec, §16.4.2, coda del paragrafo **Nell'app (F4-A6)** dopo la riga 4258 (`EventiProvider`… si chiude con la scheda e all'uscita):

> Se il canale si chiude per un errore HTTP (502 durante un riavvio del backend, 401) `EventSource`
> non riprova da solo: il guscio riapre la fonte dopo 15 s, senza avvisi e senza ricaricare la pagina.
> Le riaperture non contano come attività per il timeout di inattività (D-89).

README: niente da aggiungere.
