# Resoconto F4-A1 — Pagine delle Liquidazioni

Data: 04/11/2026. Slice F4, attività F4-A1 (pagine delle Liquidazioni, §7.8).
Lavoro fatto sull'app vera (`app/`), sopra il server di D-57.

## File toccati

| File | Cosa |
|---|---|
| `app/frontend/app/(app)/liquidazioni/page.tsx` | nuovo: `/liquidazioni` rimanda al trimestre di oggi (come il prototipo) |
| `app/frontend/app/(app)/liquidazioni/[anno]/[trimestre]/page.tsx` | nuovo: legge anno e trimestre dall'indirizzo |
| `app/frontend/app/(app)/liquidazioni/VistaLiquidazioni.tsx` | nuovo: riquadri dei trimestri, subagenti (filtro), scheda *Documenti*, *Chiudi il trimestre* con conferma, sagome, memoria, sola lettura |
| `app/backend/src/liquidazioni.ts` | `documenti` nella risposta di `GET /api/liquidazioni`: nomi risolti e etichette calcolate sul server; per un trimestre chiuso le righe dalla fotografia |
| `app/backend/src/motore/motore.ts` | `fotografiaLiquidazione` salva anche le righe dei documenti (vedi «Da segnalare») |
| `app/backend/test/liquidazioni.spec.ts` | prove nuove: righe del seed come il prototipo, stato/motivo dal server, storno e riaccredito, fotografia del trimestre chiuso |
| `strumenti/prove/app_liquidazioni.py` | nuova prova Playwright (38 controlli) |
| `specifica-crm-provvigioni.md` | versione 8.28; §4.2.19 (`totali` con le righe), §7.8 (pagina nell'app), §8.1 (`documenti`) |
| `piano-lavoro-crm.md` | F4-A1 segnata fatta; nota che la scheda *Documenti* di F4-A2 è compresa |

Niente commit, niente push, nessuna modifica a `.env` o `avanzamento-app.md`.

## API

`GET /api/liquidazioni?anno=&trimestre=` (invariata nei campi già presenti) aggiunge:

```
documenti: [{
  documento_id, numero, tipo, data, origine, pratica_id,
  cliente_id, cliente, codice_cliente, fornitore_id, fornitore, subagente_id, subagente,
  imponibile, pct, provvigione,          // numeri
  liquidabile, incasso, voce, motivo, motivo_testo, bollettino_id,
  stato: { etichetta, variante }         // decise dal server (V12)
}]
```

- `stato.etichetta`: *Liquidabile* / *Liquidata* (trimestre chiuso) / *Attesa incasso* / *In attesa* /
  *Storno: cliente non pagante* / *Riaccredito*; `variante` è quella del componente `Stato`.
- `motivo_testo` è il testo pronto (bollettino da verificare, attesa incasso, fattura e trimestre
  d'origine per storni e riaccrediti).
- Trimestre chiuso: le righe vengono dalla fotografia salvata in `liquidazioni.totali`, non da
  `righeLiquidazione` (provato cambiando l'importo di un documento dopo la chiusura).
- 403 senza `provvigioni.consulta` (già coperto dalla prova).

## Numeri sul seed (confronto con il prototipo)

Prova Jest: `B.documenti` confrontato campo per campo con `M.righeLiquidazione(2026, t)` del
prototipo (numero, tipo, data, cliente, fornitore, subagente, codice, imponibile, %, provvigione,
liquidabile, incasso, voce), più i totali per subagente già confrontati da F4-A1 server.

3° trimestre 2026 sul seed, prima di verificare il bollettino di luglio di Gries:

| | Valore |
|---|---|
| documenti | 10 (8 liquidabili, 2 in attesa) |
| subagenti con documenti / senza | 4 / 0 |
| imponibile liquidabile | 27.431,90 € |
| provvigione liquidabile (totale da liquidare) | 1.986,38 € |
| provvigione in attesa | 505,80 € |
| in attesa dei bollettini (bloccanti) | 2 (F-2026-0891, F-2026-0912) |

Dopo la verifica del bollettino di luglio di Gries: 10 liquidabili, **2.492,18 €** (1986,38 + 505,80).
1° e 2° trimestre 2026 chiusi dal seed: si leggono dalla fotografia (1°, 2° «Liquidata il …»),
come il prototipo.

## Prove

- Backend `npx tsc --noEmit`: **pulito**.
- `npx jest test/liquidazioni.spec.ts --runInBand`: **11/11 passati**, 0 KO.
- Tutta la suite backend, una spec per processo (Windows): accesso 24, analisi 13, avvio 4,
  bollettini 12, bollettino 19, clienti 16, documenti 29, documenti-pratica 15, fornitori 6,
  incassi 7, integra 20, motore 16, percentuali 31, pratiche 13, registro 3, seed 7, subagenti 12,
  superutente 1, utenti 18, vincoli 33. **0 KO**.
- Frontend: `npx tsc --noEmit` pulito e `npm run build` ok (rotte `/liquidazioni` e
  `/liquidazioni/[anno]/[trimestre]`).
- `python strumenti/prove/app_liquidazioni.py f4 <cartella> http://localhost:8101`: **38 controlli,
  0 KO**, nessun errore JavaScript. Copre: rotta corta, 4 riquadri, filtro dai subagenti (primo e
  secondo clic), tabella documenti, riga in attesa con motivo e contatore giallo, rifiuto della
  chiusura (pulsante spento con il motivo e 409 dal server), verifica del bollettino che sblocca,
  chiusura con conferma e fotografia, 2° trimestre chiuso, ritorno nello stesso punto, sagome,
  sola lettura, 768 px.
- Schermate guardate: `app-liquidazioni-1440.png`, `app-liquidazioni-pronta-1440.png`,
  `app-liquidazioni-768.png` (aperte e controllate: tabelle che rientrano, stato che va a capo,
  nessuno scorrimento di lato). La prova gira su `decobrands_test` (backend su 8102, frontend su
  8101): **mai** su `decobrands_db`.

La prova browser **chiude il 3° trimestre 2026** e verifica il bollettino di luglio di Gries: per
rilanciarla serve un seed pulito (e gli utenti `<s>-ammi/oper/lett`).

## Controlli (regole di lavoro)

- **`ponytail-review`** (caricata): nessun difetto da correggere. Rilievi veri:
  - l'elenco dei subagenti si filtra col clic sulla riga e la `DataTable` non è raggiungibile da
    tastiera: è il comportamento del componente standard (già usato per aprire clienti e
    fornitori), non una novità di questa pagina; il filtro è un aiuto, i documenti si vedono
    tutti anche senza;
  - il link *Analisi completa* non applica ancora il trimestre finché F4-A5 non legge i parametri
    (vedi sopra);
  - le fotografie vecchie senza righe si ricalcolano una volta: limite scritto nel codice con
    `shortcut:`, sparisce rigenerando il seed.
- **`owasp-security`** (caricata): nessun rilievo. La rotta resta protetta da `provvigioni.consulta`,
  i due parametri sono validati (2000–2100, 1–4), niente SQL nuovo, niente `dangerouslySetInnerHTML`
  (React fa l'escape), il POST è quello di D-57 con CSRF e `provvigioni.chiudi`.
- `postgresql-code-review` non serve: nessuna query o migrazione nuova.

## Da segnalare

- **File fuori elenco:** per «stessi dati per la fotografia di un trimestre chiuso» ho toccato
  `app/backend/src/motore/motore.ts`: `fotografiaLiquidazione` salva anche le righe
  (`documenti`). È l'unico modo perché il trimestre chiuso si rilegga uguale *e* il seed (che usa
  la stessa funzione) abbia le righe dei trimestri già chiusi. Aggiornati §4.2.19 e la stringa del
  seed non serve. Le fotografie salvate prima di questa modifica non hanno le righe: la pagina le
  ricalcola una volta (`shortcut:` nel codice), basta rigenerare il seed.
- **Analisi completa** punta a `/analisi?dal=2026-07&al=2026-09[&subagenti=…]`, come chiesto. La
  pagina Analisi (F4-A5) oggi tiene periodo e filtri nella memoria della schermata e **non legge
  quei parametri dall'indirizzo**: il collegamento apre l'Analisi ma non applica ancora il trimestre.
  Va chiuso in F4-A5 (fuori dai percorsi di questa slice).
- **Correzione della quota del subagente (D-27)** non fatta: non era richiesta da F4-A1; resta in
  F4-A2 (annotato nel piano).
- **Frecce per cambiare anno** nei riquadri dei trimestri: il prototipo non le ha (si cambia anno
  dall'indirizzo), quindi non ci sono.
- **Scheda Report subagenti** → F4-A4; **export Excel/PDF/CSV** → F4-A3. Non implementati (il PDF
  con evidenziazione dipende dalla prova D-06). Il pulsante *Esporta in Excel* del prototipo non
  c'è ancora, per non mostrare un comando che non funziona.
- Le voci di storno e riaccredito sono provate con un caso costruito (il seed le ha solo in un
  bollettino non ancora verificato): la prova le verifica e poi rimette tutto com'era.

## Chiusura (sessione principale)

Il link *Analisi completa* è stato chiuso qui: la pagina Analisi legge `dal`, `al` e `subagenti`
dall’indirizzo una volta sola e ripulisce l’URL (§7.22), senza la doppia richiesta.
`app_liquidazioni.py` ora controlla anche il link (periodo del trimestre, subagente nel filtro, URL
pulito): rilanciata su seed pulito, **41 controlli, 0 KO**. La frase qui sopra («va chiuso in
F4-A5») non vale più.
