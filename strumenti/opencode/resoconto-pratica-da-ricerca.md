# Resoconto — Finestra «Cerca pratica»: importo, apri in nuova scheda, vista sola (16/11/2026)

Esecutore: DeepSeek V4 pro · Pacchetto: `strumenti/opencode/pratica-da-ricerca.md`.

## Cosa chiede Ugo

Nella finestra «Cerca pratica» (la lente nella scheda del documento) tre cose: la colonna
**Importo** (valore dell'ultima fase della pratica, calcolato dal server), un **pulsante icona** su
ogni riga che apre la pratica in una **nuova scheda** senza selezionare la riga, e la pagina della
pratica aperta **senza cornice** (niente barra, menu, «Torna a…»), col solo contenuto e un pulsante
«Chiudi la scheda».

## Cosa ho fatto

- `pratiche.ts` (solo `cerca`/`CercaPratiche`): la SELECT aggiunge `t.importo AS importo` (già
  salvato da `aggiornaPratica`, D-52: è `importoPratica`, quindi fatture − note, altrimenti conferme,
  altrimenti ordini, sommati) e lo restituisce come `Number`. Nessun calcolo nuovo nel browser (V12).
- Entità `PRATICA` in `VistaDocumento.tsx` e `VistaPratica.tsx`: colonna `{ key: 'importo', header:
  'Importo', tipo: 'euro' }` (a destra, formato €).
- `Icona.tsx`: nuova icona `apri-scheda` (freccia che esce dalla scheda).
- `CampoRicerca.tsx`: nuova prop opzionale `apriVoce?: (id) => string` in `Comuni`, passata da
  `Multipla` e `Singola` a `RicercaEntita`. In `RicercaEntita`, quando c'è, si aggiunge in fondo una
  colonna `_apri` con un `<a class="btn-riga" target="_blank" rel="noopener">` (icona `apri-scheda`,
  `title`/`aria-label` «Apri la pratica in una nuova scheda»). Il clic non seleziona la riga (la
  DataTable ignora i clic su `<a>`/`<button>`). Senza la prop la maschera è identica a prima.
- `VistaDocumento.tsx`: `apriVoce={(id) => '/pratiche/' + id + '?vista=sola'}` sul `CampoRicerca`
  della sezione «Oppure abbina a un'altra pratica».
- `layout.tsx` `(app)`: legge `?vista=sola` con `useSearchParams`; se sì toglie `Barra` e
  `RegioneAvvisi` e mette la classe `vista-sola` sul body. Accesso e permessi invariati (stessa
  sessione, il `Riservata` resta).
- `VistaPratica.tsx`: in vista sola aggiunge l'azione «Chiudi la scheda» (`window.close()`).
- `stile.css` (in fondo): `body.vista-sola { grid-template-columns: 1fr; }` (niente colonna della
  barra) e `body.vista-sola .testa-azioni a[href^="/guida"] { display: none; }`.
- `componenti/page.tsx` (catalogo) e `lib/guida.ts` aggiornati.

## Prove

- `npx tsc --noEmit` backend: **OK**. `npx tsc --noEmit` frontend: **OK**.
- `npx jest test/pratiche.spec.ts --runInBand` su `decobrands_test_pratica_ricerca` (creato,
  migrato e cancellato): **24 prove, 0 KO**. Due nuove: `cerca` restituisce `importo` uguale a
  `importoPratica` (compresa la pratica con nota di credito: fatture − note), e una pratica con due
  ordini → somma (creata e ripulita nella prova).
- `python -m py_compile strumenti/prove/app_documenti.py`: OK. Aggiunti in `app_documenti.py` i
  controlli: colonna Importo, pulsante con `href="/pratiche/123?vista=sola"` + `target="_blank"` +
  `rel="noopener"`, e pagina in vista sola senza `.barra` e senza «Torna a…». Le prove del browser
  le lancia Claude Code a fine onda.

## Controlli (skill caricate davvero)

- `owasp-security`: nessun rilievo. `target="_blank" rel="noopener"` contro il tabnabbing; `vista=sola`
  non aggira i permessi (il `Riservata` resta); l'importo arriva dal database (V12), nessuna nuova
  superficie di injection.
- `ponytail-review`: prop opzionale sul componente che già c'era, una colonna, una classe CSS, una
  icona; nessun componente nuovo. `net: 0 linee da tagliare`.
- `caveman`: risposte concise.

## Da documentare (a cura di chi chiude l'onda)

- spec §7.9: la finestra «Cerca pratica» mostra la colonna Importo (importoPratica, dal server) e su
  ogni riga il pulsante che apre la pratica in una nuova scheda (`/pratiche/<id>?vista=sola`).
- spec §16.4: `RicercaEntita`/`CampoRicerca` nuova prop `apriVoce`; entità `PRATICA` colonna
  Importo; il layout `(app)` toglie la cornice con `?vista=sola`; `VistaPratica` ha «Chiudi la
  scheda» in vista sola.
- spec §19 — decisione nuova **da proporre** (D-nn): «nella ricerca pratica c'è la colonna Importo e
  il pulsante apri-in-nuova-scheda; la pagina si apre senza cornice con `?vista=sola`» + perché
  (si consulta la pratica senza perdere la finestra del documento).
- `guida.ts` e catalogo già aggiornati.

## Aperti / da segnalare

- La colonna Importo usa `t.importo` salvato: se un domani `importoPratica` cambia regola serve
  ricalcolare le pratiche (come già fa `aggiornaPratica` a ogni modifica).
- La «vista sola» è generica nel layout (vale per qualsiasi pagina con `?vista=sola`), ma il
  pulsante «Chiudi la scheda» è solo in `VistaPratica`: per altre pagine va aggiunto, se serve.
