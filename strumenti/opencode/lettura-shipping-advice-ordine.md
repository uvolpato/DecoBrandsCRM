# Pacchetto `lettura-shipping-advice-ordine`

## Compito

Ugo (19/11/2026): un documento intitolato **«Shipping Advice»** (avviso di spedizione del fornitore, con `Order no.`, `Customer no.`, `Date`) è di tipo **ordine**: è l'ordine che apre la pratica. Oggi il lettore lo classifica come `altro` e non lo propone.

## Come — `app/backend/src/lettura.ts`

Solo il prompt, in modo additivo (gli altri tipi non cambiano). Una frase nuova accanto a quella del tipo:

`'Un documento intitolato «Shipping Advice» (avviso di spedizione del fornitore, con «Order no.», «Customer no.», «Date») è di tipo ordine: il suo numero è quello in «Order no.» e la data quella in «Date».'`

Se serve, allinea anche la descrizione del campo `tipo` nello schema con un accenno (`'Tipo del documento: «Shipping Advice» = ordine'`), senza toccare altro.

## File ammessi

- `app/backend/src/lettura.ts`
- `strumenti/opencode/resoconto-lettura-shipping-advice.md` (resoconto, nuovo)

Nient'altro: nessun commit, nessuna migrazione, `.env`, Integra, database di sviluppo, porte 8001/8002 non si toccano. Working tree con modifiche non committate: niente `git stash/checkout/reset`.

## Prove

- `npx tsc --noEmit` in `app/backend`: 0 errori.
- `npm test -- lettura.spec.ts --forceExit`: 0 KO.
- Non lanciare `lettura:prova` (consuma crediti): la verifica sul PDF la fa l'orchestratore.

## Resoconto

Scrivi `strumenti/opencode/resoconto-lettura-shipping-advice.md`: testo aggiunto, esiti, dubbi, **Da documentare** (riga §19, §6.5).
