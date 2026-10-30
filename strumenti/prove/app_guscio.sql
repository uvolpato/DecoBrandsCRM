-- Utenti di prova per app_guscio.py e app_utenti.py: psql -v s=<suffisso> -v h='<hash di password-di-prova>' -f app_guscio.sql
-- D-45: ruolo di Sistema + livello nelle aree
INSERT INTO utenti (username, email, nome, ruolo, password_hash, deve_cambiare_password) VALUES
  (:'s' || '-ammi', :'s' || '-ammi@prova-e2e.it', 'Prova Ammi', 'amministratore', :'h', false),
  (:'s' || '-oper', :'s' || '-oper@prova-e2e.it', 'Prova Oper', 'utente', :'h', false),
  (:'s' || '-lett', :'s' || '-lett@prova-e2e.it', 'Prova Lett', 'utente', :'h', false);
INSERT INTO utenti_aree (utente_id, area, livello)
SELECT u.id, a.area, CASE WHEN u.username LIKE '%-ammi' THEN 'responsabile' WHEN u.username LIKE '%-oper' THEN 'operatore' ELSE 'lettura' END
FROM utenti u CROSS JOIN (VALUES ('anagrafiche'), ('provvigioni')) a(area) WHERE u.username LIKE :'s' || '-%';
