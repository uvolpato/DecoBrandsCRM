# Collaudo · Onda in attesa · Pacchetto attesa-15 — Prove nel browser anche sulla build di esercizio

Data: 08/11/2026 · **Esecutore: DeepSeek V4 Flash** · Gravità del pacchetto: **P2** · Rilievi: A6-06 · Piano: `strumenti/collaudo/piano-correzioni.md`.

> ⛔ **NON LANCIARE** finché Ugo non decide la domanda **U24 — Su quale build si collaudano le prove nel browser?** (`piano-correzioni.md`, *Da decidere*). Raccomandazione: (a): si collauda ciò che va in esercizio. Se Ugo sceglie diversamente, Claude Code riscrive questo prompt. Quando si lancia: Claude Code sceglie l'onda (la prima dopo la decisione in cui nessun altro pacchetto tocca questi file) e completa l'elenco dei file vietati.

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

## Rilievi da correggere (testo dei report del collaudo)

### A6-06 — Le prove nel browser non girano sulla build di esercizio (CSP)
- Gravità: P2
- Dove: `app/frontend/next.config.ts:12-15` (CSP senza `unsafe-eval` in esercizio); tutte le `strumenti/prove/app_*.py` che usano `wait_for_function("…")`
- Problema: con `next build` + `next start` (come facevano le slice F1–F3) ogni `wait_for_function` con stringa viene bloccato dalla CSP: «EvalError: Evaluating a string as JavaScript violates … 'unsafe-eval'».
- Scenario: primo giro su `next start`: 8 file su 8 fermati in 1–4 s (es. `app_analisi.py` alla riga 76). Con `bypass_csp=True` passano. Si può collaudare solo con `next dev`, cioè non sulla build che va in produzione.
- Correzione puntuale: un modulo comune `strumenti/prove/comune.py` con `def nuova_pagina(b, **k): k.setdefault('bypass_csp', True); return b.new_page(**k)` e lo stesso per `new_context`; sostituire `b.new_page(` con `nuova_pagina(b, ` in tutte le `app_*.py`. In alternativa minima: una riga in `app/README.md` «le prove nel browser vanno lanciate con `next dev`».
- Prova che la verifica: tutte le `app_*.py` contro `next start` senza `sitecustomize`.
- Esecutore: DeepSeek V4 Flash — sostituzione meccanica nelle prove.
- File toccati: `strumenti/prove/comune.py` (nuovo), `strumenti/prove/app_*.py`, `app/README.md`
- Dipende da / correlato a: A6-10

**Nota del pacchetto.** Se Ugo sceglie «sì» si unisce a `prove-comune` (ultima onda); se sceglie «no» basta la riga nel README (pacchetto documentazione).

## File ammessi (solo questi)

- `strumenti/prove/comune.py`
- `strumenti/prove/app_*.py`
- `strumenti/opencode/resoconto-collaudo-attesa-15.md`

## File vietati

Da completare da Claude Code al lancio (file degli altri pacchetti della stessa onda).

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

- prove nel browser interessate: `app_*.py`. **Non lanciarle** (porte e cartella `.next` sono condivise con gli altri pacchetti): aggiorna quelle indicate nei rilievi, controlla la sintassi con `python -m py_compile <file>` e scrivi nel resoconto quali vanno lanciate. Le lancia il controllo di fine onda.
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-attesa-15.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
