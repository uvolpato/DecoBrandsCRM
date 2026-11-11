# Specifica — Anagrafica unica a soggetti (proposta da replicare)

**Versione:** 3.1 – 08/11/2026 (v2.0: schema additivo; v3.0: direzione decisa con D-102 — il CRM
è il centro di verità, Integra riceve un file; v3.1: pagine `/soggetti` nell'app, F1-A8b)
**Stato:** **schema in proposta, direzione decisa.** La regola "import da Integra + vecchio CRM,
deduplica, poi il CRM è il padrone e verso Integra si esporta un file" è registrata in spec §19
come **D-102**. Restano aperte le decisioni del §8 (conflitti di deduplica, sconto canonico,
data di stacco, contatti senza P.IVA).
**A cosa serve:** descrivere in modo replicabile lo schema di anagrafica (master + ruoli +
relazioni) emerso dal confronto fra il vecchio CRM e Integra, **senza toccare quello che c'è
già nell'app**.

Riferimenti: `specifica-crm-provvigioni.md` (§4.2, §4.6, §5.7, §19), `schema-db-integra.md`,
`app/backend/prisma/schema.prisma`, `app/backend/src/integra.ts`, `dati-crm-legacy/`.

**Prototipo in dati del CRUD (08/11/2026):** la pagina **Soggetti** del prototipo ufficiale
(`prototipo-alternativo/index.html#/soggetti`, dati in `assets/dati-soggetti.js`, viste in
`assets/viste-soggetti.js`) mostra lo schema in esercizio: master con identità e codice progressivo
`C…`, ruoli cliente/fornitore/subagente collegati con `soggetto_id` sopra lo strato 0 esistente,
sedi con una sola predefinita per tipo, recapiti allegabili a soggetto/sede/persona, fatturazione
elettronica 1:1, P.IVA doppia rifiutata in creazione, niente cancellazioni (`attivo = false`).
Casi dimostrati nel seed: un soggetto con due ruoli e due codici (D-101), una catena come soggetto
unico con N sedi, una persona con ruolo subagente. Fonte di verità per i testi e le maschere
delle pagine futura app.

---

## 0. Regola numero uno: non rompere i legami esistenti

Lo schema nuovo è **additivo**. Non si rinominano tabelle, non si sostituiscono con viste, non
si spostano chiavi primarie. Le tabelle di oggi restano e continuano a essere quelle che il
codice Prisma scrive e legge; il master si aggiunge **sopra** e si collega con colonne nuove
nullable.

Perché: le chiavi esterne in uso sono composite e portano la **versione** del soggetto usata dal
documento (`ordini_fornitore_testata`, `bollettini_testata`, `bollettini_righe`,
`documenti_in_arrivo`). Cambiare la tabella sotto significa riscrivere pratiche, bollettini,
documenti, sincronizzazione e prove. Non serve per avere un'anagrafica unica.

Quindi:

- `clienti`, `clienti_versioni`, `fornitori`, `fornitori_versioni`, `agenti`, `subagenti`,
  `interscambio` **restano identiche** (nomi, colonne, FK, indici).
- Si aggiungono solo: tabelle nuove, colonne nullable, indici nuovi.
- Nessun `DROP`, nessun `RENAME`, nessuna vista al posto di una tabella.
- Le pagine e le API F1–F7 non cambiano; leggono gli stessi campi. I campi nuovi si espongono
  quando servono, uno alla volta.

---

## 1. Principi

1. **Il master non è il ruolo**: `soggetti` contiene l'identità (azienda o persona); `clienti`,
   `fornitori`, `agenti`, `subagenti` sono ruoli 1:1 che puntano al soggetto. Un soggetto può
   essere cliente **e** fornitore (MCL SRL, Green Hub Factory).
2. **Le versioni restano dove sono**: `clienti_versioni` e `fornitori_versioni` sono lo
   snapshot descrittivo usato dai documenti (D-46). Il master non le sostituisce.
3. **Chiave surrogata sempre**; i codici di Integra e del vecchio CRM stanno in
   `codici_esterni`, mai come chiavi.
4. **Niente cancellazioni**: `attivo = false`; i documenti restano appesi alla loro versione.
5. **Date su tutto ciò che è commerciale**: ruoli, relazioni, sconti, sedi, recapiti.
6. **Normalizzazione al confine**: si salva il valore com'è scritto e quello normalizzato.
7. **Nessun valore calcolato dal frontend** (V12, D-28). Una operazione, una transazione
   (V13, D-36).

---

## 2. Numeri che lo schema deve reggere

Dall'estrazione del vecchio CRM (`dati-crm-legacy/`) e dal DB locale:

| Dato | Valore |
|---|---|
| Contatti nel vecchio CRM | 3405 (3358 marcati "cliente", 47 no) |
| Clienti nella vista Integra (`public.integra_v_clienti`) | 698 righe — 680 P.IVA valide, **679 distinte** |
| P.IVA presenti in entrambi | **593** |
| Contatti del vecchio CRM coperti da quelle P.IVA | 724 (la stessa P.IVA su più schede) |
| P.IVA distinte nel vecchio CRM | 1866 |
| Contatti con P.IVA valida | 2143 |
| Contatti senza P.IVA | 1252 |
| P.IVA del vecchio CRM assenti da Integra | 1410 contatti / 1261 P.IVA |
| P.IVA duplicate nel vecchio CRM | 68, su 355 righe (catene con più punti vendita) |
| Legami cliente→fornitore | 4022 (1625 con sconto, 2397 con subagente) |
| Subagenti | 23 in anagrafica, 36 nomi usati nei legami |
| Agenti | 3 (Decobrands, Marco Monzani, Bruno Schwarzmeier) |
| Codici agente in Integra | 16, senza nomi |
| Codice SDI (HUB) | 856 contatti — 854 da 7 caratteri, 1 da 26, 1 da 6 |
| PEC / indirizzo FE | 788 contatti |

---

## 3. Struttura a strati

```
STRATO 0 — già in esercizio, NON si tocca
  clienti · clienti_versioni · fornitori · fornitori_versioni
  agenti · subagenti · interscambio · codici_esterni
  (+ tutte le FK di pratiche, bollettini, documenti, liquidazioni)

STRATO 1 — nuovo, additivo
  soggetti · sedi · recapiti · persone · persone_contatti · fatturazione
  sconti · modifiche

STRATO 2 — collegamenti (colonne nullable aggiunte allo strato 0)
  clienti.soggetto_id · fornitori.soggetto_id
  agenti.soggetto_id · subagenti.soggetto_id
  codici_esterni.etichetta · codici_esterni.tipo ampliato
  interscambio → sconti.relazione_id
```

---

## 4. Tabelle nuove

### 4.1 `soggetti` — il master

Solo identità e chiavi di riconoscimento. I dati descrittivi restano nelle tabelle
`*_versioni` esistenti.

| Colonna | Tipo | Regola |
|---|---|---|
| `id` | BIGSERIAL PK | stabile, mai riusato |
| `codice` | VARCHAR(20) UNIQUE | progressivo nostro (`C000123`), quello che si cita al telefono |
| `natura` | VARCHAR(10) NOT NULL | `azienda` \| `persona` |
| `paese` | CHAR(2) NOT NULL DEFAULT 'IT' | ISO 3166-1 alpha-2, maiuscolo |
| `piva` | VARCHAR(30) | come scritta in origine |
| `piva_norm` | VARCHAR(20) NOT NULL DEFAULT '' | maiuscolo, senza spazi/punti, `IT` tolto se restano 11 cifre |
| `codice_fiscale` | VARCHAR(30) | come scritto |
| `cf_norm` | VARCHAR(20) NOT NULL DEFAULT '' | maiuscolo, senza spazi |
| `sorgente` | VARCHAR(20) NOT NULL DEFAULT 'crm' | `integra` \| `vecchio_crm` \| `crm` |
| `attivo` | BOOLEAN NOT NULL DEFAULT true | |
| `note` | TEXT | |
| `creato_il` | TIMESTAMPTZ NOT NULL DEFAULT now() | |
| `modificato_il` | TIMESTAMPTZ NOT NULL DEFAULT now() | |
| `modificato_in_origine_il` | TIMESTAMPTZ NULL | `modificato_il` della vista (lettura incrementale) |
| `sincronizzato_il` | TIMESTAMPTZ NULL | ultima copia da Integra |

Vincoli, **creati al passo 5 della migrazione** (prima la deduplica):

- `UNIQUE (paese, piva_norm) WHERE piva_norm <> ''`;
- `UNIQUE (paese, cf_norm) WHERE piva_norm = '' AND cf_norm <> ''`;
- `CHECK (piva_norm = '' OR piva_norm ~ '^[0-9]{11}$' OR piva_norm ~ '^[A-Z]{2}[A-Z0-9]{2,}$')`
  — le P.IVA corte (9–10 cifre) non entrano: vanno in scarto;
- `CHECK (natura IN ('azienda','persona'))`.

Durante la transizione, finché i doppioni non sono fusi, l'unicità è un indice **non unico**
(`piva_norm`) e si promuove a UNIQUE al passo 5. Se un doppione non si può fondere, resta un
anomalia aperta nel `registro`, non si inventa una P.IVA.

### 4.2 `sedi`

| Colonna | Tipo | Regola |
|---|---|---|
| `id` | BIGSERIAL PK | |
| `soggetto_id` | BIGINT NOT NULL FK → `soggetti` | ON DELETE RESTRICT |
| `tipo` | VARCHAR(20) NOT NULL | `legale` \| `operativa` \| `punto_vendita` \| `magazzino` \| `fatturazione` |
| `insegna` | VARCHAR(255) | nome del punto vendita (in catena) |
| `indirizzo` · `cap` · `citta` · `provincia` · `paese` | | provincia CHAR(2), paese CHAR(2) |
| `settore_id` · `gruppo_id` | BIGINT FK | il settore è della sede, non dell'azienda |
| `predefinita` | BOOLEAN NOT NULL DEFAULT false | |
| `attivo` | BOOLEAN NOT NULL DEFAULT true | |
| `valido_dal` · `valido_al` | DATE | `valido_al` escluso, NULL = in vigore |

`UNIQUE (soggetto_id, tipo) WHERE predefinita`; indici `(soggetto_id)`, `(citta, provincia)`.
Una catena = **un soggetto** con N sedi `punto_vendita` (Consorzio Agrario 17, Viridea 9,
MCL 8: oggi 34 schede, domani 3 soggetti).

### 4.3 `recapiti`

| Colonna | Tipo | Regola |
|---|---|---|
| `id` | BIGSERIAL PK | |
| `soggetto_id` · `sede_id` · `persona_id` | BIGINT FK | **uno solo valorizzato** |
| `tipo` | VARCHAR(20) NOT NULL | `email` \| `pec` \| `telefono` \| `cellulare` \| `fax` \| `sito` |
| `valore` | VARCHAR(255) NOT NULL | email in minuscolo; telefono in `+39…` |
| `etichetta` | VARCHAR(30) | `ordini` \| `amministrazione` \| `magazzino` \| `direzione` |
| `predefinito` | BOOLEAN NOT NULL DEFAULT false | |
| `valido_dal` · `valido_al` | DATE | |

`CHECK (num_nonnulls(soggetto_id, sede_id, persona_id) = 1)`;
`UNIQUE (soggetto_id, tipo, valore) WHERE soggetto_id IS NOT NULL`;
`UNIQUE (sede_id, tipo, valore) WHERE sede_id IS NOT NULL`.
Una email per cliente non basta: ordini, fatture, PEC, solleciti (§5.14).

### 4.4 `persone` e `persone_contatti`

`persone`: `id`, `nome`, `cognome`, `titolo`, `note`, `attivo`.

`persone_contatti`: `persona_id` FK, `soggetto_id` FK, `sede_id` FK NULL, `ruolo`
(`titolare` \| `acquisti` \| `amministrazione` \| `magazzino` \| `referente`),
`referente` BOOLEAN, `valido_dal` · `valido_al`.

Due tabelle perché la stessa persona può essere referente di due aziende (capita nei gruppi).
`UNIQUE (persona_id, soggetto_id, sede_id)` con indice parziale per `sede_id IS NULL`.

### 4.5 `fatturazione` (1:1 con `soggetti`)

Dati della fatturazione elettronica: sono del **soggetto fiscale**, non del ruolo.

| Colonna | Tipo | Regola |
|---|---|---|
| `soggetto_id` | BIGINT PK FK → `soggetti` | |
| `codice_destinatario` | CHAR(7) | `[A-Z0-9]{7}` oppure `0000000` solo per estero |
| `pec_destinatario` | VARCHAR(255) | alternativa al codice |
| `codice_univoco_ufficio` | CHAR(6) | solo Pubblica Amministrazione (IPA) |
| `id_paese_estero` | CHAR(2) | destinatari esteri senza SDI |
| `id_codice_estero` | VARCHAR(28) | P.IVA / identificativo estero |
| `regime_fiscale` | CHAR(4) | `RF01`…`RF19` |
| `split_payment` · `reverse_charge` | BOOLEAN | |
| `esigibilita_iva` | CHAR(1) | `I` immediata \| `D` differita \| `S` split |
| `attiva` | BOOLEAN NOT NULL DEFAULT false | configurata |
| `note` | TEXT | |

Vincoli:

- `CHECK (codice_destinatario IS NULL OR codice_destinatario ~ '^[A-Z0-9]{7}$')`;
- `CHECK (codice_destinatario <> '0000000' OR id_codice_estero IS NOT NULL)`;
- se `attiva = true`, almeno uno fra `codice_destinatario`, `pec_destinatario`,
  `codice_univoco_ufficio`, `id_codice_estero`;
- nessun UNIQUE sul codice destinatario: `0000000` si ripete per tutti gli esteri.

Tabella a parte, non 8 colonne su `soggetti`: sono dati fiscali che cambiano con
l'amministrazione, e i più non li hanno.

### 4.6 `sconti` (uno o più per `interscambio`)

| Colonna | Tipo | Regola |
|---|---|---|
| `id` | BIGSERIAL PK | |
| `interscambio_id` | BIGINT NOT NULL FK → `interscambio` | ON DELETE CASCADE |
| `ordine` | SMALLINT NOT NULL | 1, 2, … |
| `tipo` | VARCHAR(20) NOT NULL | `commerciale` \| `promozionale` \| `speciale` |
| `percentuale` | NUMERIC(5,2) NOT NULL | 0–100 |
| `valido_dal` · `valido_al` | DATE | |
| `note` | TEXT | |

`UNIQUE (interscambio_id, ordine, valido_dal)`.
`interscambio.sconto` **resta** ed è il valore canonico che decide lo scaglione (§5.7, B4):
`sconti` non lo sostituisce, lo dettaglia. La regola con cui il server calcola `sconto` dal
dettaglio (solo il n. 1, oppure composto 10+5 = 14,5) è una **decisione aperta** (§8).

### 4.7 `modifiche` (audit per campo)

`id`, `entita` VARCHAR(40), `entita_id` BIGINT, `campo` VARCHAR(60), `valore_prima` TEXT,
`valore_dopo` TEXT, `utente_id` BIGINT NULL, `quando` TIMESTAMPTZ NOT NULL DEFAULT now().
Il `registro` (D-31) resta per gli eventi di business; qui si legge chi ha cambiato la P.IVA di
chi.

### 4.8 `gruppi`, `settori`

Tabelle di riferimento appese alle `sedi`: `id`, `codice`, `descrizione`, `attivo`.

---

## 5. Modifiche allo strato 0 (solo aggiunte)

### 5.1 `clienti` — una colonna

`clienti.soggetto_id BIGINT NULL UNIQUE FK → soggetti(id)`.
Prisma: aggiungere il campo e la relazione, nient'altro.

### 5.2 `fornitori` — una colonna

`fornitori.soggetto_id BIGINT NULL UNIQUE FK → soggetti(id)`.

### 5.3 `agenti` e `subagenti` — una colonna ciascuno

`agenti.soggetto_id`, `subagenti.soggetto_id`, nullable e UNIQUE.
**Non** si sposta la chiave primaria su `fornitori`: `interscambio.subagente_id`,
`provvigioni_eccezioni.subagente_id` e `ordini_fornitore_testata.agente_id` continuano a
puntare a `subagenti.id` e `agenti.id` come oggi. `subagenti.agente_id` resta.

### 5.4 `codici_esterni` — una colonna e più valori ammessi

- aggiungere `etichetta VARCHAR(50) NULL`: il codice leggibile dell'anagrafica
  (`cli_cdclistr`), accanto al codice del ruolo (`cla_codstr`) che sta in `codice`;
- ampliare i valori ammessi di `tipo` a `cliente` \| `fornitore` \| `subagente` \|
  `soggetto` \| `sede` \| `interscambio`;
- ampliare `sistema` a `integra` \| `vecchio_crm`;
- invariati `UNIQUE (sistema, tipo, codice)` e `entita_id` senza FK.

**Un soggetto ha due codici di ruolo diversi** (D-101): lo stesso soggetto è cliente `03208` e
fornitore `00002` in Integra. Quindi `codici_esterni` ha **una riga per ruolo**
(`tipo='cliente'` con `codice='03208'`, `tipo='fornitore'` con `codice='00002'`), tutte e due
con `entita_id` = `soggetti.id` (o `clienti.id` / `fornitori.id` finché la migrazione non è
finita). In più una riga `tipo='soggetto'` con `codice` = `id_integra` (`cli_cdcli`), che è la
chiave stabile e non cambia.

**Oggi `app/backend/src/integra.ts` perde `id_integra`**: salva solo `codiceDi(r)` = `codice`,
cioè `cla_codstr`, e usa `id_integra` solo se `codice` è vuoto. La riga `tipo='soggetto'` e la
colonna `etichetta` chiudono il buco senza toccare la tabella: la migrazione riempie
`etichetta` per le righe esistenti e aggiunge la riga con la chiave stabile.

### 5.5 Cosa **non** cambia

`clienti_versioni`, `fornitori_versioni`, `interscambio` (colonne comprese `sconto`,
`pct_subagente`, `regola_mensile`), `provvigioni_scaglioni`, `provvigioni_eccezioni`,
`utenti`, `registro`, `impostazioni`.

---

## 6. Compatibilità: ogni legame esistente e dove resta

| Tabella | Legame | Dopo la migrazione |
|---|---|---|
| `clienti` | `(id, versione_corrente_id)` → `clienti_versioni` | **invariato** |
| `clienti_versioni` | `cliente_id` → `clienti.id` | **invariato** |
| `fornitori` | `(id, versione_corrente_id)` → `fornitori_versioni` | **invariato** |
| `fornitori_versioni` | `fornitore_id` → `fornitori.id` | **invariato** |
| `provvigioni_scaglioni` | `fornitore_id` → `fornitori.id` | **invariato** |
| `provvigioni_eccezioni` | `fornitore_id` → `fornitori.id`, `subagente_id` → `subagenti.id` | **invariato** |
| `interscambio` | `cliente_id` → `clienti.id`, `fornitore_id` → `fornitori.id`, `subagente_id` → `subagenti.id` | **invariato** |
| `ordini_fornitore_testata` (pratiche) | `(fornitore_id, fornitore_versione_id)` → `fornitori_versioni`, `(cliente_id, cliente_versione_id)` → `clienti_versioni`, `agente_id` → `agenti.id` | **invariato** |
| `bollettini_testata` | `(fornitore_id, fornitore_versione_id)` → `fornitori_versioni` | **invariato** |
| `bollettini_righe` | `(cliente_id, cliente_versione_id)` → `clienti_versioni` | **invariato** |
| `documenti_in_arrivo` | `(fornitore_id, fornitore_versione_id)` → `fornitori_versioni` | **invariato** |
| `utenti` | `creato_da` → `utenti.id` su tutte le `*_versioni` | **invariato** |
| `codici_esterni` | `entita_id` (senza FK) → `clienti.id` / `fornitori.id` | **invariato**; i nuovi possono puntare a `soggetti.id` con `tipo='soggetto'` |
| — | `sconti.interscambio_id` → `interscambio.id` | **nuovo** |
| — | `clienti.soggetto_id`, `fornitori.soggetto_id`, `agenti.soggetto_id`, `subagenti.soggetto_id` | **nuovo, nullable** |

Regole di verifica, da lasciare come prova automatica:

1. nessuna FK dello strato 0 cambia nome, tabella di destinazione o comportamento (`RESTRICT` /
   `CASCADE`) — la migrazione è solo `ALTER TABLE … ADD COLUMN` e `CREATE TABLE`;
2. il conteggio righe di ogni tabella dello strato 0 è identico prima e dopo;
3. le prove Jest esistenti girano senza modifiche;
4. una pratica, un bollettino e un documento creati prima della migrazione si leggono e si
   aggiornano dopo.

---

## 7. Import

### 7.1 Ordine

> ⚠ **Dal 11/11/2026 (D-111, D-112) questo ordine vale solo per lo storico.** Le anagrafiche
> **non** si importano più in massa: dalle viste di Integra si importa solo il soggetto che serve a
> un documento o a un legame. Quello che resta da importare in blocco sono le relazioni del vecchio
> CRM (`interscambio_storico`, `soggetti_storico`): vedi §7.7 e §7.8.

1. il master `soggetti` da Integra, **solo per chi ha un ruolo**: clienti da `integra_v_clienti` (698),
   fornitori da `integra_v_fornitori` (109 che non sono già clienti) e **subagenti** da
   `integra_v_agenti` (21). Al massimo 828 soggetti: chi è sia cliente sia fornitore resta un
   soggetto solo. I 1060 master `clienti` senza ruolo in azienda `001` (in gran parte articoli,
   `cliazi` tipo `A`) **non** diventano soggetti: un articolo non è un soggetto (D-107);
   **21 di quei 1060 sono gli agenti**, che non hanno righe in `cliazi` ma entrano dal ramo
   `agenti`;
2. soggetti dal vecchio CRM (3405 contatti);
3. deduplica;
4. `clienti.soggetto_id` / `fornitori.soggetto_id` per le righe esistenti;
5. sedi, recapiti, persone, fatturazione;
6. sconti e `interscambio` **dai legami del vecchio CRM**, non da Integra (il codice agente del
   cliente non dice chi segue quel cliente per un fornitore): dei 4022 legami, i 1625 senza
   subagente sono fornitori **senza rappresentanza** per quel cliente e non entrano;
7. indici UNIQUE su `soggetti` (dopo la fusione dei doppioni);
8. `codici_esterni` per ogni soggetto importato.

Tutto in una transazione; il file sorgente resta in `dati-crm-legacy/` (non versionato).

**Dal passaggio (D-102)** l'import non si ripete più: il CRM è il centro di verità. L'unica
eccezione sono gli aggiornamenti anagrafici e fiscali dei soggetti che restano in Integra, letti
dalle viste; un cliente nuovo si crea nel CRM.

### 7.2 Chiave di riconoscimento

Per ogni riga, nell'ordine: P.IVA normalizzata (stesso `paese`); codice fiscale normalizzato;
**solo proposta**, mai fusione automatica, ragione sociale simile a parità di città.
Trovato → si aggiunge il ruolo o la sede mancante. Non trovato → nuovo soggetto.

### 7.3 Mappatura dal vecchio CRM

| Origine | Destinazione |
|---|---|
| Ragione sociale / nome-cognome | `clienti_versioni` o `fornitori_versioni` (come oggi) + `soggetti` |
| `PARTITA IVA`, campo elenco `VatNumber` | `soggetti.piva` + `piva_norm` |
| Codice fiscale | `soggetti.codice_fiscale` + `cf_norm` |
| `Codice HUB per fattura elettronica` | `fatturazione.codice_destinatario` (solo 7 caratteri) |
| `Indirizzo per fattura elettronica` | `fatturazione.pec_destinatario` |
| Indirizzo, CAP, città, provincia | `sedi` (legale + punto vendita) |
| Email, telefono, fax | `recapiti` con etichetta |
| Contatti persona (91) | `persone` + `persone_contatti` |
| Gruppo, settore | `sedi.gruppo_id`, `sedi.settore_id` |
| `setEditCustomerSupplier` (4022) | `interscambio` (come oggi) |
| Sconto 1 / Sconto 2 | `sconti` (ordine 1 / 2); `interscambio.sconto` = canonico |
| Agente / Subagente del legame | `interscambio.subagente_id` (come oggi) |
| 23 subagenti, 3 agenti | `subagenti` / `agenti` + `soggetto_id` |

### 7.4 Scarti (file separati, non corretti a indovinare)

- P.IVA di 9–10 cifre o con zeri iniziali persi (10 casi noti);
- codice HUB di lunghezza diversa da 7 (2 casi noti);
- 2 schede del vecchio CRM in errore 500 (id 787, 1619): solo dati d'elenco;
- soggetti senza P.IVA, CF né ragione sociale: non sono clienti, sono contatti.

### 7.5 Doppioni

I 68 doppioni (355 righe) **non si cancellano**: si fondono in un soggetto con N sedi. Le
relazioni esistenti si spostano sul soggetto fuso e ogni vecchio codice resta in
`codici_esterni`. La fusione si registra in `modifiche`.

### 7.6 Export verso Integra (D-102)

Il CRM **non scrive su Integra**: la connessione è in sola lettura (D-100). L'esportazione è un
file che carica chi gestisce Integra.

Contenuto minimo per riga:

| Colonna | Da |
|---|---|
| `id_integra` | `codici_esterni` (`tipo='soggetto'`); vuoto = soggetto nuovo |
| `tipo` | `cliente` \| `fornitore` |
| `codice` | `soggetti.codice` se è un soggetto nuovo |
| `ragione_sociale` | `clienti_versioni` / `fornitori_versioni` in vigore |
| `piva` · `codice_fiscale` | versioni in vigore |
| `indirizzo` · `cap` · `citta` · `provincia` · `paese` | `sedi` predefinita |
| `email` · `pec` | `recapiti` predefiniti |
| `codice_destinatario` · `pec_destinatario` | `fatturazione` |

Regole:

- si esportano **solo i soggetti nuovi o modificati** dall'ultimo export (colonna
  `soggetti.modificato_il`), con la data dell'export;
