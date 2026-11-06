# Resoconto — F6-A1 Ricezione dalla casella email e coda

Attività completata. Decisione nuova **D-66** (§19). Nessun commit/push, nessuna modifica a
`.env`, `avanzamento-app.md` o `prototipo-alternativo/`.

## File toccati

| File | Cosa |
|---|---|
| `app/backend/src/casella.ts` | **nuovo**: `ConfigCasella`, `AllegatoEmail`, `MessaggioEmail`, `CasellaAperta`, `ApriCasella`, `apriImap` (unico punto che conosce imapflow), `giroCasella`, `CasellaService` (`forse`/`esegui`, `onModuleInit`/`onModuleDestroy`) |
| `app/backend/src/documenti.ts` | aggiunte `prelevaDocumento` e `letturaFallita` (coda per il lettore, senza rotte) |
| `app/backend/src/registro.ts` | `SCHEMI`: `documento.upload` rilassato a `['documento_id','file_nome']`; aggiunti i codici anomalia `casella.*` e `lettura.fallita` |
| `app/backend/src/app.module.ts` | registrato `CasellaService` nei provider |
| `app/backend/package.json` | aggiunte `mailparser` e `@types/mailparser` (dev) |
| `app/backend/test/casella.spec.ts` | **nuovo**: giro con casella finta, anomalie, servizio pianificato |
| `app/backend/test/coda.spec.ts` | **nuovo**: `prelevaDocumento`/`letturaFallita` |
| `specifica-crm-provvigioni.md` | versione **8.41**; §6.5 punti 1–2, §7.14.1, §7.14.3, §15.2.4 confermato, §19 **D-66** |
| `app/frontend/lib/guida.ts` | argomento *Documenti*: «Carica PDF e foto», flusso allineato (ritmo da Impostazioni → Casella, niente Excel) |
| `piano-lavoro-crm.md` | riga F6-A1 allineata (nessuna ora nuova) |
| `prototipo-crm/specifica.html`, `prototipo-crm/preventivo.html` | rigenerati da `strumenti/genera-pagine-doc.py` |

## Forma della configurazione letta

`casellaConfig(db)` di F5-A6, decifrata: `{ server, porta, utente, password, cartella,
cartella_lette, minuti }`. Se mancano server, utente, password o una delle due cartelle il giro
non parte e **nessuna anomalia** si apre. La configurazione si rilegge a ogni giro.

## Comportamento del giro (`giroCasella`)

- Apre la casella (`apri` = seam), scorre i messaggi uno alla volta; per ogni allegato chiama
  `riceviDocumento` con `{nome, dati, origine:'email', email_da, email_oggetto}` e contesto vuoto.
- `ConflictException` (stesso `file_hash`) = doppione: conta fra gli ignorati, nessuna anomalia.
- `UnsupportedMediaTypeException` / `PayloadTooLargeException` = ignorato + anomalia
  `casella.allegato` (attenzione, chiave = nome file, testo fisso col nome).
- Email senza allegati = anomalia `casella.vuota` (attenzione, chiave = oggetto); un'email con
  allegati tutti ignorati **non** è vuota.
- Ogni email lavorata si **sposta** nella cartella delle lette (anche con allegati ignorati); se
  lo spostamento fallisce si logga e si prosegue, il giro dopo la ritrova e i doppioni si scartano.
- `chiudi` sempre nel `finally`. Ritorna `{email, presi, ignorati, esito:'ok'|'attenzione'|'errore'}`.
- Scrive una riga `servizi_esecuzioni` (`servizio='casella'`, `tipo='lavoro'`, `avviato_da=null`)
  con `esito`, `testo` in italiano e `misure = {email, allegati: presi, ignorati, connessione}`.
- `casella.connessione` (errore): si apre dopo **3 giri di fila** con esito `errore` per
  connessione; si chiude al primo giro riuscito (stesso schema di `controllaConnessione` integra).
- `casella.cartella` (errore): si apre **subito** quando manca una delle due cartelle; si chiude
  quando ci sono entrambe. `casella.allegato` e `casella.vuota` non si chiudono da sole.
- `CasellaService`: `onModuleInit` avvia un `setInterval` di 60 s (non in test), `onModuleDestroy`
  lo chiude; `forse()` rispetta `minuti` e non parte senza configurazione o con un giro in corso;
  `esegui()` fa un giro subito ignorando l'attesa (metodo pubblico per *Controlla adesso* di
  F5-A5). **Nessuna rotta HTTP aggiunta.**

## Contratto per F6-A2 (`documenti.ts`)

- `prelevaDocumento(db)` → `{id: bigint, file_nome, file_percorso, tentativi} | null`: in una
  transazione `SELECT id, file_nome, file_percorso, tentativi … WHERE stato='in_coda' ORDER BY
  ricevuto_il, id FOR UPDATE SKIP LOCKED LIMIT 1`, poi `stato='in_lettura'`, `tentativi+1`.
- `letturaFallita(db, id, errore)` → `'in_coda' | 'errore' | <stato attuale>`: in una transazione
  blocca la riga e la rilegge; se `tentativi >= 3` porta `errore` con evento `documento/upload`
  esito `errore` e anomalia `lettura.fallita`; altrimenti torna `in_coda` con `errore` valorizzato.
  Se la riga non è `in_lettura` non si tocca.

## Prove (Jest, `decobrands_test`, nessuna rete)

- `npx tsc --noEmit` → 0 errori; `npm run build` → ok.
- `npx jest --runInBand` → **28 suite, 373 test, 0 KO** (incluse le 12 nuove: 7 casella + 5 coda).
- `test/casella.spec.ts`: PDF+Excel → una riga `in_coda`/evento/ignorato/anomalia; doppione → una
  riga; email vuota → `casella.vuota`; `sposta` per ogni email; connessione 3 volte → `casella.connessione`
  poi chiusa; cartella mancante → `casella.cartella` subito; configurazione incompleta → nessun
  giro; `forse()` rispetta `minuti`.
- `test/coda.spec.ts`: coda vuota null; prende il più vecchio; 1 tentativo → `in_coda`, 3 → `errore`
  + evento + anomalia; riga non `in_lettura` intatta.

## Cosa resta aperto

- **Casella IMAP vera**: qui non c'è un server IMAP; `apriImap` è provato solo per i tipi, non con
  una connessione reale (percorsi, `messageMove`, `list`, codifiche degli allegati). Da verificare
  con la casella di Matteo/Ugo.
- Avviso `pg` «client.query() when already executing» presente in output (pre-esistente, dal ponte
  di integra/prove, non dal nuovo codice): da tenere d'occhio.
- `misure` del giro ha in più il flag `connessione` (come `ponte` di integra) per il conteggio dei
  3 giri falliti: non è in §7.14.1, va bene per lo Stato del sistema (F5-A5).
- `SCHEMI['documento.upload']` ora richiede solo `documento_id` e `file_nome` perché lo stesso
  codice serve il successo (con `dimensione`/`origine`) e l'errore (con `tentativi`/`errore`).
