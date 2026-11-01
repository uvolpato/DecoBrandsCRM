// Prova del seed (fase 2b, spec §12): lo lancia su decobrands_test_2b e controlla i conteggi e i casi di §12.
// Il database di prova parte vuoto: la prova lo svuota prima e dopo (solo le tabelle del seed e gli utenti di prova).
import 'dotenv/config';
import { PrismaService } from '../src/prisma.service';
import { seed } from '../prisma/seed';

let db: PrismaService;
const USERNAME = ['ugo', 'matteo', 'giulia', 'luca', 'servizi'];

// ordine: prima le tabelle che puntano alle altre
async function svuota() {
  await db.$executeRawUnsafe(`ALTER TABLE clienti_versioni DISABLE TRIGGER USER; ALTER TABLE fornitori_versioni DISABLE TRIGGER USER; ALTER TABLE registro DISABLE TRIGGER USER`);
  try {
    await db.$executeRawUnsafe(`
      TRUNCATE bollettini_righe, bollettini_testata, ordini_fornitore_righe, provvigioni_correzioni, ordini_fornitore_documenti, ordini_fornitore_testata,
        documenti_campi, documenti_in_arrivo, liquidazioni, interscambio, provvigioni_eccezioni, provvigioni_scaglioni, subagenti, agenti,
        codici_esterni, servizi_esecuzioni, impostazioni, registro, clienti, clienti_versioni, fornitori, fornitori_versioni RESTART IDENTITY CASCADE`);
  } finally {
    await db.$executeRawUnsafe(`ALTER TABLE clienti_versioni ENABLE TRIGGER USER; ALTER TABLE fornitori_versioni ENABLE TRIGGER USER; ALTER TABLE registro ENABLE TRIGGER USER`);
  }
  await db.utenti.deleteMany({ where: { username: { in: USERNAME } } });
}

beforeAll(async () => {
  db = new PrismaService();
  await svuota();
});
afterAll(async () => {
  await svuota();
  await db.$disconnect();
});

describe('seed §12', () => {
  it('carica i dati e al secondo giro si ferma', async () => {
    expect(await seed(db)).toBe(true);
    expect(await seed(db)).toBe(false);
  });

  it('conteggi principali', async () => {
    expect(await db.fornitori.count()).toBe(10);
    expect(await db.fornitori_versioni.count()).toBe(10);
    expect(await db.clienti.count()).toBe(11);
    expect(await db.clienti_versioni.count()).toBe(11);
    expect(await db.codici_esterni.count()).toBe(21);
    expect(await db.subagenti.count()).toBe(4);
    expect(await db.interscambio.count()).toBe(18);
    expect(await db.provvigioni_scaglioni.count()).toBe(33);
    expect(await db.ordini_fornitore_testata.count()).toBe(54); // 52 del prototipo + 2 di §12 (OF/2026/S12-…)
    expect(await db.ordini_fornitore_documenti.count()).toBe(36 + 2 + 2);
    expect(await db.bollettini_testata.count()).toBe(7);
    expect(await db.bollettini_righe.count()).toBe(10);
    expect(await db.liquidazioni.count()).toBe(2);
    expect(await db.documenti_in_arrivo.count()).toBe(13);
    expect(await db.utenti.count({ where: { username: { in: USERNAME } } })).toBe(5);
    expect(await db.registro.count({ where: { genere: 'anomalia' } })).toBe(6);
    expect(await db.registro.count({ where: { genere: 'evento', codice: 'errore.error' } })).toBe(1);
  });

  it('ogni pratica punta alla versione corrente dei suoi fornitore e cliente', async () => {
    const t = await db.ordini_fornitore_testata.findFirstOrThrow({ where: { numero_ordine: 'OF/2026/045' }, include: { fornitore: { include: { fornitore: true } } } });
    expect(t.fornitore_versione_id).toBe(t.fornitore.fornitore.versione_corrente_id);
    expect(t.fornitore.ragione_sociale).toMatch(/^Gries/);
  });

  it('conferma ridotta 7/10', async () => {
    const t = await db.ordini_fornitore_testata.findFirstOrThrow({ where: { numero_ordine: 'OF/2026/S12-1' } });
    expect(await db.ordini_fornitore_righe.count({ where: { testata_id: t.id, fase: 'ordine' } })).toBe(10);
    expect(await db.ordini_fornitore_righe.count({ where: { testata_id: t.id, fase: 'conferma' } })).toBe(7);
    expect(t.stato).toBe('confermato');
  });

  it('fattura in più tranche', async () => {
    const t = await db.ordini_fornitore_testata.findFirstOrThrow({ where: { numero_ordine: 'OF/2026/S12-2' }, include: { documenti: true } });
    expect(t.documenti.filter((d) => d.tipo === 'fattura')).toHaveLength(2);
    expect(t.stato).toBe('fatturato');
  });

  it('nota di credito parziale con importo negativo, legata alla sua fattura', async () => {
    const nc = await db.ordini_fornitore_documenti.findFirstOrThrow({ where: { numero: 'NC-2026-005' }, include: { fattura: true } });
    expect(Number(nc.importo)).toBe(-1311);
    expect(nc.storno_totale).toBe(false);
    expect(nc.fattura?.numero).toBe('F-2026-0815');
  });

  it('eccezione Bastasin 3 sullo scaglione 1 %', async () => {
    const e = await db.provvigioni_eccezioni.findMany({ include: { scaglione: { include: { fornitore: { include: { corrente: true } } } }, subagente: true } });
    expect(e).toHaveLength(1);
    expect(e[0].subagente.cognome).toBe('Bastasin');
    expect(Number(e[0].pct_personale)).toBe(3);
    expect(Number(e[0].scaglione.sconto_min)).toBe(1);
    expect(e[0].scaglione.fornitore.corrente?.ragione_sociale).toMatch(/^Gries/);
  });
});
