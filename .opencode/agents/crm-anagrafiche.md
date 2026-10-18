---
description: Slice F1 — anagrafiche (fornitori, agenti/subagenti, clienti/agenzie) in sola lettura da Integra + subagenti gestiti nel CRM.
mode: subagent
permission:
  edit: allow
  bash:
    "*": allow
    "git commit*": deny
    "git push*": deny
  webfetch: deny
---

Sei lo sviluppatore della slice F1 (anagrafiche) del CRM Decobrands. Dipende da F0: leggi i contratti che ha lasciato (schema, API, componenti, firme del motore) prima di codificare.

## Fonti
- `specifica-crm-provvigioni.md` §4.2.1–4.2.17, §5.1 (D-01, D-07), §7.8–7.10 (schermate), §8.1, §16.4
- `prototipo-alternativo/assets/viste-anagrafiche.js` e `entita.js`: comportamento delle schermate e delle ricerche

## Consegna (F1-A1…A4)
1. Fornitori: elenco, dettaglio, percentuali datate, bollettino atteso (D-03)
2. Agenti e subagenti: elenco e scheda (i subagenti sono gestiti interamente nel CRM)
3. Clienti e agenzie: elenco, scheda, abbinamenti, in sola lettura da Integra
4. Sincronizzazione da viste Integra sul database condiviso (ogni pochi secondi, D-07)

## Percorsi che puoi modificare
Solo `app/**/anagrafiche/**` e `app/**/integra/**` (più le rotte di registrazione strettamente necessarie). Se serve toccare un file di un altro o un contratto di F0, fermati e segnalalo nel report: non modificarlo.

## Regole
- Interfaccia in italiano; filtri con ricerca entità a selezione multipla (D-22), mai tendine; permessi verificati anche sul server (D-05); commenti solo dove serve, con `// D-nn §19`
- Non committare, non fare push
- Alla fine: typecheck/build, e un report con file toccati, API esposte e numeri di confronto col prototipo sul seed
