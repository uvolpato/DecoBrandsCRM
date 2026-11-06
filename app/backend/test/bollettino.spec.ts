import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { riconciliazione } from '../src/bollettino';
import { configura } from '../src/main';
import { caricaDati, caricaDatiBollettino, giornoRoma, ultimaChiusura } from '../src/motore/dati';
import { cifra } from '../src/password';
import { PrismaService } from '../src/prisma.service';
import * as registro from '../src/registro';
import { seed } from '../prisma/seed';
import { prototipo } from './prototipo';
import { svuota } from './svuota';

// F3-A2: dettaglio del bollettino, riconciliazione "a cerniera", decisioni (D-49, D-56), abbinamento, chiusura (D-51).

/* eslint-disable @typescript-eslint/no-explicit-any */
let app: NestExpressApplication;
let db: PrismaService;
let M: any;
const DOMINIO = '@prova-bollettino.it';
const PW = 'password-di-prova';
const OGGI = giornoRoma(new Date()); // lo stesso "oggi" del server

async function creaUtente(username: string, livello: string, area = 'provvigioni') {
  await db.utenti.create({
    data: {
      username, email: username + DOMINIO, nome: 'Prova ' + username, ruolo: 'utente',
      aree: { create: [{ area, livello }] }, password_hash: await cifra(PW), deve_cambiare_password: false,
    },
  });
}
async function entra(utente: string) {
  const agente = request.agent(app.getHttpServer());
  const csrf = (await agente.post('/api/accesso/entra').send({ utente, password: PW }).expect(200)).body.csrf as string;
  return {
    get: (p: string) => agente.get('/api' + p),
    post: (p: string, b: object = {}) => agente.post('/api' + p).set('x-csrf-token', csrf).send(b),
    put: (p: string, b: object) => agente.put('/api' + p).set('x-csrf-token', csrf).send(b),
  };
}
let op: Awaited<ReturnType<typeof entra>>;
let lett: Awaited<ReturnType<typeof entra>>;
let dati: Awaited<ReturnType<typeof entra>>; // responsabile dei dati, senza l'area provvigioni

const fornitore = async (nome: string) => (await db.fornitori_versioni.findFirstOrThrow({ where: { ragione_sociale: { startsWith: nome } } })).fornitore_id;
const bollettino = async (nome: string, mese: number) => (await db.bollettini_testata.findFirstOrThrow({ where: { fornitore_id: await fornitore(nome), mese, anno: 2026 } })).id;
const documento = async (numero: string) => (await db.ordini_fornitore_documenti.findFirstOrThrow({ where: { numero } })).id;
const eventi = (codice: string, entita_id: bigint) => db.registro.count({ where: { codice, entita_id } });
const riga = (b: any, numero: string) => b.righe.find((x: any) => x.numero === numero);

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
  db = app.get(PrismaService);
  await svuota(db);
  await seed(db);
  await creaUtente('op-boll', 'operatore');
  await creaUtente('lett-boll', 'lettura');
  await creaUtente('dati-boll', 'responsabile', 'dati');
  [op, lett, dati] = await Promise.all([entra('op-boll'), entra('lett-boll'), entra('dati-boll')]);
  M = prototipo();
  M.S.oggi = OGGI;
}, 120_000);

afterAll(async () => {
  jest.restoreAllMocks();
  const utenti = (await db.utenti.findMany({ where: { email: { endsWith: DOMINIO } } })).map((u) => u.id);
  await svuota(db); // prima i bollettini: le righe decise puntano agli utenti di prova
  await db.$transaction([
    db.$executeRaw`SET LOCAL decobrands.pulizia_registro = 'si'`,
    db.registro.deleteMany({ where: { utente_id: { in: utenti } } }),
    db.sessioni.deleteMany({ where: { utente_id: { in: utenti } } }),
    db.utenti.deleteMany({ where: { id: { in: utenti } } }),
  ]);
  await app.close();
});

/** Coerenza: caricamento parziale e completo danno la stessa risposta per ogni bollettino. */
async function coerenza() {
  const S = await caricaDati(db, OGGI);
  for (const b of S.bollettini) {
    const parziale = (await caricaDatiBollettino(db, BigInt(b.id), OGGI))!;
    expect(riconciliazione(parziale, b.id)).toEqual(riconciliazione(S, b.id));
  }
  return S.bollettini.length;
}

