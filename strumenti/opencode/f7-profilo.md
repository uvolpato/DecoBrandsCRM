# F7-A3 — Il mio profilo, pagina di ingresso per area e timeout di inattività

Data: 07/11/2026. Modello: **Opus** (`deepseek/deepseek-v4-pro`) — tocca sessioni, permessi e una migrazione.
Origine: prototipo `prototipo-alternativo/` (`#/profilo`, commit `59621cd`, `ba5f6c7`) e `idee.md`.

## Obiettivo

1. **Pagina `/profilo`** come nel prototipo: dati dell'utente in sola lettura, aree con il livello,
   pagina di ingresso per area, sicurezza.
2. **Pagina di ingresso per area**: ogni utente sceglie, per Provvigioni, Dati e Gestione, la pagina
   che si apre scegliendo quell'area nel menu dell'utente; vale anche dopo l'accesso.
3. **Timeout di inattività** della sessione: dopo N minuti senza richieste dell'utente si torna
   all'accesso. N configurabile, default 30.

## Decisioni (da rispettare, non reinterpretare)

- La scelta della pagina di ingresso è **del singolo utente** (come nel prototipo).
- Si salvano **percorsi interni** fra un elenco chiuso per area; il **server** valida percorso e
  permesso, non si fida del browser (V12). Un percorso non più permesso si ignora (si torna alla
  prima pagina dell'area).
- Il timeout è **di inattività**, vale anche con *Resta collegato* (che resta 30 giorni come durata
  massima). La connessione SSE degli aggiornamenti **non** conta come attività: una scheda aperta da
  sola non deve tenere viva la sessione.
- Ordine di atterraggio dopo l'accesso: parametro `dopo` se c'è, altrimenti la pagina di ingresso
  della prima area che l'utente può aprire (Provvigioni → Dati → Gestione), altrimenti `/`.

## Schema e migrazione

- `utenti.ingressi Json?` (default `{}`), migrazione nuova (`prisma migrate dev --name ingressi_utente`).
- Il valore è un oggetto `{ provvigioni?: string, dati?: string, gestione?: string }`.

## Pagine ammesse (elenco chiuso, uguale al menu)

| Area | Percorsi |
|---|---|
| provvigioni | `/`, `/documenti`, `/pratiche`, `/scartati`*, `/bollettini`, `/liquidazioni`, `/analisi` |
| dati | `/fornitori`, `/subagenti`, `/clienti` |
| gestione | `/utenti`*, `/sistema`*, `/registro`*, `/impostazioni`*, `/componenti`* (solo superutente) |

`*` richiede il permesso della voce (vedi `AREE_MENU` in `app/frontend/componenti/Barra.tsx` e
`PERMESSI` in `app/backend/src/accesso.ts`).

## API

- `GET /api/accesso/io`: aggiunge `ingressi`, con **solo** le voci ammesse per l'utente adesso
  (ricalcolate a ogni richiesta).
- `PUT /api/accesso/profilo` — `{ ingressi: { provvigioni?: string | null, dati?: string | null, gestione?: string | null } }`,
  `@Richiede('collegato')` (chi ha la password provvisoria non ci arriva: D-39), 400 per area o
  percorso non ammessi, una transazione (V13), evento `crud.update` su `entita: 'utente'`,
  `entita_id` = sé, `dettaglio` con `etichetta` e `dopo.ingressi` (verifica `SCHEMI` in
  `src/registro.ts`: chiavi obbligatorie). `null` toglie la scelta.
- Timeout: in `AccessoGuard` (`src/accesso.ts`), dopo aver letto l'utente, si confronta
  `req.session.ultimo` con l'ora corrente; se superato il limite si distrugge la sessione e si
  risponde **401** con `{ message: 'Sessione scaduta per inattività: entra di nuovo' }`; altrimenti
  si aggiorna `ultimo`. Eccezione: `GET /api/eventi/flusso` (SSE) non aggiorna `ultimo`.
- `io` restituisce anche `timeout_minuti` (per un eventuale avviso) — facoltativo, solo se costa una riga.

## Pagina e guscio (frontend)

- `/profilo` con `Pagina`, `Pannello`, `Dettagli`, `Campo`, `Pulsante` (stessi componenti del
  prototipo): colonna sinistra *I tuoi dati* e *Aree che puoi aprire*; destra *Pagina di ingresso
  per area* (un menu per area con le sole pagine permesse) e *Sicurezza* (link *Cambia la password*,
  nota sulle sessioni). 1440 e 768 px, senza scorrimento orizzontale.
- Menu dell'utente in `Barra.tsx`: voce **Il mio profilo** prima di *Cambia la password*.
- Clic sull'area nel menu dell'utente: `ingressi[area]` se presente e permesso, altrimenti la prima
  pagina dell'area come oggi.
- Accesso: dopo il login, pagina di ingresso come da decisione sopra.
- 401 da `lib/api.ts`: portare a `/accesso?dopo=<percorso attuale>` (se non c'è già).
- **Non toccare** `app/frontend/lib/guida.ts` (la guida la scrive il lead).

## Documentazione

**Non toccare** `specifica-crm-provvigioni.md`, `piano-lavoro-crm.md`, `avanzamento-app.md`,
`prototipo-alternativo/**`, `.env`: li aggiorna il lead. Aggiorna invece
`app/backend/.env.example` con `SESSION_TIMEOUT_MINUTI=30` e `app/README.md` se serve.

## Prove

- Server (`app/backend`, database `decobrands_test`): `test/profilo.spec.ts` nuovo — `io` con
  `ingressi`, `PUT` valido, area sconosciuta 400, percorso di un'altra area 400, percorso non
  permesso 400, `null` toglie, evento nel registro, sola lettura senza permessi non può atterrare su
  `/scartati`. Timeout: funzione pura (`scaduta(ultimo, ora, minuti)`) + una prova d'integrazione con
  `SESSION_TIMEOUT_MINUTI` piccolo e `ultimo` spostato indietro; SSE non rinnova. `npm test` 0 KO.
- Browser: `strumenti/prove/app_profilo.py` sull'app vera (backend 8002, frontend 8001): accesso,
  pagina, salvataggio, l'area apre la pagina scelta, 768 px, nessun errore JS. Funziona anche il
  timeout: con `SESSION_TIMEOUT_MINUTI` basso, dopo l'attesa una richiesta porta all'accesso.
- `npx tsc --noEmit` pulito (backend sorgente e frontend), `git diff --check` pulito.

## Regole del progetto

- Tutto sul backend, mai dai dati del frontend (V12); una operazione, una transazione (V13).
- Italiano semplice; commenti brevi con il rimando alla decisione (`// D-88 §19`, `// D-89 §19`).
- Codice minimo: niente astrazioni o opzioni non richieste; riusa i componenti esistenti.
- Prove solo su `decobrands_test`, mai su `decobrands_db`; nessun reset distruttivo.
- Nessun commit, nessun push, niente modifiche a `.env`.

## Resoconto finale

File toccati, decisioni prese al posto del lead (se una regola non era applicabile), prove aggiunte
con l'esito, totale `npm test`, cosa non hai potuto provare.
