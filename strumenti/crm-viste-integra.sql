-- ============================================================================
-- VISTE INTEGRA per il CRM Decobrands (D-32, D-100, §4.5)
-- Schema public, nomi con prefisso integra_ (D-101).
-- SOLA LETTURA (D-100): queste viste leggono le foreign table integra.* e non
-- scrivono mai sul server di Integra. Eseguire come superuser (postgres), DOPO
-- `integra-fdw.sql` (le foreign table integra.* devono già esistere).
--
-- Sorgenti: integra.clienti (master anagrafica) JOIN integra.cliazi (ruolo C/F);
--           integra.agenti JOIN integra.clienti (ruolo agente, D-109).
--  - id_integra  = clienti.cli_cdcli      (id anagrafica, stabile e unico per ruolo in azi 001)
--  - codice      = cliazi.cla_codstr      (codice cliente / fornitore mostrato, es. "03208")
--  - codice_master = clienti.cli_cdclistr (codice del master, es. "00002": è la CHIAVE dei
--    soggetti, non l'id numerico; lo usa anche la vista clienti del B2B Luis)
--  - paese       = CASE su cli_stacod     (086=Italia, 094=Germania; manca la tabella nomi nazione)
--  - attivo      = master e ruolo non obsoleti
--  - modificato_il = massimo fra data+ora+minuti di modifica di master e ruolo
--    (Integra tiene data/ora/minuti in colonne separate, §4.5)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Clienti (cla_tipo = 'C')
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.integra_v_clienti;

CREATE VIEW public.integra_v_clienti AS
SELECT c.cli_cdcli                                        AS id_integra,
       az.cla_codstr                                      AS codice,
       c.cli_cdclistr                                     AS codice_master,
       c.cli_rgsoc                                        AS ragione_sociale,
       c.cli_piva                                         AS piva,
       NULLIF(trim(c.cli_cfisc), '')                      AS codice_fiscale,
       c.cli_indir                                        AS indirizzo,
       c.cli_cap                                          AS cap,
       c.cli_citta                                        AS citta,
       c.cli_prov                                         AS provincia,
       CASE c.cli_stacod
         WHEN '086' THEN 'Italia'
         WHEN '094' THEN 'Germania'
         ELSE NULL                                        -- shortcut: manca la tabella nomi nazione (§4.5)
       END                                                AS paese,
       NULLIF(trim(c.cli_email), '')                      AS email,
       NULLIF(trim(c.cli_pecdest), '')                    AS pec,
       NULLIF(az.cla_agecod, '--')                        AS codice_agente,
       (c.cli_obsoleto = 0 AND az.cla_obsoleto = 0)       AS attivo,
       GREATEST(
         COALESCE(to_timestamp(EXTRACT(epoch FROM c.cli_dtvar)  + c.cli_oravar  * 3600 + c.cli_minvar  * 60), to_timestamp(0)),
         COALESCE(to_timestamp(EXTRACT(epoch FROM az.cla_dtvar) + az.cla_oravar * 3600 + az.cla_minvar * 60), to_timestamp(0)),
         COALESCE(to_timestamp(EXTRACT(epoch FROM c.cli_dtins)  + c.cli_orains  * 3600 + c.cli_minins  * 60), to_timestamp(0))
       )                                                  AS modificato_il
FROM integra.clienti c
JOIN integra.cliazi az
  ON az.cla_clicdcli = c.cli_cdcli
 AND az.cla_tipo     = 'C'
 AND az.azi_cdazi    = '001'
WHERE c.cli_cdcli > 0;

-- ----------------------------------------------------------------------------
-- Fornitori (cla_tipo = 'F')
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.integra_v_fornitori;

CREATE VIEW public.integra_v_fornitori AS
SELECT c.cli_cdcli                                        AS id_integra,
       az.cla_codstr                                      AS codice,
       c.cli_cdclistr                                     AS codice_master,
       c.cli_rgsoc                                        AS ragione_sociale,
       c.cli_piva                                         AS piva,
       NULLIF(trim(c.cli_cfisc), '')                      AS codice_fiscale,
       c.cli_indir                                        AS indirizzo,
       c.cli_cap                                          AS cap,
       c.cli_citta                                        AS citta,
       c.cli_prov                                         AS provincia,
       CASE c.cli_stacod
         WHEN '086' THEN 'Italia'
         WHEN '094' THEN 'Germania'
         ELSE NULL
       END                                                AS paese,
       NULLIF(trim(c.cli_email), '')                      AS email,
       NULLIF(trim(c.cli_pecdest), '')                    AS pec,
       (c.cli_obsoleto = 0 AND az.cla_obsoleto = 0)       AS attivo,
       GREATEST(
         COALESCE(to_timestamp(EXTRACT(epoch FROM c.cli_dtvar)  + c.cli_oravar  * 3600 + c.cli_minvar  * 60), to_timestamp(0)),
         COALESCE(to_timestamp(EXTRACT(epoch FROM az.cla_dtvar) + az.cla_oravar * 3600 + az.cla_minvar * 60), to_timestamp(0)),
         COALESCE(to_timestamp(EXTRACT(epoch FROM c.cli_dtins)  + c.cli_orains  * 3600 + c.cli_minins  * 60), to_timestamp(0))
       )                                                  AS modificato_il
FROM integra.clienti c
JOIN integra.cliazi az
  ON az.cla_clicdcli = c.cli_cdcli
 AND az.cla_tipo     = 'F'
 AND az.azi_cdazi    = '001'
WHERE c.cli_cdcli > 0;

-- ----------------------------------------------------------------------------
-- Agenti / subagenti (tabella `agenti`, NON cliazi)
-- Per Decobrands l'agente principale è Decobrands stessa: le righe dell'azienda
-- 001 sono i SUBAGENTI del CRM (D-109). L'agente non ha righe in `cliazi`:
-- l'identità sta nel master `clienti` (age_clicdcli).
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.integra_v_agenti;

CREATE VIEW public.integra_v_agenti AS
SELECT c.cli_cdcli                                        AS id_integra,
       a.age_cod                                          AS codice,
       c.cli_cdclistr                                     AS codice_master,
       c.cli_rgsoc                                        AS ragione_sociale,
       NULLIF(trim(c.cli_piva), '')                       AS piva,
       NULLIF(trim(c.cli_cfisc), '')                      AS codice_fiscale,
       NULLIF(trim(c.cli_email), '')                      AS email,
       NULLIF(a.age_agecod, '--')                         AS codice_agente_padre,
       (c.cli_obsoleto = 0 AND a.age_obsoleto = 0)        AS attivo,
       GREATEST(
         COALESCE(to_timestamp(EXTRACT(epoch FROM c.cli_dtvar)  + c.cli_oravar  * 3600 + c.cli_minvar  * 60), to_timestamp(0)),
         COALESCE(to_timestamp(EXTRACT(epoch FROM a.age_dtvar)  + a.age_oravar  * 3600 + a.age_minvar  * 60), to_timestamp(0)),
         COALESCE(to_timestamp(EXTRACT(epoch FROM c.cli_dtins)  + c.cli_orains  * 3600 + c.cli_minins  * 60), to_timestamp(0))
       )                                                  AS modificato_il
FROM integra.agenti a
JOIN integra.clienti c
  ON c.cli_cdcli = a.age_clicdcli
WHERE a.azi_cdazi = '001'
  AND a.age_cod <> '--'
  AND c.cli_cdcli > 0;

-- ----------------------------------------------------------------------------
-- Permessi: l'app legge SOLO le viste, in sola lettura (D-100).
--   crm_lettura  = utente del ponte in esercizio (§4.5), se esiste
--   decobrands   = utente dell'app (DATABASE_URL); in esercizio è questo
-- I ruoli assenti si saltano: sul server di produzione `crm_lettura` non c'è.
-- ----------------------------------------------------------------------------
DO $$
DECLARE r text;
BEGIN
  FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('crm_lettura', 'decobrands') LOOP
    EXECUTE format('GRANT SELECT ON public.integra_v_clienti, public.integra_v_fornitori, public.integra_v_agenti TO %I', r);
  END LOOP;
END $$;
