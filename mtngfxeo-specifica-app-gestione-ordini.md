# Specifica applicazione — Gestione Ordini Decobrands (ordini-webapp v1.4.17)

## 1. Scopo
Web app interna (SSR) per la gestione degli **ordini cliente** ricevuti via email/PDF.
Il backend automatico **n8n** scarica le email, invia i PDF a **llamaindex.ai** che — tramite
un **prompt specifico** — restituisce un **JSON** con i dati dell'ordine (testata + tutte le
righe); n8n salva il risultato in PostgreSQL. La web app serve a **consultare, verificare e
correggere** gli ordini,
generare i **CSV per l'ERP Integra**, gestire i **PDF non elaborabili (errori)** e le
**anagrafiche** (clienti, articoli, alias, giacenze, kit, utenti).

## 2. Stack e architettura
- **Node.js + Express 4 + EJS** (server-side rendering), **PostgreSQL** via `pg`.
- Sessione `express-session` in memoria: cookie `httpOnly`, durata **8h**.
  "Ricordami": tabella `remember_tokens`, token SHA-256, 30 giorni.
- **bcryptjs** (costo 12) per le password; reset password via email (nodemailer, token valido 1h).
- **multer** upload PDF (→ cartella `/pdf_da_elaborare` + coda), **xlsx** import/export, **dotenv**.
- **Real-time**: `GET /api/ordini/stream` (SSE) + `pg_notify` per nuovi ordini/errori.
- Porta **8000**, avvio `node server.js` (servizio/container). Config cliente: `config.js`
  (`perPagina` 25, `retentionMesi` 6, logo, `uploadDir`).
- All'avvio `initDB()` (webapp/init.js) applica **migrazioni idempotenti** (CREATE IF NOT EXISTS,
  ADD COLUMN IF NOT EXISTS, trigger). Audit automatico via trigger PG.
- Utente DB: `n8n_user`. Nome DB condiviso: `decobrands` (default `postgres`, override env).

## 3. Funzionalità
### Auth (`routes/auth.js`) — tutti i ruoli
- `/login`, `/logout`, `/cambia-password` (obbligatorio se `must_change_password`), `/richiedi-reset`, `/reset-password`.
- Ruoli: `operator` (operatore), `admin` (gestione completo); `n8n` = utente di sistema, disabilitato.
- Login per `username` o `email`. Middeware `requireAuth` / `requireAdmin`.

### Ordini (`routes/ordini.js`) — operatori
- `/ordini`: lista paginata (25/pag) con filtri; `/ordini/:id`: dettaglio + righe articolo.
- CRUD ordine e righe: `GET/PUT /api/ordini/:id`, `POST /api/ordini/:id/righe`,
  `PUT/DELETE /api/ordini/:id/righe/:rid`.
- **Controlli di coerenza**: `/api/ordini/piva-check` (codice integra cliente) e
  `/api/ordini/articoli-check` (codici articolo con anagrafica/alias).
- **Upload manuale PDF** (`POST /api/ordini/upload` → cartella + `ordini_upload_queue`),
  coda `/api/ordini/upload/queue`; operazioni su item di coda: `forza-order`,
  `rielabora`, `DELETE` (elimina).
- **SSE** `/api/ordini/stream` (aggiornamento live lista).

### Export CSV (`routes/csv.js`) — operatori
- `GET /api/ordini/:id/csv` — CSV analitico dell'ordine.
- `GET /api/ordini/:id/csv-integra` + `POST .../conferma` — CSV **per Integra** e conferma
  generazione (setta `csv_creato=true`).
- `PUT /api/ordini/:id/csv-reset` — riapre l'ordine per rigenerare il CSV.

### PDF originali (`routes/pdf.js`) — operatori
- `GET /api/ordini/:id/pdf`, `GET /api/errori/:id/pdf` — restituisce il PDF originale
  (da `doc_originale` bytea o da disco in `/pdf_files`, con recupero in sottocartelle `YYYY_MM_GG`).
- Archiviazione PDF giornaliera alle 23:55 (`scripts/archivia-pdf.js`).

### Errori di elaborazione (`routes/errori.js`) — operatori
- `/errori`, `GET /api/errori`, `/api/errori/:id`, `/api/errori/count` (badge navbar, cache TTL 10s).
- Marcatura visto/risolto: `PUT /api/errori/:id/seen`/`/unseen` (alias `resolve`/`unresolve`).
- Notifica live "nuovo errore" (badge in tempo reale) via `pg_notify` + SSE.

### Anagrafiche (solo **admin**)
- `clienti` (`routes/clienti.js`): `/clienti`, `/api/clienti`, import XLSX, template download, delete.
  Serve per risalire a `codice_integra` a partire da P.IVA.
- `utenti` (`routes/utenti.js`): `/utenti`, CRUD, reset password (admin forza il cambio alla prossima login).
- `audit` (`routes/audit.js`): `/audit` — storico modifiche su ordini/righe.
- `articoli` (`routes/articoli.js`): `/articoli`, import XLSX anagrafica da Integra.
- `alias` (`routes/alias.js`): `/codici-alias` (vecchio→nuovo codice, import, CRUD), `/giacenze`
  (import export Integra, `/api/giacenze/info`).
