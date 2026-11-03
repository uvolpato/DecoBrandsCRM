# Prompt per OpenCode: F2-A2 Dettaglio pratica (con le pagine dei documenti di F2-A3)

Da incollare in OpenCode nella cartella `C:\Progetti\Decobrands_CRM`. È un lavoro da Sonnet: usa il
modello caricato, in una sola sessione, senza sottoagenti.

---

Leggi `CLAUDE.md`. Carica le skill `ponytail`, `nestjs-best-practices`, `prisma-client-api`,
`nextjs-app-router-patterns`, `ui-ux-pro-max`, `javascript-typescript-jest`, `webapp-testing` e
`playwright-best-practices`. Prima di cercare nei file usa `graphify query "<domanda>"`.

## Cosa fare

La pagina `/pratiche/[id]` oggi è vuota. Va riempita come la pagina *Pratica* del prototipo
(`prototipo-alternativo/assets/viste-giorno.js`), con queste parti:
- il binario delle fasi;
- le schede *Riepilogo* e *Righe a confronto*, con l'avviso delle variazioni;
- i documenti affiancati;
- la card *Documenti fiscali*, con la finestra per registrare la fattura e quella per la nota di
  credito (NC).

Da leggere:
- `piano-lavoro-crm.md`: le righe **F2-A2** e **F2-A3**;
- la spec `specifica-crm-provvigioni.md`: §7.3, §6.1, §5.3, §5.8, §5.9, §5.10, §4.2.7.1,
  §15.2.4, e D-12, D-15, D-52, D-54 in §19;
- il server, già fatto e provato: `app/backend/src/documenti.ts` (rotte dei documenti, commit
  d728a48), `src/pratiche.ts` e `src/motore/motore.ts` (`statoPratica`, `confronto`,
  `haVariazioni`). Le prove `test/documenti.spec.ts` sono la fonte di verità delle rotte.

### Server: aggiungi solo quello che manca

In `app/backend/src/pratiche.ts` o `documenti.ts`, riusando il motore:

1. **`GET /api/pratiche/:id`** (permesso `provvigioni.consulta`). Restituisce:
   - la testata: numero, cliente, fornitore, subagente alla data, data dell'ordine, importo;
   - lo stato e la sua nota, presi da `statoPratica`;
   - le fasi del binario, con data e documento di ogni fase;
   - le righe a confronto (`confronto`), con le variazioni;
   - l'azione proposta (D-15).

   Lo stato, le fasi, il confronto e gli importi li calcola il server (V12). Il browser mostra e
   basta.
2. **`GET /api/documenti/:id/file`** (permesso `provvigioni.consulta`). Restituisce il PDF dal
   disco (`DOCUMENTI_DIR`, file `<impronta>.pdf`), con:
   - `Content-Type: application/pdf`;
   - `Content-Disposition: inline`, con il nome originale ripulito;
   - `X-Content-Type-Options: nosniff`.

   Il percorso si costruisce solo dall'impronta salvata nel database, **mai** da un valore che
   arriva dal browser. Se il file manca, risponde 404.
3. Per ogni rotta nuova aggiungi le prove in `test/pratiche.spec.ts` o `test/documenti.spec.ts`:
   - la forma della risposta;
   - 404;
   - 403;
   - per il file: il tipo e il fatto che un id inesistente non legge niente.

### Rotte dei documenti già pronte (F2-A3)

- `GET /api/pratiche/:id/documenti` risponde:
  ```
  { pratica: {id, numero, stato, importo},
    documenti: [{id, tipo, numero, data, importo, storno_totale, fattura_id, stornato?, residuo?,
                 arrivo_id, file_nome, stato_incasso, liquidato, note}],
    totali: {fatture, note_credito, netto} }
  ```
  La NC ha l'importo negativo.
- `POST /api/pratiche/:id/documenti` riceve
  `{tipo:'fattura'|'nota_credito', numero, data, importo?, storno_totale?, fattura_id?, arrivo_id?, note?}`.
  L'importo si manda sempre positivo; per la NC servono `fattura_id` e un importo, oppure
  `storno_totale: true`.
  - 400: NC oltre il residuo, NC senza fattura;
  - 409: numero doppio, file non in coda, fattura già stornata per intero.
- `PUT /api/pratiche/:id/documenti/:did` riceve `{numero?, data?, importo?, storno_totale?, note?}`.
  `note: null` svuota la nota. Numero e data valgono per tutte le copie della fattura su più
  ordini.
  - 409: il documento è in un bollettino e cambiano importo, numero o data.
- `DELETE /api/pratiche/:id/documenti/:did` risponde 204.
  - 409: il documento ha correzioni, righe di bollettino o una NC che lo storna.
