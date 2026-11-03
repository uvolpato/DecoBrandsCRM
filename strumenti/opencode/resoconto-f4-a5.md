# F4-A5 — Pagina Analisi (BI)

Lavoro fatto in una sessione OpenCode, senza sottoagenti, sul modello caricato. Database di prova
`decobrands_test_f3a1`. Nessun commit, nessun push, `.env` non toccato.

## File toccati

| File | Cosa |
|---|---|
| `app/backend/src/analisi.ts` | **nuovo**: calcolo (periodo, filtri, numeri, confronto, grafici, tabella), Excel/CSV, `GET /api/analisi` e `GET /api/analisi/esporta` |
| `app/backend/src/app.module.ts` | registrato `AnalisiController` |
| `app/backend/package.json` · `package-lock.json` | `exceljs` 4.4.0 (non c'era nel backend: la libreria del §11) |
| `app/backend/test/analisi.spec.ts` | **nuovo**: 13 prove (numeri del prototipo, confronto, filtri, voci D-23, filtro incrociato, D-60, 403/400, export) |
| `app/backend/test/carico-analisi.ts` | **nuovo**: misura con ~10.000 pratiche (come `carico-pratiche.ts`) |
| `app/frontend/app/(app)/analisi/page.tsx` | **nuovo** |
| `app/frontend/app/(app)/analisi/layout.tsx` | **nuovo** (la vista sta nel layout, la pagina è `null`) |
| `app/frontend/app/(app)/analisi/VistaAnalisi.tsx` | **nuovo**: pagina composta da `Pagina`, `PeriodoMesi`, `FilterBar` + riepilogo, `KpiRow`, `Grafico`, `DataTable`, `Sagoma` |
| `app/frontend/componenti/FilterBar.tsx` | prop facoltativa `classe` (l'Analisi usa `filtri-entita`, come il prototipo) |
| `strumenti/prove/app_analisi.py` | **nuovo**: 35 controlli Playwright |
| `specifica-crm-provvigioni.md` | 8.27: §7.22, §8.1 (due rotte), §11 (export dell'Analisi), §16.4 (`classe`), D-61 |
| `piano-lavoro-crm.md` | F4-A5: numeri dal motore, Excel/CSV adesso, grafici come immagine e PDF con F4-A3 |
| `prototipo-crm/specifica.html` | rigenerato con `python strumenti/genera-pagine-doc.py` |
| `strumenti/opencode/resoconto-f4-a5.md` | questo resoconto |

## `GET /api/analisi`

`provvigioni.consulta`. Parametri: `dal`, `al` (`AAAA-MM`), `fornitori`, `subagenti`, `clienti`
(id separati da virgola), `raggruppa` (`subagente` predefinito, `fornitore`, `cliente`, `mese`,
`documento`). Senza `dal`/`al`: ultimi 12 mesi dentro i mesi con dati.

```jsonc
{
  "periodo": { "da": "2025-10", "a": "2026-09", "primo": "2025-01", "ultimo": "2026-09", "mesi": 12 },
  "precedente": { "da": "2024-10", "a": "2025-09" },
  "confronto": { "possibile": true, "etichetta": "sullo stesso periodo dell’anno prima" },
  "filtri_attivi": false,
  "voci": { "fornitori": ["1", "2"], "subagenti": ["1"], "clienti": ["3"] },  // con gli altri filtri attivi (D-23)
  "numeri": {
    "fatturato": 79534.06, "prese": 12976.26, "pagate": 4127.34, "margine": 8848.92,
    "documenti": 19, "clienti": 7,
    "precedente": { "fatturato": 18370.2, "prese": 3957.18, "pagate": 1354.6, "margine": 2602.58 },
    "variazione": { "fatturato": 333, "prese": 228, "pagate": 205, "margine": 240 },
    "pct": { "prese_su_fatturato": 16.32, "pagate_su_prese": 31.81, "margine_su_prese": 68.19 }
  },
  "grafici": {
    "andamento": { "mesi": ["2025-10", "…"], "serie": [{ "nome": "Dai fornitori", "valori": [] }, { "nome": "Ai subagenti", "valori": [] }, { "nome": "Margine", "valori": [], "tipo": "line" }] },
    "fornitori": { "etichette": ["…"], "chiavi": ["1", "…", null], "valori": [] },
    "subagenti": { "etichette": ["…"], "chiavi": ["1"], "serie": [{ "nome": "Al subagente", "valori": [] }, { "nome": "Margine Decobrands", "valori": [] }] },
    "clienti": { "etichette": ["…"], "chiavi": ["3"], "valori": [] }
  },
  "tabella": { "raggruppa": "subagente", "totale": 21, "righe": [{ "chiave": "1", "nome": "…", "documenti": 4, "clienti": 2, "fatturato": 0, "prese": 0, "pagate": 0, "margine": 0, "quota": 0 }] }
}
```

- `tabella.totale` = documenti fiscali del periodo (fatture **e** note di credito, 21 sul seed);
  `numeri.documenti` conta le sole fatture (19), come il prototipo.
- Per `raggruppa=documento` le righe sono documenti: `{chiave, numero, tipo, data, pratica_id,
  nome (cliente), fornitore, subagente, fatturato, prese, pagate, margine}`.
- I grafici per dimensione ignorano il proprio filtro; la tabella li applica tutti (D-18).
- `GET /api/analisi/esporta?formato=xlsx|csv&…` (`provvigioni.esporta`): Excel con
  *Riepilogo*, *Per subagente*, *Per fornitore*, *Per cliente*, *Per mese*, *Documenti*
  (totali `SUM` con risultato già calcolato, filtro automatico, stampa A4 orizzontale);
  CSV dei soli documenti (`;`, virgola decimale, UTF-8 con BOM, date `gg/mm/aaaa`). Nome
  `Analisi_<dal>_<al>[_filtrata].<est>`.

## Tempi su 10.000 pratiche

`npx ts-node test/carico-analisi.ts` (54 pratiche del seed × 185 = 10.044), minimo di 3 giri
dopo il riscaldamento:

| Operazione | Tempo |
|---|---|
| `caricaDati` | 1791 ms |
| `caricaDati` + `fattiAnalisi` | 1775 ms |
| `GET /api/analisi` (pagina) | 1791 ms |
| `GET /api/analisi/esporta` (xlsx) | 2010 ms |

Sopra il secondo: nel resoconto dei dubbi c'è la vista `v_analisi_documenti` (non fatta, come
chiesto: tocca il calcolo dei soldi e la decide Claude Code).

## Prove

- **Backend**, `npx tsc --noEmit` pulito; `npx jest --runInBand` **suite per suite**, 0 KO:
  accesso 24, **analisi 13**, avvio 4, bollettini 12, bollettino 19, clienti 16,
  documenti-pratica 15, documenti 29, fornitori 6, incassi 7, integra 20, liquidazioni 10,
  motore 16, percentuali 31, pratiche 13, registro 3, seed 7, subagenti 12, superutente 1,
  utenti 18, vincoli 33.
- **`test/analisi.spec.ts` (13/13)**: numeri del seed uguali al prototipo (79.534,06 /
  12.976,26 / 4.127,34 / 8.848,92, 19 fatture, 7 clienti; periodo precedente 18.370,20 /
  3.957,18 / 1.354,60 / 2.602,58); variazioni; 6 mesi e periodo precedente; 4 grafici
  (andamento con i mesi vuoti, somma dei fornitori = fatturato, primi 10 clienti); tabella nei
  5 raggruppamenti; filtri multipli in *o* / *e*; voci D-23; filtro incrociato; proforma e
  pagamento non cambiano niente (D-60); sola lettura 200, area dati 403; 400 su mese,
  `dal > al`, `raggruppa`, id e `formato=pdf`; Excel (fogli, intestazioni, totali = pagina);
  CSV (BOM, `;`, somma = pagina).
- **Browser**, frontend `next build` + `next start` su 8101, backend su 8102, utenti `f3-*`
  (password-di-prova):
  - `python strumenti/prove/app_analisi.py f3 %TEMP%\f4-a5` → **35 controlli, 0 KO**:
    4 numeri, 4 grafici, periodo e frecce, durata 3/6/12, filtri multipli e riepilogo, voci
    D-23 (6 clienti di Gries+Gasper, niente Garden Store), filtro incrociato da riga e da
    barra, 5 raggruppamenti, Excel e CSV scaricati, sagome (risposta ritardata di 0,6 s),
    ritorno con periodo/filtro/raggruppamento, sola lettura, 768 px, nessun errore JS;
  - `python strumenti/prove/app_componenti.py f3 %TEMP%\f4-a5` → **54 OK, 0 KO**.

## Schermate

In `%TEMP%\f4-a5` (guardate prima di consegnare):

- `app-analisi-1440.png` — 1440 px, periodo di 12 mesi: 4 numeri con il confronto, andamento,
  ciambella dei fornitori.
- `app-analisi-documenti-1440.png` — tabella *Documenti* con 21 righe, link alle pratiche,
  totale in fondo.
- `app-analisi-768.png` — 768 px: una colonna, filtri a tutta larghezza, nessuno scorrimento
  orizzontale della pagina (la tabella scorre dentro di sé).

## Dubbi e cose lasciate

1. **Excel senza i grafici come immagine; niente PDF.** Servono un motore grafico sul server
   (canvas) e la conversione con LibreOffice. Vanno con **F4-A3**, come chiesto; il CSV e i
   fogli con i totali a formule ci sono già. Scritto in §7.22 e §11.
2. **10.000 pratiche: ~1,8 s la pagina, ~2,0 s l'export.** Sopra il secondo: propongo la vista
   `v_analisi_documenti` del piano (aggregazione in SQL, stessi numeri da confrontare col
   motore). **Non fatta**: tocca i soldi (D-61).
3. **Nomi dei subagenti.** Il filtro mostra *Cognome Nome* (`entità subagente` in
   `lib/entita.ts`), la tabella *Nome Cognome* (`caricaDati`). È un'incoerenza già presente
   altrove, non introdotta qui; non l'ho corretta (basta un punto, ma tocca altre pagine).
4. **CSV e formule.** I campi sono quotati solo per `;`, `"` e a capo: un nome che inizia con
   `=` verrebbe valutato da Excel (CSV injection). I nomi arrivano da Integra, in sola lettura,
   quindi il rischio è basso; se un giorno si esportano testi scritti dagli utenti, va messo
   l'apostrofo davanti.
5. **Nomi dei parametri.** Il prompt chiede `dal`/`al`/`fornitori/...`; la spec diceva
   `da`/`a`/`fornitore/...`. Ho seguito il prompt e aggiornato §7.22/§8.1.
6. **Tabella `naturale`.** La DataTable del Dettaglio ha l'altezza del contenuto (massimo
   22 rem), non riempie lo schermo: la pagina ha grafici e tabella e scorre. Scritto in §7.22.
7. **Guida.** `guida.js` ha già la voce *Analisi* completa (la stessa che userà l'app con F5):
   non l'ho toccata, perché descrive anche il prototipo, dove PDF e grafici nell'Excel ci sono.
8. **`FilterBar` con `classe`.** Prop facoltativa in più, documentata in §16.4; il catalogo
   `/componenti` non aveva bisogno di esempi nuovi.
