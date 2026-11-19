# Correzione 2 — `pagamenti-filtro-non-pagata-e-link`

Ugo non ha chiesto di cambiare il comportamento di fatture e note di credito. La correzione 1 ha però allargato `clientePratica` (rinominato `clienteDoc`), e così **anche** fatture e note di credito ora restringono le candidate al cliente riconosciuto per P.IVA/nome: era un comportamento voluto diverso (D-60: il cliente riconosciuto per P.IVA/nome non filtra, resta il confronto per articoli). Si torna indietro su quello, tenendo il cliente riconosciuto **solo per il pagamento**.

## Correzione — `app/backend/src/proposta.ts`

Riporta il codice a questa forma (adatta ai nomi che hai già nel file):

```ts
// D-60: cliente certo (codice, scelto a mano, vocabolario) — per gli altri tipi il riconosciuto
// per P.IVA/nome non filtra, resta il confronto per articoli
const clientePratica = ab?.cliente_id ?? clienteScelto?.cliente_id ?? clienteVocabolario?.cliente_id ?? null;
// 18/11/2026: un pagamento non porta il codice del fornitore, quindi vale anche il cliente
// riconosciuto per P.IVA/nome: senza un elemento in comune non si propongono tutte le fatturate
const clienteTestate = clientePratica ?? (l.tipo === 'pagamento' ? cliente_riconosciuto?.cliente_id ?? null : null);
```

- la query `testate` filtra su `clienteTestate` (non più su `clienteDoc`);
- il filtro finale: `.filter((c) => clienteTestate != null || c.punteggio > 0)`;
- la riga dell'`esito` torna a usare `clientePratica` (`if (proposti.length && clientePratica == null) …`), così un pagamento con cliente riconosciuto per nome non diventa «certo» da solo.

Nient'altro cambia: il `pool` del pagamento (pratiche senza pagamento) e il valore `non_pagata` restano.

## Test

`test/proposta.spec.ts`: il caso del pagamento con cliente riconosciuto per ragione sociale resta; verifica che una **fattura** con cliente riconosciuto per nome proponga ancora anche pratiche di un altro cliente con articoli in comune (è il comportamento di prima), così la regressione non torna.

## File ammessi

- `app/backend/src/proposta.ts`
- `app/backend/test/proposta.spec.ts`
- `strumenti/opencode/resoconto-pagamenti-filtro-non-pagata-e-link.md` (aggiorna il resoconto, che ora manca della correzione 1)

Nient'altro. Niente commit, `.env`, database, porte 8001/8002. Working tree con modifiche non committate: niente `git stash/checkout/reset`.

## Prove

- `npx tsc --noEmit` in `app/backend`: 0 errori.
- `npm test -- proposta.spec.ts --forceExit`: 0 KO.