- il file si genera in una transazione di sola lettura, con un evento nel `registro`
  (`export.integra`) e il conteggio delle righe;
- chi carica il file in Integra è una persona, non un servizio: punto aperto (§8);
- se Integra rifiuta una riga, la riga resta nel CRM con l'anomalia nel `registro`, non si
  cancella.

Nessuna importazione automatica di ritorno: un soggetto esportato non torna indietro come
doppione. Il codice che Integra gli assegna si registra in `codici_esterni`.

### 7.7 Import su richiesta da Integra (D-111)

L'anagrafica cresce **quando un documento la chiede**:

1. il documento porta fornitore, `codice_cliente`, P.IVA del cliente (§6.5);
2. il fornitore o il cliente non sono in anagrafica → `GET /api/integra/cerca` (massimo 10 righe,
   per codice esatto, P.IVA o ragione sociale; `dati.importa`), **solo su richiesta esplicita**;
3. una sola riga trovata → *C'è in Integra: importa*; più righe o zero → il messaggio attuale
   (doppioni da correggere in Integra, o registrazione a mano);
4. `POST /api/integra/importa` in **una transazione**: soggetto (con `codice C0000nn`), ruolo,
   `codici_esterni` (`integra`, con `etichetta` = codice del ruolo), versione iniziale
   (`fonte='integra'`), evento nel registro; idempotente per `(sistema, tipo, codice)`;
