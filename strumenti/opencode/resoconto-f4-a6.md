# Resoconto F4-A6 — Numeri che si aggiornano da soli e filtri standard

Data: 04/11/2026. Slice F4, attività F4-A6 (§16.4.2, D-23; D-22). 4 h approvate (Ugo, 04/11/2026).
Lavoro sull'app vera (`app/`).

## File toccati

| File | Cosa |
|---|---|
| `app/backend/src/eventi.ts` | nuovo: mappa codici/entità → aree, ciclo di lettura del registro, servizio con un solo timer mentre qualcuno è collegato, controller SSE |
| `app/backend/src/app.module.ts` | registrati `EventiController` e `EventiService` |
| `app/backend/src/clienti.ts` | `GET /api/clienti/:id/pratiche` restituisce anche `fornitore_id` (serve al filtro fornitore della scheda *Pratiche*) |
| `app/backend/test/eventi.spec.ts` | nuovo: prefissi e codici generici, unione delle aree, ciclo sul registro vero, rotta 401/403 |
| `app/frontend/lib/eventi.tsx` | `EventiProvider` + `useEventi()`: un solo `EventSource` per scheda, chiuso allo smontaggio |
| `app/frontend/componenti/Aggiornamenti.tsx` | barra *Ci sono aggiornamenti · Aggiorna* |
| `app/frontend/app/(app)/layout.tsx` | provider montato nel guscio |
| `app/frontend/app/(app)/pratiche/VistaPratiche.tsx` | contatori aggiornati in silenzio, righe ferme, barra e *Aggiorna* |
| `app/frontend/app/(app)/bollettini/VistaBollettini.tsx` | come Pratiche, sulla matrice |
| `app/frontend/app/(app)/clienti/VistaClienti.tsx` | scheda *Pratiche*: filtri standard (segmenti con conteggi, fornitore multiplo, ricerca numero, riepilogo) |
| `app/frontend/app/stile/stile.css` | classe `.aggiornamenti` (barra gialla, pulsante a destra) |
| `strumenti/prove/app_eventi.py` | nuova prova browser (due schede, scrittura vera, barra, contatori, righe ferme, pulizia) |
| `strumenti/prove/app_bollettini.py` | attesa della ricerca fornitore da 400 a 700 ms (vedi «Prove») |
| `specifica-crm-provvigioni.md` | versione 8.31; §7.2, §7.6, §7.7, §8.1 (rotta SSE), §16.4.2 (Nell'app) |
| `piano-lavoro-crm.md` | F4-A6 segnata fatta |
| `prototipo-crm/specifica.html` | rigenerato con `python strumenti/genera-pagine-doc.py` |

Niente commit, niente push, nessuna modifica a `.env` o `avanzamento-app.md`.

## Server: `GET /api/eventi/flusso`

- **Server-Sent Events**, `@Sse`, `@Richiede('collegato')`; risponde 401 senza sessione e 403 con
  la password provvisoria.
- Eventi `{aree: ["pratiche", …]}`; battito `{battito: true}` ogni ~25 s.
- Un solo ciclo ogni ~4 s, **solo con almeno un collegato**; parte da `max(id)` al primo
  collegamento (nessun evento vecchio), legge le righe con `id > ultimo` e unisce quelle dello
  stesso giro in un evento solo; nessuna query per client. Il ciclo si ferma con l'ultimo
  collegato e all'arresto del modulo.
- Aree: prefissi `pratica.* → pratiche`, `documento.* → documenti`, `bollettino.*` e `calcolo.* →
  bollettini`, `liquidazione.*`/`provvigioni.* → liquidazioni`, `fornitore.*`, `cliente.*`,
  `subagente.*`, `agente.*`, `eccezione.*`, `percentuale.*`, `interscambio.*`, `integra.* →
  anagrafiche`, `utente.*`/`auth.* → utenti`, `impostazione.* → impostazioni`; codici sconosciuti →
  nessuna area.
- **Oltre al brief**: anche `crud.*` (create/update/delete) è generico e prende l'area dalla colonna
  `entita`. Senza questo, creazioni e modifiche di pratiche, bollettini e anagrafiche non sarebbero
  mai notificate: nel registro sono `crud.create` con `entita = pratica|bollettino|…`, non
  `pratica.create`. La mappa delle entità comprende anche `scaglione` e `riga_bollettino`.
- `shortcut:` nel codice: un ciclo per processo; con più processi (o più istanze) servirà un canale
  condiviso (PostgreSQL `LISTEN/NOTIFY`).

## Frontend

- `EventiProvider` nel guscio `(app)/layout.tsx`: **un solo** `EventSource` per scheda, chiuso allo
  smontaggio (uscita compresa); il browser si riconnette da solo. Il provider espone
  `versione: Record<area, number>`; il battito e i messaggi non riconosciuti si ignorano.
- `Aggiornamenti`: barra con «Ci sono aggiornamenti» e il pulsante *Aggiorna*.
- **Pratiche**: all'evento dell'area un fetch in silenzio con i filtri correnti aggiorna subito
  `conteggi` e `totali`; se le righe cambiano, la risposta resta in attesa e compare la barra.
  *Aggiorna* applica la risposta mantenendo filtri, ordinamento, pagina e scorrimento (§7.12).
  I cambi fatti dall'utente (filtri, pagina) continuano a ricaricare subito e chiudono la barra.
- **Bollettini**: stesso schema su `conteggi` e matrice; il periodo e i filtri non si toccano.
- Le altre pagine non sono collegate in questa attività (vedi «Aperto»).

## Filtri standard (D-22): che cosa c'era già

- **Pratiche**: completo — segmenti con conteggi dal server (D-23), ricerca testuale, fornitore,
  cliente e subagente a **ricerca multipla**, riepilogo dei filtri e azzeramento a icona. Nessuna
  modifica.
- **Bollettini**: completo — periodo, fornitore a ricerca multipla, segmenti *Tutti* / *Con qualcosa
  da fare* con conteggi dal server, riepilogo (con il periodo) e azzeramento. Nessuna modifica.
- **Scheda *Pratiche* del cliente**: **mancavano i filtri**. Aggiunti: segmenti *Aperte · In ritardo
  · Fatturate · Tutte* (iniziale *Aperte*, come il prototipo) con i numeri calcolati sugli altri
  filtri, fornitore a ricerca multipla ristretto ai fornitori del cliente, ricerca per numero,
  riepilogo e azzeramento. Per il filtro fornitore l'API `GET /api/clienti/:id/pratiche` ora
  restituisce `fornitore_id` (una riga in `clienti.ts`).
  Restano fuori, e sono segnati nella spec: il segmento *Non pagate* (serve lo stato d'incasso per
  pratica, oggi calcolato nella pratica e nei solleciti) e il piede con le provvigioni del trimestre
  del prototipo.

## Prove

- `npx tsc --noEmit` backend e frontend: **puliti**; `npm run build` frontend ok.
- `npx jest test/eventi.spec.ts --runInBand`: **5/5**.
- Tutta la suite, una spec per processo: accesso 24, analisi 13, avvio 4, bollettini 12, bollettino
  19, clienti 16, documenti 29, documenti-pratica 15, eventi 5, fornitori 6, incassi 7, integra 20,
  liquidazioni 15, motore 16, percentuali 31, pratiche 13, registro 3, seed 7, subagenti 12,
  superutente 1, utenti 18, vincoli 33. **0 KO** (319 prove).
- `python strumenti/prove/app_eventi.py f6 <cartella> http://localhost:8101`: **15 controlli, 0 KO**,
  nessun errore JS. Due schede dello stesso utente: la B registra una fattura di prova su una
  pratica, la A (filtro *Attesa fattura*, 8 righe) entro pochi secondi mostra la barra, il contatore
  scende da 8 a 7, le righe restano; a 768 px nessuno scorrimento; *Aggiorna* toglie la riga e
  mantiene il filtro; la B annulla la fattura, la A la rivede tornare e il contatore torna a 8. La
  fattura viene tolta davvero (controllo finale via API).
- Rilanciate le pagine toccate: `app_pratiche.py` **0 KO** (una prima esecuzione aveva 1 KO di
  tempo, rilanciata pulita), `app_clienti.py` **33/33**, `app_bollettini.py` **22/22**.
  In `app_bollettini.py` ho portato da 400 a 700 ms l'attesa dopo aver scritto il fornitore nella
  finestra di caricamento: il passo del doppione falliva a intermittenza perché il campo di ricerca
  non aveva ancora selezionato la voce; non è un difetto dell'app (la finestra mostra correttamente
  «c'è già»), è la prova che correva troppo.
- Nota d'ambiente: per le prove browser il backend va avviato anche con `DOCUMENTI_DIR` (il
  caricamento PDF senza quella variabile risponde 500). Non è una modifica al `.env`: la variabile
  si passa solo al processo di prova, come fa `test/ambiente.ts`.
