# Resoconto pacchetto 1-01 — Motore: storni dalla fotografia, una fattura al mese, correzioni su NC, numero riusato

Data: 08/11/2026 · Esecutore: DeepSeek V4 · Gravità: P0 · Rilievi: A2-01 (solo punto 2), A2-02, A2-03, A2-05, A6-13 (seconda prova), A2-08, A8-06

## Cosa ho fatto

Tutte le correzioni toccano il motore (`motore.ts`, `dati.ts`), le relative prove e una riga del prototipo. Nessun calcolo del seed cambia (le prove che àncorano i numeri di §12 passano identiche).

### A2-01 (punto 2) — storno/riaccredito dalla fotografia

`app/backend/src/motore/dati.ts`:

- nuovo tipo `FotoDoc` (riga della fotografia: importi come testo, pct come numero);
- in `componi` nuovo campo `fotografie`: `Map<documento_id, {subagente_id, provvigione, pct, importo}>` costruita da `liquidazioni.totali.documenti` (solo le righe senza `voce`, cioè i documenti liquidati, non gli storni).

`app/backend/src/motore/motore.ts` (righe 388–404):

- nella riga di storno/riaccredito, se `n.doc.liquidazione_id` è valorizzato, la voce riprende `subagente_id`, `pct`, `importo` e `provvigione` (col segno della voce) dalla fotografia, invece di `quotaSub` ricalcolato sull'agenzia attuale. Così un cambio d'agenzia dopo la liquidazione non sposta le provvigioni passate (D-35). Il punto 1 (blocco delle agenzie) resta al pacchetto 1-02.

### A2-02 — una fattura al mese con la liquidata

`motore.ts` (`fatturaDelMese`): se fra le fatture del mese ce n'è una con `liquidazione_id`, vince quella (la più vecchia per liquidazione, da `liquidazioni_chiuse`), prima di `prima`/`piu_alta`; la tardiva va a quota 0.

### A2-03 — importo fisso su nota di credito

`motore.ts` (`quotaSub`, ramo `cor.tipo === 'importo'`): `const v = imp.isNegative() ? cor.valore.neg() : cor.valore;` e `v` usato per `provvigione` e `pct`. Allineata la sola riga in `prototipo-alternativo/assets/motore.js` (`M.quotaSub`).

### A2-05 — numero riusato in due anni

`motore.ts` (`trovaDocumento`): ora accetta `data?` ed `entro?`. Con `data` (la data della riga) vince il documento dello stesso giorno; senza data, il più recente con `data ≤ entro` (fine del mese del bollettino). `documentoDiRiga` e `riconcilia` passano `r.data` e `fineMese(b.anno, b.mese)`.

### A2-08 — importo riga al mezzo contabile

`dati.ts` (`riga`): `ROUND_HALF_CEIL` → `ROUND_HALF_UP`, così −0,005 → −0,01 (D-49) anche sui resi.

### A8-06 — codice morto

`motore.ts`: cancellato `importoRighe` (mai usato). `elencoSezioni` di `impostazioni.ts` resta al pacchetto che se ne occupa.

## Prove

- `app/backend/test/motore.spec.ts`: 4 nuovi casi (A2-02, A2-05, A6-13, A2-08).
- `app/backend/test/correzione.spec.ts`: 1 nuovo caso (A2-03, «importo fisso su nota di credito → provvigione negativa»).
- `app/backend/test/liquidazioni.spec.ts`: 1 nuovo caso (A2-01, «storno di una fattura liquidata → voce = −provvigione della fotografia, allo stesso subagente, anche se l'agenzia è cambiata»).

## Prove lanciate (database `decobrands_test_1_01`, cancellato alla fine)

| Prova | Esito |
|---|---|
| `npx tsc --noEmit` (backend) | 0 errori |
| `npx prisma migrate deploy` sul database di prova | tutte le migrazioni applicate |
| `npx jest test/motore.spec.ts test/correzione.spec.ts test/liquidazioni.spec.ts` | **3 suite, 47 prove, 0 KO** |
| `npx jest test/analisi.spec.ts test/seed.spec.ts test/bollettino.spec.ts` | **3 suite, 43 prove, 0 KO** |
| `git diff` / `git status --short` | toccati solo i file ammessi (`motore.ts`, `dati.ts`, `motore.spec.ts`, `correzione.spec.ts`, `liquidazioni.spec.ts`, `prototipo-alternativo/assets/motore.js`); gli altri file modificati sono dei pacchetti dell'onda in parallelo |

Database `decobrands_test_1_01` creato, migrato, usato e **cancellato** alla fine. Mai toccati `decobrands_db`, `decobrands_test` condiviso, né Integra (192.168.239.49). Nessun numero del seed cambia: `seed.spec.ts`, `motore.spec.ts` e `analisi.spec.ts` passano con gli stessi valori attesi.

## Prove nel browser da lanciare a fine onda

Nessuna: le correzioni sono nel motore (backend) e il prototipo non ha una prova obbligatoria. Nessun file del frontend `app/` toccato.

## Da documentare (per il pacchetto documentazione)

**Nessuna decisione nuova (D-nn)**: le correzioni allineano il motore a decisioni già esistenti (D-35, D-27, D-34, D-49), non le cambiano. Servono solo le righe *Perché*.

**Riga *Perché* in §5.14 (storni) / §5.6 (liquidazioni)**: «Uno storno o un riaccredito di un documento già liquidato riprende subagente e provvigione dalla fotografia della liquidazione che l'ha pagato (non li ricalcola sull'agenzia attuale): così un cambio d'agenzia dopo la chiusura non sposta le provvigioni passate né le manda al subagente sbagliato (D-35, A2-01).»

**Riga *Perché* in §5.2 (una fattura al mese e correzioni)**: «Se una fattura del mese è già liquidata, è lei la "fattura del mese" anche se una tardiva vincerebbe `prima`/`piu_alta`: il mese è consumato e la tardiva va a quota 0 (D-27, A2-02). La correzione a importo fisso su una nota di credito vale col segno invertito (il valore digitato è sempre positivo e indica una riduzione): −10 e non +10 (A2-03).»

**Riga *Perché* in §4.2.7 / D-34 (numero riusato)**: «Il numero da solo non identifica un documento: un fornitore può riusarlo in un altro anno. Per una riga di bollettino non abbinata si preferisce il documento con la stessa data della riga; senza data, il più recente entro la fine del mese del bollettino (A2-05).»

**Guida (`app/frontend/lib/guida.ts`)**: nessun testo nuovo per l'utente (comportamenti interni del calcolo).

**Piano (`piano-lavoro-crm.md`)**: rilievi già nel `piano-correzioni` (A2-01, A2-02, A2-03, A2-05, A6-13, A2-08, A8-06); nessuna ora nuova.

**README**: nulla (solo backend).
