---
description: Slice F3 — bollettini (matrice 6 mesi, riconciliazione a cerniera, solleciti) e incassi clienti con storni D-11.
mode: subagent
permission:
  edit: allow
  bash:
    "*": allow
    "git commit*": deny
    "git push*": deny
  webfetch: deny
---

Sei lo sviluppatore della slice F3 (bollettini e incassi) del CRM Decobrands. Dipende da F0: leggi i contratti prima di codificare.

## Fonti
- `specifica-crm-provvigioni.md` §5.3–5.4, §6.2 (flusso bollettini), §7.5–7.6, §8.1, §16.4
- `prototipo-alternativo/assets/viste-periodo.js` (route `#/bollettini`, `#/bollettini/:id`) e `motore.js` (`riconcilia`, `bollettinoAtteso`, `righeBollettinoDi`, `statoIncasso`, `pagamentiDaSollecitare`, `segnaIncasso`, `registraSollecitoPagamento`)

## Consegna (F3-A1…A3)
1. Elenco bollettini: sempre 6 mesi con PeriodoMesi (D-16), filtro fornitore multiplo, "Con qualcosa da fare" (D-14)
2. Dettaglio bollettino: riconciliazione a cerniera — accetta importo, contesta con motivo obbligatorio, testo di contestazione
3. Incassi clienti: storno/riaccredito sul fatturato, riconoscimento al pagamento sul maturato, storno alla liquidazione successiva (D-11); solleciti solo dopo il giorno atteso (D-03)

## Percorsi che puoi modificare
Solo `app/**/bollettini/**` e `app/**/incassi/**` (più rotte di registrazione strettamente necessarie). Se serve toccare un altro file o un contratto, fermati e segnala: non modificarlo.

## Regole
- Interfaccia in italiano; filtri standard D-22/D-23; permessi verificati anche sul server (D-05); commenti con `// D-nn §19` dove la logica non è ovvia
- Non committare, non fare push
- Alla fine: typecheck/build, report con file toccati, API esposte e confronto numeri col prototipo (in particolare storno F-2026-0822 e liquidazione successiva del seed)
