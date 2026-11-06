# Prompt per OpenCode — F5-A6 Impostazioni

Lavoro da **Opus**: regole, segreti e connessioni. Una sola sessione, senza sottoagenti.

Leggi `CLAUDE.md`. Carica le skill `ponytail`, `nestjs-best-practices`, `prisma-client-api`,
`nextjs-app-router-patterns`, `ui-ux-pro-max`, `javascript-typescript-jest`, `webapp-testing`,
`playwright-best-practices` e `owasp-security`. Prima di cercare nei file usa
`graphify query "<domanda>"`.

## Compito

La pagina **`/impostazioni/:sezione`**: sei sezioni di parametri validi per tutti, con password e
segreti **cifrati e mai riletti** e *Prova la connessione* (§7.15, §4.2.14). Le impostazioni poi
devono essere **usate davvero**: posta in uscita, sincronizzazione da Integra, conservazione del
registro, righe per pagina, intestazione delle esportazioni. Una sezione salvata ma ignorata è un
errore.

Da leggere:
- `piano-lavoro-crm.md`: riga **F5-A6**;
- `specifica-crm-provvigioni.md`: §4.2.14, §7.13 (posta respinta), §7.14.1–§7.14.3, §7.15, §8.1,
  §15.2, §15.4, §15.7, §16.4; nel §19: D-28, D-31, D-36, D-39, D-41;
- `prototipo-alternativo/assets/viste-gestione.js`, righe 295–368 (sezioni, campi, testi, controlli);
  `prototipo-alternativo/assets/dati.js`, `impostazioni`;
- `app/backend/src/accesso.ts` (`PERMESSI`, `io`), `posta.ts`, `integra.ts`, `registro.ts`,
  `registro-api.ts`, `esporta-liquidazione.ts`, `analisi.ts`;
- `app/frontend/componenti/Campo.tsx`, `Flussi.tsx` (`ElencoSelezionabile`), `Pagina.tsx`,
  `DataTable.tsx`, `Utente.tsx`, `lib/api.ts`;
- `app/backend/test/registro-api.spec.ts` e `app/backend/test/integra.spec.ts` (forma delle prove).

## Server

**Nessuna migrazione**: la tabella `impostazioni` c'è già. Non toccare il vincolo
`impostazioni_chiave_check`: la chiave `accesso` resta ammessa ma non si usa più (D-39).

### `app/backend/src/segreto.ts` (nuovo)

- `cifra(testo: string): string` e `decifra(valore: string): string` con **AES-256-GCM**
  (`node:crypto`). Chiave = SHA-256 di `SEGRETI_CHIAVE` (stringa lunga e casuale nel `.env`).
- Formato del valore salvato nel JSON: `v1:<iv base64>:<tag base64>:<dati base64>`.
- `decifra` con chiave diversa o formato ignoto lancia un errore chiaro; **mai** restituisce il
  testo cifrato come se fosse in chiaro.
- `SEGRETI_CHIAVE` assente: `cifra`/`decifra` lanciano. Le sezioni senza segreti si salvano lo
  stesso; il messaggio per l'utente dice di impostare la chiave nel `.env` del server.
- Aggiungi `SEGRETI_CHIAVE=CAMBIARE` a `.env.example` con il commento (genera con
  `openssl rand -base64 48`).

### `app/backend/src/impostazioni.ts` (nuovo)

Valori, metadati dei campi, validazione e lettura per i servizi. **Non** importa `accesso.ts`
(niente cicli): il controller sta in `impostazioni-api.ts`.

Sei sezioni, con i campi e i testi del prototipo:

| Sezione | Campi (tipo, limiti) |
|---|---|
| `azienda` — *Dati dell'azienda* | `ragione_sociale` (testo), `piva` (testo), `indirizzo` (testo), `email` (email) |
| `casella` — *Casella dei documenti* | `server`, `porta` (numero 1–65535), `utente`, `password` (segreto), `cartella`, `cartella_lette`, `minuti` (numero 1–60) |
| `lettura` — *Server di lettura* | `indirizzo`, `modello`, `attesa_s` (numero 1–600), `soglia_ok` (numero 0–1, due decimali), `soglia_bassa` (numero 0–1, due decimali) |
| `posta` — *Posta in uscita* | `server`, `porta` (1–65535), `utente`, `password` (segreto), `mittente` |
| `integra` — *Sincronizzazione da Integra* | `server`, `database`, `utente`, `password` (segreto), `schema`, `secondi` (10–3600) |
| `conservazione` — *Conservazione dei dati* | `eventi_mesi` (12–120), `scartati_giorni` (1–3650), `righe_pagina` (5–200) |

