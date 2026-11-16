# Resoconto — `visualizzatore-zoom`

## Diagnosi: posizioni dei campi sui documenti immagine

Domanda del pacchetto: per i documenti immagine la lettura salva le posizioni dei campi nella stessa
forma dei PDF? Il frontend le usa?

- **Il lettore salva le posizioni in modo uniforme, senza distinguere PDF e foto.** `lettore.ts`
  (`posizioneDi`) ricava la posizione dalla citazione di LlamaCloud (`bounding_boxes` +
  `page_dimensions`) e produce sempre `{ tipo: 'pdf', pagina, x0, y0, x1, y1 }` normalizzati 0–1,
  qualunque sia il file. `lettura.ts` (`salva`) le scrive in `documenti_campi.posizione` (JSONB).
- **Verifica in sola lettura su `decobrands_db`** (query di sola SELECT, `DATABASE_URL` ricavato con
  `grep` da `.env`, mai letto per intero): i campi dei documenti immagine hanno la posizione —
  `5` righe campo su documenti `jpg/png`, `5` con `posizione` valorizzata; un campione mostra
  `{ tipo: "pdf", pagina: 1, x0, y0, x1, y1 }`, identiche a quelle dei PDF.
- **Il frontend non le usava**: `FileDocumento` mostrava una semplice `<img>` per le foto e
  ignorava la posizione. Non serviva nessuna correzione al lettore, mancava solo il disegno.

Conclusione: **le posizioni ci sono, mancava solo il riquadro sulle immagini**. Nessuna correzione al
lettore (`lettore.ts`/`lettura.ts`).

## File toccati

- `app/frontend/componenti/PdfEvidenziato.tsx` — un solo visualizzatore per PDF e foto: riquadro del
  valore su entrambi, ingrandimento (− / % / + / Adatta), Ctrl+rotella verso il puntatore, trascinamento
  quando si è ingranditi, doppio clic = Adatta, nota «Posizione del campo non disponibile per questo
  documento». Il PDF si ridisegna alla nuova scala (niente sfocato). Conservata la gestione errori e
  sagoma di `pdf-errore-visibile` (tentativo in più, Riprova, Apri il PDF, sagoma D-59).
- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx` — `FileDocumento` ora passa `tipo` e
  `mancaPosizione` al visualizzatore unico (via la `<img>` separata); `FinestraCorreggi` calcola
  `mancaPosizione` e aggiorna il testo sotto il documento.
- `app/frontend/componenti/Icona.tsx` — aggiunta l'icona `meno`.
- `app/frontend/app/stile/stile.css` — aggiunte in fondo `.zoom-barra`, `.zoom-btn`, `.zoom-pct`,
  `.visualizzatore-nota` (nomi controllati con `grep`, non esistevano).
- `app/frontend/lib/guida.ts` — aggiornata la finestra «Correggi i dati letti» (Posizione,
  Ingorandimento, Posizione non disponibile).

## Prove

- `npx --prefix app/frontend tsc --noEmit -p app/frontend/tsconfig.json`: **0 errori**.
- Prove nel browser non lanciate (regole dell'onda): le esegue Claude Code a fine onda.

## Correzione 1 — race sul ridisegno del PDF

Errore «Cannot use the same canvas during multiple render() operations» (pdf.js): nasceva perché il
ridisegno alla nuova scala (zoom, `ResizeObserver`, cambio documento) partiva mentre un `render()` sul
stesso canvas era ancora in corso. Corretto alla radice in `PdfEvidenziato.tsx`:

- `renderRef` tiene il `RenderTask` per pagina; prima di ridisegnare si chiama `cancel()` sul
  precedente e si attende `task.promise` (in `try/catch`, l'annullamento si ignora).
- Il cleanup dell'effetto annulla tutti i task in corso.
- Lo zoom continuo non lancia un render a ogni scatto: un solo ridisegno (`zoomNetto`) dopo che lo zoom
  si ferma (~150 ms); nel frattempo il CSS scala il contenuto.
- Errori di annullamento (e di render) mai mostrati come errore né come «Non riesco a mostrare il PDF».


## Da documentare

- Registrare una decisione (§19): il riquadro del valore si disegna anche sulle foto quando il lettore
  dà la posizione (già salvata dal cloud); se la posizione manca, sopra il visualizzatore compare la
  nota «Posizione del campo non disponibile per questo documento» (anche per i PDF), invece del nulla.
- Registrare (§16.4 / guida) il nuovo comportamento del visualizzatore: ingrandimento con −/+/Adatta,
  Ctrl+rotella verso il puntatore, trascinamento a documento ingrandito, doppio clic = Adatta, riquadro
  che segue zoom e spostamento, ripresa da «Adatta» al cambio documento.
- Da verificare in collaudo: con GLM-OCR locale e con documenti scansionati/fotografati la posizione può
  mancare (resta la nota esistente in guida a proposito della precisione «assente»).
