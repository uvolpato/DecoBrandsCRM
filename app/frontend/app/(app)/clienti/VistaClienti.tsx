'use client';
import { useRouter } from 'next/navigation';
import { Fragment, useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { DataTable, type Colonna } from '@/componenti/DataTable';
import { FilterBar } from '@/componenti/FilterBar';
import { FormModal } from '@/componenti/FormModal';
import { Icona } from '@/componenti/Icona';
import { Conferma } from '@/componenti/Modale';
import { Nota, Pagina, Pannello, type Azione } from '@/componenti/Pagina';
import { avviso, Dettagli, quando } from '@/componenti/Piccoli';
import { Schede } from '@/componenti/Schede';
import { usePuo, useUtente } from '@/componenti/Utente';
import { api } from '@/lib/api';
import { fornitore, subagente } from '@/lib/entita';

interface Cliente {
  id: string;
  ragione_sociale: string | null;
  piva: string | null;
  citta: string | null;
  codice_integra: string | null;
  attivo: boolean;
  agenzie: number;
  pratiche_aperte: number;
}

interface Agenzia {
  id: string;
  subagente_id: string;
  subagente: string | null;
  subagente_codice: string | null;
  fornitore_id: string;
  fornitore: string | null;
  codice_cliente_fornitore: string | null;
  sconto: number;
  pct_subagente: number | null;
  regola_mensile: string | null;
  valido_dal: string;
  valido_al: string | null;
}

interface Pratica {
  id: string;
  numero_ordine: string;
  data_ordine: string;
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
  attivo: boolean;
  agenzie: Agenzia[];
}

interface Fornitore { id: string; ragione_sociale: string | null; }
interface Subagente { id: string; codice: string; nome: string; cognome: string; }

let filtro: Record<string, string> = { vista: 'tutti', q: '' };
let schedaCliente = 'agenzie';

export function VistaClienti({ idSel }: { idSel?: string }) {
  const io = useUtente();
  const puo = usePuo();
  const router = useRouter();
  const [clienti, setClienti] = useState<Cliente[] | null>(null);
  const [dettaglio, setDettaglio] = useState<Dettaglio | null>(null);
  const [pratiche, setPratiche] = useState<Pratica[]>([]);
  const [fornitori, setFornitori] = useState<Fornitore[]>([]);
  const [subagenti, setSubagenti] = useState<Subagente[]>([]);
  const [valori, setValori] = useState(filtro);
  const [finestra, setFinestra] = useState<ReactNode>(null);
  const [errore, setErrore] = useState('');

  const carica = useCallback(async () => {
    const r = await api<Cliente[]>('clienti');
    if (r.ok) { setClienti(r.dati); setErrore(''); } else if (!clienti) setErrore(r.messaggio); else avviso(r.messaggio, true);
    const f = await api<Fornitore[]>('fornitori');
    if (f.ok) setFornitori(f.dati);
    const s = await api<Subagente[]>('subagenti');
    if (s.ok) setSubagenti(s.dati);
  }, [clienti]);

  const caricaDettaglio = useCallback(async (id: string) => {
    const r = await api<Dettaglio>('clienti/' + id);
    if (r.ok) setDettaglio(r.dati);
    else avviso(r.messaggio, true);
    const p = await api<Pratica[]>('clienti/' + id + '/pratiche');
    if (p.ok) setPratiche(p.dati);
  }, []);

  useEffect(() => { void carica(); }, []);
  useEffect(() => {
    if (!clienti || clienti.length === 0) return;
    const id = idSel ?? clienti[0].id;
    if (!idSel) router.replace('/clienti/' + id);
    void caricaDettaglio(id);
  }, [clienti, idSel, router, caricaDettaglio]);

  const cercati = useMemo(() => {
    const q = (valori.q ?? '').toLowerCase();
    const vista = valori.vista ?? 'tutti';
    return (clienti ?? []).filter((x) => {
      if (vista === 'con' && !(x.agenzie > 0)) return false;
      if (vista === 'senza' && x.agenzie > 0) return false;
      if (!q) return true;
      return [x.ragione_sociale, x.piva, x.codice_integra, x.citta].some((t) => (t ?? '').toLowerCase().includes(q));
    });
  }, [clienti, valori.q, valori.vista]);

  const nCon = (clienti ?? []).filter((x) => x.agenzie > 0).length;
  const nSenza = (clienti ?? []).filter((x) => x.agenzie === 0).length;

  const u = dettaglio;
  const chiudi = () => setFinestra(null);
  const chiedi = (titolo: string, testo: ReactNode, etichetta: string, pericolo = false) =>
    new Promise<boolean>((ok) => setFinestra(<Conferma titolo={titolo} testo={testo} etichetta={etichetta} pericolo={pericolo} onRisposta={(si) => { chiudi(); ok(si); }} />));

  const puoModificare = puo('dati.modifica');

  const oggi = new Date().toISOString().slice(0, 10);

  function nuovaAgenzia(x: Dettaglio) {
    setFinestra(
      <FormModal titolo={'Nuova agenzia per ' + (x.ragione_sociale ?? '')} conferma="Crea" colonne={2}
        campi={[
          { nome: 'fornitore_id', etichetta: 'Fornitore', tipo: 'ricerca', entita: fornitore, valore: fornitori[0]?.id ?? '' },
          { nome: 'subagente_id', etichetta: 'Subagente', tipo: 'ricerca', entita: subagente, valore: subagenti[0]?.id ?? '' },
          { nome: 'codice_cliente_fornitore', etichetta: 'Codice cliente presso il fornitore', tipo: 'testo', valore: '' },
          { nome: 'sconto', etichetta: 'Sconto %', tipo: 'testo', valore: '0' },
          { nome: 'pct_subagente', etichetta: '% al subagente (vuoto = scaglione)', tipo: 'testo', valore: '' },
          { nome: 'regola_mensile', etichetta: 'Provvigione al subagente', tipo: 'select', valore: '', opzioni: [{ value: '', label: 'Su ogni fattura' }, { value: 'prima', label: 'Una fattura al mese: la prima' }, { value: 'piu_alta', label: 'Una fattura al mese: la più alta' }] },
          { nome: 'valido_dal', etichetta: 'Valido dal', tipo: 'testo', valore: oggi },
          { nome: 'valido_al', etichetta: 'Valido al (vuoto = oggi)', tipo: 'testo', valore: '' },
        ]}
        onChiudi={chiudi}
        onConferma={async (v) => {
          const corpo: Record<string, unknown> = {
            fornitore_id: Number(v.fornitore_id),
            subagente_id: Number(v.subagente_id),
            codice_cliente_fornitore: v.codice_cliente_fornitore || null,
            sconto: Number(v.sconto ?? 0),
            pct_subagente: v.pct_subagente ? Number(v.pct_subagente) : null,
            regola_mensile: v.regola_mensile || null,
            valido_dal: v.valido_dal,
            valido_al: v.valido_al || null,
          };
          const r = await api<Agenzia>('clienti/' + x.id + '/agenzie', corpo);
          if (!r.ok) return r.messaggio;
          avviso('Agenzia creata');
          await carica();
          await caricaDettaglio(x.id);
          return undefined;
        }}
      />,
    );
  }

  function modificaAgenzia(x: Dettaglio, a: Agenzia) {
    setFinestra(
      <FormModal titolo="Modifica agenzia" conferma="Salva" colonne={2}
        campi={[
          { nome: 'fornitore_id', etichetta: 'Fornitore', tipo: 'ricerca', entita: fornitore, valore: a.fornitore_id },
          { nome: 'subagente_id', etichetta: 'Subagente', tipo: 'ricerca', entita: subagente, valore: a.subagente_id },
          { nome: 'codice_cliente_fornitore', etichetta: 'Codice cliente presso il fornitore', tipo: 'testo', valore: a.codice_cliente_fornitore ?? '' },
          { nome: 'sconto', etichetta: 'Sconto %', tipo: 'testo', valore: String(a.sconto) },
          { nome: 'pct_subagente', etichetta: '% al subagente (vuoto = scaglione)', tipo: 'testo', valore: a.pct_subagente === null ? '' : String(a.pct_subagente) },
          { nome: 'regola_mensile', etichetta: 'Provvigione al subagente', tipo: 'select', valore: a.regola_mensile ?? '', opzioni: [{ value: '', label: 'Su ogni fattura' }, { value: 'prima', label: 'Una fattura al mese: la prima' }, { value: 'piu_alta', label: 'Una fattura al mese: la più alta' }] },
          { nome: 'valido_dal', etichetta: 'Valido dal', tipo: 'testo', valore: a.valido_dal },
          { nome: 'valido_al', etichetta: 'Valido al (vuoto = oggi)', tipo: 'testo', valore: a.valido_al ?? '' },
        ]}
        onChiudi={chiudi}
        onConferma={async (v) => {
          const corpo: Record<string, unknown> = {
            fornitore_id: Number(v.fornitore_id),
            subagente_id: Number(v.subagente_id),
            codice_cliente_fornitore: v.codice_cliente_fornitore || null,
            sconto: Number(v.sconto ?? 0),
            pct_subagente: v.pct_subagente ? Number(v.pct_subagente) : null,
            regola_mensile: v.regola_mensile || null,
            valido_dal: v.valido_dal,
            valido_al: v.valido_al || null,
          };
          const r = await api<Agenzia>('clienti/' + x.id + '/agenzie/' + a.id, corpo, 'PUT');
          if (!r.ok) return r.messaggio;
          avviso('Agenzia salvata');
          await caricaDettaglio(x.id);
          return undefined;
        }}
      />,
    );
  }

  async function eliminaAgenzia(x: Dettaglio, a: Agenzia) {
    if (!(await chiedi('Eliminare questa agenzia?', 'L’agenzia verrà eliminata.', 'Elimina', true))) return;
    const r = await api('clienti/' + x.id + '/agenzie/' + a.id, undefined, 'DELETE');
    if (!r.ok) { avviso(r.messaggio, true); return; }
    avviso('Agenzia eliminata');
    await caricaDettaglio(x.id);
  }

  const colonneClienti: Colonna<Cliente>[] = [
    { key: 'ragione_sociale', header: 'Cliente', grow: true, cell: (x) => <><b>{x.ragione_sociale ?? '—'}</b><span className="sec-riga">{x.piva ?? ''}{x.codice_integra ? ' · ' + x.codice_integra : ''}{x.citta ? ' · ' + x.citta : ''}</span></> },
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
    { key: 'fornitore', header: 'Fornitore', grow: true, cell: (p) => p.fornitore ?? '—' },
    { key: 'data_ordine', header: 'Data', cell: (p) => quando(p.data_ordine) },
    { key: 'importo_merce', header: 'Importo', align: 'right', cell: (p) => (p.importo_merce === null ? '—' : p.importo_merce) },
    { key: 'stato', header: 'Stato', cell: (p) => p.stato },
  ];

  const pagina = (corpo?: ReactNode) => (
    <Pagina titolo="Clienti" pieno azioni={[]} sottotitolo="Anagrafica da Integra (sola lettura). Qui si gestiscono le agenzie (interscambio) del cliente.">
      {corpo}
      {finestra}
    </Pagina>
  );

  if (!clienti) return pagina(errore && <Pannello><div className="vuoto"><b>Clienti non caricati</b>{errore} <button type="button" className="btn sec piccolo" onClick={() => void carica()}>Riprova</button></div></Pannello>);

  const azioni: Azione[] = [];

  return pagina(
    <div className="colonne riempi" style={{ '--colonne': 'minmax(0,1.1fr) minmax(0,1fr)' } as CSSProperties}>
      <div className="pila riempi">
        <FilterBar valori={valori} onChange={(v) => { filtro = v; setValori(v); }} campi={[
          { nome: 'vista', tipo: 'segmenti', opzioni: [
            { value: 'tutti', label: 'Tutti', n: clienti.length },
            { value: 'con', label: 'Con agenzie', n: nCon },
            { value: 'senza', label: 'Senza agenzie', n: nSenza },
          ] },
          { nome: 'q', tipo: 'cerca', placeholder: 'Ragione sociale, P.IVA, codice' },
        ]} />
        <div className="riempi">
          <DataTable righe={cercati} filtro={valori.q} colonne={colonneClienti} chiave={(x) => x.id} ordinamentoIniziale={{ key: 'ragione_sociale', dir: 'asc' }}
            rowClass={(x) => (x.id === u?.id ? 'selezionata' : '')} onRowClick={(x) => router.push('/clienti/' + x.id)}
            emptyText="Nessun cliente" emptyHint="Cambia la ricerca." memoria="clienti" />
        </div>
      </div>
      <Pannello titolo={u?.ragione_sociale ?? 'Cliente'} riempi azioni={azioni}>
        {u && (
          <>
            <Dettagli inColonne voci={[
              { etichetta: 'Ragione sociale', valore: u.ragione_sociale ?? '—' },
              { etichetta: 'P.IVA', valore: u.piva ?? '—' },
              { etichetta: 'Indirizzo', valore: [u.indirizzo, u.cap, u.citta, u.provincia].filter(Boolean).join(' ') || '—' },
              { etichetta: 'Email', valore: u.email ?? '—' },
              { etichetta: 'Codice Integra', valore: u.codice_integra ?? '—' },
            ]} />
            <Nota>Anagrafica da Integra (sola lettura).</Nota>
            <Schede riempi attiva={schedaCliente} onCambia={(id) => { schedaCliente = id; }} memoria="clienti" schede={[
              {
                id: 'agenzie', etichetta: 'Agenzie', contenuto: () => (
                  <div className="pila riempi">
                    {puoModificare && <div className="azioni-riga"><button type="button" className="btn primario piccolo" onClick={() => nuovaAgenzia(u)}><Icona nome="piu" /> Aggiungi agenzia</button></div>}
                    <div className="riempi">
                      <DataTable righe={u.agenzie} colonne={[...colonneAgenzie, ...(puoModificare ? [{
                        key: 'azioni', header: '', align: 'center' as const, sortable: false,
                        cell: (a: Agenzia) => (
                          <span className="azioni-riga">
                            <button type="button" className="btn sec piccolo" onClick={(e) => { e.stopPropagation(); modificaAgenzia(u, a); }}>Modifica</button>
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
                  <div className="riempi">
                    <DataTable righe={pratiche} colonne={colonnePratiche} chiave={(p) => p.id} emptyText="Nessuna pratica" memoria="clienti-pratiche" />
                  </div>
                ),
              },
            ]} />
          </>
        )}
      </Pannello>
    </div>,
  );
}