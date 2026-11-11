# Doppioni dell'anagrafica di Integra

**Data:** 09/11/2026 · **Fonte:** viste `public.integra_v_clienti`, `integra_v_fornitori`, `integra_v_agenti` (azienda `001`) · **Ambito:** i **828 master** che hanno almeno un ruolo (698 clienti + 115 fornitori + 21 agenti, con 6 master condivisi fra cliente e fornitore). I master senza ruolo (in gran parte articoli) restano fuori (D-107).

**Come leggere i codici.** In Integra ogni master ha **due codici**:
- **codice master** = `clienti.cli_cdclistr` (es. `00002`, `04320`): è la chiave del soggetto, la stessa che usa la vista clienti del B2B Luis (`codice_master`);
- **codice entità** = `cliazi.cla_codstr` per cliente/fornitore (es. `03208`) o `agenti.age_cod` per l'agente (es. `001`).

Tutte e tre le viste del CRM ora espongono `codice_master` (prima mancava su clienti e fornitori).

**Come ho cercato:** stessa P.IVA su master diversi; stesso nome normalizzato su master diversi; agente che è anche fornitore; casi dubbi guardati a mano. Le query sono in fondo.

**Esito:** nella prima colonna, `U` = stesso soggetto (da unire), `D` = soggetti diversi (da lasciare). Da compilare a cura di Matteo/Integra.

**Stato al 10/11/2026.** Matteo ha annotato i fogli 4 e 5 (il file con le sue note è la copia di lavoro): Flover `D` (omonimi), Toscana Carte stesso soggetto del fornitore (P.IVA da correggere), Eurosand `04349` vecchio nome di `04225` (da unire), Manfron società vecchia/nuova (`D`), `016` e `020` vecchi subagenti; per KIMI e SOGEFER il cliente esiste solo per la provvigione del fornitore, A.G.E.P.A. da identificare. Ha aggiunto i prefissi paese alle P.IVA estere (mancano ancora EUROSAND GMBH, BROCKYTONY, LUXFORM; il prefisso svizzero è `CHE`, da decidere se `CH`). **Fogli 1, 2 e 3 aperti per Laura e Rosario.**

---

## 1. Stessa P.IVA su due master (16 coppie, 32 master → 16 soggetti)

| Esito | P.IVA | Master A | Master B | Nota |
|---|---|---|---|---|
| ☐ | 00689730133 | `03765` · C `03556` + F `00044` · SACCHI GIUSEPPE SPA · BARZANO | `04834` · F `00093` · SACCHI GIUSEPPE SPA · BARZANO | il master `03765` ha già cliente+fornitore; `04834` è il fornitore doppio |
| ☐ | 01138540354 | `03365` · C `03278` · LEBEZ SPA · CORREGGIO | `04368` · F `00081` · LEBEZ SPA · CORREGGIO | |
| ☐ | 02564920300 | `04332` · A `014` · MAZZUCHIN LUCA | `03385` · F `00041` · MAZZUCHIN LUCA · TAVAGNACCO | anche in §2 |
| ☐ | 03148490265 | `04321` · A `002` · BASTASIN | `03384` · F `00040` · BASTASIN MAURIZIO · TREVIGNANO | anche in §2 |
| ☐ | 03559920172 | `04289` · C `03610` · L'ECOLE DES FLEURS DI ALBA FRANZONI · CASTEGNATO | `03224` · F `00023` · FRANZONI ALBA · CASTEGNATO | nomi diversi, stessa P.IVA |
| ☐ | 03601260130 | `00002` · C `03208` + F `00002` · DECOBRANDS SRL · MERATE | `04388` · C `03656` + F `00086` · DECOBRANDS SRL 2 · MERATE | anche in §3 |
| ☐ | 03716720614 | `04320` · A `001` · NISTA | `04993` · F `00108` · NISTA ALFREDO · SAN MARCELLINO | anche in §2 |
| ☐ | 04243890235 | `04327` · A `008` · S4GARDEN | `03356` · F `00033` · SERVICE 4GARDEN SRLS · SONO PROVINCIA | anche in §2 |
| ☐ | 05583420012 | `03199` · C `03179` · SINTESI E RICERCA SPA · DRONERO | `03219` · F `00027` · SER SPA · DRONERO | nomi diversi, stessa P.IVA |
| ☐ | 05602640962 | `03936` · C `03444` · BRICOCENTER ITALIA SRL · ROZZANO | `04988` · F `00107` · BRICOCENTER ITALIA SRL · ROZZANO | |
| ☐ | 07922311001 | `04322` · A `003` · DE ANGELIS ALESSANDRO | `03355` · F `00032` · DEANGELIS ALESSANDRO SAS · ROMA | anche in §2 |
| ☐ | 121967733 | `03346` · C `03266` · GASPER GMBH · KOLN | `03189` · F `00009` · GASPER GMBH · COLONIA | |
| ☐ | 203570005 | `04220` · C `03571` · FLEUR AMI GMBH · TONISVORST | `04343` · F `00079` · FLEUR AMI GMBH · TONISVORST | |
| ☐ | 221547562 | `03344` · C `03265` · INGE'S CHRISTMAS DECOR GMBH · NEUSTADT BEI COBURG | `03193` · F `00013` · INGE'S CHRISTMAS DECOR GMBH · NUESTADT | |
| ☐ | 254615074 | `04274` · F `00073` · MOTEL ONE FRANKFURT · FRANKFURT | `04318` · F `00078` · MOTEL ONE FRANKFURT · FRANKFURT | due master **fornitore** |
| ☐ | 367780065 | `03348` · C `03269` · IPURO GMBH · FRANKFURT AM MAIN | `03314` · F `00031` · IPURO GMBH · NIEDERNBERG | |

