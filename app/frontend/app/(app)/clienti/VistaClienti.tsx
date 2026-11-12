'use client';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { DataTable, type Colonna } from '@/componenti/DataTable';
import { FilterBar, type Valori } from '@/componenti/FilterBar';
import { FormAgenzia, type Agenzia } from '@/componenti/FormAgenzia';
import { CercaInIntegra } from '@/componenti/CercaInIntegra';
import { Icona } from '@/componenti/Icona';
import { Conferma } from '@/componenti/Modale';
import { Nota, Pagina, Pannello, type Azione } from '@/componenti/Pagina';
import { avviso, Dettagli, quando } from '@/componenti/Piccoli';
import { SagomaCorpo, SagomaElenco, useSagome } from '@/componenti/Sagoma';
import { Schede } from '@/componenti/Schede';
import { usePuo, useUtente } from '@/componenti/Utente';
import { api } from '@/lib/api';
import { useMemoria } from '@/lib/memoria';
import { fornitore, subagente } from '@/lib/entita';

interface Cliente {
  id: string;
  ragione_sociale: string | null;
  piva: string | null;
  citta: string | null;
  codice_integra: string | null;
  soggetto_codice: string | null;
  attivo: boolean;
  agenzie: number;
  fornitori_ids: string[];
  subagenti_ids: string[];
  pratiche_aperte: number;
}

interface Pratica {
  id: string;
  numero_ordine: string;
  data_ordine: string;
  fornitore_id: string;
  fornitore: string | null;
  importo_merce: number | null;
  stato: string;
}

interface Dettaglio {
  id: string;
  ragione_sociale: string | null;
  piva: string | null;
  indirizzo: string | null;
  cap: string | null;
  citta: string | null;
  provincia: string | null;
  email: string | null;
  codice_integra: string | null;
  soggetto_codice: string | null;
  attivo: boolean;
  agenzie: Agenzia[];
}

let schedaCliente = 'agenzie';

