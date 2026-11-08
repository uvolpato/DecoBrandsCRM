-- Anagrafica unica a soggetti (D-100, D-101, D-102; specifica-anagrafica-soggetti.md §4–§6).
-- Additiva: le tabelle dello strato 0 restano e continuano a essere quelle che il codice usa.
-- Solo CREATE TABLE, ADD COLUMN e indici nuovi: nessun DROP di tabelle o colonne, nessuna
-- rinomina e nessuna vista al posto di una tabella (§0). I ruoli si collegano con soggetto_id
-- nullable e UNIQUE: un soggetto può essere cliente e fornitore (D-101).
-- Le istruzioni che Prisma non esprime (indici parziali, CHECK, sequenza del codice) stanno qui.

-- ---------- Codice progressivo del soggetto (C000123): quello che si cita al telefono ----------
CREATE SEQUENCE "soggetti_codice_seq";

CREATE TABLE "soggetti" (
    "id" BIGSERIAL NOT NULL,
    "codice" VARCHAR(20) NOT NULL DEFAULT ('C' || lpad(nextval('soggetti_codice_seq')::text, 6, '0')),
    "natura" VARCHAR(10) NOT NULL,
    "paese" CHAR(2) NOT NULL DEFAULT 'IT',
    "piva" VARCHAR(30),
    "piva_norm" VARCHAR(20) NOT NULL DEFAULT '',
    "codice_fiscale" VARCHAR(30),
    "cf_norm" VARCHAR(20) NOT NULL DEFAULT '',
    "sorgente" VARCHAR(20) NOT NULL DEFAULT 'crm',
    "attivo" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "creato_il" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modificato_il" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modificato_in_origine_il" TIMESTAMPTZ(6),
    "sincronizzato_il" TIMESTAMPTZ(6),
    CONSTRAINT "soggetti_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "soggetti_codice_key" UNIQUE ("codice"),
    CONSTRAINT "soggetti_natura_check" CHECK ("natura" IN ('azienda', 'persona')),
    CONSTRAINT "soggetti_sorgente_check" CHECK ("sorgente" IN ('integra', 'vecchio_crm', 'crm')),
    -- una P.IVA corta (9–10 cifre) non entra: va in scarto, non si inventa (§7.4)
    CONSTRAINT "soggetti_piva_norm_check" CHECK ("piva_norm" = '' OR "piva_norm" ~ '^[0-9]{11}$' OR "piva_norm" ~ '^[A-Z]{2}[A-Z0-9]{2,}$')
);
-- Unicità sul master: P.IVA per paese, CF solo dove la P.IVA manca (D-101, §4.1)
CREATE UNIQUE INDEX "soggetti_piva_norm_key" ON "soggetti"("paese", "piva_norm") WHERE "piva_norm" <> '';
CREATE UNIQUE INDEX "soggetti_cf_norm_key" ON "soggetti"("paese", "cf_norm") WHERE "piva_norm" = '' AND "cf_norm" <> '';
CREATE INDEX "soggetti_piva_norm_idx" ON "soggetti"("piva_norm");
CREATE INDEX "soggetti_cf_norm_idx" ON "soggetti"("cf_norm");

