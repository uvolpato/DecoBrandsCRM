# Resoconto F1-A2 — Agenti e subagenti

## File creati
- `app/backend/src/subagenti.ts` — `AgentiController` (GET /agenti, GET /agenti/:id) e `SubagentiController` (GET/POST/PUT/DELETE + POST /:id/attivo).
- `app/backend/test/subagenti.spec.ts` — 11 prove, tutte verdi su `decobrands_test_f1a2`.
- `app/frontend/app/(app)/subagenti/layout.tsx`, `page.tsx`, `[id]/page.tsx`, `VistaSubagenti.tsx`.
- `strumenti/prove/app_subagenti.py`.

## Rotte backend
- `GET /api/agenti`, `GET /api/agenti/:id` (permesso `dati.consulta`).
- `GET /api/subagenti`, `GET /api/subagenti/:id` (`dati.consulta`).
- `POST /api/subagenti`, `PUT /api/subagenti/:id`, `POST /api/subagenti/:id/attivo`, `DELETE /api/subagenti/:id` (`dati.modifica`).

## Pagine frontend
- `/subagenti`, `/subagenti/[id]`: elenco con filtro q e segmenti (attivi/disattivati/tutti), scheda "Dati" con agente padre, stato, azioni.

## Prove
- `npx tsc --noEmit` (backend + frontend): OK.
- `DATABASE_URL_TEST=...decobrands_test_f1a2 NODE_ENV=test npx jest subagenti.spec.ts`: 11/11 OK.

## Mancanze file comuni (da integrare dal coordinatore)
- `app/backend/src/app.module.ts`: registrare `AgentiController` e `SubagentiController`.
- Entità `agente`/`subagente` nel frontend (se serve catalogo) e guida in linea.
- Codici evento: nessun codice nuovo oltre a `crud.*` e `stato.change_state` già presenti.

## Dubbi
- `agenti` non ha CRUD (solo lettura) per spec; se servirà creazione agenti, va aggiunta.
- Eliminazione subagente bloccata da FK (interscambio, pratiche, eccezioni) con messaggio 409.