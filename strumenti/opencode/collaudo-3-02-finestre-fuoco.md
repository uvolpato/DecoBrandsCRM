# Collaudo · Onda 3 · Pacchetto 3-02 — Finestre: Esc e velo non perdono le correzioni, fuoco e trappola, nomi dei campi letti

Data: 08/11/2026 · **Esecutore: DeepSeek V4 Flash** · Gravità del pacchetto: **P2** · Rilievi: A5-15, A7-01, A7-02, A7-03, A7-06, A7-12 · Piano: `strumenti/collaudo/piano-correzioni.md`.

Si lancia **dopo** il commit del lavoro f7 e la chiusura dell'onda precedente. Dipende da: 0b-01 (`collaudo-0b-01-import-integra-documento.md`: rileggi il codice di `VistaDocumento.tsx`, `app_documenti.py`, cambiato dall'onda 0 bis).

## Contesto e regole del progetto

- **Stack**: frontend Next.js 16 + React 19 + TypeScript (`app/frontend`), backend NestJS 11 + Prisma 7 +
  PostgreSQL (`app/backend`, database proprio `decobrands_db`), stile `app/frontend/app/stile/stile.css` copiato dal
  prototipo ufficiale `prototipo-alternativo/` (D-24), Public Sans, niente Bootstrap. Node 24.
- **Leggi prima `CLAUDE.md`** (radice) per intero, poi le righe di `specifica-crm-provvigioni.md` sulle decisioni
  citate nei rilievi (§19, registro D-nn).
- **Prima di leggere codice**: `graphify query "<domanda>"` (grafo in `graphify-out/`), poi solo le righe trovate.
  **Non** lanciare `graphify update .`: altri pacchetti lavorano in parallelo, il grafo lo aggiorna il controllo di fine onda.
- ⚠ **V12 — tutto sul backend**: ogni calcolo (provvigioni, totali, differenze, stati) e ogni operazione sensibile si
  fa sul server dal database; il browser manda solo scelte (id, valori digitati, motivo); il server ricarica,
  ricontrolla, ricalcola e non salva mai un valore calcolato arrivato dal browser.
- ⚠ **V13 — una operazione, una transazione**: se scrivi su più tabelle o più righe legate, una sola
  `prisma.$transaction(async (tx) => …)`, tutto da `tx` (registro compreso); chiusure, verifiche e abbinamenti
  bloccano la riga con `SELECT … FOR UPDATE`; email e lettura dei documenti dopo il commit, il file su disco prima.
- **Italiano** semplice in codice, commenti, messaggi e interfaccia (niente parole inglesi inutili). Nei punti non
  ovvi un commento breve che rimanda alla decisione: `// D-51 §19`, `// V13`.
- Le prove nel browser cercano le schede con `.schede-barra [role=tab]` (anche i segmenti hanno `role=tab`).
- Non c'è telefono (D-44): si prova a 1440 e 768 px.
- I numeri di riga dei report sono del 08/11 mattina: dopo il collaudo è stato committato altro lavoro (f7).
  **Rileggi il codice attuale.** Se un rilievo risulta già corretto, scrivilo nel resoconto e non cambiare nulla.

## Rilievi da correggere (testo dei report del collaudo; i rilievi U* nascono dalle decisioni di Ugo)

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

