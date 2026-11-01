# Resoconto F1-A3 — Clienti e agenzie

## File toccati
- `app/backend/src/clienti.ts` (nuovo): controller `ClientiController` con rotte `/api/clienti` e `/api/clienti/:id/agenzie`.
- `app/backend/test/clienti.spec.ts` (nuovo): 12 prove, 0 KO.
- `app/frontend/app/(app)/clienti/layout.tsx`, `page.tsx`, `[id]/page.tsx`, `VistaClienti.tsx` (nuovi).
- `strumenti/prove/app_clienti.py` (nuovo).

## Rotte backend
- GET `/api/clienti` — elenco clienti (permesso `dati.consulta`).
- GET `/api/clienti/:id` — dettaglio con agenzie.
- GET `/api/clienti/:id/pratiche` — elenco pratiche del cliente.
- GET `/api/clienti/:id/agenzie` — elenco agenzie.
- POST `/api/clienti/:id/agenzie` — crea agenzia (`dati.modifica`).
- PUT `/api/clienti/:id/agenzie/:aid` — modifica/chiudi agenzia (`dati.modifica`).
- DELETE `/api/clienti/:id/agenzie/:aid` — elimina agenzia (`dati.modifica`).

Gli errori di esclusione del database (periodi sovrapposti per cliente/fornitore o codice fornitore) sono trasformati in `409` con il messaggio "Periodo sovrapposto per questo cliente/fornitore" tramite il wrapper `unico()`.

## Pagine frontend
- `/clienti`, `/clienti/:id` con schede "Agenzie" e "Pratiche", memoria schermata.

## Prove
- `npx tsc --noEmit`: 0 errori (backend e frontend).
- `npx jest --runInBand test/clienti.spec.ts`: 12 passed, 0 KO su `decobrands_test_f1a3`.

## Cose da fare nei file comuni (NON toccati)
- Registrare `ClientiController` in `app/backend/src/app.module.ts`.
- Aggiungere voci di menu/permessi per `/clienti` (area Dati) se mancanti.
- Testi della Guida (`prototipo-alternativo/assets/guida.js`) per la pagina Clienti.
- Entità 'fornitore' e 'subagente' in `app/frontend/lib/entita.ts`: non toccato; in questa pagina si usano `select` con opzioni caricate via API.

## Dubbi / limiti
- I campi di ricerca per fornitore e subagente sono implementati come `select` (i campi di ricerca entità richiedono il supporto in `lib/entita.ts`, non toccato).
- La scheda Pratiche è solo elenco, senza aprire la pratica (F2).
- I clienti sono in sola lettura: i dati descrittivi arrivano da `clienti_versioni` e il codice Integra da `codici_esterni`.