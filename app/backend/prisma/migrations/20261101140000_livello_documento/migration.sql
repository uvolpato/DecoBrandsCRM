-- documenti_in_arrivo.livello: 'da_controllare' (14 caratteri, §4.2.12) non entrava in VARCHAR(12)
ALTER TABLE "documenti_in_arrivo" ALTER COLUMN "livello" TYPE VARCHAR(16);
