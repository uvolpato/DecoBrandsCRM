-- Accesso con nome utente (o email) e password, come nella Gestione Ordini (D-39, sostituisce D-30).

ALTER TABLE "utenti" DROP CONSTRAINT "utenti_accesso_check";
DROP INDEX "utenti_microsoft_oid_key";
ALTER TABLE "utenti" DROP COLUMN "accesso",
DROP COLUMN "invitato_il",
DROP COLUMN "microsoft_oid",
ADD COLUMN     "creato_il" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deve_cambiare_password" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "password_hash" VARCHAR(200),
ADD COLUMN     "username" VARCHAR(50) NOT NULL;
CREATE UNIQUE INDEX "utenti_username_key" ON "utenti"("username");

-- Vincoli che Prisma non vede (spec §4.2.18)
ALTER TABLE "utenti" DROP CONSTRAINT "utenti_ruolo_check";
ALTER TABLE "utenti" ADD CONSTRAINT "utenti_ruolo_check" CHECK ("ruolo" IN ('superutente', 'amministratore', 'operatore', 'lettura'));
ALTER TABLE "utenti" ADD CONSTRAINT "utenti_username_check" CHECK ("username" = lower("username") AND length(trim("username")) > 0);
-- chi accede ha sempre una password; solo l'utente dei servizi ne è senza
ALTER TABLE "utenti" ADD CONSTRAINT "utenti_password_check" CHECK ("sistema" OR "password_hash" IS NOT NULL);
-- un solo superutente (D-39)
CREATE UNIQUE INDEX "utenti_superutente_key" ON "utenti" ("ruolo") WHERE "ruolo" = 'superutente';

-- accessi_link: solo i link di password dimenticata
ALTER TABLE "accessi_link" DROP CONSTRAINT "accessi_link_tipo_check";
ALTER TABLE "accessi_link" ADD CONSTRAINT "accessi_link_tipo_check" CHECK ("tipo" = 'reset');
