// Prova dei vincoli del database (§4.2, D-31, D-33, D-34, D-35): ogni caso gira in una
// transazione annullata, il database resta vuoto. Serve DATABASE_URL in .env.
import 'dotenv/config';
import { Client } from 'pg';

const db = new Client({ connectionString: process.env.DATABASE_URL });
const q = (sql: string, p: unknown[] = []) => db.query(sql, p);

// esegue sql in un savepoint e restituisce il messaggio d'errore ('' se è passato)
async function errore(sql: string, p: unknown[] = []): Promise<string> {
  await q('SAVEPOINT s');
  try {
    await q(sql, p);
    await q('RELEASE SAVEPOINT s');
    return '';
  } catch (e) {
    await q('ROLLBACK TO SAVEPOINT s');
    return (e as Error).message;
  }
}

beforeAll(() => db.connect());
afterAll(() => db.end());
beforeEach(async () => {
  await q('BEGIN');
  await q(`INSERT INTO utenti (id, username, email, nome, ruolo, password_hash) VALUES (1, 'ugo', 'ugo@decobrands.it', 'Ugo', 'amministratore', 'x')`);
  await q(`INSERT INTO fornitori (id, ragione_sociale, codice_integra) VALUES (1, 'Gries', 'F1')`);
  await q(`INSERT INTO agenti (id, codice, nome, cognome) VALUES (1, 'DECO', 'Decobrands', 'SRL')`);
  await q(`INSERT INTO subagenti (id, agente_id, codice, nome, cognome) VALUES (1, 1, 'S1', 'Anna', 'R'), (2, 1, 'S2', 'Luca', 'B')`);
  await q(`INSERT INTO ordini_fornitore_testata (id, fornitore_id, numero_ordine, data_ordine, cliente_piva) VALUES (1, 1, 'O1', '2026-03-01', 'IT1')`);
  await q(`INSERT INTO ordini_fornitore_documenti (id, testata_id, tipo, numero, data, importo) VALUES (1, 1, 'fattura', 'FT1', '2026-03-10', 1000)`);
  await q(`INSERT INTO bollettini_testata (id, fornitore_id, mese, anno) VALUES (1, 1, 3, 2026)`);
  await q(`INSERT INTO liquidazioni (id, anno, trimestre, chiusa_da, totali) VALUES (1, 2026, 1, 1, '{}')`);
});
afterEach(() => q('ROLLBACK'));

describe('interscambio datato (D-35)', () => {
  const ins = `INSERT INTO interscambio (subagente_id, cliente_piva, fornitore_id, codice_cliente_fornitore, valido_dal, valido_al) VALUES ($1, $2, 1, $3, $4, $5)`;

  it('un solo subagente per cliente × fornitore in ogni giorno', async () => {
    expect(await errore(ins, [1, 'IT1', 'C1', '2026-01-01', null])).toBe('');
    expect(await errore(ins, [2, 'IT1', 'C1', '2026-06-01', null])).toMatch('interscambio_cliente_periodo_excl');
  });

  it('cambio di subagente: chiudo il periodo e apro il nuovo', async () => {
    await q(ins, [1, 'IT1', 'C1', '2026-01-01', '2026-06-01']);
    expect(await errore(ins, [2, 'IT1', 'C1', '2026-06-01', null])).toBe('');
    const { rows } = await q(
      `SELECT subagente_id FROM interscambio WHERE cliente_piva = 'IT1' AND daterange(valido_dal, valido_al) @> $1::date`,
      ['2026-03-10'],
    );
    expect(rows).toEqual([{ subagente_id: '1' }]); // la fattura di marzo resta al primo
  });

  it('lo stesso codice del fornitore non indica due clienti insieme', async () => {
    await q(ins, [1, 'IT1', 'C1', '2026-01-01', null]);
    expect(await errore(ins, [2, 'IT2', 'C1', '2026-01-01', null])).toMatch('interscambio_codice_periodo_excl');
  });

  it('periodo vuoto e sconto fuori scala rifiutati', async () => {
    expect(await errore(ins, [1, 'IT1', 'C1', '2026-06-01', '2026-06-01'])).toMatch('interscambio_periodo_check');
    expect(await errore(`INSERT INTO interscambio (subagente_id, cliente_piva, fornitore_id, valido_dal, sconto) VALUES (1, 'IT1', 1, '2026-01-01', 101)`))
      .toMatch('interscambio_sconto_check');
  });

  it('un subagente con storia non si elimina', async () => {
    await q(ins, [1, 'IT1', 'C1', '2026-01-01', null]);
    expect(await errore(`DELETE FROM subagenti WHERE id = 1`)).toMatch('interscambio_subagente_id_fkey');
  });
});

