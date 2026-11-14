# Correzione delle percentuali: aggiungere o togliere scaglioni (14/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità: **P1** (Ugo è fermo: ARTE ha una versione dal 17/02/2026 con il solo scaglione «sconto 10 %», l'agenzia ha sconto 0 % e non riesce ad aggiungerlo). Percentuali delle provvigioni: lavoro sensibile.

Prima leggi `scaglione-nel-flusso.md`, `resoconto-scaglione-nel-flusso.md` e `resoconto-scaglione-nel-flusso-correzioni-1.md` (modifiche non committate negli stessi file). Regole: `regole-onda-parallela.md`; **niente `cd`, `/tmp`, `&`, `.env`**; prove solo su `decobrands_test_correggi_perc` (crealo, migrazioni, poi cancellalo); mai `decobrands_db`, 8001/8002, Integra. Niente commit.

## Problemi (Ugo)
1. **«Correggi»** (Fornitori → percentuali → Correggi, e la stessa finestra `FormPercentuali`) permette di cambiare solo le percentuali degli scaglioni esistenti: **non si può aggiungere uno scaglione** (es. «sconto 0 %») né toglierne uno. «Nuove percentuali» ha «Aggiungi uno sconto %», la correzione no.
2. Da *Apri la pratica* «Configura le percentuali» con «Valide dal» uguale alla data di una versione già esistente dà l'errore «Ci sono già percentuali dal 2026-02-17: usa la correzione»: la finestra deve accorgersene e passare da sola alla **correzione di quella versione** (stessi campi, titolo «Correggi le percentuali…»), invece di mandare l'utente in Fornitori.

## Cosa fare
- Leggi le regole della correzione nella spec (§5 percentuali datate, D-87, D-113 e le decisioni sulla correzione delle versioni: cerca «correzione» nel §19) e nel server (`app/backend/src/fornitori.ts` o il file delle rotte `fornitori/:id/percentuali`, e il motore se legge gli scaglioni).
- **Correzione con scaglioni aggiunti/tolti**: la rotta di correzione accetta l'elenco completo degli scaglioni della versione (aggiunti, cambiati, tolti), con gli stessi controlli di oggi (percentuali valide, sconti diversi, nessuna chiusura dopo la data: bollettino verificato/contestato o trimestre liquidato → rifiuto come oggi). Togliere uno scaglione usato da un'eccezione personale o da documenti già in un periodo chiuso → rifiuto con messaggio chiaro. Una transazione, registro con prima/dopo (V12, V13).
- **Frontend**: nella correzione le righe hanno lo sconto **modificabile solo per le righe nuove**, «Aggiungi uno sconto %» come in «Nuove percentuali», e una ✕ per togliere una riga (non l'ultima). Il comportamento nelle pagine resta uguale per il resto.
- **Apri la pratica**: se esiste già una versione con la data scelta (lo sai dai dati della finestra o dalla risposta 409 del server), la finestra mostra la correzione di quella versione con lo scaglione dello sconto dell'agenzia già aggiunto come riga nuova da compilare.

## File ammessi
il file delle rotte delle percentuali in `app/backend/src/` (scrivi quale), il suo spec in `app/backend/test/`, `app/frontend/componenti/FormPercentuali.tsx`, `app/frontend/app/(app)/fornitori/**`, `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx`, `app/frontend/lib/guida.ts`, `strumenti/prove/app_fornitori.py`, `strumenti/prove/app_documenti.py`, il resoconto. Vietati: schema, migrazioni, seed, motore (se il motore va toccato fermati e scrivilo), spec, piano.

## Fine
- `npx tsc --noEmit` backend e frontend; jest della suite delle percentuali su `decobrands_test_correggi_perc`: aggiunta di uno scaglione in correzione, tolta, rifiuto dopo una chiusura, rifiuto se toglie uno scaglione usato.
- `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e` e `bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_fornitori app_documenti` (timeout 10 min), 0 KO, due giri; controlli nuovi: correzione con riga aggiunta salvata; da *Apri la pratica* con data esistente si apre la correzione. Limite di 10 accessi per utente (D-41).
- Skill da caricare davvero: `owasp-security`, `ponytail-review`, `caveman`.
- Resoconto `strumenti/opencode/resoconto-correggi-percentuali-scaglioni.md` con «Da documentare» (§5, §7 Fornitori, §19 D-163).
