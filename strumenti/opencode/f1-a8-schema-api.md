# Prompt per OpenCode — F1-A8a Anagrafica unica a soggetti: schema e API

Incollalo in OpenCode nella cartella `C:\Progetti\Decobrands_CRM`. È un lavoro da **Sonnet**:
usa **DeepSeek V4.1 Flash** (`deepseek/deepseek-flash`), una sola sessione, senza sottoagenti.

---

Leggi `CLAUDE.md` e `AGENTS.md`. Prima di cercare nei file usa `graphify query "<domanda>"`.
Carica le skill: `ponytail`, `nestjs-best-practices`, `prisma-cli`, `prisma-client-api`,
`supabase-postgres-best-practices`, `javascript-typescript-jest`.
A fine lavoro, per i controlli obbligatori (CLAUDE.md §4.6, codice sensibile), **carica davvero**
e applica `postgresql-code-review`, `owasp-security` e `ponytail-review`; correggi i rilievi veri e
scrivi nel resoconto cosa hanno trovato.

## Compito

F1-A8 del piano: **anagrafica unica a soggetti (D-102), additiva**. Le tabelle esistenti
`clienti`, `fornitori`, `agenti`, `subagenti` restano dove sono e non cambiano chiavi: il master
`soggetti` si aggiunge sopra e i ruoli ci si collegano con `soggetto_id` nullable. Nessuna FK dello
strato 0 si tocca; pratiche, bollettini, documenti e motore continuano a funzionare identici.

Questa prima metà è **solo server**: schema Prisma + migrazione SQL + API + eventi + prove.
Le pagine sono nella seconda metà (`f1-a8-pagine.md`), che parte dopo questa.

Da leggere, solo le parti che servono:
- `piano-lavoro-crm.md`, riga **F1-A8** (e le righe F1-A4, F1-A7 per capire cosa c'è già);
- `specifica-anagrafica-soggetti.md`: **tutta** la §4 (tabelle nuove), la §5 (modifiche allo
  strato 0), la §6 (compatibilità), la §8 (decisioni aperte: non implementarle) e la §9;
- `specifica-crm-provvigioni.md`: §4.2.20, §4.6, §7.13, §8.1, §15.2, §15.4, e nel §19
  D-31, D-33, D-35, D-36, D-45, D-46, D-100, D-101, D-102;
- per capire le regole d'uso, il prototipo già fatto (solo come comportamento, non come codice da
  copiare): `prototipo-alternativo/assets/dati-soggetti.js` e
  `prototipo-alternativo/assets/viste-soggetti.js`.

## Schema Prisma e migrazione

Aggiungi a `app/backend/prisma/schema.prisma` i modelli nuovi, con i nomi esatti della spec §4:

| Tabella | Nota |
|---|---|
| `soggetti` | §4.1: identità e chiavi; `codice` UNIQUE (`C000123`), `natura` azienda/persona, `paese` CHAR(2), `piva`/`piva_norm`, `codice_fiscale`/`cf_norm`, `sorgente`, `attivo`, `note`, date di copia da Integra |
| `sedi` | §4.2: FK `soggetto_id` RESTRICT, `tipo`, insegna, indirizzo, `settore_id`/`gruppo_id` FK, `predefinita`, `attivo`, `valido_dal`/`valido_al` |
| `recapiti` | §4.3: **uno solo** fra `soggetto_id`, `sede_id`, `persona_id`; `tipo`, `valore`, `etichetta`, `predefinito`, date. **Non ha `attivo`**: la chiusura è `valido_al` (il prototipo usa `attivo`, qui no: è la spec a comandare) |
| `persone` | §4.4: nome, cognome, titolo, note, attivo |
| `persone_contatti` | §4.4: persona, soggetto, sede NULL, ruolo, referente, date |
| `fatturazione` | §4.5: PK `soggetto_id` (1:1), SDI, PEC, ufficio, estero, regime, split, reverse, esigibilità, attiva, note |
| `sconti` | §4.6: solo tabella, **senza API e senza UI** in questo lavoro (la regola dello sconto canonico è aperta, §8.2) |
| `modifiche` | §4.7: audit per campo, usato dall'API per le modifiche all'identità |
| `gruppi`, `settori` | §4.8: tabelle di riferimento appese alle sedi |

Modifiche allo strato 0 (§5), solo aggiunte:
- `clienti.soggetto_id`, `fornitori.soggetto_id`, `agenti.soggetto_id`, `subagenti.soggetto_id`:
  `BIGINT NULL UNIQUE` FK → `soggetti(id)` ON DELETE RESTRICT;
