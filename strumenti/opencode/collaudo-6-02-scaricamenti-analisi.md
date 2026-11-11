# Collaudo · Onda 6 · Pacchetto 6-02 — Scaricamenti con sessione scaduta; Analisi senza richieste accavallate

Data: 08/11/2026 · **Esecutore: DeepSeek V4 Flash** · Gravità del pacchetto: **P3** · Rilievi: A5-20, A7-23 · Piano: `strumenti/collaudo/piano-correzioni.md`.

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

## Rilievi da correggere (testo dei report del collaudo; i rilievi U* nascono dalle decisioni di Ugo)

### A5-20 — Codice doppio: `caricaPdf` e download copiano `api()`; scaricamenti senza gestione del 401
- Gravità: P3
- Dove: `app/frontend/lib/api.ts:65-81` (`caricaPdf` ripete il corpo di `api`); `liquidazioni/VistaLiquidazioni.tsx:132-149` e l'analogo `scarica` in `analisi/VistaAnalisi.tsx` (fetch diretto); `api.ts:36` (`allAccesso` usa solo `pathname`)
- Problema: tre copie della stessa gestione risposta; gli scaricamenti con sessione scaduta mostrano "Non è stato possibile esportare" invece di portare all'accesso; il ritorno dopo l'accesso perde la query (`?righe=1`).
- Scenario: sessione scaduta, clic su *Esporta* → avviso d'errore generico, l'utente riprova senza capire.
- Correzione puntuale: in `api.ts` una funzione interna `invia(percorso, init)` usata da `api`, `caricaPdf` e da un nuovo `scarica(percorso)` che restituisce il `Blob` + nome; `allAccesso` usa `pathname + search`.
- Prova che la verifica: `strumenti/prove/app_liquidazioni.py` con cookie di sessione tolto: *Esporta* porta a `/accesso?dopo=…`.
- Esecutore: DeepSeek V4 Flash — un modulo + due chiamanti.
- File toccati: `lib/api.ts`, `liquidazioni/VistaLiquidazioni.tsx`, `analisi/VistaAnalisi.tsx`
- Dipende da / correlato a: D-38, D-89, A8

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

## File ammessi (solo questi)

- `app/frontend/lib/api.ts`
- `app/frontend/app/(app)/liquidazioni/VistaLiquidazioni.tsx`
- `app/frontend/app/(app)/analisi/VistaAnalisi.tsx`
- `strumenti/prove/app_liquidazioni.py`
- `strumenti/opencode/resoconto-collaudo-6-02.md`

## File vietati

Li modificano altri pacchetti della **stessa onda**, in parallelo:

- `app/backend/src/bollettino.ts`
- `app/backend/src/documenti.ts`
- `app/backend/test/bollettino.spec.ts`
- `app/backend/test/documenti-pratica.spec.ts`
- `app/frontend/app/(app)/bollettini/[id]/VistaBollettino.tsx`
- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`

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
- prove nel browser interessate: `app_liquidazioni.py`, `app_analisi.py`. **Non lanciarle** (porte e cartella `.next` sono condivise con gli altri pacchetti): aggiorna quelle indicate nei rilievi, controlla la sintassi con `python -m py_compile <file>` e scrivi nel resoconto quali vanno lanciate. Le lancia il controllo di fine onda.
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-6-02.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
