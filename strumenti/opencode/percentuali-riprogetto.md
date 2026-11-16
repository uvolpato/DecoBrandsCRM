# Percentuali del fornitore: riprogettare la finestra (15/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità: P1 (Ugo la usa nel giro; percentuali = soldi). Parte dopo `provvigione-non-somma` (D-166: «Provvigione dal fornitore %», «di cui al subagente %», `pct_subagente ≤ pct_agente`): leggi il suo resoconto e `resoconto-correggi-percentuali-scaglioni.md`.

Regole comuni: `regole-onda-parallela.md`. **Niente `cd`, niente `/tmp`, niente `&`, non leggere `.env`.** Prove solo su `decobrands_test_perc2` (crealo, migrazioni, poi cancellalo). Mai `decobrands_db`, 8001/8002, Integra. Niente commit.

## Problema (Ugo, schermata della finestra «Correggi le percentuali di ARTE…»)
La finestra unica con tutti gli scaglioni in griglia (Sconto · Provvigione dal fornitore % · di cui al subagente %) è troppo larga: compare una **barra di scorrimento orizzontale** brutta e i campi escono a destra; la riga «Aggiungi uno sconto %» ha colonne diverse dalle altre.

## Come la vuole Ugo
- Nella pagina Fornitori, sezione percentuali, la **tabella degli scaglioni** di ogni versione (già c'è) ha **due icone per riga**: **Modifica** (matita) ed **Elimina** (cestino), con `aria-label`/`title` («Modifica lo scaglione da 0 %», «Elimina lo scaglione da 0 %»), e un pulsante **«Aggiungi scaglione»**.
- **Una sola finestra piccola** per inserire e modificare uno scaglione: campi *Valide dal* (data con selettore, gg/mm/aaaa), *Sconto da %*, *Provvigione dal fornitore %*, *di cui al subagente %* (+ margine calcolato mostrato in sola lettura, solo anteprima). In modifica parte compilata; titolo «Nuovo scaglione di …» / «Modifica lo scaglione di …». Niente scorrimento orizzontale a 1440 e a 768 px.
- **Al salvataggio il server controlla** (V12, V13, una transazione, registro prima/dopo):
  - niente **sovrapposizioni**: nella stessa versione (stessa *Valide dal*) uno sconto compare una volta sola; se la *Valide dal* indicata non esiste ancora, nasce una versione nuova che copia gli scaglioni in vigore a quella data e applica la modifica (come fa oggi «Nuove percentuali»: verifica nel server e mantieni la stessa regola);
  - `pct_subagente ≤ pct_agente` (D-166), percentuali 0–100;
  - nessuna chiusura dopo la data (bollettino verificato/contestato o trimestre liquidato): rifiuto come oggi;
  - eliminare uno scaglione usato da un'eccezione personale o da documenti in un periodo chiuso → rifiuto con messaggio chiaro; l'ultimo scaglione di una versione non si elimina (si elimina la versione, se oggi è possibile).
  Messaggi del server con le date in formato gg/mm/aaaa.
- Usa le rotte che già ci sono (`fornitori/:id/percentuali`, POST e PUT della versione, `app/backend/src/fornitori.ts`): se per un solo scaglione basta ricomporre l'elenco della versione nel frontend e mandare il PUT, fallo così (niente rotte nuove); se serve una rotta per scaglione, scrivi perché nel resoconto.
- *Apri la pratica* → «Configura le percentuali» (`VistaDocumento.tsx`, pacchetti `scaglione-nel-flusso` e `correggi-percentuali-scaglioni`): apre la stessa finestra piccola in inserimento con *Valide dal* = data dell'ordine e *Sconto da* = sconto dell'agenzia, fornitore fisso.
- Il componente resta `app/frontend/componenti/FormPercentuali.tsx` (riscritto), usato da Fornitori e da *Apri la pratica*.

## File ammessi
`app/frontend/componenti/FormPercentuali.tsx`, `app/frontend/app/(app)/fornitori/**`, `app/frontend/app/(app)/documenti/[id]/VistaDocumento.tsx` (solo la chiamata alla finestra), il foglio di stile dell'app (classi nuove controllate con grep), `app/frontend/lib/guida.ts`, `app/backend/src/fornitori.ts` (solo controlli e messaggi), `app/backend/test/percentuali.spec.ts`, `strumenti/prove/app_fornitori.py`, `strumenti/prove/app_documenti.py`, il resoconto. Vietati: schema, migrazioni, motore, spec, piano.

## Fine
- `npx tsc --noEmit` backend e frontend; jest `percentuali.spec.ts` su `decobrands_test_perc2`: inserimento, modifica, sconto doppio rifiutato, versione nuova da data nuova, `pct_subagente > pct_agente` rifiutato, eliminazione rifiutata se usata.
- `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e` e `bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_fornitori app_documenti` (timeout 10 min), 0 KO; controlli: icone per riga, finestra senza scorrimento orizzontale (`scrollWidth <= clientWidth`) a 1440 e 768, sconto doppio → messaggio. Schermate in `strumenti/collaudo/e2e/uscita/percentuali-1440.png` e `-768.png`, guardale.
- Skill da caricare davvero: `owasp-security`, `ponytail-review`, `ui-ux-pro-max`, `caveman`.
- Resoconto `strumenti/opencode/resoconto-percentuali-riprogetto.md` con «Da documentare» (§5.11, §7 Fornitori, §19 D-168).
