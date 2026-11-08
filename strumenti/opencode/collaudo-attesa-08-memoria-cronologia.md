# Collaudo · Onda in attesa · Pacchetto attesa-08 — Memoria della schermata per passo di cronologia e dopo il ricaricamento

Data: 08/11/2026 · **Esecutore: DeepSeek V4** · Gravità del pacchetto: **P2** · Rilievi: A5-09 · Piano: `strumenti/collaudo/piano-correzioni.md`.

> ⛔ **NON LANCIARE** finché Ugo non decide la domanda **U15 — §7.12: la memoria della schermata si perde ricaricando ed è unica per sezione (semplificazione `ponytail:`).** (`piano-correzioni.md`, *Da decidere*). Raccomandazione: (a): un file solo (`lib/memoria.ts`) e la spec lo promette. Se Ugo sceglie diversamente, Claude Code riscrive questo prompt. Quando si lancia: Claude Code sceglie l'onda (la prima dopo 4-03 in cui nessun altro pacchetto tocca questi file) e completa l'elenco dei file vietati.

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

### A5-09 — Ritorno allo stesso punto: memoria persa al ricaricamento e non per passo di cronologia (§7.12)
- Gravità: P2
- Dove: `app/frontend/lib/memoria.ts:8-12` (commento `ponytail:`), chiave a riga 13 e 25
- Problema: la memoria sta in una `Map` di modulo con chiave "primo segmento del percorso": si perde ricaricando la pagina (la spec dice che sopravvive) ed è unica per sezione, non per passo di cronologia.
- Scenario: Pratiche filtrate per Gries, pagina 3 → apro una pratica → F5 → Indietro: filtri e pagina tornano all'inizio. Oppure: pratica A sulla scheda *Incassi*, apro dalla barra Pratiche e poi la pratica A dal menu: torna su *Incassi* anche se è un passo nuovo.
- Correzione puntuale: salvare `MEM` in `sessionStorage` con chiave `history.state?.__memoria` (un id generato e scritto con `history.replaceState({...history.state, __memoria:id})` alla prima visita del passo); fallback all'attuale `Map` se `sessionStorage` lancia.
- Prova che la verifica: `strumenti/prove/app_pratiche.py`: filtro + pagina 2 → apri pratica → `page.reload()` → `go_back()` → filtro e pagina presenti.
- Esecutore: DeepSeek V4 — comportamento di tutta l'app.
- File toccati: `lib/memoria.ts`, `strumenti/prove/app_pratiche.py`
- Dipende da / correlato a: §7.12 → anche in *Da decidere* (semplificazione già dichiarata)

## File ammessi (solo questi)

- `app/frontend/lib/memoria.ts`
- `strumenti/prove/app_pratiche.py`
- `strumenti/opencode/resoconto-collaudo-attesa-08.md`

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

- frontend: `cd app/frontend && npx tsc --noEmit` → 0 errori;
- prove nel browser interessate: `app_pratiche.py`, `app_f7_collaudo.py`, `app_analisi.py`. **Non lanciarle** (porte e cartella `.next` sono condivise con gli altri pacchetti): aggiorna quelle indicate nei rilievi, controlla la sintassi con `python -m py_compile <file>` e scrivi nel resoconto quali vanno lanciate. Le lancia il controllo di fine onda.
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-attesa-08.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
