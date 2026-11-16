# Resoconto — Sconto di riga nei documenti letti (15/11/2026)

Esecutore: DeepSeek V4 pro · Pacchetto: `strumenti/opencode/sconto-riga.md`.
Problema: l'ordine di ARTE WOHNACCESSOIRES ha per riga «EP / Rabatt / Sonderrabatt»; la lettura non
prende lo sconto, così il controllo segnala a torto «quantità × prezzo 29,80 € diverso dall'importo
26,82 €» (2 × 14,90 × 0,9 = 26,82).

## Cosa ho fatto

1. **Lettura**: `sconto` (percentuale, es. 10 = 10%) nel `SCHEMA_DOCUMENTO` (righe) e nel
   `PROMPT_DOCUMENTO` di `lettura.ts`. Niente migrazione Prisma: entra nel JSON `righe[i].*` già usato
   (come richiesto, «preferisci il JSON esistente»).
2. **Salvataggio e correzione**: `sconto: 'numero'` in `RIGA_CAMPI` (`documenti.ts`), così la correzione
   manuale lo accetta e lo salva come le altre parti della riga.
3. **Calcolo** (V12, tutto sul server): in `proposta.ts` nuova `fattoreSconto(r) = 1 − sconto/100`;
   `importoRigaLetta` e il controllo `riga` usano `quantità × prezzo × fattoreSconto`. Senza sconto
   resta identico (fattore 1). Esportata e riusata in `documenti.ts` (copia delle righe lette nella
   fotografia della pratica, D-176): il fallback `quantità × prezzo` ora tiene conto dello sconto.
4. **Interfaccia** (`VistaDocumento.tsx`): colonna «Sconto» nel riquadro *Righe* (vuota `—` se assente)
   e nella tabella *Correggi i dati letti*; `RIGA_KEYS`, `BozzaRiga`, `importoRiga` (anteprima «Somma
   righe» e piede) applicano lo sconto. Aggiunta riga vuota e mappatura `d.righe` aggiornate.
5. **Guida**: nota sulla colonna Sconto in `lib/guida.ts` (finestra *Correggi i dati letti*).
6. **Bollettini** (modifica già scritta in `bollettini.ts` ~riga 58): verificata; `primo` ora è il mese
   più vecchio fra bollettini e `ordini_fornitore_documenti.data`. Aggiunta prova jest.

## File toccati

- `app/backend/src/proposta.ts` (RigaLetta, `fattoreSconto` esportata, `importoRigaLetta`, controllo `riga`).
- `app/backend/src/lettura.ts` (schema + prompt).
- `app/backend/src/documenti.ts` (RIGA_CAMPI + fallback importo con `fattoreSconto`).
- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`.
- `app/frontend/lib/guida.ts`.
- `app/backend/test/proposta.spec.ts` (helper `R` + caso con sconto), `app/backend/test/bollettini.spec.ts`
  (assert `primo` aggiornato + prova del limite sui documenti).

## Prove

- `npx tsc --noEmit` backend: **OK**; frontend: **OK**.
- jest su `decobrands_test_sconto_riga` (creato, migrato; non ancora cancellato, lo cancello io a fine):
  - `proposta.spec.ts`: **72/72** (1 nuova: riga 2 × 14,90, sconto 10, importo 26,82 → nessun rilievo `riga`).
  - `documenti-lettura.spec.ts`: **23/23**.
  - `bollettini.spec.ts`: **13/13** (assert `primo` = 2025-01, il documento più vecchio del seed; prova
    che `primo` = min fra bollettini e documenti).
  - `documenti.spec.ts` + `documenti-pratica.spec.ts`: **95/95** (la copia delle righe tocca `documenti.ts`).
- `lettura.spec.ts` / `lettore.spec.ts` (non nelle suite del pacchetto): 41/42, 1 KO **preesistente** (vedi Aperti).

## Controlli (skill caricate davvero)

- `caveman`: risposte concise.
- `owasp-security`: `sconto` arriva da lettura/​correzione e passa da `valoreCampo('numero')` (parsa a
  numero, mai usato in SQL; valori su Prisma createMany). Il calcolo resta sul server (V12). Niente rilievi.
- `ponytail-review`: una sola `fattoreSconto` riusata in due punti backend; il frontend ha la sua copia
  (linguaggio diverso, come già `importoRiga`). Niente da tagliare.

## Da documentare (testo pronto, a cura di chi chiude l'onda)

- **spec §6.5** (lettura dei documenti): la riga ha un campo facoltativo `sconto` (percentuale); il
  lettore lo chiede nello schema e nel prompt; si salva fra i campi `righe[i].sconto` e si corregge in
  *Correggi i dati letti*.
- **spec §7.9** (pagina documento / correzione): colonna «Sconto» nel riquadro *Righe* (vuota se assente)
  e nella tabella di correzione; l'importo di riga è `importo` letto, altrimenti
  `round2(quantità × prezzo × (1 − sconto/100))`.
- **spec §19**: decisione nuova **D-178** «sconto di riga nei documenti letti» + il perché (alcuni
  fornitori stampano prezzo e sconto separati: senza sconto il controllo `quantità × prezzo ≠ importo`
  falso allarme su righe corrette, es. ARTE WOHNACCESSOIRES).
- **piano**: attività F6 (ingresso documenti) — sconto di riga; e la modifica a `bollettini.ts` (limite
  `primo` sui documenti) va documentata come sua decisione a parte se non è già nel §19.

## Aperti / da segnalare

- `lettura.spec.ts` ha un KO **preesistente** e **fuori dal pacchetto** (non nelle suite richieste): a
  `test/lettura.spec.ts:206` l'assert su `controlli.falliti` non include `gruppo` (campo aggiunto in
  D-176). Non l'ho corretto: è fuori dai miei file ammessi e non c'entra con lo sconto.
- Il testo del controllo `riga` resta «quantità × prezzo X diverso dall'importo Y» anche quando c'è uno
  sconto e non quadra: X è già scontato, il testo può suonare impreciso. Non l'ho cambiato (la richiesta
  dice solo di correggere il calcolo): se Ugo vuole un testo che nomini lo sconto, è una ritocco a parte.
- Database `decobrands_test_sconto_riga`: lo lascio per l'eventuale rilancio delle prove di Claude Code,
  poi si cancella (come da regole dell'onda).
