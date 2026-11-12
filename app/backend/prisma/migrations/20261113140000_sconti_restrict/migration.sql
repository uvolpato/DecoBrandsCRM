-- Un'agenzia con sconti storici non si elimina, si chiude (D-139): la cascata cancellava in silenzio gli
-- sconti collegati e i calcoli del passato non si rifacevano piu'. Come le altre chiavi dell'anagrafica.
ALTER TABLE "sconti" DROP CONSTRAINT "sconti_interscambio_id_fkey";

ALTER TABLE "sconti" ADD CONSTRAINT "sconti_interscambio_id_fkey"
    FOREIGN KEY ("interscambio_id") REFERENCES "interscambio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
