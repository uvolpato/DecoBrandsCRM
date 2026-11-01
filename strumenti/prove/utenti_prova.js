// Utenti di prova per le prove nel browser (app_*.py) nel database di SVILUPPO (le prove Jest usano
// decobrands_test). Si lancia da app/backend, dopo `npm run build` (usa dist/src/password):
//   node ../../strumenti/prove/utenti_prova.js crea <s>   →  <s>-ammi (amministratore, responsabile),
//        <s>-oper (operatore), <s>-lett (lettura), <s>-nuovo (operatore con password provvisoria);
//        password di tutti: password-di-prova
//   node ../../strumenti/prove/utenti_prova.js togli     →  toglie utenti @prova-e2e.it, eventi e sessioni
const { createRequire } = require('node:module');
const req = createRequire(process.cwd() + '/'); // moduli e .env del backend
req('dotenv/config');
const { Client } = req('pg');
const { cifra } = req('./dist/src/password');

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL.replace(/\?.*$/, '') });
  await c.connect();
  if (process.argv[2] === 'crea') {
    const s = process.argv[3], h = await cifra('password-di-prova');
    if (!/^[a-z0-9]+$/.test(s ?? '')) throw new Error('uso: crea <suffisso> (minuscole e numeri)');
    await c.query('BEGIN'); // tutti o nessuno
    // D-45: ruolo di Sistema + livello nelle aree
    for (const [n, r, l, provvisoria] of [['ammi', 'amministratore', 'responsabile'], ['oper', 'utente', 'operatore'], ['lett', 'utente', 'lettura'], ['nuovo', 'utente', 'operatore', true]]) {
      const { rows: [u] } = await c.query('INSERT INTO utenti (username, email, nome, ruolo, password_hash, deve_cambiare_password) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
        [`${s}-${n}`, `${s}-${n}@prova-e2e.it`, 'Prova ' + n[0].toUpperCase() + n.slice(1), r, h, !!provvisoria]);
      await c.query("INSERT INTO utenti_aree (utente_id, area, livello) VALUES ($1, 'dati', $2), ($1, 'provvigioni', $2)", [u.id, l]);
    }
    await c.query('COMMIT');
  } else if (process.argv[2] === 'togli') {
    await c.query('BEGIN');
    await c.query("SET LOCAL decobrands.pulizia_registro = 'si'");
    const ids = (await c.query("SELECT id FROM utenti WHERE email LIKE '%@prova-e2e.it'")).rows.map((r) => r.id);
    const ev = await c.query("DELETE FROM registro WHERE utente_id = ANY($1) OR (entita = 'utente' AND entita_id = ANY($1)) OR dettaglio->>'etichetta' LIKE '%@prova-e2e.it'", [ids]);
    await c.query('DELETE FROM sessioni WHERE utente_id = ANY($1)', [ids]);
    const u = await c.query('DELETE FROM utenti WHERE id = ANY($1)', [ids]);
    await c.query('COMMIT');
    console.log('tolti', u.rowCount, 'utenti,', ev.rowCount, 'eventi');
  } else throw new Error('uso: crea <suffisso> | togli');
  await c.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
