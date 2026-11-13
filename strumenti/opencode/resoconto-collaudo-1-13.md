# Resoconto pacchetto 1-13 — Registro: 4xx registrati, dettaglio non valido in anomalia, anomalia atomica, filtri per giorno

Data: 08/11/2026 · Esecutore: DeepSeek V4 · Gravità: P2 · Rilievi: A8-02, A8-03, A3-09, A3-12

## Cosa ho fatto

Tutte le correzioni stanno in `registro.ts`, `errori.filter.ts`, `registro-api.ts` e nelle due prove. Nessun calcolo del seed cambia.

### A8-02 — gli errori di validazione 4xx arrivano al registro

`app/backend/src/errori.filter.ts`:

- tolto il commento `ponytail:`;
- nel ramo `HttpException`, per lo stato 400/422 (esclusi 401/403/404/429) si scrive un evento con
  `logEventSicuro` **prima** di rispondere: `tipo='crud'`, `azione` dal metodo (`POST`→`create`,
  `PUT|PATCH`→`update`, `DELETE`→`delete`; gli altri metodi, es. le GET, non scrivono nulla),
  `entita` = primo segmento di `req.path` dopo `/api/` (es. `/api/fornitori/123` → `fornitori`),
  `esito='errore'`, `dettaglio = {etichetta, errore: {campo, messaggio}}`;
- `erroreValidazione()` estrae il primo messaggio del ValidationPipe: se `message` è un elenco
  (class-validator) il nome del campo è la prima parola, altrimenti (BadRequestException manuale,
  `message` stringa) resta solo `messaggio`. Mai i valori inviati dall'utente (D-85).

In `registro.ts`, `controlla()` riconosce il caso: un dettaglio con la chiave `errore` è l'esito
`errore` dell'operazione (§15.2.7) e sostituisce le chiavi del successo (per `crud.update` non si
pretendono più `prima`/`dopo`). Così l'evento 4xx passa il controllo dello schema (D-31) e non
scatena un 500 dentro il filtro.

### A8-03 — in esercizio il dettaglio non valido apre l'anomalia

`app/backend/src/registro.ts`:

- `controlla()` ora **restituisce** la stringa dell'errore (o `undefined`) invece di loggarla;
- `logEvent()`, in `NODE_ENV === 'test'`, lancia come prima; in esercizio scrive comunque la riga
  (§15.4) e poi apre `app.dettaglio_non_valido` (servizio `app`, `chiave` = codice che ha sbagliato)
  nella stessa transazione (V13);
- tolto il commento `ponytail:`.

**Nota**: non ho fatto validare il dettaglio anche ad `apriAnomalia()` (la spec §15.4 lo chiede,
ma attivarlo romperebbe `test/documenti-lettura.spec.ts`, file vietato, che apre `lettura.fallita`
senza `dettaglio`). Lo segnalo come cosa aperta: va fatto con un pacchetto che tocca anche quel file.

### A3-09 — `apriAnomalia` atomica

`app/backend/src/registro.ts`: `findFirst`+`create`/`update` sostituiti da un solo
`INSERT … ON CONFLICT ((COALESCE(servizio,'')), codice, (COALESCE(chiave,''))) WHERE genere='anomalia'
AND stato='aperta' DO UPDATE SET volte = registro.volte + 1, ultimo/messaggio/dettaglio = EXCLUDED…`
con `db.$executeRaw` parametrico. Due aperture insieme diventano una riga con `volte = 2`.

### A3-12 — filtri per giorno sul registro che usano l'indice su `ts`

`app/backend/src/registro-api.ts`: i filtri `dal`/`al` e il contatore `erroriOggi` non applicano più
`AT TIME ZONE` alla colonna ma confrontano `r.ts` con i confini del giorno di Roma calcolati una
volta: `r.ts >= (${dal}::date::timestamp AT TIME ZONE 'Europe/Rome')` e
`r.ts < ((${al}::date + 1)::timestamp AT TIME ZONE 'Europe/Rome')` (stessa forma in `erroriOggi`).
Risultati identici, ma l'indice `registro_ts_idx` ora serve.

## Prove lanciate (database `decobrands_test_1_13`, cancellato alla fine)

| Prova | Esito |
|---|---|
| `npx tsc --noEmit` (backend) | 0 errori |
| `npx prisma migrate deploy` sul database di prova | tutte le migrazioni applicate |
| `npx jest test/registro.spec.ts test/registro-api.spec.ts test/sistema.spec.ts test/casella.spec.ts` | **4 suite, 51 prove, 0 KO** |
| `git status --short` / `git diff --name-only` | toccati solo i file ammessi (`errori.filter.ts`, `registro.ts`, `registro-api.ts`, `test/registro.spec.ts`, `test/registro-api.spec.ts`); gli altri file modificati sono dei pacchetti dell'onda in parallelo |

Database `decobrands_test_1_13` creato, migrato, usato e **cancellato** alla fine. Mai toccati
`decobrands_db`, `decobrands_test` condiviso, né Integra (192.168.239.49).

## Prove nel browser da lanciare a fine onda

`strumenti/prove/app_registro.py` (la pagina Registro: filtri per giorno). Non va aggiornata: le
correzioni sono solo backend e a comportamento equivalente. La lancia il controllo di fine onda.

## Da documentare (per il pacchetto documentazione)

**Nessuna decisione nuova (D-nn)**: le correzioni allineano il codice a decisioni già esistenti
(§15.2.7, §15.4, D-31) e non le cambiano.

**Riga *Perché* in §15.2.7 (errori di sistema)**: «L'errore di validazione 4xx si registra con il
tipo dell'operazione tentata e l'`entita` = primo segmento del percorso (es. `fornitori`), con solo
campo e messaggio del primo errore del ValidationPipe, mai i valori inviati (D-85, A8-02).»

**Guida (`app/frontend/lib/guida.ts`)**: nessun testo nuovo per l'utente.

**Piano (`piano-lavoro-crm.md`)**: rilievi già nel `piano-correzioni` (A8-02, A8-03, A3-09, A3-12);
nessuna ora nuova.

**README**: nulla (solo backend).

## Cose aperte

1. **`apriAnomalia()` non valida ancora il suo `dettaglio`** (spec §15.4): attivarlo romperebbe
   `test/documenti-lettura.spec.ts` (apre `lettura.fallita` senza `dettaglio`). Serve un pacchetto
   che corregga anche quella prova.
2. **Data di JS salvata 2 ore indietro in estate**: con l'adapter `@prisma/adapter-pg` (PrismaPg),
   `new Date('2026-09-05T21:30:00Z')` viene salvato come 19:30 UTC (2 ore prima, offset di
   Europe/Berlin del server). È un comportamento preesistente dell'adapter, fuori da questo
   pacchetto; non tocca i filtri per giorno (che confrontano gli istanti assoluti) ma merita un
   controllo a parte. Nella prova A3-12 ho quindi inserito i due orari di confine con SQL esplicito
   (`'2026-09-05 23:30:00'::timestamp AT TIME ZONE 'Europe/Rome'`), non con `new Date(...)`.
