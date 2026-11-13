// Prova della pagina del registro (F5-A2, §7.11, §15.6, D-31): filtri combinabili, conteggi dei
// segmenti (D-23), *Stessa operazione*, riferimenti risolti dal server, dettaglio JSON, CSV con BOM,
// permesso sistema.registro e pulizia notturna (12/36 mesi).
import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configura } from '../src/main';
import { cifra } from '../src/password';
import { PrismaService } from '../src/prisma.service';
import { pulisciRegistro } from '../src/registro';
import { cella as escaper } from '../src/csv';
import { seed } from '../prisma/seed';
import { svuota } from './svuota';

let app: NestExpressApplication;
let db: PrismaService;
const DOMINIO = '@prova-registro-api.it';
const PW = 'password-di-prova';
const SEGNO = 'PROVA-REGISTRO-A2'; // testo unico: i filtri partono solo dalle righe di questa prova
const PULIZIA = 'PROVA-PULIZIA-A2';
const OPERAZIONE = '22222222-2222-4222-8222-222222222222';

async function creaUtente(username: string, ruolo: string, aree: { area: string; livello: string }[]) {
  return db.utenti.create({
    data: {
      username, email: username + DOMINIO, nome: 'Prova ' + username, ruolo,
      aree: { create: aree }, password_hash: await cifra(PW), deve_cambiare_password: false,
    },
  });
}
async function entra(utente: string) {
  const agente = request.agent(app.getHttpServer());
  await agente.post('/api/accesso/entra').send({ utente, password: PW }).expect(200);
  return agente;
}

let ammi: Awaited<ReturnType<typeof entra>>;
let oper: Awaited<ReturnType<typeof entra>>;
let lett: Awaited<ReturnType<typeof entra>>;
let ammiId: bigint;
let altroId: bigint;
let praticaId: bigint;
let documentoId: bigint;
let bollettinoId: bigint;
let fornitoreId: bigint;
let clienteId: bigint;
let subagenteId: bigint;
let liquidazioneId: bigint;

