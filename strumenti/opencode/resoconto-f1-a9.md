# Resoconto F1-A9 — Import del vecchio CRM nell'anagrafica a soggetti (prima parte)

**Data:** 08–09/11/2026 · **Agente:** DeepSeek V4 Pro · **Database:** `decobrands_import` (mai `decobrands_db` né `decobrands_test`)

---

## 1. Cosa è stato fatto

Import **one-shot** delle anagrafiche del vecchio CRM (estratto `dati-crm-legacy/` dell'08/11/2026)
nel master `soggetti` e nelle tabelle nuove, senza l'import da Integra (ponte assente, sarà la seconda
parte). Un solo comando, in **una transazione** (V13, D-36), **idempotente**, con `--prova` (rollback +
solo report).

### File creati/toccati

| File | Cosa |
|---|---|
| `app/backend/prisma/import-vecchio-crm.ts` | **il comando dell'import** (creato) |
| `app/backend/prisma/utente-import.ts` | crea gli utenti di prova su `decobrands_import` per la verifica col browser (creato) |
| `app/backend/prisma/verifica-import.js` | query di controllo post-import (creato) |
| `app/backend/package.json` | aggiunto lo script `import:vecchio-crm` (toccato) |
| `strumenti/prove/f1a9_schermate.py` | screenshot 1440 px di `/soggetti` e `/clienti` (creato) |
| `dati-crm-legacy/import/*` | report dell'import (generati, non versionati) |
| `%TEMP%\f1-a9\soggetti-1440.png`, `clienti-1440.png` | screenshot |

**Nessun altro file toccato** (nessuna API, pagina, liquidazione, bollettino, pratica, documento;
nessuna migrazione; nessuna modifica a `.env`).

### Comando

```
cd app/backend
npm run import:vecchio-crm -- --db decobrands_import            # import vero
npm run import:vecchio-crm -- --db decobrands_import --prova    # prova con rollback
npm run import:vecchio-crm -- --db decobrands_import --sostituisci   # rifare da zero (conferma "SI")
```

`--db decobrands_import` scambia il nome del database nella `DATABASE_URL` del `.env` (mai scritto su
disco); c'è un controllo che **rifiuta** qualunque URL che non punti a `/decobrands_import`.

---

## 2. Numeri dell'import (confronto con `riepilogo.json` e `confronto_integra.json`)

| Voce | riepilogo/confronto | import | differenza spiegata |
|---|---|---|---|
| clienti estratti | 3405 | 3403 letti + 2 `scheda_errore` | 2 schede in errore 500 (id 787, 1619): scartate (`scheda_non_leggibile`) |
| con P.IVA valida | 2143 | **2141** | −2 = le 2 `scheda_errore` (avevano una P.IVA d'elenco ma sono state scartate prima del controllo) |
| senza P.IVA | 1252 | 4 con CF + 1248 senza CF = 1252 | ✓ (i 4 con CF diventano soggetti; i 1248 sono **contatti**, decisione 2) |
| P.IVA non valide | 10 | 10 | ✓ |
| P.IVA doppie | 68 (su 355 righe) | **68 fusioni** | ✓ |
| subagenti | 23 | 23 | ✓ |
| agenti | 3 | 3 | ✓ |
| fornitori | 20 | 20 | ✓ (ma 7 senza P.IVA, vedi §5) |
| gruppi | 20 | 20 | ✓ |
| settori | 25 | 25 | ✓ |
| collegamenti | 4022 | 4022 letti · **1587 importati** | la differenza è tutta nei conflitti (vedi §3) |
| contatti persona | 91 | 91 | ✓ |

### Conteggi reali delle tabelle (query di controllo)

`1884 soggetti` · `1858 clienti` (ruoli, tutti con soggetto) · `20 fornitori` · `23 subagenti` ·
`3 agenti` · `1587 interscambio` · `20 gruppi` · `25 settori` · `91 persone` · `2157 sedi` ·
`3833 recapiti` · `76 persone_contatti` · `866 fatturazione` · `626 sconti` · `4059 codici_esterni`.

Controlli passati:
- **0 P.IVA doppie** e **0 CF doppi** in `soggetti` (gli indici parziali tengono da soli);
- **0 clienti orfani** (ogni `clienti` ha il suo `soggetto_id`);
- **68 fusioni** registrate in `modifiche` (campo `fusione`);
- la somma dei legami è **1587 + 2435 conflitti = 4022**: nessun legame perso fuori dai motivi documentati.

---

## 3. Report (`dati-crm-legacy/import/`, non versionati)

- `import-riepilogo.json` — letti/importati/fusi/scartati + tempi;
- `import-fusioni.csv` — 68 righe (una per P.IVA fusa, con i codici delle schede vecchie);
- `import-scarti.csv` — 1404 righe;
- `import-conflitti.csv` — 2442 righe.

### Scarti (1404)

| motivo | n | note |
|---|---|---|
| `contatto` | 1248 | né P.IVA né CF: non sono soggetti (decisione 2, §7.4) |
| `piva_non_valida` | 10 | P.IVA di 9–10 cifre o formato errato (non corrette a indovinare) |
| `identita_assente` | 10 | le stesse 10: nessun CF valido accanto alla P.IVA corta (es. id 863 ha un CF di **15** caratteri, refuso) |
| `hub_0000000` | 117 | HUB `0000000` su soggetto italiano: ignorato (il CHECK lo vuole solo con identificativo estero) |
| `hub_non_7` | 2 | HUB di 26 e di 6 caratteri: ignorata la sola fatturazione, il soggetto entra |
| `scheda_non_leggibile` | 2 | errore 500 nel vecchio CRM (id 787, 1619) |
| `contatto_senza_soggetto` | 15 | contatti persona di schede che non sono diventate soggetti |

### Conflitti (2442)

| motivo | n | spiegazione |
|---|---|---|
| `legame_senza_subagente` | 1625 | il vecchio CRM non ha il subagente su questi legami: `interscambio.subagente_id` è NOT NULL, non si inventa (decisione 5) |
| `subagente_non_trovato` | 266 | 15 nomi di subagente nei legami che non sono fra i 23 importati (Catia Ercoli 147, Paolo Infortuna 49, …) |
| `cliente_non_soggetto` | 461 | legame su una scheda cliente "contatto" (senza P.IVA/CF) |
| `legame_doppio` | 83 | stesso cliente×fornitore dopo la fusione: si tiene il primo (vincolo EXCLUDE, D-35), il resto segnalato |
| `fornitore_senza_piva` | 7 | vedi §5 |

### Esempi di fusione (catene)

`import-fusioni.csv` riporta per ciascun gruppo la chiave e l'elenco dei codici delle schede vecchie.
Esempi tipici: Consorzio Agrario Lombardo, Viridea, OBI ITALIA SRL, UNIEURO (le catene del §2 della spec).

---

## 4. Tempi

- lettura dei file: ~0,2 s
- import (transazione completa, ~1884 soggetti + 3400 schede + 4022 legami): **~9,3 s**
- `--prova` (stessa cosa + rollback): ~9,8 s

Ben dentro il limite di "pochi minuti". Inserimenti a blocchi con `createMany` per sedi/recapiti/
codici/sconti/modifiche/persone; `create` singoli solo dove serve l'id di ritorno (soggetti, ruoli,
versioni, interscambio).

