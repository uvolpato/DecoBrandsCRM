# A7 — Accessibilità e prestazioni (collaudo finale, 08/11/2026)

- **Skill caricate (strumento Skill):** `accessibility`, `performance`, `design:accessibility-review`.
- **Prove lanciate:** nessuna. L'app non è stata avviata (regola: A6 la usa in parallelo, database e porte condivisi). Solo analisi statica di `app/frontend` e `app/backend/src` (prima `graphify query`, poi le righe trovate).
- **Contrasti:** calcolati con la formula WCAG sui token di `app/frontend/app/stile/stile.css`. Non ho controllato i colori nella pagina disegnata (sfondi sovrapposti).
- **Prestazioni:** tutti i rilievi sono **ipotesi** (niente misure). Ognuno dice come misurarlo.
- **Non controllato:** lettore di schermo vero (NVDA); zoom al 200 % disegnato; Lighthouse/axe sulle pagine; `EXPLAIN ANALYZE` sui dati veri; peso reale dei pacchetti (`next build`); pagine Guida, Profilo, Impostazioni e Sistema (solo di passaggio).
- **Già a posto (nessun rilievo):** `lang="it"`; `<main>` e `nav` con etichetta; titolo del documento per pagina; schede (`Schede.tsx`) con frecce, Home, Fine e il tabindex che si sposta; menu utente con frecce ed Esc; `Modale` che dà il fuoco, lo restituisce e con Esc chiude solo la finestra in primo piano; errori dei moduli con `role="alert"`; KPI con `aria-pressed`; icone `aria-hidden`; pulsanti solo icona con `aria-label`; sagome che rispettano `prefers-reduced-motion`. Chart.js finisce solo nelle pagine di Analisi e Liquidazioni (si divide per pagina). PDF.js si carica solo quando serve (`import()`). L'elenco Pratiche ha paginazione e ordinamento sul server.

---

## Accessibilità

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

