# F4-A1 — Pagine delle Liquidazioni

Compito: la pagina **Liquidazioni** dell'app, sopra il server già fatto (D-57).
Modello indicato dal piano: Sonnet. In OpenCode: il modello della sessione.

## Cosa consegnare

1. **Rotta** `/liquidazioni` → rimanda a `/liquidazioni/<anno>/<trimestre>` di oggi
   (come il prototipo, `rotta /^\/liquidazioni$/`). La barra laterale linka già
   `/liquidazioni`, oggi cade nel segnaposto.
2. **Pagina** `/liquidazioni/[anno]/[trimestre]`:
   - quattro **riquadri dei trimestri** in alto (anno, 1°…4° trimestre): stato
     (`stato.etichetta`), totale, attivo, futuro spento; clic = cambia trimestre;
     la freccia per anno prima/dopo se il prototipo ce l'ha;
   - **colonna sinistra**: elenco subagenti (`DataTable`: nome, n° documenti,
     liquidabile, in attesa), fa da filtro (primo clic filtra, secondo torna tutti),
     riga totale, ordinabile; in testata «N con documenti · M senza»
     (`senza_documenti`);
   - **colonna destra**: pannello *Documenti* con il numero e il giallo se ci sono
     in attesa; `DataTable` con documento (numero, tipo, data), cliente (con
     subagente e codice), provvigione (importo, %, imponibile), stato
     (*Liquidabile*, *In attesa* + motivo, *Storno: cliente non pagante*,
     *Riaccredito* + fattura e trimestre d'origine per le voci);
   - **Chiudi il trimestre** nella testata: spento con `chiusura.motivo` nel titolo,
     `Conferma` con importo e numero subagenti, poi `POST`; dopo la chiusura la
     pagina legge la fotografia e non si modifica più («Liquidazione chiusa il … da …»);
     serve `provvigioni.chiudi` (responsabile);
   - **Analisi completa** nel pannello: link a `/analisi` con `dal`/`al` del trimestre
     (e `subagenti` se a sinistra è scelto un subagente).
   - La scheda **Report subagenti** arriva con F4-A4: non farla.
   - L'**export** arriva con F4-A3: non farlo.
   - `Sagoma`/`useSagome` mentre i dati non arrivano (D-59); memoria della schermata
     (`useMemoria`, §7.12); sola lettura del guscio rispettata.

3. **Server, quanto manca**: `GET /api/liquidazioni` non restituisce le righe del
   trimestre; aggiungi `documenti: [...]` (dalle `righeLiquidazione`: id documento,
   numero, tipo, data, cliente, fornitore, subagente, codice cliente, imponibile,
   pct, provvigione, `liquidabile`, `incasso`, `motivo`, `voce`, `origine`,
   `bollettino_id`) con i nomi risolti e **le etichette calcolate sul server**
   (V12: il browser non decide gli stati). Stessi dati per la fotografia di un
   trimestre chiuso. Prova nuova in `app/backend/test/liquidazioni.spec.ts`
   (righe del seed, trimestre chiuso, 403 senza area provvigioni).

## Dove

- Backend: `app/backend/src/liquidazioni.ts`, `app/backend/test/liquidazioni.spec.ts`.
- Frontend: `app/frontend/app/(app)/liquidazioni/` (`page.tsx`, `layout.tsx`,
  `VistaLiquidazioni.tsx` o come fanno `analisi/` e `bollettini/`).
- Prototipo da replicare: `prototipo-alternativo/assets/viste-periodo.js`
  (`rotta /^\/liquidazioni\/`, `vistaLiquidazioni`, `M.righeLiquidazione`) e
  `componenti.js` (`Schede`, `DataTable`, `PeriodoMesi` non serve).
- Spec: §7.8 (struttura, colonne, chiusura, D-18, D-57), §8.1 (risposta di
  `GET /api/liquidazioni`), §16.4 (componenti). Piano: F4-A1.
- Aggiorna `specifica-crm-provvigioni.md` (§7.8, §8.1, versione in testa) e
  `piano-lavoro-crm.md` (F4-A1). **Non** toccare `avanzamento-app.md`: lo chiude
  la sessione principale.

## Regole (non le dimenticare)

- Tutto sul backend, mai dai dati del frontend (V12); una operazione, una
  transazione (V13); non fidarsi del browser. La chiusura la fa il server, la
  pagina manda solo anno e trimestre.
- Italiano semplice nel codice, nei commenti e nell'interfaccia; commenti brevi
  con il rimando (`// D-57 §19`).
- Codice minimo (ponytail): riusa i componenti che ci sono, niente astrazioni.
- Prove solo su `decobrands_test`, mai su `decobrands_db`; niente reset distruttivi.
- Niente commit, niente push, niente modifiche a `.env`.
- Schermate a 1440 e 768 px e guardale (niente telefono, D-44).

## Verifica

- `npx tsc --noEmit` pulito; `npx jest test/liquidazioni.spec.ts --runInBand` 0 KO;
  poi la suite del backend **fase per fase** (una spec per processo: Jest su
  Windows in un processo solo si è già piantato).
- Nuova prova browser `strumenti/prove/app_liquidazioni.py` (Playwright, come
  `app_analisi.py`): 4 riquadri, elenco subagenti e filtro, tabella documenti,
  riga in attesa, chiusura rifiutata con motivo e chiusura buona su un trimestre
  di prova, ritorno allo stesso punto, sola lettura, 768 px, sagome. 0 KO.

## Resoconto

Scrivi `strumenti/opencode/resoconto-f4-a1-pagine.md`: file toccati, prove e
esito, schermate, dubbi e cose lasciate aperte.