5. un soggetto già cliente che arriva come fornitore **aggiunge il ruolo**, non un secondo soggetto;
6. la sincronizzazione (§4.5) da qui in poi **aggiorna** quel soggetto e non ne crea altri;
7. il fornitore importato nasce **senza scaglioni**: si compilano a mano prima di aprire una
   pratica (D-113).

**Perché:** l'import massivo obbligava a risolvere prima tutti i doppioni e a decidere `030`,
nomi degli agenti e agenti senza P.IVA; l'import su richiesta porta in anagrafica solo chi ha
documenti, e le stesse decisioni si prendono una volta sola, quando servono.

### 7.8 Storico dei legami (D-112)

Due tabelle di sola lettura per l'app, popolate una volta dai file del vecchio CRM
(`dati-crm-legacy/`, estratto 08/11/2026), **tutte le righe, anche quelle che non si useranno mai**:

| Tabella | Righe | Contenuto | Serve a |
|---|---:|---|---|
| `interscambio_storico` | 4022 | cliente, fornitore, `codice_cliente` del fornitore, agente, subagente, sconto 1/2, id legacy, copie di ragione sociale e P.IVA/CF; `stato` `da_usare`/`usata`/`scartata` | proporre subagente e sconto; dire «non rappresentato» (1625 senza subagente) |
| `soggetti_storico` | 3403 | id legacy, ragione sociale/nome, P.IVA e CF normalizzati, indirizzo, recapiti | riconoscere e creare i **1410 clienti che non sono in Integra** |

