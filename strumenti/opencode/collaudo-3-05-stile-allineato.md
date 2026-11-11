# Collaudo · Onda 3 · Pacchetto 3-05 — I due stile.css uguali; evidenziazione con «riduci movimento»

Data: 08/11/2026 · **Esecutore: DeepSeek V4 Flash** · Gravità del pacchetto: **P2** · Rilievi: A5-21, A8-04, A7-13 · Piano: `strumenti/collaudo/piano-correzioni.md`.

Si lancia **dopo** il commit del lavoro f7 e la chiusura dell'onda precedente. Dipende da: 0b-05 (`collaudo-0b-05-cerca-integra-clienti.md`: rileggi il codice di `stile.css`, cambiato dall'onda 0 bis).

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

> **Per questo pacchetto:** Stesso rilievo di A5-21: i due file devono **coincidere**. Unione delle differenze: `.tappa { min-width: 0 }` anche nell'app, le regole `.tab-righe tfoot td` e `.aff-dx .tab-righe-box` anche nel prototipo; una sola `.testo-attesa`. Le classi «senza uso» si tolgono da **tutti e due** solo dopo un `grep` in `app/frontend` **e** in `prototipo-alternativo`. Quale file sarà la fonte unica in futuro lo decide Ugo (U16): non cambiare D-24.

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

**Nota del pacchetto.** Controllo finale: `diff app/frontend/app/stile/stile.css prototipo-alternativo/assets/stile.css` vuoto.

## File ammessi (solo questi)

- `app/frontend/app/stile/stile.css`
- `prototipo-alternativo/assets/stile.css`
- `strumenti/opencode/resoconto-collaudo-3-05.md`

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
- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`
- `app/frontend/app/(app)/fornitori/VistaFornitori.tsx`
- `app/frontend/app/(app)/impostazioni/*`
- `app/frontend/app/(app)/liquidazioni/VistaLiquidazioni.tsx`
- `app/frontend/app/(app)/not-found.tsx`
- `app/frontend/app/(app)/oggi/VistaOggi.tsx`
- `app/frontend/app/(app)/pratiche/VistaPratiche.tsx`
- `app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx`
- `app/frontend/app/(app)/registro/VistaRegistro.tsx`
- `app/frontend/app/(app)/subagenti/VistaSubagenti.tsx`
- `app/frontend/componenti/ConsultaDocumenti.tsx`
- `app/frontend/componenti/DataTable.tsx`
- `app/frontend/componenti/FilterBar.tsx`
- `app/frontend/componenti/InCostruzione.tsx`
- `app/frontend/componenti/Modale.tsx`
- `app/frontend/lib/formati.ts`
- `prototipo-alternativo/assets/motore.js`
- `strumenti/prove/app_caricamento.py`
- `strumenti/prove/app_clienti.py`
- `strumenti/prove/app_componenti.py`
- `strumenti/prove/app_documenti.py`
- `strumenti/prove/app_guscio.py`
- `strumenti/prove/app_impostazioni.py`
- `strumenti/prove/app_pratica.py`

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
- prove nel browser interessate: `app_pratica.py`, `app_bollettino.py`, `app_componenti.py`. **Non lanciarle** (porte e cartella `.next` sono condivise con gli altri pacchetti): aggiorna quelle indicate nei rilievi, controlla la sintassi con `python -m py_compile <file>` e scrivi nel resoconto quali vanno lanciate. Le lancia il controllo di fine onda.
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-3-05.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
