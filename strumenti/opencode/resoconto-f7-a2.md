# Resoconto F7-A2 — Collaudo finale e rilascio

- **Data:** 8 novembre 2026
- **Specifica:** `specifica-crm-provvigioni.md` **v8.62** (D-95…D-98)
- **Base:** commit `89d31cd` + le modifiche di questo lavoro
- **Database:** prove backend su `decobrands_test`; prove browser su `decobrands_db` riportato
  al seed **prima di ogni script** (`TRUNCATE` + `prisma db seed`), così i numeri sono del §12

## 1. Modifiche fatte (dai rilievi del collaudo F7-A1)

| # | Cosa | Decisione | File |
|---|---|---|---|
| 1 | In Oggi il gruppo *Documenti da decidere* è acceso, con le voci e il conteggio nel "da fare" | D-95 | `src/oggi.ts`, `test/oggi.spec.ts` |
| 2 | Nella matrice Bollettini la cella *Non arrivato* porta *Sollecita*; testo dal server e evento alla copia | D-96 | `src/solleciti.ts`, `componenti/Solleciti.tsx`, `VistaBollettini.tsx`, `test/oggi.spec.ts` |
| 3 | `/api/pratiche/cerca` senza fornitore risponde `[]` (non 400) | D-97 | `src/pratiche.ts`, `VistaDocumento.tsx`, `VistaPratica.tsx`, `test/pratiche.spec.ts` |
| 4 | Seed allineato a `dati.js` (11 fornitori, 17 documenti, 15 in coda) e pulizia delle prove | D-98 | `prisma/seed/dati-prova.json`, `test/seed.spec.ts`, `test/bollettini.spec.ts`, `strumenti/prove/utenti_prova.js` |
| 5 | Pratiche: il numero è un collegamento | — | `VistaPratiche.tsx` |
| 6 | Liquidazioni: *Esporta in Excel*, colonna *Stato* con `grow`, nota come il prototipo | — | `VistaLiquidazioni.tsx` |
| 7 | Chiave unica delle voci *Da fare* (avviso React «same key» con due voci uguali) | — | `componenti/Flussi.tsx` |
| 8 | *Sollecita* nascosto in sola lettura (scrive nel registro) | — | `VistaBollettini.tsx` |
| 9 | Avvio in esercizio senza Docker: Caddyfile, `avvia-esercizio.bat`, README, nota di rilascio | F7-A2 | `app/deploy/Caddyfile`, `app/avvia-esercizio.bat`, `app/README.md`, `app/NOTA-RILASCIO.md` |
| 10 | Il flusso degli aggiornamenti riparte se il registro torna indietro (ripristino di un backup) | D-99 | `src/eventi.ts`, `test/eventi.spec.ts` |

## 2. Prove backend

`npm test` in `app/backend`, in quattro gruppi (la suite intera su questa macchina a volte si
blocca):

| Gruppo | Suite | Test | KO |
|---|---|---|---|
| accesso…documenti-pratica | 12 | 147 | 0 |
| documenti…percentuali | 12 | 180 | 0 |
| pratiche…scartati | 6 | 85 | 0 |
| seed…vincoli | 6 | 93 | 0 |
| **Totale** | **36** | **505** | **0** |

Comando: `npx jest test/<file>.spec.ts …` (stessi test di `npm test`).

## 3. Prove nel browser (Playwright, `next dev`)

Uno script per volta, seed pulito prima di ognuno, frontend `http://localhost:8001`, base
`http://localhost:8001`, utenti di prova creati con `utenti_prova.js crea <suffisso>`.

