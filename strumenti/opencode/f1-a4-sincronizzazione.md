# Prompt per OpenCode — F1-A4 + F1-A7: sincronizzazione da Integra

Da incollare in OpenCode nella cartella `C:\Progetti\Decobrands_CRM`. Lavoro da Sonnet.

Il ponte vero (F0-A8) aspetta il sistemista. Le viste di Decobrands saranno **come quelle del
portale B2B di Luis** (stesso gestionale Integra), che stanno in `C:\Progetti\DB Integra - Luis`
(`SCHEMA_B2B.md`, `b2b_clienti.sql`, `b2b_master.sql`, …): leggile, sono il modello. Questo
documento dice come adattarle al CRM e come scrivere e provare la sincronizzazione **adesso**,
contro un ponte finto in locale con le stesse colonne.

---

Sei la sessione principale di OpenCode.

## 0. Prima di cominciare

1. Leggi `CLAUDE.md`.
2. Carica le skill con lo strumento `skill`:
   - `fase`, `ponytail`;
   - `nestjs-best-practices`, `prisma-client-api`, `prisma-cli`, `supabase-postgres-best-practices`;
   - `postgresql-code-review`;
   - `javascript-typescript-jest`;
   - `owasp-security`: credenziali di un database esterno.
3. Usa `graphify query "<domanda>"` prima di cercare nei file. Dopo le modifiche, `graphify update .`.
4. Leggi:
   - `C:\Progetti\DB Integra - Luis\SCHEMA_B2B.md` e `b2b_clienti.sql`;
   - nella spec `specifica-crm-provvigioni.md`:
     - §4.5 (sincronizzazione), §4.6 (identità e versioni, D-46);
     - §4.2.1, §4.2.20 e le tabelle `clienti_versioni`, `fornitori_versioni`, `codici_esterni`;
     - §4.2.11 (registro), §4.2.14 (impostazioni), §4.2.15 (`servizi_esecuzioni`);
     - §7.14.3 (problemi `integra.*`), §7.15 (Impostazioni → Sincronizzazione da Integra);
     - D-32;
   - in `piano-lavoro-crm.md` le righe F1-A4 e F1-A7.

## 1. Come è fatto Integra (dalle viste di Luis)

| Cosa | Dove sta in Integra | Nota per il CRM |
|---|---|---|
| Anagrafica (clienti **e** fornitori) | tabella `clienti`, chiave `cli_cdcli` (intero) | un solo soggetto può essere sia cliente sia fornitore: stesso `cli_cdcli` |
| Ruolo per azienda | tabella `cliazi`: `cla_tipo = 'C'` cliente, `'F'` fornitore; `azi_cdazi` = codice azienda | Luis usa `'001'`: **per Decobrands va verificato** |
| Codice leggibile | `cli_cdclistr` (es. `C00412`) | da mostrare; la chiave stabile è `cli_cdcli` |
| Ragione sociale | `cli_rgsoc` + `cli_rgsoc2` (continuazione); per le persone fisiche `cli_cognome`, `cli_nome` | va composta |
| P.IVA / C.F. | `cli_piva`, `cli_cfisc` | P.IVA estere per i fornitori (DE, FR, NL…) |
| Indirizzo | `cli_indir`, `cli_indir2`, `cli_cap`, `cli_citta`, `cli_prov`, `cli_stacod` (stato) | `cli_stacod` = paese |
| Email | `cli_email`, `cli_pecdest` (PEC) | serve per i solleciti (§5.14) |
| Agente | `cliazi.cla_agecod` | **non** si usa ora: si annota (vedi §6, dubbi) |
| Disattivato | `cli_obsoleto`, `cla_obsoleto` (0 = attivo) | |
| Ultima modifica | `cli_dtvar` (data) + `cli_oravar` + `cli_minvar` | niente secondi |

## 2. Cosa cambia rispetto alle viste di Luis (e perché)

Le viste di Luis vanno bene per il B2B, ma il CRM ha bisogni diversi. Le viste del ponte per il CRM
(schema `crm_viste`) devono:

1. **Non filtrare i disattivati**, ma esporli (`attivo boolean`). Luis tiene solo
   `obsoleto = 0`: un cliente disattivato in Integra sparirebbe dalla vista e il CRM non lo
   saprebbe mai. Esposto, il CRM lo segna `attivo = false` (il cliente resta, con le sue pratiche).
2. **Una vista per ruolo**: `v_clienti` (`cla_tipo = 'C'`) e `v_fornitori` (`cla_tipo = 'F'`),
   con la stessa chiave `id_integra = cli_cdcli`.
