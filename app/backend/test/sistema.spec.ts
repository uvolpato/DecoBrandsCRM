// Prova dello Stato del sistema (F5-A5, §7.14, §4.2.15, D-74): stato dei riquadri calcolato dal
// database (funziona, fermo, ultimi 3 errori, anomalie errore e attenzione, non configurata), problema
// visto e visti con l'evento, contatore della barra, controlli con prove finte (nessuna rete),
// *Controlla adesso* con il tempo massimo, esecuzioni raggruppate e permessi.
import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { CasellaService } from '../src/casella';
import { configura } from '../src/main';
import { cifra as cifraPassword } from '../src/password';
import { PrismaService } from '../src/prisma.service';
import { cifra } from '../src/segreto';
import {
  contatore, controllaServizio, controllaTutto, eseguiControlli, stato, type Riquadro, type Sonda,
} from '../src/sistema';
import { seed } from '../prisma/seed';
import { svuota } from './svuota';

let app: NestExpressApplication;
let db: PrismaService;
let casella: CasellaService;
const DOMINIO = '@prova-sistema.it';
const PW = 'password-di-prova';

async function creaUtente(username: string, ruolo: string, aree: { area: string; livello: string }[]) {
  return db.utenti.create({
    data: { username, email: username + DOMINIO, nome: 'Prova ' + username, ruolo, aree: { create: aree }, password_hash: await cifraPassword(PW), deve_cambiare_password: false },
  });
}
async function entra(utente: string) {
  const agente = request.agent(app.getHttpServer());
  const r = await agente.post('/api/accesso/entra').send({ utente, password: PW }).expect(200);
  token[utente] = r.body.csrf as string;
  return agente;
}
/** POST con il token CSRF della sessione (§3.3): senza, il server risponde 403. */
const invia = (agente: Awaited<ReturnType<typeof entra>>, utente: string, rotta: string) =>
  agente.post(rotta).set('x-csrf-token', token[utente]);
const token: Record<string, string> = {};

/** Le Impostazioni di un servizio (le altre restano quelle del seed, senza password leggibili). */
const imposta = (chiave: string, valore: Record<string, unknown>) =>
  db.impostazioni.upsert({ where: { chiave }, update: { valore: valore as never }, create: { chiave, valore: valore as never } });
const password = () => cifra('segreta-di-prova');

const minutiFa = (n: number) => new Date(Date.now() - n * 60_000);
const esecuzione = (servizio: string, quando: Date, esito = 'ok', tipoGiro = 'lavoro', misure?: Record<string, unknown>) =>
  db.servizi_esecuzioni.create({
    data: { servizio, tipo: tipoGiro, inizio: quando, fine: quando, esito, testo: `${servizio} ${esito}`, misure: (misure ?? {}) as never },
  });

/** Le anomalie del seed non servono: ogni prova parte da un registro vuoto (il trigger si spegne un attimo). */
async function svuotaRegistro() {
  await db.$executeRawUnsafe('ALTER TABLE registro DISABLE TRIGGER USER');
  try {
    await db.$executeRawUnsafe('TRUNCATE registro RESTART IDENTITY');
    await db.$executeRawUnsafe('TRUNCATE servizi_esecuzioni RESTART IDENTITY');
  } finally {
    await db.$executeRawUnsafe('ALTER TABLE registro ENABLE TRIGGER USER');
  }
}

const anomalia = (dati: Record<string, unknown>) => db.registro.create({
  data: {
    genere: 'anomalia', livello: 'errore', codice: 'casella.connessione', servizio: 'casella', chiave: '',
    messaggio: 'Problema di prova', dettaglio: { errore: 'x' }, stato: 'aperta', ultimo: new Date(), ts: new Date(), ...dati,
  } as never,
});

let ammi: Awaited<ReturnType<typeof entra>>;
let oper: Awaited<ReturnType<typeof entra>>;
let lett: Awaited<ReturnType<typeof entra>>;

