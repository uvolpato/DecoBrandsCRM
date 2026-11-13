# Resoconto — Coda dei documenti visibile e lettura non configurata dichiarata (13/11/2026)

**Esecutore: DeepSeek V4 pro.** Segnalazione di Ugo durante il giro con i documenti veri.

## Rilievi (cosa ha visto Ugo)
1. Un PDF caricato in *Documenti* resta `in_coda`: **Oggi** lo conta come «da fare» ma la lista di *Documenti* non lo mostra.
2. Il documento resta `in_coda` per sempre: il connettore di lettura non è scelto e `leggiDallaCoda` (`app/backend/src/lettura.ts:131`) esce in silenzio.

## Cosa ho fatto
1. **Documenti in coda visibili nell'elenco** (`app/backend/src/documenti.ts`, `VistaDocumenti.tsx`): nuovo stato filtro `stato=aperte` (= `in_coda` + `in_lettura` + `da_controllare`) con `in_coda`/`in_lettura` in cima; ogni riga porta ora lo `stato` e la lista mostra «In coda»/«In lettura» (nome del file e ora di arrivo). `conteggi` restano i quattro segmenti; `totale` di `aperte` è la somma dei tre.
2. **«Togli dalla coda» prima della lettura** (`VistaDocumento.tsx`): per un documento `in_coda` un'azione con conferma che usa lo scarto già esistente (`POST /api/documenti/:id/scarta`) con motivo «Tolto dalla coda» e nota «prima della lettura». Aggiunto `Tolto dalla coda` a `MOTIVI_SCARTO`. In `in_coda` non compare più «Scarta il documento».
3. **Lettura non configurata dichiarata** (V12, dal server): nuovo campo `lettura_configurata` nella risposta di `GET /api/documenti` e di `GET /api/oggi` (vero solo con connettore `llamacloud_eu`). Avviso fisso in *Documenti* e in *Oggi* «La lettura dei documenti non è configurata: i file restano in coda. Impostala in Impostazioni → Lettura (superutente)» con il collegamento. In *Stato del sistema* (`sistema.ts`) la lettura risulta «Non configurata» anche quando il connettore non è `llamacloud_eu` (non solo quando manca la chiave); la sonda riporta `configurata: false` per il connettore locale.
4. **Ritmo dichiarato**: nota «Si legge un documento ogni 15 secondi» in Documenti; frase in `guida.ts` (pulsanti e «da sapere»).
5. Prove aggiornate: `app_documenti.py` (avviso, ritmo, riga in coda, «Togli dalla coda») e `app_oggi.py` (avviso in Oggi).

## Prove
- jest su `decobrands_test_coda` (creato e cancellato da me): `documenti.spec.ts` 56/56, `oggi.spec.ts` 10/10, `lettura.spec.ts` 13/13. 0 KO.
- `npx tsc --noEmit`: backend e frontend puliti.
- Browser (Playwright, `prepara.sh`/`giro.sh` su `decobrands_test_e2e`, due volte): `app_documenti.py` 66 OK / 0 KO, `app_oggi.py` 43 OK / 0 KO.
- Nota: non ho potuto ispezionare le schermate a occhio (il modello non legge immagini); i controlli Playwright asseriscono i testi/elementi (avviso, «In coda», «Togli dalla coda», ritmo).

## Da documentare (spec)
- **§7.9**: elenco con i documenti `in_coda`/`in_lettura` in cima con lo stato e l'ora di arrivo; azione «Togli dalla coda» (scarto esistente, motivo «Tolto dalla coda»); avviso fisso di lettura non configurata; ritmo «un documento ogni 15 secondi»; nuovo valore `stato=aperte` del filtro. Aggiornare la frase «I documenti in coda, in lettura o in errore non si elencano a parte: una nota dice quanti sono…» (non più vera).
- **§7.1**: avviso fisso in Oggi; il riquadro/contatore Documenti resta coerente con l'elenco.
- **§6.5 punto 3**: lettura non configurata dichiarata dall'elenco, da Oggi e dallo Stato del sistema.
- **§8.1**: `GET /api/documenti` — `stato` ammette anche `aperte`; risposta con `stato` per documento e `lettura_configurata`; `GET /api/oggi` con `lettura_configurata`; `MOTIVI_SCARTO` con `Tolto dalla coda`.
