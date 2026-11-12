-- ============================================================================
-- ⚠ SUPERATO (D-101, D-109): questo file è la proposta iniziale per il ponte e
-- NON va applicato. Lo schema `crm_viste` non esiste (D-101: le viste stanno in
-- `public`), la chiave `codice` è `cliazi.cla_codstr` e non `cli_cdclistr`, e gli
-- agenti/subagenti si leggono da `agenti` (D-109), non da `cliazi`.
-- Il setup vero è in `strumenti/integra-fdw.sql` e `strumenti/crm-viste-integra.sql`.
-- ============================================================================
-- ============================================================================
-- Viste del database ponte per la sincronizzazione del CRM Decobrands
-- Proposta per il sistemista — da adattare ai dati veri di Integra (F0-A8).
-- NON si esegue qui: questo file descrive cosa preparare sul server del ponte.
-- Nessuna password in questo file: le credenziali si scelgono sul server.
-- ============================================================================
--
-- Cosa fa il CRM: legge ogni 60 secondi, con l'utente `crm_lettura` in sola
-- lettura, solo le viste dello schema `crm_viste`:
--
--   SELECT ... FROM crm_viste.v_clienti  WHERE modificato_il > $1 ORDER BY modificato_il
--   SELECT ... FROM crm_viste.v_fornitori WHERE modificato_il > $1 ORDER BY modificato_il
--
-- Perché il filtro deve arrivare a Integra: le viste di Luis (Portale B2B) usano
-- `dblink` e trascinano tutte le righe a ogni lettura (8.856 clienti); ogni 60
-- secondi è troppo. Con `postgres_fdw` il WHERE viene passato a Integra, oppure
-- si usa una funzione con parametro come `b2b_prezzi_listino()` di Luis.
--
-- Passi da fare, una volta, sul server del database ponte:
--
-- 1. estensione:            CREATE EXTENSION postgres_fdw;
-- 2. server esterno verso Integra (host/porta/dbname reali), con un utente
--    Integra in SOLA LETTURA (SELECT sulle tabelle clienti, cliazi);
-- 3. schema di appoggio per le tabelle esterne: integra_fonti;
-- 4. USER MAPPING per `crm_lettura` con quell'utente in sola lettura:
--    la password si scrive qui sul server, mai in questo file;
-- 5. schema `crm_viste` con le due viste qui sotto;
-- 6. ruolo `crm_lettura` (LOGIN) con SELECT solo su `crm_viste`, niente
--    accesso a `integra_fonti` né alle tabelle di Integra;
-- 7. riga in `pg_hba.conf` per il server del CRM, ad esempio:
--      host  decobrands_ponte  crm_lettura  10.0.0.0/24  scram-sha-256
--    (indirizzo e nome del database: quelli veri del ponte).
--
-- Nel CRM, in Impostazioni → Sincronizzazione da Integra, si mettono server,
-- database, utente `crm_lettura`, password (cifrata, mai riletta) e schema.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS postgres_fdw;

-- ---------------------------------------------------------------------------
-- 2. Server esterno: completare host, porta e nome del database di Integra.
-- ---------------------------------------------------------------------------
CREATE SERVER IF NOT EXISTS integra
  FOREIGN DATA WRAPPER postgres_fdw
  OPTIONS (host '<host di Integra>', port '5432', dbname 'integra', fetch_size '1000');

-- ---------------------------------------------------------------------------
-- 3. Solo le due tabelle che servono, in uno schema di appoggio.
--    Completare il nome dello schema di Integra se non è `public`.
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS integra_fonti;
IMPORT FOREIGN SCHEMA public LIMIT TO (clienti, cliazi)
  FROM SERVER integra INTO integra_fonti;

-- ---------------------------------------------------------------------------
-- 4. Chi si collega a Integra per conto del CRM: utente Integra in sola lettura.
--    La password si inserisce a mano sul server, non in questo file.
-- ---------------------------------------------------------------------------
CREATE USER MAPPING IF NOT EXISTS FOR crm_lettura SERVER integra
  OPTIONS (user '<utente Integra in sola lettura>', password '<password, scritta solo sul server>');

-- ---------------------------------------------------------------------------
-- 5. Le due viste per il CRM.
--    - disattivati ESPOSTI, non filtrati: `attivo = false` fa sospendere il
--      record nel CRM senza cancellarlo (pratiche e storia restano);
--    - una vista per ruolo (`cla_tipo = 'C'` / `'F'`);
--    - data di modifica mai vuota: greatest(clienti, cliazi) con coalesce
--      sulla data di inserimento;
--    - la chiave è `id_integra` (= cli_cdcli); `codice` è quello leggibile
--      (cli_cdclistr) che l'interfaccia mostra come *Codice Integra*.
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS crm_viste;

