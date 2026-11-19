# Pacchetto `bollettino-percentuale-nominale`

## Compito

Ugo (18/11/2026): «non capisco perché nell'interfaccia vedo 14,4% come provvigione».

Non è un errore di calcolo: 304,89 € = 15 % di 2.117,30 € **× 96 %** (la quota del bollettino per il pagamento anticipato). Il motore mostra però la percentuale **effettiva** (304,89 / 2.117,30 = 14,4 %), che letta accanto a «di 2.117,30 €» sembra la percentuale applicata. Va mostrata la percentuale vera e la quota a parte: `15% di 2.117,30 € · quota 96%`.

## 1. Backend — `app/backend/src/motore/motore.ts`

`Lato` (~riga 600): aggiungi il campo facoltativo
```ts
pct_nominale?: Dec | null; // la percentuale del fornitore, prima della quota (D-201)
```
- nel ramo a gruppi: `riga.noi = { imponibile: imp, pct: pctEffettiva, pct_nominale: pct, importo: atteso }` (e lo stesso nel ramo congelato, dove `pct` resta `pct_calcolata ?? pctEffettiva` come ora ma `pct_nominale: pct`);
- nel ramo delle righe singole: `riga.noi = { imponibile: imp, pct, pct_nominale: pct, importo: … }`;
- nella riga `mancante`: `pct_nominale: v.pct_agente ?? ZERO`;
- `loro` resta com'è (la percentuale del PDF è già nominale).

## 2. Backend — `app/backend/src/bollettino.ts`

`lato()` (~riga 54): porta anche `pct_nominale: num(l.pct_nominale)`.

## 3. Frontend — `app/frontend/app/(app)/bollettini/[id]/VistaBollettino.tsx`

- interfaccia `Lato`: `pct_nominale?: number | null`;
- il dettaglio del lato «noi» (~riga 242): se c'è `pct_nominale`, scrivi `pct(pct_nominale) + ' di ' + euro(imponibile)` e, quando la riga ha una quota, aggiungi ` · quota ` + `pct(x.quota)`. Il resto come adesso.
- `loro` invariato.

## File ammessi

- `app/backend/src/motore/motore.ts`
- `app/backend/src/bollettino.ts`
- `app/backend/test/bollettino.spec.ts` (attese di `pct_nominale` se serve)
- `app/frontend/app/(app)/bollettini/[id]/VistaBollettino.tsx`

Vietati tutti gli altri: CSS, altre pagine, spec, guida, piano, migrazioni, `.env`, Integra. Niente commit. Non toccare le porte 8001/8002 né il database di sviluppo: prove solo su `decobrands_test`.

## Vincoli

- V12/D-28: la percentuale nominale la decide il server.
- Ponytail: un campo, un passaggio, una riga di interfaccia; niente componenti nuovi.
- ⚠️ Working tree con molte modifiche non committate: niente `git stash/checkout/reset`.

## Prove

- `npx tsc --noEmit` in backend e frontend: 0 errori.
- `npm test -- bollettino.spec.ts bollettini.spec.ts --forceExit`: 0 KO.

## Resoconto

Rispondi con massimo 6 righe e aggiorna `strumenti/opencode/resoconto-bollettino-righe-dal-pdf.md` con una riga sulla percentuale nominale.
