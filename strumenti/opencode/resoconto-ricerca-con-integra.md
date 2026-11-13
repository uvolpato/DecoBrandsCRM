# Resoconto — Finestra di ricerca di fornitore e cliente: anche le viste di Integra (D-152)

Esecutore: DeepSeek V4 pro · 13/11/2026

## Fatto

- `app/frontend/lib/entita.ts`: parametro `integra?: 'fornitore' | 'cliente'` sull'entità, acceso solo su `fornitore` e `cliente`; `caricaVoci` con `forza` per ricaricare dopo un import.
- `app/frontend/componenti/CampoRicerca.tsx`: hook `useIntegra` (ricerca con attesa 350 ms, minimo 2 caratteri, via `GET /api/integra/cerca`; 403 → sezione nascosta, altri errori → «Integra non raggiungibile»); componente `Integra` (etichetta «Integra», righe, nota «serve il permesso di importare» senza `dati.importa`). Integrato nel menu (Multipla e Singola) e nella maschera `RicercaEntita`, sotto i risultati del CRM. La scelta di una riga importa e sceglie in un passo (`POST /api/integra/importa`, poi la riga importata diventa la scelta); dopo l'import `ricarica` aggiorna le voci (il pallino torna verde / il nome compare nel menu).
- `app/backend/src/anagrafica-integra.ts`: `GET /api/integra/cerca` passa da `dati.importa` a `dati.consulta` (i risultati si vedono con la sola consultazione; l'import resta `dati.importa`).
- `app/backend/test/anagrafica-integra.spec.ts`: aggiornata la prova «cerca e importa» (lettura vede i risultati, non importa).
- `app/frontend/app/(app)/componenti/page.tsx`: catalogo aggiornato (CampoRicerca con `integra`).
- `strumenti/prove/app_documenti.py`: controllo «riga Integra» nella ricerca del fornitore (ponte finto).

## Prove

- `npx tsc --noEmit` backend: passa.
- `npx tsc --noEmit` frontend: passa.
- jest `test/anagrafica-integra.spec.ts` su `decobrands_test_ricint` (creato, migrato e cancellato da me): 24 prove, 0 KO.
- `python -m py_compile` su `app_documenti.py` e `app_pratica.py`: passa (prove browser non lanciate, come da regole).

## Controlli (skill caricate)

- `owasp-security`: il cambio di permesso su `cerca` (importa → consulta) espone solo dati di anagrafica (P.IVA, ragione sociale) già visibili a `dati.consulta`; l'import resta `dati.importa`, nessuna escalation. La ricerca usa SQL parametrico (`sqlRicerca`, `$1..$4`). Niente rilievi.
- `ponytail-review`: `Integra`/`useIntegra` condivisi fra i tre punti d'uso, nessun doppione; il blocco nella maschera riusa `ricerca-menu` con `position: static` inline, senza toccare `stile.css`. Niente da tagliare.

## Da documentare (a cura di chi chiude l'onda)

- spec §16.4.1: `CampoRicerca` con la sezione «Integra» per fornitore e cliente (D-152).
- spec §7.9: la scelta di fornitore/cliente importa da Integra in un passo.
- spec §19: nuova decisione D-152 (o riga già presente da completare).
- guida (`app/frontend/lib/guida.ts`): la ricerca guarda anche Integra; senza `dati.importa` le righe si vedono ma non si scelgono.

## Aperti

Nessuno bloccante. Le prove browser (app_documenti/app_pratica) sono solo compilate, non eseguite (le lancia Claude Code a fine onda).
