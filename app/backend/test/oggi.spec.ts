import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configura } from '../src/main';
import { caricaDati } from '../src/motore/dati';
import { pagamentiDaSollecitare } from '../src/motore/motore';
import { calcolaOggi, conteggiBarra } from '../src/oggi';
import { sollecitiConferme } from '../src/solleciti';
import { cifra } from '../src/password';
import { PrismaService } from '../src/prisma.service';
import { seed } from '../prisma/seed';
import { prototipo } from './prototipo';
import { svuota } from './svuota';

// F5-A1: pagina Oggi e solleciti di conferma. I numeri si confrontano con il prototipo allo stesso
// giorno (04/09/2026, test/prototipo.ts); il gruppo Documenti resta vuoto finché arriva F6.

/* eslint-disable @typescript-eslint/no-explicit-any */
let app: NestExpressApplication;
let db: PrismaService;
const OGGI = '2026-09-04';
const DOMINIO = '@prova-oggi.it';
const PW = 'password-di-prova';

async function creaUtente(username: string, aree: { area: string; livello: string }[]) {
  await db.utenti.create({
    data: {
      username, email: username + DOMINIO, nome: 'Prova ' + username, ruolo: 'utente',
      aree: { create: aree }, password_hash: await cifra(PW), deve_cambiare_password: false,
    },
  });
}
async function entra(utente: string) {
  const agente = request.agent(app.getHttpServer());
  await agente.post('/api/accesso/entra').send({ utente, password: PW }).expect(200);
  return agente;
}
let op: Awaited<ReturnType<typeof entra>>;
let lett: Awaited<ReturnType<typeof entra>>;
let senza: Awaited<ReturnType<typeof entra>>;

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
  db = app.get(PrismaService);
  await svuota(db);
  await seed(db);
  await creaUtente('op-oggi', [{ area: 'provvigioni', livello: 'operatore' }]);
  await creaUtente('lett-oggi', [{ area: 'provvigioni', livello: 'lettura' }]);
  await creaUtente('dati-oggi', [{ area: 'dati', livello: 'lettura' }]);
  [op, lett, senza] = await Promise.all([entra('op-oggi'), entra('lett-oggi'), entra('dati-oggi')]);
}, 120_000);

afterAll(async () => {
  const utenti = (await db.utenti.findMany({ where: { email: { endsWith: DOMINIO } } })).map((u) => u.id);
  await svuota(db);
  await db.$transaction([
    db.$executeRaw`SET LOCAL decobrands.pulizia_registro = 'si'`,
    db.registro.deleteMany({ where: { utente_id: { in: utenti } } }),
    db.sessioni.deleteMany({ where: { utente_id: { in: utenti } } }),
    db.utenti.deleteMany({ where: { id: { in: utenti } } }),
  ]);
  await app.close();
});

