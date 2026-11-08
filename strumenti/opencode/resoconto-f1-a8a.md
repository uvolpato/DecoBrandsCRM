# Resoconto F1-A8a — Anagrafica unica a soggetti: schema, migrazione, API, seed, prove

Data: 08/11/2026. Slice F1, prima metà di F1-A8 (D-100…D-102). Solo server: `app/frontend/` non è stato toccato.

## File creati e toccati

Creati:
- `app/backend/prisma/migrations/20261108090000_anagrafica_soggetti/migration.sql`
- `app/backend/src/soggetti.ts` (controller `soggetti` e `persone`)
- `app/backend/test/soggetti.spec.ts`

Toccati:
- `app/backend/prisma/schema.prisma` (modelli nuovi; una colonna su clienti/fornitori/agenti/subagenti; etichetta su codici_esterni)
- `app/backend/prisma/seed/00-base.ts` (soggetti, ruoli MCL/Consorzio, sedi, recapiti, persona, fatturazione)
- `app/backend/src/app.module.ts` (registrazione dei due controller)
- `app/backend/src/clienti.ts`, `app/backend/src/fornitori.ts`, `app/backend/src/subagenti.ts` (`soggetto_id` e `soggetto_codice` nelle risposte; nessun altro campo cambiato)
- `app/backend/test/svuota.ts` (nuove tabelle nel TRUNCATE e riavvio della sequenza del codice)
- `app/backend/test/seed.spec.ts` (conteggi: +1 fornitore, +2 clienti, +3 codici, più il blocco sui soggetti)
- `app/backend/test/bollettini.spec.ts` (il conteggio dei fornitori passa da 11 a 12: la matrice legge tutti i fornitori attivi)
- `specifica-anagrafica-soggetti.md` (nuova §10 "Implementazione nell'app (F1-A8)")

Non toccati, come chiesto: `specifica-crm-provvigioni.md`, `piano-lavoro-crm.md`, `avanzamento-app.md`, `.env`, `app/frontend/`.

## DDL vero e scelte

Migrazione **scritta a mano**, in un solo file, applicata con `prisma migrate deploy` su `decobrands_test` (stato: 18 migrazioni, nessuna pendente). Poi `prisma generate` senza errori.

- Sequenza `soggetti_codice_seq`. Default di `soggetti.codice`: `'C' || lpad(nextval('soggetti_codice_seq')::text, 6, '0')`, quindi il codice progressivo nasce dentro la transazione della creazione.
- `soggetti_piva_norm_key` UNIQUE `(paese, piva_norm) WHERE piva_norm <> ''`.
- `soggetti_cf_norm_key` UNIQUE `(paese, cf_norm) WHERE piva_norm = '' AND cf_norm <> ''`.
- Indici `soggetti_piva_norm_idx`, `soggetti_cf_norm_idx`; `gruppi_codice_key`, `settori_codice_key`.
- `sedi_predefinita_key` UNIQUE `(soggetto_id, tipo) WHERE predefinita`; `sedi_soggetto_id_idx`, `sedi_citta_provincia_idx`; CHECK `sedi_tipo_check`.
- `recapiti_collegamento_check` = `num_nonnulls(soggetto_id, sede_id, persona_id) = 1`; `recapiti_tipo_check`; `recapiti_soggetto_tipo_valore_key` e `recapiti_sede_tipo_valore_key` parziali; indici per soggetto e per sede.
- `persone_contatti_ruolo_check`; `persone_contatti_persona_soggetto_key` (`WHERE sede_id IS NULL`) e `persone_contatti_persona_soggetto_sede_key` (`WHERE sede_id IS NOT NULL`); indice `(persona_id, soggetto_id)`.
- `fatturazione_codice_destinatario_check` (`[A-Z0-9]{7}`), `fatturazione_estero_check` (`0000000` solo con `id_codice_estero`), `fatturazione_attiva_check` (almeno un recapito fiscale), `fatturazione_esigibilita_check` (I/D/S).
- `sconti_tipo_check`, `sconti_percentuale_check` 0–100, UNIQUE `(interscambio_id, ordine, valido_dal)`, FK `ON DELETE CASCADE`.
- `modifiche_entita_entita_id_idx`; `utente_id` FK `ON DELETE SET NULL` (l'audit resta anche se l'utente sparisce, come nel registro).
- Colonne nuove `clienti.soggetto_id`, `fornitori.soggetto_id`, `agenti.soggetto_id`, `subagenti.soggetto_id`: BIGINT NULL, UNIQUE, FK `ON DELETE RESTRICT`.
- `codici_esterni.etichetta VARCHAR(50)`; CHECK di `tipo` ampliato a `cliente|fornitore|subagente|soggetto|sede|interscambio`, `sistema` a `integra|vecchio_crm`. `entita_id` resta senza FK.
- Nessun trigger toccato: `clienti_versioni` e `fornitori_versioni` restano "solo aggiunta" (D-46).

