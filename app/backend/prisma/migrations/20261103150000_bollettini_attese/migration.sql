-- Decisione su un documento del mese che manca nel bollettino (§7.7, D-56): il fornitore non ha scritto
-- la riga, la decisione è nostra. Tabella a parte, così le righe del fornitore (bollettini_righe) restano
-- solo sue e nessun conteggio le confonde. Vale finché il documento è mancante: chi lo abbina la toglie.
CREATE TABLE "bollettini_attese" (
    "id" BIGSERIAL NOT NULL,
    "testata_id" BIGINT NOT NULL,
    "documento_id" BIGINT NOT NULL,
    "decisione" VARCHAR(12) NOT NULL,
    "decisione_motivo" TEXT,
    "deciso_da" BIGINT,
    "deciso_il" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bollettini_attese_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "bollettini_attese_decisione_check" CHECK (
      "decisione" = 'attendere' OR ("decisione" = 'contestato' AND length(trim(coalesce("decisione_motivo", ''))) > 0))
);

CREATE INDEX "bollettini_attese_documento_id_idx" ON "bollettini_attese"("documento_id");
CREATE UNIQUE INDEX "bollettini_attese_testata_id_documento_id_key" ON "bollettini_attese"("testata_id", "documento_id");

ALTER TABLE "bollettini_attese" ADD CONSTRAINT "bollettini_attese_testata_id_fkey" FOREIGN KEY ("testata_id") REFERENCES "bollettini_testata"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bollettini_attese" ADD CONSTRAINT "bollettini_attese_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "ordini_fornitore_documenti"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bollettini_attese" ADD CONSTRAINT "bollettini_attese_deciso_da_fkey" FOREIGN KEY ("deciso_da") REFERENCES "utenti"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
