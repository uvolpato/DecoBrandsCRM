// Prova a mano del connettore di lettura (F6-A2, D-67), senza passare dalla coda:
//   npm run build && npm run lettura:prova -- "C:\...\fattura.pdf" [schema.json]
// Usa il connettore e la chiave salvati in Impostazioni → Server di lettura. Stampa i campi con
// affidabilità e posizione; non scrive nulla nel database.
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { letturaConfig } from './impostazioni';
import { PROMPT_DOCUMENTO, SCHEMA_DOCUMENTO } from './lettura';
import { leggiDocumento } from './lettore';

async function main(argv: string[]) {
  const [file, schemaFile] = argv;
  if (!file) throw new Error('uso: npm run lettura:prova -- <file.pdf|foto> [schema.json]');
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, options: '-c TimeZone=UTC' }) });
  try {
    const c = await letturaConfig(db);
    if (!c) throw new Error('Server di lettura non configurato: in Impostazioni → Server di lettura scegli il connettore e salva la chiave API.');
    const dati = await readFile(file);
    const schema = schemaFile ? JSON.parse(await readFile(schemaFile, 'utf8')) : SCHEMA_DOCUMENTO;
    const r = await leggiDocumento(c, basename(file), dati, schema, PROMPT_DOCUMENTO);
    console.log(JSON.stringify(r.risultato, null, 2));
    console.log('');
    for (const x of r.campi) {
      console.log(`${x.campo}: ${x.valore ?? '—'} · affidabilità ${x.affidabilita ?? '—'} · ${x.precisione}${x.posizione ? ` · pagina ${x.posizione.pagina}` : ''}`);
    }
    console.log(`\nmodello: ${r.modello} · crediti: ${r.crediti ?? '—'}`);
  } finally {
    await db.$disconnect();
  }
}

void main(process.argv.slice(2)).catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
