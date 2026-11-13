# Collaudo · correzioni finali prima dei documenti veri (13/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità **P1**: dopo questo pacchetto Ugo carica i documenti veri.

Regole comuni: `regole-onda-parallela.md`: **niente `cd` fuori dal progetto, niente `/tmp`, niente `&`, non leggere la copia del frontend fuori dal progetto** (rifiutati: la sessione si ferma). File temporanei in `strumenti/collaudo/e2e/uscita/`. Scrivi **subito** `strumenti/opencode/resoconto-collaudo-finale-correzioni-1.md` e aggiornalo strada facendo. Sei l'unico pacchetto in corso. Massimo 2 ore.

## Situazione
Nell'albero, non committati: onda 2 (2-01…2-13 + `collaudo-2-fine-correzioni-1/2`), poi 3-01, 3-07, 3-09, 5-01, 5-05, 6-01, 5-04 (resoconti `resoconto-collaudo-<pacchetto>.md`). jest delle suite toccate verde, tsc OK. Le prove nel browser dei pacchetti 3-…6 **non sono ancora state lanciate**.

## Da fare
1. **6-01, parte frontend rimasta**: `VistaDocumento.tsx` deve mostrare i totali che il server manda ora (`totali: { importo, provvigione }` da `documenti.ts`), con il prop dei totali della `DataTable` aggiunto da 5-04, senza sommare nel browser (V12). Leggi `resoconto-collaudo-6-01.md` e `resoconto-collaudo-5-04.md`.
2. **`app_flusso`** 3 KO: «prototipo: 3° trimestre 2026 da liquidare 1.886,73 €», «app: 2° trimestre = prototipo», «due pratiche in più valgono 99,65 €». 3-07 ha cambiato la nota di credito sul maturato **anche nel prototipo** (`prototipo-alternativo/assets/motore.js`). Verifica: app e prototipo devono dare lo **stesso** valore. Se coincidono e cambia solo il numero di riferimento scritto nella prova, aggiorna il numero e scrivi nel resoconto il valore nuovo e perché (b). Se app e prototipo non coincidono è un errore (a): trova quale dei due sbaglia rispetto alla spec (§5.14, D-11 e la decisione di 3-07).
3. **`app_impostazioni`** si blocca alla riga 81 (`Response.text: No resource with given identifier`, poi `wait_for` scaduto): la prova legge il corpo di una risposta dopo che la pagina è cambiata. Rendila robusta (es. `page.expect_response` intorno al clic e `.json()` subito).
4. **`app_f7_collaudo`** si blocca alla riga 36 (`.testa h1` non visibile in 45 s) all'inizio. Capisci se è tempo (prima pagina compilata da `next dev`) o un errore vero (schermata in `uscita/`).
5. **Prove nel browser dei pacchetti 3-01, 3-07, 3-09, 5-01, 5-05, 6-01, 5-04**: lancia, poche per volta, `app_documenti`, `app_pratica`, `app_bollettino`, `app_bollettini`, `app_liquidazioni`, `app_analisi`, `app_impostazioni`, `app_scartati`, `app_flusso`, `app_f7_collaudo`. Per ogni KO: causa (a/b/c) e correzione vera; non aggiornare una prova per far passare un errore vero.

```bash
bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e
bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_documenti app_pratica
```
Dopo ogni modifica al codice dell'app rilancia `prepara.sh`. Ogni prova corretta passa **2 volte**. Il giro completo lo lancia Claude Code.

## File ammessi
`app/frontend/**`, `app/backend/src/**`, `app/backend/test/**`, `strumenti/prove/app_*.py`, `strumenti/collaudo/e2e/*` (non `uscita/`), `prototipo-alternativo/assets/motore.js` (solo se il punto 2 lo richiede), il resoconto. **Vietati**: spec, guida.js, piano, schema e migrazioni, seed.

## Fine
`tsc` backend e frontend; jest delle suite toccate, una per volta (`DATABASE_URL_TEST` su `decobrands_test_fin`, creato e cancellato da te). Resoconto con causa e correzione di ogni punto. Carica davvero `playwright-best-practices`, `ponytail-review`, `caveman`; `owasp-security` se tocchi soldi o permessi.
