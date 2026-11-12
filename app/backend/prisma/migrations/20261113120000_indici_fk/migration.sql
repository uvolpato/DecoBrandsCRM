-- Chiavi esterne sulle tabelle che crescono (A3-11): senza indice, cancellare un utente o un agente fa
-- scorrere tutta la tabella dentro la transazione che tiene il blocco degli utenti. Solo queste cinque:
-- le altre FK senza indice stanno su tabelle piccole e si lasciano.
CREATE INDEX "documenti_campi_corretto_da_idx" ON "documenti_campi"("corretto_da");
CREATE INDEX "documenti_in_arrivo_utente_id_idx" ON "documenti_in_arrivo"("utente_id");
CREATE INDEX "documenti_in_arrivo_scartato_da_idx" ON "documenti_in_arrivo"("scartato_da");
CREATE INDEX "bollettini_righe_deciso_da_idx" ON "bollettini_righe"("deciso_da");
CREATE INDEX "ordini_fornitore_testata_agente_id_idx" ON "ordini_fornitore_testata"("agente_id");
