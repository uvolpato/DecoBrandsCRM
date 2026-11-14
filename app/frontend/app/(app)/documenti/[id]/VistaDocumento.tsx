'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CampoEuro } from '@/componenti/Campo';
import { CampoRicerca } from '@/componenti/CampoRicerca';
import { DataTable, type Colonna } from '@/componenti/DataTable';
import { Scelte, Elenco } from '@/componenti/Flussi';
import { FormModal } from '@/componenti/FormModal';
import { FormAgenzia } from '@/componenti/FormAgenzia';
import { Icona } from '@/componenti/Icona';
import { Conferma } from '@/componenti/Modale';
import { Nota, Pannello, type Azione } from '@/componenti/Pagina';
import { avviso, Dettagli, quando, Stato, type Variante } from '@/componenti/Piccoli';
import { Sagoma, useSagome } from '@/componenti/Sagoma';
import { Schede, type Scheda } from '@/componenti/Schede';
import { usePuo } from '@/componenti/Utente';
import { PdfEvidenziato } from '@/componenti/PdfEvidenziato';
import { api } from '@/lib/api';
import { cliente as entitaCliente, fornitore as entitaFornitore, type Entita } from '@/lib/entita';
import { data, euro, euroSegno } from '@/lib/formati';

// Documento scelto nella pagina Documenti (F6-A4b, §7.9, D-15): pannello di destra con i dati
// letti, prima l'azione proposta e poi le righe; il file originale sta nella finestra di
// correzione. Azioni, proposta, controlli e affidabilità arrivano dal server (V12, D-28).

const TIPO: Record<string, string> = {
  ordine: 'Ordine', conferma: 'Conferma', proforma: 'Proforma', fattura: 'Fattura',
  nota_credito: 'Nota di credito', pagamento: 'Pagamento', altro: 'Documento', bollettino: 'Bollettino',
};
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const NOME_CAMPO: Record<string, string> = { numero: 'Numero', data: 'Data', codice_cliente: 'Codice cliente', cliente: 'Cliente', piva_cliente: 'P.IVA cliente', piva_fornitore: 'P.IVA fornitore', fornitore: 'Fornitore letto', importo_totale: 'Importo', mese: 'Mese', anno: 'Anno', riferimento_fattura: 'Fattura stornata' };
const STATO_PRATICA: Record<string, { testo: string; v: Variante }> = {
  inviato: { testo: 'Attesa conferma', v: 'attesa' },
  confermato: { testo: 'Confermata', v: 'info' },
  fatturato: { testo: 'Fatturata', v: 'ok' },
  attesa: { testo: 'Attesa conferma', v: 'attesa' },
  scaduta: { testo: 'Conferma in ritardo', v: 'errore' },
  confermata: { testo: 'Confermata', v: 'info' },
  fatturata: { testo: 'Fatturata', v: 'ok' },
};
// D-151 §19: le soglie (bordi, «%», conteggio dei punti) arrivano dal server col documento (V12);
// niente soglie fisse nel browser. Il livello del documento resta quello calcolato dal server.
type Soglie = { soglia_ok: number; soglia_bassa: number };

const PRATICA: Entita = {
  titolo: 'Pratica',
  voci: async (ctx) => {
    if (!ctx.fornitore_id) return [];
    const r = await api<Record<string, unknown>[]>('pratiche/cerca?fornitore_id=' + String(ctx.fornitore_id));
    return r.ok ? r.dati : [];
  },
  chiave: (p) => p.id,
  testo: (p) => p.numero,
  dettaglio: (p) => p.cliente + ' · ' + data(p.data) + ' · ' + p.stato,
  cerca: (p) => p.cliente + ' ' + p.numero,
  colonne: [
    { key: 'numero', header: 'Pratica' },
    { key: 'cliente', header: 'Cliente', grow: true },
    { key: 'data', header: 'Data', tipo: 'data' },
    { key: 'stato', header: 'Stato' },
  ],
};

interface Posizione { tipo?: string; pagina?: number; x0?: number; y0?: number; x1?: number; y1?: number }
interface Campo {
  campo: string; valore_letto: string | null; valore_finale: string | null;
  affidabilita: number | null; posizione: Posizione | null; precisione: string | null; verificato: boolean;
}
interface Riga {
  i: number; codice: string | null; descrizione: string | null; quantita: number | null; prezzo: number | null;
  importo: number | null; numero_fattura: string | null; data_fattura: string | null; provvigione: number | null;
}
interface Testata {
  tipo: string | null; numero: string | null; data: string | null; fornitore_id: string | null;
  codice_cliente: string | null; cliente: string | null; cliente_id: string | null; piva_cliente: string | null; piva_fornitore: string | null; fornitore: string | null; importo: number | null;
  mese: number | null; anno: number | null; riferimento_fattura: string | null;
}
interface Controllo { codice: string; campo: string; testo: string; grave: boolean }
interface Candidato {
  pratica: { id: string; numero: string; cliente: string | null; stato: string; data_ordine: string };
  punteggio: number; motivi: string[]; delta: number;
}
/** D-152: un soggetto candidato per il documento, dal CRM o da Integra. */
interface CandidatoSoggetto {
  fonte: 'crm' | 'integra'; id: string; ragione_sociale: string | null;
  piva: string | null; citta: string | null; motivo: string;
}
interface Proposta {
  esito: string; candidati: Candidato[]; importo: number;
  abbinamento: { cliente_id: string; cliente: string | null; codice: string | null } | null;
  cliente_riconosciuto: { cliente_id: string; ragione: string | null } | null;
  agenzia_mancante: { cliente_id: string; fornitore_id: string; cliente: string | null; fornitore: string | null; codice_cliente: string | null; data: string | null } | null;
  fornitore_da_integra: { id_integra: number; ragione_sociale: string | null; piva: string | null } | null;
  cliente_da_integra: { id_integra: number | null; ragione_sociale: string | null; piva: string | null; subagente: string | null; sconto: number | null } | null;
  manca_rappresentanza: { cliente: string | null; fornitore: string | null; codice_cliente: string | null } | null;
  candidati_fornitore: CandidatoSoggetto[];
  candidati_cliente: CandidatoSoggetto[];
  integra_non_raggiungibile: boolean;
}
interface Dettaglio {
  id: string; file_nome: string; file_tipo: 'pdf' | 'jpg' | 'png'; stato: string; tipo: string | null;
  livello: string | null; ricevuto_il: string; letto_il: string | null; errore: string | null;
  scaglioni_mancanti: boolean;
  fornitore: { id: string; nome: string | null } | null;
  campi: Campo[]; testata: Testata; righe: Riga[]; controlli: Controllo[];
  proposta: Proposta; bollettino: { esiste: boolean } | null;
  // D-126 §19: totali del piede della tabella delle righe dal server, non sommati nel browser (V12)
  totali: { importo: number; provvigione: number };
  soglie: Soglie;
}

/** Punti da controllare (come M.statoLettura): controlli falliti + campi incerti con un valore. */
function punti(d: Dettaglio) {
  let n = d.controlli.length;
  for (const c of d.campi) {
    if (c.campo === 'tipo' || c.verificato || c.affidabilita == null) continue;
    if (c.affidabilita < d.soglie.soglia_ok && (c.valore_finale ?? c.valore_letto) != null) n++;
  }
  return n;
}

/** Righe con almeno un valore incerto: per il contatore della scheda Righe lette. */
function righeIncerte(d: Dettaglio) {
  const out = new Set<number>();
  for (const c of d.campi) {
    const m = /^righe\[(\d+)\]\./.exec(c.campo);
    if (!m || c.verificato || c.affidabilita == null) continue;
    if (c.affidabilita < d.soglie.soglia_ok && (c.valore_finale ?? c.valore_letto) != null) out.add(Number(m[1]));
  }
  return out;
}

const classeAff = (a: number | null, verificato: boolean, s: Soglie) =>
  a == null ? '' : verificato && a < s.soglia_ok ? 'campo-verificato' : verificato ? '' : a < s.soglia_bassa ? 'incerto-errore' : a < s.soglia_ok ? 'incerto-attesa' : '';

