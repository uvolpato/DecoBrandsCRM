# Resoconto Fase 3 — gruppo 1 (F1-A1, F1-A2, F1-A3) — area Dati

## Riepilogo
Implementate le tre attività del gruppo 1 del blocco 3 (F1) in parallelo, con tre sottoagenti
`general` (modello caricato, livello Sonnet). File comuni integrati dalla sessione principale.

## Per attività

### F1-A1 — Fornitori e scaglioni
- Rotte: GET/PUT `/api/fornitori`, GET `/api/fornitori/:id`, POST/PUT/DELETE `/api/fornitori/:id/scaglioni`.
- Pagine: `/fornitori`, `/fornitori/[id]` (schede "Percentuali" e "Clienti seguiti"), memoria schermata.
- Prove: `tsc --noEmit` 0 errori; `jest fornitori.spec.ts` 7 passed.
- Dettagli: `strumenti/opencode/resoconto-f1a1.md`.

### F1-A2 — Agenti e subagenti
- Rotte: GET `/api/agenti` (lettura), GET/POST/PUT/DELETE `/api/subagenti` (+ POST `/:id/attivo`).
- Pagine: `/subagenti`, `/subagenti/[id]` (elenco con filtro q e segmenti, scheda "Dati").
- Prove: `tsc` 0 errori; `jest subagenti.spec.ts` 11 passed.
- Dettagli: `strumenti/opencode/resoconto-f1a2.md`.

### F1-A3 — Clienti e agenzie
- Rotte: GET `/api/clienti`, GET `/api/clienti/:id`, GET `/api/clienti/:id/pratiche`, GET/POST/PUT/DELETE `/api/clienti/:id/agenzie` (blocco periodi sovrapposti → 409).
- Pagine: `/clienti`, `/clienti/[id]` (schede "Agenzie" e "Pratiche").
- Prove: `tsc` 0 errori; `jest clienti.spec.ts` 12 passed.
- Dettagli: `strumenti/opencode/resoconto-f1a3.md`.

