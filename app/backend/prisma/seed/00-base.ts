// Dati di prova del prototipo (spec §12, piano F0-A2) con la forma dello schema attuale.
// Fonte: prisma/seed/dati-prova.json, estratto da prototipo-alternativo/assets/dati.js ("oggi" 04/09/2026).
// Si scrive solo quello che è un dato: totali, provvigioni e stati derivati li calcola il motore (V12, D-28).
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Prisma } from '@prisma/client';
import { cifra } from '../../src/password';
import { logEvent } from '../../src/registro';
import { caricaDati } from '../../src/motore/dati';
import { fotografiaLiquidazione, righeLiquidazione } from '../../src/motore/motore';
import { aggiornaPratica } from '../../src/pratiche';

type Tx = Prisma.TransactionClient;
/* eslint-disable @typescript-eslint/no-explicit-any */
const D: any = JSON.parse(readFileSync(join(__dirname, 'dati-prova.json'), 'utf8'));

export const PASSWORD_PROVA = 'Prova-Decobrands-2026'; // fissa, solo per i dati di prova; si cambia al primo accesso
const data = (s: string) => new Date(s + 'T00:00:00Z');
const ora = (s: string) => new Date(s + (s.length <= 16 ? ':00' : '') + '+02:00');
const r2 = (n: number) => Math.round(n * 100) / 100;
// D-182 §19, D-202 §19: lo scaglione si sceglie dallo sconto medio (1 − netto/lordo). Il seed mette su
// ogni riga uno sconto di riga uguale allo sconto dell'agenzia (abbinamenti.sconto), così lo sconto medio
// cade nello stesso scaglione di prima e i numeri restano quelli del prototipo. Il netto non cambia: il
// prezzo resta il netto, il lordo (prezzo_unitario) si ricava da esso. Lo sconto medio (2 decimali) cade
// esattamente sulla soglia «da» dell'agenzia (0, 1, 5, 10…): sia «prima soglia ≥» (D-182) sia «ultima
// soglia ≤» (D-202) scelgono la soglia giusta.
const r4 = (n: number) => Math.floor(n * 10000) / 10000;
const importoRiga = (r: any[]) => r2(r[2] * r[3]); // r = [codice, descrizione, qta, prezzo] (netto)
const importoDoc = (d: any) => r2(d.righe.reduce((s: number, r: any[]) => s + importoRiga(r), 0));
const prezzoLordo = (prezzo: number, sconto: number) => (sconto ? r4(prezzo / (1 - sconto / 100)) : prezzo);
const nomeCognome = (n: string) => { const i = n.indexOf(' '); return [n.slice(0, i), n.slice(i + 1)]; };

