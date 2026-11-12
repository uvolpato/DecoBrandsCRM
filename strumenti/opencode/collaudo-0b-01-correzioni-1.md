# Collaudo · Onda 0 bis · 0b-01 — correzioni 1 (dalla review di Claude Code, 12/11/2026)

**Esecutore: DeepSeek V4** · Gravità: **P1** · Codice sensibile (Integra, V12, V13). Prima di cominciare rileggi:
- `collaudo-0b-01-import-integra-documento.md` (regole e decisioni D-133…);
- il tuo `resoconto-collaudo-0b-01.md`.

Regole di lavoro: `regole-onda-parallela.md`, con il database `decobrands_test_0b_01c`.

## Rilievi

### C1 — P1 · V12: con zero righe dalla ricerca il documento si collega a qualsiasi fornitore
- **Dove**: `app/backend/src/anagrafica-integra.ts` ~152-165, cioè `importa`, ramo `documentoId`.
- **Scenario**:
  1. Il nome letto è «Gries Deco», che in Integra non trova nulla, oppure trova solo codici già importati (`cerca` li toglie).
  2. Arriva `POST integra/importa {tipo:'fornitore', id_integra:<un altro fornitore qualsiasi>, documento_id}`.
  3. `c.righe.length === 0`, nessun controllo scatta e il documento si collega a un fornitore estraneo.
- **Correzione**:
  - Il controllo sul nome letto deve vedere **anche i fornitori già importati**. Fai una ricerca interna con la stessa SQL di `cerca`, senza filtrare i codici già in `codici_esterni`. Estrai la parte SQL in una funzione locale e usala in tutti e due i punti, senza copiarla.
  - La ricerca deve restituire **esattamente una** riga, con `id_integra === idIntegra` e la P.IVA normalizzata uguale a quella della riga importata.
  - Zero righe o più righe → 409 «Il fornitore del documento non è questo: controlla il nome letto».
  - Togli il commento «Zero righe = … si collega lo stesso».
- **Prova** in `test/anagrafica-integra.spec.ts`:
  - nome letto che non trova nulla → 409, e nulla scritto: né ruolo, né `codici_esterni`, né documento;
  - fornitore già importato, con il nome letto giusto → collegato;
  - fornitore già importato ma con l'`id_integra` di un altro → 409.

### C2 — P1 · Il limite di 5 s vale per tutto il pool del ponte: la sincronizzazione completa non finisce più
- **Dove**: `app/backend/src/integra.ts:354-360` (`new Pool` con `query_timeout: 5000` e `options: … statement_timeout=5000`).
- **Scenario**:
  - al primo giro, o dopo un'anomalia vecchia, `daQuando` vale l'epoca e `leggi` legge tutta la vista;
  - via VPN la lettura dura più di 5 s, quindi viene annullata a ogni giro e la sincronizzazione non finisce mai;
  - lo stesso vale per il `count(*)` di `prova()`.
- **Correzione**:
  - Togli `query_timeout` e `statement_timeout` dal pool; resta `default_transaction_read_only=on`.
  - Il limite si mette **solo** sulle query di `cerca` e `importa` in `anagrafica-integra.ts`: per ogni query `ponte.query({ text, values, query_timeout: 5000 })`, oltre a `conTempo`.
  - La sincronizzazione torna senza limite stretto, come prima di 0b-01.
- **Prova** in `test/integra.spec.ts`:
  - le `options` del pool non contengono `statement_timeout`;
  - `cerca` con un `pg_sleep` lungo sul ponte di prova risponde «ponte lento» entro il limite.

### C3 — P2 · V13: chiamata al ponte dentro la transazione con lock
- **Dove**: `anagrafica-integra.ts` ~160. `cerca(tx, …)` è chiamata dentro `db.$transaction`, che ha il limite Prisma di 5 s, mentre si tengono l'advisory lock e il `FOR UPDATE` sul documento.
- **Scenario**:
  - il ponte è lento: 3 s di attesa più 3 s per la connessione;
  - la transazione supera i 5 s, Prisma dà «Transaction already closed» e la risposta è un 500;
  - nel frattempo il documento resta bloccato.
