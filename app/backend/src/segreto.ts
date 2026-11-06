import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

// Cifratura dei segreti delle Impostazioni (§4.2.14, §7.15, D-65): AES-256-GCM, chiave = SHA-256
// di SEGRETI_CHIAVE (stringa lunga e casuale nel .env). I segreti si sostituiscono, mai si rileggono:
// le API restituiscono solo `impostata`; il valore cifrato non esce dal server.
// Formato salvato: v1:<iv base64>:<tag base64>:<dati base64>.

const chiave = () => {
  const s = process.env.SEGRETI_CHIAVE;
  if (!s) throw new Error('SEGRETI_CHIAVE non definita in .env: genera una stringa con `openssl rand -base64 48`');
  return createHash('sha256').update(s).digest(); // 32 byte per AES-256
};

export function cifra(testo: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', chiave(), iv);
  const dati = Buffer.concat([c.update(testo, 'utf8'), c.final()]);
  return `v1:${iv.toString('base64')}:${c.getAuthTag().toString('base64')}:${dati.toString('base64')}`;
}

/** Con una chiave diversa o un formato ignoto lancia; mai restituisce il testo cifrato in chiaro. */
export function decifra(valore: string): string {
  const parti = valore.split(':');
  if (parti.length !== 4 || parti[0] !== 'v1') throw new Error('Segreto in formato non riconosciuto');
  const [, iv, tag, dati] = parti;
  const d = createDecipheriv('aes-256-gcm', chiave(), Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  const testo = Buffer.concat([d.update(Buffer.from(dati, 'base64')), d.final()]); // d.final() lancia se la chiave non combacia
  return testo.toString('utf8');
}
