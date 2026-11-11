# F1-A11 — Anagrafica su richiesta da Integra (D-111) — resoconto

## Cosa si è fatto

L'anagrafica non si importa più in massa: la sincronizzazione **aggiorna e non crea**, e i
clienti/fornitori sconosciuti si cercano e si importano **su richiesta** (quando un documento li
chiede), con un clic. Nuove rotte `GET /api/integra/cerca` e `POST /api/integra/importa` dietro il
permesso `dati.importa` (operatore, area Dati).

## File toccati

| File | Cosa |
|---|---|
| `app/backend/src/anagrafica-integra.ts` | **nuovo**: `cerca`, `importa` e `AnagraficaIntegraController` |
| `app/backend/src/integra.ts` | `applicaCliente`/`applicaFornitore` non creano più; testo del giro senza «nuovi»; esportati `Riga`, `VISTE`, `datiCliente`, `datiFornitore`, `codiceDi`; metodo `IntegraService.ponte()` |
| `app/backend/src/soggetti.ts` | esportati `normalizzaPiva` e `datiFiscali` (riusati, non riscritti) |
| `app/backend/src/accesso.ts` | nuovo permesso `dati.importa` |
| `app/backend/src/app.module.ts` | registrato `AnagraficaIntegraController` |
| `app/backend/test/integra.spec.ts` | aggiornata: il giro non crea; versioni/anomalie come prima |
| `app/backend/test/anagrafica-integra.spec.ts` | **nuova** |

## Forma delle rotte

- `GET /api/integra/cerca?tipo=cliente|fornitore&q=…` (`dati.importa`)
  → `{ righe: [{ id_integra, codice, ragione_sociale, piva, attivo }], ms }`
  oppure `{ errore: 'ponte lento', ms }` oltre i 3 s.
  Ordine: codice esatto → P.IVA normalizzata → ragione sociale `ILIKE`, **LIMIT 10**; esclusi i
  codici già in `codici_esterni`; nessun conteggio e nessuna scansione completa.
- `POST /api/integra/importa` (`dati.importa`), corpo `{ tipo: 'cliente'|'fornitore', id_integra }`
  → `{ creato: true, id, soggetto_id, codice, ragione_sociale }` oppure `{ gia_presente: true, id }`.
  Il server rilegge la riga dalla vista per id: dal browser arriva solo `tipo` e `id_integra` (V12).

## I quattro casi di `importa`

1. **Nuovo** — nessun codice in `codici_esterni`, nessun soggetto con la P.IVA/CF: crea soggetto
   (`sorgente='integra'`, codice `C0000nn` dalla sequenza) + ruolo (`clienti`/`fornitori`) + versione
   (`fonte='integra'`) + `codici_esterni` (`etichetta` = codice) + evento `crud.create`.
2. **Ruolo aggiunto** — soggetto già presente con la stessa P.IVA/CF ma senza quel ruolo: aggiunge
   il ruolo (nuovo `clienti`/`fornitori` con `soggetto_id`), non un secondo soggetto.
3. **Già presente per codice** — `codici_esterni (integra, tipo, codice)` esiste: `{ gia_presente: true, id }`, nessuna scrittura.
4. **Già presente per P.IVA** — soggetto con la stessa P.IVA/CF che ha già quel ruolo: `{ gia_presente: true, id }`, nessun secondo ruolo.

Tutto in **una transazione** (`db.$transaction`, V13); il log `crud.create` è dentro la transazione.

## Tempi della ricerca

- LIMIT 10 e ordine dal più preciso; nessuna `exists` correlata (che sul ponte vero supera i 120 s).
- `Promise.race` con timeout di 3 s (`conTempo`): oltre si risponde `{ errore: 'ponte lento' }`,
  non un 500. Prova sul ponte finto: 12 righe → 10 restituite, `ms < 3000`.

## Prove (ogni `.spec.ts` in un processo a sé, 0 KO)

| Suite | Esito |
|---|---|
| `test/anagrafica-integra.spec.ts` | 12/12 |
| `test/integra.spec.ts` | 19/19 |
| `test/soggetti.spec.ts` | 22/22 |
| `test/accesso.spec.ts` | 26/26 (da sola) |
| `test/utenti.spec.ts` | 18/18 |
| `test/seed.spec.ts` | 8/8 |
| `test/sistema.spec.ts` | 22/22 (vedi nota sotto) |
| `npx tsc --noEmit` | pulito |

Numeri chiave delle nuove prove: crea cliente → 1 soggetto + 1 cliente + 1 versione + 1 codice
(etichetta = codice) + 1 evento; ruolo aggiunto → `soggetti` resta 1; idempotenza → nessuna scrittura;
`cerca` → 10/12 righe, codice esatto per primo, esclusi gli importati; 403 senza `dati.importa`.

Nota `sistema.spec.ts`: i 22 test passano, ma Jest segnala un handle aperto dal poller della casella
(`casella.ts`, F5/F6) dopo il termine. Non riguarda questa slice (nessun file della casella toccato).

## Dubbi / punti aperti

1. **`codice_master`** non è una colonna di `integra_v_clienti`/`integra_v_fornitori` (solo di
   `integra_v_agenti`, D-106): la ricerca usa `codice` esatto. Col ponte vero, se espone
   `codice_master`, basta aggiungerlo a `VISTE`.
2. **`paese` della vista** è un codice (`cli_stacod`, es. 086/094), non ISO: il master
   `soggetti.paese` parte da `'IT'`. Per le 23 P.IVA estere servirebbe la mappatura stacod→ISO,
   da fare con il ponte vero.
3. **Esclusione già-importati dopo LIMIT 10**: se i primi 10 risultati sono tutti già importati,
   la risposta può essere vuota anche con altri non importati oltre. È il compromesso di D-111
   (niente conteggi né scansioni), accettato.
4. **Timeout "ponte lento"**: `Promise.race` risponde subito ma non annulla la query `pg`
   sottostante, che può restare appesa a una connessione del pool. Se diventasse un problema,
   `query_timeout` su `creaPonte`.
5. Errori del ponte **non** da lentezza (es. connessione rifiutata) finiscono nel 500 generico:
   il brief chiedeva il messaggio solo per il caso «lento».

## Controlli caricati

`owasp-security` e `ponytail-review` (caricate davvero). Rilievi veri applicati: nessuno di
sostanza — le query usano parametri legati (`$1`…), `schema` è validato da `integrainConfig`
(`/^[A-Za-z_][A-Za-z0-9_]*$/`), `tipo`/`id_integra` validati dal DTO, permessi sul server
(`@Richiede`), una transazione per l'import, nessuna password/indirizzo nei testi.

## Righe per spec §19 / piano / avanzamento (NON applicate)

- **spec §19** (nota di chiusura accanto a D-111): «F1-A11 (12/11/2026): implementato — la
  sincronizzazione aggiorna e non crea; `GET /api/integra/cerca` (LIMIT 10, 3 s) e
  `POST /api/integra/importa` (transazione, idempotente per codice e P.IVA) dietro `dati.importa`;
  il paese del master parte da 'IT' finché non c'è la mappatura stacod→ISO.»
- **piano-lavoro** F1-A11: «consegnata, ore a consuntivo — da approvare se fuori preventivo».
- **avanzamento-app.md**: «F1-A11 completata: import su richiesta da Integra con ricerca mirata e
  permesso `dati.importa`; il master `soggetti` si popola solo con i soggetti importati (D-107/D-111).»
