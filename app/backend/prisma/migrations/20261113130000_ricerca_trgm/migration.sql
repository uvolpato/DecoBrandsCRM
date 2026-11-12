-- La ricerca delle Pratiche usa ILIKE '%testo%' su numero della pratica, le due ragioni sociali e il numero
-- dei documenti (A7-24): con il % iniziale i b-tree non servono e si legge tutta la tabella, due volte
-- (conteggi dei segmenti e pagina). Gli indici trigram servono proprio a questo.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "ordini_fornitore_testata_numero_ordine_idx" ON "ordini_fornitore_testata" USING GIN ("numero_ordine" gin_trgm_ops);
CREATE INDEX "ordini_fornitore_documenti_numero_idx" ON "ordini_fornitore_documenti" USING GIN ("numero" gin_trgm_ops);
CREATE INDEX "clienti_versioni_ragione_sociale_idx" ON "clienti_versioni" USING GIN ("ragione_sociale" gin_trgm_ops);
CREATE INDEX "fornitori_versioni_ragione_sociale_idx" ON "fornitori_versioni" USING GIN ("ragione_sociale" gin_trgm_ops);
