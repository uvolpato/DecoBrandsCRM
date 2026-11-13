# Resoconto pacchetto 1-16 correzioni 1 — Sollecito: importo e numeri dell'evento solo dalle fatture davvero sollecitate

Data: 12/11/2026 · Esecutore: DeepSeek V4 pro · Gravità: P3 · Rilievo: C1

## Cosa ho fatto

### C1 — `importo_totale` ed elenco dei numeri calcolati dopo il blocco

`app/backend/src/incassi.ts` (metodo `registra`, `POST /api/pagamenti/solleciti`):

- dopo l'`updateMany` si rileggono le sole fatture ancora da sollecitare (`findMany` con lo stesso
  filtro `daSollecitare` usato dall'aggiornamento, `{ id: { in: ids }, stato_incasso: { not: 'pagata' } }`)
  e da quelle si calcolano l'`importo_totale` e l'elenco dei **numeri**;
- l'evento `documento.export` scrive ora `fatture` come elenco di numeri (non più il solo
  `aggiornate.count`) e `importo_totale` = somma delle sole fatture aggiornate: una fattura segnata
  *pagata* fra `caricaDati` e il `FOR UPDATE` non entra né nell'importo né nell'elenco.

La risposta della rotta resta invariata (`fatture` = conteggio, `solleciti` = `massimo + 1`): il
frontend (`componenti/Solleciti.tsx`) non legge la risposta della POST, solo l'esito.

## Prova

`app/backend/test/incassi.spec.ts`, nuovo caso C1: due fatture dello stesso cliente portate a
`insoluta`; una connessione separata tiene bloccata la fattura con id minore (`SELECT … FOR UPDATE`),
la POST resta ferma sul blocco dopo aver letto i dati, l'altra fattura diventa `pagata`, poi si
sblocca. Si verifica che l'evento abbia `fatture = [numero della sola fattura rimasta]` e
`importo_totale` uguale al suo importo.

## Prove lanciate (database `decobrands_test_1_16c`)

| Prova | Esito |
|---|---|
| `npx prisma migrate deploy` su `decobrands_test_1_16c` | tutte le migrazioni applicate |
| `npx jest test/incassi.spec.ts` | **9 prove, 0 KO** (8 esistenti + il nuovo C1) |
| `npx tsc --noEmit` (backend) | 0 errori nei miei file; restano 4 errori in `test/motore.spec.ts` (313–314) e `test/utenti.spec.ts` (162–163), file di altri pacchetti dell'onda, non toccati |

Database `decobrands_test_1_16c` creato e migrato apposta. Mai toccati `decobrands_db`,
`decobrands_test` condiviso, né Integra (192.168.239.49).

## Da documentare (per il pacchetto documentazione)

Il rilievo C1 corregge il punto 5 del resoconto 1-16 («risposta ed evento usano `aggiornate.count`
al posto di elenco numeri»), che era la causa del rilievo.

Testo pronto per §15.2.3 (evento `documento.export`): «L'evento del sollecito di pagamento riporta
`fatture` come **elenco dei numeri** delle fatture davvero sollecitate e `importo_totale` come la
loro somma, calcolati **dopo** il blocco (`FOR UPDATE`): una fattura segnata pagata in mezzo non
entra nell'evento (C1).»

Nessuna riga nuova nello schema `SCHEMI`: la chiave `fatture` resta, cambia solo il valore da
conteggio a elenco (come già `export.sollecito` con `pratiche`).

**Guida, piano, README**: nessun testo nuovo per l'utente; nessuna ora nuova.

## Cose aperte

1. **`tsc --noEmit` non passa nel backend** a causa di `test/motore.spec.ts` (313–314) e
   `test/utenti.spec.ts` (162–163), file fuori dai miei ammessi: nascono da altri pacchetti
   dell'onda. Non li ho toccati.
2. A7-25 resta aperto per la parte `liquidazioni.ts` / `motore/dati.ts` (dipende da A7-21), come
   già segnalato nel resoconto 1-16.
