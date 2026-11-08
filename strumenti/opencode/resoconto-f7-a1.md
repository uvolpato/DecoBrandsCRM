# Resoconto F7-A1 — Collaudo CRM Decobrands

- **Data:** 8 novembre 2026
- **Specifica:** `specifica-crm-provvigioni.md` **v8.61**
- **Prototipo di riferimento:** `prototipo-alternativo/` (D-24), dati simulati al 04/09/2026
- **Ambiente:** backend `http://127.0.0.1:8002`, frontend `next dev` `http://localhost:8001`, PostgreSQL `decobrands_db` (sviluppo) e `decobrands_test` (prove backend)
- **Utenti:** `node strumenti/prove/utenti_prova.js crea <suffisso>` (password `password-di-prova`); prove backend su `decobrands_test`, prove browser sul database di sviluppo

> ⚠ **Ambiente condiviso con un'altra sessione.** Durante il collaudo un altro agente stava modificando `app/frontend` e `app/backend` (working tree sporco: `documenti/[[...id]]`, `VistaDocumento`, `VistaPratica`, ecc.) e ha eseguito una seconda suite Jest sullo stesso `decobrands_test`. Il backend in `npm run start:dev` è morto una volta alle 11:29 (errore `Cannot find module './app.module'` durante la ricompilazione) ed è stato riavviato da quella sessione. Alcune prove browser sono partite con il backend giù (401/`fetch` falliti): sono state ripetute. I risultati Jest «G3» sono contaminati (vedi §2). Il numero di accessi per persona (D-41, `TENTATIVI=10` in 15 minuti) ha bloccato a metà la batteria E2E: le prove rimanenti sono state ripetute con un suffisso utente nuovo per script.

---

## 1. Backend — `npm test` in `app/backend`

Comando: `cd app/backend; npx jest --runTestsByPath test/<file>.spec.ts …` (gruppi di 4–5 file, `maxWorkers: 1`). La suite intera è stata interrotta perché un secondo Jest della sessione parallela usava lo stesso `decobrands_test`.

| Gruppo | File | Suite | Test | KO | Esito |
|---|---|---|---|---|---|
| G1 | accesso, analisi, avvio, bollettini, bollettino | 5 | 77 | **1** | ❌ `bollettini.spec` — fornitore 11 assente |
| G2 | carica-limite, casella, clienti, coda, correzione | 5 | 34 | 0 | ✅ |
| G3 | documenti-lettura, documenti-pratica, documenti, eventi, fornitori | — | — | — | 💥 il processo Node è terminato con `0xC0000409` senza output |
| G3b (ripetizione) | gli stessi 5 file | 5 | 78 | **37** | ❌ inconcludente: `Prisma P2025` alla creazione degli utenti (`aree: { create: … }`), mentre gli stessi utenti si creano senza errori negli altri gruppi → interferenza del secondo Jest/DB condiviso |
| G4 | impostazioni, incassi, integra, lettore, lettura | 5 | 61 | 0 | ✅ |
| G5 | liquidazioni, motore, oggi, percentuali, pratiche | 5 | 91 | **1** | ❌ `oggi.spec` — «26 vs 22» cose da fare |
| G6 | profilo, proposta, registro-api, registro, scartati | 5 | 70 | 0 | ✅ |
| G7 | seed, sistema, subagenti, superutente, utenti | 5 | 60 | 0 | ✅ |
| G8 | vincoli | 1 | 33 | 0 | ✅ |

**Totale attendibile (escluso G3/G3b):** 35 suite, **426 test, 2 KO**. I due KO hanno la stessa causa: **il seed §12 non è allineato a `prototipo-alternativo/assets/dati.js`** (vedi difetto D1).

---

## 2. Browser — script `strumenti/prove/app_*.py`

Comando base: `python strumenti/prove/app_x.py <suffisso> C:\Users\uvolp\AppData\Local\Temp\opencode\f7 http://localhost:8001` (le prove con stampa Unicode richiedono `PYTHONIOENCODING=utf-8`). Ogni script nuovo ha usato un suffisso utente dedicato per non incappare nel limite D-41.

