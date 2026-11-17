import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configura } from '../src/main';
import { cifra } from '../src/password';
import { ricalcolaDocumentiAperti } from '../src/pratiche';
import { PrismaService } from '../src/prisma.service';
import { svuota } from './svuota';
import { seed } from '../prisma/seed';

// D-199 §19: impostazione «Raggruppamento» sul fornitore e deroga sulla pratica. Il server valida, scrive
// l'evento (prima/dopo + motivo) e ricalcola gli aperti; i congelati restano (D-183). V12/V13.

let app: NestExpressApplication;
let db: PrismaService;
const DOMINIO = '@prova-raggruppamento.it';
const PW = 'password-di-prova';

async function creaUtente(username: string, livello: string, dati: string | null) {
  await db.utenti.create({
    data: {
      username, email: username + DOMINIO, nome: 'Prova ' + username, ruolo: 'utente',
      aree: { create: [{ area: 'provvigioni', livello }, ...(dati ? [{ area: 'dati', livello: dati }] : [])] },
      password_hash: await cifra(PW), deve_cambiare_password: false,
    },
  });
}
async function apri(utente: string) {
  const agente = request.agent(app.getHttpServer());
  const csrf = (await agente.post('/api/accesso/entra').send({ utente, password: PW }).expect(200)).body.csrf as string;
  return {
    get: (p: string) => agente.get('/api' + p),
    put: (p: string, b: object) => agente.put('/api' + p).set('x-csrf-token', csrf).send(b),
  };
}
let op: Awaited<ReturnType<typeof apri>>, lett: Awaited<ReturnType<typeof apri>>;

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
  db = app.get(PrismaService);
  await svuota(db);
  await seed(db);
  // chi cambia le condizioni del fornitore (dati.condizioni) e la deroga (provvigioni.modifica)
  await creaUtente('ammi-ragg', 'responsabile', 'responsabile');
  await creaUtente('op-ragg', 'operatore', null); // deroga sì, fornitore no
  await creaUtente('lett-ragg', 'lettura', null); // solo consulta
  op = await apri('op-ragg');
  lett = await apri('lett-ragg');
}, 120_000);

afterAll(async () => {
  const utenti = (await db.utenti.findMany({ where: { email: { endsWith: DOMINIO } } })).map((u) => u.id);
  await db.$transaction([
    db.$executeRaw`SET LOCAL decobrands.pulizia_registro = 'si'`,
    db.registro.deleteMany({ where: { utente_id: { in: utenti } } }),
    db.sessioni.deleteMany({ where: { utente_id: { in: utenti } } }),
    db.utenti.deleteMany({ where: { id: { in: utenti } } }),
  ]);
  await svuota(db);
  await app.close();
});