L'import scrive nel database **dell'app** (`decobrands_db`): `decobrands_import` è stato soltanto la
prova di importazione del vecchio CRM (Ugo, 11/11/2026).

Regole d'uso:

- **nessuna FK obbligatoria** verso `clienti`/`fornitori`/`subagenti`: `cliente_id`, `fornitore_id`,
  `subagente_id`, `interscambio_id` sono nullable e si riempiono quando i ruoli nascono;
- quando si usa una riga, si crea `interscambio` (e `sconti`) e la riga diventa `usata` con la nota
  e la data;
- i legami **senza subagente** non producono mai provvigione: se arriva un documento, la pratica
  resta chiusa e la card porta *Configura l'agenzia* (Ugo, 11/11/2026);
- lo storico è una **fotografia**: non si sincronizza, non si aggiorna, non sostituisce
  `interscambio`;
- l'import è una transazione, idempotente, con un report di scarti e la data dell'estratto.

**Perché:** due tabelle con copie di testo costano 4022 + 3403 righe e non impongono nessuna
fusione preventiva; con le FK il legame avrebbe trascinato l'import massivo di tutte le anagrafiche,
cioè proprio ciò che D-111 toglie.

---

## 8. Decisioni aperte (da mettere in spec §19 prima di scrivere codice)

