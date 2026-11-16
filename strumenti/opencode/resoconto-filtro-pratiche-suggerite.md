# Resoconto — Filtro per stato delle pratiche suggerite (15/11/2026)

**Esecutore: DeepSeek Flash.** Pacchetto `strumenti/opencode/filtro-pratiche-suggerite.md`. Regole comuni rispettate: niente commit, niente `cd`/`/tmp`/`&`, `.env` mai letto (solo il comando sanzionato per costruire `DATABASE_URL_TEST`), niente porte 8001/8002, niente Integra, niente `decobrands_db`. Database di prova `decobrands_test_filtro_sugg` creato, usato e cancellato. File di altri pacchetti non toccati: le modifiche non committate in `VistaDocumento.tsx` (filtro-stato-in-modale) e `CampoRicerca.tsx` sono state conservate.

## Richiesta di Ugo (15/11/2026)

Nella scheda del documento, scheda **Pratica proposta**, a destra della barra delle schede un menu a tendina che filtra le pratiche suggerite per stato. **Predefinito: pratiche aperte** (le fatturate non si propongono). È un filtro di stato, non di entità: la tendina è ammessa (D-22 vale per le entità).

## Modifiche

### Backend (V12: il server filtra, il browser manda solo la scelta)

- **`app/backend/src/proposta.ts`**:
  - nuovo `STATI_PRATICHE` (`aperte · tutte · solo_ordine · confermata · fatturata`) e `FiltroPratiche`, con `STATO_FILTRO` (mappa sullo stato della colonna `inviato|confermato|fatturato`, §4.2.7) ed `filtraPratiche`.
  - `propostaDocumento(…, filtro = 'tutte')`: il filtro si applica **prima dell'esito** (così la prima candidata resta la proposta fra quelle filtrate) e **dopo** la risoluzione «nota di credito → fattura stornata», che resta certa anche se la pratica è già fatturata (per forza). Default `'tutte'`: `valutaLettura` e gli altri chiamanti interni non cambiano comportamento.
- **`app/backend/src/documenti.ts`**:
  - `dettaglioDocumento(…, filtro = 'aperte')` passa il filtro a `propostaDocumento`.
  - GET `/documenti/:id` accetta `?filtro=…` con DTO `FiltroDettaglio` (`@IsIn(STATI_PRATICHE)`, `@IsOptional()`), predefinito `'aperte'`.

### Frontend

- **`app/frontend/componenti/Schede.tsx`**: prop opzionale `azioni?: ReactNode` a destra della barra, sulla stessa riga; le altre pagine non cambiano.
- **`app/frontend/app/stile/stile.css`**: `.schede-azioni` (destra della barra), `.schede-filtro` (etichetta + tendina), `.in-aggiornamento` (lista più tenue, D-59).
- **`app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`**: stato `filtro` (predefinito `aperte`), `caricando`; `carica()` manda `?filtro=…`; tendina «Stato delle pratiche» con le classi esistenti `.filtro-select`; lista più tenue durante il ricaricamento; vuoto → «Nessuna pratica aperta da proporre», la tendina resta.
- **`app/frontend/app/(app)/componenti/page.tsx`**: descrizione e `firma` di `Schede` aggiornate (parametro `azioni`).
- **`app/frontend/lib/guida.ts`**: voce «Stato delle pratiche».

## Prove (0 KO)

- `npx tsc --noEmit` backend e frontend: **puliti**.
- `npx jest proposta.spec.ts` su `decobrands_test_filtro_sugg`: **77/77 passati** (incluse le 4 nuove).
  - predefinito «aperte» → la pratica fatturata non è proposta;
  - «tutte» → proposta col motivo «pratica già fatturata»;
  - «solo_ordine»/«confermata» → filtrano per stato;
  - valore fuori lista → **400** (DTO).

## Controlli (skill caricate davvero)

- `owasp-security`: nessun rilievo. Il filtro è una lista chiusa validata lato server (`@IsIn`); nessun valore del browser finisce in SQL (il filtro agisce sulla lista in memoria). Nessun calcolo nel browser.
- `ponytail-review`: lean. `filtraPratiche` + `STATO_FILTRO` sono il minimo; `net: 0` (la prop `azioni` di `Schede` è l'unica aggiunta, richiesta dal pacchetto). Nessuna astrazione nuova.
- `caveman`: risposte e resoconto concisi.

## Da documentare

- **§16.4 (componenti)**: `Schede` ha la prop opzionale `azioni?: ReactNode` mostrata a destra della barra, sulla stessa riga.
- **§7.9 / §6.5**: nella scheda «Pratica proposta» una tendina «Stato delle pratiche» (Aperte · Tutte · Solo ordine · Confermata · Fatturata) filtra le pratiche suggerite; predefinita «Aperte» (le fatturate non si propongono). Se svuota l'elenco: «Nessuna pratica aperta da proporre», la tendina resta.
- **§19 — D-178 (numero proposto, il primo libero dopo D-177)**: *Filtro per stato delle pratiche suggerite*. Perché: nel dettaglio del documento escono anche pratiche già fatturate, che non sono una proposta utile; il filtro è per stato (non per entità), quindi è ammessa la tendina (D-22 vale per le entità). Il server filtra le candidate prima dell'esito, il browser manda solo la scelta (V12); la nota di credito che storna una fattura resta certa anche con «Aperte».

## Aperti / note

- Il filtro non è salvato per documento: tornando sul documento riparte da «Aperte» (predefinito).
- Dopo un salvataggio (`Correggi i dati letti`) la vista ricarica col filtro corrente (`void carica()` in `salvato`), non con quello predefinito della risposta.
- Il numero della decisione D-178 è proposto: se un altro pacchetto parallelo ha già usato quel numero, va rinumerato in sede di documentazione.
