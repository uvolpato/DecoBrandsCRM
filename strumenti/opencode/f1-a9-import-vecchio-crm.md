# Prompt per OpenCode — F1-A9 Import del vecchio CRM nell'anagrafica a soggetti

Incollalo in OpenCode nella cartella `C:\Progetti\Decobrands_CRM`. È un lavoro da **Opus**:
usa **DeepSeek V4 Pro** (`deepseek/deepseek-v4-pro`), una sola sessione, senza sottoagenti.

---

Leggi `CLAUDE.md` e `AGENTS.md`. Prima di cercare nei file usa `graphify query "<domanda>"`.
Carica le skill: `ponytail`, `prisma-cli`, `prisma-client-api`, `supabase-postgres-best-practices`,
`javascript-typescript-jest`.
A fine lavoro carica davvero `postgresql-code-review`, `owasp-security` e `ponytail-review`,
applica i rilievi veri e riporta cosa hanno trovato.

## Compito

F1-A9, prima parte: **import one-shot del vecchio CRM** (D-102) nel master `soggetti` e nelle
tabelle nuove, su un **database nuovo di prova `decobrands_import`** (già creato e migrato).
L'import da Integra **non** si fa: il ponte vero non c'è (F0-A8). Quando ci sarà, sarà la seconda
parte.

Sorgente: `dati-crm-legacy/` (estratto dell'08/11/2026, non versionato):
- `clienti.jsonl` — 3405 schede, una per riga, forma `{ id, ragione_sociale, elenco, dati_amministrativi, dati_bancari, punto_vendita, contatti, fornitori_collegati }`;
- `fornitori.json` — 20, `{ elenco, scheda }`;
- `subagenti.json` — 23, `{ elenco, scheda }`;
- `agenti.json` — 3, `{ elenco, scheda }`;
- `gruppi.json` — 20, `settori.json` — 25;
- `collegamenti.csv` — 4022 legami: `cliente_id,cliente,fornitore,codice_cliente,sconto1,sconto2,agente,subagente,id_collegamento`;
- `contatti_clienti.csv` — 91 contatti: `cliente_id,cliente,nome,mansione,telefono,cellulare,email,tipo`;
- `piva_doppie.csv` (68 P.IVA, 355 righe), `piva_non_in_integra.csv` (1410),
  `piva_solo_in_integra.csv`, `confronto_integra.json`, `riepilogo.json`.

Da leggere: `piano-lavoro-crm.md` riga **F1-A9**; `specifica-anagrafica-soggetti.md` **§7**
(tutto, in particolare 7.1–7.5), §4 (tabelle), §5 (aggiunte allo strato 0), §9; nel
`specifica-crm-provvigioni.md` §19: D-33, D-35, D-36, D-46, D-100, D-101, D-102, D-103.

## Decisioni già prese (non riaprirle)

1. **Fusione automatica solo a P.IVA/CF identici**, dopo la normalizzazione. Gli altri casi simili
   (ragione sociale simile, stessa città) **non** si fondono: vanno in un report per Matteo.
2. **Senza P.IVA**: si importa come soggetto se c'è un codice fiscale (o un altro identificativo
   valido); niente P.IVA inventata. Chi non ha né P.IVA né CF va nel report come *contatto*, non
   come soggetto (§7.4).
3. P.IVA di 9–10 cifre o non valida: **scarto**, nel file separato, non corrette a indovinare.
   Codice HUB diverso da 7 caratteri: scarto della sola fatturazione, il soggetto entra.
4. **`interscambio.sconto` resta il canone**: si scrive con lo sconto di `collegamenti.csv`
   (sconto1). `sconti` riceve sconto1 e sconto2 come dettaglio (ordine 1 e 2, tipo
   `commerciale`), senza alcun ricalcolo delle provvigioni. Nessuna scrittura su liquidazioni,
   bollettini, pratiche.
