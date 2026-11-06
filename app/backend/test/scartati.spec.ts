// Prova dei documenti scartati (F5-A7, §7.16, §8.1, D-74): elenco con motivo, autore e data di
// eliminazione automatica, ricerca e conteggi dei segmenti (D-23), recupero fra quelli da
// controllare, eliminazione definitiva solo dell'amministratore, 409, pulizia oltre i giorni.
import 'dotenv/config';
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configura } from '../src/main';
import { cifra as cifraPassword } from '../src/password';
import { PrismaService } from '../src/prisma.service';
import { pulisciScartati } from '../src/sistema';
import { seed } from '../prisma/seed';
import { svuota } from './svuota';

let app: NestExpressApplication;
let db: PrismaService;
const DOMINIO = '@prova-scartati.it';
const PW = 'password-di-prova';
const token: Record<string, string> = {};

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
const invia = (agente: Awaited<ReturnType<typeof entra>>, utente: string, rotta: string) =>
  agente.post(rotta).set('x-csrf-token', token[utente]);
const cancella = (agente: Awaited<ReturnType<typeof entra>>, utente: string, rotta: string) =>
  agente.delete(rotta).set('x-csrf-token', token[utente]);

let ammi: Awaited<ReturnType<typeof entra>>;
let resp: Awaited<ReturnType<typeof entra>>;
let oper: Awaited<ReturnType<typeof entra>>;
let lett: Awaited<ReturnType<typeof entra>>;
let ammiId: bigint;
let fornitore: { id: bigint; versione: bigint; nome: string };

/** Un documento scartato con il suo file su disco e i campi letti (numero e cliente). */
async function scartato(opzioni: { nome: string; numero: string; cliente?: string; motivo?: string; quando?: Date } = { nome: 'x', numero: 'X-1' }) {
  const contenuto = Buffer.from('%PDF-1.4\n% ' + opzioni.nome + ' ' + Math.random() + '\n%%EOF\n');
  const hash = createHash('sha256').update(contenuto).digest('hex');
  const percorso = `in_arrivo/2026/20260901/${hash}.pdf`;
  const radice = process.env.DOCUMENTI_DIR!;
  await mkdir(dirname(join(radice, percorso)), { recursive: true });
  await writeFile(join(radice, percorso), contenuto);
  const d = await db.documenti_in_arrivo.create({
    data: {
      origine: 'caricamento', file_nome: `Prova_${opzioni.nome}.pdf`, file_hash: hash, file_percorso: percorso,
      stato: 'scartato', tipo: 'fattura', fornitore_id: fornitore.id, fornitore_versione_id: fornitore.versione,
      ricevuto_il: new Date('2026-09-01T08:00:00Z'), scartato_il: opzioni.quando ?? new Date(), scartato_da: ammiId,
      motivo_scarto: opzioni.motivo ?? 'Doppione', nota_scarto: opzioni.nome === 'x' ? null : 'nota ' + opzioni.nome,
    },
  });
  await db.documenti_campi.createMany({ data: [
    { documento_id: d.id, campo: 'numero', valore_letto: opzioni.numero, affidabilita: 0.95, verificato: false },
    { documento_id: d.id, campo: 'cliente', valore_letto: opzioni.cliente ?? 'Serra Bella', affidabilita: 0.95, verificato: false },
  ] });
  return d;
}
const fileCè = async (id: bigint) => {
  const d = await db.documenti_in_arrivo.findUnique({ where: { id } });
  if (!d) return false;
  return access(join(process.env.DOCUMENTI_DIR!, d.file_percorso)).then(() => true, () => false);
};

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configura(mod.createNestApplication<NestExpressApplication>({ logger: false }));
  await app.init();
  db = app.get(PrismaService);
  await svuota(db);
  await seed(db);
  const ammiU = await creaUtente('ammi-sc', 'amministratore', [{ area: 'provvigioni', livello: 'responsabile' }]);
  await creaUtente('resp-sc', 'utente', [{ area: 'provvigioni', livello: 'responsabile' }]);
  await creaUtente('oper-sc', 'utente', [{ area: 'provvigioni', livello: 'operatore' }]);
  await creaUtente('lett-sc', 'utente', [{ area: 'provvigioni', livello: 'lettura' }]);
  [ammi, resp, oper, lett] = await Promise.all([entra('ammi-sc'), entra('resp-sc'), entra('oper-sc'), entra('lett-sc')]);
  ammiId = ammiU.id;
  const f = await db.fornitori.findFirstOrThrow({ where: { versione_corrente_id: { not: null } }, include: { corrente: true } });
  fornitore = { id: f.id, versione: f.versione_corrente_id!, nome: f.corrente!.ragione_sociale };
}, 120_000);

