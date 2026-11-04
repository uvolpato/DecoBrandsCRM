# Controllo F4-A6 — Numeri che si aggiornano da soli

Data: 04/11/2026. Cambio: canale SSE `GET /api/eventi/flusso`, provider nel guscio, barra
*Ci sono aggiornamenti · Aggiorna* su Pratiche e Bollettini, filtri standard nella scheda *Pratiche*
del cliente. Lavoro dell'agente OpenCode, controllato nella sessione principale.

## Cosa fa la modifica

Il registro degli eventi (D-31) diventa la sorgente degli aggiornamenti: un ciclo unico ogni ~4 s
legge le righe nuove, ricava le aree toccate e le manda a tutte le schede collegate. Nell'app i
contatori si aggiornano subito, le righe e la matrice restano ferme e compare la barra che le
aggiorna quando l'utente vuole (D-23).

## Esito dei controlli

| Controllo | Esito |
|---|---|
| `owasp-security` | nessun rilievo |
| `ponytail-review` (correttezza + complessità) | due difetti corretti in sede di controllo, un limite documentato |
| `postgresql-code-review` | non applicabile: nessuna migrazione; due letture (`max(id)`, `id >`) |

### Correzioni fatte nel controllo (mie)

1. **`nuoveAree` senza limite** (`src/eventi.ts`): dopo una pausa il registro può essere cresciuto
   di molto e il giro si sarebbe portato dietro tutte le righe. Aggiunto `take: 1000`: il resto
   arriva al giro dopo, senza perdere aree.
2. **Giri sovrapposti** (`src/eventi.ts`): `setInterval` non aspetta; due giri potevano leggere le
   stesse righe e mandare lo stesso evento due volte. Aggiunto `inCorso`.
3. **Pratiche e Bollettini non guardavano i documenti** (`VistaPratiche.tsx`,
   `VistaBollettini.tsx`): una fattura o un ordine cambia stato e importi della pratica (e le celle
   *atteso* / *nessuna fattura* della matrice) senza un evento `pratica`/`bollettino`. Ora la
   versione osservata è la somma dell'area della pagina e di `documenti`.
4. **`stile.css` app e prototipo devono restare uguali**: la classe `.aggiornamenti` era solo nella
   copia dell'app. Portata anche in `prototipo-alternativo/assets/stile.css` (stesse righe, niente
   altro di diverso fra i due file).

### Sicurezza

- Il canale richiede `collegato`: senza sessione 401, con la password provvisoria 403. Non espone
  dati: solo nomi di aree (nessun id, nessun importo, nessun nome di cliente).
- Nessun parametro in ingresso; nessuna scrittura; il registro si legge con Prisma.
- `EventSource` è same-origin e passa dall'inoltro `/api` come le altre chiamate: cookie e sessione
  restano suoi, niente CORS.
- Il flusso si chiude con la scheda e all'uscita (il provider sta dentro il guscio, non fuori).

### Correttezza e complessità

- Nessun evento vecchio al primo collegamento (`max(id)`), un solo timer per processo con almeno un
  collegato, spento con l'ultimo e all'arresto del modulo; il battito tiene aperto il canale.
- `crud.*` e `stato.change_state` erano il buco vero: senza di loro creazioni e modifiche non
  sarebbero mai arrivate. L'area viene da `registro.entita` (colonna), non dal dettaglio JSON.
- Le pagine confrontano le righe con la risposta nuova: se sono uguali spariscono solo i contatori,
  altrimenti la risposta resta in attesa finché non si clicca. Cambiare filtro, ordinamento o pagina
  butta via l'attesa (la ricarica normale azzera `inAttesa`), quindi non si applicano mai righe di
  un'altra vista.
- Riuso: `api()`, `FilterBar`, `DataTable`, `Schede`, `Sagoma`, `useMemoria`; nessuna libreria
  nuova, nessun WebSocket, nessuna query per client.
- Limite dichiarato con `shortcut:`: il ciclo è per processo; con più istanze serve un canale
  condiviso (`LISTEN/NOTIFY`). In esercizio c'è un processo solo.

## Rilievi

**Da correggere: nessuno** (i tre difetti veri sono già corretti sopra).

1. *(should fix, copertura)* La prova browser `app_eventi.py` (15 controlli) è dell'agente: **non
   l'ho rilanciata** dopo le mie modifiche (osservare `documenti`, `take`, `inCorso`). Le modifiche
   non cambiano il flusso atteso, ma va rilanciata al prossimo giro con le altre prove browser.
2. *(should fix, copertura)* Altre pagine non sono collegate (Oggi, Documenti, dettagli,
   Liquidazioni, Analisi, anagrafiche, Utenti): scelta del brief, il provider è pronto. I contatori
   della barra laterale restano a F5-A1.
3. *(nota)* Con la sessione scaduta il browser ritenta l'EventSource ogni pochi secondi; il guscio
   porta all'accesso alla prima chiamata API e il provider si smonta, quindi il caso è breve. Se
   dà fastidio, chiudere la fonte al primo 401 esplicito.

## Prove

- `npx tsc --noEmit` backend e frontend: puliti (rilanciati da me).
- `test/eventi.spec.ts`: 5/5 (rilanciata da me); suite del backend una spec per processo:
  **319 prove, 0 KO** (bollettino, che Jest interrompe a volte su Windows, rilanciata: 19/19).
- `npm run build` del frontend: ok.
- `app_eventi.py` 15/0, `app_pratiche.py` 0 KO, `app_clienti.py` 33/33, `app_bollettini.py` 22/22
  (agente). Aggiunta in `app_bollettini.py`: attesa 400 → 700 ms dopo la scelta del fornitore, che
  falliva a intermittenza per la selezione non ancora avvenuta (prova, non app).
- Schermate 1440 e 768 guardate da me: la barra sta fra i filtri e la tabella, i contatori sono già
  nuovi mentre la tabella ha ancora la riga vecchia (è il comportamento voluto), a 768 la tabella
  scorre dentro di sé e la pagina no.

## Verdetto

**Ship.** Restano aperti il rilievo 1 (rilanciare `app_eventi.py` dopo le mie correzioni) e il
rilievo 2 (le altre pagine, quando avranno i loro contatori).

Non controllato: il comportamento con due processi backend (fuori dal perimetro, `shortcut:`), e la
resa della barra su una tabella già in scorrimento orizzontale.
