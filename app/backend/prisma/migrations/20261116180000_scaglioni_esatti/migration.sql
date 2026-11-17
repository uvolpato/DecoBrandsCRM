-- Scaglioni esatti (D-200 §19): un'impostazione sul fornitore per accettare solo sconti esatti
-- (|sconto − soglia| ≤ 0,05 punti) nello scaglione della provvigione; senza soglia esatta → anomalia,
-- provvigione da decidere. Predefinito `false` = a fascia (prima soglia ≥ sconto, comportamento di oggi).
-- Additiva: nessun dato toccato, predefinito invariato.

ALTER TABLE "fornitori" ADD COLUMN "scaglioni_esatti" BOOLEAN NOT NULL DEFAULT false;
