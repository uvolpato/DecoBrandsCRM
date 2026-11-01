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
  // identità + prima versione (D-46): la versione corrente si imposta dopo, perché la chiave è composta
  await q(`INSERT INTO fornitori (id) VALUES (1)`);
  await q(`INSERT INTO fornitori_versioni (id, fornitore_id, fonte, ragione_sociale) VALUES (1, 1, 'integra', 'Gries')`);
  await q(`UPDATE fornitori SET versione_corrente_id = 1 WHERE id = 1`);
  await q(`INSERT INTO clienti (id) VALUES (1), (2)`);
  await q(`INSERT INTO clienti_versioni (id, cliente_id, fonte, piva, ragione_sociale) VALUES (1, 1, 'integra', 'IT1', 'Vivaio Rossi'), (2, 2, 'integra', 'IT2', 'Garden Bianchi')`);
  await q(`UPDATE clienti SET versione_corrente_id = id`);
  await q(`INSERT INTO agenti (id, codice, nome, cognome) VALUES (1, 'DECO', 'Decobrands', 'SRL')`);
  await q(`INSERT INTO subagenti (id, agente_id, codice, nome, cognome) VALUES (1, 1, 'S1', 'Anna', 'R'), (2, 1, 'S2', 'Luca', 'B')`);
  await q(`INSERT INTO ordini_fornitore_testata (id, fornitore_id, fornitore_versione_id, numero_ordine, data_ordine, cliente_id, cliente_versione_id) VALUES (1, 1, 1, 'O1', '2026-03-01', 1, 1)`);
  await q(`INSERT INTO ordini_fornitore_documenti (id, testata_id, tipo, numero, data, importo) VALUES (1, 1, 'fattura', 'FT1', '2026-03-10', 1000)`);
  await q(`INSERT INTO bollettini_testata (id, fornitore_id, fornitore_versione_id, mese, anno) VALUES (1, 1, 1, 3, 2026)`);
  await q(`INSERT INTO liquidazioni (id, anno, trimestre, chiusa_da, totali) VALUES (1, 2026, 1, 1, '{}')`);
});
afterEach(() => q('ROLLBACK'));

