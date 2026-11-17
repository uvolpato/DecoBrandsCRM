# Resoconto — Ordine/conferma/proforma aggiornati e falso avviso sul codice cliente (D-204, 17/11/2026)

**Esecutore: DeepSeek.** Pacchetto `strumenti/opencode/ordine-aggiornato.md`.

## Cosa è stato fatto

1. **Rilievo 1 (bug)** — `proposta.ts`:
   - `propostaDocumento`: l'esito `doppio` dell'ordine (e le nuove conferme/proforme doppie) ora restituisce
     `abbinamento` e `cliente_riconosciuto` (prima il `return { ...base, esito: 'doppio' }` li perdeva), quindi il
     cliente dell'agenzia si propone come cliente del documento anche sul doppione.
   - `controlliFissi`: l'avviso grave «Il codice … è di …» resta **solo** quando il cliente scelto a mano è diverso
     da quello del codice (`scelto != null && ag.cliente_id !== scelto`). Con `scelto == null` il codice indica il
     cliente: nessun conflitto.
2. **Rilievo 2 (funzione nuova)** — `proposta.ts`:
   - Nuovo campo `Proposta.doppio` (`DocumentoDoppio`: tipo, pratica, documento, numero, data, importo, righe,
     cliente) e helper `candidatiDoppio` (esportato, D-204/D-34): cerca gli ordini/conferme/proforme già
     registrati con lo stesso numero e fornitore **escludendo le pratiche chiuse** (documento congelato o in
     liquidazione) e li ordina **dal più vicino per data** al documento letto (il più recente senza data letta);
     così un numero riusato in un altro anno su una pratica chiusa non è un candidato (D-34). La conferma/proforma
     con lo **stesso** numero diventa `doppio`; un numero diverso resta una conferma in più (D-174). Fattura e nota
     di credito restano senza `doppio` (nessun pulsante).
3. **Server** — `documenti.ts`: rotta `POST /documenti/:id/sostituisci` (`provvigioni.modifica`, motivo
   obbligatorio). Una transazione (V13) con fornitore e pratica bloccati (`FOR UPDATE`): ricalcola i candidati con
   `candidatiDoppio` (stessa logica della proposta, così pulsante e server indicano lo stesso documento); 0
   candidati → 404, **più di uno aperto → 409 «Più documenti con questo numero: abbina a mano»**, uno solo → il
   documento prende data, importo, righe e file nuovi; il file vecchio resta abbinato alla pratica (non si
   cancella); il documento in arrivo si chiude come registrato; evento `documento.update` con prima/dopo e motivo;
   ricalcolo dei soli documenti aperti (`aggiornaPratica`). Resta la verifica «pratica chiusa» dopo il blocco come
   sicurezza contro una chiusura in corsa. **Nessuna migrazione**: per lo storico del file bastano la riga
   `documenti_in_arrivo` del vecchio (resta `abbinato` alla pratica) e l'evento nel registro.
4. **Frontend** — `VistaDocumento.tsx`: sul `doppio` il testo «Questo \<tipo\> c'è già nella pratica N …» con link
   e il pulsante «Sostituisci l'ordine/conferma/proforma registrata» (etichetta per tipo). Finestra `FormModal` con
   il confronto prima → dopo (data, importo, righe, cliente) e il motivo precompilato «… aggiornato dal fornitore».
   `guida.ts`: voce del pulsante.
5. **Prova browser** — `app_documenti.py`: blocco D-204 con scheda simulata (doppio → pulsante → finestra →
   `POST /sostituisci`). Solo `py_compile` (regola onda), non lanciata.

## Prove

Su `decobrands_test_ordineagg` (creato, migrazioni, poi da cancellare):

- `npx tsc --noEmit`: pulito nel backend e nel frontend.
- jest `ordine-aggiornato.spec.ts`: **12/12** (rilievo 1, proposta del doppio, sostituzione con file/righe/evento/
  ricalcolo, motivo obbligatorio, 400 su fattura, 404 su pratica chiusa, numero riusato in due anni, 409 su due
  aperti, proforma).
- jest di non regressione: `proposta.spec.ts` + `documenti.spec.ts` **148/148** (totale 160/160).
- `python -m py_compile strumenti/prove/app_documenti.py`: pulito.
- `documenti-lentezza.spec.ts` **non** eseguito qui: misura su `decobrands_test_perf` popolato («niente svuota né
  seed»), non riguarda questo pacchetto.

## Review

Skill caricate davvero: `owasp-security`, `ponytail-review`, `caveman` (niente migrazione → non serviva
`postgresql-code-review`). Rilievi veri: nessuno. La rotta valida il motivo (obbligatorio, trim), il tipo (lista
chiusa), risolve fornitore e documento dal database (V12, niente fiducia nel frontend), blocca la pratica con
`FOR UPDATE` e usa query parametriche Prisma. Scelta "lazy": niente tabella per lo storico del file — il file
vecchio resta `abbinato` alla pratica e il cambio è nell'evento; se un giorno servirà elencare i file sostituiti,
si aggiunge una tabella (piano di `ponytail:` nel codice non necessario, il requisito «resta collegato, non si
cancella» è rispettato).

## Da documentare

- **§19 — D-204** (proposta): sostituzione di ordine/conferma/proforma aggiornati e correzione del falso avviso
  sul codice cliente. Già inserita in `specifica-crm-provvigioni.md` (riga §19, *Perché* in §6.5, versione 8.93).
  Il rilievo di Claude (D-34: numero riusato in un altro anno) è compreso nella riga D-204.
- **§6.5 / §7.9** — esito `doppio` con `Proposta.doppio`, testo «Questo … c'è già nella pratica N» e rotta
  `POST /documenti/:id/sostituisci`; `candidatiDoppio` esclude le pratiche chiuse e prende il più vicino per data.
- **piano** — F7-A27, 5 h **da approvare**.

## Aperto

- Il giro del browser non è eseguito qui (regola onda): lo lancia Claude Code. Il blocco D-204 usa rotte simulate.
- `archiviaDopo` sul documento in arrivo sostituito tenta lo spostamento del file; senza file su disco (arrivo
  creato a mano nelle prove) fallisce in silenzio come previsto (`log.warn`).