// una riga del registro con i campi che servono ai filtri
function riga(dati: Record<string, unknown>) {
  return db.registro.create({
    data: {
      genere: 'evento', livello: 'info', codice: 'crud.create', tipo: 'crud', azione: 'create',
      entita: 'pratica', entita_id: praticaId, esito: 'successo', utente_id: ammiId,
      messaggio: SEGNO, dettaglio: { etichetta: 'OF di prova' }, ...dati,
    } as never,
  });
}

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
  db = app.get(PrismaService);
  await svuota(db);
  await seed(db);
  const ammiU = await creaUtente('ammi-api', 'amministratore', [{ area: 'provvigioni', livello: 'responsabile' }, { area: 'dati', livello: 'responsabile' }]);
  await creaUtente('oper-api', 'utente', [{ area: 'provvigioni', livello: 'operatore' }]);
  await creaUtente('lett-api', 'utente', [{ area: 'provvigioni', livello: 'lettura' }]);
  const altro = await creaUtente('altro-api', 'utente', [{ area: 'provvigioni', livello: 'lettura' }]);
  [ammi, oper, lett] = await Promise.all([entra('ammi-api'), entra('oper-api'), entra('lett-api')]);
  ammiId = ammiU.id;
  altroId = altro.id;

  // entità del seed per i riferimenti (V12)
  praticaId = (await db.ordini_fornitore_testata.findFirstOrThrow({ orderBy: { id: 'asc' } })).id;
  documentoId = (await db.ordini_fornitore_documenti.findFirstOrThrow({ orderBy: { id: 'asc' } })).id;
  bollettinoId = (await db.bollettini_testata.findFirstOrThrow({ orderBy: { id: 'asc' } })).id;
  fornitoreId = (await db.fornitori.findFirstOrThrow({ orderBy: { id: 'asc' } })).id;
  clienteId = (await db.clienti.findFirstOrThrow({ orderBy: { id: 'asc' } })).id;
  subagenteId = (await db.subagenti.findFirstOrThrow({ orderBy: { id: 'asc' } })).id;
  liquidazioneId = (await db.liquidazioni.create({ data: { anno: 2099, trimestre: 4, totali: {} } })).id;

  // 50 righe generiche: servono alla pagina da 50 righe
  const base = new Date('2026-08-01T08:00:00Z').getTime();
  await db.registro.createMany({
    data: Array.from({ length: 50 }, (_, i) => ({
      genere: 'evento', livello: 'info', codice: 'crud.create', tipo: 'crud', azione: 'create',
      entita: 'pratica', entita_id: praticaId, esito: 'successo', utente_id: ammiId,
      messaggio: SEGNO + ' generica ' + i, dettaglio: { etichetta: 'OF di prova' },
      ts: new Date(base + i * 3600_000),
    })),
  });

  // righe speciali: errore e stessa operazione, anomalie aperta e chiusa
  await riga({ livello: 'errore', codice: 'errore.error', tipo: 'errore', azione: 'error', esito: 'errore', messaggio: SEGNO + ' errore', operazione_id: OPERAZIONE, ts: new Date('2026-09-04T09:00:00Z'), dettaglio: { etichetta: 'OF in errore', rotta: '/api/x' } });
  await riga({ operazione_id: OPERAZIONE, utente_id: altroId, messaggio: SEGNO + ' operazione', ts: new Date('2026-09-04T10:00:00Z') });
  await riga({ genere: 'anomalia', livello: 'errore', codice: 'lettura.fallita', tipo: null, azione: null, entita: null, entita_id: null, esito: null, servizio: 'lettura', stato: 'aperta', messaggio: SEGNO + ' anomalia aperta', ts: new Date('2026-09-04T11:00:00Z'), dettaglio: { etichetta: 'documento' } });
  await riga({ genere: 'anomalia', livello: 'attenzione', codice: 'integra.lenta', tipo: null, azione: null, entita: null, entita_id: null, esito: null, servizio: 'integra', stato: 'chiusa', messaggio: SEGNO + ' anomalia chiusa', ts: new Date('2026-09-05T11:00:00Z'), dettaglio: { etichetta: 'integrazione' } });

  // riferimenti alle pagine vere
  await riga({ codice: 'bollettino.create', tipo: 'crud', entita: 'bollettino', entita_id: bollettinoId, messaggio: SEGNO + ' bollettino', ts: new Date('2026-09-06T10:00:00Z'), dettaglio: { etichetta: 'Bollettino di prova' } });
  await riga({ codice: 'liquidazione.change_state', tipo: 'stato', azione: 'change_state', entita: 'liquidazione', entita_id: liquidazioneId, messaggio: SEGNO + ' liquidazione', ts: new Date('2026-09-06T11:00:00Z'), dettaglio: { etichetta: 'Liquidazione di prova', periodo: { anno: 2099, trimestre: 4 } } });
  await riga({ codice: 'documento.create', tipo: 'documento', azione: 'create', entita: 'documento', entita_id: documentoId, messaggio: SEGNO + ' documento', ts: new Date('2026-09-06T12:00:00Z'), dettaglio: { etichetta: 'Fattura di prova' } });
  await riga({ codice: 'crud.update', tipo: 'crud', azione: 'update', entita: 'fornitore', entita_id: fornitoreId, messaggio: SEGNO + ' fornitore', ts: new Date('2026-09-06T13:00:00Z') });
  await riga({ codice: 'crud.update', tipo: 'crud', azione: 'update', entita: 'cliente', entita_id: clienteId, messaggio: SEGNO + ' cliente', ts: new Date('2026-09-06T14:00:00Z') });
  await riga({ codice: 'crud.update', tipo: 'crud', azione: 'update', entita: 'subagente', entita_id: subagenteId, messaggio: SEGNO + ' subagente', ts: new Date('2026-09-06T15:00:00Z') });
  await riga({ codice: 'crud.update', tipo: 'crud', azione: 'update', entita: 'utente', entita_id: ammiId, messaggio: SEGNO + ' utente', ts: new Date('2026-09-06T16:00:00Z') });

  // ricerca nel codice e nell'etichetta del dettaglio
  await riga({ codice: 'prova.codice-unico', messaggio: SEGNO + ' codice', ts: new Date('2026-09-07T10:00:00Z') });
  await riga({ codice: 'crud.create', messaggio: SEGNO + ' etichetta', ts: new Date('2026-09-07T11:00:00Z'), dettaglio: { etichetta: 'Riferimento unico cercabile' } });
}, 120_000);

afterAll(async () => {
  await svuota(db);
  await app.close();
});

const elenco = async (query = '') => (await ammi.get('/api/registro?q=' + encodeURIComponent(SEGNO) + query).expect(200)).body;

