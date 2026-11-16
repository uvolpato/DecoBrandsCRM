# Pacchetto `visualizzatore-zoom`

## Contesto
Finestra di correzione del documento (`app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`), a lato
il visualizzatore del file (`app/frontend/componenti/PdfEvidenziato.tsx` per i PDF; cerca come si mostrano
le **immagini**, es. foto JPG/PNG di un pagamento — `dettaglioDistinta`, foto dello schermo con la distinta
bonifici).

Ugo (15/11/2026):
1. Con un'**immagine** non compare il **riquadro** che evidenzia il campo selezionato (con i PDF sì). Se la
   posizione del campo non c'è, **dirlo** (es. piccola nota sopra il visualizzatore «Posizione del campo non
   disponibile per questo documento»), invece di non mostrare nulla.
2. Il visualizzatore (PDF e immagini) deve permettere di **ingrandire**, **spostarsi** (trascinare / barre di
   scorrimento) e **tornare facilmente alla vista iniziale** (adatta alla larghezza).

## Compito
1. **Diagnosi riquadro** (sola lettura su `decobrands_db`, URL con grep, `.env` mai letto per intero): per i
   documenti immagine, la lettura salva le posizioni dei campi (stessa forma dei PDF)? Il frontend le usa?
   - se le posizioni ci sono e manca solo il disegno → disegna il riquadro anche sulle immagini, con lo
     stesso stile dei PDF (riusa il codice di `PdfEvidenziato`: idealmente un solo visualizzatore che
     disegna su canvas sia la pagina PDF sia l'immagine);
   - se le posizioni non ci sono → nota «Posizione del campo non disponibile»; la correzione nel lettore
     (`lettore.ts`/`lettura.ts`, ora in modifica da un altro pacchetto) **scrivila nel resoconto**, non
     applicarla.
   La nota compare anche per i PDF quando il campo selezionato non ha posizione.
2. **Zoom e spostamento**: barra piccola in alto a destra del visualizzatore con «−», percentuale, «+» e
   «Adatta» (torna alla vista iniziale); Ctrl+rotella ingrandisce verso il puntatore; trascinare sposta
   quando è ingrandito; doppio clic = Adatta. Il riquadro del campo segue zoom e spostamento; selezionando
   un campo, la vista ci va sopra. Icone dal componente `Icona` esistente, pulsanti `.btn` esistenti,
   `aria-label` sui pulsanti. Niente librerie nuove. Per i PDF ridisegna alla nuova scala (niente sfocato).
   Al cambio documento si riparte da Adatta.

## File ammessi
`PdfEvidenziato.tsx` (contiene da poco la gestione errori/sagoma di `pdf-errore-visibile`: conservala),
`VistaDocumento.tsx`, eventuale nuovo componente in `app/frontend/componenti/`, `Icona.tsx` (solo aggiunte),
`app/frontend/app/stile/stile.css` (solo aggiunte in fondo, `grep` sui nomi prima), `app/frontend/lib/guida.ts`,
catalogo `app/frontend/app/(app)/componenti/page.tsx` se crei/cambi un componente. **Backend vietato**.
Aggiungi, non riscrivere.

## Regole
Leggi prima `strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`. Italiano, codice minimo. Niente
commit, 8001/8002, `cd`, `/tmp`, `&`. Skill: `ponytail-review`, `caveman`.

## Prove
`npx tsc --noEmit` frontend pulito.

## Resoconto
`strumenti/opencode/resoconto-visualizzatore-zoom.md`: diagnosi posizioni immagini, file toccati, prove,
correzione proposta per il lettore se serve, «Da documentare».
