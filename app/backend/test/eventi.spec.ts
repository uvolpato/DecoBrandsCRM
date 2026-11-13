import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { areeDi, areeDelleRighe, EventiService, nuoveAree } from '../src/eventi';
import { configura } from '../src/main';
import { cifra } from '../src/password';
import { PrismaService } from '../src/prisma.service';
import { logEvent } from '../src/registro';
import { svuota } from './svuota';

// F4-A6: aree degli aggiornamenti dal registro (D-23, §16.4.2), ciclo di lettura e rotta SSE protetta.

let app: NestExpressApplication;
let db: PrismaService;

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
  db = app.get(PrismaService);
  await svuota(db);
  await db.utenti.create({
    data: {
      username: 'prov-eventi', email: 'prov-eventi@prova-eventi.it', nome: 'Prova Eventi', ruolo: 'utente',
      aree: { create: [{ area: 'provvigioni', livello: 'operatore' }] }, password_hash: await cifra('password-di-prova'), deve_cambiare_password: true,
    },
  });
}, 120_000);

afterAll(async () => {
  const utenti = (await db.utenti.findMany({ where: { email: { endsWith: '@prova-eventi.it' } } })).map((u) => u.id);
  await db.$transaction([
    db.sessioni.deleteMany({ where: { utente_id: { in: utenti } } }),
    db.utenti.deleteMany({ where: { id: { in: utenti } } }),
  ]);
  await app.close();
});

describe('aree degli eventi', () => {
  it('ogni prefisso porta alla sua area', () => {
    for (const [codice, area] of [
      ['pratica.create', 'pratiche'],
      ['documento.upload', 'documenti'],
      ['bollettino.update', 'bollettini'], ['calcolo.verify', 'bollettini'],
      ['liquidazione.create', 'liquidazioni'], ['provvigioni.correzione', 'liquidazioni'],
      ['fornitore.update', 'anagrafiche'], ['cliente.create', 'anagrafiche'], ['subagente.update', 'anagrafiche'],
      ['agente.update', 'anagrafiche'], ['eccezione.create', 'anagrafiche'], ['percentuale.update', 'anagrafiche'],
      ['interscambio.delete', 'anagrafiche'], ['integra.vista', 'anagrafiche'],
      ['utente.update', 'utenti'], ['auth.login', 'utenti'],
      ['impostazione.update', 'impostazioni'],
    ] as const) expect(areeDi(codice)).toEqual([area]);
    expect(areeDi('codice.sconosciuto')).toEqual([]);
    expect(areeDi('')).toEqual([]);
  });

  it('i codici generici prendono l’area dall’entità', () => {
    for (const [entita, area] of [
      ['pratica', 'pratiche'], ['documento', 'documenti'], ['bollettino', 'bollettini'],
      ['liquidazione', 'liquidazioni'], ['utente', 'utenti'], ['riga_bollettino', 'bollettini'],
    ] as const) expect(areeDi('stato.change_state', entita)).toEqual([area]);
    expect(areeDi('stato.change_state', 'altro')).toEqual([]);
    expect(areeDi('crud.create', 'pratica')).toEqual(['pratiche']);
    expect(areeDi('crud.update', 'subagente')).toEqual(['anagrafiche']);
  });

  it('più righe insieme: aree senza doppioni; nessuna area sconosciuta', () => {
    expect(areeDelleRighe([
      { codice: 'crud.create', entita: 'pratica' },
      { codice: 'crud.update', entita: 'subagente' },
      { codice: 'documento.upload', entita: 'documento' },
      { codice: 'stato.change_state', entita: 'pratica' },
      { codice: 'codice.sconosciuto', entita: null },
    ]).sort()).toEqual(['anagrafiche', 'documenti', 'pratiche']);
    expect(areeDelleRighe([])).toEqual([]);
  });

  it('il ciclo legge solo le righe nuove e si ferma dove è arrivato', async () => {
    const [r] = await db.$queryRaw<{ id: bigint | null }[]>`SELECT max(id) AS id FROM registro`;
    const prima = r.id ?? 0n;
    await logEvent(db, { tipo: 'crud', azione: 'create', entita: 'pratica', esito: 'successo', dettaglio: { etichetta: 'prova eventi' } });
    await logEvent(db, { tipo: 'crud', azione: 'create', entita: 'subagente', esito: 'successo', dettaglio: { etichetta: 'prova eventi' } });
    const visti = new Set<bigint>();
    const a = await nuoveAree(db, prima, visti);
    expect(a.aree.sort()).toEqual(['anagrafiche', 'pratiche']);
    expect(a.ultimo).toBeGreaterThan(prima);
    const b = await nuoveAree(db, a.ultimo, visti);
    expect(b).toEqual({ ultimo: a.ultimo, aree: [] });
    // registro riportato indietro (ripristino di un backup): il flusso riparte dall'ultimo id, non resta zitto
    const c = await nuoveAree(db, a.ultimo + 1000n, visti);
    expect(c).toEqual({ ultimo: a.ultimo, aree: [] });
  });

  it('un evento committato fuori ordine arriva al giro dopo (A3-06)', async () => {
    const [r] = await db.$queryRaw<{ id: bigint | null }[]>`SELECT max(id) AS id FROM registro`;
    const base = r.id ?? 0n;
    // due transazioni corte committano con id 10 e 12; la lunga (id 11) committa dopo
    await db.registro.createMany({
      data: [
        { id: base + 10n, genere: 'evento', codice: 'pratica.create', entita: 'pratica', dettaglio: {} },
        { id: base + 12n, genere: 'evento', codice: 'subagente.update', entita: 'subagente', dettaglio: {} },
      ],
    });
    const visti = new Set<bigint>();
    const a = await nuoveAree(db, base, visti);
    expect(a.aree.sort()).toEqual(['anagrafiche', 'pratiche']);
    expect(a.ultimo).toBe(base + 12n);
    // la transazione lunga committa dopo il giro che l'ha saltata: la sua area arriva
    await db.registro.create({
      data: { id: base + 11n, genere: 'evento', codice: 'documento.upload', entita: 'documento', dettaglio: {} },
    });
    const b = await nuoveAree(db, a.ultimo, visti);
    expect(b.aree).toEqual(['documenti']);
    expect(b.ultimo).toBe(base + 12n);
  });
});

