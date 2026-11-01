-- Anagrafiche con identità stabile e versioni (D-46, spec §4.6), anticipate dalla fase F1-A7:
-- le tabelle sono vuote, seed e motore nascono già sulle tabelle giuste.
-- Le tabelle toccate erano vuote (controllato su decobrands_db e decobrands_test).

-- ---------- Versioni: dati descrittivi, si aggiungono soltanto ----------
CREATE TABLE "clienti_versioni" (
    "id" BIGSERIAL NOT NULL,
    "cliente_id" BIGINT NOT NULL,
    "valido_dal" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fonte" VARCHAR(10) NOT NULL,
    "creato_da" BIGINT,
    "piva" VARCHAR(20),
    "ragione_sociale" VARCHAR(255) NOT NULL,
    "indirizzo" VARCHAR(255),
    "cap" VARCHAR(10),
    "citta" VARCHAR(100),
    "provincia" VARCHAR(5),
    "email" VARCHAR(200),
    CONSTRAINT "clienti_versioni_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "clienti_versioni_fonte_check" CHECK ("fonte" IN ('integra', 'crm'))
);
CREATE TABLE "fornitori_versioni" (
    "id" BIGSERIAL NOT NULL,
    "fornitore_id" BIGINT NOT NULL,
    "valido_dal" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fonte" VARCHAR(10) NOT NULL,
    "creato_da" BIGINT,
    "piva" VARCHAR(20),
    "ragione_sociale" VARCHAR(255) NOT NULL,
    "paese" VARCHAR(100),
    CONSTRAINT "fornitori_versioni_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fornitori_versioni_fonte_check" CHECK ("fonte" IN ('integra', 'crm'))
);
-- chiave per le chiavi esterne composte dei fatti
CREATE UNIQUE INDEX "clienti_versioni_cliente_id_id_key" ON "clienti_versioni"("cliente_id", "id");
CREATE UNIQUE INDEX "fornitori_versioni_fornitore_id_id_key" ON "fornitori_versioni"("fornitore_id", "id");
CREATE INDEX "clienti_versioni_piva_idx" ON "clienti_versioni"("piva");
CREATE INDEX "fornitori_versioni_piva_idx" ON "fornitori_versioni"("piva");
ALTER TABLE "clienti_versioni" ADD CONSTRAINT "clienti_versioni_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clienti"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fornitori_versioni" ADD CONSTRAINT "fornitori_versioni_fornitore_id_fkey" FOREIGN KEY ("fornitore_id") REFERENCES "fornitori"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clienti_versioni" ADD CONSTRAINT "clienti_versioni_creato_da_fkey" FOREIGN KEY ("creato_da") REFERENCES "utenti"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fornitori_versioni" ADD CONSTRAINT "fornitori_versioni_creato_da_fkey" FOREIGN KEY ("creato_da") REFERENCES "utenti"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Le versioni non si modificano né si cancellano (D-46); un errore si corregge con una versione nuova
CREATE FUNCTION versioni_solo_aggiunta() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '%: le versioni si aggiungono soltanto (D-46)', TG_TABLE_NAME;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER "clienti_versioni_solo_aggiunta" BEFORE UPDATE OR DELETE ON "clienti_versioni"
  FOR EACH ROW EXECUTE FUNCTION versioni_solo_aggiunta();
CREATE TRIGGER "fornitori_versioni_solo_aggiunta" BEFORE UPDATE OR DELETE ON "fornitori_versioni"
  FOR EACH ROW EXECUTE FUNCTION versioni_solo_aggiunta();

-- ---------- Identità: restano id, stato, configurazione del CRM e campi tecnici ----------
DROP INDEX "clienti_piva_idx";
ALTER TABLE "clienti" DROP COLUMN "codice_integra", DROP COLUMN "piva", DROP COLUMN "ragione_sociale",
  DROP COLUMN "indirizzo", DROP COLUMN "cap", DROP COLUMN "citta", DROP COLUMN "provincia", DROP COLUMN "email",
  ADD COLUMN "versione_corrente_id" BIGINT;
ALTER TABLE "fornitori" DROP COLUMN "codice_integra", DROP COLUMN "piva", DROP COLUMN "ragione_sociale",
  ADD COLUMN "versione_corrente_id" BIGINT;
