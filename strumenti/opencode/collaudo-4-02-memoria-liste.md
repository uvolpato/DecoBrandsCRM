# Collaudo · Onda 4 · Pacchetto 4-02 — Tabelle che ricordano ordinamento e scorrimento: Pratiche e Liquidazioni

Data: 08/11/2026 · **Esecutore: DeepSeek V4 Flash** · Gravità del pacchetto: **P2** · Rilievi: A5-10 · Piano: `strumenti/collaudo/piano-correzioni.md`.

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

### A5-10 — Tabelle senza `memoria`: ordinamento e scorrimento persi tornando indietro
- Gravità: P2
- Dove: `pratiche/VistaPratiche.tsx:159` (scorrimento), `liquidazioni/VistaLiquidazioni.tsx:186,219` (ordinamento, pagina, scorrimento), `subagenti/VistaSubagenti.tsx:408`, `utenti/VistaUtenti.tsx:255`, `fornitori/VistaFornitori.tsx:387`, `documenti/[id]/VistaDocumento.tsx:464` (Schede)
- Problema: senza `memoria="…"` la DataTable non ricorda ordinamento, pagina e scorrimento (§7.12, §16.4).
- Scenario: Liquidazioni, documenti ordinati per *Provvigione*, scorro a metà → clic sul numero (link alla pratica) → **Torna alle Liquidazioni** → ordine di nuovo per *Stato* e lista in cima. Pratiche: scorro la pagina 2 fino in fondo → apro una pratica → indietro → lista in cima.
- Correzione puntuale: aggiungere `memoria="pratiche"`, `"liq-subagenti"`, `"liq-documenti"`, `"subagenti"`, `"utenti"`, `"fornitori-clienti"`; in Subagenti, Utenti, Clienti, Fornitori sostituire le variabili di modulo `let schedaX`/`let filtro` con `Schede memoria="…"` e `useMemoria('filtri', …)` (stesso meccanismo ovunque).
- Prova che la verifica: `app_liquidazioni.py` e `app_pratiche.py`: ordina/scorri → apri → indietro → stesso ordine e `scrollTop`.
- Esecutore: DeepSeek V4 Flash — attributi e sostituzioni locali.
- File toccati: i 7 file elencati, `clienti/VistaClienti.tsx`, `fornitori/VistaFornitori.tsx`, prove citate
- Dipende da / correlato a: §7.12, A5-09

> **Per questo pacchetto:** In questo pacchetto **solo** `pratiche/VistaPratiche.tsx` e `liquidazioni/VistaLiquidazioni.tsx` (`memoria="pratiche"`, `"liq-subagenti"`, `"liq-documenti"`).

## File ammessi (solo questi)

- `app/frontend/app/(app)/pratiche/VistaPratiche.tsx`
- `app/frontend/app/(app)/liquidazioni/VistaLiquidazioni.tsx`
- `strumenti/prove/app_liquidazioni.py`
- `strumenti/prove/app_pratiche.py`
- `strumenti/opencode/resoconto-collaudo-4-02.md`

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
- `app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx`
- `app/frontend/app/(app)/scartati/VistaScartati.tsx`
- `app/frontend/app/(app)/sistema/VistaSistema.tsx`
- `app/frontend/app/(app)/utenti/VistaUtenti.tsx`
- `app/frontend/app/layout.tsx`
- `app/frontend/app/stile/public-sans.css`
- `app/frontend/app/stile/stile.css`
- `app/frontend/componenti/Pagina.tsx`
- `app/frontend/lib/memoria.ts`
- `app/frontend/public/fonts/*`
- `prototipo-alternativo/assets/stile.css`
- `strumenti/prove/app_f7_collaudo.py`
- `strumenti/prove/app_pratica.py`
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
- prove nel browser interessate: `app_liquidazioni.py`, `app_pratiche.py`. **Non lanciarle** (porte e cartella `.next` sono condivise con gli altri pacchetti): aggiorna quelle indicate nei rilievi, controlla la sintassi con `python -m py_compile <file>` e scrivi nel resoconto quali vanno lanciate. Le lancia il controllo di fine onda.
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-4-02.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