| Script | Controlli | KO | Note |
|---|---|---|---|
| `app_scena.py` | 37 | 0 | ✅ |
| `app_guscio.py` | 20 OK | 0 | ✅ (uscita 0; non stampa la riga totale) |
| `app_accesso.py` | — | — | ⛔ **non eseguito**: richiede il file di log del backend per estrarre il link di reimposta password; il backend attuale è avviato da un'altra sessione e il suo log non è accessibile |
| `app_oggi.py` | 42 | 0 | ✅ |
| `app_pratiche.py` | 19 | 0 | ✅ |
| `app_pratica.py` (g15) | 85 | 0 | ✅ (la prima esecuzione, interrotta a metà da me, lasciava 3 KO su documenti `PROVA-*`: poi ripuliti) |
| `app_fornitori.py` | 25 | 0 | ✅ |
| `app_subagenti.py` (g1) | 30 | 0 | ✅ |
| `app_registro.py` (g3) | 28 | 0 | ✅ |
| `app_eventi.py` (g4) | 15 | 0 | ✅ |
| `app_sistema.py` (g5) | 24 | 0 | ✅ |
| `app_scartati.py` (g6) | 30 | 0 | ✅ |
| `app_impostazioni.py` (g7) | 17 | 0 | ✅ |
| `app_utenti.py` (g8) | 28 | 0 | ✅ |
| `app_guida.py` (g9) | 26 | 0 | ✅ con `PYTHONIOENCODING=utf-8` (altrimenti `UnicodeEncodeError` sulla `→`) |
| `app_profilo.py` (g12) | 11 | 0 | ✅ |
| `app_caricamento.py` (g13) | 43 | 0 | ✅ con `PYTHONIOENCODING=utf-8` |
| `app_f7_collaudo.py` (f7) | **183** | **3** | ❌ 2 controlli su Documenti (400 `pratiche/cerca`) + 1 aggregato: stesso difetto D4 |
| `app_f7_ritocchi.py` (g16, f7) | 13 | 0 | ✅ (dopo aver corretto due assunzioni del test, vedi §7) |
| `app_f7_numeri.py` (g18) | — | — | stampa (0 asserzioni), corretto il test |
| `app_f7_analisi_fornitori.py` (g17) | — | — | stampa (0 asserzioni); KPI pagina = API = 70.953,56 € sul DB di sviluppo |
| `app_documenti.py` (g14) | interrotto | **1 KO accertato** | ❌ dopo «Salva e ricalcola» l'elenco a sinistra non passa ad «Affidabile» (D5); i controlli precedenti non vengono stampati perché lo script stampa solo alla fine |
| `app_bollettini.py` | interrotto | — | ⛔ cella Ing's settembre 2026 già piena nel DB di sviluppo → il caricamento restituisce l'errore «c'è già» e il test aspetta un avviso che non arriva |
| `app_bollettino.py` | interrotto | — | ⛔ `.barra-decisione button:has-text("Vai alla prima")` sparito durante la prova (stato del bollettino cambiato sotto, sessione parallela) |
| `app_liquidazioni.py` | interrotto | — | ⛔ il 3° trimestre 2026 è già «Liquidata il 07/11/2026» nel DB di sviluppo → mancano righe «Liquidabile» con «Correggi» |
| `app_analisi.py` | interrotto | — | ⛔ attende i numeri del seed (68.836,26 €) ma il DB di sviluppo vale 70.953,56 € |
| `app_clienti.py` | interrotto | — | ⛔ nessun cliente «Senza agenzie» nel DB di sviluppo (dati Integra) |
| `app_componenti.py` | — | — | ⛔ richiede un **superutente** `<s>-super`, non creato da `utenti_prova.js` |
| `app_menu_utente.py` | interrotto | — | ⚠ timeout su `.menu-utente-voce.attiva` dopo il passaggio all'area Dati; **non riprodotto** in una prova manuale (menu e spunta corretti) → instabilità del test, non difetto accertato |

