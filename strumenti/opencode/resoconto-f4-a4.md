# Resoconto F4-A4 — Report subagenti nelle Liquidazioni

Data: 04/11/2026. Slice F4, attività F4-A4 (§7.8, D-18). Lavoro sull'app vera (`app/`).

## File toccati

| File | Cosa |
|---|---|
| `app/backend/src/liquidazioni.ts` | nuova rotta `GET /api/liquidazione/report` e `reportSubagenti`: elenco o un subagente, numeri da `analisiTrimestre` (trimestre e precedente), quota/delta, trimestri dell'anno, primi 5 clienti |
| `app/backend/src/app.module.ts` | registrazione del controller `LiquidazioneReportController` (una riga) |
| `app/backend/test/liquidazioni.spec.ts` | nuovo `describe` con 4 prove: elenco come il prototipo, un subagente (numeri, delta, trimestri, primi clienti), zeri e futuro, 400/404/403/lettura |
| `app/frontend/app/(app)/liquidazioni/VistaLiquidazioni.tsx` | seconda scheda *Report subagenti*: grafico, tabella o 3 numeri + trimestri + clienti, note con il link ad Analisi, sagome, ricarica al cambio di trimestre/subagente |
| `strumenti/prove/app_liquidazioni.py` | estesa: scheda report in elenco e per un subagente, link ad Analisi, sagome della scheda, 768 px (54 controlli) |
| `specifica-crm-provvigioni.md` | versione 8.30; §7.8 (la scheda nell'app), §8.1 (nuova rotta) |
| `piano-lavoro-crm.md` | F4-A4 segnata fatta |
| `prototipo-crm/specifica.html` | rigenerato con `python strumenti/genera-pagine-doc.py` |

Niente commit, niente push, nessuna modifica a `.env` o `avanzamento-app.md`.

## API

`GET /api/liquidazione/report?anno=&trimestre=&subagente=` — `provvigioni.consulta`; senza parametri
il trimestre di oggi; 400 fuori range, 404 se il subagente non esiste.

- **Senza `subagente`**: `{anno, trimestre, precedente: {anno, trimestre}, subagenti: [{id, nome,
  clienti, documenti, fatturato, prese, pagate, margine, quota, delta}]}`, ordinati per provvigione
  decrescente. `quota` = provvigione su prese in %, `delta` = variazione % sul trimestre prima
  (`null` se il precedente è zero).
- **Con `subagente`**: `{anno, trimestre, precedente, subagente: {id, nome}, numeri: {fatturato,
  prese, pagate, margine, clienti, documenti, delta: {fatturato, pagate, margine}, pct:
  {margine_su_prese}}, trimestri: [{trimestre, pagate, margine, attivo}], primi_clienti: [{nome,
  fatturato, provvigione}]}`. `trimestri` = 1..4 dell'anno già iniziati, `attivo` sul trimestre
  scelto; `primi_clienti` = primi 5 per fatturato dalle righe del trimestre. Zeri se il subagente
  non ha documenti.
- Il trimestre prima del 1° è il 4° dell'anno avanti; `analisiTrimestre` è chiamata una volta per
  trimestre (memoizzata) con un solo `caricaDati`. Tutte le percentuali e le variazioni le calcola
  il server (V12): il browser formatta soltanto.

`pct.margine_su_prese` è l'unico campo in più rispetto allo schema del brief: serve al dettaglio
«65,22% delle provvigioni» del terzo riquadro, che nel prototipo era calcolato nel browser e qui
deve stare sul server.

## Numeri sul seed (3° trimestre 2026)

Elenco (prima di verificare il bollettino di luglio di Gries):

| Subagente | Clienti · doc. | Fatturato | Provvigione | Margine | Quota | Sul 2° trim. |
|---|---|---|---|---|---|---|
| Marco Nista | 1 · 2 | 12.000,00 € | 960,00 € | 1.800,00 € | 34,78% | — |
| Elisa Ravelli | 2 · 2 | 24.792,50 € | 868,35 € | 1.891,50 € | 31,46% | +134% |
| Stefano Bastasin | 3 · 5 | 8.679,40 € | 385,23 € | 1.328,72 € | 22,48% | −44% |
| Giorgio Pontoglio | 1 · 1 | 3.980,00 € | 278,60 € | 557,20 € | 33,33% | — |
| **Totale** | | **49.451,90 €** | **2.492,18 €** | **5.577,42 €** | | |

Marco Nista: fatturato 12.000,00 €, provvigione 960,00 €, margine 1.800,00 €, nessun importo sul 2°
trimestre, 65,22% delle provvigioni, primo cliente *Il Giardino di Sofia srl* (12.000,00 €, 960,00 €).
La prova Jest confronta elenco, quota e delta, i numeri del subagente, i trimestri dell'anno e i
primi clienti con `M.analisiTrimestre` / `M.righeLiquidazione` del prototipo, su tutti e 4 i subagenti.

## Prove

- `npx tsc --noEmit` backend e frontend: **puliti**; `npm run build` frontend ok.
- `npx jest test/liquidazioni.spec.ts --runInBand`: **15/15** (11 di F4-A1 + 4 nuove).
- Tutta la suite backend, una spec per processo: accesso 24, analisi 13, avvio 4, bollettini 12,
  bollettino 19, clienti 16, documenti 16, documenti-pratica 15, fornitori 6, incassi 7, integra 20,
  liquidazioni 15, motore 16, percentuali 31, pratiche 13, registro 3, seed 7, subagenti 12,
  superutente 1, utenti 18, vincoli 33. **0 KO**.
- `python strumenti/prove/app_liquidazioni.py f4 <cartella> http://localhost:8101`: **54 controlli,
  0 KO**, nessun errore JavaScript. Nuovi controlli: seconda scheda, grafico e tabella dell'elenco,
  totale 2.492,18 €, colonna *Sul 2° trim.*, link ad Analisi, 3 numeri del subagente, dettagli del
  confronto, margine sulle provvigioni, trimestri e primi clienti, link ad Analisi con subagente,
  sagome della scheda, 768 px.
- Schermate guardate: `app-liquidazioni-report-1440.png` (subagente), `app-liquidazioni-report-elenco-1440.png`
  (elenco, scattata a parte dopo la chiusura), `app-liquidazioni-768.png` (scheda report). A 768 le
  card vanno 2+1, i grafici si impilano, nessuno scorrimento di lato.
- La prova browser è girata su `decobrands_test` (backend 8102, frontend 8101), da seed pulito;
  chiude il 3° trimestre e verifica il bollettino di luglio di Gries, quindi va rilanciata da un
  seed nuovo.

## Controlli

- **`ponytail-review`**: nessun difetto da correggere. Rilievi: la scheda si carica anche se non è
  aperta (una richiesta in più, semplice e prevedibile); `analisiTrimestre` è chiamata fino a 5 volte
  con `caricaDati` una sola volta (memoizzata); il link ad Analisi ora funziona davvero (provato nel
  browser). Niente codice morto.
- **`owasp-security`**: nessun rilievo. Rotta con `provvigioni.consulta` (verificata anche dalla
  prova con l'utente senza area), parametri validati (2000–2100, 1–4, `subagente` intero), 404 senza
  esporre altro, nessun SQL nuovo, React fa l'escape dei nomi.
- `postgresql-code-review` non serve: nessuna query o migrazione nuova.

## Cose lasciate aperte

- **Esportazione** (Excel, PDF, CSV, D-04/D-06) → F4-A3.
- **Correzione della quota del subagente (D-27)** → F1-A6, come già segnato nel piano.
- Il report di un trimestre **già chiuso** usa `analisiTrimestre` (come chiesto dal brief), non la
  fotografia: i documenti pagati non si possono più modificare, quindi i numeri restano quelli.
- La scheda non ha un contatore: nel prototipo non c'è.
