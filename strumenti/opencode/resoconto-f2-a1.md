# Resoconto F2-A1 — elenco pratiche

## File toccati

- `app/backend/src/pratiche.ts` (nuovo): `PraticheController`, `GET /api/pratiche`.
- `app/backend/src/app.module.ts`: registrato `PraticheController`.
- `app/backend/test/pratiche.spec.ts` (nuovo): 7 prove.
- `app/frontend/app/(app)/pratiche/page.tsx`, `layout.tsx`, `[id]/page.tsx`,
  `VistaPratiche.tsx` (nuovi): la pagina e il segnaposto del dettaglio (F2-A2).
- `app/frontend/componenti/DataTable.tsx`: modalità a ordinamento e pagine decise dal server
  (`ordine`, `onOrdine`, `paginaServer`, `onPagina`); senza queste proprietà il comportamento
  resta quello di prima.
- `app/frontend/lib/entita.ts`: entità `cliente` per il filtro (mancava).
- `app/frontend/app/(app)/componenti/page.tsx`: firma del componente `DataTable` nel catalogo.
- `specifica-crm-provvigioni.md`: versione 8.10, §7.2/§7.3 (rotta `/pratiche`, colonne, tutto
  sul server, variazioni in euro), §8.1 (`GET /api/pratiche`).
- `prototipo-crm/specifica.html`: rigenerato.
- `prototipo-alternativo/assets/guida.js`: la pagina Pratiche dice che nella lista la
  variazione porta lo scostamento in euro.
- `strumenti/prove/app_pratiche.py` (nuovo): 19 controlli.

## Forma della risposta di `GET /api/pratiche`

Permesso: `provvigioni.consulta` (lettura compresa).

Query: `stato` (`tutte|scaduta|attesa|confermata|fatturata|variazioni`, predefinito `tutte`),
`q` (numero, cliente, fornitore, numero documento), `fornitori`, `clienti`, `subagenti` (id
separati da virgola), `dal`/`al` (data ordine, `aaaa-mm-gg`), `ordina`
(`numero|cliente|fornitore|data|importo|stato|subagente`, predefinito `stato`), `dir`
(`asc|desc`), `pagina` (da 0), `perPagina` (1–200, predefinito 25).

```json
{
  "righe": [{
    "id": "1", "numero": "OF/2026/041",
    "cliente_id": "1", "cliente": "Vivaio Verde Azzurro s.r.l.",
    "fornitore_id": "1", "fornitore": "Gries GmbH & Co. KG",
    "subagente_id": "1", "subagente": "Stefano Bastasin",
    "data": "2026-07-28", "importo": 8945.20,
    "stato": "scaduta", "nota": "da 77 giorni",
    "variazioni": false, "variazione": 0
  }],
  "totale": 54,
  "conteggi": { "tutte": 54, "scaduta": 9, "attesa": 0, "confermata": 8, "fatturata": 37, "variazioni": 3 },
  "totali": { "importo": 160951.28 },
  "pagina": 0, "pagine": 3, "per_pagina": 25
}
```

`conteggi` è calcolato **senza** il filtro di stato (D-23); `totale`, `totali` e le righe con
lo stato scelto. Stato, importi e variazioni li calcola il motore dal database
(`statoPratica`, `importoPratica`, `confronto`, `haVariazioni`), nessun calcolo nel browser.

## Prove

- Frontend: `npx tsc --noEmit` e `npm run build`: 0 errori.
- Backend: `npx tsc --noEmit`: 0 errori; `npx jest --runInBand`: **14 suite, 198 prove, 0 KO**
  (di cui 7 nuove in `pratiche.spec.ts`).
- Browser (`f1-ammi`, `f1-oper`; backend 8012 su `decobrands_test_f1a1`, frontend 8011):
  - `app_pratiche.py`: **19 controlli, 0 KO**, nessun errore JavaScript.
  - regressioni: `app_fornitori.py` 25/0 KO, `app_subagenti.py` 30/0 KO,
    `app_clienti.py` 33/0 KO.
- Porte 8011 e 8012 chiuse; nessun commit, nessun `.env` toccato.

## Schermate (guardate)

`%TEMP%\f2-a1\`:
- `app-pratiche-1440.png`, `app-pratiche-filtro-1440.png`, `app-pratiche-pagina-1440.png`;
- `app-pratiche-768.png`.

A 768 px la tabella larga scorre dentro `.dt-scorri` (come le altre tabelle dell'app), la
pagina non scorre in orizzontale. Aggiustato il `DataTable` per mostrare freccia e `aria-sort`
anche quando l'ordinamento è quello del server.

## Dubbi

- **Permission**: `provvigioni.consulta` esiste ed è quella giusta per le pratiche; nessuna area
  nuova.
- **Periodo**: l'API accetta `dal`/`al` (provato), ma la pagina non lo mostra perché né il
  prototipo né §7.2 hanno un filtro periodo. Se serve, è un campo data in più nella barra.
- **Variazioni su OF/2026/S12-2**: il prototipo guarda solo la prima tranche di fattura e vede
  2 articoli spariti; il database ha tutte le tranche e non vede variazioni (differenza già
  documentata in `motore.spec.ts`, §5.9). Ne segue: conteggio `variazioni` 3 nell'app, 4 nel
  prototipo. La prova confronta gli altri stati col prototipo e toglie esplicitamente questa
  pratica dal conteggio delle variazioni.
- **Colonna «n° righe»**: la spec §7.2 la citava, il prototipo non ce l'ha. Ho allineato la spec
  alle colonne vere (pratica, cliente, fornitore, data, importo, stato, subagente).
- **Rotte**: spec §7.2/§7.3 ora dicono `/pratiche` (era `/ordini-fornitore`); le rotte di
  scrittura `/api/ordini-fornitore` restano come sono per F2-A2.
- **Dettaglio**: `/pratiche/<id>` è il segnaposto con il titolo; il dettaglio vero è F2-A2.
- **`caricaDati` per ogni richiesta**: legge tutto il necessario dal database a ogni elenco;
  con 54 pratiche va bene. Quando i dati cresceranno, filtrare in SQL (nota già nel file).
- La prima risposta arriva dopo 250 ms (attesa per la digitazione): fino ad allora i numeri
  dei segmenti sono 0. Non ho aggiunto un indicatore di caricamento.
- Controlli fatti: rilettura del diff e prove sopra. Il calcolo dei soldi è quello del motore
  già coperto da `motore.spec.ts`; l'endpoint è in sola lettura e protetto dal permesso.
