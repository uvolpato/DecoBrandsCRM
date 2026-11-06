// Servizi di prova per le prove nel browser (app_sistema.py) nel database di SVILUPPO. Si lancia da
// app/backend, dopo `npm run build`:
//   node ../../strumenti/prove/servizi_prova.js spegni
//        salva le quattro sezioni dei servizi (casella, posta, integra, lettura) in un file temporaneo
//        e svuota i campi di connessione: *Controlla adesso* non tocca la rete;
//   node ../../strumenti/prove/servizi_prova.js accendi
//        rimette le sezioni salvate, esattamente com'erano (password comprese);
//   node ../../strumenti/prove/servizi_prova.js problema <s>
//        un'anomalia aperta e non vista (per provare «Segna come visto»);
//   node ../../strumenti/prove/servizi_prova.js pulisci <s>
//        toglie l'anomalia di prova.
const { createRequire } = require('node:module');
const req = createRequire(process.cwd() + '/');
req('dotenv/config');
const { Client } = req('pg');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const FILE = path.join(os.tmpdir(), 'decobrands-servizi-prova.json');

(async () => {
  const comando = process.argv[2], s = process.argv[3];
  const c = new Client({ connectionString: process.env.DATABASE_URL.replace(/\?.*$/, '') });
  await c.connect();
  if (comando === 'spegni') {
    const { rows } = await c.query("SELECT chiave, valore FROM impostazioni WHERE chiave IN ('casella','posta','integra','lettura')");
    fs.writeFileSync(FILE, JSON.stringify(rows), 'utf8');
    const vuoto = {
      casella: { server: '', utente: '', password: null },
      posta: { server: '', utente: '', password: null },
      integra: { server: '', database: '', utente: '', password: null },
      lettura: { llamacloud_chiave: null },
    };
    for (const [chiave, campi] of Object.entries(vuoto)) {
      await c.query('UPDATE impostazioni SET valore = valore || $1::jsonb WHERE chiave = $2', [JSON.stringify(campi), chiave]);
    }
    console.log('servizi spenti (backup in', FILE + ')');
  } else if (comando === 'accendi') {
    if (!fs.existsSync(FILE)) throw new Error('nessun backup: lancia prima «spegni»');
    for (const r of JSON.parse(fs.readFileSync(FILE, 'utf8'))) {
      await c.query('UPDATE impostazioni SET valore = $1::jsonb WHERE chiave = $2', [JSON.stringify(r.valore), r.chiave]);
    }
    fs.unlinkSync(FILE);
    console.log('servizi riaccesi');
  } else if (comando === 'problema' || comando === 'pulisci') {
    if (!/^[a-z0-9]+$/.test(s ?? '')) throw new Error('uso: problema <suffisso>');
    const messaggio = 'Problema di prova ' + s;
    if (comando === 'problema') {
      await c.query("DELETE FROM registro WHERE genere = 'anomalia' AND messaggio = $1 AND servizio = 'casella'", [messaggio]);
      await c.query(`INSERT INTO registro (genere, livello, codice, servizio, messaggio, dettaglio, chiave, ultimo, stato)
        VALUES ('anomalia', 'attenzione', 'casella.allegato', 'casella', $1, '{"nome":"prova.zip","errore":"x"}'::jsonb, $1, now(), 'aperta')`, [messaggio]);
    } else {
      await c.query("SET decobrands.pulizia_registro = 'si'");
      await c.query("DELETE FROM registro WHERE genere = 'anomalia' AND messaggio = $1 AND servizio = 'casella'", [messaggio]);
    }
    console.log(comando, 'fatto:', messaggio);
  } else {
    throw new Error('uso: spegni | accendi | problema <suffisso> | pulisci <suffisso>');
  }
  await c.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
