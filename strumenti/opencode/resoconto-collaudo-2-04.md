# Resoconto · Collaudo · Onda 2 · Pacchetto 2-04 — Aggiornamenti dal vivo

Data: 13/11/2026 · Esecutore: DeepSeek V4 · Rilievi: A3-06, A1-08, A6-03.

## Esito: 0 KO. Tre rilievi chiusi (A3-06 e A1-08 corretti, A6-03 già corretto dal lavoro f7).

## Cosa ho fatto

### A3-06 — Aggiornamenti dal vivo persi: il canale leggeva per id crescente
`app/backend/src/eventi.ts` (`nuoveAree`, `EventiService`):
- `nuoveAree` ora interroga una **finestra** `id > ultimo - 500n` (`take: 1000`), non più `id > ultimo`.
  Le righe già emesse si scartano con un set `visti` passato dal chiamante; dopo la lettura gli id
  sotto `nuovoUltimo - 500n` si tolgono da `visti` per tenerlo limitato. `// ponytail: finestra di 500 id;
  LISTEN/NOTIFY se il registro cresce più di 500 righe in 4 s`.
- `EventiService` tiene il set persistente `private visti = new Set<bigint>()` e lo passa a `nuoveAree`
  in `prossimo()`.
- Nel ramo di ripartenza (registro riportato indietro) `visti.clear()`, così un backup non lascia id
  "visti" che nasconderebbero i nuovi eventi.

Prova nuova in `app/backend/test/eventi.spec.ts`: inseriti id base+10 e base+12 (id espliciti, `createMany`),
`nuoveAree`; poi inserito base+11 fuori ordine e richiamato → l'area di 11 arriva, `ultimo` resta base+12.

### A1-08 — La SSE restava aperta dopo uscita/disattivazione/scadenza
`app/backend/src/eventi.ts` (`EventiService.flusso`, `EventiController.flusso`, `sessioneViva`):
- `flusso(sessionID, periodo = 60_000)` unisce al canale un `interval(60_000)` che ogni minuto legge
  `sessioni` per `req.sessionID`; quando la riga non c'è più o `expire` è passato, `filter(!viva)` +
  `takeUntil` chiudono il flusso. Il `periodo` è un parametro con default 60 s (le prove lo usano a 10 ms).
- Il controller ora passa `req.sessionID` (`flusso(@Req() req)`).

Prova nuova in `eventi.spec.ts`: si apre il flusso, si cancella la riga di sessione, il flusso si chiude.

### A6-03 — Oggi: dopo *Copia il testo* dei solleciti non compariva «Ci sono aggiornamenti»
**Già corretto dal lavoro f7**: `incassi.ts` scrive l'evento `documento.export` (area `documenti`, per
`PREFISSI`), e `VistaOggi` conta tutte le aree (`Object.values(eventi)`); il contatore `solleciti` della
voce del gruppo cambia, quindi la barra compare. Non ho toccato nulla. Verificato su `incassi.spec.ts`
(già prova `documento.export`).

## Prove lanciate (database `decobrands_test_2_04`, poi cancellato)

- `npx jest test/eventi.spec.ts test/incassi.spec.ts test/oggi.spec.ts` → **26 test, 0 KO** (3 suite).
- `npx tsc --noEmit` (backend) → **0 errori**.
- Frontend non toccato: `tsc` frontend non rilanciato.

## Prove nel browser da lanciare a fine onda (non lanciate qui)

- `strumenti/prove/app_oggi.py` — verifica la barra «Ci sono aggiornamenti» dopo *Copia il testo* (A6-03).
- `strumenti/prove/app_eventi.py` — canale SSE da un'altra scheda.
Non servono modifiche a queste prove (nessun rilievo richiedeva di toccarle); non le ho aggiornate.

## Da documentare

Nessuna decisione nuova né regola cambiata: A3-06 e A1-08 correggono bug implementando decisioni già
presenti (D-23 conteggi dal vivo, D-31 registro, D-38 disattivazione immediata, D-89 timeout sessione).
Nessuna riga D-nn, nessuna riga *Perché*, guida, piano o README da aggiornare. Il dettaglio tecnico
(finestra di 500 id per il commit fuori ordine) resta nel commento del codice.
