# Resoconto — Le percentuali non si sommano (D-166)

P0. Regola nuova: `pct_agente` è la provvigione totale che il fornitore riconosce a Decobrands;
`pct_subagente` è la parte girata al subagente, presa da quella; il margine è la differenza.
`dal fornitore = importo × pct_agente / 100`, non più `pct_agente + pct_subagente`.

## Cosa è cambiato

**Motore (`app/backend/src/motore/motore.ts`)**
- `percentuali()`: `dal_fornitore = sc.pct_agente` (era `sc.pct_agente.plus(sc.pct_sub)`). Tutti gli
  usi di `dal_fornitore` (bollettini/riconciliazione, liquidazioni, Analisi, pratiche) sono corretti di
  conseguenza: `prese` = solo la % di Decobrands, `margine = prese − pagate` già calcolato così.

**Fornitori (`app/backend/src/fornitori.ts`)**
- `percentualiFornitore`: `dal_fornitore = pct_agente` (era la somma).
- Validazione nuova `controllaPct`: in `nuovePercentuali` e `correggiPercentuali` rifiuta se
  `pct_subagente > pct_agente` (400 con messaggio «supera»).
- Helper esportati `pctAgenteAllaData` / `controllaQuotaSubagente`: la % del subagente (eccezione
  personale o agenzia) non supera la % dal fornitore dello scaglione in vigore. Usati in `crea`,
  `cambia` e `modifica` delle eccezioni.

**Clienti (`app/backend/src/clienti.ts`)**
- Agenzie (`creaAgenzia`, `modificaAgenzia`): se `pct_subagente` è valorizzato, rifiuto 400 se supera
  il `pct_agente` dello scaglione in vigore per quello sconto/valido_dal.

**Pratiche (`app/backend/src/pratiche.ts`)**
- `provvigione` ora espone anche `margine` (euro) e `margine_pct` (differenza fra % dal fornitore e % al
  subagente), oltre a `a_decobrands` (prese) e `a_subagente` invariate nel senso.

**Frontend**
- `FormPercentuali.tsx`: etichette «Provvigione dal fornitore %» / «di cui al subagente %» + controllo
  lato client `pct_subagente ≤ pct_agente`.
- `VistaFornitori.tsx`: colonne «Dal fornitore» / «di cui al subagente» / «Margine Decobrands»
  (= `pct_agente − pct_subagente`); Nota aggiornata.
- `VistaPratica.tsx`: righe «Da … a Decobrands: X %», «di cui al subagente …: Y %», «Margine
  Decobrands: Z %»; interfaccia `Provvigione` con `margine`/`margine_pct`.
- `guida.ts`: due testi allineati (form scaglioni e «Nuove percentuali»).

**Prototipo**
- `motore.js`: `dal_fornitore = sc.pct_agente` (+ commenti). `viste-anagrafiche.js`: etichette
  «Dal fornitore», «di cui al subagente», «Margine Decobrands» (= `pct_agente − pct_sub`), etichetta
  campo «provvigione dal fornitore %».

**Seed (dati) — fuori dall'elenco stretto, necessario per coerenza**
- `app/backend/prisma/seed/dati-prova.json` e `prototipo-alternativo/assets/dati.js` (i due file vanno
  tenuti identici): i bollettini del seed riportavano come `pct_riconosciuta`/`importo_riconosciuto` la
  SOMMA (es. 28 % per Gries sconto 0). Portati alla sola % di Decobrands:
  F-2026-0815 28→18 (1568→1008), F-2026-0840 7→5 (786,80→562), F-2026-0891 7→5 (1083,60→774),
  NC-2026-005 28→18 (−367,08→−235,98), F-2026-0858 28→18 (617,34→396,86),
  F-2026-0907 18→12 (1676,25→1117,50), F-2026-0921 21→14 (835,80→557,20),
  F-2026-0822 18→12 (−441→−294), F-2026-0930 32→20 (1360→850). F-2026-0912 invariata (17,5 %, era già
  «agente −0,5 di promozione», sconto 1 con pct_sub 0).
  NB: `dati.js` (prototipo) non era nell'elenco dei file ammessi; serve per tenere coincidenti i numeri
  del prototipo e del seed (CLAUDE.md §6). Documentato qui.

## Numeri prima → dopo (riferimenti)

- Esempio del pacchetto (Gries sconto 0 %, fattura 1.000 €): dal fornitore 280 → 180, al subagente 100,
  margine 180 → 80.
- NC-2026-005 (−1.311 €, Gries sconto 0 %): prese −367,08 → −235,98.
- Analisi ott 2025–set 2026: prese 12.976,26 → 9.045,12; margine 8.848,92 → 4.917,78 (fatturato
  79.534,06 e pagate 4.127,34 invariati).
