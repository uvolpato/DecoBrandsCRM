# Resoconto F6-A4b — Pagina Documenti e finestra di correzione

Data: 06/11/2026. Seconda metà di F6-A4 (frontend, guida, prova browser, documentazione).
**Nessun file del backend è stato cambiato** e non è stata fatta alcuna migrazione.

## File toccati

- `app/frontend/app/(app)/documenti/layout.tsx`, `page.tsx`, `VistaDocumenti.tsx` (nuovi):
  elenco e caricamento.
- `app/frontend/app/(app)/documenti/[id]/page.tsx`, `VistaDocumento.tsx` (nuovi):
  dettaglio, azioni e finestra *Correggi i dati letti*.
- `app/frontend/lib/guida.ts`: argomento **Documenti** aggiornato all'app (caricamento,
  elenco, dettaglio, correzione, abbina, apri la pratica, registra e verifica, scarta;
  D-06 e Excel rifiutato).
- `strumenti/prove/app_documenti.py` (nuovo): prova browser.
- `strumenti/prove/documenti_prova.js` (nuovo): crea/toglie il documento di prova nel
  database di sviluppo e il PDF in `DOCUMENTI_DIR`.
- `specifica-crm-provvigioni.md`: versione **8.49**, §6.5 punto 7, §7.9 *Nell'app
  (F6-A4b)*, D-73 in §19.
- `piano-lavoro-crm.md`: riga F6-A4b aggiornata (2 ore invariate).
- `prototipo-crm/specifica.html`: rigenerata con `python strumenti/genera-pagine-doc.py`.
- `strumenti/opencode/resoconto-f6-a4b.md`: questo file.

Nessun commit, nessun push, `.env` non toccato.

## Cosa fa la pagina

### `/documenti`
- In alto l'area di caricamento (`Caricamento`): PDF e foto, `caricaPdf`; un documento
  caricato avvisa *Documento caricato: la lettura parte da sola* e ricarica l'elenco.
  Gli Excel non si accettano (D-60).
- Segmenti *Da controllare · In coda · In lettura · Errore* con i `conteggi` del server
  sugli altri filtri (D-23), ricerca (`q`), tipo e livello, paginazione sul server.
- Colonne: documento (tipo + numero, o il file quando non c'è ancora una lettura),
  fornitore, data, importo, livello (giallo/rosso), controlli falliti, ricevuto.
  Una riga senza dati letti non mostra numeri finti (`—`).
- Se non c'è nulla: *Nessun documento da controllare* e le quattro righe di spiegazione
  (carica, lettura, controlla, abbina).
- In sola lettura l'area di caricamento non compare.

### `/documenti/:id`
- Testata: tipo, numero, fornitore (o *non riconosciuto*), data, codice cliente con il
  cliente trovato o *non trovato fra i clienti*, importo (per il bollettino mese e
  totale), file.
- Due schede (D-15): **l'azione proposta** (*Pratica proposta* · *Nuova pratica* ·
  *Scegli la pratica* · *Cosa farne*) con i candidati, i motivi, il delta e *Abbina a …*,
  più *Abbina a un'altra pratica* con la ricerca del fornitore; **Righe lette** con il
  contatore delle righe incerte e la tabella.
- Pulsanti, solo con `provvigioni.modifica`: *Correggi i dati letti* (conta i punti da
  controllare, rosso se `livello = bassa`) e *Scarta il documento* (motivo e nota).
- PDF o foto originali in un pannello affiancato (`<object>` / `<img>`).
- Ordine → *Apri la pratica* con cliente e fornitore precompilati dal codice
  riconosciuto; se mancano, campi di ricerca.
- Bollettino → *Registra e verifica* con `POST /api/bollettini` e `arrivo_id`; se
  `bollettino.esiste` è vero avvisa e linka il mese già registrato.
- Nota di credito: la fattura stornata si cerca con `riferimento_fattura` fra i documenti
  della pratica; se non c'è si sceglie da una finestra, senza inventare.
- Con lettura bassa le azioni chiedono conferma. Dopo abbinamento o scarto si torna
  all'elenco (o alla pratica nuova) e i contatori si ricaricano.

### Finestra *Correggi i dati letti*
- A tutto schermo con le classi esistenti `.velo.velo-pieno`, `.affiancata`, `.aff-corpo`,
  `.aff-sx`, `.aff-dx`, `.griglia-letti`, `.tab-righe`. A sinistra il file vero, a destra
  testata e righe; sotto gli 860 px si impilano (solo CSS, D-58).
- Bordi giallo/rosso con la percentuale; verde quando il campo è confermato. Le soglie
  sono **0,90/0,70 fissi nel browser** (scelta dichiarata: il dettaglio non riceve le
  soglie delle Impostazioni; il livello mostrato resta quello del server).
- Selezionando un campo il PDF si apre alla pagina (`#page=N`) e sotto compare
  *Posizione: pagina N (esatta / approssimata / assente)*. **Il rettangolo sul valore non
  si disegna**: dipende da D-06/F0-A7; la nota è visibile nella finestra.
- Righe: modifica, *Aggiungi riga* (ultima riga vuota), elimina con ✕; le righe esistenti
  conservano `i`, quelle nuove vanno con `i: null`.
