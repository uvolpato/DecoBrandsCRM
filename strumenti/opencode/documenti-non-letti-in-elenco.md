# Pacchetto `documenti-non-letti-in-elenco`

## Compito

Ugo (18/11/2026): ricaricando `Rechnung_RE193451.pdf` l'app dice «è lo stesso file di uno già arrivato», ma quel documento **non si trova in nessuna lista**: non è in «Da controllare», non è fra gli scartati.

Motivo: quel documento ha fallito la lettura 3 volte e ha `stato = 'errore'`. `STATI_APERTE` (`app/backend/src/documenti.ts` ~riga 760) è `['in_coda', 'in_lettura', 'da_controllare']`: i documenti in `errore` restano fuori dall'elenco. In pagina resta solo la nota «N documenti non letti dopo 3 tentativi: aprili per inserire i dati a mano o scartali», che però non permette di aprirli. È un vicolo cieco.

## 1. Backend — `app/backend/src/documenti.ts`

`STATI_APERTE` diventa `['in_coda', 'in_lettura', 'da_controllare', 'errore']`, con un commento breve sul perché: un documento non letto dopo 3 tentativi si apre e si sistema a mano o si scarta, quindi è da decidere come gli altri e deve stare in elenco (prima non era raggiungibile da nessuna pagina).

Verifica che il resto regga: il dettaglio `GET /documenti/:id` funziona già per quel documento; `conteggi` continua a contare per stato.

## 2. Backend — `app/backend/test/documenti.spec.ts`

- il test ~riga 892 («stato=aperte: in coda, in lettura e da controllare insieme…») oggi controlla `expect(stati).not.toContain('errore')` e che il totale sia la somma dei tre segmenti: aggiornalo (quattro stati, `errore` compreso) e aggiungi un documento in `errore` (basta un `db.documenti_in_arrivo.update` come già si fa altrove) che deve comparire in `?stato=aperte`.
- se altri test contano i documenti aperti, allineali.

## 3. Frontend — `app/frontend/app/(app)/documenti/VistaDocumenti.tsx`

Nell'elenco (~righe 165-183) un documento con `stato === 'errore'` deve mostrare il segno che non si legge, accanto al titolo: `<Stato v="errore">Non leggibile</Stato>` (prima del resto, come `inCoda` mostra «In coda»). La nota dei non letti resta com'è.

Nient'altro: nessun componente nuovo, nessuna classe CSS nuova, nessun cambio di testi.

## File ammessi

- `app/backend/src/documenti.ts`
- `app/backend/test/documenti.spec.ts`
- `app/frontend/app/(app)/documenti/VistaDocumenti.tsx`

Vietati tutti gli altri: CSS, altre pagine, spec, guida, piano, migrazioni, `.env`, Integra. Niente commit. Non toccare le porte 8001/8002.

## Vincoli

- 📕 V12/D-28: lo stato lo decide il server.
- Ponytail: una costante e un segno; nessuna rotta nuova.
- ⚠️ Working tree con molte modifiche non committate: niente `git stash/checkout/reset`.

## Prove

- `npx tsc --noEmit` in `app/backend` e `app/frontend`: 0 errori.
- `npm test -- documenti.spec.ts --forceExit`: 0 KO.
- Non lanciare Playwright: la schermata la fa l'orchestratore.

## Resoconto

Scrivi `strumenti/opencode/resoconto-documenti-non-letti-in-elenco.md`: file toccati, diff sintetico, esiti `tsc`/`jest`, dubbi, e **Da documentare** (riga §19 con la decisione: «aperte» comprende anche `errore`, perché; ritocco §7.9 se elenca gli stati; riga Guida).