5. **Agenti e subagenti**: si importano i 3 agenti e i 23 subagenti dell'estratto; i nomi dei
   legami che non corrispondono a un subagente importato vanno nel report, non si creano a mano.
6. La data di stacco è l'estratto: non si filtra per data.
7. **Nessuna cancellazione**: le righe del vecchio CRM si creano con `fonte = 'vecchio_crm'`; i
   doppioni si fondono, non si eliminano.

## Cosa deve fare l'import

Un comando solo, da `app/backend`, in **una transazione** (V13, D-36), idempotente come il seed
(se l'import è già stato fatto, si ferma senza toccare niente):

`npm run import:vecchio-crm -- --db decobrands_import` (o nome equivalente) con:
- `--prova`: fa tutto e **fa rollback**, scrive solo i report; è il modo per misurare;
- `--sostituisci` (opzionale): se il database contiene già un import del vecchio CRM, lo rifà da
  zero svuotando **solo** le tabelle del vecchio CRM (con conferma esplicita), mai `decobrands_db`.

Passi, nell'ordine di §7.1 adattato all'assenza di Integra:

1. **Gruppi e settori** (`gruppi`, `settori`) con codice e descrizione dell'estratto.
2. **Persone e contatti** (91) → `persone` + `persone_contatti`, agganciati al soggetto della
   scheda cliente (quando c'è).
3. **Soggetti**: per ogni scheda cliente e fornitore, identità normalizzata (P.IVA/CF come §1.6,
   `sorgente='vecchio_crm'`, `codice` dalla sequenza, `attivo` da `elenco.State`), con la chiave di
   riconoscimento di §7.2: P.IVA normalizzata per paese, poi CF, poi (solo proposta) nome simile.
   I 68 doppioni (355 righe) diventano **un soggetto con N sedi**: ogni scheda in più è una sede
   `punto_vendita` con il suo indirizzo, gruppo e settore; il codice di ogni scheda vecchia resta
   in `codici_esterni` (`sistema='vecchio_crm'`, `tipo='soggetto'`).
4. **Ruoli**: un `clienti` per ogni soggetto che ha almeno una scheda cliente, un `fornitori` per
   ogni soggetto con una scheda fornitore (D-101: lo stesso soggetto può avere tutti e due, con
   **due codici distinti** in `codici_esterni`, tipo `cliente` e `fornitore`). Identità + prima
   versione (`fonte='vecchio_crm'`, `valido_dal` = data dell'estratto), `versione_corrente_id`,
   poi `soggetto_id`.
5. **Sedi**: la sede legale dalla scheda principale (`legale`, predefinita), le altre schede
   `punto_vendita`; per i fornitori la sede legale dall'indirizzo della `scheda`. Provincia e
   paese normalizzati, `valido_dal` = data dell'estratto.
6. **Recapiti**: email, telefono, fax con etichetta (`ordini` per l'email principale, il resto
   senza etichetta); i contatti persona hanno i loro recapiti. Un recapito per riga, niente
   duplicati identici.
7. **Fatturazione**: dai campi del vecchio CRM quando ci sono (`Codice HUB per fattura elettronica`
   se di 7 caratteri, `Indirizzo per fattura elettronica` come PEC), altrimenti `attiva=false`.
8. **Agenti e subagenti**: le 3 e le 23 schede → `agenti` e `subagenti` (il subagente sta
   sull'agente Decobrands, come oggi), con il loro `soggetto_id` quando hanno P.IVA/CF.
9. **Legami** (4022) → `interscambio`: cliente e fornitore dal soggetto giusto (dopo la fusione),
   `codice` = `codice_cliente`, `sconto` = sconto1, subagente da nome, `sconti` con sconto1 e
   sconto2, `valido_dal` = data dell'estratto. Periodi sovrapposti: se due legami uguali esistono
   già, si tiene il primo e si segnala; niente cancellazioni.
10. **Codici esterni** per ogni scheda e per ogni ruolo, come da §5.4.

## Report (file in `dati-crm-legacy/import/`, non versionati)

- `import-riepilogo.json`: letti, importati, fusi, scartati per motivo, tempi;
- `import-fusioni.csv`: gruppi di righe fuse in un soggetto (P.IVA, righe, codici);
- `import-scarti.csv`: P.IVA corte/non valide, HUB non di 7, schede senza dati fiscali, righe non
  leggibili;
- `import-conflitti.csv`: nomi simili non fusi, subagenti dei legami non trovati, legami doppi.
Conta le righe e confrontale con `riepilogo.json` e `confronto_integra.json`; le differenze
vanno spiegate nel resoconto, non nascoste.

## Regole e vincoli

- **Solo `decobrands_import`**. Mai `decobrands_db`, mai `decobrands_test`, mai i server accesi
  sulle porte 8001/8002 (non chiuderli). Non modificare `.env`.
- Calcoli e regole sul server (V12); nessun valore calcolato dal browser. L'import non tocca
  `liquidazioni`, `bollettini_*`, `ordini_fornitore_*`, `documenti_*`, `registro`: scrive solo
  anagrafica e legami, e un evento `export.import` (o `crud.create` con `entita='import'`) nel
  registro con i conteggi.
- Inserimenti a blocchi (`createMany` a gruppi di ~500) dentro la transazione; 3405 schede e 4022
  legami devono passare in pochi minuti.
- Codice minimo (ponytail), italiano semplice, commenti brevi con il rimando alla decisione.
- Se un dato non è previsto dallo schema, va nel report: non si aggiungono colonne nuove. Se serve
  una colonna o una tabella, **fermati** e scrivilo nel resoconto.
- Non toccare l'API e le pagine: il risultato si vede già nelle pagine esistenti.

## Verifica

1. `npx tsc --noEmit` in `app/backend`.
2. Prova dell'import in `--prova` sul database `decobrands_import` (già migrato): riporta i numeri
   e i tempi, senza lasciare dati.
3. Import vero sullo stesso database; poi query di controllo:
   - soggetti = schede distinte dopo la fusione; clienti = soggetti con ruolo cliente; fornitori =
     soggetti con ruolo fornitore; subagenti = 23; agenti = 3; interscambio = 4022 (o il numero
     verificato con i doppioni); gruppi = 20; settori = 25; persone = 91 (o il numero verificato);
   - nessun ruolo orfano (ogni `clienti`/`fornitori` ha il suo `soggetto_id`);
   - nessuna P.IVA doppia in `soggetti` (gli indici parziali fanno il controllo da soli);
   - la somma dei legami per cliente non cambia rispetto a `collegamenti.csv`.
4. Avvia il backend su `decobrands_import` (porta libera, es. 8013) e controlla con il browser che
   le pagine Clienti, Fornitori, Subagenti e Soggetti leggano i dati veri senza errori 500
   (screenshot a 1440 di `/soggetti` e `/clienti` in `%TEMP%\f1-a9`).
5. `npx jest --runInBand` **suite per suite**, 0 KO (l'import non deve rompere il seed e le prove:
   il database delle prove resta `decobrands_test`).
6. Carica davvero `postgresql-code-review`, `owasp-security`, `ponytail-review` e applica i
   rilievi veri.

## Resoconto

Scrivi `strumenti/opencode/resoconto-f1-a9.md` con:
- file creati/toccati e comando;
- i numeri dell'import confrontati con il riepilogo, con le differenze spiegate;
- il contenuto dei report (conteggi, esempi);
- tempi;
- prove e controlli caricati;
- i dubbi e le cose che servono a Matteo (nomi simili, subagenti dei legami, P.IVA anomale);
- le righe di documentazione da applicare a `specifica-crm-provvigioni.md` §19, al piano e ad
  `avanzamento-app.md` (non applicarle).
