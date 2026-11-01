# Resoconto F1-A1 — Fornitori e scaglioni

## File toccati
- `app/backend/src/fornitori.ts` (nuovo): controller `FornitoriController` con rotte `/api/fornitori`, `/api/fornitori/:id`, `/api/fornitori/:id/scaglioni*`.
- `app/backend/test/fornitori.spec.ts` (nuovo): 7 prove, 0 KO.
- `app/frontend/app/(app)/fornitori/layout.tsx`, `page.tsx`, `[id]/page.tsx`, `VistaFornitori.tsx` (nuovi).
- `strumenti/prove/app_fornitori.py` (nuovo).

## Rotte backend
- GET `/api/fornitori` — elenco (permesso `dati.consulta`).
- GET `/api/fornitori/:id` — dettaglio con scaglioni e clienti seguiti.
- PUT `/api/fornitori/:id` — modifica regole CRM (`dati.condizioni`).
- POST `/api/fornitori/:id/scaglioni` — crea scaglione (`valido_dal` = oggi).
- PUT `/api/fornitori/:id/scaglioni/:sid` — modifica.
- DELETE `/api/fornitori/:id/scaglioni/:sid` — elimina (204).

## Pagine frontend
- `/fornitori`, `/fornitori/:id` con schede "Percentuali" e "Clienti seguiti", memoria schermata (`DataTable memoria`, `Schede memoria`).

## Prove
- `npx tsc --noEmit`: 0 errori.
- `npx jest --runInBand test/fornitori.spec.ts`: 7 passed, 0 KO (su `decobrands_test_f1a1`).

## Cose da fare nei file comuni (NON toccati)
- Registrare `FornitoriController` in `app/backend/src/app.module.ts` (import + controllers array), come già fatto per `UtentiController`.
- Aggiungere voci di menu/permessi per `/fornitori` (area Dati) se mancanti; la barra le deriva dai permessi, già presenti (`dati.consulta`, `dati.condizioni`).
- Testi della Guida (`prototipo-alternativo/assets/guida.js`) per la pagina Fornitori: non toccati (file comune).
- Codici evento: si usano solo `crud.*` già presenti in `src/registro.ts` (`SCHEMI`); nessun codice nuovo. Nessun aggiornamento necessario.
- Entità 'fornitore' nei campi di ricerca (`lib/entita.ts`): non toccato; se servirà per filtri futuri va aggiunto a parte.

## Dubbi / limiti
- Le anagrafiche (ragione sociale, P.IVA, paese) arrivano da `fornitori_versioni` (versione corrente) e il codice Integra da `codici_esterni`; in assenza di dati (DB vuoto) i campi sono null.
- La scheda "Clienti seguiti" è in sola lettura; la gestione delle agenzie resta in F1-A3.
- Le percentuali datate e le eccezioni personali (F1-A5) non sono implementate: qui si fa CRUD sulle righe in vigore (`valido_dal = oggi`).
- Per il frontend non è stato eseguito `next build` (come richiesto).
