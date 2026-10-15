/* ============================================================
   Decobrands — Prototipo alternativo — motore
   Regole di calcolo e di flusso, senza interfaccia.
   ============================================================ */
(function () {
  'use strict';
  const M = window.M = {};
  const CHIAVE = 'decobrands-alt-v1';

  /* ---------- Stato (salvato nel browser per le demo) ---------- */
  function clona(x) { return JSON.parse(JSON.stringify(x)); }
  function carica() {
    try { const s = localStorage.getItem(CHIAVE); if (s) return JSON.parse(s); } catch (e) { /* senza memoria locale */ }
    return Object.assign(clona(window.DATI_DEMO), { registro: [] });
  }
  M.S = carica();
  M.salva = function () { try { localStorage.setItem(CHIAVE, JSON.stringify(M.S)); } catch (e) { /* ignora */ } };
  M.ripristina = function () { try { localStorage.removeItem(CHIAVE); } catch (e) { /* ignora */ } M.S = Object.assign(clona(window.DATI_DEMO), { registro: [] }); };
  M.annota = function (testo) { M.S.registro.unshift({ quando: new Date().toISOString(), testo: testo }); M.S.registro = M.S.registro.slice(0, 30); };

  /* ---------- Formati ---------- */
  /* Formattazione manuale: Intl con 'it-IT' non mette il separatore delle migliaia sotto 10.000 (8207,20). */
  const gruppi = t => t.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const numero = (n, dec, minDec) => {
    const x = Number(n) || 0; let [i, d] = Math.abs(x).toFixed(dec).split('.');
    if (d && minDec < dec) { d = d.replace(/0+$/, ''); while (d.length < minDec) d += '0'; }
    return (x < 0 && Number(Math.abs(x).toFixed(dec)) !== 0 ? '-' : '') + gruppi(i) + (d ? ',' + d : '');
  };
  M.euro = n => numero(n, 2, 2) + '\u00a0€';
  M.euro0 = n => numero(n, 0, 0) + '\u00a0€';
  M.pct = n => numero(n, 2, 0) + '%';
  M.num = n => numero(n, 2, 0);
  M.dec = n => numero(n, 2, 2);
  M.data = iso => { if (!iso) return '—'; const [a, m, g] = iso.split('-'); return g + '/' + m + '/' + a; };
  M.MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  M.MESI_BREVI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  M.meseMin = m => M.MESI[m - 1];
  M.mese = (m, a) => M.MESI[m - 1].replace(/^./, c => c.toUpperCase()) + (a ? ' ' + a : '');
  M.dataLunga = iso => { const [a, m, g] = iso.split('-'); return Number(g) + ' ' + M.MESI[Number(m) - 1] + ' ' + a; };
  M.r2 = n => Math.round((Number(n) || 0) * 100) / 100;
  M.giorni = (da, a) => Math.round((new Date(a) - new Date(da)) / 86400000);
  M.piuGiorni = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  M.oggi = () => M.S.oggi;

  /* ---------- Anagrafiche ---------- */
  M.fornitore = id => M.S.fornitori.find(f => f.id === Number(id));
  M.cliente = piva => M.S.clienti.find(c => c.piva === piva);
  M.nomeCliente = piva => (M.cliente(piva) || { nome: piva || '—' }).nome;
  M.subagente = id => M.S.subagenti.find(s => s.id === Number(id));
  M.abbinamento = (piva, fid) => M.S.abbinamenti.find(a => a.cliente_piva === piva && a.fornitore_id === Number(fid));
  M.abbinamentoPerCodice = (fid, codice) => M.S.abbinamenti.find(a => a.fornitore_id === Number(fid) && (a.codice || '').toUpperCase() === String(codice || '').toUpperCase());
  M.pratica = id => M.S.pratiche.find(p => p.id === Number(id));
  M.praticaPerDocumento = numero => M.S.pratiche.find(p => p.documenti.some(d => d.numero === numero && (d.tipo === 'fattura' || d.tipo === 'nota_credito')));

  /* ---------- Documenti e stato pratica (lo stato si ricava dai documenti) ---------- */
  M.importoRiga = r => M.r2(r.qta * r.prezzo);
  M.importoDoc = d => M.r2(d.righe.reduce((s, r) => s + M.importoRiga(r), 0));
  M.doc = (p, tipo) => p.documenti.find(d => d.tipo === tipo);
  M.fiscali = p => p.documenti.filter(d => d.tipo === 'fattura' || d.tipo === 'nota_credito');
  M.netto = p => M.r2(M.fiscali(p).reduce((s, d) => s + M.importoDoc(d), 0));
  M.importoPratica = p => { const f = M.fiscali(p); if (f.length) return M.netto(p); const c = M.doc(p, 'conferma'); return M.importoDoc(c || M.doc(p, 'ordine')); };
  M.scadenzaConferma = p => M.piuGiorni(p.data, M.fornitore(p.fornitore_id).giorni_conferma);

  M.statoPratica = function (p) {
    if (M.fiscali(p).some(d => d.tipo === 'fattura')) return { chiave: 'fatturata', etichetta: 'Fatturata' };
    if (M.doc(p, 'conferma')) return { chiave: 'confermata', etichetta: 'Confermata', nota: 'in attesa di fattura' };
    const scad = M.scadenzaConferma(p);
    const g = M.giorni(M.oggi(), scad);
    return g < 0
      ? { chiave: 'scaduta', etichetta: 'Conferma in ritardo', scadenza: scad, nota: 'da ' + (-g) + (g === -1 ? ' giorno' : ' giorni') }
      : { chiave: 'attesa', etichetta: 'Attesa conferma', scadenza: scad, nota: g === 0 ? 'scade oggi' : 'entro ' + g + (g === 1 ? ' giorno' : ' giorni') };
  };

  /* Confronto righe fra le fasi (ordine → conferma → fattura) */
  M.fasi = p => ['ordine', 'conferma', 'fattura'].map(t => M.doc(p, t)).filter(Boolean);
  M.confronto = function (p) {
    const fasi = M.fasi(p);
    const codici = [];
    fasi.forEach(d => d.righe.forEach(r => { if (codici.indexOf(r.codice) < 0) codici.push(r.codice); }));
    return codici.map(codice => {
      const per = fasi.map(d => d.righe.find(r => r.codice === codice) || null);
      const pres = per.filter(Boolean);
      let varia = false;
      for (let i = 1; i < per.length; i++) {
        const a = per[i - 1], b = per[i];
        if (!!a !== !!b || (a && b && (a.qta !== b.qta || a.prezzo !== b.prezzo))) varia = true;
      }
      const primo = per[0] ? M.importoRiga(per[0]) : 0;
      const ultimo = per[per.length - 1] ? M.importoRiga(per[per.length - 1]) : 0;
      return { codice: codice, descrizione: pres[0].descrizione, per: per, varia: varia, delta: M.r2(ultimo - primo) };
    });
  };
  M.haVariazioni = p => M.fasi(p).length > 1 && M.confronto(p).some(r => r.varia);

  /* ---------- Provvigioni ---------- */
  /* Scaglione in vigore alla data del documento (versioni con valido_dal). */
  M.scaglione = function (fid, sconto, data) {
    const validi = M.S.scaglioni.filter(s => s.fornitore_id === Number(fid) && s.valido_dal <= (data || '9999'));
    const perSconto = {};
    validi.forEach(s => { if (!perSconto[s.sconto] || perSconto[s.sconto].valido_dal < s.valido_dal) perSconto[s.sconto] = s; });
    const lista = Object.values(perSconto).sort((a, b) => a.sconto - b.sconto);
    return lista.find(s => s.sconto === Number(sconto)) || lista.filter(s => s.sconto <= Number(sconto)).pop() || null;
  };
  /* Percentuali per una pratica a una data:
     - dal fornitore ci aspettiamo agente + subagente standard dello scaglione;
     - al subagente liquidiamo la sua percentuale (con eventuale eccezione). */
  M.percentuali = function (p, data) {
    const ab = M.abbinamento(p.cliente_piva, p.fornitore_id);
    if (!ab) return null;
    const sc = M.scaglione(p.fornitore_id, ab.sconto, data || p.data);
    if (!sc) return null;
    const ecc = M.S.eccezioni.find(e => e.scaglione_id === sc.id && e.subagente_id === ab.subagente_id);
    return {
      sconto: ab.sconto, scaglione: sc, subagente_id: ab.subagente_id,
      agente: sc.pct_agente, sub_standard: sc.pct_sub, sub: ecc ? ecc.pct_sub : sc.pct_sub, eccezione: !!ecc,
      dal_fornitore: sc.pct_agente + sc.pct_sub
    };
  };

  /* ---------- Bollettini ---------- */
  M.fineMese = (a, m) => new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
  M.inMese = (iso, a, m) => iso.slice(0, 7) === a + '-' + String(m).padStart(2, '0');
  M.fiscaliDelMese = function (fid, a, m) {
    const out = [];
    M.S.pratiche.filter(p => p.fornitore_id === Number(fid)).forEach(p => M.fiscali(p).forEach(d => { if (M.inMese(d.data, a, m)) out.push({ pratica: p, doc: d }); }));
    return out;
  };
  M.bollettino = id => M.S.bollettini.find(b => b.id === Number(id));
  M.bollettinoDi = (fid, a, m) => M.S.bollettini.find(b => b.fornitore_id === Number(fid) && b.anno === a && b.mese === m);

  /* Riconciliazione riga per riga: fornitore (loro) contro calcolo (noi). */
  M.riconcilia = function (b) {
    const nostri = M.fiscaliDelMese(b.fornitore_id, b.anno, b.mese);
    const righe = [];
    b.righe.forEach(r => {
      const n = nostri.find(x => x.doc.numero === r.numero) || (function () {
        const p = M.praticaPerDocumento(r.numero); if (!p) return null;
        return { pratica: p, doc: p.documenti.find(d => d.numero === r.numero) };
      })();
      const riga = { numero: r.numero, data: r.data, loro: { imponibile: r.imponibile, pct: r.pct, importo: r.importo }, nota_fornitore: r.nota_fornitore };
      if (!n) { riga.categoria = 'sconosciuta'; riga.noi = null; }
      else {
        const perc = M.percentuali(n.pratica, n.doc.data);
        const imp = M.importoDoc(n.doc);
        riga.pratica = n.pratica; riga.cliente = n.pratica.cliente_piva;
        riga.noi = { imponibile: imp, pct: perc ? perc.dal_fornitore : 0, importo: perc ? M.r2(imp * perc.dal_fornitore / 100) : 0 };
        riga.differenza = M.r2(r.importo - riga.noi.importo);
        riga.categoria = Math.abs(riga.differenza) < 0.01 && Math.abs(r.imponibile - imp) < 0.01 ? 'quadra' : 'differenza';
      }
      righe.push(riga);
    });
    nostri.filter(x => !b.righe.some(r => r.numero === x.doc.numero)).forEach(x => {
      const perc = M.percentuali(x.pratica, x.doc.data);
      const imp = M.importoDoc(x.doc);
      const atteso = perc ? M.r2(imp * perc.dal_fornitore / 100) : 0;
      righe.push({ numero: x.doc.numero, data: x.doc.data, pratica: x.pratica, cliente: x.pratica.cliente_piva, loro: null,
        noi: { imponibile: imp, pct: perc ? perc.dal_fornitore : 0, importo: atteso }, differenza: -atteso, categoria: 'mancante' });
    });
    righe.forEach(r => {
      r.decisione = b.decisioni[r.numero] || null;
      r.aperta = r.categoria !== 'quadra' && !r.decisione;
      if (!r.cliente && r.pratica) r.cliente = r.pratica.cliente_piva;
    });
    const tot = k => M.r2(righe.reduce((s, r) => s + (r[k] ? r[k].importo : 0), 0));
    return { righe: righe, riconosciuto: tot('loro'), atteso: tot('noi'), differenza: M.r2(tot('loro') - tot('noi')), aperte: righe.filter(r => r.aperta).length };
  };

  /* Stato della casella fornitore × mese nella vista Bollettini. */
  M.casellaBollettino = function (fid, a, m) {
    const b = M.bollettinoDi(fid, a, m);
    const docs = M.fiscaliDelMese(fid, a, m);
    const finito = M.fineMese(a, m) < M.oggi();
    if (b) {
      if (b.stato === 'verificato') return { tipo: 'verificato', b: b };
      if (b.stato === 'contestato') return { tipo: 'contestato', b: b };
      const r = M.riconcilia(b);
      return { tipo: r.aperte ? 'da_verificare' : 'pronto', b: b, aperte: r.aperte };
    }
    if (!finito) return { tipo: 'in_corso', documenti: docs.length };
    return docs.length ? { tipo: 'mancante', documenti: docs.length } : { tipo: 'non_atteso' };
  };

  /* Il documento è riconosciuto dal fornitore in un bollettino verificato? (serve per il maturato) */
  M.riconosciutoIn = function (numero) {
    return M.S.bollettini.find(b => b.stato === 'verificato' && b.righe.some(r => r.numero === numero)) || null;
  };

  /* ---------- Liquidazioni ai subagenti (trimestri fissi) ---------- */
  M.trimestre = iso => Math.floor((Number(iso.slice(5, 7)) - 1) / 3) + 1;
  M.limiti = (a, t) => ({ da: a + '-' + String((t - 1) * 3 + 1).padStart(2, '0') + '-01', a: M.fineMese(a, t * 3) });
  M.nomeTrimestre = t => ['gennaio–marzo', 'aprile–giugno', 'luglio–settembre', 'ottobre–dicembre'][t - 1];

  M.righeLiquidazione = function (a, t) {
    const lim = M.limiti(a, t);
    const out = [];
    M.S.pratiche.forEach(p => M.fiscali(p).forEach(d => {
      if (d.data < lim.da || d.data > lim.a) return;
      const perc = M.percentuali(p, d.data);
      if (!perc) return;
      const f = M.fornitore(p.fornitore_id);
      const imp = M.importoDoc(d);
      let liquidabile = true, motivo = '';
      if (f.maturazione === 'maturato') {
        const b = M.riconosciutoIn(d.numero);
        if (!b) {
          liquidabile = false;
          const bm = M.bollettinoDi(p.fornitore_id, Number(d.data.slice(0, 4)), Number(d.data.slice(5, 7)));
          motivo = bm ? 'Il bollettino di ' + M.meseMin(bm.mese) + ' di ' + f.breve + ' non è ancora verificato' : 'Non ancora riconosciuto da ' + f.breve;
        }
      }
      const ab = M.abbinamento(p.cliente_piva, p.fornitore_id);
      out.push({
        pratica: p, doc: d, fornitore: f, subagente_id: perc.subagente_id, cliente: p.cliente_piva, codice_cliente: ab ? ab.codice : '',
        importo: imp, pct: perc.sub, eccezione: perc.eccezione, provvigione: M.r2(imp * perc.sub / 100), liquidabile: liquidabile, motivo: motivo
      });
    }));
    return out.sort((x, y) => x.doc.data.localeCompare(y.doc.data));
  };
  M.statoTrimestre = function (a, t) {
    const lim = M.limiti(a, t);
    const chiusa = M.S.liquidazioni_chiuse.find(l => l.anno === a && l.trimestre === t);
    if (chiusa) return { chiave: 'chiusa', etichetta: 'Liquidata il ' + M.data(chiusa.chiusa_il) };
    if (lim.da > M.oggi()) return { chiave: 'futura', etichetta: 'Non iniziata' };
    if (lim.a >= M.oggi()) return { chiave: 'in_corso', etichetta: 'In corso, si chiude il ' + M.data(lim.a), giorni: M.giorni(M.oggi(), lim.a) };
    return { chiave: 'da_liquidare', etichetta: 'Da liquidare' };
  };
  M.chiudiTrimestre = function (a, t) {
    M.S.liquidazioni_chiuse.push({ anno: a, trimestre: t, chiusa_il: M.oggi() });
    M.annota('Liquidazione ' + t + '° trimestre ' + a + ' chiusa');
  };
  M.csvLiquidazione = function (righe) {
    const q = v => '"' + String(v).replace(/"/g, '""') + '"';
    const intest = ['Fornitore', 'N. documento', 'Data documento', 'Codice cliente', 'Ragione sociale', 'Importo documento', '% provvigione', 'Importo provvigionale'];
    const corpo = righe.map(r => [r.fornitore.nome, r.doc.numero, M.data(r.doc.data), r.codice_cliente, M.nomeCliente(r.cliente),
      r.importo.toFixed(2).replace('.', ','), String(r.pct).replace('.', ','), r.provvigione.toFixed(2).replace('.', ',')].map(q).join(';'));
    return '﻿' + intest.map(q).join(';') + '\n' + corpo.join('\n');
  };

  /* ---------- Documenti in arrivo: proposta di abbinamento ---------- */
  M.importoLetto = d => d.tipo === 'bollettino' ? M.r2(d.righe.reduce((s, r) => s + r.importo, 0)) : M.importoDoc(d);

  /* ---------- Affidabilità della lettura (spec §6.5) ----------
     Nell'app arriva da GLM-OCR (logprobs); nel prototipo è simulata in doc.lettura.
     Soglie iniziali: ≥ 0,90 affidabile · 0,70–0,90 da controllare · < 0,70 bassa. */
  M.SOGLIA_OK = 0.9; M.SOGLIA_BASSA = 0.7;
  const hash = t => { let h = 7; for (const c of String(t)) h = (h * 31 + c.charCodeAt(0)) % 997; return h; };
  M.affidabilita = (d, campo) => {
    const l = d.lettura || {};
    if (l.campi && l.campi[campo] != null) return l.campi[campo];
    return 0.95 + (hash(d.id + campo) % 5) / 100;   // 0,95–0,99 per i campi letti bene
  };
  M.verificato = (d, campo) => !!(d.lettura && d.lettura.verificati && d.lettura.verificati[campo]);
  M.verifica = (d, campo) => { d.lettura = d.lettura || {}; d.lettura.verificati = d.lettura.verificati || {}; d.lettura.verificati[campo] = true; };
  /* Valore realmente stampato sul documento (per l'anteprima): diverso dal letto solo se la lettura ha sbagliato. */
  M.originale = (d, campo, letto) => { const o = d.lettura && d.lettura.originale; return o && o[campo] != null ? o[campo] : letto; };
  M.totaleStampato = d => d.lettura && d.lettura.totale != null ? d.lettura.totale : M.importoLetto(d);
  /* Nel giro agenzia (bollettini) gli articoli dei fornitori NON sono nell'anagrafica Decobrands:
     nessun controllo anagrafica articoli. L'anagrafica serve solo per la commercializzazione diretta
     (esportazione verso Integra con sostituzione codici e kit): fase successiva, spec §17. */
  /* Controlli fissi, indipendenti dal modello. */
  M.controlli = function (d) {
    const out = [];
    if (d.tipo === 'bollettino') {
      if (M.bollettinoDi(d.fornitore_id, d.anno, d.mese)) out.push({ campo: 'mese', testo: 'Bollettino già registrato per questo fornitore e mese', grave: true });
      return out;
    }
    if (!M.abbinamentoPerCodice(d.fornitore_id, d.codice_cliente)) out.push({ campo: 'codice_cliente', testo: 'Codice cliente ' + d.codice_cliente + ' non presente fra i clienti del fornitore', grave: true });
    const stampato = M.totaleStampato(d), somma = M.importoLetto(d);
    if (Math.abs(stampato - somma) >= 0.01) out.push({ campo: 'totale', testo: 'Totale del documento ' + M.euro(stampato) + ' diverso dalla somma delle righe ' + M.euro(somma), grave: true });
    return out;
  };
  /* Campi incerti non ancora verificati + controlli falliti → livello del documento. */
  M.statoLettura = function (d) {
    const campi = Object.keys((d.lettura && d.lettura.campi) || {}).filter(c => !M.verificato(d, c) && M.affidabilita(d, c) < M.SOGLIA_OK);
    const controlli = M.controlli(d);
    const bassa = campi.some(c => M.affidabilita(d, c) < M.SOGLIA_BASSA) || controlli.some(c => c.grave);
    const n = campi.length + controlli.length;
    return { campi: campi, controlli: controlli, n: n, livello: bassa ? 'bassa' : n ? 'da_controllare' : 'affidabile' };
  };
  M.proposta = function (doc) {
    if (doc.tipo === 'bollettino') {
      const gia = M.bollettinoDi(doc.fornitore_id, doc.anno, doc.mese);
      return { esito: gia ? 'doppio' : 'bollettino', candidati: [], importo: M.importoLetto(doc), esistente: gia };
    }
    const ab = M.abbinamentoPerCodice(doc.fornitore_id, doc.codice_cliente);
    if (doc.tipo === 'ordine') {
      const gia = M.S.pratiche.find(p => p.numero === doc.numero);
      return { abbinamento: ab, candidati: [], esito: gia ? 'doppio' : ab ? 'nuova' : 'nessuno', importo: M.importoDoc(doc), esistente: gia };
    }
    const imp = M.importoDoc(doc);
    const codiciDoc = doc.righe.map(r => r.codice);
    let pool = M.S.pratiche.filter(p => p.fornitore_id === doc.fornitore_id && (!ab || p.cliente_piva === ab.cliente_piva));
    pool = pool.filter(p => doc.tipo === 'conferma' ? !M.doc(p, 'conferma') && !M.fiscali(p).length
      : doc.tipo === 'fattura' ? !M.fiscali(p).some(d => d.numero === doc.numero) : true);
    const candidati = pool.map(p => {
      const rif = M.doc(p, 'conferma') || M.doc(p, 'ordine');
      const comuni = rif.righe.filter(r => codiciDoc.indexOf(r.codice) >= 0).length;
      const quota = comuni / Math.max(codiciDoc.length, rif.righe.length);
      const motivi = [];
      if (ab) motivi.push('codice cliente ' + ab.codice + ' = ' + M.nomeCliente(ab.cliente_piva));
      motivi.push(comuni + ' articoli su ' + codiciDoc.length + ' in comune');
      const giaFatt = M.fiscali(p).some(d => d.tipo === 'fattura');
      if (giaFatt) motivi.push('pratica già fatturata');
      return { pratica: p, punteggio: quota - (giaFatt ? 0.5 : 0), motivi: motivi, delta: M.r2(imp - M.importoDoc(rif)) };
    }).sort((x, y) => y.punteggio - x.punteggio);
    // nota di credito con riferimento alla fattura stornata: la pratica di quella fattura è certa
    if (doc.riferimento) {
      const k = candidati.findIndex(c => M.fiscali(c.pratica).some(d => d.numero === doc.riferimento));
      if (k >= 0) {
        const c = candidati.splice(k, 1)[0];
        c.motivi.unshift('storna la fattura ' + doc.riferimento + ' di questa pratica');
        candidati.unshift(c);
        return { abbinamento: ab, candidati: candidati, esito: 'certo', importo: imp };
      }
    }
    let esito = 'nessuno';
    if (candidati.length && !ab) esito = candidati[0].punteggio > 0 ? 'probabile' : 'nessuno';
    else if (candidati.length === 1) esito = 'certo';
    else if (candidati.length > 1) esito = candidati[0].punteggio - candidati[1].punteggio >= 0.5 ? 'probabile' : 'ambiguo';
    return { abbinamento: ab, candidati: candidati, esito: esito, importo: imp };
  };
  M.abbina = function (docId, praticaId) {
    const i = M.S.in_arrivo.findIndex(d => d.id === docId);
    const doc = M.S.in_arrivo[i];
    const p = M.pratica(praticaId);
    const prima = M.statoPratica(p).etichetta;
    p.documenti.push(Object.assign({ id: doc.id, tipo: doc.tipo, numero: doc.numero, data: doc.data, file: doc.file, righe: doc.righe }, doc.riferimento ? { riferimento: doc.riferimento, nota: doc.nota } : {}));
    M.S.in_arrivo.splice(i, 1);
    const dopo = M.statoPratica(p).etichetta;
    M.annota(M.TIPI[doc.tipo] + ' ' + doc.numero + ' abbinata a ' + p.numero + (prima !== dopo ? ' · ' + prima.toLowerCase() + ' → ' + dopo.toLowerCase() : ''));
    return { pratica: p, prima: prima, dopo: dopo };
  };
  M.scarta = function (docId) {
    const i = M.S.in_arrivo.findIndex(d => d.id === docId);
    const d = M.S.in_arrivo.splice(i, 1)[0];
    M.annota(M.TIPI[d.tipo] + ' ' + d.numero + ' scartata');
  };
  M.TIPI = { ordine: 'Ordine', conferma: 'Conferma', fattura: 'Fattura', nota_credito: 'Nota di credito', bollettino: 'Bollettino' };

  /* Apre una nuova pratica da un ordine caricato. */
  M.apriPratica = function (docId) {
    const i = M.S.in_arrivo.findIndex(d => d.id === docId);
    const doc = M.S.in_arrivo[i];
    const ab = M.abbinamentoPerCodice(doc.fornitore_id, doc.codice_cliente);
    const p = { id: Math.max.apply(null, M.S.pratiche.map(x => x.id)) + 1, numero: doc.numero, fornitore_id: doc.fornitore_id, cliente_piva: ab.cliente_piva, data: doc.data,
      documenti: [{ id: doc.id, tipo: 'ordine', numero: doc.numero, data: doc.data, file: doc.file, righe: doc.righe }] };
    M.S.pratiche.push(p);
    M.S.in_arrivo.splice(i, 1);
    M.annota('Aperta la pratica ' + p.numero + ' · ' + M.nomeCliente(p.cliente_piva) + ' · ' + M.fornitore(p.fornitore_id).breve);
    return p;
  };
  /* Registra un bollettino caricato: poi si verifica a cerniera. */
  M.registraBollettino = function (docId) {
    const i = M.S.in_arrivo.findIndex(d => d.id === docId);
    const doc = M.S.in_arrivo[i];
    const b = { id: Math.max.apply(null, M.S.bollettini.map(x => x.id)) + 1, fornitore_id: doc.fornitore_id, anno: doc.anno, mese: doc.mese, ricevuto: doc.ricevuto,
      stato: 'da_verificare', file: doc.file, decisioni: {}, righe: doc.righe };
    M.S.bollettini.push(b);
    M.S.in_arrivo.splice(i, 1);
    M.annota('Registrato il bollettino di ' + M.meseMin(b.mese) + ' di ' + M.fornitore(b.fornitore_id).breve);
    return b;
  };

  /* Caricamento di un file: nel prototipo la lettura automatica è simulata con documenti di esempio.
     preferenza: tipo da proporre per primo (es. 'bollettino' dalla pagina Bollettini). */
  M.leggiDocumento = function (nome, preferenza) {
    const giaLetto = n => M.S.in_arrivo.some(d => d.numero === n);
    const esempi = [];
    const p3 = M.pratica(3);
    if (p3 && !M.fiscali(p3).length && !giaLetto('F-2026-0951')) esempi.push(() => ({ tipo: 'fattura', fornitore_id: 1, numero: 'F-2026-0951', data: M.oggi(), codice_cliente: 'K-10915', righe: clona(M.doc(p3, 'conferma').righe) }));
    if (!M.S.pratiche.some(p => p.numero === 'OF/2026/052') && !giaLetto('OF/2026/052')) esempi.push(() => ({ tipo: 'ordine', fornitore_id: 3, numero: 'OF/2026/052', data: M.oggi(), codice_cliente: 'IN-3150', lettura: { campi: { 'righe.5.qta': 0.74 } },
      righe: [
        { codice: 'XMAS-LED', descrizione: 'Addobbo luminoso a LED, 100 pz', qta: 60, prezzo: 18.50 },
        { codice: 'XMAS-STL', descrizione: 'Stella luminosa da esterno', qta: 40, prezzo: 32.00 },
        { codice: 'XMAS-CA38', descrizione: 'Candele LED, conf. 6', qta: 48, prezzo: 11.90 },
        { codice: 'XMAS-NA103', descrizione: 'Nastro decorativo 10 m', qta: 200, prezzo: 3.50 },
        { codice: 'XMAS-RE404', descrizione: 'Renna luminosa da esterno 40 cm', qta: 15, prezzo: 40.00 },
        { codice: 'XMAS-FL107', descrizione: 'Filo luminoso LED 10 m', qta: 100, prezzo: 14.00 },
        { codice: 'XMAS-AL2105', descrizione: 'Albero artificiale 210 cm', qta: 8, prezzo: 103.50 },
        { codice: 'XMAS-NA258', descrizione: 'Nastro decorativo 25 m', qta: 200, prezzo: 5.75 },
        { codice: 'XMAS-PU99', descrizione: 'Puntale in vetro soffiato', qta: 150, prezzo: 7.50 },
        { codice: 'XMAS-PV607', descrizione: 'Palline in vetro Ø 60 mm, conf. 12', qta: 60, prezzo: 10.80 },
        { codice: 'XMAS-FL204', descrizione: 'Filo luminoso LED 20 m', qta: 60, prezzo: 23.00 },
        { codice: 'XMAS-PV804', descrizione: 'Palline in vetro Ø 80 mm, conf. 12', qta: 36, prezzo: 12.40 },
        { codice: 'XMAS-PV1007', descrizione: 'Palline in vetro Ø 100 mm, conf. 12', qta: 100, prezzo: 14.00 },
        { codice: 'XMAS-RE901', descrizione: 'Renna luminosa da esterno 90 cm', qta: 20, prezzo: 65.00 },
        { codice: 'XMAS-AL1808', descrizione: 'Albero artificiale 180 cm', qta: 15, prezzo: 93.00 },
        { codice: 'XMAS-AL1501', descrizione: 'Albero artificiale 150 cm', qta: 12, prezzo: 82.50 },
        { codice: 'XMAS-AL1205', descrizione: 'Albero artificiale 120 cm', qta: 20, prezzo: 72.00 },
        { codice: 'XMAS-FL57', descrizione: 'Filo luminoso LED 5 m', qta: 80, prezzo: 14.08 } ] }));
    if (!M.bollettinoDi(2, 2026, 6) && !M.S.in_arrivo.some(d => d.tipo === 'bollettino' && d.fornitore_id === 2 && d.mese === 6)) esempi.push(() => ({ tipo: 'bollettino', fornitore_id: 2, numero: 'giugno 2026', anno: 2026, mese: 6, lettura: { campi: { 'righe.0.importo': 0.88 } },
      righe: M.fiscaliDelMese(2, 2026, 6).map(x => { const pc = M.percentuali(x.pratica, x.doc.data); const imp = M.importoDoc(x.doc); return { numero: x.doc.numero, data: x.doc.data, imponibile: imp, pct: pc.dal_fornitore, importo: M.r2(imp * pc.dal_fornitore / 100) }; }) }));
    if (!esempi.length) return null;
    const scelto = esempi.map(f => f()).sort((a, b) => (b.tipo === preferenza) - (a.tipo === preferenza))[0];
    const d = Object.assign({ id: Date.now() + Math.floor(Math.random() * 1000), ricevuto: M.oggi(), file: nome }, scelto);
    M.S.in_arrivo.unshift(d);
    M.annota('Caricato ' + nome + ': letto ' + M.TIPI[d.tipo].toLowerCase() + ' ' + d.numero + ' di ' + M.fornitore(d.fornitore_id).breve);
    return d;
  };

  /* ---------- Prossime scadenze (pagina Oggi): cosa arriva nei prossimi giorni ---------- */
  M.scadenze = function (giorni) {
    const oggi = M.oggi(), fino = M.piuGiorni(oggi, giorni || 15), out = [];
    M.S.pratiche.forEach(p => {
      const s = M.statoPratica(p);
      if (s.chiave === 'attesa' && s.scadenza <= fino) out.push({ data: s.scadenza, testo: 'Conferma attesa di ' + p.numero, dettaglio: M.fornitore(p.fornitore_id).breve + ' · ' + M.nomeCliente(p.cliente_piva), link: '#/pratiche/' + p.id });
    });
    // bollettino del mese scorso: atteso entro il 10 del mese
    const a = Number(oggi.slice(0, 4)), m = Number(oggi.slice(5, 7)), am = m === 1 ? a - 1 : a, mm = m === 1 ? 12 : m - 1;
    const entro = oggi.slice(0, 8) + '10';
    M.S.fornitori.forEach(f => {
      const c = M.casellaBollettino(f.id, am, mm);
      if (c.tipo === 'mancante' && entro >= oggi) out.push({ data: entro, testo: 'Bollettino di ' + M.meseMin(mm) + ' di ' + f.breve, dettaglio: c.documenti + (c.documenti === 1 ? ' documento atteso' : ' documenti attesi'), link: '#/bollettini' });
    });
    const t = M.trimestre(oggi), lim = M.limiti(a, t);
    if (lim.a <= M.piuGiorni(oggi, 31)) out.push({ data: lim.a, testo: 'Fine del ' + t + '° trimestre', dettaglio: 'poi si chiude la liquidazione ai subagenti', link: '#/liquidazioni/' + a + '/' + t });
    return out.sort((x, y) => x.data.localeCompare(y.data));
  };

  /* ---------- Da fare (pagina Oggi) ---------- */
  M.daFare = function () {
    const out = [];
    M.S.in_arrivo.forEach(d => {
      const pr = M.proposta(d);
      const f = M.fornitore(d.fornitore_id).breve;
      const liv = M.statoLettura(d).livello;
      // pronto: abbinamento sicuro e lettura affidabile; altrimenti serve una decisione dell'operatore
      const base = { gruppo: 'documenti', doc: d.id, fornitore_id: d.fornitore_id, lettura: liv,
        stato: pr.esito === 'doppio' || pr.esito === 'nessuno' || pr.esito === 'ambiguo' || pr.esito === 'probabile' ? 'scegliere' : liv !== 'affidabile' ? 'controllare' : 'pronto' };
      const push = x => out.push(Object.assign(x, base));
      if (d.tipo === 'bollettino' && pr.esito === 'doppio') return push({ peso: 3, tipo: 'documento', esito: 'doppio', titolo: 'Controlla il bollettino di ' + M.meseMin(d.mese) + ' di ' + f + ': è già registrato',
        dettaglio: f + ' · rettifica o doppione da scartare', link: '#/documenti/' + d.id, azione: 'Apri' });
      if (d.tipo === 'bollettino') return push({ peso: 2, tipo: 'documento', titolo: 'Registra il bollettino di ' + M.meseMin(d.mese) + ' di ' + f,
        dettaglio: f + ' · ' + d.righe.length + (d.righe.length === 1 ? ' riga letta' : ' righe lette'), link: '#/documenti/' + d.id, azione: 'Apri' });
      if (d.tipo === 'ordine') return push({ peso: 2, tipo: 'documento', titolo: 'Apri la pratica dell’ordine ' + d.numero,
        dettaglio: f + ' · ' + (pr.abbinamento ? M.nomeCliente(pr.abbinamento.cliente_piva) : 'codice cliente ' + d.codice_cliente + ' non riconosciuto'), link: '#/documenti/' + d.id, azione: 'Apri' });
      push({ peso: pr.esito === 'certo' ? 2 : 3, tipo: 'documento', esito: pr.esito, titolo: 'Abbina ' + M.TIPI[d.tipo].toLowerCase() + ' ' + d.numero,
        dettaglio: M.fornitore(d.fornitore_id).breve + ' · ' + (pr.esito === 'certo' || pr.esito === 'probabile' ? 'proposta: ' + pr.candidati[0].pratica.numero : pr.esito === 'nessuno' ? 'codice cliente ' + d.codice_cliente + ' non riconosciuto' : 'da scegliere fra ' + pr.candidati.length + ' pratiche'),
        link: '#/documenti/' + d.id, azione: 'Abbina' });
    });
    M.S.pratiche.forEach(p => {
      const s = M.statoPratica(p);
      if (s.chiave === 'scaduta') out.push({ peso: 1, tipo: 'ritardo', gruppo: 'conferme', pratica: p.id, fornitore_id: p.fornitore_id, giorni: M.giorni(s.scadenza, M.oggi()),
        titolo: 'Sollecita la conferma di ' + p.numero,
        dettaglio: M.fornitore(p.fornitore_id).breve + ' · ' + M.nomeCliente(p.cliente_piva) + ' · in ritardo ' + s.nota, link: '#/pratiche/' + p.id, azione: 'Apri' });
    });
    const anni = [2026];
    M.S.fornitori.forEach(f => anni.forEach(a => { for (let m = 1; m <= 12; m++) {
      const c = M.casellaBollettino(f.id, a, m);
      if (c.tipo === 'da_verificare') out.push({ peso: 2, tipo: 'bollettino', gruppo: 'bollettini', fornitore_id: f.id, titolo: 'Verifica il bollettino di ' + M.meseMin(m) + ' di ' + f.breve,
        dettaglio: c.aperte + (c.aperte === 1 ? ' riga non quadra' : ' righe non quadrano'), link: '#/bollettini/' + c.b.id, azione: 'Verifica' });
      if (c.tipo === 'pronto') out.push({ peso: 3, tipo: 'bollettino', gruppo: 'bollettini', fornitore_id: f.id, titolo: 'Chiudi il bollettino di ' + M.meseMin(m) + ' di ' + f.breve,
        dettaglio: 'tutte le righe quadrano', link: '#/bollettini/' + c.b.id, azione: 'Chiudi' });
      if (c.tipo === 'mancante') out.push({ peso: 2, tipo: 'mancante', gruppo: 'bollettini', fornitore_id: f.id, titolo: 'Sollecita il bollettino di ' + M.meseMin(m) + ' di ' + f.breve,
        dettaglio: c.documenti + (c.documenti === 1 ? ' documento atteso' : ' documenti attesi'), link: '#/bollettini', azione: 'Vedi' });
    } }));
    return out.sort((a, b) => a.peso - b.peso);
  };
})();
