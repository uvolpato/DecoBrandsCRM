-- Raggruppamento per lo scaglione (D-199 §19): alcuni fornitori (es. Arte) applicano la percentuale
-- riga per riga, secondo lo sconto della riga, e poi sommano. Si aggiunge un'impostazione sul fornitore
-- con deroga sulla singola pratica. Predefinito `documento` = sconto medio (comportamento di oggi).
-- Additiva: nessun dato toccato, predefinito invariato.

ALTER TABLE "fornitori" ADD COLUMN "raggruppamento" VARCHAR(10) NOT NULL DEFAULT 'documento';
ALTER TABLE "fornitori" ADD CONSTRAINT "fornitori_raggruppamento_check"
  CHECK ("raggruppamento" IN ('documento', 'riga'));

ALTER TABLE "ordini_fornitore_testata" ADD COLUMN "raggruppamento" VARCHAR(10);
ALTER TABLE "ordini_fornitore_testata" ADD CONSTRAINT "ordini_fornitore_testata_raggruppamento_check"
  CHECK ("raggruppamento" IN ('documento', 'riga'));