export function VistaClienti({ idSel }: { idSel?: string }) {
  const io = useUtente();
  const puo = usePuo();
  const router = useRouter();
  const [clienti, setClienti] = useState<Cliente[] | null>(null);
  const [dettaglio, setDettaglio] = useState<Dettaglio | null>(null);
  const [pratiche, setPratiche] = useState<Pratica[] | null>(null);
  const [valori, setValori] = useMemoria<Valori>('filtri', { vista: 'tutti', q: '', fornitori: [], subagenti: [] });
  const [valoriAg, setValoriAg] = useMemoria<Valori>('filtri-agenzie', { fornitori: [], subagenti: [] });
  const [valoriPr, setValoriPr] = useMemoria<Valori>('filtri-pratiche', { vista: 'aperte', fornitori: [], q: '' });
  const [finestra, setFinestra] = useState<ReactNode>(null);
  const [errore, setErrore] = useState('');

  const carica = useCallback(async () => {
    const r = await api<Cliente[]>('clienti');
    if (r.ok) { setClienti(r.dati); setErrore(''); } else if (!clienti) setErrore(r.messaggio); else avviso(r.messaggio, true);
  }, [clienti]);

  const caricaDettaglio = useCallback(async (id: string) => {
    setPratiche(null);
    const r = await api<Dettaglio>('clienti/' + id);
    if (r.ok) setDettaglio(r.dati);
    else avviso(r.messaggio, true);
    const p = await api<Pratica[]>('clienti/' + id + '/pratiche');
    setPratiche(p.ok ? p.dati : []);
  }, []);

  useEffect(() => { void carica(); }, []);
  useEffect(() => {
    if (!clienti || clienti.length === 0) return;
    const id = idSel ?? clienti[0].id;
    if (!idSel) router.replace('/clienti/' + id);
    void caricaDettaglio(id);
  }, [clienti, idSel, router, caricaDettaglio]);

  const cercati = useMemo(() => {
    const q = String(valori.q ?? '').toLowerCase();
    const fs = valori.fornitori as string[], ss = valori.subagenti as string[];
    return (clienti ?? []).filter((x) => {
      if (fs.length && !x.fornitori_ids.some((i) => fs.includes(i))) return false;
      if (ss.length && !x.subagenti_ids.some((i) => ss.includes(i))) return false;
      if (!q) return true;
      return [x.ragione_sociale, x.piva, x.codice_integra, x.citta].some((t) => (t ?? '').toLowerCase().includes(q));
    });
  }, [clienti, valori.q, valori.fornitori, valori.subagenti]);
  // D-23: i numeri dei segmenti contano con gli altri filtri
  const nCon = cercati.filter((x) => x.agenzie > 0).length;
  const nSenza = cercati.filter((x) => x.agenzie === 0).length;
  const righe = cercati.filter((x) => (valori.vista === 'con' ? x.agenzie > 0 : valori.vista === 'senza' ? x.agenzie === 0 : true));
  const agenzieFiltrate = useMemo(() => {
    const fs = valoriAg.fornitori as string[], ss = valoriAg.subagenti as string[];
    return (dettaglio?.agenzie ?? []).filter((a) => (!fs.length || fs.includes(a.fornitore_id)) && (!ss.length || ss.includes(a.subagente_id)));
  }, [dettaglio, valoriAg.fornitori, valoriAg.subagenti]);

  const u = dettaglio;
  const chiudi = () => setFinestra(null);
  const chiedi = (titolo: string, testo: ReactNode, etichetta: string, pericolo = false) =>
    new Promise<boolean>((ok) => setFinestra(<Conferma titolo={titolo} testo={testo} etichetta={etichetta} pericolo={pericolo} onRisposta={(si) => { chiudi(); ok(si); }} />));

  const puoModificare = puo('dati.modifica');
  const sagome = useSagome(!clienti);

  async function eliminaAgenzia(x: Dettaglio, a: Agenzia) {
    if (!(await chiedi('Eliminare questa agenzia?', 'L’agenzia verrà eliminata.', 'Elimina', true))) return;
    const r = await api('clienti/' + x.id + '/agenzie/' + a.id, undefined, 'DELETE');
    if (!r.ok) { avviso(r.messaggio, true); return; }
    avviso('Agenzia eliminata');
    await caricaDettaglio(x.id);
  }

  const colonneClienti: Colonna<Cliente>[] = [
    { key: 'ragione_sociale', header: 'Cliente', grow: true, cell: (x) => <><b>{x.ragione_sociale ?? '—'}</b><span className="sec-riga">{[x.soggetto_codice, x.piva, x.codice_integra, x.citta].filter(Boolean).join(' · ')}</span></> },
    { key: 'agenzie', header: 'Agenzie', align: 'center', cell: (x) => String(x.agenzie) },
    { key: 'pratiche_aperte', header: 'Pratiche aperte', align: 'center', cell: (x) => String(x.pratiche_aperte) },
  ];

  const colonneAgenzie: Colonna<Agenzia>[] = [
    { key: 'fornitore', header: 'Fornitore', grow: true, cell: (a) => <><b>{a.fornitore ?? '—'}</b><span className="sec-riga">{a.subagente ? 'seguito da ' + a.subagente : ''}</span></> },
    { key: 'codice_cliente_fornitore', header: 'Codice cliente', cell: (a) => a.codice_cliente_fornitore ?? '—' },
    { key: 'sconto', header: 'Sconto', align: 'center', cell: (a) => a.sconto + ' %' },
    { key: 'pct_subagente', header: '% subagente', align: 'center', cell: (a) => (a.pct_subagente === null ? '—' : a.pct_subagente + ' %') },
    { key: 'regola_mensile', header: 'Regola', cell: (a) => a.regola_mensile === 'prima' ? 'una fattura: la prima' : a.regola_mensile === 'piu_alta' ? 'una fattura: la più alta' : 'ogni fattura' },
    { key: 'periodo', header: 'Periodo', cell: (a) => a.valido_dal + (a.valido_al ? ' → ' + a.valido_al : '') },
  ];

  const colonnePratiche: Colonna<Pratica>[] = [
    { key: 'numero_ordine', header: 'Pratica', cell: (p) => p.numero_ordine },
    { key: 'fornitore', header: 'Fornitore', grow: true, cell: (p) => p.fornitore ?? '-' },
    { key: 'data_ordine', header: 'Data', cell: (p) => quando(p.data_ordine) },
    { key: 'importo_merce', header: 'Importo', align: 'right', cell: (p) => (p.importo_merce === null ? '-' : p.importo_merce) },
    { key: 'stato', header: 'Stato', cell: (p) => p.stato },
  ];

  // filtri standard della scheda Pratiche (D-22): i conteggi dei segmenti valgono con gli altri filtri
  const praticheFiltrate = useMemo(() => {
    const tutte = pratiche ?? [];
    const q = String(valoriPr.q ?? '').trim().toLowerCase();
    const scelti = (valoriPr.fornitori as string[] | undefined) ?? [];
    const base = tutte.filter((p) => (!scelti.length || scelti.includes(p.fornitore_id)) && (!q || p.numero_ordine.toLowerCase().includes(q)));
    const dentro = (p: Pratica, v: string) => (v === 'aperte' ? p.stato !== 'fatturata' : v === 'ritardo' ? p.stato === 'scaduta' : v === 'fatturate' ? p.stato === 'fatturata' : true);
    const conteggi = Object.fromEntries(['aperte', 'ritardo', 'fatturate', 'tutte'].map((v) => [v, base.filter((p) => dentro(p, v)).length]));
    return { righe: base.filter((p) => dentro(p, String(valoriPr.vista ?? 'aperte'))), conteggi, fornitori: [...new Set(tutte.map((p) => p.fornitore_id))] };
  }, [pratiche, valoriPr]);

  const pagina = (corpo?: ReactNode) => (
    <Pagina titolo="Clienti" pieno azioni={[]} sottotitolo="Anagrafica da Integra (sola lettura). Qui si gestiscono le agenzie (interscambio) del cliente.">
      {corpo}
      {finestra}
    </Pagina>
  );

  const filtri = (
    <FilterBar valori={valori} onChange={setValori} caricando={sagome} campi={[
      { nome: 'vista', tipo: 'segmenti', opzioni: [
        { value: 'tutti', label: 'Tutti', n: clienti ? cercati.length : undefined },
        { value: 'con', label: 'Con agenzie', n: clienti ? nCon : undefined },
        { value: 'senza', label: 'Senza agenzie', n: clienti ? nSenza : undefined },
      ] },
      { nome: 'q', tipo: 'cerca', placeholder: 'Ragione sociale, P.IVA, codice' },
      { nome: 'fornitori', tipo: 'ricerca', entita: fornitore, multipla: true, placeholder: 'Tutti i fornitori' },
      { nome: 'subagenti', tipo: 'ricerca', entita: subagente, multipla: true, placeholder: 'Tutti i subagenti' },
    ]} riepilogo />
  );

  if (!clienti) return pagina(errore
    ? <Pannello><div className="vuoto"><b>Clienti non caricati</b>{errore} <button type="button" className="btn sec piccolo" onClick={() => void carica()}>Riprova</button></div></Pannello>
    : sagome && <SagomaElenco filtri={filtri} larghezze="minmax(0,1.1fr) minmax(0,1fr)" />);

  const azioni: Azione[] = [];

  return pagina(
    <div className="colonne riempi" style={{ '--colonne': 'minmax(0,1.1fr) minmax(0,1fr)' } as CSSProperties}>
      <div className="pila riempi clienti-filtri">
        {filtri}
        <CercaInIntegra tipo="cliente" onImportato={async (id) => { await carica(); router.push('/clienti/' + id); }} />
        <div className="riempi">
          <DataTable righe={righe} filtro={JSON.stringify(valori)} colonne={colonneClienti} chiave={(x) => x.id} ordinamentoIniziale={{ key: 'ragione_sociale', dir: 'asc' }}
            rowClass={(x) => (x.id === u?.id ? 'selezionata' : '')} onRowClick={(x) => router.push('/clienti/' + x.id)}
            emptyText="Nessun cliente" emptyHint="Cambia la ricerca." memoria="clienti" />
        </div>
      </div>
      <Pannello titolo={u?.ragione_sociale ?? 'Cliente'} riempi azioni={azioni}>
        {u ? (
          <>
            <Dettagli inColonne voci={[
              { etichetta: 'Ragione sociale', valore: u.ragione_sociale ?? '—' },
              { etichetta: 'P.IVA', valore: u.piva ?? '—' },
              { etichetta: 'Indirizzo', valore: [u.indirizzo, u.cap, u.citta, u.provincia].filter(Boolean).join(' ') || '—' },
              { etichetta: 'Email', valore: u.email ?? '—' },
              { etichetta: 'Codice soggetto', valore: u.soggetto_codice ?? '—' },
              { etichetta: 'Codice Integra', valore: u.codice_integra ?? '—' },
            ]} />
            <Nota>Anagrafica da Integra (sola lettura).</Nota>
            <Schede riempi attiva={schedaCliente} onCambia={(id) => { schedaCliente = id; }} memoria="clienti" schede={[
              {
                id: 'agenzie', etichetta: 'Agenzie', contenuto: () => (
                  <div className="pila riempi">
                    {puoModificare && <div className="azioni-riga"><button type="button" className="btn primario piccolo"
                      onClick={() => setFinestra(<FormAgenzia cliente={{ id: u.id, nome: u.ragione_sociale }} onSalvata={async () => { await carica(); await caricaDettaglio(u.id); }} onChiudi={chiudi} />)}>
                      <Icona nome="piu" /> Aggiungi agenzia</button></div>}
                    <FilterBar valori={valoriAg} onChange={setValoriAg} riepilogo campi={[
                      { nome: 'fornitori', tipo: 'ricerca', entita: fornitore, multipla: true, placeholder: 'Tutti i fornitori' },
                      { nome: 'subagenti', tipo: 'ricerca', entita: subagente, multipla: true, placeholder: 'Tutti i subagenti' },
                    ]} />
                    <div className="riempi">
                      <DataTable righe={agenzieFiltrate} filtro={JSON.stringify(valoriAg)} colonne={[...colonneAgenzie, ...(puoModificare ? [{
                        key: 'azioni', header: '', align: 'center' as const, sortable: false,
                        cell: (a: Agenzia) => (
                          <span className="azioni-riga">
                            <button type="button" className="btn sec piccolo" onClick={(e) => { e.stopPropagation(); setFinestra(<FormAgenzia cliente={{ id: u.id, nome: u.ragione_sociale }} agenzia={a} onSalvata={async () => { await caricaDettaglio(u.id); }} onChiudi={chiudi} />); }}>Modifica</button>
                            <button type="button" className="btn pericolo piccolo" onClick={(e) => { e.stopPropagation(); void eliminaAgenzia(u, a); }}>Elimina</button>
                          </span>
                        ),
                      }] : [])]} chiave={(a) => a.id} emptyText="Nessuna agenzia" memoria="clienti-agenzie" />
                    </div>
                  </div>
                ),
              },
              {
                id: 'pratiche', etichetta: 'Pratiche', contenuto: () => (
                  <div className="pila riempi">
                    <FilterBar valori={valoriPr} onChange={setValoriPr} riepilogo caricando={!pratiche} campi={[
                      {
                        nome: 'vista', tipo: 'segmenti', etichetta: 'Stato', opzioni: [
                          { value: 'aperte', label: 'Aperte', n: praticheFiltrate.conteggi.aperte },
                          { value: 'ritardo', label: 'In ritardo', n: praticheFiltrate.conteggi.ritardo },
                          { value: 'fatturate', label: 'Fatturate', n: praticheFiltrate.conteggi.fatturate },
                          { value: 'tutte', label: 'Tutte', n: praticheFiltrate.conteggi.tutte },
                        ],
                      },
                      { nome: 'fornitori', tipo: 'ricerca', entita: fornitore, multipla: true, etichetta: 'Fornitore', placeholder: 'Tutti i fornitori', contesto: { limita: praticheFiltrate.fornitori } },
                      { nome: 'q', tipo: 'cerca', etichetta: 'Numero', placeholder: 'Numero' },
                    ]} />
                    <div className="riempi">
                      <DataTable righe={praticheFiltrate.righe} colonne={colonnePratiche} chiave={(p) => p.id} caricando={!pratiche}
                        filtro={JSON.stringify(valoriPr)} memoria="clienti-pratiche" emptyText="Nessuna pratica" emptyHint="Prova a togliere il filtro." />
                    </div>
                  </div>
                ),
              },
            ]} />
          </>
        ) : <SagomaCorpo />}
      </Pannello>
    </div>,
  );
}