beforeAll(async () => {
  process.env.SEGRETI_CHIAVE = 'chiave-di-prova-sistema';
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
  db = app.get(PrismaService);
  casella = app.get(CasellaService);
  await svuota(db);
  await seed(db);
  await creaUtente('ammi-sis', 'amministratore', [{ area: 'provvigioni', livello: 'responsabile' }]);
  await creaUtente('oper-sis', 'utente', [{ area: 'provvigioni', livello: 'operatore' }]);
  await creaUtente('lett-sis', 'utente', [{ area: 'provvigioni', livello: 'lettura' }]);
  [ammi, oper, lett] = await Promise.all([entra('ammi-sis'), entra('oper-sis'), entra('lett-sis')]);
}, 120_000);

afterAll(async () => {
  await svuota(db);
  await app.close();
});

/** I tre servizi configurati con password leggibili (§7.15); la lettura resta spenta. */
async function configuraServizi() {
  await imposta('casella', { server: 'imap.x', porta: 993, utente: 'u', password: await password(), cartella: 'Fornitori', cartella_lette: 'Fornitori/Letti', minuti: 2 });
  await imposta('posta', { server: 'smtp.x', porta: 587, utente: 'u', password: await password() });
  await imposta('integra', { server: 'srv', database: 'ponte', utente: 'u', password: await password(), schema: 'public', secondi: 60 });
}

beforeEach(async () => {
  await svuotaRegistro();
  await configuraServizi();
  delete process.env.PONTE_URL;
});

const servizio = (r: Riquadro[], id: string) => r.find((s) => s.id === id)!;

describe('F5-A5 stato dei riquadri (§7.14.2)', () => {
  it('servizio non configurato: verde con la nota, mai «fermo»', async () => {
    await db.impostazioni.update({ where: { chiave: 'casella' }, data: { valore: { server: '', utente: '', password: null, cartella: 'Fornitori', cartella_lette: 'Fornitori/Letti', minuti: 2 } } });
    await imposta('posta', { server: '', utente: '', password: null });
    await imposta('integra', { server: '', database: '', utente: '', password: null });
    const r = await stato(db);
    for (const id of ['casella', 'posta', 'integra', 'lettura']) {
      expect(servizio(r, id)).toMatchObject({ stato: 'ok' });
      expect(servizio(r, id).nota).toMatch(/Non configurata/);
      expect(servizio(r, id).indirizzo).toBeNull();
    }
  });

  it('funziona: l’ultimo giro è recente e la nota è il riepilogo del giorno', async () => {
    await esecuzione('casella', minutiFa(1), 'ok', 'lavoro', { allegati: 6, email: 6, ignorati: 0 });
    const s = servizio(await stato(db), 'casella');
    expect(s).toMatchObject({ stato: 'ok', nota: '6 allegati letti oggi', indirizzo: 'imap.x:993', ritmo: 'ogni 2 minuti' });
    expect(s.ultima).toBeTruthy();
  });

  it('fermo: nessun giro da più di 3 cicli (casella 3 × minuti)', async () => {
    await esecuzione('casella', minutiFa(20));
    expect(servizio(await stato(db), 'casella')).toMatchObject({ stato: 'errore' });
    expect(servizio(await stato(db), 'casella').nota).toMatch(/^Fermo da \d+ minuti$/);
  });

  it('gli ultimi 3 giri tutti in errore: problema', async () => {
    await esecuzione('casella', minutiFa(3), 'errore', 'controllo');
    await esecuzione('casella', minutiFa(2), 'errore', 'controllo');
    await esecuzione('casella', minutiFa(1), 'errore', 'controllo');
    expect(servizio(await stato(db), 'casella')).toMatchObject({ stato: 'errore', nota: 'Gli ultimi 3 giri non sono riusciti' });
  });

  it('un’anomalia aperta in errore colora di rosso e la sua frase è la nota; una in attenzione di giallo', async () => {
    await esecuzione('casella', minutiFa(1));
    await anomalia({ livello: 'errore', messaggio: 'La casella non risponde' });
    expect(servizio(await stato(db), 'casella')).toMatchObject({ stato: 'errore', nota: 'La casella non risponde' });

    await db.registro.updateMany({ where: { genere: 'anomalia' }, data: { livello: 'attenzione' } });
    expect(servizio(await stato(db), 'casella')).toMatchObject({ stato: 'attenzione', nota: 'La casella non risponde' });
  });

  it('una sincronizzazione più lunga del suo intervallo: da tenere d’occhio (integra)', async () => {
    await esecuzione('integra', minutiFa(1), 'attenzione', 'lavoro', { secondi: 75 });
    expect(servizio(await stato(db), 'integra')).toMatchObject({ stato: 'attenzione' });
  });

  it('i problemi da vedere si contano per servizio', async () => {
    await esecuzione('casella', minutiFa(1));
    await esecuzione('integra', minutiFa(1));
    await anomalia({ servizio: 'casella', codice: 'casella.allegato', livello: 'attenzione' });
    await anomalia({ servizio: 'casella', codice: 'casella.vuota', livello: 'attenzione' });
    await anomalia({ servizio: 'integra', codice: 'integra.piva_mancante', visto_il: new Date(), visto_da: null, chiave: 'C1' });
    const r = await stato(db);
    expect(servizio(r, 'casella').problemi).toBe(2);
    expect(servizio(r, 'integra').problemi).toBe(0);
  });
});

