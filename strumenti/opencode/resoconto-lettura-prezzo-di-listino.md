# Resoconto `lettura-prezzo-di-listino` (19/11/2026)

## Fatto

Solo `app/backend/src/lettura.ts`, due modifiche additive. Nient'altro toccato.

1. `SCHEMA_DOCUMENTO` → `righe.items.properties.prezzo.description`:
   `'Prezzo unitario di listino in euro, prima dello sconto di riga: se accanto c’è una percentuale di sconto, è la cifra più alta (quella non scontata)'`
2. `PROMPT_DOCUMENTO`, nuova voce subito dopo quella dello sconto di riga:
   `'Il prezzo unitario (prezzo) è il prezzo di listino, prima dello sconto di riga: quando la riga mostra uno sconto in percentuale (es. «30,00 %», «Rabatt») accanto a due cifre, prendi quella più alta, non scontata, e metti la percentuale in sconto. L’importo della riga (importo) è invece quello stampato sul documento, già scontato: non ricalcolarlo.'`

Nessuna modifica a `importo`, `sconto`, salvataggio, controlli o abbinamento: i documenti senza
sconto di riga restano identici (una sola cifra accanto → è quella).

## Esiti

- `npx tsc --noEmit` (in `app/backend`): 0 errori.
- `npm test -- lettura.spec.ts --forceExit`: 2 suite, **42/42 passati**, 0 KO.

## Come rileggere un documento già letto

- Prova su un file, senza scrivere nel database (usa connettore e chiave di Impostazioni → Server di lettura):
  ```
  cd app/backend
  npm run build
  npm run lettura:prova -- "C:\...\_38504401_61360_3_31_2026.pdf"
  ```
  Stampa il JSON delle righe e, per ogni campo, valore/affidabilità/pagina.
- Su un documento in archivio (`POST /documenti/:id/rileggi`), da riga di comando:
  ```
  npm run rilettura:mirata -- --id N          # scrive
  npm run rilettura:mirata -- --prova --id N  # nessuna scrittura
  ```

## Da controllare (non fatto qui)

- Esito vero sul PDF Gasper: `prezzo` = 149,98, `sconto` = 30, `importo` = 839,92. Va riletto
  con `lettura:prova` dall'orchestratore: è il modello a dover ubbidire al prompt.
- Possibile scarto residuo: se il documento stampa solo il prezzo scontato e la percentuale, il
  modello non può ricavare il listino (inventerebbe). Da valutare un controllo lato codice
  (`prezzo × (1−sconto/100) ≈ importo/quantità` altrimenti si tiene il prezzo stampato) — fuori
  da questo pacchetto.

## Da documentare

- **§19**, riga nuova (proposta): *D-nn — 19/11/2026 — Il prezzo unitario letto è quello di
  listino, prima dello sconto di riga; `sconto` porta la percentuale e `importo` l'importo
  stampato, già scontato. Perché: nella conferma Gasper il lettore prendeva il prezzo già
  scontato e il CRM scontava due volte (587,94 invece di 839,92).*
- **§6.5** (ingresso documenti), ritocco: una riga che dice la stessa regola di lettura.
