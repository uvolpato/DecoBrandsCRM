# Pacchetto `documenti-sostituiti-visibili`

## Richiesta di Ugo (17/11/2026)
Con D-204 («Sostituisci l'ordine/conferma/proforma registrato», pacchetto `ordine-aggiornato`) il documento della pratica
prende dati, righe e PDF nuovi; il PDF vecchio resta collegato alla pratica (documento in arrivo con
`abbinato_pratica_id`), i valori di prima stanno solo nel registro. Ugo: **gli ordini sostituiti devono restare visibili e
consultabili**; oggi nella pratica si vede solo il sostituto.

## Regola
- Nella pratica (scheda dei documenti / elenco documenti della pratica e «Consulta documenti») ogni documento sostituito
  compare come **versione precedente** sotto il documento attuale: tipo, numero, data, importo, numero righe, «sostituito
  il … da … — motivo», con il pulsante per aprire il **PDF vecchio** e le **righe lette** di allora (dai campi letti del
  documento in arrivo vecchio, `documenti_campi`) in sola lettura. Più sostituzioni → tutte, dalla più recente.
- I dati vengono dal server (V12): il collegamento fra documento attuale e documenti in arrivo vecchi si ricava dagli
  eventi di sostituzione nel registro (`sostituito: true`, `prima.arrivo_id`) o, se più semplice e robusto, da una colonna
  nuova sul documento in arrivo (`sostituito_da_documento_id`, `sostituito_il`) scritta nella stessa transazione della
  sostituzione; **preferisci la via senza migrazione** (registro + `abbinato_pratica_id` già esistenti): una migrazione rigenera il
  client Prisma condiviso e ferma il backend di Ugo sulla 8002 finché non è applicata; se proprio serve, fermati e scrivilo
  nel resoconto prima di farla. Scegli comunque la via più corretta, e per le sostituzioni già fatte (dati veri) prevedi il recupero dal
  registro dentro la migrazione o un comando di servizio con `--prova` (non lanciarlo su `decobrands_db`).
- Le versioni precedenti **non contano** in nessun calcolo (provvigioni, sconto medio, totali, attese): sono solo da
  consultare. Nella pagina Documenti/Scartati non riappaiono come da lavorare.
- Il pacchetto `pratica-elimina-annulla` (in lavoro adesso o appena finito) elimina le pratiche: con l'eliminazione anche i
  PDF delle versioni precedenti vanno negli scartati come gli altri; leggi il suo resoconto e allinea.

## In più (piccolo, stesse pagine)
Il pacchetto `pratica-elimina-annulla` manda già dal server il conteggio «Ordini annullati» per l'Analisi ma la pagina
non lo mostra: aggiungilo in `app/frontend/app/(app)/analisi/VistaAnalisi.tsx` come riquadro/KPI tenue, solo lettura.

## Prove (jest con `DATABASE_URL_TEST` su `decobrands_test_sostituiti`, crea e cancella; 0 KO; `tsc` backend e frontend)
- sostituisci due volte un ordine → la pratica restituisce il documento attuale + 2 versioni precedenti con PDF, data,
  importo, righe, motivo; i calcoli della pratica identici a prima della modifica;
- PDF della versione precedente scaricabile con gli stessi permessi dei documenti della pratica;
- eliminazione della pratica → anche le versioni precedenti negli scartati.
Prova nel browser: controlli in `strumenti/prove/app_pratica.py` (solo `py_compile`).

## File ammessi
`app/backend/src/**`, `app/backend/prisma/schema.prisma` + migrazione (se scegli la colonna), `app/backend/test/**`,
`app/frontend/app/(app)/pratiche/**`, `app/frontend/app/(app)/documenti/**`, `app/frontend/componenti/ConsultaDocumenti.tsx`, `app/frontend/app/(app)/analisi/VistaAnalisi.tsx`,
`app/frontend/lib/guida.ts`, `strumenti/prove/app_pratica.py`, `specifica-crm-provvigioni.md` (aggiorna D-204 e il suo
*Perché*, versione +0.01).

## Regole
`strumenti/opencode/regole-onda-parallela.md` (niente script fuori da jest che toccano il db) e `CLAUDE.md`. V12, V13, D-31,
D-183, D-204. Non togliere niente del lavoro di `pratica-elimina-annulla`. Migrazione scritta, non applicata. Niente commit,
`cd`, `/tmp`, `&`, `.env` letto, porte 8001/8002/8012/8071. Skill: `owasp-security`, `postgresql-code-review` (se migrazione),
`ponytail-review`, `caveman`. Resoconto `strumenti/opencode/resoconto-documenti-sostituiti-visibili.md`. Riepilogo in 8 righe.
