# Resoconto `provvigione-base-pagamento` (18/11/2026)

## File toccati

- `app/backend/src/motore/motore.ts` — un helper, due punti d'uso (nessuna colonna, nessuna migrazione)
- `app/backend/test/motore.spec.ts` — quattro casi nuovi (dati costruiti a mano)
- `app/backend/test/analisi.spec.ts` — un caso esistente riscritto (vedi «Prove cambiate»)

Nessun altro file: niente frontend, CSS, spec, guida, piano, migrazioni, `.env`, Integra. Nessun commit.

## Diff sintetico (`motore.ts`)

1. **Nuovo `baseProvvigione(p, d)`**, accanto a `baseDoc`:
   - solo per `d.tipo === 'fattura'`;
   - con **più fatture** nella pratica torna `baseDoc(d)` (il pagamento non si sa a quale si riferisce);
   - altrimenti prende il pagamento **più recente** con importo diverso da zero, in **valore assoluto**;
   - senza pagamento torna `baseDoc(d)` (comportamento di prima).
   `baseDoc` non è stato toccato: chi la usa per merce/fatturato (confronto righe, `basePratica`, liquidazione, `differenzaNotaCongelata`) resta com'è.
2. **`provvigioneDocumento`**: la base di una fattura è `baseProvvigione`; prese e quota del subagente scendono **in proporzione** (`r2(v × base / baseDocumento)`), alla stessa percentuale effettiva — così vale anche in modalità riga e con la correzione «importo». Per le note di credito resta il `calcolo` di oggi (D-197).
3. **`riconcilia`**: `imp = baseProvvigione(n.pratica, n.doc)` nel ramo a gruppi; idem per le righe singole (storno col segno meno) e per la riga `mancante`. `v.base` e `atteso` seguono, `pctEffettiva = atteso / imp`.

Nota: un pagamento registrato **senza importo** (la colonna ha default 0, `POST /api/documenti/:id/abbina` lo permette) viene ignorato: senza quel filtro azzererebbe la provvigione.

## Numeri del seed: nessuno cambiato

Il seed non ha documenti di pagamento (`prisma/seed/dati-prova.json`: 0). Tutte le prove del seed danno gli stessi numeri di prima, compreso lo storno **F-2026-0822** e la sua voce nella liquidazione successiva (3° trimestre 2026: −2450 di imponibile, provvigione negativa), che restano sulle fatture.

Prove cambiate (non sono numeri del seed, è la regola nuova):

- `analisi.spec.ts` — «un pagamento o una proforma non cambiano i numeri (D-60)»: il caso creava un pagamento da 5000 su una pratica del seed e pretendeva numeri identici. Ora la regola dice il contrario, quindi il pagamento viene creato **pari alla fattura** e il caso verifica che non nasca un fatto suo né cambi i numeri (la discesa proporzionale è coperta in `motore.spec.ts`). Titolo aggiornato.

## Prove nuove (`motore.spec.ts`)

1. una fattura da 1000 + pagamento 716,08 → base 716,08, prese **128,89** (18 %), pagate **71,61** (10 %);
2. una fattura, nessun pagamento → base 1000, prese 180;
3. due fatture + pagamento → base 1000 su entrambe (limite scritto nel commento);
4. bollettino con una riga sull'imponibile 716,08 e provvigione 128,89 → `noi.imponibile = 716,08`, categoria `quadra`, differenza 0.

## Esiti

- `npx tsc --noEmit` (backend): **0 errori**.
- `npm test -- motore.spec.ts bollettino.spec.ts bollettini.spec.ts liquidazione.spec.ts analisi.spec.ts --forceExit`: **4 suite, 81 prove, 0 KO**. Attenzione: non esiste `liquidazione.spec.ts`; il comando ha eseguito motore, bollettino, bollettini, analisi (il pattern non intercetta `liquidazioni.spec.ts`).
- `npm test -- liquidazioni.spec.ts incassi.spec.ts`: 2 suite, 35 prove, 0 KO.
- `npm test -- pratiche.spec.ts valori-congelati.spec.ts valori-congelati-db.spec.ts documenti-pratica.spec.ts sconto-medio.spec.ts`: 5 suite, 80 prove, 0 KO (controllo fuori elenco, perché il motore è condiviso).

## Dubbi (da decidere con Ugo)

1. **Documenti congelati (D-183)**: la regola è applicata anche a un documento congelato, quindi un pagamento registrato **dopo** la chiusura del bollettino cambia `v.base` e le provvigioni lette da Analisi e bollettini (non il JSON salvato). Se i chiusi non devono muoversi, basta saltare la sostituzione quando `d.congelato_il` è valorizzato.
2. **Pratica e liquidazione restano sulla fattura**: `quotaSub` e `basePratica` non passano da `baseProvvigione`, come da pacchetto. Ne segue che nel dettaglio pratica (`pratiche.ts`, riga ~586 `quote` e ~619 `aDecobrands`) al subagente e a Decobrands si sommano basi diverse, e in liquidazione il subagente è liquidato sull'imponibile della fattura: con un pagamento scontato il margine mostrato non torna. Servono un pacchetto su `quotaSub`/`righeLiquidazione` (e `differenzaNotaCongelata`) per allineare tutto, oppure la conferma che liquidazione e pratica restano sulla fattura.
3. **`analisiTrimestre`**: `fatturato` resta `baseDoc` (imponibile della fattura, come chiesto) ma `prese` usa `provvigioneDocumento`, quindi sui trimestri con pagamenti i due numeri non saranno più legati da una percentuale unica.

## Da documentare

- **§19**, nuova decisione (D-nn, 18/11/2026): «La provvigione di una fattura si calcola sull'importo del pagamento del cliente quando c'è, altrimenti sull'imponibile della fattura; con più fatture nella pratica resta la fattura; un pagamento senza importo non conta». Perché: pagamento anticipato con sconto, il pagamento porta già la quota.
- **§5.3 / §5.14**: riga *Perché* e la formula della base (accanto a D-183).
- **§10**: nota al motore (`baseProvvigione`).
- **Guida** (`guida.js` / `lib/guida.ts`): nella scheda della pratica, «la provvigione si calcola sull'importo pagato dal cliente, se registrato; altrimenti sulla fattura».
- **Piano §12**: attività da approvare (o, se si allineano anche liquidazione e pratica, secondo pacchetto).
