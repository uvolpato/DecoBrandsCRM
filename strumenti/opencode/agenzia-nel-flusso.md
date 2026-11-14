# Agenzia mancante: prima dal vecchio CRM, poi creata senza uscire dal flusso (14/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità: **P1** (Ugo è fermo nel giro con i documenti veri).

Regole comuni: `regole-onda-parallela.md`. **Niente `cd`, niente `/tmp`, niente `&`, non leggere `.env`.** Prove solo su `decobrands_test_agenzia` (crealo, migrazioni, poi cancellalo). **Non scrivere su `decobrands_db`: i comandi su quel database li lancia Claude Code.** Mai porte 8001/8002, Integra mai. Niente commit.

## Situazione
Documento vero: ordine ARTE WOHNACCESSOIRES del **17/02/2026**, cliente AGRI AGGIO, codice 45172. In *Apri la pratica* (`VistaDocumento.tsx`, componente `ApriPratica`) con fornitore e cliente scelti compare «Il cliente non ha un'agenzia con questo fornitore alla data dell'ordine: aggiungila in Clienti».
**Causa trovata**: l'agenzia c'è, importata dal vecchio CRM (`app/backend/prisma/import-vecchio-crm.ts`, modalità `--aggiungi`, `resoconto-vecchio-crm-in-esercizio.md`), ma con `valido_dal = DAL` = **2026-11-08** (data dell'estratto, riga ~570 per `interscambio`): non copre gli ordini precedenti.

## Cosa vuole Ugo (D-158, proponilo nel resoconto)
«Prima battuta prendo dal vecchio, seconda lo configuro.»

### 1. Dal vecchio CRM
- Nell'import, le **agenzie** (`interscambio`) prese dal vecchio CRM valgono **da sempre**: `valido_dal` = `2000-01-01` (costante con commento: il vecchio CRM non ha la data d'inizio dell'agenzia). Solo per `interscambio`; il resto (sedi, recapiti, versioni) resta com'è.
- Opzione nuova `--correggi-date` (con `--db decobrands_db --aggiungi`, anche con `--prova`): porta a `2000-01-01` il `valido_dal` delle agenzie già importate dal vecchio CRM che hanno ancora `valido_dal = 2026-11-08`, **solo** se non hanno righe successive per la stessa coppia, nessun periodo chiuso/liquidazione che le usi, e nessuna modifica dopo l'import. Riconoscile da come le marca l'import (fonte/codice esterno: verificalo nello script). Una transazione, un evento nel registro con il numero di righe. Idempotente.
- Se nell'elenco del vecchio CRM (`dati-crm-legacy/collegamenti.csv`) c'è una coppia che nel database non ha agenzia (es. scartata dall'import), il server la **propone** (vedi punto 2) con i dati del vecchio CRM.

### 2. Configurarla nel flusso
In *Apri la pratica* (e ovunque compaia lo stesso avviso nel documento, es. riquadro «agenzia mancante» D-152 riga ~561), al posto di «aggiungila in Clienti»:
- pulsante **«Aggiungi l'agenzia»** che apre la finestra già esistente **`app/frontend/componenti/FormAgenzia.tsx`** («Nuova agenzia per …»), sopra la modale, con **cliente, fornitore e codice cliente presso il fornitore già compilati e non modificabili** (codice dal documento letto; se il vecchio CRM ha la coppia, anche sconto e subagente proposti, modificabili); data d'inizio proposta = data dell'ordine o prima (modificabile, mai dopo la data dell'ordine).
- **Crea** crea l'agenzia con la rotta che già usa `FormAgenzia` (stessi controlli del server, V12/V13, permessi: chi non ha il permesso delle agenzie vede il pulsante spento con il motivo nel `title`); alla chiusura la modale *Apri la pratica* ricontrolla e l'avviso sparisce, e si può aprire la pratica senza uscire.
- `FormAgenzia` riceve i campi bloccati con una prop semplice (es. `bloccati: ('cliente'|'fornitore'|'codice')[]`) senza cambiare il comportamento nella pagina Clienti.

### Server
- Se serve, una rotta in sola lettura per la proposta dal vecchio CRM per la coppia (codice, sconto, subagente) leggendo i dati già importati o `collegamenti.csv`: scegli la forma più semplice e scrivila nel resoconto.

## File ammessi
`app/backend/prisma/import-vecchio-crm.ts`, `app/backend/src/documenti.ts`, `app/backend/src/proposta.ts`, `app/backend/src/clienti.ts` (agenzie), i loro spec in `app/backend/test/`, `app/frontend/componenti/FormAgenzia.tsx`, `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`, `app/frontend/lib/guida.ts`, `strumenti/prove/app_documenti.py`, il resoconto. Vietati: schema, migrazioni, seed, spec, piano.

## Fine
- `npx tsc --noEmit` backend e frontend; jest delle suite toccate, una per volta, su `decobrands_test_agenzia`; prova dello script con `--aggiungi` e `--correggi-date --prova` sul database di prova (come nel resoconto del vecchio CRM, URL costruito con grep senza stamparlo).
- `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e` e `bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_documenti app_clienti` (timeout 10 min), 0 KO; controllo nuovo: «Aggiungi l'agenzia» apre la finestra con i campi bloccati, Crea fa sparire l'avviso. Attenzione al limite di 10 accessi per utente nella prova (D-41): usa un altro utente se aggiungi un blocco.
- Skill da caricare davvero: `owasp-security`, `postgresql-code-review`, `ponytail-review`, `caveman`.
- Resoconto `strumenti/opencode/resoconto-agenzia-nel-flusso.md`: comando esatto di `--correggi-date` per `decobrands_db`, conteggi della prova, «Da documentare» (§7.9, §5, §19 D-158).
