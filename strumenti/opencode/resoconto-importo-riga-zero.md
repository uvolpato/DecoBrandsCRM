# Resoconto — Importo riga letto a 0 dal lettore (16/11/2026)

Esecutore: DeepSeek V4 pro · Pacchetto: `strumenti/opencode/importo-riga-zero.md`.

## Documento

Id **10**, `Auftrag_AU276950.pdf`, tipo `ordine`, stato `da_controllare`, **26 righe** con
`documenti_campi.righe[i].importo = "0"` su tutte, mentre `quantita`, `prezzo` e `sconto` sono letti bene
(es. riga 0: 54 × 0,5, sconto 5).

## Cosa dice la grezza

`lettura_grezza.righe[i]` restituisce `importo: 0` (numero, non stringa vuota) su ogni riga, accanto a
codice, quantità, prezzo e sconto corretti. Il modello riempie anche `provvigione: 0`,
`data_fattura: ""`, `numero_fattura: ""`. Non è una colonna scambiata né assente: è lo **0 che il
lettore scrive nella colonna importo quando non la legge** (il campo è `number` nello schema, e senza
valore il modello mette 0).

## Causa

`componiLetto` (`proposta.ts`) leggeva il campo `righe[i].importo = "0"` e lo trasformava in `0`
(`num`): la riga risultava «letto 0,00 €», discorde dal calcolato (54 × 0,5 × 0,95 = 25,65) e quindi in
arancio con il pulsantino. Il difetto non è della tabella né del fronte: è a monte, nella lettura.

## Correzione (alla radice)

In `componiLetto` un `importo === 0` su una riga che vale (`quantita × prezzo > 0`) è uno 0 del lettore,
non un importo vero: diventa `null`, così la riga risulta **calcolata** (D-179, quantità × prezzo ×
(1 − sconto/100)). Uno 0 vero (riga omaggio con prezzo 0, dove `quantita × prezzo = 0`) resta 0. La
regola vive nel punto unico dove i campi diventano il `Letto` (usato da dettaglio, controlli, livello e
proposta), quindi vale anche sui documenti già letti senza rileggere.

## File toccati

- `app/backend/src/proposta.ts` (`componiLetto`: importo 0 con quantità × prezzo > 0 → vuoto).
- `app/backend/test/documenti-lettura.spec.ts` (2 prove nuove).

## Prove (0 KO per il pacchetto)

- `npx tsc --noEmit` backend: **OK** (EXIT 0).
- jest `documenti-lettura.spec.ts` su `decobrands_test_importo_zero` (creato, migrato, cancellato):
  **27/27** (2 nuove):
  - importo `0` letto su riga 54 × 0,5 sconto 5 → `righe[0].importo` null, `proposta.importo` 25,65,
    nessun rilievo `riga`;
  - importo `0` con prezzo `0` (omaggio) → `righe[0].importo` resta 0.
- Prove nel browser non lanciate (regole dell'onda): le lancia Claude Code a fine onda. Nessun selettore
  o testo di interfaccia cambiato.

## Controlli (skill caricate davvero)

- `caveman`: risposte concise.
- `owasp-security`: nessun input nuovo; il calcolo resta sul server (V12). Nessun rilievo.
- `ponytail-review`: una riga di logica nel punto unico di composizione, nessuna astrazione nuova.
  Niente da tagliare.

## Cosa fa Ugo

Nulla di urgente: con la correzione il documento 10 si mostra già come «calcolato» (quantità × prezzo ×
sconto) senza rileggere, perché la regola legge dai campi già salvati. Se vuole una lettura da capo:
apre il documento e usa **Rileggi il documento** (in alto a destra, con conferma «Ho capito: i dati
letti verranno riscritti»). Il campo `"0"` resta in `documenti_campi` finché non si rilegge o non si
salva la correzione, ma non incide più sul calcolo né sulla visualizzazione.

## Da documentare (a cura di chi chiude l'onda)

- **spec §7.9 / §6.5**: nella lettura, un importo di riga restituito come 0 su una riga che vale
  (quantità × prezzo > 0) non è un importo letto: resta vuoto e la riga risulta calcolata. Uno 0 vero
  (riga omaggio con prezzo 0) si tiene.
- **spec §19**: decisione nuova **D-180** «importo 0 del lettore = non letto» + il perché (il lettore
  scrive 0 nella colonna importo quando non la legge, perché il campo è `number`; senza la regola le 26
  righe di un ordine risultano lette a 0,00 € in arancio, ognuna da correggere a mano). Estende D-179.
- **piano**: attività F6 (ingresso documenti) — riga con importo 0 del lettore trattata come non letta.

## Aperti / da segnalare

- `test/lettura.spec.ts:206` fallisce per il campo `gruppo` mancante nell'`toEqual` dei controlli
  (`gruppo` è stato aggiunto da D-176). **Non è di questo pacchetto**: non tocca i file ammessi né
  l'importo; va segnalato a chi chiude l'onda / al pacchetto che ha introdotto `gruppo`.