describe('F5-A2 elenco del registro', () => {
  it('filtri combinati, ordinamento e pagine sul server', async () => {
    const tutti = await elenco();
    expect(tutti.totale).toBe(63);
    expect(tutti.per_pagina).toBe(25); // conservazione del seed, §7.15
    expect(tutti.pagine).toBe(3);
    expect(tutti.righe).toHaveLength(25);
    expect(tutti.conteggi).toEqual({ tutto: 63, aperte: 1, errori: 2 });

    const seconda = await elenco('&pagina=2');
    expect(seconda.righe).toHaveLength(13);

    const eventi = await elenco('&genere=evento');
    expect(eventi.righe.every((r: { genere: string }) => r.genere === 'evento')).toBe(true);
    expect(eventi.totale).toBe(61);

    const info = await elenco('&genere=evento&livello=info');
    expect(info.totale).toBe(60);

    const giorno = await elenco('&dal=2026-09-05&al=2026-09-05');
    expect(giorno.totale).toBe(1);
    expect(giorno.righe[0].messaggio).toContain('anomalia chiusa');

    // ordine predefinito: ts decrescente; con ordina/dir il server cambia colonna
    expect(tutti.righe[0].messaggio).toContain('etichetta');
    const cresc = await elenco('&ordina=ts&dir=asc');
    expect(cresc.righe[0].messaggio).toContain('generica 0');
    const perCodice = await elenco('&ordina=codice&dir=asc');
    expect(perCodice.righe[0].codice).toBe('bollettino.create');
  });

  it('conteggi dei segmenti sugli altri filtri (D-23)', async () => {
    const soloAnomalie = await elenco('&genere=anomalia');
    expect(soloAnomalie.conteggi).toEqual({ tutto: 2, aperte: 1, errori: 1 });

    const aperti = await ammi.get('/api/registro?q=' + encodeURIComponent(SEGNO) + '&vista=aperte').expect(200);
    expect(aperti.body.totale).toBe(1);
    expect(aperti.body.conteggi).toEqual({ tutto: 63, aperte: 1, errori: 2 });

    const errori = await ammi.get('/api/registro?q=' + encodeURIComponent(SEGNO) + '&vista=errori').expect(200);
    expect(errori.body.totale).toBe(2);
  });

  it('filtri servizio, codice, entità, utenti multipli, ricerca e *Stessa operazione*', async () => {
    expect((await elenco('&servizio=lettura')).totale).toBe(1);
    expect((await elenco('&codice=errore.error')).totale).toBe(1);
    expect((await elenco('&entita=pratica')).totale).toBe(54);
    expect((await elenco('&utenti=' + ammiId)).totale).toBe(62);
    expect((await elenco('&utenti=' + ammiId + ',' + altroId)).totale).toBe(63);
    expect((await elenco('&utenti=' + altroId)).totale).toBe(1);
    const cerca = async (testo: string) => (await ammi.get('/api/registro?q=' + encodeURIComponent(testo)).expect(200)).body;
    expect((await cerca(SEGNO + ' codice')).totale).toBe(1);
    const cercaCodice = await cerca('prova.codice-unico');
    expect(cercaCodice.totale).toBe(1);
    expect((await cerca('Riferimento unico')).totale).toBe(1);

    const stessa = await elenco('&operazione=' + OPERAZIONE);
    expect(stessa.totale).toBe(2);
    expect(new Set(stessa.righe.map((r: { operazione_id: string }) => r.operazione_id))).toEqual(new Set([OPERAZIONE]));
    await ammi.get('/api/registro?operazione=non-un-uuid').expect(400);
  });

  it('riferimento alla pagina vera, risolto dal server', async () => {
    const r = await elenco();
    const rif = (testo: string) => r.righe.find((x: { messaggio: string }) => x.messaggio.includes(testo))!.riferimento;
    expect(rif('generica 49')).toEqual({ testo: 'OF di prova', href: '/pratiche/' + praticaId });
    expect(rif('documento')).toEqual({ testo: 'Fattura di prova', href: '/documenti/' + documentoId });
    expect(rif('bollettino')).toEqual({ testo: 'Bollettino di prova', href: '/bollettini/' + bollettinoId });
    expect(rif('liquidazione')).toEqual({ testo: 'Liquidazione di prova', href: '/liquidazioni/2099/4' });
    expect(rif('fornitore').href).toBe('/fornitori/' + fornitoreId);
    expect(rif('cliente').href).toBe('/clienti/' + clienteId);
    expect(rif('subagente').href).toBe('/subagenti/' + subagenteId);
    expect(rif('utente').href).toBe('/utenti/' + ammiId);
    expect(rif('anomalia aperta')).toEqual({ testo: 'documento', href: null });
  });

  it('dettaglio: tutti i campi e il dettaglio JSON', async () => {
    const lista = await elenco('&operazione=' + OPERAZIONE);
    const id = lista.righe.find((x: { livello: string }) => x.livello === 'errore').id;
    const d = (await ammi.get('/api/registro/' + id).expect(200)).body;
    expect(d).toMatchObject({
      id, livello: 'errore', codice: 'errore.error', operazione_id: OPERAZIONE,
      riferimento: { testo: 'OF in errore', href: '/pratiche/' + praticaId },
      dettaglio: { etichetta: 'OF in errore', rotta: '/api/x' },
      utente: { id: String(ammiId), nome: 'Prova ammi-api', email: 'ammi-api' + DOMINIO },
    });
    expect(d.sessione_id).toBeUndefined();
    expect(d.ip).toBeNull();
    expect(d.visto_il).toBeNull();
    expect(d.chiusa_il).toBeNull();
    await ammi.get('/api/registro/999999999').expect(404);
  });

  it('esportazione CSV: colonne fisse, punto e virgola, secondi, UTF-8 con BOM', async () => {
    const r = await ammi.get('/api/registro/export?q=' + encodeURIComponent(SEGNO)).expect(200);
    expect(r.headers['content-type']).toContain('text/csv');
    expect(r.headers['content-disposition']).toMatch(/Registro_\d{4}-\d{2}-\d{2}\.csv/);
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    const testo: string = r.text ?? Buffer.from(r.body).toString('utf8');
    expect(testo.charCodeAt(0)).toBe(0xfeff);
    const righe = testo.slice(1).split('\r\n');
    expect(righe[0]).toBe('ts;genere;livello;codice;utente;servizio;entita;entita_id;esito;messaggio;dettaglio');
    expect(righe).toHaveLength(64); // intestazione + le 63 righe della prova
    expect(righe.join('\n')).toContain('OF di prova');
    expect(righe.join('\n')).toContain('Prova ammi-api');
    expect(righe.join('\n')).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}/);
  });

  it('le GET non scrivono eventi e il registro è in sola lettura', async () => {
    const prima = await db.registro.count();
    await ammi.get('/api/registro').expect(200);
    await ammi.get('/api/registro/export').expect(200);
    const id = (await db.registro.findFirstOrThrow({ orderBy: { id: 'desc' } })).id;
    await ammi.get('/api/registro/' + id).expect(200);
    expect(await db.registro.count()).toBe(prima);

    const io = (await ammi.get('/api/accesso/io').expect(200)).body;
    await ammi.post('/api/registro').set('x-csrf-token', io.csrf).send({}).expect(404);
    await ammi.delete('/api/registro/1').set('x-csrf-token', io.csrf).expect(404);
  });

  it('permesso sistema.registro: amministratore sì, operatore e sola lettura no', async () => {
    await ammi.get('/api/registro').expect(200);
    for (const agente of [oper, lett]) {
      await agente.get('/api/registro').expect(403);
      await agente.get('/api/registro/export').expect(403);
      await agente.get('/api/registro/1').expect(403);
    }
  });

  it('un 4xx di validazione si registra come rifiuto, non come errore (A8-02, C1)', async () => {
    const io = (await ammi.get('/api/accesso/io').expect(200)).body;
    await ammi.put('/api/fornitori/' + fornitoreId).set('x-csrf-token', io.csrf).send({ giorno_bollettino: 40 }).expect(400);
    const riga = await db.registro.findFirst({ where: { codice: 'crud.update', esito: 'negato' }, orderBy: { id: 'desc' } });
    expect(riga).not.toBeNull();
    expect(riga!.entita).toBe('fornitori');
    expect(riga!.livello).toBe('attenzione'); // non conta fra gli «errori di oggi» (§15.6)
    expect(riga!.utente_id).toBe(ammiId);
    expect(riga!.dettaglio).toMatchObject({ errore: { campo: 'giorno_bollettino', messaggio: 'valore non valido' } });
  });

  it('un 400 senza accesso non si registra (C1)', async () => {
    const prima = await db.registro.count({ where: { codice: 'crud.create', entita: 'accesso' } });
    await request(app.getHttpServer()).post('/api/accesso/entra').send({}).expect(400);
    expect(await db.registro.count({ where: { codice: 'crud.create', entita: 'accesso' } })).toBe(prima);
  });

  it('un rifiuto non porta nel dettaglio il valore inviato (C1, D-85)', async () => {
    const io = (await ammi.get('/api/accesso/io').expect(200)).body;
    await ammi.put('/api/accesso/profilo').set('x-csrf-token', io.csrf).send({ ingressi: { 'AREA-FINTA': '/' } }).expect(400);
    const riga = await db.registro.findFirst({ where: { codice: 'crud.update', esito: 'negato', entita: 'accesso' }, orderBy: { id: 'desc' } });
    expect(riga).not.toBeNull();
    expect(JSON.stringify(riga!.dettaglio)).not.toContain('AREA-FINTA');
    expect(riga!.dettaglio).toMatchObject({ errore: { messaggio: 'valore non valido' } });
  });

  it('filtro per giorno: i bordi dell\'ora di Roma (A3-12)', async () => {
    await db.$executeRaw`
      INSERT INTO registro (genere, livello, codice, tipo, azione, entita, esito, messaggio, dettaglio, ts)
      VALUES ('evento', 'info', 'crud.create', 'crud', 'create', 'pratica', 'successo', ${SEGNO + ' bordo sera'}, '{"etichetta":"x"}'::jsonb, ('2026-09-05 23:30:00'::timestamp AT TIME ZONE 'Europe/Rome'))`;
    await db.$executeRaw`
      INSERT INTO registro (genere, livello, codice, tipo, azione, entita, esito, messaggio, dettaglio, ts)
      VALUES ('evento', 'info', 'crud.create', 'crud', 'create', 'pratica', 'successo', ${SEGNO + ' bordo notte'}, '{"etichetta":"x"}'::jsonb, ('2026-09-06 00:30:00'::timestamp AT TIME ZONE 'Europe/Rome'))`;
    const sera = await elenco('&dal=2026-09-05&al=2026-09-05');
    expect(sera.righe.some((r: { messaggio: string }) => r.messaggio.includes('bordo sera'))).toBe(true);
    expect(sera.righe.some((r: { messaggio: string }) => r.messaggio.includes('bordo notte'))).toBe(false);
    const notte = await elenco('&dal=2026-09-06&al=2026-09-06');
    expect(notte.righe.some((r: { messaggio: string }) => r.messaggio.includes('bordo notte'))).toBe(true);
    expect(notte.righe.some((r: { messaggio: string }) => r.messaggio.includes('bordo sera'))).toBe(false);
  });
});

