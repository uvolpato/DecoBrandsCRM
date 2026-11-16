# Resoconto — Sconto del 10% nella pratica OF/2026/002 (15/11/2026)

Esecutore: DeepSeek V4 pro · Pacchetto: `strumenti/opencode/sconto-pratica-002.md`.
Problema: in OF/2026/002 (AGRI AGGIO · ARTE WOHNACCESSORIES, ordini AU278665 e AU278666, proforma
PR102920, fattura RE196022) c'è uno sconto del 10% che la provvigione non rileverebbe.

## Diagnosi (sola lettura su `decobrands_db`, niente scritture)

- Lo sconto è **di riga**, non a piè di documento: su ogni riga degli ordini, della proforma e della
  fattura ARTE il «Sonderrabatt/Rabatt» del 10% è stampato accanto al prezzo unitario. Nessun
  documento contiene una riga di sconto totale in fondo.
- Lo sconto è **già riflesso** nei dati letti e salvati:
  - `documenti_campi.righe[i].sconto` = `10` (ordine AU278666 letto col nuovo schema: `sconto:10` nel
    JSON grezzo; fattura RE196022 letta prima, `sconto` letto null ma `finale` = 10 messo a mano);
  - ogni `ordini_fornitore_righe.importo` = quantità × prezzo × 0,9 (es. 12 × 7,8 × 0,9 = 84,24);
  - `importo_totale` = **1840,23** = somma delle righe scontate = **netto** (il lordo 2044,70 si vede
    solo nella grezza);
  - documento fiscale `ordini_fornitore_documenti.importo` = **1840,23** (netto).
- **La provvigione è già sull'imponibile scontato.** Il motore (`motore.ts` `quota(d.importo, pct)`,
  `quotaSub`, `provvigioneDoc`, `importoPratica` = `netto`) usa `d.importo` = netto. Per 002 vale
  1840,23 × pct (scaglione 0: 20%/8% → 368,05 € a Decobrands, 147,22 € al subagente), non il lordo
  2044,70. Coerente con la spec (§5.3, §4.2.7.1: base = netto dei documenti).
- Lo sconto si applica al salvataggio in `documenti.ts:1757` (`r.quantita * r.prezzo * fattoreSconto(r)`,
  già introdotto da `sconto-riga`) e si scarta: la tabella `ordini_fornitore_righe` **non ha la colonna
  `sconto`** (§4.2.8). Non tocca la provvigione, che usa l'importo del documento.

## Causa

Nessun difetto nel calcolo della provvigione: lo sconto di riga è «dentro» l'importo del documento
(netto), quindi la provvigione lo recepisce già. I pacchetti precedenti (`sconto-riga`,
`importo-calcolato`) avevano già sistemato lettura e calcolo dell'importo di riga; il motore non doveva
cambiare.

## File toccati

- `app/backend/test/motore.spec.ts`: **una prova nuova** (nessuna modifica a codice sorgente).

## Prove (0 KO)

- `npx tsc --noEmit` backend: **OK**.
- jest su `decobrands_test_sconto002` (creato, migrato, cancellato alla fine):
  - `motore.spec.ts`: **27/27** (1 nuova: fattura con importo netto 1840,23 → `importoPratica` 1840,23,
    provvigione 331,24 = 1840,23 × 18%, non 368,05 del lordo 2044,70);
  - `pratiche.spec.ts`: **20/20**;
  - `documenti-lettura.spec.ts` + `proposta.spec.ts`: **102/102**.

## Correzioni proposte su file bloccati

Nessuna: `proposta.ts`, `documenti.ts`, `VistaDocumento.tsx`, `CampoRicerca.tsx` non richiedono
modifiche. L'unica lacuna residua — `motore/dati.ts riga()` ricostruisce l'importo riga con
`qta × prezzo` senza sconto — **non** tocca la provvigione (che usa `d.importo`) e non è correggibile
senza aggiungere la colonna `sconto` a `ordini_fornitore_righe` (migrazione, fuori dai file ammessi).

## Cosa deve fare Ugo sulla 002

**Nulla.** I dati sono già corretti: `sconto` = 10 su ogni riga e importo documento = netto 1840,23; la
provvigione è già sull'imponibile scontato. La rilettura dei documenti non serve (e `rileggi` rifiuta
i documenti `abbinato`, come già notato in `sconto-da-grezza`).

## Da segnalare (fuori portata, per Ugo)

- L'agenzia AGRI AGGIO × ARTE ha `interscambio.sconto = 0`, quindi vale lo **scaglione 0** (20%/8%).
  Se il «Sonderrabatt 10%» dei documenti ARTE rappresenta lo sconto che Decobrands accorda al cliente
  (e non uno sconto del fornitore sulla merce), l'agenzia dovrebbe avere `sconto = 10` → scaglione
  10 (18%/6%). È una **questione di dato/configurazione** (§5.1/§5.7), non un bug di calcolo, e non
  riguarda l'imponibile di cui parla il pacchetto: da chiarire con Ugo.

## Da documentare (a cura di chi chiude l'onda)

- **spec §5.3** (chiarimento, non decisione nuova): lo sconto di riga è già dentro l'importo del
  documento (netto), quindi la provvigione è già calcolata sull'imponibile scontato; nessun calcolo
  separato dello sconto a piè di documento (ARTE stampa lo sconto per riga, non in fondo).
