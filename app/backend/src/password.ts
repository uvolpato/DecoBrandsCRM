import { randomBytes, randomInt, scrypt, timingSafeEqual } from 'node:crypto';

// Password con scrypt della libreria standard (D-39): nessuna dipendenza in più.
// Parametri OWASP per scrypt: N=2^15, r=8, p=3 (32 MB). Si salvano nell'hash, così si possono
// alzare in futuro senza rompere le password già salvate.
const N = 2 ** 15, R = 8, P = 3, LUNGHEZZA = 64;
export const MINIMO = 8; // ASVS 5.0 6.2.1; nessuna regola di composizione (6.2.5)
export const MASSIMO = 128;

const calcola = (password: string, sale: Buffer, n: number, r: number, p: number) =>
  new Promise<Buffer>((ok, ko) =>
    scrypt(password.normalize('NFKC'), sale, LUNGHEZZA, { N: n, r, p, maxmem: 256 * n * r }, (e, k) => (e ? ko(e) : ok(k))),
  );

export async function cifra(password: string) {
  const sale = randomBytes(16);
  const k = await calcola(password, sale, N, R, P);
  return `scrypt$${N}$${R}$${P}$${sale.toString('base64')}$${k.toString('base64')}`;
}

// Hash di riserva: per un utente che non esiste si fa lo stesso calcolo, così il tempo di
// risposta non dice se il nome utente esiste.
const FINTO = cifra(randomBytes(16).toString('hex'));

export async function verifica(password: string, hash: string | null | undefined) {
  const [tipo, n, r, p, sale, atteso] = (hash ?? (await FINTO)).split('$');
  if (tipo !== 'scrypt') return false;
  const k = await calcola(password, Buffer.from(sale, 'base64'), +n, +r, +p);
  const a = Buffer.from(atteso, 'base64');
  return hash != null && a.length === k.length && timingSafeEqual(a, k);
}

// Password provvisoria leggibile (senza 0/O, 1/l/I), 12 caratteri ≈ 70 bit.
const ALFABETO = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const provvisoria = () => Array.from({ length: 12 }, () => ALFABETO[randomInt(ALFABETO.length)]).join('');
