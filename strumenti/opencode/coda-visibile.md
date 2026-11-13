# Coda dei documenti visibile e lettura non configurata dichiarata (13/11/2026)

**Esecutore: DeepSeek V4 pro** · segnalazione di Ugo durante il giro con i documenti veri. Regole comuni: `strumenti/opencode/regole-onda-parallela.md` (**niente `cd` fuori dal progetto, niente `/tmp`, niente `&`, non leggere la copia del frontend fuori dal progetto**; mai `decobrands_db`, mai le porte 8001/8002: ci sta lavorando Ugo). Scrivi subito `strumenti/opencode/resoconto-coda-visibile.md`. Massimo 1 ora e mezza.

## Cosa ha visto Ugo
- Carica un PDF in *Documenti*: **Oggi** lo conta come «da fare», ma nella lista di *Documenti* non lo vede. È fuorviante.
- Il documento resta `in_coda` per sempre: nelle Impostazioni il **connettore di lettura non è scelto** e `leggiDallaCoda` (`app/backend/src/lettura.ts:131`) esce in silenzio (`config.connettore !== 'llamacloud_eu'`).

## Da fare
1. **I documenti in coda si vedono subito nella lista di Documenti** (`app/frontend/app/(app)/documenti/VistaDocumenti.tsx`, `app/backend/src/documenti.ts` elenco con `STATI_ELENCO`): una riga per file con lo stato «In coda» (o «In lettura») e l'ora di arrivo, nello stesso elenco dei «da controllare» (in cima, o con un segmento «In coda» se l'elenco ha i segmenti: scegli la via più corta coerente con §7.9 della spec). Oggi e Documenti devono contare le stesse cose.
2. **Si può togliere dalla coda prima della lettura**: per un documento `in_coda` un'azione «Togli dalla coda» che usa lo **scarto già esistente** (`documenti.ts` ~riga 896: lo scarto è già permesso da `in_coda`), con motivo predefinito «tolto dalla coda prima della lettura» e conferma. Niente rotta nuova se basta quella esistente. Permesso `provvigioni.modifica` come lo scarto.
3. **Lettura non configurata detta chiaramente**: se il connettore non è scelto o non è utilizzabile:
   - in *Documenti* e in *Oggi* un avviso fisso (non a scomparsa): «La lettura dei documenti non è configurata: i file restano in coda. Impostala in Impostazioni → Lettura (superutente)», con il link;
   - in *Stato del sistema* il servizio di lettura deve risultare «Non configurata» (controlla che già lo faccia; se no correggilo);
   - il dato viene dal **server** (V12): un campo nella risposta dell'elenco Documenti / di Oggi, non una deduzione del browser.
4. **Ritmo**: il lettore prende **un documento ogni 15 s** (`OGNI_MS`). Nel sottotitolo o nella nota della coda: «Si legge un documento ogni 15 secondi».

## Prove
- jest: suite dell'elenco documenti e di Oggi (`test/documenti.spec.ts`, `test/oggi.spec.ts`, `test/lettura.spec.ts`), una per volta, su `decobrands_test_coda` (creato e cancellato da te).
- `npx tsc --noEmit` backend e frontend.
- Prove nel browser: aggiorna `strumenti/prove/app_documenti.py` (riga in coda visibile, «Togli dalla coda», avviso di lettura non configurata) e lanciala con `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e` e `bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_documenti app_oggi`, due volte, 0 KO.

## File ammessi
`app/backend/src/documenti.ts`, `app/backend/src/oggi.ts`, `app/backend/src/lettura.ts`, `app/backend/src/sistema.ts` (solo se serve), `app/backend/test/**`, `app/frontend/app/(app)/documenti/**`, `app/frontend/app/(app)/oggi/**`, `app/frontend/lib/guida.ts` (una frase in Documenti, «da sapere»), `strumenti/prove/app_documenti.py`, `strumenti/prove/app_oggi.py`, il resoconto. Nel resoconto «Da documentare» (spec §7.1, §7.9, §6.5). Carica davvero `ponytail-review`, `playwright-best-practices`, `caveman`.