- Ogni campo ha etichetta, aiuto (le frasi del prototipo, comprese «Da 1 a 60.», «Da 10 a 3600.»,
  le soglie di §6.5) e `largo` dove serve. I metadati stanno **solo qui**: la pagina li riceve dal
  server e non li riscrive.
- **Valori iniziali**: quelli di `dati.js` per `azienda`, `lettura` (soglie 0,90/0,70, attesa 120,
  modello `zai-org/GLM-OCR`), `conservazione` (36/90/25). Per `casella`, `posta` e `integra` i campi
  di connessione partono **vuoti**: un'installazione nuova non deve tentare connessioni a indirizzi
  d'esempio. `lettura.indirizzo` vuoto.
- `valoriSezione(db, chiave)`: valori iniziali + la riga del database se c'è. Le password cifrate
  restano cifrate.
- `valoriPubblici(db, chiave)`: come sopra, ma ogni campo segreto diventa
  `{valore: null, impostata: true|false}` — **il valore non esce mai dal server**.
- `casellaConfig(db)`, `postaConfig(db)`, `integraConfig(db)`, `letturaConfig(db)` per i servizi:
  valori con le password **decifrate** (solo dove servono). Restituiscono `null` se i campi
  necessari mancano.
- `righePagina(db)`: intero dalle impostazioni, 25 se la riga non c'è.
- `ragioneSociale(db)`: `{ragione_sociale, piva, indirizzo, email}` per le intestazioni.
- **Validazione sul server** (§7.15): numeri interi e nei limiti, email con `@`, testi obbligatori,
  `0 < soglia_bassa < soglia_ok ≤ 1`, `eventi_mesi ≥ 12` (le informazioni durano comunque 12 mesi,
  §15.7). Campi sconosciuti = 400. Un errore dice quale campo e il limite, mai il valore.
- Password: campo assente o stringa vuota = **resta quella di prima**; valore scritto = sostituita
  (cifrata). Una password non si può cancellare dall'interfaccia.

### `app/backend/src/impostazioni-api.ts` (nuovo)

Controller `impostazioni-api`, permesso `sistema.impostazioni` su tutte le rotte. Registralo in
`app.module.ts`.

1. `GET /api/impostazioni`
   ```ts
   { sezioni: [{ chiave, titolo, sotto, campi: [{ nome, etichetta, tipo, aiuto, largo, valore, impostata? }] }] }
   ```
   Ordine fisso: azienda, casella, lettura, posta, integra, conservazione. `tipo`:
   `testo | numero | email | password`.
2. `PUT /api/impostazioni/:chiave`
   Corpo `{ valori: { <campo>: valore } }` (DTO generico con `@IsObject()`; la validazione per
   sezione è nel servizio). 404 per chiave sconosciuta. In **una transazione** (V13): upsert della
   riga con `aggiornato_da` e l'evento
   `crud/update` · `entita='impostazione'` · `entita_id = null` · dettaglio
   `{etichetta: <titolo>, chiave, prima, dopo}` con i soli campi cambiati. Le password compaiono
   come `'impostata'` / `'non impostata'` / `'sostituita'`: **mai** il valore (§15.4, §15.8).
   Risponde la sezione pubblica aggiornata.
