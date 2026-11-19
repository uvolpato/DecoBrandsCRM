# Correzione 1 — `pagamenti-filtro-non-pagata-e-link`

Ugo (18/11/2026), dopo la prova: fra le pratiche suggerite il filtro nuovo è troppo stretto. Un pagamento non porta un codice cliente, quindi `clientePratica` è quasi sempre nullo e **non si propone nulla**, anche quando il cliente del documento è stato riconosciuto per P.IVA o ragione sociale (`cliente_riconosciuto`) — che è un elemento di filtro a tutti gli effetti.

## Correzione — `app/backend/src/proposta.ts`

Dove hai messo
```ts
const proposti = filtraPratiche(candidati, filtro).filter((c) => clientePratica != null || c.punteggio > 0);
```
usa il cliente del documento in senso pieno: codice (o scelto a mano / vocabolario) **oppure** riconosciuto per P.IVA/nome, e in quel caso tieni le candidate di **quel** cliente:

```ts
// senza un elemento in comune (cliente del documento o articoli) non si propongono tutte le fatturate del fornitore
const clienteDoc = clientePratica ?? cliente_riconosciuto?.cliente_id ?? null;
const proposti = filtraPratiche(candidati, filtro)
  .filter((c) => (clienteDoc != null && c.pratica.cliente_id === clienteDoc) || c.punteggio > 0);
```

Il resto invariato.

## Test — `app/backend/test/proposta.spec.ts`

- il caso «pagamento senza cliente certo e senza articoli in comune → nessuna candidata» resta;
- aggiungi: pagamento con il cliente riconosciuto per ragione sociale/P.IVA → le candidate sono solo le pratiche **di quel cliente**, fatturate e senza pagamento.

## File ammessi

- `app/backend/src/proposta.ts`
- `app/backend/test/proposta.spec.ts`
- `strumenti/opencode/resoconto-pagamenti-filtro-non-pagata-e-link.md` (aggiorna il resoconto)

Nient'altro. Niente commit, `.env`, database, porte 8001/8002. Working tree con modifiche non committate: niente `git stash/checkout/reset`.

## Prove

- `npx tsc --noEmit` in `app/backend`: 0 errori.
- `npm test -- proposta.spec.ts --forceExit`: 0 KO.
