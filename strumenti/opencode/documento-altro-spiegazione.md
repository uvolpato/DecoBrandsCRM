# Pacchetto `documento-altro-spiegazione`

## Compito

Ugo (18/11/2026): «prendi il primo documento … perché non mi dà l'apertura della pratica?»

Il primo documento in coda è `_3677151_61360_4_2_2026.pdf` (Gasper, codice 61360) letto dal sistema come tipo **`altro`** (importo nullo, 14 righe lette). Non è un difetto del codice cliente: per progetto un documento di tipo `altro` **non entra in una pratica**, quindi non c'è nessuna proposta da mostrare e nessun «Apri la pratica». Va detto all'utente, perché oggi la scheda non spiega niente.

## Come — `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`

Nella parte della proposta (dove ora compaiono le note sull'esito `nessuno`, ~righe 806-815), quando `doc.proposta.esito === 'nessuno'` e `doc.testata.tipo === 'altro'` (o `null`), mostra al posto delle altre note:

> Letto come «Documento»: un documento generico non entra in una pratica. Se è una conferma, una fattura o un ordine, correggi il tipo con «Correggi i dati letti».

Le altre note restano come sono per gli altri tipi. Niente altro.

## File ammessi

- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`

Nient'altro: nessun altro file, nessun commit, non toccare backend, CSS, `.env`, database, porte 8001/8002. Working tree con modifiche non committate: niente `git stash/checkout/reset`.

## Prove

- `npx tsc --noEmit` in `app/frontend`: 0 errori.
- Non lanciare Playwright: la prova la fa l'orchestratore.

## Resoconto

Rispondi con massimo 4 righe.