### A7-01 — Esc nella maschera di ricerca chiude anche «Correggi i dati letti» e fa perdere le correzioni
- Gravità: P2
- Dove: `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx:546-550` (`FinestraCorreggi`); stesso schema in `app/frontend/componenti/ConsultaDocumenti.tsx:~80` (Esc)
- Problema: la finestra affiancata ascolta Esc su `document` senza controllare se c'è sopra un'altra finestra. `Modale` ascolta anche lui su `document`, ed Esc lo ricevono tutti e due.
- Scenario: in Documenti, *Correggi i dati letti* → si correggono numero, data e due righe → nel campo Fornitore F4 apre «Cerca fornitore» (`RicercaEntita` → `Modale`) → Esc → si chiudono la maschera **e** la finestra di correzione, e le modifiche non salvate vanno perse. Succede lo stesso con la `Conferma` aperta sopra *Documenti della pratica*.
- Correzione puntuale: nei due gestori Esc la finestra si chiude solo se è in primo piano, con la stessa regola di `Modale.tsx:27-28`: `const veli = document.querySelectorAll('.velo'); if (veli[veli.length - 1] !== veloRef.current) return;` (serve un `ref` sul `div.velo velo-pieno`). Meglio ancora un solo hook `useFinestra(ref, onChiudi)` esportato da `Modale.tsx` che faccia Esc, fuoco e trappola (vedi A7-02 e A7-03), usato da `Modale`, `FinestraCorreggi` e `ConsultaDocumenti`.
- Prova che la verifica: nuova prova `strumenti/prove/app_documenti.py`: apri la correzione, scrivi nel numero, F4 sul fornitore, Esc → la finestra `.affiancata` resta e il numero scritto c'è ancora.
- Esecutore: DeepSeek V4 Flash. Modifica locale in due file, la stessa regola già scritta in Modale.
- File toccati: `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`, `app/frontend/componenti/ConsultaDocumenti.tsx`, (`app/frontend/componenti/Modale.tsx` se si fa l'hook)
- Dipende da / correlato a: A7-02, A7-03

> **Per questo pacchetto:** Stesso difetto di A5-15 (Esc chiude la correzione): una sola correzione, con l'hook unico `useFinestra` esportato da `Modale.tsx`.

### A7-02 — Le finestre affiancate (Correggi i dati letti, Documenti della pratica) non prendono il fuoco
- Gravità: P2
- Dove: `VistaDocumento.tsx:597-598`, `ConsultaDocumenti.tsx:122-123`
- Problema: `role="dialog" aria-modal="true"`, ma all'apertura il fuoco resta sul pulsante della pagina sotto, Tab gira sulla pagina coperta e alla chiusura il fuoco non torna (WCAG 2.4.3 e 2.1.2).
- Scenario: dalla tastiera, Pratica → clic con Invio su una riga documento → si apre *Documenti della pratica*, ma Tab va ai pulsanti della pagina nascosta dal velo. Il lettore di schermo annuncia una finestra modale e poi legge contenuto che sta fuori.
- Correzione puntuale: usare lo stesso effetto di `Modale.tsx:22-32`: all'apertura il fuoco va al primo campo, o a `.btn-chiudi`; alla chiusura `prima?.focus()`. Più la trappola di A7-03, con l'hook unico.
- Prova che la verifica: in `app_pratica.py` apri *Documenti della pratica* da tastiera → `document.activeElement` è dentro `.affiancata`; Esc → il fuoco torna alla riga o al pulsante di partenza.
- Esecutore: DeepSeek V4 Flash. Componente di interfaccia, schema già presente.
- File toccati: `VistaDocumento.tsx`, `ConsultaDocumenti.tsx`, `Modale.tsx` (hook)
- Dipende da / correlato a: A7-01, A7-03

### A7-03 — `Modale` senza trappola del fuoco: Tab esce dalla finestra
- Gravità: P2
- Dove: `app/frontend/componenti/Modale.tsx:22-32`
- Problema: c'è `aria-modal="true"`, ma non c'è un ciclo di Tab e la pagina sotto non è `inert`. Dopo l'ultimo pulsante Tab passa alla barra e alla pagina coperta (WCAG 2.4.3 e 2.4.11).
- Scenario: *Conferma* «Annullare la fattura …?» → Tab, Tab, Tab → il fuoco va su una voce della barra laterale coperta dal velo, che non si vede (fuoco nascosto). Invio porta a un'altra pagina con la finestra ancora aperta.
- Correzione puntuale: nel `keydown` di `Modale` aggiungere `if (e.key === 'Tab' && primoPiano) {` prendere gli elementi focalizzabili di `f`; se `shiftKey` e sei sul primo vai all'ultimo, se sei sull'ultimo vai al primo; `preventDefault }`. In alternativa, mentre c'è un `.velo`, `inert` su `#principale` e `.barra` (cioè sui fratelli del velo).
- Prova che la verifica: `app_componenti.py`: apri *Finestre* nel catalogo e premi 10 volte Tab → il fuoco resta in `.modale`.
- Esecutore: DeepSeek V4 Flash. Un file.
- File toccati: `app/frontend/componenti/Modale.tsx`
- Dipende da / correlato a: A7-01, A7-02

### A7-06 — Correzione del documento: i campi letti e le celle delle righe non hanno un nome
- Gravità: P2
- Dove: `VistaDocumento.tsx:498-513` (`CampoLetto`: `<label>` senza `htmlFor`, e il campo sta fuori dalla label); `VistaDocumento.tsx:700-704` (input delle righe senza etichetta)
- Problema: il lettore di schermo legge «modifica testo» senza dire Numero, Data o Importo. Le celle delle righe, cioè quantità, prezzo e importo di ogni riga, non hanno un nome. L'incertezza nelle righe si vede solo dal colore (`incerto-errore` / `incerto-attesa`, WCAG 1.4.1).
- Scenario: un operatore con lettore di schermo apre *Correggi i dati letti* di una fattura, va su «Importo» e sente solo «modifica numero 1234,50». Nelle righe non capisce di quale colonna sia il campo né quale cella sia incerta.
- Correzione puntuale:
  - in `CampoLetto` fare `const id = useId()`, `<label htmlFor={id}>` e `{cloneElement(children as ReactElement<{ id?: string }>, { id })}`. `CampoRicerca` passa già `id` all'input di `Singola`;
  - nelle celle `aria-label={NOME_COLONNA[k] + ' riga ' + (idx + 1)}`;
  - se `aff < SOGLIA_OK`, aggiungere `aria-describedby` a uno `span` nascosto «affidabilità NN %», oppure `title`.
- Prova che la verifica: in `app_documenti.py`, `page.get_by_label('Importo')` trova l'input; `get_by_label('Quantità riga 1')` trova la cella.
- Esecutore: DeepSeek V4 Flash. Un file, attributi.
- File toccati: `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`
- Dipende da / correlato a: A7-01, A7-02 (stesso file: stesso pacchetto o onda successiva)

### A7-12 — Nomi accessibili che mancano: CampoRicerca singola e spunta «verificato»
- Gravità: P3
- Dove: `CampoRicerca.tsx:120,162` (`Singola` non legge `etichetta`, quindi l'input non ha `aria-label`); `VistaDocumento.tsx:509,706` (`span.spunta-verde aria-label` su uno span generico, che non viene letto)
- Scenario: `FilterBar` con un campo `ricerca` non multiplo → lo `span` con l'etichetta non è collegato e l'input è anonimo. La spunta verde dice «Verificato» solo a chi la vede.
- Correzione puntuale: in `Singola` destrutturare `etichetta` e passare `aria-label={etichetta ?? 'Cerca ' + ent.titolo.toLowerCase()}` (come in `Multipla:100`). Sugli span delle spunte aggiungere `role="img"`.
- Prova che la verifica: `get_by_role('combobox', name=…)` in `app_componenti.py`.
- Esecutore: DeepSeek V4 Flash
- File toccati: `CampoRicerca.tsx`, `VistaDocumento.tsx`
- Dipende da / correlato a: A7-08, A7-06

> **Per questo pacchetto:** In questo pacchetto **solo** le spunte verdi in `VistaDocumento.tsx` (`role="img"`). La parte di `CampoRicerca.tsx` è in un altro pacchetto.

## File ammessi (solo questi)

- `app/frontend/componenti/Modale.tsx`
- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`
- `app/frontend/componenti/ConsultaDocumenti.tsx`
- `strumenti/prove/app_documenti.py`
- `strumenti/prove/app_pratica.py`
- `strumenti/prove/app_componenti.py`
- `strumenti/opencode/resoconto-collaudo-3-02.md`

## File vietati

Li modificano altri pacchetti della **stessa onda**, in parallelo:

- `app/backend/src/accesso.ts`
- `app/backend/src/app.module.ts`
- `app/backend/src/casella.ts`
- `app/backend/src/documenti.ts`
- `app/backend/src/impostazioni.ts`
- `app/backend/src/liquidazioni.ts`
- `app/backend/src/motore/motore.ts`
- `app/backend/src/oggi.ts`
- `app/backend/test/accesso.spec.ts`
- `app/backend/test/casella.spec.ts`
- `app/backend/test/documenti.spec.ts`
- `app/backend/test/impostazioni.spec.ts`
- `app/backend/test/liquidazioni.spec.ts`
- `app/backend/test/motore.spec.ts`
- `app/backend/test/oggi.spec.ts`
- `app/frontend/app/(app)/[...resto]/page.tsx`
- `app/frontend/app/(app)/bollettini/VistaBollettini.tsx`
- `app/frontend/app/(app)/clienti/VistaClienti.tsx`
- `app/frontend/app/(app)/componenti/page.tsx`
- `app/frontend/app/(app)/documenti/VistaDocumenti.tsx`
- `app/frontend/app/(app)/fornitori/VistaFornitori.tsx`
- `app/frontend/app/(app)/impostazioni/*`
- `app/frontend/app/(app)/liquidazioni/VistaLiquidazioni.tsx`
- `app/frontend/app/(app)/not-found.tsx`
- `app/frontend/app/(app)/oggi/VistaOggi.tsx`
- `app/frontend/app/(app)/pratiche/VistaPratiche.tsx`
- `app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx`
- `app/frontend/app/(app)/registro/VistaRegistro.tsx`
- `app/frontend/app/(app)/subagenti/VistaSubagenti.tsx`
- `app/frontend/app/stile/stile.css`
- `app/frontend/componenti/DataTable.tsx`
- `app/frontend/componenti/FilterBar.tsx`
- `app/frontend/componenti/InCostruzione.tsx`
- `app/frontend/lib/formati.ts`
- `prototipo-alternativo/assets/motore.js`
- `prototipo-alternativo/assets/stile.css`
- `strumenti/prove/app_caricamento.py`
- `strumenti/prove/app_clienti.py`
- `strumenti/prove/app_guscio.py`
- `strumenti/prove/app_impostazioni.py`

Documentazione (la scrive il **pacchetto documentazione** dell'onda, dopo di te: tu metti il testo pronto nel resoconto, sezione *Da documentare*):

- `specifica-crm-provvigioni.md`
- `app/frontend/lib/guida.ts`
- `piano-lavoro-crm.md`
- `PRD-crm-provvigioni.md`
- `prototipo-alternativo/LEGGIMI.md`
- `prototipo-alternativo/assets/guida.js`
- `app/README.md`
- `CLAUDE.md`
- `prototipo-crm/specifica.html`
- `prototipo-crm/preventivo.html`
- `app/backend/prisma/schema.prisma` e `app/backend/prisma/migrations/` (le migrazioni stanno solo nell'onda 0)
- qualsiasi altro file non elencato fra gli ammessi

## Database e prove

Prove da far passare:

- frontend: `cd app/frontend && npx tsc --noEmit` → 0 errori;
- prove nel browser interessate: `app_documenti.py`, `app_pratica.py`, `app_componenti.py`. **Non lanciarle** (porte e cartella `.next` sono condivise con gli altri pacchetti): aggiorna quelle indicate nei rilievi, controlla la sintassi con `python -m py_compile <file>` e scrivi nel resoconto quali vanno lanciate. Le lancia il controllo di fine onda.
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-3-02.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
