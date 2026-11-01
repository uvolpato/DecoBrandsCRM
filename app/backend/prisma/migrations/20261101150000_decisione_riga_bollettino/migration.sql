-- Decisione sulla riga del bollettino che non quadra (§7.7, D-49): accettare l'importo del fornitore,
-- contestarlo (motivo obbligatorio, va nel testo della contestazione) o attendere il prossimo bollettino.
ALTER TABLE "bollettini_righe"
  ADD COLUMN "decisione" VARCHAR(12),
  ADD COLUMN "decisione_motivo" TEXT,
  ADD COLUMN "deciso_da" BIGINT,
  ADD COLUMN "deciso_il" TIMESTAMPTZ(6);
ALTER TABLE "bollettini_righe" ADD CONSTRAINT "bollettini_righe_deciso_da_fkey" FOREIGN KEY ("deciso_da") REFERENCES "utenti"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bollettini_righe" ADD CONSTRAINT "bollettini_righe_decisione_check" CHECK (
  ("decisione" IS NULL AND "deciso_da" IS NULL AND "deciso_il" IS NULL)
  OR ("decisione" IN ('accettato', 'attendere') AND "deciso_il" IS NOT NULL)
  OR ("decisione" = 'contestato' AND "deciso_il" IS NOT NULL AND length(trim(coalesce("decisione_motivo", ''))) > 0));
