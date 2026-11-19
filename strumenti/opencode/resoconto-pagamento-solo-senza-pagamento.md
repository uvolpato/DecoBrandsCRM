# Resoconto `pagamento-solo-pratiche-senza-pagamento`

## File toccati (5, tutti ammessi)

| File | Modifica |
|---|---|
| `app/backend/src/pratiche.ts` | `CercaPratiche`: campo `senza_pagamento?: '1' \| '0'` (lista chiusa). `cerca`: frammento `Prisma.sql` con `AND NOT EXISTS (… d.tipo = 'pagamento')` aggiunto alla WHERE |
| `app/backend/src/proposta.ts` | `pool` di `propostaDocumento`: per `tipo = 'pagamento'` esclude le pratiche con un documento `pagamento`. **In più** (vedi «Scostamento»): il pagamento ora prosegue oltre il ritorno anticipato e arriva al `pool` |
| `app/backend/test/pratiche.spec.ts` | 2 casi: `senza_pagamento=1` esclude la pratica col pagamento (creato e cancellato sul DB di prova) e senza filtro ci sono tutte; `senza_pagamento=2` → 400 |
| `app/backend/test/proposta.spec.ts` | 1 caso: con `tipo: 'pagamento'` si propone `OF-2` (fatturata senza pagamento), non `OF-1` (che ne ha già uno) |
| `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx` | `PRATICA.voci`: per `ctx.tipo === 'pagamento'` invia `senza_pagamento=1`; il campo «Scegli la pratica» riceve `tipo: t.tipo ?? undefined` nel contesto |

## Scostamento dal pacchetto (importante)

Il pacchetto diceva di aggiungere solo il filtro nel `pool`. Ma `propostaDocumento` aveva un **ritorno anticipato** per `pagamento` (e per `altro`/tipo non letto) prima del `pool`:

```ts
if (l.tipo !== 'conferma' && l.tipo !== 'proforma' && l.tipo !== 'fattura' && l.tipo !== 'nota_credito') return …
```

Con quel ritorno, per un pagamento il `pool` non veniva mai raggiunto: il filtro sarebbe stato codice morto e la prova richiesta dal pacchetto («una fatturata senza pagamento sì fra i `candidati`») sarebbe fallita. Ugo chiede che le pratiche **suggerite** per un pagamento compaiano filtrate, quindi:

- `pagamento` è stato tolto da quel ritorno anticipato (commento aggiornato);
- `clienteDaIntegra` salta il pagamento (`if (l.tipo === 'pagamento') return null;`): un pagamento non crea la pratica, e così restano invariati `cliente_da_integra`/`cliente_da_scegliere` per i tipi che ci arrivavano già;
- `manca_agenzia` non scatta comunque (D-106: `ENTRA_IN_PRATICA` non contiene `pagamento`).

Effetto voluto: per un pagamento i `candidati` sono le fatturate senza pagamento; con `punteggio = 0 − 0.5` (pratica già fatturata) l'esito resta `nessuno`/`certo` come da regole attuali e la scheda si chiama «Scegli la pratica» (con «Abbina a …» su ogni candidata). Nessun comando nuovo, nessuna tendina nuova.

Nessun altro file toccato: niente CSS, migrazioni, `.env`, Integra, DB di sviluppo.

## Diff sintetico

- `pratiche.ts`: +6 righe (campo DTO + frammento SQL + interpolazione).
- `proposta.ts`: +4 righe (filtro nel `pool`, eccezione al ritorno anticipato, guardia in `clienteDaIntegra`).
- `VistaDocumento.tsx`: +2 righe.
- prove: 3 casi nuovi.

## Esiti

- `npx tsc --noEmit` in `app/backend`: 0 errori.
- `npx tsc --noEmit` in `app/frontend`: 0 errori.
- `npm test -- pratiche.spec.ts proposta.spec.ts --forceExit`: **2 suite, 106 test, 0 KO**.

## Dubbi / da sapere

- Il pagamento ora produce candidati: la pratica suggerita ha spesso `punteggio ≤ 0`, quindi l'esito è `nessuno` e la candidata non è «consigliata» (nessuna azione proposta in evidenza, solo l'elenco). Se Ugo vuole che la prima candidata sia consigliata anche per un pagamento serve una regola in più (non l'ho inventata).
- La ricerca nel browser manda `senza_pagamento=1` sempre per un pagamento, anche se l'utente cambia i segmenti di stato: l'esclusione resta, com'è giusto.
- Il test su `pratiche.spec.ts` crea e cancella un documento `pagamento` sul DB di prova (`decobrands_test`): il seed non ne ha.

## Da documentare

- **Riga §19** (nuova decisione, es. D-208): ricerca pratiche per un pagamento → solo fatturate senza documento di pagamento; parametro `senza_pagamento=1` su `GET /api/pratiche/cerca` e stessa regola nel `pool` di `propostaDocumento`. Perché: un pagamento salda una fattura, proporre una pratica già saldata non ha senso. Chi: Ugo, 18/11/2026.
- **§7.9 / §8.1**: il parametro `senza_pagamento` di `pratiche/cerca` (lista chiusa `1|0`) e il fatto che il client lo invia per i pagamenti.
- **Guida** (`guida.js` della pagina Documenti): «Se il documento è un pagamento, fra le pratiche proposte ci sono solo le fatturate che non ne hanno già uno».
- Nota per il piano: nessuna ora nuova, ritocco dentro F6-A3/A4.
