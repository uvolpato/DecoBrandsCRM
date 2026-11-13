// Documento di prova per app_documenti.py nel database di SVILUPPO (le prove Jest usano
// decobrands_test). Si lancia da app/backend, dopo aver caricato il seed:
//   node ../../strumenti/prove/documenti_prova.js crea <suffisso>
//        crea un documento "da controllare" (fattura, fornitore e codice cliente del seed,
//        2 righe, un campo giallo e uno rosso) e il PDF in DOCUMENTI_DIR;
//   node ../../strumenti/prove/documenti_prova.js togli <suffisso>
//        toglie il documento, i campi, gli eventi e i file.
const { createRequire } = require('node:module');
const req = createRequire(process.cwd() + '/'); // moduli e .env del backend
req('dotenv/config');
const { Client } = req('pg');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Size 4/Root 1 0 R>>\n%%EOF\n');

const fileDi = (percorso) => path.join(process.env.DOCUMENTI_DIR, percorso);

async function pulisci(c, nomi) {
  let tot = 0;
  for (const nome of nomi) {
    const { rows } = await c.query('SELECT id, file_percorso FROM documenti_in_arrivo WHERE file_nome = $1', [nome]);
    for (const d of rows) {
      await c.query('DELETE FROM ordini_fornitore_documenti WHERE arrivo_id = $1', [d.id]);
      await c.query("DELETE FROM registro WHERE entita = 'documento' AND entita_id = $1", [d.id]);
      await c.query('DELETE FROM documenti_in_arrivo WHERE id = $1', [d.id]);
      try { fs.unlinkSync(fileDi(d.file_percorso)); } catch { /* il file può essere già stato spostato */ }
    }
    tot += rows.length;
  }
  return tot;
}

