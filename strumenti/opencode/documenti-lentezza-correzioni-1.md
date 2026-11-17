# Pacchetto `documenti-lentezza-correzioni-1`

Leggi `strumenti/opencode/resoconto-documenti-lentezza.md`. Causa trovata: **il ponte di Integra** chiamato in modo
sincrono da `esitiImportazione` (elenco) e `contestoDocumento` (dettaglio); ogni `cerca` aspetta fino a 3 s. In questo
ambiente Integra spesso **non è raggiungibile** (VPN / pg_hba), quindi ogni apertura paga il tempo massimo. La correzione
fatta (tempo automatico 500 ms) è un cerotto: con il ponte giù la pagina paga ancora 0,5 s per chiamata, il pool (2
connessioni) si satura e i candidati spariscono senza dirlo.

## Correzione (alla radice, codice minimo)
1. **Interruttore sul ponte** (in `anagrafica-integra.ts`, un punto solo): se una ricerca sul ponte fallisce o va oltre il
   tempo, per i successivi **60 s** le ricerche **automatiche** non lo chiamano proprio (rispondono subito «ponte non
   disponibile»); la ricerca **su richiesta** (`/api/integra/cerca`, `importa`) prova sempre (e se riesce richiude
   l'interruttore). Variabile in memoria, niente cache dei dati, niente tabelle. Commento `// ponytail:` con il limite (un
   solo processo).
2. **Non nascondere**: quando il ponte non è stato interrogato o non ha risposto, l'elenco e il dettaglio lo dicono
   (`integra: 'non_disponibile'` nella risposta) e la pagina mostra una riga tenue «Integra non raggiungibile: i candidati da
   importare non sono aggiornati» invece di «nessun candidato». Usa i componenti che ci sono.
3. Tieni `TEMPO_AUTO_MS = 500` per il primo tentativo.

## Prove
- jest: ponte lento → prima chiamata ~500 ms, le successive entro 60 s **senza** chiamare il ponte (< 300 ms) e con
  `integra: 'non_disponibile'`; dopo 60 s (orologio finto) si riprova; ricerca su richiesta che riesce richiude
  l'interruttore. `documenti-lentezza.spec.ts` sulla copia `decobrands_test_perf`: coda e dettaglio < 1 s anche a raffica.
- suite toccate su `decobrands_test_lentezza` 0 KO; `npx tsc --noEmit` backend e frontend.

## File ammessi
`app/backend/src/anagrafica-integra.ts`, `app/backend/src/documenti.ts`, `app/backend/test/**`,
`app/frontend/app/(app)/documenti/**`, `specifica-crm-provvigioni.md` (una riga §19 col primo numero libero dopo D-202:
tempo breve + interruttore per le ricerche automatiche su Integra, perché; *Perché* in §4.7.1; versione +0.01). Alla fine
cancella `decobrands_test_lentezza` (non `decobrands_test_perf`: la cancella Claude Code).

## Regole
`strumenti/opencode/regole-onda-parallela.md` (niente script fuori da jest che toccano il db) e `CLAUDE.md`. Integra mai
toccata (solo letture dal ponte, D-100). Niente commit, `cd`, `/tmp`, `&`, `.env` letto, porte 8001/8002. Skill:
`performance`, `ponytail-review`, `caveman`. Resoconto: in fondo a `resoconto-documenti-lentezza.md`, «Correzioni 1».
Riepilogo in 8 righe.
