# Resoconto — Sconto cliente della OF/2026/002 (15/11/2026)

Esecutore: DeepSeek V4 pro · Pacchetto: `strumenti/opencode/sconto-cliente-002.md`.

## Diagnosi: dove nasce lo sconto cliente

Lo «sconto cliente» che la pagina pratica mostra (`pratiche.ts` `provvigione.sconto`) è
`interscambio.sconto`, l'unico campo canonico dello sconto (§5.7). La catena è:
`percentuali()` (`motore/motore.ts:125-140`) → `abbinamento()` (`:120`) → `interscambio.sconto`
(`motore/dati.ts:262`). Lo **scaglione** si sceglie con `scaglione()` (`motore.ts:109`) come
soglia più alta ≤ `interscambio.sconto`.

`interscambio.sconto` si scrive **solo** in due punti, mai dalle righe dei documenti:

- `prisma/import-vecchio-crm.ts:612-617` — import del vecchio CRM: `sconto = sconto1` preso da
  `collegamenti.csv`;
- `clienti.ts` `creaAgenzia` (`sconto: b.sconto ?? 0`, riga 315) e `modificaAgenzia` (riga 372/440)
  — a mano da `FormAgenzia`.

Lo **sconto di riga** dei documenti (il «Sonderrabatt/Rabatt» 10 % di ARTE) è un campo **diverso**
(`documenti_campi.righe[i].sconto`, letto da `lettura.ts` e corretto in *Correggi i dati letti*).
Entra **solo** nell'imponibile netto: `fattoreSconto()` in `proposta.ts:253` e il fallback
`quantità × prezzo × fattoreSconto` in `documenti.ts:1757`. Non tocca mai `interscambio.sconto`
né lo scaglione.

## Causa per la 002

`interscambio.sconto = 0` per AGRI AGGIO × ARTE (interscambio id 2480, codice 45172, confermata)
perché nel vecchio CRM `collegamenti.csv` aveva `sconto1 = 0` per quella coppia. **Non** perché la
pratica è stata elaborata prima di un codice che ricava lo sconto dai documenti: quel codice non
esiste e non è mai esistito. La OF/2026/002 (data ordine 25/08/2026) usa quell'agenzia → scaglione
0 (20 %/8 %). Il 10 % dei documenti è lo sconto di riga del fornitore, già dentro l'imponibile netto
(base 1840,23 €, come da `resoconto-sconto-pratica-002.md`).

## Conclusione

Lo sconto cliente **non si ricava mai dai documenti** (per disegno, §5.1/§5.7). Per la regola del
pacchetto («se non si ricava mai, dillo chiaro e proponi la regola, non inventarla nel codice»)
**non scrivo codice**: non è «dato vecchio» (non c'è un ricavo che la 002 ha mancato) né un errore
del flusso (le pratiche nuove con quest'agenzia hanno 0 per lo stesso motivo).

## Regola proposta (da confermare con Ugo)

- `interscambio.sconto` è il campo canonico che l'operatore imposta (`FormAgenzia`) o che arriva
  dall'import del vecchio CRM. Lo sconto di riga dei documenti (Rabatt/Sonderrabatt) è lo sconto del
  **fornitore** sulla merce → resta nell'imponibile netto, non nello scaglione. Collegarli in
  automatico confonderebbe lo sconto che Decobrands accorda al cliente con quello che il fornitore
  accorda sulla merce: non va fatto.
- Se Ugo conferma che per AGRI AGGIO × ARTE lo sconto cliente è **10 %**, è una **modifica di
  configurazione** dell'agenzia (`PUT /api/clienti/:id/agenzie/:aid` con `sconto: 10` o `FormAgenzia`),
  non un ricalcolo dai documenti. Verificato su `decobrands_db`: ARTE (fornitore 31) non ha bollettini
  chiusi né liquidazioni → **nessun periodo chiuso**, quindi D-114 non blocca il cambio. Provvigione
  attesa dopo: imponibile 1840,23 × scaglione 10 (18 %/6 %) = 331,24 € a Decobrands, 110,41 € al
  subagente (prima: 368,05 € / 147,22 €).

## File toccati

Nessuno (solo diagnosi in sola lettura su `decobrands_db`, nessuna scrittura).

## Prove

Nessuna: nessuna modifica al codice, quindi niente `tsc`/jest da lanciare.

## Controlli (skill caricate davvero)

- `caveman`: risposte concise.
- `owasp-security`: nessun codice nuovo; le SELECT su `decobrands_db` sono in sola lettura e non
  stampano dati sensibili oltre lo stretto necessario.
- `ponytail-review`: nessun diff da recensire.
- `postgresql-code-review`: non scrivo SQL di produzione.

## Da documentare

- **spec §5.7** (chiarimento, non decisione nuova): `interscambio.sconto` nasce dall'import del
  vecchio CRM o da `FormAgenzia`, mai dalle righe dei documenti; lo sconto di riga (Rabatt/Sonderrabatt)
  è lo sconto del fornitore e resta dentro l'imponibile netto, non determina lo scaglione.
