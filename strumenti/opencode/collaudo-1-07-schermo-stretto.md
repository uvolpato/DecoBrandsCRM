# Collaudo · Onda 1 · Pacchetto 1-07 — Blocco sotto i 744 px (D-44)

Data: 08/11/2026 · **Esecutore: DeepSeek V4 Flash** · Gravità del pacchetto: **P1** · Rilievi: A5-03, A6-01 · Piano: `strumenti/collaudo/piano-correzioni.md`.

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

## Decisioni di Ugo per questo pacchetto (08/11/2026)

Sono decise: applicale come scritte, non riaprirle. La riga del §19 la scrive il pacchetto documentazione dell'onda.

- **U17 → D-127**: **Il blocco sotto i 744 px vale sulla larghezza della finestra, anche con lo zoom.** `@media (max-width: 743px)`: chi ingrandisce al 200 % su uno schermo da 1440 px vede la pagina «usa un computer o un tablet». Eccezione voluta a WCAG 1.4.10. Precisa D-44.

## Rilievi da correggere (testo dei report del collaudo; i rilievi U* nascono dalle decisioni di Ugo)

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

### A6-01 — Manca il blocco sotto i 744 px (D-44), e nessuna prova lo controlla
- Gravità: P1
- Dove: `app/frontend/app/layout.tsx` (layout radice), `app/frontend/app/stile/stile.css` (nessuna regola `max-width: 743px`); `strumenti/prove/app_guscio.py` (l'intestazione dice «telefono» ma non c'è nessun controllo)
- Problema: la regola V6/§16.6 non è implementata: sotto i 744 px l'app si usa come sul tablet.
- Scenario: finestra larga 600 px → `/accesso` mostra la finestra d'accesso; dopo l'accesso `/pratiche` mostra filtri e tabella tagliata a destra (`stretto-pratiche-600.png`). Atteso: pagina scura con logo e «Il Sistema Informativo Aziendale si usa da computer o tablet…», anche prima dell'accesso.
- Correzione puntuale: nel layout radice un `<div className="schermo-stretto">` (logo + testo della spec §16.6) accanto a `{children}` avvolto in `<div className="app-tutta">`; in `stile.css` del **prototipo** (poi ricopiato, D-24) `.schermo-stretto{display:none}` e `@media (max-width: 743px){ .schermo-stretto{display:flex; …} .app-tutta{display:none} }`. Controllare prima con `grep` che i nomi delle classi non esistano.
- Prova che la verifica: aggiungere a `strumenti/prove/app_guscio.py` tre pagine a 743 px (`/accesso`, `/pratiche` dopo l'accesso) con `'computer o tablet' in body` e `.barra` non visibile, e una a 744 px con l'app visibile; rilancia anche `app_f7_collaudo.py` (768 px deve restare uguale).
- Esecutore: DeepSeek V4 Flash — CSS e un elemento nel layout, logica nessuna.
- File toccati: `app/frontend/app/layout.tsx`, `prototipo-alternativo/assets/stile.css`, `app/frontend/app/stile/stile.css` (copia), `prototipo-alternativo/index.html` (stesso blocco), `strumenti/prove/app_guscio.py`
- Dipende da / correlato a: **A5-03** (stesso rilievo, da lettura), D-44, spec V6 e §16.6

**Nota del pacchetto.** Si blocca sulla **larghezza CSS della finestra** (`@media (max-width: 743px)`), come dice la spec §16.6. La domanda sullo zoom al 200 % (decisione U17) non blocca questo pacchetto. Stesso blocco nel prototipo (D-24). Nomi delle classi: prima `grep` su tutti e due gli `stile.css`.

## File ammessi (solo questi)

- `app/frontend/app/layout.tsx`
- `app/frontend/app/stile/stile.css`
- `prototipo-alternativo/assets/stile.css`
- `prototipo-alternativo/index.html`
- `strumenti/prove/app_guscio.py`
- `strumenti/opencode/resoconto-collaudo-1-07.md`

## File vietati

Li modificano altri pacchetti della **stessa onda**, in parallelo:

- `.gitignore`
- `app/NOTA-RILASCIO.md`
- `app/README.md`
- `app/avvia-esercizio.bat`
- `app/backend/package.json`
- `app/backend/prisma/seed/dati-prova.json`
- `app/backend/src/accesso.ts`
- `app/backend/src/casella.ts`
- `app/backend/src/clienti.ts`
- `app/backend/src/documenti.ts`
- `app/backend/src/errori.filter.ts`
- `app/backend/src/fornitori.ts`
- `app/backend/src/impostazioni-api.ts`
- `app/backend/src/impostazioni.ts`
- `app/backend/src/incassi.ts`
- `app/backend/src/lettore.ts`
- `app/backend/src/lettura.ts`
- `app/backend/src/main.ts`
- `app/backend/src/motore/dati.ts`
- `app/backend/src/motore/motore.ts`
- `app/backend/src/oggi.ts`
- `app/backend/src/posta.ts`
- `app/backend/src/proposta.ts`
- `app/backend/src/registro-api.ts`
- `app/backend/src/registro.ts`
- `app/backend/src/sistema.ts`
- `app/backend/src/utenti.ts`
- `app/backend/test/avvio.spec.ts`
- `app/backend/test/blocco.ts`
- `app/backend/test/casella.spec.ts`
- `app/backend/test/clienti.spec.ts`
- `app/backend/test/coda.spec.ts`
- `app/backend/test/correzione.spec.ts`
- `app/backend/test/documenti-lettura.spec.ts`
- `app/backend/test/documenti-pratica.spec.ts`
- `app/backend/test/impostazioni.spec.ts`
- `app/backend/test/incassi.spec.ts`
- `app/backend/test/liquidazioni.spec.ts`
- `app/backend/test/motore.spec.ts`
- `app/backend/test/oggi.spec.ts`
- `app/backend/test/permessi.spec.ts`
- `app/backend/test/profilo.spec.ts`
- `app/backend/test/proposta.spec.ts`
- `app/backend/test/registro-api.spec.ts`
- `app/backend/test/registro.spec.ts`
- `app/backend/test/scartati.spec.ts`
- `app/backend/test/seed.spec.ts`
- `app/backend/test/sistema.spec.ts`
- `app/backend/test/utenti.spec.ts`
- `app/deploy/*`
- `app/deploy/Caddyfile`
- `app/frontend/app/(app)/bollettini/VistaBollettini.tsx`
- `app/frontend/app/(app)/bollettini/[id]/VistaBollettino.tsx`
- `app/frontend/app/(app)/clienti/VistaClienti.tsx`
- `app/frontend/app/(app)/documenti/VistaDocumenti.tsx`
- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`
- `app/frontend/app/(app)/fornitori/VistaFornitori.tsx`
- `app/frontend/app/(app)/oggi/VistaOggi.tsx`
- `app/frontend/app/(app)/pratiche/VistaPratiche.tsx`
- `app/frontend/app/(app)/sistema/VistaSistema.tsx`
- `app/frontend/app/(app)/subagenti/VistaSubagenti.tsx`
- `app/frontend/app/(app)/utenti/VistaUtenti.tsx`
- `app/frontend/componenti/CampoRicerca.tsx`
- `app/frontend/componenti/Piccoli.tsx`
- `app/frontend/lib/api.ts`
- `app/frontend/lib/eventi.tsx`
- `app/frontend/next.config.ts`
- `body.json`
- `cookies.txt`
- `prototipo-alternativo/assets/motore.js`
- `strumenti/prove/app_analisi.py`
- `strumenti/prove/app_bollettini.py`
- `strumenti/prove/app_bollettino.py`
- `strumenti/prove/app_clienti.py`
- `strumenti/prove/app_componenti.py`
- `strumenti/prove/app_documenti.py`
- `strumenti/prove/app_eventi.py`
- `strumenti/prove/app_flusso.py`
- `strumenti/prove/app_oggi.py`
- `strumenti/prove/app_subagenti.py`

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
- prove nel browser interessate: `app_guscio.py`, `app_f7_collaudo.py`. **Non lanciarle** (porte e cartella `.next` sono condivise con gli altri pacchetti): aggiorna quelle indicate nei rilievi, controlla la sintassi con `python -m py_compile <file>` e scrivi nel resoconto quali vanno lanciate. Le lancia il controllo di fine onda.
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-1-07.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
