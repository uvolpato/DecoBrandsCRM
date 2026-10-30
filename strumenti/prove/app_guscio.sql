-- Utenti di prova per app_guscio.py: psql -v s=<suffisso> -v h='<hash di password-di-prova>' -f app_guscio.sql
INSERT INTO utenti (username, email, nome, ruolo, password_hash, deve_cambiare_password) VALUES
  (:'s' || '-ammi', :'s' || '-ammi@prova-e2e.it', 'Prova Ammi', 'amministratore', :'h', false),
  (:'s' || '-oper', :'s' || '-oper@prova-e2e.it', 'Prova Oper', 'operatore', :'h', false),
  (:'s' || '-lett', :'s' || '-lett@prova-e2e.it', 'Prova Lett', 'lettura', :'h', false);
