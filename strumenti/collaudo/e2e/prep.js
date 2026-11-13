// giro e2e: superutente r1-super (password di r1-ammi) e pagine d'ingresso azzerate prima di ogni prova
const { createRequire } = require('node:module'); const req = createRequire(process.cwd() + '/');
const { Client } = req('pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL.replace(/\?.*$/, '') }); await c.connect();
  if (!/decobrands_test/.test(process.env.DATABASE_URL)) throw new Error('solo decobrands_test');
  const { rows: [{ n }] } = await c.query(`SELECT count(*)::int n FROM utenti WHERE ruolo='superutente'`);
  if (!n) {
    const { rows } = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_name='utenti' AND column_name NOT IN ('id','username','email','ruolo','nome')`);
    const col = rows.map((r) => r.column_name).join(',');
    await c.query(`INSERT INTO utenti (username,email,ruolo,nome,${col}) SELECT 'r1-super','r1-super@prova-e2e.it','superutente','Prova Super',${col} FROM utenti WHERE username='r1-ammi'`);
  }
  const s = await c.query(`UPDATE utenti SET username='r1-super', password_hash=(SELECT password_hash FROM utenti WHERE username='r1-ammi'), deve_cambiare_password=false WHERE ruolo='superutente' RETURNING id`);
  const i = await c.query(`UPDATE utenti SET ingressi='{}' WHERE username LIKE 'r1-%'`);
  console.log('super', s.rowCount, 'ingressi', i.rowCount); await c.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
