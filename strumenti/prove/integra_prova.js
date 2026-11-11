// Righe di prova per «Cerca in Integra» (F1-A11b, D-111) nelle prove del browser.
// Si lancia da app/backend. Serve PONTE_URL del ponte finto (come il backend di prova) e
// DATABASE_URL del database di prova (decobrands_test):
//   node ../../strumenti/prove/integra_prova.js ponte-aggiungi cliente C99001 "Cliente Prova" 99999999991
//        una riga nella vista del ponte, non ancora in anagrafica;
//   node ../../strumenti/prove/integra_prova.js ponte-togli cliente C99001
//        la toglie;
//   node ../../strumenti/prove/integra_prova.js pulisci cliente C99001
//        toglie dal CRM quello che l'import ha creato (codice, ruolo, versioni, soggetto se orfano).
const { createRequire } = require('node:module');
const req = createRequire(process.cwd() + '/');
req('dotenv/config');
const { Client } = req('pg');

const VISTA = { cliente: 'integra_v_clienti', fornitore: 'integra_v_fornitori' };

(async () => {
  const [comando, tipo, codice, nome, piva] = process.argv.slice(2);
  if (!VISTA[tipo] || !codice) throw new Error('uso: ponte-aggiungi|ponte-togli|pulisci cliente|fornitore <codice> [nome] [piva]');
  if (comando === 'pulisci') {
    if (!/decobrands_test/.test(process.env.DATABASE_URL ?? '')) throw new Error('pulisci gira solo su decobrands_test');
    const c = new Client({ connectionString: process.env.DATABASE_URL.replace(/\?.*$/, '') });
    await c.connect();
    try {
      await c.query('BEGIN');
      const { rows } = await c.query("SELECT entita_id FROM codici_esterni WHERE sistema = 'integra' AND tipo = $1 AND codice = $2", [tipo, codice]);
      const id = rows[0]?.entita_id;
      if (id) {
        const tabella = tipo === 'cliente' ? 'clienti_versioni' : 'fornitori_versioni';
        const chiave = tipo === 'cliente' ? 'cliente_id' : 'fornitore_id';
        await c.query("SET LOCAL decobrands.pulizia_registro = 'si'");
        await c.query(`ALTER TABLE ${tabella} DISABLE TRIGGER USER`); // D-46: le versioni non si cancellano
        await c.query('DELETE FROM registro WHERE entita = $1 AND entita_id = $2', [tipo, id]);
        await c.query('DELETE FROM codici_esterni WHERE sistema = $1 AND tipo = $2 AND codice = $3', ['integra', tipo, codice]);
        await c.query(`UPDATE ${tipo === 'cliente' ? 'clienti' : 'fornitori'} SET versione_corrente_id = NULL WHERE id = $1`, [id]);
        await c.query(`DELETE FROM ${tabella} WHERE ${chiave} = $1`, [id]);
        await c.query(`ALTER TABLE ${tabella} ENABLE TRIGGER USER`);
        const { rows: [ruolo] } = await c.query(`DELETE FROM ${tipo === 'cliente' ? 'clienti' : 'fornitori'} WHERE id = $1 RETURNING soggetto_id`, [id]);
        if (ruolo?.soggetto_id) {
          const { rows: [resta] } = await c.query('SELECT (SELECT count(*) FROM clienti WHERE soggetto_id = $1) + (SELECT count(*) FROM fornitori WHERE soggetto_id = $1) AS n', [ruolo.soggetto_id]);
          if (Number(resta.n) === 0) await c.query('DELETE FROM soggetti WHERE id = $1', [ruolo.soggetto_id]);
        }
      }
      await c.query('COMMIT');
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      await c.end();
    }
    console.log('pulito', tipo, codice);
  } else {
    if (!process.env.PONTE_URL) throw new Error('manca PONTE_URL (ponte finto)');
    const id = parseInt(String(codice).replace(/\D/g, ''), 10) || 99000;
    const c = new Client({ connectionString: process.env.PONTE_URL.replace(/\?.*$/, '') });
    await c.connect();
    const colonne = tipo === 'cliente' ? '' : ', paese';
    const valorePaese = tipo === 'cliente' ? '' : ", 'Italia'";
    if (comando === 'ponte-aggiungi') {
      await c.query(`DELETE FROM ${VISTA[tipo]} WHERE codice = $1 OR id_integra = $2`, [codice, id]);
      await c.query(`INSERT INTO ${VISTA[tipo]} (id_integra, codice, ragione_sociale, piva, attivo, modificato_il${colonne}) VALUES ($1,$2,$3,$4,true,now()${valorePaese})`, [id, codice, nome, piva]);
    } else if (comando === 'ponte-togli') {
      await c.query(`DELETE FROM ${VISTA[tipo]} WHERE codice = $1`, [codice]);
    } else {
      throw new Error('comando sconosciuto: ' + comando);
    }
    await c.end();
    console.log(comando, tipo, codice);
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
