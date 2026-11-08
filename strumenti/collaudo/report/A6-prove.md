# A6 — Prove e controllo visivo

Collaudo finale, 08/11/2026. Agente A6. Non ho toccato codice né prove: solo questo report e le schermate in
`strumenti/collaudo/schermate/`.

- **Skill caricate (strumento Skill):** `webapp-testing`, `playwright-best-practices`, `javascript-typescript-jest`.
- **Stato provato:** HEAD `89d31cd` più il lavoro **non committato** di altri, che cambiava mentre provavo
  (21 file di `app/`, tra cui `oggi.ts`, `solleciti.ts`, `pratiche.ts`, `dati-prova.json`, `VistaPratiche.tsx`,
  `Solleciti.tsx`, `documenti/*`, e diverse `app_*.py` riscritte alle 13:02–13:04). L'ultimo giro delle prove nel
  browser (13:14) usa una build del frontend fatta alle 13:08 su quel working tree. **Gli esiti vanno rifatti
  dopo il commit di quel lavoro.**
- **Come ho lanciato (isolamento):** durante il collaudo un altro processo (OpenCode, cartella
  `%TEMP%\opencode\f7`) lanciava `npx jest` sullo **stesso** `decobrands_test` e chiudeva i processi sulle porte
  8011/8012. Per avere esiti puliti:
  - `npm test` (`npx jest`) su un database di prova mio, **`decobrands_test_a6`** (via `DATABASE_URL_TEST`, che
    `test/ambiente.ts` accetta), creato e migrato per l'occasione e **tolto alla fine**;
  - app: backend `dist/src/main` su **8012** (`NODE_ENV=development`, `TENTATIVI*=1000`, `DOCUMENTI_DIR` in
    una cartella temporanea) e frontend `next build` + `next start` su **8071**, puntato al backend 8012;
  - prima di **ogni** `app_*.py`: tabelle del seed svuotate (stesse `TRUNCATE` di `test/svuota.ts`), seed §12
    ricaricato, `utenti_prova.js crea a6` e un superutente `a6-super` (serve ad `app_componenti.py`);
  - le prove nel browser girano con `bypass_csp=True` iniettato da fuori (un `sitecustomize.py` nel
    `PYTHONPATH`, i file delle prove non sono toccati): con la build di esercizio la CSP non ha `unsafe-eval` e
    ogni `wait_for_function("…")` fallisce (vedi A6-06);
  - `app_scena.py` ha l'indirizzo fisso `localhost:8001` (server di sviluppo di Ugo, database vero): l'ho
    lanciata sostituendo l'indirizzo solo in memoria.
  - Integra (192.168.239.49) mai contattata: nel `.env` non c'è `PONTE_URL`.
- **Effetto collaterale da sapere:** la mia `next build` ha riscritto `app/frontend/.next` (build di esercizio,
  `BUILD_ID` delle 13:08). Il server di sviluppo di Ugo (8001, `next dev`) usa `.next/dev` e non è toccato.
- **Non controllato:** prova del prototipo `flusso.py` (non obbligatoria); tastiera e contrasti (A7);
  prestazioni; il PDF via LibreOffice è provato solo da `analisi.spec`/`liquidazioni.spec` e da
  `app_analisi.py`/`app_liquidazioni.py` (passano).

## Esiti

### `npm test` (backend, Jest)

| Giro | Database | File | Prove | Esito |
|---|---|---|---|---|
| 1 e 2 | `decobrands_test` condiviso, con altri `jest` in parallelo | 29–31/36 OK | 466/504 | **KO falsi**: 38 KO in `oggi`, `bollettini`, `liquidazioni`, `utenti`, `sistema` (401 a metà prova, conteggi del seed diversi, `servizi_esecuzioni` sparita): un'altra prova svuotava il database (A6-05) |
| 3 | `decobrands_test_a6`, solo mio | **36/36 OK** | **505/505** | **OK, 0 KO** |

Per file (giro 3, tutti OK): accesso 26, analisi 15, avvio 5, bollettini 12, bollettino 19, carica-limite 1,
casella 8, clienti 16, coda 5, correzione 4, documenti 31, documenti-lettura 19, documenti-pratica 17, eventi 5,
fornitori 6, impostazioni 17, incassi 7, integra 20, lettore 6, lettura 11, liquidazioni 21, motore, oggi 9,
percentuali 31, posta, pratiche 15, profilo 11, proposta 38, registro-api 12, scartati, seed, sistema 22,
subagenti, utenti 18, vincoli (totale 505).

### Prove nel browser (`strumenti/prove/app_*.py`, 30 file)

Ultimo giro (13:14, build del working tree) e, dove serve, i giri prima.

