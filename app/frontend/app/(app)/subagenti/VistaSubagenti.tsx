'use client';
import { useRouter } from 'next/navigation';
import { Fragment, useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { DataTable, type Colonna } from '@/componenti/DataTable';
import { FilterBar } from '@/componenti/FilterBar';
import { FormModal } from '@/componenti/FormModal';
import { Icona } from '@/componenti/Icona';
import { Conferma } from '@/componenti/Modale';
import { Nota, Pagina, Pannello, type Azione } from '@/componenti/Pagina';
import { avviso, Dettagli, quando, Stato } from '@/componenti/Piccoli';
import { Schede } from '@/componenti/Schede';
import { usePuo, useUtente } from '@/componenti/Utente';
import { api } from '@/lib/api';
import { agente } from '@/lib/entita';

interface Agente {
  id: string;
  codice: string;
  nome: string;
  cognome: string;
  email: string | null;
  telefono: string | null;
  attivo: boolean;
  subagenti: number;
}

interface Subagente {
  id: string;
  agente_id: string;
  agente: string | null;
  agente_codice: string | null;
  codice: string;
  nome: string;
  cognome: string;
  email: string | null;
  attivo: boolean;
}

let filtro: Record<string, string> = { vista: 'attivi', q: '' };
let schedaSubagente = 'dati';
const VISTE: Record<string, (x: Subagente) => boolean> = { attivi: (x) => x.attivo, disattivati: (x) => !x.attivo, tutti: () => true };

export function VistaSubagenti({ idSel }: { idSel?: string }) {
  const io = useUtente();
  const puo = usePuo();
  const router = useRouter();
  const [subagenti, setSubagenti] = useState<Subagente[] | null>(null);
  const [agenti, setAgenti] = useState<Agente[] | null>(null);
  const [valori, setValori] = useState(filtro);
  const [finestra, setFinestra] = useState<ReactNode>(null);
  const [errore, setErrore] = useState('');

  const carica = useCallback(async () => {
    const r = await api<Subagente[]>('subagenti');
    if (r.ok) { setSubagenti(r.dati); setErrore(''); } else if (!subagenti) setErrore(r.messaggio); else avviso(r.messaggio, true);
    const a = await api<Agente[]>('agenti');
    if (a.ok) setAgenti(a.dati);
  }, [subagenti]);

  useEffect(() => {
    void carica();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!subagenti || subagenti.length === 0) return;
    const id = idSel ?? subagenti[0].id;
    if (!idSel) router.replace('/subagenti/' + id);
  }, [subagenti, idSel, router]);

  const cercati = useMemo(() => {
    const q = (valori.q ?? '').toLowerCase();
    return (subagenti ?? []).filter((x) => !q || [x.nome, x.cognome, x.codice, x.email ?? ''].some((t) => t.toLowerCase().includes(q)));
  }, [subagenti, valori.q]);
  const righe = useMemo(() => cercati.filter(VISTE[valori.vista]), [cercati, valori.vista]);

  const chiudi = () => setFinestra(null);
  const chiedi = (titolo: string, testo: ReactNode, etichetta: string, pericolo = false) =>
    new Promise<boolean>((ok) => setFinestra(<Conferma titolo={titolo} testo={testo} etichetta={etichetta} pericolo={pericolo} onRisposta={(si) => { chiudi(); ok(si); }} />));

  const u = subagenti?.find((x) => x.id === idSel) ?? subagenti?.[0] ?? null;
  const puoModificare = puo('dati.modifica');

  function modifica(x: Subagente | null) {
    const opzioniAgenti = (agenti ?? []).filter((a) => a.attivo).map((a) => ({ value: a.id, label: a.cognome + ' ' + a.nome + ' (' + a.codice + ')' }));
    setFinestra(
      <FormModal titolo={x ? 'Modifica ' + x.cognome + ' ' + x.nome : 'Nuovo subagente'} conferma={x ? 'Salva' : 'Crea'} colonne={2}
        campi={[
          { nome: 'agente_id', etichetta: 'Agente', tipo: 'ricerca', entita: agente, valore: x?.agente_id ?? (agenti?.[0]?.id ?? ''), largo: true },
          { nome: 'codice', etichetta: 'Codice', valore: x?.codice ?? '' },
          { nome: 'nome', etichetta: 'Nome', valore: x?.nome ?? '' },
          { nome: 'cognome', etichetta: 'Cognome', valore: x?.cognome ?? '' },
          { nome: 'email', etichetta: 'Email', valore: x?.email ?? '', largo: true },
        ]}
        onChiudi={chiudi}
        onConferma={async (v) => {
          const corpo: Record<string, unknown> = {
            codice: v.codice,
            nome: v.nome,
            cognome: v.cognome,
            email: v.email || null,
            agente_id: Number(v.agente_id),
          };
          const r = x ? await api<Subagente>('subagenti/' + x.id, corpo, 'PUT') : await api<Subagente>('subagenti', corpo);
          if (!r.ok) return r.messaggio;
          avviso(x ? 'Subagente salvato' : 'Subagente creato');
          if (!x) router.push('/subagenti/' + r.dati.id);
          await carica();
        }}
      />,
    );
  }

  async function attiva(x: Subagente, si: boolean) {
    const r = await api('subagenti/' + x.id + '/attivo', { attivo: si });
    avviso(!r.ok ? r.messaggio : si ? 'Subagente riattivato' : 'Subagente disattivato', !r.ok);
    await carica();
  }
  async function elimina(x: Subagente) {
    if (!(await chiedi('Eliminare ' + x.cognome + ' ' + x.nome + '?', 'Eliminazione definitiva se non ha pratiche o abbinamenti.', 'Elimina', true))) return;
    const r = await api('subagenti/' + x.id, undefined, 'DELETE');
    if (!r.ok) { avviso(r.messaggio, true); return; }
    avviso('Subagente eliminato');
    router.push('/subagenti');
    await carica();
  }

  const colonne: Colonna<Subagente>[] = [
    { key: 'nome', header: 'Subagente', grow: true, cell: (x) => <><b>{x.cognome} {x.nome}</b>{x.attivo === false && <> <Stato v="neutro">non attivo</Stato></>}<span className="sec-riga">{x.codice}{x.email ? ' · ' + x.email : ''}</span></> },
    { key: 'agente', header: 'Agente', valore: (x) => x.agente ?? '', cell: (x) => x.agente ?? <span className="testo-tenue">—</span> },
    { key: 'stato', header: 'Stato', valore: (x) => (x.attivo ? 'Attivo' : 'Non attivo'), cell: (x) => x.attivo ? <Stato v="ok">Attivo</Stato> : <Stato v="neutro">Non attivo</Stato> },
  ];

  const azioni: Azione[] = !u || !puoModificare ? [] : [
    { etichetta: 'Modifica', onClick: () => modifica(u) },
    { etichetta: u.attivo ? 'Disattiva' : 'Riattiva', onClick: () => attiva(u, !u.attivo) },
    { etichetta: 'Elimina', variante: 'pericolo', onClick: () => elimina(u) },
  ];

  if (!subagenti) {
    return (
      <Pagina titolo="Subagenti" pieno>
        {errore && <Pannello><div className="vuoto"><b>Subagenti non caricati</b>{errore} <button type="button" className="btn sec piccolo" onClick={() => void carica()}>Riprova</button></div></Pannello>}
        {finestra}
      </Pagina>
    );
  }

  const pagina = (corpo?: ReactNode) => (
    <Pagina titolo="Subagenti" pieno azioni={puoModificare ? [{ etichetta: 'Nuovo subagente', icona: 'piu', onClick: () => modifica(null) }] : []}
      sottotitolo="Chi segue quali clienti. I subagenti si gestiscono per intero nel CRM.">
      {corpo}
      {finestra}
    </Pagina>
  );

  function datiSubagente() {
    if (!u) return null;
    return (
      <>
        <Dettagli inColonne voci={[
          { etichetta: 'Codice', valore: u.codice },
          { etichetta: 'Nome', valore: u.nome },
          { etichetta: 'Cognome', valore: u.cognome },
          { etichetta: 'Email', valore: u.email ?? '—' },
          { etichetta: 'Agente', valore: u.agente ?? '—' },
          { etichetta: 'Stato', valore: u.attivo ? <Stato v="ok">Attivo</Stato> : <Stato v="neutro">Non attivo</Stato> },
        ]} />
        {!puoModificare && <Nota>Non hai il permesso per modificare i subagenti.</Nota>}
      </>
    );
  }

  return pagina(
    <div className="colonne riempi" style={{ '--colonne': 'minmax(0,1.15fr) minmax(0,1fr)' } as CSSProperties}>
      <div className="pila riempi">
        <FilterBar valori={valori} onChange={(v) => { filtro = v; setValori(v); }} campi={[
          { nome: 'q', tipo: 'cerca', placeholder: 'Nome, cognome, codice o email' },
          { nome: 'vista', tipo: 'segmenti', opzioni: [
            { value: 'attivi', label: 'Attivi', n: cercati.filter(VISTE.attivi).length },
            { value: 'disattivati', label: 'Disattivati', n: cercati.filter(VISTE.disattivati).length },
            { value: 'tutti', label: 'Tutti', n: cercati.length },
          ] },
        ]} />
        <div className="riempi">
          <DataTable righe={righe} filtro={valori.q + '|' + valori.vista} colonne={colonne} chiave={(x) => x.id} ordinamentoIniziale={{ key: 'nome', dir: 'asc' }}
            rowClass={(x) => (x.id === u?.id ? 'selezionata' : '')} onRowClick={(x) => router.push('/subagenti/' + x.id)}
            emptyText="Nessun subagente" emptyHint="Cambia la ricerca o il filtro." />
        </div>
      </div>
      <Pannello titolo={u ? u.cognome + ' ' + u.nome : 'Subagente'} riempi azioni={azioni}>
        <Schede riempi attiva={schedaSubagente} onCambia={(id) => { schedaSubagente = id; }} schede={[
          { id: 'dati', etichetta: 'Dati', contenuto: datiSubagente },
        ]} />
      </Pannello>
    </div>,
  );
}