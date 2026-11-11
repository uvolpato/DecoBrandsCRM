# Collaudo · Onda 4 · Pacchetto 4-06 — Contrasti WCAG e carattere fuori dal CSS bloccante

Data: 08/11/2026 · **Esecutore: DeepSeek V4 Flash** · Gravità del pacchetto: **P3** · Rilievi: A7-09, A7-26 · Piano: `strumenti/collaudo/piano-correzioni.md`.

Si lancia **dopo** il commit del lavoro f7 e la chiusura dell'onda precedente. Dipende da: 3-05 (`collaudo-3-05-stile-allineato.md`); 0b-05 (`collaudo-0b-05-cerca-integra-clienti.md`: rileggi il codice di `stile.css`, cambiato dall'onda 0 bis).

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

- **U16**: (a) si cambia nel prototipo e si ricopia (D-24 resta).

## Rilievi da correggere (testo dei report del collaudo; i rilievi U* nascono dalle decisioni di Ugo)

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

## File ammessi (solo questi)

- `app/frontend/app/stile/stile.css`
- `prototipo-alternativo/assets/stile.css`
- `app/frontend/app/stile/public-sans.css`
- `app/frontend/app/layout.tsx`
- `app/frontend/public/fonts/*`
- `strumenti/opencode/resoconto-collaudo-4-06.md`

## File vietati

Li modificano altri pacchetti della **stessa onda**, in parallelo:

- `app/backend/src/formati.ts`
- `app/backend/src/incassi.ts`
- `app/backend/src/liquidazioni.ts`
- `app/backend/src/motore/motore.ts`
- `app/backend/src/oggi.ts`
- `app/backend/src/proposta.ts`
- `app/backend/src/solleciti.ts`
- `app/backend/test/incassi.spec.ts`
- `app/backend/test/liquidazioni.spec.ts`
- `app/backend/test/oggi.spec.ts`
- `app/frontend/app/(app)/analisi/VistaAnalisi.tsx`
- `app/frontend/app/(app)/bollettini/[id]/VistaBollettino.tsx`
- `app/frontend/app/(app)/clienti/VistaClienti.tsx`
- `app/frontend/app/(app)/liquidazioni/VistaLiquidazioni.tsx`
- `app/frontend/app/(app)/pratiche/VistaPratiche.tsx`
- `app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx`
- `app/frontend/app/(app)/scartati/VistaScartati.tsx`
- `app/frontend/app/(app)/sistema/VistaSistema.tsx`
- `app/frontend/app/(app)/utenti/VistaUtenti.tsx`
- `app/frontend/componenti/Pagina.tsx`
- `app/frontend/lib/memoria.ts`
- `strumenti/prove/app_f7_collaudo.py`
- `strumenti/prove/app_liquidazioni.py`
- `strumenti/prove/app_pratica.py`
- `strumenti/prove/app_pratiche.py`
- `strumenti/prove/app_scartati.py`

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
- prove nel browser interessate: `app_componenti.py`. **Non lanciarle** (porte e cartella `.next` sono condivise con gli altri pacchetti): aggiorna quelle indicate nei rilievi, controlla la sintassi con `python -m py_compile <file>` e scrivi nel resoconto quali vanno lanciate. Le lancia il controllo di fine onda.
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-4-06.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
