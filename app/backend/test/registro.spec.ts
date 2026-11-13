// Prova di logEvent (passo 1.5, §15.3–§15.4, V13).
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';
import { apriAnomalia, logEvent, logEventSicuro } from '../src/registro';


const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const annulla = new Error('annulla');
const login = {
  tipo: 'auth',
  azione: 'login',
  entita: 'utente',
  esito: 'successo' as const,
  dettaglio: { etichetta: 'ugo@decobrands.it', modo: 'email' },
};

// esegue fn in una transazione e la annulla sempre: il database resta vuoto
async function inTransazione(fn: (tx: Prisma.TransactionClient) => Promise<void>) {
  await expect(db.$transaction(async (tx) => { await fn(tx); throw annulla; })).rejects.toBe(annulla);
}

afterAll(() => db.$disconnect());

it("l'evento nasce con l'operazione e sparisce con il suo rollback", async () => {
  let id = 0n;
  await inTransazione(async (tx) => {
    id = (await logEvent(tx, login, { ip: '10.0.0.1', sessione_id: 's1' })).id;
    const r = await tx.registro.findUniqueOrThrow({ where: { id } });
    expect(r).toMatchObject({ genere: 'evento', codice: 'auth.login', livello: 'info', ip: '10.0.0.1', sessione_id: null });
  });
  expect(await db.registro.findUnique({ where: { id } })).toBeNull();
});

it('IP e sessione solo per accesso e negati (§15.1)', async () => {
  await inTransazione(async (tx) => {
    const r = await logEvent(tx, { tipo: 'crud', azione: 'create', entita: 'prova', esito: 'successo', dettaglio: { etichetta: 'x' } }, { ip: '10.0.0.1', sessione_id: 's1' });
    expect([r.ip, r.sessione_id]).toEqual([null, null]);
  });
});

it('dettaglio senza le chiavi del codice, o codice sconosciuto: errore nelle prove', async () => {
  await expect(logEvent(db, { ...login, dettaglio: { etichetta: 'x' } })).rejects.toThrow('mancano modo');
  await expect(logEvent(db, { ...login, azione: 'inventata' })).rejects.toThrow('codice sconosciuto');
  await expect(logEventSicuro(db, { ...login, azione: 'inventata' })).rejects.toThrow('codice sconosciuto');
});

it("un evento riuscito con il campo `errore` resta soggetto allo schema (C2)", async () => {
  await expect(logEvent(db, { tipo: 'crud', azione: 'update', entita: 'prova', esito: 'successo', dettaglio: { etichetta: 'x', errore: 'x' } }))
    .rejects.toThrow('mancano prima, dopo');
});

it('in esercizio un dettaglio non valido apre l\'anomalia app.dettaglio_non_valido (A8-03)', async () => {
  const prima = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    await inTransazione(async (tx) => {
      await logEvent(tx, { ...login, dettaglio: { etichetta: 'x' } });
      const an = await tx.registro.findFirst({ where: { genere: 'anomalia', codice: 'app.dettaglio_non_valido' } });
      expect(an).not.toBeNull();
    });
  } finally {
    process.env.NODE_ENV = prima;
  }
});

it('apriAnomalia atomica: due aperture insieme fanno una riga con volte = 2 (A3-09)', async () => {
  const a = { servizio: 'lettura', codice: 'lettura.fallita', chiave: 'conflitto-a3-09', messaggio: 'prova', dettaglio: { documento_id: '1', errore: 'x' } };
  try {
    await Promise.all([apriAnomalia(db, a), apriAnomalia(db, a)]);
    const righe = await db.registro.findMany({ where: { genere: 'anomalia', codice: 'lettura.fallita', chiave: 'conflitto-a3-09' } });
    expect(righe).toHaveLength(1);
    expect(righe[0].volte).toBe(2);
  } finally {
    await db.registro.deleteMany({ where: { genere: 'anomalia', codice: 'lettura.fallita', chiave: 'conflitto-a3-09' } });
  }
});
