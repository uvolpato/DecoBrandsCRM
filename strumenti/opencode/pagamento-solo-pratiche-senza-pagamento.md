# Pacchetto `pagamento-solo-pratiche-senza-pagamento`

## Compito

Ugo (18/11/2026): «nella ricerca delle pratiche, quando il documento è un pagamento, servono solo le pratiche fatturate che non hanno già un pagamento: aggiungi un filtro e poi usa quello per i pagamenti».

Un pagamento salda una fattura: proporre una pratica che ha già un pagamento non ha senso. Servono due cose, tutte sul server (V12):

1. un filtro nuovo nella ricerca delle pratiche (`GET /api/pratiche/cerca`): **senza pagamento** → solo le pratiche che non hanno alcun documento di tipo `pagamento`;
2. usarlo automaticamente quando il documento aperto è un `pagamento`, sia nella ricerca «Scegli la pratica» sia fra le pratiche suggerite dalla proposta.

Lo stato resta quello di adesso: per un pagamento il filtro per stato parte da «Fatturata» (D-177, `STATO_DAL_TIPO` / `filtroDalTipo`). Non si aggiunge nessun comando in più nell'interfaccia.

## 1. Backend — `app/backend/src/pratiche.ts`

- `CercaPratiche` (~riga 42): nuovo campo facoltativo, sola lettura di una lista chiusa: `@IsOptional() @IsIn(['1', '0']) senza_pagamento?: '1' | '0';` con un commento che rimanda alla richiesta.
- `cerca` (~riga 323): quando `q.senza_pagamento === '1'` aggiungi alla query
  ```sql
  AND NOT EXISTS (SELECT 1 FROM ordini_fornitore_documenti d WHERE d.testata_id = t.id AND d.tipo = 'pagamento')
  ```
  Nello stesso stile di `cliente`/`stato` (frammento `Prisma.sql` + `Prisma.empty`).

## 2. Backend — `app/backend/src/proposta.ts`

`propostaDocumento` (~riga 815), dove c'è già il `pool` filtrato per tipo (il blocco con `l.tipo === 'conferma' || 'proforma'`, `l.tipo === 'fattura'`): aggiungi
```ts
if (l.tipo === 'pagamento') return !t.documenti.some((d) => d.tipo === 'pagamento');
```
con un commento breve: un pagamento salda una fattura, una pratica che ne ha già uno non si propone.

## 3. Backend — test

- `test/pratiche.spec.ts` (describe `GET /api/pratiche/cerca`): un caso con `senza_pagamento=1` — con i dati del seed, prendi un fornitore e le pratiche che nel database hanno un documento `pagamento`; con il filtro quelle non devono comparire e le altre sì; senza il filtro ci sono tutte. Se il seed non ha nessun pagamento, creane uno sul database di prova con `db.ordini_fornitore_documenti.create` (campi minimi come fanno gli altri test) e cancellalo alla fine, oppure usa una fixture già presente.
- `test/proposta.spec.ts`: un caso — con `tipo: 'pagamento'` la pratica che ha già un pagamento non è fra i `candidati`; una fatturata senza pagamento sì.
- `senza_pagamento=2` → **400** (lista chiusa).

## 4. Frontend — `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`

- `PRATICA.voci` (~riga 101): `if (ctx.tipo === 'pagamento') p.set('senza_pagamento', '1');`
- il `contesto` del campo (~riga 846): aggiungi `tipo: t.tipo ?? undefined`.

Nient'altro: nessun comando nuovo, nessuna tendina nuova, nessuna classe CSS.

## File ammessi

- `app/backend/src/pratiche.ts`
- `app/backend/src/proposta.ts`
- `app/backend/test/pratiche.spec.ts`
- `app/backend/test/proposta.spec.ts`
- `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`

Vietati tutti gli altri: CSS, altre pagine, spec, guida, piano, migrazioni, `.env`, Integra. Niente commit. Non toccare le porte 8001/8002.

## Vincoli

- 📕 V12/D-28: il filtro è del server; il browser manda solo la scelta (qui: il tipo del documento che sta aprendo).
- Ponytail: nessuna colonna nuova, nessuna migrazione, nessuna rotta nuova; si riusa `pratiche/cerca`.
- ⚠️ Working tree con molte modifiche non committate: niente `git stash/checkout/reset`. Ugo sta usando l'app sul database di sviluppo: lavora solo sul database di prova `decobrands_test`.

## Prove

- `npx tsc --noEmit` in `app/backend` e `app/frontend`: 0 errori.
- `npm test -- pratiche.spec.ts proposta.spec.ts --forceExit`: 0 KO.
- Non lanciare Playwright: la prova la fa l'orchestratore.

## Resoconto

Scrivi `strumenti/opencode/resoconto-pagamento-solo-senza-pagamento.md`: file toccati, diff sintetico, esiti `tsc`/`jest`, dubbi, e **Da documentare** (riga §19, ritocco §7.9/§8.1 per il parametro `senza_pagamento`, riga Guida).
