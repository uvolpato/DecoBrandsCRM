# Resoconto · Collaudo 1-05 — Sessione: timeout di inattività vero, durata massima, area sconosciuta

Data: 08/11/2026 · Esecutore: DeepSeek V4 · Onda 1 · Pacchetto 1-05 (P1) · Rilievi: A1-02, A1-03, A1-07

## Cosa ho fatto per ogni rilievo

### A1-02 — il timeout di inattività (D-89) non scatta mai sulle pagine che si aggiornano da sole
- `app/backend/src/accesso.ts` (guard, ~riga 194): il rinnovo di `ultimo` ora esclude anche le
  richieste con intestazione `x-automatico: 1`, oltre alla SSE:
  `if (req.get('x-automatico') !== '1' && !(req.method === 'GET' && req.path === '/api/eventi/flusso')) req.session.ultimo = ora;`.
  La rotta `GET /api/eventi/flusso` resta esclusa (correlato A5-12): condizione invariata.
- `app/frontend/lib/api.ts`: nuova opzione `opzioni?: { automatico?: boolean }` sulla `api()`;
  quando è `true` manda `x-automatico: 1` (solo letture; il client può solo accorciarsi la propria sessione).
- Viste: passano `{ automatico: true }` solo le chiamate che il browser fa da sé:
  - `sistema/VistaSistema.tsx`: il polling dei 30 s (via un `poll` ref, così il ricaricamento
    da azioni dell'utente resta attività); le riletture su clic/azione non cambiano.
  - `oggi/VistaOggi.tsx`, `documenti/VistaDocumenti.tsx`, `pratiche/VistaPratiche.tsx`,
    `bollettini/VistaBollettini.tsx`: solo la rilettura su evento SSE.
  - `sistema/contatore` e `oggi/conteggi` (Barra.tsx) si rileggono solo al cambio pagina
    (navigazione dell'utente), non su evento: **non** sono marcate automatiche, come da nota del pacchetto.

### A1-03 — *Resta collegato* senza durata massima (30 giorni che ripartono)
- `app/backend/src/accesso.ts`: `creata?: number` aggiunta a `SessionData`; `apriSessione` salva
  `req.session.creata = Date.now()`. Nel guard, dopo il controllo di inattività:
  `if (req.session.creata && ora - req.session.creata > TRENTA_GIORNI) { destroy; throw 401 'Sessione scaduta: entra di nuovo' }`.
  Le sessioni senza `creata` (aperte prima della correzione) si chiudono una volta. `main.ts`
  (`rolling: true`) non si tocca: è vietato e la durata massima ora è garantita dal guard.

### A1-07 — `PUT /api/accesso/profilo` con area `constructor`/`__proto__` dà 500
- `app/backend/src/accesso.ts` (~riga 289): `const pagine = Object.hasOwn(PAGINE, area) ? PAGINE[area] : undefined;`.
- **Nota (rilievo del report impreciso):** il 500 descritto **non è riproducibile** attraverso il
  DTO reale: la `ValidationPipe` con `transform: true` usa `class-transformer` `plainToInstance`, che
  scarta da `ingressi` sia `constructor`/`__proto__` sia tutti i metodi di `Object.prototype`
  (`hasOwnProperty`, `toString`, …) — vedi `node_modules/class-transformer/cjs/TransformOperationExecutor.js`
  righe 155 e 271. La chiave non arriva quindi mai a `Object.entries(b.ingressi)`. La correzione
  `Object.hasOwn` resta comunque come **difesa in profondità** (copre un eventuale futuro cambio del
  pipe o del DTO). La prova pertanto non può pretendere il 400 del pacchetto: verifica il requisito
  di sicurezza vero, cioè che la richiesta non scoppi mai in un 500.

## Prove lanciate (database `decobrands_test_1_05`, cancellato alla fine)

- `cd app/backend && npx jest test/profilo.spec.ts test/accesso.spec.ts test/eventi.spec.ts` → **46 passati, 0 KO**.
  Aggiunte 4 prove in `profilo.spec.ts`:
  - richiesta automatica (`x-automatico:1`) non rinnova `ultimo`; senza intestazione sì (A1-02);
  - richiesta automatica oltre il timeout → 401 (A1-02);
  - sessione con `creata` di 31 giorni → 401 «Sessione scaduta: entra di nuovo» (A1-03);
  - `PUT profilo` con area dal prototipo → status < 500 (A1-07).
- `cd app/backend && npx tsc --noEmit` → 0 errori.
- `cd app/frontend && npx tsc --noEmit` → 0 errori.
- `python -m py_compile strumenti/prove/app_profilo.py strumenti/prove/app_oggi.py strumenti/prove/app_eventi.py` → OK.
- `git status --short` / `git diff --name-only`: nessun file mio fuori dagli ammessi (gli altri file
  modificati sono dei pacchetti della stessa onda, in parallelo).
- Database `decobrands_test_1_05` cancellato (`DROP DATABASE`).

## Prove nel browser da lanciare a fine onda

`app_profilo.py`, `app_oggi.py`, `app_eventi.py`. **Nessuna modifica richiesta**: il comportamento
visibile delle pagine non cambia (le riletture su SSE e il polling restano, cambia solo l'intestazione).
`app_profilo.py` verifica già il timeout con `SESSION_TIMEOUT_MINUTI` basso, che ora scatta in modo
più corretto.

## Da documentare

Nessuna decisione nuova né regola cambiata: A1-02 e A1-03 allineano il codice alla decisione
**D-89** già esistente (timeout di inattività + «30 giorni di durata massima»), A1-07 è difesa in
profondità. Non servono nuove righe D-nn nel §19, né modifiche a guida (`lib/guida.ts`), piano o README.

Solo chiarimento *Perché* da aggiungere alla sezione della spec che descrive **D-89** (testo pronto):

> *Perché* — Le richieste che il browser fa da sé (polling di *Stato del sistema*, riletture su evento
> SSE, intestazione `x-automatico`) non contano come attività della persona, altrimenti una scheda
> aperta in un ufficio attivo non farebbe mai scadere la sessione; e i 30 giorni di *Resta collegato*
> sono un tetto massimo dall'accesso, non un rinnovo continuo. Così un cookie rubato non vive oltre
> 30 giorni e una postazione lasciata aperta si scollega da sola.