---

## 5. Decisioni prese e scostamenti da segnalare

1. **7 fornitori senza P.IVA** (PACKARA, LUXFORM GLOBAL B.V., ARTE WOHNACCESSORIES GMBH & CO.KG,
   Arte 2, POLYPAP, FRAGRANCE 'N STYLE GMBH, ISA PACKAGING): **importati come ruolo `fornitori` senza
   `soggetto_id`** (nessuna P.IVA/CF nell'estratto), per non perdere i loro ~440 legami. Non si è
   inventata nessuna P.IVA. **Scostamento** dal controllo "ogni fornitore ha il suo soggetto_id"
   (7 restano senza master). → **serve la spunta di Matteo**: o si recupera la P.IVA di questi 7
   fornitori, o si decide di lasciarli fuori dal master.
2. **`clienti_versioni.fonte` / `fornitori_versioni.fonte` = `crm`** (non `vecchio_crm`): il CHECK
   `fonte IN ('integra','crm')` non ammette `vecchio_crm`; la provenienza resta tracciata in
   `soggetti.sorgente='vecchio_crm'` e `codici_esterni.sistema='vecchio_crm'`. **Scostamento**
   documentato (nessuna colonna/migrazione nuova: la decisione 7 "fonte='vecchio_crm'" vale dove lo
   schema lo permette).
3. **10 subagenti e 2 agenti senza P.IVA** → ruolo senza `soggetto_id` (come da passo 8 del brief
   "con il loro soggetto_id quando hanno P.IVA/CF").
4. **1625 legami senza subagente non entrano** (vincolo NOT NULL su `interscambio.subagente_id`).
   Non è un errore dell'import: è un limite del modello, da decidere con Matteo (chi segue quei
   clienti? serve un subagente "Decobrands diretta"?).
5. **`interscambio.sconto` = sconto1** (canone invariato, decisione 4); `sconti` con sconto1 (ordine 1)
   e sconto2 (ordine 2), tipo `commerciale`, **senza alcun ricalcolo** delle provvigioni. 626 righe.
6. **Data di stacco** = 08/11/2026 (l'estratto), `valido_dal` ovunque a quella data; nessun filtro per data.
7. **Nessuna cancellazione**: tutto nasce con `fonte`/`sorgente`/`sistema` da `vecchio_crm`, i doppioni si fondono.

---

## 6. Verifiche eseguite

| Verifica | Esito |
|---|---|
| `npx tsc --noEmit` in `app/backend` | ✓ nessun errore |
| import `--prova` su `decobrands_import` | ✓ rollback, solo report |
| import vero + query di controllo (§2) | ✓ |
| backend avviato su `decobrands_import` (porta 8013) | ✓ `Nest application successfully started` |
| API `GET /soggetti` (1884), `/clienti` (1858), `/fornitori` (20), `/subagenti` (23) | ✓ tutti **200**, nessun 500 |
| screenshot 1440 px `/soggetti` e `/clienti` | ✓ in `%TEMP%\f1-a9\` (nessun errore di pagina) |
| `npx jest --runInBand` | 526 passati, **2 KO** (vedi sotto) |
| skill caricate davvero: `postgresql-code-review`, `owasp-security`, `ponytail-review` | ✓ rilievi applicati, vedi §7 |

### I 2 KO di Jest (NON causati dall'import)

La prova ha superato la mezzanotte (Roma 09/11, UTC ancora 08/11) e ha fatto emergere **due test
datati, preesistenti**, non toccati da questo lavoro:

1. `test/soggetti.spec.ts:261` — confronta `giornoRoma(new Date())` (Roma, 09/11) con
   `new Date().toISOString().slice(0,10)` (UTC, 08/11). Fra le 00:00 e le 01:00 di Roma il confronto
   è sempre falso. Passa da solo dopo l'una di notte.
2. `test/sistema.spec.ts:127` — "6 allegati letti oggi" vs "nessun allegato oggi": stessa causa
   (l'esecuzione di "1 minuto fa" cade il giorno prima a cavallo della mezzanotte).

Entrambi passano fuori dalla finestra di mezzanotte; **nessuno dipende dall'import**: i file nuovi
sono solo aggiunte (`import-vecchio-crm.ts`, `utente-import.ts`, `verifica-import.js`, lo script in
`package.json`), nessun `.spec.ts`, nessun `src/`, nessun seed è stato toccato. Nota: in `git status`
risultano già modificati (da altri lavori) `src/sistema.ts` e `test/sistema.spec.ts` — non opera di
questa slice.

---

## 7. Controlli di revisione (skill caricate davvero)

- **`owasp-security`**: nessun rischio di injection (strumento CLI, file locali, Prisma
  parametrizzato; `$executeRawUnsafe` solo con nomi di tabella fissi nello svuotamento `--sostituisci`).
  La password non viene mai stampata. Il controllo su `decobrands_import` impedisce scritture sul
  database sbagliato. Nessun rilievo da correggere.
- **`postgresql-code-review`**: nessun anti-pattern rilevante. `createMany` per i blocchi, indice
  parziale `soggetti_piva_norm_key` rispettato (0 doppioni), nessuna query N+1 grave.
- **`ponytail-review`**: corretto il lookup O(n²) `schede.find(...)` → `Map` O(1) (2 righe). Resta
  volutamente non "semplificato": il fatto che i 7 fornitori senza P.IVA restino orfani e che
  `fonte='crm'` non sia `vecchio_crm` sono **decisioni** documentate, non omissioni.

---

## 8. Cose che servono a Matteo (dubbi aperti)

1. **7 fornitori senza P.IVA** (elenco in §5.1): recuperare la P.IVA o decidere se lasciarli senza master.
2. **1625 legami senza subagente**: chi segue quei clienti?
3. **15 nomi di subagente nei legami non fra i 23 importati** (Catia Ercoli, Paolo Infortuna,
   Bruno Sestito, Mauro SNC, …): cessati o refusi? (spec §8.6)
4. **1248 contatti senza P.IVA né CF** (decisione 2: restano fuori dal master): clienti veri da
   creare, archivio storico o rubrica? (spec §8.4)
5. **10 P.IVA corte/non valide** (fra cui id 863 con CF di 15 caratteri): refusi da correggere a mano.
6. **117 HUB `0000000` su soggetti italiani**: ignorati (il modello li vuole solo per gli esteri);
   verificare se hanno una PEC o un codice SDI vero.
7. Nomi simili **non fusi** (solo proposta, decisione 1): andrebbero spuntati a parte — l'import non
   li fonde, restano soggetti distinti.

---

## 9. Righe di documentazione da applicare (NON applicate qui)

Queste vanno aggiunte a mano (fuori dal permesso di questa slice), dopo l'approvazione dei punti §5/§8:

- **`specifica-crm-provvigioni.md` §19** — nuova decisione **D-1xx**: "Import one-shot del vecchio
  CRM (F1-A9): `npm run import:vecchio-crm -- --db decobrands_import [--prova] [--sostituisci]`; una
  transazione, idempotente; 7 fornitori senza P.IVA restano ruolo senza soggetto; `*_versioni.fonte='crm'`
  perché il CHECK non ammette `vecchio_crm`; legami senza subagente e subagenti non riconosciuti nel
  report". Registrare anche i numeri (1884 soggetti, 1858 clienti, 1587 interscambio).
- **`piano-lavoro-crm.md` riga F1-A9** — chiudere la prima parte con le ore effettive (da approvare);
  la seconda parte resta F1-A8/F0-A8 (import da Integra quando il ponte c'è).
- **`avanzamento-app.md`** — nota F1-A9: import vecchio CRM fatto su `decobrands_import`, numeri e
  punti aperti per Matteo (§8).

---

## 10. Nota di coerenza minore

Il brief elenca `piva_solo_in_integra.csv`, ma il file dell'estratto si chiama
**`piva_solo_integra.csv`** (senza il secondo `_in_`). Nessun impatto sull'import: il file non è
usato dal comando (serve solo alla fase Integra).
