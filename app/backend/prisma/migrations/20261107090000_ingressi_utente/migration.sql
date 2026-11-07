-- D-88 §19: pagina di ingresso per area, scelta dall'utente ({provvigioni?, dati?, gestione?}).
ALTER TABLE "utenti" ADD COLUMN "ingressi" JSONB DEFAULT '{}';