describe('GET /api/bollettini/:id', () => {
  it('ogni bollettino del seed come il prototipo: righe, categorie, totali, azione', async () => {
    const ids = (await db.bollettini_testata.findMany({ orderBy: { id: 'asc' }, select: { id: true } })).map((b) => b.id);
    expect(ids).toHaveLength(M.S.bollettini.length);
    for (const [i, id] of ids.entries()) {
      const b = (await lett.get(`/bollettini/${id}`).expect(200)).body;
      const pb = M.S.bollettini[i], x = M.riconcilia(pb);
      const forma = (y: any) => [y.numero, y.categoria, y.loro?.importo ?? null, y.noi?.importo ?? null, y.differenza ?? null, !!y.aperta, !!y.incasso, !!y.pagamento];
      expect([b.mese, b.anno, b.stato, b.totali.riconosciuto, b.totali.calcolato, b.totali.differenza, b.totali.aperte])
        .toEqual([pb.mese, pb.anno, pb.stato, x.riconosciuto, x.atteso, x.differenza, x.aperte]);
      expect(b.righe.map(forma)).toEqual(JSON.parse(JSON.stringify(x.righe.map(forma))));
      expect(b.badge).toBe(pb.stato !== 'da_verificare' ? pb.stato : x.aperte ? 'da_verificare' : 'pronto');
    }
    // àncore di §12: Gries luglio, F-2026-0912 al 17,5 % invece del 18 %; Ing's agosto, documento che non conosciamo
    const luglio = (await lett.get(`/bollettini/${await bollettino('Gries', 7)}`).expect(200)).body;
    expect(riga(luglio, 'F-2026-0912')).toMatchObject({ categoria: 'differenza', gruppo: 'da_decidere', differenza: -32.7, scelte: ['accettato', 'contestato'] });
    expect(luglio.azione.tipo).toBe('decidi');
    const gasper = (await lett.get(`/bollettini/${await bollettino('Gasper', 8)}`).expect(200)).body;
    expect(riga(gasper, 'F-2026-0822')).toMatchObject({ categoria: 'storno', gruppo: 'incassi', scelte: [] });
    expect(riga(gasper, 'F-2026-0933')).toMatchObject({ categoria: 'mancante', id: null, scelte: ['attendere', 'contestato'] });
  });

  it('caricamento solo del bollettino = caricamento completo', async () => {
    expect(await coerenza()).toBe(7);
  });

  it('senza area provvigioni: 403; bollettino che non c\'è: 404', async () => {
    await dati.get(`/bollettini/${await bollettino('Gries', 7)}`).expect(403);
    await lett.get('/bollettini/999999').expect(404);
  });
});

describe('decisioni sulle righe (D-49)', () => {
  let id: bigint, rid: string;
  beforeAll(async () => {
    id = await bollettino('Gries', 7);
    rid = riga((await op.get(`/bollettini/${id}`)).body, 'F-2026-0912').id;
  });

  it('in sola lettura: 403', async () => {
    await lett.put(`/bollettini/${id}/righe/${rid}/decisione`, { decisione: 'accettato' }).expect(403);
  });

  it('contestare senza motivo: 400; scelta non ammessa: 400; riga che quadra: 409', async () => {
    await op.put(`/bollettini/${id}/righe/${rid}/decisione`, { decisione: 'contestato', motivo: '  ' }).expect(400);
    await op.put(`/bollettini/${id}/righe/${rid}/decisione`, { decisione: 'attendere' }).expect(400);
    await op.put(`/bollettini/${id}/righe/${rid}/decisione`, { decisione: 'boh' }).expect(400);
    const quadra = riga((await op.get(`/bollettini/${id}`)).body, 'F-2026-0891').id;
    await op.put(`/bollettini/${id}/righe/${quadra}/decisione`, { decisione: 'accettato' }).expect(409);
  });

  it('accettare: la riga passa fra le decise con chi e quando; evento; annullare la riapre', async () => {
    const b = (await op.put(`/bollettini/${id}/righe/${rid}/decisione`, { decisione: 'accettato', motivo: 'Promozione estiva' }).expect(200)).body;
    expect(riga(b, 'F-2026-0912')).toMatchObject({ gruppo: 'decise', aperta: false, decisione: { esito: 'accettato', motivo: 'Promozione estiva', da_nome: 'Prova op-boll' } });
    expect([b.totali.aperte, b.badge, b.azione.tipo]).toEqual([0, 'pronto', 'verifica']);
    expect(await eventi('crud.update', BigInt(rid))).toBe(1);
    const annullata = (await op.put(`/bollettini/${id}/righe/${rid}/decisione`, { decisione: null }).expect(200)).body;
    expect(riga(annullata, 'F-2026-0912')).toMatchObject({ gruppo: 'da_decidere', decisione: null });
    await op.put(`/bollettini/${id}/righe/${rid}/decisione`, { decisione: 'accettato' }).expect(200);
  });

  it('rollback: se il registro fallisce la decisione non resta', async () => {
    const vero = registro.logEvent;
    const spia = jest.spyOn(registro, 'logEvent').mockImplementation(async (d, e, c) => {
      if (e.entita === 'riga_bollettino') throw new Error('registro rotto');
      return vero(d, e, c);
    });
    await op.put(`/bollettini/${id}/righe/${rid}/decisione`, { decisione: 'contestato', motivo: 'no' }).expect(500);
    spia.mockRestore();
    expect((await db.bollettini_righe.findUniqueOrThrow({ where: { id: BigInt(rid) } })).decisione).toBe('accettato');
  });
});

