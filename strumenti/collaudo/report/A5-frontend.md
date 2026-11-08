# A5 — Frontend (`app/frontend`)

Collaudo finale, 08/11/2026. Agente A5, sola lettura.

- **Skill caricate (strumento Skill):** `nextjs-app-router-patterns`, `vercel-react-best-practices`,
  `vercel-composition-patterns`, `ui-ux-pro-max`.
- **Prove lanciate:** `npx tsc --noEmit` in `app/frontend` → **OK** (0 errori). Lint: **non disponibile**
  (nessun ESLint fra le dipendenze: i commenti `eslint-disable` nel codice non hanno effetto, vedi A5-17).
  App e prove Playwright non avviate (compito di A6).
- **Non controllato:** comportamento reale nel browser (tutto da lettura del codice: gli scenari "flash"
  vanno confermati da A6 con una schermata a 100 ms), contrasto e tastiera (A7), chiavi React mancanti
  in tutti i `.map` (controllo a campione), backend (citato solo dove il frontend dipende da lui).
- Stato considerato: lavoro in corso non committato in `documenti/` (rotta `[[...id]]`, elenco nel layout).

Riassunto: **0 P0 · 4 P1 · 11 P2 · 6 P3**.

---

### A5-01 — "Vedi le righe" in Documenti non cambia scheda (Schede ignora `attiva` dopo il primo disegno)
- Gravità: P1
- Dove: `app/frontend/componenti/Schede.tsx:21`; chiamante `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx:341,464`
- Problema: `attiva` è usato solo come valore iniziale di `useMemoria`; quando il genitore lo cambia la scheda resta quella di prima.
- Scenario: documento con righe incerte → nell'avviso "N righe lette con valori incerti" clic su **Vedi le righe** → `setScheda('righe')` nel genitore, ma la scheda *Righe lette* non si apre. In `VistaPratica.tsx:270` lo stesso problema è aggirato con un clic simulato nel DOM (`document.querySelector(...).click()`).
- Correzione puntuale: in `Schede.tsx` aggiungere `useEffect(() => { if (iniziale && schede.some((s) => s.id === iniziale)) setAttiva(iniziale); }, [iniziale])` (scheda controllata quando il genitore la cambia); poi in `VistaPratica.tsx:270` sostituire il clic DOM con uno stato `scheda` passato in `attiva`.
- Prova che la verifica: aggiungere in `strumenti/prove/app_documenti.py` il clic su "Vedi le righe" e il controllo `aria-selected=true` su `.schede-barra [role=tab]:has-text("Righe lette")`; rilanciare `app_pratica.py` (riga 108).
- Esecutore: DeepSeek V4 Flash — componente unico, modifica locale.
- File toccati: `componenti/Schede.tsx`, `app/(app)/pratiche/[id]/VistaPratica.tsx`, `strumenti/prove/app_documenti.py`
- Dipende da / correlato a: §16.4 (Schede), §7.12