3. **Data di modifica che non sia mai vuota**: `coalesce(data_modifica, data_inserimento)`.
   Inoltre l'aggiornamento di `cliazi` (es. disattivato solo come fornitore) va considerato:
   `greatest(` data di `clienti`, data di `cliazi` `)`.
4. **Filtro che arriva a Integra.** Luis usa `dblink`: le sue viste **non passano i filtri** a
   Integra, quindi ogni lettura trascina tutte le righe (8.856 clienti a Luis). Ogni 60 secondi è
   troppo. Nel ponte usa **`postgres_fdw`**, che passa il `WHERE data_modifica > …` a Integra,
   oppure una funzione con parametro come `b2b_prezzi_listino()` di Luis:
   `crm_viste.clienti_dal(dal timestamptz)`. Lo sceglie il sistemista; il CRM legge in tutti e due
   i casi con una sola `SELECT … WHERE modificato_il > $1`.
5. **Nessuna password scritta nella vista.** Luis ha la password di Integra in chiaro dentro la
   definizione delle viste e si collega come `postgres`. Nel ponte:
   - server esterno + `USER MAPPING` (`postgres_fdw`);
   - un utente Integra in **sola lettura**;
   - per il CRM l'utente `crm_lettura` con `SELECT` solo sullo schema `crm_viste`.

### Colonne proposte (da confermare col sistemista: scrivile in un file, vedi §3)

`crm_viste.v_clienti`:

| Colonna | Tipo | Da Integra |
|---|---|---|
| `id_integra` | integer | `cli_cdcli` — **chiave per `codici_esterni`** |
| `codice` | varchar(20) | `cli_cdclistr` |
| `ragione_sociale` | varchar(170) | `trim(cli_rgsoc \|\| ' ' \|\| coalesce(cli_rgsoc2,''))`, se vuota `cli_cognome \|\| ' ' \|\| cli_nome` |
| `piva` | varchar(20) | `cli_piva` |
| `codice_fiscale` | varchar(20) | `cli_cfisc` |
| `indirizzo` | varchar(130) | `cli_indir` + `cli_indir2` |
| `cap` · `citta` · `provincia` · `paese` | | `cli_cap` · `cli_citta` · `cli_prov` · `cli_stacod` |
| `email` · `pec` | varchar(100) | `cli_email` · `cli_pecdest` |
| `codice_agente` | varchar(6) | `cla_agecod` (per dopo) |
| `attivo` | boolean | `cli_obsoleto = 0 and cla_obsoleto = 0` |
| `modificato_il` | timestamptz | vedi punto 3 sopra |

`crm_viste.v_fornitori`: le stesse colonne meno `codice_agente`.

## 3. Cosa fare nel CRM

### 3.1 File SQL per il sistemista e per il ponte finto
- `strumenti/integra/viste-crm.sql`:
  - la **proposta** delle viste del ponte, scritta sul modello di `b2b_clienti.sql`, ma con
    `postgres_fdw` e le colonne e regole del §2;
  - in testa, un commento con cosa deve fare il sistemista: estensione, server esterno, user
    mapping con utente Integra in sola lettura, schema `crm_viste`, ruolo `crm_lettura`, la riga
    `pg_hba.conf` per il server del CRM;
  - in fondo, le domande aperte del §6.

  È un documento per lui: non si esegue qui.
- `app/backend/prisma/ponte-prova.sql` + comando `"ponte:prova"` in `package.json`:
  - crea il database **`decobrands_ponte_prova`** con lo schema `crm_viste`;
  - `v_clienti` e `v_fornitori` sono **tabelle** con le stesse colonne del §2 (per il CRM una
    tabella e una vista si leggono uguali);
  - le riempie con clienti e fornitori di `prisma/seed/dati-prova.json`; `id_integra` va inventato
    stabile, per esempio dal numero del codice;
  - crea il ruolo `crm_lettura` con solo `SELECT` (se non hai i permessi per creare un ruolo,
    usa `decobrands` e scrivilo nel resoconto);
  - si può rilanciare da zero e tocca **solo** `decobrands_ponte_prova`;
  - usa `pg` da node se `psql` non c'è.
- **Seed:** il codice in `codici_esterni` oggi è `codice_integra` (es. `C00412`). Con le viste vere
  la chiave diventa `id_integra` (intero, `cli_cdcli`), mentre il codice leggibile si mostra.
  - Scegli una strada e scrivila nel resoconto. Proposta: `codici_esterni.codice` =
    `id_integra` in testo, il codice leggibile in una colonna della versione.
  - Se serve una colonna nuova (es. `codice` in `clienti_versioni`/`fornitori_versioni`), **fermati
    e scrivilo**: le migrazioni le controlla Claude Code. Non crearla.
  - Il seed e il ponte finto devono usare la **stessa** chiave, così il primo giro sul seed non
    crea doppioni.