describe('interscambio datato (D-35)', () => {
  const ins = `INSERT INTO interscambio (subagente_id, cliente_id, fornitore_id, codice_cliente_fornitore, valido_dal, valido_al) VALUES ($1, $2, 1, $3, $4, $5)`;

  it('un solo subagente per cliente × fornitore in ogni giorno', async () => {
    expect(await errore(ins, [1, 1, 'C1', '2026-01-01', null])).toBe('');
    expect(await errore(ins, [2, 1, 'C9', '2026-06-01', null])).toMatch('interscambio_cliente_periodo_excl');
  });

  it('cambio di subagente: chiudo il periodo e apro il nuovo', async () => {
    await q(ins, [1, 1, 'C1', '2026-01-01', '2026-06-01']);
    expect(await errore(ins, [2, 1, 'C1', '2026-06-01', null])).toBe('');
    const { rows } = await q(
      `SELECT subagente_id FROM interscambio WHERE cliente_id = 1 AND daterange(valido_dal, valido_al) @> $1::date`,
      ['2026-03-10'],
    );
    expect(rows).toEqual([{ subagente_id: '1' }]); // la fattura di marzo resta al primo
  });

  it('lo stesso codice del fornitore non indica due clienti insieme', async () => {
    await q(ins, [1, 1, 'C1', '2026-01-01', null]);
    expect(await errore(ins, [2, 2, 'C1', '2026-01-01', null])).toMatch('interscambio_codice_periodo_excl');
  });

  it('periodo vuoto e sconto fuori scala rifiutati', async () => {
    expect(await errore(ins, [1, 1, 'C1', '2026-06-01', '2026-06-01'])).toMatch('interscambio_periodo_check');
    expect(await errore(`INSERT INTO interscambio (subagente_id, cliente_id, fornitore_id, valido_dal, sconto) VALUES (1, 1, 1, '2026-01-01', 101)`))
      .toMatch('interscambio_sconto_check');
  });

  it('un subagente con storia non si elimina', async () => {
    await q(ins, [1, 1, 'C1', '2026-01-01', null]);
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

describe('valori ammessi (spec §4.2, fase 2a)', () => {
  it('importo positivo per la fattura, negativo per la nota di credito', async () => {
    const ins = `INSERT INTO ordini_fornitore_documenti (testata_id, tipo, numero, data, importo) VALUES (1, $1, 'X', '2026-04-01', $2)`;
    expect(await errore(ins, ['fattura', -5])).toMatch('ordini_fornitore_documenti_importo_check');
    expect(await errore(ins, ['nota_credito', 5])).toMatch('ordini_fornitore_documenti_importo_check');
    expect(await errore(ins, ['nota_credito', -5])).toBe('');
  });

  it('correzione: percentuale 0–100, "nessuna" a zero', async () => {
    const ins = `INSERT INTO provvigioni_correzioni (documento_id, tipo, valore, motivo) VALUES (1, $1, $2, 'm')`;
    expect(await errore(ins, ['pct', 120])).toMatch('provvigioni_correzioni_valore_check');
    expect(await errore(ins, ['nessuna', 3])).toMatch('provvigioni_correzioni_valore_check');
    expect(await errore(ins, ['importo', 250])).toBe('');
  });

  it('bollettino chiuso: data e utente vanno insieme', async () => {
    expect(await errore(`UPDATE bollettini_testata SET stato = 'verificato', chiuso_il = now() WHERE id = 1`)).toMatch('bollettini_testata_chiuso_da_check');
  });

  it('documento in arrivo: origine, stato, tipo e livello previsti', async () => {
    const ins = `INSERT INTO documenti_in_arrivo (origine, file_nome, file_hash, stato, tipo, livello) VALUES ($1, 'a.pdf', repeat('a', 64), $2, $3, $4)`;
    expect(await errore(ins, ['fax', 'in_coda', null, null])).toMatch('documenti_in_arrivo_origine_check');
    expect(await errore(ins, ['email', 'perso', null, null])).toMatch('documenti_in_arrivo_stato_check');
    expect(await errore(ins, ['email', 'in_coda', 'ricevuta', null])).toMatch('documenti_in_arrivo_tipo_check');
    expect(await errore(ins, ['email', 'in_coda', 'fattura', 'alta'])).toMatch('documenti_in_arrivo_livello_check');
    expect(await errore(ins, ['email', 'da_controllare', 'fattura', 'bassa'])).toBe('');
  });

  it('campo letto: affidabilità 0–1', async () => {
    await q(`INSERT INTO documenti_in_arrivo (id, origine, file_nome, file_hash) VALUES (1, 'email', 'a.pdf', repeat('b', 64))`);
    const ins = `INSERT INTO documenti_campi (documento_id, campo, affidabilita) VALUES (1, 'numero', $1)`;
    expect(await errore(ins, [1.5])).toMatch('documenti_campi_affidabilita_check');
    expect(await errore(ins, [0.93])).toBe('');
  });

  it('registro: solo le anomalie hanno uno stato, livello previsto', async () => {
    const ins = `INSERT INTO registro (genere, codice, livello, stato) VALUES ($1, 'p', $2, $3)`;
    expect(await errore(ins, ['evento', 'info', 'aperta'])).toMatch('registro_stato_check');
    expect(await errore(ins, ['anomalia', 'info', null])).toMatch('registro_stato_check');
    expect(await errore(ins, ['evento', 'grave', null])).toMatch('registro_livello_check');
    expect(await errore(ins, ['anomalia', 'errore', 'chiusa'])).toBe('');
  });

  it('impostazioni e giri dei servizi: solo valori previsti', async () => {
    expect(await errore(`INSERT INTO impostazioni (chiave, valore) VALUES ('altro', '{}')`)).toMatch('impostazioni_chiave_check');
    expect(await errore(`INSERT INTO impostazioni (chiave, valore) VALUES ('casella', '{}')`)).toBe('');
    const ins = `INSERT INTO servizi_esecuzioni (servizio, tipo, esito) VALUES ($1, $2, $3)`;
    expect(await errore(ins, ['cucina', 'lavoro', null])).toMatch('servizi_esecuzioni_servizio_check');
    expect(await errore(ins, ['lettura', 'giro', null])).toMatch('servizi_esecuzioni_tipo_check');
    expect(await errore(ins, ['lettura', 'lavoro', 'boh'])).toMatch('servizi_esecuzioni_esito_check');
    expect(await errore(ins, ['lettura', 'lavoro', 'ok'])).toBe('');
  });
});

describe('anagrafiche con versioni (D-46)', () => {
  const ver = `INSERT INTO clienti_versioni (id, cliente_id, fonte, piva, ragione_sociale) VALUES (nextval('clienti_versioni_id_seq') + 100, $1, $2, 'IT9', 'Vivaio')`;

  it('P.IVA doppia ammessa, fonte solo integra o crm', async () => {
    expect(await errore(ver, [1, 'integra'])).toBe('');
    expect(await errore(ver, [2, 'integra'])).toBe(''); // stessa P.IVA su un altro cliente
    expect(await errore(ver, [1, 'excel'])).toMatch('clienti_versioni_fonte_check');
  });

  it('la versione non si modifica né si cancella', async () => {
    expect(await errore(`UPDATE clienti_versioni SET ragione_sociale = 'Altro' WHERE id = 1`)).toMatch('si aggiungono soltanto');
    expect(await errore(`DELETE FROM fornitori_versioni WHERE id = 1`)).toMatch('si aggiungono soltanto');
  });

  it('la versione corrente è una versione della stessa identità', async () => {
    expect(await errore(`UPDATE clienti SET versione_corrente_id = 2 WHERE id = 1`)).toMatch('clienti_versione_corrente_fkey');
  });

  it('un fatto non punta alla versione di un altro cliente', async () => {
    const ins = `INSERT INTO ordini_fornitore_testata (id, fornitore_id, fornitore_versione_id, numero_ordine, data_ordine, cliente_id, cliente_versione_id) VALUES (2, 1, 1, 'O2', '2026-03-02', $1, $2)`;
    expect(await errore(ins, [1, 2])).toMatch('ordini_fornitore_testata_cliente_versione_fkey');
    expect(await errore(ins, [2, 2])).toBe('');
    const riga = `INSERT INTO bollettini_righe (testata_id, fattura_numero, importo_riconosciuto, cliente_id, cliente_versione_id) VALUES (1, 'FT1', 1, $1, $2)`;
    expect(await errore(riga, [1, 2])).toMatch('bollettini_righe_cliente_versione_fkey');
    expect(await errore(riga, [1, null])).toMatch('bollettini_righe_cliente_check');
    expect(await errore(riga, [null, null])).toBe('');
  });

  it('un fatto non punta alla versione di un altro fornitore', async () => {
    await q(`INSERT INTO fornitori (id) VALUES (2)`);
    await q(`INSERT INTO fornitori_versioni (id, fornitore_id, fonte, ragione_sociale) VALUES (2, 2, 'integra', 'Gasper')`);
    expect(await errore(`INSERT INTO bollettini_testata (id, fornitore_id, fornitore_versione_id, mese, anno) VALUES (2, 1, 2, 4, 2026)`))
      .toMatch('bollettini_testata_fornitore_versione_fkey');
  });

  it('codici esterni: niente doppioni, due codici sulla stessa identità', async () => {
    const ins = `INSERT INTO codici_esterni (sistema, tipo, codice, entita_id) VALUES ($1, $2, $3, $4)`;
    expect(await errore(ins, ['integra', 'cliente', 'C1', 1])).toBe('');
    expect(await errore(ins, ['integra', 'cliente', 'C1', 2])).toMatch('codici_esterni_sistema_tipo_codice_key');
    expect(await errore(ins, ['integra', 'cliente', 'C2', 1])).toBe(''); // fusione o cambio di codice
    expect(await errore(ins, ['integra', 'fornitore', 'C1', 1])).toBe(''); // stesso codice, altro tipo
    expect(await errore(ins, ['sap', 'cliente', 'C3', 1])).toMatch('codici_esterni_sistema_check');
    expect(await errore(ins, ['integra', 'articolo', 'C3', 1])).toMatch('codici_esterni_tipo_check');
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
    expect(await errore(ins, [u.id, 'dati', 'capo'])).toMatch('utenti_aree_livello_check');
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
