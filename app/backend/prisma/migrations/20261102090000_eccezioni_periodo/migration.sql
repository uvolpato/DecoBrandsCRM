-- D-51 §19: le eccezioni personali si staccano dalle versioni delle percentuali.
-- Prima: una riga per scaglione (versione), copiata a ogni versione nuova.
-- Dopo: (fornitore, subagente, sconto) con un periodo [valido_dal, valido_al) (valido_al escluso come interscambio, NULL = senza fine).

-- Conversione: versioni di fila con la stessa % diventano una riga sola (isole); se la % cambia, righe
-- successive. valido_al = data della versione che segue l'isola (esclusa), NULL se l'isola arriva all'ultima.
CREATE TEMP TABLE eccezioni_nuove AS
WITH v AS (
  SELECT s.id, s.fornitore_id, s.sconto_min, s.valido_dal,
         lead(s.valido_dal) OVER w AS prossima,
         row_number() OVER w AS n
  FROM provvigioni_scaglioni s
  WINDOW w AS (PARTITION BY s.fornitore_id, s.sconto_min ORDER BY s.valido_dal)
), e AS (
  SELECT v.fornitore_id, v.sconto_min, e.subagente_id, e.pct_personale, v.valido_dal, v.prossima, v.n,
         v.n - row_number() OVER (PARTITION BY v.fornitore_id, v.sconto_min, e.subagente_id, e.pct_personale ORDER BY v.n) AS isola
  FROM provvigioni_eccezioni e JOIN v ON v.id = e.scaglione_id
)
SELECT fornitore_id, subagente_id, sconto_min, pct_personale,
       min(valido_dal) AS valido_dal,
       (array_agg(prossima ORDER BY n DESC))[1] AS valido_al
FROM e
GROUP BY fornitore_id, sconto_min, subagente_id, pct_personale, isola;

DELETE FROM "provvigioni_eccezioni";

ALTER TABLE "provvigioni_eccezioni" DROP CONSTRAINT "provvigioni_eccezioni_scaglione_id_fkey";
DROP INDEX "provvigioni_eccezioni_scaglione_id_subagente_id_key";
ALTER TABLE "provvigioni_eccezioni" DROP COLUMN "scaglione_id",
  ADD COLUMN "fornitore_id" BIGINT NOT NULL,
  ADD COLUMN "sconto_min" DECIMAL(5,2) NOT NULL,
  ADD COLUMN "valido_dal" DATE NOT NULL,
  ADD COLUMN "valido_al" DATE;

ALTER TABLE "provvigioni_eccezioni" ADD CONSTRAINT "provvigioni_eccezioni_fornitore_id_fkey" FOREIGN KEY ("fornitore_id") REFERENCES "fornitori"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "provvigioni_eccezioni" ADD CONSTRAINT "provvigioni_eccezioni_sconto_check" CHECK ("sconto_min" BETWEEN 0 AND 100);
ALTER TABLE "provvigioni_eccezioni" ADD CONSTRAINT "provvigioni_eccezioni_periodo_check" CHECK ("valido_al" IS NULL OR "valido_al" > "valido_dal");
-- un solo periodo per fornitore × subagente × sconto in ogni giorno (btree_gist, come interscambio)
ALTER TABLE "provvigioni_eccezioni" ADD CONSTRAINT "provvigioni_eccezioni_periodo_excl" EXCLUDE USING gist
  ("fornitore_id" WITH =, "subagente_id" WITH =, "sconto_min" WITH =, daterange("valido_dal", "valido_al") WITH &&);
CREATE INDEX "provvigioni_eccezioni_subagente_id_idx" ON "provvigioni_eccezioni"("subagente_id");

INSERT INTO "provvigioni_eccezioni" ("fornitore_id", "subagente_id", "sconto_min", "pct_personale", "valido_dal", "valido_al")
SELECT fornitore_id, subagente_id, sconto_min, pct_personale, valido_dal, valido_al FROM eccezioni_nuove;
DROP TABLE eccezioni_nuove;
