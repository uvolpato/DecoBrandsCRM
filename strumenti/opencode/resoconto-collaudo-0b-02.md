# Resoconto · Onda 0 bis · Pacchetto 0b-02 — Documenti

Esecutore: DeepSeek V4 Flash · data 12/11/2026 · database di prova `decobrands_test_0b_02` (creato, migrato, usato, **cancellato**).

## Cosa ho fatto, rilievo per rilievo

### R2-01 (parte 1, D-133) — «Importa da Integra» cancellava le righe lette
- `app/backend/src/documenti.ts:684-687` (`correggi`): `portaRighe = Array.isArray(b.righe)`; `righeInput` vuoto quando il corpo non le porta.
- `app/backend/src/documenti.ts:749-760`: il `deleteMany` dei campi `righe[*]` gira solo con `portaRighe`; senza righe `nuove` resta vuoto, niente `createMany`. `righe: []` esplicito continua a svuotare (comportamento di prima).
- Vale per tutti i chiamanti: il PUT del solo `{ testata }` non tocca righe, valori letti, affidabilità, posizione, precisione.
- Prova: `test/documenti.spec.ts` → «PUT della sola testata (import del fornitore): le righe lette restano uguali (D-133)» confronta le righe `documenti_campi` prima e dopo (uguaglianza piena).

### R0-D5 (D-137) — agenzia alla data dell'ordine per una pratica già aperta
- `app/backend/src/documenti.ts:1187-1199`: `richiediAgenzia(tx, pid)` non prende più la data: legge `data_ordine` della pratica e chiede l'agenzia valida a quella data (D-35/D-60). Messaggio aggiornato («alla data dell'ordine»).
- Chiamate: `:1089` (`sposta` → pratica di destinazione) e `:1207` (`registra`, sempre su pratica già esistente). La pratica che nasce da un ordine resta controllata in `nuovaPratica` con la data dell'ordine: nessun punto chiede più l'agenzia alla data del documento.
- Prova: `test/documenti-pratica.spec.ts` → «l'agenzia chiusa dopo l'ordine non ferma i documenti della pratica già aperta (D-137)»: agenzia 01/01→30/06, ordine 10/05, fattura 15/07 → 201; ordine nuovo al 15/07 → 409.

### R1-02 (parte di questo pacchetto) — una sola `cerca` dopo il ponte lento
- `app/backend/src/documenti.ts:314-370` (`esitiImportazione`): flag `ponteGiu`; al primo `errore` la ricerca dei fornitori si interrompe e la ricerca dei clienti non parte.
- Prova: `test/documenti.spec.ts` → «ponte lento: una sola ricerca di Integra per pagina, non una per nome (R1-02)»: `cerca` finta con `{ errore: 'ponte lento' }`, `toHaveBeenCalledTimes(1)`.

### R1-06 — storico senza `fornitore_id` nell'elenco
- `app/backend/src/documenti.ts:348-365`: chiave `normalizzaNome(fornitore_ragione_sociale)|codice` (come `mancaRappresentanzaRighe`), via il filtro `fornitore_id != null`.
- Prova: `test/documenti.spec.ts:517` riscritta: riga di storico **senza** `fornitore_id`, con `fornitore_ragione_sociale` uguale al fornitore → `cliente_da_integra` vero.

### R1-09 (parte di questo pacchetto) — P.IVA con «IT»
- `app/backend/src/proposta.ts:245`: `normalizzaPiva` usa quella di `soggetti.ts` dopo aver tolto i caratteri non alfanumerici; copia locale cancellata (`soggetti.ts` non toccato).
- Prova: `test/proposta.spec.ts` → cliente con `piva='01234567890'`, documento con `piva_cliente='IT 01234567890'` → cliente riconosciuto.

### R1-11 — clienti e storico letti una volta per pagina
- `app/backend/src/documenti.ts:541-549` (`elenco`): i clienti con la versione corrente si leggono una volta e si passano a `mancaAgenziaRighe` e `esitiImportazione` (solo se una riga della pagina ha il fornitore).
- `app/backend/src/proposta.ts:319` (`mancaAgenziaRighe`): riceve i clienti già caricati.
- `app/backend/src/proposta.ts:351-364` e `app/backend/src/documenti.ts:344-351`: lo storico si filtra in SQL su `cliente_codice_fornitore IN (codici della pagina)`, `mode: 'insensitive'`.
- Prova: `test/documenti.spec.ts` → «la pagina legge i clienti una volta sola (R1-11)» (spia su `db.clienti.findMany`, 1 chiamata).

