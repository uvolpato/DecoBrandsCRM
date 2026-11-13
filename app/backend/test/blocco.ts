// Blocco unico per database di prova (A6-05): ogni file svuota e ricarica il database, quindi due
// giri insieme sullo stesso database si cancellano i dati a vicenda. Il blocco consultivo di
// Postgres vale per database: due giri su database diversi (DATABASE_URL_TEST) restano paralleli.
import 'dotenv/config';
import { Client } from 'pg';

const CHIAVE = 424242;

// globalSetup e globalTeardown puntano a questo file: il primo apre e blocca, il secondo sblocca.
export default async function blocco() {
  const inCorso = globalThis as typeof globalThis & { __bloccoProve?: Client };
  if (inCorso.__bloccoProve) {
    await inCorso.__bloccoProve.query('SELECT pg_advisory_unlock($1)', [CHIAVE]);
    await inCorso.__bloccoProve.end();
    delete inCorso.__bloccoProve;
    return;
  }
  const url = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL!.replace(/\/decobrands_db\b/, '/decobrands_test');
  const client = new Client({ connectionString: url });
  await client.connect();
  const esito = await client.query<{ bloccato: boolean }>('SELECT pg_try_advisory_lock($1) AS bloccato', [CHIAVE]);
  if (!esito.rows[0].bloccato) {
    await client.end();
    throw new Error("Un'altra prova sta usando decobrands_test: aspetta o usa DATABASE_URL_TEST");
  }
  inCorso.__bloccoProve = client;
}