- *Salva e ricalcola l’abbinamento* → `PUT /api/documenti/:id`, poi ricarica il dettaglio e
  dice quanti punti restano. *Annulla* chiude senza salvare.

## API usate

Nessuna rotta nuova: `GET /api/documenti`, `GET /api/documenti/:id`,
`PUT /api/documenti/:id`, `POST /api/documenti/:id/scarta`,
`POST /api/documenti/:id/abbina`, `POST /api/documenti/carica`,
`GET /api/documenti/:id/file`, `GET /api/bollettini`, `POST /api/bollettini`,
`GET /api/pratiche/cerca`, `GET /api/pratiche/:id/documenti`.
Il browser manda solo scelte e valori digitati; proposta, controlli, livello e
validazioni restano sul server (V12).

## Prove e numeri

- `cd app/frontend && npx tsc --noEmit`: pulito.
- `cd app/frontend && npm run build`: compilato, 19 pagine, incluse `/documenti` e
  `/documenti/[id]`.
- `cd app/backend && npx tsc --noEmit`: pulito (backend non toccato).
- `python strumenti/prove/app_documenti.py f6chk strumenti/prove/schermate-f6a4b`:
  **27 controlli, 0 KO**, nessun errore della pagina.
  Copre: accesso, elenco con il documento e il livello, dettaglio con testata e due
  schede, PDF, apertura della correzione, bordi giallo/rosso, modifica del numero e
  dell'importo, aggiunta di una riga, salvataggio (il livello passa ad *Affidabile*),
  ritorno all'elenco, 768 px senza sfondamento (elenco, dettaglio, correzione impilata),
  scarto, sola lettura senza pulsanti di modifica.
- `npm test` del backend non eseguito: nessun file del backend è stato toccato.

## Schermate guardate

In `strumenti/prove/schermate-f6a4b/`:

- `app-documenti-1440.png`: elenco.
- `app-documento-1440.png`: dettaglio (testata, schede, PDF).
- `app-documenti-correggi-1440.png`: finestra di correzione con bordi giallo/rosso e
  riga aggiunta.
- `app-documenti-768.png`, `app-documento-768.png`, `app-documenti-correggi-768.png`:
  stesse viste a 768 px, impilate e senza sfondamento della pagina.

La barra nera con il cerchio «N» in basso nelle schermate è l'indicatore di Next in
sviluppo; non fa parte dell'app. Il PDF nelle schermate headless mostra il ripiego
*Il browser non mostra il PDF qui*; in un browser normale il PDF si vede.

## Cosa funziona sui documenti reali e cosa no

- **Funziona davvero**: elenco, dettaglio, correzione e scarto leggono e scrivono il
  database vero con le rotte di F6-A4a; i PDF veri si aprono dal percorso salvato;
  la correzione cambia i valori finali e il server ricalcola livello, controlli e
  proposta. La prova crea un documento con le chiavi vere dei campi (`righe[0].codice`,
  …), non con i dati finti del prototipo.
- **Non provato su un PDF letto da GLM-OCR/LlamaCloud**: la prova costruisce il documento
  a mano; il giro completo di lettura resta il collaudo di F6-A5 e delle prove E2E.
- **Dati del seed**: i documenti del seed usano ancora le chiavi del prototipo
  (`righe.2.qta`, …) mentre il backend di F6-A2 legge `righe[i].quantita`; per questo i
  documenti del seed compaiono in elenco ma senza numero/importo/righe. È un limite del
  seed, non della pagina; il seed non è stato toccato (fuori dal perimetro di questa
  consegna).
- **Evidenziazione (D-06)**: non implementata, come richiesto. La finestra apre il PDF
  alla pagina e mostra la precisione, ma non disegna il rettangolo finché F0-A7 non la
  conferma.
- **Soglie dei bordi**: 0,90/0,70 fissi nel browser; se le Impostazioni cambiano le
  soglie, i bordi della finestra non le seguono. Il livello del documento invece viene
  dal server. Da spostare nel dettaglio quando il server manderà le soglie.

## Dubbi e cose aperte

- **Fattura stornata**: la consegna diceva `GET /api/pratiche/:id`, ma il dettaglio della
  pratica non espone gli id dei documenti fiscali. Ho usato `GET
  /api/pratiche/:id/documenti` (rotta già esistente di F2-A3), che li espone con numero,
  data e tipo. Nessuna modifica al server.
- **Divisore trascinabile** della finestra: non implementato (non era nella consegna);
  i due lati hanno larghezza fissa e si impilano sotto gli 860 px.
- **`n` punti da controllare nel dettaglio**: il server dà `livello` e `controlli`, ma non
  il numero totale dei campi incerti; la pagina lo compone per mostrarlo (con le soglie
  fisse) senza salvarlo. È solo visualizzazione.
- **Elenco**: il numero nella colonna *Controlli* è `controlli_n` del server (controlli
  falliti), non il totale dei campi incerti. Il dettaglio mostra il totale dei punti.
- **PDF nelle prove headless**: Chromium headless non disegna il PDF; il ripiego è
  mostrato e la prova verifica la presenza di `<object>`, non il contenuto.
