# «Fornitore letto» come «Cliente letto», e i letti riportati nelle ricerche (13/11/2026)

**Esecutore: DeepSeek Flash** · richiesta di Ugo. Regole comuni: `strumenti/opencode/regole-onda-parallela.md` (**niente `cd` fuori dal progetto, niente `/tmp`, niente `&`, non leggere la copia del frontend fuori dal progetto, mai `.env`**; mai `decobrands_db`, mai le porte 8001/8002, Integra mai). **Non lanciare le prove nel browser** (le sta lanciando Claude Code): solo `py_compile`. Scrivi subito `strumenti/opencode/resoconto-fornitore-letto.md`. Massimo 1 ora.

## Richiesta
Nella finestra *Correggi i dati letti* (`app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx` ~riga 880) c'è **«Cliente letto»** (il testo letto dal PDF, modificabile) ma per il fornitore c'è solo il campo di ricerca `fornitore_id`. Ugo vuole anche **«Fornitore letto»** (il nome letto dal PDF, campo `fornitore` di `documenti_campi`, già usato dal server per cercare su Integra, `documenti.ts` `dettaglioDocumento`), e poter **riportare i letti nelle maschere di ricerca**.

## Da fare
1. **Fornitore letto**: in *Correggi i dati letti*, accanto alla ricerca del fornitore, il campo **«Fornitore letto»** modificabile, con lo stesso comportamento di «Cliente letto» (fuoco → PDF sul valore, bordo di affidabilità, salvataggio come gli altri campi). Se esistono anche le **P.IVA lette** (`piva_cliente`, ed eventuale `piva_fornitore` nello schema di lettura `lettura.ts`), mostrale allo stesso modo sotto il nome. Il server deve mandare questi valori con il dettaglio (se non li manda già) e salvarli con la correzione (lista dei campi ammessi).
2. **Letti riportati nelle ricerche**: in *Apri la pratica* (`apriNuova`, ~riga 271), in *Registra il bollettino* e nella ricerca del fornitore di *Correggi i dati letti*, quando il campo di ricerca è **vuoto**:
   - sotto il campo una riga piccola «Letto: *Gries GmbH* · P.IVA *DE123…*» con un pulsante **«Cerca questo»** che apre la ricerca (menu o finestra `RicercaEntita`) **già compilata** con il nome letto (o la P.IVA se c'è), così compaiono i risultati del CRM e di Integra (la parte Integra c'è già in `CampoRicerca.tsx`);
   - in alternativa più semplice, se `CampoRicerca` ha già un testo iniziale: passarlo come testo di partenza della ricerca quando non c'è una scelta. Scegli la via più corta; aggiungi a `CampoRicerca` al massimo un parametro (`testoIniziale` o simile) e aggiorna il catalogo dei componenti.
3. Guida (`app/frontend/lib/guida.ts`, Documenti, «da sapere»): una frase.

## Prove
`npx tsc --noEmit` backend e frontend; se tocchi il backend, jest `test/documenti.spec.ts` su `decobrands_test_letto` (creato e cancellato da te). `strumenti/prove/app_documenti.py`: un controllo per «Fornitore letto» e per «Cerca questo»; solo `py_compile`.

## File ammessi
`app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`, `app/frontend/componenti/CampoRicerca.tsx`, `app/frontend/componenti/FormModal.tsx` (solo se serve passare il testo iniziale), `app/frontend/app/(app)/componenti/**`, `app/frontend/lib/guida.ts`, `app/backend/src/documenti.ts`, `app/backend/test/documenti.spec.ts`, `strumenti/prove/app_documenti.py`, il resoconto. Nel resoconto «Da documentare» (spec §7.9, §16.4.1). Carica davvero `ponytail-review`, `caveman`.