**Decisa (D-102):** il CRM è il centro di verità; import iniziale da Integra + vecchio CRM con
deduplica; cliente e fornitore nuovi si censano nel CRM e verso Integra si esporta un file.
Restano aperte:

1. **Conflitti di deduplica**: chi decide quale scheda resta quando due schede hanno la stessa
   P.IVA ma dati diversi? (proposta: la fusione automatica solo a P.IVA/CF uguali; gli altri
   casi li spunta Matteo su un elenco).
2. **Regola dello sconto canonico**: solo lo sconto n. 1, oppure composto? Sui 4022 legami,
   1619 hanno solo Sconto 1, 2 hanno solo Sconto 2, 6 hanno entrambi.
3. **I 1410 contatti con P.IVA assente da Integra**: clienti veri da creare, archivio storico o
   rubrica contatti? Serve la spunta di Matteo (`decisione` in `piva_non_in_integra.csv`).
4. **I 1252 senza P.IVA**: si importano per codice fiscale o si lasciano fuori?
5. **Mappatura agenti — chiarita, restano tre punti (D-106).** Gli agenti di Integra **non**
   stanno in `cliazi`: stanno nella tabella `agenti`, uno per azienda, con l'identità nel master
   `clienti` (`age_clicdcli`). `cliazi.cla_tipo = 'A'` **non** è agente: sono articoli (791 righe,
   `cla_codstr` = `prodotti.pro_cod`). L'azienda `001` ha 21 agenti (18 attivi, 16 usati dai
   clienti) e sono i **subagenti** del CRM, perché l'unico agente principale è Decobrands.
   L'agente è un **ruolo del master** accanto a cliente e fornitore: **non è collegato al
   fornitore**. Il codice agente di Integra sta solo sulla riga cliente (674 su 698; nessuno dei
   115 fornitori) e i 21 master agente non hanno righe in `cliazi`. Perciò `codice_agente` del
   cliente **non** si usa per riempire `interscambio.subagente_id` (D-105): i 1625 legami del
   vecchio CRM senza subagente sono fornitori **senza rappresentanza** per quel cliente.
   Restano da decidere con Matteo:
   - `030` «DIREZIONALE» (250 clienti) non è un subagente da pagare: si esclude o si mappa a
     Decobrands?
   - il nome è solo `clienti.cli_rgsoc` («DE ANGELIS ALESSANDRO»): `subagenti` ha `nome` e
     `cognome` separati e non si possono dividere in modo affidabile;
   - i 21 agenti di Integra contro i 3 agenti e 23 subagenti del vecchio CRM: chi vince, chi
     diventa subagente di chi. La fusione per P.IVA/CF non basta;
   - molti master agente hanno P.IVA vuota: **deciso (D-108)**, un agente senza P.IVA né codice
     fiscale **non entra** nell'anagrafica (niente soggetto, niente subagente); i suoi clienti
     restano senza subagente e l'import li segnala.
