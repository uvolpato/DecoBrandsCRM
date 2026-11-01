-- L'area Anagrafiche diventa Dati (D-47, §8.3): conterrà tutte le tabelle consultabili e
-- modificabili, non solo fornitori, clienti e subagenti. Chi aveva un livello lo tiene.
ALTER TABLE "utenti_aree" DROP CONSTRAINT "utenti_aree_area_check";
UPDATE "utenti_aree" SET "area" = 'dati' WHERE "area" = 'anagrafiche';
ALTER TABLE "utenti_aree" ADD CONSTRAINT "utenti_aree_area_check" CHECK ("area" IN ('dati', 'provvigioni', 'vendite'));
