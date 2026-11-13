# Aggiornare il preventivo al 13/11/2026

**Esecutore: DeepSeek Flash** · richiesta di Ugo. Regole comuni: `strumenti/opencode/regole-onda-parallela.md` (**niente `cd` fuori dal progetto, niente `/tmp`, niente `&`**). Resoconto breve in `strumenti/opencode/resoconto-aggiorna-preventivo.md`. Carica davvero `caveman`.

## Fonti (leggile, non inventare)
- `preventivo-crm-provvigioni.md` (da aggiornare), `piano-lavoro-crm.md` (versione 2.2: le attività **da approvare**, con le ore), `specifica-crm-provvigioni.md` §19 (decisioni), `app/NOTA-RILASCIO.md` (versione 0.2.0), `strumenti/collaudo/piano-correzioni.md` (onde fatte e da fare).

## Da fare
1. **Testata**: data «aggiornato il 13/11/2026» con una riga di riassunto (versione 0.2.0 consegnata per i documenti veri; collaudo onde 0, 0 bis, 1, 2 e pacchetti scelti).
2. **§5 Variazioni**:
   - V10 (accesso con link senza password, Microsoft 365, D-30) è **superata da D-39** (nome utente o email e password, come la Gestione Ordini): segnalala come sostituita, senza cambiarne le ore se il piano non le cambia (controlla nel piano F0-A3).
   - Aggiungi come variazioni nuove le attività del piano **da approvare** che nel preventivo mancano: F7-A0 (3 h), F7-A3 (4 h), F7-A5 (10 h), F7-A6 (4 h), F7-A7 (12 h, righe dei bollettini dal PDF: **non ancora fatta**, scrivilo). Stessa tariffa delle altre variazioni (€ 55/h, verifica nel §2) e stesso formato di riga (attività del piano, perché con la decisione D-nn, ore, importo).
   - **Collaudo delle onde 0, 0 bis e 2 e dei pacchetti 3-01, 3-07, 3-09, 5-01, 5-04, 5-05, 6-01**: se il piano non ha ancora un'attività con le ore, **non inventarle**: aggiungi una riga «Collaudo onde 0–2 e correzioni per i documenti veri (13/11/2026) — ore da definire (Ugo)» con importo «—», fuori dai totali, e scrivilo nel resoconto.
   - Ricalcola il **Totale variazioni** e il margine del 25 %.
3. **§6 Riepilogo economico**: ricalcola i totali con le variazioni nuove. Controlla le somme due volte (scrivi i conti nel resoconto).
4. **§1 / §7 Note**: correggi solo le frasi diventate false per decisioni del §19 (es. PostgreSQL condiviso con la Gestione Ordini → database proprio `decobrands_db`, D-29; accesso Microsoft 365 → D-39), citando la decisione. Niente altro.
5. `python3 strumenti/genera-pagine-doc.py` (rigenera `prototipo-crm/preventivo.html`).

## File ammessi
`preventivo-crm-provvigioni.md`, `prototipo-crm/preventivo.html` (solo rigenerato), il resoconto.