describe('F5-A5 problemi, contatore, visto (§7.14.4-5)', () => {
  it('da vedere e tutti, il servizio scelto, «cosa fare» e «risolto il»', async () => {
    const a = await anomalia({ servizio: 'casella', codice: 'casella.allegato', livello: 'attenzione', messaggio: 'Allegato zip' });
    await anomalia({ servizio: 'integra', codice: 'integra.connessione', messaggio: 'Integra non risponde', visto_il: new Date() });
    await anomalia({ servizio: 'lettura', codice: 'lettura.lenta', livello: 'attenzione', stato: 'chiusa', chiusa_il: new Date() });

    const daVedere = (await ammi.get('/api/sistema').expect(200)).body;
    expect(daVedere.problemi).toHaveLength(1); // né la vista né la chiusa sono da vedere
    expect(daVedere.problemi[0].id).toBe(String(a.id));
    expect(daVedere.problemi[0].cosa_fare).toMatch(/caricare il documento a mano/);

    const tutti = (await ammi.get('/api/sistema?vista=tutti').expect(200)).body;
    expect(tutti.problemi).toHaveLength(3);
    const chiusa = tutti.problemi.find((p: { stato: string }) => p.stato === 'chiusa');
    expect(chiusa.risolta_il).toBeTruthy();

    const soloIntegra = (await ammi.get('/api/sistema?vista=tutti&servizio=integra').expect(200)).body;
    expect(soloIntegra.problemi).toHaveLength(1);
    expect(soloIntegra.problemi[0].testo).toBe('Integra non risponde');
  });

  it('contatore: problemi da vedere e se ce n’è uno in errore', async () => {
    await anomalia({ servizio: 'casella', codice: 'casella.allegato', livello: 'attenzione' });
    await anomalia({ servizio: 'posta', codice: 'posta.respinta', livello: 'errore', chiave: 'a@x.it' });
    await anomalia({ servizio: 'casella', codice: 'casella.vuota', livello: 'attenzione', visto_il: new Date() });
    // un’anomalia senza servizio non entra nel contatore della pagina
    await anomalia({ servizio: null, codice: 'app.errore', livello: 'errore' });
    expect((await ammi.get('/api/sistema/contatore').expect(200)).body).toEqual({ problemi: 2, errore: true });
    expect(await contatore(db)).toEqual({ problemi: 2, errore: true });
  });

  it('segna come visto: contatore giù, evento una volta sola', async () => {
    const a = await anomalia({ servizio: 'casella', codice: 'casella.allegato', livello: 'attenzione' });
    await invia(ammi, 'ammi-sis', `/api/sistema/problemi/${a.id}/visto`).expect(204);
    const dopo = await db.registro.findUniqueOrThrow({ where: { id: a.id } });
    expect(dopo.visto_il).toBeTruthy();
    expect(dopo.stato).toBe('aperta'); // visto non vuol dire chiuso
    const eventi = await db.registro.count({ where: { tipo: 'stato', azione: 'change_state', entita: 'sistema' } });
    expect(eventi).toBe(1);
    await invia(ammi, 'ammi-sis', `/api/sistema/problemi/${a.id}/visto`).expect(204);
    expect(await db.registro.count({ where: { tipo: 'stato', azione: 'change_state', entita: 'sistema' } })).toBe(1);

    await invia(ammi, 'ammi-sis', '/api/sistema/problemi/999999/visto').expect(404);
  });

  it('segna tutti come visti', async () => {
    await anomalia({ servizio: 'casella', codice: 'casella.allegato', livello: 'attenzione' });
    await anomalia({ servizio: 'integra', codice: 'integra.connessione' });
    await invia(ammi, 'ammi-sis', '/api/sistema/problemi/visti').expect(204);
    expect(await db.registro.count({ where: { genere: 'anomalia', stato: 'aperta', visto_il: null } })).toBe(0);
    const evento = await db.registro.findFirstOrThrow({ where: { tipo: 'stato', azione: 'change_state', entita: 'sistema' } });
    expect((evento.dettaglio as { problemi: string[] }).problemi).toHaveLength(2);
  });
});

