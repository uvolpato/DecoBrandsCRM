-- Revisione dello schema (D-34 §19). Tabelle vuote: nessun dato da migrare.

-- Nomi in italiano (regola 1 di CLAUDE.md)
ALTER TABLE "agenti" RENAME COLUMN "created_at" TO "creato_il";
ALTER TABLE "bollettini_righe" RENAME COLUMN "created_at" TO "creato_il";
ALTER TABLE "bollettini_testata" RENAME COLUMN "created_at" TO "creato_il";
ALTER TABLE "bollettini_testata" RENAME COLUMN "updated_at" TO "modificato_il";
ALTER TABLE "fornitori" RENAME COLUMN "created_at" TO "creato_il";
ALTER TABLE "fornitori" RENAME COLUMN "updated_at" TO "modificato_il";
ALTER TABLE "interscambio" RENAME COLUMN "created_at" TO "creato_il";
ALTER TABLE "interscambio" RENAME COLUMN "discount" TO "sconto";
ALTER TABLE "ordini_fornitore_documenti" RENAME COLUMN "created_at" TO "creato_il";
ALTER TABLE "ordini_fornitore_testata" RENAME COLUMN "created_at" TO "creato_il";
ALTER TABLE "ordini_fornitore_testata" RENAME COLUMN "updated_at" TO "modificato_il";
ALTER TABLE "provvigioni_eccezioni" RENAME COLUMN "created_at" TO "creato_il";
ALTER TABLE "provvigioni_eccezioni" RENAME COLUMN "pct_override" TO "pct_personale";
ALTER TABLE "provvigioni_scaglioni" RENAME COLUMN "created_at" TO "creato_il";

ALTER TABLE "fornitori" DROP CONSTRAINT "fornitori_payment_type_check";
ALTER TABLE "fornitori" RENAME COLUMN "payment_type" TO "tipo_provvigione";
ALTER TABLE "fornitori" ALTER COLUMN "tipo_provvigione" SET DEFAULT 'fatturato';
ALTER TABLE "fornitori" ADD CONSTRAINT "fornitori_tipo_provvigione_check" CHECK ("tipo_provvigione" IN ('maturato', 'fatturato'));

-- Fornitori sincronizzati da Integra come i clienti; sconto di default ridondante (§4.4)
ALTER TABLE "fornitori" DROP COLUMN "discount",
  ALTER COLUMN "codice_integra" SET NOT NULL,
  ADD COLUMN "sincronizzato_il" TIMESTAMPTZ(6);

-- Un solo subagente attivo per cliente × fornitore (§5.10); gli inattivi restano come storico
DROP INDEX "interscambio_subagente_id_cliente_piva_fornitore_id_key";
DROP INDEX "interscambio_cliente_piva_idx";
CREATE UNIQUE INDEX "interscambio_cliente_fornitore_attivo_key" ON "interscambio" ("cliente_piva", "fornitore_id") WHERE "attivo";
CREATE INDEX "interscambio_subagente_id_idx" ON "interscambio"("subagente_id");

-- Pratica: niente copie dei documenti, campi dell'ordine obbligatori
ALTER TABLE "ordini_fornitore_testata"
  DROP COLUMN "att_filename_ordine",
  DROP COLUMN "att_filename_conferma",
  DROP COLUMN "att_filename_fattura",
  DROP COLUMN "fattura_numero",
  DROP COLUMN "fattura_data",
  DROP COLUMN "fattura_importo",
  ALTER COLUMN "numero_ordine" SET NOT NULL,
  ALTER COLUMN "data_ordine" SET NOT NULL,
  ALTER COLUMN "cliente_piva" SET NOT NULL;

-- Documenti: nota di credito legata alla fattura, file dal documento in arrivo, trimestre liquidato
ALTER TABLE "ordini_fornitore_documenti"
  DROP COLUMN "fattura_riferimento",
  DROP COLUMN "att_filename",
  ADD COLUMN "fattura_id" BIGINT,
  ADD COLUMN "arrivo_id" BIGINT,
  ADD COLUMN "liquidazione_id" BIGINT,
  ALTER COLUMN "numero" SET NOT NULL,
  ALTER COLUMN "data" SET NOT NULL,
  ALTER COLUMN "importo" SET NOT NULL,
  ADD CONSTRAINT "ordini_fornitore_documenti_fattura_id_check" CHECK ("fattura_id" IS NULL OR "tipo" = 'nota_credito');
CREATE INDEX "ordini_fornitore_documenti_fattura_id_idx" ON "ordini_fornitore_documenti"("fattura_id");
CREATE INDEX "ordini_fornitore_documenti_liquidazione_id_idx" ON "ordini_fornitore_documenti"("liquidazione_id");
CREATE INDEX "ordini_fornitore_documenti_arrivo_id_idx" ON "ordini_fornitore_documenti"("arrivo_id");
ALTER TABLE "ordini_fornitore_documenti" ADD CONSTRAINT "ordini_fornitore_documenti_fattura_id_fkey" FOREIGN KEY ("fattura_id") REFERENCES "ordini_fornitore_documenti"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ordini_fornitore_documenti" ADD CONSTRAINT "ordini_fornitore_documenti_arrivo_id_fkey" FOREIGN KEY ("arrivo_id") REFERENCES "documenti_in_arrivo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ordini_fornitore_documenti" ADD CONSTRAINT "ordini_fornitore_documenti_liquidazione_id_fkey" FOREIGN KEY ("liquidazione_id") REFERENCES "liquidazioni"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Bollettini: totali e differenza si ricavano dalle righe; riga legata al documento abbinato (§5.11)
ALTER TABLE "bollettini_testata"
  DROP COLUMN "att_filename",
  DROP COLUMN "importo_riconosciuto",
  DROP COLUMN "importo_calcolato";
ALTER TABLE "bollettini_righe"
  DROP COLUMN "differenza",
  ADD COLUMN "documento_id" BIGINT,
  ALTER COLUMN "fattura_numero" SET NOT NULL,
  ALTER COLUMN "importo_riconosciuto" SET NOT NULL;
ALTER TABLE "bollettini_righe" ADD COLUMN "differenza" DECIMAL(12,2)
  GENERATED ALWAYS AS ("importo_riconosciuto" - COALESCE("importo_calcolato", 0)) STORED;
CREATE INDEX "bollettini_righe_documento_id_idx" ON "bollettini_righe"("documento_id");
ALTER TABLE "bollettini_righe" ADD CONSTRAINT "bollettini_righe_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "ordini_fornitore_documenti"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Chi tocca gli importi si disattiva, non si elimina (§7.13)
ALTER TABLE "provvigioni_correzioni" DROP CONSTRAINT "provvigioni_correzioni_creato_da_fkey";
ALTER TABLE "provvigioni_correzioni" ADD CONSTRAINT "provvigioni_correzioni_creato_da_fkey" FOREIGN KEY ("creato_da") REFERENCES "utenti"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "liquidazioni" DROP CONSTRAINT "liquidazioni_chiusa_da_fkey";
ALTER TABLE "liquidazioni" ADD CONSTRAINT "liquidazioni_chiusa_da_fkey" FOREIGN KEY ("chiusa_da") REFERENCES "utenti"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- I file stanno su disco, con l'impronta SHA-256 come nome (D-34)
ALTER TABLE "documenti_in_arrivo" DROP COLUMN "file";
