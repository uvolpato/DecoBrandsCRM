# Resoconto · Collaudo onda 1 · Pacchetto 1-14 — Segreti d'esempio rifiutati in esercizio

Data: 12/11/2026 · Esecutore: DeepSeek V4 Flash · Rilievo: A1-06 · Esito: **corretto**

## Cosa ho fatto

### A1-06 — I segreti d'esempio `CAMBIARE` passano anche in esercizio

Il rilievo era ancora aperto nel codice attuale (`controllaAmbiente` guardava solo `NODE_ENV`).

- `app/backend/src/main.ts:53-67` — `controllaAmbiente()` ora, quando `NODE_ENV === 'production'`,
  controlla `SESSION_SECRET` e `SEGRETI_CHIAVE`: ferma l'avvio se il valore manca, vale `CAMBIARE`
  o è lungo meno di 32 caratteri. Il messaggio dice il nome della variabile e rimanda a
  `openssl rand -base64 48`. Commento breve con il rimando `D-65`. In sviluppo e in prova i
  valori d'esempio continuano a passare (si parte copiando il file). Fail-closed all'avvio:
  `avvia()` chiama `controllaAmbiente()` prima di `NestFactory.create`, quindi nessun servizio
  parte con la chiave pubblica del repository.
- `app/backend/test/avvio.spec.ts:69-88` — nuovo `it("in esercizio i segreti d'esempio o troppo
  corti fermano l'avvio")`: valori buoni passano; `CAMBIARE` su `SESSION_SECRET` e su
  `SEGRETI_CHIAVE` lancia; valore corto lancia; valore assente lancia; in sviluppo `CAMBIARE`
  passa. Aggiornata la riga 73 del test esistente (`NODE_ENV: 'production'` ora vuole anche i
  due segreti validi), altrimenti il test vecchio falliva per il comportamento nuovo.

### Note sui file

- `app/backend/src/segreto.ts` **non l'ho toccato**: non è fra i file ammessi. La sua `chiave()`
  continua a fermarsi solo quando `SEGRETI_CHIAVE` manca; in esercizio il controllo d'avvio in
  `main.ts` copre anche il caso `CAMBIARE`/corto, quindi l'app non parte proprio. Se in futuro
  serve un controllo anche a runtime (cambio del `.env` a processo acceso), va fatto lì: è una
  scelta diversa, non richiesta da questo pacchetto.
- `app/backend/.env.example` **non l'ho toccato**: non è fra i file ammessi; i valori `CAMBIARE`
  restano come segnaposto (corretto: devono esserci, è l'avvio a rifiutarli in esercizio).

## Prove lanciate (database `decobrands_test_1_14`, creato e cancellato)

- `npx jest test/avvio.spec.ts` → **6/6 passati, 0 KO**.
- `npx tsc --noEmit` (backend) → **0 errori**.
- Database `decobrands_test_1_14` creato, `prisma migrate deploy` applicato, poi **DROP**:
  fatto. Nessun contatto con `decobrands_db`, con `decobrands_test` condiviso né con Integra.
- `git status --short` / `git diff`: fra i miei file solo `app/backend/src/main.ts` e
  `app/backend/test/avvio.spec.ts` (più questo resoconto). Gli altri file modificati nel
  repository sono di altri pacchetti o lavoro precedente.

### Prove nel browser

Nessuna prova `app_*.py` tocca questo rilievo (avvio del backend, non interfaccia). Non ne ho
lanciate e non ne ho modificate. Niente da lanciare a fine onda per 1-14.

## Rilievi aperti / cose da sapere

- Nessun rilievo aperto. Nessuna correzione va contro il §19: il controllo rafforza D-65 (chiave
  dei segreti) e D-84 (ambiente esplicito all'avvio).

## Da documentare

### §19 — riga nuova (prossimo numero libero: **D-144**, se libero)

> | D-144 | 12/11/2026 | **In esercizio il backend rifiuta i segreti d'esempio.** `controllaAmbiente()` ferma l'avvio, con `NODE_ENV=production`, se `SESSION_SECRET` o `SEGRETI_CHIAVE` mancano, valgono `CAMBIARE` o sono lunghi meno di 32 caratteri; il messaggio manda a `openssl rand -base64 48`. In sviluppo e in prova i valori del `.env.example` passano. | La chiave d'esempio è scritta nel repository pubblico: con un backup del database chiunque decifra i segreti delle Impostazioni (casella, posta, Integra, LlamaCloud) e firma i cookie di sessione. Meglio fermarsi all'avvio che partire insicuri: è lo stesso principio di D-84, applicato ai segreti. | Ugo (collaudo A1-06) | §3.4, `src/main.ts`, `test/avvio.spec.ts` |

### §3.4 — riga *Perché* (estendere il punto «Ambiente esplicito», dopo `specifica` riga 203-207)

> - **Segreti veri in esercizio**: con `NODE_ENV=production` il backend **non parte** se
>   `SESSION_SECRET` o `SEGRETI_CHIAVE` mancano, valgono `CAMBIARE` o sono lunghi meno di 32
>   caratteri (il messaggio manda a `openssl rand -base64 48`). *Perché* (collaudo A1-06): la
>   chiave d'esempio sta nel repository pubblico; chi ha un backup del database decifrerebbe i
>   segreti delle Impostazioni. In sviluppo e in prova i valori del `.env.example` passano.

### Guida (`app/frontend/lib/guida.ts`, argomento *Impostazioni*, elenco `sapere`, dopo la riga 707)

> «In esercizio l'app non parte con i valori d'esempio del file (per esempio `CAMBIARE`) o con
> una chiave più corta di 32 caratteri: genera una stringa nuova con `openssl rand -base64 48`
> e riavvia il backend.»

### README (`app/README.md`, sezione esercizio, intorno alla riga 100-102)

> «`SESSION_SECRET` e `SEGRETI_CHIAVE` devono essere stringhe nuove di almeno 32 caratteri
> (`openssl rand -base64 48`): con i valori d'esempio del `.env.example` (`CAMBIARE`) o più
> corti, con `NODE_ENV=production` il backend non parte.»

Stessa frase da riportare in `app/NOTA-RILASCIO.md:24-25` (punto 2 dell'installazione).

### Piano (`piano-lavoro-crm.md`)

Attività di collaudo, correzione di una riga più la prova: **0,5 ore, da approvare**, dentro il
pacchetto 1-14 dell'onda 1.

### Versione della spec

Alzare la versione a 8.79 con in testa: «**Onda 1 del collaudo (D-144):** in esercizio il backend
rifiuta `SESSION_SECRET`/`SEGRETI_CHIAVE` d'esempio o più corti di 32 caratteri (A1-06).»
