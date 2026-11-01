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
        codici_esterni, servizi_esecuzioni, impostazioni, registro, clienti, clienti_versioni, fornitori, fornitori_versioni RESTART IDENTITY CASCADE`);
  } finally {
    await db.$executeRawUnsafe(`ALTER TABLE clienti_versioni ENABLE TRIGGER USER; ALTER TABLE fornitori_versioni ENABLE TRIGGER USER; ALTER TABLE registro ENABLE TRIGGER USER`);
  }
  await db.utenti.deleteMany({ where: { username: { in: USERNAME } } });
}