export function VistaDocumento({ id, onFatto }: { id: string; onFatto?: () => void }) {
  const router = useRouter();
  const puo = usePuo();
  const puoModifica = puo('provvigioni.modifica');
  const puoImporta = puo('dati.importa');
  const puoAgenzia = puo('dati.modifica'); // D-106: l'agenzia si salva con `dati.modifica`
  const [d, setD] = useState<Dettaglio | null>(null);
  const [errore, setErrore] = useState('');
  const [finestra, setFinestra] = useState<ReactNode>(null);
  const [scheda, setScheda] = useState('azioni');
  const [altra, setAltra] = useState('');
  const [bollettinoId, setBollettinoId] = useState<string | null>(null);
  const [importando, setImportando] = useState(false); // R2-08: un solo import per volta
  const sagome = useSagome(!d);

  const carica = useCallback(async () => {
    const r = await api<Dettaglio>('documenti/' + id);
    if (r.ok) { setD(r.dati); setErrore(''); } else setErrore(r.messaggio);
  }, [id]);
  // il dettaglio si rimonta al cambio di documento (`key` in VistaDocumenti, D-94): niente azzeramento qui
  useEffect(() => { void carica(); }, [carica]);

  // il bollettino già registrato: serve solo il collegamento alla verifica (D-71)
  useEffect(() => {
    const t = d?.testata;
    if (!d?.bollettino?.esiste || !d.fornitore || !t?.mese || !t?.anno) return;
    const al = t.anno + '-' + String(t.mese).padStart(2, '0');
    void api<{ fornitori: { celle: { mese: string; bollettino_id: string | null }[] }[] }>(
      'bollettini?al=' + al + '&fornitori=' + d.fornitore.id + '&vista=tutti',
    ).then((r) => {
      if (!r.ok) return;
      const cella = r.dati.fornitori[0]?.celle.find((c) => c.mese === al);
      if (cella?.bollettino_id) setBollettinoId(cella.bollettino_id);
    });
  }, [d]);

  const chiudi = () => setFinestra(null);
  const salvato = (x: Dettaglio) => {
    const n = punti(x);
    setD(x);
    chiudi();
    onFatto?.();
    avviso(n ? `Dati salvati: restano ${n} ${n === 1 ? 'punto' : 'punti'} da controllare` : 'Dati salvati: lettura controllata, l’abbinamento è ricalcolato');
  };

  if (!d) {
    return (
      <Pannello riempi>
        {errore
          ? <div className="vuoto"><b>Documento non caricato</b>{errore}
            <button type="button" className="btn sec piccolo" onClick={() => void carica()}>Riprova</button></div>
          : sagome && (
            <div className="pila" aria-busy="true">
              <Sagoma larghezza="100%" altezza={96} />
              <Sagoma larghezza="100%" altezza={420} />
            </div>
          )}
      </Pannello>
    );
  }

  const doc: Dettaglio = d;
  const t = doc.testata;
  const boll = t.tipo === 'bollettino' || doc.tipo === 'bollettino';
  const nomeFornitore = doc.fornitore?.nome ?? 'non riconosciuto';
  const n = punti(doc);
  const incerte = righeIncerte(doc);
  const etichettaTipo = t.tipo ? TIPO[t.tipo] ?? t.tipo : 'Documento';
  const ab = doc.proposta.abbinamento;

  async function inviaAbbina(corpo: Record<string, unknown>, multi_ordine = false) {
    const c = multi_ordine ? { ...corpo, multi_ordine: true } : corpo;
    const r = await api<{ pratica: { id: string; numero: string } }>('documenti/' + id + '/abbina', c);
    if (!r.ok) {
      // D-123: la stessa fattura su un'altra pratica chiede la conferma multi-ordine
      if (r.stato === 409 && r.messaggio.includes('su più ordini')) {
        const si = await new Promise<boolean>((ok) => setFinestra(
          <Conferma titolo={'La ' + (TIPO[t.tipo ?? ''] ?? 'fattura').toLowerCase() + ' è già su un’altra pratica'}
            testo={r.messaggio} etichetta="Conferma" onRisposta={(x) => { chiudi(); ok(x); }} />,
        ));
        if (!si) return false;
        return inviaAbbina(corpo, true);
      }
      avviso(r.messaggio, true); return false;
    }
    avviso('Documento abbinato alla pratica ' + r.dati.pratica.numero);
    router.push('/pratiche/' + r.dati.pratica.id);
    return true;
  }

  /** Con lettura bassa l'abbinamento chiede conferma (come il prototipo, §6.5 punto 6). */
  async function seAffidabile(fn: () => void | Promise<void>) {
    if (doc.livello !== 'bassa') { await fn(); return; }
    const si = await new Promise<boolean>((ok) => setFinestra(
      <Conferma titolo="Lettura con affidabilità bassa"
        testo={`Ci sono ${n} ${n === 1 ? 'punto' : 'punti'} da controllare nei dati letti. Conviene correggerli prima: vuoi procedere comunque?`}
        etichetta="Procedi comunque" onRisposta={(x) => { chiudi(); ok(x); }} />,
    ));
    if (si) await fn();
  }

  /** Nota di credito: la fattura stornata si cerca nella pratica; se manca si sceglie. */
  async function abbinaNota(praticaId: string) {
    const r = await api<{ documenti: { id: string; tipo: string; numero: string; data: string }[] }>('pratiche/' + praticaId + '/documenti');
    if (!r.ok) { avviso(r.messaggio, true); return; }
    const fatture = r.dati.documenti.filter((x) => x.tipo === 'fattura');
    if (!fatture.length) { avviso('La pratica non ha fatture da stornare: scegline un’altra o scarta il documento.', true); return; }
    const trovata = fatture.find((x) => x.numero === t.riferimento_fattura);
    const abbina = (fatturaId: string) => inviaAbbina({
      tipo: 'nota_credito', pratica_id: Number(praticaId), numero: t.numero, data: t.data,
      importo: t.importo ?? undefined, fattura_id: Number(fatturaId),
    });
    if (trovata) { await abbina(trovata.id); return; }
    setFinestra(
      <FormModal titolo="Quale fattura storna questa nota di credito?"
        testo={t.riferimento_fattura ? `Il riferimento letto è ${t.riferimento_fattura}, ma la pratica non ha una fattura con quel numero.` : 'Il documento non riporta il numero della fattura stornata.'}
        conferma="Abbina" campi={[{
          nome: 'fattura_id', etichetta: 'Fattura stornata', tipo: 'select', largo: true,
          opzioni: fatture.map((f) => ({ value: f.id, label: f.numero + ' del ' + data(f.data) })),
        }]}
        onChiudi={chiudi}
        onConferma={async (v) => {
          if (!v.fattura_id) return 'Scegli la fattura stornata.';
          return (await abbina(v.fattura_id)) ? undefined : 'Abbinamento non riuscito.';
        }} />);
  }

  async function abbinaPratica(praticaId: string) {
    if (t.tipo === 'nota_credito') { await abbinaNota(praticaId); return; }
    await inviaAbbina({
      tipo: t.tipo, pratica_id: Number(praticaId), numero: t.numero, data: t.data, importo: t.importo ?? undefined,
    });
  }

  function apriNuova() {
    setFinestra(
      <ApriPratica id={id} t={t} clienteIniziale={t.cliente_id ?? ab?.cliente_id ?? doc.proposta.cliente_riconosciuto?.cliente_id ?? ''} onChiudi={chiudi} />,
    );
  }

  function apriBollettino() {
    setFinestra(
      <FormModal titolo={'Registra il bollettino di ' + (t.mese ? MESI[t.mese - 1] : '') + ' ' + (t.anno ?? '')}
        conferma="Registra e verifica" colonne={2}
        testo="Dopo la registrazione lo confronti riga per riga con le nostre pratiche."
        campi={[
          { nome: 'fornitore_id', etichetta: 'Fornitore', tipo: 'ricerca', entita: entitaFornitore, largo: true, valore: t.fornitore_id ?? '',
            testoIniziale: t.fornitore ? { q: t.fornitore, mostra: t.fornitore } : undefined },
          { nome: 'mese', etichetta: 'Mese', tipo: 'select', valore: String(t.mese ?? ''), opzioni: MESI.map((m, i) => ({ value: String(i + 1), label: m })) },
          { nome: 'anno', etichetta: 'Anno', tipo: 'numero', valore: t.anno ?? '' },
        ]}
        onChiudi={chiudi}
        onConferma={async (v) => {
          const fornitoreId = v.fornitore_id || t.fornitore_id;
          if (!fornitoreId) return 'Scegli il fornitore.';
          const r = await api<{ id: string }>('bollettini', {
            fornitore_id: Number(fornitoreId), anno: Number(v.anno), mese: Number(v.mese), arrivo_id: Number(id),
          });
          if (!r.ok) return r.messaggio;
          avviso('Bollettino registrato: ora verificalo');
          router.push('/bollettini/' + r.dati.id);
        }} />);
  }

  function scarta() {
    setFinestra(
      <FormModal titolo={'Scartare ' + etichettaTipo.toLowerCase() + (t.numero ? ' ' + t.numero : '') + '?'}
        conferma="Scarta" pericolo colonne={1}
        testo="Il documento esce dall’elenco e non viene registrato. Resta fra i documenti scartati per 90 giorni e si può recuperare."
        campi={[
          { nome: 'motivo', etichetta: 'Motivo', tipo: 'select', opzioni: ['Doppione', 'Non riguarda Decobrands', 'Documento illeggibile', 'Altro'].map((x) => ({ value: x, label: x })) },
          { nome: 'nota', etichetta: 'Nota (facoltativa)', segnaposto: 'es. arrivato due volte' },
        ]}
        onChiudi={chiudi}
        onConferma={async (v) => {
          const r = await api('documenti/' + id + '/scarta', { motivo: v.motivo, nota: v.nota || undefined });
          if (!r.ok) return r.messaggio;
          avviso('Documento scartato: lo trovi fra gli scartati');
          onFatto?.();
          router.push('/documenti');
        }} />);
  }

  /** A4-01: riprova la lettura di un documento in errore (chiave o crediti del servizio sistemati). */
  async function rileggi() {
    const r = await api('documenti/' + id + '/rileggi', {});
    if (!r.ok) { avviso(r.messaggio, true); return; }
    avviso('Documento rimesso in coda: la lettura riparte al prossimo giro');
    onFatto?.();
    router.push('/documenti');
  }

  /** §7.9: toglie un documento in coda prima della lettura, con lo scarto già esistente (motivo fisso). */
  function togliDallaCoda() {
    setFinestra(
      <Conferma titolo="Togliere il documento dalla coda?"
        testo="Il documento non verrà letto né registrato: va fra i documenti scartati e si può recuperare."
        etichetta="Togli dalla coda" pericolo
        onRisposta={async (x) => {
          chiudi();
          if (!x) return;
          const r = await api('documenti/' + id + '/scarta', { motivo: 'Tolto dalla coda', nota: 'prima della lettura' });
          if (!r.ok) { avviso(r.messaggio, true); return; }
          avviso('Documento tolto dalla coda: lo trovi fra gli scartati');
          onFatto?.();
          router.push('/documenti');
        }} />,
    );
  }

  const azioni: Azione[] = [
    ...(puoModifica && ['da_controllare', 'errore'].includes(d.stato) ? [{
      etichetta: 'Correggi i dati letti', onClick: () => setFinestra(<FinestraCorreggi d={d} onChiudi={chiudi} onSalvato={salvato} />),
      conta: n || undefined, contaVariante: d.livello === 'bassa' ? 'errore' as const : 'attesa' as const,
      titolo: n + (n === 1 ? ' punto da controllare' : ' punti da controllare'),
    }] : []),
    // A4-01: da errore si riprova la lettura (servizio di nuovo raggiungibile, dati inseriti a mano)
    ...(puoModifica && d.stato === 'errore' ? [{
      etichetta: 'Rileggi il documento', onClick: rileggi,
    }] : []),
    // §7.9: un documento in coda si può togliere prima della lettura (scarto con motivo fisso)
    ...(puoModifica && d.stato === 'in_coda' ? [{
      etichetta: 'Togli dalla coda', variante: 'pericolo' as const, onClick: togliDallaCoda,
    }] : []),
    ...(puoModifica && ['da_controllare', 'errore'].includes(d.stato) ? [{
      etichetta: 'Scarta il documento', variante: 'pericolo' as const, onClick: scarta,
    }] : []),
  ];

  const testata = boll ? [
    { etichetta: 'Fornitore', valore: nomeFornitore },
    { etichetta: 'Mese', valore: t.mese ? MESI[t.mese - 1] + ' ' + (t.anno ?? '') : '—' },
    { etichetta: 'Totale riconosciuto', valore: euro(d.proposta.importo) },
  ] : [
    { etichetta: 'Fornitore', valore: nomeFornitore },
    { etichetta: 'Tipo', valore: etichettaTipo },
    { etichetta: 'Data del documento', valore: data(t.data) },
    {
      etichetta: 'Codice cliente', valore: <>
        {t.codice_cliente ?? '—'}
        {ab ? <span className="sec-riga">{ab.cliente ?? 'cliente riconosciuto'}</span>
          : <span className="sec-riga testo-tenue">non trovato fra i clienti</span>}
      </>,
    },
    { etichetta: 'Importo', valore: t.importo == null ? '—' : euro(t.importo) },
    ...(t.riferimento_fattura ? [{ etichetta: 'Fattura stornata', valore: t.riferimento_fattura }] : []),
  ];

  /** D-106: senza agenzia il documento non entra in pratica; si configura qui, con cliente e fornitore fissi. */
  function configuraAgenzia() {
    const am = doc.proposta.agenzia_mancante;
    if (!am) return;
    setFinestra(
      <FormAgenzia
        cliente={{ id: am.cliente_id, nome: am.cliente }}
        fornitoreFisso={{ id: am.fornitore_id, nome: am.fornitore ?? doc.fornitore?.nome ?? 'Fornitore' }}
        iniziali={{ codice_cliente_fornitore: am.codice_cliente, valido_dal: am.data }}
        onSalvata={async () => { await carica(); onFatto?.(); }}
        onChiudi={chiudi}
      />,
    );
  }

  /** D-111/D-133: il server importa il fornitore e collega il documento nella stessa transazione, così
   *  la proposta si ricalcola e compare «Mancano gli scaglioni» (D-113) senza perdere le righe lette. */
  async function importaFornitore() {
    const fd = doc.proposta.fornitore_da_integra;
    if (!fd || importando) return;
    setImportando(true);
    try {
      const r = await api<{ id: string }>('integra/importa', {
        tipo: 'fornitore', id_integra: fd.id_integra, documento_id: Number(id),
      });
      if (!r.ok) { avviso(r.messaggio, true); return; }
      avviso('Fornitore importato da Integra');
      await carica();
      onFatto?.();
    } finally {
      setImportando(false);
    }
  }

  /** D-111: importa il cliente da Integra; dopo l'import la proposta riconosce il cliente e chiede l'agenzia. */
  async function importaCliente() {
    const cd = doc.proposta.cliente_da_integra;
    if (!cd || cd.id_integra == null || importando) return;
    setImportando(true);
    try {
      const r = await api<{ id: string }>('integra/importa', { tipo: 'cliente', id_integra: cd.id_integra });
      if (!r.ok) { avviso(r.messaggio, true); return; }
      avviso('Cliente importato da Integra');
      await carica();
      onFatto?.();
    } finally {
      setImportando(false);
    }
  }

  /** D-152: la persona sceglie il fornitore o il cliente fra i candidati proposti dal server. */
  async function scegli(ruolo: 'fornitore' | 'cliente', cand: CandidatoSoggetto) {
    if (importando) return;
    setImportando(true);
    try {
      const r = await api<Dettaglio>('documenti/' + id + '/scegli', { ruolo, fonte: cand.fonte, id: cand.id });
      if (!r.ok) { avviso(r.messaggio, true); return; }
      avviso((ruolo === 'fornitore' ? 'Fornitore' : 'Cliente') + ' collegato al documento');
      await carica();
      onFatto?.();
    } finally {
      setImportando(false);
    }
  }

  function azione() {
    const fd = doc.proposta.fornitore_da_integra;
    const cd = doc.proposta.cliente_da_integra;
    const nr = doc.proposta.manca_rappresentanza;
    // D-152: candidati da scegliere (il riconoscimento non è univoco)
    const riquadroScelta = (ruolo: 'fornitore' | 'cliente', candidati: CandidatoSoggetto[]) => (
      <div className="pila">
        <Nota>{ruolo === 'fornitore' ? 'Il fornitore letto non è univoco' : 'Il cliente letto non è univoco'}: scegli fra i candidati.</Nota>
        {doc.proposta.integra_non_raggiungibile && <Nota>Integra non raggiungibile: i candidati sono solo del CRM.</Nota>}
        <Elenco voci={candidati.map((c) => ({
          testo: <><b>{c.ragione_sociale ?? '—'}</b><span className="sec-riga">{[c.piva, c.citta, c.motivo].filter(Boolean).join(' · ')}</span></>,
          destra: <>
            <Stato v={c.fonte === 'crm' ? 'info' : 'neutro'}>{c.fonte === 'crm' ? 'CRM' : 'Integra'}</Stato>
            <button type="button" className="btn sec piccolo" disabled={importando || (c.fonte === 'integra' && !puoImporta)}
              title={c.fonte === 'integra' && !puoImporta ? 'Serve il permesso di importare da Integra' : undefined}
              aria-label={'Scegli ' + (c.ragione_sociale ?? '')}
              onClick={() => void scegli(ruolo, c)}>{importando ? '…' : 'Scegli'}</button>
          </>,
        }))} />
        <div className="azioni-riga">
          <button type="button" className="btn testo" onClick={() => setFinestra(<FinestraCorreggi d={doc} onChiudi={chiudi} onSalvato={salvato} />)}>Nessuno di questi: scegli a mano</button>
        </div>
      </div>
    );
    if (doc.proposta.candidati_fornitore.length) return riquadroScelta('fornitore', doc.proposta.candidati_fornitore);
    if (doc.proposta.candidati_cliente.length) return riquadroScelta('cliente', doc.proposta.candidati_cliente);
    return (
      <>
        {incerte.size > 0 && (
          <div className="avviso-variazioni" role="status">
            <Icona nome="avviso" />
            <span><b>{incerte.size} {incerte.size === 1 ? 'riga letta' : 'righe lette'} con valori incerti</b>: controllale prima di decidere.</span>
            <button type="button" className="btn sec piccolo" onClick={() => setScheda('righe')}>Vedi le righe</button>
          </div>
        )}
        {doc.scaglioni_mancanti && doc.fornitore && !boll && !fd && ['ordine', 'conferma', 'fattura', 'nota_credito'].includes(t.tipo ?? '') && (
          <Nota>Mancano gli scaglioni del fornitore: configurali nella <Link href={'/fornitori/' + doc.fornitore.id}>scheda del fornitore</Link> prima di aprire la pratica.</Nota>
        )}
        {fd ? (
          <div className="pila">
            <Nota>Il fornitore non è in anagrafica. In Integra c'è: <b>{fd.ragione_sociale ?? '—'}</b>{fd.piva ? `, P.IVA ${fd.piva}` : ''}.</Nota>
            <div className="azioni-riga">
              <button type="button" className="btn primario" disabled={!puoImporta || importando} title={!puoImporta ? 'Serve il permesso di importare da Integra' : undefined} onClick={() => void importaFornitore()}>{importando ? 'Importo…' : 'Importa da Integra'}</button>
            </div>
          </div>
        ) : nr ? (
          <div className="pila">
            <Nota>Questo fornitore non è rappresentato per questo cliente: senza agenzia il documento non entra in una pratica.</Nota>
            <div className="azioni-riga">
              <button type="button" className="btn primario" disabled={!puoAgenzia} title={!puoAgenzia ? 'Serve il livello operatore in Dati' : undefined} onClick={configuraAgenzia}>Configura l’agenzia</button>
            </div>
          </div>
        ) : cd ? (
          <div className="pila">
            <Nota>Il cliente <b>{cd.ragione_sociale ?? '—'}</b> non è in anagrafica.</Nota>
            {cd.subagente != null || cd.sconto != null ? (
              <div className="nota"><b>Dal vecchio CRM</b>: subagente {cd.subagente ?? '—'}{cd.sconto != null ? `, sconto ${cd.sconto}%` : ''}.</div>
            ) : null}
            <div className="azioni-riga">
              {cd.id_integra != null
                ? <button type="button" className="btn primario" disabled={!puoImporta || importando} title={!puoImporta ? 'Serve il permesso di importare da Integra' : undefined} onClick={() => void importaCliente()}>{importando ? 'Importo…' : 'Importa da Integra'}</button>
                : <button type="button" className="btn primario" disabled title="L’import dal vecchio CRM arriva con l’anagrafica">Importa dal vecchio CRM</button>}
            </div>
          </div>
        ) : doc.proposta.esito === 'manca_agenzia' ? (
          <div className="pila">
            <Nota>Il cliente non ha un’agenzia con questo fornitore: senza, il documento non entra in una pratica. È normale al primo ordine.</Nota>
            <div className="azioni-riga">
              <button type="button" className="btn primario" disabled={!puoAgenzia} title={!puoAgenzia ? 'Serve il livello operatore in Dati' : undefined} onClick={configuraAgenzia}>Configura l’agenzia</button>
            </div>
          </div>
        ) : boll ? (
          doc.bollettino?.esiste ? (
            <Nota>Il bollettino di {t.mese ? MESI[t.mese - 1] : ''} {t.anno ?? ''} di {nomeFornitore} è già registrato:
              {bollettinoId ? <> <Link href={'/bollettini/' + bollettinoId}>aprilo</Link></> : <> aprilo da <Link href="/bollettini">Bollettini</Link></>}.
              Se questo è la versione rettificata, correggi il mese o scartalo.</Nota>
          ) : (
            <Scelte voci={[{
              titolo: 'Registra il bollettino di ' + (t.mese ? MESI[t.mese - 1] : '') + ' ' + (t.anno ?? ''),
              consigliata: true,
              punti: [
                `${doc.righe.length} ${doc.righe.length === 1 ? 'riga letta' : 'righe lette'}, totale ${euro(doc.proposta.importo)}`,
                'dopo la registrazione lo confronti riga per riga con le nostre pratiche',
              ],
              azione: { etichetta: 'Registra e verifica', onClick: () => void seAffidabile(apriBollettino) },
            }]} />
          )
        ) : t.tipo === 'ordine' ? (
          <>
            {doc.proposta.esito === 'doppio' ? (
              <Nota>Questo ordine risulta già registrato: controlla il numero letto o scarta il documento.</Nota>
            ) : (
              <>
                {!ab && (doc.proposta.cliente_riconosciuto
                  ? <Nota>Il codice {t.codice_cliente ?? '—'} non è abbinato a {nomeFornitore}, ma il cliente è <b>{doc.proposta.cliente_riconosciuto.ragione ?? ''}</b>. Aggiungi l’agenzia nella <Link href={'/clienti/' + doc.proposta.cliente_riconosciuto.cliente_id}>scheda del cliente</Link>, oppure scegli cliente e fornitore qui sotto.</Nota>
                  : doc.fornitore
                    ? <Nota>Il codice {t.codice_cliente ?? '—'} non corrisponde a nessun cliente di {nomeFornitore}. Correggi il codice letto oppure scegli cliente e fornitore qui sotto.</Nota>
                    : <Nota>Fornitore e codice cliente non letti: correggi i dati letti oppure scegli cliente e fornitore qui sotto.</Nota>)}
                <Scelte voci={[{
                  titolo: (t.numero ?? 'Ordine') + ' · ' + (ab?.cliente ?? 'cliente da scegliere'),
                  sottotitolo: <Stato v="attesa">Nuova pratica</Stato>,
                  consigliata: true,
                  punti: [
                    ab ? `codice cliente ${ab.codice ?? ''} = ${ab.cliente ?? ''}` : 'cliente e fornitore da scegliere',
                    'con l’ordine nasce la pratica e parte l’attesa della conferma',
                  ],
                  azione: { etichetta: 'Apri la pratica', onClick: () => void seAffidabile(apriNuova) },
                }]} />
              </>
            )}
          </>
        ) : (
          <>
            {doc.proposta.esito === 'nessuno' && <h3>A quale pratica appartiene?</h3>}
            {doc.proposta.esito === 'nessuno' && (
              <Nota>{doc.fornitore
                ? <>Il codice {t.codice_cliente ?? '—'} non corrisponde a nessun cliente di {nomeFornitore}. Scegli la pratica a mano oppure correggi il codice.</>
                : <>Fornitore e codice cliente non letti: scegli la pratica a mano oppure correggi il codice.</>}</Nota>
            )}
            {doc.proposta.esito === 'doppio' && <Nota>Questo documento risulta già registrato: controlla il numero letto o scarta il documento.</Nota>}
            <Scelte vuoto={doc.fornitore ? 'Nessuna pratica aperta di ' + nomeFornitore + ' a cui abbinarlo.' : 'Nessuna pratica aperta a cui abbinarlo.'} voci={doc.proposta.candidati.map((c, i) => {
              const s = STATO_PRATICA[c.pratica.stato] ?? { testo: c.pratica.stato, v: 'neutro' as Variante };
              return {
                titolo: c.pratica.numero + ' · ' + (c.pratica.cliente ?? ''),
                sottotitolo: <Stato v={s.v}>{s.testo}</Stato>,
                consigliata: i === 0 && doc.proposta.esito !== 'nessuno',
                punti: [...c.motivi, t.tipo === 'nota_credito'
                  ? <>riduce il fatturato della pratica di <b className="negativo">{euro(Math.abs(doc.proposta.importo))}</b></>
                  : Math.abs(c.delta) < 0.01 ? <>importo uguale alla fase prima</>
                    : <><span className={c.delta < 0 ? 'negativo' : 'positivo'}>{euroSegno(c.delta)}</span> rispetto alla fase prima</>],
                azione: { etichetta: 'Abbina a ' + c.pratica.numero, onClick: () => void seAffidabile(() => abbinaPratica(c.pratica.id)) },
              };
            })} />
          </>
        )}
        {!boll && doc.stato === 'da_controllare' && !['manca_agenzia', 'manca_rappresentanza', 'fornitore_da_integra', 'cliente_da_integra'].includes(doc.proposta.esito) && (
          <div className="abbina-altra">
            <span className="testo-tenue">{doc.fornitore ? 'Oppure abbina a un’altra pratica di ' + nomeFornitore + ':' : 'Oppure abbina a un’altra pratica:'}</span>
            <CampoRicerca entita={PRATICA} contesto={{ fornitore_id: t.fornitore_id }} valore={altra} onChange={setAltra} />
            <button type="button" className="btn sec" disabled={!altra} onClick={() => { setAltra(''); void seAffidabile(() => abbinaPratica(altra)); }}>Abbina</button>
          </div>
        )}
      </>
    );
  }

  function righeLette() {
    const colonne: Colonna<Riga>[] = boll ? [
      { key: 'numero_fattura', header: 'Documento', grow: true },
      { key: 'data_fattura', header: 'Data', tipo: 'data' },
      { key: 'importo', header: 'Imponibile', tipo: 'euro' },
      { key: 'provvigione', header: 'Provvigione', tipo: 'euro', totale: 'somma' },
    ] : [
      { key: 'codice', header: 'Articolo', grow: true, cell: (r) => <><b>{r.codice ?? '—'}</b><span className="sec-riga">{r.descrizione ?? ''}</span></> },
      { key: 'quantita', header: 'Quantità', tipo: 'numero' },
      { key: 'prezzo', header: 'Prezzo', tipo: 'euro' },
      { key: 'importo', header: 'Importo', tipo: 'euro', totale: 'somma' },
    ];
    return (
      <>
        <Nota>{incerte.size
          ? 'Le righe evidenziate hanno valori letti con poca sicurezza: correggili o confermali con Correggi i dati letti.'
          : 'Righe come lette dal documento. Per cambiarle usa Correggi i dati letti.'}</Nota>
        <div className="riempi">
          <DataTable righe={doc.righe} colonne={colonne} chiave={(r) => String(r.i)} compatta
            totali={doc.totali}
            etichettaTotale={boll ? 'Totale provvigioni' : 'Totale documento'}
            rowClass={(r) => incerte.has(r.i) ? 'evidenzia' : ''}
            emptyText="Nessuna riga letta" emptyHint="Correggi i dati letti per aggiungerle." />
        </div>
      </>
    );
  }

  const schede: Scheda[] = [
    {
      id: 'azioni',
      etichetta: boll ? 'Cosa farne'
        : doc.proposta.esito === 'fornitore_da_integra' ? 'Fornitore da importare'
        : doc.proposta.esito === 'fornitore_da_scegliere' ? 'Fornitore da scegliere'
        : doc.proposta.esito === 'manca_rappresentanza' ? 'Configura l’agenzia'
        : doc.proposta.esito === 'cliente_da_integra' ? 'Cliente da importare'
        : doc.proposta.esito === 'cliente_da_scegliere' ? 'Cliente da scegliere'
        : t.tipo === 'ordine' ? 'Nuova pratica'
        : doc.proposta.esito === 'nessuno' ? 'Scegli la pratica'
        : 'Pratica proposta',
      contenuto: azione,
    },
    {
      id: 'righe', etichetta: 'Righe lette',
      conta: incerte.size ? incerte.size + ' da controllare' : doc.righe.length,
      contaVariante: incerte.size ? (doc.livello === 'bassa' ? 'errore' : 'attesa') : 'neutro',
      contenuto: righeLette,
    },
  ];

  return (
    <>
      <Pannello riempi
        titolo={etichettaTipo + (t.numero ? ' ' + t.numero : '') + (doc.fornitore?.nome ? ' · ' + doc.fornitore.nome : '')}
        nota={<><Icona nome="file" /> {d.file_nome}</>}
        azioni={azioni}>
        <div className="pila riempi">
          <Dettagli inColonne voci={testata} />
          <Schede schede={schede} attiva={scheda} onCambia={setScheda} memoria={'documento-' + id} riempi />
        </div>
      </Pannello>
      {finestra}
    </>
  );
}