3. `POST /api/impostazioni/:chiave/prova`
   Prova **i valori salvati** (non quelli digitati e non salvati), risponde
   `{ ok: boolean, ms: number, testo: string }`:
   - `casella`: `imapflow` — connessione, presenza della cartella da leggere e di quella delle
     lette; chiude sempre. Testo: «Casella raggiungibile · N email nella cartella» oppure il
     motivo in italiano.
   - `posta`: `nodemailer` — `verify()`. Testo: «Accesso SMTP riuscito».
   - `lettura`: `GET <indirizzo>/models` con `fetch` e timeout 10 s; se la risposta ha i modelli,
     testo «Server di lettura raggiungibile · modello X».
   - `integra`: pool di sola lettura (`creaPonte`) e `SELECT count(*)` dalle due viste, come
     `IntegraService.prova()`; chiude il pool.
   - `azienda` e `conservazione`: 400 «Questa sezione non ha una connessione da provare».
   Una prova fallita è una risposta `200 {ok:false}` con il motivo, non un 500.
4. **Nessun evento** sulle GET e sulle prove (letture, §15.1).

Aggiungi in `registro-api.ts` il riferimento `impostazione` → `/impostazioni/<dettaglio.chiave>`.

### I servizi leggono le impostazioni

- **`posta.ts`**: `invia()` legge `postaConfig`. Senza server configurato resta il log attuale
  (sviluppo). Con server configurato manda con **nodemailer** (`secure` con porta 465), sempre
  **dopo il commit** (il chiamante lo fa già). In ogni caso aggiorna `utenti.ultimo_invio`; se
  l'invio fallisce scrive l'errore e apre l'anomalia `posta.respinta` (chiave = indirizzo, se è il
  destinatario rifiutato) oppure `posta.connessione`; al primo invio riuscito chiude le anomalie
  dell'indirizzo. `invia` non lancia mai. Per le prove esporta `creaTrasporto(config)` e accetta un
  trasporto finto come ultimo parametro facoltativo.
  Dipendenze: `nodemailer` e `@types/nodemailer` (dev).
- **`integra.ts`**: `IntegraService` legge `integraConfig` a ogni giro. Se i campi di connessione
  ci sono, costruisce la stringa `postgresql://utente:password@server:5432/database`
  (`encodeURIComponent` su utente e password) e usa `schema` per le viste; se mancano, usa
  `PONTE_URL` e `crm_viste` (sviluppo e prove). Il pool si ricrea solo quando la configurazione
  cambia. Il timer resta a un tick di 60 s ma esegue il giro solo quando sono passati `secondi`
  (in memoria; al riavvio un giro subito). Un giro alla volta. Zero impatto sulle prove esistenti
  (senza riga `impostazioni.integra` valgono `PONTE_URL` e 60 s).
- **`registro.ts`**: `pulisciRegistro(db, ora = new Date(), eventiMesi = 36)`; le righe `info`
  restano a 12 mesi (fisso), le altre a `eventiMesi`. `PuliziaRegistro` in `registro-api.ts` legge
  `conservazione.eventi_mesi` prima di chiamarla. Aggiorna la prova esistente.
- **`accesso.ts`**: `io()` diventa `async` e aggiunge `righe_pagina` (da `righePagina(db)`).
- **`DataTable`**: default `perPagina` = `useUtente().righe_pagina` (25 se manca); le pagine che
  passano `perPagina` esplicito restano come sono.
- **`pratiche.ts`** e **`registro-api.ts`**: quando il browser non manda `perPagina`, il server usa
  `righePagina(db)` e lo restituisce in `per_pagina` (registro: via il 50 fisso). Aggiorna
  `VistaRegistro`/`VistaPratiche` solo se serve (leggono già `per_pagina`).
- **`esporta-liquidazione.ts`** e **`analisi.ts`**: al posto di «Decobrands SRL» fisso usa
  `ragioneSociale(db)` — riga di contesto/piede con ragione sociale, P.IVA, indirizzo ed email
  quando ci sono (una riga, nessun cambio di impaginazione). Il PDF viene dallo stesso Excel.
- `scartati_giorni` e `lettura`/`casella` si salvano qui ma li usano **F5-A7** e **F6**; non
  costruire ora la cancellazione degli scartati.

## Pagina

- `app/frontend/app/(app)/impostazioni/page.tsx`: componente server che fa
  `redirect('/impostazioni/azienda')`.
- `app/frontend/app/(app)/impostazioni/[sezione]/page.tsx`: client, legge `sezione` da
  `useParams`, chiama `GET /api/impostazioni`, disegna `VistaImpostazioni`.
