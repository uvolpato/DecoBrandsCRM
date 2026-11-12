# Collaudo · Onda 0 · Pacchetto 0-07 — Il PDF di un bollettino è «abbinato» (D-140)

Data: 12/11/2026 · **Esecutore: DeepSeek V4** · Gravità del pacchetto: **P3** · Rilievi: O0-08 · Piano: `strumenti/collaudo/piano-correzioni.md`.

Si lancia **dopo** il commit del lavoro f7 e la chiusura dell'onda precedente. Dipende da: 0-06 (`collaudo-0-06-allinea-schema.md`).

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


## Decisione di Ugo (12/11/2026)
- **D-140**: **il PDF di un bollettino, legato al bollettino del suo fornitore e mese (D-56), ha stato `abbinato`**, come un documento abbinato a una pratica. I documenti «da controllare» si contano con una regola sola, lo stato, senza filtri a parte.

## Rilievo da correggere (riepilogo dell'onda 0, punto 8)

### O0-08 — Il PDF di un bollettino resta `in_coda`
- Gravità: P3
- Dove: `app/backend/src/bollettini.ts:163` (creazione del bollettino con `arrivo_id`), `app/backend/src/oggi.ts:90` e `:111` (filtri `abbinato_bollettino_id: null`).
- Problema: legando il file al bollettino si scrive solo `abbinato_bollettino_id`; lo stato resta quello di prima (`in_coda`, `da_controllare`, `errore`). La pagina Oggi lo nasconde con un filtro a parte; altre liste (Documenti, conteggi, lettore) possono vederlo come da lavorare.
- Scenario: carico il PDF del bollettino Gries di ottobre e lo lego al bollettino → in Oggi non compare, ma lo stato dice «in coda» e il lettore può prenderlo come un documento da leggere.
- Correzione puntuale:
  1. **Prima** verifica (graphify + lettura di `lettore.ts`/`documenti.ts`) se oggi il lettore legge anche i PDF dei bollettini e se qualcosa usa quella lettura. Se **nessuno** la usa: in `bollettini.ts:163` scrivi anche `stato: 'abbinato', controllato_il: new Date()` (stesso `update`, stessa transazione). Se la lettura serve: il file resta in lettura e passa ad `abbinato` alla fine della lettura quando ha `abbinato_bollettino_id` (stesso punto in cui oggi diventa `da_controllare`). Scrivi nel resoconto quale dei due casi hai trovato.
  2. Rifiuta (409, come oggi per lo scartato) un file `in_lettura`? Solo se il caso 2 lo richiede; altrimenti nulla.
  3. Migrazione di dati `20261113160000_bollettino_abbinato`: `UPDATE documenti_in_arrivo SET stato = 'abbinato' WHERE abbinato_bollettino_id IS NOT NULL AND stato IN ('in_coda','da_controllare','errore');` (con commento D-140). Nessun CHECK nuovo.
  4. `oggi.ts`: i due filtri tornano alla regola unica sugli stati da controllare; togli `abbinato_bollettino_id: null` solo se dopo il punto 1 è davvero superfluo (un file legato al bollettino non può più avere uno stato da controllare). Numeri della pagina Oggi sul seed invariati.
- Prova che la verifica: `test/bollettini.spec.ts`: dopo `POST /bollettini` con `arrivo_id` il file ha `stato = 'abbinato'`; `test/oggi.spec.ts` 0 KO con numeri invariati; migrazione su database nuovo con un file del seed legato → `abbinato`.
- Esecutore: DeepSeek V4 — migrazione + due file.
- Dipende da / correlato a: D-54, D-56, D-74, A3-02 (0-01).

Carica davvero (`skill`): `prisma-cli`, `postgresql-code-review`, `caveman`.

## File ammessi (solo questi)
- `app/backend/src/bollettini.ts`, `app/backend/src/oggi.ts` (e `app/backend/src/lettore.ts` **solo** nel caso 2)
- `app/backend/prisma/migrations/20261113160000_bollettino_abbinato/migration.sql`
- `app/backend/test/bollettini.spec.ts`, `app/backend/test/oggi.spec.ts`
- `strumenti/opencode/resoconto-collaudo-0-07.md`

## Database e prove
Database proprio `decobrands_test_0_07` (via `DATABASE_URL_TEST`), cancellato alla fine. `npx prisma migrate deploy`, `npx tsc --noEmit`, `npx jest test/bollettini.spec.ts test/bollettino.spec.ts test/oggi.spec.ts test/documenti.spec.ts test/vincoli.spec.ts` 0 KO. Mai `decobrands_db`, mai le porte 8001/8002, mai Integra.

## Criteri di fine
1. Correzione fatta e caso del punto 1 scritto nel resoconto.
2. Prove sopra 0 KO.
3. Resoconto `strumenti/opencode/resoconto-collaudo-0-07.md` con *Da documentare*: riga D-140 del §19 (data, decisione, perché, chi: Ugo 12/11/2026, dove), riga *Perché* nella sezione dei bollettini della spec, guida se cambia un testo.
4. Nessun commit, push, stash, reset o checkout.