afterAll(async () => {
  await svuota(db);
  await app.close();
});

beforeEach(async () => {
  // gli scartati del seed non hanno file: ogni prova parte dai suoi
  await db.documenti_in_arrivo.deleteMany({ where: { stato: 'scartato' } });
});

describe('F5-A7 elenco (§7.16)', () => {
  it('scarto il/da, documento, motivo e nota, eliminazione automatica a 90 giorni', async () => {
    const a = await scartato({ nome: 'a', numero: 'F-100', cliente: 'Vivaio Verde' });
    await scartato({ nome: 'b', numero: 'F-200', motivo: 'Altro' });

    const r = (await ammi.get('/api/scartati').expect(200)).body;
    expect(r.totale).toBe(2);
    expect(r.giorni).toBe(90);
    expect(r.conteggi).toEqual({ tutti: 2, per_motivo: [{ motivo: 'Doppione', n: 1 }, { motivo: 'Altro', n: 1 }] });
    const riga = r.scartati.find((x: { id: string }) => x.id === String(a.id));
    expect(riga).toMatchObject({
      numero: 'F-100', cliente: 'Vivaio Verde', fornitore: fornitore.nome, motivo: 'Doppione',
      file_nome: 'Prova_a.pdf', tipo: 'fattura', da: 'Prova ammi-sc',
    });
    const quando = new Date(riga.scartato_il);
    expect(riga.elimina_il).toBe(new Date(quando.getTime() + 90 * 86_400_000).toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' }));
  });

  it('segments per motivo, ricerca per numero e per fornitore, pagine', async () => {
    await scartato({ nome: 'a', numero: 'F-100' });
    await scartato({ nome: 'b', numero: 'F-200', motivo: 'Documento illeggibile' });
    const perMotivo = (await ammi.get('/api/scartati?motivo=Altro').expect(200)).body;
    expect(perMotivo.totale).toBe(0);
    const doppione = (await ammi.get('/api/scartati?motivo=Doppione').expect(200)).body;
    expect(doppione.totale).toBe(1);
    expect(doppione.conteggi.tutti).toBe(2); // il conteggio degli altri motivi non cambia (D-23)

    const cerca = (await ammi.get('/api/scartati?q=F-200').expect(200)).body;
    expect(cerca.totale).toBe(1);
    expect(cerca.scartati[0].numero).toBe('F-200');
    const cercaFornitore = (await ammi.get('/api/scartati?q=' + encodeURIComponent(fornitore.nome.slice(0, 6))).expect(200)).body;
    expect(cercaFornitore.totale).toBe(2);

    const pagina = (await ammi.get('/api/scartati?per_pagina=1').expect(200)).body;
    expect(pagina.scartati).toHaveLength(1);
    expect(pagina.pagine).toBe(2);
  });

  it('senza il permesso dei documenti scartati: 403', async () => {
    await lett.get('/api/scartati').expect(403);
  });
});

describe('F5-A7 recupero (§7.16)', () => {
  it('torna «da controllare» con i campi di scarto puliti e l’evento', async () => {
    const d = await scartato({ nome: 'rec', numero: 'F-300' });
    await invia(oper, 'oper-sc', `/api/scartati/${d.id}/recupera`).expect(204);
    const dopo = await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: d.id } });
    expect(dopo).toMatchObject({ stato: 'da_controllare', tentativi: 0, errore: null, scartato_il: null, scartato_da: null, motivo_scarto: null, nota_scarto: null });
    const evento = await db.registro.findFirstOrThrow({ where: { entita: 'documento', entita_id: d.id, codice: 'documento.update' } });
    expect(evento.dettaglio).toMatchObject({ documento_id: String(d.id), stato: 'da_controllare', dopo: { stato: 'da_controllare' } });

    // già recuperato: 409, e il documento non cambia
    await invia(oper, 'oper-sc', `/api/scartati/${d.id}/recupera`).expect(409);
    await invia(oper, 'oper-sc', '/api/scartati/999999/recupera').expect(404);
  });
});

