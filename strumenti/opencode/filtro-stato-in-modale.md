# Pacchetto `filtro-stato-in-modale`

## Contesto
Il pacchetto `filtro-stato-pratiche` (resoconto `strumenti/opencode/resoconto-filtro-stato-pratiche.md`)
ha messo nella scheda del documento (`app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`,
sezione «Oppure abbina a un'altra pratica») i segmenti **Tutte · Solo ordine · Confermata · Fatturata**
(`STATI_ABBUNA`, `statoFiltro`) davanti al campo di ricerca.

Ugo (15/11/2026): quel filtro **va tolto dalla pagina** e messo **dentro la modale della ricerca**
(quella che si apre con la lente, `Modale titolo="Cerca …"` in `app/frontend/componenti/CampoRicerca.tsx` ~342).

## Compito
1. In `CampoRicerca.tsx` aggiungi un parametro **opzionale e generico** (componente parametrico, regola
   del progetto) per mostrare dei segmenti di filtro in cima alla modale, ad esempio
   `segmenti?: { voci: {valore,etichetta}[]; valore; onCambia }`. Usa i `.segmenti` già esistenti
   (role=tablist/tab), nessuna classe CSS nuova se non serve (prima `grep` su `stile.css`). Senza il
   parametro il campo resta identico ovunque.
2. In `VistaDocumento.tsx` togli i segmenti dalla riga «Oppure abbina…» (resta testo + campo + Abbina)
   e passali al campo di ricerca: valore iniziale dal tipo del documento (`STATO_DAL_TIPO`, come oggi),
   il cambio ricarica i risultati della modale dal server. Il campo scritto direttamente (senza modale)
   continua a usare lo stesso filtro.
3. Se il catalogo dei componenti (`app/frontend/app/(app)/componenti/page.tsx`) mostra `CampoRicerca`,
   aggiungi un esempio con i segmenti. Aggiorna la nota in `app/frontend/lib/guida.ts` (il filtro sta
   nella finestra di ricerca).

## File ammessi
`CampoRicerca.tsx`, `VistaDocumento.tsx`, `componenti/page.tsx`, `lib/guida.ts`. Aggiungi, non
riscrivere: modifiche non committate di altri pacchetti da conservare. Backend vietato (il server già
accetta `stato`).

## Regole
Leggi prima `strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`. Italiano. Codice minimo.
Niente commit, porte 8001/8002, `cd`, `/tmp`, `&`. Skill: `ponytail-review`, `caveman`.

## Prove
`npx tsc --noEmit` frontend pulito. Schermata Playwright a 1440 e 768 della modale aperta con i segmenti
(su server di prova, non 8001/8002) se le regole lo consentono; altrimenti scrivilo nel resoconto.

## Resoconto
`strumenti/opencode/resoconto-filtro-stato-in-modale.md`: file toccati, prove, dubbi, «Da documentare».
