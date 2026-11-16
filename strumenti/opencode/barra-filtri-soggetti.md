# Pacchetto `barra-filtri-soggetti`

Leggi `strumenti/opencode/resoconto-barra-filtri-una-riga.md` (sezioni iniziale e «Lampeggio»). Il lampeggio è
sparito. Ma nella pagina dei **Soggetti** (anagrafica unica: «Codice, nome, P.IVA o codice fiscale» + segmenti
«Tutti 1885 · Clienti 1858 · Fornitori 14 · Subagenti 13 · Non attivi 0») a finestra media la barra **va a capo**
(ricerca sulla prima riga, segmenti sotto, a destra) e **non diventa tendina**. Ugo si aspetta la tendina.

Probabile causa: le regole CSS dedicate ai Soggetti (e forse Clienti, Analisi) lasciate intatte dal primo
pacchetto (`flex-wrap`, larghezze proprie, `margin-left:auto`) oppure il contenitore osservato non è quello
giusto in quella pagina (il padre è più largo della barra), quindi `contenitore >= necessaria` anche quando la
barra va a capo.

## Compito
- Trova la causa (cerca la vista dei Soggetti in `app/frontend/app/(app)/` e le sue regole in `stile.css`).
- Regola unica per tutte le pagine: la barra filtri sta su **una riga**; se non ci sta, i segmenti diventano
  tendina; mai a capo. Allinea le regole dedicate (Soggetti, Clienti, Analisi…) a questa regola, senza perdere
  le loro larghezze utili (es. ricerca più larga dove serve, purché si riduca).
- Nessun ritorno del lampeggio: la decisione resta sulle grandezze stabili del pacchetto «Lampeggio».
- Controlla tutte le pagine con `FilterBar` a 1440, 1100 e 768 px: elenca nel resoconto quelle provate e il
  risultato. Se riesci ad avviare il frontend su una porta di prova (non 8001/8002), usa
  `strumenti/prove/app_filtri_lampeggio.py` allargato ai Soggetti, e fai anche una schermata per larghezza.

File ammessi: `app/frontend/componenti/FilterBar.tsx`, `app/frontend/app/stile/stile.css`, le viste con barra
filtri solo se serve togliere un loro stile in linea, `strumenti/prove/app_filtri_lampeggio.py`. **Non toccare**
`VistaDocumento.tsx`, `VistaPratica.tsx`, backend. Regole: leggi prima `strumenti/opencode/regole-onda-parallela.md`.
Niente commit, `cd`, `/tmp`, `&`. Skill: `ponytail-review`, `caveman`. Prove: `npx tsc --noEmit` frontend.
Aggiorna il resoconto (sezione «Soggetti»). Riepilogo in 5 righe.
