# Resoconto collaudo · Onda 2 · Pacchetto 2-11 — Tipo di provvigione del fornitore fisso dopo la prima chiusura

Esecutore: DeepSeek V4 · Data: 13/11/2026 · Gravità P2 · Rilievo U8 → D-121

## Stato

Finito. Correzione applicata, prove a 0 KO, database di prova cancellato.

## Cosa ho fatto

### U8 — Tipo di provvigione fisso dopo la prima chiusura (D-121)

- `app/backend/src/fornitori.ts`, `modifica` (PUT /api/fornitori/:id): dopo il confronto prima/dopo e prima dell'update, se `tipo_provvigione` cambia e `ultimaChiusura(tx, prima.id)` non è null → `ConflictException` «Il tipo di provvigione non si cambia dopo la prima chiusura (bollettino verificato o trimestre liquidato)». La riga del fornitore è già bloccata da `fornitoreBloccato` (SELECT … FOR UPDATE, V13). `giorno_bollettino` e `giorni_incasso` restano liberi.
- `app/backend/test/fornitori.spec.ts`: nuovo describe «tipo di provvigione fisso dopo la prima chiusura (D-121)» con due prove (con chiusura → 409 tipo / 200 giorni_incasso; senza chiusure → 200 tipo).

## Prove

- [x] `npx jest test/fornitori.spec.ts test/percentuali.spec.ts` → **41/41, 0 KO**
- [x] `npx tsc --noEmit` → 0 errori
- [x] `git diff --name-only` / `git status --short`: tocco solo `app/backend/src/fornitori.ts`, `app/backend/test/fornitori.spec.ts`, `strumenti/opencode/resoconto-collaudo-2-11.md` (gli altri file modificati sono di altri pacchetti in parallelo)
- [x] database `decobrands_test_2_11` cancellato, cartella temporanea rimossa
- Prove nel browser: nessuna nuova schermata; `app_fornitori.py` da lanciare a fine onda (non toccata).

## Da documentare

(testo pronto per il pacchetto documentazione)

- **§19, riga D-121**: data 08/11/2026 — «Il tipo di provvigione del fornitore (fatturato/maturato) non cambia dopo la prima chiusura: 409 se il fornitore ha già una chiusura (bollettino verificato o trimestre liquidato, `ultimaChiusura`). `giorno_bollettino` e `giorni_incasso` restano liberi.» Perché: senza vincolo, cambiando il tipo si ricalcolerebbe tutto il passato (Analisi e Report subagenti dei mesi chiusi) con la regola nuova; la fotografia della liquidazione resta, i numeri dal vivo no. Chi: Ugo. Dove: `app/backend/src/fornitori.ts` (modifica).
- **Spec §5.5 (Perché)**: il tipo di provvigione è una regola strutturale dei soldi: si può scegliere solo finché il fornitore non ha chiusure.
- **Guida (`lib/guida.ts`)**: nella pagina Fornitori, «da sapere»: il tipo di provvigione non si cambia dopo la prima chiusura (bollettino verificato o trimestre liquidato).
