# A8 — Complessità e debito

- **Skill caricate** (strumento Skill): `ponytail:ponytail-audit`, `ponytail:ponytail-debt`, `engineering:tech-debt`.
- **Prove lanciate**: nessuna (sola lettura; le prove le lancia A6). Verifiche fatte: grep delle esportazioni
  mai importate (script su `app/backend/src`, `prisma`, `frontend/app|componenti|lib`), uso delle dipendenze di
  `package.json`, `diff` fra `prototipo-alternativo/assets/stile.css` e `app/frontend/app/stile/stile.css`,
  formattazione di Node con `it-IT` (`node -e`), raccolta dei commenti `ponytail:` e `TODO/FIXME` (nessun TODO/FIXME).
- **Non controllato**: correttezza dei calcoli (A2), transazioni (A3), sicurezza (A1), prestazioni reali di
  `caricaDati` (A7), lavoro in corso non committato su `documenti/[[...id]]` (D-94: struttura ancora in movimento).
- **Passati ad altri** (visti, fuori ambito): somme fatte nel browser in `componenti/ConsultaDocumenti.tsx:212`,
  `documenti/[id]/VistaDocumento.tsx:728`, filtro pratiche in `clienti/VistaClienti.tsx:282` → A2/A5 (V12).

Riepilogo: **0 P0 · 0 P1 · 5 P2 · 9 P3** + registro `ponytail:` (17 marcatori) + 1 *Da decidere*.

---

### A8-01 — Importi in euro scritti in tre modi diversi nel backend
- Gravità: P2
- Dove: `app/backend/src/proposta.ts:15`, `oggi.ts:17`, `incassi.ts:15`, `solleciti.ts:16`; riferimento `app/frontend/lib/formati.ts:13`
- Problema: quattro copie di `euro()` con due algoritmi: `toLocaleString('it-IT')` (Node non mette il punto
  sotto 10.000) e `toFixed(2)` senza migliaia; il frontend usa una terza forma, sempre col punto.
- Scenario: importo 8207,20 → pagina «8.207,20 €», testo di Oggi/sollecito/email al cliente «8207,20 €»;
  importo 12345,60 → avviso di `proposta.ts` «12345,60 €», Oggi «12.345,60 €». Stesso numero, tre scritture
  davanti alla stessa persona (e nelle email ai fornitori/clienti).
- Correzione puntuale: nuovo `app/backend/src/formati.ts` con `euro`, `dataIt`, `MESI` copiati da
  `frontend/lib/formati.ts` (gruppi con `/\B(?=(\d{3})+(?!\d))/g`, accetta `number | Prisma.Decimal`);
  importarli nei quattro file e cancellare le copie locali.
- Prova che la verifica: in `test/oggi.spec.ts` (o `incassi.spec.ts`) un caso con importo 8207,2 che si
  aspetta `8.207,20 €` nel testo; `npm test` (cambiano le stringhe attese: aggiornarle).
- Esecutore: DeepSeek V4 Flash — sostituzione meccanica di funzioni di testo
- File toccati: `backend/src/formati.ts` (nuovo), `proposta.ts`, `oggi.ts`, `incassi.ts`, `solleciti.ts`, spec di prova relative
- Dipende da / correlato a: A8-07 (stesso file nuovo)

### A8-02 — Gli errori di validazione 4xx non arrivano al registro
- Gravità: P2
- Dove: `app/backend/src/errori.filter.ts:9-29`
- Problema: il `ponytail:` rimanda la registrazione dei 4xx «quando arrivano le prime rotte che scrivono»;
  le rotte che scrivono ci sono tutte da tempo, il filtro restituisce il 4xx e non scrive nulla.
- Scenario: un amministratore salva un fornitore con un valore rifiutato dal DTO → 400 in pagina, nessuna riga
  nel registro; la spec §15.2.7 (riga «Errore di validazione 4xx») e §15.5 («nessuna eccezione gestita
  silenziosamente») chiedono l'evento con `{etichetta, errore: {campo, messaggio}}`.