**Controlli browser eseguiti con esito stampato:** **676** (di cui 4 KO: 3 del collaudo f7 sullo stesso difetto e 1 di `app_documenti`).

> `app_flusso.py` del prototipo non è stato eseguito (non richiesto: il riferimento è l'app vera).

---

## 3. Checklist §16.1 — una riga per schermata

Legenda: **S** struttura/navigazione, **L** layout, **C** componenti/stile, **T** testi, **I** interazioni, **D** dati; ✅ superato, ⚠ con riserva, ❌ difetto (codice Dn del §5).

| Schermata | S | L | C | T | I | D | Note |
|---|---|---|---|---|---|---|---|
| Oggi | ⚠ | ✅ | ✅ | ❌ | ⚠ | ❌ | manca il gruppo *Documenti da decidere* e il riquadro non è cliccabile (D2); restano 4 riquadri, gruppi, scadenze, trimestre, errori di oggi |
| Documenti | ✅ | ✅ | ✅ | ⚠ | ⚠ | ⚠ | elenco + dettaglio a due colonne, schede, correzione, scarta; 400 su `pratiche/cerca` (D4); dopo il salvataggio l'elenco non ricalcola il livello (D5) |
| Pratiche | ✅ | ✅ | ⚠ | ✅ | ✅ | ⚠ | numero pratica in grassetto invece che link blu del prototipo (D7, cosmetico); filtri, segmenti, pagine e totali corretti |
| Dettaglio pratica | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | pillola a 10 px, *Torna alle Pratiche*, binario, *Righe a confronto*, *Consulta affiancati*, incasso; 85/85 controlli |
| Bollettini | ✅ | ✅ | ✅ | ✅ | ❌ | ⚠ | matrice 6 mesi, periodo, filtro, conteggi; **manca «Sollecita»** nelle celle «Non arrivato» (D3); 10 fornitori invece di 11 (D1) |
| Dettaglio bollettino | ✅ | ✅ | ✅ | ✅ | ⚠ | ⚠ | cerniera, gruppi, decisioni, contestazione, PDF; la prova si è interrotta per mutazione concorrente dello stato |
| Liquidazioni | ✅ | ⚠ | ⚠ | ⚠ | ✅ | ⚠ | pulsante «Esporta» invece di «Esporta in Excel» (D6, cosmetico); nota «1 con documenti · 3 senza» in più (D6); pillola Stato tagliata perché la colonna non ha `grow` (D8); T3 chiuso nel DB di sviluppo |
| Analisi | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠ | grafici, filtri multipli, tabella, export; i numeri del DB di sviluppo differiscono dal seed (D1) |
| Fornitori | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 25/25 controlli |
| Subagenti | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 30/30 controlli |
| Clienti | ✅ | ✅ | ✅ | ✅ | ⚠ | ⚠ | la prova si ferma sui clienti «Senza agenzie» (dati Integra del DB di sviluppo) |
| Registro | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 28/28 controlli |
| Stato del sistema | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 24/24 controlli |
| Scartati | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 30/30 controlli |
| Impostazioni | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 17/17 controlli |
| Utenti | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 28/28 controlli |
| Guida | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 26/26 controlli; **niente link Guida a sé stessa**, come il prototipo |
| Componenti | — | — | — | — | — | — | ⛔ non eseguibile senza superutente `<s>-super` |

**Ritocchi recenti verificati:**
- numeri del menu da `GET /api/oggi/conteggi` (Oggi, Documenti giallo, Pratiche giallo, Bollettini): **OK** (collaudo, 5 controlli + 2 contatori urgenti);
- *Torna a …* a destra accanto a Guida, voce giusta, in tutte le pagine, attivo in sola lettura: **OK** (Documenti→Oggi, Pratiche→Documenti, Bollettini→Pratiche, Liquidazioni→Bollettini, Analisi→Liquidazioni; dettaglio pratica; sola lettura); nessun pulsante *Torna alle pratiche/Torna ai bollettini* scritto a mano (grep: solo i link della pagina d'accesso);
- conferma per campo: campo verde, riepilogo aggiornato, **il server segna verificati solo i campi confermati/cambiati** (`['righe[0].quantita']`): **OK**;
- *Consulta affiancati* e clic su un documento/riga: finestra a tutto schermo, schede, anteprima costruita dai dati, *Confrontato con*, *Differenza*, segmenti, tabella, frecce ← →, Esc: **OK** (13/13);
- pillola dello stato a 10 px dal titolo: **OK** (`margin-left: 10px`).

---

## 4. Numeri del seed §12

Il prototipo «ufficiale» ha due letture: `prototipo-alternativo/assets/dati.js` (52 pratiche, 15 documenti in arrivo, 11 fornitori) e il caricatore delle prove `app/backend/test/prototipo.ts`, che vi aggiunge le 2 pratiche di `dati-prova.json` (D-87/S12). Il seed `dati-prova.json` ha **10 fornitori e 11 documenti in arrivo**: è la divergenza D1.

| Voce | Prototipo al 04/09/2026 (atteso) | App — DB di sviluppo all'08/11/2026 | Giudizio |
|---|---|---|---|
| Oggi, cose da fare | **26** (conferme 5, documenti 15, bollettini 4, pagamenti 2) | 48 (conferme 9, documenti 29, bollettini 7, pagamenti 3) | non confrontabile (data e dati demo) |
| Pratiche | 54 (scaduta 5, confermata 8, fatturata 37, attesa 4) | 55 (scaduta 9, confermata 8, fatturata 38, attesa 0) | 1 pratica in più nel DB di sviluppo |
| Bollettini | 11 fornitori, 4 da fare | 10 fornitori, 3 da fare | **D1**: manca *Nuovo Fornitore Demo SRL* |
| Liquidazione T2 | 931,80 € (chiusa) | 931,80 € (chiusa) | ✅ |
| Liquidazione T3 | aperta al 04/09 | chiusa il 07/11/2026, 2.492,18 € | stato del DB di sviluppo, non del seed |
| Liquidazione T4 | non iniziata | in corso, −147,00 € | coerente con l'08/11 |
| Analisi 12 mesi (ott 2025 – set 2026) | 79.534,06 / 12.976,26 / 4.127,34 / 8.848,92 (19 doc, 7 clienti) — `prototipo.ts`; 78.288,46 nel browser perché senza le 2 pratiche extra | 81.651,36 / 13.569,10 / 4.339,07 / 9.230,03 (20 doc, 8 clienti) | non confrontabile (dati demo); `analisi.spec` **passa** sul seed |
| Registro | eventi e anomalie del seed | 819 righe, 21 aperte, 215 errori | cresciuto per gli accessi e i 400/401 delle prove |

Conclusione: **sul database di sviluppo i numeri del §12 non sono verificabili** (ci sono i PDF demo, il T3 chiuso, i bollettini verificati e 196 utenti di prova). La verifica oggettiva è quella dei test backend su `decobrands_test`: passano tutti tranne i due che dipendono dal seed (D1).

---

## 5. KO e divergenze

| # | Difetto | File / pagina | Passi | Gravità | Criterio §16.1 | Slice |
|---|---|---|---|---|---|---|
| **D1** | **Seed §12 non allineato al prototipo**: `dati-prova.json` ha 10 fornitori e 11 documenti in arrivo; `dati.js` ne ha 11 e 15 (manca *Nuovo Fornitore Demo SRL* e i 4 ordini `OF/2026/061…064`) | `app/backend/prisma/seed/dati-prova.json` | `npx jest test/oggi.spec.ts test/bollettini.spec.ts` | **bloccante** | 6 (dati) | F0 `crm-base` |
| **D2** | **Oggi: gruppo *Documenti da decidere* sempre spento** (`disponibile:false`, `conta:0`, testo «L'ingresso dei documenti arriva con la lettura automatica») e riquadro *Documenti in coda* non cliccabile, benché F6 sia fatta e `/documenti` abbia 29 documenti in coda | `app/backend/src/oggi.ts` (righe 178-181, 207-209) | aprire `/`; confrontare con il prototipo (15 documenti, «Abbina») | **bloccante** | 1, 4, 5, 6 | F5 `crm-gestione` (+ aggancio F6) |
| **D3** | **Bollettini: manca l'azione «Sollecita»** nelle celle «Non arrivato» (il prototipo la mostra e apre il testo di sollecito; il backend ha già `GET/POST /api/solleciti/bollettini`, la pagina non lo usa) | `app/frontend/app/(app)/bollettini/VistaBollettini.tsx` (riga 113) | aprire `/bollettini`, guardare una cella «Non arrivato» | da correggere | 5 | F3 `crm-periodo` |
| **D4** | **400 a ogni apertura di Documenti**: `GET /api/pratiche/cerca?fornitore_id=` con id vuoto quando il documento non ha fornitore | `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx` (riga 48) e `app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx` (riga 82) | aprire `/documenti`; console: `400 Bad Request` | da correggere | 5 (e stabilità) | F6 `crm-documenti` / F2 `crm-pratiche` |
| **D5** | **Documenti: dopo «Salva e ricalcola» l'elenco a sinistra non aggiorna il livello** ad «Affidabile» (resta il livello vecchio) | `app/frontend/app/(app)/documenti/VistaDocumenti.tsx` / `[[...id]]` | correggere e salvare un documento; guardare la voce nell'elenco | da correggere | 5 | F6 `crm-documenti` |
| **D6** | **Liquidazioni: testi diversi dal prototipo**: «Esporta» invece di «Esporta in Excel»; nota «1 con documenti · 3 senza» invece di «4 con documenti» | `app/frontend/app/(app)/liquidazioni/VistaLiquidazioni.tsx` | aprire `/liquidazioni` | cosmetico | 4 | F4 `crm-liquidazione` |
| **D7** | **Pratiche: il numero pratica è in grassetto, non un link** come nel prototipo | `app/frontend/app/(app)/pratiche/VistaPratiche.tsx` (riga 126) | aprire `/pratiche` | cosmetico | 3 | F2 `crm-pratiche` |
| **D8** | **Liquidazioni: la pillola dello stato esce dalla colonna e viene tagliata** a 1440 px nel trimestre con uno storno; nel prototipo la colonna *Stato* ha `grow` e il testo va a capo | `app/frontend/app/(app)/liquidazioni/VistaLiquidazioni.tsx` (colonna `stato`, righe 249-252) | aprire `/liquidazioni/2026/4` a 1440 px | da correggere | 2, 3 | F4 `crm-liquidazione` |
| **D9** | **`utenti_prova.js togli` non funziona**: la cancellazione viola `bollettini_testata_chiuso_da_fkey` (un utente di prova ha chiuso un bollettino) → restano **196 utenti `@prova-e2e.it`** | `strumenti/prove/utenti_prova.js` | `node ../../strumenti/prove/utenti_prova.js togli` | da correggere (igiene delle prove) | — | F7 `crm-collaudo` |
| **D10** | **Limite D-41 e prove E2E**: con `TENTATIVI=10` per persona in 15 minuti, una batteria di ~25 script che riusa gli stessi utenti si blocca a metà con 429 «Troppi tentativi». Le prove hanno dovuto usare un suffisso utente per script | `.env` di sviluppo / script E2E | eseguire in fila `app_*.py` con lo stesso suffisso | da correggere (prove) | — | F7 + ambiente |
| **D11** | **Script di prova non robusti su Windows**: `app_guida.py` e `app_caricamento.py` vanno in `UnicodeEncodeError` sulla `→` se non si imposta `PYTHONIOENCODING=utf-8`; `app_f7_numeri.py` usava `righe`/`totale`/`stato` sbagliati; `app_f7_ritocchi.py` chiedeva `per_pagina` (non più accettato dal DTO pratiche) e premeva → sull'ultima scheda | `strumenti/prove/app_*.py` | eseguire gli script | cosmetico (corretti i tre f7; restano guida/caricamento) | — | F7 |
| **D12** | **Console React: «Encountered two children with the same key, `2026`»** ripetuto sulle pagine Bollettini (e affini): una lista per anno usa l'anno come chiave; non l'ho localizzata con certezza (non è in `PeriodoMesi` né in `VistaBollettini`), da individuare con la console aperta | frontend, pagina Bollettini | aprire `/bollettini` con la console | cosmetico (può duplicare/perdere figli) | 3 | da individuare |

> Gli script `app_f7_collaudo.py`, `app_f7_ritocchi.py`, `app_f7_numeri.py` sono stati adattati (miei, in `strumenti/prove/**`). **Nessun file dell'app, della spec o del piano è stato modificato.**

---

## 6. Cosa non è stato verificato

- **`app_accesso.py`**: richiede il file di log del backend per il link di reimposta password; il backend in esecuzione è di un'altra sessione e il log non è raggiungibile.
- **`app_componenti.py`**: richiede un superutente `<s>-super`, non creato da `utenti_prova.js`.
- **Prove bloccate dai dati del DB di sviluppo** (non dal codice): `app_bollettini`, `app_bollettino`, `app_liquidazioni`, `app_analisi`, `app_clienti`. Servono su un database riportato al seed (o su un database E2E dedicato).
- **G3 Jest** (`documenti*`, `eventi`, `fornitori`): la prima esecuzione è terminata con un crash del processo Node; la ripetizione ha fallito 37 test per `Prisma P2025` alla creazione degli utenti, con una seconda suite Jest attiva sullo stesso `decobrands_test`. Non è un KO attribuibile all'app, ma va ripetuto su una macchina quieta.
- **Numeri del §12 nel browser**: non confrontabili sul database di sviluppo (dati demo e stato mutato). La verifica oggettiva è nei test backend.
- **Responsive 390 px**: non applicabile per D-44 (sotto i 744 px l'app si ferma). Verificati 1440×900 e 768×900/1024.

---

## 7. Adattamenti alle prove (solo `strumenti/prove/**`)

- `app_f7_collaudo.py`: errori JS azzerati dopo l'accesso (i 401 di `/api/accesso/io` prima del login sono normali); attesa dei dati prima delle schermate (sagome a 0, `networkidle` breve); attesa della pillola del dettaglio pratica; la Guida non pretende il link a sé stessa (il prototipo fa lo stesso); aggiunti 15 controlli su *Torna a …* aperto dal menu; controllo errori per singola pagina.
- `app_f7_ritocchi.py`: id delle pratiche su due pagine da 25 (il DTO pratiche non accetta più `per_pagina`); freccia ← perché la scheda scelta è l'ultima (il prototipo non gira in tondo).
- `app_f7_numeri.py`: chiavi corrette (`fornitori`, `chiave`, `provvigione`).
- Esecuzione con `PYTHONIOENCODING=utf-8` per gli script che stampano `→`.

---

## 8. Riassunto

- **Totale prove eseguite:** **676 controlli browser** con esito stampato + **426 test backend** attendibili (35 suite), oltre alle prove di stampa (`app_f7_numeri`, `app_f7_analisi_fornitori`) e alle schermate di controllo 1440/768 di 19 pagine (`app_f7_collaudo`, 38 PNG).
- **KO bloccanti: 2** — **D1** seed §12 non allineato al prototipo (2 test backend rossi: `oggi.spec`, `bollettini.spec`) e **D2** gruppo *Documenti da decidere* spento in Oggi.
- **Altri KO:** 3 (D3 Sollecita, D4 400 Documenti, D5 elenco Documenti non aggiornato) + 1 cosmetico/strutturale (D8 pillola Liquidazioni) + 2 cosmetici (D6, D7) + 1 warning console (D12, chiave duplicata) + igiene delle prove (D9, D10).
- **Segnalazioni non attribuibili all'app:** prove bloccate dal DB di sviluppo non seed, crash Jest G3, sessione parallela che ha modificato il codice e spento il backend durante il collaudo.
- **File del report:** `strumenti/opencode/resoconto-f7-a1.md`.
- **Schermate:** `C:\Users\uvolp\AppData\Local\Temp\opencode\f7\` (`collaudo-*.png`, `proto\proto-*.png`, `app-f7-affiancati-1440.png`).
