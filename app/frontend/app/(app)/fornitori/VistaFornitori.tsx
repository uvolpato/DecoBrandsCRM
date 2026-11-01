'use client';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { DataTable, type Colonna } from '@/componenti/DataTable';
import { FilterBar } from '@/componenti/FilterBar';
import { FormModal } from '@/componenti/FormModal';
import { Nota, Pagina, Pannello, type Azione } from '@/componenti/Pagina';
import { avviso, Dettagli, quando } from '@/componenti/Piccoli';
import { Schede } from '@/componenti/Schede';
import { usePuo } from '@/componenti/Utente';
import { api } from '@/lib/api';

interface Fornitore {
  id: string;
  ragione_sociale: string | null;
  piva: string | null;
  paese: string | null;
  codice_integra: string | null;
  giorni_attesa_conferma: number;
  giorno_bollettino: number;
  tipo_provvigione: string;
  giorni_incasso: number;
  note: string | null;
  attivo: boolean;
  scaglioni: number;
}
interface Scaglione {
  id: string;
  sconto_min: number;
  pct_agente: number;
  pct_subagente: number;
  valido_dal: string;
}
interface ClienteSeguito {
  id: string;
  cliente: string | null;
  piva: string | null;
  subagente: string | null;
  codice_cliente_fornitore: string | null;
  sconto: number;
  pct_subagente: number | null;
  regola_mensile: string | null;
  valido_dal: string;
  valido_al: string | null;
}
type Dettaglio = Omit<Fornitore, 'scaglioni'> & {
  scaglioni: Scaglione[];
  clienti_seguiti: ClienteSeguito[];
};

let filtro: Record<string, string> = { q: '' };
let schedaFornitore = 'percentuali';

