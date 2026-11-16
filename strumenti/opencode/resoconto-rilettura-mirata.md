# Resoconto — Rilettura mirata dei documenti già letti (15/11/2026)

**Esecutore: DeepSeek V4 pro.** Pacchetto `strumenti/opencode/rilettura-mirata.md`. Regole comuni
rispettate: nessun `cd`/`/tmp`/`&`, `.env` mai letto con cat (URL costruito con grep), solo letture su
`decobrands_db` (elenco in `--prova`), prove su `decobrands_test_rilettura` (creato, migrato, poi
cancellato), niente 8001/8002, niente Integra, niente commit. Skill caricate davvero: `owasp-security`,
`ponytail-review`, `caveman`.

## Elenco dei 13 documenti letti (sola lettura su `decobrands_db`, `--prova`)

| id | file | stato | tipo | numero | importo | somma righe | spese | correz. | cong. | esito |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Auftrag_AU276839.pdf | abbinato | ordine | AU276839 | 2154,50 | 2154,50 | 0 | 0 | no | — |
| 2 | Proforma_PR102813.pdf | abbinato | proforma | PR102813 | 2117,30 | 2117,30 | 0 | 0 | no | — |
| 3 | Proforma_PR102848.pdf | abbinato | proforma | PR102848 | 37,20 | 37,20 | 0 | 2 | no | — |
| 4 | Rechnung_RE193071.pdf | abbinato | fattura | RE193071 | 2117,30 | 2117,30 | 0 | 1 | no | — |
| 5 | Auftrag_AU278665.pdf | abbinato | ordine | AU278665 | 261,54 | 261,54 | 0 | 5 | no | — |
| 6 | Auftrag_AU278666.pdf | abbinato | ordine | AU278666 | 1639,89 | 1639,89 | 0 | 1 | no | — |
| 7 | Proforma_PR102920.pdf | abbinato | proforma | PR102920 | 1840,23 | 1840,23 | 0 | 47 | no | — |
| 8 | Rechnung_RE196022.pdf | abbinato | fattura | RE196022 | 1840,23 | 1840,23 | 0 | 47 | no | — |
| 9 | dettaglioDistinta (6).pdf | da_controllare | pagamento | — | 1766,62 | 0,00 | 0 | 1 | no | — (pagamento, non articolato) |
| 10 | **Auftrag_AU276950.pdf** | abbinato | ordine | AU276950 | 963,78 | 963,78 | 0 | **3** | no | **da decidere** |
| 11 | **Proforma_PR102829.pdf** | da_controllare | proforma | PR102829 | 963,78 | **876,28** | 0 | 0 | no | **rilegge** |
| 12 | **Rechnung_RE193612.pdf** | da_controllare | fattura | RE193612 | 963,78 | **876,28** | 0 | 0 | no | **rilegge** |
| 13 | IMG_4581.jpg | da_controllare | pagamento | — | 928,73 | 0,00 | 0 | 0 | no | — (pagamento, non articolato) |

## Motivi

- **Rileggere (2)**: PR102829 e RE193612 — somma delle righe 876,28 ≠ importo 963,78 (manca la riga
  «Fracht» 87,50, come da `resoconto-riga-codice-testo.md`); sono i due documenti AU276950 non ancora
  abbinati, senza correzioni a mano.
- **Da decidere con Ugo (1)**: `Auftrag_AU276950.pdf` (id 10) — è **abbinato** a una pratica e ha **3
  correzioni a mano** che la rilettura cancellerebbe; la rotta `POST /documenti/:id/rileggi` la vieta
  (ammette solo `errore` e `da_controllare`). Non si aggira.
- **Nessuna azione**: i `pagamento` (id 9, 13) con 0 righe sono corretti (non articolati); gli altri
  `abbinato` non hanno somma diversa né sono AU276950.

## Verifica «dopo la rilettura la pratica si ricalcola già» (aggiornaPratica → salvaCalcolo)

