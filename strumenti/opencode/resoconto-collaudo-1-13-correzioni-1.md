# Resoconto pacchetto 1-13 correzioni 1 — 4xx di validazione solo per utenti entrati e come rifiuto, non errore

Data: 12/11/2026 · Esecutore: DeepSeek V4 pro · Gravità: P2 · Rilievi: C1, C2

## Cosa ho fatto

### C1 — i 400 di validazione non sono più errori di sistema e non si scrivono senza accesso

`app/backend/src/errori.filter.ts`:

- il ramo 400/422 ora si registra **solo se `req.utente` è presente** (utente entrato), con
  `contesto(req)` (utente e IP) al posto del contesto vuoto: un POST sbagliato senza sessione non
  scrive più nulla nel registro;
- l'esito passa da `errore` a **`negato`** (rifiuto): in `logEvent` `negato` → livello `attenzione`,
  quindi non conta più fra gli «errori di oggi» (§15.6, `erroriOggi` conta `livello='errore'`) né
  nel segmento *errori* del registro;
- `erroreValidazione()` è diventata `campoValidazione()`: torna solo il nome del campo (prima parola
  del messaggio del ValidationPipe). Il testo dell'eccezione non si usa più: a volte contiene il
  valore inviato (`Area sconosciuta: xyz`, `Campo sconosciuto: <k>`). Il messaggio nel dettaglio è
  sempre generico `valore non valido`.

### C2 — `erroreAlPosto` non salta più lo schema di un evento riuscito

`app/backend/src/registro.ts`: `controlla()` ora riceve anche l'esito. La scorciatoia «il campo
`errore` prende il posto delle chiavi del successo» vale solo per un esito **non riuscito**
(`errore` o `negato`), mai per `successo`: un evento riuscito con `errore` nel dettaglio resta
soggetto allo schema e viene rifiutato se mancano le chiavi obbligatorie.

## Prove lanciate (database `decobrands_test_1_13c`, cancellato alla fine)

| Prova | Esito |
|---|---|
| `npx tsc --noEmit` (backend) | 0 errori nei file miei; restano 2 errori in `test/motore.spec.ts` (313–314), file di un altro pacchetto dell'onda, non toccato |
| `npx prisma migrate deploy` su `decobrands_test_1_13c` | tutte le migrazioni applicate |
| `npx jest test/registro.spec.ts test/registro-api.spec.ts test/sistema.spec.ts` | **3 suite, 42 prove, 0 KO** |

Le nuove prove verificano: 400 senza accesso → nessuna riga (C1); 400 da utente entrato → riga con
utente, livello `attenzione`, campo `giorno_bollettino` e messaggio generico, senza il valore (C1);
il valore inviato non finisce nel dettaglio (C1, D-85, via `PUT /api/accesso/profilo` con
`Area sconosciuta`); evento riuscito con `errore` rifiutato dallo schema (C2).

Database `decobrands_test_1_13c` creato, migrato, usato e **cancellato** alla fine. Mai toccati
`decobrands_db`, `decobrands_test` condiviso, né Integra (192.168.239.49).

## Da documentare (per il pacchetto documentazione)

**Cambia una regola** (§15.2.7, riga "Errore di validazione 4xx"):

- l'`esito` passa da `errore` a **`negato`** (rifiuto): il rifiuto di validazione non è un errore del
  sistema e non deve contare fra gli «errori di oggi»;
- il `dettaglio` diventa `{etichetta, errore: {campo, messaggio}}` con `messaggio` **sempre**
  `valore non valido` e `campo` = nome del campo del ValidationPipe (mai il testo dell'eccezione,
  che può contenere il valore inviato, D-85);
- si registra **solo** la richiesta di un utente entrato, con `contesto(req)` (utente e IP).

Testo pronto per la riga *Perché* di §15.2.7: «Il rifiuto di validazione 4xx si registra solo per un
utente entrato, con l'esito `negato` (livello attenzione, fuori dagli errori di oggi) e nel dettaglio
solo il nome del campo e il messaggio generico `valore non valido`, mai il testo dell'eccezione
(D-85, C1).»

§15.4: la scorciatoia «`errore` al posto delle chiavi del successo» vale per un esito non riuscito
(`errore` o `negato`), mai per `successo` (C2). Nessuna riga nuova nello schema `SCHEMI`.

**Guida, piano, README**: nessun testo nuovo per l'utente; nessuna ora nuova (rilievi già tracciati).

## Cose aperte

1. **`tsc --noEmit` non passa nel backend** a causa di `test/motore.spec.ts` (313–314), file fuori
   dai miei ammessi: l'errore nasce da un altro pacchetto dell'onda (tipi del motore/seed cambiati).
   Lo segnalo; non l'ho toccato.
2. La voce *Esito* del registro mostra `negato` come testo crudo (come già per `access_denied`):
   nessun intervento frontend richiesto, ma se si vuole un'etichetta italiana più parlante serve un
   pacchetto frontend.
