# Collaudo · Onda 2 · correzioni di fine onda 1 (13/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità **P1**: il giro nel browser dell'onda 2 ha 11 prove ferme.

Regole comuni: `regole-onda-parallela.md`. Sei l'**unico pacchetto in corso**. **Niente `cd` fuori dal progetto, niente `/tmp`, niente `&`** (rifiutati: la sessione si ferma). File temporanei in `strumenti/collaudo/e2e/uscita/`. Scrivi **subito** `strumenti/opencode/resoconto-collaudo-2-fine-correzioni-1.md` e aggiornalo strada facendo. Massimo 2 ore.

L'onda 2 (pacchetti 2-01…2-13, resoconti `resoconto-collaudo-2-*.md`) è nell'albero, non committata. tsc e jest delle suite toccate sono verdi.

## C1 — `Schede` perde la scheda ricordata (causa trovata da Claude Code)
- **Dove**: `app/frontend/componenti/Schede.tsx`, `useEffect` con `primo` aggiunto da 2-02 (A5-01).
- **Problema**: in sviluppo React (StrictMode) esegue gli effetti due volte al montaggio. Il primo giro mette `primo=false`, il secondo chiama `setAttiva(iniziale)` e **sovrascrive la scheda ricordata** (`memoria`, §7.12). Ogni «indietro» riapre la prima scheda.
- **Prove ferme per questo** (probabile): `app_fornitori` «indietro: stessa scheda», `app_componenti` «memoria: la scheda aperta si ritrova», `app_clienti` riga 180, e a cascata altre.
- **Correzione** (minima): seguire solo i **cambi veri** di `iniziale`, confrontando con il valore precedente:
  ```tsx
  const prima = useRef(iniziale);
  useEffect(() => {
    if (prima.current === iniziale) return;
    prima.current = iniziale;
    if (iniziale && schede.some((s) => s.id === iniziale)) setAttiva(iniziale);
  }, [iniziale]);
  ```
  Togli `primo`. Commento con rimando ad A5-01 e §7.12.

## C2 — Calcolo per codice copiato in `documenti.ts` (2-01)
- `confrontoDocumenti` in `app/backend/src/documenti.ts` replica la somma per codice di `perCodice` di `app/backend/src/motore/motore.ts`, che non era esportata. Esportala da `motore.ts` e usala in `documenti.ts`, togliendo la copia (una sola regola, V12). Prove: `npx jest test/pratiche.spec.ts`, `test/motore.spec.ts`, `test/documenti.spec.ts`.

## C3 — `app_impostazioni.py` usa l'amministratore dove ora serve il superutente (2-03)
- Dopo 2-03 casella, posta e Integra le cambia solo il superutente. La prova (righe ~53–83) usa `-ammi` per «Prova la connessione» e per la password della casella: usa `<s>-super` per quei passi (lo crea `strumenti/collaudo/e2e/prep.js`) e aggiungi un controllo che per `-ammi` quelle sezioni sono in sola lettura.

## C4 — *Scarica* spento in sola lettura in Liquidazioni (2-08)
- `app/frontend/app/(app)/liquidazioni/VistaLiquidazioni.tsx` ~riga 391: il pulsante **Scarica** della finestra *Esporta* va marcato `.consentito` (come «Esporta in Excel»): l'esportazione è consentita in sola lettura.

## C5 — Le altre prove ferme
Dopo C1–C4, rifai `prepara.sh` e rilancia, **poche alla volta**, in primo piano, le prove ferme del giro: `app_caricamento`, `app_clienti`, `app_componenti`, `app_documenti`, `app_f7_collaudo`, `app_flusso`, `app_fornitori`, `app_impostazioni`, `app_pratica`, `app_soggetti`, `app_utenti` (1 KO). Esito di ogni prova in `strumenti/collaudo/e2e/uscita/e2e/<prova>.txt`. Per ognuna: causa (a) errore dell'app, (b) prova superata da un pacchetto dell'onda 2 (leggi il resoconto), (c) dati o tempi. Correggi la causa vera; non aggiornare una prova per far passare un errore vero.
```bash
bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e
bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_fornitori app_componenti app_clienti
```
Ogni prova corretta deve passare **2 volte**. Il giro completo lo lancia Claude Code.

## File ammessi
`app/frontend/**`, `app/backend/src/**`, `app/backend/test/**`, `strumenti/prove/app_*.py`, `strumenti/collaudo/e2e/*` (non `uscita/`), il resoconto. **Vietati**: spec, guida.js, piano, schema e migrazioni, seed.

## Fine
`tsc` backend e frontend; jest delle suite toccate, una per volta (`DATABASE_URL_TEST` su `decobrands_test_2_fine`, creato e cancellato da te come nei pacchetti dell'onda). Resoconto con causa e correzione di ogni punto. Carica davvero `playwright-best-practices`, `ponytail-review`, `caveman`.
