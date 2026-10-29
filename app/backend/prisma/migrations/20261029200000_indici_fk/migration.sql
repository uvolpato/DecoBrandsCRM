-- AlterTable
ALTER TABLE "sessioni" ALTER COLUMN "expire" SET DATA TYPE TIMESTAMPTZ(6);

-- CreateIndex
CREATE INDEX "bollettini_righe_testata_id_idx" ON "bollettini_righe"("testata_id");

-- CreateIndex
CREATE INDEX "documenti_in_arrivo_fornitore_id_idx" ON "documenti_in_arrivo"("fornitore_id");

-- CreateIndex
CREATE INDEX "documenti_in_arrivo_abbinato_pratica_id_idx" ON "documenti_in_arrivo"("abbinato_pratica_id");

-- CreateIndex
CREATE INDEX "documenti_in_arrivo_abbinato_bollettino_id_idx" ON "documenti_in_arrivo"("abbinato_bollettino_id");

-- CreateIndex
CREATE INDEX "ordini_fornitore_documenti_testata_id_idx" ON "ordini_fornitore_documenti"("testata_id");

-- CreateIndex
CREATE INDEX "registro_visto_da_idx" ON "registro"("visto_da");


-- Anomalia aperta unica anche quando servizio è NULL (§4.2.11, D-31)
DROP INDEX "registro_anomalia_aperta_key";
CREATE UNIQUE INDEX "registro_anomalia_aperta_key" ON "registro" (COALESCE("servizio", ''), "codice", COALESCE("chiave", ''))
  WHERE "genere" = 'anomalia' AND "stato" = 'aperta';
