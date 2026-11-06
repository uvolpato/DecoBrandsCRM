# F6-A2 — Servizio di lettura dei documenti

Data: 06/11/2026 · ramo `main` · nessun commit, nessun push.

## File toccati

| File | Cosa |
|---|---|
| `app/backend/src/lettura.ts` **(nuovo)** | `SCHEMA_DOCUMENTO`, `PROMPT_DOCUMENTO`, `leggiDallaCoda`, `LetturaService` |
| `app/backend/src/lettura-prova.ts` | toglie `SCHEMA_PROVA`, usa lo schema e il prompt veri |
| `app/backend/src/app.module.ts` | registra `LetturaService` fra i provider |
| `app/backend/test/lettura.spec.ts` **(nuovo)** | 7 prove, lettore finto, nessuna rete |
| `specifica-crm-provvigioni.md` | versione 8.45, §6.5 punti 3–4, nuova riga D-69 in §19 |
| `piano-lavoro-crm.md` | riga F6-A2 aggiornata (schema unico, Excel rinviati, D-69); nessuna ora nuova |
| `app/README.md` | la prova `lettura:prova` usa lo schema vero |
| `prototipo-crm/specifica.html` | rigenerata con `python strumenti/genera-pagine-doc.py` |

Nessuna migrazione: tabelle e vincoli c'erano già.

## Come funziona

1. `LetturaService.esegui()` chiama `letturaConfig`; senza connettore configurato non preleva niente
   e i file restano `in_coda`. Altrimenti un giro di `leggiDallaCoda`.
2. `leggiDallaCoda` preleva **un** documento con `prelevaDocumento` (`SKIP LOCKED`, `tentativi+1`,
   stato `in_lettura`), apre una riga in `servizi_esecuzioni` (`lettura`/`lavoro`) e legge il file
   `DOCUMENTI_DIR/<file_percorso>`; errore chiaro se `DOCUMENTI_DIR` manca.
3. Chiama il connettore con `SCHEMA_DOCUMENTO` e `PROMPT_DOCUMENTO`. Un solo schema: il `tipo` è un
   campo letto dal modello (enum degli otto ammessi). Le righe di tutte le pagine arrivano già in un
   solo elenco (`extraction_target: 'per_doc'`): nessuna fusione nel nostro codice.
4. Salvataggio in una transazione (V13): `SELECT … FOR UPDATE` sulla riga, se lo stato non è più
   `in_lettura` non si scrive niente; `deleteMany` dei campi vecchi, `createMany` dei nuovi (saltati
   i valori `null` e le stringhe vuote; `valore_finale` null, `verificato` false; `affidabilita`,
   `posizione`, `precisione` salvate); poi `documenti_in_arrivo` con `stato: 'da_controllare'`,
   `tipo` (solo se ammesso, altrimenti null), `letto_il`, `modello`, `errore: null`. `livello` e
   `controlli` restano a F6-A3.
5. In caso di errore: `letturaFallita` (3 tentativi, poi `errore` + anomalia `lettura.fallita`) e la
   riga di esecuzione chiusa con `esito: 'errore'`, testo "Lettura non riuscita". Nessun evento sul
   successo: §15.2.4 non lo prevede.
6. Timer di 15 s, un documento per giro, guardia `inCorso`, nessun timer con `NODE_ENV === 'test'`;
   `esegui()` è pubblico e non lancia (lo userà *Controlla adesso* in F5-A5).

## Prove ed esito

- `npx tsc --noEmit`: pulito.
- `npm run build` (`nest build`): pulito.
- `npx jest test/lettura.spec.ts`: **1 suite, 7 prove, 7 passate** (11,1 s).
- `npm test`: **30 suite, 387 prove, 387 passate** (0 KO).

Le prove di `lettura.spec.ts`: coda vuota (`false`, nessuna esecuzione); senza configurazione non
preleva; successo completo (stato, tipo, letto_il, modello, campi con percorsi `righe[0].prezzo`,
salto di vuoti e null, posizione/precisione, riga `servizi_esecuzioni` con `misure.documento_id`);
tipo `scontrino` → `tipo` null ma lettura salvata; errore del lettore su 3 giri → `errore` +
`lettura.fallita` (e 3 esecuzioni `errore`); file mancante → `letturaFallita`, nessun campo;
documento non più `in_lettura` al salvataggio → nessun campo.

## Cosa funziona sui documenti veri e cosa no

- **Funziona con i documenti veri**: file su disco (PDF/JPEG/PNG), coda, chiamata al connettore
  LlamaCloud UE, salvataggio dei campi con confidenza e citazione, tentativi e anomalia. Sulle prove
  il lettore è finto; la chiamata vera è coperta da `test/lettore.spec.ts` (sequenza HTTP simulata)
  e dalla prova a mano `npm run lettura:prova`.
- **Non verificato su documenti reali in questa slice**: qualità dell'estrazione (campi giusti,
  righe complete, tipo indovinato) e tempi/crediti per pagina. Serve un giro con PDF veri (Gries +
  un importatore) prima di dire che la lettura è tarata: la taratura delle soglie è F6-A5/D-67.
- **Connettore locale GLM-OCR**: non implementato (`leggiDocumento` lancia
  `LetturaNonConfigurata` se scelto); con la configurazione locale attiva il documento consumerebbe
  i 3 tentativi e finirebbe `errore`. Si accende quando arriva la macchina (D-67/F6-A5).

## Dubbi e cose aperte

- **Excel dei bollettini**: non fatto, come chiesto. D-60 li rifiuta nel canale comune (415) e non
  esiste un ingresso alternativo: il lettore `exceljs` sarebbe codice morto. Registrato in D-69 e
  nel piano ("Excel rinviati (D-60)").
- **`extraction_target`**: lasciato `per_doc`. I test verificano che tutte le righe restituite
  finiscano in `documenti_campi`; se un documento multipagina reale restituisse elenchi separati per
  pagina, il connettore (non il nostro codice) è il punto da cambiare.
- **Evidenziazione del valore nel PDF (D-06)**: non implementata. La posizione è salvata così com'è
  (`posizione`, `precisione`); F0-A7 resta da fare per il connettore locale, mentre per
  `llamacloud_eu` la citazione dà già il riquadro.
- **Doppio consumatore della coda**: `CasellaService.onModuleInit` rimette `in_lettura` in `in_coda`
  all'avvio. Se in futuro girassero più processi, il riavvio di uno rimetterebbe in coda un documento
  che un altro sta leggendo. Oggi c'è un solo processo (porta 8001/8002 con ruoli distinti), quindi
  non si tocca; da rivedere se si aggiunge un secondo processo di lettura.
- **`tipi` del tipo documento**: ammessi gli otto di §4.2.12 (compreso `bollettino`). Il valore letto
  dal modello è una stringa libera; se non è nell'elenco il `tipo` resta null e la persona lo sceglie
  nella correzione (F6-A4).
