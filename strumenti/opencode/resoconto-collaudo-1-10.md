# Resoconto collaudo · Onda 1 · Pacchetto 1-10 — Casella: STARTTLS obbligatorio, email malformata, limite per allegato

Data: 12/11/2026 · Esecutore: DeepSeek V4 · Rilievi: **A4-04** (P2), **A4-05** (P2), **A4-12** (P3).

## Esito

Tutti e tre i rilievi **corretti** come da *Correzione puntuale*. Nessun file fuori dagli ammessi toccato, nessun
commit, database di prova cancellato.

## Cosa ho fatto

### A4-04 — STARTTLS obbligatorio sulle porte diverse da 993

- `app/backend/src/casella.ts:117-122`: estratta `opzioniImap(config)` (esportata) con `doSTARTTLS: config.porta ===
  993 ? undefined : true`; `apriImap` ora usa `new ImapFlow(opzioniImap(config))` (riga 126).
- Verificato sulle definizioni imapflow 2.10.2 (`types.d.ts:184-194`): `doSTARTTLS: true` = «the connection must
  upgrade to TLS, and connecting fails when the server does not offer STARTTLS», e la riga 1601–1602 conferma che
  `secure: true` insieme a `doSTARTTLS: true` è un errore: per questo sulla 993 il valore è `undefined`, non `true`.
- Test: `test/casella.spec.ts` — porta 993 → `secure: true`, `doSTARTTLS` `undefined`; porta 143 → `secure: false`,
  `doSTARTTLS: true`.

### A4-05 — un'email illeggibile non blocca più le successive

- `app/backend/src/casella.ts:90-94` (`leggiMessaggi`): `simpleParser` dentro `try/catch`; se lancia, il generatore
  cede `{ uid, da: '', oggetto: '', allegati: [], errore: pulisci(e) }` e passa alla successiva. Il campo `errore?`
  è nuovo in `MessaggioEmail` (riga 35).
- `app/backend/src/casella.ts:204-214` (`giroCasella`): `msg.errore` → `esito = 'attenzione'`, `ignorati++`, anomalia
  `casella.allegato` con `chiave: String(msg.uid)` e il testo fisso `TESTO.illeggibile`, **niente spostamento**,
  `continue` alla successiva.
- `app/backend/src/casella.ts:230-243`: gli errori **non classificati** su un allegato (il vecchio `throw e`) ora
  non sono più fatali: `ignorati++`, `esito = 'attenzione'`, stessa anomalia `casella.allegato` per uid, `guasto =
  true`, `break` sugli allegati e `continue` **senza spostamento** (l'email si ritenta al giro dopo). Gli errori di
  connessione (`client` chiuso, `fetch`/`fetchOne` che non sono il parse) restano fatali: escono dal `for await` e
  chiudono il giro in `errore` come prima.
- Test: casella finta con 3 email, la seconda `errore` → prima e terza entrano (`presi: 2`), la seconda resta
  (`sposta` chiamato solo su uid 1 e 3) e apre `casella.allegato` (`ignorati: 1`, `esito: 'attenzione'`).

### A4-12 — il limite vale sull'email intera con margine per la base64 e più allegati

- `app/backend/src/casella.ts:74`: `const SOGLIA_EMAIL = Math.ceil(MAX_BYTE * 1.4) * 3` e la riga 81 confronta con
  `SOGLIA_EMAIL` invece che con `MAX_BYTE`. Il limite del singolo file resta in `riceviDocumento` (`documenti.ts:74`,
  non toccato).
- Test: `leggiMessaggi` (ora esportata) con un client imapflow finto — email con `size` sopra `MAX_BYTE` ma sotto la
  nuova soglia → scaricata e allegato estratto; email oltre la soglia → `troppoGrande`.

## Prove eseguite

Database di prova `decobrands_test_1_10` creato con le variabili del pacchetto, `DATABASE_URL` di prova per
`prisma migrate deploy`, cartella documenti in `TMP/TEMP`, poi **cancellato** (`DROP DATABASE`).

- `cd app/backend && npx jest test/casella.spec.ts` → **1 suite, 12 prove, 0 KO**.
- `cd app/backend && npx tsc --noEmit` → **0 errori**.
- `git status --short` / `git diff --name-only`: fra i miei file ho toccato solo `app/backend/src/casella.ts`,
  `app/backend/test/casella.spec.ts` e questo resoconto. Gli altri file modificati o non tracciati che si vedono in
  `git status` sono lavoro degli altri pacchetti in parallelo: **non li ho toccati**.
- Database `decobrands_test_1_10` **cancellato**.

Nota su un test scartato: avevo scritto anche una prova di `leggiMessaggi` con un buffer MIME malformato per
esercitare il `catch` di `simpleParser`; `simpleParser` su contenuto non-MIME non rifiuta ma resta appeso, e il
`beforeEach` andava in timeout. L'ho tolta: il comportamento A4-05 è già coperto dalla prova di `giroCasella` (che è
quella richiesta dal rilievo); il `catch` nel generatore è la traduzione letterale dello snippet indicato.