- `codici_esterni`: colonna `etichetta VARCHAR(50) NULL`; ampliare i CHECK di `tipo` a
  `cliente | fornitore | subagente | soggetto | sede | interscambio` e di `sistema` a
  `integra | vecchio_crm`. `entita_id` resta senza FK (può puntare a soggetti o a ruoli).

La migrazione va **scritta a mano** in SQL, come `20261108090000_anagrafica_soggetti`, seguendo lo
stile delle migrazioni recenti in `prisma/migrations/` (HEADER in italiano, tutte le istruzioni in
un solo file). Contiene cose che Prisma non sa esprimere:
- indice **parziale** UNIQUE `(paese, piva_norm) WHERE piva_norm <> ''`;
- indice **parziale** UNIQUE `(paese, cf_norm) WHERE piva_norm = '' AND cf_norm <> ''`;
- UNIQUE parziale `(soggetto_id, tipo) WHERE predefinita` su `sedi`;
- CHECK di §4.1 (P.IVA corta rifiutata, `natura`), §4.3 (`num_nonnulls(...) = 1`), §4.5
  (codice SDI `[A-Z0-9]{7}`, `0000000` solo con identificativo estero, `attiva` con almeno un
  recapito fiscale);
- sequenza `soggetti_codice_seq` per il codice progressivo: `codice` si scrive
  `'C' || lpad(nextval('soggetti_codice_seq')::text, 6, '0')` dentro la transazione della creazione;
- indici da §4.2 e §4.3 (`soggetti(piva_norm)`, `soggetti(cf_norm)`, `sedi(soggetto_id)`,
  `sedi(citta, provincia)`, `recapiti` per sede/soggetto, `persone_contatti(persona_id, soggetto_id)`).

Non toccare i trigger delle versioni (`clienti_versioni`, `fornitori_versioni`, D-46): esistono già
e restano. `npx prisma migrate deploy` su `decobrands_test` deve applicare tutto; poi
`npx prisma generate`. Se il nome del database di prova è occupato, crea `decobrands_test_f1a8`
e punta lì `DATABASE_URL_TEST`.

## API

Crea `app/backend/src/soggetti.ts` (puoi dividerlo in più controller nello stesso file) e registralo
in `app.module.ts`. Segui lo stile di `src/subagenti.ts` e `src/clienti.ts`: DTO `class-validator`
con `forbidNonWhitelisted`, `@Richiede(...)`, `contesto(req)`, `logEvent(tx, { ... })` nella stessa
transazione (V13), `id` restituiti come stringa.

Permessi: lettura `dati.consulta`, scrittura `dati.modifica` (D-45).

1. **`GET /api/soggetti`** — elenco per la pagina.
   - Parametri: `q` (codice, nome del ruolo attivo, P.IVA o CF), `vista`
     (`tutti|cliente|fornitore|subagente|nonattivi`), `ordina` (`codice|nome`) e `dir`,
     `pagina`, `righe`.
   - Risposta `{ righe, totale, conteggi }`, come le altre liste del progetto: `conteggi` per i
     5 segmenti calcolati **con gli altri filtri attivi e senza il filtro del segmento** (D-23),
     le righe solo della pagina richiesta, ordinamento e filtro fatti in SQL (D-52).
   - Ogni riga: `id`, `codice`, `natura`, `paese`, `piva`, `piva_norm`, `codice_fiscale`,
     `cf_norm`, `attivo`, `nome` (il nome del primo ruolo attivo, vuoto se nessuno),
     `ruoli: [{ tipo, id, nome, codice, attivo }]`. I codici Integra si leggono da
     `codici_esterni` per il ruolo giusto (D-101: cliente e fornitore possono averne due diversi).
2. **`GET /api/soggetti/:id`** — identità, ruoli, sedi, recapiti (del soggetto, delle sue sedi e
   delle persone collegate), persone + contatti, fatturazione. Tutto dal database.
3. **`POST /api/soggetti`** — `natura`, `paese`, `piva`, `codice_fiscale`, `note`.
   - Normalizzazione come §1.6: si salva il valore com'è scritto **e** quello normalizzato.
   - P.IVA con meno di 11 cifre (e non estera) → 400 con messaggio chiaro: va in scarto, non si
     inventa (§7.4).
   - P.IVA già presente (stesso paese, normalizzata) → 409, con il codice e il nome del soggetto
     esistente nel messaggio. Idem CF quando la P.IVA manca.
   - Né P.IVA né CF → 400.
   - `codice` dalla sequenza; `sorgente = 'crm'`; evento `crud.create` (`entita: 'soggetto'`).
