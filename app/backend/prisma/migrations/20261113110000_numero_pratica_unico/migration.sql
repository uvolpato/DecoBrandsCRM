-- OF/AAAA/NNN e' unico anche nel database (A3-10): il blocco consultivo di nuovaPratica basta da solo
-- finche' tutti passano da li'; un seed, un ricalcolo o un import possono scriverlo senza. Controllato
-- prima sul seed: nessun numero doppio fra le 54 pratiche.
CREATE UNIQUE INDEX "ordini_fornitore_testata_numero_ordine_key" ON "ordini_fornitore_testata"("numero_ordine");
