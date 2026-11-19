# Resoconto `pagamento-conferma-motivazione`

Data: 18/11/2026. Nessun commit, nessuna migrazione, nessuna prova Playwright.

## File toccati

1. `app/backend/src/incassi.ts` — `PUT documenti/:id/incasso`: dentro la transazione, dopo aver letto
   `prima = d.stato_incasso` e la nota, rifiuta l'annullamento senza motivazione:
   ```ts
   if (prima === 'pagata' && b.stato !== 'pagata' && !nota)
     throw new BadRequestException('Annullare il pagamento richiede una motivazione');
   ```
   Il resto è invariato: la nota continua a finire in `nota_incasso` (D-62) e nel `dettaglio` dell'evento
   `stato.change_state`. Il controllo sta **prima** dell'`update`, quindi lo stato resta `pagata`.
2. `app/backend/test/incassi.spec.ts`
   - nuovo caso: «PUT … annullare un pagamento richiede la motivazione» → `pagata` poi `insoluta`
     senza nota = **400** con `message` = `Annullare il pagamento richiede una motivazione` e
     `stato_incasso` ancora `pagata`; poi `insoluta` con `nota` = **200**, stato `insoluta`,
     `nota_incasso` valorizzata.
   - una chiamata del caso C1 riportava la fattura da `pagata` a `insoluta` senza nota (era il setup,
     non l'oggetto della prova): ora passa `nota: 'prova di annullamento'`, altrimenti la nuova regola
     la fa fallire. Nessun'altra asserzione toccata.
3. `app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx`
   - `segnaPagata(doc)`: non salva più subito, apre `<Conferma titolo="Fattura … pagata"
     testo="Il fornitore segnala che il cliente ha pagato: la provvigione si sblocca."
     etichetta="Segna come pagata" />` dentro `setFinestra`; la `PUT` di prima parte solo alla conferma,
     poi avviso e ricarica.
   - nuova `annullaPagamento(doc)`: `FormModal` «Annulla il pagamento», testo che spiega il ritorno a
     non pagata, campo `motivo` obbligatorio (`aiuto="es. il fornitore ha segnalato un errore: il
     cliente non ha pagato"`). Vuoto → `'Serve la motivazione.'` e la finestra resta aperta; altrimenti
     `PUT documenti/<id>/incasso` con `{ stato: 'insoluta', nota: motivo }`, avviso e ricarica.
   - elenco incassi: per `st.stato === 'pagata'` l'azione `nonpagata` (icona `avviso`) con etichetta
     «Annulla il pagamento»; gli altri stati restano com'erano (nota facoltativa).

Nessun componente nuovo, nessuna colonna nuova, nessuna parola inglese in interfaccia.

## Esiti

- `npx tsc --noEmit` in `app/backend`: **0 errori** (rilanciato dopo la modifica alla prova).
- `npx tsc --noEmit` in `app/frontend`: **0 errori**.
- `npm test -- incassi.spec.ts --forceExit` in `app/backend`: **10 passati, 0 KO**.

## Dubbi / scelte

- L'azione per la fattura pagata riusa lo slot `nonpagata` (icona `avviso`, D-171), così le colonne a
  icone restano fisse; cambia solo l'etichetta.
- La conferma chiude la finestra prima della `PUT` (come fa già `annulla` sul documento): un errore del
  server arriva come avviso in pagina, non dentro la finestra.
- `nota: '   '` (solo spazi) vale come vuota, come per il resto della segnalazione (trim lato server).

## Da documentare

- §19: riga nuova (es. **D-215** o il numero libero successivo): «Annullare un pagamento segnalato
  richiede una motivazione; il server rifiuta con 400, la motivazione resta in `nota_incasso` e nel
  registro. "Segna come pagata" chiede conferma.» Perché: segnalazione del fornitore sbagliata da
  correggere senza cancellare la storia.
- §5.14: ritoccare il paragrafo sul «segna come pagata / non pagata» con la conferma e l'annullamento
  con motivazione.
- `guida.js`: pannello «Incasso del cliente» — «Segna come pagata» chiede conferma; «Annulla il
  pagamento» (solo su fattura pagata) pretende la motivazione, che resta visibile nella riga.
