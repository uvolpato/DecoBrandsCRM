// Anteprima delle email del portale, senza mandarle: scrive l'HTML in una cartella da aprire nel
// browser (D-211). Stessi testi degli invii veri (stesse funzioni), con dati d'esempio.
//   npm run posta:anteprima -- <cartella>     (dopo npm run build)
import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { messaggioEmailCambiata, messaggioLinkReset, messaggioPassword, type Messaggio } from './posta';

const cartella = resolve(process.argv[2] ?? 'anteprima-posta');
mkdirSync(cartella, { recursive: true });
const prove: { nome: string; m: Messaggio }[] = [
  { nome: 'benvenuto.html', m: messaggioPassword({ email: 'mario.rossi@esempio.it', nome: 'Mario Rossi', username: 'mario.rossi' }, 'K7m2-Pq9x-4t', 'benvenuto') },
  { nome: 'password.html', m: messaggioPassword({ email: 'mario.rossi@esempio.it', nome: 'Mario Rossi', username: 'mario.rossi' }, 'K7m2-Pq9x-4t', 'password') },
  { nome: 'link-password.html', m: messaggioLinkReset('Mario Rossi', 'esempio-di-codice-lungo', 'mario.rossi@esempio.it') },
  { nome: 'email-cambiata.html', m: messaggioEmailCambiata('mario.rossi@esempio.it', { username: 'mario.rossi' }, { nome: 'Ugo Volpato' }, new Date('2026-11-20T10:30:00Z')) },
];
for (const { nome, m } of prove) {
  writeFileSync(join(cartella, nome), m.html ?? '');
  console.log(`${nome} · oggetto: ${m.oggetto}`);
}
console.log(`\nApri ${cartella} nel browser: sono solo file, nessuna email è partita.`);
