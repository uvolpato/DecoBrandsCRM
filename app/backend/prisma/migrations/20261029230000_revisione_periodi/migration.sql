-- Periodi e buchi rimasti dopo D-34 (D-35 §19). Tabelle vuote.

-- btree_gist: serve agli EXCLUDE con uguaglianza su colonne normali (estensione fidata, basta il proprietario)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Interscambio datato: un documento va al subagente che seguiva il cliente alla data del documento
DROP INDEX "interscambio_cliente_fornitore_attivo_key";
DROP INDEX "interscambio_fornitore_id_codice_cliente_fornitore_key";
ALTER TABLE "interscambio" DROP COLUMN "attivo",
  ADD COLUMN "valido_dal" DATE NOT NULL,
  ADD COLUMN "valido_al" DATE,
  ADD CONSTRAINT "interscambio_periodo_check" CHECK ("valido_al" IS NULL OR "valido_al" > "valido_dal"),
  ADD CONSTRAINT "interscambio_sconto_check" CHECK ("sconto" BETWEEN 0 AND 100),
  ADD CONSTRAINT "interscambio_pct_subagente_check" CHECK ("pct_subagente" IS NULL OR "pct_subagente" BETWEEN 0 AND 100),
  -- un solo subagente per cliente × fornitore in ogni giorno (§5.10)
  ADD CONSTRAINT "interscambio_cliente_periodo_excl" EXCLUDE USING gist
    ("cliente_piva" WITH =, "fornitore_id" WITH =, daterange("valido_dal", "valido_al") WITH &&),
  -- il codice del fornitore indica un solo cliente in ogni giorno (§4.4)
  ADD CONSTRAINT "interscambio_codice_periodo_excl" EXCLUDE USING gist
    ("fornitore_id" WITH =, "codice_cliente_fornitore" WITH =, daterange("valido_dal", "valido_al") WITH &&);
CREATE INDEX "interscambio_fornitore_id_codice_cliente_fornitore_idx" ON "interscambio"("fornitore_id", "codice_cliente_fornitore");

-- La storia delle agenzie non sparisce con il subagente o il fornitore: si disattivano
ALTER TABLE "interscambio" DROP CONSTRAINT "interscambio_fornitore_id_fkey";
ALTER TABLE "interscambio" DROP CONSTRAINT "interscambio_subagente_id_fkey";
ALTER TABLE "interscambio" ADD CONSTRAINT "interscambio_subagente_id_fkey" FOREIGN KEY ("subagente_id") REFERENCES "subagenti"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "interscambio" ADD CONSTRAINT "interscambio_fornitore_id_fkey" FOREIGN KEY ("fornitore_id") REFERENCES "fornitori"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Scaglioni a soglia come nel prototipo: vale la soglia più alta <= sconto, nessuna sovrapposizione possibile
ALTER TABLE "provvigioni_scaglioni" DROP COLUMN "sconto_max",
  ADD CONSTRAINT "provvigioni_scaglioni_pct_check" CHECK ("sconto_min" BETWEEN 0 AND 100 AND "pct_agente" BETWEEN 0 AND 100 AND "pct_subagente" BETWEEN 0 AND 100);
ALTER TABLE "provvigioni_eccezioni" ADD CONSTRAINT "provvigioni_eccezioni_pct_check" CHECK ("pct_personale" BETWEEN 0 AND 100);

-- Clienti: P.IVA non univoca, Integra può averne di doppie (§4.4)
DROP INDEX "clienti_piva_key";
CREATE INDEX "clienti_piva_idx" ON "clienti"("piva");

-- Bollettino chiuso: la data decide il trimestre di storni e riaccrediti (D-11)
ALTER TABLE "bollettini_testata" ADD COLUMN "chiuso_il" TIMESTAMPTZ(6), ADD COLUMN "chiuso_da" BIGINT,
  ADD CONSTRAINT "bollettini_testata_chiuso_check" CHECK (("stato" = 'da_verificare') = ("chiuso_il" IS NULL));
ALTER TABLE "bollettini_testata" ADD CONSTRAINT "bollettini_testata_chiuso_da_fkey" FOREIGN KEY ("chiuso_da") REFERENCES "utenti"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Storni e riaccrediti del bollettino: trimestre in cui sono andati al subagente
ALTER TABLE "bollettini_righe" ADD COLUMN "liquidazione_id" BIGINT,
  ADD CONSTRAINT "bollettini_righe_liquidazione_check" CHECK ("liquidazione_id" IS NULL OR "tipo_riga" IN ('storno', 'riaccredito'));
CREATE INDEX "bollettini_righe_liquidazione_id_idx" ON "bollettini_righe"("liquidazione_id");
ALTER TABLE "bollettini_righe" ADD CONSTRAINT "bollettini_righe_liquidazione_id_fkey" FOREIGN KEY ("liquidazione_id") REFERENCES "liquidazioni"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
