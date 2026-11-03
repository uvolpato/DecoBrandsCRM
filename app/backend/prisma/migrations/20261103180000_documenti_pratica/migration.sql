-- D-60 §19: un modello dei documenti della pratica valido per ogni fornitore. Ordini (1..n, si sommano), conferme,
-- proforma, pagamenti del cliente e altri documenti stanno con fatture e note di credito in ordini_fornitore_documenti;
-- solo fattura e nota di credito toccano le provvigioni. Le righe stanno sul loro documento.

-- tipi e segno dell'importo
ALTER TABLE "ordini_fornitore_documenti" DROP CONSTRAINT "ordini_fornitore_documenti_tipo_check";
ALTER TABLE "ordini_fornitore_documenti" ADD CONSTRAINT "ordini_fornitore_documenti_tipo_check"
  CHECK ("tipo" IN ('ordine', 'conferma', 'proforma', 'fattura', 'nota_credito', 'pagamento', 'altro'));
ALTER TABLE "ordini_fornitore_documenti" DROP CONSTRAINT "ordini_fornitore_documenti_importo_check";
ALTER TABLE "ordini_fornitore_documenti" ADD CONSTRAINT "ordini_fornitore_documenti_importo_check"
  CHECK (("tipo" = 'nota_credito' AND "importo" <= 0) OR ("tipo" <> 'nota_credito' AND "importo" >= 0));
ALTER TABLE "ordini_fornitore_documenti" ALTER COLUMN "importo" SET DEFAULT 0;

-- righe sul loro documento: numerate per documento (un documento spostato porta con sé le sue righe)
ALTER TABLE "ordini_fornitore_righe" ADD COLUMN "documento_id" BIGINT;
ALTER TABLE "ordini_fornitore_righe" ADD CONSTRAINT "ordini_fornitore_righe_documento_id_fkey"
  FOREIGN KEY ("documento_id") REFERENCES "ordini_fornitore_documenti"("id") ON DELETE CASCADE ON UPDATE CASCADE;
DROP INDEX "ordini_fornitore_righe_testata_id_fase_numero_riga_key";
CREATE UNIQUE INDEX "ordini_fornitore_righe_documento_id_numero_riga_key" ON "ordini_fornitore_righe"("documento_id", "numero_riga");
CREATE INDEX "ordini_fornitore_righe_testata_id_idx" ON "ordini_fornitore_righe"("testata_id");

-- il primo ordine e la conferma passano dalla testata ai documenti
INSERT INTO "ordini_fornitore_documenti" ("testata_id", "tipo", "numero", "data", "importo")
SELECT t."id", 'ordine', t."numero_ordine", t."data_ordine",
       coalesce(t."importo_merce", (SELECT sum(r."importo") FROM "ordini_fornitore_righe" r WHERE r."testata_id" = t."id" AND r."fase" = 'ordine'), 0)
FROM "ordini_fornitore_testata" t;
INSERT INTO "ordini_fornitore_documenti" ("testata_id", "tipo", "numero", "data", "importo")
SELECT t."id", 'conferma', coalesce(t."conferma_numero", ''), t."conferma_data",
       coalesce((SELECT sum(r."importo") FROM "ordini_fornitore_righe" r WHERE r."testata_id" = t."id" AND r."fase" = 'conferma'), 0)
FROM "ordini_fornitore_testata" t WHERE t."conferma_data" IS NOT NULL;
-- le righe di ordine e conferma vanno sul documento; quelle di fattura solo se la fattura è una
UPDATE "ordini_fornitore_righe" r SET "documento_id" = d."id"
FROM "ordini_fornitore_documenti" d
WHERE d."testata_id" = r."testata_id" AND d."tipo" = r."fase"
  AND (SELECT count(*) FROM "ordini_fornitore_documenti" x WHERE x."testata_id" = r."testata_id" AND x."tipo" = r."fase") = 1;
ALTER TABLE "ordini_fornitore_testata" DROP COLUMN "conferma_data", DROP COLUMN "conferma_numero";

-- canale: tipi nuovi; archivio per pratica (sostituisce D-55): in coda in_arrivo/AAAA/AAAAMMGG/<impronta>.<est>
ALTER TABLE "documenti_in_arrivo" DROP CONSTRAINT "documenti_in_arrivo_tipo_check";
ALTER TABLE "documenti_in_arrivo" ADD CONSTRAINT "documenti_in_arrivo_tipo_check"
  CHECK ("tipo" IS NULL OR "tipo" IN ('ordine', 'conferma', 'proforma', 'fattura', 'nota_credito', 'pagamento', 'altro', 'bollettino'));
ALTER TABLE "documenti_in_arrivo" ALTER COLUMN "file_percorso" TYPE VARCHAR(255);
-- i file già salvati restano dove sono: il percorso salvato vale così com'è, solo i nuovi vanno in in_arrivo/
-- (niente passi a mano sul disco al rilascio)
-- un numero d'ordine sta una volta sola nella stessa pratica (il blocco sul fornitore lo controlla fra pratiche)
CREATE UNIQUE INDEX "ordini_fornitore_documenti_ordine_unico" ON "ordini_fornitore_documenti" ("testata_id", "numero") WHERE "tipo" = 'ordine';
