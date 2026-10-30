-- Ruoli per area (D-45, §8.3, §4.2.18): ruolo di Sistema (superutente · amministratore · utente) in
-- utenti.ruolo e un livello per ogni area in utenti_aree. Nessuna riga = l'area non si vede.

CREATE TABLE "utenti_aree" (
    "utente_id" BIGINT NOT NULL,
    "area" VARCHAR(20) NOT NULL,
    "livello" VARCHAR(15) NOT NULL,
    CONSTRAINT "utenti_aree_pkey" PRIMARY KEY ("utente_id", "area"),
    CONSTRAINT "utenti_aree_utente_id_fkey" FOREIGN KEY ("utente_id") REFERENCES "utenti"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "utenti_aree_area_check" CHECK ("area" IN ('anagrafiche', 'provvigioni', 'vendite')),
    CONSTRAINT "utenti_aree_livello_check" CHECK ("livello" IN ('lettura', 'operatore', 'responsabile'))
);

-- Chi c'è già non perde niente: operatore → operatore in Anagrafiche e Provvigioni, sola lettura →
-- lettura, amministratore e superutente → responsabile (prima potevano tutto). L'utente dei servizi no.
INSERT INTO "utenti_aree" ("utente_id", "area", "livello")
SELECT u."id", a."area",
       CASE u."ruolo" WHEN 'lettura' THEN 'lettura' WHEN 'operatore' THEN 'operatore' ELSE 'responsabile' END
FROM "utenti" u CROSS JOIN (VALUES ('anagrafiche'), ('provvigioni')) AS a("area")
WHERE NOT u."sistema";

ALTER TABLE "utenti" DROP CONSTRAINT "utenti_ruolo_check";
UPDATE "utenti" SET "ruolo" = 'utente' WHERE "ruolo" IN ('operatore', 'lettura');
ALTER TABLE "utenti" ADD CONSTRAINT "utenti_ruolo_check" CHECK ("ruolo" IN ('superutente', 'amministratore', 'utente'));
