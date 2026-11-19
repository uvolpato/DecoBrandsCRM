# Resoconto `lettura-shipping-advice-ordine`

## Cosa è stato fatto

`app/backend/src/lettura.ts`, solo testo:

1. `PROMPT_DOCUMENTO`, subito dopo la frase dei tipi: aggiunta
   `'Un documento intitolato «Shipping Advice» (avviso di spedizione del fornitore, con «Order no.», «Customer no.», «Date») è di tipo ordine: il suo numero è quello in «Order no.» e la data quella in «Date».'`
2. `SCHEMA_DOCUMENTO.properties.tipo.description`: da `'Tipo del documento'` a
   `'Tipo del documento: «Shipping Advice» = ordine'`.

Nessun'altra modifica: nessun cambio di codice, di validazione (`TIPI`), di schema o di test.

## Prove

- `npx tsc --noEmit` in `app/backend`: 0 errori.
- `npm test -- lettura.spec.ts --forceExit`: 2 suite, 42 test, 0 KO.
- `lettura:prova` non lanciato (come da pacchetto): la verifica sul PDF reale resta all'orchestratore.

## Dubbi

- `numero_ordine_fornitore` non è toccata: per un ordine il suo numero è già `numero`, e il
  prompt (§ riga su `numero_ordine_fornitore`) dice che nell'ordine è il numero dell'ordine
  stesso. Se sul PDF reale il fornitore scrive solo `Order no.` senza un campo `numero`, il
  lettore dovrebbe comunque riempire `numero`; da verificare con `lettura:prova`.
- `Customer no.` non è stato associato esplicitamente a `codice_cliente`: la frase del
  prompt esistente già copre i codici cliente (`«Kunden-Nr.»`); aggiungerlo avrebbe allargato
  il pacchetto.

## Da documentare

- **§19, riga nuova (D-nn)**: «Un documento intitolato «Shipping Advice» è di tipo ordine;
  numero da «Order no.», data da «Date»» — perché oggi il lettore lo classificava `altro` e
  la pratica non si apriva; dove: prompt di `app/backend/src/lettura.ts`.
- **§6.5** (ingresso documenti): una riga che elenca «Shipping Advice» fra i documenti
  riconosciuti come ordine.
