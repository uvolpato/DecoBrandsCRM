-- D-55 §19: i PDF stanno in cartelle per anno e giorno di caricamento (AAAA/AAAAMMGG/<impronta>.pdf, giorno di Roma),
-- così si ritrovano anche a mano. Il percorso si salva: un file scartato e ricaricato resta dove era.
ALTER TABLE "documenti_in_arrivo" ADD COLUMN "file_percorso" VARCHAR(100);
UPDATE "documenti_in_arrivo" SET "file_percorso" = "file_hash" || '.pdf'; -- file di prima, nella radice
ALTER TABLE "documenti_in_arrivo" ALTER COLUMN "file_percorso" SET NOT NULL;
