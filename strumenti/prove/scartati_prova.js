// Documenti scartati di prova per app_scartati.py nel database di SVILUPPO (le prove Jest usano
// decobrands_test). Si lancia da app/backend:
//   node ../../strumenti/prove/scartati_prova.js crea <suffisso>
//        due documenti scartati (Doppione e Altro) con numero, cliente, file su DOCUMENTI_DIR;
//   node ../../strumenti/prove/scartati_prova.js togli <suffisso>
//        toglie i due documenti, i campi, gli eventi e i file.
const { createRequire } = require('node:module');
const req = createRequire(process.cwd() + '/'); // moduli e .env del backend
req('dotenv/config');
const { Client } = req('pg');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Size 4/Root 1 0 R>>\n%%EOF\n');
const fileDi = (percorso) => path.join(process.env.DOCUMENTI_DIR, percorso);
const nomi = (s) => [`Prova_${s}_1.pdf`, `Prova_${s}_2.pdf`];

async function pulisci(c, s) {
  const { rows } = await c.query('SELECT id, file_percorso FROM documenti_in_arrivo WHERE file_nome = ANY($1)', [nomi(s)]);
  for (const d of rows) {
    await c.query("DELETE FROM registro WHERE entita = 'documento' AND entita_id = $1", [d.id]);
    await c.query('DELETE FROM documenti_in_arrivo WHERE id = $1', [d.id]);
    try { fs.unlinkSync(fileDi(d.file_percorso)); } catch { /* il file può non esserci */ }
  }
  return rows.length;
}

(async () => {
  const comando = process.argv[2], s = process.argv[3];
  if ((comando !== 'crea' && comando !== 'togli') || !/^[a-z0-9]+$/.test(s ?? '')) {
    throw new Error('uso: crea <suffisso> | togli <suffisso> (minuscole e numeri)');
  }
  const c = new Client({ connectionString: process.env.DATABASE_URL.replace(/\?.*$/, '') });
  await c.connect();
  await c.query('BEGIN');
  await c.query("SET LOCAL decobrands.pulizia_registro = 'si'"); // la prova può togliere i suoi eventi
  const tolti = await pulisci(c, s);
  if (comando === 'crea') {
    const { rows: [inter] } = await c.query(`
      SELECT i.cliente_id, i.fornitore_id, f.versione_corrente_id AS fv, cv.ragione_sociale AS cliente
      FROM interscambio i
      JOIN fornitori f ON f.id = i.fornitore_id AND f.versione_corrente_id IS NOT NULL
      JOIN clienti c ON c.id = i.cliente_id AND c.versione_corrente_id IS NOT NULL
      JOIN clienti_versioni cv ON cv.id = c.versione_corrente_id
      ORDER BY i.id LIMIT 1`);
    if (!inter) throw new Error('Nessuna agenzia nel seed: carica i dati di prova (npm run db:seed)');
    const { rows: [chi] } = await c.query("SELECT id FROM utenti WHERE ruolo = 'amministratore' AND NOT sistema ORDER BY id LIMIT 1");

    const voci = [
      { nome: nomi(s)[0], numero: `PROVA-${s.toUpperCase()}-1`, motivo: 'Doppione', nota: 'arrivato due volte' },
      { nome: nomi(s)[1], numero: `PROVA-${s.toUpperCase()}-2`, motivo: 'Altro', nota: null },
    ];
    for (const v of voci) {
      const contenuto = Buffer.concat([PDF, Buffer.from('% ' + s + ' ' + v.nome + ' ' + Date.now() + '\n')]);
      const hash = crypto.createHash('sha256').update(contenuto).digest('hex');
      const giorno = new Date().toISOString().slice(0, 10);
      const percorso = `in_arrivo/${giorno.slice(0, 4)}/${giorno.replace(/-/g, '')}/${hash}.pdf`;
      fs.mkdirSync(path.dirname(fileDi(percorso)), { recursive: true });
      fs.writeFileSync(fileDi(percorso), contenuto);
      const { rows: [doc] } = await c.query(`
        INSERT INTO documenti_in_arrivo
          (origine, file_nome, file_hash, file_percorso, stato, tipo, fornitore_id, fornitore_versione_id,
           livello, controlli, ricevuto_il, letto_il, scartato_il, scartato_da, motivo_scarto, nota_scarto)
        VALUES ('caricamento', $1, $2, $3, 'scartato', 'fattura', $4, $5, 'affidabile', '{"falliti":[]}'::jsonb,
                now() - interval '1 day', now() - interval '1 day', now(), $6, $7, $8)
        RETURNING id`, [v.nome, hash, percorso, inter.fornitore_id, inter.fv, chi?.id ?? null, v.motivo, v.nota]);
      await c.query(`INSERT INTO documenti_campi
        (documento_id, campo, valore_letto, valore_finale, affidabilita, posizione, precisione, verificato)
        VALUES ($1, 'numero', $2, NULL, 0.95, NULL, 'assente', false),
               ($1, 'cliente', $3, NULL, 0.95, NULL, 'assente', false)`, [doc.id, v.numero, inter.cliente]);
    }
    await c.query('COMMIT');
    console.log('creati 2 documenti scartati per', s);
  } else {
    await c.query('COMMIT');
    console.log('tolti', tolti, 'documenti scartati', s);
  }
  await c.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