6. **36 nomi di subagente nei legami contro 23 in anagrafica**: cessati o refusi?
7. **Data di stacco** del vecchio CRM (scade a gennaio).
8. **Chi carica il file di export in Integra** e con che frequenza (manuale, mensile, a
   richiesta?).
9. **Se Integra deve restare allineata anche in lettura**: dopo il passaggio il CRM continua a
   leggere le viste per i soggetti già presenti, o si smette e Integra diventa solo destinazione
   dell'export?

---

## 9. Cose da non "semplificare"

- **Nessuna vista al posto di `clienti` / `fornitori`**: le FK composite portano la versione del
  documento, e le viste non sono scrivibili (la sincronizzazione crea righe).
- `clienti_versioni` e `fornitori_versioni` **non** si fondono in `soggetti_versioni`: perderebbe
  lo snapshot usato da pratiche, bollettini e documenti.
- `interscambio.sconto` (D-34, §13 B4) resta **il** campo canonico; `sconti` è un dettaglio, non
  un secondo valore che decide.
- La P.IVA doppia in Integra (D-35) resta ammessa finché i doppioni non sono fusi; l'unicità sul
  master si accende dopo, non prima.
- I soldi chiusi non si riscrivono: lo storico resta appeso alla sua versione anche quando la
  scheda viene fusa o disattivata.
