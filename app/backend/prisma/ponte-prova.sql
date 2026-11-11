-- DDL ponte finto per F1-A4/F1-A7 (tabelle come viste)
-- Schema public con integra_v_clienti e integra_v_fornitori (colonne come proposte §4.5, D-101)
-- Eseguibile da prisma/ponte-prova.ts (solo sul database decobrands_ponte_prova)

DROP TABLE IF EXISTS public.integra_v_fornitori;
DROP TABLE IF EXISTS public.integra_v_clienti;

CREATE TABLE public.integra_v_clienti (
  id_integra integer NOT NULL,
  codice varchar(20),
  ragione_sociale varchar(170),
  piva varchar(20),
  codice_fiscale varchar(20),
  indirizzo varchar(130),
  cap varchar(10),
  citta varchar(100),
  provincia varchar(5),
  paese varchar(100),
  email varchar(100),
  pec varchar(100),
  codice_agente varchar(6),
  attivo boolean DEFAULT true,
  modificato_il timestamptz
);

CREATE TABLE public.integra_v_fornitori (
  id_integra integer NOT NULL,
  codice varchar(20),
  ragione_sociale varchar(170),
  piva varchar(20),
  codice_fiscale varchar(20),
  indirizzo varchar(130),
  cap varchar(10),
  citta varchar(100),
  provincia varchar(5),
  paese varchar(100),
  email varchar(100),
  pec varchar(100),
  attivo boolean DEFAULT true,
  modificato_il timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS integra_v_clienti_id_integra_key ON public.integra_v_clienti (id_integra);
CREATE UNIQUE INDEX IF NOT EXISTS integra_v_fornitori_id_integra_key ON public.integra_v_fornitori (id_integra);
