# Riconoscimento coerente fra elenco, dettaglio e Correggi (15/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità: P1. Prima leggi `resoconto-somiglianza-pr102813.md` e `resoconto-conferme-multiple.md` (modifiche non committate negli stessi file).

Regole comuni: `regole-onda-parallela.md`. **Niente `cd`, niente `/tmp`, niente `&`, non leggere `.env`.** Su `decobrands_db` solo letture; prove su `decobrands_test_coerente` (crealo, migrazioni, poi cancellalo). Mai 8001/8002, Integra. Niente commit.

## Caso (Ugo, PR102813)
Il dettaglio a destra riconosce tutto (Fornitore ARTE, Cliente AGRI AGGIO, codice 45172, pratica proposta OF/2026/001: la ri-risoluzione all'apertura del pacchetto `somiglianza-pr102813`), ma:
1. **Elenco a sinistra**: la stessa proforma dice «fornitore non riconosciuto» (l'elenco usa il `fornitore_id` salvato, che è ancora null).
2. **Intestazione del documento**: sotto «Codice cliente 45172» compare di nuovo il nome del cliente (link) → **toglierlo**. Al suo posto: **spunta verde** se il codice cliente corrisponde (agenzia del fornitore con quel codice) al cliente associato, **avviso giallo** con il motivo se non corrisponde (codice di un altro cliente, codice senza agenzia, agenzia da confermare).
3. **Correggi i dati letti**: il Fornitore è compilato (pallino verde) ma il **Cliente no**, anche se il dettaglio lo riconosce. Deve partire con il cliente riconosciuto/associato (stessa logica del dettaglio), pallino verde.

## Da fare
- **Una sola fonte del riconoscimento**: il risultato della ri-risoluzione (fornitore e cliente) usato da dettaglio, elenco e Correggi deve essere lo stesso. Proposta: quando la ri-risoluzione all'apertura trova un fornitore/cliente **certo** e il documento non ne ha uno salvato, il server lo **salva** sul documento (una transazione, registro «riconosciuto all'apertura»; mai sovrascrivere una scelta a mano), così l'elenco lo vede. In più, all'avvio del server o con un comando di servizio, ri-risolvi una volta i documenti da lavorare che hanno `fornitore_id` null (scrivi il comando nel resoconto; lo lancia Claude Code su `decobrands_db`). Se trovi una soluzione più semplice e corretta, spiegala.
- Intestazione: punto 2 sopra (frontend `VistaDocumento.tsx` + il dato dal server: lo stato della corrispondenza codice ↔ cliente lo calcola il server, V12, riusa `agenziaPerCodice`).
- Correggi: punto 3 (il valore iniziale di `cliente_id` = cliente associato/riconosciuto dal server).
- Spiega nel resoconto **cosa succede se Ugo abbina PR102813 così com'è** a OF/2026/001: quali dati si scrivono sul documento e sulla pratica (cliente, fornitore, agenzia, numero d'ordine), e se sono giusti; verificalo con una prova jest e in sola lettura sui dati veri.

## File ammessi
`app/backend/src/proposta.ts`, `app/backend/src/documenti.ts`, `app/backend/test/**`, `app/frontend/app/(app)/documenti/**`, `app/frontend/lib/guida.ts`, `strumenti/prove/app_documenti.py`, il resoconto `strumenti/opencode/resoconto-riconosciuto-coerente.md`.

## Fine
- `npx tsc --noEmit` backend e frontend; jest delle suite toccate.
- `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e` e `bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_documenti` (timeout 10 min), 0 KO.
- Skill: `owasp-security`, `ponytail-review`, `caveman`.