### 3.2 Servizio di sincronizzazione `app/backend/src/integra.ts`

**Collegamento:**
- un `Pool` di `pg` **separato** da Prisma, solo per il ponte;
- indirizzo da `PONTE_URL` nel `.env`: aggiungilo a `.env.example`, **non** toccare `.env`;
- solo `SELECT` con parametri.

**Colonne in un punto solo:** una costante per vista (nomi delle colonne → campi del CRM), così col
ponte vero si cambia solo lì (`// ponytail: colonne da confermare col ponte vero, F0-A8`).

**Un giro** `sincronizza(db, ponte, ora)`, per ogni vista:
- **Incrementale con margine:** legge le righe con `modificato_il > ultimo_giro_riuscito − 1 giorno`.
  - Il margine serve perché Integra non ha i secondi, e `to_timestamp(extract(epoch from data) …)`
    può sbagliare di 1–2 ore col fuso.
  - Rileggere una riga non fa danni: senza cambi non nasce una versione nuova.
  - Al primo giro legge tutte le righe.
- **Per ogni riga, una transazione sua** (V13), così una riga sbagliata non ferma le altre:
  - **identità** cercata in `codici_esterni(sistema='integra', tipo, codice)`;
  - **se non c'è:** identità + prima versione (`fonte='integra'`) + `versione_corrente_id` +
    `codici_esterni`;
  - **se c'è:** confronta i campi che contano (quelli delle versioni) con la versione corrente,
    dopo averli **normalizzati**:
    - spazi tolti;
    - P.IVA in maiuscolo, senza spazi né punti; il prefisso `IT` tolto solo se dopo restano 11
      cifre;
    - email in minuscolo;

    solo se uno è diverso aggiunge una versione nuova e sposta `versione_corrente_id` (D-46: mai
    aggiornare una versione, il trigger lo vieta);
  - **`attivo`** e i campi tecnici (`modificato_il`, `sincronizzato_il`) stanno sull'identità e si
    sovrascrivono. Un cliente disattivato in Integra diventa `attivo = false`, non si cancella mai;
  - **mai** toccare i campi del CRM: regole del fornitore, agenzie, note.
- **Controlli e problemi** (anomalie del registro §4.2.11, D-31: aperta una per chiave, si ripete,
  si chiude quando il problema sparisce):
  - **P.IVA:** valida = 11 cifre con il controllo per l'Italia, oppure prefisso di due lettere +
    almeno 2 caratteri per l'estero (i fornitori sono tedeschi, francesi…);
  - **cliente senza P.IVA valida:** non si copia e apre `integra.piva_mancante` (§4.2.20). Vedi
    §6, domanda sui privati con solo codice fiscale;
  - **P.IVA doppia** fra due clienti diversi: si copia e apre `integra.piva_doppia`;
  - **ponte irraggiungibile:** `integra.connessione`, dopo **3 giri falliti di fila** (§4.5);
  - **vista o colonna mancante:** `integra.vista`;
  - **giro più lungo di 30 secondi:** `integra.lenta`.
  - Se in `src/registro.ts` non c'è ancora una funzione per aprire e chiudere le anomalie,
    scrivila minima lì, con le prove, e aggiungi gli schemi dei codici in `SCHEMI`.
- **Registro del giro:** una riga in `servizi_esecuzioni` per giro (`servizio='integra'`,
  `tipo='lavoro'`, inizio, fine, esito `ok` · `attenzione` · `errore`, testo con i conteggi: letti,
  nuovi, versioni nuove, disattivati, scartati).
- **Ripetizione:** ogni 60 secondi con `setInterval` (niente librerie nuove).
  - Non parte nelle prove né se manca `PONTE_URL`;
  - un giro non parte se il precedente non è finito.

**Rotte** (permesso `sistema.impostazioni`, vedi `src/accesso.ts`):
- `POST /api/integra/prova` (*Prova la connessione*): risponde `{ ok, ms, clienti, fornitori }`,
  cioè i conteggi delle viste, oppure il messaggio d'errore. **Mai** l'indirizzo o la password;
- `POST /api/integra/sincronizza`: lancia un giro a mano e restituisce i conteggi.

### 3.3 Sicurezza
- La password del ponte non deve finire nei log, nel registro, nelle risposte o nei messaggi:
  pulisci i messaggi di `pg`, che possono contenere la stringa di connessione.
- Solo `SELECT` e solo con parametri.
- Il CRM non conosce l'indirizzo di Integra: solo quello del ponte (D-32).

