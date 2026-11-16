# «Articolo X assente fra le righe della pratica proposta» su tutte le righe (15/11/2026)

**Esecutore: DeepSeek V4 pro** · Gravità: **P1**. Diagnosi su dati veri + correzione. Prima leggi i resoconti di `conferme-multiple` e `riconosciuto-coerente` (stessi file).

Regole comuni: `regole-onda-parallela.md`. **Niente `cd`, niente `/tmp`, niente `&`, non leggere `.env`.** Su `decobrands_db` solo letture; prove su `decobrands_test_righe` (crealo, migrazioni, poi cancellalo). Mai 8001/8002, Integra. Niente commit.

## Caso (Ugo)
Proforma **PR102813** (49 righe) proposta sulla pratica **OF/2026/001**, nata dall'ordine **AU276839** (51 righe lette, documento `Auftrag_AU276839.pdf`). In *Correggi i dati letti* compaiono **49 punti da controllare**, uno per riga: «Articolo 20656 assente fra le righe della pratica proposta», «Articolo 20275 assente…» ecc. Ma **20275 è la riga 1 dell'ordine** (Art.Nr 20275, Tablett «Sophia»): il confronto per riga fallisce su tutto. Anche la scheda della proposta diceva «0 articoli su 49 in comune». Inoltre nell'elenco il documento è «Affidabile» ma il pulsante «Correggi i dati letti» ha 49 punti: Ugo non capisce cosa si aspetta il CRM.

## Da fare
1. **Diagnosi** (sola lettura su `decobrands_db`): le righe salvate della pratica OF/2026/001 (`ordini_fornitore_righe` o dove stanno: articolo/codice, descrizione) e quelle lette di AU276839 e PR102813 (`documenti_campi` / righe lette); confronta i codici come fa il server (`perCodice`/`chiaveRiga` del motore, `confrontoDocumenti`, il controllo in `proposta.ts`). Cause possibili: le righe della pratica non sono state create all'apertura dalla proforma/ordine (vuote), codici salvati diversi (spazi, zeri, EAN al posto del codice, campo sbagliato), la chiave di confronto diversa fra pratica e documento, il controllo che guarda una pratica diversa. Scrivi nel resoconto la causa con le righe di codice.
2. **Correggi la causa**. Dopo la correzione PR102813 deve avere solo le righe davvero assenti dall'ordine (se ci sono) e PR102848 il suo 75584 se davvero non c'è (verificalo sul PDF dell'ordine: le righe lette di AU276839).
3. **Gravità e testo dei punti** (Ugo non capisce cosa si aspetta): l'articolo assente è un **avviso** (non grave) e il testo spiega il perché, es. «L'articolo 20656 non c'è nell'ordine AU276839: controlla se è un'aggiunta del fornitore»; quando gli articoli assenti sono **molti** (es. più della metà delle righe) un solo punto riassuntivo «Nessuna riga in comune con l'ordine: forse la pratica non è quella giusta» invece di 49 punti uguali.
4. **«Affidabile» e i punti**: nell'elenco il livello «Affidabile» riguarda la **lettura**, i punti riguardano l'**abbinamento**. Rendilo chiaro: nell'elenco accanto al livello di lettura un segno separato per i punti dell'abbinamento (es. «3 avvisi»), e nel riepilogo di *Correggi* due gruppi: «Lettura» e «Confronto con la pratica».

## File ammessi
`app/backend/src/proposta.ts`, `app/backend/src/documenti.ts`, `app/backend/src/pratiche.ts`, `app/backend/src/motore/**` (solo `perCodice`/`chiaveRiga` se sono loro la causa: scrivilo), `app/backend/test/**`, `app/frontend/app/(app)/documenti/**`, `app/frontend/lib/guida.ts`, `strumenti/prove/app_documenti.py`, script di sola lettura in `strumenti/collaudo/e2e/uscita/`, il resoconto `strumenti/opencode/resoconto-confronto-righe.md`. Vietati: schema, migrazioni, spec, piano.

## Fine
- `npx tsc --noEmit` backend e frontend; jest delle suite toccate, una per volta (prova con codici uguali → nessun punto; codici con spazi/zeri → uguali; molte assenti → un punto riassuntivo).
- Diagnosi rifatta su `decobrands_db`: numero di punti per PR102813 e PR102848 dopo la correzione.
- `bash strumenti/collaudo/e2e/prepara.sh decobrands_test_e2e` e `bash strumenti/collaudo/e2e/giro.sh decobrands_test_e2e app_documenti app_pratica` (timeout 10 min), 0 KO.
- Skill: `owasp-security`, `ponytail-review`, `caveman`.
