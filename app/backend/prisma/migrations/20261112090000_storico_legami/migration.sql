-- Storico dei legami del vecchio CRM (D-112, §4.7.2-4.7.3).
-- Fotografia dei 4022 legami e delle 3403 schede, solo lettura per l'app: propongono, non creano.
-- Nessuna FK obbligatoria verso clienti/fornitori/subagenti: è la ragione per cui l'import massivo
-- era fermo. Le copie di testo rendono la tabella leggibile e confrontabile senza anagrafica.

CREATE TABLE "interscambio_storico" (
    "id" BIGSERIAL NOT NULL,
    "fonte" VARCHAR(20) NOT NULL,
    "estratto_il" DATE NOT NULL,
    "cliente_legacy_id" BIGINT NOT NULL,
    "fornitore_legacy_id" BIGINT NOT NULL,
    "cliente_codice_fornitore" VARCHAR(50),
    "cliente_ragione_sociale" VARCHAR(255),
    "cliente_piva" VARCHAR(20),
    "cliente_piva_norm" VARCHAR(20) NOT NULL DEFAULT '',
    "cliente_cf" VARCHAR(30),
    "fornitore_ragione_sociale" VARCHAR(255),
    "fornitore_piva" VARCHAR(20),
    "agente_nome" VARCHAR(200),
    "subagente_nome" VARCHAR(200),
    "sconto_1" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "sconto_2" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "cliente_id" BIGINT,
    "fornitore_id" BIGINT,
    "subagente_id" BIGINT,
    "interscambio_id" BIGINT,
    "stato" VARCHAR(12) NOT NULL DEFAULT 'da_usare',
    "nota" TEXT,
    "creato_il" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usato_il" TIMESTAMPTZ(6),

    CONSTRAINT "interscambio_storico_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "interscambio_storico_fonte_check" CHECK ("fonte" IN ('vecchio_crm')),
    CONSTRAINT "interscambio_storico_stato_check" CHECK ("stato" IN ('da_usare', 'usata', 'scartata'))
);

-- Idempotenza degli import: una riga per fonte × coppia di id legacy
CREATE UNIQUE INDEX "interscambio_storico_fonte_cliente_fornitore_key" ON "interscambio_storico"("fonte", "cliente_legacy_id", "fornitore_legacy_id");
CREATE INDEX "interscambio_storico_fornitore_piva_codice_idx" ON "interscambio_storico"("fornitore_piva", "cliente_codice_fornitore");
CREATE INDEX "interscambio_storico_cliente_codice_idx" ON "interscambio_storico"("cliente_codice_fornitore");
CREATE INDEX "interscambio_storico_stato_idx" ON "interscambio_storico"("stato");
CREATE INDEX "interscambio_storico_cliente_piva_norm_idx" ON "interscambio_storico"("cliente_piva_norm");
CREATE INDEX "interscambio_storico_subagente_nome_idx" ON "interscambio_storico"("subagente_nome");

CREATE TABLE "soggetti_storico" (
    "id" BIGSERIAL NOT NULL,
    "legacy_id" BIGINT NOT NULL,
    "ragione_sociale" VARCHAR(255),
    "nome" VARCHAR(100),
    "cognome" VARCHAR(100),
    "piva" VARCHAR(20),
    "piva_norm" VARCHAR(20) NOT NULL DEFAULT '',
    "codice_fiscale" VARCHAR(30),
    "cf_norm" VARCHAR(20) NOT NULL DEFAULT '',
    "indirizzo" VARCHAR(255),
    "cap" VARCHAR(10),
    "citta" VARCHAR(100),
    "provincia" CHAR(2),
    "paese" CHAR(2),
    "email" VARCHAR(200),
    "telefono" VARCHAR(50),
    "sorgente" VARCHAR(20) NOT NULL,
    "creato_il" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "soggetti_storico_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "soggetti_storico_sorgente_check" CHECK ("sorgente" IN ('vecchio_crm'))
);

CREATE UNIQUE INDEX "soggetti_storico_legacy_id_key" ON "soggetti_storico"("legacy_id");