Nello schema Prisma i vincoli parziali e i CHECK non ci sono (stanno solo in SQL); `soggetti.codice` usa `@default(dbgenerated(...))`.

## Endpoint

Tutti richiedono `dati.consulta` in lettura e `dati.modifica` in scrittura (D-45); DTO con `class-validator` e `forbidNonWhitelisted`, eventi nel registro nella stessa transazione (V13), righe bloccate con `SELECT … FOR UPDATE` dove serve (V13).

1. `GET /api/soggetti?q=&vista=tutti|cliente|fornitore|subagente|nonattivi&ordina=codice|nome&dir=asc|desc&pagina=&righe=`
   - risposta `{ righe, totale, conteggi }`; `conteggi` = `{ tutti, cliente, fornitore, subagente, nonattivi }` calcolati con il solo filtro `q` (D-23); `totale` = conteggio del segmento scelto.
   - riga: `id, codice, natura, paese, piva, piva_norm, codice_fiscale, cf_norm, attivo, nome, ruoli[{tipo,id,nome,codice,attivo}]`; `nome` = primo ruolo attivo (cliente → fornitore → subagente).
   - ricerca su codice, nome del ruolo attivo, P.IVA/CF (scritta e normalizzata); filtro, ordinamento e paginazione in SQL (D-52); `righe` massimo 200.
2. `GET /api/soggetti/:id` → identità (`id, codice, natura, paese, piva, piva_norm, codice_fiscale, cf_norm, sorgente, attivo, note, creato_il, modificato_il`), `nome`, `ruoli`, `sedi[]`, `recapiti[]` (del soggetto, delle sue sedi e delle persone collegate), `contatti[]` (con `persona`), `fatturazione` o `null`.
3. `POST /api/soggetti` `{ natura, paese?, piva?, codice_fiscale?, note? }` → 201 identità. `codice` dalla sequenza, `sorgente='crm'`, evento `crud.create` su `soggetto`.
   - `paese` due lettere (default `IT`), P.IVA normalizzata maiuscola senza spazi/punti con `IT` tolto se restano 11 cifre.
   - 400 se mancano sia P.IVA sia CF; 400 P.IVA corta (9–10 cifre); 409 P.IVA doppia (stesso paese) o CF doppio (senza P.IVA), con codice e nome del soggetto esistente.
4. `PUT /api/soggetti/:id` stessi campi, tutti facoltativi → 200 identità. Una riga in `modifiche` per ogni campo cambiato (`entita='soggetto'`, `campo`, `valore_prima`, `valore_dopo`, `utente_id`) ed evento `crud.update` con `prima`/`dopo`.
5. `POST /api/soggetti/:id/attivo` `{ attivo }` → 200. 409 con l'elenco dei ruoli attivi se `attivo=false` e il soggetto ne ha; evento `stato.change_state`.
6. `POST /api/soggetti/:id/sedi` `{ tipo, insegna?, indirizzo?, cap?, citta?, provincia?, paese?, predefinita?, valido_dal?, valido_al? }` → 201 sede; `PUT /api/soggetti/:id/sedi/:sid` stessa forma → 200. La predefinita si sposta nella stessa transazione (blocco del soggetto); chiusura con `valido_al`; evento `crud.create`/`crud.update` su `sede`.
7. `POST /api/soggetti/:id/recapiti` `{ tipo, valore, soggetto_id?|sede_id?|persona_id?, etichetta?, predefinito?, valido_dal?, valido_al? }` → 201; `PUT /api/soggetti/:id/recapiti/:rid` `{ tipo?, valore?, etichetta?, predefinito?, valido_dal?, valido_al? }` → 200.
   - 400 se nessuno o più di un collegamento, se la sede non è del soggetto, se la persona non è fra i suoi contatti; email/PEC in minuscolo e valide; 409 se esiste già identico; chiusura con `valido_al`.
