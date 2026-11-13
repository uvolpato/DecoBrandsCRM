# Resoconto collaudo · Onda 1 · Pacchetto 1-25 — il motore prende l'agenzia alla data dell'ordine

Data: 12/11/2026 · Esecutore: DeepSeek V4 pro · Gravità: P1 · Rilievo: D-144 · Esito: **corretto**.

Nota sul file: questo resoconto condivide `resoconto-collaudo-1-24.md` con il pacchetto parallelo
«matrice dei permessi» (stesso nome scritto in entrambi i pacchetti): ho **accodato** la mia parte
senza toccare quella già presente.

## Cosa ho fatto

- `app/backend/src/motore/motore.ts`, `percentuali` (unico punto): l'abbinamento (subagente e
  sconto) si cerca a `p.data` (data dell'ordine) invece che alla `data` passata (data del
  documento). Scaglione ed eccezione restano alla `data` passata (D-51). Commento
  `// D-144 §19: agenzia alla data dell'ordine (D-137), scaglioni alla data del documento`.
- `grep abbinamento(` in `motore/` e `src/`: **3 punti**, nessun altro da correggere:
  - `motore.ts:113` → corretto;
  - `oggi.ts:34` e `pratiche.ts:263` cercavano già a `p.data` (data dell'ordine): nessun cambio;
  - la pillola «Manca l'agenzia» (`proposta.ts`/`documenti.ts`/`VistaDocumenti.tsx`) resta alla
    data del documento: **non toccata** (precisazione D-137).
- Prove nuove in `app/backend/test/motore.spec.ts` (2 `it`):
  1. agenzia valida 01/01→30/06 (`valido_al` escluso), ordine a maggio, fattura a settembre: la
     provvigione della fattura è quella dell'agenzia (100 €, non 0) e il subagente è quello
     dell'agenzia;
  2. cambio subagente a luglio (agenzia nuova dal 01/07), ordine a maggio, fattura a settembre:
     la fattura va al subagente dell'ordine.
- Nessuna prova esistente aspettava la data del documento: restano tutte verdi senza modifiche.

## Prove lanciate (una per volta, `DATABASE_URL_TEST` su `decobrands_test_1_24`)

| Prova | Esito |
|---|---|
| `npx jest test/motore.spec.ts --runInBand` | **23/23, 0 KO** |
| `npx jest test/liquidazioni.spec.ts --runInBand` | **22/22, 0 KO** |
| `npx jest test/analisi.spec.ts --runInBand` | **15/15, 0 KO** |
| `npx jest test/bollettini.spec.ts --runInBand` | **12/12, 0 KO** |
| `npx jest test/bollettino.spec.ts --runInBand` | **19/19, 0 KO** |
| `npx tsc --noEmit` (backend) | 2 errori, **solo** in `test/utenti.spec.ts` (file di un pacchetto parallelo); i miei file compilano puliti |

## Prove nel browser da lanciare a fine onda

Nessuna: modifica solo al motore e alle prove `*.spec.ts`; nessun frontend, niente da `py_compile`.

## Da documentare

### §19 — nuova riga D-144

| D-144 | 12/11/2026 | **Le provvigioni di una pratica si calcolano con l'agenzia alla data dell'ordine.** `percentuali` cerca l'abbinamento (subagente e sconto) a `p.data`, la data dell'ordine, non alla data del documento. Scaglione ed eccezione del subagente restano alla data del documento (D-51). | Una fattura datata dopo la chiusura dell'agenzia entra nella pratica (D-137) ma, prendendo l'agenzia alla data del documento, valeva 0 € in liquidazione, bollettino e Analisi, senza alcun avviso. L'agenzia che conta è quella dell'ordine: il subagente che ha maturato la provvigione non cambia se il documento arriva tardi. | Ugo (12/11/2026) | §6.1, §8; `motore/motore.ts` |

### §6.1 / §8 (calcolo) — riga *Perché*

> *Perché* l'agenzia si prende alla data dell'ordine: il documento entra nella pratica per
> l'agenzia valida all'ordine (D-137), quindi anche la provvigione segue quella stessa agenzia.
> Se si prendesse alla data del documento, una fattura arrivata dopo la chiusura dell'agenzia
> varrebbe 0 € in silenzio. Restano alla data del documento solo scaglione ed eccezione, perché
> le percentuali possono cambiare nel frattempo (D-51).

### Guida (`app/frontend/lib/guida.ts`)

Testo pronto (da aggiungere al *sapere* della pagina Pratiche, accanto alla nota D-137):

> Le provvigioni di una pratica si calcolano con l'agenzia (subagente e sconto) in vigore alla
> data dell'ordine, e con le percentuali (scaglioni) in vigore alla data del documento (D-144):
> una fattura arrivata dopo la chiusura dell'agenzia vale comunque, col subagente dell'ordine.

### Piano (`piano-lavoro-crm.md`)

Nessuna attività nuova e nessuna ora: rientra nel collaudo dell'onda 1 (P1, correzione del motore).

## Cose aperte

- `npx tsc --noEmit`: restano 2 errori in `test/utenti.spec.ts` (righe 162-163, `password:
  Promise<string>`), dovuti a un pacchetto parallelo dell'onda, non a questo lavoro; i file che ho
  toccato (`motore.ts`, `motore.spec.ts`) compilano senza errori.
- Il pacchetto indicava il database `decobrands_test_1_01c` (nome non in linea con la regola
  `decobrands_test_<onda>_NN`): ho usato `decobrands_test_1_24`, creato, migrato e **cancellato**
  a fine prova.