- Nessun campo calcolato arriva dal browser (V12).

---

## 10. Implementazione nell'app (F1-A8)

**Migrazione:** `app/backend/prisma/migrations/20261108090000_anagrafica_soggetti/migration.sql`, applicata su `decobrands_test`. Solo `CREATE TABLE`, `ADD COLUMN` e indici nuovi: nessuna tabella o colonna dello strato 0 è stata rinominata o eliminata (`clienti`, `fornitori`, `agenti`, `subagenti` restano le stesse).

**Nomi veri** (Prisma e SQL coincidono, minuscolo come il resto dello schema):
`soggetti`, `sedi`, `recapiti`, `persone`, `persone_contatti`, `fatturazione`, `sconti`, `modifiche`, `gruppi`, `settori`.
Colonne nuove: `clienti.soggetto_id`, `fornitori.soggetto_id`, `agenti.soggetto_id`, `subagenti.soggetto_id` (BIGINT NULL, UNIQUE, FK RESTRICT) e `codici_esterni.etichetta`.

**Vincoli del database** (dove Prisma non arriva):
- `soggetti_codice_seq` + default `('C' || lpad(nextval('soggetti_codice_seq')::text, 6, '0'))`;
- `soggetti_piva_norm_key` UNIQUE `(paese, piva_norm) WHERE piva_norm <> ''`;
- `soggetti_cf_norm_key` UNIQUE `(paese, cf_norm) WHERE piva_norm = '' AND cf_norm <> ''`;
- `soggetti_piva_norm_check` (P.IVA di 11 cifre o `XX…`), `soggetti_natura_check`, `soggetti_sorgente_check`;
- `sedi_predefinita_key` UNIQUE `(soggetto_id, tipo) WHERE predefinita`, `sedi_tipo_check`;
- `recapiti_collegamento_check` (`num_nonnulls(...) = 1`), `recapiti_tipo_check`, UNIQUE parziali per soggetto e per sede;
- `fatturazione_codice_destinatario_check`, `fatturazione_estero_check` (`0000000` solo con identificativo estero), `fatturazione_attiva_check`, `fatturazione_esigibilita_check`;
- `persone_contatti_ruolo_check` e due UNIQUE (`persona_id, soggetto_id`) con e senza sede;
- `sconti_tipo_check`, `sconti_percentuale_check`; `codici_esterni` con `sistema` e `tipo` ampliati.