describe('documento mancante, abbinamento e chiusura (Gasper agosto, fatturato)', () => {
  let id: bigint, gasper: bigint;
  const url = () => `/bollettini/${id}`;
  beforeAll(async () => {
    id = await bollettino('Gasper', 8);
    gasper = await fornitore('Gasper');
  });

  const attese = () => db.bollettini_attese.findMany({ where: { testata_id: id }, orderBy: { id: 'asc' } });

  it('decisione su un documento assente: va in bollettini_attese (D-56), non fra le righe; annullarla la toglie', async () => {
    const did = await documento('F-2026-0933');
    const righePrima = await db.bollettini_righe.count({ where: { testata_id: id } });
    await op.put(`${url()}/documenti/${did}/decisione`, { decisione: 'accettato' }).expect(400);
    await op.put(`${url()}/documenti/${did}/decisione`, { decisione: 'contestato' }).expect(400); // senza motivo
    let b = (await op.put(`${url()}/documenti/${did}/decisione`, { decisione: 'attendere' }).expect(200)).body;
    expect(riga(b, 'F-2026-0933')).toMatchObject({ id: null, categoria: 'mancante', gruppo: 'decise', loro: null, decisione: { esito: 'attendere', il: OGGI, da_nome: 'Prova op-boll' } });
    expect(b.totali.aperte).toBe(0);
    expect((await attese()).map((a) => [a.documento_id, a.decisione])).toEqual([[did, 'attendere']]);
    expect(await db.bollettini_righe.count({ where: { testata_id: id } })).toBe(righePrima); // le righe del fornitore restano sue
    expect(b.totali.riconosciuto).toBe(M.riconcilia(M.S.bollettini[5]).riconosciuto);
    expect(await eventi('crud.update', id)).toBe(1);
    b = (await op.put(`${url()}/documenti/${did}/decisione`, { decisione: null }).expect(200)).body;
    expect(riga(b, 'F-2026-0933')).toMatchObject({ aperta: true, decisione: null });
    expect(await attese()).toHaveLength(0);
  });

  it('abbinamento a un documento dello stesso fornitore; già su un altro bollettino: 409; altro fornitore: 400', async () => {
    const b = (await op.get(url())).body;
    const rid = riga(b, 'F-2026-0921').id;
    const E = await documento('F-2026-0933');
    await lett.put(`${url()}/righe/${rid}/documento`, { documento_id: Number(E) }).expect(403);
    await op.put(`${url()}/righe/${rid}/documento`, { documento_id: Number(await documento('F-2026-0907')) }).expect(409); // nel bollettino di luglio
    await op.put(`${url()}/righe/${rid}/documento`, { documento_id: Number(await documento('F-2026-0912')) }).expect(400); // Gries
    expect(await eventi('crud.update', BigInt(rid))).toBe(0);
  });

  it('D→E: l’attesa di E si toglie, D torna mancante senza decisione; un’attesa orfana non conta (D-56)', async () => {
    const rid = riga((await op.get(url())).body, 'F-2026-0921').id;
    const D = await documento('F-2026-0921'), E = await documento('F-2026-0933');
    await op.put(`${url()}/documenti/${E}/decisione`, { decisione: 'attendere' }).expect(200);
    // un'attesa orfana su D (scritta a mano: D è sulla riga) non vale e non deve tornare quando D si libera
    await db.bollettini_attese.create({ data: { testata_id: id, documento_id: D, decisione: 'contestato', decisione_motivo: 'vecchia' } });
    const conOrfana = (await op.get(url())).body;
    expect([riga(conOrfana, 'F-2026-0921').categoria, riga(conOrfana, 'F-2026-0921').decisione, conOrfana.totali.aperte]).toEqual(['quadra', null, 0]);
    const dopo = (await op.put(`${url()}/righe/${rid}/documento`, { documento_id: Number(E) }).expect(200)).body;
    expect(dopo.righe.filter((x: any) => x.categoria === 'mancante').map((x: any) => [x.numero, x.aperta, x.decisione])).toEqual([['F-2026-0921', true, null]]);
    expect(await attese()).toHaveLength(0);
    expect(await eventi('crud.update', BigInt(rid))).toBe(1);
    // e indietro: D sulla sua riga, E di nuovo mancante e da decidere
    const giusto = (await op.put(`${url()}/righe/${rid}/documento`, { documento_id: Number(D) }).expect(200)).body;
    expect(riga(giusto, 'F-2026-0921')).toMatchObject({ categoria: 'quadra', documento_id: String(D) });
    expect(riga(giusto, 'F-2026-0933')).toMatchObject({ aperta: true, decisione: null });
  });

  it('chiusura con righe aperte: 409; verificato con righe contestate: 409; contestato senza: 409', async () => {
    await op.put(`${url()}/stato`, { stato: 'verificato' }).expect(409);
    await op.put(`${url()}/documenti/${await documento('F-2026-0933')}/decisione`, { decisione: 'attendere' }).expect(200);
    await op.put(`${url()}/stato`, { stato: 'contestato' }).expect(409);
    // attesa orfana su un documento che sta su una riga: la chiusura la toglie
    await db.bollettini_attese.create({ data: { testata_id: id, documento_id: await documento('F-2026-0921'), decisione: 'attendere' } });
    await lett.put(`${url()}/stato`, { stato: 'verificato' }).expect(403);
  });

  it('rollback: registro che fallisce = bollettino ancora da verificare, niente congelato', async () => {
    const vero = registro.logEvent;
    const spia = jest.spyOn(registro, 'logEvent').mockImplementation(async (d, e, c) => {
      if (e.tipo === 'calcolo') throw new Error('registro rotto');
      return vero(d, e, c);
    });
    await op.put(`${url()}/stato`, { stato: 'verificato' }).expect(500);
    spia.mockRestore();
    expect((await db.bollettini_testata.findUniqueOrThrow({ where: { id } })).stato).toBe('da_verificare');
    // la riga F-2026-0921 è già abbinata a mano (prova sopra); lo storno no
    expect(await db.bollettini_righe.count({ where: { testata_id: id, OR: [{ importo_calcolato: { not: null } }, { documento_id: { not: null }, tipo_riga: 'storno' }] } })).toBe(0);
  });

  it('verificato: congela e abbina le righe, eventi, il mese diventa periodo chiuso (D-51)', async () => {
    expect(await ultimaChiusura(db, gasper)).toBe('2026-07-31');
    const prima = (await op.get(url())).body;
    const b = (await op.put(`${url()}/stato`, { stato: 'verificato', note: 'ok' }).expect(200)).body;
    expect([b.stato, b.badge, b.modificabile, b.chiuso_da, b.note, b.azione.tipo]).toEqual(['verificato', 'verificato', false, 'Prova op-boll', 'ok', 'chiuso']);
    expect(b.chiuso_il).toBe(OGGI);
    expect(b.totali).toEqual(prima.totali); // i valori congelati sono quelli calcolati
    const righe = await db.bollettini_righe.findMany({ where: { testata_id: id }, orderBy: { id: 'asc' } });
    const f0921 = righe.find((r) => r.fattura_numero === 'F-2026-0921')!, storno = righe.find((r) => r.tipo_riga === 'storno')!;
    expect([f0921.documento_id, Number(f0921.importo_calcolato), Number(f0921.differenza)]).toEqual([await documento('F-2026-0921'), Number(riga(prima, 'F-2026-0921').noi.importo), 0]);
    expect([storno.documento_id, storno.importo_calcolato]).toEqual([await documento('F-2026-0822'), null]);
    expect([await eventi('calcolo.verify', id), await eventi('stato.change_state', id)]).toEqual([1, 1]);
    // F3-A3: la verifica cambia lo stato d'incasso dello storno e lascia l'evento sul documento
    const evStorno = await db.registro.findFirst({ where: { codice: 'stato.change_state', entita: 'documento', entita_id: await documento('F-2026-0822') } });
    expect(evStorno?.dettaglio).toMatchObject({ tipo_riga: 'storno', bollettino_id: String(id), dopo: { stato_incasso: 'insoluta' } });
    expect((await attese()).map((x) => x.documento_id)).toEqual([await documento('F-2026-0933')]);
    expect(await ultimaChiusura(db, gasper)).toBe('2026-08-31');
    // nuove percentuali dentro il mese chiuso: 409
    await dati.post(`/fornitori/${gasper}/percentuali`, { valido_dal: '2026-08-15', scaglioni: [{ sconto_min: 0, pct_agente: 10, pct_subagente: 5 }] }).expect(409);
  });

  it('bollettino chiuso: decisioni, abbinamenti e nuova chiusura 409; la riconciliazione resta uguale', async () => {
    const b = (await op.get(url())).body;
    await op.put(`${url()}/documenti/${await documento('F-2026-0933')}/decisione`, { decisione: 'contestato', motivo: 'x' }).expect(409);
    await op.put(`${url()}/righe/${riga(b, 'F-2026-0921').id}/documento`, { documento_id: Number(await documento('F-2026-0921')) }).expect(409);
    await op.put(`${url()}/stato`, { stato: 'verificato' }).expect(409);
    expect(b.righe.every((x: any) => x.scelte.length === 0)).toBe(true);
  });
});

