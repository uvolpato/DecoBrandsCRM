-- D-164 §19: vocabolario imparato dal riconoscimento. Quando l'operatore sceglie a mano un fornitore
-- o un cliente per un documento, il server salva nome letto normalizzato -> ruolo scelto; i documenti
-- successivi con lo stesso nome letto si riconoscono subito, senza passare dalla somiglianza.

CREATE TABLE "alias_letti" (
    "id" BIGSERIAL NOT NULL,
    "tipo" VARCHAR(12) NOT NULL,
    "nome_normalizzato" VARCHAR(255) NOT NULL,
    "nome_letto" VARCHAR(255) NOT NULL,
    "ruolo_id" BIGINT NOT NULL,
    "creato_da" BIGINT,
    "creato_il" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "alias_letti_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "alias_letti_tipo_check" CHECK ("tipo" IN ('fornitore', 'cliente'))
);

CREATE UNIQUE INDEX "alias_letti_tipo_nome_normalizzato_key" ON "alias_letti"("tipo", "nome_normalizzato");
