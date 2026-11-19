# Pacchetto `pagamenti-filtro-non-pagata-e-link`

## Compito

Tre richieste di Ugo (18/11/2026), tutte sul documento aperto in Documenti:

1. **Pratiche suggerite**: «se non c'è almeno un elemento di filtro non puoi mettermi tutte quelle fatturate». Oggi un pagamento (che non ha articoli) propone **tutte** le pratiche fatturate dello stesso fornitore senza pagamento, anche senza nessun legame con il documento. Devono restare solo le candidate con **almeno un elemento in comune**: articoli in comune (punteggio > 0) oppure cliente certo (il cliente è già usato per restringere la ricerca).
2. **Link «apri in una nuova scheda»**: nella scheda della pratica proposta (immagine: il riquadro accanto a «OF/2026/001 · AGRI AGGIO…») manca il link che apre la pratica **in una nuova scheda**, senza portare via la pagina.
3. **Filtro «Non pagata»**: nella ricerca «Scegli la pratica» il filtro visibile non c'è. Deve esistere **Non pagata** = fatturata e **senza** un documento di pagamento, ed è quello che si usa quando il documento è un pagamento (sostituisce il parametro nascosto `senza_pagamento` aggiunto prima).

## 1. Backend — `app/backend/src/pratiche.ts`

`CercaPratiche`: togli `senza_pagamento` e allarga la lista chiusa dello stato:
`@IsIn(['attesa', 'confermata', 'fatturata', 'non_pagata'])`, tipo `'attesa' | 'confermata' | 'fatturata' | 'non_pagata'`.

`cerca`:
- `stato === 'non_pagata'` → `AND t.stato = 'fatturato' AND NOT EXISTS (SELECT 1 FROM ordini_fornitore_documenti d WHERE d.testata_id = t.id AND d.tipo = 'pagamento')`
- gli altri valori come adesso (`STATO_DB`).

## 2. Backend — `app/backend/src/proposta.ts`

Nella parte finale di `propostaDocumento` (~riga 1010, `const proposti = filtraPratiche(candidati, filtro);`), scarta le candidate senza nessun legame:
```ts
// senza un elemento in comune (articoli o cliente certo) non si propongono tutte le fatturate del fornitore
const proposti = filtraPratiche(candidati, filtro).filter((c) => clientePratica != null || c.punteggio > 0);
```
(con un commento che rimanda alla richiesta). Il resto della logica di esito resta com'è.

Se qualche test esistente si appoggia a candidate con punteggio 0 e cliente non certo, va adeguato: riporta nel resoconto quante prove hai dovuto cambiare e perché.

## 3. Frontend — `componenti/Flussi.tsx` (componente `Scelte`)

Serve una voce che possa portare un link nella testata, accanto al titolo:
- `titolo` diventa `ReactNode` (era `string`);
- nuova prop facoltativa per voce: `apri?: { href: string; etichetta: string }`;
- nell'`<h3>`: `{v.titolo}` e, se c'è `apri`, subito dopo
  `<a className="btn-riga" href={v.apri.href} target="_blank" rel="noopener" title={v.apri.etichetta} aria-label={v.apri.etichetta}><Icona nome="occhio" /></a>`
  (stessa forma del link «apri» di `CampoRicerca`, riga 351; `btn-riga` e l'icona esistono già, nessun CSS nuovo);
- la `key` della voce non può più essere il titolo se è un nodo: usa l'indice o una `chiave` facoltativa.

Aggiorna il catalogo `app/frontend/app/(app)/componenti/page.tsx` (~riga 246): la firma di `Scelte` cita `apri` e `titolo: nodo`.

## 4. Frontend — `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`

- `STATO_DAL_TIPO`: `pagamento: 'non_pagata'` (nota di credito resta `fatturata`).
- `STATI_ABBUNA`: aggiungi `{ valore: 'non_pagata', etichetta: 'Non pagata' }` dopo «Fatturata».
- `PRATICA.voci`: togli la riga `if (ctx.tipo === 'pagamento') p.set('senza_pagamento', '1');` (il tipo non serve più lì; togli anche `tipo:` dal `contesto` se non lo usa altro).
- nelle voci di `Scelte` per le pratiche suggerite (~riga 826): `titolo` può restare `c.pratica.numero + ' · ' + cliente` e aggiungi
  `apri: { href: '/pratiche/' + c.pratica.id + '?vista=sola', etichetta: 'Apri la pratica in una nuova scheda' }`.
  Lo stesso per la voce «Nuova pratica» dell'ordine (~riga 793) **non serve**: lasciala com'è.

## 5. Test

- `test/pratiche.spec.ts`: il caso di `senza_pagamento` diventa `stato=non_pagata` (stesse attese: le pratiche con un pagamento non compaiono, le altre sì); `stato=non_pagata` non è un valore di `STATO_DB`, quindi controlla che il ramo funzioni; `stato=qualsiasi` resta 400.
- `test/proposta.spec.ts`: un caso per la regola nuova — un pagamento senza cliente certo e senza articoli in comune **non** propone nulla; con il cliente certo propone le fatturate di quel cliente senza pagamento.

## File ammessi

- `app/backend/src/pratiche.ts`
- `app/backend/src/proposta.ts`
- `app/backend/test/pratiche.spec.ts`
- `app/backend/test/proposta.spec.ts`
- `app/frontend/componenti/Flussi.tsx`
- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`
- `app/frontend/app/(app)/componenti/page.tsx`

Vietati tutti gli altri: CSS, altre pagine, spec, guida, piano, migrazioni, `.env`, Integra. Niente commit. Non toccare le porte 8001/8002.

## Vincoli

- 📕 V12/D-28: i filtri e le candidate li decide il server; il browser manda solo la scelta.
- Ponytail: nessuna colonna, nessuna migrazione, nessuna rotta nuova, nessuna classe CSS nuova.
- ⚠️ Working tree con molte modifiche non committate: niente `git stash/checkout/reset`. Ugo usa l'app sul database di sviluppo: lavora solo su `decobrands_test`.

## Prove

- `npx tsc --noEmit` in `app/backend` e `app/frontend`: 0 errori.
- `npm test -- pratiche.spec.ts proposta.spec.ts --forceExit`: 0 KO.
- Non lanciare Playwright: la prova la fa l'orchestratore.

## Resoconto

Scrivi `strumenti/opencode/resoconto-pagamenti-filtro-non-pagata-e-link.md`: file toccati, diff sintetico, esiti `tsc`/`jest`, test esistenti adeguati e perché, dubbi, **Da documentare** (righe §19, §7.9/§8.1 per `non_pagata`, Guida, catalogo componenti).