/** PDF o foto come nel prototipo, a tutta altezza nel pannello di sinistra: il PDF alla pagina del campo. */
function FileDocumento({ d, pagina, posizione }: { d: Dettaglio; pagina?: number; posizione?: Posizione | null }) {
  const src = '/api/documenti/' + d.id + '/file';
  if (d.file_tipo !== 'pdf') {
    return <img src={src} alt={'Foto del documento ' + d.file_nome} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
  }
  // il rettangolo (§6.6) si disegna solo se la posizione ha davvero le coordinate
  const p = posizione && posizione.x0 != null && posizione.x1 != null
    ? { x0: posizione.x0, y0: posizione.y0 ?? 0, x1: posizione.x1, y1: posizione.y1 ?? 0 }
    : null;
  return <PdfEvidenziato src={src} pagina={pagina ?? 1} posizione={p} />;
}

/* ---------- Correggi i dati letti (F6-A4b, §6.5 punto 7) ---------- */

/** D-157 §19: la ricerca del cliente nella modale «Apri la pratica» riceve il fornitore scelto lì
 *  come contesto, così la colonna «Cod. cliente» mostra il codice presso quel fornitore. */
function ApriPratica({ id, t, clienteIniziale, onChiudi }: { id: string; t: Testata; clienteIniziale: string; onChiudi: () => void }) {
  const router = useRouter();
  const [fornitoreId, setFornitoreId] = useState(t.fornitore_id ?? '');
  return (
    <FormModal titolo="Apri la pratica" conferma="Apri la pratica" colonne={2}
      testo="La pratica nasce dall’ordine. Cliente e fornitore servono per l’agenzia e la provvigione."
      campi={[
        { nome: 'fornitore_id', etichetta: 'Fornitore', tipo: 'ricerca', entita: entitaFornitore, largo: true, valore: fornitoreId,
          testoIniziale: t.fornitore ? { q: t.fornitore, mostra: t.fornitore } : undefined,
          onCambia: (v) => setFornitoreId(v) },
        { nome: 'cliente_id', etichetta: 'Cliente', tipo: 'ricerca', entita: entitaCliente, largo: true, valore: clienteIniziale,
          contesto: { fornitore_id: fornitoreId, codice_cliente: t.codice_cliente },
          testoIniziale: t.cliente ? { q: t.cliente, mostra: t.cliente } : undefined },
      ]}
      onChiudi={onChiudi}
      onConferma={async (v) => {
        const fornitoreIdFinale = v.fornitore_id || t.fornitore_id;
        if (!v.cliente_id || !fornitoreIdFinale) return 'Scegli cliente e fornitore.';
        const r = await api<{ pratica: { id: string; numero: string } }>('documenti/' + id + '/abbina', {
          tipo: 'ordine', numero: t.numero, data: t.data, importo: t.importo ?? undefined,
          cliente_id: Number(v.cliente_id), fornitore_id: Number(fornitoreIdFinale),
        });
        if (!r.ok) return r.messaggio;
        avviso('Aperta la pratica ' + r.dati.pratica.numero);
        router.push('/pratiche/' + r.dati.pratica.id);
      }} />);
}

