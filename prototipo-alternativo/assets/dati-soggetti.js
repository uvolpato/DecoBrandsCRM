/* ============================================================
   Anagrafica unica a soggetti — dati di prova
   (specifica-anagrafica-soggetti.md, direzione D-102).
   Additivo: il master `soggetti` si aggiunge SOPRA clienti/fornitori/
   subagenti che restano identici; i ruoli ci si collegano con
   `soggetto_id` nullable, come le colonne della migrazione.
   Casi dimostrati:
   - MCL SRL: un soggetto, due ruoli con due codici diversi (D-101);
   - Consorzio Agrario Lombardo: catena = 1 soggetto con N sedi punto_vendita;
   - Stefano Bastasin: persona naturale con ruolo subagente;
   - contatto del vecchio CRM senza ruoli e non attivo (niente cancellazioni §1.4).
   Nota: in produzione la ragione sociale resta in clienti_versioni /
   fornitori_versioni; qui il nome esiste già sulle tabelle di strato 0.
   ============================================================ */
(function () {
  'use strict';
  const D = window.DATI_DEMO;

  D.soggetti = [
    { id: 1,  codice: 'C000001', natura: 'azienda', paese: 'DE', piva: 'DE123456789', piva_norm: 'DE123456789', codice_fiscale: '', cf_norm: '', sorgente: 'integra', attivo: true, note: '' },
    { id: 2,  codice: 'C000002', natura: 'azienda', paese: 'DE', piva: 'DE987654321', piva_norm: 'DE987654321', codice_fiscale: '', cf_norm: '', sorgente: 'integra', attivo: true, note: '' },
    { id: 3,  codice: 'C000003', natura: 'azienda', paese: 'DE', piva: 'DE555111222', piva_norm: 'DE555111222', codice_fiscale: '', cf_norm: '', sorgente: 'integra', attivo: true, note: '' },
    { id: 4,  codice: 'C000004', natura: 'azienda', paese: 'IT', piva: 'IT01234560481', piva_norm: '01234560481', codice_fiscale: '', cf_norm: '', sorgente: 'integra', attivo: true, note: '' },
    { id: 5,  codice: 'C000005', natura: 'azienda', paese: 'IT', piva: 'IT08943010155', piva_norm: '08943010155', codice_fiscale: '02238370638', cf_norm: '02238370638', sorgente: 'integra', attivo: true, note: 'Cliente e fornitore: due codici di ruolo diversi (D-101).' },
    { id: 6,  codice: 'C000006', natura: 'azienda', paese: 'IT', piva: '04235980161', piva_norm: '04235980161', codice_fiscale: '', cf_norm: '', sorgente: 'integra', attivo: true, note: '' },
    { id: 7,  codice: 'C000007', natura: 'azienda', paese: 'IT', piva: '03152770962', piva_norm: '03152770962', codice_fiscale: '', cf_norm: '', sorgente: 'integra', attivo: true, note: '' },
    { id: 8,  codice: 'C000008', natura: 'azienda', paese: 'IT', piva: '04120990983', piva_norm: '04120990983', codice_fiscale: '', cf_norm: '', sorgente: 'integra', attivo: true, note: '' },
    { id: 9,  codice: 'C000009', natura: 'persona', paese: 'IT', piva: '', piva_norm: '', codice_fiscale: 'BSTSFN72M05H501X', cf_norm: 'BSTSFN72M05H501X', sorgente: 'crm', attivo: true, note: '' },
    { id: 10, codice: 'C000010', natura: 'azienda', paese: 'IT', piva: 'IT03567890123', piva_norm: '03567890123', codice_fiscale: '', cf_norm: '', sorgente: 'vecchio_crm', attivo: true, note: 'Catena: 34 schede del vecchio CRM fondono in un soggetto con N sedi.' },
    { id: 11, codice: 'C000011', natura: 'persona', paese: 'IT', piva: '', piva_norm: '', codice_fiscale: 'MRARSS62A01F205Z', cf_norm: 'MRARSS62A01F205Z', sorgente: 'vecchio_crm', attivo: false, note: 'Contatto storico senza ruoli: resta, non si cancella (§1.4).' }
  ];

  /* RUOLI — link alle entità di strato 0 già presenti nei dati (colonne soggetto_id nullable). */
  D.fornitori.forEach(f => { f.soggetto_id = ({ 1: 1, 2: 2, 3: 3, 4: 4 })[f.id] || null; });
  D.clienti.forEach(c => { c.soggetto_id = ({ '04235980161': 6, '03152770962': 7, '04120990983': 8 })[c.piva] || null; });
  D.subagenti.forEach(sa => { if (sa.id === 1) sa.soggetto_id = 9; });   // gli altri subagenti: ancora senza soggetto, come righe da migrare

  /* MCL: cliente e fornitore sullo stesso soggetto. Il fornitore entra nello strato 0
     come sarebbe entrato in Integra; senza scaglioni, dimostra anche lo scaglione mancante. */
  D.clienti.push({ piva: '08943010155', nome: 'MCL SRL', citta: 'Piacenza', indirizzo: 'Via Emilia 200', codice_integra: 'C02477', vendita_diretta: false, soggetto_id: 5 });
  D.fornitori.push({ id: 12, nome: 'MCL SRL', breve: 'MCL', piva: 'IT08943010155', codice_integra: 'F90012', paese: 'Italia', giorni_conferma: 21, giorno_bollettino: 10, giorni_incasso: 60, maturazione: 'fatturato', attivo: true, soggetto_id: 5 });
  /* Il Consorzio Agrario: cliente importato dal vecchio CRM (prima 34 schede, ora 1 soggetto). */
  D.clienti.push({ piva: '03567890123', nome: 'Consorzio Agrario Lombardo', citta: 'Cremona', indirizzo: 'Via Garibaldi 12', codice_integra: 'C01104', vendita_diretta: false, soggetto_id: 10 });

  D.sedi = [
    /* MCL: catena di punti vendita + sede di fatturazione */
    { id: 1, soggetto_id: 5, tipo: 'punto_vendita', insegna: 'MCL Brescello', indirizzo: 'Via Roma 44', cap: '42049', citta: 'Brescello', provincia: 'RE', paese: 'IT', settore_id: null, gruppo_id: null, predefinita: true, attivo: true, valido_dal: '2015-03-01', valido_al: null },
    { id: 2, soggetto_id: 5, tipo: 'punto_vendita', insegna: 'MCL Piacenza', indirizzo: 'Via Caorsana 98', cap: '29121', citta: 'Piacenza', provincia: 'PC', paese: 'IT', settore_id: null, gruppo_id: null, predefinita: false, attivo: true, valido_dal: '2019-01-15', valido_al: null },
    { id: 3, soggetto_id: 5, tipo: 'punto_vendita', insegna: 'MCL Fornace', indirizzo: 'Strada Provinciale 7', cap: '29014', citta: 'Fornace', provincia: 'PC', paese: 'IT', settore_id: null, gruppo_id: null, predefinita: false, attivo: true, valido_dal: '2023-09-01', valido_al: null },
    { id: 4, soggetto_id: 5, tipo: 'fatturazione', insegna: '', indirizzo: 'Via Emilia 200', cap: '29121', citta: 'Piacenza', provincia: 'PC', paese: 'IT', settore_id: null, gruppo_id: null, predefinita: false, attivo: true, valido_dal: '2015-03-01', valido_al: null },
    /* Consorzio Agrario: sede legale + punti vendita */
    { id: 5, soggetto_id: 10, tipo: 'legale', insegna: '', indirizzo: 'Via Garibaldi 12', cap: '26100', citta: 'Cremona', provincia: 'CR', paese: 'IT', settore_id: null, gruppo_id: null, predefinita: true, attivo: true, valido_dal: '1998-01-01', valido_al: null },
    { id: 6, soggetto_id: 10, tipo: 'punto_vendita', insegna: 'Punto vendita Cremona', indirizzo: 'Via Persico 8', cap: '26100', citta: 'Cremona', provincia: 'CR', paese: 'IT', settore_id: null, gruppo_id: null, predefinita: false, attivo: true, valido_dal: '2010-01-01', valido_al: null },
    { id: 7, soggetto_id: 10, tipo: 'punto_vendita', insegna: 'Punto vendita Manerbio', indirizzo: 'Via Rovato 31', cap: '25025', citta: 'Manerbio', provincia: 'BS', paese: 'IT', settore_id: null, gruppo_id: null, predefinita: false, attivo: true, valido_dal: '2014-05-01', valido_al: null },
    { id: 8, soggetto_id: 10, tipo: 'punto_vendita', insegna: 'Punto vendita Codogno', indirizzo: 'Via Dante 120', cap: '26877', citta: 'Codogno', provincia: 'LO', paese: 'IT', settore_id: null, gruppo_id: null, predefinita: false, attivo: true, valido_dal: '2018-10-01', valido_al: null },
    /* Serre del Garda: legale e magazzino */
    { id: 9, soggetto_id: 8, tipo: 'legale', insegna: '', indirizzo: 'Via Gardesana 61', cap: '25130', citta: 'Brescia', provincia: 'BS', paese: 'IT', settore_id: null, gruppo_id: null, predefinita: true, attivo: true, valido_dal: '2005-01-01', valido_al: null },
    { id: 10, soggetto_id: 8, tipo: 'magazzino', insegna: 'Deposito Desenzano', indirizzo: 'Zona Artigianale 5', cap: '25015', citta: 'Desenzano', provincia: 'BS', paese: 'IT', settore_id: null, gruppo_id: null, predefinita: false, attivo: true, valido_dal: '2012-03-01', valido_al: null }
  ];

  /* Recapiti: uno solo fra soggetto, sede e persona è valorizzato (CHECK §4.3). */
  D.recapiti = [
    { id: 1, soggetto_id: 5, sede_id: null, persona_id: null, tipo: 'email', valore: 'ordini@mclsrl.it', etichetta: 'ordini', predefinito: true, valido_dal: '2015-03-01', valido_al: null },
    { id: 2, soggetto_id: 5, sede_id: null, persona_id: null, tipo: 'pec', valore: 'mclsrl@pec.im.it', etichetta: '', predefinito: false, valido_dal: '2015-03-01', valido_al: null },
    { id: 3, soggetto_id: 5, sede_id: null, persona_id: null, tipo: 'telefono', valore: '+39 0523 880100', etichetta: '', predefinito: false, valido_dal: '2015-03-01', valido_al: null },
    { id: 4, soggetto_id: 10, sede_id: null, persona_id: null, tipo: 'email', valore: 'acquisti@consorzioagrario.it', etichetta: 'acquisti', predefinito: true, valido_dal: '2018-01-01', valido_al: null },
    { id: 5, soggetto_id: 10, sede_id: null, persona_id: null, tipo: 'telefono', valore: '+39 0372 123456', etichetta: '', predefinito: false, valido_dal: '2018-01-01', valido_al: null },
    { id: 6, soggetto_id: 6, sede_id: null, persona_id: null, tipo: 'email', valore: 'info@vivaioverdeazzurro.it', etichetta: 'ordini', predefinito: true, valido_dal: '2020-01-01', valido_al: null },
    /* allegati, non al soggetto */
    { id: 7, soggetto_id: null, sede_id: 2, persona_id: null, tipo: 'telefono', valore: '+39 0523 880133', etichetta: 'magazzino', predefinito: false, valido_dal: '2019-01-15', valido_al: null },
    { id: 8, soggetto_id: null, sede_id: null, persona_id: 2, tipo: 'cellulare', valore: '+39 335 1234567', etichetta: 'direzione', predefinito: false, valido_dal: '2018-06-01', valido_al: null }
  ];

  D.persone = [
    { id: 1, nome: 'Paolo', cognome: 'Rinaldi', titolo: 'Direttore acquisti', attivo: true },
    { id: 2, nome: 'Anna', cognome: 'Merlo', titolo: 'Titolare', attivo: true }
  ];
  /* La stessa persona può essere referente di più aziende: due tabelle (§4.4). */
  D.persone_contatti = [
    { id: 1, persona_id: 1, soggetto_id: 10, sede_id: null, ruolo: 'acquisti', referente: true, valido_dal: '2020-01-01', valido_al: null },
    { id: 2, persona_id: 2, soggetto_id: 5, sede_id: 2, ruolo: 'titolare', referente: true, valido_dal: '2018-06-01', valido_al: null }
  ];

  /* Fatturazione elettronica: del soggetto fiscale, non del ruolo (§4.5). */
  D.fatturazioni = [
    { soggetto_id: 5, codice_destinatario: 'M5E2RC4', pec_destinatario: '', codice_univoco_ufficio: '', id_paese_estero: '', id_codice_estero: '', regime_fiscale: 'RF01', split_payment: false, reverse_charge: false, esigibilita_iva: 'I', attiva: true, note: '' },
    { soggetto_id: 10, codice_destinatario: '', pec_destinatario: '', codice_univoco_ufficio: '', id_paese_estero: '', id_codice_estero: '', regime_fiscale: '', split_payment: false, reverse_charge: false, esigibilita_iva: '', attiva: false, note: '' },
    { soggetto_id: 6, codice_destinatario: '', pec_destinatario: 'amministrazione@vivaioverdeazzurro.it', codice_univoco_ufficio: '', id_paese_estero: '', id_codice_estero: '', regime_fiscale: 'RF01', split_payment: false, reverse_charge: false, esigibilita_iva: 'I', attiva: true, note: '' },
    { soggetto_id: 1, codice_destinatario: '', pec_destinatario: '', codice_univoco_ufficio: '', id_paese_estero: 'DE', id_codice_estero: 'DE123456789', regime_fiscale: '', split_payment: false, reverse_charge: false, esigibilita_iva: '', attiva: true, note: 'Destinatario estero senza SDI.' }
  ];
})();