- `kit` (`routes/kit.js`): `/kit` — testata + dettaglio componenti, CRUD.
- `lookup` (`routes/lookup.js`): autocomplete `/api/lookup/articoli`, `/api/lookup/clienti`.

## 4. Schema database (schema `public`, owner `n8n_user`)
Nota: il dump `sql/backup_db.sql` (Postgres 16) contiene 9 tabelle; `init.js` crea in più le tabelle
anagrafiche `articoli`, `giacenze`, `movimenti_giacenza`, `kit_testata`, `kit_dettaglio`, `codici_alias`
e aggiunge colonne a `users`. Schema "di fatto" dell'app (fonte: `init.js` + dump):

### users
| colonna | tipo | note |
|---|---|---|
| id | integer PK | |
| username | text UNIQUE | |
| password_hash | text | bcrypt cost 12; n8n = `$DISABLED$` |
| created_at | timestamptz | |
| role | varchar(20) | `operator` (default), `admin`, `n8n` |
| enabled | boolean | default true |
| is_system | boolean | true per admin, n8n (non modificabili da UI) |
| email | varchar(255) | login by username o email |
| must_change_password | boolean | |
| reset_token | varchar(128) | |
| reset_token_expires_at | timestamptz | |
| last_email_at / last_email_error | timestamptz / text | invio email reset |

Utenti nel DB: `admin` (admin), `ugo` (operator), `n8n` (system, disabled).

### remember_tokens
| colonna | tipo | note |
|---|---|---|
| id | integer PK | |
| user_id | integer FK→users (ON DELETE CASCADE) | |
| token_hash | text UNIQUE | SHA-256 del token |
| expires_at | timestamptz | |
| created_at | timestamptz | |

### clienti
| colonna | tipo | note |
|---|---|---|
| id | bigint PK | |
| piva | varchar(20) UNIQUE | |
| ragione_sociale | varchar(255) | |
| codice_integra | varchar(50) | codice cliente in Integra |
| created_at / updated_at | timestamptz | |

### ordini_cliente_testata
| colonna | tipo | note |
|---|---|---|
| id | integer PK | |
| cliente_ragione_sociale | text | |
| cliente_piva | varchar(20) | |
| fornitore | text | |
| numero_ordine | varchar(50) | UNIQUE con cliente_piva |
| data_ordine | date | |
| totale_generale | numeric(15,4) | |
| rif_nro_ordine_fornitore | text | |
| email_from | text | |
| att_filename | text | nome PDF; dedup con numero_ordine |
| elaborato_il | timestamptz | |
| data_inserimento | timestamptz | |
| doc_originale | bytea | PDF originale (una tantum per backup volume) |
| csv_creato | boolean | false = da esportare |
| csv_creato_il | timestamptz | |
| codice_integra | varchar(50) | popolato da trigger su `clienti` (P.IVA) |

### ordini_cliente_articoli
| colonna | tipo | note |
|---|---|---|
| id | integer PK | |
| testata_id | integer FK→testata (ON DELETE CASCADE) | |
| numero_riga | integer | |
| codice_interno | text | codice articolo / alias |
| codice_fornitore | text | |
| descrizione | text | |
| um | varchar(10) | |
| quantita | numeric(15,4) | |
| prezzo_unitario | numeric(15,4) | |
| aliquota_iva | numeric(5,2) | |
| totale_riga | numeric(15,4) | |

### ordini_upload_queue (upload PDF via web)
| colonna | tipo | note |
|---|---|---|
| id | bigint PK | |
| file_path | text | path del file in `/pdf_da_elaborare` |
| filename | text | |
| stato | text | `pending` (default) → processo n8n |
| errore | text | |
| utente | varchar(100) | |
| created_at / processed_at | timestamptz | |

### processing_errors
| colonna | tipo | note |
|---|---|---|
| id | integer PK | |
| error_timestamp | timestamptz | default now() |
| email_from / email_subject | text | |
| att_filename | text | |
| error_message / error_step | text | |
| raw_input | text | JSON contesto estrazione |
| doc_originale | bytea | allegato non elaborabile |
| resolved | boolean | default false |
| resolved_at | timestamptz | |
| note | text | |

### audit_log
| colonna | tipo | note |
|---|---|---|
| id | bigint PK | |
| created_at | timestamptz | index DESC |
| app_user | varchar(100) | default `n8n` |
| operation | varchar(10) | INSERT/UPDATE/DELETE |
| table_name | varchar(100) | |
| record_id | bigint | |
| data_before / data_after | jsonb | per righe: `{testata, riga}` |

### _audit_pending (aggregazione INSERT testata+righe da n8n)
| colonna | tipo | note |
|---|---|---|
| id | integer PK | |
| testata_id | bigint UNIQUE | |
| app_user | varchar(100) | |
| testata_json | jsonb | righe lette dopo 10s |
| queued_at | timestamptz | |

