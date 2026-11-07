// Prova della casella dei documenti (F6-A1, §6.5 punti 1–2, §7.14, D-66): un giro con una casella
// finta (nessuna rete), anomalie e giri in servizi_esecuzioni; il servizio pianificato rispetta minuti.
import 'dotenv/config';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import { configura } from '../src/main';
import { CasellaService, giroCasella, type ApriCasella, type ConfigCasella, type MessaggioEmail } from '../src/casella';
import { cifra } from '../src/segreto';
import { PrismaService } from '../src/prisma.service';
import { svuota } from './svuota';

let app: NestExpressApplication;
let db: PrismaService;
let servizio: CasellaService;

const config: ConfigCasella = {
  server: 'imap.x', porta: 993, utente: 'u', password: 'p', cartella: 'Fornitori', cartella_lette: 'Fornitori/Letti', minuti: 2,
};
const ora = new Date('2026-09-04T10:00:00Z');

const pdf = (testo: string) => Buffer.from(`%PDF-1.4\n% ${testo}\n%%EOF\n`);
const excel = () => Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00]); // firma zip (xlsx/xlsm)
const msg = (uid: number, oggetto: string, da: string, allegati: { nome: string; dati: Buffer }[]): MessaggioEmail =>
  ({ uid, da, oggetto, allegati });

function apriFinto(messaggi: MessaggioEmail[]) {
  const sposta = jest.fn(async () => undefined);
  const chiudi = jest.fn(async () => undefined);
  const apri: ApriCasella = async () => ({
    messaggi: (async function* () { for (const m of messaggi) yield m; })(),
    sposta, chiudi,
  });
  return { apri, sposta, chiudi };
}

const anomalia = (codice: string, stato?: string) => db.registro.count({ where: { codice, ...(stato ? { stato } : {}) } });

beforeAll(async () => {
  process.env.SEGRETI_CHIAVE = 'chiave-di-prova-casella';
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
  db = app.get(PrismaService);
  servizio = app.get(CasellaService);
}, 120_000);

afterAll(async () => {
  await svuota(db);
  await app.close();
});

beforeEach(async () => {
  await svuota(db);
});

