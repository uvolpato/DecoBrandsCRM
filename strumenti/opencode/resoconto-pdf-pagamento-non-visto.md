# Resoconto — `pdf-pagamento-non-visto`

## Documento trovato

`documenti_in_arrivo` id **9**, unico in «Da controllare»:

| Campo | Valore |
|---|---|
| file_nome | `dettaglioDistinta (6).pdf` |
| tipo | `pagamento` |
| stato | `da_controllare` |
| livello | `bassa` |
| origine | `caricamento` (utente 1) |
| file_percorso | `in_arrivo/2026/20261115/35d2d353…e6.pdf` |
| dimensione | 63 866 byte |
| ricevuto_il | 2026-11-15 15:09:03.977Z |
| letto_il | 2026-11-15 15:11:39.880Z |
| tentativi / errore | 0 / null |

### Cronologia (registro, entita `documento`)

1. `15:09:03.979` — `documento.upload` (recuperato:false).
2. `15:11:21.074` — stato `in_coda → in_lettura` (il lettore preleva il file).
3. `15:11:39.916` — stato `in_lettura → da_controllare` (lettura finita, livello bassa).

## Come il PDF arriva a schermo

- Frontend: `VistaDocumento.tsx` → finestra «Correggi i dati letti» → `FileDocumento`
  (`VistaDocumento.tsx:846-856`) → `PdfEvidenziato` (`componenti/PdfEvidenziato.tsx`).
  Il `src` è `/api/documenti/<id>/file`.
- Backend: `documenti.ts:885-912` `GET :id/file`. Il percorso viene **solo dal database**; il file è
  letto da disco con `readFile` e restituito con `StreamableFile` (Content-Type pdf, `sandbox`).
- Proxy: `next.config.ts:30` riscrive `/api/*` verso il backend (8002), `proxyTimeout 180 s`.

## Cause possibili (verifica)

1. **File scritto dopo la riga (V13)** — esclusa. `riceviDocumento` scrive il file **prima** della
   transazione (`documenti.ts:121`), poi di nuovo dopo il commit (`:148`). Il file è su disco dal
   `15:09:03`.
2. **Anteprima mentre il documento è in lettura** — esclusa. Il PDF si vede solo nella finestra
   «Correggi i dati letti», e quell'azione esiste solo per stato `da_controllare`/`errore`
   (`VistaDocumento.tsx:515`). Prima del `15:11:39` il PDF non era nemmeno raggiungibile. La rotta
   `/file` non controlla lo stato (solo `scartato`), quindi non è lei a fallire.
3. **Tipo «pagamento» trattato diversamente** — esclusa. `fileTipo` decide dall'estensione
   (`documenti.ts:342-345`), la rotta `/file` serve ogni tipo allo stesso modo.
4. **404/500 nel log** — non verificabile: nessun file `.log` su disco in `app/backend`. La rotta è
   semplice e il file esisteva; probabilità bassa.
5. **Visualizzatore che non si ricarica** — **causa probabile**, vedi sotto.

## Causa (probabile, con prove)

`PdfEvidenziato.tsx` carica il PDF in un `useEffect` asincrono che inghiotte **ogni** errore:

```ts
useEffect(() => {
  let vivo = true; let task = null;
  (async () => {
    if (!larghezza) return;                 // larghezza 0 al mount → non carica, nessun nuovo tentativo
    const pdfjs = await import('pdfjs-dist');   // chunk dinamico, freddo alla prima apertura
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
    task = pdfjs.getDocument({ url: src }); // se il worker/chunk non si carica (cache fredda) → reject
    const doc = await task.promise;
    ...
  })().catch(() => {});                      // ← l'errore sparisce, nessun messaggio, nessun retry
  return () => { vivo = false; void task?.destroy(); };
}, [src, larghezza]);
```

Non esiste stato di errore né tentativo: se il primo caricamento fallisce (worker `pdf.worker.min.mjs`
o chunk di `pdfjs-dist` non ancora in cache, o un transitorio di rete), la persona vede il pannello
grigio vuoto e **nessun segnale**; il PDF ricompare solo ricaricando/riaprendo (a cache calda).
Questo spiega «non si vedeva; poco dopo ricaricando si è visto» e conferma che **può ricapitare**.

Fattore secondario: l'early-return `if (!larghezza) return` lascia il caricamento a un solo passaggio
di `ResizeObserver`; se la larghezza resta 0 al primo giro il PDF non si carica affatto.

## Correzione proposta (non applicata: altri pacchetti toccano `VistaDocumento.tsx`/`documenti.ts`)

In `app/frontend/componenti/PdfEvidenziato.tsx`, in ordine minimo:

1. Sostituire `.catch(() => {})` con uno stato `errore` e un messaggio visibile nel riquadro
   («Il PDF non si è caricato: riprova»), così un fallimento non è silenzioso.
2. Ritentare il caricamento quando `src`/`larghezza` cambiano (già coperto dalla dipendenza) e
   aggiungere un retry esplicito sul messaggio di errore.
3. Nel primo effetto, rifare la misura finché `clientWidth > 0` (o usare `ResizeObserver` anche per
   il caso 0), così l'early-return non blocca mai il caricamento.

## Come riprodurlo

Difficile in modo deterministico: serve un PDF la cui prima richiesta del worker/chunk di pdf.js
fallisca (cache fredda, throttling della rete). Riproduzione manuale: aprire la finestra «Correggi i
dati letti» di un documento PDF subito dopo l'avvio del browser (cache vuota) e osservare il pannello
grigio vuoto senza alcun errore in pagina. Il rimedio attuale è ricaricare/riaprire.

## Da documentare

- Registrare una decisione: la finestra «Correggi» non mostra alcun errore se il PDF non si carica
  (`.catch` silenzioso in `PdfEvidenziato.tsx`); correzione: stato di errore + retry.
