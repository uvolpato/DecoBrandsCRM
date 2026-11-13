# Resoconto collaudo · Onda 2 · fine correzioni 2 (13/11/2026)

Esecutore: DeepSeek V4 pro · Gravità: P1 · Database di prova: `decobrands_test_2_fine2` (jest, creato e cancellato da me), `decobrands_test_e2e` (browser, da `prepara.sh`).

## Rilievi e correzioni

Gli 8 punti del pacchetto. Per ognuno la causa (a) errore dell'app, (b) prova superata da una decisione dell'onda 2, (c) dati o tempi.

1. **`app_clienti` riga 176 (scheda Pratiche del cliente)** — non riprodotto: passa (46 OK, 0 KO). Era l'effetto del frontend servito da una copia non aggiornata: dopo `prepara.sh` (ricopia del frontend) la prova è verde. Niente da correggere.
2. **`app_documenti` riga 79 (`.abbina-altra input`)** — non riprodotto: passa (59 OK, 0 KO). Stessa causa (copia frontend non aggiornata). Niente da correggere.
3. **`app_eventi` riga 36 (401 → /accesso)** — non riprodotto: passa (18 OK, 0 KO). Niente da correggere.
4. **`app_flusso` riga 246 («Abbina a»)** — non riprodotto: ora è OK. È però emerso un nuovo KO «Fornitori: righe come il server (D-101)», causa **(c)**: `wait_for_selector('.dt tbody tr')` incontrava le righe di sagoma (`.dt tbody tr` senza `.cliccabile`) durante il caricamento e contava 0 righe. Corretto `strumenti/prove/app_flusso.py:490` in `.dt tbody tr.cliccabile`, come fanno già Subagenti e Clienti. Passa 2 volte (188 OK, 0 KO).
5. **`app_pratica` riga 184 («Segna come non pagata»)** — causa **(a)** del test, introdotta nell'onda 2: il blocco A5-02 (`cerca_e_apri(pg, 'OF/2026/038')`) era stato inserito **prima** del blocco F3-A3 e portava su un'altra pratica, così la fattura di prova non era più nel riquadro «Incasso del cliente». Spostato il blocco A5-02 dopo il blocco D-60 (segno Pagato), prima di «D-60: proforma». Passa 2 volte (87 OK, 0 KO).
6. **`app_scartati` (link «N scartati» in Documenti)** — non riprodotto: passa (30 OK, 0 KO). Niente da correggere.
7. **`app_utenti` (permessi «15 = 5 Sistema…»)** — causa **(b)**: 2-03 ha aggiunto il permesso `sistema.connessioni`, quindi la sezione Sistema passa da 5 a 6 permessi. Aggiornata `strumenti/prove/app_utenti.py:57`: conteggio `6 + 4 + 6` (=16) e testo «16 = 6 Sistema, 4 Dati con dati.importa F1-A11, 6 Provvigioni». Passa 2 volte (28 OK, 0 KO).
8. **Rilievo di review 2-03** — corretto `app/backend/src/impostazioni-api.ts`: `controllaConnessione` usava `req.utente?.ruolo !== 'superutente'` invece del permesso dichiarato `sistema.connessioni`. Ora usa `permessiDi(req.utente.ruolo, req.livelli ?? {}).includes('sistema.connessioni')`, come gli altri controlli (D-115). Il guard vale così per chiunque avesse il permesso, non per il ruolo scritto a mano.

## Prove

| Prova | Esito |
|---|---|
| `npx tsc --noEmit` backend | 0 errori |
| `npx tsc --noEmit` frontend | 0 errori |
| `npx jest test/impostazioni.spec.ts` | 20 prove, 0 KO |
| `python -m py_compile` (app_clienti, app_documenti, app_eventi, app_flusso, app_pratica, app_scartati, app_utenti) | OK |
| `app_documenti` (browser) | 59 OK, 0 KO |
| `app_clienti` (browser) | 46 OK, 0 KO |
| `app_eventi` (browser) | 18 OK, 0 KO |
| `app_scartati` (browser) | 30 OK, 0 KO |
| `app_utenti` (browser, 2 volte) | 28 OK, 0 KO |
| `app_flusso` (browser, 2 volte) | 188 OK, 0 KO |
| `app_pratica` (browser, 2 volte) | 87 OK, 0 KO |

Il giro completo delle 20 prove lo lancia Claude Code a fine onda.

## Da documentare

- **Registro §19 — nessuna decisione nuova.** Il punto 8 è la correzione di un bug di 2-03 dentro D-115 (il permesso `sistema.connessioni` dichiarato è quello che vale, non il ruolo scritto a mano). I punti 4, 5, 7 sono correzioni di prove dentro decisioni già scritte (D-101 per i fornitori, D-78/V12 per A5-02, D-45/D-115 per i permessi). Nessuna riga nuova richiesta.
- **Spec**: nessun cambio di sezione né riga *Perché*.
- **Guida**: nessun testo da cambiare.
- **Piano**: nessuna attività nuova, 0 ore da approvare.
