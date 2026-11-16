# Resoconto — Più conferme o proforme per la stessa pratica: parziali o sostitutive (P1, 15/11/2026)

**Esecutore: DeepSeek V4 pro.** Pacchetto `strumenti/opencode/conferme-multiple.md`. Regole comuni rispettate: niente `cd`/`/tmp`/`&`, `.env` mai letto (URL costruito con grep, mai stampato), solo letture su `decobrands_db`, prove su `decobrands_test_conferme` (creato, migrazioni, poi cancellato), niente 8001/8002, niente Integra, niente commit. In parallelo ha lavorato `riconosciuto-coerente` sugli stessi file: le sue modifiche sono state conservate (D-175, `salvaFornitoreRiconosciuto`, `esitoCodiceCliente`).

## Decisione di Ugo (D-174) — riassunto

Proforma = conferma (D-60 esteso). Una pratica può avere più conferme/proforme: la prima porta ad «attesa fattura» (come oggi); le successive si agganciano alla stessa pratica e all'abbinamento l'operatore sceglie «parziale» (si somma) o «sostituisce» (revisione: la vecchia resta in archivio come superata, non conta). Il CRM propone la scelta più probabile, non decide: «parziale» se la somma resta entro l'importo dell'ordine (tolleranza 1 %), «sostituisce» se l'importo è ≈ al totale dell'ordine o ≈ a quello di una conferma già presente. Progresso «Confermato X di Y» (somma delle conferme/proforme valide); se X < Y → «confermato in parte».

## Schema e migrazione

`ordini_fornitore_documenti` (sul documento della pratica, per conferme/proforme):
- `ruolo` `VARCHAR(15)` (`parziale` | `sostituisce`, nullable) — sta sul documento nuovo;
- `superato_da` `BIGINT` (nullable) — sta sul documento sostituito, punta all'id di chi lo sostituisce (più sostituiti possono puntare allo stesso sostituto). Nessuna FK: se il sostituto si cancella, il superato resta in archivio e non conta più (edge case raro, non gestito in D-174).

**Comando**: `npx prisma migrate deploy` (migrazione `20261115200000_conferme_multiple`, unica).

## Server

- **`proposta.ts`**: il pool di conferma/proforma non esclude più le pratiche già confermate (solo quelle fiscali). Nuove funzioni pure `ruoloConferma`/`superatiConferma` (+ `TOLLERANZA_CONFERME` = 0,01) esportate e riusate da `documenti.ts`. `Candidato` guadagna `ruolo` (parziale | sostituisce | null) e il motivo «confermato X su ordine Y: parziale/sostituisce». `CON_PROP` legge `id`/`importo`/`superato_da` dei documenti.
- **`documenti.ts`**: `NuovoDocumento.ruolo` (`@IsIn(['parziale','sostituisce'])`). In `registra` (un posto solo, usato da `abbina` e `crea`) si calcolano le conferme/proforme valide e l'importo ordine: se il ruolo è scelto si applica quello («sostituisce» marca `superato_da` sui precedenti con `superatiConferma`), altrimenti si applica la proposta. Tutto nella stessa transazione già esistente, con `FOR UPDATE` sulla pratica (V13); evento `documento.create` con `ruolo`/`superati`. `documentiPratica` espone `ruolo`, `superato`, `superato_da` (numero di chi sostituisce).
- **`motore/dati.ts`**: `tracciati` aggiunge `superato` (superato_da != null).
- **`motore/motore.ts`**: `importoPratica` esclude le conferme superate dalla stima.
- **`pratiche.ts` (`dettaglioPratica`)**: usa solo conferme/proforme valide; aggiunge `progresso` `{x, y, parziale}` (X = somma valide, Y = importo ordine). Il titolo della fase resta Conferma/Proforma; «confermato in parte» è nel progresso.

## Interfaccia

- **`VistaDocumento.tsx`**: per conferma/proforma su una pratica già confermata (candidato con `ruolo` non null) si apre la finestra «in più sulla pratica» con la scelta Parziale/Sostituisce, suggerimento preselezionato; l'abbinamento manda il ruolo scelto.
- **`VistaPratica.tsx`**: progresso «Confermato X di Y · confermato in parte» sopra il binario; i documenti superati in grigio con «superata da …».
- **`lib/guida.ts`**: voce «Più ordini, conferme e fatture» aggiornata (parziale/sostituisce, progresso).

## Prove

