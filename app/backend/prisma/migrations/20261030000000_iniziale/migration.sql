-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- btree_gist: EXCLUDE con uguaglianza su colonne normali (interscambio, D-35)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- CreateTable
CREATE TABLE "fornitori" (
    "id" BIGSERIAL NOT NULL,
    "ragione_sociale" VARCHAR(255) NOT NULL,
    "piva" VARCHAR(20),
    "codice_integra" VARCHAR(20) NOT NULL,
    "giorni_attesa_conferma" INTEGER NOT NULL DEFAULT 30,
    "giorno_bollettino" SMALLINT NOT NULL DEFAULT 10,
    "tipo_provvigione" VARCHAR(20) NOT NULL DEFAULT 'fatturato',
    "giorni_incasso" SMALLINT NOT NULL DEFAULT 60,
    "note" TEXT,
    "attivo" BOOLEAN NOT NULL DEFAULT true,
    "creato_il" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modificato_il" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sincronizzato_il" TIMESTAMPTZ(6),

    CONSTRAINT "fornitori_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clienti" (
    "id" BIGSERIAL NOT NULL,
    "codice_integra" VARCHAR(20) NOT NULL,
    "piva" VARCHAR(20),
    "ragione_sociale" VARCHAR(255) NOT NULL,
    "indirizzo" VARCHAR(255),
    "cap" VARCHAR(10),
    "citta" VARCHAR(100),
    "provincia" VARCHAR(5),
    "email" VARCHAR(200),
    "attivo" BOOLEAN NOT NULL DEFAULT true,
    "modificato_il" TIMESTAMPTZ(6),
    "sincronizzato_il" TIMESTAMPTZ(6),

    CONSTRAINT "clienti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provvigioni_scaglioni" (
    "id" BIGSERIAL NOT NULL,
    "fornitore_id" BIGINT NOT NULL,
    "sconto_min" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "pct_agente" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "pct_subagente" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "valido_dal" DATE NOT NULL,
    "creato_il" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provvigioni_scaglioni_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provvigioni_eccezioni" (
    "id" BIGSERIAL NOT NULL,
    "scaglione_id" BIGINT NOT NULL,
    "subagente_id" BIGINT NOT NULL,
    "pct_personale" DECIMAL(5,2) NOT NULL,
    "creato_il" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provvigioni_eccezioni_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agenti" (
    "id" BIGSERIAL NOT NULL,
    "codice" VARCHAR(50) NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "cognome" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255),
    "telefono" VARCHAR(50),
    "attivo" BOOLEAN NOT NULL DEFAULT true,
    "creato_il" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agenti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subagenti" (
    "id" BIGSERIAL NOT NULL,
    "agente_id" BIGINT NOT NULL,
    "codice" VARCHAR(50) NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "cognome" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255),
    "attivo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "subagenti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interscambio" (
    "id" BIGSERIAL NOT NULL,
    "subagente_id" BIGINT NOT NULL,
    "cliente_piva" VARCHAR(20) NOT NULL,
    "fornitore_id" BIGINT NOT NULL,
    "codice_cliente_fornitore" VARCHAR(50),
    "sconto" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "pct_subagente" DECIMAL(5,2),
    "regola_mensile" VARCHAR(10),
    "valido_dal" DATE NOT NULL,
    "valido_al" DATE,
    "creato_il" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interscambio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordini_fornitore_testata" (
    "id" BIGSERIAL NOT NULL,
    "fornitore_id" BIGINT NOT NULL,
    "ordine_cliente_id" BIGINT,
    "numero_ordine" VARCHAR(50) NOT NULL,
    "data_ordine" DATE NOT NULL,
    "cliente_piva" VARCHAR(20) NOT NULL,
    "agente_id" BIGINT,
    "importo_merce" DECIMAL(12,2),
    "stato" VARCHAR(20) NOT NULL DEFAULT 'inviato',
    "conferma_data" DATE,
    "conferma_numero" VARCHAR(50),
    "note" TEXT,
    "creato_il" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modificato_il" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ordini_fornitore_testata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordini_fornitore_documenti" (
    "id" BIGSERIAL NOT NULL,
    "testata_id" BIGINT NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,
    "numero" VARCHAR(50) NOT NULL,
    "data" DATE NOT NULL,
    "importo" DECIMAL(12,2) NOT NULL,
    "storno_totale" BOOLEAN NOT NULL DEFAULT false,
    "fattura_id" BIGINT,
    "stato_incasso" VARCHAR(15) NOT NULL DEFAULT 'da_incassare',
    "insoluta_dal" DATE,
    "pagata_il" DATE,
    "fonte_incasso" VARCHAR(20),
    "sollecitata_il" DATE,
    "solleciti" SMALLINT NOT NULL DEFAULT 0,
    "arrivo_id" BIGINT,
    "liquidazione_id" BIGINT,
    "note" TEXT,
    "creato_il" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ordini_fornitore_documenti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provvigioni_correzioni" (
    "id" BIGSERIAL NOT NULL,
    "documento_id" BIGINT NOT NULL,
    "tipo" VARCHAR(10) NOT NULL,
    "valore" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "motivo" TEXT NOT NULL,
    "creato_da" BIGINT,
    "creato_il" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provvigioni_correzioni_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordini_fornitore_righe" (
    "id" BIGSERIAL NOT NULL,
    "testata_id" BIGINT NOT NULL,
    "fase" VARCHAR(20) NOT NULL DEFAULT 'ordine',
    "numero_riga" INTEGER NOT NULL,
    "codice" VARCHAR(100),
    "descrizione" VARCHAR(255),
    "um" VARCHAR(20),
    "quantita" DECIMAL(12,3),
    "prezzo_unitario" DECIMAL(12,4),
    "importo" DECIMAL(12,2),

    CONSTRAINT "ordini_fornitore_righe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bollettini_testata" (
    "id" BIGSERIAL NOT NULL,
    "fornitore_id" BIGINT NOT NULL,
    "mese" INTEGER NOT NULL,
    "anno" INTEGER NOT NULL,
    "stato" VARCHAR(20) NOT NULL DEFAULT 'da_verificare',
    "chiuso_il" TIMESTAMPTZ(6),
    "chiuso_da" BIGINT,
    "note" TEXT,
    "creato_il" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modificato_il" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bollettini_testata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bollettini_righe" (
    "id" BIGSERIAL NOT NULL,
    "testata_id" BIGINT NOT NULL,
    "fattura_numero" VARCHAR(50) NOT NULL,
    "fattura_data" DATE,
    "cliente_piva" VARCHAR(20),
    "importo_merce" DECIMAL(12,2),
    "pct_riconosciuta" DECIMAL(5,2),
    "importo_riconosciuto" DECIMAL(12,2) NOT NULL,
    "pct_calcolata" DECIMAL(5,2),
    "importo_calcolato" DECIMAL(12,2),
    "differenza" DECIMAL(12,2) GENERATED ALWAYS AS ("importo_riconosciuto" - COALESCE("importo_calcolato", 0)) STORED,
    "tipo_riga" VARCHAR(15) NOT NULL DEFAULT 'provvigione',
    "fattura_mese" DATE,
    "documento_id" BIGINT,
    "liquidazione_id" BIGINT,
    "creato_il" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bollettini_righe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liquidazioni" (
    "id" BIGSERIAL NOT NULL,
    "anno" SMALLINT NOT NULL,
    "trimestre" SMALLINT NOT NULL,
    "chiusa_il" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chiusa_da" BIGINT,
    "totali" JSONB NOT NULL,

    CONSTRAINT "liquidazioni_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documenti_in_arrivo" (
    "id" BIGSERIAL NOT NULL,
    "origine" VARCHAR(12) NOT NULL,
    "email_da" TEXT,
    "email_oggetto" TEXT,
    "file_nome" TEXT NOT NULL,
    "file_hash" CHAR(64) NOT NULL,
    "stato" VARCHAR(16) NOT NULL DEFAULT 'in_coda',
    "tentativi" INTEGER NOT NULL DEFAULT 0,
    "errore" TEXT,
    "tipo" VARCHAR(16),
    "fornitore_id" BIGINT,
    "livello" VARCHAR(12),
    "controlli" JSONB,
    "modello" TEXT,
    "ricevuto_il" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "letto_il" TIMESTAMPTZ(6),
    "controllato_il" TIMESTAMPTZ(6),
    "abbinato_pratica_id" BIGINT,
    "abbinato_bollettino_id" BIGINT,
    "utente_id" BIGINT,
    "scartato_il" TIMESTAMPTZ(6),
    "scartato_da" BIGINT,
    "motivo_scarto" VARCHAR(40),
    "nota_scarto" TEXT,

    CONSTRAINT "documenti_in_arrivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documenti_campi" (
    "id" BIGSERIAL NOT NULL,
    "documento_id" BIGINT NOT NULL,
    "campo" TEXT NOT NULL,
    "valore_letto" TEXT,
    "valore_finale" TEXT,
    "affidabilita" DECIMAL(4,3),
    "posizione" JSONB,
    "precisione" VARCHAR(12),
    "verificato" BOOLEAN NOT NULL DEFAULT false,
    "corretto_da" BIGINT,
    "corretto_il" TIMESTAMPTZ(6),

    CONSTRAINT "documenti_campi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utenti" (
    "id" BIGSERIAL NOT NULL,
    "email" VARCHAR(200) NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "ruolo" VARCHAR(15) NOT NULL,
    "accesso" VARCHAR(10) NOT NULL DEFAULT 'microsoft',
    "microsoft_oid" VARCHAR(64),
    "attivo" BOOLEAN NOT NULL DEFAULT true,
    "sistema" BOOLEAN NOT NULL DEFAULT false,
    "invitato_il" TIMESTAMPTZ(6),
    "ultimo_accesso" TIMESTAMPTZ(6),
    "ultimo_invio" JSONB,

    CONSTRAINT "utenti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accessi_link" (
    "id" BIGSERIAL NOT NULL,
    "utente_id" BIGINT NOT NULL,
    "tipo" VARCHAR(10) NOT NULL,
    "impronta" CHAR(64) NOT NULL,
    "scade_il" TIMESTAMPTZ(6) NOT NULL,
    "usato_il" TIMESTAMPTZ(6),
    "ip" VARCHAR(45),

    CONSTRAINT "accessi_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessioni" (
    "sid" VARCHAR NOT NULL,
    "sess" JSONB NOT NULL,
    "expire" TIMESTAMPTZ(6) NOT NULL,
    "utente_id" BIGINT GENERATED ALWAYS AS ((("sess"->>'utente_id'))::bigint) STORED,

    CONSTRAINT "sessioni_pkey" PRIMARY KEY ("sid")
);

-- CreateTable
CREATE TABLE "registro" (
    "id" BIGSERIAL NOT NULL,
    "ts" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "genere" VARCHAR(10) NOT NULL,
    "livello" VARCHAR(10) NOT NULL DEFAULT 'info',
    "codice" VARCHAR(50) NOT NULL,
    "tipo" VARCHAR(30),
    "azione" VARCHAR(30),
    "servizio" VARCHAR(15),
    "entita" VARCHAR(50),
    "entita_id" BIGINT,
    "esito" VARCHAR(10),
    "messaggio" VARCHAR(300),
    "dettaglio" JSONB,
    "utente_id" BIGINT,
    "operazione_id" UUID,
    "sessione_id" VARCHAR(100),
    "ip" VARCHAR(45),
    "chiave" VARCHAR(120),
    "volte" INTEGER NOT NULL DEFAULT 1,
    "ultimo" TIMESTAMPTZ(6),
    "stato" VARCHAR(10),
    "visto_il" TIMESTAMPTZ(6),
    "visto_da" BIGINT,
    "chiusa_il" TIMESTAMPTZ(6),

    CONSTRAINT "registro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "impostazioni" (
    "chiave" VARCHAR(20) NOT NULL,
    "valore" JSONB NOT NULL,
    "aggiornato_il" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aggiornato_da" BIGINT,

    CONSTRAINT "impostazioni_pkey" PRIMARY KEY ("chiave")
);

-- CreateTable
CREATE TABLE "servizi_esecuzioni" (
    "id" BIGSERIAL NOT NULL,
    "servizio" VARCHAR(15) NOT NULL,
    "tipo" VARCHAR(10) NOT NULL,
    "inizio" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fine" TIMESTAMPTZ(6),
    "esito" VARCHAR(10),
    "testo" VARCHAR(300),
    "misure" JSONB,
    "avviato_da" BIGINT,

    CONSTRAINT "servizi_esecuzioni_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fornitori_piva_key" ON "fornitori"("piva");

-- CreateIndex
CREATE UNIQUE INDEX "fornitori_codice_integra_key" ON "fornitori"("codice_integra");

-- CreateIndex
CREATE UNIQUE INDEX "clienti_codice_integra_key" ON "clienti"("codice_integra");

-- CreateIndex
CREATE INDEX "clienti_piva_idx" ON "clienti"("piva");

-- CreateIndex
CREATE UNIQUE INDEX "provvigioni_scaglioni_fornitore_id_sconto_min_valido_dal_key" ON "provvigioni_scaglioni"("fornitore_id", "sconto_min", "valido_dal");

-- CreateIndex
CREATE UNIQUE INDEX "provvigioni_eccezioni_scaglione_id_subagente_id_key" ON "provvigioni_eccezioni"("scaglione_id", "subagente_id");

-- CreateIndex
CREATE UNIQUE INDEX "agenti_codice_key" ON "agenti"("codice");

-- CreateIndex
CREATE UNIQUE INDEX "subagenti_codice_key" ON "subagenti"("codice");

-- CreateIndex
CREATE INDEX "interscambio_subagente_id_idx" ON "interscambio"("subagente_id");

-- CreateIndex
CREATE INDEX "interscambio_fornitore_id_codice_cliente_fornitore_idx" ON "interscambio"("fornitore_id", "codice_cliente_fornitore");

-- CreateIndex
CREATE INDEX "ordini_fornitore_testata_fornitore_id_stato_idx" ON "ordini_fornitore_testata"("fornitore_id", "stato");

-- CreateIndex
CREATE INDEX "ordini_fornitore_testata_cliente_piva_idx" ON "ordini_fornitore_testata"("cliente_piva");

-- CreateIndex
CREATE INDEX "ordini_fornitore_documenti_numero_tipo_idx" ON "ordini_fornitore_documenti"("numero", "tipo");

-- CreateIndex
CREATE INDEX "ordini_fornitore_documenti_testata_id_idx" ON "ordini_fornitore_documenti"("testata_id");

-- CreateIndex
CREATE INDEX "ordini_fornitore_documenti_fattura_id_idx" ON "ordini_fornitore_documenti"("fattura_id");

-- CreateIndex
CREATE INDEX "ordini_fornitore_documenti_liquidazione_id_idx" ON "ordini_fornitore_documenti"("liquidazione_id");

-- CreateIndex
CREATE INDEX "ordini_fornitore_documenti_arrivo_id_idx" ON "ordini_fornitore_documenti"("arrivo_id");

-- CreateIndex
CREATE UNIQUE INDEX "provvigioni_correzioni_documento_id_key" ON "provvigioni_correzioni"("documento_id");

-- CreateIndex
CREATE UNIQUE INDEX "ordini_fornitore_righe_testata_id_fase_numero_riga_key" ON "ordini_fornitore_righe"("testata_id", "fase", "numero_riga");

-- CreateIndex
CREATE UNIQUE INDEX "bollettini_testata_fornitore_id_mese_anno_key" ON "bollettini_testata"("fornitore_id", "mese", "anno");

-- CreateIndex
CREATE INDEX "bollettini_righe_fattura_numero_idx" ON "bollettini_righe"("fattura_numero");

-- CreateIndex
CREATE INDEX "bollettini_righe_testata_id_idx" ON "bollettini_righe"("testata_id");

-- CreateIndex
CREATE INDEX "bollettini_righe_documento_id_idx" ON "bollettini_righe"("documento_id");

-- CreateIndex
CREATE INDEX "bollettini_righe_liquidazione_id_idx" ON "bollettini_righe"("liquidazione_id");

-- CreateIndex
CREATE UNIQUE INDEX "liquidazioni_anno_trimestre_key" ON "liquidazioni"("anno", "trimestre");

-- CreateIndex
CREATE UNIQUE INDEX "documenti_in_arrivo_file_hash_key" ON "documenti_in_arrivo"("file_hash");

-- CreateIndex
CREATE INDEX "documenti_in_arrivo_stato_idx" ON "documenti_in_arrivo"("stato");

-- CreateIndex
CREATE INDEX "documenti_in_arrivo_fornitore_id_idx" ON "documenti_in_arrivo"("fornitore_id");

-- CreateIndex
CREATE INDEX "documenti_in_arrivo_abbinato_pratica_id_idx" ON "documenti_in_arrivo"("abbinato_pratica_id");

-- CreateIndex
CREATE INDEX "documenti_in_arrivo_abbinato_bollettino_id_idx" ON "documenti_in_arrivo"("abbinato_bollettino_id");

-- CreateIndex
CREATE INDEX "documenti_campi_documento_id_idx" ON "documenti_campi"("documento_id");

-- CreateIndex
CREATE UNIQUE INDEX "utenti_email_key" ON "utenti"("email");

-- CreateIndex
CREATE UNIQUE INDEX "utenti_microsoft_oid_key" ON "utenti"("microsoft_oid");

-- CreateIndex
CREATE UNIQUE INDEX "accessi_link_impronta_key" ON "accessi_link"("impronta");

-- CreateIndex
CREATE INDEX "accessi_link_utente_id_idx" ON "accessi_link"("utente_id");

-- CreateIndex
CREATE INDEX "sessioni_expire_idx" ON "sessioni"("expire");

-- CreateIndex
CREATE INDEX "sessioni_utente_id_idx" ON "sessioni"("utente_id");

-- CreateIndex
CREATE INDEX "registro_ts_idx" ON "registro"("ts" DESC);

-- CreateIndex
CREATE INDEX "registro_genere_livello_ts_idx" ON "registro"("genere", "livello", "ts");

-- CreateIndex
CREATE INDEX "registro_codice_ts_idx" ON "registro"("codice", "ts");

-- CreateIndex
CREATE INDEX "registro_entita_entita_id_idx" ON "registro"("entita", "entita_id");

-- CreateIndex
CREATE INDEX "registro_utente_id_ts_idx" ON "registro"("utente_id", "ts");

-- CreateIndex
CREATE INDEX "registro_operazione_id_idx" ON "registro"("operazione_id");

-- CreateIndex
CREATE INDEX "registro_dettaglio_idx" ON "registro" USING GIN ("dettaglio" jsonb_path_ops);

-- CreateIndex
CREATE INDEX "registro_visto_da_idx" ON "registro"("visto_da");

-- CreateIndex
CREATE INDEX "servizi_esecuzioni_servizio_inizio_idx" ON "servizi_esecuzioni"("servizio", "inizio" DESC);

-- AddForeignKey
ALTER TABLE "provvigioni_scaglioni" ADD CONSTRAINT "provvigioni_scaglioni_fornitore_id_fkey" FOREIGN KEY ("fornitore_id") REFERENCES "fornitori"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provvigioni_eccezioni" ADD CONSTRAINT "provvigioni_eccezioni_scaglione_id_fkey" FOREIGN KEY ("scaglione_id") REFERENCES "provvigioni_scaglioni"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provvigioni_eccezioni" ADD CONSTRAINT "provvigioni_eccezioni_subagente_id_fkey" FOREIGN KEY ("subagente_id") REFERENCES "subagenti"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subagenti" ADD CONSTRAINT "subagenti_agente_id_fkey" FOREIGN KEY ("agente_id") REFERENCES "agenti"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interscambio" ADD CONSTRAINT "interscambio_subagente_id_fkey" FOREIGN KEY ("subagente_id") REFERENCES "subagenti"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interscambio" ADD CONSTRAINT "interscambio_fornitore_id_fkey" FOREIGN KEY ("fornitore_id") REFERENCES "fornitori"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordini_fornitore_testata" ADD CONSTRAINT "ordini_fornitore_testata_fornitore_id_fkey" FOREIGN KEY ("fornitore_id") REFERENCES "fornitori"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordini_fornitore_testata" ADD CONSTRAINT "ordini_fornitore_testata_agente_id_fkey" FOREIGN KEY ("agente_id") REFERENCES "agenti"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordini_fornitore_documenti" ADD CONSTRAINT "ordini_fornitore_documenti_fattura_id_fkey" FOREIGN KEY ("fattura_id") REFERENCES "ordini_fornitore_documenti"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordini_fornitore_documenti" ADD CONSTRAINT "ordini_fornitore_documenti_arrivo_id_fkey" FOREIGN KEY ("arrivo_id") REFERENCES "documenti_in_arrivo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordini_fornitore_documenti" ADD CONSTRAINT "ordini_fornitore_documenti_liquidazione_id_fkey" FOREIGN KEY ("liquidazione_id") REFERENCES "liquidazioni"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordini_fornitore_documenti" ADD CONSTRAINT "ordini_fornitore_documenti_testata_id_fkey" FOREIGN KEY ("testata_id") REFERENCES "ordini_fornitore_testata"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provvigioni_correzioni" ADD CONSTRAINT "provvigioni_correzioni_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "ordini_fornitore_documenti"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provvigioni_correzioni" ADD CONSTRAINT "provvigioni_correzioni_creato_da_fkey" FOREIGN KEY ("creato_da") REFERENCES "utenti"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordini_fornitore_righe" ADD CONSTRAINT "ordini_fornitore_righe_testata_id_fkey" FOREIGN KEY ("testata_id") REFERENCES "ordini_fornitore_testata"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bollettini_testata" ADD CONSTRAINT "bollettini_testata_chiuso_da_fkey" FOREIGN KEY ("chiuso_da") REFERENCES "utenti"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bollettini_testata" ADD CONSTRAINT "bollettini_testata_fornitore_id_fkey" FOREIGN KEY ("fornitore_id") REFERENCES "fornitori"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bollettini_righe" ADD CONSTRAINT "bollettini_righe_testata_id_fkey" FOREIGN KEY ("testata_id") REFERENCES "bollettini_testata"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bollettini_righe" ADD CONSTRAINT "bollettini_righe_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "ordini_fornitore_documenti"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bollettini_righe" ADD CONSTRAINT "bollettini_righe_liquidazione_id_fkey" FOREIGN KEY ("liquidazione_id") REFERENCES "liquidazioni"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidazioni" ADD CONSTRAINT "liquidazioni_chiusa_da_fkey" FOREIGN KEY ("chiusa_da") REFERENCES "utenti"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documenti_in_arrivo" ADD CONSTRAINT "documenti_in_arrivo_fornitore_id_fkey" FOREIGN KEY ("fornitore_id") REFERENCES "fornitori"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documenti_in_arrivo" ADD CONSTRAINT "documenti_in_arrivo_abbinato_pratica_id_fkey" FOREIGN KEY ("abbinato_pratica_id") REFERENCES "ordini_fornitore_testata"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documenti_in_arrivo" ADD CONSTRAINT "documenti_in_arrivo_abbinato_bollettino_id_fkey" FOREIGN KEY ("abbinato_bollettino_id") REFERENCES "bollettini_testata"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documenti_in_arrivo" ADD CONSTRAINT "documenti_in_arrivo_utente_id_fkey" FOREIGN KEY ("utente_id") REFERENCES "utenti"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documenti_in_arrivo" ADD CONSTRAINT "documenti_in_arrivo_scartato_da_fkey" FOREIGN KEY ("scartato_da") REFERENCES "utenti"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documenti_campi" ADD CONSTRAINT "documenti_campi_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "documenti_in_arrivo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documenti_campi" ADD CONSTRAINT "documenti_campi_corretto_da_fkey" FOREIGN KEY ("corretto_da") REFERENCES "utenti"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accessi_link" ADD CONSTRAINT "accessi_link_utente_id_fkey" FOREIGN KEY ("utente_id") REFERENCES "utenti"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro" ADD CONSTRAINT "registro_utente_id_fkey" FOREIGN KEY ("utente_id") REFERENCES "utenti"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro" ADD CONSTRAINT "registro_visto_da_fkey" FOREIGN KEY ("visto_da") REFERENCES "utenti"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impostazioni" ADD CONSTRAINT "impostazioni_aggiornato_da_fkey" FOREIGN KEY ("aggiornato_da") REFERENCES "utenti"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servizi_esecuzioni" ADD CONSTRAINT "servizi_esecuzioni_avviato_da_fkey" FOREIGN KEY ("avviato_da") REFERENCES "utenti"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Vincoli che Prisma non esprime (spec §4.2, D-33…D-35). Prisma non li vede: non toglierli.
-- Le prove stanno in test/vincoli.spec.ts (npm test).
-- ---------------------------------------------------------------------------

-- Valori ammessi
ALTER TABLE "fornitori" ADD CONSTRAINT "fornitori_giorno_bollettino_check" CHECK ("giorno_bollettino" BETWEEN 1 AND 28);
ALTER TABLE "fornitori" ADD CONSTRAINT "fornitori_tipo_provvigione_check" CHECK ("tipo_provvigione" IN ('maturato', 'fatturato'));
ALTER TABLE "provvigioni_scaglioni" ADD CONSTRAINT "provvigioni_scaglioni_pct_check" CHECK ("sconto_min" BETWEEN 0 AND 100 AND "pct_agente" BETWEEN 0 AND 100 AND "pct_subagente" BETWEEN 0 AND 100);
ALTER TABLE "provvigioni_eccezioni" ADD CONSTRAINT "provvigioni_eccezioni_pct_check" CHECK ("pct_personale" BETWEEN 0 AND 100);
ALTER TABLE "interscambio" ADD CONSTRAINT "interscambio_regola_mensile_check" CHECK ("regola_mensile" IS NULL OR "regola_mensile" IN ('prima', 'piu_alta'));
ALTER TABLE "interscambio" ADD CONSTRAINT "interscambio_sconto_check" CHECK ("sconto" BETWEEN 0 AND 100);
ALTER TABLE "interscambio" ADD CONSTRAINT "interscambio_pct_subagente_check" CHECK ("pct_subagente" IS NULL OR "pct_subagente" BETWEEN 0 AND 100);
ALTER TABLE "interscambio" ADD CONSTRAINT "interscambio_periodo_check" CHECK ("valido_al" IS NULL OR "valido_al" > "valido_dal");
ALTER TABLE "ordini_fornitore_testata" ADD CONSTRAINT "ordini_fornitore_testata_stato_check" CHECK ("stato" IN ('inviato', 'confermato', 'fatturato'));
ALTER TABLE "ordini_fornitore_documenti" ADD CONSTRAINT "ordini_fornitore_documenti_tipo_check" CHECK ("tipo" IN ('fattura', 'nota_credito'));
ALTER TABLE "ordini_fornitore_documenti" ADD CONSTRAINT "ordini_fornitore_documenti_stato_incasso_check" CHECK ("stato_incasso" IN ('da_incassare', 'pagata', 'insoluta'));
ALTER TABLE "ordini_fornitore_documenti" ADD CONSTRAINT "ordini_fornitore_documenti_fattura_id_check" CHECK ("fattura_id" IS NULL OR "tipo" = 'nota_credito');
ALTER TABLE "provvigioni_correzioni" ADD CONSTRAINT "provvigioni_correzioni_tipo_check" CHECK ("tipo" IN ('pct', 'nessuna', 'importo'));
ALTER TABLE "provvigioni_correzioni" ADD CONSTRAINT "provvigioni_correzioni_motivo_check" CHECK (length(trim("motivo")) > 0);
ALTER TABLE "ordini_fornitore_righe" ADD CONSTRAINT "ordini_fornitore_righe_fase_check" CHECK ("fase" IN ('ordine', 'conferma', 'fattura'));
ALTER TABLE "bollettini_testata" ADD CONSTRAINT "bollettini_testata_mese_check" CHECK ("mese" BETWEEN 1 AND 12);
ALTER TABLE "bollettini_testata" ADD CONSTRAINT "bollettini_testata_stato_check" CHECK ("stato" IN ('da_verificare', 'verificato', 'contestato'));
-- chiuso_il decide il trimestre di storni e riaccrediti (D-11, D-35)
ALTER TABLE "bollettini_testata" ADD CONSTRAINT "bollettini_testata_chiuso_check" CHECK (("stato" = 'da_verificare') = ("chiuso_il" IS NULL));
ALTER TABLE "bollettini_righe" ADD CONSTRAINT "bollettini_righe_tipo_riga_check" CHECK ("tipo_riga" IN ('provvigione', 'storno', 'riaccredito'));
ALTER TABLE "bollettini_righe" ADD CONSTRAINT "bollettini_righe_liquidazione_check" CHECK ("liquidazione_id" IS NULL OR "tipo_riga" IN ('storno', 'riaccredito'));
ALTER TABLE "liquidazioni" ADD CONSTRAINT "liquidazioni_trimestre_check" CHECK ("trimestre" BETWEEN 1 AND 4);
ALTER TABLE "utenti" ADD CONSTRAINT "utenti_ruolo_check" CHECK ("ruolo" IN ('amministratore', 'operatore', 'lettura'));
ALTER TABLE "utenti" ADD CONSTRAINT "utenti_accesso_check" CHECK ("accesso" IN ('microsoft', 'email'));
ALTER TABLE "utenti" ADD CONSTRAINT "utenti_email_minuscolo_check" CHECK ("email" = lower("email"));
ALTER TABLE "accessi_link" ADD CONSTRAINT "accessi_link_tipo_check" CHECK ("tipo" IN ('invito', 'link'));
ALTER TABLE "registro" ADD CONSTRAINT "registro_genere_check" CHECK ("genere" IN ('evento', 'anomalia'));

-- Interscambio datato: un solo subagente per cliente × fornitore in ogni giorno (§5.10),
-- e il codice del fornitore indica un solo cliente in ogni giorno (§4.4, D-35)
ALTER TABLE "interscambio" ADD CONSTRAINT "interscambio_cliente_periodo_excl" EXCLUDE USING gist
  ("cliente_piva" WITH =, "fornitore_id" WITH =, daterange("valido_dal", "valido_al") WITH &&);
ALTER TABLE "interscambio" ADD CONSTRAINT "interscambio_codice_periodo_excl" EXCLUDE USING gist
  ("fornitore_id" WITH =, "codice_cliente_fornitore" WITH =, daterange("valido_dal", "valido_al") WITH &&);

-- Una sola anomalia aperta per causa, anche senza servizio (§4.2.11, D-31)
CREATE UNIQUE INDEX "registro_anomalia_aperta_key" ON "registro" (COALESCE("servizio", ''), "codice", COALESCE("chiave", ''))
  WHERE "genere" = 'anomalia' AND "stato" = 'aperta';

-- Registro: gli eventi non si modificano e non si cancellano (§15.1). Eccezioni:
-- * la pulizia notturna (§15.7) cancella dopo SET LOCAL decobrands.pulizia_registro = 'si';
-- * eliminare un utente mette a NULL utente_id / visto_da (il nome resta in dettaglio.etichetta).
CREATE FUNCTION registro_eventi_immutabili() RETURNS trigger AS $$
BEGIN
  IF OLD."genere" <> 'evento' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF TG_OP = 'DELETE' THEN
    IF current_setting('decobrands.pulizia_registro', true) = 'si' THEN
      RETURN OLD;
    END IF;
  ELSIF (to_jsonb(NEW) - 'utente_id' - 'visto_da') = (to_jsonb(OLD) - 'utente_id' - 'visto_da')
        AND (NEW."utente_id" IS NOT DISTINCT FROM OLD."utente_id" OR NEW."utente_id" IS NULL)
        AND (NEW."visto_da" IS NOT DISTINCT FROM OLD."visto_da" OR NEW."visto_da" IS NULL) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'registro: gli eventi non si modificano né si cancellano (§15.1)';
END $$ LANGUAGE plpgsql;
CREATE TRIGGER "registro_eventi_immutabili" BEFORE UPDATE OR DELETE ON "registro"
  FOR EACH ROW EXECUTE FUNCTION registro_eventi_immutabili();
