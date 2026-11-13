// Prova del seed (fase 2b, spec §12): lo lancia su decobrands_test_2b e controlla i conteggi e i casi di §12.
// Il database di prova parte vuoto: la prova lo svuota prima e dopo (solo le tabelle del seed e gli utenti di prova).
import 'dotenv/config';
import { PrismaService } from '../src/prisma.service';
import { seed } from '../prisma/seed';
import { svuota as svuotaDb, USERNAME } from './svuota';

let db: PrismaService;
const svuota = () => svuotaDb(db);

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
    expect(await db.fornitori.count()).toBe(12); // 11 del prototipo + MCL (D-101)
    expect(await db.fornitori_versioni.count()).toBe(12);
    expect(await db.clienti.count()).toBe(13); // 11 del prototipo + MCL e Consorzio Agrario
    expect(await db.clienti_versioni.count()).toBe(13);
    expect(await db.codici_esterni.count()).toBe(25); // 22 + i due codici di MCL e quello del Consorzio
    expect(await db.subagenti.count()).toBe(4);
    expect(await db.interscambio.count()).toBe(18);
    expect(await db.provvigioni_scaglioni.count()).toBe(33);
    expect(await db.ordini_fornitore_testata.count()).toBe(54); // 52 del prototipo + 2 di §12 (OF/2026/S12-…)
    // D-60: anche ordini e conferme sono documenti; fatture e note di credito restano 36 + 2 + 2
    expect(await db.ordini_fornitore_documenti.count({ where: { tipo: { in: ['fattura', 'nota_credito'] } } })).toBe(36 + 2 + 2);
    expect(await db.ordini_fornitore_documenti.count({ where: { tipo: 'ordine' } })).toBe(54);
    expect(await db.ordini_fornitore_righe.count({ where: { documento_id: null } })).toBe(0);
    expect(await db.bollettini_testata.count()).toBe(7);
    expect(await db.bollettini_righe.count()).toBe(10);
    expect(await db.liquidazioni.count()).toBe(2);
    expect(await db.documenti_in_arrivo.count()).toBe(17);
    expect(await db.utenti.count({ where: { username: { in: USERNAME } } })).toBe(5);
    expect(await db.registro.count({ where: { genere: 'anomalia' } })).toBe(6);
    expect(await db.registro.count({ where: { genere: 'evento', codice: 'errore.error' } })).toBe(1);
  });

  it('documento con fornitore non riconosciuto: livello da controllare, mai «affidabile» (A6-18)', async () => {
    const d = await db.documenti_in_arrivo.findFirstOrThrow({ where: { file_nome: 'ordine_OF-2026-064.pdf' }, select: { livello: true } });
    expect(d.livello).toBe('da_controllare');
  });

  it('anagrafica a soggetti: un soggetto per ruolo, MCL con due ruoli (D-101, D-102)', async () => {
    expect(await db.soggetti.count()).toBe(28); // 12 fornitori + 13 clienti − MCL condivisa + 4 subagenti persone
    expect(await db.sedi.count()).toBe(8); // MCL 4, Consorzio 4
    expect(await db.recapiti.count()).toBe(5);
    expect(await db.persone.count()).toBe(1);
    expect(await db.persone_contatti.count()).toBe(2); // la stessa persona referente di due aziende
    expect(await db.fatturazione.count()).toBe(2);

    const mcl = await db.soggetti.findFirstOrThrow({ where: { piva_norm: '08943010155' }, include: { clienti: true, fornitori: true } });
    expect(mcl.codice).toMatch(/^C\d{6}$/);
    expect(mcl.clienti).toHaveLength(1);
    expect(mcl.fornitori).toHaveLength(1);
    const codici = await db.codici_esterni.findMany({ where: { OR: [{ tipo: 'cliente', entita_id: mcl.clienti[0].id }, { tipo: 'fornitore', entita_id: mcl.fornitori[0].id }] } });
    expect(codici.map((c) => c.codice).sort()).toEqual(['C02477', 'F90012']);
    expect(await db.subagenti.count({ where: { soggetto_id: { not: null } } })).toBe(4);
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

  it('eccezione Bastasin 3 sullo sconto 1 % di Gries, dal 2025-01-01 senza fine (D-51)', async () => {
    const e = await db.provvigioni_eccezioni.findMany({ include: { fornitore: { include: { corrente: true } }, subagente: true } });
    expect(e).toHaveLength(1);
    expect(e[0].subagente.cognome).toBe('Bastasin');
    expect(Number(e[0].pct_personale)).toBe(3);
    expect(Number(e[0].sconto_min)).toBe(1);
    expect([e[0].valido_dal.toISOString().slice(0, 10), e[0].valido_al]).toEqual(['2025-01-01', null]);
    expect(e[0].fornitore.corrente?.ragione_sociale).toMatch(/^Gries/);
  });
});
