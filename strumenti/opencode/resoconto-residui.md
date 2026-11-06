# Residui chiusi: evento d'incasso alla verifica del bollettino (F3-A3) e pulsante Guida (F5-A8)

Data: 06/11/2026 · ramo `main` · nessuna migrazione.

## F3-A3 — evento sul documento alla verifica del bollettino

- `app/backend/src/bollettino.ts`: `eventiIncassi(tx, S, b, r, stato, ctx)` chiamata nella chiusura
  (`PUT /api/bollettini/:id/stato`), dentro la stessa transazione. Per le righe **nella** bollettino
  con storno, riaccredito o riconoscimento al pagamento confronta `statoIncasso` prima (bollettino
  `da_verificare`) e dopo (bollettino chiuso): se cambia, scrive `stato/change_state` sul `documento`
  con `{etichetta, prima: {stato_incasso}, dopo: {stato_incasso}, bollettino_id, tipo_riga}` (§15.2.5).
- `tipo_riga` = `storno`/`riaccredito` per quelle righe, `provvigione` per il riconoscimento al
  pagamento. Le righe «mancanti» del maturato (`id` nullo) non cambiano con questa chiusura e non
  producono eventi.
- Prova in `test/bollettino.spec.ts`: dopo la verifica del bollettino Gasper, il documento dello
  storno `F-2026-0822` ha l'evento con `dopo.stato_incasso = insoluta`.

## F5-A8 — pulsante Guida in ogni testata

- `app/frontend/componenti/Pagina.tsx`: aggiunge **Guida** alle azioni di ogni pagina, come ultima,
  secondaria e attiva anche in sola lettura; la rotta sceglie l'argomento (`/documenti` →
  `/guida/documenti`, `/pratiche/:id` → `/guida/pratiche`, `/` → `/guida/oggi`, …). La pagina
  `/guida/...` non ha il pulsante.
- Verificato nel browser: `/documenti` mostra *Guida*, apre `/guida/documenti`; a 768 px la testata
  non sfonda in larghezza.
- `lib/guida.ts` e i testi non cambiano: gli argomenti c'erano già.

## Prove

- `npx tsc --noEmit` backend e frontend: puliti.
- `npx jest test/bollettino.spec.ts`: 19/19.
- Browser: controllo manuale della testata a 1440 e 768.
- Il frontend è stato ricompilato e riavviato (`next start`); il backend gira con `start:dev`.