interface BozzaRiga {
  i: number | null; codice: string; descrizione: string; quantita: string; prezzo: string; importo: string;
  numero_fattura: string; data_fattura: string; provvigione: string;
}
interface Bozza {
  testata: { tipo: string; numero: string; data: string; fornitore_id: string; codice_cliente: string; cliente: string; cliente_id: string; piva_cliente: string; piva_fornitore: string; fornitore: string; importo: string; mese: string; anno: string; riferimento_fattura: string };
  righe: BozzaRiga[];
}
const RIGA_KEYS = ['codice', 'descrizione', 'quantita', 'prezzo', 'importo', 'numero_fattura', 'data_fattura', 'provvigione'] as const;

/** Importo di una riga come nel server (`importoRigaLetta`, proposta.ts): quello letto, altrimenti
 *  quantità × prezzo. La «Somma righe» accanto all'Importo e il piede della tabella usano la stessa
 *  funzione (D-153). */
const importoRiga = (r: BozzaRiga) => {
  if (r.importo.trim() !== '') return Number(r.importo) || 0;
  return r.quantita.trim() !== '' && r.prezzo.trim() !== '' ? (Number(r.quantita) || 0) * (Number(r.prezzo) || 0) : 0;
};
/** Somma delle righe in centesimi interi (mai float), per la «Somma righe» e il piede della tabella. */
const sommaRighe = (righe: BozzaRiga[]) => righe.reduce((s, r) => s + Math.round(importoRiga(r) * 100), 0) / 100;

