import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Prisma } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configura } from '../src/main';
import { caricaDati, giornoRoma } from '../src/motore/dati';
import { confronto, haVariazioni, importoPratica, statoPratica } from '../src/motore/motore';
import { cifra } from '../src/password';
import { PrismaService } from '../src/prisma.service';
import { seed } from '../prisma/seed';
import { prototipo } from './prototipo';
import { svuota } from './svuota';

// F2-A1: elenco pratiche (§7.2, §8.1). Conteggi per stato, filtri, ordinamento e paginazione sul
// server; i numeri si confrontano con il prototipo vero (test/prototipo.ts) allo stesso giorno.

/* eslint-disable @typescript-eslint/no-explicit-any */
let app: NestExpressApplication;
let db: PrismaService;
let M: any;
const DOMINIO = '@prova-pratiche.it';
const PW = 'password-di-prova';

type Riga = {
  id: string; numero: string; cliente_id: string; fornitore_id: string; data: string; importo: number;
  stato: string; variazioni: boolean; variazione: number; nota: string | null; subagente_id: string | null;
};
type Elenco = {
  righe: Riga[]; totale: number; conteggi: Record<string, number>; totali: { importo: number };
  pagina: number; pagine: number; per_pagina: number;
};

async function creaUtente(username: string, aree: { area: string; livello: string }[]) {
  await db.utenti.create({
    data: {
      username, email: username + DOMINIO, nome: 'Prova ' + username, ruolo: 'utente',
      aree: { create: aree },
      password_hash: await cifra(PW), deve_cambiare_password: false,
    },
  });
}

async function entra(utente: string) {
  const agente = request.agent(app.getHttpServer());
  await agente.post('/api/accesso/entra').send({ utente, password: PW }).expect(200);
  return { get: (p: string) => agente.get('/api' + p) };
}
let resp: Awaited<ReturnType<typeof entra>>;
let lett: Awaited<ReturnType<typeof entra>>;
let senzaPermesso: Awaited<ReturnType<typeof entra>>;

const REGOLE: Record<string, (p: any) => boolean> = {
  tutte: () => true,
  scaduta: (p) => M.statoPratica(p).chiave === 'scaduta',
  attesa: (p) => M.statoPratica(p).chiave === 'attesa',
  confermata: (p) => M.statoPratica(p).chiave === 'confermata',
  fatturata: (p) => M.statoPratica(p).chiave === 'fatturata',
  variazioni: (p) => M.haVariazioni(p),
};
const attesi = () => {
  const c = Object.fromEntries(Object.keys(REGOLE).map((k) => [k, M.S.pratiche.filter(REGOLE[k]).length])) as Record<string, number>;
  // §5.9: il prototipo confronta solo la prima tranche di fattura di OF/2026/S12-2 e vede due
  // articoli spariti; il database ha tutte le tranche e non vede variazioni (motore.spec.ts).
  c.variazioni -= M.S.pratiche.filter((p: any) => p.numero === 'OF/2026/S12-2' && M.haVariazioni(p)).length;
  return c;
};

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
  db = app.get(PrismaService);
  await svuota(db);
  await seed(db);
  await creaUtente('resp-prat', [{ area: 'provvigioni', livello: 'responsabile' }, { area: 'dati', livello: 'responsabile' }]);
  await creaUtente('lett-prat', [{ area: 'provvigioni', livello: 'lettura' }]);
  await creaUtente('dati-prat', [{ area: 'dati', livello: 'responsabile' }]);
  [resp, lett, senzaPermesso] = await Promise.all([entra('resp-prat'), entra('lett-prat'), entra('dati-prat')]);
  M = prototipo();
  M.S.oggi = giornoRoma(new Date()); // lo stesso "oggi" del server
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

