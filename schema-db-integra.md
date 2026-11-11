# Schema del database Integra — riferimento per il CRM Decobrands

> **Scopo:** spiegare come è fatto il gestionale Integra e come il CRM lo legge,
> senza ambiguità. È il riferimento per chi sviluppa e mantiene la sincronizzazione
> delle anagrafiche (§4.5 della specifica) e per chi deve capire da dove arriva un dato.
>
> **Vincolo assoluto (D-100):** Integra è il gestionale di produzione. Il CRM lo interroga
> **solo in lettura (`SELECT`)** e non lo modifica mai, né in sviluppo né in esercizio.
>
> **Fonti:** foreign table importate in `decobrands_db` (schema `integra`), verificate
> sui dati veri l'08/11/2026. Le viste del CRM sono in `public` con prefisso `integra_`
> (D-101), definite in `strumenti/crm-viste-integra.sql`.

---

## 1. Architettura e accesso

| Elemento | Valore |
|---|---|
| Gestionale | Integra, PostgreSQL 14, server remoto |
| Accesso dal CRM | `postgres_fdw` (foreign server `integra_server`) |
| Schema locale | `integra` (17 foreign table) |
| Viste del CRM | `public.integra_v_clienti`, `public.integra_v_fornitori`, `public.integra_v_agenti` |
| Utente in lettura | `crm_lettura` (solo `SELECT`) |

Il CRM **non** si collega mai direttamente a Integra: legge le viste `public`, che a loro
volta leggono le foreign table `integra.*` via FDW. Un guasto di Integra resta fuori dal CRM e
compare come anomalia `integra.connessione`.

Le 17 foreign table importate: `clienti`, `cliazi`, `agenti`, `destinazioni`, `prodotti`,
`classivoci`, `entleg`, `listest`, `listini`, `movtest`, `movrig`, `maginv`, `maginvt`,
`tabpag`, `tabpor`, `tabspe`, `vettori`.

Il server di Integra risponde a intermittenza (verificato il 09/11/2026: una raffica di
`SELECT` è passata, poco dopo la connessione è caduta). Non è un caso da gestire nel CRM:
conferma che la lettura deve stare dietro le viste del ponte e l'anomalia `integra.connessione`.

---

## 2. Il punto più importante: l'anagrafica è unica, il ruolo è in `cliazi` (o in `agenti`)

Integra tiene **una sola anagrafica** per soggetto (persona o azienda), e assegna i ruoli
in tabelle separate: `cliazi` per cliente/fornitore/articolo, `agenti` per l'agente. Lo stesso
soggetto può essere **sia cliente sia fornitore**, con codici diversi. Un agente **non** ha una
riga in `cliazi`: la sua identità sta in `clienti`, il ruolo in `agenti`.

```
clienti  (master anagrafica: chi È il soggetto)
   │  cli_cdcli  = id anagrafica (stabile)
   ├── cliazi   (ruolo: cosa FA, per quale azienda)
   │     │  cla_tipo   = 'C' cliente · 'F' fornitore · 'A' articolo · '-' segnaposto
   │     │  cla_cod    = codice numerico nel ruolo (es. 3208)
   │     │  cla_codstr = codice mostrato nel ruolo (es. "03208")
   │     │  cla_clicdcli = FK → clienti.cli_cdcli
   └── agenti   (ruolo agente, una riga per azienda)
         │  age_cod    = codice agente (es. "021")
         │  age_clicdcli = FK → clienti.cli_cdcli
         │  age_agecod = agente padre ('--' = nessuno)
```

**Esempio reale — DECOBRANDS SRL** (un solo master, due ruoli):

| Campo | Valore |
|---|---|
| `clienti.cli_cdcli` (id anagrafica) | `2` |
| `clienti.cli_cdclistr` (codice anagrafica) | `"00002"` |
| come **cliente**: `cla_cod` / `cla_codstr` | `3208` / `"03208"` |
| come **fornitore**: `cla_cod` / `cla_codstr` | `2` / `"00002"` |

