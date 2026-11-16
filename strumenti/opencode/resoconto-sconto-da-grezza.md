# Resoconto — Sconto ricavato dalla lettura grezza (16/11/2026)

Esecutore: DeepSeek V4 pro · Pacchetto: `strumenti/opencode/sconto-da-grezza.md`.
Problema: i documenti letti prima di `sconto-riga` hanno la colonna «Sconto» vuota in *Correggi i
dati letti*. `lettura_grezza` (D-170 §19) conserva la risposta del lettore per ricavare campi nuovi
senza rileggere: si può ricavare anche lo sconto?

## Diagnosi (solo SELECT su `decobrands_db`, nessuna scrittura)

- Il «documento 4» della richiesta è in realtà `Rechnung_RE193071.pdf` (tipo **fattura**, stato
  `abbinato`). L'ordine ARTE WOHNACCESSOIRES del problema sono i documenti **5 e 6**
  (`Auftrag_AU278665/6.pdf`, fornitore `ARTE WOHNACCESSOIRES GMBH & CO.KG`, stato `da_controllare`).
- `lettura_grezza` è l'intero JSON del job LlamaCloud (chiavi `extract_result`,
  `extract_metadata`, `usage`, `document_input_value`, …). Contiene:
  - `extract_result.righe`: le righe estratte con le chiavi `codice, descrizione, quantita, prezzo,
    importo, provvigione, numero_fattura, data_fattura` — **niente `sconto`** (lo schema all'epoca
    non lo chiedeva).
  - `extract_metadata…citation.matching_text`: solo il valore estratto (es. «20656», «3.3»), **non**
    il testo della pagina né le intestazioni di colonna.
  - `document_input_value`: stringa (riferimento al file); `grounded_items` e `metadata`: `null`.
- **Nessun documento (4–9) contiene «rabatt»/«sonderrabatt»/«sconto»/«discount»** in tutta la grezza
  (ricerca case-insensitive sull'intero JSON). L'effetto dello sconto si vede nei numeri (doc 5:
  2 × 14,90 = 29,80 → importo 26,82 = ×0,9), ma la colonna «Rabatt» non è mai stata estratta né citata.

**Esito: lo sconto non è nella grezza.** La grezza conserva solo l'estrazione strutturata col vecchio
schema più citazioni limitate al valore; non conserva il testo/markdown della pagina. La premessa di
D-170 («ricavare campi nuovi senza rileggere») vale solo per campi ricavabili da valori già estratti:
lo sconto non lo era, quindi non è recuperabile. Non si è implementato nulla (step 3 del pacchetto:
«non implementare la rilettura senza conferma»).

## Strada proposta (da confermare)

Rileggere il documento con il lettore attuale (lo schema ora include `sconto`). Esiste già
`POST /api/documenti/:id/rileggi` (`app/backend/src/documenti.ts:1226`), ma accetta solo `errore` e
`da_controllare`:
- documenti **5–9** (`da_controllare`): si possono già rileggere con `rileggi`; la nuova lettura
  popola `sconto`.
- documenti **1–4** (`abbinato`): `rileggi` li rifiuta (`ConflictException`). Per recuperare lo sconto
  su quelli già abbinati serve una decisione di Ugo (estendere `rileggi` ad `abbinato`, oppure accettare
  che resti vuoto).

## File toccati

Nessuno (solo diagnosi in sola lettura).

## Prove

Nessuna: nessuna modifica al codice, quindi niente `tsc`/jest da lanciare.

## Controlli (skill caricate davvero)

- `caveman`: risposte concise.
- `owasp-security`: nessun codice nuovo; le SELECT su `decobrands_db` sono in sola lettura e non
  stampano dati sensibili oltre lo stretto necessario.
- `ponytail-review`: nessun diff da recensire.

## Da documentare

Nessuna decisione nuova. Eventuale chiarimento per Ugo: la premessa di D-170 va letta come «ricavare
solo ciò che è già presente fra i valori estratti», non «ricavare qualunque campo»: la grezza non
conserva il testo della pagina, quindi i campi mai chiesti allo schema non si possono recuperare.

## Aperti / dubbi

- Il riferimento «documento 4, Auftrag ARTE WOHNACCESSOIRES» non combacia: il 4 è una fattura
  (Rechnung RE193071, abbinata); l'ordine ARTE sono i documenti 5/6. Non cambia l'esito (nessuno ha
  lo sconto in grezza).
- Decidere se estendere `rileggi` ai documenti `abbinato` (per i 1–4) o lasciar perdere: non l'ho fatto
  senza conferma.
