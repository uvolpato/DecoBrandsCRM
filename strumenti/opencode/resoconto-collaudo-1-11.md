# Resoconto collaudo · Onda 1 · Pacchetto 1-11 — Proposta: P.IVA con prefisso del paese; «Affidabile» su un documento senza fornitore

Data: 12/11/2026 · Esecutore: DeepSeek V4 Flash · Database di prova: `decobrands_test_1_11` (creato, migrato, cancellato a fine lavoro).

## A4-07 — P.IVA con prefisso del paese non riconosciuta

- File: `app/backend/src/proposta.ts:243-245`.
- `normalizzaPiva` ora toglie il prefisso del paese di due lettere davanti alle cifre anche quando non è `IT` (`DE 01234567890` → `01234567890`); resta la base di `soggetti.ts` (`pivaNormalizzata`), che già toglieva `IT` a 11 cifre. Commento aggiornato a D-124.
- Scelta fra più clienti con la stessa P.IVA **non toccata**: `find` resta com'è, come chiede il pacchetto (va nel pacchetto `piva-condivisa`, D-124).
- Prova: `app/backend/test/proposta.spec.ts` — nuovo caso «P.IVA con il prefisso del paese davanti alle cifre (D-124): si confronta senza»: `IT01234567890` e `DE 01234567890` contro l'anagrafica `01234567890`.

## A6-18 — «Affidabile» su un documento con fornitore non riconosciuto

- Il valore **arriva dal seed**, non da `valutaLettura`: `app/backend/prisma/seed/00-base.ts:234-241` calcola `documenti_in_arrivo.livello` dal minimo delle confidenze dei campi (`Math.min(1, ...)`), e per `ordine_OF-2026-064.pdf` (`fornitore_id: null`, `lettura: null`) il minimo era 1 → «affidabile».
- `00-base.ts` non è fra i file ammessi: la correzione è nei dati, `app/backend/prisma/seed/dati-prova.json`, come consente il pacchetto. Al documento 9015 è stata aggiunta la lettura del codice cliente (`{"campi":{"codice_cliente":0.8},"originale":{"codice_cliente":"VN-0001"}}`): l'incertezza c'è davvero (il fornitore non è riconosciuto, quindi il codice non si può verificare) e il seed calcola «da controllare».
- Effetto: nessun campo inventato ex novo (il codice `VN-0001` è già nei dati del documento), nessuna query al ponte in più (il campo `fornitore` resta assente, quindi l'elenco non cerca fornitori per nome).
- Prova: `app/backend/test/seed.spec.ts` — nuovo caso «documento con fornitore non riconosciuto: livello da controllare, mai «affidabile» (A6-18)».

## Prove eseguite

- `npx jest test/proposta.spec.ts test/seed.spec.ts test/documenti-lettura.spec.ts` (DB `decobrands_test_1_11`, `TMP` separato): **3 suite, 84 prove, 0 KO**.
- `npx tsc --noEmit` in `app/backend`: **0 errori**. Frontend non toccato.
- `python -m py_compile strumenti/prove/app_documenti.py`: ok (file non modificato).
- `git status --short` sui file ammessi: solo `app/backend/src/proposta.ts`, `app/backend/test/proposta.spec.ts`, `app/backend/prisma/seed/dati-prova.json`, `app/backend/test/seed.spec.ts`. Nessun commit, nessun file vietato, Integra non contattata.

## Prove nel browser da lanciare a fine onda

- `strumenti/prove/app_documenti.py` (invariata): controlla la pagina Documenti e le pillole di livello. Da lanciare dal controllo di fine onda.

## Da documentare

**Registro §19 — riga nuova (D-124)**

| D-124 | 08/11/2026 | **Cliente riconosciuto per P.IVA anche quando è condivisa.** La P.IVA letta si confronta **senza il prefisso del paese** (`IT`, `DE`, … davanti alle cifre) e senza spazi; un solo cliente con quella P.IVA → quello; più clienti → decide la ragione sociale normalizzata se il candidato è uno solo, altrimenti «non riconosciuto». Precisa D-92. | I documenti esteri portano la P.IVA con il prefisso (`Ihre USt-IdNr.: IT 01234567890`, `DE 811223344`) e l'anagrafica a volte è scritta senza: senza normalizzare l'operatore doveva cercare il cliente a mano. Con più sedi della stessa catena la P.IVA non basta, quindi il secondo segnale è la ragione sociale, accettata solo a match unico. | Ugo | §6.5 punto 5, D-91, D-92, `app/backend/src/proposta.ts` |

Nota: in questo pacchetto è stata applicata **solo la normalizzazione**; la scelta fra più clienti con la stessa P.IVA va nel pacchetto `piva-condivisa`.

**Spec — riga *Perché* nella sezione §6.5 punto 5** (accanto al riconoscimento cliente): «*Perché*: la P.IVA estera porta il prefisso del paese e l'anagrafica può non averlo; si confronta senza prefisso e senza spazi (D-124), e con più clienti sulla stessa P.IVA decide la ragione sociale normalizzata a match unico.»

**Guida (`app/frontend/lib/guida.ts`)**: nessuna modifica necessaria (cambia il riconoscimento, non pulsanti o testi della pagina).

**Piano/ore**: nessuna attività nuova.

**README**: nessuna modifica.

**Seed**: la correzione di `dati-prova.json` (documento 9015, lettura del codice cliente a 0,8) non cambia regole né testi; va tenuta perché il documento demo con fornitore sconosciuto mostri «da controllare».
