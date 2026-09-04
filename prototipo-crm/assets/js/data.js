/* ============================================================
   DecoBrands CRM — Prototipo — Dati demo
   Spec §12 (seed) + risposte Matteo. Tutti i valori sono FITTIZI
   ma coerenti con lo scenario reale (fornitori Gries/Gasper/Ing's,
   agente unico Decobrands SRL, subagenti Bastasin/Nista/...).
   ============================================================ */

window.VERSIONE_PROTOTIPO = '0.1.0 · prototipo';

window.DATA = {

  clienti: [
    { piva: '04235980161', ragione_sociale: 'Vivaio Verde Azzurro s.r.l.' },
    { piva: '03152770962', ragione_sociale: 'Giardini & Forme s.r.l.' },
    { piva: '01826250167', ragione_sociale: 'Verde Vita snc' },
    { piva: '02457160341', ragione_sociale: 'Il Giardino di Sofia srl' },
    { piva: '01573540439', ragione_sociale: 'Floricoltura Centro Italia srl' },
    { piva: '05328730963', ragione_sociale: 'Orti Urbani soc. coop.' },
    { piva: '02289430245', ragione_sociale: 'Casa & Natura sas' },
    { piva: '02633860254', ragione_sociale: 'Fioreria Alba srl' }
  ],

  fornitori: [
    { id: 1, ragione_sociale: 'Gries GmbH & Co. KG', piva: 'DE123456789', giorni_attesa_conferma: 21, payment_type: 'matured', attivo: true, note: 'Pagamento provvigioni sul maturato (incassi clienti).' },
    { id: 2, ragione_sociale: 'Gasper GmbH', piva: 'DE987654321', giorni_attesa_conferma: 30, payment_type: 'invoiced', attivo: true, note: 'Importatore — pagamento provvigioni sul fatturato. Fattura multi-ordine frequente.' },
    { id: 3, ragione_sociale: 'Ing\'s Christmas Decor GmbH', piva: 'DE555111222', giorni_attesa_conferma: 14, payment_type: 'invoiced', attivo: true, note: 'Stagionale (Natale). Bollettini mensili regolari.' }
  ],

  /* Scaglioni: sconto_min/max discreti come nella tabella reale (§4.2.2). */
  scaglioni: [
    { id: 1,  fornitore_id: 1, sconto_min: 0,   sconto_max: 0,   pct_agente: 18, pct_subagente: 10, ordinamento: 1 },
    { id: 2,  fornitore_id: 1, sconto_min: 1,   sconto_max: 1,   pct_agente: 18, pct_subagente: 0,  ordinamento: 2 },
    { id: 3,  fornitore_id: 1, sconto_min: 5,   sconto_max: 5,   pct_agente: 13, pct_subagente: 7,  ordinamento: 3 },
    { id: 4,  fornitore_id: 1, sconto_min: 10,  sconto_max: 10,  pct_agente: 5,  pct_subagente: 2,  ordinamento: 4 },
    { id: 5,  fornitore_id: 1, sconto_min: 100, sconto_max: 100, pct_agente: 0,  pct_subagente: 0,  ordinamento: 5 },
    { id: 11, fornitore_id: 2, sconto_min: 0,   sconto_max: 0,   pct_agente: 15, pct_subagente: 8,  ordinamento: 1 },
    { id: 12, fornitore_id: 2, sconto_min: 3,   sconto_max: 3,   pct_agente: 14, pct_subagente: 7,  ordinamento: 2 },
    { id: 13, fornitore_id: 2, sconto_min: 5,   sconto_max: 5,   pct_agente: 12, pct_subagente: 6,  ordinamento: 3 },
    { id: 14, fornitore_id: 2, sconto_min: 10,  sconto_max: 10,  pct_agente: 6,  pct_subagente: 3,  ordinamento: 4 },
    { id: 15, fornitore_id: 2, sconto_min: 100, sconto_max: 100, pct_agente: 0,  pct_subagente: 0,  ordinamento: 5 },
    { id: 21, fornitore_id: 3, sconto_min: 0,   sconto_max: 0,   pct_agente: 20, pct_subagente: 12, ordinamento: 1 },
    { id: 22, fornitore_id: 3, sconto_min: 100, sconto_max: 100, pct_agente: 0,  pct_subagente: 0,  ordinamento: 2 }
  ],

  /* Eccezioni per singolo subagente (rarissime, §5.2).
     Es. reale: Bastasin riceve il 3% sullo scaglione a sconto 1% di Gries
     dove lo standard per i subagenti è 0. */
  eccezioni: [
    { id: 1, scaglione_id: 2, subagente_id: 1, pct_override: 3 }
  ],

  agenti: [
    { id: 1, codice: 'DECO', nome: 'Decobrands', cognome: 'SRL',   email: 'info@decobrands.it',  telefono: '030.1234567', attivo: true },
    { id: 2, codice: 'MON',  nome: 'Marco',     cognome: 'Monzani', email: '', telefono: '', attivo: false },
    { id: 3, codice: 'SCH',  nome: 'Thomas',    cognome: 'Schwarzmeier', email: '', telefono: '', attivo: false }
  ],

  subagenti: [
    { id: 1, agente_id: 1, codice: 'SUB-BAS', nome: 'Stefano',    cognome: 'Bastasin',  email: 'stefano.bastasin@example.it', attivo: true },
    { id: 2, agente_id: 1, codice: 'SUB-NIS', nome: 'Marco',      cognome: 'Nista',     email: 'marco.nista@example.it',      attivo: true },
    { id: 3, agente_id: 1, codice: 'SUB-RAV', nome: 'Elisa',      cognome: 'Ravelli',   email: 'elisa.ravelli@example.it',     attivo: true },
    { id: 4, agente_id: 1, codice: 'SUB-PON', nome: 'Giorgio',    cognome: 'Pontoglio', email: 'giorgio.pontoglio@example.it', attivo: true }
  ],

  /* Interscambio: subagente × cliente × fornitore con sconto (§5.7, §5.10). */
  interscambio: [
    { id: 1, subagente_id: 1, cliente_piva: '04235980161', fornitore_id: 1, discount: 1,  attivo: true },
    { id: 2, subagente_id: 1, cliente_piva: '03152770962', fornitore_id: 1, discount: 0,  attivo: true },
    { id: 3, subagente_id: 2, cliente_piva: '01826250167', fornitore_id: 1, discount: 5,  attivo: true },
    { id: 4, subagente_id: 2, cliente_piva: '02457160341', fornitore_id: 2, discount: 0,  attivo: true },
    { id: 5, subagente_id: 3, cliente_piva: '01573540439', fornitore_id: 1, discount: 10, attivo: true },
    { id: 6, subagente_id: 3, cliente_piva: '05328730963', fornitore_id: 2, discount: 5,  attivo: true },
    { id: 7, subagente_id: 4, cliente_piva: '02289430245', fornitore_id: 3, discount: 0,  attivo: true },
    { id: 8, subagente_id: 4, cliente_piva: '02633860254', fornitore_id: 2, discount: 3,  attivo: true }
  ],

  /* Pratiche ordini fornitore (spec §6.1). date ISO. */
  ordini: [
    {
      id: 1, fornitore_id: 1, numero_ordine: 'OF/2026/041', data_ordine: '2026-07-28',
      cliente_piva: '04235980161', agente_id: 1, importo_merce: 8945.50,
      stato: 'inviato', conferma_scadenza: '2026-08-18',
      note: 'Conferma non ancora pervenuta — segnalazione scaduta.',
      righe: [
        { numero_riga: 1, codice: 'VASA-2210', descrizione: 'Vaso in terracotta Ø 22 cm', um: 'pz', quantita: 480, prezzo_unitario: 6.40, importo: 3072.00 },
        { numero_riga: 2, codice: 'VASA-3050', descrizione: 'Vaso in terracotta Ø 30 cm', um: 'pz', quantita: 260, prezzo_unitario: 12.30, importo: 3198.00 },
        { numero_riga: 3, codice: 'SOGG-040', descrizione: 'Sottovaso Ø 40 cm', um: 'pz', quantita: 320, prezzo_unitario: 8.36, importo: 2675.50 }
      ]
    },
    {
      id: 2, fornitore_id: 2, numero_ordine: 'OF/2026/042', data_ordine: '2026-08-02',
      cliente_piva: '02457160341', agente_id: 1, importo_merce: 12310.00,
      stato: 'inviato', conferma_scadenza: '2026-09-01',
      note: 'Importatore — attesa conferma carta carbone.',
      righe: [
        { numero_riga: 1, codice: 'GASPER-A1', descrizione: 'Contenitore in resina 60L', um: 'pz', quantita: 250, prezzo_unitario: 29.60, importo: 7400.00 },
        { numero_riga: 2, codice: 'GASPER-B3', descrizione: 'Cassa in legno decor 40x40', um: 'pz', quantita: 180, prezzo_unitario: 27.28, importo: 4910.00 }
      ]
    },
    {
      id: 3, fornitore_id: 1, numero_ordine: 'OF/2026/045', data_ordine: '2026-08-12',
      cliente_piva: '01826250167', agente_id: 1, importo_merce: 6780.20,
      stato: 'confermato', conferma_scadenza: '2026-09-02',
      conferma_numero: 'C-9981', conferma_data: '2026-08-25',
      note: 'Conferma ridotta: 10 articoli ordinati, 7 confermati (3 sold out) — §5.8.',
      righe: [
        { numero_riga: 1, codice: 'VASA-2210', descrizione: 'Vaso in terracotta Ø 22 cm', um: 'pz', quantita: 400, prezzo_unitario: 6.40, importo: 2560.00 },
        { numero_riga: 2, codice: 'VASA-0908', descrizione: 'Vaso in terracotta Ø 9 cm (8 pz)', um: 'pz', quantita: 300, prezzo_unitario: 9.40, importo: 2820.00 },
        { numero_riga: 3, codice: 'PIAT-F25', descrizione: 'Piatto portavaso Ø 25 cm', um: 'pz', quantita: 140, prezzo_unitario: 10.00, importo: 1400.00 }
      ]
    },
    {
      id: 4, fornitore_id: 3, numero_ordine: 'OF/2026/051', data_ordine: '2026-08-18',
      cliente_piva: '02289430245', agente_id: 1, importo_merce: 4250.00,
      stato: 'confermato', conferma_scadenza: '2026-09-01',
      conferma_numero: 'CON/2026/778', conferma_data: '2026-08-30',
      note: 'Ordine natalizio.',
      righe: [
        { numero_riga: 1, codice: 'XMAS-LED', descrizione: 'Addobbo luminoso a LED 100pz', um: 'pz', quantita: 120, prezzo_unitario: 18.50, importo: 2220.00 },
        { numero_riga: 2, codice: 'XMAS-GHO', descrizione: 'Ghirlanda natalizia 150 cm', um: 'pz', quantita: 80, prezzo_unitario: 25.38, importo: 2030.00 }
      ]
    },
    {
      id: 5, fornitore_id: 1, numero_ordine: 'OF/2026/033', data_ordine: '2026-06-20',
      cliente_piva: '01573540439', agente_id: 1, importo_merce: 15480.00,
      stato: 'fatturato', fattura_numero: 'F-2026-0891', fattura_data: '2026-07-02',
      note: 'Data ordine Q2 — usato per testare il filtro trimestre.',
      righe: [
        { numero_riga: 1, codice: 'VASA-4050', descrizione: 'Vaso in terracotta Ø 40 cm', um: 'pz', quantita: 320, prezzo_unitario: 30.00, importo: 9600.00 },
        { numero_riga: 2, codice: 'SOGG-055', descrizione: 'Sottovaso Ø 55 cm', um: 'pz', quantita: 240, prezzo_unitario: 24.50, importo: 5880.00 }
      ]
    },
    {
      id: 6, fornitore_id: 2, numero_ordine: 'OF/2026/038', data_ordine: '2026-07-05',
      cliente_piva: '05328730963', agente_id: 1, importo_merce: 9312.75,
      stato: 'fatturato', fattura_numero: 'F-2026-0907', fattura_data: '2026-07-18',
      righe: [
        { numero_riga: 1, codice: 'ORTO-TAV', descrizione: 'Tavolo da lavoro per orto rialzato', um: 'pz', quantita: 45, prezzo_unitario: 135.00, importo: 6075.00 },
        { numero_riga: 2, codice: 'ORTO-CMP', descrizione: 'Compostiera 320L', um: 'pz', quantita: 35, prezzo_unitario: 92.50, importo: 3237.75 }
      ]
    },
    {
      id: 7, fornitore_id: 1, numero_ordine: 'OF/2026/040', data_ordine: '2026-07-15',
      cliente_piva: '04235980161', agente_id: 1, importo_merce: 6540.00,
      stato: 'fatturato', fattura_numero: 'F-2026-0912', fattura_data: '2026-07-28',
      note: 'Eccezione subagente Bastasin: sconto 1% → provvigione subagente 3% invece di 0 (§5.2).',
      righe: [
        { numero_riga: 1, codice: 'VASA-2230', descrizione: 'Vaso in terracotta Ø 23 cm', um: 'pz', quantita: 300, prezzo_unitario: 14.80, importo: 4440.00 },
        { numero_riga: 2, codice: 'SOGG-030', descrizione: 'Sottovaso Ø 30 cm', um: 'pz', quantita: 210, prezzo_unitario: 10.00, importo: 2100.00 }
      ]
    },
    {
      id: 8, fornitore_id: 2, numero_ordine: 'OF/2026/044', data_ordine: '2026-08-05',
      cliente_piva: '02633860254', agente_id: 1, importo_merce: 3980.00,
      stato: 'fatturato', fattura_numero: 'F-2026-0921', fattura_data: '2026-08-20',
      righe: [
        { numero_riga: 1, codice: 'FIOR-STD', descrizione: 'Vassoio fioraio 60x40', um: 'pz', quantita: 100, prezzo_unitario: 23.60, importo: 2360.00 },
        { numero_riga: 2, codice: 'FIOR-BCK', descrizione: 'Secchiello zincato 5L', um: 'pz', quantita: 120, prezzo_unitario: 13.50, importo: 1620.00 }
      ]
    },
    {
      id: 9, fornitore_id: 1, numero_ordine: 'NC/2026/003', data_ordine: '2026-08-14',
      cliente_piva: '03152770962', agente_id: 1, importo_merce: -1380.00,
      stato: 'fatturato', fattura_numero: 'NC-2026-005', fattura_data: '2026-08-22',
      note: 'Nota di credito — provvigioni in negativo (§5.3).',
      righe: [
        { numero_riga: 1, codice: 'VASA-3050', descrizione: 'Vaso in terracotta Ø 30 cm (resa)', um: 'pz', quantita: -60, prezzo_unitario: 12.30, importo: -738.00 },
        { numero_riga: 2, codice: 'SOGG-040', descrizione: 'Sottovaso Ø 40 cm (resa)', um: 'pz', quantita: -70, prezzo_unitario: 9.17, importo: -642.00 }
      ]
    },
    {
      id: 10, fornitore_id: 1, numero_ordine: 'OF/2026/030', data_ordine: '2026-06-10',
      cliente_piva: '01573540439', agente_id: 1, importo_merce: 11240.00,
      stato: 'fatturato', fattura_numero: 'F-2026-0840', fattura_data: '2026-06-25',
      note: 'Seconda tranche dello stesso ordine per Floricoltura (ordine multi-tranche §5.9).',
      righe: [
        { numero_riga: 1, codice: 'VASA-3040', descrizione: 'Vaso in terracotta Ø 30 cm', um: 'pz', quantita: 340, prezzo_unitario: 14.00, importo: 4760.00 },
        { numero_riga: 2, codice: 'VASA-4055', descrizione: 'Vaso in terracotta Ø 40 cm', um: 'pz', quantita: 180, prezzo_unitario: 36.00, importo: 6480.00 }
      ]
    }
  ],

  /* Bollettini fornitori (spec §6.2). importo_calcolato/differenza sono
     calcolati a runtime dal data.js→crm.js (stesso motore della liquidazione). */
  bollettini: [
    {
      id: 1, fornitore_id: 1, trimestre: 3, anno: 2026, stato: 'da_verificare',
      note: 'Riga F-2026-0912: fornitore ha applicato promo −0,5% → differenza da verificare (§5.13).',
      righe: [
        { fattura_numero: 'F-2026-0891', fattura_data: '2026-07-02', cliente_piva: '01573540439', importo_merce: 15480.00, pct_riconosciuta: 7.00, importo_riconosciuto: 1083.60 },
        { fattura_numero: 'F-2026-0912', fattura_data: '2026-07-28', cliente_piva: '04235980161', importo_merce: 6540.00, pct_riconosciuta: 20.50, importo_riconosciuto: 1340.70, promo: true },
        { fattura_numero: 'NC-2026-005', fattura_data: '2026-08-22', cliente_piva: '03152770962', importo_merce: -1380.00, pct_riconosciuta: 28.00, importo_riconosciuto: -386.40 }
      ]
    },
    {
      id: 2, fornitore_id: 2, trimestre: 3, anno: 2026, stato: 'verificato',
      righe: [
        { fattura_numero: 'F-2026-0907', fattura_data: '2026-07-18', cliente_piva: '05328730963', importo_merce: 9312.75, pct_riconosciuta: 18.00, importo_riconosciuto: 1676.30 },
        { fattura_numero: 'F-2026-0921', fattura_data: '2026-08-20', cliente_piva: '02633860254', importo_merce: 3980.00, pct_riconosciuta: 21.00, importo_riconosciuto: 835.80 }
      ]
    },
    {
      id: 3, fornitore_id: 1, trimestre: 2, anno: 2026, stato: 'verificato',
      righe: [
        { fattura_numero: 'F-2026-0840', fattura_data: '2026-06-25', cliente_piva: '01573540439', importo_merce: 11240.00, pct_riconosciuta: 7.00, importo_riconosciuto: 786.80 }
      ]
    },
    {
      id: 4, fornitore_id: 3, trimestre: 3, anno: 2026, stato: 'da_verificare',
      note: 'Primo bollettino Ing\'s Christmas Decor per la stagione.',
      righe: [
        { fattura_numero: 'F-2026-0930', fattura_data: '2026-08-31', cliente_piva: '02289430245', importo_merce: 4250.00, pct_riconosciuta: 32.00, importo_riconosciuto: 1360.00 }
      ]
    }
  ]
};