> ⚠ **Trappola n. 1:** `cli_cdcli` (id anagrafica) e `cla_cod` (codice nel ruolo) **non sono
> la stessa cosa**. E `cli_cdclistr` (codice anagrafica) e `cla_codstr` (codice cliente/
> fornitore) **nemmeno**. Il «codice cliente» che compare sui documenti è `cla_codstr`,
> non il codice anagrafica.

---

## 3. Le due tabelle che contano per il CRM

### 3.1 `integra.clienti` — il master (identità del soggetto)

| Colonna | Tipo | Significato | Nota per il CRM |
|---|---|---|---|
| `cli_cdcli` | integer | id anagrafica, stabile | `id_integra` |
| `cli_cdclistr` | varchar | codice anagrafica (padded) | **chiave del soggetto** (`codice_master`); non è il codice cliente |
| `cli_rgsoc` | varchar | ragione sociale | `ragione_sociale` |
| `cli_rgsoc2` | varchar | ragione sociale 2 | — |
| `cli_cognome` / `cli_nome` | varchar | persona fisica | — |
| `cli_indir` / `cli_indir2` | varchar | via | `indirizzo` |
| `cli_cap` | varchar | CAP | `cap` |
| `cli_citta` | varchar | città | `citta` |
| `cli_prov` | varchar | provincia (es. "LC", "MB") | `provincia` |
| `cli_piva` | varchar | partita IVA | `piva` |
| `cli_cfisc` | varchar | codice fiscale | `codice_fiscale` |
| `cli_email` | varchar | email | `email` |
| `cli_pecdest` | varchar | PEC | `pec` (spesso `""`) |
| `cli_stacod` | varchar(3) | codice stato/paese | → `paese` (vedi §5) |
| `cli_obsoleto` | smallint (0/1) | anagrafica dismessa | → `attivo` |
| `cli_dtvar` / `cli_oravar` / `cli_minvar` | date / smallint / smallint | **data + ora + minuti** di ultima modifica | → `modificato_il` |
| `cli_dtins` / `cli_orains` / `cli_minins` | date / smallint / smallint | data + ora + minuti di inserimento | fallback per `modificato_il` |

### 3.2 `integra.cliazi` — il ruolo (cliente / fornitore / articolo)

| Colonna | Tipo | Significato | Nota per il CRM |
|---|---|---|---|
| `azi_cdazi` | varchar | azienda (Decobrands = `"001"`) | **filtro sempre** |
| `cla_tipo` | varchar | `C` cliente · `F` fornitore · `A` articolo · `-` segnaposto | **filtro sempre** |
| `cla_cod` | integer | codice numerico nel ruolo | — |
| `cla_codstr` | varchar | codice mostrato nel ruolo (padded, 5 cifre) | `codice` |
| `cla_clicdcli` | integer | FK → `clienti.cli_cdcli` | join |
| `cla_agecod` / `cla_agecod2` | varchar | codice agente (sentinella `"--"`) | → `agenti.age_cod`; **solo sulle righe `C`** |
| `cla_obsoleto` | smallint (0/1) | ruolo dismesso | → `attivo` |
| `cla_dtvar` / `cla_oravar` / `cla_minvar` | date / smallint / smallint | data + ora + minuti di ultima modifica | → `modificato_il` |

Il resto delle ~200 colonne di `cliazi` (pagamento, listino, fidi, IBAN, porto, vettore, IVA,
ecc.) sono dati commerciali che il CRM **non** usa in questa fase.

**Conteggi reali** (09/11/2026, azienda `001`): 698 righe `C`, 115 righe `F`, 791 righe `A`,
1 riga `-`. Sei soggetti hanno **due ruoli** `C` e `F` (es. DECOBRANDS, cli_cdcli `2`).