describe('F5-A7 eliminazione definitiva (§7.16)', () => {
  it('l’amministratore elimina riga e file, con l’evento', async () => {
    const d = await scartato({ nome: 'elimina', numero: 'F-400' });
    expect(await fileCè(d.id)).toBe(true);
    await cancella(ammi, 'ammi-sc', `/api/scartati/${d.id}`).expect(204);
    expect(await db.documenti_in_arrivo.findUnique({ where: { id: d.id } })).toBeNull();
    expect(await db.documenti_campi.count({ where: { documento_id: d.id } })).toBe(0);
    expect(await fileCè(d.id)).toBe(false);
    const evento = await db.registro.findFirstOrThrow({ where: { entita: 'documento', entita_id: d.id } });
    expect(evento.dettaglio).toMatchObject({ eliminato: true, documento_id: String(d.id) });
  });

  it('un responsabile non amministratore e un operatore non eliminano', async () => {
    const d = await scartato({ nome: 'resta', numero: 'F-500' });
    await cancella(resp, 'resp-sc', `/api/scartati/${d.id}`).expect(403);
    await cancella(oper, 'oper-sc', `/api/scartati/${d.id}`).expect(403);
    expect(await db.documenti_in_arrivo.findUnique({ where: { id: d.id } })).not.toBeNull();
  });

  it('409 se il documento non è scartato, 404 se non c’è', async () => {
    const d = await scartato({ nome: 'ricicla', numero: 'F-600' });
    await invia(ammi, 'ammi-sc', `/api/scartati/${d.id}/recupera`).expect(204);
    await cancella(ammi, 'ammi-sc', `/api/scartati/${d.id}`).expect(409);
    await cancella(ammi, 'ammi-sc', '/api/scartati/999999').expect(404);
  });
});

describe('F5-A7 pulizia oltre i giorni di conservazione (§7.15-16)', () => {
  it('elimina solo gli scartati più vecchi di «scartati_giorni», con i file', async () => {
    await db.impostazioni.update({ where: { chiave: 'conservazione' }, data: { valore: { eventi_mesi: 36, scartati_giorni: 10, righe_pagina: 25 } } });
    const vecchio = await scartato({ nome: 'vecchio', numero: 'F-700', quando: new Date(Date.now() - 20 * 86_400_000) });
    const recente = await scartato({ nome: 'recente', numero: 'F-701', quando: new Date(Date.now() - 86_400_000) });

    expect(await pulisciScartati(db)).toBe(1);
    expect(await db.documenti_in_arrivo.findUnique({ where: { id: vecchio.id } })).toBeNull();
    expect(await db.documenti_in_arrivo.findUnique({ where: { id: recente.id } })).not.toBeNull();
    expect(await fileCè(vecchio.id)).toBe(false);
    expect(await fileCè(recente.id)).toBe(true);
    // nessun evento: la pulizia è manutenzione (D-74)
    expect(await db.registro.count({ where: { entita: 'documento', entita_id: vecchio.id } })).toBe(0);

    await rm(join(process.env.DOCUMENTI_DIR!, 'in_arrivo'), { recursive: true, force: true });
  });
});
