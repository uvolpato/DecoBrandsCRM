# Pacchetto `lettura-prezzo-di-listino`

## Compito

Ugo (19/11/2026): nella conferma d'ordine di Gasper (`_38504401_61360_3_31_2026.pdf`) il lettore prende il **prezzo unitario già scontato** (104,99) invece di quello di listino (149,98) e mette comunque 30 % in `sconto`: così il CRM sconta due volte (8 × 104,99 × 0,70 = 587,94 invece di 839,92).

La regola giusta: `prezzo` = prezzo **di listino, prima dello sconto di riga** (la cifra più alta, quella non scontata); `sconto` = la percentuale accanto; `importo` = l'importo di riga **stampato** sul documento, già scontato.

## Come — `app/backend/src/lettura.ts`

Solo il prompt e la descrizione dello schema, in modo **additivo** (i documenti che oggi si leggono bene non devono cambiare: senza sconto di riga il prezzo è quello scritto).

1. `SCHEMA_DOCUMENTO`, campo `righe.items.properties.prezzo`: descrizione
   `'Prezzo unitario di listino in euro, prima dello sconto di riga: se accanto c’è una percentuale di sconto, è la cifra più alta (quella non scontata)'`.
2. `PROMPT_DOCUMENTO`: una frase nuova, dopo quella dello sconto di riga (riga ~80):
   `'Il prezzo unitario (prezzo) è il prezzo di listino, prima dello sconto di riga: quando la riga mostra uno sconto in percentuale (es. «30,00 %», «Rabatt») accanto a due cifre, prendi quella più alta, non scontata, e metti la percentuale in sconto. L’importo della riga (importo) è invece quello stampato sul documento, già scontato: non ricalcolarlo.'`

Non toccare nient'altro: né il resto dello schema, né il salvataggio, né i controlli.

## File ammessi

- `app/backend/src/lettura.ts`
- `strumenti/opencode/resoconto-lettura-prezzo-di-listino.md` (resoconto, nuovo)

Nient'altro: nessun commit, nessuna migrazione, non toccare `.env`, Integra, database di sviluppo, porte 8001/8002. Working tree con modifiche non committate: niente `git stash/checkout/reset`.

## Prove

- `npx tsc --noEmit` in `app/backend`: 0 errori.
- `npm test -- lettura.spec.ts --forceExit` se esiste (altrimenti `npm test -- documenti.spec.ts --forceExit`): 0 KO. Il prompt non si prova con una prova automatica: la verifica vera la fa l'orchestratore rileggendo il PDF con `lettura-prova.ts` (`node dist/src/lettura-prova.js <file>`, se lo strumento è disponibile) — scrivi nel resoconto come si lancia.

## Resoconto

Scrivi `strumenti/opencode/resoconto-lettura-prezzo-di-listino.md`: righe aggiunte (testo esatto), esiti, come rileggere un documento già letto, dubbi, **Da documentare** (riga §19 e ritocco §6.5).
