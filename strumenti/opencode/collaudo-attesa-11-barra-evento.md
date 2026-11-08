# Collaudo · Onda in attesa · Pacchetto attesa-11 — Barra laterale che si rilegge solo all'evento

Data: 08/11/2026 · **Esecutore: DeepSeek V4 Flash** · Gravità del pacchetto: **P2** · Rilievi: A7-20 · Piano: `strumenti/collaudo/piano-correzioni.md`.

> ⛔ **NON LANCIARE** finché Ugo non decide la domanda **U20 — Barra laterale: rilegge i contatori a ogni cambio pagina (come il prototipo) o solo all'evento?** (`piano-correzioni.md`, *Da decidere*). Raccomandazione: (a) finché i conteggi costano poco: con il pacchetto `carichi-oggi-liquidazioni` la richiesta diventa leggera. Se Ugo sceglie diversamente, Claude Code riscrive questo prompt. Quando si lancia: Claude Code sceglie l'onda (la prima dopo 2-05, 3-06 in cui nessun altro pacchetto tocca questi file) e completa l'elenco dei file vietati.

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

### A7-20 — Ogni cambio di pagina carica tutto il database per i numeri della barra
- Gravità: P2 (ipotesi)
- Dove: `app/frontend/componenti/Barra.tsx:77-91` (si rilegge a ogni `percorso`); `app/backend/src/oggi.ts:268-272` → `caricaDati` (`motore/dati.ts:75-88`)
- Problema: `GET /api/oggi/conteggi` legge **tutte** le pratiche con righe e documenti e tutti i bollettini con le righe, e poi fa passare il motore su tutto (`confermeInRitardo`, `pagamentiDaSollecitare` e un'altra volta `statoPratica` su ogni pratica). Succede a ogni clic nel menu, per ogni utente.
- Scenario: con 3 anni di dati (circa 5.000 pratiche e 15.000 documenti) ogni navigazione legge decine di MB da Postgres in Node. Aprendo Oggi i caricamenti completi sono 2 (pagina e barra); con Liquidazioni 3 (vedi A7-22). Il tempo cresce in modo lineare o peggio (A7-21).
- Correzione puntuale:
  1. Frontend: in `Barra.tsx` le dipendenze dell'effetto diventano `[useEventi().provvigioni]` e non `[percorso]`: si rilegge quando il server segnala un cambiamento, non a ogni pagina.
  2. Backend: in `conteggiBarra` i conteggi `pratiche`/`conferme` si fanno con la stessa SQL dello stato `scaduta` di `pratiche.ts:113-118`, senza `caricaDati`. Solo `pagamenti` resta sul motore, con una cache in memoria che vale finché non cambia `max(registro.id)` (`SELECT max(id) FROM registro`, che costa poco).
- Prova che la verifica: un seme moltiplicato (script che copia 50 volte le pratiche del seme §12 in `decobrands_test`), poi `curl -s -o /dev/null -w '%{time_total}\n' -b cookies.txt http://127.0.0.1:8002/api/oggi/conteggi` prima e dopo. I numeri devono restare quelli di `app_oggi.py` e `app_guscio.py`.
- Esecutore: DeepSeek V4. Backend e frontend insieme, conteggi legati alle regole di stato.
- File toccati: `app/frontend/componenti/Barra.tsx`, `app/backend/src/oggi.ts`
- Dipende da / correlato a: A7-21, A7-22; commento `ponytail:` in `motore/dati.ts:6-7` (debito noto, A8)

> **Per questo pacchetto:** Solo la **parte 1 (frontend)**: dipendenze dell'effetto di `Barra.tsx`. La parte backend l'ha già fatta `carichi-oggi-liquidazioni`.

## File ammessi (solo questi)

- `app/frontend/componenti/Barra.tsx`
- `strumenti/opencode/resoconto-collaudo-attesa-11.md`

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
- prove nel browser interessate: `app_guscio.py`, `app_eventi.py`, `app_f7_numeri.py`. **Non lanciarle** (porte e cartella `.next` sono condivise con gli altri pacchetti): aggiorna quelle indicate nei rilievi, controlla la sintassi con `python -m py_compile <file>` e scrivi nel resoconto quali vanno lanciate. Le lancia il controllo di fine onda.
- `git diff --name-only` e `git status --short`: nessun file fuori dagli ammessi.

## Criteri di fine

1. Ogni rilievo corretto come dice la *Correzione puntuale*, o motivato nel resoconto se hai dovuto fare diversamente.
2. Prove sopra con 0 KO; database di prova cancellato.
3. Resoconto in `strumenti/opencode/resoconto-collaudo-attesa-11.md` con: cosa hai fatto per ogni rilievo (file e righe), prove lanciate con l'esito, prove nel browser da lanciare a fine onda, e una sezione **Da documentare** con il testo pronto per: riga D-nn del §19 (data, decisione, perché, chi, dove) se cambia o nasce una regola, riga *Perché* nella sezione della spec, testo della guida (`lib/guida.ts`), attività/ore del piano, README. Se non c'è nulla da documentare, scrivilo.
4. Nessun commit.

## Cosa NON fare

- Non semplificare né reinterpretare le decisioni del §19 citate nei rilievi: chi sviluppa deve sapere cosa non "semplificare".
- Non toccare file fuori dagli ammessi, neanche per "sistemare" codice vicino; niente rinomine o spostamenti non chiesti.
- Niente commit, niente push, niente `git stash`/`reset`/`checkout` di file altrui.
- Niente migrazioni né modifiche a `schema.prisma`.
- Non usare `decobrands_db`, non usare il database condiviso `decobrands_test`, non contattare Integra.
- Non avviare backend o frontend sulle porte 8001/8002/8011/8012 (sono di Ugo e del controllo di fine onda).
- Se un rilievo va contro una decisione del §19 o richiede di toccare un file vietato: fermati su quel rilievo e scrivilo nel resoconto.