- Correzione puntuale: nel ramo `HttpException` con stato 400/422 (escluso 401/403/404/429), `logEventSicuro`
  con `tipo` dedotto dal metodo (`POST`→`crud/create`, `PUT|PATCH`→`crud/update`, `DELETE`→`crud/delete`),
  `entita` = primo segmento di `req.path` dopo `/api/`, `esito: 'errore'`, `dettaglio.errore` = primo messaggio
  del ValidationPipe (mai i valori inviati); aggiungere il codice in `SCHEMI` di `registro.ts`. Togliere il `ponytail:`.
  Se la mappa metodo→tipo non basta, decidere con Ugo il catalogo.
- Prova che la verifica: `test/registro-api.spec.ts` — PUT fornitore con campo non valido → 400 e una riga `esito='errore'`.
- Esecutore: DeepSeek V4 — tocca il registro (D-31) e il filtro globale
- File toccati: `errori.filter.ts`, `registro.ts`, `test/registro-api.spec.ts`
- Dipende da / correlato a: A1 (errori che espongono dati), A3 (registro), D-31

### A8-03 — In esercizio il `dettaglio` non valido non apre l'anomalia
- Gravità: P2
- Dove: `app/backend/src/registro.ts:89-91` (funzione `controlla`)
- Problema: il `ponytail:` dice «l'anomalia arriva con `apriAnomalia`»; `apriAnomalia` esiste (usata in
  `casella.ts`), ma in esercizio si fa solo `log.warn`.
- Scenario: un evento nuovo scritto con una chiave mancante → la riga va nel registro senza la chiave, nessuno
  lo vede in *Stato del sistema*; spec §15.4 chiede l'anomalia `app.dettaglio_non_valido`.
- Correzione puntuale: `controlla` restituisce l'errore invece di loggarlo; `logEvent`/`apriAnomalia`, dopo la
  scrittura, se c'è errore e `NODE_ENV !== 'test'` chiamano `apriAnomalia(db, { codice: 'app.dettaglio_non_valido', … })`
  (senza ricorsione: per quel codice si salta il controllo). Togliere il `ponytail:`.
- Prova che la verifica: `test/registro.spec.ts` con `NODE_ENV` forzato a `production` nel caso → anomalia aperta.
- Esecutore: DeepSeek V4 — registro e transazione corrente (V13)
- File toccati: `registro.ts`, `test/registro.spec.ts`
- Dipende da / correlato a: A8-02 (stesso file `registro.ts`: stesso pacchetto), A3, D-31

### A8-04 — Due copie di `stile.css` che già divergono
- Gravità: P2
- Dove: `prototipo-alternativo/assets/stile.css` e `app/frontend/app/stile/stile.css` (1033 / 1034 righe)
- Problema: l'app ha una copia del foglio del prototipo; le due copie sono già diverse in 3 punti.
- Scenario: `.tappa { min-width: 0 }` c'è solo nel prototipo (il binario delle tappe nell'app può allargare la
  griglia con nomi lunghi); `.tab-righe tfoot td` sticky e `.aff-dx .tab-righe-box` solo nell'app (il prototipo
  non mostra più com'è l'app). Ogni ritocco va fatto due volte e uno si dimentica.
- Correzione puntuale: riportare `min-width: 0` su `.tappa` (riga 275) nell'app; poi una sola fonte (vedi
  *Da decidere*). Togliere dalla copia dell'app le classi senza uso nell'app né nel prototipo: `esp-titolo`,
  `aree-titolo`, `modulo-3`.
- Prova che la verifica: `diff` vuoto fra i due file (o solo le differenze dichiarate); `strumenti/prove/app_pratica.py` (binario).
- Esecutore: DeepSeek V4 Flash — CSS, un file
- File toccati: `app/frontend/app/stile/stile.css` (+ eventualmente `prototipo-alternativo/assets/stile.css`)
- Dipende da / correlato a: D-24, A5

