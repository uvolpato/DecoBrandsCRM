# Pacchetto `pagamento-conferma-motivazione`

## Compito

Ugo (18/11/2026): «quando segno come fattura pagata, deve esserci un alert di conferma … posso annullare il pagamento, ma devo mettere una motivazione».

Due cose, nella pratica (pannello **Incasso del cliente**):

1. **Segna come pagata** → prima una finestra di conferma (sì/no), poi il salvataggio.
2. **Annulla il pagamento** → oggi una fattura `pagata` non ha più azioni: si aggiunge l'azione «Annulla il pagamento», che riporta la fattura a `insoluta` e **pretende una motivazione** (testo obbligatorio). La motivazione si salva come `nota` della segnalazione (colonna `nota_incasso`, D-62) e resta nel registro eventi.

## Backend — `app/backend/src/incassi.ts`

`PUT documenti/:id/incasso` (`incasso`, ~riga 61): il server rifiuta l'annullamento senza motivazione (V12: non basta il controllo dell'interfaccia).

- nella transazione, dopo aver letto `prima = d.stato_incasso`: se `prima === 'pagata'` e `b.stato !== 'pagata'` e `nota` è vuota → `throw new BadRequestException("Annullare il pagamento richiede una motivazione")`.
- il resto come adesso (la `nota` continua a finire in `nota_incasso` e nel `dettaglio` dell'evento).

## Backend — `app/backend/test/incassi.spec.ts`

Un caso in più: segnata pagata, tornarla a `insoluta` senza `nota` → **400** con quel messaggio e lo stato che resta `pagata`; con `nota` → **200**, stato `insoluta`, `nota_incasso` valorizzata.

## Frontend — `app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx`

- `segnaPagata` (~riga 189): non salva più subito; apre `<Conferma titolo={'Fattura ' + doc.numero + ' pagata'} testo="Il fornitore segnala che il cliente ha pagato: la provvigione si sblocca." etichetta="Segna come pagata" onRisposta={…} />` dentro `setFinestra(...)`, come si fa già per `segnaNonPagata`; alla conferma si fa la `PUT` di oggi e si aggiorna la pagina.
- nuova `annullaPagamento(doc)`: `FormModal` (come `segnaNonPagata`) con titolo «Annulla il pagamento», testo che spiega che la fattura torna non pagata, e campo `motivo` **obbligatorio** (`aiuto="es. il fornitore ha segnalato un errore: il cliente non ha pagato"`). Se il campo è vuoto `onConferma` restituisce `'Serve la motivazione.'` e la finestra resta aperta. Altrimenti `PUT documenti/<id>/incasso` con `{ stato: 'insoluta', nota: <motivo> }`, avviso e ricarica.
- nell'elenco incassi (~righe 573-584): per `st.stato === 'pagata'` aggiungi l'azione `{ nome: 'nonpagata', icona: 'avviso', etichetta: 'Annulla il pagamento', onClick: () => annullaPagamento(x) }`; per gli altri stati resta com'è (nota facoltativa).

Testi in italiano, niente parole inglesi. Riutilizza `Conferma`, `FormModal`, `avviso` già importati.

## File ammessi

- `app/backend/src/incassi.ts`
- `app/backend/test/incassi.spec.ts`
- `app/frontend/app/(app)/pratiche/[id]/VistaPratica.tsx`

Vietati tutti gli altri: CSS, altre pagine, spec, guida, piano, migrazioni, `.env`, Integra. Niente commit. Non toccare le porte 8001/8002.

## Vincoli

- 📕 V12/D-28: il vincolo vero sta sul server; il frontend mostra il messaggio.
- Una operazione, una transazione (V13): la `PUT` resta com'è, dentro `$transaction`.
- Ponytail: nessun componente nuovo, nessuna colonna nuova, nessuna migrazione.
- ⚠️ Working tree con molte modifiche non committate: niente `git stash/checkout/reset`.

## Prove

- `npx tsc --noEmit` in `app/backend` e in `app/frontend`: 0 errori.
- `npm test -- incassi.spec.ts --forceExit` in `app/backend` (database `decobrands_test`): 0 KO.
- Non lanciare Playwright: le schermate le fa l'orchestratore.

## Resoconto

Scrivi `strumenti/opencode/resoconto-pagamento-conferma-motivazione.md`: file toccati, diff sintetico, 400 e messaggio, esiti `tsc`/`jest`, dubbi, e **Da documentare** (riga §19, ritocco §5.14 che descrive il «segna come pagata», riga Guida).
