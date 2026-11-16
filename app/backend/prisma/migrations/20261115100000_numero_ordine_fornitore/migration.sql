-- D-169 §19: numero d'ordine del fornitore. La pratica è marchiata con il numero d'ordine del
-- fornitore: la coppia (fornitore, numero) è unica, mai il numero da solo (fornitori diversi possono
-- avere la stessa numerazione). NULL = pratica senza numero (o documento letto prima di D-169).
-- D-170 §19: lettura_grezza conserva la risposta completa del lettore per ricavare campi nuovi dai
-- documenti già letti senza rileggerli.

ALTER TABLE "ordini_fornitore_testata" ADD COLUMN "numero_ordine_fornitore" VARCHAR(50);

CREATE UNIQUE INDEX "ordini_fornitore_testata_fornitore_numero_fornitore_key"
    ON "ordini_fornitore_testata"("fornitore_id", "numero_ordine_fornitore")
    WHERE "numero_ordine_fornitore" IS NOT NULL;

ALTER TABLE "documenti_in_arrivo" ADD COLUMN "lettura_grezza" JSONB;
