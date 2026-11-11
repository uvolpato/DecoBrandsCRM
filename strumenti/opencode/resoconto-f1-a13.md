# F1-A13 — Scaglioni obbligatori e agenzia precompilata dallo storico (D-113, D-112)

Lavoro di DeepSeek Flash (`deepseek/deepseek-flash`), 11/11/2026. Nessun commit, nessun push.

## Cosa è stato consegnato

1. **Fornitore senza scaglioni**: `GET /api/fornitori/:id` porta `mancano_scaglioni`, calcolato dal
   server (nessuna versione con `valido_dal ≤ oggi`, D-113). Nella scheda *Percentuali* compare un
   avviso con il pulsante *Configura gli scaglioni*, che apre il form delle percentuali che c'era già.
   Chi non ha `dati.condizioni` vede il pulsante spento con il motivo.
2. **Agenzia dallo storico**: `POST /api/clienti/:id/agenzie` accetta `storico_id` facoltativo.
   La riga si valida sulla coppia cliente-fornitore (400 se non corrisponde, nessuna scrittura) e
   diventa `usata` con `interscambio_id` e `usato_il` **nella stessa transazione** (V13).
3. **`FormAgenzia` precompilato**: aperto da un documento (fornitore fisso + codice letto) legge lo
   storico una volta sola; con una riga e subagente mostra «Dal vecchio CRM: subagente X, sconto Y%» e
   precompila subagente, codice e sconto (modificabili); con una riga senza subagente mostra «Questo
   fornitore non era rappresentato per questo cliente» e non precompila nulla.
4. **Pulsanti e permessi**: il form dell'agenzia continua a spegnere `pct_subagente` e
   `regola_mensile` per chi non è responsabile (D-50); il nuovo pulsante degli scaglioni è spento con
   il motivo.

## File toccati

| File | Cosa |
|---|---|
| `app/backend/src/fornitori.ts` | `mancano_scaglioni` nel dettaglio (una query in più, accanto a quella del dettaglio) |
| `app/backend/src/clienti.ts` | `storico_id` nel DTO, `stessaCoppia()`, riga letta e validata nella transazione, `segnaUsata` dopo la `create`, `storico_id` nel registro |
| `app/backend/test/clienti.spec.ts` | 6 prove nuove: riga valida (usata + `interscambio_id` + `usato_il`), riga di un'altra coppia (400, niente scritto), riga con soli id fornitore, P.IVA diversa (400), riga senza alcun dato della coppia (400), rotta del form + uso, senza `storico_id` invariato |
| `app/backend/test/fornitori.spec.ts` | 1 prova nuova: `mancano_scaglioni` vero senza versioni, vero con sole versioni future, falso con quella in vigore |
| `app/frontend/app/(app)/fornitori/VistaFornitori.tsx` | campo `mancano_scaglioni`; avviso `nota nota-attesa` con *Configura gli scaglioni* nella scheda *Percentuali*; il pulsante *Nuove percentuali* non si duplica quando l'avviso c'è |
| `app/frontend/componenti/FormAgenzia.tsx` | lettura dello storico (una per apertura, solo per l'agenzia nuova da documento), testo della proposta, precompilazione, `storico_id` nel POST |
| `strumenti/prove/app_fornitori.py` | avviso → form → salvataggio per il fornitore senza scaglioni; pulsante spento per operatore e lettura |
| `strumenti/prove/app_clienti.py` | dalla scheda cliente nessuna proposta dallo storico (arriva solo dal documento) |

Non toccati: `src/storico.ts`, `src/anagrafica-integra.ts`, `src/proposta.ts`, `src/documenti.ts`,
`VistaDocumento.tsx`, spec, piano, `avanzamento-app.md`, prototipo.

## API

- `GET /api/fornitori/:id` → in più `mancano_scaglioni: boolean` (nessuna versione delle percentuali
  con `valido_dal ≤ oggi`, data di Roma). `GET /api/fornitori/:id/percentuali` resta com'è
  (`in_vigore`, `modificabile`), come chiesto.
- `POST /api/clienti/:id/agenzie` → nuovo campo facoltativo `storico_id` (intero ≥ 1):
  - riga inesistente → 400 *Riga dello storico non trovata*, niente scritto;
  - riga di un'altra coppia → 400 *La riga dello storico è di un altro cliente o fornitore*, niente
    scritto (transazione annullata);
  - riga valida → l'agenzia si crea come prima e la riga passa a `usata`, con `interscambio_id`,
    `usato_il` e nota *Agenzia creata dal CRM*; l'evento `crud.create` porta anche `storico_id`;
  - senza `storico_id` tutto come prima.
- La coppia si valida sugli id quando ci sono; se mancano (gli id dello storico si riempiono quando i
  ruoli nascono, §4.7.2) si confrontano le P.IVA normalizzate scritte nello storico. Serve almeno un
  riscontro: una riga senza id e senza P.IVA non si può segnare «a caso» (400).

## ⚠ Blocco trovato (da correggere in F1-A12/F1-A11, non qui)

Con i dati veri la precompilazione **non trova niente**, e non per colpa del form:

- le 4022 righe importate hanno **tutte** `fornitore_id` e `cliente_id` a NULL (verificato sul
  database di sviluppo: `count(*) where fornitore_id is not null` = 0);
- `cercaLegame` usa `fornitore_id` come filtro (`base.fornitore_id`) e, senza uno fra id/P.IVA/nome,
  risponde subito `[]`;
- la rotta `GET /api/interscambio/storico` accetta solo `fornitore_id`, `cliente_id`, `codice`: non
  c'è modo di passare la P.IVA o il nome, che `cercaLegame` già saprebbe usare.

Quindi il form chiama la rotta come da contratto (`fornitore_id`, `cliente_id`, `codice`) e riceve
`[]`: niente proposta e niente `storico_id` finché qualcuno non collega gli id o allarga la rotta.
Due correzioni possibili, piccole, fuori dai miei file:

1. `src/storico.ts`, `FiltroStorico` + passaggio: aggiungere `fornitore_piva` (e `fornitore_nome`)
   alla rotta e passarli a `cercaLegame` (che li supporta già). ~4 righe, usato anche da
   `documenti.ts`/`proposta.ts` che oggi passano solo `fornitoreId`.
2. Riempire `interscambio_storico.fornitore_id`/`cliente_id` quando il ruolo nasce (import da
   Integra e `soggetti_storico`). È quello che dice §4.7.2, ma oggi non lo fa nessuno.

La prova l'ho fatta con una riga temporanea con gli id valorizzati (creata e poi cancellata sul
database di sviluppo): il form mostra la proposta, precompila e al salvataggio la riga diventa
`usata`. Appena il collegamento c'è, funziona senza altre modifiche.

