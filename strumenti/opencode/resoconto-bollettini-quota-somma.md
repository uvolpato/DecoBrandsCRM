# Resoconto — Quota pagata e più righe per la stessa fattura nel bollettino (pacchetto `bollettini-quota-somma`, 17/11/2026)

## File toccati
- `app/backend/prisma/schema.prisma` + migrazione nuova `20261117090000_quota_pagata` (scritta, **non applicata** a `decobrands_db`).
- `app/backend/src/lettura.ts` (schema `SCHEMA_DOCUMENTO` + `PROMPT_DOCUMENTO`), `proposta.ts` (`RigaLetta`, `componiLetto`), `documenti.ts` (`RIGA_CAMPI`): il lettore estrae e corregge la quota.
- `app/backend/src/motore/dati.ts` (`bollettinoDaDb` porta `quota_pagata`), `motore.ts` (`riconcilia`), `bollettino.ts` (abbinamento, doppioni, decisione di gruppo, chiusura).
- `app/frontend/app/(app)/bollettini/[id]/VistaBollettino.tsx` (gruppo con dettaglio e quota), `app/frontend/lib/guida.ts`.
- `specifica-crm-provvigioni.md` (versione 8.90, §4.2.10, §5.11, §6.2, §19 D-201), `piano-lavoro-crm.md` (F7-A25).
- Prove: `app/backend/test/bollettino-quota.spec.ts` (nuovo), `app/backend/test/bollettino-quota-db.spec.ts` (nuovo), `proposta.spec.ts` (`quota_pagata` nel costruttore `R`), `strumenti/prove/app_bollettino.py` (controllo quota assente).

## Migrazione
`bollettini_righe.quota_pagata DECIMAL(7,4) NULL` + `CHECK (quota_pagata IS NULL OR (quota_pagata >= 0 AND quota_pagata <= 100))`. Additiva: null = 100 % (comportamento di oggi).

## Esempi numerici
- RE194149: atteso = 326,00 × 15 % × 96,43 % = 47,15 = loro → **quadra** (un solo arrotondamento).
- RE193071 (Arte): due righe 247,60@10 % (23,77) + 1.869,70@15 % (269,24), quota 96 → somma 293,01; nostro 2.117,30 × 15 % × 96 % = 304,89 → **gruppo**, differenza −11,88, una sola decisione per il gruppo.
- Riga senza quota: atteso come oggi (provvigione piena). Tolleranza 0,01 € → quadra; 0,02 € → anomalia. Quote diverse (> 0,01 punti) → anomalia «quote diverse», quota del gruppo = media pesata.

## Prove ed esito
- `npx tsc --noEmit`: **0 errori** (backend e frontend).
- `bollettino-quota.spec.ts` (motore puro): **5/5 OK**.
- `bollettino-quota-db.spec.ts` (integrazione: gruppo, decisione di gruppo, doppione fra bollettini): **3/3 OK**.
- Regressione: `bollettino.spec.ts` + `motore.spec.ts` + `raggruppamento-scaglioni.spec.ts` + `riconosciuto-coerente.spec.ts`: **70/70 OK**; `lettore.spec.ts`: **6/6 OK**.
- `python -m py_compile strumenti/prove/app_bollettino.py`: OK (il giro nel browser lo lancia Claude Code).

## Dubbi / cose aperte
- `proposta.spec.ts` e `documenti.spec.ts` **non completati** in questo ambiente (si fermano sulla connessione al ponte Integra, probabilmente preesistente); le modifiche lì sono additive (campo `quota_pagata` in `RigaLetta`/`RIGA_CAMPI`) e coperte da `tsc`.
- Il testo della contestazione su un **gruppo** mostra «voi riconoscete … (0 %)» quando le % delle righe differiscono (`loro.pct` null): cosmesi, da sistemare quando servirà contestare un gruppo (le prove non lo coprono).
- Alla chiusura di un gruppo l'atteso congelato si distribuisce sulle righe in proporzione all'importo riconosciuto (l'ultima assorbe l'arrotondamento): comportamento scelto, non specificato nel pacchetto.

## Da documentare (nota di rilascio 0.2.10)
Il bollettino legge la **quota pagata** (`% bezahlt` di Arte) e la applica al nostro atteso (provvigione del documento × quota, un solo arrotondamento); **più righe dello stesso bollettino per la stessa fattura** si raggruppano con una sola differenza e una sola decisione (tolleranza 0,01 €; anomalia «quote diverse» se le quote divergono). Il doppione resta solo fra bollettini diversi. Nessun cambio alle liquidazioni: il subagente prende la sua quota sul documento, come oggi.
