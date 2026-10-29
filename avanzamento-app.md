# Avanzamento dell'applicazione (`app/`)

Stato del lavoro passo per passo. Si spunta a ogni consegna (commit). Le attività e le ore
sono quelle di `piano-lavoro-crm.md`; qui c'è l'ordine in cui si fanno e cosa è chiuso.

Regole per ogni passo: si replica il prototipo `prototipo-alternativo/` (struttura, testi,
classi di `stile.css`, numeri); calcoli e controlli solo sul backend (V12, D-28); prove e
schermate a 1440 e 390 px prima di chiudere; documenti allineati nello stesso commit.

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
| 1.5 | `logEvent(tx, …)` nella stessa transazione dell'operazione (V13, D-36), formato `dettaglio` §15.4; eventi `auth/*` §15.2.1 | F0-A5 | [ ] |
| 1.6 | Sessioni (`express-session` + `connect-pg-simple`), CSRF, throttler; guard `requireAuth` su tutto e `requirePermesso()` con la tabella `M.PERMESSI` (§8.3); nega se manca la dichiarazione | F0-A3, F5-A3 | [ ] |
| 1.7 | Link via email: richiesta con risposta sempre uguale, codice monouso (SHA-256, 15 min; invito 7 giorni; uno nuovo annulla i precedenti), `GET /accesso/:codice`, logout; invio SMTP con esito in `ultimo_invio` | F0-A3 | [ ] |
| 1.8 | Microsoft 365: OpenID Connect con `openid-client`, PKCE, un tenant, legame su `microsoft_oid`; rifiuto di chi non è invitato o è disattivato. **Rimandato** a quando c'è la registrazione in Entra ID: intanto si entra con il link | F0-A3 | [ ] |
| 1.9 | Comando del server per il primo amministratore (email, nome) che manda l'invito | F0-A3 | [ ] |
| 1.10 | Pagina di accesso: **prima nel prototipo** (oggi non c'è), da far approvare, poi nell'app | F0-A3 | [ ] |
| 1.11 | Guscio: barra laterale per ruolo con gruppo Gestione, testata, fascia "Profilo in sola lettura", *Esci*; componenti React per la pagina Utenti (Pagina, Pannello, Schede, DataTable, FilterBar, Dettagli, Form/FormModal, Conferma, Avviso, Nota) con nomi e parametri di `componenti.js` | F0-A4 | [ ] |
| 1.12 | API utenti (§8.3): elenco, scheda, nuovo, modifica, disattiva/riattiva, elimina, invito, link; vincoli §7.13 (email unica, almeno un amministratore attivo, niente modifiche a sé stessi, utente dei servizi protetto) controllati sul server | F5-A4 | [ ] |
| 1.13 | Pagina `/utenti` e `/utenti/:id`: elenco con ricerca e segmenti, scheda *Dati dell'utente* · *Cosa può fare ogni ruolo*, finestre come nel prototipo, "Pagina riservata" per chi non può | F5-A4 | [ ] |
| 1.14 | Prove: Jest + supertest su accesso, permessi e vincoli (anche Microsoft non invitato, link scaduto o usato); Playwright sulla pagina confrontata col prototipo; schermate 1440/390 px | F7 | [ ] |
| 1.15 | Documenti: spec (versione, §19 se serve), piano, `app/README.md`; `genera-pagine-doc.py` | — | [ ] |

## Blocchi successivi (dal piano)

| Blocco | Contenuto | Fatto |
|---|---|:-:|
| 2 | Resto della Fase 0: schema completo e seed §12, motore sul server con i test numerici, tutti i componenti e il catalogo `/componenti` | [ ] |
| 3 | F1 Anagrafiche (fornitori, subagenti, clienti; lettura dal database ponte di Integra) | [ ] |
| 4 | F2 Pratiche | [ ] |
| 5 | F3 Bollettini | [ ] |
| 6 | F4 Liquidazioni e Analisi | [ ] |
| 7 | F5 Oggi, Stato del sistema, Impostazioni, Scartati, Guida | [ ] |
| 8 | F6 Ingresso documenti (casella, GLM-OCR) | [ ] |
| 9 | F7 Collaudo e rilascio | [ ] |
