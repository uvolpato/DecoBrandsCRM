# Resoconto · Collaudo documentazione finale (onda 2 + 3-01, 3-07, 3-09, 5-01, 5-04, 5-05, 6-01)

Esecutore: DeepSeek Flash · data 13/11/2026 · gravità P3.
Pacchetto: `strumenti/opencode/collaudo-doc-finale.md` (base `collaudo-2-doc-documentazione.md`).

## Esito

Fatto. Spec 8.79 → **8.80**, pagine rigenerate, `npx tsc --noEmit` in `app/frontend` → **0 errori**.
§19: 145 righe, **tutte con 6 celle** (contando `|` non preceduti da `\`). Nessun commit.

## Resoconti raccolti

Wave 2: `2-01`…`2-13`, `2-fine-correzioni-1`, `2-fine-correzioni-2` (manca `2-14`, non esiste).
Wave 3: `3-01`, `3-07`, `3-09`. Wave 5: `5-01`, `5-04`, `5-05`. Wave 6: `6-01`.
Più `finale-correzioni-1`.

## Righe §19 aggiunte (in ordine numerico)

- **D-115** (2-03, U2) connessioni solo al superutente.
- **D-118** (3-07, U5) sul maturato la nota di credito segue la sua fattura.
- **D-119** (5-05, U6) correzioni del bollettino contestato nel mese dopo.
- **D-121** (2-11, U8) tipo di provvigione fisso dopo la prima chiusura.
- **D-122** (3-01, U10) uno scartato torna in coda solo se ricaricato a mano.
- **D-123** (5-01, U11) stessa fattura su un'altra pratica solo con «multi-ordine».
- **D-125** (3-09, U13) connettore di lettura locale non scegliebile.
- **D-126** (5-04 + 6-01, U14) totali e differenze degli importi dal server.
- **D-150** (decisione di Ugo 13/11/2026) nota di credito sul maturato in un trimestre chiuso → liquidazione successiva.

**Numeri**: D-115, D-118, D-119, D-121, D-122, D-123, D-125, D-126 erano liberi. **D-127 era già il blocco
sotto i 744 px**: la regola della nota di credito, che `finale-correzioni-1` chiamava D-127, ha preso il primo
numero libero dopo l'ultimo del §19, **D-150**. D-124 era già documentata (onda 1) e non è stata duplicata.

## Altre voci applicate

- **§19 in testa**: nota «le decisioni fino a D-13 hanno il perché solo qui» (A9-07).
- **Righe *Perché*** in: §3.3 (D-81, D-84, D-86), §5.5 (D-121), §5.14 (D-118, D-150), §6.2 (D-119),
  §6.5 (D-122, D-125, D-92), §7.3 (D-93, A5-02), §7.7 (D-119, D-126), §7.9 (D-93, D-94, D-122, D-126),
  §7.15 (D-115, D-65, D-125), §8.3 (A7-07/guscio, WCAG 4.1.2), §10 (indici del motore), §11 (D-63),
  §16.4 (DataTable A5-07/A7-04/A7-05 + D-126, Schede `attiva`), §16.4.1 (D-64), §16.4.2 (U20, D-94),
  §4.2.7.1 (D-123, annullo A4-06).
- **A9-10**: tolta la riga *Carica un documento* dalla guida delle Pratiche; §7.3 dice che nell'app si carica
  da *Carica documenti* della barra e si abbina in Documenti; nota in §7.9.
- **A9-11 (§8.1)**: tolte/marcate «non fatte» `ordini-fornitore/*`, `fornitori-lista`, `integra/stato`;
  aggiunte `GET /api/clienti`, `/api/clienti/:id`, `/api/clienti/:id/pratiche`, le 4 rotte
  `/api/clienti/:id/agenzie(/:aid)`, `GET /api/agenti(/:id)`, `POST /api/integra/prova|sincronizza`,
  `GET /api/pratiche/:id/documenti/:did/confronto`; `/clienti/:piva` → `/clienti/:id`.
- **Guida** (`app/frontend/lib/guida.ts`): connessioni solo superutente (D-115), lettura locale spenta (D-125),
  tipo di provvigione fisso (D-121), correzioni del bollettino contestato nel mese dopo (D-119), nota di credito
  sul maturato in un trimestre chiuso (D-150), totali dal server (D-126), tabelle da tastiera (2-07), scarto
  voluto (D-122), fattura multi-ordine (5-01), annullo documento (A4-06). Stesso testo della nota D-150 in
  `prototipo-alternativo/assets/guida.js` (Liquidazioni).
- **Codice**: commenti `D-118 + D-150` in `app/backend/src/motore/motore.ts` e
  `prototipo-alternativo/assets/motore.js`; titolo del caso in `app/backend/test/motore.spec.ts` → `(D-150)`.
  Nessun altro commento `D-127` parlava della nota di credito (quelli dello schermo stretto sono rimasti).

## Prove

| Prova | Esito |
|---|---|
| `python strumenti/genera-pagine-doc.py` | OK (`specifica.html`, `preventivo.html`) |
| `npx tsc --noEmit` in `app/frontend` | 0 errori |
| 6 celle del §19 (script, `|` non preceduti da `\`) | 145 righe, 0 errate |
| `app_guida.py` | **da lanciare a fine onda** (controllo di Claude Code) |

## Da documentare

Cose lasciate aperti o da valutare (i resoconti le citano, ma toccano file di altri o scelte di Ugo):

1. **§15.2.4** (catalogo eventi) cita ancora le rotte vecchie `POST/PUT/DELETE /api/interscambio` e
   `POST/PUT/DELETE /api/ordini-fornitore`: A9-11 riguardava §8.1, quindi non le ho toccate. Da allineare in un
   passaggio successivo se si vuole coerenza totale.
2. **`piano-lavoro-crm.md`**: i resoconti 5-01, 5-04, 6-01 e `finale-correzioni-1` dicono «ore: da approvare
   (allineare con il piano dell'onda)». Non ho toccato il piano (le ore le decide Ugo/Claude Code).
3. **D-116** (onda 3, pacchetto 3-08) e **D-130** (onda 5, pacchetto non fatto): **non documentate** perché quei
   pacchetti non sono stati eseguiti (istruzione del pacchetto: «gli altri pacchetti delle onde 3–8 non sono stati
   fatti»).
4. **Aperto (2-06)**: stato «Da configurare» dei servizi spenti (calcolato dal server) e `flex-wrap: nowrap` nella
   testata restano da fare; non sono materia di documentazione.
5. **Aperto (5-05)**: il testo della contestazione in `app/backend/src/bollettino.ts` dice ancora «inviarci il
   bollettino rettificato», incoerente con D-119; non l'ho cambiato (codice fuori dagli ammessi), da valutare.
