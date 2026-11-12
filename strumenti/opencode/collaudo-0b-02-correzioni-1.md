# Collaudo · Onda 0 bis · 0b-02 — correzioni 1 (dalla review di Claude Code, 12/11/2026)

**Esecutore: DeepSeek V4** · Gravità: **P2**

Prima di cominciare rileggi:
- `collaudo-0b-02-documenti-righe-agenzia.md`;
- il tuo `resoconto-collaudo-0b-02.md`.

Regole di lavoro: `regole-onda-parallela.md`, con il database `decobrands_test_0b_02c`.

## Rilievi

### C1 — P2 · Regressione di R1-11: il documento senza codice cliente non trova più lo storico
- **Dove**:
  - `app/backend/src/documenti.ts` ~345, il filtro dello storico;
  - `app/backend/src/proposta.ts` ~356, `mancaRappresentanzaRighe`.
- **Scenario**:
  - Un documento senza codice cliente letto, solo nome o P.IVA. Il suo fornitore ha una riga dello storico con `cliente_codice_fornitore` NULL.
  - Prima del pacchetto la chiave `fornitore|` la trovava, e il documento mostrava «Cliente in Integra» o «Non rappresentato».
  - Ora `codici` è vuoto, quindi anche `storici` è vuoto: la pillola sparisce e l'elenco mostra «Manca l'agenzia».
- **Correzione**:
  - Per i documenti **con** codice tieni il filtro di R1-11.
  - Per quelli senza codice cerca anche le righe dello storico con codice NULL o vuoto, con la stessa chiave di prima, `fornitore|`.
  - Fai lo stesso in tutti e due i punti, sempre con una query sola per pagina (D-106).
- **Prova** in `test/proposta.spec.ts` o `test/documenti.spec.ts`:
  - documento senza codice e riga dello storico con codice NULL → esito come prima di 0b-02;
  - documento con codice → esito di R1-11 invariato.

### C2 — P3 · Elenco e dettaglio cercano lo storico con regole diverse
- **Dove**:
  - elenco: `documenti.ts` ~491, `esitiImportazione`, confronta solo il nome normalizzato del fornitore;
  - dettaglio: `cercaLegame`, cerca per P.IVA **o** per nome.
- **Scenario**: il fornitore è registrato come «Gries Deco Company GmbH» e lo storico ha «GRIES GmbH» con la stessa P.IVA. Il dettaglio propone la riga dello storico, l'elenco no.
- **Correzione**:
  - L'elenco usa la stessa regola del dettaglio: P.IVA normalizzata **o** nome normalizzato.
  - Se `cercaLegame` sta in `storico.ts`, che è un file di 0b-03, non spostarla: ripeti la condizione nella query dell'elenco, con un commento che rimanda a `cercaLegame` e a questo rilievo.
- **Prova**: con il caso dello scenario, elenco e dettaglio danno lo stesso esito.

## Nota (non da correggere)
Sui documenti **non abbinati** la pillola «Manca l'agenzia» resta alla data del documento, perché la pratica non c'è ancora. È coerente con D-137. Scrivilo nel resoconto come chiarimento per 0b-doc.

## File ammessi
- `app/backend/src/documenti.ts`
- `app/backend/src/proposta.ts`
- `app/backend/test/documenti.spec.ts`
- `app/backend/test/proposta.spec.ts`
- `strumenti/opencode/resoconto-collaudo-0b-02-correzioni-1.md`

## Fine
- Prove `test/documenti.spec.ts test/proposta.spec.ts test/documenti-pratica.spec.ts` con 0 KO.
- `npx tsc --noEmit`.
- Resoconto.
- Carica davvero `postgresql-code-review` e `caveman`.
