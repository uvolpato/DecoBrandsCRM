# Piano delle correzioni — collaudo finale Decobrands CRM (`app/`)

Versione 1 — 08/11/2026. Orchestratore (ORC) secondo `piano-collaudo-multiagente.md` §4. Fonte: i 9 report in `strumenti/collaudo/report/` (A1…A9). Prompt dei pacchetti in `strumenti/opencode/collaudo-*.md`.

> ⚠ **Prima di lanciare qualsiasi onda** leggi le *Avvertenze* in fondo: il lavoro f7 non committato (21 file di `app/`) va committato prima, e il collaudo A6 va ripetuto su quel commit.

## Totali

| | P0 | P1 | P2 | P3 | Totale |
|---|---|---|---|---|---|
| Rilievi dei report | 2 | 13 | 58 | 60 | 133 |
| Dopo l'unione dei doppioni | 2 | 11 | 53 | 55 | 121 |

- Scartati senza scenario: **0** (i rilievi di prestazioni A7-20…A7-26 sono ipotesi, ma ognuno ha scenario e misura).
- Pacchetti nelle onde: **51** (onda 0: 4; onde 1–6: 47) + **7** pacchetti documentazione (uno per onda) + **16** pacchetti in attesa di una decisione. Prompt scritti: 74.
- Onde: **0…6** (7 onde). Per onda: onda 0: 4 pacchetti (4 V4 + 0 Flash) + documentazione; onda 1: 22 pacchetti (6 V4 + 16 Flash) + documentazione; onda 2: 11 pacchetti (5 V4 + 6 Flash) + documentazione; onda 3: 7 pacchetti (3 V4 + 4 Flash) + documentazione; onda 4: 4 pacchetti (0 V4 + 4 Flash) + documentazione; onda 5: 2 pacchetti (0 V4 + 2 Flash) + documentazione; onda 6: 1 pacchetti (0 V4 + 1 Flash) + documentazione.
- Decisioni per Ugo: **27** (sezione *Da decidere*); 16 bloccano un pacchetto.

### Doppioni uniti (si tengono tutti gli ID)

| Rilievo unito | ID d'origine | Gravità | Pacchetto |
|---|---|---|---|
| Agenzie modificabili nel periodo chiuso (D-51/D-35) | A2-01 (punto 1), A3-01, A6-12 | P0 | attesa-01 |
| Storno dalla fotografia della liquidazione | A2-01 (punto 2), A2-02 | P0 | 1-01 |
| Pulizia scartati senza ricontrollo | A4-09, A3-04 | P2 | 1-08 |
| Blocco sotto i 744 px (D-44) | A5-03, A6-01 | P1 | 1-06 |
| Credenziali in body.json/cookies.txt | A8-14, A1-10 | P3 | 1-19 |
| app/deploy vuota, Caddyfile, HSTS | A8-05, A1-05, A9-12 (+A9-13 stesso README) | P2 | 1-14 |
| Somme fatte nel browser (V12) | A5-02 + nota A8 (`ConsultaDocumenti.tsx:212`); A5-08 + nota A8 (`VistaDocumento.tsx:728`) | P1 / P2 | 2-01 / attesa-07 |
| Esc e velo perdono le correzioni | A7-01, A5-15 (+A7-02, A7-03 stesso hook) | P2 | 3-02 |
| SSE e timeout di inattività D-89 | A1-02 + nota A5-12 (A5-12 resta un rilievo a sé: riconnessione) | P1 | 1-04 / 1-11 |
| Sagome D-59 e catalogo | A5-05, A5-06 (+ esempio spec §16.4.3, A5 Da decidere 4: non è una decisione, lo scrive la documentazione) | P2 | 3-03 / 4-01 |
| Prove del motore (maturato, storno) | A6-13 → A2-05 (storno) e A2-06 (NC) | P2 | 1-01 / attesa-03 |
| Sollecito: caricaDati in transazione | A3-07, A7-25 (parte incassi) | P2 | 1-15 |
| Due stile.css diversi | A5-21, A8-04 (+A7-13 stesso file) | P2 | 3-05 |

Rilievi **divisi** fra più pacchetti (stesso ID, parti diverse; ogni prompt dice quale parte): A1-01 (a: 1-03, b: attesa-02), A2-01 (punto 2: 1-01, punto 1: attesa-01), A4-07 (prefisso: 1-10, P.IVA condivisa: attesa-06), A6-13 (storno: 1-01, NC: attesa-03), A8-06 (motore: 1-01, impostazioni: 1-03), A5-05/A5-06 (parte 1: 3-03, parte 2: 4-01), A5-10 (VistaDocumento: 2-02, liste: 4-02, anagrafiche: 1-18), A7-12 (VistaDocumento: 3-02, CampoRicerca: 1-17), A7-20 (backend: 3-06, Barra: attesa-11), A7-22 (senza Barra: 3-06), A8-07 (backend: 5-02, frontend: 2-10).

Collegati ma **non** doppioni (pacchetti diversi, stessa area): A3-06 / A6-03 / A1-08 (eventi, stesso pacchetto); A5-13 / A7-20 (barra); A3-05 / A4-03 / A4-14 (stessa funzione `riceviDocumento`, stesso pacchetto); A6-02 / A1-04 (`api.ts`, stesso pacchetto).

## Tabella dei pacchetti

Legenda dei file: `B:` = `app/backend/src/`, `T:` = `app/backend/test/`, `F:` = `app/frontend/` (pagine in `app/frontend/app/(app)/`), `P:` = `strumenti/prove/`, `MIG:` = `app/backend/prisma/migrations/`, `proto:` = `prototipo-alternativo/`. Elenco completo nel prompt.

