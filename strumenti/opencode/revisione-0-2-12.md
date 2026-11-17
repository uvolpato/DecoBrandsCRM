# Pacchetto `revisione-0-2-12` (sola lettura)

Revisione completa delle modifiche non committate (`git diff` + file nuovi) del pacchetto `agenzia-senza-subagente`
(D-205): agenzia (`interscambio`) con `subagente_id` NULL, provvigione tutta a Decobrands. Leggi il prompt
`strumenti/opencode/agenzia-senza-subagente.md` e il resoconto.

Carica **davvero** con lo strumento `skill`: `owasp-security`, `postgresql-code-review`, `ponytail-review`, `caveman`. Controlla:
1. **Soldi**: con subagente NULL nessun documento sparisce (Decobrands prende sempre la sua `pct_agente`); quota subagente
   0 ovunque (Riepilogo, documento, liquidazione, Analisi, esportazioni Excel/PDF/CSV, bollettini); nessuna riga di
   liquidazione con subagente null; con subagente presente numeri **identici** a prima; cambio da «nessuno» a un
   subagente con data (D-35) giusto; eccezioni D-51 e regola mensile mai applicate senza subagente.
2. **Ogni lettura di `subagente_id`/`agente_id` in tutto il backend e frontend** (grep): punti rimasti che assumono non-null
   (crash, filtri SQL `=` che escludono i NULL, JOIN interni che fanno sparire righe, raggruppamenti per subagente).
3. **Sicurezza e validazione**: server che rifiuta `pct_subagente`/`regola_mensile` senza subagente; permessi invariati.
4. **Migrazione**: additiva, FK e indici giusti, EXCLUDE D-35 invariato.
5. **Complessità**: logica duplicata, controlli null sparsi invece di un punto solo.

**Non modificare nessun file** tranne il resoconto. Niente jest su `decobrands_db`, niente script fuori da jest, niente
`cd`, `/tmp`, `&`, `.env`, porte 8001/8002, commit.

Resoconto `strumenti/opencode/resoconto-revisione-0-2-12.md`: rilievi per gravità con file:riga, scenario concreto,
correzione proposta, prova; «da correggere prima del rilascio» vs «miglioria». Riepilogo in 10 righe.
