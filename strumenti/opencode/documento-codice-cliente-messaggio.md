# Pacchetto `documento-codice-cliente-messaggio`

## Compito

Ugo (18/11/2026): il dettaglio del documento dice ancora «Il codice 61360 non corrisponde a nessun cliente di GASPER GMBH», ma l'agenzia **c'è**: `GET /api/documenti/70|71|72` risponde `codice_cliente_esito: { stato: 'corrisponde', cliente: 'Perardi Vivai di Perardi Renato' }`. Inoltre il dettaglio dovrebbe aggiornarsi quando si torna sul documento.

## 1. Il messaggio sbagliato — `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`

Oggi la nota (~righe 808-814) compare quando `doc.proposta.esito === 'nessuno'` e c'è un codice letto, **senza guardare** `doc.codice_cliente_esito`: così accusa il codice anche quando il codice è giusto e semplicemente non c'è una pratica aperta da proporre.

Correggi la condizione e i testi, usando `doc.codice_cliente_esito.stato`:
- `senza_agenzia` → «Il codice {codice} non corrisponde a nessun cliente di {fornitore}. Scegli la pratica a mano oppure correggi il codice.» (il testo attuale);
- `corrisponde` o `da_confermare` → «Nessuna pratica aperta da proporre per {cliente}: scegli la pratica a mano qui sotto.»;
- `altro_cliente` / `assente` → lascia il testo di oggi (`Il codice … non corrisponde …` quando c'è il codice, altrimenti la nota sul codice mancante).

Il resto della scheda non cambia.

## 2. Il dettaglio si aggiorna quando si torna — stesso file

Accanto all'effetto che ricarica al cambio di `aggiorna` (eventi SSE), aggiungi un ricaricamento quando la finestra torna in primo piano:

```tsx
useEffect(() => {
  const torna = () => { if (document.visibilityState === 'visible') void carica(); };
  window.addEventListener('focus', torna);
  document.addEventListener('visibilitychange', torna);
  return () => { window.removeEventListener('focus', torna); document.removeEventListener('visibilitychange', torna); };
}, [carica]);
```

Con una riga di commento: si torna dal cliente o dalle impostazioni e il documento si rilegge (V12: si richiede al server).

## File ammessi

- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`

Nient'altro: nessun altro file, nessun commit, non toccare backend, CSS, `.env`, database, porte 8001/8002. Working tree con modifiche non committate: niente `git stash/checkout/reset`.

## Prove

- `npx tsc --noEmit` in `app/frontend`: 0 errori.
- Non lanciare Playwright: la prova la fa l'orchestratore.

## Resoconto

Rispondi con massimo 6 righe: diff sintetico, esito `tsc`, dubbi.
