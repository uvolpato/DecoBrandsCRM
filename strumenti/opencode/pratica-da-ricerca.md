# Pacchetto `pratica-da-ricerca`

## Contesto
Finestra «Cerca pratica» (lente nella scheda del documento, `RicercaEntita` in `app/frontend/componenti/CampoRicerca.tsx`,
entità pratica nei file delle entità del frontend; server `cerca` in `app/backend/src/pratiche.ts`). Colonne oggi:
Pratica, Cliente, Data, Stato. Ugo (16/11/2026):

1. **Colonna «Importo»**: valore dell'**ultimo documento** della pratica (fatturata: fatture − note di credito; con
   conferma: conferme; solo ordine: ordini), **somma** se i documenti di quella fase sono più d'uno. Calcolato dal server
   (V12) con le funzioni del motore già esistenti (`importoPratica`/fase), allineato a destra, formato €.
2. **Niente riepilogo sotto la tabella.** Su ogni riga, in fondo, un **pulsante icona** (icona «apri in una nuova
   scheda» dal componente `Icona`; aggiungila se manca) con tooltip e `aria-label` «Apri la pratica in una nuova scheda»:
   apre la pratica in una nuova scheda (`target="_blank"`, `rel="noopener"`). Il clic sul pulsante **non** seleziona la
   riga. Fallo come **parametro opzionale e generico** di `RicercaEntita` (es. `apriVoce?: (id) => string` che dà
   l'indirizzo), così vale anche per altre entità; senza il parametro il componente resta identico. Catalogo componenti.
3. Nella nuova scheda la pagina si apre **senza navigazione** (niente barra in alto, niente menu laterale, niente
   «Torna a…»): solo il contenuto della pratica con il suo titolo e un pulsante «Chiudi la scheda» (`window.close()`).
   Modo: parametro nell'indirizzo (es. `?vista=sola`) letto dal layout `(app)` per togliere la cornice; vale per qualsiasi
   pagina, ma lo usiamo solo qui. Accesso e permessi invariati (stessa sessione).

## File ammessi
`CampoRicerca.tsx`, file delle entità del frontend, `VistaDocumento.tsx` (solo per passare `apriVoce`), `Icona.tsx`
(solo aggiunte), layout `app/frontend/app/(app)/layout.tsx` e il guscio/navigazione per la «vista sola», `VistaPratica.tsx`
(solo il pulsante «Chiudi la scheda» in vista sola), `componenti/page.tsx`, `lib/guida.ts`, `stile.css` (aggiunte in fondo),
backend `pratiche.ts` **solo** la funzione `cerca`/`CercaPratiche` (il resto è in modifica da `righe-nota-credito-correzioni-1`) (+ test `pratiche.spec.ts`). Aggiungi, non riscrivere.

## Regole
Leggi prima `strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`. V12. Ogni comando prisma/jest con
`DATABASE_URL` esplicito nella stessa riga, su `decobrands_test_pratica_ricerca` (creato e cancellato); mai `migrate` su
`decobrands_db`. Niente commit, 8001/8002, `cd`, `/tmp`, `&`. Skill: `owasp-security`, `ponytail-review`, `caveman`.

## Prove
`npx tsc --noEmit` backend e frontend; jest: `cerca` restituisce l'importo (fatturata con nota → fatture − note; due
ordini → somma). Aggiorna `strumenti/prove/app_documenti.py`: colonna Importo e pulsante con l'indirizzo giusto e
`?vista=sola`; pagina in vista sola senza navigazione.

## Resoconto
`strumenti/opencode/resoconto-pratica-da-ricerca.md`, con «Da documentare» (§7.9, §16.4, §19). Riepilogo in 8 righe.
