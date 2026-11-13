# Finestra di ricerca di fornitore e cliente: anche le viste di Integra (13/11/2026)

**Esecutore: DeepSeek V4 pro** · segnalazione di Ugo (completa D-152). Regole comuni: `strumenti/opencode/regole-onda-parallela.md` (**niente `cd` fuori dal progetto, niente `/tmp`, niente `&`, non leggere la copia del frontend fuori dal progetto, mai `.env`**; mai `decobrands_db`, mai le porte 8001/8002, **Integra mai**: nelle prove il ponte finto). **Non lanciare le prove nel browser**: solo `py_compile`. Scrivi subito `strumenti/opencode/resoconto-ricerca-con-integra.md`. Massimo 1 ora e mezza.

## Problema
In *Apri la pratica* (e ovunque si scelgono fornitore o cliente con `CampoRicerca`/`RicercaEntita`, `app/frontend/componenti/CampoRicerca.tsx`, entità in `app/frontend/lib/entita.ts`) la ricerca guarda **solo l'anagrafica del CRM**. Con l'anagrafica vuota la finestra è vuota, anche se il soggetto c'è nelle viste di Integra. Esistono già `GET /api/integra/cerca?tipo=&q=` e `POST /api/integra/importa` (`app/backend/src/anagrafica-integra.ts:311,326`) e il componente `app/frontend/componenti/CercaInIntegra.tsx` (permesso `dati.importa`).

## Correzione (D-152, Ugo 13/11/2026: «la ricerca deve guardare anche Integra»)
- Per le entità **fornitore** e **cliente** (non le altre), la finestra `RicercaEntita` e il menu del campo mostrano, **sotto** i risultati del CRM, i risultati di Integra per il testo scritto (nome o P.IVA, massimo 10, solo se il testo ha almeno 2–3 caratteri, con attesa breve fra un tasto e l'altro), con l'etichetta «Integra». Le righe di Integra già importate nel CRM non si ripetono (il server lo sa: `codici_esterni`).
- Scegliendo una riga di Integra: **si importa e si sceglie** in un passo (riusa `POST /api/integra/importa`, poi la riga importata diventa la scelta). Senza `dati.importa` la riga si vede ma non si sceglie (nota «serve il permesso di importare»).
- Se Integra non risponde: nota «Integra non raggiungibile», restano i risultati del CRM, niente errore che blocca.
- Riusa `CercaInIntegra`/le sue funzioni se si può; un parametro dell'entità (es. `integra: 'fornitore' | 'cliente'` in `entita.ts`) accende la parte Integra solo dove serve. Aggiorna il catalogo dei componenti se cambia `CampoRicerca`.
- V12: niente calcoli nel browser; la ricerca la fa il server.

## Prove
- jest: se tocchi il backend (es. per escludere i già importati), `test/anagrafica-integra.spec.ts` o la suite che c'è, una per volta, su `decobrands_test_ricint` (creato e cancellato da te).
- `npx tsc --noEmit` backend e frontend.
- `strumenti/prove/app_documenti.py` o `app_pratica.py`: un controllo (riga «Integra» nella finestra di ricerca del fornitore) con il ponte finto; solo `py_compile`.

## File ammessi
`app/frontend/componenti/CampoRicerca.tsx`, `app/frontend/componenti/CercaInIntegra.tsx`, `app/frontend/lib/entita.ts`, `app/frontend/app/(app)/componenti/**` (catalogo), `app/backend/src/anagrafica-integra.ts`, `app/backend/test/**`, `strumenti/prove/app_documenti.py`, `strumenti/prove/app_pratica.py`, il resoconto. Nel resoconto «Da documentare»: spec §16.4.1 (CampoRicerca con Integra), §7.9, guida. Carica davvero `owasp-security`, `ponytail-review`, `caveman`.