**Non vale per la rilettura.** `rileggiDocumento` (stessa logica della rotta) mette solo `stato → in_coda`
e chiude `lettura.fallita`; non tocca la pratica. Il lettore (`lettura.ts salva`) riscrive solo i campi.
`aggiornaPratica` è chiamata solo dalle scritture su documenti/righe e dall'abbinamento (`registra`,
`modifica`, `annulla`, `sposta`, `pratiche-ricalcola`), mai da `rileggi`/`salva`. In più un documento
rileggibile (`da_controllare`/`errore`) non è ancora in una pratica: la pratica si calcola quando il file
viene **abbinato**, non quando viene riletto. → Dopo la rilettura, PR102829 e RE193612 vanno abbinati a
mano (o dall'operatore) e lì `aggiornaPratica` ricalcola. Da segnalare a Ugo.

## File toccati

- `app/backend/src/documenti.ts`: estratta la logica della rotta `POST /documenti/:id/rileggi` nella
  funzione esportata `rileggiDocumento(db, id, ctx)` (identica, compreso l'evento e `chiudiAnomalia`); la
  rotta ora la chiama e basta. **Nota: `documenti.ts` non è fra i "file ammessi" del pacchetto, ma la
  richiesta «usa la stessa funzione della rotta» la imponeva** (minima estrazione, nessun cambio di
  comportamento).
- `app/backend/src/rilettura-mirata.ts` (nuovo): comando `npm run rilettura:mirata -- [--prova] [--id N…]`.
  Con `--prova` stampa solo l'elenco e i motivi; senza, rilegge uno alla volta solo i «da rileggere» con
  `rileggiDocumento` (un documento per transazione, evento nel registro come la rotta, utente null come i
  comandi di servizio). Un errore di connessione non fa cadere il giro (stampa e prosegue).
- `app/backend/package.json`: solo lo script `"rilettura:mirata": "node dist/src/rilettura-mirata.js"`.
- `app/backend/test/rilettura-mirata.spec.ts` (nuovo): 6 prove.

## Prove

- `npx tsc --noEmit` backend: **OK**.
- `npx jest rilettura-mirata.spec.ts` su `decobrands_test_rilettura` (creato, migrato, cancellato): **6/6**
  (rileggiDocumento da_controllare → in_coda + evento; abbinato → ConflictException; `decide` puro;
  `analizza` con pagamento escluso, fattura con somma≠importo rileggere, AU276950 corretto decidere).
- `npx jest documenti-lettura.spec.ts` (la rotta che ora usa `rileggiDocumento`): **28/28** — nessuna
  regressione.
- `npx ts-node src/rilettura-mirata.ts --prova` su `decobrands_db` (sola lettura): elenco come sopra.
- DB `decobrands_test_rilettura` cancellato a fine prova.

## Comando da lanciare (lo lancia Claude Code)

```
npm run build && npm run rilettura:mirata
```

Atteso su `decobrands_db`: rilegge **id 11 (PR102829)** e **id 12 (RE193612)**; **id 10 (Auftrag_AU276950)
resta fermo** (abbinato + correzioni, da decidere). Dopo la rilettura i due documenti tornano
`da_controllare` con la riga «Fracht»; vanno poi riabbinati per ricalcolare la pratica.

## Review

- `owasp-security`: il comando non ha nuovi ingressi di rete; tutto passa da Prisma (parametrizzato);
  `--id` con `BigInt` non inietta nulla; l'errore di connessione è ripulito (niente password/indirizzo nel
  log). Nessun rilievo.
- `ponytail-review`: `rileggiDocumento` estrae il codice esistente senza duplicarlo; `decide` è una
  funzione pura piccola; il comando è solo lettura + un ciclo su `rileggiDocumento`. Niente da tagliare.

## Da documentare (§19 / guida / piano)

- **§19 (da confermare con Ugo)**: comando di servizio `rileggi:mirata` per rileggere in modo mirato i
  documenti già letti (somma righe ≠ importo, non congelati e senza correzioni a mano); i documenti
  abbinati o corretti non si rileggono, vanno decisi a mano. Perché: dopo le correzioni della lettura
  (riga «Fracht», `spesa`) occorreva rileggere solo i pochi documenti interessati, senza toccare gli altri.
- **Guida / piano**: nessuna modifica alla spec o alla guida (comando interno di servizio); eventuale voce
  nel piano se Ugo lo vuole mantenuto.
- **Correzioni 1 (16/11/2026)**: tolto il criterio «è uno dei tre documenti di AU276950» (era per nome).
  Resta solo somma righe ≠ importo (tolleranza 0,01), non congelato e senza correzioni a mano.

## Aperti

- `Auftrag_AU276950.pdf` (id 10) resta da decidere con Ugo (abbinato + 3 correzioni).
- L'evento di `rileggi` scrive `prima: { stato: 'errore' }` fisso anche per `da_controllare` (cosmesi,
  pre-esistente, segnalata già in `resoconto-rileggi-da-capo.md`, non corretta).

## Correzioni 1 (16/11/2026) — criterio per nome tolto

Pacchetto `strumenti/opencode/rilettura-mirata-correzioni-1.md`. Dopo la rilettura vera, PR102829 (id 11) e
RE193612 (id 12) hanno somma righe = importo (963,78) e la riga di spesa, ma il criterio per nome li
segnalava ancora «→ RILEGGI».

- `app/backend/src/rilettura-mirata.ts`: rimossi `TRE_AU276950` e il parametro `inTre` di `decide`. `decide`
  ora è: niente somma diversa → `null`; congelato o correzioni a mano → `decidere`; altrimenti `rileggere`
  se lo stato è `errore`/`da_controllare`, altrimenti `decidere`. Motivi: solo «somma righe ≠ importo» (o lo
  stato non rileggibile).
- `app/backend/test/rilettura-mirata.spec.ts`: tolto il caso AU276950; aggiunti «congelato o corretto a mano
  → decidere» e il caso «riletto e ora coerente → nessuna azione» (file `Proforma_PR102829.pdf`, righe
  876,28 + 87,50 = 963,78, esito `null`).

Prove: `npx tsc --noEmit` backend OK; `npx jest test/rilettura-mirata.spec.ts` su
`decobrands_test_rilettura` (creato, migrato, poi cancellato) **6/6, 0 KO**; `npm run build` OK;
`npm run rilettura:mirata -- --prova` su `decobrands_db` (sola lettura): **da rileggere: 0**, id 11 e 12
coerenti (somma 963,78, spese 1), nessun «→ RILEGGI», da decidere con Ugo: 0.

`ponytail-review` sul diff: toglie codice (un set, un parametro, un ramo, un test); niente da tagliare oltre.
Nessuna modifica alla spec (§19 resta come sopra, già coerente: il criterio per nome non era in spec).
