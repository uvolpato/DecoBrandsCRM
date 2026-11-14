-- D-159 §19: le agenzie importate dal vecchio CRM restano nel database ma sono «dal vecchio CRM,
-- da confermare»: al primo uso l'operatore sceglie se usarle così come sono o configurarle. La
-- colonna le marca; le riconosce come --correggi-date (valido_dal = data dell'estratto 2026-11-08,
-- oppure 2000-01-01 dopo che --correggi-date le ha portate a «da sempre»), mai quelle create a mano
-- né quelle usate in un periodo chiuso (bollettino chiuso del fornitore o liquidazione).

ALTER TABLE "interscambio" ADD COLUMN "da_confermare" BOOLEAN NOT NULL DEFAULT false;

UPDATE "interscambio" i
SET "da_confermare" = true
WHERE i."valido_dal" IN (DATE '2026-11-08', DATE '2000-01-01')
  AND NOT EXISTS (SELECT 1 FROM "interscambio" x
                  WHERE x."cliente_id" = i."cliente_id" AND x."fornitore_id" = i."fornitore_id" AND x."id" <> i."id")
  AND NOT EXISTS (SELECT 1 FROM "registro" r
                  WHERE r."entita" = 'interscambio' AND r."entita_id" = i."id")
  AND NOT EXISTS (SELECT 1 FROM "bollettini_testata" b
                  WHERE b."fornitore_id" = i."fornitore_id" AND b."chiuso_il" IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM "liquidazioni");
