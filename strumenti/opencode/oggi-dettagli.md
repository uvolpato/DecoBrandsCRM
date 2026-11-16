# Pacchetto `oggi-dettagli`

## Contesto
Pagina **Oggi**, riquadro «Da fare», gruppo «Documenti da decidere»: le voci sono tutte uguali e non dicono
di quale documento si tratta, es.
- «Abbina pagamento» / «fornitore non riconosciuto · affidabilità bassa»
- «Abbina documento» / «fornitore non riconosciuto · da controllare» (×4)

Ugo (15/11/2026): più dettagli, **stesso formato** (titolo + una riga di descrizione, pulsante a destra).
- Titolo: resta «Abbina …» e poi **quale documento**: finché il documento non è letto, il **nome del
  file**; dopo la lettura, tipo e numero (es. «Abbina fattura RE196022», «Abbina ordine AU278666»,
  «Abbina pagamento dettaglioDistinta (6).pdf» se il numero non c'è).
- Descrizione: scegli tu le informazioni utili e brevi, separate da « · », per esempio fornitore (nome
  breve), cliente, importo, data del documento, motivo (da controllare / affidabilità bassa / errore),
  quanti giorni è in coda. Massimo una riga: tronca con ellissi, testo intero nel `title`.

## Da verificare (possibile errore)
Tutte e 5 le voci dicono «**fornitore non riconosciuto**», ma i documenti in coda sono di ARTE
WOHNACCESSOIRES con fornitore riconosciuto (es. AU278666, affidabilità 0,948). Controlla sul db (sola
lettura, URL con grep, `.env` mai letto per intero) se la scritta è sbagliata e correggi la causa nel
backend della pagina Oggi: la descrizione deve dire il motivo vero.

## Compito
- Server (V12): il backend della pagina Oggi (cerca `oggi` in `app/backend/src/`, test `oggi.spec.ts`)
  manda i campi già pronti (titolo, descrizione o i pezzi), dai dati del db. Nessun calcolo nel browser.
- Frontend: la pagina Oggi (`app/frontend/app/(app)/` — cerca la vista) mostra titolo e descrizione;
  il formato e i pulsanti restano uguali.

## File ammessi
Il backend e il test della pagina Oggi, la sua vista nel frontend. **Non toccare** `proposta.ts`,
`documenti.ts`, `motore/*`, `pratiche.ts`, `lettura.ts`, `lettore.ts`, `liquidazioni*`, `VistaSistema.tsx`,
registro (altri pacchetti in corso): se servono, scrivi la modifica nel resoconto e fermati.
Aggiungi, non riscrivere.

## Regole
Leggi prima `strumenti/opencode/regole-onda-parallela.md` e `CLAUDE.md`. V12. Italiano. Prove su
`decobrands_test_oggi_dett` (creato e cancellato). Niente commit, 8001/8002, `cd`, `/tmp`, `&`, Integra.
Skill da caricare davvero: `owasp-security`, `ponytail-review`, `caveman`.

## Prove (0 KO)
`npx tsc --noEmit` backend e frontend; jest `oggi`: documento non letto → nome file nel titolo; letto →
tipo e numero; fornitore riconosciuto → niente «fornitore non riconosciuto».

## Resoconto
`strumenti/opencode/resoconto-oggi-dettagli.md`: esempi di voci prima/dopo, file toccati, prove,
«Da documentare».
