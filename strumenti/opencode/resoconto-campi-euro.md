# Resoconto — campi in euro (13/11/2026)

Esecutore: DeepSeek Flash · pacchetto `strumenti/opencode/campi-euro.md`

## Stato

Fatto. TypeScript backend e frontend a 0 errori, Python compilato. Prove nel browser non lanciate (vietato dai pacchetti in onda).

## Lavoro fatto

- Nuovo componente `CampoEuro` in `app/frontend/componenti/Campo.tsx` (file dei componenti di form esistente, niente file nuovo):
  - fuori dal fuoco mostra `euro()` di `lib/formati.ts` (`12,50 €`) o `num()` per le quantità (`valuta={false}`), allineato a destra;
  - col fuoco mostra il numero con la virgola (`12,5`), accetta virgola o punto, all'uscita normalizza (`String(Number(...))`, vuoto se non numerico);
  - al genitore arriva sempre la stringa numerica col punto, come prima: salvataggio e server invariati (V12);
  - `inputMode="decimal"`, `data-campo` e `aria-label` passati, `onFocus` inoltrato.
- `VistaDocumento.tsx`, finestra *Correggi i dati letti*:
  - testata Importo, prezzo e importo di ogni riga, imponibile e provvigione delle righe bollettino ora usano `CampoEuro`;
  - quantità usa `CampoEuro valuta={false}` (virgola, senza €).
- Catalogo `/componenti`: voce `CampoEuro` con esempio (prezzo e quantità).
- `stile.css`: `.campo-euro { text-align: right; }`; la vecchia regola `.tab-righe input[type="number"]` (ormai senza utenti) diventa `.tab-righe input.campo-euro`.
- Prove aggiornate:
  - `app_documenti.py`: `.aff-sx canvas` `== 1` → `>= 1`; il prezzo della riga nuova si scrive `10.5` (punto accettato col fuoco) e si controlla che fuori dal fuoco si legga `10,50 €`.
  - `documenti_prova.js`: affidabilità della quantità `righe[0].quantita` 0,80 → 0,75 (fra 0,70 e 0,80: ancora giallo con D-151).

## Prove

- `npx tsc --noEmit` in `app/frontend`: 0 errori.
- `npx tsc --noEmit` in `app/backend`: 0 errori.
- `python -m py_compile strumenti/prove/app_documenti.py`: ok.
- `node --check strumenti/prove/documenti_prova.js`: ok.
- Prove nel browser e schermate: non lanciate (regola dei pacchetti in onda).

## Da documentare

- Spec §16.4: nuovo componente `CampoEuro` — fuori dal fuoco importo in euro all'italiana (o numero per le quantità con `valuta={false}`), col fuoco si modifica con virgola o punto, al server arriva la stringa col punto; usato in «Correggi i dati letti» per prezzo, importo, imponibile e provvigione delle righe e per l'importo della testata. Aggiunto al catalogo `/componenti`.
- Spec §7.9: nella finestra *Correggi i dati letti* prezzi e importi si leggono in euro; la quantità resta un numero con la virgola.
- Nessuna decisione nuova nel §19: si applica la regola del progetto sui componenti riutilizzabili, nessun cambio di regola di calcolo o di dati inviati al server.