export function VistaFornitori({ idSel }: { idSel?: string }) {
  const puo = usePuo();
  const router = useRouter();
  const [fornitori, setFornitori] = useState<Fornitore[] | null>(null);
  const [dettaglio, setDettaglio] = useState<Dettaglio | null>(null);
  const [valori, setValori] = useState(filtro);
  const [finestra, setFinestra] = useState<ReactNode>(null);
  const [errore, setErrore] = useState('');

  const carica = useCallback(async () => {
    const r = await api<Fornitore[]>('fornitori');
    if (r.ok) { setFornitori(r.dati); setErrore(''); } else if (!fornitori) setErrore(r.messaggio); else avviso(r.messaggio, true);
  }, [fornitori]);

  const caricaDettaglio = useCallback(async (id: string) => {
    const r = await api<Dettaglio>('fornitori/' + id);
    if (r.ok) setDettaglio(r.dati); else avviso(r.messaggio, true);
  }, []);

  useEffect(() => {
    void carica();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!fornitori || fornitori.length === 0) return;
    const id = idSel ?? fornitori[0].id;
    if (!idSel) router.replace('/fornitori/' + id);
    void caricaDettaglio(id);
  }, [fornitori, idSel, router, caricaDettaglio]);

  const cercati = useMemo(() => {
    const q = (valori.q ?? '').toLowerCase();
    return (fornitori ?? []).filter((x) => !q || [x.ragione_sociale, x.piva, x.codice_integra, x.paese].some((t) => (t ?? '').toLowerCase().includes(q)));
  }, [fornitori, valori.q]);

  const u = dettaglio;
  const chiudi = () => setFinestra(null);
  const puoModificare = puo('dati.condizioni');

  function modificaRegole(x: Dettaglio) {
    setFinestra(
      <FormModal titolo={'Modifica le regole di ' + (x.ragione_sociale ?? '')} conferma="Salva" colonne={2}
        campi={[
          { nome: 'giorni_attesa_conferma', etichetta: 'Giorni di attesa della conferma', tipo: 'testo', valore: String(x.giorni_attesa_conferma) },
          { nome: 'giorno_bollettino', etichetta: 'Giorno del bollettino (mese successivo)', tipo: 'testo', valore: String(x.giorno_bollettino) },
          { nome: 'tipo_provvigione', etichetta: 'Tipo di provvigione', tipo: 'select', valore: x.tipo_provvigione, opzioni: [{ value: 'maturato', label: 'Sul maturato' }, { value: 'fatturato', label: 'Sul fatturato' }] },
          { nome: 'giorni_incasso', etichetta: 'Giorni per l’incasso dal cliente', tipo: 'testo', valore: String(x.giorni_incasso) },
          { nome: 'note', etichetta: 'Note', tipo: 'testo', valore: x.note ?? '', largo: true },
        ]}
        onChiudi={chiudi}
        onConferma={async (v) => {
          const corpo: Record<string, unknown> = {};
          if (v.giorni_attesa_conferma !== undefined) corpo.giorni_attesa_conferma = Number(v.giorni_attesa_conferma);
          if (v.giorno_bollettino !== undefined) corpo.giorno_bollettino = Number(v.giorno_bollettino);
          if (v.tipo_provvigione !== undefined) corpo.tipo_provvigione = v.tipo_provvigione;
          if (v.giorni_incasso !== undefined) corpo.giorni_incasso = Number(v.giorni_incasso);
          if (v.note !== undefined) corpo.note = v.note;
          const r = await api<Dettaglio>('fornitori/' + x.id, corpo, 'PUT');
          if (!r.ok) return r.messaggio;
          avviso('Regole salvate');
          await carica();
          await caricaDettaglio(x.id);
          return undefined;
        }}
      />,
    );
  }

  const colonneFornitori: Colonna<Fornitore>[] = [
    { key: 'ragione_sociale', header: 'Fornitore', grow: true, cell: (x) => <><b>{x.ragione_sociale ?? '—'}</b><span className="sec-riga">{x.piva ?? ''}{x.codice_integra ? ' · ' + x.codice_integra : ''}</span></> },
    { key: 'scaglioni', header: 'Scaglioni', align: 'center', cell: (x) => String(x.scaglioni) },
    { key: 'giorni_attesa_conferma', header: 'Attesa conferma', align: 'center', cell: (x) => x.giorni_attesa_conferma + ' gg' },
  ];

  const colonneScaglioni: Colonna<Scaglione>[] = [
    { key: 'sconto_min', header: 'Sconto minimo', align: 'center', cell: (s) => s.sconto_min + ' %' },
    { key: 'pct_agente', header: '% a Decobrands', align: 'center', cell: (s) => s.pct_agente + ' %' },
    { key: 'pct_subagente', header: '% al subagente', align: 'center', cell: (s) => s.pct_subagente + ' %' },
    { key: 'valido_dal', header: 'In vigore dal', align: 'center', cell: (s) => quando(s.valido_dal) },
  ];

  const colonneClienti: Colonna<ClienteSeguito>[] = [
    { key: 'cliente', header: 'Cliente', grow: true, cell: (c) => <><b>{c.cliente ?? '—'}</b><span className="sec-riga">{c.piva ?? ''}</span></> },
    { key: 'subagente', header: 'Seguito da', cell: (c) => c.subagente ?? '—' },
    { key: 'codice_cliente_fornitore', header: 'Codice cliente', cell: (c) => c.codice_cliente_fornitore ?? '—' },
    { key: 'sconto', header: 'Sconto', align: 'center', cell: (c) => c.sconto + ' %' },
    { key: 'periodo', header: 'Periodo', cell: (c) => (c.valido_dal + (c.valido_al ? ' → ' + c.valido_al : '')) },
  ];

  const pagina = (corpo?: ReactNode) => (
    <Pagina titolo="Fornitori" pieno
      sottotitolo="Anagrafica da Integra (sola lettura). Qui si modificano solo le regole del CRM: giorni di attesa della conferma, bollettino, tipo di provvigione, giorni per l’incasso, note.">
      {corpo}
      {finestra}
    </Pagina>
  );

  if (!fornitori) return pagina(errore && <Pannello><div className="vuoto"><b>Fornitori non caricati</b>{errore} <button type="button" className="btn sec piccolo" onClick={() => void carica()}>Riprova</button></div></Pannello>);

  const azioni: Azione[] = puoModificare && u ? [{ etichetta: 'Modifica le regole', icona: 'impostazioni', onClick: () => modificaRegole(u) }] : [];

  return pagina(
    <div className="colonne riempi" style={{ '--colonne': 'minmax(0,1.15fr) minmax(0,1fr)' } as CSSProperties}>
      <div className="pila riempi">
        <FilterBar valori={valori} onChange={(v) => { filtro = v; setValori(v); }} campi={[
          { nome: 'q', tipo: 'cerca', placeholder: 'Ragione sociale, P.IVA o codice' },
        ]} />
        <div className="riempi">
          <DataTable righe={cercati} filtro={valori.q} colonne={colonneFornitori} chiave={(x) => x.id} ordinamentoIniziale={{ key: 'ragione_sociale', dir: 'asc' }}
            rowClass={(x) => (x.id === u?.id ? 'selezionata' : '')} onRowClick={(x) => router.push('/fornitori/' + x.id)}
            emptyText="Nessun fornitore" emptyHint="Cambia la ricerca." memoria="fornitori" />
        </div>
      </div>
      <Pannello titolo={u?.ragione_sociale ?? 'Fornitore'} riempi azioni={azioni}>
        {u && (
          <>
            <Dettagli inColonne voci={[
              { etichetta: 'Ragione sociale', valore: u.ragione_sociale ?? '—' },
              { etichetta: 'P.IVA', valore: u.piva ?? '—' },
              { etichetta: 'Paese', valore: u.paese ?? '—' },
              { etichetta: 'Codice Integra', valore: u.codice_integra ?? '—' },
              { etichetta: 'Giorni di attesa della conferma', valore: u.giorni_attesa_conferma },
              { etichetta: 'Giorno del bollettino', valore: u.giorno_bollettino },
              { etichetta: 'Tipo di provvigione', valore: u.tipo_provvigione === 'maturato' ? 'Sul maturato' : 'Sul fatturato' },
              { etichetta: 'Giorni per l’incasso', valore: u.giorni_incasso },
              { etichetta: 'Note', valore: u.note ?? '—' },
            ]} />
            <Schede riempi attiva={schedaFornitore} onCambia={(id) => { schedaFornitore = id; }} memoria="fornitori" schede={[
              {
                id: 'percentuali', etichetta: 'Percentuali', contenuto: () => (
                  <div className="pila riempi">
                    <div className="riempi">
                      <DataTable righe={u.scaglioni} colonne={colonneScaglioni} chiave={(s) => s.id} emptyText="Nessuno scaglione" />
                    </div>
                    <Nota>Le percentuali non si modificano: le nuove percentuali da una data arrivano con F1-A5.</Nota>
                  </div>
                ),
              },
              {
                id: 'clienti', etichetta: 'Clienti seguiti', contenuto: () => (
                  <div className="riempi">
                    <DataTable righe={u.clienti_seguiti} colonne={colonneClienti} chiave={(c) => c.id} emptyText="Nessun cliente seguito" />
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