CREATE OR REPLACE VIEW crm_viste.v_clienti AS
SELECT
    c.cli_cdcli::integer                                                   AS id_integra,
    c.cli_cdclistr::varchar(20)                                            AS codice,
    trim(both from coalesce(
      nullif(trim(c.cli_rgsoc || ' ' || coalesce(c.cli_rgsoc2, '')), ''),
      trim(coalesce(c.cli_cognome, '') || ' ' || coalesce(c.cli_nome, ''))
    ))::varchar(170)                                                       AS ragione_sociale,
    c.cli_piva::varchar(20)                                                AS piva,
    c.cli_cfisc::varchar(20)                                               AS codice_fiscale,
    trim(both from coalesce(c.cli_indir, '') || ' ' || coalesce(c.cli_indir2, ''))::varchar(130) AS indirizzo,
    c.cli_cap::varchar(10)                                                 AS cap,
    c.cli_citta::varchar(100)                                              AS citta,
    c.cli_prov::varchar(5)                                                 AS provincia,
    c.cli_stacod::varchar(100)                                             AS paese,
    c.cli_email::varchar(100)                                              AS email,
    c.cli_pecdest::varchar(100)                                            AS pec,
    ca.cla_agecod::varchar(6)                                              AS codice_agente,
    (coalesce(c.cli_obsoleto, 0) = 0 AND coalesce(ca.cla_obsoleto, 0) = 0) AS attivo,
    coalesce(
      greatest(
        coalesce(
          to_timestamp(extract(epoch from c.cli_dtvar) + c.cli_oravar * 3600 + c.cli_minvar * 60),
          to_timestamp(extract(epoch from c.cli_dtins) + c.cli_orains * 3600 + c.cli_minins * 60)
        ),
        to_timestamp(extract(epoch from ca.cla_dtvar) + ca.cla_oravar * 3600 + ca.cla_minvar * 60)
      ),
      to_timestamp(0)
    )                                                                      AS modificato_il
FROM integra_fonti.clienti c
LEFT JOIN integra_fonti.cliazi ca
  ON ca.azi_cdazi = '001'            -- ATTENZIONE: codice azienda di Decobrands, da confermare
 AND ca.cla_tipo = 'C'
 AND ca.cla_clicdcli = c.cli_cdcli;

CREATE OR REPLACE VIEW crm_viste.v_fornitori AS
SELECT
    c.cli_cdcli::integer                                                   AS id_integra,
    c.cli_cdclistr::varchar(20)                                            AS codice,
    trim(both from coalesce(
      nullif(trim(c.cli_rgsoc || ' ' || coalesce(c.cli_rgsoc2, '')), ''),
      trim(coalesce(c.cli_cognome, '') || ' ' || coalesce(c.cli_nome, ''))
    ))::varchar(170)                                                       AS ragione_sociale,
    c.cli_piva::varchar(20)                                                AS piva,
    c.cli_cfisc::varchar(20)                                               AS codice_fiscale,
    trim(both from coalesce(c.cli_indir, '') || ' ' || coalesce(c.cli_indir2, ''))::varchar(130) AS indirizzo,
    c.cli_cap::varchar(10)                                                 AS cap,
    c.cli_citta::varchar(100)                                              AS citta,
    c.cli_prov::varchar(5)                                                 AS provincia,
    c.cli_stacod::varchar(100)                                             AS paese,
    c.cli_email::varchar(100)                                              AS email,
    c.cli_pecdest::varchar(100)                                            AS pec,
    (coalesce(c.cli_obsoleto, 0) = 0 AND coalesce(ca.cla_obsoleto, 0) = 0) AS attivo,
    coalesce(
      greatest(
        coalesce(
          to_timestamp(extract(epoch from c.cli_dtvar) + c.cli_oravar * 3600 + c.cli_minvar * 60),
          to_timestamp(extract(epoch from c.cli_dtins) + c.cli_orains * 3600 + c.cli_minins * 60)
        ),
        to_timestamp(extract(epoch from ca.cla_dtvar) + ca.cla_oravar * 3600 + ca.cla_minvar * 60)
      ),
      to_timestamp(0)
    )                                                                      AS modificato_il
FROM integra_fonti.clienti c
LEFT JOIN integra_fonti.cliazi ca
  ON ca.azi_cdazi = '001'            -- ATTENZIONE: codice azienda di Decobrands, da confermare
 AND ca.cla_tipo = 'F'
 AND ca.cla_clicdcli = c.cli_cdcli;

-- ---------------------------------------------------------------------------
-- 6. Ruolo del CRM: solo SELECT sulle due viste.
--    La password si sceglie sul server (es. `CREATE ROLE crm_lettura LOGIN PASSWORD ...`).
-- ---------------------------------------------------------------------------
REVOKE ALL ON SCHEMA crm_viste FROM PUBLIC;
REVOKE ALL ON integra_fonti.clienti FROM crm_lettura;
REVOKE ALL ON integra_fonti.cliazi FROM crm_lettura;
GRANT USAGE ON SCHEMA crm_viste TO crm_lettura;
GRANT SELECT ON crm_viste.v_clienti, crm_viste.v_fornitori TO crm_lettura;

-- ============================================================================
-- Domande aperte per il sistemista e per Matteo (F1-A4 §6)
-- ============================================================================
-- 1. Il codice azienda di Decobrands in Integra (`azi_cdazi`) è `'001'` come per Luis?
-- 2. I clienti privati con solo codice fiscale e senza P.IVA: si scartano (regola
--    di oggi, §4.2.20) o si accettano con il codice fiscale?
-- 3. Per i solleciti di pagamento (§5.14) vale `cli_email` o la PEC (`cli_pecdest`)?
-- 4. `cla_agecod` (agente di Integra) corrisponde al subagente Decobrands? Per ora
--    il CRM non lo usa; se sì, più avanti può proporre le agenzie.
-- 5. `postgres_fdw` o funzione con parametro (`crm_viste.clienti_dal(dal)`)?
--    Lo decide il sistemista: il CRM legge in tutti e due i casi con una sola
--    SELECT ... WHERE modificato_il > $1.
-- 6. `cli_cdclistr` è unico e non cambia mai per lo stesso soggetto? Il CRM usa
--    solo quello come chiave: se cambia, il soggetto sembrerebbe nuovo.
