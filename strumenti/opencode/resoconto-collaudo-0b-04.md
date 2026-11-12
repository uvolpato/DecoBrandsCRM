# Resoconto · Onda 0 bis · Pacchetto 0b-04 — Soggetti: versioni dei ruoli sulla P.IVA, codice di Integra solo dall'import, scheda senza risposte fuori ordine

Data: 12/11/2026 · Esecutore: DeepSeek V4 Flash · Rilievi: R0-D6, R1-08, R2-02, R2-03, R2-04, R1-13 (parte sua) · Decisioni applicate: D-138 (nuova), D-46, D-59, D-102.

## Cosa ho fatto

### R0-D6 — cambiare la P.IVA aggiorna le versioni dei ruoli (D-138, D-46)
- `app/backend/src/soggetti.ts:322` — `daIntegra(db, id, ruoli?)`: vero se un ruolo del soggetto ha un codice in `codici_esterni` (`sistema = 'integra'`) o se la versione corrente del cliente/fornitore ha `fonte = 'integra'`. Accetta i ruoli già letti per non rileggere due volte la scheda.
- `app/backend/src/soggetti.ts:337` — `allineaPivaRuoli(tx, soggetto_id, piva, req)`: per ogni cliente e fornitore del soggetto, se la versione corrente ha una P.IVA diversa, ne crea una nuova con la P.IVA nuova e **gli altri campi uguali** (`fonte`, `ragione_sociale`, indirizzo/CAP/città/provincia/email per il cliente, paese per il fornitore), sposta `versione_corrente_id` sulla nuova e scrive nel registro un evento `crud.update` per ruolo. La vecchia versione resta nella storia: il trigger `versioni_solo_aggiunta` vieta UPDATE e DELETE (D-46).
- `app/backend/src/soggetti.ts:505` — `PUT /soggetti/:id`: dopo `SELECT … FOR UPDATE`, se `daIntegra` → 409 «Dati di Integra: si correggono in Integra», **prima** di `datiFiscali` e di qualsiasi scrittura (anche con sole note o nessun campo cambiato).
- `app/backend/src/soggetti.ts:545` — `POST /soggetti/:id/attivo`: stessa guardia 409 (D-138: attiva/disattiva compresa).
- `app/backend/src/soggetti.ts:532` — nella stessa transazione della modifica, se `piva_norm` cambia → `allineaPivaRuoli` (V13); `d.piva_norm || null` così una P.IVA svuotata resta `null`, come in `creaRuolo`.
- `app/backend/src/soggetti.ts:472` — il dettaglio espone `da_integra`, calcolato dal server (V12), così il frontend non deve dedurlo dai ruoli.
- `app/frontend/app/(app)/soggetti/VistaSoggetti.tsx:83,474,521` — `Dettaglio.da_integra`; con il master da Integra non si mostrano «Modifica identità», «Disattiva», «Riattiva» e compare la nota «Da Integra: i dati del soggetto si correggono in Integra…». I ruoli restano gestibili.

### R1-08 — il codice di Integra non si scrive a mano (D-138, D-111)
- `app/backend/src/soggetti.ts:182` — tolto `codice_integra` da `NuovoRuolo`; con `forbidNonWhitelisted` un campo in più diventa 400. Tolte le due `codici_esterni.create` da `creaRuolo`; la risposta del ruolo ha `codice: ''`.
- `app/frontend/app/(app)/soggetti/VistaSoggetti.tsx:221` — tolto il campo «Codice Integra» dalla finestra del ruolo e dal corpo inviato; la nota della scheda Ruoli dice ora che il codice arriva dall'import.

