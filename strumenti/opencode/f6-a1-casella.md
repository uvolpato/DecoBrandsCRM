# Prompt per OpenCode — F6-A1 Ricezione e coda

Lavoro da **Sonnet**. Una sola sessione, senza sottoagenti.

Leggi `CLAUDE.md`. Carica le skill `ponytail`, `nestjs-best-practices`, `prisma-client-api`,
`javascript-typescript-jest` e `postgresql-code-review`. Prima di cercare nei file usa
`graphify query "<domanda>"`.

## Compito

Il primo pezzo dell'ingresso documenti: la **casella email** che porta i file nella coda comune, e
i due attrezzi della coda che userà il lettore (F6-A2). Nessuna pagina: la schermata `/documenti`
arriva con F6-A4.

Il canale esiste già: `riceviDocumento` in `app/backend/src/documenti.ts` (formati dai primi byte,
impronta SHA-256, file su disco prima della transazione, riga `in_coda`, evento `documento.upload`).
Non riscriverlo: chiamalo.

Da leggere:
- `piano-lavoro-crm.md`: riga **F6-A1**;
- `specifica-crm-provvigioni.md`: §4.2.12, §6.5 punti 1–2, §7.14.1–§7.14.4, §8.1, §15.2.4;
  nel §19: D-31, D-36, D-54, D-60;
- `app/backend/src/documenti.ts` (in particolare `riceviDocumento`, `MAX_BYTE`, `FileRicevuto`);
- `app/backend/src/impostazioni.ts` (arriva con F5-A6: `casellaConfig`, `righePagina`); se non
  c'è ancora, fermati e dillo nel resoconto;
- `app/backend/src/integra.ts` (giro pianificato, `servizi_esecuzioni`, anomalie, `onModuleInit`);
- `app/backend/src/registro.ts` (`apriAnomalia`, `chiudiAnomalia`, `SCHEMI`);
- `app/backend/prisma/schema.prisma`, `model documenti_in_arrivo`; la migrazione
  `20261101120000_schema_completo` per il CHECK degli stati;
- `app/backend/test/documenti.spec.ts`, `test/registro-api.spec.ts`, `test/integra.spec.ts`.

## Dipendenze

In `app/backend/package.json`: `imapflow` (lettura IMAP; se F5-A6 l'ha già aggiunto per *Prova la
connessione*, non rimetterlo) e `mailparser` + `@types/mailparser` (dev). Nient'altro.
`nodemailer` arriva con F5-A6: non aggiungerlo qui.

## Server

### `app/backend/src/casella.ts` (nuovo)

**Configurazione**: da `casellaConfig(db)` di F5-A6 — `server`, `porta`, `utente`, `password`
(già decifrata), `cartella`, `cartella_lette`, `minuti`. Se mancano server, utente o password:
nessun giro e **nessuna anomalia** (installazione nuova non ancora configurata). Rileggi la
configurazione a ogni giro, così un salvataggio vale subito.

**Un giro** — funzioni esportate e testabili senza server IMAP:

```ts
export interface AllegatoEmail { nome: string; dati: Buffer }
export interface MessaggioEmail {
  uid: number; da: string; oggetto: string;
  allegati: AllegatoEmail[];   // solo allegati veri, non immagini incorporate
}
export interface CasellaAperta {
  messaggi: AsyncIterable<MessaggioEmail>;
  sposta(uid: number): Promise<void>;   // nella cartella delle lette
  chiudi(): Promise<void>;
}
export type ApriCasella = (config: ConfigCasella) => Promise<CasellaAperta>;

export async function giroCasella(db: PrismaService, config: ConfigCasella, apri: ApriCasella = apriImap, ora = new Date())
```

- Apre la casella, scorre i messaggi **uno alla volta**; per ogni allegato chiama
  `riceviDocumento` con
  `{ nome, dati, origine: 'email', email_da: da, email_oggetto: oggetto }` e contesto vuoto
  (`utente_id` null: è il servizio).