describe('F5-A5 controlli di salute con prove finte (§7.14.1-3)', () => {
  const riuscita: Sonda = async () => ({ ok: true, testo: 'tutto bene', misure: { secondi: 0.2 } });

  it('casella.connessione si apre al terzo controllo fallito e si chiude al primo riuscito', async () => {
    const ko: Sonda = async () => ({ ok: false, testo: 'non risponde', misure: { errore: 'timeout' } });
    await controllaServizio(db, 'casella', ko);
    await controllaServizio(db, 'casella', ko);
    expect(await db.registro.count({ where: { codice: 'casella.connessione', stato: 'aperta' } })).toBe(0);
    await controllaServizio(db, 'casella', ko);
    expect(await db.registro.count({ where: { codice: 'casella.connessione', stato: 'aperta' } })).toBe(1);
    // i giri sono in servizi_esecuzioni con tipo controllo e il messaggio tecnico nelle misure
    const giri = await db.servizi_esecuzioni.findMany({ where: { servizio: 'casella', tipo: 'controllo' }, orderBy: { id: 'asc' } });
    expect(giri.map((g) => g.esito)).toEqual(['errore', 'errore', 'errore']);
    expect(giri[2].misure).toMatchObject({ connessione: true, errore: 'timeout' });

    await controllaServizio(db, 'casella', riuscita);
    expect(await db.registro.count({ where: { codice: 'casella.connessione', stato: 'aperta' } })).toBe(0);
    expect(await db.registro.count({ where: { codice: 'casella.connessione', stato: 'chiusa' } })).toBe(1);
  });

  it('casella.cartella si apre subito, con il nome della cartella', async () => {
    await controllaServizio(db, 'casella', async () => ({ ok: false, cartella: 'Fornitori/Letti', testo: 'manca', misure: {} }));
    const a = await db.registro.findFirstOrThrow({ where: { codice: 'casella.cartella', stato: 'aperta' } });
    expect(a.chiave).toBe('Fornitori/Letti');
    expect(a.messaggio).toMatch(/Fornitori\/Letti/);
    // una cartella mancante non conta come accesso fallito
    expect((await db.servizi_esecuzioni.findFirstOrThrow({ where: { servizio: 'casella', tipo: 'controllo' } })).misure).toMatchObject({ connessione: false });
  });

  it('lettura.non_raggiungibile si apre a 2 controlli di fila e si chiude al primo ok', async () => {
    const ko: Sonda = async () => ({ ok: false, testo: 'giù', misure: { errore: 'ECONNREFUSED' } });
    await controllaServizio(db, 'lettura', ko);
    expect(await db.registro.count({ where: { codice: 'lettura.non_raggiungibile', stato: 'aperta' } })).toBe(0);
    await controllaServizio(db, 'lettura', ko);
    expect(await db.registro.count({ where: { codice: 'lettura.non_raggiungibile', stato: 'aperta' } })).toBe(1);
    await controllaServizio(db, 'lettura', riuscita);
    expect(await db.registro.count({ where: { codice: 'lettura.non_raggiungibile', stato: 'aperta' } })).toBe(0);
  });

  it('integra.vista si apre subito con il nome della vista; posta.connessione al primo controllo fallito', async () => {
    await controllaServizio(db, 'integra', async () => ({ ok: false, vista: 'v_fornitori', testo: 'manca', misure: {} }));
    const v = await db.registro.findFirstOrThrow({ where: { codice: 'integra.vista', stato: 'aperta' } });
    expect(v.chiave).toBe('v_fornitori');
    await controllaServizio(db, 'posta', async () => ({ ok: false, testo: 'non risponde', misure: { errore: 'ECONNREFUSED' } }));
    expect(await db.registro.count({ where: { codice: 'posta.connessione', stato: 'aperta' } })).toBe(1);
  });

  it('un servizio non configurato scrive un controllo verde e chiude le sue anomalie', async () => {
    await anomalia({ servizio: 'posta', codice: 'posta.connessione' });
    const nonConfigurata: Sonda = async () => ({ ok: true, configurata: false, testo: 'non configurata' });
    await controllaServizio(db, 'posta', nonConfigurata);
    const giro = await db.servizi_esecuzioni.findFirstOrThrow({ where: { servizio: 'posta', tipo: 'controllo' } });
    expect(giro).toMatchObject({ esito: 'ok', testo: 'non configurata' });
    expect(giro.misure).toMatchObject({ configurata: false });
    expect(await db.registro.count({ where: { codice: 'posta.connessione', stato: 'aperta' } })).toBe(0);
  });

  it('eseguiControlli fa i quattro controlli in un colpo', async () => {
    const tutte: Sonda = async () => ({ ok: true, testo: 'ok', misure: {} });
    await eseguiControlli(db, { casella: tutte, lettura: tutte, integra: tutte, posta: tutte });
    expect(await db.servizi_esecuzioni.count({ where: { tipo: 'controllo' } })).toBe(4);
  });
});

