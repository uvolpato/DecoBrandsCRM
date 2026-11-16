# Resoconto — Comandi di servizio per i dati già caricati (P1, 15/11/2026)

**Esecutore: DeepSeek V4 pro.** Pacchetto `strumenti/opencode/comandi-servizio.md`. Regole comuni rispettate: niente `cd`/`/tmp`/`&`, `.env` mai letto (URL costruito con grep, mai stampato), solo letture su `decobrands_db` (nessuna eseguita: i comandi su `decobrands_db` li lancia Claude Code), prove su `decobrands_test_servizio` (creato, migrazioni, seed, poi cancellato), niente 8001/8002, niente Integra, niente commit.

## Cosa è stato fatto

Script unico di servizio `app/backend/prisma/sistema-dati.ts` (comando npm `servizio:sistema-dati`), stesso stile di `import-vecchio-crm.ts`: `--db <nome>`, `--prova` = tutto in una transazione poi rollback, una sola transazione (V13, D-36), idempotente, mai sovrascrivere scelte a mano, un evento nel registro coi conteggi (`entita: 'servizio'`).

1. **Righe delle pratiche** (`confronto-righe`, D-176): per i documenti `ordini_fornitore_documenti` con `arrivo_id` non null, tipo con fase (`ordine`/`conferma`/`proforma`/`fattura`) e `righe` vuote, copia le righe lette (`lettoDaCampi`) come fa oggi `registra` (fase da `faseDi`, importo letto oppure quantità × prezzo). Riusa `faseDi` — **esportata** da `documenti.ts` (era `const` interna, come previsto dal resoconto).
2. **Fornitore riconosciuto** (`riconosciuto-coerente`, D-175): per i documenti in `da_controllare`/`errore` con `fornitore_id` null, risolve con `risolviFornitore` (blocco `FOR UPDATE`, come `salvaFornitoreRiconosciuto`) e salva solo se certo. Mai sovrascrive un `fornitore_id` già presente.
3. **Numero d'ordine del fornitore** (`numero-ordine-fornitore`, D-169): per le pratiche con `numero_ordine_fornitore` null, lo prende dal `numero` del documento d'ordine abbinato (il primo per data/id, lo stesso valore che `nuovaPratica` usa da `b.numero`), con controllo dell'unicità fornitore + numero; in conflitto non scrive e rapporta. La garanzia vera è l'indice univoco parziale `(fornitore_id, numero_ordine_fornitore)` della migrazione D-169: un doppione fermerebbe comunque la transazione.
4. **Zeri iniziali nei codici articolo**: l'aperto di `confronto-righe` **non è vero** — i dati reali sono puliti (i codici «007» e «7» non coesistono), come già verificato lì. Nessuna modifica a `chiaveRiga`/`normalizzaCodice`; se in futuro i codici con zeri iniziali comparissero davvero, si decide nel §19.

## Prove

Su `decobrands_test_servizio` (creato, `prisma migrate deploy` + seed, poi **cancellato**):

- `npx tsc --noEmit` backend: pulito.
- jest, una suite per volta (DATABASE_URL_TEST → `decobrands_test_servizio`):
  - `sistema-dati.spec.ts` (nuova): **7/7** — copia righe (fase dal tipo, importo letto), fornitore risolto e salvato, nome non riconoscibile → non salvato, numero d'ordine scritto, conflitto fornitore+numero → non scritto, scelta a mano non sovrascritta, secondo giro = 0 modifiche + un solo evento.
  - `documenti-pratica.spec.ts`: **27/27** (era 26/27: il KO pre-esistente «D-87 scaglione» aspettava `/scaglione/`, allineato a `/percentuali/` dopo D-162).
  - `documenti.spec.ts`: **68/68** (per la modifica `faseDi` esportata, ininfluente sul comportamento).
- **Prova del comando** (CLI, su seed che riproduce il punto 3 — le pratiche di prova hanno `numero_ordine_fornitore` null e l'ordine col suo `numero`):
  - `--prova`: `PROVA (rollback): … 54 numeri d'ordine scritti (0 conflitti)` (poi verifica: niente persiste);
  - senza `--prova`: `Completato: … 54 numeri d'ordine scritti`;
  - secondo lancio: `0 numeri d'ordine scritti` (idempotente).
  - I punti 1 e 2 sono coperti dai test jest (il seed non crea documenti in arrivo né righe vuote).

## Comando esatto da lanciare su `decobrands_db` (Claude Code)

```bash
cd app/backend && npm run servizio:sistema-dati -- --db decobrands_db
# prima una prova a secco (rollback), poi quella vera:
cd app/backend && npm run servizio:sistema-dati -- --db decobrands_db --prova
```

Conta su `decobrands_db`: il caso atteso reale è OF/2026/001 con l'ordine AU276839 (51 righe) → punto 1 (1 documento, 51 righe), punto 2 (PR102813 `fornitore_id` null → ARTE 31), punto 3 (OF/2026/001 ← AU276839).

## Controlli (skill caricate davvero)

- `owasp-security`: nessuna iniezione. Tutte le query sono Prisma parametrizzate o `$queryRaw` con placeholder (il `FOR UPDATE` usa `${id}`); il numero d'ordine scritto viene dal campo `numero` del DB, mai dal browser; niente input dell'utente raggiunge SQL.
- `postgresql-code-review`: indice univoco parziale D-169 già presente fa da garanzia reale sul punto 3; `righe: { none: {} }` diventa `NOT EXISTS`; niente indici nuovi necessari per un comando one-shot (la scansione su `numero_ordine_fornitore` null è su una tabella piccola).
- `ponytail-review`: lean. `sistemaDati` riusa `faseDi`/`lettoDaCampi`/`risolviFornitore`/`r2`/`logEvent`; nessuna astrazione o dipendenza nuova. `net: 0`.

## Da documentare

- **§19 — D-176**: le righe lette si copiano nella fotografia della pratica (§4.2.8) all'abbinamento/registrazione del documento, fase dal tipo (già descritto nel resoconto `confronto-righe`); il comando di servizio ne fa il riempimento retroattivo. Il numero resta da assegnare dal lead nel registro §19.
- **§6.5 / §7.9**: il numero d'ordine del fornitore (D-169) si retro-scrive sulle pratiche già caricate dal `numero` del documento d'ordine abbinato (stesso valore che `nuovaPratica` usa da `b.numero`); la coppia fornitore + numero resta unica (indice parziale).

## Aperti / note

- **Zeri iniziali nei codici**: non serve alcuna modifica (dati reali puliti, aperto non vero); resta la nota nel §19 se mai servisse.
- **Punto 3 su dati di prova**: il seed usa come `numero` dell'ordine il numero della pratica (es. «OF/2026/041»), non un numero reale di fornitore; sulla `decobrands_db` il `numero` dell'ordine è quello vero (AU276839, come da resoconti). Il comportamento è lo stesso, cambia solo il valore.
- **Solo letture su `decobrands_db` non eseguite** (le lancia Claude Code): i conteggi attesi sopra vengono dai resoconti `confronto-righe`/`riconosciuto-coerente`/`numero-ordine-fornitore`, non da query nuove.
