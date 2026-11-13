# Visore PDF: tutte le pagine, scorrevoli (13/11/2026)

**Esecutore: DeepSeek Flash** · richiesta di Ugo durante il giro con i documenti veri. Regole comuni: `strumenti/opencode/regole-onda-parallela.md` (**niente `cd` fuori dal progetto, niente `/tmp`, niente `&`, non leggere la copia del frontend fuori dal progetto, mai `.env`**; mai `decobrands_db`, mai le porte 8001/8002). In parallelo gira il pacchetto delle soglie, che tocca `VistaDocumento.tsx`: **non toccarlo**. Scrivi subito `strumenti/opencode/resoconto-pdf-tutte-le-pagine.md`. Massimo 1 ora.

## Problema
`app/frontend/componenti/PdfEvidenziato.tsx` disegna **una sola pagina** (`doc.getPage(pagina)`). Selezionando un campo di un'altra pagina si vede solo quella. Ugo vuole vedere **tutto il PDF e scorrerlo**.

## Da fare (codice minimo)
- Disegna **tutte le pagine**, una sotto l'altra, in un contenitore che scorre (stessa larghezza di oggi: la scala dipende dalla larghezza del riquadro). Un `<canvas>` per pagina con `aria-label="Pagina N di M"`.
- Il rettangolo del valore (prop `posizione`, coordinate 0–1) si disegna **sulla pagina `pagina`**; al cambio del campo selezionato il contenitore **scorre fino al rettangolo** (come oggi fa dentro la pagina). Senza `posizione`: nessuno scorrimento forzato.
- La firma del componente resta uguale (`src`, `pagina`, `posizione`), così `VistaDocumento.tsx` e `VistaBollettino.tsx` non cambiano. Se `pagina` non c'è vale 1.
- Documenti lunghi: disegna le pagine man mano (anche tutte subito va bene fino a ~20 pagine). Scrivi un commento `ponytail:` con il limite se le disegni tutte subito.
- Stile: niente modifiche a `stile.css` (lo tocca un altro pacchetto): usa classi esistenti o stile in linea.

## Prove
- `npx tsc --noEmit` nel frontend.
- `strumenti/prove/app_bollettino.py` (non `app_documenti.py`: la tocca il pacchetto delle soglie; se va adeguata scrivilo nel resoconto): se controlla un solo `canvas`, adeguale (es. almeno un canvas, rettangolo visibile dopo la scelta di un campo). Lancia `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e` e `bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_bollettino` **solo se il pacchetto delle soglie non le sta già lanciando** (guarda se `strumenti/collaudo/e2e/uscita/prepara.log` è cambiato negli ultimi 5 minuti); altrimenti solo `py_compile` e scrivilo nel resoconto.

## Documentazione
Nel resoconto, «Da documentare»: frase per spec §6.6.1 (il visore mostra tutte le pagine, scorrevoli; il campo selezionato porta alla sua pagina) e per la guida (Documenti, «da sapere»).

## File ammessi
`app/frontend/componenti/PdfEvidenziato.tsx`, `strumenti/prove/app_bollettino.py` (niente `stile.css`: lo tocca un altro pacchetto; per lo spazio fra le pagine usa lo stile in linea), il resoconto. Carica davvero `ponytail-review`, `caveman`.
