# Piano delle correzioni — collaudo finale Decobrands CRM (`app/`)

Versione 2 — 11/11/2026. Orchestratore (ORC) secondo `piano-collaudo-multiagente.md` §4. Fonti: i 9 report del collaudo (A1…A9, 08/11) e i 3 report sulle ultime modifiche (R0, R1, R2: commit 89a4105..e879c62, 11/11) in `strumenti/collaudo/report/`. Prompt dei pacchetti in `strumenti/opencode/collaudo-*.md`.

Cosa cambia dalla versione 1: le decisioni U1…U27 di Ugo sono applicate (niente più «onda in attesa»: i pacchetti sono nelle onde 1–8 e i prompt rinumerati); le decisioni nuove hanno i numeri **D-114…D-139** (i D-100…D-113 li hanno occupati i commit 48c317b..e879c62, vedi *Conversione dei numeri D*); nuova **onda 0 bis** con i rilievi R0–R2; nuovo pacchetto **0-05** (migrazione `sconti` RESTRICT); migrazioni dell'onda 0 rinominate `20261113…` (vedi *Avvertenze*).

## Totali

| | P0 | P1 | P2 | P3 | Totale |
|---|---|---|---|---|---|
| Rilievi dei report A1…A9 | 2 | 13 | 58 | 60 | 133 |
| Dopo l'unione dei doppioni | 2 | 11 | 53 | 55 | 121 |
| Rilievi R0–R2 (ultime modifiche), più R0-D5…D7 dalle domande | 1 | 2 | 12 | 15 | 30 |

- Scartati senza scenario: **0**.
- Pacchetti di codice: **74**; più **10** pacchetti documentazione (uno per onda). Prompt: **84**.
- Onde: **0, 0 bis, 1…8** (10 onde).

| Onda | Pacchetti di codice | V4 | V4 Flash | P0 | P1 | P2 | P3 |
|---|---|---|---|---|---|---|---|
| 0 (in serie) | 5 | 5 | 0 | 0 | 1 | 1 | 3 |
| 0 bis | 6 | 4 | 2 | 2 | 0 | 2 | 2 |
| 1 | 24 | 8 | 16 | 2 | 5 | 13 | 4 |
| 2 | 14 | 7 | 7 | 0 | 3 | 8 | 3 |
| 3 | 10 | 5 | 5 | 0 | 0 | 9 | 1 |
| 4 | 6 | 1 | 5 | 0 | 0 | 5 | 1 |
| 5 | 5 | 4 | 1 | 0 | 0 | 5 | 0 |
| 6 | 2 | 1 | 1 | 0 | 0 | 1 | 1 |
| 7 | 1 | 0 | 1 | 0 | 0 | 0 | 1 |
| 8 | 1 | 0 | 1 | 0 | 0 | 0 | 1 |
| **Totale** | **74** | **35** | **39** | **4** | **9** | **44** | **17** |

### Doppioni uniti (si tengono tutti gli ID)

| Rilievo unito | ID d'origine | Gravità | Pacchetto |
|---|---|---|---|
| Agenzie modificabili nel periodo chiuso (D-51/D-35) | A2-01 (punto 1), A3-01, A6-12 | P0 | 1-02 |
| Storno dalla fotografia della liquidazione | A2-01 (punto 2), A2-02 | P0 | 1-01 |
| Pulizia scartati senza ricontrollo | A4-09, A3-04 | P2 | 1-09 |
| Blocco sotto i 744 px (D-44) | A5-03, A6-01 | P1 | 1-07 |
| Credenziali in body.json/cookies.txt | A8-14, A1-10 | P3 | 1-21 |
| app/deploy, Caddyfile, HSTS | A8-05, A1-05, A9-12 (+A9-13 stesso README) | P2 | 1-15 |
| Somme fatte nel browser (V12) | A5-02 + nota A8 (`ConsultaDocumenti.tsx`); A5-08 + nota A8 (`VistaDocumento.tsx`) | P1 / P2 | 2-01 / 5-04, 6-01 |
| Esc e velo perdono le correzioni | A7-01, A5-15 (+A7-02, A7-03 stesso hook) | P2 | 3-02 |
| SSE e timeout di inattività D-89 | A1-02 + nota A5-12 (A5-12 resta a sé: riconnessione) | P1 | 1-05 / 1-12 |
| Sagome D-59 e catalogo | A5-05, A5-06 | P2 | 3-03 / 4-01 |
| Prove del motore (maturato, storno) | A6-13 → A2-05 (storno) e A2-06 (NC) | P2 | 1-01 / 3-07 |
| Sollecito: caricaDati in transazione | A3-07, A7-25 (parte incassi) | P2 | 1-16 |
| Due stile.css diversi | A5-21, A8-04 (+A7-13 stesso file) | P2 | 3-05 |
| Import da Integra dal documento cancella le righe | R2-01 (+R2-08 stessa funzione) | P0 | 0b-01 / 0b-02 |