### R2-02 / R2-03 / R2-04 — la scheda del soggetto
- `app/frontend/app/(app)/soggetti/VistaSoggetti.tsx:151` — il caricamento del dettaglio sta nell'effetto con `vivo`: all'annullamento la risposta vecchia si scarta (R2-02); eliminata `caricaDettaglio` e l'import di `useCallback`.
- riga 155 — `setDet(d => d?.id === id ? d : null)`: al ricaricamento dello stesso soggetto (dopo un salvataggio) il pannello non si svuota e le schede non si rimontano (R2-03).
- riga 129 e 533 — `sagomaDet = useSagome(detCaricando && !det)` al posto di `detCaricando || caricando`: niente sagoma sotto i 150 ms, niente sagoma del pannello su un cambio di filtro (D-59).
- righe 160-161 e 531 — stato `erroreDet`; in caso di errore il pannello dice «Soggetto non caricato» con «Riprova», non «Nessun soggetto»; se lo stato è 404 e l'id veniva dalla memoria `sel`, si azzera `sel` (R2-04).

## Prove lanciate

- Database di prova `decobrands_test_0b_04`: creato, `prisma migrate deploy`, prove, poi cancellato.
- `cd app/backend && npx jest test/soggetti.spec.ts test/seed.spec.ts` (con `DATABASE_URL_TEST`, `TMP`/`TEMP` dedicati) → **2 suite, 33 prove, 0 KO**.
- `cd app/backend && npx tsc --noEmit` → 0 errori.
- `cd app/frontend && npx tsc --noEmit` → 0 errori.
- `python -m py_compile strumenti/prove/app_soggetti.py` → 0 errori.
- Nessuna prova nel browser e nessuna schermata: porte e `.next` sono condivisi con gli altri pacchetti dell'onda (regole dell'onda). Elenco sotto.
- Nota: durante il lavoro `npx tsc --noEmit` sul backend ha dato per un po' un solo errore in `src/anagrafica-integra.ts` (import di `IsOptional`), file di un altro pacchetto in scrittura; sparito al giro successivo. Il mio codice compilava già.

Prove aggiunte in `app/backend/test/soggetti.spec.ts`:
- riga 209 — il soggetto da Integra risponde 409 su `attivo`; un soggetto senza ruoli si disattiva;
- riga 218 — D-138: PUT con P.IVA nuova e PUT con le sole note → 409, master e numero di versioni identici;
- riga 266 — R1-08: `POST /soggetti/:id/ruoli` con `codice_integra` → 400 e nessun `codici_esterni`;
- riga 287 — R0-D6: soggetto solo CRM con cliente e fornitore, stessa P.IVA → nessuna versione; P.IVA nuova → +1 versione per ruolo, corrente con la P.IVA nuova e gli altri campi uguali, vecchia ancora presente, eventi; disattiva → 409 per ruoli attivi; P.IVA di un altro soggetto → 409 e nulla cambia.

## Prove nel browser da lanciare a fine onda

- `python strumenti/prove/app_soggetti.py <s> <cartella>` (sezione 2) — MCL (da Integra) senza «Modifica identità»/«Disattiva» e con la nota «Da Integra».
- sezione 4 — la finestra del ruolo non ha `#c-codice`; i due ruoli si creano senza codice.
- sezione 6 — dopo «Salva recapito» nessun `.sagoma` nel pannello e titolo presente (R2-03).
- sezione 12 — due clic rapidi con la prima risposta ritardata di 0,9 s: URL e titolo del secondo soggetto (R2-02); `/soggetti/999999` → «Soggetto non caricato» con l'elenco ancora pieno (R2-04).
- Controllo visivo a 1440 e 768 px sulla scheda di un soggetto da Integra (nota in più, niente pulsanti di modifica).

## Cose aperte

- La prova «un errore a metà non lascia il master cambiato» è resa con un PUT che fallisce in `controlloDuplicati` (P.IVA di un altro soggetto): verifica che nulla cambi, ma non esercita un errore **dopo** l'update del master. Per forzarlo servirebbe un mock del client Prisma; l'atomicità è comunque garantita da un'unica `prisma.$transaction` (V13). Se il controllo di fine onda vuole la prova con il mock, va aggiunta lì.
- La scheda mostra i campi del master in sola lettura perché sono già sola lettura (`Dettagli`); l'unico punto di scrittura era la finestra «Modifica identità», ora nascosta. Se si vuole una resa grafica diversa dei campi «Da Integra», è una scelta di stile da decidere con Ugo.