describe('F5-A1 pagina Oggi', () => {
  it('contatori e gruppi uguali al prototipo allo stesso giorno', async () => {
    const M = prototipo();
    const fare = M.daFare();
    const conf = fare.filter((x: any) => x.gruppo === 'conferme');
    const bol = fare.filter((x: any) => x.gruppo === 'bollettini');
    const pag = fare.filter((x: any) => x.gruppo === 'pagamenti');

    const S = await caricaDati(db, OGGI);
    const r = await calcolaOggi(db, S);
    const gruppo = (id: string) => r.gruppi.find((g) => g.id === id)!;
    const riquadro = (id: string) => r.riquadri.find((x) => x.id === id)!;

    expect(gruppo('conferme').conta).toBe(conf.length);
    expect(gruppo('bollettini').conta).toBe(bol.length);
    expect(gruppo('pagamenti').conta).toBe(pag.length);
    expect(riquadro('conferme').valore).toBe(String(conf.length));
    expect(riquadro('bollettini').valore).toBe(String(bol.length));
    expect(riquadro('pagamenti').valore).toBe(String(pag.length));
    // il riquadro documenti conta i file in coda, ma il gruppo non è ancora disponibile (F6)
    expect(riquadro('documenti').disponibile).toBe(false);
    expect(gruppo('documenti').disponibile).toBe(false);
    expect(gruppo('documenti').voci).toEqual([]);
    expect(gruppo('documenti').conta).toBe(0);

    // conferme: 5, 3 fornitori, la più vecchia da 17 giorni
    expect(conf).toHaveLength(5);
    expect(new Set(conf.map((x: any) => x.fornitore_id)).size).toBe(3);
    expect(riquadro('conferme').dettagli[0].testo).toContain('17 giorni');
    // pagamenti: le stesse fatture del motore (il prototipo ha la stessa regola; qui conta il server)
    const daSollecitare = pagamentiDaSollecitare(S);
    expect(gruppo('pagamenti').conta).toBe(daSollecitare.length);
    for (const p of daSollecitare) expect(gruppo('pagamenti').voci.map((v) => v.titolo).join('|')).toContain(p.numero);
    // bollettini: 3 aperti e 1 non arrivato
    expect(gruppo('bollettini').voci.filter((v) => v.azione === 'Vedi')).toHaveLength(1);
    expect(gruppo('bollettini').voci.filter((v) => v.azione === 'Vedi')[0].titolo).toContain('giugno');
  });

  it('i numeri del menu sono gli stessi del prototipo (Oggi, Documenti, Pratiche, Bollettini)', async () => {
    const M = prototipo();
    const fare = M.daFare();
    const S = await caricaDati(db, OGGI);
    const r = await conteggiBarra(db, S);
    expect(r.oggi).toBe(fare.length);
    expect(r.pratiche).toBe(M.S.pratiche.filter((p: any) => M.statoPratica(p).chiave === 'scaduta').length);
    expect(r.bollettini).toBe(fare.filter((x: any) => x.gruppo === 'bollettini').length);
    expect(r.documenti).toBe(11); // i documenti in arrivo del seed, tutti da controllare
    const api = (await op.get('/api/oggi/conteggi').expect(200)).body;
    expect(Object.keys(api).sort()).toEqual(['bollettini', 'documenti', 'oggi', 'pratiche']);
    expect(Object.values(api).every((n) => typeof n === 'number')).toBe(true);
    await senza.get('/api/oggi/conteggi').expect(403);
  });

  it('scadenze e trimestre in corso', async () => {
    const M = prototipo();
    const S = await caricaDati(db, OGGI);
    const r = await calcolaOggi(db, S);
    expect(r.scadenze.map((x) => x.data)).toEqual(M.scadenze(15).map((x: any) => x.data));
    expect(r.trimestre).toMatchObject({ anno: 2026, trimestre: 3 });
    // i quattro numeri del prototipo, gli stessi del motore (D-49: al centesimo)
    const righe = M.righeLiquidazione(2026, 3);
    const somma = (f: (x: any) => boolean) => righe.filter(f).reduce((s: number, x: any) => s + x.provvigione, 0);
    expect(r.trimestre.da_liquidare).toBeCloseTo(somma((x: any) => x.liquidabile), 2);
    expect(r.trimestre.bloccato).toBeCloseTo(somma((x: any) => !x.liquidabile), 2);
    expect(r.trimestre.atteso).toBeCloseTo(8069.6, 1);
    expect(r.trimestre.riconosciuto).toBeCloseTo(5909.41, 2);
  });

  it('GET /api/oggi: struttura, giorno di Roma, ultime operazioni', async () => {
    const r = (await op.get('/api/oggi').expect(200)).body;
    expect(r.oggi).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r.aggiornato_il).toBeTruthy();
    expect(r.registro_href).toBe('/registro');
    expect(r.riquadri).toHaveLength(4);
    expect(r.gruppi.map((g: any) => g.id)).toEqual(['conferme', 'documenti', 'bollettini', 'pagamenti']);
    expect(r.trimestre.href).toMatch(/^\/liquidazioni\/\d{4}\/[1-4]$/);
    expect(Array.isArray(r.operazioni)).toBe(true);
    expect(r.operazioni.length).toBeLessThanOrEqual(6);
    for (const o of r.operazioni) {
      expect(o.testo).toBeTruthy();
      expect(o.quando).toMatch(/^\d{2}\/\d{2}\/\d{4}/);
      expect(o.chi).toBeTruthy();
    }
  });

  it('permessi: lettura consulta, chi non ha Provvigioni no', async () => {
    await lett.get('/api/oggi').expect(200);
    await lett.get('/api/solleciti/conferme').expect(200);
    await senza.get('/api/oggi').expect(403);
    await senza.get('/api/solleciti/conferme').expect(403);
  });

  it('GET /api/solleciti/conferme: un testo per fornitore con i dati giusti', async () => {
    const M = prototipo();
    const attese = M.daFare().filter((x: any) => x.gruppo === 'conferme')
      .map((x: any) => x.titolo.replace('Sollecita la conferma di ', '')).sort();
    const S = await caricaDati(db, OGGI);
    const r = sollecitiConferme(S);
    expect(r.totale).toBe(attese.length);
    expect(r.per_fornitore).toHaveLength(3);
    expect(r.per_fornitore.flatMap((f) => f.voci.map((v) => v.numero)).sort()).toEqual(attese);
    for (const f of r.per_fornitore) {
      expect(f.testo).toContain('Gentili colleghi di ' + f.fornitore);
      expect(f.testo).toContain('vostro codice');
      expect(f.testo).toContain('attesa entro il');
      expect(f.testo).toContain('Grazie,\nDecobrands SRL');
      for (const v of f.voci) {
        expect(f.testo).toContain(v.numero);
        expect(f.testo).toContain(v.cliente);
        expect(v.importo).toBeGreaterThan(0);
      }
    }
    // l'endpoint oggi risponde la stessa forma
    const api = (await op.get('/api/solleciti/conferme').expect(200)).body;
    expect(api.totale).toBe(api.per_fornitore.reduce((n: number, f: any) => n + f.pratiche, 0));
  });

  it('POST /api/solleciti/conferme: la copia lascia l\'evento export.sollecito', async () => {
    const S = await caricaDati(db, OGGI);
    const f = sollecitiConferme(S).per_fornitore[0];
    const conToken = async (utente: string) => {
      const agente = request.agent(app.getHttpServer());
      const r = await agente.post('/api/accesso/entra').send({ utente, password: PW }).expect(200);
      return { agente, csrf: r.body.csrf as string };
    };
    const { agente, csrf } = await conToken('op-oggi');
    await agente.post('/api/solleciti/conferme').set('x-csrf-token', csrf)
      .send({ fornitore_id: Number(f.fornitore_id) }).expect(204);
    const ev = await db.registro.findFirstOrThrow({ where: { codice: 'export.sollecito' }, orderBy: { id: 'desc' } });
    expect(ev.tipo).toBe('export');
    expect(ev.entita).toBe('fornitore');
    expect(String(ev.entita_id)).toBe(f.fornitore_id);
    const d = ev.dettaglio as { etichetta: string; pratiche: string[] };
    expect(d.etichetta).toBe(f.fornitore);
    expect([...d.pratiche].sort()).toEqual(f.voci.map((v) => v.numero).sort());
    await agente.post('/api/solleciti/conferme').set('x-csrf-token', csrf)
      .send({ fornitore_id: 999999 }).expect(404);
    const altro = await conToken('dati-oggi');
    await altro.agente.post('/api/solleciti/conferme').set('x-csrf-token', altro.csrf)
      .send({ fornitore_id: Number(f.fornitore_id) }).expect(403);
  });

  it('POST /api/solleciti/conferme: scrive nel registro, la sola lettura è 403', async () => {
    const S = await caricaDati(db, OGGI);
    const f = sollecitiConferme(S).per_fornitore[0];
    const le = await (async () => {
      const agente = request.agent(app.getHttpServer());
      const r = await agente.post('/api/accesso/entra').send({ utente: 'lett-oggi', password: PW }).expect(200);
      return { agente, csrf: r.body.csrf as string };
    })();
    await le.agente.post('/api/solleciti/conferme').set('x-csrf-token', le.csrf)
      .send({ fornitore_id: Number(f.fornitore_id) }).expect(403);
  });
});