### 3.4 Cosa NON fare
- Niente pagine (Impostazioni F5-A6, Stato del sistema F5-A5).
- Niente migrazioni e niente modifiche a `schema.prisma`: se serve, fermati e scrivilo.
- Non cambiare le pagine di Fornitori e Clienti.
- Non collegarti a nessun Integra vero, né a quello di Luis.

## 4. Sottoagenti

Due, con `task` (agente `general`):
- **A, server:** §3.1 (ponte finto) e §3.2–3.3;
- **B, prove:** §5. Parte quando A ha fissato i nomi delle funzioni e delle rotte: glieli passi
  tu.

I file comuni li tocchi solo tu: `app.module.ts`, `src/registro.ts`, `package.json`, spec,
`app/README.md`, `.env.example`.

## 5. Prove (`app/backend/test/integra.spec.ts`)

Il CRM su `decobrands_test`; il ponte è `decobrands_ponte_prova`, che la prova riempie e svuota da
sé. Casi:
1. **primo giro:** clienti e fornitori creati con identità, versione e codice; conteggi in
   `servizi_esecuzioni`;
2. **secondo giro senza cambi:** nessuna versione nuova;
3. **cambia la ragione sociale** di un cliente nella vista:
   - una versione in più, `versione_corrente_id` spostato;
   - la versione vecchia intatta;
   - una pratica che puntava alla versione vecchia ci punta ancora (D-46);
4. **cambia solo `modificato_il`, o solo spazi e maiuscole nella P.IVA:** nessuna versione nuova;
5. **un soggetto cliente e fornitore insieme** (stesso `id_integra`): un'identità cliente e una
   fornitore, due righe in `codici_esterni` con `tipo` diverso;
6. **disattivato in Integra** (`attivo = false`): il cliente resta, `attivo = false`, le sue
   pratiche ci sono ancora;
7. **cliente senza P.IVA valida:** non copiato, anomalia aperta; corretto nella vista →
   copiato e anomalia chiusa;
8. **P.IVA estera di un fornitore** (`DE123456789`): accettata;
9. **P.IVA doppia:** anomalia `integra.piva_doppia`;
10. **ponte irraggiungibile:** giro con esito `errore`; l'anomalia `integra.connessione` si apre
    solo al terzo giro fallito; nessuna password nei testi;
11. **colonna mancante nella vista:** anomalia `integra.vista`;
12. **campi del CRM** (es. `giorni_incasso` del fornitore) invariati dopo un giro;
13. **margine:** una riga con `modificato_il` di poco prima dell'ultimo giro viene comunque letta;
14. **rotte:** *Prova la connessione* risponde con i conteggi; un utente senza
    `sistema.impostazioni` riceve 403; nessuna risposta contiene `PONTE_URL`.

Verifica:
- `npx tsc --noEmit`;
- `npx jest --runInBand` (tutte le prove) **due volte di seguito**, con 0 KO.

## 6. Domande aperte (scrivile nel resoconto e in fondo a `viste-crm.sql`)

1. **Codice azienda** di Decobrands in Integra (`azi_cdazi`): è `'001'` come per Luis?
2. **Clienti privati** con solo codice fiscale e senza P.IVA: si scartano (regola di oggi,
   §4.2.20) o si accettano con il codice fiscale?
3. **Email:** per i solleciti (§5.14) vale `cli_email` o la PEC?
4. **`cla_agecod`:** in Decobrands l'agente di Integra corrisponde al subagente? Se sì, più avanti
   può proporre le agenzie. Ora non si usa.
5. **`postgres_fdw` o funzione con parametro**: lo decide il sistemista (§2 punto 4).

## 7. Documenti (li fai tu, alla fine)

- **Spec §4.5:**
  - le colonne delle viste del §2, segnate "proposta, da confermare col ponte vero (F0-A8)";
  - le regole: disattivati esposti e non filtrati, margine di un giorno, filtro che arriva a
    Integra, niente password nelle viste;
  - una riga *Perché* per ciascuna.
- **`app/README.md`:** come si crea il ponte finto (`npm run ponte:prova`) e come si imposta
  `PONTE_URL`.
- **`.env.example`:** `PONTE_URL`.
- Poi `python strumenti/genera-pagine-doc.py`.

Niente commit, niente push, niente `.env`.

## 8. Resoconto

Scrivi `strumenti/opencode/resoconto-f1-a4.md`:
- file e rotte;
- la scelta sulla chiave (`id_integra` o codice) e se serve una colonna;
- l'esito delle prove, comando per comando;
- cosa cambierà col ponte vero;
- le risposte che servono dal sistemista e da Matteo (§6).