describe('GET /api/eventi/flusso', () => {
  it('senza sessione 401; con la password provvisoria 403', async () => {
    await request(app.getHttpServer()).get('/api/eventi/flusso').expect(401);
    const agente = request.agent(app.getHttpServer());
    await agente.post('/api/accesso/entra').send({ utente: 'prov-eventi', password: 'password-di-prova' }).expect(200);
    const r = await agente.get('/api/eventi/flusso').expect(403);
    expect(r.body.message).toBe('cambia_password');
  });
});

describe('il flusso si chiude quando la sessione sparisce (A1-08)', () => {
  it('chiude il canale quando la riga di sessione non c\'è più', async () => {
    const eventi = app.get(EventiService);
    const sid = 'flusso-prova-a108-' + Math.random().toString(36).slice(2);
    // sessioni ha una colonna GENERATED: si inserisce a mano (come le prove di vincoli/profilo)
    await db.$executeRaw`INSERT INTO sessioni (sid, sess, expire) VALUES (${sid}, '{}'::jsonb, now() + interval '2 minutes')`;
    let sub: { unsubscribe: () => void } | undefined;
    try {
      const completato = new Promise<void>((ok) => { sub = eventi.flusso(sid, 10).subscribe({ complete: () => ok() }); });
      await db.$executeRaw`DELETE FROM sessioni WHERE sid = ${sid}`;
      await Promise.race([
        completato,
        new Promise<void>((_, ko) => setTimeout(() => ko(new Error('il flusso non si è chiuso')), 2000)),
      ]);
    } finally {
      sub?.unsubscribe();
    }
  });
});