- **Correzione**:
  - La lettura del nome dal documento e la ricerca sul ponte (C1) si fanno **prima** di `$transaction`, senza lock.
  - Dentro la transazione si ricontrolla solo il documento: `FOR UPDATE`, stato, `fornitore_id` nullo.
  - Si controlla anche che il nome letto non sia cambiato nel frattempo, confrontandolo con quello letto prima. Se è cambiato → 409 «Il documento è cambiato: riprova».
- **Prova**:
  - la prova di C1 resta verde;
  - con un ponte lento la risposta è 502 o 409, non 500.

### C4 — P2 · `cerca` apre l'anomalia al primo errore, anche da una GET e dentro altre transazioni
- **Dove**: `anagrafica-integra.ts:85-92`.
- **Scenario**:
  - la VPN cade per un attimo mentre un utente apre Documenti;
  - in Stato del sistema compare l'anomalia «Integra non risponde», contro la regola dei tre giri di fila della sincronizzazione (`integra.ts` ~255);
  - ogni pagina aperta dopo aumenta `volte`.
- **Correzione**:
  - `cerca` **non** apre anomalie: restituisce `{ errore: 'ponte non raggiungibile' }` e basta. Resta la regola dei tre giri della sincronizzazione.
  - Se `db` serve solo all'anomalia, toglilo dai parametri; se serve anche ai codici importati, lascialo.
- **Prova** in `test/anagrafica-integra.spec.ts`: con il ponte giù, `GET integra/cerca` risponde senza 500 e in `anomalie` non c'è **nessuna** riga nuova.

### C5 — P2 · Un ruolo può prendere due codici di Integra
- **Dove**: `anagrafica-integra.ts:189` (`registraCodice`) e i rami per P.IVA ~228 e ~241.
- **Scenario**:
  - in Integra ci sono doppioni noti: la stessa P.IVA su due master (`doppioni-anagrafica-integra.md`);
  - importato il primo, il secondo trova il ruolo per P.IVA e gli aggiunge un secondo codice;
  - a ogni giro la sincronizzazione sovrascrive il ruolo alternando le due righe.
- **Correzione**: prima di `registraCodice`, se il ruolo ha già un codice `integra` dello stesso tipo ma **diverso**, rispondi 409 «Il {cliente|fornitore} è già legato al codice Integra {X}: in Integra c'è un doppione con la stessa P.IVA (da correggere in Integra)». Nessuna scrittura.
- **Prova**: due righe del ponte di prova con la stessa P.IVA → il secondo import dà 409 e il ruolo ha un solo codice.

### C6 — P3 · Il campo `collegato` vuol dire due cose
- **Dove**:
  - `anagrafica-integra.ts` ~206, ~229, ~243;
  - `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx` (`importaFornitore`), solo se legge il campo.
- **Correzione**:
  - La risposta ha due campi chiari: `codice_registrato: boolean`, cioè il codice di Integra è stato aggiunto ora, e `documento_collegato: boolean`, cioè ora il documento ha quel fornitore.
  - Togli `collegato`.
  - Aggiorna chi lo legge: frontend e prove.

## Fuori da questo pacchetto
`paesePiva` è copiata in tre posti (import del vecchio CRM, storico, qui). Va nel pacchetto 7-01 (aiuti in un solo modulo), non qui.

## File ammessi
- `app/backend/src/anagrafica-integra.ts`
- `app/backend/src/integra.ts`
- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx` (solo per C6)
- `app/backend/test/anagrafica-integra.spec.ts`
- `app/backend/test/integra.spec.ts`
- `strumenti/opencode/resoconto-collaudo-0b-01-correzioni-1.md`

## Fine
- Prove `test/anagrafica-integra.spec.ts test/integra.spec.ts test/documenti.spec.ts` con 0 KO.
- `npx tsc --noEmit` nel backend e nel frontend.
- Resoconto con la sezione «Da documentare». C2 e C4 cambiano il comportamento del ponte: scrivi il testo pronto per la spec §4.7.1 e §7.14.3.
- Carica davvero `owasp-security`, `postgresql-code-review` e `caveman`.
