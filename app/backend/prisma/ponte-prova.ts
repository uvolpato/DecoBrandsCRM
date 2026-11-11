import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';

// Crea/riempie il ponte finto decobrands_ponte_prova. Rilanciabile da zero: tocca solo quel database.
// Eseguito con ts-node. Non scrive mai stringhe di connessione nell'output.

const sql = readFileSync(join(__dirname, 'ponte-prova.sql'), 'utf8');

type Cliente = { codice_integra: string; nome: string; piva: string; citta?: string; indirizzo?: string };
type Fornitore = { codice_integra: string; nome: string; piva: string; paese: string; attivo: boolean };

const dati = JSON.parse(readFileSync(join(__dirname, 'seed', 'dati-prova.json'), 'utf8'));

function idDaCodice(c: string) {
  const m = String(c).match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

async function ammin() {
  const base = urlDatabase('postgres');
  const pool = new Pool({ connectionString: base });
  try {
    const esiste = await pool.query("SELECT 1 FROM pg_database WHERE datname = 'decobrands_ponte_prova'");
    if (esiste.rowCount === 0) await pool.query('CREATE DATABASE decobrands_ponte_prova');
  } finally {
    await pool.end();
  }
}

/** Stesso indirizzo e stesso utente di DATABASE_URL, con un altro nome di database. */
function urlDatabase(nome: string) {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL non definita in .env');
  const u = new URL(process.env.DATABASE_URL);
  u.pathname = '/' + nome;
  return u.toString();
}

async function creaRuolo(pool: Pool) {
  try {
    await pool.query("CREATE ROLE crm_lettura LOGIN PASSWORD 'crm_lettura_prova'");
  } catch (e) {
    const c = String((e as { code?: string }).code);
    if (c !== '42710') { console.log('avviso: ruolo crm_lettura non creato (permessi insufficienti)'); return false; }
  }
  try {
    await pool.query('GRANT CONNECT ON DATABASE decobrands_ponte_prova TO crm_lettura');
    await pool.query('GRANT SELECT ON public.integra_v_clienti, public.integra_v_fornitori TO crm_lettura');
  } catch {
    console.log('avviso: privilegi non concessi al ruolo crm_lettura (permessi insufficienti)');
    return false;
  }
  return true;
}

async function main() {
  await ammin();
  const pool = new Pool({ connectionString: urlDatabase('decobrands_ponte_prova') });
  try {
    await pool.query('DROP TABLE IF EXISTS public.integra_v_clienti, public.integra_v_fornitori CASCADE');
    await pool.query(sql);
    const ruoloOk = await creaRuolo(pool);

    const clienti: Cliente[] = dati.clienti || [];
    const fornitori: Fornitore[] = dati.fornitori || [];

    const idc = new Set<number>();
    for (const c of clienti) {
      const id = idDaCodice(c.codice_integra);
      if (idc.has(id)) throw new Error('id_integra duplicato in integra_v_clienti');
      idc.add(id);
    }
    const idf = new Set<number>();
    for (const f of fornitori) {
      const id = idDaCodice(f.codice_integra);
      if (idf.has(id)) throw new Error('id_integra duplicato in integra_v_fornitori');
      idf.add(id);
    }

    for (const c of clienti) {
      await pool.query(
        `INSERT INTO public.integra_v_clienti (id_integra, codice, ragione_sociale, piva, codice_fiscale, indirizzo, cap, citta, provincia, paese, email, pec, codice_agente, attivo, modificato_il)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [idDaCodice(c.codice_integra), c.codice_integra, c.nome, c.piva, null, c.indirizzo || null, null, c.citta || null, null, 'Italia', null, null, null, true, '2026-09-04T09:00:00Z']
      );
    }
    for (const f of fornitori) {
      await pool.query(
        `INSERT INTO public.integra_v_fornitori (id_integra, codice, ragione_sociale, piva, codice_fiscale, indirizzo, cap, citta, provincia, paese, email, pec, attivo, modificato_il)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [idDaCodice(f.codice_integra), f.codice_integra, f.nome, f.piva, null, null, null, null, null, f.paese, null, null, f.attivo !== false, '2026-09-04T09:00:00Z']
      );
    }

    console.log(`ponte-prova: ${clienti.length} clienti, ${fornitori.length} fornitori in decobrands_ponte_prova (schema public)`);
    console.log(`ruolo crm_lettura: ${ruoloOk ? 'creato/privilegiati' : 'avviso: controlla permessi'}`);
  } catch (e) {
    console.error('errore:', (e instanceof Error ? e.message : String(e)).replace(/postgres(?:ql)?:\/\/\S+/gi, '[indirizzo rimosso]').replace(/password\s*=\s*\S+/gi, 'password=[rimossa]'));
    process.exit(1);
  } finally {
    await pool.end();
  }
}

void main();
