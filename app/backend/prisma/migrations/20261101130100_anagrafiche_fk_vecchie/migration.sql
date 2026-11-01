-- Le chiavi composte verso fornitori_versioni (D-46) coprono già fornitore_id: tolgo le vecchie
-- chiavi semplici verso fornitori, che restavano doppie.
ALTER TABLE "bollettini_testata" DROP CONSTRAINT "bollettini_testata_fornitore_id_fkey";
ALTER TABLE "documenti_in_arrivo" DROP CONSTRAINT "documenti_in_arrivo_fornitore_id_fkey";
ALTER TABLE "ordini_fornitore_testata" DROP CONSTRAINT "ordini_fornitore_testata_fornitore_id_fkey";
