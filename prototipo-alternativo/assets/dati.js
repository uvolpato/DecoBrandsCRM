/* ============================================================
   Decobrands — Prototipo alternativo — dati di prova
   Organizzati per flusso:
   - ogni pratica è un fascicolo di documenti (ordine, conferma,
     fatture, note di credito): lo stato si ricava dai documenti;
   - i documenti nuovi arrivano in "Documenti in arrivo" e vengono
     abbinati alla pratica (codice cliente del fornitore);
   - i bollettini sono le righe riconosciute dal fornitore, da
     riconciliare con quanto calcoliamo noi;
   - le liquidazioni sono per trimestre.
   Valori fittizi ma coerenti con lo scenario reale.
   ============================================================ */

window.DATI_DEMO = {
  oggi: '2026-09-04',

  clienti: [
    { piva: '04235980161', nome: 'Vivaio Verde Azzurro s.r.l.', citta: 'Bergamo' },
    { piva: '03152770962', nome: 'Giardini & Forme s.r.l.', citta: 'Monza' },
    { piva: '01826250167', nome: 'Verde Vita snc', citta: 'Brescia' },
    { piva: '02457160341', nome: 'Il Giardino di Sofia srl', citta: 'Parma' },
    { piva: '01573540439', nome: 'Floricoltura Centro Italia srl', citta: 'Macerata' },
    { piva: '05328730963', nome: 'Orti Urbani soc. coop.', citta: 'Milano' },
    { piva: '02289430245', nome: 'Casa & Natura sas', citta: 'Vicenza' },
    { piva: '02633860254', nome: 'Fioreria Alba srl', citta: 'Treviso' }
  ],

  /* maturazione: 'maturato' = il fornitore paga quando incassa (la provvigione matura quando
     la riconosce nel bollettino); 'fatturato' = paga sull'emissione della fattura. */
  fornitori: [
    { id: 1, nome: 'Gries GmbH & Co. KG', breve: 'Gries', piva: 'DE123456789', giorni_conferma: 21, maturazione: 'maturato', attivo: true },
    { id: 2, nome: 'Gasper GmbH', breve: 'Gasper', piva: 'DE987654321', giorni_conferma: 30, maturazione: 'fatturato', attivo: true },
    { id: 3, nome: 'Ing\'s Christmas Decor GmbH', breve: 'Ing\'s', piva: 'DE555111222', giorni_conferma: 14, maturazione: 'fatturato', attivo: true }
  ],

  /* Scaglioni: per sconto concesso al cliente, con data di validità (le percentuali possono
     cambiare nel tempo: i documenti si leggono con le percentuali in vigore alla loro data). */
  scaglioni: [
    { id: 1,  fornitore_id: 1, valido_dal: '2025-01-01', sconto: 0,   pct_agente: 18, pct_sub: 10 },
    { id: 2,  fornitore_id: 1, valido_dal: '2025-01-01', sconto: 1,   pct_agente: 18, pct_sub: 0 },
    { id: 3,  fornitore_id: 1, valido_dal: '2025-01-01', sconto: 5,   pct_agente: 13, pct_sub: 7 },
    { id: 4,  fornitore_id: 1, valido_dal: '2025-01-01', sconto: 10,  pct_agente: 5,  pct_sub: 2 },
    { id: 5,  fornitore_id: 1, valido_dal: '2025-01-01', sconto: 100, pct_agente: 0,  pct_sub: 0 },
    { id: 11, fornitore_id: 2, valido_dal: '2025-01-01', sconto: 0,   pct_agente: 15, pct_sub: 8 },
    { id: 12, fornitore_id: 2, valido_dal: '2025-01-01', sconto: 3,   pct_agente: 14, pct_sub: 7 },
    { id: 13, fornitore_id: 2, valido_dal: '2025-01-01', sconto: 5,   pct_agente: 12, pct_sub: 6 },
    { id: 14, fornitore_id: 2, valido_dal: '2025-01-01', sconto: 10,  pct_agente: 6,  pct_sub: 3 },
    { id: 15, fornitore_id: 2, valido_dal: '2025-01-01', sconto: 100, pct_agente: 0,  pct_sub: 0 },
    { id: 21, fornitore_id: 3, valido_dal: '2025-01-01', sconto: 0,   pct_agente: 20, pct_sub: 12 },
    { id: 22, fornitore_id: 3, valido_dal: '2025-01-01', sconto: 100, pct_agente: 0,  pct_sub: 0 }
  ],

  /* Eccezione per singolo subagente: Bastasin prende il 3% sullo scaglione Gries a sconto 1%. */
  eccezioni: [
    { id: 1, scaglione_id: 2, subagente_id: 1, pct_sub: 3 }
  ],

  agente: { nome: 'Decobrands SRL' },

  subagenti: [
    { id: 1, nome: 'Stefano Bastasin',  email: 'stefano.bastasin@example.it',  attivo: true },
    { id: 2, nome: 'Marco Nista',       email: 'marco.nista@example.it',       attivo: true },
    { id: 3, nome: 'Elisa Ravelli',     email: 'elisa.ravelli@example.it',     attivo: true },
    { id: 4, nome: 'Giorgio Pontoglio', email: 'giorgio.pontoglio@example.it', attivo: true }
  ],

  /* Abbinamenti cliente × fornitore: chi lo segue, con che sconto, e come lo chiama il fornitore. */
  abbinamenti: [
    { id: 1, cliente_piva: '04235980161', fornitore_id: 1, subagente_id: 1, sconto: 1,  codice: 'K-10122' },
    { id: 2, cliente_piva: '03152770962', fornitore_id: 1, subagente_id: 1, sconto: 0,  codice: 'K-10488' },
    { id: 3, cliente_piva: '01826250167', fornitore_id: 1, subagente_id: 2, sconto: 5,  codice: 'K-10915' },
    { id: 4, cliente_piva: '02457160341', fornitore_id: 2, subagente_id: 2, sconto: 0,  codice: 'GA-2271' },
    { id: 5, cliente_piva: '01573540439', fornitore_id: 1, subagente_id: 3, sconto: 10, codice: 'K-11036' },
    { id: 6, cliente_piva: '05328730963', fornitore_id: 2, subagente_id: 3, sconto: 5,  codice: 'GA-2304' },
    { id: 7, cliente_piva: '02289430245', fornitore_id: 3, subagente_id: 4, sconto: 0,  codice: 'IN-3150' },
    { id: 8, cliente_piva: '02633860254', fornitore_id: 2, subagente_id: 4, sconto: 3,  codice: 'GA-2389' }
  ],

  /* Pratiche: fascicoli di documenti. Importi dei documenti = somma delle righe. */
  pratiche: [
    { id: 1, numero: 'OF/2026/041', fornitore_id: 1, cliente_piva: '04235980161', data: '2026-07-28', documenti: [
      { id: 101, tipo: 'ordine', numero: 'OF/2026/041', data: '2026-07-28', file: 'ordine_OF-2026-041.pdf', righe: [
        { codice: 'VASA-2210', descrizione: 'Vaso in terracotta Ø 22 cm', qta: 480, prezzo: 6.40 },
        { codice: 'VASA-3050', descrizione: 'Vaso in terracotta Ø 30 cm', qta: 260, prezzo: 12.30 },
        { codice: 'SOGG-040',  descrizione: 'Sottovaso Ø 40 cm',          qta: 320, prezzo: 8.36 } ] } ] },

    { id: 2, numero: 'OF/2026/042', fornitore_id: 2, cliente_piva: '02457160341', data: '2026-08-02', documenti: [
      { id: 201, tipo: 'ordine', numero: 'OF/2026/042', data: '2026-08-02', file: 'ordine_OF-2026-042.pdf', righe: [
        { codice: 'GASPER-A1', descrizione: 'Contenitore in resina 60 L',  qta: 250, prezzo: 29.60 },
        { codice: 'GASPER-B3', descrizione: 'Cassa in legno decor 40x40', qta: 180, prezzo: 27.28 } ] } ] },

    { id: 3, numero: 'OF/2026/045', fornitore_id: 1, cliente_piva: '01826250167', data: '2026-08-12', documenti: [
      { id: 301, tipo: 'ordine', numero: 'OF/2026/045', data: '2026-08-12', file: 'ordine_OF-2026-045.pdf', righe: [
        { codice: 'VASA-2210', descrizione: 'Vaso in terracotta Ø 22 cm',       qta: 400, prezzo: 6.40 },
        { codice: 'VASA-0908', descrizione: 'Vaso in terracotta Ø 9 cm (8 pz)', qta: 300, prezzo: 9.40 },
        { codice: 'PIAT-F25',  descrizione: 'Piatto portavaso Ø 25 cm',         qta: 140, prezzo: 10.00 } ] },
      { id: 302, tipo: 'conferma', numero: 'C-9981', data: '2026-08-25', file: 'conferma_C-9981.pdf', righe: [
        { codice: 'VASA-2210', descrizione: 'Vaso in terracotta Ø 22 cm',             qta: 360, prezzo: 6.40 },
        { codice: 'PIAT-F25',  descrizione: 'Piatto portavaso Ø 25 cm',               qta: 140, prezzo: 10.00 },
        { codice: 'VASA-3050', descrizione: 'Vaso in terracotta Ø 30 cm (sostituto)', qta: 60,  prezzo: 12.30 } ] } ] },

    { id: 4, numero: 'OF/2026/051', fornitore_id: 3, cliente_piva: '02289430245', data: '2026-08-18', documenti: [
      { id: 401, tipo: 'ordine', numero: 'OF/2026/051', data: '2026-08-18', file: 'ordine_OF-2026-051.pdf', righe: [
        { codice: 'XMAS-LED', descrizione: 'Addobbo luminoso a LED, 100 pz', qta: 120, prezzo: 18.50 },
        { codice: 'XMAS-GHO', descrizione: 'Ghirlanda natalizia 150 cm',     qta: 80,  prezzo: 25.375 } ] },
      { id: 402, tipo: 'conferma', numero: 'CON/2026/778', data: '2026-08-30', file: 'conferma_CON-2026-778.pdf', righe: [
        { codice: 'XMAS-LED', descrizione: 'Addobbo luminoso a LED, 100 pz', qta: 120, prezzo: 18.50 },
        { codice: 'XMAS-GHO', descrizione: 'Ghirlanda natalizia 150 cm',     qta: 80,  prezzo: 25.375 } ] } ] },

    { id: 5, numero: 'OF/2026/033', fornitore_id: 1, cliente_piva: '01573540439', data: '2026-06-20', documenti: [
      { id: 501, tipo: 'ordine', numero: 'OF/2026/033', data: '2026-06-20', file: 'ordine_OF-2026-033.pdf', righe: [
        { codice: 'VASA-4050', descrizione: 'Vaso in terracotta Ø 40 cm', qta: 320, prezzo: 30.00 },
        { codice: 'SOGG-055',  descrizione: 'Sottovaso Ø 55 cm',          qta: 240, prezzo: 24.50 } ] },
      { id: 502, tipo: 'conferma', numero: 'C-9850', data: '2026-06-24', file: 'conferma_C-9850.pdf', righe: [
        { codice: 'VASA-4050', descrizione: 'Vaso in terracotta Ø 40 cm', qta: 320, prezzo: 30.00 },
        { codice: 'SOGG-055',  descrizione: 'Sottovaso Ø 55 cm',          qta: 240, prezzo: 24.50 } ] },
      { id: 503, tipo: 'fattura', numero: 'F-2026-0891', data: '2026-07-02', file: 'fattura_F-2026-0891.pdf', righe: [
        { codice: 'VASA-4050', descrizione: 'Vaso in terracotta Ø 40 cm', qta: 320, prezzo: 30.00 },
        { codice: 'SOGG-055',  descrizione: 'Sottovaso Ø 55 cm',          qta: 240, prezzo: 24.50 } ] } ] },

    { id: 6, numero: 'OF/2026/038', fornitore_id: 2, cliente_piva: '05328730963', data: '2026-07-05', documenti: [
      { id: 601, tipo: 'ordine', numero: 'OF/2026/038', data: '2026-07-05', file: 'ordine_OF-2026-038.pdf', righe: [
        { codice: 'ORTO-TAV', descrizione: 'Tavolo da lavoro per orto rialzato', qta: 45, prezzo: 135.00 },
        { codice: 'ORTO-CMP', descrizione: 'Compostiera 320 L',                  qta: 35, prezzo: 92.50 } ] },
      { id: 602, tipo: 'conferma', numero: 'C-2026/0981', data: '2026-07-08', file: 'conferma_C-2026-0981.pdf', righe: [
        { codice: 'ORTO-TAV', descrizione: 'Tavolo da lavoro per orto rialzato', qta: 45, prezzo: 135.00 },
        { codice: 'ORTO-CMP', descrizione: 'Compostiera 320 L',                  qta: 35, prezzo: 92.50 } ] },
      { id: 603, tipo: 'fattura', numero: 'F-2026-0907', data: '2026-07-18', file: 'fattura_F-2026-0907.pdf', righe: [
        { codice: 'ORTO-TAV', descrizione: 'Tavolo da lavoro per orto rialzato', qta: 45, prezzo: 135.00 },
        { codice: 'ORTO-CMP', descrizione: 'Compostiera 320 L',                  qta: 35, prezzo: 92.50 } ] } ] },

    { id: 7, numero: 'OF/2026/040', fornitore_id: 1, cliente_piva: '04235980161', data: '2026-07-15', documenti: [
      { id: 701, tipo: 'ordine', numero: 'OF/2026/040', data: '2026-07-15', file: 'ordine_OF-2026-040.pdf', righe: [
        { codice: 'VASA-2230', descrizione: 'Vaso in terracotta Ø 23 cm', qta: 300, prezzo: 14.80 },
        { codice: 'SOGG-030',  descrizione: 'Sottovaso Ø 30 cm',          qta: 210, prezzo: 10.00 } ] },
      { id: 702, tipo: 'conferma', numero: 'C-9902', data: '2026-07-18', file: 'conferma_C-9902.pdf', righe: [
        { codice: 'VASA-2230', descrizione: 'Vaso in terracotta Ø 23 cm', qta: 300, prezzo: 14.80 },
        { codice: 'SOGG-030',  descrizione: 'Sottovaso Ø 30 cm',          qta: 210, prezzo: 10.00 } ] },
      { id: 703, tipo: 'fattura', numero: 'F-2026-0912', data: '2026-07-28', file: 'fattura_F-2026-0912.pdf', righe: [
        { codice: 'VASA-2230', descrizione: 'Vaso in terracotta Ø 23 cm', qta: 300, prezzo: 14.80 },
        { codice: 'SOGG-030',  descrizione: 'Sottovaso Ø 30 cm',          qta: 210, prezzo: 10.00 } ] } ] },

    { id: 8, numero: 'OF/2026/044', fornitore_id: 2, cliente_piva: '02633860254', data: '2026-08-05', documenti: [
      { id: 801, tipo: 'ordine', numero: 'OF/2026/044', data: '2026-08-05', file: 'ordine_OF-2026-044.pdf', righe: [
        { codice: 'FIOR-STD', descrizione: 'Vassoio fioraio 60x40',  qta: 100, prezzo: 23.60 },
        { codice: 'FIOR-BCK', descrizione: 'Secchiello zincato 5 L', qta: 120, prezzo: 13.50 } ] },
      { id: 802, tipo: 'conferma', numero: 'C-2026/1012', data: '2026-08-08', file: 'conferma_C-2026-1012.pdf', righe: [
        { codice: 'FIOR-STD', descrizione: 'Vassoio fioraio 60x40',  qta: 100, prezzo: 23.60 },
        { codice: 'FIOR-BCK', descrizione: 'Secchiello zincato 5 L', qta: 120, prezzo: 13.50 } ] },
      { id: 803, tipo: 'fattura', numero: 'F-2026-0921', data: '2026-08-20', file: 'fattura_F-2026-0921.pdf', righe: [
        { codice: 'FIOR-STD', descrizione: 'Vassoio fioraio 60x40',  qta: 100, prezzo: 23.60 },
        { codice: 'FIOR-BCK', descrizione: 'Secchiello zincato 5 L', qta: 120, prezzo: 13.50 } ] } ] },

    { id: 9, numero: 'OF/2026/029', fornitore_id: 1, cliente_piva: '03152770962', data: '2026-05-12', documenti: [
      { id: 901, tipo: 'ordine', numero: 'OF/2026/029', data: '2026-05-12', file: 'ordine_OF-2026-029.pdf', righe: [
        { codice: 'VASA-3050', descrizione: 'Vaso in terracotta Ø 30 cm', qta: 300, prezzo: 12.30 },
        { codice: 'SOGG-040',  descrizione: 'Sottovaso Ø 40 cm',          qta: 200, prezzo: 9.55 } ] },
      { id: 902, tipo: 'conferma', numero: 'C-9790', data: '2026-05-15', file: 'conferma_C-9790.pdf', righe: [
        { codice: 'VASA-3050', descrizione: 'Vaso in terracotta Ø 30 cm', qta: 300, prezzo: 12.30 },
        { codice: 'SOGG-040',  descrizione: 'Sottovaso Ø 40 cm',          qta: 200, prezzo: 9.55 } ] },
      { id: 903, tipo: 'fattura', numero: 'F-2026-0815', data: '2026-05-30', file: 'fattura_F-2026-0815.pdf', righe: [
        { codice: 'VASA-3050', descrizione: 'Vaso in terracotta Ø 30 cm', qta: 300, prezzo: 12.30 },
        { codice: 'SOGG-040',  descrizione: 'Sottovaso Ø 40 cm',          qta: 200, prezzo: 9.55 } ] },
      { id: 904, tipo: 'nota_credito', numero: 'NC-2026-005', data: '2026-08-22', file: 'nota_credito_NC-2026-005.pdf', riferimento: 'F-2026-0815', nota: 'Reso merce danneggiata', righe: [
        { codice: 'VASA-3050', descrizione: 'Vaso in terracotta Ø 30 cm (reso)', qta: -60, prezzo: 12.30 },
        { codice: 'SOGG-040',  descrizione: 'Sottovaso Ø 40 cm (reso)',          qta: -60, prezzo: 9.55 } ] } ] },

    { id: 10, numero: 'OF/2026/030', fornitore_id: 1, cliente_piva: '01573540439', data: '2026-06-10', documenti: [
      { id: 1001, tipo: 'ordine', numero: 'OF/2026/030', data: '2026-06-10', file: 'ordine_OF-2026-030.pdf', righe: [
        { codice: 'VASA-3040', descrizione: 'Vaso in terracotta Ø 30 cm', qta: 340, prezzo: 14.00 },
        { codice: 'VASA-4055', descrizione: 'Vaso in terracotta Ø 40 cm', qta: 180, prezzo: 36.00 } ] },
      { id: 1002, tipo: 'conferma', numero: 'C-9811', data: '2026-06-12', file: 'conferma_C-9811.pdf', righe: [
        { codice: 'VASA-3040', descrizione: 'Vaso in terracotta Ø 30 cm', qta: 340, prezzo: 14.00 },
        { codice: 'VASA-4055', descrizione: 'Vaso in terracotta Ø 40 cm', qta: 180, prezzo: 36.00 } ] },
      { id: 1003, tipo: 'fattura', numero: 'F-2026-0840', data: '2026-06-25', file: 'fattura_F-2026-0840.pdf', righe: [
        { codice: 'VASA-3040', descrizione: 'Vaso in terracotta Ø 30 cm', qta: 340, prezzo: 14.00 },
        { codice: 'VASA-4055', descrizione: 'Vaso in terracotta Ø 40 cm', qta: 180, prezzo: 36.00 } ] } ] },

    { id: 11, numero: 'OF/2026/046', fornitore_id: 2, cliente_piva: '02457160341', data: '2026-08-26', documenti: [
      { id: 1101, tipo: 'ordine', numero: 'OF/2026/046', data: '2026-08-26', file: 'ordine_OF-2026-046.pdf', righe: [
        { codice: 'GASPER-A1', descrizione: 'Contenitore in resina 60 L',  qta: 250, prezzo: 29.60 },
        { codice: 'GASPER-B3', descrizione: 'Cassa in legno decor 40x40', qta: 180, prezzo: 27.28 },
        { codice: 'GASPER-C2', descrizione: 'Fioriera in resina 50 L',     qta: 100, prezzo: 12.50 } ] },
      { id: 1102, tipo: 'conferma', numero: 'C-2026/1044', data: '2026-08-30', file: 'conferma_C-2026-1044.pdf', righe: [
        { codice: 'GASPER-A1', descrizione: 'Contenitore in resina 60 L',          qta: 240, prezzo: 29.60 },
        { codice: 'GASPER-B3', descrizione: 'Cassa in legno decor 40x40',         qta: 180, prezzo: 27.28 },
        { codice: 'GASPER-D4', descrizione: 'Portavaso in resina (sostituto C2)', qta: 50,  prezzo: 18.00 } ] },
      { id: 1103, tipo: 'fattura', numero: 'F-2026-0933', data: '2026-08-31', file: 'fattura_F-2026-0933.pdf', righe: [
        { codice: 'GASPER-A1', descrizione: 'Contenitore in resina 60 L',          qta: 240, prezzo: 29.60 },
        { codice: 'GASPER-B3', descrizione: 'Cassa in legno decor 40x40',         qta: 180, prezzo: 26.90 },
        { codice: 'GASPER-D4', descrizione: 'Portavaso in resina (sostituto C2)', qta: 50,  prezzo: 18.00 } ] },
      { id: 1104, tipo: 'nota_credito', numero: 'NC-2026-007', data: '2026-09-02', file: 'nota_credito_NC-2026-007.pdf', riferimento: 'F-2026-0933', nota: 'Reso 30 casse', righe: [
        { codice: 'GASPER-B3', descrizione: 'Cassa in legno decor 40x40 (reso)', qta: -30, prezzo: 28.20 } ] } ] },

    { id: 12, numero: 'OF/2026/031', fornitore_id: 2, cliente_piva: '05328730963', data: '2026-06-03', documenti: [
      { id: 1201, tipo: 'ordine', numero: 'OF/2026/031', data: '2026-06-03', file: 'ordine_OF-2026-031.pdf', righe: [
        { codice: 'ORTO-CMP', descrizione: 'Compostiera 320 L',       qta: 20, prezzo: 92.50 },
        { codice: 'ORTO-SAC', descrizione: 'Sacco terriccio 70 L',     qta: 40, prezzo: 15.00 } ] },
      { id: 1202, tipo: 'conferma', numero: 'C-2026/0902', data: '2026-06-06', file: 'conferma_C-2026-0902.pdf', righe: [
        { codice: 'ORTO-CMP', descrizione: 'Compostiera 320 L',       qta: 20, prezzo: 92.50 },
        { codice: 'ORTO-SAC', descrizione: 'Sacco terriccio 70 L',     qta: 40, prezzo: 15.00 } ] },
      { id: 1203, tipo: 'fattura', numero: 'F-2026-0822', data: '2026-06-20', file: 'fattura_F-2026-0822.pdf', righe: [
        { codice: 'ORTO-CMP', descrizione: 'Compostiera 320 L',       qta: 20, prezzo: 92.50 },
        { codice: 'ORTO-SAC', descrizione: 'Sacco terriccio 70 L',     qta: 40, prezzo: 15.00 } ] } ] }
  ],

  /* Documenti arrivati e letti in automatico, in attesa di essere abbinati a una pratica. */
  in_arrivo: [
    { id: 9001, tipo: 'conferma', fornitore_id: 1, numero: 'AB-77120', data: '2026-09-03', ricevuto: '2026-09-03', codice_cliente: 'K-10122', file: 'Gries_AB-77120.pdf', righe: [
      { codice: 'VASA-2210', descrizione: 'Vaso in terracotta Ø 22 cm', qta: 480, prezzo: 6.40 },
      { codice: 'VASA-3050', descrizione: 'Vaso in terracotta Ø 30 cm', qta: 200, prezzo: 12.30 },
      { codice: 'SOGG-040',  descrizione: 'Sottovaso Ø 40 cm',          qta: 320, prezzo: 8.36 } ] },
    { id: 9002, tipo: 'fattura', fornitore_id: 3, numero: 'F-2026-0930', data: '2026-08-31', ricevuto: '2026-09-02', codice_cliente: 'IN-3150', file: 'Ings_F-2026-0930.pdf', righe: [
      { codice: 'XMAS-LED', descrizione: 'Addobbo luminoso a LED, 100 pz', qta: 120, prezzo: 18.50 },
      { codice: 'XMAS-GHO', descrizione: 'Ghirlanda natalizia 150 cm',     qta: 80,  prezzo: 25.375 } ] },
    { id: 9003, tipo: 'fattura', fornitore_id: 2, numero: 'F-2026-0940', data: '2026-09-02', ricevuto: '2026-09-03', codice_cliente: 'GA-2271', file: 'Gasper_F-2026-0940.pdf', righe: [
      { codice: 'GASPER-A1', descrizione: 'Contenitore in resina 60 L',  qta: 250, prezzo: 29.60 },
      { codice: 'GASPER-B3', descrizione: 'Cassa in legno decor 40x40', qta: 180, prezzo: 27.28 } ] },
    { id: 9004, tipo: 'conferma', fornitore_id: 2, numero: 'C-2026/1101', data: '2026-09-04', ricevuto: '2026-09-04', codice_cliente: 'GA-2999', file: 'Gasper_C-2026-1101.pdf', righe: [
      { codice: 'GASPER-E7', descrizione: 'Vaso alto in resina 80 cm', qta: 40, prezzo: 80.00 } ] }
  ],

  /* Bollettini: quello che il fornitore ci riconosce, mese per mese.
     decisioni: per numero documento, l'esito della verifica di una riga che non quadra. */
  bollettini: [
    { id: 1, fornitore_id: 1, anno: 2026, mese: 5, ricevuto: '2026-06-10', stato: 'verificato', file: 'Gries_bollettino_2026-05.pdf', decisioni: {}, righe: [
      { numero: 'F-2026-0815', data: '2026-05-30', imponibile: 5600.00, pct: 28.00, importo: 1568.00 } ] },
    { id: 2, fornitore_id: 1, anno: 2026, mese: 6, ricevuto: '2026-07-08', stato: 'verificato', file: 'Gries_bollettino_2026-06.pdf', decisioni: {}, righe: [
      { numero: 'F-2026-0840', data: '2026-06-25', imponibile: 11240.00, pct: 7.00, importo: 786.80 } ] },
    { id: 3, fornitore_id: 1, anno: 2026, mese: 7, ricevuto: '2026-08-07', stato: 'da_verificare', file: 'Gries_bollettino_2026-07.pdf', decisioni: {}, righe: [
      { numero: 'F-2026-0891', data: '2026-07-02', imponibile: 15480.00, pct: 7.00,  importo: 1083.60 },
      { numero: 'F-2026-0912', data: '2026-07-28', imponibile: 6540.00,  pct: 17.50, importo: 1144.50, nota_fornitore: 'Promozione estiva −0,5%' } ] },
    { id: 4, fornitore_id: 1, anno: 2026, mese: 8, ricevuto: '2026-09-03', stato: 'verificato', file: 'Gries_bollettino_2026-08.pdf', decisioni: {}, righe: [
      { numero: 'NC-2026-005', data: '2026-08-22', imponibile: -1311.00, pct: 28.00, importo: -367.08 } ] },
    { id: 5, fornitore_id: 2, anno: 2026, mese: 7, ricevuto: '2026-08-10', stato: 'verificato', file: 'Gasper_bollettino_2026-07.pdf', decisioni: {}, righe: [
      { numero: 'F-2026-0907', data: '2026-07-18', imponibile: 9312.50, pct: 18.00, importo: 1676.25 } ] },
    { id: 6, fornitore_id: 2, anno: 2026, mese: 8, ricevuto: '2026-09-04', stato: 'da_verificare', file: 'Gasper_bollettino_2026-08.pdf', decisioni: {}, righe: [
      { numero: 'F-2026-0921', data: '2026-08-20', imponibile: 3980.00, pct: 21.00, importo: 835.80 } ] },
    { id: 7, fornitore_id: 3, anno: 2026, mese: 8, ricevuto: '2026-09-02', stato: 'da_verificare', file: 'Ings_bollettino_2026-08.pdf', decisioni: {}, righe: [
      { numero: 'F-2026-0930', data: '2026-08-31', imponibile: 4250.00, pct: 32.00, importo: 1360.00 } ] }
  ],

  /* Liquidazioni ai subagenti già chiuse. */
  liquidazioni_chiuse: [
    { anno: 2026, trimestre: 1, chiusa_il: '2026-04-10' },
    { anno: 2026, trimestre: 2, chiusa_il: '2026-07-10' }
  ]
};
