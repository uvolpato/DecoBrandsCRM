# Resoconto F1-A12 — Storico dei legami del vecchio CRM (D-112)

Sessione DeepSeek V4 Pro, senza sottoagenti. Database reale dell'app: `decobrands_db`; prove e import
di verifica eseguiti **solo** su `decobrands_test` (mai su `decobrands_db` né `decobrands_import`).

## File toccati

| File | Cosa |
|---|---|
| `app/backend/prisma/schema.prisma` | modelli `interscambio_storico` e `soggetti_storico` (in coda, sezione "Storico dei legami") |
| `app/backend/prisma/migrations/20261112090000_storico_legami/migration.sql` | nuova migrazione (tabelle, CHECK, indici, UNIQUE) |
| `app/backend/prisma/import-storico.ts` | nuovo comando `npm run import:storico` |
| `app/backend/package.json` | script `import:storico` |
| `app/backend/src/storico.ts` | `cercaLegame`, `segnaUsata`, `normalizzaPiva`/`normalizzaCF`, rotta `GET /api/interscambio/storico` |
| `app/backend/src/app.module.ts` | registrato `StoricoController` |
| `app/backend/test/svuota.ts` | aggiunte le due tabelle al TRUNCATE (prove pulite) |
| `app/backend/test/storico.spec.ts` | prove (10) |

## Forma delle due tabelle

`interscambio_storico` (§4.7.2): `id`, `fonte` (`vecchio_crm`, CHECK), `estratto_il` DATE,
`cliente_legacy_id`/`fornitore_legacy_id` BIGINT, `cliente_codice_fornitore`, `cliente_ragione_sociale`,
`cliente_piva`, `cliente_piva_norm`, `cliente_cf`, `fornitore_ragione_sociale`, `fornitore_piva`,
`agente_nome`, `subagente_nome` (NULL = non rappresentato), `sconto_1`/`sconto_2` NUMERIC(5,2),
`cliente_id`/`fornitore_id`/`subagente_id`/`interscambio_id` BIGINT NULL (nessuna FK),
`stato` (`da_usare`|`usata`|`scartata`, CHECK), `nota`, `creato_il`, `usato_il`.
Indici: UNIQUE `(fonte, cliente_legacy_id, fornitore_legacy_id)`, `(fornitore_piva, cliente_codice_fornitore)`,
`(cliente_codice_fornitore)`, `(stato)`, `(cliente_piva_norm)`, `(subagente_nome)`.

`soggetti_storico` (§4.7.3): `id`, `legacy_id` UNIQUE, `ragione_sociale`, `nome`, `cognome`, `piva`,
`piva_norm`, `codice_fiscale`, `cf_norm`, `indirizzo`, `cap`, `citta`, `provincia` CHAR(2), `paese`
CHAR(2), `email`, `telefono`, `sorgente` (`vecchio_crm`, CHECK), `creato_il`.

## Numeri veri dell'import (file di `dati-crm-legacy/`)

```
Import completato: 3403 soggetti_storico, 4022 interscambio_storico
righe lette 4022 (1625 senza subagente, 969 senza P.IVA cliente, 443 senza P.IVA fornitore, 0 senza riscontro in clienti.jsonl)
già presenti (2° giro): 3403 soggetti, 4022 legami  → idempotente
scarti (2): scheda_non_leggibile 1619 e 787 (errore 500 nel vecchio CRM, esclusi dai 3403)
```

- `soggetti_storico` = 3403 = 3405 schede di `clienti.jsonl` meno le 2 con `scheda_errore`.
- `senza subagente` = 1625 (coincide col brief).
- `ISA PACKAGING` (38 righe) si risolve per **nome normalizzato**: in `fornitori.json` la voce ha uno
  spazio finale (`"ISA PACKAGING "`); come in `import-vecchio-crm.ts` il confronto è sul nome
  normalizzato, quindi `fornitore_non_trovato = 0`.

## Matching (`cercaLegame`) e rotta

Precedenza confermata dalle prove: **codice cliente del fornitore (esatto) → P.IVA cliente →
ragione sociale normalizzata** (solo proposta, mai fusione). Al massimo 5 righe. `segnaUsata(tx, id,
interscambioId, nota)` dentro la transazione di chi crea l'agenzia. Rotta
`GET /api/interscambio/storico?fornitore_id=&cliente_id=&codice=` (`dati.consulta`), con campo
`rappresentato` (falso = subagente vuoto).

## Prove

- `test/storico.spec.ts`: **10 prove, tutte passate** (conteggi 4022/3403, 1625 senza subagente,
  idempotenza, `--prova` non scrive, precedenza matching, `rappresentato` falso, 403 senza
  `dati.consulta`, nessuna FK).
