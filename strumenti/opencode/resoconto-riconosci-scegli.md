# Resoconto — fornitore e cliente da scegliere (D-152)

Fatto.

## Cosa è stato fatto
- **Backend `proposta.ts`**: `Letto.fornitore` (nome letto), tipo `CandidatoSoggetto` (fonte, id, ragione sociale, P.IVA, città, motivo), `Contesto.integra_non_raggiungibile`, `Proposta.candidati_fornitore`/`candidati_cliente`/`integra_non_raggiungibile`, due esiti nuovi `fornitore_da_scegliere`/`cliente_da_scegliere`. Helper `candidatiFornitoreCrm` (nome simile) e `candidatiClienteCrm` (P.IVA uguale / nome simile), massimo 10 per fonte. In `propostaDocumento`: riconoscimento certo invariato (un solo soggetto del CRM; una sola riga di Integra → import come oggi); altrimenti candidati. Clienti letti una volta sola (riconoscimento + candidati).
- **Backend `documenti.ts`**: rotta `POST /api/documenti/:id/scegli` `{ruolo, fonte, id}` con `provvigioni.modifica` (+ `dati.importa` per Integra). Fonte CRM: collega il fornitore (fornitore_id + versione) o il cliente (scrive ragione sociale e P.IVA nei campi, verificati) in una transazione con `SELECT … FOR UPDATE` + evento; fonte Integra: riusa `importa` (D-133/D-111) con `documento_id` per il fornitore. `contestoDocumento` segna `integra_non_raggiungibile` quando il ponte risponde con errore.
- **Frontend `VistaDocumento.tsx`**: riquadro «Fornitore/Cliente da scegliere» con `Elenco` dei candidati, fonte come etichetta (`Stato`), pulsante *Scegli*, nota «Integra non raggiungibile», «Nessuno di questi» apre *Correggi i dati letti*. Etichette delle schede per i due esiti nuovi.
- **Guida `lib/guida.ts`**: una frase sulla scelta fra i candidati (D-152).
- **Prova `app_documenti.py`**: controllo nuovo (candidati visibili, scelta che ricarica) e mocks allineati ai campi nuovi. Solo `py_compile` (non lanciata).
- **Documentazione**: riga D-152 nel §19, *Perché (D-152)* in §6.5 e §7.9, descrizione in §7.9, versione 8.81 → **8.82**, pagine rigenerate (`genera-pagine-doc.py`).

## Prove
- `npx tsc --noEmit` backend → 0 errori; frontend → 0 errori.
- `npx jest test/proposta.spec.ts` su `decobrands_test_scegli`: **58/58** (5 nuovi casi D-152: certo CRM, due clienti stessa P.IVA → candidati, più nomi simili → candidati, certo Integra invariato, Integra giù → solo CRM con la nota).
- `npx jest test/documenti.spec.ts`: **59/59** (3 nuovi: scelta CRM cliente → riconosciuto; scelta Integra → `importa` con `documento_id`; senza `dati.importa` → 403).
- `python -m py_compile strumenti/prove/app_documenti.py` → ok.
- Database di prova `decobrands_test_scegli` creato e lasciato per il controllo finale (cancellazione a fine onda, come da regole).

## Rilievo corretto in corso d'opera
- Un test esistente (`il dettaglio porta i candidati di Integra`) usava il nome «Nuovo Fornitore SRL», che ora è anche simile al fornitore di seed «Nuovo Fornitore Demo SRL»: col D-152 diventava «candidati» invece di «import certo». Corretto il nome del documento di prova in «Zeta Giardini Sconosciuti SRL» per conservare l'intento del test (import certo).

## Da documentare (scelta di implementazione)
- **«Collegare il cliente» dal CRM**: il documento non ha un campo `cliente_id` (il cliente si riconosce per P.IVA/ragione sociale, V12). La scelta persiste scrivendo ragione sociale e P.IVA del cliente scelto nei campi `cliente`/`piva_cliente` (valore finale, verificati), così il riconoscimento successivo è univoco. Se in futuro servirà un legame esplicito documento→cliente, è un ampliamento.
- **Lista Documenti invariata**: i segni `fornitore_da_integra`/`cliente_da_integra` dell'elenco restano quelli di oggi (sola riga di Integra); l'elenco dei candidati è solo nella pagina del documento, come da D-152.

## Cose aperte
- Niente che blocchi. La prova Playwright nuova non è stata lanciata (la lancia Claude Code, come da regole).
