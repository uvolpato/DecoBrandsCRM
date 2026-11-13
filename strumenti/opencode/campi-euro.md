# Correggi i dati letti: prezzi e importi in formato valuta (13/11/2026)

**Esecutore: DeepSeek Flash** · segnalazione di Ugo durante il giro. Regole comuni: `strumenti/opencode/regole-onda-parallela.md` (**niente `cd` fuori dal progetto, niente `/tmp`, niente `&`, non leggere la copia del frontend fuori dal progetto, mai `.env`**; mai `decobrands_db`, mai le porte 8001/8002). **Non lanciare le prove nel browser**: solo `py_compile`. Scrivi subito `strumenti/opencode/resoconto-campi-euro.md`. Massimo 45 minuti.

## Problema
Nella finestra *Correggi i dati letti* (`app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`, ~righe 800–900) i **prezzi delle righe**, gli **importi delle righe** e il campo **Importo** della testata (`<input type="number" step="0.01">`, riga ~835) si vedono come numeri grezzi (`12.5`), non come valuta (`12,50 €`).

## Correzione (componente riutilizzabile, regola del progetto)
- Un componente piccolo `CampoEuro` (in `app/frontend/componenti/`, o in un file di componenti di form già esistente: cerca prima) che:
  - **fuori dal fuoco** mostra il valore con `euro()` di `app/frontend/lib/formati.ts` (`12,50 €`), allineato a destra;
  - **col fuoco** mostra il numero modificabile con la virgola (`12,50`), accetta virgola o punto, e all'uscita normalizza;
  - passa al genitore lo stesso valore di oggi (stringa numerica col punto), così il salvataggio e il server non cambiano (V12: il server ricontrolla come oggi);
  - `inputMode="decimal"`, `aria-label` invariato, `data-campo` passato.
- Usalo per **tutti** i campi in euro della finestra: prezzo unitario e importo di ogni riga, importo della testata, e ogni altro campo in euro della stessa finestra (grep `prezzo`, `importo`, `step="0.01"`). Le quantità restano numeri (con la virgola, senza €).
- Aggiungi `CampoEuro` al catalogo dei componenti dell'app se c'è (`/componenti`, `app/frontend/app/(app)/componenti/**`), con un esempio.

## Prove
`npx tsc --noEmit` nel frontend; se `strumenti/prove/app_documenti.py` scrive in quei campi con `fill('12.5')`, controlla che funzioni ancora (il campo col fuoco accetta il punto) e aggiungi un controllo «fuori dal fuoco il prezzo si legge 12,50 €»; solo `py_compile`.

## File ammessi
`app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`, `app/frontend/componenti/CampoEuro.tsx` (nuovo) o il file di componenti di form esistente, `app/frontend/app/(app)/componenti/**` (solo l'esempio), `app/frontend/app/stile/stile.css` (solo se serve, controlla prima i nomi delle classi), `strumenti/prove/app_documenti.py`, il resoconto. Nel resoconto «Da documentare»: frase per spec §16.4 (componente nuovo) e §7.9. Carica davvero `ponytail-review`, `caveman`.

## In più: due controlli di `app_documenti.py` superati dai pacchetti di oggi (b)
- riga ~105 `pg.locator('.aff-sx canvas').count() == 1`: il visore ora disegna **tutte** le pagine → `>= 1`.
- riga ~107 «campi bordati giallo e rosso»: con la soglia nuova 0,80 (D-151) il campo di prova a 0,80 non è più giallo. In `strumenti/prove/documenti_prova.js` porta quel campo a **0,75** (fra 0,70 e 0,80). Ammessi anche `strumenti/prove/documenti_prova.js`.
