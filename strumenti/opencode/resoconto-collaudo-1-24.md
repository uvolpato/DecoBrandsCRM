# Resoconto collaudo · Onda 1 · Pacchetto 1-24 — matrice dei permessi

Data: 12/11/2026 · Esecutore: DeepSeek V4 Flash · Gravità: P3 · Rilievo: A1-09.

## Cosa ho fatto

### A1-09 — prova "matrice dei permessi" su tutte le rotte (BFLA)

Nuovo file `app/backend/test/permessi.spec.ts`. Usa `DiscoveryService` (`DiscoveryModule`) +
`MetadataScanner` e `Reflector` per leggere `PATH_METADATA`/`METHOD_METADATA` e il metadato
`permesso` di ogni handler dei controller di `AppModule`, dopo `mod.init()`. Nessuna richiesta
HTTP e nessun dato: si leggono solo i metadati.

Controlli (4 prove):

1. ogni rotta dichiara un permesso o è `pubblica` (elenco non vuoto, così la matrice non passa
   a vuoto se un giorno la discovery non trova controller);
2. ogni rotta non `GET` non usa `*.consulta` né `*.esporta`;
3. ogni rotta non `GET` con `collegato` sta nell'elenco chiuso `accesso/esci`,
   `accesso/password`, `accesso/profilo`;
4. le rotte `pubblica` sono esattamente `salute`, `accesso/entra`, `accesso/dimenticata`,
   `accesso/reimposta`.

Nessun controller corretto: le rotte attuali rispettano già la matrice. Nessuna rotta nuova
scritta con un permesso di sola lettura trovata.

Nota: i file `src/accesso.ts` e `test/utenti.spec.ts` risultano modificati da altri pacchetti
dell'onda in parallelo; non li ho toccati (sono fra i vietati). Il primo `npx tsc --noEmit` ha
segnalato `test/utenti.spec.ts(146,65): Expected 1 arguments, but got 0` (modifica in corso di
un altro pacchetto); al giro successivo, a lavoro finito, è passato senza errori.

## Prove lanciate

- `npx jest test/permessi.spec.ts` con `DATABASE_URL_TEST` su `decobrands_test_1_24` (creato,
  `prisma migrate deploy`, poi cancellato): **4/4 passati, 0 KO**.
- `npx tsc --noEmit` in `app/backend`: **0 errori** (vedi nota sopra sul primo giro).
- `git status --short`: fra i file non tracciati ci sono `app/backend/test/permessi.spec.ts` e
  questo resoconto; le altre modifiche presenti sono dei pacchetti paralleli, non mie.
- Database `decobrands_test_1_24` cancellato a fine prova.

## Prove nel browser da lanciare a fine onda

Nessuna: non ho toccato frontend né prove Playwright, quindi non c'è nulla da aggiornare con
`py_compile`. Le prove dell'onda vanno lanciate come previsto dal coordinatore.

## Da documentare

Nulla. La prova non introduce regole nuove: rende verificabili D-38 e D-45 (permesso dichiarato,
matrice lettura/scrittura, elenco chiuso delle rotte pubbliche). Nessuna riga D-nn, nessun
*Perché*, nessuna voce di guida, nessuna attività o ora di piano da aggiungere.

---
