-- Agenzia senza subagente: la provvigione è tutta di Decobrands (quota subagente 0, margine = intero).
-- subagente_id diventa NULL ammesso; la FK resta per i valori non nulli. L'EXCLUDE dei periodi (D-35)
-- usa cliente_id e fornitore_id, non subagente_id: nessun effetto sui vincoli di sovrapposizione.

ALTER TABLE "interscambio" ALTER COLUMN "subagente_id" DROP NOT NULL;
