# Collaudo · Onda 8 · Pacchetto 8-01 — Prove nel browser: modulo comune, build di esercizio, segmenti come pulsanti

Data: 08/11/2026 · **Esecutore: DeepSeek V4 Flash** · Gravità del pacchetto: **P3** · Rilievi: A6-10, A6-06, A7-10 · Piano: `strumenti/collaudo/piano-correzioni.md`.

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

- **U18 → D-128**: **I segmenti dei filtri sono un gruppo di pulsanti, non schede.** `.segmenti` ha `role="group"` con etichetta e ogni segmento `aria-pressed`; `role="tab"` resta solo alle schede vere (`Schede`). Le prove cercano i segmenti con `.segmenti [aria-pressed]`.
- **U24 → D-132**: **Le prove nel browser girano anche sulla build di esercizio.** `strumenti/prove/comune.py` apre le pagine con `bypass_csp=True`: le `app_*.py` valgono sia con `next dev` sia con `next build` + `next start`.

## Rilievi da correggere (testo dei report del collaudo; i rilievi U* nascono dalle decisioni di Ugo)

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

> **Per questo pacchetto:** Decisione U24 → D-132: `bypass_csp=True` in `comune.py` (`nuova_pagina`, `nuovo_contesto`).

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

> **Per questo pacchetto:** Decisione U18 → D-128. Prima i componenti (`FilterBar.tsx`, `Solleciti.tsx`, `ConsultaDocumenti.tsx`, i due `stile.css`), poi i selettori `.segmenti [role=tab]` delle prove diventano `.segmenti [aria-pressed]`. La nota di `CLAUDE.md` §4.4 la cambia Ugo: scrivi nel resoconto la frase nuova.

**Nota del pacchetto.** Sostituzioni meccaniche in tutte le `app_*.py` più tre componenti e i due `stile.css`: per questo il pacchetto supera gli 8 file e sta da solo nell'ultima onda. Indirizzo predefinito `http://localhost:8001`, sovrascrivibile con `BASE`. Non cambiare i controlli delle prove oltre ai selettori dei segmenti.

## File ammessi (solo questi)

- `strumenti/prove/comune.py`
- `strumenti/prove/app_*.py`
- `app/frontend/componenti/FilterBar.tsx`
- `app/frontend/componenti/Solleciti.tsx`
- `app/frontend/componenti/ConsultaDocumenti.tsx`
- `app/frontend/app/stile/stile.css`
- `prototipo-alternativo/assets/stile.css`
- `strumenti/opencode/resoconto-collaudo-8-01.md`

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

- frontend: `cd app/frontend && npx tsc --noEmit` → 0 errori;
- prove nel browser interessate: `app_*.py`. **Non lanciarle** (porte e cartella `.next` sono condivise con gli altri pacchetti): aggiorna quelle indicate nei rilievi, controlla la sintassi con `python -m py_compile <file>` e scrivi nel resoconto quali vanno lanciate. Le lancia il controllo di fine onda.
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-8-01.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