describe('raggruppamento sul fornitore e deroga sulla pratica (D-199)', () => {
  it('fornitore: il valore non valido è rifiutato, il responsabile lo cambia e scrive l\'evento', async () => {
    const ammi = await apri('ammi-ragg');
    const f = await db.fornitori.findFirstOrThrow();
    await ammi.put(`/fornitori/${f.id}`, { raggruppamento: 'strano' }).expect(400);
    const r = await ammi.put(`/fornitori/${f.id}`, { raggruppamento: 'riga' }).expect(200);
    expect(r.body.raggruppamento).toBe('riga');
    expect((await db.fornitori.findUniqueOrThrow({ where: { id: f.id } })).raggruppamento).toBe('riga');
    const ev = await db.registro.findFirst({ where: { codice: 'crud.update', entita: 'fornitore', entita_id: f.id }, orderBy: { id: 'desc' } });
    expect(ev!.dettaglio).toMatchObject({ prima: { raggruppamento: 'documento' }, dopo: { raggruppamento: 'riga' } });
    await ammi.put(`/fornitori/${f.id}`, { raggruppamento: 'documento' }).expect(200); // ripristina
  });

  it('fornitore: chi non ha dati.condizioni non lo cambia (403)', async () => {
    const f = await db.fornitori.findFirstOrThrow();
    await lett.put(`/fornitori/${f.id}`, { raggruppamento: 'riga' }).expect(403);
  });

  it('deroga: motivo obbligatorio (400), poi la scrive con l\'evento e la pagina la espone', async () => {
    const t = await db.ordini_fornitore_testata.findFirstOrThrow({ where: { documenti: { some: { tipo: 'fattura' } } }, orderBy: { id: 'asc' } });
    await op.put(`/pratiche/${t.id}/raggruppamento`, { raggruppamento: 'riga' }).expect(400);
    const r = await op.put(`/pratiche/${t.id}/raggruppamento`, { raggruppamento: 'riga', motivo: 'il fornitore applica la % per riga' }).expect(200);
    expect(r.body).toMatchObject({ raggruppamento: 'riga', raggruppamento_da: 'pratica' });
    expect((await db.ordini_fornitore_testata.findUniqueOrThrow({ where: { id: t.id } })).raggruppamento).toBe('riga');
    const ev = await db.registro.findFirst({ where: { codice: 'crud.update', entita: 'pratica', entita_id: t.id }, orderBy: { id: 'desc' } });
    expect(ev!.dettaglio).toMatchObject({ prima: { raggruppamento: null }, dopo: { raggruppamento: 'riga' }, motivo: 'il fornitore applica la % per riga' });
    // il dettaglio espone raggruppamento, da e motivo
    const dett = (await op.get(`/pratiche/${t.id}`).expect(200)).body;
    expect(dett.raggruppamento).toBe('riga');
    expect(dett.raggruppamento_da).toBe('pratica');
    expect(dett.raggruppamento_motivo).toBe('il fornitore applica la % per riga');
    // null = come il fornitore
    await op.put(`/pratiche/${t.id}/raggruppamento`, { raggruppamento: null, motivo: 'torna come il fornitore' }).expect(200);
    expect((await db.ordini_fornitore_testata.findUniqueOrThrow({ where: { id: t.id } })).raggruppamento).toBeNull();
  });

  it('deroga: chi non ha provvigioni.modifica non la scrive (403)', async () => {
    const t = await db.ordini_fornitore_testata.findFirstOrThrow({ orderBy: { id: 'asc' } });
    await lett.put(`/pratiche/${t.id}/raggruppamento`, { raggruppamento: 'riga', motivo: 'x' }).expect(403);
  });

  it('rilievo 8: il motivo della deroga si legge dal campo esplicito, non dall\'ultimo crud.update', async () => {
    const t = await db.ordini_fornitore_testata.findFirstOrThrow({ where: { documenti: { some: { tipo: 'fattura' } } }, orderBy: { id: 'asc' } });
    await op.put(`/pratiche/${t.id}/raggruppamento`, { raggruppamento: 'riga', motivo: 'motivo della deroga' }).expect(200);
    // un ipotetico altro crud.update sulla pratica, più recente e senza `campo`: non deve confondere la lettura
    await db.registro.create({
      data: {
        genere: 'evento', livello: 'info', codice: 'crud.update', tipo: 'crud', azione: 'update', entita: 'pratica', entita_id: t.id, esito: 'successo',
        dettaglio: { etichetta: t.numero_ordine, prima: { note: null }, dopo: { note: 'x' } },
      },
    });
    const dett = (await op.get(`/pratiche/${t.id}`).expect(200)).body;
    expect(dett.raggruppamento_motivo).toBe('motivo della deroga');
    await op.put(`/pratiche/${t.id}/raggruppamento`, { raggruppamento: null, motivo: 'ripristina' }).expect(200);
  });

  it('rilievo 3: una deroga che crea un\'anomalia di gruppo aggiorna subito l\'elenco anomalie', async () => {
    // fornitore senza lo scaglione 100 (soglie fino a 10); tolgo la soglia 0: prima soglia 5,
    // un gruppo al 2 % va sotto la prima soglia (D-202)
    const senzaTutto = await db.fornitori.findMany({ where: { scaglioni: { every: { sconto_min: { lte: 20 } } } }, select: { id: true } });
    const doc = await db.ordini_fornitore_documenti.findFirstOrThrow({
      where: { tipo: 'fattura', testata: { fornitore_id: { in: senzaTutto.map((f) => f.id) } } },
      orderBy: { id: 'asc' },
    });
    const testata = doc.testata_id;
    const { fornitore_id } = await db.ordini_fornitore_testata.findUniqueOrThrow({ where: { id: testata }, select: { fornitore_id: true } });
    const zero = await db.provvigioni_scaglioni.findFirstOrThrow({ where: { fornitore_id, sconto_min: 0 } });
    await db.provvigioni_scaglioni.deleteMany({ where: { fornitore_id, sconto_min: 0 } });
    // righe deterministiche: 2 % (merce 98) + 20 % (merce 800) → sconto medio 18,4 % (dentro), gruppo al 2 % (sotto)
    await db.ordini_fornitore_righe.deleteMany({ where: { documento_id: doc.id } });
    await db.ordini_fornitore_righe.createMany({
      data: [
        { testata_id: testata, documento_id: doc.id, fase: 'fattura', numero_riga: 1, codice: 'A', descrizione: 'A', quantita: 1, prezzo_unitario: 100, importo: 98, spesa: false },
        { testata_id: testata, documento_id: doc.id, fase: 'fattura', numero_riga: 2, codice: 'B', descrizione: 'B', quantita: 1, prezzo_unitario: 1000, importo: 800, spesa: false },
      ],
    });
    await db.ordini_fornitore_documenti.update({ where: { id: doc.id }, data: { importo: 898 } });
    // in modalità documento non c'è anomalia (sconto medio 18,4 % dentro lo scaglione 10)
    expect(await db.registro.count({ where: { genere: 'anomalia', servizio: 'provvigioni', chiave: String(testata), stato: 'aperta' } })).toBe(0);
    // la deroga al raggruppamento riga apre subito l'anomalia del gruppo (2 % sotto la prima soglia 5)
    await op.put(`/pratiche/${testata}/raggruppamento`, { raggruppamento: 'riga', motivo: 'prova' }).expect(200);
    expect(await db.registro.findFirst({ where: { genere: 'anomalia', servizio: 'provvigioni', codice: 'provvigione.gruppo_scaglione', chiave: String(testata), stato: 'aperta' } })).toBeTruthy();
    // torna come il fornitore: l'anomalia si chiude
    await op.put(`/pratiche/${testata}/raggruppamento`, { raggruppamento: null, motivo: 'ripristina' }).expect(200);
    expect(await db.registro.findFirst({ where: { genere: 'anomalia', servizio: 'provvigioni', codice: 'provvigione.gruppo_scaglione', chiave: String(testata), stato: 'aperta' } })).toBeNull();
    // ripristino la soglia 0
    await db.provvigioni_scaglioni.create({ data: { fornitore_id, sconto_min: zero.sconto_min, pct_agente: zero.pct_agente, pct_subagente: zero.pct_subagente, valido_dal: zero.valido_dal } });
  });

  it('rilievo 3: un\'anomalia di sconto medio (servizio provvigioni) si apre nel registro senza errori', async () => {
    // fornitore senza lo scaglione 100; tolgo la soglia 0: una sola riga al 2 % → sconto medio sotto la prima soglia (5)
    const senzaTutto = await db.fornitori.findMany({ where: { scaglioni: { every: { sconto_min: { lte: 20 } } } }, select: { id: true } });
    const doc = await db.ordini_fornitore_documenti.findFirstOrThrow({
      where: { tipo: 'fattura', testata: { fornitore_id: { in: senzaTutto.map((f) => f.id) } } },
      orderBy: { id: 'asc' },
    });
    const testata = doc.testata_id;
    const { fornitore_id } = await db.ordini_fornitore_testata.findUniqueOrThrow({ where: { id: testata }, select: { fornitore_id: true } });
    const zero = await db.provvigioni_scaglioni.findFirstOrThrow({ where: { fornitore_id, sconto_min: 0 } });
    await db.provvigioni_scaglioni.deleteMany({ where: { fornitore_id, sconto_min: 0 } });
    await db.ordini_fornitore_righe.deleteMany({ where: { documento_id: doc.id } });
    await db.ordini_fornitore_righe.create({
      data: { testata_id: testata, documento_id: doc.id, fase: 'fattura', numero_riga: 1, codice: 'A', descrizione: 'A', quantita: 1, prezzo_unitario: 100, importo: 98, spesa: false },
    });
    await db.ordini_fornitore_documenti.update({ where: { id: doc.id }, data: { importo: 98 } });
    // la deroga esplicita a documento ricalcola e apre l'anomalia di sconto medio (CHECK servizio 'provvigioni')
    await op.put(`/pratiche/${testata}/raggruppamento`, { raggruppamento: 'documento', motivo: 'prova' }).expect(200);
    expect(await db.registro.findFirst({ where: { genere: 'anomalia', servizio: 'provvigioni', codice: 'provvigione.sconto_medio', chiave: String(testata), stato: 'aperta' } })).toBeTruthy();
    await op.put(`/pratiche/${testata}/raggruppamento`, { raggruppamento: null, motivo: 'ripristina' }).expect(200);
    // ripristino la soglia 0
    await db.provvigioni_scaglioni.create({ data: { fornitore_id, sconto_min: zero.sconto_min, pct_agente: zero.pct_agente, pct_subagente: zero.pct_subagente, valido_dal: zero.valido_dal } });
  });

  it('cambio del raggruppamento sul fornitore: l\'aperto si ricalcola, il congelato resta (D-183)', async () => {
    const gries = (await db.provvigioni_eccezioni.findFirstOrThrow()).fornitore_id;
    const aperti = await db.ordini_fornitore_documenti.findMany({
      where: { testata: { fornitore_id: gries }, tipo: 'fattura', congelato_il: null },
      orderBy: { id: 'asc' },
    });
    expect(aperti.length).toBeGreaterThanOrEqual(2);
    await db.$transaction((tx) => ricalcolaDocumentiAperti(tx, gries));
    await db.ordini_fornitore_documenti.update({ where: { id: aperti[1].id }, data: { congelato_il: new Date() } });
    const congelatoPrima = (await db.ordini_fornitore_documenti.findUniqueOrThrow({ where: { id: aperti[1].id } })).calcolo;
    const ammi = await apri('ammi-ragg');
    await ammi.put(`/fornitori/${gries}`, { raggruppamento: 'riga' }).expect(200);
    const apertoDopo = (await db.ordini_fornitore_documenti.findUniqueOrThrow({ where: { id: aperti[0].id } })).calcolo as { raggruppamento?: string };
    const congelatoDopo = (await db.ordini_fornitore_documenti.findUniqueOrThrow({ where: { id: aperti[1].id } })).calcolo;
    expect(apertoDopo.raggruppamento).toBe('riga'); // l'aperto riflette il nuovo raggruppamento
    expect(congelatoDopo).toEqual(congelatoPrima); // il congelato resta come alla chiusura
    await ammi.put(`/fornitori/${gries}`, { raggruppamento: 'documento' }).expect(200); // ripristina
  });
});