- Oggi 3° trimestre 2026: atteso (prese) 8.069,60 → 5.773,62; riconosciuto 5.909,41 → 4.310,08.
- Report subagente Marco Nista Q3: margine 1.800 → 840 (margine_su_prese 65,22 % → 46,67 %).

## Query di sola lettura (da lanciare su `decobrands_db`, a cura di Claude Code)

```sql
-- scaglioni che violano il vincolo
SELECT id, fornitore_id, sconto_min, pct_agente, pct_subagente, valido_dal
FROM provvigioni_scaglioni WHERE pct_subagente > pct_agente;

-- eccezioni personali che superano la % dal fornitore (per sconto; versione in vigore)
SELECT e.id, e.fornitore_id, e.subagente_id, e.sconto_min, e.pct_personale,
       s.pct_agente, e.valido_dal
FROM provvigioni_eccezioni e
JOIN provvigioni_scaglioni s
  ON s.fornitore_id = e.fornitore_id AND s.sconto_min = e.sconto_min
WHERE e.pct_personale > s.pct_agente;

-- agenzie con % al subagente oltre lo scaglione in vigore alla data
SELECT a.id, a.cliente_id, a.fornitore_id, a.sconto, a.pct_subagente, s.pct_agente
FROM interscambio a
JOIN LATERAL (
  SELECT sconto_min, pct_agente
  FROM provvigioni_scaglioni s
  WHERE s.fornitore_id = a.fornitore_id AND s.sconto_min <= a.sconto AND s.valido_dal <= a.valido_dal
  ORDER BY s.sconto_min DESC, s.valido_dal DESC
  LIMIT 1
) s ON true
WHERE a.pct_subagente IS NOT NULL AND a.pct_subagente > s.pct_agente;
```

Sul seed (`decobrands_test_nonsomma`) nessuna di queste tre query restituisce righe.

## Prove

- `npx tsc --noEmit` backend e frontend: puliti.
- Jest (0 KO) su `decobrands_test_nonsomma`: motore (26), percentuali (35), clienti (41), fornitori (26
  con pratiche), bollettini+bollettino (32), liquidazioni+analisi+oggi (48), seed+incassi+vincoli+
  motore-volumi (55), correzione (parte del giro).
- Prove nuove: rifiuto scaglioni 400 (`percentuali.spec`), eccezione 400 (`percentuali.spec`), agenzia 400
  (`clienti.spec`), atteso del bollettino = solo `pct_agente` (motore.spec riconciliazione).
- Prove browser aggiornate (solo `python -m py_compile`): `app_bollettino.py`, `app_flusso.py`,
  `app_liquidazioni.py` con i nuovi importi; il giro lo lancia Claude Code.

## Aperti / note

- `documenti-pratica.spec.ts` (riga 350, `toMatch(/scaglione/)`) è un fallimento PRE-ESISTENTE, non di
  questo pacchetto: il messaggio D-162 in `documenti.ts` è stato cambiato in v0.2.5 (commit 6f97568) in
  «…non ha ancora le percentuali delle provvigioni… senza, la provvigione sarebbe zero», che non contiene
  più «scaglione»; la prova non è stata riallineata. È di competenza della slice documenti.
- Vincolo su dati già salvati: da verificare con le query qui sopra su `decobrands_db` (non toccato).
- Non toccati (file altrui/paralleli): `proposta.ts`, `documenti.ts`, `VistaDocumento.tsx`,
  `CampoRicerca.tsx`, `stile.css`, `guida.ts` (riga «pallino verde» del pacchetto parallelo conservata).
- Schema/migrazioni: non toccati (nessun CHECK aggiunto; se serve un CHECK in database, lo decide Ugo).

## Da documentare (spec)

- §4.2.2: la tabella degli scaglioni e l'esempio Gries — «atteso dal fornitore = provv_agente +
  provv_subagente» va sostituita: `pct_agente` è la provvigione totale dal fornitore, `pct_subagente` è
  «di cui al subagente», margine = differenza.
- §5.1: pseudocodice `dal fornitore(d) = importo × pct_agente / 100` (atteso nel bollettino);
  `al subagente(d)` come oggi; `margine(d) = dal fornitore(d) − al subagente(d)`.
- §5.x (bollettini/riconciliazione a cerniera): l'atteso della riga è `importo × pct_agente`, non la somma.
- §5.x (liquidazioni, Analisi): «prese» = `importo × pct_agente`; «margine Decobrands» = prese − pagate.
- §19: **D-166** — il fornitore paga a Decobrands una sola provvigione (`pct_agente`); Decobrands ne gira
  una parte al subagente (`pct_subagente`); il margine è la differenza. Vincolo nuovo `pct_subagente ≤
  pct_agente` (rifiutato dal server).
