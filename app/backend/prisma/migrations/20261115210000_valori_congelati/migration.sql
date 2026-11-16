-- D-183 §19: spese nella base della provvigione e valori calcolati congelati sul documento.
-- 1. Parametro sul fornitore: le spese in fattura (trasporto, imballo, «Fracht») di norma non entrano
--    nella base della provvigione, ma dipende dall'accordo col fornitore. Predefinito no (escluse).
-- 2. Ogni documento fiscale salva i valori calcolati (base, spese escluse, sconto medio, scaglione,
--    percentuali e provvigioni) e quando si sono fissati: `calcolo` è un JSON con schema fisso,
--    `congelato_il` non nullo = documento chiuso (bollettino verificato/contestato, liquidazione
--    chiusa o pratica chiusa), non si ricalcola né si modifica più. Li calcola e salva solo il server.
-- 3. La riga può essere segnata come spesa (codice testo come «Fracht»): esce da lordo e netto dello
--    sconto medio e, se il fornitore esclude le spese, dalla base della provvigione.
--
-- Schema di `calcolo` (JSONB, importi come testo al centesimo, mai virgola mobile):
--   { base, spese, netto, sconto_medio, scaglione, pct_agente, pct_subagente,
--     provvigione_agente, provvigione_subagente, regola }

ALTER TABLE "fornitori" ADD COLUMN "spese_base_provvigione" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ordini_fornitore_documenti" ADD COLUMN "calcolo" JSONB;
ALTER TABLE "ordini_fornitore_documenti" ADD COLUMN "congelato_il" TIMESTAMPTZ(6);

ALTER TABLE "ordini_fornitore_righe" ADD COLUMN "spesa" BOOLEAN NOT NULL DEFAULT false;
