-- Pratica annullata (D-207 §19): annullamento reversibile di un ordine a fornitore. Tre colonne nuove
-- sulla testata: la data (la pratica diventa «annullata» davanti a ogni stato ricavato), il motivo
-- obbligatorio e chi l'ha annullata. Additiva: nessun dato toccato, le colonne nascono NULL.
-- L'eliminazione (D-206 §19) non ha colonne: cancella fisicamente, con fotografia nel registro.

ALTER TABLE "ordini_fornitore_testata" ADD COLUMN "annullata_il" DATE;
ALTER TABLE "ordini_fornitore_testata" ADD COLUMN "annullata_motivo" TEXT;
ALTER TABLE "ordini_fornitore_testata" ADD COLUMN "annullata_da" BIGINT;
ALTER TABLE "ordini_fornitore_testata" ADD CONSTRAINT "ordini_fornitore_testata_annullata_da_fkey"
  FOREIGN KEY ("annullata_da") REFERENCES "utenti"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
