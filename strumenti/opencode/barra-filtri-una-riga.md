# Pacchetto `barra-filtri-una-riga`

## Contesto
Pagina **Pratiche** (`app/frontend/app/(app)/pratiche/VistaPratiche.tsx`), barra dei filtri (`FilterBar`):
segmenti «Tutte 3 · Conferma in ritardo 1 · Attesa conferma 0 · Attesa fattura 0 · Fatturate 2 · Con variazioni 2»,
ricerca «Cerca pratica, cliente, documento» (larga), «Tutti i fornitori», «Tutti i clienti», «Tutti i subagenti»
e i due pulsanti filtro/riepilogo che **vanno a capo** su una seconda riga a 1440 px.

Ugo (15/11/2026):
1. la ricerca più stretta, così **tutto sta su una riga** a 1440 px;
2. quando la finestra si stringe e i segmenti non ci stanno più, i segmenti diventano **un menu a tendina**
   (stesse voci con i numeri, es. «Conferma in ritardo (1)»), invece di andare a capo.

## Compito
- Fallo nel componente `FilterBar` (componente parametrico: vale per tutte le pagine che hanno segmenti, che
  così guadagnano lo stesso comportamento; nessun cambio di firma obbligatorio). Misura con `ResizeObserver`
  se la barra sta su una riga; se no, segmenti → `<select>` nativo (classe `filtro-select` esistente,
  `aria-label` = etichetta dei segmenti o «Stato»). Isteresi per non sfarfallare al limite.
- Ricerca: larghezza contenuta (es. `flex: 0 1 260px; min-width: 180px`), i campi entità restano compatti.
- I numeri dei segmenti restano dal vivo (D-23); la scelta resta nella memoria della schermata (§7.12).
- Niente telefono (D-44): basta che funzioni da 1440 a 768 px.
- Catalogo componenti (`app/frontend/app/(app)/componenti/page.tsx`) e nota in `strumenti/regole-interfaccia.md`
  (regola: «barra filtri su una riga; segmenti in tendina quando non ci stanno»).

## File ammessi
`app/frontend/componenti/FilterBar.tsx`, `VistaPratiche.tsx`, `app/frontend/app/stile/stile.css` (aggiunte in
fondo, `grep` sui nomi prima), `componenti/page.tsx`, `strumenti/regole-interfaccia.md`. **Non toccare**
`VistaPratica.tsx`, `VistaDocumento.tsx`, `CampoRicerca.tsx` (altri pacchetti in corso). Aggiungi, non riscrivere.

## Regole
Leggi prima `strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`. Codice minimo. Niente commit,
8001/8002, `cd`, `/tmp`, `&`. Skill: `ponytail-review`, `caveman`.

## Prove
`npx tsc --noEmit` frontend. Riepilogo in 6 righe, resoconto breve in
`strumenti/opencode/resoconto-barra-filtri-una-riga.md` (pagine che cambiano comportamento).