describe('scaglioni ed eccezioni', () => {
  it('soglia unica per versione, percentuali 0–100', async () => {
    const ins = `INSERT INTO provvigioni_scaglioni (fornitore_id, sconto_min, pct_agente, pct_subagente, valido_dal) VALUES (1, $1, $2, 0, '2025-01-01')`;
    expect(await errore(ins, [5, 13])).toBe('');
    expect(await errore(ins, [5, 12])).toMatch('provvigioni_scaglioni_fornitore_id_sconto_min_valido_dal_key');
    expect(await errore(ins, [10, 120])).toMatch('provvigioni_scaglioni_pct_check');
  });
});

describe('documenti e liquidazione (D-34)', () => {
  it('fattura_id solo sulle note di credito, e la fattura stornata non si elimina', async () => {
    const nc = `INSERT INTO ordini_fornitore_documenti (testata_id, tipo, numero, data, importo, fattura_id) VALUES (1, $1, 'NC1', '2026-04-01', -200, 1)`;
    expect(await errore(nc, ['fattura'])).toMatch('ordini_fornitore_documenti_fattura_id_check');
    expect(await errore(nc, ['nota_credito'])).toBe('');
    expect(await errore(`DELETE FROM ordini_fornitore_documenti WHERE id = 1`)).toMatch('ordini_fornitore_documenti_fattura_id_fkey');
  });

  it('documento senza numero rifiutato', async () => {
    expect(await errore(`INSERT INTO ordini_fornitore_documenti (testata_id, tipo, data, importo) VALUES (1, 'fattura', '2026-03-10', 1)`))
      .toMatch('numero');
  });

  it('un trimestre con documenti liquidati non si elimina', async () => {
    await q(`UPDATE ordini_fornitore_documenti SET liquidazione_id = 1 WHERE id = 1`);
    expect(await errore(`DELETE FROM liquidazioni WHERE id = 1`)).toMatch('ordini_fornitore_documenti_liquidazione_id_fkey');
  });

  it('chi ha chiuso un trimestre non si elimina', async () => {
    expect(await errore(`DELETE FROM utenti WHERE id = 1`)).toMatch('liquidazioni_chiusa_da_fkey');
  });
});

describe('bollettini', () => {
  const riga = `INSERT INTO bollettini_righe (testata_id, fattura_numero, importo_riconosciuto, importo_calcolato, tipo_riga, documento_id, liquidazione_id) VALUES (1, 'FT1', $1, $2, $3, 1, $4) RETURNING differenza`;

  it('differenza calcolata dal database', async () => {
    const { rows } = await q(riga, [100, 90.5, 'provvigione', null]);
    expect(rows[0].differenza).toBe('9.50');
  });

  it('liquidazione_id solo su storni e riaccrediti', async () => {
    expect(await errore(riga, [-180, -180, 'storno', 1])).toBe('');
    expect(await errore(riga, [100, 100, 'provvigione', 1])).toMatch('bollettini_righe_liquidazione_check');
  });

  it('bollettino verificato ha sempre la data di chiusura', async () => {
    expect(await errore(`UPDATE bollettini_testata SET stato = 'verificato' WHERE id = 1`)).toMatch('bollettini_testata_chiuso_check');
    expect(await errore(`UPDATE bollettini_testata SET stato = 'verificato', chiuso_il = now(), chiuso_da = 1 WHERE id = 1`)).toBe('');
  });
});

describe('clienti da Integra', () => {
  it('P.IVA doppia ammessa, codice Integra no', async () => {
    const ins = `INSERT INTO clienti (codice_integra, piva, ragione_sociale) VALUES ($1, 'IT9', 'Vivaio')`;
    expect(await errore(ins, ['C1'])).toBe('');
    expect(await errore(ins, ['C2'])).toBe('');
    expect(await errore(ins, ['C2'])).toMatch('clienti_codice_integra_key');
  });
});