| File | Esito | Controlli | Note / causa |
|---|---|---|---|
| app_accesso | **KO instabile** | 18/18 in 2 giri, si ferma in 1 | dopo *Esci*, `goto('/')` resta nell'app: corsa fra la pagina d'accesso e `POST /esci` → **bug dell'app** (A6-02) |
| app_analisi | **KO** | 35 OK, 2 KO (3 giri su 3) | «durata 6 mesi: il segmento è scelto», «ritorno: periodo, filtro e raggruppamento». **A mano funzionano entrambi** → **prova fragile** (A6-08) |
| app_bollettini | **KO** | 21 OK, 1 KO | si aspetta 10 fornitori, il seed del working tree ne ha 11 (*Nuovo Fornitore Demo SRL*) → **prova vecchia** (A6-07) |
| app_bollettino | OK | 42/42 | |
| app_caricamento | OK | 43/43 | sagome D-59: non conferma A5-05/A5-06 (la prova non le vede) |
| app_clienti | OK, **instabile** | 33/33; si è fermata 2 volte su 4 | 1 volta: 409 «Periodo sovrapposto» alla prima creazione dell'agenzia su un cliente senza agenzie; via API la stessa creazione dà 201 (A6-09) |
| app_componenti | OK | 54/54 | |
| app_documenti | OK | 32/32 | con la build delle 11:29 dava 1 KO (PDF in `<object>`, ora PDF.js): prova aggiornata nel working tree |
| app_eventi | OK | 15/15 | |
| app_f7_analisi_fornitori | OK (diagnostica) | — | stampa numeri: pagina = API (79.534,06 / 68.836,26 €) |
| app_f7_collaudo | OK | 183/183 | con la build delle 11:29: 3 KO su *Torna a…* in Liquidazioni/Analisi, spariti col working tree |
| app_f7_numeri | OK (diagnostica) | — | conteggi barra = Oggi (34/15/9/7) |
| app_f7_ritocchi | OK | 13/13 | |
| app_flusso | **KO** | 191 OK, 1 KO | «scheda A: le righe restano ferme finché non si clicca Aggiorna» (Pratiche, D-23) → **probabile bug** del working tree (A6-04); prima, con la build vecchia, si fermava sui «10 fornitori» (A6-07) |
| app_fornitori | OK | 24/24 | |
| app_guida | OK | 26/26 | |
| app_guscio | OK | 20/20 | (una volta fermata: frontend chiuso da un altro processo) |
| app_impostazioni | OK | 17/17 | |
| app_liquidazioni | OK | 73/73 | |
| app_menu_utente | OK | 19/19 | |
| app_oggi | **KO** | si ferma (3 giri su 3) | dopo *Copia il testo* nei solleciti di pagamento la barra «Ci sono aggiornamenti» non compare in 15 s (A6-03); area in modifica nel working tree |
| app_pratica | OK | 85/85 | |
| app_pratiche | OK | 19/19 | |
| app_profilo | OK | 11/11 | timeout d'inattività segnalato, non provato (serve `SESSION_TIMEOUT_MINUTI` basso) |
| app_registro | OK | 28/28 | |
| app_scartati | OK | 30/30 | |
| app_scena | OK | 37/37 | indirizzo cambiato solo in memoria (A6-10) |
| app_sistema | OK | 24/24 | |
| app_subagenti | OK, **instabile** | 30/30; 1 KO in 1 giro su 3 | «eccezione eliminata» dopo un'attesa fissa di 800 ms (A6-09) |
| app_utenti | OK | 28/28 | |

**Totale ultimo giro:** 25 file OK, 5 KO (accesso, analisi, bollettini, flusso, oggi); 1133 controlli OK, 4 KO
e 2 prove fermate. Di questi: bug dell'app probabili 3 (A6-02, A6-03, A6-04), prove vecchie o fragili 2
(A6-07, A6-08).

### Controllo visivo

Schermate in `strumenti/collaudo/schermate/` (`<pagina>-1440.png`, `<pagina>-768.png`; 768 px con altezza 1024),
guardate tutte: Oggi, Documenti, Pratiche, una Pratica (`/pratiche/1`), Bollettini, un Bollettino
(`/bollettini/5`), Liquidazioni (trimestre in corso) e `/liquidazioni/2026/3`, Analisi, Fornitori, Subagenti,
Clienti, Utenti, Sistema, Impostazioni, Registro, Scartati. Nessuna pagina ha scorrimento orizzontale né errori
JavaScript, a 1440 e a 768. Numeri controllati a vista: 3° trimestre 1.986,38 € da liquidare + 309,60 + 196,20 in
attesa = 2.492,18 € «in elenco» (torna); Analisi 12 mesi: margine 8.848,92 = 12.976,26 − 4.127,34 (torna).

Blocco sotto 744 px (D-44): **assente** (`stretto-accesso-600.png`, `-743.png`, `stretto-pratiche-600.png`): a 600 e
743 px si vedono la finestra d'accesso e la pagina Pratiche con la tabella. → A6-01.

Riassunto rilievi: **0 P0 · 1 P1 · 8 P2 · 10 P3** (A6-01…A6-19).

---

