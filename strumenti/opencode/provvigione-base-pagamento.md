# Pacchetto `provvigione-base-pagamento`

## Compito

Ugo (18/11/2026): «per la pratica tieni la regola *pagamento altrimenti fattura*». La provvigione di una pratica si calcola sull'**importo del documento di pagamento** quando c'è; se non c'è, sull'importo della fattura (come oggi).

Contesto: per i clienti che pagano in anticipo il fornitore applica uno sconto e il pagamento porta già la quota (es. Arte: fattura 742,60, pagamento 716,08 = 96,43 %). Il pagamento è un documento della pratica (`ordini_fornitore_documenti.tipo = 'pagamento'`, `testata_id` = pratica, `importo` positivo).

## Come — `app/backend/src/motore/motore.ts`

Nuovo helper accanto a `baseDoc`:

```ts
/** 18/11/2026: la provvigione si calcola sull'importo del pagamento del cliente quando c'è (sconto
 *  per pagamento anticipato già dentro l'importo), altrimenti sull'imponibile della fattura.
 *  Con più fatture nella pratica il pagamento non si sa a quale si riferisce: resta la fattura. */
export function baseProvvigione(p: Pratica, d: Documento): Dec
```

- vale solo per `d.tipo === 'fattura'`;
- cerca fra i documenti della pratica quello con `tipo === 'pagamento'` (il primo, dal più recente);
- li usa **solo se la pratica ha una sola fattura** (contando anche le note di credito? no: solo `tipo === 'fattura'`), altrimenti `baseDoc(d)`;
- importo del pagamento in valore assoluto.

Dove si usa:
- `provvigioneDocumento(...)`: la base del calcolo (quella che finisce in `v.base` e negli importi) diventa `baseProvvigione(p, d)` invece di `baseDoc(d)`;
- `riconcilia(...)`: `const imp = baseProvvigione(n.pratica, n.doc)` (sia nel ramo a gruppi sia in quello delle righe singole) e la riga `mancante` di conseguenza;
- **non** toccare `baseDoc` né chi la usa per gli importi di merce/fatturato (Analisi dei fatturati, confronto righe): lì il valore resta quello dei documenti.

## Prove

- `test/motore.spec.ts` o `test/bollettino.spec.ts`, quattro casi con dati costruiti a mano:
  1. pratica con una fattura e un pagamento → base = importo del pagamento; la provvigione scende in proporzione;
  2. pratica con una fattura e nessun pagamento → base = fattura (come prima);
  3. pratica con due fatture e un pagamento → base = fattura (limite scritto nel commento);
  4. bollettino: la riga che corrisponde a una fattura pagata mostra `noi.imponibile` = importo del pagamento.
- `npm test -- motore.spec.ts bollettino.spec.ts bollettini.spec.ts liquidazione.spec.ts analisi.spec.ts --forceExit`: 0 KO. Se qualche prova del seed cambia numero perché la regola è nuova, **non** aggiustare i numeri a caso: riportali nel resoconto con il prima/dopo e il perché (sono le pratiche del seed con un pagamento).

## File ammessi

- `app/backend/src/motore/motore.ts`
- i file di prova in `app/backend/test/` che servono (`motore.spec.ts`, `bollettino.spec.ts`, `liquidazione*.spec.ts`, `analisi*.spec.ts`)

Vietati tutti gli altri: frontend, CSS, altre pagine, spec, guida, piano, migrazioni, `.env`, Integra. Niente commit. Non toccare le porte 8001/8002 né il database di sviluppo: prove solo su `decobrands_test`.

## Vincoli

- 📕 È una regola sui soldi: nessun arrotondamento nuovo, si riusa `r2`/`Dec` come il resto del motore. V12/D-28: tutto nel server.
- Ponytail: un helper, due punti d'uso, nessuna colonna, nessuna migrazione.
- ⚠️ Working tree con molte modifiche non committate: niente `git stash/checkout/reset`.

## Resoconto

Scrivi `strumenti/opencode/resoconto-provvigione-base-pagamento.md`: file toccati, diff sintetico, elenco dei numeri cambiati nei test del seed (pratica, prima, dopo, motivo), esiti `tsc`/`jest`, dubbi, **Da documentare** (riga §19, ritocco §5.3/§5.14, Guida).
