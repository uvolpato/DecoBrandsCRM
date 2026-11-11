# Collaudo · Onda 2 · Pacchetto 2-02 — Schede controllate, dettaglio del documento che si azzera, testi «non riconosciuto»

Data: 08/11/2026 · **Esecutore: DeepSeek V4 Flash** · Gravità del pacchetto: **P1** · Rilievi: A5-01, A5-04, A6-16, A5-10 · Piano: `strumenti/collaudo/piano-correzioni.md`.

Si lancia **dopo** il commit del lavoro f7 e la chiusura dell'onda precedente. Dipende da: 0b-01 (`collaudo-0b-01-import-integra-documento.md`: rileggi il codice di `VistaDocumento.tsx`, `app_documenti.py`, cambiato dall'onda 0 bis); 0b-06 (`collaudo-0b-06-lista-documenti-cliente.md`: rileggi il codice di `VistaDocumenti.tsx`, cambiato dall'onda 0 bis).

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

### A5-01 — "Vedi le righe" in Documenti non cambia scheda (Schede ignora `attiva` dopo il primo disegno)
- Gravità: P1
- Dove: `app/frontend/componenti/Schede.tsx:21`; chiamante `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx:341,464`
- Problema: `attiva` è usato solo come valore iniziale di `useMemoria`; quando il genitore lo cambia la scheda resta quella di prima.
- Scenario: documento con righe incerte → nell'avviso "N righe lette con valori incerti" clic su **Vedi le righe** → `setScheda('righe')` nel genitore, ma la scheda *Righe lette* non si apre. In `VistaPratica.tsx:270` lo stesso problema è aggirato con un clic simulato nel DOM (`document.querySelector(...).click()`).
- Correzione puntuale: in `Schede.tsx` aggiungere `useEffect(() => { if (iniziale && schede.some((s) => s.id === iniziale)) setAttiva(iniziale); }, [iniziale])` (scheda controllata quando il genitore la cambia); poi in `VistaPratica.tsx:270` sostituire il clic DOM con uno stato `scheda` passato in `attiva`.
- Prova che la verifica: aggiungere in `strumenti/prove/app_documenti.py` il clic su "Vedi le righe" e il controllo `aria-selected=true` su `.schede-barra [role=tab]:has-text("Righe lette")`; rilanciare `app_pratica.py` (riga 108).
- Esecutore: DeepSeek V4 Flash — componente unico, modifica locale.
- File toccati: `componenti/Schede.tsx`, `app/(app)/pratiche/[id]/VistaPratica.tsx`, `strumenti/prove/app_documenti.py`
- Dipende da / correlato a: §16.4 (Schede), §7.12

### A5-04 — Documenti: il dettaglio non si azzera cambiando documento (collegamento al bollettino sbagliato)
- Gravità: P1
- Dove: `app/frontend/app/(app)/documenti/VistaDocumenti.tsx:167`; `app/(app)/documenti/[id]/VistaDocumento.tsx:127-152`
- Problema: con l'elenco nel layout (D-94) `VistaDocumento` non si rimonta al cambio di `id`; l'effetto di riga 137 azzera solo `d` ed `errore`: `bollettinoId`, `scheda`, `altra`, `finestra` restano quelli del documento precedente.
- Scenario: si apre il bollettino A (già registrato, `bollettinoId=12`), poi il bollettino B già registrato ma la cui cella non si trova (o la richiesta fallisce) → la nota di B dice "è già registrato: **aprilo**" con il link a `/bollettini/12`, cioè al bollettino di A. Anche il campo "abbina a un'altra pratica" conserva la pratica scelta su A.
- Correzione puntuale: in `VistaDocumenti.tsx:167` `<VistaDocumento key={selezionato} id={selezionato} … />` (l'elenco resta montato, si rimonta solo il dettaglio); poi togliere l'effetto di azzeramento a riga 137, inutile.
- Prova che la verifica: `strumenti/prove/app_documenti.py`: aprire un documento, scegliere "Righe lette", passare a un altro → la scheda è "azioni" e il campo di abbinamento è vuoto.
- Esecutore: DeepSeek V4 Flash — una riga.
- File toccati: `app/(app)/documenti/VistaDocumenti.tsx`, `app/(app)/documenti/[id]/VistaDocumento.tsx`, `strumenti/prove/app_documenti.py`
- Dipende da / correlato a: D-94, D-71

### A6-16 — Documenti: testi con «di non riconosciuto»
- Gravità: P3
- Dove: `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx` (testo della proposta e riga *Oppure abbina*)
- Problema: con fornitore non riconosciuto il nome del fornitore è sostituito da «non riconosciuto» dentro frasi fatte per un nome.
- Scenario: ordine `ordine_OF-2026-064.pdf` del seed (`documenti-1440.png`) → «Il codice — non corrisponde a nessun cliente di non riconosciuto» e «Oppure abbina a un'altra pratica di non riconosciuto:».
- Correzione puntuale: se manca il fornitore: «Fornitore e codice cliente non letti: correggi i dati letti oppure scegli cliente e fornitore qui sotto.» e «Oppure abbina a un'altra pratica:».
- Prova che la verifica: `app_documenti.py`, controllo che `'di non riconosciuto' not in body`.
- Esecutore: DeepSeek V4 Flash — testi.
- File toccati: `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`, `app/frontend/lib/guida.ts` se cita la frase
- Dipende da / correlato a: A5-04

> **Per questo pacchetto:** Se la guida cita la frase, scrivilo nel resoconto (la guida la cambia il pacchetto documentazione).

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

> **Per questo pacchetto:** In questo pacchetto **solo** `documenti/[id]/VistaDocumento.tsx:464` (Schede con `memoria`). Le altre tabelle sono in altri pacchetti.

## File ammessi (solo questi)

- `app/frontend/componenti/Schede.tsx`
- `app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx`
- `app/frontend/app/(app)/documenti/VistaDocumenti.tsx`
- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`
- `strumenti/prove/app_documenti.py`
- `strumenti/opencode/resoconto-collaudo-2-02.md`

## File vietati

Li modificano altri pacchetti della **stessa onda**, in parallelo:

- `app/backend/package-lock.json`
- `app/backend/package.json`
- `app/backend/prisma/lettura-prova.ts`
- `app/backend/src/accesso.ts`
- `app/backend/src/bollettino.ts`
- `app/backend/src/documenti.ts`
- `app/backend/src/esporta-liquidazione.ts`
- `app/backend/src/eventi.ts`
- `app/backend/src/fornitori.ts`
- `app/backend/src/impostazioni-api.ts`
- `app/backend/src/impostazioni.ts`
- `app/backend/src/incassi.ts`
- `app/backend/src/lettura-prova.ts`
- `app/backend/src/motore/dati.ts`
- `app/backend/src/motore/motore.ts`
- `app/backend/src/proposta.ts`
- `app/backend/src/solleciti.ts`
- `app/backend/test/bollettino.spec.ts`
- `app/backend/test/documenti-pratica.spec.ts`
- `app/backend/test/eventi.spec.ts`
- `app/backend/test/fornitori.spec.ts`
- `app/backend/test/impostazioni.spec.ts`
- `app/backend/test/liquidazioni.spec.ts`
- `app/backend/test/motore-volumi.spec.ts`
- `app/backend/test/pratiche.spec.ts`
- `app/backend/test/proposta.spec.ts`
- `app/frontend/app/(app)/analisi/VistaAnalisi.tsx`
- `app/frontend/app/(app)/bollettini/VistaBollettini.tsx`
- `app/frontend/app/(app)/clienti/VistaClienti.tsx`
- `app/frontend/app/(app)/impostazioni/*`
- `app/frontend/app/(app)/layout.tsx`
- `app/frontend/app/(app)/oggi/VistaOggi.tsx`
- `app/frontend/app/(app)/pratiche/VistaPratiche.tsx`
- `app/frontend/app/(app)/sistema/VistaSistema.tsx`
- `app/frontend/app/accesso/esci/page.tsx`
- `app/frontend/app/stile/stile.css`
- `app/frontend/componenti/Barra.tsx`
- `app/frontend/componenti/ConsultaDocumenti.tsx`
- `app/frontend/componenti/DataTable.tsx`
- `app/frontend/componenti/PeriodoMesi.tsx`
- `app/frontend/eslint.config.mjs`
- `app/frontend/lib/api.ts`
- `app/frontend/lib/stati.ts`
- `app/frontend/package-lock.json`
- `app/frontend/package.json`
- `prototipo-alternativo/assets/stile.css`
- `strumenti/prove/app_accesso.py`
- `strumenti/prove/app_analisi.py`
- `strumenti/prove/app_clienti.py`
- `strumenti/prove/app_eventi.py`
- `strumenti/prove/app_guscio.py`
- `strumenti/prove/app_liquidazioni.py`
- `strumenti/prove/app_pratica.py`
- `strumenti/prove/app_pratiche.py`
- `strumenti/prove/app_sistema.py`

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
- prove nel browser interessate: `app_documenti.py`, `app_pratica.py`. **Non lanciarle** (porte e cartella `.next` sono condivise con gli altri pacchetti): aggiorna quelle indicate nei rilievi, controlla la sintassi con `python -m py_compile <file>` e scrivi nel resoconto quali vanno lanciate. Le lancia il controllo di fine onda.
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-2-02.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
