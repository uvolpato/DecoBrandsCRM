// Verifica dell'import (F1-A9): query di controllo su decobrands_import.
require('dotenv').config();
const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL.replace(/\/decobrands_db\b/, '/decobrands_import') });
const q = (s) => c.query(s).then((r) => r.rows);
(async () => {
  await c.connect();
  const n = async (s) => Number((await q(s))[0].n);
  const r = {};
  r.soggetti = await n('SELECT count(*) n FROM soggetti');
  r.clienti = await n('SELECT count(*) n FROM clienti');
  r.fornitori = await n('SELECT count(*) n FROM fornitori');
  r.subagenti = await n('SELECT count(*) n FROM subagenti');
  r.agenti = await n('SELECT count(*) n FROM agenti');
  r.interscambio = await n('SELECT count(*) n FROM interscambio');
  r.gruppi = await n('SELECT count(*) n FROM gruppi');
  r.settori = await n('SELECT count(*) n FROM settori');
  r.persone = await n('SELECT count(*) n FROM persone');
  r.sedi = await n('SELECT count(*) n FROM sedi');
  r.recapiti = await n('SELECT count(*) n FROM recapiti');
  r.persone_contatti = await n('SELECT count(*) n FROM persone_contatti');
  r.fatturazione = await n('SELECT count(*) n FROM fatturazione');
  r.sconti = await n('SELECT count(*) n FROM sconti');
  r.codici_esterni = await n('SELECT count(*) n FROM codici_esterni');
  r.clienti_senza_soggetto = await n('SELECT count(*) n FROM clienti WHERE soggetto_id IS NULL');
  r.fornitori_senza_soggetto = await n('SELECT count(*) n FROM fornitori WHERE soggetto_id IS NULL');
  r.subagenti_senza_soggetto = await n('SELECT count(*) n FROM subagenti WHERE soggetto_id IS NULL');
  r.agenti_senza_soggetto = await n('SELECT count(*) n FROM agenti WHERE soggetto_id IS NULL');
  r.piva_doppie = await n("SELECT count(*) n FROM (SELECT paese,piva_norm FROM soggetti WHERE piva_norm <> '' GROUP BY paese,piva_norm HAVING count(*)>1) x");
  r.cf_doppie = await n("SELECT count(*) n FROM (SELECT paese,cf_norm FROM soggetti WHERE piva_norm='' AND cf_norm<>'' GROUP BY paese,cf_norm HAVING count(*)>1) x");
  r.soggetti_con_cliente = await n('SELECT count(DISTINCT soggetto_id) n FROM clienti WHERE soggetto_id IS NOT NULL');
  r.soggetti_con_fornitore = await n('SELECT count(DISTINCT soggetto_id) n FROM fornitori WHERE soggetto_id IS NOT NULL');
  r.soggetti_con_subagente = await n('SELECT count(DISTINCT soggetto_id) n FROM subagenti WHERE soggetto_id IS NOT NULL');
  r.fusioni = await n('SELECT count(*) n FROM modifiche WHERE campo=\'fusione\'');
  r.soggetti_fusi = await n('SELECT count(*) n FROM modifiche WHERE campo=\'fusione\'');
  // somme per cliente
  r.legami_cliente = await n('SELECT sum(c) n FROM (SELECT cliente_id, count(*) c FROM interscambio GROUP BY cliente_id) x');
  // P.IVA distinte in soggetti
  r.piva_distinte = await n("SELECT count(*) n FROM (SELECT DISTINCT paese,piva_norm FROM soggetti WHERE piva_norm<>'') x");
  console.log(JSON.stringify(r, null, 2));
  await c.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
