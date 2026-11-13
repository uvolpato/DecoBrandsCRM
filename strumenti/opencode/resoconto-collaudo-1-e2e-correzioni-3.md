# Resoconto · Collaudo Onda 1 · 1-e2e · correzioni 3

Esecutore: DeepSeek Flash · 13/11/2026 · solo prove, nessun codice dell'app.

## Rilievi e correzioni

1. **`app_bollettino.py` riga 262–273 — «Carica» si blocca se il mese è già preso (causa c)**.
   - `app_bollettini.py` (riga 122) carica già il bollettino di Ing's 9/2026: nel giro il server
     risponde 409 «Il bollettino di 9/2026 di Ing's c'è già» e l'errore esce nel modulo, non
     nell'avviso: la prova aspettava `.avviso` per 30 s.
   - Modifica: prima del caricamento si legge dal server (`GET /api/bollettini?al=AAAA-MM`) il
     primo mese del 2026 in cui Ing's c'è e non ha il bollettino; quel mese va in `#c-mese` e
     nella verifica `id_bollettino`. Se non c'è nessun mese libero, `ok(False, …)`.
   - In più, dopo «Carica» si aspetta `.avviso:not([hidden]), .velo .modulo-errore:not([hidden])`
     (il selettore dell'errore verificato in `VistaBollettini.tsx`: `p.modulo-errore[role=alert]`):
     se esce l'errore la prova fallisce subito con il suo testo.
   - Le prove del PDF restano, solo dentro `if nuovo`: se il caricamento non è riuscito si segna
     `ok(False, …)`, il controllo non sparisce.

2. **`app_registro.py` riga 70 — conteggio delle righe letto troppo presto (causa c, tempi)**.
   - Il piede si aggiorna prima delle righe della tabella.
   - Modifica: dopo il piede si aspetta
     `document.querySelectorAll('.dt tbody tr').length === attese` (`attese =
     min(per_pagina, errori_api['totale'])`, `per_pagina` preso una volta sola) e poi si conta; il
     messaggio del KO porta i due numeri.

## Prove

Database `decobrands_test_e2e` rifatto da zero prima di ogni giro
(`prepara.sh` + `giro.sh`), sequenza `app_bollettini app_bollettino app_registro`, due volte di
fila:

| Giro | app_bollettini | app_bollettino | app_registro |
|---|---|---|---|
| 1° (DB nuovo) | 23 OK, 0 KO | 43 OK, 0 KO | 28 OK, 0 KO |
| 2° (DB nuovo) | 23 OK, 0 KO | 43 OK, 0 KO | 28 OK, 0 KO |

- `app_bollettino`: «un mese del 2026 libero per Ing's» OK, «bollettino nuovo caricato: presente
  nella matrice (2026-01)» OK, PDF col canvas > 0 OK.
- `app_registro`: «segmento Errori: 5 righe (piede: 5 elementi)» OK e «il segmento restringe
  davvero le righe (5 attese, 5 a schermo)» OK.
- `python -m py_compile` sulle due prove: ok. Nessun codice dell'app toccato, `tsc` non serve.

## Da documentare

- Nessuna decisione nuova, nessuna modifica all'app: solo prove, niente da mettere in spec §19 né
  nella Guida.
- Nota per il collaudo: `app_bollettino` ora dipende da un mese del 2026 ancora libero per Ing's
  (ne trova uno letto dal server, quindi regge anche col bollettino 9/2026 già caricato da
  `app_bollettini`).
- Resta aperto solo il giro completo di Claude Code (25 prove), da rilanciare lui.