**Scostamenti e limiti trovati** (scritti qui perché non si "semplifichino"):
- `recapiti` non ha `attivo`, come da §4.3: la chiusura è `valido_al`. Il prototipo usa `attivo`.
- Gli UNIQUE dei recapiti non guardano `valido_al`: un recapito chiuso continua a occupare il suo valore e per riusarlo va modificato, non ricreato.
- Lo stesso vale per `persone_contatti`: un contatto chiuso non si riapre con un secondo `POST`, va modificata la riga esistente (l'API non lo prevede ancora).
- Il CF dei subagenti sta solo in `soggetti`: `subagenti` non ha la colonna (§5.3). Nel seed i quattro subagenti sono soggetti `persona` con un CF di prova.
- `agenti.soggetto_id` esiste ma il seed non collega l'agente Decobrands e l'API non espone il ruolo agente: i ruoli della pagina sono cliente, fornitore e subagente, come nel prototipo.
- Il ruolo **subagente** non si crea da `POST /api/soggetti/:id/ruoli`: nasce dalla pagina Subagenti, che ha un codice e un agente suo.
- `sconti` è solo tabella: nessuna API e nessuna pagina finché la regola dello sconto canonico è aperta (§8.2).
- `PUT /api/soggetti/:id/persone/:pid` chiude il contatto e `:pid` è l'id di `persone_contatti` (non della persona): la stessa persona può avere più contatti.
- Dopo la creazione di un soggetto, `attivo = false` è bloccato finché ha ruoli attivi; i ruoli hanno `attivo`, non un periodo, quindi la chiusura è la disattivazione del ruolo.

**Seed dei dati di prova** (§12): un soggetto per ogni ruolo del seed — 12 fornitori e 13 clienti con MCL condivisa danno 24 soggetti, più 4 subagenti `persona` = **28 soggetti**. MCL SRL è cliente (`C02477`) e fornitore (`F90012`) sullo stesso soggetto (D-101); il Consorzio Agrario Lombardo è un cliente con 4 sedi; MCL ha 4 sedi, 3 recapiti e la fatturazione elettronica attiva; una persona (Paolo Rinaldi) è referente di MCL e del Consorzio. Il seed si ferma se i dati ci sono già (controllo su Gries, come prima).

**Pagine: `/soggetti` (F1-A8b).** In `app/frontend/app/(app)/soggetti/` (`layout.tsx`, `page.tsx`,
`[id]/page.tsx`, `VistaSoggetti.tsx`), la pagina replica `prototipo-alternativo/assets/viste-soggetti.js`
(`vistaSoggetti`): elenco a sinistra e scheda del soggetto a destra; `/soggetti/:id` apre quel
soggetto. Ricerca, segmenti (Tutti · Clienti · Fornitori · Subagenti · Non attivi), ordinamento,
pagina e conteggi arrivano da `GET /api/soggetti` (D-23, V12); le finestre (Nuovo soggetto, Modifica
identità, Aggiungi ruolo, Nuova sede, Nuovo recapito, Fatturazione, Disattiva) mostrano i messaggi
d'errore del server: nel browser non c'è nessuna regola copiata. Le quattro schede hanno i contatori
del prototipo. Il codice del soggetto (`C000123`) si vede sotto il nome anche in Clienti, Fornitori e
Subagenti (`soggetto_codice`).

Scostamenti dal prototipo, per stare dentro la colonna destra dell'app: nel recapito «Disattiva» sta
nella finestra (il componente `FormModal` dell'app ha ora `azioniExtra`, come il prototipo) invece che
in una colonna della tabella; nella scheda Ruoli «clic per aprire» è nella nota sotto la tabella; le
etichette della Fatturazione sono corte (Codice SDI, PEC, ID estero) perché lo spazio è minore.

**Resta per le attività successive:**
- F1-A9: import iniziale da Integra e dal vecchio CRM con deduplica (ordine e chiavi del §7).
- F1-A10 / D-102: export verso Integra come file, `sconti` e regola dello sconto canonico.
- Le decisioni del §8 restano aperte: conflitti di deduplica, sconto canonico, contatti senza P.IVA, mappatura agenti, 36 nomi di subagente, data di stacco, chi carica l'export, se Integra resta in lettura.