describe('F5-A5 *Controlla adesso* (§7.14.5)', () => {
  it('con i servizi spenti risponde subito, senza rete, e scrive i quattro controlli', async () => {
    await imposta('casella', { server: '', utente: '', password: null });
    await imposta('posta', { server: '', utente: '', password: null });
    await imposta('integra', { server: '', database: '', utente: '', password: null });
    const r = await invia(ammi, 'ammi-sis', '/api/sistema/controlla').expect(200);
    expect(r.body.fatto).toBe(true);
    expect(await db.servizi_esecuzioni.count({ where: { tipo: 'controllo' } })).toBe(4);
  });

  it('una prova lenta non trattiene la risposta oltre il tempo massimo', async () => {
    const lenta: Sonda = () => new Promise((ok) => setTimeout(() => ok({ ok: true, testo: 'tardi' }), 500));
    const inizio = Date.now();
    const r = await controllaTutto(db, casella, { attesaMs: 100, sonde: { casella: lenta, lettura: lenta, integra: lenta, posta: lenta } });
    const durata = Date.now() - inizio;
    expect(r.fatto).toBe(false);
    expect(durata).toBeLessThan(450);
    await new Promise((ok) => setTimeout(ok, 600)); // le prove lente finiscono lo stesso, dopo
    expect(await db.servizi_esecuzioni.count({ where: { tipo: 'controllo' } })).toBe(4);
  });
});

describe('F5-A5 ultime esecuzioni e permessi', () => {
  it('i controlli riusciti senza novità si raggruppano, i lavori restano riga per riga', async () => {
    await esecuzione('casella', minutiFa(30), 'ok', 'controllo');
    await esecuzione('casella', minutiFa(20), 'ok', 'controllo');
    await esecuzione('casella', minutiFa(10), 'ok', 'controllo');
    await esecuzione('casella', minutiFa(2), 'ok', 'lavoro', { allegati: 1 });
    const r = (await ammi.get('/api/sistema').expect(200)).body;
    const giri = r.esecuzioni;
    expect(giri).toHaveLength(2);
    expect(giri[1].raggruppate).toBe(3);
    expect(giri[1].testo).toMatch(/^3 controlli riusciti dalle \d{2}:\d{2}$/);
    expect(giri[0].testo).toBe('casella ok');
  });

  it('il servizio scelto filtra le esecuzioni', async () => {
    await esecuzione('casella', minutiFa(2));
    await esecuzione('integra', minutiFa(1));
    const r = (await ammi.get('/api/sistema?servizio=integra').expect(200)).body;
    expect(r.esecuzioni).toHaveLength(1);
    expect(r.esecuzioni[0].servizio).toBe('integra');
  });

  it('lo Stato del sistema è per amministratore e operatore, non per la sola lettura', async () => {
    await oper.get('/api/sistema').expect(200);
    await oper.get('/api/sistema/contatore').expect(200);
    await lett.get('/api/sistema').expect(403);
    await lett.get('/api/sistema/contatore').expect(403);
  });
});