4. **`PUT /api/soggetti/:id`** — stessi campi. Per ogni campo cambiato scrive una riga in
   `modifiche` (`entita='soggetto'`, campo, valore_prima, valore_dopo, utente_id, quando) e un
   evento `crud.update` con `prima`/`dopo`; valgono le stesse validazioni e gli stessi 409.
5. **`POST /api/soggetti/:id/attivo`** — `{ attivo }`. Se `attivo=false` e il soggetto ha ruoli
   attivi → 409 con l'elenco dei ruoli: prima si chiudono i ruoli (`valido_al`). Evento
   `stato.change_state` con `prima`/`dopo`. Niente cancellazioni (§1.4).
6. **Sedi** — `POST /api/soggetti/:id/sedi`, `PUT /api/soggetti/:id/sedi/:sid`. Una sola
   `predefinita` per tipo: il cambio si fa nella stessa transazione (prima si spegne l'altra).
   Chiusura con `valido_al`, niente DELETE. Eventi `crud.create` / `crud.update` su `sede`.
7. **Recapiti** — `POST /api/soggetti/:id/recapiti`, `PUT /api/soggetti/:id/recapiti/:rid`.
   - Decidi il collegamento con `soggetto_id`/`sede_id`/`persona_id` (uno solo, 400 se più d'uno o
     nessuno); la sede o la persona devono appartenere al soggetto (400 se no).
   - Email e PEC in minuscolo e valide; duplicato identico attivo → 409.
   - La "disattivazione" del prototipo qui è `valido_al` (la tabella non ha `attivo`).
   - Eventi `crud.create` / `crud.update` su `recapito`.
8. **Persone e contatti** — `POST /api/persone`, `PUT /api/persone/:id`,
   `POST /api/soggetti/:id/persone` (collega una persona: sede facoltativa, ruolo, referente, date),
   `PUT /api/soggetti/:id/persone/:pid` (chiude il contatto con `valido_al`).
   La stessa persona può essere contatto di più soggetti (§4.4).
9. **Fatturazione** — `PUT /api/soggetti/:id/fatturazione` (upsert 1:1). Validazioni §4.5:
   codice SDI di 7 caratteri o `0000000` solo con identificativo estero; se `attiva`, almeno uno
   fra codice, PEC, codice ufficio, identificativo estero; 400 con il motivo. Evento `crud.update`
   su `fatturazione`.
10. **Ruoli** — `POST /api/soggetti/:id/ruoli` con `{ tipo: 'cliente'|'fornitore',
    ragione_sociale, codice_integra?, citta? }`:
    - crea l'identità in `clienti`/`fornitori`, la **prima versione** (`fonte = 'crm'`,
      `valido_dal = oggi`) e, se c'è il codice, la riga in `codici_esterni`; collega
      `soggetto_id`; tutto in una transazione;
    - 409 se il soggetto ha già quel ruolo o se la P.IVA è doppia in quel ruolo;
    - eventi `crud.create` su `cliente` o `fornitore`.
    - Il ruolo **subagente** si crea dalla pagina Subagenti (ha un codice e un agente suo): qui non
      si crea. Scrivilo nel resoconto.
    - La creazione di un **ruolo nuovo** è ciò che rende la pagina utilizzabile; non è l'import
      massivo (F1-A9), che resta fuori.
11. **Codice soggetto nelle pagine esistenti**: aggiungi `soggetto_id` e `soggetto_codice` alle
    risposte di `GET /api/clienti`, `GET /api/fornitori`, `GET /api/subagenti` (elenco e scheda).
    Serve alla seconda metà per mostrare `C000123` sotto il nome, come nel prototipo. Non cambiare
    nient'altro di quelle risposte.

## Seed dei dati di prova