> Se una coppia resta `D`, il CRM la importerà come due soggetti distinti (la chiave è il codice master).

---

## 2. Agente che è anche fornitore (11)

Sono la stessa persona/azienda su due master: uno con il ruolo agente, l'altro con il ruolo fornitore (in Integra il fornitore serve per pagare le provvigioni). **Non vanno importati come due soggetti** e i master fornitore **non devono diventare "fornitori"** del CRM (i fornitori del CRM sono i preponenti: Gries, Gasper, …).

| Esito | Agente | Master agente | Master fornitore | P.IVA | Clienti | Nota |
|---|---|---|---|---|---|---|
| ☐ | `001` NISTA | `04320` | F `00108` · `04993` NISTA ALFREDO | 03716720614 (sul fornitore) | 32 | in §1 |
| ☐ | `002` BASTASIN | `04321` | F `00040` · `03384` BASTASIN MAURIZIO | 03148490265 (sul fornitore) | 45 | in §1 |
| ☐ | `003` DE ANGELIS ALESSANDRO | `04322` | F `00032` · `03355` DEANGELIS ALESSANDRO SAS | 07922311001 | 26 | in §1 |
| ☐ | `005` CANCELLIERI | `04324` | F `00010` · `03190` MARCO CANCELLIERI | **02418260416 solo sul fornitore** | 0 | |
| ☐ | `006` GRANATA RICCARDO | `04325` | F `00034` · `03357` GRANATA RICCARDO | **01796840468 solo sul fornitore** | 66 | |
| ☐ | `008` S4GARDEN | `04327` | F `00033` · `03356` SERVICE 4GARDEN SRLS | 04243890235 | 82 | in §1 |
| ☐ | `010` SANTORO | `04329` | F `00061` · `04223` ANGELO SANTORO | **02381520739 solo sul fornitore** | 20 | |
| ☐ | `014` MAZZUCHIN LUCA | `04332` | F `00041` · `03385` MAZZUCHIN LUCA | 02564920300 | 21 | in §1 |
| ☐ | `015` CAPARELLI GIANCARLO | `04333` | F `00039` · `03383` CAPARELLI | **04597250168 solo sul fornitore** | 14 | |
| ☐ | `017` FUSI RICCARDO | `04335` | F `00087` · `04418` FUSI RICCARDO | **01809980038 solo sul fornitore** | 33 | |
| ☐ | `018` GIBIN GIOVANNI | `04336` | F `00098` · `04840` GIBIN GIOVANNI | **04627430236 solo sul fornitore** | 3 | |

