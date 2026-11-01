# Avanzamento dell'applicazione (`app/`)

Stato del lavoro passo per passo. Si spunta a ogni consegna (commit). Le attività e le ore
sono quelle di `piano-lavoro-crm.md`; qui c'è l'ordine in cui si fanno e cosa è chiuso.

Regole per ogni passo: si replica il prototipo `prototipo-alternativo/` (struttura, testi,
classi di `stile.css`, numeri); calcoli e controlli solo sul backend (V12, D-28); prove e
schermate a 1440 e 768 px prima di chiudere (niente telefono, D-44); documenti allineati nello stesso commit.

Nomi: l'applicazione si chiama **Decobrands** (titolo, pacchetti, servizi); `decobrands_db` è solo il database, `decobrands` il suo utente.

Nomi del prototipo → database (D-34, D-35): `payment_type` `matured`/`invoiced` → `tipo_provvigione` `maturato`/`fatturato`; `abbinamenti[].discount` → `interscambio.sconto`; `pct_override` → `pct_personale`; `scaglioni[].sconto` → `sconto_min`; `pct_sub` → `pct_subagente`. Il prototipo non si rinomina.

Legenda: `[ ]` da fare · `[~]` in corso · `[x]` fatto

## Blocco 1 — Gestione degli utenti (prima consegna)

Obiettivo: entrare nel CRM solo su invito (Microsoft 365 o link via email) e gestire utenti
e ruoli come in `#/utenti` del prototipo. Attività del piano: F0-A1, parte di F0-A2, F0-A3,
parte di F0-A4 e F0-A5, F5-A3, F5-A4.