**L'agente non è collegato al fornitore** (11/11/2026): il codice agente ce l'hanno **674 clienti
su 698** e **nessuno dei 115 fornitori**. In Integra l'agente è un **ruolo del master** accanto a
cliente e fornitore; chi segue un cliente *per un singolo fornitore* non si legge da qui. Perciò
`codice_agente` del cliente **non** si usa per riempire `interscambio.subagente_id` (D-105): dove
il legame non c'è, quel fornitore non ha rappresentanza per quel cliente.

> ⚠ **Trappola n. 2:** `cla_tipo = 'A'` **non** significa agente: sono **articoli**. Ogni riga
> `A` ha `cla_codstr` uguale a `prodotti.pro_cod` e `clienti.cli_rgsoc` = «codice - descrizione»
> (es. `000310 - 5BT X 8 PZ ROSSA RIGATO STD`). Verificato su tutte le 791 righe. Gli agenti
> stanno in `agenti` (§3.3) e non hanno alcuna riga in `cliazi`.

### 3.3 `integra.agenti` — il ruolo agente

Una riga per azienda e per agente. L'identità (nome, indirizzo, P.IVA) è in `clienti`, letta
con `age_clicdcli`. Per Decobrands l'unico agente principale è **Decobrands stessa**: le righe
dell'azienda `001` sono i **subagenti**. Sono ruoli del master come cliente e fornitore: **nessuno
dei 21 master agente dell'azienda `001` ha righe in `cliazi`** (verificato l'11/11/2026).

| Colonna | Tipo | Significato | Nota per il CRM |
|---|---|---|---|
| `azi_cdazi` | varchar(3) | azienda (`001`) | **filtro sempre** |
| `age_cod` | varchar(6) | codice agente (`"001"`…`"030"`, sentinella `"--"`) | `codici_esterni` tipo `subagente` |
| `age_clicdcli` | integer | FK → `clienti.cli_cdcli` | identità del subagente |
| `age_agecod` | varchar(6) | agente padre (`"--"` = nessuno) | gerarchia: in `002` i subagenti hanno `"001"` |
| `age_maturato` | varchar(3) | base provvigione (`mat` = maturato) | **non** usata: il CRM ha le sue regole |
| `age_provvfissa` / `age_provvincr` | numeric | percentuali dell'agente | **non** usate in questa fase |
| `age_obsoleto` | smallint (0/1) | agente dismesso | → `attivo` |
| `age_dtvar` / `age_oravar` / `age_minvar` | date / smallint / smallint | data + ora + minuti di ultima modifica | → `modificato_il` |

**Conteggi reali** (09/11/2026):

| Dato | Valore |
|---|---|
| Agenti in azienda `001` (escluso `--`) | 21, di cui 18 attivi e 3 obsoleti (`004`, `016`, `020`) |
| Codici agente usati dai clienti | 16: `001 002 003 006 008 009 010 011 013 014 015 017 018 019 021 030` |
| Agenti attivi senza clienti | `005`, `007` |
| Agenti obsoleti | `004`, `016`, `020` |
| `030` | «DIREZIONALE»: usato da 250 clienti, **non** è un subagente da pagare |
| `021` | «Marco Monzani»: nel vecchio CRM era un agente |
| Nome dell'agente | solo `clienti.cli_rgsoc`; `cli_cognome` / `cli_nome` sono vuoti |
| Ruoli `cliazi` degli agenti | nessuno (0 righe) |

In azienda `002` c'è la gerarchia completa: «DECOBRANDS SRL 2» è agente `001`, e i codici
`002`…`013` hanno `age_agecod = '001'` (con un caso annidato: `011` → `010` → `001`). In
azienda `001` tutti gli agenti hanno `age_agecod = "--"`, perché sopra di loro c'è Decobrands,
che non è una riga di `agenti`.

---

## 4. Le viste del CRM: `integra_v_clienti`, `integra_v_fornitori`, `integra_v_agenti`

`integra_v_clienti` e `integra_v_fornitori` leggono `clienti` **JOIN** `cliazi` con
`cla_tipo = 'C'` (clienti) o `'F'` (fornitori) e `azi_cdazi = '001'`. Il join è **inner**: chi
non ha una riga di ruolo in azi `001` non compare. **Non** si filtra sull'obsoleto: i dismessi
compaiono con `attivo = false` (il CRM non li cancella mai, le pratiche restano).