> Per i **6 in grassetto** la P.IVA e il CF esistono in Integra ma **solo sul master fornitore**: basta spostarli (o unire i due master) e non sono più «senza dati fiscali».

---

## 3. Decobrands: tre master

| Esito | Codice master | Ruoli | Nome | P.IVA | Nota |
|---|---|---|---|---|---|
| ☐ | `00002` | C `03208`, F `00002` | DECOBRANDS SRL | 03601260130 | è il master buono |
| ☐ | `04388` | C `03656`, F `00086` | DECOBRANDS SRL 2 | 03601260130 | doppione con "2" |
| ☐ | `04903` | A `030` | DIREZIONALE | — | è il codice agente «direzione»: sono i clienti seguiti direttamente da Decobrands |

**Proposta:** tenere `00002`; spostare su `00002` il ruolo agente `030` e i ruoli di `04388`; eliminare `04388` e `04903`.

---

## 4. Stesso nome, P.IVA diversa o assente (da verificare a mano)

| Esito | Master | Nome | P.IVA | Città | Nota |
|---|---|---|---|---|---|
| ☐ | `04267` C `03596` | TOSCANA CARTE PREGIATE | **`,`** | — | probabile doppione del fornitore sotto; la P.IVA è una virgola |
| ☐ | `04963` F `00101` | TOSCANA CARTE PREGIATE SRL | 01780080477 | MONSUMMANO | |
| ☐ | `04349` C `03632` | EUROSAND GMBH | 812702540 | — | P.IVA diversa da «2.0»: da verificare |
| ☐ | `04225` C `03677` + F `00062` | EUROSAND 2.0 GMBH | 454745334 | WEIDEN I.D.OPF. | |
| ☐ | `03235` C `03194` | MANFRON L'EVOLUZIONE DEL FIORE DI ROSO GIACOMO | 03979100249 | VALLI DEL PASUBIO | stessa città, P.IVA diverse: probabilmente **non** doppione |
| ☐ | `03442` C `03314` | SOCIETA' AGRICOLA MANFRON L'EVOLUZIONE DEL FIORE | 04615820240 | VALLI DEL PASUBIO | |
| — | `03767` C `03327` | FLOVER S.R.L. | 02109450235 | BUSSOLENGO | **omonimi, non doppioni** |
| — | `03769` C `03328` | SOCIETA' AGRICOLA FLOVER S.R.L. | 02535690982 | DESENZANO DEL GARDA | |
| — | `04261` C `03592` | FLOVER SRL | 08066741219 | NAPOLI | |

---

## 5. Dati che bloccano l'import (non sono doppioni, ma vanno sistemati)

**a) Agenti senza P.IVA né CF sul master agente** (11). Sei hanno la P.IVA sul master fornitore (§2); gli altri cinque no.

| Esito | Codice | Master | Nome | Clienti | P.IVA sul fornitore? |
|---|---|---|---|---|---|
| ☐ | `005` | `04324` | CANCELLIERI | 0 | sì (`03190`) |
| ☐ | `006` | `04325` | GRANATA RICCARDO | 66 | sì (`03357`) |
| ☐ | `007` | `04326` | NERI LUCA | 0 | no |
| ☐ | `009` | `04328` | LILLIU SILVANO | 68 | no |
| ☐ | `010` | `04329` | SANTORO | 20 | sì (`04223`) |
| ☐ | `015` | `04333` | CAPARELLI GIANCARLO | 14 | sì (`03383`) |
| ☐ | `016` | `04334` | ROSSI ALESSIO (spento) | 0 | no |
| ☐ | `017` | `04335` | FUSI RICCARDO | 33 | sì (`04418`) |
| ☐ | `018` | `04336` | GIBIN GIOVANNI | 3 | sì (`04840`) |
| ☐ | `019` | `04337` | DE MARIANIS FERNANDO | 5 | no |
| ☐ | `020` | `04338` | CASINI SIMONA (spento) | 0 | no |