describe('GET /api/pratiche', () => {
  it('conteggi dei segmenti e totali come il prototipo, allo stesso giorno', async () => {
    const r = await resp.get('/pratiche').expect(200);
    const b = r.body as Elenco;
    expect(b.conteggi).toEqual(attesi());
    expect(b.totale).toBe(M.S.pratiche.length);
    expect(b.righe).toHaveLength(Math.min(25, b.totale));
    expect(b.totali.importo).toBeCloseTo(M.r2(M.S.pratiche.reduce((s: number, p: any) => s + M.importoPratica(p), 0)), 2);
    expect(b.righe[0]).toMatchObject({ id: expect.any(String), numero: expect.any(String), stato: expect.any(String), variazioni: expect.any(Boolean) });
  });

  it('filtro multiplo per fornitore: solo quelli scelti; i conteggi seguono (D-23)', async () => {
    const gries = (await db.fornitori_versioni.findFirstOrThrow({ where: { ragione_sociale: { startsWith: 'Gries' } } })).fornitore_id;
    const gasper = (await db.fornitori_versioni.findFirstOrThrow({ where: { ragione_sociale: { startsWith: 'Gasper' } } })).fornitore_id;
    const scelti = new Set([String(gries), String(gasper)]);
    const r = await resp.get(`/pratiche?fornitori=${gries},${gasper}`).expect(200);
    const b = r.body as Elenco;
    const nelPrototipo = M.S.pratiche.filter((p: any) => scelti.has(String(p.fornitore_id))).length;
    expect(b.righe.every((x) => scelti.has(x.fornitore_id))).toBe(true);
    expect(b.totale).toBe(nelPrototipo);
    expect(b.conteggi.tutte).toBe(nelPrototipo);
    expect(b.conteggi.tutte).toBeLessThan((await resp.get('/pratiche').expect(200)).body.conteggi.tutte);
  });

  it('il filtro di stato non cambia i conteggi, cambia solo le righe (D-23)', async () => {
    const gries = (await db.fornitori_versioni.findFirstOrThrow({ where: { ragione_sociale: { startsWith: 'Gries' } } })).fornitore_id;
    const base = (await resp.get(`/pratiche?fornitori=${gries}`).expect(200)).body as Elenco;
    const fatta = (await resp.get(`/pratiche?fornitori=${gries}&stato=fatturata`).expect(200)).body as Elenco;
    expect(fatta.conteggi).toEqual(base.conteggi);
    expect(fatta.totale).toBe(base.conteggi.fatturata);
    expect(fatta.righe.every((x) => x.stato === 'fatturata')).toBe(true);
  });

  it('ricerca libera su numero, cliente, fornitore e documenti', async () => {
    const p = M.S.pratiche.find((x: any) => x.documenti.length > 0);
    const r = await resp.get('/pratiche?q=' + encodeURIComponent(p.numero)).expect(200);
    expect((r.body as Elenco).righe.some((x) => x.numero === p.numero)).toBe(true);
    expect((await resp.get('/pratiche?q=zzzz-nessuno').expect(200)).body.totale).toBe(0);
  });

  it('periodo: solo le pratiche fra le due date', async () => {
    const dal = '2026-01-01', al = '2026-03-31';
    const b = (await resp.get(`/pratiche?dal=${dal}&al=${al}`).expect(200)).body as Elenco;
    expect(b.righe.every((x) => x.data >= dal && x.data <= al)).toBe(true);
    expect(b.totale).toBe(M.S.pratiche.filter((p: any) => p.data >= dal && p.data <= al).length);
  });

  it('ordinamento e paginazione valgono su tutto l\'elenco filtrato', async () => {
    const tutte = (await resp.get('/pratiche?ordina=importo&dir=desc&perPagina=200').expect(200)).body as Elenco;
    expect(tutte.righe).toHaveLength(tutte.totale);
    const importi = tutte.righe.map((x) => x.importo);
    expect(importi).toEqual([...importi].sort((a, b) => b - a)); // tutto l'elenco, non la pagina

    const p0 = (await resp.get('/pratiche?ordina=importo&dir=desc&perPagina=7&pagina=0').expect(200)).body as Elenco;
    const p1 = (await resp.get('/pratiche?ordina=importo&dir=desc&perPagina=7&pagina=1').expect(200)).body as Elenco;
    expect(p0.pagine).toBe(Math.ceil(p0.totale / 7));
    expect(p0.righe).toHaveLength(7);
    expect(p1.pagina).toBe(1);
    expect([...p0.righe, ...p1.righe].map((x) => x.importo)).toEqual(importi.slice(0, 14));

    const stato = (await resp.get('/pratiche?ordina=stato&dir=asc&perPagina=200').expect(200)).body as Elenco;
    const ordine = { scaduta: 0, attesa: 1, confermata: 2, fatturata: 3 } as Record<string, number>;
    expect(stato.righe.map((x) => ordine[x.stato])).toEqual(stato.righe.map((x) => ordine[x.stato]).slice().sort((a, b) => a - b));
  });

  it('stato, importo e variazioni salvati e lo stato della query coincidono con il motore (D-52)', async () => {
    const S = await caricaDati(db);
    const b = (await resp.get('/pratiche?perPagina=200').expect(200)).body as Elenco;
    expect(b.totale).toBe(S.pratiche.length);
    const riga = new Map(b.righe.map((x) => [x.id, x]));
    const salvate = new Map((await db.ordini_fornitore_testata.findMany()).map((t) => [String(t.id), t]));
    const nomeDb = { fatturata: 'fatturato', confermata: 'confermato', attesa: 'inviato', scaduta: 'inviato' } as const;
    for (const p of S.pratiche) {
      const st = statoPratica(S, p).chiave, t = salvate.get(p.id)!;
      expect([p.numero, t.stato, t.importo.toFixed(2), t.variazioni, riga.get(p.id)!.stato])
        .toEqual([p.numero, nomeDb[st], importoPratica(p).toFixed(2), haVariazioni(p), st]);
    }
  });

  it('la lettura dell\'area Provvigioni può consultare; chi non ce l\'ha: 403', async () => {
    await lett.get('/pratiche').expect(200);
    await senzaPermesso.get('/pratiche').expect(403);
  });
});

