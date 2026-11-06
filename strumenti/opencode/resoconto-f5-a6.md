# Resoconto — F5-A6 Impostazioni

Attività completata su `HEAD` (F5-A2) senza commit/push. Spec portata a **8.40**, decisione **D-65**.

## File toccati

**Backend (nuovi):**
- `app/backend/src/segreto.ts` — `cifra`/`decifra` con AES-256-GCM (chiave = SHA-256 di `SEGRETI_CHIAVE`), formato `v1:<iv>:<tag>:<dati>`.
- `app/backend/src/impostazioni.ts` — metadati delle sei sezioni, valori iniziali, validazione (`applica`), letture per i servizi (`casellaConfig`, `postaConfig`, `integraConfig`, `letturaConfig`, `righePagina`, `ragioneSociale`), `sezionePubblica`.
- `app/backend/src/impostazioni-api.ts` — controller `ImpostazioniController` (`GET /api/impostazioni`, `PUT /api/impostazioni/:chiave`, `POST /api/impostazioni/:chiave/prova`), permesso `sistema.impostazioni`.
- `app/backend/test/impostazioni.spec.ts` — 15 prove (supertest + Prisma su `decobrands_test`).

**Backend (modificati):**
- `app.module.ts` — registra `ImpostazioniController`.
- `accesso.ts` — `io()` diventa async e aggiunge `righe_pagina`.
- `posta.ts` — `invia()` legge `postaConfig`, manda con nodemailer (`secure` sulla 465), apre `posta.respinta`/`posta.connessione`, esporta `creaTrasporto`, accetta un trasporto finto.
- `integra.ts` — `IntegraService` legge `integraConfig` a ogni giro (pool ricreato solo se la configurazione cambia), schema dalla configurazione, tick di 60 s ma giro solo dopo `secondi`; `leggi`/`sincronizzaGiro` accettano lo schema.
- `registro.ts` — `pulisciRegistro(db, ora, eventiMesi = 36)`.
- `registro-api.ts` — `per_pagina` da `righePagina` (via il 50 fisso), riferimento `impostazione` → `/impostazioni/<chiave>`, `PuliziaRegistro` legge `conservazione.eventi_mesi`.
- `pratiche.ts` — `perPagina` predefinito da `righePagina`.
- `esporta-liquidazione.ts`, `analisi.ts` — intestazione (riga di contesto e piede) da `ragioneSociale(db)`.
- `.env.example` — `SEGRETI_CHIAVE=CAMBIARE` con il commento (`openssl rand -base64 48`).
- `package.json`/`package-lock.json` — `nodemailer`, `@types/nodemailer` (dev), `imapflow`.
- Test aggiornati: `registro-api.spec.ts` (25 righe invece di 50), `liquidazioni.spec.ts` (piede con P.IVA).

**Frontend:**
- `app/(app)/impostazioni/page.tsx` — redirect a `/impostazioni/azienda`.
- `app/(app)/impostazioni/[sezione]/page.tsx` — client, renderizza `VistaImpostazioni`.
- `app/(app)/impostazioni/VistaImpostazioni.tsx` — nuova pagina (sezioni a sinistra, modulo a destra, sagome).
- `componenti/Campo.tsx` — nuovo `tipo="numero"` (con `min`/`max`/`step`) e `segnaposto`; `tipo="email"`.
- `componenti/DataTable.tsx` — `perPagina` predefinito da `useUtente().righe_pagina`.
- `lib/api.ts` — `Io.righe_pagina`.
- `lib/guida.ts` — argomento *Impostazioni* aggiornato.
- `app/(app)/componenti/page.tsx` — firma del `Campo` nel catalogo.

**Documenti:**
- `specifica-crm-provvigioni.md` — versione 8.40, §4.2.14, §7.15, §7.11/§15.6, §8.1, §15.2.8, §15.7, §16.4, riga D-65.
- `piano-lavoro-crm.md` — riga F5-A6 (sei sezioni, niente Microsoft 365).
- `prototipo-crm/specifica.html` — rigenerato da `genera-pagine-doc.py`.

## Forma delle API

- `GET /api/impostazioni` → `{ sezioni: [{ chiave, titolo, sotto, campi: [{ nome, etichetta, tipo (testo|numero|email|password), aiuto, largo, min, max, step, valore, impostata? }] }] }`, ordine fisso `azienda, casella, lettura, posta, integra, conservazione`. I segreti: `{ valore: null, impostata }`.
- `PUT /api/impostazioni/:chiave` corpo `{ valori: { campo: valore } }` → in una transazione upsert + evento `crud/update` su `impostazione` (`entita_id` NULL, dettaglio `{etichetta, chiave, prima, dopo}` coi soli campi cambiati, password `impostata`/`non impostata`/`sostituita`); 400 campo sconosciuto o limite violato, 404 chiave sconosciuta. Risponde la sezione pubblica.
- `POST /api/impostazioni/:chiave/prova` → `{ ok, ms, testo }` sui valori salvati; casella (imapflow), posta (nodemailer `verify()`), lettura (`GET /models`, timeout 10 s), integra (pool in sola lettura); prova fallita = `200 {ok:false}`, `azienda`/`conservazione` = 400; nessun evento.