**b) Clienti senza P.IVA e senza CF** (3): `00004` · C `00002` A.G.E.P.A. SAS di Mingione Eugenio & C · `04095` · C `03489` KIMI SRL · `04141` · C `03520` SOGEFER SRL. In più `04267` TOSCANA CARTE PREGIATE ha la P.IVA `","`.

**c) P.IVA estere senza prefisso paese** (23 righe, di cui 16 distinte): non passano la validazione del CRM (11 cifre o «2 lettere + caratteri») e oggi verrebbero scartate. Sono fornitori tedeschi/olandesi/belgi: FRAGRANCE AND STYLE `305997723`, PACKARA B.V. `850311305B01`, ARTE WOHNACCESSOIRES `813450712`, DA MORENO SA `148257791`, INGE'S `221547562`, GASPER `121967733`, IPURO `367780065`, FLEUR AMI `203570005`, EUROSAND 2.0 `454745334`, EUROSAND `812702540`, BROCKYTONY `814960605`, LUXFORM GLOBAL BV `814245997B01`, GRIES DECO `132085427`, B & B HOTEL DARMSTADT `298095507`, MOTEL ONE `254615074`, COR MULDER `811195022`. Per PACKARA, DA MORENO e LUXFORM manca anche il paese (`cli_stacod` non mappato): da aggiungere in Integra o nella vista (§6.1 di `schema-db-integra.md`).

---

## 6. Le query usate

```sql
-- stesse P.IVA su master diversi (le viste espongono codice_master)
with m as (
  select 'C' t, id_integra, codice, ragione_sociale, piva from public.integra_v_clienti
  union all select 'F', id_integra, codice, ragione_sociale, piva from public.integra_v_fornitori
  union all select 'A', id_integra, codice, ragione_sociale, piva from public.integra_v_agenti
), n as (
  select t, id_integra, codice, btrim(ragione_sociale) nome,
         upper(regexp_replace(btrim(piva),'[^A-Za-z0-9]','','g')) pn
  from m where piva is not null and btrim(piva) <> ''
)
select n.pn, n.t, c.cli_cdclistr master, n.codice, n.nome
from n join integra.clienti c on c.cli_cdcli = n.id_integra
where n.pn in (select pn from n group by pn having count(distinct id_integra) > 1)
order by n.pn, n.t;
```

```sql
-- stesso nome normalizzato su master diversi
with m as (
  select 'C' t, id_integra, codice, ragione_sociale from public.integra_v_clienti
  union all select 'F', id_integra, codice, ragione_sociale from public.integra_v_fornitori
  union all select 'A', id_integra, codice, ragione_sociale from public.integra_v_agenti
)
select upper(regexp_replace(btrim(ragione_sociale),'[^A-Za-z0-9]','','g')) k,
       count(distinct id_integra) master,
       string_agg(t || ':' || id_integra || ':' || codice || ':' || btrim(ragione_sociale), ' || ') righe
from m group by k having count(distinct id_integra) > 1;
```

```sql
-- P.IVA che non passano la validazione del CRM
with m as (
  select 'C' t, id_integra, codice, ragione_sociale, piva from public.integra_v_clienti
  union all select 'F', id_integra, codice, ragione_sociale, piva from public.integra_v_fornitori
  union all select 'A', id_integra, codice, ragione_sociale, piva from public.integra_v_agenti
), n as (
  select t, id_integra, codice, btrim(ragione_sociale) nome,
         upper(regexp_replace(btrim(piva),'[^A-Za-z0-9]','','g')) pn
  from m where piva is not null and btrim(piva) <> ''
)
select n.t, c.cli_cdclistr master, n.codice, n.nome, n.pn
from n join integra.clienti c on c.cli_cdcli = n.id_integra
where n.pn !~ '^[0-9]{11}$' and n.pn !~ '^[A-Z]{2}[A-Z0-9]{2,}$'
order by n.t, master;
```

---

*Nota:* i master con codice vuoto sono solo due e non hanno ruoli (`cli_cdcli` 0 e 1: `--` e «Raccoglitore distinte/ricevute carrello»). Tutti gli 828 master con ruolo hanno un codice master.