Rilievi **divisi** fra più pacchetti (stesso ID, parti diverse; ogni prompt dice quale parte): A1-01 (a: 1-04, b: 2-03), A2-01 (punto 2: 1-01, punto 1: 1-02), A4-07 (prefisso: 1-11, P.IVA condivisa: 2-10), A6-13 (storno: 1-01, NC: 3-07), A8-06 (motore: 1-01, impostazioni: 1-04), A5-05/A5-06 (parte 1: 3-03, parte 2: 4-01), A5-10 (VistaDocumento: 2-02, liste: 4-02, anagrafiche: 1-19), A7-12 (VistaDocumento: 3-02, CampoRicerca: 1-18), A7-20 (backend: 3-06; la parte «Barra solo all'evento» cade con U20 = a), A5-08 (liquidazioni e Analisi: 5-04, documento e bollettino: 6-01), A8-07 (backend: 7-01, frontend: 2-13), **R2-01** (collegamento sul server e frontend: 0b-01, `correggi`: 0b-02), **R1-02** (pool e `importa`: 0b-01, `esitiImportazione`: 0b-02), **R1-09** (`proposta.ts`: 0b-02, `storico.ts`: 0b-03), **R1-13** (prove: 0b-01 Integra, 0b-02 documenti, 0b-03 clienti e storico, 0b-04 soggetti).

Collegati ma **non** doppioni: A3-06 / A6-03 / A1-08 (eventi, stesso pacchetto 2-04); A5-13 / A7-20 (barra); A3-05 / A4-03 / A4-14 (`riceviDocumento`, stesso pacchetto 3-01); A6-02 / A1-04 (`api.ts`, stesso pacchetto 2-06); R1-01 / R1-02 (ponte giù / lento, 0b-01); R2-02 / R2-03 / R2-04 (stesso effetto di `VistaSoggetti.tsx`, 0b-04); R0-01 / A6-07 (stessa prova `app_flusso.py`, 1-22).

## Conversione dei numeri D

L'ORC precedente aveva assegnato D-100…D-118 alle decisioni U; i commit 48c317b..e879c62 hanno occupato D-100…D-113 nel §19 (ponte Integra, soggetti, storico). Il massimo nel §19 è **D-113**: le decisioni del collaudo partono da **D-114**, nello stesso ordine. Sostituito in tutti i prompt `collaudo-*.md` (nessun prompt citava i D-100…D-113 veri).

| Decisione | Prima | Ora | Pacchetto |
|---|---|---|---|
| U1 | D-100 | **D-114** | 1-02 |
| U2 | D-101 | **D-115** | 1-04, 2-03 |
| U3 | D-102 | **D-116** | 3-08 |
| U4 | D-103 | **D-117** | 1-20 |
| U5 | D-104 | **D-118** | 3-07 |
| U6 | D-105 | **D-119** | 5-05 |
| U7 | D-106 | **D-120** | 4-05 |
| U8 | D-107 | **D-121** | 2-11 |
| U10 | D-108 | **D-122** | 3-01 |
| U11 | D-109 | **D-123** | 5-01 |
| U12 | D-110 | **D-124** | 1-11, 2-10 |
| U13 | D-111 | **D-125** | 3-09 |
| U14 | D-112 | **D-126** | 5-04, 6-01 |
| U17 | D-113 | **D-127** | 1-07 |
| U18 | D-114 | **D-128** | 8-01 |
| U19 | D-115 | **D-129** | 1-doc |
| U21 | D-116 | **D-130** | 5-03 |
| U22 | D-117 | **D-131** | 1-doc |
| U24 | D-118 | **D-132** | 8-01 |
| R0 domanda 1 (R2-01) | — | **D-133** | 0b-01, 0b-02 |
| R0 domanda 2 (R2-05) | — | **D-134** | 0b-03 |
| R0 domanda 3 (Importa apre la scheda) | — | **D-135** | 0b-05 |
| R0 domanda 4 (prototipo) | — | **D-136** | 0b-doc |
| R0 domanda 5 (agenzia alla data dell'ordine) | — | **D-137** | 0b-02 |
| R0 domanda 6 (P.IVA del soggetto) | — | **D-138** | 0b-04 |
| R0 domanda 7 (`sconti` RESTRICT) | — | **D-139** | 0-05 |

Le U senza numero (U9, U15, U16, U20, U23, U25, U26, U27) confermano una regola esistente o non cambiano il §19.

## Tabella dei pacchetti

Legenda dei file: `B:` = `app/backend/src/`, `T:` = `app/backend/test/`, `F:` = `app/frontend/` (pagine in `app/frontend/app/(app)/`), `P:` = `strumenti/prove/`, `MIG:` = `app/backend/prisma/migrations/`, `proto:` = `prototipo-alternativo/`. Elenco completo nel prompt. Tabella generata dalle intestazioni dei prompt.

| Onda | Pacchetto | Gravità | Esecutore | Rilievi | File | Dipende da | Prompt |
|---|---|---|---|---|---|---|---|
| 0 | 0-01 Il file di un bollettino non si scarta e non si abbina a una pratica | P1 | V4 | A3-02 | MIG:20261113090000_bollettino_file/migration.sql, B:documenti.ts, T:bollettini.spec.ts, T:vincoli.spec.ts | — | `collaudo-0-01-vincoli-bollettino-file.md` |
| 0 | 0-02 Annullare un documento non cancella le decisioni di un bollettino chiuso | P2 | V4 | A3-03 | MIG:20261113100000_attese_restrict/migration.sql, app/backend/prisma/schema.prisma, B:documenti.ts, T:documenti-pratica.spec.ts | 0-01 | `collaudo-0-02-attese-restrict.md` |
| 0 | 0-03 Numero della pratica UNIQUE e indici sulle chiavi esterne | P3 | V4 | A3-10, A3-11 | MIG:20261113110000_numero_pratica_unico/migration.sql, MIG:20261113120000_indici_fk/migration.sql, app/backend/prisma/schema.prisma, T:vincoli.spec.ts | 0-02 | `collaudo-0-03-numero-unico-indici.md` |
| 0 | 0-04 Indici trigram per la ricerca delle Pratiche | P3 | V4 | A7-24 | MIG:20261113130000_ricerca_trgm/migration.sql, app/backend/prisma/schema.prisma | 0-03 | `collaudo-0-04-ricerca-trgm.md` |
| 0 | 0-05 `sconti` → `interscambio` con ON DELETE RESTRICT | P3 | V4 | R0-D7 | MIG:20261113140000_sconti_restrict/migration.sql, app/backend/prisma/schema.prisma, T:vincoli.spec.ts | 0-04 | `collaudo-0-05-sconti-restrict.md` |
| 0 | 0-doc Documentazione dell'onda | P3 | V4 Flash | sezioni *Da documentare* dei resoconti dell'onda | spec, `F:lib/guida.ts`, piano, PRD, LEGGIMI, `proto:assets/guida.js`, `app/README.md` | tutti i pacchetti dell'onda 0 | `collaudo-0-doc-documentazione.md` |
| 0 bis | 0b-01 Import da Integra dal documento: collegamento sul server, ponte giù o lento, paese, codice già presente, doppio import | P0 | V4 | R2-01, R2-07, R2-08, R1-01, R1-02, R1-03, R1-04, R1-05, R1-13 | B:anagrafica-integra.ts, B:integra.ts, F:documenti/[id]/VistaDocumento.tsx, T:anagrafica-integra.spec.ts, T:integra.spec.ts, P:app_documenti.py | — | `collaudo-0b-01-import-integra-documento.md` |
| 0 bis | 0b-02 Documenti: righe salve nella correzione, storico senza fornitore, scaglioni alla data, agenzia alla data dell'ordine, P.IVA con «IT» | P0 | V4 | R2-01, R0-D5, R1-02, R1-06, R1-09, R1-11, R1-12, R1-13 | B:documenti.ts, B:proposta.ts, T:documenti.spec.ts, T:documenti-pratica.spec.ts, T:proposta.spec.ts | — | `collaudo-0b-02-documenti-righe-agenzia.md` |
| 0 bis | 0b-03 Storico del vecchio CRM e agenzia dal documento: coppia giusta e riga bloccata, subagente dal server, scaglioni dal server, import dello storico in transazione | P2 | V4 | R1-07, R2-05, R2-06, R2-13, R1-10, R1-09, R1-13 | B:storico.ts, B:clienti.ts, B:fornitori.ts, app/backend/prisma/import-storico.ts, F:componenti/FormAgenzia.tsx, T:clienti.spec.ts, T:storico.spec.ts, T:fornitori.spec.ts | — | `collaudo-0b-03-storico-agenzia.md` |
| 0 bis | 0b-04 Soggetti: nuova versione dei ruoli quando cambia la P.IVA, codice di Integra solo dall'import, scheda senza risposte fuori ordine | P2 | V4 | R0-D6, R1-08, R2-02, R2-03, R2-04, R1-13 | B:soggetti.ts, T:soggetti.spec.ts, F:soggetti/VistaSoggetti.tsx, P:app_soggetti.py | — | `collaudo-0b-04-soggetti-piva-scheda.md` |
| 0 bis | 0b-05 Cerca in Integra: dopo Importa si apre la scheda, pulsanti con il nome della riga; Clienti con i filtri su una riga | P3 | V4 Flash | R2-09, R2-11, R2-10 | F:componenti/CercaInIntegra.tsx, F:clienti/VistaClienti.tsx, F:fornitori/VistaFornitori.tsx, F:app/stile/stile.css, P:app_clienti.py, P:app_fornitori.py | — | `collaudo-0b-05-cerca-integra-clienti.md` |
| 0 bis | 0b-06 Lista Documenti: segno «Cliente in Integra» | P3 | V4 Flash | R2-12 | F:documenti/VistaDocumenti.tsx | — | `collaudo-0b-06-lista-documenti-cliente.md` |
| 0 bis | 0b-doc Documentazione dell'onda | P3 | V4 Flash | sezioni *Da documentare* dei resoconti dell'onda, parti di guida di R2-09 e R2-12, D-133…D-138 | spec, `F:lib/guida.ts`, piano, PRD, LEGGIMI, `proto:assets/guida.js`, `app/README.md` | tutti i pacchetti dell'onda 0 bis | `collaudo-0b-doc-documentazione.md` |
| 1 | 1-01 Motore: storni dalla fotografia, una fattura al mese, correzioni su NC, numero riusato | P0 | V4 | A2-01, A2-02, A2-03, A2-05, A6-13, A2-08, A8-06 | B:motore/motore.ts, B:motore/dati.ts, T:motore.spec.ts, T:correzione.spec.ts, T:liquidazioni.spec.ts, proto:motore.js | — | `collaudo-1-01-motore-storni-mese.md` |
| 1 | 1-02 Agenzie bloccate nel periodo chiuso (D-51 esteso) | P0 | V4 | A2-01, A3-01, A6-12 | B:clienti.ts, B:fornitori.ts, T:clienti.spec.ts | 0b-03 | `collaudo-1-02-agenzie-periodo-chiuso.md` |
| 1 | 1-03 Documenti: D-87 sulla fattura, documento in errore recuperabile, corpo non valido | P1 | V4 | A2-04, A4-01, A4-13 | B:documenti.ts, B:lettura.ts, B:lettore.ts, F:documenti/[id]/VistaDocumento.tsx, T:documenti-pratica.spec.ts, T:documenti-lettura.spec.ts, T:coda.spec.ts, P:app_documenti.py | 0b-01, 0b-02 | `collaudo-1-03-documenti-errore-d87.md` |
| 1 | 1-04 Impostazioni: il segreto vecchio non parte verso un server nuovo | P1 | V4 | A1-01, A8-06 | B:impostazioni.ts, B:impostazioni-api.ts, T:impostazioni.spec.ts | — | `collaudo-1-04-impostazioni-segreti.md` |
| 1 | 1-05 Sessione: timeout di inattività vero, durata massima, area sconosciuta | P1 | V4 | A1-02, A1-03, A1-07 | B:accesso.ts, T:profilo.spec.ts, F:lib/api.ts, F:sistema/VistaSistema.tsx, F:oggi/VistaOggi.tsx, F:documenti/VistaDocumenti.tsx, F:pratiche/VistaPratiche.tsx, F:bollettini/VistaBollettini.tsx | 0b-06 | `collaudo-1-05-sessione-inattivita.md` |
| 1 | 1-06 Oggi: bollettini dell'anno prima e gruppo «Documenti da decidere» | P1 | V4 Flash | A4-02, A4-11 | B:oggi.ts, T:oggi.spec.ts, P:app_oggi.py | — | `collaudo-1-06-oggi-bollettini-documenti.md` |
| 1 | 1-07 Blocco sotto i 744 px (D-44) | P1 | V4 Flash | A5-03, A6-01 | F:app/layout.tsx, F:app/stile/stile.css, proto:stile.css, proto:index.html, P:app_guscio.py | 0b-05 | `collaudo-1-07-schermo-stretto.md` |
| 1 | 1-08 Due giri di jest sullo stesso database: il secondo si ferma subito | P2 | V4 Flash | A6-05 | app/backend/package.json, T:blocco.ts | — | `collaudo-1-08-isolamento-jest.md` |
| 1 | 1-09 Pulizia degli scartati senza cancellare un documento recuperato | P2 | V4 Flash | A3-04, A4-09 | B:sistema.ts, T:sistema.spec.ts, T:scartati.spec.ts | — | `collaudo-1-09-pulizia-scartati.md` |
| 1 | 1-10 Casella: STARTTLS obbligatorio, email malformata, limite per allegato | P2 | V4 | A4-04, A4-05, A4-12 | B:casella.ts, T:casella.spec.ts | — | `collaudo-1-10-casella.md` |
| 1 | 1-11 Proposta: P.IVA con prefisso del paese; «Affidabile» su un documento senza fornitore | P2 | V4 Flash | A4-07, A6-18 | B:proposta.ts, T:proposta.spec.ts, app/backend/prisma/seed/dati-prova.json, T:seed.spec.ts | 0b-02 | `collaudo-1-11-proposta-piva.md` |
| 1 | 1-12 Canale SSE che si riapre dopo un errore HTTP | P2 | V4 Flash | A5-12 | F:lib/eventi.tsx, P:app_eventi.py | — | `collaudo-1-12-sse-riconnessione.md` |
| 1 | 1-13 Registro: 4xx registrati, dettaglio non valido in anomalia, anomalia atomica, filtri per giorno | P2 | V4 | A8-02, A8-03, A3-09, A3-12 | B:errori.filter.ts, B:registro.ts, B:registro-api.ts, T:registro.spec.ts, T:registro-api.spec.ts | — | `collaudo-1-13-registro.md` |
| 1 | 1-14 Segreti d'esempio rifiutati in esercizio | P2 | V4 Flash | A1-06 | B:main.ts, T:avvio.spec.ts | — | `collaudo-1-14-segreti-avvio.md` |
| 1 | 1-15 Messa in esercizio: Caddyfile, HSTS, script, README | P2 | V4 Flash | A1-05, A8-05, A9-12, A9-13 | app/deploy/Caddyfile, app/deploy/*, F:next.config.ts, app/README.md, app/NOTA-RILASCIO.md, app/avvia-esercizio.bat | — | `collaudo-1-15-deploy.md` |
| 1 | 1-16 Sollecito di pagamento: tempo limite e fatture già pagate | P2 | V4 Flash | A3-07, A7-25 | B:incassi.ts, T:incassi.spec.ts | — | `collaudo-1-16-incassi-sollecito.md` |
| 1 | 1-17 PDF del bollettino con PDF.js invece di <object> | P2 | V4 Flash | A4-10 | F:bollettini/[id]/VistaBollettino.tsx, P:app_bollettino.py | — | `collaudo-1-17-pdf-bollettino.md` |
| 1 | 1-18 Campo di ricerca: voce attiva annunciata e nome dell'input | P2 | V4 Flash | A7-08, A7-12 | F:componenti/CampoRicerca.tsx, P:app_componenti.py | — | `collaudo-1-18-campo-ricerca-aria.md` |
| 1 | 1-19 Tabelle che ricordano lo stato: Subagenti, Utenti, Fornitori, Clienti; colonna di Utenti | P2 | V4 Flash | A5-10, A6-14 | F:subagenti/VistaSubagenti.tsx, F:utenti/VistaUtenti.tsx, F:fornitori/VistaFornitori.tsx, F:clienti/VistaClienti.tsx | 0b-05 | `collaudo-1-19-memoria-anagrafiche.md` |
| 1 | 1-20 Avviso al vecchio indirizzo quando cambia l'email di un utente | P2 | V4 | U4 | B:utenti.ts, B:posta.ts, T:utenti.spec.ts | — | `collaudo-1-20-avviso-email-cambiata.md` |
| 1 | 1-21 Pulizia della radice e cartelle di uscita ignorate | P3 | V4 Flash | A1-10, A8-14 | .gitignore, body.json, cookies.txt | — | `collaudo-1-21-pulizia-radice.md` |
| 1 | 1-22 Prove nel browser vecchie o fragili | P3 | V4 Flash | A6-07, A6-08, A6-09, R0-01 | P:app_bollettini.py, P:app_flusso.py, P:app_analisi.py, P:app_clienti.py, P:app_subagenti.py | 0b-05 | `collaudo-1-22-prove-vecchie.md` |
| 1 | 1-23 Avvisi annunciati dal lettore di schermo; errori come alert | P3 | V4 Flash | A7-11 | F:componenti/Piccoli.tsx | — | `collaudo-1-23-avvisi-live.md` |
| 1 | 1-24 Prova a matrice dei permessi su tutte le rotte | P3 | V4 Flash | A1-09 | T:permessi.spec.ts | — | `collaudo-1-24-permessi-matrice.md` |
| 1 | 1-doc Documentazione dell'onda | P3 | V4 Flash | sezioni *Da documentare* dei resoconti dell'onda, A9-03, A9-04, A9-06, A9-09, A9-01, A9-02, A9-05 | spec, `F:lib/guida.ts`, piano, PRD, LEGGIMI, `proto:assets/guida.js`, `app/README.md` | tutti i pacchetti dell'onda 1 | `collaudo-1-doc-documentazione.md` |
| 2 | 2-01 Confronto delle righe dei documenti calcolato dal server (V12, D-60) | P1 | V4 | A5-02 | B:documenti.ts, F:componenti/ConsultaDocumenti.tsx, T:pratiche.spec.ts, P:app_pratica.py | 0b-02 | `collaudo-2-01-confronto-righe-server.md` |
| 2 | 2-02 Schede controllate, dettaglio del documento che si azzera, testi «non riconosciuto» | P1 | V4 Flash | A5-01, A5-04, A6-16, A5-10 | F:componenti/Schede.tsx, F:pratiche/[id]/VistaPratica.tsx, F:documenti/VistaDocumenti.tsx, F:documenti/[id]/VistaDocumento.tsx, P:app_documenti.py | 0b-01, 0b-06 | `collaudo-2-02-schede-dettaglio-documento.md` |
| 2 | 2-03 Posta, casella e Integra modificabili solo dal superutente | P1 | V4 | A1-01 | B:impostazioni.ts, B:impostazioni-api.ts, B:accesso.ts, F:impostazioni/*, T:impostazioni.spec.ts | 1-04, 1-05 | `collaudo-2-03-connessioni-superutente.md` |
| 2 | 2-04 Aggiornamenti dal vivo: eventi persi, SSE dopo l'uscita, sollecito che non avvisa | P2 | V4 | A3-06, A1-08, A6-03 | B:eventi.ts, T:eventi.spec.ts, B:incassi.ts, B:solleciti.ts, F:oggi/VistaOggi.tsx | — | `collaudo-2-04-eventi-dal-vivo.md` |
| 2 | 2-05 Chiusura del bollettino, somme in Decimal, prove di concorrenza (V13) | P2 | V4 Flash | A3-08, A2-09, A6-11 | B:bollettino.ts, B:esporta-liquidazione.ts, T:bollettino.spec.ts, T:liquidazioni.spec.ts, T:documenti-pratica.spec.ts | 0b-02 | `collaudo-2-05-bollettino-somme-concorrenza.md` |
| 2 | 2-06 Esci sicuro, ritorno dopo l'accesso, contatori della barra dal vivo, Stato del sistema | P2 | V4 | A6-02, A1-04, A5-13, A6-17 | F:componenti/Barra.tsx, F:lib/api.ts, F:app/accesso/esci/page.tsx, P:app_accesso.py, P:app_eventi.py, F:sistema/VistaSistema.tsx, P:app_sistema.py | — | `collaudo-2-06-uscita-barra.md` |
| 2 | 2-07 DataTable: paginazione sempre, intestazioni e righe da tastiera | P2 | V4 Flash | A5-07, A7-04, A7-05 | F:componenti/DataTable.tsx, F:app/stile/stile.css, proto:stile.css, P:app_pratiche.py, P:app_analisi.py | 0b-05 | `collaudo-2-07-datatable-tastiera.md` |
| 2 | 2-08 Guscio: pagina d'errore se il server non risponde; pulsanti spenti anche da tastiera | P2 | V4 | A5-14, A7-07 | F:layout.tsx, P:app_guscio.py, P:app_liquidazioni.py | — | `collaudo-2-08-guscio-errori-sola-lettura.md` |
| 2 | 2-09 Motore: indici costruiti una volta, niente scansioni quadratiche | P2 | V4 | A7-21 | B:motore/dati.ts, B:motore/motore.ts, T:motore-volumi.spec.ts | 1-01 | `collaudo-2-09-motore-indici.md` |
| 2 | 2-10 Più clienti con la stessa P.IVA: decide la ragione sociale | P2 | V4 Flash | A4-07 | B:proposta.ts, T:proposta.spec.ts | 1-11, 0b-02 | `collaudo-2-10-piva-condivisa.md` |
| 2 | 2-11 Tipo di provvigione del fornitore fisso dopo la prima chiusura | P2 | V4 | U8 | B:fornitori.ts, T:fornitori.spec.ts | 1-02, 0b-03 | `collaudo-2-11-tipo-provvigione-fisso.md` |
| 2 | 2-12 Cliente › Pratiche: importo in euro e stato con etichetta | P3 | V4 Flash | A5-18 | F:clienti/VistaClienti.tsx, F:pratiche/VistaPratiche.tsx, F:lib/stati.ts, P:app_clienti.py | 0b-05 | `collaudo-2-12-cliente-pratiche-formato.md` |
| 2 | 2-13 mpiu/mk esportati da PeriodoMesi | P3 | V4 Flash | A8-07 | F:componenti/PeriodoMesi.tsx, F:analisi/VistaAnalisi.tsx, F:bollettini/VistaBollettini.tsx | — | `collaudo-2-13-aiuti-mesi-frontend.md` |
| 2 | 2-14 Dipendenze: inutile tolta, versioni bloccate, strumento di prova fuori da src, ESLint | P3 | V4 Flash | A8-09, A8-10, A8-11, A5-17 | app/backend/package.json, app/backend/package-lock.json, F:package.json, F:package-lock.json, B:lettura-prova.ts, app/backend/prisma/lettura-prova.ts, F:eslint.config.mjs | — | `collaudo-2-14-dipendenze-lint.md` |
| 2 | 2-doc Documentazione dell'onda | P3 | V4 Flash | sezioni *Da documentare* dei resoconti dell'onda, A9-07, A9-10, A9-11 | spec, `F:lib/guida.ts`, piano, PRD, LEGGIMI, `proto:assets/guida.js`, `app/README.md` | tutti i pacchetti dell'onda 2 | `collaudo-2-doc-documentazione.md` |
| 3 | 3-01 Arrivo dello stesso file, scartati che tornano solo a mano, annullo di un documento letto | P2 | V4 | A3-05, A4-03, A4-14, A4-06, U10 | B:documenti.ts, T:documenti.spec.ts, B:casella.ts, T:casella.spec.ts | 0b-02 | `collaudo-3-01-arrivo-annullo-documenti.md` |
| 3 | 3-02 Finestre: Esc e velo non perdono le correzioni, fuoco e trappola, nomi dei campi letti | P2 | V4 Flash | A5-15, A7-01, A7-02, A7-03, A7-06, A7-12 | F:componenti/Modale.tsx, F:documenti/[id]/VistaDocumento.tsx, F:componenti/ConsultaDocumenti.tsx, P:app_documenti.py, P:app_pratica.py, P:app_componenti.py | 0b-01 | `collaudo-3-02-finestre-fuoco.md` |
| 3 | 3-03 Sagome D-59 senza lampo di «Nessun elemento» — parte 1: componenti, catalogo, Pratiche, Documenti, Registro | P2 | V4 | A5-05, A5-06 | F:componenti/DataTable.tsx, F:componenti/FilterBar.tsx, F:componenti/page.tsx, F:pratiche/VistaPratiche.tsx, F:documenti/VistaDocumenti.tsx, F:registro/VistaRegistro.tsx, P:app_caricamento.py | 0b-06 | `collaudo-3-03-sagome-1.md` |
| 3 | 3-04 Data di oggi a Roma in tutti i campi «Valido dal»; anno doppio nei Bollettini | P2 | V4 Flash | A5-16, A5-19 | F:lib/formati.ts, F:clienti/VistaClienti.tsx, F:fornitori/VistaFornitori.tsx, F:subagenti/VistaSubagenti.tsx, F:pratiche/[id]/VistaPratica.tsx, F:bollettini/VistaBollettini.tsx, P:app_clienti.py | 0b-05 | `collaudo-3-04-data-oggi-anno.md` |
| 3 | 3-05 I due stile.css uguali; evidenziazione con «riduci movimento» | P2 | V4 Flash | A5-21, A8-04, A7-13 | F:app/stile/stile.css, proto:stile.css | 0b-05 | `collaudo-3-05-stile-allineato.md` |
| 3 | 3-06 Meno caricamenti completi: conteggi della barra in SQL, Oggi raggruppato, report nella stessa richiesta | P2 | V4 | A7-20, A7-22 | B:oggi.ts, T:oggi.spec.ts, F:oggi/VistaOggi.tsx, F:liquidazioni/VistaLiquidazioni.tsx, B:liquidazioni.ts, T:liquidazioni.spec.ts | 1-01, 1-06, 2-04 | `collaudo-3-06-carichi-oggi-liquidazioni.md` |
| 3 | 3-07 Nota di credito sul maturato che segue la sua fattura | P2 | V4 | A2-06, A6-13 | B:motore/motore.ts, proto:motore.js, T:motore.spec.ts | 1-01, 2-09 | `collaudo-3-07-nc-maturato.md` |
| 3 | 3-08 Tentativi d'accesso per IP + persona, tetto largo per persona | P2 | V4 | U3 | B:app.module.ts, B:accesso.ts, T:accesso.spec.ts | 1-05 | `collaudo-3-08-tentativi-accesso.md` |
| 3 | 3-09 Connettore di lettura locale non sceglibile | P2 | V4 Flash | U13 | B:impostazioni.ts, F:impostazioni/*, T:impostazioni.spec.ts, P:app_impostazioni.py | 1-04 | `collaudo-3-09-connettore-locale-spento.md` |
| 3 | 3-10 «Pagina non trovata» al posto di «In costruzione» | P3 | V4 Flash | A8-08 | F:[...resto]/page.tsx, F:componenti/InCostruzione.tsx, F:not-found.tsx, P:app_guscio.py | — | `collaudo-3-10-pagina-non-trovata.md` |
| 3 | 3-doc Documentazione dell'onda | P3 | V4 Flash | sezioni *Da documentare* dei resoconti dell'onda | spec, `F:lib/guida.ts`, piano, PRD, LEGGIMI, `proto:assets/guida.js`, `app/README.md` | tutti i pacchetti dell'onda 3 | `collaudo-3-doc-documentazione.md` |
| 4 | 4-01 Sagome D-59 — parte 2: Sistema, Scartati, Analisi, Clienti, Utenti; Scartati a 768 px | P2 | V4 Flash | A5-05, A5-06, A6-15 | F:sistema/VistaSistema.tsx, F:scartati/VistaScartati.tsx, F:analisi/VistaAnalisi.tsx, F:clienti/VistaClienti.tsx, F:utenti/VistaUtenti.tsx, P:app_scartati.py | 3-03, 0b-05 | `collaudo-4-01-sagome-2.md` |
| 4 | 4-02 Tabelle che ricordano ordinamento e scorrimento: Pratiche e Liquidazioni | P2 | V4 Flash | A5-10 | F:pratiche/VistaPratiche.tsx, F:liquidazioni/VistaLiquidazioni.tsx, P:app_liquidazioni.py, P:app_pratiche.py | — | `collaudo-4-02-memoria-liste.md` |
| 4 | 4-03 Scorrimento ripristinato all'arrivo dei dati; «Torna a…» che non punta a sé | P2 | V4 Flash | A5-11, A6-19 | F:componenti/Pagina.tsx, F:lib/memoria.ts, F:pratiche/[id]/VistaPratica.tsx, F:bollettini/[id]/VistaBollettino.tsx, P:app_pratica.py, P:app_f7_collaudo.py | — | `collaudo-4-03-scorrimento-torna.md` |
| 4 | 4-04 Importi in euro scritti in un solo modo nel backend | P2 | V4 Flash | A8-01 | B:formati.ts, B:proposta.ts, B:oggi.ts, B:incassi.ts, B:solleciti.ts, T:oggi.spec.ts, T:incassi.spec.ts | 1-06, 2-04, 1-11, 1-16, 3-06, 0b-02 | `collaudo-4-04-formati-backend.md` |
| 4 | 4-05 Report subagenti di un trimestre chiuso dalla fotografia | P2 | V4 | A2-07 | B:liquidazioni.ts, B:motore/motore.ts, T:liquidazioni.spec.ts | 1-01, 3-06, 2-09 | `collaudo-4-05-report-fotografia.md` |
| 4 | 4-06 Contrasti WCAG e carattere fuori dal CSS bloccante | P3 | V4 Flash | A7-09, A7-26 | F:app/stile/stile.css, proto:stile.css, F:app/stile/public-sans.css, F:app/layout.tsx, F:public/fonts/* | 3-05, 0b-05 | `collaudo-4-06-colori-caratteri.md` |
| 4 | 4-doc Documentazione dell'onda | P3 | V4 Flash | sezioni *Da documentare* dei resoconti dell'onda | spec, `F:lib/guida.ts`, piano, PRD, LEGGIMI, `proto:assets/guida.js`, `app/README.md` | tutti i pacchetti dell'onda 4 | `collaudo-4-doc-documentazione.md` |
| 5 | 5-01 Stessa fattura su due pratiche solo con conferma «multi-ordine» | P2 | V4 | A4-08 | B:documenti.ts, F:componenti/Flussi.tsx, F:pratiche/[id]/VistaPratica.tsx, F:documenti/[id]/VistaDocumento.tsx, T:documenti-pratica.spec.ts | 1-03, 3-01, 0b-01, 0b-02 | `collaudo-5-01-fattura-doppia.md` |
| 5 | 5-02 Memoria della schermata per passo di cronologia e dopo il ricaricamento | P2 | V4 | A5-09 | F:lib/memoria.ts, P:app_pratiche.py | 4-03 | `collaudo-5-02-memoria-cronologia.md` |
| 5 | 5-03 Pratiche: righe ferme fino ad Aggiorna (o eccezione D-94 scritta) | P2 | V4 Flash | A6-04, A9-08 | F:pratiche/VistaPratiche.tsx | 1-05, 3-03, 4-02 | `collaudo-5-03-pratiche-righe-ferme.md` |
| 5 | 5-04 Totali dal server: Liquidazioni e Analisi (V12) | P2 | V4 | A5-08 | F:componenti/DataTable.tsx, F:liquidazioni/VistaLiquidazioni.tsx, F:analisi/VistaAnalisi.tsx, B:liquidazioni.ts, B:analisi.ts, T:liquidazioni.spec.ts, T:analisi.spec.ts, P:app_liquidazioni.py | 3-06 | `collaudo-5-04-totali-server-liquidazioni-analisi.md` |
| 5 | 5-05 Correzioni di un bollettino contestato nel mese dopo | P2 | V4 | U6 | B:bollettino.ts, B:motore/motore.ts, T:bollettino.spec.ts, T:motore.spec.ts | 2-05, 2-09, 3-07 | `collaudo-5-05-rettifiche-bollettino.md` |
| 5 | 5-doc Documentazione dell'onda | P3 | V4 Flash | sezioni *Da documentare* dei resoconti dell'onda, A9-08 | spec, `F:lib/guida.ts`, piano, PRD, LEGGIMI, `proto:assets/guida.js`, `app/README.md` | tutti i pacchetti dell'onda 5 | `collaudo-5-doc-documentazione.md` |
| 6 | 6-01 Totali dal server: righe del documento e differenze del Bollettino (V12) | P2 | V4 | A5-08 | F:documenti/[id]/VistaDocumento.tsx, F:bollettini/[id]/VistaBollettino.tsx, B:bollettino.ts, B:documenti.ts, T:bollettino.spec.ts, T:documenti-pratica.spec.ts | 5-04, 0b-01, 0b-02 | `collaudo-6-01-totali-server-documento-bollettino.md` |
| 6 | 6-02 Scaricamenti con sessione scaduta; Analisi senza richieste accavallate | P3 | V4 Flash | A5-20, A7-23 | F:lib/api.ts, F:liquidazioni/VistaLiquidazioni.tsx, F:analisi/VistaAnalisi.tsx, P:app_liquidazioni.py | — | `collaudo-6-02-scaricamenti-analisi.md` |
| 6 | 6-doc Documentazione dell'onda | P3 | V4 Flash | sezioni *Da documentare* dei resoconti dell'onda | spec, `F:lib/guida.ts`, piano, PRD, LEGGIMI, `proto:assets/guida.js`, `app/README.md` | tutti i pacchetti dell'onda 6 | `collaudo-6-doc-documentazione.md` |
| 7 | 7-01 Aiuti copiati in un solo modulo (dataIt, MESI, ELENCO_ID, MESE) e commenti ponytail chiusi | P3 | V4 Flash | A8-07, A8-12, A8-13 | B:formati.ts, B:validazione.ts, B:analisi.ts, B:bollettino.ts, B:esporta-liquidazione.ts, B:incassi.ts, B:liquidazioni.ts, B:oggi.ts, B:pratiche.ts, B:solleciti.ts, B:bollettini.ts, B:registro-api.ts, B:motore/dati.ts | 4-04, 1-13, 2-05, 3-06, 2-09 | `collaudo-7-01-debito-backend.md` |
| 7 | 7-doc Documentazione dell'onda | P3 | V4 Flash | sezioni *Da documentare* dei resoconti dell'onda | spec, `F:lib/guida.ts`, piano, PRD, LEGGIMI, `proto:assets/guida.js`, `app/README.md` | tutti i pacchetti dell'onda 7 | `collaudo-7-doc-documentazione.md` |
| 8 | 8-01 Prove nel browser: modulo comune, build di esercizio, segmenti come pulsanti | P3 | V4 Flash | A6-10, A6-06, A7-10 | P:comune.py, P:app_*.py, F:componenti/FilterBar.tsx, F:componenti/Solleciti.tsx, F:componenti/ConsultaDocumenti.tsx, F:app/stile/stile.css, proto:stile.css | 0b-05 | `collaudo-8-01-prove-comune.md` |
| 8 | 8-doc Documentazione dell'onda | P3 | V4 Flash | sezioni *Da documentare* dei resoconti dell'onda, A9-14 | spec, `F:lib/guida.ts`, piano, PRD, LEGGIMI, `proto:assets/guida.js`, `app/README.md` | tutti i pacchetti dell'onda 8 | `collaudo-8-doc-documentazione.md` |

## Fine di ogni onda

Una onda si chiude solo quando: tutti i suoi pacchetti di codice hanno consegnato il resoconto, il pacchetto documentazione ha finito, e il controllo sotto è passato. Poi commit in italiano (Claude Code, su `main`, file dell'onda soltanto) e si apre l'onda dopo. Se qualcosa non va: prompt `strumenti/opencode/collaudo-<onda>-<NN>-correzioni-1.md` allo **stesso esecutore**, non correzione a mano.

**Comandi comuni** (nessun altro jest o server di prova acceso):

```bash
# 1. backend: database di prova condiviso aggiornato, tutte le prove
cd app/backend
export DATABASE_URL_TEST="$(grep '^DATABASE_URL' .env | cut -d= -f2- | sed 's#/decobrands_db#/decobrands_test#')"
DATABASE_URL="$DATABASE_URL_TEST" npx prisma migrate deploy
npm test                      # 0 KO
npx tsc --noEmit && (cd ../frontend && npx tsc --noEmit)

# 2. prove nel browser dell'onda (elenco sotto): backend `dist` su 8012 con DATABASE_URL di prova,
#    NODE_ENV=development, TENTATIVI*=1000, DOCUMENTI_DIR temporanea; frontend `next dev -p 8011` con
#    BACKEND_URL=http://127.0.0.1:8012 (con `next start` serve bypass_csp, A6-06/U24: lo mette 8-01);
#    seed §12 ricaricato prima di ogni prova (TRUNCATE di test/svuota.ts + seed: le prove lasciano soggetti
#    e fornitori, R0); backend riavviato fra una prova e l'altra se compare 429 «Troppi tentativi» (D-41 in memoria, R0);
#    `node ../../strumenti/prove/utenti_prova.js crea <s>`. Ponte di Integra solo finto (`decobrands_ponte_prova`), mai 192.168.239.49.
python strumenti/prove/app_<pagina>.py <s> <cartella schermate> http://localhost:8011

# 3. grafo e pagine della documentazione
graphify update .
python3 strumenti/genera-pagine-doc.py
```

**Controllo finale di Claude Code** (per ogni pacchetto, prima del commit): resoconto letto; `git diff` solo sui file ammessi; decisioni del §19 non semplificate; numeri del seed §12 invariati salvo dove il rilievo li cambia (scritto nel resoconto). Review **completa** (skill caricate davvero) sui pacchetti sensibili — accesso, sessioni, permessi, soldi/provvigioni, transazioni, SQL e migrazioni, Integra: `owasp-security` (o `vibesec`), `/code-review`, `/ponytail:ponytail-review`, e `postgresql-code-review` per SQL e migrazioni. Review leggera (rilettura del diff) sul resto. Controllo visivo a 1440 e 768 px per le modifiche d'interfaccia (CLAUDE.md regola 5).

### Onda 0

- Pacchetti **in serie** (0-01 → 0-05), ognuno con la sua migrazione; dopo ognuno: `npx prisma migrate deploy` sul database di prova condiviso e `npm test` completo. A fine onda le migrazioni vanno applicate anche al database di sviluppo di Ugo (`decobrands_db`) — lo decide Ugo.
- Prove nel browser: `app_pratiche.py`, `app_documenti.py`, `app_bollettino.py`, `app_clienti.py`, `app_flusso.py` (numeri del seed invariati). KO noto ammesso: `app_flusso.py:289` (R0-01, si chiude in 1-22).
- Review completa (+ `postgresql-code-review`) su: 0-01, 0-02, 0-03, 0-04, 0-05.

### Onda 0 bis

- Si apre dopo l'onda 0 e **prima** dell'onda 1. Sei pacchetti in parallelo, nessun file in comune.
- `npm test` 0 KO; prove nel browser: `app_documenti.py`, `app_pratica.py`, `app_soggetti.py`, `app_clienti.py`, `app_fornitori.py`, `app_subagenti.py`, `app_guida.py`, più `app_f7_collaudo.py` come rete di sicurezza. KO noto ammesso: `app_flusso.py:289` (R0-01).
- Casi da guardare a mano (li scrivono i resoconti 0b-02, 0b-03, 0b-06): import del fornitore dal documento con le righe ancora visibili; campo Subagente vuoto con storico non risolto; errore di `subagenti` dentro la finestra dell'agenzia; segno «Cliente in Integra» nella lista Documenti.
- Review completa su: **0b-01** (P0, Integra e transazioni), **0b-02** (P0, soldi), **0b-03** (agenzia, lock, script sul database di esercizio), **0b-04** (transazioni, versioni D-46); leggera su 0b-05, 0b-06.

### Onda 1

- `npm test` 0 KO; prove nel browser: `app_analisi.py`, `app_bollettini.py`, `app_bollettino.py`, `app_clienti.py`, `app_componenti.py`, `app_documenti.py`, `app_eventi.py`, `app_f7_collaudo.py`, `app_flusso.py`, `app_fornitori.py`, `app_guscio.py`, `app_liquidazioni.py`, `app_oggi.py`, `app_pratiche.py`, `app_profilo.py`, `app_registro.py`, `app_subagenti.py`, `app_utenti.py`.
- KO già noti che **non** si chiudono in quest'onda: `app_accesso.py` instabile (A6-02 → 2-06), `app_oggi.py` dopo *Copia il testo* (A6-03 → 2-04), `app_flusso.py:469` righe ferme in Pratiche (A6-04 → 5-03). `app_bollettini.py`, `app_flusso.py` (salvo :469; :289 chiuso da R0-01), `app_analisi.py`, `app_clienti.py`, `app_subagenti.py` **devono** tornare verdi (A6-07/08/09, R0-01).
- Review completa su: 1-01, 1-02, 1-03, 1-04, 1-05, 1-10, 1-13, 1-20; leggera sugli altri.
- Onda grande (24 pacchetti): si può lanciare a gruppi. `1-08 isolamento-jest` (A6-05) cambia `package.json` del backend: lancialo per primo o da solo, poi gli altri.
- Pacchetti che rileggono codice cambiato dall'onda 0 bis (scritto nel loro «Dipende da»): 1-02, 1-03, 1-05, 1-07, 1-11, 1-19, 1-22.

### Onda 2

- `npm test` 0 KO; prove nel browser: `app_accesso.py`, `app_analisi.py`, `app_bollettini.py`, `app_clienti.py`, `app_componenti.py`, `app_documenti.py`, `app_eventi.py`, `app_fornitori.py`, `app_guscio.py`, `app_impostazioni.py`, `app_liquidazioni.py`, `app_oggi.py`, `app_pratica.py`, `app_pratiche.py`, `app_sistema.py`, `app_utenti.py`, più `app_flusso.py` e `app_f7_collaudo.py` come rete di sicurezza.
- KO noto ammesso: `app_flusso.py:469` (A6-04 → 5-03). `app_accesso.py` lanciata 5 volte di fila senza fermarsi; `app_oggi.py` verde.
- Review completa su: 2-01, 2-03, 2-04, 2-06, 2-09, 2-11; leggera sugli altri (2-08 è V4 ma solo interfaccia).
- `2-14 dipendenze-lint` fa `npm ci`: **lancialo per ultimo** nell'onda 2.

### Onda 3

- `npm test` 0 KO; prove nel browser: `app_accesso.py`, `app_bollettini.py`, `app_bollettino.py`, `app_caricamento.py`, `app_clienti.py`, `app_componenti.py`, `app_documenti.py`, `app_f7_numeri.py`, `app_guscio.py`, `app_impostazioni.py`, `app_liquidazioni.py`, `app_oggi.py`, `app_pratica.py`, `app_pratiche.py`, `app_registro.py`, più `app_flusso.py` e `app_f7_collaudo.py` come rete di sicurezza.
- Review completa su: 3-01, 3-06, 3-07, 3-08; leggera sugli altri (3-03 è V4 ma solo interfaccia).

### Onda 4

- `npm test` 0 KO; prove nel browser: `app_analisi.py`, `app_bollettino.py`, `app_caricamento.py`, `app_clienti.py`, `app_componenti.py`, `app_liquidazioni.py`, `app_pratica.py`, `app_pratiche.py`, `app_scartati.py`, `app_sistema.py`, `app_utenti.py`, più `app_flusso.py` e `app_f7_collaudo.py` come rete di sicurezza.
- Review completa su: 4-05; leggera sugli altri.

### Onda 5

- `npm test` 0 KO; prove nel browser: `app_analisi.py`, `app_bollettino.py`, `app_documenti.py`, `app_eventi.py`, `app_flusso.py`, `app_liquidazioni.py`, `app_pratica.py`, `app_pratiche.py`, più `app_f7_collaudo.py` come rete di sicurezza. `app_flusso.py:469` deve tornare verde (5-03).
- Review completa su: 5-01, 5-04, 5-05; leggera sugli altri (5-02 è V4 ma solo interfaccia).

### Onda 6

- `npm test` 0 KO; prove nel browser: `app_analisi.py`, `app_bollettino.py`, `app_documenti.py`, `app_liquidazioni.py`, più `app_flusso.py` e `app_f7_collaudo.py` come rete di sicurezza.
- Review completa su: 6-01; leggera su 6-02.

### Onda 7

- `npm test` 0 KO; prove nel browser: `app_flusso.py` e `app_f7_collaudo.py` (7-01 è solo backend: aiuti e commenti).
- Review leggera su 7-01; i numeri del seed §12 devono restare identici.

### Onda 8

- `npm test` 0 KO; prove nel browser: **tutte** le `app_*.py` (8-01 le tocca tutte), anche sulla build di esercizio (`next start`, D-132).
- Review leggera su 8-01.

## Decisioni di Ugo

Domande U1…U27 sui report A1…A9 (08/11) e domande 1–7 dell'R0 (11/11). Tutte decise; il numero D è quello della *Conversione dei numeri D*. La riga del §19 la scrive il pacchetto documentazione dell'onda in cui entra il pacchetto.

| U | Domanda | Decisa | D | Pacchetto |
|---|---|---|---|---|
| U1 | Agenzie e periodo chiuso: D-51 vale anche per le agenzie? | **(a)** sì: niente modifica/eliminazione di un'agenzia con `valido_dal` ≤ ultima chiusura | D-114 | 1-02 |
| U2 | Chi modifica le connessioni Posta, Casella, Integra? | **(a)** solo il superutente, permesso nuovo `sistema.connessioni` | D-115 | 1-04, 2-03 |
| U3 | D-81: tentativi d'accesso, come si conta? | **(b)** contatore IP + persona e tetto largo per persona | D-116 | 3-08 |
| U4 | L'amministratore può impersonare un operatore cambiando l'email? | **(a)** email di avviso al vecchio indirizzo | D-117 | 1-20 |
| U5 | Nota di credito sul maturato | **(a)** segue la sua fattura riconosciuta | D-118 | 3-07 |
| U6 | Bollettino contestato: dove entrano le correzioni? | **(a)** righe di rettifica nel bollettino del mese dopo | D-119 | 5-05 |
| U7 | Report subagenti di un trimestre chiuso | **(a)** chiuso = fotografia, aperto = dal vivo | D-120 | 4-05 |
| U8 | Regole del fornitore senza data | **(a)** `tipo_provvigione` fisso dopo la prima chiusura | D-121 | 2-11 |
| U9 | Righe dei bollettini: nessuna rotta le crea | **(b)** mancanza da pianificare: attività «Righe dei bollettini dal PDF», 12 h **da approvare** | — | 1-doc |
| U10 | Scartato che torna per email | **(a)** torna in coda solo se ricaricato a mano | D-122 | 3-01 |
| U11 | Stessa fattura su due pratiche | **(a)** serve la conferma `multi_ordine`, senza 409 | D-123 | 5-01 |
| U12 | Più clienti con la stessa P.IVA | **(a)** decide la ragione sociale se il candidato è uno solo | D-124 | 1-11, 2-10 |
| U13 | GLM-OCR locale sceglibile ma inesistente | **(a)** non sceglibile finché non c'è; la riga di CLAUDE.md la cambia Ugo | D-125 | 3-09 |
| U14 | Totali delle tabelle sommati nel browser | **(a)** totali sempre dal server | D-126 | 5-04, 6-01 |
| U15 | Memoria della schermata persa ricaricando | **(a)** memoria per passo di cronologia in `sessionStorage` | — | 5-02 |
| U16 | Colori sotto 4.5:1 e carattere in base64 | **(a)** si cambiano i token nel prototipo e si ricopiano (D-24 resta) | — | 4-06 |
| U17 | Zoom al 200 % e blocco a 744 px | **(a)** blocco sulla larghezza CSS, eccezione WCAG 1.4.10 | D-127 | 1-07 |
| U18 | Segmenti con `role="tab"` | **(a)** `role="group"` + `aria-pressed`, nell'ultima onda | D-128 | 8-01 |
| U19 | Pagina d'accesso che si svuota dopo 2 minuti | **(a)** voluto, scritto nel §19 | D-129 | 1-doc |
| U20 | Barra laterale: contatori a ogni pagina o all'evento? | **(a)** a ogni pagina **e** all'evento (2-06); il pacchetto «solo all'evento» cade | — | 2-06 |
| U21 | D-94 e Pratiche | **(a)** eccezione solo per Documenti; Pratiche ferma fino ad *Aggiorna* | D-130 | 5-03 |
| U22 | D-87: stato in coda o blocco su *Apri la pratica*? | **(a)** basta il blocco | D-131 | 1-doc |
| U23 | D-06: formula per il rettangolo nel PDF | **(a)** «verificato con il cloud; da verificare con GLM-OCR locale e con gli scansionati» | — | 1-doc |
| U24 | Su quale build si collaudano le prove nel browser? | **(a)** anche sulla build di esercizio, `bypass_csp` in `comune.py` | D-132 | 8-01 |
| U25 | Chi aggiorna le prove quando cambia il seed? | **(a)** chi cambia `dati-prova.json` lancia `app_flusso.py` e `app_bollettini.py`; la regola in CLAUDE.md §4 la scrive Ugo | — | — |
| U26 | Ore nel piano per D-87, D-91/D-92, PDF.js, D-93/D-94 | **(a)** attività con ore **da approvare** (10 h) | — | 1-doc |
| U27 | File non tracciati della radice | **(a)** committati (89a4105: `idee.md`, `specifica-lettura.md`, `app_llm_locale/`) | — | — |
| R0-1 | R2-01: correzione minima o collegamento sul server? | **tutte e due**: `correggi` riscrive le righe solo se arrivano; l'import collega il documento nella stessa transazione, niente secondo PUT | D-133 | 0b-01, 0b-02 |
| R0-2 | R2-05: subagente non trovato | **campo vuoto**; il subagente proposto lo decide il server (`subagente_id`), mai i nomi nel browser | D-134 | 0b-03 |
| R0-3 | Dopo *Importa* si apre la scheda o si resta nell'elenco? | **si apre la scheda** del nuovo cliente o fornitore | D-135 | 0b-05 |
| R0-4 | Cerca in Integra nel prototipo? | **no**: nota in `prototipo-alternativo/LEGGIMI.md` | D-136 | 0b-doc |
| R0-5 | Fatture dopo la chiusura dell'agenzia | per una pratica esistente basta l'agenzia alla **data dell'ordine**; `richiediAgenzia` alla data del documento solo per una pratica nuova | D-137 | 0b-02 |
| R0-6 | Cambio della P.IVA del soggetto | **dati da Integra intoccabili**: master di un soggetto da Integra tutto in sola lettura, per ora (409); solo CRM → nuova versione (D-46) dei ruoli nella stessa transazione; codice di Integra solo da Importa (Ugo 12/11) | D-138 | 0b-04 |
| R0-7 | `sconti` CASCADE o RESTRICT? | **RESTRICT**, migrazione nell'onda 0 | D-139 | 0-05 |

Non sono decisioni (chiuse nella versione 1): A5 *Da decidere* 1 (ore del blocco 744 px, approvate col piano v2.0); A5 *Da decidere* 4 (esempio di §16.4.3, lo scrive la documentazione dell'onda 3); A6 *Da decidere* 3 (collaudo su working tree che si muove: il lavoro f7 è committato).

## Avvertenze

1. **Lavoro f7**: committato (33334d8 e seguenti); `git status` di `app/` pulito all'11/11. I numeri di riga dei report A1…A9 sono dell'08/11, quelli di R1/R2 dell'11/11: ogni prompt dice all'esecutore di rileggere il codice e di non toccare un rilievo già risolto.
2. **Migrazioni dell'onda 0 rinominate** da `20261109…` a `20261113…`: la cartella ha già `20261112090000_storico_legami`, e una migrazione nuova con data precedente finirebbe prima di quella già applicata. Nomi: `20261113090000_bollettino_file`, `…100000_attese_restrict`, `…110000_numero_pratica_unico`, `…120000_indici_fk`, `…130000_ricerca_trgm`, `…140000_sconti_restrict`.
3. **§19 della spec**: D-106 compare **due volte** (09/11 «agenti in `agenti`» e 10/11 «agenzia mancante dal documento») e D-109, D-110 non esistono. Non li tocca nessun pacchetto: lo decide Ugo. I prompt che citano «D-106» intendono quello indicato nel testo.
4. **Prove in parallelo.** Due jest sullo stesso database si rompono a vicenda (A6-05). Ogni prompt usa un database suo, `decobrands_test_<onda>_<NN>` (`decobrands_test_0b_NN` per l'onda 0 bis), via `DATABASE_URL_TEST`, e una cartella documenti sua cambiando `TMP`/`TEMP`.
5. **Prove nel browser non in parallelo**: stessa cartella `.next` e stesse porte. I pacchetti le aggiornano e le controllano con `py_compile`; le lancia il controllo di fine onda. Le porte 8001/8002 sono di Ugo (`decobrands_db`): `app_scena.py` ha 8001 fisso (A6-10, 8-01).
6. **Integra** (192.168.239.49): nessun pacchetto la contatta; nelle prove il ponte è simulato (pool finto, `jest.spyOn`, `decobrands_ponte_prova`).
7. **File più contesi**, già separati per onda: `documenti.ts` (0-01, 0-02, 0b-02, 1-03, 2-01, 3-01, 5-01, 6-01); `VistaDocumento.tsx` (0b-01, 1-03, 2-02, 3-02, 5-01, 6-01); `clienti.ts` (0b-03, 1-02); `fornitori.ts` (0b-03, 1-02, 2-11); `VistaClienti.tsx` (0b-05, 1-19, 2-12, 3-04, 4-01); `stile.css` (0b-05, 1-07, 2-07, 3-05, 4-06, 8-01); `api.ts` (1-05, 2-06, 6-02); `oggi.ts` (1-06, 3-06, 4-04, 7-01); `accesso.ts` (1-05, 2-03, 3-08); `motore.ts` (1-01, 2-09, 3-07, 4-05, 5-05). Spec, guida e piano li tocca **solo** il pacchetto documentazione di ogni onda.
8. **Ordine dei D nel §19**: 0b-doc scrive D-133…D-138 prima che le onde 1–8 scrivano D-114…D-132, e 0-doc scrive D-139 per primo. Il registro resta in ordine di arrivo, come oggi (le righe del 08–11/11 non sono in ordine di numero).
