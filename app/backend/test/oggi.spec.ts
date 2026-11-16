import 'dotenv/config';
import { createHash } from 'node:crypto';
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
    // A4-02: la finestra sono gli ultimi 12 mesi più quello in corso, non solo l'anno. Il seed ha
    // documenti dal 2025-09 e bollettini solo dal 2026-05: 3 aperti + 9 non arrivati (8 del 2025, giugno 2026).
    expect(gruppo('bollettini').conta).toBe(3 + 9);
    expect(gruppo('pagamenti').conta).toBe(pag.length);
    expect(riquadro('conferme').valore).toBe(String(conf.length));
    expect(riquadro('bollettini').valore).toBe(String(3 + 9));
    expect(riquadro('pagamenti').valore).toBe(String(pag.length));
    // il gruppo Documenti ora è disponibile (F6, D-75): 15 documenti in coda dal seed
    expect(riquadro('documenti').disponibile).toBe(true);
    expect(gruppo('documenti').disponibile).toBe(true);
    expect(gruppo('documenti').voci).toHaveLength(15);
    expect(gruppo('documenti').conta).toBe(15);

    // conferme: 5, 3 fornitori, la più vecchia da 17 giorni
    expect(conf).toHaveLength(5);
    expect(new Set(conf.map((x: any) => x.fornitore_id)).size).toBe(3);
    expect(riquadro('conferme').dettagli[0].testo).toContain('17 giorni');
    // pagamenti: le stesse fatture del motore (il prototipo ha la stessa regola; qui conta il server)
    const daSollecitare = pagamentiDaSollecitare(S);
    expect(gruppo('pagamenti').conta).toBe(daSollecitare.length);
    for (const p of daSollecitare) expect(gruppo('pagamenti').voci.map((v) => v.titolo).join('|')).toContain(p.numero);
    // bollettini: gli aperti sono quelli del prototipo; i non arrivati seguono la finestra di A4-02
    expect(gruppo('bollettini').voci.filter((v) => v.azione !== 'Vedi').length)
      .toBe(bol.filter((x: any) => x.tipo !== 'mancante').length);
    const vedi = gruppo('bollettini').voci.filter((v) => v.azione === 'Vedi');
    expect(vedi).toHaveLength(9);
    expect(vedi.map((v) => v.titolo).join('|')).toContain('giugno 2026');
    expect(vedi.map((v) => v.titolo).join('|')).toContain('dicembre 2025');
  });

  it('i numeri del menu sono gli stessi del prototipo (Oggi, Documenti, Pratiche, Bollettini)', async () => {
    const M = prototipo();
    const fare = M.daFare();
    const S = await caricaDati(db, OGGI);
    const r = await conteggiBarra(db, S);
    // 8 in più del prototipo: i mesi del 2025 senza bollettino che entrano nella finestra di A4-02
    expect(r.oggi).toBe(fare.length + 8);
    expect(r.pratiche).toBe(M.S.pratiche.filter((p: any) => M.statoPratica(p).chiave === 'scaduta').length);
    expect(r.bollettini).toBe(fare.filter((x: any) => x.gruppo === 'bollettini').length + 8);
    expect(r.documenti).toBe(15); // i documenti in arrivo del seed, tutti da controllare
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
    expect(r.trimestre.atteso).toBeCloseTo(5773.62, 1);
    expect(r.trimestre.riconosciuto).toBeCloseTo(4310.08, 2);
  });

  it('GET /api/oggi: struttura, giorno di Roma, ultime operazioni', async () => {
    const r = (await op.get('/api/oggi').expect(200)).body;
    expect(r.oggi).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r.aggiornato_il).toBeTruthy();
    expect(r.registro_href).toBe('/registro');
    // §7.9: il server dichiara se la lettura è configurata (V12)
    expect(r.lettura_configurata).toBe(false);
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

  it('GET/POST /api/solleciti/bollettini: testo dai documenti del mese ed evento', async () => {
    const gries = await db.fornitori.findFirstOrThrow({ where: { corrente: { ragione_sociale: { startsWith: 'Gries' } } }, include: { corrente: true } });
    const r = (await op.get(`/api/solleciti/bollettini?fornitore_id=${gries.id}&anno=2026&mese=8`).expect(200)).body;
    expect(r.fornitore).toBe(gries.corrente!.ragione_sociale);
    expect(r.documenti).toBeGreaterThan(0);
    expect(r.testo).toContain('bollettino provvigioni di agosto 2026');
    expect(r.testo).toContain('Grazie,\nDecobrands SRL');
    const conToken = async () => {
      const agente = request.agent(app.getHttpServer());
      const x = await agente.post('/api/accesso/entra').send({ utente: 'op-oggi', password: PW }).expect(200);
      return { agente, csrf: x.body.csrf as string };
    };
    const { agente, csrf } = await conToken();
    await agente.post('/api/solleciti/bollettini').set('x-csrf-token', csrf)
      .send({ fornitore_id: Number(gries.id), anno: 2026, mese: 8 }).expect(204);
    const ev = await db.registro.findFirstOrThrow({ where: { codice: 'export.sollecito' }, orderBy: { id: 'desc' } });
    expect(ev.dettaglio).toMatchObject({ etichetta: r.fornitore + ' · agosto 2026', pratiche: r.numeri });
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

describe('riferimenti del fornitore nei solleciti di conferma', () => {
  it('un solo ordine: numero del fornitore in testa, nostro rif. in fondo, inviarcela', async () => {
    const S = await caricaDati(db, OGGI);
    const uno = sollecitiConferme(S).per_fornitore.find((f) => f.voci.length === 1)!;
    const numeri = new Map([[uno.voci[0].id, 'AU278665']]);
    const f = sollecitiConferme(S, numeri).per_fornitore.find((x) => x.fornitore_id === uno.fornitore_id)!;
    expect(f.testo).toContain('Ordine AU278665 del ');
    expect(f.testo).toContain('nostro rif. ' + uno.voci[0].numero);
    expect(f.testo).toContain('vostro codice cliente');
    expect(f.testo).toContain('conferma attesa entro il');
    expect(f.testo).toContain('inviarcela');
    expect(f.testo).not.toContain('inviarcele');
  });

  it('due ordini: tutti i numeri del fornitore, nostro rif. in fondo, inviarcele', async () => {
    const S = await caricaDati(db, OGGI);
    const due = sollecitiConferme(S).per_fornitore.find((f) => f.voci.length >= 2)!;
    const numeri = new Map(due.voci.map((v, i) => [v.id, `AU${1000 + i}`] as const));
    const f = sollecitiConferme(S, numeri).per_fornitore.find((x) => x.fornitore_id === due.fornitore_id)!;
    for (const [i, v] of due.voci.entries()) {
      expect(f.testo).toContain(`Ordine AU${1000 + i} del `);
      expect(f.testo).toContain('nostro rif. ' + v.numero);
    }
    expect(f.testo).toContain('inviarcele');
    expect(f.testo).not.toContain('inviarcela');
  });

  it('ordine senza numero del fornitore: nostro numero d\'ordine con data e cliente', async () => {
    const S = await caricaDati(db, OGGI);
    const uno = sollecitiConferme(S).per_fornitore.find((f) => f.voci.length === 1)!;
    const v = uno.voci[0];
    const f = sollecitiConferme(S).per_fornitore.find((x) => x.fornitore_id === uno.fornitore_id)!;
    expect(f.testo).toContain(`Ordine ${v.numero} del ${v.data.split('-').reverse().join('/')}`);
    expect(f.testo).toContain(v.cliente);
    expect(f.testo).not.toContain('nostro rif.');
  });
});

describe('documenti da decidere: titolo e dettaglio', () => {
  const creati: bigint[] = [];
  async function creaDoc(dati: {
    file_nome: string; tipo?: string | null; letto?: boolean; fornitore?: boolean; livello?: string; stato?: string;
    campi?: { campo: string; valore: string }[];
  }) {
    const gries = await db.fornitori.findFirstOrThrow({
      where: { corrente: { ragione_sociale: { startsWith: 'Gries' } } }, include: { corrente: true } });
    const doc = await db.documenti_in_arrivo.create({
      data: {
        origine: 'caricamento', file_nome: dati.file_nome,
        file_hash: createHash('sha256').update(dati.file_nome).digest('hex'),
        file_percorso: 'in_arrivo/prova/' + dati.file_nome, stato: dati.stato ?? 'da_controllare', tipo: dati.tipo ?? null,
        fornitore_id: dati.fornitore ? gries.id : null, fornitore_versione_id: dati.fornitore ? gries.corrente!.id : null,
        livello: dati.livello ?? 'da_controllare', ricevuto_il: new Date('2026-09-01T08:00:00+02:00'),
        letto_il: dati.letto ? new Date('2026-09-01T08:05:00+02:00') : null,
      },
    });
    creati.push(doc.id);
    if (dati.campi) await db.documenti_campi.createMany({ data: dati.campi.map((c) => ({ documento_id: doc.id, campo: c.campo, valore_letto: c.valore })) });
    return doc;
  }
  const voceDi = async (cerca: string) => {
    const S = await caricaDati(db, OGGI);
    const r = await calcolaOggi(db, S);
    return r.gruppi.find((g) => g.id === 'documenti')!.voci.find((v) => v.titolo.includes(cerca));
  };
  afterAll(async () => {
    await db.documenti_campi.deleteMany({ where: { documento_id: { in: creati } } });
    await db.documenti_in_arrivo.deleteMany({ where: { id: { in: creati } } });
  });

  it('documento non letto: il titolo dice il nome del file', async () => {
    await creaDoc({ file_nome: 'estratto-conto.pdf', tipo: null, letto: false, fornitore: true });
    const v = await voceDi('estratto-conto.pdf');
    expect(v).toBeTruthy();
    expect(v!.titolo).toBe('Abbina estratto-conto.pdf');
  });

  it('documento letto con numero: il titolo dice tipo e numero', async () => {
    await creaDoc({ file_nome: 'fattura-RE.pdf', tipo: 'fattura', letto: true, fornitore: true, campi: [{ campo: 'numero', valore: 'RE196022' }] });
    const v = await voceDi('RE196022');
    expect(v).toBeTruthy();
    expect(v!.titolo).toBe('Abbina fattura RE196022');
  });

  it('documento letto senza numero: il titolo dice tipo e file', async () => {
    await creaDoc({ file_nome: 'dettaglioDistinta (6).pdf', tipo: 'pagamento', letto: true, fornitore: true });
    const v = await voceDi('pagamento dettaglioDistinta (6).pdf');
    expect(v).toBeTruthy();
    expect(v!.titolo).toBe('Abbina pagamento dettaglioDistinta (6).pdf');
  });

  it('ordine: «Apri la pratica dell’ordine <numero>» e pulsante Apri', async () => {
    await creaDoc({ file_nome: 'ordine-AU.pdf', tipo: 'ordine', letto: true, fornitore: true, campi: [{ campo: 'numero', valore: 'AU278666' }] });
    const v = await voceDi('AU278666');
    expect(v).toBeTruthy();
    expect(v!.titolo).toBe('Apri la pratica dell’ordine AU278666');
    expect(v!.azione).toBe('Apri');
  });

  it('bollettino: «Registra il bollettino di <mese> di <fornitore>» e pulsante Apri', async () => {
    await creaDoc({ file_nome: 'bollettino-ago.pdf', tipo: 'bollettino', letto: true, fornitore: true, campi: [{ campo: 'mese', valore: '8' }] });
    const v = await voceDi('Registra il bollettino di agosto');
    expect(v).toBeTruthy();
    expect(v!.titolo).toContain('agosto');
    expect(v!.titolo).toContain('Gries');
    expect(v!.azione).toBe('Apri');
  });

  it('fornitore abbinato all\'anagrafica: niente «fornitore non riconosciuto»', async () => {
    await creaDoc({ file_nome: 'fattura-G.pdf', tipo: 'fattura', letto: true, fornitore: true, campi: [{ campo: 'numero', valore: 'RE555555' }] });
    const v = await voceDi('RE555555');
    expect(v).toBeTruthy();
    expect(v!.dettaglio).toContain('Gries');
    expect(v!.dettaglio).not.toContain('fornitore non riconosciuto');
  });

  it('fornitore non abbinato ma nome letto: si dice il nome letto, non «non riconosciuto»', async () => {
    await creaDoc({ file_nome: 'arte.pdf', tipo: 'pagamento', letto: true, fornitore: false, campi: [{ campo: 'fornitore', valore: 'ARTE WOHNACCESSOIRES' }] });
    const v = await voceDi('pagamento arte.pdf');
    expect(v).toBeTruthy();
    expect(v!.dettaglio).toContain('ARTE WOHNACCESSOIRES');
    expect(v!.dettaglio).not.toContain('fornitore non riconosciuto');
  });
});

describe('A4-02: bollettini dell\'anno prima', () => {
  it('a gennaio il bollettino di dicembre dell\'anno prima non arrivato si sollecita', async () => {
    const cliente = await db.clienti.findFirstOrThrow({ where: { attivo: true, versione_corrente_id: { not: null } } });
    const f = await db.fornitori.create({ data: { giorno_bollettino: 15 } });
    const fv = await db.fornitori_versioni.create({
      data: { fornitore_id: f.id, fonte: 'crm', ragione_sociale: 'Fornitore Dicembre' },
    });
    await db.fornitori.update({ where: { id: f.id }, data: { versione_corrente_id: fv.id } });
    const t = await db.ordini_fornitore_testata.create({
      data: {
        fornitore_id: f.id, fornitore_versione_id: fv.id, numero_ordine: 'OF/2026/990',
        data_ordine: new Date('2026-12-01'), cliente_id: cliente.id, cliente_versione_id: cliente.versione_corrente_id!,
      },
    });
    await db.ordini_fornitore_documenti.create({
      data: { testata_id: t.id, tipo: 'fattura', numero: 'FT/2026/990', data: new Date('2026-12-10'), importo: 1000 },
    });

    const S = await caricaDati(db, '2027-01-20');
    const r = await calcolaOggi(db, S);
    const bollettini = r.gruppi.find((g) => g.id === 'bollettini')!;
    const voce = bollettini.voci.find((v) => v.titolo === 'Sollecita il bollettino di dicembre 2026 di Fornitore Dicembre');
    expect(voce).toBeTruthy();
    expect(voce!.azione).toBe('Vedi');
    expect((await conteggiBarra(db, S)).bollettini).toBeGreaterThan(0);
  });
});
