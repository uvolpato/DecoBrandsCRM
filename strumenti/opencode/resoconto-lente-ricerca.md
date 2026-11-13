# Resoconto — lente dei campi di ricerca dopo il testo

Stato: fatto (13/11/2026)

## Lavoro
- [x] Analisi CSS `.cerca` (app + prototipo)
- [x] Correzione lente a destra in tutti i campi `.cerca`
- [x] Marcatore nativo `type=search` non sotto la lente (nascosto)
- [x] Coerenza altri campi di ricerca (grep `Icona nome="cerca"`, classi `cerca*`)
- [x] Stessa modifica in `prototipo-alternativo/assets/stile.css`
- [x] Schermate Playwright 1440/768 px del catalogo componenti
- [x] `npx tsc --noEmit` frontend

## Modifiche
File (solo ammessi): `app/frontend/app/stile/stile.css`, `prototipo-alternativo/assets/stile.css`.
Stesse righe nei due fogli (D-24):

```css
.cerca input { padding: 7px 34px 7px 12px; … }
.cerca input::-webkit-search-cancel-button { display: none; }
.cerca .icona { position: absolute; right: 10px; … }
```

- Lente spostata a destra (dentro il bordo) in **tutti** i campi `.cerca`: barra filtri
  (`FilterBar.tsx`), finestra `RicercaEntita` (CampoRicerca), ricerca agenzie
  (`viste-anagrafiche.js`, stesso markup `.cerca`). Nessun altro campo con lente.
- `.ricerca-lente` (campo a selezione multipla) e `.cerca-esp` (vendita, senza lente):
  lasciati come sono, come chiesto.
- La ✕ nativa di `type=search` (WebKit/Chrome) stava sotto la lente: **nascosta** (scelta
  più semplice fra nascondere e spostare). Si può ancora svuotare il campo con la tastiera.
- Markup non toccato: `FilterBar.tsx` non è servito.

## Perché il padding non valeva (indagine)
Non riprodotto con i file attuali: nel catalogo del prototipo (Chromium, 1440 e 768 px) il
campo misurava `padding-left: 34px` e la lente stava a `left: 10px`, cioè **fuori** dal testo;
nessuna regola più specifica sovrascriveva `.cerca input` (unica regola di padding per quel
campo, sia in `app/frontend/app/stile/stile.css` sia nel prototipo). Probabile spiegazione
della schermata di Ugo: la ✕ nativa e/o una versione precedente del foglio; non c'è un
selettore da correggere alla radice oltre alla posizione della lente. La decisione di Ugo (lente
a destra) elimina comunque ogni possibile sovrapposizione, perché il testo non è più accanto
alla lente ma dall'altra parte del campo.

## Prove
- `python strumenti/collaudo/e2e/uscita/lente_ricerca_screenshot.py` (Playwright, file://,
  niente server): schermate del campo `.cerca` e della finestra «Cerca cliente» a 1440 e 768 px.
  Verificato: lente a destra dentro il bordo, testo/placeholder mai coperto, finestra
  `RicercaEntita` coerente.
- `npx tsc --noEmit` (workdir `app/frontend`): OK.
- `npx tsc --noEmit` (workdir `app/backend`): OK, nessun file backend toccato.
- Le prove nel browser dell'app le lancia Claude Code (non eseguite qui, regole onda).
- Con testo scritto e campo in fuoco la ✕ nativa non compare più; la lente resta a destra e il
  testo non la tocca (schermata `lente-con-testo-1440.png`).

## Da documentare
- Spec §16.4.1 (filtri standard) e §19: riga sulla lente dei campi `.cerca` **a destra** e ✕
  nativa nascosta (13/11/2026, Ugo). Fuori dai file ammessi di questo pacchetto: la scrive
  Claude Code a fine onda.
- `prototipo-alternativo/assets/guida.js`: nessun testo nomina la posizione della lente, quindi
  niente da cambiare (verificato con grep `lente`).

## Cose aperte
- `type=search` ha la ✕ nativa nascosta ovunque ci sia `.cerca`: se serve un pulsante «svuota»
  va aggiunto un componente (non richiesto).
- Anomalia non riproducibile descritta sopra: se Ugo la rivede, serve la schermata e il browser.
