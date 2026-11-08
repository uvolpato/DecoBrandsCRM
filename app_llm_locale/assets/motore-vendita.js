/* ============================================================
   Decobrands — Prototipo alternativo — motore della vendita diretta
   (dalla Gestione Ordini, spec §7.18–§7.21)
   - Articoli e giacenze arrivano da Integra con la sincronizzazione delle viste (§4.1):
     nel CRM sono in sola lettura.
   - Alias (codice vecchio → nuovo) e kit (articolo → componenti) sono tabelle del CRM.
   - L'esportazione di un ordine verso Integra applica alias e kit, crea i file OC/OF e
     IMPEGNA le quantità: la disponibilità = giacenza di Integra − impegni ancora aperti.
     Quando la sincronizzazione vede l'ordine registrato in Integra, l'impegno si chiude.
   ============================================================ */
(function () {
  'use strict';
  const M = window.M;
  const U = c => String(c || '').trim().toUpperCase();

  M.articoloAnag = cod => M.S.articoli.find(a => U(a.codice) === U(cod)) || null;
  M.giacenzaIntegra = cod => { const g = M.S.giacenze.find(x => U(x.codice) === U(cod)); return g ? g.qta : null; };
  M.impegnato = cod => M.r2(M.S.impegni.filter(i => i.stato === 'impegnato' && U(i.codice) === U(cod)).reduce((s, i) => s + i.qta, 0));
  /* Disponibile = giacenza di Integra − impegni aperti; null se l'articolo non è nelle giacenze. */
  M.disponibile = cod => { const g = M.giacenzaIntegra(cod); const imp = M.impegnato(cod); return g == null && !imp ? null : M.r2((g || 0) - imp); };
  M.aliasDi = cod => M.S.alias.find(a => U(a.vecchio) === U(cod)) || null;
  M.kitDi = cod => M.S.kit.find(k => k.attivo && U(k.codice) === U(cod) && k.componenti.length) || null;
  M.ordineCliente = id => M.S.ordini_cliente.find(o => o.id === Number(id));
  M.totaleOrdineCliente = o => M.r2(o.righe.reduce((s, r) => s + (Number(r.qta) || 0) * (Number(r.prezzo) || 0), 0));

  /* Proposte per l'esportazione (come la Gestione Ordini):
     alias — A: disponibile vecchio ≥ ordinato → tutto sul vecchio (nessun cambio)
             B: 0 < disponibile vecchio < ordinato → divide: disponibile sul vecchio, resto sul nuovo
             C: disponibile vecchio ≤ 0 o assente → tutto sul nuovo
     kit   — articolo con disponibile 0 o assente e kit attivo → sostituito dai componenti × quantità */
  M.proposteEsportazione = function (o) {
    const alias = [], kit = [];
    o.righe.forEach(r => {
      const a = M.aliasDi(r.codice);
      if (a) {
        const q = Number(r.qta) || 0, dv = M.disponibile(a.vecchio), gv = dv == null ? 0 : dv;
        let qv, qn, caso;
        if (gv >= q && gv > 0) { qv = q; qn = 0; caso = 'A'; }
        else if (gv > 0) { qv = gv; qn = M.r2(q - gv); caso = 'B'; }
        else { qv = 0; qn = q; caso = 'C'; }
        alias.push({ n: r.n, vecchio: a.vecchio, nuovo: a.nuovo, descrizione: a.descrizione || r.descrizione, qta: q, disp_vecchio: dv, disp_nuovo: M.disponibile(a.nuovo),
          qta_vecchio: qv, qta_nuovo: qn, caso: caso, applica: caso !== 'A', conferma: a.conferma });
      }
      const d = M.disponibile(r.codice), k = M.kitDi(r.codice);
      if (k && (d == null || d <= 0) && !a) kit.push({ n: r.n, codice: k.codice, descrizione: k.descrizione, qta: Number(r.qta) || 0, disponibile: d,
        componenti: k.componenti.map(c => ({ codice: c.codice, qta_comp: c.qta, qta_tot: M.r2((Number(r.qta) || 0) * c.qta), disponibile: M.disponibile(c.codice) })), applica: true });
    });
    return { alias: alias, kit: kit };
  };

  /* Righe finali dopo le decisioni dell'operatore (stesse regole della Gestione Ordini). */
  M.righeFinali = function (o, prop) {
    const out = [];
    o.righe.forEach(r => {
      const a = prop.alias.find(x => x.n === r.n), k = prop.kit.find(x => x.n === r.n);
      if (a && a.applica) {
        if (a.qta_vecchio > 0) out.push(Object.assign({}, r, { codice: a.vecchio, qta: a.qta_vecchio, nota: 'alias ' + a.vecchio + ' → ' + a.nuovo + ' (vecchio)' }));
        if (a.qta_nuovo > 0) out.push(Object.assign({}, r, { codice: a.nuovo, qta: a.qta_nuovo, nota: 'alias ' + a.vecchio + ' → ' + a.nuovo + ' (nuovo)' }));
      } else if (k && k.applica) {
        k.componenti.forEach(c => out.push(Object.assign({}, r, { codice: c.codice, descrizione: (M.articoloAnag(c.codice) || {}).descrizione || '', qta: c.qta_tot, prezzo: null, nota: 'componente del kit ' + k.codice })));
      } else out.push(Object.assign({}, r));
    });
    return out;
  };

  /* Controlli prima di generare i file (§7.18): bloccanti. */
  M.controlliEsportazione = function (o, finali) {
    const err = [], cl = M.cliente(o.cliente_piva);
    if (!o.data) err.push('Data dell’ordine mancante');
    if (!cl || !cl.codice_integra) err.push('Codice cliente Integra non trovato: la P.IVA ' + (o.cliente_piva || '—') + ' non è fra i clienti sincronizzati');
    if (!finali.length) err.push('Nessuna riga da esportare');
    finali.forEach(r => {
      if (!r.codice) err.push('Riga ' + r.n + ': codice articolo mancante');
      if (r.qta == null || r.qta === '' || !(Number(r.qta) > 0)) err.push('Riga ' + r.n + ': quantità mancante');
    });
    return err;
  };
  /* Avvisi non bloccanti: articoli non in anagrafica, disponibilità insufficiente. */
  M.avvisiEsportazione = function (finali) {
    const av = [];
    finali.forEach(r => {
      if (!r.codice) return;
      if (!M.articoloAnag(r.codice)) av.push('Riga ' + r.n + ': ' + r.codice + ' non è fra gli articoli di Integra');
      const d = M.disponibile(r.codice);
      if (d != null && d < r.qta) av.push('Riga ' + r.n + ': ' + r.codice + ' disponibile ' + M.num(d) + ', esportati ' + M.num(r.qta));
    });
    return av;
  };

  /* Nome file come la Gestione Ordini: aaaammgg_codiceIntegra_progressivo_TIPO.xlsx */
  M.nomiFileIntegra = function (o, tipi) {
    const cl = M.cliente(o.cliente_piva), ci = String((cl && cl.codice_integra) || 'NOCOD').replace(/[^\w]/g, '');
    const prog = M.S.ordini_cliente.filter(x => x !== o && x.esportato && x.esportato.quando.slice(0, 10) === M.oggi() && M.cliente(x.cliente_piva) && M.cliente(x.cliente_piva).codice_integra === ci).length + 1;
    const base = o.data.replace(/-/g, '') + '_' + ci + '_' + String(prog).padStart(3, '0');
    return tipi.map(t => base + '_' + t + '.xlsx');
  };

  /* Registra l'esportazione: impegna le quantità (solo alla prima esportazione dell'ordine). */
  M.registraEsportazione = function (o, finali, file) {
    const ora = M.oggi() + 'T' + new Date().toTimeString().slice(0, 8);
    if (!o.esportato) finali.forEach(r => { if (r.codice && Number(r.qta) > 0) M.S.impegni.unshift({ quando: ora, codice: r.codice, qta: Number(r.qta), ordine: o.numero, stato: 'impegnato', nota: r.nota || null }); });
    o.esportato = { quando: ora, da: M.utente().nome, file: file };
    M.annota('Ordine ' + o.numero + ' esportato per Integra (' + file.join(', ') + ')');
  };
  /* Annulla: l'ordine torna "da esportare" e gli impegni ancora aperti si rilasciano. */
  M.annullaEsportazione = function (o) {
    const aperti = M.S.impegni.filter(i => i.ordine === o.numero && i.stato === 'impegnato');
    aperti.forEach(i => { i.stato = 'rilasciato'; i.rilasciato = M.oggi() + 'T' + new Date().toTimeString().slice(0, 8); });
    o.esportato = null;
    M.annota('Esportazione dell’ordine ' + o.numero + ' annullata · ' + aperti.length + ' impegni rilasciati');
    return aperti.length;
  };
  /* Nel prototipo: simula la sincronizzazione che vede l'ordine registrato in Integra. */
  M.simulaRegistrazioneIntegra = function (o) {
    const ora = M.oggi() + 'T' + new Date().toTimeString().slice(0, 8);
    M.S.impegni.filter(i => i.ordine === o.numero && i.stato === 'impegnato').forEach(i => {
      const g = M.S.giacenze.find(x => U(x.codice) === U(i.codice));
      if (g) g.qta = M.r2(g.qta - i.qta); else M.S.giacenze.push({ codice: i.codice, qta: -i.qta });
      i.stato = 'registrato'; i.registrato = ora;
    });
    M.S.sincronizzato = ora;
    M.annota('Sincronizzazione: ordine ' + o.numero + ' registrato in Integra, giacenze aggiornate');
  };
})();
