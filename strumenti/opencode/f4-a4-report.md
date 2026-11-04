# F4-A4 — Report subagenti nella Liquidazione

Compito: la seconda scheda del pannello di destra delle Liquidazioni, accanto a *Documenti*,
con il suo API. Modello indicato dal piano: Sonnet. In OpenCode: il modello della sessione.

## Cosa consegnare

1. **API** `GET /api/liquidazione/report?anno=&trimestre=&subagente=` (§7.8, §8.1),
   `provvigioni.consulta`, 400 su anno/trimestre fuori range, 404 se il subagente non esiste.
   Numeri dal motore, mai dal browser (V12): carica `S` una volta con `caricaDati` e usa
   `analisiTrimestre` (già in `src/motore/motore.ts`) per il trimestre e per il trimestre prima
   (1° trimestre → 4° dell'anno prima). **Due modi:**
   - senza `subagente`: `{anno, trimestre, precedente: {anno, trimestre}, subagenti: [{id, nome,
     clienti, documenti, fatturato, prese, pagate, margine, quota, delta}]}` — `quota` = provvigione
     su prese in %, `delta` = variazione % della provvigione sul trimestre prima (null se il
     precedente è zero); ordinati per provvigione decrescente;
   - con `subagente`: `{anno, trimestre, precedente, subagente: {id, nome}, numeri: {fatturato,
     prese, pagate, margine, clienti, documenti, delta: {fatturato, pagate, margine}},
     trimestri: [{trimestre, pagate, margine, attivo}], primi_clienti: [{nome, fatturato,
     provvigione}]}` — `trimestri` = 1..4 dell'anno senza i futuri (`attivo` sul trimestre scelto),
     `primi_clienti` = primi 5 per fatturato dalle righe del trimestre di quel subagente.
   Null se il subagente non ha documenti: zeri, non un errore (il prototipo mostra zeri).
2. **Scheda** *Report subagenti* in `VistaLiquidazioni.tsx`, seconda di `Schede` dopo *Documenti*
   (il pannello ha già `Schede` e `memoria="liquidazioni"`). Si carica insieme alla pagina o
   quando si apre la scheda; si ricarica cambiando trimestre o subagente a sinistra.
   - **Nessun subagente scelto**: barre orizzontali impilate (provvigione al subagente grigio +
     margine Decobrands verde) e tabella per subagente: nome con clienti · documenti, fatturato,
     provvigione, margine, variazione % sul trimestre prima (`—` se non c'è); riga totale; piede
     che spiega margine e ultima colonna.
   - **Subagente scelto**: 3 numeri con il confronto sul trimestre prima (fatturato dei suoi
     clienti, provvigione, margine), barre dei trimestri dell'anno con il trimestre scelto
     segnato, primi 5 clienti con fatturato e provvigione.
   - In fondo la nota con il link *Analisi completa* con lo stesso periodo (e il subagente).
   - La scheda *Documenti* resta la prima e non cambia; sagome anche per la scheda report.
3. **Prove**: casi nuovi in `app/backend/test/liquidazioni.spec.ts` (o file a parte
   `liquidazione-report.spec.ts`) confrontati con il prototipo: elenco subagenti e delta,
   numeri del subagente scelto, trimestri dell'anno (futuri esclusi), primi 5 clienti, 400/404,
   sola lettura 200 e 403 senza area. Estendi `strumenti/prove/app_liquidazioni.py` con la
   scheda Report (due modi, cambio subagente, 768 px), 0 KO.

## Dove

- Backend: `app/backend/src/liquidazioni.ts` (nuova rotta accanto a quelle di D-57) o un file
  suo se resta più leggibile; `src/motore/motore.ts` solo se manca un dato (`analisiTrimestre`
  c'è già: non riscriverla).
- Frontend: `app/frontend/app/(app)/liquidazioni/VistaLiquidazioni.tsx`.
- Prototipo da replicare: `prototipo-alternativo/assets/viste-periodo.js` → `function
  reportSubagenti` (testi, colonne, colori, note) e `componenti.js` (`Grafico`, `KpiRow`,
  `DataTable`).
- Spec: §7.8 (*Report subagenti*), §8.1, §16.4. Piano: F4-A4.
- Aggiorna `specifica-crm-provvigioni.md` (versione in testa, §7.8, §8.1) e
  `piano-lavoro-crm.md` (F4-A4). **Non** toccare `avanzamento-app.md`.

## Regole

- Tutto sul backend, mai dai dati del frontend (V12); niente calcoli dei soldi nel browser
  (percentuali e variazioni le manda il server).
- Italiano semplice in interfaccia, codice e commenti; commenti brevi con il rimando
  (`// D-18 §19`).
- Codice minimo (ponytail): riusa `Grafico`, `KpiRow`, `DataTable`, `Schede`, `Sagoma`,
  `Nota`, `Pagina`; niente `react-chartjs-2` nuovo, il `Grafico` c'è già.
- Prove solo su `decobrands_test`, mai su `decobrands_db`; niente reset distruttivi;
  niente commit, niente push, niente `.env`.
- Prima di grep o letture per domande sul codice, `graphify query "<domanda>"`.
- Schermate 1440 e 768 px e guardale (niente telefono, D-44).

## Verifica

- `npx tsc --noEmit` pulito (backend e frontend), `npm run build` frontend.
- `npx jest test/liquidazioni.spec.ts --runInBand` (e l'eventuale file nuovo) 0 KO; le altre
  spec una per processo (Jest tutto insieme su Windows si pianta), 0 KO.
- `python strumenti/prove/app_liquidazioni.py <suffisso> <cartella>` 0 KO, da seed pulito
  (la prova chiude il 3° trimestre: serve un seed nuovo e gli utenti `<s>-ammi/oper/lett`).

## Resoconto

`strumenti/opencode/resoconto-f4-a4.md`: file toccati, prove, schermate, dubbi e cose
lasciate aperte (in particolare: la pagina Analisi come link, le correzioni D-27).