describe('contestazione pronta (F3-A2b)', () => {
  let id: bigint;
  beforeAll(async () => {
    id = await bollettino('Gries', 7);
  });

  it('il testo ha fornitore e mese, i due lati, la differenza e il motivo; le righe accettate non ci sono', async () => {
    const rid = riga((await op.get(`/bollettini/${id}`)).body, 'F-2026-0912').id;
    await op.put(`/bollettini/${id}/righe/${rid}/decisione`, { decisione: 'contestato', motivo: 'Sconto diverso da quello concordato' }).expect(200);
    const r = (await lett.get(`/bollettini/${id}/contestazione`).expect(200)).body;
    expect(r.oggetto).toContain('Gries');
    expect(r.oggetto).toContain('luglio 2026');
    for (const pezzo of ['F-2026-0912', 'Vivaio Verde Azzurro s.r.l.', '28/07/2026', '1.144,50 €', '17,5 %',
      '1.177,20 €', '18 %', '-32,70 €', 'Sconto diverso da quello concordato', 'Totale della differenza contestata: -32,70 €']) {
      expect(r.testo).toContain(pezzo);
    }
    expect(r.testo).not.toContain('F-2026-0891'); // quadra, non contestata
    expect(r.testo).toContain('Gentili colleghi di Gries');
    expect(r.testo).toContain('Decobrands SRL');
  });

  it('nessuna riga contestata: 409', async () => {
    await lett.get(`/bollettini/${await bollettino('Gries', 8)}/contestazione`).expect(409);
  });

  it('senza area Provvigioni: 403', async () => {
    await dati.get(`/bollettini/${id}/contestazione`).expect(403);
  });
});

describe('contestazione (Ing\'s agosto)', () => {
  it('riga sconosciuta contestata → bollettino contestato, chiuso', async () => {
    const id = await bollettino("Ing", 8);
    const rid = riga((await op.get(`/bollettini/${id}`)).body, 'F-2026-0930').id;
    await op.put(`/bollettini/${id}/righe/${rid}/decisione`, { decisione: 'contestato', motivo: 'Non ci risulta' }).expect(200);
    await op.put(`/bollettini/${id}/stato`, { stato: 'verificato' }).expect(409);
    const b = (await op.put(`/bollettini/${id}/stato`, { stato: 'contestato' }).expect(200)).body;
    expect([b.stato, b.azione.tipo]).toEqual(['contestato', 'chiuso']);
    expect(await ultimaChiusura(db, await fornitore('Ing'))).toBe('2026-08-31');
  });

  it('dopo le scritture il caricamento parziale resta uguale al completo', async () => {
    expect(await coerenza()).toBe(7);
  });
});
