-- Setup del FDW verso Integra nel database decobrands_db (in esercizio: porta 5433).
-- VINCOLO D-100: SOLA LETTURA — il server di Integra non viene MAI modificato.
-- Eseguire come SUPERUSER (postgres), in quest'ordine:
--   1. questo file:        psql -U postgres -d decobrands_db -p 5433 -f integra-fdw.sql
--   2. crm-viste-integra.sql (le viste public.integra_v_* che legge l'app)
-- Rilanciabile: server e schema locali si ricreano da zero; dopo un rilancio va rifatto
-- anche il punto 2, perché le viste cadono con lo schema `integra`.
-- Da completare prima di lanciarlo: utente in sola lettura di Integra e password (punto 4).
-- La password si scrive SOLO nella copia sul server, mai nel repository (D-100).
-- Va sia con psql sia incollato in pgAdmin: non usa comandi `\` di psql.

BEGIN;

-- 1. Estensione postgres_fdw
CREATE EXTENSION IF NOT EXISTS postgres_fdw;

-- 2. Ripartenza pulita (alla prima esecuzione non fa niente)
DROP SERVER IF EXISTS integra_server CASCADE;
DROP SCHEMA IF EXISTS integra CASCADE;

-- 3. Foreign server verso il gestionale Integra
--    Integra è sulla stessa macchina del CRM (in esercizio non è ammessa in pg_hba la
--    connessione per l'IP di rete, mentre 127.0.0.1/::1 sì): si passa da `localhost`.
--    Se un giorno il gestionale finisce su un'altra macchina, qui va il suo indirizzo.
CREATE SERVER integra_server
  FOREIGN DATA WRAPPER postgres_fdw
  OPTIONS (
    host 'localhost',
    port '5432',
    dbname 'integra',
    fetch_size '5000',
    use_remote_estimate 'on'
  );

-- 4. User mapping: con quali credenziali si legge Integra (utente remoto di SOLA LETTURA).
--    FOR PUBLIC = vale per chiunque nel DB (postgres per il setup, decobrands per l'app).
--    La password si scrive qui SOLO nella copia sul server, mai nel repository.
--    Se sbagli solo la password non serve rifare tutto:
--      ALTER USER MAPPING FOR PUBLIC SERVER integra_server OPTIONS (SET password '...');
CREATE USER MAPPING FOR PUBLIC
  SERVER integra_server
  OPTIONS (user '<UTENTE_LETTURA_INTEGRA>', password '<PASSWORD>');

-- 5. Schema locale delle foreign table
CREATE SCHEMA IF NOT EXISTS integra;

-- 6. Importa le sole tabelle usate (stessa lista di Luis, schema B2B §1)
--    Se lo schema remoto non è "public", cambiarlo qui sotto.
--    `agenti` serve per i subagenti: gli agenti di Integra NON hanno righe in `cliazi` (D-109).
IMPORT FOREIGN SCHEMA public
  LIMIT TO (clienti, cliazi, agenti, destinazioni, prodotti, classivoci, entleg,
            listest, listini, movtest, movrig, maginv, maginvt,
            tabpag, tabpor, tabspe, vettori)
  FROM SERVER integra_server
  INTO integra;

-- 7. Permessi minimi: l'app legge le VISTE (public.integra_v_*), non le foreign table.
--    Scommentare solo se serve leggere direttamente le foreign table (es. debug).
-- GRANT USAGE ON SCHEMA integra TO decobrands;
-- GRANT SELECT ON ALL TABLES IN SCHEMA integra TO decobrands;

-- 8. Controllo: se Integra non risponde (pg_hba, password, rete) l'errore esce qui e,
--    siccome siamo in una transazione, non resta niente a metà.
SELECT (SELECT count(*) FROM integra.clienti) AS clienti,
       (SELECT count(*) FROM integra.cliazi)  AS ruoli,
       (SELECT count(*) FROM integra.agenti)  AS agenti;

COMMIT;