- `VistaImpostazioni.tsx`, con i componenti esistenti:
  - `Pagina` titolo «Impostazioni», `pieno`, sottotitolo del prototipo («Valgono per tutti gli
    utenti. Le password non si rileggono: si sostituiscono. Ogni modifica resta nel registro
    eventi.»);
  - due colonne `colonne riempi` con `--colonne: minmax(240px,0.6fr) minmax(0,2fr)`;
  - sinistra: `Pannello` *Sezioni* + `ElencoSelezionabile` (titolo e sotto di ogni sezione, attiva
    quella aperta);
  - destra: `Pannello` con il titolo e la nota della sezione e un `<form>` di `Campo` (griglia a
    due colonne, `largo` dove serve);
  - **password**: `tipo="password"`, `autoComplete="new-password"`, valore sempre vuoto e
    `segnaposto` «•••••••• impostata · scrivi per sostituirla» oppure «non impostata», aiuto
    «Lascia vuoto per non cambiarla.»;
  - pulsanti in fondo: `Salva <titolo in minuscolo>` (button `type="submit"` con classe `btn`) e,
    per casella/lettura/posta/integra, `Prova la connessione` (`btn sec`), con la nota «La prova usa
    i valori salvati.»;
  - salvataggio: `api('impostazioni/<chiave>', { metodo: 'PUT', corpo: { valori } })`; i numeri si
    mandano come numeri. Successo: `avviso('Impostazioni salvate')` e ricarica della sezione.
    Errore: `avviso` col messaggio del server.
  - caricamento con **sagome** (D-59): titolo subito, modulo con le sagome finché i dati non
    arrivano.
- **Componenti** (catalogo `app/(app)/componenti/page.tsx` e §16.4):
  - `Campo`: nuovo `tipo="numero"` (`inputMode="decimal"`, `type="number"` con `min`/`max`/`step`
    quando passati) e nuovo `segnaposto`; aggiorna la firma e il catalogo.
- **Barra**: la voce *Impostazioni* c'è già (`sistema.impostazioni`); non toccarla.
- Niente pulsante *Guida* in testata (F5-A8 non l'ha ancora messo in tutte le pagine).

## Documenti

- **Spec** `specifica-crm-provvigioni.md`:
  - versione in testa **8.40**, riassunto;
  - §4.2.14: togli `accesso` dalle chiavi (D-39) e scrivi che il vincolo del database lo ammette
    ancora;
  - §7.15: le sei sezioni, valori iniziali, validazioni, *Prova la connessione* sui valori salvati,
    evento, e dove vengono usate le impostazioni (posta, Integra, conservazione, righe per pagina,
    intestazione delle esportazioni);
  - §7.11/§15.6: le righe per pagina del registro vengono dalle impostazioni (iniziale 25, non più
    50);
  - §8.1: le tre rotte nuove con `sistema.impostazioni`;
  - §15.2: nuova sottosezione per le Impostazioni (`crud/update`, `impostazione`, dettaglio, segreti
    mai);
  - §15.7: `eventi_mesi` dalle Impostazioni;
  - §16.4: `Campo` con `numero` e `segnaposto`;
  - §19: nuova riga **D-65** (D-64 è il bordo del fuoco dei campi) con decisione, perché, Ugo,
    sezioni.
  - Scrivi in UTF-8 **senza BOM**, righe LF: usa lo strumento di modifica, mai `Set-Content` o
    `Out-File`.
- **Guida** `app/frontend/lib/guida.ts`: aggiorna l'argomento *Impostazioni* (i pulsanti veri, le
  sei sezioni, la prova sui valori salvati, i segreti mai riletti).
- **Piano** `piano-lavoro-crm.md`: riga F5-A6 senza «Accesso con Microsoft 365» (D-39), sei sezioni;
  nessuna ora nuova.
- Poi lancia `python strumenti/genera-pagine-doc.py`.
- **Non** toccare `prototipo-alternativo/`: la pagina esiste già ed è la sorgente.
- **Non** toccare `avanzamento-app.md` (lo chiude la sessione principale).

## Regole