-- ---------- Tabelle di riferimento delle sedi (§4.8) ----------
CREATE TABLE "gruppi" (
    "id" BIGSERIAL NOT NULL,
    "codice" VARCHAR(50) NOT NULL,
    "descrizione" VARCHAR(255) NOT NULL,
    "attivo" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "gruppi_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "gruppi_codice_key" ON "gruppi"("codice");

CREATE TABLE "settori" (
    "id" BIGSERIAL NOT NULL,
    "codice" VARCHAR(50) NOT NULL,
    "descrizione" VARCHAR(255) NOT NULL,
    "attivo" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "settori_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "settori_codice_key" ON "settori"("codice");

-- ---------- Sedi (§4.2) ----------
CREATE TABLE "sedi" (
    "id" BIGSERIAL NOT NULL,
    "soggetto_id" BIGINT NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,
    "insegna" VARCHAR(255),
    "indirizzo" VARCHAR(255),
    "cap" VARCHAR(10),
    "citta" VARCHAR(100),
    "provincia" CHAR(2),
    "paese" CHAR(2) NOT NULL DEFAULT 'IT',
    "settore_id" BIGINT,
    "gruppo_id" BIGINT,
    "predefinita" BOOLEAN NOT NULL DEFAULT false,
    "attivo" BOOLEAN NOT NULL DEFAULT true,
    "valido_dal" DATE,
    "valido_al" DATE,
    CONSTRAINT "sedi_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sedi_tipo_check" CHECK ("tipo" IN ('legale', 'operativa', 'punto_vendita', 'magazzino', 'fatturazione'))
);
-- una sola predefinita per tipo: è quella che l'export verso Integra porta
CREATE UNIQUE INDEX "sedi_predefinita_key" ON "sedi"("soggetto_id", "tipo") WHERE "predefinita";
CREATE INDEX "sedi_soggetto_id_idx" ON "sedi"("soggetto_id");
CREATE INDEX "sedi_citta_provincia_idx" ON "sedi"("citta", "provincia");

ALTER TABLE "sedi" ADD CONSTRAINT "sedi_soggetto_id_fkey" FOREIGN KEY ("soggetto_id") REFERENCES "soggetti"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sedi" ADD CONSTRAINT "sedi_settore_id_fkey" FOREIGN KEY ("settore_id") REFERENCES "settori"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sedi" ADD CONSTRAINT "sedi_gruppo_id_fkey" FOREIGN KEY ("gruppo_id") REFERENCES "gruppi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------- Persone e contatti (§4.4) ----------
CREATE TABLE "persone" (
    "id" BIGSERIAL NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "cognome" VARCHAR(100) NOT NULL,
    "titolo" VARCHAR(100),
    "note" TEXT,
    "attivo" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "persone_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "persone_contatti" (
    "id" BIGSERIAL NOT NULL,
    "persona_id" BIGINT NOT NULL,
    "soggetto_id" BIGINT NOT NULL,
    "sede_id" BIGINT,
    "ruolo" VARCHAR(20),
    "referente" BOOLEAN NOT NULL DEFAULT false,
    "valido_dal" DATE,
    "valido_al" DATE,
    CONSTRAINT "persone_contatti_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "persone_contatti_ruolo_check" CHECK ("ruolo" IS NULL OR "ruolo" IN ('titolare', 'acquisti', 'amministrazione', 'magazzino', 'referente'))
);
-- la stessa persona può essere referente di più aziende: un legame per soggetto (e per sede)
CREATE UNIQUE INDEX "persone_contatti_persona_soggetto_key" ON "persone_contatti"("persona_id", "soggetto_id") WHERE "sede_id" IS NULL;
CREATE UNIQUE INDEX "persone_contatti_persona_soggetto_sede_key" ON "persone_contatti"("persona_id", "soggetto_id", "sede_id") WHERE "sede_id" IS NOT NULL;
CREATE INDEX "persone_contatti_persona_id_soggetto_id_idx" ON "persone_contatti"("persona_id", "soggetto_id");

ALTER TABLE "persone_contatti" ADD CONSTRAINT "persone_contatti_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "persone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "persone_contatti" ADD CONSTRAINT "persone_contatti_soggetto_id_fkey" FOREIGN KEY ("soggetto_id") REFERENCES "soggetti"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "persone_contatti" ADD CONSTRAINT "persone_contatti_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sedi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------- Recapiti (§4.3): del soggetto, di una sua sede o di una persona, uno solo ----------
CREATE TABLE "recapiti" (
    "id" BIGSERIAL NOT NULL,
    "soggetto_id" BIGINT,
    "sede_id" BIGINT,
    "persona_id" BIGINT,
    "tipo" VARCHAR(20) NOT NULL,
    "valore" VARCHAR(255) NOT NULL,
    "etichetta" VARCHAR(30),
    "predefinito" BOOLEAN NOT NULL DEFAULT false,
    "valido_dal" DATE,
    "valido_al" DATE,
    CONSTRAINT "recapiti_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "recapiti_collegamento_check" CHECK (num_nonnulls("soggetto_id", "sede_id", "persona_id") = 1),
    CONSTRAINT "recapiti_tipo_check" CHECK ("tipo" IN ('email', 'pec', 'telefono', 'cellulare', 'fax', 'sito'))
);
CREATE UNIQUE INDEX "recapiti_soggetto_tipo_valore_key" ON "recapiti"("soggetto_id", "tipo", "valore") WHERE "soggetto_id" IS NOT NULL;
CREATE UNIQUE INDEX "recapiti_sede_tipo_valore_key" ON "recapiti"("sede_id", "tipo", "valore") WHERE "sede_id" IS NOT NULL;
CREATE INDEX "recapiti_soggetto_id_idx" ON "recapiti"("soggetto_id");
CREATE INDEX "recapiti_sede_id_idx" ON "recapiti"("sede_id");

ALTER TABLE "recapiti" ADD CONSTRAINT "recapiti_soggetto_id_fkey" FOREIGN KEY ("soggetto_id") REFERENCES "soggetti"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recapiti" ADD CONSTRAINT "recapiti_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sedi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recapiti" ADD CONSTRAINT "recapiti_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "persone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------- Fatturazione elettronica (§4.5): del soggetto fiscale, 1:1 ----------
CREATE TABLE "fatturazione" (
    "soggetto_id" BIGINT NOT NULL,
    "codice_destinatario" CHAR(7),
    "pec_destinatario" VARCHAR(255),
    "codice_univoco_ufficio" CHAR(6),
    "id_paese_estero" CHAR(2),
    "id_codice_estero" VARCHAR(28),
    "regime_fiscale" CHAR(4),
    "split_payment" BOOLEAN NOT NULL DEFAULT false,
    "reverse_charge" BOOLEAN NOT NULL DEFAULT false,
    "esigibilita_iva" CHAR(1),
    "attiva" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    CONSTRAINT "fatturazione_pkey" PRIMARY KEY ("soggetto_id"),
    CONSTRAINT "fatturazione_codice_destinatario_check" CHECK ("codice_destinatario" IS NULL OR "codice_destinatario" ~ '^[A-Z0-9]{7}$'),
    -- 0000000 si ripete per tutti gli esteri: vale solo con l'identificativo estero
    CONSTRAINT "fatturazione_estero_check" CHECK ("codice_destinatario" <> '0000000' OR "id_codice_estero" IS NOT NULL),
    -- configurata vuol dire che la fattura può arrivare
    CONSTRAINT "fatturazione_attiva_check" CHECK (NOT "attiva" OR num_nonnulls(NULLIF("codice_destinatario", ''), NULLIF("pec_destinatario", ''), NULLIF("codice_univoco_ufficio", ''), NULLIF("id_codice_estero", '')) > 0),
    CONSTRAINT "fatturazione_esigibilita_check" CHECK ("esigibilita_iva" IS NULL OR "esigibilita_iva" IN ('I', 'D', 'S'))
);
ALTER TABLE "fatturazione" ADD CONSTRAINT "fatturazione_soggetto_id_fkey" FOREIGN KEY ("soggetto_id") REFERENCES "soggetti"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------- Sconti per legame (§4.6): solo tabella, la regola canonica è aperta (§8.2) ----------
CREATE TABLE "sconti" (
    "id" BIGSERIAL NOT NULL,
    "interscambio_id" BIGINT NOT NULL,
    "ordine" SMALLINT NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,
    "percentuale" NUMERIC(5,2) NOT NULL,
    "valido_dal" DATE,
    "valido_al" DATE,
    "note" TEXT,
    CONSTRAINT "sconti_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sconti_tipo_check" CHECK ("tipo" IN ('commerciale', 'promozionale', 'speciale')),
    CONSTRAINT "sconti_percentuale_check" CHECK ("percentuale" >= 0 AND "percentuale" <= 100)
);
CREATE UNIQUE INDEX "sconti_interscambio_id_ordine_valido_dal_key" ON "sconti"("interscambio_id", "ordine", "valido_dal");
ALTER TABLE "sconti" ADD CONSTRAINT "sconti_interscambio_id_fkey" FOREIGN KEY ("interscambio_id") REFERENCES "interscambio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------- Audit per campo (§4.7) ----------
CREATE TABLE "modifiche" (
    "id" BIGSERIAL NOT NULL,
    "entita" VARCHAR(40) NOT NULL,
    "entita_id" BIGINT NOT NULL,
    "campo" VARCHAR(60) NOT NULL,
    "valore_prima" TEXT,
    "valore_dopo" TEXT,
    "utente_id" BIGINT,
    "quando" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "modifiche_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "modifiche_entita_entita_id_idx" ON "modifiche"("entita", "entita_id");
ALTER TABLE "modifiche" ADD CONSTRAINT "modifiche_utente_id_fkey" FOREIGN KEY ("utente_id") REFERENCES "utenti"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------- Collegamenti allo strato 0 (§5): solo colonne nullable, nessuna FK toccata ----------
ALTER TABLE "clienti" ADD COLUMN "soggetto_id" BIGINT;
CREATE UNIQUE INDEX "clienti_soggetto_id_key" ON "clienti"("soggetto_id");
ALTER TABLE "clienti" ADD CONSTRAINT "clienti_soggetto_id_fkey" FOREIGN KEY ("soggetto_id") REFERENCES "soggetti"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "fornitori" ADD COLUMN "soggetto_id" BIGINT;
CREATE UNIQUE INDEX "fornitori_soggetto_id_key" ON "fornitori"("soggetto_id");
ALTER TABLE "fornitori" ADD CONSTRAINT "fornitori_soggetto_id_fkey" FOREIGN KEY ("soggetto_id") REFERENCES "soggetti"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "agenti" ADD COLUMN "soggetto_id" BIGINT;
CREATE UNIQUE INDEX "agenti_soggetto_id_key" ON "agenti"("soggetto_id");
ALTER TABLE "agenti" ADD CONSTRAINT "agenti_soggetto_id_fkey" FOREIGN KEY ("soggetto_id") REFERENCES "soggetti"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "subagenti" ADD COLUMN "soggetto_id" BIGINT;
CREATE UNIQUE INDEX "subagenti_soggetto_id_key" ON "subagenti"("soggetto_id");
ALTER TABLE "subagenti" ADD CONSTRAINT "subagenti_soggetto_id_fkey" FOREIGN KEY ("soggetto_id") REFERENCES "soggetti"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------- Codici esterni (§5.4): etichetta e più valori ammessi, entita_id resta senza FK ----------
ALTER TABLE "codici_esterni" ADD COLUMN "etichetta" VARCHAR(50);
ALTER TABLE "codici_esterni" DROP CONSTRAINT "codici_esterni_sistema_check";
ALTER TABLE "codici_esterni" ADD CONSTRAINT "codici_esterni_sistema_check" CHECK ("sistema" IN ('integra', 'vecchio_crm'));
ALTER TABLE "codici_esterni" DROP CONSTRAINT "codici_esterni_tipo_check";
ALTER TABLE "codici_esterni" ADD CONSTRAINT "codici_esterni_tipo_check" CHECK ("tipo" IN ('cliente', 'fornitore', 'subagente', 'soggetto', 'sede', 'interscambio'));
