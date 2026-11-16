# Giro completo prima della 0.2.7: KO e blocchi (15/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità: **P1** (blocca il commit della 0.2.7).

Regole comuni: `regole-onda-parallela.md`. **Niente `cd`, niente `/tmp`, niente `&`, non leggere `.env`.** Mai `decobrands_db`, 8001/8002, Integra. Niente commit.

## Contesto
Nell'albero (non committato) c'è tutto il lavoro del 15/11: pallini-link, codice-cliente-non-trovato, provvigione-non-somma (D-166: **le percentuali non si sommano**: il fornitore paga solo `pct_agente`, il subagente prende `pct_subagente` da quella; numeri del seed e dei bollettini cambiati), percentuali-riprogetto, link-diretti, numero-ordine-fornitore, azioni-riga (icone in slot fissi), affiancati-righe (Copiabile), conferma-con-spunta (`ConfermaGrave`: le prove devono spuntare la casella), proposta-pr102848, somiglianza-pr102813, conferme-multiple, riconosciuto-coerente, confronto-righe, comandi-servizio, conferma-abbina (ogni «Abbina» chiede conferma). Leggi i loro resoconti in `strumenti/opencode/resoconto-*.md` prima di decidere.

## Esito del giro (database nuovo, ordine alfabetico; `giro.sh` avvia il backend con TENTATIVI=1000)
**Bloccate (exit=1, nessun controllo contato):** `app_caricamento`, `app_clienti`, `app_documenti`, `app_f7_collaudo`, `app_f7_ritocchi`, `app_flusso`, `app_fornitori`, `app_guscio`, `app_soggetti`.
**KO:**
- `app_analisi`: «i 4 numeri del periodo di 12 mesi»
- `app_componenti`: «memoria: la scheda aperta si ritrova» (+ exit=1)
- `app_impostazioni`: «sei sezioni nell'elenco»
- `app_liquidazioni`: «conferma con importo e numero di subagenti»
- `app_pratiche`: «filtro Gries: 55 pratiche, numeri dei segmenti aggiornati»
- `app_subagenti`: «nuovo: l'agente è già proposto»
Uscite in `strumenti/collaudo/e2e/uscita/e2e/<prova>.txt` (traccia dell'errore in fondo), log del backend in `uscita/backend-<prova>.log`.

Per ognuno decidi **(a) errore dell'app** (correggi l'app), **(b) prova superata** da un cambiamento voluto (aggiorna la prova: numeri del D-166, conferme con casella, icone con `aria-label` al posto dei pulsanti con testo, nuovi campi/colonne, link), **(c) dati di prova** fra una prova e l'altra (rendi la prova indipendente). Nel dubbio fra (a) e (b) leggi spec §19 e i resoconti. Non aggiornare una prova per far passare un errore vero.

## Come lanciare
```bash
bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e
bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_clienti app_documenti   # poche prove per volta
```
Timeout fino a 10 minuti per comando, in primo piano. Dopo una modifica all'app rilancia `prepara.sh`. Per un problema che dipende dall'ordine, lancia insieme la prova che crea i dati e quella che li usa, in ordine alfabetico. Ogni prova corretta: **due giri** a 0 KO.

## File ammessi
`app/backend/src/**`, `app/frontend/**`, `app/backend/test/**` (solo per allineare), `strumenti/prove/app_*.py`, `strumenti/prove/utenti_prova.js`, `strumenti/collaudo/e2e/*` (non `uscita/`), il resoconto `strumenti/opencode/resoconto-giro-0-2-7.md` (per ogni KO: causa a/b/c, modifica, perché). Vietati: schema, migrazioni, seed, spec, piano.

## Fine
- `npx tsc --noEmit` backend e frontend; jest delle suite toccate, una per volta.
- Le prove sopra a 0 KO, ognuna due volte (il giro completo lo rilancia Claude Code).
- Carica davvero `playwright-best-practices`, `ponytail-review`, `caveman`; `owasp-security` se tocchi codice sensibile.
