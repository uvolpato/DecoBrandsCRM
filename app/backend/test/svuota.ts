// Svuota le tabelle del seed e gli utenti di prova su decobrands_test (seed.spec, motore.spec).
import { PrismaService } from '../src/prisma.service';

export const USERNAME = ['ugo', 'matteo', 'giulia', 'luca', 'servizi'];

// ordine: prima le tabelle che puntano alle altre
export async function svuota(db: PrismaService) {
  await db.$executeRawUnsafe(`ALTER TABLE clienti_versioni DISABLE TRIGGER USER; ALTER TABLE fornitori_versioni DISABLE TRIGGER USER; ALTER TABLE registro DISABLE TRIGGER USER`);
  try {
    await db.$executeRawUnsafe(`
      TRUNCATE bollettini_righe, bollettini_testata, ordini_fornitore_righe, provvigioni_correzioni, ordini_fornitore_documenti, ordini_fornitore_testata,
        documenti_campi, documenti_in_arrivo, liquidazioni, interscambio, provvigioni_eccezioni, provvigioni_scaglioni, subagenti, agenti,
        codici_esterni, servizi_esecuzioni, impostazioni, registro, clienti, clienti_versioni, fornitori, fornitori_versioni,
        modifiche, sconti, recapiti, persone_contatti, fatturazione, sedi, persone, soggetti, gruppi, settori RESTART IDENTITY CASCADE`);
  } finally {
    await db.$executeRawUnsafe(`ALTER TABLE clienti_versioni ENABLE TRIGGER USER; ALTER TABLE fornitori_versioni ENABLE TRIGGER USER; ALTER TABLE registro ENABLE TRIGGER USER`);
  }
  // il codice del soggetto usa una sequenza sua (§4.1): TRUNCATE … RESTART IDENTITY non la tocca
  await db.$executeRawUnsafe(`ALTER SEQUENCE soggetti_codice_seq RESTART WITH 1`);
  // utenti di prova rimasti da altre prove (es. superutente): si tolgono tutti, senza toccare i dati veri
  const prova = (await db.utenti.findMany({ where: { email: { contains: '@prova-' } }, select: { id: true } })).map((u) => u.id);
  if (prova.length) {
    await db.sessioni.deleteMany({ where: { utente_id: { in: prova } } });
    await db.utenti.deleteMany({ where: { id: { in: prova } } });
  }
  await db.utenti.deleteMany({ where: { username: { in: USERNAME } } });
}