## File comuni toccati dalla sessione principale
- `app/backend/src/app.module.ts`: import e registrazione di `FornitoriController`, `AgentiController`,
  `SubagentiController`, `ClientiController` nel modulo (era l'unico punto comune da collegare).
- `app/backend/test/accesso.spec.ts`: il test creava un utente `servizi` (sistema), che il seed già
  crea; rinominato in `servizi-prova` per non collidere con il seed su `decobrands_test`.

## Prove eseguite (sessione principale)
- Backend: `npx tsc --noEmit` → 0 errori.
- Backend: `npx jest --runInBand` su `decobrands_test` (seed caricato) → 11 suite, 135 test, 0 KO.
- Frontend: `npx tsc --noEmit` → 0 errori.
- Frontend: `npm run build` (con `BACKEND_URL=http://127.0.0.1:8012`) → build OK, rotte
  `/fornitori`, `/fornitori/[id]`, `/subagenti`, `/subagenti/[id]`, `/clienti`, `/clienti/[id]` presenti.
- Browser: backend su 8012 (`decobrands_test_f1a1`, seed + utenti prova `f1-*`), frontend su 8011.
  Screenshot a 1440 e 768 px in `%TEMP%\fase3` (elenco e dettaglio per le tre pagine), guardate.
- Script di prova: `app_fornitori.py`, `app_subagenti.py`, `app_clienti.py` → 0 KO (2 controlli ciascuno).

## Cose che mancano nei file comuni (non toccate, da fare dopo)
- Testi della Guida in `prototipo-alternativo/assets/guida.js` per le pagine Fornitori/Subagenti/Clienti.
- Voci di menu (barra area Dati): già presenti; nessun cambiamento necessario.
- Entità di ricerca in `app/frontend/lib/entita.ts`: `fornitore`, `subagente`, `agente`. In questa
  fase le pagine usano `select` con opzioni caricate via API; se si vuole il campo di ricerca entità
  (spec), vanno aggiunte le entità.
- Codici evento: nessun codice nuovo; si usano solo `crud.*` e `stato.change_state` già in
  `src/registro.ts` (`SCHEMI`).
- Aggiornamenti alla spec (`specifica-crm-provvigioni.md`) e al catalogo componenti: non toccati
  (li fa Claude Code).

## Dubbi e differenze dal prototipo
- I clienti sono in sola lettura (dati da `clienti_versioni`, codice Integra da `codici_esterni`).
- Le anagrafiche (ragione sociale, P.IVA, paese) arrivano da Integra (versione corrente).
- Gli scaglioni sono CRUD sulle righe in vigore (`valido_dal = oggi`); versioni datate ed eccezioni
  personali (F1-A5, Opus) non implementate.
- I subagenti si gestiscono nel CRM; eliminazione bloccata da FK (interscambio, pratiche, eccezioni)
  con 409.
- L'agenzia (`interscambio`) trasforma l'errore EXCLUDE del database in 409 "Periodo sovrapposto
  per questo cliente/fornitore", senza controllo manuale.
- La scheda "Pratiche" dei clienti mostra solo l'elenco, senza aprire la pratica (F2).
- Campi di ricerca fornitore/subagente implementati come `select` (entità mancanti in `lib/entita.ts`).

## Porte e database usati nella verifica browser
- Backend: 8012, `decobrands_test_f1a1` (seed + utenti prova `f1-*`).
- Frontend: 8011, `BACKEND_URL=http://127.0.0.1:8012`.
- Non usate le porte 8001/8002 né `decobrands_db`.

## Note
- Gli script `app_fornitori.py`, `app_subagenti.py`, `app_clienti.py` sono stati adattati temporaneamente
  da `localhost:8001` a `localhost:8011` per la verifica; i file originali usavano 8001.
- Processi avviati (backend 8012, frontend 8011) da chiudere dopo il controllo.

## Correzioni (da fase3-correzioni.md)

### 1. Prove server indipendenti dall'ordine
- Aggiunto `svuota(db)` + `seed(db)` in `beforeAll` e `svuota(db)` in `afterAll` in
  `fornitori.spec.ts`, `clienti.spec.ts`, `subagenti.spec.ts` (come `motore.spec.ts`).
- Verifica: `npx jest --runInBand` due volte di seguito → 0 KO (135/135); poi
  `npx jest --runInBand test/motore.spec.ts test/fornitori.spec.ts test/clienti.spec.ts
  test/subagenti.spec.ts` → 0 KO.

### 2. Scaglioni in sola lettura (spec §7.4, D-25)
- Rimossi `POST/PUT/DELETE /api/fornitori/:id/scaglioni` da `src/fornitori.ts` e le prove
  corrispondenti in `fornitori.spec.ts`.
- Rimossi pulsanti "Nuovo/Modifica/Elimina scaglione" in `VistaFornitori.tsx`; nota
  "Le percentuali non si modificano: le nuove percentuali da una data arrivano con F1-A5."
- `note` con `@MaxLength(2000)`.
- Regole del fornitore restano modificabili con `dati.condizioni`.

### 3. Agenzie: errori e date
- `unico()`: "Periodo sovrapposto" solo per codice `23P01`; `23514` → 400 "Valore non ammesso";
  rimosso il controllo sul testo del messaggio.
- Date con `@IsISO8601({ strict: true })` e controllo `valido_al >= valido_dal` (400).
- `FOR UPDATE` su modifica ed eliminazione agenzia.
- Aggiunte prove per CHECK e per le date.

### 4. Campi di ricerca (spec §7.6, D-22, §16.4)
- Aggiunte entità `fornitore`, `subagente`, `agente` in `app/frontend/lib/entita.ts`.
- Sostituiti i `select` con `Campo` `tipo: 'ricerca'` nelle finestre di `VistaClienti.tsx`
  (fornitore, subagente) e `VistaSubagenti.tsx` (agente).
- Multi-filtro negli elenchi: non implementato (nota: da aggiungere se richiesto).

### 5. Prove nel browser
- Script `app_fornitori.py`, `app_subagenti.py`, `app_clienti.py` con base dagli argomenti
  (predefinita `http://localhost:8011`).
- Eseguiti con 0 KO (2 controlli ciascuno, titolo + ricerca).

### Dubbi aperti
- Sconti proposti dagli scaglioni del fornitore scelto: non implementato (richiede logica
  aggiuntiva; segnalato come da correzioni).
