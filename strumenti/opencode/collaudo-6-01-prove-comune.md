# Collaudo · Onda 6 · Pacchetto 6-01 — Prove nel browser: indirizzo unico, esito subito, uscita 1 con KO

Data: 08/11/2026 · **Esecutore: DeepSeek V4 Flash** · Gravità del pacchetto: **P3** · Rilievi: A6-10 · Piano: `strumenti/collaudo/piano-correzioni.md`.

Si lancia **dopo** il commit del lavoro f7 e la chiusura dell'onda precedente. Dipende da: —.

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

### A6-10 — Prove nel browser: indirizzi diversi, esito solo alla fine, uscita 0 con KO
- Gravità: P3
- Dove: `strumenti/prove/app_*.py` (righe `BASE = …`), `app_scena.py:9`
- Problema: indirizzo predefinito diverso fra le prove (8001, 8011, 8031), `app_scena.py` fisso su 8001 (il server di sviluppo con il database vero); molte prove stampano OK/KO solo alla fine, quindi un'eccezione a metà perde tutti i controlli già fatti; alcune escono con codice 0 anche con KO (`app_analisi.py`: 35 OK, 2 KO, uscita 0).
- Scenario: un ciclo che lancia tutte le prove e guarda solo il codice d'uscita considera `app_analisi.py` passata; `app_scena.py` lanciata durante il collaudo avrebbe girato contro `decobrands_db`.
- Correzione puntuale: nel `comune.py` di A6-06: `BASE = os.environ.get('BASE', 'http://localhost:8001')` usato da tutte, `ok()` che stampa subito (`print(..., flush=True)`) e `atexit` che fa `sys.exit(1)` se c'è almeno un KO.
- Prova che la verifica: una prova con un KO voluto esce con 1 e mostra gli OK precedenti.
- Esecutore: DeepSeek V4 Flash — meccanico.
- File toccati: `strumenti/prove/comune.py`, `strumenti/prove/app_*.py`
- Dipende da / correlato a: A6-06

> **Per questo pacchetto:** Se Ugo ha deciso U24 «sì», in questo pacchetto entra anche A6-06 (`bypass_csp` in `comune.py`, prompt `collaudo-attesa-15-prove-build-esercizio.md`).

**Nota del pacchetto.** Sostituzione meccanica in tutte le `app_*.py` (oltre 8 file: è voluto, per questo il pacchetto sta da solo nell'ultima onda). Indirizzo predefinito: `http://localhost:8001`, sovrascrivibile con `BASE` nell'ambiente. Non cambiare i controlli delle prove.

## File ammessi (solo questi)

- `strumenti/prove/comune.py`
- `strumenti/prove/app_*.py`
- `strumenti/opencode/resoconto-collaudo-6-01.md`

## File vietati

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
3. Resoconto in `strumenti/opencode/resoconto-collaudo-6-01.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
