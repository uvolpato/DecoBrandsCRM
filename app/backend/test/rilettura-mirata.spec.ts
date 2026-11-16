// Prova del comando di servizio `rileggi:mirata` (15/11/2026): la funzione rileggiDocumento condivisa
// con la rotta POST /documenti/:id/rileggi e la decisione di rilettura (somma righe ≠ importo,
// congelato/correzioni, stato). I pagamenti senza righe non si rileggono (non sono articolati).
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../src/prisma.service';
import { rileggiDocumento } from '../src/documenti';
import { analizza, decide } from '../src/rilettura-mirata';
import { svuota } from './svuota';

let db: PrismaService;
let n = 0;

async function arrivo(opts: { stato?: string; file_nome?: string; tipo?: string | null; campi?: [string, string | null][] } = {}) {
  const d = await db.documenti_in_arrivo.create({
    data: {
      origine: 'email', file_nome: opts.file_nome ?? `d${++n}.pdf`, stato: opts.stato ?? 'da_controllare',
      ricevuto_il: new Date('2026-09-04T10:00:00Z'), letto_il: new Date('2026-09-04T10:01:00Z'),
      file_hash: createHash('sha256').update(String(++n)).digest('hex'), file_percorso: `in_arrivo/d${n}.pdf`,
      tipo: opts.tipo ?? null, fornitore_id: null, fornitore_versione_id: null,
    },
  });
  if (opts.campi?.length) await db.documenti_campi.createMany({ data: opts.campi.map(([campo, valore]) => ({ documento_id: d.id, campo, valore_letto: valore })) });
  return d;
}

beforeAll(async () => { db = new PrismaService(); });
afterAll(async () => { await db.$disconnect(); });
beforeEach(async () => { await svuota(db); });

describe('rileggiDocumento (stessa funzione della rotta)', () => {
  it('da_controllare torna in_coda, scrive l\'evento e chiude lettura.fallita', async () => {
    const d = await arrivo({ stato: 'da_controllare' });
    await rileggiDocumento(db, d.id);
    expect(await db.documenti_in_arrivo.findUniqueOrThrow({ where: { id: d.id } })).toMatchObject({ stato: 'in_coda', tentativi: 0, errore: null });
    expect(await db.registro.findFirst({ where: { codice: 'documento.update', entita_id: d.id } })).toBeTruthy();
  });

  it('abbinato non si rilegge: la rotta lo vieta', async () => {
    const d = await arrivo({ stato: 'abbinato' });
    await expect(rileggiDocumento(db, d.id)).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('decide (decisione pura)', () => {
  it('somma diversa → rileggere (se la rotta ammette lo stato)', () => {
    expect(decide({ stato: 'da_controllare', sommaDiversa: true, congelato: false, correzioni: 0 })).toBe('rileggere');
    expect(decide({ stato: 'abbinato', sommaDiversa: true, congelato: false, correzioni: 0 })).toBe('decidere');
  });
  it('somma diversa ma congelato o corretto a mano → decidere', () => {
    expect(decide({ stato: 'da_controllare', sommaDiversa: true, congelato: true, correzioni: 0 })).toBe('decidere');
    expect(decide({ stato: 'da_controllare', sommaDiversa: true, congelato: false, correzioni: 2 })).toBe('decidere');
  });
  it('nessun motivo → null', () => {
    expect(decide({ stato: 'da_controllare', sommaDiversa: false, congelato: false, correzioni: 0 })).toBe(null);
  });
});

describe('analizza (elenco su database)', () => {
  it('fattura con somma righe ≠ importo → rileggere; pagamento senza righe → nulla; riletto e ora coerente → nulla', async () => {
    const fattura = await arrivo({ tipo: 'fattura', campi: [['numero', 'RE1'], ['importo_totale', '963.78'], ['righe[0].importo', '876.28']] });
    const pagamento = await arrivo({ tipo: 'pagamento', campi: [['importo_totale', '1766.62']] });
    const coerente = await arrivo({ file_nome: 'Proforma_PR102829.pdf', tipo: 'proforma', campi: [['numero', 'PR102829'], ['importo_totale', '963.78'], ['righe[0].importo', '876.28'], ['righe[1].importo', '87.50']] });

    const m = new Map((await analizza(db, null)).map((r) => [r.id, r]));
    expect(m.get(String(fattura.id))!.esito).toBe('rileggere');
    expect(m.get(String(pagamento.id))!.esito).toBe(null);
    expect(m.get(String(coerente.id))!.esito).toBe(null);
  });
});
