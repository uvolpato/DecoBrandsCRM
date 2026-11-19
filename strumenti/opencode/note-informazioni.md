# Pacchetto `note-informazioni`

## Contesto
In 0.2.9 è nato il componente `Informazioni` (pulsante a icona «i» in alto a destra che apre una finestra), usato in
Fornitori → Percentuali e Soggetti → Ruoli. Regola in `strumenti/regole-interfaccia.md` (26b). Ugo (17/11/2026): portare
allo stesso modo le **altre note** dell'app (`<Nota>`, ~60 in 16 file di `app/frontend/app/(app)/**`).

## Cosa spostare e cosa no (giudizio, pagina per pagina)
- **Si spostano** nella finestra «i»: le **spiegazioni fisse** di come funziona una pagina, una tabella o un pannello
  (definizioni di colonne, regole, «da sapere», rimandi alle decisioni), che stanno lì sempre uguali.
- **Restano dove sono**: i messaggi che **dipendono dalla situazione** e chiedono di agire o avvisano (es. «Questo ordine
  c'è già nella pratica N…», «Integra non raggiungibile…», «Senza subagente la provvigione è tutta di Decobrands» quando
  il campo è vuoto, avvisi di errore, stati vuoti, testi dentro le finestre di modifica che spiegano un campo).
- Nel dubbio resta. Elenca nel resoconto ogni `<Nota>` con la scelta (spostata / restata) e il perché in una riga.

## Come
- Usa il componente `Informazioni` che c'è già; un pulsante «i» per pannello/scheda, in alto a destra accanto alle azioni
  (come in Percentuali e Ruoli). Titolo della finestra = nome della pagina o della scheda. Più note fisse dello stesso
  pannello → una sola finestra, in punti brevi.
- Non cambiare i testi (al massimo dividerli in punti). Non toccare `componenti/**` né `stile.css`.
- La **Guida** (`VistaGuida.tsx`) e il catalogo `componenti/page.tsx`: lascia stare le note che sono il contenuto stesso.
- Le prove nel browser che leggono il testo di una nota spostata (grep sui testi in `strumenti/prove/app_*.py`): aggiornale
  perché aprano la finestra «i» prima di leggere; solo `py_compile`, **non lanciarle**.

## File ammessi
`app/frontend/app/(app)/**` **tranne** `clienti/**` (lì lavora un altro pacchetto; le note di Clienti le fa il pacchetto
`layout-due-colonne` dopo di te), `strumenti/prove/app_*.py` tranne `app_clienti.py`, `strumenti/regole-interfaccia.md`
(una riga sul criterio sposta/resta).

## Regole
`strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`. Solo frontend: niente backend, niente database, niente porte.
`npx tsc --noEmit` frontend pulito. Niente commit, `cd`, `/tmp`, `&`, `.env`. Skill: `ui-ux-pro-max`, `ponytail-review`,
`caveman`. Resoconto `strumenti/opencode/resoconto-note-informazioni.md` (tabella file → nota → scelta → perché).
Riepilogo in 8 righe.