| Colonna vista | Sorgente |
|---|---|
| `id_integra` | `clienti.cli_cdcli` |
| `codice` | `cliazi.cla_codstr` |
| `codice_master` | `clienti.cli_cdclistr` (chiave del soggetto) |
| `ragione_sociale` | `clienti.cli_rgsoc` |
| `piva` | `clienti.cli_piva` |
| `codice_fiscale` | `clienti.cli_cfisc` (vuoto → NULL) |
| `indirizzo` / `cap` / `citta` / `provincia` | `clienti.cli_*` |
| `paese` | `cli_stacod` → `086`=Italia, `094`=Germania, altrimenti NULL |
| `email` | `clienti.cli_email` (vuoto → NULL) |
| `pec` | `clienti.cli_pecdest` (vuoto → NULL) |
| `codice_agente` | `cliazi.cla_agecod` (solo clienti; `"--"` → NULL) |
| `attivo` | `cli_obsoleto = 0 AND cla_obsoleto = 0` |
| `modificato_il` | massimo fra la data+ora+minuti di modifica di master e ruolo |

`integra_v_agenti` legge `agenti` **JOIN** `clienti` su `age_clicdcli = cli_cdcli`, con
`azi_cdazi = '001'` e `age_cod <> '--'`. Una riga per agente/subagente; l'identità è quella del
master.

| Colonna vista | Sorgente |
|---|---|
| `id_integra` | `clienti.cli_cdcli` |
| `codice` | `agenti.age_cod` |
| `codice_master` | `clienti.cli_cdclistr` (chiave del soggetto) |
| `ragione_sociale` | `clienti.cli_rgsoc` |
| `piva` / `codice_fiscale` | `clienti.cli_piva` / `cli_cfisc` (vuoto → NULL) |
| `email` | `clienti.cli_email` (vuoto → NULL) |
| `codice_agente_padre` | `agenti.age_agecod` (`"--"` → NULL) |
| `attivo` | `cli_obsoleto = 0 AND age_obsoleto = 0` |
| `modificato_il` | massimo fra master e `agenti` |

> **La chiave del soggetto è `codice_master`** (`cli_cdclistr`), non `id_integra`: è il codice
> «anagrafica» scritto in Integra (zero-padded, es. `00002`, `04320`), stabile e unico (1888
> codici distinti su 1888 master; solo i due master senza ruoli, `cli_cdcli` 0 e 1, hanno il
> codice vuoto). Lo usa anche `b2b_clienti` del B2B Luis. Il codice del ruolo (`codice`:
> `cla_codstr` / `age_cod`) va in `codici_esterni` accanto a quello master. I possibili doppioni
> della sorgente sono in `doppioni-anagrafica-integra.md`.

> ⚠ **Le viste C/F non bastano per i soggetti.** Il master `clienti` ha 1888 righe, ma
> `integra_v_clienti` + `integra_v_fornitori` ne vedono solo 807 (698 clienti + 115 fornitori,
> 6 in entrambe). Restano fuori i 21 agenti (nessun ruolo `cliazi`) e i 1060 master senza ruolo
> in azienda `001` (in gran parte articoli: 791 righe `cliazi` tipo `A`). Il master `soggetti`
> del CRM si scrive **solo** per chi ha un ruolo — le tre viste, 828 soggetti al massimo
> (D-107); i 1060 senza ruolo non si importano. Se un giorno servirà l'archivio storico, si
> importa a parte leggendo `clienti` con una vista sua.

---

## 5. Regole e convenzioni da rispettare

1. **Azienda unica:** filtrare sempre `azi_cdazi = '001'`. Esiste anche `002` (17 righe) che
   non riguarda Decobrands.
