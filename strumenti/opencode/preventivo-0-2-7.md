# Pacchetto `preventivo-0-2-7`

## Compito
Aggiornare `preventivo-crm-provvigioni.md` (e il piano `piano-lavoro-crm.md` §12/F7, se le attività mancano)
con il lavoro fatto dopo l'ultimo aggiornamento del preventivo (13/11/2026, versione 0.2.0):

1. Versioni **0.2.1 → 0.2.6**: leggi `git log --format="%h %ad %s" --date=short` dopo il 13/11 e i commit
   (`git show --stat`), più spec (versioni in testa) e §19 per le decisioni (D-nn).
2. Lavoro di oggi, **non ancora committato** (diventerà 0.2.7), dai resoconti in `strumenti/opencode/`:
   `resoconto-sconto-riga.md`, `resoconto-sconto-da-grezza.md`, `resoconto-filtro-stato-pratiche.md`,
   `resoconto-importo-calcolato.md`; più il limite del selettore dei mesi dei Bollettini (si torna fino al
   primo documento, `app/backend/src/bollettini.ts`) e la correzione della `Modale` (`<p>` → `<div>`).
3. In §5 aggiungi le variazioni nuove (V19, V20, …) raggruppate per argomento (non una riga per commit), con
   attività del piano, perché (D-nn), ore e importo a € 55,00/h come le altre righe, tutte **da approvare**.
   Ore: stima prudente dalla dimensione dei commit e dei resoconti, coerente con le righe esistenti
   (es. V15 = 10 h). Se una cosa è una correzione di un difetto nostro, va nel collaudo (V18, fuori dai
   totali), non in una variazione nuova: scrivilo.
4. Aggiorna il totale di §5, il margine del 25 %, la tabella §6 e la riga «aggiornato il» in testa
   (15/11/2026, versione 0.2.7). Ricontrolla le somme.
5. Nel piano `piano-lavoro-crm.md` aggiungi le attività F7 corrispondenti con le stesse ore, **da approvare**.
6. Lancia `python3 strumenti/genera-pagine-doc.py` (rigenera `prototipo-crm/preventivo.html`).

## File ammessi
`preventivo-crm-provvigioni.md`, `piano-lavoro-crm.md`, `prototipo-crm/preventivo.html`, `prototipo-crm/specifica.html`
(rigenerate dallo strumento). Nient'altro: niente codice, niente spec.

## Regole
- Leggi prima `strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`.
- Italiano semplice e conciso, stesso stile delle righe esistenti. Niente commit, push; niente `cd`, `/tmp`, `&`.
- Skill: `caveman`.

## Resoconto
`strumenti/opencode/resoconto-preventivo-0-2-7.md`: righe aggiunte con ore, totali prima/dopo, dubbi
(in particolare cosa hai messo nel collaudo invece che nelle variazioni).