### A8-05 — `app/deploy/` è vuota ma il README la descrive
- Gravità: P2
- Dove: `app/deploy/` (solo `.gitkeep`); `app/README.md:12` («Caddyfile, script di avvio e pubblicazione»)
- Problema: mancano Caddyfile, avvio dei due processi (8001/8002) e pubblicazione: al collaudo finale non c'è
  un modo scritto di mettere in esercizio l'app.
- Scenario: chi installa sul server segue il README, apre `deploy/` e non trova nulla; la configurazione si fa
  a mano e non è ripetibile (stessa CSP? stessi timeout del proxy da 180 s di `next.config.ts`?).
- Correzione puntuale: aggiungere `deploy/Caddyfile` (reverse proxy verso 8001, timeout ≥ 180 s per il PDF),
  due unità systemd (o script) per `npm run start:prod` e `npm run start`, uno script di pubblicazione
  (sparse checkout `app/`, `npm ci`, `prisma migrate deploy`, `build`); oppure correggere il README se il
  deploy si tiene altrove.
- Prova che la verifica: lettura del README su una macchina pulita (manuale).
- Esecutore: DeepSeek V4 Flash — file di configurazione nuovi, nessuna logica
- File toccati: `app/deploy/*`, `app/README.md`
- Dipende da / correlato a: §3.2 spec, A1 (intestazioni di sicurezza su Caddy)

### A8-06 — Esportazioni morte
- Gravità: P3
- Dove: `app/backend/src/impostazioni.ts:313` `elencoSezioni`; `app/backend/src/motore/motore.ts:31` `importoRighe`
- Problema: esportate, mai usate né nel file né altrove (né nelle prove).
- Scenario: chi legge il motore pensa che `importoRighe` sia il modo di sommare le righe e lo usa al posto di quello vero.
- Correzione puntuale: cancellare le due righe.
- Prova che la verifica: `npm run build` e `npm test`.
- Esecutore: DeepSeek V4 Flash — codice morto
- File toccati: `impostazioni.ts`, `motore/motore.ts`
- Dipende da / correlato a: —

### A8-07 — Aiuti e controlli copiati fra i moduli
- Gravità: P3
- Dove: backend `dataIt` ×8 (`analisi`, `bollettino`, `esporta-liquidazione`, `incassi`, `liquidazioni`, `oggi`,
  `pratiche`, `solleciti`), `MESI` ×4 (`analisi`, `bollettino`, `liquidazioni`, `oggi`), regex `ELENCO_ID` ×4
  (`analisi:27`, `bollettini:15`, `pratiche:21`, `registro-api:20`) e `MESE` ×2; frontend `mpiu`/`mk` ×3
  (`analisi/VistaAnalisi.tsx:25`, `bollettini/VistaBollettini.tsx:24`, `componenti/PeriodoMesi.tsx:11`)
- Problema: oggi uguali; `ELENCO_ID` è un controllo d'ingresso: se lo si stringe in un file gli altri tre restano larghi.
- Scenario: si decide di limitare la selezione multipla a 200 id: va cambiato in 4 file, uno sfugge.
- Correzione puntuale: backend in `formati.ts` di A8-01 (`dataIt`, `MESI`) e in un `validazione.ts` (o lo
  stesso file) `ELENCO_ID`, `MESE`; frontend esportare `mpiu`/`mk` da `PeriodoMesi.tsx` e importarli nelle due viste.
- Prova che la verifica: `npm test`; `strumenti/prove/app_bollettini.py`, `app_analisi.py`.
- Esecutore: DeepSeek V4 Flash — spostamento senza cambio di logica
- File toccati: quelli elencati + `backend/src/formati.ts`
- Dipende da / correlato a: A8-01 (fare dopo, stesso file nuovo)

### A8-08 — Pagina «In costruzione» sopravvissuta all'ultima pagina
- Gravità: P3
- Dove: `app/frontend/app/(app)/[...resto]/page.tsx`, `app/frontend/componenti/InCostruzione.tsx`
- Problema: il `ponytail:` dice «sparisce con l'ultima»: tutte le voci della barra hanno ora una pagina vera,
  il segnaposto serve solo agli indirizzi sbagliati.