| # | Passo | Attività | Fatto |
|---|---|---|:-:|
| 1.1 | Database `decobrands_db` sull'istanza PostgreSQL locale (PG 16, 5432); utente `decobrands` proprietario; nome allineato in spec, piano, PRD, preventivo, `CLAUDE.md` | F0-A2 | [x] |
| 1.2 | Scheletro `app/backend` (NestJS 11, Prisma 7.8 con `adapter-pg`, config, Helmet, validazione DTO che rifiuta i campi non dichiarati, errori generici con codice da cercare nel log) sulla porta 8002, solo `127.0.0.1`; `GET /api/salute`; prova `test/avvio.spec.ts` | F0-A1 | [x] |
| 1.3 | Scheletro `app/frontend` (Next 16.2, React 19.2, TypeScript), `stile.css` e Public Sans copiati dal prototipo senza modifiche, inoltro `/api/*` alla 8002, porta 8001; `avvia.bat`, `.env.example` (intestazioni di sicurezza delle pagine; provato: pagina, inoltro `/api/salute`, Public Sans, schermate 1440/390) | F0-A1 | [x] |
| 1.4 | Schema Prisma **completo** (§4.2, D-33: 22 tabelle, 27 FK, 18 CHECK, anomalia aperta unica, `sessioni.utente_id` generata, eventi del registro immutabili salvo pulizia §15.7 e utente eliminato); migrazione unica `iniziale` (D-33…D-37: interscambio datato, scaglioni a soglia, legami di riconciliazione e liquidazione, niente copie, nomi in italiano); vincoli provati da `npm test` (`test/vincoli.spec.ts`, 18 casi). Manca il seed dei 4 utenti di `dati.js` + utente dei servizi | F0-A2 | [~] |
| 1.5 | `logEvent(tx, …)` nella stessa transazione dell'operazione (V13, D-36), `logEventSicuro()` per accesso, negati ed errori; `SCHEMI` per codice (§15.4: chiavi obbligatorie, codice sconosciuto = errore nelle prove); errori 500 nel registro con il codice mostrato all'utente; prove `test/registro.spec.ts`. Gli eventi `auth/*` si scrivono nei passi 1.6–1.7 | F0-A5 | [x] |
| 1.6 | Sessioni nel database (`express-session` + `connect-pg-simple` sulla tabella `sessioni`, 30 giorni, cookie HttpOnly/SameSite, Secure in produzione), CSRF con token in sessione, guard unico `AccessoGuard` con `@Richiede(permesso)` / `@Pubblica()` e tabella `PERMESSI` = `M.PERMESSI`; rotta senza dichiarazione negata; nella sessione solo `utente_id`, ruolo e `attivo` riletti a ogni richiesta, disattivato = sessione cancellata; `auth.access_denied` nel registro; `apriSessione()` rigenera la sessione (per 1.7); `GET /api/accesso/io` (D-38). Prova `test/accesso.spec.ts` (9 casi). Limite ai tentativi spostato in 1.7, insieme alla rotta del link che limita | F0-A3, F5-A3 | [x] |
| 1.7 | Accesso con nome utente (o email) e password (D-39): hash `scrypt` di `node:crypto` (`src/password.ts`), stesso calcolo anche per utenti inesistenti, "Credenziali non valide" per ogni errore, *Resta collegato* (30 giorni o fino alla chiusura del browser), limite di 10 tentativi in 15 minuti per IP **e** nome utente (un ufficio esce con un solo IP), solo JSON senza sessione (contro il login CSRF), *Esci*; password provvisoria: solo `io`, cambio ed *Esci* finché non si cambia; cambio password che chiude le altre sessioni; nome utente senza `@`. Prova `test/accesso.spec.ts` (17 casi) | F0-A3 | [x] |
| 1.8 | Password dimenticata: link monouso di 1 ora (`accessi_link`, impronta SHA-256, risposta sempre uguale), reimpostazione che chiude tutte le sessioni, link usato una volta anche con due richieste insieme; email in sviluppo nel log, SMTP con le Impostazioni; esito in `ultimo_invio` | F0-A3 | [x] |
| 1.9 | Comando del server per il **superutente** (nome utente, nome, email) con password provvisoria per email; un solo superutente; `npm run superutente -- <nome utente> <email> "<nome>"` (`src/superutente.ts`), prova `test/superutente.spec.ts` | F0-A3 | [x] |
| 1.10 | Pagine di accesso **nel prototipo** (§7.0): componente `CRM.Accesso` (barra con il marchio, pannello centrato), campi `password` (mostra/nascondi) e `casella` del Form, *Esci* nella barra, ritorno alla pagina chiesta, password provvisoria che apre solo il cambio, password dimenticata; pagina Utenti con nome utente, superutente, *Reimposta la password*; tolto Microsoft 365 da Impostazioni; guida, catalogo, LEGGIMI; `flusso.py` 0 KO, schermate 1440/390. Nell'app: `/accesso`, `/accesso/cambia`, `/accesso/dimenticata`, `/accesso/password/[codice]`, `/accesso/esci` con i componenti React `Accesso`, `Campo`, `Icona` (stessi nomi e parametri del prototipo), `lib/api.ts` (token CSRF, messaggi, ritorno solo interno); prova `strumenti/prove/app_accesso.py` (18 controlli sull'app vera). Poi la pagina nuova approvata da Ugo (D-42, D-43): pagina scura col logo, finestra al primo tasto o tocco, Esc / clic fuori / 2 minuti fermi tornano al logo col modulo vuoto, licenza d'uso e copyright; nell'app `ScenaAccesso`, `Modale`, `Licenza`; prova `strumenti/prove/app_scena.py` (33 controlli) | F0-A3 | [x] |
| 1.11 | Guscio `app/(app)/layout.tsx`: a ogni cambio pagina `GET /api/accesso/io` (senza sessione → `/accesso?dopo=`, password provvisoria → cambio); barra per ruolo (`Barra`: gruppi del prototipo, Gestione richiudibile aperta nelle sue pagine, utente con *Esci* e *Cambia la password*), fascia "Profilo in sola lettura" e pulsanti spenti con `body.sola-lettura` di `stile.css`; componenti `Pagina`, `Pannello`, `Pulsante`, `Nota`, `Riservata` ("Pagina riservata"), `InCostruzione` per le pagine non ancora fatte. Corretto in `stile.css` del prototipo lo scorrimento orizzontale a 390 px. Prova `strumenti/prove/app_guscio.py` (16 controlli). `Schede`, `DataTable`, `FilterBar`, `Dettagli`, `FormModal`, `Conferma`, `Avviso` passano all'1.13, dove la pagina Utenti li usa | F0-A4 | [x] |
| 1.12 | API utenti (§8.3): elenco, scheda, nuovo, modifica, disattiva/riattiva, elimina, *Reimposta la password*; vincoli §7.13 (nome utente ed email unici, almeno un amministratore attivo, niente modifiche a sé stessi, l'amministratore non tocca amministratori e superutente, superutente e utente dei servizi protetti) controllati sul server (`src/utenti.ts`, righe bloccate per "almeno un amministratore"); prova `test/utenti.spec.ts` (14 casi); prove su `decobrands_test` (D-40) | F5-A4 | [x] |
| 1.13 | Pagina `/utenti` e `/utenti/:id`: elenco con ricerca e segmenti, scheda *Dati dell'utente* · *Cosa può fare ogni ruolo*, finestre come nel prototipo, "Pagina riservata" per chi non può | F5-A4 · Fatto: componenti React `DataTable`, `FilterBar` (cerca, segmenti), `Schede`, `FormModal`, `Modale`/`Conferma`, `Dettagli`, `Stato`, `avviso` (stessi nomi e markup del prototipo); la pagina sta nel layout di `/utenti`, così il clic su una riga non perde ordinamento, pagina e filtri; rotta `GET /api/utenti/ruoli`; prova `strumenti/prove/app_utenti.py` (26 controlli, 1440 e 768 px) | [x] |
| 1.13b | Ruoli per area (D-45): ruolo di Sistema (superutente, amministratore, utente) + livello per area in `utenti_aree` (migrazione `20261030120000_ruoli_per_area`, chi c'era non perde niente); permessi `area.attività` nel guard e in `io`; barra, *Pagina riservata* e sola lettura decise dal guscio per area; finestra utente con un livello per area; *Cosa può fare ogni ruolo* per area; chi non ha Provvigioni dopo l'accesso va alla prima pagina che può aprire. Prove: server 69, `app_utenti.py` 28 | F5-A4b | [x] |
| 1.14 | Prove: server (`npm test`, 70 su `decobrands_test`: accesso, permessi, livelli per area, vincoli, limite ai tentativi); browser (`strumenti/prove/`): `app_accesso.py` 18, `app_guscio.py` 16, `app_utenti.py` 28, `app_scena.py` 37, a 1440 e 768 px; utenti di prova con `utenti_prova.js`. Trovato e corretto: il logo sbiadito copriva il pulsante della finestra di accesso (un clic richiudeva) | F7 | [x] |
| 1.15 | Documenti: spec 8.2 (D-41 → D-46), piano, `app/README.md` (prove nel browser), registro delle decisioni | — | [x] |
| 1.16 | **Menu per area** (D-47, §7.10): in cima alla barra le aree dell'utente (Provvigioni, Dati, Gestione) a segmenti, sotto le voci dell'area della pagina, Guida comune, *Carica documenti* solo in Provvigioni; sul tablet due righe. L'area *Anagrafiche* diventa **Dati** (migrazione `20261101090000_area_dati`, permessi `dati.*`). Prove: server 70, `app_guscio.py` 20, `app_utenti.py` 28, `app_accesso.py`, `app_scena.py` 37 | F0-A4 | [x] |

## Blocchi successivi (dal piano)

Il modello (Ugo, 01/11/2026): la sessione principale fa eseguire ogni fase dalla skill `fase` e
sceglie il modello dell'agente guardando il lavoro; la colonna *Modello* è un'indicazione.

| Blocco | Contenuto | Modello | Fatto |
|---|---|---|:-:|
| 2a | Schema completo (Prisma, migrazioni, vincoli). Fatto: migrazione `schema_completo` con i CHECK dei valori ammessi che mancavano (§4.2), identità e versioni delle anagrafiche (D-46, anticipato da F1-A7 con D-48: `_versioni` solo aggiunta, `codici_esterni`, chiavi composte sui fatti); spec allineata; prove 82 | Sonnet | [x] |
| 2b | Dati di prova §12 | Sonnet | [ ] |
| 2c | Motore delle provvigioni sul server, prove sui numeri uguali al prototipo | **Opus** | [ ] |
| 2d | Componenti e catalogo `/componenti` (solo `app/frontend`: **insieme a 2b e 2c**) | Sonnet | [ ] |

### Attività F1–F7, con modello e lavoro in parallelo

Un blocco si fa per **gruppi in ordine** (1, 2, 3…): le attività dello **stesso gruppo vanno
insieme**, un agente ciascuna nel suo worktree (`/fase <blocco> parallelo`); il gruppo dopo
parte quando il precedente è unito. *Opus* per regole, soldi, stati, abbinamenti, segreti;
*Sonnet* per pagine, elenchi, esportazioni, sincronizzazioni; *Haiku* per rinomine, ricerche e
piccole correzioni, ovunque.

| Blocco | Attività (piano) | Gruppo | Modello | Fatto |
|---|---|:-:|---|:-:|
| 3 · F1 Dati | F1-A1 Fornitori e scaglioni | 1 | Sonnet | [ ] |
| | F1-A2 Agenti e subagenti | 1 | Sonnet | [ ] |
| | F1-A3 Clienti e agenzie (interscambio) | 1 | Sonnet | [ ] |
| | F1-A4 + F1-A7 Sincronizzazione da Integra con le versioni (serve il ponte, F0-A8) | 2 | Sonnet | [ ] |
| | F1-A5 Percentuali datate ed eccezioni personali | 2 | **Opus** | [ ] |
| | F1-A6 Regole del subagente (D-27): dopo F4-A2, si fa nel blocco 6 | — | **Opus** | [ ] |
| 4 · F2 Pratiche | F2-A1 Elenco pratiche | 1 | Sonnet | [ ] |
| | F2-A3 Documenti fiscali, netto, canale di caricamento | 1 | **Opus** | [ ] |
| | F2-A2 Dettaglio pratica (fasi, righe a confronto) | 2 | Sonnet | [ ] |
| 5 · F3 Bollettini | F3-A1 Matrice e caricamento | 1 | Sonnet | [ ] |
| | F3-A3 Incassi dei clienti, storni e riaccrediti | 1 | **Opus** | [ ] |
| | F3-A2 Dettaglio bollettino (cerniera) | 2 | **Opus** | [ ] |
| 6 · F4 Liquidazioni e Analisi | F4-A1 Trimestri e subagenti con totali, chiusura | 1 | **Opus** | [ ] |
| | F4-A5 Pagina Analisi | 1 | Sonnet | [ ] |
| | F4-A2 Scheda Documenti (liquidabili, storni) | 2 | **Opus** | [ ] |
| | F4-A4 Report subagenti | 2 | Sonnet | [ ] |
| | F4-A6 Filtri standard e numeri aggiornati da soli | 2 | Sonnet | [ ] |
| | F4-A3 Esportazione Excel, PDF, CSV | 3 | Sonnet | [ ] |
| | F1-A6 Regole del subagente | 3 | **Opus** | [ ] |
| 7 · F5 Gestione | F5-A1 Oggi | 1 | Sonnet | [ ] |
| | F5-A2 Pagina del registro | 1 | Sonnet | [ ] |
| | F5-A6 Impostazioni (password e segreti) | 1 | **Opus** | [ ] |
| | F5-A8 Guida | 1 | Sonnet | [ ] |
| | F5-A5 Stato del sistema (dopo F6-A1) e F5-A7 Scartati (dopo F6-A4) | blocco 8 | Sonnet | [ ] |
| 8 · F6 Documenti | F6-A1 Ricezione e coda | 1 | Sonnet | [ ] |
| | F6-A2 Lettura con GLM-OCR | 1 | **Opus** | [ ] |
| | F6-A3 Controlli e proposta di abbinamento | 2 | **Opus** | [ ] |
| | F6-A4 Pagina Documenti e finestra di correzione | 3 | Sonnet | [ ] |
| | F5-A5, F5-A7 | 3 | Sonnet | [ ] |
| | F6-A5 Installazione e taratura | 4 | Sonnet | [ ] |
| 9 · F7 Collaudo | F7-A1 Verifica e prove complete, poi F7-A2 rilascio | 1 | Sonnet | [ ] |