describe('F5-A2 pulizia notturna', () => {
  it('12 mesi per le informazioni, 36 per il resto, mai le anomalie aperte', async () => {
    const ora = new Date('2026-09-04T12:00:00Z');
    const mesiFa = (n: number) => {
      const d = new Date(ora);
      d.setMonth(d.getMonth() - n);
      return d;
    };
    await riga({ genere: 'evento', livello: 'info', codice: 'crud.create', messaggio: PULIZIA + ' info vecchia', ts: mesiFa(13) });
    await riga({ genere: 'evento', livello: 'errore', codice: 'errore.error', tipo: 'errore', azione: 'error', esito: 'errore', messaggio: PULIZIA + ' errore vecchio', ts: mesiFa(13) });
    await riga({ genere: 'anomalia', livello: 'errore', codice: 'prova.chiusa', servizio: 'app', stato: 'chiusa', messaggio: PULIZIA + ' anomalia chiusa', ts: mesiFa(37), dettaglio: { etichetta: 'chiusa' } });
    await riga({ genere: 'anomalia', livello: 'errore', codice: 'prova.aperta', servizio: 'app', stato: 'aperta', messaggio: PULIZIA + ' anomalia aperta', ts: mesiFa(37), dettaglio: { etichetta: 'aperta' } });

    await pulisciRegistro(db, ora);

    expect(await db.registro.count({ where: { messaggio: PULIZIA + ' info vecchia' } })).toBe(0);
    expect(await db.registro.count({ where: { messaggio: PULIZIA + ' errore vecchio' } })).toBe(1);
    expect(await db.registro.count({ where: { messaggio: PULIZIA + ' anomalia chiusa' } })).toBe(0);
    expect(await db.registro.count({ where: { messaggio: PULIZIA + ' anomalia aperta' } })).toBe(1);
  });
});

describe('CSV del registro: formula injection', () => {
  it('un valore che comincia con =, +, @, tab o - non seguito da cifra è preceduto dall\'apice', () => {
    expect(escaper('=1+1')).toBe("'=1+1");
    expect(escaper('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(escaper('+testo')).toBe("'+testo");
    expect(escaper('\tX')).toBe("'\tX");
    expect(escaper('-abc')).toBe("'-abc");
    expect(escaper('-12,50')).toBe('-12,50'); // numero negativo: resta numero
    expect(escaper('normale')).toBe('normale');
  });
});