/** Campo con il bordo dell'affidabilità (giallo 0,70–0,90 · rosso < 0,70 · verde se confermato).
 *  Il ✓ accanto al campo conferma il valore letto: da lì non conta più fra i punti da controllare. */
function CampoLetto({ x, etichetta, verificato, onConferma, soglie, sopra, children }: {
  x: Campo | undefined; etichetta: string; verificato: boolean; onConferma?: () => void; soglie: Soglie; sopra?: ReactNode; children: ReactNode;
}) {
  const a = x?.affidabilita ?? null;
  const incerto = a != null && !verificato && a < soglie.soglia_ok;
  return (
    <div className={'campo-letto ' + classeAff(a, verificato, soglie)}>
      <label>{etichetta}{incerto && <span className="aff">{Math.round(a * 100)}%</span>}{sopra}</label>
      <div className="campo-riga">
        {children}
        {verificato && <span className="spunta-verde" title="Campo verificato" aria-label={'Verificato: ' + etichetta}>✓</span>}
        {incerto && <button type="button" className="conferma-campo" title="Il valore è giusto: confermalo" aria-label={'Conferma ' + etichetta} onClick={onConferma}>✓</button>}
      </div>
    </div>
  );
}

function FinestraCorreggi({ d, onChiudi, onSalvato }: { d: Dettaglio; onChiudi: () => void; onSalvato: (x: Dettaglio) => void }) {
  const [b, setB] = useState<Bozza>(() => ({
    testata: {
      tipo: d.testata.tipo ?? 'altro', numero: d.testata.numero ?? '', data: d.testata.data ?? '',
      fornitore_id: d.testata.fornitore_id ?? '', codice_cliente: d.testata.codice_cliente ?? '',
      cliente: d.testata.cliente ?? '', cliente_id: d.testata.cliente_id ?? '', piva_cliente: d.testata.piva_cliente ?? '', piva_fornitore: d.testata.piva_fornitore ?? '', fornitore: d.testata.fornitore ?? '',
      importo: d.testata.importo == null ? '' : String(d.testata.importo),
      mese: d.testata.mese == null ? '' : String(d.testata.mese), anno: d.testata.anno == null ? '' : String(d.testata.anno),
      riferimento_fattura: d.testata.riferimento_fattura ?? '',
    },
    righe: d.righe.map((r) => ({
      i: r.i, codice: r.codice ?? '', descrizione: r.descrizione ?? '',
      quantita: r.quantita == null ? '' : String(r.quantita), prezzo: r.prezzo == null ? '' : String(r.prezzo),
      importo: r.importo == null ? '' : String(r.importo), numero_fattura: r.numero_fattura ?? '',
      data_fattura: r.data_fattura ?? '', provvigione: r.provvigione == null ? '' : String(r.provvigione),
    })),
  }));
  const [campo, setCampo] = useState<string | null>(null);
  const [riepAperto, setRiepAperto] = useState(false); // D-153: riepilogo chiuso di default
  const [errore, setErrore] = useState('');
  const [attesa, setAttesa] = useState(false);
  const [nuovaRiga, setNuovaRiga] = useState<number | null>(null);
  // campi già validati (dal server o con il ✓ in questa finestra): non sono più punti da controllare
  const [verificati, setVerificati] = useState<Set<string>>(() => new Set(d.campi.filter((c) => c.verificato).map((c) => c.campo)));
  const af = useMemo(() => new Map(d.campi.map((c) => [c.campo, c])), [d.campi]);
  const boll = b.testata.tipo === 'bollettino';
  // D-154: il pulsante › accanto al campo letto porta il nome nella ricerca e apre il menu (comando
  // esterno, prop `cerca`). Nei moduli (Apri la pratica, Registra il bollettino) il campo letto non c'è,
  // quindi il nome compare come «Letto: … · Cerca questo» (testoIniziale, resta com'è).
  const lettoFornitore = b.testata.fornitore ? { q: b.testata.fornitore } : undefined;
  const [cercaCliente, setCercaCliente] = useState(0);
  const [cercaFornitore, setCercaFornitore] = useState(0);
  const verificato = (k: string) => verificati.has(k);
  const conferma = (k: string) => setVerificati((s) => s.has(k) ? s : new Set(s).add(k));
  const campoSi = (k: string, etichetta: string, children: ReactNode, senzaAff = false) => (
    <CampoLetto x={senzaAff ? undefined : af.get(k)} etichetta={etichetta} verificato={verificato(k)} onConferma={() => conferma(k)} soglie={d.soglie}>{children}</CampoLetto>
  );

  useEffect(() => {
    const tasto = (e: KeyboardEvent) => { if (e.key === 'Escape') onChiudi(); };
    document.addEventListener('keydown', tasto);
    return () => document.removeEventListener('keydown', tasto);
  }, [onChiudi]);

  // D-151: la riga aggiunta si porta in vista e il fuoco va sul suo primo campo
  useEffect(() => {
    if (nuovaRiga == null) return;
    const riga = document.querySelector<HTMLElement>(`[data-riga="${nuovaRiga}"]`);
    riga?.scrollIntoView({ block: 'nearest' });
    riga?.querySelector('input')?.focus();
    setNuovaRiga(null);
  }, [nuovaRiga]);

  const t = (k: keyof Bozza['testata'], v: string) => setB((x) => ({ ...x, testata: { ...x.testata, [k]: v } }));
  const r = (idx: number, k: keyof BozzaRiga, v: string) => setB((x) => ({ ...x, righe: x.righe.map((z, j) => j === idx ? { ...z, [k]: v } : z) }));
  const campoRiga = (riga: BozzaRiga, idx: number, k: string) => `righe[${riga.i ?? idx}].${k}`;
  const pos = campo ? af.get(campo) : null;
  const pagina = pos?.posizione?.pagina;
  // punti ancora aperti: controlli falliti + campi incerti non confermati (si aggiorna a ogni ✓)
  const restanti = d.campi.filter((c) => c.campo !== 'tipo' && !verificato(c.campo) && c.affidabilita != null
    && c.affidabilita < d.soglie.soglia_ok && (c.valore_finale ?? c.valore_letto) != null);
  const nPunti = d.controlli.length + restanti.length;
  const bassa = d.controlli.some((c) => c.grave) || restanti.some((c) => (c.affidabilita ?? 1) < d.soglie.soglia_bassa);

  // D-154: «Somma righe» sopra l'Importo, sulla riga dell'etichetta, allineata a destra (solo anteprima,
  // mai salvata). Stessa funzione del piede. Spunta verde se uguale, avviso con la differenza se diversa.
  const somma = sommaRighe(b.righe);
  const haImporto = b.testata.importo.trim() !== '';
  const importo = haImporto ? Number(b.testata.importo) : 0;
  const diff = Math.round((importo - somma) * 100) / 100;
  const uguali = haImporto && Math.abs(diff) < 0.01;
  const sommaSopra = (
    <span className="sopra-riga" title={uguali ? 'Somma righe uguale all’importo' : 'Somma righe diversa dall’importo: controlla (può essere IVA inclusa)'}>
      {uguali && <span className="spunta-ok" aria-label="Somma righe uguale all'importo">✓</span>}
      Somma righe {euro(somma)}
      {!uguali && <span className="somma-righe-avviso"> · diversa di {euro(Math.abs(diff))}</span>}
    </span>
  );

  // porta l'attenzione sul campo di un punto (controllo o campo incerto) selezionato dall'elenco
  const saltaAl = (nome: string) => {
    setCampo(nome);
    const mappa: Record<string, string> = { importo_totale: 'importo', totale: 'importo' };
    const el = document.querySelector<HTMLElement>(`[data-campo="${mappa[nome] ?? nome}"]`);
    el?.scrollIntoView({ block: 'nearest' });
    el?.focus();
  };

  async function salva() {
    if (!boll && !b.testata.numero.trim()) { setErrore('Il numero del documento è obbligatorio.'); return; }
    setErrore(''); setAttesa(true);
    try {
      const testata = boll
        ? { tipo: 'bollettino', fornitore_id: b.testata.fornitore_id || null, fornitore: b.testata.fornitore, mese: b.testata.mese || null, anno: b.testata.anno || null }
        : {
          tipo: b.testata.tipo, numero: b.testata.numero, data: b.testata.data, fornitore_id: b.testata.fornitore_id || null,
          fornitore: b.testata.fornitore, piva_cliente: b.testata.piva_cliente, piva_fornitore: b.testata.piva_fornitore,
          codice_cliente: b.testata.codice_cliente, cliente: b.testata.cliente, cliente_id: b.testata.cliente_id || null, importo: b.testata.importo,
          riferimento_fattura: b.testata.riferimento_fattura,
        };
      const righe = b.righe
        .filter((x) => x.i != null || RIGA_KEYS.some((k) => x[k].trim() !== ''))
        .map((x) => ({ i: x.i, ...Object.fromEntries(RIGA_KEYS.map((k) => [k, x[k]])) }));
      // i ✓ valgono per campo: il server segna verificati solo questi (e i valori cambiati)
      const verificatiInviati = [...verificati].filter((k) => !k.startsWith('righe[new-'));
      const res = await api<Dettaglio>('documenti/' + d.id, { testata, righe, verificati: verificatiInviati }, 'PUT');
      if (!res.ok) { setErrore(res.messaggio); return; }
      onSalvato(res.dati);
    } finally {
      setAttesa(false);
    }
  }

  return (
    <div className="velo velo-pieno" onClick={(e) => { if (e.target === e.currentTarget) onChiudi(); }}>
      <div className="affiancata" role="dialog" aria-modal="true" aria-label={'Correggi i dati letti · ' + (TIPO[b.testata.tipo] ?? 'Documento') + ' ' + b.testata.numero}>
        <div className="aff-testa" style={{ padding: '14px 20px' }}>
          <div>
            <h2>Correggi i dati letti · {TIPO[b.testata.tipo] ?? 'Documento'} {b.testata.numero}</h2>
            <p className="testo-tenue">A sinistra il documento, a destra i dati letti. Correggi o conferma i campi bordati.</p>
          </div>
          <button type="button" className="btn-chiudi" onClick={onChiudi} aria-label="Chiudi"><Icona nome="chiudi" /></button>
        </div>
        <div className="aff-corpo">
          <div className="aff-sx aff-pdf">
            <FileDocumento d={d} pagina={pagina} posizione={pos?.posizione ?? null} />
          </div>
          <div className="aff-dx">
            <p className="testo-tenue" style={{ fontSize: 12.5, margin: '0 0 10px' }}>
              {d.file_tipo === 'pdf'
                ? pos
                  ? `Posizione: pagina ${pagina ?? 1} (${pos.precisione ?? 'assente'})`
                  : 'Seleziona un campo per aprire il PDF alla sua pagina.'
                : 'La foto resta ferma: la posizione del valore non si evidenzia.'}
            </p>
            <div className="aff-riepilogo">
              <button type="button" className="riep-testa" aria-expanded={riepAperto} aria-controls="aff-riep-elenco"
                disabled={!nPunti} onClick={() => setRiepAperto((v) => !v)}>
                <Stato v={bassa ? 'errore' : nPunti ? 'attesa' : 'ok'}>
                  {bassa ? 'Affidabilità bassa' : nPunti ? 'Da controllare' : 'Lettura affidabile'}
                </Stato>
                <span>{nPunti ? nPunti + (nPunti === 1 ? ' punto da controllare' : ' punti da controllare') : 'tutti i campi sono controllati'}</span>
                {nPunti > 0 && <span className="riep-freccia" aria-hidden="true">{riepAperto ? '▾' : '▸'}</span>}
              </button>
              {nPunti > 0 && (
                <ul id="aff-riep-elenco" hidden={!riepAperto}>
                  {d.controlli.map((c) => (
                    <li key={c.codice + c.campo} className={c.grave ? 'grave' : ''}>
                      <button type="button" className="btn testo" onClick={() => saltaAl(c.campo)}>{c.testo}</button>
                    </li>
                  ))}
                  {restanti.map((c) => (
                    <li key={c.campo}>
                      <button type="button" className="btn testo" onClick={() => saltaAl(c.campo)}>{NOME_CAMPO[c.campo] ?? c.campo} · {Math.round((c.affidabilita ?? 0) * 100)}%</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <h3>Testata</h3>
            {boll ? (
              <div className="griglia-letti">
                {campoSi('fornitore_id', 'Fornitore',
                  <CampoRicerca entita={entitaFornitore} valore={b.testata.fornitore_id} onChange={(v) => t('fornitore_id', v)} testoIniziale={lettoFornitore} />)}
                {campoSi('fornitore', 'Fornitore letto',
                  <input data-campo="fornitore" value={b.testata.fornitore} onFocus={() => setCampo('fornitore')} onChange={(e) => t('fornitore', e.target.value)} />)}
                {campoSi('mese', 'Mese',
                  <select data-campo="mese" value={b.testata.mese} onFocus={() => setCampo('mese')} onChange={(e) => t('mese', e.target.value)}>
                    {MESI.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
                  </select>)}
                {campoSi('anno', 'Anno',
                  <input data-campo="anno" type="number" value={b.testata.anno} onFocus={() => setCampo('anno')} onChange={(e) => t('anno', e.target.value)} />)}
              </div>
            ) : (
              <>
                <div className="riga-letti tipo">
                  {campoSi('tipo', 'Tipo',
                    <select data-campo="tipo" value={b.testata.tipo} onFocus={() => setCampo('tipo')} onChange={(e) => t('tipo', e.target.value)}>
                      {Object.entries(TIPO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>, true)}
                  {campoSi('numero', 'Numero',
                    <input data-campo="numero" value={b.testata.numero} onFocus={() => setCampo('numero')} onChange={(e) => t('numero', e.target.value)} />)}
                  {campoSi('data', 'Data',
                    <input data-campo="data" type="date" value={b.testata.data} onFocus={() => setCampo('data')} onChange={(e) => t('data', e.target.value)} />)}
                  <CampoLetto x={af.get('importo_totale')} etichetta="Importo" verificato={verificato('importo_totale')} onConferma={() => conferma('importo_totale')} soglie={d.soglie} sopra={sommaSopra}>
                    <CampoEuro dataCampo="importo" valore={b.testata.importo} onFocus={() => setCampo('importo_totale')} onChange={(v) => t('importo', v)} />
                  </CampoLetto>
                  {b.testata.tipo === 'nota_credito' &&
                    campoSi('riferimento_fattura', 'Fattura stornata',
                      <input data-campo="riferimento_fattura" value={b.testata.riferimento_fattura} onFocus={() => setCampo('riferimento_fattura')} onChange={(e) => t('riferimento_fattura', e.target.value)} />)}
                </div>
                <div className="riga-letti cliente">
                  {campoSi('cliente', 'Cliente letto',
                    <input data-campo="cliente" value={b.testata.cliente} onFocus={() => setCampo('cliente')} onChange={(e) => t('cliente', e.target.value)} />)}
                  <button type="button" className="btn-arrow" aria-label="Cerca il cliente letto" title="Cerca il cliente letto"
                    disabled={!b.testata.cliente.trim() || !!b.testata.cliente_id} onClick={() => setCercaCliente((n) => n + 1)}>›</button>
                  {campoSi('cliente_id', 'Cliente',
                    <CampoRicerca entita={entitaCliente} contesto={{ fornitore_id: b.testata.fornitore_id, codice_cliente: b.testata.codice_cliente }} valore={b.testata.cliente_id} onChange={(v) => t('cliente_id', v)} cerca={{ q: b.testata.cliente, n: cercaCliente }}
                      onScelto={(r) => { const c = r as { piva?: string }; if (!b.testata.piva_cliente.trim()) t('piva_cliente', c.piva ?? ''); }} />)}
                  {campoSi('codice_cliente', 'Codice cliente',
                    <input data-campo="codice_cliente" value={b.testata.codice_cliente} onFocus={() => setCampo('codice_cliente')} onChange={(e) => t('codice_cliente', e.target.value)} />)}
                  {campoSi('piva_cliente', 'P.IVA cliente',
                    <input data-campo="piva_cliente" value={b.testata.piva_cliente} onFocus={() => setCampo('piva_cliente')} onChange={(e) => t('piva_cliente', e.target.value)} />)}
                </div>
                <div className="riga-letti fornitore">
                  {campoSi('fornitore', 'Fornitore letto',
                    <input data-campo="fornitore" value={b.testata.fornitore} onFocus={() => setCampo('fornitore')} onChange={(e) => t('fornitore', e.target.value)} />)}
                  <button type="button" className="btn-arrow" aria-label="Cerca il fornitore letto" title="Cerca il fornitore letto"
                    disabled={!b.testata.fornitore.trim() || !!b.testata.fornitore_id} onClick={() => setCercaFornitore((n) => n + 1)}>›</button>
                  {campoSi('fornitore_id', 'Fornitore',
                    <CampoRicerca entita={entitaFornitore} valore={b.testata.fornitore_id} onChange={(v) => t('fornitore_id', v)} cerca={{ q: b.testata.fornitore, n: cercaFornitore }} />)}
                  {campoSi('piva_fornitore', 'P.IVA fornitore',
                    <input data-campo="piva_fornitore" value={b.testata.piva_fornitore} onFocus={() => setCampo('piva_fornitore')} onChange={(e) => t('piva_fornitore', e.target.value)} />)}
                </div>
              </>
            )}
            <div className="righe-testa">
              <h3>Righe <span className="testo-tenue">{b.righe.length}</span></h3>
              <button type="button" className="btn sec piccolo" onClick={() => {
                setB((x) => ({ ...x, righe: [...x.righe, { i: null, codice: '', descrizione: '', quantita: '', prezzo: '', importo: '', numero_fattura: '', data_fattura: '', provvigione: '' }] }));
                setNuovaRiga(b.righe.length);
              }}>
                <Icona nome="piu" />Aggiungi riga
              </button>
            </div>
            <div className="tab-righe-box">
              <table className="tab-righe">
                <thead>
                  <tr>
                    <th>#</th>
                    {boll ? <><th>Documento</th><th>Data</th><th className="dx">Imponibile</th><th className="dx">Provvigione</th></>
                      : <><th>Articolo</th><th className="largo">Descrizione</th><th className="dx">Quantità</th><th className="dx">Prezzo</th><th className="dx">Importo</th></>}
                    <th aria-label="Elimina" />
                  </tr>
                </thead>
                <tbody>
                  {b.righe.map((x, idx) => {
                    const cella = (k: keyof BozzaRiga, tipo: 'text' | 'number' | 'euro' | 'date' = 'text') => {
                      const c = campoRiga(x, idx, k);
                      // una riga nuova non ha affidabilità: la chiave non deve scontrarsi con una riga tolta
                      const keyAff = x.i != null ? c : `righe[new-${idx}].${k}`;
                      const aff = af.get(keyAff)?.affidabilita ?? null;
                      const ver = verificato(keyAff);
                      const extra = k === 'descrizione' ? 'largo ' : k === 'codice' || k === 'numero_fattura' ? 'col-codice ' : '';
                      return (
                          <td key={k} className={extra + classeAff(aff, ver, d.soglie)}>
                          <div className="campo-riga">
                            {tipo === 'number' || tipo === 'euro'
                              ? <CampoEuro dataCampo={c} valore={String(x[k] ?? '')} valuta={tipo === 'euro'}
                                  onFocus={() => setCampo(keyAff)} onChange={(v) => { r(idx, k, v); conferma(keyAff); }} />
                              : <input data-campo={c} type={tipo} value={String(x[k] ?? '')}
                                  onFocus={() => setCampo(keyAff)} onChange={(e) => { r(idx, k, e.target.value); conferma(keyAff); }} />}
                            {ver && <span className="spunta-verde" title="Campo verificato" aria-label={'Verificato: riga ' + (idx + 1)}>✓</span>}
                            {aff != null && !ver && aff < d.soglie.soglia_ok && (
                              <button type="button" className="conferma-campo" title="Il valore è giusto: confermalo"
                                aria-label={'Conferma la riga ' + (idx + 1)} onClick={() => conferma(keyAff)}>✓</button>
                            )}
                          </div>
                        </td>
                      );
                    };
                    return (
                      <tr key={idx} data-riga={idx} className={x.i == null ? 'nuova' : undefined}>
                        <td className="testo-tenue">{idx + 1}</td>
                        {boll ? <>{cella('numero_fattura')}{cella('data_fattura', 'date')}{cella('importo', 'euro')}{cella('provvigione', 'euro')}</>
                          : <>{cella('codice')}{cella('descrizione')}{cella('quantita', 'number')}{cella('prezzo', 'euro')}{cella('importo', 'euro')}</>}
                        <td><button type="button" className="btn testo piccolo" title="Elimina la riga" aria-label={'Elimina la riga ' + (idx + 1)}
                          onClick={() => setB((z) => ({ ...z, righe: z.righe.filter((_, j) => j !== idx) }))}>✕</button></td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={boll ? 4 : 5} className="testo-tenue">Totale</td>
                    <td className="dx">{euro(boll ? b.righe.reduce((s, r) => s + (Number(r.provvigione) || 0), 0) : sommaRighe(b.righe))}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="modulo-errore" role="alert" hidden={!errore}>{errore}</p>
          </div>
        </div>
        <div className="aff-piede" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '12px 20px', borderTop: '1px solid var(--bordo-tenue)' }}>
          <button type="button" className="btn sec" onClick={onChiudi} disabled={attesa}>Annulla</button>
          <button type="button" className="btn" onClick={() => void salva()} disabled={attesa}>{attesa ? 'Attendi…' : 'Salva e ricalcola l’abbinamento'}</button>
        </div>
      </div>
    </div>
  );
}
