# Resoconto — Riferimenti del destinatario nelle email (15/11/2026)

Esecutore: DeepSeek V4 pro · Pacchetto: `strumenti/opencode/riferimenti-email.md`.
Problema: nelle email ai fornitori deve vincere il riferimento che **serve a chi riceve** (il numero
d'ordine che il fornitore conosce), non il nostro numero di pratica OF/2026/003.

## Censimento delle email generate (backend)

| Email | Dove | A chi | Quando parte | Riferimenti oggi | Esito |
|---|---|---|---|---|---|
| Sollecito conferma | `solleciti.ts` `testoFornitore` | fornitore | Oggi → conferme in ritardo, copia il testo | nostro numero OF, cliente, codice, importo, attesa | **corretta** |
| Sollecito bollettino | `solleciti.ts` `sollecitoBollettino` | fornitore | bollettino del mese non arrivato | numeri delle fatture del fornitore + data + cliente + importo | già i suoi riferimenti |
| Contestazione bollettino | `bollettino.ts` `contestazione` | fornitore | righe contestate | numero fattura (dal suo bollettino) + cliente + data + importi | già i suoi riferimenti |
| Sollecito pagamento | `incassi.ts` `testoCliente` | **cliente** | fatture non pagate | numero fattura (del fornitore, che il cliente riceve) + data + fornitore + importo | già i suoi riferimenti |
| Password provvisoria | `posta.ts` `mandaPassword` | utente | nuovo utente / reimposta | username + password | non tocca |
| Avviso email cambiata | `posta.ts` `avvisoEmailCambiata` | vecchio indirizzo utente | cambio email | username, chi, quando | non tocca |
| Reset password (link) | `accesso.ts` `mandaLink` | utente | password dimenticata | link + username | non tocca |

**Non esiste** un «sollecito fattura» separato al fornitore (lo stato pratica è attesa conferma →
confermata → fatturata, §5.1); non c'era niente da correggere lì.

## Cosa ho fatto

Solo il **sollecito conferma** (l'unica email che oggi mette il nostro numero al primo posto). Tutto
sul server (V12), dai dati del database:

- **`solleciti.ts`**: `testoFornitore` ora scrive in testa `Ordine <numero del fornitore>` (campo
  `numero_ordine_fornitore`, D-169), poi data, cliente con «vostro codice cliente», importo,
  «conferma attesa entro il», e in fondo «nostro rif. OF/…» solo quando c'è il numero del fornitore.
  Singolare/plurale corretto: «inviarcela» con un ordine, «inviarcele» con più ordini.
- Nuova `numeriOrdineFornitore(db, S)`: legge `numero_ordine_fornitore` per le pratiche in ritardo;
  l'endpoint `GET /api/solleciti/conferme` la passa a `sollecitiConferme`. Se il numero manca, si usa
  il nostro numero d'ordine con data e cliente (nessun «nostro rif.», per non ripetere).
- `sollecitiConferme(S, numeriFornitore?)`: parametro opzionale (default vuoto), così le prove e il
  `POST /api/solleciti/conferme` (che registra le nostre pratiche nel registro) restano identici.

**Esempio prima → dopo** (un ordine):

```
# prima
- OF/2026/003 del 11/03/2026 · Florovivaistica Manente Soc. Agr. Semplice (vostro codice 44464) · 963,78 € · attesa entro il 10/04/2026
Vi chiediamo di inviarcele appena possibile, …

# dopo
- Ordine AU278665 del 11/03/2026 · Florovivaistica Manente Soc. Agr. Semplice (vostro codice cliente 44464) · 963,78 € · conferma attesa entro il 10/04/2026 · nostro rif. OF/2026/003
Vi chiediamo di inviarcela appena possibile, …
```

## File toccati

- `app/backend/src/solleciti.ts` (testo, endpoint, helper).
- `app/backend/test/oggi.spec.ts` (3 prove nuove: un ordine, due ordini, ordine senza numero del fornitore).

Non toccati `motore/*`, `proposta.ts`, `pratiche.ts`, `bollettini.ts`, `liquidazioni*` (pacchetto
`sconto-medio` in corso). Nessun'altra email ha bisogno di modifiche (v. censimento).

## Prove

- `npx tsc --noEmit` backend: **0 errori nei miei file**. Restano 2 errori **preesistenti** in
  `src/sconto-medio-ricalcola.ts` e `test/sconto-medio.spec.ts` (file del pacchetto `sconto-medio`,
  in parallelo, non miei).
- jest su `decobrands_test_email_rif` (creato, migrato, cancellato):
  - `oggi.spec.ts -t "riferimenti del fornitore"`: **3/3** (un ordine → «Ordine AU278665 … nostro rif. OF/…», «inviarcela»; due ordini → entrambi i numeri, «inviarcele»; senza numero → nostro numero con data e cliente, senza «nostro rif.»).
  - `oggi.spec.ts -t "solleciti"`: **7/7** (incluse le prove esistenti dell'endpoint e del registro).
  - Suite intera `oggi.spec.ts`: 19/20, l'unico KO è **«scadenze e trimestre in corso»** (valore
    `da_liquidare` spostato dal pacchetto `sconto-medio` in parallelo, non mio).

## Controlli (skill caricate davvero)

- `caveman`: risposte concise.
- `owasp-security`: il testo mostra solo i dati del fornitore destinatario (suo ordine, suo codice
  cliente, suo importo), raggruppati per `fornitore_id`; nessun dato di altri clienti/fornitori.
  `numeriOrdineFornitore` usa `id: { in: ids }` da Prisma (nessun SQL concatenato, nessun input
  utente). Nessun segreto nel testo (i solleciti non vengono nemmeno inviati: si copiano e basta).
- `ponytail-review`: una sola helper, un parametro opzionale, nessuna astrazione nuova. Niente da tagliare.

## Da documentare (testo pronto, a cura di chi chiude l'onda)

- **spec §7.1** (sollecito di conferma) e **§5.12**: il testo mette in testa il numero d'ordine del
  fornitore (`numero_ordine_fornitore`, D-169) con data, cliente e «vostro codice cliente», importo e
  «conferma attesa entro il»; il nostro numero di pratica solo in fondo come «nostro rif. OF/…». Se il
  numero del fornitore manca, si usa il nostro numero d'ordine con data e cliente. Singolare/plurale
  coerente («inviarcela» / «inviarcele»).
- **spec §19** (nuova decisione): D-nn — nelle email ai fornitori vincono i riferimenti del
  destinatario (numero d'ordine del fornitore, ecc.); il numero della nostra pratica va in fondo come
  «nostro rif.», mai come primo riferimento. Chi: Ugo (15/11/2026). Dove: `solleciti.ts`.
