# Collaudo · Onda 4 · Pacchetto 4-01 — Sagome D-59 — parte 2: Sistema, Scartati, Analisi, Clienti, Utenti; Scartati a 768 px

Data: 08/11/2026 · **Esecutore: DeepSeek V4 Flash** · Gravità del pacchetto: **P2** · Rilievi: A5-05, A5-06, A6-15 · Piano: `strumenti/collaudo/piano-correzioni.md`.

Si lancia **dopo** il commit del lavoro f7 e la chiusura dell'onda precedente. Dipende da: 3-03 (`collaudo-3-03-sagome-1.md`); 0b-05 (`collaudo-0b-05-cerca-integra-clienti.md`: rileggi il codice di `VistaClienti.tsx`, cambiato dall'onda 0 bis).

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

### A5-05 — Per 150 ms le tabelle mostrano «Nessun elemento» e «0 elementi» (D-59)
- Gravità: P2
- Dove: `app/frontend/componenti/DataTable.tsx:92,130`; `app/(app)/documenti/VistaDocumenti.tsx:141-178`; schema consigliato in spec §16.4.3
- Problema: `caricando={sagome}` è falso nei primi 150 ms (per scelta di `useSagome`), quindi con `righe=[]` la DataTable disegna `emptyText` e il piede "0 elementi"; in Documenti compaiono "Nessun documento da controllare." e il riquadro "Come entrano i documenti".
- Scenario: apertura di Pratiche, Registro, Sistema con risposta in 120 ms → lampo "Nessuna pratica · Prova a togliere il filtro… · 0 elementi", poi le righe. Con risposta in 400 ms: 150 ms di "Nessuna pratica" e poi le sagome.
- Correzione puntuale: in `DataTable` distinguere "in attesa" da "sagome visibili": prop `caricando` = caricamento vero (`!dati`), e dentro `const sagome = useSagome(!!caricando && righe.length === 0)`; con `caricando && righe.length===0 && !sagome` corpo e piede vuoti (nessun testo). Le pagine passano `caricando={!dati}` (o `caricando`), non più `sagome`. In `VistaDocumenti` con `!dati` niente `Nota` e niente riquadro di destra. Aggiornare l'esempio della spec §16.4.3 e del catalogo `/componenti`.
- Prova che la verifica: prova Playwright con `page.route('/api/pratiche*')` ritardata di 100 ms: nessun testo "Nessuna" a schermo prima delle righe (in `app_componenti.py` o `app_pratiche.py`).
- Esecutore: DeepSeek V4 — componente comune + tutte le pagine che lo usano.
- File toccati: `componenti/DataTable.tsx`, `app/(app)/pratiche/VistaPratiche.tsx`, `registro/VistaRegistro.tsx`, `sistema/VistaSistema.tsx`, `scartati/VistaScartati.tsx`, `analisi/VistaAnalisi.tsx`, `clienti/VistaClienti.tsx`, `utenti/VistaUtenti.tsx`, `documenti/VistaDocumenti.tsx`, `app/(app)/componenti/page.tsx`, spec §16.4.3
- Dipende da / correlato a: D-59, A5-06

> **Per questo pacchetto:** **Parte 2**: le pagine Sistema, Scartati, Analisi, Clienti, Utenti passano `caricando={!dati}` (o l'equivalente) come già fatto nella parte 1 per Pratiche, Documenti e Registro: segui quello schema, non cambiare `DataTable`/`FilterBar`.

### A5-06 — Sagome mostrate subito, senza la soglia dei 150 ms
- Gravità: P3
- Dove: `scartati/VistaScartati.tsx:141` (`caricando={dati ? caricando : true}`), `clienti/VistaClienti.tsx:360,373` (`caricando={!pratiche}`), `utenti/VistaUtenti.tsx:230` (`caricando={permessi === null}`), `analisi/VistaAnalisi.tsx:212` (`FilterBar caricando={!dati}`)
- Problema: passano il caricamento grezzo invece di `useSagome(...)`.
- Scenario: scheda *Pratiche* di un cliente con risposta in 40 ms → lampo delle sagome.
- Correzione puntuale: risolta da A5-05 se la soglia passa dentro `DataTable`; per `FilterBar` stessa cosa (`useSagome` interno sul prop `caricando`).
- Prova che la verifica: come A5-05.
- Esecutore: DeepSeek V4 Flash — sostituzioni locali.
- File toccati: quelli elencati, `componenti/FilterBar.tsx`
- Dipende da / correlato a: A5-05, D-59

> **Per questo pacchetto:** Le sostituzioni nelle pagine elencate.

### A6-15 — Scartati a 768 px: *Recupera* ed *Elimina* fuori dalla tabella
- Gravità: P3
- Dove: `app/frontend/app/(app)/scartati/` (colonna delle azioni)
- Problema: a 768 px la colonna delle azioni è tagliata: di *Recupera* si vede solo la «R», *Elimina* non si vede, e la pagina non mostra uno scorrimento.
- Scenario: `/scartati` a 768×1024 (`scartati-768.png`) → per recuperare un documento bisogna sapere che la tabella scorre di lato (se scorre).
- Correzione puntuale: a ≤ 860 px togliere la colonna «Eliminato il» (o metterla sotto «Scartato il») e dare alla colonna azioni `white-space: nowrap` e larghezza fissa.
- Prova che la verifica: `app_scartati.py` con un controllo `bounding_box` di *Recupera* dentro `.dt` a 768 px.
- Esecutore: DeepSeek V4 Flash — stile.
- File toccati: `app/frontend/app/(app)/scartati/VistaScartati.tsx`, `strumenti/prove/app_scartati.py`
- Dipende da / correlato a: D-44 (tablet)

## File ammessi (solo questi)

- `app/frontend/app/(app)/sistema/VistaSistema.tsx`
- `app/frontend/app/(app)/scartati/VistaScartati.tsx`
- `app/frontend/app/(app)/analisi/VistaAnalisi.tsx`
- `app/frontend/app/(app)/clienti/VistaClienti.tsx`
- `app/frontend/app/(app)/utenti/VistaUtenti.tsx`
- `strumenti/prove/app_scartati.py`
- `strumenti/opencode/resoconto-collaudo-4-01.md`

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
- `app/frontend/app/(app)/bollettini/[id]/VistaBollettino.tsx`
- `app/frontend/app/(app)/liquidazioni/VistaLiquidazioni.tsx`
- `app/frontend/app/(app)/pratiche/VistaPratiche.tsx`
- `app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx`
- `app/frontend/app/layout.tsx`
- `app/frontend/app/stile/public-sans.css`
- `app/frontend/app/stile/stile.css`
- `app/frontend/componenti/Pagina.tsx`
- `app/frontend/lib/memoria.ts`
- `app/frontend/public/fonts/*`
- `prototipo-alternativo/assets/stile.css`
- `strumenti/prove/app_f7_collaudo.py`
- `strumenti/prove/app_liquidazioni.py`
- `strumenti/prove/app_pratica.py`
- `strumenti/prove/app_pratiche.py`

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
- prove nel browser interessate: `app_caricamento.py`, `app_sistema.py`, `app_scartati.py`, `app_analisi.py`, `app_clienti.py`, `app_utenti.py`. **Non lanciarle** (porte e cartella `.next` sono condivise con gli altri pacchetti): aggiorna quelle indicate nei rilievi, controlla la sintassi con `python -m py_compile <file>` e scrivi nel resoconto quali vanno lanciate. Le lancia il controllo di fine onda.
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-4-01.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