### A5-02 — Confronto delle righe calcolato nel browser, diverso da quello del server (V12, D-60)
- Gravità: P1
- Dove: `app/frontend/componenti/ConsultaDocumenti.tsx:45-62` (funzione `confronto`), `:98` (`diff`), `:212` (`somma`)
- Problema: la finestra dei documenti della pratica ricalcola nel browser righe variate e differenze in euro; il server (`backend/src/motore/motore.ts:64-90`, `perCodice`) prima **somma le righe con lo stesso codice** (D-60), il browser no (prende la prima con `find`).
- Scenario: ordine con l'articolo X su due righe (10 pz a 5 € = 50 €, 5 pz a 5 € = 25 €), fattura con X su una riga (15 pz = 75 €). Server: nessuna variazione. Finestra: X "variata", delta **+25,00 €**, e l'importo totale "diverso" — numeri sbagliati davanti all'utente, in contrasto con la scheda *Righe a confronto* della stessa pratica.
- Correzione puntuale: il backend restituisce in `GET /pratiche/:id/documenti` (o nuovo `GET /pratiche/:id/documenti/:doc/confronto?rif=`) le righe già confrontate con `perCodice` e i delta (`r2`); `ConsultaDocumenti` mostra solo quelle (togliere `confronto`, `diff`, `somma` locali; l'anteprima usa il totale del documento dato dal server).
- Prova che la verifica: test backend sul confronto con codice ripetuto (`app/backend/test/`), e in `strumenti/prove/app_pratica.py` apertura della finestra su una pratica di prova con codice ripetuto: nessuna riga variata.
- Esecutore: DeepSeek V4 — backend + frontend, numeri.
- File toccati: `app/backend/src/pratiche.ts` (o controller documenti della pratica), `app/frontend/componenti/ConsultaDocumenti.tsx`, test backend, `strumenti/prove/app_pratica.py`
- Dipende da / correlato a: V12, D-60, A2 (calcoli)

### A5-03 — Manca il blocco sotto i 744 px (D-44)
- Gravità: P1
- Dove: `app/frontend/app/layout.tsx` e `app/frontend/app/stile/stile.css` (nessuna regola `@media (max-width: 743px)`, nessun testo "computer o tablet" in tutto il frontend)
- Problema: la regola D-44 / spec §16.6 non è implementata: sotto i 744 px l'app si apre lo stesso, con tabelle e cerniera tagliate.
- Scenario: finestra larga 600 px (o telefono) → accesso e pagine dell'app si aprono normalmente invece della pagina scura "Il Sistema Informativo Aziendale si usa da computer o tablet…".
- Correzione puntuale: in `app/layout.tsx` aggiungere dentro `<body>` un `<div className="schermo-stretto">` con logo e il testo della spec §16.6; in `stile.css` (e nel `stile.css` del prototipo, D-24) `.schermo-stretto{display:none}` e `@media (max-width:743px){ body > :not(.schermo-stretto){display:none!important} .schermo-stretto{display:flex; …stile .accesso…} }`. Solo CSS, nessun `matchMedia`.
- Prova che la verifica: nuova prova in `strumenti/prove/app_guscio.py` a 700 px (testo visibile, `.principale` assente) e a 768 px (app visibile).
- Esecutore: DeepSeek V4 Flash — layout + CSS.
- File toccati: `app/frontend/app/layout.tsx`, `app/frontend/app/stile/stile.css`, `prototipo-alternativo/assets/stile.css`, `prototipo-alternativo/index.html`, `strumenti/prove/app_guscio.py`
- Dipende da / correlato a: D-44; piano §12 riga 128 ("da approvare 0,5 h") → vedi *Da decidere*

### A5-04 — Documenti: il dettaglio non si azzera cambiando documento (collegamento al bollettino sbagliato)
- Gravità: P1
- Dove: `app/frontend/app/(app)/documenti/VistaDocumenti.tsx:167`; `app/(app)/documenti/[id]/VistaDocumento.tsx:127-152`
- Problema: con l'elenco nel layout (D-94) `VistaDocumento` non si rimonta al cambio di `id`; l'effetto di riga 137 azzera solo `d` ed `errore`: `bollettinoId`, `scheda`, `altra`, `finestra` restano quelli del documento precedente.
- Scenario: si apre il bollettino A (già registrato, `bollettinoId=12`), poi il bollettino B già registrato ma la cui cella non si trova (o la richiesta fallisce) → la nota di B dice "è già registrato: **aprilo**" con il link a `/bollettini/12`, cioè al bollettino di A. Anche il campo "abbina a un'altra pratica" conserva la pratica scelta su A.
- Correzione puntuale: in `VistaDocumenti.tsx:167` `<VistaDocumento key={selezionato} id={selezionato} … />` (l'elenco resta montato, si rimonta solo il dettaglio); poi togliere l'effetto di azzeramento a riga 137, inutile.
- Prova che la verifica: `strumenti/prove/app_documenti.py`: aprire un documento, scegliere "Righe lette", passare a un altro → la scheda è "azioni" e il campo di abbinamento è vuoto.
- Esecutore: DeepSeek V4 Flash — una riga.
- File toccati: `app/(app)/documenti/VistaDocumenti.tsx`, `app/(app)/documenti/[id]/VistaDocumento.tsx`, `strumenti/prove/app_documenti.py`
- Dipende da / correlato a: D-94, D-71

### A5-05 — Per 150 ms le tabelle mostrano «Nessun elemento» e «0 elementi» (D-59)
- Gravità: P2
- Dove: `app/frontend/componenti/DataTable.tsx:92,130`; `app/(app)/documenti/VistaDocumenti.tsx:141-178`; schema consigliato in spec §16.4.3
- Problema: `caricando={sagome}` è falso nei primi 150 ms (per scelta di `useSagome`), quindi con `righe=[]` la DataTable disegna `emptyText` e il piede "0 elementi"; in Documenti compaiono "Nessun documento da controllare." e il riquadro "Come entrano i documenti".
- Scenario: apertura di Pratiche, Registro, Sistema con risposta in 120 ms → lampo "Nessuna pratica · Prova a togliere il filtro… · 0 elementi", poi le righe. Con risposta in 400 ms: 150 ms di "Nessuna pratica" e poi le sagome.
- Correzione puntuale: in `DataTable` distinguere "in attesa" da "sagome visibili": prop `caricando` = caricamento vero (`!dati`), e dentro `const sagome = useSagome(!!caricando && righe.length === 0)`; con `caricando && righe.length===0 && !sagome` corpo e piede vuoti (nessun testo). Le pagine passano `caricando={!dati}` (o `caricando`), non più `sagome`. In `VistaDocumenti` con `!dati` niente `Nota` e niente riquadro di destra. Aggiornare l'esempio della spec §16.4.3 e del catalogo `/componenti`.
- Prova che la verifica: prova Playwright con `page.route('/api/pratiche*')` ritardata di 100 ms: nessun testo "Nessuna" a schermo prima delle righe (in `app_componenti.py` o `app_pratiche.py`).
- Esecutore: DeepSeek V4 — componente comune + tutte le pagine che lo usano.
- File toccati: `componenti/DataTable.tsx`, `app/(app)/pratiche/VistaPratiche.tsx`, `registro/VistaRegistro.tsx`, `sistema/VistaSistema.tsx`, `scartati/VistaScartati.tsx`, `analisi/VistaAnalisi.tsx`, `clienti/VistaClienti.tsx`, `utenti/VistaUtenti.tsx`, `documenti/VistaDocumenti.tsx`, `app/(app)/componenti/page.tsx`, spec §16.4.3
- Dipende da / correlato a: D-59, A5-06

### A5-06 — Sagome mostrate subito, senza la soglia dei 150 ms
- Gravità: P3
- Dove: `scartati/VistaScartati.tsx:141` (`caricando={dati ? caricando : true}`), `clienti/VistaClienti.tsx:360,373` (`caricando={!pratiche}`), `utenti/VistaUtenti.tsx:230` (`caricando={permessi === null}`), `analisi/VistaAnalisi.tsx:212` (`FilterBar caricando={!dati}`)
- Problema: passano il caricamento grezzo invece di `useSagome(...)`.
- Scenario: scheda *Pratiche* di un cliente con risposta in 40 ms → lampo delle sagome.
- Correzione puntuale: risolta da A5-05 se la soglia passa dentro `DataTable`; per `FilterBar` stessa cosa (`useSagome` interno sul prop `caricando`).
- Prova che la verifica: come A5-05.
- Esecutore: DeepSeek V4 Flash — sostituzioni locali.
- File toccati: quelli elencati, `componenti/FilterBar.tsx`
- Dipende da / correlato a: A5-05, D-59

### A5-07 — `naturale` toglie la paginazione: Analisi › Documenti disegna tutte le righe
- Gravità: P2
- Dove: `app/frontend/componenti/DataTable.tsx:62`; uso in `analisi/VistaAnalisi.tsx:268`
- Problema: nell'app `naturale` imposta `perPagina = MAX_SAFE_INTEGER`; nel prototipo (`componenti.js`, DataTable) `naturale` cambia solo l'altezza e la paginazione resta (la toglie solo `perPagina:false`). Spec §16.4: "paginazione sempre attiva".
- Scenario: Analisi, 12 mesi, *Raggruppa: Documenti* con 3.000 documenti → 3.000 `<tr>` disegnati in una volta (blocco del browser a ogni cambio filtro), invece di 25 per pagina come nel prototipo.
- Correzione puntuale: `DataTable.tsx:62` → `const perPagina = pp === false ? Number.MAX_SAFE_INTEGER : (pp ?? io.righe_pagina ?? 25);` (`naturale` solo classe CSS). Controllare le tabelle brevi `naturale` (scaglioni, permessi, ConsultaDocumenti): sotto 25 righe non cambia nulla.
- Prova che la verifica: `strumenti/prove/app_analisi.py`: con *Documenti* il piede mostra "1–25 di N" e `.dt-pagine`.
- Esecutore: DeepSeek V4 Flash — una riga.
- File toccati: `componenti/DataTable.tsx`, `strumenti/prove/app_analisi.py`
- Dipende da / correlato a: §16.4 DataTable, A7 (prestazioni)

### A5-08 — Totali delle colonne sommati nel browser (V12)
- Gravità: P2
- Dove: `app/frontend/componenti/DataTable.tsx:132-136` (`totale: 'somma'` → `reduce`); usi: `liquidazioni/VistaLiquidazioni.tsx:196,235,310-312`, `analisi/VistaAnalisi.tsx:159-162,175-178`, `documenti/[id]/VistaDocumento.tsx:419,424,728`; differenza riga per riga in `bollettini/[id]/VistaBollettino.tsx:233` (`loro − noi`)
- Problema: V12 / §16.5 elenca "totali delle tabelle" e "differenze dei bollettini" fra i calcoli solo lato server; qui si sommano/sottraggono in virgola mobile i valori arrivati.
- Scenario: Liquidazioni, piede "Totale" della colonna *Da liquidare* = somma JS di `s.provvigione`, mentre la nota del pannello mostra `riepilogo.provvigione` del server: se il server arrotonda per riga diversamente (o un subagente ha voci escluse), i due totali sulla stessa pagina possono differire di centesimi e nessuno dei due è "quello vero" per il browser.
- Correzione puntuale: aggiungere a `DataTable` il prop `totali?: Record<string, number>` (dal server) usato al posto di `reduce` quando c'è; il server restituisce `totali` per ogni tabella con piede (liquidazioni subagenti/documenti, report, analisi tabella, righe del documento) e `differenza` per ogni riga del bollettino; `totale:'somma'` resta solo come segnaposto della colonna.
- Prova che la verifica: test backend dei totali sul seed §12 = numeri del prototipo; `app_liquidazioni.py` confronta piede e nota del pannello.
- Esecutore: DeepSeek V4 — backend + frontend, soldi.
- File toccati: `componenti/DataTable.tsx`, pagine elencate, `backend/src/liquidazioni.ts`, `analisi.ts`, `bollettino.ts`, `documenti.ts`, test
- Dipende da / correlato a: V12, D-28, A2 → anche in *Da decidere*

### A5-09 — Ritorno allo stesso punto: memoria persa al ricaricamento e non per passo di cronologia (§7.12)
- Gravità: P2
- Dove: `app/frontend/lib/memoria.ts:8-12` (commento `ponytail:`), chiave a riga 13 e 25
- Problema: la memoria sta in una `Map` di modulo con chiave "primo segmento del percorso": si perde ricaricando la pagina (la spec dice che sopravvive) ed è unica per sezione, non per passo di cronologia.
- Scenario: Pratiche filtrate per Gries, pagina 3 → apro una pratica → F5 → Indietro: filtri e pagina tornano all'inizio. Oppure: pratica A sulla scheda *Incassi*, apro dalla barra Pratiche e poi la pratica A dal menu: torna su *Incassi* anche se è un passo nuovo.
- Correzione puntuale: salvare `MEM` in `sessionStorage` con chiave `history.state?.__memoria` (un id generato e scritto con `history.replaceState({...history.state, __memoria:id})` alla prima visita del passo); fallback all'attuale `Map` se `sessionStorage` lancia.
- Prova che la verifica: `strumenti/prove/app_pratiche.py`: filtro + pagina 2 → apri pratica → `page.reload()` → `go_back()` → filtro e pagina presenti.
- Esecutore: DeepSeek V4 — comportamento di tutta l'app.
- File toccati: `lib/memoria.ts`, `strumenti/prove/app_pratiche.py`
- Dipende da / correlato a: §7.12 → anche in *Da decidere* (semplificazione già dichiarata)

### A5-10 — Tabelle senza `memoria`: ordinamento e scorrimento persi tornando indietro
- Gravità: P2
- Dove: `pratiche/VistaPratiche.tsx:159` (scorrimento), `liquidazioni/VistaLiquidazioni.tsx:186,219` (ordinamento, pagina, scorrimento), `subagenti/VistaSubagenti.tsx:408`, `utenti/VistaUtenti.tsx:255`, `fornitori/VistaFornitori.tsx:387`, `documenti/[id]/VistaDocumento.tsx:464` (Schede)
- Problema: senza `memoria="…"` la DataTable non ricorda ordinamento, pagina e scorrimento (§7.12, §16.4).
- Scenario: Liquidazioni, documenti ordinati per *Provvigione*, scorro a metà → clic sul numero (link alla pratica) → **Torna alle Liquidazioni** → ordine di nuovo per *Stato* e lista in cima. Pratiche: scorro la pagina 2 fino in fondo → apro una pratica → indietro → lista in cima.
- Correzione puntuale: aggiungere `memoria="pratiche"`, `"liq-subagenti"`, `"liq-documenti"`, `"subagenti"`, `"utenti"`, `"fornitori-clienti"`; in Subagenti, Utenti, Clienti, Fornitori sostituire le variabili di modulo `let schedaX`/`let filtro` con `Schede memoria="…"` e `useMemoria('filtri', …)` (stesso meccanismo ovunque).
- Prova che la verifica: `app_liquidazioni.py` e `app_pratiche.py`: ordina/scorri → apri → indietro → stesso ordine e `scrollTop`.
- Esecutore: DeepSeek V4 Flash — attributi e sostituzioni locali.
- File toccati: i 7 file elencati, `clienti/VistaClienti.tsx`, `fornitori/VistaFornitori.tsx`, prove citate
- Dipende da / correlato a: §7.12, A5-09

### A5-11 — Scorrimento della pagina ripristinato prima che arrivino i dati
- Gravità: P2
- Dove: `app/frontend/componenti/Pagina.tsx:69` (`useScorrimento('corpo')` senza `pronto`), `lib/memoria.ts:20-27`
- Problema: il corpo si riporta alla posizione salvata al montaggio, quando c'è solo il titolo o le sagome: lo `scrollTop` viene limitato all'altezza corta e non si riprova all'arrivo dei dati; inoltre la chiave è per sezione, quindi `/pratiche/A` e `/pratiche/B` condividono la posizione.
- Scenario: pratica lunga scorsa fino a *Incassi* → apro il cliente → Indietro → la pratica si ridisegna in cima (da confermare con A6 su schermo 768 px, dove il corpo scorre).
- Correzione puntuale: `Pagina` accetta `pronto?: boolean` e lo passa a `useScorrimento('corpo', pronto)`; le pagine di dettaglio passano `pronto={!!d}`; la chiave include il percorso completo (`usePathname()`) per `corpo`.
- Prova che la verifica: `strumenti/prove/app_pratica.py` a 768 px: scorri → naviga → `go_back()` → `scrollTop` uguale ±10 px.
- Esecutore: DeepSeek V4 Flash — due file.
- File toccati: `componenti/Pagina.tsx`, `lib/memoria.ts`, `pratiche/[id]/VistaPratica.tsx`, `bollettini/[id]/VistaBollettino.tsx`, prova citata
- Dipende da / correlato a: §7.12, A5-09

### A5-12 — Canale SSE chiuso per sempre dopo un riavvio del server o una sessione scaduta
- Gravità: P2
- Dove: `app/frontend/lib/eventi.tsx:15-31`
- Problema: `EventSource` si riconnette solo dopo una caduta di rete; se la risposta è un errore HTTP (502 di Caddy durante un riavvio, 401) passa a `CLOSED` e non riprova; manca `onerror`.
- Scenario: rilascio del backend alle 10:00 (Caddy risponde 502 per 5 s) → nelle schede aperte i contatori di Pratiche, Bollettini, Oggi e Documenti non si aggiornano più finché l'utente non ricarica la pagina; nessun avviso.
- Correzione puntuale: `fonte.onerror = () => { if (fonte.readyState === EventSource.CLOSED) setTimeout(apri, 15_000); }` con `apri()` che ricrea la fonte (chiusa nel cleanup); al 401 il primo `api()` della pagina porta già all'accesso.
- Prova che la verifica: `strumenti/prove/app_eventi.py`: `page.route('/api/eventi/flusso', 502)` una volta, poi normale → un evento del server aggiorna il contatore entro 20 s.
- Esecutore: DeepSeek V4 Flash — un file.
- File toccati: `lib/eventi.tsx`, `strumenti/prove/app_eventi.py`
- Dipende da / correlato a: D-23, §16.4.2; A1 (verificare che le riconnessioni SSE non rinnovino il timeout di inattività D-89)

### A5-13 — Contatori della barra laterale fermi fino al cambio pagina (D-23)
- Gravità: P2
- Dove: `app/frontend/componenti/Barra.tsx:77-92`
- Problema: i contatori si rileggono solo con `[percorso]`; la barra non usa `useEventi`. Spec §16.4.2: "contatori (barra laterale, …) si aggiornano da soli".
- Scenario: utente fermo su Pratiche, arriva una fattura nella casella → il registro emette `documento.*` → la tabella mostra la barra *Ci sono aggiornamenti*, ma il numero giallo di **Documenti** nella barra resta quello vecchio.
- Correzione puntuale: in `Barra` leggere `const ev = useEventi()` e aggiungere alle dipendenze dell'effetto una somma delle aree `documenti`, `pratiche`, `bollettini`, `sistema` (stesso schema di `VistaOggi.tsx:50`).
- Prova che la verifica: `strumenti/prove/app_eventi.py`: carica un documento da un'altra scheda → il contatore *Documenti* cresce senza navigare.
- Esecutore: DeepSeek V4 Flash — un file.
- File toccati: `componenti/Barra.tsx`, `strumenti/prove/app_eventi.py`
- Dipende da / correlato a: D-23, A5-12

### A5-14 — Pagina bianca se `/accesso/io` fallisce al primo caricamento
- Gravità: P2
- Dove: `app/frontend/app/(app)/layout.tsx:22-33`
- Problema: solo il 401 è gestito (in `api.ts`); con 500, 502 o rete caduta `io` resta `null` e il guscio restituisce `null` per sempre, senza messaggio né *Riprova*.
- Scenario: backend spento o database irraggiungibile → l'utente apre `/pratiche` → schermo bianco (nemmeno il titolo), nessun "Il server non risponde".
- Correzione puntuale: stato `errore` nel guscio: se `!r.ok && r.stato !== 401` mostra una pagina scura come l'accesso con `r.messaggio` e un pulsante *Riprova* che rilancia l'effetto.
- Prova che la verifica: `strumenti/prove/app_guscio.py`: `page.route('/api/accesso/io', 500)` → testo del messaggio e pulsante visibili.
- Esecutore: DeepSeek V4 Flash — un file.
- File toccati: `app/(app)/layout.tsx`, `strumenti/prove/app_guscio.py`
- Dipende da / correlato a: D-38, D-59

### A5-15 — Correzione dei dati letti: clic fuori dalla finestra o Esc perdono tutte le modifiche
- Gravità: P2
- Dove: `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx:597` (velo) e l'effetto `Escape` poco sopra (`FinestraCorreggi`)
- Problema: la finestra di correzione (testata + tutte le righe) si chiude senza conferma con un clic sul velo o con Esc, anche dopo molte modifiche.
- Scenario: l'utente corregge 15 righe di una fattura, trascina il divisore e rilascia il mouse sul velo → finestra chiusa, tutte le correzioni perse.
- Correzione puntuale: confrontare la bozza `b` con lo stato iniziale; se diversa, Esc e clic sul velo aprono `Conferma` "Chiudere senza salvare?"; altrimenti chiudono subito. Il clic sul velo chiude solo se `mousedown` e `click` sono entrambi sul velo.
- Prova che la verifica: `strumenti/prove/app_documenti.py`: modifica un campo, premi Esc → compare la conferma.
- Esecutore: DeepSeek V4 Flash — un componente.
- File toccati: `app/(app)/documenti/[id]/VistaDocumento.tsx`, `strumenti/prove/app_documenti.py`
- Dipende da / correlato a: §6.5

### A5-16 — Data di oggi in UTC come valore iniziale di "Valido dal"
- Gravità: P2
- Dove: `app/frontend/app/(app)/clienti/VistaClienti.tsx:154`; altre 4 copie di `oggi()` in `fornitori/VistaFornitori.tsx:97`, `subagenti/VistaSubagenti.tsx:66`, `pratiche/[id]/VistaPratica.tsx:116`, `bollettini/VistaBollettini.tsx:160` (ora locale del PC); `registro/VistaRegistro.tsx:62` e `liquidazioni/page.tsx:10` usano Europe/Rome
- Problema: `new Date().toISOString().slice(0,10)` è la data UTC: fra mezzanotte e l'1/2 di notte è il giorno prima.
- Scenario: nuova agenzia creata il 01/12 alle 00:30 → "Valido dal" proposto **30/11** → se l'utente conferma, l'agenzia vale anche per le fatture del 30/11; anche gli sconti "in vigore" dell'aiuto si calcolano sul giorno sbagliato.
- Correzione puntuale: una sola `oggi()` in `lib/formati.ts` con `new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' })`, usata da tutte e sei le pagine (togliere le copie locali).
- Prova che la verifica: test di unità piccolo o prova Playwright con `page.clock.set_fixed_time('2026-11-30T23:30:00Z')` in `app_clienti.py`: il campo propone 2026-12-01.
- Esecutore: DeepSeek V4 Flash — sostituzioni locali.
- File toccati: `lib/formati.ts`, i 6 file elencati, `strumenti/prove/app_clienti.py`
- Dipende da / correlato a: percentuali datate (A2)

### A5-17 — Nessun ESLint: regole dei hook non controllate, commenti `eslint-disable` inutili
- Gravità: P3
- Dove: `app/frontend/package.json` (nessun `eslint`/`eslint-config-next`); 20+ `// eslint-disable-*` nel codice
- Problema: le dipendenze degli effetti sono escluse a mano senza che un linter le controlli; difetti come A5-01/A5-04 non emergono.
- Scenario: un effetto nuovo con dipendenze mancanti passa `tsc` senza segnalazioni.
- Correzione puntuale: aggiungere `eslint` + `eslint-config-next` (flat config `next/core-web-vitals`) e uno script `"lint": "eslint ."`; correggere o motivare i rilievi.
- Prova che la verifica: `npm run lint` in `app/frontend` con 0 errori.
- Esecutore: DeepSeek V4 Flash — configurazione.
- File toccati: `app/frontend/package.json`, `app/frontend/eslint.config.mjs`
- Dipende da / correlato a: A8

### A5-18 — Cliente › Pratiche: importo non formattato e stato col codice interno
- Gravità: P3
- Dove: `app/frontend/app/(app)/clienti/VistaClienti.tsx:268-274` (`colonnePratiche`)
- Problema: `importo_merce` è mostrato come numero grezzo, `stato` come codice (`scaduta`, `confermata`), il vuoto come `-`; non come nel prototipo e in Pratiche.
- Scenario: scheda *Pratiche* del cliente → "12345.6" invece di "12.345,60 €", "scaduta" invece del badge "Conferma in ritardo".
- Correzione puntuale: `{ key: 'importo_merce', header: 'Importo', tipo: 'euro' }`; colonna stato con la mappa `ETICHETTA` di `VistaPratiche.tsx` (spostarla in un modulo comune, es. `lib/stati.ts`) e `<Stato>`; `'—'` per i vuoti.
- Prova che la verifica: `strumenti/prove/app_clienti.py`: la cella importo contiene "€".
- Esecutore: DeepSeek V4 Flash — locale.
- File toccati: `clienti/VistaClienti.tsx`, `pratiche/VistaPratiche.tsx`, `lib/stati.ts`, prova citata
- Dipende da / correlato a: D-24 (fedeltà al prototipo)

### A5-19 — Carica bollettino: anno doppio nella tendina (chiave React duplicata)
- Gravità: P3
- Dove: `app/frontend/app/(app)/bollettini/VistaBollettini.tsx:193,204`
- Problema: `anni = [prima.getFullYear(), oggi.getFullYear()]` è `[2026, 2026]` in tutti i mesi tranne gennaio.
- Scenario: novembre 2026 → la tendina *Anno* mostra "2026" due volte e React avvisa di due `key="2026"`.
- Correzione puntuale: `const anni = [...new Set([prima.getFullYear(), oggi.getFullYear()])];`
- Prova che la verifica: `strumenti/prove/app_bollettini.py`: la tendina anno ha opzioni distinte.
- Esecutore: DeepSeek V4 Flash — una riga.
- File toccati: `bollettini/VistaBollettini.tsx`
- Dipende da / correlato a: —

### A5-20 — Codice doppio: `caricaPdf` e download copiano `api()`; scaricamenti senza gestione del 401
- Gravità: P3
- Dove: `app/frontend/lib/api.ts:65-81` (`caricaPdf` ripete il corpo di `api`); `liquidazioni/VistaLiquidazioni.tsx:132-149` e l'analogo `scarica` in `analisi/VistaAnalisi.tsx` (fetch diretto); `api.ts:36` (`allAccesso` usa solo `pathname`)
- Problema: tre copie della stessa gestione risposta; gli scaricamenti con sessione scaduta mostrano "Non è stato possibile esportare" invece di portare all'accesso; il ritorno dopo l'accesso perde la query (`?righe=1`).
- Scenario: sessione scaduta, clic su *Esporta* → avviso d'errore generico, l'utente riprova senza capire.
- Correzione puntuale: in `api.ts` una funzione interna `invia(percorso, init)` usata da `api`, `caricaPdf` e da un nuovo `scarica(percorso)` che restituisce il `Blob` + nome; `allAccesso` usa `pathname + search`.
- Prova che la verifica: `strumenti/prove/app_liquidazioni.py` con cookie di sessione tolto: *Esporta* porta a `/accesso?dopo=…`.
- Esecutore: DeepSeek V4 Flash — un modulo + due chiamanti.
- File toccati: `lib/api.ts`, `liquidazioni/VistaLiquidazioni.tsx`, `analisi/VistaAnalisi.tsx`
- Dipende da / correlato a: D-38, D-89, A8

### A5-21 — `stile.css` dell'app diverso dal prototipo e con regole doppie
- Gravità: P3
- Dove: `app/frontend/app/stile/stile.css:275,506,511` (differenze dal prototipo; `app/layout.tsx:3` dice "copiati senza modifiche"); `.testo-attesa` definita due volte (`:610` e `:710`, la seconda aggiunge `font-weight:600`)
- Problema: il file non è più la copia del prototipo (D-24); una classe doppia con proprietà diverse (il caso `.scelta` citato in CLAUDE.md).
- Scenario: chi ricopia `stile.css` dal prototipo perde il piede fisso di `.tab-righe` e il `min-width` di `.tappa` sparisce nel prototipo; ogni `.testo-attesa` è in grassetto anche dove la prima regola non lo voleva.
- Correzione puntuale: riportare le 3 righe nel `stile.css` del prototipo (o toglierle dall'app) così i due file coincidono; unire le due `.testo-attesa` in una.
- Prova che la verifica: `diff` dei due file vuoto (aggiungere il controllo a una prova esistente, es. `app_componenti.py`).
- Esecutore: DeepSeek V4 Flash — CSS.
- File toccati: `app/frontend/app/stile/stile.css`, `prototipo-alternativo/assets/stile.css`
- Dipende da / correlato a: D-24, §16.1

---

## Note senza rilievo separato (per l'orchestratore)

- **Abbinamento: il browser rimanda `numero`, `data`, `importo` letti** (`VistaDocumento.tsx` `inviaAbbina`, `apriNuova`, `abbinaNota`) e il server li usa (`backend/src/documenti.ts:1055,1106`, `importo_merce: b.importo`). Sono valori che l'utente vede e conferma, ma il server li ha già in testata: per V12 basterebbe mandare l'id del documento. Da valutare con **A4/A2** (non è nel solo frontend).
- **Elenchi delle entità**: `lib/entita.ts` scarica `/api/clienti`, `/api/fornitori`, `/api/subagenti` interi (non `/api/lookup/*` come dice §16.4) e la `FilterBar` con riepilogo li carica a ogni apertura di Pratiche/Analisi anche senza filtri scelti (cache 5 s). Da misurare in **A7**.
- **Guscio**: `GET /accesso/io` a ogni cambio pagina (voluto, D-38) e nuovo oggetto `io` nel contesto → ridisegno di tutta l'app a ogni navigazione. Basso impatto.
- **Clienti**: `scontiInVigore` (scaglioni in vigore per l'aiuto del campo Sconto) si calcola nel browser; è solo un suggerimento, non si salva.
- Testi in inglese nell'interfaccia: **nessuno trovato**.

## Da decidere (Ugo)

1. **A5-03 / D-44**: il blocco sotto i 744 px è una decisione presa ma l'attività del piano (riga 128, 0,5 h) è ancora "da approvare". Approvare le ore o rimandare (e allora la regola 5 di CLAUDE.md va letta come "non ancora attivo").
2. **A5-08 / V12**: i totali in fondo alle tabelle e la differenza riga per riga del bollettino si sommano nel browser su valori del server. Spec §16.4 prevede `totale` nella DataTable, §16.5 li elenca fra i calcoli solo lato server. Scegliere: (a) totali sempre dal server (più lavoro backend), (b) ammessa la somma di sola visualizzazione su righe già calcolate dal server (scriverlo in §16.5 con il *Perché*).
3. **A5-09 / §7.12**: la memoria della schermata che non sopravvive al ricaricamento ed è unica per sezione è una semplificazione già dichiarata (`ponytail:` in `lib/memoria.ts`). Accettarla (aggiornare §7.12) o implementare la memoria per passo di cronologia.
4. **A5-05 / D-59**: l'esempio in spec §16.4.3 (`useSagome(!dati)` → `DataTable caricando={sagome}`) produce lui stesso il lampo di «Nessun elemento»: correggendo A5-05 cambia l'esempio della spec e del catalogo.