2. **Solo record attivi dove serve:** i flag `*_obsoleto` sono `smallint` 0/1, **non** boolean.
3. **Timestamp in tre colonne:** Integra tiene data, ora e minuti separati
   (`*_dtvar` / `*_oravar` / `*_minvar`). Si consolidano con
   `to_timestamp(extract(epoch from <data>) + <ore>*3600 + <minuti>*60)`.
   La data non ha i secondi e il fuso può spostare l'ora: il CRM legge con un margine di
   un giorno (§4.5).
4. **Sentinella `"--"`:** molti campi «vuoti» (es. `cla_agecod`, `cli_stacod`, `cli_naznasci`)
   valgono la stringa `"--"`, non NULL. Va normalizzata.
5. **PEC e email:** `cli_pecdest` e `cli_email` possono essere stringa vuota `""`, non NULL.
6. **Paese (`cli_stacod`):** è un codice numerico interno (`086` = Italia, `094` = Germania,
   `029`/`050`/`071` = altri). **Non c'è la tabella dei nomi nazione** fra le 17 importate:
   il CRM mappa solo Italia e Germania, gli altri restano NULL finché non si importa la
   tabella `stati`/`nazioni`.
7. **Nessuna FK dichiarata:** i join sono logici; usare `LEFT JOIN` dove il dato può mancare
   (ma per le viste di ruolo l'inner join è voluto: i soggetti senza ruolo non sono
   clienti/fornitori).
8. **`agenti` non ha ruoli `cliazi`:** per sapere che un master è un subagente si guarda
   `agenti`, non `cliazi`. Un agente non è mai anche cliente o fornitore (0 casi il 09/11/2026).

---

## 6. Punti aperti / da decidere

1. **P.IVA estere senza prefisso paese.** I fornitori tedeschi in Integra hanno la P.IVA senza
   `DE` (es. `305997723`, 9 cifre). La validazione del CRM accetta solo 11 cifre o
   «2 lettere + caratteri»: oggi questi fornitori verrebbero scartati come
   `piva_mancante`. Serve decidere se aggiungere il prefisso paese (nel codice o nella vista)
   partendo da `cli_stacod`.
2. **Tabella dei nomi nazione.** Per avere `paese` completo (non solo Italia/Germania) serve
   importare la tabella `stati`/`nazioni` da Integra e fare il join su `cli_stacod`.
3. **`cla_cod` vs `cli_cdcli`.** Per i clienti attuali `cla_cod` e `cli_cdcli` **non**
   coincidono sempre (es. DECOBRANDS: cliente `3208`, anagrafica `2`). Chi fa query manuali
   non deve confonderli (vale anche per le viste B2B di Luis).
4. **Email del cliente** (questione §5.14 della specifica): `cli_email` c'è, ma va confermato
   che sia l'email giusta per il sollecito.
5. **`030` «DIREZIONALE»** è usato da 250 clienti: non è un subagente da pagare. Va escluso
   dall'import dei subagenti (e quei clienti restano senza subagente), oppure mappato a
   Decobrands. Decide Matteo.
6. **Nome e cognome dei subagenti.** Integra ha solo `cli_rgsoc` (per le persone:
   «DE ANGELIS ALESSANDRO», «NISTA», «S4GARDEN»). `subagenti` ha `nome` e `cognome` separati:
   non si può dividere in modo affidabile («DE ANGELIS» può essere nome o cognome). Va deciso
   se usare il nome intero in `nome` con `cognome` vuoto, o aggiungere una denominazione.
7. **Riconciliazione col vecchio CRM.** Il vecchio CRM ha 3 agenti (Decobrands, Marco Monzani,
   Bruno Schwarzmeier) e 23 subagenti; Integra azienda `001` ha 21 agenti, tra cui Marco Monzani
   (`021`) come subagente. La fusione per P.IVA/CF non basta: va deciso chi vince e chi diventa
   subagente di chi.
8. **Agenti senza P.IVA — deciso (D-108).** Un agente senza P.IVA né codice fiscale non entra
   nell'anagrafica; i suoi clienti restano senza subagente e l'import li elenca.
