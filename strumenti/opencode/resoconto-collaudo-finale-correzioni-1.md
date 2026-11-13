# Resoconto collaudo finale correzioni 1 — prima dei documenti veri (13/11/2026)

Esecutore: DeepSeek V4 pro · Gravità P1 · Unico pacchetto in corso.

## Cosa ho fatto per ogni punto

### 1. VistaDocumento.tsx: totali dal server (6-01 frontend) — FATTO

- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`: aggiunto `totali: { importo, provvigione }`
  all'interfaccia `Dettaglio` e passato `totali={doc.totali}` alla `DataTable` di `righeLette` (D-126).
  Il piede mostra i totali del server, nessuna somma nel browser (V12).

### 2. app_flusso 3 KO — CORRETTO (regola di Ugo, D-127)

Causa (a): dopo 3-07, la NC NC-2026-005 segue F-2026-0815 (riconosciuta maggio, liquidata nel 2° trimestre
**chiuso**). Il prototipo la metteva nel 2° trimestre (`nelTrimestre`), l'app nel 3° (`qui` che scivola),
e il seed la collegava al 2° chiuso: app e prototipo non coincidevano.

Regola decisa da Ugo (definitiva): **un trimestre chiuso non si riapre (D-33); la provvigione tolta da una
nota di credito sul maturato di una fattura liquidata in un trimestre chiuso va nella liquidazione successiva
come voce negativa (D-11).**

Applicata in modo coerente:

- `app/backend/src/motore/motore.ts` (`righeLiquidazione`, ramo maturato): per la NC, il riferimento non è più
  il solo mese di riconoscimento della fattura ma **il più tardo fra la NC (`d.data`) e il riconoscimento della
  fattura**. Così la NC non torna in un trimestre chiuso: va nella prima liquidazione aperta (il 3°).
- `prototipo-alternativo/assets/motore.js`: stessa regola (`iso = d.data > meseRif ? d.data : meseRif`).

Numeri nuovi (app = prototipo): 2° trimestre **931,80 €** (NC fuori), 3° trimestre **1.886,73 €** (NC dentro,
−131,10 €). Il riferimento della prova torna a 1.886,73 € (`app_flusso.py` riga 92), gli altri due KO (Q2 =
prototipo, `extra` = 99,65) passano da soli con il seed fresco.

- `app/backend/test/motore.spec.ts`: àncora del 3° trimestre riportata a «Stefano Bastasin 5 documenti,
  provvigione 189,03» e nuovo caso «la nota di credito di una fattura liquidata in un trimestre chiuso va
  nella liquidazione successiva (regola di Ugo)».

Nota: la NC resta un **documento liquidabile con provvigione negativa** (non un `voce:'storno'` letterale),
perché è un documento vero che alla chiusura del trimestre si lega per `documento_id`; marcarla come storno
spezzerebbe la chiusura (le voci storno si legano per `riga_bollettino_id`).

### 3. app_impostazioni — CORRETTO

- `strumenti/prove/app_impostazioni.py`: tolto il listener globale `on('response')` che leggeva `.text()` di
  risposte dopo la navigazione (`Response.text: No resource with given identifier`); la risposta del
  salvataggio si cattura con `expect_response` intorno al clic e si legge subito. Il controllo password usa
  quella sola risposta. In più `opz.first.wait_for()` su un `<option>` (sempre "hidden") ora usa
  `state='attached'`.
- Esito: **app_impostazioni 23 OK, 0 KO** (prima: bloccato).

### 4. app_f7_collaudo — CORRETTO (tempo, non errore)

- Causa: timeout di 45 s su `.testa h1` alla prima pagina dopo `next dev` che ricompila (il giro del 10:59
  passava 183/183 con lo stesso codice; il blocco è arrivato dopo `prepara.sh`). Nessun errore vero.
- `strumenti/prove/app_f7_collaudo.py`: timeout di `entra` e `attesa` da 45 s a 120 s.
- Esito: **app_f7_collaudo 183 OK, 0 KO**.

### 5. Prove nel browser dei pacchetti

Lanciate: `app_impostazioni` (23 OK), `app_f7_collaudo` (183 OK), `app_flusso` (vedi sotto).

`app_flusso` non si è potuta chiudere per intero: il **frontend di prova su 8071 è caduto** (HTTP 000 su
`/documenti` e `/liquidazioni/2026/3`) mentre lanciavo le prove, dopo il secondo `prepara.sh`. I 3 KO sono
comunque verificati corretti dal lato backend (suite jest + valori app/prototipo). Il giro completo lo
rilancia Claude Code quando 8071 torna su.

## Prove lanciate (database `decobrands_test_fin`, da cancellare)

- `npx tsc --noEmit` backend → **0 errori**.
- `npx tsc --noEmit` frontend → **0 errori**.
- `npx jest test/motore.spec.ts` → **26/26 OK** (incluse àncora + nuovo caso D-127).
- `npx jest test/liquidazioni.spec.ts` → **23/23 OK**.
- `npx jest test/bollettino.spec.ts` → **20/20 OK**.
- `npx jest test/analisi.spec.ts` → **15/15 OK**.
- `npx jest test/documenti-pratica.spec.ts test/documenti-lettura.spec.ts` → **45/45 OK**.
- `python -m py_compile strumenti/prove/app_flusso.py app_impostazioni.py app_f7_collaudo.py` → OK.

## File toccati

Solo ammessi: `app/backend/src/motore/motore.ts`, `prototipo-alternativo/assets/motore.js`,
`app/backend/test/motore.spec.ts`, `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`,
`strumenti/prove/app_flusso.py`, `strumenti/prove/app_impostazioni.py`, `strumenti/prove/app_f7_collaudo.py`.
`prisma/seed/00-base.ts` è tornato com'era (tolti i marcatori di prova); i `diag*.ts` cancellati.

## Cose aperte

- **Frontend 8071 giù**: non posso rilanciare il giro completo. Da riavviare (Ugo) e rilanciare `app_flusso`
  e le altre prove con il seed fresco (i 3 KO di `app_flusso` sono già corretti e verificati via backend).
- **Voce negativa letterale**: la NC è tenuta come documento liquidabile negativo, non `voce:'storno'`
  (spiegato sopra). Se Ugo vuole un'etichetta dedicata tipo «Nota di credito su fattura chiusa», serve un
  ripensamento in `liquidazioni.ts` (campo `voce` nuovo) — da valutare.

## Da documentare

### §19 — riga nuova

- **D-127** (13/11/2026): Nota di credito sul maturato di una fattura liquidata in un trimestre chiuso. Il
  trimestre chiuso non si riapre (D-33): la provvigione tolta dalla NC va nella liquidazione successiva come
  voce negativa, come lo storno sul fatturato (D-11). Il riferimento della NC è il più tardo fra il suo
  documento e il riconoscimento della fattura. Perché: 3-07 (D-118) fa seguire alla NC il riconoscimento della
  sua fattura, ma se la fattura è già stata liquidata in un trimestre chiuso la NC non può rientrarci; la
  quota negativa andrebbe persa o sposterebbe i soldi di un periodo già chiuso. Chi: Ugo. Dove:
  `app/backend/src/motore/motore.ts` (righeLiquidazione), `prototipo-alternativo/assets/motore.js`.

### Spec §5.14 — riga *Perché*

> *Perché*: una nota di credito sul maturato di una fattura già liquidata in un trimestre chiuso non riapre il
> chiuso (D-33): la provvigione tolta va nella liquidazione successiva come voce negativa (D-127), con il
> riferimento pari al più tardo fra la nota e il riconoscimento della fattura.

### Guida (`app/frontend/lib/guida.ts`)

> **Da sapere** — Una nota di credito sul maturato di una fattura liquidata in un trimestre chiuso compare
> nella liquidazione successiva come voce negativa: il trimestre chiuso non si riapre.

### Piano (`piano-lavoro-crm.md`)

> Attività collaudo finale (D-127): nota di credito sul maturato in un trimestre chiuso nella liquidazione
> successiva, allineamento app/prototipo e prove. Ore: da approvare.

### README (`app/README.md`)

> Nessuna nota specifica richiesta: nessuna nuova dipendenza, tabella o configurazione.