Su `decobrands_test_conferme` (creato, `prisma migrate deploy`, poi cancellato):
- `npx tsc --noEmit` backend e frontend: puliti.
- jest, una suite per volta: `proposta.spec.ts` **68/68**, `documenti.spec.ts` **68/68**, `documenti-pratica.spec.ts` **25/26** (1 KO pre-esistente, vedi sotto), `pratiche.spec.ts` **16/16**, `motore.spec.ts` **26/26**, `numero-ordine-fornitore.spec.ts` **7/7**, `riconoscimento-furbo.spec.ts` **18/18**.
- Test nuovi: in `proposta.spec.ts` (ruolo parziale/sostituisce, prima conferma → null, la pratica già confermata non è più esclusa); in `documenti-pratica.spec.ts` (due proforme parziali → progresso «Confermato 2.154,50 di 2.154,50», prima conferma → attesa fattura, conferma che sostituisce con la vecchia superata, più fatture parziali si sommano nel netto).
- Browser: `app_pratica.py` (progresso e somma di due proforme) e `app_documenti.py` (scelta ruolo col suggerimento preselezionato) aggiornati, `python -m py_compile` 0 errori. **Giro nel browser non lanciato** (regola onda: lo lancia Claude Code a fine onda).

## Sola lettura su `decobrands_db`

- **PR102813** (arrivo 2): proforma, `fornitore_id` null, codice 45172, importo 2.117,30, `numero_ordine_fornitore` null.
- **PR102848** (arrivo 3): proforma, `fornitore_id` 31, codice 45172, importo 37,20, `numero_ordine_fornitore` null.
- **OF/2026/001** (pratica 1): fornitore 31, cliente 1, stato `inviato`; un solo documento, l'ordine `AU276839` (2.154,50). Nessuna conferma/proforma ancora abbinata.

Il ri-eseguire la proposta su `decobrands_db` col codice nuovo richiede la colonna `superato_da` (assente finché la migrazione non è distribuita): la diagnosi di dettaglio l'ha già fatta `riconosciuto-coerente` (PR102813 e PR102848 → OF/2026/001 certo). Con lo stato attuale (nessuna proforma sulla pratica) entrambe sono «prima proforma», `ruolo` null: il comportamento di D-174 (parziale/sostituisce) scatta alla seconda ed è coperto dai test jest.

## Controlli (skill caricate davvero)

- `owasp-security`: nessuna iniezione. `ruolo` arriva dal DTO (`@IsIn`), i documenti da superare si calcolano da id letti dal DB nella transazione; nessun input del browser raggiunge SQL. Le rotte restano `@Richiede('provvigioni.modifica')`.
- `postgresql-code-review`: `superato_da` senza FK (dangling solo se il sostituto si cancella, edge raro); niente indici nuovi (si filtra `superato_da IS NULL` su `testata_id` già indicizzato).
- `ponytail-review`: lean. `ruoloConferma`/`superatiConferma` condividono `vicinoConferme`; nessuna astrazione nuova. `net: 0`.

## Da documentare

- **§4 (tabella `ordini_fornitore_documenti`)**: `ruolo` (`parziale`|`sostituisce`) e `superato_da` (id del documento che sostituisce, nullable, senza FK).
- **§5 (stati della pratica)**: la prima conferma/proforma porta ad «attesa fattura» come oggi; le successive si agganciano (parziale = si somma, sostituisce = la precedente resta superata e non conta). Lo stato resta quello che dà il motore da `fasePratica` (D-52), invariato.
- **§6.5 (abbinamento)**: per conferma/proforma la proposta non esclude più le pratiche già confermate; ogni candidato porta il suggerimento del ruolo (parziale se la somma resta entro l'ordine ±1 %, sostituisce se ≈ ordine o ≈ una conferma presente) con i numeri (somma attuale, importo ordine). All'abbinamento l'operatore sceglie; «sostituisce» marca `superato_da` sui precedenti. Le fatture parziali erano già sommate dal motore (`netto`), verificato.
- **§7.3 / §7.9**: nella pratica il progresso «Confermato X di Y» (somma delle conferme/proforme valide) e i documenti superati in grigio con «superata da …»; nel documento la finestra Parziale/Sostituisce con il suggerimento preselezionato.
- **§19 — D-174**: come sopra (decisione di Ugo, 15/11/2026).

## Aperti / note

- **`documenti-pratica.spec.ts` 1 KO pre-esistente**, non di questo pacchetto (già segnalato nei resoconti `proposta-pr102848` e `riconosciuto-coerente`): il test «pratica nuova solo se il fornitore ha uno scaglione (D-87)» aspetta `/scaglione/` nel 409, ma `scaglioneMancante` dice «percentuali». Viene dal lavoro D-162.
- **Giro nel browser non lanciato** (regola onda): `prepara.sh`/`giro.sh` su `decobrands_test_e2e` restano a Claude Code; i file `.py` sono aggiornati e compilati.
- **Migrazione su `decobrands_db`**: il codice nuovo richiede `ruolo`/`superato_da`; finché `prisma migrate deploy` non è eseguito sul database di sviluppo, la proposta non si ri-esegue lì. Nessun dato viene scritto prima del deploy.
- I flussi a mano che non passano dalla finestra (campo «Oppure abbina a un'altra pratica», «Registra un documento» sulla pratica) non mostrano la scelta: il server applica la proposta come ripiego. Da decidere con Ugo se aggiungere la scelta anche lì.
