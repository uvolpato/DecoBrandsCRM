# Pacchetto `pdf-errore-visibile`

## Contesto
Leggi `strumenti/opencode/resoconto-pdf-pagamento-non-visto.md`. Causa probabile: in
`app/frontend/componenti/PdfEvidenziato.tsx` il caricamento del PDF finisce in `.catch(() => {})`: un errore
(chunk/worker di pdf.js a cache fredda) lascia il pannello grigio e muto; inoltre la misura della larghezza
a 0 al montaggio può bloccare il disegno.

## Compito
Applica la correzione proposta nel resoconto, minima:
- un tentativo automatico in più se il caricamento fallisce; se fallisce ancora, messaggio nel pannello
  «Non riesco a mostrare il PDF» con il pulsante «Riprova» e il link «Apri il PDF» (stesso indirizzo del
  file, nuova scheda);
- se la larghezza misurata è 0 al montaggio, il disegno parte appena il pannello ha una larghezza
  (ResizeObserver già usato? riusalo), non resta fermo;
- mentre carica, sagoma (D-59, componente `Sagoma` esistente), non pannello vuoto.

## File ammessi
Solo `app/frontend/componenti/PdfEvidenziato.tsx` (e `app/frontend/app/stile/stile.css` solo aggiunte in fondo,
dopo `grep` sui nomi). Altri pacchetti stanno su `VistaDocumento.tsx`, `CampoRicerca.tsx` e backend: non toccarli.

## Regole
Leggi prima `strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`. Italiano, codice minimo. Niente
commit, 8001/8002, `cd`, `/tmp`, `&`. Skill: `ponytail-review`, `caveman`.

## Prove
`npx tsc --noEmit` frontend pulito.

## Resoconto
`strumenti/opencode/resoconto-pdf-errore-visibile.md`: file toccati, prove, «Da documentare».