- `npx jest --runInBand` (suite completa): **38 suite, 547 test, 0 KO** (prima di 3 ritocchi
  isolati a `storico.spec.ts`/`import-storico.ts`; la suite storico è stata poi rilanciata a 10/10).
- `npx tsc --noEmit`: pulito.
- Import provato su `decobrands_test` con i file veri (eseguito, idempotente, `--prova` con rollback).

Nota: in uscita c'è un `DeprecationWarning` del driver `pg` ("Calling client.query() …") durante i
`createMany` — pre-esistente (viene anche dagli altri import), innocuo. La suite completa chiude con
un "Failed to prune sessions" di `connect-pg-simple` dopo la fine dei test: anche questo è
pre-esistente (il pool delle sessioni viene chiuso da `app.close()`), non introdotto qui.

## Controlli caricati

Caricate davvero `ponytail-review` e `postgresql-code-review` a fine lavoro (oltre a `ponytail`
attivo). Rilievi veri applicati: (1) i conteggi "senza …" ora si calcolano su **tutte** le righe
lette, non solo su quelle inserite (prima su un secondo giro uscivano 0); (2) gli scarti delle schede
non leggibili sono entrati nel `report.scarti` (un solo elenco); (3) id legacy delle prove spostati su
9001+ per non collidere con i dati veri.

## Dubbi / scelte da confermare

1. **`cliente_piva_norm`**: è nell'elenco indici della spec §4.7.2 ma **non** nella lista colonne.
   Ho aggiunto la colonna `VARCHAR(20) NOT NULL DEFAULT ''` (come `soggetti.piva_norm`). Da allineare
   in spec.
2. **Normalizzazione P.IVA**: ho usato la variante che toglie il prefisso `IT` (come
   `soggetti.ts`/`integra.ts`/`import-vecchio-crm.ts`), non `proposta.ts` `normalizzaPiva` (che non
   lo toglie). Motivo: `clienti_versioni.piva` da Integra è già senza `IT`, quindi il confronto in
   `cercaLegame` richiede di toglierlo anche dallo storico. `import-vecchio-crm.ts` ha le funzioni
   giuste ma **non è importabile** (script con `void main()`, nessun export); ho quindi centralizzato
   la stessa normalizzazione in `storico.ts` (esportata) e riusata da `import-storico.ts`. Da
   `proposta.ts` riuso `normalizzaNome` (esportata) per nomi/ragioni sociali.
3. **`soggetti_storico.nome`/`cognome`** restano `NULL`: i clienti del vecchio CRM sono aziende;
   si riempiono quando servirà importare persone.
4. `soggetti_storico.piva_norm` **senza CHECK** (il master `soggetti` ce l'ha): è una fotografia
   storica, si conserva anche una P.IVA corta senza scartarla.

## Righe da aggiungere (NON applicate: non tocco spec/piano/avanzamento)

**spec §19 (D-112, integrazione):** "l'import dello storico (F1-A12) aggiunge `cliente_piva_norm`
per l'indice, assente nell'elenco colonne §4.7.2; i 2 clienti con `scheda_errore` (1619, 787) non
entrano in `soggetti_storico`; `ISA PACKAGING` si risolve per nome normalizzato (spazio finale in
`fornitori.json`); 969 legami senza P.IVA cliente e 443 senza P.IVA fornitore."

**piano §12 / `avanzamento-app.md`:** attività F1-A12 consegnata: migrazione, `import:storico`
idempotente con `--prova`/`--sostituisci`, `cercaLegame`/`segnaUsata`, rotta
`GET /api/interscambio/storico`, 10 prove; ore da confermare.

## Controllo della sessione principale (11/11/2026)

- Riletto il diff: migrazione senza FK e con CHECK/indici; comando in una transazione con evento
  nello stesso `tx`; rotta con `dati.consulta` e DTO validato; nessuna interpolazione SQL.
- **Ritocco applicato**: `cercaLegame` risponde `[]` se non ha il fornitore (un codice cliente da
  solo è il codice di *quel* fornitore: proporre l'agenzia sbagliata è peggio che non proporla).
- Import eseguito su **`decobrands_db`**: 4022 legami, 3403 schede, 1625 senza subagente, evento
  `crud.create` su `import` scritto.
- `tsc` pulito; `test/storico.spec.ts` 10/10 dopo il ritocco; `test/sistema.spec.ts` +
  `test/casella.spec.ts` 30/30 (il messaggio di errore della casella in chiusura è rumore noto).
- Suite completa rilanciata dopo il ritocco (esito nel commit).

