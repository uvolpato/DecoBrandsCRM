# Resoconto collaudo 6-01 — Totali dal server: righe del documento e differenze del Bollettino (V12)

Esecutore: DeepSeek V4 · Data: 13/11/2026 · Rilievo: A5-08 (P2, parte 2) · Decisione: U14 → D-126.

## Cosa ho fatto per ogni rilievo

### Differenza riga per riga del Bollettino (A5-08 parte 2) — CORRETTO

- **Backend** `app/backend/src/bollettino.ts` (`riconciliazione`, righe 74–77): `differenza: num(x.differenza)` diventa
  `differenza: num(x.differenza ?? (x.loro ? x.loro.importo : null))`. Il motore non calcola la differenza per una
  riga `sconosciuta` (`noi = null`, `motore.ts` esce prima); ora il server restituisce l'importo riconosciuto dal
  fornitore, esattamente quello che mostrava il prototipo (`viste-periodo.js`). Per le altre categorie si usa il
  valore `r2` già calcolato dal motore, niente più sottrazione in virgola mobile.
- **Frontend** `app/frontend/app/(app)/bollettini/[id]/VistaBollettino.tsx` (riga 234): la differenza arriva dal server
  (`x.differenza ?? 0`) invece di essere calcolata nel browser (`loro − noi` in virgola mobile).
- **Prova** `app/backend/test/bollettino.spec.ts`: `forma` aggiornata a `differenza ?? loro.importo ?? null` (confronta
  la differenza effettiva fra server e prototipo, anche per la riga sconosciuta); nuova verifica che la riga
  sconosciuta di Ing's agosto ha `differenza === loro.importo` (non più `null`).

### Totali delle righe del documento (A5-08 parte 2) — BACKEND fatto, FRONTEND bloccato

- **Backend** `app/backend/src/documenti.ts` (`dettaglioDocumento`, righe 492–497): la risposta ora porta
  `totali: { importo, provvigione }` sommati dal server con `r2` (Decimal), per il piede della tabella delle righe.
- **Prova** `app/backend/test/documenti-pratica.spec.ts`: nuova prova che il dettaglio di un documento con due righe
  porta `totali = { importo: 10.5, provvigione: 1.25 }`.
- **Frontend** `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`: **non toccato**. Per usare `totali` serve il
  prop `totali` di `DataTable`, che fa la **parte 1 (pacchetto 5-04)**, non ancora consegnata (non c'è
  `resoconto-collaudo-5-04.md` e `componenti/DataTable.tsx` non ha ancora il prop). `DataTable.tsx` **non** è fra i
  miei file ammessi (è di 5-04): fermarsi e segnalare, come da regole. Il prop `totale: 'somma'` resta come segnaposto
  della colonna, come vuole D-126.

## Prove lanciate (database `decobrands_test_6_01`, cancellato alla fine)

- `npx jest test/bollettino.spec.ts test/documenti-pratica.spec.ts test/documenti-lettura.spec.ts` → **65/65 OK, 0 KO**.
- `npx tsc --noEmit` (backend) → **0 errori**.
- `npx tsc --noEmit` (frontend) → **0 errori**.

## Prove nel browser da lanciare a fine onda

- `app_bollettino.py`, `app_documenti.py` — **nessuna modifica**: la differenza del bollettino e i totali del documento
  non cambiano i valori mostrati (la differenza sconosciuta ora dal server è identica a quella che già mostrava il
  browser; il piede del documento resta lo stesso finché il frontend non usa `totali`). Da rilanciare come regressione.

## Cose aperte

- **Frontend VistaDocumento**: passare `totali={doc.totali}` alla `DataTable` di `righeLette` appena 5-04 aggiunge il
  prop `totali` a `DataTable`. Il campo è già nella risposta del server.
- **Finestra «Correggi i dati letti»** (`VistaDocumento.tsx` riga ~861): il piede somma in virgola mobile i valori che
  la persona sta digitando (non valori arrivati dal server) — è un totale dal vivo, non una `DataTable` né un
  «calcolo dai dati arrivati» (D-126). Lo lascio; se Ugo lo vuole spostato serve un ripensamento (non c'è un giro sul
  server a ogni tasto).

## Da documentare

### §19 — riga (da fondere con la parte 1 di 5-04)

- **D-126** (08/11/2026): I totali in fondo alle tabelle di Liquidazioni, Analisi e righe del documento e la differenza
  riga per riga del Bollettino arrivano nella risposta del server (`totali`, `differenza`); la `DataTable` li mostra
  senza sommare, `totale:'somma'` resta solo come segnaposto della colonna. La somma nel browser resta solo per colonne
  che non sono importi. Perché: sommando/sottraendo in virgola mobile i valori arrivati, piede e nota del pannello (o
  righe del bollettino) possono differire di centesimi e nessuno è «quello vero» per il browser (V12). Chi: Ugo. Dove:
  `componenti/DataTable.tsx`, `VistaLiquidazioni.tsx`, `VistaAnalisi.tsx`, `VistaDocumento.tsx`, `VistaBollettino.tsx`,
  `liquidazioni.ts`, `analisi.ts`, `documenti.ts`, `bollettino.ts`.

### Riga *Perché* (sezioni §7.7 bollettino e §7.9 documento)

> *Perché*: la differenza riga per riga del Bollettino e i totali delle righe del documento arrivano dal server, come
> per Liquidazioni e Analisi (D-126): il browser non somma né sottrae importi in virgola mobile, così i numeri a schermo
> sono sempre quelli calcolati dal server al centesimo (V12).

### Guida (`app/frontend/lib/guida.ts`)

> **Da sapere** — I totali in fondo alle tabelle e la differenza riga per riga del bollettino li calcola il CRM, non il
> browser: quello che vedi è sempre il numero «vero» al centesimo, uguale a quello che ritrovi nei prospetti e nelle
> esportazioni.

### Piano (`piano-lavoro-crm.md`)

> Attività collaudo onda 6, pacchetto 6-01 (A5-08 parte 2, D-126): differenza del Bollettino e totali delle righe del
> documento dal server + prove. Ore: da approvare (allineare con il piano dell'onda).

### README (`app/README.md`)

> Nessuna nota specifica richiesta: nessuna nuova dipendenza, tabella o configurazione.

## File toccati

Solo gli ammessi: `app/backend/src/bollettino.ts`, `app/backend/src/documenti.ts`,
`app/frontend/app/(app)/bollettini/[id]/VistaBollettino.tsx`, `app/backend/test/bollettino.spec.ts`,
`app/backend/test/documenti-pratica.spec.ts`. Nessun file fuori dagli ammessi.
