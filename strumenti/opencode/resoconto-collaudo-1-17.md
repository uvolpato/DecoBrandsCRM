# Resoconto collaudo 1-17 — PDF del bollettino con PDF.js (A4-10)

Data: 12/11/2026 · Esecutore: DeepSeek V4 Flash · Esito: **corretto**, prove statiche a 0 errori, prova nel browser da lanciare a fine onda.

## Rilievo A4-10 — `<object>` sostituito da `PdfEvidenziato`

Il rilievo era ancora aperto: `VistaBollettino.tsx` usava `<object>` e il backend manda il file con
`Content-Security-Policy: sandbox`, che spegne il visualizzatore PDF di Chromium.

- `app/frontend/app/(app)/bollettini/[id]/VistaBollettino.tsx`
  - riga 9: import di `PdfEvidenziato`;
  - righe 291-293: `<object>` (e il link di riserva «Apri il PDF in una scheda») sostituiti da
    `<PdfEvidenziato src={'/api/documenti/' + d.file.arrivo_id + '/file'} pagina={1} posizione={null} />`
    dentro lo stesso `Pannello` riempi; commento con il perché (`CSP sandbox`, A4-10).
  - Il backend non è stato toccato: `sandbox` resta (come chiede il pacchetto).
  - Nota per chi fa il controllo a schermo: i bollettini non hanno un rettangolo da evidenziare,
    quindi `posizione={null}` e sempre pagina 1.

## Prova nel browser aggiornata (non lanciata, come da regole)

`strumenti/prove/app_bollettino.py`:

- righe 20-34: nuovo `pdf_prova(marca)` — genera un PDF **valido** di una pagina vuota
  (catalogo, `Pages`, `Page` con `MediaBox`, xref corretto). Prima la prova caricava
  `b'%PDF-1.4\n…%%EOF\n'`, che PDF.js non riesce ad aprire: il canvas non si sarebbe mai disegnato;
- righe 269-270: il caricamento del bollettino usa `pdf_prova('prova PDF')`;
- riga ~193: senza file si controlla che non ci sia alcun `canvas` nel pannello (prima: nessun `<object>`);
- righe 276-289: il PDF affiancato è verificato così:
  - `.pannello canvas[aria-label="Pagina 1 del documento"]` presente e nessun
    `object[type="application/pdf"]`;
  - `expect_response` su `/api/documenti/<id>/file` (status 200);
  - `wait_for_function` che il canvas abbia `width > 0` e `height > 0` (attesa 20 s).

Da lanciare a fine onda: **`python strumenti/prove/app_bollettino.py <suffisso> <cartella> <base>`**
(richiede backend/frontend accesi e il seed pulito; la prova chiude Gasper agosto e carica un bollettino,
quindi va rilanciato il seed dopo).

## Prove lanciate

| Prova | Esito |
|---|---|
| `python -m py_compile strumenti/prove/app_bollettino.py` | OK |
| `cd app/frontend && npx tsc --noEmit` | 0 errori |
| PDF di `pdf_prova` letto con `pdfjs-dist` (Node, legacy build): `getDocument` + `getPage(1)` | 1 pagina, viewport 300×200 |
| `git diff --name-only` | solo i due file ammessi (più il presente resoconto, non tracciato) |

Nessun test del backend eseguito (backend non toccato). Nessun database creato o cancellato.

## Cose aperte

- `app/frontend/componenti/ConsultaDocumenti.tsx:145` usa ancora `<object type="application/pdf">`
  (fuori dagli ammessi di questo pacchetto): se è raggiunto da un file con `CSP: sandbox` ha lo
  stesso problema. Segnalato, non toccato.
- Il rendering vero del canvas (worker PDF.js, rete) non è verificabile senza lanciare il browser:
  lo conferma la prova a fine onda.

## Da documentare

**Niente di nuovo.** Non nasce né cambia una regola: il pacchetto applica al bollettino la scelta
già presa con D-06/D-59 (PDF disegnato con PDF.js, §6.6.1) e lascia intatto il `CSP: sandbox` del
backend (D-86). Testi già coerenti, nessuna modifica richiesta:

- `lib/guida.ts`, voce *PDF del bollettino* (riga 299): «Se il fornitore l'ha mandato, sta a sinistra
  della cerniera; sul tablet va sopra» — resta vero col canvas.
- `specifica-crm-provvigioni.md` §7.7 (8.20, «PDF del bollettino affiancato»): nessun accenno a
  `<object>` da correggere.
- D-86 §19: la nota «`object-src 'self'` (i PDF si vedono in `<object>`)» resta valida per
  `ConsultaDocumenti.tsx`, che usa ancora `<object>`.
- Piano e README: nessuna attività o ora nuova; è una correzione dentro il collaudo.
