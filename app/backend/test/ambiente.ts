// Le prove usano il database decobrands_test, mai quello di sviluppo: i dati veri (il superutente,
// gli utenti creati a mano) non si toccano e le prove partono sempre da un database pulito.
// Si crea una volta (vedi app/README.md): CREATE DATABASE decobrands_test OWNER decobrands, poi le
// migrazioni con DATABASE_URL che punta a decobrands_test.
import 'dotenv/config';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.DATABASE_URL = (process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL!.replace(/\/decobrands_db\b/, '/decobrands_test'));
process.env.TENTATIVI_IP ??= '1000'; // le prove escono tutte da 127.0.0.1
process.env.DOCUMENTI_DIR = join(tmpdir(), 'decobrands-test-documenti'); // mai la cartella vera
process.env.DOCUMENTI_MAX_MB = '1'; // il limite si prova con un file piccolo
// D-209: la posta in uscita legge SMTP_* dal .env; le prove non devono usare quello di chi sviluppa
// (manderebbero email vere): partono dalle Impostazioni, o mettono i SMTP_* da sé nel test.
for (const k of ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM']) delete process.env[k];
if (!/decobrands_test/.test(process.env.DATABASE_URL)) throw new Error('Le prove girano solo su decobrands_test');
