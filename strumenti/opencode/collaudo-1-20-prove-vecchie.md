# Collaudo · Onda 1 · Pacchetto 1-20 — Prove nel browser vecchie o fragili

Data: 08/11/2026 · **Esecutore: DeepSeek V4 Flash** · Gravità del pacchetto: **P3** · Rilievi: A6-07, A6-08, A6-09 · Piano: `strumenti/collaudo/piano-correzioni.md`.

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

### A6-07 — Prove vecchie dopo il cambio del seed (11 fornitori)
- Gravità: P3
- Dove: `strumenti/prove/app_bollettini.py:62-64,74,140`, `strumenti/prove/app_flusso.py:283-290`; seed `app/backend/prisma/seed/dati-prova.json` (working tree: aggiunto *Nuovo Fornitore Demo SRL*, D-87)
- Problema: le prove contano 10 fornitori nella matrice dei Bollettini; il seed nuovo ne ha 11.
- Scenario: `app_bollettini.py` → KO «sola lettura: matrice senza pulsanti di modifica» (`righe_m == 10`); `app_flusso.py` si fermava su `length === 10` dopo *Togli tutti i filtri*. Lo spec Jest `bollettini.spec.ts` è già stato aggiornato nel working tree, le prove nel browser no (in parte sì, alle 13:02).
- Correzione puntuale: in entrambe le prove leggere il numero atteso da `/api/bollettini` (`len(righe)`) invece del 10 fisso, o portarlo a 11 insieme al commit del seed.
- Prova che la verifica: `app_bollettini.py` e `app_flusso.py` con 0 KO su seed pulito.
- Esecutore: DeepSeek V4 Flash — prove, costanti.
- File toccati: `strumenti/prove/app_bollettini.py`, `strumenti/prove/app_flusso.py`
- Dipende da / correlato a: D-87, seed §12

### A6-08 — `app_analisi.py`: due KO che a mano non si riproducono
- Gravità: P3
- Dove: `strumenti/prove/app_analisi.py:82-83` e `162-171`
- Problema: «durata 6 mesi: il segmento è scelto» e «ritorno: periodo, filtro e raggruppamento» falliscono in 3 giri su 3, ma con uno script che fa gli stessi passi (6 mesi → `apr 2026 → set 2026`, segmento scelto; Per fornitore + Gasper → Pratiche → Analisi: periodo, filtro e scheda uguali) funziona.
- Scenario: la prova controlla `aria-selected` subito dopo `quieta(pg)`, prima che la risposta del server ridisegni i segmenti; al ritorno legge i campi mentre le sagome sono ancora su.
- Correzione puntuale: prima di ogni `ok` su un segmento `pg.wait_for_function("t => [...document.querySelectorAll('.barra-analisi .segmenti [role=tab]')].some(e => e.textContent.includes(t) && e.getAttribute('aria-selected') === 'true')", arg='6 mesi')`; al ritorno aspettare `document.querySelectorAll('.sagoma').length === 0` prima di `periodo(pg)`.
- Prova che la verifica: `app_analisi.py` 3 volte di fila con 0 KO.
- Esecutore: DeepSeek V4 Flash — attese nella prova.
- File toccati: `strumenti/prove/app_analisi.py`
- Dipende da / correlato a: A5-09/A5-11 (se dopo la correzione resta KO, è il ritorno §7.12 vero)