### R1-12 — `scaglioni_mancanti` alla data del documento
- `app/backend/src/documenti.ts:406-410`: `valido_dal: { lte: new Date(letto.data ?? giornoRoma(new Date())) }`.
- Prova: `test/documenti.spec.ts` → «scaglioni_mancanti guarda la data del documento…»: scaglione solo dal 2027 con documento del 05/11/2026 → `true`; aggiunto uno scaglione valido dal 2026 → `false`.

### R1-13 — prove
Solo le prove dei rilievi di questo pacchetto (R1-02, R1-06, R1-09, R1-11, R1-12, R0-D5, R2-01 parte 1): 7 prove nuove/riscritte, tutte nei file ammessi. Le altre prove di R1-13 sono di 0b-01/0b-03/0b-04.

## Prove lanciate

| Prova | Esito |
|---|---|
| `npx prisma migrate deploy` su `decobrands_test_0b_02` | ok (tutte le migrazioni) |
| `npx jest test/documenti.spec.ts test/proposta.spec.ts` | 95/95 passati |
| `npx jest test/documenti.spec.ts test/documenti-pratica.spec.ts test/documenti-lettura.spec.ts test/proposta.spec.ts test/coda.spec.ts test/pratiche.spec.ts test/seed.spec.ts` | **161/161 passati, 0 KO** |
| `npx tsc --noEmit` (backend) | 0 errori |
| `git status --short` | modificati solo file ammessi da questo pacchetto (`src/documenti.ts`, `src/proposta.ts`, `test/documenti.spec.ts`, `test/documenti-pratica.spec.ts`, `test/proposta.spec.ts`, questo resoconto). Gli altri file modificati in `git status` sono di altri pacchetti dell'onda |

Database `decobrands_test_0b_02` cancellato a fine lavoro. Cartella temporanea `%TEMP%\decobrands-0b-02`. Frontend non toccato.

