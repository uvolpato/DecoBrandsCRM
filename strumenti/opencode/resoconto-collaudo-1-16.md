# Resoconto · Collaudo onda 1 · Pacchetto 1-16 — Sollecito di pagamento: tempo limite e fatture già pagate

Data: 12/11/2026 · Esecutore: DeepSeek V4 Flash · Rilievi: A3-07, A7-25 (solo parte incassi) · Esito: **corretto**

## Cosa ho fatto

### A3-07 — Sollecito: transazione da 5 s e fatture pagate dopo la lettura

Il rilievo era ancora aperto nel codice attuale: `updateMany` c'era già ma senza il filtro sullo
stato e senza `count`, e il `$transaction` usava il tempo limite predefinito (5 s).

- `app/backend/src/incassi.ts:98` — `$transaction(…, { timeout: 30_000 })`, come
  `liquidazioni.ts:174`; commento `ponytail:` che rimanda ad A7-25/A7-21 per il caricamento parziale.
- `app/backend/src/incassi.ts:104-110` — dopo il `FOR UPDATE` il filtro è
  `{ id: { in: ids }, stato_incasso: { not: 'pagata' } }`: una fattura segnata *pagata* fra la
  lettura e il blocco non riceve il +1. Lo stesso filtro vale per il `_max` dei solleciti, così
  il numero restituito è coerente con le righe davvero aggiornate.
- `app/backend/src/incassi.ts:111` — se `updateMany` restituisce `count = 0` (tutte le fatture
  diventate pagate) la transazione si ferma con 404, senza scrivere l'evento.
- `app/backend/src/incassi.ts:114-116` — risposta ed evento usano `aggiornate.count` al posto di
  `voci.length` / elenco numeri.
- `app/backend/test/incassi.spec.ts:139-156` — nuovo caso: una fattura portata a `pagata` prima
  della chiamata non riceve il +1 e resta fuori dal conteggio, mentre l'altra fattura dello stesso
  cliente viene sollecitata.

### A7-25 — Solo la parte `incassi.ts`

Fatto quanto sopra (coincide con A3-07). **Non** ho toccato `liquidazioni.ts` né `motore/dati.ts`:
il resto del rilievo dipende da A7-21 e non è fra i file ammessi di questo pacchetto.

## Prove lanciate (database `decobrands_test_1_16`, creato e cancellato)

- `npx jest test/incassi.spec.ts` → **8/8 passati, 0 KO**.
- `npx tsc --noEmit` (backend) → **0 errori**.
- Database `decobrands_test_1_16` creato, `prisma migrate deploy` applicato, poi **DROP**.
  Nessun contatto con `decobrands_db`, con `decobrands_test` condiviso né con Integra.
- `git status --short` / `git diff`: fra i miei file solo `app/backend/src/incassi.ts` e
  `app/backend/test/incassi.spec.ts` (più questo resoconto). Gli altri file modificati nel
  repository sono di altri pacchetti della stessa onda o lavoro precedente.

### Prove nel browser

Il rilievo è solo backend (tempo limite e concorrenza), nessuna vista cambiata. Non ho lanciato
prove `app_*.py` e non ne ho modificate. Niente da lanciare a fine onda per 1-16.

## Rilievi aperti / cose da sapere

- A3-07 chiuso. A7-25 resta aperto per la parte `liquidazioni.ts` / `motore/dati.ts` (dipende da
  A7-21), come previsto dal pacchetto.
- Nessuna correzione va contro il §19: restano validi V12 (solo backend) e V13 (una transazione).
- La transazione legge ancora tutto il database (`caricaDati`): il tetto dei 30 s è annotato con
  `ponytail:` e va rivisto quando il motore sarà indicizzato (A7-21).

## Da documentare

**Nulla.** È una correzione tecnica interna (tempo limite, filtro sullo stato, `count`): nessuna
regola nuova, nessun testo d'interfaccia o guida, nessuna ora di piano da cambiare. Niente per
README o §19.