In `prisma/seed/00-base.ts` (dentro la stessa transazione e dopo clienti/fornitori/subagenti),
aggiungi uno scenario minimo, come nel prototipo:
- crea un soggetto per **ogni** cliente e fornitore del seed, collegando `soggetto_id` (la P.IVA
  c'è già) e mettendo i codici Integra esistenti nella riga `codici_esterni` del ruolo;
- per i 4 subagenti crea un soggetto `persona` con un CF di prova (lo schema `subagenti` non ha il
  CF: va solo nel master, scrivilo nel resoconto);
- aggiungi il caso D-101: un fornitore e un cliente **MCL SRL** con la stessa P.IVA
  (`IT08943010155`), due ruoli sullo stesso soggetto e due codici di ruolo (`F90012`, `C02477`);
- per MCL e per il Consorzio Agrario crea le sedi, due recapiti e la fatturazione elettronica come
  nel prototipo; la stessa persona referente su due soggetti.
- Il seed si ferma se i dati ci sono già: mantieni quel comportamento.

## Prove del server

Crea `app/backend/test/soggetti.spec.ts` (guarda `subagenti.spec.ts` e `vincoli.spec.ts` per
l'avvio dell'app e i vincoli). Deve coprire:
- **vincoli del database**: P.IVA doppia rifiutata dall'indice parziale, due soggetti senza P.IVA
  con lo stesso CF rifiutati, P.IVA corta rifiutata dal CHECK, `sedi` con due predefinite dello
  stesso tipo rifiutate, `recapiti` con due collegamenti (o nessuno) rifiutati, fatturazione
  `attiva` senza recapiti rifiutata;
- **API**: elenco con ricerca, segmenti e conteggi D-23, paginazione e ordinamento; creazione con
  codice progressivo; 409 P.IVA doppia e 400 P.IVA corta/senza dati fiscali; modifica che scrive
  `modifiche` e l'evento `crud.update`; disattivazione bloccata con ruoli attivi e permessa dopo;
  sede predefinita che si sposta; recapito duplicato 409; recapito su sede di un altro soggetto
  400; fatturazione (SDI a 7, estero, `attiva` senza recapiti); creazione ruolo cliente e
  fornitore (versione `fonte='crm'`, codice esterno, doppio ruolo su MCL);
- **permessi**: senza `dati.consulta` 403 in lettura, senza `dati.modifica` 403 in scrittura;
- **non regressione** (DoD del piano): sul seed, una pratica, un bollettino e un documento si
  leggono ancora uguali dopo i collegamenti; i conteggi delle tabelle dello strato 0 non cambiano
  per effetto del solo collegamento; la suite intera resta verde.

## Documentazione

- `specifica-anagrafica-soggetti.md`: aggiungi in fondo una sezione **"Implementazione nell'app
  (F1-A8)"** con: migrazione e nomi veri, scostamenti trovati (es. `recapiti` senza `attivo`),
  cosa resta a F1-A9/F1-A10 (import, export, `sconti`) e le decisioni §8 ancora aperte.
- Nel resoconto scrivi le righe da mettere in `specifica-crm-provvigioni.md` §19 e in
  `avanzamento-app.md` / `piano-lavoro-crm.md`: **non modificarli tu**.

## Regole

- Tutto sul backend (V12, D-28): il browser non calcola niente; l'API non accetta valori calcolati.
- Una operazione, una transazione (V13, D-36): registri ed eventi dentro lo stesso `$transaction`.
- Italiano semplice in codice, commenti e messaggi. Commenti brevi con il rimando alla decisione
  (`// D-101 §19`). Codice minimo (ponytail): niente astrazioni, opzioni o "per dopo".
- Niente librerie nuove. Niente `any` se si può evitare.
- **Non toccare** `app/frontend/`: le pagine sono il lavoro successivo.
- Niente commit, niente push, niente modifiche a `.env`.
- Usa `decobrands_test` per le prove (o `decobrands_test_f1a8` se serve isolamento), **mai**
  `decobrands_db`. Non chiudere processi node che non hai avviato tu.
- Non toccare i file di altri lavori in corso (working tree con modifiche altrui).

## Verifica

1. `npx tsc --noEmit` in `app/backend`.
2. `npx jest --runInBand` **suite per suite** (node va in crash se tutte insieme), 0 KO;
   riporta il numero di prove.
3. `npx prisma migrate deploy` sul database di prova e `npx prisma generate` senza errori.
4. Carica davvero `postgresql-code-review`, `owasp-security`, `ponytail-review` e applica i
   rilievi veri; riporta cosa hanno trovato.

## Resoconto

Scrivi `strumenti/opencode/resoconto-f1-a8a.md` con:
- file creati e toccati, in elenco;
- il DDL vero (nomi di indici, CHECK, sequenza) e le scelte fatte;
- la forma di ogni endpoint (parametri, risposta, errori);
- il seed aggiunto (quanti soggetti, quali casi);
- prove: comando, numero di prove, esito;
- i controlli caricati e cosa hanno trovato;
- i dubbi e le cose lasciate a F1-A9/F1-A10;
- le righe di documentazione da applicare alla spec §19, al piano e ad `avanzamento-app.md`.