## Da documentare

### §19 — registro delle decisioni (la scrive 0b-doc)
- **D-138** · 12/11/2026 · La verità è su Integra: il master di un soggetto con almeno un ruolo da Integra (codice in `codici_esterni` o versione corrente con `fonte = 'integra'`) è in sola lettura nel CRM, e ogni `PUT /soggetti/:id` o attiva/disattiva risponde 409 «Dati di Integra: si correggono in Integra» senza scrivere nulla; per un soggetto solo del CRM, cambiare la P.IVA apre una versione nuova di ogni ruolo (`clienti_versioni`, `fornitori_versioni`) nella stessa transazione del master, con la P.IVA nuova e gli altri campi uguali; il codice di Integra non si scrive mai a mano, il legame nasce solo da *Importa* · Perché: la P.IVA dei ruoli restava quella vecchia e una fattura con la P.IVA nuova non riconosceva il cliente; un codice digitato per sbaglio faceva sovrascrivere dal giro di sincronizzazione i dati di un altro soggetto su quel ruolo (V12, D-46, D-102, D-111) · Ugo (deciso, pacchetto 0b-04) · Dove: `soggetti.ts` (`daIntegra`, `allineaPivaRuoli`, `modifica`, `attivo`, `creaRuolo`, `dettaglio`), `VistaSoggetti.tsx`, spec §4.1 e §5, `test/soggetti.spec.ts`, `strumenti/prove/app_soggetti.py`.

### Riga *Perché* nella spec
- §4.1 (identità del soggetto): «Se il soggetto ha almeno un ruolo da Integra, il master è in sola lettura: il server risponde 409 a ogni modifica, attiva/disattiva compresa, e il frontend non mostra i comandi (D-138). Un soggetto solo del CRM che cambia P.IVA apre una versione nuova di ogni ruolo, con la P.IVA nuova e gli altri campi uguali; le versioni non si riscrivono sul posto (D-46). Perché: la P.IVA vecchia nei ruoli impediva di riconoscere i documenti con quella nuova.»
- §5 (ruoli): «Il ruolo nuovo non porta il codice di Integra: il codice si collega solo con *Cerca in Integra → Importa*, che rilegge la riga dal ponte. Un `codice_integra` nel corpo è 400 (D-138, D-111). Perché: un codice digitato per sbaglio faceva scrivere sul ruolo i dati di un altro soggetto al giro di sincronizzazione.»

### Guida (`app/frontend/lib/guida.ts`) — testi pronti
- Soggetti, scheda del soggetto: «Se il soggetto arriva da Integra i dati del master non si modificano qui: si correggono in Integra. Nel CRM si gestiscono ruoli, sedi, recapiti, fatturazione e agenzie.»
- Soggetti, *Aggiungi ruolo*: «Scrivi la ragione sociale del ruolo. Il codice di Integra non si digita: arriva con *Cerca in Integra → Importa*.»
- Soggetti, *Modifica identità*: «Cambiare la P.IVA apre una versione nuova di ogni ruolo del soggetto, con gli altri dati uguali; la storia resta.»

### Piano e README
- `piano-lavoro-crm.md`: dentro F1-A8b «Soggetti». Se si annotano le correzioni del collaudo: 1 h **da approvare** per R0-D6/D-138 (guardia 409, versioni sulla P.IVA, prove) e 0,5 h **da approvare** per R1-08 e R2-02/R2-03/R2-04 (campo del codice, effetto del dettaglio, sagome).
- `app/README.md`: nulla da cambiare.
