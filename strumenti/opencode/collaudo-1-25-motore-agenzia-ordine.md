# Collaudo · Onda 1 · 1-25 — il motore prende l'agenzia alla data dell'ordine (decisione di Ugo, 12/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità: **P1**: soldi delle provvigioni.

Regole di lavoro: `regole-onda-parallela.md`. Database di prova: `decobrands_test_1_01c` (già migrato).

## Contesto
- D-137 (spec §6.1 e §19): un documento entra in una pratica **già aperta** se l'agenzia era valida alla **data dell'ordine**.
- Il motore però cerca l'abbinamento (agenzia: subagente e sconto) alla **data del documento**:
  - `app/backend/src/motore/motore.ts:112`, `percentuali(S, p, data)` chiama `abbinamento(S, p.cliente_id, p.fornitore_id, data)`;
  - le chiamate passano `d.data`, `n.doc.data` o `r.origine ?? r.data`.
- Effetto: una fattura datata dopo la chiusura dell'agenzia entra nella pratica, ma vale **0 €** in liquidazione, nel bollettino e in Analisi, senza nessun avviso.
- **Decisione di Ugo (12/11/2026):** l'agenzia si prende alla data dell'ordine.

## Compito
- In `percentuali` l'abbinamento si cerca sempre a `p.data`, cioè alla data dell'ordine della pratica.
- Scaglione ed eccezione del subagente restano alla data passata, cioè quella del documento (D-51; scaglioni alla data del documento, 0b-02).
- Modifica minima, in un solo punto: `percentuali`. Le chiamate non si toccano, salvo quelle che diventano inutili.
- Commento: `// D-144 §19: agenzia alla data dell'ordine (D-137), scaglioni alla data del documento`.
- Controlla con `grep` che nessun altro punto del backend cerchi l'abbinamento di un documento di pratica alla data del documento: `abbinamento(`, in `motore/` e in `src/`.
  - La pillola «Manca l'agenzia» sui documenti **non abbinati** resta alla data del documento (precisazione D-137): non toccarla.
  - Se trovi altri punti, scrivili nel resoconto. Non correggerli se sono fuori dai file ammessi.

## Prove (`test/motore.spec.ts`)
- Agenzia valida dal 01/01 al 30/06, pratica con ordine a maggio, fattura a settembre: la provvigione della fattura è quella dell'agenzia, non 0, e il subagente è quello dell'agenzia.
- Cambio di subagente a luglio (agenzia nuova dal 01/07), ordine a maggio, fattura a settembre: la fattura va al subagente dell'ordine.
- Le prove che già ci sono restano verdi. Se una aspettava la data del documento, correggila e scrivilo nel resoconto.
- Lancia `test/motore.spec.ts test/liquidazioni.spec.ts test/analisi.spec.ts test/bollettini*.spec.ts` (quelle che esistono), una per volta, con 0 KO, poi `npx tsc --noEmit`.

## File ammessi
- `app/backend/src/motore/motore.ts`
- `app/backend/test/motore.spec.ts`
- le altre suite in `app/backend/test/` solo se una prova esistente va allineata (scrivi quale e perché)
- `strumenti/opencode/resoconto-collaudo-1-25.md`

## Fine
- Resoconto con «Da documentare»:
  - riga D-144 per il §19 (data 12/11/2026, chi: Ugo);
  - *Perché* per §6.1/§8 (calcolo);
  - riga di guida.
- Carica davvero `ponytail-review` e `caveman`.
