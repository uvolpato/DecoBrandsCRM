# Collaudo · Onda 3 · Pacchetto 3-04 — Data di oggi a Roma in tutti i campi «Valido dal»; anno doppio nei Bollettini

Data: 08/11/2026 · **Esecutore: DeepSeek V4 Flash** · Gravità del pacchetto: **P2** · Rilievi: A5-16, A5-19 · Piano: `strumenti/collaudo/piano-correzioni.md`.

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

### A5-16 — Data di oggi in UTC come valore iniziale di "Valido dal"
- Gravità: P2
- Dove: `app/frontend/app/(app)/clienti/VistaClienti.tsx:154`; altre 4 copie di `oggi()` in `fornitori/VistaFornitori.tsx:97`, `subagenti/VistaSubagenti.tsx:66`, `pratiche/[id]/VistaPratica.tsx:116`, `bollettini/VistaBollettini.tsx:160` (ora locale del PC); `registro/VistaRegistro.tsx:62` e `liquidazioni/page.tsx:10` usano Europe/Rome
- Problema: `new Date().toISOString().slice(0,10)` è la data UTC: fra mezzanotte e l'1/2 di notte è il giorno prima.
- Scenario: nuova agenzia creata il 01/12 alle 00:30 → "Valido dal" proposto **30/11** → se l'utente conferma, l'agenzia vale anche per le fatture del 30/11; anche gli sconti "in vigore" dell'aiuto si calcolano sul giorno sbagliato.
- Correzione puntuale: una sola `oggi()` in `lib/formati.ts` con `new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' })`, usata da tutte e sei le pagine (togliere le copie locali).
- Prova che la verifica: test di unità piccolo o prova Playwright con `page.clock.set_fixed_time('2026-11-30T23:30:00Z')` in `app_clienti.py`: il campo propone 2026-12-01.
- Esecutore: DeepSeek V4 Flash — sostituzioni locali.
- File toccati: `lib/formati.ts`, i 6 file elencati, `strumenti/prove/app_clienti.py`
- Dipende da / correlato a: percentuali datate (A2)

### A5-19 — Carica bollettino: anno doppio nella tendina (chiave React duplicata)
- Gravità: P3
- Dove: `app/frontend/app/(app)/bollettini/VistaBollettini.tsx:193,204`
- Problema: `anni = [prima.getFullYear(), oggi.getFullYear()]` è `[2026, 2026]` in tutti i mesi tranne gennaio.
- Scenario: novembre 2026 → la tendina *Anno* mostra "2026" due volte e React avvisa di due `key="2026"`.
- Correzione puntuale: `const anni = [...new Set([prima.getFullYear(), oggi.getFullYear()])];`
- Prova che la verifica: `strumenti/prove/app_bollettini.py`: la tendina anno ha opzioni distinte.
- Esecutore: DeepSeek V4 Flash — una riga.
- File toccati: `bollettini/VistaBollettini.tsx`
- Dipende da / correlato a: —

## File ammessi (solo questi)

- `app/frontend/lib/formati.ts`
- `app/frontend/app/(app)/clienti/VistaClienti.tsx`
- `app/frontend/app/(app)/fornitori/VistaFornitori.tsx`
- `app/frontend/app/(app)/subagenti/VistaSubagenti.tsx`
- `app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx`
- `app/frontend/app/(app)/bollettini/VistaBollettini.tsx`
- `strumenti/prove/app_clienti.py`
- `strumenti/opencode/resoconto-collaudo-3-04.md`

## File vietati

Li modificano altri pacchetti della **stessa onda**, in parallelo:

- `app/backend/src/documenti.ts`
- `app/backend/src/liquidazioni.ts`
- `app/backend/src/oggi.ts`
- `app/backend/test/documenti.spec.ts`
- `app/backend/test/liquidazioni.spec.ts`
- `app/backend/test/oggi.spec.ts`
- `app/frontend/app/(app)/[...resto]/page.tsx`
- `app/frontend/app/(app)/componenti/page.tsx`
- `app/frontend/app/(app)/documenti/VistaDocumenti.tsx`
- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`
- `app/frontend/app/(app)/liquidazioni/VistaLiquidazioni.tsx`
- `app/frontend/app/(app)/not-found.tsx`
- `app/frontend/app/(app)/oggi/VistaOggi.tsx`
- `app/frontend/app/(app)/pratiche/VistaPratiche.tsx`
- `app/frontend/app/(app)/registro/VistaRegistro.tsx`
- `app/frontend/app/stile/stile.css`
- `app/frontend/componenti/ConsultaDocumenti.tsx`
- `app/frontend/componenti/DataTable.tsx`
- `app/frontend/componenti/FilterBar.tsx`
- `app/frontend/componenti/InCostruzione.tsx`
- `app/frontend/componenti/Modale.tsx`
- `prototipo-alternativo/assets/stile.css`
- `strumenti/prove/app_caricamento.py`
- `strumenti/prove/app_componenti.py`
- `strumenti/prove/app_documenti.py`
- `strumenti/prove/app_guscio.py`
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
- prove nel browser interessate: `app_clienti.py`, `app_bollettini.py`. **Non lanciarle** (porte e cartella `.next` sono condivise con gli altri pacchetti): aggiorna quelle indicate nei rilievi, controlla la sintassi con `python -m py_compile <file>` e scrivi nel resoconto quali vanno lanciate. Le lancia il controllo di fine onda.
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-3-04.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
