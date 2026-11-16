# Resoconto `filtro-modale-tendina` (15/11/2026)

## File toccati
- `app/frontend/componenti/CampoRicerca.tsx`: nella maschera di ricerca (`RicercaEntita`) la riga di segmenti
  sopra il campo è diventata un `<select>` nativo (`className="filtro-select"`, fuoco con bordo interno D-64)
  sulla stessa riga del campo, a destra. Stesso parametro e stessa firma `segmenti`; aggiunto solo il campo
  opzionale `etichetta?: string` al tipo `SegmentiRicerca` (nessuna pagina cambia). `aria-label` =
  `segmenti.etichetta ?? 'Stato'`. Il cambio voce chiama `onCambia`, quindi i risultati si ricaricano come prima.
- `app/frontend/app/stile/stile.css`: due regole in fondo, `.ricerca-filtri` (riga flex) e
  `.ricerca-filtri > .filtri { flex: 1 1 auto }`, così la tendina resta al bordo destro della tabella.
  Nessuna classe nuova per il fuoco: si riusa `.filtro-select`.

## Prove
- `npx tsc --noEmit` frontend: pulito.
- Prove nel browser non lanciate (regole dell'onda).

## Da documentare
- `specifica-crm-provvigioni.md` §16.4 / pagina Pratiche (e Documenti): nella finestra di ricerca il filtro di
  stato è una **tendina a destra del campo di ricerca**, non più una riga di segmenti. Decisione di Ugo
  dell'11/11/2026 (15/11/2026), con il perché: il campo e lo stato stanno su una riga sola.
- Nuova riga nel registro §19 (numero da assegnare) e «Perché» nella sezione della pagina.
- `app/frontend/lib/guida.ts`: la guida della finestra di ricerca va aggiornata (menzione dei segmenti in cima).
  Non toccato: file in lavorazione da un altro pacchetto della stessa onda.
- Catalogo `componenti/page.tsx`: anche l'esempio `d-seg` ora mostra la tendina; descrizione `segmenti` nella
  tabella delle firme (riga `firma`) da allineare. Non toccato: file in lavorazione da un altro pacchetto.
