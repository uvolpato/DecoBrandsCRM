-- Setup del FDW verso Integra nel database decobrands_db.
-- VINCOLO D-100: SOLA LETTURA — il server di Integra non viene MAI modificato.
-- Eseguire come SUPERUSER (postgres): CREATE EXTENSION e CREATE SERVER lo richiedono.
-- Le credenziali restano nell'user mapping, MAI in un file versionato né nel codice.

-- 1. Estensione postgres_fdw
CREATE EXTENSION IF NOT EXISTS postgres_fdw;

-- 2. Foreign server verso il gestionale Integra
--    host/port/dbname: del server PostgreSQL remoto di Integra (es. 192.168.1.41:5432)
CREATE SERVER integra_server
  FOREIGN DATA WRAPPER postgres_fdw
  OPTIONS (
    host '<HOST_INTEGRA>',
    port '5432',
    dbname '<DB_INTEGRA>',
    fetch_size '5000',
    use_remote_estimate 'on'
  );

-- 3. User mapping: con quali credenziali si legge Integra (utente remoto di SOLA LETTURA).
--    FOR PUBLIC = vale per chiunque nel DB (postgres per il setup, decobrands per l'app).
CREATE USER MAPPING FOR PUBLIC
  SERVER integra_server
  OPTIONS (user '<UTENTE_LETTURA_INTEGRA>', password '<PASSWORD>');

-- 4. Schema locale delle foreign table
CREATE SCHEMA IF NOT EXISTS integra;

-- 5. Importa le sole tabelle usate (stessa lista di Luis, schema B2B §1)
--    Se lo schema remoto non è "public", cambiarlo qui sotto.
--    `agenti` serve per i subagenti: gli agenti di Integra NON hanno righe in `cliazi` (D-109).
IMPORT FOREIGN SCHEMA public
  LIMIT TO (clienti, cliazi, agenti, destinazioni, prodotti, classivoci, entleg,
            listest, listini, movtest, movrig, maginv, maginvt,
            tabpag, tabpor, tabspe, vettori)
  FROM SERVER integra_server
  INTO integra;

-- 6. Permessi minimi: l'app legge le VISTE (crm_viste), non le foreign table.
--    Scommentare solo se serve leggere direttamente le foreign table (es. debug).
-- GRANT USAGE ON SCHEMA integra TO decobrands;
-- GRANT SELECT ON ALL TABLES IN SCHEMA integra TO decobrands;
