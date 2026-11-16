# Resoconto — Filtro per stato dentro la modale di ricerca (15/11/2026)

**Esecutore: DeepSeek Flash.** Pacchetto `strumenti/opencode/filtro-stato-in-modale.md`. Regole comuni rispettate: niente commit, niente `cd`/`/tmp`/`&`, `.env` mai letto, niente porte 8001/8002, niente Integra. Non toccati file di altri pacchetti (le modifiche non committate in `VistaDocumento.tsx` e `CampoRicerca.tsx` sono state conservate). Backend non toccato.

## Richiesta di Ugo (15/11/2026)

Il filtro per stato (`Tutte · Solo ordine · Confermata · Fatturata`) non sta nella pagina accanto al campo: va dentro la finestra di ricerca (la lente/F4). Il campo scritto direttamente continua a usare lo stesso filtro.

## Interfaccia

- **`app/frontend/componenti/CampoRicerca.tsx`**:
  - nuovo tipo interno `SegmentiRicerca` (`voci: {valore, etichetta}[]`, `valore`, `onCambia`) e prop **opzionale** `segmenti` in `Comuni`: senza il parametro il campo resta identico ovunque.
  - `RicercaEntita` riceve `segmenti` e, se presente, mostra i `.segmenti` (role=tablist/tab, nessuna classe CSS nuova — `grep` su `stile.css`: `.segmenti` già esiste) in cima alla finestra, sopra la `FilterBar`.
  - Il valore lo tiene il chiamante; cambiandolo cambia il `contesto` dell'entità e `useVoci` ricarica le voci dal server.
- **`app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`**:
  - tolti i segmenti dalla riga «Oppure abbina a un'altra pratica» (resta testo + campo + Abbina);
  - `STATI_ABBUNA` passa a `{ valore, etichetta }` e viene dato al campo con `segmenti={{ voci: STATI_ABBUNA, valore: statoFiltro, onCambia: setStatoFiltro }}`;
  - invariati `STATO_DAL_TIPO` (valore iniziale dal tipo del documento) e il `contesto` con `stato`, quindi anche il campo scritto senza modale usa lo stesso filtro.
- **`app/frontend/app/(app)/componenti/page.tsx`**: esempio `DemoRicerca` con un campo a segmenti, descrizione e `firma` aggiornate.
- **`app/frontend/lib/guida.ts`**: la nota (D-177) dice che i segmenti stanno nella finestra di ricerca (lente, o F4).

## Prove

- `npx --prefix app/frontend tsc --noEmit -p app/frontend/tsconfig.json`: **pulito** (vedi `TSC_OK`).
- Schermata Playwright a 1440 e 768 **non lanciata**: le regole dell'onda vietano le prove nel browser (le lancia Claude Code a fine onda). Nessun file `.py` toccato.

## Controlli (skill caricate davvero)

- `ponytail-review`: lean. Nessuna astrazione nuova oltre al tipo della prop; `net: 0`. Il tipo non è esportato finché non serve fuori.
- `caveman`: risposte e questo resoconto concisi.

## Da documentare

- **§16.4 (componenti)**: `CampoRicerca` ha la prop opzionale `segmenti?: { voci: {valore,etichetta}[]; valore; onCambia }` che mostra segmenti di filtro in cima alla finestra di ricerca; senza la prop il campo non cambia.
- **§7.9 / §6.5 (abbinamento)**: il filtro per stato (D-177) ora sta **nella finestra di ricerca**, non nella riga «Oppure abbina a un'altra pratica»; il valore iniziale resta dal tipo del documento e il campo diretto usa lo stesso filtro.
- **§19 — D-177**: aggiornare il "dove" della decisione: i segmenti stanno nella modale della ricerca, non accanto al campo.

## Aperti / note

- Mentre il server ricarica le voci dopo un cambio di segmento la modale mostra per un attimo quelle vecchie (nessuna sagoma richiesta dal pacchetto). Se Ugo vuole, si aggiunge `Sagoma`.
- Il valore del segmento non è salvato per documento: tornando sul documento riparte dal tipo (comportamento già presente).
