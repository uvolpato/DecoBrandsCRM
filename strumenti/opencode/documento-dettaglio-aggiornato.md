# Pacchetto `documento-dettaglio-aggiornato`

## Compito

Ugo (18/11/2026): nella pagina Documenti, quando il documento selezionato **cambia stato**, deve aggiornarsi anche il dettaglio a destra. Oggi l'elenco a sinistra si aggiorna da solo (eventi SSE, `useEventi` in `VistaDocumenti`), il pannello di destra no: resta con lo stato vecchio finché non si ricarica la pagina.

## Come

`app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`:

- la firma diventa `export function VistaDocumento({ id, onFatto, aggiorna }: { id: string; onFatto?: () => void; aggiorna?: number })`;
- un `useEffect` in più, accanto a quello che già chiama `carica()`: quando `aggiorna` cambia si rifà `carica()`. Salta il primo giro con un `useRef` (al montaggio il dettaglio si carica già), così non si fanno due letture.
  ```tsx
  const primoAggiorna = useRef(aggiorna);
  useEffect(() => {
    if (aggiorna === undefined || aggiorna === primoAggiorna.current) return;
    primoAggiorna.current = aggiorna;
    void carica();
  }, [aggiorna, carica]);
  ```

`app/frontend/app/(app)/documenti/VistaDocumenti.tsx`:

- passa il contatore degli eventi al dettaglio: `<VistaDocumento key={selezionato} id={selezionato} onFatto={ricarica} aggiorna={vEventi} />` (~riga 194).

Nient'altro. Nessun componente nuovo, nessuna rotta, nessuna classe CSS. Il dettaglio si ricarica da solo anche dopo le sue azioni, come già fa.

## File ammessi

- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`
- `app/frontend/app/(app)/documenti/VistaDocumenti.tsx`

Vietati tutti gli altri: backend, CSS, altre pagine, spec, guida, piano, prove. Niente commit. Non toccare le porte 8001/8002.

## Vincoli

- 📕 V12/D-28: si richiede di nuovo il dettaglio al server, non si ricalcola niente nel browser.
- Ponytail: una prop, un effetto, una riga nel genitore.
- ⚠️ Working tree con molte modifiche non committate: niente `git stash/checkout/reset`.

## Prove

- `npx tsc --noEmit` in `app/frontend`: 0 errori.
- Non lanciare Playwright: la prova la fa l'orchestratore.

## Resoconto

Rispondi con massimo 5 righe: file toccati, diff sintetico, esito `tsc`, dubbi. Non serve un file di resoconto.