8. `POST /api/persone` `{ nome, cognome, titolo?, note?, attivo? }` → 201; `PUT /api/persone/:id` → 200.
9. `POST /api/soggetti/:id/persone` `{ persona_id, sede_id?, ruolo?, referente?, valido_dal?, valido_al? }` → 201 contatto; `PUT /api/soggetti/:id/persone/:pid` `{ valido_al }` → 200 (chiude; `:pid` è l'id del contatto).
10. `PUT /api/soggetti/:id/fatturazione` `{ codice_destinatario?, pec_destinatario?, codice_univoco_ufficio?, id_paese_estero?, id_codice_estero?, regime_fiscale?, split_payment?, reverse_charge?, esigibilita_iva?, attiva?, note? }` → 200; upsert 1:1. 400 con il motivo per SDI non di 7, `0000000` senza identificativo estero, `attiva` senza alcun recapito fiscale.
11. `POST /api/soggetti/:id/ruoli` `{ tipo: 'cliente'|'fornitore', ragione_sociale, codice_integra?, citta? }` → 201 ruolo. Crea identità, prima versione (`fonte='crm'`, `valido_dal=oggi`), `versione_corrente_id`, riga in `codici_esterni`; collega `soggetto_id`; tutto in una transazione. 409 se il ruolo c'è già o la P.IVA è doppia in quel ruolo. Il ruolo subagente non si crea qui.
12. Su `GET /api/clienti`, `GET /api/fornitori`, `GET /api/subagenti` (elenco e scheda) ci sono `soggetto_id` e `soggetto_codice`; nient'altro è cambiato.

Errori del database tradotti: doppione (`23505`/`P2002`) → 409, violazione CHECK (`23514`) → 400.

## Seed aggiunto

Dentro la stessa transazione, dopo clienti/fornitori/subagenti:
- **28 soggetti**: 11 dal seed fornitori + 11 dal seed clienti + MCL (uno solo per cliente e fornitore, D-101) + Consorzio Agrario + 4 subagenti `persona`.
- MCL SRL: cliente `C02477` e fornitore `F90012` con la stessa P.IVA `IT08943010155` (normalizzata `08943010155`), CF `02238370638`, sullo stesso soggetto; nota "Cliente e fornitore: due codici di ruolo diversi (D-101)".
- Consorzio Agrario Lombardo: cliente `C01104`, P.IVA `03567890123`, soggetto `sorgente='vecchio_crm'` con nota sulla catena.
- Sedi: 8 (MCL 4 — tre `punto_vendita` e una `fatturazione`; Consorzio 4 — una `legale` e tre `punto_vendita`), una sola predefinita per tipo.
- Recapiti: 5 (MCL email/pec/telefono; Consorzio email/telefono), il primo per uso predefinito.
- Persone: Paolo Rinaldi, referente di **due** soggetti (MCL e Consorzio) in `persone_contatti`.
- Fatturazione: MCL `M5E2RC4` attiva; Consorzio presente ma `attiva=false`.
- I 4 subagenti hanno il CF solo nel master: `subagenti` non ha la colonna.
- Codici esterni totale 25 (22 del seed + i 3 di MCL/Consorzio).
- Il seed si ferma se i dati ci sono già (controllo su `F00031` di Gries, come prima).

## Prove

- `npx tsc --noEmit` in `app/backend`: nessun errore.
- `npx prisma migrate deploy` su `decobrands_test`: applicata `20261108090000_anagrafica_soggetti`; `npx prisma generate`: ok.
- `npx jest --runInBand` **suite per suite**: 37 suite, **528 prove, 0 KO**. Fra le principali: `soggetti` 22, `seed` 8, `vincoli` 33, `clienti` 16, `fornitori` 6, `subagenti` 12, `bollettini` 12, `bollettino` 19, `documenti` 31.
- `test/soggetti.spec.ts` copre: vincoli del database (P.IVA doppia, CF doppio, P.IVA corta, due predefinite, recapiti con 0/2 collegamenti, fatturazione attiva senza recapiti); elenco, ricerca, segmenti e conteggi D-23, paginazione e ordinamento; creazione con codice progressivo; 409/400; modifica con `modifiche` ed evento; disattivazione bloccata e permessa; predefinita che si sposta; recapiti (duplicato, sede altrui, minuscolo, chiusura); fatturazione (SDI, estero, attiva); ruoli cliente/fornitore con versione `crm` e codice esterno; permessi 403; non regressione dello strato 0.

## Controlli caricati e cosa hanno trovato

- **`postgresql-code-review`**: nessun blocco. Rilievi presi in carico e documentati, non "corretti" perché sono la spec: i due UNIQUE dei recapiti non guardano `valido_al`, quindi un recapito chiuso occupa ancora il valore; lo stesso per `persone_contatti`; gli indici parziali sono quelli di §4.1–§4.3. Non si introducono ENUM o RLS: il progetto usa `VARCHAR` + CHECK su tutto lo schema e non ha RLS. La sequenza del codice non è resettata dal `TRUNCATE … RESTART IDENTITY` (non è "owned"): nelle prove la riavvia `test/svuota.ts`, segnalato.
- **`owasp-security`**: nessun rilievo aperto. Tutte le rotte hanno `@Richiede` (prove 403 senza `dati.consulta`/`dati.modifica`); i DTO sono allowlist con `forbidNonWhitelisted`; le query sono parametrizzate da Prisma e `Prisma.raw` è usato solo per `ordina`/`dir` scelti da una lista chiusa; i messaggi d'errore non espongono SQL; niente valori calcolati dal browser (V12).
- **`ponytail-review`**: due rilievi veri corretti. Il messaggio di blocco della disattivazione parlava di `valido_al` sui ruoli, che hanno `attivo`: corretto in "chiudili prima di disattivare il soggetto". Il resto è codice necessario; resta la doppia lettura del nome (SQL per ordinare, ruoli per comporre la riga), tenuta perché D-52 vuole l'ordinamento in SQL. Nessuna astrazione o opzione "per dopo".

## Dubbi e cose lasciate a F1-A9/F1-A10

- Il **ruolo subagente** non si crea da `POST /soggetti/:id/ruoli`: nasce dalla pagina Subagenti (ha codice e agente). Da decidere se la scheda Soggetti debba mostrare un collegamento alla pagina Subagenti o un pulsante che la crea.
- **`PID` del contatto**: `PUT /soggetti/:id/persone/:pid` usa l'id di `persone_contatti`, non quello della persona. Da confermare con la seconda metà (interfaccia).
- **Agente**: `agenti.soggetto_id` c'è ma il seed non collega l'agente Decobrands e i ruoli esposti sono solo cliente/fornitore/subagente, come il prototipo. Da decidere in F1-A8b se l'agente deve comparire.
- **Riapertura di un contatto/recapito chiuso**: gli UNIQUE non tengono conto di `valido_al`. Per ora si modifica la riga; se serve riaprire, va progettato (probabilmente togliendo `valido_al` alla riga esistente).
- **Import e deduplica** (F1-A9), **export file verso Integra** e **`sconti`** (D-102, §8.2) restano fuori. Le decisioni §8 restano aperte.
- La pagina `/soggetti` non è stata aggiunta a `PAGINE` in `accesso.ts` (pagine di ingresso): non serve all'API, la aggiunge F1-A8b insieme alla pagina.

## Righe di documentazione da applicare (non applicate da me)

**`specifica-crm-provvigioni.md` §19** — proposta:

> **D-103 — 08/11/2026 — Anagrafica a soggetti: implementazione additiva (F1-A8a).** `soggetti`, `sedi`, `recapiti`, `persone`, `persone_contatti`, `fatturazione`, `sconti`, `modifiche`, `gruppi`, `settori` si aggiungono; `clienti`, `fornitori`, `agenti`, `subagenti` restano con le stesse chiavi e ricevono `soggetto_id` nullable UNIQUE. Codice `C000123` dalla sequenza `soggetti_codice_seq`; P.IVA/CF unici per paese con indici parziali; `recapiti` senza `attivo` (chiusura con `valido_al`); `sconti` solo tabella. Perché: D-100/D-101/D-102 senza riscrivere pratiche, bollettini e documenti. Chi: Ugo. Dove: `app/backend/prisma/migrations/20261108090000_anagrafica_soggetti`, `src/soggetti.ts`, `specifica-anagrafica-soggetti.md` §10.

**`piano-lavoro-crm.md`** — F1-A8 divisa in due:
- F1-A8a (fatta, ore da approvare): schema, migrazione, API, seed e prove del server;
- F1-A8b (da fare): pagine Soggetti (elenco, scheda, sedi, recapiti, persone, fatturazione, ruoli), `PAGINE` in `accesso.ts`, `guida.js`.

**`avanzamento-app.md`** — riga proposta:

> 08/11/2026 — F1-A8a fatta: anagrafica unica a soggetti (D-100…D-102) additiva, migrazione `20261108090000_anagrafica_soggetti` su `decobrands_test`, API `/api/soggetti` (elenco con conteggi D-23, dettaglio, creazione, modifica, attivo, sedi, recapiti, persone, fatturazione, ruoli) e `/api/persone`; seed con 28 soggetti e il caso MCL (D-101); `npx tsc --noEmit` pulito, 37 suite / 528 prove verdi. Resta F1-A8b (pagine).
