// Prova del comando del superutente (passo 1.9, §3.3, D-39).
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as posta from '../src/posta';
import { verifica } from '../src/password';
import { crea } from '../src/superutente';

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

afterAll(async () => {
  const su = await db.utenti.findMany({ where: { email: { endsWith: '@prova-superutente.it' } } });
  await db.$transaction([
    db.$executeRaw`SET LOCAL decobrands.pulizia_registro = 'si'`,
    db.registro.deleteMany({ where: { entita_id: { in: su.map((u) => u.id) }, entita: 'utente' } }),
    db.utenti.deleteMany({ where: { id: { in: su.map((u) => u.id) } } }),
  ]);
  await db.$disconnect();
});

it('crea il superutente con password provvisoria per email; il secondo è rifiutato', async () => {
  const spia = jest.spyOn(posta, 'invia').mockResolvedValue();
  const u = await crea(['Capo', 'Capo@Prova-Superutente.it', 'Ugo Volpato']);
  expect(u).toMatchObject({ username: 'capo', email: 'capo@prova-superutente.it', ruolo: 'superutente', deve_cambiare_password: true });

  const email = spia.mock.calls[0][3];
  const password = email.testo.match(/password provvisoria: (\S+)/)![1];
  expect(password).toHaveLength(12);
  expect(await verifica(password, u.password_hash)).toBe(true);
  expect(await db.registro.count({ where: { codice: 'auth.password_temp', entita_id: u.id } })).toBe(1);

  await expect(crea(['altro', 'altro@prova-superutente.it', 'Altro'])).rejects.toThrow('esiste già');
  await expect(crea(['solo'])).rejects.toThrow('uso:');
  spia.mockRestore();
});
