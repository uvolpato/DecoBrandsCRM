# Resoconto — Percentuali del fornitore: finestra a uno scaglione (D-168, P1, 15/11/2026)

**Esecutore: DeepSeek V4 pro.** Pacchetto `strumenti/opencode/percentuali-riprogetto.md`.
Skill caricate davvero: `owasp-security`, `ponytail-review`, `ui-ux-pro-max`, `caveman`.

## Cosa è stato fatto

1. **`FormPercentuali.tsx` riscritto** come finestra di UN solo scaglione: campi *Valide dal*,
   *Sconto da %*, *Provvigione dal fornitore %*, *di cui al subagente %* e margine in sola lettura
   (anteprima). Titoli «Nuovo scaglione di …» / «Modifica lo scaglione di …». In modifica la data e lo
   sconto sono bloccati; da *Apri la pratica* entrambi sono bloccati (data = ordine, sconto = agenzia).
   Niente scorrimento orizzontale: il modulo è a una colonna.

2. **Salvataggio: si ricompone l'elenco della versione e si usano le rotte esistenti** (nessuna rotta
   nuova, come richiesto):
   - data con versione esistente → **PUT** `fornitori/:id/percentuali/:valido_dal`;
   - data senza versione → **POST** `fornitori/:id/percentuali`, copiando gli scaglioni in vigore a
     quella data e applicando lo scaglione.
   Regola di accodamento: modifica o versione nuova → lo sconto sostituisce quello uguale (o si
   aggiunge); nuovo scaglione su una versione esistente → si accoda sempre, così uno sconto doppio
   viene rifiutato dal server con «Uno sconto è ripetuto». Tutti i controlli restano nel server
   (V12, V13): sovrapposizioni, `pct_subagente ≤ pct_agente` (D-166), chiusure, eccezioni orfane.

3. **`VistaFornitori.tsx`**: la tabella degli scaglioni di ogni versione ha **due icone per riga**
   (matita Modifica, cestino Elimina, con `aria-label`/`title` «Modifica/Elimina lo scaglione da N %»)
   e un pulsante **«Aggiungi scaglione»** (unico, in alto; la data editable decide se entra nella
   versione esistente o ne crea una nuova). L'ultimo scaglione non si elimina dalla tabella (cestino
   spento; si elimina la versione). Tolti «Nuove percentuali» e il «Correggi» per versione; resta
   l'«Elimina» della versione.

4. **`VistaDocumento.tsx`** (*Apri la pratica* → «Configura le percentuali»): apre la stessa finestra
   in inserimento con *Valide dal* = data dell'ordine e *Sconto da* = sconto dell'agenzia (entrambi
   fissi), fornitore fisso.

5. **Server (`fornitori.ts`)**: nessuna logica nuova (le rotte facevano già tutto). Solo i **messaggi
   con le date in gg/mm/aaaa** (`ggmmaaaa`): chiusura, «Ci sono già percentuali dal …», «Manca lo
   sconto … della versione dal …», «La versione dal … non ha lo sconto …».

6. **`guida.ts`**: aggiornate le voci della pagina Fornitori e la finestra «Scaglione».

## Decisioni (perché)

- **«Aggiungi scaglione» è un pulsante unico in alto, non per versione**: la data editable della
  finestra copre sia «aggiungi alla versione corrente» sia «crea una versione nuova»; un pulsante per
  versione avrebbe lasciato senza punto d'ingresso la versione in vigore nel periodo chiuso (che non
  è modificabile, ma da cui si può comunque creare una versione futura).
- **Data e sconto bloccati in modifica**: spostare uno scaglione fra due versioni esistenti richiederebbe
  due scritture (togliere da A e aggiungere a B); fuori dalla finestra singola. La modifica cambia solo
  le percentuali dello scaglione nella sua versione. Se serve spostarlo: cestino + «Aggiungi scaglione».
- **Sconto doppio**: lo lascia rifiutare al server («Uno sconto è ripetuto», già provato in
  `percentuali.spec.ts`), perché nel flusso nuovo-su-versione-esistente l'accodamento produce il
  duplicato; nella versione nuova il medesimo sconto *sostituisce* quello copiato (è il modo per
  cambiare uno scaglione da una data nuova).

## Prove

- `npx tsc --noEmit` backend e frontend: puliti.
- jest `percentuali.spec.ts` su `decobrands_test_perc2` (creato, migrazioni, poi **cancellato**):
  **35/35**. Tutte le regole richieste sono già coperte: inserimento, modifica (PUT), «Uno sconto è
  ripetuto», versione nuova da data nuova, `pct_subagente > pct_agente` (D-166), eliminazione rifiutata
  se lo scaglione è usato da un'eccezione (`controllaOrfane`). Aggiornati i messaggi con le date
  gg/mm/aaaa (`31/08/2026`, `01/01/2027`, `01/01/2025`).
- Prove browser aggiornate e controllate con `python -m py_compile` (0 errori): `app_fornitori.py`
  (icone per riga, finestra senza scorrimento orizzontale a 1440 e 768 con `scrollWidth <= clientWidth`
  e schermate `percentuali-1440.png`/`percentuali-768.png`, sconto doppio → messaggio, modifica con
  sconto fisso, nuova versione da data nuova) e `app_documenti.py` (D-162/D-163 con la finestra nuova).
  Il giro nel browser lo lancia Claude Code (`prepara.sh` + `giro.sh`).

## Review

- `ponytail-review`: nessun rilievo. `FormPercentuali` passa da 194 a 156 righe; nessuna astrazione o
  dipendenza nuova. La ricomposizione dell'elenco nel frontend evita rotte nuove (il server restava
  già tutto lì). `net: 0`.
- `owasp-security`: nessun rilievo. Il frontend manda solo id e valori digitati; il server ricarica,
  valida (class-validator su percentuali e data) e ricalcola (V12, D-28). Le scritture restano le
  rotte esistenti con `@Richiede('dati.condizioni')` e una transazione (`fornitoreBloccato`, V13).
  Le date nei messaggi sono generate dal server su valori già validati: nessuna iniezione.

## Da documentare (spec)

- **§5.11 (percentuali datate)** — la finestra è per UN solo scaglione; il salvataggio ricompone
  l'elenco della versione e usa POST (versione nuova, copiando gli scaglioni in vigore) o PUT
  (versione esistente). Messaggi del server con le date in gg/mm/aaaa.
- **§7 Fornitori** — la tabella degli scaglioni ha matita ed cestino per riga (con `aria-label`/`title`)
  e «Aggiungi scaglione»; l'ultimo scaglione non si elimina (si elimina la versione). Niente più
  «Nuove percentuali»/«Correggi».
- **§19 — D-168** — riprogettazione della finestra delle percentuali: una sola finestra piccola per
  uno scaglione (inserire/modificare), la griglia larga sparisce; le operazioni ricompongono la
  versione e usano le rotte esistenti; niente sovrapposizioni (sconto una volta sola per versione),
  data nuova → versione nuova che copia gli scaglioni in vigore.

## Aperto

- Nessuno bloccante. Il giro del browser (e le due schermate della finestra) resta a Claude Code, come
  da `regole-onda-parallela.md`.
- `documenti-pratica.spec.ts` (riga ~350, `toMatch(/scaglione/)`) è il fallimento pre-esistente già
  segnalato da `provvigione-non-somma`: non di questo pacchetto.