### A6-09 — Prove instabili: Clienti (409 alla prima agenzia) e Subagenti (attesa fissa)
- Gravità: P3
- Dove: `strumenti/prove/app_clienti.py:85-100,155-157`; `strumenti/prove/app_subagenti.py:83-86`
- Problema: `app_clienti.py` si è fermata 2 volte su 4: una volta con «creazione agenzia non riuscita: Periodo sovrapposto per questo cliente/fornitore» su un cliente del segmento *Senza agenzie*; `app_subagenti.py` ha dato «eccezione eliminata» KO 1 volta su 3 (attesa fissa di 800 ms).
- Scenario: seed pulito, cliente 9 senza agenzie, nuova agenzia Gries 2031-01-01 → 2031-06-30: via API (`POST /api/clienti/9/agenzie`) risponde 201; nel browser una volta 409. Possibile doppio invio del modulo (il primo crea, il secondo urta il vincolo `EXCLUDE`) oppure clic su un altro cliente: non isolato.
- Correzione puntuale: in `app_clienti.py` registrare le richieste `POST …/agenzie` (`pg.on('request')`) e fallire con il loro numero se sono più di una (se sono due è un bug del modulo: pulsante `submit` disattivato durante l'invio in `Modale`); in `app_subagenti.py` sostituire `wait_for_timeout(800)` con `pg.wait_for_function("() => ![...document.querySelectorAll('.elenco li')].some(l => l.textContent.includes('Gasper'))")`.
- Prova che la verifica: le due prove 5 volte di fila senza fermarsi.
- Esecutore: DeepSeek V4 Flash — prove (V4 se si scopre il doppio invio).
- File toccati: `strumenti/prove/app_clienti.py`, `strumenti/prove/app_subagenti.py`
- Dipende da / correlato a: A3-01 (vincolo agenzie)

> **Per questo pacchetto:** Se scopri un doppio invio del modulo dell'agenzia, **non** correggere il frontend qui: scrivilo nel resoconto (diventa un pacchetto V4).

## File ammessi (solo questi)

- `strumenti/prove/app_bollettini.py`
- `strumenti/prove/app_flusso.py`
- `strumenti/prove/app_analisi.py`
- `strumenti/prove/app_clienti.py`
- `strumenti/prove/app_subagenti.py`
- `strumenti/opencode/resoconto-collaudo-1-20.md`

## File vietati

Li modificano altri pacchetti della **stessa onda**, in parallelo:

- `.gitignore`
- `app/NOTA-RILASCIO.md`
- `app/README.md`
- `app/avvia-esercizio.bat`
- `app/backend/package.json`
- `app/backend/prisma/seed/dati-prova.json`
- `app/backend/src/accesso.ts`
- `app/backend/src/casella.ts`
- `app/backend/src/documenti.ts`
- `app/backend/src/errori.filter.ts`
- `app/backend/src/impostazioni-api.ts`
- `app/backend/src/impostazioni.ts`
- `app/backend/src/incassi.ts`
- `app/backend/src/lettore.ts`
- `app/backend/src/lettura.ts`
- `app/backend/src/main.ts`
- `app/backend/src/motore/dati.ts`
- `app/backend/src/motore/motore.ts`
- `app/backend/src/oggi.ts`
- `app/backend/src/proposta.ts`
- `app/backend/src/registro-api.ts`
- `app/backend/src/registro.ts`
- `app/backend/src/sistema.ts`
- `app/backend/test/avvio.spec.ts`
- `app/backend/test/blocco.ts`
- `app/backend/test/casella.spec.ts`
- `app/backend/test/coda.spec.ts`
- `app/backend/test/correzione.spec.ts`
- `app/backend/test/documenti-lettura.spec.ts`
- `app/backend/test/documenti-pratica.spec.ts`
- `app/backend/test/impostazioni.spec.ts`
- `app/backend/test/incassi.spec.ts`
- `app/backend/test/liquidazioni.spec.ts`
- `app/backend/test/motore.spec.ts`
- `app/backend/test/oggi.spec.ts`
- `app/backend/test/permessi.spec.ts`
- `app/backend/test/profilo.spec.ts`
- `app/backend/test/proposta.spec.ts`
- `app/backend/test/registro-api.spec.ts`
- `app/backend/test/registro.spec.ts`
- `app/backend/test/scartati.spec.ts`
- `app/backend/test/seed.spec.ts`
- `app/backend/test/sistema.spec.ts`
- `app/deploy/*`
- `app/deploy/Caddyfile`
- `app/frontend/app/(app)/bollettini/VistaBollettini.tsx`
- `app/frontend/app/(app)/bollettini/[id]/VistaBollettino.tsx`
- `app/frontend/app/(app)/clienti/VistaClienti.tsx`
- `app/frontend/app/(app)/documenti/VistaDocumenti.tsx`
- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`
- `app/frontend/app/(app)/fornitori/VistaFornitori.tsx`
- `app/frontend/app/(app)/oggi/VistaOggi.tsx`
- `app/frontend/app/(app)/pratiche/VistaPratiche.tsx`
- `app/frontend/app/(app)/sistema/VistaSistema.tsx`
- `app/frontend/app/(app)/subagenti/VistaSubagenti.tsx`
- `app/frontend/app/(app)/utenti/VistaUtenti.tsx`
- `app/frontend/app/layout.tsx`
- `app/frontend/app/stile/stile.css`
- `app/frontend/componenti/CampoRicerca.tsx`
- `app/frontend/componenti/Piccoli.tsx`
- `app/frontend/lib/api.ts`
- `app/frontend/lib/eventi.tsx`
- `app/frontend/next.config.ts`
- `body.json`
- `cookies.txt`
- `prototipo-alternativo/assets/motore.js`
- `prototipo-alternativo/assets/stile.css`
- `prototipo-alternativo/index.html`
- `strumenti/prove/app_bollettino.py`
- `strumenti/prove/app_componenti.py`
- `strumenti/prove/app_documenti.py`
- `strumenti/prove/app_eventi.py`
- `strumenti/prove/app_guscio.py`
- `strumenti/prove/app_oggi.py`

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

- prove nel browser interessate: `app_bollettini.py`, `app_flusso.py`, `app_analisi.py`, `app_clienti.py`, `app_subagenti.py`. **Non lanciarle** (porte e cartella `.next` sono condivise con gli altri pacchetti): aggiorna quelle indicate nei rilievi, controlla la sintassi con `python -m py_compile <file>` e scrivi nel resoconto quali vanno lanciate. Le lancia il controllo di fine onda.
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-1-20.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
