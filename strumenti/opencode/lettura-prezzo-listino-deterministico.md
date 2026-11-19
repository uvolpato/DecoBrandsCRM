# Pacchetto `lettura-prezzo-listino-deterministico`

## Compito

Ugo (19/11/2026): «il prompt per prendere il valore non scontato è debole … non funziona». Giusto: il modello, su alcune conferme (Gasper), restituisce comunque il prezzo **già scontato** (104,99) con lo sconto 30 a parte. Non si può lasciare una regola sui soldi a una frase del prompt: serve un controllo aritmetico nel codice, che riconosca la riga e riporti il prezzo al listino.

## Regola (deterministica)

Per ogni riga letta con `sconto > 0`, `quantita > 0`, `prezzo > 0` e `importo` presente:
- se **`importo ≈ quantita × prezzo`** (tolleranza 0,02 €) e `importo` **non** è ≈ `quantita × prezzo × (1 − sconto/100)`, allora il prezzo letto è quello netto: il prezzo di listino è `prezzo / (1 − sconto/100)`, arrotondato a 2 decimali.
- in tutti gli altri casi la riga resta com'è (documenti senza sconto, o dove il prezzo è già di listino).

Esempio: quantità 8, prezzo 104,99, sconto 30, importo 839,92 → 8 × 104,99 = 839,92 = importo, quindi il prezzo è netto → listino 149,99 (il PDF stampa 149,98: un centesimo di arrotondamento, accettabile).

## Come — `app/backend/src/lettura.ts`

1. Una funzione esportata e pura (per la prova), che lavora sui campi già estratti:

```ts
/** 19/11/2026: alcuni fornitori stampano il prezzo di riga già scontato e mettono lo sconto a parte;
 *  se l'importo di riga è quantità × prezzo, il prezzo è netto: si riporta al listino, altrimenti il
 *  CRM sconta due volte. */
export function prezzoDiListino(campi: { campo: string; valore: string | null }[]): void
```
raggruppa i campi `righe[N].prezzo|quantita|sconto|importo`, applica la regola e riscrive `righe[N].prezzo` (stringa con il punto decimale, come gli altri valori).

2. In `salva()` (~riga 104), **prima** del `filter/map` che scrive i campi: `prezzoDiListino(r.campi)`.

Nient'altro: né schema, né prompt (la frase del prompt resta come aiuto), né controlli, né la lettura del bollettino.

## File ammessi

- `app/backend/src/lettura.ts`
- `app/backend/test/lettura.spec.ts` (prove della funzione)

Vietati tutti gli altri: frontend, CSS, spec, guida, piano, migrazioni, `.env`, Integra. Niente commit. Non toccare le porte 8001/8002 né il database di sviluppo: prove solo su `decobrands_test`.

## Prove

- `npx tsc --noEmit` in `app/backend`: 0 errori.
- `npm test -- lettura.spec.ts --forceExit`: 0 KO, con quattro casi: prezzo netto (esempio Gasper) → listino; prezzo già di listino (importo ≠ quantità × prezzo) → invariato; sconto 0 → invariato; importo mancante → invariato.

## Resoconto

Scrivi `strumenti/opencode/resoconto-lettura-prezzo-listino-deterministico.md`: file, diff sintetico, esiti, dubbi, **Da documentare** (§19, §6.5).
