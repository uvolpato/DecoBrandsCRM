# Resoconto — connettore di lettura LlamaCloud UE (F6-A2, D-67)

Il connettore è pronto per la chiave API dell'account di prova. Non è ancora collegato alla coda:
schemi per tipo documento, unione righe e `documenti_campi` restano il resto di F6-A2.

## File toccati

- `app/backend/src/lettore.ts` (nuovo): `leggiDocumento`, `leggiConLlamaCloud`, `provaConnettore`,
  mapping `extract_result`/`extract_metadata` → campi con `affidabilita`, `posizione` normalizzata
  e `precisione`.
- `app/backend/src/impostazioni.ts`: sezione `lettura` con `connettore`, `chiave` (segreto),
  `modo`, `progetto`, `indirizzo` e `modello` per il connettore locale, `attesa_s` (300);
  `letturaConfig`; `opzioni` nei metadati dei campi e validazione degli elenchi chiusi.
- `app/backend/src/impostazioni-api.ts`: *Prova la connessione* del server di lettura usa
  `provaConnettore` (LlamaCloud EU) invece di `GET /models`.
- `app/backend/src/lettura-prova.ts` (nuovo) + `npm run lettura:prova`: prova a mano su un file,
  senza coda e senza scritture nel database.
- `app/frontend/app/(app)/impostazioni/VistaImpostazioni.tsx`: le tendine (`select`) nei campi.
- `app/backend/test/lettore.spec.ts` (6 prove) e `test/impostazioni.spec.ts` (chiave cifrata,
  elenchi chiusi, prova senza chiave).
- `specifica-crm-provvigioni.md` 8.42 (§6.5, §6.6, §7.15, D-67), `piano-lavoro-crm.md`,
  `avanzamento-app.md`, `app/README.md`, `app/frontend/lib/guida.ts`.
- `prototipo-crm/specifica.html` rigenerato.

## Come funziona

1. `PUT /api/impostazioni/lettura` salva il **modello scelto** (`connettore`) e i parametri di quel
   modello: `llamacloud_chiave` (cifrata), `llamacloud_modo`, `llamacloud_progetto`,
   `llamacloud_attesa_s` oppure `locale_indirizzo`, `locale_modello`, `locale_attesa_s`; le soglie
   sono comuni. La pagina mostra solo i campi del modello scelto (`gruppo`) e salva solo quelli:
   un salvataggio del modello locale non azzera la chiave del cloud.
2. `leggiDocumento` sceglie il ramo dal modello: con `llamacloud_eu` carica il file su
   `https://api.cloud.eu.llamaindex.ai` (`/api/v1/beta/files`, `purpose=extract`), prende il primo
   progetto (o quello indicato) e avvia l'estrazione (`/api/v2/extract`, `version 2.5`, `agentic`,
   `cite_sources`, `confidence_scores`). Con `glm_ocr_locale` risponde che il connettore non è
   ancora disponibile.
3. Aspetta fino a `attesa_s` (poll ogni 2 s), legge `extract_result` e
   `extract_metadata.field_metadata.document_metadata`, e restituisce:
   - `campo`: percorso nello schema (es. `righe[0].prezzo`);
   - `valore`: testo;
   - `affidabilita`: `confidence` 0–1 del fornitore;
   - `posizione`: `{tipo:'pdf', pagina, x0, y0, x1, y1}` normalizzata da `bounding_boxes` e
     `page_dimensions`;
   - `precisione`: `esatta` se c'è il riquadro, altrimenti `assente`.
4. In `finally` cancella il file dal cloud (`DELETE /api/v1/beta/files/{id}`). Se la cancellazione
   fallisce la lettura non fallisce.

## Sicurezza

- La chiave è cifrata a riposo, non esce mai dalle API (solo `impostata`) e non finisce nei log.
- **L'indirizzo di LlamaCloud è fisso nel server** (`letturaConfig` ignora il campo `indirizzo`):
  la chiave non può essere mandata a un indirizzo scelto dall'utente. `indirizzo` e `modello`
  restano solo per il connettore locale futuro.
- La chiave non compare nei messaggi d'errore né nei risultati delle prove.
- Il file si cancella dopo la lettura. Il job e i risultati possono restare secondo la retention
  di LlamaCloud: da verificare nei termini dell'account.

## Prove

- `npx tsc --noEmit` backend e frontend: 0 errori.
- Jest: **380 test, 29 suite, 0 KO** (in tre gruppi, per memoria): `lettore.spec.ts` 6,
  `impostazioni.spec.ts` 16.
- `test/lettore.spec.ts` usa un `fetch` finto: sequenza file → progetto → estrazione → campi,
  confidenza e riquadro, cancellazione del file, errore HTTP, job fallito, timeout, prova del
  connettore.

## Come provarlo

1. In `app/backend/.env`: `SEGRETI_CHIAVE=<stringa lunga e casuale>`.
2. Accedi come amministratore → *Impostazioni* → *Server di lettura*: incolla la chiave API
   dell'account EU, salva, *Prova la connessione*.
3. Da `app/backend/`, dopo `npm run build`:
   `npm run lettura:prova -- "C:\...\fattura.pdf"`.
   Stampa campi, affidabilità, pagina e crediti usati.

## Cose rimaste aperte

- Il connettore non è ancora usato dalla coda: manca il collegamento `prelevaDocumento` →
  `leggiDocumento` → `documenti_campi`, con gli schemi per tipo documento e l'unione delle righe
  multipagina (resto di F6-A2).
- Il connettore locale GLM-OCR/vLLM è previsto dallo stesso seam, non implementato: si accende
  quando arriva la macchina.
- Se l'account ha più di un progetto, indicare `progetto`; il caricamento del file usa il progetto
  predefinito dell'account (con un solo progetto è lo stesso).
- La retention del job/risultati su LlamaCloud e il DPA del piano gratuito vanno verificati
  nell'account prima di usarlo sui documenti veri.
