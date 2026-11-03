-- D-52 §19: l'elenco delle pratiche si legge in SQL. Il motore salva sulla testata il risultato di ciò che dipende
-- solo dai documenti e dalle righe (aggiornaPratica, src/pratiche.ts): `stato` (c'era già: inviato | confermato |
-- fatturato), importo, variazioni. La scadenza della conferma (data + giorni del fornitore) e il subagente alla data
-- (interscambio) si calcolano nella query: cambiano con il fornitore o le agenzie, così non vanno mai riallineati.
-- Le righe esistenti si riempiono con `npm run pratiche:ricalcola` (la regola delle variazioni sta nel motore).
ALTER TABLE "ordini_fornitore_testata"
  ADD COLUMN "importo" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN "variazioni" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "variazione" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- filtri e ordinamenti dell'elenco: fornitore e stato c'è già, cliente c'è già
CREATE INDEX "ordini_fornitore_testata_data_ordine_idx" ON "ordini_fornitore_testata"("data_ordine");
CREATE INDEX "ordini_fornitore_testata_importo_idx" ON "ordini_fornitore_testata"("importo");