### A6-01 — Manca il blocco sotto i 744 px (D-44), e nessuna prova lo controlla
- Gravità: P1
- Dove: `app/frontend/app/layout.tsx` (layout radice), `app/frontend/app/stile/stile.css` (nessuna regola `max-width: 743px`); `strumenti/prove/app_guscio.py` (l'intestazione dice «telefono» ma non c'è nessun controllo)
- Problema: la regola V6/§16.6 non è implementata: sotto i 744 px l'app si usa come sul tablet.
- Scenario: finestra larga 600 px → `/accesso` mostra la finestra d'accesso; dopo l'accesso `/pratiche` mostra filtri e tabella tagliata a destra (`stretto-pratiche-600.png`). Atteso: pagina scura con logo e «Il Sistema Informativo Aziendale si usa da computer o tablet…», anche prima dell'accesso.
- Correzione puntuale: nel layout radice un `<div className="schermo-stretto">` (logo + testo della spec §16.6) accanto a `{children}` avvolto in `<div className="app-tutta">`; in `stile.css` del **prototipo** (poi ricopiato, D-24) `.schermo-stretto{display:none}` e `@media (max-width: 743px){ .schermo-stretto{display:flex; …} .app-tutta{display:none} }`. Controllare prima con `grep` che i nomi delle classi non esistano.
- Prova che la verifica: aggiungere a `strumenti/prove/app_guscio.py` tre pagine a 743 px (`/accesso`, `/pratiche` dopo l'accesso) con `'computer o tablet' in body` e `.barra` non visibile, e una a 744 px con l'app visibile; rilancia anche `app_f7_collaudo.py` (768 px deve restare uguale).
- Esecutore: DeepSeek V4 Flash — CSS e un elemento nel layout, logica nessuna.
- File toccati: `app/frontend/app/layout.tsx`, `prototipo-alternativo/assets/stile.css`, `app/frontend/app/stile/stile.css` (copia), `prototipo-alternativo/index.html` (stesso blocco), `strumenti/prove/app_guscio.py`
- Dipende da / correlato a: **A5-03** (stesso rilievo, da lettura), D-44, spec V6 e §16.6

### A6-02 — *Esci*: la pagina d'accesso compare prima che la sessione sia chiusa
- Gravità: P2
- Dove: `app/frontend/app/accesso/esci/page.tsx:9-14`, `app/frontend/lib/api.ts:33-36` (`allAccesso`), `app/frontend/componenti/Barra.tsx:183`
- Problema: dopo il clic su *Esci* il browser arriva su `/accesso?dopo=%2F` (non su `/accesso`), segno che un'altra richiesta della pagina vecchia ha fatto partire `allAccesso()` con un ricaricamento completo, in corsa con `POST /api/accesso/esci`; se si naviga subito, la richiesta di uscita non è ancora arrivata.
- Scenario: utente `a6-oper` entra → *Esci* dal menu → appena il percorso è `/accesso` si apre `/` → resta nell'app e `GET /api/accesso/io` risponde **200** (riprodotto con uno script; aggiungendo una sola richiesta prima del `goto` la sessione risulta chiusa, 401). Su un computer condiviso: *Esci* e chiusura immediata della scheda possono lasciare la sessione aperta (30 giorni con *Resta collegato*). `app_accesso.py` si ferma su questo punto in 1 giro su 3.
- Correzione puntuale: *Esci* nella barra come pulsante (non `Link`) che fa `await api('accesso/esci', {})` e solo dopo `window.location.replace('/accesso')`; in `lib/api.ts` una variabile di modulo `uscendo = true` impostata prima della chiamata, e `allAccesso()` non fa niente se `uscendo`. La pagina `/accesso/esci` resta per il link della password provvisoria.
- Prova che la verifica: `strumenti/prove/app_accesso.py` (riga 58) lanciata 5 volte di fila senza fermarsi; aggiungere subito dopo `esci(pg)` il controllo `fetch('/api/accesso/io')` = 401 **senza attese**.
- Esecutore: DeepSeek V4 — sessione e navigazione, più file del frontend.
- File toccati: `app/frontend/componenti/Barra.tsx`, `app/frontend/lib/api.ts`, `app/frontend/app/accesso/esci/page.tsx`, `strumenti/prove/app_accesso.py`
- Dipende da / correlato a: A1-08 (SSE aperta dopo l'uscita), D-39, D-89

### A6-03 — Oggi: dopo *Copia il testo* dei solleciti di pagamento non compare «Ci sono aggiornamenti»
- Gravità: P2
- Dove: `app/backend/src/incassi.ts:94-112` (evento `tipo: 'documento', azione: 'export'`), `app/backend/src/eventi.ts:11-39` (`areeDi`), `app/frontend/app/(app)/oggi/VistaOggi.tsx:49-50,136`; area modificata e non committata (`oggi.ts`, `solleciti.ts`, `Solleciti.tsx`, `app_oggi.py`)
- Problema: la prova D-23 di Oggi aspetta la barra degli aggiornamenti dopo la copia del sollecito, e la barra non arriva.
- Scenario: seed §12, `a6-ammi` su `/` → gruppo *Pagamenti da sollecitare* → *Prepara i solleciti* → *Copia il testo* → *Chiudi* → in 15 s `.aggiornamenti` non compare (3 giri su 3, `app_oggi.py:118`). `app_eventi.py` (fattura registrata da un'altra scheda) invece passa: il canale SSE funziona, il problema è l'evento del sollecito o il filtro di Oggi.
- Correzione puntuale: verificare il `codice` scritto da `logEvent` per il sollecito (atteso `documento.export`, area `documenti`) e che Oggi conti anche l'area `documenti` (e la nuova `solleciti` del working tree, se c'è) in `useEventi`; se il codice è un `export.*`, aggiungere in `PREFISSI` di `eventi.ts` `['export.', 'documenti']` o l'area giusta, con la riga nella prova `eventi.spec.ts`.
- Prova che la verifica: `strumenti/prove/app_oggi.py` (0 KO) e `npx jest test/eventi.spec.ts test/incassi.spec.ts`.
- Esecutore: DeepSeek V4 — backend + frontend, regola D-23.
- File toccati: `app/backend/src/eventi.ts`, `app/backend/src/incassi.ts` (se cambia il codice), `app/frontend/app/(app)/oggi/VistaOggi.tsx`, `app/backend/test/eventi.spec.ts`
- Dipende da / correlato a: A3-06, A5-13, D-23. **Rilanciare dopo il commit del lavoro in corso su Oggi.**

### A6-04 — Pratiche: le righe non restano ferme fino ad *Aggiorna* (D-23)
- Gravità: P2
- Dove: `app/frontend/app/(app)/pratiche/VistaPratiche.tsx` (modificato, non committato; spec 8.61 D-94 in corso)
- Problema: con un evento da un'altra scheda la tabella delle Pratiche cambia da sola, invece di aspettare *Aggiorna*.
- Scenario: scheda A su `/pratiche` filtrata «Attesa fattura»; scheda B registra la fattura `EV-…` sulla prima pratica → in A compare «Ci sono aggiornamenti» e il numero del segmento cambia (giusto), ma le righe non sono più quelle di prima (`app_flusso.py:469`, «le righe restano ferme finché non si clicca Aggiorna» KO). Con la build delle 11:29 (HEAD) `app_eventi.py` e questo punto passavano.
- Correzione puntuale: in `VistaPratiche.tsx` le righe si ricaricano solo in `applica()` (clic su *Aggiorna*); all'arrivo dell'evento si aggiornano soltanto i conteggi dei segmenti (`conta`) e si mostra la barra. Controllare che il nuovo pattern D-94 non abbia messo il ricaricamento delle righe nell'effetto che ascolta `useEventi()`.
- Prova che la verifica: `strumenti/prove/app_flusso.py` (sezione aggiornamenti fra due schede) e `app_eventi.py`.
- Esecutore: DeepSeek V4 Flash — un file, effetto React.
- File toccati: `app/frontend/app/(app)/pratiche/VistaPratiche.tsx`
- Dipende da / correlato a: D-23, D-94 (lavoro in corso), A5-13

### A6-05 — Le prove Jest non reggono due giri insieme sullo stesso database
- Gravità: P2
- Dove: `app/backend/test/ambiente.ts`, `app/backend/test/svuota.ts`, `app/backend/package.json` (`jest`)
- Problema: ogni file svuota e ricarica `decobrands_test`; due `npm test` contemporanei (due agenti, o Ugo e un agente) si cancellano i dati a vicenda.
- Scenario: durante questo collaudo un altro `npx jest` girava su `decobrands_test` → 38 KO falsi in 5 file (401 a metà prova perché gli utenti sparivano, `servizi_esecuzioni.update` su una riga cancellata in `integra.ts:353`, conteggi del seed 22 invece di 26). Sullo stesso codice, su un database solo mio: 505/505.
- Correzione puntuale: in `package.json` `"globalSetup": "<rootDir>/test/blocco.ts"` e `"globalTeardown"`: `blocco.ts` apre un `pg.Client` su `DATABASE_URL` di prova e fa `SELECT pg_try_advisory_lock(424242)`; se `false` esce con «Un'altra prova sta usando decobrands_test: aspetta o usa DATABASE_URL_TEST». Nel README una riga su `DATABASE_URL_TEST` per i giri in parallelo.
- Prova che la verifica: due `npx jest test/seed.spec.ts` lanciati insieme: il secondo si ferma subito con il messaggio.
- Esecutore: DeepSeek V4 Flash — infrastruttura delle prove, nessuna logica dell'app.
- File toccati: `app/backend/package.json`, `app/backend/test/blocco.ts` (nuovo), `app/README.md`
- Dipende da / correlato a: CLAUDE.md §4 (prove con 0 KO), piano collaudo §0

### A6-06 — Le prove nel browser non girano sulla build di esercizio (CSP)
- Gravità: P2
- Dove: `app/frontend/next.config.ts:12-15` (CSP senza `unsafe-eval` in esercizio); tutte le `strumenti/prove/app_*.py` che usano `wait_for_function("…")`
- Problema: con `next build` + `next start` (come facevano le slice F1–F3) ogni `wait_for_function` con stringa viene bloccato dalla CSP: «EvalError: Evaluating a string as JavaScript violates … 'unsafe-eval'».
- Scenario: primo giro su `next start`: 8 file su 8 fermati in 1–4 s (es. `app_analisi.py` alla riga 76). Con `bypass_csp=True` passano. Si può collaudare solo con `next dev`, cioè non sulla build che va in produzione.
- Correzione puntuale: un modulo comune `strumenti/prove/comune.py` con `def nuova_pagina(b, **k): k.setdefault('bypass_csp', True); return b.new_page(**k)` e lo stesso per `new_context`; sostituire `b.new_page(` con `nuova_pagina(b, ` in tutte le `app_*.py`. In alternativa minima: una riga in `app/README.md` «le prove nel browser vanno lanciate con `next dev`».
- Prova che la verifica: tutte le `app_*.py` contro `next start` senza `sitecustomize`.
- Esecutore: DeepSeek V4 Flash — sostituzione meccanica nelle prove.
- File toccati: `strumenti/prove/comune.py` (nuovo), `strumenti/prove/app_*.py`, `app/README.md`
- Dipende da / correlato a: A6-10

### A6-07 — Prove vecchie dopo il cambio del seed (11 fornitori)
- Gravità: P3
- Dove: `strumenti/prove/app_bollettini.py:62-64,74,140`, `strumenti/prove/app_flusso.py:283-290`; seed `app/backend/prisma/seed/dati-prova.json` (working tree: aggiunto *Nuovo Fornitore Demo SRL*, D-87)
- Problema: le prove contano 10 fornitori nella matrice dei Bollettini; il seed nuovo ne ha 11.
- Scenario: `app_bollettini.py` → KO «sola lettura: matrice senza pulsanti di modifica» (`righe_m == 10`); `app_flusso.py` si fermava su `length === 10` dopo *Togli tutti i filtri*. Lo spec Jest `bollettini.spec.ts` è già stato aggiornato nel working tree, le prove nel browser no (in parte sì, alle 13:02).
- Correzione puntuale: in entrambe le prove leggere il numero atteso da `/api/bollettini` (`len(righe)`) invece del 10 fisso, o portarlo a 11 insieme al commit del seed.
- Prova che la verifica: `app_bollettini.py` e `app_flusso.py` con 0 KO su seed pulito.
- Esecutore: DeepSeek V4 Flash — prove, costanti.
- File toccati: `strumenti/prove/app_bollettini.py`, `strumenti/prove/app_flusso.py`
- Dipende da / correlato a: D-87, seed §12

### A6-08 — `app_analisi.py`: due KO che a mano non si riproducono
- Gravità: P3
- Dove: `strumenti/prove/app_analisi.py:82-83` e `162-171`
- Problema: «durata 6 mesi: il segmento è scelto» e «ritorno: periodo, filtro e raggruppamento» falliscono in 3 giri su 3, ma con uno script che fa gli stessi passi (6 mesi → `apr 2026 → set 2026`, segmento scelto; Per fornitore + Gasper → Pratiche → Analisi: periodo, filtro e scheda uguali) funziona.
- Scenario: la prova controlla `aria-selected` subito dopo `quieta(pg)`, prima che la risposta del server ridisegni i segmenti; al ritorno legge i campi mentre le sagome sono ancora su.
- Correzione puntuale: prima di ogni `ok` su un segmento `pg.wait_for_function("t => [...document.querySelectorAll('.barra-analisi .segmenti [role=tab]')].some(e => e.textContent.includes(t) && e.getAttribute('aria-selected') === 'true')", arg='6 mesi')`; al ritorno aspettare `document.querySelectorAll('.sagoma').length === 0` prima di `periodo(pg)`.
- Prova che la verifica: `app_analisi.py` 3 volte di fila con 0 KO.
- Esecutore: DeepSeek V4 Flash — attese nella prova.
- File toccati: `strumenti/prove/app_analisi.py`
- Dipende da / correlato a: A5-09/A5-11 (se dopo la correzione resta KO, è il ritorno §7.12 vero)

### A6-09 — Prove instabili: Clienti (409 alla prima agenzia) e Subagenti (attesa fissa)
- Gravità: P3
- Dove: `strumenti/prove/app_clienti.py:85-100,155-157`; `strumenti/prove/app_subagenti.py:83-86`
- Problema: `app_clienti.py` si è fermata 2 volte su 4: una volta con «creazione agenzia non riuscita: Periodo sovrapposto per questo cliente/fornitore» su un cliente del segmento *Senza agenzie*; `app_subagenti.py` ha dato «eccezione eliminata» KO 1 volta su 3 (attesa fissa di 800 ms).
- Scenario: seed pulito, cliente 9 senza agenzie, nuova agenzia Gries 2031-01-01 → 2031-06-30: via API (`POST /api/clienti/9/agenzie`) risponde 201; nel browser una volta 409. Possibile doppio invio del modulo (il primo crea, il secondo urta il vincolo `EXCLUDE`) oppure clic su un altro cliente: non isolato.
- Correzione puntuale: in `app_clienti.py` registrare le richieste `POST …/agenzie` (`pg.on('request')`) e fallire con il loro numero se sono più di una (se sono due è un bug del modulo: pulsante `submit` disattivato durante l'invio in `Modale`); in `app_subagenti.py` sostituire `wait_for_timeout(800)` con `pg.wait_for_function("() => ![...document.querySelectorAll('.elenco li')].some(l => l.textContent.includes('Gasper'))")`.
- Prova che la verifica: le due prove 5 volte di fila senza fermarsi.
- Esecutore: DeepSeek V4 Flash — prove (V4 se si scopre il doppio invio).
- File toccati: `strumenti/prove/app_clienti.py`, `strumenti/prove/app_subagenti.py`
- Dipende da / correlato a: A3-01 (vincolo agenzie)

### A6-10 — Prove nel browser: indirizzi diversi, esito solo alla fine, uscita 0 con KO
- Gravità: P3
- Dove: `strumenti/prove/app_*.py` (righe `BASE = …`), `app_scena.py:9`
- Problema: indirizzo predefinito diverso fra le prove (8001, 8011, 8031), `app_scena.py` fisso su 8001 (il server di sviluppo con il database vero); molte prove stampano OK/KO solo alla fine, quindi un'eccezione a metà perde tutti i controlli già fatti; alcune escono con codice 0 anche con KO (`app_analisi.py`: 35 OK, 2 KO, uscita 0).
- Scenario: un ciclo che lancia tutte le prove e guarda solo il codice d'uscita considera `app_analisi.py` passata; `app_scena.py` lanciata durante il collaudo avrebbe girato contro `decobrands_db`.
- Correzione puntuale: nel `comune.py` di A6-06: `BASE = os.environ.get('BASE', 'http://localhost:8001')` usato da tutte, `ok()` che stampa subito (`print(..., flush=True)`) e `atexit` che fa `sys.exit(1)` se c'è almeno un KO.
- Prova che la verifica: una prova con un KO voluto esce con 1 e mostra gli OK precedenti.
- Esecutore: DeepSeek V4 Flash — meccanico.
- File toccati: `strumenti/prove/comune.py`, `strumenti/prove/app_*.py`
- Dipende da / correlato a: A6-06

### A6-11 — Prova da aggiungere: chiusure e abbinamenti in parallelo (V13)
- Gravità: P2
- Dove: `app/backend/src/liquidazioni.ts:141-149` (chiudi, `FOR UPDATE` sui fornitori), `app/backend/src/bollettino.ts:90-91,270` (stato), `app/backend/src/documenti.ts:1122,1155` (abbina), `:930` (sposta); prove in `test/liquidazioni.spec.ts`, `test/bollettino.spec.ts`, `test/documenti-pratica.spec.ts`
- Problema: i blocchi `SELECT … FOR UPDATE` ci sono ma nessuna prova lancia due richieste insieme (l'unica prova di concorrenza è `integra.spec.ts:261`).
- Scenario da provare: `Promise.allSettled([chiudi(2026,3), chiudi(2026,3)])` → una 201 e una 409, **una** riga in `liquidazioni` e documenti legati una volta; due `PUT /bollettini/:id/stato` «verificato» insieme → una 200 e una 409, righe congelate una volta; lo stesso documento abbinato a due pratiche diverse insieme → uno solo riesce.
- Correzione puntuale: tre `it(...)` con `Promise.allSettled` su due agenti supertest della stessa sessione, controllando stati HTTP e conteggi in tabella.
- Prova che la verifica: i tre `it` nuovi, poi `npm test` completo.
- Esecutore: DeepSeek V4 Flash — prove su logica già scritta.
- File toccati: `app/backend/test/liquidazioni.spec.ts`, `app/backend/test/bollettino.spec.ts`, `app/backend/test/documenti-pratica.spec.ts`
- Dipende da / correlato a: V13, D-36, A4-08, A3-08

### A6-12 — Prova da aggiungere: agenzie nel periodo chiuso
- Gravità: P2
- Dove: `app/backend/src/clienti.ts:179,226,328`; prova `test/clienti.spec.ts` (solo sovrapposizioni e codice doppio)
- Problema: nessuna prova che modificare o eliminare un'agenzia con documenti in un trimestre liquidato o in un bollettino verificato sia rifiutato.
- Scenario da provare: agenzia di Bastasin su Gries con fatture nel 2° trimestre 2026 liquidato → `PUT /api/clienti/:id/agenzie/:aid` con `pct_subagente` diverso e `DELETE` → atteso 409; la liquidazione del 2° trimestre e il report restano uguali.
- Correzione puntuale: due `it` in `clienti.spec.ts` (rossi finché non si corregge A2-01/A3-01).
- Prova che la verifica: `npx jest test/clienti.spec.ts`.
- Esecutore: DeepSeek V4 Flash — prova (la correzione è di A2-01/A3-01).
- File toccati: `app/backend/test/clienti.spec.ts`
- Dipende da / correlato a: A2-01, A3-01, D-51

### A6-13 — Prova da aggiungere: nota di credito sul maturato e storno senza documento
- Gravità: P2
- Dove: `app/backend/src/motore/motore.ts` (riconoscimento maturato, storni); prove `test/motore.spec.ts`, `test/liquidazioni.spec.ts`
- Problema: il maturato è provato solo per fatture (`motore.spec.ts:201`); la nota di credito di un fornitore sul maturato e lo storno su riga di bollettino senza `documento_id` non hanno prove.
- Scenario da provare: Gries (maturato), nota di credito −500 € su una fattura riconosciuta → la quota del subagente scende nel trimestre del bollettino che la riconosce (non resta «in attesa d'incasso»); riga di storno con solo il numero `F-2026-0858` mentre esiste lo stesso numero nel 2025 → lega il documento del 2026.
- Correzione puntuale: due `it` in `motore.spec.ts` sui dati del seed con un documento aggiunto nella prova.
- Prova che la verifica: `npx jest test/motore.spec.ts test/liquidazioni.spec.ts`.
- Esecutore: DeepSeek V4 Flash — prove (le correzioni sono di A2).
- File toccati: `app/backend/test/motore.spec.ts`
- Dipende da / correlato a: A2-05, A2-06, D-11, §5.14

### A6-14 — Utenti a 1440 px: colonna «Ultimo accesso» tagliata
- Gravità: P3
- Dove: `app/frontend/app/(app)/utenti/` (tabella dell'elenco a due colonne)
- Problema: a 1440 px con la scheda dell'utente aperta l'intestazione «Ultimo accesso» e le pillole «Mai entrato» sono tagliate a destra (`utenti-1440.png`); a 768 px si vedono intere.
- Scenario: `/utenti` a 1440×900 → «Ultimo accesso» diventa «Ultimo accesso» troncato, «Mai entrato» senza la «o» finale, date a filo del bordo.
- Correzione puntuale: larghezza minima alla colonna (`larghezza: '9rem'` nella definizione della colonna) o testo del ruolo che va a capo (colonna «Ruolo e aree» più stretta).
- Prova che la verifica: schermata `utenti-1440.png` rifatta con `app_utenti.py`.
- Esecutore: DeepSeek V4 Flash — stile.
- File toccati: `app/frontend/app/(app)/utenti/VistaUtenti.tsx`
- Dipende da / correlato a: —

### A6-15 — Scartati a 768 px: *Recupera* ed *Elimina* fuori dalla tabella
- Gravità: P3
- Dove: `app/frontend/app/(app)/scartati/` (colonna delle azioni)
- Problema: a 768 px la colonna delle azioni è tagliata: di *Recupera* si vede solo la «R», *Elimina* non si vede, e la pagina non mostra uno scorrimento.
- Scenario: `/scartati` a 768×1024 (`scartati-768.png`) → per recuperare un documento bisogna sapere che la tabella scorre di lato (se scorre).
- Correzione puntuale: a ≤ 860 px togliere la colonna «Eliminato il» (o metterla sotto «Scartato il») e dare alla colonna azioni `white-space: nowrap` e larghezza fissa.
- Prova che la verifica: `app_scartati.py` con un controllo `bounding_box` di *Recupera* dentro `.dt` a 768 px.
- Esecutore: DeepSeek V4 Flash — stile.
- File toccati: `app/frontend/app/(app)/scartati/VistaScartati.tsx`, `strumenti/prove/app_scartati.py`
- Dipende da / correlato a: D-44 (tablet)

### A6-16 — Documenti: testi con «di non riconosciuto»
- Gravità: P3
- Dove: `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx` (testo della proposta e riga *Oppure abbina*)
- Problema: con fornitore non riconosciuto il nome del fornitore è sostituito da «non riconosciuto» dentro frasi fatte per un nome.
- Scenario: ordine `ordine_OF-2026-064.pdf` del seed (`documenti-1440.png`) → «Il codice — non corrisponde a nessun cliente di non riconosciuto» e «Oppure abbina a un'altra pratica di non riconosciuto:».
- Correzione puntuale: se manca il fornitore: «Fornitore e codice cliente non letti: correggi i dati letti oppure scegli cliente e fornitore qui sotto.» e «Oppure abbina a un'altra pratica:».
- Prova che la verifica: `app_documenti.py`, controllo che `'di non riconosciuto' not in body`.
- Esecutore: DeepSeek V4 Flash — testi.
- File toccati: `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`, `app/frontend/lib/guida.ts` se cita la frase
- Dipende da / correlato a: A5-04

### A6-17 — Stato del sistema: «Funziona» su servizi non configurati, testata e barra
- Gravità: P3
- Dove: `app/frontend/app/(app)/sistema/VistaSistema.tsx` (riquadri e testata), `app/frontend/componenti/Barra.tsx` (etichetta del gruppo)
- Problema: i quattro riquadri dicono «Funziona» in verde e sotto «Non configurata: si imposta nelle Impostazioni» e «2 problemi da vedere»; a 1440 px *Guida* va su una seconda riga sotto *Controlla adesso* / *Segna tutti come visti*; nella barra laterale il gruppo si legge «Portale4» (contatore attaccato all'etichetta).
- Scenario: seed §12, `/sistema` a 1440 (`sistema-1440.png` prima build) e 768 (`sistema-768.png`).
- Correzione puntuale: stato «Da configurare» (grigio) quando la connessione non è impostata, «Attenzione» se ci sono problemi da vedere; `flex-wrap: nowrap` sulle azioni della testata; spazio (`margin-left: .4rem`) fra etichetta del gruppo e contatore.
- Prova che la verifica: `app_sistema.py` con il testo del riquadro «Da configurare» a servizi spenti.
- Esecutore: DeepSeek V4 Flash — testi e stile (lo stato viene già dal server: se lo calcola il server, V4).
- File toccati: `app/frontend/app/(app)/sistema/VistaSistema.tsx`, `app/frontend/componenti/Barra.tsx`, `strumenti/prove/app_sistema.py`
- Dipende da / correlato a: §7.14

### A6-18 — Documenti: «Affidabile» su un documento con fornitore non riconosciuto
- Gravità: P3
- Dove: elenco di `app/frontend/app/(app)/documenti/VistaDocumenti.tsx`; dato dal seed o da `valutaLettura` (`app/backend/src/proposta.ts`)
- Problema: il primo documento in coda ha «fornitore non riconosciuto», codice cliente assente, data e importo vuoti, ma la pillola dice **Affidabile**.
- Scenario: seed §12, `/documenti` (`documenti-1440.png`, primo elemento). `proposta.spec.ts` dice che un controllo grave porta la lettura a «bassa»: se il valore arriva dal seed, il seed contraddice la regola e il cliente lo vede nella demo.
- Correzione puntuale: verificare da dove arriva `affidabilita` per quel documento; se è il seed, metterlo «da controllare»; se è il calcolo, applicare `valutaLettura` anche alla lettura salvata.
- Prova che la verifica: `npx jest test/proposta.spec.ts test/seed.spec.ts`; `app_documenti.py`.
- Esecutore: DeepSeek V4 Flash — dato del seed (V4 se è il calcolo).
- File toccati: `app/backend/prisma/seed/dati-prova.json` oppure `app/backend/src/proposta.ts`
- Dipende da / correlato a: A4 (lettura), D-06

### A6-19 — *Torna a…* che punta alla pagina stessa
- Gravità: P3
- Dove: anagrafiche a due colonne (`fornitori`, `clienti`, `subagenti`), `app/frontend/componenti/Pagina.tsx` (*Torna a…*)
- Problema: aprendo `/fornitori` (o `/clienti`, `/subagenti`) da un'altra pagina, la testata mostra «Torna ai Fornitori» mentre si è già sui Fornitori, con la prima riga scelta.
- Scenario: `/analisi` → `/fornitori` a 1440 px (`fornitori-1440.png`): pulsante «Torna ai Fornitori». Atteso «Torna a Analisi» (la pagina di prima) o niente.
- Correzione puntuale: se la riga scelta è quella aperta di default (non da un clic), *Torna a…* usa la pagina di prima registrata da `CRM.registra`, non l'elenco.
- Prova che la verifica: `app_f7_collaudo.py` con le tre anagrafiche aggiunte alla tabella `atteso` delle righe 103-106.
- Esecutore: DeepSeek V4 Flash — una condizione nel componente.
- File toccati: `app/frontend/componenti/Pagina.tsx`, `strumenti/prove/app_f7_collaudo.py`
- Dipende da / correlato a: §7.12, A5-09

---

## Da decidere (Ugo)

- **Su quale build si collaudano le prove nel browser** (A6-06): oggi funzionano solo con `next dev`. Se le
  prove devono valere per la build che va in esercizio, servono `bypass_csp` nelle prove; altrimenti basta
  scriverlo nel README.
- **Chi aggiorna le prove quando cambia il seed** (A6-07): il seed §12 è cambiato (D-87, 11 fornitori) e lo
  spec Jest è stato aggiornato, due prove nel browser no. Proposta: chi cambia `dati-prova.json` lancia anche
  `app_flusso.py` e `app_bollettini.py`.
- **Collaudo su un working tree che si muove:** durante questo collaudo un altro agente modificava `app/` e le
  prove e lanciava `jest` sullo stesso database e processi sulle porte 8011/8012. Per l'onda di correzioni:
  porte e database di prova per agente (`DATABASE_URL_TEST`, A6-05) e niente lavoro parallelo sui file in prova.
