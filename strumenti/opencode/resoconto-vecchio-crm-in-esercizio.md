# Resoconto — Anagrafica del vecchio CRM nel database di lavoro (P1, 14/11/2026)

**Esecutore: DeepSeek V4 pro.** Pacchetto `strumenti/opencode/vecchio-crm-in-esercizio.md`.

## Comando da lanciare su `decobrands_db`

Da `app/backend/` (lo lancia Claude Code dopo il controllo):

```bash
npm run import:vecchio-crm -- --db decobrands_db --aggiungi
```

- `--prova` facoltativo: fa tutto e poi rollback (non scrive nulla su `decobrands_db`).
- Senza `--aggiungi` il comportamento attuale resta invariato: `--db decobrands_import` (one-shot, `--sostituisci` svuota).
- `--aggiungi` è rifiutato su `decobrands_import` e con `--sostituisci`.

## Cosa fa la modalità additiva

Nessun `TRUNCATE`, nessuna modifica a soggetti/ruoli/legami/documenti/pratiche esistenti. Deduplica con ciò che c'è già:
stessa P.IVA/CF → stesso soggetto (aggiunge il ruolo se manca, D-102); stesso codice esterno `vecchio_crm` già presente → salta
(idempotente: il secondo giro non crea nulla). I soggetti/ruoli creati portano il codice esterno con fonte `vecchio_crm`
(`codici_esterni`). Un'agenzia (aperta o chiusa) già presente per la coppia cliente×fornitore non si tocca e finisce nei
conflitti (`agenzia_esistente`). Una sola transazione (V13) + un evento nel registro. Persone e contatti del vecchio CRM
non si importano (non servono ai documenti e il secondo giro li duplicherebbe).

A fine import scrive `dati-crm-legacy/import/da-inserire-in-integra.csv` con i fornitori e i clienti del vecchio CRM
senza corrispondenza nelle viste `public.integra_v_fornitori`/`integra_v_clienti` (per P.IVA normalizzata e, senza P.IVA,
per ragione sociale normalizzata): tipo, ragione sociale, P.IVA, città, codice vecchio CRM, numero di collegamenti.
Se le viste mancano, la colonna dice «viste di Integra assenti».

## Prove (su `decobrands_test_vecchio`, poi cancellato)

Preparazione: migrazioni; seminati un soggetto già presente con la stessa P.IVA di un cliente del vecchio CRM
(P.IVA 01731150361, PINI INCERTI VIRGINIA SRL) e un fornitore già presente (ALE IMPORT SRL, P.IVA 03613600406).

| Giros | soggetti | clienti | fornitori | subagenti | interscambio |
|---|---|---|---|---|---|
| `--aggiungi --prova` (rollback) | 1882 nuovi | 1858 nuovi | 19 nuovi, **1 saltato** | 23 nuovi | 1587 nuovi |
| `--aggiungi` (1ª) | 1882 nuovi | 1858 nuovi | 19 nuovi, **1 saltato** | 23 nuovi | 1587 nuovi |
| `--aggiungi` (2ª) | **0** | **0** | **0** | **0** | **0** |

Verifiche puntuali:
- fornitore **ARTE WOHNACCESSORIES GMBH & CO.KG** (id legacy 37, senza P.IVA) creato come fornitore senza soggetto.
- legame **Agri Aggio SNC / codice 45172 / ARTE / Maurizio Bastasin** presente (interscambio con
  `codice_cliente_fornitore = '45172'`).
- subagente **Maurizio Bastasin** creato (non era nel seed).
- il soggetto 01731150361 pre-esistente ha ricevuto il ruolo cliente (aggiunge il ruolo se manca).
- il fornitore ALE IMPORT pre-esistente è stato saltato (stessa P.IVA).
- `da-inserire-in-integra.csv`: 3421 righe con le viste popolate; ARTE presente con 153 collegamenti; ALE IMPORT e
  PINI INCERTI (presenti nelle viste) assenti dal CSV.

Controlli: `npx tsc --noEmit` nel backend pulito. Nessuna suite jest toccata (nessun file di prova ammesso).

## Review

Skill caricate davvero: `owasp-security`, `postgresql-code-review`, `ponytail-review`, `caveman`. Rilievi veri: nessuno
(solo query parametriche/Prisma, nessun input utente, nessun SQL dinamico; unica eccezione `svuotaImport` già esistente
con `TRUNCATE` su nomi di tabella fissi, non toccata). Scelta "lazy": persone/contatti del vecchio CRM non importati in
modalità additiva (vedi sopra), segnalata qui e nel codice.

## Da documentare

- **§19 — D-156** (da proporre): per provare con i documenti veri si attinge, **per ora**, anche all'anagrafica del
  vecchio CRM (fornitori, clienti, subagenti, collegamenti con codice cliente, sconti, subagente); ciò che manca in
  Integra si segna in `da-inserire-in-integra.csv` e si farà aggiungere. In esercizio la regola resta: un
  cliente/fornitore nuovo si inserisce prima in Integra e poi si trova nel CRM.
- **`specifica-anagrafica-soggetti.md` §7**: nuova modalità additiva `--aggiungi` dello script d'import del vecchio CRM
  (deduplica per P.IVA/CF e codice esterno, aggiunge il ruolo se manca, idempotente, agenzie già presenti non toccate).

## Aperto

- La colonna «viste di Integra assenti» non è stata provata con le viste vere (solo con viste di prova minime); va
  verificata sul `decobrands_db` reale, dove le viste ci sono.
- Il conteggio `gia_soggetti` include anche le fusioni interne del vecchio CRM (stessa P.IVA su più schede), non solo i
  soggetti già in database: è un dato informativo del riepilogo, non un errore.
