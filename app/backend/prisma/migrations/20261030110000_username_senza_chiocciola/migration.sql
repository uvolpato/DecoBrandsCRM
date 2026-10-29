-- Il nome utente non può sembrare un'email: "entra" cerca per nome utente o email (D-39)
ALTER TABLE "utenti" ADD CONSTRAINT "utenti_username_senza_chiocciola_check" CHECK (position('@' in "username") = 0);