- Scenario: `/pratica/12` (refuso) → pagina «In costruzione — arriva con i prossimi passi del piano
  (avanzamento-app.md)»: testo interno mostrato al cliente invece di «Pagina non trovata».
- Correzione puntuale: cancellare `[...resto]/` e `InCostruzione.tsx`; aggiungere `app/(app)/not-found.tsx`
  con `Pagina`+`Pannello` e testo «Pagina non trovata» (dentro il guscio). Togliere `titoloDi` se resta senza uso.
- Prova che la verifica: `strumenti/prove/app_guscio.py` (aggiungere: indirizzo inesistente → «Pagina non trovata»).
- Esecutore: DeepSeek V4 Flash — due file frontend
- File toccati: `[...resto]/page.tsx`, `InCostruzione.tsx`, `app/(app)/not-found.tsx` (nuovo), `app_guscio.py`
- Dipende da / correlato a: D-45, A5

### A8-09 — Dipendenza mai usata: `@nestjs/config`
- Gravità: P3
- Dove: `app/backend/package.json` (dependencies)
- Problema: nessun import in `src`, `test`, `prisma`; la configurazione passa da `dotenv/config` e `process.env`.
- Scenario: installata e aggiornata (avvisi di sicurezza, `npm audit`) senza servire.
- Correzione puntuale: `npm uninstall @nestjs/config` in `app/backend`.
- Prova che la verifica: `npm run build`, `npm test`.
- Esecutore: DeepSeek V4 Flash — una riga di package.json
- File toccati: `backend/package.json`, `backend/package-lock.json`
- Dipende da / correlato a: A8-10 (stesso file)

### A8-10 — Versioni non bloccate e tipi di Node sbagliati
- Gravità: P3
- Dove: `app/backend/package.json` (`imapflow ^2.10.2`, `mailparser ^3.14.2`, `nodemailer ^7.0.10`,
  `@types/mailparser`, `@types/nodemailer`); `app/frontend/package.json` (`pdfjs-dist ^6.5.438`, `@types/node 20.19.43` con `engines` Node 24)
- Problema: tutto il resto è a versione esatta; queste cinque possono cambiare a ogni `npm install` senza lock.
- Scenario: `npm install` sul server senza lock aggiornato porta `pdfjs-dist` 6.6 → il worker cambia percorso
  e il rettangolo nel PDF (`PdfEvidenziato.tsx`) smette di disegnarsi; i tipi di Node 20 nascondono API di Node 24.
- Correzione puntuale: togliere i `^` (versione esatta presente nel lock); `@types/node` del frontend a `24.13.2` come il backend.
- Prova che la verifica: `npm ci && npm run build` in entrambe.
- Esecutore: DeepSeek V4 Flash — package.json
- File toccati: `backend/package.json`, `frontend/package.json`, i due lock
- Dipende da / correlato a: A8-09

### A8-11 — Strumento di prova `lettura-prova.ts` dentro `src/` (va in produzione)
- Gravità: P3
- Dove: `app/backend/src/lettura-prova.ts`; script `lettura:prova` in `backend/package.json:21`; `app/README.md:71`
- Problema: è una prova a mano del connettore (F6-A2); stando in `src/` si compila in `dist/` e va sul server.
- Scenario: sul server `npm run lettura:prova -- file.pdf` manda un documento a LlamaCloud con la chiave di
  esercizio e consuma crediti fuori dalla coda e fuori dal registro.
- Correzione puntuale: spostarlo in `app/backend/prisma/lettura-prova.ts` (come `ponte-prova.ts`), import con
  `../src/…`, script `ts-node prisma/lettura-prova.ts`; aggiornare il README. Oppure cancellarlo se F6 è chiusa.