- Tutto sul backend, mai dai dati del frontend (V12). Una operazione, una transazione (V13): il
  salvataggio tocca `impostazioni` e `registro`.
- I segreti non si restituiscono, non si registrano, non finiscono nei messaggi d'errore.
- Italiano semplice in codice, commenti e interfaccia; commenti brevi con il rimando
  (`// D-65 §19`).
- Codice minimo (ponytail): riusa i componenti e i pattern esistenti; niente astrazioni o opzioni
  che non servono.
- Database di prova `decobrands_test` per Jest. Per il browser, database di sviluppo e utenti
  `f5-*` di `utenti_prova.js`, poi si tolgono.
- **Non chiudere processi node che non hai avviato tu.** Se 8001/8002 sono occupati da codice
  vecchio, avvia i tuoi (backend 8003, frontend 8012) e chiudi solo i tuoi.
- Niente commit, push, modifiche a `.env`.

## Prove

1. **Backend** (`app/backend`):
   - `npx tsc --noEmit`.
   - `npx jest --runInBand` suite per suite. 0 KO.
   - Nuovo `test/impostazioni.spec.ts` (app Nest + supertest come `registro-api.spec.ts`):
     - 403 per operatore e sola lettura, 200 per amministratore;
     - `GET`: sei sezioni, metadati, password solo `impostata`, nessun valore cifrato nella risposta;
     - `PUT`: salvataggio, valori riletti, password vuota che conserva la precedente, sostituzione,
       campo sconosciuto e ogni limite violato = 400 (porta, minuti, secondi, soglie, righe,
       eventi_mesi), chiave sconosciuta = 404;
     - evento `crud/update`: una riga, `entita='impostazione'`, `prima`/`dopo` coi soli campi
       cambiati, **nessun segreto** nel `dettaglio` (cerca il testo in chiaro);
     - `decifra(cifra(x)) === x`; con un'altra chiave lancia;
     - `casellaConfig`/`postaConfig`/`integraConfig` restituiscono `null` senza connessione e i
       valori decifrati con essa;
     - `righe_pagina` in `GET /api/accesso/io` e in `GET /api/pratiche`/`GET /api/registro`
       (`per_pagina`);
     - `pulisciRegistro` con `eventiMesi` diverso da 36 (un evento `errore` di 20 mesi resta con 36
       e sparisce con 12);
     - `invia` con trasporto finto: riuscito aggiorna `ultimo_invio`; rifiutato scrive l'errore e
       apre `posta.respinta`/`posta.connessione`, senza lanciare;
     - `IntegraService` senza riga `impostazioni.integra` usa `PONTE_URL` (le prove di
       `integra.spec.ts` restano verdi).
   - Aggiorna le prove esistenti che fissano 50 righe nel registro o «Decobrands SRL» negli export,
     se cambiano.
2. **Browser**: avvia backend e frontend; `node ../../strumenti/prove/utenti_prova.js crea f5`;
   scrivi `strumenti/prove/app_impostazioni.py`:
   - `f5-ammi`: apre Impostazioni dalla barra e finisce su `/impostazioni/azienda`; le sei sezioni;
     salva i dati dell'azienda e li ritrova; una password salvata compare come «impostata» e il
     valore non è nel DOM né nelle risposte (`page.on('response')`); un numero fuori limite dà
     l'errore del server; *Prova la connessione* su casella non configurata dà un messaggio chiaro
     e non un 500; 1440 e 768 px, nessun errore JavaScript; ricaricando la pagina la sezione resta;
   - `f5-lett`: *Pagina riservata* e nessuna voce *Impostazioni* nella barra.
   Poi `node ../../strumenti/prove/utenti_prova.js togli`.
3. Schermate a 1440 e 768 px in `%TEMP%\f5-a6` e **guardale**.
4. Chiudi solo i processi che hai avviato tu.

## Resoconto

Scrivi `strumenti/opencode/resoconto-f5-a6.md` con: file toccati, forma delle API, valori iniziali
e validazioni, cifratura e gestione della chiave, come i servizi leggono le impostazioni, prove con
i numeri, percorsi delle schermate, dubbi e cose rimaste aperte (per esempio i segreti delle prove
e la casella reale).
