# Pacchetto `filtro-modale-tendina`

## Contesto
Il pacchetto `filtro-stato-in-modale` ha aggiunto a `app/frontend/componenti/CampoRicerca.tsx` il
parametro opzionale `segmenti` (voci, valore, onCambia), mostrato come riga di segmenti
(Tutte · Solo ordine · Confermata · Fatturata) **sopra** il campo «Cerca pratica» nella modale di ricerca.

Ugo (15/11/2026): quel filtro diventa un **menu a tendina** sulla **stessa riga del campo di ricerca,
a destra** (il campo resta a sinistra, la tendina allineata al bordo destro della tabella). La riga di
segmenti sopra sparisce.

## Compito
- Solo il disegno dentro `CampoRicerca.tsx`: stesso parametro e stessa firma (le pagine che lo usano non
  cambiano), resa con `<select>` nativo, classi esistenti (`grep` su `stile.css` prima di crearne;
  fuoco con bordo interno, D-64), etichetta accessibile (il `aria-label` dal parametro o «Stato»).
- Il cambio di voce ricarica i risultati come adesso.

## File ammessi
Solo `app/frontend/componenti/CampoRicerca.tsx` (e `app/frontend/app/stile/stile.css` solo se serve una
regola di allineamento, aggiungendo in fondo). È in corso un altro pacchetto su `VistaDocumento.tsx`,
`componenti/page.tsx`, `lib/guida.ts`: **non toccarli**. Aggiungi, non riscrivere.

## Regole
Leggi prima `strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`. Italiano, codice minimo.
Niente commit, 8001/8002, `cd`, `/tmp`, `&`. Skill: `ponytail-review`, `caveman`.

## Prove
`npx tsc --noEmit` frontend pulito.

## Resoconto
`strumenti/opencode/resoconto-filtro-modale-tendina.md`: file toccati, prove, «Da documentare».
