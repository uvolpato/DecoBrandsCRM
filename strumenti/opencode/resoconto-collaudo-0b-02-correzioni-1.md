# Resoconto · Onda 0 bis · 0b-02 correzioni 1 (review di Claude Code, 12/11/2026)

Esecutore: DeepSeek V4 Flash · database di prova `decobrands_test_0b_02c` (creato, migrato, usato, **cancellato**).

## Cosa ho fatto, rilievo per rilievo

### C1 — documento senza codice cliente non trovava più lo storico (regressione di R1-11)
- `app/backend/src/documenti.ts:342-364` (`esitiImportazione`): la query dello storico filtra per `OR` fra i codici della pagina (R1-11, invariato) e le righe **senza codice** (`cliente_codice_fornitore: null` o `''`) quando la pagina ha almeno un documento senza codice. Resta una query sola per pagina (D-106).
- `app/backend/src/proposta.ts:353-366` (`mancaRappresentanzaRighe`): stessa aggiunta per la pillola «Non rappresentato».
- La chiave è quella di prima, `fornitore|` (nome normalizzato, R1-06): le righe con codice NULL si ritrovano come prima di 0b-02.
- Prove in `app/backend/test/documenti.spec.ts`:
  - «documento senza codice cliente: lo storico con codice NULL si ritrova come prima (C1)»: documento senza codice, riga dello storico con codice NULL e subagente → `cliente_da_integra` vero;
  - «documento senza codice: la coppia senza subagente nello storico dà «Non rappresentato» (C1)»: `manca_rappresentanza` vero, `manca_agenzia` falso;
  - «documento con codice: la riga dello storico senza codice non lo riguarda (C1, R1-11 invariato)»: documento con codice diverso → `cliente_da_integra` falso.

### C2 — elenco e dettaglio cercavano lo storico con regole diverse
- `app/backend/src/documenti.ts:532,537` (`elenco`): la query porta anche `fv.piva AS fornitore_piva` (fornitore della pagina, già unito per la versione corrente).
- `app/backend/src/documenti.ts:358-366` (`esitiImportazione`): lo storico si riconosce per **P.IVA normalizzata o nome normalizzato**, la stessa regola di `cercaLegame` (`storico.ts`, non toccata perché è di 0b-03); commento che rimanda a `cercaLegame` e a questo rilievo.
- `app/backend/src/documenti.ts:24`: import di `normalizzaPiva` da `proposta.ts` (quella unica di `soggetti.ts`, R1-09).
- Prova in `app/backend/test/documenti.spec.ts`: «elenco e dettaglio trovano lo storico per P.IVA anche con un nome diverso (C2)»: fornitore in anagrafica «Gries …», storico «GRIES GmbH» con la stessa P.IVA → elenco `cliente_da_integra` vero **e** dettaglio `esito = cliente_da_integra`.

## Nota (chiarimento per 0b-doc, niente da correggere)
Sui documenti **non abbinati** la pillola «Manca l'agenzia» resta alla data del documento, perché la pratica non c'è ancora: è coerente con D-137. Da scrivere nella spec §7.9 come precisazione, non come rilievo.

## Prove lanciate

| Prova | Esito |
|---|---|
| `npx prisma migrate deploy` su `decobrands_test_0b_02c` | ok (tutte le migrazioni) |
| `npx jest test/documenti.spec.ts test/proposta.spec.ts test/documenti-pratica.spec.ts` | **67+51 passati, 0 KO** (2 giri: 67 su documenti+documenti-pratica, 51 su proposta) |
| `npx jest test/documenti.spec.ts -t "C1"` / `-t "C2"` | 3 + 1 passati |
| `npx tsc --noEmit` (backend) | 0 errori |
| `git status --short` | miei solo `src/documenti.ts`, `src/proposta.ts`, `test/documenti.spec.ts`, questo resoconto; gli altri file modificati sono di pacchetti paralleli |

Database `decobrands_test_0b_02c` cancellato a fine lavoro. Frontend non toccato. Prove nel browser: nessuna da aggiornare (C1 e C2 si vedono nelle pillole di `app_documenti.py`, che resta com'è; la lancia il controllo di fine onda). `plan` (`py_compile`): non applicabile, nessun `.py` modificato.

## Controlli caricati davvero (skill)
- `postgresql-code-review`: il filtro `OR` con `cliente_codice_fornitore IS NULL` (Prisma: `null`) non usa l'indice su `cliente_codice_fornitore`, ma parte solo se la pagina ha un documento senza codice e prende solo le righe senza codice (poche nei dati veri). Il confronto per P.IVA resta in memoria, come `cercaLegame`: nessuna migrazione possibile in questo pacchetto. Nessun altro rilievo (query parametrizzate, nessun SQL grezzo nuovo: `fv.piva` è una colonna in più nella SELECT esistente).
- `caveman`: risposte e resoconto concisi (voce, non grammatica).
- `owasp-security` non richiesta da questo pacchetto; nessun ingresso nuovo, nessun permesso toccato, il browser non manda valori calcolati (V12).

## Da documentare (per il pacchetto 0b-doc)

### §19 — registro delle decisioni
Nessuna decisione nuova: C1 e C2 sono correzioni di R1-06/R1-11, non regole nuove. Solo una precisazione da mettere nella riga D-137 o in D-106 (testo pronto):
- «Precisazione (0b-02 correzioni 1, 12/11/2026): per un documento **non ancora abbinato** la pillola «Manca l'agenzia» resta riferita alla data del documento: la pratica non c'è e non si può sapere quale ordine la riceverà. D-137 vale quando il documento entra in una pratica esistente (dettaglio) o è già abbinato.»

### Riga *Perché* nella sezione della spec
- **§7.9 (elenco Documenti, pillole)**: «Perché (C1/C2, 0b-02 correzioni 1): un documento senza codice cliente si confronta con lo storico sulla chiave `fornitore|` anche per le righe senza codice (`cliente_codice_fornitore` NULL o vuoto), altrimenti la pillola sparisce; il fornitore si riconosce per P.IVA normalizzata **o** nome normalizzato, la stessa regola di `cercaLegame`, così elenco e dettaglio propongono lo stesso storico.»
- **§6.5 (correzione del documento)**: nessuna modifica.

### Guida in linea (`app/frontend/lib/guida.ts`, pagina `documenti`)
- `sapere`, **aggiungere**: «Un documento senza codice cliente si riconosce dallo storico anche quando lo storico non ha il codice: conta il nome del fornitore. Il fornitore può essere lo stesso anche se il nome è scritto in modo diverso (es. «Gries GmbH» e «Gries Deco Company GmbH»): basta la P.IVA.»

### Piano (`piano-lavoro-crm.md`, §12)
- All'attività dell'onda 0 bis aggiungere: «Correzioni 1 (review): storico senza codice nell'elenco e nel dettaglio, stessa regola per P.IVA o nome. **30 minuti — da approvare.**»

### README
Niente da cambiare in `app/README.md`: nessun comando, porta o variabile nuova.
