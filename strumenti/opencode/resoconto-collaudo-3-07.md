# Resoconto — Collaudo onda 3 · Pacchetto 3-07 — Nota di credito sul maturato che segue la sua fattura

Esecutore: DeepSeek V4 · Data: 13/11/2026 · Gravità: P2 · Rilievi: A2-06, A6-13 (prima prova) · Decisione: U5 → D-118

## Rilievo A2-06 — Nota di credito sul maturato che segue la sua fattura (D-118)

Fatto. Sul maturato la nota di credito entra in liquidazione col riconoscimento della **sua fattura**,
non col suo; il motivo «in attesa di incasso» vale solo per le fatture.

- `app/backend/src/motore/motore.ts:362-376` — in `righeLiquidazione`, ramo maturato: per
  `d.tipo === 'nota_credito'` si usa `rif = documentoPerId(S, d.fattura_id)?.doc` (la fattura) come
  riferimento sia per `riconosciutoIn` sia per `righeBollettinoDi`; `attesa_incasso` si assegna solo
  se `d.tipo === 'fattura'`. Commento `// D-118 §19`.
- `prototipo-alternativo/assets/motore.js:459-470` — stesso comportamento sul riferimento
  `d.riferimento` della NC (il numero della fattura), `attesa_incasso` solo per `fattura`.
- `app/backend/test/motore.spec.ts` — nuovo caso «maturato: la nota di credito entra con la sua
  fattura riconosciuta (D-118)»: NC −500 € su F-2026-0858 (riconosciuta in agosto) → entra nel 3°
  trimestre liquidabile con provvigione negativa, non nel 2°. Àncora del 3° trimestre aggiornata:
  la NC del seed NC-2026-005 ora segue F-2026-0815 (liquidata nel 2° trimestre) e non resta più in
  T3: Stefano Bastasin 4 documenti, provvigione 320,13 (prima 5/189,03), in attesa 196,2 invariata.

## Rilievo A6-13 — Prima prova (nota di credito sul maturato)

Coperta dallo stesso nuovo caso sopra. La seconda parte (storno senza `documento_id`) era già
presente nel seed («storno con il solo numero, stesso numero in due anni», riga 318): non toccata.

## Prove lanciate

| Prova | Esito |
|---|---|
| `npx jest test/motore.spec.ts test/liquidazioni.spec.ts test/bollettino.spec.ts test/seed.spec.ts` (db `decobrands_test_3_07`, `TMP` separato) | **76/76 passati, 0 KO** |
| `npx tsc --noEmit` (backend) | **0 errori** |
| Database `decobrands_test_3_07` | creato, migrazioni applicate, **cancellato** |

Prova nel browser da lanciare a fine onda: nessuna nuova. La modifica è una regola del motore
(backend + prototipo); il frontend mostra il motivo che gli manda il server (V12). Nessun file di
prova browser da aggiornare.

## Note

- `git diff --name-only` mostra anche file di altri pacchetti dell'onda già modificati nella cartella
  di lavoro; le modifiche fatte qui stanno solo in `motore.ts`, `motore.js`, `motore.spec.ts` più
  questo resoconto. Nessun commit, nessuna migrazione, niente `schema.prisma`, niente Integra,
  niente `decobrands_db`.

## Da documentare

### Riga §19 (D-118)

- **D-118** · 08/11/2026 · **Sul maturato la nota di credito segue la sua fattura.** Una nota di
  credito di un fornitore sul maturato entra in liquidazione con il riconoscimento della sua fattura
  (`riconosciutoIn` della fattura `fattura_id`); il motivo «in attesa di incasso» vale solo per le
  fatture. · Perché: una NC che il fornitore non elenca (spesso riduce la fattura direttamente)
  restava per sempre non liquidabile col motivo «in attesa di incasso», falso per una NC; il
  subagente non riceveva mai la quota negativa. · Ugo · §5.14; `app/backend/src/motore/motore.ts`,
  `prototipo-alternativo/assets/motore.js`.

### Spec

- **§5.14 (Incassi dei clienti / maturato)** — *Perché*: sul maturato la nota di credito segue la
  fattura a cui si riferisce e si liquida nel trimestre in cui quella fattura viene riconosciuta
  (D-118); «in attesa di incasso» è una condizione solo delle fatture, non delle note di credito.

### Guida (`app/frontend/lib/guida.ts`)

Nessun testo nuovo richiesto all'utente: la regola agisce sui calcoli della liquidazione e il
frontend mostra solo il motivo calcolato dal server. Se si vuole una nota (pagina Liquidazioni),
una riga come: «Sul maturato una nota di credito entra con la fattura a cui si riferisce.» Va
valutata dal pacchetto documentazione.

### Piano (`piano-lavoro-crm.md`) e README

Nessuna attività o ora nuova: correzione di collaudo (A2-06/A6-13, decisione U5 → D-118) dentro
l'onda 3. README invariato.