- `POST /api/documenti/carica` riceve un PDF in `multipart/form-data`, nel campo `file`, e risponde
  201 `{id, file_nome, stato:'in_coda', ricevuto_il}`.
  - 415: il file non è un PDF;
  - 413: il file è troppo grande;
  - 409: il file è già caricato.

Nella finestra della fattura si può allegare il PDF: prima `carica`, poi `arrivo_id` nel `POST`.
Tutti i messaggi 400, 409, 413 e 415 si mostrano nella finestra così come arrivano dal server.

### Pagina `app/frontend/app/(app)/pratiche/[id]/`

- Usa solo componenti che esistono già: `Pagina`, `Pannello`, `Schede`, `DataTable`, `Kpi`,
  `FormModal`/`Modale`, `Campo` (con `tipo: 'data'`).
- Il binario delle fasi c'è nel prototipo. Se nell'app non esiste ancora, crealo come componente
  parametrico e mettilo nel catalogo `/componenti` e nella spec §16.4.
- Prima l'informazione aggregata e l'azione proposta, poi le righe (D-12, D-15).
- I documenti affiancati mostrano il PDF da `GET /api/documenti/:id/file` in un `<iframe>` o in un
  `<object>`.
- Le azioni di scrittura (registra, correggi, annulla, carica) si vedono solo con il permesso
  `provvigioni.modifica`.
- Tornando all'elenco, si ritorna nello stesso punto (§7.12).

### Documenti

- **Spec:** aggiorna §7.3 e §8.1 se l'app è diversa dal prototipo, poi alza la versione in testa.
- **Guida** (`prototipo-alternativo/assets/guida.js`): pagina Pratica, finestre *Fattura* e *Nota di
  credito*, e le regole da sapere:
  - la NC non può superare la fattura;
  - un documento in un bollettino non si cambia;
  - numero e data valgono per tutte le pratiche della stessa fattura.
- Lancia `python3 strumenti/genera-pagine-doc.py`.

## Regole

- Tutto sul backend (V12), una operazione = una transazione (V13).
- Italiano semplice. Commenti brevi con il rimando alla decisione.
- Codice minimo (ponytail).
- Le prove del server vanno su `decobrands_test`, mai su `decobrands_db`.
- **Non chiudere processi node che non hai avviato tu.** Ugo ha i server di sviluppo su 8001/8002 e
  c'è chi lancia altre prove: per chiudere i tuoi server usa il PID che hai avviato, non "tutti i
  node".
- Niente commit, niente push, niente `.env`. Per le prove nel browser imposta `DOCUMENTI_DIR` su una
  cartella temporanea, nell'ambiente del processo.

## Prove

1. **Server.** In `app/backend` lancia `npx tsc --noEmit`, poi `npx jest --runInBand`, da solo.
   Risultato atteso: 0 KO.
2. **Browser.** Avvia:
   - il backend su 8012, con `DATABASE_URL` → `decobrands_test_f1a1`, `DOCUMENTI_DIR`
     temporanea, `TENTATIVI=1000` e `TENTATIVI_IP=1000`;
   - il frontend su 8011, con `BACKEND_URL=http://127.0.0.1:8012`, `npm run build` e poi
     `next start`.

   Se `decobrands_test_f1a1` non ha le migrazioni nuove, applicale lì con `prisma migrate deploy`,
   poi lancia `pratiche:ricalcola`.

   Utenti: `f1-ammi` e `f1-oper`, password `password-di-prova`.

   Scrivi `strumenti/prove/app_pratica.py`. Deve controllare:
   - binario e stato;
   - le schede, cercate con `.schede-barra [role=tab]`;
   - l'avviso delle variazioni su una pratica che ne ha;
   - la registrazione di una fattura con PDF allegato, che porta la pratica a *Fatturata*;
   - NC oltre il residuo: errore visibile; NC giusta: netto aggiornato;
   - annullamento;
   - il PDF che si vede;
   - l'operatore in sola lettura, senza pulsanti di scrittura;
   - il ritorno all'elenco nello stesso punto;
   - nessun errore JavaScript.

   Rilancia anche `app_pratiche.py` e `app_componenti.py`. Tutto deve chiudere con 0 KO.
3. **Schermate.** A 1440 e 768 px, in `%TEMP%\f2-a2`. **Guardale.**
4. Chiudi i **tuoi** processi sulle porte 8011 e 8012.

## Resoconto

Scrivi `strumenti/opencode/resoconto-f2-a2.md` con:
- i file toccati;
- le rotte nuove, con la forma della risposta;
- l'esito delle prove (numeri e KO);
- le schermate;
- i dubbi.