export async function base(tx: Tx) {
  const ids = { fornitori: {} as Record<number, bigint>, versioniF: {} as Record<number, bigint>,
    clienti: {} as Record<string, bigint>, versioniC: {} as Record<string, bigint>,
    scaglioni: {} as Record<number, bigint>, subagenti: {} as Record<number, bigint>, utenti: {} as Record<string, bigint> };

  // ---------- Anagrafica unica a soggetti (D-100…D-102, specifica-anagrafica-soggetti.md) ----------
  // Un soggetto per ogni ruolo del seed; stessi dati fiscali = stesso soggetto (§7.2). MCL è cliente
  // e fornitore sullo stesso soggetto con due codici di ruolo diversi (D-101).
  const normalizza = (v: string) => v.replace(/[\s.]/g, '').toUpperCase();
  const normPiva = (v: string) => { const s = normalizza(v); return /^IT\d{11}$/.test(s) ? s.slice(2) : s; };
  const paeseDi = (pn: string) => (/^[A-Z]{2}/.test(pn) ? pn.slice(0, 2) : 'IT');
  const soggettoPer = new Map<string, bigint>();
  async function nuovoSoggetto(natura: string, piva: string, cf: string, sorgente = 'integra', note: string | null = null) {
    const pn = normPiva(piva), cn = normalizza(cf);
    const chiave = pn ? `p:${pn}` : `c:${cn}`;
    const gia = soggettoPer.get(chiave);
    if (gia) return gia;
    const s = await tx.soggetti.create({ data: {
      natura, paese: paeseDi(pn), piva: piva || null, piva_norm: pn, codice_fiscale: cf || null, cf_norm: cn, sorgente, note } });
    soggettoPer.set(chiave, s.id);
    return s.id;
  }
  // Il CF dei subagenti sta solo nel master: la tabella `subagenti` non ha la colonna (§5.3)
  const CF_SUBAGENTI: Record<number, string> = {
    1: 'BSTSFN72M05H501X', 2: 'NSTMRC70A01F205Z', 3: 'RVLLSE75B45F205X', 4: 'PNTGGR68C10F205W',
  };

  // ---------- Utenti (§4.2.18, D-45): se il nome utente c'è già si salta ----------
  const hash = await cifra(PASSWORD_PROVA);
  for (const u of D.utenti.filter((x: any) => x.ruolo !== 'superutente')) { // il superutente nasce con `npm run superutente`
    let riga = await tx.utenti.findUnique({ where: { username: u.username } });
    if (!riga) {
      riga = await tx.utenti.create({ data: {
        username: u.username, email: u.email, nome: u.nome, ruolo: u.ruolo, attivo: u.attivo, sistema: !!u.sistema,
        password_hash: u.sistema ? null : hash, deve_cambiare_password: !u.sistema,
        ultimo_accesso: u.ultimo_accesso ? ora(u.ultimo_accesso) : null, ultimo_invio: u.ultimo_invio ?? undefined,
        aree: { create: Object.entries(u.aree).map(([area, livello]) => ({ area: area === 'anagrafiche' ? 'dati' : area, livello: livello as string })) }, // D-47
      } });
    }
    ids.utenti[u.username] = riga.id;
  }
  const ugo = ids.utenti['ugo'], matteo = ids.utenti['matteo'];

  // ---------- Fornitori e clienti: identità + prima versione + codice Integra (D-46, §4.6) ----------
  const sincronizzato = ora('2026-09-04T09:59:40');
  for (const f of D.fornitori) {
    const id = (await tx.fornitori.create({ data: {
      giorni_attesa_conferma: f.giorni_conferma, giorno_bollettino: f.giorno_bollettino, giorni_incasso: f.giorni_incasso,
      tipo_provvigione: f.maturazione === 'maturato' ? 'maturato' : 'fatturato', attivo: f.attivo, sincronizzato_il: sincronizzato } })).id; // D-34
    const v = await tx.fornitori_versioni.create({ data: { fornitore_id: id, fonte: 'integra', piva: f.piva, ragione_sociale: f.nome, paese: f.paese, valido_dal: data('2025-01-01') } });
    const soggetto_id = await nuovoSoggetto('azienda', f.piva, '');
    await tx.fornitori.update({ where: { id }, data: { versione_corrente_id: v.id, soggetto_id } });
    await tx.codici_esterni.create({ data: { sistema: 'integra', tipo: 'fornitore', codice: f.codice_integra, entita_id: id } });
    ids.fornitori[f.id] = id; ids.versioniF[f.id] = v.id;
  }
  for (const c of D.clienti) {
    const id = (await tx.clienti.create({ data: { attivo: true, sincronizzato_il: sincronizzato } })).id;
    const v = await tx.clienti_versioni.create({ data: { cliente_id: id, fonte: 'integra', piva: c.piva, ragione_sociale: c.nome, indirizzo: c.indirizzo, citta: c.citta, valido_dal: data('2025-01-01') } });
    const soggetto_id = await nuovoSoggetto('azienda', c.piva, '');
    await tx.clienti.update({ where: { id }, data: { versione_corrente_id: v.id, soggetto_id } });
    await tx.codici_esterni.create({ data: { sistema: 'integra', tipo: 'cliente', codice: c.codice_integra, entita_id: id } });
    ids.clienti[c.piva] = id; ids.versioniC[c.piva] = v.id;
  }

  // ---------- Percentuali, agente, subagenti, interscambio ----------
  for (const s of D.scaglioni) {
    ids.scaglioni[s.id] = (await tx.provvigioni_scaglioni.create({ data: {
      fornitore_id: ids.fornitori[s.fornitore_id], sconto_min: s.sconto, pct_agente: s.pct_agente, pct_subagente: s.pct_sub, valido_dal: data(s.valido_dal) } })).id;
  }
  const agente = await tx.agenti.create({ data: { codice: 'DECO', nome: 'Decobrands', cognome: 'SRL' } });
  for (const s of D.subagenti) {
    const [nome, cognome] = nomeCognome(s.nome);
    const soggetto_id = await nuovoSoggetto('persona', '', CF_SUBAGENTI[s.id] ?? '');
    ids.subagenti[s.id] = (await tx.subagenti.create({ data: { agente_id: agente.id, codice: 'SUB' + String(s.id).padStart(2, '0'), nome, cognome, email: s.email, attivo: s.attivo, soggetto_id } })).id;
  }
  for (const e of D.eccezioni) {
    // il prototipo lega l'eccezione allo scaglione: fornitore, sconto e data vengono da lì (D-51)
    const sc = D.scaglioni.find((x: any) => x.id === e.scaglione_id);
    await tx.provvigioni_eccezioni.create({ data: {
      fornitore_id: ids.fornitori[sc.fornitore_id], subagente_id: ids.subagenti[e.subagente_id], sconto_min: sc.sconto, pct_personale: e.pct_sub, valido_dal: data(sc.valido_dal) } });
  }
  for (const a of D.abbinamenti) {
    // il prototipo non ha date: il subagente segue il cliente dall'inizio dei dati (D-35)
    await tx.interscambio.create({ data: {
      subagente_id: ids.subagenti[a.subagente_id], cliente_id: ids.clienti[a.cliente_piva], fornitore_id: ids.fornitori[a.fornitore_id],
      codice_cliente_fornitore: a.codice || null, sconto: a.sconto, valido_dal: data('2025-01-01') } });
  }

  // ---------- Casi dell'anagrafica a soggetti (§12, dati-soggetti.js) ----------
  // MCL: cliente e fornitore sullo stesso soggetto, due codici di ruolo (D-101). Entra nello strato 0
  // come entrerebbe da Integra; la stessa P.IVA non fa due soggetti.
  const mclFornitore = await tx.fornitori.create({ data: {
    giorni_attesa_conferma: 21, giorno_bollettino: 10, giorni_incasso: 60, tipo_provvigione: 'fatturato', attivo: true, sincronizzato_il: sincronizzato } });
  const mclFv = await tx.fornitori_versioni.create({ data: { fornitore_id: mclFornitore.id, fonte: 'integra', piva: 'IT08943010155', ragione_sociale: 'MCL SRL', paese: 'Italia', valido_dal: data('2025-01-01') } });
  await tx.fornitori.update({ where: { id: mclFornitore.id }, data: { versione_corrente_id: mclFv.id } });
  await tx.codici_esterni.create({ data: { sistema: 'integra', tipo: 'fornitore', codice: 'F90012', entita_id: mclFornitore.id } });
  const mclCliente = await tx.clienti.create({ data: { attivo: true, sincronizzato_il: sincronizzato } });
  const mclCv = await tx.clienti_versioni.create({ data: { cliente_id: mclCliente.id, fonte: 'integra', piva: '08943010155', ragione_sociale: 'MCL SRL', indirizzo: 'Via Emilia 200', citta: 'Piacenza', valido_dal: data('2025-01-01') } });
  await tx.clienti.update({ where: { id: mclCliente.id }, data: { versione_corrente_id: mclCv.id } });
  await tx.codici_esterni.create({ data: { sistema: 'integra', tipo: 'cliente', codice: 'C02477', entita_id: mclCliente.id } });
  // Consorzio Agrario: catena del vecchio CRM, un soggetto con N punti vendita
  const consorzio = await tx.clienti.create({ data: { attivo: true, sincronizzato_il: sincronizzato } });
  const consorzioV = await tx.clienti_versioni.create({ data: {
    cliente_id: consorzio.id, fonte: 'integra', piva: '03567890123', ragione_sociale: 'Consorzio Agrario Lombardo',
    indirizzo: 'Via Garibaldi 12', citta: 'Cremona', valido_dal: data('2025-01-01') } });
  await tx.clienti.update({ where: { id: consorzio.id }, data: { versione_corrente_id: consorzioV.id } });
  await tx.codici_esterni.create({ data: { sistema: 'integra', tipo: 'cliente', codice: 'C01104', entita_id: consorzio.id } });

  const mcl = await nuovoSoggetto('azienda', 'IT08943010155', '02238370638', 'integra', 'Cliente e fornitore: due codici di ruolo diversi (D-101).');
  await tx.fornitori.update({ where: { id: mclFornitore.id }, data: { soggetto_id: mcl } });
  await tx.clienti.update({ where: { id: mclCliente.id }, data: { soggetto_id: mcl } });
  const consorzioSoggetto = await nuovoSoggetto('azienda', 'IT03567890123', '', 'vecchio_crm', 'Catena: 34 schede del vecchio CRM fondono in un soggetto con N sedi.');
  await tx.clienti.update({ where: { id: consorzio.id }, data: { soggetto_id: consorzioSoggetto } });

  for (const sede of [
    { soggetto_id: mcl, tipo: 'punto_vendita', insegna: 'MCL Brescello', indirizzo: 'Via Roma 44', cap: '42049', citta: 'Brescello', provincia: 'RE', predefinita: true, valido_dal: '2015-03-01' },
    { soggetto_id: mcl, tipo: 'punto_vendita', insegna: 'MCL Piacenza', indirizzo: 'Via Caorsana 98', cap: '29121', citta: 'Piacenza', provincia: 'PC', predefinita: false, valido_dal: '2019-01-15' },
    { soggetto_id: mcl, tipo: 'punto_vendita', insegna: 'MCL Fornace', indirizzo: 'Strada Provinciale 7', cap: '29014', citta: 'Fornace', provincia: 'PC', predefinita: false, valido_dal: '2023-09-01' },
    { soggetto_id: mcl, tipo: 'fatturazione', insegna: '', indirizzo: 'Via Emilia 200', cap: '29121', citta: 'Piacenza', provincia: 'PC', predefinita: false, valido_dal: '2015-03-01' },
    { soggetto_id: consorzioSoggetto, tipo: 'legale', insegna: '', indirizzo: 'Via Garibaldi 12', cap: '26100', citta: 'Cremona', provincia: 'CR', predefinita: true, valido_dal: '1998-01-01' },
    { soggetto_id: consorzioSoggetto, tipo: 'punto_vendita', insegna: 'Punto vendita Cremona', indirizzo: 'Via Persico 8', cap: '26100', citta: 'Cremona', provincia: 'CR', predefinita: false, valido_dal: '2010-01-01' },
    { soggetto_id: consorzioSoggetto, tipo: 'punto_vendita', insegna: 'Punto vendita Manerbio', indirizzo: 'Via Rovato 31', cap: '25025', citta: 'Manerbio', provincia: 'BS', predefinita: false, valido_dal: '2014-05-01' },
    { soggetto_id: consorzioSoggetto, tipo: 'punto_vendita', insegna: 'Punto vendita Codogno', indirizzo: 'Via Dante 120', cap: '26877', citta: 'Codogno', provincia: 'LO', predefinita: false, valido_dal: '2018-10-01' },
  ]) {
    await tx.sedi.create({ data: { ...sede, valido_dal: data(sede.valido_dal) } });
  }
  for (const recapito of [
    { soggetto_id: mcl, tipo: 'email', valore: 'ordini@mclsrl.it', etichetta: 'ordini', predefinito: true },
    { soggetto_id: mcl, tipo: 'pec', valore: 'mclsrl@pec.im.it', etichetta: '', predefinito: false },
    { soggetto_id: mcl, tipo: 'telefono', valore: '+39 0523 880100', etichetta: '', predefinito: false },
    { soggetto_id: consorzioSoggetto, tipo: 'email', valore: 'acquisti@consorzioagrario.it', etichetta: 'acquisti', predefinito: true },
    { soggetto_id: consorzioSoggetto, tipo: 'telefono', valore: '+39 0372 123456', etichetta: '', predefinito: false },
  ]) {
    await tx.recapiti.create({ data: { ...recapito, valido_dal: data('2015-03-01') } });
  }
  // La stessa persona referente di due aziende: due righe in persone_contatti (§4.4)
  const rinaldi = await tx.persone.create({ data: { nome: 'Paolo', cognome: 'Rinaldi', titolo: 'Direttore acquisti' } });
  for (const soggetto_id of [mcl, consorzioSoggetto]) {
    await tx.persone_contatti.create({ data: { persona_id: rinaldi.id, soggetto_id, ruolo: 'acquisti', referente: true, valido_dal: data('2020-01-01') } });
  }
  await tx.fatturazione.create({ data: { soggetto_id: mcl, codice_destinatario: 'M5E2RC4', regime_fiscale: 'RF01', esigibilita_iva: 'I', attiva: true } });
  await tx.fatturazione.create({ data: { soggetto_id: consorzioSoggetto, attiva: false } });

  // ---------- Pratiche, righe e documenti fiscali ----------
  const fatturaId: Record<string, bigint> = {};
  const praticaDi: Record<string, any> = {}; // numero documento fiscale → pratica (per i bollettini)
  const documentoId: Record<string, bigint> = {}; // numero documento fiscale → id (righe dei bollettini chiusi)
  const note: [bigint, string][] = [];
  for (const p of D.pratiche) {
    const ordine = p.documenti.find((d: any) => d.tipo === 'ordine');
    // D-182: sconto di riga = sconto dell'agenzia (abbinamenti.sconto), così lo sconto medio cade nello stesso scaglione
    const sconto = Number(D.abbinamenti.find((a: any) => a.fornitore_id === p.fornitore_id && a.cliente_piva === p.cliente_piva)?.sconto ?? 0);
    const t = await tx.ordini_fornitore_testata.create({ data: {
      fornitore_id: ids.fornitori[p.fornitore_id], fornitore_versione_id: ids.versioniF[p.fornitore_id],
      cliente_id: ids.clienti[p.cliente_piva], cliente_versione_id: ids.versioniC[p.cliente_piva], agente_id: agente.id,
      numero_ordine: p.numero, data_ordine: data(p.data), importo_merce: importoDoc(ordine) } });
    // D-60: ogni documento (ordine, conferma, fattura, nota) è una riga con le sue righe; importo = somma delle righe
    for (const d of p.documenti) {
      const creato = await tx.ordini_fornitore_documenti.create({ data: {
        testata_id: t.id, tipo: d.tipo, numero: d.numero, data: data(d.data), importo: importoDoc(d), note: d.nota ?? null,
        ...(d.incasso ? { stato_incasso: 'pagata', fonte_incasso: 'manuale', note: d.incasso.nota, pagata_il: data(d.data.slice(0, 8) + '15') } : {}) } }); // data di pagamento: il prototipo ha solo un modello
      if (d.tipo !== 'nota_credito') {
        await tx.ordini_fornitore_righe.createMany({ data: d.righe.map((r: any[], i: number) => ({
          testata_id: t.id, documento_id: creato.id, fase: d.tipo, numero_riga: i + 1, codice: r[0], descrizione: r[1], quantita: r[2], prezzo_unitario: prezzoLordo(r[3], sconto), importo: importoRiga(r) })) });
      }
      if (d.tipo === 'fattura') fatturaId[d.numero] = creato.id;
      if (d.tipo === 'nota_credito') note.push([creato.id, d.riferimento]);
      if (d.tipo === 'fattura' || d.tipo === 'nota_credito') { praticaDi[d.numero] = p; documentoId[d.numero] = creato.id; }
    }
    await aggiornaPratica(tx, t.id); // stato, importo e variazioni dal motore (D-52 §19)
  }
  for (const [id, rif] of note) await tx.ordini_fornitore_documenti.update({ where: { id }, data: { fattura_id: fatturaId[rif] } });

  // ---------- Bollettini (§4.2.9–10): i dati del fornitore; le righe dei bollettini chiusi sono già abbinate al documento (D-34) ----------
  for (const b of D.bollettini) {
    const chiuso = b.stato !== 'da_verificare';
    const t = await tx.bollettini_testata.create({ data: {
      fornitore_id: ids.fornitori[b.fornitore_id], fornitore_versione_id: ids.versioniF[b.fornitore_id], mese: b.mese, anno: b.anno, stato: b.stato,
      creato_il: ora(b.ricevuto + 'T09:00'), chiuso_il: chiuso ? ora(b.ricevuto + 'T12:00') : null, chiuso_da: chiuso ? ugo : null } });
    for (const r of b.righe) {
      const p = praticaDi[r.numero];
      await tx.bollettini_righe.create({ data: {
        testata_id: t.id, fattura_numero: r.numero, fattura_data: data(r.data), importo_merce: r.imponibile, pct_riconosciuta: r.pct,
        importo_riconosciuto: r.importo, tipo_riga: r.tipo ?? 'provvigione', documento_id: chiuso ? documentoId[r.numero] ?? null : null,
        ...(p ? { cliente_id: ids.clienti[p.cliente_piva], cliente_versione_id: ids.versioniC[p.cliente_piva] } : {}) } });
    }
  }
  for (const l of D.liquidazioni_chiuse) {
    await tx.liquidazioni.create({ data: { anno: l.anno, trimestre: l.trimestre, chiusa_il: ora(l.chiusa_il + 'T10:00'), chiusa_da: ugo, totali: {} } });
  }
  // Trimestri chiusi come li chiuderebbe l'app (D-33, D-34), uno dopo l'altro: al momento della chiusura
  // erano chiusi solo i trimestri prima. Fotografia del prospetto pagato calcolata dal motore; documenti,
  // storni e riaccrediti legati alla liquidazione (D-11). Il trimestre chiuso non si ricalcola più (§4.2.19).
  const S = await caricaDati(tx, D.oggi);
  for (const l of S.liquidazioni_chiuse) {
    const prima = { ...S, liquidazioni_chiuse: S.liquidazioni_chiuse.filter((x) => x.anno * 10 + x.trimestre < l.anno * 10 + l.trimestre) };
    const righe = righeLiquidazione(prima, l.anno, l.trimestre);
    const liq = await tx.liquidazioni.update({ where: { id: BigInt(l.id) }, data: { totali: fotografiaLiquidazione(prima, righe) } });
    const documenti = righe.filter((r) => r.liquidabile && !r.voce).map((r) => BigInt(r.documento_id));
    const voci = righe.filter((r) => r.riga_bollettino_id).map((r) => BigInt(r.riga_bollettino_id!));
    await tx.ordini_fornitore_documenti.updateMany({ where: { id: { in: documenti } }, data: { liquidazione_id: liq.id } });
    await tx.bollettini_righe.updateMany({ where: { id: { in: voci } }, data: { liquidazione_id: liq.id } });
  }

  // ---------- Documenti in arrivo e scartati (§4.2.12–13) ----------
  const hashDi = (nome: string) => createHash('sha256').update(nome).digest('hex');
  // D-60: in coda in_arrivo/AAAA/AAAAMMGG/<impronta>.pdf dal giorno di arrivo (i dati di prova non hanno il file vero)
  const percorso = (nome: string, giorno: string) => `in_arrivo/${giorno.slice(0, 4)}/${giorno.replace(/-/g, '')}/${hashDi(nome)}.pdf`;
  for (const d of D.in_arrivo) {
    const campi = Object.entries(d.lettura?.campi ?? {}) as [string, number][];
    const minimo = Math.min(1, ...campi.map(([, v]) => v));
    const arrivo = await tx.documenti_in_arrivo.create({ data: {
      origine: 'caricamento', file_nome: d.file, file_hash: hashDi(d.file), file_percorso: percorso(d.file, d.ricevuto), stato: 'da_controllare', tipo: d.tipo,
      fornitore_id: ids.fornitori[d.fornitore_id], fornitore_versione_id: ids.versioniF[d.fornitore_id],
      livello: minimo < 0.7 ? 'bassa' : minimo < 0.9 ? 'da_controllare' : 'affidabile', ricevuto_il: ora(d.ricevuto + 'T08:00'), letto_il: ora(d.ricevuto + 'T08:05') } });
    await tx.documenti_campi.createMany({ data: campi.map(([campo, affidabilita]) => ({
      documento_id: arrivo.id, campo, affidabilita, valore_letto: d.lettura.originale?.[campo] != null ? String(d.lettura.originale[campo]) : null })) });
  }
  for (const s of D.scartati) {
    await tx.documenti_in_arrivo.create({ data: {
      origine: 'caricamento', file_nome: s.doc.file, file_hash: hashDi(s.doc.file), file_percorso: percorso(s.doc.file, s.doc.ricevuto), stato: 'scartato', tipo: s.doc.tipo,
      fornitore_id: ids.fornitori[s.doc.fornitore_id], fornitore_versione_id: ids.versioniF[s.doc.fornitore_id], ricevuto_il: ora(s.doc.ricevuto + 'T08:00'),
      scartato_il: ora(s.quando), scartato_da: matteo, motivo_scarto: s.motivo, nota_scarto: s.nota } });
  }

  // ---------- Impostazioni e stato dei servizi (§4.2.14–15) ----------
  for (const [chiave, valore] of Object.entries(D.impostazioni)) {
    await tx.impostazioni.create({ data: { chiave, valore: valore as Prisma.InputJsonValue, aggiornato_da: ugo } });
  }
  for (const e of D.sistema.esecuzioni) {
    await tx.servizi_esecuzioni.create({ data: { servizio: e.servizio, tipo: 'lavoro', inizio: ora(e.quando), fine: ora(e.quando), esito: e.esito, testo: e.testo } });
  }

  // ---------- Registro (§4.2.11, §15.9) ----------
  // Anomalie: i problemi del prototipo, con il codice del catalogo §7.14.3
  const codiceProblema = ['integra.piva_mancante', 'integra.piva_doppia', 'lettura.lenta', 'casella.allegato', 'posta.respinta', 'lettura.non_raggiungibile'];
  for (const [i, p] of D.sistema.problemi.entries()) {
    await tx.registro.create({ data: {
      ts: ora(p.quando), genere: 'anomalia', livello: p.livello, codice: codiceProblema[i], servizio: p.servizio, messaggio: p.testo, dettaglio: { etichetta: p.testo, testo: p.dettaglio },
      chiave: `prova-${i + 1}`, ultimo: ora(p.quando), stato: p.visto ? 'chiusa' : 'aperta', visto_il: p.visto ? ora(p.quando) : null, visto_da: p.visto ? ugo : null, chiusa_il: p.visto ? ora(p.quando) : null } });
  }
  // Eventi: solo codici già nel catalogo di src/registro.ts; verifica, esportazione e caricamento non ci sono ancora
  const ctx = { utente_id: ugo, ip: '127.0.0.1' };
  const gries = ids.fornitori[1];
  await logEvent(tx, { tipo: 'auth', azione: 'login', entita: 'utente', entita_id: ugo, esito: 'successo', dettaglio: { etichetta: 'ugo', modo: 'password' } }, ctx);
  await logEvent(tx, { tipo: 'crud', azione: 'create', entita: 'fornitore', entita_id: gries, esito: 'successo', dettaglio: { etichetta: 'Gries GmbH & Co. KG', tipo_provvigione: 'maturato' } }, ctx);
  await logEvent(tx, { tipo: 'crud', azione: 'create', entita: 'scaglione', entita_id: gries, esito: 'successo', dettaglio: { etichetta: 'Gries · dal 01/01/2025', sconto_min: 1 } }, ctx);
  await logEvent(tx, { tipo: 'crud', azione: 'update', entita: 'scaglione', entita_id: gries, esito: 'successo', dettaglio: { etichetta: 'Gries · dal 01/01/2025', prima: { pct_subagente: 0 }, dopo: { pct_subagente: 3 } } }, ctx);
  await logEvent(tx, { tipo: 'stato', azione: 'change_state', entita: 'pratica', esito: 'successo', dettaglio: { etichetta: 'OF/2026/045', prima: { stato: 'inviato' }, dopo: { stato: 'confermato' } } }, ctx);
  await logEvent(tx, { tipo: 'errore', azione: 'error', entita: 'sistema', esito: 'errore', dettaglio: { etichetta: 'POST /api/documenti', rotta: '/api/documenti', metodo: 'POST', http_status: 500, errore: { classe: 'Error', messaggio: 'lettura non riuscita (esempio)' } } }, ctx);
}