- `ConflictException` (stesso `file_hash`) = **doppione**: conta fra gli ignorati, nessun errore e
  nessuna anomalia. `UnsupportedMediaTypeException` (Excel, `.msg`, altro) e
  `PayloadTooLargeException` = ignorato + **anomalia `casella.allegato`** (livello `attenzione`,
  chiave = nome del file, testo con il nome del file: «non è un PDF né una foto…»).
- Email **senza allegati** = anomalia `casella.vuota` (livello `attenzione`, chiave = oggetto) e
  nessun file. Un'email con allegati tutti ignorati **non** è vuota: resta solo
  `casella.allegato`.
- Dopo averla lavorata, l'email si **sposta** nella cartella delle lette: così non si rilegge al
  giro dopo. Se lo spostamento fallisce si logga e si prosegue; il giro successivo la ritrova e i
  doppioni si scartano da soli.
- Alla fine chiude sempre la casella (`finally`).
- **Perché due cartelle**: la cartella letta è la coda; «Letti» è l'archivio delle email già
  prese. Senza lo spostamento si rileggerebbe sempre tutto (D-60, §6.5 punto 1).
- Ritorna `{ email, presi, ignorati, esito: 'ok' | 'attenzione' | 'errore' }`.

**Il lettore IMAP** (`apriImap`, l'unico punto che conosce `imapflow`):

- `new ImapFlow({ host, port, secure: porta === 993, auth: { user, pass }, logger: false })`.
- `connect()`, `list()`: se manca `cartella` o `cartella_lette` si lancia un errore di tipo
  *cartella mancante* (classe o proprietà `cartella`), non un errore di connessione.
- `getMailboxLock(cartella)`; `fetch('1:*', { uid: true, source: true })`; `simpleParser` su
  `source`; per ogni messaggio un `MessaggioEmail` con `from.value[0].address`, `subject` e gli
  allegati: `filename` presente, `!cid` e `!related` (le immagini incorporate nei loghi non sono
  documenti). Il contenuto si passa a `riceviDocumento` così com'è: i formati li controlla lui
  dai primi byte.
- `messageMove(uid, cartella_lette, { uid: true })`.
- `logout()` e `close()` sempre nel `finally`.
- Errori di `connect`/`login` = *connessione*; errori di `list` per cartella assente = *cartella*.
  Il testo tecnico va solo nel `dettaglio` dell'anomalia e in `servizi_esecuzioni.misure`, mai nel
  messaggio (§7.14.3).
- **shortcut:** un'email intera sta in memoria (`source`); se la casella avrà allegati molto
  grandi o molte email insieme, si passerà al download del singolo allegato via `bodyStructure`.

**Il servizio `CasellaService`** (`@Injectable`, registrato in `app.module.ts`):

- `onModuleInit`: se `NODE_ENV !== 'test'`, `setInterval` di 60 s che chiama `forse()`; niente
  timer nelle prove. `onModuleDestroy` lo chiude.
- `forse()`: se non c'è configurazione o c'è già un giro, esce; esegue solo quando sono passati
  `minuti * 60_000` dall'ultimo inizio (in memoria: al riavvio un giro subito). Un giro alla volta.
- `esegui()`: un giro subito, ignorando l'attesa; è il metodo che userà **F5-A5** per *Controlla
  adesso*. Nessuna rotta qui: la aggiunge F5-A5.
- Nessuna eccezione in esercizio: logga e scrive il giro in `servizi_esecuzioni`.

**Giri e anomalie** (§7.14.1, §7.14.3):

- `servizi_esecuzioni`: una riga `servizio='casella'`, `tipo='lavoro'`, `avviato_da=null`, creata
  all'inizio e chiusa alla fine con `esito` (`ok` | `attenzione` | `errore`), `testo` in italiano e
  `misure: { email, allegati, ignorati }`. `attenzione` se qualcosa è stato ignorato o c'era
  un'email vuota; `errore` per connessione o cartella.
- `casella.connessione` (errore): si apre dopo **3 giri di fila** con esito `errore` per
  connessione; si chiude al primo giro riuscito. Stesso schema di `controllaConnessione` in
  `integra.ts`.
- `casella.cartella` (errore): si apre subito quando manca una delle due cartelle, con il nome nel
  testo; si chiude quando ci sono entrambe.
- `casella.allegato` e `casella.vuota` (attenzione): si aprono subito, **non** si chiudono da sole;
  se tornano, `apriAnomalia` incrementa `volte`.
- Testi fissi in un solo oggetto `TESTO` (frasi con il nome del file o della cartella), come in
  `integra.ts`.
- Non scrivere un evento di registro per il giro: l'evento `documento.upload` lo scrive già
  `riceviDocumento` (§15.2.4). Gli errori di connessione sono anomalie, non eventi.

### Coda per il lettore (in `app/backend/src/documenti.ts`)

Due funzioni esportate, senza rotte: le userà F6-A2. Lavorano sulla tabella che c'è già
(`stati: in_coda → in_lettura → da_controllare → …`).

1. `prelevaDocumento(db)`:
   - in **una transazione**: `SELECT id FROM documenti_in_arrivo WHERE stato = 'in_coda' ORDER BY
     ricevuto_il, id FOR UPDATE SKIP LOCKED LIMIT 1`;
   - se c'è, `stato = 'in_lettura'`, `tentativi + 1` e ritorna
     `{ id, file_nome, file_percorso, tentativi }`; altrimenti `null`;
   - niente `in_lettura` senza riga: lo stato e il prelievo sono la stessa transazione (V13).
2. `letturaFallita(db, id, errore)`:
   - in **una transazione**, blocca la riga (`FOR UPDATE`) e rilegge;
   - se `tentativi >= 3`: `stato = 'errore'`, `errore` (testo ripulito e tagliato), evento
     `documento/upload` esito `errore` con `{etichetta: file_nome, documento_id, tentativi, errore}`
     (§15.2.4) e anomalia `lettura.fallita` con `chiave = id` e `dettaglio.documento_id`;
   - altrimenti torna `in_coda` con `errore` valorizzato, così il giro dopo riprova;
   - ritorna lo stato finale (`'in_coda'` | `'errore'`).
   - Se la riga non è `in_lettura` non si tocca (un'altra richiesta l'ha già presa).

### Nessun altro cambiamento

- `POST /api/documenti/carica` e `riceviDocumento` restano come sono.
- Il caricamento manuale esiste già: non duplicarlo.
- Non aggiungere rotte, permessi o pagine.
- `.env.example`: nessuna variabile nuova (la casella sta nelle Impostazioni).

## Documenti

- **Spec** `specifica-crm-provvigioni.md`, versione in testa **8.41** con il riassunto:
  - §6.5 punto 1: l'email si legge con `imapflow` **ogni N minuti (Impostazioni → Casella)**, gli
    allegati prendono solo PDF, JPEG e PNG, gli Excel e i `.msg` si scartano (D-60), le email
    lette si spostano nella cartella delle lette, i doppioni si ignorano;
  - §6.5 punto 2: la coda è la tabella; `SKIP LOCKED` e i 3 tentativi stanno in
    `prelevaDocumento`/`letturaFallita`, usati da F6-A2;
  - §7.14.1 e §7.14.3: la riga della casella dice PDF/JPEG/PNG (non Excel) e il testo di
    `casella.allegato` è allineato;
  - §15.2.4: conferma che l'evento della casella è lo stesso `documento/upload` di `riceviDocumento`;
  - §19: nuova riga **D-66** (D-64 è il bordo del fuoco, D-65 è di F5-A6) con decisione, perché,
    Ugo, sezioni.
  - Scrivi in UTF-8 **senza BOM**, righe LF: usa lo strumento di modifica, mai `Set-Content` o
    `Out-File`.
- **Guida** `app/frontend/lib/guida.ts`, argomento *Documenti*: correggi «Carica PDF ed Excel» in
  «PDF e foto», e nel flusso «Dalla casella email ogni pochi minuti» aggiungi che il ritmo si fissa
  in Impostazioni → Casella dei documenti e che gli Excel non si prendono.
- **Piano** `piano-lavoro-crm.md`: riga F6-A1 allineata (leggi casella, caricamento manuale già
  fatto, doppioni, coda `SKIP LOCKED`, tentativi); nessuna ora nuova.
- Poi lancia `python strumenti/genera-pagine-doc.py`.
- **Non** toccare `prototipo-alternativo/`.
- **Non** toccare `avanzamento-app.md` (lo chiude la sessione principale).

## Regole

- Tutto sul backend, mai dai dati del frontend (V12). Una operazione, una transazione (V13).
- Gli allegati non si fidano del nome: il formato lo decidono i primi byte in `riceviDocumento`.
- Italiano semplice in codice, commenti e interfaccia; commenti brevi con il rimando
  (`// D-66 §19`).
- Codice minimo (ponytail): niente astrazioni in più; il seam `ApriCasella` serve solo a provare il
  giro senza un server IMAP.
- Database di prova `decobrands_test` per Jest.
- **Non chiudere processi node che non hai avviato tu.**
- Niente commit, push, modifiche a `.env`.

## Prove

1. **Backend** (`app/backend`):
   - `npx tsc --noEmit`.
   - `npx jest --runInBand` suite per suite. 0 KO.
   - Nuovo `test/casella.spec.ts` (Nest + Prisma su `decobrands_test`, `svuota` prima di ogni
     prova; **nessuna rete**): con una `ApriCasella` finta:
     - due email, una con un PDF e una con un Excel: una riga `in_coda` con `origine='email'`,
       `email_da`/`email_oggetto`, evento `documento.upload`, un ignorato e l'anomalia
       `casella.allegato`; il giro in `servizi_esecuzioni` con `esito='attenzione'` e le misure;
     - doppione: lo stesso PDF in due email → una sola riga, il secondo ignorato, nessun errore;
     - email senza allegati → `casella.vuota`, nessuna riga;
     - `sposta` chiamato per ogni email lavorata, anche con allegati ignorati;
     - connessione fallita 3 volte → `casella.connessione` aperta e `esito='errore'` nei giri; al
       primo giro riuscito → chiusa;
     - cartella mancante → `casella.cartella` aperta subito (non dopo 3), nessuna
       `casella.connessione`;
     - configurazione incompleta → nessun giro e nessuna anomalia;
     - `forse()` rispetta `minuti` (funzione pura o fake timer: non aspettare davvero).
   - Nuovo `test/coda.spec.ts`:
     - `prelevaDocumento` su coda vuota = `null`;
     - su due file prende il più vecchio, lo porta `in_lettura`, `tentativi=1`; la seconda
       chiamata prende l'altro;
     - `letturaFallita` con 1 tentativo torna `in_coda` con `errore`; con 3 tentativi porta
       `errore`, scrive l'evento `documento.upload` esito `errore` e apre `lettura.fallita`;
     - una riga non `in_lettura` non viene toccata.
   - Le prove esistenti di `documenti.spec.ts` restano verdi.
2. **Browser**: nessuna prova nuova, non c'è ancora una pagina. Se avvii il backend per una prova a
   mano, usa il database di sviluppo solo per una casella configurata e poi togli la
   configurazione (le impostazioni sono globali).
3. Chiudi solo i processi che hai avviato tu.

## Resoconto

Scrivi `strumenti/opencode/resoconto-f6-a1.md` con: file toccati, forma della configurazione
letta, come si comporta il giro (cartelle, doppioni, allegati, spostamento), le anomalie scritte,
il contratto di `prelevaDocumento`/`letturaFallita` per F6-A2, prove con i numeri, dubbi e cose
rimaste aperte (per esempio la prova con una casella IMAP vera, che qui non c'è).
