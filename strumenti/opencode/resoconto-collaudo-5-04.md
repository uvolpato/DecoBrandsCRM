# Resoconto collaudo 5-04 — Totali dal server: Liquidazioni e Analisi (V12)

Esecutore: DeepSeek V4 · Data: 13/11/2026 · Rilievo: A5-08 (P2) · Decisione: U14 → D-126. Parte 1 (righe del documento e Bollettino sono la parte 2, altro pacchetto).

## Cosa ho fatto per ogni rilievo

### A5-08 — Totali delle colonne sommati nel browser (V12)

Il piede delle tabelle somma/sottrae in virgola mobile i valori arrivati. Ora i totali degli importi arrivano
nella risposta del server e la DataTable li mostra senza sommare; il `reduce` resta solo come ripiego per le
colonne che non sono importi (e per chi non passa il prop).

- **Frontend** `app/frontend/componenti/DataTable.tsx`:
  - nuovo prop `totali?: Record<string, number>` (righe 45–49), commento che rimanda a D-126.
  - piede (riga 149): `totali?.[c.key] ?? tutte.reduce(...)` — se il server fornisce il totale si usa quello,
    altrimenti la somma di prima. `totale:'somma'` resta solo il segnaposto della colonna.
- **Backend** `app/backend/src/liquidazioni.ts`:
  - `liquidazione()` (righe 101–131): le righe dei documenti si calcolano una volta (`righeDoc`), si sommano per
    subagente in `docPerSub` (Decimal, niente virgola mobile) e si aggiungono alla risposta `totali` e il campo
    `totale_documenti` su ogni subagente. `totali.subagenti.provvigione` = `f.totale.provvigione` (lo stesso valore
    della nota del pannello), `totali.documenti.provvigione` = somma di tutte le provvigioni dei documenti del
    trimestre (comprese attesa e storni).
  - `reportSubagenti()` elenco (riga 220–224): `totali: { fatturato, pagate, margine }` dalla sintesi del trimestre.
- **Backend** `app/backend/src/analisi.ts` `pagina()` (righe 244–246): `tabella.totali: { fatturato, prese, pagate, margine }`
  da `c.totale`, uguale ai 4 numeri della pagina.
- **Frontend** `app/frontend/app/(app)/liquidazioni/VistaLiquidazioni.tsx`:
  - interfacce `Subagente` (+ `totale_documenti`), `Report` (+ `totali?`), `Risposta` (+ `totali`).
  - subagenti: `totali={b.totali.subagenti}` (riga ~190); documenti: `totali={scelto ? { provvigione: scelto.totale_documenti } : b.totali.documenti}`
    (riga ~223) perché la tabella è filtrata per subagente lato client; report: `totali={r.totali}` (riga ~308).
- **Frontend** `app/frontend/app/(app)/analisi/VistaAnalisi.tsx`: `tabella.totali` nell'interfaccia (riga 54) e
  `totali={dati.tabella.totali}` (riga ~269).
- **Prove**:
  - `app/backend/test/liquidazioni.spec.ts` (righe 98–99, 202–203): `totali.subagenti.provvigione === riepilogo.provvigione`,
    `totali.documenti.provvigione` = somma del prototipo; report `totali` = sintesi del trimestre.
  - `app/backend/test/analisi.spec.ts` (righe 144–148): `tabella.totali` = i 4 numeri della pagina.
  - `strumenti/prove/app_liquidazioni.py` (righe 91–93): confronta piede della tabella e nota del pannello (stesso
    totale dal server, D-126).

## Prove lanciate (database `decobrands_test_5_04`, cancellato alla fine)

- `npx jest test/liquidazioni.spec.ts test/analisi.spec.ts` → **38/38 OK, 0 KO**.
  - Nota: al primo giro un KO transitorio sul PDF dell'Analisi (500 da LibreOffice), riproducibile solo lanciando i
    due spec insieme; da soli entrambi passano (analisi: 15/15). Non dipende da questo pacchetto (il PDF non usa i
    nuovi `totali`): è il riuso del profilo LibreOffice `decobrands-crm-lo-<pid>` fra le due suite nello stesso
    worker (`maxWorkers: 1`). Al rilancio 38/38.
- `npx tsc --noEmit` (backend) → **0 errori**.
- `npx tsc --noEmit` (frontend) → **0 errori**.
- `python -m py_compile strumenti/prove/app_liquidazioni.py` → **OK**.
- `git status --short`: toccati solo i file ammessi (più i file degli altri pacchetti, non miei).

## Prove nel browser da lanciare a fine onda

- `app_liquidazioni.py` (aggiornata: piede vs nota del pannello). Da lanciare a fine onda.
- `app_analisi.py`: **non** modificata (non è fra gli ammessi). Nessuna sua prova verifica il totale di colonna della
  tabella; il mock di `tabella` (riga ~160) non imposta `totali`, quindi la DataTable ricade sulla somma: il cambio è
  retrocompatibile e non la rompe. Da rilanciare a fine onda come regressione.
- Non lanciate qui (porte e `.next` condivise con gli altri pacchetti).

## Da documentare

Testi pronti per il pacchetto documentazione (io non tocco i file di documentazione).

### §19 — riga nuova

- **D-126** (08/11/2026): Totali e differenze degli importi dal server. I totali in fondo alle tabelle di Liquidazioni
  (subagenti e documenti), del Report subagenti e dell'Analisi, e la differenza riga per riga del Bollettino arrivano
  nella risposta del server (`totali`, `differenza`); la DataTable li mostra senza sommare. La somma nel browser resta
  solo per le colonne che non sono importi. Perché: sommare in virgola mobile i valori arrivati può far differire di
  centesimi il piede della tabella dalla nota del pannello (che usa il totale del server), e nessuno dei due sarebbe
  «quello vero» (V12, D-28). Chi: Ugo. Dove: `liquidazione`/`reportSubagenti` in `app/backend/src/liquidazioni.ts`,
  `pagina` in `app/backend/src/analisi.ts`, `DataTable.tsx` (prop `totali`), `VistaLiquidazioni.tsx`, `VistaAnalisi.tsx`.

### §16.4 / §16.4.1 — riga *Perché*

> *Perché*: il piede delle tabelle non somma più gli importi nel browser: i totali (`totali`) arrivano già calcolati
> dal server (V12, D-126) e la DataTable li mostra; `totale:'somma'` resta solo il segnaposto della colonna e la somma
> nel browser vale per le colonne che non sono importi.

### Guida (`app/frontend/lib/guida.ts`)

> **Da sapere** — I totali delle colonne degli importi (Liquidazioni, Report subagenti, Analisi) arrivano dal server:
> la tabella li mostra senza ricalcolarli, così il piede e i numeri del pannello concordano sempre al centesimo.

### Piano (`piano-lavoro-crm.md`)

> Attività collaudo onda 5, pacchetto 5-04 (A5-08, D-126 parte 1): totali dal server in Liquidazioni/Report/Analisi,
> prop `totali` nella DataTable, prove. Ore: da approvare (allineare con il piano dell'onda).

### README (`app/README.md`)

> Nessuna nota specifica richiesta: nessuna nuova dipendenza, tabella o configurazione.