`consolidatePendingAudits` (ogni 15s) trasforma le INSERT n8n in un unico `audit_log` + broadcast SSE.

### Tabelle anagrafiche (create da init.js)
- **articoli**: `codice` varchar(100) PK, `descrizione`, `ean`, `um`, `created_at`, `updated_at`.
- **giacenze**: `id` PK, `codice` UNIQUE, `qta_disponibile` numeric(12,3) (ex `qta_magazzino`), `aggiornato_il`.
- **movimenti_giacenza**: `id` PK, `codice`, `tipo` CHECK IN (`IMPORT`,`SCARICO`,`RICARICO`), `qta`,
  `saldo_dopo`, `ordine_id`, `note`, `created_at`.
- **kit_testata**: `codice` PK, `descrizione`, `attivo`, `created_at`.
- **kit_dettaglio**: `id` PK, `codice_kit` FK→kit_testata (CASCADE), `codice_componente`, `qta`, `ordinamento`.
- **codici_alias**: `id` PK, `codice_vecchio` UNIQUE, `codice_nuovo`, `descrizione`, `ean`,
  `necessita_conferma` (default true), `created_at`.

### Funzioni PL/pgSQL
| funzione | tipo | ruolo |
|---|---|---|
| `inserisci_ordine_cliente(jsonb)` → `(testata_id, gia_presente)` | FUNCTION | usata da n8n: inserisce testata+righe; rifiuta duplicati `numero_ordine`+`att_filename` (exception `ORDINE_DUPLICATO`) |
| `inserisci_processing_error(jsonb)` → integer | FUNCTION | usata da n8n: scrive `processing_errors` (file doc in base64) |
| `fn_audit_log()` | TRIGGER | scrive `audit_log` su INSERT/UPDATE/DELETE di testata e articoli; skippabile con `app.skip_audit=true`; utente da `app.current_user` |
| `fn_notify_new_error()` | TRIGGER | `pg_notify('new_processing_error', id)` su INSERT in `processing_errors` |
| `fn_testata_set_codice_integra()` | TRIGGER | BEFORE INSERT su testata: setta `codice_integra` da `clienti` per P.IVA |

### Trigger
- `trg_audit` — AFTER INSERT/UPDATE/DELETE su `ordini_cliente_testata` e `ordini_cliente_articoli`.
- `trg_notify_error` — AFTER INSERT su `processing_errors`.
- `trg_set_codice_integra` — BEFORE INSERT su `ordini_cliente_testata`.

### Vincoli e indici principali
- UNIQUE: `clienti.piva`, `ordini_cliente_testata(cliente_piva, numero_ordine)`,
  `users.username`, `remember_tokens.token_hash`; UNIQUE index `_audit_pending(testata_id)`.
- FK: `ordini_cliente_articoli.testata_id → ordini_cliente_testata(id) ON DELETE CASCADE`;
  `remember_tokens.user_id → users(id) ON DELETE CASCADE`.
- Indici: `idx_testata_csv_elab(csv_creato, elaborato_il DESC NULLS LAST)`,
  `idx_testata_elaborato`, `idx_testata_piva`, `idx_articoli_testata_id`,
  `idx_audit_log_created_at DESC`, `idx_audit_log_app_user`, `idx_audit_log_operation`,
  `idx_upload_queue_stato(stato, created_at)`, `idx_users_username`, `idx_clienti_piva`,
  `idx_remember_tokens_hash`, `idx_alias_vecchio`, `idx_giacenze_codice`, `idx_kit_dettaglio_kit`,
  `idx_movimenti_codice/ordine/tipo`.

## 5. Flusso dati end-to-end
1. **n8n** legge la casella → invia il PDF a **llamaindex.ai** (`https://www.llamaindex.ai/`);
   il **prompt specifico** fa estrarre al modello un **JSON** con i dati dell'ordine
   (testata: cliente, P.IVA, fornitore, numero ordine, data, totale, ecc. —
   righe: codice articolo, descrizione, quantità, prezzo, IVA, totale riga) →
   `inserisci_ordine_cliente()` (o `inserisci_processing_error()` in caso di errore) —
   inserimenti in autocommit.
2. Trigger `trg_audit` accoda in `_audit_pending`; dopo 10s `consolidatePendingAudits` scrive `audit_log` unico e **broadcast SSE `new-order`**.
3. L'operatore in `/ordini` vede in tempo reale i nuovi ordini; verifica P.IVA (`piva-check`), codice articolo (`articoli-check`/alias) ed eventualmente corregge righe/prezzi.
4. Genera **CSV Integra** (`csv-integra` → conferma → `csv_creato=true`); n8n esporta il CSV verso l'ERP.
5. Eventuali PDF non estraibili finiscono in `/errori` con notifica SSE; l'operatore li risolve o scarica l'allegato.
6. Upload manuale di PDF (operatori) → `ordini_upload_queue` → processo n8n.
7. Jobs automatici: `cleanupOldData` ogni 24h (audit_log e processing_errors > 6 mesi), archiviazione PDF alle 23:55.