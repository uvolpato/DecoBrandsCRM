# Resoconto — Collaudo onda 5 · Pacchetto 5-05 — Correzioni di un bollettino contestato nel mese dopo

Esecutore: DeepSeek V4 · Data: 13/11/2026 · Gravità: P2 · Rilievi: U6 · Decisione: U6 → D-119

## Rilievo U6 — Correzioni di un bollettino contestato nel bollettino del mese dopo (D-119)

Fatto. Il bollettino contestato non aspetta più un "bollettino rettificato" (impossibile per il
vincolo fornitore × mese, D-56): l'azione dice che le correzioni arrivano nel bollettino del mese
dopo. Il motore riconciliava già una riga con `documento_id` di un documento del mese precedente
(`documentoPerId` non guarda il mese, `motore.ts:233`): serviva solo la prova.

- `app/backend/src/bollettino.ts:56-59` — in `riconciliazione`, testo dell'azione del contestato:
  «Bollettino contestato: le correzioni del fornitore arrivano nel bollettino di <mese dopo>.»
  Calcolo del mese dopo (`meseDopo`) e commento `// D-119 §19`.
- `app/backend/test/bollettino.spec.ts:309-310` — nel caso «contestazione (Ing's agosto)»: asserzione
  che `b.azione.testo` è «… nel bollettino di settembre 2026.»
- `app/backend/test/motore.spec.ts:164-175` — nuovo caso «D-119: riga del mese dopo con
  `documento_id` di un documento del mese prima si riconcilia»: riga del bollettino di luglio
  (M+1) con `documento_id` di F-2026-0858 (giugno, M) → `quadra` con provvigione confrontata, non
  `sconosciuta`.

Il motore non ha richiesto modifiche: la via `documento_id` di `riconcilia` è già indipendente dal
mese del bollettino.

## Prove lanciate

| Prova | Esito |
|---|---|
| `npx jest test/bollettino.spec.ts test/motore.spec.ts test/seed.spec.ts` (db `decobrands_test_5_05`, `TMP` separato) | **54/54 passati, 0 KO** |
| `npx tsc --noEmit` (backend) | **0 errori** |
| Database `decobrands_test_5_05` | creato, migrazioni applicate, cancellato |

Prova nel browser da lanciare a fine onda: `app_bollettino.py` **invariata** (non asserisce il testo
dell'azione del contestato, solo «Bollettino verificato»). Nessun aggiornamento necessario.

## Note

- Il motore faceva già la riconciliazione richiesta (riga del mese M+1 con `documento_id` di un
  documento del mese M): nessun cambiamento a `riconcilia`, solo la prova.
- **Punto aperto (da valutare da Ugo / pacchetto documentazione):** il testo della contestazione in
  `app/backend/src/bollettino.ts:184` dice ancora «Vi chiediamo di inviarci il bollettino
  rettificato.», incoerente con D-119 (le correzioni arrivano nel bollettino del mese dopo). Non
  l'ho cambiato perché la *Correzione puntuale* chiede solo il testo dell'azione e la prova del
  motore.
- `git diff --name-only` mostra anche file di altri pacchetti dell'onda già modificati nella cartella
  di lavoro; le modifiche fatte qui stanno solo in `bollettino.ts`, `bollettino.spec.ts`,
  `motore.spec.ts` più questo resoconto. Nessun commit, nessuna migrazione, niente `schema.prisma`,
  niente Integra, niente `decobrands_db`.

## Da documentare

### Riga §19 (D-119)

- **D-119** · 08/11/2026 · **Le correzioni di un bollettino contestato arrivano nel bollettino del
  mese dopo.** Il bollettino contestato non si riapre e non si sostituisce (D-56, uno per fornitore
  e mese): le correzioni del fornitore sono righe del bollettino del mese successivo riferite ai
  documenti del mese contestato, e si riconciliano contro quei documenti. · Perché: non può
  esistere un secondo bollettino per lo stesso fornitore e mese; dire di aspettare un «bollettino
  rettificato» lasciava il contestato «in attesa» per sempre. · Ugo · §6.2/§7.7;
  `app/backend/src/bollettino.ts`, `app/backend/src/motore/motore.ts`.

### Spec

- **§6.2 / §7.7 (bollettini, azione del contestato)** — *Perché*: le correzioni di un bollettino
  contestato non arrivano come bollettino rettificato (impossibile per il vincolo fornitore × mese,
  D-56) ma come righe del bollettino del mese dopo, riconciliate contro i documenti del mese
  contestato (D-119).

### Guida (`app/frontend/lib/guida.ts`)

Nessun testo nuovo richiesto all'utente: l'azione è calcolata dal server e il frontend la mostra.
Se si vuole una nota (pagina Bollettino), una riga come: «Le correzioni di un bollettino contestato
arrivano nel bollettino del mese dopo.» Va valutata dal pacchetto documentazione.

### Piano (`piano-lavoro-crm.md`) e README

Nessuna attività o ora nuova: correzione di collaudo (U6 → D-119) dentro l'onda 5. README
invariato. Resta aperta la domanda sul testo della contestazione (§6.2, vedi *Note*).
