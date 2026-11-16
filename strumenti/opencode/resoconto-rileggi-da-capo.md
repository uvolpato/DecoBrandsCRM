# Resoconto — «Rileggi il documento» su `Auftrag_AU278666.pdf` (rileggi-da-capo, 15/11/2026)

**Esecutore: DeepSeek V4 pro.** Pacchetto `strumenti/opencode/rileggi-da-capo.md`. Regole comuni rispettate: nessun `cd`/`/tmp`/`&`, `.env` mai letto (URL costruito con grep), solo letture su `decobrands_db`, niente 8001/8002, niente Integra, niente commit.

## Causa trovata: la rilettura funziona (caso 3 del pacchetto)

**Nessun bug.** La rilettura è partita e finita, e i campi sono stati azzerati e ricalcolati davvero. I valori coincidono perché il PDF è lo stesso e il riconoscimento ritrova le stesse cose.

### Cronologia del documento (`documenti_in_arrivo.id = 6`)

| Ora (UTC) | Evento | Fonte |
|---|---|---|
| 14:40:29 | upload `Auftrag_AU278666.pdf` | `documento.upload` |
| 14:41:05 → 14:42:17 | prima lettura (`in_coda → in_lettura → da_controllare`) | `documento.stato` |
| 17:14:49 | **Rileggi** (`in_coda`, `tentativi 0`) | `documento.update` |
| 17:15:02 → 17:16:47 | rilettura: primo giro fallito (servizio non raggiungibile, torna `in_coda` senza consumare il tentativo) | `documento.stato` |
| 17:16:47 → 17:16:52 | rilettura riuscita (`in_lettura → da_controllare`, `letto_il = 17:16:51.574`) | `documento.stato` |
| 17:18:17 | correzione a mano (livello `bassa → affidabile`, 1 campo) | `documento.update` |
| 17:19:59 | abbinato in pratica `2` | `documento.create` + `documento.match` |

### Perché i campi sono "gli stessi"

`letto_il = 17:16:51.574` è scritto **solo** da `lettura.ts:137` (in `salva`). Quindi la rilettura è passata da `salva`, che in una transazione:

1. `documenti_campi.deleteMany({ documento_id })` → azzera **tutti** i campi letti (fornitore, cliente, codice, righe, proposta, correzioni a mano comprese);
2. li ricrea dal nuovo riconoscimento;
3. ricalcola `tipo`, `fornitore_id`, `fornitore_versione_id`, `livello`, `controlli`, `lettura_grezza`.

Il fornitore letto è di nuovo «ARTE WOHNACCESSOIRES GMBH & CO.KG» (affidabilità 0,948) e il codice cliente di nuovo «45172» (0,883) → il cliente associato è di nuovo lo stesso (`interscambio` codice 45172 → `cliente_id 1`). La proposta «Nuova pratica» è ricalcolata a ogni GET da `propostaDocumento` sui campi nuovi. Nessun valore proviene dai dati vecchi del documento.

### Frontend

`VistaDocumento.tsx:464-474`: dopo `POST …/rileggi` la pagina fa `router.push('/documenti')` e l'elenco si aggiorna via SSE (`documento.stato`). Non tiene lo stato vecchio dell'intestazione aperta.

## File toccati

Nessuno. Caso 3: «non cambiare il codice».

## Prove

- Diagnosi in sola lettura su `decobrands_db` (script `pg` usa-e-getta, poi cancellato): documento, campi e registro come sopra. `letto_il = 17:16:51.574` dopo la rilettura → `salva` eseguita → campi azzerati e ricalcolati.
- `npx tsc --noEmit` e jest **non rieseguiti**: nessun file modificato, quindi invariati.

## Review

Skill caricate davvero: `owasp-security`, `ponytail-review`, `caveman`. Nessun codice scritto, nessun rilievo.

## Da documentare (§19 / guida)

Nessuna modifica necessaria: `guida.ts:125` descrive già il comportamento reale («tutti i campi letti vengono riscritti (comprese le correzioni a mano) e fornitore, cliente e abbinamento si riconoscono di nuovo»). Suggerimento per il §19 (opzionale, già coperto da D-170): esplicitare che «ripartire da capo» avviene in `salva` (lettura.ts), unico punto per prima lettura e rilettura, e che se il PDF non cambia i valori possono coincidere.

## Aperto

- Osservazione minore, non bloccante: l'evento di `rileggi` (`documenti.ts:1242`) scrive `prima: { stato: 'errore' }` **fisso**, anche quando il documento era `da_controllare` (caso D-170). Solo cosmetica, non tocca il comportamento. Segnalata, non corretta (nessuna modifica di codice in questo pacchetto).
