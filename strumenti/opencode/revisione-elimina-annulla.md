# Pacchetto `revisione-elimina-annulla` (sola lettura)

Revisione completa del lavoro del pacchetto `pratica-elimina-annulla` (D-206 elimina, D-207 annulla). Leggi il prompt
`strumenti/opencode/pratica-elimina-annulla.md` e il resoconto. Concentrati su: `DELETE /pratiche/:id`,
`POST /pratiche/:id/annulla`, `POST /pratiche/:id/ripristina`, il permesso `provvigioni.elimina`, lo stato «annullata»
nel motore/stati, l'esclusione da Oggi, liquidazioni, Analisi, bollettini, coda, e la migrazione
`20261117140000_pratica_annulla`. (In parallelo un altro pacchetto lavora sui documenti sostituiti: ignora quei cambi.)

Carica **davvero** con lo strumento `skill`: `owasp-security`, `postgresql-code-review`, `ponytail-review`, `caveman`. Controlla:
1. **Elimina**: davvero impossibile su pratica contabilizzata (tutti i casi: congelato, bollettino verificato/contestato,
   riga di bollettino abbinata, liquidazione chiusa, nota di credito collegata a una fattura di un'altra pratica?); tutto
   in una transazione con `FOR UPDATE`; nessun residuo orfano (righe, correzioni, attese, anomalie, sconti, campi letti);
   PDF negli scartati con lo stesso percorso dello «Scarta»; fotografia nel registro completa; permesso solo
   amministratore e controllato sul server; nessun IDOR.
2. **Annulla/Ripristina**: congelati e contabilizzati mai toccati; provvigione prevista 0 solo sugli aperti; ripristino
   che riporta esattamente com'era; esclusioni coerenti in tutti i punti (grep su dove si leggono stato e attese);
   anomalie su bollettino e coda; motivo obbligatorio sul server.
3. **Migrazione**: additiva, FK `annullata_da` corretta.
4. **Complessità**: logica duplicata, controlli sparsi.

**Non modificare nessun file** tranne il resoconto. Niente jest su `decobrands_db`, niente script fuori da jest, niente
`cd`, `/tmp`, `&`, `.env`, porte, commit. Resoconto `strumenti/opencode/resoconto-revisione-elimina-annulla.md`: rilievi per
gravità con file:riga, scenario, correzione, prova; «da correggere prima del rilascio» vs «miglioria». Riepilogo in 8 righe.
