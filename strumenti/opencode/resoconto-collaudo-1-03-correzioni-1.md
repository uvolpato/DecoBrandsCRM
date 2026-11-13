# Resoconto · Onda 1 · 1-03 correzioni 1 — C1 (servizio di lettura giù: niente consumo tentativi)

Esecutore: DeepSeek V4 pro · data 12/11/2026 · database di prova `decobrands_test_1_03c` (creato, migrato, usato, **cancellato**).

## Riepilogo per rilievo

### C1 (P2) — se il servizio di lettura è giù, ogni documento in coda consuma i tentativi — CORRETTO
- `app/backend/src/lettore.ts:16-28`: `LetturaFallita` porta ora un flag `servizio`, vero quando il guasto è del servizio e non del documento. Il costruttore lo ricava dallo `stato` (≥500 oppure 401/402/403/429) o lo accetta esplicito; i quattro `throw` con stato HTTP già passavano lo stato, ora il costruttore lo trasforma in `servizio`.
- `app/backend/src/lettore.ts:64-66`: helper `rete(e)` — TypeError (rete giù), AbortError e TimeoutError (timeout dell'`AbortSignal`) valgono «servizio non disponibile».
- `app/backend/src/lettore.ts:193-195`: il `catch` che oggi incapsula le eccezioni non-`LetturaFallita` passa `rete(e)` come `servizio`, così rete giù e timeout arrivano a `leggiDallaCoda` già marcati.
- `app/backend/src/lettura.ts:152-160`: il ramo già usato per 401/402/403/429 è riusato e generalizzato — `if (e instanceof LetturaFallita && e.servizio)` → `letturaNonRaggiungibile` (riga torna `in_coda` con `tentativi = max(0, tentativi-1)`, un'anomalia sola `lettura.non_raggiungibile` con chiave vuota); altrimenti `letturaFallita` (consuma il tentativo: risposta valida ma illeggibile, oppure 4xx sul file). Non è stato copiato alcun ramo nuovo: la distinzione 401/402/403/429 resta dentro `lettore.ts`, il resto è invariato.
- Il «ferma il giro» è già insito nel disegno: `esegui()` preleva un documento per giro (ogni 15 s). Con il servizio giù il documento più vecchio torna `in_coda` a tentativi 0 e viene riprelevato al giro successivo: la coda non avanza e nessun tentativo si brucia.
- `app/backend/test/lettura.spec.ts:210-236`: due prove — servizio che risponde 503 e servizio in timeout (fetch che lancia `TimeoutError`) — dopo tre giri `tentativi` resta 0, una sola anomalia `lettura.non_raggiungibile` aperta e nessuna `lettura.fallita`.

## Nota sui file ammessi

Il pacchetto elenca come ammessi solo `lettura.ts`, `lettura.spec.ts` e questo resoconto. C1 però richiede di marcare «servizio non disponibile» anche per rete giù e timeout, segnale che nasce in `lettore.ts` (dove il `catch` incapsula le eccezioni di rete); senza toccare `lettore.ts` non si distinguerebbe un guasto di rete da «risposta valida ma illeggibile». `app/backend/src/lettore.ts` è quindi stato modificato (solo per aggiungere `servizio` e `rete`). Lo segnalo al coordinatore per il file-ammessi dell'onda.

## Prove lanciate

| Prova | Esito |
|---|---|
| `npx prisma migrate deploy` su `decobrands_test_1_03c` | ok |
| `npx jest test/lettura.spec.ts test/documenti.spec.ts` | **61 passate, 0 KO** |
| `npx jest test/lettore.spec.ts test/coda.spec.ts test/documenti-lettura.spec.ts` | **35 passate, 0 KO** |
| `npx tsc --noEmit` backend | 0 errori nei miei file; **2 errori in `test/utenti.spec.ts`** (non mio, vedi «Cose aperte») |

I 2 errori di `tsc` sono in `test/utenti.spec.ts:162-163` (`password: Promise<string>` non assegnabile a `InputJsonValue`): file di un altro pacchetto dell'onda, non toccato da me. `lettura.ts`, `lettore.ts`, `lettura.spec.ts` compilano puliti.

Database `decobrands_test_1_03c` cancellato a fine lavoro.

## Controlli

Skill caricate davvero: `ponytail-review`, `caveman`. Codice non «sensibile» secondo la regola (nessun calcolo di provvigioni, nessuna migrazione/SQL nuovo, nessun dato di Integra, nessun permesso): controllo leggero rileggendo il diff. Le transazioni e i `SELECT … FOR UPDATE` di `letturaNonRaggiungibile` sono già esistenti e riusati, non modificati (V13).

Ponytail-review sul diff: nessun tag. `servizio` + `rete()` è il minimo per distinguere un guasto di rete da un errore del documento; nessuna astrazione o ramo duplicato. `net: 0`.

## Cose aperte (non mie)

1. `tsc --noEmit` globale non passa per colpa di `test/utenti.spec.ts:162-163` (errore TS2322, `password: Promise<string>` in un JSON). Da sistemare dal pacchetto che ha modificato `utenti.spec.ts` (1-23?) o dal coordinatore a fine onda.

## Da documentare (per il pacchetto documentazione dell'onda)

### §19 — registro delle decisioni
Nessun D-nn nuovo: C1 è un'estensione di A4-01 (già deciso), non una regola nuova.

### Riga *Perché* nella spec (§6.5)
Aggiornare la *Perché* di A4-01 già scritta:
«Perché (A4-01, C1): un errore del servizio di lettura — chiave scaduta o crediti finiti (401/402/403/429), rete irraggiungibile, timeout del collegamento o risposta 5xx — non è colpa del documento: i documenti restano in coda senza consumare i tentativi e si apre una sola anomalia `lettura.non_raggiungibile`. Il tentativo si consuma solo per un errore del documento: risposta valida ma illeggibile, oppure 4xx sul file.»

### Guida in linea (`app/frontend/lib/guida.ts`, pagina `documenti`)
- `sapere`, **modificare** la voce sul servizio di lettura: «Se il servizio di lettura non risponde (chiave scaduta, crediti finiti, rete giù o errore del servizio), i documenti restano in coda senza consumare i tentativi e si apre l'anomalia *Lettura non raggiungibile*.»

### Piano (`piano-lavoro-crm.md`, §12)
- Attività «Onda 1 correzioni — servizio di lettura giù (5xx, rete, timeout) non consuma i tentativi dei documenti in coda». **da approvare** (estensione di A4-01).

### README
Niente da cambiare: nessun comando, porta o variabile nuova.
