# Pacchetto `layout-due-colonne`

## Problemi (giri nel browser 0.2.9 e 0.2.12)
1. Pagine a due colonne (elenco a sinistra, dettaglio a destra: Fornitori, Clienti, Soggetti, Subagenti, …) fra ~1100 e
   ~1250 px: la colonna destra scende a ~300 px e le tabelle del dettaglio (es. scaglioni a 6 colonne) non ci stanno.
2. Clienti → scheda **Agenzie**: 7 colonne `nowrap` larghe ~894 px in un pannello di ~495 px → scorrimento orizzontale a
   1440 e a 768 (2 KO in `strumenti/prove/app_clienti.py`: «Agenzie 1440/768: scorrimento orizzontale della tabella»).
Regola del progetto: le tabelle **non scorrono di lato** (`strumenti/regole-interfaccia.md`, 26b); niente telefono, si
prova a 1440 e 768 (D-44).

## Compito
- Trova dove si decide la larghezza delle due colonne (classe comune in `app/frontend/app/stile/stile.css` o in
  `componenti/Pagina.tsx`) e correggi **lì, una volta per tutte**: la colonna del dettaglio ha una larghezza minima utile
  (es. ≥ 560 px) e sotto la soglia le due colonne vanno una sopra l'altra (o l'elenco si stringe), così fra 1100 e 1250 il
  dettaglio non scende sotto la minima. Controlla con grep che le classi che tocchi o crei non esistano già con altro uso.
- Scheda Agenzie: colonne essenziali, testi che vanno a capo (niente `nowrap` sui testi lunghi), dettagli secondari in
  seconda riga tenue o nella pagina dell'agenzia; nessuna barra orizzontale a 1440 e 768.
- Note fisse di `clienti/**`: portale nel pulsante «i» con il componente `Informazioni`, con il criterio di
  `strumenti/opencode/note-informazioni.md` (leggilo; quel pacchetto ha già fatto le altre pagine).
- Schermate e prove: dalla radice `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e` e poi
  `bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_clienti` (poi prepara + `app_fornitori`, prepara +
  `app_soggetti`, prepara + `app_subagenti`): 0 KO; aggiungi nelle prove schermate a **1200 px** delle pagine a due
  colonne e guardale. Le porte 8012/8071 sono libere quando parti tu.

## File ammessi
`app/frontend/app/stile/stile.css`, `app/frontend/componenti/Pagina.tsx` (solo se la larghezza sta lì),
`app/frontend/app/(app)/clienti/**`, `app/frontend/app/(app)/fornitori/**`, `app/frontend/app/(app)/soggetti/**`,
`app/frontend/app/(app)/subagenti/**`, `strumenti/prove/app_clienti.py`, `app_fornitori.py`, `app_soggetti.py`,
`app_subagenti.py`, `strumenti/regole-interfaccia.md`.

## Regole
`strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md` §3, §5. Niente backend, niente database vero, niente
8001/8002, niente commit, `cd`, `/tmp`, `&`, `.env`. `npx tsc --noEmit` frontend pulito. Skill: `ui-ux-pro-max`,
`playwright-best-practices`, `ponytail-review`, `caveman`. Resoconto `strumenti/opencode/resoconto-layout-due-colonne.md`
con le schermate guardate. Riepilogo in 8 righe.
