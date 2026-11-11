# F1-A12 — Storico dei legami del vecchio CRM (D-112)

Lavoro da **DeepSeek V4 Pro** (`deepseek/deepseek-v4-pro`), una sessione sola, senza sottoagenti.
Leggi `CLAUDE.md` e `AGENTS.md`. Prima di cercare nei file usa `graphify query "<domanda>"`.
Carica le skill: `ponytail`, `prisma-cli`, `prisma-client-api`, `supabase-postgres-best-practices`,
`javascript-typescript-jest`. A fine lavoro carica davvero `postgresql-code-review` e
`ponytail-review`; applica i rilievi veri.

## Cosa si fa

Due tabelle di sola lettura per l'app, popolate una volta dai file del vecchio CRM, **tutte le
righe** (anche quelle che non si useranno mai). Non creano niente: propongono.

### 1. Migrazione `20261112090000_storico_legami`

Colonne e indici come §4.7.2 e §4.7.3 della specifica. In breve:

- `interscambio_storico`: `fonte` (`vecchio_crm`), `estratto_il`, `cliente_legacy_id`,
  `fornitore_legacy_id`, `cliente_codice_fornitore`, copie di testo (`cliente_ragione_sociale`,
  `cliente_piva`, `cliente_cf`, `fornitore_ragione_sociale`, `fornitore_piva`), `agente_nome`,
  `subagente_nome` **nullable**, `sconto_1`, `sconto_2`, `cliente_id`/`fornitore_id`/`subagente_id`/
  `interscambio_id` **nullable**, `stato` (`da_usare`|`usata`|`scartata`, CHECK), `nota`,
  `creato_il`, `usato_il`.
- `soggetti_storico`: `legacy_id`, `ragione_sociale`, `nome`, `cognome`, `piva`, `piva_norm`,
  `codice_fiscale`, `cf_norm`, `indirizzo`, `cap`, `citta`, `provincia`, `paese`, `email`,
  `telefono`, `sorgente`, `creato_il`.
- **Nessuna FK obbligatoria** verso `clienti`/`fornitori`/`subagenti`: sono la ragione per cui
  l'import massivo era fermo.
- Indici: `(fornitore_piva, cliente_codice_fornitore)`, `(cliente_codice_fornitore)`,
  `(stato)`, `(cliente_piva_norm)`, `(subagente_nome)`, e UNIQUE per l'idempotenza degli import
  (`(fonte, cliente_legacy_id, fornitore_legacy_id)`; `(legacy_id)` su `soggetti_storico`).

### 2. Comando `npm run import:storico`

Nuovo `prisma/import-storico.ts`. Riusa le funzioni di normalizzazione già presenti
(`import-vecchio-crm.ts`, `proposta.ts`: mai duplicarle).

- Legge `dati-crm-legacy/collegamenti.csv` (4022), `clienti.jsonl` (P.IVA/CF e recapiti del
  cliente) e `fornitori.json` (P.IVA del fornitore, per nome).
- Scrive sul database dell'app (`DATABASE_URL` → `decobrands_db`): `decobrands_import` è stato
  soltanto la prova di importazione del vecchio CRM, non è la destinazione (Ugo, 11/11/2026). Lo
  storico serve all'app in esercizio.
- Una transazione, idempotente (ON CONFLICT sull'UNIQUE), `--prova` (conta e non scrive),
  `--sostituisci` (cancella e ricarica, solo con conferma esplicita a video).
- Report finale: righe lette, inserite, già presenti, senza subagente (1625), senza P.IVA cliente,
  senza P.IVA fornitore, senza riscontro in `clienti.jsonl`; elenco degli scarti.
- La data dell'estratto va in `estratto_il` e nel registro (`crud.create` su `import`,
  `{etichetta, righe}`), non nei log.

### 3. Servizio `src/storico.ts` + rotta

- `cercaLegame(db, { fornitoreId?, fornitorePiva?, fornitoreNome?, codice?, clienteId? })`:
  precedenza **codice cliente del fornitore** (esatto) → **P.IVA cliente** → **ragione sociale
  normalizzata** (solo proposta, mai fusione automatica). Restituisce al massimo 5 righe con
  `subagente_nome`, `sconto_1`, `sconto_2`, `stato`.
- `segnaUsata(tx, id, interscambioId, nota)`: dentro la transazione di chi crea l'agenzia.
- `GET /api/interscambio/storico?fornitore_id=&cliente_id=&codice=` (`dati.consulta`) con le righe
  e il campo `rappresentato: boolean` (falso = subagente vuoto).

## Prove

- `test/storico.spec.ts`: conteggi (4022, 3403), 1625 senza subagente, idempotenza del comando,
  precedenza del matching (codice batte P.IVA batte nome), `rappresentato` falso, 403 senza
  permesso, nessuna FK (una riga si inserisce senza che esistano i ruoli).
- `npx jest --runInBand` **suite per suite**, 0 KO; `npx tsc --noEmit` in backend.
- Il comando si prova su `decobrands_test` con i file veri di `dati-crm-legacy/`.

## Regole

- Solo lettura per l'app: nessuna rotta che scrive nello storico, tranne `segnaUsata` chiamata da
  altre operazioni.
- Niente valori calcolati dal browser (V12); niente librerie nuove; codice minimo (ponytail).
- Non toccare `interscambio`, il motore, i server sulle porte 8001/8002 né `decobrands_db`.
- Italiano semplice; commenti con `// D-112`; niente commit, push, `.env`.

## Resoconto

Scrivi `strumenti/opencode/resoconto-f1-a12.md`: file toccati, forma delle due tabelle, report
dell'import con i numeri veri, matching, prove con numeri, controlli caricati, dubbi, e le righe da
mettere in spec §19/piano/`avanzamento-app.md` (non applicarle).