### A7-04 — Le intestazioni ordinabili della DataTable non si usano da tastiera
- Gravità: P2
- Dove: `app/frontend/componenti/DataTable.tsx:102-111`
- Problema: l'ordinamento sta in `onClick` sul `<th>`, che non si raggiunge con Tab e non risponde a Invio o Spazio (WCAG 2.1.1).
- Scenario: Pratiche da tastiera → non si può ordinare per Importo o Data. Vale per tutte le tabelle (regola §16.4: ordinamento su tutto l'elenco).
- Correzione puntuale: dentro il `th` ordinabile mettere `<button type="button" className="dt-ordina" onClick={…}>{c.header}<span className="freccia" aria-hidden>…</span></button>`. `aria-sort` resta sul `th`. In `stile.css` (del prototipo, poi ricopiato) `.dt-ordina { all: inherit; display: inline-flex; cursor: pointer }` e `:focus-visible` con un bordo interno (D-64).
- Prova che la verifica: `app_pratiche.py`: fuoco sull'intestazione «Importo», Invio → `aria-sort="ascending"` e la richiesta ha `ordina=importo`.
- Esecutore: DeepSeek V4 Flash. Componente e stile.
- File toccati: `app/frontend/componenti/DataTable.tsx`, `prototipo-alternativo/assets/stile.css`, `app/frontend/app/stile/stile.css`
- Dipende da / correlato a: D-64

### A7-05 — Le righe cliccabili non si aprono da tastiera (Pratiche, Clienti, Fornitori, Subagenti, Utenti, Registro)
- Gravità: P2
- Dove: `DataTable.tsx:124-125`; chi la usa: `pratiche/VistaPratiche.tsx:168`, `clienti/VistaClienti.tsx:319`, `fornitori/VistaFornitori.tsx:335`, `subagenti/VistaSubagenti.tsx:409`, `utenti/VistaUtenti.tsx:256`, `registro/VistaRegistro.tsx:217`, `liquidazioni/VistaLiquidazioni.tsx:189`, `analisi/VistaAnalisi.tsx:274`
- Problema: `onRowClick` sta solo sul `<tr>` (niente `tabIndex`, niente tasti), e nelle celle non c'è un link. Chi usa la tastiera **non riesce ad aprire una pratica dall'elenco** (WCAG 2.1.1).
- Scenario: Pratiche → Tab porta ai filtri e alla paginazione, ma nessuna riga riceve il fuoco, quindi `/pratiche/123` non si apre. Anche la selezione del subagente in Liquidazioni e il filtro dalla tabella di Analisi funzionano solo con il mouse.
- Correzione puntuale: in `DataTable`, quando c'è `onRowClick`, sul `tr` mettere `tabIndex={0}` e `onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); onRowClick(r); } }}`, cioè lo stesso schema di `Elenco` in `Flussi.tsx:18-19`. In CSS `.dt tr.cliccabile:focus-visible { outline: 2px solid var(--primario); outline-offset: -2px }`.
- Prova che la verifica: `app_pratiche.py`: Tab fino alla prima riga, Invio → l'URL diventa `/pratiche/<id>`.
- Esecutore: DeepSeek V4 Flash. Un componente e una riga di stile.
- File toccati: `DataTable.tsx`, `prototipo-alternativo/assets/stile.css`, `app/frontend/app/stile/stile.css`
- Dipende da / correlato a: A7-04 (stesso file, stesso pacchetto)

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

### A7-07 — Profilo in sola lettura: i pulsanti «spenti» si premono lo stesso con la tastiera
- Gravità: P2
- Dove: `app/frontend/app/stile/stile.css:626-630` (`body.sola-lettura … { opacity: .4; pointer-events: none }`), `app/(app)/layout.tsx:41`
- Problema: il pulsante è spento solo per il mouse. Riceve ancora il fuoco, Invio lo attiva, e il lettore di schermo lo annuncia come attivo (WCAG 4.1.2). La spec §8.3 vuole i pulsanti spenti.
- Scenario: utente con Provvigioni in lettura → Liquidazioni → Tab su «Chiudi la liquidazione» → Invio → si apre la Conferma → conferma → il server rifiuta (403, V12 regge) e compare l'avviso rosso. L'utente ha seguito un percorso che non doveva esistere.
- Correzione puntuale: in `layout.tsx`, quando `solaLettura`, un `useEffect` che registra su `document` un `addEventListener('click', blocca, true)` in cattura: se `e.target.closest(SELETTORE)` (stesso selettore del CSS) allora `preventDefault()` e `stopPropagation()`. Lo stesso effetto mette `aria-disabled="true"` sugli elementi che corrispondono, con un `MutationObserver` su `#principale`.
- Prova che la verifica: `app_utenti.py` o `app_liquidazioni.py` con un utente in lettura: fuoco sul pulsante, Invio → nessuna richiesta POST e `aria-disabled="true"`.
- Esecutore: DeepSeek V4. Tocca il comportamento dei permessi nel guscio.
- File toccati: `app/frontend/app/(app)/layout.tsx`
- Dipende da / correlato a: D-45, §8.3

### A7-08 — Campo di ricerca (combobox): con le frecce la voce evidenziata non viene annunciata
- Gravità: P2
- Dove: `app/frontend/componenti/CampoRicerca.tsx:99-112` (Multipla), `:162-169` (Singola)
- Problema: l'input è `role="combobox"`, ma mancano `aria-controls` e `aria-activedescendant`, e le opzioni non hanno `id`. Le frecce cambiano solo la classe `.attiva` (WCAG 4.1.2).
- Scenario: nel filtro Fornitore (D-22) l'utente scrive «gr» e preme ↓ due volte. Il lettore di schermo non dice nulla. Con Invio si aggiunge una voce che l'utente non ha sentito.
- Correzione puntuale: `const lid = useId()`; `<ul id={lid} …>`; ogni `li` `id={lid + '-' + i}`; sull'input `aria-controls={lid}` e `aria-activedescendant={aperto && chiavi[attiva] ? lid + '-' + attiva : undefined}`. Lo stesso in `Singola`.
- Prova che la verifica: in `app_componenti.py`, dopo ↓ `aria-activedescendant` punta a un `li` che ha `role=option`.
- Esecutore: DeepSeek V4 Flash. Attributi in un file.
- File toccati: `app/frontend/componenti/CampoRicerca.tsx`
- Dipende da / correlato a: D-22, A7-12

### A7-09 — Contrasti sotto 4.5:1 su testi ricorrenti
- Gravità: P3
- Dove: token in `stile.css:8-31`; selettori sotto
- Problema e scenario: misure calcolate con la formula WCAG (1.4.3 testo, 1.4.11 componenti):

| Elemento | Colore | Sfondo | Rapporto | Serve |
|---|---|---|---|---|
| Sottotitolo pagina `.testa .sotto` (14 px) | `#6c757d` | `#f5f6f8` | 4.34 | 4.5 |
| `--testo-tenue` su `--bordo-tenue` (sagome, celle) | `#6c757d` | `#e9ecef` | 3.95 | 4.5 |
| Link/primario su `--primario-tenue` (riga selezionata) | `#0d6efd` | `#e9f0fd` | 3.93 | 4.5 |
| Nome gruppo barra `.gruppo-nome` (12 px, alfa .45) | `#858789` | `#212529` | 4.28 | 4.5 |
| `--neutro` come testo (`.periodi a.futuro`, `.m-cella.vuota`) | `#adb5bd` | `#fff` | 2.07 | 4.5 |
| Bordo dei campi `--bordo` (1.4.11) | `#dee2e6` | `#fff` | 1.30 | 3 |

- Correzione puntuale: `--testo-tenue: #5c636a`, che arriva a ≥ 4.5 anche su `#e9ecef`. In `.gruppo-nome` alfa .55. In `.periodi a.futuro` e `.m-cella.vuota` il colore diventa `var(--testo-tenue)`. Per i campi, un bordo `#8c959f` solo su `input, select, .ricerca-testo`.
- Prova che la verifica: axe-core in Playwright (`@axe-core/playwright`, regola `color-contrast`) su Oggi, Pratiche, Pratica e Analisi.
- Esecutore: DeepSeek V4 Flash. Solo token CSS.
- File toccati: `prototipo-alternativo/assets/stile.css`, `app/frontend/app/stile/stile.css` (si ricopia)
- Dipende da / correlato a: **D-24** (lo stile è quello del prototipo) → vedi *Da decidere*

### A7-10 — Segmenti con `role="tab"` senza pannello e senza frecce
- Gravità: P3
- Dove: `FilterBar.tsx:330-335`, `ConsultaDocumenti.tsx:133` (`aff-schede role=tablist`; da controllare anche `Solleciti.tsx`)
- Problema: i segmenti sono filtri, non schede. Hanno `role="tablist"` e `role="tab"` ma nessun `tabpanel`, ogni pulsante sta nell'ordine di Tab e le frecce non funzionano. Il lettore di schermo dice «scheda 2 di 5», che non corrisponde a quello che fanno (4.1.2).
- Scenario: Pratiche → il lettore annuncia «Attesa, scheda, selezionata» e l'utente prova le frecce come nelle schede, senza risultato.
- Correzione puntuale: `<div className="segmenti" role="group" aria-label={c.etichetta}>` e sui pulsanti `aria-pressed` al posto di `role="tab"` e `aria-selected`. Lo stile `[aria-selected="true"]` (`stile.css:176`) diventa `[aria-pressed="true"]`. **Ci sono da aggiornare i selettori delle prove**, `.segmenti [role=tab]` usato in 10 file (`app_flusso.py` 12 volte, `app_analisi.py`, `app_pratica.py`, `app_pratiche.py`, …), e la nota in `CLAUDE.md` §4.4.
- Prova che la verifica: tutte le `app_*.py` con i selettori aggiornati, 0 KO.
- Esecutore: DeepSeek V4 Flash. Attributi, stile e selettori, senza logica.
- File toccati: `FilterBar.tsx`, `Solleciti.tsx`, `ConsultaDocumenti.tsx`, i due `stile.css`, le 10 `strumenti/prove/app_*.py`, `CLAUDE.md`
- Dipende da / correlato a: *Da decidere* (CLAUDE.md lo dà per scontato)

### A7-11 — Avvisi: la regione «live» nasce insieme al messaggio, e gli errori non sono `alert`
- Gravità: P3
- Dove: `app/frontend/componenti/Piccoli.tsx:23-35`
- Problema: il `div.avviso role="status"` si crea e si riempie nello stesso momento e sparisce dopo 4,2 s. Molti lettori di schermo non annunciano una regione live appena creata. Gli errori del server (rossi) restano `status` (cortese), non `alert`.
- Scenario: Liquidazioni → «Chiudi» rifiutato dal server → avviso rosso per 4 s. Con NVDA spesso non si sente nulla, e l'utente crede che la chiusura sia andata.
- Correzione puntuale: creare il contenitore una volta sola e lasciarlo vuoto (non `remove()` ma `textContent = ''` e una classe che lo nasconde). Se `errore`, `setAttribute('role', 'alert')`. Gli errori restano 8 s.
- Prova che la verifica: Playwright: dopo un rifiuto, `.avviso[role=alert]` contiene il testo.
- Esecutore: DeepSeek V4 Flash. Un file.
- File toccati: `app/frontend/componenti/Piccoli.tsx`, (stile `.avviso` nascosto quando è vuoto)
- Dipende da / correlato a: —

### A7-12 — Nomi accessibili che mancano: CampoRicerca singola e spunta «verificato»
- Gravità: P3
- Dove: `CampoRicerca.tsx:120,162` (`Singola` non legge `etichetta`, quindi l'input non ha `aria-label`); `VistaDocumento.tsx:509,706` (`span.spunta-verde aria-label` su uno span generico, che non viene letto)
- Scenario: `FilterBar` con un campo `ricerca` non multiplo → lo `span` con l'etichetta non è collegato e l'input è anonimo. La spunta verde dice «Verificato» solo a chi la vede.
- Correzione puntuale: in `Singola` destrutturare `etichetta` e passare `aria-label={etichetta ?? 'Cerca ' + ent.titolo.toLowerCase()}` (come in `Multipla:100`). Sugli span delle spunte aggiungere `role="img"`.
- Prova che la verifica: `get_by_role('combobox', name=…)` in `app_componenti.py`.
- Esecutore: DeepSeek V4 Flash
- File toccati: `CampoRicerca.tsx`, `VistaDocumento.tsx`
- Dipende da / correlato a: A7-08, A7-06

### A7-13 — Evidenziazione della riga del bollettino senza `prefers-reduced-motion`
- Gravità: P3
- Dove: `stile.css:328-329` (`.c-riga.evidenzia { animation: evidenzia-riga 1.6s }`). La pagina d'accesso invece lo rispetta già (`stile.css:975-978`).
- Problema: è un'animazione breve (1,6 s, quindi non viola 2.2.2), ma ignora l'impostazione «riduci movimento», a differenza delle sagome e della pagina d'accesso.
- Scenario: con «riduci movimento» attivo, nel Bollettino il salto a una riga la fa comunque lampeggiare.
- Correzione puntuale: aggiungere `.c-riga.evidenzia` alla regola `@media (prefers-reduced-motion: reduce)` che esiste già, con `animation: none; background: var(--attesa-tenue)`.
- Prova che la verifica: Playwright `emulate_media(reduced_motion='reduce')` → `animationName === 'none'`.
- Esecutore: DeepSeek V4 Flash
- File toccati: i due `stile.css`
- Dipende da / correlato a: D-24

---

## Prestazioni (tutte ipotesi da misurare)

### A7-20 — Ogni cambio di pagina carica tutto il database per i numeri della barra
- Gravità: P2 (ipotesi)
- Dove: `app/frontend/componenti/Barra.tsx:77-91` (si rilegge a ogni `percorso`); `app/backend/src/oggi.ts:268-272` → `caricaDati` (`motore/dati.ts:75-88`)
- Problema: `GET /api/oggi/conteggi` legge **tutte** le pratiche con righe e documenti e tutti i bollettini con le righe, e poi fa passare il motore su tutto (`confermeInRitardo`, `pagamentiDaSollecitare` e un'altra volta `statoPratica` su ogni pratica). Succede a ogni clic nel menu, per ogni utente.
- Scenario: con 3 anni di dati (circa 5.000 pratiche e 15.000 documenti) ogni navigazione legge decine di MB da Postgres in Node. Aprendo Oggi i caricamenti completi sono 2 (pagina e barra); con Liquidazioni 3 (vedi A7-22). Il tempo cresce in modo lineare o peggio (A7-21).
- Correzione puntuale:
  1. Frontend: in `Barra.tsx` le dipendenze dell'effetto diventano `[useEventi().provvigioni]` e non `[percorso]`: si rilegge quando il server segnala un cambiamento, non a ogni pagina.
  2. Backend: in `conteggiBarra` i conteggi `pratiche`/`conferme` si fanno con la stessa SQL dello stato `scaduta` di `pratiche.ts:113-118`, senza `caricaDati`. Solo `pagamenti` resta sul motore, con una cache in memoria che vale finché non cambia `max(registro.id)` (`SELECT max(id) FROM registro`, che costa poco).
- Prova che la verifica: un seme moltiplicato (script che copia 50 volte le pratiche del seme §12 in `decobrands_test`), poi `curl -s -o /dev/null -w '%{time_total}\n' -b cookies.txt http://127.0.0.1:8002/api/oggi/conteggi` prima e dopo. I numeri devono restare quelli di `app_oggi.py` e `app_guscio.py`.
- Esecutore: DeepSeek V4. Backend e frontend insieme, conteggi legati alle regole di stato.
- File toccati: `app/frontend/componenti/Barra.tsx`, `app/backend/src/oggi.ts`
- Dipende da / correlato a: A7-21, A7-22; commento `ponytail:` in `motore/dati.ts:6-7` (debito noto, A8)

### A7-21 — Il motore fa scansioni quadratiche per ogni documento
- Gravità: P2 (ipotesi)
- Dove: `app/backend/src/motore/motore.ts`:
  - `documentoPerId` :129 e `trovaDocumento` :139 scorrono tutte le pratiche;
  - `fatturaDelMese` :150 rifà il filtro su tutte le pratiche a ogni documento;
  - `riconosciutoIn` :198 e `righeBollettinoDi` :201 scorrono tutti i bollettini e tutte le righe;
  - `analisiTrimestre` :409 fa `S.pratiche.find` dentro il ciclo.
- Problema: chi chiama gira su tutti i documenti (`righeLiquidazione` :339, `fattiAnalisi` :431, `pagamentiDaSollecitare` :292), quindi il costo è O(documenti × righe di bollettino) e O(documenti × pratiche).
- Scenario: 15.000 documenti e 20.000 righe di bollettino → `riconosciutoIn` fa circa 3·10⁸ confronti `suDocumento` in un solo `righeLiquidazione`. Il Report subagenti chiama `analisiTrimestre` fino a 7 volte (commento in `liquidazioni.ts:198`): secondi o decine di secondi per richiesta, e il `$transaction` della chiusura ha un limite di 30 s (`liquidazioni.ts:174`).
- Correzione puntuale: in `componi` (`motore/dati.ts`) costruire una volta sola gli indici:
  - `perDocumento: Map<id, {pratica, doc}>`;
  - `perNumero: Map<fornitore|numero, …>`;
  - `bollettiniDi: Map<fornitore_id, Bollettino[]>`;
  - `righeSuDocumento: Map<documento_id, {b, r}[]>` (più quella per numero, se `documento_id` manca);
  - `fattureDi: Map<cliente|fornitore|mese, Documento[]>`;
  - `praticaPerId: Map`.

  Le funzioni sopra leggono gli indici, con la **stessa** semantica e lo stesso ordine (`suDocumento` resta il criterio d'uguaglianza).
- Prova che la verifica: `npm test` (motore, numeri §12 identici); una prova jest nuova `motore-volumi.spec.ts` con Dati sintetici di 5.000 pratiche, che chiede `righeLiquidazione` sotto 1 s.
- Esecutore: DeepSeek V4. Calcoli delle provvigioni: review completa obbligatoria.
- File toccati: `app/backend/src/motore/dati.ts`, `app/backend/src/motore/motore.ts`, `app/backend/test/motore-volumi.spec.ts` (nuovo)
- Dipende da / correlato a: A2 (calcoli), A8 (debito `ponytail:`)

### A7-22 — Oggi si ricarica intero a ogni evento in ogni scheda aperta; Liquidazioni fa 3 caricamenti completi
- Gravità: P2 (ipotesi)
- Dove: `app/frontend/app/(app)/oggi/VistaOggi.tsx:64-79` (a ogni `vEventi` → `GET /api/oggi` → `caricaDati`); `liquidazioni/VistaLiquidazioni.tsx:76,94` (`liquidazioni` e `liquidazione/report` partono insieme, ognuno con `caricaDati`, più la barra)
- Problema: il canale SSE manda un evento per ogni operazione del registro (`eventi.ts:125`, controllo ogni 4 s). Ogni scheda aperta su Oggi risponde con un caricamento completo.
- Scenario: 5 utenti con Oggi aperto e un collega che verifica 20 righe di bollettino in un minuto → fino a 15 eventi ogni 4 s × 5 schede, cioè decine di `caricaDati` al minuto senza che nessuno clicchi. Aprire Liquidazioni Q3 costa 3 caricamenti completi più `analisiTrimestre` ×2–7.
- Correzione puntuale: in `VistaOggi` raggruppare gli eventi, così ne parte una sola rilettura ogni 2 s (un `setTimeout` che riparte a ogni evento). Nel backend un'unica `caricaDati` per richiesta di pagina: `GET /api/oggi` restituisce anche i `conteggi` della barra (la barra li prende da lì quando la pagina è Oggi). In Liquidazioni il report si calcola nella stessa richiesta (`?report=1`), oppure `reportSubagenti` riceve `S` già caricato.
- Prova che la verifica: Playwright con 3 contesti su Oggi e 20 operazioni dal quarto: si contano le richieste `GET /api/oggi` (`page.on('request')`), che devono essere ≤ 3 per contesto.
- Esecutore: DeepSeek V4. Frontend e backend.
- File toccati: `VistaOggi.tsx`, `oggi.ts`, `VistaLiquidazioni.tsx`, `liquidazioni.ts`
- Dipende da / correlato a: A7-20, D-23

### A7-23 — Analisi: ogni clic su un filtro è una richiesta completa, e quelle vecchie non si annullano
- Gravità: P3 (ipotesi)
- Dove: `app/frontend/app/(app)/analisi/VistaAnalisi.tsx:108-121`; `analisi.ts:398-401`
- Problema: ogni cambio di filtro, periodo o raggruppamento esegue subito `caricaDati` + `fattiAnalisi` + `calcola`. Con `vivo = false` si scarta solo la risposta: la richiesta continua sul server.
- Scenario: l'utente clicca 4 barre del grafico in 2 secondi per sceglierne una → 4 caricamenti completi in parallelo, e l'ultimo arriva dopo gli altri tre.
- Correzione puntuale: un ritardo di 250 ms (`setTimeout` nell'effetto, annullato nel cleanup) e `AbortController` passato ad `api()` (se `lib/api.ts` non accetta `signal`, si aggiunge un parametro facoltativo).
- Prova che la verifica: Playwright: 4 clic rapidi su `.grafico canvas` → 1 sola richiesta `analisi?` completata.
- Esecutore: DeepSeek V4 Flash
- File toccati: `VistaAnalisi.tsx`, `lib/api.ts`
- Dipende da / correlato a: A7-21

### A7-24 — Ricerca nelle Pratiche: `ILIKE '%…%'` su quattro colonne, senza indice trigram
- Gravità: P3 (ipotesi)
- Dove: `app/backend/src/pratiche.ts:108-109` (`numero_ordine`, le due `ragione_sociale`, `EXISTS` su `documenti.numero`), CTE calcolata due volte (conteggi e pagina) a ogni ricerca
- Problema: con `%` iniziale gli indici b-tree non servono, quindi si legge tutta la tabella e si fanno due passaggi.
- Scenario: con 50.000 testate e 150.000 documenti, ogni ricerca (già ritardata) scorre tutto due volte.
- Correzione puntuale: migrazione con `CREATE EXTENSION IF NOT EXISTS pg_trgm` e indici `GIN (… gin_trgm_ops)` su `ordini_fornitore_testata.numero_ordine`, `ordini_fornitore_documenti.numero`, `clienti_versioni.ragione_sociale`, `fornitori_versioni.ragione_sociale`.
- Prova che la verifica: `EXPLAIN (ANALYZE, BUFFERS)` della query di `elenco` con `q='gri'` sul seme moltiplicato: Bitmap Index Scan sugli indici trgm.
- Esecutore: DeepSeek V4. Migrazione: onda 0.
- File toccati: `app/backend/prisma/schema.prisma`, nuova migrazione
- Dipende da / correlato a: A3

### A7-25 — `caricaDati` dentro una transazione (incassi) e chiusura della liquidazione da 30 s con lock su tutti i fornitori
- Gravità: P3 (ipotesi)
- Dove: `app/backend/src/incassi.ts:99` (`caricaDati(tx)`); `liquidazioni.ts:149` (`SELECT id FROM fornitori ORDER BY id FOR UPDATE`, poi `caricaDati(tx)`, `timeout: 30_000` a :174)
- Problema: la transazione resta aperta per tutto il caricamento completo. Durante la chiusura nessuno può scrivere sui fornitori, per un tempo che cresce con i dati.
- Scenario: chiusura del trimestre con molti dati: 10–30 s di lock, e chi intanto abbina un documento resta in attesa o va in timeout.
- Correzione puntuale: dipende da A7-21: con il motore indicizzato i tempi scendono. Poi valutare il caricamento limitato al fornitore o al periodo (commento `ponytail:` in `dati.ts:6-7`).
- Prova che la verifica: misurare la durata di `POST /api/liquidazioni/:a/:t/chiudi` sul seme moltiplicato.
- Esecutore: DeepSeek V4
- File toccati: `incassi.ts`, `liquidazioni.ts`, `motore/dati.ts`
- Dipende da / correlato a: A7-21, A3 (V13)

### A7-26 — Il carattere Public Sans è incorporato in base64 nel CSS che blocca la pagina (79 KB)
- Gravità: P3 (ipotesi)
- Dove: `app/frontend/app/stile/public-sans.css` (79 KB, tutti i pesi come `data:` woff2)
- Problema: il base64 si comprime male e il CSS blocca il primo disegno. Si scaricano e si leggono tutti i pesi, anche quelli che la pagina non usa. Con `font-display: swap` dentro un CSS bloccante non serve a niente.
- Scenario: primo accesso dalla VPN lenta → la pagina d'accesso resta bianca finché arrivano ~80 KB di caratteri. Le volte dopo è in cache e cambia poco.
- Correzione puntuale: i `.woff2` diventano file in `public/fonts/` (oppure `next/font/local`) con `@font-face` normali e `<link rel="preload">` del solo peso 400.
- Prova che la verifica: Lighthouse `--only-categories=performance` su `/accesso` prima e dopo (FCP, «render-blocking resources»).
- Esecutore: DeepSeek V4 Flash
- File toccati: `app/frontend/app/stile/public-sans.css`, `app/frontend/app/layout.tsx`, `app/frontend/public/fonts/*`
- Dipende da / correlato a: D-24 (file «copiati dal prototipo senza modifiche») → *Da decidere*

---

## Da decidere (Ugo)

1. **D-24 e i colori (A7-09, A7-26).** `stile.css` e `public-sans.css` sono copiati dal prototipo «senza modifiche». Alzare `--testo-tenue`, i bordi dei campi e l'alfa della barra cambia l'aspetto del prototipo ufficiale. La proposta: si cambia nel prototipo e si ricopia nell'app.
2. **D-44, niente telefono, e lo zoom al 200 % (WCAG 1.4.4 / 1.4.10).** Su uno schermo da 1440 px uno zoom del 200 % dà una finestra larga 720 px. Se il blocco «sotto i 744 px l'app si ferma» si applica alla larghezza CSS, chi ingrandisce il testo viene bloccato. Nel CSS di `app/` non ho trovato il blocco a 744 px: da verificare con A5/A6. La proposta: bloccare in base alla larghezza fisica (`screen.width`) e non alla finestra, oppure accettare l'eccezione per scritto.
3. **Segmenti con `role="tab"` (A7-10).** `CLAUDE.md` §4.4 lo dà per scontato e 10 prove lo usano. Correggerlo vuol dire aggiornare prove e documentazione.
4. **Pagina d'accesso che dopo 2 minuti senza tasti si svuota** (`ScenaAccesso.tsx:13,73-74`, `ATTESA = 2 * 60_000`). Per WCAG 2.2.1 un tempo limite deve potersi allungare. È voluto (sicurezza della postazione, D-89 / D-90?). Se sì, basta scriverlo nel §19.
5. **Contatori della barra a ogni cambio di pagina** (A7-20). Il commento in `Barra.tsx:72` dice «come il prototipo». Passare a «si rilegge all'evento» cambia quando i numeri si aggiornano (D-23): da confermare.