(async () => {
  const comando = process.argv[2], s = process.argv[3];
  if ((comando !== 'crea' && comando !== 'crea-senza' && comando !== 'togli') || !/^[a-z0-9]+$/.test(s ?? '')) {
    throw new Error('uso: crea <suffisso> | crea-senza <suffisso> | togli <suffisso> (minuscole e numeri)');
  }
  const c = new Client({ connectionString: process.env.DATABASE_URL.replace(/\?.*$/, '') });
  await c.connect();
  await c.query('BEGIN');
  await c.query("SET LOCAL decobrands.pulizia_registro = 'si'"); // la prova può togliere i suoi eventi (utenti_prova.js)
  // ogni comando toglie solo il documento che crea; `togli` li toglie tutti e due
  const nomi = comando === 'togli' ? [`Prova_${s}.pdf`, `Prova-senza_${s}.pdf`]
    : [comando === 'crea' ? `Prova_${s}.pdf` : `Prova-senza_${s}.pdf`];
  const tolti = await pulisci(c, nomi);
  if (comando === 'crea') {
    // un'agenzia del seed senza pratiche: la proposta resta "nessuno" e non aggiunge controlli articolo
    let { rows: [inter] } = await c.query(`
      SELECT i.cliente_id, i.fornitore_id, i.codice_cliente_fornitore AS codice,
             f.versione_corrente_id AS fv, cv.ragione_sociale AS cliente
      FROM interscambio i
      JOIN fornitori f ON f.id = i.fornitore_id AND f.versione_corrente_id IS NOT NULL
      JOIN clienti c ON c.id = i.cliente_id AND c.versione_corrente_id IS NOT NULL
      JOIN clienti_versioni cv ON cv.id = c.versione_corrente_id
      WHERE i.codice_cliente_fornitore IS NOT NULL AND i.codice_cliente_fornitore <> ''
        AND NOT EXISTS (SELECT 1 FROM ordini_fornitore_testata t WHERE t.cliente_id = i.cliente_id AND t.fornitore_id = i.fornitore_id)
      ORDER BY i.id LIMIT 1`);
    if (!inter) {
      ({ rows: [inter] } = await c.query(`
        SELECT i.cliente_id, i.fornitore_id, i.codice_cliente_fornitore AS codice,
               f.versione_corrente_id AS fv, cv.ragione_sociale AS cliente
        FROM interscambio i
        JOIN fornitori f ON f.id = i.fornitore_id AND f.versione_corrente_id IS NOT NULL
        JOIN clienti c ON c.id = i.cliente_id AND c.versione_corrente_id IS NOT NULL
        JOIN clienti_versioni cv ON cv.id = c.versione_corrente_id
        WHERE i.codice_cliente_fornitore IS NOT NULL AND i.codice_cliente_fornitore <> ''
        ORDER BY i.id LIMIT 1`));
    }
    if (!inter) throw new Error('Nessuna agenzia nel seed: carica i dati di prova (npm run db:seed)');

    const numero = `PROVA-${s.toUpperCase()}`, data = '2026-09-15', importo = '250';
    // un codice usato da tutte le pratiche dello stesso cliente e fornitore: dopo la correzione
    // non nasce il controllo "articolo assente dalla pratica proposta"
    const { rows: [comune] } = await c.query(`
      SELECT r.codice, r.descrizione
      FROM ordini_fornitore_righe r
      JOIN ordini_fornitore_testata t ON t.id = r.testata_id
      WHERE t.cliente_id = $1 AND t.fornitore_id = $2 AND r.codice IS NOT NULL
      GROUP BY r.codice, r.descrizione
      ORDER BY count(DISTINCT t.id) DESC, r.codice LIMIT 1`, [inter.cliente_id, inter.fornitore_id]);
    const codici = comune
      ? [{ codice: comune.codice, descrizione: comune.descrizione }, { codice: comune.codice, descrizione: comune.descrizione }]
      : [{ codice: 'ART-1', descrizione: 'Articolo di prova' }, { codice: 'ART-2', descrizione: 'Secondo articolo' }];
    const contenuto = Buffer.concat([PDF, Buffer.from('% ' + s + ' ' + Date.now() + '\n')]);
    const hash = crypto.createHash('sha256').update(contenuto).digest('hex');
    const giorno = new Date().toISOString().slice(0, 10);
    const percorso = `in_arrivo/${giorno.slice(0, 4)}/${giorno.replace(/-/g, '')}/${hash}.pdf`;
    fs.mkdirSync(path.dirname(fileDi(percorso)), { recursive: true });
    fs.writeFileSync(fileDi(percorso), contenuto);

    const { rows: [doc] } = await c.query(`
      INSERT INTO documenti_in_arrivo
        (origine, file_nome, file_hash, file_percorso, stato, tipo, fornitore_id, fornitore_versione_id,
         livello, controlli, ricevuto_il, letto_il)
      VALUES ('caricamento', $1, $2, $3, 'da_controllare', 'fattura', $4, $5, 'bassa', $6, now(), now())
      RETURNING id`, [`Prova_${s}.pdf`, hash, percorso, inter.fornitore_id, inter.fv, { falliti: [] }]);
    const campi = {
      tipo: ['fattura', 0.95], numero: [numero, 0.95], data: [data, 0.95],
      codice_cliente: [inter.codice, 0.95], cliente: [inter.cliente, 0.95], importo_totale: [importo, 0.95],
      'righe[0].codice': [codici[0].codice, 0.95], 'righe[0].descrizione': [codici[0].descrizione, 0.95],
      'righe[0].quantita': ['2', 0.75], 'righe[0].prezzo': ['100', 0.95], 'righe[0].importo': ['200', 0.95],
      'righe[1].codice': [codici[1].codice, 0.95], 'righe[1].descrizione': [codici[1].descrizione, 0.95],
      'righe[1].quantita': ['1', 0.95], 'righe[1].prezzo': ['50', 0.6], 'righe[1].importo': ['50', 0.95],
    };
    for (const [campo, [valore, aff]] of Object.entries(campi)) {
      await c.query(`INSERT INTO documenti_campi
        (documento_id, campo, valore_letto, valore_finale, affidabilita, posizione, precisione, verificato)
        VALUES ($1, $2, $3, NULL, $4, NULL, 'assente', false)`, [doc.id, campo, valore, aff]);
    }
    await c.query('COMMIT');
    console.log('creato documento', doc.id, numero, 'su', inter.cliente, '/', inter.fornitore_id, '→', percorso);
  } else if (comando === 'crea-senza') {
    // D-106: ordine di un cliente SENZA agenzia con quel fornitore → proposta manca_agenzia
    const { rows: [inter] } = await c.query(`
      SELECT f.id AS fornitore_id, f.versione_corrente_id AS fv, c.id AS cliente_id,
             cv.ragione_sociale AS cliente, cv.piva AS piva
      FROM clienti c
      JOIN clienti_versioni cv ON cv.id = c.versione_corrente_id
      JOIN fornitori f ON f.versione_corrente_id IS NOT NULL
      WHERE NOT EXISTS (SELECT 1 FROM interscambio i WHERE i.cliente_id = c.id AND i.fornitore_id = f.id)
      ORDER BY c.id, f.id LIMIT 1`);
    if (!inter) throw new Error('Nessuna coppia cliente×fornitore senza agenzia: carica i dati di prova (npm run db:seed)');

    const numero = `PROVA-SENZA-${s.toUpperCase()}`, data = '2026-09-15';
    const contenuto = Buffer.concat([PDF, Buffer.from('% senza ' + s + ' ' + Date.now() + '\n')]);
    const hash = crypto.createHash('sha256').update(contenuto).digest('hex');
    const giorno = new Date().toISOString().slice(0, 10);
    const percorso = `in_arrivo/${giorno.slice(0, 4)}/${giorno.replace(/-/g, '')}/${hash}.pdf`;
    fs.mkdirSync(path.dirname(fileDi(percorso)), { recursive: true });
    fs.writeFileSync(fileDi(percorso), contenuto);

    const { rows: [doc] } = await c.query(`
      INSERT INTO documenti_in_arrivo
        (origine, file_nome, file_hash, file_percorso, stato, tipo, fornitore_id, fornitore_versione_id,
         livello, controlli, ricevuto_il, letto_il)
      VALUES ('caricamento', $1, $2, $3, 'da_controllare', 'ordine', $4, $5, 'affidabile', $6, now(), now())
      RETURNING id`, [`Prova-senza_${s}.pdf`, hash, percorso, inter.fornitore_id, inter.fv, { falliti: [] }]);
    const campi = {
      numero: [numero, 0.95], data: [data, 0.95], codice_cliente: [`SENZA-${s.toUpperCase()}`, 0.95],
      cliente: [inter.cliente, 0.95], piva_cliente: [inter.piva, 0.95],
    };
    for (const [campo, [valore, aff]] of Object.entries(campi)) {
      await c.query(`INSERT INTO documenti_campi
        (documento_id, campo, valore_letto, valore_finale, affidabilita, posizione, precisione, verificato)
        VALUES ($1, $2, $3, NULL, $4, NULL, 'assente', false)`, [doc.id, campo, valore, aff]);
    }
    await c.query('COMMIT');
    console.log('creato documento senza agenzia', doc.id, numero, 'su', inter.cliente, '/', inter.fornitore_id, '→', percorso);
  } else {
    await c.query('COMMIT');
    console.log('tolti', tolti, 'documenti di prova', s);
  }
  await c.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