| Script | Controlli | KO | Nota |
|---|---|---|---|
| `app_oggi.py` | 41 | 0 | gruppo Documenti acceso (D-95) |
| `app_documenti.py` | 32 | 0 | correzione con il canvas di PDF.js |
| `app_pratiche.py` | 19 | 0 | numero come collegamento; attesa sul piede |
| `app_pratica.py` | 85 | 0 | |
| `app_caricamento.py` | 43 | 0 | sagome e soglia 150 ms |
| `app_bollettini.py` | 22 | 0 | 11 fornitori in matrice; *Sollecita* solo chi può |
| `app_bollettino.py` | 42 | 0 | |
| `app_liquidazioni.py` | 73 | 0 | |
| `app_analisi.py` | 37 | 0 | |
| `app_fornitori.py` | 25 | 0 | |
| `app_subagenti.py` | 30 | 0 | |
| `app_clienti.py` | 33 | 0 | |
| `app_registro.py` | 28 | 0 | |
| `app_eventi.py` | 15 | 0 | barra *Ci sono aggiornamenti* via SSE |
| `app_sistema.py` | 24 | 0 | |
| `app_scartati.py` | 30 | 0 | |
| `app_impostazioni.py` | 17 | 0 | |
| `app_utenti.py` | 28 | 0 | |
| `app_profilo.py` | 11 | 0 | |
| `app_guida.py` | 26 | 0 | testo di *Sollecita* aggiornato |
| `app_guscio.py` | tutti OK | 0 | barra per ruolo, sola lettura, 768 px |
| `app_menu_utente.py` | 19 | 0 | |
| `app_componenti.py` | 54 | 0 | serve `<s>-super` (creato a mano, `deve_cambiare_password = false`) |
| `app_flusso.py` | 192 | 0 | giro completo |
| `app_f7_collaudo.py` | 183 | 0 | 1440 e 768 px su tutte le pagine, menu, *Torna a…*, pillola |
| `app_f7_ritocchi.py` | 13 | 0 | numeri del menu, *Torna a…*, conferma per campo, *Consulta affiancati* |
| **Totale** | **1.142** | **0** | |

Non eseguiti: `app_accesso.py` (serve il file di log del backend per il link di *password
dimenticata*); `app_scena.py` (solo schermate, nessun controllo).

## 4. Numeri del seed §12

`app_f7_numeri.py` sul seed pulito (API della sessione del browser):

- Oggi: riquadri e gruppi dal server, gruppo *Documenti da decidere* con 15 voci; "da fare" 26.
- Pratiche: 54 (52 del prototipo + 2 dei casi §12), conteggi dei segmenti coerenti.
- Bollettini: 11 fornitori × 6 mesi, *Tutti* 11, *Con qualcosa da fare* 4.
- Liquidazione T2 chiusa 931,80 €; T3 da liquidare 1.986,38 € (1.886,73 € del prototipo + 99,65 €
  delle due pratiche §12).
- Analisi ott 2025 → set 2026: fatturato 79.534,06 €, prese 12.976,26 €, pagate 4.127,34 €,
  margine 8.848,92 €.
- Registro: 13 eventi (4 anomalie aperte, 5 errori).

I valori coincidono con `strumenti/prove/report-f7a1.md`, tranne i due numeri che il seed
allineato corregge: **fornitori 10 → 11** e **documenti in arrivo 11 → 15** (erano già in
`assets/dati.js`, ora anche nel seed).

## 5. Responsive

A 1440 e 768 px, su tutte le pagine: nessuno scorrimento orizzontale, le due colonne si impilano,
matrice dei bollettini che scorre di lato, testata con titolo/Guida/*Torna a…* anche a 768 px
(`app_f7_collaudo.py`, `app_*_768`). Sotto i 744 px l'app si ferma come da D-44.

## 6. Build di produzione

- `npm run build` in `frontend/` (`next build`, Next 16.2.9) e in `backend/` (`nest build`): **riusciti**.
- Avvio senza Docker: backend `npm run start:prod` su 127.0.0.1:8002, frontend `npm start` su
  127.0.0.1:8001, Caddy davanti (`deploy/Caddyfile`).
- Verifica fatta su questa macchina: il backend di produzione risponde a `GET /api/salute`; le pagine
  servite dalla build di produzione hanno la CSP **senza** `'unsafe-eval'` e si aprono a 1440 e 768 px
  (Oggi, Pratiche, Bollettini, Liquidazioni, Analisi) senza errori di console.
- In esercizio il cookie di sessione è `Secure` (`NODE_ENV=production`): senza HTTPS non si entra, e
  infatti in locale il login è stato provato con un **proxy HTTPS di prova** davanti alla 8001 (non fa
  parte dell'app); con Caddy sul server il certificato lo prende lui. Con la sola `http` la pagina di
  accesso si apre ma la sessione non parte: è il comportamento voluto.
- Le prove Playwright complete girano solo in sviluppo (usano `wait_for_function`/`evaluate`, che la
  CSP di esercizio vieta): non sono state ripetute contro la build, si è fatto il controllo a schermo.

## 7. Cosa resta

- **F6-A5** (connettore GLM-OCR locale e taratura) quando arriva la macchina del cliente;
  `lettura.lenta` come anomalia.
- Rettangolo del valore sul PDF da verificare con il connettore locale (D-06).
- **Pubblicazione sul server**: la fa Ugo (sparse checkout di `app/`, `.env` di esercizio, backup di
  database e `DOCUMENTI_DIR`); questa attività consegna build, Caddyfile, script di avvio e nota di
  rilascio.