| Onda | Pacchetto | Gravità | Esecutore | Rilievi | File | Dipende da | Prompt |
|---|---|---|---|---|---|---|---|
| 0 | 0-01 Il file di un bollettino non si scarta e non si abbina a una pratica | P1 | V4 | A3-02 | MIG:20261109090000_bollettino_file/migration.sql, B:documenti.ts, T:bollettini.spec.ts, T:vincoli.spec.ts | — | `collaudo-0-01-vincoli-bollettino-file.md` |
| 0 | 0-02 Annullare un documento non cancella le decisioni di un bollettino chiuso | P2 | V4 | A3-03 | MIG:20261109100000_attese_restrict/migration.sql, app/backend/prisma/schema.prisma, B:documenti.ts, T:documenti-pratica.spec.ts | 0-01 | `collaudo-0-02-attese-restrict.md` |
| 0 | 0-03 Numero della pratica UNIQUE e indici sulle chiavi esterne | P3 | V4 | A3-10, A3-11 | MIG:20261109110000_numero_pratica_unico/migration.sql, MIG:20261109120000_indici_fk/migration.sql, app/backend/prisma/schema.prisma, T:vincoli.spec.ts | 0-02 | `collaudo-0-03-numero-unico-indici.md` |
| 0 | 0-04 Indici trigram per la ricerca delle Pratiche | P3 | V4 | A7-24 | MIG:20261109130000_ricerca_trgm/migration.sql, app/backend/prisma/schema.prisma | 0-03 | `collaudo-0-04-ricerca-trgm.md` |
| 0 | 0-doc Documentazione dell'onda | P3 | V4 Flash | sezioni *Da documentare* dei resoconti dell'onda | spec, `F:lib/guida.ts`, piano, PRD, LEGGIMI, `proto:assets/guida.js`, `app/README.md` | tutti i pacchetti dell'onda 0 | `collaudo-0-doc-documentazione.md` |
| 1 | 1-01 Motore: storni dalla fotografia, una fattura al mese, correzioni su NC, numero riusato | P0 | V4 | A2-01, A2-02, A2-03, A2-05, A6-13, A2-08, A8-06 | B:motore/motore.ts, B:motore/dati.ts, T:motore.spec.ts, T:correzione.spec.ts, T:liquidazioni.spec.ts, proto:motore.js | — | `collaudo-1-01-motore-storni-mese.md` |
| 1 | 1-02 Documenti: D-87 sulla fattura, documento in errore recuperabile, corpo non valido | P1 | V4 | A2-04, A4-01, A4-13 | B:documenti.ts, B:lettura.ts, B:lettore.ts, F:documenti/[id]/VistaDocumento.tsx, T:documenti-pratica.spec.ts, T:documenti-lettura.spec.ts, T:coda.spec.ts, P:app_documenti.py | — | `collaudo-1-02-documenti-errore-d87.md` |
| 1 | 1-03 Impostazioni: il segreto vecchio non parte verso un server nuovo | P1 | V4 | A1-01, A8-06 | B:impostazioni.ts, B:impostazioni-api.ts, T:impostazioni.spec.ts | — | `collaudo-1-03-impostazioni-segreti.md` |
| 1 | 1-04 Sessione: timeout di inattività vero, durata massima, area sconosciuta | P1 | V4 | A1-02, A1-03, A1-07 | B:accesso.ts, T:profilo.spec.ts, F:lib/api.ts, F:sistema/VistaSistema.tsx, F:oggi/VistaOggi.tsx, F:documenti/VistaDocumenti.tsx, F:pratiche/VistaPratiche.tsx, F:bollettini/VistaBollettini.tsx | — | `collaudo-1-04-sessione-inattivita.md` |
| 1 | 1-05 Oggi: bollettini dell'anno prima e gruppo «Documenti da decidere» | P1 | V4 Flash | A4-02, A4-11 | B:oggi.ts, T:oggi.spec.ts, P:app_oggi.py | — | `collaudo-1-05-oggi-bollettini-documenti.md` |
| 1 | 1-06 Blocco sotto i 744 px (D-44) | P1 | V4 Flash | A5-03, A6-01 | F:app/layout.tsx, F:app/stile/stile.css, proto:stile.css, proto:index.html, P:app_guscio.py | — | `collaudo-1-06-schermo-stretto.md` |
| 1 | 1-07 Due giri di jest sullo stesso database: il secondo si ferma subito | P2 | V4 Flash | A6-05 | app/backend/package.json, T:blocco.ts | — | `collaudo-1-07-isolamento-jest.md` |
| 1 | 1-08 Pulizia degli scartati senza cancellare un documento recuperato | P2 | V4 Flash | A3-04, A4-09 | B:sistema.ts, T:sistema.spec.ts, T:scartati.spec.ts | — | `collaudo-1-08-pulizia-scartati.md` |
| 1 | 1-09 Casella: STARTTLS obbligatorio, email malformata, limite per allegato | P2 | V4 | A4-04, A4-05, A4-12 | B:casella.ts, T:casella.spec.ts | — | `collaudo-1-09-casella.md` |
| 1 | 1-10 Proposta: P.IVA con prefisso del paese; «Affidabile» su un documento senza fornitore | P2 | V4 Flash | A4-07, A6-18 | B:proposta.ts, T:proposta.spec.ts, app/backend/prisma/seed/dati-prova.json, T:seed.spec.ts | — | `collaudo-1-10-proposta-piva.md` |
| 1 | 1-11 Canale SSE che si riapre dopo un errore HTTP | P2 | V4 Flash | A5-12 | F:lib/eventi.tsx, P:app_eventi.py | — | `collaudo-1-11-sse-riconnessione.md` |
| 1 | 1-12 Registro: 4xx registrati, dettaglio non valido in anomalia, anomalia atomica, filtri per giorno | P2 | V4 | A8-02, A8-03, A3-09, A3-12 | B:errori.filter.ts, B:registro.ts, B:registro-api.ts, T:registro.spec.ts, T:registro-api.spec.ts | — | `collaudo-1-12-registro.md` |
| 1 | 1-13 Segreti d'esempio rifiutati in esercizio | P2 | V4 Flash | A1-06 | B:main.ts, T:avvio.spec.ts | — | `collaudo-1-13-segreti-avvio.md` |
| 1 | 1-14 Messa in esercizio: Caddyfile, HSTS, script, README | P2 | V4 Flash | A1-05, A8-05, A9-12, A9-13 | app/deploy/Caddyfile, app/deploy/*, F:next.config.ts, app/README.md, app/NOTA-RILASCIO.md, app/avvia-esercizio.bat | — | `collaudo-1-14-deploy.md` |
| 1 | 1-15 Sollecito di pagamento: tempo limite e fatture già pagate | P2 | V4 Flash | A3-07, A7-25 | B:incassi.ts, T:incassi.spec.ts | — | `collaudo-1-15-incassi-sollecito.md` |
| 1 | 1-16 PDF del bollettino con PDF.js invece di <object> | P2 | V4 Flash | A4-10 | F:bollettini/[id]/VistaBollettino.tsx, P:app_bollettino.py | — | `collaudo-1-16-pdf-bollettino.md` |
| 1 | 1-17 Campo di ricerca: voce attiva annunciata e nome dell'input | P2 | V4 Flash | A7-08, A7-12 | F:componenti/CampoRicerca.tsx, P:app_componenti.py | — | `collaudo-1-17-campo-ricerca-aria.md` |
| 1 | 1-18 Tabelle che ricordano lo stato: Subagenti, Utenti, Fornitori, Clienti; colonna di Utenti | P2 | V4 Flash | A5-10, A6-14 | F:subagenti/VistaSubagenti.tsx, F:utenti/VistaUtenti.tsx, F:fornitori/VistaFornitori.tsx, F:clienti/VistaClienti.tsx | — | `collaudo-1-18-memoria-anagrafiche.md` |
| 1 | 1-19 Pulizia della radice e cartelle di uscita ignorate | P3 | V4 Flash | A1-10, A8-14 | .gitignore, body.json, cookies.txt | — | `collaudo-1-19-pulizia-radice.md` |
| 1 | 1-20 Prove nel browser vecchie o fragili | P3 | V4 Flash | A6-07, A6-08, A6-09 | P:app_bollettini.py, P:app_flusso.py, P:app_analisi.py, P:app_clienti.py, P:app_subagenti.py | — | `collaudo-1-20-prove-vecchie.md` |
| 1 | 1-21 Avvisi annunciati dal lettore di schermo; errori come alert | P3 | V4 Flash | A7-11 | F:componenti/Piccoli.tsx | — | `collaudo-1-21-avvisi-live.md` |
| 1 | 1-22 Prova a matrice dei permessi su tutte le rotte | P3 | V4 Flash | A1-09 | T:permessi.spec.ts | — | `collaudo-1-22-permessi-matrice.md` |
| 1 | 1-doc Documentazione dell'onda | P3 (A9-03 P2) | V4 Flash | sezioni *Da documentare* dei resoconti dell'onda, A9-03, A9-04, A9-06 | spec, `F:lib/guida.ts`, piano, PRD, LEGGIMI, `proto:assets/guida.js`, `app/README.md` | tutti i pacchetti dell'onda 1 | `collaudo-1-doc-documentazione.md` |
| 2 | 2-01 Confronto delle righe dei documenti calcolato dal server (V12, D-60) | P1 | V4 | A5-02 | B:documenti.ts, F:componenti/ConsultaDocumenti.tsx, T:pratiche.spec.ts, P:app_pratica.py | — | `collaudo-2-01-confronto-righe-server.md` |
| 2 | 2-02 Schede controllate, dettaglio del documento che si azzera, testi «non riconosciuto» | P1 | V4 Flash | A5-01, A5-04, A6-16, A5-10 | F:componenti/Schede.tsx, F:pratiche/[id]/VistaPratica.tsx, F:documenti/VistaDocumenti.tsx, F:documenti/[id]/VistaDocumento.tsx, P:app_documenti.py | — | `collaudo-2-02-schede-dettaglio-documento.md` |
| 2 | 2-03 Aggiornamenti dal vivo: eventi persi, SSE dopo l'uscita, sollecito che non avvisa | P2 | V4 | A3-06, A1-08, A6-03 | B:eventi.ts, T:eventi.spec.ts, B:incassi.ts, B:solleciti.ts, F:oggi/VistaOggi.tsx | — | `collaudo-2-03-eventi-dal-vivo.md` |
| 2 | 2-04 Chiusura del bollettino, somme in Decimal, prove di concorrenza (V13) | P2 | V4 Flash | A3-08, A2-09, A6-11 | B:bollettino.ts, B:esporta-liquidazione.ts, T:bollettino.spec.ts, T:liquidazioni.spec.ts, T:documenti-pratica.spec.ts | — | `collaudo-2-04-bollettino-somme-concorrenza.md` |
| 2 | 2-05 Esci sicuro, ritorno dopo l'accesso, contatori della barra dal vivo, Stato del sistema | P2 | V4 | A6-02, A1-04, A5-13, A6-17 | F:componenti/Barra.tsx, F:lib/api.ts, F:app/accesso/esci/page.tsx, P:app_accesso.py, P:app_eventi.py, F:sistema/VistaSistema.tsx, P:app_sistema.py | — | `collaudo-2-05-uscita-barra.md` |
| 2 | 2-06 DataTable: paginazione sempre, intestazioni e righe da tastiera | P2 | V4 Flash | A5-07, A7-04, A7-05 | F:componenti/DataTable.tsx, F:app/stile/stile.css, proto:stile.css, P:app_pratiche.py, P:app_analisi.py | — | `collaudo-2-06-datatable-tastiera.md` |
| 2 | 2-07 Guscio: pagina d'errore se il server non risponde; pulsanti spenti anche da tastiera | P2 | V4 | A5-14, A7-07 | F:layout.tsx, P:app_guscio.py, P:app_liquidazioni.py | — | `collaudo-2-07-guscio-errori-sola-lettura.md` |
| 2 | 2-08 Motore: indici costruiti una volta, niente scansioni quadratiche | P2 | V4 | A7-21 | B:motore/dati.ts, B:motore/motore.ts, T:motore-volumi.spec.ts | 1-01 | `collaudo-2-08-motore-indici.md` |
| 2 | 2-09 Cliente › Pratiche: importo in euro e stato con etichetta | P3 | V4 Flash | A5-18 | F:clienti/VistaClienti.tsx, F:pratiche/VistaPratiche.tsx, F:lib/stati.ts, P:app_clienti.py | — | `collaudo-2-09-cliente-pratiche-formato.md` |
| 2 | 2-10 mpiu/mk esportati da PeriodoMesi | P3 | V4 Flash | A8-07 | F:componenti/PeriodoMesi.tsx, F:analisi/VistaAnalisi.tsx, F:bollettini/VistaBollettini.tsx | — | `collaudo-2-10-aiuti-mesi-frontend.md` |
| 2 | 2-11 Dipendenze: inutile tolta, versioni bloccate, strumento di prova fuori da src, ESLint | P3 | V4 Flash | A8-09, A8-10, A8-11, A5-17 | app/backend/package.json, app/backend/package-lock.json, F:package.json, F:package-lock.json, B:lettura-prova.ts, app/backend/prisma/lettura-prova.ts, F:eslint.config.mjs | — | `collaudo-2-11-dipendenze-lint.md` |
| 2 | 2-doc Documentazione dell'onda | P3 | V4 Flash | sezioni *Da documentare* dei resoconti dell'onda, A9-07, A9-10, A9-11 | spec, `F:lib/guida.ts`, piano, PRD, LEGGIMI, `proto:assets/guida.js`, `app/README.md` | tutti i pacchetti dell'onda 2 | `collaudo-2-doc-documentazione.md` |
| 3 | 3-01 Arrivo dello stesso file e annullo di un documento letto | P2 | V4 | A3-05, A4-03, A4-14, A4-06 | B:documenti.ts, T:documenti.spec.ts | — | `collaudo-3-01-arrivo-annullo-documenti.md` |
| 3 | 3-02 Finestre: Esc e velo non perdono le correzioni, fuoco e trappola, nomi dei campi letti | P2 | V4 Flash | A5-15, A7-01, A7-02, A7-03, A7-06, A7-12 | F:componenti/Modale.tsx, F:documenti/[id]/VistaDocumento.tsx, F:componenti/ConsultaDocumenti.tsx, P:app_documenti.py, P:app_pratica.py, P:app_componenti.py | — | `collaudo-3-02-finestre-fuoco.md` |
| 3 | 3-03 Sagome D-59 senza lampo di «Nessun elemento» — parte 1: componenti, catalogo, Pratiche, Documenti, Registro | P2 | V4 | A5-05, A5-06 | F:componenti/DataTable.tsx, F:componenti/FilterBar.tsx, F:componenti/page.tsx, F:pratiche/VistaPratiche.tsx, F:documenti/VistaDocumenti.tsx, F:registro/VistaRegistro.tsx, P:app_caricamento.py | — | `collaudo-3-03-sagome-1.md` |
| 3 | 3-04 Data di oggi a Roma in tutti i campi «Valido dal»; anno doppio nei Bollettini | P2 | V4 Flash | A5-16, A5-19 | F:lib/formati.ts, F:clienti/VistaClienti.tsx, F:fornitori/VistaFornitori.tsx, F:subagenti/VistaSubagenti.tsx, F:pratiche/[id]/VistaPratica.tsx, F:bollettini/VistaBollettini.tsx, P:app_clienti.py | — | `collaudo-3-04-data-oggi-anno.md` |
| 3 | 3-05 I due stile.css uguali; evidenziazione con «riduci movimento» | P2 | V4 Flash | A5-21, A8-04, A7-13 | F:app/stile/stile.css, proto:stile.css | — | `collaudo-3-05-stile-allineato.md` |
| 3 | 3-06 Meno caricamenti completi: conteggi della barra in SQL, Oggi raggruppato, report nella stessa richiesta | P2 | V4 | A7-20, A7-22 | B:oggi.ts, T:oggi.spec.ts, F:oggi/VistaOggi.tsx, F:liquidazioni/VistaLiquidazioni.tsx, B:liquidazioni.ts, T:liquidazioni.spec.ts | 1-01, 1-05, 2-03 | `collaudo-3-06-carichi-oggi-liquidazioni.md` |
| 3 | 3-07 «Pagina non trovata» al posto di «In costruzione» | P3 | V4 Flash | A8-08 | F:[...resto]/page.tsx, F:componenti/InCostruzione.tsx, F:not-found.tsx, P:app_guscio.py | — | `collaudo-3-07-pagina-non-trovata.md` |
| 3 | 3-doc Documentazione dell'onda | P3 | V4 Flash | sezioni *Da documentare* dei resoconti dell'onda | spec, `F:lib/guida.ts`, piano, PRD, LEGGIMI, `proto:assets/guida.js`, `app/README.md` | tutti i pacchetti dell'onda 3 | `collaudo-3-doc-documentazione.md` |
| 4 | 4-01 Sagome D-59 — parte 2: Sistema, Scartati, Analisi, Clienti, Utenti; Scartati a 768 px | P2 | V4 Flash | A5-05, A5-06, A6-15 | F:sistema/VistaSistema.tsx, F:scartati/VistaScartati.tsx, F:analisi/VistaAnalisi.tsx, F:clienti/VistaClienti.tsx, F:utenti/VistaUtenti.tsx, P:app_scartati.py | 3-03 | `collaudo-4-01-sagome-2.md` |
| 4 | 4-02 Tabelle che ricordano ordinamento e scorrimento: Pratiche e Liquidazioni | P2 | V4 Flash | A5-10 | F:pratiche/VistaPratiche.tsx, F:liquidazioni/VistaLiquidazioni.tsx, P:app_liquidazioni.py, P:app_pratiche.py | — | `collaudo-4-02-memoria-liste.md` |
| 4 | 4-03 Scorrimento ripristinato all'arrivo dei dati; «Torna a…» che non punta a sé | P2 | V4 Flash | A5-11, A6-19 | F:componenti/Pagina.tsx, F:lib/memoria.ts, F:pratiche/[id]/VistaPratica.tsx, F:bollettini/[id]/VistaBollettino.tsx, P:app_pratica.py, P:app_f7_collaudo.py | — | `collaudo-4-03-scorrimento-torna.md` |
| 4 | 4-04 Importi in euro scritti in un solo modo nel backend | P2 | V4 Flash | A8-01 | B:formati.ts, B:proposta.ts, B:oggi.ts, B:incassi.ts, B:solleciti.ts, T:oggi.spec.ts, T:incassi.spec.ts | 1-05, 2-03, 1-10, 1-15, 3-06 | `collaudo-4-04-formati-backend.md` |
| 4 | 4-doc Documentazione dell'onda | P3 | V4 Flash | sezioni *Da documentare* dei resoconti dell'onda | spec, `F:lib/guida.ts`, piano, PRD, LEGGIMI, `proto:assets/guida.js`, `app/README.md` | tutti i pacchetti dell'onda 4 | `collaudo-4-doc-documentazione.md` |
| 5 | 5-01 Scaricamenti con sessione scaduta; Analisi senza richieste accavallate | P3 | V4 Flash | A5-20, A7-23 | F:lib/api.ts, F:liquidazioni/VistaLiquidazioni.tsx, F:analisi/VistaAnalisi.tsx, P:app_liquidazioni.py | — | `collaudo-5-01-scaricamenti-analisi.md` |
| 5 | 5-02 Aiuti copiati in un solo modulo (dataIt, MESI, ELENCO_ID, MESE) e commenti ponytail chiusi | P3 | V4 Flash | A8-07, A8-12, A8-13 | B:formati.ts, B:validazione.ts, B:analisi.ts, B:bollettino.ts, B:esporta-liquidazione.ts, B:incassi.ts, B:liquidazioni.ts, B:oggi.ts, B:pratiche.ts, B:solleciti.ts, B:bollettini.ts, B:registro-api.ts, B:motore/dati.ts | 4-04, 1-12, 2-04, 3-06, 2-08 | `collaudo-5-02-debito-backend.md` |
| 5 | 5-doc Documentazione dell'onda | P3 | V4 Flash | sezioni *Da documentare* dei resoconti dell'onda | spec, `F:lib/guida.ts`, piano, PRD, LEGGIMI, `proto:assets/guida.js`, `app/README.md` | tutti i pacchetti dell'onda 5 | `collaudo-5-doc-documentazione.md` |
| 6 | 6-01 Prove nel browser: indirizzo unico, esito subito, uscita 1 con KO | P3 | V4 Flash | A6-10 | P:comune.py, P:app_*.py | — | `collaudo-6-01-prove-comune.md` |
| 6 | 6-doc Documentazione dell'onda | P3 | V4 Flash | sezioni *Da documentare* dei resoconti dell'onda, A9-14 | spec, `F:lib/guida.ts`, piano, PRD, LEGGIMI, `proto:assets/guida.js`, `app/README.md` | tutti i pacchetti dell'onda 6 | `collaudo-6-doc-documentazione.md` |

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

# 2. prove nel browser dell'onda (elenco sotto), come le ha lanciate A6: backend `dist` su 8012 con DATABASE_URL di prova,
#    NODE_ENV=development, TENTATIVI*=1000, DOCUMENTI_DIR temporanea; frontend `next dev -p 8011` con
#    BACKEND_URL=http://127.0.0.1:8012 (con `next start` serve bypass_csp, A6-06/U24); seed §12 ricaricato prima di ogni prova
#    (TRUNCATE di test/svuota.ts + seed); `node ../../strumenti/prove/utenti_prova.js crea <s>`.
python strumenti/prove/app_<pagina>.py <s> <cartella schermate> http://localhost:8011

# 3. grafo e pagine della documentazione
graphify update .
python3 strumenti/genera-pagine-doc.py
```

**Controllo finale di Claude Code** (per ogni pacchetto, prima del commit): resoconto letto; `git diff` solo sui file ammessi; decisioni del §19 non semplificate; numeri del seed §12 invariati salvo dove il rilievo li cambia (scritto nel resoconto). Review **completa** (skill caricate davvero) sul codice sensibile — accesso, sessioni, permessi, soldi/provvigioni, SQL e migrazioni, Integra: `owasp-security` (o `vibesec`), `/code-review`, `/ponytail:ponytail-review`, e `postgresql-code-review` per SQL e migrazioni. Review leggera (rilettura del diff) sul resto. Controllo visivo a 1440 e 768 px per le modifiche d'interfaccia (CLAUDE.md regola 5).

### Onda 0

Pacchetti **in serie** (0-01 → 0-04), ognuno con la sua migrazione; dopo ognuno: `npx prisma migrate deploy` sul database di prova condiviso e `npm test` completo. A fine onda le migrazioni vanno applicate anche al database di sviluppo di Ugo (`decobrands_db`, `npx prisma migrate deploy`) — lo decide Ugo. Prove nel browser: `app_pratiche.py`, `app_documenti.py`, `app_bollettino.py`, `app_flusso.py` (numeri del seed invariati).

### Onda 1

- `npm test` 0 KO; prove nel browser: `app_analisi.py`, `app_bollettini.py`, `app_bollettino.py`, `app_clienti.py`, `app_componenti.py`, `app_documenti.py`, `app_eventi.py`, `app_f7_collaudo.py`, `app_flusso.py`, `app_fornitori.py`, `app_guscio.py`, `app_liquidazioni.py`, `app_oggi.py`, `app_pratiche.py`, `app_profilo.py`, `app_registro.py`, `app_subagenti.py`, `app_utenti.py`, più `app_flusso.py` e `app_f7_collaudo.py` come rete di sicurezza.
- KO già noti che **non** si chiudono in quest'onda: `app_accesso.py` instabile (A6-02 → onda 2), `app_oggi.py` dopo *Copia il testo* (A6-03 → onda 2), `app_flusso.py:469` righe ferme in Pratiche (A6-04, in attesa di U21). Tutti gli altri a 0 KO; `app_bollettini.py`, `app_flusso.py` (salvo :469), `app_analisi.py`, `app_clienti.py`, `app_subagenti.py` **devono** tornare verdi (A6-07/08/09).
- Review completa su: 1-01, 1-02, 1-03, 1-04, 1-09, 1-12; leggera sugli altri.
- Onda grande (22 pacchetti): si può lanciare a gruppi; conta solo che nessun file sia toccato da due pacchetti insieme (già garantito dagli elenchi *File vietati*). `1-07 isolamento-jest` (A6-05) cambia `package.json` del backend: lancialo per primo o da solo, poi gli altri.

### Onda 2

- `npm test` 0 KO; prove nel browser: `app_accesso.py`, `app_analisi.py`, `app_bollettini.py`, `app_clienti.py`, `app_componenti.py`, `app_documenti.py`, `app_eventi.py`, `app_guscio.py`, `app_liquidazioni.py`, `app_oggi.py`, `app_pratica.py`, `app_pratiche.py`, `app_sistema.py`, `app_utenti.py`, più `app_flusso.py` e `app_f7_collaudo.py` come rete di sicurezza.
- KO noto ammesso: `app_flusso.py:469` (A6-04, in attesa di U21). `app_accesso.py` lanciata 5 volte di fila senza fermarsi; `app_oggi.py` verde.
- Review completa su: 2-01, 2-03, 2-05, 2-07, 2-08; leggera sugli altri.
- `2-11 dipendenze-lint` fa `npm ci`: **lancialo per ultimo** nell'onda 2, quando gli altri hanno finito.

### Onda 3

- `npm test` 0 KO; prove nel browser: `app_bollettini.py`, `app_bollettino.py`, `app_caricamento.py`, `app_clienti.py`, `app_componenti.py`, `app_documenti.py`, `app_f7_numeri.py`, `app_guscio.py`, `app_liquidazioni.py`, `app_oggi.py`, `app_pratica.py`, `app_pratiche.py`, `app_registro.py`, più `app_flusso.py` e `app_f7_collaudo.py` come rete di sicurezza.
- Review completa su: 3-01, 3-03, 3-06; leggera sugli altri.

### Onda 4

- `npm test` 0 KO; prove nel browser: `app_analisi.py`, `app_bollettino.py`, `app_caricamento.py`, `app_clienti.py`, `app_f7_collaudo.py`, `app_liquidazioni.py`, `app_pratica.py`, `app_pratiche.py`, `app_scartati.py`, `app_sistema.py`, `app_utenti.py`, più `app_flusso.py` e `app_f7_collaudo.py` come rete di sicurezza.
- Review completa su: nessun pacchetto V4; leggera sugli altri.

### Onda 5

- `npm test` 0 KO; prove nel browser: `app_analisi.py`, `app_liquidazioni.py`, più `app_flusso.py` e `app_f7_collaudo.py` come rete di sicurezza.
- Review completa su: nessun pacchetto V4; leggera sugli altri.

### Onda 6

- `npm test` 0 KO; prove nel browser: `app_*.py` (tutte: le tocca il pacchetto), più `app_flusso.py` e `app_f7_collaudo.py` come rete di sicurezza.
- Review completa su: nessun pacchetto V4; leggera sugli altri.

## Onda in attesa

Pacchetti che dipendono da una decisione di Ugo. Il prompt è già scritto con il blocco «NON LANCIARE»: dopo la decisione Claude Code lo conferma (o lo riscrive se Ugo sceglie un'altra opzione), lo mette nella prima onda utile dopo le dipendenze in cui nessun altro pacchetto tocca i suoi file, e completa i *File vietati*.

| Pacchetto | Gravità | Esecutore | Rilievi | File | Decisione | Dopo | Prompt |
|---|---|---|---|---|---|---|---|
| attesa-01 Agenzie bloccate nel periodo chiuso (D-51 esteso) | P0 | V4 | A2-01, A3-01, A6-12 | B:clienti.ts, B:fornitori.ts, B:motore/dati.ts, T:clienti.spec.ts | **U1** | 1-01, 2-08 | `collaudo-attesa-01-agenzie-periodo-chiuso.md` |
| attesa-02 Posta, casella e Integra modificabili solo dal superutente | P1 | V4 | A1-01 | B:impostazioni.ts, B:impostazioni-api.ts, B:accesso.ts, F:impostazioni/*, T:impostazioni.spec.ts | **U2** | 1-03, 1-04 | `collaudo-attesa-02-connessioni-superutente.md` |
| attesa-03 Nota di credito sul maturato che segue la sua fattura | P2 | V4 | A2-06, A6-13 | B:motore/motore.ts, proto:motore.js, T:motore.spec.ts | **U5** | 1-01, 2-08 | `collaudo-attesa-03-nc-maturato.md` |
| attesa-04 Report subagenti di un trimestre chiuso dalla fotografia | P2 | V4 | A2-07 | B:liquidazioni.ts, B:motore/motore.ts, T:liquidazioni.spec.ts | **U7** | 1-01, 3-06, 2-08 | `collaudo-attesa-04-report-fotografia.md` |
| attesa-05 Stessa fattura su due pratiche solo con conferma «multi-ordine» | P2 | V4 | A4-08 | B:documenti.ts, F:componenti/Flussi.tsx, F:pratiche/[id]/VistaPratica.tsx, F:documenti/[id]/VistaDocumento.tsx, T:documenti-pratica.spec.ts | **U11** | 1-02, 3-01 | `collaudo-attesa-05-fattura-doppia.md` |
| attesa-06 Più clienti con la stessa P.IVA: decide la ragione sociale | P2 | V4 Flash | A4-07 | B:proposta.ts, T:proposta.spec.ts | **U12** | 1-10 | `collaudo-attesa-06-piva-condivisa.md` |
| attesa-07 Totali delle tabelle e differenze del bollettino dal server (V12) | P2 | V4 | A5-08 | F:componenti/DataTable.tsx, F:liquidazioni/VistaLiquidazioni.tsx, F:analisi/VistaAnalisi.tsx, F:documenti/[id]/VistaDocumento.tsx, F:bollettini/[id]/VistaBollettino.tsx, B:liquidazioni.ts, B:analisi.ts, B:bollettino.ts, B:documenti.ts | **U14** | — | `collaudo-attesa-07-totali-server.md` |
| attesa-08 Memoria della schermata per passo di cronologia e dopo il ricaricamento | P2 | V4 | A5-09 | F:lib/memoria.ts, P:app_pratiche.py | **U15** | 4-03 | `collaudo-attesa-08-memoria-cronologia.md` |
| attesa-09 Contrasti WCAG e carattere fuori dal CSS bloccante | P3 | V4 Flash | A7-09, A7-26 | F:app/stile/stile.css, proto:stile.css, F:app/stile/public-sans.css, F:app/layout.tsx, F:public/fonts/* | **U16** | 3-05 | `collaudo-attesa-09-colori-caratteri.md` |
| attesa-10 Segmenti come gruppo di pulsanti, non schede | P3 | V4 Flash | A7-10 | F:componenti/FilterBar.tsx, F:componenti/Solleciti.tsx, F:componenti/ConsultaDocumenti.tsx, F:app/stile/stile.css, proto:stile.css, P:app_*.py | **U18** | — | `collaudo-attesa-10-segmenti-filtri.md` |
| attesa-11 Barra laterale che si rilegge solo all'evento | P2 | V4 Flash | A7-20 | F:componenti/Barra.tsx | **U20** | 2-05, 3-06 | `collaudo-attesa-11-barra-evento.md` |
| attesa-12 Pratiche: righe ferme fino ad Aggiorna (o eccezione D-94 scritta) | P2 | V4 Flash | A6-04, A9-08 | F:pratiche/VistaPratiche.tsx | **U21** | 1-04, 3-03, 4-02 | `collaudo-attesa-12-pratiche-righe-ferme.md` |
| attesa-13 D-87: stato «da configurare» in coda o solo blocco su Apri la pratica | P3 | V4 Flash | A9-09 | specifica-crm-provvigioni.md, F:lib/guida.ts | **U22** | — | `collaudo-attesa-13-d87-coda.md` |
| attesa-14 D-06: testi del rettangolo nel PDF allineati | P3 | V4 Flash | A9-01, A9-02 | F:lib/guida.ts, proto:guida.js, proto:LEGGIMI.md | **U23** | — | `collaudo-attesa-14-d06-testi.md` |
| attesa-15 Prove nel browser anche sulla build di esercizio | P2 | V4 Flash | A6-06 | P:comune.py, P:app_*.py | **U24** | — | `collaudo-attesa-15-prove-build-esercizio.md` |
| attesa-16 Ore nel piano per D-87, D-91/D-92, rettangolo PDF.js, D-93/D-94 | P3 | V4 Flash | A9-05 | piano-lavoro-crm.md | **U26** | — | `collaudo-attesa-16-ore-piano.md` |

⚠ `attesa-01` è **P0**: la decisione U1 va presa per prima. Il pacchetto del motore `1-01` sistema già lo storno (punto 2 di A2-01), ma finché le agenzie restano modificabili nel periodo chiuso Analisi e fatture non ancora liquidate possono cambiare.

## Da decidere (Ugo)

Domande numerate U1…U27 (U = Ugo, per non confonderle con le decisioni D-nn del §19). Rilievi contro una decisione del §19 o messi dai report in *Da decidere*. Ogni voce: domanda, opzioni, raccomandazione, cosa resta bloccato. Dopo la scelta: riga D-nn nel §19 (la scrive il pacchetto documentazione dell'onda in cui entra il pacchetto).

**U1. Agenzie e periodo chiuso: D-51 vale anche per le agenzie (`interscambio`)?**  
Opzioni: (a) sì: niente modifica/eliminazione di un'agenzia con `valido_dal` ≤ ultima chiusura; si chiude e se ne apre una nuova (nuova D-nn); (b) no, si accetta che un cambio sposti i trimestri chiusi.  
Raccomandazione: (a). È l'unico modo di rispettare D-35 («un cambio di subagente non deve spostare le provvigioni passate»); lo storno usa già la fotografia (pacchetto del motore).  
Bloccati: attesa-01 (A2-01 punto 1, A3-01, A6-12) — P0. Origine: A2 Da decidere 3, A3 Da decidere 1.

**U2. Chi modifica le connessioni Posta, Casella, Integra?**  
Opzioni: (a) solo il superutente, permesso nuovo `sistema.connessioni` (cambia §8.3); (b) solo Posta al superutente; (c) restano agli amministratori (resta il rischio del reset password del superutente via SMTP).  
Raccomandazione: (a). Dalla Posta passa il reset della password del superutente: un amministratore non deve poterla dirottare (D-39, D-45).  
Bloccati: attesa-02 (A1-01 parte b) — P1. Origine: A1 Da decidere 2.

**U3. D-81: un estraneo può bloccare l'accesso di Ugo con 10 tentativi sbagliati ogni 15 minuti. Come si conta?**  
Opzioni: (a) contare solo i tentativi falliti e azzerare dopo un accesso riuscito; (b) contatore IP + persona (come D-41) e tetto per persona largo (50); (c) lasciare così.  
Raccomandazione: (b) se il CRM sarà raggiungibile da Internet, altrimenti (a). Diventa un pacchetto V4 su `accesso.ts` dopo la scelta.  
Bloccati: nessuno (nuovo pacchetto dopo la scelta). Origine: A1 Da decidere 1.

**U4. L'amministratore può impersonare un operatore (cambia l'email e reimposta la password). Si limita?**  
Opzioni: (a) email di avviso al vecchio indirizzo quando l'email cambia; (b) si accetta (resta nel registro, D-39).  
Raccomandazione: (a): costa poco e avvisa la persona.  
Bloccati: nessuno (nuovo pacchetto dopo la scelta). Origine: A1 Da decidere 3.

**U5. Nota di credito sul maturato: entra con la sua fattura riconosciuta o aspetta di comparire nel bollettino?**  
Opzioni: (a) segue la fattura (`riconosciutoIn` della fattura); (b) aspetta il bollettino (oggi: resta «in attesa di incasso» per sempre).  
Raccomandazione: (a). Con (b) il subagente non riceve mai la riduzione (50 € invece di 40 € nell'esempio di A2-06).  
Bloccati: attesa-03 (A2-06, A6-13 prima parte) — P2. Origine: A2 Da decidere 1.

**U6. Bollettino contestato: dove entrano le correzioni del fornitore, se il secondo bollettino dello stesso mese non si può caricare?**  
Opzioni: (a) righe di rettifica nel bollettino del mese successivo; (b) il bollettino rettificato sostituisce il contestato (conservando il vecchio).  
Raccomandazione: (a): rispetta D-56 (nessuna riapertura) e il vincolo fornitore×mese.  
Bloccati: nessuno (nuovo pacchetto dopo la scelta). Origine: A2 Da decidere 2.

**U7. Report subagenti di un trimestre chiuso: mostra la provvigione «generata» (ricalcolata, comprende i documenti in attesa) o quella liquidata (fotografia)?**  
Opzioni: (a) trimestre chiuso = fotografia della liquidazione, trimestre aperto = calcolo dal vivo; (b) sempre «generata» (oggi).  
Raccomandazione: (a): stessi numeri della liquidazione chiusa (D-33); scriverlo nella guida.  
Bloccati: attesa-04 (A2-07) — P2. Origine: A2 Da decidere 4.

**U8. Regole del fornitore senza data (`tipo_provvigione`, `giorno_bollettino`, `giorni_incasso`): si possono cambiare per tutto il passato?**  
Opzioni: (a) `tipo_provvigione` bloccato dopo la prima chiusura (409), gli altri due liberi; (b) tutte datate come le percentuali; (c) si accetta.  
Raccomandazione: (a): il tipo cambia come si ricalcolano i mesi chiusi; gli altri due toccano solo solleciti e scadenze.  
Bloccati: nessuno (nuovo pacchetto dopo la scelta). Origine: A3 Da decidere 2.

**U9. Righe dei bollettini: nessuna rotta le crea (solo il seed). È un'attività ancora aperta del piano?**  
Opzioni: (a) sì, attività aperta (indicare quale); (b) è una mancanza da pianificare con ore.  
Raccomandazione: Confermare in quale attività del piano sta: senza, il bollettino vero non entra.  
Bloccati: nessuno. Origine: A3 Da decidere 3.

**U10. Lo stesso PDF scartato che torna per email rimette in coda lo scartato in automatico (D-54). Va bene anche per la casella?**  
Opzioni: (a) rianimare solo se `origine = caricamento`, dalla casella solo contarlo fra gli ignorati; (b) lasciare così.  
Raccomandazione: (a): un promemoria del fornitore non deve riaprire uno scarto voluto.  
Bloccati: nessuno (nuovo pacchetto dopo la scelta). Origine: A4 Da decidere 1.

**U11. Stessa fattura su due pratiche (D-54 multi-ordine): serve la conferma esplicita `multi_ordine`?**  
Opzioni: (a) sì: senza conferma 409; (b) resta l'avviso «doppio».  
Raccomandazione: (a): oggi lo stesso documento in due file diversi raddoppia fatturato e provvigioni.  
Bloccati: attesa-05 (A4-08) — P2. Origine: A4 Da decidere 2.

**U12. D-92: più clienti di Integra con la stessa P.IVA (sedi di una catena). Regola?**  
Opzioni: (a) decide la ragione sociale normalizzata se il candidato è uno solo, altrimenti «non riconosciuto»; (b) sempre il primo (oggi).  
Raccomandazione: (a).  
Bloccati: attesa-06 (A4-07 seconda parte) — P2. Origine: A4 Da decidere 3.

**U13. GLM-OCR locale (D-67 / CLAUDE.md): il connettore non esiste, ma in Impostazioni si può sceglierlo e i documenti restano in coda per sempre.**  
Opzioni: (a) impedire la scelta finché non c'è e allineare CLAUDE.md a D-67 (LlamaCloud UE); (b) lasciarlo scegliere ma aprire `lettura.non_raggiungibile`.  
Raccomandazione: (a). La riga di CLAUDE.md la cambia Ugo.  
Bloccati: nessuno (nuovo pacchetto dopo la scelta). Origine: A4 Da decidere 4.

**U14. V12: totali in fondo alle tabelle e differenza riga per riga del bollettino si sommano nel browser.**  
Opzioni: (a) totali sempre dal server; (b) ammessa la somma di sola visualizzazione su righe già calcolate dal server, scritta in §16.5 con il perché.  
Raccomandazione: (a) almeno per Liquidazioni, Analisi e Bollettino (soldi): CLAUDE.md regola 0 elenca i totali fra i calcoli solo lato server.  
Bloccati: attesa-07 (A5-08 + nota A8) — P2. Origine: A5 Da decidere 2.

**U15. §7.12: la memoria della schermata si perde ricaricando ed è unica per sezione (semplificazione `ponytail:`).**  
Opzioni: (a) memoria per passo di cronologia in `sessionStorage`; (b) accettare e correggere §7.12.  
Raccomandazione: (a): un file solo (`lib/memoria.ts`) e la spec lo promette.  
Bloccati: attesa-08 (A5-09) — P2. Origine: A5 Da decidere 3, A8 registro ponytail.

**U16. D-24 e lo stile: colori sotto 4.5:1 e carattere in base64. Si cambia l'aspetto del prototipo? E quale `stile.css` è la fonte?**  
Opzioni: (a) si cambiano i token nel prototipo e si ricopia (D-24 resta, controllo `diff` nelle prove); (b) la copia dell'app diventa la fonte (cambia D-24); (c) non si toccano i colori.  
Raccomandazione: (a). I due file intanto vengono resi uguali dal pacchetto `stile-allineato` (non serve la decisione).  
Bloccati: attesa-09 (A7-09, A7-26) — P3. Origine: A7 Da decidere 1, A8 Da decidere.

**U17. D-44 e zoom al 200 %: su 1440 px lo zoom dà 720 px CSS e il blocco scatta.**  
Opzioni: (a) blocco sulla larghezza CSS (spec §16.6) con l'eccezione WCAG 1.4.10 scritta nel §19; (b) blocco su `screen.width`.  
Raccomandazione: (a). Non blocca il pacchetto `schermo-stretto`, che segue la spec.  
Bloccati: nessuno (1-06 procede con la spec). Origine: A7 Da decidere 2.

**U18. Segmenti dei filtri con `role="tab"` senza pannello: si correggono in `role="group"` + `aria-pressed`?**  
Opzioni: (a) sì, con le 10 prove e la nota di CLAUDE.md §4.4; (b) no, si lascia.  
Raccomandazione: (a) nell'ultima onda, insieme a `prove-comune` (tocca tutte le prove).  
Bloccati: attesa-10 (A7-10) — P3. Origine: A7 Da decidere 3.

**U19. La pagina d'accesso si svuota dopo 2 minuti senza tasti (WCAG 2.2.1).**  
Opzioni: (a) è voluto (sicurezza della postazione): si scrive nel §19; (b) si toglie o si allunga.  
Raccomandazione: (a), con una riga D-nn.  
Bloccati: nessuno. Origine: A7 Da decidere 4.

**U20. Barra laterale: rilegge i contatori a ogni cambio pagina (come il prototipo) o solo all'evento?**  
Opzioni: (a) a ogni pagina **e** all'evento (pacchetto `uscita-barra`); (b) solo all'evento (A7-20 parte 1).  
Raccomandazione: (a) finché i conteggi costano poco: con il pacchetto `carichi-oggi-liquidazioni` la richiesta diventa leggera.  
Bloccati: attesa-11 (A7-20 parte 1) — P2. Origine: A7 Da decidere 5.

**U21. D-94 contro D-23: l'elenco Documenti aggiorna le righe da solo; le altre tabelle aspettano *Aggiorna*. E Pratiche?**  
Opzioni: (a) eccezione solo per Documenti, Pratiche torna a D-23 (righe ferme fino ad *Aggiorna*), «si estende» tolto da D-94; (b) D-94 vale anche per Pratiche e si estende (con ore).  
Raccomandazione: (a): le righe che si spostano mentre si lavora sono il motivo di D-23.  
Bloccati: attesa-12 (A6-04, A9-08) — P2. Origine: A9 Da decidere 1, A6-04.

**U22. D-87: la coda mostra «da configurare» prima del clic o basta il blocco su *Apri la pratica*?**  
Opzioni: (a) basta il blocco (spec e guida allineate all'app); (b) `manca` nella proposta e stato in coda (V4).  
Raccomandazione: (a).  
Bloccati: attesa-13 (A9-09) — P3. Origine: A9 Da decidere 2.

**U23. D-06: formula da usare ovunque per il rettangolo nel PDF.**  
Opzioni: (a) «verificato con il cloud; da verificare con GLM-OCR locale e con gli scansionati»; (b) altra formula.  
Raccomandazione: (a).  
Bloccati: attesa-14 (A9-01, A9-02) — P3. Origine: A9 Da decidere 3.

**U24. Su quale build si collaudano le prove nel browser?**  
Opzioni: (a) anche sulla build di esercizio, con `bypass_csp` in `comune.py`; (b) solo `next dev`, scritto nel README.  
Raccomandazione: (a): si collauda ciò che va in esercizio.  
Bloccati: attesa-15 (A6-06) — P2. Origine: A6 Da decidere 1.

**U25. Chi aggiorna le prove nel browser quando cambia il seed §12?**  
Opzioni: (a) chi cambia `dati-prova.json` lancia anche `app_flusso.py` e `app_bollettini.py` (regola in CLAUDE.md §4); (b) nessuna regola.  
Raccomandazione: (a).  
Bloccati: nessuno. Origine: A6 Da decidere 2.

**U26. Ore nel piano per D-87, D-91/D-92, rettangolo PDF.js, D-93/D-94.**  
Opzioni: (a) attività con ore da approvare (quante?); (b) assorbite nel margine, con nota firmata.  
Raccomandazione: Decide Ugo (solo lui conosce le ore spese).  
Bloccati: attesa-16 (A9-05) — P3. Origine: A9-05.

**U27. File della radice non tracciati: `idee.md`, `specifica-lettura.md`, `app_llm_locale/`, `ultimo.txt`.**  
Opzioni: (a) si committano; (b) si spostano fuori dal repository; (c) si ignorano.  
Raccomandazione: Decide Ugo; il pacchetto `pulizia-radice` non li tocca.  
Bloccati: nessuno. Origine: A8-14.

Non sono decisioni (chiuse qui): **A5 Da decidere 1** (ore del blocco 744 px): il piano v2.0 del 04/11 dichiara approvate tutte le ore «da approvare», F0-A4 compresa → `1-06 schermo-stretto` procede (le etichette vecchie le sistema A9-04). **A5 Da decidere 4** (esempio di §16.4.3): conseguenza di A5-05, lo scrive la documentazione dell'onda 3. **A6 Da decidere 3** (collaudo su working tree che si muove): vedi *Avvertenze*.

## Avvertenze (da A6 e dall'orchestratore)

1. **Lavoro f7 non committato.** Durante il collaudo un altro processo OpenCode (cartella `%TEMP%\opencode\f7`) modificava 21 file di `app/` (fra cui `oggi.ts`, `solleciti.ts`, `pratiche.ts`, `eventi.ts`, `dati-prova.json`, `VistaPratiche.tsx`, `Solleciti.tsx`, `documenti/*`) e diverse `app_*.py`, e lanciava jest sullo stesso `decobrands_test`. **Le correzioni si lanciano solo dopo il commit di quel lavoro**, e prima dell'onda 0 si **ripete il collaudo A6** (`npm test` e tutte le `app_*.py`) su quel commit: alcuni rilievi (A6-03, A6-04, A6-07, i numeri di riga di tutti i report) possono essere già cambiati. Ogni prompt dice all'esecutore di rileggere il codice attuale e di non toccare un rilievo già risolto.
2. **Già cambiato dopo i report** (visto dall'orchestratore l'08/11 pomeriggio): `body.json` e `cookies.txt` non ci sono più nella radice (il pacchetto `1-19` aggiunge solo `.gitignore`); il lavoro f7 ha aggiunto `app/deploy/Caddyfile` (senza HSTS), `app/NOTA-RILASCIO.md`, `app/avvia-esercizio.bat`: il pacchetto `1-14 deploy` completa, non riscrive; A9-12 va riletto.
3. **Prove in parallelo.** Due jest sullo stesso database si rompono a vicenda (A6-05). Ogni prompt usa un database suo, `decobrands_test_<onda>_<NN>`, via `DATABASE_URL_TEST` (letta da `app/backend/test/ambiente.ts`; il controllo `/decobrands_test/` lo accetta), e una cartella documenti sua cambiando `TMP`/`TEMP` (`ambiente.ts` mette `DOCUMENTI_DIR` in `os.tmpdir()` e lo sovrascrive sempre). Il blocco di A6-05 (`1-07`) lavora per database: non ferma i giri su database diversi.
4. **Prove nel browser non in parallelo**: stessa cartella `.next` e stesse porte. I pacchetti le aggiornano e le controllano con `py_compile`; le lancia il controllo di fine onda. Le porte 8001/8002 sono di Ugo (`decobrands_db`): `app_scena.py` ha 8001 fisso (A6-10) — non lanciarla senza cambiare l'indirizzo.
5. **`next build` di A6** ha riscritto `app/frontend/.next` (build di esercizio delle 13:08); il server di sviluppo di Ugo usa `.next/dev`. Con `next start` le prove vogliono `bypass_csp` (A6-06, decisione U24).
6. **Integra** (192.168.239.49): nessun pacchetto la contatta; nessun `PONTE_URL` vero nelle prove.
7. File più contesi, già separati per onda: `documenti.ts` (0-01, 0-02, 1-02, 2-01, 3-01, attesa-05, attesa-07); `VistaDocumento.tsx` (1-02, 2-02, 3-02, attesa-05, attesa-07); `api.ts` (1-04, 2-05, 5-01); `stile.css` (1-06, 2-06, 3-05, attesa-09, attesa-10); `oggi.ts` (1-05, 3-06, 4-04, 5-02); `accesso.ts` (1-04, attesa-02); `motore.ts` (1-01, 2-08, attesa-03, attesa-04). Spec, guida e piano li tocca **solo** il pacchetto documentazione di ogni onda.