- Schermate guardate: `app-eventi-1440.png` (barra sopra la tabella, contatori aggiornati, righe
  ferme) e `app-eventi-768.png` (barra e filtri che vanno a capo, tabella che scorre dentro di sé,
  pagina senza scorrimento orizzontale).

## Controlli

- **`ponytail-review`**: nessun difetto da correggere. Rilievi: il ciclo è uno per processo (limite
  scritto con `shortcut:`); la barra si carica in due punti (Pratiche e Bollettini) con lo stesso
  schema semplice, niente astrazione condivisa che non serve ancora; il provider non viene montato
  fuori dal guscio (niente eventi da sloggati).
- **`owasp-security`**: la rotta SSE richiede solo `collegato` (nessun dato, solo nomi di aree) e
  non scrive nulla; niente input nuovo oltre a nessun parametro; il registro è letto con Prisma.
- `postgresql-code-review` non serve: nessuna query o migrazione nuova (una `SELECT max(id)` e una
  `findMany` con `id >`).

## Aperto

- **Pagine non collegate** agli aggiornamenti: Oggi, Documenti, Pratiche (dettaglio), Bollettino
  (dettaglio), Liquidazioni, Analisi, Fornitori, Subagenti, Clienti, Utenti. Il provider è pronto;
  il brief chiedeva Pratiche e Bollettini, le altre si collegano quando serviranno (in particolare
  i contatori della barra laterale sono di F5-A1).
- **Scheda *Pratiche* del cliente**: *Non pagate* e il piede delle provvigioni restano da fare (dati
  non disponibili in quella lettura).
- **Più processi backend**: serve un canale condiviso; oggi il ciclo è locale al processo e chi è
  collegato a un'altra istanza non riceverebbe gli eventi (in esercizio c'è un processo solo).