- Prova che la verifica: `npm run build` (in `dist/src` non c'è più `lettura-prova.js`).
- Esecutore: DeepSeek V4 Flash — spostamento di un file
- File toccati: `src/lettura-prova.ts` → `prisma/lettura-prova.ts`, `package.json`, `app/README.md`
- Dipende da / correlato a: A4, D-67; A8-09/10 (stesso package.json)

### A8-12 — Commenti `ponytail:` senza tetto né uscita
- Gravità: P3
- Dove: `app/backend/src/bollettino.ts:87`, `app/backend/src/liquidazioni.ts:150`
- Problema: non sono scorciatoie ma spiegazioni dell'ordine dei blocchi (V13): non nominano limite né quando
  rivederli, quindi nel registro del debito restano aperti per sempre.
- Scenario: chi fa la pulizia dei `ponytail:` li «chiude» togliendo il blocco `FOR UPDATE` credendolo provvisorio.
- Correzione puntuale: trasformarli in commenti normali con il riferimento (`// V13, D-36: …`). Non toccare il codice.
- Prova che la verifica: nessuna (solo commento).
- Esecutore: DeepSeek V4 Flash — commenti
- File toccati: `bollettino.ts`, `liquidazioni.ts`
- Dipende da / correlato a: D-36, A3

### A8-13 — Cinque `ponytail:` sullo stesso tetto (`caricaDati` carica tutto)
- Gravità: P3
- Dove: `motore/dati.ts:6`, `analisi.ts:18`, `liquidazioni.ts:15`, `liquidazioni.ts:147`, `liquidazioni.ts:198`
- Problema: lo stesso limite è scritto cinque volte con soglie diverse («supera il secondo», «costa secondi»,
  «quando i dati crescono»): nessuna è misurabile tranne la prima.
- Scenario: A7 o il carico (`test/carico-pratiche.ts`) mostra 3 s sulla liquidazione: non è chiaro quale
  commento scatta e chi decide.
- Correzione puntuale: un solo `ponytail:` in `motore/dati.ts` con soglia unica e misurabile
  (es. «> 1 s con `test/carico-pratiche.ts` a N pratiche → filtrare per periodo/fornitore»); negli altri
  quattro `// vedi caricaDati (motore/dati.ts)`.
- Prova che la verifica: nessuna (commenti); il numero lo dà A7.
- Esecutore: DeepSeek V4 Flash — commenti
- File toccati: i cinque elencati
- Dipende da / correlato a: A7, A8-12 (stesso `liquidazioni.ts`)

### A8-14 — File sporchi nella radice e cartelle di uscita non ignorate
- Gravità: P3
- Dove: radice del repo e `strumenti/prove/`
- Problema: file locali non tracciati e non in `.gitignore`, a rischio di `git add .`:
  - `body.json` — **contiene nome utente e password in chiaro** (corpo di un login di prova): cancellarlo, non solo ignorarlo;
  - `cookies.txt` (file cookie di curl), `idee.md`, `specifica-lettura.md` (384 KB), `app_llm_locale/`;
  - `strumenti/prove/schermate-f6a4b|f7-profilo|f7a1|p5/` (~16 MB di PNG; CLAUDE.md: «non committare le cartelle di uscita degli strumenti»).
- Scenario: un `git add -A` pubblica la password su GitHub (repo con prototipo pubblico su Pages).
- Correzione puntuale: cancellare `body.json` e `cookies.txt`; in `.gitignore` aggiungere `body.json`,
  `cookies.txt`, `strumenti/prove/schermate-*/`; Ugo decide se `idee.md`, `specifica-lettura.md`,
  `app_llm_locale/` vanno committati o spostati. Se la password di `body.json` è di un utente reale, cambiarla.
- Prova che la verifica: `git status --short` non mostra più quei file.
- Esecutore: DeepSeek V4 Flash — pulizia
- File toccati: `.gitignore`, file elencati
- Dipende da / correlato a: A1 (credenziali)

---

## Registro dei `ponytail:` (app/, 17 marcatori)

| Dove | Cosa è semplificato | Tetto | Uscita | Stato |
|---|---|---|---|---|
| `backend/src/analisi.ts:18` | `caricaDati` carica tutto | > 1 s sui volumi grandi | vista `v_analisi_documenti` | aperto → A8-13 |
| `backend/src/bollettino.ts:87` | ordine lettura/blocco del bollettino | — | — | **no-trigger** → A8-12 |
| `backend/src/errori.filter.ts:9` | 4xx di validazione non registrati | rotte che scrivono | registrarli | **uscita raggiunta** → A8-02 |
| `backend/src/eventi.ts:124` | ciclo SSE per processo | un solo processo backend | LISTEN/NOTIFY con più processi | aperto, valido (8002 unico) |
| `backend/src/integra.ts:45` | colonne delle viste Integra | ponte vero non raggiungibile | conferma F0-A8 | aperto (pg_hba rifiuta il client) |
| `backend/src/liquidazioni.ts:15` | `caricaDati` carica tutto | dati che crescono | caricamento parziale | aperto → A8-13 |
| `backend/src/liquidazioni.ts:147` | timeout 30 s della chiusura | come sopra | come sopra | aperto → A8-13 |
| `backend/src/liquidazioni.ts:150` | nascita della riga di liquidazione | — | — | **no-trigger** → A8-12 |
| `backend/src/liquidazioni.ts:198` | fino a 7 passate sulle pratiche | secondi sui volumi veri | righe già calcolate | aperto → A8-13 |
| `backend/src/motore/dati.ts:6` | `caricaDati` carica tutto | dati che crescono | filtro per periodo/fornitore | aperto → A8-13 |
| `backend/src/registro.ts:28` | schemi: solo chiavi, non tipi | tipi non controllati | zod | aperto, valido (D-31) |
| `backend/src/registro.ts:89` | `dettaglio` non valido solo nel log | — | `apriAnomalia` | **uscita raggiunta** → A8-03 |
| `backend/src/utenti.ts:190` | lucchetto unico sugli utenti | scritture concorrenti | lucchetti per riga | aperto, valido |
| `frontend/componenti/Icona.tsx:2` | solo le icone usate | — | copiare dal prototipo | aperto, valido |
| `frontend/componenti/InCostruzione.tsx:4` | segnaposto pagine | — | ultima pagina fatta | **uscita raggiunta** → A8-08 |
| `frontend/componenti/Utente.tsx:19` | area Vendite assente | vendita spenta (D-08) | accensione §17 | aperto, valido |
| `frontend/lib/memoria.ts:8` | memoria anche riaprendo dal menu | non distingue ritorno/apertura | `history.state` | aperto, valido |

17 marcatori: 3 con uscita già raggiunta (da chiudere), 2 senza tetto né uscita, 5 sullo stesso tetto da unificare, 7 validi. Nessun TODO/FIXME in `app/`.

## Visti e lasciati (non sono debito)

- `lettore.ts` con un solo connettore (`llamacloud_eu`): imposto da D-67 (il locale GLM-OCR arriva dopo), non è YAGNI.
- `Sonde` iniettabili in `sistema.ts`: servono alle prove.
- `pratiche-ricalcola.ts`, `superutente.ts`: strumenti d'esercizio documentati (D-52).
- `rxjs` (SSE di Nest), `reflect-metadata` (peer di Nest), `class-transformer`: usati.
- Catalogo *Componenti* nell'app: deciso da Ugo (01/11/2026, solo superutente).
- ~50 simboli esportati ma usati solo nel proprio file (tipi di props, sonde): rumore, non costo; non li segnalo uno per uno.
- `documenti.ts` (1231 righe, 4 controller, 12 modifiche nell'ultimo mese): è il file più caldo; non propongo di
  spezzarlo durante D-94 in corso.

## Da decidere (Ugo)

- **Fonte unica di `stile.css`** (A8-04, D-24): D-24 dice che la fonte di verità è il foglio del prototipo, ma dal
  30/10 il lavoro è sull'app e la copia dell'app ha già ritocchi propri. Proposta: la copia dell'app diventa la
  fonte e il prototipo la importa (o la si copia con uno script prima di pubblicare). Cambia D-24 → serve la tua scelta.