describe('utenti, sessioni, registro (D-30, D-31, D-33)', () => {
  it('nome utente ed email in minuscolo, ruolo ammesso, password obbligatoria per chi accede', async () => {
    const ins = `INSERT INTO utenti (username, email, nome, ruolo, password_hash, sistema) VALUES ($1, $2, 'Anna', $3, $4, $5)`;
    expect(await errore(ins, ['anna', 'Anna@X.it', 'utente', 'x', false])).toMatch('utenti_email_minuscolo_check');
    expect(await errore(ins, ['Anna', 'anna@x.it', 'utente', 'x', false])).toMatch('utenti_username_check');
    expect(await errore(ins, ['anna', 'anna@x.it', 'capo', 'x', false])).toMatch('utenti_ruolo_check');
    expect(await errore(ins, ['anna', 'anna@x.it', 'utente', null, false])).toMatch('utenti_password_check');
    expect(await errore(ins, ['servizi', 'servizi@x.it', 'utente', null, true])).toBe('');
    expect(await errore(ins, ['anna@x.it', 'anna2@x.it', 'utente', 'x', false])).toMatch('utenti_username_senza_chiocciola_check');
  });

  it('livelli per area: solo aree e livelli previsti, uno per area, via con l’utente (D-45)', async () => {
    const [u] = (await q(`INSERT INTO utenti (username, email, nome, ruolo, password_hash) VALUES ('liv', 'liv@x.it', 'Liv', 'utente', 'x') RETURNING id`)).rows;
    const ins = `INSERT INTO utenti_aree (utente_id, area, livello) VALUES ($1, $2, $3)`;
    expect(await errore(ins, [u.id, 'provvigioni', 'operatore'])).toBe('');
    expect(await errore(ins, [u.id, 'provvigioni', 'lettura'])).toMatch('utenti_aree_pkey');
    expect(await errore(ins, [u.id, 'cucina', 'lettura'])).toMatch('utenti_aree_area_check');
    expect(await errore(ins, [u.id, 'anagrafiche', 'capo'])).toMatch('utenti_aree_livello_check');
    expect(await errore(`INSERT INTO utenti (username, email, nome, ruolo, password_hash) VALUES ('vec', 'vec@x.it', 'V', 'operatore', 'x')`, [])).toMatch('utenti_ruolo_check');
    await q('DELETE FROM utenti WHERE id = $1', [u.id]);
    expect((await q('SELECT count(*)::int AS n FROM utenti_aree WHERE utente_id = $1', [u.id])).rows[0].n).toBe(0);
  });

  it('un solo superutente (D-39)', async () => {
    const ins = `INSERT INTO utenti (username, email, nome, ruolo, password_hash) VALUES ($1, $2, 'S', 'superutente', 'x')`;
    expect(await errore(ins, ['su1', 'su1@x.it'])).toBe('');
    expect(await errore(ins, ['su2', 'su2@x.it'])).toMatch('utenti_superutente_key');
  });

  it('sessioni.utente_id si ricava dalla sessione', async () => {
    const { rows } = await q(
      `INSERT INTO sessioni (sid, sess, expire) VALUES ('s1', '{"utente_id": 1}', now() + interval '1 day') RETURNING utente_id`,
    );
    expect(rows[0].utente_id).toBe('1');
  });

  it('eventi immutabili, salvo la pulizia', async () => {
    await q(`INSERT INTO registro (id, genere, codice, utente_id) VALUES (1, 'evento', 'prova', 1)`);
    expect(await errore(`UPDATE registro SET codice = 'altro' WHERE id = 1`)).not.toBe('');
    expect(await errore(`DELETE FROM registro WHERE id = 1`)).not.toBe('');
    await q(`SET LOCAL decobrands.pulizia_registro = 'si'`);
    expect(await errore(`DELETE FROM registro WHERE id = 1`)).toBe('');
  });

  it('una sola anomalia aperta per causa', async () => {
    const ins = `INSERT INTO registro (genere, codice, chiave, stato) VALUES ('anomalia', 'bollettino_mancante', 'F1-2026-03', 'aperta')`;
    expect(await errore(ins)).toBe('');
    expect(await errore(ins)).toMatch('registro_anomalia_aperta_key');
  });
});