-- la versione corrente è sempre una versione della stessa identità
ALTER TABLE "clienti" ADD CONSTRAINT "clienti_versione_corrente_fkey" FOREIGN KEY ("id", "versione_corrente_id") REFERENCES "clienti_versioni"("cliente_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fornitori" ADD CONSTRAINT "fornitori_versione_corrente_fkey" FOREIGN KEY ("id", "versione_corrente_id") REFERENCES "fornitori_versioni"("fornitore_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------- Codici nei sistemi esterni ----------
-- entita_id punta a clienti o fornitori secondo il tipo: nessuna FK (un solo elenco per tutte le anagrafiche)
CREATE TABLE "codici_esterni" (
    "id" BIGSERIAL NOT NULL,
    "sistema" VARCHAR(20) NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,
    "codice" VARCHAR(50) NOT NULL,
    "entita_id" BIGINT NOT NULL,
    "creato_il" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "codici_esterni_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "codici_esterni_sistema_check" CHECK ("sistema" IN ('integra')),
    CONSTRAINT "codici_esterni_tipo_check" CHECK ("tipo" IN ('cliente', 'fornitore'))
);
CREATE UNIQUE INDEX "codici_esterni_sistema_tipo_codice_key" ON "codici_esterni"("sistema", "tipo", "codice");
CREATE INDEX "codici_esterni_tipo_entita_id_idx" ON "codici_esterni"("tipo", "entita_id");

-- ---------- Fatti: identità + versione, chiave esterna composta ----------
-- ordini_fornitore_testata: cliente_piva e fornitore_id -> coppie
DROP INDEX "ordini_fornitore_testata_cliente_piva_idx";
ALTER TABLE "ordini_fornitore_testata" DROP COLUMN "cliente_piva",
  ADD COLUMN "cliente_id" BIGINT NOT NULL, ADD COLUMN "cliente_versione_id" BIGINT NOT NULL,
  ADD COLUMN "fornitore_versione_id" BIGINT NOT NULL;
ALTER TABLE "ordini_fornitore_testata" ADD CONSTRAINT "ordini_fornitore_testata_cliente_versione_fkey" FOREIGN KEY ("cliente_id", "cliente_versione_id") REFERENCES "clienti_versioni"("cliente_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ordini_fornitore_testata" ADD CONSTRAINT "ordini_fornitore_testata_fornitore_versione_fkey" FOREIGN KEY ("fornitore_id", "fornitore_versione_id") REFERENCES "fornitori_versioni"("fornitore_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "ordini_fornitore_testata_cliente_id_idx" ON "ordini_fornitore_testata"("cliente_id");

-- bollettini_testata: fornitore
ALTER TABLE "bollettini_testata" ADD COLUMN "fornitore_versione_id" BIGINT NOT NULL;
ALTER TABLE "bollettini_testata" ADD CONSTRAINT "bollettini_testata_fornitore_versione_fkey" FOREIGN KEY ("fornitore_id", "fornitore_versione_id") REFERENCES "fornitori_versioni"("fornitore_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- bollettini_righe: cliente (opzionale, la riga può non avere P.IVA); i due campi vanno insieme
ALTER TABLE "bollettini_righe" DROP COLUMN "cliente_piva", ADD COLUMN "cliente_id" BIGINT, ADD COLUMN "cliente_versione_id" BIGINT;
ALTER TABLE "bollettini_righe" ADD CONSTRAINT "bollettini_righe_cliente_versione_fkey" FOREIGN KEY ("cliente_id", "cliente_versione_id") REFERENCES "clienti_versioni"("cliente_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bollettini_righe" ADD CONSTRAINT "bollettini_righe_cliente_check" CHECK (("cliente_id" IS NULL) = ("cliente_versione_id" IS NULL));
CREATE INDEX "bollettini_righe_cliente_id_idx" ON "bollettini_righe"("cliente_id");

-- documenti_in_arrivo: fornitore riconosciuto dalla lettura (opzionale, correggibile); i due campi vanno insieme
ALTER TABLE "documenti_in_arrivo" ADD COLUMN "fornitore_versione_id" BIGINT;
ALTER TABLE "documenti_in_arrivo" ADD CONSTRAINT "documenti_in_arrivo_fornitore_versione_fkey" FOREIGN KEY ("fornitore_id", "fornitore_versione_id") REFERENCES "fornitori_versioni"("fornitore_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "documenti_in_arrivo" ADD CONSTRAINT "documenti_in_arrivo_fornitore_check" CHECK (("fornitore_id" IS NULL) = ("fornitore_versione_id" IS NULL));

-- ---------- Configurazioni: solo l'identità ----------
-- interscambio: cliente_piva -> cliente_id; l'EXCLUDE sul cliente va rifatto
ALTER TABLE "interscambio" DROP CONSTRAINT "interscambio_cliente_periodo_excl";
ALTER TABLE "interscambio" DROP COLUMN "cliente_piva", ADD COLUMN "cliente_id" BIGINT NOT NULL;
ALTER TABLE "interscambio" ADD CONSTRAINT "interscambio_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clienti"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "interscambio" ADD CONSTRAINT "interscambio_cliente_periodo_excl" EXCLUDE USING gist
  ("cliente_id" WITH =, "fornitore_id" WITH =, daterange("valido_dal", "valido_al") WITH &&);
CREATE INDEX "interscambio_cliente_id_idx" ON "interscambio"("cliente_id");