describe('F6-A1 un giro della casella', () => {
  it('un PDF entra in coda con origine email e l\'evento; un Excel è ignorato con casella.allegato', async () => {
    const { apri, sposta } = apriFinto([
      msg(1, 'Fattura', 'fornitore@x.it', [{ nome: 'fattura.pdf', dati: pdf('fattura 1') }]),
      msg(2, 'Bollettino', 'fornitore@x.it', [{ nome: 'bollettino.xlsx', dati: excel() }]),
    ]);
    const r = await giroCasella(db, config, apri, ora);
    expect(r).toMatchObject({ email: 2, presi: 1, ignorati: 1, esito: 'attenzione' });
    const riga = await db.documenti_in_arrivo.findFirstOrThrow();
    expect(riga).toMatchObject({ origine: 'email', email_da: 'fornitore@x.it', email_oggetto: 'Fattura', stato: 'in_coda', file_nome: 'fattura.pdf' });
    expect(await db.registro.count({ where: { codice: 'documento.upload' } })).toBe(1);
    expect(await anomalia('casella.allegato', 'aperta')).toBe(1);
    expect(sposta).toHaveBeenCalledTimes(2); // anche l'email con l'allegato ignorato
    const esecuzione = await db.servizi_esecuzioni.findFirstOrThrow({ where: { servizio: 'casella' } });
    expect(esecuzione.esito).toBe('attenzione');
    expect(esecuzione.misure).toMatchObject({ email: 2, allegati: 1, ignorati: 1, connessione: true });
  });

  it('lo stesso PDF in due email: una sola riga, il secondo ignorato senza errore né anomalia', async () => {
    const dati = pdf('doppione');
    const { apri } = apriFinto([
      msg(1, 'Uno', 'a@x.it', [{ nome: 'a.pdf', dati }]),
      msg(2, 'Due', 'a@x.it', [{ nome: 'b.pdf', dati }]),
    ]);
    const r = await giroCasella(db, config, apri, ora);
    expect(r).toMatchObject({ email: 2, presi: 1, ignorati: 1, esito: 'ok' });
    expect(await db.documenti_in_arrivo.count()).toBe(1);
    expect(await anomalia('casella.allegato')).toBe(0);
  });

  it('email senza allegati: casella.vuota, nessuna riga', async () => {
    const { apri } = apriFinto([msg(1, 'Senza allegati', 'a@x.it', [])]);
    const r = await giroCasella(db, config, apri, ora);
    expect(r).toMatchObject({ email: 1, presi: 0, ignorati: 0, esito: 'attenzione' });
    expect(await db.documenti_in_arrivo.count()).toBe(0);
    expect(await anomalia('casella.vuota', 'aperta')).toBe(1);
  });

  it('email oltre il limite: non scaricata, casella.allegato e si sposta', async () => {
    const { apri, sposta } = apriFinto([
      { uid: 1, da: '', oggetto: '', allegati: [], troppoGrande: 123456789 },
      msg(2, 'Fattura', 'fornitore@x.it', [{ nome: 'fattura.pdf', dati: pdf('fattura 1') }]),
    ]);
    const r = await giroCasella(db, config, apri, ora);
    expect(r).toMatchObject({ email: 2, presi: 1, ignorati: 0, esito: 'attenzione' });
    expect(await anomalia('casella.allegato', 'aperta')).toBe(1);
    expect(await db.documenti_in_arrivo.count()).toBe(1);
    expect(sposta).toHaveBeenCalledTimes(2); // anche l'email troppo grande va spostata
  });

  it('connessione fallita 3 volte: casella.connessione aperta; al primo giro riuscito si chiude', async () => {
    const apriKo: ApriCasella = async () => { throw new Error('ECONNREFUSED'); };
    for (let i = 0; i < 3; i++) {
      expect((await giroCasella(db, config, apriKo, new Date(ora.getTime() + i * 60_000))).esito).toBe('errore');
    }
    expect(await anomalia('casella.connessione', 'aperta')).toBe(1);
    expect(await anomalia('casella.cartella')).toBe(0);
    const { apri } = apriFinto([]);
    await giroCasella(db, config, apri, new Date(ora.getTime() + 4 * 60_000));
    expect(await anomalia('casella.connessione', 'aperta')).toBe(0);
  });

  it('cartella mancante: casella.cartella subito, nessuna casella.connessione', async () => {
    const apriKo: ApriCasella = async () => { throw Object.assign(new Error('cartella assente'), { cartella: 'Fornitori' }); };
    expect((await giroCasella(db, config, apriKo, ora)).esito).toBe('errore');
    expect(await anomalia('casella.cartella', 'aperta')).toBe(1);
    expect(await anomalia('casella.connessione')).toBe(0);
  });
});

describe('F6-A1 il servizio pianificato', () => {
  it('configurazione incompleta: nessun giro e nessuna anomalia', async () => {
    expect(await servizio.esegui()).toBeNull();
    expect(await db.servizi_esecuzioni.count({ where: { servizio: 'casella' } })).toBe(0);
    expect(await db.registro.count({ where: { codice: { startsWith: 'casella.' } } })).toBe(0);
  });

  it('forse rispetta minuti: un solo giro finché non passa il tempo', async () => {
    await db.impostazioni.create({
      data: { chiave: 'casella', valore: { server: 'imap.x', porta: 993, utente: 'u', password: cifra('pw'), cartella: 'Fornitori', cartella_lette: 'Fornitori/Letti', minuti: 60 } },
    });
    const spia = jest.spyOn(servizio, 'esegui').mockResolvedValue(null);
    await servizio.forse();
    expect(spia).toHaveBeenCalledTimes(1);
    await servizio.forse(); // minuti=60: non ancora passati
    expect(spia).toHaveBeenCalledTimes(1);
    spia.mockRestore();
  });
});
