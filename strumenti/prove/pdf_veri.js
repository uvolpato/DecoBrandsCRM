// Demo con i PDF veri di Documenti Veri/: ordine AU276839, proforma PR102813, fattura RE193071
// (Gries → cliente Agri Aggio, subagente Stefano Bastasin). Crea il cliente come farebbe Integra,
// carica i tre PDF dal canale comune e li abbina alla pratica. Idempotente: se ci sono già, non
// duplica e stampa dove trovarli.
// Si lancia da app/backend (usa .env e i pacchetti del backend):
//   node ../../strumenti/prove/pdf_veri.js
// Il cliente e la pratica restano nel database di SVILUPPO (serve un utente demo-ammi: vedi
// utenti_prova.js). Dopo un azzeramento del database basta rilanciarlo.
const { createRequire } = require('node:module');
const req = createRequire(process.cwd() + '/');
req('dotenv/config');
const { Client } = req('pg');
const fs = require('node:fs');
const path = require('node:path');

const BASE = 'http://localhost:8001';
const CARTELLA = 'C:/Progetti/Decobrands_CRM/Documenti Veri/ORDINI 2026/BASTASIN/AGRI AGGIO SNC/Ordine del 26.02.17';
const DOCS = [
  { file: 'Auftrag_AU276839.pdf', tipo: 'ordine', numero: 'AU276839', data: '2026-02-17', importo: 2117.30 },
  { file: 'Proforma_PR102813.pdf', tipo: 'proforma', numero: 'PR102813', data: '2026-03-02', importo: 2117.30 },
  { file: 'Rechnung_RE193071.pdf', tipo: 'fattura', numero: 'RE193071', data: '2026-03-04', importo: 2117.30 },
];

(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL.replace(/\?.*$/, '') });
  await db.connect();
  const una = async (s, p) => (await db.query(s, p)).rows[0];

  // 1. cliente Agri Aggio (come da Integra) + agenzia con Gries + codice cliente 45172
  let cli = await una(`select c.id from clienti c join clienti_versioni v on v.id = c.versione_corrente_id where v.ragione_sociale ilike 'Agri Aggio%' limit 1`);
  if (!cli) {
    await db.query('BEGIN');
    const c = await una(`insert into clienti (attivo, sincronizzato_il) values (true, now()) returning id`);
    const v = await una(`insert into clienti_versioni (cliente_id, fonte, piva, ragione_sociale, indirizzo, cap, citta, provincia)
      values ($1, 'integra', 'IT04364290264', 'Agri Aggio SNC di Aggio Mauro & C.', 'Via Emiliana 14', '31055', 'Santa Cristina di Quinto', 'TV') returning id`, [c.id]);
    await db.query(`update clienti set versione_corrente_id = $1 where id = $2`, [v.id, c.id]);
    await db.query(`insert into codici_esterni (sistema, tipo, codice, entita_id) values ('integra', 'cliente', '45172', $1)`, [c.id]);
    await db.query(`insert into interscambio (subagente_id, cliente_id, fornitore_id, codice_cliente_fornitore, sconto, valido_dal)
      values (1, $1, 1, '45172', 0, '2025-01-01')`, [c.id]);
    await db.query('COMMIT');
    cli = c;
    console.log('cliente Agri Aggio creato, id', String(c.id));
  } else console.log('cliente Agri Aggio già presente, id', String(cli.id));

  // 2. accesso (demo-ammi da utenti_prova.js)
  const entra = await fetch(BASE + '/api/accesso/entra', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ utente: 'demo-ammi', password: 'password-di-prova' }) });
  if (!entra.ok) throw new Error('accesso fallito: ' + entra.status + ' (crea demo-ammi con utenti_prova.js)');
  const cookie = entra.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  const csrf = (await entra.json()).csrf;

  const carica = async (d) => {
    const fd = new FormData();
    fd.append('file', new Blob([fs.readFileSync(path.join(CARTELLA, d.file))], { type: 'application/pdf' }), d.file);
    const r = await fetch(BASE + '/api/documenti/carica', { method: 'POST', headers: { cookie, 'x-csrf-token': csrf }, body: fd });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error('carica ' + d.file + ': ' + r.status + ' ' + JSON.stringify(b));
    return b.id;
  };

  // 3. ordine: se già c'è, si usa la sua pratica
  let pratica = (await una(`select d.testata_id id from ordini_fornitore_documenti d join ordini_fornitore_testata t on t.id = d.testata_id
    where d.tipo = 'ordine' and d.numero = $1 and t.fornitore_id = 1 limit 1`, [DOCS[0].numero]))?.id;
  if (pratica) console.log('ordine già abbinato, pratica', String(pratica));
  else {
    const arrivo = await carica(DOCS[0]);
    const r = await fetch(BASE + '/api/documenti/' + arrivo + '/abbina', {
      method: 'POST', headers: { cookie, 'x-csrf-token': csrf, 'content-type': 'application/json' },
      body: JSON.stringify({ tipo: 'ordine', fornitore_id: 1, cliente_id: Number(cli.id), numero: DOCS[0].numero, data: DOCS[0].data, importo: DOCS[0].importo }),
    });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error('abbina ordine: ' + r.status + ' ' + JSON.stringify(b));
    pratica = b.pratica?.id ?? b.testata_id ?? b.id;
    console.log('pratica creata:', String(pratica), b.pratica?.numero ?? '');
  }

  // 4. proforma e fattura sulla stessa pratica, solo se mancano
  for (const d of DOCS.slice(1)) {
    const c = await una(`select id from ordini_fornitore_documenti where testata_id = $1 and tipo = $2 and numero = $3`, [pratica, d.tipo, d.numero]);
    if (c) { console.log(d.tipo, d.numero, 'già presente'); continue; }
    const arrivo = await carica(d);
    const r = await fetch(BASE + '/api/pratiche/' + pratica + '/documenti', {
      method: 'POST', headers: { cookie, 'x-csrf-token': csrf, 'content-type': 'application/json' },
      body: JSON.stringify({ tipo: d.tipo, numero: d.numero, data: d.data, importo: d.importo, arrivo_id: Number(arrivo) }),
    });
    if (!r.ok) throw new Error('registra ' + d.numero + ': ' + r.status + ' ' + JSON.stringify(await r.json().catch(() => ({}))));
    console.log(d.tipo, d.numero, 'allegato');
  }

  const n = await una(`select numero_ordine from ordini_fornitore_testata where id = $1`, [pratica]);
  console.log('URL:', BASE + '/pratiche/' + pratica, '(' + n.numero_ordine + ')');
  console.log('In Pratiche cerca "334" oppure apri l’indirizzo qui sopra.');
  await db.end();
})().catch((e) => { console.error('ERRORE:', e.message); process.exit(1); });
