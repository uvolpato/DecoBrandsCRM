# Collaudo · Onda 0 · Pacchetto 0-06 — Schema e database allineati (deriva dei soggetti e dello storico)

Data: 12/11/2026 · **Esecutore: DeepSeek V4** · Gravità del pacchetto: **P3** · Rilievi: O0-12 · Piano: `strumenti/collaudo/piano-correzioni.md`.

Si lancia **dopo** il commit del lavoro f7 e la chiusura dell'onda precedente. Dipende da: 0-05 (`collaudo-0-05-sconti-restrict.md`), onda 0 committata.

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


## Rilievo da correggere (riepilogo dell'onda 0, punto 12)

### O0-12 — Lo schema Prisma e il database non coincidono (deriva del lavoro f7)
- Gravità: P3
- Dove: `app/backend/prisma/schema.prisma` (modelli `soggetti`, `interscambio_storico`) e migrazioni del 08–12/11.
- Problema: `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` su un database appena migrato propone `DROP INDEX soggetti_cf_norm_idx`, `DROP INDEX soggetti_piva_norm_idx`, `ALTER COLUMN soggetti.codice SET DEFAULT …` e tre `RENAME INDEX` su `interscambio_storico_*` (nomi corti nel database, lunghi nello schema).
- Scenario: il prossimo `prisma migrate dev` genera da solo una migrazione che **toglie** i due indici dei soggetti usati da `controlloDuplicati` e dalla ricerca → ricerca lenta e controllo dei doppioni senza indice, senza che nessuno l'abbia deciso.
- Correzione puntuale: per ogni differenza decidi da che parte sta la verità **leggendo la migrazione che l'ha creata**:
  - indici `soggetti_cf_norm_idx` / `soggetti_piva_norm_idx`: servono (deduplica, D-102) → **aggiungili allo schema** (`@@index([...], map: "...")`, con l'espressione o la condizione `WHERE` esatte se sono parziali; se Prisma non sa esprimerli, scrivi un commento nello schema come per i CHECK e lascia la migrazione com'è);
  - default di `soggetti.codice`: allinea lo schema a quello che fa la migrazione (sequenza/funzione), senza cambiare i codici esistenti;
  - indici di `interscambio_storico`: metti `map: "<nome nel database>"` nello schema, **nessuna** migrazione di rinomina.
  Obiettivo: `migrate diff` vuoto. Solo se una differenza non si chiude dallo schema scrivi la migrazione `20261113150000_allinea_schema` (niente DROP di indici usati).
- Prova che la verifica: database nuovo `decobrands_test_0_06` → `npx prisma migrate deploy` → `migrate diff` **vuoto**; `npx prisma validate`, `npx prisma generate`, `npx tsc --noEmit`; `npx jest test/soggetti.spec.ts test/storico.spec.ts test/vincoli.spec.ts` 0 KO.
- Esecutore: DeepSeek V4 — schema e migrazioni.
- Dipende da / correlato a: D-102, F1-A8a/b, F1-A12.

Carica davvero (`skill`): `prisma-cli`, `postgresql-code-review`, `caveman`.

## File ammessi (solo questi)
- `app/backend/prisma/schema.prisma`
- `app/backend/prisma/migrations/20261113150000_allinea_schema/migration.sql` (solo se serve)
- `strumenti/opencode/resoconto-collaudo-0-06.md`

## Database e prove
Database proprio `decobrands_test_0_06` (via `DATABASE_URL_TEST`, come negli altri pacchetti dell'onda), cancellato alla fine. Mai `decobrands_db`, mai le porte 8001/8002, mai Integra.

## Criteri di fine
1. `migrate diff` vuoto su database nuovo, o differenza residua motivata nel resoconto.
2. Prove sopra 0 KO.
3. Resoconto `strumenti/opencode/resoconto-collaudo-0-06.md` (cosa, prove, *Da documentare*: nulla se non cambia regole).
4. Nessun commit, push, stash, reset o checkout.