## Prove nel browser da lanciare a fine onda
Non le ho lanciate (regola dell'onda). Da guardare:
- `strumenti/prove/app_documenti.py`: dopo «Importa da Integra» del fornitore dal documento, la scheda **Righe** mostra ancora le righe lette con la loro affidabilità (R2-01 parte 1); import e collegamento in un colpo solo sono di 0b-01.
- `strumenti/prove/app_pratica.py`: una fattura datata dopo la chiusura dell'agenzia entra nella pratica aperta prima (R0-D5/D-137); un ordine nuovo alla stessa data resta fermo con «manca l'agenzia».
- `strumenti/prove/app_documenti.py`: la pillola «Manca l'agenzia» e «Non rappresentato» sullo storico importato (senza `fornitore_id`).

## Controlli caricati davvero (pacchetto sensibile)
- `owasp-security`: nessun ingresso nuovo, nessun SQL grezzo aggiunto (filtro `in` parametrizzato da Prisma, valori solo dal database); `richiediAgenzia` resta un controllo server (V12) e il browser non manda nulla di calcolato; i messaggi restano generici. Nessun rilievo.
- `postgresql-code-review`: il filtro `cliente_codice_fornitore IN (…)` con `mode: 'insensitive'` non sfrutta l'indice quando Prisma applica `LOWER(...)`; resta comunque molta meno roba di prima (prima si leggeva tutta la tabella, 4022 righe). Rilievo minore, non corretto: nessuna migrazione ammessa in questo pacchetto.
- `ponytail-review`: `giaPerRiga` viene costruito anche quando le righe non si riscrivono (lavoro in memoria su campi già letti): lasciato, evitare un `if` più profondo costerebbe più righe. `chiaveStorico` in `documenti.ts` e `chiave` in `proposta.ts` sono la stessa espressione in due moduli: non unite, per non allargare l'interfaccia di `proposta.ts` per una riga.

## Cose aperte (da decidere, non inventate)
1. **Pillola «Manca l'agenzia» (D-106) contro D-137.** L'elenco e il dettaglio (in `proposta.ts`, `agenziaMancante`/`mancaAgenziaRighe`) continuano a chiedere l'agenzia **alla data del documento**, perché per un documento non ancora abbinato la pratica non si sa. Con D-137 una fattura datata dopo la chiusura dell'agenzia può entrare in una pratica vecchia, quindi la pillola può segnalare un problema che non c'è. Non l'ho toccata: cambiarla vuol dire decidere cosa mostrare per un documento senza pratica (forse il testo «Manca l'agenzia» va ammorbidito in «Nessuna agenzia alla data del documento»). Serve una decisione di Ugo.
2. `giornoRoma` è usato per il «oggi» di ripiego di `scaglioni_mancanti`; con la data del documento presente non serve, ma se un documento non ha data la card guarda oggi: coerente con la pagina fornitore.

## Da documentare (per il pacchetto 0b-doc)

### §19 — registro delle decisioni

| D-nn | Data | Decisione | Perché | Chi | Dove |
|---|---|---|---|---|---|
| D-133 | 11/11/2026 | Correggere un documento non tocca le righe che non arrivano: in `correggi` (PUT `documenti/:id`) le righe si riscrivono solo se il corpo le porta (`Array.isArray(b.righe)`). `POST integra/importa` con `documento_id` importa e collega il documento in una sola transazione (V13). | L'import del fornitore dal documento mandava un PUT con la sola testata e cancellava tutte le righe lette: si perdevano importi, affidabilità e controlli (perdita di dati, P0). | Ugo | spec §6.5, §7.9; `app/backend/src/documenti.ts`, `src/anagrafica-integra.ts`, `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx` |
| D-137 | 11/11/2026 | Un documento che entra in una pratica **già aperta** ha bisogno solo dell'agenzia valida alla **data dell'ordine** di quella pratica (D-35/D-60). L'agenzia alla data del documento si chiede solo quando il documento apre una pratica nuova. Precisazione di D-106. | Con l'agenzia chiusa dopo l'ordine, le fatture e note di credito di quella pratica venivano rifiutate (409) e la provvigione dell'ordine non si calcolava mai. Subagente e percentuali seguono comunque l'ordine. | Ugo | spec §4.2.7, §6.5, §7.9; `app/backend/src/documenti.ts` (`richiediAgenzia`, `sposta`, `registra`) |

### Riga *Perché* nelle sezioni della spec
- **§6.5 (lettura e correzione del documento)**: «Perché (D-133): la correzione è parziale di natura — chi cambia il solo fornitore non deve perdere le righe lette dal modello. In `correggi` le righe si riscrivono solo se il corpo le porta; l'import del fornitore si fa sul server, in una transazione, e non tocca campi né righe.»
- **§7.9 (elenco Documenti, pillole)**: «Perché (R1-11): clienti con la versione corrente e righe dello storico si leggono una volta per pagina, con lo storico filtrato sui codici cliente della pagina: il costo non cresce con l'anagrafica (D-102). Perché (R1-06): nello storico importato `fornitore_id` è NULL, quindi la coppia si confronta sul nome normalizzato del fornitore.»
- **§4.2.7 / §7.9 (documenti della pratica)**: «Perché (D-137): un documento entra in una pratica già aperta se l'agenzia era valida alla data dell'ordine: la provvigione è quella dell'ordine, e una chiusura dell'agenzia dopo l'ordine non la cancella. Solo un documento che apre una pratica nuova chiede l'agenzia alla propria data (D-106).»
- **§6.5 (card del documento, scaglioni)**: «Perché (R1-12): `scaglioni_mancanti` guarda la data del documento, come la pagina del fornitore guarda oggi e come `nuovaPratica` guarda l'ordine: un fornitore con scaglioni solo futuri fa avvisare la card prima del 409.»

### Guida in linea (`app/frontend/lib/guida.ts`, pagina `documenti`)
- `sapere`, **sostituire** la voce «Manca l'agenzia» con: «Un documento entra in una pratica già aperta se il cliente aveva l'agenzia con quel fornitore **alla data dell'ordine**; se l'agenzia si è chiusa dopo, il documento entra lo stesso (D-137). L'agenzia alla data del documento serve solo quando il documento apre una pratica nuova. L'elenco segnala con la pillola «Manca l'agenzia» la coppia senza agenzia.»
- `sapere`, **aggiungere**: ««Importa da Integra» dal documento crea il fornitore e lo collega al documento senza toccare le righe lette: testata, righe, affidabilità e controlli restano (D-133).»
- `pulsanti` «Configura l'agenzia»: «Quando un documento è di un cliente che non ha l'agenzia con quel fornitore alla data che serve (l'ordine della pratica, o la data del documento se la pratica è nuova): apre il form dell'agenzia (cliente e fornitore già fissi). Senza, il documento non entra in una pratica.»

### Piano (`piano-lavoro-crm.md`, §12)
- Attività «Onda 0 bis — correzioni del collaudo sui Documenti»: righe salve nella correzione (D-133), storico senza fornitore nell'elenco, scaglioni alla data del documento, agenzia alla data dell'ordine (D-137), P.IVA con «IT», clienti e storico letti una volta per pagina. **2 ore — da approvare.**

### README
Niente da cambiare in `app/README.md`: nessun comando, porta o variabile nuova.