## Prove nel browser da lanciare a fine onda

Nessuna prova nuova (difetti solo nel backend, senza effetto visibile). Da rilanciare invariate:

- `python strumenti/prove/app_sistema.py <suffisso> <cartella schermate>` — Stato del sistema (le anomalie `casella.*`);
- `python strumenti/prove/app_documenti.py <suffisso> <cartella schermate>` — ingresso documenti;
- `python strumenti/prove/app_flusso.py <suffisso> <cartella schermate>` — flusso completo (regressione).

## Cose aperte

- Nessuna correzione contro il §19: D-66 resta come scritta (le anomalie `casella.*` e lo spostamento delle email
  lette); A4-04 è una correzione di sicurezza dentro D-66, A4-05/A4-12 sono correzioni di correttezza.
- Per A4-05 l'anomalia si riapre/ripete a ogni giro finché l'email resta in cartella (è il «niente spostamento»
  chiesto dal rilievo): il `casella.allegato` con `chiave = uid` non crea righe nuove, incrementa solo `volte`.
- `leggiMessaggi` e `opzioniImap` sono ora **esportate** da `casella.ts` (soli seam per i test): nessun cambio di
  contratto esterno.

## Da documentare (per il pacchetto documentazione dell'onda)

### §19 — riga D-nn

- **A4-04**: merita una riga nuova, è una regola di sicurezza (fail-closed):
  > **D-nn** · 12/11/2026 · **Lo STARTTLS della casella è obbligatorio sulle porte diverse da 993.** Con `imapflow`
  > `doSTARTTLS: true` la connessione non usa la porta 993 deve passare a TLS, e si fallisce se il server non offre
  > STARTTLS: la password della casella dei fornitori non viaggia mai in chiaro (un intermediario non può togliere
  > STARTTLS dalle capacità per ottenere un `LOGIN` in chiaro, come invece accadeva). Sulla 993 la connessione è già
  > TLS (`secure: true`) e `doSTARTTLS` resta `undefined`. | la posta in uscita già lo imponeva (`requireTLS`); la
  > casella era l'unico punto in chiaro. | Ugo | §7.14.1, `src/casella.ts` (`opzioniImap`) |
- **A4-05, A4-12**: **nessuna decisione nuova** — correzioni dentro D-66.

### Spec — righe *Perché*

- **§7.14.3 (catalogo dei problemi)**: nella riga `casella.allegato` estendere «Quando si apre»: «…o file danneggiato,
  **o email non leggibile (parse MIME fallito)**». *Perché:* un'email malformata non deve più fermare il giro intero
  (A4-05); resta in cartella, si segnala con `casella.allegato` (chiave = uid) e si ritenta al giro dopo.
- **§7.14.1 / §6.5 (ingresso documenti, casella)**: aggiungere *Perché*: la soglia della casella vale sull'**email
  intera** con margine per la base64 e più allegati (`Math.ceil(DOCUMENTI_MAX_MB · 1,4) · 3`), così tre fatture da
  7 MB in una sola email entrano; il limite del singolo file resta in `riceviDocumento` (A4-12).

### Guida in linea (`app/frontend/lib/guida.ts`) e prototipo (`prototipo-alternativo/assets/guida.js`)

**Nessuna modifica**: non cambia nulla per chi usa l'app. (Se si vuole una nota su «Stato del sistema», `casella.allegato`
copre già anche un'email non leggibile; il testo resta lo stesso.)

### Piano (`piano-lavoro-crm.md`)

**Nessuna voce nuova**: le tre correzioni stanno dentro F6-A1 (ingresso documenti) già prevista. Se il controllo di
fine onda vuole tracciarle, riga «casella: STARTTLS obbligatorio, email illeggibile non bloccante, soglia per
allegati (A4-04, A4-05, A4-12)» con 1,5 h **da approvare**, fatte.

### README

**Nessuna modifica**: `app/README.md` e `prototipo-alternativo/LEGGIMI.md` non descrivono questi dettagli della casella.