describe('GET /api/pratiche/:id', () => {
  it('testata, binario delle fasi e azione proposta dalla pratica', async () => {
    const elenco = (await resp.get('/pratiche?perPagina=200').expect(200)).body as Elenco;
    const el = elenco.righe.find((x) => x.stato === 'scaduta' || x.stato === 'attesa')!;
    const r = (await resp.get(`/pratiche/${el.id}`).expect(200)).body;
    expect(r).toMatchObject({
      id: el.id, numero: el.numero, cliente_id: el.cliente_id, fornitore_id: el.fornitore_id,
      data: el.data, stato: el.stato, importo: el.importo, nota: el.nota,
    });
    expect(r.fasi.map((f: any) => f.titolo)).toEqual(['Ordine', 'Conferma', 'Fattura', 'Nota di credito']);
    expect(r.fasi[0]).toMatchObject({ fatta: true, numero: el.numero, importo: el.importo });
    expect({ attesa: 'attesa', scaduta: 'sollecito', confermata: 'fattura', fatturata: 'nessuna' }[el.stato as string]).toBe(r.azione.tipo);
    expect(r.confronto.righe.length).toBeGreaterThan(0);
    expect(r.confronto.fasi[0]).toMatchObject({ tipo: 'ordine', numero: el.numero, data: el.data });
  });

  it('le righe a confronto sono quelle del motore, con le variazioni (D-12, §5.8)', async () => {
    const S = await caricaDati(db);
    const p = S.pratiche.find((x: any) => haVariazioni(x))!;
    const b = (await resp.get(`/pratiche/${p.id}`).expect(200)).body;
    const attese = confronto(p);
    expect(b.confronto.righe).toHaveLength(attese.length);
    expect(b.confronto.righe.map((x: any) => [x.codice, x.varia, x.delta]))
      .toEqual(attese.map((x) => [x.codice, x.varia, Number(x.delta)]));
    expect(b.confronto.righe.some((x: any) => x.varia)).toBe(true);
    expect(b.confronto.variazioni.numero).toBe(attese.filter((r) => r.varia).length);
    expect(b.confronto.variazioni.numero).toBeGreaterThan(0);
    expect(b.confronto.variazioni.totale).toBe(Number(attese.filter((r) => r.varia).reduce((s, r) => s.plus(r.delta), new Prisma.Decimal(0)).toFixed(2)));
  });

  it('provvigione calcolata dal server, con la quota dei documenti (D-27)', async () => {
    const S = await caricaDati(db);
    const p = S.pratiche.find((x: any) => x.documenti.some((d: any) => d.tipo === 'fattura'))!;
    const b = (await resp.get(`/pratiche/${p.id}`).expect(200)).body;
    expect(b.stato).toBe('fatturata');
    expect(b.provvigione).toMatchObject({ maturazione: S.fornitori.get(p.fornitore_id)!.maturazione });
    expect(b.provvigione.imponibile).toBe(Number(importoPratica(p).toFixed(2)));
    expect(b.provvigione.a_decobrands).toBeCloseTo(b.provvigione.imponibile * b.provvigione.da_fornitore / 100, 2);
    expect(b.provvigione.regole.length).toBeGreaterThan(0);
  });

  it('404 se non esiste; la lettura consulta, chi non ha l\'area Provvigioni: 403', async () => {
    const elenco = (await resp.get('/pratiche?perPagina=1').expect(200)).body as Elenco;
    await resp.get('/pratiche/999999999').expect(404);
    await lett.get(`/pratiche/${elenco.righe[0].id}`).expect(200);
    await senzaPermesso.get(`/pratiche/${elenco.righe[0].id}`).expect(403);
  });
});