Nota collegata: i nomi dei subagenti del vecchio CRM sono spesso diversi da quelli in anagrafica
(`Alfredo Nista` / `Maurizio Bastasin` contro `Marco Nista` / `Stefano Bastasin`). La proposta mostra
il nome storico; il campo *Subagente* si precompila solo se in anagrafica c'è un subagente con lo
stesso nome e cognome (confronto senza maiuscole, accenti e punteggiatura). Non ho aggiunto una
corrispondenza per solo cognome: sarebbe un'altra persona e quindi soldi sbagliati.

## Prove (tutte sul seed, suite una per volta)

| Prova | Esito |
|---|---|
| `npx tsc --noEmit` backend | 0 errori |
| `npx tsc --noEmit` frontend | 0 errori |
| `npx jest --runInBand test/clienti.spec.ts` | 23/23 OK |
| `npx jest --runInBand test/fornitori.spec.ts` | 7/7 OK |
| `npx jest --runInBand test/percentuali.spec.ts` | 31/31 OK |
| `python strumenti/prove/app_fornitori.py f1a13 … http://localhost:8011` | 27 controlli, 0 KO (avviso, form, «l'avviso sparisce», 768 px) |
| `python strumenti/prove/app_clienti.py f1a13 …` | 34 controlli, 0 KO |
| `python strumenti/prove/app_documenti.py f1a13 …` | 40 controlli, 0 KO (su quattro giri, due hanno perso 1–2 controlli di sola attesa sul dettaglio appena aperto: *Configura l'agenzia* / titolo del documento contati prima che i dati arrivassero; rilancati senza modifiche, 0 KO) |
| Prova a mano del form precompilato (riga temporanea con id) | 6 controlli 0 KO: proposta, subagente id 2, sconto 7, codice, 1440 e 768 px, agenzia creata e riga `usata` |
| Prova a mano del caso «non rappresentato» | 3 controlli 0 KO: messaggio, nessuna proposta, sconto non precompilato |
| Lettura · scrittura | `usata`, `interscambio_id` = agenzia creata, `usato_il` valorizzato |

Schermate in `%TEMP%\f1-a13` (guardate):
`app-fornitori-senza-scaglioni-1440.png`, `app-fornitori-scaglioni-salvati-1440.png`,
`app-fornitori-oper-senza-scaglioni-1440.png`, `app-fornitori-lett-senza-scaglioni-1440.png`,
`app-fornitori-768.png`, `app-clienti-1440.png`, `app-clienti-768.png`,
`app-agenzia-storico-1440.png`, `app-agenzia-storico-768.png`,
`app-agenzia-non-rappresentato-1440.png`.

Nota sulla riproducibilità: `app_fornitori.py` prova il fornitore senza scaglioni del seed
(*Nuovo Fornitore Demo SRL*). Il primo giro lo configura; dopo, il controllo diventa «già configurato
da un giro precedente, versioni in tabella». Per rifare il giro intero si tolgono le percentuali di
quel fornitore (o si ricarica il seed); io le ho tolte alla fine, quindi il database di sviluppo è
tornato senza percentuali per quel fornitore. La riga e il documento della prova a mano sono stati
tolti. Restano invece le agenzie e le pratiche che `app_documenti.py` crea e non ripulisce da solo
(comportamento noto dello script: va lanciato su un database di prova).

## Controlli caricati

- `owasp-security` (rilievi veri applicati): permessi già sul server (`dati.consulta` in lettura,
  `dati.modifica` per creare l'agenzia, `dati.condizioni` per percentuale/regola); il nuovo
  `storico_id` non permette di segnare righe di altre coppie e ora pretende almeno un riscontro;
  niente SQL nuovo (solo Prisma parametrizzato), niente HTML costruito a mano (React sfugge i nomi
  del vecchio CRM), nessun dato sensibile in più nelle risposte.
- `ponytail-review` (applicati): tolti un filtro per P.IVA e una funzione di scelta nel form dopo
  aver scoperto che la rotta non può usarli; nessuna libreria nuova; riuso di `Pulsante`, `nota
  nota-attesa`, `FormModal`, `avviso`; una sola lettura dello storico per apertura.

## Dubbi / cose da sapere

1. **Blocco dello storico** descritto sopra: senza quel collegamento la proposta dallo storico resta
   muta sui dati veri. È la cosa da mettere in cima al prossimo lavoro.
2. Se una riga dello storico è già `usata`, un secondo `storico_id` sulla stessa riga la riscrive
   (l'`interscambio_id` passa alla nuova agenzia). Oggi ci si arriva solo cancellando e ricreando
   l'agenzia; se serve, un 400 «già usata» è una riga.
3. Nel caso «non rappresentato» il form manda comunque `storico_id`: la coppia esiste nel vecchio
   CRM e la riga è la provenienza dell'agenzia creata. Se si preferisce non segnarla, basta togliere
   il campo quando `rappresentato` è falso.
4. Il testo dell'avviso nel form è dentro la testata della finestra (`testo` di `Modale`), quindi
   anche il lettore di schermo lo legge; il messaggio «Mancano gli scaglioni» sulla card del documento
   resta di F2-A6, non l'ho toccato.

## Righe proposte per spec / piano / avanzamento (non applicate)

- **§7.4 Fornitori**, dopo il primo elenco puntato: «Se il fornitore non ha una versione delle
  percentuali in vigore, la scheda *Percentuali* mostra l'avviso *Senza scaglioni le pratiche di
  questo fornitore non si aprono* con *Configura gli scaglioni* (una versione, `dati.condizioni`);
  chi non è responsabile vede il pulsante spento con il motivo. *Perché (D-113):* le percentuali sono
  soldi e non si indovinano; finché mancano, la pratica non si apre.»
- **§7.6 Clienti e agenzie**, nella parte dell'agenzia dal documento: «Aperta da un documento con il
  codice letto, la finestra legge lo storico dei legami (una volta) e propone *Dal vecchio CRM:
  subagente X, sconto Y%*, precompilando subagente, codice e sconto; con una riga senza subagente
  dice *Questo fornitore non era rappresentato per questo cliente*. Al salvataggio la riga diventa
  `usata` con l'agenzia creata (D-112).»
- **§8.1 API**: `GET /api/fornitori/:id` → aggiungere `mancano_scaglioni`; aggiungere una riga
  `POST /api/clienti/:id/agenzie` con `{subagente_id, fornitore_id, codice_cliente_fornitore, sconto,
  pct_subagente, regola_mensile, valido_dal, valido_al, storico_id?}` e «`storico_id` di un'altra
  coppia → 400; se valido la riga dello storico diventa `usata` nella stessa transazione (D-112)».
- **§19**: nessuna decisione nuova; D-113 e D-112 ci sono già. Se si accetta la riga «un solo
  riscontro obbligatorio sulla coppia» vale la pena annotarla sotto D-112.
- **Piano §12 / `avanzamento-app.md`**: F1-A13 con 3 casi (avviso scaglioni, `storico_id`, form
  precompilato) + 1 caso aperto (collegamento degli id dello storico, F1-A12/F1-A11).