## Valori iniziali e validazioni

- Iniziali: azienda, lettura (0,90/0,70, attesa 120, modello `zai-org/GLM-OCR`) e conservazione (36/90/25) come nel prototipo; `lettura.indirizzo` e i campi di connessione di casella/posta/integra **vuoti**; `schema` `crm_viste`, `minuti` 2, `secondi` 60.
- Validazione sul server: numeri interi nei limiti (porta 1–65535, minuti 1–60, secondi 10–3600, attesa 1–600, soglie 0–1, eventi_mesi 12–120, scartati_giorni 1–3650, righe 5–200), `0 < soglia_bassa < soglia_ok ≤ 1`, `eventi_mesi ≥ 12`, email con `@`, testi obbligatori (ragione sociale, P.IVA, email); password vuota = resta quella di prima; campi sconosciuti = 400; l'errore dice campo e limite, mai il valore.

## Cifratura e chiave

- AES-256-GCM, IV casuale 12 byte, chiave = SHA-256 di `SEGRETI_CHIAVE`. `decifra` lancia con chiave diversa o formato ignoto e non restituisce mai il cifrato; i config dei servizi trattano un segreto non decifrabile (seed `true` o chiave cambiata) come "non impostato" e restituiscono `null`. `SEGRETI_CHIAVE` assente: `cifra`/`decifra` lanciano; le sezioni senza segreti si salvano comunque. Aggiunto a `.env.example`.

## Come i servizi leggono le impostazioni

- **Posta** (`posta.ts`): `invia()` con server configurato manda con nodemailer, altrimenti log di sviluppo; in ogni caso aggiorna `utenti.ultimo_invio`; fallimento → anomalia `posta.respinta` (chiave = indirizzo se destinatario rifiutato, codici 550/551/553) o `posta.connessione`; al primo invio riuscito chiude le anomalie dell'indirizzo; non lancia mai.
- **Integra** (`integra.ts`): `connessione()` legge `integraConfig` a ogni giro, costruisce `postgresql://utente:password@server:5432/database` (encodeURIComponent) e usa lo `schema`; pool ricreato solo quando cambia l'URL; senza configurazione usa `PONTE_URL`; tick 60 s ma giro solo dopo `secondi` (in memoria, giro subito al riavvio).
- **Conservazione** (`registro-api.ts`): `PuliziaRegistro` legge `conservazione.eventi_mesi` prima di `pulisciRegistro`.
- **Righe per pagina**: `io()` → `righe_pagina`, `pratiche` e `registro` usano `righePagina` come predefinito, `DataTable` usa `useUtente().righe_pagina`.
- **Esportazioni** (`esporta-liquidazione.ts`, `analisi.ts`): intestazione da `ragioneSociale` (ragione sociale, P.IVA, indirizzo, email).

## Prove (numeri)

- Backend `npx tsc --noEmit`: **0 errori** (backend e frontend).
- `npx jest --runInBand`: **0 KO** su tutta la suite (25 suite, 361 test dopo la correzione di `sincronizza` per l'inCorso prima dell'await). Nuovo `impostazioni.spec.ts`: **15/15**.
- Browser `strumenti/prove/app_impostazioni.py` (Playwright, backend 8003 + frontend 8012 con `BACKEND_URL` a 8003): **17/17, 0 KO**, nessun errore JavaScript, 1440 e 768 px.
- Schermate in `%TEMP%\f5-a6\`: `app-impostazioni-1440.png`, `app-impostazioni-768.png` (non ispezionabili a vista da questo modello, che non legge immagini: il controllo visivo è demandato alla prova e al confronto con `VistaGuida`/`VistaUtenti`, stessi componenti).

## Cose rimaste aperte

- **Segreti delle prove**: il browser test salva una password fittizia nella casella (`SEGRETA-PROVA-E2E`) e i test Jest usano `SEGRETI_CHIAVE` di prova; dopo le prove ho riportato `impostazioni` al valore del seed con uno script temporaneo (poi rimosso). La **casella reale** (imapflow) e il **database ponte reale** non sono stati provati: servono gli indirizzi veri, non presenti in sviluppo.
- **`secondi_giacenze`**: il seed la contiene ancora (ampliamento vendita spento, D-08); la sezione non la espone e il servizio la ignora.
- **`accesso`**: la chiave resta ammessa dal vincolo `impostazioni_chiave_check` ma non si usa più (D-39), come da consegna.
- Il processo `nest start --watch` sulla 8002 (non mio) ha ricaricato il codice nuovo senza `SEGRETI_CHIAVE`: per le prove ho usato un backend mio sulla 8003 con la chiave in ambiente e un frontend mio sulla 8012 che inoltra a 8003 (`BACKEND_URL` va impostato **prima del build**, perché la riscrittura di Next è valutata in build). Non ho toccato né chiuso i processi altrui.
