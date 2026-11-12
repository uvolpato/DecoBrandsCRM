# Collaudo · Onda 0 bis · 0b-04 — correzioni 1 (dalla review di Claude Code, 12/11/2026)

**Esecutore: DeepSeek V4 Flash** · Gravità: **P3**

Prima di cominciare rileggi il tuo `resoconto-collaudo-0b-04.md`. Regole di lavoro: `regole-onda-parallela.md`, con il database `decobrands_test_0b_04c`.

## Rilievo

### C1 — P3 · `daIntegra` rifà due conteggi già noti
- **Dove**: `app/backend/src/soggetti.ts` ~472, la funzione `daIntegra`, chiamata a ogni apertura del dettaglio di un soggetto.
- **Problema**: quando nessun ruolo ha il codice di Integra, fa due `count` su `clienti` e `fornitori` con le loro versioni. Sono dati che `ruoliDi` ha già caricato.
- **Correzione**:
  - In `ruoliDi` aggiungi `fonte` al `select` della versione corrente.
  - Calcola «da Integra» in memoria: il ruolo ha un codice `integra`, **oppure** `corrente.fonte === 'integra'`.
  - Nel `PUT` del soggetto (blocco 409 di D-138) il controllo resta sul server, **dentro la transazione**. Lì la query può restare, ma una sola, non due.
- **Prova**: `test/soggetti.spec.ts` con 0 KO, senza cambiare le prove di D-138.

## File ammessi
- `app/backend/src/soggetti.ts`
- `app/backend/test/soggetti.spec.ts`
- `strumenti/opencode/resoconto-collaudo-0b-04-correzioni-1.md`

## Fine
- `test/soggetti.spec.ts` con 0 KO.
- `npx tsc --noEmit`.
- Resoconto.
- Carica davvero `caveman`.
